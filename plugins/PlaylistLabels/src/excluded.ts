// Manages hidden playlists and folders (never shown as labels). Persisted in
// localStorage as { id: name }. Reversible via includePlaylist / includeFolder.

const KEY = "playlist-labels:excluded";
const FKEY = "playlist-labels:excluded-folders";

export type Excluded = Record<string, string>; // id -> name/title

const loadKey = (key: string): Excluded => {
	try {
		return JSON.parse(localStorage.getItem(key) || "{}");
	} catch {
		return {};
	}
};

let state: Excluded = loadKey(KEY);
let folderState: Excluded = loadKey(FKEY);
const listeners = new Set<() => void>();

const save = (): void => {
	localStorage.setItem(KEY, JSON.stringify(state));
	localStorage.setItem(FKEY, JSON.stringify(folderState));
	listeners.forEach((cb) => cb());
};

export const onExcludedChange = (cb: () => void): void => {
	listeners.add(cb);
};

// --- Playlists ---

export const isExcluded = (id: string): boolean => id in state;

export const excludePlaylist = (id: string, title: string): void => {
	state = { ...state, [id]: title };
	save();
};

export const includePlaylist = (id: string): void => {
	const next = { ...state };
	delete next[id];
	state = next;
	save();
};

export const getExcluded = (): Excluded => ({ ...state });

// --- Folders (hides every playlist inside the folder) ---

export const isFolderExcluded = (folderId?: string): boolean => !!folderId && folderId in folderState;

export const excludeFolder = (folderId: string, name: string): void => {
	folderState = { ...folderState, [folderId]: name };
	save();
};

export const includeFolder = (folderId: string): void => {
	const next = { ...folderState };
	delete next[folderId];
	folderState = next;
	save();
};

export const getExcludedFolders = (): Excluded => ({ ...folderState });
