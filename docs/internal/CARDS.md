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

### PH1. A lighter phone room: 🔍 search, fewer duplicates, invite forward, chat sideways (owner, 13 Nov 2026; lane A)
- Why: on a phone, searching for a video takes 2 taps behind ＋ or ⋯, and the ⋯ / ＋ sheets repeat things Settings and
  the strip already have. The owner asked which phone features are needed. The council (5 advisors) and the Planner
  reviewed `ui/phone-room.ts` and `ui/room-more.ts`, and the owner picked the following. Every removal is **phone
  only, by hiding**: the computer room is unchanged and no feature code is deleted.
- What:
  1. **🔍 Search a video** (`#chat-search`, `.phone-only`) sits in the chat row beside ＋ and calls `openAdd()`: one tap
     to the search / add sheet. Its title and aria-label are in `i18n.ts` and `i18n-tr.ts`.
  2. **＋ sheet:**
     - Gone: 🎬 Video (🔍 does it now), 🖼 Image (🖼 is already in the chat row), ⛶ Fullscreen (it is on the strip)
       and 🧪 Sync test.
     - Kept while a video plays: 📌 Pin, ⏩ Speed, 🔄 Sync and ⏭ Skip.
     - With nothing to show, ＋ is hidden.
  3. **⋯ sheet on phones:**
     - Gone: 🎵 Queue (the search sheet already holds the queue), ⏰ Film time and 👑 Room rules (both are in Settings),
       ✨ Recap (its history stays in Profile) and 🧪 Sync test (the Test Lab keeps it).
     - Kept: 🔗 Invite, 👥 People, 🎮 Games, 💾 Save room, 👤 Profile, ⚙️ Settings.
     - New: **❓ Help**, which opens `help.html` in the page language.
     - Hide these on the phone through `roomMoreItems`' `desktop` flag, never by dropping them from the shared list.
  4. **Empty room on a phone:** the "＋ below" card becomes two big buttons, **🔍 Search a video** (`openAdd`) and
     **🔗 Invite** (`#invite-btn`). The first-time tip for adding a video points at 🔍.
  5. **Sideways, not fullscreen, with a video:** next to "⛶ Watch fullscreen" add **💬** (the chat as a side sheet,
     the same `.ph-fs-side` the fullscreen rail uses) and **🎙**, so turning the phone no longer leaves you stuck.
     Nothing goes over YouTube's player.
  6. **Home page on a phone:** the extension box is hidden (the extension is for computers only; the extension page
     already says so).
  7. **Join sound in step on phones** (owner: "the join sound comes out of sync"). Today `playIntro()` runs on the
     server's `welcome`, and `intro-sound.ts` makes a fresh `AudioContext` that waits at most 250 ms for `resume()`. So
     on a phone the sound comes late or not at all while the animation plays. Fix:
     - unlock or reuse the shared audio context on the "Enter room" tap;
     - start the animation and the sound from the same clock: once the context is running, or the picture alone, never
       the sound late;
     - say in the PR what was measured.
- Done when:
  - On a phone 🔍 opens the search sheet in one tap.
  - ＋ and ⋯ show exactly the tiles above, upright and in Turkish.
  - The empty room shows the two buttons.
  - Sideways with a video shows ⛶, 💬 and 🎙, and the chat sheet opens and closes.
  - The phone home page has no extension box.
  - The intro sound starts with the picture or not at all.
  - A Test Lab hook `phoneRoom.tiles` reports the ＋ / ⋯ tiles and the 🔍 state.
  - Nothing changes on a computer or a tablet.
- Tests:
  - `scripts/harness/phone/run.cjs`: use text-based tile selectors instead of `nth=N` indexes, and add 🔍 in one tap,
    the tile lists, the empty-room buttons and the sideways 💬 / 🎙.
  - `shorts-rail` uses `#chat-search` in place of "＋ → tile 0".
  - `room-more` gets the phone label list.
  - Run `settings`, `phone-sideways`, `check-texts`, the size budget and the first look (`shots.cjs` phone and
    phone-land, EN + TR).
  - Owner's hand test: the phone room on his own phone.
- Design first (owner, 13 Nov 2026: "go over the design with Design too: more basic, fast, matching the PC"):
  - 🎨 Design writes `docs/internal/design/phone-room.md` before lane A builds the visible parts (1, 2–5).
  - It is one calm phone look that uses the computer room's language: the same buttons, colours, radii, icons and
    words, in fewer and plainer pieces.
  - It covers:
    - the upright room;
    - the 🔍 / ＋ / ⋯ sheets;
    - the empty room;
    - sideways with a video;
    - the join card and the home page on a phone.
  - "Fast" means:
    - no blur;
    - no heavy shadows;
    - no new images;
    - CSS that gets smaller, not bigger.
  - If there is a real choice, Design gives the Planner 2–3 options with previews and one marked recommended; the
    owner picks in the Planner chat.
  - Lane A can start the join sound fix (7) and the text-based harness selectors meanwhile.
- Owner's pick: council + Planner review, owner's answers in the Planner chat, 13 Nov 2026 (remove: duplicates + test,
  ⋯ settings duplicates; 🔍 beside the message box; promote: empty-room buttons, chat sideways, no extension box on the
  home page, ❓ Help in ⋯). Kept on purpose: ⏩ Speed, 📌 Pin, ⏭ Skip, 🔄 Sync, 💾 Save room, the Shorts ⋯.

### QA1. Faster CI and fewer bugs reaching the owner (owner, 10 Nov 2026: "why do tests take so long, weren't we cutting them? and how are there so many bugs with this many tests?"; B2, ops)
- Why: a PR's CI takes ~15–20 min (the `site` job ~15 min, ~4–5 min of it installing), each main run (deploy + live e2e) ~25 min, and
  releases go one after another, so a small fix needs ~45 min to be live. Harnesses grew with every card. Meanwhile the
  owner still finds bugs in his first minutes: the checks test what each card named, not what a person sees in states
  nobody listed (side panel closed, YouTube room, a 1366 laptop, real mouse hover), and they never judge "looks right".
- Done when:
  1. **Speed:** a measured table of every CI job and step (median of the last 10 runs) in `docs/internal/architecture/`
     (CI section); install time cut (cache `node_modules` / Playwright deps keyed on the lockfile); jobs rebalanced so the
     longest PR job is ≤ 10 min; nothing skipped, no `paths-ignore` (CLAUDE.md), no check weakened. Report before → after.
  2. **State matrix for game windows and the room's right column:** one harness that opens every game in each allowed
     place × {side panel open, closed} × {YouTube, file, no video} × {1366, 1920, tablet} and checks: nothing cut off,
     nothing over a YouTube player, no free window over the video unless dragged, every head button visibly does
     something. Real-mouse checks (hover, drag, resize) run headful under `xvfb-run`.
  3. **A "first look" review before merging any UI change:** the PR attaches screenshots at 1366, 1920, tablet and phone
     of every screen it touched, and a fresh reviewer (a subagent given only the screenshots + CLAUDE.md product rules,
     not the developer's reasoning) lists what looks wrong; the developer fixes or answers each line in the PR. Written
     into CLAUDE.md §9 by the Planner once B2 has the tooling (`scripts/shots.mjs` or similar).
  4. **Fewer, fuller releases:** the Planner batches small fixes into one release per lane where it can (less waiting
     on deploy + live e2e); no change for B2.
- Tests: the new harness in CI; CI timings before/after in the PR.
- Owner's pick: none needed (technical).

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
