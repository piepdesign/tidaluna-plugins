# Custom Covers (TidaLuna)

Set your own cover for any **playlist** or **folder** — upload an image (with crop), or generate one from a **background color + a centered emoji**. Folders finally get real covers instead of the default folder icon.

## Features

- **Playlists:** in the native "Playlist bearbeiten" dialog, the image button is relabelled **"Custom cover"** and opens our own picker instead of the system file dialog. Everything else in that dialog (title, description, publish toggle, save, remove image) stays TIDAL's own.
- **Folders:** a **"Custom cover"** entry is added to the folder's "⋯" menu (next to rename/delete), plus **"Remove cover"** once one is set. Folders have no cover of their own in TIDAL, so this is stored locally and only shows on this device.
- **Image tab:** pick a file, then crop it with a square selection (full-width preview, rule-of-thirds grid, drag to pan, zoom slider, rotate / flip / center) — the same crop-then-save flow as TIDAL's native one.
- **Emoji tab:** pick a background color (color field, hex, RGB fields, an eyedropper to sample any pixel on screen, and a 🎲 button for a random color + random emoji, matching your selected skin tone) and any emoji from the full, searchable, category-grouped picker. The emoji is centered large on the color as the cover.
- Playlist covers upload through TIDAL's own servers (visible on every device); the tile and the dialog's own thumbnail update right away, no need to navigate away and back.
- Plays nicely with **Playlist Labels**: a cover change is broadcast so its track-row mini-covers update immediately too.

## Installation

1. In TIDAL, open **Luna Settings → Plugin Store**.
2. Add this store URL as a source: `https://github.com/piepdesign/tidaluna-plugins/releases/latest/download/store.json`
3. Enable **Custom Covers**.

The repo publishes via a GitHub Actions release tagged `latest` on every push to `master` — the URL above always points at the newest build.

## Usage

- **Playlist:** open a playlist → **⋯ → Playlist bearbeiten** (or the pencil/edit action) → click **Custom cover** → choose "Image" or "Emoji" → **Save**.
- **Folder:** right-click a folder, or open its **⋯** menu → **Custom cover** → choose "Image" or "Emoji" → **Save**. Use **Remove cover** from the same menu to go back to the default folder icon.

## Notes

Built against the TidaLuna beta and TIDAL's official Open API v2 (cover upload) plus internal v1 endpoints (metadata). Selectors into TIDAL's UI are anchored to stable `data-test` attributes where possible.

## Development

1. Fork and clone [`Inrixia/luna-template`](https://github.com/Inrixia/luna-template) (or this repo directly), then `pnpm i`.
2. Copy this `CustomCovers/` folder into `plugins/`.
3. `pnpm run watch`, then enable it in TIDAL under Luna Settings → Plugin Store → DEV store.
4. Work on a feature branch, not `master` (pushing to `master` with Actions enabled publishes to the store).

Source layout: `index.ts` (wiring), `nativeInject.ts` (hooks into TIDAL's playlist modal + folder menu), `coverModal.ts` (our own picker: image + emoji tabs), `cropper.ts` (square crop UI), `emoji.ts` (canvas cover generator), `playlistCover.ts` (Open API v2 upload), `folderCover.ts` (local folder covers + tile overlays), `md5.ts` (hash for the upload).
