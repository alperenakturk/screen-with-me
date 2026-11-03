# Job cards (the board)

Owner's rule (2 Nov 2026): one board for every session. The **Planner** writes and orders cards; the **Developer** takes
the top **Ready** card, moves it to **In progress**, and when it is live adds `Done: <PR link>` and moves it to
**Done**. **Security** and **Research** add their suggestions under **Proposed**; the Planner and the owner decide
whether they become Ready. Roles and rules: `CLAUDE.md` "Sessions as an office". The order follows `ROADMAP.md`
"Focus: now / next / frozen"; the owner's tick view is https://claude.ai/artifact/EtqKiBo8k5vgR422rq14K5.

Card format:

```
### <short title>
- Why: <one line>
- Done when: <what can be checked>
- Tests: <unit / e2e / harness / owner's hand test>
- Owner's pick: <link or "none needed">
```

## In progress

## Ready

## Run order to the owner's test round (owner, 3 Nov 2026: "do all of 1–11, I test everything at the end")

Two Developer lanes so the work moves faster; lane B lives mostly in new files (games, players) and rebases on lane A.
Each card still ships with its tests; hand tests go to `STATUS.md` for the owner's one big test round at the end.

**Lane A (Developer, `session_015Fyri2WkmxwEfieZ1jto4L`):** 6d → 6e empty-room rail → **R3-1** (high, right after 6e) →
6c Sidelit (0.9.95) → 9 feedback button (with R3-7) → 10 Shorts channel + country → 11 thanks page → 12 debug panel →
14 cinema mode → 16 design sweep → T tablet → A11y accessibility → **Y1 → Y2 → Y3** (YouTube audit prep) → security
cards (M2, M3, M4, M5, M6, L1, L4, L2+L3+L5, L6, L7+L8, L9, L10, R3-2, R3-5, R3-6, R3-8; M8 stays with the frozen TV;
R3-3 goes with the domain) → the Security session's new findings → bug-hunt findings. Everything here lands by
**0.9.99** (owner, 3 Nov 2026: version plan in `ROADMAP.md`).
**Lane B (Developer B, `session_015Fyri6bkmZm4WdgzAWHpMc`):** 🍿 Snack Bar → GG games gallery window → 🌱 Window Garden → 🔤 Five
Frames (the daily word game) → move-to-device code → P1 Vimeo → P2 podcasts.
**Not in this round:** 13 Shorts measurement (needs the owner's real Chrome; part of his test round), Shorts door
(0.9.95+ growth), G1–G5 (launch), the privacy policy rewrite + terms (the "official work" step after the test round).
**After both lanes:** Planner runs the council review (harsh feedback on the whole app), then a bug hunt.


_Order agreed with the owner on 2 Nov 2026. Cards 1–5 close the 0.9.93 gate (owner-reported bugs + hand tests); the
rest is 0.9.94. The owner's picks on https://claude.ai/artifact/9AJXCNuwBojdibzZaX1baw: 1 = C + D, 2 = A, 3 = A, 4 = A, ideas as proposed._

### 6c. Rename the product to Sidelit + the new logo and mascot (owner's decision, 3 Nov 2026; after 6b, before 15)
- Why: owner: "change it straight to Sidelit now: the notes, the READMEs, the logo, the site, everything". The name
  is his call (council + research: `name-ideas.md` round 3, `research/name-sidelit-check.md` 🟡, trademark / domain
  checks still to do by the owner before 1.0). Logo D1 "night gold", mid-tone T1 deep teal (only where a second colour
  helps; if two colours confuse, the main logo alone), mascot N1 Glowbeam: `docs/internal/design/logo-sidelit.md`
  (Design session).
- Done when: every user-facing text says Sidelit (site pages, titles, meta / Open Graph, manifest + PWA name, i18n EN
  + TR, help / privacy / extension pages, invite texts, the extension's name, popup, store texts in `web-store.md`,
  `store/src` shots, README.md + README.tr.md); `logo.ts` + `make-icons.mjs` draw D1 (with the ≤ 32 px simple cut),
  icons / favicon / apple-touch / maskable regenerated, the mascot N1 replaces the old face where the mascot appears
  (home preview, empty states, theme mascots only if cheap, else a follow-up card); docs and CLAUDE.md say Sidelit
  for the product ("formerly ScreenWithMe" once in README / CLAUDE.md). **Unchanged on purpose:** the live address
  (`screen-with-me.swm-server.workers.dev` until the own domain), the repo name, storage keys, message `source`
  strings, protocol, the extension id: nothing a user has saved breaks.
- Tests: all harnesses / e2e pass; a grep check in CI (or a unit test) that no user-facing string says "ScreenWithMe"
  except the "formerly" lines; icons readable at 16 px (screenshot); owner's hand test (home, room, extension popup,
  phone home-screen icon).
- Owner's pick: done (Sidelit, D1, T1, N1). **Release it as 0.9.95** (owner, 3 Nov 2026: "make it official, I'm
  speeding up the launch"); the remaining 0.9.94 cards keep their place after it.

### 6e. The rail in the empty room too (owner, 3 Nov 2026; lane A, after 6d)
- Why: owner: before any video, people should already be able to open the camera, join voice, open a game or emojis.
- Done when: in `.room.fresh` the right rail shows 😀, 🎮, 🎙, 📷, ⋯; video controls (play / pause, speed, next, pin,
  sync, ⛶) are dimmed and only show "add a video first" when pressed. Changes card 6's "D" on this point only.
- Tests: room-more / fresh harness: rail visible in an empty room, 🎮 opens the games, 🎙 joins, play / speed disabled.
- Owner's pick: done.

### GG. Games gallery window with covers (owner, 3 Nov 2026; lane B, after Snack Bar)
- Why: owner: pressing games should open its own window where every game shows as a card with its cover, and the
  player picks from there.
- Done when: 🎮 opens a window (free window / side panel / phone sheet, no scrolling) with cards + covers for XOX,
  Connect Four, Draw & Guess, Quiz (room games) and Snack Bar, Window Garden, the word game ("play on the side"); a
  card opens its game the same way as today; covers from the Design session.
- Tests: harness: the gallery opens from the rail, the phone ⋯ and the Shorts bar; every card opens its game; fits at
  340×300 and 360×460.
- Owner's pick (3 Nov 2026, https://claude.ai/artifact/XsUvwg9YL6KugDVP6VggMR): layout **B, two tabs** ("Together" / "On the
  side"), covers ~160 px, the side tab shows each game's progress, reopens on the last tab.

### T. Tablet layout (lane A; 0.9.95 gate)
- Why: ROADMAP §1 "Tablet support": iPad / Android tablets upright and sideways get their own layout (today tablets
  fall between phone and computer).
- Done when: room, Shorts view, games, cameras, rail and fullscreen fit 768–1366 px touch screens upright and sideways
  without scrolling; iPad fullscreen and split view handled; no extension on tablets (site only).
- Tests: a `scripts/harness/tablet` (iPad + Galaxy Tab emulation, both orientations); owner's real tablet later.
- Owner's pick: none needed.

### A11y. Accessibility pass (lane A; 0.9.95 gate)
- Why: ROADMAP §1 "Accessibility": WCAG AA contrast (with the new Sidelit colours), keyboard tour, focus states,
  screen-reader labels, reduced motion.
- Done when: an automated contrast + label check (axe-core in a harness, dev-only dependency) passes on home, join,
  room, settings, help; every control reachable and visible with the keyboard; reduced motion respected everywhere.
- Tests: the axe harness in CI; a keyboard-tour harness.
- Owner's pick: none needed.

### P1. Vimeo player without the extension (lane B)
- Why: owner's idea (2 Nov 2026), Research's #1 (`research/more-players.md`): full control via player.js.
- Done when: Vimeo links play on the site in sync (play / pause / seek / time; rate fixed at 1× unless PRO), CSP +
  privacy policy updated, title from oEmbed.
- Tests: a harness with a fake player speaking player.js's postMessage protocol (like `tiktok/run.cjs`); owner's real check.
- Owner's pick: done (owner: "do all of 1–11").

