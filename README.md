# Piep's TidaLuna Plugins

A plugin store for **[TidaLuna](https://github.com/Inrixia/TidaLuna)** — the mod framework for the TIDAL desktop app — maintained by [piep.design](https://piep.design). Small, focused plugins that make TIDAL feel a little more like your own.

> Built on top of [`Inrixia/luna-template`](https://github.com/Inrixia/luna-template) and the TidaLuna framework by Inrixia. This is an independent collection of plugins, not the template itself.

---

## Installation

### 1. Install TidaLuna

1. Install the **desktop** version of [TIDAL](https://offer.tidal.com/download) (the Windows Store version is not supported).
2. Close TIDAL, then download and run the [**Luna Installer**](https://github.com/jxnxsdev/TidaLuna-Installer/releases/latest).
3. Start TIDAL again — you now have a **Luna** section in the settings.

### 2. Add this store

Copy this store URL:

```
https://github.com/piepdesign/tidaluna-plugins/releases/latest/download/store.json
```

In TIDAL, open **Settings → Luna → Plugin Store**, add the URL above as a custom store, then install and enable the plugins you want from the list below.

> TidaLuna is in beta and its settings UI still changes. If the exact menu names differ in your version, or something won't install, the [TidaLuna Discord](https://discord.gg/jK3uHrJGx4) is the best place to ask.

### 3. Last.fm key (for two plugins)

**Tidal Genres** and **Moodjectives** read genre data from Last.fm. Get a free API key at [last.fm/api/account/create](https://www.last.fm/api/account/create) and paste it into the plugin's settings (Settings → Luna → the plugin's tab).

---

## Plugins

| Plugin | What it does |
| --- | --- |
| **Playlist Labels** | Shows small covers of your own playlists on every track row, so you can see which playlists a track is already in. Click a cover to jump straight to that playlist. |
| **Better Add to Playlist** | Restructures TIDAL's "Add to playlist" dialog to mirror your own folder and playlist hierarchy — like Spotify — instead of one flat list. Works in the modal, the "+" popover and the right-click menu. |
| **Custom Covers** | Set custom covers for playlists and folders: upload and crop an image, or build one from a background color plus a centered emoji. Folders finally get real covers instead of the default folder icon. |
| **Tidal Genres** | Shows the genres of the currently playing track in the player bar. Click a genre to search TIDAL for it. *(Needs a Last.fm key.)* |
| **Moodjectives** | Renames your auto-generated personal mixes (My Mix 1, 2 …) with Spotify-daylist-style mood names — two adjectives and a noun, all lower case — built from the artists actually in each mix. "My Daily Discovery" is left untouched. *(Needs a Last.fm key.)* |

Each plugin has its own README in `plugins/<name>/` with more detail.

---

## Credits

- **[TidaLuna](https://github.com/Inrixia/TidaLuna)** and **[luna-template](https://github.com/Inrixia/luna-template)** by [Inrixia](https://github.com/Inrixia) — the framework and starting point this store is built on.
- The **[TidaLuna community](https://discord.gg/jK3uHrJGx4)** for docs, help and reverse-engineering.
- Plugins by [piep.design](https://piep.design).

---

## Development

Want to build or hack on a plugin?

```sh
pnpm install
pnpm run watch   # hot-reload build for local testing
pnpm run build   # one-off build into ./dist
```

For the full setup (Node, pnpm via Corepack, hot reload into the TIDAL app), see the original [`luna-template`](https://github.com/Inrixia/luna-template) guide. Pushing to `master` triggers a GitHub Action that rebuilds every plugin and publishes them to the `latest` release, including the aggregated `store.json` used by the store URL above.

## License

See [LICENSE](./LICENSE). This repository keeps the license of the `luna-template` it is derived from.
