# ScreenWithMe roadmap: to 1.0 and beyond

_Owner's plan (Alperen, 28 Oct 2026), completed and structured by Claude. Current version: 0.9.82._
Items marked **(added)** were not in the owner's original list; Claude proposed them. Items marked 👤 need the owner
(money, accounts, legal commitments, final naming). Everything else Claude drives on its own initiative, one version
at a time. Since 29 Oct 2026 releases count in a fourth part (0.9.90.1, 0.9.90.2, …); the third part moves only when
the owner calls a release big (never 0.9.9 — Chrome compares version parts numerically).

Detailed background lives in older docs that are still in Turkish until migrated: `VIZYON.md` (vision, "v1.0" test
list, big services, donations, going public), `BUYUME.md` (growth), `gelecek-fikirler.md` (ideas),
`oyun-fikirleri.md` (games), `rakip-analizi.md` (competitors), `name-research.md` (name and trademark).

## Principles from now on
- **Professional and serious:** every change has a reason, a test and a clear English commit/PR.
- **Quality over quantity before 1.0:** no big new feature areas until the 1.0 gates below are met; polishing and
  fixing come first. (New games from `oyun-fikirleri.md` wait unless the owner asks for them.)
- **English on GitHub, Turkish with the owner** (see `CLAUDE.md` "Language and GitHub conventions").
- **Consistency:** one name, one vocabulary, one set of numbers across code, UI, policy and docs.

## Focus: now / next / frozen (owner agreed, 2 Nov 2026)
The task queue in `STATUS.md` had about twelve open items at once, and every new feature was built for two languages
and four screen sizes at the same time. From now on work follows this list; anything not in "Now" waits.
- **Core first, multipliers later:** a new feature is built and tested in English + Turkish strings as they come, on
  computer + phone. Tablet layouts and any missing translations are done as one batch at the end of each milestone
  step (the "every new string has its English" gate below), not inside every feature.
- **New ideas go to a list, not into the work:** an idea that comes up mid-task is written under "Ideas waiting for
  the owner's pick" in `STATUS.md` and ordered at the next planning, never started on the spot.
- **At most 2–3 parallel sessions:** one planning session (owner + Claude, no code) and one building session working
  on one item at a time on its own branch; a review / research session only now and then.

| | Items (in this order) |
|---|---|
| **Now** (owner, 3 Nov 2026: "do all of 1–11, I test everything at the end") | The run order in `CARDS.md`: bugs → Sidelit 0.9.95 → feedback, Shorts, thanks, debug panel, cinema mode, design sweep, tablet, accessibility, security cards (lane A); side games + Vimeo / podcasts (lane B); then council review, security pass, bug hunt → owner's test round → official work (policy, KVKK, applications) → store submission |
| **Next** (0.9.94) | Simplify the room (C + D) → Help / FAQ (EN + TR) + permission explainer → "Send feedback" (→ GitHub issues) → Shorts channel feed + Discover by country → Thanks page → debug panel → Shorts measurement → cinema mode → home page redesign → design bug sweep (cards 6–16 in `CARDS.md`) |
| **Frozen** (not before 0.9.95) | Tablet layout, accessibility pass, camera window settings pass, new ideas and games |
| **0.9.95 additions (owner, 2 Nov 2026)** | Side games: 🍿 Snack Bar (idle) → 🌱 Window Garden (cozy collection) → daily word game (EN + TR); then the move-to-device code. Accounts: none now (option A; passkey account only after 1.0 if users ask) |
| **Version plan (owner, 3 Nov 2026)** | All current work lands by **0.9.99** (feature complete); 0.9.99 → 1.0 is bug fixes, security, KVKK / legal, design fixes and the official work; then the store submission. Cloudflare: Workers **Free** (paid only with income and users) |
| **Name (owner, 3 Nov 2026)** | **Sidelit** from now on (card 6c); trademark + domain checks by the owner before 1.0 (`research/name-sidelit-check.md`) |
| **Owner's decisions to make early** 👤 | Final name and domain (0.9.96 depends on them; a good case for a multi-advisor "council" decision session) |

## Milestone gates to 1.0 (owner's request, 2 Nov 2026: "be sure each version step is fully done")
The owner's guide PDF (3rd edition, "1.0'a kadar kontrol rehberi") follows this. The third version part still moves
only when the owner says so; Claude only reports "the gate is full" or names what is missing.