### P2. Podcasts (lane B)
- Why: Research's #2: iTunes Search (free, no key) → RSS → the episode is an audio file our `html5` kind already syncs.
- Done when: a podcast search (words in the link box with a "Podcasts" source) lists episodes; one plays in sync for
  everyone with an audio-only view (cover art, no video box); CSP `media-src` widened only as needed (security review).
- Tests: unit (RSS parsing), harness with a local RSS + mp3; owner's real check.
- Owner's pick: done.

### 3. Owner's hand tests 0.9.92.3 – 0.9.93.5 (0.9.93 "Now" 3)
- Why: the 0.9.93 gate needs them.
- Done when: every box in `STATUS.md` "Owner's hand tests" for these versions is ticked or turned into a bug card.
  The owner works from the ordered PDF checklist (2 Nov 2026) and sends results to the Planner.
- Tests: the owner's own (computer, phone, Shorts, first-time path, hotspot).
- Owner's pick: none needed.

### 9. "Send feedback" button (0.9.94 "Next" 3)
- Why: the closed beta and the launch need an easy way for people to tell us what broke (ROADMAP §2, §7).
- Done when: "Send feedback" in ⋯, the profile menu and the Help page opens a short form (what happened, optional
  e-mail, an unticked "attach technical info" box: site + extension version, browser, transport, last `/baglanti`
  result; never room id, names or chat); a Worker endpoint opens a `feedback`-labelled issue in the private repo with
  a fine-grained token (`FEEDBACK_GITHUB_TOKEN` secret, issues: write on this repo only); per-IP rate limit, no IP
  stored; e-mail addresses only in the issue body; privacy policy (EN + TR) names it.
- Tests: unit (payload builder, validation); e2e for the endpoint with the token off (`off` answer) and limits;
  harness opens the form on computer + phone; owner's hand test after the token is set.
- Owner's pick: A, in-site form → GitHub issue (2 Nov 2026). **Owner action:** create the token and add it as a repo
  secret when the Developer asks (steps in the PR).

### 10. Shorts: a feed from one channel + Discover by region (0.9.94 "Next" 4)
- Why: owner, 1 Nov 2026: type a channel and get its Shorts; Discover should show the viewer's country.
- Done when: the ♾ window accepts a channel link / @handle / name and starts that channel's Shorts feed (uploads
  playlist, reusing the `like` path; cached per channel and day); Discover uses the connection's country from
  Cloudflare (`cf.country`, never stored) with a "🌍 Country ▾" chip of about 10 countries + "World" (one pool per
  kind + country + day); quota cost per new query written down; privacy policy mentions the country use.
- Tests: unit tests for channel input parsing; Worker e2e with `YOUTUBE_API_KEY` off and the region validated;
  `shorts-rail/run.cjs` still passes; owner's hand test with a real channel.
- Owner's pick: A, viewer's country, changeable (2 Nov 2026).

### 11. Thanks page (0.9.94 "Next" 5)
- Why: owner, 1 Nov 2026: credit the people who helped by testing.
- Done when: `/thanks` (EN, `?lang=tr`) with the names the owner sends (only people who said yes) and a short
  thank-you; linked from the footer and the Help page; the feedback form gets an unticked "Credit me on the Thanks
  page" box when the closed beta starts.
- Tests: static page check in the same harness as Help.
- Owner's pick: A (2 Nov 2026). Names who said yes (owner, 3 Nov 2026): Tecem Öztürk, Feyza Hacıalioğlu, Ömer Tuğrul
  Bakan, Ahmet Faruk Uğurluoğlu, Nevin Senem Kanar, Mert Arı (exactly as written, Turkish letters kept).

### 12. Hidden test panel `?debug=1` (0.9.94, before the Shorts measurement)
- Why: the owner tests from his phone without a computer; it gathers `/baglanti`, `?olcum=1`, `?tvlab=1`, version,
  transport, sync stats, recent errors (copy button), feature switches and "start as a first-time visitor".
- Done when: `?debug=1` once in a tab shows the panel; `?debug=0` hides it; normal users never see it; no personal data.
- Tests: harness opens it and checks each part; a normal visit shows nothing.
- Owner's pick: agreed 2 Nov 2026 (ideas list).

### 13. Shorts scrolling, really good: measure and preload (0.9.94, alongside)
- Why: owner, 29 Oct 2026: "working is not enough, make it great"; the 0.9.94 gate needs the switch measurement
  written down (preload if > 300 ms).
- Done when: the owner and a friend measured the switch gap with `?olcum=1` in real Chrome (5+ switches, numbers in
  `STATUS.md`); if the average is > 300 ms a hidden preload player for the next Short is built (YouTube's rules
  checked: nothing of ours over the player); otherwise the measurement is recorded and the card closes.
- Tests: owner's hand measurement first; for a preload player a harness with a fake YouTube player (like the TikTok
  stand-in) checks the next Short is cued before the switch; `shorts-rail/run.cjs` still passes.
- Owner's pick: none needed for the code; the owner's measurement is the first step (hand test).

### 14. Cinema mode (0.9.94, owner's new feature)
- Why: owner, 2 Nov 2026: the ⇥ "hide the side panel" button should be a real cinema mode: the page around the video
  goes dark, like YouTube. He asked Claude to design it (it was a Phase 2 idea; now pulled into 0.9.94).
