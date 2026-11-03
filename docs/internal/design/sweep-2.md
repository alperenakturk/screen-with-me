# Design sweep 2 (3 Nov 2026)

_Design session, for lane A's card 16 (part 1: `sweep-1.md`). Current `main` (v0.9.95.1, after the Sidelit rename and
Snack Bar) built and served locally (`npm run build` + `wrangler dev`; the cloud proxy refuses the live site). Two
browsers in one room (Alex / Deniz = the screen under test, Sam = a second person on 1366×768 who loads media, joins
voice with a fake camera and shares the screen), Chromium with fake media devices. Screens: a playing room (local
video file), each room game (XOX, Connect Four, Draw & Guess, Quiz, Last Heart), Snack Bar, voice with cameras, a
screen stream, the Shorts view; sizes 1920×1080, 1366×768, 1024×640, 390×844, 844×390; EN + Gece and TR + Sinema
(110 screenshots + scripted checks). The film page through the embed harness (`scripts/harness/embed/run.mjs`, dev
extension build, `film-server.mjs`): 106 checks passed, 0 failed; its screenshots are 1280×860, TR. JPEG evidence in
`sweep-2/`._

**Could not be checked here:** real YouTube / Shorts playback (the cloud blocks YouTube's video hosts; the Shorts view
was checked for layout only), the sync test while a video plays (dimmed by design), voice and cameras on a phone (the
phone tester did not get into voice through the script; needs a hand check), the film page at other sizes.

## Bugs (fix in card 16)
| # | Screen · size | What is wrong | Screenshot | Suggested fix |
|---|---|---|---|---|
| 1 | Room in voice with 2 cameras · 1366×768 and 1024×640 (EN + TR) | The Together card grows (buttons, "Push to talk (V)" on two lines, the camera tiles, "Pop out", the headphones tip) and leaves the chat **one line** high: "No messages yet. Chat here when your" is cut; at 1024×640 the chat list is 46 px. Chat becomes unusable while in voice. | `sweep-2/en-gece-1366x768-voice.jpg` | Under ~860 px tall: cameras open in the floating window by default (or a 2-row strip), the headphones tip shows once and goes, "Push to talk (V)" as an icon toggle; keep the chat ≥ 200 px (`min-height` on the tabs card). |
| 2 | Shorts view while someone streams · 1920×1080 | The stream window's buttons (⧉ ⤢ ✕) sit at x 1912–2008, off the right edge of the screen: the window is placed outside the view, so you can neither see nor close the stream there. | `sweep-2/en-gece-1920x1080-shorts.jpg` | In the Shorts view clamp the stream window into the viewport (as the free window's `fitRailPops` does), or dock it under the right-hand seats. |
| 3 | Shorts view · all sizes | While the YouTube player loads (or cannot load) its box is pure white: a glaring white slab in the dark room (here for the whole time, because YouTube is blocked; on slow networks for a moment). | same | Give the player box a dark background (`#000` / `--cinema-bg`) and a small spinner until the iframe reports ready. |
| 4 | Every game window, computer (EN + TR) | The game title is cut by the row of head buttons: "Tic-tac…", "Snack …", "Draw & Guess · started by …", "Four in a Row · started by …" (the script found it in every game at every computer size). | `sweep-2/en-gece-1920x1080-game-xox.jpg`, `…-1366x768-game-draw.jpg` | Two-line head: title on its own line, buttons right; or drop " · started by X" into a small second line; head buttons icon-only under 900 px. |
| 5 | XOX / Connect Four · all sizes | Player names are cut ("Alex…", "Ale…") although there is room, and the empty seat reads "… ? O" (an ellipsis, a question mark and the piece), which looks broken. | `sweep-2/en-gece-390x844-game-xox.jpg` | Give the name the free width (`min-width: 0; flex: 1`); empty seat: "Waiting…" / TR "Bekleniyor…" in muted text, no "?". |
| 6 | Game windows opened as free windows · 1920×1080 and 1366×768 | XOX and Snack Bar open as a free window on top of the side panel, covering the chat and the Together card; at 1366 Snack Bar's text is shrunk to about 9 px (rows "Opens with the Soda fountain" barely readable). | `sweep-2/en-gece-1920x1080-game-xox.jpg`, `…-1366x768-game-snack.jpg` | Open a game in the video's place by default on a computer (free window only when the person chooses it); Snack Bar's free window never scales text below 12 px: show fewer rows ("+2 more when bigger", as designed) instead of shrinking. |
| 7 | Game head · all sizes | The Sidelit play-logo in the game head sits with a 🎮 badge hanging half outside the head (below its bottom edge); on a sideways phone it is a lone clipped icon next to the video thumbnail. | `sweep-2/en-gece-1366x768-game-poker.jpg`, `…-844x390-game-quiz.jpg` | Use the plain 24 px logo (no badge) inside the head's height, or drop it (the title already says which game). |
| 8 | Draw & Guess lobby · all sizes | The lobby card is a lighter grey panel than every other game's; its muted text ("Game language", "Rounds", "You need at least 2 players…") is 2.5:1 on it, below AA. | `sweep-2/en-gece-1366x768-game-draw.jpg` | Use the same `--surface` card as the Quiz / Last Heart lobbies; muted text then passes. |
| 9 | XOX on a phone · 390×844 | The board ends at about 70 % of the screen; the rest is empty, and the board cells are smaller than they could be. | `sweep-2/en-gece-390x844-game-xox.jpg` | Size the board from the free height (`min(100vw − 32px, 100dvh − head − score − 120px)`), centred. |
| 10 | Room with a video · 1366×768 (EN + TR) | The page scrolls by 1 px (a stray scroll in the room view). | — | Find the 1 px (likely the footer border or a rounding in `--stage-w`) and clamp it. |
| 11 | Film page, room view · 1280×860 | The film's hole is 818 × 460 with ~200 px of empty page under the room (the room view is capped at `100vh − 250px` but uses less). | `sweep-2/film-room-view.jpg` | Let the hole grow to the room's real free height (same rule as the site's "bigger room", 0.9.92.7). |
| 12 | Film page, fullscreen · 1280×860 | Our "Bora played" note (top left) and the message toast (top right) sit right on the film site's own top controls (here the test page's "Play/Pause" and "Fullscreen"; real players put their title, back and cast buttons there). | `sweep-2/film-fullscreen-message.jpg` | In fullscreen on the film page start notes and toasts 56 px from the top (below a typical player's top bar) or in the dock's column. |

## Small things
- Film page "Pick the video" strip: the "Cancel" button is cyan, the only cyan button in the product; use the
  theme's accent like every other primary button. (`sweep-2/film-pick-video.jpg`)
- Stream window: its pink border (the "live" colour) is the only pink outline in the room and reads as an error; the
  red dot + "Sam is sharing" already says live. A neutral border with a small red "LIVE" tag would be calmer.
  (`sweep-2/en-gece-1366x768-stream.jpg`)
- Last Heart lobby: "You bet life instead of chips: everyone starts at 100 %" is clear; the "Start the game" button is
  2.9:1 when disabled on the sideways phone (fine for a disabled state, but the reason line under it should then be
  readable: it is).
- Voice: "Show activity (14)" grows fast with voice joins and camera toggles; consider not counting camera on / off.

## Checked and fine
No sideways page overflow anywhere; the playing room, stream window (on the video), Quiz and Last Heart lobbies fit at
every size including phones; Connect Four's board fits; the film page passed all 106 embed checks (hole, islands,
fullscreen dock, subtitles visible, emoji transparency, video pick, back to the room).
