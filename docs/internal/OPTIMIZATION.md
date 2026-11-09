# Optimization plan (November 2026, before 0.9.98)

Owner's request (9 Nov 2026): "the project became messy and concepts got mixed; make it safer, optimized, easier
and more flexible." Inputs: a Cloudflare best-practice security audit (Cloudflare's own `workers-best-practices`,
`durable-objects` and `wrangler` skills, report `docs/internal/security-review-cf.md`) and a documentation sprawl
analysis (report `docs/internal/docs-sprawl.md`). This file is the plan; each part becomes cards in `CARDS.md`.

## Goals
1. **Safer:** no anonymous person can take the whole site down by using up the free Cloudflare quotas.
2. **Lighter for every session:** a session starts by reading ~25 KB of rules, not ~590 KB.
3. **One name for one thing, one place for one fact.**
4. **Easier to change:** a feature's facts live in one area file; a release never edits the rules file.

## Part A: security and cost (Cloudflare audit)

| ID | Sev. | Problem | Fix (card) |
|---|---|---|---|
| CF-1 | High | One anonymous client can burn the account-wide Free Durable Object quotas (100 k requests, 100 k rows written a day) in minutes over WebSocket messages; pings are unlimited; every limit is per connection / per object. On Free, objects then fail until 00:00 UTC: the whole site stops. Edge/WAF rules never see WebSocket frames. | **QUOTA1:** per-IP message budget inside each object (pings included), hard per-connection ceiling, `setWebSocketAutoResponse` for keepalive pings (no object wake, no billing), batch the `chat`/`room` writes, a cross-room per-IP gate for writes; usage alerts at 50 / 80 %. |
| CF-2 | Medium | HTTP-fallback polls keep objects awake (billed GB-s); one address can hold ~400 objects awake; each fallback message = 1 Worker + 1 DO request. | **QUOTA2:** cap open fallback sessions per IP across objects, shorter held polls when idle, count fallback in the QUOTA1 budget. |
| CF-3 | Medium | No per-IP cap on connections per room: a script can fill a known room (50 seats) and return after a kick with a new browser id. | **ROOMCAP:** ≤ N connections per IP hash per room (N ≈ 6: a family behind one router), join attempts per IP per room per minute. |
| CF-4 | Low | The room object reads ~27 keys + all images (≤ 10 MB) on every wake; pings wake it every 10 s. | With QUOTA1's auto-response; one batched read; images only on join. |
| CF-5 | Low | Image budget (400 MB/day kept 30 days) can exceed the Free 5 GB storage; 20 addresses can use up the site-wide daily image budget. | **IMG2:** lower the daily total, shorter image life outside saved rooms, a storage total alarm. |
| CF-6 | Low | Bare timers start storage work / broadcasts without error handling (`room.ts` 12 s timer duplicates its alarm; bot timers). | Alarms only, or try/catch around timer bodies. |
| CF-7 | Low | No top-level try/catch in the Worker's `fetch`; DO `.retryable` / `.overloaded` errors unhandled; failures are Cloudflare's HTML 1101 with no structured log. | **ERR1:** one wrapper: JSON error, structured log line, one retry for `.retryable`. |
| CF-8 | Low | Workers invocation logs may hold more (IP, location, headers) than the privacy policy lists. | Owner opens one log in the dashboard; policy or log settings follow. |
| CF-9–12 | Info | Stale generated types; internal objects via `fetch()` instead of RPC; `LAB_CODE` without a minimum length; `/info` forwards client-sent internal headers. | One small hygiene card (**HYG1**). |

**Owner decision (money):** Workers **Paid** ($5 / month) raises the DO limits from "stop for the day" to "pay per
use" and removes CF-1's site-wide stop, but has no hard spending cap. Recommendation: stay on Free, ship QUOTA1 +
alerts first; revisit Paid at launch with real traffic.

## Part B: documentation

