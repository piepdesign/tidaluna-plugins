import { Tracer, type LunaUnload } from "@luna/core";

// Runs when the plugin is disabled/reloaded. Own file so index.ts and submodules
// can import it without an import cycle.
export const unloads = new Set<LunaUnload>();

// Shared tracer. trace.log/trace.warn are console-only; trace.msg.* would pop up
// a visible TIDAL notification (we don't want that here).
export const { trace } = Tracer("[Moodjectives]");
