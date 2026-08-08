import { StyleTag } from "@luna/lib";

import styles from "file://styles.css?minify";
import { initDialog } from "./dom";
import { unloads } from "./index.safe";
import { buildPlaylistTree } from "./playlistTree";

export { unloads };

new StyleTag("BetterAddToPlaylist", unloads, styles);

// DEV HOOK: `await __batp_tree()` in the console returns the raw folder/playlist
// tree, handy for debugging the data layer.
(window as unknown as { __batp_tree: typeof buildPlaylistTree }).__batp_tree = buildPlaylistTree;
unloads.add(() => {
	delete (window as unknown as { __batp_tree?: unknown }).__batp_tree;
});

initDialog();
