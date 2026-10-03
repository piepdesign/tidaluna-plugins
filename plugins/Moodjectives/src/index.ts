import { MediaItem, observe, redux } from "@luna/lib";

import { trace, unloads } from "./index.safe";
import { fetchArtistTags } from "./lastfm";
import { fetchMixArtists } from "./mixApi";
import { readMixMapFromFiber } from "./fiber";
import { makeName } from "./naming";
import { onSettingsChange, settings, Settings } from "./Settings";

export { Settings, unloads };

// Matches the auto-generated personal mix titles ("My Mix 1"…, localized "Mein
// Mix N"). "My Daily Discovery" deliberately does NOT match, so it stays as-is.
const MIX_TITLE_RE = /^(?:My Mix|Mein Mix)\s+(\d+)$/i;
// Cheap pre-filter for the text-node walk (see titleElements).
const MIX_HINT_RE = /\b(?:my|mein)\s*mix\b/i;

// Normalised text of an element ("My Mix\n5" -> "My Mix 5").
const normText = (el: Element): string => (el.textContent ?? "").replace(/\s+/g, " ").trim();

// Computed name per mix id, for the current session. fetchMixArtists returns the
// mix's live tracks, so the name reflects current content.
const nameCache = new Map<string, string>();
const pending = new Set<string>();
// Mixes we've already tried to name. Those without a name (no Last.fm key, or no
// genres came back) stay in here so we leave their original "My Mix N" title and
// don't refetch every redraw. Cleared when the Last.fm key changes.
const resolved = new Set<string>();

let warnedNoKey = false;
const warnNoKeyOnce = (): void => {
	if (warnedNoKey) return;
	warnedNoKey = true;
	trace.warn("No Last.fm API key set — leaving mixes as-is (set a key in Settings → Plugins → Moodjectives).");
};

// mixNumber (the N in "My Mix N") -> mix id, read once from the "Individuelle
// Mixe" module's React fiber (see fiber.ts). Built lazily from the first tile.
let numberMap: Map<number, string> | null = null;

const uniq = (arr: string[]): string[] => [...new Set(arr)];

// Flattens per-artist tag lists into genres ranked by how many artists carry
// them (ties keep Last.fm's popularity order via first-seen index).
const rankGenres = (perArtist: string[][]): string[] => {
	const count = new Map<string, number>();
	const firstSeen = new Map<string, number>();
	let idx = 0;
	for (const tags of perArtist) {
		for (const t of tags) {
			count.set(t, (count.get(t) ?? 0) + 1);
			if (!firstSeen.has(t)) firstSeen.set(t, idx++);
		}
	}
	return [...count.keys()].sort((a, b) => {
		const d = (count.get(b) ?? 0) - (count.get(a) ?? 0);
		return d !== 0 ? d : (firstSeen.get(a) ?? 0) - (firstSeen.get(b) ?? 0);
	});
};

/**
 * Resolves and caches the name for a mix, then triggers a redraw. Only renames
 * when we actually derived genres from the mix's content — no Last.fm key, or no
 * genres, means the title is left as-is (never random filler words).
 */
async function ensureName(mixId: string): Promise<void> {
	if (!mixId || nameCache.has(mixId) || pending.has(mixId) || resolved.has(mixId)) return;
	if (!settings.lastFmKey) {
		warnNoKeyOnce();
		resolved.add(mixId);
		return;
	}
	pending.add(mixId);
	try {
		const artists = uniq(await fetchMixArtists(mixId)).slice(0, 12);
		let genres: string[] = [];
		if (artists.length) {
			const perArtist = await Promise.all(artists.slice(0, 8).map((a) => fetchArtistTags(a, settings.lastFmKey)));
			genres = rankGenres(perArtist);
		}
		if (genres.length === 0) {
			trace.warn(`Mix ${mixId}: no genres from Last.fm — leaving original title.`);
			return;
		}
		const signature = artists.join("|").toLowerCase() || mixId;
		nameCache.set(mixId, makeName(mixId, genres, signature));
		requestRedraw();
	} catch (err) {
		trace.warn(`ensureName failed (mix ${mixId}).`, err);
	} finally {
		pending.delete(mixId);
		resolved.add(mixId);
	}
}

