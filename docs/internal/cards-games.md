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

### DG2. Draw & Guess: a big canvas, a small side, the results bug (owner, 21 Nov 2026; Game Studio "Draw")
- Bug: when a drawing ends, the results view shrinks the play area to ~10 % (screenshot 21 Nov).
- What: canvas large like draw.io, players list compact, chat readable below or beside; results fit without shrinking.
- Done when: results keep the canvas size; layout at 3 sizes; e2e round with 3 players.

### SB2. Sea Battle: ship themes, drag to place, watch the attacker, a fun sinking (owner, 21 Nov 2026; Game Studio "Sea")
- What: (1) pick a ship theme (2–3 drawn sets, not plain squares); (2) place ships by dragging them straight onto the
  board (snap to the nearest valid spot, rotate with a tap / R); (3) with 3+ players: my own sea big, plus a second
  view that follows the current attacker: whose sea they aim at and where their pointer is (live, throttled); (4)
  when a player's fleet is gone: a short explosion, "ALEX SANK!" in a playful tone, their chip crossed out.
- Done when: all four at 2 and 4 players; e2e; first look; art licence-clean.

### LH4. Last Heart: review, smooth animations, sounds, design (owner, 21 Nov 2026; Game Studio "Last Heart")
- What: a detailed play-through review (bugs, rules, layout at 3 sizes), then fixes; smooth card / chip animations
  and sounds if missing; a nicer table design. Report findings to the Planner before big redesigns.
- Done when: the review file `docs/internal/design/games/last-heart-review.md`, its fixes merged; e2e.
