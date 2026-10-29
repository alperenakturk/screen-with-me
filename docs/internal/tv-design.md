# TV version: research and design options

> Design only (29 Oct 2026). Nothing is built until the owner picks an option.
> Proposal page (Turkish, mockups at 1920×1080): https://claude.ai/artifact/MQkQqMfTreT9YFEfgyjmbc

## Owner's goal
Open the site in a browser on Google TV and use a basic, comfortable room with the remote: join / leave the room,
join / leave voice and talk, type a message, send emojis. Nothing else is needed on the TV.

## Research summary
- **Browsers.** Google TV / Android TV ship no browser and Chrome has no official TV build. People install
  **TV Bro** (free, most recommended; WebView or GeckoView engine) or **Puffin TV** (paid, cloud-rendered: the page
  runs on Puffin's servers). Fire TV has **Silk**. Samsung (Tizen) and LG (webOS) sets have their own browsers.
- **Remote input.** No mouse. The page sees arrow keys (D-pad), OK = Enter, Back = Escape or history back (the page
  must trap it with `history.pushState`, or Back leaves the room). Some remotes send media play/pause keys.
- **Microphone.** The remote's mic button goes to Google Assistant (Fire TV: Alexa), never to a web page. Most TVs have
  no other mic. LG blocks `getUserMedia` in its browser; Android TV WebView mic access depends on the browser app
  granting it and has known bugs. So **the TV alone can listen to voice but usually cannot talk**. Ways around it:
  a USB / Bluetooth mic where the browser allows it, or the **phone as a companion** (mic, keyboard, emojis).
- **Typing.** A focused text box opens the TV's on-screen keyboard; Google TV / Fire TV keyboards often offer voice
  typing (speech to text). Still slow, so every option has **quick replies** (one press).
- **WebSocket / YouTube / video files** should work in TV Bro and Silk; Puffin TV and built-in browsers are uncertain.
  Receiving WebRTC audio is plausible in Chromium/Gecko engines but must be tested on a real TV. The extension does
  not run on TVs, so only site-played media (YouTube, video files) works; no film pages.
- **10-foot UI.** 5 % safe area (96 px sides, 54 px top/bottom at 1080p), text ≥ 32–40 px, at most 5–6 focusable
  items per screen, an always-visible focus ring (thick white outline + slight scale).
- **Joining.** Room ids are 10 characters, painful with a remote. Proposal (all options): the TV shows a **4-digit
  pairing code + QR** (10 min, single use); someone in the room presses "📺 Connect a TV" on their phone/PC and types
  the code or scans the QR, and the TV joins. Typing the room code stays as a fallback. Needs a small server endpoint.

## Options (mockups on the proposal page)
- **A · Big button bar.** Video full screen, almost nothing on it. OK opens a bar of 5 large buttons under the video:
  Voice · Type · Emoji · People · Leave. ↑ opens emojis, ↓ opens typing directly; Back closes / asks before leaving.
  Messages float bottom-right. Pros: easiest to learn, video never shrinks, same everywhere, cheapest to build.
  Cons: no chat history, typing still via the TV keyboard.
- **B · Slide-in side panel.** → or OK slides a panel in from the right (video shrinks to ~2/3 and keeps playing):
  who is in voice / speaking, last messages, 4 buttons; emojis in a 3×3 grid. Pros: closest to the site's room,
  voice state always visible. Cons: smaller video, more text to read from afar, may stutter on weak TVs.
- **C · Phone as remote.** The TV only shows: video, faces (who speaks), messages, flying emojis. The paired phone
  does everything: push-to-talk, typing, emojis, pause, leave. Pros: the only option where talking always works;
  fast typing. Cons: needs a phone, hardest to build (pairing, one person on two devices). Echo: the phone mic hears
  friends' voices from the TV speakers and the phone's echo canceller can't remove them, so push-to-talk is the
  default (or friends' voices play on the phone with earphones).
- **D · Plus menu.** OK shows a "plus" in the middle: ↑ Emoji, ← Type, → Voice, ↓ Leave; each arrow acts at once
  (OK + direction = done); sub-menus use the same shape. Pros: fewest key presses, cleanest screen. Cons: unusual at
  first, at most 4 actions per level, accidental ↓ = leave (needs a confirm).

## Recommendation
**A as the TV screen + C's phone remote for talking.** A works alone on any TV browser (watch, listen to voice, type
with quick replies + keyboard, emojis); its 🎙 button says "connect your phone to talk" when no mic is available.
Order once chosen: (1) a small "TV test" page to measure on the owner's TV what works (connection, YouTube, hearing
voice, mic permission); (2) TV room (A) + code / QR pairing; (3) phone remote (push-to-talk, typing, emojis).

## Sources
- Android TV navigation: https://developer.android.com/training/tv/get-started/navigation
- Android TV layouts (5 % overscan margin): https://developer.android.com/training/tv/playback/compose/layouts
- Fire TV design guidelines: https://developer.amazon.com/docs/fire-tv/design-and-user-experience-guidelines.html
- Designing for TV (Smashing Magazine, 2025): https://smashingmagazine.com/2025/09/designing-tv-principles-patterns-practical-guidance/
- TV Bro source: https://github.com/codecopy/tv-bro
- Android TV browser round-ups (TV Bro, Puffin TV…): https://firesticktvstream.com/?p=4523, https://ovrclock.com/best-browser-for-android-tv/
- Android TV 11 WebView mic issue: https://forums.developer.nvidia.com/t/silent-muted-no-microphone-input-audio-recording-in-webview-webrtc-after-upgrade-to-androidtv-11-nvidia-shield-9-0-0/210640
- LG webOS getUserMedia: https://forum.webostv.developer.lge.com/t/webrtc-getusermedia-webos-24/27587
- Samsung TV web engine: https://developer.samsung.com/tv/develop/specifications/web-engine-specifications
- Silk on Fire TV, remote mic not available to apps: https://www.aftvnews.com/?p=21954
- Google TV Streamer remote (mic is for the Assistant): https://support.google.com/chromecast/answer/15323195
