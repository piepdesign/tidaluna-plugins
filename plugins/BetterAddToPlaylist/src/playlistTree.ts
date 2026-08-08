import { getCredentials, TidalApi } from "@luna/lib";

// Builds the user's folder/playlist hierarchy as a nested tree. Selector-free,
// pure data. The dialog UI (dom.ts) renders this tree.
//
// Two sources, both proven in PlaylistLabels:
//  - v1 `playlistsAndFavoritePlaylists`  -> rich playlist metadata (title, cover,
//    track count, owner), keyed by uuid.
//  - v2 `my-collection/playlists/folders` -> the folder nesting and which
//    playlist/folder sits in which folder.

export type TreePlaylist = {
	uuid: string;
	title: string;
	cover: string;
	numberOfTracks: number;
	isOwn: boolean;
};

export type TreeFolder = {
	id: string;
	name: string;
	folders: TreeFolder[];
	playlists: TreePlaylist[];
};

export type PlaylistTree = {
	/** playlists sitting directly at the collection root (no folder) */
	rootPlaylists: TreePlaylist[];
	/** folders at the collection root */
	folders: TreeFolder[];
};

const V2 = "https://listen.tidal.com/v2/my-collection/playlists/folders";

type V1Playlist = {
	uuid: string;
	title: string;
	numberOfTracks: number;
	image?: string;
	squareImage?: string;
	creator?: { id?: number };
	lastUpdated?: string;
};

type V2Item = { name?: string; data?: { id?: string; uuid?: string; name?: string } };

/** Size 320 is a valid playlist rendition (80 returns 403 for playlists). */
const coverUrl = (image?: string, lastUpdated?: string, res = 320): string => {
	if (!image) return "";
	const base = image.startsWith("http") ? image : `https://resources.tidal.com/images/${image.split("-").join("/")}/${res}x${res}.jpg`;
	if (!lastUpdated) return base;
	const v = encodeURIComponent(lastUpdated);
	return base.includes("?") ? `${base}&v=${v}` : `${base}?v=${v}`;
};

/** All of the user's playlists (own + followed), rich metadata, keyed by uuid. */
async function getPlaylistMeta(userId: string): Promise<Map<string, TreePlaylist>> {
	const map = new Map<string, TreePlaylist>();
	for (let offset = 0; ; offset += 50) {
		const data = await TidalApi.fetch<{ items?: { playlist: V1Playlist }[] }>(
			`https://desktop.tidal.com/v1/users/${userId}/playlistsAndFavoritePlaylists?limit=50&offset=${offset}&${TidalApi.queryArgs()}`,
		);
		const items = data?.items ?? [];
		for (const it of items) {
			const pl = it.playlist;
			if (!pl?.uuid) continue;
			map.set(pl.uuid, {
				uuid: pl.uuid,
				title: pl.title,
				cover: coverUrl(pl.squareImage ?? pl.image, pl.lastUpdated),
				numberOfTracks: pl.numberOfTracks,
				isOwn: String(pl.creator?.id ?? "") === String(userId),
			});
		}
		if (items.length < 50) break;
	}
	return map;
}

/** One folder level from the v2 endpoint, paged. */
async function listLevel(folderId: string, includeOnly: "FOLDER" | "PLAYLIST"): Promise<V2Item[]> {
	const out: V2Item[] = [];
	for (let offset = 0; ; offset += 50) {
		const url = `${V2}?folderId=${encodeURIComponent(folderId)}&offset=${offset}&limit=50&order=NAME&includeOnly=${includeOnly}&${TidalApi.queryArgs()}`;
		const data = await TidalApi.fetch<{ items?: V2Item[] }>(url);
		const items = data?.items ?? [];
		out.push(...items);
		if (items.length < 50) break;
	}
	return out;
}

/** Recursively build one folder level into folders + playlists (with metadata). */
async function buildLevel(folderId: string, meta: Map<string, TreePlaylist>): Promise<{ folders: TreeFolder[]; playlists: TreePlaylist[] }> {
	const [rawFolders, rawPlaylists] = await Promise.all([listLevel(folderId, "FOLDER"), listLevel(folderId, "PLAYLIST")]);

	const playlists: TreePlaylist[] = [];
	for (const p of rawPlaylists) {
		const uuid = p.data?.uuid;
		if (!uuid) continue;
		// Prefer rich v1 metadata; fall back to whatever v2 gave us.
		playlists.push(meta.get(uuid) ?? { uuid, title: p.name ?? p.data?.name ?? "Playlist", cover: "", numberOfTracks: 0, isOwn: true });
	}

	const folders: TreeFolder[] = [];
	for (const f of rawFolders) {
		const id = f.data?.id;
		if (!id) continue;
		const child = await buildLevel(id, meta);
		folders.push({ id, name: f.name ?? f.data?.name ?? "Folder", folders: child.folders, playlists: child.playlists });
	}

	return { folders, playlists };
}

export async function buildPlaylistTree(): Promise<PlaylistTree> {
	const { userId } = await getCredentials();
	const meta = await getPlaylistMeta(userId);
	const root = await buildLevel("root", meta);
	return { rootPlaylists: root.playlists, folders: root.folders };
}
