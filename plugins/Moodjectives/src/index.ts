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

// The mix id from a nearby mix link (e.g. the now-playing bar's source link).
const hrefMixId = (el: Element): string =>
	el.closest('a[href*="/mix/"]')?.getAttribute("href")?.match(/\/mix\/([^/?#]+)/)?.[1] ?? "";

/**
 * Resolves an element's mix id from our stored attribute, else the tile's
 * mixNumber via the fiber map, a nearby mix link, or the URL. Re-resolves when the
 * element shows a raw "My Mix N" again (the reused now-playing bar switching mix).
 * Stores the original title so we can restore it on unload. Returns "" if unknown.
 */
const resolveMixId = (el: HTMLElement): string => {
	const rawNum = normText(el).match(MIX_TITLE_RE)?.[1];
	let mixId = el.getAttribute("data-mjx-mix") ?? "";

	if (rawNum) {
		if (!numberMap) numberMap = readMixMapFromFiber(el);
		const freshId = (numberMap?.get(Number(rawNum)) ?? "") || hrefMixId(el) || urlMixId();
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

// Leaf title elements that either read "My Mix N" (fresh) or we already tagged.
// Cheap by default (tile/sidebar title spans); the broader header scan only runs
// on a mix detail page, where the title isn't a titleText span.
const titleElements = (): HTMLElement[] => {
	const out = new Set<HTMLElement>();
	document.querySelectorAll<HTMLElement>("[data-mjx-mix]").forEach((el) => out.add(el));
	const consider = (el: HTMLElement): void => {
		if (el.children.length === 0 && MIX_TITLE_RE.test(normText(el))) out.add(el);
	};
	document.querySelectorAll<HTMLElement>('span[class*="titleText" i]').forEach(consider);
	// Now-playing bar: the source label ("My Mix 8") for the currently playing mix.
	document.querySelectorAll<HTMLElement>('[data-test="footer-player"] a, [data-test="footer-player"] span').forEach(consider);
	if (urlMixId()) document.querySelectorAll<HTMLElement>('h1, h2, [data-test*="title" i]').forEach(consider);
	return [...out];
};

// Split into a read/decide pass (DOM queries + attribute bookkeeping) and a
// batched write pass (text changes), so we don't interleave layout reads and
// writes and thrash layout.
const redraw = (): void => {
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

// Catch lazily-rendered tiles as their title spans appear.
observe(unloads, 'span[class*="titleText" i]', () => requestRedraw());

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
