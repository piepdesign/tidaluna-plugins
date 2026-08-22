// Integration into TIDAL's own UI (selectors verified from the live DOM, 2026-08-09):
//
//  - Playlist edit modal (<form data-test="playlist-form">): we add an "Emoji"
//    button next to the native "Bild ändern" file button. Images keep the native
//    flow (including TIDAL's own crop); only the emoji path uses our generator +
//    upload. All native fields (title, description, publish, remove, save) stay
//    untouched. We also hook the native remove button to drop our optimistic
//    overlay.
//  - Folder "⋯" menu (<ul class*="actionList"> with button[data-test="rename-folder"]):
//    we inject a "Set cover" (and "Remove cover") menu item that opens our modal.
//
// Menus/modals are portals without an id in the DOM, so we remember which tile
// was last interacted with (pointerdown) to know the target folder/playlist.

import { observe } from "@luna/lib";

import { openCoverModal } from "./coverModal";
import {
	clearFolderCover,
	clearPlaylistCoverOptimistic,
	folderIdFromHref,
	getFolderCover,
	playlistIdFromHref,
	setFolderCover,
	setPlaylistCoverOptimistic,
} from "./folderCover";
import { trace, unloads } from "./index.safe";
import { fetchPlaylistCoverUrl, uploadPlaylistCover } from "./playlistCover";

/**
 * Settle the grid tile to the playlist's real cover after a change/removal: the
 * server needs a moment to process a new upload or regenerate the auto-mosaic, so
 * we poll a few times and paint the result as the tile overlay. No navigation
 * needed. Works for adds (custom cover) and removals (regenerated mosaic).
 */
const settleTile = (id: string): void => {
	if (!id) return;
	for (const delay of [500, 1500, 3500]) {
		window.setTimeout(async () => {
			const url = await fetchPlaylistCoverUrl(id);
			if (!url) return;
			setPlaylistCoverOptimistic(id, url);
			// Tell other plugins (e.g. PlaylistLabels) the cover changed, so they can
			// refresh without a reload. Sent at each poll to converge on the processed
			// cover / regenerated mosaic.
			window.dispatchEvent(new CustomEvent("customcovers:cover-changed", { detail: { playlistId: id, coverUrl: url } }));
		}, delay);
	}
};

// --- last-interacted tile tracking ---
let lastFolder = { id: "", name: "Folder" };
let lastPlaylist = { id: "", name: "Playlist" };

const currentPlaylistId = (): string => {
	const m = /\/playlist\/([0-9a-fA-F-]{36})/.exec(location.href);
	return m ? m[1] : "";
};

const onPointerDown = (e: Event): void => {
	const t = e.target as Element;
	const fa = t.closest?.('article[data-test="grid-item-folder"]');
	if (fa) {
		const a = fa.querySelector('a[data-test="folder-cover"]');
		const id = folderIdFromHref(a?.getAttribute("href") || "");
		if (id) lastFolder = { id, name: a?.getAttribute("aria-label") || "Folder" };
	}
	const pa = t.closest?.('article[data-test="grid-item-playlist"]');
	if (pa) {
		const a = pa.querySelector('a[data-test="cell-cover"]');
		const id = playlistIdFromHref(a?.getAttribute("href") || "");
		if (id) lastPlaylist = { id, name: a?.getAttribute("aria-label") || "Playlist" };
	}
};

/** Paints our cover over the modal's own thumbnail so it updates instantly. */
const paintModalPreview = (box: HTMLElement, dataUrl: string): void => {
	let overlay = box.querySelector<HTMLElement>(".cc-modal-preview");
	if (!overlay) {
		overlay = document.createElement("div");
		overlay.className = "cc-cover cc-modal-preview";
		if (getComputedStyle(box).position === "static") box.style.position = "relative";
		box.appendChild(overlay);
	}
	overlay.style.backgroundImage = `url("${dataUrl}")`;
};

// --- playlist modal: repurpose the native "Bild ändern" into "Custom cover" ---
// We keep the native element (so font/size/look and clickability are untouched),
// relabel it, and intercept its click in the capture phase: preventDefault stops
// the native file dialog, and we open our own modal (Change image with cropper +
// Emoji). Title/description/publish/save/"Bild entfernen" stay native.
const injectEmojiButton = (form: Element): void => {
	const box = form.querySelector<HTMLElement>('[class*="imageBox"]');
	if (!box || box.dataset.ccHijacked) return;

	const nativeBtn = Array.from(box.querySelectorAll("button")).find((b) => /bild ändern|change image/i.test(b.textContent || ""));
	if (!nativeBtn) return;
	const label = nativeBtn.closest("label") ?? nativeBtn; // the file-picker surface
	box.dataset.ccHijacked = "1";
	nativeBtn.textContent = "Custom cover";

	label.addEventListener(
		"click",
		async (e) => {
			e.preventDefault(); // no native file dialog
			e.stopPropagation();
			const pid = currentPlaylistId() || lastPlaylist.id;
			if (!pid) {
				trace.msg.log("CustomCovers: couldn't determine which playlist to set.");
				return;
			}
			const res = await openCoverModal({ title: "Playlist cover" });
			if (!res) return;
			const ok = await uploadPlaylistCover(pid, await res.toBlob());
			if (ok) {
				setPlaylistCoverOptimistic(pid, res.dataUrl); // instant, from our own image
				paintModalPreview(box, res.dataUrl); // show it in the modal's own thumbnail immediately
				settleTile(pid); // then reconcile with the processed server cover
			} else {
				trace.msg.log("CustomCovers: cover upload failed. See console.");
			}
		},
		true,
	);

	// React to the native buttons: on remove, drop our overlay and settle the tile
	// to the regenerated mosaic; on save, settle to the new cover. Both avoid the
	// "navigate away and back" the tile otherwise needs.
	form.addEventListener(
		"click",
		(e) => {
			const el = (e.target as Element).closest?.("button,[role=button]");
			if (!el) return;
			const id = currentPlaylistId() || lastPlaylist.id;
			const text = el.textContent || "";
			if (/entfernen|remove/i.test(text)) {
				clearPlaylistCoverOptimistic(id);
				settleTile(id);
			} else if (/speichern|save/i.test(text)) {
				settleTile(id);
			}
		},
		true,
	);
};

