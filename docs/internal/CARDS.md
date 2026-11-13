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

### PH1. An app-like phone room: bottom tabs, one input row, chat sideways, join sound in step (owner, 13 Nov 2026; lane A)
- Why: on a phone, everyday actions hide behind the ＋ and ⋯ sheets (search a video is 2 taps away, games 3), the
  sheets repeat what Settings already has, and the join sound comes out of sync. The owner asked which phone features
  are needed, showed a competitor app's phone layout ("bottom tabs, one input row; do it our own way") and asked for a
  design pass ("more basic, fast, matching the PC").
- Spec: `docs/internal/design/phone-room.md` (Design, PR #422), **option A**, picked by the owner. Phone layout only
  (`html.ph-room`); computers and tablets are unchanged, and no feature code is deleted (things move or hide).
- What:
  - **Bottom tab bar** (`role=tablist`, the computer's `.tab` look): 🎬 Room · 🔍 Search · 🎮 Games · 👤 Me. Four
    panels, no router.
  - **Room tab:** the video, then a strip with the faces (tap → People + Invite) and 📌 Pin · ⏩ Speed · 🔄 Sync ·
    ⏭ Skip, then the chat with activity lines inline in italics, then ONE input row: 🔗 Invite · box · 🎙 · 📷 · 😀.
    ➤ swaps in for 🎙📷 while typing; 😀 holds the reactions and 🖼 Send an image. The ＋, ⋯ and Add-a-video sheets go.
  - **Search tab:** our own search / link box and results with thumbnails, plus "Up next" (the queue). It borrows
    `#media-form` and calls the same code as `openAdd()`.
  - **Games tab:** the games hall as a list (tables, then side games).
  - **Me tab:** Profile + Settings as grouped cards, each row a toggle or ›, with a one-line help text. It includes
    Save the room, Room rules, Film time (host), Theme, Sound & camera, Language, Help, Privacy and Terms.
  - **The owner's earlier picks stay, inside A:**
    - the 🧪 Sync test is gone from the phone (the Test Lab keeps it);
    - Recap only in Me;
    - the empty room says "🔍 Search a video" (goes to the Search tab) and "🔗 Invite";
    - sideways with a video: video + a column of ⛶ Watch fullscreen, 💬 and 🎙, with the tabs and input row hidden;
    - Shorts upright: the 9:16 video fills, and the feed becomes a 💬 sheet with a count;
    - the phone home page has no extension box.
  - **Fast:** no blur, shadow or grip on sheets; one 44 px radius-10 button shape; `room.css`'s phone section gets
    smaller (the md's rule table: about 26 rules out, 22 in).
  - **Join sound in step:** today `playIntro()` runs on the server's `welcome`, and `intro-sound.ts` makes a fresh
    `AudioContext` that waits at most 250 ms for `resume()`, so on a phone the sound comes late or not at all.
    - Unlock or reuse the shared context on the "Enter room" tap.
    - Start the picture and the sound from one clock: once the context is running, or the picture alone, never the
      sound late.
  - Nothing goes over the YouTube player.
- Done when:
  - On a phone each tab is one tap, and the four tabs fit at 360 px in Turkish.
  - The input row works: typing swaps in ➤, 😀 sends a reaction and an image.
  - Search adds and plays a video.
  - The Me tab has every setting the phone had before.
  - Sideways and Shorts behave as in the spec.
  - The intro sound starts with the picture or not at all.
  - The Test Lab hook `phoneRoom.state` reports the tab, the input-row state and the visible controls.
  - Nothing changes on a computer or a tablet.
- Tests:
  - `scripts/harness/phone/run.cjs` rewritten with text-based selectors for the tabs and input row.
  - `shorts-rail`, `room-more`, `settings`, `phone-sideways`, `first-tips`, `check-texts` and the size budget.
  - First look: `shots.cjs` phone and phone-land, EN + TR, Night + Matinee + one scene theme.
  - Owner's hand test: the phone room on his own phone.
- Owner's pick: council + Planner review and the owner's answers in the Planner chat, 13 Nov 2026 (removals: the
  duplicates and the sync test; promote: empty-room buttons, chat sideways, no extension box on the phone home page,
  Help); layout option A of `phone-room.md`, 13 Nov 2026. Kept on purpose: ⏩ Speed, 📌 Pin, ⏭ Skip, 🔄 Sync, 💾 Save
  room.

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
