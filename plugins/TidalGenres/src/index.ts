import { getCredentials, MediaItem, observe, redux, StyleTag, TidalApi } from "@luna/lib";

import styles from "file://styles.css?minify";
import { trace, unloads } from "./index.safe";
import { fetchTagsFromLastFm } from "./lastfm";
import { fetchTagsByRecordingId, fetchTagsFromMusicBrainz } from "./musicbrainz";
import { onSettingsChange, settings, Settings } from "./Settings";

export { Settings, unloads };

// Show at most this many genres so a track with 30 tags doesn't flood the bar.
const MAX_GENRES = 5;

new StyleTag("TidalGenres", unloads, styles);

// --- Config ----------------------------------------------------------------

// The now-playing bar at the bottom. `observe` keeps us attached across the
// SPA's frequent re-renders. If genres stop showing after a TIDAL update, this
// selector is the first thing to re-check against the live DOM.
const FOOTER_SELECTOR = '[data-test="footer-player"]';
const GENRES_ID = "tidal-genres-row";

// Title-cases a genre for display ("hip hop" -> "Hip Hop").
const titleCase = (s: string): string => s.replace(/(^\w)|([\s-]\w)/g, (m) => m.toUpperCase());

// --- State -----------------------------------------------------------------

let currentGenres: string[] = [];

// --- Genre click: open the TIDAL genre page ---------------------------------

// TIDAL genre pages are a curated set with opaque ids (e.g. "Experimental" ->
// pages/m_experimental, not derivable from the name). The search API's `genres`
// field hands us the real `apiPath` for any genre TIDAL actually has, so we
// resolve through it and navigate to /view/<apiPath>. Genres TIDAL doesn't have
// fall back to search. Resolved paths are cached (null = no page, use search).
const pathCache = new Map<string, string | null>();

// Loose match so "hip hop" == "Hip-Hop", "r&b" == "R&B".
const normalize = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

// TIDAL genre titles are often compound ("Samba / Pagode", "Hip-Hop / Rap"), so
// split on separators and match the tag against any part. This accepts "samba"
// -> "Samba / Pagode" while still keeping "brazilian pop" off the "Pop" page.
const titleMatches = (title: string, genre: string): boolean => {
	const q = normalize(genre);
	return title.split(/[/,&]/).some((part) => normalize(part) === q);
};

async function resolveGenrePath(genre: string): Promise<string | null> {
	const key = genre.toLowerCase();
	const cached = pathCache.get(key);
	if (cached !== undefined) return cached;
	try {
		const { token, clientId } = await getCredentials();
		const q = TidalApi.queryArgs();
		const res = await fetch(`https://desktop.tidal.com/v1/search/top-hits?query=${encodeURIComponent(genre)}&limit=5&${q}`, {
			headers: { Authorization: `Bearer ${token}`, "x-tidal-token": clientId },
		});
		if (!res.ok) throw new Error(`top-hits ${res.status}`);
		const data = (await res.json()) as { genres?: Array<{ apiPath?: string; title?: string }> };
		const g = data.genres?.[0];
		// Only accept a genre page whose title actually matches the tag, so we
		// don't send "brazilian pop" to a loosely-related "Pop" page.
		const path = g?.apiPath && g.title && titleMatches(g.title, genre) ? `/view/${g.apiPath}` : null;
		pathCache.set(key, path);
		return path;
	} catch (err) {
		trace.warn("Genre resolve failed.", err);
		return null;
	}
}

// Sets an input's value the way React expects (native setter + input event) so
// TIDAL's search reacts as if the user typed it.
const setNativeValue = (input: HTMLInputElement, value: string): void => {
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
	setter?.call(input, value);
	input.dispatchEvent(new Event("input", { bubbles: true }));
};

const SEARCH_INPUT = '[data-test="search-popover-search-field"]';

/**
 * Fallback for genres TIDAL has no page for: drive the real search UI. The
 * state-only search actions don't open the view (and combining them crashes the
 * app), so we open the search popover, type into its input, and press Enter —
 * exactly what a user does.
 */
const goToSearch = (genre: string): void => {
	redux.actions["view/SHOW_SEARCH_POPOVER"]?.(undefined as never);
	let tries = 0;
	const tick = (): void => {
		const input = document.querySelector<HTMLInputElement>(SEARCH_INPUT);
		if (input) {
			input.focus();
			setNativeValue(input, genre);
			const opts: KeyboardEventInit = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true } as KeyboardEventInit;
			input.dispatchEvent(new KeyboardEvent("keydown", opts));
			input.dispatchEvent(new KeyboardEvent("keyup", opts));
			return;
		}
		if (tries++ < 20) window.setTimeout(tick, 50);
	};
	tick();
};

