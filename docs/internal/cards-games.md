# Game cards (Game Studio and Game Studio 2)

Part of the card board (`CARDS.md`), split out on 15 Nov 2026 to keep each file small. Same rules as `CARDS.md`:
a finished card moves verbatim to `docs/internal/archive/cards-done.md`. Order: Game Studio: GMP2;
Game Studio 2 QZ2 → WG2.

## Ready

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

