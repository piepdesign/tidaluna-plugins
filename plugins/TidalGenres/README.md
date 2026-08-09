# Tidal Genres

See what genres you're listening to, right in TIDAL. A TidaLuna port of
[better-spotify-genres](https://github.com/Vexcited/better-spotify-genres).

The current track's genres appear in the player bar, below the artist. Click a
genre to open its TIDAL genre page (or, for genres without a dedicated page, to
search TIDAL for it).

## Install

Install via the TidaLuna plugin store, or drop this plugin into your TidaLuna
plugins folder and enable it in the Luna settings.

## Setup (recommended: Last.fm)

Out of the box, genres come from [MusicBrainz](https://musicbrainz.org/). For
noticeably better coverage, add a free [Last.fm](https://www.last.fm/) API key:

1. Create a key at <https://www.last.fm/api/account/create> (pick any
   application name; you only need the **API key**, not the shared secret).
2. In TIDAL, open **Settings → Plugins → Tidal Genres** and paste the key into
   the "Last.fm API key" field.

The key is stored locally on your machine only. Without a key the plugin still
works using MusicBrainz.

## Notes

- Up to five genres are shown per track. Genre tags come from a curated list, so
  noise like fan tags or place names is filtered out.
- Not every genre has a dedicated TIDAL page. Those fall back to a search.
- Some tracks simply have no genre data in either source; nothing is shown then.

## Credits

- Original: [Vexcited/better-spotify-genres](https://github.com/Vexcited/better-spotify-genres)
- Genre data: [Last.fm](https://www.last.fm/) and [MusicBrainz](https://musicbrainz.org/)
