# Game cards (Game Studio and Game Studio 2)

Part of the card board (`CARDS.md`), split out on 15 Nov 2026 to keep each file small. Same rules as `CARDS.md`:
a finished card moves verbatim to `docs/internal/archive/cards-done.md`. Order (19 Nov 2026): Game Studio: GD1 → GPH1;
Game Studio 2: QZ3 → QZ4 → FW1 (all done). GPH1 may now take `quiz.ts` / `five-frames.ts`.

## Ready

### GPH1. Games on phones: proportions, taps and type fixed for good (owner, 19 Nov 2026; Game Studio, after GD1)
- Why: the owner says the games' UI on a phone is very bad: wrong proportions, tapping problems, text that shifts,
  blocks that overlap.
- What: every table and side game on a phone upright and sideways (iPhone SE, a mid Android, a big phone): take
  screenshots yourself (`scripts/shots.cjs`, games sweep), compare, and fix: nothing overlaps, no text jumps size,
  every control ≥ 44 px and tappable, the game fits its space without scrolling (CLAUDE.md §6). A fresh subagent
  reviews the shots (QA1) before the PR.
- Done when: the games sweep at phone sizes shows no overlap or cut text for every game; tap-target check passes;
  Test Lab hook `games.phoneSweep`; the shots are in the PR.
- Tests: games sweep harness in the `games` job; owner's hand test on his phone.
- Owner's pick: none needed.
