# "What are we watching?" source picker (Design, 17 Nov 2026)

_The owner's request (17 Nov 2026, via the Planner): a bigger, clearer picker for what to watch, with large tiles and
category chips. Another product has one; **nothing here copies its look**: the colours, glyphs, layout and mascot are
Sidelit's own (themes in `apps/web/src/styles.css`, logo / Glowbeam in `logo-sidelit.md`). It replaces today's ⠿
popover (card SRC1, `ui/sources.ts`); it adds no new source. Sketches: `source-picker/a-computer.svg`,
`source-picker/a-phone.svg` (option A, Night theme); `b-computer.svg`, `c-computer.svg` (options B and C, made by
`source-picker-sketches.mjs`)._

## What goes in (all options)

Only sources that work today or have a card. No DRM service, no service name that does not really work (`CLAUDE.md`
§6). Two tiles are marked **Coming** because their cards are queued; they say so instead of acting.

| # | Tile (EN / TR) | Line under it (EN / TR) | Chip | Kind | What a tap does |
|---|---|---|---|---|---|
| 1 | YouTube | Search videos / Video ara | Videos | source | ⠿ points the box at YouTube search (today's `youtube`) |
| 2 | ♾ Shorts feed / ♾ Shorts akışı | Endless Shorts / Bitmeyen Shorts | Shorts | action | opens the feed window on the ♾ tab (SH2 `feed-window.ts`) |
| 3 | ▶ Video feed / ▶ Video akışı | Popular, back to back / Popüler, art arda | Videos | action | opens the feed window on the ▶ tab |
| 4 | TikTok | Find one, paste its link / Bul, linkini yapıştır | Shorts | action | today's SR2 tile: `tiktokUrl(words)` in a new tab, then "📋 Paste and play" |
| 5 | Vimeo | Search Vimeo / Vimeo'da ara | Videos | source | ⠿ → `vimeo` (says "Not available yet" while `/api/vimeo/status` is off, as today) |
| 6 | 🎙 Podcasts / 🎙 Podcastler | Shows and episodes / Programlar ve bölümler | Music | source | ⠿ → the existing podcast search (`ui/podcasts.ts`) |
| 7 | YouTube Music | Playlists and albums / Çalma listeleri ve albümler | Music | coming (CR2) | a short note: "Coming soon. A single song's link already plays." |
| 8 | Dailymotion | Links / Linkler | Videos | coming (DM1) | a short note: "Coming soon." |
| 9 | 🔗 Paste a link / 🔗 Link yapıştır | A video link or file address / Video linki ya da dosya adresi | From a link | action | closes, focuses the box with the "Paste the video's link here" hint |
| 10 | 🌐 Search the web / 🌐 Web'de ara | Find a video, bring its link / Bir video bul, linkini getir | From a link | source | ⠿ → `web` (today's Google tab + the paste hint on return) |
| 11 | 🧩 Any film page / 🧩 Herhangi bir film sayfası | With the extension / Eklentiyle | From a link | action | opens `extension.html` (install / how to start) in a new tab |
| 12 | 🎮 Games / 🎮 Oyunlar | Opens the games hall / Oyun salonunu açar | All only | action | closes and opens the existing games hall (`gallery.ts`), nothing else |

