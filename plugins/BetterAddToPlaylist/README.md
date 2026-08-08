# Better Add to Playlist (TidaLuna)

Restructures TIDAL's "Add to playlist" flow so it mirrors your own folder and playlist hierarchy — like Spotify — instead of one flat, unstructured list.

## Features

- Groups the playlists in the **"Add to playlist" modal** ("Show all playlists") under collapsible folder headers, matching the folder structure you built in your collection.
- Loose playlists (not in any folder) stay at the top; folders follow, each showing its playlist count.
- Folders start **collapsed on every open**, so a long collection stays scannable.
- Typing in the search box auto-expands everything and filters as usual.
- Reuses TIDAL's own playlist rows, so clicking a playlist adds the track exactly as before — no change to how adding works.
- The quick **"+" popover** groups its recent playlists by folder too, sorted by most recently used (rows and folders).

## Installation

1. In TIDAL, open **Luna Settings → Plugin Store**.
2. Add this store URL as a source: `https://github.com/piepdesign/tidaluna-plugins/releases/latest/download/store.json`
3. Enable **Better Add to Playlist**.

## Usage

Add a track to a playlist as usual (the **+** button → "Show all playlists"). The list now shows your folders as collapsible sections. Click a folder header to expand or collapse it; click a playlist to add the track.

## Notes

Built against the TidaLuna beta, verified against `@luna/lib` and the private TIDAL v1/v2 API. The playlist/folder hierarchy is read from the v1 `playlistsAndFavoritePlaylists` endpoint (metadata) merged with the v2 `my-collection/playlists/folders` endpoint (nesting).

## Development

1. Fork and clone [`Inrixia/luna-template`](https://github.com/Inrixia/luna-template) (or this repo directly), then `pnpm i`.
2. Copy this `BetterAddToPlaylist/` folder into `plugins/`.
3. `pnpm run watch`, then enable it in TIDAL under Luna Settings → Plugin Store → DEV store.
4. Work on a feature branch, not `master`.

Source layout: `index.ts` (entry), `playlistTree.ts` (folder/playlist tree data), `dom.ts` (modal grouping + collapsible headers), `styles.css`.
