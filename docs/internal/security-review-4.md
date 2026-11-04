# Security review 4: Cloudflare best practices, live headers, the public repository

> Date: 4 Nov 2026 · Code reviewed: `main` at 0.9.97.39 (`a90ae9c`), 157 commits after review 3 · Role: 🛡️ Security
> (read-only). Asked by the owner through the Planner after the repository became public: "review the code and the
> site thoroughly with the Cloudflare skill, and fix the security side".
> Method: Cloudflare's own skills (`github.com/cloudflare/skills`, cloned read-only: `workers-best-practices` with its
> references, `durable-objects` with `rules.md` / `workers.md`, `wrangler`, `web-perf`), the owner's `kvkk-gdpr-denetim`
> for personal data, a read of every file in `apps/server`, the workflow and the whole git history (528 commits).
> Not fixed here: findings become cards under **Proposed** in `CARDS.md`; owner-only settings are in §5.
> Two platform facts are from memory and marked **(verify)**: `developers.cloudflare.com` and the live site are
> blocked by this cloud environment's network policy. The live headers were therefore checked on `wrangler dev`
> serving the same built files (§2). Not legal advice.

## Summary

| # | Finding | Severity | Lane |
|---|---------|----------|------|
| R4-1 | Upload limits are per room only: one address can fill the account's Durable Object storage by spreading custom emojis and chat images over many fresh rooms | Medium | A |
| R4-2 | `ip-key.ts` caches the day's key as a *promise* shared across requests; if the first request is cancelled the promise may never settle and every later connection in that isolate waits | Medium | A |
| R4-3 | `/api/probe` (plain GET, ≤ 512 KB answers) has no limit; any `/api/*` loop spends the free plan's daily request quota (verify), which only edge rules on a custom domain can stop | Medium | A (+ R3-3) |
| R4-4 | The owner's personal Gmail address is the author e-mail of 337 commits, now public | Medium (privacy) | owner |
| R4-5 | Public-repo settings not yet used: rulesets for `main`, code scanning (CodeQL), secret scanning + push protection, private vulnerability reporting, fork-PR approval, `production` environment (all free on public repositories) | Medium | owner + B |
| R4-6 | YouTube usage counters lose updates under concurrent requests (storage read before the body read, so the input gate opens) | Low | A |
| R4-7 | Smaller Worker / DO items: in-memory abuse buckets reset on hibernation, feedback gate counts failed sends and has no fetch timeout, `/api/youtube/usage` unlimited, poker shuffle uses `Math.random`, probe WebSocket never times out, one floating promise, the room constructor loads every image on each wake | Low | A |
| R4-8 | API responses carry no `X-Content-Type-Options` / `Cache-Control: no-store` (the `_headers` file only covers static files); observability has no traces and unstructured logs | Low | A |
| R4-9 | `caches.default` may do nothing on `*.workers.dev` (verify): then the 24 h search cache and the quota memo are off on live | Low (verify) | A |
| R4-10 | The TV pairing routes stay live on the server while the TV is hidden, and review 2 (public) describes their weaknesses (M8) | Low | A |
| R4-11 | The removed hidden board page, its address and contents remain in public history; internal docs (strategy, competitors, all reviews) are public | Info | none |
| R4-12 | The privacy policy still lacks the KVKK / GDPR core parts (H3 from review 2): controller, rights, transfers abroad, minimum age, complaint authority; now also GitHub (feedback) and Apple (podcasts) as recipients | High (unchanged, owner) | Planner + owner |

**Fixed since review 3 (verified in code):** R3-1 (unsave capped, 411 / 413, per-IP limit), R3-2 (secrets only on the
deploy step, with a guard step that fails if one leaks into install / build), R3-5 (CSP trimmed, policy wording), R3-6
(≤ 3 fallback sessions per address), R3-8 and all of review 2's M2–M6, L1–L10. Every request body a Durable Object reads
is capped (`readCapped`); no `request.json()` / `.text()` / `.arrayBuffer()` / `.formData()` remains on incoming requests.
The feedback endpoint follows R3-7 (Origin required, burst + hourly + daily caps, size caps, `@` / `#n` / `GH-n`
neutralised inside a text fence, no IP / room / name sent).

**Housekeeping for the Planner:** the Proposed cards of reviews 2 and 3 that have shipped (M2–M6, L1–L10, R3-1, R3-2,
R3-5, R3-6, R3-7) still sit under **Proposed**; only H3 + M7 (policy), M8 (TV) and R3-3 (domain) are open.

## 1. Worker and Durable Objects against Cloudflare's skills

