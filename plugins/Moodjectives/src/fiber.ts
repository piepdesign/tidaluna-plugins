// The "Individuelle Mixe" tiles are React-only: no /mix/ anchor, no mix id in the
// DOM, and the id isn't in the DOM-level props either (the click handler is a
// closure). But the list module's React fiber carries the full data — its
// memoizedProps hold an `items` array where each `items[i].data` is the mix DTO.
// The DTO has no `title`, but it has `mixNumber` (the N in "My Mix N") and `id`.
// We walk up from a tile's title element to that module and read a
// mixNumber -> id map straight from React state. No network guessing.

// Mix ids are long hex strings without dashes (e.g. 002c874b3752cb742367237d934ac0).
const MIX_ID_RE = /^[0-9a-f]{20,}$/i;

/**
 * Reads a mixNumber -> mix id map from the React fiber of the module that owns
 * the given title element. Returns null if no such module is found (e.g. on a
 * mix detail page, where the caller falls back to the URL). Only entries with a
 * numeric `mixNumber` are kept, so "My Daily Discovery" (no mixNumber) is skipped.
 */
export function readMixMapFromFiber(el: Element): Map<number, string> | null {
	const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
	if (!key) return null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let f: any = (el as unknown as Record<string, any>)[key];
	for (let i = 0; i < 25 && f; i++, f = f.return) {
		const items = f.memoizedProps?.items;
		if (!Array.isArray(items)) continue;
		const map = new Map<number, string>();
		for (const it of items) {
			const d = it?.data;
			if (d && typeof d.id === "string" && typeof d.mixNumber === "number" && MIX_ID_RE.test(d.id)) {
				map.set(d.mixNumber, d.id);
			}
		}
		if (map.size) return map;
	}
	return null;
}
