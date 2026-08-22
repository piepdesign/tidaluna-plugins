import { observe } from "@luna/lib";

import { trace, unloads } from "./index.safe";
import { buildPlaylistTree, type PlaylistTree, type TreeFolder } from "./playlistTree";

// Rebuilds the "Add to playlist" modal list so it mirrors the user's folder
// hierarchy: loose (root) playlists first, then one collapsible header per
// folder with its playlists underneath. The original <button> rows are reused
// as-is (their click still performs TIDAL's add), we only reorder them and
// inject folder headers — so the list is NOT virtualized (verified: 105/105
// rows in the DOM), which makes reordering safe.

const ROW = 'button[data-type="add-to-playlist-modal"]';
const UUID_ATTR = "data-track--playlist-uuid";

// "+" quick popover: a context menu that lists only the recent playlists.
const POP_ROW = '[data-type="contextmenu-item"]';
const POP_RECENT = '[data-test^="sub-menu-item-recent-playlist-"]';

type Flat = {
	/** playlist uuid -> folder id */
	uuidFolder: Map<string, string>;
	/** folders depth-first, name = full path ("Parent / Child") */
	folders: { id: string; name: string }[];
};

let flat: Flat | null = null;

/** Flatten the tree into a uuid->folder map and a depth-first folder list. */
const flatten = (tree: PlaylistTree): Flat => {
	const uuidFolder = new Map<string, string>();
	const folders: { id: string; name: string }[] = [];
	const walk = (f: TreeFolder, prefix: string): void => {
		const name = prefix ? `${prefix} / ${f.name}` : f.name;
		folders.push({ id: f.id, name });
		for (const p of f.playlists) uuidFolder.set(p.uuid, f.id);
		for (const child of f.folders) walk(child, name);
	};
	for (const f of tree.folders) walk(f, "");
	return { uuidFolder, folders };
};

// Which folders are currently open. Not persisted: every time the dialog opens
// it starts fully collapsed (reset in initDialog's observe callback).
const expanded = new Set<string>();

const searchValue = (container: Element): string => {
	const input = container.parentElement?.querySelector("input");
	return (input?.value ?? "").trim();
};

/** Build a folder header row. No click listener here — clicks are handled via
 * delegation on the container (see `initDialog`), so headers keep working even
 * when the collapse/expand pass below rebuilds them. */
const makeHeader = (folderId: string, name: string, count: number): HTMLElement => {
	const h = document.createElement("div");
	h.className = "batp-folder-header";
	h.dataset.batpHeader = folderId;
	h.innerHTML = `<span class="batp-caret"></span><span class="batp-name"></span><span class="batp-count"></span>`;
	(h.querySelector(".batp-name") as HTMLElement).textContent = name;
	(h.querySelector(".batp-count") as HTMLElement).textContent = String(count);
	return h;
};

/** Show/hide rows per header to match `expanded`, in place — no DOM
 * add/remove, so toggling a folder never trips the MutationObserver that
 * re-groups on childList changes (which previously masked/undid the toggle). */
const syncCollapse = (container: Element, searching: boolean): void => {
	container.querySelectorAll<HTMLElement>(":scope > .batp-folder-header").forEach((header) => {
		const folderId = header.dataset.batpHeader;
		if (!folderId) return;
		const isCollapsed = !expanded.has(folderId) && !searching;
		header.classList.toggle("batp-collapsed", isCollapsed);
		let sib = header.nextElementSibling as HTMLElement | null;
		while (sib && !sib.classList.contains("batp-folder-header")) {
			sib.style.display = isCollapsed ? "none" : "";
			sib = sib.nextElementSibling as HTMLElement | null;
		}
	});
};

