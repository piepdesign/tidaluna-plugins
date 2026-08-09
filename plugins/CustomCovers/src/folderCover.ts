// Cover overlays painted onto grid tiles.
//
//  - Folders have no native cover (they render a folder icon and have no
//    server-side image field), so folder covers are OURS: stored locally as data
//    URLs and painted over the folder icon. Local-only, cosmetic, per-device.
//  - Playlists DO have a server-side cover, uploaded via the API. But the server
//    needs time to process the new image, so the tile only refreshes on the next
//    navigation. To make it feel instant we paint the same overlay optimistically
//    for the current session; the real cover sits underneath once processed.

import { trace } from "./index.safe";

const KEY = "custom-covers:folders";

type Store = Record<string, string>; // folderId -> data URL

const load = (): Store => {
	try {
		return JSON.parse(localStorage.getItem(KEY) || "{}");
	} catch {
		return {};
	}
};
const save = (store: Store): void => localStorage.setItem(KEY, JSON.stringify(store));

// Session-only optimistic playlist covers (not persisted; server owns these).
const playlistOptimistic = new Map<string, string>();

export const getFolderCover = (id: string): string | undefined => load()[id];

export function setFolderCover(id: string, dataUrl: string): void {
	const store = load();
	store[id] = dataUrl;
	save(store);
	applyOverlays();
	trace.log(`Folder cover set for ${id}.`);
}

export function clearFolderCover(id: string): void {
	const store = load();
	delete store[id];
	save(store);
	removeOverlay(id);
}

/** Show a just-uploaded playlist cover immediately (until the server catches up). */
export function setPlaylistCoverOptimistic(id: string, dataUrl: string): void {
	playlistOptimistic.set(id, dataUrl);
	applyOverlays();
}

/** Drop the optimistic overlay for a playlist (e.g. after its cover was removed). */
export function clearPlaylistCoverOptimistic(id: string): void {
	playlistOptimistic.delete(id);
	removeOverlay(id);
}

/** Removes every painted overlay for an id, wherever it currently sits. */
function removeOverlay(id: string): void {
	document.querySelectorAll<HTMLElement>(`.cc-cover[data-cc-id="${CSS.escape(id)}"]`).forEach((el) => el.remove());
}

// --- DOM overlay ---
//
// Verified against the live grid DOM (2026-08-08):
//   folder:   <a data-test="folder-cover" href="/folder/<uuid>">
//   playlist: <a data-test="cell-cover"   href="/playlist/<uuid>">
// both inside <div class="_cellCoverContainer_…"> which holds the artwork.

export const FOLDER_LINK = 'a[data-test="folder-cover"]';
const PLAYLIST_LINK = 'a[data-test="cell-cover"]';

const idFrom = (href: string, kind: string): string | null => {
	const m = new RegExp(`/${kind}/([^/?#]+)`).exec(href);
	return m ? decodeURIComponent(m[1]) : null;
};
export const folderIdFromHref = (href: string): string | null => idFrom(href, "folder");
export const playlistIdFromHref = (href: string): string | null => idFrom(href, "playlist");

/** Paints (or updates/removes) one overlay inside a tile's cover container. */
function paint(link: HTMLAnchorElement, id: string, dataUrl?: string): void {
	const host = link.querySelector<HTMLElement>('[class*="cellCoverContainer"]') ?? link;
	const existing = host.querySelector<HTMLElement>(`.cc-cover[data-cc-id="${CSS.escape(id)}"]`);

	if (!dataUrl) {
		existing?.remove();
		return;
	}
	if (existing) {
		if (existing.dataset.ccUrl !== dataUrl) {
			existing.style.backgroundImage = `url("${dataUrl}")`;
			existing.dataset.ccUrl = dataUrl;
		}
		return;
	}
	const overlay = document.createElement("div");
	overlay.className = "cc-cover";
	overlay.dataset.ccId = id;
	overlay.dataset.ccUrl = dataUrl;
	overlay.style.backgroundImage = `url("${dataUrl}")`;
	if (getComputedStyle(host).position === "static") host.style.position = "relative";
	host.appendChild(overlay);
}

/** Paints stored/optimistic covers onto all currently rendered tiles. Idempotent. */
export function applyOverlays(): void {
	const folders = load();
	for (const link of document.querySelectorAll<HTMLAnchorElement>(FOLDER_LINK)) {
		const id = idFrom(link.getAttribute("href") || "", "folder");
		if (id) paint(link, id, folders[id]);
	}
	if (playlistOptimistic.size) {
		for (const link of document.querySelectorAll<HTMLAnchorElement>(PLAYLIST_LINK)) {
			const id = idFrom(link.getAttribute("href") || "", "playlist");
			if (id) paint(link, id, playlistOptimistic.get(id));
		}
	}
}
