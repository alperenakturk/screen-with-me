# Game cards (Game Studio and Game Studio 2)

Part of the card board (`CARDS.md`), split out on 15 Nov 2026 to keep each file small. Same rules as `CARDS.md`:
a finished card moves verbatim to `docs/internal/archive/cards-done.md`. Order: Game Studio: XO1;
Game Studio 2 QZ2 → WG2.

## Ready

### XO1. Tic-tac-toe's board fills a sideways tablet's video place (Game Studio proposal, 17 Nov 2026; Game Studio)
- Why: on a sideways tablet the board is only 256 × 256 in a 740 × 653 box (games-sweep "the board is a fair size"; also
  on main, not in CI).
- What: the board grows to the box's height there, like the other boards.
- Done when: games-sweep `tabland` xox passes and runs in CI's tabland row; Test Lab hook `games.open.xox` opens it;
  owner's hand test on a sideways tablet.
- Owner's pick: the Planner's approval (17 Nov 2026).

