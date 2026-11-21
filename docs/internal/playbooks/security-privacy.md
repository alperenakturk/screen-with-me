# Security and privacy playbook

A project-independent checklist built from what this project did. Each item is marked **done**, **open**, or
**check** (the repo does not record it; check the account or dashboard). Sources: `CLAUDE.md` §5 / §7 / §10,
`security-review-1.md` … `-4.md`, `security-review-cf.md`, `breach-plan.md`, `web-store.md`, `store-checklist.md`,
`apps/web/public/privacy.html` / `terms.html`, `SECURITY.md`, `.github/dependabot.yml`, `github.md`.
Cloudflare specifics live in `playbooks/cloudflare.md`.

## 1. App-level rules (written as invariants, checked by tests or CI)

| Rule | How | State |
|---|---|---|
| Server is the single source of truth | Clients send intents; the server decides state and broadcasts it | done |
| Validate every client message on the server and **copy it into a new object** | `protocol.ts` validators; unknown / extra fields are dropped, so nothing a client adds is stored or relayed | done |
| Protocol changes are versioned | Incompatible change → bump `PROTOCOL_VERSION`; optional new fields need no bump; never bump during a store review | done |
| No `innerHTML` for user data | `textContent` / DOM building only; a review grep for `innerHTML` in every pass | done |
| One text cleaner for everything others see | `cleanText` (control chars, bidi tricks, length) on every typed text, server side | done |
| Rate limits live on the server | Per connection, per member, per IP hash, per object, plus cross-object gates; client limits are only UX | done |
| Never send internal ids to clients | Browser ids, IP hashes, pin owners, voters, ban lists (ban list only to the host, without ids) | done |
| Owner checks (IDOR) | Host actions check a persistent host key, not a client claim | done (M2, make-host during the 20 s grace: check it is closed in the cards) |
| Capped body reads | Streams with a byte limit (`readCapped`); no `request.json()` on raw input | done |
| Origin check on every browser route and socket | Own origin only; `localhost` only in dev | done (drop prod `localhost` with the own domain: open) |
| CSP, no inline scripts | `_headers`; every new third-party host added in the same PR; app refuses to run in foreign frames | done |
| SSRF | Outbound fetches host-anchored, hop-limited, with timeouts | done; one `redirect: 'follow'` and one call without timeout still open (R4-7) |
| Randomness | `crypto.randomUUID` / `getRandomValues` for ids, tokens, game secrets | done |
| Hidden game state stays on the server | Fleets, answers, decks never sent before they are public | done |
| Test powers never deployed | Lab flags only on the local dev server + a localhost URL; a CI check keeps them out of config | done |
| Debug tooling shows no one else's data | Test Lab log redacts browser ids, IP hashes, tokens, `data:` images | done |
| Abuse tools for users | Kick / ban by browser id (limit of an account-free design), knock to enter, block-for-me, report | done |
| Error answers carry no internals | JSON error, structured log without IP / id / text | done |

## 2. Browser extension (Manifest V3)

