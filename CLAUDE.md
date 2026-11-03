# CLAUDE.md — Sidelit (formerly ScreenWithMe)

**Renamed to Sidelit on 3 Nov 2026 (owner, card 6c, 0.9.95).** Logo D1 "night gold" + mascot N1 Glowbeam:
`docs/internal/design/logo-sidelit.md`. **Kept on purpose** (nothing a user saved may break): the live address
`screen-with-me.swm-server.workers.dev` (until the own domain), the repo name, storage keys, message `source` strings
(`screenwithme-site` …), `swm` prefixes, the protocol, the extension id, the publisher e-mail.

A free, account-free tool for watching a video on any site together with friends, in sync:
**website** (YouTube / direct video files) + **browser extension** (any HTML5 video on any site, iframes included) +
**Cloudflare server**.

- Live: https://screen-with-me.swm-server.workers.dev
- Repo: github.com/alperenakturk/screen-with-me (private)
- **Read first:** `docs/internal/STATUS.md` (where we are, pending decisions, next steps; update it after every task)
  and `docs/internal/ROADMAP.md` (the owner's plan to 1.0 and beyond, with checklists).
- Vision and older detailed roadmap: `docs/internal/VIZYON.md` · Competitor analysis: `docs/internal/rakip-analizi.md` ·
  Name / trademark research: `docs/internal/name-research.md`

## Language and GitHub conventions (owner's decision, 28 Oct 2026)
We are building a **global product**, so everything is professional, formal and consistent.
- **Language priority for the product (owner's rule, 28 Oct 2026): English first, then Turkish, then other
  languages.** Unless the owner explicitly asks for something Turkish, every product-facing choice is designed for
  English speakers first: names (product, features, rooms, games), slogans, copy, wordmarks, store listing, domains and
  handles, examples and defaults. Turkish comes second (translation, local flavour), other languages after that.
  Turkish words or ideas are not the default; they need the owner's explicit request. (This does not change who we
  talk to in Turkish: the conversation with the owner stays Turkish.)
- **IMPORTANT — speaking Turkish never makes the work Turkish (owner, 31 Oct 2026: "this is important").** Only the
  chat with the owner is Turkish. Everything technical or public is **English**, even when the request came in Turkish:
  branch names, commit messages, PR texts, code, comments, docs, test sites and test pages, test data (names, chat
  lines, room names in e2e / harness scripts), example texts, file and route names, domain names and handles. Never
  carry the owner's Turkish words into any of these; translate them. Turkish appears only where the product itself
  shows Turkish to Turkish users (`i18n.ts` TR strings, Turkish page variants, `README.tr.md`). Older Turkish names
  (e.g. `/baglanti`, `eklenti.html`, Ali / Ayşe in old tests) are migrated by ROADMAP "Consistency"; new work never adds
  more.
- **Talk to the user (Alperen) in Turkish.** Everything that lives on GitHub is **English**: commit messages, branch
  names, PR titles/descriptions, issues, review comments, release notes, `CLAUDE.md`, docs, workflow names and code
  comments.
- The only Turkish on GitHub: `README.tr.md` (linked by 🇹🇷 at the top of `README.md`; the two are always updated
  together and say the same thing) and the Turkish UI strings themselves (`i18n.ts`, Turkish page variants).
- **Migration of existing Turkish content** (ROADMAP "Consistency"): `docs/internal/*.md` files written in Turkish are
  translated one by one (when a doc is touched, translate it; rename to an English file name and fix links). Code
  comments: new or changed code gets English comments; a file whose comments are mostly rewritten is translated as a
  whole; a full pass happens before the repo goes public. Old commit messages on `main` are **not** rewritten
  (history rewrite would break every clone and PR); the planned public repo starts from a clean single commit anyway.
- Branches: `claude/<short-english-slug>` (or the branch the session assigns). Commit messages: imperative English
  summary line, version in parentheses when it is a release (e.g. `Fix film-page cover flash (0.9.83)`), trailing
  `Co-Authored-By` line. Never put model names in commits/PRs.
- Delete a branch on GitHub once its PR is merged (its commits live on `main`). The owner allowed it on 29 Oct 2026:
  `.claude/settings.json` permits `git push origin --delete <branch>` (only for merged branches; check first with
  `git merge-base --is-ancestor`).

## Working with the user
- Alperen is learning JS/HTML/CSS at school; keep explanations simple (in Turkish).
- **Finish every task with a short report** (user's request, Oct 2026): what I did, what I tried, what I am waiting
  for now (CI, deploy, the user's answer) and what comes next. If something is running in the background, say so.
- **Visible task list in every task** (user's request, 28 Oct 2026): at the start of a task create a task list (the
  session's task tool) with one item per step, keep statuses current (in progress / done) so the user always sees
  which step we are on and what is left. The same queue is written to `docs/internal/STATUS.md` "Task queue" and
  pushed: if the session or the usage limit stops the work, the next session (or the same one after "devam") reads
  that queue and continues from the first unfinished item without asking.
- **"What should I test?"** (owner, 31 Oct 2026): the owner's hand tests live in `docs/internal/STATUS.md` "Owner's
  hand tests" (Edge / Brave / Opera extension test, Firefox / Safari site test). When he asks, read that list, explain
  the open items in simple Turkish and tick what he reports.
- **Make technical decisions yourself**, briefly say why; the user asks for changes if they disagree. Only ask about
  things that belong to the user: accounts, money, publishing, legal commitments, the product name, slogans.
- Move in safe steps; test every change, ship it, commit it.
- The user will connect more repositories and add skills (privacy testing, bug finding, productivity) before 1.0;
  when they appear, use them and record how in this file. Added 2 Nov 2026 (installed for the owner's account on his
  computer, not in cloud sessions unless added there):
  - `kvkk-gdpr-denetim` (privacy audit, KVKK + GDPR): run it read-only before 0.9.97 / 0.9.98 and the store
    submission; results go to ROADMAP §3 / §4.
  - `karpathy-guidelines`: think before coding, simplest change, surgical edits, verifiable goals (fits the rules
    here; it applies by itself while coding).
  - `llm-council` ("council this"): five-advisor decision review for big owner decisions (name, domain, what to cut
    before 1.0). Costs many sub-agents; only for real decisions.
  - `agent-reach`: reads Reddit / X / YouTube / web for market and competitor research (read-only).
  - Agentation (click-to-annotate for coding agents) needs React; this site is plain TypeScript, so it is not used here.
- **The owner's skill and tool catalogue (owner, 2 Nov 2026): `alperenakturk/my-awesome-list`** (private; attach it
  with `add_repo` when needed). `skills/<name>/` (`SKILL.md` = the skill, `REHBER.md` = the owner's Turkish guide with
  the install command; skills with their own marketplace have only `REHBER.md`), `araclar/` (tools: agent-reach,
  gitdiagram, gitingest, headroom, hyperframes, video-use, earshot…), `is-akislari/` (workflows), `GELEN-KUTUSU.md`
  (inbox of things not sorted yet). **Rule:** whenever a task would go better with a skill or tool from that catalogue
  that this session does not have (most are installed only on the owner's computer), say so before or while doing the
  task: which one, why it fits, and how to run it ("run it on your computer: …" with the command from its `REHBER.md`,
  or "I can follow its `SKILL.md` here by reading it", which works for plain instruction skills such as
  `kvkk-gdpr-denetim`). Likely fits for this project: `kvkk-gdpr-denetim` (privacy policy, store data form),
  `llm-council` (name / domain / what to cut), `agent-reach` (competitor and user research), `hyperframes` /
  `video-use` / `earshot` (launch video and store promo), `humanizer` (store listing and launch copy).
- **Sessions as an office (owner, 2 Nov 2026; plan in `my-awesome-list` `is-akislari/ajan-ofisi.md`).** Several
  Claude sessions work on this repo, each with one role. Find yours in your first message or session title; if none
  is given you are the **Developer**. The board is `docs/internal/CARDS.md` (job cards: Ready → In progress → Done);
  the owner's tick view is the checklist page https://claude.ai/artifact/EtqKiBo8k5vgR422rq14K5.
  - 🧭 **Planner** (with the owner, no code): keeps `ROADMAP.md` "Focus: now / next / frozen", the "Ideas waiting for
    the owner's pick" list in `STATUS.md` and the cards in `CARDS.md`; turns ideas into cards (what, why, done when,
    tests); prepares option pages for design / preference questions and records the owner's pick on the card; runs
    `llm-council` for big decisions on the owner's computer. Never edits code.
  - 🔨 **Developer** (one at a time; since 3 Nov 2026 two lanes when the Planner opens them, see `CARDS.md` "Run order", each lane on its own cards and files): takes the top Ready card, moves it to In progress, builds + tests it, PR, merge,
    checks the deploy and live e2e, adds "Done: PR link" under the card, ticks the checklist page. Owns the code,
    `STATUS.md` "Task queue" / hand tests and the technical notes in this file. Never starts work that has no card;
    an idea that comes up goes to "Ideas waiting for the owner's pick". A fresh Developer session per milestone step.
  - 🛡️ **Security** (now and then, read-only): reviews `main` for bugs, security and privacy (KVKK / GDPR via
    `kvkk-gdpr-denetim`'s `SKILL.md` in `my-awesome-list`); writes a report `docs/internal/security-review-<n>.md`
    and proposed cards under "Proposed" in `CARDS.md`. Never fixes code itself.
  - 🔎 **Research** (when needed, read-only): market, competitors, users, technical questions; writes
    `docs/internal/research/<topic>.md` and proposed cards under "Proposed". Never edits code.
  - 🎨 **Design** (when needed, owner's request 3 Nov 2026; session "ScreenWithMe · 🎨 Design" (titles made before the rename), tag `role:design`): logo,
    mascot, brand and screen design explorations as clickable option pages (Artifacts) for the owner; design notes in
    `docs/internal/design/<topic>.md`. Never edits product code; a picked design becomes a card for the Developer.
  - **The Planner is the hub (owner, 2 Nov 2026: "be the brain").** The owner talks only to the Planner. Developer,
    Security and Research send their result to the Planner session when a job ends (`send_message`: what was done, PR
    link, open questions, anything the owner must decide or test), never ask the owner themselves; the Planner turns
    it into cards / questions, asks the owner, and sends his answers back to them as feedback. The Planner's session
    id is in its title "ScreenWithMe · 🧭 Planner" (`list_sessions`, tag `role:planner`).
  - **Option pages are clickable (owner, 2 Nov 2026):** every decision page the Planner makes lets the owner click an
    option per question (the recommended one marked, never preselected), shows his picks live at the bottom as ready
    text ("… seçimlerim: 7: A …", an optional note) with a Copy button; he pastes that text back into the chat.
  - Rules for all: every change goes through a branch + PR (never push to `main`); a docs-only PR may be merged by its
    session once CI is green. Each role edits only its own files above, so two sessions never change the same lines.
    Talk to the owner in Turkish; everything written to the repo stays English.
- **Focus (owner, 2 Nov 2026):** before starting anything, check `ROADMAP.md` "Focus: now / next / frozen" and work
  only on "Now". Build a new feature for computer + phone first; tablet layouts and missing translations are a batch at
  the end of the milestone step. An idea that comes up mid-task goes to `STATUS.md` "Ideas waiting for the owner's
  pick", not into the current work.
- **UI terminology (Turkish UI, 0.9.82 copy pass):** oda (room), kayıtlı / tek seferlik oda (saved / one-time room),
  (oda) yöneticisi (host), odadan çıkar / yasak (kick / ban), **film sayfası** (film page; never "video sayfası"),
  **oda görünümü** (room view; the word "katman" never appears in the UI), Filme git / 🏠 Odaya dön, emoji (sent) /
  tepki (sending, the "Tepki" button) / özel emoji (custom emoji), sıra (queue), pin, sese katıl (join voice), yayın
  (stream), senkron / eşitle (sync), davet linki (invite link), **ad** (name; never "isim"), **düğme** (button; never
  "buton"). No technical terms in the UI ("WebSocket" → "odanın canlı bağlantısı", "peer-to-peer" → "sunucudan geçmez,
  doğrudan gider"). English UI uses the same concepts (room, host, film page, room view, react, queue…). Slogans are the
  user's choice (home page "Ayrı ekranlar, aynı an.", invite card "Sana bir koltuk ayırdım 🍿"); ask before changing.
- **No scrolling inside a view unless it is truly needed (owner's rule, 30 Oct 2026):** a game, dialog or panel must fit
  the space it gets (fullscreen, in the video's place, a free window, a phone) without scrollbars; scale or reflow it
  instead. Only lists that grow without end (chat, a long queue) may scroll. Free windows resize in proportion, never
  into a cramped or broken layout. Check every new screen at small sizes before shipping.
- **Official/public texts** (README, store listing, site copy) never name specific films/series/piracy sites; the tool
  is described as "a neutral sync tool for any HTML5 video" (Chrome Web Store policy). Never open piracy sites for
  testing; use legal demos of the same player stacks (JW Player, Plyr, Video.js, hls.js).

## Next up (saved 29 Oct 2026, after 0.9.91 — continue in this order)
Live: 0.9.95.1 (security review 3 R3-1: `POST /api/rooms/:id/unsave` without a `Content-Length` or above 1 KB is refused by the Worker (411 / 413), `/info` + `unsave` count against `ROOM_INFO_LIMIT` (60 per IP and minute), and the room object reads that body with `readCapped` (`fallback.ts`, exported); rule: **no Durable Object reads a request body without a cap**; e2e `saved.mjs`); 0.9.95 (**renamed to Sidelit** (card 6c): every user-facing text, the extension's name, manifest / PWA, store texts and READMEs; the D1 logo from `logo.ts` (`small` cut ≤ 32 px, `bleed` for maskable / apple-touch; PNG icons rendered by Chromium in `make-icons.mjs`), the favicon `logo-small.svg`, the wordmark in Bricolage Grotesque ExtraBold self-hosted (`public/fonts/`, OFL), the mascot N1 Glowbeam on the home preview and in the empty room (`mascot.svg`, `mascot-waiting.svg`; the costumed theme mascots in the pickers are a follow-up), `scripts/check-name.mjs` in CI fails on the old name in a user-facing file; the extension zip / folder name stays `screenwithme-extension` (an unpacked extension's id comes from its folder); 0.9.93.21 Vimeo links play on the site in Vimeo's own player, card P1, see "Vimeo"; 0.9.93.20 the YouTube fullscreen column (card 2a) takes room only while it shows a note, the cameras or a message (`.theater.fs-side-open`, `updateFsSide` in `room.ts`; a message keeps it 8 s); otherwise the player is full width beside the resting rail (card 6d); 0.9.93.19 the home page's hero is the owner's pick A "two screens, one moment": a laptop and a phone in the same room running one shared progress animation, a dashed sync line between them, a friend's message drifting over to the phone; three short features (`.home-strip`) right under it, the theme picker after them; still with reduced motion; the phone home is unchanged (card 15, harness `scripts/harness/home/run.cjs`); 0.9.93.18 a settings section opened alone (⚙️ = My screen, ⋯ More → film time / save / rules) is a one-column dialog sized to its content; it used to sit in the hidden section list's 210 px column (card 6b, harness `scripts/harness/settings-solo/run.cjs`); 0.9.93.17 the film page's rail opens at the film's right edge and closes when the mouse leaves, the film narrowing and widening with it (card 2b, owner's B); 0.9.93.16 why the extension asks for every website, in two plain lines + a link to `help.html#permissions` on the extension page (`#why-all-sites`) and the "Go to the film" card (`.external-why`, only the link under 760 px tall); the same text is the store's short permission note in `web-store.md`; the yt-room harness covers a plain mouse in fullscreen; 0.9.93.15 a Help / FAQ page `help.html`, EN + TR like the privacy policy (`lang.js` maps a section link such as `#connection` to its `-tr` id), linked from the footer, the profile menu, ⋯ More (computer + phone, `#profile-help`), the extension page and the "can't reach the room" card (`helpHref` in `i18n.ts`); harness `scripts/harness/help/run.cjs` checks its numbers against the code; 0.9.93.14 YouTube in privacy-enhanced mode: the player from youtube-nocookie.com, its API loaded only with the first YouTube video; 0.9.93.13 a simpler room: one "⋯ More" menu right of Invite with the same list as the phone's ⋯, ⚙️ = My screen only, a fresh room shows only add a video / invite / chat / voice until the first video; 0.9.93.12 ("Continue where you left off" is one thin line above the home title; 0.9.93.11 the invite window has "Link" / "QR code" tabs, a real WhatsApp button and "Copy image" for the QR; 0.9.93.10 nothing of ours over the YouTube player by itself: emojis from faces, the countdown in the notes, the edge strip in a gutter beside the player, a fullscreen column for notes, cameras and messages; 0.9.93.9 one rail everywhere on a computer: the empty room, video files, the sync test and the film page get the right rail beside the video, never the toolbar under it; 0.9.93.8 a server security fix: the HTTP fallback can no longer reset a room, one `hello` per connection, votes only from people in the room; 0.9.93.7 the rail rests again on touch-screen laptops and after a pressed rail button, also on the film page; 0.9.93.6 a lighter room: the TV code, invite window, first tips and image tools load only when used, a size budget in CI and a 4× slower phone speed test; 0.9.93.5 the rail no longer stays out in fullscreen after a key press: it lets go of the focus when the mouse leaves it; 0.9.93.4 chat messages over the video come down from the top right beside the rail in fullscreen too, never over the player's bar; 0.9.93.3 the one camera window keeps its cameras side by side in fullscreen too; 0.9.93.2 the rail's windows close when the mouse goes onto the video, also in fullscreen; friendly room names; "?" shortcuts card; hand the host role on; "3-2-1, together" before a new video; "continue where you left off" on the home page; Draw & Guess / Quiz phases move on even when the alarm is late; 0.9.93.1 bug sweep: the Shorts rail's windows fixed (＋ Add, ♾), "1 person", roomier search results; the invite window with a QR code opens by itself in an empty room; paste / drop a link anywhere; "(3)" unread in the tab title; 0.9.93 the rail beside the video opens at the video's right edge and closes when the mouse leaves, "Keep the controls open" pin instead of "Hide the controls", emojis fly over the video again; 0.9.92.9 YouTube: emojis rise from the sender's face, the room's notes in the chat panel; 0.9.92.8 one remote on a computer: no toolbar, the rail + ⋯, YouTube's rail beside the video coming and going with the mouse; phones: sideways = video + one ⛶, games only in ⋯, camera sizes, language asks; 🔍 Search button; "Try again" + connection test with the way back; 0.9.92.7 a bigger room on a computer: the video as big as the screen's height allows, wider side panel, bigger join card; 0.9.92.6 phone fixes from the owner's phone: camera row instead of cameras in faces, real fullscreen + side panel, the keyboard no longer counts as turning the phone, Shorts feed window, recap fits, one share sheet; 0.9.92.5 phone step 3: games full screen with the video as a small preview, the home page as an app start screen, lighter phones; 0.9.92.4 phone step 2: Shorts take the phone's screen with one slim bar, sideways fullscreen gets a slim dock beside the video; 0.9.92.3 phone room rebuilt as an app screen, owner's picks; 0.9.92.2 Shorts rail: on wide screens the Shorts bar is a column right of the video and the top bar folds on short
screens, so the video is ~30 % taller on a laptop; 0.9.92.1 CLAUDE.md rule: everything technical in English; 0.9.92 rooms work on networks where WebSockets never open, e.g. the owner's phone hotspot: automatic HTTP
fallback, `/baglanti` tells the causes apart; 0.9.91.20 first-time path: one join screen with who is waiting, 3 first tips, the install card notices a new
extension; 0.9.91.19 TikTok links play in the Shorts view with TikTok's official player; 0.9.91.18 Shorts: YouTube's own bar and nothing of ours over the player, 🎲 Keşfet pools, ✨ Bunun gibi, `?olcum=1` switch measurement; 0.9.91.17 "your browser blocks direct connections" hint for voice / cameras / streams, Edge Add-ons prep, browser notes on the extension page; 0.9.91.16 voice and cameras survive a dropped room connection or a deploy: the server keeps the member id; a Short opened during fullscreen leaves fullscreen for the Shorts view; pinned camera = spotlight in the one-window layout; share menu over the cameras; 0.9.91.15 film page uses my chosen mic / camera / speaker + 🎛 there, one permission prompt; the stream window is free: drag, resize, pop out, hide my own; 0.9.91.14 TV version calmed and hidden behind `?tvlab=1`, Google Cast version after 1.0; 0.9.91.13 games in the Shorts view are free windows + 🎮 in the Shorts bar, dock for Shorts in the room view, a new feed clears the old one, extension update notice; 0.9.91.12 Shorts from search open as Shorts, Shorts search in the Shorts bar, mic looks off before voice, wide permission window; 0.9.91.8–0.9.91.11 games and TV rounds; 0.9.91.7 dock in the window too, hiding with the player's bar; camera pill only for cameras; Shorts bar tray + add box; plain themes on phones; windows in front of the film; 0.9.91.6 games; 0.9.91.5 TV version; 0.9.91.3 no scrollbar on the film in the room view / fullscreen; 0.9.91.2 phones: app-like room, bottom-sheet menus, iPhone fullscreen, sideways = fullscreen; 0.9.91.1 player controls option A: their own bar + our dock on the right in fullscreen; 0.9.91 endless Shorts feed, line icons, right rail ends with the video card; 0.9.90.9 Shorts: cameras in the seats; 0.9.90.8 camera pill stays in voice + stream button, screen share with camera; 0.9.90.7 paste many links; 0.9.90.6 pre-join voice check; 0.9.90.5 camera free tiles; 0.9.90.4 YouTube search in the link box; sound effects 0.9.90.2; one remote: on the
site since 0.9.90.1, on the film page in fullscreen since 0.9.90.3). YouTube is reachable from the cloud sandbox again (29 Oct 2026;
`*.googlevideo.com` still blocked, headless Chromium can't decode YouTube's H.264 anyway). The same queue is in
`docs/internal/STATUS.md` "Task queue".
0. ~~Player controls design~~: the owner chose A, built in 0.9.91.1 (see "Player controls").
1. **Shorts step 2 (rest):** measure in a real browser (needs real YouTube playback, the cloud's headless Chromium
   can't) how far apart everyone lands on the next short, then decide on a hidden preload player; then the endless
   feed ("more Shorts about …", uses the YouTube search API). Paste many links + thumbnail warm-up shipped in 0.9.90.7.
2. ~~YouTube search~~ done in 0.9.90.4 (see "YouTube search"). ~~Sound effects~~ done in 0.9.90.2. ~~Camera layout
   2~~ done in 0.9.90.5 + 0.9.90.6.
3. **Before 1.0:** ROADMAP §2–7 (incl. the YouTube API compliance audit for a higher quota, by the owner, with the
   domain and terms of use); remind the owner of the Brave/Edge test right before the store submission.

## Plan in one screen (details and checklists: `docs/internal/ROADMAP.md`)
**Before 1.0** (we are at 0.9.8x; every version moves one of these forward):
1. **Polish existing features** (the user will walk through each one). Owner's list for the full pass before 1.0
   (ROADMAP §1 "Full pass before 1.0"): **sound effects** (done in 0.9.90.2) and **camera window settings** (free tiles in
   0.9.90.5, pre-join device check in 0.9.90.6).
2. **Zero known bugs:** every bug gets an issue + a regression test; flaky tests are fixed, not ignored.
3. **Security hardening:** threat model, protocol/limits review, CSP and headers, extension permissions, dependency
   and secret scanning, `SECURITY.md`.
4. **Legal and policy:** final product name (trademark check), privacy policy (GDPR/KVKK), terms of use, abuse/takedown
   contact, YouTube API terms, Chrome Web Store policies, asset licenses.
5. **Consistency:** one name, one terminology, English-first repo, the same numbers (limits, retention) in code,
   policy, docs and UI.
6. **Operations:** own domain + support e-mail, monitoring, cost limits, release notes and tags.
7. **1.0 launch:** Chrome Web Store submission, domain purchase and the final name decided together; social accounts
   reserved under the final name; launch content.

**After 1.0:** keep improving features; integrations with big services (Netflix, Spotify… each one researched for
terms and DRM first, DRM is never bypassed); apps (PWA first, native only if it adds real value; Firefox/Safari/Edge
add-on stores); growth (Instagram/TikTok content, launch posts), donations, community, making the repo public.

## Structure (npm workspaces, strict TypeScript, no framework)
```
packages/shared   Shared: protocol.ts (messages + validation), room-logic.ts (queue/playback rules),
                  sync-engine.ts (sync engine), clock.ts, connection.ts (WebSocket client),
                  media.ts (link detection), video-element.ts (<video> wrapper + scoring), room-id.ts,
                  logo.ts (single source of the logo: shapes + SVG generation)
apps/server       Cloudflare Worker + Durable Object (src/room.ts: one object per room,
                  WebSocket Hibernation, host/kick, chat history, rate limits)
apps/web          Website (Vite, plain TS/HTML/CSS). src/room.ts room page; src/ui/* panels
                  (chat, queue, people, settings, tabs, fullscreen, reactions, toasts); themes.ts; i18n.ts (TR/EN)
apps/extension    Manifest V3 extension (esbuild, build.mjs). Has NO UI or room connection of its own: it opens the
                  website itself as an overlay (shell) on top of the film page. background.ts (shelled tabs + message
                  relay), content.ts (in every frame: find video, engine, overlay and fitting into the hole),
                  shell.ts/shell.html (overlay page: contains our site ?shell=1), focus.ts (fit the video into the
                  hole), store.ts (site settings), site-bridge.ts (only on our site), popup.ts (info + one button)
scripts/e2e       End-to-end tests (fake users against a real server) · scripts/harness: extension test pages
```

## Commands
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
node scripts/theme-art.mjs   # scene + mascot SVGs of illustrated themes (apps/web/public/themes/)
node scripts/avatars.mjs     # drawn avatars (apps/web/public/avatars + apps/extension/static/avatars)
```
Store form texts: `docs/internal/web-store.md`. Screenshots are taken from `store/src/shots.html` (the script opens it
from a local server); the room part is `store/src/room.html`, fixed content using the site's real `styles.css` +
`room.ts` markup. If the room page or popup changes, update that copy too.
Windows/PowerShell notes: write the commit message to a file and use `git commit -F` (quotes break). Write files as
UTF-8 without BOM. If `gh` is not on PATH: `C:\Program Files\GitHub CLI\gh.exe`.

## Architecture principles (do not break!)
- **The server is the single source of truth.** `PlaybackState { item, paused, position, rate, updatedAt }`;
  position = `position + (serverTime − updatedAt) × rate`. Clients estimate server time with `ServerClock` (in the
  extension the background sends `offset` → `OffsetClock`).
- **Sync engine (`sync-engine.ts`):**
  - Every command to the player goes through `command()`; expected events are counted. Within the window (1 s) only
    **expected** events are swallowed; every unexpected event comes from the user.
  - `enforce()` only commands what is really different (an unchanged message opens no window).
  - Pause: sent **immediately** on a normal `<video>`; only for `seekNoise` players (YouTube) we wait 300 ms, and a
    message arriving during that wait does not restart playback.
  - Seeks are detected from unexpected jumps in time (YouTube has no seek event).
  - Drift: >1 s → jump (3 s cooldown); smaller → close it with ±5% rate on `fineRate` players.
  - Play retry at most once every 3 s (so we don't fight the user during loading/ads).
  - If you change it, add a scenario to `sync-engine.test.ts` (fake clock + fake player).
  - **"3-2-1, together" (0.9.93.2):** a playing state whose `updatedAt` lies in the future is a held start: the engine
    treats it as paused at `position` (`current()`, `holdLeft()`), reports no stall, and a timer enforces the play at
    `updatedAt`; everyone starts at the same server moment (measured 5 ms apart in the harness). The server sets it in
    `RoomObject.countdown`: the first time an item starts playing from ≤ 1 s with ≥ 2 people (by browser, no TVs),
    `COUNTDOWN_MS` (3 s) ahead; not for Shorts / TikTok / film pages / the sync test (`countdownMedia`), a resumed saved
    video, or with `settings.countdown === false` (Room rules, host); once per item (`counted`, storage). The page shows
    the seconds over the video (`showCountdown`, `.countdown`). A user's play during the hold starts the room at once.
- **Everyone ready (`waiting.ts` + engine):** while the room plays, a client whose video has not advanced for 1.5 s
  sends `{t:'ready', ready:false}`; the server (`WaitTracker`) pauses the room as `SYSTEM` and broadcasts the
  `waiting` list. It resumes when everyone is ready or after at most 12 s; the same person cannot make the room wait
  again within 30 s; a manual play/pause/seek cancels the wait; the host can turn it off (`settings.waitForAll`).
  System actions arrive with `by.id === SYSTEM_MEMBER_ID`.
- **Protocol (`protocol.ts`):** the server validates everything from clients and copies it into a new object. On a
  backward-incompatible change bump `PROTOCOL_VERSION` (old clients get a "refresh the page" error; extension users
  must update, careful). Optional new fields (avatar, cid, hostId…) can be added without a bump.
- **Shorts view ("Oturma odası", site `ui/seats.ts` + `room.ts` "Shorts view"):** a `youtube.com/shorts/…` link becomes
  `{kind:'youtube', id, short: true}` (optional field; the same video added via a normal link stays horizontal). When
  a Short is playing, `.room.shorts`: right panel, link box and toolbar hidden; vertical video in the middle, people
  on both sides (at most 6, the rest "+N"; on phones one row under the video), a 6 s bubble from the avatar of whoever
  writes, emojis rise from the avatar (above the video if they have no seat). At the bottom: message box + emoji bar
  + 🔁 Loop + "↩ Oda görünümü" (remembered per tab, `sessionStorage` `shortsOff:<room>`; back with "📱 Shorts
  görünümü" in room view). View changes use View Transitions (video `view-transition-name: swm-player`; without
  rendering, no transition after 0.6 s). ↑/↓, PageUp/Down, ▲▼ and the mouse wheel (outside the video, once per 0.9 s):
  ↓ = `next` (not sent when the queue is empty, a note appears), ↑ = `{t:'prev', from}`: the server keeps recently
  played items in `played` (30, in storage), opens the previous one, puts the current one at the head of the queue
  (only the host when `hostOnly`). Short to Short: the new video slides in from below (going back: from above). Loop
  is `settings.loop` (host): when the video ends the client sends `{t:'next', end: true}`; if loop is on and the video
  is a Short the server applies `restart` (seeks to start; not again if position < 2 s, simultaneous "ended" messages
  count once). A manual "Next" skips even in loop. **0.9.90.1 (owner: "working is not enough, make it great"):**
  A Short that starts while I'm in fullscreen leaves fullscreen so the Shorts view shows (0.9.91.16, owner; not on
  the TV). YouTube → YouTube switches reuse the same player (`PlayerAdapter.load` = `cueVideoById`; no new iframe, switching
  used to take 1–2 s), phones swipe up/down on the stage (≥60 px, mostly vertical, ≤0.8 s; not on chat / emoji bar),
  and the wheel scrolls (since 0.9.91.18 beside the video, not on it: YouTube's own bar is there; phones swipe on the
  stage's margins or use ▲▼). Next
  ideas in `STATUS.md`. Test: `scripts/e2e/shorts.mjs`. **0.9.90.7:** many links pasted in the link box at once
  (`parseMediaList` in `media.ts`: only tokens that look like links, YouTube / video files, no film pages, duplicates
  dropped, at most `MEDIA_LIST_MAX` 30) go to the queue one by one 300 ms apart (the server's command limit is 4/s; with
  "Şimdi aç" the first one opens now); while a Short plays the next queued YouTube item's thumbnail is fetched ahead
  (`warmNextShort`) so the cued player shows it at once.
  **0.9.90.9 (owner's idea):** in the Shorts view there are no camera tiles (`html.shorts-view .voice-cams` hidden);
  a person's camera fills their seat's avatar circle (`seats.setCams`, fed by voice's `onCams` with the cameras on
  screen, hidden ones and "hide myself" left out; videos kept between redraws, mine mirrored, green ring); the bottom
  bar has only 🎙 / 📷 (`#shorts-voice`; not in voice yet, 🎙 joins); seats are bigger there (80 px, 52 px on phones).
  **0.9.91.7 (owner):** the Shorts bar's emojis are the room's "😀 Tepki" tray (`.tray-bar`: custom emojis, the three
  recent) and "＋ Ekle" (`#shorts-add`) queues links (one or many, same paths as the link box; words point to the ♾
  feed); on a phone Tepki shares a row with 🎙 / 📷 and ↩ / 🔁 lose their text. **0.9.91.12:** words in "＋ Ekle" search
  YouTube Shorts only (`ui/shorts-search.ts`, the feed's `short=1` search, ≈ 1 % of the day's quota per new query,
  cached); a row's ＋ queues it as a Short; before joining voice 🎙 looks off (red) like 📷. **0.9.91.13:** a game in
  the Shorts view is always a free window (`games/stage.ts` `shortsView`: opening the view with a game open saves
  `gamePlace:<kind>` = float and sizes it to fit right of the video, `besideShorts`; it stays free back in the room
  view); 🎮 in the Shorts bar (`#shorts-game`, `extraButtons`: the hub moves next to the button pressed); a new ♾ feed
  dequeues the old feed's Shorts still waiting (`feedAdded:<room>`).
  **0.9.91.18 (owner: "finish Shorts"):** nothing of ours over the YouTube player in the Shorts view (YouTube's
  Required Minimum Functionality, checked in the API audit): no catcher, no own bar, emojis rise from the seats
  (`seats.react`, the "+N" seat for people without one), never `reactions.show` there. The room view (flying emojis,
  dock, toasts over YouTube) is a separate job before the audit. **🎲 Keşfet** in the ♾ popup: chips Popüler / Müzik
  / Oyun / Komedi / Hayvanlar / Spor (`POOL_KINDS`) start a feed from `/api/youtube/pool?kind&hl&page` (Worker
  `youtubePool`: the most watched Shorts of the last 14 days, `videoCategoryId`, `order=viewCount`, region TR / US,
  `safeSearch=strict`, 50 per page; one shared answer per kind + language + UTC day in `caches.default`, `yt-pool1`;
  rooms shuffle it). **✨ Bunun gibi** (top of the ♾ popup): `/api/youtube/like?id&hl&page` (`youtubeLike`: the
  video's channel → uploads playlist → its Shorts, 4 units; `next` = `LIKE_SEARCH_PAGE` switches to a search on the
  title's words, `titleWords`, 101 units a page; `yt-like1`). Feed sources are `FeedSource` (`topic` / `pool` /
  `like`, `sessionStorage` with the feed). **Switch measurement:** `?olcum=1` once in a tab → `#shorts-measure` by
  ▲▼ shows how many ms after the room switched (server time, `state.updatedAt`) this Short started moving, and the
  average of the last 5 (`measureSwitch`; nothing is sent).
  **0.9.92.2 Shorts rail (owner chose C on https://claude.ai/artifact/FDEUP6Msgo6UbxYtAu9379: "too small on my
  laptop"):** above 860 px wide the `#shorts-bar` is a column of 48 px icon buttons right of the video (grid column 3,
  ▲▼ `#shorts-nav` at its foot; names in the titles): 💬 `#shorts-chat-btn` (or Enter) opens the message box as a small
  window (`.shorts-chat-wrap.open`, Esc / outside click closes), 😀 tray, 🎙 / 📷, ＋, 🎮, ♾, 🔁, ↩. Its windows open right
  of the rail; `fitRailPops` slides one back on screen when the window is small. (0.9.93.1: the rail's 48 px square-button rule skips
  buttons inside its windows (`.shorts-feed-pop *`, `.react-tray *`, `.game-menu *`); a window is capped to the screen
  and scrolls inside; `fitRailPops` also runs when results arrive (`childList`); ＋ Add = box + button on one row, with
  a title + ✕ as a phone sheet; the player's "can't be played here" note is a card in the empty bottom left.) The video is `100dvh − 103px` (cap
  1100). Under 900 px tall the top bar folds (`position: fixed`, off screen) and the video is `100dvh − 40px`: ⋯
  `#shorts-more` or the mouse at the very top edge adds `html.topbar-peek`; an outside click / Esc / leaving the view
  folds it again. Under 760 px tall the rail is slimmer (40 px). ≤ 860 px (narrow windows) keep the bottom
  bar; phones have their own slim bar (0.9.92.4, "Phone room as an app screen"). `besideShorts` measures from the rail's right edge. Probe sizes: 1366×768 → 410×728 (was 314×558). Test: `scripts/harness/shorts-rail/run.cjs` (22 checks).
  **0.9.91 endless Shorts feed (`ui/shorts-feed.ts`):** "♾ Shorts akışı" in the Shorts bar (topic box) or "📱 Shorts
  akışı" on a search's results starts it; when fewer than 3 are queued (and nothing but Shorts is playing) it asks
  `/api/youtube/search?short=1&page=…` (Worker: `videoDuration=short`, "#shorts" added, 25 per page, `nextPageToken`
  passed on as `next`, only ≤ 180 s non-live results; cached per words + page) and adds up to 8 unseen ones (rest kept
  as `pending`), 300 ms apart, then pauses until they are in the queue. Runs in the tab that started it
  (`sessionStorage` `feed:<room>`); stops on quota / off, when the topic runs dry or after 3 empty pages, and when only
  the host may change the queue. Each page ≈ 1 % of the day's quota. Since 0.9.92.6 ♾ always opens its window; a running
  feed shows on top (`#shorts-feed-now`, "On now: …" + Stop) and stops only from there (it used to stop on the press).
- **YouTube search (0.9.90.4, `packages/shared/src/youtube-search.ts`, Worker `src/youtube.ts`, site `ui/search.ts`):**
  words instead of a link + Enter in the link box → `GET /api/youtube/search?q&hl` (only on Enter, never while
  typing). The Worker holds the key (`YOUTUBE_API_KEY`, repo secret; the deploy job uploads it with
  `wrangler deploy --secrets-file`; without it the answer is `{error:'off'}`, as locally and in CI), calls search.list
  (`type=video`, `videoEmbeddable`, 12 results) + videos.list for durations = 101 of the 10 000 free daily units
  (≈ 100 searches/day). Same words + language are answered from `caches.default` for 24 h; a quota error is remembered
  for 10 min (refused calls cost nothing, so search reopens by itself after YouTube's midnight-Pacific reset); only
  calls that reach YouTube count against `SEARCH_LIMIT` (10/min per IP hash); a foreign `Origin` gets 403. Answers:
  `{items:[{id,title,channel,duration,live,short?}]}` or `{error: quota|busy|off|failed}` (`short`, 0.9.91.12: videos.list
  also asks `player` with `maxWidth=100`; an embed taller than wide + ≤ 180 s = a Short, marked 📱 in the list and
  opened in the Shorts view; the cache key is `yt-search2`) (each has a friendly note; links
  always still work). The thumbnail is built from the id (`i.ytimg.com`, already in the CSP); the page also caches
  full answers in memory. A row adds to the queue (plays at once in an empty room), "▶ Şimdi aç" loads it. Privacy
  policy has a "YouTube search" section (YouTube API Services, YouTube Terms, Google privacy policy). A quota increase
  needs Google's API compliance audit (owner, before 1.0). Test: `scripts/e2e/search.mjs` (live: real results or
  `quota`).
- **TikTok (0.9.91.19, PDF item 2, `players/tiktok.ts`):** `{kind:'tiktok', id, user?}` (optional new kind, no version
  bump: `cleanMedia` validates `TIKTOK_ID` / `TIKTOK_USER`). Links: `tiktok.com/@user/video/<id>`, `/v/<id>`,
  `/embed/v2/<id>`, `/player/v1/<id>` (`parseTikTok`); short share links `vm.` / `vt.tiktok.com` go through the
  Worker (`/api/tiktok/resolve`, `tiktok.ts`: follows redirects only on tiktok.com, cached a week, `SEARCH_LIMIT` on
  real lookups). Played in TikTok's official embed player `https://www.tiktok.com/player/v1/<id>` (TikTok's own bar,
  `rel=0`, no fullscreen button) driven by its postMessage API (`x-tiktok-player`: play / pause / seekTo / mute /
  unMute; onPlayerReady / onStateChange / onCurrentTime / onMute / onError; commands wait for ready). Always the
  Shorts view (`isShortItem`), loops like a Short, always 1× (`maxRateFor` → `TIKTOK_RATE`; the server lowers the rate
  when one opens). Titles from TikTok's oEmbed (needs the @handle; else "TikTok · @user"). CSP `frame-src
  https://www.tiktok.com`. Privacy policy "TikTok videos". The cloud can't reach tiktok.com: harness
  `scripts/harness/tiktok/run.cjs` replaces the player with a fake page speaking the same protocol (8 checks); the
  real player is the owner's check.
- **Vimeo (card P1, `players/vimeo.ts`):** `{kind:'vimeo', id, hash?}` (optional new kind, no version bump: `cleanMedia`
  validates `VIMEO_ID` / `VIMEO_HASH`). Links (`parseVimeo`): `vimeo.com/<id>`, `/<id>/<hash>` (unlisted),
  `/channels/<c>/<id>`, `/groups/<g>/videos/<id>`, `/showcase|album/<n>/video/<id>`, `player.vimeo.com/video/<id>?h=`;
  other Vimeo pages stay film pages. Played in Vimeo's own embed player `player.vimeo.com/video/<id>?h&dnt=1` (its own
  bar; no `fullscreen` in `allow`, the room's fullscreen holds it) driven by player.js's postMessage protocol spoken
  directly (no SDK script): `{method, value}` out (`addEventListener` per event after `ready`, `play`, `pause`,
  `setCurrentTime`, `setMuted`, `getDuration`, `ping`), `{event, data}` / `{method, value}` in, objects or JSON strings;
  a refused `play` (`error` with `method: 'play'` / `NotAllowedError`) = autoplay blocked. `seekNoise: false` (a seek
  gives `seeked`, no play / pause). Always 1× (`VIMEO_RATE`; speed only on paid accounts). Room view, gets the
  countdown. Titles from Vimeo's oEmbed (`titles.ts`), title key `vm:<id>`. CSP `frame-src https://player.vimeo.com`.
  Privacy policy "Vimeo videos". Harness `scripts/harness/vimeo/run.cjs` (fake player, 12 checks); the real player is
  the owner's check.
- **Media kinds:** `youtube`, `html5`, `tiktok`, `vimeo` and `test` play on the site; `page` (any other web address) plays on the film
  site itself, everyone in their own tab, with the room overlay opened by the extension (see "Shell").
- **Extension rules:** does nothing while not in a room (frames check `storage.session` `sessions`; sleeps if there is
  no shelled tab). The background picks the best video (based on the frames' scores). The extension has no UI of its
  own; the only things it adds to a page are the overlay iframe and, when autoplay is blocked, the "İzlemeye başla"
  card (closed shadow DOM).
- **Security:** user data is never written with `innerHTML`. Rate limits live on the server. Host/kick use a
  persistent browser identity (`cid`, not an account); a kicked person cannot rejoin until the host lifts the ban
  (the `bans` list only goes to the host, removed with `unban`; cids are never sent to clients). Host checks are per
  person (`isHost`): the same person's site tab and extension tab are both host.
  **Hardening (0.9.86, `docs/internal/security-review-1.md`):** the Worker accepts WebSockets only from its own origin
  and `localhost` (`index.ts` `guardSocket`), at most 60 new connections per IP and minute (rate-limit binding
  `CONNECT_LIMIT` in `wrangler.jsonc`), and passes the room a short SHA-256 hash of the IP in `X-SWM-Ip` (set only by
  the Worker; kept in the connection's attachment, never stored or sent to clients; used for emoji upload limits).
  Security headers live in `apps/web/public/_headers` (CSP: scripts only from us + YouTube; no inline scripts, so
  static pages load `eklenti.js` / `gizlilik.js` / `offline.js`; if you add a third-party script, image or frame host,
  add it to the CSP). `frame-ancestors` is impossible (in the shell the film site is an ancestor), so `main.ts`
  refuses to run in any frame except the extension overlay (`isShell`).
- **Shell (room overlay, `packages/shared/src/shell.ts`):** when a `page` opens in the room, the site sends
  `{source:'screenwithme-site', type:'go', roomId, url}` → site-bridge → background `site-go` (records the tab in
  `shells`, `storage.session`) → the tab goes to the film page. The person who opened it goes there directly; others
  get a "Filme git" card (we never redirect anyone without asking). On the film page the top frame opens the
  `chrome-extension://…/shell.html` iframe full-screen (the room id is NOT in the URL/attributes: the film site can
  read the overlay element; shell.html gets the id from the `swm-shell` port with `{type:'room'}`, and the background
  refuses if the tab is not in `shells` → a shell.html embedded in some other page opens nothing), which in turn opens
  our site `/r/ROOM?shell=1` (our site is not subject to the film page's CSP, the film site cannot reach into it).
  The **site** in the overlay holds the room connection (the same person appears once); the extension is only a
  relay: site ⇄ shell.html (postMessage, origin-checked) ⇄ background (`swm-shell` port) ⇄ film frames (`swm` port).
  Site → film: `embed` requests (`state`, `clock`, `control`, `detach`); film → site: `reply` (`send` only if
  `isRelayable`, `status`, `key`), `page` (the tab's address), `video` (found or not), `fullscreen`. The site reports
  `layout`: `full` (always while there is a film, even before the video starts: room view; `hole` = `.player-wrap`,
  `islands` = cards/controls inside the hole) or `open` (something the site plays itself, no hole). The top frame
  applies `clip-path: path(evenodd …)` to the overlay (clicking the hole clicks the film player); `focus.ts` fits the
  video into the hole (if there is no video yet, `likelyPlayer`: the largest video/frame or a box close to 16:9; the
  overlay starts in `open`; `bar` is no longer used). In the shell the site's backgrounds do not paint the hole
  (`shell-film`, `--hole-cut`); messages inside the hole are semi-transparent (the overlay iframe and shell.html use
  `color-scheme: dark`: our site declares a dark scheme, and with different schemes Chrome paints the frame's
  background opaque grey). While the film page opens, a `[data-swm-cover]` cover stays until the overlay is up
  (document_start, if the address ends with `#swm-cover` (added by the background on `site-go`, removed with
  `replaceState` before any page script; 0.9.83, fixes a one-frame flash on the first arrival), `sessions` contains
  this site or the tab's `sessionStorage` `swm-cover` is set; it swallows
  clicks and is removed on the first layout reported by the site (`fromSite`; not on the background's placeholder),
  at most 8 s). On first open the hole opens two frames after focus, and the top frame says `{type:'hole'}`: only then
  does the site turn on `shell-film` (transparency) (turning it on earlier showed the film site for one frame). If
  nothing resembling a player exists in room view, the page stays hidden (`blank`). In fullscreen the film fills the
  screen with its own player bar and our dock sits on the right (see "Player controls"; mouse movement on the film page
  reaches the site as `activity` → `fullscreen.poke()`); islands are always clipped to the hole. "👁 Sayfayı göster" (top, in the shell):
  the overlay becomes `bar` (48 px strip) and the film page is shown as is (to close ads/popups); "↩ Oda görünümü"
  goes back; if no video is found 10 s after the film opens, the button is suggested (`flashHint`). The focus box
  does not clip overflow (that cut off subtitles) but draws no scrollbars (0.9.91.3: a scrolling player box showed one on the film's right edge) and dispatches `resize` when its size changes (subtitles). If the video is in an inner frame,
  the right frame grows through the `swm-focus-here` chain. In the shell the site skips the name step; the extension
  link, main logo and footer are hidden; "🏠 Odaya dön" + "👁 Sayfayı göster" + "🎯 Video seç" sit together in the
  middle of the top bar (`.shell-tools`, 0.9.90; icons only under 1100 px). **The room view never scrolls on the film
  page (0.9.90):** the right rail fits the window (`.side` flex column, `max-height: 100vh - 110px`, tabs card takes
  the rest) and the hole has `max-height: 100vh - 250px` (it may be wider than 16:9; the film keeps its shape inside).
  Scrolling moved the hole and the film video followed a few frames late (it "slid out of its frame"); if a tiny
  window still scrolls, `scroll` reports the layout every frame. "🏠 Odaya dön" (`navigate` → the room on the site, overlay goes
  away). When another `page` opens in the room: "Filme git"; when something the site plays opens: the overlay opens
  and the film engine stops (`detach`, no "pause" goes to the room). Fullscreen: our ⛶ makes the whole film page
  fullscreen and the room switches to `.theater.fake-fs` (`:is(:fullscreen, .fake-fs)`); the film site's own ⛶ only
  shows the video. If the user navigates from the film site to another site (the last two labels of the domain
  change) the overlay is removed (`Shell.site`). When the site is ready it says `shell-ready` (earlier `page`/`video`
  messages are re-sent). On leaving the page the site closes its connection (`pagehide`; otherwise the bfcache page
  made the person appear twice). In the shell there is no queue tab and no link box (go back to the room to pick
  the next item); the logo and "🏠 Odaya dön" ask first (`ui/confirm.ts`). While one of the site's dialogs is open
  (avatar, theme, recap, confirm) the hole closes completely (the dialog is in front of the video). The film site's
  fullscreen is redirected to the room's: `fullscreen-guard.ts` runs in the page's world (MAIN world); while
  `<html data-swm-room>` is set it does not call `requestFullscreen` but dispatches a `swm-fullscreen-request` event;
  if the video's built-in ⛶ is used, the content script exits and requests the room's fullscreen. On the main site,
  "Şimdi aç" + a film link first asks with a short explanation. Test: `scripts/harness/embed/run.mjs`.
- **Resilience to ads (`docs/internal/reklamlar.md`):** a video with a known duration under 60 s (ad/preview) is not
  attached to the engine: nothing goes to the room and it is not seeked to the room's position; when the source of the
  same `<video>` changes we don't attach until the duration is known (at most 3 s); once it is long (the film) we
  attach and the person jumps to the room's position. Scoring lowers short (×0.1), muted looping (×0.2) and small
  corner-pinned (×0.3) videos; frames of known ad networks (`AD_HOSTS`, short list, nothing is blocked) have no
  candidates. In room view, videos playing with sound other than the film's player are muted (unmuted when the room
  ends; if a film is chosen later its sound is restored). We do NOT ship our own ad-block list, `window.open`
  wrapper, or ad skipping (store "single purpose" policy, easy to break). The extension page suggests uBlock Origin
  Lite. 0.9.60: **a5** in room view, a tab opened from the film tab ≤3 s after a click on the film page that goes to
  another site within its first 5 s is closed (background `tabs.onCreated` `openerTabId`; Ctrl+T's
  `chrome://newtab`, links from our site `open-ok` and "Geri aç" `reopen` are untouched; `opt:closeAds`), the site
  shows a "kapatıldı · Geri aç" note; **a6** if the film tab navigates to another site ≤4 s after a click, the overlay
  stays (`Shell.strayed`, `page.strayed`) and the site says "Filme geri dön"; **a3** while a short video plays in the
  active frame and the film is not playing: `{t:'ready', ready:false, ad:true}`: the server does not make the room
  wait, the member gets `ad: true` ("📺 reklamda"), cleared when the film comes (the site also clears it when
  closing). Test: film-server `/popup` `/redirect` `/preroll` (`FILM_AD`).
- **Manual video pick (0.9.60, extension `picker.ts`):** in the shell "🎯 Video seç" → the overlay becomes a strip
  (`peek = 'pick'`), every frame draws a "Bunu senkronla" button over its videos (closed shadow DOM); the chosen video
  becomes `picked` in its frame (score `PICKED_SCORE`, synced even if short), the old video stops, another frame's
  pick is cleared with `unpick`. Test: `/two`.
- **Rate lock in the extension:** the engine in the film frame uses `lockRate: true`; the rate only changes from our
  speed menu; changes by other speed extensions are not spread to the room and are reverted (with a stubbornness
  limit). Off on the site.
- **The extension does not run on our site:** the content script is never injected into our pages
  (`exclude_matches`) and does nothing in frames inside our site (`ancestorOrigins`: YouTube player, the site in the
  shell).
- **Kicks and the same browser:** same `cid` + different name → only that name is banned (`cid|n:name`); same cid +
  same name → the host's own tab, closed with a ban-less "kicked".
- **Shared settings (`storage.ts` + extension `store.ts`):** every `save()` on the site also goes to the extension with
  its write time (`__at`) (in the extension each setting has its own key: `site:<key>`; the old single object
  `siteStore` is read-only. With a single object, two quick read-modify-writes overwrote each other: the name got
  lost and the person appeared with an old name on the film page; writes are also serialized). On startup
  `syncStore()` reconciles (newest wins), then `app.ts` loads (language/theme correct on the first frame). On the
  main site the bridge is site-bridge; in the shell it is shell.html (the shell site's own storage may be separate or
  blocked; then in memory). Shell mode only if the top frame really is `chrome-extension://` (so another site can't
  read settings with `?shell`).
- **Handing the host role on (0.9.93.2):** `{t:'make-host', id}` (host only, not to a TV): `hostKey` becomes that
  person's key for good (all their tabs), the old host is a guest; everyone gets `members` and the chat says "X is now
  the host". UI: 👑 next to each person in People (`people.ts`) and "👑 Make host" in the person menu (`voice.ts`), both
  after a confirm (`askMakeHost`). Test: e2e `host.mjs`.
- **Host handover:** when the host's last connection leaves, `hostGoneAt` is written; if they return within 20 s
  (`HOST_GRACE_MS`) they stay host (page reload); otherwise on the next join hosting moves permanently to the oldest
  person in the room (`settleHost`); the old host cannot take it back.
- **Sleep resilience (DO):** the "everyone ready" state (`WaitTracker.snapshot`) and `emptySince` are written to
  storage; a single alarm covers both the 12 s wait and the 24 h room deletion (`scheduleAlarm`). Never rely on
  in-memory `setTimeout`.
- **HTTP fallback for networks without WebSockets (0.9.92, owner's phone hotspot, `docs/internal/hotspot-connection.md`):**
  every room / game connection goes through `openSocket` (`packages/shared/src/socket.ts`): a WebSocket first; not
  open within 6 s (`WS_OPEN_MS`) or failed before opening → `HttpSocket` on the same address with `?http=open|send|poll|
  close` (POST open → `{sid}`; POST send = JSON array of message strings, ≤ 40, ≤ 1.1 MB; GET poll held ≤ 20 s, answer =
  messages one per line; `410 {code}` = closed). Server `apps/server/src/fallback.ts`: `PollHub` per Durable Object,
  `PollSocket` shaped like a hibernatable WebSocket (send / close / readyState / attachments); the objects' socket lists
  are `ctx.getWebSockets()` + `polls.sockets()` and every message goes through the same `webSocketMessage`; new
  connections are set up in `admit()` (shared by both ways). The Worker's `connect()` routes both (only `open` counts
  against `CONNECT_LIMIT`; origin checked; `X-SWM-Ip` / `X-SWM-Room` set only by the Worker). Sessions are in memory
  (idle 45 s → closed, never polled 10 s after `open` → closed; a restart → `410` → reconnect with `prev`). Limits (0.9.93.8, security review 2 H1): `send` bodies read as a stream up to `SEND_BODY_BYTES`, ≤ 11 M characters queued per session (one full join with every emoji + chat image fits), ≤ 24 M per object (`HUB_BYTES`); `hello` is accepted once per connection (`bad_message` after), votes count only people in the room (≤ `MAX_MEMBERS`). Once needed, the tab prefers it (`sessionStorage`
  `swm:http`, 30 min); the room's socket probes `/api/probe` (Worker-only WebSocket, says "ok") after 1, 2, 4 … 10 min
  and closes with `UPGRADE_CODE` 4100 to reconnect over a WebSocket. A closing page hands its member id to the next
  page of the tab (`swm:prev:<room>`, 30 s) so a reload replaces the old connection at once; the fallback's close goes
  as a beacon. The room's alarm never deletes a room with `emptySince === null` (starts counting instead). The site
  marks `<html data-swm-transport="ws|http">`. The TV pairing socket stays WebSocket-only. Tests: e2e `fallback.mjs`,
  unit `socket.test.ts`, harness `scripts/harness/hotspot/run.mjs` (proxy swallowing upgrades in front of
  `wrangler dev` serving the built site).
- **Networks that cannot connect (0.9.79):** on some mobile networks (the user's phone hotspot) the page loads but the
  room's WebSocket neither opens nor closes (stuck on "Bağlanıyor…"). `RoomConnection` closes a connection that does
  not open in time and retries (`OPEN_TIMEOUT_MS`, 16 s since 0.9.92, `onFailures`); after 2 failed attempts the room shows
  "📶 Odaya bağlanılamıyor" (`.net-hint`, suggests another network / DNS 1.1.1.1). `/baglanti` (`diag.ts`): page
  protocol (h3 = UDP), plain request, WebSocket open, welcome, ping; "Sonucu kopyala" (0.9.92: + a 200 kB answer, a tiny
  WebSocket, the HTTP fallback and a `guess:` line). The HTTP fallback shipped in 0.9.92 (above); an own domain is still
  recommended (workers.dev may be filtered).
- **Site:** on reload (same tab, `sessionStorage` `in:<room>`) the name step is skipped and the intro animation is not
  shown again. ⟳ calls `connection.reconnect()`. If a ping gets no answer for 15 s, `RoomConnection` reconnects (don't
  only look at "silent for long": Chrome throttles background-tab timers to once a minute).
- **First-time path (0.9.91.20, PDF item 1, owner chose "one screen" + "3 tips"):** the join step is one card
  (`room.ts` `renderRoom`): "🍿 Ali seni bekliyor" / "Ali ve 2 kişi…" + "Şu an: <title>" from `GET /api/rooms/:id/info`
  (`count` = people by cid without TVs, `people` = up to 3 names, `playing` = the current item's title or null; names
  are already visible to anyone in the room), the avatar is a button next to the name (`openAvatarDialog`), one
  "Odaya gir". The first time in any room (`localStorage` `tipsSeen`) `ui/first-tips.ts` shows 3 bubbles: 🔗 Davet et
  → the link box (＋ on phones) → 🎙 Sese katıl ("Sonraki" / "Anladım", ✕ / Esc end them; not in the shell / TV).
  Extension install while the "Filme git" card waits: the extension has the `scripting` permission and on
  `onInstalled` (`install`) injects `site-bridge.js` into open site tabs; the site watches `data-swm-extension` and
  redraws the card ("✓ Eklenti kuruldu!"). Store-time follow-up: a one-click store link on that card.
- **Ghost connections:** the server keeps each connection's last message time (`seen`); connections silent for 150 s
  are closed and dropped (`pruneStale`, on join and at most every 20 s). **Reconnects (0.9.84):** `RoomConnection`
  remembers its member id from `welcome` and sends it as `hello.prev`; the server closes that old connection at once
  (`4005 replaced`) if it has the same `cid` — before, the old one stayed in the room (people count went up, a frozen
  camera tile) until the stale check. The room title counts people (name + avatar), not connections.
  **Same member id on reconnect (0.9.91.16, owner: "why does it throw me out of voice and put me back"):** the server
  keeps `memberIds` (id → cid, storage, 24 h, at most 200) and gives `hello.prev` back as the new connection's id when
  the browser id matches and nobody holds it (also after a server restart / deploy, when the old socket is gone).
  The site then keeps voice as it is (`P2pVoice.resume()`: only re-announces mic / camera; no leave + rejoin), and
  `P2pVoice.sync` waits before closing a vanished person's connection (15 s if they left the list, 2.5 s if they are
  still in the room without voice). Voice-join sounds skip people who come back within 30 s. The film page (ExtVoice)
  still rebuilds. Tests: e2e `handover.mjs`, `voice/run.mjs` (the same camera track survives ⟳).
- **Avatars (`protocol.ts` `AVATAR_PAGES`):** 5 pages: themed drawn characters, parody film / series / anime / game
  (game: `speedster`). Animal emojis were removed in 0.9.57 (those who had one get a random themed character). The
  picker always opens on the "Temalı" tab. Picker tabs are `AVATAR_TABS` (Parody has sub-tabs; site `ui/avatar.ts`).
  A drawn avatar's value is an id (`wizard`); the image is `/avatars/<id>.svg`; where text is needed `avatarText()`
  gives an emoji equivalent. New avatar: `DRAWN_AVATARS` + `AVATAR_PAGES` + `scripts/avatars.mjs` + site i18n
  `avatar.<id>` (a test checks every drawn avatar is on exactly one page). Parodies only hint at a style: no
  series/character names, logos, exact costumes, or real actors' likeness (store and copyright).
- **Intro sound (`intro-sound.ts`):** no file, generated with Web Audio; `createIntro` plays it. Variants A–F (bell,
  marimba, music box, piano, rustle+bell, warm pad); the one playing is `INTRO_VARIANT` (the user chose F). All land on
  the animation beats (0 / 0.72 / 1.1–1.4 s) (site + extension). If the browser blocks audio it gives up within 250 ms
  (late sound feels odd). To listen, `scheduleIntroSound` can render to WAV with an offline context.
- **Player controls (option A, 0.9.91.1, owner's choice on https://claude.ai/artifact/SjcRcwoKd8n93W1cK4c6TC):**
  YouTube and video files keep **their own** player bar (YouTube from `host: https://www.youtube-nocookie.com` since
  0.9.93.14, card 6a, its `iframe_api` loaded only with the first YouTube item, never ahead; the cloud blocks that host,
  so harnesses route it to www.youtube.com with `scripts/harness/via-youtube.cjs`; YouTube `controls: 1, fs: 0, iv_load_policy: 3`: quality,
  caption language, chapters come back; video files `controls`), and so does the film page (the film is never made
  smaller, nothing is hidden). In the window our buttons are the toolbar under the video. In fullscreen our buttons are
  a **vertical dock on the right edge** (`#fs-dock`, `.theater.dock-mode`, `ui/fullscreen.ts`; since 0.9.91.7 in the
  window too, `.dock-window`, when the video is ≥ 480×360 and not on an upright phone, its last button opening
  fullscreen): talk (💬 message box,
  😀 emojis — the flat 8-slot bar in a window to the dock's left, 📌 pin) · together (🎙 / 📷 / 🖥️, `#dock-voice`, the
  same quick buttons as the Shorts bar in `ui/voice.ts`; not in voice: 🎙 joins) · watch (speed `#dock-speed-pop`,
  ⏭, exit). Line icons (`ui/icons.ts`), each button named with its shortcut ("Mesaj yaz · Enter"); one window at a
  time, lined up with its button, closed by a click elsewhere or Esc; Enter opens the message box. **The dock comes and goes with
  the player's own bar (0.9.91.7, owner):** `.dock-idle` hides it (opacity 0, and no island on the film page) after
  2.5 s without a mouse move or when the mouse leaves the video; a move on the video (on the film page reported by the
  film frames as `activity` → `poke()`), hovering the dock, an open window of it or a paused video show it. A YouTube
  frame keeps its mouse moves, so there it shows when the mouse comes onto the video and hides 2.5 s later (like
  YouTube's bar at rest). Touch screens keep it at 30 %. Real fullscreen: windows / hints / the person menu added to
  `<body>` move into the fullscreen element while it lasts (`ui/fs-layer.ts`). Messages come down from the top
  right, just left of the dock, in the window and in fullscreen (`ui/toasts.ts`; 0.9.93.4, owner: at the dock's foot
  in fullscreen they covered YouTube's own bar). In the shell the dock and its open window are islands
  (`reportLayout`); our catcher is never an island there (the film player takes the clicks). The camera pill has no 🎙 / 📷 / 🖥️
  any more (0.9.91.7: they are on the dock; the dock's and the Shorts bar's 📷 also shows outside voice and joins with
  the camera on, `joinWithCam`) and automatic camera tiles start left of the dock. **Our own bar** (`#fs-controls` + `#fs-catcher`, the 0.9.90.1 "one remote") is only for players
  it is the remote of (`current.own`), and since 0.9.91.13 only in the Shorts view's window: elsewhere they get the
  dock too (`.own-dock`: ⏯ `#dock-play`, volume `#dock-vol`, our catcher stays for click / wheel): only the sync test
  since 0.9.91.18 (Shorts use YouTube's own bar, `controls: 1`: YouTube's rules forbid anything of ours in front of
  its player, owner: "in Shorts too, its player; our menu is at the bottom"); there click = play/pause, double click =
  fullscreen, volume is local (`opt:volume`, `opt:muted`). Every YouTube player is reused for the next YouTube video. The extension can still hide known film players' bars (embed
  `{action:'skin'}`, `KNOWN_PLAYER_CONTROLS`) and set the film's volume (`{action:'volume'}`), but the site no longer
  asks for it (the 0.9.90.3 "⚙ Filmin ayarları" and the "Tam ekranda video" setting are gone). Tests:
  `scripts/harness/embed/run.mjs` (film page: their bar stays, film fills the screen, dock islands, messages by the
  dock).
- **Phones (0.9.91.2, owner: "the phone experience should be great, and easy to grow into a store app"):** phone-only
  CSS lives in `apps/web/src/phone.css` (after `styles.css`), device facts in `apps/web/src/device.ts` (`isTouch`,
  `isIOS`, `isStandalone`, `isApp`, `canElementFullscreen`, `canShareSheet`, `lockLandscape`, `onTurn`; `<html>`
  classes `is-touch` / `is-ios` / `is-standalone` / `is-app`; `isPhone()` = touch + ≤ 700 px wide or ≤ 500 px tall, not
  tablets): ask there, never sniff in feature code. **Themes on phones (0.9.91.7, owner):** only the plain ones
  (gece / okyanus / gunbatimi / neon) are offered; a saved scene theme shows as Gece there and stays saved
  (`themes.ts` `shown`, `offered`). Store-app path
  (Google Play TWA, App Store shell, what Apple requires: report / block for user content, push, universal links):
  `docs/internal/apps.md`. At ≤ 700 px
  wide every popover (profile, share, speed, games, emoji tray, person menu, Shorts feed, theme) is a **bottom sheet**
  (`position: fixed` at the bottom, full width, handle, `!important` over JS positions). An upright phone (≤ 700 px,
  portrait, ≥ 540 px tall) gets the **app layout**: body = 100dvh, the page never scrolls, the stage (video +
  toolbar) on top, `.side` takes the rest and scrolls only if voice / cameras need more (the tabs card keeps ≥ 170 px,
  the chat box stays on screen). While something plays (`.room.has-item`) the link box folds into ＋
  (`#add-toggle`, `.room.adding`; closes after adding); toolbar in one row (😀 only, recents in the tray), "Birlikte"
  in one row (faces without names + buttons), card cameras a swipeable row. **Fullscreen:** where there is no
  element fullscreen (iPhone) `ui/fullscreen.ts` uses its own (`fake` + `.pseudo-fs`: the theater is fixed over
  the window, Esc / dock exit leave it); on Android after a real fullscreen a landscape video locks the screen sideways
  (`screen.orientation.lock`, not for Shorts, `landscape` option). Turning a touch phone sideways while a video plays
  opens the pseudo fullscreen and upright closes it if it was opened that way (Settings → Ekranım "Yan çevirince tam
  ekran", `opt:rotateFs`, `.touch-only` row, default on). Held sideways (≤ 500 px tall) the dock is compact. Shorts on
  a phone fit 100dvh (bigger video, send ➤, 🔁 without text). Touch: inputs ≥ 16 px (no iOS zoom), `touch-action:
  manipulation`, push-to-talk hidden, footer ad-block tip hidden; viewport `viewport-fit=cover,
  interactive-widget=resizes-content` + safe-area paddings. Test: `scripts/harness/phone/run.cjs` (iPhone 13 /
  Pixel 7 emulation, 19 checks). **TV version:** see "TV version" below.
- **Phone room as an app screen (0.9.92.3, owner's picks 1A 2B 3A 4B 5A 6B 7A 8A 9A 10A 11A on
  https://claude.ai/artifact/MsCuFRZjQ6EyDAX8YFtEQu; step 1 of 3, `ui/phone-room.ts` + phone.css):** `<html class=
  "phone">` = `isPhoneLayout()` (≤ 700 px wide, or touch ≤ 500 px tall; `device.ts`, live). `ph-room` = phone + room,
  not the Shorts view / TV (set by `createPhoneRoom`, not in the shell). The desktop DOM stays: `.stage`, `.side`,
  `.together-card`, `.tabs-card` are `display: contents`, so the column is the theater (edge to edge, `order` 1) → the
  faces strip `.together-strip` (`#voice-people` + `#strip-voice` quick 🎙 / 📷 / 🖥️ (voice.ts quick id `strip`; 🖥️ only
  while someone streams) + `#strip-more` ⋯ with the connection dot from `.room-title-dot`) → the chat panel → the chat
  form with `#chat-react` 😀 (presses `.toolbar .react-open`) and `#chat-plus` ＋. No top bar / footer / tabs / now-playing
  / together card rows / camera tiles on a phone. The toolbar is `position: fixed` 0-high and `visibility: hidden`; its
  windows (tray, games, speed) stay visible as bottom sheets (`html.phone` sheet rules). Our sheets (`.ph-sheet`, one
  at a time, grip / ✕ / backdrop / Esc / pull down / the back button via a `history` entry): ＋ (Add a video, game,
  image (`#chat-attach`), and with a video pin, speed, sync, next, fullscreen; sync test when empty), ⋯ More (room
  line, invite, queue, people, games, recap, film time = settings `schedule`, profile, settings, language), Add a
  video (borrows `#media-form` + its search results, `#media-done` and the queue panel; "Play now" closes it) and
  People (borrows the people panel). Borrowed nodes go back on close. Cameras: `setCams` (room's `onCams`) puts a
  `<video class="face-cam">` into the face (`.voice-face.has-cam`, re-placed after each redraw); the person menu gets
  a big `.person-cam`. Settings is a full page on a phone. Sideways out of fullscreen: video left, strip + chat right.
  `first-tips` anchors fall back to ⋯ / ＋ / strip 🎙. **0.9.92.6 (owner's phone feedback):** cameras are a row
  `.ph-cams` under the strip (tile = video + name, tap = that person's sheet with `.person-cam`); faces never show a
  camera (the Shorts seats still do) and the computer's camera windows / pill are hidden on phones. "Sideways" is
  `device.ts` `isSideways` / `onTurn` / `<html class="sideways">`, worked out only when the page's width changes (the
  keyboard only changes the height and used to open fullscreen); phone.css uses `html.sideways`, never
  `(orientation: landscape)`. `#strip-fs` ⛶ (while something plays) presses `#fullscreen`: the browser's fullscreen +
  landscape lock; `#dock-full` upgrades the turned-sideways pseudo fullscreen to the real one (Android, a tap is
  needed). Sideways in fullscreen `#dock-chat` toggles `.ph-fs-side` (borrows the strip, `.ph-cams`, the chat panel and
  `#chat-form` into the theater; `.ph-side-open` moves the player and the dock left). The Shorts chat sheet is 56dvh.
  **Step 2 (0.9.92.4):** Shorts on a phone = `ph-shorts` (phone +
  Shorts view): no top bar, the video takes the screen (`width: min(100%, (100dvh − 60px − safe areas) × 9/16)`), one
  slim `.ph-shorts-bar` under it: `.ph-faces` (the `#seats-l` / `#seats-r` nodes moved in, put back when it ends),
  `.ph-toast` (someone else's newest chat line for 4 s, tap = chat), 💬 `#ph-shorts-chat` (chat sheet borrowing the chat
  panel), 😀 (presses the Shorts bar's tray), ▲ ▼ with the queue count, ⋯ `#ph-shorts-more` (mic, camera, ＋ add,
  ♾ feed, 🎮, 🔁, invite, settings, ↩ room view). The desktop `#shorts-bar` stays hidden (fixed, 0 high); its windows
  are bottom sheets. `.ph-pop-backdrop` sits behind the room's own small windows (tray, add, feed, games, speed): a tap
  on a YouTube frame never reaches the page, so the backdrop is what "outside" means; the Shorts add window also closes
  on an outside press / Esc. Sideways the bar is a column right of the video; swipes start on the bar. **Sideways
  fullscreen (4B):** on a phone in landscape the dock is a slim column (52 px + safe area) beside the video, never on it
  (`.player` / `.fs-catcher` end at its edge, so the player's own bar stays free), always visible, only 💬 😀 🎙 📷 and
  exit (🖥️ only while someone streams: `data-idle` on `#dock-live`); its windows open left of it (`overflow: visible`).
  **Step 3 (0.9.92.5):** games (10A): on a phone `games/stage.ts` always uses `full` and sets `html.ph-game` (not in
  the Shorts view); phone.css shrinks the theater itself (CSS only, the player is never reloaded) to a 92×52 preview
  at the left of the game's head; `::after` over it catches the tap, `phone-room.ts` turns it into the head's
  `.game-minimize`; the strip's `#strip-voice` moves into the head while `ph-game` (only 🎙 shows there) and back
  after; a minimized table shows `#strip-game` 🎮 with a dot in the faces strip (mirrors `#game-btn.game-waiting`,
  presses it); the place switch is hidden on phones. Home (11A, `html.in-home`, `home.ts`): the page fits the
  screen: pill, title, big "Create room", the save box, "Join with a code" as a second big button, the saved rooms,
  `#home-how` "How does it work?" (`home-intro-open` shows the preview, themes, steps, doors, features and the
  footer); the link box is hidden (videos are added in the room). Speed: no `backdrop-filter` and no drifting
  `body::before` on `html.phone`; the YouTube API is not preloaded on a phone (loads with the first video);
  `ui/recap.ts` is a lazy chunk. **0.9.93.6 (card "Phone: next speed steps"):** more lazy chunks: the TV room and
  phone remote with `tv.css` (`loadTv()` before the room starts, only with the lab switch; the pairing record moved to
  `tv-lab.ts` so the room no longer loads `tv.ts` + the QR encoder), the invite window (`openInvite`; the option is
  `ui/invite-option.ts`), the first-time tips and `sticker-file` (emoji / chat image preparation). The room page went
  from JS 142.1 → 134.5 kB and CSS 35.7 → 34.0 kB gzipped. `scripts/size-budget.mjs` (CI, after the build) fails when
  the room page's static JS / CSS pass their budgets (140 / 37 kB); `scripts/harness/phone-speed/run.cjs` opens the
  built site as a Pixel 7 with a 4× slower CPU and a 4G-like network (home, join card, in the room: medians 556 / 478 /
  369 ms in the cloud container; budget 1500 each). Voice, live and camera windows stay in the room chunk (tightly
  tied to it); a phone-only stylesheet was not worth it (most rules are shared). Test: `scripts/harness/phone/run.cjs` (71 checks).
- **TV version (owner chose A + C, 30 Oct 2026; 0.9.91.4, 0.9.91.5, 0.9.91.14, `docs/internal/tv-design.md`):** the TV
  shows the room, the paired phone is its remote. **Hidden since 0.9.91.14** (owner: slow on his TV's browser; the
  real version comes after 1.0 with Google Cast, ROADMAP Phase 2): the TV button and `/tv`, `/tv/<code>`, `/tv-test`
  work only on a device with the lab switch (`tv-lab.ts`, open any page with `?tvlab=1`, `?tvlab=0` turns it off;
  without it those pages fall back to home); the code, server pairing and tests stay. 0.9.91.14 also: the TV uses the
  calm engine profile (`SyncEngine` `relaxed`: drift jump at 2.5 s, 10 s cooldown, no ±5 % nudging, never reports
  stalls so it never makes the room wait; `syncStats()` feeds the TV's sync status line), and the TV button shows
  only on touch devices, opening a 3-step explainer with the code box. **Pairing:** `/tv` (`tv.ts`) picks a random 6-digit code (`TV_CODE`), shows
  it big + a QR (`packages/shared/src/qr.ts`, in-house encoder, byte mode, level M, versions 1–6) of
  `/tv/<code>`, and waits on `/api/tv/<code>/ws` (Durable Object `TvLink`, binding `TVLINKS`, migration `v5`, nothing
  stored, 10 min then a new code; a second TV with the same code gets `taken`). A phone in the room sends
  `{t:'tv-link', code}` ("📺 TV" button in the top bar → dialog, or `/tv/<code>` from the QR → pick a room →
  `sessionStorage` `tvPair` → sent after `welcome`); the room makes a link token (`TV_TOKEN`, storage `tvTokens`:
  person key + name + avatar, 12 h after last use, at most 50) and posts it to the `TvLink`, which hands
  `{t:'paired', room, token}` to the TV (`localStorage` `tvLink`) → `/r/<room>?tv=1`. The Worker passes the room its
  own id (`X-SWM-Room`). **The TV is the same person:** `hello.tv` = token → the server gives the connection the
  person's cid (never sent), name and avatar, `Member.tv = true` (host rights, kicks, counted once; a rename on the
  phone renames the TV; `tv_token` error → back to `/tv`). Phone ⇄ TV: `{t:'tv', op}` (`TV_OPS`: unlink, chat,
  volume, voice, play, state) relayed only between the person's TV and their other connections; the server sends the
  phone `present` true / false and `linked`. **TV mode** (`ui/tv-room.ts`, `tv.css`, `html.tv-mode`): the theater is
  pinned in the room's own fullscreen (`fullscreen.pin()`), top bar / side / dock / our bar hidden; faces at the top
  (people, not connections; green ring in voice, breathing ring while speaking via `voice.speakers()`), messages big
  at the bottom right (`tv-no-chat` hides them), a note when nothing plays or a film page (can't play on a TV). Keys
  in the capture phase (the room's own shortcuts never see them): OK = bar (⏯, 😀, 💬 on/off, 🔊 100/70/40/0 %, 🎧
  listen on/off, 🚪), ▲ = emojis, ←/→ move, Back (Escape, GoBack, key codes 4/8/27/461/10009 or `popstate`) closes /
  asks "leave?", media play/pause keys toggle. The first key press starts voice audio (autoplay). The TV joins voice
  **listen-only** (`P2pVoice.join(false, true)`: a `recvonly` audio channel, no getUserMedia) while someone other than
  me is in voice; p2p mode only. **Phone remote** (`ui/tv-remote.ts`): card at the top of the side (sticky on
  upright phones) while my TV is present: big push-to-talk (the microphone is off between presses, the phone plays
  no voices: `voice.silence`), leave voice, camera, play/pause, TV messages / volume / listening, "Kulaklık takılı"
  (`tv:earphones`: open mic, voices on the phone), "TV'yi ayır" (`unlink` also drops the tokens); my own player is
  muted (`mutedForTv`). **TV test (0.9.91.4, `tv-test.ts`, `/tv-test`):** connection, YouTube, hearing voice (local
  WebRTC loopback), mic, sound, fullscreen and the remote's key names; nothing stored. Tests: e2e `tv.mjs`, harness
  `scripts/harness/tv/run.cjs` (TV 1920×1080 + iPhone + a friend in voice, 32 checks; needs the built site on a
  server and a local video, e.g. `python3 -m http.server 5300` in a folder with `video.webm`).
- **Sound effects (0.9.90.2, owner's choice on the proposal page https://claude.ai/artifact/SPrx6qse6qiKJGJCynqdfy):**
  no files, generated with Web Audio. `packages/shared/src/sound-policy.ts` (pure, `sound-policy.test.ts`): the
  registry `SOUNDS` (group voice / room / game, level, per-sound `gap`, `softDuringFilm`), families by group (voice +
  room → **A warm pad**, the intro's world; games → **B glass marimba**), `soundGain`, `SoundLimiter` (same sound at
  most once per `gap`, e.g. 3 s for joins = one sound for a burst; at most 4 room/voice sounds per 2 s; game sounds
  only per `gap`), `JoinFilter` (a person = name + avatar; a reload/reconnect within 30 s or a second tab is not a new
  arrival). `packages/shared/src/sounds.ts` `scheduleSound` (the recipes, same F-major notes in both families; works
  with an offline context). Site `apps/web/src/sound.ts` `playSound(id)`: one shared AudioContext created only after
  the person touched the page (`userActivation`), a suspended context gets 300 ms then the sound is dropped (never
  queued), a compressor as limiter, fires `swm-sound` (tests). Settings → Ekranım: "Sesler" (`opt:sounds`, default
  on) + "Ses düzeyi" (`opt:soundVolume`, default 70, a sample plays when the slider is let go); room sounds at half
  volume while the room's video plays (`setFilmPlaying`); "reduce motion" does not mute. Works on the film page as
  the site is the overlay (iframes have `allow="autoplay"`). **Which events** (others' actions unless said): voice
  join / leave (only while I'm in voice), my voice join / leave, my mic on / off (button or M), push-to-talk press /
  release; someone new in the room (not leaving: reloads would be false alarms), a chat message only when it is
  nowhere on my screen (page hidden, or another panel tab open; not in fullscreen / side hidden / Shorts where it shows
  as a toast or bubble), stream start (others) / stop (the one I watch), film time reached, "back to the room?" card,
  game invite; XOX / Connect Four every piece (both sides; the opponent's = "your turn"), win / lose / tie
  (spectators: win); Draw & Guess my turn to draw, my correct guess, someone else's, "close", hint letter, my wrong
  guess (quiet) and others' (very quiet, max one per 2 s), last 5 s ticks; Quiz new question, my answer locked
  (quiet), right / wrong at the reveal, last 3 s ticks while I haven't answered, podium. **No sound** for: camera
  on/off, someone leaving, play / pause / seek, the everyone-ready wait, reactions, pins, kicks, strokes, my own
  messages / stream. New sound: add it to `SOUNDS` + a recipe in `scheduleSound` + the call site. Test:
  `scripts/harness/sound/run.mjs` (Playwright, two browsers, `npm run dev` first).
- **Message position (0.9.90.1; with the dock since 0.9.93.4 they come down from the top right, left of the dock, in
  the window and in fullscreen):** in fullscreen with our own bar (Shorts, sync test) chat messages flow up from the quick message box (`ui/toasts.ts`,
  anchored to `#fs-chat`, above the seek line, left-aligned; newest closest to the box; they don't fade while the box
  is focused). The old draggable "💬 Mesajlar burada" handle and `toastPos` are gone. With the side panel hidden (window)
  they sit at the top right of the video. In the extension's room view messages are in the chat panel.
- **Back from the film to the room:** "🏠 Odaya dön" in the overlay → the tab goes to `/r/ROOM#back` (the site enters
  without asking the name), the overlay goes away. The **popup** (0.9.83) never navigates the film tab: "🏠 Odayı ayrı
  sekmede aç" switches to an open tab of that room or opens `/r/ROOM#back` in a new tab next to the film. Outside a
  film tab (0.9.89), if a room is open in another tab the main button is "🏠 Odama dön" (switches to it) and "Sidelit'i
  aç" is the second button. Test: `scripts/harness/popup/run.cjs` (Playwright, `channel: 'chromium'` loads extensions).
- **Outdated extension notice (0.9.91.13, `ext-update.ts`):** the site compares the bridge's `data-swm-extension` with
  `/extension-version.json` (written by the extension build); older → a dot on the top bar's "Eklenti" link and a
  one-time bubble (`extUpdateSeen`). The extension page explains that ↻ only re-reads the folder it was loaded from.
- **Dead extension bridge (0.9.83):** an extension updated/reloaded while our site tab is open leaves a site-bridge cut
  off from the extension (sendMessage throws). "Filme git" then gets `going ok:false` or no answer within 4 s and the
  card says "reload the page" (`extensionStale`) instead of the misleading "your extension is outdated".
- **Pins:** `{t:'pin', note?}` → the server computes the moment from its own `PlaybackState`, stores the pinner's
  persistent key (`owner`) but never sends it to clients; the full list is broadcast with `{t:'pins'}`, newcomers get
  `welcome.pins`. Remove your own pin (the host: any) with `unpin`; at most 50; reset when the video changes. Site:
  strip under the video (prominent while the mouse is on the video; not shown in fullscreen), 📌 button / P → note box.
  Same on the film page (the UI is the site itself). (The old "reaction strip"/heat was removed entirely.)
- **Custom emojis (stickers):** `{t:'sticker-add', data}` (`data:image/png|gif|webp|jpeg;base64`, at most
  `STICKER_MAX_CHARS`; no SVG). The general message limit is 4 KB (`MAX_MESSAGE_BYTES`); only `sticker-add` may be up to
  `STICKER_MESSAGE_MAX` (real images used to be rejected because of this; e2e now tries a ≈200 KB emoji). Id = first 12
  hex digits of SHA-256 (`stickerId`, both sides compute it). At most 24 per room, the oldest goes when full; storage
  `sticker:<id>` + `stickers` order (SQLite-backed DO; the big emoji is also tried in live e2e). On join, after welcome,
  one `{t:'sticker'}` each (1 MB message limit). Reaction: `{t:'react', sticker}`. UI: 🖼️ always visible at the end of
  the emoji bar (site: panel; extension: the strip switches to custom emojis) — don't bury it between pages. File
  preparation in `sticker-file.ts` (images 160 px webp; GIFs keep their frames but lose comment/XMP blocks,
  `stripGifMetadata`). **Room-only (0.9.86, owner's decision after security review 1):** nothing is uploaded on join;
  adding opens a dialog (preview, "added to this room only", unchecked "Koleksiyonuma da kaydet"). My collection:
  `localStorage` `stickerCollection` (max 12, shared with the extension, never uploaded by itself); tray chips
  Emojiler · Bu odada · Koleksiyonum (tap = add that one to this room); an empty "Bu odada" shows a note and never opens the file picker by
  itself (0.9.87), "🖼️ Ekle" is at the bottom of every view. The old auto-uploaded `myStickers` list is
  moved to the collection once (`stickerNote` one-time note). The server sends `mine: true` only to the uploader
  (✕ works after a reload); the host can remove all with `{t:'sticker-clear'}` (Settings → Oda kuralları). Limits:
  `stickerLimit` per IP hash + at most 60 uploads per room and day (`stickerDay`).
- **Reaction display:** rises from a random spot at the bottom of the video and fades (3 s; small avatar + name below);
  each press flies separately (no "×2"), no default cooldown. The host sets a per-person gap with
  `settings.reactionGap` (0/1/3/5/10 s, `REACTION_GAPS`) (the server enforces it via `lastReaction`, the client dims
  the buttons); server limit `RateLimiter(12, 5)` per person (`keyOf`, browser); `react` and `home` do not consume the
  general `commandLimit` (an emoji storm must not lock play/pause). Client: no key-repeat, at least 150 ms between two
  emojis. In the shell islands are merged without overlap with `mergeRects` (the clip path uses even-odd: two
  overlapping islands cancelled each other and showed emojis half/faded). Users can turn them off: Settings →
  "Emojiler videonun üstünde uçuşsun" (`opt:reactions`). In the shell each flying emoji's path is an island.
- **Hint bubbles (`ui/hint.ts` `flashHint`, 0.9.87):** close by themselves, on any click elsewhere, Esc or scroll;
  pressing the same button again closes it (the IP "Neden?" bubble is 7 s).
- **No sync when alone:** on the site "Herkesi bana eşitle" and the sync test are dimmed; pressing shows a "you are
  alone" bubble (`isAlone`, `ui/hint.ts` `flashHint`); on the server there is no "everyone ready" wait when fewer than
  2 distinct cids are present.
- **Voice chat (`packages/shared/src/voice.ts`, `voice-p2p.ts`, site `ui/voice.ts`, plan `docs/internal/ses-goruntu.md`):**
  "🎙 Sese katıl" in the "Birlikte" card; after joining 🎙/🔇 and "Ayrıl"; the card shows avatars of people in the room
  (those in voice have a green ring, the speaker glows, `getSynchronizationSources`), 🎙/🔇 in the people list. Those
  who didn't join hear nobody. Member field `voice: {mic, track?}` (no version bump); `{t:'voice', on, mic}`. Transport
  is `welcome.voiceMode`: **p2p** (default, no card/account): each person has a separate WebRTC connection with
  everyone in voice (the smaller id makes the offer), the server relays `{t:'signal'}` only if both sides are in voice
  (IPs are only visible to people in voice), at most `VOICE_MAX_P2P` (6), STUN Cloudflare only (every STUN server
  sees each user's IP). **IP notice (0.9.86, `ui/ip-notice.ts`):** before joining voice in p2p mode (lists who is in
  voice), starting a stream or watching one, a dialog says the others can see your IP; "Bunu bir daha gösterme" per
  action (`opt:ipNotice:voice|stream|watch`); "🔒 Seste olanlar IP adresini görebilir · Neden?" under the voice row.
  Hiding IPs (TURN relay / SFU for voice + camera + streams) is a Phase 2 goal, needs the card. **sfu**: if the
  Worker has `REALTIME_APP_ID`/`REALTIME_APP_SECRET`, Cloudflare Realtime (`apps/server/src/realtime.ts`, `{t:'rtc'}`
  requests, session on the server, `VOICE_MAX` 10). Cloudflare requires a card and has no spending cap, so p2p for now
  (user's decision, Oct 2026). `VOICE=off` turns everything off. **In the shell (0.9.60)** voice runs in the
  extension's offscreen document (`offscreen.ts`, permission `offscreen`): the site relays `{type:'voice', msg}` with
  `ExtVoice` (`ui/voice-ext.ts`) (sends signal/rtc/"in voice" through its own connection), offscreen runs
  `P2pVoice`/`VoiceClient`, plays audio and sends levels (`LevelMeter`, `levels` + `me`). Without permission the
  background opens `mic.html` (offscreen can't ask; asked from the overlay the permission would go to the film site)
  as a small popup window over the film's window that asks at once and closes itself (0.9.91.7; a tab before); when the film page reloads the new site sends `hello` →
  `reset` (the mic stays). **Mic and camera survive reconnects (0.9.84):** `join(mic)` starts with the person's last
  choice (the track is disabled before anyone hears it); site reconnect keeps mic and camera, a page reload uses
  `voiceMic:<room>`; it used to come back with the microphone **on** (friends' "random mic"). A silent rejoin is
  skipped when another tab of mine (same name + avatar) is already in voice; my other tab's audio is muted and its
  camera never shown as someone else; if a person appears twice only their newest connection gets a tile. Lost
  peer connections (`failed`, or `disconnected` > 5 s) are closed and the offerer calls again after 2 / 5 / 10 s;
  only then "couldn't connect" is shown. ExtVoice does not leave on `pagehide`; the background sends `end` when the tab closes / goes
  back to the room. Being in voice is remembered with `voice:<room>`: moving between site and film rejoins silently if
  permission exists. While someone really speaks the film's volume is lowered (embed `duck`, ×0.35; untouched if the
  person changed the volume): **off by default since 0.9.83** (`opt:duck2`; the old `opt:duck` key defaulted to on),
  and only real speech counts — `SpeechDetector` (`packages/shared/src/speech-detector.ts`, levels every 100 ms, ≥4 loud
  samples in 800 ms, 1.2 s hold) ignores clicks and knocks. Old extensions don't send `caps` → the card is hidden in the shell. Tests:
  `scripts/e2e/voice.mjs`, real audio `scripts/harness/voice/run.mjs` (two Chromes, fake mic, measures incoming audio
  energy) and `voice/shell.mjs` (on the film page). **Both need `VOICE_A`/`VOICE_B`** (two different wavs): with the
  same fake beep the echo canceller removes it and the "really hears" checks fail.
- **PlayWithMe (in-room games; since 0.9.75 there is NO separate game page/room, user's decision):** 🎮 (`#game-btn`)
  in the toolbar under the video → menu (XOX, Dört Taş/Connect Four, Çiz-Bil/Draw & Guess, Bilgi yarışması/Quiz) →
  `{t:'game', kind}`. A room holds one game at a time (`RoomGame {kind, id, by, at}`, storage `game` + opener's
  persistent key; `welcome.game`, on change `{t:'game', game, by?}`); only the opener or the host changes/ends it
  (`{t:'game', end:true}`), others get `game_busy`. The game id is a fresh `newId()` from the room; the game itself
  runs in the objects below. Site `games/stage.ts`: the game opens in the video's place as a "game stage"
  (`#game-stage`, child of `.player-wrap`: an island in the shell automatically; at ≤860 px moved to body and
  fullscreen `.full`); opens immediately for the opener, others get an "Ali opened XOX · Join / Later" card
  (`#game-invite`), "▶ Videoya dön" minimizes it (connection stays open, a blinking dot on 🎮), a grey chat line.
  Game pages are mountable pieces: `mountMatch` / `mountDraw` / `mountQuiz` (the returned function closes the
  connection and timers; name/avatar/cid come from the room). In Shorts, while a game is open, arrows/wheel don't
  change the video. In a room empty for more than 1 min the game closes (`freezeIfLongEmpty`). Old `/oyun…` URLs fall
  back to the home page. Test: `scripts/e2e/roomgame.mjs`.
  Game engines: kind `xox` | `four` (`games/match.ts`). Two-player board games share a shape (`games/board.ts`
  `BoardState`, rules `GAME_RULES`: `xox.ts`, `four.ts`: 7×6, pieces drop into a column, four in a row wins;
  `move.cell` is the column in Connect Four). The first arrival sets the kind; another kind cannot join that code
  (`kind`). Version 2: state `{t:'state', kind, game}` (old saved `xox` field is still read). Separate Durable Object
  `Game` on the server (`apps/server/src/game.ts`, binding `GAMES`, migration `v2`), `/api/games/:id/ws`, its own
  protocol (`packages/shared/src/games/`: `protocol.ts` validation + `GAME_PROTOCOL_VERSION`, `xox.ts` rules). The
  first two people sit as X/O (seat tied to persistent `cid`: a reload keeps the seat), others watch; if the owner is
  not connected a spectator can `sit`; the server validates moves, keeps score, `rematch` swaps who starts. No chat,
  only fixed emojis (`GAME_EMOJIS`). An empty game is deleted after 24 h. New board game: `GAME_KINDS` + `GAME_RULES`
  + rules file + board drawing in `match.ts` + `ROOM_GAME_KINDS` (`protocol.ts`) + `stage.ts` (icon, which piece
  mounts) + i18n `games.<kind>.title/text`. Test: `scripts/e2e/xox.mjs` (XOX + Connect Four).
  **Draw & Guess (0.9.72):** separate object `Draw` (`apps/server/src/draw.ts`, binding `DRAWS`, migration `v3`,
  `/api/draw/:id/ws`), protocol and pure rules in `packages/shared/src/games/draw.ts` (guess matching: lower case +
  Turkish letters optional, 1 letter off = "close"; hint letters at 40/60/80% of the round; 50–150 points, the drawer
  gets 25 per correct guesser), words `draw-words.ts` (TR/EN, room language from the first arrival). 2–8 players
  (persistent `cid`), round: lobby → choose (15 s, words only to the drawer) → draw (80 s) → reveal (6 s) → next.
  Timers via storage alarm, and since 0.9.93.2 any message (the page pings every 15 s, and once the time is up) moves
  an overdue phase on (`overdue` / `advance`; Quiz the same): live alarms ran > 25 s late right after a deploy. The drawing only in memory (1000×750 grid, 50 ms chunks, latecomers get `strokes`).
  Guessers/drawer chat privately with `secret`. Piece `games/draw.ts`. Test: `scripts/e2e/draw.mjs`.
  **Quiz (0.9.74):** object `Quiz` (`apps/server/src/quiz.ts`, binding `QUIZZES`, migration `v4`, `/api/quiz/:id/ws`),
  `packages/shared/src/games/quiz.ts` + `quiz-questions.ts` (general knowledge, TR/EN, no film/series names; options
  shuffled every game). 2–8 players, 10 questions × 15 s, correct = 100–200 points (faster = more), reveal when everyone
  answered or time is up (4 s: correct option + who chose what), podium at the end; the correct option is not sent
  before the reveal. Piece `games/quiz.ts`. Test: `scripts/e2e/quiz.mjs`. Plan for more games:
  `docs/internal/oyun-fikirleri.md`.
- **Browser blocks direct connections (0.9.91.17, `packages/shared/src/ice-watch.ts`):** with Chromium's WebRTC policy
  "Disable non-proxied UDP" (Brave / Vivaldi setting, uBlock Origin's WebRTC option, Opera's VPN) no ICE candidate is
  gathered and a connection stays "new" forever (never "failed"). `watchIceBlocked` on every voice and stream peer
  connection reports "gathering complete with zero candidates" → `onBlocked` → once per page a 15 s hint
  (`voice.blocked`) with the fix per browser; on the film page offscreen sends `{op:'blocked'}`. Test:
  `scripts/harness/voice/blocked.mjs` (Playwright's Chromium: the full Chrome binary ignores
  `--force-webrtc-ip-handling-policy`; `POLICY=default` is the control run). Browser research: `browser-support.md`.
- **Video chat (0.9.63, peer-to-peer only, on the site):** 📷 in voice → `P2pVoice.setCam` (320×240, 15 fps,
  ≤280 kbit/s; the video channel is always created with the connection, turning the camera on/off only does
  `replaceTrack`, no renegotiation; old versions' audio-only offers have no video). Member `voice.cam` (no version
  bump), `{t:'voice', on, mic, cam}`; no video on the Cloudflare path. Site: tiles (`#voice-cams`, my own preview
  mirrored); **0.9.81 free windows** (`ui/cam-float.ts`, user's request): the same tile set lives in the card
  ("⧉ Serbest bırak"), in a floating window on the page (drag anywhere, resize from the bottom-right corner, "−"
  minimizes, "⤓" puts it back in the card, double-click resets position; `localStorage` `opt:camFloat`,
  `camFloat:spot` as a ratio) or automatically inside `.player-wrap` in fullscreen (separate spot `camFloat:fsSpot`).
  Videos are replayed after moving. **0.9.85 (Meet/Discord-style, owner's request):** in the floating window and in
  fullscreen, round 🎙 / 📷 buttons under the tiles (`.cam-controls`; they press the card's own buttons; red = off); the
  window resizes in both directions (`Spot.h`, `.sized`: tiles fill it); **M** toggles my mic on the site. Clicking a
  face in the "Birlikte" card or a camera tile (a still click, not a drag: `onTileClick`) opens the **person menu**
  (`.person-pop`, an island in the shell; on myself (0.9.88): mic / camera on-off, leave or join voice, "change my name and
  avatar"): volume for me 0–100 % and "mute for me" (`localStorage` `voiceSound`, by
  person = name + avatar; in the shell sent to offscreen as `{op:'volume'}`, old extensions ignore it), "📌 show
  their camera big" (`.cam-tile.pinned`, first and full width; this tab only), "🙈 hide myself" on my own tile
  (`opt:hideSelfCam`, others still see me), and for the host "🚪 remove from the room" (same kick + confirm as the
  people list). In the shell the floating window is `data-island` (visible over the hole); while
  dragging, the `swm-layout` event updates the island immediately. The old `#cam-dock` is gone.
  **0.9.90.5 camera layout 2 "free tiles" (owner's choice, proposal https://claude.ai/artifact/UPW29vM3kkGvWKD9hkBTrm):**
  floating / fullscreen cameras default to `opt:camLayout` = `free`: the box (`.voice-cams.free`) covers the page or
  the video and lets clicks through; every tile is its own window (drag, corner `.cam-tile-resize` both ways, double
  click = back in line, touched tile comes to the front); places per person (`tile.dataset.person` = name|avatar) in
  `camTiles:spot` / `camTiles:fsSpot` (at most 30, no x/y = attached: since 0.9.91.7 the automatic column hangs under
  the pill (above it when the pill is in the lower half) and follows it while the pill is dragged). A
  pill (`.cam-pill`, own spot `camPill:spot` / `camPill:fsSpot`) holds 📷 N, "👁 N" (hidden cameras), ⊞ line up (keeps
  widths), ↺ reset, ▣ / ⊡ switch to the old single window (`group`), −, ⤓ and the 🎙 / 📷 buttons. In the shell the box
  is not an island, each tile and the pill are (`room.ts` `reportLayout` reads `.free` children inside the hole). Person
  menu: in the free layout size presets (small / medium / large, `camWindow.setSize`) instead of "show big"; "show
  big" now also works on myself; "🙈 hide their camera (for me only)" (`localStorage` `camHidden`, back via the menu or
  "👁 N"). A person whose connection drops keeps their tile for 12 s with "📶 yeniden bağlanıyor" (`ghosts` in
  `ui/voice.ts`; only when the member left the room, not on camera off / leaving voice). In fullscreen, idle controls
  make tiles 85 % and the pill 30 % opaque. Tests: `voice/run.mjs` (53 checks), `voice/shell.mjs`.
  **0.9.90.8 (owner's feedback):** while I'm in voice the floating / fullscreen box stays even with no camera tile
  (`camWindow.update(n, hidden, inVoice)`: the pill with 🎙 / 📷 stays; in the card an empty box still goes away); the
  pill grows / shrinks from its corner (`.cam-pill-resize`, `transform: scale` 0.7–1.8, `camPill:scale`, ↺ resets it);
  a 🖥️ button in the pill presses the stream card's own buttons (share my screen / ⏹ stop mine / ▶ watch someone's).
  **0.9.93.3 (owner):** the one window is at least wide enough for its cameras side by side (`ROW_TILE_W` 150 px each,
  up to three, at most `ROW_MAX_SHARE` half of its container) and the fullscreen default is 26 % wide (it was 15 %:
  in fullscreen the cameras stacked in a narrow column). Test: `scripts/harness/cam-fs/run.cjs`.
  **0.9.91.16 spotlight:** in the one-window (group) layout a pinned camera fills the left and the others sit in a
  4:3 strip on the right (`.cam-grid.spotlight`, `--cam-others`, set in `cam-float.ts` `markTiles`); the old
  "full width + span 2" pushed the others out of a sized window. The share menu lifts the side panel over the
  floating cameras while it is open (`.side:has(.live-menu:not([hidden]))`).
  **0.9.90.6 pre-join check (`ui/voice-check.ts`):** "Sese katıl" (after the IP notice, not in the shell) opens a
  small window: camera preview (only when "Kameram açık girsin" is ticked), my voice level, mic / camera / speaker
  selects (`enumerateDevices`; speaker only where `setSinkId` exists), "Mikrofonum kapalı girsin", "Kameram açık
  girsin", "Sese katılmadan önce bunu sor". Saved in `opt:micDevice` / `opt:camDevice` / `opt:speakerDevice` /
  `opt:joinMuted` / `opt:joinCam` / `opt:voiceCheck` (`skip`). P2pVoice / VoiceClient get `getMic` / `getCam` that
  open the chosen device (exact id, falls back to the default when it is gone); voices play through `applySpeaker`.
  "🎛 Mikrofon ve kamera seç" on myself opens the same window (settings mode); in voice a new mic switches in place
  (`P2pVoice.switchMic`: `replaceTrack` on every connection, nobody sees me leave), a new camera re-opens it.
  `joinVoice(mic, quiet)` hides that ExtVoice's `join` takes `(quiet, mic)` (calling `join(mic)` on the film page
  turned a muted mic back on after a reconnect, fixed here). Tests: `voice/run.mjs` 58 checks.
  **0.9.91.15 film page devices (owner: "my mic is quiet on the film page"):** device ids are per origin, so picks are
  also saved by label (`opt:micName` / `opt:camName` / `opt:speakerName`, `devicePicks()`; older id-only picks get
  their names once on the site, `rememberDeviceNames`); ExtVoice posts `{op:'pick', devices}` before each join and on
  a change; offscreen opens the device with that label (exact id, default if gone), moves the mic in place
  (`switchMic`) and sets the speaker. "🎛" on myself in the shell asks offscreen for `{op:'devices'}` (labels only) and
  opens `shellDeviceCheck`. `mic.html` asks microphone + camera in one prompt (audio only if that fails), and the
  site's pre-join check asks both at once when both are still unanswered and the camera is wanted. Test:
  `voice/shell.mjs` (🎛 lists the extension's mics, voice survives a switch).
  **On the film page (0.9.65):** cameras run in offscreen (`voice` `cam`; without permission `mic.html?cam=1`);
  incoming streams + my own preview (`me`) reach the site in the overlay through a **local WebRTC bridge**
  (`{op:'loop'}`: offscreen makes the offer, `cams` = mid → member; the bridge restarts on every change; no `data` = no
  camera). Old extensions don't send `caps.cam` → button hidden. My own voice level: a bar under 🎙 (`LevelMeter`
  "me"; in the extension offscreen `me`). At most `CAM_MAX` (4) cameras at once (server `cam_full`). **Limits always
  visible** (user's request): "Seste 3/6 · 📷 1/4" in the card, yellow at the last slot, red when full; a full button is
  dimmed (`.is-full`) and pressing it explains why (peer-to-peer, upload speed) via `flashHint`. Tests:
  `voice/run.mjs` (camera frames are counted), e2e `voice.mjs` (cam_full).
- **Streaming / screen share (0.9.64, `packages/shared/src/live-p2p.ts`, site `ui/live.ts`, plan + decisions
  `docs/internal/yayin.md`):** bottom part of the "Birlikte" card (`#live-card`): "🖥️ Ekranını paylaş"
  (`getDisplayMedia`, 720p/30, tab audio) / "📹 Kamerayla yayın" (720p); one stream per room (`live_busy`), at most
  `LIVE_MAX_VIEWERS` (4, `live_full`) with "▶ Yayını izle". Member `live: kind`, `watching`; `{t:'live'}`,
  `{t:'live-watch'}`, `{t:'live-signal'}` (the server relays only between the streamer and their viewers;
  `RTC_MESSAGE_MAX` for large offers). One-way: the streamer offers to each viewer (sendonly, ≤2.5 Mbit/s screen,
  `contentHint`), viewers only receive (no permission prompt). When the streamer leaves/stops, viewers are released.
  The picture is in a video corner `#live-window` (⤢ enlarge = covers the video; an island in the shell). No starting a
  stream in the shell, only watching. NO film re-broadcasting (user's decision; no `tabCapture` in the extension).
  Tests: e2e `live.mjs`, real `voice/live.mjs` (camera and screen; headless Chrome needs
  `--auto-select-desktop-capture-source`). **Stage 2 (0.9.66):** screen quality `text` (sharp text: 15 fps, `detail`,
  `maintain-resolution`) / `motion` (smooth: 30 fps, `maintain-framerate`), changeable while streaming
  (`localStorage` `opt:liveQuality`); the host stops a stream with `{t:'live-stop'}` (streamer gets `live_stopped`);
  with `settings.liveHostOnly` others cannot start one, and turning it on ends a running stream.
  **0.9.90.8 (owner):** no separate "📹 Kamerayla yayın" any more (voice already has cameras); the share menu has
  "📷 Kameram da köşede görünsün" (`opt:liveCam`) instead: `ui/live-compose.ts` draws every screen frame with my newest
  camera frame in the bottom-right corner (MediaStreamTrackProcessor → OffscreenCanvas → MediaStreamTrackGenerator, so
  the screen's frames drive it and a background tab doesn't freeze it; hidden where unsupported); quality changes go
  to the real screen track; the browser's "Stop sharing" ends the composed track too. `LiveKind` 'camera' stays in the
  protocol for old clients. Test: `voice/live.mjs` (19 checks).
  **0.9.91.15 free stream window (owner: "free like the cameras", `ui/live-float.ts`):** `#live-window` sits in the
  video (default) or floats on the page (⧉ / ⤓, `opt:livePlace`; not under 700 px); drag anywhere, corner grip resizes
  (16:9 kept), double click resets; places as shares of the container in `liveSpot:video` / `liveSpot:free` /
  `liveSpot:fs`; in fullscreen (real or `.fake-fs`) it always lives inside the video; ⤢ covers the video (a free window
  comes back into it). A free window is `data-island` (shown over the hole on the film page). 🙈 hides my own preview
  (`opt:liveSelfHidden`; viewers still get it), "👁 Yayınımı göster" in the stream card brings it back. Test:
  `voice/live.mjs` (30 checks: drag, pop out, resize, remembered after a reload, inside fullscreen, hide my own).
- **PWA (0.9.70):** `public/manifest.webmanifest` + `icons/` (generated by `make-icons.mjs`: 192, 512, maskable,
  apple-touch) + `public/sw.js`: does NOT cache files (nobody should enter a room with old code), only shows
  `offline.html` when a page load has no internet. Registered at the end of `app.ts`, only in the top window (not in
  the shell); app.ts may load after "load", so `readyState` is checked. If you change the SW, bump the `CACHE` name.
- **"Back to the room" notice:** in the shell, "🏠 Odaya dön" → `{t:'home'}` → the server sends `{t:'home', by}` to
  everyone except the sender (once per 30 s per person, `homeLimit`); people on the film get a "join them?" card over
  the video (`askHome`, 20 s; at most once a minute from the same person).
- **Keyboard:** 1–8 that page's emojis/custom emojis, Enter message, P pin, V push-to-talk (when "Bas-konuş" is chosen
  in voice chat, the mic is on while held; `opt:ptt`; key-up also arrives from the film page: embed `key` `up`) (site
  `reactions.ts` + `room.ts`, fullscreen `fullscreen.ts`). On the film page (shell) keys are captured in the capture
  phase and forwarded to the site, never shown to the film site: players seek with digits (3 = 30%), otherwise
  sending an emoji would seek everyone.
- **Host modes (`settings.hostOnly` / `lockQueue`):** the server answers `not_host` to a non-host's play/pause/seek/
  rate/load/jump (hostOnly) or enqueue/dequeue/move (lockQueue); `next` is open to everyone (auto-advance when the
  video ends). On `not_host` the client returns the player to the room state (site `engine.receive(roomState)`; in the
  extension the background re-sends state + a note). The `settings` message is partial: only present fields change.
- **Voting:** `{t:'vote', id, up}`; voters' persistent keys stay on the server (`voters`; clients only get
  `QueueItem.votes`); the queue is ordered by votes (ties by insertion order). My votes: site `localStorage` `myVotes`.
- **Scheduled start / "Film saati" (`settings.startsAt`, server time):** the single alarm checks this too; when the
  time comes the plan is cleared and a paused video plays as `SYSTEM`. Countdown banner on the site (says when no video
  is picked yet). 0.9.87: Settings → Film saati has quick picks (15 / 30 / 60 min rounded to 5 min, tonight 21:00), a
  card with the planned time + time left, "🔗 Saatli daveti kopyala" (slogan + time + link) and clear.
- **Sync test (`media.kind === 'test'`):** no file; `players/test.ts` draws a 12 s counter on a canvas and behaves like
  a `<video>`. While playing, a "you're in the same spot (≈N ms apart)" badge.
- **Saved rooms (`saved-rooms.ts`):** "Oda oluştur" on the home page → one-time / saved (name required; the name is
  carried to the room via `sessionStorage` `create:<room>`, the first person in, as host, sends `settings {saved,
  name}`). The list lives in the browser (at most 20); anyone entering a saved room gets it in their list
  automatically (unless they removed it: `savedDismissed`). Each row shows how many people are inside:
  `GET /api/rooms/:id/info`. The host's ✕ also removes the room's saved status: `POST /api/rooms/:id/unsave {cid}`
  (host cid only). "My room" and recent rooms were removed.
- **Today's recap (`packages/shared/src/recap.ts`, site `ui/recap.ts`, in the Profile menu):** the server's
  `StatsTracker` counts play time (`statsTick` before the room state changes; not while the room is empty), rate,
  videos, per-person messages/reactions/pins/pauses/seeks and the busiest moment (storage `stats`; people by cid,
  recaps only carry name/avatar). Session: the first action more than `SESSION_GAP_MS` (4 h) after the last starts a
  new session and unsaved counters are cleared (watching past midnight stays one session). `{t:'recap'}` sends the
  recap from session start to now only to the requester, counters are not reset; empty → `recap_empty`. "Kaydet" on
  the last card → `{t:'recap-save'}` (replaces the same session's previous save; 20 in saved rooms, otherwise 5;
  90 days), list broadcast with `{t:'recaps'}`. The client picks random cards each time with `chooseFacts` (more with
  more data, at most 8); first the duration, last the summary + PNG. No stats card at the end of a video.
- **Simpler room (0.9.93.13, card 6, owner's picks C + D):** `ui/room-more.ts` `roomMoreItems` = the room's "⋯ More"
  list (games, film time (host), save, recap, shortcuts (computer), sync test (dimmed while something plays), rules),
  shown by the computer's `#room-more` menu and the phone's ⋯ sheet in the same order; `settingsDialog.open(section,
  solo)` opens one section alone (⚙️ = `view`; since 0.9.93.18, card 6b, `#settings-dialog.solo` is one column, as tall as its
  content: the two-column grid had put it in the hidden list's 210 px column); ⋯ → Games goes through the invisible `#more-game` anchor (games
  `extraButtons`). `.room.fresh` until the first item: on a computer no rail, Share, queue / people tabs or sync-test
  button. Test: `scripts/harness/room-more/run.cjs`.
- **Tabs:** 💬 Chat, 🎵 Queue, 👥 People (equal widths); 👤 Profile is not a tab: the button at the top right (my
  avatar; ⚙️ Settings sits right of it, the only settings entry point since 0.9.87) opens a menu below it (`.profile-pop`; closes on outside click/Esc;
  in the shell the hole closes while it is open). Everyone starts on 💬 Chat; a reload in the same tab keeps the tab
  (`sessionStorage` `tab:<room>`).
- **Room UI 0.9.80 (user chose 1B 2C 3B 4A 5A, design page `oda-arayuzu`):**
  - **Chat bubbles** (`ui/chat.ts`): mine on the right in the accent color (no avatar), others on the left with avatar
    + name; consecutive messages from the same person within 3 min merge (`.cont`); room actions centered between thin
    lines; send arrow (`#chat-send`) inside the box.
  - **⚙️ Settings dialog** (`ui/settings-dialog.ts`, `#settings-dialog`): not a tab; a centered dialog with sections on
    the left: Ekranım (My screen) / Oda kuralları (Room rules) / Odayı kaydet (Save room) / Film saati (Film time; host
    only). Rows are title + short description + toggle (`.set-row`, `input.switch`, `role=switch`). Non-
    hosts don't see the toggles; they see `#rules-summary` (✓/– summary, "X sets the rules"). The dialog is always in
    the page (hidden): selectors for open dialogs are `.dialog-backdrop:not([hidden])` (closes the hole in the shell,
    swallows shortcuts). On phones the sections are horizontal at the top.
  - **Under the video** (`ui/reactions.ts` `.tray-bar`): "😀 Tepki ▴" tray (Ready-made / Mine, 8 slots, ‹ 1/3 ›,
    🖼️ Add; pressing inside doesn't close it, outside/Esc closes) + the three most recent emojis next to it
    (`localStorage` `recentReactions`); on the right labelled buttons 🎮 Game · 📌 Pin · 🔄 Sync · ⏩ 1× (opens
    `#speed-pop`: −, rate list, +) · ⇥ · ⛶; icons only at ≤1180 px. Fullscreen and Shorts bars stay flat (8 slots +
    ▲▼). In the shell, popups opening over the hole (`[data-island]`: tray, speed, game menu) are islands; they have no
    opening animation (measurements shifted).
  - **Top bar** (`html.in-room`): "Bağlı" text, ⟳, 🎨 and TR/EN hidden in the room; the connection is the dot of the
    room name (`.room-title-dot` green/yellow/red, short text next to it when not connected, click reconnects; on
    phones only the dot). Language and ⟳ sit at the top of the profile menu (`.profile-actions`); ⚙️ is its own button
    right of the profile picture (`#settings-open`, 0.9.87).
  - **Together card:** "🎙 Sese katıl" + "🖥️ Paylaş ▾" on the same row (`.together-actions`); the Share menu has screen /
    camera and a limits note; while streaming the row is full width (`.live-card.active`), quality only for my own
    screen stream. People who can't share (shell, phones without screen sharing) don't see this part while idle.
  - Fixes: an empty pin strip takes no space (`.pin-strip.empty` hidden), the "same spot" badge is one line.
- **Who-paused notice (0.9.68):** when someone else plays/pauses/seeks/changes rate, top-left of the video for 2.6 s:
  avatar + "Ali durdurdu" (`#action-notice`, an island inside the hole; not for my own actions or `SYSTEM`); can be
  turned off in Settings (`opt:actionNotice`).
- **Room layout "Cinema Rail" (0.9.76, user's choice; design canvas A):** the top bar shows the room name (saved room:
  its name, otherwise "Oda <code>") + "· N kişi" (`.room-title`) and "🔗 Davet et" (`#invite-btn`: copies the link,
  share sheet on phones; `prompt` if the clipboard is blocked); the right rail (320 px) has the "Birlikte" card
  (`#together`: title + "Seste 2/6 · 📷 0/4", avatars and names of people in the room (at most 8, "+N"; one person's two
  tabs count once), voice buttons (`#voice-card` is now a row inside the card), below it the stream section
  `#live-card`) and the tabs. The old invite card is gone. On phones the room name and "Davet et" text are hidden in
  the top bar (only 🔗), ⟳ hidden while connected. If the room changes, update the `store/src/room.html` copy too.
  **0.9.91 (owner):** on wide screens the right rail ends exactly with the video card (`.side` is 0 tall for the grid
  row and stretches to 100 % of it; the tabs card takes what the Together card leaves) instead of hanging below it.
  Voice / camera / stream buttons use line icons (`ui/icons.ts`, drawn in-house, `setIcon`), red when off.
- **Home page "Showcase" (0.9.77, `home.ts`; since 0.9.93.19, card 15, the preview is `.two-screens`: laptop `.ts-laptop`
  + phone `.ts-phone` with one shared `.ts-bar` animation, `.ts-sync`, `.ts-bubble`s, and `.home-strip` with 3 features
  sits between the hero and the theme picker):** on the left a heading + one-step form (optional video link + "Oda
  oluştur"; the link travels via `sessionStorage` `start:<room>` and opens through the link-box path if the room is
  empty; with "Odayı kaydet" the name goes via `create:<room>`), on the right a room preview drawn in the theme's
  colors (mascot in the corner); below: "Temanı seç" with all themes (`renderThemeStrip(…, {all:true})`, the page
  changes instantly), saved rooms, three steps, three doors (link / extension / in-room games), "Odada neler var". The
  footer shows the site version (`index.html` `.footer-version`, bump on every release). Plain themes
  (gece/okyanus/gunbatimi/neon) have a layered `--art` + a slowly drifting `--aura` behind it (`body::before`; not in
  the shell or with reduced motion).
- **Bigger room on a computer (0.9.92.7, owner: "too much empty space"):** above 860 px wide (not the film page,
  Shorts view, TV or phone) `main` has no 1280 px cap; the room's grid is `minmax(0, max(--stage-w, 560px))` +
  `--side-w` (`clamp(300px, 21vw, 400px)`), centred, where `--stage-w = (100dvh − 252px) × 16 / 9 + 28px`: the video's
  card is as wide as the height allows (1920×1080: 1422 px wide video, was 878). The join card (name + avatar) is
  bigger above 700 px (580 px card, 84 px avatar, 58 px field).
- **One remote (0.9.92.8, owner's picks 2A / 3A / 4A changed on https://claude.ai/artifact/LP8aB9RzKFZh3N6sAkEDvG):**
  on a computer (not the film page, phones or the Shorts view) the toolbar under the video is hidden whenever the
  dock is shown in the window (`.dock-window`); the dock is the only remote: 💬 (only in fullscreen or with the side
  panel hidden), 😀, 📌, 🎮 `#dock-game` (an `extraButtons` of the games stage, its hall opens left of the rail), 🎙 / 📷,
  🖥️ only while someone streams, ⋯ `#dock-more` (`#dock-more-pop`: speed chips, sync, next, side panel, "keep the
  controls open"), ⛶. `#dock-speed` / `#dock-skip` are hidden there. YouTube (`.theater.yt-rail`, set when the player is
  YouTube): the rail is a 58 px column beside the video, never on it: `.player` / `.fs-catcher` end at its edge while
  it shows (a mouse move, hovering it, an open window of it, a paused video, always on touch screens) and fill the
  width when it rests (`.dock-idle`), in the window and in fullscreen. **0.9.93 (owner: "not on every move; open when
  the mouse comes to the right side, close at once when it goes"):** on a computer on the site (not the film page, not
  touch) the dock waits for the edge (`edgeMode`, `.rail-edge-mode`): `setNear` opens it when the mouse is within
  `EDGE_IN` (72 px) inside / `EDGE_OUT` (28 px) outside the video's right edge (document `mousemove`) or on
  `#rail-edge` (a see-through strip over the right edge, clear of YouTube's own top / bottom buttons, only while the
  dock rests: a YouTube frame keeps its mouse moves), and closes it `HIDE_MS` (250 ms) after the mouse leaves (the
  dock, the edge, the video) unless one of its windows is open; a new video shows it for 2.5 s. Since 0.9.93.2 a rail
  window (emojis, ⋯, speed, the games hall; not the message box while it holds text) closes `LEAVE_MS` (450 ms) after
  the mouse leaves the rail, and when the page loses focus to a frame inside the theater (a click on the YouTube video
  never reaches the page), by the same synthetic outside `pointerdown` the windows listen for (`closeRailWindows`); in
  0.9.93 an open window kept the rail out in fullscreen (owner). **0.9.93.5 (owner's screenshot: the rail stayed
  in fullscreen while YouTube's bar had gone):** a rail button keeps the focus after a click, and any key press (Esc
  closing its window, a shortcut) makes it `:focus-visible`, which `railBusy` counted as "busy" for good. Now the rail
  lets go of the focus when the mouse leaves it or its windows close (`letGoOfRail`; not the message box while it holds
  text), and focus only holds it for keyboard users (`tabbing`: a Tab press, cleared by a mouse move / press). **0.9.93.7 (owner: "the rail never goes away in YouTube fullscreen"):** a touch-screen laptop can report its primary
  pointer as coarse; `isTouch()` then made the room treat it as a tablet: no edge mode, and the "rail stays on touch
  screens" CSS plus `dock.contains(activeElement)` in the non-edge `dockBusy` held the rail out for good after any
  pressed rail button (🎙 / 📷 outside voice). Now `device.ts` `hasMouse()` (`(any-pointer: fine) and (any-hover:
  hover)`, `<html class="has-mouse">`) keeps the edge mode and the resting rail wherever a mouse exists (the touch-only
  rules are `html.is-touch:not(.has-mouse)`), a button's focus holds the rail only for keyboard users in every mode, and
  `hoveringControls` is double-checked with `dock.matches(':hover')`. Tests: `yt-room` (a simulated touch-screen
  laptop: fails on 0.9.93.6), `embed/run.mjs` (film page: after a focused rail button the dock still rests). "Keep the controls
  open" (`opt:railPin`, `.rail-pin`; ⋯ `#rail-pin` and Settings → My screen `#opt-railpin`, `RAIL_PIN_EVENT` keeps
  both in step) never lets it rest. "Hide the controls" (`opt:railOff`, `#rail-show`) is gone and no longer read. Since 0.9.93.9 (card 2,
  "one rail everywhere") every docked theater is `side-rail`: video files and the sync test use the same column, the
  empty room gets it too (`rail-bare`, always out, 📌 / ⛶ dimmed) and the film page has no toolbar either: its rail is
  a column beside the film, the hole being `#player` left of it (`reportLayout`). **Card 2b (0.9.93.17, owner's B):** the
  film page's rail opens and closes at the edge too: the resting film leaves a 14 px gutter of our overlay where `#rail-edge`
  hears the mouse, it opens after `OPEN_MS` (140 ms, a mouse passing by doesn't make the film jump) and goes `HIDE_MS`
  (450 ms) after the mouse leaves; the film narrows / widens with the player's `right` transition (`reportLayout` on a
  `#player` ResizeObserver + `transitionend`). The overlay often never hears the mouse leave (it jumps into the film's
  hole), so a move reported by the film's frames (`poke`) counts as leaving (`leftRail`, not within 300 ms of reaching
  the edge), the shell's rest rules ignore a stale `:hover`, and Chrome's replay of the last position after the film
  widens is ignored (`staleXY`). Embed harness: run it under `xvfb-run -a` (headful) for the real mouse; headless pins the
  rail and skips only those checks. 6 / 7 stay as they are (the owner accepts that risk). **0.9.92.9 (5B,
  YouTube only, not the film page / fullscreen notes / Shorts):** (1B, emojis rising from the sender's face, was undone
  in 0.9.93 and is back since 0.9.93.10: card 2a, the owner's D, nothing of ours over the YouTube player by itself;
  the countdown is a note; `#rail-edge` sits in a 14 px gutter beside the resting player; fullscreen on a computer is
  `.theater.yt-fs` with the column `#fs-side` (notes, cameras via `cam-float.ts` `sideColumn()`, newest messages)
  between the player and the rail, only while it has one of them (since 0.9.93.20, card 6d: `.fs-side-open`, a message
  keeps it `SIDE_LINGER_MS` 8 s; elements are looked up by id on the document, the camera box can float on `<body>`); a camera the person drags onto the player stays there.) The room's notes and cards (`#waiting-banner`, `#sync-badge`, `#game-invite`, `.end-card`) move out of
  `.player-wrap` into `.yt-notices` above the chat's message box (`.yt-notices-top` above the video with the side
  panel hidden; `placeNotices`, MutationObservers); fullscreen, video files and film pages keep them on the video.
  "Who paused" (`#action-notice`) is hidden with YouTube outside fullscreen (it is in the chat's activity). Test:
  `scripts/harness/yt-room/run.cjs` (13 checks). **🔍 Search** (`.media-search`, the first submit
  button, so Enter keeps working): words search YouTube, a link goes to the queue, an empty box gets the focus.
  **Phones (0.9.92.8):** turning sideways no longer opens fullscreen by itself (`fullscreen.ts` skips `rotateFs` on
  `isPhoneLayout`); sideways without fullscreen the room shows the video left and `.ph-turn` right (one big ⛶ "Watch
  fullscreen", or "hold the phone upright"; no chat / faces / cameras); a fullscreen opened there closes when the phone
  turns upright. Games live only in ⋯ (not in ＋, no `#strip-game`; a minimized table puts a dot on ⋯). ⋯ → Language
  opens a small sheet (English / Türkçe). The person sheet's small / medium / large size the phone's camera row tile
  (`ui/phone-cams.ts`, `phCamSizes`). **Can't reach the room:** the `.net-hint` card has "⟳ Try again"
  (`connection.reconnect()`) and "Test the connection" → `/baglanti?room=<id>` (same tab), whose first button is
  "← Back to the room" (`/r/<id>#back`) and "⟳ Run it again".
- **Invite window (0.9.93.1, owner: "an invite screen when I enter the room, with a QR code, like other watch sites";
  `ui/invite.ts`):** the room link with Copy, the share sheet (touch devices), WhatsApp (`wa.me/?text=`, the owner's
  slogan "Sana bir koltuk ayırdım 🍿" / "I saved you a seat 🍿"), a QR code (`@swm/shared/qr` `qrSvg`; since 0.9.93.11 its own
  "QR code" tab with "Copy image" (PNG to the clipboard, else a download), the WhatsApp button with WhatsApp's glyph and
  green) and "show this when I'm alone in a room" (`opt:autoInvite`, default on). It opens by itself 1.7 s after
  the first `welcome` when nobody else (TVs aside) is in the room (`maybeAutoInvite`; not after a reload, in the shell
  or on a TV; skipped if someone arrived or another dialog is open); while it is pending `html.invite-pending` holds the
  first-time tips back. 🔗 Invite (and ⋯ → Invite on a phone, which presses it) opens it; the empty room's "Copy invite
  link" still copies at once. Automated browsers (`navigator.webdriver`) only get the automatic window with
  `opt:autoInvite` = '1' (the harnesses would be covered). **0.9.93.2 (owner's picks):** rooms without a saved name
  show a friendly name worked out from the id (`room-id.ts` `friendlyRoomName`, 32 × 32 English words, the same for
  everyone; top bar, tab title, join card, saved-name placeholder); "Continue where you left off" on the home page
  (`home.ts` `renderContinue`; since 0.9.93.12 one thin line above the title, cut with an ellipsis, card 5: `lastRoom` = {id, saved name, at} written on `welcome` and `pagehide` (not on a TV);
  shown for 24 h, or longer while the room is saved; name / who is inside / what plays from `/api/rooms/:id/info`; ✕
  forgets it); the keyboard shortcuts card (`ui/shortcuts.ts`, `?` outside a text box, ⋯ and the profile menu's ⌨️,
  computers only; its rows are the room's real keys). Test: `scripts/harness/room-extras/run.cjs` (24 checks; needs a
  local video on :5300). **Paste / drop a link (0.9.93.1):** Ctrl+V outside a text
  box or a dropped link (`text/uri-list`, no files) goes through the link box's submit (`takeLink`; not in the shell,
  not while a dialog is open). **Unread in the tab title:** chat from others while `document.hidden` → "(n) title",
  cleared on `visibilitychange` (`drawTabTitle`, `baseTitle` from `renderSaved`). Test: `scripts/harness/invite/run.cjs`
  (22 checks).
- **Hide the side panel (0.9.71):** ⇥ in the toolbar under the video (`#side-toggle`): `.room.side-hidden`, the video
  takes the full width, chat messages appear in the video corner as in fullscreen (`toasts`), unread count on the
  button; `localStorage` `opt:sideHidden`; not in the shell or on narrow screens (≤860 px).
- **Chat images and links (0.9.88, owner's feedback):** 🖼️ `#chat-attach` in the chat box, paste or drop → `fileToChatImage`
  (≤1024 px WebP, smaller until it fits `STICKER_MAX_CHARS`; GIFs as they are without metadata) → confirm with preview
  (typed text = caption) → `{t:'chat', text, image}` (text may be empty). The server keeps `chatimg:<id>` (+ order
  `chatImages`; only images of messages still in the 50-message history, at most `MAX_CHAT_IMAGES` 12; per IP
  `imageLimit`, `CHAT_IMAGES_PER_DAY` 100 per room), broadcasts `{t:'chat-image', id, data}` before the message and
  sends the history's images one by one after `welcome`; `ChatMessage.image` is the id (placeholder until the data
  arrives). Click = full-size viewer (`.image-viewer`, a `.dialog-backdrop`). Links: `ui/links.ts` `linkify` (http(s)
  and `www.`, trailing punctuation left out, never HTML) → "Bu sayfadan ayrılıyorsun" confirm → `window.open` in a new
  tab (in the shell `open-ok` first, so the extension doesn't close it as an ad). Test: `scripts/e2e/chatimage.mjs`.
- **Rooms are independent (0.9.88, owner's decision):** my name and avatar are stored per room (`me:<room>`, newest 50
  in `meRooms`; `storage.ts` `roomIdentity` / `saveRoomIdentity`); changing them in a room never changes another room.
  `name`/`avatar` are only the default the join step of a new room offers. Shared between rooms only what the owner
  names (e.g. the custom emoji collection).
- **Room actions in chat:** always written but hidden by default; voice join / leave are room actions too (0.9.88); "Hareketleri göster (N)" at the top right of the
  chat (`localStorage` `opt:chatEvents`). The old setting was removed.
- **Disable emojis (`settings.noReactions`):** host only; the server drops reactions (host included); site
  `.no-reactions`, extension `.no-react` hide the emoji bar.
- **Emoji bar:** 8 fixed slots per page (missing ones stay empty so neighbouring buttons don't move); no "+",
  🖼️ = add GIF/photo; custom emoji pages via ▲▼ (fullscreen and Shorts; under the video it's the tray, see 0.9.80).
- **Rate:** `MAX_RATE` 4 (HTML5), YouTube at most 2 (`YOUTUBE_MAX_RATE`; the site clamps the request, the server lowers
  the rate to 2 when a YouTube video opens).
- **Default language is English** on every device, whatever the browser's language (owner, 2 Nov 2026; 0.9.92.3;
  site `i18n.ts` `detect`, extension `i18n.ts` / `mic.ts`, `offline.js`); a chosen TR / EN is remembered (`lang`).
  The UI harnesses read Turkish labels, so they pick Turkish in a fresh browser (`embed/cdp.mjs`, phone, TV).
- **Avatar choice:** on the site "Avatarı değiştir" → a large centered dialog (`openAvatarDialog`); since 0.9.87 a pick
  is only applied (and seen by others) with "Tamam" or a double-click; ✕ / Esc / outside cancel. In the extension a
  panel covering the whole window. Hover wobbles, the selected one floats (CSS; off with `prefers-reduced-motion`).
- **Avatar lists have no pages:** with many avatars in a tab the grid scrolls (no ‹ ›; the user didn't want them).
- **CI (`.github/workflows/test.yml`):** on every push/PR: typecheck, unit tests, build, local server with `wrangler
  dev` + `npm run e2e`. On push to `main` (or Actions → "Run workflow"), if tests pass, the `deploy` job: build →
  `wrangler deploy` → `scripts/wait-live.mjs` (waits until `/api/version` answers the deployed version id from the
  Worker and a Durable Object 8 times in a row: objects started on the old code restart later and close every
  connection, which made live e2e files fail on the first attempt, e.g. wait.mjs "timeout waiting d") → e2e against
  live (a file passing only on its retry prints a `::warning::`; every e2e file runs with `scripts/e2e/trace.mjs`, which
  logs each socket the server or network closed with its code and time). Keys are in repo Secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`);
  without them the job is skipped with a warning. Private repo: 2000 free minutes/month.
- **Scene top space and sides:** the scene (1600×900) is bottom-aligned and covers the screen; on wide screens the top
  is cropped and also covered by the top bar: don't put decorations above y≈200. Room content is centered, at most
  1280 px; the user mostly looks at it while watching, so main decorations (moon, castle, dragon, caravan) stay at the
  scene's edges (x < 260 or x > 1340). When the theme changes images are preloaded first (applyTheme → preload), color
  and image change together.
- **Video events in the extension:** when the source of the same `<video>` changes (`emptied`) the engine re-attaches
  (so nobody is sent back to the start); when a video shorter than 60 s ends, "next" is not requested (ad/preview).
- **Save the room (`settings.saved`):** host only; an empty room is kept for 30 days (`emptyTtl`). When the video
  changes, the old one's position + pins are written to `history` (`titleKey` → record, at most 30), also when the
  last person leaves; when the same video opens again (>15 s) it starts from there and its pins come back, the `state`
  message carries `resumed`. A video skipped with "Next" counts from the start. Turning saving off deletes `history`.
  Every room: a room that stayed empty for more than 1 min while playing opens paused where the last person left
  (`freezeIfLongEmpty`). Listed under "Kaydedilen odaların" on the home page.
- **Queue:** `settings.autoNext` (on by default); when off, the next item does not start when the video ends and the
  end card shows "▶ Sıradakini başlat" (in the extension `RoomInfo.autoNext`). Voting note in the queue panel.

## Release checklist
Milestone gates to 1.0 (what must be fully done before the third version part moves, and "live e2e green on the
first attempt" for every release): `docs/internal/ROADMAP.md` "Milestone gates to 1.0".
0. **Version numbers (owner's rule, 29 Oct 2026):** releases now count in a fourth part: 0.9.90.1, 0.9.90.2, … so we
   don't run out of numbers before 1.0. The third part (0.9.91, 0.9.92…) moves **only when the owner says** "this one
   is big, go up one". Chrome extensions accept up to four numeric parts; the site footer shows the same number.
1. `npm run typecheck && npm test` (if the server changed: `wrangler dev` + `npm run e2e`; if the extension changed:
   the embed harness, see "Cloud sessions").
2. Bump the site version in the footer (`apps/web/index.html` `.footer-version`). The extension version is kept at
   the same number (the user thought differing numbers meant "outdated"): `apps/extension/package.json` (the zip on
   the site and the extension page read it).
3. Update `README.md` + `README.tr.md` together, `docs/internal/STATUS.md` (and ROADMAP checkboxes); commit (English
   message, `Co-Authored-By` at the end), push.
4. Deploy: when the change lands on `main` (PR merged) GitHub Actions deploys and runs live e2e; check the Actions tab
   is green. Without keys / from local: `npm run deploy` → `npm run e2e -- wss://screen-with-me.swm-server.workers.dev`.

## Cloud sessions (Claude Code on the web)
- The user mostly works from claude.ai/code cloud sessions (new Claude account since 28 Oct 2026; the old account's
  sessions and memory are not available, so everything must be in this file and `docs/internal/`). The repo is
  cloned fresh every session and the container is temporary → commit + push every piece of work. Development happens
  on a `claude/...` branch; it reaches `main` via PR (CI runs there, merge auto-deploys).
  **Opening the PR and merging it once CI is green is Claude's job** (user's request, Oct 2026): when a task is done,
  open a PR (English), wait for the checks, merge if green, verify the deploy run in Actions is green and report.
  The only thing left for the user is updating the extension in their own Chrome.
- No `wrangler login` in the cloud: deploys go through GitHub Actions. Install, typecheck, unit tests, build and
  `wrangler dev` + e2e all work in the cloud. Tested command sequence: `docs/internal/STATUS.md` "Testing in the cloud".
- If the environment's network is restricted, `www.youtube.com` may be blocked: the title test in `room.mjs` hangs
  (not a code bug). The user can allow it in the environment settings (Network access → Allowed domains).
- The user tries the extension in their own Chrome (zip from the site). Real Chromium + extension tests also work in
  the cloud: `CHROME=/opt/pw-browsers/chromium` with `scripts/harness/embed/run.mjs` (as root `cdp.mjs` adds
  `--no-sandbox`); without internet use `FILM_VIDEO=video.webm node scripts/harness/embed/film-server.mjs` (ffmpeg
  `testsrc2` can generate one; make it longer than 10 min for the score).

## License and privacy
- MIT (`LICENSE`, © 2026 Alperen Aktürk). Code shipped to users (site/server/extension) contains no third-party
  package code; if you add a runtime dependency, check its license (MIT/Apache/BSD are fine).
- Privacy policy: `apps/web/public/privacy.html` (TR + EN; `?lang=en|tr` opens it in the link's language, `lang.js`;
  the old `gizlilik.html` redirects there). Update it whenever we collect/store new data. There are no terms of use
  yet (ROADMAP "Legal").

## Known limits
- DRM services (Netflix, Prime Video, Disney+…) are not supported yet; **goal** (research towards 1.0, ship in 1.x with
  per-site adapters): everyone uses their own subscription, we command the site's own player, DRM is never bypassed.
  Plan: `docs/internal/VIZYON.md` "Büyük servisler". A service's name appears in official texts only if it really
  works ("works with …"). If the `<video>` element itself is fullscreen the extension overlay is invisible (it is
  visible when the player container is fullscreen).
- Pre-1.0 assessment, real-world test list and expected launch problems: `docs/internal/VIZYON.md` "v1.0" and
  `docs/internal/ROADMAP.md`. Ideas to take / not take from Teleparty are there too.
- The extension is not in the store yet (unpacked install, `apps/web/public/eklenti.html`). Developer account opened
  (publisher e-mail screenwithme.app@gmail.com, non-trader); application package and form texts are ready
  (`docs/internal/web-store.md`, `npm run store`). **Not submitted yet** (goes with 1.0). After submitting, don't bump
  `PROTOCOL_VERSION` while the review is running.
- The repo is private; never say "open source" in public texts. Plan for opening it (recommended: right after 1.0
  store approval, site names cleaned, a new public repo with clean history): `docs/internal/VIZYON.md`.
- Income only through donations, after 1.0 and the first real users (GitHub Sponsors / Patreon etc.; no PayPal/Stripe
  in Turkey). Never a donation prompt inside a room / over the video. Plan: `docs/internal/VIZYON.md` "Bağış / destek".
- Bans are at the limit of an account-free design: another browser/incognito tab gets around them.
- Growth plan and feature ideas: `docs/internal/BUYUME.md`, `docs/internal/gelecek-fikirler.md`.
- Firefox / Safari: the website works there, the extension does not (no `offscreen`, the shell only accepts a
  `chrome-extension://` parent); plan and effort in `docs/internal/browser-support.md` (after 1.0).
- User testing on Brave/Edge/Opera is pending (`STATUS.md` "Owner's hand tests").
