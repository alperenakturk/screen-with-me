# Cinema mode (card 14): design notes

_Design session, 3 Nov 2026. The owner asked Claude to design it ("design it yourself"); the card's own "Done when"
stays the contract. Interactive preview (enter / leave, top-edge peek, messages, 1366×768 / 1920×1080, reduced
motion): https://claude.ai/artifact/X8MpSsqD6afeS1Tfp73Z6k. No owner pick needed: the one real choice (where messages
go without covering YouTube) is solved below by a strip under the video, which costs only ~2 % of the video._

## Entering and leaving
- ⇥ `#side-toggle` becomes the **🎞 Cinema mode** button on the rail (title "Cinema mode · T"), also in the rail's ⋯
  and in the shortcuts card. **T** toggles it (outside text boxes, like YouTube's theater key). **Esc** leaves it when
  no window, sheet or dialog is open. Remembered per tab (`sessionStorage` `cinema:<room>`), replacing
  `opt:sideHidden`. Computer only (`hasMouse()`, not `html.phone`), not in the shell (film page), not in the Shorts view.
- State class: `.room.cinema` (keep `.side-hidden` as an alias during the move so existing rules still apply).
- On enter a pill "Cinema mode · T or Esc to leave" shows for 1.8 s at the top centre (`flashHint` style), only the
  first two times per browser (`cinemaHint` count).

## What changes (timings)
| Part | Normal | Cinema | Transition |
|---|---|---|---|
| Page around the video | theme scene, aura, stars | a dim layer `--cinema-bg` at 94 % over everything except the theater | opacity 300 ms ease |
| Theme scene (`body::before` art) | visible | 25 % under the dim layer | same 300 ms |
| Top bar | visible | slides up out of view (`translateY(-100%)`, opacity 0) | 250 ms ease |
| Side panel, link box, pins strip, footer | visible | opacity 0, `pointer-events: none` (side also `translateX(24px)`) | 300 ms |
| Video (`.player-wrap`) | grid size | the largest 16:9 that fits (below) | left / top / width / height 320 ms `cubic-bezier(.2,.8,.2,1)` |
| Rail | beside the video | beside the video, vertically centred, same 58 px column, never on the player | follows the video |
| Messages | chat panel | **message strip under the video** (below) + unread count on 💬 | each line fades in 250 ms |

`prefers-reduced-motion: reduce`: no fade, slide or size animation; everything switches at once.

## Video size
Margins `m` = 20 px, rail 58 px + 12 px gap, message strip 40 px under the video:
`maxW = innerWidth − 58 − 12 − 2m`, `maxH = innerHeight − 2m − 40`, `w = min(maxW, maxH × 16/9)`, `h = w × 9/16`; centred
horizontally as one block (video + gap + rail), vertically in the space above the strip.
- 1366 × 768 → **1223 × 688** (today's room at that size: ≈ 900 × 506).
- 1920 × 1080 → **1778 × 1000**.
The film keeps its own shape inside (letterbox for 4:3 / 21:9), as in fullscreen.

## Messages: strip under the video (not over it)
YouTube's rule (nothing of ours over its player, `CLAUDE.md` "One remote" / card 2a) rules out top-right toasts on the
video. In cinema mode the toasts (`ui/toasts.ts`) render into a 28 px row in the 40 px band under the video, right
aligned to the video's right edge: avatar 18 px + **Name:** text, one line, pill shape, newest on the right, at most two
visible, each fades after 5 s. Every message while in cinema mode adds 1 to a badge on 💬 (`#dock-chat`, the existing
unread pattern of ⇥); pressing 💬 opens the message box window by the rail and clears the count. The same strip works
for video files and the sync test, so there is one rule for every player.

## Top bar at the edge
A transparent 8 px strip at the top of the window (`#cinema-edge`) shows the top bar while the mouse is on it or on
the bar; it leaves 400 ms after the mouse goes. Open menus from the top bar (⋯, profile) keep it shown.

## Colours (theme tokens)
- New token `--cinema-bg`: `color-mix(in srgb, var(--bg) 18%, #000)` (Gece → ≈ `#050409`; each theme gets a near-black
  of its own hue). The dim layer uses it at 94 % opacity.
- The strip's pills: `--surface` at 95 % with `--border`, text `--text`, name in `--text` bold.
- The rail and its active 🎞 button use the existing rail tokens (`--accent` for the active state).

## What stays working
The "everyone ready" banner and the game invite card move into the strip's place (left side) while in cinema mode;
the invite window and settings dialog open as usual (the top bar is not needed for them: ⋯ on the rail). Leaving
restores the exact layout before (no saved sizes needed: the grid recomputes).

## Tests for the card
Harness at 1366×768 and 1920×1080: enter with the button, T and Esc; only the video, the rail and the strip are
visible (`elementFromPoint` sweep); no page scroll; the player rect is ≥ the sizes above minus 2 px; a message
appears in the strip and nothing of ours intersects the player's rect; 💬 shows the count; reduced motion switches
without transitions.
