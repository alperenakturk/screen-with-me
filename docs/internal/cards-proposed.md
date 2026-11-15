# Proposed cards (Security / Research suggestions)

Moved out of `CARDS.md` on 15 Nov 2026 to keep the board small (the owner's round of 15 Nov). The Planner and the
owner decide whether a card here becomes Ready; then it moves back to `CARDS.md` "Ready".

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
