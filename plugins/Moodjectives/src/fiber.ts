// The "Individuelle Mixe" tiles are React-only: no /mix/ anchor in the markup we
// can rely on, and the id isn't in the DOM-level props either (the click handler
// is a closure). But the owning module's React fiber carries the full data: some
// prop object holds the mix DTOs, each with `mixNumber` (the N in "My Mix N") and
// `id`.
//
// Up to v1.0.0 we read exactly `memoizedProps.items[i].data.{id,mixNumber}`. TIDAL
// 2.43 reshuffled that shape, the lookup went silent, and home tiles stopped being
// renamed. So we no longer hardcode the path: we walk the fiber chain upwards and
// scan each fiber's props/state (bounded in depth and node count) for ANY object
// carrying both `mixNumber` and a mix-id-shaped `id`. Survives prop renames.

// Mix ids are long hex strings without dashes (e.g. 002c874b3752cb742367237d934ac0).
const MIX_ID_RE = /^[0-9a-f]{20,}$/i;

const MAX_DEPTH = 7;
const MAX_NODES = 600;

/** Bounded DFS over a props/state object, harvesting every mixNumber -> id pair. */
const collect = (root: unknown, map: Map<number, string>): void => {
	if (!root || typeof root !== "object") return;
	const seen = new Set<unknown>();
	const stack: Array<[unknown, number]> = [[root, 0]];
	let budget = MAX_NODES;

	while (stack.length > 0 && budget-- > 0) {
		const [val, depth] = stack.pop()!;
		if (!val || typeof val !== "object" || depth > MAX_DEPTH || seen.has(val)) continue;
		// Never descend into DOM nodes or fibers — that explodes and leads nowhere.
		if (typeof Node !== "undefined" && val instanceof Node) continue;
		seen.add(val);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const obj = val as any;
		if (typeof obj.id === "string" && typeof obj.mixNumber === "number" && MIX_ID_RE.test(obj.id)) {
			map.set(obj.mixNumber, obj.id);
		}

		if (Array.isArray(obj)) {
			for (const v of obj) if (v && typeof v === "object") stack.push([v, depth + 1]);
			continue;
		}
		for (const k in obj) {
			// React internals / back references: cycles and dead weight.
			if (k === "_owner" || k === "stateNode" || k === "return" || k === "alternate" || k.startsWith("__")) continue;
			const v = obj[k];
			if (v && typeof v === "object") stack.push([v, depth + 1]);
		}
	}
};

/**
 * Reads a mixNumber -> mix id map from the React fiber above the given title
 * element. Returns null when nothing was found (caller falls back to a nearby
 * /mix/ link, the URL, or the learned map). Only entries with a numeric
 * `mixNumber` exist, so "My Daily Discovery" is skipped automatically.
 */
export function readMixMapFromFiber(el: Element): Map<number, string> | null {
	const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
	if (!key) return null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let f: any = (el as unknown as Record<string, any>)[key];
	const map = new Map<number, string>();

	for (let i = 0; i < 30 && f; i++, f = f.return) {
		collect(f.memoizedProps, map);
		if (map.size > 0) return map;
		collect(f.memoizedState, map);
		if (map.size > 0) return map;
	}
	return null;
}
