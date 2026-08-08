// Persistent cache of the built index so startup does not refetch everything.
// Playlists are keyed by uuid and invalidated when their track count changes.

const KEY = "playlist-labels:cache";
const VERSION = 4;

export type PlaylistCacheEntry = {
	title: string;
	cover: string;
	isOwn: boolean;
	numberOfTracks: number;
	trackIds: string[];
};

export type Cache = {
	version: number;
	playlists: Record<string, PlaylistCacheEntry>;
};

const empty = (): Cache => ({ version: VERSION, playlists: {} });

export const loadCache = (): Cache => {
	try {
		const c = JSON.parse(localStorage.getItem(KEY) || "null");
		if (c && c.version === VERSION) return c as Cache;
	} catch {
		/* ignore */
	}
	return empty();
};

export const saveCache = (c: Cache): void => {
	try {
		localStorage.setItem(KEY, JSON.stringify(c));
	} catch {
		/* storage full or unavailable – cache is best effort */
	}
};
