# PH1: a lighter phone room (Design, 13 Nov 2026)

Card PH1, "A lighter phone room". Lane A builds from this file. Docs only; no product code changed.

**Goal:** one calm phone room in the computer room's language: the same buttons, colours, radii, icons and words, in
fewer and plainer pieces. "Fast": no blur, no heavy shadows, no new images or fonts, fewer CSS rules.

Files in `phone-room/`:
- `proposal.css`: the proposed rules (22 rules, real class names). Lane A moves them into `room.css`'s phone section.
- `mockups.mjs` → `mockups.html`: static mockups built from `proposal.css` and the theme tokens (Night, Matinee, Ocean;
  EN + TR). Run `NODE_PATH=$(npm root -g) node mockups.mjs <out-dir>` for the PNGs.
- `shots.cjs`: shoots today's phone room from `npm run dev` (states home, join, empty, playing, plus, more, add,
  sideways; themes and languages as arguments; an optional CSS file to inject).
- Images, today (left) vs PH1 (right):
  - `night-en.jpg`: room with a video, empty room, ⋯ sheet, ＋ sheet, 🔍 search sheet, typing;
  - `matinee-tr.jpg`: the same in Matinee, Turkish;
  - `ocean-en-mockups.jpg`: PH1 in Ocean (room, empty, ⋯, ＋, search);
  - `sideways.jpg`: sideways with a video;
  - `home-join.jpg`: the home page on a phone without the extension box, and the join card.

Why Ocean and not a scene theme: phones only offer the plain themes (`PLAIN_THEMES`); a saved scene theme shows as
Night on a phone, so Night already covers it.

## Decisions (made here, with the reason)
1. **Sheets are list rows, not tiles.** The computer's ⋯ menu (`.room-more-pop`) is a list of rows with an icon and a
   word; today's phone sheets are a 3-column tile grid of a different shape. Rows read faster, fit long Turkish words
   without wrapping, and reuse the computer's look. Row: 48 px high, radius 10, 16 px text, 24 px icon, a muted value
   at the end (Speed "1×", People "2").
