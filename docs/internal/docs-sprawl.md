# Documentation sprawl: analysis and restructuring plan (read-only)

Source: `origin/main` fetched 8 Nov 2026 (CLAUDE.md "Live: 0.9.97.92"). Nothing in the repo was edited.

## 0. The numbers

| File | Size | Loaded how | Notes |
|---|---|---|---|
| `CLAUDE.md` | **252 KB** (1666 lines) | automatically, every session, every role | one line (L152, the "Live:" paragraph) is **63.8 KB** on its own, 162 version numbers |
| `docs/internal/CARDS.md` | 181 KB (2011 lines, 126 card blocks) | read by every role | ≈ 85 % of its bytes are finished cards |
| `docs/internal/STATUS.md` | 127 KB (1423 lines) | "every session reads this first" | header still says "Last update: 2 Nov 2026 … 0.9.95"; 272 open checkboxes |
| `docs/internal/ROADMAP.md` | 31 KB | read first | title still "ScreenWithMe roadmap", "Current version: 0.9.82" |
| `CHANGELOG.md` | 15 KB | rarely | already holds one block per release from 0.9.97 |
| **Total "read first" set** | **≈ 590 KB** | | ≈ 150 k tokens before a session does any work |

## 1. CLAUDE.md: what is in it

### 1.1 Section sizes

| Section (lines) | KB | Category |
|---|---|---|
| Header (1–18) | 1.2 | rule (rename, things kept on purpose) |
| Language and GitHub conventions (19–51) | 3.3 | rule |
| Working with the user (52–150) | 10.4 | rule (≈ 2 KB of it is a skills catalogue / tool advice that is reference) |
| **Next up (151–167)** | **65.8** | **history** (L152 "Live: 0.9.97.92 … 0.9.90.4") + a stale 0–3 queue |
| Plan in one screen (168–187) | 1.6 | duplicate of ROADMAP (and stale: "we are at 0.9.8x") |
| Structure (188–205) | 1.5 | map (keep) |
| Commands (206–227) | 1.7 | map (keep) |
| **Architecture principles (228–1596)** | **154.6** | ~10 KB real invariants, ~115 KB feature reference, ~30 KB history narration inside the bullets |
| Release checklist (1597–1612) | 1.4 | rule |
| Cloud sessions (1613–1629) | 1.6 | rule + reference |
| License and privacy (1630–1644) | 1.4 | rule |
| Known limits (1645–1666) | 2.0 | reference / product facts |

### 1.2 Estimated split by category

| Category | ≈ KB | ≈ share | What it is |
|---|---|---|---|
| **Rules** (durable working conventions + must-not-break invariants) | **35–38** | 15 % | language rules, roles, PR/merge flow, release checklist, KeePass, focus, no-scroll rule, public-text rule; plus invariants scattered in the architecture bullets (server is the source of truth, every player command through `command()`, validate-and-copy in the protocol, never `innerHTML`, `cleanText` for every typed text, no DO reads an uncapped body, alarms not `setTimeout`, lazy chunks via `loadChunk` never `.then` on `import()`, a room-only CSS rule goes into `room.css`, a new text goes into `i18n.ts` + `i18n-tr.ts`, add a host to the CSP, `PROTOCOL_VERSION` bump rules, "never name a class `side`", "a new game e2e opens its sockets with `GameSocket`", "a new harness goes into the job of its kind") |
| **Feature reference** (how X works, files, constants, tests) | **≈ 115–120** | 47 % | the bulk of "Architecture principles" |
| **History** (versions, who chose what, what it used to be) | **≈ 95** | 38 % | the 64 KB "Live:" line, the "0. ~~…~~ 1. … 3." queue, and ~30 KB of narration inside feature bullets: 173 version tags, 16 quoted owner lines, 6 option-page artifact links, 35 card refs, ~90 "used to / was / is gone / no longer / since 0.9.x" sentences (≈ 14 KB of those sentences alone) |

### 1.3 The "Live:" paragraph is not pure history: it is the only home of many facts

A naive "delete the Live line" would lose reference. These identifiers appear **only** in L152 and nowhere else in
CLAUDE.md (checked by script):