### R4-1 — Storage can be filled across rooms (Medium)

`apps/server/src/room.ts:619-637` (`sticker-add`), `:242` / `:302` (`imageLimit`, `stickerLimit`), `:63` / `:65` (60 stickers
and 100 images per room and day). Every limit lives inside one room object; room ids are free to invent. One address
can open 60 new rooms a minute (`CONNECT_LIMIT`), say `hello`, and upload ~4 stickers + ~5 chat images of ~280 KB in
each: about 150 MB a minute, kept 24 h even in unsaved rooms. The free plan's Durable Object storage (5 GB, verify) is
full in under an hour; then every room's writes fail (or a paid account pays).
Skill: DO `rules.md` "keep essential data in durable storage"; workers-best-practices "be aware of platform limits".
Fix: a per-IP-hash daily byte budget across all rooms in one small counter object (the `YoutubeUsage` / `FeedbackGate`
pattern) that a room asks before storing an image, plus an account-wide daily byte cap.

### R4-2 — A shared promise across requests (Medium)

`apps/server/src/ip-key.ts:21-42`: `cached.key` is a module-level `Promise<CryptoKey>` whose `IpKeys` fetch runs in the
first request's I/O context; later requests await the same promise. If the first client disconnects mid-fetch, the
fetch can be cancelled with its request and the promise may stay pending (the `catch` only handles a rejection), so every
later `ipKey()` in that isolate (connections, searches, `/info`, feedback) waits until the isolate is recycled.
Skill: runtime-patterns "Do not store request-scoped state in global scope … Cannot perform I/O on behalf of a different
request". Fix: cache only the resolved `CryptoKey` (assign after `await`), let each request fetch while it is empty, and
give the fetch `AbortSignal.timeout(3000)` with the isolate-key fallback.

### R4-3 — The daily request quota can be spent from outside (Medium)

`index.ts:119-123`: `/api/probe` plain GET answers up to 512 KB with no limit. More generally, on the Workers free plan
every `/api/*` call counts toward the daily request allowance even when our own limiter answers 429 (verify), because
the limiter runs inside an invocation that has already been counted (`run_worker_first: ["/api/*"]`). A loop then stops
rooms and connections for everyone until UTC midnight. Fix now: a `ROOM_INFO_LIMIT`-style limit on the probe's GET (also
caps the 512 KB answers); real fix: a WAF rate-limiting rule on the custom domain, which runs before the Worker (R3-3).
The owner's answer to "Workers Free or Paid?" decides how urgent this is.

### R4-6 — Lost updates on the YouTube usage book (Low)

`apps/server/src/usage.ts:19, 48, 57`: `fetch` reads `book` from storage, then awaits `readCapped(request)`; reading a body
is not storage I/O, so the input gate opens and a second `/add` can run in between; both `put` a book built on the same
old copy. The quota form under-reports and `unitsToday` lets slightly more than the day's budget through. Skill: DO
`rules.md` "storage gates, external I/O races". Fix: read and parse the body first, then `get` and `put` with no other
await in between.

### R4-7 — Smaller items (Low)

- In-memory abuse buckets (`imageLimit`, `stickerLimit`, the per-IP YouTube share in `usage.ts:12-14`) reset whenever the
  object hibernates or is evicted, so "1 per 10 s" becomes a full burst after each wake (DO skill: "storing critical state
  only in memory"). Accept once R4-1 exists, or keep small counters in storage.
- `feedback.ts:44-59`: the daily gate is taken before the token check and before GitHub answers, so `off` / failed sends
  burn the 50; the GitHub `fetch` has no timeout. Check the token first, `AbortSignal.timeout(8000)`, give the slot back
  on a 5xx.
- `usage.ts:95-101`: `GET /api/youtube/usage` has no rate limit (the comparison is constant-time, good): add a limit and
  refuse tokens under 32 characters.
- `packages/shared/src/games/poker.ts:51, 241, 296`: the deck is shuffled with `Math.random`; pass a
  `crypto.getRandomValues` source on the server (skill: "Math.random() for security-sensitive … predictable values").
- `index.ts:126-130`: the probe WebSocket (not hibernatable) stays open until the client closes it; close it after 10 s.
- `fallback.ts:271`: `void this.handlers.closed(...)` can become an unhandled rejection; use `finish()` like the other path.
- `room.ts:335-374`: the constructor runs ~25 sequential gets plus every sticker and chat image (up to ~10 MB) on every
  wake, blocking events; load small keys in one `get([...])` and images lazily at join time (DO skill: keep
  `blockConcurrencyWhile` to setup).
- `podcasts.ts:39` follows a feed's redirects to any host (Workers can't reach private networks; low) and parses ≤ 4 MB
  by regex (CPU); `realtime.ts:34` has no timeout (SFU is off).

