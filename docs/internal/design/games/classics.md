# Classics: XOX, Connect Four, checkers, chess, backgammon in one place

🎮 Game Studio, 4 Nov 2026. The owner's ask: "XOX, Connect Four and other basic games in one place: press it and a game
screen opens with small basic games inside, no separate card for each; simple, cute, animated, themed, with the mascot
if needed". Option page: https://claude.ai/artifact/UMqmwdkAGFJR8vcgk6Wbib

## The owner's picks ("Klasik seçimlerim: 1: A · 2: B · 3: A · 4: A · 5: A · 6: A · 7: A")

1. Name: **Classics** (TR "Klasikler"). "Table" already means an open game in the UI ("Leave table").
2. Picker: **a game shelf**: boxes on a shelf; the chosen one's lid opens a little, Glowbeam shines above it.
3. Boards: **night-gold, following the room's theme** (the logo's colours; the board changes with the theme).
4. Glowbeam: **the referee**: shows whose turn it is, cheers the winner with a small celebration.
5. Order after XOX and Connect Four: **checkers (dama)** first, then chess, then backgammon (tavla).
6. Alone in the room: **play against Glowbeam** in every classic (easy / medium).
7. Okey: **after the five boards**, as full 4-player okey with the real rules.

## Plan

- P6: the Classics card in the gallery's "Together" tab replaces the XOX and Connect Four covers; it opens a table whose
  first screen is the shelf (XOX, Connect Four, checkers; chess and backgammon shown as "soon"). Board games keep the
  server-validated `Game` object (`games/board.ts` shape); checkers adds its rules file (Turkish dama vs. international
  draughts is a rules question: Turkish dama moves orthogonally; we start with **Turkish dama**, as the owner named it).
  Glowbeam referee in the game head; the bot for a lone player runs on the client against the same rules.
- P7: chess (in-house rules: castling, en passant, promotion, check / mate / stalemate, threefold and 50-move draws).
- P8: backgammon (dice from the server, bearing off, the doubling cube left out at first).
- Later: okey (4 players).

## Reversi (5 Nov 2026)

The owner: "add the other games slowly"; the Planner's card puts **Reversi** on the shelf as the recommended small one
(never "Othello", a trademark; the TR name stays "Reversi"). Rules in `packages/shared/src/games/reversi.ts`:
8 × 8, the usual crossed start, dark (X, seat 1) moves first, a disc must close at least one straight line of the
other colour (all closed lines turn over), a side without a legal move passes (the turn stays with the other side,
`passed` says who), and when neither can move the disc count decides (equal = a draw). A move is the cell (0–63).
Glowbeam: easy (often random, depth 1) and medium (depth 4 alpha-beta on corners, the risky cells next to an empty
corner, edges and mobility; ≈ 50 ms a move). The board reuses the 8 × 8 grid on green felt, a gold dot on each legal
cell on my turn, the last disc lit, the turned discs flip; each seat shows its disc count. Lab position `lastmove`.

## Glowbeam's level (GP2, 5 Nov 2026)

Medium chess and dama follow captures at the end of the search (a quiescence search: after a capture, or whenever the
other side is to move there; dama's forced chain jumps too), captures first, within a 500 ms budget with a one-move
fallback. Measured: medium chess ≈ 250 ms a move, dama ≈ 35 ms. It never leaves its queen to a pawn, never allows a
mate in one it could stop, and never hands a dama man over when a safe move exists (unit tests). Easy plays a weaker
move now and then, but only one close to its best (`EASY_SLACK`).

**GP3 (0.9.97.73): medium chess looks three half-moves ahead**, so it sees a knight fork (unit test). The search plays
moves it already knows are legal through `playLegal` (no second legality check), and `play` decides mate / stalemate
by finding the first legal reply instead of listing them all: about 8× more moves a millisecond (8.9 → 71). Depth 3
first; a position too busy for it falls back to 2, then 1, all within the budget. Measured over three medium-vs-medium
games: median 459 ms a move, 90 % under 530 ms, the slowest 620 ms. The server now thinks first and answers once
`BOT_DELAY_MS` (700 ms) has passed since Glowbeam's turn began (`BOT_THINK_AT_MS` 150), so a table never waits longer than
before. Pins and longer combinations still need more depth.
