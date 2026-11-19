

### TG1. The Together card gets one row shorter while a side game is open (owner, 19 Nov 2026; lane A, after CAM2)
- Why: at 1366 Five Frames' window covers the Together card's "Join voice / Share" buttons.
- What: while a side game's window is open beside the chat, the Together card shows one row (🎙 Join voice and 📤
  Share side by side), so the buttons stay visible and clickable; back to full when the game closes.
- Done when: at 1366 and 1920 with Five Frames, Snack Bar and Window Garden open, Join voice and Share are visible and
  work; Test Lab hook `together.compact`; a harness check in the `site` job; first look shots.
- Tests: harness; owner's hand test.
- Owner's pick: A "Kart kısalsın" (Planner chat, 19 Nov 2026).
- Done: https://github.com/alperenakturk/screen-with-me/pull/558 (`claude/tg1-together-compact`, lane A, 19 Nov 2026):
  while a game window lies over the side panel the Together card is compact (title, small faces, counts in one row;
  the buttons in one row, Share icon-only in voice), the share menu lifts over the game window; Test Lab
  `together.compact`; harness `together-compact`; hand test 27aj.