### R4-8 — API response headers and observability (Low)

On `wrangler dev` with the built site, static pages get the full CSP, `nosniff`, `Referrer-Policy` and
`Permissions-Policy`; `/api/*` answers get none of them (the `_headers` file applies to assets only) and
`/api/rooms/:id/info` has no `Cache-Control`. Add one JSON helper that sets `X-Content-Type-Options: nosniff` and
`Cache-Control: no-store`. `wrangler.jsonc:69` turns observability on without traces and with an implicit sampling rate
of 1; logs are plain strings (`feedback.ts:61`, `youtube.ts:79/84`, `room.ts:1693`). The configuration skill suggests
`observability.traces.enabled` and JSON logs with `console.error` for errors; invocation logs keep full URLs (room ids,
`/api/tiktok/resolve?u=…`), which the privacy policy's log note already covers (≤ 7 days). `compatibility_date`
2026-09-01: bump it on a schedule; no `nodejs_compat` needed (no `node:` imports).

### R4-9 — Cache API on workers.dev (Low, verify)

`youtube.ts`, `podcasts.ts`, `tiktok.ts` use `caches.default`. Cloudflare's docs say (from memory) that the Cache API has
no effect on `*.workers.dev`; then the 24 h search cache and the 10-minute quota memo do nothing live and every repeated
search spends quota. Check with a live e2e that searches the same words twice and expects a cache hit (a header such as
`X-SWM-Cache: hit`); the custom domain fixes it if confirmed.

### R4-10 — TV routes live while the TV is hidden (Low)

The lab switch (`?tvlab=1`) is client-side only; `/api/tv/<code>/ws` and the room's `tv-link` handling run for anyone,
and `security-review-2.md` (now public) describes the open M8 weaknesses (a TV token is the whole person, codes can be
guessed). Practical risk is small (nobody uses the TV), but the simplest fix is a server switch `TV=off` (like
`VOICE=off`) until the TV ships with M8 done.

Checked and fine: methods and Origin checks on every route; per-route limits (connects, fallback, info / unsave /
version, searches on cache misses + the daily unit budget, feedback); no stack traces or internal messages in answers;
secrets only from `env`, never echoed; `X-Usage-Token` compared in constant time; `X-SWM-Ip` / `X-SWM-Room` set or
stripped only by the Worker; internal object paths unreachable from outside; crypto randomness for ids, tokens, sids and
the IP key (poker aside); every class uses `acceptWebSocket` with attachments well under 2 KB and handles close / error;
one alarm per object, idempotent room cleanup; all classes SQLite-backed (migrations v1–v10), largest value ~280 KB,
every list capped.

## 2. Site headers and CSP

The live address is blocked by this environment's network policy (proxy 403), so the check ran against `wrangler dev`
serving the built `apps/web/dist` with the same `_headers`:

| Path | CSP | nosniff | Referrer | Permissions | HSTS |
|------|-----|---------|----------|-------------|------|
| `/`, `/r/<id>`, `/privacy`, `/help`, `/extension`, SPA fallback | ✅ | ✅ | ✅ | ✅ | – (workers.dev is HSTS-preloaded; needed on the custom domain, R3-3) |
| `/api/version`, `/api/rooms/:id/info` | – | – | – | – | – (R4-8) |

CSP: `script-src 'self' https://www.youtube.com`; frames only YouTube no-cookie, TikTok, Vimeo; images `self`, `data:`,
`blob:`, `i.ytimg.com`, `*.mzstatic.com`; `object-src 'none'`, `base-uri 'none'`, `form-action 'self'`. Accepted as
designed: `style-src 'unsafe-inline'`, `media-src *` (pasted video files), no `frame-ancestors` (the overlay; `main.ts`
frame guard instead). Optional later: `Cross-Origin-Opener-Policy: same-origin-allow-popups`. The owner can let this
session reach the live site by adding `screen-with-me.swm-server.workers.dev` under the environment's Network access →
Allowed domains; then the same table can be re-run with `curl` against live.

## 3. The repository is public

- **Secrets:** the full history (528 commits, no longer shallow) has no API keys, tokens or private keys; the YouTube
  key, Cloudflare token, feedback token and usage token are GitHub secrets only. ✅
