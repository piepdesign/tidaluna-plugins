# (C) Changelog — CustomCovers

Bei neuem Chat zuerst lesen, bevor Code geändert wird.

## Status (v0.12.3, in `02 Fertige Plugins/`)

Als fertig eingestuft und von `01 In Entwicklung/` nach `02 Fertige Plugins/CustomCovers/` verschoben (2026-08-09), README auf Endnutzer-Doku umgeschrieben. Cover-Sync an PlaylistLabels **bestätigt live funktionierend**. UI-Politur: 🎲 randomisiert Farbe + Emoji (gleichverteilt 0–255, respektiert Hautton), Emoji-Tab startet zufällig, Cropper-Quadrat füllt die Höhe randlos, Tab „Image". Davor: nativer „Bild ändern" → „Custom cover", Ordner-Cropper aufs native Modell, Kachel-Settle ohne Navigieren. Code-Snapshot: `../../08 Iterations-Logs/Checkpoint-20260809/CustomCovers/`.

Offene Risiken: ob `desktop.tidal.com/v1/playlists/<id>` `squareImage` liefert (sonst kein Kachel-Settle); Settle-Timings; ob der abgefangene Button ein React-Re-Render des Modals übersteht (sonst kann das native Label zurückkehren).

## Status (v0.6.0)

Dritte Feedback-Runde umgesetzt: Emoji-Button aus dem nativen Thumbnail-Kasten raus (Layout-Bruch behoben), Modal mit fester Höhe (kein Springen zwischen Bild-/Emoji-Tab), Cropper füllt das Fenster mit nativem Drittel-Raster, Zufalls-Farb-Button (🎲) neben der Pipette, Emoji-Tab startet mit zufälliger Farbe. **Noch nicht komplett live getestet.**

Bestätigt (Fynn): vorige recent-Leiste-weg + Suche-Fix funktionieren.

Offene Risiken: PNG-vs-JPG beim Upload; Playlist-Header-Cover (nur Grid-Kachel optimistisch); ob das `<dialog>` stets über TIDALs `<dialog>` stapelt.

Bewusst nicht möglich: TIDALs *echte* native Crop-Oberfläche für Ordner wiederverwenden (fest an den Playlist-Upload gekoppelt, kein natives Ordner-Modal). Stattdessen optisch/ablauftechnisch nachgebauter Cropper.

## Aktueller Funktionsumfang

- Eigenes Luna-Modal (DOM, kein React-Hook ins TIDAL-Modal) mit zwei Reitern:
  - **Bild ändern** — Dateiwahl.
  - **Emoji** — Farbwähler (Farbfeld + Hex + RGB-Werte + Pipette via EyeDropper-API) und Emoji-Feld, Live-Vorschau.
- **Emoji-Generator** (`emoji.ts`): Canvas rendert Farbfläche + zentriertes Emoji groß → PNG als DataURL (Vorschau/Ordner) oder Blob (Upload).
- **Ordner-Cover**: lokal (localStorage) gespeichert, per DOM-Overlay über das Ordnersymbol gelegt. Setzen/Entfernen über Rechtsklick-Menü.
- **Playlist-Cover**: Upload über TIDALs Cover-API (persistiert serverseitig).

## Architekturentscheidungen

- **Eigenes Modal statt Injektion ins native „Playlist bearbeiten"-Modal** (Fynn entschieden, 2026-08-08). Robuster gegen TIDAL-Updates; das native Modal existiert bei Ordnern ohnehin nicht.
- **Ordner-Cover sind zwingend lokal.** TIDAL-Ordner haben kein serverseitiges Bildfeld. Konsequenz: gerätegebunden, überleben keine Neuinstallation. Bewusst akzeptiert.
- **Playlist-Cover über echte API** statt lokalem Overlay, damit sie serverseitig persistieren und auf allen Geräten sichtbar sind.
- **Farbwähler:** natives `<input type=color>` (liefert Farbfeld + Hue) plus Hex/RGB/Pipette, statt einen kompletten HSV-Picker à la Skizze nachzubauen. Deckt „RGB-Werte + Pipette" ab, minimaler Code. HSV/CMYK-Felder der Skizze bewusst weggelassen (v0.1).

## Chronik