**Every release (incl. 0.9.x.y):** typecheck + unit tests; a test for every change (a fixed bug's test is first shown
failing on the old code); the harnesses for the touched area; docs (CLAUDE.md, STATUS hand tests, README TR + EN);
same version in the footer and the extension. After the merge: deploy green and **live e2e green on the first
attempt** (a pass on the retry counts as red until its cause is found).

**Every milestone step (0.9.93 → 0.9.94 …), on top of its own gate:** no open bug the owner reported in that step
(or deferred in writing with his OK); that step's STATUS hand-test boxes ticked or noted; live e2e first-attempt green
on 3 deploys in a row; phone + computer each tried on a real device; every new string has its English; a one-paragraph
summary (STATUS history until `CHANGELOG.md` exists).

| Step | Goal | Gate (must be true to move on) |
|---|---|---|
| 0.9.93 | One remote, YouTube rule, phone | Owner's 0.9.92.3–0.9.93.5 hand tests done; phone walkthrough; `wait.mjs` live flake root-caused |
| 0.9.94 | (skipped as a number: its cards ship inside 0.9.93.x and 0.9.95–0.9.96) | — |
| 0.9.95 | **Sidelit**: the rename, logo D1, mascot N1 (card 6c) | no user-facing "ScreenWithMe" left (except "formerly"); icons readable at 16 px; live e2e first-attempt green |
| 0.9.96 | Finish the room features: feedback button, Shorts channel + country, thanks page, debug panel, cinema mode | each shipped with its test; hand tests in STATUS |
| 0.9.97 | Side games + more players: Snack Bar, games gallery, Window Garden, Five Frames, move code, Vimeo, podcasts | each with unit tests + harness; no scrolling at 340×300 / 360×460 
| | **Owner approved 0.9.97 (3 Nov 2026):** the side games polish (card GP) ships as **0.9.97**; until then releases stay 0.9.96.x, after it 0.9.97.x. Proposed next (owner's OK later): 0.9.98 when the security block is done (its design / tablet / a11y work already shipped as 0.9.96.x), 0.9.99 after the council review + bug hunt. | |
| 0.9.98 | Design sweep, tablet, accessibility | screenshot sweep fixed; tablet harness; contrast + keyboard harness pass |
| 0.9.99 | **Feature complete**: security cards (reviews 2–3), council review fixes, bug hunt | no known high / medium security finding open; council's must-fix list done; owner's big test round starts |
| 0.9.99.x → 1.0 | Owner's test round + bug fixes, the live-action launch video (owner, 4 Nov 2026: real actors; crew of three: one person as camera, director and editor + two actors, a man and a woman), Security final pass, privacy policy (KVKK + GDPR) + terms + lawyer if possible, trademark / domain checks, own domain + move (security review 3 R3-3), YouTube quota application, store texts and images, design fixes | 0 open bugs (or deferred by the owner); policy + terms linked; domain live; store package ready |
| 1.0.0 | Launch (§7): Chrome Web Store submission (owner, 3 Nov 2026: "then we apply") | Brave / Edge reminder, store submission, no protocol bump during review |

---

## Phase 1 — to 1.0 (Chrome Web Store launch)

### 1. Polish existing features
The owner will go through every feature and describe what should be better. For each one: collect the feedback here,
implement, test, ship.
- [ ] Owner's feature walkthrough (list to be filled in as we go)
- **Feedback round 1** (owner's friends, real use, 28 Oct 2026; scheduled as 0.9.83–0.9.88 in `STATUS.md`):
  - [x] Extension popup button opens our site in a **new tab** instead of replacing the current tab (the room broke).
  - [x] Up-to-date extension was told "outdated" on a film site and couldn't continue until reinstalling.
  - [x] Voice/camera: tiles drop and return (maybe on game open/close); duplicate tiles of one person (one frozen);
    own camera visible in a slot; small audio glitches.
  - [x] Microphone turned on by itself after a connection problem; people count grew while one person was shown.
  - [x] Film ducking: **off by default**, only in Settings; triggers on real speech, never on a click.
  - [x] Meet-style controls under camera tiles (mic/camera on/off while watching).
  - [x] Discord-style per-person controls: mute for me, volume for me, host kick; pin a camera; hide my own camera;
    resize tiles in both directions.
  - [x] Scheduled start: currently meaningless; make it clear and well designed (0.9.87 "Film saati").
  - [x] ⚙️ next to the profile picture; remove the other settings entry points (tab row, profile menu) (0.9.87).
  - [x] YouTube player: controls linger after the mouse leaves; YouTube volume control doesn't work (0.9.90.1, one remote).
  - [x] **New feature (0.9.90.4):** YouTube search inside the app (like Watch2Gether): type in the top box, pick from results.
- **Feedback round 2** (owner, 28 Oct 2026; scheduled as 0.9.88–0.9.89 in `STATUS.md`):
  - [x] Send images in chat (0.9.88).
  - [x] Links in chat are clickable (0.9.88); a "you are leaving this page" question first; they open in a new tab (our room
    tab stays open).
  - [x] Voice join / leave shown in the room activity, like pause / play (0.9.88).
  - [x] Bug: clicking myself in the "Together" card while in voice says "you are not in voice"; show my own controls (0.9.88).
  - [x] Extension toolbar icon: the owner still sees it only opening the extension page in a new tab (0.9.89: "Odama
    dön" switches to an open room tab).
- **Feedback round 3** (owner, 28 Oct 2026):
  - [x] Avatar: a pick changes nothing until "Tamam" (0.9.87).
  - [x] Empty "Bu odada" / "Koleksiyonum" sticker tab: show it empty, never open the file picker (0.9.87).
  - [x] "Neden?" bubble stayed too long; bubbles close on click / Esc (0.9.87).
  - [x] Rooms are independent: name and avatar set in one room never change another room (0.9.88).
- **Full pass before 1.0** (owner's request, 28 Oct 2026: "we will go through all of it before 1.0"):
  - [x] **Sound effects** (0.9.90.2, CLAUDE.md "Sound effects"): voice join / leave, game events (moves, wins, round start, correct guess…), other room
    events; short, pleasant, generated or licensed, with a volume / off setting.
  - [ ] **Camera window settings:** position, size and behaviour of the camera tiles (presets, snap to corners,
    per-person sizes…); revisit everything about cameras together.
- [ ] **Before 1.0:** try Shorts / Reels scrolling together end to end (owner's request).
- **Feature plan to 1.0 (owner agreed 31 Oct 2026; PDF sent to the owner):** few features with big impact, in this
  order (each a few 0.9.91.x releases), then a closed beta and 1.0. Security, bugs, policies and operations are the
  other sections.
  - [x] **1. First-time path** (most important; 0.9.91.20, store link on the install card left for the store version): invite link → name → extension install → film page; measure each
    step and cut friction (in-room 3-step "install and come back" card, 10 s first-visit tips); goal < 30 s from link
    to watching. Design options page first, the owner picks.
  - [x] **2. Finish Shorts** (0.9.91.18 + 0.9.91.19; the owner's real-YouTube / TikTok checks and the switch
    measurement are in `STATUS.md` "Owner's hand tests"): random / popular Shorts feed with category buttons (research: build it, small quota
    share), TikTok links in the Shorts view via TikTok's official embed player, move our emojis and click catcher
    off the YouTube player (YouTube's "no overlays" rule, before the API audit), the "everyone lands together"
    measurement in the owner's Chrome. (`short-video-research.md`)
  - [x] **Bigger Shorts view on laptops** (0.9.92.2, option C) (owner, 31 Oct 2026: "too small on my laptop, fine on the big monitor"):
    the bottom bar takes ~210 px; move our buttons into a side rail and let the video grow. Options A / B / C on
    https://claude.ai/artifact/FDEUP6Msgo6UbxYtAu9379 (recommended C: right rail + the top bar folds on screens under
    900 px tall); the owner picks.
  - [ ] **Room view YouTube overlays:** flying emojis / dock / toasts off the YouTube player in the room view too (as in
    the Shorts view, 0.9.91.18), before the YouTube API audit.
  - [ ] **3. Simplify the room:** rarely used features (film time, voting, saved room, recap) under "More"; the
    owner decides which, from a proposal page.
  - [ ] **4. Camera pass:** snap to corners, preset layouts (right strip, bottom strip, grid), one full review of
    everything about cameras (the open "Camera window settings" item above).
  - [ ] **Phone version from scratch** (owner, 1 Nov 2026): app-like, fast, every feature fitting the phone screen;
    design page with options per part first, the owner picks. Picks 1A 2B 3A 4B 5A 6B 7A 8A 9A 10A 11A (2 Nov 2026);
    step 1 shipped in 0.9.92.3 (the room as an app screen), step 2 in 0.9.92.4 (Shorts full screen, sideways dock), step 3 in 0.9.92.5 (games full screen, app start page, first speed steps). Next: deeper speed work (lazy voice / stream code, a phone-only stylesheet, an automatic phone speed test).
  - [ ] **Shorts: feed from one channel** (type a channel name or link → its Shorts) and **Discover by region** (the
    chips bring the viewer's country's popular Shorts, e.g. Turkey, instead of a mixed list) (owner, 1 Nov 2026).
  - [ ] **Thanks page** (owner, 1 Nov 2026): credits for the people who helped by testing (names only with consent).
  - [x] **Tablet support** (0.9.96.10, card T) (owner, 31 Oct 2026: "separate from phones"): iPad and Android tablets, upright and
    sideways, get their own layout (today `isPhone()` leaves tablets on the desktop layout with touch, never tried):
    side panel, Shorts view, games, cameras, dock and fullscreen sized for a touch screen of 768–1366 px; iPad
    fullscreen (no element fullscreen on iPhone, partial on iPad), split view / Slide Over, keyboard covers. No
    extension on tablets (site only). Harness like `scripts/harness/phone` with iPad / Galaxy Tab emulation; the
    owner tries a real tablet.
  - [ ] **5. Help / FAQ page** (TR + EN), see the item below.
  - [ ] **6. "Send feedback" button** in the product (closed beta and launch), see §7 "Feedback loop".
  - After 1.0 (owner agreed): TV with Google Cast, big services, Instagram Reels, new games, accounts / new languages /
    native apps (only if users ask).
  - [x] **Browser support** (owner's priority, 31 Oct 2026): research in `browser-support.md` (#86); owner: "do the
    recommendations" → 0.9.91.17 (blocked-connection hint, extension page notes, Edge Add-ons steps). Open: the
    owner's hand tests (`STATUS.md` "Owner's hand tests"); Firefox extension after 1.0.
- [ ] **(added)** First-time experience: someone who has never seen the site arrives with an invite link, installs
  the extension and watches — measure the steps and remove friction.
- [ ] **(added)** Simplify the room for newcomers: rarely used features (scheduled start, voting, saved rooms, recap)
  could move under "More" (owner decides).
- [x] **(added)** Accessibility (done in 0.9.96.13, card A11y): WCAG AA contrast (primary button purple #8b6cff with white text is ~3.8:1, proposal
  #6a4cf2), keyboard navigation, focus states, screen-reader labels, `prefers-reduced-motion`.
- [ ] **(added)** Performance budget: first load size, room join time (< 30 s from link to watching), CPU while
  watching (extension), memory on long sessions.
- [ ] **(added)** Help / FAQ page on the site (TR + EN): how it works, extension permissions explained, troubleshooting.
- [x] **TV version via the TV's browser (A + C built in 0.9.91.4–0.9.91.5, simplified in 0.9.91.14, then hidden):**
  the owner tried it on his TV (30 Oct 2026): sync was slow and TV browsers are a weak platform. 0.9.91.14 made it
  calmer (TV sync profile, phone-only pairing with a 3-step explainer) and **hid it** (lab switch `?tvlab=1`; the
  code stays). The real TV version moves to Phase 2 ("TV version with Google Cast"). Details `docs/internal/tv-design.md`.

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
- [x] **(added)** Security headers on the site: Content-Security-Policy, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy` (0.9.84, `apps/web/public/_headers`). `frame-ancestors` can't be used (the film site is an
  ancestor of the overlay), so the site refuses to run in any frame except the extension overlay (`main.ts`).
- [x] **(added)** Security review 1 (`security-review-1.md`, 0.9.84): custom emojis room-only, IP notice before
  peer-to-peer voice/streams, Cloudflare-only STUN, `Origin` check and per-IP limits on the server, GIF metadata
  stripped.
- [ ] Extension review: minimum permissions with written justifications, `postMessage` origin checks, no remote code
  (Manifest V3 policy; the shell iframes our site — document why this is allowed), closed shadow DOM everywhere.
- [ ] **(added)** User-generated content: custom emojis (images) and chat in rooms → abuse limits, a way to remove
  content, and a report/contact address. Done in 0.9.84: emojis stay in their room, per-IP + daily room limits, the
  host can remove all emojis. Left: a report/contact address.
- [x] **(added)** WebRTC: peer-to-peer voice/video reveals IP addresses to people in voice; say this clearly in the UI
  and the privacy policy (0.9.84: notice before joining voice / starting / watching a stream, permanent line under
  the voice row, policy updated). Hiding the IP is a Phase 2 goal (below).
- [ ] Dependency audit (`npm audit`, Dependabot), secret scanning, branch protection on `main` (PR + green CI).
- [ ] **(added)** `SECURITY.md` with a disclosure contact (needed once the repo is public anyway).
- [ ] Owner will add security/privacy testing skills and repos 👤 → run them, record results here. Added 2 Nov 2026:
  the `kvkk-gdpr-denetim` skill (KVKK + GDPR audit: privacy notice, consent, cookies, open databases, transfers
  abroad, breach readiness, marketing e-mail consent, Chrome Web Store user data) → run it at 0.9.97 / 0.9.98 and
  before the store submission.

### 4. Legal: name, law, policies
- [ ] **Final product name** 👤: research is in `name-research.md` (no registered "ScreenWithMe" mark found, but the
  name is descriptive and the category is crowded). Owner checks TÜRKPATENT / TMview / USPTO / WIPO (30 min) and
  decides: keep or rename. Must happen **before** the store submission and the domain purchase.
- [ ] Trademark filing (TÜRKPATENT, word mark, classes 9 + 42, optionally 38) 👤 — money; recommended soon after the
  name is final, at the latest a few months after 1.0.
- [ ] Privacy policy review against the code (GDPR + Turkish KVKK): what we store, how long, where (Cloudflare), the
  rights of users, contact address. Numbers must match the code. 0.9.97.60 (privacy card H3 + M7): rewritten with the
  controller, legal bases, recipients, transfers abroad, retention table, rights, complaints and age 13+; the help
  harness checks its numbers against the code; breach plan in `docs/internal/breach-plan.md`. Left: the lawyer's
  read-through before the store submission 👤.
- [x] **(added)** Terms of use: `apps/web/public/terms.html` (EN + TR, card TOS): what Sidelit is, age 13+ (a parent
  under 16), acceptable use (no illegal content, harassment, DRM circumvention, breaking YouTube's / TikTok's / Vimeo's
  terms), YouTube's Terms of Service linked, hosts' powers, user content (theirs, room-only, our right to remove), an
  abuse / takedown contact ("Report", 72 hours), no warranty, liability, governing law (Türkiye, Istanbul courts;
  consumers keep their own country's protection), dated changes; linked from the footer, the join card, the profile
  menu, the help page (`#report`), the extension page and `SECURITY.md`; the help harness checks it. Left: the
  lawyer's read-through with the privacy policy before the store submission 👤.
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
- [ ] **(added, owner 3 Nov 2026)** Staging environment: today every merge to `main` goes straight to production. Add
  a `staging` Worker environment (`wrangler deploy --env staging`, its own Durable Objects and secrets, its own
  `workers.dev` address) that CI deploys and live-tests first; production deploys only after staging is green. Before
  the closed beta.
- [ ] **(added, owner 3 Nov 2026)** Kill switch: a server-side switch per risky feature (voice, streams, games, YouTube
  search, TikTok…) read from a Worker variable / KV at runtime, so a broken feature can be turned off for everyone
  without a new release (today only `VOICE=off` and the `?tvlab` lab switch exist). Before the closed beta.
- [ ] **(added)** Capacity and cost: free-plan limits (Durable Objects 100k requests/day), load test with many rooms,
  a plan if we go viral (Workers Paid ~5 $/month 👤).
- [ ] **(added)** Browser support: research and recommendations in `docs/internal/browser-support.md` (no decision yet).
- [ ] **(added)** Privacy-friendly usage metrics to measure the success criteria (rooms with 2+ people for 10+ min,
  returning users) without cookies or personal data.

### 7. 1.0 launch
- [ ] Gate: phases 1–6 checked (or consciously deferred by the owner).
- [ ] **Remind the owner first:** Brave + Edge test (owner's request, 29 Oct 2026; checklist in `STATUS.md`) 👤.
- [ ] Version `1.0.0` → `npm run store` → submission from the owner's developer account 👤.
- [ ] While in review: no `PROTOCOL_VERSION` bump.
- [x] **(owner, 4 Nov 2026) Lock the 🐞 Test Lab with a code** before the app / store release (card LABLOCK: only
  `?debug=<code>` opens it on live, a 30-day pass per browser; the owner sets the `LAB_CODE` secret 👤).
- [ ] After approval: install links point to the store, `eklenti.html` updated.
- [ ] **(added)** Reserve social handles under the final name 👤 (Instagram, TikTok, X, YouTube, GitHub org, Product
  Hunt) as soon as the name is final — before announcing anything.
- [ ] **(owner, 4 Nov 2026) Live-action launch video**, shot between 0.9.99 and 1.0 with real actors: a crew of three
  (one person as camera, director and editor; two actors, a man and a woman) 👤. Claude drafts the script, the shot list
  and the on-screen texts (English first, Turkish second); tools from the owner's catalogue (`hyperframes`, `video-use`,
  `earshot`) may help with the edit.
- [ ] Launch content: 30–60 s demo video/GIF, store screenshots, a short landing page story; first Instagram/TikTok
  posts (owner's plan; Claude can draft scripts and visuals).
- [ ] **(added)** Feedback loop: in-product "send feedback" link, GitHub issue templates, reply within a few days.

---

- [ ] **Growth plan for the first 3 months after 1.0** (owner agreed 3 Nov 2026; from
  `research/market-and-competitors-2026.md`): (1) a store listing written for what people search ("watch together",
  "YouTube together", "sync any video") + "no account, no ads", screenshots, a promo video, reviews from the first 20
  users; (2) honest search pages for the searches rivals leave ("watch YouTube Shorts together", "Watch2Gether
  without ads", "free Teleparty alternative, no account", "watch TikTok with friends"), English first; (3) one 15–30 s
  clip a week on TikTok / Reels / Shorts; (4) communities where the need is (long-distance couples, student Discords,
  Turkish forums) + a Product Hunt launch day; (5) every room as a referral (invite card / QR / WhatsApp, a shareable
  recap image, one-click "Add to Chrome" on the "Go to the film" card). Cards G1–G5 in `CARDS.md`.

## Phase 2 — after 1.0
- **Keep improving features** (owner's list + `gelecek-fikirler.md`, `oyun-fikirleri.md`).
- **Cinema mode** (owner, 2 Nov 2026): pulled into 0.9.94 by the owner the same day (card 14 in `CARDS.md`).
- **TV version with Google Cast** (owner's decision, 30 Oct 2026): the advanced TV version comes after 1.0, together
  with the **Google Cast developer fee** (a one-time $5 registration, the owner's account). Chromecast / Google TV
  run our TV page themselves (a Cast receiver app, no TV browser to install); the phone's "Cast" button starts it and
  the phone stays the remote (microphone, camera, typing, emojis), as in the hidden browser version. Senders: Chrome on
  Android (iPhone needs another path). Reuses the hidden 0.9.91.x code (TV room view, phone remote, pairing, calm sync
  profile). First a research note: Cast receiver limits, latency, Google's terms. Plan: `docs/internal/tv-design.md`.
- **Big services** (Netflix, Prime Video, Disney+, Spotify…): one service at a time; each starts with a research note
  (does the player accept commands, terms of service, regional differences). Everyone uses their own subscription;
  **DRM is never bypassed**; service names only in "works with …" form when it really works. Spotify is
  music-only: check whether its terms allow synced listening control from an extension before building anything.
- **Apps:** PWA first (exists since 0.9.70); a native mobile app only if it brings something the PWA can't (owner
  decides after real usage data). Browser add-on stores: Edge, Firefox (separate manifest), Safari (needs a Mac build). Research: `browser-support.md`.
- **Growth:** launch posts (Product Hunt, Reddit, Show HN once public), Instagram/TikTok content, Discord community;
  growth plan in `BUYUME.md`.
- **Donations:** after the first real users (GitHub Sponsors / Patreon…), never inside a room.
- **The repo is public since 4 Nov 2026** (owner: private Actions minutes ran out; public repos run free), license "All
  rights reserved" (card LIC). At 1.0 the owner decides whether it becomes MIT; the old "new repo with clean history"
  plan in `VIZYON.md` is dropped.
- **More languages**, optional accounts (persistent rooms, friends) only if users ask for them.
- **Hide IP addresses in voice, camera and streams** (owner's decision, 28 Oct 2026: later, together with the card
  decision). Moving only voice to Cloudflare's media server (SFU) is not enough, because camera and streams would stay
  peer-to-peer and still show the IP. Options in `security-review-1.md` §2.5: Cloudflare TURN relay-only
  (`iceTransportPolicy: 'relay'`, covers all three with one mechanism, an optional "Hide my IP address" switch) or
  SFU for everything. Both need a card on Cloudflare (1 000 GB/month free, then $0.05/GB) and a budget brake.

## Success criteria (from `VIZYON.md`)
- Sync difference p95 < 300 ms (measure and publish p50/p95).
- Link → watching < 30 s; extension install < 1 min (< 10 s from the store).
- Weekly rooms with at least 2 people watching for 10+ minutes; returning user rate.
