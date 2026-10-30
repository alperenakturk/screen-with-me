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

## Decision (owner, 30 Oct 2026): A + C
The owner chose **A + C** with this split: the **TV shows** everything (the video, messages, flying emojis, who is
speaking with a moving voice ring, cameras) and keeps only **basic controls** on the remote (big button bar);
the **phone does the real work**: typing, emojis, voice join / leave, mic, camera, leave the room, settings.
Purpose: one friend watches on a computer, another wants to watch on the TV.

Technical decisions (made in the build session):
- Friends' voices play on the **TV** (that is the point of the living room); the phone does not play them while
  paired. The phone mic would pick the TV's sound up again (its echo canceller doesn't know the TV's audio), so the
  paired phone uses **push-to-talk** by default; with earphones the person can switch to an open mic (then voices
  play on the phone).
- The TV joins the room as the **same person's second device** (same name and avatar, same host rights; it is
  counted once), never asks for a microphone, and joins voice **listen-only**.
- Pairing: the TV shows a **6-digit code + QR** (single use, 10 minutes); a phone in the room types it ("📺 TV'yi
  bağla") or scans the QR. Room ids are never typed on the TV.
- Order: (1) `/tv-test` page (0.9.91.4) so the owner can check his TV browser; (2) server pairing; (3) TV room view;
  (4) phone remote mode.

## Built (0.9.91.4 – 0.9.91.5)
- 0.9.91.4: `/tv-test` page.
- 0.9.91.5: pairing (`/tv` code + QR, `/tv/<code>` room chooser, `TvLink` Durable Object, link tokens), TV mode of
  the room (big button bar, ▲ emojis, Back, listen-only voice, speaking faces, big messages) and the phone remote
  card (push-to-talk, camera, TV settings, earphones mode). Technical summary in `CLAUDE.md` "TV version".
- Waiting for: the owner's real-TV test (`/tv-test`, then `/tv`); remote key codes, audio autoplay and YouTube
  playback differ between TV browsers, so fixes follow his photos.

## Round 2 (owner's first real-TV try, 30 Oct 2026): design only, waiting for his choice
Proposal page (Turkish): https://claude.ai/artifact/QZfFgLai4TmNSTwR1nevdN
- **Owner's feedback:** sync on the TV is very slow (maybe the TV browser); the TV button / TV card on the laptop is
  confusing: pairing should only happen from the phone, with an explanation of how to use it; maybe shelve it.
- **Research:** Teleparty has no smart-TV support; Disney+ removed GroupWatch (2023); Prime Video Watch Party reached
  TVs but is reported discontinued in 2024 (sources conflict); Rave has an Android TV app but needs an account and
  friends added first; Apple SharePlay works on Apple TV with FaceTime (iPhone as camera, Apple-only, same
  subscription); casting a Watch2Gether tab to a Chromecast stutters. An account-free browser TV path is rare, so
  it is a real differentiator, but TV browsers are a weak platform (no Chrome on Google TV, users must install a
  browser app first, weak SoCs).
- **Likely cause of the slowness (to be confirmed on the device):** a weak TV falls behind → the engine jumps at 1 s
  drift (`DRIFT_SEEK_SECONDS`) → the TV rebuffers and falls behind again → another jump after 3 s
  (`DRIFT_COOLDOWN_MS`); every stall also makes the whole room wait ("everyone ready", `STALL_REPORT_MS` 1.5 s); ±5 %
  rate nudging can stutter on weak devices.
- **Options:** A (recommended) fix and simplify: a "TV profile" in the engine (jump at 2.5 s, 10 s cooldown, no rate
  nudging, the TV's stalls don't make the room wait, a sync-status line on the TV, a sync measurement on `/tv-test`)
  + the TV button only on phones with a 3-step explainer; if it is still slow on his TV → C. B: Google Cast receiver
  (Chromecast / Google TV run our page themselves, no TV browser; $5 Google developer registration, Android Chrome
  senders only), after 1.0. C: shelve (hide the TV button, keep the code), come back after 1.0 with B.
- **Needed from the owner:** the choice, his TV model, the browser he used and a photo of `/tv-test`.
