import { Tracer, type LunaUnload } from "@luna/core";

// Runs on disable/reload. Own file so index.ts and submodules can import it
// without an import cycle (same pattern as the other piep.design plugins).
export const unloads = new Set<LunaUnload>();

// Console-only tracer. trace.msg.* would pop a visible TIDAL notification.
export const { trace } = Tracer("[TidalGenres]");
