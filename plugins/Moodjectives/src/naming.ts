import { poolsForGenres } from "./genreVocab";

// Deterministic string hash (djb2). Same input -> same number, so a given mix
// with a given content signature always yields the same name (not random), yet
// the name changes as soon as the content changes.
const hash = (s: string): number => {
	let h = 5381;
	for (let i = 0; i < s.length; i++) h = (((h << 5) + h) ^ s.charCodeAt(i)) >>> 0;
	return h >>> 0;
};

// Two words share a stem if their first 4 letters match ("sugary"/"sugar",
// "groovy"/"groove") — used to avoid an adjective and noun that read as the same
// word.
const sameStem = (a: string, b: string): boolean => a.slice(0, 4) === b.slice(0, 4);

/**
 * Builds a "adjective adjective noun" name (all lower case) from the mix's
 * dominant genres. Adjective 1 comes from the dominant genre category, adjective
 * 2 from the second category, the noun from the dominant category. Each slot uses
 * its own salted hash so the three picks are independent (better spread across
 * similar mixes than slicing one seed). `signature` is the mix's current content
 * fingerprint (its artist list) — feeding it into the seed makes the name
 * recompute when the mix changes, while staying stable for identical content.
 */
export function makeName(mixId: string, genres: string[], signature: string): string {
	const { adj1, adj2, nouns } = poolsForGenres(genres);
	const base = `${mixId}::${signature}`;

	const a1 = adj1[hash(`a1|${base}`) % adj1.length];

	let a2 = adj2[hash(`a2|${base}`) % adj2.length];
	if (a2 === a1) a2 = adj2[(adj2.indexOf(a2) + 1) % adj2.length];

	// Pick a noun that doesn't echo either adjective's stem (e.g. avoid
	// "sugary … sugar"), scanning deterministically from the hashed start.
	const start = hash(`n|${base}`) % nouns.length;
	let noun = nouns[start];
	for (let i = 0; i < nouns.length; i++) {
		const cand = nouns[(start + i) % nouns.length];
		if (!sameStem(cand, a1) && !sameStem(cand, a2)) {
			noun = cand;
			break;
		}
	}

	return `${a1} ${a2} ${noun}`.toLowerCase();
}