| Item | What we did | State |
|---|---|---|
| Least permissions | `storage`, `offscreen` (mic / camera in the extension's own document), `scripting` (inject the packaged bridge into already-open tabs once), host `<all_urls>` (find the video on any site); each justified in the store form | done; re-review before every submission |
| No remote code | No `eval` / `new Function`; every script is packaged; the website shown in the overlay iframe runs on its own origin, never in the extension context (say so in the reviewer notes) | done (zip scanned for STORE2) |
| Does nothing outside a room; never on our own site; no UI of its own beyond the overlay and one card in closed shadow DOM | `exclude_matches`, `ancestorOrigins` | done |
| No ad-block lists, no `window.open` wrapper, no ad skipping, no `tabCapture` re-broadcasting, DRM never bypassed | design rules | done |
| Message passing | Messages carry a fixed `source` string and are checked by origin; the shell refuses tabs it did not open | done |
| Single purpose statement + data-usage boxes match the privacy policy | Declaring too little gets an item rejected; declaring more does not | done (`web-store.md`, STORE2 re-check) |
| Public texts | No film / series / piracy site names, no "open source", no donation prompt in a room | done (CI name / text checks) |
| Store account | 2-step verification on the publishing Google account; contact e-mail verified | check (owner) |
| Freeze during review | No `PROTOCOL_VERSION` bump while a store review runs | rule; open on submission day |
| Edge / other stores | Partner Center account | open (owner) |

## 3. Privacy (KVKK + GDPR)

| Item | What / where | State |
|---|---|---|
| Account-free by design | No sign-up, no e-mail, no analytics; identity = a random browser id in localStorage | done |
| Privacy policy, two languages | `privacy.html` EN + TR (`?lang=`), dated, with a "Changes" list; terms in `terms.html` with an abuse section (72 h) | done |
| Core legal parts | Data controller, legal basis per purpose, rights and how to use them, transfers abroad (hosting, video and code-hosting providers), minimum age (13), complaint authority, breach section | done in the policy (review 4 R4-12 / H3); a lawyer's read before 1.0: open |
| Data minimisation | IP never stored; only a daily-keyed HMAC hash in memory for limits; yesterday's hashes cannot be linked | done |
| Retention, written per item | Room data 24 h after the last person leaves (30 days if saved); game tables 24 h; chat images 24 h (7 days saved); recaps / usage counts ≤ 90 days, numbers only; server logs ≤ 7 days; search caches ≤ 24 h by words, never by person; TV / device links 12 h after last use; reports and feedback until handled, ≤ 90 days | done; every expiry runs from an object alarm |
| Logs match the policy | Search words in request bodies, never URLs; invocation-log fields still to compare with the policy sentence (CF-8) | open |
| Peer-to-peer IP exposure | Voice / camera / streams are direct between browsers, so peers see each other's public IP; disclosed in the policy's voice section (the separate pre-voice notice was removed by the owner's choice, SIMP1). A TURN / SFU relay would hide it | done (disclosure); relay open (after 1.0, needs a budget) |
| Third parties named | Video players receive the viewer's IP when embedded; privacy-enhanced YouTube host, lazy-loaded; searches go server-to-server with our key | done |
| Feedback | Sent as an issue to a **private** repository with a fine-grained token (Issues: write, one repo); no IP, room id, names or chat stored; optional "technical details" shown before sending | done |
| Reports | Name + last chat lines sent to us, deleted when handled (≤ 90 days) | done |
| New data → policy first | Any new collection or storage updates `privacy.html` in both languages in the same PR (CLAUDE.md §7) | rule, done |
| Moving data between devices / domains | Carried in the URL fragment (never sent to a server), accepted only from a known referrer within 2 minutes | done |
| Contact addresses | A working privacy / abuse address on the policy; role addresses (`privacy@`, `abuse@`) with the own domain | done / open with the domain |

## 4. Reviews: cadence

| Review | When | Trigger and focus |
|---|---|---|
| 1 | 28 Oct 2026 | Owner's concerns: custom emojis, IP exposure in peer-to-peer media |
| 2 | 2 Nov 2026 | Every feature since review 1, every protocol message, policy vs code (KVKK / GDPR) |
| 3 | 3 Nov 2026 | Pre-launch checklist, Cloudflare setup, owner account actions |
| 4 | 4 Nov 2026 | Repo went public: live headers, best practices, history for leaks |
| CF | 8 Nov 2026 | Cloudflare platform audit: quotas as a denial-of-service surface |

Cadence that worked: one read-only Security session per milestone step or big trigger (new feature class, going
public, before a store submission, before 1.0); findings get IDs and severities, become "Proposed" cards, and the
next review lists what is still open instead of repeating it. **Open:** a review before 1.0 / after the store
submission, and a fixed rhythm (e.g. every milestone gate) written into the roadmap.

## 5. Breach plan (`breach-plan.md`)

- Written, one page, linked from `SECURITY.md`; the policy promises the same. **done**
- Steps: contain in the first hour (roll back, rotate every possibly exposed secret, switch the feature off,
  unpublish a bad extension build) → understand in a day (logs ≤ 7 days, CI runs, audit log; incident file without
  personal data) → report to the authority within 72 h (KVKK form; EU authority where people live) → tell the people
  affected → fix with a regression test. **done as a plan; never rehearsed: open**
- Any session that notices a possible breach tells the hub at once; nobody waits for certainty. **done (rule)**
- Vulnerability intake: GitHub private vulnerability reporting + a "Security" e-mail subject, 7-day answer target
  (`SECURITY.md`). **done**

## 6. Accounts, passwords and 2FA

| Item | State |
|---|---|
| Every password, token and secret in the password manager (KeePass), one folder per project | done (rule) |
| Entry fields, given at the moment a secret is created: Title `Where – What for`; User name; Password (where to copy it from); URL; Notes (what for, where stored, expiry); generator letters + digits only when it goes into a URL | done (rule) |
| Never paste a secret into a chat or a session; never list future entries in advance | done (rule) |
| 2FA (app or security key, not SMS) on GitHub, Cloudflare, the Google account owning API keys, the store publisher account; recovery codes in the password manager | GitHub: done; others: check (asked in reviews 3 and 4, not confirmed) |
| Smallest tokens with expiry: custom cloud deploy token, fine-grained GitHub tokens (one repo, fewest permissions), API key restricted to one API | feedback + tag tokens: done; cloud token + API key restriction: check |
| Private commit e-mail; block pushes that expose it | done |
| Agent sessions hold no deploy credentials | done |

## 7. Repository and supply chain

| Item | State |
|---|---|
| Public repo: never commit secrets, private e-mails or "hidden" addresses (a secret URL is not access control) | done (rule) |
| Secret scanning + push protection | done (21 Nov 2026) |
| Dependabot alerts + security updates; weekly npm (grouped dev tools) and Actions updates through normal CI | done |
| CodeQL default setup | done |
| Lockfile + `npm ci`; install scripts reviewed (only build tools need them); no secrets in the install step's environment | done |
| Actions pinned by commit SHA; workflow token read-only, write only on the tag job; `pull_request`, never `pull_request_target`; fork PRs need approval | done |
| Deploy secrets in a `production` environment limited to `main`, step-scoped | done |
| Ruleset on `main`: PR required, required checks, no force push, no deletion | done |
| Shipped code contains no third-party package code; a new runtime dependency needs a licence check (MIT / Apache / BSD) and a line in `third-party-notices.txt` (fonts are OFL, self-hosted) | done (rule) |
| Licence: all rights reserved, source-available; every `package.json` `UNLICENSED` + `private` | done |
| `npm audit` / dependency review as a CI gate | open (ROADMAP §6 checkbox) |
| Staging environment with separate keys | open |
| Error tracking without personal data | open |

## 8. Next project: security setup in order

1. Accounts first: password-manager folder for the project; 2FA (app / key) on code host, cloud host, API and store
   accounts; recovery codes stored; private commit e-mail.
2. Repo settings before the first push: secret scanning + push protection, Dependabot (alerts, updates, config file),
   CodeQL, private vulnerability reporting, `SECURITY.md`, ruleset on `main`, read-only workflow token, fork approval.
3. CI: SHA-pinned actions, `pull_request` only, lockfile + `npm ci`, a `production` environment for deploy secrets,
   secrets step-scoped, uploaded from a temp file; agents never get deploy credentials.
4. Smallest tokens with expiry dates and calendar reminders; one password-manager entry each.
5. Write the invariants before features: server validates and copies every message, single text cleaner, no
   `innerHTML` for user data, server-side rate limits, internal ids never leave the server, capped body reads, Origin
   checks, crypto randomness, test powers local only.
6. Strict CSP + security headers from the first page; no inline scripts.
7. Privacy by design: decide what you never collect; hash IPs with a rotating key; write a retention time for every
   kind of data and enforce it with alarms / TTLs.
8. Privacy policy + terms in every product language before launch: controller, legal basis, rights, transfers,
   minimum age, complaint authority, retention table, abuse contact; a "Changes" list; a lawyer's read.
9. Feedback and reports to a private place with a narrow token; no personal data kept beyond need.
10. Breach plan (contain / understand / report in 72 h / tell / fix) and a rollback path; rehearse once.
11. Extension (if any): MV3, least permissions each with a justification, no remote code, data-usage form matching
    the policy, no own UI beyond what is needed, freeze protocol changes during review.
12. Supply chain: licence check for every runtime dependency, a third-party notices file, prefer no shipped
    third-party code.
13. A read-only security review at each milestone and before every store submission or going public; findings become
    cards with IDs; the next review starts from the open list.
