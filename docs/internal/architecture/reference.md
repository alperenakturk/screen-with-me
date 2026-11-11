# Feature reference (how things work)

Purpose: every technical fact about how Sidelit works: files, protocol messages, constants, storage keys, invariants
and the tests that cover them. The bullets below are the "Architecture principles (do not break!)" section of
`CLAUDE.md` as it stood on `main` at 0.9.97.92, moved here **verbatim** by card DOCS1 (9 Nov 2026). `CLAUDE.md` keeps
only the rules and a one-line pointer per invariant.

**One file for now.** It is split into area files (`docs/internal/architecture/<area>.md`: sync engine, rooms and
protocol, chat and reactions, networking, shell and extension, players, room UI, phone / tablet / TV, voice / camera /
stream, sound, tables, side games, Test Lab, security, CI and release) as each area is touched; the split, the
contradictions below and the glossary are resolved inside each area file then. Plan: `docs/internal/OPTIMIZATION.md`,
mapping: `docs/internal/docs-sprawl.md` §2.2.

**Rule:** a developer who changes a feature updates its section here (or its area file once split) in the same PR.
Release notes go to `CHANGELOG.md`, never here as "since 0.9.x" narration.

**Not yet here:** some facts lived only in the old `CLAUDE.md` "Live:" line (Last Heart / poker, `GameSocket`,
`ghost.ts` / `GHOST_MS`, `room.css`, `i18n-tr.ts` / `loadLang`, the uptime cron, `zoomRange`,
`STATS_SAVE_MS`, `FEED_MAX_ITEMS`, `SEEK_STEP`, `.yt-notices-shorts`, `resultCard` / `showPointsResult`, `tableHowTo`,
`gameHint`, `overYoutube` / `clearOfChat`, `SIDE_TOP`, `markHit`, `tvOn`, `quiesce`, `aimAt`, `setGameLive`,
`introOver` / `removedHere` / `swm-joined`, `sendBans` …; full list: `docs/internal/docs-sprawl.md` §1.3). Until they
are mined into area files, read them in `docs/internal/archive/claude-md-history.md` (the "Live:" paragraph, newest
release first).

## Contents

Each entry is a top-level bullet below; search for `- **<title>`.

1. The server is the single source of truth
2. Sync engine
3. Everyone ready
4. Protocol
5. Shorts view
6. YouTube search
7. TikTok
8. Vimeo
9. Podcasts
10. Media kinds
11. Extension rules
12. Security
13. Shell
14. Resilience to ads
15. Manual video pick
16. Rate lock in the extension
17. The extension does not run on our site
18. Kicks and the same browser
19. Shared settings
20. Knock, "Ask before letting people in"
21. Handing the host role on
22. Host handover
23. Sleep resilience
24. HTTP fallback for networks without WebSockets
25. Networks that cannot connect
26. Site
27. First-time path
28. Ghost connections
    - Free plan quota guards (QUOTA1a: free keepalive, limits, measuring; QUOTA2: the HTTP fallback; ERR1: errors)
29. Avatars
30. Intro sound
31. Player controls
32. Phones
33. Phone room as an app screen
34. Room chunk
35. Accessibility
36. Tablets
37. TV version
38. Sound effects
39. Message position
40. Back from the film to the room
41. Outdated extension notice
42. Dead extension bridge
43. Pins
44. Custom emojis
45. Reaction display
46. Hint bubbles
47. No sync when alone
48. Voice chat
49. PlayWithMe
50. Solo side games
51. 🐞 Test Lab
52. Move to another device
53. Browser blocks direct connections
54. Video chat
55. Cameras on phones
56. Streaming / screen share
57. PWA
58. "Back to the room" notice
59. Keyboard
60. Host modes
61. Voting
62. Scheduled start / "Film saati"
63. Sync test
64. Feedback
65. The site's address
66. Saved rooms
67. Today's recap
68. Simpler room
69. Tabs
70. Room UI 0.9.80
71. Who-paused notice
72. Room layout "Cinema Rail"
73. Home page
74. Bigger room on a computer
75. One remote
76. Invite window
77. Hide the side panel
78. Private messages
79. Chat images and links
80. Rooms are independent
81. Room actions in chat
82. Disable emojis
83. Emoji bar
84. Rate
85. Default language is English
86. Avatar choice
87. Avatar lists have no pages
88. CI
89. Scene top space and sides
90. Video events in the extension
91. Save the room
92. Queue

## Known stale or contradicting statements

The bullets were written release by release, so some older sentences are still worded as current although a later
bullet changed the behaviour. Trust the later bullet (and the code). From `docs/internal/docs-sprawl.md` §1.5:

1. **Toolbar under the video:** "Player controls" ("In the window our buttons are the toolbar under the video"), "Hide
   the side panel" ("⇥ in the toolbar under the video"), "PlayWithMe" ("🎮 (`#game-btn`) in the toolbar under the video
   → menu (XOX, Dört Taş, Çiz-Bil, Bilgi yarışması)") and "Room UI 0.9.80" ("Under the video … labelled buttons") are
   superseded on computers by "One remote" (0.9.92.8) and "one rail everywhere" (0.9.93.9); the menu is now the games
   gallery with Classics.
2. **Games open in the video's place** ("PlayWithMe", "Tablets") vs CL2: every room game opens in the free mini window
   by default.
3. **Phones turn sideways → fullscreen** ("Phones (0.9.91.2)") vs "One remote / Phones (0.9.92.8)": turning sideways
   no longer opens fullscreen by itself.
4. **Settings dialog on phones:** "sections are horizontal at the top" vs "Settings is a full page on a phone".
5. **Avatars:** "Avatar lists have no pages: … the grid scrolls" and "Avatar choice … In the extension a panel covering
   the whole window" (the extension has no UI) vs R27 "no tabs, one grid"; the Avatars bullet still explains the parody
   pipeline (`avatars-2/full`, "Parodies only hint at a style") after R20 removed 32 of the 33 parodies.
6. **Room width:** "Scene top space: Room content is centered, at most 1280 px" vs "Bigger room: `main` has no 1280 px
   cap"; "Cinema Rail: the right rail (320 px)" vs `--side-w` `clamp(300px, 21vw, 400px)`.
7. **Emoji bar:** "custom emoji pages via ▲▼ (fullscreen and Shorts)" vs Shorts uses the tray since 0.9.91.7.
8. **Side games gallery:** "Window Garden and Five Frames as 'Soon' until built" (both are built).
9. **Debug panel:** `ui/debug-panel.ts` (card 12) no longer exists; it is the Test Lab (`ui/test-lab.ts`).
10. **CI bullet contradicts itself:** "on every push/PR: … `wrangler dev` + `npm run e2e`" then "a push to main runs
    only typecheck … the PR already ran the local suite" (the second is true, card CI2).
11. **Message position:** "In the extension's room view messages are in the chat panel" vs the later fullscreen /
    film-page messages (R21 / R25); "Message position (0.9.90.1 …)" describes the `#fs-chat` flow that only applies to
    the sync test now.
12. **Five Frames** says "green / gold / grey" and then "were green / gold / grey until the IP audit" in the same
    paragraph (now: solid / dashed / faded frames, no fills).
13. **Pinned numbers** (harness check counts such as "39 checks", "71 checks", "embed 115"; chunk sizes) drift every
    release; the script output is the truth.
14. **Turkish UI labels used as names** ("Oturma odası", "🎲 Keşfet", "✨ Bunun gibi", "Sese katıl", "Filme git",
    "🏠 Odaya dön", "👁 Sayfayı göster", "Herkesi bana eşitle", "Ekranım", "Oda kuralları", "Tamam", "Film saati" …):
    the English label is primary now (`i18n.ts` is English, `I18nKey`); the area files will name the English label +
    i18n key.
15. **Lane tags** inside bullets ("Room chunk (card SZ, lane B)", "Test Lab (lane B leads)") are history: lanes and
    who owns what are in `CLAUDE.md` "Roles".
16. "**PlayWithMe**" is a retired name for the room games (tables); "ghost" means three different timeouts (stale room
    connection 150 s, silent game connection `GHOST_MS` 90 s, lingering camera tile 12 s); see the glossary in
    `CLAUDE.md`.

## Reference

- **The server is the single source of truth.** `PlaybackState { item, paused, position, rate, updatedAt }`;
  position = `position + (serverTime − updatedAt) × rate`. Clients estimate server time with `ServerClock` (in the
  extension the background sends `offset` → `OffsetClock`).
- **Sync engine (`sync-engine.ts`):**
  - Every command to the player goes through `command()`; expected events are counted. Within the window (1 s) only
    **expected** events are swallowed; every unexpected event comes from the user.
  - `enforce()` only commands what is really different (an unchanged message opens no window).
  - Pause: sent **immediately** on a normal `<video>`; only for `seekNoise` players (YouTube) we wait 300 ms, and a
    message arriving during that wait does not restart playback.
  - Seeks are detected from unexpected jumps in time (YouTube has no seek event).
  - Drift: >1 s → jump (3 s cooldown); smaller → close it with ±5% rate on `fineRate` players.
  - Play retry at most once every 3 s (so we don't fight the user during loading/ads).
  - If you change it, add a scenario to `sync-engine.test.ts` (fake clock + fake player).
  - **"3-2-1, together" (0.9.93.2):** a playing state whose `updatedAt` lies in the future is a held start: the engine
    treats it as paused at `position` (`current()`, `holdLeft()`), reports no stall, and a timer enforces the play at
    `updatedAt`; everyone starts at the same server moment (measured 5 ms apart in the harness). The server sets it in
    `RoomObject.countdown`: the first time an item starts playing from ≤ 1 s with ≥ 2 people (by browser, no TVs),
    `COUNTDOWN_MS` (3 s) ahead; not for Shorts / TikTok / film pages / the sync test (`countdownMedia`), a resumed saved
    video, or with `settings.countdown === false` (Room rules, host); once per item (`counted`, storage). The page shows
    the seconds over the video (`showCountdown`, `.countdown`). A user's play during the hold starts the room at once.
- **Everyone ready (`waiting.ts` + engine):** while the room plays, a client whose video has not advanced for 1.5 s
  sends `{t:'ready', ready:false}`; the server (`WaitTracker`) pauses the room as `SYSTEM` and broadcasts the
  `waiting` list. It resumes when everyone is ready or after at most 12 s; the same person cannot make the room wait
  again within 30 s; a manual play/pause/seek cancels the wait; the host can turn it off (`settings.waitForAll`).
  System actions arrive with `by.id === SYSTEM_MEMBER_ID`.
- **Protocol (`protocol.ts`):** the server validates everything from clients and copies it into a new object. On a
  backward-incompatible change bump `PROTOCOL_VERSION` (old clients get a "refresh the page" error; extension users
  must update, careful). Optional new fields (avatar, cid, hostId…) can be added without a bump.
- **Shorts view ("Oturma odası", site `ui/seats.ts` + `room.ts` "Shorts view"):** a `youtube.com/shorts/…` link becomes
  `{kind:'youtube', id, short: true}` (optional field; the same video added via a normal link stays horizontal). When
  a Short is playing, `.room.shorts`: right panel, link box and toolbar hidden; vertical video in the middle, people
  on both sides (at most 6, the rest "+N"; on phones one row under the video), a 6 s bubble from the avatar of whoever
  writes, emojis rise from the avatar (above the video if they have no seat). At the bottom: message box + emoji bar
  + 🔁 Loop + "↩ Oda görünümü" (remembered per tab, `sessionStorage` `shortsOff:<room>`; back with "📱 Shorts
  görünümü" in room view). View changes use View Transitions (video `view-transition-name: swm-player`; without
  rendering, no transition after 0.6 s). ↑/↓, PageUp/Down, ▲▼ and the mouse wheel (outside the video, once per 0.9 s):
  ↓ = `next` (not sent when the queue is empty, a note appears), ↑ = `{t:'prev', from}`: the server keeps recently
  played items in `played` (30, in storage), opens the previous one, puts the current one at the head of the queue
  (only the host when `hostOnly`). Short to Short: the new video slides in from below (going back: from above). Loop
  is `settings.loop` (host): when the video ends the client sends `{t:'next', end: true}`; if loop is on and the video
  is a Short the server applies `restart` (seeks to start; not again if position < 2 s, simultaneous "ended" messages
  count once). A manual "Next" skips even in loop. **0.9.90.1 (owner: "working is not enough, make it great"):**
  A Short that starts while I'm in fullscreen leaves fullscreen so the Shorts view shows (0.9.91.16, owner; not on
  the TV). YouTube → YouTube switches reuse the same player (`PlayerAdapter.load` = `cueVideoById`; no new iframe, switching
  used to take 1–2 s), phones swipe up/down on the stage (≥60 px, mostly vertical, ≤0.8 s; not on chat / emoji bar),
  and the wheel scrolls (since 0.9.91.18 beside the video, not on it: YouTube's own bar is there; phones swipe on the
  stage's margins or use ▲▼). Next
  ideas in `STATUS.md`. Test: `scripts/e2e/shorts.mjs`. **0.9.90.7:** many links pasted in the link box at once
  (`parseMediaList` in `media.ts`: only tokens that look like links, YouTube / video files, no film pages, duplicates
  dropped, at most `MEDIA_LIST_MAX` 30) go to the queue one by one 300 ms apart (the server's command limit is 4/s; with
  "Şimdi aç" the first one opens now); while a Short plays the next queued YouTube item's thumbnail is fetched ahead
  (`warmNextShort`) so the cued player shows it at once.
  **0.9.90.9 (owner's idea):** in the Shorts view there are no camera tiles (`html.shorts-view .voice-cams` hidden);
  a person's camera fills their seat's avatar circle (`seats.setCams`, fed by voice's `onCams` with the cameras on
  screen, hidden ones and "hide myself" left out; videos kept between redraws, mine mirrored, green ring); the bottom
  bar has only 🎙 / 📷 (`#shorts-voice`; not in voice yet, 🎙 joins); seats are bigger there (80 px, 52 px on phones).
  **0.9.91.7 (owner):** the Shorts bar's emojis are the room's "😀 Tepki" tray (`.tray-bar`: custom emojis, the three
  recent) and "＋ Ekle" (`#shorts-add`) queues links (one or many, same paths as the link box; words point to the ♾
  feed); on a phone Tepki shares a row with 🎙 / 📷 and ↩ / 🔁 lose their text. **0.9.91.12:** words in "＋ Ekle" search
  YouTube Shorts only (`ui/shorts-search.ts`, the feed's `short=1` search, ≈ 1 % of the day's quota per new query,
  cached); a row's ＋ queues it as a Short; before joining voice 🎙 / 📷 look plain (never red: since the YT5 batch, red = off only while in voice). **0.9.91.13:** a game in
  the Shorts view is always a free window (`games/stage.ts` `shortsView`: opening the view with a game open saves
  `gamePlace:<kind>` = float and sizes it to fit right of the video, `besideShorts`; it stays free back in the room
  view); 🎮 in the Shorts bar (`#shorts-game`, `extraButtons`: the hub moves next to the button pressed); a new ♾ feed
  dequeues the old feed's Shorts still waiting (`feedAdded:<room>`).
  **0.9.91.18 (owner: "finish Shorts"):** nothing of ours over the YouTube player in the Shorts view (YouTube's
  Required Minimum Functionality, checked in the API audit): no catcher, no own bar, emojis rise from the seats
  (`seats.react`, the "+N" seat for people without one), never `reactions.show` there. The room view (flying emojis,
  dock, toasts over YouTube) is a separate job before the audit. **🎲 Keşfet** in the ♾ popup: chips Popüler / Müzik
  / Oyun / Komedi / Hayvanlar / Spor (`POOL_KINDS`) start a feed from `/api/youtube/pool?kind&hl&page` (Worker
  `youtubePool`: the most watched Shorts of the last 14 days, `videoCategoryId`, `order=viewCount`, region TR / US,
  `safeSearch=strict`, 50 per page; one shared answer per kind + language + UTC day in `caches.default`, `yt-pool1`;
  rooms shuffle it). **✨ Bunun gibi** (top of the ♾ popup): `/api/youtube/like?id&hl&page` (`youtubeLike`: the
  video's channel → uploads playlist → its Shorts, 4 units; `next` = `LIKE_SEARCH_PAGE` switches to a search on the
  title's words, `titleWords`, 101 units a page; `yt-like1`). Feed sources are `FeedSource` (`topic` / `pool` /
  `like` / `channel`, `sessionStorage` with the feed). **Card 10 (0.9.96.1):** a channel link / @handle in the ♾ window →
  `/api/youtube/channel?c=UC…|@handle` (`youtubeChannel`: channels.list by id or `forHandle`, the uploads playlist, its
  page of 50, videos.list = 3 units a page, `yt-chan1` per channel + day); Discover's `region` (`opt:poolRegion`, 🌍 select:
  auto = `cf.country`, world, or `POOL_REGIONS`), the pool cache is per kind + region + language + day (`yt-pool2`). **Switch measurement:** `?measure=1` (the old `?olcum=1` too) once in a tab → `#shorts-measure` by
  ▲▼ shows how many ms after the room switched (server time, `state.updatedAt`) this Short started moving, and the
  average of the last 5 (`measureSwitch`; nothing is sent).
  **0.9.92.2 Shorts rail (owner chose C on https://claude.ai/artifact/FDEUP6Msgo6UbxYtAu9379: "too small on my
  laptop"):** above 860 px wide the `#shorts-bar` is a column of 48 px icon buttons right of the video (grid column 3,
  ▲▼ `#shorts-nav` at its foot; names in the titles): 💬 `#shorts-chat-btn` (or Enter) opens the message box as a small
  window (`.shorts-chat-wrap.open`, Esc / outside click closes), 😀 tray, 🎙 / 📷, ＋, 🎮, ♾, 🔁, ↩. Its windows open right
  of the rail; `fitRailPops` slides one back on screen when the window is small. (0.9.93.1: the rail's 48 px square-button rule skips
  buttons inside its windows (`.shorts-feed-pop *`, `.react-tray *`, `.game-menu *`); a window is capped to the screen
  and scrolls inside; `fitRailPops` also runs when results arrive (`childList`); ＋ Add = box + button on one row, with
  a title + ✕ as a phone sheet; the player's "can't be played here" note is a card in the empty bottom left.) The video is `100dvh − 103px` (cap
  1100). Under 900 px tall the top bar folds (`position: fixed`, off screen) and the video is `100dvh − 40px`: ⋯
  `#shorts-more` or the mouse at the very top edge adds `html.topbar-peek`; an outside click / Esc / leaving the view
  folds it again. Under 760 px tall the rail is slimmer (40 px). ≤ 860 px (narrow windows) keep the bottom
  bar; phones have their own slim bar (0.9.92.4, "Phone room as an app screen"). `besideShorts` measures from the rail's right edge. Probe sizes: 1366×768 → 410×728 (was 314×558). Test: `scripts/harness/shorts-rail/run.cjs` (22 checks).
  **0.9.91 endless Shorts feed (`ui/shorts-feed.ts`):** "♾ Shorts akışı" in the Shorts bar (topic box) or "📱 Shorts
  akışı" on a search's results starts it; when fewer than 3 are queued (and nothing but Shorts is playing) it asks
  `/api/youtube/search?short=1&page=…` (Worker: `videoDuration=short`, "#shorts" added, 25 per page, `nextPageToken`
  passed on as `next`, only ≤ 180 s non-live results; cached per words + page) and adds up to 8 unseen ones (rest kept
  as `pending`), 300 ms apart, then pauses until they are in the queue. Runs in the tab that started it
  (`sessionStorage` `feed:<room>`); stops on quota / off, when the topic runs dry or after 3 empty pages, and when only
  the host may change the queue. Each page ≈ 1 % of the day's quota. Since 0.9.92.6 ♾ always opens its window; a running
  feed shows on top (`#shorts-feed-now`, "On now: …" + Stop) and stops only from there (it used to stop on the press).
- **YouTube search (0.9.90.4, `packages/shared/src/youtube-search.ts`, Worker `src/youtube.ts`, site `ui/search.ts`):**
  words instead of a link + Enter in the link box → `POST /api/youtube/search?hl` with the words as a form body `q` (since 0.9.96.20, security M6: never in the logged address; `wordsRequest`, `readWords`; podcasts search the same) (only on Enter, never while
  typing). The Worker holds the key (`YOUTUBE_API_KEY`, repo secret; the deploy job uploads it with
  `wrangler deploy --secrets-file`; without it the answer is `{error:'off'}`, as locally and in CI), calls search.list
  (`type=video`, `videoEmbeddable`, 12 results) + videos.list for durations = 101 of the 10 000 free daily units
  (≈ 100 searches/day). Same words + language are answered from `caches.default` for 24 h; a quota error is remembered
  for 10 min (refused calls cost nothing, so search reopens by itself after YouTube's midnight-Pacific reset); only
  calls that reach YouTube count against `SEARCH_LIMIT` (10/min per IP hash); a foreign `Origin` gets 403. Answers:
  `{items:[{id,title,channel,duration,live,short?}]}` or `{error: quota|busy|off|failed}` (`short`, 0.9.91.12: videos.list
  also asks `player` with `maxWidth=100`; an embed taller than wide + ≤ 180 s = a Short, marked 📱 in the list and
  opened in the Shorts view; the cache key is `yt-search2`) (each has a friendly note; links
  always still work). The thumbnail is built from the id (`i.ytimg.com`, already in the CSP); the page also caches
  full answers in memory. A row adds to the queue (plays at once in an empty room), "▶ Şimdi aç" loads it. Privacy
  policy has a "YouTube search" section (YouTube API Services, YouTube Terms, Google privacy policy). A quota increase
  needs Google's API compliance audit (owner, before 1.0). Test: `scripts/e2e/search.mjs` (live: real results or
  `quota`).
- **TikTok (0.9.91.19, PDF item 2, `players/tiktok.ts`):** `{kind:'tiktok', id, user?}` (optional new kind, no version
  bump: `cleanMedia` validates `TIKTOK_ID` / `TIKTOK_USER`). Links: `tiktok.com/@user/video/<id>`, `/v/<id>`,
  `/embed/v2/<id>`, `/player/v1/<id>` (`parseTikTok`); short share links `vm.` / `vt.tiktok.com` go through the
  Worker (`/api/tiktok/resolve`, `tiktok.ts`: follows redirects only on tiktok.com, cached a week, `SEARCH_LIMIT` on
  real lookups). Played in TikTok's official embed player `https://www.tiktok.com/player/v1/<id>` (TikTok's own bar,
  `rel=0`, no fullscreen button) driven by its postMessage API (`x-tiktok-player`: play / pause / seekTo / mute /
  unMute; onPlayerReady / onStateChange / onCurrentTime / onMute / onError; commands wait for ready). Always the
  Shorts view (`isShortItem`), loops like a Short, always 1× (`maxRateFor` → `TIKTOK_RATE`; the server lowers the rate
  when one opens). Titles from TikTok's oEmbed (needs the @handle; else "TikTok · @user"). CSP `frame-src
  https://www.tiktok.com`. Privacy policy "TikTok videos". The cloud can't reach tiktok.com: harness
  `scripts/harness/tiktok/run.cjs` replaces the player with a fake page speaking the same protocol (8 checks); the
  real player is the owner's check.
- **Vimeo (card P1, `players/vimeo.ts`):** `{kind:'vimeo', id, hash?}` (optional new kind, no version bump: `cleanMedia`
  validates `VIMEO_ID` / `VIMEO_HASH`). Links (`parseVimeo`): `vimeo.com/<id>`, `/<id>/<hash>` (unlisted),
  `/channels/<c>/<id>`, `/groups/<g>/videos/<id>`, `/showcase|album/<n>/video/<id>`, `player.vimeo.com/video/<id>?h=`;
  other Vimeo pages stay film pages. Played in Vimeo's own embed player `player.vimeo.com/video/<id>?h&dnt=1` (its own
  bar; no `fullscreen` in `allow`, the room's fullscreen holds it) driven by player.js's postMessage protocol spoken
  directly (no SDK script): `{method, value}` out (`addEventListener` per event after `ready`, `play`, `pause`,
  `setCurrentTime`, `setMuted`, `getDuration`, `ping`), `{event, data}` / `{method, value}` in, objects or JSON strings;
  a refused `play` (`error` with `method: 'play'` / `NotAllowedError`) = autoplay blocked. `seekNoise: false` (a seek
  gives `seeked`, no play / pause). Always 1× (`VIMEO_RATE`; speed only on paid accounts). Room view, gets the
  countdown. Titles from Vimeo's oEmbed (`titles.ts`), title key `vm:<id>`. CSP `frame-src https://player.vimeo.com`.
  Privacy policy "Vimeo videos". Harness `scripts/harness/vimeo/run.cjs` (fake player, 12 checks); the real player is
  the owner's check.
