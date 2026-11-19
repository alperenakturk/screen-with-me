# Game cards (Game Studio and Game Studio 2)

Part of the card board (`CARDS.md`), split out on 15 Nov 2026 to keep each file small. Same rules as `CARDS.md`:
a finished card moves verbatim to `docs/internal/archive/cards-done.md`. Order (19 Nov 2026): Game Studio: GD1 → GPH1;
Game Studio 2: QZ3 → QZ4 → FW1. GPH1 leaves `quiz.ts` / `five-frames.ts` until Game Studio 2 has merged those.

## Ready

### QZ3. Quiz: a real ×2 joker (owner, 19 Nov 2026, "important"; Game Studio 2, first)
- Why: the owner finds ×2 "Double" useless as it is (played before you know the answer).
- What (owner confirmed, 19 Nov 2026): ×2 can be pressed **after
  picking an answer**, until the answer is shown: "give me double points for this question". Pressed before picking,
  it still works but the press costs answer time and loses the first-answer bonus. Once per game, like now. ½ and ↺
  stay unless the Planner says otherwise. Server-checked (`apps/server/src/quiz.ts`), rules text and How to play in
  EN + TR.
- Done when: ×2 after an answer doubles that question's points for a right answer (0 for a wrong one, no penalty);
  before an answer it costs the bonus; Test Lab hook `quiz.joker.double`; server unit test; e2e step in `games`.
- Tests: unit + e2e; owner's hand test.
- Owner's pick: "Cevaptan sonra" (Planner chat, 19 Nov 2026).

### FW1. Five Frames: real words only, plus the missing categories (owner, 19 Nov 2026; Game Studio 2, after QZ4)
- Why: Five Frames accepts odd non-words, and categories such as country and city names are missing.
- What: clean the answer and accepted-guess lists (EN and TR) to common real words; add categories (countries,
  cities, and others a player would expect: animals, food, …) as word lists by category, with the category shown
  as a hint; a guess must be a real word of the language (or of the category's list).
- Done when: no non-word in the answer lists (a check script over the lists); each new category has enough answers
  for weeks of play in both languages; Test Lab hook `fiveFrames.category`; unit tests.
- Tests: unit + list check; owner's hand test.
- Owner's pick: none needed.

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