### 2026-08-09 — Umzug nach `02 Fertige Plugins/`
Plugin als fertig eingestuft und von `01 In Entwicklung/` nach `02 Fertige Plugins/CustomCovers/` verschoben, zusammen mit diesem Changelog. README von Dev- auf Endnutzer-Doku umgeschrieben (Features/Installation/Usage/Notes/Development statt reiner Architektur-Übersicht; die veraltete Erwähnung von `menu.ts` — inzwischen durch die native Menü-/Modal-Integration ersetzt — entfernt). `node_modules` aus dem Vault-Ordner entfernt (kein Build-Artefakt im Vault).

### 2026-08-09 — Zufalls-Emoji respektiert Hautton (v0.12.3)
Der Hautton-Wähler des Emoji-Pickers wirkt jetzt auch auf den 🎲-Zufall. Dafür speichert `allEmojis` jetzt die vollen Emoji-Objekte (inkl. `skins`-Varianten) statt nur `unicode`. `currentSkinTone` wird beim Vorladen aus `db.getPreferredSkinTone()` geseedet und über das `skin-tone-change`-Event des Pickers aktuell gehalten. `randomEmoji()` wählt bei gesetztem Ton (1–5) die passende `skins`-Variante, sonst das Basis-Emoji (Emojis ohne Hautton bleiben unverändert). package.json 0.12.2 → 0.12.3.

### 2026-08-09 — Cropper-Quadrat randlos (v0.12.2)
`geom()`: Rand von `min(vw,vh) - 8` auf `min(vw,vh)` — der äußere weiße Rahmen des Auswahlquadrats berührt jetzt direkt die Ober-/Unterkante des abgedunkelten Bereichs (kein Spalt, wie im nativen TIDAL-Zuschnitt); Dimm nur noch links/rechts. package.json 0.12.1 → 0.12.2.

