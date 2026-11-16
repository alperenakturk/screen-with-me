# Game cards (Game Studio and Game Studio 2)

Part of the card board (`CARDS.md`), split out on 15 Nov 2026 to keep each file small. Same rules as `CARDS.md`:
a finished card moves verbatim to `docs/internal/archive/cards-done.md`. Order: Game Studio: finish #483 (STATUS task queue), then lazy-load `games/stage.ts` (budget step), then GT1;
Game Studio 2 QZ2 → WG2.

## Ready

### GW3. Games never take the whole screen: "big" means the video's place (owner, 17 Nov 2026; Game Studio, first)
- Why: GW2's ⛶ puts a table into real browser fullscreen (Esc note, chat and voice gone). The owner meant something
  else: "only videos ever go fullscreen".
- What:
  - A shared game is a frame that can move anywhere, over the YouTube player too (GW2 stays).
  - The frame's "big" button (it need not look like ⛶; pick a clear icon and words, e.g. "Fill the video's place")
    puts the game into the video's place (the player's frame). The side panel, chat, voice and the rail stay usable.
    Never `requestFullscreen` for a game, side game or panel; remove GW2's real fullscreen.
  - Shorts view: games only as free frames (no "big" button there).
  - Switching normal ↔ Shorts view while a game is open keeps the game, its mode and its connection: a frame stays a
    frame; a game in the video's place becomes a frame in Shorts and goes back when you return. Opening a game never
    drops the room or game connection.
- Done when: no game path calls fullscreen (a unit or harness check); the big mode fits the video's place at 1366,
  1920, tablet and phone without scroll; the Shorts switch harness keeps the game socket open (no reconnect); Test Lab
  hook `games.frame` (frame / video's place / Shorts); reference.md "Game windows" updated; owner's hand test.
- Owner's pick: his message (Planner chat, 17 Nov 2026): "tam ekran olan şeyler sadece videolar".

### GT1. Clearer tutorials and a "❓ How to play" button in every game (owner, 15 Nov 2026; Game Studio, after GMP)
- Why: the first-run tutorials are a little thin; players can't see them again.
- What: each tutorial a little more detailed and plain (EN + TR); "❓ How to play" in each game's menu replays it;
  no scrolling.
- Done when: every game has it; `check-game-text.mjs` green; Test Lab hook `games.tutorial`.
- Tests: games harnesses open the tutorial from the menu; shots at 4 sizes.
- Owner's pick: his message (Planner chat, 15 Nov 2026).

