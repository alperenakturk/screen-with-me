# Chrome Web Store assets for Sidelit (design sources)

_Design session, 3 Nov 2026. Brand: `../logo-sidelit.md` (logo D1, mascot Glowbeam, secondary colour T1 teal for
promo surfaces only). The real screenshots are captured after 0.9.99; these frames are ready for them. Form texts stay
in `../../web-store.md` (they still say ScreenWithMe and need the rename pass)._

| File | Size | Store field | Notes |
|---|---|---|---|
| `icon128.svg` | 128 × 128 | Store icon | D1, full drawing, 96 × 96 art centred with 16 px transparent padding (the store's icon guideline). Export to `store/icon128.png`. |
| `promo-small.svg` | 440 × 280 | Small promo tile | Night background, Glowbeam (happy) left, logo + "Sidelit", "Watch together, in sync." / "Any site with a video." and a gold "Free · no account" pill. No capture needed. |
| `marquee.svg` | 1400 × 560 | Marquee promo tile | Logo lockup, the slogan "Different screens, / same moment." (owner's home slogan in English; the second line in gold), two lines of copy, a browser window with one capture slot (`#marquee-shot`, 520 × 300 at 780, 150), Glowbeam (watching) at its corner. |
| `screenshot-1.svg` … `-5.svg` | 1280 × 800 | Screenshots | One caption (46 px title + 21 px line) at top left, the logo lockup top right, capture slots below. Backgrounds alternate night / teal so the store strip reads as a set. |

## Screenshot frames
| # | Background | Title | Line | Capture slots (x, y, w × h) |
|---|---|---|---|---|
| 1 | night | Watch together, in sync | Play, pause and seek happen for everyone. Chat and react right beside the video. | `#s1` 80, 210, 1120 × 540: room view on a film page (sync + chat + an emoji in flight) |
| 2 | teal | Works with any site that plays video | Paste the page link, friends tap "Go to the film", press play. (+ three numbered steps) | `#s2` 80, 290, 1120 × 460: film page with the room around the video |
| 3 | night | Talk while you watch | Join voice with one tap, turn your camera on, everyone stays in sync. | `#s3` 80, 210, 1120 × 540: room with voice + camera tiles |
| 4 | teal | Games for the breaks | Play together in the room, or run your own snack bar on the side. | `#s4` 80, 210, 760 × 540: room with the games gallery; `#s4b` 890, 170, 310 × 580 (no window frame, radius 28): a phone capture of Snack Bar |
| 5 | night | No account. Private by design. | The extension stays asleep until you join a room. One button takes you back. | `#s5` 80, 210, 760 × 540: film page in a room; `#s5b` 890, 230, 310 × 420: the extension popup |

**How to drop a capture in:** each slot is a group `<g id="sN">` holding a dashed placeholder rect and two labels.
Replace the group's content with `<image href="capture.png" x=… y=… width=… height=… preserveAspectRatio="xMidYMid
slice"/>` at the same box (window slots already have their 40 px browser bar above the box, so capture only the page
content at the slot's size, or at 2× and let the image scale down). Then render the SVG to PNG at 1280 × 800 with the
existing headless-Chrome step (`scripts/store-shots.mjs` pattern). Keep a real screen in every slot: the store rejects
screenshots that are mostly marketing art.

## Type and colour
- Titles and the wordmark: **Bricolage Grotesque** ExtraBold; captions: **Atkinson Hyperlegible** (both SIL OFL, Google
  Fonts). The SVGs name the fonts but don't embed them: load them in the page that renders the PNGs, or the text falls
  back to a system sans.
- Night `#22174f` → `#08061a`, teal `#1a8088` → `#0b4750`, warm light from the left (gold `#ffc65a` 30 % on night,
  `#ffd27a` on teal), cream text `#fff3d6`, muted `#c9c2e2`, gold `#ffc65a` for the accent line, pills and step numbers.
- The address bar shows `sidelit.app/r/quiet-otter` as a placeholder; use the real domain once it exists.
- Official texts never name films, series or other sites (store policy, `CLAUDE.md`); captures must use legal demo
  videos.