`poker` / Last Heart (no architecture bullet at all), `room.css` (+ the rule "a room-only rule goes into room.css"),
`GameSocket` / `MAX_DROPS` (+ "a new game e2e opens its sockets with GameSocket"), `ghost.ts` / `GHOST_MS` (game-object
ghost closing), `i18n-tr` / `loadLang` (English-only `i18n.ts`, lazy Turkish chunk), the uptime cron (`uptime.ts`,
`monitor.yml`), `CHANGELOG.md` (+ "add a block with every release"), `zoomRange` / `.game-full` / `CLASSICS_SIZES`
min/max, `STATS_SAVE_MS`, `FEED_MAX_ITEMS`, `SEEK_STEP` (← / → seek), `.yt-notices-shorts`, `showPointsResult`,
`tableHowTo`, `resultCard`, `gameHint`, `png-squeeze.mjs`, `check-game-text.mjs`, `clearOfChat` / `largestClear` /
`overYoutube` (game windows vs chat / YouTube), `SIDE_TOP` (fullscreen messages), `markHit` (R4-9), `TV=on` / `tvOn`
(R4-10), `evaluateChess`, `quiesce`, `BOT_THINK_AT_MS`, `aimAt` (Sea Battle phone aim), `setGameLive` (beforeunload),
`placeLamp`, `HYBRID_COLORS`, `receiptFor`, `introOver`, `removedHere`, `swm-joined` (BH5 / R18 order of things),
`sendBans` (BH4), `liveStreak`, `warmThemePreviews`, `camsElsewhere`, `.mt-loading`.

So the migration must **mine** L152 release by release into the area files, then move the remaining narration to
CHANGELOG / archive.

### 1.4 Duplication

| Content | Also in |
|---|---|
| Per-release summaries 0.9.97.52 → .92 (L152) | `CHANGELOG.md` (same releases, user-facing), CARDS.md "Shipped 0.9.97.60 – 0.9.97.85" list, CARDS "Done:" lines, STATUS hand-test headings ("**0.9.97.29 …**") |
| Per-release summaries 0.9.60 → 0.9.92 | STATUS "History (short)" (out of order: 0.9.90.4 before 0.9.90.3, 0.9.86 after 0.9.90) and the STATUS task queue (`- [x] **0.9.83** …`) |
| "Talk Turkish to the owner, English in the repo" | CLAUDE.md ×3 (header rule, "Working with the user", "Rules for all"), STATUS "Working with the owner", CARDS header, ROADMAP "Principles" |
| "Tell the Planner when anything runs out" | CLAUDE.md + CARDS header |
| "Repo is public, never commit secrets, never say open source" | CLAUDE.md ×2 (License, Known limits) + CARDS header |
| Version numbering (fourth part, owner moves the third) | CLAUDE.md Release checklist, ROADMAP intro, STATUS task queue line |
| Roles and board rules | CLAUDE.md "Sessions as an office", CARDS header, `my-awesome-list/is-akislari/ajan-ofisi.md` |
| Plan to 1.0 | CLAUDE.md "Plan in one screen" + ROADMAP §1–7 + STATUS "Current direction" + VIZYON.md |
| "Testing in the cloud" command list | STATUS (verified 28 Oct, "165 unit tests") vs CLAUDE.md Cloud sessions + Commands |
| Feature design rationale | `docs/internal/design/*.md`, `research/*.md`, `security-review-*.md` already hold it; CLAUDE.md repeats picks ("owner's picks 1A 2B 3A …") |
| CI behaviour | CLAUDE.md CI bullet (3.9 KB) vs `.github/workflows/test.yml` comments vs CARDS CI / CI2 / TAG1 cards |

### 1.5 Contradictions and stale statements (current text that is no longer true)

Process / docs:
1. **Owner's tick page:** CLAUDE.md says "the checklist page https://claude.ai/artifact/EtqKiBo8k5vgR422rq14K5";
   CARDS.md header says the "test board Artifact https://claude.ai/artifact/NWZG7GLH4JzAnZt1rNgrJo"; STATUS History
   names EtqK… again; a third thing, the hidden test board page on our site, was added (0.9.97.29) and removed (R24).
2. **Option pages:** CLAUDE.md "Option pages are clickable (owner, 2 Nov)" + Design role "clickable option pages
   (Artifacts) for the owner" vs CARDS (owner, 4 Nov) "no more option pages … questions are asked in the Planner's
   chat … They do not publish Artifacts for the owner." CLAUDE.md was never updated.
3. **Parallel sessions:** ROADMAP Focus "At most 2–3 parallel sessions" vs CLAUDE.md six roles + lanes A, B, B2 +
   Game Studio running at the same time.
