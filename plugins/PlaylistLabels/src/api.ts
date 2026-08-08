import { getCredentials, TidalApi } from "@luna/lib";
import { trace } from "./index.safe";

async function authHeaders(): Promise<Record<string, string>> {
	const { token, clientId } = await getCredentials();
	return { Authorization: `Bearer ${token}`, "x-tidal-token": clientId };
}

/**
 * Removes a track from a playlist.
 * The item index is resolved from a fresh items fetch (cached/memoized data can
 * be stale after live edits), then TIDAL's ETag is used to DELETE that index.
 */
export async function removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<boolean> {
	try {
		const headers = await authHeaders();
		const q = TidalApi.queryArgs();

		// Fresh items to find the current index.
		const itemsRes = await fetch(`https://desktop.tidal.com/v1/playlists/${playlistId}/items?limit=-1&${q}`, { headers });
		if (!itemsRes.ok) {
			trace.warn(`Remove: items fetch failed ${itemsRes.status}`);
			return false;
		}
		const itemsData = await itemsRes.json();
		const items: { item?: { id?: string | number } }[] = itemsData?.items ?? [];
		const index = items.findIndex((it) => String(it?.item?.id) === String(trackId));
		if (index < 0) {
			trace.warn(`Remove: track ${trackId} not found in playlist ${playlistId}.`);
			return false;
		}

		// ETag from GET playlist.
		const getRes = await fetch(`https://desktop.tidal.com/v1/playlists/${playlistId}?${q}`, { headers });
		const etag = getRes.headers.get("etag");

		const delRes = await fetch(`https://desktop.tidal.com/v1/playlists/${playlistId}/items/${index}?${q}`, {
			method: "DELETE",
			headers: etag ? { ...headers, "If-None-Match": etag } : headers,
		});
		trace.log(`Remove ${trackId} (index ${index}) from ${playlistId}: etag=${etag ? "yes" : "no"}, status=${delRes.status}`);
		if (!delRes.ok) trace.warn(`Remove from playlist failed: ${delRes.status} ${delRes.statusText}`);
		return delRes.ok;
	} catch (err) {
		trace.warn(`Remove from playlist errored.`, err);
		return false;
	}
}
