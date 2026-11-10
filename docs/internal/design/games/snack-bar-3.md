# Snack Bar 3: economy and look (card SB3)

Owner, 10 Nov 2026: "make the games that don't look professional, professional"; Snack Bar should have "different
features, backgrounds, pictures, maybe a new theme … proper logic and maths like other clicker games, right now it's a
bit silly". This note is the economy's design and the proof that it is balanced. The rules live in
`packages/shared/src/games/snack-bar.ts` (`SNACK_VERSION = 2`), the page in `apps/web/src/games/snack-bar.ts`, the
balance check in `scripts/snack-sim.mjs`.

The old rules stay: the game moves only in a room while the film plays; text ≥ 13 px; it fits its window without
scrollbars.

## What was wrong with version 1

- Five stands, each level the same price growth (×1.15), so the newest stand was always the best buy: "buy the top
  one" was the whole game.
- No upgrades besides levels; nothing to plan.
- Prestige (`sqrt`) was reached in minutes and the stars then ran away.

## The economy (version 2)

**Eight stands**, each about 25× the price and 8× the income of the one before, and each with its own price growth:

| stand | first level | growth per level | coins/s per level | first-level payback |
|---|---|---|---|---|
| 🍿 popcorn | 10 | 1.08 | 0.5 | 20 s |
| 🥤 soda | 250 | 1.09 | 4 | 1 min |
| 🌮 nachos | 6 000 | 1.10 | 32 | 3 min |
| 🍬 candy | 150 000 | 1.11 | 250 | 10 min |
| 🛎️ second counter | 4 M | 1.12 | 2 000 | 33 min |
| 🌭 hot dog grill (new) | 100 M | 1.13 | 16 000 | 1 h 44 min |
| 🍦 ice cream (new) | 2.5 B | 1.14 | 130 000 | 5 h 20 min |
| 🕹️ arcade (new) | 60 B | 1.15 | 1 M | 16 h 40 min |

Level *L* of a stand costs `cost · growth^L`; *n* levels at once cost `cost · growth^L · (growth^n − 1)/(growth − 1)`
(the ×1 / ×10 / Max buttons). The cheap stands grow slowly, so they stay worth a level long after a new stand opens;
the dear ones grow fast, so they can't be pushed to the top.

On top of the levels:

- **Milestones:** a stand's income doubles at levels 10, 25, 50, 100, 200, 300 and 400.
- **Recipes:** three per stand (24), each ×2 for that stand. One opens at level 5 / 25 / 75 and after the one before;
  its price is 30× / 1 200× / 90 000× the stand's first-level price. A recipe is the best buy right after it opens, then
  levels win again.
- **The menu:** +10 % for every stand at level 25 or more (a reason to bring the old stands up).
- **Staff** (kept over every cinema): 💰 tip box (a counter tap is worth 2 s of income, not 1), 🧑‍💼 usher (serves a
  customer who waited 8 s), 📢 long line (customers come twice as often), 👔 manager (a served customer pays 10 s of
  income more). 400 / 6 000 / 80 000 / 1.5 M coins.
- **Today's special:** one stand a day (a hash of the UTC day) earns ×2, tagged "⭐ ×2 today" on its row.
- **New cinema (prestige):** opens from 100 B earned in this cinema; stars = ⌊∛(earned / 6.4 M)⌋, each +2 % income.
  The cube root keeps late stars from running away. Levels, coins and recipes go; staff, badges, decorations and stars
  stay.
- **Places** cycle in order: lobby, drive-in (soda ×2), rooftop (+25 % at night), art house (candy ×3 income, ×2 price),
  **seaside** (new: a served customer pays 2× the time), **planetarium** (new: +25 % while you watch alone).

## The simulation

`node --experimental-strip-types scripts/snack-sim.mjs` plays the real rules for 2, 10 and 50 hours of film. The
model: the film plays the whole time, alone (no together bonus, no tip jar, no special); a customer comes every 40 s
(20 s with the long line); a film's receipt every 2 h. Two players: **idle** (serves no customer, never taps; only the
usher serves) and **active** (serves 80 % of the customers, taps 0.3 times a second). Strategies:

