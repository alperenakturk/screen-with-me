# Game cards (Game Studio and Game Studio 2)

Part of the card board (`CARDS.md`), split out on 15 Nov 2026 to keep each file small. Same rules as `CARDS.md`:
a finished card moves verbatim to `docs/internal/archive/cards-done.md`. Order: Game Studio: (none ready);
Game Studio 2 QZ2 → WG2.

## Ready

### LH2. Last Heart fits a sideways tablet (Game Studio proposal, 17 Nov 2026; Game Studio)
- Why: on a sideways tablet (1180 × 820) Last Heart in the video's place needs ≈ 930 × 715 for seats + table + hand;
  the box is ≈ 740 × 650, so the whole game scales and its small print shows ≈ 10 px (rule: ≥ 13 px).
- What: a compact layout for a short, narrowish box (container query on the game box, like Quiz and Sea Battle):
  seats as a row of chips over the table, table cards and hand one size smaller, the status line on one row; nothing
  scrolls. The compact layout is for the video's place and the Games tab only, never switched by resizing a free
  window (GW5 rule).
- Done when: games-sweep `tabland` pokerPlay has no text under 13 px and nothing cut off (EN + TR, 2–6 players);
  games-scale unchanged; Test Lab hook `poker.compact`; shots at 4 sizes; owner's hand test on a sideways tablet.

