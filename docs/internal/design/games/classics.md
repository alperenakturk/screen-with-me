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