// --- DOM ---------------------------------------------------------------------

// The mix id from the current URL, if we're on a mix detail page.
const urlMixId = (): string => window.location.pathname.match(/\/mix\/([^/?#]+)/)?.[1] ?? "";

const idFromHref = (href: string | null | undefined): string => href?.match(/\/mix\/([^/?#]+)/)?.[1] ?? "";

/**
 * The mix id from a mix link belonging to this title: the link the title sits in
 * (now-playing bar, linked tiles), else the only /mix/ link in a close ancestor
 * (tile markup where title and link are siblings). Ambiguous subtrees (more than
 * one mix link, i.e. a whole shelf) are rejected rather than guessed.
 */
const hrefMixId = (el: Element): string => {
	const own = idFromHref(el.closest('a[href*="/mix/"]')?.getAttribute("href"));
	if (own) return own;
	let node: Element | null = el.parentElement;
	for (let i = 0; node && i < 4; i++, node = node.parentElement) {
		const links = node.querySelectorAll<HTMLAnchorElement>('a[href*="/mix/"]');
		if (links.length === 1) return idFromHref(links[0].getAttribute("href"));
		if (links.length > 1) break;
	}
	return "";
};

// mixNumber -> id pairs learned from mix detail pages, persisted across restarts.
// Safety net: once a mix has been opened, its tile can be named even if TIDAL
// changes the tile markup/props again and the fiber lookup comes up empty.
const LEARNED_KEY = "moodjectives:mix-numbers";
const loadLearned = (): Map<number, string> => {
	try {
		const raw = localStorage.getItem(LEARNED_KEY);
		if (!raw) return new Map();
		return new Map(Object.entries(JSON.parse(raw) as Record<string, string>).map(([k, v]) => [Number(k), v]));
	} catch {
		return new Map();
	}
};
const learned = loadLearned();
const learn = (num: number, mixId: string): void => {
	if (learned.get(num) === mixId) return;
	learned.set(num, mixId);
	try {
		localStorage.setItem(LEARNED_KEY, JSON.stringify(Object.fromEntries(learned)));
	} catch {
		/* storage full / unavailable: the in-memory map still works this session */
	}
};

// Elements that are the page header of a mix detail page (where the URL id is
// authoritative, so we may learn from them). Filled while collecting titles.
const headerTitles = new WeakSet<HTMLElement>();
const HEADER_SEL = 'h1, h2, header, [data-test*="title" i]';

// Fiber scans per redraw pass — the first successful one fills the whole map.
let fiberScans = 0;
const refreshNumberMap = (el: HTMLElement, num: number): void => {
	if (numberMap?.has(num) || fiberScans >= 4) return;
	fiberScans++;
	const fresh = readMixMapFromFiber(el);
	if (fresh) numberMap = numberMap ? new Map([...numberMap, ...fresh]) : fresh;
};

/**
 * Resolves an element's mix id: fiber map (tiles) -> nearby mix link -> URL (only
 * for a detail-page header) -> previously learned number. Re-resolves whenever the
 * element shows a raw "My Mix N" again (the reused now-playing bar switching mix).
 * Stores the original title so we can restore it on unload. Returns "" if unknown.
 */
const resolveMixId = (el: HTMLElement): string => {
	const rawNum = normText(el).match(MIX_TITLE_RE)?.[1];
	let mixId = el.getAttribute("data-mjx-mix") ?? "";

	if (rawNum) {
		const num = Number(rawNum);
		refreshNumberMap(el, num);
		let freshId = numberMap?.get(num) || hrefMixId(el) || "";
		if (!freshId && headerTitles.has(el)) freshId = urlMixId();
		if (freshId && headerTitles.has(el)) learn(num, freshId);
		if (!freshId) freshId = learned.get(num) ?? "";
		if (freshId && freshId !== mixId) {
			mixId = freshId;
			el.setAttribute("data-mjx-mix", mixId);
			el.setAttribute("data-mjx-orig", el.textContent ?? "");
		}
	} else if (!mixId) {
		mixId = hrefMixId(el) || urlMixId();
		if (mixId) {
			el.setAttribute("data-mjx-mix", mixId);
			el.setAttribute("data-mjx-orig", el.textContent ?? "");
		}
	}
	return mixId;
};

/**
 * All elements currently showing a mix title: the ones we already tagged, plus
 * every element whose composed text reads exactly "My Mix N".
 *
 * Found via a text-node walk instead of class selectors. Up to v1.0.0 this hung on
 * `span[class*="titleText"]`, which TIDAL 2.43 renamed — home tiles silently
 * stopped being renamed while the detail page (generic h1/h2 scan) kept working.
 * Text matching is what we actually mean and survives markup/class churn; the walk
 * is debounced to one pass per 250 ms.
 */
const titleElements = (): HTMLElement[] => {
	const out = new Set<HTMLElement>();
	document.querySelectorAll<HTMLElement>("[data-mjx-mix]").forEach((el) => out.add(el));

	const onDetailPage = urlMixId() !== "";
	const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
	for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
		const raw = node.nodeValue;
		// Cheap pre-filter: skip the overwhelming majority of text nodes outright.
		if (raw === null || raw.length > 40 || !MIX_HINT_RE.test(raw)) continue;
		// The number can live in a sibling element ("My Mix" + badge), so climb to
		// the nearest ancestor whose composed text is the full title.
		let el: HTMLElement | null = node.parentElement;
		for (let depth = 0; el !== null && depth < 3; depth++, el = el.parentElement) {
			if (!MIX_TITLE_RE.test(normText(el))) continue;
			out.add(el);
			if (onDetailPage && (el.matches(HEADER_SEL) || el.closest(HEADER_SEL) !== null)) headerTitles.add(el);
			break;
		}
	}
	return [...out];
};

// Split into a read/decide pass (DOM queries + attribute bookkeeping) and a
// batched write pass (text changes), so we don't interleave layout reads and
// writes and thrash layout.
const redraw = (): void => {
	fiberScans = 0;
	const writes: Array<[HTMLElement, string]> = [];
	for (const el of titleElements()) {
		const mixId = resolveMixId(el);
		if (!mixId) continue;
		const name = nameCache.get(mixId);
		if (!name) {
			if (!resolved.has(mixId)) void ensureName(mixId);
			continue;
		}
		if (el.textContent !== name) writes.push([el, name]);
	}
	for (const [el, name] of writes) {
		el.textContent = name;
		el.setAttribute("data-mjx", name);
		el.setAttribute("title", name);
	}
};

// Debounced so a burst of React re-renders collapses into one pass.
let redrawTimer = 0;
const requestRedraw = (): void => {
	window.clearTimeout(redrawTimer);
	redrawTimer = window.setTimeout(redraw, 250);
};

// --- Wiring ------------------------------------------------------------------

// Catch lazily-rendered mix tiles/links as they appear. Class names change
// between TIDAL versions, hrefs don't — and the MutationObserver below is the
// catch-all anyway.
observe(unloads, 'a[href*="/mix/"]', () => requestRedraw());

redux.intercept("router/NAVIGATED", unloads, () => window.setTimeout(redraw, 150));

// Track change -> the now-playing bar's mix label updates; re-run so it shows the
// new mix's name instead of a stale one.
MediaItem.onMediaTransition(unloads, () => requestRedraw());

// Safety net for lazily rendered / re-rendered tiles. childList only (not
// characterData, which would fire on our own text writes). Debounced, off on unload.
const domObserver = new MutationObserver(() => requestRedraw());
domObserver.observe(document.body, { subtree: true, childList: true });
unloads.add(() => domObserver.disconnect());

// New key -> recompute every mix from scratch.
onSettingsChange(() => {
	nameCache.clear();
	resolved.clear();
	warnedNoKey = false;
	redraw();
});

// Restore original titles on unload.
unloads.add(() => {
	document.querySelectorAll<HTMLElement>("[data-mjx-orig]").forEach((el) => {
		el.textContent = el.getAttribute("data-mjx-orig") ?? el.textContent;
		el.removeAttribute("data-mjx");
		el.removeAttribute("data-mjx-mix");
		el.removeAttribute("data-mjx-orig");
	});
});

redraw();
