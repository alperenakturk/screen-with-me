# Tablets (prep for lane A's T card)

_Design session, 3 Nov 2026. Current `main` (v0.9.95.1) served locally, Playwright with touch and tablet user agents:
iPad 820×1180 upright, iPad 1180×820 sideways, Android tablet 768×1024 upright. Screens: home, empty room, a playing
room (local video file; YouTube can't play in the cloud, the rail rule is the same), Shorts view, XOX, voice with two
fake cameras. Owner page with today's screenshots and the one question:
https://claude.ai/artifact/GXitrW7UaKsiWHBtWzk4Mw. Small screenshots in `tablet/`._

## Which layout each size uses today
`<html>` classes: all three are `is-touch` (+ `is-ios` on iPad), **never `phone`** (`isPhoneLayout()` is ≤ 700 px wide
or touch ≤ 500 px tall), so every tablet gets the **computer layout**; the theater is `dock-mode side-rail
dock-window` (the rail beside the video). Sideways iPad also gets `sideways`.

| Size | Today | Problem |
|---|---|---|
| iPad upright 820×1180 | Computer layout stacked in one column: link box, video with the rail, Together card, tabs + chat below | The page scrolls 227 px (empty room) to 454 px (voice); chat starts under the fold; the 🔍 button is a wide empty pill with only the icon (`tablet/en-gece-820x1180-video.jpg`). |
| Android upright 768×1024 | Same stacked computer layout | Scrolls 354–574 px; **the rail is invisible**: its column is there (a black band right of the picture) but the buttons rest at opacity 0, although touch screens should keep it at 30 % (the Android tablet UA reports no `has-mouse`, so check the touch rule) (`tablet/en-gece-768x1024-voice.jpg`). |
| iPad sideways 1180×820 | Computer layout, side panel right | Good. 130 px of empty space under the video (the "bigger room" rule caps it); XOX opens as a free window over the chat (same as sweep 2 #6) (`tablet/en-gece-1180x820-*.jpg`). |
| Shorts, all three | Shorts view with the bottom bar | Good use of space; the bar wraps to two rows on upright tablets (`tablet/en-gece-820x1180-shorts.jpg`). |
| Home, all three | Computer home page | Fine (`tablet/en-gece-768x1024-home.jpg`). |

## Proposal
- **Sideways tablets (wider than tall, ≥ 900 px):** keep the computer layout. Let the video use the free height (the
  130 px), open games in the video's place, keep the rail always visible at 30 % on touch (today's rule) with 44 px
  buttons.
- **Upright tablets (touch, 701–1100 px wide, taller than wide):** a layout that never scrolls the page and keeps the
  rail beside the video (never over it; YouTube rule). The owner picks between:
  - **A. The phone app layout, scaled up:** widen `isPhoneLayout()` to upright touch tablets; video on top, faces
    strip, chat, ＋ / ⋯ sheets. Least work; long chat lines, queue only in ⋯.
  - **B. A tablet layout (recommended):** video full width on top with the rail beside it (`--tab-video-h`: the
    largest 16:9 that leaves ≥ 45 % of the height below); below it two columns: chat (1.5 fr) and a side column (1 fr)
    with Together (faces, voice buttons, camera tiles) and the Queue / People tabs. Class `html.tablet-up`, set in
    `device.ts` next to `phone` (`isTabletUpright()`: touch, not phone, `innerHeight > innerWidth`, width ≥ 701).
    Camera tiles live in the side column; the ⋯ More menu and windows open as popovers (not bottom sheets).
- **Both:** touch targets ≥ 44 px on tablets (rail buttons, chips, chat send); Shorts bottom bar on one row (icons
  only where it would wrap); the 🔍 button shows its text or shrinks to a square.

## Question for the owner (on the page)
1. Upright tablet room: **A** phone layout scaled up, or **B** tablet layout with video on top and two columns
   below (recommended)?

## Tests for the card
Harness with the three tablet viewports (touch, iPad / Android UA): no page scroll in the room (empty, playing, voice
with 2 cameras); the rail is visible and beside the player (no intersection with the player's rect); chat input on
screen; games open in the video's place; Shorts bar on one row; turning the iPad (820×1180 ↔ 1180×820) switches
layouts without a reload and keeps voice / the video playing.
