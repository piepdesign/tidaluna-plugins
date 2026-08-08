import { TidalApi } from "@luna/lib";
import { trace } from "./index.safe";

// Maps playlist -> folder and folder -> name, from the v2 collection endpoint.
// Cached in localStorage; on startup the cache is applied instantly, then a
// background refresh updates it.

/** playlist uuid -> id of its immediate folder */
export const playlistFolder = new Map<string, string>();
/** folder id -> display name */
export const folderNames = new Map<string, string>();

const listeners = new Set<() => void>();
export const onFoldersChange = (cb: () => void): void => {
	listeners.add(cb);
};
const notify = (): void => listeners.forEach((cb) => cb());

const FKEY = "playlist-labels:folder-cache";
const V2 = "https://listen.tidal.com/v2/my-collection/playlists/folders";

type FolderData = { names: Record<string, string>; map: Record<string, string> };
type V2Item = { name?: string; data?: { id?: string; uuid?: string; name?: string } };

const loadFolderCache = (): FolderData | null => {
	try {
		return JSON.parse(localStorage.getItem(FKEY) || "null");
	} catch {
		return null;
	}
};

const apply = (data: FolderData): void => {
	playlistFolder.clear();
	folderNames.clear();
	for (const [id, name] of Object.entries(data.names)) folderNames.set(id, name);
	for (const [uuid, id] of Object.entries(data.map)) playlistFolder.set(uuid, id);
};

async function listAll(folderId: string, includeOnly: "FOLDER" | "PLAYLIST"): Promise<V2Item[]> {
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

async function walk(folderId: string, acc: FolderData): Promise<void> {
	const folders = await listAll(folderId, "FOLDER");
	for (const f of folders) {
		const id = f.data?.id;
		if (!id) continue;
		acc.names[id] = f.name ?? f.data?.name ?? "Folder";

		const playlists = await listAll(id, "PLAYLIST");
		for (const p of playlists) {
			const uuid = p.data?.uuid;
			if (uuid) acc.map[uuid] = id;
		}
		await walk(id, acc); // nested folders
	}
}

export async function buildFolderIndex(): Promise<void> {
	// 1. Instant: apply cache if present.
	const cached = loadFolderCache();
	if (cached) {
		apply(cached);
		notify();
	}

	// 2. Refresh from network and update.
	try {
		const fresh: FolderData = { names: {}, map: {} };
		await walk("root", fresh);
		apply(fresh);
		localStorage.setItem(FKEY, JSON.stringify(fresh));
		trace.log(`Folders: ${folderNames.size} folders, ${playlistFolder.size} playlists mapped.`);
		notify();
	} catch (err) {
		trace.warn(`Folder build failed (folder exclusion stays empty).`, err);
	}
}
