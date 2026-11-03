# Security review 3: Cloudflare setup, pre-launch check and changes since review 2

> Date: 3 Nov 2026 · Code reviewed: `main` at 0.9.93.18 (`2bba5bf`) · Role: 🛡️ Security (read-only).
> Asked by the owner through the Planner: "use the Cloudflare security skill and what you know, and make the app
> secure". There is no Cloudflare-specific skill in the owner's catalogue, so this review follows
> `my-awesome-list` `skills/yayin-oncesi-kontrol/SKILL.md` (source list `is-akislari/yayina-hazirlik.md`: A = 5
> infrastructure checks, B = 26 security items), `skills/kvkk-gdpr-denetim/SKILL.md` for privacy, Cloudflare's
> general guidance for Workers / Durable Objects (from our own knowledge; the owner should confirm dashboard names, as
> Cloudflare renames menus often), and a read of everything merged since review 2 (`6c14046..2bba5bf`, 28 commits).
> Not fixed here: findings become cards under **Proposed** in `CARDS.md`; owner-only steps are in "Owner actions".
> Not legal advice.

## Summary

| # | Finding | Severity | Card |
|---|---------|----------|------|
| R3-1 | `POST /api/rooms/:id/unsave` reads an unbounded body inside the room object: the H1 crash through another door | **High** | new |
| R3-2 | The Cloudflare token and the YouTube key are in the environment of `npm ci`, the build and the live e2e (job-level `env`), not only the deploy step | Medium | new |
| R3-3 | No edge protection: the site lives on `workers.dev`, where WAF, rate-limiting rules, bot protection and HSTS settings are not available; the move to a custom domain needs a checklist | Medium | new (+ owner actions) |
| R3-4 | Review-2 cards still open: M2 make-host grace, M3 YouTube daily budget, M4 cheap routes, M5 IP hash salt, M6 search words in logs, M8 TV, L1, L4–L10 | Medium / low | existing cards (unchanged) |
| R3-5 | H2 leftover: the YouTube API script still comes from `www.youtube.com` (with the person's YouTube cookies where third-party cookies are allowed) and the policy says the player is "loaded from youtube-nocookie.com"; the CSP keeps two hosts that are probably no longer used | Low | new |
| R3-6 | One IP can keep the fallback's shared 24 M budget full in a room with many emojis / images, so other hotspot users get `1009 overflow` | Low | new |
| R3-7 | The coming feedback endpoint (card 9) writes user text into GitHub issues with a token: it needs limits, escaping and a token scope from day one | Low (preventive) | new |
| R3-8 | Game objects still accept a repeated `hello` (the room no longer does) | Low | added to the L6 card |
| R3-9 | `lastRoom.id` is not re-checked against `ROOM_ID_PATTERN` on read; `lang.js` can throw on a malformed `%` in the hash | Info | none |

Fixed since review 2 (verified in code): **H1** (fallback bodies read as a stream with a cap, only for `send`; 11 M
per session, 24 M per object with correct release on every close path; never-polled sessions closed after 10 s;
sweeper every 5 s), **M1** (a second `hello` on a joined connection gets `bad_message` on WebSocket and fallback
alike; votes only from people present, ≤ 50 per item), **H2** mostly (player from `youtube-nocookie.com`, the API
loaded only with the first YouTube item, thumbnails from cookieless `i.ytimg.com`, policy rewritten and dated).

New code since review 2 that is fine: `help.html` (one same-origin script, no third parties, `mailto:` only), help
links (`target=_blank rel=noopener`, same origin), the invite window (our own QR encoder, canvas copy with a revoked
object URL, `encodeURIComponent` for WhatsApp, DOM-built glyph, nothing sent anywhere), `room-more.ts` and the solo
settings dialog (UI only; the server still checks `isHost`), the home "continue" line (`textContent` only), lazy
chunks (no new hosts), no new `postMessage` listeners, no extension source or permission changes, no new server
routes. "Sidelit" appears only in docs; no feedback endpoint exists yet.

## 1. New and remaining code findings

### R3-1 — `/unsave` can crash a room (High)

`apps/server/src/index.ts:127-131` forwards `POST /api/rooms/:id/unsave` to the room object untouched; the origin
check passes when there is no `Origin` header (curl); there is no size check and no rate limit.
`apps/server/src/room.ts:354` → `unsaveFromHome` (`:897-898`) calls `await request.json()` on the whole body. Anyone
with a room id (it is in every invite link) can send one chunked POST of ~100 MB; the object decodes it past the
128 MB isolate limit and resets, dropping everyone. Repeatable. (`TvLink /deliver` is not reachable from outside.)
Fix: in the Worker refuse an `unsave` POST without `Content-Length` or larger than ~1 KB; in the object read it with
the fallback's capped reader (`readCapped(request, 512)`, exported from `fallback.ts`); add the per-IP limit from the
M4 card. Rule for later routes: **no Durable Object reads a request body without a cap.**

### R3-2 — CI secrets wider than needed (Medium)

`.github/workflows/test.yml:66-70` sets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `YOUTUBE_API_KEY` at the
`deploy` **job** level, so they are in the environment of `npm ci` (install scripts of `esbuild`, `workerd`, and any
future dependency), `npm run build` (every build plugin) and `npm run e2e` (test code). A compromised package version
would read the token and could deploy its own Worker to the account. `package-lock.json` pins versions (good, item
B22); `--ignore-scripts` is not practical (esbuild and workerd need theirs), so the fix is to keep secrets away from
those steps. Fix: put the three variables only on the "Deploy to Cloudflare" step (`env:` on the step), run the
"keys present?" check with `secrets` in an `if:` instead of a job-level env; use a GitHub **Environment**
`production` (deploy branch: `main` only) for the secrets; add `permissions: contents: read` at the top of the
workflow (already in the L10 card).

### R3-3 — Edge protection and the custom domain (Medium)

Today: `screen-with-me.swm-server.workers.dev`. Cloudflare's zone features (WAF custom rules, rate-limiting rules,
Bot Fight Mode, "Under Attack" mode, HSTS, minimum TLS version, DNSSEC) apply to a domain (zone) on the account, not
to `workers.dev`. Our own limits (`CONNECT_LIMIT`, `SEARCH_LIMIT`, per-object buckets) are the only shield now. Note:
the Workers rate-limit binding counts per Cloudflare location and is approximate, so a spread-out attacker gets more
than the stated number.
When the domain arrives (ROADMAP §6 / §7) the move needs, in one card:
- `wrangler.jsonc`: a `routes` / custom domain entry; `"workers_dev": false` and `"preview_urls": false` so the old
  address and version preview URLs don't stay open next to the WAF; `allowedOrigin` (`index.ts`) and `SITE_URL` in
  the extension build updated (the extension's `site-bridge` match, `guardSocket` and the CSP all name the origin).
- `_headers`: `Strict-Transport-Security: max-age=31536000; includeSubDomains` once HTTPS works on every subdomain
  (`workers.dev` is HSTS-preloaded already, a custom domain is not); optionally `Cross-Origin-Opener-Policy:
  same-origin-allow-popups`.
- Zone settings (owner actions below): Always Use HTTPS, minimum TLS 1.2, DNSSEC, one free rate-limiting rule on
  `/api/*`, a WAF custom rule refusing methods other than GET / POST / HEAD / OPTIONS on `/api/*`, Bot Fight Mode only
  after testing that WebSockets, the HTTP fallback and the extension still connect (bot checks can challenge API calls).
- Production `localhost` origins (`index.ts:27`) dropped (they are for local dev only).

### R3-4 — Review-2 cards still open

Unchanged code, so the cards in `CARDS.md` stay as written: M2 (`room.ts:1431` make-host during the 20 s grace), M3
(`index.ts:116-120` no `Origin` = allowed, no daily budget), M4 (`/api/version` creates a `TvLink` per call
`index.ts:92-95`, `/info` and fallback `send/poll/close` unlimited `:66-70, 127-131`), M5 (`index.ts:33-36` constant
prefix, no secret), M6 (search words in GET URLs `ui/search.ts:100`, `ui/shorts-search.ts:57` while Workers Logs are on
`wrangler.jsonc:48`; besides the POST body, `observability.head_sampling_rate` below 1 or turning invocation logs off
also reduces what is kept), M8, L1, L4–L10. The H3 + M7 policy card is partly done (dated, YouTube section); the KVKK
core parts (controller, rights, transfers, age) still wait for the owner.

### R3-5 — YouTube leftovers (Low)

`apps/web/src/players/youtube.ts:19` loads `https://www.youtube.com/iframe_api`, which loads YouTube's widget script
from the same host; these requests carry the person's youtube.com cookies wherever third-party cookies are allowed
(Chrome's default) once an item is loaded, before anyone presses play. The privacy-enhanced iframe itself is fine.
`privacy.html:114` (TR `:199`) says the player is "loaded from youtube-nocookie.com": name `www.youtube.com` as the
source of the player code. CSP `_headers:8`: `frame-src https://www.youtube.com` and `script-src https://s.ytimg.com`
are most likely unused now; check with `scripts/harness/yt-privacy/run.cjs` and drop them.

### R3-6 — Fallback budget held by one IP (Low)

A room with 24 custom emojis and 12 chat images queues ~10 M characters per fallback join (`fallback.ts:32, 34`). Two
or three sessions from one IP that poll once and then idle (≤ 45 s, re-opened every 10 s within 60 opens / min) keep
the 24 M hub budget full, so real hotspot users are closed with `1009 overflow`. The object no longer crashes. Fix:
at most ~3 fallback sessions per IP hash per object; count a broadcast string once across sessions; or send the join's
images only after the first poll, in pages.

### R3-7 — Feedback endpoint requirements (Low, preventive; for Ready card 9)

The planned endpoint writes user text into GitHub issues with a token. Before it ships: a fine-grained token limited
to **Issues: write on this repository only**, with an expiry; the Worker checks `Origin` and refuses requests
without it; per-IP limit (e.g. 3 / hour) **and** a global daily cap (e.g. 50 issues / day) so spam can't flood the
repo or hit GitHub's limits; body size cap read as a stream (R3-1 rule); text placed in a fenced code block, `@`
mentions and `#123` references neutralised (zero-width joiner or backticks) so feedback can't ping people or link
issues; no IP, room id, names or chat stored; the optional e-mail only in the issue body and named in the privacy
policy with a retention (e.g. issues closed and the address removed after 90 days). Optional: Cloudflare Turnstile
(free) in front of the form if spam appears.

### R3-8 — Game objects accept a repeated `hello` (Low)

`game.ts:108`, `draw.ts:168`, `quiz.ts`, `poker.ts` still accept `hello` again on a joined connection (the room fixed
this in 0.9.93.8). Re-sends are small except Draw `strokes` (≤ 60 k points); with `cid` rotation it also feeds the
Poker `people` growth (L6). Added to the L6 card.

### R3-9 — Info

`apps/web/src/storage.ts:226-230`: `lastRoom.id` is used in `/r/${id}` and `/api/rooms/${id}/info` without a pattern
check on read (only our page writes it; the `/r/` prefix rules out `javascript:`); validate like `tvLink()` does.
`apps/web/public/lang.js`: `decodeURIComponent(location.hash)` throws on a malformed `%` after the page is applied
(nothing breaks; the id only reaches `getElementById`); a `try` keeps the console clean.

## 2. Pre-launch check (`yayin-oncesi-kontrol`)

### A. Five infrastructure checks

| # | Check | State | Evidence / where it is planned |
|---|-------|-------|------|
| A1 | Error tracking + alerts | ❌ | Nothing reports client or server errors; ROADMAP §6 "Monitoring". A privacy-friendly `/api/report` (no IP, capped, sampled) fits the account-free design better than a third-party SDK |
| A2 | Product analytics | ❌ | None (good for privacy today); ROADMAP §6, cookieless, before the closed beta |
| A3 | Rate limiting | 🟡 | Connections, search, uploads, commands are limited; gaps: R3-1, M3, M4, R3-6; no edge rules (R3-3) |
| A4 | Kill switch | 🟡 | Only `VOICE=off` and the TV lab switch; ROADMAP §6 card "Kill switch" (owner, 3 Nov) covers it |
| A5 | Staging | ❌ | Every merge deploys to production; ROADMAP §6 card "Staging environment" covers it. Use a **separate** Cloudflare API token and YouTube key for staging |

### B. 26 security items (only those that apply: no accounts, no AI, no mobile app yet)

| # | Item | State |
|---|------|-------|
| 1 | Owner checks (IDOR) | ✅ host actions, pins, emojis, unsave check the persistent key; ⚠️ M2 (make-host during grace) |
| 2 | Trim extra fields | ✅ every client message is copied into a new object (`protocol.ts`); cids / IP hashes never sent out |
| 3, 4, 6, 8, 9, 16 | Tokens, logout, OTP, e-mail exposure, reset links, token storage | n/a (no accounts). TV link tokens: M8 card |
| 5 | 2FA on your own accounts | ❔ owner action below |
| 7 | Country filter | n/a (no sign-up or payment); possible later as a WAF rule |
| 10 | Quota on expensive endpoints | 🟡 per-minute limit only; daily budget = M3 card |
| 11 | SSRF | ✅ TikTok resolver host-anchored, 3 hops; L7 hygiene card |
| 12 | Storage closed | ✅ no bucket; Durable Object storage is reachable only through our code |
| 13, 15, 17, 18, 19 | Mobile-only items | n/a until the store apps (`apps.md`) |
| 14 | Secrets in shipped code | ✅ the YouTube key lives only in the Worker; the extension zip and site JS hold no secrets |
| 20 | Fewer permissions | 🟡 `<all_urls>` is needed and now explained (card 8); `scripting` and `offscreen` justified in `web-store.md`; review again before the store submission |
| 21 | `.env` closed | ✅ `.gitignore` covers `.env*` / `.dev.vars`; assets come only from `apps/web/dist` |
| 22 | Locked packages | ✅ `package-lock.json`, `npm ci` |
| 23 | Install scripts | 🟡 only `esbuild`, `workerd` (and `fsevents` on macOS) have them and need them; mitigation = R3-2 (no secrets during install) + Dependabot (L10) |
| 24 | No secrets for forks | ✅ `deploy` only on `main` pushes, no `pull_request_target`; recheck when the repo goes public |
| 25 | Prompt injection | n/a (no AI in the product) |
| 26 | Agent permissions | 🟡 cloud sessions have no Cloudflare credentials (deploys only through Actions: good); keep it that way, and never paste the API token into a session |

### C. Phone hand tests

Most of the 20 tests are already in `STATUS.md` "Owner's hand tests" for the phone room; the ones that are new for
us: airplane mode / offline page (`offline.html`), largest system font size, dark mode, hardware back button on every
sheet, the 10-minute heat / battery test with video + voice + camera on, permission wording before mic / camera.
The Developer adds them to the hand-test list (no card needed).

### D. Debug panel

Card 12 (`?debug=1`) is Ready. Security requirement: it must never show cids, IP hashes or other people's data, and
anything it can switch must be local to the browser.

## 3. Privacy (KVKK + GDPR) since review 2

Better: the policy is dated (3 November 2026), YouTube is described as privacy-enhanced and lazy, and the extension
page explains why it asks for every website. Still open (H3 + M7 card): data controller, legal basis, rights and how
to use them, transfers abroad (Cloudflare, Google, TikTok, and GitHub once feedback ships), minimum age, complaint
authority, breach plan; R3-5's sentence; M5 and M6 (IP hash wording, search words in logs). New: the feedback form
(R3-7) and the coming side games (local `localStorage` saves only: nothing to add unless they sync) need policy lines
when they ship; the Sidelit rename needs the policy, help page and store form texts renamed together.

## 4. Owner actions (only the owner can do these)

1. **Two-step login (2FA)** with an authenticator app or a security key (not SMS) on: Cloudflare, GitHub, the Google
   account that owns the YouTube API key, and `screenwithme.app@gmail.com` (Chrome Web Store publisher). Keep the
   recovery codes on paper or in a password manager.
2. **Cloudflare API token** (Dashboard → My Profile → API Tokens): the one in GitHub must be a *custom token*, never
   the Global API Key; permission "Account → Workers Scripts → Edit" (add only what a deploy error asks for), account
   resources = only this account, an expiry date (e.g. 6 months, with a calendar reminder). Then replace the GitHub
   secret and delete old / unused tokens. Check Manage Account → Members: only you.
3. **Cloudflare plan and spending**: check whether the account is on Workers Free (daily limits stop the service but
   never bill) or Workers Paid (no spending cap: turn on usage / billing e-mail notifications). Tell the Planner which.
4. **GitHub**: Settings → Environments → new environment `production`, deployment branches = `main` only; move the
   three secrets there (the Developer then points the deploy step at it, card R3-2). Settings → Branches: protect
   `main` (pull request required, the `test` check must pass). Settings → Code security: Dependabot alerts on; secret
   scanning / push protection if your plan offers it for private repos.
5. **Google Cloud (YouTube key)**: APIs & Services → Credentials → the key → API restrictions: only "YouTube Data API
   v3". (An address or website restriction is not possible for a server key; that is fine.)
6. **Later, with the domain** (R3-3): add it to Cloudflare; SSL/TLS → Always Use HTTPS on, minimum TLS 1.2; DNSSEC on;
   Security → one rate-limiting rule for `/api/*`; then the Developer switches `workers_dev` / `preview_urls` off and
   adds HSTS.

## Proposed cards

Added under **Proposed** in `CARDS.md`, most severe first: R3-1 (high), R3-2, R3-3 (medium), R3-5, R3-6, R3-7 (low);
R3-8 added to the existing L6 card.