- **Chips:** All · Videos · Shorts · Music · From a link / Hepsi · Videolar · Shorts · Müzik · Linkten. The Games tile
  shows only under All (the Planner's decision: no games grid here). A chip only filters; the pick is remembered per
  device (`localStorage`, like `searchSource`), the chip resets to All on each open.
- **Header:** "What are we watching?" / "Ne izliyoruz?" with a small Glowbeam (the theme's pose). It is a label, not
  a slogan; the owner can rename it.
- **Source vs action:** a **source** tile changes where the search box looks (✓ on the current one, `aria-pressed`)
  and closes the picker with the box focused and its placeholder updated (as SRC1). An **action** tile does its thing
  and closes. Coming tiles are buttons too (they explain), never disabled-looking grey text.

### Brand rules: words, not logos
- **No brand logo in any tile.** YouTube's logo may not be drawn under 100 px tall, recoloured, put on a non-solid
  background or made the most prominent element (`youtube-audit/brand/README.md`); a 100 px logo cannot fit a tile,
  and a dozen brand marks in a grid would be exactly the "most prominent" misuse. Vimeo, TikTok and Dailymotion have
  similar rules, and SR2 already shows TikTok as a plain ♪.
- Each tile is therefore **our own line glyph** (search lens, ♾, ▶, ♪, mic, note, link, globe, puzzle piece, game pad)
  in a round badge ringed with the theme's `--accent`, plus the **service's name as plain text** (allowed: it names a
  feature that really uses the service). No brand colours, no lookalike shapes (the YouTube tile is a lens, never a red
  rounded play button).
- The linked YouTube logo stays where YTQ1 put it: next to the YouTube results and the feed window, where the API's
  content appears. The picker never sits next to the word "Sidelit" as if the brands were ours.

### Where it opens
- **⠿ beside the box** (computer room, the phone's 🔍 Search tab) and the empty room's **"🔍 Search a video" / "🔍
  Video ara"** (`phone.searchVideo`; on a computer the empty room's prompt gets the same button). One picker, two doors.
- **Nothing of ours over the YouTube player** (`CLAUDE.md` §7): in an empty room, or over a non-YouTube player, the
  picker may take the video's place; while a YouTube video shows, it opens **in the side panel's place** (3 a row,
  smaller tiles) and the video stays uncovered. On a film page (extension overlay) it sits in the room view's island,
  never over the film.

### Theme, accessibility, sizes
- Surfaces are the theme's tokens: picker `--surface`, tiles `--surface-2`, lines `--border`, text `--text` / dimmed
  text that still reaches 4.5:1, the current source and focus in `--accent`. On scene themes the picker is a solid card
  (no scene image behind the tiles). The card checks contrast in Night, Matinee (light, `--accent` #9a3517), Neon and one
  scene theme; the ✓ and focus ring are 2–3 px and the pick is marked by the ✓ glyph, not by colour alone.
- Grid: `role=list` of buttons, each named by its name + line ("YouTube, search videos"); **Coming** is part of the
  name. Arrow keys move between tiles (2-D, like the games hall), Tab reaches chips → tiles → ✕, Esc closes and gives
  focus back to the button that opened it. `:focus-visible` rings kept.
- **No scroll inside the view:** 12 tiles = 4 × 3 on a computer, 3 × 4 on a phone; the chip row may slide sideways on
  narrow phones (it is the only part that moves). Phone targets: tiles ≥ 104 px, chips and ✕ 44 px.
- Texts: every string in `i18n.ts` + `i18n-tr.ts` (or the chunk's `TEXT` pair if it stays lazy, as SRC1 does).

## Options

### A. "Marquee grid" (recommended)
One card titled "What are we watching?" with the chip row and a grid of equal big tiles (glyph badge, name, one line).
Computer: in the video's place, 4 a row, ~210 × 118 px tiles; with a YouTube video, in the side panel's place, 3 a row.
Phone: a bottom sheet, 3 a row, 112 px tiles with the name only (the line goes into the accessible name). Sideways
phone: 6 a row, two rows per chip filter.
Sketches: `source-picker/a-computer.svg`, `source-picker/a-phone.svg`.

```
┌ (glow) What are we watching?                         ✕ ┐
│ [All] [Videos] [Shorts] [Music] [From a link]          │
│ ┌✓ ⌕ ──┐ ┌ ♾ ───┐ ┌ ▶ ───┐ ┌ ♪ ───┐                   │
│ │YouTube│ │Shorts│ │Video │ │TikTok│                   │
│ ├ ⌕ ───┤ ├ 🎙 ──┤ ├ ♫ Coming ├ ▷ Coming               │
│ │Vimeo  │ │Podc. │ │YT Music │Dailym.│                   │
│ ├ 🔗 ──┤ ├ 🌐 ──┤ ├ 🧩 ──┤ ├ 🎮 ──┤                   │
│ │Link   │ │Web   │ │Film p│ │Games │                   │
└────────────────────────────────────────────────────────┘
```
- For: the clearest answer to "what can we watch"; every source the same size, so no brand dominates; chips make the
  4 kinds obvious; one layout scales from the side panel to fullscreen.
- Against: biggest change from SRC1 (new chunk, new placement logic for the YouTube case).

### B. "Shelves"
No chips: four labelled rows (Videos, Shorts, Music, From a link), each a row of wider, shorter tiles; Games is a small
link at the bottom. Computer: rows of up to 4; phone: rows of 2–3, the "From a link" shelf last.
Sketch: `source-picker/b-computer.svg`.
```
Videos       [⌕ YouTube] [▶ Video feed] [⌕ Vimeo] [▷ Dailymotion·Coming]
Shorts       [♾ Shorts feed] [♪ TikTok]
Music        [🎙 Podcasts] [♫ YouTube Music·Coming]
From a link  [🔗 Paste a link] [🌐 Search the web] [🧩 Any film page]
                                                        🎮 Games hall →
```
- For: the categories are visible at once without a tap; calm, list-like.
- Against: uneven rows leave gaps; on a phone the four shelves need ~620 px and scroll on small phones (breaks "no
  scroll unless the list grows"); not the "big tiles + chips" picture the owner liked.

### C. "Bigger ⠿ popover"
Keep SRC1's popover under the box, widen it to ~460 px with a segmented chip bar and 2-column list rows (glyph, name,
line). Phone: the same rows in the Search tab.
Sketch: `source-picker/c-computer.svg`.
```
[All|Videos|Shorts|Music|Link]
⌕ YouTube  · Search videos   ✓ │ ♾ Shorts feed · Endless Shorts
▶ Video feed · Popular         │ ♪ TikTok · Find one, paste it
…
```
- For: smallest change; never covers the player (it hangs under the box).
- Against: rows, not big tiles; still feels like a menu, which is what the owner wants to move away from.

## Recommendation
**A, "Marquee grid".** It is the large, clear picker the owner asked for, keeps every brand at the same plain size
(words, our glyphs, no logos), fits without scrolling on a computer and a phone, and its side-panel placement keeps
the YouTube player uncovered. If picked, the Planner turns it into a lane A card replacing SRC1's popover; "Done when"
should include a Test Lab hook (e.g. `sources.picker`: open state, chip, tiles shown, current source, placement) and
the existing `scripts/harness/sources` extended for chips, the YouTube placement and the phone sheet.
