import { GENRE_WHITELIST } from "./genreList";
import { trace } from "./index.safe";

// Last.fm genre source. track.getTopTags is a public read call and needs only
// the API key (no secret, no signing). Falls back to the artist's top tags when
// the track itself has none. Users supply their own key in the settings tab.
//
// Last.fm tags are free-form crowd input (fan in-jokes, place names, "best of
// 2025"), so we keep only tags that match the curated GENRE_WHITELIST. Tags
// stay in Last.fm's order (already sorted by popularity), so the strongest
// genres come first.

const cache = new Map<string, string[]>();

interface Tag {
	name: string;
	count?: number;
}

const parseTags = (data: unknown): string[] => {
	const raw = (data as { toptags?: { tag?: Tag | Tag[] } })?.toptags?.tag;
	const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
	return list
		.map((t) => t.name)
		.filter((n) => n && GENRE_WHITELIST.has(n.toLowerCase()));
};

async function getTopTags(method: string, params: Record<string, string>, key: string): Promise<string[]> {
	const url = new URL("https://ws.audioscrobbler.com/2.0/");
	url.searchParams.set("method", method);
	url.searchParams.set("api_key", key);
	url.searchParams.set("format", "json");
	url.searchParams.set("autocorrect", "1");
	for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

	const res = await fetch(url);
	if (!res.ok) throw new Error(`Last.fm ${res.status}`);
	return parseTags(await res.json());
}

export async function fetchTagsFromLastFm(artist: string, track: string, key: string): Promise<string[]> {
	const cacheKey = `${artist}|${track}`.toLowerCase();
	const cached = cache.get(cacheKey);
	if (cached) return cached;
	try {
		let tags = await getTopTags("track.gettoptags", { artist, track }, key);
		if (tags.length === 0) tags = await getTopTags("artist.gettoptags", { artist }, key);
		cache.set(cacheKey, tags);
		return tags;
	} catch (err) {
		trace.warn("Last.fm lookup failed.", err);
		return [];
	}
}