- Done when (Planner's design, the owner may change it): ⇥ becomes "Cinema mode" (rail ⋯ and shortcut **T**, like
  YouTube's theater key; also in the shortcuts card); entering it fades the page around the video to near-black in
  300 ms (theme scene, aura and side panel hidden; `prefers-reduced-motion`: no fade), the video grows to the largest
  16:9 that fits the window, the top bar slides away and returns when the mouse reaches the top edge, the rail stays
  beside the video, chat comes in as the existing top-right messages with an unread count on 💬, and the "everyone
  ready" / invite cards keep working; Esc (when nothing else is open) or T or the button leaves; remembered per tab;
  computer only (phones already watch edge to edge); not on the film page in this card.
- Tests: harness: enter / leave with the button, T and Esc; nothing but the video and the rail visible; messages
  arrive as toasts; no page scroll at 1366×768 and 1920×1080; owner's hand test.
- Owner's pick: Claude designs (owner, 2 Nov 2026); the design above is shown to him in the report.

### 16. Design bug sweep (0.9.94, end of the step)
- Why: owner, 2 Nov 2026: go through the whole design for mistakes; the owner should not have to find each one.
- Done when: the Developer screenshots every screen (home, join, empty room, YouTube, file, Shorts, games, settings,
  dialogs, invite, film page, `/baglanti`, privacy) at 1920×1080, 1366×768, 1024×640, 390×844 and sideways, in EN and
  TR, in a plain and a scene theme; every problem found (overflow, cut text, overlap, scrollbars, misalignment,
  contrast, mixed languages, inconsistent icons) is listed in `STATUS.md` and fixed or turned into a card; the list
  of screenshots is attached to the PR.
- Tests: the screenshot harness itself, kept for later sweeps; all harnesses pass.
- Owner's pick: none needed.

## Proposed

(Security and Research add cards here.)

_Planner, 2 Nov 2026: Security review 2 (`security-review-2.md`): H1 + M1 became Ready 1a / 1b, H2 became 6a. M3, M5,
M6 and the policy card go before the YouTube API audit (0.9.97 / 0.9.98); M8 before the TV leaves the lab; the rest
before 1.0. Owner questions (policy details, branch protection, names before joining) are being asked._

_Planner, 2 Nov 2026: Research's "first view", "Help / FAQ order" and "Send feedback with diagnostics" were folded
into Ready cards 6, 7 and 9; "Extension permission explainer" became card 8; the debug panel became card 12._

### "Scroll Shorts together" page / home-page door (Research)
- Why: people search for "watch YouTube Shorts / TikTok together"; the only competitor with pages for it (TandemParty)
  needs a host computer + extension and only the host scrolls; ours works on phones, no install, anyone swipes.
  Details: `research/newcomers-help-shorts.md` §4.
- Done when: a home-page door (and a small English-first page) "Scroll Shorts together" creates a room that opens
  straight into the Shorts view with 🎲 Discover; no service is named beyond YouTube Shorts / TikTok.
- Tests: e2e / harness: the door creates a room in the Shorts view with a feed starting.
- Owner's pick: copy and whether it is a page or only a home door. Planner: 0.9.95 (owner agreed 2 Nov 2026).

Cards from `security-review-3.md` (3 Nov 2026, `main` at 0.9.93.18), most severe first (R3 = review 3). Details,
file:line references, scenarios and the owner's Cloudflare / GitHub / Google steps are in the review.

### Security: no uncapped request body in a room (R3-1)
- Severity: high
- Why: `POST /api/rooms/:id/unsave` reads the whole body inside the room object; one chunked ~100 MB request from
  anyone with the room link resets the room and drops everyone (the H1 crash through another door).
- Done when: the Worker refuses an `unsave` POST without `Content-Length` or above ~1 KB; the object reads it with a
  capped reader (shared with `fallback.ts`); a per-IP limit on `/info` + `/unsave` (with the M4 card); a code comment
  states the rule "no Durable Object reads a request body without a cap".
- Tests: e2e (chunked oversize `unsave` → refused and the room still answers; a normal unsave by the host still works).
- Owner's pick: none needed.

### Security: secrets only in the deploy step (R3-2)
- Severity: medium
- Why: the Cloudflare token and the YouTube key sit in the environment of `npm ci`, the build and the live e2e, so a
  compromised dependency's install script or build plugin could read them and deploy to the account.
- Done when: the three secrets are set only on the "Deploy to Cloudflare" step (step-level `env:`, never job- or
  workflow-level); the key check uses `secrets` in an `if:`; the workflow has `permissions: contents: read`.
  Planner note (3 Nov 2026): the repo is private on GitHub Free, which has no Environments with branch rules for private
  repos, so the `production` environment part waits until the repo is public or paid; step-level secrets need no owner
  action.
- Tests: CI green on a PR; the next merge deploys and the live e2e passes; the install / build steps' environment has
  no `CLOUDFLARE_*` / `YOUTUBE_*` (a quick `env | grep -c` step that prints 0, removed afterwards).
- Owner's pick: none needed now (the environment part later).

### Y1. YouTube branding + Terms link next to search results (audit prep, from Research)
- Why: YouTube Developer Policies III.F.2 / III.A.1: every feature showing YouTube API results must make clear they come
  from YouTube and link YouTube's Terms of Service; the audit (`research/store-and-youtube-audit.md`) marks it 🟡.
- Done when: the link-box search results, Shorts search (＋ Add), 🎲 Discover and ✨ More like this show a small
  "from YouTube" mark per YouTube's brand guidelines (their logo file unchanged, never altered or recoloured) and a
  "YouTube Terms of Service" link (opens in a new tab); EN + TR; computer + phone; the Help page says the same.
- Tests: harness or e2e checks the mark + link exist in each of the four places; screenshot at phone width.
- Owner's pick: none needed.

### Y2. Stored YouTube titles never older than 30 days (audit prep, from Research)
- Why: YouTube allows keeping non-authorized API data (titles) at most 30 days; a saved room's queue, `history` and
  `lastRoom` can live longer while the room is used.
- Done when: every stored YouTube title carries the time it was fetched; older than 30 days → refreshed on next use
  (oEmbed / videos.list) or dropped to a neutral "YouTube video"; search / pool / like caches stay ≤ 24 h (already);
  the privacy policy line about retention matches.
- Tests: unit (a 31-day-old title is refreshed or dropped, a 29-day one kept); e2e on a saved room with a fake clock or
  a seeded old record.
- Owner's pick: none needed.

### Y3. Usage counters for the YouTube quota form (audit prep, from Research)
- Why: the quota increase form asks for real daily usage; we have no numbers today.
- Done when: the Worker counts per UTC day the search / pool / like / oEmbed calls that reached YouTube and the units
  they cost (no query text, no IP, no room id), readable by the owner (e.g. `/api/youtube/usage` behind a secret header,
  or Workers Analytics Engine if free); kept ≤ 90 days.
- Tests: unit (counter adds the right units per call kind); e2e: a search raises the counter, the route without the
  header is refused.
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

### Privacy: YouTube leftovers (R3-5)
- Severity: low
- Why: the YouTube API script still comes from `www.youtube.com` (with the person's YouTube cookies where third-party
  cookies are allowed) while the policy says the player is "loaded from youtube-nocookie.com"; the CSP keeps
  `frame-src https://www.youtube.com` and `script-src https://s.ytimg.com`, probably unused.
- Done when: the policy (EN + TR) says the player code comes from youtube.com and the video frame from
  youtube-nocookie.com; the two CSP hosts are dropped if the YouTube harness still plays without them.
- Tests: `scripts/harness/yt-privacy/run.cjs` + `yt-room` with the trimmed CSP, no CSP violations in the console.
- Owner's pick: none needed.

### Security: fallback sessions per IP (R3-6)
- Severity: low
- Why: in a room with many custom emojis and chat images, two or three idle fallback sessions from one IP keep the
  object's 24 M budget full, so real hotspot users are closed with `1009 overflow`.
- Done when: at most ~3 fallback sessions per IP hash per object; a broadcast string counts once across sessions (or
  join images are sent after the first poll, in pages).
- Tests: e2e `fallback.mjs` (a 4th session from one IP refused; a second IP still joins a full-emoji room);
  hotspot harness still passes.
- Owner's pick: none needed.

### Security: requirements for the feedback endpoint (R3-7, with card 9)
- Severity: low (preventive)
- Why: card 9 writes user text into GitHub issues with a token; without limits it can flood the repo, ping people with
  `@` mentions or leak more than intended.
- Done when: fine-grained token = Issues: write on this repo only, with an expiry; `Origin` required; per-IP limit
  (≈ 3 / hour) and a global daily cap (≈ 50); body size capped while reading; text in a code block, `@` / `#123`
  neutralised; no IP, room id, names or chat stored; the optional e-mail and its retention named in the privacy
  policy; Turnstile only if spam appears.
- Tests: unit (payload builder escapes `@user`, `#1`, long text cut); e2e with the token off (`off`), limits, oversize
  body refused.
- Owner's pick: none needed (the owner creates the token when card 9 asks).

Cards from `security-review-2.md` (2 Nov 2026, `main` at 0.9.93.5), most severe first. Each card names its finding id
(H = high, M = medium, L = low); the details, file:line references and attack scenarios are in the review.

### Privacy: rewrite the privacy policy for KVKK + GDPR (H3, M7)
- Severity: high
- Why: the policy has no data controller, legal basis, rights and how to use them, transfers abroad, minimum age,
  complaint authority or exact date, and several facts are incomplete ("never shared with anyone", where names are
  kept, browser-id purposes, room info shown before joining, device labels, local keys, third-party requests, Life
  Poker); the Web Store data form has the same gaps.
- Done when: `privacy.html` (TR + EN, same content) covers every item in `security-review-2.md` §3 H3 and M7 with a
  dated change line; `docs/internal/web-store.md` lists voice / camera / chat images and `scripting`; a one-page breach
  plan exists in `docs/internal/`; the owner has had it read by a lawyer before the store submission.
- Tests: review against the stored-data table in `security-review-2.md`; owner's read-through.
- Owner's pick (2 Nov 2026, https://claude.ai/artifact/S9PHD4qRh8uaM2ehzHka6T): controller "Alperen Aktürk", contact screenwithme.app@gmail.com (the support
  address of the own domain later; no postal address); minimum age 13+, with "under 16 you need a parent's
  permission"; a lawyer reads policy + terms before the store submission if the owner can find one (not blocking);
  the up-to-3 names on the join card stay and the policy says so (M7). Planner: before the YouTube API audit (0.9.98).

