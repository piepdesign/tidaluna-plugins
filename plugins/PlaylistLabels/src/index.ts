import { observe, redux, StyleTag } from "@luna/lib";

import styles from "file://styles.css?minify";
import { onExcludedChange } from "./excluded";
import { buildFolderIndex, onFoldersChange } from "./folders";
import { onRebuild, onRedraw, pendingSelect, trace, unloads } from "./index.safe";
import { injectLabels } from "./injectLabels";
import { addPlaylistMembership, buildIndex, trackIdToPlaylists } from "./playlistIndex";
import { onSettingsChange, settings, Settings } from "./Settings";

export { Settings, unloads };

new StyleTag("PlaylistLabels", unloads, styles);

let indexReady = false;
let building = false;

/** Current playlist uuid from the URL, or "". */
const currentPlaylistId = (): string => {
	const m = window.location.href.match(/playlist\/([0-9a-fA-F-]{36})/);
	return m ? m[1] : "";
};

/**
 * Adds an empty header column (cloned from the time/LG column header, KEEPING its
 * classes) so the header row gains the same extra column as the data rows and
 * everything stays aligned.
 */
const ensureHeaders = (): void => {
	for (const list of document.querySelectorAll('div[aria-label="Tracklist"]')) {
		if (list.querySelector('[data-test="pl-labels-header"]')) continue;
		const timeCol = list.querySelector('span[class^="_timeColumn"][role="columnheader"]');
		if (!(timeCol instanceof HTMLElement) || !timeCol.parentElement) continue;
		const header = timeCol.cloneNode(false) as HTMLElement;
		header.setAttribute("data-test", "pl-labels-header");
		header.classList.add("pl-labels-header");
		header.textContent = "";
		timeCol.parentElement.insertBefore(header, timeCol);
	}
};

const updateRow = (row: Element): void => {
	const trackId = row.getAttribute("data-track-id");
	if (!trackId) return;
	injectLabels(row, trackIdToPlaylists.get(trackId) ?? [], { showAll: settings.showAll, currentId: currentPlaylistId() });
};

const redrawAll = (): void => {
	ensureHeaders();
	document.querySelectorAll('div[data-test="tracklist-row"]').forEach(updateRow);
};

// --- Highlight / scroll-to-track after a label click ---

const highlightRow = (row: Element): void => {
	row.scrollIntoView({ block: "center", behavior: "smooth" });
	row.classList.add("pl-highlight");
	window.setTimeout(() => row.classList.remove("pl-highlight"), 4000);
};

const findScrollParent = (el: Element | null): HTMLElement | null => {
	let node = el?.parentElement ?? null;
	while (node) {
		const s = getComputedStyle(node);
		if (/(auto|scroll)/.test(s.overflowY) && node.scrollHeight > node.clientHeight + 4) return node;
		node = node.parentElement;
	}
	return (document.scrollingElement as HTMLElement) ?? null;
};

/** Scrolls a (possibly virtualized, not-yet-rendered) track into view, then highlights it. */
const scrollToTrack = (contextId: string, trackId: string, index: number): void => {
	const selector = `div[data-test="tracklist-row"][data-track-id="${trackId}"]`;
	let tries = 0;
	const maxTries = 80;

	const tick = (): void => {
		const found = document.querySelector(selector);
		if (found) {
			highlightRow(found);
			return;
		}
		if (currentPlaylistId() !== contextId && tries > 3) return;

		const sample = document.querySelector('div[data-test="tracklist-row"]');
		const scroller = findScrollParent(sample);
		if (sample && scroller) {
			const rowH = sample.getBoundingClientRect().height || 56;
			if (tries === 0) {
				scroller.scrollTop = Math.max(0, index * rowH - scroller.clientHeight / 2);
			} else {
				const target = Math.max(0, index * rowH - scroller.clientHeight / 2);
				const delta = target - scroller.scrollTop;
				scroller.scrollTop += Math.abs(delta) > rowH ? delta : rowH * 4;
			}
		}
		if (tries++ < maxTries) window.setTimeout(tick, 90);
	};
	tick();
};

// --- Index build / rebuild ---

const ensureIndex = async (): Promise<void> => {
	if (indexReady || building) return;
	building = true;
	try {
		await Promise.all([buildIndex(), buildFolderIndex()]);
		indexReady = true;
		redrawAll();
	} catch (err) {
		trace.warn(`Index build failed, retrying on next open.`, err);
	} finally {
		building = false;
	}
};

const rebuild = async (): Promise<void> => {
	if (building) return;
	building = true;
	try {
		await buildIndex();
		redrawAll();
	} catch (err) {
		trace.warn(`Rebuild failed.`, err);
	} finally {
		building = false;
	}
};
onRebuild(() => void rebuild());
onRedraw(redrawAll);

// --- Wiring ---

observe(unloads, 'div[data-test="tracklist-row"]', (row) => {
	void ensureIndex();
	ensureHeaders();
	updateRow(row);
});

const attrObserver = new MutationObserver((muts) => {
	for (const m of muts) {
		if (m.attributeName === "data-track-id") updateRow(m.target as Element);
	}
});
attrObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["data-track-id"] });
unloads.add(() => attrObserver.disconnect());

redux.intercept("router/NAVIGATED", unloads, () => {
	redrawAll();
	const p = pendingSelect.value;
	if (p) {
		pendingSelect.value = null;
		window.setTimeout(() => scrollToTrack(p.contextId, p.trackId, p.index), 150);
	}
});

// Live update: a track was added to a playlist.
const onAddedToPlaylist = (p: { playlistUUID?: string; mediaItemIdsToAdd?: (string | number)[] }): void => {
	if (p?.playlistUUID && p.mediaItemIdsToAdd?.length) {
		addPlaylistMembership(String(p.playlistUUID), p.mediaItemIdsToAdd.map(String));
		redrawAll();
	}
};
redux.intercept("content/ADD_MEDIA_ITEMS_TO_PLAYLIST", unloads, onAddedToPlaylist);
redux.intercept("content/ADD_MEDIA_ITEMS_TO_PLAYLIST_SUCCESS", unloads, onAddedToPlaylist);

onSettingsChange(redrawAll);
onExcludedChange(redrawAll);
onFoldersChange(redrawAll);
