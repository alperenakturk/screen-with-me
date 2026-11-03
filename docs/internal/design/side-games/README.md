# Side games: art sources (Snack Bar, Window Garden, word game) + game covers

_Design session, 3 Nov 2026. These are the owner's picks on the side-games page
(https://claude.ai/artifact/WSxxSneo6NT5Y5JcVKXxLi): **Snack Bar A "counter scene"**, **Window Garden A "window
sill"**, **word game board A "ticket row"**; the word game is named **Five Frames** (TR "Beş Kare"). The 🎮 games gallery covers and its
window layout are on https://claude.ai/artifact/XsUvwg9YL6KugDVP6VggMR (layout pick pending). Brand rules (colours,
Glowbeam shapes): `../logo-sidelit.md`._

All files are hand-written SVG, no fonts embedded except the "SNACK BAR" sign and ticket letters (they ask for
`Bricolage Grotesque` and fall back to sans-serif; the game can draw that text in HTML instead). Every id inside a file
is local; when you inline several copies in one page, prefix the ids (as `logo.ts` does with a counter).

## Palette (same as the logo)
| Use | Hex |
|---|---|
| Night surfaces | `#08061a`, `#14102b`, `#1d1740`, `#2a2257` |
| Light / accents | cream `#fff3d6`, gold `#ffc65a`, amber `#ff8f3a`, coral `#ff8a7a` |
| Ink (eyes, text on gold) | `#1a1036` |
| Muted text | `#a79fc4` |
| Garden | leaf `#4fbf8f` / `#6fd3a5`, cactus `#3fa37e`, pot `#c46a3a` / rim `#d98250`, sill wood `#5b3c28` |
| Counter wood | `#7a4a2c` → `#3e2418` |

## Snack Bar (`snack-bar/`)
- `counter-scene.svg` (340 × 110): the scene at the top of the game. Every part is a named group so the game shows
  only what the player owns: `#wall`, `#side-light`, `#sign`, `#popcorn-machine`, `#soda`, `#nachos`, `#candy`,
  `#cashier` (Glowbeam with a cap), `#counter-top`. Hide a group with `display:none` until its upgrade is bought; the
  window shows the scene 56 px tall (`preserveAspectRatio="xMidYMid slice"`), the phone 108 px.
- `items/*.svg` (64 × 64): upgrade icons, also used in the list rows (30 px) and the gallery cover: `popcorn`,
  `soda`, `nachos`, `candy`, `second-counter`, `popcorn-machine`, `coin` (the currency; also as a 14 px inline icon).
- Layout (from the picked mock, free window 340 × 300 / phone sheet 360 × 460, no scrolling): header (coins total
  in Bricolage 800, "+9.5/s", "▶ playing" pill, "Together +20 %" teal pill) → scene → upgrade rows (icon, name, level
  + rate, level bar cream → gold, a gold price button; dimmed `rgba(255,255,255,.08)` when unaffordable) → footer
  ("Cinema #1 · ★ 0" + outlined "🎬 Open a new cinema"). The small window shows the 3 most useful upgrades and
  "+2 more when bigger"; the phone shows all 5.

## Glowbeam poses (`mascot/`, 64 × 64)
`glowbeam-default`, `-happy` (a purchase, a plant found, the word solved), `-waiting` (the film is paused, so no
income), `-wow` (a new cinema, a rare seed), `-watching` (eyes to the left, while the film plays), `-cashier` (default
+ a coral cap, the Snack Bar's cashier). Only eyes and mouth change between poses; the body never does.

## Window Garden (`garden/`)
- `window-sill.svg` (340 × 226): the scene. Groups `#room`, `#window`, `#moon`, `#city-lights`, `#side-light`, `#sill`,
  `#pot-1` … `#pot-3` (the pot slots sit at 26 %, 50 %, 74 % of the width on the sill line, `y = H − 72`). The phone
  uses the same scene 296 px tall plus an "Album · last found" strip of five 34 × 44 potted thumbnails (not-found ones
  greyed: `opacity .35; filter: grayscale(1)`).
- `plants/*.svg`: each plant already in its pot, viewBox `-24 -48 48 70` (the soil line is y = 0): `fern`, `sunbell`,
  `lantern-cactus`, `mint`, `moonbloom`, `reel-vine`, `popcorn-shrub`, `night-tulip` (8 for the first album; the album
  can show a locked silhouette for the rest), plus growth stages `stage-seed` and `stage-sprout` (every plant passes
  seed → sprout → grown). `pot.svg` is the pot alone. `plants-sheet.svg` previews them all.
- A thirsty plant gets a 💧 above it; "Water" is the main (gold) button; the album count and seeds sit in the bar.

## Five Frames (word game): ticket row (`word/ticket-row.svg`, 320 × 52 + notches)
One guess = one ticket: a numbered stub (26 px) left of a dashed tear line with two round notches, then 5 letter cells.
- ✓ right place: gold `#ffc65a` filled cell, ink letter, small ✓ top right.
- • in the word, wrong place: 2.5 px gold outline, gold letter, small • top right.
- not in the word: no cell, letter cream at 30 %.
- the row being typed: a 1.5 px cream (45 %) outline around the ticket; empty future rows at 35 % opacity.
- 7 rows; the letter tray is alphabetical (10 per row, ⌫ and a gold Enter at the end), never a QWERTY strip; Turkish
  adds Ç Ğ I İ Ö Ş Ü. No green / yellow anywhere (see `research/word-game.md`).
In HTML this is easiest as CSS (the mock used a grid `26px repeat(5, 1fr)`, height 34 px, radius 7 px, notches as
`::before` / `::after` circles in the window's background colour); the SVG is the reference.

## Game covers (`covers/*.svg`, 320 × 200, shown at 160 × 100 and down to 96 × 60)
`xox`, `four`, `draw`, `quiz`, `snack-bar`, `garden`, `word` (Five Frames / Beş Kare). Same world: night gradient, warm light from the left,
Glowbeam in most of them. Titles and the "Together · 2 players" / "On the side · just you" line are HTML under the
cover, never inside the image (so they translate). Use them in the 🎮 gallery window once the owner picks its layout.