2. **One button shape** for every small round control in the room (😀 🖼 🔍 ＋ ➤, the strip's 🎙 📷 ⛶ ⋯): 44 × 44,
   radius 10, the computer's `.btn` radius. Today there are three shapes (circles, rounded squares, pills).
3. **The message box** gets the computer's radius 12 and 44 px height.
4. **➤ replaces 🔍 and ＋ while typing**, CSS only (`:has(#chat-input:placeholder-shown)`), so the box keeps ~170 px at
   390 px wide and ~140 px at 360 px. When the box is empty, ➤ has nothing to send anyway.
5. **🖼 is a row button**, not hidden: the card puts it in the row, and sending an image is a one-tap action.
6. **Sheets have no shadow and no blur**: a 1 px border, radius 14 at the top (the ⋯ menu's radius), the surface
   colour, and a plain 50 % black backdrop. The grip handle goes; the ✕ is a 44 px target in the header.
7. **The empty room** shows the title and two big buttons (🔍 Search a video, 🔗 Invite), each 44 px high and up to
   280 px wide. No mascot, no numbered steps and no "Run a sync test" button on the phone (the test stays in ⋯ →
   Settings on the computer and in the Test Lab).
8. **Sideways with a video:** the video takes the room, a side column ≥ 200 px holds the chat, and under it two 44 px
   buttons: ⛶ Watch fullscreen and 🎙. 💬 opens the chat when the column is hidden. The button label never wraps.
9. **Matinee on a phone:** the video area uses `--screen` (the dark screen tone) instead of the paper colour, as on the
   computer, so a letterbox doesn't look like a hole in the page.
10. **Home on a phone:** the extension box (`.hm-ext`) is hidden; a phone can't install the extension.
11. **The join card stays as it is**: it already uses the shared card and button shapes.

Inside PH1 itself no real choice was left: rows vs tiles was the only one, and rows win on every measure the card names
(the computer's look, fewer rules, no wrapping in Turkish). The owner's later request for an app-like room (PH1b, below)
was a real choice for him: **he picked option A, bottom tabs (13 Nov 2026).** Decisions 1–3, 6 and 9–11 above stay;
PH1b's "What changes against PH1 if A is picked" says what of the rest changes.

## The screens

### Upright room
- Video on top, then the faces strip (avatars, 🎙 📷 ⛶ ⋯), then the chat list, then the chat row.
- Chat row: 😀 · message box · 🖼 · 🔍 · ＋ (empty box) or 😀 · message box · 🖼 · ➤ (typing).
- `.chat-form`: a 1 px top border, the surface colour, the bottom safe area as padding.

### 🔍 search sheet
- Title "Add a video", the search box (radius 12), then "Add to queue" (accent) and "Play now", then the queue.
- It is today's ＋ → "Add a video" sheet, opened directly from 🔍 (`openAdd`).

### ＋ sheet (trimmed)
- Title: ▶ the current video's name. Rows: 📌 Pin · ⏩ Speed (value "1×") · 🔄 Sync · ⏭ Skip.
- Gone from it: Add a video (now 🔍), Send an image (now 🖼 in the row), Fullscreen (⛶ in the strip).

### ⋯ sheet
- Header: the room's name and "1 person" (as today). Rows: 🔗 Invite · 👥 People (count) · 🎮 Games ·
  💾 Save the room · 👤 Profile · ⚙️ Settings · ❓ Help.
- Gone from it: Queue (in the 🔍 sheet), Film time, Today's recap, Sync test, Room rules (they stay on the computer;
  Room rules is reachable from Settings). `roomMoreItems` already has a `desktop` flag: lane A sets it on those items.

### Empty room
- "No video yet", 🔍 Search a video (accent), 🔗 Invite (plain).

### Sideways with a video
- See decision 8 and `sideways.jpg`.

### Home and join card
- See decisions 10 and 11 and `home-join.jpg`.

## Tokens and sizes
Nothing new: every colour is an existing token (`--surface`, `--surface-2`, `--border`, `--text`, `--muted`,
`--accent`, `--accent-btn`, `--on-accent`, `--screen`).

| Piece | Size | Radius | Colour |
|---|---|---|---|
| Row button (😀 🖼 🔍 ＋ ➤ 🎙 📷 ⛶ ⋯) | 44 × 44 | 10 | surface-2; ➤ `--accent-btn` |
| Message box | height 44 | 12 | surface, `--field-border` |
| Sheet | max-height 80dvh | 14 top | surface, 1 px border, no shadow |
| Sheet header | min-height 52 | | bottom border; ✕ 44 × 44 |
| Sheet row | min-height 48, padding 0 12px, gap 12 | 10 | `:active` surface-2; 16 px text; 24 px icon |
| Empty-room buttons | min-height 44, width min(280px, 100%) | 10 (`.btn`) | accent / plain |
| Sideways side column | ≥ 200 px | | |

Focus rings stay: nothing here sets `outline`.

## What goes from `room.css` (phone section, line numbers on `main` today)

| Block | Line | Lines | Replaced by |
|---|---|---|---|
| `.ph-grid` | L11704 | 5 | `.ph-sheet-body` |
| `.ph-tile`, `.ph-tile:active` | L11710 | 22 | `.ph-row` |
| `.ph-tile-ico` | L11734 | 4 | `.ph-row-ico` |
| `.ph-tile-count` | L11739 | 7 | `.ph-row-end` |
| `.ph-grip` | L11662 | 8 | (gone) |
| `.ph-sheet` (with `box-shadow 0 -14px 44px`) | L11635 | 16 | `.ph-sheet` (no shadow) |
| `.chat-tool`, `.chat-tool[aria-expanded]` | L11554 | 18 | the one button shape |
| `.chat-send` | L11574 | 9 | the one button shape |
| `.chat-form` | L11533 | 7 | `.chat-form` |
| `#chat-input` | L11541 | 8 | `#chat-input` |
| `.chat-attach { display: none }` | L11550 | 3 | shown as a row button |
| `.together-strip .cam-ctl` | L11477 | 5 | the one button shape |
| the duplicate `.chat-panel .chat-list` | L11517 / L11529 | — | one rule |
| `.empty`, `.empty .theme-mascot`, `.empty h2`, `.empty-steps` | L11393 | 18 | `.empty`, `.ph-empty-actions` |
| `html.phone :is(.profile-pop …)::before` handle | — | 10 | (gone) |
| popups' `box-shadow` on the phone | — | — | (gone) |

About 26 rules and ~190 lines go; `proposal.css` adds 22 rules and ~160 lines, so the phone section ends smaller with
one shape fewer. The phone section has 9 `box-shadow`s today; `backdrop-filter` is already forced off (L12472).

## Notes for lane A
- Markup changes are small:
  - `openPlus` (`ui/phone-room.ts` L180) and `openMore` (L223) build `.ph-row` buttons (icon span, label, optional end
    value) instead of `.ph-tile`s; the items lists shrink as above.
  - `#chat-search` is a new `.chat-tool.phone-only` button before `#chat-plus` (room.ts L625–630) that calls `openAdd`.
  - The empty room's two buttons get a `.ph-empty-actions` wrapper; hide `.empty-steps`, the mascot and the sync-test
    button under `html.ph-room`.
  - Sideways: a `.ph-side-actions` pair under the chat column.
- Texts: "Search a video", "Watch fullscreen" and "Skip" are new keys in `i18n.ts` + `i18n-tr.ts` (TR: "Video ara",
  "Tam ekran izle", "Atla"); the rest exist.
- Matinee `.empty` keeps NP1's light-on-dark palette (the empty room sits on the dark screen).
- Test Lab hook: a scenario that opens each sheet (＋, ⋯, 🔍) and the typing state on a phone size, so `shots.cjs` and
  the sweep can reach them.
- Check after: the design sweep at phone sizes (360 and 390 upright, sideways), Night + Matinee + Ocean, EN + TR; no
  scrollbars in a sheet at 360 × 640 (the ⋯ sheet is 7 rows = 52 + 7 × 48 ≈ 390 px).

## PH1b: an app-like phone room (owner's request, 13 Nov 2026)
The owner sent screenshots of another watch-party phone app and asked for "this design on the phone, in our own fitting
and proper way". The patterns taken (not the look, colours or icons): a bottom tab bar, a room that is the video plus an
activity feed plus **one** input row, search as its own screen, and a "me" screen of grouped cards with a toggle and a
one-line help text each. Everything is drawn with the PH1 shapes and the computer's tokens and words.

Files: `app-mockups.mjs` → `app-mockups.html` (28 screens at 390 × 664, an iPhone 13's page with Safari's bars
showing); images `options-abc.jpg` (A, B, B's ⋯, C side by side), `a-tabs-night-en.jpg`, `a-tabs-matinee-tr.jpg`,
`a-tabs-ocean-en.jpg` (option A, every screen).

### Pieces all three options share
- **One input row:** 🔗 Invite · message box · 🎙 · 📷 · 😀. While typing, 🎙 📷 give their place to ➤ (CSS only, as in
  PH1), so the box grows from ~170 px to ~215 px at 390 px wide. 😀 opens the reactions sheet: one row of emojis plus
  🖼 Send an image (the old ＋ "Send an image").
- **The strip under the video:** the faces stack (tap → People sheet: who is here, 👑 host, 🎙, then 🔗 Invite) and the
  video's own controls 📌 Pin · ⏩ Speed · 🔄 Sync · ⏭ Skip (today's ＋ sheet, now one tap). Host-only rooms show
  them disabled, as on the computer. An empty room shows only the faces.
- **The activity feed** is the chat with the room's activity lines shown inline: small avatar, bold name, italic
  muted text ("Alex started …", "Sam joined"). The computer's "Show activity" toggle stays; the phone defaults to on.
- **Nothing over the video.** All of it sits under the player, so YouTube's rule holds.

### Option A (picked by the owner, 13 Nov 2026): bottom tabs 🎬 Room · 🔍 Search · 🎮 Games · 👤 Me
- Preview: `a-tabs-night-en.jpg`. The bar uses the computer's `.tab` look (muted label, the selected one in `--text`
  with a 2 px `--accent` line, on top because the bar is at the bottom), 52 px high plus the safe area.
- **Room:** video · strip · feed · input row. No ⋯ and no ＋ left.
- **Search:** our own results list (thumbnail, title, channel · length, a 44 px ＋ to add; tapping a result offers
  Play now / Add to queue), and under it "Up next" = the queue with "Play the next video automatically". Replaces the
  🔍 button and the "Add a video" sheet of PH1. Pasting a link works in the same box.
- **Games:** the games hall as a list of cards (tables, then "Side games · just you"). A table opens where it does
  today.
- **Me:** our Profile + Settings as one page: big avatar with ✎, name with ✎, then cards with small-caps titles from
  the existing Settings sections ("Room": Save the room ⏻, Room rules ›, Film time ›; "My screen": Flying emojis ⏻,
  Theme ›, Font ›; "Sound & camera"; "About": Help, Move to another device, Who sees what). Every row is a toggle or a
  › with the existing `.d` help line under it. This page is a list, so it may scroll.
- Why a 4th tab: Games is a main feature and today it sits two taps deep in ⋯; with it in the bar the ⋯ sheet goes
  completely. 4 tabs at 390 px are 97 px each, and "Oyunlar", the longest Turkish label, fits.
- Cost: 56 px of height. At 390 × 664 the feed keeps ~270 px; at 360 × 640 ~260 px.

### Option B: today's layout + the one input row
- Preview: `options-abc.jpg`, 2nd and 3rd. No tab bar. The strip keeps ⋯; the ⋯ sheet holds 🔍 Search, 👥 People,
  🎮 Games, 💾 Save the room, ⚙️ Settings, ❓ Help (PH1 rows).
- The smallest change and the most room for the chat (+56 px), but Search, Games and Settings stay two taps away and
  the room still has a "more" sheet, which the owner's example doesn't.

### Option C: hybrid, pages without a bar
- Preview: `options-abc.jpg`, 4th. The strip holds faces · 🔍 · 🎮 · 👤 · ⋯ (⋯ = Pin / Speed / Sync / Skip). 🔍, 🎮 and 👤
  open the same pages as A, full screen with a ← "Back to the room" header.
- Keeps the chat height, but the video's own controls go back behind ⋯, and pages cover the room instead of sitting
  beside it as tabs.

### Sideways and Shorts (all options)
- **Sideways with a video:** the tab bar and the input row hide; the PH1 sideways layout stays (video + a ≥ 200 px side
  column with ⛶ Watch fullscreen, 💬 and 🎙). Turning upright brings the tab you were on back.
- **Shorts upright:** the 9:16 video takes the height between the top and the strip (feed hidden); the strip gains
  💬 with an unread count, which opens the feed as a sheet. The input row and the tab bar stay. Shorts sideways = the
  sideways layout. See `a-tabs-*-shorts` in the sheets.

### What changes against PH1 if A is picked
- The 🔍 button in the chat row, the ＋ sheet, the ⋯ sheet and the "Add a video" sheet go; their items move as above.
- PH1's chat row (😀 · box · 🖼 · 🔍 · ＋) becomes 🔗 · box · 🎙 · 📷 · 😀; 🎙 📷 leave the faces strip for it.
- The empty room's 🔍 Search a video switches to the Search tab; 🔗 Invite stays.
- `roomMoreItems`' phone list becomes the Me page's sections; nothing on the computer changes.

### Notes for lane A (option A)
- Web first: plain markup in the room page, no router; a tab is a `hidden` toggle on four panels, kept in
  `sessionStorage` per room so a reload lands on the same tab. The tab bar is a `role="tablist"` with arrow keys, like
  the computer's tabs.
- New texts: the tab labels (EN Room / Search / Games / Me; TR Oda / Ara / Oyunlar / Ben) and "Up next" / "Sırada";
  the rest exist.
- Search results reuse the existing search call and its thumbnails (no new image host).
- Test Lab hook: open each tab, the reactions sheet and the People sheet at 390 × 664 and 360 × 640, in Night,
  Matinee and Ocean, EN and TR.
