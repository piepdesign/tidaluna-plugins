# Playlist Labels (TidaLuna)

Shows small covers of your own playlists on every track row, indicating which playlists a track is in. A TidaLuna port of the Spotify/Spicetify extension [`duffey/spicetify-playlist-labels`](https://github.com/duffey/spicetify-playlist-labels).

## Features

- A cover for every playlist a track belongs to, in its own aligned column.
- **Liked Songs** shown as a special heart label.
- **Click** a label to jump to that playlist and scroll to / highlight the track — even deep inside long, virtualized lists.
- The label of the playlist you are currently viewing is hidden.
- **Right-click** a label for options: remove the track from that playlist, or hide the playlist from the labels.
- Exclude whole **folders** (hides all playlists inside) from the settings.
- Everything is cached in `localStorage`, so startup only refetches playlists whose track count changed.
- Toggle between "own playlists only" and "all saved playlists".

## Development

1. Fork and clone [`Inrixia/luna-template`](https://github.com/Inrixia/luna-template), then `pnpm i`.
2. Copy this `PlaylistLabels/` folder into `plugins/`.
3. `pnpm run watch`, then enable it in TIDAL under Luna Settings → Plugin Store → DEV store.
4. Work on a feature branch, not `main` (pushing to `main` publishes to the store).

## Source layout

- `index.ts` — entry: observes tracklist rows, builds the index, handles navigation/scroll.
- `playlistIndex.ts` — builds `trackId → playlists` (incl. Liked Songs), with caching.
- `folders.ts` — playlist→folder mapping via the v2 collection endpoint, cached.
- `injectLabels.ts` — renders labels, click navigation, right-click menu.
- `contextMenu.ts` — minimal custom right-click menu.
- `excluded.ts` — hidden playlists and folders (persisted).
- `api.ts` — remove a track from a playlist (ETag + `If-None-Match`).
- `cache.ts` — localStorage cache of the index.
- `Settings.tsx` — settings UI.

## Notes

Built against the TidaLuna beta, verified against `@luna/lib` and the private TIDAL v1/v2 API (see the `tidalapi` Python library for endpoint references). Liked Songs navigation uses `/my-collection/tracks`; adjust if your client uses a different route.
