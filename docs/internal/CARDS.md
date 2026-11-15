# Job cards (the board)

One board for every session (owner, 2 Nov 2026). The **Planner** writes, orders and routes cards and assigns versions;
a **Developer** or **Game Studio** takes the top **Ready** card of its lane, moves it to **In progress**, and when it is
live writes `Done: <PR link>`. **Security** and **Research** add suggestions under **Proposed**; the Planner and the
owner decide whether they become Ready. Roles, who edits what and how the owner is asked: `CLAUDE.md` §4. What to work
on now: `ROADMAP.md` "Focus: now / next / frozen". The owner's tick view is the Planner's board Artifact (`CLAUDE.md` §2).

**A finished card leaves this file in the same PR that writes its `Done:` line**: it moves verbatim to
`docs/internal/archive/cards-done.md` (DOCS2, 11 Nov 2026; that file also holds the old header, the owner's test rounds
1 and 2, the run order to the test round and every card finished before then). CI (`scripts/check-docs.mjs`) proves no
card heading or backticked identifier of the board is lost in a move.

Card format:

```
### <ID>. <short title> (<who asked, date>; <lane>)
- Why: <one line>
- Done when: <what can be checked, including its Test Lab hook or scenario>
- Tests: <unit / e2e / harness / owner's hand test>
- Owner's pick: <link or "none needed">
```

## Lanes

| Lane | Role | Owns (files) | Where its work stands |
|---|---|---|---|
| A | 🔨 Developer: room / site | the site, the room page and the room server, their tests and reference sections | `STATUS.md` task queue "Lane A" |
| B (+ B2) | 🔨 Developer: players, Shorts, extension, ops | players, Shorts, the extension, CI and the shared test tooling | QA1 below |
| W | 🔨 Developer: game windows (opened by the Planner when needed) | `apps/web/src/games/stage.ts`, game-window head / drag / fit, `catalog.ts` sizes, the game-window rules in `room.css` | idle (0.9.97.121 live) |
| Games | 🎮 Game Studio | the games' code, art, sounds, tutorials, server objects, `docs/internal/design/games/` | `STATUS.md` task queue "Game Studio" |
| — | 🛡️ Security · 🔎 Research · 🎨 Design | their own docs; cards go to Proposed | — |

Two sessions never edit the same lines; the Planner splits work by files.

## In progress

(none written on the board; the lanes' handoffs are in `STATUS.md` "Task queue")

## Ready

### SH1. Shorts view fixes: the way back on a phone, the first seconds, who is talking (owner, 15 Nov 2026; lane A)
- Why: three things the owner found in the Shorts view.
- What:
  0. **Urgent, the computer too (owner, 15 Nov 2026 evening):** the owner finds no "📱 Shorts view" button on a
     computer either after "↩ Room view". Today `#shorts-enter` sits in the toolbar under the video and shows only while
     a Short plays. Find why he can't see it (hidden layout, toolbar folded, SIMP1) and make the way back obvious on
     every device. Ship this first, alone if needed.
  1. **The way back on a phone:** after "↩ Room view" a phone has no way back into the Shorts view. `.shorts-enter` is
     hidden in `html.ph-room`, and `shortsOff:<room>` stays in session storage. While a Short plays, give the phone a
     clear "📱 Shorts view" entry in the Room tab (the strip under the video), and keep the computer's button.
  2. **The first 2–3 seconds:** when the next Short starts by itself, the owner misses its first 2–3 seconds. Find out
     why (preload, `command()` seek, the start being swallowed, the late-join offset) and fix it, so every viewer sees a
     Short from 0:00 together. Add a `sync-engine.test.ts` scenario if the sync engine is involved.
  3. **Who is talking:** in the Shorts bar's faces (and the phone strip's faces), a person who is speaking in voice
     gets a visible ring around their round avatar (a green glow and a slight grow), driven by the existing voice
     level.
     - It respects reduced motion (ring only, no grow).
     - It shows for yourself too, so you know your mic is going out.
  4. **TikTok, small (Research `research/tiktok-shorts.md` §6):**
     - Accept short `vm.`/`vt.tiktok.com` links when pasting many links; the Worker resolves them one by one.
     - When a TikTok plays, the ♾ window says that TikTok has no public feed and points to pasting or sharing links.
     - A harness swipes through a queue that mixes YouTube Shorts and TikToks.
     - No TikTok search or feed: TikTok offers none legally.
