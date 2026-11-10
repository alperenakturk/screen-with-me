# CLAUDE.md — Sidelit (formerly ScreenWithMe)

**Talk to the owner (Alperen) in Turkish, always, in every session and every reply. Everything written to the repo
stays English.**

This file holds the rules and a map, nothing else. **It never records what a release did:** release notes go to
`CHANGELOG.md`, how a feature works goes to `docs/internal/architecture/`. Only the Planner edits this file, and only
when a rule or the map changes. Hard limit 30 KB (`scripts/check-docs.mjs` in CI).

## 1. What Sidelit is
A free, account-free tool for watching a video on any site together with friends, in sync: **website** (YouTube /
direct video files) + **browser extension** (any HTML5 video on any site, iframes included) + **Cloudflare server**.

- Live: https://screen-with-me.swm-server.workers.dev · Repo: github.com/alperenakturk/screen-with-me (public since
  Nov 2026, source-available, all rights reserved).
- **Renamed to Sidelit on 3 Nov 2026 (owner, card 6c, 0.9.95).** Logo D1 "night gold" + mascot N1 Glowbeam:
  `docs/internal/design/logo-sidelit.md`. **Kept on purpose** (nothing a user saved may break): the live address
  `screen-with-me.swm-server.workers.dev` (until the own domain), the repo name, storage keys, message `source` strings
  (`screenwithme-site` …), `swm` prefixes, the protocol, the extension id, the publisher e-mail, and session titles
  made before the rename ("ScreenWithMe · 🧭 Planner", "ScreenWithMe · 🎨 Design") as lookup keys. Anywhere else the
  product is **Sidelit** (`node scripts/check-name.mjs` in CI).

## 2. Map: where things live

| What | Where |
|---|---|
| Where we are, owner's hand tests, owner's to-dos and decisions, "Ideas waiting for the owner's pick", task queue | `docs/internal/STATUS.md` |
| Job cards (In progress → Ready → Proposed → Done), lanes, run order | `docs/internal/CARDS.md` |
| What to work on now / next / frozen, milestone gates, plan to 1.0 | `docs/internal/ROADMAP.md` "Focus" and "Milestone gates to 1.0" |
| What each release changed (user-facing, one block per release) | `CHANGELOG.md` |
| How every feature works: files, messages, constants, keys, tests | `docs/internal/architecture/reference.md` (to be split into area files) |
| Old release narration, finished plans | `docs/internal/archive/` (`claude-md-history.md` = the old "Live:" line) |
| Design notes and picks, game design | `docs/internal/design/`, `docs/internal/design/games/` |
| Research, vision | `docs/internal/research/`, `docs/internal/VIZYON.md`, `docs/internal/rakip-analizi.md`, `docs/internal/name-research.md` |
| Security reviews | `docs/internal/security-review-<n>.md`, `docs/internal/security-review-cf.md` (Cloudflare audit) |
| The optimization plan (quota, docs, glossary) and the docs analysis | `docs/internal/OPTIMIZATION.md`, `docs/internal/docs-sprawl.md` |
| Skills and tools for this project | `docs/internal/tools.md` |
| Costs and free limits, custom domain, breach plan, store texts | `docs/internal/costs.md`, `custom-domain.md`, `breach-plan.md`, `web-store.md` |
| The owner's board (his test ticks) | https://claude.ai/artifact/NWZG7GLH4JzAnZt1rNgrJo (one Artifact, kept by the Planner) |

## 3. Language (owner, 28 Oct 2026; "this is important", 31 Oct 2026)
- **Chat with the owner: Turkish. Everything else: English**, even when the request came in Turkish: code, comments,
  docs, `CLAUDE.md`, branch names, commits, PRs, issues, reviews, release notes, workflow names, file and route names,
  test pages and test data (names, chat lines, room names in e2e / harness scripts: Alex / Sam, never Ali / Ayşe),
  example texts, domains and handles. Never carry the owner's Turkish words into any of these; translate them. Sessions
  talk English among themselves.
- **Product language priority: English first, then Turkish, then others.** Names (product, features, rooms, games),
  slogans, copy, wordmarks, store listing, domains, examples and defaults are designed for English speakers first;
  Turkish ideas or words need the owner's explicit request. The site's default language is English on every device.