- **best:** buys whatever pays back first (`max(0, cost − coins)/income + cost/gain`), stands, recipes and staff alike;
- **stands only:** the same, but never a recipe or staff;
- **newest stand:** always levels the newest stand it can (version 1's habit);
- **even levels:** keeps every open stand at the same level;
- **cheapest:** always the cheapest purchase.

All of them open a new cinema once it at least doubles their stars.

### Idle player

| strategy | earned in 2 h | earned in 10 h | earned in 50 h | stars at 50 h | first new cinema |
|---|---|---|---|---|---|
| best | 26.75 B | 2.61 T | 2.91e16 | 1600 | 3 h 05 min |
| stands only | 1.03 B | 91.11 B | 19.73 T | 200 | 10 h 15 min |
| newest stand | 573.4 K | 45.06 M | 2.46 B | 0 | — |
| even levels | 98.16 M | 9.21 B | 373.76 B | 50 | 23 h 28 min |
| cheapest | 6.40 B | 208.04 B | 554.61 T | 800 | 5 h 47 min |

### Active player

| strategy | earned in 2 h | earned in 10 h | earned in 50 h | stars at 50 h | first new cinema |
|---|---|---|---|---|---|
| best | 84.67 B | 18.75 T | 1.14e17 | 3200 | 2 h 06 min |
| stands only | 2.99 B | 136.20 B | 292.98 T | 400 | 6 h 55 min |
| newest stand | 1.63 M | 87.61 M | 15.57 B | 0 | — |
| even levels | 301.97 M | 26.29 B | 1.76 T | 100 | 15 h 48 min |
| cheapest | 19.62 B | 1.00 T | 3.76e15 | 1600 | 3 h 58 min |

### What the best play buys (active)

| window | purchases | by kind | top stands bought |
|---|---|---|---|
| 0–2 h | 579 | stand 561, recipe 14, staff 4 | popcorn 160, soda 130, nachos 106, candy 73, second counter 56 |
| 2–10 h | 2 726 | stand 2 658, recipe 68 | popcorn 689, soda 576, nachos 469, candy 352, second counter 260 |
| 10–50 h | 4 834 | stand 4 740, recipe 94 | popcorn 1 017, soda 858, nachos 701, candy 607, second counter 507 |

New cinemas of the best active play: 2 h 06, 3 h 22, 5 h 10, 8 h 05, 11 h 17, 15 h 26, 22 h 37, 34 h 46.

### What the numbers say

- **No single habit wins.** "Newest stand" (version 1's best) is now the worst by far: about 200 000× behind the best
  play in 10 h. The best play buys every stand all the time (the cheap ones most often), plus recipes and staff.
- **Recipes and staff matter:** without them ("stands only") the idle player earns 29× less in 10 h and opens the first
  new cinema 7 hours later.
- **"Cheapest" is a fair simple habit** (within 3–20× of the best), so a player who just taps the cheapest price still
  gets somewhere; looking at the payback is what makes it fast.
- **The first new cinema comes after about one film** for an active player (2 h 06) and about one and a half for an
  idle one (3 h 05); then the gaps grow (1 h 16, 1 h 48, 2 h 55 …), the usual idle-game rhythm.

`--check` (CI, the `checks` job, ~5 s) fails when one of these breaks: the best play beats "newest stand" by ≥ 1.5× and
"stands only" by ≥ 1.2× in 10 h, it buys every stand it opened, and the first new cinema opens between 1.5 h and 6 h
(active) or within 10 h (idle). Run it again after any change to the numbers.

## Version 1 saves (never lose progress)

`loadSnack` reads both versions. A version 1 save keeps every level, coin, badge, decoration and the place; stars are
converted ×2.5, rounded up (a v1 star was +5 %, a v2 star is +2 %), so the star bonus never drops. Every stand earns at
least what it did in version 1 at the same level (no rate went down; a unit test checks each
stand). Recipes and staff start empty.

## The look

- **Counter scene redrawn** (`apps/web/src/games/art/snack-bar/counter-scene.svg`, own SVG art): a wall gradient with a
  diamond pattern, a gold crown line, wainscot panels, a framed sign and a red-and-cream striped counter front. The hot
  dog grill, ice cream cart and arcade cabinet appear on the counter as they open.
- **Three new stand icons** (`hotdog.svg`, `ice-cream.svg`, `arcade.svg`, 64×64, the game's palette).
- **Backdrops for the two new places** (seaside with sea and sun, planetarium with a dome of stars).
- **More customers:** skin tones, glasses, headphones and party hats, more colours.
- **The buy bar:** ×1 / ×10 / Max (remembered), each price for the chosen amount; "📋 Upgrades" opens the recipes and
  staff, with a dot when one is affordable.
- **Rows fit the window:** the open stands plus the next locked one; when there are more than fit, the newest show and
  the rest is "+N more" (computed in real pixels, so the phone's scaled window counts right).

## NG2 (0.9.97.104, owner's picks 8: 1–4)

- **A shop front per place:** the panel, the back wall, the shelf, the counter and its stripes take the place's
  colours (lobby purple and red, drive-in night blue and orange, rooftop indigo and gold, art house burgundy and brass,
  seaside teal with sand-wood and blue, planetarium midnight with lilac).
- **Seasonal stands:** one a week in turn (Monday to Sunday, UTC): ☕ hot cocoa, 🍋 lemonade, 🍭 cotton candy, 🍎
  caramel apples. It sits on top of "📋 Upgrades": up to level 10, each level +5 % on the whole income while its week
  lasts; a level costs a minute of the income now (at least 50 coins), ×1.5 a level, so level 1 pays back in about
  20 minutes of film and the top levels are a long-film goal. Level 5 earns that stand's badge (+1 %, kept for good).
  When the week ends the stand leaves (its levels go; nothing else changes). A real calendar season was not used:
  it would be wrong for half the world and a stand would wait three months.
- **The manager's report** on each film's receipt (instead of "Best stand"): the three best-selling stands with their
  share, and "Buy next": the purchase that pays itself back the fastest now (a stand's next level, an open recipe or
  the seasonal stand), with its price.
- **A sound per stand** when it reaches a milestone: popcorn pops, soda fizz, nachos crunch, candy chime, the second
  counter's bell, the hot dog's sizzle, an ice cream scoop, an arcade bleep (game family B, the shared sound settings
  and mute apply).
- Saves carry over: `season` is a new optional field (an old save loads with none); version stays 2.

## Ideas for later (owner's pick)

- (Taken in NG2: shop fronts, seasonal stands, the manager's report, a sound per stand.)
