# Game cards (Game Studio and Game Studio 2)

Part of the card board (`CARDS.md`), split out on 15 Nov 2026 to keep each file small. Same rules as `CARDS.md`:
a finished card moves verbatim to `docs/internal/archive/cards-done.md`. Order: Game Studio: finish #483 (STATUS task queue), then lazy-load `games/stage.ts` (budget step), then GT1;
Game Studio 2 QZ2 → WG2.

## Ready

### GT1. Clearer tutorials and a "❓ How to play" button in every game (owner, 15 Nov 2026; Game Studio, after GMP)
- Why: the first-run tutorials are a little thin; players can't see them again.
- What: each tutorial a little more detailed and plain (EN + TR); "❓ How to play" in each game's menu replays it;
  no scrolling.
- Done when: every game has it; `check-game-text.mjs` green; Test Lab hook `games.tutorial`.
- Tests: games harnesses open the tutorial from the menu; shots at 4 sizes.
- Owner's pick: his message (Planner chat, 15 Nov 2026).

