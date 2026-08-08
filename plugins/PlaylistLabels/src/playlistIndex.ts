import { getCredentials, TidalApi } from "@luna/lib";

import { type Cache, loadCache, saveCache } from "./cache";
import { trace } from "./index.safe";

/** One playlist label on a track row. */
export type PlaylistLabel = {
	/** playlist uuid */
	id: string;
	title: string;
	cover: string;
	isOwn: boolean;
	/** position of the track inside that playlist (for scrolling) */
	index: number;
};

/** trackId -> playlists that contain it. Read by index.ts / injectLabels. */
export const trackIdToPlaylists = new Map<string, PlaylistLabel[]>();

type TApiPlaylist = {
	uuid: string;
	title: string;
	numberOfTracks: number;
	image?: string;
	squareImage?: string;
	creator?: { id?: number };
	/** ISO timestamp, bumps on metadata edits (incl. cover). Used to cache-bust the image URL. */
	lastUpdated?: string;
};

/**
 * Cover URL from a TIDAL image field. Handles both a ready URL and an image
 * uuid. Size 320 is a valid playlist rendition (80 returns 403 for playlists).
 *
 * TIDAL often keeps the same image uuid when a playlist cover is replaced (the
 * underlying image is swapped, not the id). Without a cache-buster, TIDAL's own
 * Chromium image cache then keeps showing the old picture indefinitely for that
 * URL, even after our index rebuilds with fresh data. Appending `lastUpdated` as
 * a query param forces a refetch exactly when the playlist's metadata actually
 * changed, while leaving the URL (and thus the cache) untouched otherwise.
 */
const coverUrl = (image?: string, lastUpdated?: string, res = 320): string => {
	if (!image) return "";
	const base = image.startsWith("http") ? image : `https://resources.tidal.com/images/${image.split("-").join("/")}/${res}x${res}.jpg`;
	if (!lastUpdated) return base;
	const v = encodeURIComponent(lastUpdated);
	return base.includes("?") ? `${base}&v=${v}` : `${base}?v=${v}`;
};

const addLabel = (trackId: string, label: PlaylistLabel): void => {
	const list = trackIdToPlaylists.get(trackId) ?? [];
	if (!list.some((l) => l.id === label.id)) {
		list.push(label);
		trackIdToPlaylists.set(trackId, list);
	}
};

/** All of the user's playlists (own + followed), paged 50 at a time. */
async function getUserPlaylists(userId: string): Promise<TApiPlaylist[]> {
	const out: TApiPlaylist[] = [];
	for (let offset = 0; ; offset += 50) {
		const data = await TidalApi.fetch<{ items?: { playlist: TApiPlaylist }[] }>(
			`https://desktop.tidal.com/v1/users/${userId}/playlistsAndFavoritePlaylists?limit=50&offset=${offset}&${TidalApi.queryArgs()}`,
		);
		const items = data?.items ?? [];
		for (const it of items) if (it.playlist) out.push(it.playlist);
		if (items.length < 50) break;
	}
	return out;
}

async function fetchPlaylistTrackIds(uuid: string): Promise<string[]> {
	const res = await TidalApi.playlistItems(uuid);
	const ids: string[] = [];
	for (const t of res?.items ?? []) {
		const id = String((t as unknown as { item?: { id?: string | number } }).item?.id ?? "");
		if (id) ids.push(id);
	}
	return ids;
}

/**
 * Rebuilds trackIdToPlaylists. Uses the cache: only playlists whose track count
 * changed (or new ones) are refetched.
 */
export async function buildIndex(): Promise<void> {
	trackIdToPlaylists.clear();
	const { userId } = await getCredentials();
	const cache = loadCache();
	const playlists = await getUserPlaylists(userId);

	const nextPlaylists: Cache["playlists"] = {};
	let reused = 0;
	let refetched = 0;

	for (const pl of playlists) {
		const cover = coverUrl(pl.squareImage ?? pl.image, pl.lastUpdated);
		const isOwn = String(pl.creator?.id ?? "") === String(userId);
		const cached = cache.playlists[pl.uuid];

		let trackIds: string[];
		if (cached && cached.numberOfTracks === pl.numberOfTracks) {
			trackIds = cached.trackIds;
			reused++;
		} else {
			trackIds = await fetchPlaylistTrackIds(pl.uuid);
			refetched++;
		}

		nextPlaylists[pl.uuid] = { title: pl.title, cover, isOwn, numberOfTracks: pl.numberOfTracks, trackIds };
		trackIds.forEach((id, i) => addLabel(id, { id: pl.uuid, title: pl.title, cover, isOwn, index: i }));
	}
	cache.playlists = nextPlaylists; // drops playlists that no longer exist

	saveCache(cache);
	trace.log(`Index built: ${trackIdToPlaylists.size} tracks, ${playlists.length} playlists (${reused} cached, ${refetched} fetched).`);
}

/** Invalidate one playlist in the cache so the next build refetches it. */
export function invalidatePlaylist(uuid: string): void {
	const cache = loadCache();
	delete cache.playlists[uuid];
	saveCache(cache);
}

/** Live update: tracks were added to a playlist (from a Redux action). */
export function addPlaylistMembership(playlistId: string, trackIds: string[]): void {
	const cache = loadCache();
	const entry = cache.playlists[playlistId];

	let title = entry?.title ?? "";
	let cover = entry?.cover ?? "";
	let isOwn = entry?.isOwn ?? true;
	if (!entry) {
		for (const list of trackIdToPlaylists.values()) {
			const found = list.find((l) => l.id === playlistId);
			if (found) {
				({ title, cover, isOwn } = found);
				break;
			}
		}
	}

	for (const raw of trackIds) {
		const id = String(raw);
		const index = entry ? entry.trackIds.length : 0;
		addLabel(id, { id: playlistId, title, cover, isOwn, index });
		if (entry && !entry.trackIds.includes(id)) entry.trackIds.push(id);
	}
	if (entry) {
		entry.numberOfTracks = entry.trackIds.length;
		saveCache(cache);
	}
}