/** Compute the desired sequence and (re)apply it if the DOM differs. */
const apply = (container: Element): void => {
	if (!flat) return;
	const buttons = [...container.querySelectorAll(`:scope > ${ROW}`)] as HTMLElement[];
	if (!buttons.length) return;

	const searching = searchValue(container).length > 0;

	// Group present buttons by folder (undefined = loose/root).
	const byFolder = new Map<string | undefined, HTMLElement[]>();
	for (const b of buttons) {
		const uuid = b.getAttribute(UUID_ATTR) ?? "";
		const fid = flat.uuidFolder.get(uuid);
		const list = byFolder.get(fid) ?? [];
		list.push(b);
		byFolder.set(fid, list);
	}

	// Desired order: root buttons, then each non-empty folder (header + rows).
	type Seq = { header?: { id: string; name: string; count: number }; rows: HTMLElement[] };
	const seq: Seq[] = [];
	const root = byFolder.get(undefined);
	if (root?.length) seq.push({ rows: root });
	for (const f of flat.folders) {
		const rows = byFolder.get(f.id);
		if (rows?.length) seq.push({ header: { id: f.id, name: f.name, count: rows.length }, rows });
	}

	// Structural signature — order/composition only, deliberately WITHOUT
	// `expanded`/`searching` — so toggling a folder doesn't trigger a rebuild,
	// only the cheap syncCollapse() below.
	const sig = JSON.stringify({
		order: seq.map((s) => (s.header ? `F:${s.header.id}:${s.header.count}` : "ROOT") + "|" + s.rows.map((r) => r.getAttribute(UUID_ATTR)).join(",")),
	});
	const el = container as HTMLElement;
	const headerCount = seq.filter((s) => s.header).length;
	if (el.dataset.batpSig !== sig || container.querySelectorAll(":scope > .batp-folder-header").length !== headerCount) {
		// Rebuild order/headers (composition actually changed).
		container.querySelectorAll(":scope > .batp-folder-header").forEach((h) => h.remove());
		const frag = document.createDocumentFragment();
		for (const s of seq) {
			if (s.header) frag.appendChild(makeHeader(s.header.id, s.header.name, s.header.count));
			for (const r of s.rows) frag.appendChild(r);
		}
		container.appendChild(frag);
		el.dataset.batpSig = sig;
	}

	// Always sync collapse state (cheap: class + display toggles, no DOM churn).
	syncCollapse(container, searching);
};

// --- "+" quick popover -------------------------------------------------------

/** Non-interactive folder label for the popover (no collapse). */
const makeStaticHeader = (name: string, count: number): HTMLElement => {
	const h = document.createElement("div");
	h.className = "batp-folder-header batp-static";
	h.innerHTML = `<span class="batp-name"></span><span class="batp-count"></span>`;
	(h.querySelector(".batp-name") as HTMLElement).textContent = name;
	(h.querySelector(".batp-count") as HTMLElement).textContent = String(count);
	return h;
};

/** Recency rank from TIDAL's `…-recent-playlist-N` marker (lower = more recent). */
const recencyOf = (row: Element): number => {
	const t = row.querySelector(POP_RECENT)?.getAttribute("data-test") ?? "";
	const m = t.match(/-(\d+)$/);
	return m ? Number(m[1]) : 9999;
};

const folderName = (id: string): string => flat?.folders.find((f) => f.id === id)?.name ?? "Folder";

