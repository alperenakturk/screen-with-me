# Cloudflare playbook (Workers + Durable Objects)

What this project set up and learned on Cloudflare, written so the next project can copy it. Each item says what we
chose, where it lives, why, and its state: **done**, **open**, or **check in the dashboard** (the repo does not record
it). Sources: `security-review-cf.md` (the Cloudflare audit, 8 Nov 2026), `security-review-3.md` / `-4.md`,
`costs.md`, `custom-domain.md`, `breach-plan.md`, `OPTIMIZATION.md` Part A, `apps/server/wrangler.jsonc`,
`apps/web/public/_headers`, `architecture/reference.md`. The GitHub side of deploys is in `github-playbook.md` and is
not repeated here.

Shape of this project: one Worker serves the static site (Workers static assets) and `/api/*`; one SQLite-backed
Durable Object (DO) per room and per game table, plus small singleton / per-IP-hash objects for budgets and gates;
WebSocket Hibernation; one cron trigger. No KV, no R2, no D1 (DO storage covers everything; a storage bucket that does
not exist cannot be left open).

## 1. Account and access

| Item | What / where | Why | State |
|---|---|---|---|
| 2FA on the Cloudflare login | My Profile → Authentication; authenticator app or security key, never SMS; recovery codes in the password manager | The account can deploy, read logs and change DNS | open: asked in review 3 §4 and review 4 §5, never confirmed; check in the dashboard |
| Members | Manage Account → Members: only the owner | Fewer people, fewer leaked logins | check in the dashboard |
| Deploy token | My Profile → API Tokens → Create **custom** token: Account → Workers Scripts → Edit (add a permission only when a deploy error asks for it), account resources = this account only, an expiry (e.g. 6 months) with a calendar reminder. Never the Global API Key | A leaked token can only deploy scripts, and only until it expires | open until confirmed: check the token list in the dashboard; delete old / unused tokens |
| Who holds which credential | Owner: the login + 2FA, the deploy token (as the CI secret `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in GitHub's `production` environment). Claude sessions: **no** Cloudflare credential at all; deploys only through Actions | An agent that cannot deploy cannot break production by accident; never paste a token into a session | done (security-review-3 B26) |
| Staging token | A separate token (and separate API keys) for a staging Worker | A staging leak must not reach production | open (no staging yet; ROADMAP §6) |
| Password manager entries | One entry per credential, e.g. `Cloudflare – deploy token (Workers Scripts: Edit)` with expiry in Notes | Rotation needs to know what exists | done as a rule (CLAUDE.md §5) |

## 2. Workers and Durable Objects: settings and code rules that are security

**Config (`wrangler.jsonc`)**

| Rule | How we did it | State |
|---|---|---|
| Config in `wrangler.jsonc`, recent `compatibility_date`, no `nodejs_compat` unless a `node:` import needs it | `compatibility_date` 2026-09-01; schedule a bump every few months | done (bump: open, recurring) |
| Static assets in front, Worker only for the API | `assets.run_worker_first: ["/api/*"]`, `not_found_handling: single-page-application`; static files cost no Worker request | done |
| All DO classes SQLite-backed (required on Free) | `migrations` `new_sqlite_classes`, one new tag per class, a tag is never edited | done (v1–v14) |
| Rate-limit bindings per IP hash | `ratelimits`: connects 60/min, search 10/min, room info 60/min, feedback 3/min, fallback 1200/min. They count per Cloudflare location and are approximate | done |
| Limits tunable without a deploy | Each limit has a code default + a Worker variable of the same name; `keep_vars: true` so a value set in the dashboard (Settings → Variables) survives deploys | done |
| No secrets in `wrangler.jsonc` | Only bindings and public numbers; secrets go up at deploy time (section 4) | done |
| `version_metadata` binding | `/api/version` answers the deployed version id; the deploy waits for it before live e2e | done |
| Version preview URLs | Not generated for Workers with DOs, so old versions are not reachable by URL. Set `preview_urls: false` explicitly when moving to an own domain | done by platform / open with the domain |
| Generated types | `wrangler types` output was stale and a hand-written `Env` duplicated bindings (CF-9) | open: regenerate, keep only secrets / dev flags by hand, add a CI diff check |

**Code rules (all done unless marked)**

- **Every body read is capped.** No `request.json()` on incoming requests; `readCapped` streams with a byte limit;
  lengths checked at the edge before an object wakes (e.g. `unsave` ≤ 1 KB, fallback send ≤ 1.1 MB, feedback ≤ 8 KB).
- **Origin checks** on every browser route and WebSocket upgrade (the request's own origin; `localhost` only for dev,
  to drop in production with the own domain: open, R3-3).
- **IDs validated by pattern before any object wakes.** Internal headers (IP hash, room id, lease) are set by the
  Worker and stripped from anything a client sends (CF-12, done in ERR1).
- **IP hash, not IP:** HMAC-SHA-256 with a random key per UTC day held by one small object; yesterday's hashes cannot be
  linked back. Kept in the socket attachment, never stored long term, never sent to clients.
- **Rate limits inside the objects** (edge rules never see WebSocket frames): a token bucket per connection for every
  message incl. real pings (20/s, burst 120; over it → error + close 1008, client backs off); at most 12 connections
  per IP hash per room; per-member chat / command / reaction buckets; the in-memory limiter map is capped (4000 keys).
- **Cross-object gates** for what one address could spread over many objects: daily image byte budget per IP hash and
  site-wide, 30-day storage window (`UploadGate`); open HTTP-fallback sessions per IP hash across rooms
  (`FallbackGate`, one small object per IP hash, not one global); feedback hourly / daily gate.
- **Free keepalive:** `ctx.setWebSocketAutoResponse` answers the keepalive frame without waking or billing the object;
  liveness reads `getWebSocketAutoResponseTimestamp`. This is the single biggest quota saver.
- **Alarms, not timers, for durable work:** one `scheduleAlarm` per object covers expiry, sweeps, lease renewal and
  ghost checks. A short timer that remains (bots) ends in `.catch(logError)`. Timers also block hibernation.
- **Top-level error wrapper** (ERR1): the Worker's `fetch` catches everything, logs one JSON line (route with ids
  masked, error name, `retryable` / `overloaded`; never IP, id, name or text) and answers JSON 503; stub calls without a
  body retry once when `retryable && !overloaded`.
- **Outbound calls** have `AbortSignal.timeout`; redirects followed only with a hop limit and a host anchor (SSRF).
  Open: the podcast fetch uses `redirect: 'follow'` and the Realtime call has no timeout (review 4 R4-7, carried over).
- **Secrets compared in constant time** on hashes; only resolved values cached across requests, never a
  request-scoped promise in a global (R4-2).
- **Randomness:** `crypto.randomUUID` / `getRandomValues` for every id, token, deck or fleet.
- **Test powers never deployed:** lab / unpaced / open flags are `--var` on the local dev server only and also require
  a localhost URL; they are never in `wrangler.jsonc` or the deploy (CLAUDE.md §7).
- **Empty objects delete themselves** (`deleteAll()` after their TTL from the alarm); every stored list is capped.
- **Open hygiene (CF-10, CF-11):** internal objects still use `fetch()` + hand-parsed bodies instead of RPC methods /
  `getByName()`; `LAB_CODE` has no minimum length (treat < 20 characters as missing, like `USAGE_TOKEN_MIN` 32).

## 3. Edge security

**Headers and CSP** (`apps/web/public/_headers`, read by Workers static assets; done)

- CSP: `default-src 'self'`; scripts only from us + one player host; no inline scripts (static pages load their own
  small `.js`); `object-src 'none'`; `base-uri 'none'`; `form-action 'self'`; `connect-src 'self'`; frame / image /
  media hosts listed one by one (media `*` because users paste any video URL). A new third-party host is added here in
  the same PR.
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` that
  allows only camera / mic / display-capture for self.
- No `frame-ancestors` / `X-Frame-Options` because the extension shows the site inside other pages; instead the app's
  entry script refuses to run in any frame except the extension overlay. A normal project should set
  `frame-ancestors 'none'`.
- `/api/*` answers get `nosniff` + `Cache-Control: no-store` from the Worker (`withApiHeaders`).
- HSTS: `workers.dev` is HSTS-preloaded; on an own domain add
  `Strict-Transport-Security: max-age=31536000; includeSubDomains` (open, with the domain).

**Zone features: only on an own domain** (WAF, rate-limiting rules, Bot Fight Mode, Under Attack mode, minimum TLS,
DNSSEC do not apply to `workers.dev`). Today our in-code limits are the only shield. Plan (card R3-3, all **open**):

| Step | Where |
|---|---|
| Buy the domain on Cloudflare Registrar in the same account (no nameserver step) | Domain Registration |
| Routes: `{ "pattern": "<domain>", "custom_domain": true }` (+ `www`); Cloudflare makes DNS + certificate | `wrangler.jsonc` |
| SSL/TLS → Always Use HTTPS on, minimum TLS 1.2; DNSSEC on | zone dashboard |
| One free rate-limiting rule on `/api/*` (helps Worker-request floods, not WebSocket frames) | Security → WAF → Rate limiting rules |
| WAF custom rule: on `/api/*` refuse methods other than GET / POST / HEAD / OPTIONS | Security → WAF → Custom rules |
| Bot Fight Mode only after testing that WebSockets, the HTTP fallback and the extension still connect | Security → Bots |
| HSTS in `_headers`; drop production `localhost` origins | repo |
| Old address: we keep `workers.dev` as an alias during the move so old links and old extensions still work (`custom-domain.md` steps A/B); once the extension with the new origin is out, set `workers_dev: false` and `preview_urls: false`, or the old address stays open beside the WAF | `wrangler.jsonc` |
| E-mail: Email Routing forwards `support@`, `privacy@`, `abuse@` to the owner's inbox (MX/SPF added by Cloudflare) | Email → Email Routing |
| Country filter: not needed (no sign-up or payment); possible later as a WAF rule | — |

Lesson: make the site's address **one value** (`site.config.json`) and a CI check that fails if anything hardcodes it;
then the domain move is a config change.

## 4. Secrets

| Rule | State |
|---|---|
| Worker secrets (API keys, feedback token, usage token, lab code, Vimeo token) live in GitHub's `production` environment; the deploy step writes the present ones to `$RUNNER_TEMP/secrets.json`, runs `wrangler deploy --secrets-file`, deletes the file. Never `wrangler secret put` by hand from a laptop, so CI is the one source | done |
| Secrets only on the deploy step's `env`, never job-level, never in `npm ci`'s environment; a guard step skips the deploy with a warning when a required one is missing | done |
| A missing optional secret turns its feature off (`{error:'off'}`), never a crash | done |
| Secrets never logged or echoed; errors log without values | done |
| Read-only status endpoints protected by a token compared on hashes with a minimum length (`USAGE_TOKEN` ≥ 32) | done; `LAB_CODE` minimum length open (CF-11) |
| Each secret has a password-manager entry with where it is stored and its expiry; generator letters + digits when it goes into a URL | done as a rule |
| Rotation on any suspicion: Cloudflare token, API keys, GitHub tokens, usage token; the IP-hash key renews itself daily | documented (`breach-plan.md`) |
| Paid add-ons that need extra secrets (Realtime SFU: app id + secret) only with a budget brake | open decision (owner; card needed, no spending cap) |

## 5. Costs, free limits and alerts

We run on **Workers Free**. Free never bills; when a daily quota is used up, that product **stops until 00:00 UTC**.
Paid (~5 USD/month) turns stops into pay-per-use with **no spending cap**. Decision: stay on Free, harden quotas first,
revisit Paid at launch (owner; open until launch).

| Limit (Free) | Value | Hit first by | At the limit |
|---|---|---|---|
| Worker requests | 100 000/day | `/api/*`, fallback polls (static files are free) | error 1027 page, nobody joins until midnight UTC |
| Worker CPU | 10 ms/request (cron the same, 15 min duration) | heavy parsing | that request fails |
| Subrequests | 50/request | outbound API calls | that request fails |
| DO requests | 100 000/day; incoming WS messages count 20:1 | sockets, alarms, fallback | every object refuses work |
| DO duration | 13 000 GB-s/day (≈ 29 awake object-hours at 128 MB) | objects kept awake by timers or held polls | same |
| DO rows read / written | 5 M / 100 000 per day | writes per user action: **the first limit a busy evening hits** | same |
| DO storage | 5 GB per account | images | every write fails until objects expire |
| Workers Logs | ~200 000 events/day, a few days | one line per request | logging stops, site works |
| Cron triggers | 5 per account (we use 1) | — | — |

Lessons: one anonymous script can spend an account-wide DO quota in minutes over WebSocket messages, which no edge rule
sees (CF-1, fixed in-object by QUOTA1a); held HTTP polls keep objects awake (CF-2, QUOTA2); make the storage budget
arithmetic fit the 5 GB (images capped to 3 GB over 30 days); measure with a load harness that reads a lab-only meter.

Alerts (owner, no code), all **open** unless he confirms:
1. Notifications → Add → usage-based / Workers / Durable Objects usage at 50 % and 80 % of the free daily numbers, by
   e-mail.
2. Notifications → Workers error rate (if offered on Free).
3. On Paid: billing notification and a monthly review; there is no hard cap.
4. Read the numbers: Workers & Pages → the Worker → Metrics; → Durable Objects (requests, duration, rows, stored data);
   Account → Billing → Billable usage.

## 6. Monitoring, logs, rollback, breach

| Item | What we did | State |
|---|---|---|
| Workers Logs | `observability.enabled: true`; structured JSON lines for errors | done |
| What invocation logs hold | Cloudflare enriches them (request, metadata; maybe IP / geo / headers). Policy says "time, address requested, status, errors, ≤ 7 days". Open one log (Worker → Logs), list its fields, then fix the policy or set `observability.logs.invocation_logs: false` and log one IP-free line per request (CF-8) | open; check in the dashboard |
| Traces | optional `observability.traces` with low sampling | open (off) |
| Search words | sent in request bodies, never in URLs, so they never reach logs | done |
| Uptime inside Cloudflare | cron `*/15 * * * *` → in-process checks of the home page (`ASSETS`), `/api/version` and a fixed test room; repeated failure opens / edits / closes one `outage` issue in a private repo (≤ 1 GitHub call per run) | done; the owner watching that repo for issues: open |
| Uptime outside Cloudflare | a GitHub scheduled workflow (best-effort, may skip runs) + cloudflarestatus.com; the in-Worker check cannot see a Cloudflare outage | done (backup only) |
| Error tracking | no client/server error reporting service; a privacy-friendly `/api/report` was proposed | open (review 3 A1) |
| Kill switch | only feature flags such as `VOICE=off` and Worker variables (`keep_vars`) | partial; open (ROADMAP §6) |
| Deploy | Actions only, from `main`, in the `production` environment, then wait-live (version id 8 times), live e2e, tag | done (`github-playbook.md`) |
| Rollback | re-run the last good `main` deploy in Actions, or `wrangler rollback` (needs a token on a trusted machine); DO migrations cannot be rolled back, so never delete a class or edit a migration tag; keep the previous build's hashed assets so open tabs still load | documented; never rehearsed (open) |
| Breach steps | contain in the first hour (roll back, rotate secrets, switch the feature off), understand in a day (Workers Logs ≤ 7 days, Actions runs, audit log), report within 72 h, tell users, fix with a regression test (`breach-plan.md`) | done as a plan |

## 7. Next project: Cloudflare setup in order

1. Create the account; turn on 2FA (app or key) and store recovery codes in the password manager; check Members.
2. Decide Free vs Paid on paper: list every daily limit the design leans on and what stops at each.
3. `wrangler.jsonc` from day one: `compatibility_date`, `assets` with `run_worker_first: ["/api/*"]`, SQLite DO
   migrations, `observability`, `version_metadata`, `keep_vars: true`, rate-limit bindings; no secrets in it.
4. Run `wrangler types` and commit the output; add a CI diff check; no hand-written duplicate `Env`.
5. Code rules before the first feature: capped body reads, Origin check, id patterns before waking an object,
   Worker-owned internal headers, a daily-keyed IP hash, a top-level JSON error wrapper, timeouts on every fetch.
6. In every DO: free keepalive via `setWebSocketAutoResponse`, a per-connection message bucket incl. pings, a per-IP
   connection cap, one alarm for all durable work, capped lists, self-delete after a TTL.
7. Cross-object budgets (uploads, sessions) in small per-IP-hash gate objects, not one global object.
8. `_headers` with a strict CSP (no inline scripts), nosniff, referrer and permissions policies, `frame-ancestors`.
9. Create a custom API token (Workers Scripts: Edit, one account, expiry); store it only as a GitHub `production`
   environment secret; deploy via Actions with `--secrets-file` from a temp file; no credentials in agent sessions.
10. Usage notifications at 50 % / 80 %; bookmark Metrics, DO metrics and Billable usage.
11. One cron uptime check inside the Worker plus one outside check; alerts as a single issue in a private repo.
12. Open one invocation log and make the privacy policy match its fields (or turn invocation logs off).
13. Write the rollback and breach steps before launch and rehearse one rollback.
14. Own domain early (before any store listing names an address): Registrar, custom-domain routes, Always HTTPS,
    TLS 1.2, DNSSEC, HSTS, one rate-limiting rule, a method-allowlist WAF rule, then `workers_dev` / `preview_urls`
    off; Bot Fight Mode only after testing WebSockets.
15. A load harness with a lab-only meter before launch; re-check costs against the real numbers.
