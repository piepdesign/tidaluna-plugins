import { observe, redux, StyleTag } from "@luna/lib";

import styles from "file://styles.css?minify";
import { applyOverlays, FOLDER_LINK } from "./folderCover";
import { unloads } from "./index.safe";
import { initNativeInject } from "./nativeInject";

export { unloads };

new StyleTag("CustomCovers", unloads, styles);

// Repaint folder covers (persistent) and playlist covers (optimistic) whenever
// tiles render or the route changes.
observe(unloads, FOLDER_LINK, () => applyOverlays());
observe(unloads, 'a[data-test="cell-cover"]', () => applyOverlays());
redux.intercept("router/NAVIGATED", unloads, () => window.setTimeout(applyOverlays, 150));

// Add the Emoji button to the native playlist modal and the "Set cover" item to
// the native folder "⋯" menu.
initNativeInject();
