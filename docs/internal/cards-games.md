# Game cards (Game Studio and Game Studio 2)

Part of the card board (`CARDS.md`), split out on 15 Nov 2026 to keep each file small. Same rules as `CARDS.md`:
a finished card moves verbatim to `docs/internal/archive/cards-done.md`. Order: Game Studio: GW5, GMP2;
Game Studio 2 QZ2 → WG2.

## Ready

### GW5. Game frames scale in proportion, with a minimum and maximum size (owner, 17 Nov 2026; Game Studio; "very important")
- Why: making Five Frames narrower wraps its legend ("In the right place / In the word / Not in the word") and
  collapses the head buttons to icons. The owner wants every game to look the same at any size, only bigger or smaller.
- What: every game (side games incl. Snack Bar, Window Garden, Five Frames; every shared table) lays out once at a
  design size and scales as a whole (e.g. a fixed-ratio stage with `transform: scale` or container units), keeping
  its aspect ratio; a resizable frame keeps that ratio while dragged and stops at a minimum (still readable, controls
  ≥ 24 px, 44 px on a phone) and a maximum (the space it gets). No wrapping, no icon-only collapse, no scroll.
- Done when: each game at its minimum, a middle and its maximum size looks the same apart from scale; Test Lab hook
  `games.scaleCheck` (sets the frame to min / mid / max).
- Tests: games harness resizes each frame to min / mid / max and checks the ratio and that no text box wraps
  differently; shots per game at the three sizes; `CLAUDE.md` §6 "no scrolling inside a view" still holds.
- Owner's pick: his message to the Planner (17 Nov 2026).