- **R4-4 personal e-mail:** 337 commits carry the owner's personal Gmail as author; anyone can read it from the history
  (spam, phishing, linking the project to his private identity). Rewriting history is ruled out (CLAUDE.md); stop new
  exposure: GitHub → Settings → Emails → "Keep my email addresses private" + "Block command line pushes that expose my
  email", and set `git config --global user.email <id>+<login>@users.noreply.github.com` on his computer. The planned
  clean public repository (VIZYON) would leave the old history behind.
- **R4-11 history:** the hidden test board page (removed in 0.9.97.39) and its address and notes stay in history; the
  page itself is gone, so nothing to fix, but a "secret address" is never access control in a public repository. All
  internal docs (strategy, competitor and name research, the four security reviews) are readable; the open items they
  describe are H3 (policy text), M8 (TV, R4-10) and R3-3 (domain). No piracy site names were found in the tree or in
  history (search for site-like names).
- **Workflow (`.github/workflows/test.yml`):** `permissions: contents: read` ✅; `pull_request` (not
  `pull_request_target`) ✅, so fork PRs run the tests with a read-only token and no secrets; the deploy job only on
  `main` pushes with secrets on the deploy and live e2e steps only ✅; Dependabot weekly for npm + Actions ✅. To add:
  pin third-party actions by commit SHA (`actions/checkout@<sha> # v7`; Dependabot keeps SHAs current), and the owner
  settings in §5 (fork-PR approval, rulesets, `production` environment, which are free on public repositories; the
  Planner's note that they were unavailable applied while the repository was private).
- **R4-5 scanning:** public repositories get CodeQL code scanning, secret scanning with push protection and private
  vulnerability reporting for free; none is on yet. Once private vulnerability reporting is on, `SECURITY.md` can point
  to "Report a vulnerability" on GitHub as well as the e-mail.
- **Licence:** "All rights reserved, source-available" is consistent with `third-party-notices.txt`; public texts must
  still never say "open source".

## 4. Privacy (KVKK + GDPR) since review 3

The policy is dated 3 November 2026 and covers the new features (feedback → GitHub issues, Vimeo, podcasts via Apple,
moving to another device, the 24 h "let in" record, private messages, Workers Logs ≤ 7 days). Still missing, as in
review 2 H3: a named data controller, the legal basis per purpose, the rights (KVKK art. 11, GDPR art. 15–22) and how
to use them, transfers abroad (Cloudflare, Google, TikTok, Vimeo, Apple, GitHub: US), a minimum age, a complaint
authority and a breach plan. With the repository public and the store submission near, this is the main open item; it
needs the owner (whose name and address, which age) and ideally a lawyer. The commit e-mail (R4-4) is personal data of
the owner himself, not of users.

## 5. Owner-only settings (plain steps)

1. **GitHub e-mail:** Settings → Emails → tick "Keep my email addresses private" and "Block command line pushes that
   expose my email"; on his computer `git config --global user.email` = the `…@users.noreply.github.com` address shown
   there.
2. **Rulesets for `main`** (repo Settings → Rules → Rulesets → New branch ruleset, target `main`): require a pull request,
   require the `test` status check, block force pushes, block deletion; bypass only for himself if needed.
3. **Code security** (repo Settings → Code security): Dependabot alerts on; Secret scanning + Push protection on; Code
   scanning → CodeQL "Default setup" (JavaScript / TypeScript); Private vulnerability reporting on.
4. **Actions** (repo Settings → Actions → General): "Require approval for all external contributors" for fork PRs
   (protects the free minutes); workflow permissions "Read repository contents".
5. **Environment** (Settings → Environments → New `production`, deployment branches = `main` only) and move the
   Cloudflare, YouTube, feedback and usage secrets there; the Developer then adds `environment: production` to the
   deploy job.
6. **From review 3, still open:** 2FA on Cloudflare / GitHub / both Google accounts; the Cloudflare token as a custom
   "Workers Scripts: Edit" token for this account with an expiry; the YouTube key restricted to "YouTube Data API v3";
   the feedback token fine-grained (Issues: write, this repo only, with an expiry); tell the Planner Workers Free or Paid.
7. **Optional:** allow `screen-with-me.swm-server.workers.dev` in this cloud environment's Network access so Security
   can check live headers directly.

## Proposed cards

Added under **Proposed** in `CARDS.md`, most severe first: R4-1, R4-2, R4-3 (medium, lane A), R4-5 code side (lane B),
R4-6 + R4-7 + R4-8 (one low card, lane A), R4-9 (lane A), R4-10 (lane A). R4-4, R4-5 settings and R4-12 are owner /
Planner items (§5, §4).