- **The only Turkish in the repo:** `README.tr.md` (linked by 🇹🇷 at the top of `README.md`; the two are always updated
  together and say the same thing), the Turkish UI strings (`apps/web/src/i18n-tr.ts`, each chunk's `TEXT.tr`,
  Turkish page variants) and Turkish quoted as such.
- **Migration:** a Turkish `docs/internal/*.md` is translated when touched (English file name, links fixed); new or
  changed code gets English comments, a mostly rewritten file is translated whole. Old Turkish addresses (`/baglanti` →
  `/connection`, `eklenti.html` → `extension.html`, `?olcum` → `?measure`, card C1) still redirect; new work never adds
  Turkish names. Old commit messages on `main` are **not** rewritten.

## 4. Roles, the hub and who edits what (owner, 2–4 Nov 2026; office plan `is-akislari/ajan-ofisi.md` in my-awesome-list)
Each session has one role (first message or session title; none given = **Developer**).

| Role | Does | Edits |
|---|---|---|
| 🧭 **Planner** (hub, no code; `role:planner`) | Talks to the owner; turns ideas into cards (what, why, done when, tests), orders and routes them, assigns versions; keeps the owner's board current by itself (a live fix becomes a test, a passed test or answered question goes, one line to the owner); `llm-council` for big decisions | `CLAUDE.md`, `CARDS.md`, `ROADMAP.md` Focus, `STATUS.md` decisions / ideas, the board |
| 🔨 **Developer: lane A** (room / site), **lane B** (players, Shorts, extension, ops; an extra lane-B session such as "B2" when the Planner opens one) | Top Ready card of its lane → In progress → build + test → PR → merge → deploy and live e2e checked → `Done: <PR link>`. A fresh session per milestone step | Its cards' code and tests, the feature's reference section, the `CHANGELOG.md` block, `STATUS.md` task queue / hand tests |
| 🎮 **Game Studio** (`role:games`) | The games end to end: tables, side games, art, sounds, tutorials, server objects | Games code and tests, `docs/internal/design/games/`, the games' reference sections, `CHANGELOG.md` blocks |
| 🛡️ **Security** (read-only) | Bugs, security, privacy (KVKK / GDPR via `kvkk-gdpr-denetim`'s `SKILL.md`) | `docs/internal/security-review-<n>.md`, "Proposed" cards |
| 🔎 **Research** (read-only) | Market, competitors, users, technical questions | `docs/internal/research/<topic>.md`, "Proposed" cards |
| 🎨 **Design** (`role:design`) | Logo, mascot, brand, screens; a picked design becomes a card | `docs/internal/design/<topic>.md`, art the scripts copy; never product code |

Rules for all:
- **The owner talks only to the Planner** (owner: "be the brain"). Every other session sends its result to the Planner
  with `send_message` when a job ends (what was done, PR link, open questions, what the owner must decide or test) and
  never asks the owner itself, unless the owner opened that session himself. The Planner's session id: title
  "ScreenWithMe · 🧭 Planner" (`list_sessions`, tag `role:planner`).
- **How the owner is asked (owner, 4 Nov 2026):** no option pages or other web pages for him; the owner's board is his
  only page. Every preference or design question is asked **in the Planner's chat** with clickable choices (the
  recommended one first, a short preview of each). Other sessions send the Planner the question as text: question,
  2–4 options (one marked recommended), a short preview each. They never publish Artifacts for the owner.
- **Sessions and messages (owner, 9–10 Nov 2026):** building sessions run only while there is work for them: one
  Developer for the site, server, players and extension (lane A) and Game Studio for the games; the Planner may wake
  more (e.g. B2) when the queue is big, splitting work by files so no two sessions touch the same lines (owner, 10 Nov:
  "more than two is fine"). No work = one or none. The Planner tells the owner something **only when he is needed**
  (a decision, a test, a secret) and otherwise sends **one short summary when a group of work is finished**, never a
  message per release. The owner will name product changes himself; until then nothing in the product is reworked for
  "tidiness" unless it is clearly broken.
