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

No real choice is left for the owner: rows vs tiles was the only one, and rows win on every measure the card names
(same language as the computer, fewer rules, no wrapping in Turkish).

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
