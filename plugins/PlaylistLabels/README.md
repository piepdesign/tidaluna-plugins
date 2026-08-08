# Playlist Labels (TidaLuna)

Shows small covers of your own playlists on every track row, indicating which playlists a track is in. A TidaLuna port of the Spotify/Spicetify extension [`duffey/spicetify-playlist-labels`](https://github.com/duffey/spicetify-playlist-labels).

## Features

- A cover for every playlist a track belongs to, in its own aligned column — works in the main tracklist and in "Recommended songs".
- **Click** a label to jump to that playlist and scroll to / highlight the track — even deep inside long, virtualized lists.
- The label of the playlist you are currently viewing is hidden there.
- **Right-click** a label for options: remove the track from that playlist, or hide the playlist from the labels (reversible in Settings).
- Exclude whole **folders** (hides all playlists inside) from Settings.
- Toggle between "own playlists only" and "all saved/followed playlists".
- Live updates: tracks added to a playlist show up immediately, no reload needed.
- Cached index (`localStorage`) — startup only refetches playlists whose track count changed.

## Installation

1. In TIDAL, open **Luna Settings → Plugin Store**.
2. Add this store URL as a source: `https://github.com/piepdesign/tidaluna-plugins/releases/latest/download/store.json`
3. Enable **Playlist Labels**.

The repo publishes via a GitHub Actions release tagged `latest` on every push to `master` — the URL above always points at the newest build.

## Usage

- Open any playlist, album, or mix. Tracks that belong to one of your playlists show small covers next to the duration.
- Click a cover to jump straight to that playlist, with the track highlighted.
- Right-click a cover to remove the track from that playlist or hide the playlist from the labels.
- Settings (gear icon next to the plugin): toggle "all saved playlists" and manage excluded playlists/folders.

## Notes

Built against the TidaLuna beta, verified against `@luna/lib` and the private TIDAL v1/v2 API (see the `tidalapi` Python library for endpoint references). Full development history, bug root-causes, and dead ends: `(C) Changelog.md` in this folder — read it first before making further changes.

## Development

1. Fork and clone [`Inrixia/luna-template`](https://github.com/Inrixia/luna-template) (or this repo directly), then `pnpm i`.
2. Copy this `PlaylistLabels/` folder into `plugins/`.
3. `pnpm run watch`, then enable it in TIDAL under Luna Settings → Plugin Store → DEV store.
4. Work on a feature branch, not `master` (pushing to `master` with Actions enabled publishes to the store).

Source layout: `index.ts` (entry), `playlistIndex.ts` (index + cache), `folders.ts` (folder mapping), `injectLabels.ts` (rendering, click/right-click), `contextMenu.ts`, `excluded.ts`, `api.ts` (remove-from-playlist), `cache.ts`, `Settings.tsx`.