- Never start work that has no card; an idea that comes up mid-task goes to `STATUS.md` "Ideas waiting for the owner's
  pick". Each role edits only its own files, so two sessions never change the same lines.
- Every change goes through a branch + PR, never a push to `main`; a docs-only PR may be merged by its session once CI
  is green. Branch `claude/<short-english-slug>` (or the session's). Commits: imperative English summary, the version
  in parentheses for a release (`Fix film-page cover flash (0.9.83)`), trailing `Co-Authored-By`; never model names.
  Delete a merged branch (`.claude/settings.json` allows `git push origin --delete <branch>`; check first with
  `git merge-base --is-ancestor`).
- **A developer who changes a feature updates its reference section in the same PR**
  (`docs/internal/architecture/reference.md`, or its area file once split).

## 5. Working with the owner
- Alperen is learning JS/HTML/CSS at school; keep explanations simple, in Turkish.
- **Plain, not pleasing (owner, 10 Nov 2026):** no flattery, no softening ("only 2 minutes!", "no worries"), no people
  pleasing. If something has to be done, say so plainly and do it. Order, security, the work and caution come before
  the owner's comfort, always: never skip or hide a needed step to keep him happy.
- **Finish every task with a short report** (owner, Oct 2026): what I did, what I tried, what I am waiting for now (CI,
  deploy, an answer) and what comes next; say if something runs in the background. Non-Planner sessions send it to the
  Planner.
- **Visible task list in every task** (owner, 28 Oct 2026): at the start create a task list (the session's task tool),
  one item per step, statuses kept current. The same queue is written to `docs/internal/STATUS.md` "Task queue" and
  pushed: if the session or the usage limit stops the work, the next session (or the same one after "devam") continues
  from the first unfinished item without asking.
- **"What should I test?"** (owner, 31 Oct 2026): his hand tests are in `STATUS.md` "Owner's hand tests" (Edge / Brave
  / Opera extension test, Firefox / Safari site test). When he asks, read that list, explain the open items in simple
  Turkish and tick what he reports. Remind him of the Brave / Edge test right before the store submission.
- **Make technical decisions yourself**, say briefly why. Only ask about his things: accounts, money, publishing,
  legal commitments, the product name, slogans.
- Move in safe steps; test every change, ship it, commit it.
- **Secrets go into the owner's KeePass (owner, 7 Nov 2026):** the owner keeps every password, token and secret in
  KeePass, in a folder per project (`Sidelit`). Whenever a step asks him to create or save a secret, give him a ready
  KeePass entry name at that moment (pattern `Where – What for`, e.g. `GitHub – LAB_CODE (test panel code)`), the URL and
  a short note, and say which characters the generator should use (letters + digits only when it goes into an address).
  Don't list future entries in advance. Never ask him to paste a secret into the chat.
- **Tell the Planner at once when anything runs out (owner, 4 Nov 2026):** tokens, usage limits, Actions minutes or
  billing, API quotas, disk, anything: every session sends the Planner a `send_message` the moment it sees it.
- **Skills and tools:** the owner's catalogue is `alperenakturk/my-awesome-list` (private, `add_repo`). When a task
  would go better with a skill or tool from it that this session lacks, say which, why, and how to run it (his
  computer's command from its `REHBER.md`, or follow its `SKILL.md` here). List and likely fits: `docs/internal/tools.md`.

## 6. Product rules
- **Focus (owner, 2 Nov 2026):** before starting, check `ROADMAP.md` "Focus: now / next / frozen" and work only on
  "Now". Build a feature for computer + phone first; tablet layouts and missing translations are a batch at the end of
  the milestone step.
- **No scrolling inside a view unless truly needed (owner, 30 Oct 2026):** a game, dialog or panel fits the space it
  gets (fullscreen, the video's place, a free window, a phone) without scrollbars; scale or reflow it. Only lists that
  grow without end (chat, a long queue) scroll. Free windows resize in proportion. Check every new screen at small sizes.
- **Public texts** (README, store listing, site copy) never name specific films / series / piracy sites; the tool is "a
  neutral sync tool for any HTML5 video" (Chrome Web Store policy). A service's name appears only if it really works.
  Never open piracy sites for testing; use legal demos of the same player stacks (JW Player, Plyr, Video.js, hls.js).
  Never say "open source" (the repo is public, not open source). No donation prompt inside a room / over the video.
- **Slogans are the owner's choice** (home "Ayrı ekranlar, aynı an.", invite "Sana bir koltuk ayırdım 🍿" / "I saved you
  a seat 🍿"); ask before changing.
- **No technical words in the UI** ("WebSocket" → "odanın canlı bağlantısı", "peer-to-peer" → "sunucudan geçmez,
  doğrudan gider", and the same plain words in English).
- **Glossary (one name for one thing):**

| English (canonical) | Turkish UI (0.9.82 copy pass) | Code / notes |
|---|---|---|
| room; saved / one-time room | oda; kayıtlı / tek seferlik oda | `settings.saved` |
| host · acting host · table host · opener | (oda) yöneticisi | `hostKey`; `hostId` (oldest person while the host is away); a table's first connected player; who opened a game |
| kick / ban | odadan çıkar / yasak | `bans`, `cid` |
| film page (the third-party site) | **film sayfası** (never "video sayfası") | overlay = our site inside it (`shell`); **hole** / **island** = code terms |
| room view | **oda görünümü** ("katman" never in the UI) | Go to the film / 🏠 Back to the room = Filme git / 🏠 Odaya dön |
| reaction (sending) · emoji (sent) · custom emoji | tepki (the "Tepki" button) · emoji · özel emoji | code: `sticker` |
| queue · pin · join voice · stream · sync · invite link | sıra · pin · sese katıl · yayın · senkron / eşitle · davet linki | |
| name · button | **ad** (never "isim") · **düğme** (never "buton") | |
| **rail** = the control column beside the video | | `#fs-dock` (+ `.yt-rail` on YouTube); never "dock" / "one remote" in new text |
| **side panel** = chat / queue / people | | `.side`; never call it "rail" |
| **Shorts bar** | | `#shorts-bar` (a rail column or a bottom bar) |
| **games hall** · **tables** (shared) · **side games** (solo) | | `gallery.ts` · Classics, Sea Battle, Draw & Guess, Quiz, Last Heart · Snack Bar, Window Garden, Five Frames; never "PlayWithMe" / "hub" |
| **Test Lab** | Test Panosu | `ui/test-lab.ts`; `debug-lab.ts` = the lab switch; never "debug / test panel" |
| stale room connection (150 s) · silent game connection (90 s) · idle fallback session (45 s) | | `pruneStale` · `GHOST_MS` · `PollHub` (not three "ghosts") |
| the owner's board | | the one Artifact in §2; `CARDS.md` is the card board |

## 7. Invariants that must not be broken
Each line names its section in `docs/internal/architecture/reference.md` ("ref: …"; search `- **<title>`).
- **The server is the single source of truth** (`PlaybackState`; clients estimate server time with `ServerClock`).
  ref: The server is the single source of truth.
- **Sync engine:** every player command goes through `command()`, only **expected** events are swallowed, `enforce()`
  commands only what differs. A change adds a scenario to `sync-engine.test.ts`. ref: Sync engine.
- **Protocol:** the server validates every client message and copies it into a new object. Incompatible change →
  bump `PROTOCOL_VERSION` (never during a store review); optional new fields need no bump. ref: Protocol.
- **Security:** user data is never written with `innerHTML`; every typed text others see goes through `cleanText`;
  rate limits live on the server; browser ids (`cid`), IP hashes, pin owners and voters are never sent to clients.
  ref: Security, Kicks and the same browser, Pins, Voting.
- **No Durable Object reads a request body without a cap** (`readCapped`, streams with a byte limit). ref: Feedback,
  HTTP fallback; archive 0.9.95.2.
- **Durable work runs from the object's alarm** (one `scheduleAlarm`), never a bare `setTimeout` / `setInterval`.
  ref: Sleep resilience, HTTP fallback, Ghost connections.
- **Every room / game connection goes through `openSocket`** (WebSocket, then the HTTP fallback); a new game e2e opens
  its sockets with `GameSocket` (`scripts/e2e/game-socket.mjs`). ref: HTTP fallback; archive 0.9.97.82.
- **CSP:** a new third-party script, image, media or frame host goes into `apps/web/public/_headers`; no inline scripts;
  `main.ts` refuses to run in any frame except the extension overlay. ref: Security.
- **Extension:** does nothing outside a room; never runs on our site (`exclude_matches`, `ancestorOrigins`); no UI
  of its own (only the overlay iframe and the "Start watching" card); never redirects anyone without asking; no own
  ad-block list, `window.open` wrapper or ad skipping; no film re-broadcasting (`tabCapture`). ref: Extension rules,
  Shell, Resilience to ads, Streaming.
- **Nothing of ours over the YouTube player** (YouTube's Required Minimum Functionality). ref: Shorts view, One
  remote; archive 0.9.97.74 (`overYoutube`).
- **DRM is never bypassed.** ref: §10 Known limits.
- **Lazy chunks:** load with `loadChunk(() => import('./x.ts'))` and check for null; never chain onto `import()`; a
  chunk that gates privacy (the IP notice) fails closed. ref: Room chunk.
- **Styles:** a rule only the room uses goes into `apps/web/src/room.css`; one a page outside the room needs goes into
  `styles.css` / `phone.css`; budgets in `scripts/size-budget.mjs`. Never name a class just `side`. ref: Room chunk;
  archive 0.9.97.83, 0.9.97.34.
- **Texts:** a new UI text goes into `i18n.ts` (English, `I18nKey`) **and** `i18n-tr.ts` (`check-texts.mjs`); a lazy
  chunk's own `TEXT` has the same EN and TR keys (`check-game-text.mjs`); Test Lab texts are `LabText` pairs. ref: Test
  Lab; archive 0.9.97.79.
- **Every new card's "Done when" includes its Test Lab hook or scenario** (`debugHooks.register`). ref: 🐞 Test Lab.
- **Test powers stay local:** `SWM_LAB_SERVER`, `SWM_LOCAL_UNPACED`, `SWM_LAB_OPEN` never in `wrangler.jsonc` or the
  deploy. ref: Test Lab, CI.
- **The site's address comes only from `site.config.json`** (`check-domain.mjs`). ref: The site's address.
- **Devices:** ask `device.ts` (`isPhone`, `isTouch`, `hasMouse`, `isSideways` …), never sniff in feature code;
  phone CSS uses `html.sideways`, never `(orientation: landscape)`. ref: Phones, Phone room as an app screen.
- **Accessibility:** buttons have names, keep `:focus-visible` rings (never `outline: none`), white text on a button
  ≥ 4.5:1, targets ≥ 24 px (game controls 44 px on a phone). ref: Accessibility.
- **Rooms are independent:** name and avatar per room (`me:<room>`). ref: Rooms are independent.
- **Privacy:** collecting or storing new data → update `privacy.html` in both languages (§10).
- **CI:** a new harness goes into the job of its kind (`e2e`, `site`, `games`), keeping jobs about equal; never
  `paths-ignore`. ref: CI.
- **PWA:** the service worker never caches files; changing `sw.js` bumps its `CACHE` name. ref: PWA.
- **Adding things** (avatar, board game, sound, scenario, game text): follow the steps in the feature's section
  (Avatars, PlayWithMe, Sound effects, 🐞 Test Lab).

## 8. Structure and commands
npm workspaces, strict TypeScript, no framework.
```
packages/shared   Shared: protocol.ts (messages + validation), room-logic.ts (queue/playback rules),
                  sync-engine.ts (sync engine), clock.ts, connection.ts (WebSocket client),
                  media.ts (link detection), video-element.ts (<video> wrapper + scoring), room-id.ts,
                  logo.ts (single source of the logo: shapes + SVG generation)
apps/server       Cloudflare Worker + Durable Objects (src/room.ts: one object per room,
                  WebSocket Hibernation, host/kick, chat history, rate limits; one object kind per table game)
apps/web          Website (Vite, plain TS/HTML/CSS). src/room.ts room page (+ room.css); src/ui/* panels
                  (chat, queue, people, settings, tabs, fullscreen, reactions, toasts); themes.ts;
                  i18n.ts (English) + i18n-tr.ts (Turkish, a lazy chunk)
apps/extension    Manifest V3 extension (esbuild, build.mjs). Has NO UI or room connection of its own: it opens the
                  website itself as an overlay (shell) on top of the film page. background.ts (shelled tabs + message
                  relay), content.ts (in every frame: find video, engine, overlay and fitting into the hole),
                  shell.ts/shell.html (overlay page: contains our site ?shell=1), focus.ts (fit the video into the
                  hole), store.ts (site settings), site-bridge.ts (only on our site), popup.ts (info + one button)
scripts/e2e       End-to-end tests (fake users against a real server) · scripts/harness: browser test pages
```

```bash
npm run dev                  # server (8787) + site (5173, /api → 8787 proxy; override with SWM_WEB_PORT / SWM_API_PORT)
npm test                     # unit tests (vitest, packages/shared)
npm run typecheck            # all packages
npm run e2e [-- wss://...]   # end-to-end (local by default; pass a URL for live)
npm run build                # extension (puts the zip on the site) + site
npm run deploy               # test + build + upload to Cloudflare (local; normally Actions does it on push to main)
npm run build:extension:dev  # extension that connects to the local server
npm run store                # Web Store package: store/ (zip + screenshots + promo image)
NODE_PATH=$(npm root -g) node --experimental-strip-types scripts/make-icons.mjs  # icons (Chromium) + logo / mascot SVGs from logo.ts
node scripts/check-name.mjs  # no "ScreenWithMe" left in a user-facing file (CI)
node scripts/check-domain.mjs [--live]  # the site's address comes only from site.config.json (CI; --live after deploy)
node scripts/check-docs.mjs [--against origin/main]  # CLAUDE.md ≤ 30 KB (CI); with a ref: no identifier of the old CLAUDE.md lost
node scripts/theme-art.mjs   # scene + mascot SVGs of illustrated themes (apps/web/public/themes/)
node scripts/avatars.mjs     # drawn avatars (apps/web/public/avatars + apps/extension/static/avatars)
```
Store form texts: `docs/internal/web-store.md`. Screenshots are taken from `store/src/shots.html` (the script opens it
from a local server); the room part is `store/src/room.html`, fixed content using the site's real `styles.css` +
`room.ts` markup. If the room page or popup changes, update that copy too.
Windows/PowerShell notes: write the commit message to a file and use `git commit -F` (quotes break). Write files as
UTF-8 without BOM. If `gh` is not on PATH: `C:\Program Files\GitHub CLI\gh.exe`.

## 9. Release checklist
Milestone gates to 1.0 (what must be fully done before the third version part moves, and "live e2e green on the
first attempt" for every release): `docs/internal/ROADMAP.md` "Milestone gates to 1.0".
0. **Version numbers (owner's rule, 29 Oct 2026):** releases count in a fourth part (0.9.97.91, 0.9.97.92 …). The third
   part moves **only when the owner says** "this one is big, go up one". The Planner assigns versions. Chrome
   extensions accept up to four numeric parts; the site footer shows the same number.
1. `npm run typecheck && npm test` (if the server changed: `wrangler dev` + `npm run e2e`; if the extension changed:
   the embed harness, see §10 "Cloud sessions"); the checks of the area you touched.
2. Bump the site version in the footer (`apps/web/index.html` `.footer-version`). The extension version is kept at
   the same number (the owner thought differing numbers meant "outdated"): `apps/extension/package.json` (the zip on
   the site and the extension page read it).
2b. **First look (owner, 10 Nov 2026, card QA1):** a UI change runs `scripts/shots.cjs` (the screens the diff touches, at
   1366, 1920, tablet and phone) and gives a fresh subagent only `.shots/<branch>/` (`REVIEW.md` is its brief); the PR
   lists each finding as fixed or answered. Tests check rules; this checks what a person sees.
3. Add the release's block to `CHANGELOG.md` (user-facing, English); update the feature's section in
   `docs/internal/architecture/`; `README.md` + `README.tr.md` together when they are affected; `STATUS.md` (and
   ROADMAP checkboxes). Never a release paragraph in this file.
4. Commit (English, `Co-Authored-By` at the end), push, PR. When it lands on `main`, GitHub Actions deploys
   (`scripts/wait-live.mjs`), runs the e2e against live and tags `v<version>` (`scripts/tag-live.mjs`); check the
   Actions tab is green. Without keys / from local: `npm run deploy` → `npm run e2e -- wss://screen-with-me.swm-server.workers.dev`.

## 10. Cloud sessions, licence, known limits
**Cloud sessions (Claude Code on the web):**
- The owner works from claude.ai/code cloud sessions (account since 28 Oct 2026; older sessions and memory are gone,
  so everything must be in this file and `docs/internal/`). The container is temporary: commit + push every piece of
  work on a `claude/...` branch; it reaches `main` via PR (CI runs there, a merge deploys).
- **Opening the PR and merging it once CI is green is Claude's job** (owner, Oct 2026), unless the Planner said it
  merges: wait for the checks, merge if green, check the deploy run is green, report. The owner only updates the
  extension in his own Chrome.
- No `wrangler login` in the cloud (deploys go through Actions); install, typecheck, tests, build, `wrangler dev` + e2e
  work. Tested sequence: `docs/internal/STATUS.md` "Testing in the cloud".
- A restricted network may block `www.youtube.com` (the title test in `room.mjs` hangs; allow it under Network access →
  Allowed domains). `*.googlevideo.com` stays blocked and headless Chromium can't decode YouTube's H.264: real YouTube
  playback is the owner's check.
- Real Chromium + extension tests work in the cloud: `CHROME=/opt/pw-browsers/chromium` with
  `scripts/harness/embed/run.mjs` (as root `cdp.mjs` adds `--no-sandbox`); without internet use
  `FILM_VIDEO=video.webm node scripts/harness/embed/film-server.mjs` (ffmpeg `testsrc2` can generate one; make it longer
  than 10 min for the score).

**Licence and privacy:**
- **All rights reserved, source-available (card LIC)** (`LICENSE`, © 2026 Alperen Aktürk): read, not copied, modified,
  distributed or used without written permission. Every `package.json`: `"license": "UNLICENSED"` + `"private": true`.
  Third-party parts keep their licences (`apps/web/public/third-party-notices.txt`); shipped code has no third-party
  package code; a new runtime dependency needs a licence check (MIT / Apache / BSD fine) and a line there.
- **The repo is public** (free Actions minutes): never commit secrets, tokens, private e-mails or hidden addresses.
- `apps/web/public/privacy.html` and `terms.html` (TR + EN, `?lang=en|tr` via `lang.js`; `data-terms-link` links get
  `?lang=` from `i18n.ts` `translate`; the old `gizlilik.html` redirects). Abuse / takedown: `terms.html#abuse`
  (e-mail "Report", 72 hours; `SECURITY.md` and help `#report` point there). A change adds a dated "Changes" line in
  both languages; the help harness checks both languages match.

**Known limits** (more: `docs/internal/VIZYON.md` "v1.0", `ROADMAP.md`):
- DRM services (Netflix, Prime Video, Disney+…) are not supported; the 1.x goal: everyone uses their own subscription,
  we command the site's own player, DRM is never bypassed (`VIZYON.md` "Büyük servisler"). A fullscreen `<video>`
  element hides the extension overlay (a fullscreen player container is fine).
- The extension is not in the store yet (unpacked install, `apps/web/public/extension.html`; the old `eklenti.html`
  redirects); account opened (screenwithme.app@gmail.com, non-trader), package ready (`docs/internal/web-store.md`,
  `npm run store`); **submitted with 1.0**.
- Bans are at the limit of an account-free design (another browser / incognito tab gets around them).
- Firefox / Safari: the site works, the extension does not (no `offscreen`, the shell needs a `chrome-extension://`
  parent); after 1.0, `docs/internal/browser-support.md`.
- Income only through donations, after 1.0 and the first real users (no PayPal / Stripe in Turkey; `VIZYON.md` "Bağış /
  destek"). Growth and ideas: `docs/internal/BUYUME.md`, `docs/internal/gelecek-fikirler.md`.
