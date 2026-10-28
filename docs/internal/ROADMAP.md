# ScreenWithMe roadmap: to 1.0 and beyond

_Owner's plan (Alperen, 28 Oct 2026), completed and structured by Claude. Current version: 0.9.82._
Items marked **(added)** were not in the owner's original list; Claude proposed them. Items marked 👤 need the owner
(money, accounts, legal commitments, final naming). Everything else Claude drives on its own initiative, one version
at a time (0.9.83, 0.9.84, …; never 0.9.9 — Chrome compares version parts numerically).

Detailed background lives in older docs that are still in Turkish until migrated: `VIZYON.md` (vision, "v1.0" test
list, big services, donations, going public), `BUYUME.md` (growth), `gelecek-fikirler.md` (ideas),
`oyun-fikirleri.md` (games), `rakip-analizi.md` (competitors), `name-research.md` (name and trademark).

## Principles from now on
- **Professional and serious:** every change has a reason, a test and a clear English commit/PR.
- **Quality over quantity before 1.0:** no big new feature areas until the 1.0 gates below are met; polishing and
  fixing come first. (New games from `oyun-fikirleri.md` wait unless the owner asks for them.)
- **English on GitHub, Turkish with the owner** (see `CLAUDE.md` "Language and GitHub conventions").
- **Consistency:** one name, one vocabulary, one set of numbers across code, UI, policy and docs.

---

## Phase 1 — to 1.0 (Chrome Web Store launch)