const CONTEXT_MENU = 'div[class*="_contextMenu_"]';

/**
 * Close TIDAL's open context menu. It closes on Escape, but the handler lives in
 * the menu's React subtree — a `document`-level Escape is ignored because
 * `document` is outside React's delegated event root. So we dispatch Escape onto
 * the menu element itself (or the focused element inside it), plus a synthetic
 * outside pointerdown/mousedown as a fallback for menus that dismiss on
 * outside-press instead.
 */
const closeContextMenu = (): void => {
	const menu = document.querySelector(CONTEXT_MENU);
	const escTarget: EventTarget = menu?.contains(document.activeElement) ? (document.activeElement as Element) : (menu ?? document.body);
	for (const type of ["keydown", "keyup"]) {
		escTarget.dispatchEvent(new KeyboardEvent(type, { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true }));
	}
	// Fallback: some menus dismiss on an outside press rather than Escape.
	for (const type of ["pointerdown", "mousedown"]) {
		document.body.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
	}
};

/**
 * Resolve once TIDAL's context menu has left the DOM (so its outside-click
 * dismiss listener is gone), or after a short fallback timeout so we never hang
 * if the menu selector ever changes. Polled via rAF.
 */
const waitForContextMenuGone = (): Promise<void> =>
	new Promise((resolve) => {
		const start = performance.now();
		const tick = (): void => {
			const stillOpen = document.querySelector(CONTEXT_MENU);
			if (!stillOpen || !stillOpen.isConnected || performance.now() - start > 600) {
				resolve();
				return;
			}
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});

// --- folder "⋯" menu: inject Set/Remove cover items ---
const injectFolderMenuItem = (renameBtn: Element): void => {
	const li = renameBtn.closest("li");
	const ul = li?.parentElement;
	if (!li || !ul || ul.querySelector(".cc-folder-menu-item")) return;

	const { id, name } = lastFolder;
	if (!id) return;

	const makeItem = (label: string, danger: boolean, onClick: () => void): HTMLElement => {
		const item = li.cloneNode(true) as HTMLElement;
		item.classList.add("cc-folder-menu-item");
		item.querySelector("svg")?.remove(); // drop the cloned rename icon
		const inner = item.querySelector<HTMLElement>('[class*="actionTextInner"]') ?? item;
		inner.textContent = label;
		const innerBtn = item.querySelector("button");
		innerBtn?.removeAttribute("data-test"); // avoid re-matching our observer
		if (danger) item.style.color = "#ff6b6b";
		// TIDAL does NOT close its context menu when our injected (non-React) item
		// is clicked, and while the menu stays open its own outside-click dismiss
		// eats the first click inside our modal (confirmed live: menu still open
		// behind the modal, first click dead — it just dismisses the menu — second
		// click works). So we close the menu ourselves, then wait for it to leave
		// the DOM before opening. Key detail: a document-level Escape is ignored,
		// because `document` sits OUTSIDE React's delegated event root — the Escape
		// has to be dispatched INTO the menu's own subtree to reach TIDAL's handler.
		item.addEventListener("click", () => {
			closeContextMenu();
			void waitForContextMenuGone().then(onClick);
		});
		return item;
	};

	const setItem = makeItem("Custom cover", false, async () => {
		const res = await openCoverModal({ title: `Folder cover · ${name}` });
		if (res) setFolderCover(id, res.dataUrl);
	});
	ul.insertBefore(setItem, ul.firstChild);

	if (getFolderCover(id)) {
		const removeItem = makeItem("Remove cover", true, () => clearFolderCover(id));
		ul.insertBefore(removeItem, setItem.nextSibling);
	}
};

export function initNativeInject(): void {
	document.addEventListener("pointerdown", onPointerDown, true);
	unloads.add(() => document.removeEventListener("pointerdown", onPointerDown, true));

	observe(unloads, 'form[data-test="playlist-form"]', (form) => injectEmojiButton(form));
	observe(unloads, '[data-test="rename-folder"]', (btn) => injectFolderMenuItem(btn));
}
