import { Tracer, type LunaUnload } from "@luna/core";

// Functions in this set run when the plugin is disabled/reloaded. Kept in its
// own file so index.ts and submodules can import it without a cycle.
export const unloads = new Set<LunaUnload>();

// Shared tracer for all modules. Use trace.log/trace.warn (console only);
// trace.msg.* would pop up a visible TIDAL notification.
export const { trace } = Tracer("[PlaylistLabels]");

// After a label click: which context we navigated to and which track to
// highlight once it renders.
export const pendingSelect: { value: { contextId: string; trackId: string; index: number } | null } = { value: null };

// Lightweight buses so submodules can ask index.ts to rebuild or just redraw
// without an import cycle.
const rebuildHandlers = new Set<() => void>();
export const onRebuild = (cb: () => void): void => {
	rebuildHandlers.add(cb);
};
export const requestRebuild = (): void => {
	rebuildHandlers.forEach((cb) => cb());
};

const redrawHandlers = new Set<() => void>();
export const onRedraw = (cb: () => void): void => {
	redrawHandlers.add(cb);
};
export const requestRedraw = (): void => {
	redrawHandlers.forEach((cb) => cb());
};