### 1. Polish existing features
The owner will go through every feature and describe what should be better. For each one: collect the feedback here,
implement, test, ship.
- [ ] Owner's feature walkthrough (list to be filled in as we go)
- **Feedback round 1** (owner's friends, real use, 28 Oct 2026; scheduled as 0.9.83–0.9.88 in `STATUS.md`):
  - [x] Extension popup button opens our site in a **new tab** instead of replacing the current tab (the room broke).
  - [x] Up-to-date extension was told "outdated" on a film site and couldn't continue until reinstalling.
  - [ ] Voice/camera: tiles drop and return (maybe on game open/close); duplicate tiles of one person (one frozen);
    own camera visible in a slot; small audio glitches.
  - [x] Film ducking: **off by default**, only in Settings; triggers on real speech, never on a click.
  - [ ] Meet-style controls under camera tiles (mic/camera on/off while watching).
  - [ ] Discord-style per-person controls: mute for me, volume for me, host kick; pin a camera; hide my own camera;
    resize tiles in both directions.
  - [ ] Scheduled start: currently meaningless; make it clear and well designed.
  - [ ] ⚙️ next to the profile picture; remove the other settings entry points (tab row, profile menu).
  - [ ] YouTube player: controls linger after the mouse leaves; YouTube volume control doesn't work.
  - [ ] **New feature:** YouTube search inside the app (like Watch2Gether): type in the top box, pick from results.
- [ ] **Before 1.0:** try Shorts / Reels scrolling together end to end (owner's request).
- [ ] **(added)** First-time experience: someone who has never seen the site arrives with an invite link, installs
  the extension and watches — measure the steps and remove friction.
- [ ] **(added)** Simplify the room for newcomers: rarely used features (scheduled start, voting, saved rooms, recap)
  could move under "More" (owner decides).
- [ ] **(added)** Accessibility: WCAG AA contrast (primary button purple #8b6cff with white text is ~3.8:1, proposal
  #6a4cf2), keyboard navigation, focus states, screen-reader labels, `prefers-reduced-motion`.
- [ ] **(added)** Performance budget: first load size, room join time (< 30 s from link to watching), CPU while
  watching (extension), memory on long sessions.
- [ ] **(added)** Help / FAQ page on the site (TR + EN): how it works, extension permissions explained, troubleshooting.

### 2. Zero known bugs
- [ ] Use **GitHub Issues** as the single bug list (labels: `bug`, `security`, `legal`, `polish`, `extension`,
  `site`, `server`; milestone `1.0`). Every bug found by anyone becomes an issue; every fix gets a regression test.
- [x] Full test pass in the cloud on 0.9.82 (28 Oct 2026; results in `STATUS.md`).
- [x] Fix the film-page cover flash (embed harness, first transition from site to film page shows the film site for
  one frame).
- [ ] Make test harnesses deterministic (voice harness defaults to two different fake audio files; no test should
  need special env vars to pass).
- [ ] **(added)** Extension tests in CI (headless Chromium + `scripts/harness/embed`), so extension regressions are
  caught on every PR, not only manually.
- [ ] **(added)** Real-world test round (from `VIZYON.md` "v1.0"): two computers with a friend, 5+ player types, a
  film longer than an hour, network drop / reload / sleep, Brave and Edge 👤 (owner runs it, Claude prepares the list).
- [ ] **(added)** Closed beta: 5–10 real people for 1–2 weeks with an easy feedback channel (form or e-mail).
- [ ] **(added)** Privacy-friendly error reporting: client errors reach us without personal data (e.g. a small
  `/api/report` endpoint with rate limits, opt-in), so we hear about bugs we can't see.
- [ ] Mobile pass: phone layouts (Android Chrome, iOS Safari) for the site and PWA.

### 3. Security: minimum attack surface
- [ ] **(added)** Threat model document: assets (rooms, cids, IPs in voice, stickers), attackers (troll in a room,
  malicious website hosting the extension's shell, spammer, DoS), and the mitigation for each.
- [ ] Protocol review: every message type validated, size/rate limits reviewed, fuzz test for `protocol.ts`.
- [ ] **(added)** Security headers on the site: Content-Security-Policy, `frame-ancestors`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`.
- [ ] Extension review: minimum permissions with written justifications, `postMessage` origin checks, no remote code
  (Manifest V3 policy; the shell iframes our site — document why this is allowed), closed shadow DOM everywhere.
- [ ] **(added)** User-generated content: custom emojis (images) and chat in rooms → abuse limits, a way to remove
  content, and a report/contact address.
- [ ] **(added)** WebRTC: peer-to-peer voice/video reveals IP addresses to people in voice; say this clearly in the UI
  and the privacy policy (already partly done), consider TURN-only mode later.
- [ ] Dependency audit (`npm audit`, Dependabot), secret scanning, branch protection on `main` (PR + green CI).
- [ ] **(added)** `SECURITY.md` with a disclosure contact (needed once the repo is public anyway).
- [ ] Owner will add security/privacy testing skills and repos 👤 → run them, record results here.

### 4. Legal: name, law, policies
- [ ] **Final product name** 👤: research is in `name-research.md` (no registered "ScreenWithMe" mark found, but the
  name is descriptive and the category is crowded). Owner checks TÜRKPATENT / TMview / USPTO / WIPO (30 min) and
  decides: keep or rename. Must happen **before** the store submission and the domain purchase.
- [ ] Trademark filing (TÜRKPATENT, word mark, classes 9 + 42, optionally 38) 👤 — money; recommended soon after the
  name is final, at the latest a few months after 1.0.
- [ ] Privacy policy review against the code (GDPR + Turkish KVKK): what we store, how long, where (Cloudflare), the
  rights of users, contact address. Numbers must match the code.
- [ ] **(added)** Terms of use (none yet): acceptable use, no illegal content, no warranty, account-free bans,
  minimum age (13+), governing law.
- [ ] **(added)** YouTube API Services Terms: we embed YouTube; the terms require linking YouTube's ToS and Google's
  privacy policy in our privacy policy and following their branding rules.
- [ ] Chrome Web Store program policies: single purpose, permission justification, Limited Use of user data, no
  piracy names anywhere (listing, screenshots, reviews we answer).
- [ ] **(added)** Copyright/takedown process: a contact address and a short procedure (we host no video, but custom
  emojis and room names are user content).
- [ ] **(added)** Asset licenses: fonts, sounds (generated), drawings (generated), icons — list them in one file.
- [ ] Donations (after 1.0) 👤: tax status in Turkey (ask an accountant), platform choice.
- [ ] Legal entity question 👤: personal project vs. sole proprietorship (affects whose name the trademark and
  store account are under).

### 5. Consistency
- [ ] One name everywhere (after the name decision): site, extension, store, README, e-mails, social accounts.
- [ ] One vocabulary: TR glossary in `CLAUDE.md`; **(added)** matching EN glossary for the English UI.
- [ ] One set of numbers: limits and retention (rooms 24 h / 30 days, recaps 90 days, voice 6, cameras 4, viewers 4…)
  identical in code, UI, privacy policy, README and store listing — **(added)** keep them in one shared constants
  file and generate/check the docs from it.
- [ ] English-first repo: translate `docs/internal/*.md` (rename to English file names), workflow names, code
  comments (new code now; full pass before going public). Turkish URLs/routes (`/baglanti`, `eklenti.html`,
  `gizlilik.html`) get English names with redirects.
- [x] `CLAUDE.md`, `STATUS.md`, `ROADMAP.md`, CI workflow and PR titles in English (28 Oct 2026).
- [ ] **(added)** `CHANGELOG.md` (English, one entry per version) + git tags / GitHub Releases from 1.0 on.

### 6. Operations
- [ ] **Own domain** 👤 (bought together with the final name; e.g. `.app`, ~10–15 $/year, Cloudflare Registrar) →
  move the site off `workers.dev` (also helps networks that filter workers.dev), update the extension's site address,
  invite links, store listing.
- [ ] **(added)** Support e-mail on the domain (e.g. hello@…), used in the store listing, policies and `SECURITY.md`.
- [ ] **(added)** Monitoring: uptime check, Cloudflare usage alerts, error rate; a simple status note when down.
- [ ] **(added)** Capacity and cost: free-plan limits (Durable Objects 100k requests/day), load test with many rooms,
  a plan if we go viral (Workers Paid ~5 $/month 👤).
- [ ] **(added)** Privacy-friendly usage metrics to measure the success criteria (rooms with 2+ people for 10+ min,
  returning users) without cookies or personal data.

### 7. 1.0 launch
- [ ] Gate: phases 1–6 checked (or consciously deferred by the owner).
- [ ] Version `1.0.0` → `npm run store` → submission from the owner's developer account 👤.
- [ ] While in review: no `PROTOCOL_VERSION` bump.
- [ ] After approval: install links point to the store, `eklenti.html` updated.
- [ ] **(added)** Reserve social handles under the final name 👤 (Instagram, TikTok, X, YouTube, GitHub org, Product
  Hunt) as soon as the name is final — before announcing anything.
- [ ] Launch content: 30–60 s demo video/GIF, store screenshots, a short landing page story; first Instagram/TikTok
  posts (owner's plan; Claude can draft scripts and visuals).
- [ ] **(added)** Feedback loop: in-product "send feedback" link, GitHub issue templates, reply within a few days.

---

## Phase 2 — after 1.0
- **Keep improving features** (owner's list + `gelecek-fikirler.md`, `oyun-fikirleri.md`).
- **Big services** (Netflix, Prime Video, Disney+, Spotify…): one service at a time; each starts with a research note
  (does the player accept commands, terms of service, regional differences). Everyone uses their own subscription;
  **DRM is never bypassed**; service names only in "works with …" form when it really works. Spotify is
  music-only: check whether its terms allow synced listening control from an extension before building anything.
- **Apps:** PWA first (exists since 0.9.70); a native mobile app only if it brings something the PWA can't (owner
  decides after real usage data). Browser add-on stores: Edge, Firefox (separate manifest), Safari (needs a Mac build).
- **Growth:** launch posts (Product Hunt, Reddit, Show HN once public), Instagram/TikTok content, Discord community;
  growth plan in `BUYUME.md`.
- **Donations:** after the first real users (GitHub Sponsors / Patreon…), never inside a room.
- **Making the repo public:** right after store approval, as a new repo with clean history (plan in `VIZYON.md`).
- **More languages**, optional accounts (persistent rooms, friends) only if users ask for them.

## Success criteria (from `VIZYON.md`)
- Sync difference p95 < 300 ms (measure and publish p50/p95).
- Link → watching < 30 s; extension install < 1 min (< 10 s from the store).
- Weekly rooms with at least 2 people watching for 10+ minutes; returning user rate.