- **Podcasts (0.9.96.5, card P2):** words in the link box + Enter → the YouTube results' head has "🎧 Podcasts"
  (`ui/search.ts` `podcast` option) → `ui/podcasts.ts` (lazy chunk, own texts, same row classes so arrows / Esc work):
  shows from `GET /api/podcasts/search?q&hl` (Worker `podcasts.ts` → Apple's iTunes Search API, no key, country TR /
  US, cached a day, `pod-search1`), a show's newest 30 episodes from `GET /api/podcasts/episodes?id` (Apple lookup →
  the feed address from Apple's own answer, never from the page, so no SSRF; the feed read up to 4 MB, cached an hour,
  `pod-episodes1`); only real calls count against `SEARCH_LIMIT`; a foreign `Origin` gets 403. Pure parsing in shared
  `podcasts.ts` (`parseItunesSearch`, `parseItunesLookup`, `parseFeed`: a small RSS reader, enclosure of an audio type,
  titles decoded, `itunes:duration`). An episode is `{kind:'html5', url, poster}` (`poster` optional, no version bump,
  only `https://*.mzstatic.com`, `PODCAST_ART`; the html5 player shows it as the video's poster), sent with the title
  "show · episode" (the server now keeps a client title for film pages and these). CSP `img-src` + `*.mzstatic.com`
  (`media-src` was already open). Privacy policy "Podcasts", help page. Tests: unit `podcasts.test.ts`, e2e
  `podcasts.mjs`, harness `scripts/harness/podcasts/run.cjs` (11, stand-in answers + a generated WAV).
- **Media kinds:** `youtube`, `html5`, `tiktok`, `vimeo` and `test` play on the site; `page` (any other web address) plays on the film
  site itself, everyone in their own tab, with the room overlay opened by the extension (see "Shell").
- **Extension rules:** does nothing while not in a room (frames check `storage.session` `sessions`; sleeps if there is
  no shelled tab). The background picks the best video (based on the frames' scores). The extension has no UI of its
  own; the only things it adds to a page are the overlay iframe and, when autoplay is blocked, the "İzlemeye başla"
  card (closed shadow DOM).
- **Security:** user data is never written with `innerHTML`; every typed text others see goes through `cleanText` (L1). Rate limits live on the server. Host/kick use a
  persistent browser identity (`cid`, not an account); a kicked person cannot rejoin until the host lifts the ban
  (the `bans` list only goes to the host, removed with `unban`; cids are never sent to clients). Host checks are per
  person (`isHost`): the same person's site tab and extension tab are both host.
  **Hardening (0.9.86, `docs/internal/security-review-1.md`):** the Worker accepts WebSockets only from its own origin
  and `localhost` (`index.ts` `guardSocket`), at most 60 new connections per IP and minute (rate-limit binding
  `CONNECT_LIMIT` in `wrangler.jsonc`), and passes the room a short hash of the IP in `X-SWM-Ip` (since 0.9.96.19, security M5: HMAC-SHA-256 with a random key made per UTC day by the `IpKeys` object (binding `IPKEYS`, migration `v10`), `ip-key.ts` `ipKey`, shared `ip-hash.ts`; the old key is overwritten, so yesterday's hashes can't be linked to an address; if the object can't be reached an isolate-local key is used) (set only by
  the Worker; kept in the connection's attachment, never stored or sent to clients; used for emoji upload limits).
  Security review 4 (0.9.97.49): no request-scoped promise in a global (R4-2: `dailyKeyCache` keeps only the resolved
  key, the object call has a 3 s timeout); `/api/probe`'s plain GET is limited per address and ≤ 200 kB (R4-3); a
  new third-party action is pinned by commit SHA with its version in a comment, and secrets for the deploy belong in the
  `production` environment (R4-5).
  Security headers live in `apps/web/public/_headers` (CSP: scripts only from us + YouTube; no inline scripts, so
  static pages load `extension.js` / `gizlilik.js` / `offline.js`; if you add a third-party script, image or frame host,
  add it to the CSP). `frame-ancestors` is impossible (in the shell the film site is an ancestor), so `main.ts`
  refuses to run in any frame except the extension overlay (`isShell`).
- **Shell (room overlay, `packages/shared/src/shell.ts`):** when a `page` opens in the room, the site sends
  `{source:'screenwithme-site', type:'go', roomId, url}` → site-bridge → background `site-go` (records the tab in
  `shells`, `storage.session`) → the tab goes to the film page. The person who opened it goes there directly; others
  get a "Filme git" card (we never redirect anyone without asking). On the film page the top frame opens the
  `chrome-extension://…/shell.html` iframe full-screen (the room id is NOT in the URL/attributes: the film site can
  read the overlay element; shell.html gets the id from the `swm-shell` port with `{type:'room'}`, and the background
  refuses if the tab is not in `shells` → a shell.html embedded in some other page opens nothing), which in turn opens
  our site `/r/ROOM?shell=1` (our site is not subject to the film page's CSP, the film site cannot reach into it).
  The **site** in the overlay holds the room connection (the same person appears once); the extension is only a
  relay: site ⇄ shell.html (postMessage, origin-checked) ⇄ background (`swm-shell` port) ⇄ film frames (`swm` port).
  Site → film: `embed` requests (`state`, `clock`, `control`, `detach`); film → site: `reply` (`send` only if
  `isRelayable`, `status`, `key`), `page` (the tab's address), `video` (found or not), `fullscreen`. The site reports
  `layout`: `full` (always while there is a film, even before the video starts: room view; `hole` = `.player-wrap`,
  `islands` = cards/controls inside the hole) or `open` (something the site plays itself, no hole). The top frame
  applies `clip-path: path(evenodd …)` to the overlay (clicking the hole clicks the film player); `focus.ts` fits the
  video into the hole (if there is no video yet, `likelyPlayer`: the largest video/frame or a box close to 16:9; the
  overlay starts in `open`; `bar` is no longer used). In the shell the site's backgrounds do not paint the hole
  (`shell-film`, `--hole-cut`); messages inside the hole are semi-transparent (the overlay iframe and shell.html use
  `color-scheme: dark`: our site declares a dark scheme, and with different schemes Chrome paints the frame's
  background opaque grey). While the film page opens, a `[data-swm-cover]` cover stays until the overlay is up
  (document_start, if the address ends with `#swm-cover` (added by the background on `site-go`, removed with
  `replaceState` before any page script; 0.9.83, fixes a one-frame flash on the first arrival), `sessions` contains
  this site or the tab's `sessionStorage` `swm-cover` is set; it swallows
  clicks and is removed on the first layout reported by the site (`fromSite`; not on the background's placeholder),
  at most 8 s). On first open the hole opens two frames after focus, and the top frame says `{type:'hole'}`: only then
  does the site turn on `shell-film` (transparency) (turning it on earlier showed the film site for one frame). If
  nothing resembling a player exists in room view, the page stays hidden (`blank`). In fullscreen the film fills the
  screen with its own player bar and our dock sits on the right (see "Player controls"; mouse movement on the film page
  reaches the site as `activity` → `fullscreen.poke()`); islands are always clipped to the hole. "👁 Sayfayı göster" (top, in the shell):
  the overlay becomes `bar` (48 px strip) and the film page is shown as is (to close ads/popups); "↩ Oda görünümü"
  goes back; if no video is found 10 s after the film opens, the button is suggested (`flashHint`). The focus box
  does not clip overflow (that cut off subtitles) but draws no scrollbars (0.9.91.3: a scrolling player box showed one on the film's right edge) and dispatches `resize` when its size changes (subtitles). If the video is in an inner frame,
  the right frame grows through the `swm-focus-here` chain. In the shell the site skips the name step; the extension
  link, main logo and footer are hidden; "🏠 Odaya dön" + "👁 Sayfayı göster" + "🎯 Video seç" sit together in the
  middle of the top bar (`.shell-tools`, 0.9.90; icons only under 1100 px). **The room view never scrolls on the film
  page (0.9.90):** the right rail fits the window (`.side` flex column, `max-height: 100vh - 110px`, tabs card takes
  the rest) and the hole has `max-height: 100vh - 250px` (it may be wider than 16:9; the film keeps its shape inside).
  Scrolling moved the hole and the film video followed a few frames late (it "slid out of its frame"); if a tiny
  window still scrolls, `scroll` reports the layout every frame. "🏠 Odaya dön" (`navigate` → the room on the site, overlay goes
  away). When another `page` opens in the room: "Filme git"; when something the site plays opens: the overlay opens
  and the film engine stops (`detach`, no "pause" goes to the room). Fullscreen: our ⛶ makes the whole film page
  fullscreen and the room switches to `.theater.fake-fs` (`:is(:fullscreen, .fake-fs)`); the film site's own ⛶ only
  shows the video. If the user navigates from the film site to another site (the last two labels of the domain
  change) the overlay is removed (`Shell.site`). When the site is ready it says `shell-ready` (earlier `page`/`video`
  messages are re-sent). On leaving the page the site closes its connection (`pagehide`; otherwise the bfcache page
  made the person appear twice). In the shell there is no queue tab and no link box (go back to the room to pick
  the next item); the logo and "🏠 Odaya dön" ask first (`ui/confirm.ts`). While one of the site's dialogs is open
  (avatar, theme, recap, confirm) the hole closes completely (the dialog is in front of the video). The film site's
  fullscreen is redirected to the room's: `fullscreen-guard.ts` runs in the page's world (MAIN world); while
  `<html data-swm-room>` is set it does not call `requestFullscreen` but dispatches a `swm-fullscreen-request` event;
  if the video's built-in ⛶ is used, the content script exits and requests the room's fullscreen. On the main site,
  "Şimdi aç" + a film link first asks with a short explanation. Test: `scripts/harness/embed/run.mjs`.
- **Resilience to ads (`docs/internal/reklamlar.md`):** a video with a known duration under 60 s (ad/preview) is not
  attached to the engine: nothing goes to the room and it is not seeked to the room's position; when the source of the
  same `<video>` changes we don't attach until the duration is known (at most 3 s); once it is long (the film) we
  attach and the person jumps to the room's position. Scoring lowers short (×0.1), muted looping (×0.2) and small
  corner-pinned (×0.3) videos; frames of known ad networks (`AD_HOSTS`, short list, nothing is blocked) have no
  candidates. In room view, videos playing with sound other than the film's player are muted (unmuted when the room
  ends; if a film is chosen later its sound is restored). We do NOT ship our own ad-block list, `window.open`
  wrapper, or ad skipping (store "single purpose" policy, easy to break). The extension page suggests uBlock Origin
  Lite. 0.9.60: **a5** in room view, a tab opened from the film tab ≤3 s after a click on the film page that goes to
  another site within its first 5 s is closed (background `tabs.onCreated` `openerTabId`; Ctrl+T's
  `chrome://newtab`, links from our site `open-ok` and "Geri aç" `reopen` are untouched; `opt:closeAds`), the site
  shows a "kapatıldı · Geri aç" note; **a6** if the film tab navigates to another site ≤4 s after a click, the overlay
  stays (`Shell.strayed`, `page.strayed`) and the site says "Filme geri dön"; **a3** while a short video plays in the
  active frame and the film is not playing: `{t:'ready', ready:false, ad:true}`: the server does not make the room
  wait, the member gets `ad: true` ("📺 reklamda"), cleared when the film comes (the site also clears it when
  closing). Test: film-server `/popup` `/redirect` `/preroll` (`FILM_AD`).
- **Manual video pick (0.9.60, extension `picker.ts`):** in the shell "🎯 Video seç" → the overlay becomes a strip
  (`peek = 'pick'`), every frame draws a "Bunu senkronla" button over its videos (closed shadow DOM); the chosen video
  becomes `picked` in its frame (score `PICKED_SCORE`, synced even if short), the old video stops, another frame's
  pick is cleared with `unpick`. Test: `/two`.
- **Rate lock in the extension:** the engine in the film frame uses `lockRate: true`; the rate only changes from our
  speed menu; changes by other speed extensions are not spread to the room and are reverted (with a stubbornness
  limit). Off on the site.
- **The extension does not run on our site:** the content script is never injected into our pages
  (`exclude_matches`) and does nothing in frames inside our site (`ancestorOrigins`: YouTube player, the site in the
  shell).
- **Kicks and the same browser:** same `cid` + different name → only that name is banned (`cid|n:name`); same cid +
  same name → the host's own tab, closed with a ban-less "kicked".
- **Shared settings (`storage.ts` + extension `store.ts`):** every `save()` on the site also goes to the extension with
  its write time (`__at`) (in the extension each setting has its own key: `site:<key>`; the old single object
  `siteStore` is read-only. With a single object, two quick read-modify-writes overwrote each other: the name got
  lost and the person appeared with an old name on the film page; writes are also serialized). On startup
  `syncStore()` reconciles (newest wins), then `app.ts` loads (language/theme correct on the first frame). On the
  main site the bridge is site-bridge; in the shell it is shell.html (the shell site's own storage may be separate or
  blocked; then in memory). Shell mode only if the top frame really is `chrome-extension://` (so another site can't
  read settings with `?shell`).
- **Knock, "Ask before letting people in" (card R12, 0.9.97.9):** `settings.knock` (host, default off; Room rules
  `#opt-knock`, the invite window's `#invite-door` for the host). In `RoomObject.join()` `mustKnock()` runs before the
  connection gets a name: a browser key not in `admitted` (storage, 24 h after it was last in (`admit24h` on leave),
  ≤ `MAX_ADMITTED` 500; cleared on the empty-room reset) and not the host's waits as a knocker (`Attachment.knock`,
  no `welcome`, no member, a second `hello` refused). The host's tabs get `{t:'knocks', list: KnockEntry[]}`
  (`sendKnocks`, after every join / leave), knockers `{t:'knock-wait', hostHere}`; `{t:'knock-answer', id, allow}`
  (host only): allow → admitted + `join`, refuse → banned like a kick (`kicked`, 4003). Limits: `MAX_KNOCKS` 8 at the
  door, `KNOCKS_PER_IP` 2 (`knock_busy`, 4010), `KNOCK_MAX_MS` 10 min (4011). Turning it on admits everyone present.
  BH3 (0.9.97.19): the list goes to whoever acts as host (`hostId`: the real host, or the oldest person during their
  absence; the rule `answerKnock` checks), everyone else gets an empty list (so "Make host" moves the cards); the same
  browser knocking again replaces its older knock (4005); turning the switch off lets whoever waits in at once.
  Site: the join card becomes `#knock-wait`, the host's `.knock-card`s top right (`drawKnocks`, `roomJoin` sound).
  Tests: e2e `knock.mjs`, harness `scripts/harness/knock/run.cjs`.
- **Handing the host role on (0.9.93.2):** `{t:'make-host', id}` (host only, not to a TV): `hostKey` becomes that
  person's key for good (all their tabs), the old host is a guest; everyone gets `members` and the chat says "X is now
  the host"; the new host gets the removed list (`bans`, BH4). UI: 👑 next to each person in People (`people.ts`) and "👑 Make host" in the person menu (`voice.ts`), both
  after a confirm (`askMakeHost`). Only the real host (`hostKey`) may, not a guest acting as host during the reload grace (M2). Test: e2e `host.mjs`.
- **Host handover:** when the host's last connection leaves, `hostGoneAt` is written; if they return within 20 s
  (`HOST_GRACE_MS`) they stay host (page reload); otherwise on the next join hosting moves permanently to the oldest
  person in the room (`settleHost`); the old host cannot take it back.
- **Sleep resilience (DO):** the "everyone ready" state (`WaitTracker.snapshot`) and `emptySince` are written to
  storage; a single alarm covers both the 12 s wait and the 24 h room deletion (`scheduleAlarm`). Never rely on
  in-memory `setTimeout`.
- **HTTP fallback for networks without WebSockets (0.9.92, owner's phone hotspot, `docs/internal/hotspot-connection.md`):**
  every room / game connection goes through `openSocket` (`packages/shared/src/socket.ts`): a WebSocket first; not
  open within 6 s (`WS_OPEN_MS`) or failed before opening → `HttpSocket` on the same address with `?http=open|send|poll|
  close` (POST open → `{sid}`; POST send = JSON array of message strings, ≤ 40, ≤ 1.1 MB; GET poll held ≤ 20 s, answer =
  messages one per line; `410 {code}` = closed). Server `apps/server/src/fallback.ts`: `PollHub` per Durable Object,
  `PollSocket` shaped like a hibernatable WebSocket (send / close / readyState / attachments); the objects' socket lists
  are `ctx.getWebSockets()` + `polls.sockets()` and every message goes through the same `webSocketMessage`; new
  connections are set up in `admit()` (shared by both ways). The Worker's `connect()` routes both (only `open` counts
  against `CONNECT_LIMIT`; origin checked; `X-SWM-Ip` / `X-SWM-Room` set only by the Worker). Sessions are in memory
  (idle 45 s → closed, never polled 10 s after `open` → closed; BH8: closed in the object's alarm (`PollHub.sweepDue`, the
  objects' `scheduleAlarm` include `nextDue()`, `open` calls the `schedule` handler), never from a bare `setInterval`:
  the room's leave run from a timer long after the last request reset the live object now and then (every socket 1006); a restart → `410` → reconnect with `prev`). Limits (0.9.93.8, security review 2 H1): `send` bodies read as a stream up to `SEND_BODY_BYTES`, ≤ 11 M characters queued per session (one full join with every emoji + chat image fits), ≤ 24 M per object (`HUB_BYTES`); `hello` is accepted once per connection (`bad_message` after), votes count only people in the room (≤ `MAX_MEMBERS`). Once needed, the tab prefers it (`sessionStorage`
  `swm:http`, 30 min); the room's socket probes `/api/probe` (Worker-only WebSocket, says "ok") after 1, 2, 4 … 10 min
  and closes with `UPGRADE_CODE` 4100 to reconnect over a WebSocket. A closing page hands its member id to the next
  page of the tab (`swm:prev:<room>`, 30 s) so a reload replaces the old connection at once; the fallback's close goes
  as a beacon. The room's alarm never deletes a room with `emptySince === null` (starts counting instead). The site
  marks `<html data-swm-transport="ws|http">`. The TV pairing socket stays WebSocket-only. Tests: e2e `fallback.mjs`,
  unit `socket.test.ts`, harness `scripts/harness/hotspot/run.mjs` (proxy swallowing upgrades in front of
  `wrangler dev` serving the built site).
- **Networks that cannot connect (0.9.79):** on some mobile networks (the user's phone hotspot) the page loads but the
  room's WebSocket neither opens nor closes (stuck on "Bağlanıyor…"). `RoomConnection` closes a connection that does
  not open in time and retries (`OPEN_TIMEOUT_MS`, 16 s since 0.9.92, `onFailures`); after 2 failed attempts the room shows
  "📶 Odaya bağlanılamıyor" (`.net-hint`, suggests another network / DNS 1.1.1.1). `/connection` (`diag.ts`, the old `/baglanti` redirects): page
  protocol (h3 = UDP), plain request, WebSocket open, welcome, ping; "Sonucu kopyala" (0.9.92: + a 200 kB answer, a tiny
  WebSocket, the HTTP fallback and a `guess:` line). The HTTP fallback shipped in 0.9.92 (above); an own domain is still
  recommended (workers.dev may be filtered).
- **Site:** on reload (same tab, `sessionStorage` `in:<room>`) the name step is skipped and the intro animation is not
  shown again. ⟳ calls `connection.reconnect()`. If a ping gets no answer for 15 s, `RoomConnection` reconnects (don't
  only look at "silent for long": Chrome throttles background-tab timers to once a minute).
- **First-time path (0.9.91.20, PDF item 1, owner chose "one screen" + "3 tips"):** the join step is one card
  (`room.ts` `renderRoom`): "🍿 Ali seni bekliyor" / "Ali ve 2 kişi…" + "Şu an: <title>" from `GET /api/rooms/:id/info`
  (`count` = people by cid without TVs, `people` = up to 3 names, `playing` = the current item's title or null; names
  are already visible to anyone in the room), the avatar is a button next to the name (`openAvatarDialog`), one
  "Odaya gir". The first time in any room (`localStorage` `tipsSeen`) `ui/first-tips.ts` shows 3 bubbles: 🔗 Davet et
  → the link box (＋ on phones) → 🎙 Sese katıl ("Sonraki" / "Anladım", ✕ / Esc end them; not in the shell / TV).
  Extension install while the "Filme git" card waits: the extension has the `scripting` permission and on
  `onInstalled` (`install`) injects `site-bridge.js` into open site tabs; the site watches `data-swm-extension` and
  redraws the card ("✓ Eklenti kuruldu!"). Store-time follow-up: a one-click store link on that card.
- **Ghost connections:** the server keeps each connection's last message time (`seen`); connections silent for 150 s
  are closed and dropped (`pruneStale`, on join and at most every 20 s). **Reconnects (0.9.84):** `RoomConnection`
  remembers its member id from `welcome` and sends it as `hello.prev`; the server closes that old connection at once
  (`4005 replaced`) if it has the same `cid` — before, the old one stayed in the room (people count went up, a frozen
  camera tile) until the stale check. The room title counts people (name + avatar), not connections.
  **Same member id on reconnect (0.9.91.16, owner: "why does it throw me out of voice and put me back"):** the server
  keeps `memberIds` (id → cid, storage, 24 h, at most 200) and gives `hello.prev` back as the new connection's id when
  the browser id matches and nobody holds it (also after a server restart / deploy, when the old socket is gone).
  The site then keeps voice as it is (`P2pVoice.resume()`: only re-announces mic / camera; no leave + rejoin), and
  `P2pVoice.sync` waits before closing a vanished person's connection (15 s if they left the list, 2.5 s if they are
  still in the room without voice). Voice-join sounds skip people who come back within 30 s. The film page (ExtVoice)
  still rebuilds. Tests: e2e `handover.mjs`, `voice/run.mjs` (the same camera track survives ⟳).
  Since QUOTA1a "last message" means the later of `seen` and the runtime's last free-keepalive answer (`heardAt`, below).
- **Durable Objects and their migrations** (`apps/server/wrangler.jsonc`; all SQLite-backed, a new class = a new
  migration tag, never an edited one): `v1` `Room` (`ROOMS`), `v2` `Game` (`GAMES`), `v3` `Draw` (`DRAWS`), `v4` `Quiz`
  (`QUIZZES`), `v5` `TvLink` (`TVLINKS`), `v6` `Poker` (`POKERS`), `v7` `FeedbackGate` (`FEEDBACK`), `v8` `MoveLink`
  (`MOVELINKS`), `v9` `YoutubeUsage` (`USAGE`), `v10` `IpKeys` (`IPKEYS`), `v11` `UploadGate` (`UPLOADS`), `v12` `Sea`
  (`FLEETS`), `v13` `FallbackGate` (`FBGATE`), `v14` `Duel` (`DUELS`, Five Frames Duel, 0.9.97.99).
- **Free plan quota guards (card QUOTA1a, 0.9.97.93; `docs/internal/OPTIMIZATION.md`, `docs/internal/security-review-cf.md`
  CF-1 / CF-3 / CF-5):** every message that reaches a Durable Object is billed, an awake object is billed by the second,
  and on Free a used-up quota stops every object until 00:00 UTC (a full storage until rooms expire).
  - **Free keepalive** (`packages/shared/src/keepalive.ts`, `apps/server/src/keepalive.ts`): pages send the exact text
    `KEEPALIVE` (`{"t":"hb"}`); every object answers it through `ctx.setWebSocketAutoResponse` (`startKeepalive`), so it
    neither wakes nor bills the object and a room where people only watch can hibernate. The room page sends it every
    10 s (`ROOM_KEEPALIVE_MS`) and a real `{t:'ping', c}` (a `ServerClock` sample) every 6th tick plus the burst after
    opening; game pages every 15 s (`GAME_KEEPALIVE_MS`) and a real ping every 4th tick (their clock offset). Any answer
    counts as "heard" for `RoomConnection`'s 15 s silence check; the answer never reaches `onMessage`. Liveness checks read
    `heardAt` = max(`seen`, `getWebSocketAutoResponseTimestamp`): the room's 150 s stale check and the games' `GHOST_MS`
    (`ghost.ts` takes a `heard` function). The HTTP fallback can't be auto-answered: its keepalive reaches the object,
    which answers it (`answerKeepalive`). Old pages' `{t:'ping'}` still works as before. Draw & Guess and Quiz phases that
    are overdue are nudged by the page's explicit ping (the keepalive no longer wakes them). Text not matching exactly
    reaches the object as before.
  - **Limits** (`apps/server/src/limits.ts`): a default in code and a Worker variable of the same name
    (`wrangler.jsonc` has `keep_vars`, so one set in the dashboard survives deploys): `MSG_RATE` 20/s + `MSG_BURST` 120
    (a token bucket per connection, `FloodGuard`; real pings count, the keepalive doesn't; `DRAW_MSG_RATE` 40 for the
    drawer's strokes): over it the room sends `{t:'error', code:'flood'}` and closes with 1008 (the page shows
    `error.flood` and reconnects after 10 s, doubled for a repeat within 2 min of coming back, up to 2 min:
    `RoomConnection` `FLOOD_FIRST_MS` / `FLOOD_MAX_MS`, no reconnect storm), a game sends `rate` and closes it the same way (`closeAsGone`, the leave runs once).
    `ROOM_IP_CONNECTIONS` 12 connections per IP hash per room (carrier NAT and families; CI's local server is unpaced and
    skips it, no live e2e file holds more than 12 in a room): the 13th gets `room_ip_full` (`error.room_ip_full`, the
    page stops reconnecting). A socket refused during its upgrade (also `room_full`) is marked `refused` and closed on its
    first message (a close made during the upgrade never reaches the page and blocks a later one) or by the unjoined sweep.
    Image budgets `UPLOAD_IP_BYTES` 10 MB / `UPLOAD_DAY_BYTES` 150 MB per UTC day and `UPLOAD_WINDOW_BYTES` 3 GB over 30
    days (`upload-budget.ts`; the window bounds what the account's rooms can hold, well under Free's 5 GB; answer `store`).
    Chat images run out 24 h after their message (7 days in a saved room; `CHAT_IMAGE_TTL_MS`, the alarm drops them, the
    message stays with its placeholder). Not done on purpose (council): deferred playback writes, a cross-room gate on
    hello.
  - **Measuring:** `scripts/harness/do-load/run.mjs` (8 people with the real `RoomConnection`, a video, a Classics table;
    `busy` with chat + reactions, `quiet` = only watching) reads the lab meter `/api/lab/meter` (`meter.ts`, only with
    `SWM_LAB_SERVER`: requests, WebSocket messages, rows written, awake time per object kind). On 9 Nov 2026, per minute
    for room + table: quiet 65 → 11 requests, 174 → 33 s awake; busy 129 → 83 requests, 118 → 106 s awake (reactions
    every 8 s keep a busy room awake by nature), rows unchanged (13.7).
  - **Test Lab** (🎬 tab): "Send too much at once" (`limits.flood`), "Open 12 more connections to this room"
    (`limits.crowd`), "Chat images run out now" (`limits.ageImages`, local lab server: `{t:'lab', op:'age-images'}`).
    Tests: e2e `quota.mjs` (keepalive answers, flood, the per-address cap against a paced server, image expiry on a lab
    server), `ghost.mjs` (players sending only the keepalive stay online), unit `keepalive.test.ts`,
    `connection.test.ts`, `upload-budget.test.ts`.
  - **The HTTP fallback (QUOTA2, 0.9.97.95; CF-2):** one address holds at most `FALLBACK_SESSIONS_PER_IP` (12) fallback
    sessions across every room and table. `FallbackGate` (`fallback-gate.ts`, binding `FBGATE`, migration `v13`) is one
    small object per IP hash (no single gate for everyone): the Worker takes a lease on `open` (`takeFallbackLease`,
    header `X-SWM-Lease`, stripped from anything a client sends) or answers 429 `busy`; the object holding the session
    gives it back when the session is forgotten (`PollHub` `flushLeases`, after each request and in the alarm) and renews
    it every 10 min from the alarm (`LEASE_MS` 30 min, so a lease an object forgot runs out). A gate that can't be
    reached lets the session through; CI's local server (unpaced) skips it. Over the fallback the page never sends the
    keepalive: `HttpSocket` answers it itself when a poll was answered in the last 25 s (`KEEPALIVE_FRESH_MS`), else on
    the next answer. Every fallback message goes through `webSocketMessage`, so the same `FloodGuard` bucket counts it.
    Idle polls (`idlePolls`, Worker variables `FALLBACK_IDLE_AFTER_MS` / `FALLBACK_IDLE_HOLD_MS` / `FALLBACK_IDLE_GAP_MS`):
    a session without news for a while gets a shorter hold and `X-SWM-Next` (the page waits that long before its next
    poll, cut short by a keepalive); **off by default** (gap 0): objects are billed until about 10 s after their last
    request, so only a wait over ~10 s saves anything, and a hotspot user would then get others' actions that much
    later. Measured (do-load, quiet room, 2 of 8 on the fallback): 36 → 20 requests a minute (≈ 28.7 → 12.4 billed).
    Test Lab: "Open 13 backup connections in other rooms" (`limits.fallbackCrowd`). Tests: e2e `quota.mjs` (the fallback
    in the ceiling; the cross-room cap and a closed session giving its place back, against a paced server), unit
    `socket.test.ts`.
  - **Errors (ERR1, 0.9.97.95; CF-6 / CF-7 / CF-12, `errors.ts`):** the Worker's `fetch` catches whatever `route` throws:
    one JSON line (`logError`: message, `routeOf` = the path with its id masked, the error's name, `retryable` /
    `overloaded`; never an IP, id, name or text) and a 503 `{"error":"unavailable"}` (`busy` when the object is
    overloaded), never Cloudflare's HTML page. Calls to objects without a body go through `stubFetch`: tried once more
    when the error is `retryable` and not `overloaded`. The room's 12 s wait timer and the bots' timers end in
    `.catch(logError)` (no floating promise; the alarm still covers the wait). `/api/rooms/:id/info|unsave` drops every
    client-sent `X-SWM-*` header before the room. Test Lab: "Make one server request fail" (`limits.serverError`, local
    lab route `/api/lab/fail`). Tests: unit `server-errors.test.ts`, e2e `quota.mjs`.
- **Avatars (`protocol.ts` `AVATAR_PAGES`):** 2 pages since card R20 (0.9.97.30): themed drawn characters and "Genres"
  (our own archetypes, Design's `avatars-3`; the parody pages were removed after the IP audit). Before: parody film / series / anime / game. Animal emojis were removed in 0.9.57 (those who had one get a random themed character). Since card R27
  the picker (site `ui/avatar.ts`) has no tabs: one grid of `AVATAR_GRID`, every avatar in a fixed seeded shuffle (the same on every open and device); the random pick for newcomers stays themed (`randomAvatar`, `AVATAR_PAGES[0]`).
  A drawn avatar's value is an id (`wizard`); the image is `/avatars/<id>.svg`; where text is needed `avatarText()`
  gives an emoji equivalent. New avatar: `DRAWN_AVATARS` + `AVATAR_PAGES` + `scripts/avatars.mjs` + site i18n
  `avatar.<id>` (a test checks every drawn avatar is on exactly one page). **Since card R14 (0.9.97.10)** the parody
  pictures are Design's redraw in `docs/internal/design/avatars-2/full/<id>.svg` (generator `full.mjs` there):
  `scripts/avatars.mjs` copies every file of that folder over its own drawings, so a new or changed parody is drawn
  there; the themed page is still drawn in `avatars.mjs`. Parodies only hint at a style: no
  series/character names, logos, exact costumes, or real actors' likeness (store and copyright).
  A removed avatar goes into `REMOVED_AVATARS` (card R20: 32 parodies), so saved copies are replaced. New avatars are our
  own archetypes only (no one character's silhouette + palette + prop).
- **Intro sound (`intro-sound.ts`):** no file, generated with Web Audio; `createIntro` plays it. Variants A–F (bell,
  marimba, music box, piano, rustle+bell, warm pad); the one playing is `INTRO_VARIANT` (the user chose F). All land on
  the animation beats (0 / 0.72 / 1.1–1.4 s) (site + extension). If the browser blocks audio it gives up within 250 ms
  (late sound feels odd). To listen, `scheduleIntroSound` can render to WAV with an offline context.
  **The picture (card 6f, 0.9.95.6, Design's storyboard `docs/internal/design/intro/`, built 1:1 from `preview.html`):**
  `intro.ts` `createIntro`: the logo pops in with its light off, at 0.72 s the light (`logo-light` group: cone + bloom)
  bursts from the triangle's tip (`scaleX`, `transform-origin: 29px 32px`, view-box), the eyes fade in and blink, at
  1.1 s the logo slides left while the mascot (Stub since card NP3; `createMascot`, happy) springs out of the light, "Enjoy the show!" rises,
  fade out at 2.16–2.7 s (card R7, 0.9.97.16: `startRoom` works out `introDue` = not a TV, not the shell, `in:<room>` not yet set in this tab, and `playIntro()` runs on the first `welcome`); sizes scale with `--s` = min(26vmin, 140px); reduced motion = one still frame fading in and
  out. Harness `scripts/harness/intro/run.cjs` (seeks every animation to each beat).
- **Player controls (option A, 0.9.91.1, owner's choice on https://claude.ai/artifact/SjcRcwoKd8n93W1cK4c6TC):**
  YouTube and video files keep **their own** player bar (YouTube from `host: https://www.youtube-nocookie.com` since
  0.9.93.14, card 6a, its `iframe_api` loaded only with the first YouTube item, never ahead; the cloud blocks that host,
  so harnesses route it to www.youtube.com with `scripts/harness/via-youtube.cjs`; YouTube `controls: 1, fs: 0, iv_load_policy: 3`: quality,
  caption language, chapters come back; video files `controls`), and so does the film page (the film is never made
  smaller, nothing is hidden). In the window our buttons are the toolbar under the video. In fullscreen our buttons are
  a **vertical dock on the right edge** (`#fs-dock`, `.theater.dock-mode`, `ui/fullscreen.ts`; since 0.9.91.7 in the
  window too, `.dock-window`, when the video is ≥ 480×360 and not on an upright phone, its last button opening
  fullscreen): talk (💬 message box,
  😀 emojis — the flat 8-slot bar in a window to the dock's left, 📌 pin) · together (🎙 / 📷 / 🖥️, `#dock-voice`, the
  same quick buttons as the Shorts bar in `ui/voice.ts`; not in voice: 🎙 joins) · watch (speed `#dock-speed-pop`,
  ⏭, exit). Line icons (`ui/icons.ts`), each button named with its shortcut ("Mesaj yaz · Enter"); one window at a
  time, lined up with its button, closed by a click elsewhere or Esc; Enter opens the message box. **The dock comes and goes with
  the player's own bar (0.9.91.7, owner):** `.dock-idle` hides it (opacity 0, and no island on the film page) after
  2.5 s without a mouse move or when the mouse leaves the video; a move on the video (on the film page reported by the
  film frames as `activity` → `poke()`), hovering the dock, an open window of it or a paused video show it. A YouTube
  frame keeps its mouse moves, so there it shows when the mouse comes onto the video and hides 2.5 s later (like
  YouTube's bar at rest). Touch screens keep it at 30 %. Real fullscreen: windows / hints / the person menu added to
  `<body>` move into the fullscreen element while it lasts (`ui/fs-layer.ts`). Messages come down from the top
  right, just left of the dock, in the window and in fullscreen (`ui/toasts.ts`; 0.9.93.4, owner: at the dock's foot
  in fullscreen they covered YouTube's own bar). In the shell the dock and its open window are islands
  (`reportLayout`); our catcher is never an island there (the film player takes the clicks). The camera pill has no 🎙 / 📷 / 🖥️
  any more (0.9.91.7: they are on the dock; the dock's and the Shorts bar's 📷 also shows outside voice and joins with
  the camera on, `joinWithCam`) and automatic camera tiles start left of the dock. **Our own bar** (`#fs-controls` + `#fs-catcher`, the 0.9.90.1 "one remote") is only for players
  it is the remote of (`current.own`), and since 0.9.91.13 only in the Shorts view's window: elsewhere they get the
  dock too (`.own-dock`: ⏯ `#dock-play`, volume `#dock-vol`, our catcher stays for click / wheel): only the sync test
  since 0.9.91.18 (Shorts use YouTube's own bar, `controls: 1`: YouTube's rules forbid anything of ours in front of
  its player, owner: "in Shorts too, its player; our menu is at the bottom"); there click = play/pause, double click =
  fullscreen, volume is local (`opt:volume`, `opt:muted`). Every YouTube player is reused for the next YouTube video. The extension can still hide known film players' bars (embed
  `{action:'skin'}`, `KNOWN_PLAYER_CONTROLS`) and set the film's volume (`{action:'volume'}`), but the site no longer
  asks for it (the 0.9.90.3 "⚙ Filmin ayarları" and the "Tam ekranda video" setting are gone). Tests:
  `scripts/harness/embed/run.mjs` (film page: their bar stays, film fills the screen, dock islands, messages by the
  dock).
- **Phones (0.9.91.2, owner: "the phone experience should be great, and easy to grow into a store app"):** phone-only
  CSS lives in `apps/web/src/phone.css` (after `styles.css`), device facts in `apps/web/src/device.ts` (`isTouch`,
  `isIOS`, `isStandalone`, `isApp`, `canElementFullscreen`, `canShareSheet`, `lockLandscape`, `onTurn`; `<html>`
  classes `is-touch` / `is-ios` / `is-standalone` / `is-app`; `isPhone()` = touch + ≤ 700 px wide or ≤ 500 px tall, not
  tablets): ask there, never sniff in feature code. **Themes on phones (0.9.91.7, owner):** only the plain ones
  (gece / matinee / okyanus / gunbatimi / neon, Matinee since card NP1) are offered; a saved scene theme shows as Gece there and stays saved
  (`themes.ts` `shown`, `offered`). Store-app path
  (Google Play TWA, App Store shell, what Apple requires: report / block for user content, push, universal links):
  `docs/internal/apps.md`. At ≤ 700 px
  wide every popover (profile, share, speed, games, emoji tray, person menu, Shorts feed, theme) is a **bottom sheet**
  (`position: fixed` at the bottom, full width, handle, `!important` over JS positions). An upright phone (≤ 700 px,
  portrait, ≥ 540 px tall) gets the **app layout**: body = 100dvh, the page never scrolls, the stage (video +
  toolbar) on top, `.side` takes the rest and scrolls only if voice / cameras need more (the tabs card keeps ≥ 170 px,
  the chat box stays on screen). While something plays (`.room.has-item`) the link box folds into ＋
  (`#add-toggle`, `.room.adding`; closes after adding); toolbar in one row (😀 only, recents in the tray), "Birlikte"
  in one row (faces without names + buttons), card cameras a swipeable row. **Fullscreen:** where there is no
  element fullscreen (iPhone) `ui/fullscreen.ts` uses its own (`fake` + `.pseudo-fs`: the theater is fixed over
  the window, Esc / dock exit leave it); on Android after a real fullscreen a landscape video locks the screen sideways
  (`screen.orientation.lock`, not for Shorts, `landscape` option). Turning a touch phone sideways while a video plays
  opens the pseudo fullscreen and upright closes it if it was opened that way (Settings → Ekranım "Yan çevirince tam
  ekran", `opt:rotateFs`, `.touch-only` row, default on). Held sideways (≤ 500 px tall) the dock is compact. Shorts on
  a phone fit 100dvh (bigger video, send ➤, 🔁 without text). Touch: inputs ≥ 16 px (no iOS zoom), `touch-action:
  manipulation`, push-to-talk hidden, footer ad-block tip hidden; viewport `viewport-fit=cover,
  interactive-widget=resizes-content` + safe-area paddings. Test: `scripts/harness/phone/run.cjs` (iPhone 13 /
  Pixel 7 emulation, 19 checks). **TV version:** see "TV version" below.
- **Phone room as an app screen (0.9.92.3, owner's picks 1A 2B 3A 4B 5A 6B 7A 8A 9A 10A 11A on
  https://claude.ai/artifact/MsCuFRZjQ6EyDAX8YFtEQu; step 1 of 3, `ui/phone-room.ts` + phone.css):** `<html class=
  "phone">` = `isPhoneLayout()` (≤ 700 px wide, or touch ≤ 500 px tall; `device.ts`, live). `ph-room` = phone + room,
  not the Shorts view / TV (set by `createPhoneRoom`, not in the shell). The desktop DOM stays: `.stage`, `.side`,
  `.together-card`, `.tabs-card` are `display: contents`, so the column is the theater (edge to edge, `order` 1) → the
  faces strip `.together-strip` (`#voice-people` + `#strip-voice` quick 🎙 / 📷 / 🖥️ (voice.ts quick id `strip`; 🖥️ only
  while someone streams) + `#strip-more` ⋯ with the connection dot from `.room-title-dot`) → the chat panel → the chat
  form with `#chat-react` 😀 (presses `.toolbar .react-open`) and `#chat-plus` ＋. No top bar / footer / tabs / now-playing
  / together card rows / camera tiles on a phone. The toolbar is `position: fixed` 0-high and `visibility: hidden`; its
  windows (tray, games, speed) stay visible as bottom sheets (`html.phone` sheet rules). Our sheets (`.ph-sheet`, one
  at a time, grip / ✕ / backdrop / Esc / pull down / the back button via a `history` entry): ＋ (Add a video, game,
  image (`#chat-attach`), and with a video pin, speed, sync, next, fullscreen; sync test when empty), ⋯ More (room
  line, invite, queue, people, games, recap, film time = settings `schedule`, profile, settings, language), Add a
  video (borrows `#media-form` + its search results, `#media-done` and the queue panel; "Play now" closes it) and
  People (borrows the people panel). Borrowed nodes go back on close. Cameras: `setCams` (room's `onCams`) puts a
  `<video class="face-cam">` into the face (`.voice-face.has-cam`, re-placed after each redraw); the person menu gets
  a big `.person-cam`. Settings is a full page on a phone. Sideways out of fullscreen: video left, strip + chat right.
  `first-tips` anchors fall back to ⋯ / ＋ / strip 🎙. **0.9.92.6 (owner's phone feedback):** cameras are a row
  `.ph-cams` under the strip (tile = video + name, tap = that person's sheet with `.person-cam`); faces never show a
  camera (the Shorts seats still do) and the computer's camera windows / pill are hidden on phones. "Sideways" is
  `device.ts` `isSideways` / `onTurn` / `<html class="sideways">`, worked out only when the page's width changes (the
  keyboard only changes the height and used to open fullscreen); phone.css uses `html.sideways`, never
  `(orientation: landscape)`. `#strip-fs` ⛶ (while something plays) presses `#fullscreen`: the browser's fullscreen +
  landscape lock; `#dock-full` upgrades the turned-sideways pseudo fullscreen to the real one (Android, a tap is
  needed). Sideways in fullscreen `#dock-chat` toggles `.ph-fs-side` (borrows the strip, `.ph-cams`, the chat panel and
  `#chat-form` into the theater; `.ph-side-open` moves the player and the dock left). The Shorts chat sheet is 56dvh.
  **Step 2 (0.9.92.4):** Shorts on a phone = `ph-shorts` (phone +
  Shorts view): no top bar, the video takes the screen (`width: min(100%, (100dvh − 60px − safe areas) × 9/16)`), one
  slim `.ph-shorts-bar` under it: `.ph-faces` (the `#seats-l` / `#seats-r` nodes moved in, put back when it ends),
  `.ph-toast` (someone else's newest chat line for 4 s, tap = chat), 💬 `#ph-shorts-chat` (chat sheet borrowing the chat
  panel), 😀 (presses the Shorts bar's tray), ▲ ▼ with the queue count, ⋯ `#ph-shorts-more` (mic, camera, ＋ add,
  ♾ feed, 🎮, 🔁, invite, settings, ↩ room view). The desktop `#shorts-bar` stays hidden (fixed, 0 high); its windows
  are bottom sheets. `.ph-pop-backdrop` sits behind the room's own small windows (tray, add, feed, games, speed): a tap
  on a YouTube frame never reaches the page, so the backdrop is what "outside" means; the Shorts add window also closes
  on an outside press / Esc. Sideways the bar is a column right of the video; swipes start on the bar. **Sideways
  fullscreen (4B):** on a phone in landscape the dock is a slim column (52 px + safe area) beside the video, never on it
  (`.player` / `.fs-catcher` end at its edge, so the player's own bar stays free), always visible, only 💬 😀 🎙 📷 and
  exit (🖥️ only while someone streams: `data-idle` on `#dock-live`); its windows open left of it (`overflow: visible`).
  **Step 3 (0.9.92.5):** games (10A): on a phone `games/stage.ts` always uses `full` (also held sideways wider than 860 px: `narrow` counts `isPhoneLayout()`, LAYOUT1); a free window (computers, tablets) starts at `min(width / 1366, height / 768)` of the game's size, at least 1 and at most its largest size, until resized (`floatZoom`, LAYOUT1 B2); dialogs (`.dialog-backdrop > *`, not settings or the image viewer) get `zoom` 1.2 from 2200 × 1100 and 1.35 from 2500 × 1300 (`styles.css`, LAYOUT1 E) and sets `html.ph-game` (not in
  the Shorts view); phone.css shrinks the theater itself (CSS only, the player is never reloaded) to a 92×52 preview
  at the left of the game's head; `::after` over it catches the tap, `phone-room.ts` turns it into the head's
  `.game-minimize`; the strip's `#strip-voice` moves into the head while `ph-game` (only 🎙 shows there) and back
  after; a minimized table shows `#strip-game` 🎮 with a dot in the faces strip (mirrors `#game-btn.game-waiting`,
  presses it); the place switch is hidden on phones. Home (11A, `html.in-home`, `home.ts`): the page fits the
  screen: pill, title, big "Create room", the save box, "Join with a code" as a second big button, the saved rooms,
  `#home-how` "How does it work?" (`home-intro-open` shows the preview, themes, steps, doors, features and the
  footer); the link box is hidden (videos are added in the room). Speed: no `backdrop-filter` and no drifting
  `body::before` on `html.phone`; the YouTube API is not preloaded on a phone (loads with the first video);
  `ui/recap.ts` is a lazy chunk. **0.9.93.6 (card "Phone: next speed steps"):** more lazy chunks: the TV room and
  phone remote with `tv.css` (`loadTv()` before the room starts, only with the lab switch; the pairing record moved to
  `tv-lab.ts` so the room no longer loads `tv.ts` + the QR encoder), the invite window (`openInvite`; the option is
  `ui/invite-option.ts`), the first-time tips and `sticker-file` (emoji / chat image preparation). The room page went
  from JS 142.1 → 134.5 kB and CSS 35.7 → 34.0 kB gzipped. `scripts/size-budget.mjs` (CI, after the build) fails when
  the room page's static JS / CSS pass their budgets (145 / 38 kB since cards SZ and PERF1b, and every page's first stylesheet 12 kB; a PR that has to raise one says why in the script, the Planner's rule); `scripts/harness/phone-speed/run.cjs` opens the
  built site as a Pixel 7 with a 4× slower CPU and a 4G-like network (home, join card, in the room: medians 556 / 478 /
  369 ms in the cloud container; budget 1500 each). Voice, live and camera windows stay in the room chunk (tightly
  tied to it); a phone-only stylesheet was not worth it (most rules are shared). Test: `scripts/harness/phone/run.cjs` (71 checks).
- **Room chunk (card SZ, lane B):** the room page's static JS went from 145.0 to 136.6 kB gzipped (budget 145) by
  moving what is needed only after a press, or only in the shell, into lazy chunks: `ui/voice-ext.ts` (loaded by
  `renderRoom` before the room starts, only in the shell, passed to `createVoice` as `Ext`; `isExt(client)` replaces
  `instanceof ExtVoice`), the pre-join check `ui/voice-check.ts` (its small device helpers live in `ui/voice-devices.ts`,
  still in the room chunk), the stream engine `ui/live-engine.ts` (live-p2p + live-float +
  live-compose; `live.ts` makes it on `ensure()`: someone streams, a hover / focus / touch on Share or Watch, a press,
  a signal; until then "not streaming, not watching"), the TikTok / Vimeo / sync-test players, the sound recipes
  (`@swm/shared/sounds`, loaded on the first press; a sound whose recipes come > 300 ms late is dropped, as before),
  the shortcuts card and the Shorts search list. First presses stay instant: `ui/lazy.ts` `whenIdle` fetches the voice
  windows and the stream engine 4 s after the room starts, when the browser is idle. **Load a lazy chunk with
  `loadChunk(() => import('./x.ts'))` and check for null; never chain onto `import()`:** main.ts handles a failed chunk
  (`vite:preloadError`, one reload "for the new version") and Vite then resolves the import to nothing, and a `.then`
  chained onto `import()` runs inside Vite's wrapper, so its errors vanish too. **Offline never reloads (BH13-G, 0.9.97.88; OFFLINE2, 0.9.97.89: also when the site doesn't answer while
  `navigator.onLine` is true, see the Live line):** `reloadForNewVersion` does nothing while `navigator.onLine` is false (a reload then showed the browser's
  offline page and threw the room away after a Wi-Fi blip); chunks missed offline are fetched again on `online` and the
  page reloads only if one still fails (in Chrome always: it keeps a failed module import for the page's life); harness
  `games-pair` (`OFFLINE_CHUNK=1`, the drops) checks it on the built site. Voice, streams and watching fail closed when
  their chunks can't load (harness `scripts/harness/lazy-gates/run.cjs` in CI blocks `voice-check` and `live-engine`;
  the IP notice chunk it used to block was removed by card SIMP1). Measure a module's share of the
  room chunk with a sourcemap build (`npx vite build --sourcemap`; gzip of separate files overstates the saving).
- **Accessibility (card A11y, 0.9.96.13, Design's `docs/internal/design/a11y-1.md`):** `#skip-link` is the first Tab stop
  (index.html; in the room `room.ts` turns it into "Skip to the video" → `#theater`). A Tab press wakes the resting
  rail (`fullscreen.ts`), so its buttons follow the video. `ui/dialog-focus.ts` (started in `app.ts`): every
  `.dialog-backdrop` dialog keeps Tab / Shift+Tab inside and gives the focus back to the element focused before it
  opened. `ui/menu-keys.ts`: our menus (⋯ More) open on their first item, ↑ ↓ Home End move, Esc returns to the button.
  The games hall is `role="dialog"` with plain buttons; the XOX board a named group, cells "Row r, column c, X /
  empty". The room name is the page's `h1`. New UI: give buttons a name, keep focus rings (`:focus-visible`), never
  `outline: none`, keep white text on a button ≥ 4.5:1, targets ≥ 24 px. Harness `scripts/harness/a11y/run.cjs` (axe
  WCAG 2.1 A + AA + a keyboard tour) runs in CI; locally `npm i --no-save axe-core@4.10.2` once.
- **Tablets (card T, 0.9.96.10, owner's pick B, `docs/internal/design/tablet.md`):** `device.ts` `isTabletUpright()`
  (touch, no mouse, not `isPhoneLayout`, upright by width like `sideways` so the keyboard never flips it, ≥ 701 px) sets
  `<html class="tablet-up">` (`onTabletUpright`). `apps/web/src/tablet.css` is a lazy stylesheet (loaded by `checkTablet`
  only on a touch screen without a mouse outside the phone layout, so it is not in the room's CSS budget). Upright: body
  = 100dvh, no footer, the link box on one row, the theater ≤ 52dvh tall; `.side` is a grid: `.chat-panel` (1.5 fr, its
  own card) | `.together-card` + `.tabs` + Queue / People panels (1 fr), `.tabs-card` `display: contents`, no Chat tab.
  `ui/tabs.ts` split mode (`createTabs(root, onChange(tab, chatShown), split)`, `chatShown`, `refresh`): the chat is
  always shown, the tabs choose Queue / People. Games open in the video's place (`games/stage.ts` `narrow` is false on
  `tablet-up`). On every touch screen without a mouse (not phones) the side rail stays at full opacity with 44 px
  buttons; the upright Shorts bar is icons only on one row. "Fullscreen when turned sideways" (`opt:rotateFs`) is
  opt-in ('1') since sideways is the computer layout. Test: `scripts/harness/tablet/run.cjs` (iPad + Android tablet).
- **TV version (owner chose A + C, 30 Oct 2026; 0.9.91.4, 0.9.91.5, 0.9.91.14, `docs/internal/tv-design.md`):** the TV
  shows the room, the paired phone is its remote. **Hidden since 0.9.91.14** (owner: slow on his TV's browser; the
  real version comes after 1.0 with Google Cast, ROADMAP Phase 2): the TV button and `/tv`, `/tv/<code>`, `/tv-test`
  work only on a device with the lab switch (`tv-lab.ts`, open any page with `?tvlab=1`, `?tvlab=0` turns it off;
  without it those pages fall back to home); the code, server pairing and tests stay. 0.9.91.14 also: the TV uses the
  calm engine profile (`SyncEngine` `relaxed`: drift jump at 2.5 s, 10 s cooldown, no ±5 % nudging, never reports
  stalls so it never makes the room wait; `syncStats()` feeds the TV's sync status line), and the TV button shows
  only on touch devices, opening a 3-step explainer with the code box. **Pairing:** `/tv` (`tv.ts`) picks a random 6-digit code (`TV_CODE`), shows
  it big + a QR (`packages/shared/src/qr.ts`, in-house encoder, byte mode, level M, versions 1–6) of
  `/tv/<code>`, and waits on `/api/tv/<code>/ws` (Durable Object `TvLink`, binding `TVLINKS`, migration `v5`, nothing
  stored, 10 min then a new code; a second TV with the same code gets `taken`). A phone in the room sends
  `{t:'tv-link', code}` ("📺 TV" button in the top bar → dialog, or `/tv/<code>` from the QR → pick a room →
  `sessionStorage` `tvPair` → sent after `welcome`); the room makes a link token (`TV_TOKEN`, storage `tvTokens`:
  person key + name + avatar, 12 h after last use, at most 50) and posts it to the `TvLink`, which hands
  `{t:'paired', room, token}` to the TV (`localStorage` `tvLink`) → `/r/<room>?tv=1`. The Worker passes the room its
  own id (`X-SWM-Room`). **The TV is the same person:** `hello.tv` = token → the server gives the connection the
  person's cid (never sent), name and avatar, `Member.tv = true` (host rights, kicks, counted once; a rename on the
  phone renames the TV; `tv_token` error → back to `/tv`). Phone ⇄ TV: `{t:'tv', op}` (`TV_OPS`: unlink, chat,
  volume, voice, play, state) relayed only between the person's TV and their other connections; the server sends the
  phone `present` true / false and `linked`. **TV mode** (`ui/tv-room.ts`, `tv.css`, `html.tv-mode`): the theater is
  pinned in the room's own fullscreen (`fullscreen.pin()`), top bar / side / dock / our bar hidden; faces at the top
  (people, not connections; green ring in voice, breathing ring while speaking via `voice.speakers()`), messages big
  at the bottom right (`tv-no-chat` hides them), a note when nothing plays or a film page (can't play on a TV). Keys
  in the capture phase (the room's own shortcuts never see them): OK = bar (⏯, 😀, 💬 on/off, 🔊 100/70/40/0 %, 🎧
  listen on/off, 🚪), ▲ = emojis, ←/→ move, Back (Escape, GoBack, key codes 4/8/27/461/10009 or `popstate`) closes /
  asks "leave?", media play/pause keys toggle. The first key press starts voice audio (autoplay). The TV joins voice
  **listen-only** (`P2pVoice.join(false, true)`: a `recvonly` audio channel, no getUserMedia) while someone other than
  me is in voice; p2p mode only. **Phone remote** (`ui/tv-remote.ts`): card at the top of the side (sticky on
  upright phones) while my TV is present: big push-to-talk (the microphone is off between presses, the phone plays
  no voices: `voice.silence`), leave voice, camera, play/pause, TV messages / volume / listening, "Kulaklık takılı"
  (`tv:earphones`: open mic, voices on the phone), "TV'yi ayır" (`unlink` also drops the tokens); my own player is
  muted (`mutedForTv`). **TV test (0.9.91.4, `tv-test.ts`, `/tv-test`):** connection, YouTube, hearing voice (local
  WebRTC loopback), mic, sound, fullscreen and the remote's key names; nothing stored. Tests: e2e `tv.mjs`, harness
  `scripts/harness/tv/run.cjs` (TV 1920×1080 + iPhone + a friend in voice, 32 checks; needs the built site on a
  server and a local video, e.g. `python3 -m http.server 5300` in a folder with `video.webm`).
- **Sound effects (0.9.90.2, owner's choice on the proposal page https://claude.ai/artifact/SPrx6qse6qiKJGJCynqdfy):**
  no files, generated with Web Audio. `packages/shared/src/sound-policy.ts` (pure, `sound-policy.test.ts`): the
  registry `SOUNDS` (group voice / room / game, level, per-sound `gap`, `softDuringFilm`), families by group (voice +
  room → **A warm pad**, the intro's world; games → **B glass marimba**), `soundGain`, `SoundLimiter` (same sound at
  most once per `gap`, e.g. 3 s for joins = one sound for a burst; at most 4 room/voice sounds per 2 s; game sounds
  only per `gap`), `JoinFilter` (a person = name + avatar; a reload/reconnect within 30 s or a second tab is not a new
  arrival). `packages/shared/src/sounds.ts` `scheduleSound` (the recipes, same F-major notes in both families; works
  with an offline context). Site `apps/web/src/sound.ts` `playSound(id)`: one shared AudioContext created only after
  the person touched the page (`userActivation`), a suspended context gets 300 ms then the sound is dropped (never
  queued), a compressor as limiter, fires `swm-sound` (tests). Settings → Ekranım: "Sesler" (`opt:sounds`, default
  on) + "Ses düzeyi" (`opt:soundVolume`, default 70, a sample plays when the slider is let go); room sounds at half
  volume while the room's video plays (`setFilmPlaying`); "reduce motion" does not mute. Works on the film page as
  the site is the overlay (iframes have `allow="autoplay"`). **Which events** (others' actions unless said): voice
  join / leave (only while I'm in voice), my voice join / leave, my mic on / off (button or M), push-to-talk press /
  release; someone new in the room (not leaving: reloads would be false alarms), a chat message only when it is
  nowhere on my screen (page hidden, or another panel tab open; not in fullscreen / side hidden / Shorts where it shows
  as a toast or bubble), stream start (others) / stop (the one I watch), film time reached, "back to the room?" card,
  game invite; XOX / Connect Four every piece (both sides; the opponent's = "your turn"), win / lose / tie
  (spectators: win); Draw & Guess my turn to draw, my correct guess, someone else's, "close", hint letter, my wrong
  guess (quiet) and others' (very quiet, max one per 2 s), last 5 s ticks; Quiz new question, my answer locked
  (quiet), right / wrong at the reveal, last 3 s ticks while I haven't answered, podium. **No sound** for: camera
  on/off, someone leaving, play / pause / seek, the everyone-ready wait, reactions, pins, kicks, strokes, my own
  messages / stream. New sound: add it to `SOUNDS` + a recipe in `scheduleSound` + the call site. Test:
  `scripts/harness/sound/run.mjs` (Playwright, two browsers, `npm run dev` first).
- **Message position (0.9.90.1; with the dock since 0.9.93.4 they come down from the top right, left of the dock, in
  the window and in fullscreen):** in fullscreen with our own bar (Shorts, sync test) chat messages flow up from the quick message box (`ui/toasts.ts`,
  anchored to `#fs-chat`, above the seek line, left-aligned; newest closest to the box; they don't fade while the box
  is focused). The old draggable "💬 Mesajlar burada" handle and `toastPos` are gone. With the side panel hidden (window)
  they sit at the top right of the video. In the extension's room view messages are in the chat panel.
- **Back from the film to the room:** "🏠 Odaya dön" in the overlay → the tab goes to `/r/ROOM#back` (the site enters
  without asking the name), the overlay goes away. The **popup** (0.9.83) never navigates the film tab: "🏠 Odayı ayrı
  sekmede aç" switches to an open tab of that room or opens `/r/ROOM#back` in a new tab next to the film. Outside a
  film tab (0.9.89), if a room is open in another tab the main button is "🏠 Odama dön" (switches to it) and "Sidelit'i
  aç" is the second button. Test: `scripts/harness/popup/run.cjs` (Playwright, `channel: 'chromium'` loads extensions).
- **Outdated extension notice (0.9.91.13, `ext-update.ts`):** the site compares the bridge's `data-swm-extension` with
  `/extension-version.json` (written by the extension build); older → a dot on the top bar's "Eklenti" link and a
  one-time bubble (`extUpdateSeen`). The extension page explains that ↻ only re-reads the folder it was loaded from.
- **Dead extension bridge (0.9.83):** an extension updated/reloaded while our site tab is open leaves a site-bridge cut
  off from the extension (sendMessage throws). "Filme git" then gets `going ok:false` or no answer within 4 s and the
  card says "reload the page" (`extensionStale`) instead of the misleading "your extension is outdated".
- **Pins:** `{t:'pin', note?}` → the server computes the moment from its own `PlaybackState`, stores the pinner's
  persistent key (`owner`) but never sends it to clients; the full list is broadcast with `{t:'pins'}`, newcomers get
  `welcome.pins`. Remove your own pin (the host: any) with `unpin`; at most 50; reset when the video changes. Site:
  strip under the video (prominent while the mouse is on the video; not shown in fullscreen), 📌 button / P → note box.
  Same on the film page (the UI is the site itself). (The old "reaction strip"/heat was removed entirely.)
- **Custom emojis (stickers):** `{t:'sticker-add', data}` (`data:image/png|gif|webp|jpeg;base64`, at most
  `STICKER_MAX_CHARS`; no SVG). The general message limit is 4 KB (`MAX_MESSAGE_BYTES`); only `sticker-add` may be up to
  `STICKER_MESSAGE_MAX` (real images used to be rejected because of this; e2e now tries a ≈200 KB emoji). Id = first 12
  hex digits of SHA-256 (`stickerId`, both sides compute it). At most 24 per room, the oldest goes when full; storage
  `sticker:<id>` + `stickers` order (SQLite-backed DO; the big emoji is also tried in live e2e). On join, after welcome,
  one `{t:'sticker'}` each (1 MB message limit). Reaction: `{t:'react', sticker}`. UI: 🖼️ always visible at the end of
  the emoji bar (site: panel; extension: the strip switches to custom emojis) — don't bury it between pages. File
  preparation in `sticker-file.ts` (images 160 px webp; GIFs keep their frames but lose comment/XMP blocks,
  `stripGifMetadata`). **Room-only (0.9.86, owner's decision after security review 1):** nothing is uploaded on join;
  adding opens a dialog (preview, "added to this room only", unchecked "Koleksiyonuma da kaydet"). My collection:
  `localStorage` `stickerCollection` (max 12, shared with the extension, never uploaded by itself); tray chips
  Emojiler · Bu odada · Koleksiyonum (tap = add that one to this room); an empty "Bu odada" shows a note and never opens the file picker by
  itself (0.9.87), "🖼️ Ekle" is at the bottom of every view. The old auto-uploaded `myStickers` list is
  moved to the collection once (`stickerNote` one-time note). The server sends `mine: true` only to the uploader
  (✕ works after a reload); the host can remove all with `{t:'sticker-clear'}` (Settings → Oda kuralları). Limits:
  `stickerLimit` per IP hash + at most 60 uploads per room and day (`stickerDay`) + the cross-room daily byte budget
  (`UploadGate`, R4-1; chat images too).
- **Reaction display:** rises from a random spot at the bottom of the video and fades (3 s; small avatar + name below);
  each press flies separately (no "×2"), no default cooldown. The host sets a per-person gap with
  `settings.reactionGap` (0/1/3/5/10 s, `REACTION_GAPS`) (the server enforces it via `lastReaction`, the client dims
  the buttons); server limit `RateLimiter(12, 5)` per person (`keyOf`, browser); `react` and `home` do not consume the
  general `commandLimit` (an emoji storm must not lock play/pause). Client: no key-repeat, at least 150 ms between two
  emojis. In the shell islands are merged without overlap with `mergeRects` (the clip path uses even-odd: two
  overlapping islands cancelled each other and showed emojis half/faded). Users can turn them off: Settings →
  "Emojiler videonun üstünde uçuşsun" (`opt:reactions`). In the shell each flying emoji's path is an island.
- **Hint bubbles (`ui/hint.ts` `flashHint`, 0.9.87):** close by themselves, on any click elsewhere, Esc or scroll;
  pressing the same button again closes it (the IP "Neden?" bubble is 7 s).
- **No sync when alone:** on the site "Herkesi bana eşitle" and the sync test are dimmed; pressing shows a "you are
  alone" bubble (`isAlone`, `ui/hint.ts` `flashHint`); on the server there is no "everyone ready" wait when fewer than
  2 distinct cids are present.
- **Voice chat (`packages/shared/src/voice.ts`, `voice-p2p.ts`, site `ui/voice.ts`, plan `docs/internal/ses-goruntu.md`):**
  "🎙 Sese katıl" in the "Birlikte" card; after joining 🎙/🔇 and "Ayrıl"; the card shows avatars of people in the room
  (those in voice have a green ring, the speaker glows, `getSynchronizationSources`), 🎙/🔇 in the people list. Those
  who didn't join hear nobody. Member field `voice: {mic, track?}` (no version bump); `{t:'voice', on, mic}`. Transport
  is `welcome.voiceMode`: **p2p** (default, no card/account): each person has a separate WebRTC connection with
  everyone in voice (the smaller id makes the offer), the server relays `{t:'signal'}` only if both sides are in voice
  (IPs are only visible to people in voice), at most `VOICE_MAX_P2P` (6), STUN Cloudflare only (every STUN server
  sees each user's IP). **No IP notice (card SIMP1, owner, 10 Nov 2026):** the 0.9.86 dialog before voice / a stream /
  watching and the "🔒 People in voice can see your IP · Why?" line are gone (`ui/ip-notice.ts` deleted; old
  `opt:ipNotice:*` keys are harmless leftovers). The legal place is `privacy.html#voice` (EN) / `#voice-tr` (TR), linked
  from Settings → Sound & camera ("Who sees what", `data-privacy-link="voice"`; `translate` adds the anchor, `-tr` in
  Turkish). Nothing starts before the press: the microphone only after "Join voice" (then the pre-join check), a
  stream after Share → Screen / Camera, watching after "Watch".
  Hiding IPs (TURN relay / SFU for voice + camera + streams) is a Phase 2 goal, needs the card. **sfu**: if the
  Worker has `REALTIME_APP_ID`/`REALTIME_APP_SECRET`, Cloudflare Realtime (`apps/server/src/realtime.ts`, `{t:'rtc'}`
  requests, session on the server, `VOICE_MAX` 10). Cloudflare requires a card and has no spending cap, so p2p for now
  (user's decision, Oct 2026). `VOICE=off` turns everything off. **In the shell (0.9.60)** voice runs in the
  extension's offscreen document (`offscreen.ts`, permission `offscreen`): the site relays `{type:'voice', msg}` with
  `ExtVoice` (`ui/voice-ext.ts`) (sends signal/rtc/"in voice" through its own connection), offscreen runs
  `P2pVoice`/`VoiceClient`, plays audio and sends levels (`LevelMeter`, `levels` + `me`). Without permission the
  background opens `mic.html` (offscreen can't ask; asked from the overlay the permission would go to the film site)
  as a small popup window over the film's window that asks at once and closes itself (0.9.91.7; a tab before); when the film page reloads the new site sends `hello` →
  `reset` (the mic stays). **Mic and camera survive reconnects (0.9.84):** `join(mic)` starts with the person's last
  choice (the track is disabled before anyone hears it); site reconnect keeps mic and camera, a page reload uses
  `voiceMic:<room>`; it used to come back with the microphone **on** (friends' "random mic"). A silent rejoin is
  skipped when another tab of mine (same name + avatar) is already in voice; my other tab's audio is muted and its
  camera never shown as someone else; if a person appears twice only their newest connection gets a tile. Lost
  peer connections (`failed`, or `disconnected` > 5 s) are closed and the offerer calls again after 2 / 5 / 10 s;
  only then "couldn't connect" is shown. ExtVoice does not leave on `pagehide`; the background sends `end` when the tab closes / goes
  back to the room. Being in voice is remembered with `voice:<room>`: moving between site and film rejoins silently if
  permission exists. While someone really speaks the film's volume is lowered (embed `duck`, ×0.35; untouched if the
  person changed the volume): **off by default since 0.9.83** (`opt:duck2`; the old `opt:duck` key defaulted to on),
  and only real speech counts — `SpeechDetector` (`packages/shared/src/speech-detector.ts`, levels every 100 ms, ≥4 loud
  samples in 800 ms, 1.2 s hold) ignores clicks and knocks. Old extensions don't send `caps` → the card is hidden in the shell. Tests:
  `scripts/e2e/voice.mjs`, real audio `scripts/harness/voice/run.mjs` (two Chromes, fake mic, measures incoming audio
  energy) and `voice/shell.mjs` (on the film page). **Both need `VOICE_A`/`VOICE_B`** (two different wavs): with the
  same fake beep the echo canceller removes it and the "really hears" checks fail.
- **PlayWithMe (in-room games; since 0.9.75 there is NO separate game page/room, user's decision):** 🎮 (`#game-btn`)
  in the toolbar under the video → menu (XOX, Dört Taş/Connect Four, Çiz-Bil/Draw & Guess, Bilgi yarışması/Quiz) →
  `{t:'game', kind}`. A room holds one game at a time (`RoomGame {kind, id, by, at}`, storage `game` + opener's
  persistent key; `welcome.game`, on change `{t:'game', game, by?}`); only the opener or the host changes/ends it
  (`{t:'game', end:true}`), others get `game_busy`. The game id is a fresh `newId()` from the room; the game itself
  runs in the objects below. Site `games/stage.ts`: the game opens in the video's place as a "game stage"
  (`#game-stage`, child of `.player-wrap`: an island in the shell automatically; at ≤860 px moved to body and
  fullscreen `.full`); opens immediately for the opener, others get an "Ali opened XOX · Join / Later" card
  (`#game-invite`), "▶ Videoya dön" minimizes it (connection stays open, a blinking dot on 🎮), a grey chat line.
  Game pages are mountable pieces: `mountMatch` / `mountDraw` / `mountQuiz` (the returned function closes the
  connection and timers; name/avatar/cid come from the room). In Shorts, while a game is open, arrows/wheel don't
  change the video. In a room empty for more than 1 min the game closes (`freezeIfLongEmpty`). Old `/oyun…` URLs fall
  back to the home page. Test: `scripts/e2e/roomgame.mjs`.
  **Games quality (card BHG):** a tab remembers the table or side game it has open and whether it is minimized
  (`sessionStorage` `swm:table:<path>`, `rememberAt` in `stage.ts`) and reopens it from the entry list after a reload;
  Quiz and Draw & Guess wait `FEW_GRACE_MS` (20 s, `fewSince`) with fewer than two players online before a running game
  goes back to the lobby (one player's reload used to end it for both). Harnesses `games-sweep` (every game × 4 sizes ×
  EN / TR: no inner scrollbar, text ≥ 13 px on screen (the fit scale counted), nothing cut off, a fair-sized board, no
  page scroll; `FRIENDS=n` adds fake friends) and `games-resume` (move + sound, named buttons, axe, minimize / restore,
  reload for every Classics board, the side games, Quiz and Draw), both in CI's "Games quality" step (the sweep on
  laptop + iPhone there). Run the sweep after every game layout change. **GPRO (`docs/internal/design/games/games-pro.md`):**
  sweep size `side` (iPhone 13 landscape; local runs, `SIZES=side`) with a board check against the window's smaller
  side; sideways-phone layouts under `html.phone.sideways` (never bare `html.sideways`, which a laptop has too):
  Classics boards and Sea Battle (board / one sea at the full height on the left, the rest on the right), Five Frames,
  Snack Bar (`fitRows` counts the rows' own column in real pixels), Window Garden (pots ≤ the scene's height:
  `container-type: size`, `min(23cqw, 48cqh)`), the Classics shelf in one row, the lobbies full width. The window
  head's "in the video's place" icon (`place-stage`) is a frame filled by the game, distinct from ⛶. The Last Heart
  lobby is the same tinted card as Quiz / Draw & Guess (`games/lobby.css`, which the poker chunk imports too: the room page's CSS budget is full).
  **Game window head and free window (lane W, bugs W1–W5 + 0.9.97.112, owner 10 Nov 2026):** the head is (placement
  switch) · 🎮 · ↩ Leave (tables) · ⏹ End (tables, opener or host) · ✕ (minimize), plus the game's own
  slot (`.game-head-slot`: "?" How to play, Classics' shelf). No game has its own full screen (card GW's ⛶ and `.game-max`
  were removed): the free window lives inside the video's fullscreen while there is one. **Where a game plays
  (`placeOf`, owner 10 Nov 2026):** the tables always play in the video's place, without a switch (`STAGE_READY`, on
  since card .113; over YouTube, `overYoutube` / YTG, the free window beside the player); the side games always play in
  the free window, without a switch on a computer (narrow screens keep their below / large pick, `gamePlace:<kind>`).
  The free window's **home** (`homeBox`): with the side panel showing, the window lines up with it (its top and right
  edge, down to just above `#chat-form`, at least the game's `minSize` wide, never over the video box itself), so no
  sliver of chat shows and the message box stays free (0.9.97.117, Game Studio's review); otherwise the column right of the theater, under the top bar, over the side panel,
  right-aligned at its top, as big as the column allows up to `maxSize` and never below `minSize` (a column narrower
  than that: the window sticks out over the video's edge by the difference); over YouTube it shrinks to the column (or
  the largest strip beside the player, `largestClear`) so it never covers the player; tablets, phones and the video's
  fullscreen use `SPOT_HOME`. Over YouTube in cinema mode (`cinemaOn`: the player fills the page, "under it" would be
  below the screen) a game brought up leaves cinema mode (`#side-toggle`), and turning cinema on with a game open puts
  the game away, as fullscreen does (YTG). Opening any game ends the room's intro (`endIntro`: `.swm-intro` over the video took the first
  click on a game's head; room.ts's observer sees it leave). **A table pauses the video** (`autoPause`, 0.9.97.114): opening a table (not coming back
  to it after a reload) in the video's place while the video plays calls the room's `pauseVideo` (`room.ts`: the player's
  own pause, which the sync engine sends to everyone; nothing in a host-only room for a guest), once, with the note
  `game.pausedForGame` by the head's 🎮; closing the table doesn't play it again.
  `#game-stage[data-place]` mirrors the mode for the games' CSS. **The free window:** positioned in `posRoom` (the page,
  or the fullscreen view; tablets clear of the chat), its size limited by `area` (the strip beside a YouTube player);
  over YouTube `clearOfPlayer` settles it beside the player on the nearest side that fits, keeping its side while dragged
  (`SIDE_STICK`). Once moved or resized, each game remembers its spot (`gameFloat:at:<kind>`; the older
  `gameFloat:spot[:<kind>]` keys are ignored, so every game first opens in its home) and zoom (`gameFloat:zoom:<kind>`,
  saved as it leaves its home). A drag follows the mouse once per frame; drag and resize live only while the button is
  held, so hovering the corner never moves the window. The resize ends on `buttons` / `lostpointercapture` /
  `pointercancel`; the drag (0.9.97.117) hears its moves and release on the page too (a capture that didn't take still
  drags), ignores a move with no button held (another pointer), and a drag whose release was never heard ends at the
  next press where the window stands (never replaying the old pointer). A double
  click on the head (or `gameWindow.reset`) forgets the spot. **🎮 in the head** (`hubFromHead`): the hall moves into a
  fixed `.head-game-wrap` (inside `document.fullscreenElement` while there is one); from a free window it slides out of
  the window's left side, level with its top (its right side when there is no room), elsewhere it hangs under the 🎮
  (`data-side` on the wrap); a drag closes it. Test Lab: `gameWindow.reset`, `gameWindow.hall`, `gameWindow.autoPause` and a 📊 status line
  (placement, home, where the hall opened, the last automatic pause). Harness: `scripts/harness/game-window-head` (CI `games-more`).
  Game engines: kind `xox` | `four` (`games/match.ts`). Two-player board games share a shape (`games/board.ts`
  `BoardState`, rules `GAME_RULES`: `xox.ts`, `four.ts`: 7×6, pieces drop into a column, four in a row wins;
  `move.cell` is the column in Connect Four). The first arrival sets the kind; another kind cannot join that code
  (`kind`). Version 2: state `{t:'state', kind, game}` (old saved `xox` field is still read). Separate Durable Object
  `Game` on the server (`apps/server/src/game.ts`, binding `GAMES`, migration `v2`), `/api/games/:id/ws`, its own
  protocol (`packages/shared/src/games/`: `protocol.ts` validation + `GAME_PROTOCOL_VERSION`, `xox.ts` rules). The
  first two people sit as X/O (seat tied to persistent `cid`: a reload keeps the seat), others watch; if the owner is
  not connected a spectator can `sit`; the server validates moves, keeps score, `rematch` swaps who starts. No chat,
  only fixed emojis (`GAME_EMOJIS`). An empty game is deleted after 24 h. New board game: `GAME_KINDS` + `GAME_RULES`
  + rules file + board drawing in `match.ts` + `ROOM_GAME_KINDS` (`protocol.ts`) + `stage.ts` (icon, which piece
  mounts) + i18n `games.<kind>.title/text`. Test: `scripts/e2e/xox.mjs` (XOX + Connect Four).
  **Classics (0.9.97.35, Game Studio, `docs/internal/design/games/classics.md`):** room kind `classics` (`ROOM_GAME_KINDS`) is
  one table in the `Game` object holding any board of `GAME_KINDS` (`xox`, `four`, `dama`): hello `classics: true` lets
  the table take a board's kind, `{t:'switch', game}` changes the board while no game is in progress (`in_progress`),
  state carries `classics` / `started`. Turkish dama (`games/dama.ts`): 8×8, men move forward / sideways, flying kings,
  capturing is mandatory and the longest capture must be taken, a king never turns back 180° within a chain, 60 quiet
  moves = a draw; move = `from * 64 + to`, one jump per message while a chain lasts (`chain`). Bot (`games/bot.ts`
  `botMove`): alpha-beta, depths xox 1 / 9, four 2 / 5, dama 1 / 3, easy plays a random move 35 % of the time; it sits in
  seat O (`BOT_KEY`, `GamePerson.bot`) and answers after `BOT_DELAY_MS` 700; a person can take its seat. The hall hides
  the XOX / Four in a Row cards (`HALL_KINDS` in `gallery.ts`); `match.ts` `mountMatch(app, tableKind)` draws the shelf
  (`#cl-shelf-open`), the dama board (`.dama-board`, `.dama-cell` picked / target / movable / king), the referee
  (`.cl-ref-mascot`) and the bot offer (`.cl-bot-level`). Tests: unit `dama.test.ts`, `bot.test.ts`, e2e `classics.mjs`,
  harness `scripts/harness/classics/run.cjs`. **Chess (P7, 0.9.97.46):** kind `chess` in `GAME_KINDS`, rules
  `games/chess.ts` (`ChessState`: `kinds` one letter a cell, `castle`, `ep`, `halfmove`, `seen`, `check`, `end`
  mate / stalemate / fifty / repeat / material, `from`), checked by perft counts in `chess.test.ts`; the page's chess
  texts are a local `TEXT` in `match.ts` (not `i18n.ts`). **Backgammon (P8, 0.9.97.46):** kind `backgammon`, rules
  `games/backgammon.ts` (`BackgammonState`: `pts` X positive / O negative, `bar`, `off`, `dice` left, `rolled`, `passed`;
  X moves 23 → 0, home 0–5; a move is `ROLL` or `from * 32 + to`, from 24 = bar, to 25 = off; a roll with no legal step
  passes the turn), dice only from the server (`diceRandom`), the board `.bg-board` (two rows, bar, off tray) and
  `.bg-tray` (dice, `#bg-roll`, pips). Tests: `backgammon.test.ts`, e2e `classics.mjs`, harness `classics`. **Reversi:** kind
  `reversi`, rules `games/reversi.ts` (`ReversiState`: 8 × 8, dark X moves first, a disc must close a line, every closed
  line turns over (`flipped`), a side without a move passes (`passed`), the disc count decides when neither can move;
  a move is the cell 0–63), Glowbeam `evaluateReversi` (corners, the cells next to an empty corner, edges, `mobility`;
  easy depth 1, medium 4), the board `.dama-board.rv-board` (green felt, `.rv-cell.target` = a legal cell on my turn,
  `.flip`), seats show the disc count, texts in `match.ts` `TEXT` (never "Othello"), lab position `lastmove`. Tests:
  `reversi.test.ts`, e2e `classics.mjs` (a whole game) + `classics-switch.mjs` + `lab-server.mjs`, harness `classics`,
  `games-resume`, `games-sweep`. Okey comes later. **CL2 (0.9.97.59, owner: "design it properly" + "I picked chess once and then couldn't switch"):** every
  room game opens in the free mini window by default (`GAME_CATALOG` `place: 'float'`; "in the video's place" stays a
  choice remembered per kind, `gamePlace:<kind>`; phones unchanged); a Classics window is sized per screen
  (`CLASSICS_SIZES`: picker, then each board; `stage.ts` `sizeOf` reads `.xox-page[data-board]`, the page fires
  `swm-game-size`). A table opens on its picker alone (`.cl-picker`, cover cards, until someone picks: state `chosen`);
  "Change game" (`#cl-shelf-open`) sits in the window's head (`.game-head-slot`). A board is one column (`.mt`): bar
  (score, Glowbeam's chips, 👁 watchers popover), the other seat, the board as large as the row allows (container
  query units), my seat, the backgammon tray, one status line, the buttons of the moment; captured pieces / off counts
  beside the names. Switching (`{t:'switch', game, end?}`): before the first move or after a finished game at once;
  during a game a plain switch is refused (`in_progress`) and the page asks "End this game and change?", then sends
  `end: true` (any seated player decides, not only the opener / host); everyone at the table gets the fresh board.
  Draw & Guess / Quiz lobbies are one centred card with the players as chips (`lobby.css`, `ui.ts` `lobbyPlayers`).
  **PROP (0.9.97.113, owner: "in the video's place the games look out of proportion; the same experience in both
  modes"):** in "stage" (the video's place) `stage.ts` `refit` no longer stretches a game's layout over the box at
  scale ≤ 1: like the free window, it lays the game out at one of its own shapes and scales that to the box (up to
  `MAX_STAGE` 2.2), picking the shape that shows it bigger: the catalog `size` or its `wide` shape (every
  `GAME_CATALOG` / `CLASSICS_SIZES` / `SOLO_CATALOG` entry; about 2 : 1, e.g. 820 × 440, the head included like
  `size`). In the wide shape the game box is ≥ 16 : 10, and each game's CSS reflows for it with
  `@container game (min-aspect-ratio: 16 / 10)`: a Classics board on the left at the full height and the bar, seats,
  status and buttons in a column (`classics.css`, the picker's cards in one row); Five Frames' tickets left, head,
  result and letters right (`five-frames.css`); the Duel's boards left, referee, buttons and letters right
  (`duel.css`); Last Heart's seat in two columns (cards and actions | special moves) and its lobby card in two
  columns (`poker.css`, new, with the poker chunk); the Draw & Guess lobby card in two columns and the canvas beside a
  360 px column (`lobby.css`); Quiz (its 7 : 4 rule), Sea Battle, Snack Bar and Window Garden reflow as they were.
  Sea Battle: the seas full height on the left, bar, Stub's line and buttons on the right (`sea.css`); the result card
  with a podium in two columns (`result.css`). With every table reading well there, `stage.ts` `STAGE_READY` is on
  (W's switch from 0.9.97.112): tables always play in the video's place with no switch (over YouTube beside the
  player), `GAME_CATALOG` `place` is 'stage' for all of them; side games keep the free window / video's place choice.
  The free window, phones and narrow screens are unchanged. Lab command `games.place` flips an open side game between
  the two placements (a table answers that it always plays in the video's place). Harness `scripts/harness/game-proportions/run.cjs` (games-more: laptop, desktop, tablet): every
  game and a game going with the 🤖 friend, in both placements; on the screen the usual text is ≥ 11.5 px (≥ 16 in a
  box ≥ 700 px each way), nothing under 8.5 px, the game covers ≥ 28 % of the video's place, and there it is shown at
  least 85 % as big as in the free window.
  Lab commands `classics.picker`, `classics.pick.<board>`. Tests: e2e `classics-switch.mjs` (every from → to pair
  against Glowbeam, a finished game, Glowbeam moving first, two people), `games-sweep` (the board is the largest thing
  and nothing sits beside it; lobbies without a side column), harness `classics` (Change game asks, Cancel, End and
  change).
  **🚢 Sea Battle (Game Studio, owner's pick C, `docs/internal/design/games/sea-battle.md`):** room kind `sea`, its own
  object `Sea` (`apps/server/src/sea.ts`, binding `FLEETS`, migration `v12`, `/api/sea/:id/ws`) on the Poker pattern:
  both fleets live only there and every connection gets its own view (`view`: my ships, the other sea's shots and sunk
  ships; both fleets once the game is over); watchers never see a ship. Rules, protocol and the bot in
  `packages/shared/src/games/sea.ts`: `SEA_RULES` holds the owner's rule picks in one place (sea size, fleet, shoot
  again after a hit, may ships touch), `checkFleet`, `randomFleet`, `shotResult`, `sunkShips`, `knownEmpty` (water around
  a sunk ship when ships may not touch); Glowbeam `botShot` (easy: random, then next to a hit; medium: counts how the
  ships afloat could lie and follows a hit along its line), 0.7 s a shot, a seat of its own (`bot`). Messages `place`
  (checked), `shuffle`, `ready`, `shot` (my turn, a new cell), `bot`, `sit`, `rematch` (swaps who shoots first), `lab`
  (`oneLeft`, `reveal`, local lab server only). The page `games/sea.ts` + `sea.css` (lazy chunk, own `TEXT`, class prefix
  `sea-`; Snack Bar owns `sb-`): placing shows only my sea (tap a ship, tap water; Turn / R; drag; Shuffle; Ready), the
  battle both seas side by side on a computer (theirs bigger, the sea being shot at outlined in gold), one sea at a time
  with a "Their sea / My sea" switch in a narrow window, flipping to their sea on my turn; marks are shapes (ring,
  burst, dark gold outline), cells named "A1: water"; sounds `seaMiss` / `seaHit` / `seaSunk`. Lab commands `sea.bot`,
  `sea.oneLeft`, `sea.reveal`. Tests: unit `sea.test.ts`, e2e `sea.mjs` (no message ever carries a hidden ship) +
  `lab-server.mjs`, harness `scripts/harness/sea/run.cjs` (in CI's "Games quality"), the `games-sweep` entries `sea` /
  `seaPlay`. KEYREP (0.9.97.94): a held R turns the ship once (`event.repeat` ignored); its repeats sent a `place` each,
  ~30/s, past the server's per-connection message limit (QUOTA1a); the sea harness holds R for 40 repeats.
  NG1 (0.9.97.103, owner's pick 7B): on a phone layout (`isPhoneLayout`) the first tap on their sea zooms that quarter
  (`zoomQ`, `quarterOf`; the grid sits in a `.sea-zoom` frame, `.zoomed` + `data-q` = `transform: scale(2)` with a
  `transform-origin` per corner, no transition under reduced motion) and aims; a second tap in the same quarter fires,
  a tap in another quarter moves the zoom; "Whole sea" (`.sea-whole`, 44 px, always shown while zoomed) goes back; a
  shot or a lost aim ends the zoom. Lab command `sea.zoom` (shows the zoom on any screen, next quarter each run); the
  sea harness checks zoom, Whole sea, quarter change and fire on a phone.
  **⚔️ Five Frames Duel (card FFDUEL, `docs/internal/design/games/five-frames-duel.md`):** room kind `duel`, its own
  object `Duel` (`apps/server/src/duel.ts`, binding `DUELS`, migration `v14`, `/api/duel/:id/ws`) on the Sea pattern:
  the word and every guess live only there; each connection's `view` carries my own words, everyone's marks (`score`),
  `solved` / `out`; the word (`answer`) and all words only once the game is over. Rules and protocol in
  `packages/shared/src/games/duel.ts` (`duelGuess` = the solo game's `guess` checks, `duelOutcome`: the first to solve
  wins, both used up = draw; `practiceWord`); the word lists moved to `packages/shared/src/games/words/` (the server
  unpacks them with `decodeWords`). Phases `wait` (both press Ready; a seated player picks EN / TR, which resets Ready)
  → `play` → `over` ("Play again" = ready; both = the next game). The table's first game is the day's word (`daily` =
  day number, `answerFor` on the server's UTC day), every next one a practice word (secure random, never the day's).
  A guess after the game was decided gets `error over` (two winning guesses at once: the first processed wins).
  `sit` only between games (a free or away seat). The page `games/duel.ts` + `duel.css` (lazy chunk, own `TEXT`,
  reuses `five-frames.css`; `.ff.duel`, `data-table` = the table id): my tickets left, the other's marks right (watchers:
  both); on a phone their marks are a strip (one column per guess); the alphabetical tray while playing; the keyboard
  types only while the board has the focus. GPRO: while the table waits, a lobby card (`.duel-lobby`: title, rules,
  faces, EN / TR chips; Glowbeam's line and Ready move into it) like the other tables' lobbies. Lab commands `duel.answer`, `duel.win`, `duel.match`, `duel.silent` (`lab` op `answer`,
  local lab server only). Tests: unit `duel.test.ts`, e2e `duel.mjs` (no message carries the word or the other's
  letters before the end, reconnect, a simultaneous finish, rematch = practice, a draw), `games-sweep` `duel` /
  `duelPlay` (Sam joins as a socket), `games-pair` `duel` (reload, network drop; in CI).
  NG1 (0.9.97.103): own cover (`art/covers/duel.svg`); two lobby choices, message `settings` (`bestOf` 1 | 3, `hard`),
  only between matches, resets Ready (mid-match `error in_progress`). Best of three (`matchOver`, `matchWinner`;
  saved `matchWins`, `matchGames`): game 1 is the day's word, the next ones practice words; the bar shows "Game n of 3 ·
  a–b" and "Play again" reads "Next game" until someone has two wins or three games are played; a seat's `wins` counts
  matches. Hard mode (`hardModeMiss`): every ✓ letter stays in place and every ✓ / • letter is used again (counted),
  checked against all my earlier guesses; a miss is `error hard` with `letter` (+ `at`) and costs nothing; the tag and
  the result card say "Hard mode". View fields `bestOf`, `hard`, `match`. Lab command `duel.match` (best of three, hard
  on). Tests: `duel.test.ts` (hard mode EN + TR, match end), `duel.mjs` second table (settings, refusal mid-match, hard
  refusal names letter and place, a full match with a solver that keeps to the marks, a new match at 0–0).
  **Draw & Guess (0.9.72):** separate object `Draw` (`apps/server/src/draw.ts`, binding `DRAWS`, migration `v3`,
  `/api/draw/:id/ws`), protocol and pure rules in `packages/shared/src/games/draw.ts` (guess matching: lower case +
  Turkish letters optional, 1 letter off = "close"; hint letters at 40/60/80% of the round; 50–150 points, the drawer
  gets 25 per correct guesser), words `draw-words.ts` (P10: 12 categories × 45 words a language, `DRAW_CATEGORIES` / `DRAW_WORD_SETS`, the host picks one or all (`settings.topic`); TR/EN, room language from the first arrival; tools: pen, 🧽 eraser, fill, undo, redo `{t:'redo'}` (the server keeps the last 20 undone actions until a new stroke; Ctrl+Y)). 2–8 players
  (persistent `cid`), round: lobby → choose (15 s, words only to the drawer) → draw (80 s) → reveal (6 s) → next.
  Timers via storage alarm, and since 0.9.93.2 any message (the page pings every 15 s, and once the time is up) moves
  an overdue phase on (`overdue` / `advance`; Quiz the same): live alarms ran > 25 s late right after a deploy. The drawing only in memory (1000×750 grid, 50 ms chunks, latecomers get `strokes`).
  Guessers/drawer chat privately with `secret`. Piece `games/draw.ts`. Test: `scripts/e2e/draw.mjs`. Ctrl+Z / Ctrl+Y
  send one undo / redo per press, never per key-repeat (KEYREP, 0.9.97.94).
  **Quiz (0.9.74):** object `Quiz` (`apps/server/src/quiz.ts`, binding `QUIZZES`, migration `v4`, `/api/quiz/:id/ws`),
  `packages/shared/src/games/quiz.ts` + `quiz-questions.ts` + `quiz-questions-2.ts` (P9: 1175 questions, the second bank with a difficulty `d` 1–3; a game goes from easy to hard; the browser keeps the last 600 question ids it saw (`quiz:seen`) and sends them as a base64 bitmap in its hello (`encodeSeen`), the table avoids them and its own recent ones; the stars show the difficulty) (general knowledge, TR/EN, no film/series names; options
  shuffled every game). 2–8 players, 10 questions × 15 s, correct = 100–200 points (faster = more), reveal when everyone
  answered or time is up (4 s: correct option + who chose what), podium at the end; the correct option is not sent
  before the reveal. Piece `games/quiz.ts`. Test: `scripts/e2e/quiz.mjs`. Plan for more games:
  `docs/internal/oyun-fikirleri.md`.
- **Solo side games ("Play on the side", 🎮 Game Studio since 4 Nov 2026):** they move only in a room: while their
  window is open (or minimized) in a room page and the room's video plays; nothing is paid, grown or dried for the time
  away (owner, 0.9.97.31). Their window has no close (✕ minimizes, ↺ "Start over" in the game is the only reset,
  0.9.97.31). pure rules in `packages/shared/src/games/` (`snack-bar.ts`,
  `garden.ts`, `five-frames.ts`, each with one versioned JSON save in `localStorage`, cleaned field by field), the
  window is the games stage: `catalog.ts` `SOLO_KINDS` / `SOLO_CATALOG` (size / fit), `stage.ts` `solo` next to
  `current` (one game in the window at a time: opening a solo game leaves my table, opening a table closes the solo
  game), the hub's "Play on the side" section, `openSolo`; the room passes `room: soloContext` (playing = an item, not
  paused, past the "3-2-1" hold; others = people by name + avatar without my tabs and TVs; voiceOthers = those in
  voice while I am). **🍿 Snack Bar** (`games/snack-bar.ts` + `snack-bar.css`, a lazy chunk; art copied from
  `docs/internal/design/side-games/snack-bar/` to `games/art/snack-bar/`, inlined with unique ids): ticks once a
  second, saves every 5 s / on close / `pagehide`; income only while playing, +10 % per other person, +5 % per one in
  voice with me; no "while you were away" pay since 0.9.97.31; a tap on the scene serves. **Economy v2 (card SB3,
  `SNACK_VERSION = 2`, design + balance tables `docs/internal/design/games/snack-bar-3.md`):** 8 stands (popcorn …
  second counter, hot dog, ice cream, arcade), each with its own price growth 1.08–1.15 (`costOf`, bulk = geometric
  sum); ×2 milestones at 10/25/50/100/200/300/400; 3 recipes per stand (×2 each, `RECIPE_STEPS`, `buyRecipe`);
  the menu +10 % per stand at level ≥ 25 (`menuFactor`); staff kept over cinemas (`hire`: tip box, usher serves after
  `USHER_DELAY_S`, long line halves the wait, manager); today's special ×2 (`specialOf(dayNumber())`, passed as
  `ctx.special`); new cinema from `PRESTIGE_MIN` 100 B, stars ⌊∛(earned / 6.4 M)⌋, +2 % each; places cycle lobby,
  drive-in, rooftop, art house, seaside (customers ×2), planetarium (+25 % alone). `loadSnack` migrates v1 (stars ×2.5
  rounded up, nothing earns less; unit test). The page: buy bar ×1 / ×10 / Max (`snackBar:buyMode`), "📋 Upgrades"
  panel (recipes + staff, dot when affordable), rows = open stands + the next locked one, as many as fit (`fitRows`,
  real pixels × the window's `--fit`; the rest "+N more"). Balance: `scripts/snack-sim.mjs --check` (CI `checks` job);
  harness `scripts/harness/snack-bar-3/run.cjs` (CI `games-more` job). One tab at a time (`snackBar:tab` heartbeat,
  "Play here" takes over); its buttons never keep the focus (`mousedown` preventDefault), no key handlers; sounds
  `snackServe` / `snackBuy` / `snackMilestone` / `snackCinema` (game family B). At least three rows always show. Its texts live in the chunk (`TEXT` in `snack-bar.ts`, EN + TR), not in `i18n.ts`: the room page's
  JS budget (`scripts/size-budget.mjs`) is nearly full.
  NG2 (0.9.97.104): `.sb[data-place]` sets the place's colours (`--sb-panel`, `--sb-night`, `--sb-wall-a/b`,
  `--sb-shelf`, `--sb-counter-a/b`, `--sb-stripe`); the scene's wall, shelf, counter and stripes read them through
  `var()` (replaced in `decorated`). Seasonal stand: `SEASONS` (cocoa, lemonade, cotton-candy, caramel-apple),
  `seasonWeek` (Monday weeks, UTC), `seasonOf`, save field `season { week, level }` (optional, old saves load with
  null), `seasonCost` (60 s of income without itself, min 50, ×1.5 a level), `buySeason`, `seasonFactor` (+5 % a
  level, in `globalFactor`), `rollSeason` (in `tick`, `ctx.week`), badges `season-<id>` at level 5; shown on top of
  Upgrades (`.sb-season`), a line when the week changes. `managerReport` (top three stands by share, `next` = the
  fastest payback among stand levels, open recipes and the seasonal stand) on the receipt (`.sb-report`, replaces
  "Best stand"). Milestone sounds per stand (`STAND_SOUND`: `snackPop`, `snackFizz`, `snackCrunch`, `snackCandy`,
  `snackBell`, `snackSizzle`, `snackScoop`, `snackArcade`). Lab commands `snackBar.report`, `snackBar.season` (moves
  the week on, `labWeeks`). Tests: `snack-bar.test.ts` NG2 block, harness `scripts/harness/snack-bar-ng2/run.cjs`
  (CI `games-more` job).
  **Tip jar and cuttings (side games 2, picks 5 + 8):** the room's only side-game messages. `{t:'tip'}` (Snack Bar's serve
  and customer serve, `SoloRoom.tip`) counts only while an item plays and not paused, ≤ 1 per 2 s per person
  (`tipLimit`); the room object keeps `tipJar {fill, boost}` in memory (`TIP_JAR_SIZE` 60), broadcasts `{t:'tipjar',
  fill, size, boost, by?}` every 5 coins and when full (boost = the item id: +10 % `TIP_BOOST` for that film, the 🫙 pill
  `.sb-jar`), and sends it after `welcome`. `{t:'gift', to, plant}` (Window Garden "🎁 Give a cutting" on a bloom, one per
  bloom `Pot.gifted`, ≤ 1 per 30 s per person) goes only to the recipient person's connections (not myself, not TVs,
  only `PLANT_IDS`); the page keeps it in `windowGarden:gifts` (`rememberGift`) until the garden takes it into
  `giftSeeds` (≤ 9, planted with `plantGift`, "🎁 Mint" on an empty pot). Tests: e2e `sidegames.mjs`, harness
  `scripts/harness/side-gifts/run.cjs` (15).
  **🎮 Games gallery (card GG, owner's pick B "two tabs", 0.9.95.3):** `#game-menu` is drawn by `games/gallery.ts`, a lazy
  chunk with the Design session's covers (`games/art/covers/`, inlined with unique ids) and its own texts (`TEXT`);
  `stage.ts` keeps the state and passes it in (`renderGallery`, also `gameIcon` / `avatarNode`, so the chunk shares no
  module with the room page's split; importing them made Rollup split `sound` / `avatar` chunks and broke the budget).
  "👥 Together": a two-line "What's new" note, the room's tables, a cover card per room game (3 a row; Last Heart's cover
  came with #166); "🍿 On the side": Snack Bar (cover, line, progress "🪙 12.4K"), Window Garden and Five Frames as
  "Soon" until built. The last tab is remembered (`opt:hubTab`); `keepHubOnScreen` slides the window back on screen
  (`translate`) when its button sits near an edge; phones: a bottom sheet as tall as its content. Harness
  `scripts/harness/games-gallery/run.cjs` (24 checks).
  NG3 (0.9.97.106): the hall's badge styles live in the lazy `games/gallery.css` (room CSS budget); a cover card's
  NEW / UPDATED badge sits on its own line under the title. **Table badges:** `scripts/game-badges.mjs` draws one set
  (`games/art/badges/<kind>.svg`: a rounded tile in the table's tint, a cream line icon) for classics, draw, quiz,
  poker, sea and duel; worn on the hall's covers (`.hub-card[data-kind] .hub-cover::after`) and on the lobby cards
  (`h3::before` in `lobby.css` / `duel.css`, replacing the emoji).
  **Stub, the games' mascot (MASCOT3, NG3, 0.9.97.106):** `games/stub.ts` holds every pose from Design's set
  (`docs/internal/design/mascot-3/`, copied to `games/art/stub/`): `stubArt(pose, cls)` / `setStubPose` (unique ids
  per copy): the referee `referee` / `cheer` / `gasp` (`referee.ts` by mood; Classics and Sea Battle through
  `syncRefereePose` from their `react-*` / `cheer` classes), the bot's face `opponent` (seat avatars), `small` (the
  bot buttons' label), the result card `plain` → `win` / `sorry` by the outcome (`resultCard` sets it; `resultStub()`),
  Snack Bar's cashier (the counter scene's `#cashier` group) and receipt (`win`), Window Garden's lamp = Stub's usher
  torch (`art/garden/stub-lamp.svg`). Every game text says "Stub" (Turkish "Stub’a karşı"); the server names the bot
  "Stub"; the saved bot key `bot:glowbeam` stays (old seats keep working). The room and the home (lane A, NP3) draw
  Stub from `logo.ts`.
  **Motion (NG3, owner's pick 10: 4):** `games/motion.ts`, Web Animations from code (no room CSS), all skipped under
  `prefers-reduced-motion`: `slideIn` (the game window comes up as `stage.ts` opens it; `translate`, so the window's
  fit transform stays), `slidePiece` (chess / dama: a copy of the moved piece slides from the old square inside the
  board, `.dama-board` is the cells' offset parent; the real one waits as `.arriving`; chess sends `from`, dama finds
  the mover's emptied square), `flipIn` (Last Heart: a card that turns face up flips, 70 ms stagger, once per hand).
  Harness `scripts/harness/motion/run.cjs` (CI `games-more` job): the window animates, both chess moves slide and leave no
  copy, nothing animates under reduced motion.
  **🌱 Window Garden (0.9.95.4, the owner's look A "window sill"):** `games/garden.ts` + `garden.css` (lazy chunk, own
  `TEXT`, art from `docs/internal/design/side-games/garden/` in `games/art/garden/`). The scene's `#pot-1..3` groups are
  hidden and three pot buttons stand on the sill (26 / 50 / 74 %); a pot shows seed → sprout → the plant at 72 / 86 /
  100 %, a 💧 when water < 25 %, ✿ and a soft sway in bloom. The action bar acts on the chosen pot: 💧 Water, ✿ Pick,
  or 🌰 seeds to plant; the album strip shows all 8 plants (found in colour). Ticks once a second with `room()`
  (`SoloRoom`: `catalog.ts`, now with `item {id, duration, position}`: `room.ts` reads the duration from the player and
  the position from the room's state); a film of ≥ 20 min within its last 10 s gives its seed once (`filmEnded`).
  Saves every 5 s, on a seed / bloom, on close and `pagehide`; one tab at a time (`windowGarden:tab`). Sounds
  `gardenPlant` / `gardenWater` / `gardenSeed` / `gardenBloom` / `gardenPick` / `gardenNew`. Gallery progress
  "🌱 2 growing · 📖 3/8". Harness `scripts/harness/garden/run.cjs` (17 checks).
  **🎟️ Five Frames (0.9.95.5, card "Daily word game", board A "ticket row", name owner's pick):** `games/five-frames.ts`
  + `five-frames.css` (lazy chunk, own `TEXT`), rules `@swm/shared/games/five-frames`, word lists as their own chunks
  per language (`packages/shared/src/games/words/en.ts` 8636 guesses from ENABLE, public domain, 977 answers; `tr.ts` 4793 guesses from
  the Zemberek-NLP lexicon, Apache 2.0, â/î/û as a/i/u, 1606 answers): `WORDS` = all guesses glued together (five
  letters each), `ANSWERS` = base-36 positions in it (not plain text), our own picks of common words (no suffixes, no
  grim words). Credits + the Apache licence text: `apps/web/public/third-party-notices.txt` ("About the word lists" in
  the game). Seven ticket rows (stub, tear line, five cells: gold ✓ / gold outline • / faded), alphabetical tray (10 a
  row, Turkish 11), ⌫ + gold Enter; EN / TR switch (`fiveFrames:lang`, each its own day and stats); the result line,
  "📋 Copy result" (`🍿 Five Frames #12 · 4/7`), "a new word in …". The physical keyboard types only while the board
  (`tabindex=0`) has the focus: its `keydown` stops letters / Enter / Backspace from reaching the room; otherwise
  every key stays the room's. **BUG6 (owner: "the keyboard goes straight to the word"):** `games/word-keys.ts`
  `grabKeys(board)` gives the board the focus when the word is ready (`start()`: open, the EN / TR switch, a new day)
  and, in the Duel, when a race begins (phase → `play`, seated); never on a touch-only device (the tray is the
  keyboard), never from a text box that has the focus (chat), never under open "How to play" cards (their
  `htp-close` event grabs then). `keepKeys(box, board)`: a press anywhere on the game (not a text box) and Esc in a
  text box outside the game give the keys back. Lab status "Keyboard goes to" (Five Frames); harness
  `scripts/harness/word-focus/run.cjs` (games-more). No tab lock (a save after each guess, other tabs follow by `storage`). **Card GP (0.9.97,
  Design's `docs/internal/design/side-games-polish.md`):** cells were green / gold / grey until the IP audit
  (0.9.97.31, owner's "make it ours"): a solid gold frame ✓ / a dashed gold frame • / a faded ×, never a fill colour
  (`--ff-mark`), the cover's words CLOSE / STAGE / SCENE, typed cells outlined; a legend (`.ff-legend`) shares the result slot until the first guess is scored; after
  Enter the row turns over cell by cell (`reveal`: 110 + 110 ms per cell, 80 ms apart, typing held, the tray and the
  result's sound after the last cell, a solved row hops, an unknown word shakes; reduced motion = a 150 ms colour fade,
  a red outline); the credits link left the game ("Licenses" in the footer and on the Help page).
  **SIDE340 (0.9.97.115):** the three side games read well down to 320 px wide, so on a 1366 or 1440 laptop they open in the
  column right of the video (W's `homeBox`, about 354 px) instead of over the video's edge: `SOLO_CATALOG` `fit`
  312 × 400 / 384 / 448 and `minSize` 320 × 460 / 444 / 508 (the window keeps `size`'s shape); a narrow game box
  (`@container game (max-width: 360px)`, height ≤ 420–540) slims Five Frames' rows (33 px), cells and keys, hides its
  title (the window's head shows it) and wraps its legend; Snack Bar's cinema line takes its own row, the scene is
  80 px, rows 40 px and the Upgrades rows 34 px (three stand rows, "+N more"); Window Garden's bar is tighter (a short
  "📖 n/24" album chip). A 1440 × 900 screen (column 341 px) also gets the column. Snack Bar's badge wall has 14 columns in the wide
  box. Harnesses `game-window-head`, `snack-bar-3`, `snack-bar-ng2` follow the new home. Snack Bar's Upgrades panel
  (`.sb-panel-upgrades`) scrolls inside with a sticky ✕ when the list is long (snack-bar-3 checks it with every stand).
  "How to play" (`how-to-play.css`) in a wide box (`@container game (min-aspect-ratio: 16 / 10)`): picture left at the
  box's height, words / dots / buttons right; `game-proportions` checks every card fits in the video's place.
  **All three (GP):**
  `SOLO_CATALOG` sizes 400 × 575 / 555 / 635 so `--fit` is 1 at 1366 × 768 (fit 380 × 520 / 500 / 580), text ≥ 13 px
  (15 px body, muted `#b9b0dc`), a solo window's title is just the game's name (`.solo-game`; "just you, on the side"
  is its tooltip) with 36 px head buttons under 440 px; **How to play** (`games/how-to-play.ts` + `.css`, shared by the
  three chunks): picture cards from `games/art/tutorial/` (Design's, no words in them, ids prefixed `htpN-`), texts in
  each game's `TEXT`, shown on the first open (`snackBar:howSeen`, `windowGarden:howSeen`, `fiveFrames:howSeen`, set on
  close) and from the "?" (`.htp-open`) in the game's own top bar; ✕ / Esc / ← → / Enter while it has the focus (it never
  takes it); the game keeps ticking behind it. Harness `scripts/harness/side-games-polish/run.cjs` (39 checks).
  **THEMEG:** the card is drawn in the room theme's tokens (`--surface-2` → `--surface` over `--bg`, so it stays opaque on
  the scene themes; `--text`, `--muted`, `--accent`, Next in `--accent-btn`); the tables' "?" (`.htp-head`) looks like
  the head's other `.btn`s; the side games' round "?" keeps its game's dark bar colours. Classics: the pink / blue turn
  ring is for the X / O boards only, the other boards ring the turn in `--accent`; backgammon's dice are `--text`. The
  hall's UPDATED badge is an accent tint and `.game-menu` sits on `--bg` (gallery.css). Checks: `table-how` (Matinee).
  0.9.97.117 also: "Skip" (`.htp-skip`, words, hidden on the last card) sits in `.htp-actions` instead of a corner ✕;
  hall text ≥ 13 px and What's new unclamped (gallery.css); a NEW / UPDATED badge only while `badgeFresh(note,
  SITE_VERSION)` (the note's release or the next; `SITE_VERSION` read from `.footer-version`); Window Garden's Water
  button always "💧 Water" (`.wg-btn.full` when the pot is full), 🌙 for resting; Classics' wins pill and score carry
  🏆, the backgammon tray a title, "Just watch" hidden on your own turn. Harness
  `scripts/harness/five-frames/run.cjs` (20 checks: marks against the real list via the dev server's modules). Harness `scripts/harness/snack-bar/run.cjs` (25 checks).
  **ART-L (0.9.97.119):** Design's light-theme art: the tutorial SVGs (`games/art/tutorial/`) and Window Garden's
  `art/garden/window-sill.svg` write each colour as `var(--al-<hex>, #<hex>)`; the variables are set only under
  `:root[data-theme='matinee']` (end of how-to-play.css), so every other theme draws the original colours. Window
  Garden's body in Matinee maps its `--wg-*` variables to the room tokens (end of garden.css; the garden harness checks
  Night stays dark and Matinee is light). Sea Battle's "Whole sea" lives in their board's `.sea-head` (re-added after
  `seatHead()` redraws it; the sea harness checks it sits outside the zoomed grid). Backgammon: dice 44 px, `.bg-die.used`
  struck through, `.bg-off-o` gets a light rim, the chosen `.cl-bot-level.on` is filled.
- **🐞 Test Lab (card DL, lane B leads; DL1 0.9.97.44; grows from card 12):** `?debug=1` once in a tab switches it on
  (it survives reloads; `?debug=0` or "Turn the lab off" removes it). **Locked (card LABLOCK):** on a local server
  (localhost / 127.0.0.1, all harnesses) `?debug=1` opens it as before; anywhere else only `?debug=<code>` does: the
  page asks `POST /api/lab/check` (`apps/server/src/lab-check.ts`, our Origin, `ROOM_INFO_LIMIT` `lab:` key, body ≤ 1 KB),
  which compares the code's SHA-256 with the Worker secret `LAB_CODE` (`@swm/shared/lab-pass`, constant-time) and
  answers a 30-day pass `<expiry>.<HMAC(LAB_CODE)>` kept in `localStorage` `swm:labPass` (never the code); later
  `?debug=1` and every reload of a lab tab show that pass to the check first (a hand-set `swm:debug` without one is
  dropped; a new `LAB_CODE` ends old passes). No secret = shut on live; `wrangler dev --var SWM_LAB_OPEN:1` accepts any
  code. Tests: unit `lab-pass.test.ts`, e2e `lab-check.mjs` (`LAB_CODE=<code>` with a local `--var LAB_CODE:<code>`),
  harness `lab-lock` (a made-up host `lab.test` mapped to 127.0.0.1 acts as live; CI's server has a throwaway code). Off = not loaded: `debug-lab.ts` (always loaded, tiny) holds only the switch, the error recorder, the
  hook registry and a null-checked message tap; the lab itself is the lazy chunk `ui/test-lab.ts` + `test-lab.css`.
  **Hook API (for every feature, no monkey-patching):** `debugHooks.register(name, () => ({ commands?: LabCommand[],
  status?: () => [label, value][] }))` returns the unregister function; the factory runs only while the lab is open
  (a throwing factory is skipped with a red log line). `LabCommand` = `{ id: 'snackBar.coins', title, help (one
  line: what you will see), tab: 'status' | 'friends' | 'video' | 'games' | 'scenarios' | 'screen' | 'log', where?,
  available?: () => true | reason, run(arg?), undo? }`. **Texts (card LABTR):** title / help / where / reasons / status
  rows / results are `LabText` = a string or `{ en, tr }` written inline (`title: { en: 'Drop my connection for 6 s',
  tr: 'Bağlantımı 6 sn kopar' }`); a thrown `labFail({ en, tr })` shows in the page's language; the lab chunk picks the
  side (`ui/lab-text.ts` `say`, `both` for the search). Plain words that say what happens, no jargon in Turkish
  (WebSocket, HTTP, peer, ICE… are said in words); `check-texts.mjs` fails a lab command without a pair. Every lab
  harness takes `LAB_LANG=tr`; every run goes through `runCommand` (a throw / rejection = a red log line, never a broken
  room; Undo is offered right after). The room taps its messages (`debugTap('in' | 'out', message)` in `room.ts` `send` /
  `handleMessage`) and registers `room` status lines (clock offset `ServerClock.offsetMs`, playback, members, host);
  `voice` / `live` register their peers' states (`P2pVoice.peerStates()`, `LiveP2p.peerStates()`, read only). The log
  keeps 2 min / 600 lines, `redact` drops browser ids, IP hashes, tokens and `data:` images. **UI:** 🐞 bottom left or
  Ctrl+Shift+D opens a drawer on the right (`--lab-w`, the page makes room with `html.lab-open` so it never covers the
  rail; in real fullscreen it moves into the fullscreen element on the left; on a phone a bottom sheet); tabs 📊 Status
  (card 12's facts + hook lines + a 60 s drift graph + switches + errors), 👥 🎬 🎮 🧪 🖥 (the commands registered for
  them, "comes in a later step" until then), 📜 Log (filter, pings hidden by default, pause); Ctrl+K = the command box
  (type to narrow, ↑ ↓, Enter runs; keys typed there never reach the room); "🐞 This is a bug" shows the exact text it
  copies (versions, state, errors, last 2 minutes of the log). Lab commands of its own: `lab.bug`, `lab.mark` (+ undo),
  `lab.clearLog`, `lab.clearErrors`, `lab.selfTest` (a command that throws), `lab.reload`, `lab.firstVisit`, `lab.off`.
  **👥 Fake friends (DL2, `ui/lab-friends.ts`, part of the lab chunk):** up to `MAX_FRIENDS` 5 pretend people in the room the
  lab is open in. Each is an ordinary client: its own `RoomConnection` with a random in-memory browser id, the normal
  hello and the server's normal limits, "🤖 Ada / Ben / Cleo / Dev / Eli" with a random themed avatar, `handover: false` (a
  `RoomConnectionOptions` field: it neither takes nor leaves the tab's `swm:prev:<room>` member id). Commands (👥 tab rows
  with quick buttons, and the command box; a number picks the friend, otherwise a random one): `friends.add` / `add3`
  (with knocking on they wait at the door), `removeAll`, `say`, `react`, `pause` / `play` / `seek` (+30 s, from their own
  copy of the room's state), `stall` (`ready: false` for 5 s: the room waits), `bounce` (leave, back after 5 s with the
  same member id), `host` (the room's 👑 Make host message through `DebugRoom.makeHost`; host only; kept out of the room page's budget), `chatty`
  (they write / react by themselves every 2, 5 or 10 s). All leave when the lab is turned off and on `pagehide`.
  `window.__swmLab` (`run(id, arg)`, `undo(id)`, `list()` (every command with its tab, texts, availability and whether it
  has an Undo), `log()`, `bugText()`) exists only while the lab is on (harnesses). `friends.host` has an Undo since LAB2:
  the friend hands the role back (`make-host` from their own connection, they are the real host then).
  **🧪 Test round (card LAB2, 0.9.97.109, `ui/lab-round.ts`, part of the lab chunk):** one command per test on the owner's
  board, `round.<id>`: `s1`–`s4`, `n1`–`n4` (+ `n2old`), `f1`, `f2` (STATUS "Owner's hand tests") and `t1`–`t11` (the
  0.9.98 round's items 1–11, "Next round, start here"; item 7 is Game Studio's 🎮 tab). Each sets the stage the lab can
  (themes / fonts on this page only, a fake friend who pauses / plays / jumps, writes three lines in fullscreen, knocks
  at the door, writes privately; the invite's QR tab; the Help or home page in a new tab) and returns one line of what to
  look at; tests that need a real person or device (t3, t4, t9, t10, t11) only say so. `n2old` (saves the removed Ocean
  Liner theme) and `n4` (forgets the camera window's place) reload the page; their Undo puts the saved values back from
  `sessionStorage` `lab:roundKept` and reloads. Shown under the scenarios in the 🧪 tab (`.lab-round`). Scenarios whose
  friends need room send earlier fake friends away first (at most `MAX_FRIENDS`), and "a video plays" starts a paused
  video again. Harness `scripts/harness/lab-sweep/run.cjs` (LAB2, in CI): every command of every tab (🎮 is Game
  Studio's) run once and undone on a live-like host (`lab.localhost`: Chromium sends it to this computer by itself; a
  `--host-resolver-rules` name gets its WebSockets refused in the cloud container), computer + Pixel 7, EN + TR: no red
  line except the self-tests, every tab, the command box, "This is a bug", the N2 reload check; `DEVICES=`, `LANGS=`,
  `TABS=` narrow it. One address may open 60 new connections a minute (`CONNECT_LIMIT`): the sweep waits a minute after
  🎬 "Open 12 more connections" and between runs, and the scenarios' "did not get in" says so. **Rule for
  every new card from DL1 on:** its "Done when" includes its lab hook or scenario. Harness `scripts/harness/test-lab/run.cjs`
  (39 checks, in CI): off = no chunk and no lab object, the drawer, tabs, status lines, the rail never under the drawer,
  the log (in / out, redacted, filter), the command box (run, undo, typing never reaches the room), a failing command
  keeps the room working, the bug text = the copied text, a page error, a phone sheet, Turkish, off again. Harness
  `scripts/harness/lab-friends/run.cjs` (in CI): five at most, each action reaching me, the wait, leave and back, chatty,
  the knock card, the host role, off and a reload send them away.
  **🎬 Video & network (DL4, `ui/lab-video.ts`, part of the lab chunk):** accidents on this tab's own side only, through
  `DebugRoom.lab` (`RoomLab` in `debug-lab.ts`, filled by `room.ts`): `net.drop` (my connection breaks and stays down N s,
  `RoomConnection.labDrop`), `net.restart` (reconnect now with my member id, as after a deploy), `net.slow` (every
  message in and out waits N ms, `labLatency`; undo), `net.http` (force the HTTP fallback, `labForce`; undo), `net.normal`,
  `video.drift` (my video N s off the room as our own seek, `SyncEngine.labDrift`: the drift correction must bring it
  back), `video.stall` (my video counts as stuck N s, `labStall`: the room waits), `video.adFilm` (queues the
  film-server's `/preroll` page, local server only). The connection / engine hooks are inert unless the lab calls them;
  turning the lab off resets latency and a forced fallback, and removes `window.__swmLab` (it used to stay). Harness
  `scripts/harness/lab-video/run.cjs` (27, in CI).
  **🧪 Scenarios (DL5, `ui/lab-scenarios.ts`, part of the lab chunk):** one-click scripted checks with ✓ / ✗ per step, run
  with the fake friends and the 🎬 accidents: `basics` (a friend joins, writes, pauses / plays the sync test, leaves),
  `wait` (a stuck friend: the room waits and plays on), `knock` (host only: the door on, a friend knocks, Let in on their
  card), `private` (a private line reaches the first of two friends only), `reconnect` (my connection drops while a friend
  writes: back with the same member id, the line arrives), `selfTest` (fails on purpose). A scenario stops at its first ✗
  (the rest "–"), a failed one is a red log line, and it always cleans up (its friends leave, a setting goes back).
  New scenario: a `Scenario` in `SCENARIOS` with steps that throw on failure (`ctx.until`, `ctx.memo`, `ctx.cleanup`);
  they use only `DebugRoom.lab`, the friends (`FakeFriend.heard` keeps the chat they received) and the page. Harness
  `scripts/harness/lab-scenarios/run.cjs` (in CI).
  **Games (DL3a, Game Studio):** `games/lab-tools.ts` is loaded only with the lab on (the games stage imports it
  dynamically when `swm:debug` is set, so it is not in the room page's budget; the side games' chunks import it). The hall's
  commands (`games.open.<kind>` for every table and side game, `games.speed` ×10 side-game time (each tick runs `labTicks()`
  times, still capped like a real second), `games.playing` "pretend the film plays" (`labRoom` gives the side games an
  hour-long `lab-film`, nothing is sent), `games.restore`); each side game registers its own while its window is open
  (`registerSideLab`): Snack Bar `snackBar.coins` / `.customer` / `.receipt` / `.badges` / `.place` / `.upgrades` (open recipes + all staff) / `.levels` (every stand to 30), Window Garden
  `garden.grow` / `.bloom` / `.seeds` / `.hybrid` / `.sky` / `.rain` / `.visitor`, Five Frames `fiveFrames.answer` / `.day`.
  **Sandbox:** before a game's first cheat its real save is copied to `lab:real:<key>` (localStorage only, never synced);
  `games.restore` writes every copy back through `save` and fires `swm-lab-restore`, which the open games reload from.
  Harness `scripts/harness/lab-games/run.cjs` (25 checks, in CI). **Server powers (DL3b):** only a local test server has
  them: `wrangler dev --var SWM_LAB_SERVER:1` (CI's local server and `npm run dev`) AND a localhost address
  (`apps/server/src/lab.ts` `labServer`, each object's `this.lab`); the flag is never in `wrangler.jsonc` or the deploy.
  LABWAKE: an object rebuilt after hibernation (≈ 20 s quiet, wrangler dev too) has no request, so `labOnRequest` keeps
  the yes in the object's storage (`swm:lab`, written only on a lab server) and a lab message reads it back with
  `labRemembered` (only while `SWM_LAB_SERVER` is set); `lab-server.mjs` checks a lab message after 25 s of quiet.
  **LAB2 (0.9.97.108, the owner's test round):** every 🎮 command answers honestly: a command that needs a state says
  why it can't run now (`available`: a game going, the battle / race on, a seat taken), and the server-power ones say
  "local test server only" off localhost (`games/lab-server.ts` `labServerHere`, `LOCAL_ONLY`). **🤖 friend at a table**
  (`games/lab-table-friend.ts`, loaded on first use): `games.friend` seats a pretend player at the open Quiz, Draw &
  Guess, Last Heart, Duel or Sea Battle table (its own random `cid`, the normal hello through `openSocket`, "🤖" in its
  name; at the Classics it points to Stub). It answers questions, draws a circle / guesses words, checks or calls,
  presses Ready and tries real words, places a fleet and shoots; it never presses Start. `games.friendQuiet` (no message
  for 2 min: the table marks it offline at ≈ 90 s), `games.friendLeave`. Shortcuts: `quiz.toEnd` / `draw.toEnd` (skips
  every phase to the result card, local server), `snackBar.milestone` (popcorn one level below its next milestone, with
  the coins for it). The tables' commands carry their names (`Masa aç: Bilgi yarışması`). Harnesses
  `scripts/harness/lab-games-all/run.cjs` (every command, laptop / phone × EN / TR; `LIVE=1` on a live-like host:
  local-only ones say so) and `scripts/harness/lab-table-friend/run.cjs` (the friend at each table), both in CI's
  `games-more`. The owner's steps: STATUS "Test round with the Lab: games".
  Messages: room `{t:'lab', op:'tipjar'}` (the tip jar fills for the film playing; elsewhere `bad_message`), Classics
  `{t:'lab', position}` (`games/lab-positions.ts` `LAB_POSITIONS`: chess `mate1`, dama `chain`, backgammon `bearoff`,
  each checked by its board's state check; a player; elsewhere `lab_off`), Quiz / Draw `{t:'lab', op:'skip'}` (the phase
  ends now; elsewhere `lab_off`). Lab commands: `classics.position.<name>`, `quiz.skip`, `draw.skip` (registered by the
  table pieces while mounted), `games.tipjar`. e2e `lab-server.mjs`: with `LAB_SERVER=1` (CI's local run) they work;
  in the live run after every deploy every one is refused and nothing changes.
- **Move to another device (0.9.96.4, card "Move my things to another device"):** Settings → Me → 📲 Move
  (`#settings-move`; card SIMP1 took it out of the profile menu)
  or the other device's QR (`/#move=<code>`, `app.ts` `openMoveFromHash`, also on `hashchange`) → `ui/move-device.ts`
  (lazy chunk + `move-device.css`, own texts). Shared `move.ts`: `MOVE_KEYS` (snackBar, windowGarden, fiveFrames,
  savedRooms, stickerCollection, name, avatar; nothing else ever moves), `packMove` (emoji images dropped oldest
  first above `MOVE_MAX_CHARS` 900 k), `decodeMove`, `mergeMove` (games keep the save that got further:
  `progressOf`; saved rooms joined by id, newer name, `mine` kept, ≤ 20; emoji collection joined, only `data:image/`,
  ≤ 12; name / avatar only fill empty ones). Server `move-link.ts` (`MoveLink`, binding `MOVELINKS`, migration `v8`,
  `/api/move/<code>/ws?role=send|get`, `guardSocket` so `CONNECT_LIMIT` counts every try): the sender waits (10 min
  alarm), a receiver is announced (`asking`) and nothing moves until the sender's person presses Send (`send {data}`;
  `refuse`), the text is handed over once and both close; `taken` 4009, `none` 4404, `busy`, `refused` 4403; nothing
  stored. Tests: unit `move.test.ts`, e2e `scripts/e2e/move.mjs` (12), harness `scripts/harness/move/run.cjs` (13).
- **Browser blocks direct connections (0.9.91.17, `packages/shared/src/ice-watch.ts`):** with Chromium's WebRTC policy
  "Disable non-proxied UDP" (Brave / Vivaldi setting, uBlock Origin's WebRTC option, Opera's VPN) no ICE candidate is
  gathered and a connection stays "new" forever (never "failed"). `watchIceBlocked` on every voice and stream peer
  connection reports "gathering complete with zero candidates" → `onBlocked` → once per page a 15 s hint
  (`voice.blocked`) with the fix per browser; on the film page offscreen sends `{op:'blocked'}`. Test:
  `scripts/harness/voice/blocked.mjs` (Playwright's Chromium: the full Chrome binary ignores
  `--force-webrtc-ip-handling-policy`; `POLICY=default` is the control run). Browser research: `browser-support.md`.
- **Video chat (0.9.63, peer-to-peer only, on the site):** 📷 in voice → `P2pVoice.setCam` (320×240, 15 fps,
  ≤280 kbit/s; the video channel is always created with the connection, turning the camera on/off only does
  `replaceTrack`, no renegotiation; old versions' audio-only offers have no video). Member `voice.cam` (no version
  bump), `{t:'voice', on, mic, cam}`; no video on the Cloudflare path. Site: tiles (`#voice-cams`, my own preview
  mirrored); **0.9.81 free windows** (`ui/cam-float.ts`, user's request): the same tile set lives in the card
  ("⧉ Serbest bırak"), in a floating window on the page (drag anywhere, resize from the bottom-right corner, "−"
  minimizes, "⤓" puts it back in the card, double-click resets position; `localStorage` `opt:camFloat`,
  `camFloat:spot` as a ratio) or automatically inside `.player-wrap` in fullscreen (separate spot `camFloat:fsSpot`).
  Videos are replayed after moving. **0.9.85 (Meet/Discord-style, owner's request):** in the floating window and in
  fullscreen, round 🎙 / 📷 buttons under the tiles (`.cam-controls`; they press the card's own buttons; red = off); the
  window resizes in both directions (`Spot.h`, `.sized`: tiles fill it); **M** toggles my mic on the site. Clicking a
  face in the "Birlikte" card or a camera tile (a still click, not a drag: `onTileClick`) opens the **person menu**
  (`.person-pop`, an island in the shell; on myself (0.9.88): mic / camera on-off, leave or join voice, "change my name and
  avatar"): volume for me 0–100 % and "mute for me" (`localStorage` `voiceSound`, by
  person = name + avatar; in the shell sent to offscreen as `{op:'volume'}`, old extensions ignore it), "📌 show
  their camera big" (`.cam-tile.pinned`, first and full width; this tab only), "🙈 hide myself" on my own tile
  (`opt:hideSelfCam`, others still see me), and for the host "🚪 remove from the room" (same kick + confirm as the
  people list). In the shell the floating window is `data-island` (visible over the hole); while
  dragging, the `swm-layout` event updates the island immediately. The old `#cam-dock` is gone.
  **0.9.90.5 camera layout 2 "free tiles" (owner's choice, proposal https://claude.ai/artifact/UPW29vM3kkGvWKD9hkBTrm):**
  floating / fullscreen cameras default to `opt:camLayout` = `free`: the box (`.voice-cams.free`) covers the page or
  the video and lets clicks through; every tile is its own window (drag, corner `.cam-tile-resize` both ways, double
  click = back in line, touched tile comes to the front); places per person (`tile.dataset.person` = name|avatar) in
  `camTiles:spot` / `camTiles:fsSpot` (at most 30, no x/y = attached: since 0.9.91.7 the automatic column hangs under
  the pill (above it when the pill is in the lower half) and follows it while the pill is dragged). A
  pill (`.cam-pill`, own spot `camPill:spot` / `camPill:fsSpot`) holds 📷 N, "👁 N" (hidden cameras), ⊞ line up (keeps
  widths), ↺ reset, ▣ / ⊡ switch to the old single window (`group`), −, ⤓ and the 🎙 / 📷 buttons. In the shell the box
  is not an island, each tile and the pill are (`room.ts` `reportLayout` reads `.free` children inside the hole). Person
  menu: in the free layout size presets (small / medium / large, `camWindow.setSize`) instead of "show big"; "show
  big" now also works on myself; "🙈 hide their camera (for me only)" (`localStorage` `camHidden`, back via the menu or
  "👁 N"). A person whose connection drops keeps their tile for 12 s with "📶 yeniden bağlanıyor" (`ghosts` in
  `ui/voice.ts`; only when the member left the room, not on camera off / leaving voice). In fullscreen, idle controls
  make tiles 85 % and the pill 30 % opaque. Tests: `voice/run.mjs` (53 checks), `voice/shell.mjs`.
  **0.9.90.8 (owner's feedback):** while I'm in voice the floating / fullscreen box stays even with no camera tile
  (`camWindow.update(n, hidden, inVoice)`: the pill with 🎙 / 📷 stays; in the card an empty box still goes away); the
  pill grows / shrinks from its corner (`.cam-pill-resize`, `transform: scale` 0.7–1.8, `camPill:scale`, ↺ resets it);
  a 🖥️ button in the pill presses the stream card's own buttons (share my screen / ⏹ stop mine / ▶ watch someone's).
  **0.9.93.3 (owner):** the one window is at least wide enough for its cameras side by side (`ROW_TILE_W` 150 px each,
  up to three, at most `ROW_MAX_SHARE` half of its container) and the fullscreen default is 26 % wide (it was 15 %:
  in fullscreen the cameras stacked in a narrow column). Test: `scripts/harness/cam-fs/run.cjs`.
  **Card NP1 (owner's C2, like Meet):** the one window starts at the video's bottom-left corner (the page: `.player-wrap`'s
  box; fullscreen: the video), `PLAYER_BAR` (72 px) above the video's bottom edge so the player's own bar stays free,
  on a computer and a tablet (phones have the camera row). A spot that was never moved is not saved (`camFloat:spot` /
  `camFloat:fsSpot` absent or `'null'`), so the default follows the video's size; double-clicking the bar brings it
  back there. Layout harness: "camera: starts at the video's bottom left, above its bar".
  **0.9.91.16 spotlight:** in the one-window (group) layout a pinned camera fills the left and the others sit in a
  4:3 strip on the right (`.cam-grid.spotlight`, `--cam-others`, set in `cam-float.ts` `markTiles`); the old
  "full width + span 2" pushed the others out of a sized window. The share menu lifts the side panel over the
  floating cameras while it is open (`.side:has(.live-menu:not([hidden]))`).
  **0.9.90.6 pre-join check (`ui/voice-check.ts`):** "Sese katıl" (not in the shell) opens a
  small window: camera preview (only when "Kameram açık girsin" is ticked), my voice level, mic / camera / speaker
  selects (`enumerateDevices`; speaker only where `setSinkId` exists), "Mikrofonum kapalı girsin", "Kameram açık
  girsin", "Sese katılmadan önce bunu sor". Saved in `opt:micDevice` / `opt:camDevice` / `opt:speakerDevice` /
  `opt:joinMuted` / `opt:joinCam` / `opt:voiceCheck` (`skip`). P2pVoice / VoiceClient get `getMic` / `getCam` that
  open the chosen device (exact id, falls back to the default when it is gone); voices play through `applySpeaker`.
  "🎛 Mikrofon ve kamera seç" on myself opens the same window (settings mode); in voice a new mic switches in place
  (`P2pVoice.switchMic`: `replaceTrack` on every connection, nobody sees me leave), a new camera re-opens it.
  `joinVoice(mic, quiet)` hides that ExtVoice's `join` takes `(quiet, mic)` (calling `join(mic)` on the film page
  turned a muted mic back on after a reconnect, fixed here). Tests: `voice/run.mjs` 58 checks.
  **0.9.91.15 film page devices (owner: "my mic is quiet on the film page"):** device ids are per origin, so picks are
  also saved by label (`opt:micName` / `opt:camName` / `opt:speakerName`, `devicePicks()`; older id-only picks get
  their names once on the site, `rememberDeviceNames`); ExtVoice posts `{op:'pick', devices}` before each join and on
  a change; offscreen opens the device with that label (exact id, default if gone), moves the mic in place
  (`switchMic`) and sets the speaker. "🎛" on myself in the shell asks offscreen for `{op:'devices'}` (labels only) and
  opens `shellDeviceCheck`. `mic.html` asks microphone + camera in one prompt (audio only if that fails), and the
  site's pre-join check asks both at once when both are still unanswered and the camera is wanted. Test:
  `voice/shell.mjs` (🎛 lists the extension's mics, voice survives a switch).
  **On the film page (0.9.65):** cameras run in offscreen (`voice` `cam`; without permission `mic.html?cam=1`);
  incoming streams + my own preview (`me`) reach the site in the overlay through a **local WebRTC bridge**
  (`{op:'loop'}`: offscreen makes the offer, `cams` = mid → member; the bridge restarts on every change; no `data` = no
  camera). Old extensions don't send `caps.cam` → button hidden. My own voice level: a bar under 🎙 (`LevelMeter`
  "me"; in the extension offscreen `me`). At most `CAM_MAX` (4) cameras at once (server `cam_full`). **Limits always
  visible** (user's request): "Seste 3/6 · 📷 1/4" in the card, yellow at the last slot, red when full; a full button is
  dimmed (`.is-full`) and pressing it explains why (peer-to-peer, upload speed) via `flashHint`. Tests:
  `voice/run.mjs` (camera frames are counted), e2e `voice.mjs` (cam_full).
- **Cameras on phones (card CAM1, the owner's test with a friend):** a second capture of the camera while the voice
  camera is live froze or blacked out what the others saw on phones, so the pre-join / 🎛 window shows the live camera
  (`voiceCheck({ live })`) and a pick switches it in place. `P2pVoice.switchCam(open)`: the new track goes into every
  connection with `replaceTrack` (no renegotiation, the camera never goes off for the others; a phone that can't open
  two cameras gets the old one closed first), while it runs `{t:'voice', …, switching: true}` (optional field,
  `MemberVoice.switching`, the server keeps it only with `cam`) shows "Camera changing…" over that picture; a camera
  track the system ended is reopened (`watchCam`, ≤ every 5 s). `ui/cam-watch.ts` watches every camera picture (tiles,
  the phone's row and sheet): replays a paused one, on `unmute` and `visibilitychange` at once, "Waiting for the
  picture…" (`data-cam-note`, CSS `::after`) after 2 s without a frame, a fresh `srcObject` after 5 s. Only my own
  front-camera preview is a mirror (`html[data-swm-cam-facing]` from the track's `facingMode`). The phone's faces strip
  has 🔄 `#strip-flip` (camera on, 2+ cameras; also "Switch camera" in my person menu) cycling the device's cameras.
  Test Lab: `voice.switchCam`, `voice.camPause` (🎬), "My camera" / "Camera pictures" (📊). Harness
  `scripts/harness/cam-phone/run.cjs` (computer + iPhone 13, in CI).
- **Streaming / screen share (0.9.64, `packages/shared/src/live-p2p.ts`, site `ui/live.ts`, plan + decisions
  `docs/internal/yayin.md`):** bottom part of the "Birlikte" card (`#live-card`): "🖥️ Ekranını paylaş"
  (`getDisplayMedia`, 720p/30, tab audio) / "📹 Kamerayla yayın" (720p); one stream per room (`live_busy`), at most
  `LIVE_MAX_VIEWERS` (4, `live_full`) with "▶ Yayını izle". Member `live: kind`, `watching`; `{t:'live'}`,
  `{t:'live-watch'}`, `{t:'live-signal'}` (the server relays only between the streamer and their viewers;
  `RTC_MESSAGE_MAX` for large offers). One-way: the streamer offers to each viewer (sendonly, ≤2.5 Mbit/s screen,
  `contentHint`), viewers only receive (no permission prompt). When the streamer leaves/stops, viewers are released.
  The picture is in a video corner `#live-window` (⤢ enlarge = covers the video; an island in the shell). No starting a
  stream in the shell, only watching. NO film re-broadcasting (user's decision; no `tabCapture` in the extension).
  Tests: e2e `live.mjs`, real `voice/live.mjs` (camera and screen; headless Chrome needs
  `--auto-select-desktop-capture-source`). **Stage 2 (0.9.66):** screen quality `text` (sharp text: 15 fps, `detail`,
  `maintain-resolution`) / `motion` (smooth: 30 fps, `maintain-framerate`), changeable while streaming
  (`localStorage` `opt:liveQuality`); the host stops a stream with `{t:'live-stop'}` (streamer gets `live_stopped`);
  with `settings.liveHostOnly` others cannot start one, and turning it on ends a running stream.
  **0.9.90.8 (owner):** no separate "📹 Kamerayla yayın" any more (voice already has cameras); the share menu has
  "📷 Kameram da köşede görünsün" (`opt:liveCam`) instead: `ui/live-compose.ts` draws every screen frame with my newest
  camera frame in the bottom-right corner (MediaStreamTrackProcessor → OffscreenCanvas → MediaStreamTrackGenerator, so
  the screen's frames drive it and a background tab doesn't freeze it; hidden where unsupported); quality changes go
  to the real screen track; the browser's "Stop sharing" ends the composed track too. `LiveKind` 'camera' stays in the
  protocol for old clients. Test: `voice/live.mjs` (19 checks).
  **0.9.91.15 free stream window (owner: "free like the cameras", `ui/live-float.ts`):** (LAYOUT1: the in-video default is the top right, `y: 0.04`, clear of the player's own bar; at least 150 px wide on a phone, `PHONE_MIN_WIDTH`, 200 elsewhere) `#live-window` sits in the
  video (default) or floats on the page (⧉ / ⤓, `opt:livePlace`; not under 700 px); drag anywhere, corner grip resizes
  (16:9 kept), double click resets; places as shares of the container in `liveSpot:video` / `liveSpot:free` /
  `liveSpot:fs`; in fullscreen (real or `.fake-fs`) it always lives inside the video; ⤢ covers the video (a free window
  comes back into it). A free window is `data-island` (shown over the hole on the film page). 🙈 hides my own preview
  (`opt:liveSelfHidden`; viewers still get it), "👁 Yayınımı göster" in the stream card brings it back. Test:
  `voice/live.mjs` (30 checks: drag, pop out, resize, remembered after a reload, inside fullscreen, hide my own).
  **Card R1 (0.9.97.8, owner's test round 1: "a game throws people out of the room / the stream, opens only on the
  second press"; root cause: every deploy restarts the room's object and closes every room connection, the owner tested
  while ~10 versions went live):** like voice since 0.9.91.16, a welcome with my old member id keeps the stream
  (`live.ts` `welcome` → `LiveP2p.resume()` re-announces `live` / `live-watch`; the direct connections were never
  touched); `LiveP2p.sync` keeps a peer whose member is missing for `LIVE_RETURN_MS` (15 s), or listed but not (yet)
  flagged for `LIVE_FLAG_MS` (4 s), and a viewer whose streamer came back asks to watch again (the server let go of
  the viewers when the streamer's connection closed). A reload keeps the member id too, but the page is new: `watch()` (a
  fresh watch, never `resume()`) sends the streamer `{ask: true}`, and a connection older than `ASK_FRESH_MS` (3 s) is
  replaced by a new offer (BH2). `games/stage.ts`: a table asked for while the room connection was
  down (`send` returned false) or whose "opened" was lost goes out / opens after the next welcome (`rejoined`,
  `WANTED_MS` 20 s). Tests: e2e `gamestream.mjs`, harness `scripts/harness/game-drop/run.cjs` (7 checks; 4 fail on
  0.9.97.6).
- **PWA (0.9.70):** `public/manifest.webmanifest` + `icons/` (generated by `make-icons.mjs`: 192, 512, maskable,
  apple-touch) + `public/sw.js`: does NOT cache files (nobody should enter a room with old code), only shows
  `offline.html` when a page load has no internet. Registered at the end of `app.ts`, only in the top window (not in
  the shell); app.ts may load after "load", so `readyState` is checked. If you change the SW, bump the `CACHE` name.
- **"Back to the room" notice:** in the shell, "🏠 Odaya dön" → `{t:'home'}` → the server sends `{t:'home', by}` to
  everyone except the sender (once per 30 s per person, `homeLimit`); people on the film get a "join them?" card over
  the video (`askHome`, 20 s; at most once a minute from the same person).
- **Keyboard:** 1–8 that page's emojis/custom emojis, Enter message, P pin, V push-to-talk (when "Bas-konuş" is chosen
  in voice chat, the mic is on while held; `opt:ptt`; key-up also arrives from the film page: embed `key` `up`) (site
  `reactions.ts` + `room.ts`, fullscreen `fullscreen.ts`). On the film page (shell) keys are captured in the capture
  phase and forwarded to the site, never shown to the film site: players seek with digits (3 = 30%), otherwise
  sending an emoji would seek everyone.
- **Host modes (`settings.hostOnly` / `lockQueue`):** the server answers `not_host` to a non-host's play/pause/seek/
  rate/load/jump (hostOnly) or enqueue/dequeue/move (lockQueue); `next` is open to everyone (auto-advance when the
  video ends). On `not_host` the client returns the player to the room state (site `engine.receive(roomState)`; in the
  extension the background re-sends state + a note). The `settings` message is partial: only present fields change.
- **Voting:** `{t:'vote', id, up}`; voters' persistent keys stay on the server (`voters`; clients only get
  `QueueItem.votes`); the queue is ordered by votes (ties by insertion order). My votes: site `localStorage` `myVotes`.
- **Scheduled start / "Film saati" (`settings.startsAt`, server time):** the single alarm checks this too; when the
  time comes the plan is cleared and a paused video plays as `SYSTEM`. Countdown banner on the site (says when no video
  is picked yet). 0.9.87: Settings → Film saati has quick picks (15 / 30 / 60 min rounded to 5 min, tonight 21:00), a
  card with the planned time + time left, "🔗 Saatli daveti kopyala" (slogan + time + link) and clear.
- **Sync test (`media.kind === 'test'`):** no file; `players/test.ts` draws a 12 s counter on a canvas and behaves like
  a `<video>`. While playing, a "you're in the same spot (≈N ms apart)" badge.
- **Feedback (card 9, 0.9.96, Design `docs/internal/design/feedback-and-thanks.md` §1, security review 3 R3-7):**
  `packages/shared/src/feedback.ts` (`validateFeedback`, `neutralise`, `buildIssue`, limits) is shared by the form and
  the Worker. `POST /api/feedback` (`apps/server/src/feedback.ts`): our own `Origin` required, body read as a stream
  ≤ `FEEDBACK_BODY_MAX` (8 KB), `FEEDBACK_LIMIT` burst binding, then the `FeedbackGate` object (binding `FEEDBACK`,
  migration `v7`, one instance `gate`: `FEEDBACK_PER_IP_HOUR` 3 per IP hash, `FEEDBACK_PER_DAY` 50 per UTC day) →
  `{error:'off'}` without the `FEEDBACK_GITHUB_TOKEN` secret (fine-grained, Issues: write on this repository only;
  only the deploy step gets it, uploaded with `--secrets-file` like the YouTube key), else a GitHub issue labelled
  `feedback` + `feedback:<type>`. Never stored: IP, room id, names, chat. The dialog `ui/feedback.ts` + `feedback.css` is
  a lazy chunk with its own `TEXT` (EN / TR), opened by ⋯ More (`more.feedback`, before Help), `#profile-feedback` and
  the Help page's `/#feedback` (home opens it); draft in `sessionStorage` `feedbackDraft`; "attach technical details"
  unticked, its exact lines shown (`technicalInfo`: site / extension version, browser · OS · window, transport,
  `diagLast` from `/connection`). Privacy policy `#feedback`. Tests: unit `feedback.test.ts`, e2e `feedback.mjs` (live:
  refusals only), harness `scripts/harness/feedback/run.cjs`.
- **The site's address (card R3-3, `docs/internal/custom-domain.md`):** one value, `site.config.json` (`origin` +
  `aliases`), read by `scripts/site-config.mjs`; the extension build (`SITE_URL`, `isSiteOrigin`, `sitePatterns`,
  `homepage_url`, site matches), the site build (`%SITE_ORIGIN%` og:image, `__SITE__` in `site.ts`, the generated
  `/domain.js` for the static pages), CI's live checks and the monitor follow it. Never write the address anywhere else
  (`check-domain.mjs` fails). On an alias (not the shell) `main.ts` → lazy `domain-move.ts` carries the browser's
  saves once in `#handoff=` (accepted only with an alias referrer, move keys merged, other keys fill empty ones) and
  moves to the main address; harness `domain-move`. Moving to an own domain = the steps in that doc.
- **Saved rooms (`saved-rooms.ts`):** "Oda oluştur" on the home page → one-time / saved (name required; the name is
  carried to the room via `sessionStorage` `create:<room>`, the first person in, as host, sends `settings {saved,
  name}`). The list lives in the browser (at most 20); anyone entering a saved room gets it in their list
  automatically (unless they removed it: `savedDismissed`). Each row shows how many people are inside:
  `GET /api/rooms/:id/info`. The host's ✕ also removes the room's saved status: `POST /api/rooms/:id/unsave {cid}`
  (host cid only). "My room" and recent rooms were removed.
- **Today's recap (`packages/shared/src/recap.ts`, site `ui/recap.ts`, in the Profile menu):** the server's
  `StatsTracker` counts play time (`statsTick` before the room state changes; not while the room is empty), rate,
  videos, per-person messages/reactions/pins/pauses/seeks and the busiest moment (storage `stats`; people by cid,
  recaps only carry name/avatar). Session: the first action more than `SESSION_GAP_MS` (4 h) after the last starts a
  new session and unsaved counters are cleared (watching past midnight stays one session). `{t:'recap'}` sends the
  recap from session start to now only to the requester, counters are not reset; empty → `recap_empty`. "Kaydet" on
  the last card → `{t:'recap-save'}` (replaces the same session's previous save; 20 in saved rooms, otherwise 5;
  90 days), list broadcast with `{t:'recaps'}`. The client picks random cards each time with `chooseFacts` (more with
  more data, at most 8); first the duration, last the summary + PNG. No stats card at the end of a video.
- **Simpler room (0.9.93.13, card 6, owner's picks C + D):** `ui/room-more.ts` `roomMoreItems` = the room's "⋯ More"
  list (games (phones), film time (host), save, recap, shortcuts (computer), sync test (dimmed while something plays),
  rules; R9, 0.9.97.16: nothing else, Help · Feedback · Privacy are one small line at the foot of the profile menu,
  `.profile-links`, and the profile has no ⟳ Reconnect),
  shown by the computer's `#room-more` menu and the phone's ⋯ sheet in the same order; `settingsDialog.open(section)`
  opens Settings at that category (⚙️ = `view`, ⋯ → Save = `room`), the category list always beside it (card SIMP1
  ended card 6b's "solo" sections); ⋯ → Games goes through the invisible `#more-game` anchor (games
  `extraButtons`). `.room.fresh` until the first item: on a computer no queue / people tabs or sync-test button (Share stays since
  0.9.96.23: the owner missed screen share in an empty room; it needs no video). Test: `scripts/harness/room-more/run.cjs`.
- **Tabs:** 💬 Chat, 🎵 Queue, 👥 People (equal widths); 👤 Profile is not a tab: the button at the top right (my
  avatar; ⚙️ Settings sits right of it, the only settings entry point since 0.9.87) opens a menu below it (`.profile-pop`; closes on outside click/Esc;
  in the shell the hole closes while it is open). Everyone starts on 💬 Chat; a reload in the same tab keeps the tab
  (`sessionStorage` `tab:<room>`).
- **Room UI 0.9.80 (user chose 1B 2C 3B 4A 5A, design page `oda-arayuzu`):**
  - **Chat bubbles** (`ui/chat.ts`): mine on the right in the accent color (no avatar), others on the left with avatar
    + name; consecutive messages from the same person within 3 min merge (`.cont`); room actions centered between thin
    lines; send arrow (`#chat-send`) inside the box.
  - **⚙️ Settings dialog** (`ui/settings-dialog.ts`, `#settings-dialog`): not a tab; a centered dialog with its
    categories on the left, the same order on every device (card SIMP1, 0.9.97.107): 👤 Me (`me`: open the profile menu,
    📲 Move to another device) · 🖥️ My screen (`view`) · 🏠 Room (`room`: the room's name and people count
    `#settings-room-name` / `#settings-room-count`, filled by `drawRoomTitle`; save / rename / unsave, the old `save`
    section; `open('save')` still lands here) · 👑 Room rules (`rules`) · ⏰ Film time (`schedule`, host only) · 🔊 Sound
    & camera (`sound`: sounds, volume, ducking on the film page, 🎛 microphone and camera = `voice.devices()`, "Check
    before joining voice" = `opt:voiceCheck`, the "Who sees what (privacy)" link) · ℹ️ About (`about`: the version read
    from `.footer-version`, Help, Feedback, Privacy, Terms, Extension, Thanks, Licenses). `createSettingsDialog`'s
    `onShow(section)` fills Room / About / the voice switch when shown. The window is as tall as its longest category
    (`height: auto`, ≥ 540 px, ≤ the window) so none scrolls on a computer; on ≤ 640 px the categories are a wrapping
    row of chips; a phone shows it full screen. Room rules come in two groups, ▶️ Playback (wait, host-only, lock
    queue, countdown) / 🏠 In the room (knock, emojis, streams, clear emojis, emoji rate): `.rules-groups` chips set
    `.rules-box[data-show]`, rows carry `data-group` (Planner's pick C: nine switches scrolled on a phone). Rows are title + short
    description + toggle (`.set-row`, `input.switch`, `role=switch`). Non-hosts don't see the rule toggles; they see
    `#rules-summary` (✓/– summary, "X sets the rules"). The dialog is always in the page (hidden): selectors for open
    dialogs are `.dialog-backdrop:not([hidden])` (closes the hole in the shell, swallows shortcuts). Test Lab: 🖥️ Screen
    → "Settings: <category>" (`settings.<section>`). Harness `scripts/harness/settings/run.cjs` (CI site job): phone,
    tablet, laptop, desktop × EN, TR.
  - **Under the video** (`ui/reactions.ts` `.tray-bar`): "😀 Tepki ▴" tray (Ready-made / Mine, 8 slots, ‹ 1/3 ›,
    🖼️ Add; pressing inside doesn't close it, outside/Esc closes) + the three most recent emojis next to it
    (`localStorage` `recentReactions`); on the right labelled buttons 🎮 Game · 📌 Pin · 🔄 Sync · ⏩ 1× (opens
    `#speed-pop`: −, rate list, +) · ⇥ · ⛶; icons only at ≤1180 px. Fullscreen and Shorts bars stay flat (8 slots +
    ▲▼). In the shell, popups opening over the hole (`[data-island]`: tray, speed, game menu) are islands; they have no
    opening animation (measurements shifted).
  - **Top bar** (`html.in-room`): "Bağlı" text, ⟳, 🎨 and TR/EN hidden in the room; the connection is the dot of the
    room name (`.room-title-dot` green/yellow/red, short text next to it when not connected, click reconnects; on
    phones only the dot). Language and ⟳ sit at the top of the profile menu (`.profile-actions`); ⚙️ is its own button
    right of the profile picture (`#settings-open`, 0.9.87).
  - **Together card:** "🎙 Sese katıl" + "🖥️ Paylaş ▾" on the same row (`.together-actions`); the Share menu has screen /
    camera and a limits note; while streaming the row is full width (`.live-card.active`), quality only for my own
    screen stream. People who can't share (shell, phones without screen sharing) don't see this part while idle.
  - Fixes: an empty pin strip takes no space (`.pin-strip.empty` hidden), the "same spot" badge is one line.
- **Who-paused notice (0.9.68):** when someone else plays/pauses/seeks/changes rate, top-left of the video for 2.6 s:
  avatar + "Ali durdurdu" (`#action-notice`, an island inside the hole; not for my own actions or `SYSTEM`); can be
  turned off in Settings (`opt:actionNotice`).
- **Room layout "Cinema Rail" (0.9.76, user's choice; design canvas A):** the top bar shows the connection dot
  (`.room-title`; card SIMP1: the room name and "· N people" stay in the page for screen readers and harnesses but are
  not shown, they live in Settings → Room; the room has no footer line, `html.in-room .footer` hidden, its links and
  the version in Settings → About; the join screen hides the footer too and puts privacy / terms / help behind the join
  card's ⓘ, `.join-info`) and "🔗 Davet et" (`#invite-btn`: copies the link,
  share sheet on phones; `prompt` if the clipboard is blocked); the right rail (320 px) has the "Birlikte" card
  (`#together`: title + "Seste 2/6 · 📷 0/4", avatars and names of people in the room (at most 8, "+N"; one person's two
  tabs count once), voice buttons (`#voice-card` is now a row inside the card), below it the stream section
  `#live-card`) and the tabs. The old invite card is gone. On phones the room name and "Davet et" text are hidden in
  the top bar (only 🔗), ⟳ hidden while connected. If the room changes, update the `store/src/room.html` copy too.
  **0.9.91 (owner):** on wide screens the right rail ends exactly with the video card (`.side` is 0 tall for the grid
  row and stretches to 100 % of it; the tabs card takes what the Together card leaves) instead of hanging below it.
  Voice / camera / stream buttons use line icons (`ui/icons.ts`, drawn in-house, `setIcon`), red when off.
- **Home page (card 15b, 0.9.96.12, the owner's 1A "Light beam" · 2A · 3A; Design's notes
  `docs/internal/design/home-15b.md`):** `home.ts` + `home.css` (a lazy chunk; its texts are `TEXT` in `home.ts`, no
  `home.*` keys in `i18n.ts`). First screen (`.hm-first`, the window minus the top bar, `--hm-top`): text (`.hm-text`:
  pill, the owner's slogan with its second line in gold, one line, "Create room" (`#start-form`, gold) + "Join with a
  code" (`#join-toggle` → `#join`), the save box (`#start-save` → `#create-name`, `create:<room>`), the continue line
  `#continue` (`lastRoom`, "↺ Continue: name · N inside · Open")) and the art (`.hm-art`, inline SVG: the mascot
  (Stub since card NP3, in the shown theme's costume since card 15d, `placeMascot`; `createMascot({ mood: 'happy', torch: true })` until it loads) shines on a laptop, a tablet and a phone showing the same moment (card 15c) with a sync pill, an opaque chat bubble and three random themed avatar faces (a phone hides the art's words); `aria-hidden`; the bar
  runs 6 s, the beam breathes, nothing moves with reduced motion), the three feature cards (`.hm-feat`) at its foot.
  Then `#how`: three steps, the extension card, saved rooms (`#recent`), a Help line. No video link box (3A) and no theme strip; 🎨 in the top bar (back since card 15d). Computer / sideways tablet: two columns (slogan 64 px); upright tablet: one centred
  column with the art on top (72 px); phone (`html.phone`): art on top, full-width buttons, compact tiles (40 px). A
  scene theme gets a quiet zone behind the text column (THEME1: `.hm-text::before`, a blurred block of `--hero-scrim`;
  the second section's heading and help line get the same block). The footer shows the site version (`index.html`
  `.footer-version`, bump on every release). Plain themes (gece/matinee/okyanus/gunbatimi/neon) have one layered `--art`
  (gradient + star dust or a pattern; THEME1 removed the corner glows and the drifting `--aura`). **Theme tokens
  (THEME1, Design's `docs/internal/design/themes-2.md`):** `--field-border` (inputs, selects, the switch's off edge;
  `--muted` 62 % into `--surface`, ≥ 3:1) and `--hero-scrim` (`--bg` at 88 % on the six scene themes, `none` on plain
  ones) are worked out in `styles.css` from each theme's own colours; my chat bubble and primary buttons use
  `--accent-btn` (Gece `#6a4cf2`, white text ≥ 4.5:1). **The home follows the theme (card NP1, owner's 3A):**
  `home.css` `html.in-home` sets `--hm-accent` / `--hm-accent-fill` / `--hm-accent-ink` to `--accent` /
  `--accent-btn` / `--on-accent` (slogan, pill, "Create room", the step numbers, the help link, the art's progress bars
  and chat bubble); Night (`gece`, or no theme) keeps the brand gold; its soft text is `--hm-soft` (from `--text` and
  `--muted`); the home's thin edges and fills are `--text` mixed with transparent (not fixed white), so they show on a
  light theme too. **Themes (card NP1, owner's 2B):** ids in `@swm/shared/themes` (`THEME_IDS`, ten: gece, matinee,
  okyanus, gunbatimi, neon, lokum, binbirgece, sinema, acikhava, tren; `resolveTheme` turns a removed one
  (`REMOVED_THEMES`: uzay, siber, opera, gemi) or anything unknown into Night; unit test `themes.test.ts`); swatches
  and pictures in `themes.ts`. **Matinee** (`matinee`, Design's `docs/internal/design/themes-2/ready/themes.css`) is the
  only light theme (`color-scheme: light`, its own `--field-border` / `--danger` / `--ok` / `--warn`). **MATINEE2** (owner:
  "too bright", "the black video's place is a harsh jump"; Design's `themes-2/matinee2/`): calmer paper (no near-white
  surface) and a framed screen: the `.theater` card is a mat (`--mat`), `.player-wrap` a 2 px `--bezel` frame with soft
  rings and a warm umber screen (`--screen` / `--screen-lit`, an inset vignette under the video), `#player` transparent;
  fullscreen stays black; on a phone only a bottom frame line (the video is edge to edge) and in cinema mode no mat. All
  these rules are scoped `:root[data-theme='matinee']:not(.shell-film)` so they never paint over the film page's hole
  (embed harness with `THEME=matinee`). The empty room's words on the screen get a dark palette of their own
  (`.player-wrap > .empty`; the dimmed `.alone` sync test at 70 % there, AA), the games hall inside the rail takes `--text` back (the rail's
  text is white), and the hall's "New" badge keeps the bright amber. Ocean Liner (`gemi`) is gone (scene, mascot,
  i18n). Sunset's sun glow sits at 82 % (it was behind "How it works"). Test Lab `themes.next`, `themes.<id>` (this page
  only, `applyTheme(id, { remember: false })`) and a status line (`registerThemeLab`). Harness
  `scripts/harness/contrast/run.cjs` (CI, `site` job): every theme's text against the real pixels behind it (WCAG AA,
  4.5:1 or 3:1 for large text; the worst 15 % of the background counts; one run per line of a wrapped text) on home and
  the room at 1366 and 1920, help, join, settings and the games hall at 1366, and the plain themes on a Pixel 7;
  `REPORT_ONLY=1` for audits. **Font (card FONT1, Design's
  `docs/internal/design/fonts.md`):** `fonts.ts` (`FONTS` device / sidelit (Bricolage + Figtree) / poster (Fraunces +
  Manrope) / polished (Bricolage + Plus Jakarta Sans) / readable / rounded / easy, `DEFAULT_FONT` sidelit (card NP1,
  owner's pick A; a page without `data-font` asks for no text font, so the device-font choice downloads nothing), `localStorage` `font`, `applyFont` sets `data-font` on `<html>` (`device` too) from `app.ts` before the
  page is drawn, `fontchange` event); styles.css has one `@font-face` pair per family (latin + latin-ext by
  `unicode-range`, self-hosted OFL variable cuts in `public/fonts/` with their licences, also in
  `third-party-notices.txt`; never a font CDN) and maps `data-font` to `--font` / `--font-title`, so only the picked
  font is fetched. The home titles use `--font-title` (`'Sidelit Title'`, the variable Bricolage Grotesque: the
  wordmark cut lacks ğ ş ı İ). Setting: ⚙️ My screen `#opt-font` (`ui/settings.ts`); Test Lab `fonts.next`,
  `fonts.<id>` (this page only) and a status line. Saved with `save()`, so the extension's overlay gets it too. Harness
  `scripts/harness/fonts/run.cjs` (CI, `site` job). Card 15e (0.9.97.33): one soft cone, a tidy device row, equal margins (see the Live line). **Stub (card NP3, Design's MASCOT3 `docs/internal/design/mascot-3.md`):** the mascot is
  Stub, a cinema ticket with the logo's ink eyes on the D1 light, drawn in `packages/shared/src/logo.ts` `mascotTree`
  (moods default / happy / watching / waiting / wow / sorry, `small` = the ≤ 32 px cut, `torch` = the usher's torch in
  the right hand); `mascot.svg` / `mascot-happy.svg` come from `make-icons.mjs`; the theme costumes are copied from
  `docs/internal/design/mascot-3/costumes/<theme>.svg` by `scripts/theme-art.mjs` (every costume holds the torch). The
  home's light starts at the torch lens (`LAMP` = 0.908 / 0.561 of the mascot box) and its cone (`beamPath`) is drawn
  from `BEAM_BACK` units behind the lens so it is wide enough for the laptop next to it. Stub also stands beside the help
  page's title and on the extension's "Start watching" card (`start-card.ts`, `createMascot`, waiting). The scenes keep
  their landmarks out of the home's text column: Moonlit Nights' tile panel, column, arch and kandil are mirrored to the
  right edge (one cypress), Drive-In's sign mast stands by the screen and its bulb chain sags low, Night Express's clock
  tower stands left of the locomotive. **Neon** is one warm neon sign on a dark brick wall (`#ff5a7a` coral, amber
  second light, faint brick courses; Design's `mascot-3/neon.css`). The games' Stub art and texts are Game Studio's. Harness
  `scripts/harness/home/run.cjs` (5 sizes × EN + TR).
- **Bigger room on a computer (0.9.92.7, owner: "too much empty space"):** above 860 px wide (not the film page,
  Shorts view, TV or phone) `main` has no 1280 px cap; the room's grid is `minmax(0, max(--stage-w, 560px))` +
  `--side-w` (`clamp(300px, 21vw, 400px)`), centred, where `--stage-w = (100dvh − 252px) × 16 / 9 + 28px`: the video's
  card is as wide as the height allows (1920×1080: 1422 px wide video, was 878). The join card (name + avatar) is
  bigger above 700 px (580 px card, 84 px avatar, 58 px field).
- **One remote (0.9.92.8, owner's picks 2A / 3A / 4A changed on https://claude.ai/artifact/LP8aB9RzKFZh3N6sAkEDvG):**
  on a computer (not the film page, phones or the Shorts view) the toolbar under the video is hidden whenever the
  dock is shown in the window (`.dock-window`); the dock is the only remote: 💬 (only in fullscreen or with the side
  panel hidden), 😀, 📌, 🎮 `#dock-game` (an `extraButtons` of the games stage, its hall opens left of the rail), 🎙 / 📷,
  🖥️ only while someone streams, ⋯ `#dock-more` (`#dock-more-pop`: speed chips, sync, next, side panel, "keep the
  controls open"), ⛶. `#dock-speed` / `#dock-skip` are hidden there. YouTube (`.theater.yt-rail`, set when the player is
  YouTube): the rail is a 58 px column beside the video, never on it: `.player` / `.fs-catcher` end at its edge while
  it shows (a mouse move, hovering it, an open window of it, a paused video, always on touch screens) and fill the
  width when it rests (`.dock-idle`), in the window and in fullscreen. **0.9.93 (owner: "not on every move; open when
  the mouse comes to the right side, close at once when it goes"):** on a computer on the site (not the film page, not
  touch) the dock waits for the edge (`edgeMode`, `.rail-edge-mode`): `setNear` opens it when the mouse is within
  `EDGE_IN` (72 px) inside / `EDGE_OUT` (28 px) outside the video's right edge (document `mousemove`) or on
  `#rail-edge` (a see-through strip over the right edge, clear of YouTube's own top / bottom buttons, only while the
  dock rests: a YouTube frame keeps its mouse moves), and closes it `HIDE_MS` (250 ms) after the mouse leaves (the
  dock, the edge, the video) unless one of its windows is open; a new video shows it for 2.5 s. Since 0.9.93.2 a rail
  window (emojis, ⋯, speed, the games hall; not the message box while it holds text) closes `LEAVE_MS` (450 ms) after
  the mouse leaves the rail, and when the page loses focus to a frame inside the theater (a click on the YouTube video
  never reaches the page), by the same synthetic outside `pointerdown` the windows listen for (`closeRailWindows`); in
  0.9.93 an open window kept the rail out in fullscreen (owner). **0.9.93.5 (owner's screenshot: the rail stayed
  in fullscreen while YouTube's bar had gone):** a rail button keeps the focus after a click, and any key press (Esc
  closing its window, a shortcut) makes it `:focus-visible`, which `railBusy` counted as "busy" for good. Now the rail
  lets go of the focus when the mouse leaves it or its windows close (`letGoOfRail`; not the message box while it holds
  text), and focus only holds it for keyboard users (`tabbing`: a Tab press, cleared by a mouse move / press). **0.9.93.7 (owner: "the rail never goes away in YouTube fullscreen"):** a touch-screen laptop can report its primary
  pointer as coarse; `isTouch()` then made the room treat it as a tablet: no edge mode, and the "rail stays on touch
  screens" CSS plus `dock.contains(activeElement)` in the non-edge `dockBusy` held the rail out for good after any
  pressed rail button (🎙 / 📷 outside voice). Now `device.ts` `hasMouse()` (`(any-pointer: fine) and (any-hover:
  hover)`, `<html class="has-mouse">`) keeps the edge mode and the resting rail wherever a mouse exists (the touch-only
  rules are `html.is-touch:not(.has-mouse)`), a button's focus holds the rail only for keyboard users in every mode, and
  `hoveringControls` is double-checked with `dock.matches(':hover')`. Tests: `yt-room` (a simulated touch-screen
  laptop: fails on 0.9.93.6), `embed/run.mjs` (film page: after a focused rail button the dock still rests). "Keep the controls
  open" (`opt:railPin`, `.rail-pin`; ⋯ `#rail-pin` and Settings → My screen `#opt-railpin`, `RAIL_PIN_EVENT` keeps
  both in step) never lets it rest. "Hide the controls" (`opt:railOff`, `#rail-show`) is gone and no longer read. Since 0.9.93.9 (card 2,
  "one rail everywhere") every docked theater is `side-rail`: video files and the sync test use the same column, the
  empty room gets it too (`rail-bare`, always out, 📌 / ⛶ dimmed) and the film page has no toolbar either: its rail is
  a column beside the film, the hole being `#player` left of it (`reportLayout`). **Card 2b (0.9.93.17, owner's B):** the
  film page's rail opens and closes at the edge too: the resting film leaves a 14 px gutter of our overlay where `#rail-edge`
  hears the mouse, it opens after `OPEN_MS` (140 ms, a mouse passing by doesn't make the film jump) and goes `HIDE_MS`
  (450 ms) after the mouse leaves; the film narrows / widens with the player's `right` transition (`reportLayout` on a
  `#player` ResizeObserver + `transitionend`). The overlay often never hears the mouse leave (it jumps into the film's
  hole), so a move reported by the film's frames (`poke`) counts as leaving (`leftRail`, not within 300 ms of reaching
  the edge), the shell's rest rules ignore a stale `:hover`, and Chrome's replay of the last position after the film
  widens is ignored (`staleXY`). Embed harness: run it under `xvfb-run -a` (headful) for the real mouse; headless pins the
  rail and skips only those checks. **Card R5:** the extension's film frame also says when the mouse enters / leaves the last
  `FILM_EDGE` (40 px) of the synced video (`activity` with `edge`, at once on the change), which opens the rail the same
  way (`poke(edge)` → `setNear`, after `OPEN_MS`); extensions without it fall back to the gutter. 6 / 7 stay as they are (the owner accepts that risk). **0.9.92.9 (5B,
  YouTube only, not the film page / fullscreen notes / Shorts):** (1B, emojis rising from the sender's face, was undone
  in 0.9.93 and is back since 0.9.93.10: card 2a, the owner's D, nothing of ours over the YouTube player by itself;
  the countdown is a note; `#rail-edge` sits in a 14 px gutter beside the resting player; fullscreen on a computer had a
  column `#fs-side` for notes, cameras and messages (cards 2a / 6d / R3) until card R15 (0.9.97.26, owner: "never open a
  menu on the side"): since then YouTube fullscreen is like other players: messages over the video at the top right,
  left of the rail, notes on the video, cameras floating over it.) The room's notes and cards (`#waiting-banner`, `#sync-badge`, `#game-invite`, `.end-card`) move out of
  `.player-wrap` into `.yt-notices` above the chat's message box (`.yt-notices-top` above the video with the side
  panel hidden; `placeNotices`, MutationObservers); fullscreen, video files and film pages keep them on the video.
  "Who paused" (`#action-notice`) is hidden with YouTube outside fullscreen (it is in the chat's activity). Test:
  `scripts/harness/yt-room/run.cjs` (13 checks). **🔍 Search** (`.media-search`, the first submit
  button, so Enter keeps working): words search YouTube, a link goes to the queue, an empty box gets the focus.
  **Phones (0.9.92.8):** turning sideways no longer opens fullscreen by itself (`fullscreen.ts` skips `rotateFs` on
  `isPhoneLayout`); sideways without fullscreen the room shows the video left and `.ph-turn` right (one big ⛶ "Watch
  fullscreen", or "hold the phone upright"; no chat / faces / cameras); a fullscreen opened there closes when the phone
  turns upright. Games live only in ⋯ (not in ＋, no `#strip-game`; a minimized table puts a dot on ⋯). ⋯ → Language
  opens a small sheet (English / Türkçe). The person sheet's small / medium / large size the phone's camera row tile
  (`ui/phone-cams.ts`, `phCamSizes`). **Can't reach the room:** the `.net-hint` card has "⟳ Try again"
  (`connection.reconnect()`) and "Test the connection" → `/connection?room=<id>` (same tab), whose first button is
  "← Back to the room" (`/r/<id>#back`) and "⟳ Run it again".
- **Invite window (0.9.93.1, owner: "an invite screen when I enter the room, with a QR code, like other watch sites";
  `ui/invite.ts`):** the room link with Copy, the share sheet (touch devices), WhatsApp (`wa.me/?text=`, the owner's
  slogan "Sana bir koltuk ayırdım 🍿" / "I saved you a seat 🍿"), a QR code (`@swm/shared/qr` `qrSvg`; since 0.9.93.11 its own
  "QR code" tab with "Copy image" (PNG to the clipboard, else a download), the WhatsApp button with WhatsApp's glyph in its
  green on the theme's plain button, YT5 batch) and "show this when I'm alone in a room" (`opt:autoInvite`, default on). It opens by itself 1.7 s after
  the first `welcome` when nobody else (TVs aside) is in the room (`maybeAutoInvite`; not after a reload, in the shell
  or on a TV; skipped if someone arrived or another dialog is open); while it is pending `html.invite-pending` holds the
  first-time tips back. 🔗 Invite (and ⋯ → Invite on a phone, which presses it) opens it; the empty room's "Copy invite
  link" still copies at once. Automated browsers (`navigator.webdriver`) only get the automatic window with
  `opt:autoInvite` = '1' (the harnesses would be covered). **0.9.93.2 (owner's picks):** rooms without a saved name
  show a friendly name worked out from the id (`room-id.ts` `friendlyRoomName`, 32 × 32 English words, the same for
  everyone; top bar, tab title, join card, saved-name placeholder); "Continue where you left off" on the home page
  (`home.ts` `renderContinue`; since 0.9.93.12 one thin line above the title, cut with an ellipsis, card 5: `lastRoom` = {id, saved name, at} written on `welcome` and `pagehide` (not on a TV);
  shown for 24 h, or longer while the room is saved; name / who is inside / what plays from `/api/rooms/:id/info`; ✕
  forgets it); the keyboard shortcuts card (`ui/shortcuts.ts`, `?` outside a text box, ⋯ and the profile menu's ⌨️,
  computers only; its rows are the room's real keys). Test: `scripts/harness/room-extras/run.cjs` (24 checks; needs a
  local video on :5300). **Paste / drop a link (0.9.93.1):** Ctrl+V outside a text
  box or a dropped link (`text/uri-list`, no files) goes through the link box's submit (`takeLink`; not in the shell,
  not while a dialog is open). **Unread in the tab title:** chat from others while `document.hidden` → "(n) title",
  cleared on `visibilitychange` (`drawTabTitle`, `baseTitle` from `renderSaved`). Test: `scripts/harness/invite/run.cjs`
  (22 checks).
- **🎞 Cinema mode (card 14, 0.9.96.7; `room.ts` `side`, CSS `html.cinema-on` in `room.css`, harness `cinema`):** T, the
  rail's ⋯ or `#side-toggle` (the old "hide the side panel") turns the page around the video dark and gives the video the
  largest 16:9 beside the rail; the top bar comes back at the top edge (`#cinema-edge`, `cinema-peek`), chat lines come in
  under the video, 💬 counts unread; per tab (`sessionStorage`), computers only (`cinemaOk`, a mouse). Leaving: T, Esc
  (when no window of ours is open) or, since the YT5 batch, the quiet `#cinema-exit` button ("✕ Leave cinema mode · T",
  bottom-left of the page, clear of the video and the chat lines); the first two times a hint says "press T or Esc to
  leave" (`cinemaHint`).
- **Hide the side panel (0.9.71):** ⇥ in the toolbar under the video (`#side-toggle`): `.room.side-hidden`, the video
  takes the full width, chat messages appear in the video corner as in fullscreen (`toasts`), unread count on the
  button; `localStorage` `opt:sideHidden`; not in the shell or on narrow screens (≤860 px).
- **Private messages (card R13, 0.9.97.14):** `{t:'chat', text, to: memberId}` (text only, no image; `cleanChatText`,
  `chatLimit` like chat). `RoomObject.sendPrivate` sends `{t:'chat', message}` with `message.to` (the recipient
  `Member`) only to the recipient's connections (their `keyOf`, not their TV) and the sender's; never into `chat`
  (the 50-message history), the recap's counters or anyone else; to myself or to someone not in the room →
  `private_gone`. Site `ui/chat.ts`: `privateTo` (a press on someone's name in a bubble, on a private bubble's label,
  or the person menu's "🔒 Message privately" via `openPrivate` in `room.ts`, `VoiceRoom.messagePrivately`) puts a
  `.chat-private` bar above the box ("🔒 Only Alex will see this", ✕ / Esc = back to the room chat); private bubbles
  are `.chat-line.private` with a dashed frame and "🔒 Private · to / from Alex"; toasts and Shorts bubbles prefix 🔒.
  Tests: e2e `private.mjs`, harness `scripts/harness/private/run.cjs` (computer + iPhone).
  R16 (0.9.97.24): sender and recipient are compared by person key (`pk` = browser + name), so another name in the
  same browser is someone else and gets the message on that name's connections only.
- **Chat images and links (0.9.88, owner's feedback):** 🖼️ `#chat-attach` in the chat box, paste or drop → `fileToChatImage`
  (≤1024 px WebP, smaller until it fits `STICKER_MAX_CHARS`; GIFs as they are without metadata) → confirm with preview
  (typed text = caption) → `{t:'chat', text, image}` (text may be empty). The server keeps `chatimg:<id>` (+ order
  `chatImages`; only images of messages still in the 50-message history, at most `MAX_CHAT_IMAGES` 12; per IP
  `imageLimit`, `CHAT_IMAGES_PER_DAY` 100 per room), broadcasts `{t:'chat-image', id, data}` before the message and
  sends the history's images one by one after `welcome`; `ChatMessage.image` is the id (placeholder until the data
  arrives). Click = full-size viewer (`.image-viewer`, a `.dialog-backdrop`). Links: `ui/links.ts` `linkify` (http(s)
  and `www.`, trailing punctuation left out, never HTML) → "Bu sayfadan ayrılıyorsun" confirm → `window.open` in a new
  tab (in the shell `open-ok` first, so the extension doesn't close it as an ad). Test: `scripts/e2e/chatimage.mjs`.
- **Rooms are independent (0.9.88, owner's decision):** my name and avatar are stored per room (`me:<room>`, newest 50
  in `meRooms`; `storage.ts` `roomIdentity` / `saveRoomIdentity`); changing them in a room never changes another room.
  `name`/`avatar` are only the default the join step of a new room offers. Shared between rooms only what the owner
  names (e.g. the custom emoji collection).
  Since R17 (0.9.97.24) each tab also keeps its own copy in `sessionStorage` `me:<room>` and reads it first: two tabs of one
  browser with two names keep their names over reloads (the shared `localStorage` copy is only the default for a new tab).
  BH7: never in the film page's overlay (`isShell`): its session storage is its own partition kept for the whole tab, so it
  held the name of the last film-page visit after a rename on the main site; the overlay reads the shared record only.
- **Room actions in chat:** always written but hidden by default; voice join / leave are room actions too (0.9.88); "Hareketleri göster (N)" at the top right of the
  chat (`localStorage` `opt:chatEvents`). The old setting was removed.
- **Disable emojis (`settings.noReactions`):** host only; the server drops reactions (host included); site
  `.no-reactions`, extension `.no-react` hide the emoji bar.
- **Emoji bar:** 8 fixed slots per page (missing ones stay empty so neighbouring buttons don't move); no "+",
  🖼️ = add GIF/photo; custom emoji pages via ▲▼ (fullscreen and Shorts; under the video it's the tray, see 0.9.80).
- **Rate:** `MAX_RATE` 4 (HTML5), YouTube at most 2 (`YOUTUBE_MAX_RATE`; the site clamps the request, the server lowers
  the rate to 2 when a YouTube video opens).
- **Default language is English** on every device, whatever the browser's language (owner, 2 Nov 2026; 0.9.92.3;
  site `i18n.ts` `detect`, extension `i18n.ts` / `mic.ts`, `offline.js`); a chosen TR / EN is remembered (`lang`).
  The UI harnesses read Turkish labels, so they pick Turkish in a fresh browser (`embed/cdp.mjs`, phone, TV).
- **Avatar choice:** on the site "Avatarı değiştir" → a large centered dialog (`openAvatarDialog`); since 0.9.87 a pick
  is only applied (and seen by others) with "Tamam" or a double-click; ✕ / Esc / outside cancel. In the extension a
  panel covering the whole window. Hover wobbles, the selected one floats (CSS; off with `prefers-reduced-motion`).
- **Avatar lists have no pages:** with many avatars in a tab the grid scrolls (no ‹ ›; the user didn't want them).
- **CI (`.github/workflows/test.yml`):** on every push/PR: typecheck, unit tests, build, local server with `wrangler
  dev` + `npm run e2e`. On push to `main` (or Actions → "Run workflow"), if tests pass, the `deploy` job: build →
  `wrangler deploy` → `scripts/wait-live.mjs` (waits until `/api/version` answers the deployed version id from the
  Worker and a Durable Object 8 times in a row: objects started on the old code restart later and close every
  connection, which made live e2e files fail on the first attempt, e.g. wait.mjs "timeout waiting d") → e2e against
  live (a file passing only on its retry prints a `::warning::`; every e2e file runs with `scripts/e2e/trace.mjs`, which
  logs each socket the server or network closed with its code and time). Keys are in repo Secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`);
  without them the job is skipped with a warning.
  **CI diet (Nov 2026; owner's testing rule: "run as many tests as needed, none on unrelated parts, never give up
  quality"):** a first `changes` job (`scripts/ci-changes.mjs`, its own test `scripts/ci-changes.test.mjs` runs
  first) diffs the change (a PR: `HEAD^1..HEAD` of its merge commit; main: from the last successful run on main, because
  the concurrency group keeps one pending run and a newer push cancels an older pending one, so a docs-only push after a
  cancelled code push must still deploy that code; a manual run or an unknown base: everything) into `code` (anything besides `docs/**` and `*.md`) and `web`
  (`apps/web/`, `packages/shared/`, `scripts/harness/`, the workflows). Docs-only: the test job and the deploy are
  skipped by their `if` (a skipped job reports success for a required check; never use `paths-ignore`, which leaves a
  required check pending for good). The browser harnesses (a11y, Test Lab) run only when `web` is true. A new push to a
  PR cancels its older run (`concurrency`, PR runs only); a push to main runs only typecheck, the name check, unit
  tests, the build and the size budget before the deploy (the PR already ran the local suite on the same code), and
  the full e2e against live after every deploy; CI's local server runs `wrangler dev --var SWM_LOCAL_UNPACED:1` (the
  Worker skips the per-IP connection limit only with that flag and a localhost address; never set it in
  `wrangler.jsonc` or live) and e2e runs with `SWM_E2E_UNPACED=1` (no waits between files: local e2e 463 s → ≈ 205 s);
  Playwright's browser is cached. **Card CI2: parallel jobs.** `checks` (typecheck, texts, unit tests, build, size
  budget; push + PR), and on a PR only `e2e` (local e2e + the help harness), `site` (the site's browser harnesses) and
  `games` + `games-more` (games quality, split in 0.9.97.106 when one job passed its 20 minutes on a slow runner:
  `games` = the sweep and the tables' harnesses, `games-more` = YouTube, tablets, Snack Bar and motion); each starts with the composite action `.github/actions/prepare` (Node, `npm ci`, build,
  `server: 'true'` = the local server, `playwright: 'true'` = axe + Playwright + Chromium). The job named `test` (the
  ruleset's required check, `if: always()`) fails when any of them failed or was cancelled; `deploy` needs it. A new
  harness goes into the job of its kind (`e2e` when it needs no `web` change, else `site` / `games`); move a step to
  another job, never make one job much longer than the others (wall-clock is the longest job).
  **Card QA1: measured timings** (`node scripts/ci-timings.mjs [--steps] [--runs 10]`: median and slowest of the last
  finished runs per job and step, PRs and main apart; needs `gh`). Before QA1 (10 Nov 2026, last 10 runs):

  | PR job | Median | Biggest steps |
  |---|---|---|
  | site | 12:10 | Theme contrast 5:27, Test Lab 2:33, a11y 0:45 |
  | games | 8:34 | games-resume + Sea Battle + how-to-play + result 5:20, games sweep 2:39 |
  | e2e | 8:14 | local e2e 7:28 (ghost.mjs alone 110 s of waiting) |
  | games-more | 5:57 | Test Lab games 2:17, tablets 1:20 |
  | lab-sweep | 5:48 | Test Lab sweep 5:09 |
  | checks | 0:34 | unit tests 0:10 |
  | **whole PR run** | **12:27** | the longest job |
  | main: deploy | 13:37 | live e2e 13:13 (paced: one address may open 60 room connections a minute) |

  Setup is not the cost: `.github/actions/prepare` takes ≈ 0:30 a job (`npm ci` 3 s with npm's cache, the build 1 s,
  the local server 2 s, Playwright with its cached browser and system libraries ≈ 14 s), so caching `node_modules` or
  the apt libraries would save seconds, not minutes. QA1 changed what runs where: the theme contrast check is its own
  `contrast` job, `game-proportions` (6.5 min, which had made `games-more` 12.5) is the `game-windows` job, and the PR's local e2e runs three files at a time (`SWM_E2E_PARALLEL=3`, only with
  `SWM_E2E_UNPACED` on localhost; the files in `run.mjs` `SOLO` that count per address or for the whole server run alone
  after the others; each file's output prints in one piece with its time). The live e2e stays one file at a time:
  its pacing is per address. **QA1 part 1b:** it runs as the `live-e2e` job, two shards on separate runners (separate
  addresses) after `deploy` (which now deploys, waits for the version and checks the domain; output `deployed`):
  `SWM_E2E_SHARD=<i>/<n>`, `scripts/e2e/shard.mjs` puts each file in the lightest shard by its measured live time
  (`LIVE_SECONDS`; a new e2e file is added there, `shard.test.mjs` fails until it is), `fail-fast: false`. The workflow's
  concurrency group runs main's runs one at a time and never cancels one, so no deploy restarts objects under a shard.
  `tag` needs `deploy` and `live-e2e`; `tag-live.mjs` `wentLive` counts a commit live when its deploy and every shard
  passed (older runs had no shards).
  **QA1 part 4 (canary rooms, `scripts/e2e/canary.mjs`):** idle room connections that say hello and send the free
  keepalive; the server never closes one by itself, so a close not ours means objects were restarted. Of the last 30
  live runs (10 Nov 2026) the drops came 2.5–5 min after the deploy (after `wait-live.mjs`'s 2 min settle) and once
  10–12 min after it. `wait-live.mjs` now also waits for 60 s with no canary drop (at most 4 min more, then a warning);
  `run.mjs` keeps 2 canaries open beside the live suite and, when a file fails, prints whether the server dropped
  canaries meanwhile ("objects were restarting"), whether its own connection got a 1006 from the server (objects
  restart one at a time, so a canary in another room can miss it: "an object restart or a crash in that object"), or
  neither ("the cause is likely the code or the test").
  **For people, not only tests:** a deploy restarts room and game objects one at a time for several minutes (seen 2.5–5
  min after it, once 10–12 min), so a real person in a room during a release can see one reconnect too (the site
  reconnects by itself). Every release deploys, so an owner's hand test right after a release may meet one; that is a
  deploy, not a bug, unless it repeats away from a release. Results are not
  changed: a file that fails its retry is red either way. `host.mjs` / `modes.mjs` timeouts name the socket's close code
  and the last messages.
  **First look (QA1 part 3, `scripts/shots.cjs`):** screenshots of every screen a change touched at laptop 1366×768,
  desktop 1920×1080, upright tablet 820×1180 and phone (iPhone 13), EN by default (`--langs en,tr`), into `.shots/<branch>`
  (git-ignored) with `index.md` (what each picture is) and `REVIEW.md` (the brief for a fresh reviewer subagent: CLAUDE.md
  §6 product rules + what to look for; it gets only that folder). Screens: `--screens list`; without `--screens` it maps
  `git diff --name-only origin/main...HEAD` through `SCREEN_FOR`. Room screens open as the first person with `?debug=1`
  (Test Lab commands `settings.<section>`, `games.open.<kind>`; the lab's 🐞 is hidden before the shot); a video file
  from `--video` (default the film server's `http://localhost:5300/video.webm`). Run it against the built site on the
  local server with the lab flag.
  **State matrix (QA1 part 2, `scripts/harness/state-matrix/run.cjs`):** every game the lab can open (`games.open.*`) in
  each placement its head offers × side panel open / closed (cinema) × no video / a file / YouTube (`via-youtube.cjs`) ×
  1366, 1920 and an upright tablet: the window and its controls whole on screen, nothing over a YouTube player, a free
  window never over the video unless dragged; once per size, every head button visibly changes something (a real mouse
  click at its middle; the placement already in use is skipped) and, on a computer, hover / drag by the head / resize
  from the corner (in proportion) / double click back home. Three states at a time; ≈ 2.5 min headful under
  `HEADFUL=1 xvfb-run -a`. W's allowed placements are notes, not failures (1366 side panel open ≤ 48 px over the
  video's edge, cinema mode's SPOT_HOME, the tablet keeping clear of the chat). Its findings so far: YouTube + cinema
  put the head below the screen (W, .114) and the room's intro took the first click on a game (W, .116). In CI as the
  `state-matrix` job (its own: `game-windows` + it would pass 10 min).
  **Tags (card TAG1):** the `tag` job runs `scripts/tag-live.mjs`: this run's version at this run's commit, and a catch-up
  for any earlier version (from `FIRST_TAGGED` 0.9.97.70) whose commit has a successful `deploy` job but no tag. Its token
  has `contents: write` + `actions: read`, never `workflows`: GitHub refuses it a tag on a commit whose
  `.github/workflows` differ from main's head, so that case (and any refused push) is a `::warning::` with the owner's
  steps (Releases → new release → tag `v<version>` → target the commit), never a red run. `ci-workflow.test.mjs` checks
  the permissions; `tag-live.test.mjs` the plan. **TAG2:** GitHub checks a new tag against main's current workflow
  files, so any release that changed `.github/workflows` lost its tag as soon as a later one changed them again (v0.9.97.74,
  .99, .103, .107; .107 even though it was main's head when it deployed, because #385 merged during its run). With the
  repository secret `TAG_TOKEN` (fine-grained, this repository only, Contents + Workflows read and write; only the tag
  step gets it) every untagged live version is pushed with it and the catch-up (`LOOKBACK` 80 first-parent commits)
  back-fills the missing ones; without it the job behaves as before.
  The repo is public since Nov 2026, so the minutes are free; the diet keeps runs short.
- **Scene top space and sides:** the scene (1600×900) is bottom-aligned and covers the screen; on wide screens the top
  is cropped and also covered by the top bar: don't put decorations above y≈200. Room content is centered, at most
  1280 px; the user mostly looks at it while watching, so main decorations (moon, castle, dragon, caravan) stay at the
  scene's edges (x < 260 or x > 1340). When the theme changes images are preloaded first (applyTheme → preload), color
  and image change together.
- **Video events in the extension:** when the source of the same `<video>` changes (`emptied`) the engine re-attaches
  (so nobody is sent back to the start); when a video shorter than 60 s ends, "next" is not requested (ad/preview).
- **Save the room (`settings.saved`):** host only; an empty room is kept for 30 days (`emptyTtl`). When the video
  changes, the old one's position + pins are written to `history` (`titleKey` → record, at most 30), also when the
  last person leaves; when the same video opens again (>15 s) it starts from there and its pins come back, the `state`
  message carries `resumed`. A video skipped with "Next" counts from the start. Turning saving off deletes `history`.
  Every room: a room that stayed empty for more than 1 min while playing opens paused where the last person left
  (`freezeIfLongEmpty`). Listed under "Kaydedilen odaların" on the home page.
- **Queue:** `settings.autoNext` (on by default); when off, the next item does not start when the video ends and the
  end card shows "▶ Sıradakini başlat" (in the extension `RoomInfo.autoNext`). Voting note in the queue panel.