### Privacy: a secret in the IP hash (M5)
- Severity: medium
- Why: the IP hash is an unsalted SHA-256, so every IPv4 address can be recovered from it; the policy calls it
  scrambled.
- Done when: `ipKey` is an HMAC with a Worker secret (rotated daily or a daily derived key), rate limits still work,
  and the policy describes it as it is (incl. chat images counted per IP).
- Tests: unit (same IP same day → same key, different day → different key), e2e emoji / image limits still pass.
- Owner's pick: none needed.

### Privacy: no search words in our logs (M6)
- Severity: medium
- Why: Workers Logs keep `/api/youtube/search?q=<words>` with the caller's IP metadata, which contradicts the policy's
  "by the words, not by person".
- Done when: search words travel in a POST body (or are otherwise kept out of logged URLs), and the policy names our
  own logs and their retention.
- Tests: e2e `search.mjs`; a local check that the logged URL has no `q`.
- Owner's pick: none needed.

### Security: a daily YouTube quota budget (M3)
- Severity: medium
- Why: scripts without an `Origin` may search, limited only to 10 / min / IP, so one IP can spend the whole day's
  quota in ~10 minutes and turn search / Shorts feed / Discover off for everyone.
- Done when: a global daily unit budget (one Durable Object or KV counter) and a per-IP daily cap guard search, pool
  and like; the "quota" answer is used when the budget is out.
- Tests: unit for the budget logic; e2e `search.mjs` still passes.
- Owner's pick: none needed (the per-IP number can be tuned later).

### Security: rate-limit the cheap routes that wake Durable Objects (M4)
- Severity: medium
- Why: `/api/version` creates a new object per call, `/api/rooms/:id/info` and fallback `send/poll/close` with any
  `sid` reach objects without a limit; a loop can spend the daily Durable Object allowance.
- Done when: `/api/version` needs a token from the deploy job (or is strictly limited), `/info` and all fallback
  requests have per-IP limits, the Worker checks `sid` against `^[0-9a-f]{32}$` before forwarding.
- Tests: e2e (bad `sid` answered by the Worker; `/info` limit), deploy job's `wait-live.mjs` still works.
- Owner's pick: none needed.

