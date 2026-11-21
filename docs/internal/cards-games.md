# Game cards (Game Studio and Game Studio 2)

Part of the card board (`CARDS.md`), split out on 15 Nov 2026 to keep each file small. Same rules as `CARDS.md`:
a finished card moves verbatim to `docs/internal/archive/cards-done.md`. Order (21 Nov 2026): one Game Studio session per game: GFIT1 (stage + Classics) first, then DG2, SB2, FW2, QZ5,
LH4 in parallel, each only in its own game's files (the stage and shared lobby CSS belong to GFIT1).

## Ready

Every game card below shares these rules (owner, 21 Nov 2026): a table always opens in the video's place first (free
window only when the player picks it); in the video's place the game itself fills the space: the side column (players,
chat, menus) stays narrow and the board / play area is as large as it can be, centred and balanced when its shape
leaves room; check at 1366, 1920 and a phone. Each card: Test Lab hook, harness / e2e, first look, EN + TR.

### LH4. Last Heart: review, smooth animations, sounds, design (owner, 21 Nov 2026; Game Studio "Last Heart")
- What: a detailed play-through review (bugs, rules, layout at 3 sizes), then fixes; smooth card / chip animations
  and sounds if missing; a nicer table design. Report findings to the Planner before big redesigns.
- Done when: the review file `docs/internal/design/games/last-heart-review.md`, its fixes merged; e2e.

### QZ5b. Quiz fills the video's place; shared-stage leftovers (Planner, 21 Nov 2026; a fresh Game Studio session)
- Why: QZ5 left Quiz on its design shape (empty bands in the video's place); GFIT1's sweep left `tabup/tr/word` (the
  solo Five Frames legend at 12.8 px on an upright tablet in Turkish) below the 13 px rule; the topic chip wraps on a
  tablet; low disabled-button contrast and a small 🏆 count in Quiz.
- What: Quiz opts into `data-fill` + `var(--game-side)` (its own rules in room.css / lobby.css only); fix the three
  sweep findings.
- Done when: 1366 / 1920 / tablet / phone shots; games sweep green; first look.