4. **Developer:** "one at a time" (then "since 3 Nov two lanes") vs lane B2 / Game Studio also shipping code.
   "Lane B no longer does games" vs Room chunk "(card SZ, lane B)" and Test Lab "(lane B leads)".
5. **Who writes CLAUDE.md:** "Developer owns … the technical notes in this file" — but Game Studio, lane A, B, B2
   all append to it (the cause of the growth and of merge clashes on one 64 KB line).
6. "Next up (saved 29 Oct 2026, after 0.9.91 — continue in this order)": items 0–3 are done or obsolete (endless
   feed shipped 0.9.91; queue lives in CARDS now). "Plan in one screen: we are at 0.9.8x".
7. STATUS header "Last update 2 Nov … 0.9.95"; ROADMAP "Current version 0.9.82" and title "ScreenWithMe";
   STATUS "Pending decisions: keep Sidelit or rename … Domain e.g. screenwithme.app" although the owner decided
   Sidelit (ROADMAP Focus table).
8. `kvkk-gdpr-denetim`: "run it before 0.9.97 / 0.9.98" (0.9.97 is past; privacy rewrite H3/M7 done).
9. Design role session title "ScreenWithMe · 🎨 Design", Planner "ScreenWithMe · 🧭 Planner" (titles from before the
   rename) — fine as lookup keys, but should be stated as such once.

Product facts that later bullets overrode (the old text is still written as current):
10. **Toolbar under the video:** "Player controls … In the window our buttons are the toolbar under the video";
    "Hide the side panel: ⇥ in the toolbar under the video"; Games "🎮 (`#game-btn`) in the toolbar under the
    video → menu (XOX, Dört Taş, Çiz-Bil, Bilgi yarışması)"; Room UI 0.9.80 "Under the video … labelled buttons" —
    all superseded on computers by "One remote" (0.9.92.8) / "one rail everywhere" (0.9.93.9); the menu is now the
    games gallery with Classics.
11. **Games open in the video's place** (PlayWithMe bullet, Tablets) vs CL2 "every room game opens in the free mini
    window by default".
12. **Phones turn sideways → fullscreen** ("Phones (0.9.91.2)") vs "One remote / Phones (0.9.92.8): turning sideways
    no longer opens fullscreen by itself".
13. **Settings dialog on phones:** "sections are horizontal at the top" vs "Settings is a full page on a phone".
14. **Avatars:** "Avatar lists have no pages: with many avatars in a tab the grid scrolls" and "Avatar choice … In
    the extension a panel covering the whole window" (the extension has no UI) vs R27 "no tabs, one grid"; the
    Avatars bullet still explains the parody pipeline (`avatars-2/full`, "Parodies only hint at a style") after R20
    removed 32 of 33 parodies.
15. **Room width:** "Scene top space: Room content is centered, at most 1280 px" vs "Bigger room: `main` has no
    1280 px cap"; "Cinema Rail: the right rail (320 px)" vs `--side-w clamp(300px, 21vw, 400px)`.
16. **Emoji bar:** "custom emoji pages via ▲▼ (fullscreen and Shorts)" vs Shorts uses the tray since 0.9.91.7.
17. **Side games gallery:** "Window Garden and Five Frames as 'Soon' until built" (both built).
18. **Debug panel:** the Live line cites `ui/debug-panel.ts` (card 12) — the file no longer exists (Test Lab).
19. **Structure:** "i18n.ts (TR/EN)" — `i18n.ts` is English only since PERF1a, Turkish is `i18n-tr.ts`.
20. **CI bullet contradicts itself:** "on every push/PR: … `wrangler dev` + `npm run e2e`" then "a push to main runs
    only typecheck … the PR already ran the local suite".
21. **Message position:** "In the extension's room view messages are in the chat panel" vs later fullscreen/film
    page toasts (R21 / R25); "Message position (0.9.90.1 …)" describes `#fs-chat` flow that only applies to the sync
    test now.
22. **Five Frames** bullet says "green / gold / grey" then "were green / gold / grey until the IP audit" in the same
    paragraph.
23. Harness check counts ("39 checks", "71 checks", "embed 115") are pinned numbers that drift every release.
24. **Turkish labels as identifiers** in an English-first doc: "Oturma odası", "🎲 Keşfet", "✨ Bunun gibi", "Sese
    katıl", "Filme git", "🏠 Odaya dön", "👁 Sayfayı göster", "Herkesi bana eşitle", "Settings → Ekranım", "Oda
    kuralları", "Tamam", "Film saati" … (75 quoted Turkish strings in the architecture section). They were current
    when written in Turkish UI; the English UI label is now primary (`I18nKey` is English), so these should become
    `English label` (`i18n key`).