Today every session loads CLAUDE.md (252 KB: 15 % rules, 47 % feature reference, 38 % history; one "Live" line is
64 KB), and the roles also read STATUS (127 KB), CARDS (181 KB) and ROADMAP (31 KB). 25 statements contradict each
other or the product.

**Target:**
- `CLAUDE.md` ≈ 22 KB: what Sidelit is; a map of where things live; language rule (said once: the owner hears Turkish,
  everything in the repo is English); roles and who edits which file; working with the owner; product rules;
  must-not-break invariants (one line each + link); structure + commands; release checklist; cloud sessions; licence.
- `docs/internal/architecture/<area>.md` (~15 files): every technical fact moved verbatim, then tidied: sync engine,
  rooms + protocol, chat / reactions / avatars, networking + hosting, shell + extension, players (YouTube, Shorts,
  TikTok, Vimeo, podcasts), room UI on a computer, phone / tablet / TV, voice / camera / stream, sound, games tables,
  side games, Test Lab, security + privacy, CI / release / ops (+ web performance).
- History → `CHANGELOG.md` (user-facing, exists) + `docs/internal/archive/` (developer notes, old STATUS / CARDS).
- `STATUS.md` ≈ 15 KB: where we are, the current owner test round, pending owner decisions, ideas list.
- `CARDS.md` ≈ 15–20 KB: format, lanes, In progress, Ready, Proposed; finished cards → archive.
- `ROADMAP.md` ≈ 15 KB.

**New rules:** CLAUDE.md never records what a release did (CHANGELOG does; how it works goes to the area file).
Only the Planner edits CLAUDE.md, and only when a rule or the map changes. A developer updates the area file of the
feature they changed.

**Safety net:** `scripts/check-docs.mjs` (CI) proves every backticked identifier of the old CLAUDE.md still appears
in some doc after the move, and fails on CLAUDE.md > 30 KB.

**Order:** 1) archive finished material; 2) move sections verbatim into area files and mine the Live line (≈ 50
identifiers live only there, e.g. `room.css`, `GameSocket`, `GHOST_MS`, Last Heart has no section at all); 3) the
check script; 4) rewrite CLAUDE.md; 5) apply the glossary.

## Part C: one name for one thing (glossary)

| Today | Canonical |
|---|---|
| Test Lab / debug panel / test panel / Test Panosu | **Test Lab** (TR UI: Test Panosu) |
| checklist page / test board / board / hidden board page / option pages | **the owner's board** (one Artifact URL, kept by the Planner) |
| lanes A / B / B2 | **lane A** (room / site), **lane B** (players, Shorts, extension, ops), **Game Studio** |
| ScreenWithMe / Sidelit / PlayWithMe | **Sidelit** (old names only in "kept on purpose") |
| rail (4 meanings) | **rail** = the control column `#fs-dock`; **side panel** = `.side`; **Shorts bar**; `.yt-rail` = rail on a YouTube player |
| hall / hub / gallery; tables / room games; solo / side games | **games hall**; **tables** (shared); **side games** (solo) |
| ghost (3 timeouts) | **stale connection** (room, 150 s), **silent game socket** (90 s), **idle fallback session** (45 s) |
| host (4 meanings) | **host**, **acting host**, **table host**, **opener** |

## Part D: process

- **One tracker:** CARDS = work, STATUS = owner-facing state, CHANGELOG = what shipped. Nothing else records work.
- **One owner channel:** the owner talks only to the Planner; questions go as chat questions; the board is for test
  ticks.
- **Sessions:** keep three building sessions (lane A, lane B, Game Studio) only while the queue has work for each;
  otherwise park them. Planner assigns versions (unchanged).
- **Each PR names the area file it updated** (CI check: a change under `apps/` without a change under
  `docs/internal/architecture/` prints a warning, never fails).
- **Numbers that drift** (test counts, sizes) are not written as current facts in rules; they live in the area file
  with a date or come from the script.

## Council review (llm-council, 9 Nov 2026) and the changes it made