### Security: make-host only by the real host (M2)
- Severity: medium
- Why: during the host's 20 s reload grace the oldest guest counts as host and can hand the role to themselves for good.
- Done when: `make-host` is refused unless the sender's key is `hostKey`.
- Tests: e2e `host.mjs` (host reloads, oldest guest's `make-host` → `not_host`, host returns as host).
- Owner's pick: none needed.

### Security: TV link hardening before the TV leaves the lab (M8)
- Severity: medium (only while `?tvlab=1` hides the TV)
- Why: a TV token is the whole person including host rights, a QR shown by someone else can phish it, and pairing
  codes can be guessed (limit keyed on a browser id the client chooses).
- Done when: a `tv:true` connection may only send ping / tv / listen-only voice / react; the phone confirms before
  pairing; `tv-link` is limited per IP hash and per room (plus a Worker rate limit); codes are 8 digits.
- Tests: e2e `tv.mjs` (TV connection's `kick` / `make-host` / `settings` refused; brute-force attempts limited),
  harness `tv/run.cjs`.
- Owner's pick: none needed (part of the TV version after 1.0).

### Security: one text cleaner for names, chat and titles (L1)
- Severity: low
- Why: zero-width and right-to-left control characters pass, so a guest can look exactly like the host or reverse
  the text of a message.
- Done when: one shared sanitizer (removes `\p{Cc}`, `\p{Cf}` except ZWJ inside emoji, lone surrogates; cuts by code
  point) is used for names, room names, chat, pin notes, titles (also URL file names and oEmbed) and guesses.
- Tests: unit in `protocol.test.ts` (U+200B, U+202E, U+2066, split surrogate pair).
- Owner's pick: none needed.

### Security: safer media links (L4)
- Severity: low
- Why: `html5` / `page` items accept `http:`, user-info, `localhost` and private IPs, so one guest can make every
  viewer's browser request a device on their own network; `page` titles are chosen by the client.
- Done when: `html5` needs `https:`, user-info is refused, IP literals / private / `.local` hosts are refused, the
  page's host is shown next to a client-given title.
- Tests: unit (`cleanMedia` cases); e2e queue tests still pass.
- Owner's pick: none needed.

### Security: room abuse limits (L2, L3, L5)
- Severity: low
- Why: signal floods per connection reset on reconnect, `ready:false` lets a guest pause a host-only room again
  after a reconnect, and 51 sockets that never say `hello` make a room "full" for 150 s.
- Done when: signal limits are per person and target pair (a few offers per minute per pair); the wait cooldown is
  keyed by person / IP hash; "full" counts joined members and unjoined sockets close after ~15 s.
- Tests: e2e (`voice.mjs`, `wait.mjs` additions; unjoined sockets closed).
- Owner's pick: none needed.

### Security: game rules for every player (L6)
- Severity: low
- Why: any Draw & Guess player can reset or start the game, `undo` re-sends all strokes 8 times a second, the Quiz
  50/50 joker leaks the answer with a second identity, Poker's `people` grows without a cap and anyone can deal.
- Done when: host / opener checks on Draw `reset` / `start` and Poker `start`; `undo` ≤ 1/s; one hidden 50/50 pair
  per question; Poker `people` capped; (optional) game objects accept only a short-lived ticket from the room.
  Review 3 (R3-8): game, draw, quiz and poker objects accept `hello` only once per connection, as the room does.
- Tests: e2e `draw.mjs`, `quiz.mjs` and a Poker e2e case.
- Owner's pick: none needed.

### Security: small hygiene fixes (L7, L8)
- Severity: low
- Why: the TikTok resolver's later hops may use `http:`, another port or user-info; recaps older than 90 days stay in
  storage until read; the room's reset leaves in-memory tokens that are written back.
- Done when: every TikTok hop needs `https:`, no port, no user-info, and bodies are cancelled; recaps are pruned in
  the alarm / on load; `deleteAll` also clears `tvTokens`, `memberIds`, `counted`.
- Tests: unit for the TikTok URL check; e2e recap test.
- Owner's pick: none needed.

### Privacy: a privacy link where people join (L9)
- Severity: low
- Why: the policy is only in the footer, which phones, the film page overlay and the Shorts view hide.
- Done when: the join card and the settings / ⋯ menu link to `privacy.html` in the page's language.
- Tests: phone harness check for the link.
- Owner's pick: none needed.

### Repo: dependency and workflow hygiene (L10)
- Severity: low
- Why: `npm audit` reports dev-only advisories in `undici` (via `wrangler`), there is no Dependabot, the workflow has
  no `permissions:` block, and there is no `SECURITY.md` (ROADMAP §3).
- Done when: `wrangler` updated and `npm audit` clean; `.github/dependabot.yml` (npm + actions, weekly);
  `permissions: contents: read` in `test.yml`; `SECURITY.md` with the contact address; owner turns on branch
  protection and secret scanning for `main`.
- Tests: CI green; `npm audit` 0.
- Owner's pick: needed only for the GitHub settings. Planner, 2 Nov 2026: on a private repo with GitHub Free,
  branch protection / rulesets and secret scanning are not available (paid plans, or free once the repo is public);
  the owner turns on the free parts (Dependabot alerts + security updates) now; branch rules come with the public repo
  or a GitHub Pro decision.

### 🍿 Snack Bar: first solo side game (0.9.95; owner picked it, 2 Nov 2026)
- Why: the owner wants something to play alone while watching with friends; an idle game fits low attention and
  "progress over time". Details: `research/solo-games-accounts.md` Part A.
- Done when: 🎮 has a "Play on the side" entry that opens Snack Bar in a free window / side panel / phone sheet without
  scrolling; income only while the room's video plays, capped "while you were away" bonus, +10 % per other person in
  the room (more in voice), prestige "new cinema"; silent by default; never takes the room's keys or focus; save is
  one versioned JSON in `localStorage`; lazy chunk; EN + TR strings; original look, no film names.
- Tests: unit (economy: income per watched second, cap, together bonus, prestige, save migration); harness (fits at
  phone / small free window sizes without scrollbars, room keys 1–8 / Enter still reach the room).
- Look (owner, 3 Nov 2026, https://claude.ai/artifact/WSxxSneo6NT5Y5JcVKXxLi): **A "counter scene"** (illustrated counter
  lit from the left, Glowbeam as cashier, bought items appear on the counter, upgrade rows with level bars).
- Owner's pick (2 Nov 2026): yes, the flagship, "detailed, sweet and on our theme; I'm excited about it". Not silent:
  it gets its own cute sounds (game family in `sounds.ts`, the Sounds setting and volume apply; never during speech
  ducking). Name "Snack Bar" works in English first; TR label "Büfe". Build in 0.9.95 (Focus: new features frozen
  until then); the Planner makes a clickable look-and-feel option page first.

### 🌱 Window Garden: cozy collection game (0.9.95, after Snack Bar; owner, 2 Nov 2026)
- Why: owner: "basic but meaningful, a collection feel, sweet and cozy, with sweet sounds".
- Done when: a second "Play on the side" game: plants grow over watched minutes, water now and then, seeds / rare
  plants after a film ends or a full evening together, an album of every plant found (the collection); silent-ish
  cozy sounds; same rules as Snack Bar (free window / sheet without scrolling, never takes the room's keys, one
  versioned save in `localStorage`, lazy chunk, EN + TR).
- Tests: unit (growth, seed drops, album, save migration); harness (fits small windows and phones, no scrollbars).
- Owner's pick: done (idea); look **A "window sill"** (3 Nov 2026).

### 🔤 Daily word game, English + Turkish (0.9.95, third; owner, 2 Nov 2026) ⏳ word lists first
- Why: owner: instead of random logic puzzles, a word game like the popular daily five-letter one, in English and
  Turkish; "or something similar that is easier to make".
- Done when: our own name and look (never the original's name, colours or layout: trademark); a daily word the same
  for everyone (seed by date), 6 tries, letter hints, on-screen keyboard with Turkish letters, a share line without
  spoilers; works offline. Word lists: Research finds openly licensed EN and TR lists (answers ~1–2k common words,
  allowed guesses larger) with licenses we may ship (MIT / CC0 / CC BY); if no good TR list exists, the fallback is a
  word-free daily game of the same shape (e.g. a colour / emoji code breaker), owner picks.
- Tests: unit (scoring with repeated letters, Turkish İ/ı and other letters, date seed); harness (fits a phone).
- Research (2 Nov 2026, `research/word-game.md`): EN guesses = ENABLE (public domain), EN answers = 12dicts common
  words (public domain) ∩ 5 letters + a hand pass; TR = Zemberek-NLP lexicon (Apache 2.0, 4,619 five-letter lemmas,
  ~1–1.5k hand-picked answers, rule "no suffixes"); no TDK lists; credits line + `THIRD-PARTY-NOTICES`. To stay clear of
  the original's trademark and its "copyrighted gameplay" claims: own name (no "-dle"), no 5×6 square grid (e.g. a
  ticket / film-strip row per guess, 7 tries), theme colours + ✓ / • instead of green / yellow, no QWERTY strip right
  under the board, share text without coloured squares ("🍿 Word of the day #12 · 4/7"); tr-locale İ/ı handling.
- Owner's pick: board **A "ticket row"** (3 Nov 2026); name **Five Frames** (TR **Beş Kare**), owner 3 Nov 2026.

### Move my things to another device (Research)
- Why: browser-only saves (game progress, saved rooms, emoji collection) are lost on a new phone; accounts are costly.
  Details: `research/solo-games-accounts.md` Part B, option B.
- Done when: "Move to another device" shows a 6-digit code + QR; the other device enters / scans it and receives the
  blob once via a short-lived Durable Object (TV pairing pattern, nothing stored, 10 min expiry, rate-limited); the
  privacy policy mentions it.
- Tests: e2e (code → transfer → expiry, wrong code, rate limit); unit (blob versioning / merge).
- Owner's pick: part of accounts A (2 Nov 2026): next after the side games (0.9.95+), before 1.0 if time allows.

### Accounts: owner's decision (decided 2 Nov 2026)
- Why: idle games and cross-device saves raise accounts; they touch the "no account" promise, GDPR / KVKK, Apple's
  in-app deletion rule and security. Details: `research/solo-games-accounts.md` Part B.
- Done when: the owner picked on an option page: A (browser only) / B (move code) / D (optional passkey account after
  1.0) / E (e-mail accounts), recorded in ROADMAP; research recommends A now, B next, D only if users ask.
- Tests: none (decision).
- Owner's pick (2 Nov 2026): **A, step by step, no account now**: progress in the browser, then the move-to-device
  code, an optional passkey account only after 1.0 and only if users ask; "no account" stays on the home page.
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

### Logo: direction C "Sidelit, light from the side" + mascot family (Design session; owner, 3 Nov 2026)
- Why: owner picked direction C on https://claude.ai/artifact/5dAZoG6shDuxN454YBm6ZZ and "the mascot's eyes stay in
  every case"; he wants many versions of C (small to big changes), the mascot fitted to it, and usage examples.
- Done when: the owner picked a version and a mascot variant on the Design session's page; then a Developer card
  updates `logo.ts`, `make-icons.mjs` (icons, favicon, small 16–32 px version), the store tile and `store/src` shots.
- Tests: the Developer's card: icons regenerate, favicon readable at 16 px, harness screenshots of the top bar.
- Owner's pick (3 Nov 2026, round 2): D1 night gold + T1 deep teal + N1 Glowbeam; built by card 6c. Replaced the "touch up today's mascot" pick if he chooses a C
  version; works with either name (Sidelit or ScreenWithMe).

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

### 6d. Fix: an empty side column in YouTube fullscreen (owner's bug, 3 Nov 2026; after 6b, before 6c)
- Why: owner's screenshot: in YouTube fullscreen the column from card 2a (`#fs-side`) stays as a wide empty strip
  when there are no notes, cameras or messages, pushing the video left.
- Done when: the column takes space only while it has something to show (notes / camera tiles; messages without making
  the video jump on every toast), else the player is full width beside the resting rail; still nothing over the player.
- Tests: harness: fullscreen with nothing to show → player ≈ full width; camera on → column appears; fails first.
- Owner's pick: none needed.
- Done: 0.9.93.20 (PR below). `room.ts` `updateFsSide`: `.theater.fs-side-open` only while `#fs-side-notices` shows
  a note, the camera box is up or a message toast is on screen (a message keeps it `SIDE_LINGER_MS` 8 s, so a chat
  doesn't make the video jump); closed, the player's `right` is just the rail's gutter and the column fades out (0.22 s).
  Test: `scripts/harness/yt-room/run.cjs` (fullscreen with nothing to show: no column, player full width; a message
  opens it; when the messages are gone it closes again; failed on 0.9.93.17) and `cam-fs` (YouTube fullscreen: the
  cameras are in the column).

### 15. Home page, nicer and "works on your phone" (0.9.94, owner's request)
- Why: owner, 2 Nov 2026: improve the home page; it should show it works on a phone too and feel less like a
  screenshot.
- Done when: the direction the owner picks is built (Planner prepares an option page with 2–3 directions); the hero
  shows a computer and a phone in the same room; EN first, TR; fits without scrolling on the first screen at
  1366×768; the phone home (0.9.92.5 app start screen) is unchanged unless the pick says so; Lighthouse performance
  not worse than today.
- Tests: harness screenshots at 1920, 1366, 1024, 390 px; no console errors; owner's hand test.
- Owner's pick (2 Nov 2026, https://claude.ai/artifact/FVzrwoffrJPB5atVv2xQfn): hero **A "two screens, one moment"**
  (a laptop and a phone side by side, the same video moving at the same second, a sync line between them, chat bubbles
  passing from one to the other; the slogan stays); **gently alive** motion (the video runs, bubbles drift; still with
  `prefers-reduced-motion`); right under it **a strip of 3 short features** ("No app" · "Together in voice and
  camera" · "Games in the room"), the theme picker after it; **"Continue where you left off" as one thin line above
  the title** (card 5's overflow fix goes with it).
- Done: 0.9.93.19 (PR below). `home.ts` `.home-preview.two-screens`: a laptop (`.ts-laptop`) and a phone (`.ts-phone`)
  draw the same scene and run one shared progress animation (the same second on both), a dashed sync line with a moving
  dot between them (`.ts-sync`), my message drifting over the laptop and a friend's answer passing over to the phone
  (`.ts-bubble`), faces under the laptop; everything stands still with `prefers-reduced-motion`. `.home-strip`: "No app"
  · "Together in voice and camera" · "Games in the room" (EN + TR) between the hero and the theme picker. The phone
  home (app start screen) is unchanged: the strip is hidden there like the rest of the introduction. No new images
  or scripts (CSS only), so the page weighs the same. Test: new `scripts/harness/home/run.cjs` (49 checks: 1920, 1366,
  1024 and 390 px in EN + TR, hero fits the first screen, laptop + phone + sync line, the two progress bars in step,
  strip under the hero, phone home unchanged, no sideways scroll, no console errors, reduced motion).

### 6b. Settings sections opened alone are squeezed (owner's bug, 3 Nov 2026; after card 2b)
- Why: since 0.9.93.13 (card 6) ⚙️ → My screen and the ⋯ More sections (film time, save, rules) put the section into
  the hidden section list's narrow column: rows wrapped word by word, the right side of the dialog was empty and the
  list scrolled inside (owner's screenshot).
- Done when: alone, the section uses the whole dialog, rows keep the title + description + switch layout, nothing
  scrolls inside at 1366×768; a harness measures it and fails on the old main first.
- Done: 0.9.93.18 (PR below). `#settings-dialog.solo .settings-window` is one column (620 px wide, as tall as its
  content up to the window). Test: new `scripts/harness/settings-solo/run.cjs` (48 checks: every solo section, EN + TR,
  1366×768 and 1920×1080: the section's width, no row title over 2 lines, no inner scroll; 36 of them failed on the old
  main).

### 2b. Film page: the rail opens and closes at the edge (owner's B, 3 Nov 2026; after card 8)
- Why: the owner's pick on https://claude.ai/artifact/AKcDGhoFsNjhQryjhukfeD (B, his original wish): the film page's rail
  should come and go like the site's, never over the film.
- Done when: the mouse at the film's right edge opens the column and the film narrows to make room; the mouse leaving
  closes it and the film widens again; smooth, and a mouse passing by doesn't make the film jump.
- Done: 0.9.93.17 (PR below). Resting film = a 14 px gutter of our overlay (`#rail-edge` hears the mouse there); opens
  after 140 ms at the edge, closes 450 ms after leaving; the film follows the player's `right` transition (layout
  reported every step and at `transitionend`). Film-page specifics: the overlay often never hears the mouse leave, so
  the film frames' moves count as leaving, a stale `:hover` no longer holds the rail, and Chrome's replayed last
  position after the film widens is ignored. Test: `scripts/harness/embed/run.mjs` under `xvfb-run -a` (headful, real
  mouse: opens at the edge, film narrows, closes on the film and widens, a passing mouse doesn't open it, the rail's
  windows still work); headless runs pin the rail and skip those checks (headless Chrome misroutes the mouse there).

### 8. Extension permission explainer (0.9.94, with the Help page; from Research)
- Why: scanners rate "all websites" access as critical; users and guides struggle with "read and change site data";
  trust is a top complaint (Teleparty, Rave). Details: `research/newcomers-help-shorts.md` §3.
- Done when: the extension page and the "Filme git" card say in two plain lines why the extension asks for every site,
  that it does nothing outside a room, and link to the FAQ answer; the same text is ready for the store's permission
  justifications (ROADMAP 0.9.97).
- Tests: harness / e2e that the text and link are present (EN + TR).
- Owner's pick: none needed. Owner agreed 2 Nov 2026.
- Done: 0.9.93.16 (PR below). Two plain lines (EN + TR) with a link to `help.html#permissions` ("What it can and
  cannot see"): on the extension page under "What does it do?" (`#why-all-sites`, `#why-all-sites-tr`) and on the "Go
  to the film" install card (`.external-why`, i18n `externalWhy` / `externalWhyMore`; under 760 px tall only the link,
  so the card never overflows its box). The same text is ready as the store's short permission note
  (`docs/internal/web-store.md`, next to the `<all_urls>` justification). Test: `scripts/harness/help/run.cjs` (now 37
  checks: both languages on the extension page and the card, the link, the card fits at 1366×768 and 1024×640).

### 7. Help / FAQ page, English + Turkish (0.9.94 "Next" 2)
- Why: newcomers and store reviewers need one place for "how does it work", the extension's permissions and
  troubleshooting (voice does not connect, hotspot, Brave shields, autoplay).
- Done when: `/help` (EN, `?lang=tr` for Turkish, like `privacy.html`) with sections: how it works, the extension and
  why it asks each permission, voice / camera / streams, phones, troubleshooting (links to `/baglanti`), privacy
  summary, in the order users ask first (Research §2–3: 3 steps, who needs the extension, what it can and cannot
  see, "not in sync / video not found" checklist, connection, phones, voice and IP); in-product hints link to their
  answer; linked from the footer, the profile menu, the phone ⋯ sheet and the extension page; same numbers as the
  code (limits, retention); a non-Turkish reader understands the English text (0.9.94 gate).
- Tests: static page check in a harness (loads, both languages, every in-page link resolves, CSP has no errors);
  a "same numbers" spot check against `protocol.ts` limits.
- Owner's pick: none needed (Claude writes it; the owner reads the Turkish version).
- Done: 0.9.93.15 (PR below). `apps/web/public/help.html` (EN, Turkish with `?lang=tr` or the saved language, like
  `privacy.html`): how it works (3 steps), who needs the extension, what the extension can and cannot see (each
  permission), not in sync / video not found, can't connect (links `/baglanti`), voice / cameras / streams and the IP
  note, phones, privacy in short, contact. Linked from the footer, the profile menu (❔ `#profile-help`), ⋯ More on
  the computer and the phone ("Help and FAQ"), the extension page's footer and the "can't reach the room" card
  (`#connection`). `lang.js` maps a section link to the Turkish block's `-tr` id. Test: new
  `scripts/harness/help/run.cjs` (29 checks: served with the real `_headers` CSP, no errors in both languages, every
  contents link resolves and scrolls, no sideways scroll on a phone, the numbers match `protocol.ts` / `room.ts`, the
  room's links in both languages, ⋯ opens it in a new tab).

### 6a. Privacy: YouTube privacy-enhanced embed, loaded only when needed (H2; 0.9.94, before the Help page)
- Severity: high
- Why: the player uses `www.youtube.com` and the API is preloaded on every room page, so YouTube sets cookies before
  anyone chose a video, while the policy says "none of their cookies"; this also matters for the YouTube API audit.
- Done when: `YT.Player` uses `host: 'https://www.youtube-nocookie.com'`, `iframe_api` loads only when a YouTube item
  is about to play, and the policy describes the YouTube embed like the TikTok one.
- Tests: harness (no request to `www.youtube.com` on a room page with nothing playing; YouTube plays from the
  no-cookie host); existing room / Shorts harnesses; owner's hand test of YouTube playback.
- Owner's pick: none needed.
- Done: 0.9.93.14 (PR below). `players/youtube.ts`: `YT.Player` with `host: 'https://www.youtube-nocookie.com'`; the
  room no longer preloads `iframe_api` (it loads with the first YouTube item; the TV test page still loads it when it
  tests YouTube). Privacy policy: a "YouTube videos" section (EN + TR, like TikTok's), date 3 November 2026. Test: new
  `scripts/harness/yt-privacy/run.cjs` (no request to youtube.com / ytimg.com in a room with nothing playing, computer
  and phone; the player iframe is youtube-nocookie.com/embed; the API loads with the first video). The cloud's proxy
  blocks youtube-nocookie.com, so the YouTube harnesses route it to www.youtube.com (`scripts/harness/via-youtube.cjs`);
  real browsers use the no-cookie host.


### 6. Simplify the room (0.9.94 "Next" 1)
- Why: a newcomer sees too much at once; Research found every competitor's first room view is player + add a video +
  invite (`research/newcomers-help-shorts.md` §1).
- Done when (owner picked C + D): one "⋯ More" menu with the same items and order as the phone's ⋯ sheet (film time,
  save room, recap, shortcuts, sync test, room rules); the settings dialog keeps "My screen"; until the room's first
  video plays the room shows only add a video, invite, chat and join voice (the rest appears for everyone when
  something plays, or under ⋯); every feature reachable in ≤ 2 clicks; built after card 2 (the rail is the base);
  `store/src/room.html` updated; no scrollbars at 1024×640; first-tips still find their anchors.
- Tests: harness checks (every moved item opens from its new place; empty vs playing room, computer + phone);
  `phone`, `yt-room`, `room-extras`, `invite` harnesses still pass; owner's hand test.
- Owner's pick: C + D (2 Nov 2026, https://claude.ai/artifact/9AJXCNuwBojdibzZaX1baw).
- Done: 0.9.93.13 (PR below). C: `ui/room-more.ts` `roomMoreItems` is the one list (🎮 games, ⏰ film time for the host,
  💾 save, ✨ recap, ⌨️ shortcuts on a computer, 🧪 sync test (dimmed while something plays: it would replace it), 👑
  rules); the computer's `#room-more` ⋯ right of Invite opens it as a menu (`createRoomMoreMenu`), the phone's ⋯ sheet
  shows the same tiles in the same order after its invite / queue / people; the settings dialog opens one section
  alone (`open(section, solo)`, `#settings-dialog.solo` hides the section list), ⚙️ = "My screen" only; recap and
  shortcuts left the profile menu; ⋯ → Games opens the games hall under ⋯ through an invisible `#more-game` anchor (an
  `extraButtons` of the games stage). D: `.room.fresh` until the room's first item (any `state.item`), on a computer
  the rail, Share, the queue / people tabs and the empty card's sync test are hidden. Tests: new
  `scripts/harness/room-more/run.cjs` (fresh vs playing, every ⋯ item opens, ⚙️ solo, 1024×640, phone order);
  `one-rail` (a fresh room has no rail), `phone` (tiles by name), `yt-room`, `room-extras`, `invite` pass;
  `store/src/room.html` has the ⋯.


### 5. Home page: "Continue where you left off" overflows (0.9.93, owner's bug)
- Why: owner, 2 Nov 2026 (screenshot): a long video title runs out of the card under the room preview.
- Done when: the card's lines are one line each with an ellipsis (full title in `title`), the card never overlaps the
  preview at any width from 860 px up, and on phones.
- Tests: a harness check with a 200-character title at 1920, 1366, 1024 and 390 px; owner's hand test.
- Owner's pick: none needed.
- Done: 0.9.93.12 (PR below), in the shape the Planner gave (so card 15 only restyles around it): one thin line above
  the title (`.home-continue`, a pill; the whole line `a.continue-link` back into the room, cut with an ellipsis, the
  full text in its `title`; ✕ forgets it). Test: `room-extras` checks a 200-character title and room name at 1920, 1366,
  1024 and 390 px (one line, inside the left column, above the title, never over the preview).


### 4. Invite window: a real WhatsApp button and a QR tab (0.9.93, owner's feedback)
- Why: owner, 2 Nov 2026: the WhatsApp button shows a speech-bubble emoji; the QR text "A friend next to you can scan
  it with their phone's camera" reads badly.
- Done when: the WhatsApp button carries WhatsApp's own glyph (inline SVG, green as in WhatsApp's brand guidelines for
  share buttons, text "WhatsApp"); the window has two tabs "Link" and "QR"; the QR tab shows only the QR code (big)
  with "Copy image" (PNG to the clipboard, falls back to download) and no explanation sentence; EN + TR; fits without
  scrolling at 1024×640 and on a phone.
- Tests: `invite/run.cjs` updated (+ tab switch, copy image, no scroll); owner's hand test.
- Owner's pick: done (owner's words); the WhatsApp glyph follows WhatsApp's brand rules.
- Done: 0.9.93.11 (PR below). `ui/invite.ts`: tabs "Link" / "QR code" (`.invite-tabs`, `role=tablist`); the WhatsApp
  button carries WhatsApp's glyph (Simple Icons path, CC0, inline SVG) on WhatsApp green #25D366 with dark text for
  contrast; the QR tab shows the code big (`min(240px, 42dvh, 70vw)`, white frame) and "Copy image" (`qrPng`: 512 px
  PNG via a canvas → `ClipboardItem`; without an image clipboard it downloads `screenwithme-invite-qr.png`); the old
  explanation sentence (`invite.qr`) is gone; EN + TR. Test: `invite/run.cjs` (glyph + green, tabs, the QR tab's only
  text is "Copy image", a PNG on the clipboard, both tabs without scrolling at 1024×640, the QR tab on an iPhone 13).


### 2a. Nothing of ours over the YouTube player by itself (owner picked D, 2 Nov 2026; with card 2)
- Why: the same rule covers the see-through `#rail-edge` strip over the player's right edge, flying emojis over the
  video in the room view, the "3-2-1" countdown and notes over the video, and the dock / toasts / cameras over a YouTube
  player in fullscreen. Details and a recommendation per item (split layout: cameras and messages in a column
  beside the player, also in fullscreen): `research/youtube-overlay-rail.md` "Follow-up (Job 3)".
- Done when: the owner's D below is built; a harness asserts that, with nobody dragging anything, no element of ours
  intersects the YouTube iframe's box in the room view, Shorts view and fullscreen (popups only while open).
- Tests: harness overlap check in the room view, Shorts view and fullscreen.
- Owner's pick (2 Nov 2026, https://claude.ai/artifact/S9PHD4qRh8uaM2ehzHka6T): **D, like Watch2Gether**: on YouTube
  nothing of ours sits over the player by itself: `#rail-edge` goes (the edge is found from a thin gutter beside the
  player + document mousemove), flying emojis rise beside the video from the sender's face, the 3-2-1 countdown and
  notes sit above the video or in `.yt-notices`, in fullscreen the player shrinks for a side column with the camera
  strip (1–4 tiles) and the newest messages; automatic tile columns and reset positions never land on the player.
  Allowed: the person drags a camera window over the player themselves, and our popups (emojis, ⋯, settings) may
  open over it while open. The small remaining audit risk is accepted in writing (this card). Video files and film
  pages keep today's behaviour.
- Done: 0.9.93.10 (PR below). YouTube only (video files and film pages unchanged): `#rail-edge` moved off the player
  into a 14 px gutter beside it (`--edge-gutter`, the resting player ends there); emojis rise from the sender's face
  (`reactions.showFrom` + `reactionAnchor`, brought back from 0.9.92.9; with the side panel hidden or in fullscreen from
  the rail's 😀, which opens for a moment via `fullscreen.showRail()`); the 3-2-1 countdown is one of the notes
  (`NOTICES`, a card above the message box); fullscreen on a computer (`.theater.yt-fs`) has a column `#fs-side`
  between the player and the rail with the notes (`#fs-side-notices`), the cameras (`cam-float.ts` `sideColumn()`:
  automatic tile places, the pill and the one window default there; a place the person dragged is kept) and the
  newest messages at its bottom; "who paused" is hidden there. Tests: `yt-room` checks nothing of ours meets the
  YouTube frame resting, in the room view, fullscreen and the Shorts view (plus emojis, notes, messages, the gutter);
  `cam-fs` checks both camera layouts sit in the column in YouTube fullscreen. Also: `draw.mjs` waited for the words
  but read the previous state (the server sends `choices` just before `state`; live they can arrive apart): it now
  waits for the next round's "choose" state (0.9.93.9 deploy, first-attempt failure).


### 2. One rail everywhere: empty room and the film page (0.9.93 "Now" 1, owner's request)
- Why: owner, 2 Nov 2026: an empty room still shows the old bar under the video (😀 React, Games, Sync, 1×, ⇥, ⛶), and
  the extension's film page shows that bar and a rail at the same time. He wants the same right rail on every page:
  empty room, YouTube, video files, the film page; no bar under the video anywhere on a computer.
- Done when: on a computer the toolbar under the video is gone in every state (empty room, YouTube, file, test, film
  page in the shell); everything it held is in the rail or its ⋯ (Games, Pin, Sync, speed, Next, side panel / cinema
  mode, fullscreen); the empty room's rail shows only what makes sense with no video (😀, 🎮, 🎙 / 📷, ⋯, ⛶ dimmed);
  the rail's look follows Research's verdict "Rail look on YouTube": allowed → the film page's translucent rail over
  the video's edge everywhere; not allowed → everywhere (film page too) a rail that opens and closes, placed by the
  video's size, never covering the video; phones unchanged; `store/src/room.html` copy updated.
- Tests: `yt-room`, `embed/run.mjs` (film page: no toolbar, rail islands), `phone/run.cjs` still pass; new checks for
  the empty room; owner's hand test on the site and the film page.
- Owner's pick: done (one rail everywhere). Research verdict (2 Nov 2026, `research/youtube-overlay-rail.md`): an
  overlay on the YouTube player is **not allowed** (Required Minimum Functionality "Overlays and frames"), so the owner's
  rule applies: everywhere, the film page too, the rail opens and closes beside the video, placed by the video's size,
  never covering it. Extra test: `embed/run.mjs` checks the rail's box never intersects the film video's box.
- Done: 0.9.93.9 (PR below). The rail (`fs-dock`) is now on every computer page: `renderDock` also docks with no player
  (`rail-bare`: the empty room or a film card on the site, always out, 📌 / ⛶ dimmed) and marks every docked theater
  `side-rail`, so the YouTube column rules apply to all players (the video / empty card / overlays end at the rail,
  never under it). The toolbar under the video is hidden on the film page too; there the rail is a column that stays
  out (`railFixed`: the film is fitted once, left of it, instead of on every edge visit), ⋯ is back (speed, sync, next;
  not the side-panel item) and 🎮 is on it; the hole and its islands are the `#player` box left of the rail. Video files
  and the sync test follow YouTube: the rail comes at the right edge and the video makes room. Tests: new
  `scripts/harness/one-rail/run.cjs` (13 checks: empty room, file, fullscreen, sync test), `embed/run.mjs` (no toolbar,
  rail beside the film's video box in the room view and fullscreen, stays out while the film plays), `phone/run.cjs`,
  `yt-room`, `sound`. `store/src/room.html` shows the rail.


### 1a. Security: the HTTP fallback must not be able to crash a room (H1, M1; Planner: right after card 1)
- Severity: high
- Why: one person with the room link can reset the room's Durable Object (everyone drops) with a chunked POST body
  that is read uncapped, or with fallback sessions that never poll while repeated `hello`s queue every sticker and
  chat image (16 MB allowed per session).
- Done when: fallback POST bodies are read as a stream and stopped at `SEND_BODY_BYTES` (no body read for
  `open` / `close`); `QUEUE_BYTES` is 2–4 MB and the total per `PollHub` is capped; a session that does not poll within
  ~10 s of `open` is closed; a second `hello` on a joined connection is refused (or may not change the `cid`).
- Tests: e2e (chunked oversize POST → 413 and the room still answers; a session that never polls is closed; a second
  `hello` is refused), `fallback.mjs` and the hotspot harness still pass.
- Owner's pick: none needed.
- Done: 0.9.93.8 (PR below). `send` bodies are read as a stream and stopped at `SEND_BODY_BYTES` (`readCapped`; other
  bodies are cancelled unread); a session may queue 11 M characters (one full join into a room with 24 custom emojis +
  12 chat images is ≈ 10.1 M, so 2–4 MB would have closed real joins) and all sessions of an object 24 M together
  (`HUB_BYTES`); a session that has not polled 10 s after `open` is closed (sweep every 5 s); a second `hello` on a
  joined connection gets `bad_message`. Tests: `fallback.mjs` (chunked 2.5 MB body → 413 and the room still answers,
  a never-polling session closed after 10 s, second hello refused), hotspot harness.


### 1b. Security: cap queue votes (M1; with 1a)
- Severity: medium
- Why: `voters` grows without a cap and without checking the voter is present; with rotated browser ids it can pass
  the storage value limit and freeze the room's queue.
- Done when: voters per item are capped (e.g. `MAX_MEMBERS`) and only people in the room count; the second-`hello`
  fix from the card above is in.
- Tests: e2e (many votes from one connection with changing ids count once / stay capped).
- Owner's pick: none needed.
- Done: 0.9.93.8 (same PR). Votes keep only people in the room (pruned on every vote) and at most `MAX_MEMBERS` per
  item. Test: `fallback.mjs` (rotated ids count once, a second person adds one, back to 1 when they leave).


### 1. Fix: the rail never hides in YouTube fullscreen (0.9.93 "Now" 1, owner's bug)
- Why: owner, 2 Nov 2026 (screenshot, after 0.9.93.5): in fullscreen, with the mouse moved to the middle of the video,
  the right rail (💬 😀 📌 🎮 🎙 📷 ⋯ ⛶, mic and camera red because not in voice) stays however long he waits.
- Done when: in fullscreen and in the window the rail rests (`.dock-idle`) `HIDE_MS` after the mouse leaves the right
  edge, whatever was pressed before (rail buttons, Esc, shortcuts, emoji, the message box empty); root cause written in
  `STATUS.md`; the same check on the film page's rail.
- Tests: a `yt-room` harness check that fails on 0.9.93.5 first (enter fullscreen, move to the centre, wait 1 s →
  rail hidden), also after pressing 🎙 / 📷 outside voice and after ⋯ → Esc; owner's hand test.
- Owner's pick: none needed.
- Done: 0.9.93.7 (PR below). Root cause: a touch-screen laptop reports a coarse primary pointer, so the room took it
  for a tablet (rail always on screen by CSS, and a pressed rail button's focus held it in the non-edge mode). A mouse
  anywhere now keeps the computer behaviour (`hasMouse()`), focus only holds the rail for keyboard users, the hover
  flag is double-checked. `yt-room` (simulated touch laptop, fails on 0.9.93.6) and `embed/run.mjs` checks pass.


### Phone: next speed steps (0.9.93 "Now" 2)
- Why: the phone room should open and react fast on mid-range phones.
- Done when: voice / stream / TV code loads only when needed, phones get a lighter stylesheet, and an automatic phone
  speed test (4× slower CPU) runs against the built site with agreed budgets.
- Tests: the speed test itself in CI; `scripts/harness/phone/run.cjs` still passes.
- Owner's pick: none needed.
- Done: 0.9.93.6 (PR below). Lazy: TV room + remote + `tv.css`, invite window + QR, first-time tips, image tools. Room
  page JS 142.1 → 134.5 kB, CSS 35.7 → 34.0 kB gzipped; `scripts/size-budget.mjs` in CI; phone speed test
  `scripts/harness/phone-speed/run.cjs` (4× CPU, 4G): home 556 / join 478 / in room 369 ms. Voice / live stay in the
  room chunk; a phone-only stylesheet was not worth it (most rules shared). Phone harness passes.


### Root cause of the live e2e first-attempt failures
- Done: https://github.com/alperenakturk/screen-with-me/pull/113, https://github.com/alperenakturk/screen-with-me/pull/114
  (deploys restarted test rooms mid-test; the deploy job now waits for the new version).
