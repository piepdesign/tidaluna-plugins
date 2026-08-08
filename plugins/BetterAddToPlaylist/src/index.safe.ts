import { Tracer, type LunaUnload } from "@luna/core";

// Functions in this set run when the plugin is disabled/reloaded. Kept in its
// own file so index.ts and submodules can import it without a cycle.
export const unloads = new Set<LunaUnload>();

// Shared tracer for all modules. Use trace.log/trace.warn (console only);
// trace.msg.* would pop up a visible TIDAL notification.
export const { trace } = Tracer("[BetterAddToPlaylist]");