25. "UI terminology (Turkish UI, 0.9.82 copy pass)" is a Turkish glossary placed in the rules, while the English
    glossary (room view, film page, host …) is a half sentence. English-first says it should be the other way round.

## 2. Target structure

### 2.1 New CLAUDE.md (target ≤ 25 KB, measured estimate ≈ 20–24 KB)

| # | Section | Source | ≈ KB |
|---|---|---|---|
| 1 | What Sidelit is; things kept on purpose (old address, `swm`, `screenwithme-site`) | header | 1.0 |
| 2 | **Read first / map**: STATUS (current only), CARDS (open only), ROADMAP Focus; table "where things live" pointing to `docs/internal/architecture/*.md`, `design/`, `research/`, `security-review-*`, CHANGELOG, archive | new | 2.0 |
| 3 | Language rules (English first; Turkish only with the owner and in TR UI/README.tr) — said **once** | Language + duplicates | 2.0 |
| 4 | Roles, hub, board, lanes (one paragraph per role, who may edit which file — incl. **who may edit CLAUDE.md and architecture files**) | Sessions as an office + CARDS header | 3.5 |
| 5 | Working with the owner (report, task list, hand tests, decisions, KeePass, run-out rule, how he is asked = Planner's chat) | Working with the user | 3.0 |
| 6 | Product rules (focus, no-scroll-inside-a-view, neutral public texts, no piracy sites, English UI glossary + TR mapping table) | Focus, No scrolling, Official texts, UI terminology | 2.5 |
| 7 | **Invariants that must not be broken** (one line each, link to the area file) — list in §1.2 "Rules" | scattered | 3.0 |
| 8 | Structure (workspaces) + Commands | as is (fix i18n) | 3.0 |
| 9 | Release checklist + version rule + changelog rule | Release checklist + Live line | 1.5 |
| 10 | Cloud sessions, licence/privacy, known limits (short) | as is | 3.0 |
| 11 | Skills / owner's catalogue: two lines + link to `docs/internal/tools.md` | Working with the user | 0.5 |

Rule to add: **CLAUDE.md never records what a release did.** Release notes go to CHANGELOG.md; how a feature works goes
to its area file; CLAUDE.md changes only when a rule or the map changes (Planner-owned).

### 2.2 `docs/internal/architecture/` (feature reference, every technical fact kept)

Each file: purpose, files, protocol messages, constants, storage keys, invariants, tests (harness / e2e names), links
to design / research notes. No version narration; a short "Decisions" list at the end where a pick explains a
non-obvious behaviour (with the card id).

| File | CLAUDE.md sections that go there (line ranges on origin/main) | + facts to mine from the Live line (L152) / elsewhere | ≈ KB |
|---|---|---|---|
| `sync-engine.md` | Server source of truth (229), Sync engine + 3-2-1 (232), Everyone ready (249), Rate (1537), Sync test (1309), No sync when alone (848), Scheduled start / Film time (1305) | YTK `SEEK_STEP` ← / → via `requestSeek` | 5 |
| `rooms-and-protocol.md` | Protocol (254), Host modes (1299), Kicks + same browser (482), Knock (492), Make host (505), Host handover (509), Sleep resilience (512), Ghost connections / reconnects / member ids (553), Saved rooms (1331), Save the room (1588), Queue (1594), Voting (1303), Pins (816), Today's recap (1337), Rooms are independent (1523), Site reload (541) | BH4 `sendBans`, R11/R16 person key `pk`, R17 tab `sessionStorage`, BH5 / R18 order of things (`introOver`, `removedHere`, `swm-joined`; link `order-of-things.md`), PERF1e `STATS_SAVE_MS`, Y2 title freshness, BH6 saved-row "mine" | 12 |
| `chat-reactions-avatars.md` | Private messages (1503), Chat images and links (1514), Room actions in chat (1531), Custom emojis (821), Reaction display (838), Emoji bar (1535), Disable emojis (1533), Keyboard (1294), Hint bubbles (846), Avatars (565), Avatar choice (1542), Avatar lists (1545), Intro sound + picture (577) | R20 `REMOVED_AVATARS`, R27 `AVATAR_GRID`, R21/R25 `SIDE_TOP` / `BOX_GAP` message layout | 8 |
| `networking-and-hosting.md` | HTTP fallback (515), Networks that cannot connect (534), The site's address (1324), PWA (1287), Move to another device (1147) | R3-3 domain handoff, UPTIME2 cron (`uptime.ts`, `FeedbackGate` `uptime` book), `monitor.yml` backup, BH8 alarm sweep | 7 |
| `shell-extension.md` | Extension rules (384), Shell (404), Resilience to ads (456), Manual video pick (472), Rate lock (476), Not on our site (479), Shared settings (484), Back from the film (805), "Back to the room" notice (1291), Outdated extension notice (810), Dead bridge (813), Video events in the extension (1586), Media kinds (382) | EXT1 film's own ⛶, R5 `FILM_EDGE`, BH7 overlay identity | 12 |
| `players-youtube-shorts.md` | Shorts view (257), YouTube search (330), TikTok (346), Vimeo (358), Podcasts (370) | Y1 attribution, Y3 usage counters, M3 daily budget, `markHit`, PERF1c `FEED_MAX_ITEMS`, YTK Shorts "Play now", BH12 `.yt-notices-shorts`, card 10 channel / region | 15 |
| `room-ui-computer.md` | Player controls (587), One remote / rail (1415), Message position (800), Bigger room (1410), Room layout (1386), Room UI 0.9.80 (1359), Simpler room (1346), Tabs (1355), Who-paused (1383), Hide side panel (1500), Invite window (1479), First-time path (544), Home page (1396), Scene top space (1581), Default language (1539), Accessibility (721), cinema mode (from Live line + `design/cinema-mode.md`) | R15 / R21 / R25 / R26 / BH10 rail and fullscreen details, card 6b / 6d / 6e, 15c–15f home art, theme previews | 18 |
| `phone-tablet-tv.md` | Phones (620), Phone room as an app screen (645), Tablets (730), TV version (741) | R4-10 `TV=on`, GT / YTG game windows on tablets, MB tablet pass | 12 |
| `voice-camera-stream.md` | Voice chat (851), Video chat + camera layouts + pre-join check (1165), Cameras on phones (1235), Streaming / screen share (1248), Browser blocks direct connections (1158) | R1 resume, BH2 `ASK_FRESH_MS`, R22 / R23 live card | 15 |
| `sound.md` | Sound effects (776), intro sound recipe part of (577) | game sound ids from side games | 3 |
| `games-tables.md` | PlayWithMe (885: room game model, board engines, Classics, chess, backgammon, reversi, CL2, Sea Battle, Draw & Guess, Quiz) + Games quality | **Last Heart (poker) — only in the Live line**, result card (`resultCard`, `showPointsResult`), referee, `tableHowTo`, `gameHint`, GHOST `ghost.ts` / `GHOST_MS`, LIVE-GREEN `GameSocket`, FF2 + GW `minSize` / `zoomRange` / `.game-full`, YTG `overYoutube`, GT `clearOfChat`, `setGameLive`, bot `quiesce` / `BOT_THINK_AT_MS`, Sea `aimAt`, CLFLASH `.mt-loading` | 18 |
| `games-side.md` | Solo side games (989: Snack Bar, tip jar / cuttings, gallery, Window Garden, Five Frames) | side games 2 (`receiptFor`, `HYBRID_COLORS`, `placeLamp`), BH2 `liveStreak`, 0.9.97.31 "only in a room" rule | 9 |
| `test-lab.md` | Test Lab (1060) incl. LABLOCK, friends, video & network, scenarios, games, server powers | LABTR `LabText`, DL3b positions | 10 |
| `security-and-privacy.md` | Security (388), Feedback endpoint (1311), privacy / terms pages (License and privacy part) | M2–M6, L1–L10, R3-x, R4-x one line each with the constant (`UploadGate`, `IpKeys`, `ROOM_INFO_LIMIT`, `FALLBACK_LIMIT`, `readCapped` …), feedback `FEEDBACK_REPO` | 7 |
| `ci-release-ops.md` | CI (1546), Release checklist detail, Cloud sessions test notes | CI2 jobs, TAG1 `tag-live.mjs`, OPS1 changelog / tags, `size-budget.mjs` budgets, PERF1a/1b `room.css` + `i18n-tr` budget rules, `check-texts`, `check-game-text`, `check-name`, `check-domain`, `png-squeeze`; STATUS "Testing in the cloud" (with fresh numbers) | 8 |
| `web-performance.md` (optional, or inside room-ui) | Room chunk (702) | PERF1 report link, `loadChunk` rule, `room.css`, lazy language | 3 |

Total ≈ 160 KB of reference, but each session loads only the one or two files for its area.

### 2.3 History

| Content | Goes to |
|---|---|
| L152 per-release text 0.9.97.52 – .92 | already in `CHANGELOG.md` (user-facing); the developer-facing remainder after mining → `docs/internal/archive/release-notes-dev-0.9.90-0.9.97.md` |
| L152 0.9.90 – 0.9.97.51 | CHANGELOG "older versions summarized" + the same archive file |
| "Next up" items 0–3 | delete (done) |
| "since 0.9.x / used to / owner chose … on artifact …" sentences inside bullets | area file "Decisions" list (one line + card id) or archive |
| STATUS "History (short)" | archive file, in version order |

## 3. STATUS.md and CARDS.md

### 3.1 STATUS.md (127 KB)

| Section | KB | Verdict |
|---|---|---|
| Header + "Working with the owner" | 1.1 | delete (stale date, duplicates CLAUDE.md) |
| Current direction | 0.6 | replace by one line → ROADMAP Focus |
| **Task queue** | 34.4 | archive. 71 `[x]` items 0.9.83 → 0.9.93, open items that are actually done (channel feed 0.9.96.1, Thanks page 0.9.96.2, "Phone version from scratch" 0.9.92.3–5, "YouTube rule + one remote", "0.9.93.2 picks"). The live queue is CARDS "In progress"; keep only a 5-line "Session handoff" (what the last session was doing, first unfinished step) |
| Design sweep (card 16) | 3.5 | archive (→ `design/sweep-*.md` already exist) |
| **Owner's hand tests** | 69.7 | split: keep "Next round, start here" + "🎮 Games, start here" + "Before the store submission (Edge / Brave / Opera / Firefox / Safari)" + owner settings to do (production env, LAB_CODE, Dependabot, Watch issues) ≈ 12 KB. Archive the ~100 per-release blocks ("**0.9.97.29 …**", "(Covered by Next round item 1)", "No hand test needed", "Nothing to see"); several contradict current behaviour (L773 "two tabs Themed and Genres" vs R27 no tabs; L752 Opera Night) |
| Last full test pass (28 Oct, 0.9.82) | 4.9 | archive |
| Pending decisions | 1.0 | refresh (name decided → trademark/domain check only) |
| History (short) | 5.2 | archive |
| Testing in the cloud | 3.6 | move to `architecture/ci-release-ops.md` |

**Slim STATUS.md (≈ 15 KB):** live version + date; Now/Next (one line, link ROADMAP); session handoff (≤ 10 lines per
active role/lane); owner's open hand tests (current round + pre-store list); owner's to-dos (accounts, secrets,
settings); pending owner decisions; "Ideas waiting for the owner's pick" (currently buried as a checkbox inside the
task queue at L252 — give it its own section).

### 3.2 CARDS.md (181 KB, 126 blocks)

| Section | Blocks | KB | Done-ish | Verdict |
|---|---|---|---|---|
| Header (rules, format) | – | 2.5 | – | keep, but move the rules to CLAUDE.md §4 and leave only the card format + lane table |
| In progress | 1 | 0.1 | – | keep |
| Shipped 0.9.97.60 – .85 list | 1 | 2.1 | all | archive (CHANGELOG + PRs) |
| **Ready** | 16 | 16 | **13 have `Done:`** (CAM1, MB, EXT1, CL2, GH, 15e, 15d, 15c …) | move the 13 to archive; Ready keeps ≈ 3 |
| Owner's test round 2 (R15 – R27, BH5, DL …) | 19 | 23 | mostly done (✅ in the run order) | archive |
| Owner's test round 1 (R1 – R14) | 18 | 21 | done | archive |
| Run order to the test round (6c, 6g, 15b, T, A11y, GP, P2, 9 – 16) | 20 | 37 | done | archive |
| Proposed | 23 | 24 | ≥ 5 shipped (Y1–Y3, Snack Bar, word game, move device, privacy, logo …) | prune: shipped → archive, rest stays |
| Done | 35 | 50 | all | archive |

**Slim CARDS.md (≈ 15–20 KB):** card format; lanes table (lane → role → files it owns → current card); In progress;
Ready (ordered); Proposed (only open); a one-line index "Done cards: `archive/cards-done-2026-11.md`". Rule: a card
moves to the archive in the same PR that writes its `Done:` line.

### 3.3 ROADMAP.md (31 KB)

Keep Focus + Milestone gates + Phase 1 §2–7 open items + Phase 2. Fix title/version line. Move checked §1 "Polish"
items (36 `[x]`) to the archive. ≈ 15 KB.

### 3.4 Other docs

- Still-Turkish docs listed as "migrate when touched": `VIZYON.md`, `BUYUME.md`, `gelecek-fikirler.md`,
  `oyun-fikirleri.md` ("PlayWithMe"), `rakip-analizi.md`, `reklamlar.md`, `ses-goruntu.md`, `yayin.md`,
  `claude-araclari.md` (all titled "ScreenWithMe"). Most are design-time research → `docs/internal/research/` (or
  archive) with English names; `ses-goruntu.md`, `yayin.md`, `reklamlar.md` are referenced as the design notes of
  live features and should be translated first.
- `games-hub.md` titled "PlayWithMe games hub".
- One-off reports that are done: `consistency-bh3.md`, `gate-0.9.98.md` (current), `security-review-1…4.md` (keep as
  records, they are referenced by finding ids).

## 4. Concept mixing: one canonical term each

| Confusing set | Where | Canonical term (proposal) |
|---|---|---|
| Test Lab / "hidden test panel" (card 12, `?debug=1`) / "debug panel" / `debug-lab.ts` / `ui/debug-panel.ts` (gone) / "debug mode" | CLAUDE.md, CARDS, STATUS | **Test Lab** (code: `test-lab.ts`; `debug-lab.ts` = "the lab switch"). Never "debug panel" / "test panel" |
| Checklist page (EtqK…) / test board Artifact (NWZG…) / hidden test board page (`o-<random>`, removed R24) / option pages / the owner's guide PDF / "the board" (= CARDS.md) | CLAUDE.md, CARDS, ROADMAP | **Owner's board** = the one Artifact (single URL, in CLAUDE.md only); **Card board** = CARDS.md; "option page" retired (questions go in the Planner's chat) |
| Lanes A / B / B2 / Game Studio / "Developer A/B" | CARDS run orders, CLAUDE.md bullets "(lane B)" | One lanes table in CARDS.md (lane id → role → file ownership). Drop lane tags from architecture text |
| ScreenWithMe / Sidelit / PlayWithMe / `swm` | everywhere | **Sidelit** for the product; "ScreenWithMe" only in the "kept on purpose" list (address, repo, ids, session titles); **PlayWithMe retired** → "room games" |
| dock / rail / "the remote" / "one remote" / toolbar / `#fs-dock` / `.yt-rail` / "side rail" / "Cinema Rail" (= the right side column `.side`) / "Shorts rail" (`#shorts-bar`) / "our own bar" (`#fs-controls`) | CLAUDE.md (dock ×59, rail ×110) | **Rail** = the vertical control column beside the video (`#fs-dock`, all variants); **side panel** = `.side` (chat/queue/people), never "rail"; **Shorts bar** = `#shorts-bar` (rail form or bottom form); **toolbar** = legacy, phones only; retire "dock", "Cinema Rail", "one remote" |
| Shell / overlay / film page / room view / "hole" / islands / "Sayfayı göster" bar | CLAUDE.md | **film page** (the third-party site), **overlay** (our site inside it, code name `shell`), **room view** (overlay showing the room with the hole), keep "hole" and "island" as code terms defined once |
| Room games / tables / Together games / Classics / "the hall" / games gallery / games stage / hub / "Play on the side" / side games / solo games | CLAUDE.md, CARDS | **Games hall** (the 🎮 window, `gallery.ts`); **table games** (shared, server-held: Classics, Sea Battle, Draw & Guess, Quiz, Last Heart); **side games** (solo: Snack Bar, Window Garden, Five Frames); **game window** (the stage). Retire "hub", "solo", "room game" as user-facing names |
| Custom emoji / sticker / reaction / Tepki / emoji (sent) | CLAUDE.md, glossary | UI: **reaction** (sending), **custom emoji**; code: `sticker`. State the mapping once |
| "ghost connections" (room: 150 s `pruneStale`) vs game "GHOST" (90 s `GHOST_MS`) vs camera "ghosts" (12 s tile) | CLAUDE.md | name them: **stale room connection**, **silent game connection**, **lingering camera tile** |
| Fullscreen variants: real fullscreen / `fake-fs` / `.pseudo-fs` / cinema mode / `.game-max` / `topbar-peek` | CLAUDE.md | one table in `room-ui-computer.md` |
| Turkish feature names used as identifiers: "Oturma odası" (Shorts view), "Keşfet" (Discover), "Bunun gibi" (More like this), "Film saati" (Film time), "Ekranım" (My screen), "Birlikte" (Together) | CLAUDE.md | English UI label + i18n key; Turkish only in a TR column of the glossary |
| "host" / "acting host" (`hostId`) / "real host" (`hostKey`) / "game's host" / "opener" | CLAUDE.md | define the four once in `rooms-and-protocol.md` |
| Version names: milestone "0.9.98 gate", "milestone step", "G98 / G98b / G98c", "BH", "R", "DL", "GP" card prefixes | CARDS | a prefix legend at the top of CARDS.md |
| "Planner" vs "the owner's guide PDF" vs `my-awesome-list` `ajan-ofisi.md` as the source of process truth | CLAUDE.md, ROADMAP | CLAUDE.md §4 is the one source; the others link to it |

## 5. Process friction visible in the docs

1. **Everyone appends to CLAUDE.md.** The Developer "owns the technical notes in this file", but every code-writing
   role adds a release paragraph to one 64 KB line → constant merge conflicts on the same line, and each session pays
   ~60 k tokens to load it. Fix: CLAUDE.md is Planner-owned and rule-only; area files are owned by whoever ships
   the change; CHANGELOG gets the release block.
2. **Three trackers for the same work:** CARDS (cards + "Shipped" list + run orders), STATUS (task queue + hand-test
   headings per release), CLAUDE.md "Live" line, plus CHANGELOG and the Artifact. "Visible task list … the same
   queue is written to STATUS 'Task queue'" (CLAUDE.md) vs the real queue being CARDS "Ready". Pick one: CARDS for
   work, STATUS for the owner, CHANGELOG for releases.
3. **Rules changed in one file and not the others** (option pages, tick page URL, number of parallel sessions,
   Developer "one at a time"). Fix: rules live only in CLAUDE.md; other files link.
4. **Role boundaries unclear:** Design "never edits product code" but Design files are copied into product by scripts
   (`avatars.mjs`, `theme-art.mjs`); Game Studio does "code, tests, releases" but Developer "owns the code"; lane B
   "no longer does games" yet owns the Test Lab whose games tab Game Studio built. A file-ownership table per role /
   lane would end this.
5. **The owner-communication rule is inconsistent:** "the owner talks only to the Planner" vs "What should I test?
   … read that list, explain … tick" (any session) vs "Finish every task with a short report" (to whom?). State: the
   report goes to the Planner via `send_message`; only the Planner speaks to the owner unless the owner opens the
   session himself.
6. **Stale "read first" guidance:** STATUS says "every session reads this first" but it is 127 KB with a 2 Nov
   header; ROADMAP's Focus says "the task queue in STATUS had about twelve open items" (it has 272 open boxes now).
7. **Pinned numbers drift:** harness check counts, unit-test counts ("165", "251"), JS sizes ("143.2 → 124.3 kB")
   appear as current facts. Keep numbers only where a script checks them (budgets, limits) and refer to the script.
8. **Owner-decision provenance is mixed into reference** ("owner's picks 1A 2B 3A 4B …", artifact links from the
   old account that "may not be accessible any more"). Move to the card / archive; the area file keeps the behaviour.

## 6. Suggested migration order (for the Planner to card up)

1. Create `docs/internal/archive/` and move done cards, STATUS task queue / old hand-test blocks / history, ROADMAP
   checked items (pure moves, no rewriting) — biggest load-time win, zero risk.
2. Write the `architecture/*.md` files by moving the CLAUDE.md bullets verbatim per the mapping in §2.2, then mine
   L152 release by release (§1.3 list as the checklist), then strip version narration into "Decisions".
3. A script check (like `check-name.mjs`): every backticked identifier in the old CLAUDE.md appears in the new
   CLAUDE.md or an `architecture/` file — proves nothing was lost.
4. Rewrite CLAUDE.md to §2.1 (≤ 25 KB), fix the contradictions in §1.5 with the owner's current rule (option pages,
   tick page, parallel sessions).
5. Add the canonical-terms glossary (§4) to CLAUDE.md §6 and rename in the area files.