- Done when:
  - On a phone you can leave and re-enter the Shorts view any number of times.
  - An auto-advanced Short starts at 0:00 for everyone (a harness measures `currentTime` at start).
  - A speaking avatar lights up in the Shorts bar on a computer and a phone.
  - Test Lab hook `shorts.state` reports the view, the start offset and the speakers.
- Tests: the shorts-rail / shorts-door harnesses, a phone harness for the way back, a unit scenario for the start, and
  the owner's hand test.
- Owner's pick: his three points (Planner chat, 15 Nov 2026).

### GMP. Bigger table games: Five Frames Duel and Sea Battle for 2–6, spectators see the game, many more words (owner, 15 Nov 2026; Game Studio)
- Why: the owner wants these two games for groups. He also wants spectators to see what happens ("it's fine if they
  see, they are friends"), and the word game needs far more words.
- What:
  1. **Spectators see the game:** in Sea Battle and the Five Frames Duel a watcher sees every board live. That means
     the Duel players' letters, and in Sea Battle all ships and shots. Players still never see each other's hidden
     information (a player sees only their own ships, and in the Duel only the others' colour marks). The server sends
     watcher views only to watchers.
  2. **The Five Frames Duel for 2–6 players:** same rules, more players racing on the same word. The finish order
     ranks them, and the result card shows 1st to 6th. Lobby, head and phone Games-tab layouts fit 6.
  3. **Sea Battle for 2–6 players:** each player has a sea. On your turn you **choose which player to attack**, then
     fire; turns go round. A player whose ships are all sunk is out but keeps watching. The last one with ships wins.
     It is played for fun: no rule forces fairness.
  4. **Many more words, English and Turkish:**
     - The answer lists and the accepted-guess lists for both languages grow from open-licensed sources (licence
       checked: MIT / Apache / BSD / CC0 / CC-BY with attribution in `apps/web/public/third-party-notices.txt`).
     - Answers are common, clean words: no slurs, no adult words, no proper nouns. Guesses may be broader.
     - Turkish handles İ/ı correctly.
     - Size targets are the studio's to propose, e.g. 2,000+ answers and 10,000+ guesses per language.
     - The lists ship as lazy chunks so the room bundle doesn't grow.
- Done when:
  - Every hidden-information rule above is enforced by the server, with unit tests.
  - Both games run with 2, 3 and 6 players in e2e.
  - The phone Games tab fits 6 players at 360×640.
  - The word lists pass a licence note and a profanity filter check.
  - Test Lab hooks: `seaBattle.state`, `duel.state` (players, turn, target, watchers).
- Tests: server unit tests (turns, targets, elimination, watcher views), e2e with fake players, games-sweep at phone
  and laptop, and the owner's hand test with friends.
- Owner's pick: his message (Planner chat, 15 Nov 2026). He allows extra skills or tools for the word lists. The
  studio says which and why before using them.

### SH2. Feeds: ♾ Shorts and ▶ Videos, reachable from the room, steerable, no repeats (owner, 15 Nov 2026; B2, after SH1)
- Why: the infinite Shorts feed only lives inside the Shorts view, its window is confusing, and a new feed brings back
  Shorts the room has already watched.
- What:
  1. **Reach it from the normal room:** the Queue ("Up next" / Sıra) shows the active ♾ feed as a row (its name and
     what it follows). It can be paused, resumed and steered there without entering the Shorts view.
  2. **A simple, clear ♾ window:** one screen with the active feed on top and plain choices. Steer the running feed
     instead of making a new one:
     - "Continue from this channel";
     - "Same topic, other country";
     - "More like this one";
     - "Change the topic".
     One line explains each; changes apply to the next Shorts without a restart.
  2b. **▶ Video feed (owner, 15 Nov 2026 evening):** the same idea for normal YouTube videos. The Queue gets two
     buttons, "♾ Shorts feed" and "▶ Video feed". A video feed starts from:
     - "like this video" (a pasted link or the playing one);
     - "this channel" (newest / random / most viewed);
     - "popular now" (country and category);
     - "a topic".
     It is steerable the same way.
     - **Quota-aware:** `search.list` costs 100 units of the 10,000 a day, so prefer the cheap calls: `playlistItems`
       of a channel's uploads, the `videos` `chart=mostPopular` with region and category, `videos.list` (1 unit each).
     - Cache per room and per query in the Worker.
     - Never call search per video.
     - Planner's extra ideas, for the studio to pick from if cheap: length filter (short / medium / long), "two
       channels mixed", continue a pasted playlist, "room votes between 3 next videos" (reuse voting), "each person's
       turn".
  3. **No repeats:** the room remembers the Short ids it has played, on the room's server object, ids only. A new or
     steered feed skips them.
     - A one-time room forgets them when it is deleted.
     - A saved room keeps the last 2,000 ids for 30 days.
     - The privacy page notes it in both languages if needed (ids of public videos, no personal data).
- Done when:
  - The feed is visible and steerable from the Queue on a computer and a phone.
  - Each steer changes the next Shorts.
  - A new feed doesn't replay watched ids (unit + e2e).
  - The memory is wiped with the room.
  - Test Lab hook `feed.state` (active feed, steer, remembered count).
- Tests: room server unit tests for the memory and its caps, e2e feed → steer → no repeat, the shorts harnesses, and
  the owner's hand test.
- Owner's pick: his message (Planner chat, 15 Nov 2026); the memory length is the Planner's call.

### ST1. Watching a screen share: one button, fullscreen or a free window (owner, 15 Nov 2026; B2)
- Why: the stream viewer has too many confusing controls (fill the screen, frame, shrink, grow).
- What:
  - The stream viewer gets **one** control: "⛶ Fullscreen" ⇄ "🪟 Window".
  - In window mode the stream is a free window that can be dragged anywhere and resized from its corner, keeping its
    shape and its place after a reload, the same way the camera window does.
  - Everything else goes from the viewer: fill, frame, ±.
  - The phone keeps its own sideways behaviour.
- Done when:
  - A viewer on a computer has exactly one toggle.
  - Fullscreen and window both work, and the window drags and resizes smoothly.
  - Nothing goes over the YouTube player.
  - Test Lab hook `stream.view`.
- Tests: the stream harness at 1366 and 1920, a tablet check, and the owner's hand test with a friend's tab share.
- Owner's pick: "one button: fullscreen or a window I can put anywhere; simple" (Planner chat, 15 Nov 2026).

### VC1. Voice: a deafen button, and the YouTube volume slider (owner, 15 Nov 2026; lane A, after SH1)
- Why: the owner wants a Discord-like "deafen" in voice, and on YouTube he can't drag the volume, because one click
  jumps it.
- What:
  1. **🎧 Deafen:** in voice, next to 🎙, a headphones button turns off what you hear from voice (everyone's voice,
     the stream's sound if any). It also mutes your own mic, like Discord, and shows the state to others (a crossed 🎧
     on your face). It is kept per room over a reload. The film's sound is untouched.
  2. **Volume dragging:** find why dragging the volume on a YouTube video doesn't work and one click jumps it. Check
     our rail's `#dock-vol`, an overlay or pointer capture over YouTube's own slider, and touch vs mouse. Make it drag
     smoothly on a computer and a phone. Never put anything of ours over YouTube's player.
- Done when:
  - Deafen silences voice for you only, shows to others, and survives a reload.
  - Volume drags smoothly.
  - Test Lab hook `voice.deafen`.
- Tests: voice e2e (deafen state), a harness for the volume drag, the owner's hand test.
- Owner's pick: his message (Planner chat, 15 Nov 2026).

## Proposed

### Security: Worker and Durable Object hygiene (R4-6, R4-7, R4-8; lane A)
- Severity: low
- Why: small gaps against Cloudflare's best practices: the usage book loses updates under concurrent requests, some abuse
  buckets live only in memory, failed feedback sends burn the daily cap, `/api/youtube/usage` is unlimited, the poker
  deck uses `Math.random`, the probe WebSocket never closes, one floating promise, a heavy room constructor, API answers
  without `nosniff` / `no-store`, observability without traces.
- Done when: `usage.ts` reads the body before `get`/`put`; feedback checks the token before the gate and has fetch
  timeouts; `/api/youtube/usage` has a limit; the server shuffles with crypto randomness; the probe socket closes after
  10 s; `fallback.ts:271` goes through `finish()`; the room loads small keys in one `get([...])` and images at join time;
  a JSON helper sets `X-Content-Type-Options: nosniff` and `Cache-Control: no-store`; `observability.traces.enabled`.
- Tests: unit (usage book under two interleaved adds, shuffle source); e2e existing suites; a header check in e2e for
  one `/api/*` answer.
- Owner's pick: none needed.

### Security: custom-domain hardening checklist (R3-3)
- Severity: medium (do it together with the domain purchase)
- Why: on `workers.dev` there is no WAF, rate-limiting rule, bot protection or HSTS setting; when the domain comes,
  the old address and preview URLs must not stay open beside it.
- Done when: `wrangler.jsonc` has the custom domain, `"workers_dev": false`, `"preview_urls": false`;
  `allowedOrigin`, the extension's `SITE_URL` and the CSP name the new origin; production `localhost` origins are
  gone; `_headers` sends HSTS; the owner has turned on Always Use HTTPS, minimum TLS 1.2, DNSSEC and one rate-limiting
  rule on `/api/*` (Bot Fight Mode only after a test that WebSockets, the fallback and the extension still connect).
- Tests: live e2e against the new domain; the old `workers.dev` address no longer answers (or redirects); embed
  harness with the extension built for the new origin.
- Owner's pick: needed (the domain itself, and the zone settings in the dashboard).

### Security: TV link hardening before the TV leaves the lab (M8)
- Severity: medium (only while `?tvlab=1` hides the TV)
- Why: a TV token is the whole person including host rights, a QR shown by someone else can phish it, and pairing
  codes can be guessed (limit keyed on a browser id the client chooses).
- Done when: a `tv:true` connection may only send ping / tv / listen-only voice / react; the phone confirms before
  pairing; `tv-link` is limited per IP hash and per room (plus a Worker rate limit); codes are 8 digits.
- Tests: e2e `tv.mjs` (TV connection's `kick` / `make-host` / `settings` refused; brute-force attempts limited),
  harness `tv/run.cjs`.
- Owner's pick: none needed (part of the TV version after 1.0).

### More players without the extension: which services and how (Research first; owner's idea, 2 Nov 2026)
- Why: Watch2Gether's search box has a source picker (YouTube, Vimeo, Dailymotion, SoundCloud-like audio, podcasts,
  web radio…); embeds play on our site for everyone without the extension.
- Done when: Research lists candidate services with: official embed / player API, can we play / pause / seek / read the
  time (sync), search API and its cost, terms (overlays, commercial use, audits), CSP hosts, and a ranked shortlist;
  the owner picks which to build and when (not before 0.9.95).
- Tests: none (research); each built service later gets its harness like `tiktok/run.cjs`.
- Research (2 Nov 2026, `research/more-players.md`), ranked: 1 Vimeo (player.js, full control, rate only on PRO
  videos → 1×), 2 podcasts (iTunes Search → RSS → audio file in today's `html5` kind), 3 SoundCloud (Widget API, links
  only, 1×), 4 Dailymotion (needs a Player ID from the owner's free account), 5 Twitch (after the domain move:
  `parent=`), 6 web radio (CSP `media-src https:` needs a security look). Not recommended: Spotify, Apple Music,
  Streamable, Kick, Mixcloud, Bilibili.
- Owner's pick: needed (which, and when: not before 0.9.95); Planner's proposal: Vimeo + podcasts first.

### G1–G5. Growth after 1.0 (owner agreed 3 Nov 2026; ROADMAP §7 "Growth plan")
- G1 Store listing for search words + reviews from the first 20 users (with the store submission).
- G2 Search pages (EN first): Shorts together, W2G without ads, free Teleparty alternative, TikTok with friends.
- G3 A weekly 15–30 s clip (TikTok / Reels / Shorts); tools: `hyperframes` / `video-use` / `earshot` on the owner's
  computer (his catalogue).
- G4 Communities + a Product Hunt day; copy polished with `humanizer`.
- G5 Every room a referral: shareable recap image, one-click "Add to Chrome" on the film card (store link once listed).
- Done when / tests: each becomes its own Ready card when 1.0 is near; the Planner details them then.
- Owner's pick: agreed (3 Nov 2026).

## Done

Every finished card: `docs/internal/archive/cards-done.md` (and the release notes in `CHANGELOG.md`).
