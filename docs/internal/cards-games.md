# Game cards (Game Studio and Game Studio 2)

Part of the card board (`CARDS.md`), split out on 15 Nov 2026 to keep each file small. Same rules as `CARDS.md`:
a finished card moves verbatim to `docs/internal/archive/cards-done.md`. Order: Game Studio GW2 + GP1 → GMP (b) → GT1;
Game Studio 2 QZ2 → WG2.

## Ready

### GMP. Bigger table games: Five Frames Duel and Sea Battle for 2–6, spectators see the game, many more words (owner, 15 Nov 2026; Game Studio)
- Why: the owner wants these two games for groups. He also wants spectators to see what happens ("it's fine if they
  see, they are friends"), and the word game needs far more words.
- What:
  1. **Spectators see the game:** in Sea Battle and the Five Frames Duel a watcher sees every board live. That means
     the Duel players' letters, and in Sea Battle all ships and shots. Players still never see each other's hidden
     information (a player sees only their own ships, and in the Duel only the others' colour marks). The server sends
     watcher views only to watchers.
  2. **The Five Frames Duel for 2–6 players:** same rules, more players racing on the same word. The finish order
     ranks them, and the result card shows 1st to 6th. Lobby, head and phone Games-tab layouts fit 6.
  3. **Sea Battle for 2–6 players:** each player has a sea. On your turn you **choose which player to attack**, then
     fire; turns go round. A player whose ships are all sunk is out but keeps watching. The last one with ships wins.
     It is played for fun: no rule forces fairness.
  4. **Many more words, English and Turkish:**
     - The answer lists and the accepted-guess lists for both languages grow from open-licensed sources (licence
       checked: MIT / Apache / BSD / CC0 / CC-BY with attribution in `apps/web/public/third-party-notices.txt`).
     - Answers are common, clean words: no slurs, no adult words, no proper nouns. Guesses may be broader.
     - Turkish handles İ/ı correctly.
     - Size targets are the studio's to propose, e.g. 2,000+ answers and 10,000+ guesses per language.
     - The lists ship as lazy chunks so the room bundle doesn't grow.
- Done when:
  - Every hidden-information rule above is enforced by the server, with unit tests.
  - Both games run with 2, 3 and 6 players in e2e.
  - The phone Games tab fits 6 players at 360×640.
  - The word lists pass a licence note and a profanity filter check.
  - Test Lab hooks: `seaBattle.state`, `duel.state` (players, turn, target, watchers).
- Tests: server unit tests (turns, targets, elimination, watcher views), e2e with fake players, games-sweep at phone
  and laptop, and the owner's hand test with friends.
- Owner's pick: his message (Planner chat, 15 Nov 2026). He allows extra skills or tools for the word lists. The
  studio says which and why before using them.

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