const openGenrePage = async (genre: string): Promise<void> => {
	try {
		const path = await resolveGenrePath(genre);
		if (path) {
			trace.log(`Opening ${path}`);
			redux.actions["router/PUSH"]?.({ pathname: path } as never);
		} else {
			trace.log(`No genre page for "${genre}", searching instead.`);
			goToSearch(genre);
		}
	} catch (err) {
		trace.warn("Genre navigation failed.", err);
	}
};

// --- DOM injection ----------------------------------------------------------

const buildGenresRow = (): HTMLDivElement => {
	const row = document.createElement("div");
	row.id = GENRES_ID;
	row.className = "tidal-genres-row";
	for (let i = 0; i < currentGenres.length; i++) {
		if (i > 0) {
			const sep = document.createElement("span");
			sep.textContent = ", ";
			sep.className = "tidal-genres-sep";
			row.appendChild(sep);
		}
		const genre = currentGenres[i];
		const a = document.createElement("a");
		a.className = "tidal-genres-item";
		a.textContent = titleCase(genre);
		a.href = "#";
		a.addEventListener("click", (e) => {
			e.preventDefault();
			void openGenrePage(genre);
		});
		row.appendChild(a);
	}
	return row;
};

/** Injects (or refreshes) the genres row inside a given footer element. */
const renderInto = (footer: Element): void => {
	const existing = footer.querySelector(`#${GENRES_ID}`);
	if (existing) existing.remove();
	if (currentGenres.length === 0) return;

	// Place the row right under the artist name (its parent is the track-info
	// text block). Fall back to the title block, then the footer itself.
	const anchor =
		footer.querySelector('[data-test="footer-artist-name"]')?.parentElement ??
		footer.querySelector('[data-test="footer-track-title"]')?.parentElement ??
		footer.querySelector('[data-test="track-info"]') ??
		footer;
	anchor.appendChild(buildGenresRow());
};

const renderAll = (): void => {
	document.querySelectorAll(FOOTER_SELECTOR).forEach(renderInto);
};

// Keep attached across re-renders: whenever the footer (re)appears, render.
observe(unloads, FOOTER_SELECTOR, (footer) => renderInto(footer));

// --- Track changes ----------------------------------------------------------

// Read straight from the raw TIDAL item — the plain strings there are more
// reliable than the memoized MediaItem accessors (whose artists() returns
// wrapper objects without a string `name`).
interface RawTidal {
	title?: string;
	artist?: { name?: string };
	artists?: Array<{ name?: string }>;
}

// Bumped on every track change. A slower in-flight lookup for a previous track
// must not overwrite the genres of the one now playing.
let requestSeq = 0;

const updateGenres = async (item: MediaItem): Promise<void> => {
	const seq = ++requestSeq;
	// Clear immediately so the previous song's genres don't linger while we fetch.
	currentGenres = [];
	renderAll();
	try {
		const raw = (item as unknown as { tidalItem?: RawTidal }).tidalItem ?? {};
		const title = raw.title ?? "";
		const artist = raw.artist?.name ?? raw.artists?.[0]?.name ?? "";
		trace.log(`Track: "${title}" — Artist: "${artist}"`);

		let genres: string[] = [];

		// Primary: Last.fm (larger, fresher tag database) when the user set a key.
		if (settings.lastFmKey && title && artist) {
			genres = await fetchTagsFromLastFm(artist, title, settings.lastFmKey);
		}

		// Fallback: MusicBrainz — via the recording id TIDAL resolved, else a
		// name search. Also used when no Last.fm key is set.
		if (genres.length === 0) {
			let brainzId: string | undefined;
			try {
				brainzId = await (item as unknown as { brainzId?: () => Promise<string | undefined> }).brainzId?.();
			} catch {
				/* not available for this track */
			}
			genres = brainzId
				? await fetchTagsByRecordingId(brainzId)
				: title && artist
					? await fetchTagsFromMusicBrainz(artist, title)
					: [];
		}

		if (seq !== requestSeq) return; // a newer track took over
		currentGenres = genres.slice(0, MAX_GENRES);
		renderAll();
	} catch (err) {
		trace.warn("Failed to update genres.", err);
		if (seq === requestSeq) {
			currentGenres = [];
			renderAll();
		}
	}
};

MediaItem.onMediaTransition(unloads, (item) => void updateGenres(item));

// Re-fetch the current track's genres (on load, and whenever the key changes).
const refreshCurrent = (): void => {
	void MediaItem.fromPlaybackContext().then((item) => {
		if (item) void updateGenres(item);
	});
};

refreshCurrent();
onSettingsChange(refreshCurrent);
