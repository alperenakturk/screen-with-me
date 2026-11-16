# Game cards (Game Studio and Game Studio 2)

Part of the card board (`CARDS.md`), split out on 15 Nov 2026 to keep each file small. Same rules as `CARDS.md`:
a finished card moves verbatim to `docs/internal/archive/cards-done.md`. Order: Game Studio GT1;
Game Studio 2 QZ2 → WG2.

## Ready

### GT1. Clearer tutorials and a "❓ How to play" button in every game (owner, 15 Nov 2026; Game Studio, after GMP)
- Why: the first-run tutorials are a little thin; players can't see them again.
- What: each tutorial a little more detailed and plain (EN + TR); "❓ How to play" in each game's menu replays it;
  no scrolling.
- Done when: every game has it; `check-game-text.mjs` green; Test Lab hook `games.tutorial`.
- Tests: games harnesses open the tutorial from the menu; shots at 4 sizes.
- Owner's pick: his message (Planner chat, 15 Nov 2026).

### QZ2. Quiz: more and harder questions, typed answers, a tournament, more jokers (owner, 15 Nov 2026; Game Studio 2)
- Why: the owner wants more variety and more fun; an answer sometimes needs two clicks.
- What:
  - **Fix first:** an answer registers on the first click / tap.
  - **Questions:** +50 % more questions, new categories, more hard ones; a hard question gives a bigger bonus. Some
    typed-answer questions (forgiving: case, accents, one small typo). All written by us (no copied question banks).
  - **Tournament mode:** each player picks a category in turn, everyone answers; the winner has the most round wins,
    a tie goes to points.
  - **More jokers** (e.g. 50:50, skip, extra time, double points), few per game. EN + TR (`check-game-text.mjs`).
- Done when: the above live; the server validates typed answers and jokers; Test Lab hook `quiz.tournament`.
- Tests: quiz server unit tests (scoring, tie rule, typed match), `GameSocket` e2e with 3 players, harness.
- Owner's pick: his message (Planner chat, 15 Nov 2026).

### WG2. Window Garden: steady buttons, a few simple new things (owner, 15 Nov 2026; Game Studio 2, after QZ2)
- Why: when texts change, buttons jump; the owner wants the garden nicer to play.
- What: no layout shift (fixed widths, reserved lines, tabular numbers); simple additions: backgrounds to pick, small
  customisations (pots, colours), one or two light mechanics.
- Done when: no button moves while playing (a layout-shift check); the additions live; Test Lab hook `garden.decor`.
- Tests: the window-garden harness with a layout-shift measure; shots.
- Owner's pick: his message (Planner chat, 15 Nov 2026).
