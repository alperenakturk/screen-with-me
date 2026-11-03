# Design sweep 1 (3 Nov 2026)

_Design session, for lane A's card 16. Screens were taken from the **current `main` built and served locally**
(`npm run build` + `wrangler dev`, v0.9.93.21): the cloud session's proxy refuses `screen-with-me.swm-server.workers.dev`,
so this is the same code as live but on `localhost`. 100 screenshots: home, join card, empty room, invite window, ⚙️ My
screen, help, privacy, extension page and `/baglanti` at 1920×1080, 1366×768, 1024×640, 390×844 (iPhone UA, touch) and
844×390 (sideways), EN + theme Gece and TR + theme Sinema (phones show plain themes only). Each screenshot was also
checked by script: page overflow, clipped text, off-screen text, inner scrollbars, overlapping controls, WCAG contrast,
and text identical in EN and TR. Screenshots for the main items are in `sweep-1/` (JPEG)._

**Not covered here** (needs two people or real media): a room with a video playing (the sync test is dimmed when you are
alone, by design), YouTube, Shorts, games, voice / cameras, the film page. They stay on card 16's list.

**Already planned elsewhere, not repeated below:** every "ScreenWithMe" name and the old purple face (logo, header,
empty-room mascots, theme chips, extension page, intro) change with cards 6c / 6f (rename, Glowbeam, intro).

## Bugs (fix in card 16)
| # | Screen · size | What is wrong | Screenshot | Suggested fix |
|---|---|---|---|---|
| 1 | `/baglanti` · 390×844 (EN + TR) | The button row ("Home", "⟳ Run it again", "Copy the result") is wider than the card: the third button runs off the right edge and is cut. | `sweep-1/en-gece-390x844-connection.jpg` | Let the row wrap (`flex-wrap: wrap`) or stack the buttons full width under 480 px. |
| 2 | `/baglanti` · 390×844 | Long check names break the row: the ✅ sits alone on one line and the name drops to the next ("Does the backup connection open (HTTP)", "Does the room answer over the backup connection"). The value ("19 ms") wraps under the name on other rows, so the list looks ragged. | same | Grid per row: icon column 24 px + text column; the value goes on its own small line under the name, always. |
| 3 | `/baglanti` · all sizes | "How the page loaded ?" and "200 · 14 ms · ?" show a bare "?" (the protocol is unknown on localhost; on live it may say h2 / h3). A lone "?" looks like a bug to people. | same | Show "unknown" (TR "bilinmiyor") instead of "?", or hide the value. |
| 4 | Join card · 844×390 (sideways phone) | The card is taller than the screen: the hint under "Enter room" is cut and the page scrolls 81 px. | `sweep-1/en-gece-844x390-join.jpg` | Under 500 px tall: hide the room name line and the hint, put the avatar left of a single row (field + button), smaller title. |
| 5 | ⚙️ My screen · phones (390×844) | "Fullscreen when turned sideways" is offered, but on a phone it does nothing: since 0.9.92.8 `fullscreen.ts` skips `rotateFs` when `isPhoneLayout()`. It only works on tablets. | `sweep-1/en-gece-390x844-settings.jpg` | Show the row only where it works (`is-touch` and not `html.phone`), or remove it. |
| 6 | Link box placeholder · 1366×768 and 1024×640 (EN + TR) | The placeholder is cut mid-word: "…a video file, a film pag" / TR "…video dosyası, film say". | `sweep-1/en-gece-1366x768-room-empty.jpg` | Shorter placeholder under 1500 px ("Search YouTube or paste a link" / "YouTube'da ara ya da link yapıştır"); keep the long one only where it fits. |
| 7 | ⚙️ My screen · all sizes (EN) | The example name in an English UI is Turkish: **"Ali paused" note**. | `sweep-1/en-gece-1024x640-settings.jpg` | EN `settings.actionNotice` → "'Alex paused' note" (TR keeps "Ali durdurdu"). Same check for other EN strings with "Ali". |
| 8 | Room · TR · all sizes | Friendly room names are English in the Turkish UI ("Cozy Cabin", "Saturday Loft", join card "Jolly Matinee"). By design the name is the same for everyone, but to a Turkish user it reads as untranslated. | `sweep-1/tr-sinema-1366x768-room-empty.jpg` | Owner's call (see question below). Option: a TR word list of the same size, so every room has an EN and a TR name, each person sees their language. |
| 9 | Room · Sinema theme · 1366×768 | The scene's right-hand decorations (gold film reel and fan lamp) sit right behind the side panel and show through its translucent cards (Together card, chat). It looks like a smudge on the panel. | same | Make the side cards opaque in scene themes (or 95 %), or move the decorations past the panel's edge (scene x > 1400) so they show only on wide screens. |
| 10 | Home · Sinema theme · 1920×1080 | The projector beam runs across the heading and the paragraph; the text sits on a bright, uneven band. The "Sam same second here" bubble in the preview is grey on grey (contrast 1.4:1) and almost invisible. | `sweep-1/tr-sinema-1920x1080-home.jpg` | Start the beam lower (under the paragraph) or fade it out behind the text column; give the preview's "other person" bubble an opaque background. |
| 11 | Home · 390×844 | Below "How does it work?" about 55 % of the screen is empty night sky; the page looks unfinished. | `sweep-1/en-gece-390x844-home.jpg` | Put the room preview (or the mascot + 3 short lines) in that space, or centre the block vertically. |
| 12 | Home preview · computer | In the preview's "In sync · 30 ms apart" laptop, the other person's bubble "Sam same second here 🔥" uses the same low-contrast style (1.4:1). | `sweep-1/en-gece-1366x768-home.jpg` | Same as 10. |

## Contrast (WCAG AA)
| # | Where | Ratio | Fix |
|---|---|---|---|
| 13 | Every purple primary button with white text (Create room, Enter room, Copy invite link, Add to queue, Join voice, Invite, Copy) in the Gece theme | 3.7:1 (needs 4.5:1 below 18 px) | Darken the plain-theme accent behind white text to `#6a4cf2` (5.4:1), or use dark text on it. The gold theme accent with dark text already passes. |
| 14 | Room: the name under my face in the Together card ("You") | 1.2:1 per the script; it reads fine on screen, so the measured background is likely the avatar ring. | Check by eye in card 16; no change if it reads. |

## Small things
- The ad-blocker tip ("Want to watch without ads? We recommend uBlock Origin Lite…") sits under every room. It is useful
  once, but in the room it is noise: show it on the home page and the help page only, or once per browser.
- Sideways phone, empty room: the right column says only "Hold the phone upright". Fine, but the empty room has nothing
  to watch, so the sideways layout could keep the faces / chat until a video starts.
- Phone, empty room: the 🎙 / 📷 buttons are red before joining voice. Red reads as an error to new users; a neutral
  grey with a slash would say "off" without alarm.
- Invite window: "Anyone who opens this link comes into this room. No account needed." breaks so that "needed." sits
  alone on the second line at 1366×768 (`text-wrap: pretty` on the description).

## Checked and fine
No page overflows sideways at any size; no clipped text found by script outside the placeholder (6); no stray inner
scrollbars except the phone-sideways settings page (388 / 420 px, acceptable for a settings list); help, privacy and the
extension page read well at all sizes in both languages; dialogs (invite, settings) fit at 1024×640 and on phones.

## Question for the owner (via the Planner)
- **Room names in Turkish (8):** keep one English friendly name for everyone, or give each room an EN + TR name and
  show each person their language?
