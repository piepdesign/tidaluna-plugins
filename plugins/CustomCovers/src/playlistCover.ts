// Playlist cover upload via TIDAL's official Open API v2 (openapi.tidal.com),
// JSON:API format. Captured from the native "Bild ändern" flow. Four native
// steps; we do the three that actually set the cover (the 4th native PATCH just
// re-saves name/description and is skipped):
//
//   1. POST /v2/artworks         register the image (md5 hex + size)
//                                -> artwork id + presigned S3 upload link
//   2. PUT  <presigned S3 URL>   upload the raw bytes (content-md5 = base64 md5)
//   3. PATCH /v2/playlists/<id>/relationships/coverArt   link the artwork
//
// The cover then persists server-side and shows on every device.

import { getCredentials, TidalApi } from "@luna/lib";
import { trace } from "./index.safe";
import { md5, toBase64, toHex } from "./md5";

/**
 * Fetches a playlist's CURRENT cover URL (custom cover, or TIDAL's auto-generated
 * mosaic if none) from fresh metadata. Used to settle the grid tile right after a
 * cover change/removal, so it updates without navigating away and back.
 * Cache-busted so the browser refetches the (possibly regenerated) image.
 */
export async function fetchPlaylistCoverUrl(id: string): Promise<string> {
	try {
		const { token, clientId } = await getCredentials();
		const res = await fetch(`https://desktop.tidal.com/v1/playlists/${id}?${TidalApi.queryArgs()}`, {
			headers: { Authorization: `Bearer ${token}`, "x-tidal-token": clientId },
		});
		if (!res.ok) return "";
		const p = await res.json();
		const image: string | undefined = p?.squareImage ?? p?.image;
		if (!image) return "";
		const base = image.startsWith("http") ? image : `https://resources.tidal.com/images/${image.split("-").join("/")}/320x320.jpg`;
		return `${base}${base.includes("?") ? "&" : "?"}t=${Date.now()}`;
	} catch {
		return "";
	}
}

const OPENAPI = "https://openapi.tidal.com/v2";

async function bearer(): Promise<string> {
	const { token } = await getCredentials();
	return `Bearer ${token}`;
}

/** JSON:API headers TIDAL sends on every openapi request. */
const jsonApiHeaders = (auth: string): Record<string, string> => ({
	accept: "application/vnd.api+json",
	"content-type": "application/vnd.api+json",
	authorization: auth,
	"idempotency-key": crypto.randomUUID(),
});

type ArtworkResp = {
	data?: {
		id?: string;
		attributes?: {
			sourceFile?: {
				uploadLink?: { href?: string; meta?: { method?: string; headers?: Record<string, string> } };
			};
		};
	};
};

/** Uploads a Blob as the playlist's cover. Returns true on success. */
export async function uploadPlaylistCover(playlistId: string, blob: Blob): Promise<boolean> {
	try {
		const auth = await bearer();
		const buf = new Uint8Array(await blob.arrayBuffer());
		const digest = md5(buf);

		// 1. Register the artwork -> presigned upload link + artwork id.
		const createRes = await fetch(`${OPENAPI}/artworks`, {
			method: "POST",
			headers: jsonApiHeaders(auth),
			body: JSON.stringify({
				data: { type: "artworks", attributes: { mediaType: "IMAGE", sourceFile: { md5Hash: toHex(digest), size: buf.length } } },
			}),
		});
		if (!createRes.ok) {
			trace.warn(`artworks create failed: ${createRes.status} ${createRes.statusText}`);
			return false;
		}
		const created: ArtworkResp = await createRes.json();
		const artworkId = created.data?.id;
		const link = created.data?.attributes?.sourceFile?.uploadLink;
		if (!artworkId || !link?.href) {
			trace.warn(`artworks response missing id/uploadLink.`, created);
			return false;
		}

		// 2. Upload the bytes to S3. content-length and host are set by the browser
		//    (both are signed and match); we set the signed content-md5 (base64) and
		//    a content-type (unsigned, so any value is fine).
		const putRes = await fetch(link.href, {
			method: link.meta?.method || "PUT",
			headers: { "content-md5": toBase64(digest), "content-type": blob.type || "image/png" },
			body: blob,
		});
		if (!putRes.ok) {
			trace.warn(`S3 upload failed: ${putRes.status} ${putRes.statusText}`);
			return false;
		}

		// 3. Link the artwork as the playlist's cover.
		const patchRes = await fetch(`${OPENAPI}/playlists/${playlistId}/relationships/coverArt`, {
			method: "PATCH",
			headers: jsonApiHeaders(auth),
			body: JSON.stringify({ data: [{ id: artworkId, type: "artworks" }] }),
		});
		if (!patchRes.ok) {
			trace.warn(`coverArt relationship PATCH failed: ${patchRes.status} ${patchRes.statusText}`);
			return false;
		}

		trace.log(`Playlist ${playlistId} cover set (artwork ${artworkId}).`);
		return true;
	} catch (err) {
		trace.warn(`uploadPlaylistCover errored.`, err);
		return false;
	}
}
