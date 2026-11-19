# Game cards (Game Studio and Game Studio 2)

Part of the card board (`CARDS.md`), split out on 15 Nov 2026 to keep each file small. Same rules as `CARDS.md`:
a finished card moves verbatim to `docs/internal/archive/cards-done.md`. Order (19 Nov 2026): Game Studio: GD1 → GPH1;
Game Studio 2: QZ3 → QZ4 → FW1. GPH1 leaves `quiz.ts` / `five-frames.ts` until Game Studio 2 has merged those.

## Ready

### GD1. BUG: games throw players out at random (owner, 19 Nov 2026, "important"; Game Studio, first)
- Why: playing a table with a friend on different devices, one of them is thrown out of the game now and then with no
  message.
- What: find every path that drops a player from a table: the silent game connection (`GHOST_MS`, `ghost.ts`), the
  15 s ping on a background tab / phone sleep / Wi-Fi switch, `openSocket`'s HTTP fallback, the table's seat recovery
  after a reconnect, a table closed by its host, a stale-state reset. Log each drop reason (server and client, no
  personal data) and reproduce with two real browsers on different networks (throttled, one backgrounded). Fix the
  causes; a reconnect within the grace keeps the seat silently; a real removal always shows a plain message saying why.
- Done when: a 20-minute two-browser game per table kind (Classics, Sea Battle, Quiz, Draw & Guess, Last Heart) with
  a backgrounded tab, a 10 s network cut and a phone lock never drops a seat; every removal shows its reason;
  Test Lab scenario `game.drop` (cut, background, ghost) shows the message; an e2e in the `games` job with `GameSocket`.
- Tests: `ghost` unit tests, the new e2e, owner's hand test with a friend (B 10–14).
- Owner's pick: none needed.

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

### QZ4. Quiz: many more questions, kinds and topics, with easy / medium / hard (owner, 19 Nov 2026; Game Studio 2)
- Why: the owner wants a lot more variety.
- What: more topics and question kinds (e.g. true / false, which came first, odd one out, picture-free "guess the
  year"), every question tagged easy / medium / hard; a level choice in the lobby (Mixed by default); at least
  ~3× today's question count, EN + TR, facts checked, nothing about specific films or series (public-text rule).
  Keep the question data in a lazy chunk; mind `scripts/size-budget.mjs`.
- Done when: the lobby offers the level; each topic has questions at every level; `check-game-text.mjs` passes;
  Test Lab hook `quiz.level`; a unit test that every question has a level, a topic and both languages.
- Tests: unit + `games` e2e; owner's hand test.
- Owner's pick: none needed.

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
