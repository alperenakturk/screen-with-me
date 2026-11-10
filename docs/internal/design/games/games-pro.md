# Games professional pass (card GPRO)

Owner, 10 Nov 2026: "make the games that don't look professional, professional". Every table and side game was looked
at on a laptop (1366 × 768), an iPhone upright and, new, an iPhone held sideways (the layout audit,
`docs/internal/layout-audit.md`, found the sideways phone was where the games broke). `scripts/harness/games-sweep`
has a new size `side` (iPhone 13 landscape) for this.

## Fixed in this pass

| Where | What looked amateur | Now |
|---|---|---|
| Every game window's head | "In the video's place" and ⛶ full screen were two look-alike four-corner icons | "In the video's place" is a frame filled by the game; ⛶ stays the corners; both tooltips say what happens |
| Window Garden, sideways phone | The pots were drawn above the screen (only their bottoms showed) | Pots never taller than the scene; the sill on the left, the pot's line and the album on the right |
| Classics shelf, sideways phone | The second row of cards was cut off | All six cards in one row (names only) |
| Classics boards, sideways phone | The board was squeezed to a 42 px sliver between the bars | The board at the full height on the left, the bar, players, status and buttons on its right |
| Sea Battle, sideways phone | Both seas at 9 px a cell | One sea at the full height (the switch picks which), the rest on the right |
| Five Frames, sideways phone | Everything scaled to 5–12 px text | Tickets on the left, the head, the result and the letters on the right |
| Snack Bar, sideways phone | Scaled to 7 px text | Coins, counter and footer on the left; the buy bar and as many rows as fit on the right |
| Last Heart lobby | Plain text on the dark window, unlike the Quiz and Draw & Guess lobbies | The same tinted card with a ♥ badge |
| Quiz / Draw & Guess / Last Heart lobbies, sideways phone | Narrow card, big badge, long rules | Two columns (rules and faces left, settings and Start right), no badge, rules in three lines (the "?" has them all) |

Checked: `games-sweep` passes for every game on laptop, iPhone and a sideways iPhone (EN + TR; the window passes on
the laptop).

## One lobby look (Planner's pick 1)

Every table that has a lobby opens with the same tinted card: Quiz (blue, ❓), Draw & Guess (amber, 🎨), Last Heart
(pink, ♥) and the Five Frames Duel's waiting screen (gold, ⚔️: the faces, the word language, Glowbeam's line and Ready
in the card). On a sideways phone the Duel's race is two columns too (my tickets left; the bar, their marks, the
letters right). Classics and Sea Battle have no
lobby on purpose: the board is the first thing you see (owner, CL2); the side games have none either. On a sideways
phone the lobbies are two columns (rules and faces left, settings and Start right). The Draw lobby's white paper no
longer shows in the card's corners.

## Still open (smaller)

- The Snack Bar footer's cinema line (`🎬 #1 · ★ 0`) is cut to "1…" on a sideways phone in Turkish.

## Bigger redesign ideas (owner's pick)

1. ~~One look for all lobbies~~: done (above).
2. **Own covers and badges for every table**: the Duel uses the Five Frames cover; Last Heart and Quiz use an emoji
   badge. Drawn badges in the Glowbeam style (Design session).
3. **A sideways phone "game mode"**: when a phone turns sideways with a game open, hide the room's top bar (Mute / 🎮 /
   Back) behind one small button, giving the game the whole screen height.
4. **Motion polish**: a short slide when a game opens, pieces that move instead of jump (Classics), cards that flip
   (Last Heart). Reduced-motion users keep the plain version.
