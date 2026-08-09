import { Tracer, type LunaUnload } from "@luna/core";

// Cleanup set: everything resource-holding (listeners, observers, StyleTags)
// goes in here so it is released on disable/reload. Kept in its own file so
// submodules can import it without an import cycle with index.ts.
export const unloads = new Set<LunaUnload>();

// Shared tracer. trace.log/trace.warn = console only; trace.msg.* would show a
// visible TIDAL toast (use sparingly).
export const { trace } = Tracer("[CustomCovers]");
