# Moodjectives

Renames TIDAL's auto-generated personal mixes with Spotify-daylist-style mood names. Instead of "My Mix 1", "My Mix 2" … each mix gets a name like **lowkey influential haze** — two adjectives and a noun, all lower case, built from the genres of the artists actually in that mix. "My Daily Discovery" is left untouched.

The names appear everywhere the mix shows up: the home tiles, the sidebar, the mix page, and the now-playing bar. They update as a mix's content changes, and they're deterministic (the same content always gives the same name — never random).

## Setup

Add a free **[[Wiki/Organisationen/Last.fm|Last.fm]] API key** under Settings → Plugins → Moodjectives:

1. Get a key at [last.fm/api/account/create](https://www.last.fm/api/account/create).
2. Paste the **API key** into the plugin's settings.

The key is required: Moodjectives reads each mix's artist genres from Last.fm to choose fitting words. Without a key (or if Last.fm returns nothing for a mix), the plugin leaves that mix as "My Mix N" rather than inventing words.

## How it works

For every mix, the plugin reads its current tracks, looks up the artists' genres on Last.fm, maps each genre to mood "flavors" (energetic, dreamy, danceable, dark, warm …), and picks words from the two strongest flavors. Because it works off flavors rather than a fixed genre list, it fits any taste — common or niche.

The rename is display-only: TIDAL's personal mixes are algorithmic and can't be renamed on the server, so Moodjectives overrides the shown title. Disable the plugin and the original "My Mix N" titles return.
