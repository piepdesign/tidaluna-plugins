import { redux } from "@luna/lib";

import { removeTrackFromPlaylist } from "./api";
import { openContextMenu } from "./contextMenu";
import { excludePlaylist, isExcluded, isFolderExcluded } from "./excluded";
import { playlistFolder } from "./folders";
import { pendingSelect, requestRedraw } from "./index.safe";
import { type PlaylistLabel, trackIdToPlaylists } from "./playlistIndex";

const MAX_LABELS = 5;

export type InjectOpts = {
	/** show followed playlists too, not only own ones */
	showAll: boolean;
	/** uuid of the currently open playlist – its label is hidden */
	currentId: string;
};

/** Builds one label element (playlist cover) with its handlers. */
const makeLabel = (label: PlaylistLabel, trackId: string): HTMLElement => {
	const img = document.createElement("img");
	img.className = "pl-label";
	img.src = label.cover;
	img.loading = "lazy";
	img.onerror = () => img.remove();
	img.title = `${label.title}\nRight-click for options`;

	img.onclick = (e) => {
		e.stopPropagation();
		pendingSelect.value = { contextId: label.id, trackId, index: label.index };
		window.setTimeout(() => {
			if (pendingSelect.value?.trackId === trackId) pendingSelect.value = null;
		}, 8000);
		redux.actions["router/PUSH"]?.({ pathname: `/playlist/${label.id}` } as never);
	};

	img.oncontextmenu = (e) => {
		e.preventDefault();
		e.stopPropagation();
		openContextMenu(e.clientX, e.clientY, [
			{
				label: `Remove from “${label.title}”`,
				danger: true,
				onClick: async () => {
					const ok = await removeTrackFromPlaylist(label.id, trackId);
					if (!ok) return;
					// Optimistic: drop this label locally (a rebuild would read
					// TidalApi's memoized, stale response and re-add it).
					const list = trackIdToPlaylists.get(trackId);
					if (list) trackIdToPlaylists.set(trackId, list.filter((l) => l.id !== label.id));
					requestRedraw();
				},
			},
			{ label: `Hide “${label.title}” from labels`, onClick: () => excludePlaylist(label.id, label.title) },
		]);
	};

	return img;
};

/**
 * Renders the labels into a dedicated, fixed-width column of the track row
 * (cloned from the duration cell). The fixed width reserves space so the artist
 * text ends with "…" instead of disappearing behind the covers.
 *
 * A fixed-width grid column is inserted before the duration. Crucially, the
 * inner covers container also has a fixed width, so the grid track is the same
 * width in every row regardless of cover count. That means:
 * - no jumping: every row's column is identical, columns stay aligned;
 * - no overlap: the column reserves space, so the artist text ends with "…"
 *   before it instead of disappearing behind the covers.
 *
 * Idempotent via a signature: if nothing changed, do nothing.
 */
export function injectLabels(row: Element, labels: PlaylistLabel[], opts: InjectOpts): void {
	const trackId = row.getAttribute("data-track-id") ?? "";

	const filtered = labels.filter((l) => {
		if (isExcluded(l.id)) return false;
		if (isFolderExcluded(playlistFolder.get(l.id))) return false;
		if (!opts.showAll && !l.isOwn) return false;
		if (l.id === opts.currentId) return false; // hide the label of the open playlist
		return true;
	});

	const sig = `${trackId}|${opts.showAll ? 1 : 0}|${opts.currentId}|${filtered.map((l) => l.id).join(",")}`;

	let column = row.querySelector<HTMLElement>('[data-test="pl-labels-col"]');
	if (column?.dataset.sig === sig) return;

	const duration = row.querySelector<HTMLElement>('div[data-test="duration"]');
	if (!duration?.parentElement) return;

	if (!column) {
		// Clone the duration cell KEEPING its classes (so it stays a valid grid
		// column) and only ADD our class + marker. Replacing the class would drop
		// the grid placement and break alignment.
		column = duration.cloneNode(false) as HTMLElement;
		column.setAttribute("data-test", "pl-labels-col");
		column.classList.add("pl-labels-col");
		duration.parentElement.insertBefore(column, duration);
	}
	column.dataset.sig = sig;

	const inner = document.createElement("div");
	inner.className = "pl-labels";
	if (filtered.length > MAX_LABELS) inner.classList.add("pl-labels-overflow");
	for (const label of filtered.slice(0, MAX_LABELS)) {
		if (!label.cover) continue;
		inner.appendChild(makeLabel(label, trackId));
	}

	column.replaceChildren(inner);
}
