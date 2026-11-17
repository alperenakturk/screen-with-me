# Status: where we are (every session reads this first)

> Live: site and extension **0.9.97.121** (11 Nov 2026), tagged `v0.9.97.121`. What to work on: `ROADMAP.md` "Focus:
> now / next / frozen" and the Ready cards in `CARDS.md`. What each release changed: `CHANGELOG.md`. Everything
> finished that used to be in this file (old task queue, every per-release hand-test block, the Lab test round, the
> design sweep, the last full test pass, the short history) is verbatim in `docs/internal/archive/status-history.md`
> (card DOCS2). Keep this file short: a finished item leaves it in the PR that finishes it.

## Task queue (continue from the first unchecked item; keep it in sync with the session's task list)
One handoff per lane or role; each session updates only its own lines and deletes them when done.
- [ ] Lane A (handoff 17 Nov, 00:00; the session stopped: no lane A card is ready without the owner):
  - [x] SH3, VC1, VC3, MSG1 (#509, v0.9.97.157) and CR2 (#512 + #520, v0.9.97.158) live, Done lines in
    `archive/cards-done.md`; hand tests 27u–27y (+ CR2's 27z); 27w passed (archive). Branches `claude/msg1-delete-message`,
    `claude/cr2-yt-playlists`, `claude/cr2-playlist-404` merged. Tags: `v0.9.97.141` back-filled by TAG_TOKEN;
    `v0.9.97.113` (8ce4385) still missing (a tag push from a session was refused: owner's Releases page or a session
    allowed to push tags).
  - [ ] Lane A (handoff 17 Nov, 02:10; card group SRC2 → FD1 → RC1, all owner's pick A; the session stopped at its
    context limit):
    - [x] SRC2 big source picker: #527 (`claude/src2-source-picker-grid`), live in v0.9.97.160 (the first deploy's
      live e2e failed only `quota.mjs` "13th HTTP-fallback session gets 429 (11 opened, 2 refused)": the live shards
      seem to share an address; it passed in .160). Done line in `archive/cards-done.md`; hand test 27ab.
    - [x] FD1a feed drawer + pill + host rule: #529 (`claude/fd1-feed-drawer`), live in v0.9.97.160; hand test 27ac.
    - [ ] **Next: FD1b**, the Shorts view tidy of `design/feed-start.md` §5 (rail groups TALK / WATCH / ROOM with
      labels beside the icons at 1366+, ♾ "on" while a feed runs, "12 left" under ▲, toasts under the Short instead of
      over the rail, the phone Shorts bar 💬 · 😀 · ♾ · ▲ · ▼ · ⋯ with short labels, the feed pill above the Short with
      its ✕) + the `shorts-feed` shots screen. The pill (`#feed-pill`, `ui/feed-row.ts` `renderPill`) and the host
      rule exist; reuse them. Room CSS is at 38.0 / 38 kB: new Shorts-view styles need a lazy stylesheet or a trade.
    - [ ] Then RC1 (session recap, `design/session-recap.md`, owner's picks all A).
    - Note: the CR2 "YouTube Music playlists" harness once found 2 of the album's 3 tracks on the phone (Game Studio's
      CI, passed on re-run): make it deterministic when that harness is next touched.
  - [ ] Next: DM1 (Dailymotion) when the owner gives the Player ID.
  - [ ] UI2 `rail-speed` flake (games-more): "the row and the picker show 1.55×" read 1.5× right after both people's
    `rail.speed` said 1.55 (CI on #486 and #489; 1 in 13 local runs). #491 made the check wait; if it still fails, the
    room's rate itself goes back to 1.5 after a quick 1.5 → 1.55 (suspect a late `ratechange` or a `rate` from stale
    state in `sync-engine.ts`): find it and add a `sync-engine.test.ts` scenario.
  - Notes: `scripts/harness/phone/run.cjs` (not in CI) already fails on main (strip tools, games tab, sideways
    column): stale. `feed` harness failed once on #499's CI (friend's `#feed-row-pause` not visible), passed on the
    re-run and 4 local runs.
- [ ] B2 (handoff 16 Nov, 17:00; no unmerged B2 branch; nothing left in B2's lane until YTQ1):
  - [x] CI3 closed (#490); SH2 live (#488, v0.9.97.151); both cards in `archive/cards-done.md`.
  - [ ] YTQ1 day-of work, after `sidelit.app` is live: shots + screencast on the live domain, the usage table from the
    owner's JSON, `node scripts/check-yt-audit.mjs https://sidelit.app` (pack: `docs/internal/youtube-audit/`).
  - [x] Live e2e red 16 Nov (runs 43917089949, 43921749258; no tag after v0.9.97.151): not the code. Both runs show
    1006 drops on the test's own game object *and* on unrelated canary rooms at the same moments (an object restart on
    Cloudflare's side; the HTTP-fallback quota and room counters were reset with it, hence "13 opened, 0 refused").
    Run 43923095993 (105eadc, the same server code as 1caaf0e) went green on the first attempt with no drop in any
    shard: tagged v0.9.97.153. Merges may resume. If it comes back, compare the canary drop times with the deploy's
    "Wait for the new version" end before blaming a PR.
  - CI note: `games-more` was flaky on several branches on 16 Nov afternoon (a different step each run; passes locally);
    `rail-speed` got a redraw wait in #488. Game Studio owns the state-matrix drag / hover flake.
- [ ] Game Studio (17 Nov b, handoff): [x] GW4 #532 (snack-bar-3's red was the test: CI's narrow column fits
  three rows, and QA2 drops the locked stand first; card archived): merge, live check. [ ] GW5 #537 (draft, on #532; open points in its body).
  [ ] GMP2.

## Owner's hand tests (things only the owner can try; ask Claude "what should I test?" and it reads this list)
One ordered list, most useful first. Tick here (or tell the Planner and it ticks); a ticked item leaves the list.
Every item's original wording, the older per-release blocks and the ones already ticked are in
`archive/status-history.md` "Owner's hand tests" (search the ID in brackets). New releases add their lines at the end
of "C. Recent releases" with an ID; the Planner folds them into the board Artifact.

**A. One sitting with a friend** (a friend in Chrome on another computer, or your phone as the second person) [BH10]
- [ ] 1. YouTube together: join by the invite link; play, pause, seek, speed and ← / → from both sides stay in step.
- [ ] 2. Fullscreen on YouTube: the rail comes at the right edge and goes; Enter opens the message box; the friend's
  messages come in on the right, never over YouTube's bar.
- [ ] 3. Voice + camera: the mic check, then Join; hear each other without echo; M mutes; the camera window drags and
  resizes; a reload keeps voice, mic and camera as they were.
- [ ] 4. Screen share: share a tab with sound, the friend watches and hears it, and it comes back after their reload.
- [ ] 5. Knock + host: "Ask before letting people in", let the friend in; 👑 Make host: the next knock goes to them.
- [ ] 6. Private message: only the friend sees it, marked 🔒; ✕ goes back to the room chat.
- [ ] 7. Phone by QR code: YouTube in sync; sideways ⛶ "Watch fullscreen"; 💬 beside the video; voice for a minute.
- [ ] 8. Phone, Shorts: swipe on the bar under the video or ▲ ▼; both move together; "waiting…" only in that bar.
- [ ] 9. The extension in Chrome on a legal demo film page (Video.js / Plyr): Go to the film, the room view, sync, the
  film's own ⛶ with our rail, 🎮 over the film, voice on the film page.

**B. Games with the same friend** (about 20 minutes) [BH13-G G1–G11]
- [ ] 10. Classics: dama to the end (sounds, the result card, Rematch); "🎲 Change game" → chess; a reload keeps the seat.
- [ ] 11. Sea Battle on a phone: tap aims, second tap fires; Wi-Fi off 10 s mid-game, the game goes on.
- [ ] 12. Quiz, then Draw & Guess, to the end: the podium, "Play again" / "Waiting for …", "Everyone got it!".
- [ ] 13. Last Heart to the end (How to play cards, the result card). Alone against Glowbeam in chess or dama: he
  answers in about a second.
- [ ] 14. Friend's phone data off 2 minutes during a Quiz: offline after ~1.5 min, the lobby 20 s later, back on returns.
- [ ] 15. While a film plays: Snack Bar earns (×10, Max, 📋 Upgrades, the usher), Window Garden grows, Five Frames in
  Turkish. Does buying in Snack Bar feel like a choice?

**C. Recent releases** (each one line; the release's own wording is in the archive under its version)
- [ ] 15d. [W135, 0.9.97.135] Tablet sideways, a video: Snack Bar's window starts just right of the link box ("Şimdi aç" whole), full height.
  Phone held sideways, open a game: the small video shows on top with "▶ Videoya dön" under it (a tap goes back to the
  room); the sides of the upright screen are the theme's colour, not black.
- [ ] 15c. [PH2, 0.9.97.130] Phone, upright: open Snack Bar, then a table with a friend (Quiz or Dama): it plays in
  the Oyunlar tab, the video a strip on top (a tap on it goes back to the room), nothing cut off or tiny. Turn the
  phone mid-game: nothing changes. Draw & Guess: draw with the tools and 🎨. Tavla: a tap just beside a point counts.
- [ ] 15d. [0.9.97.134] Laptop and a sideways tablet, with a friend in the room and the film playing: Büfe shows every
  text whole (the income, 👥 +%…, the stand names), and the BÜFE sign is whole in the picture.
- [ ] 15a. [QA3, 0.9.97.126] The four table lobbies look alike: 👑 / "(sen)", the "Bekleniyor…" chair, the grey
  "Oyunu başlat" (Duel: "Hazır") with its hint under it. In Five Frames typing T / M / F / Boşluk writes letters, no
  cinema mode. Matinee: Five Frames and Snack Bar are light. Window Garden on an upright tablet and a sideways phone:
  the album under the window sill, Sula / Stub'un ışığı inside their card.
- [ ] 15b. [0.9.97.128] Phone, upright: open any table (Draw & Guess, Quiz, Sea Battle…), tap ⋯ in its top bar:
  "Masadan kalk" and "Masayı kapat" can be tapped, and "Masadan kalk" leaves the table.
- [ ] 16c. [QW1–QW5, 0.9.97.124] Tablet upright and sideways, a video playing: Snack Bar never covers the video
  (sideways the right column down to the message box, upright the column beside the chat); the rail's 🎮 hall shows
  whole; a sideways phone's hall shows all six tables in a row. Laptop, chess with a video playing: "Video paused for
  the game" under the window's top bar, its buttons read "Game hall · Leave table · Close table · Back to video".
  Phone upright, a table: one top row (the small video with "‹" = back, the name, ?, 🎙, 🎮, ⋯ holding Leave / Close,
  Close asks first); sideways Leave / Close sit in that row. Cinema mode (T) then Snack Bar: cinema mode ends, the
  window sits off the video.
- [ ] 16. [QA2, 0.9.97.123] Games on phones: sideways Quiz / Last Heart rules read in full, the Duel card fits; XOX
  shows "Stub'a (bota) karşı oyna" with Kolay / Orta and "👁 0 izliyor"; Snack Bar sideways lists the popcorn machine; in
  Turkish Snack Bar numbers read 0,5 / 6 B; Matinee: the games hall covers are warm posters.
- [ ] 16a. [M1–M3, Q1–Q5, 0.9.97.122] On a laptop and a big screen the room reaches the window's foot, and the
  Queue / People tabs are there before any video. A table under a YouTube video, or in the video's place, stays whole.
  On a phone held sideways: no tip over "Watch fullscreen"; on an iPhone SE the empty room fits; Invite (WhatsApp
  included) and every Settings category fit. On a phone there is no 🧩 in the top bar, and the extension page says it
  is for computers. Turkish: a nameless room gets a Turkish name; Settings → Sound shows "%70"; the Test Lab says
  "Test Panosu". Sinema / Lokum: the chosen invite tab and Settings category are lit, and the new scene art stays
  clear of the text.
- [ ] 17. [W121, 0.9.97.121] Snack Bar on a laptop and a big screen: its window covers the chat column from the top to
  just above the message box and you can still type; drag, resize, double-click the top bar: back to the column.
- [ ] 18. [L1–L2, 0.9.97.120] Test Lab on a phone: no floating 🐞 upright (⋯ has the Test Lab tile); sideways a small
  🐞 bottom right, never over the video; none in fullscreen.
- [ ] 19. [Y1–Y7, 0.9.97.118] Plain 🎙 / 📷 before voice (red only when muted in voice); ➤ inside the chat box on a
  tablet; T cinema mode with its "✕ Leave cinema mode · T" button; the Matinee WhatsApp button; a readable greyed
  "Next ⏭"; Stub in the phone's empty room; the tablet's Queue / People tabs.
- [ ] 20. [M1–M4, 0.9.97.116] Matinee: calm paper, the video in a framed screen (fullscreen black), edge to edge on a
  phone, the film page unpainted; a table's "?" works on the first click right after entering.
- [ ] 21. [Q1–Q2, 0.9.97.114; P2–P4, 0.9.97.112; W1–W5, 0.9.97.111] Game windows: a side game keeps the video playing,
  a table pauses it for everyone with a note; side games open as a window on the right; the hall slides out of the
  window's left; hovering the corner moves nothing; drag, resize, reopen and reload keep each game's spot; no ⛶.
- [ ] 22. [LAB1, 0.9.97.109] `?debug=<your code>` on phone and computer: 🐞 stays after a reload; 🧪 "Test turu" rows run and undo.
- [ ] 23. [C1–C5, 0.9.97.107] A calmer room screen; ⚙️ categories without scrolling (phone chips too); About, Move,
  the mic check without the IP window; the join card's ⓘ.
- [ ] 24. [S1–S4, 0.9.97.105; N1–N4, 0.9.97.102] Stub in each theme's costume, Neon's new look, scene themes' sky behind
  the title, Matinee by day, the theme colours on the home page, the Sidelit font, the camera window's spot.
- [ ] 25. [F1–F2, 0.9.97.100; T1–T2, 0.9.97.98] The seven fonts (Turkish letters, kept after reload); picture themes'
  text readable; the search and chat boxes visible in each theme.
- [ ] 26. [L1–L3, 0.9.97.96] Phone sideways: a game fills the screen; a stream's small picture top right; a big
  monitor's bigger Snack Bar keeps its size.
- [ ] 27. [Q1–Q6, 0.9.97.93 and .95] On a hotspot or the backup connection, and with a background tab, an idle table and
  five tabs of one room for 10 minutes: no "reconnecting", nothing "too many connections".
- [ ] 27a. [PH1, 0.9.97.127] On your own phone: the four tabs at the bottom (Room, Search, Games, Me) each one tap;
  typing swaps 🎙 📷 for ➤; 😀 sends a reaction and "🖼 Send an image"; Search adds and plays a video; the Me tab;
  sideways ⛶ / 💬 / 🎙 with a message count; the welcome sound starts with the picture; the line "Sidelit is made for
  computers…" under "Enter room".
- [ ] 27i. [CH1, 0.9.97.141] In a room, chat a while with a friend (or use 🐞 Test Lab → "Chat: add 250 numbered messages" on a
  test server), leave and come back later: the earlier messages are still there; scroll up and older ones load.
- [ ] 27f. [SRC1, 0.9.97.136] In a room (computer, then the phone's 🔍 Search tab): press ⠿ → Vimeo, type a few
  words + Enter: before the VIMEO_TOKEN secret the tile and the search say "Not available yet" (the real search is
  27g). ⠿ → Search the web: a new tab opens with your words; come back, the box asks for the link.
- [ ] 27h. [SH1, 0.9.97.137] On your phone, play a Short, ⋯ → ↩ Room view, then tap "📱 Shorts view" in the strip
  under the video; repeat a few times. On a computer the same button is beside Next above the video.
- [ ] 27g. [SRC1, 0.9.97.136] After the VIMEO_TOKEN secret is set and a deploy has run: in a live room, ⠿ → Vimeo,
  search a few words, press ▶ Play now on a result: it plays for everyone.
- [ ] 27e. [0.9.97.133] On a laptop with a friend: play a video, open Snack Bar from 🎮; when the friend writes, the
  message shows as a note beside the game window. On a phone held sideways: open 🚩 Report; the reasons are one row
  you can slide, the note box shows two lines.
- [ ] 27d. [PWA1, 0.9.97.132] On your Android phone: install Sidelit (Chrome menu → Install app); in the YouTube app,
  Share a video → Sidelit: a new room opens and plays it once you enter; let it play a few minutes, the screen stays on.
  Long-press the Sidelit icon → "Create room". On an iPhone (Safari), the home page shows the "Add to Home Screen" hint
  once.
- [ ] 27b. [AV1, 0.9.97.129] On your phone: open the character picker (join card or profile), scroll down, tap a
  character: the list stays where it was and the one you tapped stays in view.
- [ ] 27c. [SAFE1, 0.9.97.131] In a real room with a friend: tap their face → 🔇 Block for me; their new messages and
  emojis disappear for you only (ask them: they still see yours); reload, still hidden; 🔈 Unblock brings the lines
  back. Then 🚩 Report: pick a reason, open "See what is sent", send; tell the Planner when the report issue arrives in
  the private feedback repository. On the phone the same two buttons are on their row in the People list.
- [ ] 27h. [GMP-a, 0.9.97.138] With a friend at Sea Battle and your phone as a third person: open 🎮 on the phone and
  Join the table: you watch, and you see both fleets as they are shot; the friend never sees yours. Same in the Five
  Frames Duel: the phone shows both boards with their letters. Five Frames in English and Turkish: new everyday words
  are accepted (Turkish forms such as "evler", "kitabı"), and the day's word is a common, clean word.
- [ ] 27l. [GP1] On a computer, open 🎮 and pick Classics, then Snack Bar: each shows at once, pictures complete, no
  blank moment. On an iPad held sideways, open Five Frames: its letters and the ticket numbers are easy to read.
- [ ] 27k. [GW2] On a computer with a friend and a YouTube video playing: open Classics from 🎮: it fills the whole
  screen and the video pauses for both of you. Press 🪟 (or Esc): a frame at the right edge, the video plays again.
  Drag the frame over the video: it stays there. Open Sea Battle: it opens as a frame (the mode you used last); ⛶ in
  its head gives it the whole screen again. Snack Bar: a frame you can drag over the video too.
- [ ] 27j. [ST1, 0.9.97.139] With a friend sharing a tab (on a computer): the stream has one button, "⛶ Fullscreen";
  it fills the screen, "🪟 Window" brings it back; drag the window anywhere and resize it from its corner; reload and
  watch again: it comes back where you left it. With a YouTube video playing, drag it onto the video: it moves beside it.
- [ ] 27i. [YTQ1, 0.9.97.140] Search a few words in the room, then open the Shorts view's ＋ and ♾: under each list the
  YouTube logo (red icon + "YouTube" word: white on dark themes, near-black on Matinee) sits before "Results from
  YouTube"; clicking the logo opens youtube.com in a new tab.
- [ ] 27p. [WG2] Window Garden while a film plays: tap each pot, water, pick a bloom: no button or the
  window moves. 🎨: try the four window views and pot colours; compost 5 petals into a seed.
- [ ] 27m. [QZ2a] Quiz with a friend on a phone and a computer: every answer counts on the first tap or
  click, also when the friend answers at the same moment.
- [ ] 27n. [QZ2b] Quiz with a friend, Turkish and English: the new topics (Languages and words, The human
  body, World and cultures); a typed question: type with a small typo or without Turkish letters, it still counts; the
  friend's answer shows only at the reveal. Tell the Planner any question that looks wrong.
- [ ] 27o. [QZ2c] Quiz with a friend: pick Tournament, 1 pick each; each of you picks a round's topic in
  turn. Try ×2 (Double) and ↺ (Second chance: answer wrong first, then try again). The winner has the most round wins.
- [ ] 27p2. [GMP-b] With two or more friends (phones and computers): open Sea Battle, the others press "Take the seat"
  before the battle. On your turn tap a friend's chip, then fire on their sea; a sunk player is crossed out and only
  watches; at the end the card lists 1st to last. Then the Five Frames Duel with three or more: the race goes on after
  the first one solves, and the end card shows the places.
- [ ] 27q. [SH1, 0.9.97.153] Swipe Shorts with a friend: each Short starts from 0:00 for both of you; tell the Planner
  how long the short pause before each one feels.
- [ ] 27r. [SH1] Join voice in the Shorts view and talk: your face and your friend's get a green ring while speaking.
- [ ] 27s. [EC1, 0.9.97.153] Auto-next off, let a video end: "Video ended" opens in the middle of the screen (▶ Play
  next / Close; Esc and a click outside close it too).
- [ ] 27t. [SH1] Paste several TikTok app links (vm.tiktok.com) together with YouTube Shorts: they queue in paste order.
- [ ] 27u. [SH3, 0.9.97.155] Computer, Shorts view: 💬 opens the chat beside the video; a friend's messages show there
  and count on 💬 while it is closed.
- [ ] 27v. [VC1, 0.9.97.155] In voice press 🎧: you hear nobody, your mic goes off, your friend sees a crossed 🎧 on your
  face; 🎙 brings everything back.
- [ ] 27x. [VC3, 0.9.97.156] With a VPN on, join voice: after ~10 s "Your voice isn't reaching the others" and an ⓘ.
- [ ] 27y. [MSG1, 0.9.97.157] With a friend: open ⋯ on your message (on a phone, press and hold it), "🗑 Delete for
  everyone": you both see "… deleted a message"; as the host delete your friend's message; reload: the lines stay.
- [ ] 27z. [CR2, 0.9.97.158] In YouTube Music open an album or a playlist → Share → Copy link, paste it in the room:
  its songs go into the queue in order and play one after another (the cloud can't test real YouTube Music).
- [ ] 27aa. [GW3, 0.9.97.159] Open a table (Classics) with a YouTube video and with a video file: it fills the video's
  place, never the whole screen; chat, voice and the rail at the video's right edge still work; 🪟 makes it a frame you
  drag anywhere, ▣ / Esc back; 📱 Shorts view → a small frame beside the Short, "Room view" brings it back unchanged.
- [ ] 27ab. [SRC2, 0.9.97.160] Press ⠿ beside the search box (or "🔍 Search a video" in an empty room): "What are we
  watching?" shows big tiles and chips. Try a chip (Music), pick Podcasts and search words, open ▶ Video feed and 🎮
  Games from it; with a YouTube video playing it opens in the side panel's place and never covers the video; on the
  phone it slides up from the bottom; Esc closes it.
- [ ] 27ac. [FD1a, 0.9.97.160] With a friend: ♾ / ▶ opens the feed drawer on the right (from the bottom on a phone),
  the video stays visible; picking a tile only selects it, "▶ Start feed" starts it; you both see "Feed: … · N left ·
  by …" above the video; in Room rules turn on "Only the host can start a feed": your friend can pause but not start
  or stop; when someone stops a feed the chat says who.

- [ ] 16d. [TH3] Home page in Neon: the name, slogan, buttons and devices glow, calm; Tab shows a clear
  ring. Any theme: four faces under the devices and "4 kişi izliyor · 2'si seste"; the balloon drifts across all three
  screens in step (and stands still with "reduce motion" on).

**D. Before the 1.0 store submission** (Claude reminds the owner right before it)
- [ ] 28. The extension in Edge, Brave and Opera: install unpacked, room + YouTube sync, voice, camera, tab share, the
  film page and voice there, fullscreen, sounds; Brave Shields + "Disable non-proxied UDP" shows the "blocks direct
  connections" note; Edge "Strict" tracking prevention; Opera's ad blocker, VPN and GX limits; write down each version.
- [ ] 29. The site without the extension in Firefox, Safari (Mac) and on an iPhone: room, YouTube, chat, a game, voice +
  camera, screen share (Firefox: picture only), fullscreen, "Add to Home Screen".
- [ ] 30. On your own phone: the 20 no-code release tests of `is-akislari/yayina-hazirlik.md` part C (in the owner's
  guide repo); Claude turns them into a Sidelit list when asked.
- [ ] 31. Real YouTube / TikTok (the cloud can't play them): ♾ → 🎲 Discover chips and ✨ More like this; the Shorts view's
  bar; `?measure=1` switch times with a friend (then decide on a hidden preload player); TikTok links play and loop;
  a fresh invite opens on one screen; the extension's install card turns into "Go to the film" by itself.

## Owner's to-dos (settings and accounts; tell the Planner when done)
- [ ] GitHub: the `production` environment holds the deploy secrets and `LAB_CODE`; private vulnerability reporting on;
  Dependabot alerts and security updates on (Settings → Code security). [0.9.97.49, .69, .3]
- [ ] The private feedback repository: Watch → Custom → Issues, so an `outage` issue reaches your phone. [0.9.97.92]
- [ ] Before the store: the Microsoft Partner Center account for Edge Add-ons (`web-store.md`).

## Pending decisions (owner's)
- **Domain** with the own address (`custom-domain.md`); the name is Sidelit (decided 3 Nov 2026), a trademark database
  check before the store submission (`name-research.md`).
- **Cloudflare Realtime card:** Cloudflare asks for a card even for the free quota and has no spending cap, so voice
  stays peer-to-peer. With a card: Worker secrets `REALTIME_APP_ID` + `REALTIME_APP_SECRET`, the code switches to SFU
  by itself (`ses-goruntu.md`), a budget brake is mandatory, and the same card could hide IP addresses in voice,
  camera and streams (ROADMAP Phase 2).
- **Chrome Web Store submission:** with 1.0. **Trademark filing, donations, legal entity:** `ROADMAP.md` §4.
- **Film page intro** (play the room intro on the film page or not; Planner recommends not): decided right before the store
  submission, not now (owner, 17 Nov 2026).
- **After 1.0:** a Firefox extension (L), a TURN relay (Phase 2). Not planned: a Safari extension, Opera's own store.
- **TV (owner, 17 Nov 2026):** all three, in this order: short term a TV-browser mode joined with a short code
  (after 1.0 for now, maybe earlier), medium term Google Cast / Google TV (one-time developer fee), long term an Android
  TV app. Cards are written when the first one is due.

## Ideas waiting for the owner's pick
Claude's and the sessions' ideas that came up mid-task (`CLAUDE.md` §4: never built without a card). The full list
with what became of each (built in 0.9.93.2, Test Lab, not planned …) is in `archive/status-history.md`.
- **Invite with the film time:** the invite window also offers "invite with the film time" when one is set (agreed for
  0.9.95, not built yet).
- **More players without the extension:** Vimeo + podcasts first (Planner's proposal; card under Proposed in `CARDS.md`).
- **A TV can keep the host role:** fix with the TV work above (Google Cast step).
- **A link pasted while the room is still connecting:** it is dropped without a note (`connection.send` drops while
  the socket is not open); queue it until open or show "still connecting" (lane A, 16 Nov).
- **Screenshot on failure for the feed harness:** `scripts/harness/feed/run.cjs` failed once on main (the friend's
  `#feed-row-pause` never visible) and CI kept no picture (B2, 16 Nov).
- **Old game layout points (Game Studio's first look, 16 Nov):** phone Sea Battle "Play against Stub" line wraps beside
  Easy / Medium; tablet: an empty band above the game; Draw & Guess round choices "1 / 2 / 3" in EN but "1 tur" in TR.

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
- Deploys from the cloud go through GitHub Actions (no `wrangler login`); deploy keys are `production` environment secrets (`TAG_TOKEN` is the only repository secret).