/** Group the popover's recent rows by folder, ordered by recency (rows + folders). */
const applyPopover = (menu: Element): void => {
	if (!flat) return;
	// Take the real recent rows via their marker's nearest contextmenu-item. Do
	// NOT filter contextmenu-items that merely *contain* recents — that also matches
	// the parent "Add to playlist" item (the flyout nests inside it), whose parent
	// is the main _actionList_ UL, which would then get (wrongly) skipped.
	const rows = [...new Set(([...menu.querySelectorAll(POP_RECENT)] as HTMLElement[]).map((el) => el.closest(POP_ROW)))].filter(
		(r): r is HTMLElement => r !== null,
	);
	if (!rows.length) return;
	const container = rows[0].parentElement as HTMLElement | null;
	if (!container) return;

	// Reorder only inside the dedicated <div> wrapper that holds the recents. Both
	// the "+" quick popover and the right-click "Add to playlist" flyout put their
	// recents in their own wrapper; the shared _actionList_ UL (where recents would
	// sit next to the regular menu actions) must never be touched — reordering there
	// drags them into the parent menu and empties the flyout.
	if (container.matches('[class*="_actionList_"]')) return;

	const loose: { el: HTMLElement; rec: number }[] = [];
	const folders = new Map<string, { el: HTMLElement; rec: number }[]>();
	for (const r of rows) {
		const uuid = r.getAttribute(UUID_ATTR) ?? "";
		const rec = recencyOf(r);
		const fid = flat.uuidFolder.get(uuid);
		if (!fid) loose.push({ el: r, rec });
		else {
			const list = folders.get(fid) ?? [];
			list.push({ el: r, rec });
			folders.set(fid, list);
		}
	}
	loose.sort((a, b) => a.rec - b.rec);
	const groups = [...folders.entries()]
		.map(([id, list]) => ({ id, rows: list.sort((a, b) => a.rec - b.rec), rec: Math.min(...list.map((x) => x.rec)) }))
		.sort((a, b) => a.rec - b.rec);

	const sig = JSON.stringify({
		loose: loose.map((x) => x.el.getAttribute(UUID_ATTR)),
		groups: groups.map((g) => [g.id, g.rows.map((x) => x.el.getAttribute(UUID_ATTR))]),
	});
	const headerCount = groups.length;
	if (container.dataset.batpPopSig === sig && container.querySelectorAll(":scope > .batp-folder-header").length === headerCount) return;

	container.querySelectorAll(":scope > .batp-folder-header").forEach((h) => h.remove());
	const frag = document.createDocumentFragment();
	for (const l of loose) frag.appendChild(l.el);
	for (const g of groups) {
		frag.appendChild(makeStaticHeader(folderName(g.id), g.rows.length));
		for (const r of g.rows) frag.appendChild(r.el);
	}
	container.appendChild(frag);
	container.dataset.batpPopSig = sig;
};

export const initDialog = (): void => {
	// Kick off the tree build once; regroup any open dialog when it's ready.
	void buildPlaylistTree()
		.then((tree) => {
			flat = flatten(tree);
			document.querySelectorAll(`div[class*="_listContainer_"]`).forEach((c) => apply(c));
			document.querySelectorAll(`div[class*="_contextMenu_"]`).forEach((m) => applyPopover(m));
		})
		.catch((err) => trace.warn("Tree build failed; dialog stays untouched.", err));

	observe(unloads, `div[class*="_listContainer_"]`, (container) => {
		// Only the add-to-playlist modal, not any other list container in the app.
		if (!container.closest(".ReactModal__Content")) return;
		// Each fresh open starts with all folders collapsed.
		expanded.clear();
		apply(container);
		// React re-renders the list on search/typing; re-group on child changes.
		const mo = new MutationObserver(() => apply(container));
		mo.observe(container, { childList: true });
		unloads.add(() => mo.disconnect());
		const input = container.parentElement?.querySelector("input");
		input?.addEventListener("input", () => apply(container));
		// Delegated click handler for folder headers: attached once on the
		// container instead of per-header, so it keeps working across rebuilds
		// (apply() removes/recreates header elements) instead of only firing on
		// whichever header instance happened to be in the DOM when it was bound.
		container.addEventListener("click", (e) => {
			const header = (e.target as HTMLElement).closest<HTMLElement>(".batp-folder-header");
			if (!header || !container.contains(header)) return;
			const folderId = header.dataset.batpHeader;
			if (!folderId) return;
			if (expanded.has(folderId)) expanded.delete(folderId);
			else expanded.add(folderId);
			apply(container);
		});
	});

	// "+" quick popover (a context menu). Harmless for other context menus:
	// applyPopover no-ops unless recent-playlist rows are present.
	observe(unloads, `div[class*="_contextMenu_"]`, (menu) => {
		applyPopover(menu);
		// The right-click "Add to playlist" flyout opens via a `_visible_` class
		// toggle (attribute change), not a DOM insertion — so watch attributes too,
		// otherwise the submenu never gets grouped on hover.
		const mo = new MutationObserver(() => applyPopover(menu));
		mo.observe(menu, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
		unloads.add(() => mo.disconnect());
	});
};