### 2026-08-09 — Zufall: volle Range + komplette Emoji-DB (v0.12.1)
- **RGB 0–255 gleichverteilt:** `randomHex` von `Math.random()*256` (+Rundung, Ränder leicht unterrepräsentiert) auf `Math.floor(Math.random()*256)` umgestellt (`rand255()`).
- **Kompletter Emoji-Satz:** statt ~100er-Pool jetzt aus der vollständigen Emoji-Datenbank, die der Picker selbst nutzt (`emoji-picker-element/database.js`, `getEmojiByGroup` über emojibase-Gruppen 0/1/3–9, „component"/Skin-Tone-Gruppe 2 ausgelassen). Beim Import einmal vorgeladen (IndexedDB, geteilt mit dem Picker) → beim Modal-Öffnen bereit. Kleiner `FALLBACK_EMOJIS`-Pool nur, bis die DB geladen ist. package.json 0.12.0 → 0.12.1.

### 2026-08-09 — Emoji-Zufall + Cropper-Höhe + Tab-Name (v0.12.0)
- **🎲-Button** setzt jetzt zufällige Farbe **und** zufälliges Emoji (aus `RANDOM_EMOJIS`-Pool, ~100 Emojis). Emoji-Tab startet ebenfalls mit zufälligem Emoji (`opts.initialEmoji ?? randomEmoji()`) statt fest `🎵`. Random-Button-Wiring hinter die `emoji`-Deklaration verschoben (setzt `emoji`, dann `setBg` → refresh).
- **Cropper-Auswahlquadrat füllt die Höhe:** `geom()` von `min(vw,vh) - 48` auf `- 8` — das Quadrat nutzt jetzt die volle Höhe des abgedunkelten Bereichs (wie nativ), statt mittig mit großem Rand zu sitzen.
- **Tab „Change image" → „Image".**
package.json 0.11.0 → 0.12.0.

### 2026-08-09 — Cover-Sync an PlaylistLabels (v0.11.0)
Problem: nach einem Cover-Wechsel aktualisierte sich die **PlaylistLabels**-Ansicht (Mini-Cover je Track) erst nach Reload — Empfänger-Sache: PlaylistLabels baut seinen Cover-Index nur bei Start/Rebuild und cached ihn, ein Cover-Wechsel löst kein Neuzeichnen aus (zusätzlich memoized `TidalApi.fetch`). Fix (Sender-Seite): `settleTile` feuert bei jedem Poll ein `window`-Event **`customcovers:cover-changed`** mit `{ playlistId, coverUrl }` (die frisch geholte Server-URL bzw. regenerierte Mosaik-URL). PlaylistLabels hört darauf (v0.3.0) und aktualisiert ohne Reload. package.json 0.10.1 → 0.11.0.

### 2026-08-09 — Fix: „Custom cover" wieder klickbar (v0.10.1)
**Symptom:** nach v0.10.0 war der „Custom cover"-Button in der Playlist-Ansicht tot. **Ursache:** der native „Bild ändern"-Button trägt `pointer-events:none` (der echte Klick läuft über ein überlagertes `<input type=file>`); mein Klon hat das geerbt → nicht klickbar. **Fix:** nicht mehr klonen/ersetzen, sondern das native Label an Ort und Stelle behalten, den Text auf „Custom cover" setzen und den Klick in der **Capture-Phase** abfangen (`preventDefault` unterdrückt den File-Dialog, `stopPropagation`, dann unsere Maske öffnen). Guard über `box.dataset.ccHijacked`. package.json 0.10.0 → 0.10.1.

### 2026-08-09 — Nativen Button ersetzt (v0.10.0)
- **„Bild ändern" → „Custom cover":** statt einen zusätzlichen Button anzuhängen, klonen wir jetzt den nativen „Bild ändern"-Button (erbt Schriftart/Größe/Look 1:1), benennen ihn „Custom cover" und ersetzen damit das native File-Picker-Label (`target.replaceWith(btn)`). Klick öffnet unsere volle Maske. Der native File-Dialog entfällt (Bildwahl passiert in unserer Maske). „Bild entfernen"/Titel/Beschreibung/Veröffentlichen/Speichern bleiben.
- **Ordner-Menü:** „Set cover" → „Custom cover".
- CSS aufgeräumt: eigenes Button-Styling (`.cc-emoji-native-btn`) entfernt (Klon braucht keins); `[class*="imageButton"]{z-index:2}` entfernt, weil es sonst die Vorschau überdeckt hätte.
- Guard jetzt über `.cc-cover-btn`. package.json 0.9.0 → 0.10.0.

### 2026-08-09 — Playlist-Bildwahl über unsere Maske (v0.9.0)
Wunsch: beim Playlist-Cover dasselbe Interface/dieselben Optionen für die Bildwahl wie beim Ordner-Cover. Umsetzung: der eingehängte Button (vorher „Emoji", `emojiOnly:true`) öffnet jetzt als **„Custom cover"** die volle Maske (`openCoverModal({title:"Playlist cover"})`) mit „Change image"-Tab (unser Cropper inkl. Drehen/Spiegeln/Zentrieren) *und* „Emoji"-Tab. Beim Speichern lädt beides über `uploadPlaylistCover` hoch, danach `paintModalPreview` + `settleTile`. Nativer „Bild ändern"/Titel/Beschreibung/Veröffentlichen/Speichern bleiben unangetastet. package.json 0.8.0 → 0.9.0.

### 2026-08-09 — Cropper aufs native Modell (v0.8.0)
Zwei Punkte:
1. **Tool-Buttons zentriert:** `.cc-crop-tools { justify-content:center }`, Buttons feste Breite (72px) statt `flex:1`.
2. **Cropper wie nativ umgebaut:** vorher klippte der Cropper hart auf ein kleines Quadrat (max 260px). Jetzt zeigt er das **ganze Bild in voller Modalbreite** mit einem **zentrierten quadratischen Auswahlrahmen** (`.cc-crop-square`): sichtbarer Rand + Drittel-Innenraster, außen abgedunkelt (großes `box-shadow`, vom `overflow:hidden` der View geklippt). `cropper.ts` neu: Geometrie `geom()` (View + zentriertes Quadrat), `base = sq/min(natW,natH)` (kleinere Seite deckt das Quadrat), Clamp hält das Quadrat im Bild, `toCanvas()` mappt das Auswahlquadrat zurück in Quell-Koordinaten. Damit ist auch der Wunsch „Ränder des Rasters sichtbar" erfüllt (Rahmen wie beim nativen). package.json 0.7.0 → 0.8.0.

### 2026-08-09 — Feedback-Runde 4 (v0.7.0)
Fünf Punkte (Screenshots ausgewertet):
1. **Entfernen → Collage sofort:** neuer `fetchPlaylistCoverUrl(id)` (frische Meta über `desktop.tidal.com/v1/playlists/<id>`, `squareImage`, cache-busted) + `settleTile(id)` (pollt 500/1500/3500 ms) malt die neu generierte Mosaik-Collage als Overlay. Kein Navigieren mehr nötig.
2. **Hinzufügen → sofort sichtbar:** dasselbe `settleTile` an „Speichern" und an den Emoji-Upload gehängt; native Bild-Uploads erscheinen ohne Navigieren.
3. **Playlist-Modal-Layout repariert:** der `afterend`-Trick (v0.6) hatte die native Zwei-Spalten-Zeile zerrissen (Emoji volle Breite → alles einspaltig, Thumbnail hochgezogen). Zurück zu `box.appendChild` → Emoji-Button steht in der linken Spalte unter „Bild ändern"/„Bild entfernen", gleiche Breite.
4. **Emoji-Vorschau quadratisch:** Overlay `.cc-modal-preview` nicht mehr `inset:0` (füllte die ganze, hohe Spalte → verzerrt), sondern oben verankertes Quadrat (`top:0; width:100%; aspect-ratio:1`) → sitzt exakt aufs Thumbnail, Buttons darunter frei.
5. **Ordner-Cropper überarbeitet:** Raster nur noch die zwei inneren senkrechten + waagerechten Linien (Gradient mit Stops statt Kachelung); Zoom-Slider gleich breit wie die Vorschau (`min(100%,260px)`, zentriert); Buttons Drehen/Spiegeln/Zentrieren (`cropper.ts` erweitert: rotate/flip backen die Transformation in ein frisches Quell-Bild, center setzt Pan/Zoom zurück).
package.json 0.6.0 → 0.7.0.

### 2026-08-09 — Feedback-Runde 3 (v0.6.0)
Fünf Punkte:
1. **Emoji-Vorschau brach das native Modal-Layout:** unser Emoji-Button steckte im Thumbnail-Kasten (`imageBox`) und zog ihn in die Höhe → Overlay verzerrt. Fix: Button per `insertAdjacentElement("afterend")` unter den Kasten gesetzt; Idempotenz-Guard auf `parentElement` umgestellt. Kasten bleibt quadratisch, Overlay-Vorschau sitzt sauber.
2. **Kein Springen zwischen Tabs:** `.cc-body` feste Höhe 380px, Panes `overflow:auto`, Emoji-Picker `flex:1` statt fixe 300px.
3. **Cropper wie nativ:** füllt jetzt das Fenster (zentriertes Quadrat über `flex`/`aspect-ratio`) und hat ein Drittel-Raster (`::after`-Gradient). Echte native Crop-UI für Ordner nicht wiederverwendbar (siehe Status) → nachgebaut.
4. **Zufalls-Farb-Button** 🎲 neben der Pipette (`randomHex()` → `setBg`).
5. **Emoji-Tab startet zufällig:** `bg` initial `randomHex()` statt festem `#eb4034` (außer `initialBg` übergeben).
package.json 0.5.0 → 0.6.0.

### 2026-08-09 — Feedback-Runde 2 (v0.5.0)
Fynns sechs Punkte:
1. **Hover-Menü über Cover:** Overlay `.cc-cover` auf `z-index:1` gesenkt, TIDALs `.fx-hover-controls` (stabile Klasse) auf `z-index:3` gehoben → „⋯"-Menü bleibt beim Hover sichtbar.
2. **Emoji-recent-Leiste weg:** Style in den emoji-picker-Shadowroot injiziert (`.favorites{display:none}`).
3. **Emoji-Suche fing nichts:** TIDAL hat einen globalen „type to search"-Keylistener; sein Check greift nicht in die Shadow-DOM des Pickers, daher landeten Tasten in TIDALs Suche. Fix: `keydown/keyup/keypress` am Modal-`<dialog>` per `stopPropagation` abgefangen (Bubble). Falls TIDAL doch Capture nutzt, Capture-Variante nachrüsten.
4. **Sofort-Vorschau im nativen Modal:** nach Emoji-Upload malt `paintModalPreview` unser Cover als Overlay auf das Modal-Thumbnail (`[class*="imageBox"]`); native Buttons per `z-index:2` darüber gehalten.
5. **„Remove cover" erst beim 2. Versuch:** Ursache war unser `stopPropagation` im Menüeintrag, das TIDALs Menü offen hielt → Ergebnis erst nach Navigieren sichtbar. Jetzt kein `stopPropagation`, Menü schließt normal, Entfernung sofort sichtbar.
6. **Bild-Zuschnitt für Ordner:** neuer `cropper.ts` (quadratisches Sichtfenster, ziehen + Zoom-Slider, `toCanvas()` rendert den sichtbaren Ausschnitt in `COVER_SIZE`). Ins Bild-Tab eingebaut; Playlists nutzen weiter TIDALs nativen Zuschnitt. package.json 0.4.0 → 0.5.0.

### 2026-08-09 — Native Integration (v0.4.0)
Aus den DOM-Mitschnitten umgesetzt (`nativeInject.ts`, neu):
- **Punkt 1 + 4:** Statt eigenem Playlist-Modal hängt jetzt ein **„Emoji"-Button** neben dem nativen „Bild ändern" (`form[data-test="playlist-form"] [class*="imageBox"]`). Bilder laufen komplett über TIDALs nativen Weg inkl. Zuschnitt (Punkt 4 damit erledigt). Nur Emoji nutzt unsere Maske (`openCoverModal({emojiOnly:true})`) + Upload. Titel/Beschreibung/Veröffentlichen/Speichern/Bild-entfernen bleiben nativ und unangetastet.
- **Punkt 3:** Ordner nicht mehr per Rechtsklick, sondern über einen geklonten Eintrag **„Set cover"/„Remove cover"** im nativen „⋯"-Menü (`ul[class*="actionList"]`, `button[data-test="rename-folder"]` als Anker).
- **Punkt 2:** natives „Bild entfernen" im Playlist-Modal wird abgegriffen → `clearPlaylistCoverOptimistic` löscht das Overlay sofort; `removeOverlay(id)` generalisiert.
- **ID-Quelle:** Menüs/Modale sind Portale ohne ID → `pointerdown`-Tracking merkt sich die zuletzt angefasste Kachel (`article[data-test="grid-item-folder"]` / `grid-item-playlist"]`), plus URL-Fallback `/playlist/<uuid>`.
- **Top-Layer-Fix:** unser Modal ist jetzt ein `<dialog>` mit `showModal()`, sonst läge es hinter TIDALs nativem `<dialog>` (z-index schlägt den Top-Layer nicht, nur ein weiterer Dialog). Backdrop/ESC über `::backdrop` und das `cancel`-Event.
- `menu.ts` (eigenes Rechtsklick-Menü) entfernt, `index.ts` verschlankt. package.json 0.3.0 → 0.4.0.

### 2026-08-09 — Voller Emoji-Picker (v0.3.0)
Punkt 5 aus Fynns Feedback: kuratiertes Emoji-Grid ersetzt durch `emoji-picker-element` (Web-Component, alle Emojis, WhatsApp-artige Kategorien + Suche, Dark-Theme über CSS-Variablen). Neue Abhängigkeit `emoji-picker-element` in package.json → `pnpm install` im Fork nötig. Lädt die Emoji-Daten zur Laufzeit vom jsDelivr-CDN (TIDAL hat Netz). Punkt 2 vorbereitet: `clearPlaylistCoverOptimistic(id)` + `removeOverlay(id)` ergänzt, damit ein entferntes Cover sofort aus der Kachel verschwindet (Verkabelung an das native „Bild entfernen" kommt mit der Modal-Integration). package.json 0.2.0 → 0.3.0.

Noch offen (brauchen native-DOM-Mitschnitt): Punkt 1 (Emoji-Funktion in TIDALs „Playlist bearbeiten"-Modal statt eigenem Modal), Punkt 3 (Ordner über natives Dreipunktmenü statt Rechtsklick), Punkt 4 (nativer Bild-Zuschnitt).

### 2026-08-09 — E2E-Test + UX-Runde (v0.2.0)
Erster Live-Test: Ordner-Cover und Playlist-Upload laufen. Aus Fynns Beobachtungen umgesetzt:
- **Playlist-Cover sofort sichtbar:** Server verarbeitet das Bild verzögert (`UPLOAD_REQUESTED`/`NOT_MODERATED`), daher erschien das Cover bisher erst nach Weg-und-wieder-hin-Navigieren. Fix: nach erfolgreichem Upload wird dasselbe Bild optimistisch als `cc-cover`-Overlay auf die Playlist-Kachel (`a[data-test="cell-cover"]`) gemalt (Session-Map, nicht persistiert; echtes Server-Cover liegt darunter). `folderCover.ts` dafür generalisiert (Ordner persistent via localStorage, Playlists optimistisch), Overlay-Klasse `.cc-folder-cover` → `.cc-cover`.
- **Modal-Tab-Bug:** In der Popout-Ansicht waren „Bild wählen" und Farbwähler gleichzeitig sichtbar. Ursache: `.cc-pane { display:flex }` überstimmt das `hidden`-Attribut. Fix: `.cc-pane[hidden]{display:none}`. Jetzt Farbwähler nur im Emoji-Tab, „Choose image" nur im Bild-Tab.
- **Abschnitt rechts:** Farbwähler-/RGB-Felder liefen aus dem Modal. Fix: `box-sizing:border-box` global im Modal, `min-width:0` auf Pane/Row, RGB-Inputs auf `width:100%` flexibel, Modal 460→540 px.
- **Emoji-Auswahl statt Tippen:** Textfeld ersetzt durch klickbares Emoji-Raster (kuratierte Liste ~70, scrollbar, aktive Auswahl hervorgehoben).
- **Hint „Wird quadratisch geschnitten…" entfernt.**
- **Sprache:** komplettes Plugin auf Englisch (UI, Menüs, Meldungen, README, description). Konvention „Plugins immer Englisch" in Projekt-`CLAUDE.md` verankert.
- Playlist-Trigger-Selektor per Mitschnitt bestätigt (`data-test="cell-cover"`, `/playlist/<uuid>`). package.json 0.1.2 → 0.2.0.

### 2026-08-08 — Ordner-DOM verifiziert (v0.1.2)
Mitschnitt der Grid-Kachel: Ordner-Route ist `/folder/<uuid>`; die Kachel trägt einen Link `a[data-test="folder-cover"]` mit UUID im `href` und Name im `aria-label`, das Ordnersymbol sitzt im `div[class*="cellCoverContainer"]`. `folderCover.applyOverlays` und der Trigger in `index.ts` auf diese stabilen Anker umgestellt (statt der gehashten Klassen und der `.closest(tile)`-Heuristik). Modal-Titel zeigt jetzt den Ordnernamen. Playlist-Trigger bleibt vorerst href-basiert (`a[href*="/playlist/"]`) bis zum eigenen Mitschnitt. package.json 0.1.1 → 0.1.2.

### 2026-08-08 — Playlist-Upload verkabelt (v0.1.1)
`POST /v2/artworks`-**Response** erfasst: `data.id` = Artwork-ID, `data.attributes.sourceFile.uploadLink.href` = presigned S3-PUT-URL, `.uploadLink.meta` = Methode (PUT) + Header (`content-length`, `content-md5`). `status.technicalFileStatus: UPLOAD_REQUESTED`. Daraus `playlistCover.ts` neu gebaut: Dreischritt POST artworks → PUT S3 → PATCH relationships/coverArt (nativer 4. PATCH = Name/Beschreibung-Save, übersprungen). `src/md5.ts` ergänzt (RFC-1321, Bytes → hex + base64; `crypto.subtle` kann kein MD5). `content-md5` ist als Fetch-Header erlaubt (nicht auf der Forbidden-Header-Liste) und wird von TIDAL selbst so gesetzt. `content-length`/`host` setzt der Browser automatisch (beide signiert, matchen). package.json 0.1.0 → 0.1.1.

### 2026-08-08 — Scaffold + Emoji-Generator + Modal
Plugin in `01 In Entwicklung/CustomCovers/` angelegt. `emoji.ts` (Generator), `coverModal.ts` (Modal), `folderCover.ts` (lokaler Store + Overlay), `playlistCover.ts` (Upload), `menu.ts` (Rechtsklick-Menü), `index.ts` (Verdrahtung), `styles.css`. package.json v0.1.0.

## Cover-Upload — Mitschnitt-Fund (2026-08-08)

Netzwerk-Mitschnitt (fetch-Patch in DevTools) beim nativen „Bild ändern" zeigt: TIDAL nutzt hier die **offizielle Open API v2** (`openapi.tidal.com`), JSON:API-Format, **nicht** `desktop.tidal.com/v1`. Beobachtet wurden zwei Requests:

- `PATCH https://openapi.tidal.com/v2/playlists/<uuid>/relationships/coverArt`
- `PATCH https://openapi.tidal.com/v2/playlists/<uuid>`

Das Cover ist also eine **Relationship** (`coverArt`), kein direkter Bild-Upload am Playlist-Objekt. Der eigentliche **Byte-Upload wurde noch nicht erfasst** (erstes Snippet las Body/Header nicht aus `Request`-Objekten; zudem Filter zu eng). Nächster Schritt: verbessertes Snippet (liest `Request`-Body via `clone().text()`, loggt alle schreibenden Requests), um Upload-Endpoint + JSON:API-Bodies zu finden. Erwarteter Flow: (1) Bild hochladen → coverArt-ID, (2) `PATCH …/relationships/coverArt` verlinkt ID, (3) `PATCH …/playlists/<id>`.

Auth: `openapi.tidal.com` sollte denselben User-Bearer akzeptieren wie `getCredentials()`; beim Umbau prüfen (evtl. anderer Scope/Header als beim v1-Weg).

### Vollständiger Flow (2. Mitschnitt, verbessert)

Kompletter Vierschritt-Flow erfasst. Alle openapi-Requests mit `accept`/`content-type: application/vnd.api+json`, `authorization: Bearer …`, `idempotency-key: <uuid>`.

1. **`POST https://openapi.tidal.com/v2/artworks`**
   Body: `{"data":{"attributes":{"mediaType":"IMAGE","sourceFile":{"md5Hash":"<hex-md5>","size":<bytes>}},"type":"artworks"}}`
   Response (noch zu erfassen) liefert Artwork-`id` + presigned S3-Upload-URL.
2. **`PUT https://artwork-source-files.s3.amazonaws.com/<key>?X-Amz-…`**
   Header: `content-length`, `content-md5` (**base64**-MD5, nicht hex!), `content-type: image/jpeg`. Presigned URL signiert `content-length;content-md5;host` → diese Header müssen exakt passen. Body: rohe Bild-Bytes (File/Blob).
3. **`PATCH https://openapi.tidal.com/v2/playlists/<uuid>/relationships/coverArt`**
   Body: `{"data":[{"id":"<artworkId>","type":"artworks"}]}`
4. **`PATCH https://openapi.tidal.com/v2/playlists/<uuid>`**
   Body: `{"data":{"attributes":{"description":"…","name":"…"},"id":"<uuid>","type":"playlists"}}` — nur der Name/Beschreibung-Save des Modals, **fürs Cover nicht nötig, wird übersprungen**.

Wichtig: **md5Hash zweimal in verschiedenen Kodierungen** — Schritt 1 hex (32 Zeichen), Schritt 2 `content-md5` base64. Beide aus demselben MD5 der Bytes. `crypto.subtle` kann kein MD5 → kleine MD5-Funktion (`src/md5.ts`, public-domain) mitbündeln.

Nebenbei gefeuert (irrelevant): `POST desktop.tidal.com/api/event-batch` (Analytics).

## Bekannte offene Punkte

- **Playlist-Upload end-to-end testen:** Code steht (v0.1.1), aber noch nicht im laufenden TIDAL ausgelöst. Prüfen: akzeptiert die API `mediaType: IMAGE` auch für PNG (Emoji-Cover ist PNG; nativer Test war JPG)? Falls S3/Moderation zickt, ggf. Emoji-Cover als JPEG rendern.
- **Kachel-Selektoren verifizieren:** `a[href*="/folder/"]`, `a[href*="/playlist/"]`, sowie das Overlay-Ziel in `folderCover.applyOverlays` (`.tile/.card/.image/.cover`-Heuristik) gegen die echte DOM prüfen.
- **Ordner-ID aus Kachel:** aktuell aus dem `/folder/<id>`-Link. Prüfen, ob Ordnerkacheln in der Übersicht tatsächlich so einen Link tragen (im Screenshot Ordner ohne sichtbares href) — ggf. ID über Redux-State statt href holen.
- **Emoji-Reiter im nativen Modal** (näher an der Skizze) bleibt als spätere Option offen, wurde zugunsten Robustheit verworfen.

## Verworfen

- Injektion des „Emoji"-Reiters direkt ins native TIDAL-Modal (Skizze) — zu fragil, bei Ordnern nicht vorhanden.
