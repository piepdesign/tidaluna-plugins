import { observe, redux, StyleTag } from "@luna/lib";

import styles from "file://styles.css?minify";
import { applyOverlays, FOLDER_LINK, PLAYLIST_LINK } from "./folderCover";
import { unloads } from "./index.safe";
import { initNativeInject } from "./nativeInject";

export { unloads };

new StyleTag("CustomCovers", unloads, styles);

// Repaint folder covers (persistent) and playlist covers (optimistic) whenever
// tiles or sidebar rows render, or the route changes. The href selectors match
// both grid tiles and sidebar/list rows, so covers show in both places.
observe(unloads, FOLDER_LINK, () => applyOverlays());
observe(unloads, PLAYLIST_LINK, () => applyOverlays());
redux.intercept("router/NAVIGATED", unloads, () => window.setTimeout(applyOverlays, 150));

// Add the Emoji button to the native playlist modal and the "Set cover" item to
// the native folder "⋯" menu.
initNativeInject();
