# Game cards (Game Studio and Game Studio 2)

Part of the card board (`CARDS.md`), split out on 15 Nov 2026 to keep each file small. Same rules as `CARDS.md`:
a finished card moves verbatim to `docs/internal/archive/cards-done.md`. Order (21 Nov 2026): one Game Studio session per game: GFIT1 (stage + Classics) first, then DG2, SB2, FW2, QZ5,
LH4 in parallel, each only in its own game's files (the stage and shared lobby CSS belong to GFIT1).

## Ready

Every game card below shares these rules (owner, 21 Nov 2026): a table always opens in the video's place first (free
window only when the player picks it); in the video's place the game itself fills the space: the side column (players,
chat, menus) stays narrow and the board / play area is as large as it can be, centred and balanced when its shape
leaves room; check at 1366, 1920 and a phone. Each card: Test Lab hook, harness / e2e, first look, EN + TR.

### GFIT1. Games open in the video's place and fill it; Classics (owner, 21 Nov 2026; Game Studio "Classics", first)
- Why: "in every game the right column is too wide and the game too narrow"; 99 % of players play in the video's place.
- What: the shared stage rule above (`stage.ts`, shared lobby / side column CSS: one narrow side width for all
  games), always open in the video's place; then Classics (chess, dama, backgammon, reversi, XOX, Four) fills it.
- Done when: every table opens in the video's place; Classics' board is the biggest square that fits; sweep shots.

### SB2. Sea Battle: ship themes, drag to place, watch the attacker, a fun sinking (owner, 21 Nov 2026; Game Studio "Sea")
- What: (1) pick a ship theme (2–3 drawn sets, not plain squares); (2) place ships by dragging them straight onto the
  board (snap to the nearest valid spot, rotate with a tap / R); (3) with 3+ players: my own sea big, plus a second
  view that follows the current attacker: whose sea they aim at and where their pointer is (live, throttled); (4)
  when a player's fleet is gone: a short explosion, "ALEX SANK!" in a playful tone, their chip crossed out.
- Done when: all four at 2 and 4 players; e2e; first look; art licence-clean.

### FW2. Five Frames Duel / co-op: timer, points, levels, more words (owner, 21 Nov 2026; Game Studio "Five Frames")
- Bug: two players both showed "2nd" though one finished first.
- What: (1) a time limit chosen when the table opens; time up = out; (2) points: first to solve +3, plus 7 → 1 by the
  guess it took (1st guess 7 … 7th guess 1); (3) my own board big, the others smaller; (4) difficulty Easy / Medium
  (recommended, default) / Hard / Mixed for daily, categories and Duel: odd words like a root form ("Fırat" refused,
  odd roots asked) go to Hard or out; (5) research more word lists (names, cities …) and add only what the game
  accepts; the "?" explains what kinds of words are not used.
- Done when: ranking bug fixed with a test; timer and points server-checked; levels; e2e with 3 players.

### QZ5. Quiz: no true / false, "closest guess" numbers, a guess round (owner, 21 Nov 2026; Game Studio "Quiz")
- What: (1) remove true / false questions; turn the good ones into normal multiple-choice; (2) replace typed answers
  with numeric "closest guess" questions (years, amounts, calculations by topic); no first-answer bonus; ×2, 50:50 and
  second chance don't work on them; in the classic game 1–3 of them by game length; (3) Tournament: after every
  topic round, a 5-question closest-guess finale, no jokers: closest 200, next 100, third 50, others 0 (2 players:
  200 / 0; 3 players: 200 / 100 / 0); (4) more fun topics (films and series without naming specific pirated titles,
  games, travel …).
- Done when: no true / false left (test); closest scoring unit-tested; finale e2e; texts EN + TR.

### LH4. Last Heart: review, smooth animations, sounds, design (owner, 21 Nov 2026; Game Studio "Last Heart")
- What: a detailed play-through review (bugs, rules, layout at 3 sizes), then fixes; smooth card / chip animations
  and sounds if missing; a nicer table design. Report findings to the Planner before big redesigns.
- Done when: the review file `docs/internal/design/games/last-heart-review.md`, its fixes merged; e2e.
