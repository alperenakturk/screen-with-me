# Game cards (Game Studio and Game Studio 2)

Part of the card board (`CARDS.md`), split out on 15 Nov 2026 to keep each file small. Same rules as `CARDS.md`:
a finished card moves verbatim to `docs/internal/archive/cards-done.md`. Order: Game Studio: GW3, then GW4, GW5, GMP2, then GT1;
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

### GW4. Opening a game never moves the room layout (owner, 17 Nov 2026; Game Studio, after GW3)
- Why: opening Five Frames (a side game) made the YouTube frame and the side panel / chat shift and shrink.
- What: a game (side game or table) opens over the existing screen (its frame, the video's place by the GW3 rule);
  the video, the rail and the side panel keep their size and place while a game opens, plays and closes.
- Done when: opening and closing every game at 1366, 1920 and a phone leaves the video and side panel rects unchanged
  (± 1 px); Test Lab hook `games.layoutStable` (records the rects before / after).
- Tests: a games harness compares `getBoundingClientRect()` of the player and `.side` before, during and after a
  game; shots at 4 sizes.
- Owner's pick: his message to the Planner (17 Nov 2026).

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

### GMP2. Sea Battle and the Five Frames Duel show and offer 3–6 players (owner, 17 Nov 2026; Game Studio)
- Why: the owner still sees "1–2 players" on Sea Battle and the Five Frames Duel; GMP b (#483, live since 0.9.97.153)
  should allow up to 6 (anyone can attack any other fleet).
- What: check the games hall and lobby labels and that the live build really seats 3–6 (old text, a missed path, or a
  cached build); fix what is wrong. Optional, Game Studio's call: 1–2 jokers for 3+ player Sea Battle if they make it
  more fun. Classics stay as they are.
- Done when: the hall and lobby say "2–6 players" (EN + TR) for both, a 4-player live game works; Test Lab hook
  `games.seats` (fills seats with bots).
- Tests: a games e2e with 4 `GameSocket` players in each; live e2e green; a hand test for the owner (3+ people).
- Owner's pick: his message to the Planner (17 Nov 2026).

### GT1. Clearer tutorials and a "❓ How to play" button in every game (owner, 15 Nov 2026; Game Studio, after GMP)
- Why: the first-run tutorials are a little thin; players can't see them again.
- What: each tutorial a little more detailed and plain (EN + TR); "❓ How to play" in each game's menu replays it;
  no scrolling.
- Done when: every game has it; `check-game-text.mjs` green; Test Lab hook `games.tutorial`.
- Tests: games harnesses open the tutorial from the menu; shots at 4 sizes.
- Owner's pick: his message (Planner chat, 15 Nov 2026).

