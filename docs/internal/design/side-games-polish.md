# Side games polish (card GP, for lane B)

_Design session, 3 Nov 2026. Owner: Snack Bar, Window Garden and Five Frames should be "sweeter and more polished".
Measured on `main` (4262ee3) served locally, Chromium 1366×768, English. Pictures for the "How to play" cards:
`side-games/tutorial/*.svg` (320 × 180). Build reference with the cards, the new Five Frames board and the flip:
`side-games/polish-preview.html` (also published: https://claude.ai/artifact/T5JroYsuzRgsB5ZEvPxeQ1). No owner pick needed: everything below follows the
owner's notes and the brand._

## What is wrong today
| Game | Opens at | Measured | Problem |
|---|---|---|---|
| Snack Bar | 360 × 380 | content needs ≈ 530 px tall, so `refit` scales it to **0.68** | 13 px text shows as **8.8 px**, 11 px as 7.5 px; the scene band is a 64 px strip that clips Glowbeam; empty space under the rows |
| Window Garden | 360 × 400 | fit 1.0 | labels and hints 11–13 px; the action text is cut with "…" |
| Five Frames | 360 × 500 | fit 1.0 | letters 15 px, row numbers 11 px, credits 10 px; a dark empty band between the board and the tray; gold fill vs gold outline is hard to tell apart |
| All three | — | — | the window head cuts the title ("Snack …", "Windo…", "Five Fr…"): its five 48 px buttons take 260 of 360 px |

## 1. Type scale (all three games, sizes at the game's own size, zoom 1)
| Role | Now | New |
|---|---|---|
| Running text, names, action titles | 12.5–13 px | **15 px**, line-height 1.35 |
| Short labels (level, counter, row number, credits, pills) | 10–11 px | **13 px**, never smaller |
| Buttons | 11–13 px | **15 px** bold, ≥ 40 px tall (44 px on touch) |
| Headline numbers (coins) | 21 px | 24 px |
| Five Frames letters in cells | 15 px | 22 px bold |
| Five Frames tray keys | 13 px | 17 px (⌫ / Enter 15 px bold) |

The muted colour gets lighter with the bigger text: `#b9b0dc` (was `#a79fc4`; 8.3:1 on the panel). Rule for the
harness: no visible text renders below 13 px **after** the window's `--fit` scale.

## 2. Ideal window size (`SOLO_CATALOG` in `packages/shared/src/games/catalog.ts`)
| Game | `size` now → new | `fit` now → new | Phone sheet (390 × 844) |
|---|---|---|---|
| `snack` | 360×380 → **400×560** | 330×330 → **380×520** | full width, ≈ 600 px tall, no inner scroll |
| `garden` | 360×400 → **400×540** | 330×350 → **380×500** | full width, ≈ 560 px |
| `word` | 360×500 → **400×620** | 320×440 → **380×580** | full width, ≈ 640 px |

Rule: a game opened at its own size has `--fit` = 1 at 1366×768 and 1920×1080 (the room area shrinks the whole window
when the screen is smaller, as today, never the text alone).

**Window head:** for solo games below 440 px wide, the head's buttons are 36 px with a 4 px gap (5 × 36 + 16 = 196 px),
so the icon + full title get ≥ 170 px; the title never ellipsises at the game's own size.

## 3. Layout per game
**🍿 Snack Bar**
- Scene band 120 px tall (the whole counter and Glowbeam show), coins 24 px with "+4/s" 15 px beside them, the
  "Paused / Playing" pill 13 px.
- Stand rows 52 px: icon 32 px, name 15 px bold, "Lv 3 · +4/s" 13 px, a 4 px progress bar to the next milestone
  (levels 10 / 25 / 50 / 100 / 200 double a stand), price button 15 px bold, at least 72 × 40.
- All five rows show at its own size (no "N more" line); locked rows keep 0.5 opacity with "Opens with …" at 13 px.
- Footer: "Cinema #1 · ★ 0" 13 px, "Open a new cinema" button 15 px.

**🌱 Window Garden**
- Scene keeps its 340 × 226 shape, scaled to the window's width (≈ 368 × 245).
- Action bar 64 px: title 15 px bold, hint 13 px (two lines allowed, no ellipsis), button 15 px bold, 40 px tall.
- Album strip: 8 thumbnails 40 px, "3 / 8" 13 px. Pills ("Resting", "Album") 13 px.

**🎟️ Five Frames**
- Seven ticket rows, cells 46 × 46 with 6 px gaps, the stub 30 px wide with its number at 13 px; the tear line stays.
- The legend (section 4) sits between the board and the tray; the empty band goes.
- Tray: keys 34 × 44 (Turkish, 11 a row: 31 × 44), letters 17 px; ⌫ and Enter / Tamam 15 px bold.
- Result line 15 px; "Copy result" button 15 px; "About the word lists" link 13 px under the tray.

## 4. Five Frames: colours, marks, legend and the flip
**Our shades** (marks stay for colour-blind players):
| State | Fill | Text | Mark | Contrast |
|---|---|---|---|---|
| Right place | green `#3fcf8e` (`--ff-hit`) | ink `#1a1036` | ✓ top right, 11 px | 9.0:1 |
| In the word, wrong place | gold `#ffc65a` (`--ff-near`) | ink | • top right | 11.5:1 |
| Not in the word | grey `#3a3458` (`--ff-miss`) | `#cfc8ea` | none | 7.2:1 |
| Typed, not sent | `#2a2350` + 2 px `#ffffff55` border | cream | — | 13.1:1 |
| Empty | `#ffffff0a` + 1.5 px `#ffffff1a` border | — | — | — |

Tray keys take the best state seen for their letter (right place > in the word > not in it).

**Legend** (one row, 22 px swatches, 13 px labels): [A ✓ green] "Right place" · [L • gold] "In the word" ·
[P grey] "Not in the word" / TR "Doğru yerde" · "Kelimede var" · "Kelimede yok". Always shown until the first guess
is scored, then folded behind the "?" button.

**Flip after Enter:** cell by cell, left to right. Each cell turns `rotateX` 0 → 90° in 110 ms (ease-in), takes its
colour and mark at 90°, turns 90 → 0° in 110 ms (ease-out); the next cell starts 80 ms after the one before, so five
letters take ≈ 540 ms. The tray keys change after the last cell. A solved row then hops (each cell `translateY(-6px)`
and back, 120 ms, 60 ms apart). An unknown word: the row shakes (±6 px, three times, 300 ms) and nothing is used.
Typing is held during the flip. **Reduced motion:** no turn, hop or shake; colours cross-fade in 150 ms; an unknown word
gets a red outline for 600 ms.

## 5. "How to play" cards
- Shown the first time each game opens (`snackBar:howSeen`, `windowGarden:howSeen`, `fiveFrames:howSeen`) and from a
  "?" button in the game's own top bar. A layer over the game, same size as the game: picture (320 × 180, scaled to the
  game's width − 32 px), title 17 px bold, one line 15 px, dots, "Next" / last "Let's play" ("İleri" / "Hadi
  oynayalım"); ✕ and Esc skip; ← / → and Enter work while it has the focus. The game keeps ticking behind it.
- The pictures carry no words (only numbers and symbols), so one set serves both languages.

| Game | Picture | Title EN · TR | Line EN · TR |
|---|---|---|---|
| Snack Bar | `snack-1-earn` | Earn while the room watches · Oda izlerken kazan | Your snack bar makes coins while the room's video plays. · Odanın videosu oynarken büfen para kazanır. |
| | `snack-2-tap` | Tap to serve · Dokun, servis yap | Tap the counter for an extra coin. · Fazladan bir jeton için tezgâha dokun. |
| | `snack-3-stands` | Buy and level up stands · Stant al, seviye atlat | Levels 10, 25, 50, 100 and 200 double a stand. · 10, 25, 50, 100 ve 200. seviyeler standı iki katına çıkarır. |
| | `snack-4-friends` | Friends make it faster · Arkadaşlar hızlandırır | +10% for each person in the room, +5% for each one in voice with you. · Odadaki her kişi %10, seste seninle olan her kişi %5 ekler. |
| Window Garden | `garden-1-plant` | Plant a seed · Tohum ek | Pick a pot and plant one of your seeds. · Bir saksı seç, tohumlarından birini ek. |
| | `garden-2-water` | Water it, then watch · Sula, sonra izle | Plants grow while the room's video plays. Water them when you see 💧. · Bitkiler odanın videosu oynarken büyür. 💧 görünce sula. |
| | `garden-3-album` | Pick the flower · Çiçeği topla | Every bloom goes into your album. Find all 8 plants. · Her çiçek albümüne girer. 8 bitkinin hepsini bul. |
| | `garden-4-film` | Films give seeds · Filmler tohum verir | Watch a film of 20 minutes or more to the end for a new seed. · 20 dakikalık ya da daha uzun bir filmi sonuna kadar izle, yeni tohum kazan. |
| Five Frames | `word-1-guess` | Guess the five-letter word · Beş harfli kelimeyi bul | Type a word and press Enter. · Bir kelime yaz ve Tamam'a bas. |
| | `word-2-colours` | Colours help · Renkler yol gösterir | Green ✓ right place, yellow • in the word, grey not in it. · Yeşil ✓ doğru yerde, sarı • kelimede var, gri kelimede yok. |
| | `word-3-daily` | Seven tries, one word a day · Yedi hak, günde bir kelime | Everyone gets the same word; a new one every day. · Herkese aynı kelime; her gün yenisi. |

The texts live in each game's own `TEXT` (the room page's JS budget is nearly full); the pictures are inlined with
unique ids like the other game art.

## Tests for the card
Per game, at 1366×768 and 1920×1080: `--fit` = 1 when it opens; no visible text below 13 px after the scale; the
window head shows the full title; at 390×844 the sheet has no inner scrollbar. "How to play": shows on the first open,
not on the second, "?" brings it back, Esc closes it, the game keeps ticking. Five Frames: after Enter the cells get
their state one by one in order (≈ 540 ms in all), the tray changes after the last; with reduced motion no transform
animation runs; the legend shows the three states with their labels in EN and TR.
