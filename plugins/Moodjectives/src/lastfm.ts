import { GENRE_WHITELIST } from "./genreList";
import { trace } from "./index.safe";

// Last.fm artist tags. artist.getTopTags is a public read call needing only the
// API key (no secret, no signing). Tags are free-form crowd input, so we keep
// only those matching the curated GENRE_WHITELIST. They stay in Last.fm's order
// (already sorted by popularity), so the strongest genres come first.

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
		.filter((n) => n && GENRE_WHITELIST.has(n.toLowerCase()))
		.map((n) => n.toLowerCase());
};

export async function fetchArtistTags(artist: string, key: string): Promise<string[]> {
	const cacheKey = artist.toLowerCase();
	const cached = cache.get(cacheKey);
	if (cached) return cached;
	try {
		const url = new URL("https://ws.audioscrobbler.com/2.0/");
		url.searchParams.set("method", "artist.gettoptags");
		url.searchParams.set("artist", artist);
		url.searchParams.set("api_key", key);
		url.searchParams.set("format", "json");
		url.searchParams.set("autocorrect", "1");

		const res = await fetch(url);
		if (!res.ok) throw new Error(`Last.fm ${res.status}`);
		const tags = parseTags(await res.json());
		cache.set(cacheKey, tags);
		return tags;
	} catch (err) {
		trace.warn("Last.fm artist tags failed.", err);
		return [];
	}
}
