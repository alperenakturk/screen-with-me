# Status: where we are (every session reads this first)

> Last update: 2 Nov 2026. Site and extension **0.9.95** (renamed to Sidelit). The owner moved to a **new Claude
> account** on 28 Oct 2026: the old account's sessions and memory are gone, everything needed is here, in
> `ROADMAP.md` and in `CLAUDE.md`. The owner mostly works from **cloud sessions** (claude.ai/code). Update this file
> (keep it short) whenever a task is finished.

## Working with the owner (summary; details in CLAUDE.md)
- Talk in Turkish, simply; Alperen is a student learning JS/HTML/CSS and often follows from the phone.
- Everything on GitHub in English (commits, branches, PRs, docs, code comments).
- Make technical decisions yourself and say why; ask about money/accounts/publishing/legal/naming.
- Every task: code → tests (unit, e2e, real Chrome when needed) → PR → merge when CI is green → check the deploy run in
  Actions → short Turkish report (done / tried / waiting for / next). If the extension changed, bump
  `apps/extension/package.json` (same number as the site footer).
- Likes running big, separate topics (research, design alternatives) in separate sessions; summarize their results.

## Current direction
**The 1.0 plan is in `ROADMAP.md`** (owner's plan, 28 Oct 2026): polish existing features, zero known bugs,
security hardening, legal/name/policies, consistency (English-first repo), operations, then 1.0 in the Chrome Web
Store together with the domain and the final name. New feature areas wait until then unless the owner asks.
**Focus (2 Nov 2026): `ROADMAP.md` "Focus: now / next / frozen" decides what to pick from the queue below.** Work
only on its "Now" items (in order); "Next" items wait for 0.9.94, "Frozen" ones for 0.9.95; new ideas go to "Ideas
waiting for the owner's pick", never straight into the work.

## Task queue (continue from the first unchecked item; keep it in sync with the session's task list)
Owner's feedback from friends' real use (28 Oct 2026). Details in `ROADMAP.md` §1 "Feedback round 1".
- [x] Record the plan, conventions and this queue (CLAUDE.md, ROADMAP, STATUS).
- [x] Separate session: name brainstorm + inspiration page (results → `docs/internal/name-ideas.md`).
- [x] Separate session: security review of custom emojis across rooms and WebRTC IP exposure (results →
  `docs/internal/security-review-1.md`).
- [x] **0.9.83** quick fixes: extension popup button opens a new tab (doesn't replace our room tab); "your extension
  is outdated" shown to an up-to-date extension (friend had to reinstall); film ducking off by default + only on real
  speech (clicks must not trigger it); film-page cover flash.
- [x] **0.9.84** voice/camera bugs (+ friends' "random mic on": reconnect turned a muted mic back on): tiles drop and come back (maybe when a game is opened/closed); the same person
  appears with 2–3 camera tiles (one frozen); own camera visible in a slot even when hidden; small audio glitches.
- [x] **0.9.85** Meet/Discord-style controls: mic/camera toggles under the camera tiles while watching; per-person
  mute and volume; host can kick from the tile; pin a camera; hide my own camera; resize tiles horizontally and
  vertically.
- [x] **0.9.86** security review 1 fixes (separate session, owner approved): custom emojis stay in their room +
  optional local "My collection"; IP notice before peer-to-peer voice / streams; CSP and security headers, frame
  guard, `Origin` check, per-IP limits, GIF metadata stripped (details: `security-review-1.md` "Outcome").
- [x] **0.9.87** settings: ⚙️ button to the right of the profile picture; remove the ⚙️ next to the tabs and the
  settings inside the profile menu; scheduled start redesigned as "Film time" (quick picks, countdown card, invite
  with the time). Started in another session (WIP commit on `claude/focused-franklin-ye6g2g`), finished here (the WIP
  crashed the room: `$('#settings-open')` looked inside `app`). Also from round 3: avatar changes only on "Tamam";
  empty "Bu odada" sticker tab no longer opens the file picker; "Neden?" / hint bubbles close on click, Esc, scroll.
- [x] **0.9.88** feedback round 2–3 (owner, 28 Oct 2026): **rooms are independent** (name and avatar per room: changing
  them in one room must never change another room; only things the owner names, like the sticker collection, are
  shared); send images in chat; links in chat are clickable, ask "you
  are leaving this page" first and open in a new tab (our room tab stays); voice join / leave appear in the room
  activity like pause / play; clicking myself in the "Together" card while in voice said "you are not in voice" (bug)
  → show my own controls instead.
- [x] **0.9.89** extension toolbar icon: outside a room's film tab the popup only offered "Open Sidelit" (home page
  in a new tab) even with a room open; now "🏠 Odama dön" switches to the open room tab (home page as second button).
  Test: `scripts/harness/popup/run.cjs`.
- [x] **0.9.90** film page (owner, 29 Oct 2026): 🏠 / 👁 / 🎯 in the middle of the top bar; scrolling the room view
  made the film video slide out of its frame → the room view now fits the window and doesn't scroll.
Versions count in a fourth part from now on (0.9.90.1, …; CLAUDE.md "Release checklist").
- [x] **0.9.90.1 + 0.9.90.3 fullscreen "one remote" — site part 0.9.90.1, film-page part 0.9.90.3 (known players'
  bars hidden in fullscreen, our catcher takes the clicks, our volume sets the film's, "⚙ Filmin ayarları"). (owner chose option A, 29 Oct 2026; proposal page
  https://claude.ai/artifact/Bz44cRGfCnExTPwtaZGtc7):** YouTube without its own controls (`controls=0`), our bar is the
  only one (adds YouTube quality/captions); on the film page the known players' control bars are hidden (JW Player,
  Video.js, Plyr, native) with "⚙ Filmin ayarları" to bring theirs back for subtitles/quality, unknown players fall
  back to "video above our bar"; fullscreen messages flow up from the message box (newest closest to it). Also fixes
  the two YouTube bugs (controls linger, YouTube volume doesn't work).
- [x] **0.9.90.5 camera/voice: layout 2 "free tiles"** (owner chose it, 29 Oct 2026; proposal page
  https://claude.ai/artifact/UPW29vM3kkGvWKD9hkBTrm): every person's camera is its own small window (drag anywhere,
  resize both ways, show big, hide — for me only), "line them up" and "back to default" buttons, a switch to the strip
  layout; person menu adds pin myself, hide anyone (for me), size presets; a pre-join check with mic / camera /
  speaker choice and "join muted / with camera"; a person whose connection drops keeps a "reconnecting" tile.
  Done in 0.9.90.5: every camera its own window (drag / resize / double click back in line), ⊞ line up, ↺ default,
  ▣ one window, pill with 🎙 / 📷, size presets and "hide (for me only)" in the person menu, pin myself, a
  "reconnecting" tile, fullscreen fade. Still open: the pre-join check below.
- [x] **0.9.90.6 pre-join voice check** (rest of layout 2): small window before joining voice: camera preview, mic
  level, which mic / camera / speaker, "join muted" / "join with camera", "don't ask again".
- [x] **0.9.90.2 sound effects** (owner, 29 Oct 2026; proposal page with three families
  https://claude.ai/artifact/SPrx6qse6qiKJGJCynqdfy): owner chose family A (warm pad, like the intro) for voice + room
  events and family B (glass marimba) for games; rules as proposed (Settings → My screen switch + volume, on at 70 %;
  room sounds at half volume while the film plays; one sound per burst; nothing queued before the first click) + quiet
  extras for the Draw & Guess hint letter, wrong guesses and my locked quiz answer. Details: CLAUDE.md "Sound effects".
- [x] **0.9.90.4 YouTube search inside the app** (key added by the owner to GitHub Secrets `YOUTUBE_API_KEY`,
  29 Oct 2026): words + Enter in the link box → results under it (row = queue, "▶ Şimdi aç" = now). Worker
  `/api/youtube/search` (24 h cache per words, quota flag 10 min, `SEARCH_LIMIT` 10/min/IP), deploy job uploads the
  secret, privacy policy section. Quota ≈ 100 searches/day (101 units each), resets at midnight Pacific time; when
  it runs out the box says so, links still work, search reopens by itself. A higher quota needs Google's compliance
  audit (owner, before 1.0, with the domain and terms of use).
- [ ] **Shorts scrolling, really good** (owner, 29 Oct 2026: "working is not enough, make it great"; Reels / TikTok are
  **not** planned for now): scrolling feel and speed, preloading the next short, an endless feed (filling the queue
  from Shorts links / a channel or playlist), phone swipe, timing so everyone lands on the same short together.
  First a real-browser pass of today's Shorts view with a list of problems, then fixes.
  Done in 0.9.90.1: same YouTube player reused between shorts (no rebuild), phone swipe, wheel over the video.
  Next: preload the following short in a hidden player; endless feed (needs the API key: "Shorts about …" fills the
  queue; also paste many links at once); everyone lands on the new short together (measure the gap).
  Done in 0.9.90.7: paste many links at once (up to 30, film pages left out), next short's thumbnail fetched ahead.
  Still open: measuring the landing gap and a hidden preload player need real YouTube playback (the owner's Chrome or
  a session with googlevideo allowed; headless Chromium here can't decode YouTube's H.264).
- [x] **0.9.90.8** owner's feedback on the camera pill (screenshot, 29 Oct 2026): turning my camera off must not
  remove the pill while I'm in voice (mic etc. from inside the video); the pill grows / shrinks; a stream button in
  it; no plain "camera stream" any more, a screen stream can show my camera in its corner instead.
- [x] **0.9.90.9** owner's idea for Shorts: no camera tiles/grid there; a person's camera shows inside their seat's
  avatar circle; only 🎙 / 📷 in the bottom bar; seats a little bigger.
- [x] **0.9.91** (owner's "go up one", 29 Oct 2026): right rail ends with the video card; endless Shorts feed on the
  YouTube search API; line icons for mic / camera / stream instead of emojis.
- [x] **0.9.91.1 player controls, option A** (owner chose it on https://claude.ai/artifact/SjcRcwoKd8n93W1cK4c6TC,
  29 Oct 2026): YouTube, video files and the film page keep their own player bar (quality, caption language,
  chapters back; the film is never made smaller); in fullscreen our buttons are a vertical dock on the right (talk ·
  together · watch, line icons, named buttons, one 😀 button); our own bar stays only for Shorts and the sync test.
  Harnesses: embed 101/101 (new dock checks), voice 66, voice shell 28, live, sound; unit 204; e2e green except the
  local-only YouTube title check.
- [x] **0.9.91.2 phones** (owner, 29 Oct 2026: "the phone experience should be great, everything in its place"):
  app-like room on an upright phone (video on top, chat scrolls inside with its box on screen, link box folds into
  ＋ while something plays, "Birlikte" in one row, cameras in a swipeable row), every menu a bottom sheet, iPhone
  fullscreen without the browser's (`.pseudo-fs`), turning the phone sideways opens fullscreen (setting, on by
  default; Android also locks landscape after ⛶), compact dock when held sideways, Shorts fit the screen, 16 px
  inputs (no iOS zoom), push-to-talk hidden on touch, phone note on the home page's extension card. Harness
  `scripts/harness/phone/run.cjs` 19/19. Built to grow: phone styles in `phone.css`, device facts in `device.ts`, the
  store-app path in `docs/internal/apps.md` (Play TWA first, App Store needs report / block + push).
- [x] **0.9.91.3 scrollbar on the film** (owner's friend, 30 Oct 2026: a scrollbar on the right edge of the film in
  fullscreen on a film page): some players' boxes can scroll, and grown to the hole they drew a scrollbar over the
  film. The extension's focus CSS now hides scrollbars in the player box and inside it (menus still scroll
  with the wheel; the box's overflow stays unclipped, clipping it once cut off subtitles). The embed test page's player box scrolls like those players; embed harness 102/102.
- [x] **0.9.91.13 owner's feedback round 3 (30 Oct 2026):** a game open while the Shorts view opens moves to the free
  window, sized to fit right of the upright video, and stays free back in the room view (it broke the view before);
  the Shorts bar has 🎮 (the hub opens above it, games there are free windows; phones: large); our own players
  (Shorts in the room view, the sync test) get the dock with ⏯ and volume instead of the old bottom bar (the catcher
  stays: click = play / pause, wheel scrolls); a new Shorts feed takes the old feed's Shorts out of the queue
  (`feedAdded:<room>`); an outdated extension shows a dot on the top bar's "Eklenti" link and a one-time note
  (`ext-update.ts`, compares `data-swm-extension` with `/extension-version.json`), and the extension page explains
  that ↻ only re-reads the old folder. Research session (Shorts sources, Reels, TikTok) merged as
  `docs/internal/short-video-research.md`. Harnesses: phone (feed switch), voice, embed; unit 231.
- [x] **0.9.91.15 voice on film pages (owner, 30 Oct 2026: "my mic is not detected or very quiet on another site",
  "Chrome asks many permissions", "I want to pick mic / camera / headphones myself, on the film page too"):** the
  offscreen voice used the default device (device ids differ per origin), so a headset chosen on the site was ignored
  there. Picks are now also saved by name (`opt:micName` / `opt:camName` / `opt:speakerName`) and sent to offscreen
  (`{op:'pick'}`), which opens the device with that label (falls back to the default); 🎛 on myself on the film page
  lists the extension's devices (`{op:'devices'}`) and switches in place. The permission window asks microphone and
  camera in one prompt, and the site's pre-join check does too when both are still unanswered. Harnesses: voice 65,
  voice shell (new 🎛 checks), embed 106.
- [x] **0.9.91.16 owner's feedback (30 Oct 2026):** voice and cameras no longer drop and come back when the room
  connection breaks or a new version is deployed (the server gives a reconnect its member id back; the direct
  connections stay; probably what the owner saw during the 0.9.91.15 deploy); a Short opened while someone watches
  in fullscreen leaves fullscreen and shows the Shorts view; a pinned camera in the one-window layout is a spotlight
  (big left, others in a strip, all inside the window); the share menu shows over the floating cameras;
  `name-ideas.md` and the "English first" language rule (branch `claude/name-ideas`, never merged) brought to main.
  Harnesses: voice 67, voice shell 30, embed 106, e2e handover (+3 checks).
- [x] **0.9.91.15 free stream window (owner, 30 Oct 2026):** the stream window is dragged anywhere in the video,
  resized from its corner (16:9), popped out onto the page (⧉ / ⤓) and remembered per place (video / page /
  fullscreen); in fullscreen it stays inside the video; the streamer can hide their own preview (🙈, viewers still see
  it). `ui/live-float.ts`; harness `voice/live.mjs` 30/30.
- [x] **0.9.91.12 owner's feedback round 2 (30 Oct 2026):** search results that are Shorts (videos.list `player` with
  `maxWidth`: taller than wide + ≤ 180 s, same 1-unit call) are marked 📱 and open in the Shorts view; the Shorts
  bar's "＋ Ekle" searches Shorts only on words (`ui/shorts-search.ts`, the feed's `short=1` search; the feed now keeps
  only upright results when the shapes came); 🎙 looks off before joining voice, like 📷; the film-page permission
  window is wide (Chrome's question opens at its top left, our text sits on the right; it overlapped before).
  Harnesses: phone (search with a stand-in answer), voice, voice shell, embed; unit 231.
- [x] **0.9.91.7 owner's feedback round (30 Oct 2026)** (the games hub design went to its own session, merged as
  `docs/internal/games-hub.md`):
  - Film page: ⚙️ settings and other windows that only lose `hidden` close the hole at once (they waited for the
    1 s check); the extension's "İzlemeye başla" card sits one z-index under the overlay and follows the video (it
    covered the "Odaya dön" question: only a blurred screen). Reloading the film page keeps the room view (tested;
    the owner's report came from a removed extension).
  - The "Eklenti" button, footer links and the home page's extension door open in a new tab.
  - Real fullscreen: windows and hints added to `<body>` move into the fullscreen element (`ui/fs-layer.ts`).
  - The dock shows in the window too (video ≥ 480×360, not an upright phone; last button = fullscreen) and hides with
    the player's own bar (`dock-idle`: mouse move / paused shows it, 2.5 s rest or mouse leaving hides it; film
    frames report moves; a YouTube frame hides its moves, so there it hides 2.5 s after the mouse comes in, like
    YouTube's bar at rest; touch keeps it at 30 %). A hidden dock is no island on the film page.
  - Camera pill: only camera / layout buttons, shows only while a camera is on, cameras start attached under it and
    move with it. 📷 on the dock and the Shorts bar shows before joining and joins with the camera on.
  - Line icons in the share menu (and a switch for "camera in the corner"), `image-add` instead of 🖼️.
  - Shorts bar: 😀 Tepki tray (custom emojis + 3 recent) and "＋ Ekle" (links to the queue); fits a phone.
  - Phones offer only the plain themes (a scene theme shows as Gece there and stays saved); `device.ts` `isPhone()`.
  - Film-page microphone permission: a small popup window that asks at once and closes itself (not a tab); asking
    from the overlay would give the permission to the film site.
  Harnesses: embed 106/106 (reload, windows in front, dock hides with the film's bar), voice 65/65, voice shell 28,
  live, sound, phone 22/22, TV 31/31, unit 211; e2e green except the local-only YouTube title check.
- [x] **TV version, owner chose A + C (30 Oct 2026; hidden in 0.9.91.14, comes back after 1.0 with Google Cast):** the TV shows the room (video, messages, flying emojis, who is
  speaking, cameras) and has only basic remote controls (big button bar A); the paired **phone** is the real
  remote: typing, emojis, voice in / out, mic (push-to-talk by default: the phone mic hears the TV's speakers),
  camera, leave, settings. Purpose: one friend watches on a computer, another on the TV. Friends' voices play on
  the TV. Details `docs/internal/tv-design.md` "Decision". Steps:
  - [x] **0.9.91.4** TV test page `/tv-test` (connection, YouTube, hearing voice, mic, sound, fullscreen, remote
    keys; the owner opens it on his TV and sends a photo).
  - [x] **0.9.91.5** the TV version itself: server pairing (`TvLink` object per 6-digit code, link token, the TV
    joins as the same person, phone ⇄ TV relay; e2e `tv.mjs` 18 checks), `/tv` code + in-house QR, `/tv/<code>`
    room chooser on the phone, TV mode of the room (D-pad bar, ▲ emojis, Back, listen-only voice, speaking faces,
    big messages), phone remote card (push-to-talk, camera, TV settings, earphones mode). Harness
    `scripts/harness/tv/run.cjs` 32 checks.
  - [x] Owner tried it on his TV (30 Oct 2026): sync very slow, the TV button on the laptop is confusing.
  - [x] **Round 2** (proposal https://claude.ai/artifact/QZfFgLai4TmNSTwR1nevdN): the owner chose "A, then hide it".
  - [x] **0.9.91.14** A: TV sync profile (`SyncEngine` `relaxed`: jump at 2.5 s, 10 s cooldown, no rate nudge, the TV
    never makes the room wait; sync status line on the TV), TV button only on touch devices with a 3-step explainer;
    then **hidden**: the TV button and `/tv`, `/tv/<code>`, `/tv-test` only work with the lab switch `?tvlab=1`
    (`tv-lab.ts`), the code stays. README rows removed. ROADMAP Phase 2: "TV version with Google Cast" (with the $5
    Cast developer fee, after 1.0).
- [ ] **YouTube rule + one remote** (owner, 2 Nov 2026): nothing of ours over the YouTube player (overlays, a hidden
  player and players under 200 × 200 are against YouTube's Required Minimum Functionality); one remote instead of the
  toolbar + dock. Design page with 8 decisions: https://claude.ai/artifact/LP8aB9RzKFZh3N6sAkEDvG. **Owner's picks
  (2 Nov 2026):** 1B emojis rise from the sender's face (Together card, phone strip; small faces in the fullscreen
  rail); 2A one rail beside the video (window + fullscreen), the toolbar under the video goes, a small "hide the rail"
  button gives the video its full size back; 3A the rail holds the common buttons, details (speed, sync, next, side
  panel…) always in ⋯; 4A changed: the rail appears when the mouse moves and the video shrinks to make room, when the
  mouse rests the rail hides and the video grows back (in fullscreen); 5B notices (who paused, waits, invites, cards)
  go to the chat panel, not over the video ("who paused" is not important: it is in the chat's activity); 6 and 7 stay
  as they are (owner: Watch2Gether shows cameras over YouTube too; cameras / the stream window / the game preview are
  the owner's accepted risk at the audit); 8B film pages and video files keep today's dock over the film, hiding when
  idle. Also: the desktop room bigger (less empty space, bigger video even in the window, like Shorts), the join card
  (name + avatar) bigger. Steps: [x] 0.9.92.7 bigger room + join card; [x] 0.9.92.8 one rail (2A 3A 4A); [x] 0.9.92.9
  emojis from faces (1B) + notices in the chat (5B); [x] 0.9.93 owner's follow-up (2 Nov 2026): the rail opens when the
  mouse reaches the video's right edge and closes as soon as it leaves (not on every move), "Keep the controls open"
  pin in ⋯ + Settings → My screen replaces "Hide the controls" (the owner couldn't find the way back), emojis fly over
  the video again (1B undone: "they don't touch the content"); the notes stay in the chat (5B).
- [x] **0.9.92.6 phone feedback:** recap fits, Shorts chat half height, feed window (♾ opens it, Stop inside), camera
  row (no cameras in faces, no camera windows), real fullscreen + ⛶ in the strip + side panel in fullscreen, keyboard
  is not "sideways", one share sheet.
- [x] **0.9.93.1 bug sweep + easier start** (owner, 2 Nov 2026: "a general bug test, things that make it easier for
  users, an invite screen when I enter the room with a QR code like other watch sites; fix visual breakages; check
  Shorts, the add-to-queue part looked bad"). Screenshot sweep (home, join, room, search, settings, Shorts and its
  windows at 1920×1080, 1366×768 and a phone). Fixed: the Shorts rail's square-button rule squeezed the buttons inside
  its windows ("Add to the queue", "Start the feed" overflowed); ＋ Add ran off the screen once results came; ＋ Add is
  now box + button on one row, with a title and ✕ as a phone sheet; the "can't be played here" note sat lost at the
  top left of the Shorts view (now a small card in the empty bottom left / above the phone bar); "1 people"; the room's
  YouTube results were three cramped columns on a laptop (now two). New: the **invite window** (`ui/invite.ts`: link +
  Copy, share sheet on phones, WhatsApp, QR code, "show this when I'm alone in a room"), opening by itself when you
  enter a room nobody else is in (the first-time tips wait for it) and from 🔗 Invite; a link **pasted anywhere** in
  the room or dropped on the page goes to the queue; messages that came while the tab was in the background show as
  "(3)" in the tab's title. Test: `scripts/harness/invite/run.cjs` (22 checks), `shorts-rail` (+ window checks).
- [ ] **0.9.93.2 (owner's picks from the ideas, 2 Nov 2026; continue from the first open item):**
  [x] the YouTube rail in fullscreen (and the window): a rail window (😀, ⋯, speed, games hall) kept the rail out when
  the mouse went left onto the video, and a click on a YouTube frame never closed it → it closes 450 ms after the mouse
  leaves (not the message box with text) and when the page loses focus to the frame;
  [x] live e2e `draw.mjs` failed twice right after the 0.9.93.1 deploy (the reveal → over alarm late by > 25 s; a re-run
  passed) → Draw & Guess and Quiz move an overdue phase on with any message (the pages ping; Draw & Guess also pings
  once the time is up), the test pings like the pages;
  [x] friendly room names instead of "Room swky86r" (`friendlyRoomName`); [x] "? Shortcuts" card; [x] hand the host
  role to someone (👑 in People / the person menu); [x] "3-2-1, together" countdown before a new video; [x] "continue
  where you left off" on the home page. Not wanted now: the invite with the film time. Tests: `room-extras` harness
  (24 checks), e2e `countdown.mjs`, `host.mjs` (+ handing on), `yt-room` (+ rail windows, fullscreen).
- [x] **0.9.93.3** (owner's screenshots, 2 Nov 2026): the one camera window in fullscreen was narrow (15 % of the screen)
  and stacked the cameras; it is now at least wide enough for up to three side by side (150 px each, at most half the
  screen), in the window too, and the fullscreen default is wider (26 %). The "1.00" on each camera in the owner's
  screenshots is not ours (no such text in the code): most likely a video speed extension in the owner's browser that
  labels every video. Test: `scripts/harness/cam-fs/run.cjs` (fails on 0.9.93.2 with the owner's stacked layout).
- [x] **0.9.93.4** (owner's screenshot, 2 Nov 2026: "messages from the side like normal, not from the bottom"): in
  fullscreen chat messages over the video sat at the rail's foot, over YouTube's own bar (settings / fullscreen
  buttons). They now come down from the top right, just left of the rail, as in the window. Test: `yt-room` harness
  (+ 2 fullscreen message checks).
- [x] **0.9.93.5** (owner's screenshot, 2 Nov 2026: in fullscreen the rail stayed while YouTube's bar had gone): after
  a click on a rail button (⋯, 😀) and any key press (Esc, a shortcut) the button counted as keyboard focus and held
  the rail out for good. The rail now lets go of the focus when the mouse leaves it; only Tab users keep it. Test:
  `yt-room` harness (+ 2 checks, both fail on 0.9.93.4).
- [ ] **Ideas waiting for the owner's pick** (Claude's proposals, 2 Nov 2026; small ones were built above): (1) a
  friendly room name by default instead of "Room swky86r" (the owner names things); (2) "? Shortcuts" card listing
  the keys; (3) hand the host role to someone from the person menu; (4) a "3-2-1, together" countdown before the first
  play; (5) a "who joined" note in the tab's title too; (6) the invite window also offering "invite with the film
  time" when a film time is set; (7) a "continue watching" row on the home page for the last room.
  (8) **Debug panel** (owner, 3 Nov 2026): one hidden panel (e.g. `?debug=1`, never shown to normal users, no personal
  data) that gathers the existing pieces (`/connection` connection test, `?measure=1` Shorts measurement, `?tvlab=1`) plus
  version / environment / transport, sync stats, recent errors with a "copy" button, feature switches and "start as a
  first-time visitor", so the owner can test from the phone without a computer. Fits with the kill switch (ROADMAP §6).
  **Planner, 2 Nov 2026:** (1), (2), (3), (4), (7) were built in 0.9.93.2. Proposed to the owner on https://claude.ai/artifact/9AJXCNuwBojdibzZaX1baw: (8) debug
  panel → 0.9.94 (card under "Proposed" in `CARDS.md`); (6) → 0.9.95; (5) → not planned (the "(3)" unread count is
  already in the tab title). **Owner agreed (2 Nov 2026):** (8) → card 12, (6) → 0.9.95, (5) not planned. His new thing after the phone version is
  **cinema mode** (card 14).
  (9) **More players without the extension** (owner, 2 Nov 2026, from Watch2Gether's source menu): besides YouTube,
  play other services' official embeds on the site itself (no extension): e.g. Vimeo, Dailymotion, Twitch, SoundCloud /
  Mixcloud, podcasts, web radio, Coub, a GIF search; a source picker next to the search box ("Search in: YouTube ▾").
  Each one needs its embed / player API, terms and sync support checked first (Research). Planner: after 1.0 or
  0.9.95+, owner decides once the research is in.
  (10) **Window Garden's "film ended" seed** (Developer B, BH2, 4 Nov 2026; a game rule, so the owner's pick): today
  the seed only comes if the garden window is open in the film's last 10 s, and skipping ahead to the end also earns
  it. Options: A keep as is · B the seed whenever a film of ≥ 20 min ends while I'm in the room (game closed too) ·
  C only if most of the film was really watched. Planner's pick: B (simple, fair, no tracking of what was watched).
  (11) **Saved-room "yours" mark after a hand-over** (Developer A, BH4, 4 Nov 2026; cosmetic): after "Make host" (or
  after acting as host while the host was away) the old host's saved-room row stays marked as theirs (`mine` is
  sticky), so its ✕ warns "removing also unsaves the room" while the server rightly refuses that unsave. Planner: a
  small fix card for the next lane slot (clear `mine` on a `members` update that names another host, without flicker).
  **Done in 0.9.97.27 (BH6):** `mine` follows the host each time the room is entered; harness `saved-host`.
  (12) **A TV can keep the host role** (Developer A, BH4; TV lab only, frozen): if the host's TV stays connected after
  their phone / computer leaves, the TV holds the role and knock cards / host actions reach nobody. Planner: fix with
  the Google Cast TV version after 1.0 (ROADMAP Phase 2), not now.
- [x] **Another new thing after the phone version:** cinema mode (owner, 2 Nov 2026; card 14 in `CARDS.md`).
- [ ] **Phone version from scratch** (owner's picks 2 Nov 2026: 1A 2B 3A 4B 5A 6B 7A 8A 9A 10A 11A, "everything must fit
  our site"). [x] **0.9.92.3 step 1, the room as an app screen** (video edge to edge, faces strip with cameras, chat,
  😀 / ＋ message box, ＋ / ⋯ / Add-a-video / People sheets, settings full page, back button closes sheets; phone
  harness rewritten, 40 checks). [x] **0.9.92.4 step 2:** Shorts full height (5A: one slim bar with faces, the newest
  message, 💬 😀 ▲▼ ⋯) + sideways fullscreen dock (4B: a slim column beside the video); phone harness 53 checks. [x] **0.9.92.5 step 3:**
  full-screen games (10A), app start page (11A), first speed steps (no blur / drifting background on phones, YouTube only
  with the first video, the recap loaded when needed); phone harness 61 checks. [ ] Speed, next: lazy voice / stream
  code, a phone-only stylesheet, an automatic phone speed test (4× slower CPU) against the built site.
- [ ] (original request) **Phone version from scratch** (owner, 1 Nov 2026: "I don't like the phone version; it feels like the PC page
  squeezed onto a phone. Make it feel like an app, every feature fitting the screen, and fast"). First a design page
  with options per part (join, watching, Shorts together, chat, voice / cameras, queue / add, games, menus, speed),
  the owner picks, then the phone layer is rewritten without breaking features or the design principles.
  Options page: https://claude.ai/artifact/MsCuFRZjQ6EyDAX8YFtEQu (11 parts + speed plan; waiting for the picks).
- [ ] **Shorts: a feed from one channel; Discover by region** (owner, 1 Nov 2026, before 1.0).
- [ ] **Thanks page** (owner, 1 Nov 2026): the people who helped by testing; names only with their permission.
- [x] **0.9.92.2 bigger Shorts view on laptops** (owner chose C on https://claude.ai/artifact/FDEUP6Msgo6UbxYtAu9379):
  the Shorts bar is a rail right of the video above 860 px wide, the top bar folds under 900 px tall (⋯ or the top
  edge shows it); laptop 1366×768: video 410×728 (was 314×558), no page scroll at 1024×640 … 2560×1440; phones keep
  the bottom bar. Harnesses: phone, TikTok 8/8, voice 67/67.
- [x] **Tablet support** (owner, 31 Oct 2026, ROADMAP §1): own layout for iPad / Android tablets, separate from phones.
  Done in 0.9.96.10 (card T, owner's B): upright = video on top, chat | Together + Queue / People below, no scroll;
  sideways = the computer layout. Harness `scripts/harness/tablet/run.cjs`. The owner's real tablet is a hand test.
- [x] **Owner's guide PDF** (31 Oct 2026): everything to try, the plan to 1.0, risks and never-tested areas were sent
  to the owner as a PDF; the same items live in "Owner's hand tests" below and in ROADMAP.
- [x] **0.9.92 hotspot: the room didn't connect over the owner's phone hotspot** (owner, 31 Oct 2026: "important"; the
  phone's own data works). Research + options + decision in `hotspot-connection.md`: most likely the tethered TCP path
  loses full-size packets (MTU black hole / carrier tethering policy) while the page itself arrives over HTTP/3 (UDP);
  WebSockets always need a new TCP connection. Built an **automatic HTTP fallback** (`socket.ts` + server
  `fallback.ts`): WebSocket not open in 6 s → the same room over held GET + POST batches (same messages, rules and
  limits; games too), remembered for the tab, back to a WebSocket by itself when a probe opens. `/connection` now also
  tests a 200 kB answer, a tiny WebSocket and the fallback, and prints a `guess:`. A reload hands the member id to the
  next page (`swm:prev:<room>`). Tests: e2e `fallback.mjs`, unit `socket.test.ts`, harness `hotspot/run.mjs`.
  **Owner confirmed it works on his hotspot** (31 Oct 2026). **0.9.92.1:** `/connection`'s guess counts any HTTP/3
  request (the page's own entry is empty behind the service worker); CLAUDE.md rule "speaking Turkish never makes the
  work Turkish"; English test data in the new tests.
- [x] **0.9.91.20 first-time path** (PDF item 1; partial until the extension is in the store): one join screen
  (who is waiting + what is playing from `/api/rooms/:id/info` `people` / `count` / `playing`, avatar button next to the
  name, no separate avatar step); 3 short tips the first time in a room (invite → add a link / search → join voice,
  `ui/first-tips.ts`, `tipsSeen`); "Filme git" card notices a freshly installed extension by itself (the extension's
  new `scripting` permission injects `site-bridge.js` into open site tabs on install; the card flips to "Filme git" with
  "✓ Eklenti kuruldu!"). Left for the store version: one-click install link on that card.
- [x] **0.9.91.19 TikTok links** (PDF item 2, part 2): TikTok video links (and vm. / vt. short links, resolved by the
  Worker) play in TikTok's official embed player in the Shorts view, synced through its postMessage API, at 1×, looping
  like a Short; titles from TikTok's oEmbed; privacy policy "TikTok videos" (+ Discover / More like this). Harness
  `tiktok/run.cjs` 8/8 with a stand-in player (the cloud can't reach tiktok.com): **the owner tests a real TikTok**.
- [x] **0.9.91.18 finish Shorts, part 1** (owner, 31 Oct 2026: PDF item 2 "go all in"): YouTube's own bar in the
  Shorts view and nothing of ours over the player (owner: "its player; our menu is at the bottom"; YouTube's rules);
  emojis rise from the seats; 🎲 Keşfet (shared daily pools per category) and ✨ Bunun gibi (same channel, then title
  words) in the ♾ popup; `?measure=1` shows the switch time per Short (the owner measures with a friend; then decide on
  a hidden preload player); phones: the IP line is hidden in the Together card (it pushed the chat box off screen).
  Next: the room view's YouTube overlays (flying emojis / dock / toasts over YouTube, before the API audit), then PDF
  items 3–6 (simplify the room, camera pass, help / FAQ, "send feedback") when the owner says.
- [ ] **Browser support research** (owner's priority, 31 Oct 2026): separate session
  `session_015Fyri68eMHWNiGtk1pUdpw`, branch `claude/browser-support-research` (PR, then the owner decides what to
  build). Then the feature plan to 1.0 in this order (ROADMAP §1 "Feature plan to 1.0"): first-time path → finish
  Shorts → simplify the room → camera pass → help / FAQ → "send feedback".
- [ ] **Shorts: do everyone land on the next short together?** Measure in the owner's Chrome (needs real YouTube
  playback); then decide on a hidden preload player.
- [ ] **Remind the owner before the 1.0 submission** (owner's request, 29 Oct 2026): test the extension in **Brave and
  Edge** (install the zip, one room with a friend: room view, play/pause, voice, fullscreen; Brave Shields on).
  Full checklist: "Owner's hand tests" below; research: `docs/internal/browser-support.md`.
- [x] **Browser support research** (31 Oct 2026, `browser-support.md`); owner: "do the recommendations" →
  **0.9.91.17**: "your browser blocks direct connections" hint (`ice-watch.ts`, harness `voice/blocked.mjs`),
  extension page lists Opera / Vivaldi and says the site works in Firefox / Safari + a "voice doesn't connect" FAQ,
  Edge Add-ons steps in `web-store.md`. Left for the owner: the hand tests below, the Microsoft Partner Center account.
- [ ] After 1.0 (owner decides): Firefox extension (L), TURN relay (Phase 2). Not planned: Safari extension, Opera's
  own store.

## Design sweep (card 16): what was found and what happened
From Design's `docs/internal/design/sweep-1.md` and `sweep-2.md` plus lane A's own screenshots.
**Sweep 1 (0.9.96.8):**
- Fixed: `/connection` buttons wrap on a phone (#1); each check is a grid row, its value on its own line (#2); a bare
  "?" is now "—" (#3); the join card fits a sideways phone (#4); "Fullscreen when turned sideways" is hidden on phones
  where it does nothing (#5); the link box placeholder is short enough not to be cut ("Search YouTube or paste a
  link") (#6); the EN example name is "Alex paused" (#7); the room's side cards are opaque in scene themes (#9); the
  home preview's bubbles are opaque (#10 / #12, contrast); primary buttons pass AA in Gece (#6a4cf2 behind white,
  5.4:1) and Neon (dark text) (#13); no ad-blocker tip under the room; the invite line wraps without a lone word.
- Closed by the owner: #8 one English room name for everyone (pick A).
- Moved: #11 (empty space under the phone home) and the Sinema beam over the home heading (#10) go to card 15b (new home).
- Kept on purpose: 🎙 / 📷 red before joining voice (owner's choice, 0.9.91.12). #14 ("You" under my face) reads fine
  by eye.
- Idea for the owner's list: a sideways phone in an empty room could keep faces / chat until a video starts.
**Sweep 2 (0.9.96.9):**
- Fixed: XOX and Connect Four open in the video's place on a computer (they opened as a free window over the chat) (#6,
  room games); the game head: no play-logo with its badge, the title takes the free width and the buttons go icon-only
  first (#4, #7); empty seat "Waiting…" with a dashed circle instead of "… ? O", names use the free width (#5); the
  Draw & Guess lobby / podium on a solid card (#8); a loading player is black, never white (#3); the stream window
  floats on the page in the Shorts view (it ran off the right edge) (#2); the room no longer scrolls by 1 px (#10); on the
  film page in fullscreen our notes and messages start below the film's own top bar (#12); a calmer stream frame.
- Already fixed by card 6g: #1 (cameras squeezing the chat: they start in their own window now).
- Open after sweep 2: Snack Bar's smallest text in a free window (#6, lane B's GP card).
**Part 3 (0.9.96.11):** #9 the XOX / Connect Four page sits in the middle of a phone's height (the board already used
the full width; the empty band under it is gone); #11 the film page's room view grows like the site's "bigger room"
(no 1280 px cap, the side panel grows with the screen, the video card up to the hole's height cap); a sideways phone
in an empty room keeps the faces and the chat on the right (Design's sweep-1 idea, Planner approved); and a regression
from 0.9.96.9 that the embed harness under xvfb caught: the black loading background on `.player` also painted the
film page's hole, so a flying emoji or a fullscreen message over the film was a black box (fixed: not in
`shell-film`; embed 111/111). Found on the way: a video link that fails to load shows its error card and the room
then scrolls by 7–34 px on a computer (minor, proposed for the next sweep).
**Sweep harness:** `scripts/harness/sweep/run.cjs` (home, join, empty room, room with a video, settings, invite,
`/connection`, help, privacy, thanks × 1920×1080 / 1366×768 / 1024×640 / 390×844 / 844×390 × EN + Gece / TR + Sinema (phones
Okyanus): 100 screenshots, checks for sideways scroll, nothing past the right edge, console errors, and no page scroll
where a screen must fit). It found the Thanks page scrolling on a sideways phone: fixed.

## Owner's hand tests (things only the owner can try; ask Claude "what should I test?" and it reads this list)
Saved 31 Oct 2026. Tick items here (or tell Claude the result and it ticks them). The owner talks Turkish; Claude
explains each step in Turkish when asked. Details and reasons: `browser-support.md`.

**Next round, start here (BH10, 0.9.97.56, 4 Nov 2026).** Everything a script can check was run in the cloud
(every harness, the screenshot sweep at five sizes in EN + TR, the Test Lab's fake friends for knock, Make host and
private messages). What is left needs a person: real YouTube playback, a real mic and camera, your phone, and the
extension in other browsers. One sitting, in this order, with one friend in Chrome on another computer (or your phone
as the second person). Tick here or tell the Planner; the older lists below stay for detail.
- [ ] 1. YouTube together (computer): you create a room, the friend joins by the invite link; play a YouTube video:
  "3-2-1" starts you both together; pause, seek, change speed from each side; you stay in step (under a second).
- [ ] 2. Fullscreen (computer, YouTube): the rail comes at the right edge and goes when the mouse leaves; Enter opens
  the message box; the friend's messages come in on the right, below the box, never over YouTube's own bar.
- [ ] 3. Voice + camera (computer): both join voice, hear each other clearly (no echo), mic on / off, cameras on;
  ⟳ reconnect or a page reload keeps you in voice with the mic as it was.
- [ ] 4. Screen share: share a tab with sound; the friend sees and hears it; reload the friend's page: the stream comes
  back by itself.
- [ ] 5. Knock + host (two people): turn on "Ask before letting people in", the friend opens the link in a fresh
  browser: you get "Let in / Refuse"; let them in; 👑 Make host to the friend: now they get the next knock card.
- [ ] 6. Private message: press the friend's name in the chat, write: only they see it (a third person does not).
- [ ] 7. A game table with the friend (Classics: Turkish dama, then Quiz): play to the end, a rematch, leave the
  table; a sound on each move.
- [ ] 8. Your phone (Android or iPhone, the friend on the computer): join by the QR code, the YouTube video plays in
  sync, turn the phone sideways → ⛶ fullscreen, chat sheet, 🎙 voice for a minute (hear and be heard), back upright.
- [ ] 9. Your phone, Shorts: the friend adds a Short; swipe up / down to the next: both move together.
- [ ] 10. The extension in Chrome on a film page (a legal demo player, e.g. the Video.js or Plyr demo): "Go to the
  film", the room view, sync with the friend, voice on the film page (the permission window appears once).
- [ ] 11. The extension in Edge, then Brave, then Opera (the detailed list below, "Before the 1.0 store submission"):
  at least steps 1, 2, 3 and 6 of it in each.

**Before 1.0, on the owner's own phone (added 3 Nov 2026):** the 20 no-code release tests listed (in Turkish) in the
owner's guide repo `alperenakturk/my-awesome-list`, `is-akislari/yayina-hazirlik.md` part C: airplane mode, cold
start, dark mode, largest text, keyboard on every field, first open, back button, sideways, delete confirmation,
offline actions, error texts, permission reasons, data deletion, close buttons, heat / battery over 10 minutes,
storage, phone language, hand it to someone, remove and reinstall the PWA. When asked "what should I test?", turn
these into a Sidelit-specific list.

**Before the 1.0 store submission: the extension in Edge, Brave and Opera** (zip from the site, a friend in Chrome, a
legal demo player page such as a Video.js or Plyr demo for the film page). For each browser:
- [ ] Edge · [ ] Brave · [ ] Opera — 1. install: Developer mode → Load unpacked (`edge://extensions`,
  `brave://extensions`, `opera://extensions`); the icon and popup appear.
- [ ] 2. room on the site: friend joins; YouTube plays; play / pause / seek stay in sync both ways.
- [ ] 3. voice: both hear each other; mic on / off; 🎛 lists my microphones (speakers too).
- [ ] 4. camera on, both see each other. 5. share a tab with sound, friend sees and hears it.
- [ ] 6. film page: open the demo link → "Filme git" → the room view appears, the video sits in its place, sync works.
- [ ] 7. voice on the film page: the small permission window appears once, friend hears me.
- [ ] 8. fullscreen on the site and on the film page; the dock on the right shows and hides.
- [ ] 9. sound: someone joins voice → a soft sound.
- [ ] Brave only: Shields on (default) for 2–8; then Settings → Privacy → "WebRTC IP handling policy" → "Disable
  non-proxied UDP" → join voice → the room must say "Tarayıcın doğrudan bağlantıları engelliyor…"; set it back to
  "Default".
- [ ] Edge only: Settings → Privacy → Tracking prevention "Strict" → repeat 2 and 6.
- [ ] Opera only: built-in ad blocker on → 2 and 6; Opera VPN on → join voice → the "blocks direct connections" note
  should appear (tell Claude what happens); VPN off again. Opera GX: GX Control limits on, room tab 10 min in the
  background, come back.
- [ ] Write down each browser's version (`edge://version`, `brave://version`, `opera://about`).

**Website without the extension in Firefox and Safari** (no rush; before 1.0 if a Mac / iPhone is at hand):
- [ ] Firefox (PC): room, YouTube sync, chat, a game, voice + camera with a friend, screen share (picture only, no
  sound expected), fullscreen, sounds.
- [ ] Safari (Mac, if available): the same.
- [ ] iPhone (any browser, they are all Safari inside): room, YouTube, voice, our fullscreen, "Add to Home Screen".

**0.9.91.18–0.9.91.20 (Shorts + first-time path; real YouTube / TikTok needed, the cloud can't play them):**
- [x] Shorts view tried by the owner (1 Nov 2026): all fine (the new rail of 0.9.92.2 still to try).
- [x] ♾ → 🎲 Keşfet works (owner, 1 Nov 2026). Wanted before 1.0: a feed from one channel, Discover by region (ROADMAP §1).
- [ ] ♾ → 🎲 Keşfet: each chip (Popüler, Müzik, Oyun, Komedi, Hayvanlar, Spor) fills the queue with Shorts.
- [ ] ♾ → ✨ Bunun gibi while a Short plays: more Shorts from the same channel, later similar titles.
- [ ] Shorts view: YouTube's own bar on the video, our bar only at the bottom; emojis rise from the seats.
- [ ] With a friend, open the room once with `?measure=1`, switch Shorts with ▲▼ ten times, tell Claude the ms numbers.
- [ ] Paste a TikTok link (`tiktok.com/@…/video/…`) and a short `vm.tiktok.com/…` link: both play in sync, loop.
- [ ] A friend opens your invite link in a fresh browser: one screen ("X seni bekliyor"), name + avatar, in; the 3 tips.
- [ ] Without the extension, open a film page in the room → the install card; install the zip, come back to the tab:
  the card says "Filme git" by itself.

**0.9.97.60 (privacy card H3 + M7: the privacy policy for KVKK + GDPR):**
- [ ] Read the new privacy page (footer → Privacy, Turkish and English): you are named as the data controller with
  screenwithme.app@gmail.com, age 13+ (under 16 with a parent's permission), and the join screen's names are explained.
  Anything that reads wrong or promises more than you want, tell the Planner.
- [ ] Before the store submission: a lawyer reads the policy (and the terms of use, once they exist).

**0.9.97.58 (card EXT1: games, the rail and fullscreen on the film page; update the extension from the site first):**
- [ ] On a film page in the room view: the rail's 🎮 opens the games hall over the film (it used to be invisible). Open
  Classics, play XOX against Glowbeam; open Snack Bar from "On the side" and serve a few customers.
- [ ] Film page fullscreen (our ⛶ or the film's own): bring the rail out at the right edge, then move the mouse back to
  the middle of the film at a normal pace: the rail goes within half a second, without pause / play. Do the same in
  the window (from the chat across the rail to the middle of the film).
- [ ] The film's own ⛶ (on a site whose player is in the page and on one whose player is in a frame, e.g. an embedded
  player): it opens the room's fullscreen (the rail on the right, our messages); pressing it again leaves fullscreen.
  Also try the browser player's own fullscreen button in the video's controls: it opens our fullscreen too.

**0.9.97.56 (BH10: every harness on main, the owner's next round):**
- [ ] Your bug: ⋯ → "Keep the controls open" (or Settings → My screen). In the normal window (not fullscreen) play a
  video (YouTube, a video file, the sync test, a film page with the extension), move the mouse onto the chat and wait:
  the rail on the right stays open, the video ends at its edge. Turn it off again: the rail rests as before.
- [ ] The rest only updates test scripts. Start the next round from "Next round, start here" at the top of this list.

**CAM1 (cameras on phones, from the owner's test with a friend):**
- [ ] Two phones and a computer in voice, every camera on: everyone sees everyone (no black picture on either side).
- [ ] On a phone, press 🔄 in the faces strip (it shows while your camera is on): the others see "Camera changing…"
  for a moment, then the other camera within about a second; your camera never goes off for them.
- [ ] With the rear camera, move something to the left: your own preview moves left too (only the front camera is a
  mirror).
- [ ] Lock a phone for 10 s, unlock it: within a few seconds the others see that phone's camera again (at most a short
  "Waiting for the picture…" note).
- [ ] The phone's camera row: two pictures side by side, names readable; tap one: the sheet shows it big with its
  buttons on screen.

**0.9.97.55 (🐞 Test Lab, step DL5: 🧪 Scenarios):**
- [ ] In a room with `?debug=1` on (alone, as the host): 🐞 → 🧪 → ▶ Run on each scenario: "Two people", "Everyone
  ready", "Knock", "A private message", "My connection drops". Each line turns ✓ (the self-test turns ✗ on purpose);
  the fake friends leave by themselves afterwards. Tell the Planner any ✗ with its reason.

**0.9.97.54 (🐞 Test Lab, step DL4: 🎬 Video & network):**
- [ ] In a room with `?debug=1` on, add a fake friend (👥) and start the sync test. Then 🐞 → 🎬: "drop my connection"
  (the room dot turns yellow, after 6 s it is green again and the friend is still there), "the server restarted"
  (reconnects at once), "slow (latency)" (a message you write arrives late; Undo), "force the HTTP fallback"
  (still works; "back to normal"), "drift +3 s" (the counter jumps, then comes back in step), "stall for N s" (the
  room waits for you, then plays on).

**0.9.97.53 (card BH8: the backup connection's idle sessions):**
- [ ] Nothing new to see. If you ever use the room over the phone hotspot again: the room keeps working for everyone
  while someone on the backup connection closes their tab.

**0.9.97.80 (card YTK: "Play now" in the Shorts add window, ← / → in the room view):**
- [ ] In the Shorts view press ＋ Add, paste a Short's link and press "▶ Play now": it opens for everyone at once.
  Paste two links and press it again: the first plays, the second is in the queue. Type words and press it: the first
  Short found plays.
- [ ] In the room view with a YouTube video, click the video, then press → and ←: the video jumps 5 s ahead / back on
  your friend's screen too. Enter still opens the chat; in the chat box the arrows only move the cursor.

**0.9.97.77 (cards PERF1 + PERF1c: speed pass, big podcast feeds):**
- [ ] Search a podcast with a very long history in the link box (🎧 Podcasts) and open the show: its newest
  episodes list as quickly as any other show's.

**0.9.97.76 (🎮 card GHOST: game tables notice a dead connection):**
- [ ] Play Draw & Guess or the Quiz with a friend on a phone; the friend turns the phone's Wi-Fi and mobile data off
  mid-game. About a minute and a half later the friend shows offline at your table, and the game goes back to the
  lobby 20 s after that. Turning data back on brings the friend back.
- [ ] Leave a game table open in a tab, switch to another tab for 10 minutes, come back: you are still at the table
  (nobody saw you leave).

**0.9.97.75 (card R3-3: ready for an own domain):**
- [ ] Nothing new to see: everything stays on the same address. The switch-day steps (buy the domain, then two short
  releases) are in `docs/internal/custom-domain.md`.

**0.9.97.74 (🎮 card YTG: no game window over a YouTube video, computer):**
- [ ] With a YouTube video playing, open Classics or Sea Battle: the window opens beside or under the video, never on
  it; in the window's place menu "in the video's place" is off and says why. Fullscreen: the game tucks away.
  With a video file instead, "in the video's place" works again.

**0.9.97.73 (🎮 games polish 3: Quiz / Draw result card, one hint style, smarter chess):**
- [ ] Finish a Quiz or a Draw & Guess with a friend: the result card shows Glowbeam, who won (or a tie), his line and
  the podium; whoever started the game sees "▶ Play again", the other sees "Waiting for … to start". "👁 Settings &
  scores" puts the card away. On the phone too.
- [ ] Short messages in Snack Bar, Window Garden, Quiz and Last Heart look the same (a dark pill with a gold ring at the
  top of the game).
- [ ] Classics → chess against Glowbeam on medium: he answers in under a second as before and now spots a knight fork.

**0.9.97.72 (card LABTR: the 🐞 Test Lab in plain Turkish):**
- [ ] With the site in Turkish, open the 🐞 Test Lab: every tab, button, status line and command is Turkish and plain
  ("Bağlantımı 6 sn kopar", "Videom 3 sn geride kalsın", "Saat farkı"); green / yellow / red dots show what is fine.
- [ ] Switch the language (profile menu): the open lab changes language at once.
- [ ] Ctrl+K, type "kopar" (or "baglanti"): "Bağlantımı 6 sn kopar" is found; Enter runs it.

**0.9.97.71 (🎮 games polish 2: one result card, Glowbeam the referee):**
- [ ] Finish a Classics game (any board) or a Sea Battle: one card comes up over the board: Glowbeam (cheering when
  you win), "You won!" / "Glowbeam won" / "A draw", the score, Rematch / Play again inside it. "👁 See the board" puts
  it away so you can look at the final position; Rematch stays under the board.
- [ ] Glowbeam beside the board reacts: "Nice capture!" when you take a piece, a gasp when you lose one, "Check!" in
  chess, a jump at a hit and a sunk ship in Sea Battle. The bubble goes by itself.
- [ ] The picker, the board and the battle fade in softly; with "reduce motion" on in your system nothing moves.

**0.9.97.69 (card LABLOCK: the 🐞 Test Lab needs your code):**
- [ ] Add the `LAB_CODE` secret (GitHub → Settings → Environments → production → Environment secrets), then after the
  next deploy open the live site once with `?debug=YOUR-CODE`: the 🐞 appears and the code leaves the address. Later,
  `?debug=1` in that browser is enough for 30 days.
- [ ] In a private window (no pass) `?debug=1` and a wrong code show no 🐞.

**0.9.97.68 (🎮 games polish 1: phones, Glowbeam, How to play):**
- [ ] On the phone, every button in a game is easy to hit (the window's head, the chips, the "?").
- [ ] Sea Battle on the phone: the first tap on their sea aims (a gold crosshair, "Aiming at C7", a 🎯 Fire button);
  a second tap on the same cell or Fire shoots. On the computer one click still shoots.
- [ ] Classics against Glowbeam: medium no longer leaves pieces to simple captures; easy plays weaker but never just
  gives a piece away.
- [ ] The first time you open a Classics board, Sea Battle, Quiz or Draw & Guess, picture cards explain it; the "?"
  (window head; on the phone in the game's own bar) shows them again. In Turkish too.

**0.9.97.66 (card TOS: the terms of use):**
- [ ] Read the new terms page (footer → Terms; join card and profile menu too), in English and Turkish: Turkish law and
  Istanbul (Çağlayan) courts, 13+ (a parent's permission under 16), "as is" without a money cap, abuse reports by
  e-mail with the subject "Report" answered within 72 hours. Anything that reads wrong, tell the Planner.
- [ ] Help page → "Report someone or something in a room": the steps make sense.
- [ ] Before the store submission: a lawyer reads the terms with the privacy policy.

**0.9.97.65 (🎮 ⚫ Reversi on the Classics shelf):**
- [ ] 🎮 → Together → Classics: the picker has a sixth card, Reversi. Pick it: 8 × 8 on green felt, two discs each in
  the middle, four gold dots on my first turn.
- [ ] Alone: Glowbeam (easy / medium) sits down. Tap a dot: the disc goes there and the line between turns over; my
  disc count shows beside my name; Glowbeam answers. With no legal move, the status line says who passes.
- [ ] With a friend: play to the end; the side with more discs wins, the score counts it; Rematch swaps who starts.
- [ ] Turkish: the card and texts read naturally.

**0.9.97.63 (🎮 card GT: game windows on tablets):**
- [ ] On a tablet held upright, open a game (Classics, Sea Battle): its small window opens above the chat, over the
  video, as big as that space allows; the chat and the top bar's buttons stay free. Drag it: it stays out of the chat.
- [ ] The same tablet turned sideways: the window opens left of the side panel, never over the chat.
- [ ] A computer and a phone: nothing changes.

**0.9.97.62 (the home door "📱 Scroll Shorts together"):**
- [ ] On the home page (computer and phone): "📱 Scroll Shorts together" under Create / Join, with "Swipe YouTube Shorts
  and TikToks with friends, in sync. Anyone can swipe." (Turkish: "Shorts'u birlikte kaydır").
- [ ] Press it, enter your name: the room starts playing popular Shorts in the Shorts view by itself, ♾ shows the feed
  running; invite a friend, both swipe ▲▼. A plain "Create room" still opens an empty room.
- [ ] On a tablet held upright: a game opens as the small window (like on a computer); drag it by its head out of the chat.

**0.9.97.61 (🎮 Sea Battle, a new room game):**
- [ ] 🎮 → Sea Battle with a friend: you both see only your own fleet; move a ship (tap it, then tap water), turn it,
  shuffle, then Ready. Shoot in turns: a splash for a miss, a thud for a hit (shoot again), a fanfare when a ship sinks.
- [ ] The friend never sees your ships until the game is over; then both fleets show. Play again: the other shoots first.
- [ ] Alone: "Play Glowbeam" (Easy / Medium) and play a whole game; Medium follows a hit along the ship.
- [ ] On your phone: one sea at a time with "Their sea / My sea"; it turns to their sea on your turn.

**0.9.97.59 (🎮 card CL2: the Classics redesign + "switch game at any time"):**
- [ ] 🎮 → Classics: the table opens as a small window showing only the game cards (XOX, Four in a Row, dama, chess,
  backgammon); pick chess: the window takes the board's shape, the board is the biggest thing in it, the other player
  above, you below.
- [ ] Play chess against Glowbeam, then press "Change game" in the window's head mid-game: it asks "End this game and
  change?"; Cancel keeps the game; "End and change" → pick backgammon: a fresh backgammon board. Do it once from every
  board (the owner's bug: stuck after chess).
- [ ] With a friend at the table: you end a running game for another board: the friend sees the new board at once.
- [ ] Each board's look: XOX playful cells, Four in a Row on its blue stand, dama and chess on wood with captured
  pieces beside the names, backgammon with the dice tray under the board.
- [ ] Draw & Guess and Quiz lobbies: one small card in the middle with the players as chips, no settings column.
- [ ] Every game opens as a small window by default; switch one to "in the video's place", close and reopen it: it
  remembers that for that game only. Phones: unchanged (full screen).

**0.9.97.57 (🎮 card BHG: games quality pass):**
- [ ] Quiz with a friend: start a game, the friend reloads their page mid-question: they are back in the same game
  within a few seconds, scores kept (before: the game went back to the lobby for both).
- [ ] Draw & Guess the same: the friend reloads mid-round, the round goes on.
- [ ] Classics against Glowbeam (chess or backgammon): make a move, reload the page: the board comes back as it was,
  you keep your seat. Minimize it (✕), reload: it stays minimized, 🎮 has its dot.
- [ ] On your phone: open chess, dama and backgammon: the board fills the width, both names readable; the Quiz and
  Draw & Guess lobbies show whole without being shrunk.
- [ ] Open Snack Bar, reload: it opens again by itself.

**0.9.97.52 (card SZ: a lighter room page):**
- [ ] Nothing new to see: in a room join voice (the IP notice and the pre-join window open at once), share your screen,
  a friend watches it; a TikTok / Vimeo link and the sync test still play; sounds still play; ? opens the shortcuts card.
  On the film page voice still works.

**0.9.97.50 (security R4-9 + R4-10):**
- [ ] Nothing to see: search YouTube twice for the same words; both work (the second comes from the server's cache
  when the address allows it). The hidden TV pairing stays off on the live site.

**0.9.97.49 (security review 4: R4-2, R4-3, R4-5):**
- [ ] Nothing to see in the room: rooms open and join as before; `/connection` still runs all its rows ("200 kB answer"
  included).
- [ ] Owner's settings (review §5): create the `production` environment (Settings → Environments) and move the deploy
  secrets there; turn on private vulnerability reporting. The deploy keeps working before and after.

**0.9.97.47 (image upload budget across rooms, security R4-1):**
- [ ] Nothing to see in normal use: in a room add a custom emoji (😀 → 🖼️ Add) and paste a picture into the chat;
  both still appear for a friend. (The new limit, about 70 full-size pictures per address and day across all rooms,
  only stops scripts.)

**0.9.97.45 (🐞 Test Lab, step DL2: fake friends):**
- [ ] In a room with `?debug=1` on: 🐞 → 👥 → ＋ Add three times: three 🤖 people join (faces in Together). Press their
  buttons: 💬 say, 😀, Pause / Play, +30 s, ⏳ stall (the room waits for them), ↺ leave & back, 👑 host. 🗣 Chatty: they
  write by themselves. Start the sync test with them: it plays. Turn the lab off: they all leave.

**0.9.97.44 (🐞 Test Lab, step DL1):**
- [ ] Open any page with `?debug=1`: 🐞 bottom left; Ctrl+Shift+D (or 🐞) opens the lab on the right, the room makes
  room for it. In a room: 📊 Status shows the versions, the connection, the clock offset and a drift line; 📜 Log shows
  your messages going out and coming back. Ctrl+K: type "mark", Enter, then Undo. "🐞 This is a bug" shows a text;
  Copy and paste it to the Planner. On the phone it is a sheet from the bottom. `?debug=0` turns it off.

**0.9.97.43 (messages below the message box in fullscreen, card R25):**
- [ ] In fullscreen (YouTube, a video file, a film page), press Enter to open the message box and leave it open; let a
  friend write a few messages: they come in below the box and its 💬 button (about half way down the video), stack
  downward, and never cover the box, the button or the player's bottom bar. Size as before.

**0.9.97.42 (shortcuts right after a click in the player, card R26):**
- [ ] In a room with a YouTube video, click on the video (play / pause), then press Enter at once: the cursor is in the
  message box. The same with 1 (an emoji), P (pin) and T; in fullscreen too. YouTube's seek bar, ⚙ settings and
  captions still work by mouse. On a film page with the extension: click on the film, press Enter: the message box
  opens (also in fullscreen) and stays open while you type.

**0.9.97.41 (home screens filled, avatar picker without tabs, cards 15f + R27):**
- [ ] Home page: each screen's orange picture reaches its frame (no dark band along the top or left), and there is no
  empty strip left of Glowbeam; the text and the art still look balanced.
- [ ] Open the avatar picker (join card or profile): no tabs, every avatar in one mixed grid, the same order each time
  (and on your phone); pick one with OK or a double click.

**0.9.97.38 (Opera Night theme removed, stream beside the faces, cards R22 + R23):**
- [ ] 🎨: no "Opera Night" any more; if you had it, you now see Gece.
- [ ] With a friend, share your screen: in the Together card "🔴 You're live · 👁 0/4", End stream and the quality now
  sit right of the faces; the chat below keeps (almost) all its room. Your friend sees "🔴 … is live" and Watch stream
  in the same place. Before a stream the card looks as before.
**0.9.97.36 (the film page keeps a new name, BH7):**
- [ ] In a room on the main site change your name (profile → name), then open a film page in the room with the
  extension: your friend sees you with the new name on the film page, never the old one.

**0.9.97.34 (bigger chat messages in fullscreen, card R21):**
- [ ] On a computer, open a YouTube video and a video file in fullscreen; from a second tab write a message: it comes
  in on the right side, about a quarter down the video (not in the very top corner), with clearly bigger text, left of
  the button column. Send five or six quick ones: they stack and never cover the player's bottom bar. Same on a film
  page in fullscreen. A phone looks as before.

**0.9.97.33 (home art: one soft light, a tidy device row, card 15e):**
- [ ] Open the home page on your computer (and at 1366 × 768 if you can): Glowbeam's one cone of light falls on the
  laptop, the tablet and the phone, the laptop brightest; no slab behind them and no line where the light ends; the
  three devices stand in one row with equal gaps, none covering another; the space left of the text, between the text
  and the art, and right of the art looks the same; the phone: the art on top, the phone device not cut off.

**0.9.97.30 (parody avatars removed after the IP audit, card R20):**
- [ ] In a room, open the avatar picker: two tabs, "Themed" and "Genres" ("Temalı" / "Türler"), no Parody tab. Genres
  shows 18 (detective, pirate, astronaut, inventor, ninja, cowboy, vampire, robot, hero, explorer, chef, rocker, ghost,
  alien, samurai, fairy, spy, armadillo) without scrolling; pick one and check it in the chat and the faces strip. If
  you had a parody avatar saved, you now have a themed one instead (once; your other rooms too).

**0.9.97.29 (the owner's test board on our site):** removed in 0.9.97.39 (card R24); nothing to test.

**0.9.97.28 (home art bigger, themed Glowbeam, 🎨 back, card 15d):**
- [ ] On the home page (computer + phone): the laptop, tablet and phone look bigger; 🎨 is at the top right and opens
  the themes; pick another theme and Glowbeam changes its hat / costume. On Help, Privacy, Thanks and the extension
  page 🎨 takes you to the home page with the themes open. Tell us if the black box over Glowbeam's head is still there
  (and which theme / browser).

**0.9.97.27 (saved rooms follow the host, BH6):**
- [ ] Save a room, let a friend in, "Make host" them. On your home page the room's ✕ no longer says it will also
  unsave the room; on the friend's home page it does.

**0.9.97.25 (order of things, BH5):**
- [ ] Open a brand-new room alone in a fresh browser: the intro plays first, the invite window opens only after it,
  and the 3 tips come after you close the invite window. Reload: none of them again.
- [ ] Remove a friend from the room: on their home page there is no "Continue" line for that room.

**0.9.97.24 (two names in one browser, R16 + R17; nothing before you are in, R18):**
- [ ] In one Chrome open the room twice, as "alperen" and "alperen 2": the room says 2 people, each tab sees the other;
  a private message from one to the other arrives (no "not in the room" note). Reload either tab: it keeps its own
  name and both still see each other; leave one tab in the background for 30 min and check again.
- [ ] With "Ask before letting people in" on, a friend in a fresh browser knocks: while waiting at the door they see no
  tips, no invite window and no "continue" line on the home page afterwards; once let in, the 3 tips come.

**0.9.97.23 (home art with three devices, card 15c):**
- [ ] Open the home page on your computer and your phone: Glowbeam's light falls on a laptop, a tablet and a phone; all three bars move together; the three faces are drawn avatars (others after a reload); the phone shows no small words in the art.

**0.9.97.21 (English addresses, card C1):**
- [x] Open an old saved link `/baglanti` and `/eklenti.html`: they land on `/connection` and `/extension.html`. (owner, 4 Nov: /baglanti ok)

**0.9.97.19 (knock fixes from the bug hunt, BH3):**
- [ ] With "Ask before letting people in" on and a friend inside: close your tab; another friend knocks. The friend
  still inside (acting host while you are away) gets the "wants to join" card and can let them in.
- [ ] Someone waits at the door and you turn the switch off: they come in at once.

**0.9.97.16 (game titles in a small window, card R10):**
- [ ] Open XOX, put it in a free window and drag it small: the title still says "Tic-tac-toe" in full (the buttons go to
  a second row), only "· started by …" gets cut.

**0.9.97.16 (one place for each thing, card R9):**
- [x] Computer: ⋯ More shows only the room's things (film time, save, recap, shortcuts, sync test, rules). The profile
  menu shows you (language, move, name, avatar, theme) and one small line "Help · Feedback · Privacy"; nothing is in both.
- [x] Phone: ⋯ shows each tile once; ⋯ → Profile has the language (TR / EN) and the small Help · Feedback · Privacy line.

**0.9.97.16 (the intro for everyone, card R7):**
- [ ] Send the invite link to a friend: when they enter, they see the Sidelit intro (light + Glowbeam) once; a reload
  doesn't show it again. With "Ask before letting people in" on, they see it right after you let them in.

**0.9.97.14 (private messages, card R13):**
- [ ] With two friends in a room: press a friend's name in the chat (or their face → "🔒 Message privately"), write
  something. Only that friend gets it ("🔒 Private · from …"), the other friend sees nothing; ✕ over the box goes back
  to the room chat. Reload: the private message is not in the history. Try it on the phone too.

**0.9.97.10 (redrawn parody avatars, card R14):**
- [x] Avatar picker → Parody: every face is the new drawing; Anime has the notebook genius and the sweet-tooth sleuth,
  the white-haired hunter is under Game. Pick one: it looks right in the chat, the faces and the join card.

**0.9.97.9 (ask before letting people in, card R12):**
- [ ] In your room: 🔗 Invite → turn on "Ask before letting people in" (also in ⋯ More → Room rules). A friend opens
  the link: they see "Waiting for the host to let you in…", you get a card with their name and picture → Let in. Try
  again with another friend (or a private window) → Refuse: they are out and cannot come back. A friend who was let in
  and reloads passes straight in.

**0.9.97.7 (two people with the same name, card R11):**
- [ ] Join your own room from a second browser (or a private window) with the same name and avatar: the room says
  "2 people", two faces in Together; your two tabs in the same browser still count once.

**0.9.97.3 (repo hygiene, security L10):**
- [ ] GitHub → the repo → Settings → Code security (or "Advanced Security"): turn on **Dependabot alerts** and
  **Dependabot security updates** (free on a private repo). Weekly update PRs then come by themselves; Claude merges
  them when CI is green.

**0.9.97.2 (privacy link, security L9):**
- [ ] On a phone: the join screen (name + avatar) has "🔒 Privacy" under the button; ⋯ in the room has "Privacy" near
  the end; both open the privacy page in the site's language (switch TR / EN and try again). On a computer: ⋯ More and
  the profile menu have it too.

**0.9.96.25 (game rules, security L6):**
- [ ] With a friend, open Draw & Guess or the Quiz: only the first one in (the one who picks the settings) can press
  Start; the friend sees Start dimmed and "<name> picks the settings and starts the game". If the first one leaves,
  the friend can start.

**0.9.96.23 (owner bug: the stream button was gone):**
- [x] In a room with no video yet, alone or with a friend, in voice or not: "🖥️ Paylaş ▾" (Share) is in the Together card;
  sharing your screen works, the friend's "▶ Watch the stream" works. The camera count next to "Seste 1/6" shows a small
  camera drawing, not an empty box (Windows).

**0.9.96.15 (YouTube usage counters, card Y3):**
- [ ] GitHub → the repo → Settings → Secrets and variables → Actions → New repository secret `USAGE_TOKEN`: any long
  random text (a password manager can make one; never paste it in a chat). The next deploy uploads it.
- [ ] Read the counters (PowerShell): `irm https://screen-with-me.swm-server.workers.dev/api/youtube/usage -Headers
  @{"X-Usage-Token"="<your token>"}` → per day: searches, Discover, More like this, channel feeds, title lookups, and
  the units. These are the numbers the YouTube quota form asks for.

**0.9.96.13 (accessibility, card A11y):**
- [x] On a computer, without the mouse: Tab from the top of a room (first "Skip to the video"), reach the buttons beside
  the video, open ⚙️ and 🔗 Invite (Tab stays inside, Esc comes back to the button), ⋯ More with the arrow keys.
- [x] YouTube search, Shorts ＋ Add and the ♾ window show "Results from YouTube · YouTube Terms of Service"; the link opens YouTube's terms in a new tab.
- [ ] Optional: with a screen reader (NVDA on Windows or VoiceOver on a Mac / iPhone) the room name, the buttons and the
  XOX squares are read out with sensible names.

**0.9.96.12 (the new home page, card 15b):**
- [ ] Open the home page on the computer, a tablet (both ways) and the phone: Glowbeam shines on the screen, the slogan,
  two buttons and three small cards all fit without scrolling; "How it works" is below. Create a saved room; join one
  with a code.

**0.9.96.11 (card 16 part 3):**
- [x] Film page (extension): send an emoji and a chat message in fullscreen: both float over the film, no black box.
- [ ] Phone: open XOX in a room: the board sits in the middle of the screen. Hold the phone sideways in an empty room:
  faces and chat on the right.

**0.9.96.10 (tablets, card T):**
- [ ] On a tablet held upright, open a room with a video: the video on top with its buttons beside it, the chat on the
  left below, Together and Queue / People on the right; nothing scrolls. Type a message (the keyboard must not change
  the layout), tap People / Queue, open XOX (it opens where the video was).
- [ ] Turn the tablet sideways: the computer layout, the video keeps playing; turn back: the tablet layout again.
- [ ] Open a Short on the upright tablet: the bottom bar is one row of icons.

**0.9.96.7 (cinema mode, computer):**
- [ ] In a room with a video press **T** (or rail ⋯ → 🎞 Cinema mode): everything around the video goes dark, the video
  grows, the top bar hides (move the mouse to the very top to get it back). A friend's message shows under the video
  with a number on 💬. **T** or **Esc** leaves; a reload in the same tab keeps it.

**0.9.96.6 (card 6g, computer):**
- [x] An empty room: the rail on the right is hidden until the mouse reaches the video's right edge, like with a video.
- [ ] ⋯ More has no "Games" any more (🎮 on the rail opens them); on the phone ⋯ still has Games.
- [ ] Home page: no theme picker; change the theme in the room (⚙️ My screen or the profile menu).
- [ ] Turn your camera on with a friend: the cameras open in one window on the page, side by side; the Together card
  has no camera tiles; the window's top switch makes free tiles that start under the small menu.
- [ ] 🔍 next to the link box is just a lens; the Glowbeam costumes (Gece nightcap etc.) sit on the head.

**0.9.96.3 (test panel, phone first):**
- [ ] Open the site once with `?debug=1` at the end of the address: a 🐞 appears bottom left; tap it: versions,
  connection, and in a room the sync numbers. "📋 Copy report" and paste it to Claude when something breaks.
  `?debug=0` (or "Turn the panel off") hides it.

**0.9.96.2 (Thanks page, computer + phone):**
- [x] Footer → "Thanks" (and Help → the thank-you line): the six names, Glowbeam, "Send feedback" opens the form;
  TR / EN switch at the top works, nothing scrolls on the phone.

**0.9.96.1 (Shorts):**
- [ ] ♾ window: paste a channel's link (or type its @name) → that channel's Shorts fill the queue.
- [ ] ♾ → Discover: the country box says "My country"; pick another country or "World", tap a category: the Shorts change.

**0.9.96 (computer + phone), after you add the token (steps in PR "Send feedback"):**
- [ ] ⋯ More → 💌 Send feedback (also in the profile menu and on the Help page): pick a type, write a line, send.
  "Thanks! We got it." shows and an issue labelled `feedback` appears in the repository. Before the token: the form
  says feedback is off and shows the e-mail address.
- [ ] Tick "Attach technical details", open "See what is sent": only versions, browser and connection; no room or names.

**0.9.95.6 (computer + phone):**
- [x] Enter a room: the intro looks like Design's preview: the logo pops in dark, the light beam comes out of the
  triangle and bursts, the eyes open and blink, the little golden mascot springs out of the light, "Enjoy the show!".
- [ ] Pick a few themes (home page strip): each one shows the golden mascot in that theme's costume.
- [ ] A new empty room: the rail is beside the empty video. 😀, 🎮, 🎙 and 📷 work before any video; ⛶ and the speed
  in ⋯ are dimmed and say "Add a video first". After the first video everything works as before.

**0.9.95 (Sidelit, computer + phone):**
- [ ] Home, a room, the extension popup and the film page say **Sidelit** with the new night-gold logo; the browser
  tab's icon is readable; the empty room shows the little golden mascot.
- [ ] Update the extension: extract the new zip **into the same `screenwithme-extension` folder** and press ↻ (a new
  folder would be a new extension and lose its settings); the toolbar icon is the new logo.
- [ ] Phone: add the site to the home screen again: the new icon fills the shape.

**Lane B for the big test round (3 Nov 2026 →):**
- [ ] 0.9.97.35 Classics: open 🎮 → Together: there is one "Classics" card (no separate XOX / Four in a Row). Open it: a
  shelf of boxes (XOX, Four in a Row, Dama; chess and backgammon say "soon"). Pick Dama alone: "Play against Glowbeam"
  offers three levels; pick one and play (a man shows where it can go; a capture is a must, the longest one). Glowbeam
  stands beside the status line as the referee. With a friend: they join, you switch to XOX between games from the
  shelf, play a game. Mid-game the shelf only lets you go back to the board you're on.
- [ ] 0.9.97.51 Test Lab server powers: nothing to test by hand on the live site (they exist only on a local test
  server, and the live e2e checks after every deploy that live refuses them). Locally (`npm run dev`), with the lab on:
  at a Classics table "set the mate1 position" shows a chess board where Ra1–a8 mates; at a Quiz table "end this phase
  now" reveals the answer at once; in a room with a film "Fill the tip jar now" lights the 🫙 pill.
- [ ] 0.9.97.48 Test Lab games: open a room with `?debug=1`, press 🐞, go to 🎮 Games (or Ctrl+K and type "games").
  Open Snack Bar from there, give it +10K coins, then "pretend the film plays" + "time ×10": the coins climb. Try "a
  customer now" and "the film's receipt now". Open Window Garden: "bloom now", night sky, rain. Open Five Frames: show
  the answer, move a day. Then "Restore my real saves": your own Snack Bar / garden / Five Frames are back as before.
- [ ] 0.9.97.46 Chess: open 🎮 → Classics → Chess on the shelf. Alone, pick "Medium": Glowbeam plays black. Tap a piece:
  the squares it can reach light up; tap one to move. Try castling, and walk a pawn to the last row (a chooser asks
  queen / rook / bishop / knight). A king in check glows red; checkmate ends the game with "Checkmate!". With a friend:
  one plays white, the other black. Backgammon (same release): Classics → Backgammon, "Medium". Press 🎲 Roll: the
  server rolls; your checkers that can move light up; tap one, then a lit point. A double gives four moves. Hit a
  lone black checker: it goes to the bar and must come back in. Glowbeam rolls and plays its own turn.
- [ ] 0.9.97.40 Draw & Guess: open a Draw & Guess table with a friend. In the lobby the host picks a word category (or
  "All"); the words offered then come from it. While drawing try the 🧽 eraser, undo, then redo (button or Ctrl+Y); a new
  stroke after undo clears the redo.
- [ ] 0.9.97.37 Quiz bank: play two or three quizzes in a row with a friend. Questions start easy and get harder within a
  game (stars next to the category), and the same questions don't come back game after game (the help page says
  "Almost 1200 questions").
- [ ] 0.9.97.32 Tip jar and cuttings (side games 2, picks 5 + 8), with a friend: both open Snack Bar while a video plays
  and serve: a 🫙 pill shows how full the room's jar is; when it fills, both get a note and the pill says +10 % until the
  film ends. Then open Window Garden with a plant in bloom: "🎁 Give a cutting" → your friend's name. Your friend gets a
  note with the garden closed; in their Window Garden an empty pot offers "🎁 <plant>" and plants it. A bloom gives only one.
- [ ] 0.9.97.31 Snack Bar, side games 2: play a video and open Snack Bar. Within a minute a customer walks up with a
  line; tap them: coins pop and they leave happy. Let a 20-min-or-longer video end: Glowbeam's receipt shows (watched,
  served, best stand) with a golden bucket; "Collect" pays it. 🏅 in the footer opens the badge wall (tap a badge to see
  how to earn it) with the decorations below (buy the marquee lights for 500: they twinkle on the sign). Open a new
  cinema (or more): the drive-in, the rooftop and the art house each look different and say their twist.
- [ ] 0.9.97.31 Window Garden, side games 2: when two plants bloom side by side a 🌈 colour seed may drop; plant it from an
  empty pot: the plant grows in a new colour. Tap a plant in the album strip: its page shows the colours found and the
  film / friends of its first bloom. The sky outside follows the time of day (some days it rains). 🎨 opens the
  decorations (petals from picking): curtains, fairy lights, a sleepy cat, a lantern; at night a moth or a firefly
  may visit and goes into the album.
- [ ] 0.9.97.31 Five Frames, our own look (IP audit): open 🎮 → On the side → Five Frames and guess a word. A letter in the right
  place gets a solid gold frame and ✓, one in the word a dashed gold frame and •, one not in it fades with ×; no green,
  yellow or grey fills anywhere (board, letter tray, legend, "How to play", the gallery cover with CLOSE / STAGE /
  SCENE). Readable for colour-blind players (line and sign differ, not only colour).
- [ ] 0.9.97.31 Game windows: with a friend, open XOX and play a move each. Press ✕ on the game window: it only goes
  away (the friend still plays, 🎮 brings it back). Press "↩ Leave table": it asks first. "⏹ End table" asks first too;
  in the 🎮 hall the table's button says "End". Close or reload the tab mid-game: the browser asks "Leave site?"; after
  the game is over it does not. Snack Bar / Window Garden: no close button any more, ✕ only hides them; ↺ next to "?"
  starts over after a question. Window Garden while a video plays: pick a growing plant, press "✨ Glowbeam": Glowbeam
  shines on that pot (once per video). Watch a video of 20 min or more to its end with the garden closed, then open the
  garden: a seed is waiting.
- [ ] 0.9.97.28 Side games only in a room: open Snack Bar and Window Garden in a room with nothing playing: the scene
- [ ] 0.9.97.31 Side games only in a room: open Snack Bar and Window Garden in a room with nothing playing: the scene
  says "Closed until the film plays" / "Resting until the film plays" and "Nothing changes while you're away". Play a
  video: the sign goes, coins come, plants grow. Leave the room for a while and come back: no "while you were away"
  coins, the plants are exactly as you left them.
- [ ] 0.9.97.26 R15: YouTube in fullscreen, a friend writes a message: it comes down over the video at the top right,
  left of the rail; the video never gets narrower, no dark column on the right; your camera floats over the video.
- [ ] 0.9.97.20 BH2: Five Frames: skip a day after a win; the next day the 🔥 next to the day number (and in the games
  gallery) shows 0, not your old streak.
- [x] 0.9.97.18 BH2: start a YouTube video and move the mouse to the video's right edge and away: the rail slides in and
  out beside the video, never fading in over it.
- [ ] 0.9.97.17 BH2: a friend shares the screen, you press Watch, then reload your page and press Watch again: the picture
  comes back (it used to stay black).
- [ ] 0.9.97.15 R8: 🎮 → On the side → pick a game you never opened: the "How to play" cards are there at once. Open the
  profile menu, then "Change theme": every preview picture is already there.
- [ ] 0.9.97.13 R6: the invite window has no "show this when I'm alone" tick box; ⚙️ My screen has "Open the invite
  window when I'm alone in a room" (on); turn it off: a new empty room opens without the window.
- [ ] 0.9.97.13 R5 (update the extension first): on a film page, out of fullscreen, move the mouse slowly to the right
  edge of the film: the rail opens when the mouse is about a finger's width (40 px) inside the film; a mouse that only
  passes by doesn't make the film jump; in the middle of the film the rail goes again.
- [x] 0.9.97.12 R4: in fullscreen press T: fullscreen closes and cinema mode opens; T again leaves cinema mode.
- [x] 0.9.97.12 R3: YouTube in fullscreen with nothing going on: no dark strip on the right, the video reaches the rail.
  Turn your camera on: it sits in a column beside the video; drag the camera window onto the video: the empty column
  goes away; camera off: no column. Ask a friend to check theirs too.
- [x] 0.9.97.11 R2: in a room press Enter once: the cursor is in the message box. Also with a video playing, after
  pressing a rail button, in cinema mode (T) and in fullscreen: one Enter, never an empty window first.
- [ ] 0.9.97.8 R1: with a friend, both in voice, the friend shares the screen and you watch. Open a game (XOX, then
  Draw & Guess), let the friend join it, close it: nobody is thrown out, the stream and voice keep going, every game opens
  on the first press. If a new version goes live while you watch (the room reconnects for a moment), the stream comes
  back by itself.
- [ ] 0.9.97 🎮 Side games polish: in a room, 🎮 → "On the side" → Snack Bar, then Window Garden, then Five Frames.
  Each one opens with "How to play" picture cards the first time (Next / Let's play; ✕ or Esc skips); the "?" in the
  game's top bar shows them again; they don't come back on the next open. Each window opens big enough that the text
  is easy to read and nothing is squeezed; the window's title shows the game's full name. Five Frames: green ✓ = right
  place, yellow • = in the word, grey = not in it; the three are explained under the board until your first guess;
  after Enter the row turns over letter by letter. The footer and the Help page have a "Licenses" link (the word list
  credits are no longer inside the game). Try it on the phone too and in Turkish.
- [ ] 0.9.96.5 🎧 Podcasts: type words (e.g. a topic you like) in the link box and press Enter, then "🎧 Podcasts" on
  the results: shows with their pictures; open one, "▶ Play now" on an episode: a friend hears it at the same moment,
  the cover art shows in place of the video, pause / seek follow. Try a Turkish and an English show.
- [ ] 0.9.96.4 📲 Move to another device: on the computer, in a room: profile picture → 📲 Move to another device →
  Send. Scan the QR code with the phone: the phone asks the computer, press "Send" on the computer; the phone says
  what moved (play a bit of Snack Bar first so there is something to move). Reload the phone: your coins, saved rooms
  and name are there. Also try a wrong code and "No".
- [ ] 0.9.95.5 🎟️ Five Frames: 🎮 → "On the side" → Five Frames. Tap letters (or click the board and type) to
  guess today's five-letter word in 7 tries; gold ✓ = right place, gold outline • = in the word. EN / TR switch at the
  top (Turkish has its own word and Ç Ğ I İ Ö Ş Ü). When solved, "Copy result" gives a line without the word. Are the
  words fair (too rare? any you would remove)? Same word for a friend on the same day?
- [ ] 0.9.95.4 🌱 Window Garden: 🎮 → "On the side" → Window Garden. A small fern seedling waits on the sill. Play a
  video with a friend: it grows (only while the video plays), a 💧 shows when it is thirsty, "Water" fills it again.
  When it blooms, "Pick it": it goes into your album (the strip of 8 plants at the bottom). A seed comes every 30
  watched minutes and when a film of 20+ minutes ends; plant it in an empty pot. Cozy enough? Sounds OK?
- [ ] 0.9.95.3 🎮 Games gallery: 🎮 (rail, ⋯ → Games, phone ⋯) opens one window with two tabs, "👥 Together" (a
  picture card per game: a press opens a new table, your friend gets the invite) and "🍿 On the side" (Snack Bar with
  your coins; Window Garden and Five Frames say "Soon"). It opens on the tab you used last and never needs scrolling,
  also on the phone. Do the pictures look right?
- [ ] 0.9.95.1 🍿 Snack Bar: 🎮 → "Play on the side" → Snack Bar opens in a small window (and as a sheet on the
  phone). With nothing playing the coins stand still; play a video with a friend: coins come in, "👥 +10 %" shows (more
  when you are both in voice). Buy the soda fountain: it appears on the counter. Tap the counter: +coins. Type a chat
  message while it is open: keys 1–8 / Enter still work for the room. Close it, come back after 10 minutes: "While you
  were away". Two tabs: the second says "open in another tab". Does it feel sweet? Sounds OK?
- [ ] 0.9.93.21 Vimeo: paste a Vimeo link (`vimeo.com/<number>`, also an unlisted `vimeo.com/<number>/<code>`) with a
  friend: it plays in Vimeo's own player on computer + phone, pause / play / jumping in Vimeo's bar follows for both,
  the queue shows the real title, speed stays 1×.

**0.9.93.20 (computer):**
- [ ] YouTube in fullscreen with nothing going on: no dark empty strip on the right, the video uses the whole width
  (only the rail's thin edge). A message, the "waiting" note or a camera opens the side column; a few seconds after
  the last message it closes again.

**0.9.93.19 (computer):**
- [ ] Home page: on the right a laptop and a phone show the same video moving together, a dotted line between them, a
  message drifting over to the phone; under the hero three short features (No app · Together in voice and camera ·
  Games in the room), then the themes. Does it feel right? On the phone the home page looks as before.

**0.9.93.18 (computer + phone):**
- [x] ⚙️ Settings (My screen), and ⋯ → Film time / Save the room / Room rules: each opens as one clean window, rows
  read on one line (title + short description + switch), nothing scrolls inside on your laptop.

**0.9.93.17 (computer, with the extension):**
- [ ] On a film page (room view and fullscreen): the rail on the right is hidden while you watch; bring the mouse to
  the film's right edge and it opens, the film getting a little narrower; move the mouse back onto the film and it
  closes, the film widening again. A mouse just passing the edge doesn't make the film jump. The rail's buttons work.

**0.9.93.16 (computer):**
- [x] The extension page (top, under "What does it do?") and the "Go to the film" card (in a room, a film page without
  the extension) explain in two lines why the extension asks for every website; the link opens the help page's answer.

**Card 1, "the rail never goes away in YouTube fullscreen" (owner's laptop has no touch screen; Claude could not
reproduce it with a plain mouse, see `yt-room` harness):**
- [ ] ⋯ on the rail (or Settings → My screen): is "Keep the controls open" ticked? Ticked, the rail never hides (by design).
- [ ] After Ctrl+F5 the footer shows 0.9.93.15 or later.
- [ ] Fullscreen opened with our ⛶ (not F11: F11 is the browser's fullscreen and keeps the room's window layout).
- [ ] Browser + version and OS, sent to the Planner.
- [ ] If it still stays: a 10 s screen recording (YouTube fullscreen, mouse in the middle).

**0.9.93.15 (computer + phone):**
- [ ] Read the Turkish help page (footer "Yardım", the profile menu's ❔, or ⋯ → "Yardım ve SSS"): is anything unclear
  or wrong? The English one says the same.
- [ ] On the phone, ⋯ → "Yardım ve SSS" opens the help page in a new tab and the room stays open.

**0.9.93.14 (computer + phone):**
- [x] A YouTube video still plays normally (the player now comes from youtube-nocookie.com, YouTube's privacy mode):
  play, pause, seek, captions and quality in YouTube's bar, a Short in the Shorts view. The very first YouTube video
  in a room may take a moment longer to appear (YouTube's code now loads only then).

**0.9.93.13 (computer + phone):**
- [ ] A new room on the computer: only the link box, Invite, the chat and "Join voice" show (no button column, no
  Share, no Queue / People tabs) until the first video plays; then everything comes back.
- [ ] "⋯" next to Invite: Games, Film time (host), Save the room, Today's recap, Keyboard shortcuts, Sync test, Room
  rules; each opens from there. ⚙️ now only has "My screen".
- [ ] On the phone, ⋯ has the same items in the same order.

**0.9.93.12 (computer + phone):**
- [x] Home page after being in a room: "Continue where you left off" is one thin line above the big title (room name,
  who is inside, what plays), cut with "…" when long; click it to go back in, ✕ forgets it.

**0.9.93.11 (computer + phone):**
- [ ] 🔗 Invite: two tabs. "Link": the link with Copy and a green WhatsApp button with WhatsApp's own logo. "QR code":
  only a big QR code and "Copy image" (paste it into a chat to check). No scrolling, also on the phone.

**0.9.93.10 (computer, YouTube):**
- [ ] A friend's emoji rises from their face in the "Together" card, not over the YouTube video (with the side panel
  hidden: from the 😀 on the right column, which opens for a moment).
- [ ] The "3-2-1" countdown for a new video is a small card above the chat's message box, not big numbers on the video.
- [ ] The column on the right still opens when the mouse reaches the video's right edge (there is now a thin dark strip
  beside the video for that).
- [ ] YouTube in fullscreen: the video leaves a column on the right; notes, cameras (both camera layouts) and new
  messages appear there, never on the video. You can still drag a camera onto the video yourself.

**0.9.93.9 (computer + the film page with the extension; update the extension):**
- [ ] An empty room: no bar under the video any more; the button column is on the right of the video (😀, 🎮, 🎙, 📷,
  ⋯, ⛶ dimmed until something plays) and stays there.
- [ ] A video file (or YouTube): the column comes when the mouse reaches the video's right edge, the video gets a little
  narrower so nothing covers it, and it goes when the mouse leaves; the same in fullscreen.
- [ ] The film page (extension): no bar under the video either, only the column on the right of the film, always there,
  never over the film (in fullscreen too). ⋯ has speed, sync, next. The film's own bar works as before.

**0.9.93.8 (nothing to see: a server security fix):**
- [ ] Rooms, chat and votes work as before, also on the phone hotspot. (Fixed: one person with the room link could
  reset a room for everyone through the backup connection; votes count only people in the room.)

**0.9.93.7 (computer; especially a laptop with a touch screen):**
- [ ] YouTube in fullscreen: move the mouse to the right edge (the button column comes), press 🎙 or 📷 without being in
  voice and close what opens (Esc), then move the mouse to the middle and wait: the column goes away within a moment.
  Root cause: a touch-screen laptop can tell the browser "touch first", and the room treated it like a tablet that
  keeps the column on screen; a pressed button also held it. Now a mouse anywhere means the computer behaviour.

**0.9.93.6 (phone + computer, nothing should look different):**
- [ ] On the phone open the home page and a room: it should open at least as fast as before; the invite window (🔗 /
  ⋯ → Invite) with its QR code, the first-time tips in a fresh browser, adding a custom emoji or a chat image all still
  work (they now load when first used).
- Note for Claude: `scripts/harness/tv/run.cjs` (TV version, frozen) is stale after the phone redesign: the TV button
  is not on screen on a phone (no top bar since 0.9.92.3) and the link box sits behind ＋. 0.9.93.6 fixed the first
  steps (TV mode opens with the lazy TV code); the rest waits until the TV version is unfrozen.

**0.9.93.5 (computer):**
- [ ] YouTube in fullscreen: open ⋯ or 😀 on the right, press Esc (or send an emoji), move the mouse onto the video
  and leave it still: the button column goes away together with YouTube's bar.

**0.9.93.4 (computer):**
- [ ] YouTube in fullscreen, a friend writes: the message appears at the top right, left of the button column, not
  at the bottom over YouTube's bar.

**0.9.93.3 (computer):**
- [ ] In voice with a friend's camera, cameras in one window (▣), fullscreen: the window is wide and the cameras sit
  side by side, as outside fullscreen.

**0.9.93.2 (computer):**
- [ ] YouTube, also in fullscreen: open the rail at the right edge, open 😀, move the mouse onto the video: the emoji
  window and the rail close. Click the video while a rail window is open: they close too.
- [ ] A new room has a nice name ("Velvet Lounge"…) in the top bar and the tab, the same for your friend.
- [ ] Press ? in the room: the keyboard shortcuts card (also in ⋯ and the profile menu).
- [ ] With a friend: People tab → 👑 next to them → confirm: they are the host, you are a guest; they can hand it back.
- [ ] With a friend: start a new (non-Shorts) YouTube video or file: both screens count 3, 2, 1, then it plays for both
  at once. Settings → Room rules → "3-2-1 countdown" turns it off.
- [ ] Leave the room, open the home page: "Continue where you left off" with the room's name, who is inside and what
  plays; its button takes you back, ✕ hides it.

**0.9.93.1 (computer + phone):**
- [ ] Create a room from the home page: the invite window opens by itself (link, Copy, WhatsApp, QR code; on the
  phone also "Share"). Scan the QR code with the phone: it opens the room. Untick "show this when I'm alone": a new
  room opens without it; 🔗 Invite still opens it.
- [ ] Shorts view: ＋ (Add) and ♾ windows look right (box and button on one row, nothing overflowing, results scroll
  inside the window). On the phone the ＋ sheet has a title and ✕.
- [ ] Copy a YouTube link, click an empty spot in the room and press Ctrl+V: it goes to the queue (plays if nothing
  plays). Dragging a link onto the page does the same.
- [ ] With a friend: switch to another tab, let them write: the room's tab title shows "(1) …".

**0.9.93 (computer, YouTube):**
- [ ] Move the mouse to the video's right edge: the button column opens at once (the video makes room); move away: it
  closes almost at once. A mouse move in the middle of the video does not bring it. Same in fullscreen.
- [ ] ⋯ → "Keep the controls open": the column stays; Settings → My screen shows the same switch, turning it off there
  lets it hide again. (If you hid the controls in 0.9.92.8, they are back.)
- [ ] With a friend: their emoji flies over the video again.

**0.9.92.9 (computer, YouTube):**
- [ ] "Everyone ready" wait, a game invite or "start the next one" shows above the message box in the chat (above the
  video when the side panel is hidden), not on the video. A video file still shows them on the video.

**0.9.92.8 (computer + phone):**
- [ ] Computer, a YouTube video: no bar under the video; move the mouse onto the video: the button column appears
  beside it and the video makes room; rest the mouse: the column goes, the video is full size again. ⋯ has speed,
  sync, next, hide/show the side panel and "Hide the controls" (then "Controls" above the video brings it back).
  (0.9.93: replaced by the right edge + "Keep the controls open", see above.)
- [ ] A video file: the buttons sit over the video's edge as before; also no bar under the video.
- [ ] 🔍 Search next to the link box (words → YouTube results).
- [ ] Phone sideways (no fullscreen): video left, one big ⛶ right; ⛶ → fullscreen; upright again → back. Games only in
  ⋯ (a dot on ⋯ when a game is minimized). ⋯ → Dil asks English / Türkçe. Person sheet → small / medium / large changes
  the camera picture size.
- [ ] Turn off Wi-Fi / data in a room: the "can't reach the room" card has "Try again" and "Test the connection"; the
  test page has "Back to the room".

**0.9.92.7 (computer):**
- [ ] Open a room on the laptop and the big monitor: the video fills much more of the screen, less empty space on
  the sides; the chat panel is a bit wider on big screens. ⇥ (hide the side panel) still works.
- [ ] The first screen of a room (name + avatar) is bigger.

**0.9.92.6 (your phone feedback, on your phone):**
- [ ] Today's recap fits the screen; the Shorts chat covers about half the screen.
- [ ] ♾ while a feed runs opens the feed window with "On now: … · Stop"; it only stops with Stop.
- [ ] Turn on your camera: one picture in a row under the faces (your face stays your avatar), no floating camera
  window; tap the picture: it opens big.
- [ ] ⛶ next to ⋯ opens a real fullscreen (no address bar) and turns the phone sideways. In fullscreen 💬 on the right
  opens / closes the side panel (faces, chat, message box). Turned sideways by hand, the extra ⛶ on the right column
  hides the address bar.
- [ ] Type a message (keyboard open): nothing jumps, no fullscreen. Invite: only the phone's share sheet, no grey box.

**0.9.92.5 (phone step 3, on your phone):**
- [ ] Open the site: an app start screen (Create room, Join with a code, your saved rooms); "How does it work?" opens
  the rest. Nothing scrolls until you open it.
- [ ] In a room with a video, ＋ → Game → a game: it takes the whole screen; the video keeps playing small at the top
  left with 🎙 next to it. Tap the small video: back to the video, and 🎮 with a dot waits in the faces row; tap it:
  back to the game.
- [ ] The room should feel lighter (no blur behind menus); the first YouTube video may take a moment longer to start.

**0.9.92.4 (phone step 2, on your phone):**
- [ ] Open a Short on the phone: the video takes almost the whole screen; under it one slim bar with the faces, 💬 😀
  ▲ ▼ ⋯. A friend's message shows in the bar for a few seconds (tap it: the chat opens).
- [ ] 💬 opens the chat as a sheet; ⋯ has mic, camera, add, feed, games, loop, invite, settings and room view; the
  add window closes when you tap the video.
- [ ] Swipe up / down on the bar: the next / previous Short. Sideways: the bar is a column right of the video.
- [ ] A normal video, phone sideways: the video fills the screen and a slim column 💬 😀 🎙 📷 ⤢ sits next to it (not on
  it: the player's own volume / fullscreen buttons stay free); 💬 opens the message box.

**0.9.92.3 (phone room as an app, on your phone):**
- [ ] Open the site in a fresh browser (or a private window): it starts in English; TR in the menu switches and is
  remembered (owner, 2 Nov 2026: English first everywhere).
- [ ] Open a room on the phone: no top bar, the video at the top edge to edge, faces under it, chat, message box with
  😀 and ＋ at the bottom; nothing slides or scrolls except the chat.
- [ ] ＋ → Video ekle: paste a link or search, "Şimdi aç" plays it; the queue is in the same sheet.
- [ ] ⋯: invite, queue, people, games, recap, film time, profile, settings, language all open.
- [ ] Join voice with 📷: your face in the strip shows your camera; a friend's camera shows in their face; tap a face
  → their camera big.
- [ ] Android back button closes an open sheet instead of leaving the room.
- [ ] Turn the phone sideways while a video plays: fullscreen with the dock; upright: the room again.

**0.9.92.2 (Shorts rail):**
- [ ] On the laptop open a Short: the buttons are a column right of the video, the top bar is gone, the video fills
  the height. 💬 (or Enter) opens the message box, ⋯ (or the mouse at the very top) shows the top bar.
- [ ] On the big monitor: the top bar stays, the rail is there too, the video is taller than before.

**0.9.92 (phone hotspot):**
- [x] (owner, 31 Oct 2026: works, no problems) Laptop on the phone's hotspot: open the site and a room. It should get in within ~7 s (first time) and work:
  chat, a YouTube video in sync with a friend, voice. A reload should be quick.
- [x] (owner's result, 31 Oct 2026: page loads, 200 kB answer over h3 in 116 ms, every WebSocket hangs 10 s, fallback opens in 153 ms, room answers in 306 ms, round trip 183 ms → TCP path broken on the tether, UDP fine; Mac, Chrome 156) On the same hotspot open `/connection`, press "Sonucu kopyala" and paste the text to Claude (tells which cause it
  is: the `guess:` line).
- [ ] If the site's home page itself doesn't open on the hotspot (not only the room), tell Claude: that is a
  different cause (DNS / filtering of workers.dev → own domain).

**Accounts (owner only):** Microsoft Partner Center for Edge Add-ons (free, steps in `web-store.md`), with the Chrome
Web Store submission at 1.0.

## Last full test pass (28 Oct 2026, 0.9.82, cloud)
- **0.9.91:** unit 204/204 (page tokens, shorts-only, next in answers), e2e all files green except `room.mjs` (local
  workerd can't fetch YouTube titles here, known), browser check of the feed with mocked search (search → "📱 Shorts
  akışı" → Shorts view, 8 queued, next page only when < 3 left, no overfill, no page errors), rail = stage bottom at
  1280/1366/1600 px, embed 103/103, voice 66/66.
- **0.9.90.9:** voice on the site 66/66 (Shorts: Ali's camera in his seat circle, no tiles, bottom bar only 🎙 / 📷, 🎙
  mutes).
- **0.9.90.8:** voice on the site 62/62 (pill stays with no camera, grows from its corner, has 🖥️; 3 buttons under
  the cameras), streams 19/19 (no camera stream option; screen + camera in the corner is a generated track, frames
  reach the viewer), film-page voice 28/28.
- **0.9.90.7:** unit 201/201 (new `parseMediaList` cases), browser check: 3 links + a film page pasted → the
  first plays, 2 queued, "1 link left out" note, no page errors.
- **0.9.90.6:** voice on the site 58/58 (pre-join window: level bar moves, device lists, camera preview, "join
  muted" really joins muted, "🎛" switches the mic in voice and the other side keeps hearing), voice on the film page
  28/28 (permission tab path still opens: caught a `join(quiet, mic)` mix-up there), sound effects harness green.
- **0.9.90.5:** unit 197/197, voice on the site 53/53 (free tiles: own window, drag, resize both ways, place
  remembered per person, size presets, hide for me + "👁 1", line up, one-window switch, fullscreen corner, the tile
  never vanishes during a reconnect — fails without the fix), voice on the film page 28/28 (each tile an island),
  embed 103/103. Note: on 29 Oct the 0.9.90.3 deploy's live e2e failed once in `quiz.mjs` (the live 4 s reveal alarm
  came > 9 s late twice, retry too); 0.9.90.4's run passed. Watch for it; if it repeats, look at alarm latency.
- **0.9.90.4:** unit 182/182, e2e 202 checks incl. new `search.mjs` (all files green, YouTube reachable), browser
  check of the search list with mocked answers 24/24 (desktop + phone: results, Esc, outside click, arrows, page
  cache, pick = play / queue, quota note, links don't search).
- Typecheck ✅, unit 157/157 ✅, e2e 172 checks ✅ (only `room.mjs` hangs because YouTube is blocked here; known).
- Voice on the site 24/24 ✅ and voice on the film page 28/28 ✅, **both only with `VOICE_A`/`VOICE_B`**: without them
  both Chromes use the same fake beep and the echo canceller removes it, so the "really hears" checks fail (not a
  code bug; the harness should default to two different sounds).
- **0.9.87:** unit 165/165, e2e 181 (+ `room.mjs` blocked by the YouTube proxy here), embed harness 93/93, voice 38,
  plus a browser check of every change (⚙️ spot, Film time chips/card/banner/clear, empty sticker tab, hint bubble
  closing, avatar Esc vs. "Tamam").
- **0.9.85:** voice harness 38/38 (person menu, pin, mute for me, controls under cameras, vertical resize).
  Careful: after `git stash`/checkout while `npm run dev` runs, Vite may keep serving an old module — restart it.
- **0.9.84:** voice harness 29/29 (new: game open/close keeps cameras, reconnect keeps one tile, muted mic stays
  muted), film-page voice 28/28, e2e 174 (new `prev` checks in handover.mjs).
- **0.9.86** (re-run after merging 0.9.85: unit 165/165, e2e 181 + `room.mjs` blocked by the YouTube proxy, voice 39
  checks, streams, film-page voice, embed harness all green; first run below): unit 165/165, e2e 192 (YouTube reachable here, `room.mjs` passed too), embed harness 92/92 (Vite),
  voice 29/29 + streams 17/17 + film-page voice 28/28, plus a browser check of the security fixes (24 checks:
  no CSP violation on any page incl. YouTube, emoji migration/collection/add dialog, voice notice, frame guard).
  Embed harness against the **production build** (CSP on) 89/92: the 3 misses use dev-only hooks
  (`import('/src/themes.ts')`, `window.__swm`), not product bugs.
- **0.9.83:** embed harness 92/92 (flash fixed with `#swm-cover`), voice 24/24 and 28/28, unit 162/162.
- Extension (embed harness, 0.9.82) 91/92: **"no flash when going from the site to the film page" failed in both runs**: the
  film page is visible for one frame (~60 ms) before the cover. Cause: on the first transition from the site the film
  origin has no `sessionStorage` `swm-cover`, so the cover waits for the async `storage.session` read
  (`content.ts` `checkSessions`) and the first paint wins the race. Timing-dependent. Fix planned for 0.9.83.

Side sessions started 28 Oct 2026 (results come as PRs from their branches; integrate them here):
- Name ideas: session `session_015Fyri2xNPa9YWMwBanhQXV`, branch `claude/name-ideas` (merged into main with 0.9.91.16).
- Browser support (31 Oct 2026): session `session_015Fyri68eMHWNiGtk1pUdpw`, branch `claude/browser-support-research`.
- Security review 1: session `session_015Fyri6wwCuwDm697YF5dv6`, branch `claude/security-review-1` → shipped as
  0.9.86.

## Pending decisions (owner's)
- **Product name** (keep "Sidelit" or rename): research in `name-research.md` (no registered mark found in web
  searches; descriptive name, crowded category; best alternatives Sofaloop / Yanyana / Seyirdaş). The owner should
  run the 30-minute database check described there. Decide before the store submission and the domain.
- **Domain:** e.g. `screenwithme.app` (~14 $/year), bought together with the final name.
- **Cloudflare Realtime card:** Cloudflare asks for a card even for the free quota and has no spending cap → voice
  stays peer-to-peer. If a card is added: Worker secrets `REALTIME_APP_ID` + `REALTIME_APP_SECRET`, the code switches
  to SFU by itself (see `ses-goruntu.md`); a budget brake is mandatory then. The same card would also allow hiding
  IP addresses in voice, camera and streams (TURN relay or SFU for all three; owner: later, ROADMAP Phase 2).
- **Chrome Web Store submission:** with 1.0.
- **Trademark filing, donations, legal entity:** see `ROADMAP.md` §4.

## History (short)
- **0.9.97 (3–5 Nov 2026), side games and more players, then the road to 0.9.98:** the side games (Snack Bar, Window
  Garden, Five Frames) with their polish, how-to-play cards and the tip jar / cuttings; the games gallery, Classics with
  dama, chess and backgammon against Glowbeam, the CL2 redesign; Vimeo, podcasts, the move code; the owner's two test
  rounds (R1–R27, BH2–BH10: knock, private messages, the order of things, fullscreen messages, the YouTube rail, the
  film page's games and fullscreen); security reviews 3 and 4 (R3-x, R4-x); the Test Lab (DL1–DL5); a lighter room
  chunk; the privacy policy for KVKK + GDPR. Gate check for 0.9.98: `docs/internal/gate-0.9.98.md`.
- **2 Nov 2026, live e2e first-attempt flakes:** wait.mjs "timeout waiting d" was a deploy restarting the test's room
  object mid-test (all four connections closed with 1006; reproduced locally by reloading `wrangler dev` at the same
  moment). The deploy job now waits for the new version on the Worker and a Durable Object (`/api/version`,
  `scripts/wait-live.mjs`) instead of a fixed 30 s; a pass on the retry is a CI warning. The owner's ordered checklist
  to 1.0 lives at https://claude.ai/artifact/EtqKiBo8k5vgR422rq14K5 (ticks are saved; Claude ticks its own rows).
  The first deploy with the wait (#113) still had two first-attempt failures after the version settled (host.mjs
  "timeout roster", xox.mjs "timeout not player"), so the probe now starts a fresh object each time and every e2e file
  logs server-closed sockets (`trace.mjs`): the next deploy shows whether those were restarts or something else.
- **0.9.60:** manual video pick ("🎯 Video seç"), ads step 2 (ad tabs closed with "Geri aç", "Filme geri dön" after ad
  redirects, "📺 reklamda" doesn't make the room wait), voice chat on the film page (offscreen document, ducking).
- **0.9.61:** site audit (11 bugs, phone layout, first load ~55 → ~24 KB).
- **0.9.62–0.9.75:** PlayWithMe games (XOX, Connect Four, Draw & Guess, Quiz); since 0.9.75 they live inside the room
  (no separate game pages).
- **0.9.63 / 0.9.65:** video chat on the site / on the film page (local WebRTC bridge); limits always visible.
- **0.9.64 / 0.9.66:** screen share and camera streaming (peer-to-peer, one stream, ≤4 viewers), stage 2 (quality
  modes, host can stop, `liveHostOnly`).
- **0.9.67:** Mehtaplı Geceler sultan mascot. **0.9.68:** push-to-talk (V) + "Ali paused" notice.
- **0.9.70:** PWA. **0.9.71:** hide side panel. **0.9.76:** room layout "Cinema Rail" (design A).
- **0.9.77:** home page "Showcase" + theme picker. **0.9.78:** extension version = site version; old pages reload.
- **0.9.79:** networks that can't connect: retry, warning, `/connection` diagnostics (the owner's phone-hotspot test
  result is still pending).
- **0.9.80:** room UI pass (chat bubbles, settings dialog, reaction tray, clean top bar).
- **0.9.81:** free camera windows (drag, resize, inside the video in fullscreen; also on the film page).
- **0.9.87–0.9.89:** ⚙️ next to the profile picture, Film time, rooms independent (name/avatar per room), images
  and links in chat, voice join/leave in activity, popup goes back to an open room tab.
- **0.9.90.1:** one remote on the site (YouTube/video files without their own controls, our bar in the window and
  fullscreen, volume + CC), fullscreen messages flow up from the message box; four-part version numbers start.
- **0.9.90.4:** YouTube search in the link box (key on the Worker, cached, quota-aware).
- **0.9.90.3:** one remote on the film page in fullscreen (known players' bars + native controls hidden, our
  click/volume, "⚙ Filmin ayarları" brings theirs back, unknown players: video above our bar). Embed harness 103/103.
- **0.9.90:** film-page tools in the middle of the top bar; the room view fits the window (no scrolling).
- **0.9.86:** security review 1: room-only custom emojis + local collection, IP notice, CSP/headers, frame guard,
  `Origin` check, per-IP limits, GIF metadata stripped.
- **0.9.85:** Meet/Discord-style voice: 🎙/📷 under the cameras, person menu (volume / mute for me, show camera
  big, hide myself, host: remove), camera window resizes both ways, M toggles the mic.
- **0.9.84:** reconnect drops the old connection at once (`hello.prev`), keeps mic/camera state, lost voice
  connections are rebuilt, one camera tile per person, people counted once.
- **0.9.83:** popup opens the room in a new tab, "reload the page" instead of a false "outdated extension",
  film ducking off by default and only on real speech, film-page cover flash fixed.
- **0.9.82:** copy pass: all site/extension/privacy/README/store texts rewritten (glossary in CLAUDE.md), the owner's
  slogans, privacy policy aligned with the code.
- **README refresh (2 Nov 2026, docs only):** `README.md` + `README.tr.md` rewritten as a short "What's inside"
  overview (0.9.90 → 0.9.92.x features: one remote, Shorts / TikTok, search, phones, HTTP fallback, games) instead of a
  release log; Quality table shortened (251 unit tests).
- Design canvases (claude.ai artifacts, old account — may not be accessible any more): room alternatives
  https://claude.ai/artifact/Beiq1ueBUUHjUkRbL5LTHL, room UI options https://claude.ai/artifact/3v3MennhEPMFedeW9bNDQQ.

## Testing in the cloud (verified 28 Oct 2026)
Order matters: the server wants `apps/web/dist`, so build first.
```bash
npm ci && npm run typecheck && npm test           # 165 unit tests
npm run build                                     # extension + site (apps/web/dist)
(cd apps/server && npx wrangler dev --port 8787 > /tmp/wrangler.log 2>&1 &)   # local server
npm run e2e                                       # all pass except room.mjs when YouTube is blocked
npm run dev -w @swm/web &                         # site only (5173); `npm run dev` also starts the server and clashes on 8787
npm run build:extension:dev                       # extension that talks to the local server
ffmpeg -loglevel error -f lavfi -i testsrc2=size=640x360:rate=10:duration=660 \
  -c:v libvpx-vp9 -deadline realtime -cpu-used 8 -b:v 200k /tmp/film.webm      # 11 min video, ~25 s
FILM_VIDEO=/tmp/film.webm node scripts/harness/embed/film-server.mjs &
CHROME=/opt/pw-browsers/chromium node scripts/harness/embed/run.mjs apps/extension/dist http://localhost:5173 ws://localhost:8787 /tmp/shell-test
# Voice: two different fake microphones are required (same beep = removed by echo cancellation)
ffmpeg -loglevel error -f lavfi -i "sine=frequency=330:duration=20,tremolo=f=3:d=0.7,volume=4" -ac 1 -ar 48000 /tmp/a.wav  # volume=4: loud enough for the speech detector (film ducking in voice/shell.mjs)
ffmpeg -loglevel error -f lavfi -i "anoisesrc=color=pink:amplitude=0.4:duration=20,tremolo=f=2:d=0.8" -ac 1 -ar 48000 /tmp/b.wav
VOICE_A=/tmp/a.wav VOICE_B=/tmp/b.wav CHROME=/opt/pw-browsers/chromium node scripts/harness/voice/run.mjs http://localhost:5173
VOICE_A=/tmp/a.wav VOICE_B=/tmp/b.wav CHROME=/opt/pw-browsers/chromium node scripts/harness/voice/shell.mjs
NODE_PATH=$(npm root -g) node scripts/harness/phone/run.cjs   # phones; needs the film-server's video on :5300
bash scripts/harness/run-all.sh                   # every run.cjs harness in one go (needs a video on :5300; see its header)
# Pre-roll ad test: 12 s short video, FILM_AD=/tmp/ad.webm for film-server, FILM_AD=1 for run.mjs
```
- Chromium: `/opt/pw-browsers/chromium` (as root `cdp.mjs` adds `--no-sandbox`).
- Network: in the default environment `www.youtube.com` and `upload.wikimedia.org` are blocked (proxy 403), so
  `room.mjs` waits for "title" forever (not a code bug) and the film video is generated with ffmpeg. To allow them:
  environment settings → Network access → Allowed domains.
- Voice tests pass without STUN (two Chromes on one machine connect with local candidates).
- Screenshots go to `/tmp/...png` (voice harness writes some into `scripts/harness/voice/`); never commit them.
- Careful: `pkill -f vite`-style commands kill your own shell too (the command line matches); find processes with
  `ps` + `awk`.
- When a new file is added to a package's `exports` (`@swm/shared/...`), restart Vite.
- Security headers (CSP…) come from `apps/web/public/_headers` and are only sent by the Worker (`wrangler dev` on
  8787 / live), **not by Vite on 5173**. To test the CSP, use 8787, or put a small 5173 → 8787 proxy in front so the
  dev extension loads the built site (the embed harness then misses 3 dev-only checks, see the 0.9.86 test pass).
- The server allows WebSockets only from its own origin and `localhost` (`index.ts` `guardSocket`) and at most 60 new
  connections per IP and minute (`CONNECT_LIMIT`, also simulated by `wrangler dev`): a test that opens many
  connections in a burst gets `429`.
- GitHub: no `gh`; use the GitHub MCP tools for PRs; `git push` works.
- Deploys from the cloud go through GitHub Actions (no `wrangler login`); keys are in repo Secrets.