Five advisors (Contrarian, First Principles, Expansionist, Outsider, Executor) and five anonymous peer reviews.
Every advisor said the first draft had the **order backwards**: docs first, while the one finding that can stop the
whole site waited. What changed:

- **Quota first, and ordinary success is the threat, not only abuse.** Free Durable Objects get ~13 000 GB-s a day
  (≈ 29 awake object-hours for the whole account). Clients ping every 10 s and an object hibernates only after 10 s of
  quiet, so a busy room never sleeps. A modest launch evening could use the day up with no attacker.
- **The ping is not only a keepalive.** It feeds `ServerClock` (sync), the room's last-seen check (150 s), the games'
  silent check (`GHOST_MS` 90 s) and `RoomConnection`'s 15 s reconnect. `setWebSocketAutoResponse` must be paired with
  `getWebSocketAutoResponseTimestamp` and a rarer clock ping; the HTTP fallback can't auto-respond at all.
- **Per-IP limits must not hit real people:** Turkish mobile carriers put many users behind one IP (carrier NAT), and
  CI's live e2e opens every socket from one GitHub runner IP. Limits are per connection and per room first; any
  per-IP number is generous and has a test exemption.
- **Every new limit:** a Worker variable (loosen it without a code release), a friendly EN + TR message, a Test Lab
  command to trigger it, and a local load test that measures DO requests / writes before and after.
- **No deferred playback writes** (the server stays the single source of truth); **no cross-room gate on every
  hello** (a new single point of failure).
- **CF-5 is worse than rated:** full storage does not reset at midnight; it lasts until rooms expire (up to 30
  days). IMG2 ships with QUOTA1a.
- **Docs: the mess is a write habit, not only size.** CLAUDE.md grew because every release appended to it. The
  cheap, safe step comes first: history out, a hard size cap in CI, the rule "rules files never record a release".
  Area files are written as each area is touched, with intent and invariants, not copies of constants the code
  already holds.
- **Cut-over for parallel sessions:** merge or park every open PR, move in one PR, then tell every session the new
  map. Batch server cards into one deploy (each deploy restarts every object and drops the owner mid-test).
- **Ask the owner what "messy" means to him.** He tests the product, not CLAUDE.md; mixed concepts may be product
  ones. He gets a one-page Turkish product map.
- **Workers Paid:** the owner decided in Oct 2026 not to put a card on Cloudflare (Paid has no spending cap). It stays
  his decision, explained in plain Turkish (00:00 UTC = 03:00 in Istanbul); not part of this plan's work.
- Rejected for now: telemetry dashboards (new personal-data processing → policy work), UI-wide renames before 1.0,
  RPC migration, session parking rules.

## Order of work (after the council)
1. **Owner, no code:** turn on Cloudflare usage notifications if Free offers them; read today's real DO numbers.
2. **DOCS1 (Planner, one PR, now):** CLAUDE.md becomes rules + map (≈ 25 KB). The feature reference moves verbatim to
   `docs/internal/architecture/reference.md` (one file for now, nothing lost), the 64 KB release history to
   `docs/internal/archive/`. `scripts/check-docs.mjs` (CI): CLAUDE.md ≤ 30 KB and every backticked identifier of the
   old CLAUDE.md still appears somewhere under `docs/` or `CLAUDE.md`. All lanes rebase after it.
3. **QUOTA1a (lane A, one deploy):** measure locally first; keepalive redesign above; per-connection message ceiling
   (pings included); per-room connection cap with NAT-safe numbers and a CI exemption; all as Worker variables with
   friendly messages and Test Lab commands; IMG2 in the same deploy.
4. **Owner's 0.9.98 test round** on the server that QUOTA1a leaves behind.
5. **Then, as each area is touched:** split `reference.md` into area files (≈ 6–8), resolving its contradictions and
   applying the glossary inside each one; ROOMCAP leftovers, QUOTA2, ERR1 as normal cards; HYG1 after 1.0.
6. **STATUS / CARDS slimming** (finished material → archive) in the same style as DOCS1, after the test round.
