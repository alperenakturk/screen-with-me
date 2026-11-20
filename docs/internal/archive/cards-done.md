# Finished cards (archive of `CARDS.md`, card DOCS2)

Moved here verbatim on 11 Nov 2026 by card DOCS2 (`OPTIMIZATION.md` step 6): everything on the old board that was
finished (shipped cards, the owner's test rounds 1 and 2, the run order to the test round, the old Done list, the
night-pick cards, Proposed cards that shipped or were decided) together with the board's old header. The live board is
`docs/internal/CARDS.md`; still-open cards stayed there. Nothing here was edited, so line wording and dates are as they
were; release notes for each version are in `CHANGELOG.md`.

## Old board header (11 Nov 2026)
Owner's rule (2 Nov 2026): one board for every session. The **Planner** writes and orders cards; the **Developer** takes
the top **Ready** card, moves it to **In progress**, and when it is live adds `Done: <PR link>` and moves it to
**Done**. **Security** and **Research** add their suggestions under **Proposed**; the Planner and the owner decide
whether they become Ready. Roles and rules: `CLAUDE.md` "Sessions as an office". The order follows `ROADMAP.md`
"Focus: now / next / frozen". The owner's tick view is the Planner's test board Artifact https://claude.ai/artifact/NWZG7GLH4JzAnZt1rNgrJo
(owner, 4 Nov 2026: the hidden page on our site needed a deploy for every update, so it is removed again; the
Artifact updates at once).

**How the owner is asked (owner, 4 Nov 2026):** no more option pages or other web pages for him. The only page he uses
is the test board (the Planner keeps it current with what he tested and what is next). Every preference or design
question is asked **in the Planner's chat** with clickable choices (the chat's question tool, the recommended choice
first, with a side preview of each option: a short sketch or description). Design, Game Studio, Research and the
Developers therefore send the Planner the questions as text: question, 2–4 options (one marked recommended), and a
short preview per option. They do not publish Artifacts for the owner.

**The test board stays current by itself (owner, 4 Nov 2026):** the Planner adds, updates and removes board items
without asking: a fix that went live becomes a test, a test the owner reported passing is removed or marked, a
question he answered disappears. Then the Planner tells him in a line what changed. **Everyone talks to the owner in
Turkish** (all sessions; among themselves English is fine; everything written to the repo stays English).

**Resources and tests (owner, 4 Nov 2026):** whenever tokens, a usage limit, Actions minutes, an API quota or anything
else is running out, every session tells the Planner at once and the Planner tells the owner. Run as many tests as a
change needs, none on unrelated parts, and never give up quality (the CI diet, card CI, follows this rule).

**The repo is public since 4 Nov 2026** (owner: no money for Actions minutes; private-repo minutes ran out after
≈ 3500 min in four days). The license is "All rights reserved" (card LIC, PR #287). Never commit a secret, never say
"open source" in public texts; MIT or not is decided at 1.0.

Card format:

```
### <short title>
- Why: <one line>
- Done when: <what can be checked>
- Tests: <unit / e2e / harness / owner's hand test>
- Owner's pick: <link or "none needed">
```

## In progress

- **G98c** (lane A): the 0.9.98 gate re-checked against main, the owner-only list for his test round (docs PR #347).

## Shipped 0.9.97.60 – 0.9.97.85 (cards routed by message, without their own block)
Each line: card, version, PR, lane. Details are in the PR, `CHANGELOG.md` and CLAUDE.md's "Next up" line.
- Privacy policy for KVKK + GDPR (H3 + M7): 0.9.97.60, #312, A. Feedback goes only to the owner's private repository.
- 🚢 Sea Battle: 0.9.97.61, #313, Game Studio.
- Home door "Scroll Shorts together" + gate check G98: 0.9.97.62, #314, A.
- GT, game windows clear of the chat on tablets: 0.9.97.63, #315, Game Studio.
- CAM1: 0.9.97.64, #316, B2 (block below). Reversi: 0.9.97.65, #317, Game Studio.
- TOS, terms of use + abuse contact: 0.9.97.66, #318, A. MB: 0.9.97.67, #319, B2 (block below).
- GP2, games polish 1 / 2 / 3: 0.9.97.68 / .71 / .73, #322 / #323 / #328, Game Studio.
- LABLOCK, the Test Lab behind the owner's code: 0.9.97.69, #320, A. LABTR, the lab in plain EN + TR: 0.9.97.72, #324, A.
- OPS1, changelog, release tags, uptime check, cost guard: 0.9.97.70, #321, B2.
- STORE1, store dry run: #327, A. YTA, YouTube API audit pack: #330, A. CI2, parallel PR jobs: #326 + #329, B2.
- YTG, no game window over a YouTube video: 0.9.97.74, #332, Game Studio.
- R3-3, the site's address in one config value: 0.9.97.75, #331 + #334, A. TAG1, tags with catch-up: #333, B2.
- G98b, gate re-check: #335, A. BH11, game e2e offline check: #336, Game Studio.
- GHOST, game tables close silent connections (90 s): 0.9.97.76, #338, Game Studio.
- PERF1 / 1c / 1e / 1a / 1b, speed and weight: 0.9.97.77 / .78 / .79 / .83, #337 / #339 / #341 / #345, A.
- YTK, Shorts "Play now" + ← / → seek: 0.9.97.80, #340, B2.
- FF2 + GW, Five Frames' result line, game window sizes, ⛶ in every game: 0.9.97.81, #342, Game Studio.
- LIVE-GREEN, game e2e ride out network drops: 0.9.97.82, #343, Game Studio.
- BH12, the room's notes off the player in the Shorts view: 0.9.97.84, #344, B2.
- GP4, Last Heart result card + How to play, Glowbeam the referee at Quiz / Draw / Last Heart: 0.9.97.85, #346, Game
  Studio.
- Waiting for the owner: Sea Battle zoom on a phone (GP4 item 5, A keep / B zoom). After 1.0: bigger Five Frames keys on
  a phone, Window Garden plant names and moods (GP4 items 6–7).

## Ready

### SIMP1. A calmer room screen: fewer things on it, a tidy Settings (owner, 10 Nov 2026; lane A, after LAB2)
- Why: owner: "let's simplify the general design and take out things that aren't necessary, so they don't tire the
  user's eyes." His examples, all moved, nothing a user needs is lost:
  1. The room name and the people count at the top left go off the room screen (the name lives in Settings → Room, the
     count in the people list / the faces strip that already shows who is here).
  2. The footer line (privacy, terms, version …) leaves the room screen; it goes to Settings → About (privacy policy and
     terms one click away in both languages, the version number there; the extension page / store copy that reads the
     footer version is updated). The home page keeps a small privacy / terms link (KVKK / GDPR: the notice must stay easy
     to reach before you use the site).
  3. "Move to another device" leaves the profile popover and goes into Settings (few people use it).
  4. Settings get categories (e.g. Me · My screen · Room · Sound & camera · About), each a short list, no scrolling where
     it can be avoided (CLAUDE.md "No scrolling inside a view"), the same order on a computer and a phone.
  5. (owner, same day) **The voice / stream IP notice goes**: no dialog before joining voice, starting or watching a stream,
     and no "🔒 Those in voice can see your IP · Why?" line under the voice row ("nobody uses it; put it officially where it
     has to be, no warnings"). The fact stays where the law needs it: `privacy.html` #voice already says it in both
     languages (check the wording still matches: others in voice / a stream can see your public IP); Settings → Sound &
     camera gets a quiet "Who sees what (privacy)" link to that section. `ui/ip-notice.ts` and its `opt:ipNotice:*` keys
     go (old keys are harmless); the Planner updates CLAUDE.md's "fails closed (the IP notice)" line after it ships.
  6. (owner, same day) The room's **join screen** (name / avatar before entering) loses its privacy / terms footer
     line too; the links live in a small ⓘ / ⚙️ on that screen (an invited person never sees the home page, so the notice
     must stay one tap away there) and in Settings → About.
- Done when: the room screen shows only what you need while watching; every moved item is reachable in ≤ 2 clicks from
  Settings; nothing is removed from the product; EN + TR texts; `store/src/room.html` copy updated; the screenshot /
  layout harnesses at phone, tablet, laptop and desktop sizes are updated; the Test Lab steps that named the old places
  are updated; a hand test on the board.
- Tests: layout + settings harnesses, help / privacy harness (links still reachable in both languages), unit tests where
  logic moves.
- Owner's pick: done (his request). Anything else the developer wants to remove goes to the Planner as a question first.


### LAB2. The Test Lab ready for the owner's test round (owner, 10 Nov 2026; lane A 0.9.97.107, Game Studio 0.9.97.108)
- Why: the owner starts his 0.9.98 test round now (his pick) and will run it **through the Test Lab**: "make the debug
  part really solid, fix what is broken there; nothing may fail in the part we test with". Afterwards the Planner gives
  him a very basic step-by-step guide, easy to hard ("open this, unlock the lab, press this, tell me what you see").
- Done when:
  - **Lane A (the lab itself, 0.9.97.107):** every lab command in every tab (📊 👥 🎬 🧪 🖥 📜, command box, 🐞 This is a
    bug) is run once on a computer and on a phone (bottom sheet), in EN and TR, on a live-like host (`lab-lock`'s
    `lab.test`): no red line except `lab.selfTest`, every help line says what really happens, every Undo works. Every
    bug found is fixed. Unlocking with `?debug=<code>` works on a phone and on a computer and survives a reload.
    **🧪 Test round:** one scenario per test on the owner's board (STATUS "Owner's hand tests" N1–N4, S1–S4, F1–F2 and
    the 0.9.98 round items) that sets the stage where the lab can (e.g. cycle the themes, add a fake friend who plays /
    pauses / writes, drop my connection), with a one-line TR + EN help that says what to look at. Tests that need a
    real second person or device say so in their help line.
  - **Game Studio (the 🎮 tab, 0.9.97.108):** every games command (Duel match / hard mode, Sea zoom, Snack Bar coins /
    season / report, bot games, motion, Stub states …) runs without error in EN and TR on a computer and a phone; every
    game test on the board (G1–G16) can be set up from the 🎮 tab (add what is missing, e.g. a fake friend at a table,
    jump to the result card, skip to the Snack Bar's next milestone). Every bug found is fixed. Game Studio adds
    hooks in games code only; the lab chunk is lane A's.
  - **Both:** a list for the Planner, one line per board test: the lab steps with the exact Turkish button / command
    names and what the owner should see (written to STATUS "Test round with the Lab", English with the TR labels
    quoted). The Planner turns it into the owner's Turkish guide.
- Tests: `test-lab` + `lab-friends` + `lab-lock` harnesses (extend them for every fixed bug and every new scenario),
  `LAB_LANG=tr`, the games harnesses; live e2e green.
- Owner's pick: none needed.


## Owner's night picks (10 Nov 2026): cards
The owner answered the overnight question page: mascot **C Stub**, themes **B**, home colours **A**, default font
**A**, game window on a computer **A1**, camera window **C2**, Sea Battle phone zoom **B**, Snack Bar extras **1–4**,
Duel extras **1, 3, 4**, games extras **2 + 4**. His note on the sideways "game mode" (option 3, not picked): "is it
really needed?" Planner's answer: no. Since 0.9.97.101 every game already fills a sideways phone with nothing cut off,
so no separate mode is built. Versions are assigned by the Planner.

### NP1. Themes B, home colours from the theme, default font, camera window like Meet (lane A, 0.9.97.102)
- Why: owner's picks 2B, 3A, 4A, 6C2 (`docs/internal/design/themes-2.md`, `fonts.md`, `layout-audit.md`).
- Done when:
  - **Themes (2B):** Ocean Liner is removed (a saved `theme` value falls back to Night, nothing breaks); **Matinee**
    (the first light theme, tokens in `docs/internal/design/themes-2/ready/themes.css`) is added, with every hard-coded
    white / dark spot themes-2.md lists checked; Drive-In, Night Express, Neon, Moonlit Nights, Arabian Nights, Sunset
    and Picture Palace stay and get the token fixes from themes-2.md "Per theme" (Sunset's glow moved off "How it
    works", Arabian Nights' Shorts card on `--surface`, scrims where listed). Graphite and Pine are **not** added.
    Scene redraws and Neon's new look come in NP3 (they need Design's art). 10 themes.
  - **Home colours (3A):** the home slogan accent and the main button take `--hm-accent` / `--hm-accent-fill` /
    `--hm-accent-ink` from each theme's accent; the gold stays in the logo and is Night's accent.
  - **Default font (4A):** `DEFAULT_FONT` = Bricolage Grotesque titles + Figtree text for everyone who has not picked
    one; "Device font" stays a choice in ⚙️ → My screen.
  - **Game window (5A1):** no change (it keeps opening on the right, over the chat).
  - **Camera window (6C2):** a camera window starts at the video's bottom-left corner, like Meet, above the video's own
    controls (never over YouTube's player controls: the RMF rule), on a computer and a tablet; phones unchanged.
  - The contrast harness passes for all 10 themes at 1366 and 1920 (`ONLY=home` and the room); `privacy.html` untouched.
- Tests: contrast harness (CI), a unit test for the dropped-theme fallback, the layout harness for the camera start
  place, Test Lab hook to cycle themes. Owner's hand test: Matinee by day, the camera window with two devices.
- Owner's pick: done (night picks).

### NG1. Sea Battle zoom on a phone + Duel extras (Game Studio, 0.9.97.103)
- Why: owner's picks 7B and 9: 1, 3, 4.
- Done when:
  - **Sea Battle (7B):** on a phone, a tap on the enemy sea zooms into the quarter you aim at; a second tap fires;
    a way back to the whole sea is always visible.
  - **Duel cover (9.1):** the Five Frames Duel has its own cover art in the games hall (drawn like the other tables'
    covers in NG3; if NG3's style is not set yet, a cover that NG3 can restyle).
  - **Best of three (9.3):** a choice in the Duel's lobby card: one game or best of three; the first game is the word
    of the day, the next ones practice words; a score line between games.
  - **Hard mode (9.4):** a lobby choice; letters found must be used in later guesses (EN + TR), the same rule for both
    players, shown on the result card.
  - Glowbeam / mascot as the second player (9.2) is **not** built.
- Tests: Duel e2e for best of three + hard mode (`GameSocket`), unit tests for the hard-mode rule, the phone harness for
  Sea Battle zoom, Test Lab scenarios for both.
- Owner's pick: done.

### NG2. Snack Bar extras (Game Studio, 0.9.97.104)
- Why: owner's picks 8: 1, 2, 3, 4.
- Done when: (1) each place (city, by the sea, planetarium …) has its own shop-front colours; (2) seasonal stands that
  come and go with a badge for each; (3) a short manager's report after each film (what sold, what to buy next); (4) a
  short sound per stand at its milestones (the shared sound settings and mute apply). Saved Snack Bar games carry over.
- Tests: economy unit tests, the side-games harness at phone / computer sizes, Test Lab hooks for a season and a report.
- Owner's pick: done.

### NG3. Drawn covers and badges for every table + motion polish (Game Studio, after NG2)
- Why: owner's picks 10: 2 and 4. Option 3 (a sideways "game mode") is not built: see the note above.
- Done when: every table in the games hall has a drawn cover and badge in one style (the lobby card uses the same
  badge); motion: windows slide open, pieces move instead of jumping, cards flip; every motion obeys
  `prefers-reduced-motion`; no frame drops on a mid phone.
- Tests: games harness screenshots, a reduced-motion check, the CSS / chunk budgets.
- Owner's pick: done.

### MASCOT3. Stub becomes the mascot (Design first, then lane A + Game Studio)
- Why: owner's pick 1C (`docs/internal/design/mascot-2/`: Stub, the ticket). Glowbeam's art is replaced everywhere.
- Done when:
  - **Design:** the final Stub set: front, happy, small (favicon-size readable), home, the referee / opponent poses
    the games use, and a costume for each scene theme (Moonlit Nights, Arabian Nights, Picture Palace, Drive-In, Night
    Express) and Matinee; plus the scene redraw notes for NP3 (landmarks in the right 45 % and bottom 25 %) and a new
    look for Neon (not magenta + cyan). The logo D1 does not change.
  - **Lane A (NP3, version later):** Stub on the home page, in the room, on 404 / help pages and the extension's
    "Start watching" card; scene redraws in `scripts/theme-art.mjs`; Neon's new look; contrast harness green.
  - **Game Studio (with NG3 or right after):** the referee / opponent in the games uses Stub's art.
  - The mascot's name in the UI: the Planner asks the owner (it is a product name).
- Tests: the home + room screenshot harness in all themes, the games harness.
- Owner's pick: done (the name is asked separately).


### CAM1. Phone cameras: black video, slow switch, mirrored rear camera (owner's real test, 4 Nov 2026; lane B2, first)
- Why: owner + a friend on phones and a PC: (1) the friend's camera showed on the friend's phone but was black on the
  owner's phone and PC; (2) the phone camera UI is "very troublesome"; (3) switching to another lens (wide angle) took
  very long to reach the others; (4) the rear camera is mirrored (left looks right); (5) a phone friend's camera
  sometimes went black at random.
- Done when: remote video recovers (replay on `unmute` / `visibilitychange`, re-attach on a track change); a camera
  switch is `replaceTrack` on every peer with a short "camera changing…" state on both sides; only the front camera's own
  preview is mirrored, never the rear one and never what others receive; the phone camera row / person sheet / voice
  controls are clear at phone sizes; Test Lab hooks (switch camera, simulate mute / unmute, per-peer video state).
- Tests: voice harness with a fake camera + mobile emulation per point; the owner's phone hand test. Ask the owner
  which phones / browsers when he has time.
- Done: #316 (0.9.97.64), Developer B2: a camera switch in place with "Camera changing…", black / paused pictures
  recover by themselves, only the front camera's own preview is a mirror, 🔄 in the phone's faces strip. The owner's
  two-phone retest is in his next hand-test round.

### MB. End-of-milestone batch before 0.9.98 (lane B2, after CAM1)
- Why: ROADMAP "core first, multipliers later": strings, tablets, store copy and numbers are done as one batch.
- Done when: every user-facing string has EN + TR (i18n.ts and the chunks' own `TEXT`), checked by a script; the tablet
  harness covers everything since 0.9.96.10 (Test Lab drawer, stream card, cinema, lazy windows; game issues go to Game
  Studio); `store/src/room.html` matches the room and `npm run store` is rerun; help page, privacy policy and code agree
  on every limit (help harness extended: upload budget, probe limit, TV off).
- Done: #319 (0.9.97.67), Developer B2: `check-texts.mjs` in CI, the tablet pass, store copy and screenshots, policy
  numbers checked by the help harness.

### BH10. Full bug hunt before 0.9.98 (lane A)
- Why: the "zero known bugs" gate.
- Done when: every harness + the screenshot sweep on main (computer + phone, EN + TR), Test Lab multi-person paths,
  fixes with regression checks, the owner's ordered hand-test list (only what needs a human) in STATUS and on the board.
  Includes the owner's bug: "Keep the controls open" must keep the rail out in the window too, not only in fullscreen.
- Found so far: the Classics shelf stays open for someone who joined before the first move (Game Studio fixed it in BHG).
- Done: #307 (0.9.97.56), Developer A: every harness green on main, stale ones updated, "Keep the controls open" holds
  the rail in the window too, the owner's ordered hand-test round in STATUS.

### BHG. Games quality pass before 0.9.98 (Game Studio)
- Done when: every game at 4 sizes × EN / TR, alone and with fake friends, no scrollbars, text ≥ 13 px, a11y, reload /
  drop mid-game; fixes with checks; the games part of the owner's test list; 2–3 options for the next game work.
- Status: PR #306 (0.9.97.57): games-sweep (440 checks), games-resume, a 20 s grace in Quiz / Draw for a short drop,
  reopen after a reload, the Classics shelf fix.
- Done: #306 (0.9.97.57), Game Studio.

### EXT1. Film page: games, the rail in fullscreen, the film's own ⛶ (owner's bugs, 5 Nov 2026; lane A)
- Why: owner: "games don't work in the extension"; in film-page fullscreen the rail stays after the mouse goes back to
  the middle (until pause / play); the film's own fullscreen button does nothing, only ours works.
- Done when: the games hall and a table / side game work on the film page; the rail goes within ½ s when the mouse
  leaves it in fullscreen and in the window; the film's own ⛶ toggles the room's fullscreen for top-frame and iframe
  players.
- Tests: embed harness (headful) with new EXT1 checks; the owner's hand test (update the extension first).
- Done: #310 (0.9.97.58), Developer A: the hall is an island on the film page, the film's "edge" report closes the rail
  on its next move, the film's element fullscreen becomes the page's.

### CL2. Classics and game windows redesign (owner, 5 Nov 2026, "important"; Game Studio)
- Why: owner (screenshot): "Classics looks awful: XOX in the background, the games on the side, nothing makes sense";
  "always open games in the mini window at a size that fits each game"; "not the game small on the right and its
  settings on the left: something cute and proper for each game"; picking chess once locked the table to chess.
- Done when: every game opens as the mini window at its own size (the video's place stays an option, remembered per
  kind); Classics opens on a picker with only the game cards; each board has its own layout (board first, seats above /
  below, Glowbeam and watchers as small chips); "Change game" works at any time (asks while a game runs; a seated player
  decides, watchers can't); Quiz / Draw lobbies compact.
- Tests: e2e `classics-switch.mjs` (all 20 from → to pairs, Glowbeam moving first, two people), games-sweep, classics
  harness; the owner's hand test.
- Done: #309 (0.9.97.59), Game Studio.

### CI. CI diet (owner's pick "safe + short main", 4 Nov 2026; lane B, first in the queue)
- Why: 478 runs / ≈ 3500 min in four days; docs-only PRs ran the whole suite.
- Done when: a superseded PR run is cancelled; docs-only changes run only a tiny "changes" job whose check still
  reports (so branch protection can require it); e2e without the local connection pacing; Playwright cached; main runs
  only typecheck + unit + build before the deploy and the FULL live e2e after it; the lab / a11y harnesses only when
  `apps/web` or `packages/shared` change. PR ≈ 9 → 5 min, main ≈ 19 → 11.5 min, docs-only ≈ 0.
- Tests: the workflow's own runs on the PR and on main. PR #286.

- Done: PR #286 (0.9.97.39 batch) + #296 (main diffs from the last successful run).
### LIC. Source-available license before going public (owner, 4 Nov 2026; lane B) ✅
- Done: PR #287 (`LICENSE` all rights reserved, `UNLICENSED` package.json, READMEs, CLAUDE.md).

### GH. A GitHub page worth visiting (owner, 4 Nov 2026: "more current, better designed, better descriptions; more
security and promotion now that it is public"; lane A after 15f + R27, Design for the art)
- Why: the repo is public; the README is its front page and still reads like a dev note.
- Done when: README.md + README.tr.md rewritten together (hero with Design's banner, what it is, features with real
  screenshots / a GIF in legal test content, how it works, privacy, security, stack, license line, badges); `.github/`
  issue + PR templates; SECURITY.md fit for a public repo; a 1280 × 640 social preview image for the owner to upload;
  no film / series / piracy names, never "open source"; copy follows the `humanizer` skill.
- Tests: the README looks right on GitHub in light and dark (screenshot), every link answers.
- Owner's steps (Settings, he alone can), state on 4 Nov 2026 (checked through the API where it can read):
  - Done: description + website; Dependabot alerts, security updates (grouped) and malware alerts; private
    vulnerability reporting; CodeQL default setup; ruleset `main` (active on the default branch: no deletion, no force
    push, a PR with 0 approvals, required checks `changes` + `test`, not "up to date"); Actions: approval for all
    external contributors, read-only workflow token; environment `production` limited to `main`; account e-mail
    private + pushes exposing it blocked; GitHub 2FA with recovery codes.
  - Open: secret scanning + push protection (the API still says disabled); social preview upload (not readable here);
    Google accounts 2FA; Cloudflare 2FA skipped for now (he signs in through GitHub); deploy secrets move into
    `production` when a key is renewed (values cannot be read back, the repo secrets keep working until then).
  - Rule for sessions: with the ruleset, every change to `main` goes through a PR whose `changes` + `test` checks
    passed (docs-only PRs pass because skipped jobs report success); nobody pushes to `main`.

- Done: PR #293 (README, templates, SECURITY.md), Design #289 (banner, social preview), #303 (settings record).
### SZ. Slim the room chunk (Planner's technical decision, 4 Nov 2026; lane B)
- Why: the room page's JS is 144.9 / 145 kB gzipped after DL2; the next room feature would cross the budget.
- Done when: the live / stream and camera windows (and other things not needed on first paint) load as lazy chunks;
  ≥ 8 kB under 145; no behaviour change. The budget stays 145 (raise it only if a card is truly blocked, with the
  reason in its PR).
- Tests: size budget; voice / live / cam-fs / phone / phone-speed harnesses stay green.

- Done: PR #301 (0.9.97.52, room JS 145.0 → 136.9 kB).
### BH8. Live fallback.mjs: a room WebSocket closed with 1006 mid-test (lane B, after R4-3)
- Why: DL1's main run failed live e2e `fallback.mjs` "pong after chunked" on both attempts (close 1006 ≈ 24 s after
  open); the runs before and after passed. Flaky tests are fixed, not ignored.
- Done when: the cause is found (log the object's view of the close; check the "never polls" close and Workers Free
  limits) and fixed, or the test made robust for a real, documented reason; three live runs green on the first try.
- Tests: live e2e `fallback.mjs`.

- Done: PR #302 (0.9.97.53, with BH9); live `fallback.mjs` first-try green on .53, .54 and .55.
### SEC4. Security review 4: Cloudflare best practices + public-repo exposure (owner, 4 Nov 2026; Security, read-only)
- Why: the owner asked to review the code and the site with the Cloudflare skill (cloudflare/skills:
  workers-best-practices, durable-objects, wrangler, web-perf) and fix the security side, now that the repo is public.
- Done when: `docs/internal/security-review-4.md` + proposed cards; the Planner routes them to lanes A / B.
- Tests: each fix card carries its own.

- Done: `security-review-4.md` (#291); fixes R4-1/6/7/8 (.47 #294), R4-2/3/5 (.49 #298), R4-9/10 (.50 #299).
### 15e. Home art: the light lands on every screen; a bigger, balanced first screen (owner, 4 Nov 2026; lane A)
- Owner (screenshot of the live 0.9.97.28 home art): "the bright part should cover the tablet screen, the phone screen
  and so on properly, it doesn't look natural now"; "the whole art could look bigger and move closer to the left; the
  home page should be symmetric, well proportioned and clean".
- What we see in the screenshot: Glowbeam's cone hits the laptop's left edge and then shows again as a flat grey
  trapezoid behind the laptop, ending in a hard vertical edge at the far right; the tablet and the phone sit outside
  the light, the phone overlaps the laptop's base, the faces row floats in the middle under the laptop, and there is a
  wide empty band between the text column and the art.
- What:
  1. **One light that lands on the screens.** The cone opens from Glowbeam's lamp and its glow falls on the three
     screens themselves (each screen gets a soft lit sheen / bloom matching the cone's colour, brightest on the nearest
     device); no flat trapezoid behind the devices and no hard cut-off edge; the cone fades out softly past the last
     device.
  2. **A tidy device group.** Laptop, tablet and phone in one composed group with even gaps (no device covering
     another's screen or base, or a small deliberate overlap only at the frames); the sync pill, the chat bubble and
     the faces row placed on the group's grid (e.g. the faces row left-aligned under the laptop, the bubble by the
     phone), not floating.
  3. **Bigger, closer, balanced.** The art about 15 % bigger again and moved left so the gap between the text and the
     art matches the outer margins; text column and art vertically centred on the same line; equal left / right
     margins on 1920×1080 and 1366×768; the sideways tablet the same; upright tablet and phone keep their one-column
     layouts but use the same lit screens.
- Same rules as before: `aria-hidden` art, still with reduced motion, theme costumes, no empty boxes.
- Who: lane A builds it; if the light needs drawing help, ask the Design session for the glow shapes (no option page:
  the owner said what he wants).
- Done when: on the five home sizes the cone visibly lights all three screens with no hard edge or grey slab; no
  device hides another's screen; the art is bigger and the page looks balanced (equal outer margins, centred line);
  EN + TR; phone-speed budget green.
- Tests: home harness (screenshots of the five sizes for the owner; the cone has no hard edge inside the art box; the
  three screens lie inside the lit area; device boxes do not overlap screens; left / right margins within 24 px of
  each other at 1920 and 1366).
- Owner's pick: none needed.

### 15d. Home: bigger devices, the theme picker back at the top right, Glowbeam's themed hat, a black box bug (owner, 4 Nov 2026; lane A)
- Owner (screenshot of the live 15c home art): "the laptop, tablet and phone could be a bit bigger"; "the theme picker
  should come back to the top right, on the home page before a room is opened, and stay in the same place on the other
  pages"; "Glowbeam should have its hat too, now that themes exist: the hat changes with the theme".
- Bug in the same screenshot: a black rectangle with a thin green cross sits over Glowbeam's head at the top left of
  the art (looks like an empty image / video box or a debug shape). Find it and remove it; add a check that no element
  of the art is an empty box.
- What: the three devices about 15–20 % larger in the art box at every home size without crowding the text (phone:
  keep the art on top and the text clear); 🎨 back at the top right of the top bar on the home page and the other
  non-room pages (help, privacy, thanks, extension, connection), opening the same theme picker as the profile menu's
  "Change theme" (it undoes 6g.4 for those pages only; the room keeps it in the profile menu); the home art's Glowbeam
  wears the current theme's costume / hat (`docs/internal/design/themes/` mascots, `theme-art.mjs`), switching with the
  theme.
- Done when: the five home sizes show bigger devices and no stray box; 🎨 sits in the same top-right spot on every
  non-room page; changing the theme changes Glowbeam's hat on the home art; EN + TR; phone-speed budget green.
- Tests: home harness (device sizes, no empty / black box in the art, 🎨 present and in the same spot on home + help,
  the mascot changes with the theme).
- Done: #257 (0.9.97.28), Developer A: devices 17 % bigger, Glowbeam in the theme's costume, 🎨 back, no empty box.

### 15c. Home art: a computer, a tablet and a phone + real avatars (owner, 4 Nov 2026; Design, then lane A)
- Owner (on a screenshot of today's home art): "this screen's design should have the phone and the tablet too, as we
  said", and the faces row under the screen (the three plain colour circles + "3 watching · 2 in voice") should be
  **three random avatars from the Themed avatar page**: "I don't like it with plain colours".
- What: Glowbeam's light falls on **three devices** showing the same moment (a computer / laptop screen, a tablet, a
  phone; one shared picture and progress bar, the "In sync · 30 ms" pill and the chat bubble kept); the faces row uses
  three different drawn avatars picked at random from the Themed page (`AVATAR_PAGES`, `/avatars/<id>.svg`) on each
  page load, two with the green "in voice" ring, the "3 watching · 2 in voice" line kept. Same theme rules as today
  (scene themes, reduced motion = still), `aria-hidden` art.
- Who: the Design session draws the devices into the art (one direction, no option page: the owner already said what he
  wants) and writes build notes in `docs/internal/design/home-15b.md` (a "15c" section); then lane A builds it.
- Done when: the art shows all three devices at every home size (1920×1080, 1366×768, sideways tablet 1180×820,
  upright tablet 820×1180, phone 390×844) without crowding the text or the buttons; three different themed avatars,
  a new pick on reload; EN + TR; phone-speed budget green.
- Tests: home harness (devices present and inside the art box at the five sizes; three distinct avatar ids from the
  Themed page; two voice rings), sweep screenshots of the home page.

## Owner's test round 2 (4 Nov 2026, 0.9.97.22): results and new cards
Passed (owner, alone): Enter opens the message box at once, no strip in YouTube fullscreen, T in fullscreen opens
cinema mode, the YouTube rail slides in beside the player, the new menus, the new avatars. Games / streams: the owner
reports if a drop happens again over time.

**Run order:** lane B: R15 ✅. Lane A: R16 ✅ → R17 ✅ → R18 ✅ → BH5 ✅ → BH6. Lane B: R21 ✅ → BH7 ✅ → R24 ✅ → LIC ✅ → CI ✅ → R26 ✅ → R25 ✅ → DL1 ✅ → DL2 ✅ → R4-2/3/5 ✅. Lane B2 (fresh session): SZ ✅ → BH8 ✅ → BH9 ✅ → DL4 ✅ → DL5 ✅ → CAM1 → MB. Game Studio: Draw & Guess ✅ → chess + backgammon ✅ → DL3a ✅ → DL3b ✅ → BHG ✅ (.57) → CL2 ✅ (.59) → next game (owner's pick). Lane A: 15e ✅ → R22 + R23 ✅ → 15f + R27 ✅ → GH ✅ → R4-1/6/7/8 ✅ → R4-9/10 ✅ → BH10 ✅ (.56) → EXT1 ✅ (.58) → privacy policy H3 + M7 (.60). Security: SEC4 ✅. Design: GH art ✅.

### R15. YouTube fullscreen: messages over the video again, never a side column (owner; lane B)
- Owner (screenshot of YouTube fullscreen with the dark column on the right after writing a message): "messages don't
  need to go there; they can come over the video the old way. YouTube won't say anything, and if it does we'll change
  it. Never open a stupid menu on the side like this."
- What: in YouTube fullscreen on a computer the `#fs-side` column (cards 2a / 6d / R3) never opens. Messages come
  down over the video from the top right, left of the rail, like every other player (`ui/toasts.ts`); notes (waiting,
  countdown, game invite) sit on the video as for video files; cameras float over the video in their one window as in
  other fullscreens. This overrides the owner's earlier pick D (card 2a) for fullscreen only; Shorts (YouTube's own
  bar, nothing of ours on the player) and the windowed room view stay as they are.
- Note for the YouTube API audit (ROADMAP §4): our toasts over the player in fullscreen are the owner's call; if
  Google's review objects, we change it then.
- Done when: writing / receiving a message, a note or a camera in YouTube fullscreen never narrows the player; the
  messages show over the video and never cover YouTube's own bottom bar.
- Tests: `yt-room` / `yt-fs-side` harness updated (the player keeps its full width with a message, a note and a camera;
  the toast sits inside the video, above its bottom bar).
- Done: #251 (0.9.97.26), Developer B: no side column in YouTube fullscreen; messages over the video left of the rail.

### R16. Fix: a private message to someone in the same browser says "they aren't in the room" (owner's bug; lane A)
- Owner: in the same Chrome he joined as "alperen" and "alperen 2" (two people, as designed: a different name is a
  different person), then sent a private message to the other one and got `private_gone`.
- Cause (Planner's reading): `sendPrivate` compares `keyOf` (the browser key), so another person in the same browser
  counts as "myself". It must compare the person (`Member.pk` / `personOf`: browser + name), and deliver to that
  person's connections only, never to the other names of the same browser.
- Done when: a DM between two names of one browser reaches the other name only; a DM to my own name is still refused.
- Tests: e2e `private.mjs` gets the same-browser case (fails on 0.9.97.22).
- Done: #249 (0.9.97.24), Developer A: the person key is browser + name.

### R17. Fix: two tabs in the same room stop seeing each other after a while (owner's bug, "a big problem"; lane A)
- Owner: two tabs (A and B) of the same Chrome in one room (different names); after a while neither shows the other.
- Look at: same-browser connections replacing each other (`hello.prev` / `swm:prev:<room>` handover, `memberIds`
  giving an id back, `4005 replaced` for the same `cid`), ghost pruning (`pruneStale`, background-tab timers), the
  people list's "one person's two tabs count once" (`personOf` with different names), and the HTTP fallback.
- Done when: the root cause is found and fixed; two tabs with different names stay two people for 30 min including a
  backgrounded tab, a reload of one tab and a deploy (object restart).
- Tests: an e2e that reproduces it (fails before the fix), plus a long-running harness check with one hidden tab.
- Done: #249 (0.9.97.24), Developer A: each tab keeps its own name in sessionStorage; the 30-minute hidden-tab run is the owner's hand test.

### R18. Fix: nothing of the room before I'm let in (owner's bug + rule: "the order of things is very important"; lane A)
- Owner: with "Ask before letting people in" on, he joined from another browser; while he waited at the door the
  first-time tips (and other first-time things) appeared on the locked screen. They must come only after he is in.
- What: everything that belongs to being in the room waits for the first `welcome`: first-time tips
  (`room.ts` calls `showFirstTips()` at start, before any welcome), the invite window, the intro (R7 already waits),
  sounds, toasts, the extension update bubble, the language ask, the "continue" record (`lastRoom`) and anything
  else that runs at start. The door screen shows only the door. The same for a refused / kicked / full room.
- Done when: a knocker sees nothing but the door card until let in; after "Let in" the normal first-time path runs in
  its usual order (intro → tips; invite window only when alone).
- Tests: knock harness checks that no tip, invite window, toast or sound fires while waiting, and the tips come after.
- Done: #249 (0.9.97.24), Developer A: tips, `lastRoom` and the extension bubble wait for the first welcome.

### BH5. Bug hunt: the order of things on every path (owner's request; lane A, after R18)
- Owner: "pay attention to this in general and do a detailed logic-order test to find new bugs like this."
- What: list every path into and out of a room (first visit, invite link, `#back` from the film page, reload, a new
  tab, the door (wait / let in / refused), kicked, banned, full room, wrong protocol, connection lost / HTTP fallback,
  a TV, the film page shell, a phone, Shorts view, a game open on arrival, film time set) and, for each, what may show
  and in which order (join card, intro, tips, invite window, toasts, sounds, dialogs, notes, voice prompts, the
  extension cards). Write the table to `docs/internal/order-of-things.md`, then check each row in a harness and fix
  what comes too early, twice or never. Small PRs, a failing test first for each fix.
- Done when: the table exists, every row has a check, every wrong order found is fixed or listed for the owner.
- Done: #252 (0.9.97.25), Developer A: `order-of-things.md`, harness `order`, three fixes (refused-at-the-door card, no Continue after a kick, invite + tips after the intro).

### DL. 🐞 Sidelit Test Lab: a powerful debug mode that grows with the product (owner, 4 Nov 2026; lane B leads, Game Studio + lane A add their parts)
- Owner: "a very detailed debug mode, for now and the future: test everything in the games, the video things, whatever
  you think may clash; strong, detailed, and it changes as new features and ideas come. The goal is to find bugs fast
  and raise the speed and number of tests. BE VERY CAREFUL THAT THE DEBUG MODE ITSELF IS NOT BUGGY."
- Owner's picks (4 Nov 2026, in the Planner's chat): **a right-hand drawer + a command box**; **anyone with the hidden
  switch** (`?debug=1`, as today) for now, but **lock it with a code before the app / store release** (ROADMAP §7);
  **fake friends on the live site, at most 5**; **order: status + fake friends + log first**.
- Builds on the hidden test panel of card 12 (`debug-lab.ts`, lazy `ui/debug-panel.ts`, `?debug=1` / `?debug=0`).
- **Look:** a drawer on the right of the room (🐞 or Ctrl+Shift+D; it never covers the video's controls; on a phone a
  bottom sheet) with tabs 📊 Status · 👥 Fake friends · 🎬 Video & network · 🎮 Games · 🧪 Scenarios · 🖥 Screen · 📜 Log,
  plus a command box (Ctrl+K: type "add 3 friends", "bloom now", Enter) listing every command with its short help.
  A "🐞 This is a bug" button bundles the last 2 minutes (state, log, versions, errors) into one text to copy.
- **Rules that keep it safe and bug-free (all steps):**
  - Off = not loaded at all (lazy chunk, outside the room's size budget); a test proves nothing changes with it off.
  - No new power on the live server: fake friends are ordinary clients (normal rate limits, ≤ 5, a 🤖 in their name,
    only in the room the lab opened them in, all leave when the lab closes or the tab goes); anything that needs server
    help (skip a quiz question, set a dama position on the table) works only against `wrangler dev` / a test server.
  - No monkey-patching: features expose small named hooks (`debugHooks.register('snackBar', {...})`); the lab only
    calls those; a missing hook shows "not available here".
  - Every command: a name, a one-line help, where it works, and an undo where it changes something; every run is
    wrapped so a failing command writes a red line in the log and never breaks the room.
  - Game cheats run on a sandbox save (a snapshot of the real `localStorage` save first; "Restore my real saves").
  - The log never shows cids, IP hashes or tokens; the bug bundle shows exactly what it contains before copying.
  - Every lab tool has its own harness check in CI; the lab's own harness also runs with the lab off.
- **Steps (one PR each, in this order):**
  1. **DL1 (lane B):** drawer + command box + 📊 Status (versions, transport, clock offset, live sync-drift graph, voice
     / stream peer states, recent errors) + 📜 Log (in / out room messages, filtered, redacted) + "🐞 This is a bug".
  2. **DL2 (lane B):** 👥 Fake friends: add 1–5 (name + random avatar), each can write, react, play / pause / seek,
     stall ("not ready"), leave and come back, knock at the door, take the host role; a "chatty" mode at a set pace.
  3. **DL3 (Game Studio):** 🎮 Games: open any game at once; Snack Bar (coins, customers, receipt, badges, place),
     Window Garden (grow / bloom now, hybrid seed, night / rain, visitors), Five Frames (show the answer, set the day),
     Classics (a dama position, bot level, force a win / draw on the local test server), Quiz / Draw & Guess (skip,
     end, pick the word: test server only), tip jar fill; time ×10 for the side games; sandbox saves.
  4. **DL4 (lane B):** 🎬 Video & network: drop my connection, force the HTTP fallback, "the server restarted"
     (reconnect with the same id), drift +3 s, stall for N s, slow network, ads on the film page harness; 🖥 Screen
     (lane A): theme / language / reduced-motion switcher, phone / tablet size windows, "first-time visitor", outline
     the islands / hole / hidden boxes.
  5. **DL5 (lane B):** 🧪 Scenarios: one-click scripted checks with ✓ / ✗ per step (room entry order, knock, fullscreen
     messages, Enter after a click, private message, two names in one browser …), runnable with the fake friends.
- **Rule from DL1 on (for every new card):** "Done when" includes its lab hook or scenario, so the lab grows with each
  feature (Developers / Game Studio add it in the same PR).
- Done when (whole card): the owner can test every two-person flow alone with fake friends, reach every game state in
  a few clicks, cause each network / video accident on purpose, and copy one bug text; all lab harnesses green; with
  the lab off the room's size and behaviour are unchanged.
- Owner's pick: recorded above.

- Done: DL1 #284 (.44), DL2 #285 (.45), DL3a #295 (.48), DL3b #300 (.51), DL4 #304 (.54), DL5 #305 (.55).
### R25. Fullscreen messages lower than the message box (owner, 4 Nov 2026; lane B)
- Owner (screenshot of R21 live, a YouTube video in fullscreen: the message "Alperen2 sELAN" sits right beside the
  rail's 💬, at the same height as the message box that 💬 opens): "put it not right next to where you write a message
  but further down, so the sent messages never block me while I write".
- What: in fullscreen and with the side panel hidden, incoming messages start below the rail's message window (a
  band that begins where the open message box ends, about 45–55 % down the video), stacking downwards and still never
  over the player's bottom bar; with the message box open no message overlaps it, ever. Size and timing stay as R21.
- Done when: at 1366×768 and 1920×1080 (YouTube, video file, film page) a message never overlaps the open message box
  or its button, and never the bottom bar.
- Tests: `yt-fs-side` (box vs. message rectangles with the box open), embed harness.
- Owner's pick: none needed.

### R26. Enter opens the message box after a click on the YouTube player (owner, 4 Nov 2026; lane B, important)
- Owner: "when I click on the YouTube player and then press Enter, the side menu's chat doesn't react; the shortcut
  doesn't work; if I click the side menu first and then press Enter it works. This is important; test it in the
  extension too."
- Why: a click on the YouTube frame moves the keyboard focus into YouTube's iframe, so our page never hears the key.
- What: after a click on the player (YouTube, Vimeo, TikTok frames; on the film page the film's own frame), the room's
  shortcuts work again at once: Enter opens the message box, the emoji keys, P, M, T … (e.g. take the focus back to
  our page right after the frame got it, `window` blur → refocus, without breaking YouTube's own clicks, seek bar,
  settings menu or captions; on the film page the extension already forwards keys, check it really does after a click
  in the film). YouTube's own keyboard shortcuts may be lost; ours win.
- Done when: click the YouTube video → Enter → the message box has the cursor, in the window and in fullscreen; the
  same on a video file, Vimeo and on a film page with the extension; YouTube's play / pause by click, seek bar and
  settings still work.
- Tests: yt-room / yt-fs-side (click in the frame, then Enter), embed harness (click in the film, then Enter).
- Owner's pick: none needed.

### 15f. Home art: further left, pictures fill the screens (owner, 4 Nov 2026; lane A)
- Owner (screenshot of the live 15e art, the empty space left of Glowbeam circled, and red lines along the top and
  left inside each screen): "the Sidelit logo + all the computer, tablet and phone art should slide to the left"; "in
  the places I marked the orange picture should reach too; it looks odd now, like a shadowed layer between the frame
  and the screen's colour".
- What: the whole art (Glowbeam + devices + faces + bubble) moves left so the empty band left of Glowbeam goes away
  (keep the text column clear and the page balanced); each screen's picture fills its screen up to the bezel: no dark
  inner band / inset shadow between the frame and the orange picture (the sheen stays, on top of the picture).
- Done when: at the five home sizes the art starts close to the text column with no empty band; the orange picture
  touches the bezel on every side of all three screens; the 15e checks stay green.
- Tests: home harness (art's left edge vs. the text column, picture rect = screen rect).
- Owner's pick: none needed.

### R27. Avatar picker without tabs: one mixed list (owner, 4 Nov 2026; lane A)
- Owner: "remove the things in the top menu; it should be plain, without categories, all avatars mixed together; no
  categories needed for now".
- What: the avatar dialog (site and extension) shows one grid of every avatar (themed + genres + armadillo), mixed
  (a fixed shuffled order, not random per open, so a person finds theirs again), no tab row; the grid scrolls only if it
  must (the owner's rule: lists that grow may scroll). Random picks for new people stay from the themed set unless
  that is simpler to change; say which in the PR.
- Done when: no tabs in the picker on computer and phone; every avatar is in the one list exactly once; picking still
  needs "OK" / double-click.
- Tests: unit (every drawn avatar listed once), avatar harness / screenshot.
- Owner's pick: none needed.

### R24. Remove the hidden test board page from the site (owner, 4 Nov 2026; lane B)
- Owner: "testing on the site turned out silly: every board update waits for a deploy; delete that page, the Planner
  goes back to the Artifact".
- What: delete `apps/web/public/o-…/` (the whole folder), its `_headers` lines, the `owner-board` harness and any CI /
  CLAUDE.md mention (the 0.9.97.29 note becomes "removed in …"). Nothing else changes.
- Done when: the address answers 404 (or the home page fallback) after the deploy; CI green.
- Tests: CI; a quick fetch of the old address after the deploy.
- Owner's pick: none needed.

### R22. Remove the "Opera Night" theme (owner, 4 Nov 2026; lane A)
- Owner (in A's chat): remove the Opera Night theme completely.
- What: the theme leaves every picker, the theme art and the code; a saved Opera Night becomes Gece once, like a
  removed avatar.
- Done when: no Opera Night anywhere (pickers, previews, files); a browser that had it saved opens in Gece.
- Tests: theme-previews harness, a unit / harness check for the saved-theme swap.
- Owner's pick: none needed.

### R23. Stream controls fit beside the faces in the Together card (owner, 4 Nov 2026; lane A)
- Owner (in A's chat): while a stream is on, the Together card's stream controls (stop, quality…) push the chat far
  down; put them into the empty top-right area of the card next to the faces. Before a stream starts nothing changes.
- Done when: with a stream on at 1366×768 and 1920×1080 the chat panel keeps (almost) the same height as without one;
  the controls are all reachable; phones keep their own layout.
- Tests: `voice/live.mjs` (layout check), room harness screenshot.
- Owner's pick: none needed.

### BH7. A name changed on the main site does not reach the film page (lane B, after R21)
- Found by B while building R21: the embed harness check "a name changed on the main site also applies on the film
  page" fails on main too (the film page still shows the old name: "Sam" instead of "Riley"). Not related to R21.
- What: find why the overlay site on the film page does not pick up the new name (suspects: the shared settings sync
  `site:name`, and the per-room / per-tab `me:<room>` copies since R17 being read before the synced default) and fix
  it so that a rename in the room on the main site shows on the film page for everyone, for that room only (rooms stay
  independent, 0.9.88).
- Done when: the embed harness check passes again; same-browser and tab-name harnesses stay green.
- Tests: embed harness (the existing check), `same-browser`.
- Owner's pick: none needed.

### R21. Chat messages over a fullscreen video: bigger text, lower on the right side (owner, 4 Nov 2026; lane B)
- Owner (screenshot, a video in fullscreen with a message "Alperen selam basılsın ya" in the very top right corner):
  "the text should be bigger, and it should come out from a clearly visible place on the right side of the screen,
  not the very top right".
- What: in fullscreen (YouTube, video files and the film page) a chat message over the video uses bigger text (about
  1.5× today's toast: name + text ≥ 20 px on 1920×1080, scaling with the screen, ≥ 16 px on a 1366×768 laptop) on a
  slightly larger, readable card; it appears on the right side, vertically around the upper-middle of the video (about
  25–40 % down from the top), left of the rail, not in the corner; newer messages stack below or above it without
  covering the player's own bottom bar; same fade timing. Window mode with the side panel hidden follows the same
  place. Phones keep their own layouts.
- Done when: at 1920×1080 and 1366×768, in YouTube fullscreen and in video-file fullscreen, a message shows at the
  new place with the bigger text, never in the top 15 % or over the bottom bar, and never under the rail.
- Tests: `yt-fs-side` / `yt-room` (toast box position and font size at both sizes), the embed harness for the film page.
- Owner's pick: none needed.

### R20. Redraw two sea-cartoon parody avatars (owner, 4 Nov 2026; Design, then lane A)
- Owner (screenshot of the series parody page), first "remove these completely, they aren't nice", then changed his
  mind: **keep them; redraw the sponge** ("change only the sponge, the others are okay") **and the squid** ("change it
  too, it's very creepy now"). The pink starfish stays as it is.
- What: Design redraws `sponge` and `squid` in `docs/internal/design/avatars-2/full/` (same ids, same style rules as
  R14: our flat style, a hint of the character, friendly faces, no logos or exact costumes; the squid must not look
  creepy: softer eyes, a kinder mouth, warmer colour). Then lane A runs `scripts/avatars.mjs` so the site and the
  extension get the new files (no id change, nothing to migrate).
- Done when: the owner OKs the two new faces on Design's preview; they are live in the picker.
- Tests: the avatar sweep screenshot of the series page.
- Owner's pick (4 Nov 2026, Design's page https://claude.ai/artifact/6GRmQNs9ntXHJr6cQ6bs9s, round 2): **Sponge C** (waving, both hands up) · **Squid D** (bored, lids half down, soft blue). Design ships the files in #250, lane A copies them.
- **Changed again (4 Nov 2026):** Developer A flagged that Sponge C and Squid D read as the exact original characters at avatar size (store impersonation / copyright risk). Owner: "if they look that close and there will be copyright trouble, remove them completely." So R20 = **remove** `sponge`, `squid` and `starfish` (same show, same risk; Planner's call for the set), with the one-time themed replacement for saved ones; A also sweeps the other parody avatars for the same risk and lists any for softening.

### BH6. Small bug batch: saved-room "yours" mark + the untested order paths (lane A, after BH5)
- From BH4 (STATUS idea 11): after "Make host" (or after acting as host while the host was away) the old host's saved-
  room row stays marked as theirs and its ✕ shows the "removing also unsaves" warning; clear `mine` when `members`
  names another host, without flicker before the members arrive.
- From BH5 (`order-of-things.md`): the two paths without a test: the `version` error (an old client sees only the
  "refresh the page" screen: no tips, intro or invite) and the TV guards (a harness check if cheap, else a note why).
- Done when: each fix has a test that failed first; the order doc lists a test for every path.

### R19. Same browser, same name and avatar = one person (Planner's decision, owner's question)
- Owner: in the same Chrome he opened the room twice with the same name and avatar and saw one person.
- Decision (Planner): this is on purpose and stays. A browser with the same name is the same person: their room tab
  and their film-page tab, or two tabs they opened by mistake, must count once (people count, host rights, voice, the
  person menu). R11 fixed the real bug: two *different browsers* with the same name and avatar are two people. To test
  as two people alone, use another browser, a private window, or a different name in the same browser (R16 / R17 make
  that case work fully).
- No code. If the owner disagrees, this becomes a card.

## Owner's test round 1 (3 Nov 2026, 0.9.97.5): results and new cards

The owner tested the solo list (home, join, empty room, YouTube, film page, popup). Passed: the home page, the continue
line, the footer links, English first + remembered TR, the intro, the 🔒 Privacy link, friendly room names, the invite
window + QR, the empty room's rail, Share, ⋯ More windows, `?`, 🔍 + YouTube attribution, paste / drop a link, the
rail at the edge (window + fullscreen), YouTube captions / quality, keyboard Tab + dialog focus, the extension page's
two lines, the popup's logo, film-page fullscreen emojis / messages. Both repo secrets are added (live in 0.9.97.5; the owner still tries the
feedback form and the usage command). Not yet tried: games, move to another device, phone-only, together tests. The Developer
who takes a card below also ticks the matching hand tests in `STATUS.md`.

**Owner's open items from this round (try later, he asked to note them):** the YouTube usage command answered 403
(the value he typed is likely not the stored `USAGE_TOKEN`; he will make a new one once, save it, update the secret,
and try after the next deploy). The feedback form works (an issue came in). Dependabot #216 / #217: the owner asked the
Planner to merge them once main is green.

**Run order (rebalanced 4 Nov 2026, updated 03:30 UTC):** lane B: R1 ✅ → R2 ✅ → R3 ✅ → R4 ✅ → R5 ✅ → R6 ✅ → R8 ✅ →
BH2 ✅ (#239 stream after reload, #240 rail slide, #241 Five Frames streak; 0.9.97.17 / .18 / .20). Lane A: R3-6 ✅ →
R3-8 ✅ → R11 ✅ → R12 ✅ → R14 ✅ → R13 ✅ → BH1 ✅ → R7 ✅ → R9 ✅ → R10 ✅ → BH3 ✅ (#242, .19) → C1 ✅ (#243, .21) →
BH4 ✅ (#244, .22: lane A code sweep, one bug). Design: R14 ✅. Both lanes are empty until the owner's next round.
Main's runs cancel each other: never merge into main while another deploy runs; whoever merges second takes the next
free version number.

### BH2. Bug hunt: lane B's harness pass + feature sweep (lane B, after R8)
- Why: before the council review and 1.0, every harness must be green on main and lane B's features read against their
  cards for edge cases.
- Done when: sweep (100 screens), phone, tablet, a11y, yt-room, cinema, embed (headful), voice, live, games-gallery,
  side-games-polish, room-more and invite all pass on main; each regression is root-caused and fixed (no skips); the
  side games, stream resume, rail, film-page edge and games hall are swept for edge cases; the ~200 ms rail-before-the-
  player item (low). Findings that change owner-picked behaviour go to "Proposed".
- Tests: the harnesses themselves, new regression checks per fix.

### BH3. Consistency + server-side bug hunt (lane A, after R7 / R9 / R10)
- Why: ROADMAP §5 "Consistency": the same numbers in code, privacy policy, help page, UI and store texts; the new
  server paths (knock, private messages, person key, stream / game resume, fallback pacing) need edge-case cover.
- Done when: every user-readable limit and retention matches the code (EN + TR policy and help, UI, `web-store.md`); the
  help harness also checks the privacy policy's numbers; edge cases (reconnect during a knock, a private message to
  someone who left, host handover while people knock, TV + knock…) each have a test and a fix if broken; old Turkish
  names in English-first places are listed (not renamed yet).
- Tests: help harness, new e2e checks.

### BH1. Bug hunt: stale voice-harness checks + one retry warning (lane A)
- Why: `scripts/harness/voice/run.mjs` has two checks that fail on main too (the sine-wav energy check and the pre-6g
  "free tiles" check); `handover.mjs` once passed only on its retry in live e2e.
- Done when: each has a written root cause and a fix in the test or the code (no skips); the voice harness passes;
  handover passes on the first attempt three deploys in a row.
- Tests: the voice harness, live e2e.

### R1. Fix: opening a game throws people out of the room / the stream (owner's bug, urgent; lane B)
- Why: owner: pressing a game can throw you out of the site and out of a running stream; back in, the game opens only
  on the second try. Friends also saw someone "randomly gone, or thrown out and straight back" while streaming:
  probably the same root (a room connection closed and reopened). Check 0.9.96.24's "close a connection without
  hello after 15 s" and 0.9.96.25's "one hello per game object" first.
- Done when: opening, joining and closing each game (Together + On the side) with two people, one streaming and both
  in voice, never drops a room connection, the stream or voice; the game opens on the first press. The root cause is
  written on the card.
- Tests: e2e (a game opened while another member streams: no close event on any room socket; `trace.mjs` logs
  closes), harness for the first-press open, owner's hand test with a friend.
- Done: 0.9.97.8 (https://github.com/alperenakturk/screen-with-me/pull/225). **Root cause:** opening a game never closed a room connection (two people, voice + a
  stream, all five room games, locally: no close). What closed them was the deploys: each one restarts the room's
  object and closes every room connection (the owner tested while ~10 versions went live). Voice came back with the
  same member id (0.9.91.16), but the page ended the stream and the watching on every welcome ("randomly gone, or
  thrown out and straight back"), and a game pressed while the connection was down was lost (`send` dropped it), so it
  opened only on the second press. Now the stream and the watching resume (`LiveP2p.resume`, grace for a missing
  member), and a table asked for meanwhile goes out after the welcome. Not the 15 s no-hello rule (the room's hello
  goes out on open) nor the one-hello rule (game pages send one hello per socket).

### R2. Fix: Enter opens the chat at once (owner's bug, important; lane B)
- Why: owner: in the room, the first Enter opens an empty side panel, only the second opens the message box.
- Done when: one Enter puts the cursor in the message box wherever the chat lives (side panel, side panel hidden,
  fullscreen, cinema mode, Shorts); never an empty panel.
- Tests: harness (one key press → `document.activeElement` is the message box in each view).
- Done: 0.9.97.11 (https://github.com/alperenakturk/screen-with-me/pull/231). Two causes: in cinema mode the side panel is off screen, and Enter focused its hidden chat
  box (nothing happened); in fullscreen and cinema the rail's message window opened while the resting rail was still
  `visibility: hidden`, so its box could not take the focus (an empty window, the second Enter put the cursor in). Now
  Enter opens the rail's message window where the panel is not on screen (`fullscreen.openChat()`), and that window
  focuses its box again a frame / 120 ms later. Harness `scripts/harness/enter-chat/run.cjs` (8 checks; 2 fail on
  0.9.97.8). Shorts keep their own message box (unchanged).

### R3. Fix: YouTube fullscreen shows a big black strip on the right (owner's bug; lane B)
- Why: a friend's YouTube fullscreen had a wide black strip from the side column (screenshot in the Planner's
  session; the owner also still sees a dark strip with nothing going on). 0.9.93.20 / card 6d meant the column opens
  only for a note, cameras or a message.
- Done when: in YouTube fullscreen the player fills the width beside the resting rail unless the side column really
  shows something; the column never stays open empty (also after a camera / message / note went away, a stream ended,
  or the friend's window size changed).
- Tests: `yt-room` harness: fullscreen with nothing, after a message (8 s), after cameras off; screenshot check of the
  right edge.
- Done: 0.9.97.12 (PR below). Cause: the column opened for the camera box whenever it was on screen, also when the
  person had dragged the cameras onto the player (a place they chose: the cameras stayed there and the column beside
  stayed open and empty, a black strip) and when the box held only cameras hidden "for me". Now only camera tiles that
  show count, and once the column had time to place them (700 ms) cameras sitting outside it don't hold it open (until
  the cameras or their places change); the camera box's tiles are watched too. Harness
  `scripts/harness/yt-fs-side/run.cjs` (6 checks; the dragged-camera one fails on 0.9.97.9).

### R4. Fix: T (cinema mode) works in fullscreen too (owner; lane B)
- Why: owner: in fullscreen T switches cinema mode on behind the fullscreen, so nothing visible happens.
- Done when: T in fullscreen leaves fullscreen and opens cinema mode; T / Esc in cinema mode leave it as before.
- Tests: cinema harness.
- Done: 0.9.97.12 (PR below). The T key (and the rail's ⋯ → Cinema mode) did nothing visible in fullscreen: the key
  handler skipped fullscreen, the menu turned cinema on behind it. Now turning cinema on from fullscreen leaves
  fullscreen first, and T in fullscreen always means "cinema mode". Cinema harness: a new check (fails on 0.9.97.11).

### R5. Film page: the rail's edge a little wider (owner; lane B)
- Why: owner: on the film page out of fullscreen the mouse has to go very far right to open the rail.
- Done when: the rail opens when the mouse reaches about the last 40 px of the film (Developer picks the number; still
  no jump when the mouse only passes); fullscreen unchanged.
- Tests: embed harness under `xvfb-run`.
- Done: 0.9.97.13 (PR below). The overlay only hears the thin 14 px gutter beside the film (the film's own frames get the
  mouse inside it), so the extension's film frame now tells the site when the mouse enters / leaves the last 40 px of
  the synced video (`FILM_EDGE`, `{type:'activity', edge}`, sent at once on the change, not throttled); the site treats
  it like its own edge strip (`fullscreen.poke(edge)` → `setNear`, still after OPEN_MS 140 ms, so a mouse passing by
  doesn't make the film jump). Fullscreen unchanged (the same signal there). Older extensions send no `edge`: the
  gutter as before. Embed harness (headful, `xvfb-run`): a new check, fails on 0.9.97.12.

### R6. Invite window: "show this when I'm alone" moves to Settings (owner; lane B)
- Why: owner: the invite window should always open by itself; the tick box does not belong in it. Whoever wants it
  off finds it in Settings.
- Done when: no tick box in the invite window; ⚙️ My screen has "Open the invite window when I'm alone in a room"
  (default on, the same `opt:autoInvite`).
- Tests: invite harness.
- Done: 0.9.97.13 (PR below). The tick box left the invite window; ⚙️ My screen has "Open the invite window when I'm alone
  in a room" (`#opt-autoinvite`, the same `opt:autoInvite`, on by default). Invite harness updated.

### R7. The intro for invited people too (owner; lane B)
- Why: owner: people who open an invite link should also see the Sidelit intro (light burst + Glowbeam).
- Done when: the intro plays once for everyone who enters a room from its link (first entry in that tab), not only for
  the one who created it; still not on a reload, in the shell or on a TV; reduced motion as before.
- Tests: intro harness (a fresh browser opening `/r/<id>` sees it).
- Done (0.9.97.16, built by lane B, shipped by lane A): the intro played only when the join step was not skipped, and
  from the start of the room page, so since R12 someone waiting at the door ran it out behind the waiting card, and a
  first entry through `#back` (the extension's "open the room") never got it. Now `startRoom` works out `introDue`
  (not a TV, not the shell, `in:<room>` not yet set in this tab) and plays it on the first `welcome`. Intro harness: an
  invited fresh browser sees it, a reload doesn't, a `#back` first entry does once, a knocker sees it after being let in.

### R8. Faster games tutorial and theme previews (owner; lane B)
- Why: owner: the "How to play" cards appear late, and the theme picker's previews load slowly.
- Done when: the how-to-play cards show with the game window (preload the chunk / art when the games window opens);
  the theme previews appear at once when the theme window opens (small preview images or preload on hover / open).
  The room page's JS / CSS budgets still pass.
- Tests: harness timing (cards visible ≤ 150 ms after the game opens; previews painted when the window opens).
- Done: https://github.com/alperenakturk/screen-with-me/pull/237 (0.9.97.15): the games hall imports the three side games' chunks when it opens (art and
  cards are inlined in them); the profile menu / "Change theme" / 🎨 fetch every offered theme's preview pictures.

### R9. One place for each thing: ⋯ More and the profile menu (owner: "you choose"; lane B)
- Why: owner: Feedback, Help, Privacy, Recap show in both menus; rarely used things can live in Settings.
- Planner's pick (the owner left it to us): **⋯ More = the room** (Film time (host), Save the room, Room rules, Today's
  recap, Sync test, Keyboard shortcuts). **Profile = me** (name, avatar, theme, language, Move to another device, then
  one small line: Help · Feedback · Privacy). "⟳ Reconnect" leaves the profile menu (the room-name dot and the "can't
  reach the room" card already reconnect). Nothing shows twice on a computer. On a phone ⋯ keeps its own one list
  (it is the only menu there), but without doubles. The 🔒 Privacy link stays reachable from the join card and the
  profile (L9).
- Done when: as above; Help / room-more / phone harnesses updated.
- Tests: room-more harness, phone harness.
- Done (0.9.97.16): ⋯ More = Film time (host), Save the room, Today's recap, Keyboard shortcuts (computer), Sync test,
  Room rules (`roomMoreItems`; Feedback / Help / Privacy left it). The profile menu = language, 📲 Move, name, avatar,
  theme, saved recaps, and one small line Help · Feedback · Privacy (`.profile-links`, ids kept). "⟳ Reconnect" is gone
  (the room-name dot and the "can't reach the room" card reconnect); its "Today's recap" button and ⌨️ stay in the
  page hidden for ⋯ More to press. The phone's ⋯ lost its "Language" tile (⋯ → Profile has English / Türkçe), so each
  tile shows once. Harnesses: room-more (the ⋯ list, the profile's line, nothing in both), phone (one list, ⋯ → Profile
  has language + privacy), feedback and help (opened from the profile line).

### R10. Room games: the window title is not cut in a narrow window (lane B, small)
- Why: B noticed "Tic-tac-… · started by Alex" in a narrow free window (outside GP's scope).
- Done when: the game's name always shows in full; "started by …" shortens or goes first.
- Tests: games harness at the smallest free-window size.
- Done (0.9.97.16): the head was one line, "name · started by …" as one cut string beside six buttons, so the name went
  first ("Tic-tac-to…" even at the default 400 px). Now the name and "· started by …" are two parts (the name never
  shrinks, the rest is cut first, the tooltip has it all), and a table's window under 460 px wraps its head: the title
  on its own row, the buttons on the next (the side games keep their one-row head, card GP). Checked at the free
  window's real sizes (400 / 280 / 180 px); games-gallery harness: a narrow window keeps the name whole and inside.

### R11. Fix: two people with the same name and avatar count as one (owner's bug; lane A)
- Why: owner: joining his own room from a second browser with the same name and avatar showed one person. Two people
  may share a name and a picture.
- Done when: people are told apart by their browser id (`cid`, never sent to clients; the server can send each member
  an opaque per-room person key), not by name + avatar: the people count, Together faces, People list, camera tiles,
  join sounds, "+N", per-person volume and the solo games' "others" all count two people; the same person's two tabs
  (same cid) still count once. Stored per-person settings keyed by name + avatar keep working (fall back to them).
- Tests: e2e (two cids, same name + avatar → count 2; one cid, two tabs → 1), unit for the person key.
- Done (0.9.97.7): the server gives every member `pk`, an opaque per-room person key (the first 8 bytes of SHA-256 of a
  random per-room salt, storage `personSalt`, and the browser key; the same for one browser's tabs and its paired TV,
  different in another room, never the cid). Shared `personOf(m)` (pk, else name + avatar as before) and `personKey`
  (the join sounds' `JoinFilter`) group people: the room title's count, the Together faces, the camera tiles' "one per
  person" and "my other tab", the games hub's "who is at this table", the solo games' others, the TV faces and the
  debug panel. What is stored per person (volume, hidden / pinned cameras, tile places) stays keyed by name + avatar.
  The People list shows connections as before. Tests: e2e `people.mjs` (two browsers, same name + avatar → two keys;
  one browser's two tabs → one; no cid on the wire; another room → another key), unit `personOf`, `JoinFilter`.

### R12. "Ask before letting people in" (owner's idea; Planner: yes; lane A)
- Why: owner asked for room security options. A room link can leak (a screenshot, a group chat); a knock really helps.
  A room password does not add much (it travels with the link through the same chat, and adds friction), so no
  password.
- Done when: a host switch "Ask before letting people in" (default off) in the invite window and in Room rules. When
  on, a newcomer (a browser id not seen in this room before) waits on the join card ("Waiting for the host to let you
  in…") and the host gets a card with name + avatar: Let in / Refuse. Refused = the same as a kick (ban by cid). People
  already in, the host's own tabs and reconnects within 24 h pass straight in. No host connected → the newcomer waits
  (with a note), never let in by default. Server-side check (nothing joins before the host's yes); limits so a flood of
  knocks cannot spam the host.
- Tests: e2e (knock → let in / refuse / host away), harness for the cards, owner's hand test with a friend.
- Done (0.9.97.9): `settings.knock` (host; Room rules `#opt-knock` and the invite window's `#invite-door`). The server
  decides in `join()` before anyone gets a name or a seat (`mustKnock`): a browser id not in `admitted` (24 h after it
  was last in, ≤ 500, storage) waits as a knocker (no `welcome`, no member); turning the switch on admits everyone
  present. The host's tabs get `{t:'knocks', list}` (name + avatar, cleaned) and answer `{t:'knock-answer', id,
  allow}`: yes → admitted + joined, no → banned like a kick (4003). Knockers get `{t:'knock-wait', hostHere}`; nobody
  is let in without the host; ≤ 8 at the door and ≤ 2 per IP hash (`knock_busy`, 4010), each waits ≤ 10 min (4011).
  Tests: e2e `knock.mjs` (12), harness `scripts/harness/knock/run.cjs` (6).

### R13. Private messages in the chat (owner's idea; lane A, after R12)
- Why: owner: sometimes you want to tell one friend something without the whole room.
- Done when: in the chat (and the person menu) "Message privately" sends `{t:'chat', to}` only to that person's
  connections and back to me; it shows in both chats marked "🔒 Private · to Alex" / "from Alex"; never in the room's
  stored 50-message history, never to other members, the host or a TV; same limits and `cleanText` as chat. Phone +
  computer.
- Tests: e2e (a third member never receives it, not in the history after a reload), harness.
- Done (0.9.97.14): `{t:'chat', text, to}` (text only). The server sends it to the recipient's connections (not their
  TV) and the sender's, never into the history or to anyone else, `private_gone` for myself / someone gone. In the chat a
  press on someone's name, on a private bubble's label or "🔒 Message privately" in the person menu writes to them only
  (bar "🔒 Only Alex will see this", ✕ / Esc back); bubbles say "🔒 Private · to / from Alex". Tests: e2e `private.mjs`
  (9), harness `scripts/harness/private/run.cjs` (13, computer + iPhone).

### R14. Better parody avatars + two new anime characters (owner; Design, then a Developer card)
- Why: owner wants every parody avatar redrawn more detailed and cuter, two new anime parodies (a calm genius student
  with a notebook; a messy-haired detective crouching in a chair with sweets), and the white-haired monster hunter
  (`hunter`) moved from Series to Game.
- Rules (CLAUDE.md "Avatars", store + copyright): parodies only hint at a style: no names, logos, exact costumes or
  real actors' likeness; the ids and labels stay generic.
- Done when: Design's option page shows the redrawn set; the owner picks; a Developer card ships them
  (`scripts/avatars.mjs`, `DRAWN_AVATARS`, `AVATAR_PAGES`, i18n labels).
- Owner's pick (3 Nov 2026, https://claude.ai/artifact/Akp2qt2WPXzxVENiAZ8Hha): **1: A** (today's line, more detail;
  not the sticker style) · **2: A** (near-copies made our own). Note: "fit our style, but still look like the character,
  not something unrelated": recognisable by silhouette, hair, colours and props; the distinctive costume parts are ours.
- Design done (PR #229, review sheet https://claude.ai/artifact/FsBkvfQUPZ6w2yscbX18cd): 33 SVGs in
  `docs/internal/design/avatars-2/full/`, steps in `avatars-2.md` "For the Developer". **Developer part: lane A, right
  after R12, before R13** (copy via `scripts/avatars.mjs`, `DRAWN_AVATARS` notebookgenius 📓 / sweetsleuth 🍰,
  `AVATAR_PAGES` both on page 3 and hunter to page 4, i18n labels; check the picker, 28 px chat, seats, join card).
- Done (0.9.97.10): `scripts/avatars.mjs` copies `docs/internal/design/avatars-2/full/*.svg` over its parody drawings
  (31 redrawn + 2 new in `apps/web/public/avatars/`; the extension has no avatar copies since the shell), `DRAWN_AVATARS`
  + `AVATAR_PAGES` (Film 8 · Series 14 · Anime 9 · Game 2), EN + TR labels. Checked in Chromium: the picker's four
  Parody tabs and a sheet at 28 / 52 / 84 px.

## Run order to the owner's test round (owner, 3 Nov 2026: "do all of 1–11, I test everything at the end")

Two Developer lanes so the work moves faster; lane B lives mostly in new files (games, players) and rebases on lane A.
Each card still ships with its tests; hand tests go to `STATUS.md` for the owner's one big test round at the end.

**Lane A (Developer, `session_015Fyri2WkmxwEfieZ1jto4L`):** 6d → 6e empty-room rail → **R3-1** (high, right after 6e) →
6c Sidelit (0.9.95) → 6f Glowbeam mascots + intro → 9 feedback button (with R3-7) → 10 Shorts channel + country → 11 thanks page → 12 debug panel → **6g owner's feedback batch** →
14 cinema mode → 16 design sweep → **15b new home page** (after the owner's pick) → T tablet → A11y accessibility → **Y1 → Y2 → Y3** (YouTube audit prep) → security
cards (M2, M3, M4, M5, M6, L1, L4, L2+L3+L5, L6, L7+L8, L9, L10, R3-2, R3-5, R3-6, R3-8; M8 stays with the frozen TV;
R3-3 goes with the domain) → the Security session's new findings → bug-hunt findings. Everything here lands by
**0.9.99** (owner, 3 Nov 2026: version plan in `ROADMAP.md`).
**Lane B (Developer B, `session_015Fyri6bkmZm4WdgzAWHpMc`):** 🍿 Snack Bar → GG games gallery window → 🌱 Window Garden → 🔤 Five
Frames (the daily word game) → move-to-device code → **GP side games polish** → P2 podcasts (P1 Vimeo done in 0.9.93.21).
**Not in this round:** 13 Shorts measurement (needs the owner's real Chrome; part of his test round), Shorts door
(0.9.95+ growth), G1–G5 (launch), the privacy policy rewrite + terms (the "official work" step after the test round).
**After both lanes:** Planner runs the council review (harsh feedback on the whole app), then a bug hunt. **Gate (owner, 3 Nov 2026):** the council waits until the owner has done his solo hand tests (the Planner's list of things that will not change) and added the two repo secrets `FEEDBACK_GITHUB_TOKEN` and `USAGE_TOKEN`; his test results go into the council's brief.

_Order agreed with the owner on 2 Nov 2026. Cards 1–5 close the 0.9.93 gate (owner-reported bugs + hand tests); the
rest is 0.9.94. The owner's picks on https://claude.ai/artifact/9AJXCNuwBojdibzZaX1baw: 1 = C + D, 2 = A, 3 = A, 4 = A, ideas as proposed._

### 6c. Rename the product to Sidelit + the new logo and mascot (owner's decision, 3 Nov 2026; after 6b, before 15)
- Why: owner: "change it straight to Sidelit now: the notes, the READMEs, the logo, the site, everything". The name
  is his call (council + research: `name-ideas.md` round 3, `research/name-sidelit-check.md` 🟡, trademark / domain
  checks still to do by the owner before 1.0). Logo D1 "night gold", mid-tone T1 deep teal (only where a second colour
  helps; if two colours confuse, the main logo alone), mascot N1 Glowbeam: `docs/internal/design/logo-sidelit.md`
  (Design session).
- Done when: every user-facing text says Sidelit (site pages, titles, meta / Open Graph, manifest + PWA name, i18n EN
  + TR, help / privacy / extension pages, invite texts, the extension's name, popup, store texts in `web-store.md`,
  `store/src` shots, README.md + README.tr.md); `logo.ts` + `make-icons.mjs` draw D1 (with the ≤ 32 px simple cut),
  icons / favicon / apple-touch / maskable regenerated, the mascot N1 replaces the old face where the mascot appears
  (home preview, empty states, theme mascots only if cheap, else a follow-up card); docs and CLAUDE.md say Sidelit
  for the product ("formerly ScreenWithMe" once in README / CLAUDE.md). **Unchanged on purpose:** the live address
  (`screen-with-me.swm-server.workers.dev` until the own domain), the repo name, storage keys, message `source`
  strings, protocol, the extension id: nothing a user has saved breaks.
- Tests: all harnesses / e2e pass; a grep check in CI (or a unit test) that no user-facing string says "ScreenWithMe"
  except the "formerly" lines; icons readable at 16 px (screenshot); owner's hand test (home, room, extension popup,
  phone home-screen icon).
- Owner's pick: done (Sidelit, D1, T1, N1). **Release it as 0.9.95** (owner, 3 Nov 2026: "make it official, I'm
  speeding up the launch"); the remaining 0.9.94 cards keep their place after it.
- Done: 0.9.95 (PR below). Sidelit in every user-facing text (site, help / privacy / extension pages, i18n EN + TR,
  manifest, the extension's name and pages, store texts, `store/src`, READMEs with one "formerly" line); `logo.ts` draws
  D1 (`small` ≤ 32 px, `bleed`, the animated pause bars) and N1 (`mascotSvg` / `createMascot`, five moods);
  `make-icons.mjs` renders the PNGs with Chromium (16 / 32 simple cut, 48 / 128 full, PWA, maskable + apple-touch bleed
  on night) and writes `logo.svg`, `logo-small.svg` (favicon), `mascot.svg`, `mascot-waiting.svg`; the wordmark is
  Bricolage Grotesque ExtraBold self-hosted (`public/fonts/`, OFL licence beside it, no Google Fonts call); N1 on the
  home preview and (waiting) in the empty room. `scripts/check-name.mjs` runs in CI. Kept: the live address, repo,
  storage keys, `source` strings, protocol, extension id, publisher e-mail, and the zip / folder name
  `screenwithme-extension` (an unpacked extension's id comes from its folder; renaming it would lose people's
  settings). Follow-up for the Planner: the costumed theme mascots (`theme-art.mjs`, theme pickers) still wear the old
  purple face; N1 in costume would be its own card. Tests: all site harnesses, popup, embed (112 checks, headful).

### 6g. Owner's feedback batch (owner, 3 Nov 2026; lane A, right after 12)
- Why: the owner's screenshots and notes after 0.9.96.2.
- Done when:
  1. **The empty room's rail behaves like the rail with a video:** it opens when the mouse reaches the right edge and
     closes when it leaves (edge mode, the same timings), on the site and the film page; never "always out" anywhere
     on a computer (the owner: "it should not behave differently in each place"). Video-only buttons stay dimmed.
  2. **No "Games" in ⋯ More on a computer:** the rail's 🎮 is the one way in (owner: "not in two places"). Phones keep
     Games in ⋯ (they have no rail).
  3. **The join card picks a random themed avatar** (from the "Themed" page) for someone who has never chosen one;
     a chosen or saved avatar is kept.
  4. **No theme picker on the home page:** everyone starts on Gece; the theme is changed inside (⚙️ My screen / the
     profile menu), which already exists. A saved theme still applies.
  5. **Glowbeam's costumes sit right:** apply the Design session's fixed `glowbeam-<theme>.svg` files (the Gece
     nightcap sits too far right; Design checks all 11) when they land.
  6. **🔍 Search is an icon only:** a well-drawn search icon in our line-icon style (`ui/icons.ts`), no "Search"
     text, so the link box keeps its width; the button keeps its name for screen readers ("Search", `aria-label`).
  7. **Cameras start in the frame (one window), like Meet** (owner, 3 Nov 2026): no camera tiles and no "Pop out"
     button inside the Together card any more (the chat keeps its height); when the first camera turns on, the
     cameras open in the one window (`group` layout, the default for everyone, `opt:camLayout`), sized for its
     cameras side by side. The window's top buttons switch to the free layout; in the free layout the tiles start
     attached under the pill (the top bar of the cameras) and the person pulls one off by hand. An old saved `free`
     choice is kept only if the person picked it themselves (otherwise the new default applies once).
- Tests: voice harness (first camera opens the one window, no tiles in the card, switching to free keeps the tiles
  attached under the pill); room-more harness (no Games on a computer, Games on a phone); yt-room / embed (empty room rail rests and
  opens at the edge); home harness (no theme strip, Gece on a fresh browser); unit or harness for the random themed
  avatar; screenshots of the 11 mascots.
- Owner's pick: none needed.
- Done: 0.9.96.6 (PR below).
  1. The empty room's rail rests and comes at the right edge like the rail with a video (`fullscreen.ts` `railFixed` is
     now only "no video and no edge mode", i.e. touch screens without a mouse; the CSS rule that kept `.rail-bare` out
     is gone). Video-only buttons stay dimmed.
  2. ⋯ More on a computer has no Games (`room-more.ts`: `desktop` → no 🎮); phones keep it.
  3. The join card already gives a browser without a saved avatar a random one from the "Themed" page
     (`randomAvatar`, `AVATAR_PAGES[0]`); now covered by the room-more harness.
  4. No theme picker on the home page (`home.ts`; its texts `home.themes*` removed); Gece stays the default
     (`currentTheme`), a saved theme still applies; the home harness checks both.
  5. Design's fixed `glowbeam-<theme>.svg` (PR #182) copied by `theme-art.mjs` (8 changed); all 11 checked in a
     screenshot.
  6. 🔍 is a drawn lens only (`icons.ts` `search`), no text; `aria-label` / title "Search" stay.
  7. Cameras start in their own one window on the page (like Meet): no tiles and no "Pop out" / "⤓ back to the card"
     in the Together card (`cam-float.ts` never uses the card place; `opt:camFloat` is no longer read); the layout
     defaults to the one window (`group`), a saved `free` is kept (it was only ever saved by the person's own press);
     the window's switch goes to free tiles, which start attached under the pill.
  Tests: room-more, home, one-rail, cam-fs (cameras start in the one window, none in the card), yt-room,
  games-gallery, garden; the voice harnesses' pop-out / put-back steps changed to the new flow.

### 15b. New home page, tablet too (owner, 3 Nov 2026: "redo the home page; today's is okay, but it must look right on a tablet"; lane A, after 16)
- Why: the owner wants a fresh home design that works on computer, tablet and phone; the theme picker goes away
  (6g.4).
- Done when: the Design session's clickable options page → the owner's pick → built for computer, tablet (upright +
  sideways) and phone, EN + TR, no scroll inside sections, reduced motion respected.
- Tests: home harness at 1920×1080, 1366×768, 1180×820, 820×1180, 390×844; phone-speed budget.
- Owner's pick (3 Nov 2026, https://claude.ai/artifact/AMuQiAM7itZuXchbzKDRUS): **1 A** "light beam" (Glowbeam
  shines its light on the shared screen), **2 A** a short intro section under the first screen, **3 A** no video link
  box on the home page anywhere (videos are added in the room). Build notes: `docs/internal/design/home-15b.md`
  (Design session), including sweep-1 #10 (beam over the heading) and #11 (empty phone space).
- Done: 0.9.96.12 (PR below). `home.ts` + a lazy `home.css` built from Design's direction A: first screen (pill, slogan,
  line, Create room / Join with a code, save box, continue line; Glowbeam's light on the shared screen; three feature
  cards), then "How it works" (steps, extension card, saved rooms, Help). No link box, theme strip, doors or chips; no
  🎨 on the home page. Computer / sideways tablet two columns, upright tablet centred with the art on top, phone (this
  replaces 0.9.92.5's start screen). Sinema gets the text backdrop; reduced motion stills the bar and the beam. The home
  texts moved out of `i18n.ts` (room JS 140.1 → 138.3 kB, CSS 36.8 → 34.8 kB). Home harness rewritten (5 sizes × EN +
  TR, create with a saved name, join box, continue line, contrast, reduced motion, Sinema); room-extras and phone home
  checks updated; phone speed, sweep pass. Found and fixed on the way: a 200-character video title pushed the continue
  line out of the column.

### 6f. Glowbeam mascots per theme + the Sidelit intro (lane A, right after 6c; from the Design session)
- Why: card 6c brings the new name and logo; the theme mascots and the intro animation still show the old face and
  logo. Design delivered both (PR #161): `docs/internal/design/themes/` (11 `glowbeam-<theme>.svg`, drop-in for
  `<id>-maskot.svg`, steps for `theme-art.mjs` in its README) and `docs/internal/design/intro/` (storyboard with timings,
  easings, keyframe SVGs and a reduced-motion still). Preview: https://claude.ai/artifact/6Ce98qjeANVeUota34uLec
- Done when: every theme shows its Glowbeam (eyes always visible); the intro follows the storyboard on the existing
  sound beats (0 / 0.72 / 1.1–1.4 s, `INTRO_MS` 2700) on the site and in the extension; `logo.ts` has `light` and `eyes`
  as separate parts; reduced motion = the still frame fading in and out; "Enjoy the show!" in EN + TR.
- Tests: home + theme harness screenshots of all 11 themes; an intro harness checks the parts appear on the beats and
  that reduced motion shows no movement; size budget still green.
- Owner's pick: none needed (direction picked: D1 + N1).
- Done: 0.9.95.6 (https://github.com/alperenakturk/screen-with-me/pull/168, together with 6e). Intro: `intro.ts` rebuilt from `preview.html` 1:1 (same timings and
  curves, classes prefixed `swm-intro-`, sizes scaled from the logo's `--s`); the logo's `logo-light` (cone + bloom) and
  `logo-eyes` groups from `logo.ts` animate; Glowbeam is `createMascot` (happy; default in the reduced-motion still);
  no pause bars any more. Themes: `theme-art.mjs` copies `docs/internal/design/themes/glowbeam-<theme>.svg` to
  `<theme>-maskot.svg` (the old purple-face drawing code is gone), so the home preview, theme strip, theme dialog and the
  empty room show each theme's Glowbeam; 6c's single-mascot override is removed. Test: `scripts/harness/intro/run.cjs`
  (light off at 0.3 s, burst + eyes by 1.15 s, Glowbeam out and logo slid by 1.5 s, line by 1.8 s, faded by 2.65 s,
  removes itself; reduced motion: only the frame fades, every part in place). The film page uses the same site intro.

### 6e. The rail in the empty room too (owner, 3 Nov 2026; lane A, after 6d)
- Why: owner: before any video, people should already be able to open the camera, join voice, open a game or emojis.
- Done when: in `.room.fresh` the right rail shows 😀, 🎮, 🎙, 📷, ⋯; video controls (play / pause, speed, next, pin,
  sync, ⛶) are dimmed and only show "add a video first" when pressed. Changes card 6's "D" on this point only.
- Tests: room-more / fresh harness: rail visible in an empty room, 🎮 opens the games, 🎙 joins, play / speed disabled.
- Owner's pick: done.
- Done: 0.9.95.6 (https://github.com/alperenakturk/screen-with-me/pull/168, together with 6f). `.room.fresh` no longer hides `#fs-dock`: the empty room has the rail (😀, 🎮, 🎙, 📷, ⋯, ⛶);
  the controls that need a video (⛶, speed chips, sync, next, ⏯, 📌 once a video has a length) carry `aria-disabled`, are
  dimmed and answer a press with "Add a video first" (`NEEDS_VIDEO` in `fullscreen.ts`, a capture-phase click). Found
  on the way: the rail's "mouse left the rail" timer sent its outside press even when no rail window was open, so a
  window opened elsewhere within 450 ms (⋯ More → Games) closed again; it now fires only with a rail window open.
  Tests: `room-more` (rail and its buttons in the fresh room, ⛶ / 2× answer "Add a video first" and change nothing, 🎮
  opens the games, 🎙 starts joining voice, ⋯ → Games stays open; failed before), `one-rail`, `yt-room`, `phone`,
  `room-extras`, `embed` (headful).

### GG. Games gallery window with covers (owner, 3 Nov 2026; lane B, after Snack Bar)
- Why: owner: pressing games should open its own window where every game shows as a card with its cover, and the
  player picks from there.
- Done when: 🎮 opens a window (free window / side panel / phone sheet, no scrolling) with cards + covers for XOX,
  Connect Four, Draw & Guess, Quiz (room games) and Snack Bar, Window Garden, the word game ("play on the side"); a
  card opens its game the same way as today; covers from the Design session.
- Tests: harness: the gallery opens from the rail, the phone ⋯ and the Shorts bar; every card opens its game; fits at
  340×300 and 360×460.
- Owner's pick (3 Nov 2026, https://claude.ai/artifact/XsUvwg9YL6KugDVP6VggMR): layout **B, two tabs** ("Together" / "On the
  side"), covers ~160 px, the side tab shows each game's progress, reopens on the last tab.

### T. Tablet layout (lane A; 0.9.95 gate)
- Why: ROADMAP §1 "Tablet support": iPad / Android tablets upright and sideways get their own layout (today tablets
  fall between phone and computer).
- Done when: room, Shorts view, games, cameras, rail and fullscreen fit 768–1366 px touch screens upright and sideways
  without scrolling; iPad fullscreen and split view handled; no extension on tablets (site only).
- Tests: a `scripts/harness/tablet` (iPad + Galaxy Tab emulation, both orientations); owner's real tablet later.
- Design: `docs/internal/design/tablet.md` (Design session, PR #173): sideways keeps the computer layout (taller video,
  games in the video's place, 44 px touch targets); the Shorts bar in one row; check the Android tablet's resting rail
  (opacity 0, the touch 30 % rule does not apply). Accessibility notes for card A11y: `docs/internal/design/a11y-1.md`.
- Owner's pick (3 Nov 2026, https://claude.ai/artifact/GXitrW7UaKsiWHBtWzk4Mw): upright tablet = **B**, a tablet
  layout: the video on top, two columns below (chat; Together + Queue / People), no page scroll, the rail beside the
  video, never over it.
- Done: 0.9.96.10 (PR below). `device.ts` `isTabletUpright()` (touch, no mouse, not the phone layout, upright by width
  like `sideways`, ≥ 701 px) → `<html class="tablet-up">`; `tablet.css` is a lazy stylesheet loaded only on a touch
  screen without a mouse. Upright: the page never scrolls, the link box on one row, the video card as wide as the
  window but ≤ 52 % of the height, the rail beside it; below, `.side` is a grid (chat 1.5 fr with its own card; Together,
  then the Queue / People tabs in 1 fr; `.tabs-card` is `display: contents`, no Chat tab). `ui/tabs.ts` has a split mode
  (the chat always shown, the tabs pick Queue / People; `chatShown` for the chat sound). Games open in the video's place
  (`games/stage.ts` treats an upright tablet as wide). Sideways and upright: the rail at full opacity (the idle rule
  hid it on Android tablets) with 44 px buttons; the Shorts bar is icons only on one row. "Fullscreen when turned
  sideways" is now off unless chosen (sideways is the computer layout). Cameras keep card 6g's one window (the design
  note predates it). Room JS budget raised to 145 kB (140.1). Harness `scripts/harness/tablet/run.cjs` (iPad 820×1180 ↔
  1180×820, Android 768×1024: 90 checks); `phone` harness's theme checks updated for 6g.

### A11y. Accessibility pass (lane A; 0.9.95 gate)
- Why: ROADMAP §1 "Accessibility": WCAG AA contrast (with the new Sidelit colours), keyboard tour, focus states,
  screen-reader labels, reduced motion.
- Done when: an automated contrast + label check (axe-core in a harness, dev-only dependency) passes on home, join,
  room, settings, help; every control reachable and visible with the keyboard; reduced motion respected everywhere.
- Tests: the axe harness in CI; a keyboard-tour harness.
- Owner's pick: none needed.
- Done: 0.9.96.13 (PR below), from Design's `a11y-1.md`. Keyboard: a "Skip to the content / the video" link first
  (K1); a Tab press wakes the resting rail so its buttons come right after the video (K2, `fullscreen.ts`); the ⋯ More
  menu follows the menu-button pattern (`ui/menu-keys.ts`: first item focused, ↑ ↓ Home End, Esc back to ⋯) (K3);
  every `.dialog-backdrop` dialog keeps Tab inside and gives the focus back to its button (`ui/dialog-focus.ts`) (K4);
  a focus ring on the video (K5); the first tips are named and their "Next" takes the focus unless you are typing
  (K6). Names / roles: the games hall is a named dialog of buttons (S1), the XOX board a "Game board" group whose cells
  say "Row 1, column 2, empty" (S2), the chat list a real list with a polite live region (S4), the room name is the
  page's `h1` (S6). Contrast: the primary button's hover gets darker (4.3:1 → over 4.5:1; Neon, with dark text,
  lighter). Targets: the connection dot 24 px, "Show activity" 28 px. Kept on purpose: the mic / camera buttons name
  the action ("Mute" / "Unmute"), so no `aria-pressed` (S8), and red = off stays the owner's pick. Also the
  Planner-approved fix: a "can't be played" note sits above the message box on a computer and no longer makes the room
  scroll (a new `room-error` screen in the sweep). Harness `scripts/harness/a11y/run.cjs` (axe on home, help, join,
  room, settings, invite, games hall, tic-tac-toe, first tips, computer + phone; keyboard tour) runs in CI (axe-core
  and Playwright installed for that step only).

### P1. Vimeo player without the extension (lane B)
- Why: owner's idea (2 Nov 2026), Research's #1 (`research/more-players.md`): full control via player.js.
- Done when: Vimeo links play on the site in sync (play / pause / seek / time; rate fixed at 1× unless PRO), CSP +
  privacy policy updated, title from oEmbed.
- Tests: a harness with a fake player speaking player.js's postMessage protocol (like `tiktok/run.cjs`); owner's real check.
- Owner's pick: done (owner: "do all of 1–11").

### GP. Side games polish (owner, 3 Nov 2026; lane B, after the move code, before P2)
- Why: owner, on Snack Bar / Window Garden / Five Frames: "make them sweeter and more polished", "the fonts feel
  small", "give a visual tutorial when each game starts, this is important", "each game should open at its ideal
  size", and Five Frames "is not clear".
- Done when:
  1. **Ideal size:** every game opened in the side window (solo games and the room games) opens at the size its
     content needs (`SOLO_CATALOG` size / fit, room games too), never with a large empty area or a cut layout; it
     stays resizable in proportion.
  2. **Bigger, clearer text:** body text ≥ 15 px, numbers and titles larger; checked at 1366×768 and on a phone.
  3. **Visual tutorial on first open:** 2–4 short cards with simple pictures (Design draws them) the first time a game
     opens (per game, `localStorage`), "?" in the game's head shows it again; skippable; EN + TR.
  4. **Sweeter look:** the Design session's polish for the three games (motion, small sounds kept quiet, rewards).
  5. **Five Frames:** green = right letter in the right place, yellow = in the word but elsewhere, grey = not in the
     word (owner's request; our own shades that fit the theme + a ✓ / • mark for colour-blind players, a small
     legend under the board); a row flips letter by letter, fast (about 250 ms per letter), like the familiar daily
     games, after Enter; typing pops each letter; reduced motion = no flip. Own name and board shape stay.
  6. **Credits out of the game:** the word-list credits link leaves the game; the credits stay in
     `/third-party-notices.txt` (Apache 2.0 for the Zemberek list needs them) and get a small "Licenses" link in the
     footer and on the Help page.
- Tests: harnesses per game (opening size at 1366×768 and 1920×1080, tutorial once, no scroll); Five Frames unit
  tests for colours with repeated letters; reduced motion; owner's hand test.
- Owner's pick: none needed (Design delivers the look; the colours are the owner's request).

### P2. Podcasts (lane B)
- Why: Research's #2: iTunes Search (free, no key) → RSS → the episode is an audio file our `html5` kind already syncs.
- Done when: a podcast search (words in the link box with a "Podcasts" source) lists episodes; one plays in sync for
  everyone with an audio-only view (cover art, no video box); CSP `media-src` widened only as needed (security review).
- Tests: unit (RSS parsing), harness with a local RSS + mp3; owner's real check.
- Owner's pick: done.
- Done: 0.9.96.5 (https://github.com/alperenakturk/screen-with-me/pull/185). "🎧 Podcasts" on the link box's YouTube
  results → shows (Worker `/api/podcasts/search`, iTunes Search) → newest 30 episodes (`/api/podcasts/episodes`: Apple
  lookup → the feed address from Apple's answer only, read ≤ 4 MB) → ▶ Play now / queue. An episode is `html5` with an
  optional `poster` (only `*.mzstatic.com`), shown as the player's poster; CSP `img-src` + `*.mzstatic.com` only
  (`media-src` was already open). Unit `podcasts.test.ts`, e2e `podcasts.mjs`, harness `podcasts/run.cjs` (11).

### 3. Owner's hand tests 0.9.92.3 – 0.9.93.5 (0.9.93 "Now" 3)
- Why: the 0.9.93 gate needs them.
- Done when: every box in `STATUS.md` "Owner's hand tests" for these versions is ticked or turned into a bug card.
  The owner works from the ordered PDF checklist (2 Nov 2026) and sends results to the Planner.
- Tests: the owner's own (computer, phone, Shorts, first-time path, hotspot).
- Owner's pick: none needed.

### 9. "Send feedback" button (0.9.94 "Next" 3)
- Why: the closed beta and the launch need an easy way for people to tell us what broke (ROADMAP §2, §7).
- Done when: "Send feedback" in ⋯, the profile menu and the Help page opens a short form (what happened, optional
  e-mail, an unticked "attach technical info" box: site + extension version, browser, transport, last `/baglanti`
  result; never room id, names or chat); a Worker endpoint opens a `feedback`-labelled issue in the private repo with
  a fine-grained token (`FEEDBACK_GITHUB_TOKEN` secret, issues: write on this repo only); per-IP rate limit, no IP
  stored; e-mail addresses only in the issue body; privacy policy (EN + TR) names it.
- Tests: unit (payload builder, validation); e2e for the endpoint with the token off (`off` answer) and limits;
  harness opens the form on computer + phone; owner's hand test after the token is set.
- Owner's pick: A, in-site form → GitHub issue (2 Nov 2026). **Owner action:** create the token and add it as a repo
  secret when the Developer asks (steps in the PR).
- Done: 0.9.96 (PR below). Built from Design's `feedback-and-thanks.md` §1 and R3-7. Shared `feedback.ts` (validation:
  a type 🐞 / 💡 / 💬, 3–2000 characters, optional e-mail, whitelisted details; `neutralise` for `@`, `#123`, `GH-1` and
  fences; `buildIssue`: text in a ```` ```text ```` fence, labels `feedback` + `feedback:<type>`, the e-mail line with
  the 90-day note). Worker `POST /api/feedback` (`apps/server/src/feedback.ts`): own Origin required (403 without),
  body read as a stream ≤ 8 KB (413), `FEEDBACK_LIMIT` burst binding (3 / min / IP), then `FeedbackGate` (one Durable
  Object, migration `v7`: 3 per IP hash per hour, 50 per UTC day, hashes kept an hour) → `{error:'off'}` without
  `FEEDBACK_GITHUB_TOKEN`, else a GitHub issue. Site: `ui/feedback.ts` + `feedback.css` (lazy chunk with its own EN / TR
  texts) from ⋯ More (computer + phone, before Help), the profile menu (`#profile-feedback`) and the Help page
  (`/#feedback` opens it over the home page); details unticked by default with the exact lines shown; `/baglanti`
  keeps its last short result in `diagLast` for it. Privacy policy `#feedback` / `#feedback-tr` (90 days). The deploy
  step alone gets the token (R3-2 style). Tests: unit `feedback.test.ts`, e2e `feedback.mjs` (live: refusals only, never
  creates an issue; local: `off` + the hourly limit), harness `scripts/harness/feedback/run.cjs` (19 checks).

### 10. Shorts: a feed from one channel + Discover by region (0.9.94 "Next" 4)
- Why: owner, 1 Nov 2026: type a channel and get its Shorts; Discover should show the viewer's country.
- Done when: the ♾ window accepts a channel link / @handle / name and starts that channel's Shorts feed (uploads
  playlist, reusing the `like` path; cached per channel and day); Discover uses the connection's country from
  Cloudflare (`cf.country`, never stored) with a "🌍 Country ▾" chip of about 10 countries + "World" (one pool per
  kind + country + day); quota cost per new query written down; privacy policy mentions the country use.
- Tests: unit tests for channel input parsing; Worker e2e with `YOUTUBE_API_KEY` off and the region validated;
  `shorts-rail/run.cjs` still passes; owner's hand test with a real channel.
- Owner's pick: A, viewer's country, changeable (2 Nov 2026).
- Done: 0.9.96.1 (PR below). Shared `youtube-search.ts`: `parseChannelInput` (channel links `youtube.com/@name`,
  `/channel/UC…`, also with `/shorts`; bare `@name`; bare `UC…`), `channelParam` / `parseChannelParam`, `POOL_REGIONS` (12
  countries), `isPoolRegionChoice`, `poolRegion` (auto → `cf.country`, else en → US / tr → TR; `world` = no region).
  Worker: `/api/youtube/pool` takes `region` (auto / world / a code; the pool's cache key is per kind + region + language
  + day, `yt-pool2`; the country is never stored), new `/api/youtube/channel?c=UC…|@handle` (channels.list by id or
  `forHandle` → uploads playlist → playlistItems → videos.list: **3 units a page**, cached per channel + day, `yt-chan1`;
  `next` = the playlist's page token). Pool pages stay 101 units per new kind + region + day. Site: ♾ window — a channel
  link / @handle starts that channel's feed (`FeedSource` `channel`), words stay a topic search; Discover has a 🌍 country
  select (my country / world / 12, names from `Intl.DisplayNames`, `opt:poolRegion`). A plain channel name is not taken
  as a channel on purpose: it can't be told from a topic and a channel-name search costs 100 units. Privacy policy:
  the country use under "YouTube search". Tests: unit `youtube-channel.test.ts`, e2e `search.mjs` (region / channel input
  checks; local `off`), `shorts-rail` harness.

### 11. Thanks page (0.9.94 "Next" 5)
- Why: owner, 1 Nov 2026: credit the people who helped by testing.
- Done when: `/thanks` (EN, `?lang=tr`) with the names the owner sends (only people who said yes) and a short
  thank-you; linked from the footer and the Help page; the feedback form gets an unticked "Credit me on the Thanks
  page" box when the closed beta starts.
- Tests: static page check in the same harness as Help.
- Owner's pick: A (2 Nov 2026). Names who said yes (owner, 3 Nov 2026): Tecem Öztürk, Feyza Hacıalioğlu, Ömer Tuğrul
  Bakan, Ahmet Faruk Uğurluoğlu, Nevin Senem Kanar, Mert Arı (exactly as written, Turkish letters kept).
- Done: 0.9.96.2 (PR below). `apps/web/public/thanks.html` (`/thanks`, EN + TR blocks via `lang.js`, `?lang=tr`): the
  night-gold page with a happy Glowbeam (`mascot-happy.svg`, written by `make-icons.mjs`; still with reduced motion), a
  short thank-you, the six names in the owner's order (`lang="tr"`, letters kept) and "Want to help too? Send feedback"
  → `/#feedback`. Linked from the footer (`data-thanks-link`, follows the language) and a line on the Help page. Fits
  1366×768 and 390×844 without scrolling. The "Credit me" box in the feedback form waits for the closed beta. Test:
  `scripts/harness/help/run.cjs` (Thanks checks, EN + TR, computer + phone).

### 12. Hidden test panel `?debug=1` (0.9.94, before the Shorts measurement)
- Why: the owner tests from his phone without a computer; it gathers `/baglanti`, `?olcum=1`, `?tvlab=1`, version,
  transport, sync stats, recent errors (copy button), feature switches and "start as a first-time visitor".
- Done when: `?debug=1` once in a tab shows the panel; `?debug=0` hides it; normal users never see it; no personal data.
- Tests: harness opens it and checks each part; a normal visit shows nothing.
- Owner's pick: agreed 2 Nov 2026 (ideas list).
- Done: 0.9.96.3 (PR below). `apps/web/src/debug-lab.ts` (tiny, loaded by `app.ts`): `?debug=1` → `sessionStorage`
  `swm:debug` (this tab, survives reloads), `?debug=0` or "Turn the panel off" clears it; the word leaves the address; not
  in the film-page overlay. Only then are errors recorded (`error` / `unhandledrejection`, newest 20 in `swm:debugErrors`)
  and the lazy chunk `ui/debug-panel.ts` + `debug-panel.css` loaded: a 🐞 button bottom left (red ring after an error)
  opening the panel: site / extension version, connection (WebSocket / HTTP fallback), browser · OS, screen, device
  classes, language; in a room the sync numbers (`setDebugRoom` in `room.ts`: behind the room, jumps, people, what plays);
  switches TV lab (`opt:tvLab`) and Shorts switch timing (`olcum`, this tab), ⟳ Reload, 📶 Connection test
  (`/baglanti?room=`), 🌱 Start as a first-time visitor (after a confirm: name, avatar, every room's name, tips, "continue
  where you left off", the extension-update and sticker notes, this tab's `in:` / `tab:` marks; never the browser id
  `cid`); recent errors with Clear; "📋 Copy report" (versions, device, connection, sync, last connection test, errors;
  never names, ids or chat). EN + TR texts in the chunk; Esc closes it. Normal visits download nothing (+0.5 kB on the
  room page for the switch). Test: `scripts/harness/debug/run.cjs` (35 checks).

### 13. Shorts scrolling, really good: measure and preload (0.9.94, alongside)
- Why: owner, 29 Oct 2026: "working is not enough, make it great"; the 0.9.94 gate needs the switch measurement
  written down (preload if > 300 ms).
- Done when: the owner and a friend measured the switch gap with `?olcum=1` in real Chrome (5+ switches, numbers in
  `STATUS.md`); if the average is > 300 ms a hidden preload player for the next Short is built (YouTube's rules
  checked: nothing of ours over the player); otherwise the measurement is recorded and the card closes.
- Tests: owner's hand measurement first; for a preload player a harness with a fake YouTube player (like the TikTok
  stand-in) checks the next Short is cued before the switch; `shorts-rail/run.cjs` still passes.
- Owner's pick: none needed for the code; the owner's measurement is the first step (hand test).

### 14. Cinema mode (0.9.94, owner's new feature)
- Why: owner, 2 Nov 2026: the ⇥ "hide the side panel" button should be a real cinema mode: the page around the video
  goes dark, like YouTube. He asked Claude to design it (it was a Phase 2 idea; now pulled into 0.9.94).
- Done when (Planner's design, the owner may change it): ⇥ becomes "Cinema mode" (rail ⋯ and shortcut **T**, like
  YouTube's theater key; also in the shortcuts card); entering it fades the page around the video to near-black in
  300 ms (theme scene, aura and side panel hidden; `prefers-reduced-motion`: no fade), the video grows to the largest
  16:9 that fits the window, the top bar slides away and returns when the mouse reaches the top edge, the rail stays
  beside the video, chat comes in as the existing top-right messages with an unread count on 💬, and the "everyone
  ready" / invite cards keep working; Esc (when nothing else is open) or T or the button leaves; remembered per tab;
  computer only (phones already watch edge to edge); not on the film page in this card.
- Tests: harness: enter / leave with the button, T and Esc; nothing but the video and the rail visible; messages
  arrive as toasts; no page scroll at 1366×768 and 1920×1080; owner's hand test.
- Owner's pick: Claude designs (owner, 2 Nov 2026); the design above is shown to him in the report.
- Done: 0.9.96.7 (PR below), built from Design's `docs/internal/design/cinema-mode.md`. ⇥ became 🎞 Cinema mode (rail ⋯,
  **T**, the shortcuts card; Esc leaves when nothing else is open, caught in the capture phase so a window's own Esc
  goes first). `.room.cinema` (+ `.side-hidden` kept as an alias) and `html.cinema-on`; remembered per tab
  (`sessionStorage` `cinema:<room>`, `opt:sideHidden` no longer read); computer only (`hasMouse()`, not `html.phone`),
  not in the shell or the Shorts view. The theater is fixed over the page on a near-black layer
  (`color-mix(var(--bg) 18 %, #000)` at 94 %, 300 ms fade, none with reduced motion); the video is the largest 16:9 beside
  the rail (`--cw: min(100vw − 110px, (100dvh − 80px) × 16/9)`: 1366×768 → 1223×688, 1920×1080 → 1778×1000); top bar and
  footer hidden, the top bar comes back while the mouse is on `#cinema-edge` (8 px at the top) or on it, 400 ms grace;
  chat comes as a strip of at most two pills under the video (toasts with `top: 100% + 8px`, never on the player) and a
  count on 💬 (`#dock-chat .cinema-badge`); "everyone ready" / the game invite sit at the strip's left end; a 1.8 s hint
  the first two times (`cinemaHint`). Test: `scripts/harness/cinema/run.cjs` (25 checks); yt-room updated.

### 16. Design bug sweep (0.9.94, end of the step)
- Why: owner, 2 Nov 2026: go through the whole design for mistakes; the owner should not have to find each one.
- Done when: the Developer screenshots every screen (home, join, empty room, YouTube, file, Shorts, games, settings,
  dialogs, invite, film page, `/baglanti`, privacy) at 1920×1080, 1366×768, 1024×640, 390×844 and sideways, in EN and
  TR, in a plain and a scene theme; every problem found (overflow, cut text, overlap, scrollbars, misalignment,
  contrast, mixed languages, inconsistent icons) is listed in `STATUS.md` and fixed or turned into a card; the list
  of screenshots is attached to the PR.
- Tests: the screenshot harness itself, kept for later sweeps; all harnesses pass.
- Owner's pick: none needed.
- Planner (3 Nov 2026): the Design session prepares a first list from the live site in
  `docs/internal/design/sweep-1.md`; start from it, then add your own screenshots.
- Owner's pick (3 Nov 2026) on sweep-1 item 8 (https://claude.ai/artifact/7GjPa4yVqDrYWAJ4fqe1fS): **A**, one English
  friendly room name for everyone, in every language ("the same name for everyone"). No change to `friendlyRoomName`;
  item 8 is closed.
- Done: 0.9.96.8 (sweep-1 fixes) and 0.9.96.9 (sweep-2 fixes + `scripts/harness/sweep/run.cjs`, 100 screenshots, all
  checks pass); the full list with what happened to each item is in `STATUS.md` "Design sweep (card 16)". Open small
  items there (XOX board height on a phone, the film page's hole size, Snack Bar's smallest text for lane B).
- Done: part 3, 0.9.96.11 (Planner, 3 Nov 2026): XOX / Connect Four centred on a phone, the film page's room view
  grows like the bigger room, a sideways phone's empty room keeps faces + chat, and a 0.9.96.9 regression fixed (the
  black loading background painted the film page's hole: islands over the film were black boxes). Embed harness under
  xvfb 111/111, phone harness + a sideways empty-room check, sweep 100 screens pass.

## Proposed

(Security and Research add cards here.)

_Planner, 2 Nov 2026: Security review 2 (`security-review-2.md`): H1 + M1 became Ready 1a / 1b, H2 became 6a. M3, M5,
M6 and the policy card go before the YouTube API audit (0.9.97 / 0.9.98); M8 before the TV leaves the lab; the rest
before 1.0. Owner questions (policy details, branch protection, names before joining) are being asked._

_Planner, 2 Nov 2026: Research's "first view", "Help / FAQ order" and "Send feedback with diagnostics" were folded
into Ready cards 6, 7 and 9; "Extension permission explainer" became card 8; the debug panel became card 12._

### "Scroll Shorts together" page / home-page door (Research)
- Why: people search for "watch YouTube Shorts / TikTok together"; the only competitor with pages for it (TandemParty)
  needs a host computer + extension and only the host scrolls; ours works on phones, no install, anyone swipes.
  Details: `research/newcomers-help-shorts.md` §4.
- Done when: a home-page door (and a small English-first page) "Scroll Shorts together" creates a room that opens
  straight into the Shorts view with 🎲 Discover; no service is named beyond YouTube Shorts / TikTok.
- Tests: e2e / harness: the door creates a room in the Shorts view with a feed starting.
- Owner's pick: copy and whether it is a page or only a home door. Planner: 0.9.95 (owner agreed 2 Nov 2026).
- Done: 0.9.97.62 (PR https://github.com/alperenakturk/screen-with-me/pull/314): the owner's copy A, home door only; the
  room starts 🎲 Discover "Popular" on its first welcome; harness `shorts-door` (computer EN + TR, phone).

Cards from `security-review-4.md` (4 Nov 2026, `main` at 0.9.97.39, after the repository went public), most severe
first (R4 = review 4). Details, file:line references and the owner's GitHub settings are in the review. The shipped cards of
reviews 2 and 3 moved to Done (4 Nov 2026); open from them: H3 + M7, M8 and R3-3. Lanes as routed by the Planner.

### Security: an upload budget across rooms (R4-1; lane A)
- Severity: medium
- Why: emoji and chat-image limits live inside each room, and room ids are free to invent, so one address can spread
  uploads over many fresh rooms (~150 MB a minute) and fill the account's Durable Object storage within the hour.
- Done when: a small counter object keeps a per-IP-hash daily byte budget across all rooms and an account-wide daily
  byte cap; a room asks it before storing a sticker or chat image and answers the existing "slow down" error otherwise.
- Tests: unit for the budget logic; e2e: uploads from one address across several new rooms stop at the budget, a second
  address still uploads.
- Owner's pick: none needed.

### Security: no promise shared between requests in the IP key (R4-2; lane B)
- Severity: medium
- Why: `ip-key.ts` caches the day's key as a promise made inside one request; if that request is cancelled the promise
  can stay pending and every later connection in the isolate waits (Cloudflare: no request-scoped state in globals).
- Done when: only the resolved key is cached (set after `await`), each request fetches while it is empty, the fetch has a
  timeout with the isolate-key fallback.
- Tests: unit with a fake object whose first fetch never answers: the second call still resolves (via the timeout /
  fallback); e2e unchanged.
- Owner's pick: none needed.

### Security: protect the daily request quota (R4-3; lane B, the rest with R3-3)
- Severity: high (the owner is on Workers Free, Planner 4 Nov 2026)
- Why: `/api/probe` (plain GET up to 512 KB) has no limit, and on the free plan every `/api/*` call counts toward the
  daily request allowance even when our limiter says 429, so a loop can stop all rooms until midnight UTC.
- Done when: the probe's GET counts against a per-IP limit and its size is capped lower; the R3-3 card gains a WAF
  rate-limiting rule for `/api/*` (runs before the Worker) as a required step; the owner's Free / Paid answer is noted.
- Tests: e2e: the probe answers 429 past the limit; `/connection` still works.
- Owner's pick: none needed (the Free / Paid answer through the Planner).

### Repo: public-repository hardening, code side (R4-5; lane B)
- Severity: medium (together with the owner's settings in `security-review-4.md` §5)
- Why: the repository is public; actions pinned by tag can change under us, and CodeQL / private vulnerability reporting
  are free now.
- Done when: third-party actions in `test.yml` are pinned by commit SHA with the version in a comment (Dependabot keeps
  them current); once the owner turns on private vulnerability reporting, `SECURITY.md` names GitHub's "Report a
  vulnerability" next to the e-mail; once the owner creates the `production` environment, the deploy job uses it.
- Tests: CI green; a Dependabot Actions PR still opens for the pinned SHAs.
- Owner's pick: needed only for the settings (§5 of the review).

### Security: confirm the result cache works on the live address (R4-9; lane A)
- Severity: low (verify)
- Why: Cloudflare's Cache API may do nothing on `*.workers.dev`; then the 24 h search cache and the quota memo are off on
  live and repeated searches spend quota.
- Done when: a live e2e step searches the same words twice and sees a cache hit (a debug header on the answer); if it
  never hits, the card notes that the custom domain (R3-3) is needed and, until then, a small cache in the
  `YoutubeUsage` object or KV keeps repeated words free.
- Tests: the live e2e step itself.
- Owner's pick: none needed.

### Security: TV routes off until the TV ships (R4-10; lane A)
- Severity: low
- Why: the TV is hidden only on the client; the server's pairing routes run for anyone, and the public review 2 describes
  their open weaknesses (M8).
- Done when: a server switch `TV=off` (default while the TV is frozen) answers `/api/tv/*` with 404 and the room refuses
  `tv-link` / `hello.tv`; turning it on is part of the M8 card.
- Tests: e2e `tv.mjs` runs with `TV=on` locally; a new e2e check that `TV=off` refuses pairing.
- Owner's pick: none needed.

Cards from `security-review-3.md` (3 Nov 2026, `main` at 0.9.93.18), most severe first (R3 = review 3). Details,
file:line references, scenarios and the owner's Cloudflare / GitHub / Google steps are in the review.

### Y1. YouTube branding + Terms link next to search results (audit prep, from Research)
- Why: YouTube Developer Policies III.F.2 / III.A.1: every feature showing YouTube API results must make clear they come
  from YouTube and link YouTube's Terms of Service; the audit (`research/store-and-youtube-audit.md`) marks it 🟡.
- Done when: the link-box search results, Shorts search (＋ Add), 🎲 Discover and ✨ More like this show a small
  "from YouTube" mark per YouTube's brand guidelines (their logo file unchanged, never altered or recoloured) and a
  "YouTube Terms of Service" link (opens in a new tab); EN + TR; computer + phone; the Help page says the same.
- Tests: harness or e2e checks the mark + link exist in each of the four places; screenshot at phone width.
- Owner's pick: none needed.
- Done: 0.9.96.13 (with A11y, PR #197). "Results from YouTube · YouTube Terms of Service" (link to
  https://www.youtube.com/t/terms, new tab) under the link box's search results (`ui/search.ts` `attribution()`), in the
  Shorts view's ＋ Add window and in the ♾ window that holds 🎲 Discover and ✨ More like this (`room.ts`, `.yt-attrib`);
  EN + TR; the Help page says the same. Text attribution for now: YouTube's own logo file (brand guidelines: unchanged)
  is not in the repo; Design can add it from YouTube's brand resources if the audit asks for the logo. Planner's small
  fix with it: `scripts/e2e/room.mjs` no longer fails when YouTube's oEmbed doesn't answer (it waits 8 s, then says the
  room kept its fallback title). Harness `scripts/harness/yt-attrib/run.cjs` (stubbed search; computer + phone, EN +
  TR, 13 checks).

### Y2. Stored YouTube titles never older than 30 days (audit prep, from Research)
- Why: YouTube allows keeping non-authorized API data (titles) at most 30 days; a saved room's queue, `history` and
  `lastRoom` can live longer while the room is used.
- Done when: every stored YouTube title carries the time it was fetched; older than 30 days → refreshed on next use
  (oEmbed / videos.list) or dropped to a neutral "YouTube video"; search / pool / like caches stay ≤ 24 h (already);
  the privacy policy line about retention matches.
- Tests: unit (a 31-day-old title is refreshed or dropped, a 29-day one kept); e2e on a saved room with a fake clock or
  a seeded old record.
- Owner's pick: none needed.
- Done: 0.9.96.14 (PR below). `QueueItem.titleAt` (optional, no protocol bump) records when a title was looked up;
  `room-logic.ts` `TITLE_MAX_AGE_MS` (30 days), `staleTitle`, `freshItem`, `freshRoom`. The room object's
  `freshenTitles()` runs when someone joins (before `welcome`): YouTube titles older than 30 days or of unknown age
  are dropped from the room, the played list and its title cache, saved recaps older than 30 days lose their titles,
  and the playing item plus the next 10 queued are looked up again (oEmbed); meanwhile the page shows "YouTube · id".
  Search / pool / like caches were already ≤ 24 h. Privacy policy (EN + TR) says so. Tests: unit (29-day kept, 31-day
  and unknown-age dropped, other kinds untouched, `setItemTitle` records the time); a seeded e2e is not possible (e2e
  can't write a room's storage), local full e2e passes.
  With it: `scripts/e2e/handover.mjs`'s test clients open a socket once more when it drops with 1006 before
  `welcome`, as the site does (0.9.96.13's live run failed on its first attempt there: Cloudflare restarted the room's
  object right after the deploy).

### Y3. Usage counters for the YouTube quota form (audit prep, from Research)
- Why: the quota increase form asks for real daily usage; we have no numbers today.
- Done when: the Worker counts per UTC day the search / pool / like / oEmbed calls that reached YouTube and the units
  they cost (no query text, no IP, no room id), readable by the owner (e.g. `/api/youtube/usage` behind a secret header,
  or Workers Analytics Engine if free); kept ≤ 90 days.
- Tests: unit (counter adds the right units per call kind); e2e: a search raises the counter, the route without the
  header is refused.
- Owner's pick: none needed.
- Done: 0.9.96.15 (PR below). Shared `yt-usage.ts` (`UNIT_COST`: search.list 100, videos / channels / playlistItems 1,
  oEmbed 0; `addUsage`, `pruneUsage` (90 days), `cleanUsage`); the `YoutubeUsage` Durable Object (binding `USAGE`,
  migration `v9`, one instance `usage`) keeps per UTC day and kind (search / pool / like / channel / oembed) the
  requests that reached YouTube, the API calls by method and their units. `youtube.ts` counts every `callYouTube`
  (cache hits and refused requests count nothing), the room object counts its oEmbed title lookups. The owner reads
  `GET /api/youtube/usage` with the header `X-Usage-Token: <USAGE_TOKEN>` (a repo secret uploaded with the deploy;
  without it the route always answers 403). No words, ids, IPs or rooms are stored. Privacy policy (EN + TR) says so.
  Tests: unit `yt-usage.test.ts`; e2e `search.mjs` (refused without / with a wrong key; with the key in the live run,
  the counters read). A search raising the counter is not checked live: the e2e search is cached 24 h, and a fresh
  query would spend 101 units per deploy.

### Privacy: rewrite the privacy policy for KVKK + GDPR (H3, M7)
- Severity: high
- Why: the policy has no data controller, legal basis, rights and how to use them, transfers abroad, minimum age,
  complaint authority or exact date, and several facts are incomplete ("never shared with anyone", where names are
  kept, browser-id purposes, room info shown before joining, device labels, local keys, third-party requests, Life
  Poker); the Web Store data form has the same gaps.
- Done when: `privacy.html` (TR + EN, same content) covers every item in `security-review-2.md` §3 H3 and M7 with a
  dated change line; `docs/internal/web-store.md` lists voice / camera / chat images and `scripting`; a one-page breach
  plan exists in `docs/internal/`; the owner has had it read by a lawyer before the store submission.
- Tests: review against the stored-data table in `security-review-2.md`; owner's read-through.
- Owner's pick (2 Nov 2026, https://claude.ai/artifact/S9PHD4qRh8uaM2ehzHka6T): controller "Alperen Aktürk", contact screenwithme.app@gmail.com (the support
  address of the own domain later; no postal address); minimum age 13+, with "under 16 you need a parent's
  permission"; a lawyer reads policy + terms before the store submission if the owner can find one (not blocking);
  the up-to-3 names on the join card stay and the policy says so (M7). Planner: before the YouTube API audit (0.9.98).
- Lane: A, next (Planner, 5 Nov 2026; version 0.9.97.60). Use `kvkk-gdpr-denetim`'s `SKILL.md` from `my-awesome-list`
  as the checklist (attach it with `add_repo`, read-only).

### 🍿 Snack Bar: first solo side game (0.9.95; owner picked it, 2 Nov 2026)
- Why: the owner wants something to play alone while watching with friends; an idle game fits low attention and
  "progress over time". Details: `research/solo-games-accounts.md` Part A.
- Done when: 🎮 has a "Play on the side" entry that opens Snack Bar in a free window / side panel / phone sheet without
  scrolling; income only while the room's video plays, capped "while you were away" bonus, +10 % per other person in
  the room (more in voice), prestige "new cinema"; silent by default; never takes the room's keys or focus; save is
  one versioned JSON in `localStorage`; lazy chunk; EN + TR strings; original look, no film names.
- Tests: unit (economy: income per watched second, cap, together bonus, prestige, save migration); harness (fits at
  phone / small free window sizes without scrollbars, room keys 1–8 / Enter still reach the room).
- Look (owner, 3 Nov 2026, https://claude.ai/artifact/WSxxSneo6NT5Y5JcVKXxLi): **A "counter scene"** (illustrated counter
  lit from the left, Glowbeam as cashier, bought items appear on the counter, upgrade rows with level bars).
- Owner's pick (2 Nov 2026): yes, the flagship, "detailed, sweet and on our theme; I'm excited about it". Not silent:
  it gets its own cute sounds (game family in `sounds.ts`, the Sounds setting and volume apply; never during speech
  ducking). Name "Snack Bar" works in English first; TR label "Büfe". Build in 0.9.95 (Focus: new features frozen
  until then); the Planner makes a clickable look-and-feel option page first.

### 🌱 Window Garden: cozy collection game (0.9.95, after Snack Bar; owner, 2 Nov 2026)
- Why: owner: "basic but meaningful, a collection feel, sweet and cozy, with sweet sounds".
- Done when: a second "Play on the side" game: plants grow over watched minutes, water now and then, seeds / rare
  plants after a film ends or a full evening together, an album of every plant found (the collection); silent-ish
  cozy sounds; same rules as Snack Bar (free window / sheet without scrolling, never takes the room's keys, one
  versioned save in `localStorage`, lazy chunk, EN + TR).
- Tests: unit (growth, seed drops, album, save migration); harness (fits small windows and phones, no scrollbars).
- Owner's pick: done (idea); look **A "window sill"** (3 Nov 2026).

### 🔤 Daily word game, English + Turkish (0.9.95, third; owner, 2 Nov 2026) ⏳ word lists first
- Why: owner: instead of random logic puzzles, a word game like the popular daily five-letter one, in English and
  Turkish; "or something similar that is easier to make".
- Done when: our own name and look (never the original's name, colours or layout: trademark); a daily word the same
  for everyone (seed by date), 6 tries, letter hints, on-screen keyboard with Turkish letters, a share line without
  spoilers; works offline. Word lists: Research finds openly licensed EN and TR lists (answers ~1–2k common words,
  allowed guesses larger) with licenses we may ship (MIT / CC0 / CC BY); if no good TR list exists, the fallback is a
  word-free daily game of the same shape (e.g. a colour / emoji code breaker), owner picks.
- Tests: unit (scoring with repeated letters, Turkish İ/ı and other letters, date seed); harness (fits a phone).
- Research (2 Nov 2026, `research/word-game.md`): EN guesses = ENABLE (public domain), EN answers = 12dicts common
  words (public domain) ∩ 5 letters + a hand pass; TR = Zemberek-NLP lexicon (Apache 2.0, 4,619 five-letter lemmas,
  ~1–1.5k hand-picked answers, rule "no suffixes"); no TDK lists; credits line + `THIRD-PARTY-NOTICES`. To stay clear of
  the original's trademark and its "copyrighted gameplay" claims: own name (no "-dle"), no 5×6 square grid (e.g. a
  ticket / film-strip row per guess, 7 tries), theme colours + ✓ / • instead of green / yellow, no QWERTY strip right
  under the board, share text without coloured squares ("🍿 Word of the day #12 · 4/7"); tr-locale İ/ı handling.
- Owner's pick: board **A "ticket row"** (3 Nov 2026); name **Five Frames** (TR **Beş Kare**), owner 3 Nov 2026.

### Move my things to another device (Research)
- Why: browser-only saves (game progress, saved rooms, emoji collection) are lost on a new phone; accounts are costly.
  Details: `research/solo-games-accounts.md` Part B, option B.
- Done when: "Move to another device" shows a 6-digit code + QR; the other device enters / scans it and receives the
  blob once via a short-lived Durable Object (TV pairing pattern, nothing stored, 10 min expiry, rate-limited); the
  privacy policy mentions it.
- Tests: e2e (code → transfer → expiry, wrong code, rate limit); unit (blob versioning / merge).
- Owner's pick: part of accounts A (2 Nov 2026): next after the side games (0.9.95+), before 1.0 if time allows.
- Done: 0.9.96.4 (https://github.com/alperenakturk/screen-with-me/pull/174). Profile menu → 📲 or `/#move=<code>`;
  `MoveLink` (migration v8, `guardSocket` / `CONNECT_LIMIT`, 10 min, nothing stored; the sender presses Send first);
  `move.ts` pack / merge (games keep the save that got further). e2e `move.mjs`, unit `move.test.ts`, harness
  `move/run.cjs` (13). The same PR fixed poker.mjs's first-attempt live failure (the next hand now also moves on with
  any message).

### Accounts: owner's decision (decided 2 Nov 2026)
- Why: idle games and cross-device saves raise accounts; they touch the "no account" promise, GDPR / KVKK, Apple's
  in-app deletion rule and security. Details: `research/solo-games-accounts.md` Part B.
- Done when: the owner picked on an option page: A (browser only) / B (move code) / D (optional passkey account after
  1.0) / E (e-mail accounts), recorded in ROADMAP; research recommends A now, B next, D only if users ask.
- Tests: none (decision).
- Owner's pick (2 Nov 2026): **A, step by step, no account now**: progress in the browser, then the move-to-device
  code, an optional passkey account only after 1.0 and only if users ask; "no account" stays on the home page.
### Logo: direction C "Sidelit, light from the side" + mascot family (Design session; owner, 3 Nov 2026)
- Why: owner picked direction C on https://claude.ai/artifact/5dAZoG6shDuxN454YBm6ZZ and "the mascot's eyes stay in
  every case"; he wants many versions of C (small to big changes), the mascot fitted to it, and usage examples.
- Done when: the owner picked a version and a mascot variant on the Design session's page; then a Developer card
  updates `logo.ts`, `make-icons.mjs` (icons, favicon, small 16–32 px version), the store tile and `store/src` shots.
- Tests: the Developer's card: icons regenerate, favicon readable at 16 px, harness screenshots of the top bar.
- Owner's pick (3 Nov 2026, round 2): D1 night gold + T1 deep teal + N1 Glowbeam; built by card 6c. Replaced the "touch up today's mascot" pick if he chooses a C
  version; works with either name (Sidelit or ScreenWithMe).

## Done

### Security: no uncapped request body in a room (R3-1)
- Severity: high
- Why: `POST /api/rooms/:id/unsave` reads the whole body inside the room object; one chunked ~100 MB request from
  anyone with the room link resets the room and drops everyone (the H1 crash through another door).
- Done when: the Worker refuses an `unsave` POST without `Content-Length` or above ~1 KB; the object reads it with a
  capped reader (shared with `fallback.ts`); a per-IP limit on `/info` + `/unsave` (with the M4 card); a code comment
  states the rule "no Durable Object reads a request body without a cap".
- Tests: e2e (chunked oversize `unsave` → refused and the room still answers; a normal unsave by the host still works).
- Owner's pick: none needed.
- Done: 0.9.95.2 (PR below). Worker: an `unsave` POST without `Content-Length` → 411, above 1 KB → 413, any other method
  → 405; `/info` + `unsave` share the new `ROOM_INFO_LIMIT` binding (60 per IP and minute, Workers Free); an `unsave`
  POST without an `Origin` → 403 (browsers always send one on a POST). Room object:
  `readCapped(request, 1024)` (exported from `fallback.ts`, its comment states the rule); `TvLink /deliver` capped too.
  Test: e2e `saved.mjs` (chunked body refused, 4 KB body refused, the room still answers; the host's unsave still works).
- Done: 0.9.95.2 (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### Security: secrets only in the deploy step (R3-2)
- Severity: medium
- Why: the Cloudflare token and the YouTube key sit in the environment of `npm ci`, the build and the live e2e, so a
  compromised dependency's install script or build plugin could read them and deploy to the account.
- Done when: the three secrets are set only on the "Deploy to Cloudflare" step (step-level `env:`, never job- or
  workflow-level); the key check uses `secrets` in an `if:`; the workflow has `permissions: contents: read`.
  Planner note (3 Nov 2026): the repo is private on GitHub Free, which has no Environments with branch rules for private
  repos, so the `production` environment part waits until the repo is public or paid; step-level secrets need no owner
  action.
- Tests: CI green on a PR; the next merge deploys and the live e2e passes; the install / build steps' environment has
  no `CLOUDFLARE_*` / `YOUTUBE_*` (a quick `env | grep -c` step that prints 0, removed afterwards).
- Owner's pick: none needed now (the environment part later).
- Done (0.9.97.4): the deploy job has no job-level `env:`; `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and
  `YOUTUBE_API_KEY` (with `FEEDBACK_GITHUB_TOKEN` / `USAGE_TOKEN`) are set only on "Deploy to Cloudflare" (the live
  e2e keeps `USAGE_TOKEN` for its read check). "Check keys" turns `secrets.X != ''` into an output (`steps.keys.outputs.ok`)
  that the later steps' `if:` read. Instead of a one-off `env | grep -c` step, "Install and build" keeps a permanent
  guard: it fails if any deploy secret is in its environment. `permissions: contents: read` came with L10.
  The `production` environment waits for a public / paid repo.
- Done: 0.9.97.4 (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### Privacy: YouTube leftovers (R3-5)
- Severity: low
- Why: the YouTube API script still comes from `www.youtube.com` (with the person's YouTube cookies where third-party
  cookies are allowed) while the policy says the player is "loaded from youtube-nocookie.com"; the CSP keeps
  `frame-src https://www.youtube.com` and `script-src https://s.ytimg.com`, probably unused.
- Done when: the policy (EN + TR) says the player code comes from youtube.com and the video frame from
  youtube-nocookie.com; the two CSP hosts are dropped if the YouTube harness still plays without them.
- Tests: `scripts/harness/yt-privacy/run.cjs` + `yt-room` with the trimmed CSP, no CSP violations in the console.
- Owner's pick: none needed.
- Done (0.9.97.5): the privacy policy (EN + TR) says the video frame comes from youtube-nocookie.com and the player code
  (IFrame Player API) from youtube.com, which may carry youtube.com cookies where third-party cookies are allowed;
  `_headers` drops `https://s.ytimg.com` from `script-src` and `https://www.youtube.com` from `frame-src`. The
  `yt-privacy` harness now records every `securitypolicyviolation` and checks there is none with the player loaded
  (run against `wrangler dev`, which serves `_headers`: green). With it, a live-e2e fix: `callYouTube` retries once
  after 400 ms on a 5xx or no answer and logs only the call's name and status (`search.mjs` failed its first live
  attempt on the 0.9.97.3 deploy with YouTube's "failed").
  Also: the 0.9.97.4 deploy (the first with the owner's `USAGE_TOKEN`) failed `search.mjs` "the owner's key reads them"
  on both attempts although the Worker had the secret; most likely whitespace around the pasted secret (a header loses
  it, the stored value keeps it). `youtubeUsage` now trims both sides, and the check prints the status.
- Done: 0.9.97.5 (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### Security: fallback sessions per IP (R3-6)
- Severity: low
- Why: in a room with many custom emojis and chat images, two or three idle fallback sessions from one IP keep the
  object's 24 M budget full, so real hotspot users are closed with `1009 overflow`.
- Done when: at most ~3 fallback sessions per IP hash per object; a broadcast string counts once across sessions (or
  join images are sent after the first poll, in pages).
- Tests: e2e `fallback.mjs` (a 4th session from one IP refused; a second IP still joins a full-emoji room);
  hotspot harness still passes.
- Owner's pick: none needed.
- Done (0.9.97.6): `PollHub` keeps each session's IP hash (`X-SWM-Ip`, set only by the Worker) and refuses a 4th open
  session from one address in one object with `429 {code:'busy'}` (`FALLBACK_PER_IP` 3; the client's open fails and the
  room reconnects as after any failed open). Tests: e2e `fallback.mjs` (3 open, the 4th 429, again after one closes);
  harness `hotspot` green again (it had broken with card 6: it waited for the hidden people count and clicked the
  hidden sync-test button). R3-8 was done with L6.
- Done: 0.9.97.6 (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### Security: requirements for the feedback endpoint (R3-7, with card 9)
- Severity: low (preventive)
- Why: card 9 writes user text into GitHub issues with a token; without limits it can flood the repo, ping people with
  `@` mentions or leak more than intended.
- Done when: fine-grained token = Issues: write on this repo only, with an expiry; `Origin` required; per-IP limit
  (≈ 3 / hour) and a global daily cap (≈ 50); body size capped while reading; text in a code block, `@` / `#123`
  neutralised; no IP, room id, names or chat stored; the optional e-mail and its retention named in the privacy
  policy; Turnstile only if spam appears.
- Tests: unit (payload builder escapes `@user`, `#1`, long text cut); e2e with the token off (`off`), limits, oversize
  body refused.
- Owner's pick: none needed (the owner creates the token when card 9 asks).

Cards from `security-review-2.md` (2 Nov 2026, `main` at 0.9.93.5), most severe first. Each card names its finding id
(H = high, M = medium, L = low); the details, file:line references and attack scenarios are in the review.
- Done: 0.9.96 (built into card 9) (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### Privacy: a secret in the IP hash (M5)
- Severity: medium
- Why: the IP hash is an unsalted SHA-256, so every IPv4 address can be recovered from it; the policy calls it
  scrambled.
- Done when: `ipKey` is an HMAC with a Worker secret (rotated daily or a daily derived key), rate limits still work,
  and the policy describes it as it is (incl. chat images counted per IP).
- Tests: unit (same IP same day → same key, different day → different key), e2e emoji / image limits still pass.
- Owner's pick: none needed.
- Done: 0.9.96.19 (PR below). Shared `ip-hash.ts` (`hashIp` = HMAC-SHA-256 of the IP, 16 hex digits; `ipHashKey`,
  `newIpHashKey`); the `IpKeys` object (binding `IPKEYS`, migration `v10`, one instance) makes a random 32-byte key
  per UTC day and overwrites the old one, so no owner secret is needed and past days' hashes can't be matched to an
  address by anyone. The Worker (`ip-key.ts` `ipKey`) fetches it once per isolate and day; if the object can't be
  reached it hashes with an isolate-local random key for that moment (the site keeps working). Every rate limit and
  `X-SWM-Ip` use it; per-day counts keyed by it (emoji / image uploads, the YouTube share) restart with the new key at
  00:00 UTC. Privacy policy (EN + TR): what is counted (connections, emoji and chat images, searches) and how the
  daily keyed code works. Tests: unit `ip-hash.test.ts` (same day same code, another key another code, not the plain
  SHA-256); local full e2e (emoji / image limits) green.
- Done: 0.9.96.19 (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### Privacy: no search words in our logs (M6)
- Severity: medium
- Why: Workers Logs keep `/api/youtube/search?q=<words>` with the caller's IP metadata, which contradicts the policy's
  "by the words, not by person".
- Done when: search words travel in a POST body (or are otherwise kept out of logged URLs), and the policy names our
  own logs and their retention.
- Tests: e2e `search.mjs`; a local check that the logged URL has no `q`.
- Owner's pick: none needed.
- Done: 0.9.96.20 (PR below). `POST /api/youtube/search` and `POST /api/podcasts/search` take the words as a form body
  (`q`, at most `WORDS_BODY_MAX` 2 KB, `readWords` in `youtube.ts`); a GET is 405, words only in the address count as
  none (400). Language, `short` and `page` stay in the address (no words). The site sends them with shared
  `wordsRequest(q)` (link-box search, Shorts ＋ Add, the ♾ topic feed, podcasts). Cache keys unchanged. Discover /
  More like this / channel carry no typed words (a category, a video id, a channel link or @handle) and stay GET.
  Privacy policy (EN + TR): our own Workers Logs (time, address, status, errors) kept at most 7 days, never with search
  words. Tests: e2e `search.mjs` + `podcasts.mjs` (GET with `q` → 405, `q` only in the address → 400, too large body
  → 400), harness `phone/run.cjs` checks the page's search request is a POST with no `q` in the address, harness
  `podcasts/run.cjs` reads the words from the body.
- Done: 0.9.96.20 (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### Security: a daily YouTube quota budget (M3)
- Severity: medium
- Why: scripts without an `Origin` may search, limited only to 10 / min / IP, so one IP can spend the whole day's
  quota in ~10 minutes and turn search / Shorts feed / Discover off for everyone.
- Done when: a global daily unit budget (one Durable Object or KV counter) and a per-IP daily cap guard search, pool
  and like; the "quota" answer is used when the budget is out.
- Tests: unit for the budget logic; e2e `search.mjs` still passes.
- Owner's pick: none needed (the per-IP number can be tuned later).
- Done: 0.9.96.17 (PR below). Shared `yt-usage.ts`: `DAILY_UNIT_BUDGET` 9000 of YouTube's 10 000 units a day,
  `IP_DAILY_UNITS` 2000 per address (≈ 20 searches), `EXPECTED_UNITS` per request kind, `unitsToday`, `budgetCheck`.
  The `YoutubeUsage` object answers `POST /spend {ip, cost}` before each uncached request to YouTube (search, Discover,
  More like this, channel): today's counted units + units allowed but not yet counted + the cost must fit the budget
  (else `quota`), and the address's share today (else `busy`). The per-address numbers live in the object's memory
  only (the same scrambled IP hash as the rate limits, never stored), reset each UTC day. If the object can't be
  reached the request goes (YouTube's own quota is the backstop). Tests: unit `yt-usage.test.ts` (budget, per-address
  share, today's sum); e2e `search.mjs` unchanged and green (no key locally / in CI, so the budget path is not reached
  there; live searches go through it).
- Done: 0.9.96.17 (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### Security: rate-limit the cheap routes that wake Durable Objects (M4)
- Severity: medium
- Why: `/api/version` creates a new object per call, `/api/rooms/:id/info` and fallback `send/poll/close` with any
  `sid` reach objects without a limit; a loop can spend the daily Durable Object allowance.
- Done when: `/api/version` needs a token from the deploy job (or is strictly limited), `/info` and all fallback
  requests have per-IP limits, the Worker checks `sid` against `^[0-9a-f]{32}$` before forwarding.
- Tests: e2e (bad `sid` answered by the Worker; `/info` limit), deploy job's `wait-live.mjs` still works.
- Owner's pick: none needed.
- Done: 0.9.96.18 (PR below). `/info` + `unsave` already counted against `ROOM_INFO_LIMIT` (R3-1). `/api/version` now
  counts against it too (its own key `version:<ip hash>`, 60 a minute; `wait-live.mjs` asks every 3 s = 20). The HTTP
  fallback's `send` / `poll` / `close` are checked by the Worker before any object wakes: a known step (else 400), a
  `sid` matching `^[0-9a-f]{32}$` (else 400), and the new `FALLBACK_LIMIT` (1200 per IP and minute; one batch is in
  flight at a time, so a fast network sends at most ~10 a second while drawing). The client (`socket.ts`) treats a 429
  as "wait 1.5 s and try again", keeping the batch, never as a failure. Tests: unit `socket.test.ts` (429 on send and
  poll: the message arrives, the socket stays open; fails on the old code), e2e `fallback.mjs` (malformed / missing
  `sid`, unknown step → 400).
- Done: 0.9.96.18 (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### Security: make-host only by the real host (M2)
- Severity: medium
- Why: during the host's 20 s reload grace the oldest guest counts as host and can hand the role to themselves for good.
- Done when: `make-host` is refused unless the sender's key is `hostKey`.
- Tests: e2e `host.mjs` (host reloads, oldest guest's `make-host` → `not_host`, host returns as host).
- Owner's pick: none needed.
- Done: 0.9.96.16 (PR below). `makeHost` in the room object also needs the sender's key to be `hostKey`, so the guest
  who acts as host during the 20 s reload grace gets `not_host`; after the grace a join settles the role as before.
  e2e `host.mjs` covers it (fails on the old code).
- Done: 0.9.96.16 (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### Security: one text cleaner for names, chat and titles (L1)
- Severity: low
- Why: zero-width and right-to-left control characters pass, so a guest can look exactly like the host or reverse
  the text of a message.
- Done when: one shared sanitizer (removes `\p{Cc}`, `\p{Cf}` except ZWJ inside emoji, lone surrogates; cuts by code
  point) is used for names, room names, chat, pin notes, titles (also URL file names and oEmbed) and guesses.
- Tests: unit in `protocol.test.ts` (U+200B, U+202E, U+2066, split surrogate pair).
- Owner's pick: none needed.
- Done: 0.9.96.21 (PR below). `protocol.ts` `cleanText(x, max)`: `\p{Cc}` → space, `\p{Cf}` removed except a ZWJ
  between two pictographs and flag tag characters after 🏴, lone surrogates dropped, spaces collapsed, cut by code
  point. Used by `cleanName`, `cleanRoomName`, `cleanChatText`, `cleanTitle`, pin notes and Draw & Guess guesses;
  the server's `resolveTitle` (oEmbed answers, file names) runs its result through `cleanTitle`. Tests: unit
  `protocol.test.ts` (6: U+200B, U+202E, U+2066/2069, BOM, ZWJ emoji and the England flag kept, split surrogates,
  code-point cut, titles, pin notes); local full e2e green.
- Done: 0.9.96.21 (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### Security: safer media links (L4)
- Severity: low
- Why: `html5` / `page` items accept `http:`, user-info, `localhost` and private IPs, so one guest can make every
  viewer's browser request a device on their own network; `page` titles are chosen by the client.
- Done when: `html5` needs `https:`, user-info is refused, IP literals / private / `.local` hosts are refused, the
  page's host is shown next to a client-given title.
- Tests: unit (`cleanMedia` cases); e2e queue tests still pass.
- Owner's pick: none needed.
- Done: 0.9.96.22 (PR below). `protocol.ts` `isPublicMedia`: `html5` needs `https:`; `html5` and `page` refuse
  user-info, IP literals (v4 / v6, also hex forms the URL parser turns into dotted ones), single-label hosts and
  `localhost` / `.local` / `.internal` / `.lan` / `.home.arpa` / `.intranet`. The room refuses such a `load` /
  `enqueue` with the new error `bad_link` (EN + TR text), except on a local test server (`devHost`: the request's
  host is `localhost` / `127.0.0.1`, so the harnesses keep playing files from localhost). A film page's client-given
  title gets its site's name (`withHost`: "Title · site.example"). Tests: unit `protocol.test.ts` (3), e2e `links.mjs`
  (live: private address, http file, user-info refused, a public https file queued; local: local links still taken);
  locally checked the refusal through the HTTP fallback with another `Host`.
- Done: 0.9.96.22 (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### Security: room abuse limits (L2, L3, L5)
- Severity: low
- Why: signal floods per connection reset on reconnect, `ready:false` lets a guest pause a host-only room again
  after a reconnect, and 51 sockets that never say `hello` make a room "full" for 150 s.
- Done when: signal limits are per person and target pair (a few offers per minute per pair); the wait cooldown is
  keyed by person / IP hash; "full" counts joined members and unjoined sockets close after ~15 s.
- Tests: e2e (`voice.mjs`, `wait.mjs` additions; unjoined sockets closed).
- Owner's pick: none needed.
- Done: 0.9.96.24 (PR below). L2: besides the old per-connection limit, signals (`signal`, `live-signal`) count per
  person (browser, `personSignalLimit` 120 burst / 12 a second) and per pair of people (`pairSignalLimit` 40 / 2 a
  second), so a reconnect no longer refills the budget; `RateLimiter` remembers at most 4000 keys. L3: the 30 s "don't
  make the room wait again" is copied to the person (`waitCooldowns`, from `WaitTracker.cooldowns()` when a wait ends or
  a member leaves) and handed to a new member id of the same browser (`holdOff`). L5: "full" counts joined people
  (`MAX_MEMBERS`) and at most 30 connections waiting for `hello` (`MAX_UNJOINED`); one that has not said `hello`
  15 s after opening (`UNJOINED_MS`) is closed with 4008 `no_hello` on the next arrival and in `pruneStale`. Tests:
  e2e `abuse.mjs` (a burst of 100 signals cut to 40, a reconnect gets 3; a silent socket closed with 4008), `wait.mjs`
  (a reconnect does not reset the cooldown); harness `voice/live.mjs` green; `voice/run.mjs` passes its connection
  checks (its two failing checks fail on main too: the fake-mic energy check with a sine wav and the "free tiles" check
  that predates 6g's one-window default; for the bug hunt).
- Done: 0.9.96.24 (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### Security: game rules for every player (L6)
- Severity: low
- Why: any Draw & Guess player can reset or start the game, `undo` re-sends all strokes 8 times a second, the Quiz
  50/50 joker leaks the answer with a second identity, Poker's `people` grows without a cap and anyone can deal.
- Done when: host / opener checks on Draw `reset` / `start` and Poker `start`; `undo` ≤ 1/s; one hidden 50/50 pair
  per question; Poker `people` capped; (optional) game objects accept only a short-lived ticket from the room.
  Review 3 (R3-8): game, draw, quiz and poker objects accept `hello` only once per connection, as the room does.
- Tests: e2e `draw.mjs`, `quiz.mjs` and a Poker e2e case.
- Owner's pick: none needed.
- Done (0.9.96.25): Draw & Guess `start` / `reset`, Quiz `start` and Poker `start` only from the game's host (the first
  player / seat still connected; the same person who picks the settings, `not_host` otherwise; the Start button is
  dimmed for the others and the note says "X picks the settings and starts the game"); Draw `undo` has its own limiter
  (`RateLimiter(3, 1)`); the Quiz 50/50 reuses the pair already hidden for that question; Poker keeps at most
  `MAX_PEOPLE` 60 people (the longest-unseen without a seat or a connection go); game, draw, quiz and poker objects
  answer a second `hello` on a connection with `bad` (R3-8). Not done (optional in the card): a room ticket for game
  objects. Tests: e2e `draw.mjs` (host start / reset, second hello, undo burst), `quiz.mjs` (host start, second hello,
  one 50/50 pair), `poker.mjs` (host deals).
- Done: 0.9.96.25 (with R3-8) (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### Security: small hygiene fixes (L7, L8)
- Severity: low
- Why: the TikTok resolver's later hops may use `http:`, another port or user-info; recaps older than 90 days stay in
  storage until read; the room's reset leaves in-memory tokens that are written back.
- Done when: every TikTok hop needs `https:`, no port, no user-info, and bodies are cancelled; recaps are pruned in
  the alarm / on load; `deleteAll` also clears `tvTokens`, `memberIds`, `counted`.
- Tests: unit for the TikTok URL check; e2e recap test.
- Owner's pick: none needed.
- Done (0.9.97.1): every TikTok redirect hop must pass `isTikTokHop` (shared `media.ts`: `https:`, no port, no
  user-info, a `tiktok.com` host) and each answer's body is cancelled; saved recaps past `RECAP_MAX_AGE_MS` leave
  storage when the room object loads and on every alarm (`pruneRecaps`, shared `freshRecaps`); the empty-room reset also
  clears `tvTokens`, `memberIds` and `counted`. Tests: unit `media.test.ts` (`isTikTokHop`), `recap.test.ts`
  (`freshRecaps`; a live 90-day e2e is not practical); full local e2e green.
- Done: 0.9.97.1 (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### Privacy: a privacy link where people join (L9)
- Severity: low
- Why: the policy is only in the footer, which phones, the film page overlay and the Shorts view hide.
- Done when: the join card and the settings / ⋯ menu link to `privacy.html` in the page's language.
- Tests: phone harness check for the link.
- Owner's pick: none needed.
- Done (0.9.97.2): "🔒 Privacy" (`data-privacy-link`, `/privacy.html?lang=<page language>`) under the join card's
  button (`#join-privacy`), in the profile menu next to Help (`#profile-privacy`) and last in ⋯ More (computer and
  phone, `room-more.ts`, presses `#profile-privacy`, an anchor, so the film page's overlay lets it open). Tests:
  harness `room-more` (join link + ⋯ list + phone order), `phone` (⋯ has the privacy tile).
- Done: 0.9.97.2 (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### Repo: dependency and workflow hygiene (L10)
- Severity: low
- Why: `npm audit` reports dev-only advisories in `undici` (via `wrangler`), there is no Dependabot, the workflow has
  no `permissions:` block, and there is no `SECURITY.md` (ROADMAP §3).
- Done when: `wrangler` updated and `npm audit` clean; `.github/dependabot.yml` (npm + actions, weekly);
  `permissions: contents: read` in `test.yml`; `SECURITY.md` with the contact address; owner turns on branch
  protection and secret scanning for `main`.
- Tests: CI green; `npm audit` 0.
- Owner's pick: needed only for the GitHub settings. Planner, 2 Nov 2026: on a private repo with GitHub Free,
  branch protection / rulesets and secret scanning are not available (paid plans, or free once the repo is public);
  the owner turns on the free parts (Dependabot alerts + security updates) now; branch rules come with the public repo
  or a GitHub Pro decision.
- Done (0.9.97.3): `npm audit fix` (wrangler 4.151 → 4.157, its miniflare / undici with it), `npm audit` 0;
  `.github/dependabot.yml` (npm with dev tools grouped, GitHub Actions, weekly); `permissions: contents: read` at the top
  of `test.yml`; `SECURITY.md` (the publisher address, what to send, 7-day answer, scope). Left for the owner: Dependabot
  alerts + security updates in the repo settings (STATUS hand tests).
- Done: 0.9.97.3 (Security housekeeping, 4 Nov 2026; details in the CLAUDE.md "Live" line).

### 6d. Fix: an empty side column in YouTube fullscreen (owner's bug, 3 Nov 2026; after 6b, before 6c)
- Why: owner's screenshot: in YouTube fullscreen the column from card 2a (`#fs-side`) stays as a wide empty strip
  when there are no notes, cameras or messages, pushing the video left.
- Done when: the column takes space only while it has something to show (notes / camera tiles; messages without making
  the video jump on every toast), else the player is full width beside the resting rail; still nothing over the player.
- Tests: harness: fullscreen with nothing to show → player ≈ full width; camera on → column appears; fails first.
- Owner's pick: none needed.
- Done: 0.9.93.20 (https://github.com/alperenakturk/screen-with-me/pull/150). `room.ts` `updateFsSide`: `.theater.fs-side-open` only while `#fs-side-notices` shows
  a note, the camera box is up or a message toast is on screen (a message keeps it `SIDE_LINGER_MS` 8 s, so a chat
  doesn't make the video jump); closed, the player's `right` is just the rail's gutter and the column fades out (0.22 s).
  Test: `scripts/harness/yt-room/run.cjs` (fullscreen with nothing to show: no column, player full width; a message
  opens it; when the messages are gone it closes again; failed on 0.9.93.17) and `cam-fs` (YouTube fullscreen: the
  cameras are in the column).

### 15. Home page, nicer and "works on your phone" (0.9.94, owner's request)
- Why: owner, 2 Nov 2026: improve the home page; it should show it works on a phone too and feel less like a
  screenshot.
- Done when: the direction the owner picks is built (Planner prepares an option page with 2–3 directions); the hero
  shows a computer and a phone in the same room; EN first, TR; fits without scrolling on the first screen at
  1366×768; the phone home (0.9.92.5 app start screen) is unchanged unless the pick says so; Lighthouse performance
  not worse than today.
- Tests: harness screenshots at 1920, 1366, 1024, 390 px; no console errors; owner's hand test.
- Owner's pick (2 Nov 2026, https://claude.ai/artifact/FVzrwoffrJPB5atVv2xQfn): hero **A "two screens, one moment"**
  (a laptop and a phone side by side, the same video moving at the same second, a sync line between them, chat bubbles
  passing from one to the other; the slogan stays); **gently alive** motion (the video runs, bubbles drift; still with
  `prefers-reduced-motion`); right under it **a strip of 3 short features** ("No app" · "Together in voice and
  camera" · "Games in the room"), the theme picker after it; **"Continue where you left off" as one thin line above
  the title** (card 5's overflow fix goes with it).
- Done: 0.9.93.19 (PR below). `home.ts` `.home-preview.two-screens`: a laptop (`.ts-laptop`) and a phone (`.ts-phone`)
  draw the same scene and run one shared progress animation (the same second on both), a dashed sync line with a moving
  dot between them (`.ts-sync`), my message drifting over the laptop and a friend's answer passing over to the phone
  (`.ts-bubble`), faces under the laptop; everything stands still with `prefers-reduced-motion`. `.home-strip`: "No app"
  · "Together in voice and camera" · "Games in the room" (EN + TR) between the hero and the theme picker. The phone
  home (app start screen) is unchanged: the strip is hidden there like the rest of the introduction. No new images
  or scripts (CSS only), so the page weighs the same. Test: new `scripts/harness/home/run.cjs` (49 checks: 1920, 1366,
  1024 and 390 px in EN + TR, hero fits the first screen, laptop + phone + sync line, the two progress bars in step,
  strip under the hero, phone home unchanged, no sideways scroll, no console errors, reduced motion).

### 6b. Settings sections opened alone are squeezed (owner's bug, 3 Nov 2026; after card 2b)
- Why: since 0.9.93.13 (card 6) ⚙️ → My screen and the ⋯ More sections (film time, save, rules) put the section into
  the hidden section list's narrow column: rows wrapped word by word, the right side of the dialog was empty and the
  list scrolled inside (owner's screenshot).
- Done when: alone, the section uses the whole dialog, rows keep the title + description + switch layout, nothing
  scrolls inside at 1366×768; a harness measures it and fails on the old main first.
- Done: 0.9.93.18 (PR below). `#settings-dialog.solo .settings-window` is one column (620 px wide, as tall as its
  content up to the window). Test: new `scripts/harness/settings-solo/run.cjs` (48 checks: every solo section, EN + TR,
  1366×768 and 1920×1080: the section's width, no row title over 2 lines, no inner scroll; 36 of them failed on the old
  main).

### 2b. Film page: the rail opens and closes at the edge (owner's B, 3 Nov 2026; after card 8)
- Why: the owner's pick on https://claude.ai/artifact/AKcDGhoFsNjhQryjhukfeD (B, his original wish): the film page's rail
  should come and go like the site's, never over the film.
- Done when: the mouse at the film's right edge opens the column and the film narrows to make room; the mouse leaving
  closes it and the film widens again; smooth, and a mouse passing by doesn't make the film jump.
- Done: 0.9.93.17 (PR below). Resting film = a 14 px gutter of our overlay (`#rail-edge` hears the mouse there); opens
  after 140 ms at the edge, closes 450 ms after leaving; the film follows the player's `right` transition (layout
  reported every step and at `transitionend`). Film-page specifics: the overlay often never hears the mouse leave, so
  the film frames' moves count as leaving, a stale `:hover` no longer holds the rail, and Chrome's replayed last
  position after the film widens is ignored. Test: `scripts/harness/embed/run.mjs` under `xvfb-run -a` (headful, real
  mouse: opens at the edge, film narrows, closes on the film and widens, a passing mouse doesn't open it, the rail's
  windows still work); headless runs pin the rail and skip those checks (headless Chrome misroutes the mouse there).

### 8. Extension permission explainer (0.9.94, with the Help page; from Research)
- Why: scanners rate "all websites" access as critical; users and guides struggle with "read and change site data";
  trust is a top complaint (Teleparty, Rave). Details: `research/newcomers-help-shorts.md` §3.
- Done when: the extension page and the "Filme git" card say in two plain lines why the extension asks for every site,
  that it does nothing outside a room, and link to the FAQ answer; the same text is ready for the store's permission
  justifications (ROADMAP 0.9.97).
- Tests: harness / e2e that the text and link are present (EN + TR).
- Owner's pick: none needed. Owner agreed 2 Nov 2026.
- Done: 0.9.93.16 (PR below). Two plain lines (EN + TR) with a link to `help.html#permissions` ("What it can and
  cannot see"): on the extension page under "What does it do?" (`#why-all-sites`, `#why-all-sites-tr`) and on the "Go
  to the film" install card (`.external-why`, i18n `externalWhy` / `externalWhyMore`; under 760 px tall only the link,
  so the card never overflows its box). The same text is ready as the store's short permission note
  (`docs/internal/web-store.md`, next to the `<all_urls>` justification). Test: `scripts/harness/help/run.cjs` (now 37
  checks: both languages on the extension page and the card, the link, the card fits at 1366×768 and 1024×640).

### 7. Help / FAQ page, English + Turkish (0.9.94 "Next" 2)
- Why: newcomers and store reviewers need one place for "how does it work", the extension's permissions and
  troubleshooting (voice does not connect, hotspot, Brave shields, autoplay).
- Done when: `/help` (EN, `?lang=tr` for Turkish, like `privacy.html`) with sections: how it works, the extension and
  why it asks each permission, voice / camera / streams, phones, troubleshooting (links to `/baglanti`), privacy
  summary, in the order users ask first (Research §2–3: 3 steps, who needs the extension, what it can and cannot
  see, "not in sync / video not found" checklist, connection, phones, voice and IP); in-product hints link to their
  answer; linked from the footer, the profile menu, the phone ⋯ sheet and the extension page; same numbers as the
  code (limits, retention); a non-Turkish reader understands the English text (0.9.94 gate).
- Tests: static page check in a harness (loads, both languages, every in-page link resolves, CSP has no errors);
  a "same numbers" spot check against `protocol.ts` limits.
- Owner's pick: none needed (Claude writes it; the owner reads the Turkish version).
- Done: 0.9.93.15 (PR below). `apps/web/public/help.html` (EN, Turkish with `?lang=tr` or the saved language, like
  `privacy.html`): how it works (3 steps), who needs the extension, what the extension can and cannot see (each
  permission), not in sync / video not found, can't connect (links `/baglanti`), voice / cameras / streams and the IP
  note, phones, privacy in short, contact. Linked from the footer, the profile menu (❔ `#profile-help`), ⋯ More on
  the computer and the phone ("Help and FAQ"), the extension page's footer and the "can't reach the room" card
  (`#connection`). `lang.js` maps a section link to the Turkish block's `-tr` id. Test: new
  `scripts/harness/help/run.cjs` (29 checks: served with the real `_headers` CSP, no errors in both languages, every
  contents link resolves and scrolls, no sideways scroll on a phone, the numbers match `protocol.ts` / `room.ts`, the
  room's links in both languages, ⋯ opens it in a new tab).

### 6a. Privacy: YouTube privacy-enhanced embed, loaded only when needed (H2; 0.9.94, before the Help page)
- Severity: high
- Why: the player uses `www.youtube.com` and the API is preloaded on every room page, so YouTube sets cookies before
  anyone chose a video, while the policy says "none of their cookies"; this also matters for the YouTube API audit.
- Done when: `YT.Player` uses `host: 'https://www.youtube-nocookie.com'`, `iframe_api` loads only when a YouTube item
  is about to play, and the policy describes the YouTube embed like the TikTok one.
- Tests: harness (no request to `www.youtube.com` on a room page with nothing playing; YouTube plays from the
  no-cookie host); existing room / Shorts harnesses; owner's hand test of YouTube playback.
- Owner's pick: none needed.
- Done: 0.9.93.14 (PR below). `players/youtube.ts`: `YT.Player` with `host: 'https://www.youtube-nocookie.com'`; the
  room no longer preloads `iframe_api` (it loads with the first YouTube item; the TV test page still loads it when it
  tests YouTube). Privacy policy: a "YouTube videos" section (EN + TR, like TikTok's), date 3 November 2026. Test: new
  `scripts/harness/yt-privacy/run.cjs` (no request to youtube.com / ytimg.com in a room with nothing playing, computer
  and phone; the player iframe is youtube-nocookie.com/embed; the API loads with the first video). The cloud's proxy
  blocks youtube-nocookie.com, so the YouTube harnesses route it to www.youtube.com (`scripts/harness/via-youtube.cjs`);
  real browsers use the no-cookie host.

### 6. Simplify the room (0.9.94 "Next" 1)
- Why: a newcomer sees too much at once; Research found every competitor's first room view is player + add a video +
  invite (`research/newcomers-help-shorts.md` §1).
- Done when (owner picked C + D): one "⋯ More" menu with the same items and order as the phone's ⋯ sheet (film time,
  save room, recap, shortcuts, sync test, room rules); the settings dialog keeps "My screen"; until the room's first
  video plays the room shows only add a video, invite, chat and join voice (the rest appears for everyone when
  something plays, or under ⋯); every feature reachable in ≤ 2 clicks; built after card 2 (the rail is the base);
  `store/src/room.html` updated; no scrollbars at 1024×640; first-tips still find their anchors.
- Tests: harness checks (every moved item opens from its new place; empty vs playing room, computer + phone);
  `phone`, `yt-room`, `room-extras`, `invite` harnesses still pass; owner's hand test.
- Owner's pick: C + D (2 Nov 2026, https://claude.ai/artifact/9AJXCNuwBojdibzZaX1baw).
- Done: 0.9.93.13 (PR below). C: `ui/room-more.ts` `roomMoreItems` is the one list (🎮 games, ⏰ film time for the host,
  💾 save, ✨ recap, ⌨️ shortcuts on a computer, 🧪 sync test (dimmed while something plays: it would replace it), 👑
  rules); the computer's `#room-more` ⋯ right of Invite opens it as a menu (`createRoomMoreMenu`), the phone's ⋯ sheet
  shows the same tiles in the same order after its invite / queue / people; the settings dialog opens one section
  alone (`open(section, solo)`, `#settings-dialog.solo` hides the section list), ⚙️ = "My screen" only; recap and
  shortcuts left the profile menu; ⋯ → Games opens the games hall under ⋯ through an invisible `#more-game` anchor (an
  `extraButtons` of the games stage). D: `.room.fresh` until the room's first item (any `state.item`), on a computer
  the rail, Share, the queue / people tabs and the empty card's sync test are hidden. Tests: new
  `scripts/harness/room-more/run.cjs` (fresh vs playing, every ⋯ item opens, ⚙️ solo, 1024×640, phone order);
  `one-rail` (a fresh room has no rail), `phone` (tiles by name), `yt-room`, `room-extras`, `invite` pass;
  `store/src/room.html` has the ⋯.

### 5. Home page: "Continue where you left off" overflows (0.9.93, owner's bug)
- Why: owner, 2 Nov 2026 (screenshot): a long video title runs out of the card under the room preview.
- Done when: the card's lines are one line each with an ellipsis (full title in `title`), the card never overlaps the
  preview at any width from 860 px up, and on phones.
- Tests: a harness check with a 200-character title at 1920, 1366, 1024 and 390 px; owner's hand test.
- Owner's pick: none needed.
- Done: 0.9.93.12 (PR below), in the shape the Planner gave (so card 15 only restyles around it): one thin line above
  the title (`.home-continue`, a pill; the whole line `a.continue-link` back into the room, cut with an ellipsis, the
  full text in its `title`; ✕ forgets it). Test: `room-extras` checks a 200-character title and room name at 1920, 1366,
  1024 and 390 px (one line, inside the left column, above the title, never over the preview).

### 4. Invite window: a real WhatsApp button and a QR tab (0.9.93, owner's feedback)
- Why: owner, 2 Nov 2026: the WhatsApp button shows a speech-bubble emoji; the QR text "A friend next to you can scan
  it with their phone's camera" reads badly.
- Done when: the WhatsApp button carries WhatsApp's own glyph (inline SVG, green as in WhatsApp's brand guidelines for
  share buttons, text "WhatsApp"); the window has two tabs "Link" and "QR"; the QR tab shows only the QR code (big)
  with "Copy image" (PNG to the clipboard, falls back to download) and no explanation sentence; EN + TR; fits without
  scrolling at 1024×640 and on a phone.
- Tests: `invite/run.cjs` updated (+ tab switch, copy image, no scroll); owner's hand test.
- Owner's pick: done (owner's words); the WhatsApp glyph follows WhatsApp's brand rules.
- Done: 0.9.93.11 (PR below). `ui/invite.ts`: tabs "Link" / "QR code" (`.invite-tabs`, `role=tablist`); the WhatsApp
  button carries WhatsApp's glyph (Simple Icons path, CC0, inline SVG) on WhatsApp green #25D366 with dark text for
  contrast; the QR tab shows the code big (`min(240px, 42dvh, 70vw)`, white frame) and "Copy image" (`qrPng`: 512 px
  PNG via a canvas → `ClipboardItem`; without an image clipboard it downloads `screenwithme-invite-qr.png`); the old
  explanation sentence (`invite.qr`) is gone; EN + TR. Test: `invite/run.cjs` (glyph + green, tabs, the QR tab's only
  text is "Copy image", a PNG on the clipboard, both tabs without scrolling at 1024×640, the QR tab on an iPhone 13).

### 2a. Nothing of ours over the YouTube player by itself (owner picked D, 2 Nov 2026; with card 2)
- Why: the same rule covers the see-through `#rail-edge` strip over the player's right edge, flying emojis over the
  video in the room view, the "3-2-1" countdown and notes over the video, and the dock / toasts / cameras over a YouTube
  player in fullscreen. Details and a recommendation per item (split layout: cameras and messages in a column
  beside the player, also in fullscreen): `research/youtube-overlay-rail.md` "Follow-up (Job 3)".
- Done when: the owner's D below is built; a harness asserts that, with nobody dragging anything, no element of ours
  intersects the YouTube iframe's box in the room view, Shorts view and fullscreen (popups only while open).
- Tests: harness overlap check in the room view, Shorts view and fullscreen.
- Owner's pick (2 Nov 2026, https://claude.ai/artifact/S9PHD4qRh8uaM2ehzHka6T): **D, like Watch2Gether**: on YouTube
  nothing of ours sits over the player by itself: `#rail-edge` goes (the edge is found from a thin gutter beside the
  player + document mousemove), flying emojis rise beside the video from the sender's face, the 3-2-1 countdown and
  notes sit above the video or in `.yt-notices`, in fullscreen the player shrinks for a side column with the camera
  strip (1–4 tiles) and the newest messages; automatic tile columns and reset positions never land on the player.
  Allowed: the person drags a camera window over the player themselves, and our popups (emojis, ⋯, settings) may
  open over it while open. The small remaining audit risk is accepted in writing (this card). Video files and film
  pages keep today's behaviour.
- Done: 0.9.93.10 (PR below). YouTube only (video files and film pages unchanged): `#rail-edge` moved off the player
  into a 14 px gutter beside it (`--edge-gutter`, the resting player ends there); emojis rise from the sender's face
  (`reactions.showFrom` + `reactionAnchor`, brought back from 0.9.92.9; with the side panel hidden or in fullscreen from
  the rail's 😀, which opens for a moment via `fullscreen.showRail()`); the 3-2-1 countdown is one of the notes
  (`NOTICES`, a card above the message box); fullscreen on a computer (`.theater.yt-fs`) has a column `#fs-side`
  between the player and the rail with the notes (`#fs-side-notices`), the cameras (`cam-float.ts` `sideColumn()`:
  automatic tile places, the pill and the one window default there; a place the person dragged is kept) and the
  newest messages at its bottom; "who paused" is hidden there. Tests: `yt-room` checks nothing of ours meets the
  YouTube frame resting, in the room view, fullscreen and the Shorts view (plus emojis, notes, messages, the gutter);
  `cam-fs` checks both camera layouts sit in the column in YouTube fullscreen. Also: `draw.mjs` waited for the words
  but read the previous state (the server sends `choices` just before `state`; live they can arrive apart): it now
  waits for the next round's "choose" state (0.9.93.9 deploy, first-attempt failure).

### 2. One rail everywhere: empty room and the film page (0.9.93 "Now" 1, owner's request)
- Why: owner, 2 Nov 2026: an empty room still shows the old bar under the video (😀 React, Games, Sync, 1×, ⇥, ⛶), and
  the extension's film page shows that bar and a rail at the same time. He wants the same right rail on every page:
  empty room, YouTube, video files, the film page; no bar under the video anywhere on a computer.
- Done when: on a computer the toolbar under the video is gone in every state (empty room, YouTube, file, test, film
  page in the shell); everything it held is in the rail or its ⋯ (Games, Pin, Sync, speed, Next, side panel / cinema
  mode, fullscreen); the empty room's rail shows only what makes sense with no video (😀, 🎮, 🎙 / 📷, ⋯, ⛶ dimmed);
  the rail's look follows Research's verdict "Rail look on YouTube": allowed → the film page's translucent rail over
  the video's edge everywhere; not allowed → everywhere (film page too) a rail that opens and closes, placed by the
  video's size, never covering the video; phones unchanged; `store/src/room.html` copy updated.
- Tests: `yt-room`, `embed/run.mjs` (film page: no toolbar, rail islands), `phone/run.cjs` still pass; new checks for
  the empty room; owner's hand test on the site and the film page.
- Owner's pick: done (one rail everywhere). Research verdict (2 Nov 2026, `research/youtube-overlay-rail.md`): an
  overlay on the YouTube player is **not allowed** (Required Minimum Functionality "Overlays and frames"), so the owner's
  rule applies: everywhere, the film page too, the rail opens and closes beside the video, placed by the video's size,
  never covering it. Extra test: `embed/run.mjs` checks the rail's box never intersects the film video's box.
- Done: 0.9.93.9 (PR below). The rail (`fs-dock`) is now on every computer page: `renderDock` also docks with no player
  (`rail-bare`: the empty room or a film card on the site, always out, 📌 / ⛶ dimmed) and marks every docked theater
  `side-rail`, so the YouTube column rules apply to all players (the video / empty card / overlays end at the rail,
  never under it). The toolbar under the video is hidden on the film page too; there the rail is a column that stays
  out (`railFixed`: the film is fitted once, left of it, instead of on every edge visit), ⋯ is back (speed, sync, next;
  not the side-panel item) and 🎮 is on it; the hole and its islands are the `#player` box left of the rail. Video files
  and the sync test follow YouTube: the rail comes at the right edge and the video makes room. Tests: new
  `scripts/harness/one-rail/run.cjs` (13 checks: empty room, file, fullscreen, sync test), `embed/run.mjs` (no toolbar,
  rail beside the film's video box in the room view and fullscreen, stays out while the film plays), `phone/run.cjs`,
  `yt-room`, `sound`. `store/src/room.html` shows the rail.

### 1a. Security: the HTTP fallback must not be able to crash a room (H1, M1; Planner: right after card 1)
- Severity: high
- Why: one person with the room link can reset the room's Durable Object (everyone drops) with a chunked POST body
  that is read uncapped, or with fallback sessions that never poll while repeated `hello`s queue every sticker and
  chat image (16 MB allowed per session).
- Done when: fallback POST bodies are read as a stream and stopped at `SEND_BODY_BYTES` (no body read for
  `open` / `close`); `QUEUE_BYTES` is 2–4 MB and the total per `PollHub` is capped; a session that does not poll within
  ~10 s of `open` is closed; a second `hello` on a joined connection is refused (or may not change the `cid`).
- Tests: e2e (chunked oversize POST → 413 and the room still answers; a session that never polls is closed; a second
  `hello` is refused), `fallback.mjs` and the hotspot harness still pass.
- Owner's pick: none needed.
- Done: 0.9.93.8 (PR below). `send` bodies are read as a stream and stopped at `SEND_BODY_BYTES` (`readCapped`; other
  bodies are cancelled unread); a session may queue 11 M characters (one full join into a room with 24 custom emojis +
  12 chat images is ≈ 10.1 M, so 2–4 MB would have closed real joins) and all sessions of an object 24 M together
  (`HUB_BYTES`); a session that has not polled 10 s after `open` is closed (sweep every 5 s); a second `hello` on a
  joined connection gets `bad_message`. Tests: `fallback.mjs` (chunked 2.5 MB body → 413 and the room still answers,
  a never-polling session closed after 10 s, second hello refused), hotspot harness.

### 1b. Security: cap queue votes (M1; with 1a)
- Severity: medium
- Why: `voters` grows without a cap and without checking the voter is present; with rotated browser ids it can pass
  the storage value limit and freeze the room's queue.
- Done when: voters per item are capped (e.g. `MAX_MEMBERS`) and only people in the room count; the second-`hello`
  fix from the card above is in.
- Tests: e2e (many votes from one connection with changing ids count once / stay capped).
- Owner's pick: none needed.
- Done: 0.9.93.8 (same PR). Votes keep only people in the room (pruned on every vote) and at most `MAX_MEMBERS` per
  item. Test: `fallback.mjs` (rotated ids count once, a second person adds one, back to 1 when they leave).

### 1. Fix: the rail never hides in YouTube fullscreen (0.9.93 "Now" 1, owner's bug)
- Why: owner, 2 Nov 2026 (screenshot, after 0.9.93.5): in fullscreen, with the mouse moved to the middle of the video,
  the right rail (💬 😀 📌 🎮 🎙 📷 ⋯ ⛶, mic and camera red because not in voice) stays however long he waits.
- Done when: in fullscreen and in the window the rail rests (`.dock-idle`) `HIDE_MS` after the mouse leaves the right
  edge, whatever was pressed before (rail buttons, Esc, shortcuts, emoji, the message box empty); root cause written in
  `STATUS.md`; the same check on the film page's rail.
- Tests: a `yt-room` harness check that fails on 0.9.93.5 first (enter fullscreen, move to the centre, wait 1 s →
  rail hidden), also after pressing 🎙 / 📷 outside voice and after ⋯ → Esc; owner's hand test.
- Owner's pick: none needed.
- Done: 0.9.93.7 (PR below). Root cause: a touch-screen laptop reports a coarse primary pointer, so the room took it
  for a tablet (rail always on screen by CSS, and a pressed rail button's focus held it in the non-edge mode). A mouse
  anywhere now keeps the computer behaviour (`hasMouse()`), focus only holds the rail for keyboard users, the hover
  flag is double-checked. `yt-room` (simulated touch laptop, fails on 0.9.93.6) and `embed/run.mjs` checks pass.

### Phone: next speed steps (0.9.93 "Now" 2)
- Why: the phone room should open and react fast on mid-range phones.
- Done when: voice / stream / TV code loads only when needed, phones get a lighter stylesheet, and an automatic phone
  speed test (4× slower CPU) runs against the built site with agreed budgets.
- Tests: the speed test itself in CI; `scripts/harness/phone/run.cjs` still passes.
- Owner's pick: none needed.
- Done: 0.9.93.6 (PR below). Lazy: TV room + remote + `tv.css`, invite window + QR, first-time tips, image tools. Room
  page JS 142.1 → 134.5 kB, CSS 35.7 → 34.0 kB gzipped; `scripts/size-budget.mjs` in CI; phone speed test
  `scripts/harness/phone-speed/run.cjs` (4× CPU, 4G): home 556 / join 478 / in room 369 ms. Voice / live stay in the
  room chunk; a phone-only stylesheet was not worth it (most rules shared). Phone harness passes.

### Root cause of the live e2e first-attempt failures
- Done: https://github.com/alperenakturk/screen-with-me/pull/113, https://github.com/alperenakturk/screen-with-me/pull/114
  (deploys restarted test rooms mid-test; the deploy job now waits for the new version).

## Moved 15 Nov 2026 (shipped 0.9.97.127–.136)

### SRC1. A "⠿ Sources" picker beside 🔍 Search: YouTube, Vimeo, search the web (owner, 14 Nov 2026; lane A)
- Why: the owner wants people to find a video without leaving Sidelit. Research (`research/competitors-how.md`) checked
  which sources are legal. The owner picked only these three: "only Vimeo, YouTube and search the internet; no archive
  stuff". Voice/camera servers (SFU) stay for later.
- What:
  - A ⠿ button beside the search box (computer room and the phone's 🔍 Search tab) opens a small grid of three tiles.
    The chosen source sticks per device.
  - **YouTube:** today's search (Data API), unchanged.
  - **Vimeo:** results from the Vimeo API (title, thumbnail, length) through a Worker route that holds the
    `VIMEO_TOKEN` secret. Never call Vimeo from the browser with the token. Rate-limit the route like the other search
    routes. Results play in our existing Vimeo player; only embeddable videos are shown.
  - **Search the web:** opens a new browser tab with a general web search for the typed words (one search engine, no
    "video site" list, no site filters). On return, a "Paste the link" hint focuses the box; a pasted link plays as it
    does today. No in-app browser and no page scraping.
  - No piracy site is named, suggested or special-cased anywhere. We stay a neutral sync tool.
  - Texts in `i18n.ts` and `i18n-tr.ts`; CSP gets only the hosts actually needed (Vimeo API through the Worker, so
    likely none in the page).
- Done when:
  - Each tile works on a computer and on a phone, in EN and TR.
  - Vimeo search returns and plays.
  - With the Vimeo secret unset, the Vimeo tile shows "not available yet" and nothing breaks.
  - Search the web opens one tab with the words in it.
  - Test Lab hook `sources.state` reports the chosen source and the last search.
- Tests: Worker unit tests for the Vimeo route (validation, cap, rate limit, no token leak); e2e search → play with a
  stubbed Vimeo answer; phone and computer harness for the grid; `check-texts`.
- Owner's step (when lane A asks): a free Vimeo developer app and its access token, saved in KeePass and added as a
  secret. The Planner gives the exact entry name and where to put it at that moment.
- Owner's pick: "only Vimeo, YouTube and search the internet" (Planner chat, 14 Nov 2026).
- Done: https://github.com/alperenakturk/screen-with-me/pull/443 (0.9.97.136)

### PH1. An app-like phone room: bottom tabs, one input row, chat sideways, join sound in step (owner, 13 Nov 2026; lane A)
- Why: on a phone, everyday actions hide behind the ＋ and ⋯ sheets (search a video is 2 taps away, games 3), the
  sheets repeat what Settings already has, and the join sound comes out of sync. The owner asked which phone features
  are needed, showed a competitor app's phone layout ("bottom tabs, one input row; do it our own way") and asked for a
  design pass ("more basic, fast, matching the PC").
- Spec: `docs/internal/design/phone-room.md` (Design, PR #422), **option A**, picked by the owner. Phone layout only
  (`html.ph-room`); computers and tablets are unchanged, and no feature code is deleted (things move or hide).
- What:
  - **Bottom tab bar** (`role=tablist`, the computer's `.tab` look): 🎬 Room · 🔍 Search · 🎮 Games · 👤 Me. Four
    panels, no router.
  - **Room tab:** the video, then a strip with the faces (tap → People + Invite) and 📌 Pin · ⏩ Speed · 🔄 Sync ·
    ⏭ Skip, then the chat with activity lines inline in italics, then ONE input row: 🔗 Invite · box · 🎙 · 📷 · 😀.
    ➤ swaps in for 🎙📷 while typing; 😀 holds the reactions and 🖼 Send an image. The ＋, ⋯ and Add-a-video sheets go.
  - **Search tab:** our own search / link box and results with thumbnails, plus "Up next" (the queue). It borrows
    `#media-form` and calls the same code as `openAdd()`.
  - **Games tab:** the games hall as a list (tables, then side games).
  - **Me tab:** Profile + Settings as grouped cards, each row a toggle or ›, with a one-line help text. It includes
    Save the room, Room rules, Film time (host), Theme, Sound & camera, Language, Help, Privacy and Terms.
  - **The owner's earlier picks stay, inside A:**
    - the 🧪 Sync test is gone from the phone (the Test Lab keeps it);
    - Recap only in Me;
    - the empty room says "🔍 Search a video" (goes to the Search tab) and "🔗 Invite";
    - sideways with a video: video + a column of ⛶ Watch fullscreen, 💬 and 🎙, with the tabs and input row hidden;
    - Shorts upright: the 9:16 video fills, and the feed becomes a 💬 sheet with a count;
    - the phone home page has no extension box.
  - **Fast:** no blur, shadow or grip on sheets; one 44 px radius-10 button shape; `room.css`'s phone section gets
    smaller (the md's rule table: about 26 rules out, 22 in).
  - **Join sound in step:** today `playIntro()` runs on the server's `welcome`, and `intro-sound.ts` makes a fresh
    `AudioContext` that waits at most 250 ms for `resume()`, so on a phone the sound comes late or not at all.
    - Unlock or reuse the shared context on the "Enter room" tap.
    - Start the picture and the sound from one clock: once the context is running, or the picture alone, never the
      sound late.
  - Nothing goes over the YouTube player.
- **Phone essentials** (owner, 13 Nov 2026, later the same day: "make the phone version more optimized and basic,
  many features can go; later we point to the app"). The Planner decided the list:
  - The phone keeps the essentials:
    - the video in sync, plus Search and Up next;
    - chat with images and reactions;
    - 🎙 and 📷 (flip included);
    - Invite and People (the host's kick and ban stay);
    - 📌 Pin, 🔄 Sync and ⏭ Skip;
    - the Games tab (tables and side games);
    - the Shorts view's bar.
  - These leave the phone (still on computers and tablets):
    - ⏩ Speed (this overrides the earlier "kept" note);
    - the camera size presets;
    - ✨ Recap and its history;
    - ⏰ Film time (setting it; a set time still shows as the banner);
    - editing 👑 Room rules (the rules still apply);
    - font choice and picture themes (the colour themes stay);
    - the Shorts ⋯ ♾ Feed and 🔁 Loop;
    - the first-time tips (the tabs make them unnecessary);
    - starting a screen share.
  - The Me tab is only: name + avatar, theme colour, language, sounds on/off, "check before joining voice", Save the
    room, Help, Feedback, Privacy, Terms.
  - **Note for phones and tablets.** It shows on touch devices without a mouse (`device.ts`, no sniffing): one small
    muted line under "Enter room" on the join card, and under "Create room" on the home page. It is not a pop-up and has
    no close button. Text (`i18n.ts` / `i18n-tr.ts`):
    - EN: "Sidelit is made for computers. Phones and tablets get the essentials; an app for them is on the way."
    - TR: "Sidelit bilgisayar için tasarlandı. Telefon ve tablette temel özellikler var; onlar için uygulamamız
      yolda."
    - When the app exists, the same line becomes the link to it (PWA1 / later Play).
- Done when:
  - On a phone each tab is one tap, and the four tabs fit at 360 px in Turkish.
  - The input row works: typing swaps in ➤, 😀 sends a reaction and an image.
  - Search adds and plays a video.
  - The Me tab holds exactly the essentials list; the phones-and-tablets note shows on touch devices only.
  - Sideways and Shorts behave as in the spec.
  - The intro sound starts with the picture or not at all.
  - The Test Lab hook `phoneRoom.state` reports the tab, the input-row state and the visible controls.
  - Nothing changes on a computer or a tablet.
- Tests:
  - `scripts/harness/phone/run.cjs` rewritten with text-based selectors for the tabs and input row.
  - `shorts-rail`, `room-more`, `settings`, `phone-sideways`, `first-tips`, `check-texts` and the size budget.
  - First look: `shots.cjs` phone and phone-land, EN + TR, Night + Matinee + one scene theme.
  - Owner's hand test: the phone room on his own phone.
- Owner's pick: council + Planner review and the owner's answers in the Planner chat, 13 Nov 2026 (removals: the
  duplicates and the sync test; promote: empty-room buttons, chat sideways, no extension box on the phone home page,
  Help); layout option A of `phone-room.md`, 13 Nov 2026. Kept on purpose: 📌 Pin, ⏭ Skip, 🔄 Sync, 💾 Save
  room.
- Done: https://github.com/alperenakturk/screen-with-me/pull/428 (0.9.97.127)

### PH2. Games on a phone: played inside the Games tab, upright only (owner, 13 Nov 2026; W + Game Studio, after PH1)
- Why: the owner wants the phone's games to live in the bottom bar's 🎮 Games tab: pick an idle game (Snack Bar, Window
  Garden, Five Frames) or an online table and play it right there, upright. His words: "every game fits upright; none
  has a landscape mode; nothing happens when the phone is turned."
- What:
  - **W (stage, `games/stage.ts` + the game-window rules in `room.css`):**
    - On a phone (`html.ph-room`) a game opens **inside the Games tab panel**: the video stays on top, and the tab bar
      stays at the bottom. It no longer takes the full screen with a small video in its head.
    - Leaving the tab keeps the game running (a dot on 🎮); coming back shows it again.
    - Tables still pause the video for everyone with the note.
    - The head shrinks to one row: name, "?", Leave / Close in ⋯.
    - **Turning the phone does nothing while a game is open.** No landscape game layout and no sideways room layout;
      the upright column stays, centred and scaled to the height.
    - When the game closes, the room's normal sideways behaviour comes back.
  - **Game Studio (every game's own layout):**
    - Every game (Classics, Sea Battle, Draw & Guess, Quiz, Last Heart, the Duel, Snack Bar, Window Garden, Five
      Frames) has one upright layout that fits the Games tab panel at 360×640 and up, without scrolling (only lists
      that grow scroll).
    - Every game's landscape-only phone rules go (`html.sideways` game rules).
    - The 44 px phone targets and the 13 px text floor hold.
  - Computers and tablets are unchanged.
- Done when:
  - On a phone, every game opens and plays inside the Games tab with the video above and the tabs below.
  - Turning the phone with a game open changes nothing.
  - games-sweep passes at phone sizes for every game.
  - Test Lab hook `phoneGames.state` reports the tab, the open game and its fit.
- Tests:
  - `game-window-head` / `state-matrix` get a phone Games-tab section and a "rotate with a game open" check.
  - games-sweep and game-proportions run at 360×640 and 390×844.
  - Owner's hand test: Snack Bar and one table with a friend on his phone, turning it mid-game.
- Owner's pick: "games in a bottom tab, upright; no landscape mode; nothing happens when the phone is turned" (Planner
  chat, 13 Nov 2026).
- Done: https://github.com/alperenakturk/screen-with-me/pull/434 (0.9.97.130)

### SAFE1. Report a person and "block for me" in the room (owner, 13 Nov 2026, from Research's `research/mobile-app.md`; lane A, after PH1)
- Why: a room has no way to report someone or to stop seeing one person's messages. This matters for safety at 1.0,
  and app stores require it (Apple 1.2). The owner said "yes, before 1.0".
- What:
  - The person menu (computer) and the person sheet (phone, PH1's People) get two rows: **🔇 Block for me** and
    **🚩 Report**.
  - **Block for me** is local only: that person's chat, reactions and images are hidden for you. It is kept per room
    (`me:<room>` style), reversible from the same menu, and sends nothing to the server. Your own messages still reach
    them.
  - **Report** sends a short form (reason chips + optional text, `cleanText`) through the existing `POST /api/feedback`
    path, labelled `report`. It carries the room id, the reported person's shown name, the last few chat lines they
    sent and a time. It never sends `cid`, IP or anything hidden. The server rate-limits it like feedback.
  - Hosts already have kick and ban; Report links to `terms.html#abuse` for the 72-hour process.
  - **Privacy:** reports are new data. `privacy.html` gets a dated "Changes" line in both languages (what a report
    holds, where it goes, how long it is kept).
- Done when:
  - Block hides that person's messages for you only, survives a reload and can be undone.
  - A report reaches the private feedback repository with the fields above and no hidden ids.
  - It is rate-limited.
  - The privacy page is updated in TR and EN.
  - Test Lab hook `safety.state` lists the blocked people and the last report result.
- Tests:
  - Server unit test for the report validation and its cap.
  - e2e: block, then a message from the blocked person is hidden for one client and shown for another.
  - The help harness checks that both privacy languages match.
  - `check-texts`.
  - Owner's hand test: block and report a friend in a real room.
- Owner's pick: "Yes, before 1.0" (Planner chat, 13 Nov 2026).
- Done: https://github.com/alperenakturk/screen-with-me/pull/432 (0.9.97.131)

### PWA1. A better home-screen app (owner, 13 Nov 2026, from Research's `research/mobile-app.md`; B2, after PH1)
- Why: the owner picked "the web app first". It is free and needs no store; Google Play comes after 1.0 and the own
  domain, and iOS only if Play shows demand.
- What:
  - `manifest.webmanifest`:
    - `lang: en` with an English name and description;
    - `id`, screenshots (phone + wide);
    - shortcuts ("Create room");
    - a `share_target` so a YouTube / video link shared from another app opens Sidelit ready to add it.
  - **Wake lock while a video plays**, released on pause or leave (a small module; one call from the room, agreed
    with lane A).
  - **iOS "Add to Home Screen" hint:** once, on the home page, iOS Safari only, dismissible, plain words.
  - Check standalone behaviour: the back button, the theme colour, opening invite links in the installed app.
  - The service worker rule stands: it never caches files.
- Done when:
  - Lighthouse PWA "installable" is green.
  - A link shared to Sidelit from the Android share sheet opens the add box with it.
  - The screen stays on while playing in the installed app.
  - The iOS hint shows once.
  - Test Lab hook `pwa.state` reports installed, wake lock and share target.
- Tests:
  - The manifest is checked in `checks` (JSON fields, English).
  - A harness for share-target URL handling.
  - Owner's hand test: install on his Android phone, share a YouTube link to it, watch with the screen on.
- Owner's pick: "Web app first" (Planner chat, 13 Nov 2026). Later and his to decide: Google Play ($25 once, after the
  domain), push notifications (new data), the iOS store ($99 a year).
- Done: https://github.com/alperenakturk/screen-with-me/pull/433 (0.9.97.132)

### QA1. Faster CI and fewer bugs reaching the owner (owner, 10 Nov 2026: "why do tests take so long, weren't we cutting them? and how are there so many bugs with this many tests?"; B2, ops)
- Why: a PR's CI takes ~15–20 min (the `site` job ~15 min, ~4–5 min of it installing), each main run (deploy + live e2e) ~25 min, and
  releases go one after another, so a small fix needs ~45 min to be live. Harnesses grew with every card. Meanwhile the
  owner still finds bugs in his first minutes: the checks test what each card named, not what a person sees in states
  nobody listed (side panel closed, YouTube room, a 1366 laptop, real mouse hover), and they never judge "looks right".
- Done when:
  1. **Speed:** a measured table of every CI job and step (median of the last 10 runs) in `docs/internal/architecture/`
     (CI section); install time cut (cache `node_modules` / Playwright deps keyed on the lockfile); jobs rebalanced so the
     longest PR job is ≤ 10 min; nothing skipped, no `paths-ignore` (CLAUDE.md), no check weakened. Report before → after.
  2. **State matrix for game windows and the room's right column:** one harness that opens every game in each allowed
     place × {side panel open, closed} × {YouTube, file, no video} × {1366, 1920, tablet} and checks: nothing cut off,
     nothing over a YouTube player, no free window over the video unless dragged, every head button visibly does
     something. Real-mouse checks (hover, drag, resize) run headful under `xvfb-run`.
  3. **A "first look" review before merging any UI change:** the PR attaches screenshots at 1366, 1920, tablet and phone
     of every screen it touched, and a fresh reviewer (a subagent given only the screenshots + CLAUDE.md product rules,
     not the developer's reasoning) lists what looks wrong; the developer fixes or answers each line in the PR. Written
     into CLAUDE.md §9 by the Planner once B2 has the tooling (`scripts/shots.mjs` or similar).
  4. **Fewer, fuller releases:** the Planner batches small fixes into one release per lane where it can (less waiting
     on deploy + live e2e); no change for B2.
- Tests: the new harness in CI; CI timings before/after in the PR.
- Owner's pick: none needed (technical).
- Done: QA1 shipped by B2 in Nov 2026 (CI 12:27 → 8:29, live e2e in 2 shards, canary gate, state matrix, shots.cjs); gate and retry hardened in #435 / #436.

### TH3. Home: a Neon that looks neon, four neutral people, other ideas for the screens (owner, 15 Nov 2026; Design → lane A)
- Why: the Neon home is "not neon at all"; the people under the devices are tied to one culture; he wants other
  ideas for the device screens.
- What:
  - **Neon home:** glow on the wordmark, buttons and device frames on a dark base, so it reads as neon, but calm:
    contrast ≥ 4.5:1, no flashing, soft glow. Other themes unchanged.
  - **The people (every theme):** 4 avatars, 2 women and 2 men, neutral (nothing tied to one nation, culture or
    religion); the line becomes "4 watching · 2 in voice" (both languages).
  - **The screens:** Design proposes 2–3 alternatives to today's sunset (a short preview each) and sends them to the
    Planner as text; the owner picks in the Planner chat; lane A builds the pick. Today's screens stay until then.
- Done when: Neon home and the 4 people are live in every theme; the screen pick is built or the owner kept today's;
  shots reviewed (QA1); contrast check green.
- Tests: `scripts/shots.cjs` home at 4 sizes, every theme; the contrast job.
- Owner's pick: his message with screenshots (Planner chat, 15 Nov 2026); the screens: pending his pick.
- Done: #462 (Developer A2, 16 Nov 2026).

### ST1. Watching a screen share: one button, fullscreen or a free window (owner, 15 Nov 2026; B2)
- Why: the stream viewer has too many confusing controls (fill the screen, frame, shrink, grow).
- What:
  - The stream viewer gets **one** control: "⛶ Fullscreen" ⇄ "🪟 Window".
  - In window mode the stream is a free window that can be dragged anywhere and resized from its corner, keeping its
    shape and its place after a reload, the same way the camera window does.
  - Everything else goes from the viewer: fill, frame, ±.
  - The phone keeps its own sideways behaviour.
- Done when:
  - A viewer on a computer has exactly one toggle.
  - Fullscreen and window both work, and the window drags and resizes smoothly.
  - Nothing goes over the YouTube player.
  - Test Lab hook `stream.view`.
- Tests: the stream harness at 1366 and 1920, a tablet check, and the owner's hand test with a friend's tab share.
- Owner's pick: "one button: fullscreen or a window I can put anywhere; simple" (Planner chat, 15 Nov 2026).
- Done: #451 (0.9.97.139), Developer B2: one ⛶ Fullscreen ⇄ 🪟 Window toggle; a free window on a computer (drag, corner resize, remembered across a reload, beside a YouTube player); phones unchanged; Test Lab `stream.view`; `voice/live.mjs` at 1366, 1920 and a tablet.
### WG2. Window Garden: steady buttons, a few simple new things (owner, 15 Nov 2026; Game Studio 2, after QZ2)
- Why: when texts change, buttons jump; the owner wants the garden nicer to play.
- What: no layout shift (fixed widths, reserved lines, tabular numbers); simple additions: backgrounds to pick, small
  customisations (pots, colours), one or two light mechanics.
- Done when: no button moves while playing (a layout-shift check); the additions live; Test Lab hook `garden.decor`.
- Tests: the window-garden harness with a layout-shift measure; shots.
- Owner's pick: his message (Planner chat, 15 Nov 2026).
- Done: #467 (Game Studio 2): the pot's card keeps one height (nothing moves; harness `garden-steady`), window views,
  pot colours, compost, Water all; Test Lab `garden.decor`.

### QZ2. Quiz: more and harder questions, typed answers, a tournament, more jokers (owner, 15 Nov 2026; Game Studio 2)
- Why: the owner wants more variety and more fun; an answer sometimes needs two clicks.
- What:
  - **Fix first:** an answer registers on the first click / tap.
  - **Questions:** +50 % more questions, new categories, more hard ones; a hard question gives a bigger bonus. Some
    typed-answer questions (forgiving: case, accents, one small typo). All written by us (no copied question banks).
  - **Tournament mode:** each player picks a category in turn, everyone answers; the winner has the most round wins,
    a tie goes to points.
  - **More jokers** (e.g. 50:50, skip, extra time, double points), few per game. EN + TR (`check-game-text.mjs`).
- Done when: the above live; the server validates typed answers and jokers; Test Lab hook `quiz.tournament`.
- Tests: quiz server unit tests (scoring, tie rule, typed match), `GameSocket` e2e with 3 players, harness.
- Owner's pick: his message (Planner chat, 15 Nov 2026).
- Done: #458 (first-press answers), #463 (587 checked questions, 3 new topics, typed answers,
  hard bonus), #466 (Double + Second chance jokers, tournament); Game Studio 2.

### GW2. Game windows: fullscreen or frame, any time; the frame goes anywhere (owner, 15 Nov 2026; Game Studio, first)
- Why: the owner meant two modes for every table, ⛶ Fullscreen and a 🪟 Frame; today fullscreen only works in a room
  with no video, and the frame is kept off the video.
- What:
  - **Tables:** a ⛶ / 🪟 switch in every table's head, usable any time. Fullscreen with a video: the video pauses
    (the same rule as the table auto-pause, #46) and ▶ resumes it when the game leaves fullscreen.
  - **Frame:** starts on the right, resizes in proportion, and can be dragged **anywhere, over the video too**,
    YouTube included (owner's decision, 15 Nov 2026, knowing YouTube's rule; never placed over the video by us).
  - **Solo side games** (Snack Bar, Window Garden, Five Frames): always a frame, with the same freedom.
  - **Sweep:** look for other rules like "only without a video" in the games hall and windows; fix them, list them.
- Done when: switch both ways with and without a video, on YouTube and a video file; the frame drags over the video;
  the phone keeps PH2 (Games tab, upright); Test Lab hook `games.mode`.
- Tests: game-windows harness (both modes, with a video), `npm run e2e` table pause/resume, phone harness.
- Owner's pick: his messages (Planner chat, 15 Nov 2026).
- Done: branch `claude/gw2-game-modes` (Game Studio, 16 Nov 2026; option A, real full screen, Planner 15 Nov).

### GP1. Games open at once and answer the first tap (owner, 15 Nov 2026; Game Studio, with GW2)
- Why: Classics stutter while opening; Snack Bar stutters and its pictures arrive late or missing.
- What: preload a game's chunk and art when the hall opens (or on hover / touch-start), decode images before the first
  frame, no layout jank while opening; Classics and Snack Bar ready in ≤ 300 ms after the click on the CI machine with
  the hall open. Check every game for a click that needs two taps (Quiz has one; GS2 fixes Quiz itself).
- Done when: open time measured in the PR for every game; no missing image on first open; Test Lab hook `games.open`.
- Tests: a games-hall timing harness, the snack-bar harnesses.
- Owner's pick: his message (Planner chat, 15 Nov 2026).
- Done: branch `claude/gp1-fast-open` (Game Studio, 16 Nov 2026).

### CH1. PRIORITY: chat history kept until the room is deleted (owner, 15 Nov 2026; lane A, right after SH1 item 0/1)
- Why: the owner and a friend saw their chat "deleted at random". The server keeps only the last 50 messages
  (`CHAT_HISTORY = 50` in `apps/server/src/room.ts`), so older ones vanish, after a reload or for someone who joins. A
  one-time room is wiped 24 h after it empties, a saved one after 30 days; that part stays.
- What:
  - Keep the chat until the room is deleted: at least the last 1,000 messages. Older ones are dropped quietly only past
    that cap ("compressed": their images and reactions go first, then the oldest texts).
  - A Durable Object value is capped at 128 KiB, so store the chat in pages (e.g. 100 messages per key) or in the
    object's SQLite storage. Never one big array.
  - On join, send the last 100; scrolling up loads older pages on demand. Rate-limited, `readCapped` rules apply.
  - Confirm that a deploy or a restart never clears the chat (the storage reload in the constructor). If something
    else wiped it, say what.
  - Images keep their current lifetime (IMG2). Message deletion (MSG1) works on the paged store.
  - The privacy page: chat is kept until the room is deleted (both languages, dated line).
- Done when:
  - 1,200 messages in a room: a reload shows the last 100, and scrolling reaches the 1,000th.
  - The chat survives a deploy (a harness restarts the object) and an empty room within its lifetime.
  - Test Lab hook `chat.history` (count, pages).
- Tests: room server unit tests (paging, cap, compaction, restart), e2e reload + scroll back, the owner's hand test.
- Owner's pick: "don't delete chat unless the room is deleted; maybe compress past some count; you decide" (Planner
  chat, 15 Nov 2026).
- Done: #455 (paged chat store, `chat-older`, Test Lab `chat.history`; live as v0.9.97.141) and #474 (chat-history e2e order).

### SR2. A search result plays on a click; a clear "＋ Queue" button adds it (owner, 15 Nov 2026; lane A, with CH1)
- Why: today a click on a search result's row adds it to the queue, and people expect it to open; "▶ Play now" is the
  only way to play.
- What:
  - A click or tap anywhere on a result row plays it now, the same as "▶ Play now".
  - Each row gets a small, clearly labelled **"＋ Queue"** button (icon and word, "＋ Sıraya" in Turkish, with a
    tooltip and aria-label). It adds the video to the queue without playing, with a short "Added to queue" confirmation.
  - The same rule for every source list (YouTube, Vimeo, Discover, feeds) and on the phone's Search tab. Targets
    ≥ 44 px on a phone. Keyboard: Enter plays; the button is reachable with Tab.
- Done when: a click plays, "＋ Queue" queues, and both are clear in EN and TR on a computer and a phone. Test Lab hook
  `search.results`.
- Tests: the sources and search harnesses, a phone harness, `check-texts`.
- **Also in SR2 (owner, 15 Nov 2026): a ♪ TikTok tile in "Where to search".** TikTok gives no search API, so the
  tile opens TikTok: a new tab on a computer, the TikTok app on a phone. It says "Copy a video's link and come back".
  When the person comes back, a big "📋 Paste and play" button appears; it reads the clipboard after a tap and asks
  first if needed. A pasted TikTok plays in the Shorts view, and several links go to the queue. The tile reads
  "TikTok" in plain text with a generic music-note icon: no TikTok logo without permission (Research
  `tiktok-shorts.md` §3). No scraping and no extension involvement.
- Owner's pick: his screenshot and message (Planner chat, 15 Nov 2026); the TikTok tile, option A.
- Done: #460 (17f4101): rows play on a tap, "＋ Queue" on every result list, ♪ TikTok tile, "📋 Paste and play"; Test Lab `sources.state`.

### GR1. PRIORITY: opening a game must never throw you out of the room and reload the page (owner, 16 Nov 2026; B2 + lane A)
- Why: the owner sees some games kick him out and reload when he opens them or presses Play. The likely cause is the
  stale-chunk path: after a deploy, a tab still running the old build asks for a lazy chunk (a game, a panel) whose
  hashed file is gone, and `main.ts` reloads the page (OFFLINE2). With CI3 batches, deploys are more frequent, so this
  will happen more.
- What:
  - **Confirm the cause first** (B2): reproduce with a tab open across a deploy and open each game; also rule out a game
    socket error. Report what it was.
  - **Keep old chunks for a while** (B2, deploy): each deploy also serves the previous builds' hashed assets for at
    least 24 h (e.g. carry the last builds' `assets/` forward), so an open tab never misses a chunk.
  - **Never a silent reload mid-room** (lane A, `main.ts` / `loadChunk`): if a chunk is still missing, show a calm
    "Sidelit was updated · ↻ Refresh" note and reload only on the tap; the room, name and seat come back after it.
- Done when: a tab open across two deploys opens every game without a reload (harness); a missing chunk shows the note,
  never reloads by itself; Test Lab hook `app.staleChunk`.
- Tests: a deploy-across harness (old build → new build, open all games), unit test of the note path.
- Owner's pick: his message (Planner chat, 16 Nov 2026).
- Done: #477 (B2: earlier builds' assets kept 7 days) and #476 (lane A: "Sidelit was updated · ↻ Refresh" note, never a silent reload in a room; Test Lab `app.staleChunk`; also the BUD2 phone-room race fix: `scripts/harness/phone-ready.cjs`).

### UI2. Rail ⋯ menu: one compact speed control; "Keep the controls open" starts off (owner, 15 Nov 2026; lane A, after EC1)
- Why: 12 speed buttons tire the eye; the owner found "Keep the controls open" ticked.
- What:
  - **Speed:** one row "⏩ Speed · 1×" instead of the grid. Tapping it opens a small picker: 0.5 / 1 / 1.25 / 1.5 / 2
    plus − / + (or a slider) for a custom speed from 0.25× to 3× in 0.05 steps. YouTube only plays its own rates, so
    there the custom value snaps to the nearest one. Same control in the phone ＋ sheet; the menu gets shorter.
  - **Keep the controls open:** `opt:railPin` must start off for everyone. Check that nothing (a migration, Test Lab,
    a default) turns it on by itself; if nothing does, the owner's browser saved it once (tell the Planner).
- Done when: speed row + picker work on YouTube, a file and the extension, synced; a fresh browser has the pin off;
  Test Lab hook `rail.speed`.
- Tests: sync-engine scenario for a custom rate, room harness for the menu height, phone ＋ sheet harness.
- Owner's pick: his message with screenshots (Planner chat, 15 Nov 2026).
- Done: #469 (bc77a73): one compact "⏩ Speed" row in the rail ⋯ menu, "Keep the controls open" off by default; Test Lab `rail.speed`.

### CI3. Release train: several finished PRs go live together, without the one-by-one wait (owner, 15 Nov 2026; B2, after #452)
- Why: the owner asked why every release waits on so many tests when most of them find nothing. The tests stay (on
  15 Nov they caught a Snack Bar text that fell under 11 px, which main's push run had let through). What costs is
  the queue: each PR is updated from main, runs the full PR CI again (~8.5 min), merges, then waits for its own
  deploy + live e2e (~11 min) before the next one may start, so three ready PRs take about an hour.
- What:
  - **One release for a batch:** PRs that are green merge as soon as they are green (no "update from main and re-run"
    when the files don't overlap); main's run deploys and runs the live e2e once for whatever has landed. The
    version and `CHANGELOG.md` block cover the batch (one fourth-part number per batch; the Planner assigns it).
  - **Main's push run checks what the PRs skipped:** the job that failed on 15 Nov (games-more) never runs on main, so
    a regression from a combination of two PRs or a date-dependent test reached main unseen. Run the jobs the merged
    PRs touched once on main before deploying (or a short nightly full run), so main never goes red silently.
  - **No date- or time-dependent results:** a test that depends on today's date (Snack Bar daily special, seasonal
    themes, schedules) forces every variant instead (lane A's per-special harness from #447 is the model).
  - **Keep:** every gate in CLAUDE.md §7 "CI" and §9 (live e2e green before the tag, the canary gate, no
    `paths-ignore`). Docs-only PRs keep skipping the heavy jobs.
- Done when: three ready code PRs go live in ≤ 25 min from the first merge (measured on a real batch); main's run
  catches a regression that only the combination of two PRs causes (a forced test case); no test result depends on the
  date (a forced-date run in CI); `docs/internal/architecture/reference.md` "CI" updated.
- Tests: the CI itself (a dry run on a test branch), the measurement in the PR.
- Owner's pick: his message (Planner chat, 15 Nov 2026).
- Done: #464, #472, #473, #480, #482 (tested-code mark, 2-min settle, CI numbering via `release-series.txt` +
  `changelog/next/` + `check-version-edits.mjs`, nightly forced-date sweep, 3 live shards, 7 PR jobs). Measured on
  main: 1 PR whose code a PR tested ≈ 13 min (merge → live e2e end); 2-PR untested combination 22 min (#473 + #474);
  busy 3-PR batch before #482: 38 min. After #482, busy batch #485 + #484 + #467 + #469 (2 code, 2 docs; run
  43891275318, v0.9.97.149): first merge 14:53 → live e2e end 15:34 = 41 min, of which 18 min waiting for the
  previous main run (#482's deploy + live e2e) to finish; the batch's own run (settle → live e2e end) 23 min; test jobs
  started 2 s after `changes` (runners free; on a busy office before #482: 4–9 min). Quiet path ≤ 25 min holds; a busy
  office adds the previous run's remaining time.

### GMP. Bigger table games: Five Frames Duel and Sea Battle for 2–6, spectators see the game, many more words (owner, 15 Nov 2026; Game Studio)
- Why: the owner wants these two games for groups. He also wants spectators to see what happens ("it's fine if they
  see, they are friends"), and the word game needs far more words.
- What:
  1. **Spectators see the game:** in Sea Battle and the Five Frames Duel a watcher sees every board live. That means
     the Duel players' letters, and in Sea Battle all ships and shots. Players still never see each other's hidden
     information (a player sees only their own ships, and in the Duel only the others' colour marks). The server sends
     watcher views only to watchers.
  2. **The Five Frames Duel for 2–6 players:** same rules, more players racing on the same word. The finish order
     ranks them, and the result card shows 1st to 6th. Lobby, head and phone Games-tab layouts fit 6.
  3. **Sea Battle for 2–6 players:** each player has a sea. On your turn you **choose which player to attack**, then
     fire; turns go round. A player whose ships are all sunk is out but keeps watching. The last one with ships wins.
     It is played for fun: no rule forces fairness.
  4. **Many more words, English and Turkish:**
     - The answer lists and the accepted-guess lists for both languages grow from open-licensed sources (licence
       checked: MIT / Apache / BSD / CC0 / CC-BY with attribution in `apps/web/public/third-party-notices.txt`).
     - Answers are common, clean words: no slurs, no adult words, no proper nouns. Guesses may be broader.
     - Turkish handles İ/ı correctly.
     - Size targets are the studio's to propose, e.g. 2,000+ answers and 10,000+ guesses per language.
     - The lists ship as lazy chunks so the room bundle doesn't grow.
- Done when:
  - Every hidden-information rule above is enforced by the server, with unit tests.
  - Both games run with 2, 3 and 6 players in e2e.
  - The phone Games tab fits 6 players at 360×640.
  - The word lists pass a licence note and a profanity filter check.
  - Test Lab hooks: `seaBattle.state`, `duel.state` (players, turn, target, watchers).
- Tests: server unit tests (turns, targets, elimination, watcher views), e2e with fake players, games-sweep at phone
  and laptop, and the owner's hand test with friends.
- Owner's pick: his message (Planner chat, 15 Nov 2026). He allows extra skills or tools for the word lists. The
  studio says which and why before using them.
- Done: #483 (Game Studio, 16 Nov 2026): (a) word lists + watchers in 0.9.97.138, (b) 2–6 players for the Duel and Sea Battle.

### SH2. Feeds: ♾ Shorts and ▶ Videos, reachable from the room, steerable, no repeats (owner, 15 Nov 2026; B2, after SH1)
- Why: the infinite Shorts feed only lives inside the Shorts view, its window is confusing, and a new feed brings back
  Shorts the room has already watched.
- What:
  1. **Reach it from the normal room:** the Queue ("Up next" / Sıra) shows the active ♾ feed as a row (its name and
     what it follows). It can be paused, resumed and steered there without entering the Shorts view.
  2. **A simple, clear ♾ window:** one screen with the active feed on top and plain choices. Steer the running feed
     instead of making a new one:
     - "Continue from this channel";
     - "Same topic, other country";
     - "More like this one";
     - "Change the topic".
     One line explains each; changes apply to the next Shorts without a restart.
  2b. **▶ Video feed (owner, 15 Nov 2026 evening):** the same idea for normal YouTube videos. The Queue gets two
     buttons, "♾ Shorts feed" and "▶ Video feed". A video feed starts from:
     - "like this video" (a pasted link or the playing one);
     - "this channel" (newest / random / most viewed);
     - "popular now" (country and category);
     - "a topic".
     It is steerable the same way.
     - **Quota-aware:** `search.list` costs 100 units of the 10,000 a day, so prefer the cheap calls: `playlistItems`
       of a channel's uploads, the `videos` `chart=mostPopular` with region and category, `videos.list` (1 unit each).
     - Cache per room and per query in the Worker.
     - Never call search per video.
     - Planner's extra ideas, for the studio to pick from if cheap: length filter (short / medium / long), "two
       channels mixed", continue a pasted playlist, "room votes between 3 next videos" (reuse voting), "each person's
       turn".
  3. **No repeats:** the room remembers the Short ids it has played, on the room's server object, ids only. A new or
     steered feed skips them.
     - A one-time room forgets them when it is deleted.
     - A saved room keeps the last 2,000 ids for 30 days.
     - The privacy page notes it in both languages if needed (ids of public videos, no personal data).
- Done when:
  - The feed is visible and steerable from the Queue on a computer and a phone.
  - Each steer changes the next Shorts.
  - A new feed doesn't replay watched ids (unit + e2e).
  - The memory is wiped with the room.
  - Test Lab hook `feed.state` (active feed, steer, remembered count).
- Tests: room server unit tests for the memory and its caps, e2e feed → steer → no repeat, the shorts harnesses, and
  the owner's hand test.
- Owner's pick: his message (Planner chat, 15 Nov 2026); the memory length is the Planner's call.
- Done: #488 (`claude/sh2-feeds`, 3b7275e, v0.9.97.151, live e2e green): the feed lives on the room object and shows as a Queue row for
  everyone (Pause / Resume, 🧭 Steer, ✕; "♾ Shorts feed" / "▶ Video feed" when none); ▶ video feed (popular now via
  `chart=mostPopular` 1 unit, channel newest / random / most viewed, like a video, topic); one window with four steers;
  the room remembers played YouTube ids (2000 / 30 days, wiped with the room; privacy page EN + TR); Test Lab
  `feed.state`; e2e `shorts.mjs` + `search.mjs`, CI harness `feed`. Lane A's TikTok note lives in the new ♾ tab.

### EC1. "Video ended" card in the middle of the screen, not in the chat (owner, 15 Nov 2026; lane A, small, after SR2)
- Why: with YouTube the "Video ended / ▶ Start next / Close" card sits in the chat panel (5B, 0.9.92.9), where it reads
  like a chat message and is easy to miss. The owner wants it in the middle of the screen, in a normal clean design.
- What:
  - `ui/end-card.ts` `showNextCard`: the card opens as a **centered dialog** over the room view (the same dialog kind as
    Settings: `role="dialog"`, a light dim behind it, focus on "▶ Start next", Esc / Close / a click outside closes it,
    the 60 s auto-close stays). Same place for YouTube, video files, fullscreen and the extension overlay; take
    `.end-card` out of `NOTICES` / `placeNotices` in `room.ts`.
  - Design: "Video ended" small and muted, the video's title in plain text (at most 2 lines, then …; the link only as
    a small ↗ next to it, no dotted underline), the two buttons side by side and full width on a phone (≥ 44 px).
    Fits at 1366, 1920, tablet and phone without scrolling; Design gives it one look before merge.
  - YouTube RMF: the card only appears after the video has ended, is a page dialog (not a layer attached to the
    player), and never covers the player while it plays. The Shorts view keeps its own place (BH12).
- Done when: the card shows centered on computer and phone, YouTube and a video file, normal and fullscreen; Close,
  Esc, outside click and Start next work; Test Lab hook `endcard.show`; shots reviewed (QA1).
- Tests: the room harness that covers the end card, `scripts/shots.cjs` for the end card at the 4 sizes.
- Owner's pick: his message with a screenshot (Planner chat, 15 Nov 2026).
- Progress (lane A, 16 Nov 2026): built in #465 (branch `claude/ec1-end-card`, main merged, texts in `ui/lab-texts.ts`); red only on the state-matrix games-window drag / hover flake (Game Studio fixing); merge once that is green.
- Done: #465 (`claude/ec1-end-card`, centered dialog, Test Lab `endcard.show`), live in v0.9.97.153 (live e2e green).

### SH1. Shorts view fixes: the way back on a phone, the first seconds, who is talking (owner, 15 Nov 2026; lane A)
- Why: three things the owner found in the Shorts view.
- What:
  0. **Urgent, the computer too (owner, 15 Nov 2026 evening):** the owner finds no "📱 Shorts view" button on a
     computer either after "↩ Room view". Today `#shorts-enter` sits in the toolbar under the video and shows only while
     a Short plays. Find why he can't see it (hidden layout, toolbar folded, SIMP1) and make the way back obvious on
     every device. Ship this first, alone if needed.
  1. **The way back on a phone:** after "↩ Room view" a phone has no way back into the Shorts view. `.shorts-enter` is
     hidden in `html.ph-room`, and `shortsOff:<room>` stays in session storage. While a Short plays, give the phone a
     clear "📱 Shorts view" entry in the Room tab (the strip under the video), and keep the computer's button.
  2. **The first 2–3 seconds:** when the next Short starts by itself, the owner misses its first 2–3 seconds. Find out
     why (preload, `command()` seek, the start being swallowed, the late-join offset) and fix it, so every viewer sees a
     Short from 0:00 together. Add a `sync-engine.test.ts` scenario if the sync engine is involved.
  3. **Who is talking:** in the Shorts bar's faces (and the phone strip's faces), a person who is speaking in voice
     gets a visible ring around their round avatar (a green glow and a slight grow), driven by the existing voice
     level.
     - It respects reduced motion (ring only, no grow).
     - It shows for yourself too, so you know your mic is going out.
  4. **TikTok, small (Research `research/tiktok-shorts.md` §6):**
     - Accept short `vm.`/`vt.tiktok.com` links when pasting many links; the Worker resolves them one by one.
     - When a TikTok plays, the ♾ window says that TikTok has no public feed and points to pasting or sharing links.
     - A harness swipes through a queue that mixes YouTube Shorts and TikToks.
     - No TikTok search or feed: TikTok offers none legally.
- Done when:
  - On a phone you can leave and re-enter the Shorts view any number of times.
  - An auto-advanced Short starts at 0:00 for everyone (a harness measures `currentTime` at start).
  - A speaking avatar lights up in the Shorts bar on a computer and a phone.
  - Test Lab hook `shorts.state` reports the view, the start offset and the speakers.
- Tests: the shorts-rail / shorts-door harnesses, a phone harness for the way back, a unit scenario for the start, and
  the owner's hand test.
- Owner's pick: his three points (Planner chat, 15 Nov 2026).
- Progress (lane A, 16 Nov 2026): items 0/1 live (#447, 0.9.97.137); item 3 (speaking ring) in #471, waiting for Game Studio's state-matrix hover fix; item 2 (start together, ready-based lead-in) in #486; item 4 (TikTok small) on `claude/sh1-tiktok-small`; the `shorts.state` start offset not started.
- Done: #447 (items 0/1, 0.9.97.137), #486 (item 2, ready-based lead-in, v0.9.97.150), #471 (item 3, speaking ring),
  #495 (`shorts.state` start offset), #489 (item 4, TikTok `vm.`/`vt.` links, harness `shorts-mixed`); all live in
  v0.9.97.153 (live e2e green).

### SH3. Shorts view on a computer: the chat in a panel you can open and close (owner's friend, 15 Nov 2026; lane A, after SH1)
- Why: in the Shorts view on a computer, 💬 opens only a box to send a message; you can't read the chat. A friend of
  the owner asked to see it, with a panel that opens and closes.
- What: 💬 in the Shorts view (computer) toggles a chat panel beside the upright video, in the empty space on the
  right: the room's chat list (newest at the bottom), the message box and 😀, ✕ to close. It never covers the video
  (nothing over the YouTube player); the open / closed choice is remembered per room (`shortsChat:<room>`); unread
  count on 💬 while closed. The phone keeps its 💬 sheet (PH1).
- Done when: open / close, send, read, unread count at 1366 and 1920 and on a sideways tablet; Test Lab hook
  `shorts.chat`.
- Tests: Shorts view harness (panel open, no overlap with the player), shots (QA1).
- Owner's pick: his message (Planner chat, 15 Nov 2026).
- Done: #499 (`claude/sh3-shorts-chat`, 💬 chat panel beside the upright video, `shortsChat:<room>`; Test Lab
  `shorts.chat`; harness `shorts-chat`), live in v0.9.97.155 (live e2e green).

### VC1. Voice: a deafen button, and the YouTube volume slider (owner, 15 Nov 2026; lane A, after SH1)
- Why: the owner wants a Discord-like "deafen" in voice, and on YouTube he can't drag the volume, because one click
  jumps it.
- What:
  1. **🎧 Deafen:** in voice, next to 🎙, a headphones button turns off what you hear from voice (everyone's voice,
     the stream's sound if any). It also mutes your own mic, like Discord, and shows the state to others (a crossed 🎧
     on your face). It is kept per room over a reload. The film's sound is untouched.
  2. **Volume dragging:** find why dragging the volume on a YouTube video doesn't work and one click jumps it. Check
     our rail's `#dock-vol`, an overlay or pointer capture over YouTube's own slider, and touch vs mouse. Make it drag
     smoothly on a computer and a phone. Never put anything of ours over YouTube's player.
- Done when:
  - Deafen silences voice for you only, shows to others, and survives a reload.
  - Volume drags smoothly.
  - Test Lab hook `voice.deafen`.
- Tests: voice e2e (deafen state), a harness for the volume drag, the owner's hand test.
- Owner's pick: his message (Planner chat, 15 Nov 2026).
- Done: #501 (`claude/vc1-deafen`, 🎧 deafen with optional `deaf` on the voice message (`setVoice`), YouTube volume drag via
  `focusBackFrom`; Test Lab `voice.deafen`; harnesses `deafen`, `yt-focus`), live in v0.9.97.155 (live e2e green).

### VC3. Voice that can't connect says so (VPN, strict networks) (owner, 16 Nov 2026; lane A, with VC1)
- Why: with a VPN (or a strict school / work network) voice "connects" but nobody hears anybody: voice goes directly
  between people, and these networks block the direct path. The owner chose a clear warning for now, no relay server
  (TURN) yet.
- What: watch each voice link; when one can't connect within ~10 s (ICE failed / never connected), show the person a
  plain note: "Your voice isn't reaching the others. A VPN or this network may be blocking it — turn the VPN off and try
  again." (TR too), with a small ⓘ in the people list on the link that failed. No technical words. Clears itself when the
  link works. The help page gets a short "Voice and VPNs" entry.
- Done when: a forced ICE failure shows the note and the ⓘ; a good link shows nothing; Test Lab hook `voice.blocked`.
- Tests: voice harness with a forced failed link; texts check.
- Owner's pick: "warning only for now" (Planner chat, 16 Nov 2026). A relay (Cloudflare TURN, 1,000 GB/month free) can
  come later as its own card if VPN users ask for it.
- Done: #502 (`claude/vc3-voice-blocked`, note + ⓘ after 10 s, help "Voice and VPNs"; Test Lab `voice.blocked`),
  live in v0.9.97.156 (live e2e green).

### MSG1. Delete a chat message for everyone; the host can delete others' (owner, 15 Nov 2026; lane A, after VC1)
- Why: there is no way to take back a message.
- What:
  - **Delete your own message:** in the message's menu (hover ⋯ on a computer, long-press on a phone), "🗑 Delete for
    everyone". It asks once. The server removes the text, any image and its reactions from the room's history and tells
    every client. In its place everyone sees a muted line: "Alex deleted a message".
  - **The host deletes anyone's message:** the same menu item on others' messages, only for the (acting) host. The line
    reads "The host deleted Sam's message" (or "Alex (host) deleted Sam's message").
  - Private messages: the sender can delete; the line shows only to the two people.
  - **Server rules:** validate the message id, check it is the sender's or the caller is host, and rate-limit. The
    deleted content is gone from the stored history (not just hidden), and replies or pins that quote it show "deleted
    message". Old clients ignore the new message type (optional field, no protocol bump unless needed).
  - Texts in `i18n.ts` / `i18n-tr.ts`.
  - The privacy page notes that deleted messages are removed from the room's history (both languages).
- Done when:
  - Your own and the host's deletes work for everyone, live and after a reload, with the right line.
  - A non-host can't delete others' messages (server-enforced, unit test).
  - Test Lab hook `chat.delete`.
- Tests: room server unit tests (permissions, history removal, rate limit), e2e with three clients (sender, host,
  other), phone long-press harness, the owner's hand test.
- Owner's pick: his message (Planner chat, 15 Nov 2026).

Game Studio cards (GMP, GW2, GP1, GT1, QZ2, WG2): `docs/internal/cards-games.md`.
- Done: #509 (`claude/msg1-delete-message`, `{t:'chat-delete'}` / `chat-deleted`, `ChatOwners`; Test Lab
  `chat.delete`; e2e `chat-delete.mjs`, harness `chat-delete`), live in v0.9.97.157 (live e2e green).

### CR2. YouTube Music playlists and albums into the queue (Research, 15 Nov 2026; owner's pick 17 Nov: "add it if easy"; lane A, after MSG1)
- Why: `music.youtube.com/watch?v=` already plays (`media.ts` accepts the host), but playlist / album links don't;
  SyncUp lists YouTube Music as a no-extension source (`research/competitors/no-extension-sources.md`).
- Done when: a `music.youtube.com/playlist?list=` (and `browse/` album link where it resolves to a playlist id) adds its
  videos to the queue through the Data API calls we already make (quota counted in the usage book); an
  embedding-disabled track shows the existing "can't play here" state and is skipped; help says YouTube Music links
  work; a Test Lab scenario adds a fixture playlist.
- Tests: unit (link parsing in `media.ts`), e2e with a mocked playlist answer, the owner's real check.
- Owner's pick: "add it if easy" (Planner chat, 17 Nov 2026).
- Test Lab hook: `queue.playlist` (three fixture tracks, no YouTube call).
- Progress (lane A, 16 Nov 2026): built on `claude/cr2-yt-playlists` (`/api/youtube/playlist`, `parsePlaylist`, harness
  `playlist`); album `browse/` links don't resolve to a playlist id without scraping, so help points to Share → Copy link.
- Done: #512 (`claude/cr2-yt-playlists`, `/api/youtube/playlist`, `parsePlaylist`; Test Lab `queue.playlist`; harness
  `playlist`) and #520 (`claude/cr2-playlist-404`, a private / unknown list = no items), live in v0.9.97.158 (live e2e green).

### GT1. Clearer tutorials and a "❓ How to play" button in every game (owner, 15 Nov 2026; Game Studio, after GMP)
- Why: the first-run tutorials are a little thin; players can't see them again.
- What: each tutorial a little more detailed and plain (EN + TR); "❓ How to play" in each game's menu replays it;
  no scrolling.
- Done when: every game has it; `check-game-text.mjs` green; Test Lab hook `games.tutorial`.
- Tests: games harnesses open the tutorial from the menu; shots at 4 sizes.
- Owner's pick: his message (Planner chat, 15 Nov 2026).
- Done: #496 (`claude/gt1-tutorials`, Game Studio, 16 Nov 2026; Test Lab `games.tutorial`).

### GW3. Games never take the whole screen: "big" means the video's place (owner, 17 Nov 2026; Game Studio, first)
- Why: GW2's ⛶ puts a table into real browser fullscreen (Esc note, chat and voice gone). The owner meant something
  else: "only videos ever go fullscreen".
- What:
  - A shared game is a frame that can move anywhere, over the YouTube player too (GW2 stays).
  - The frame's "big" button (it need not look like ⛶; pick a clear icon and words, e.g. "Fill the video's place")
    puts the game into the video's place (the player's frame). The side panel, chat, voice and the rail stay usable.
    Never `requestFullscreen` for a game, side game or panel; remove GW2's real fullscreen.
  - Shorts view: games only as free frames (no "big" button there).
  - Switching normal ↔ Shorts view while a game is open keeps the game, its mode and its connection: a frame stays a
    frame; a game in the video's place becomes a frame in Shorts and goes back when you return. Opening a game never
    drops the room or game connection.
- Done when: no game path calls fullscreen (a unit or harness check); the big mode fits the video's place at 1366,
  1920, tablet and phone without scroll; the Shorts switch harness keeps the game socket open (no reconnect); Test Lab
  hook `games.frame` (frame / video's place / Shorts); reference.md "Game windows" updated; owner's hand test.
- Owner's pick: his message (Planner chat, 17 Nov 2026): "tam ekran olan şeyler sadece videolar".
- Done: #525 (`claude/gw3-video-place`, Game Studio, 17 Nov 2026; check `scripts/check-games-fullscreen.mjs`, harness
  `games-shorts`, Test Lab `games.frame`); owner's hand test sent to the Planner.

### GW4. Opening a game never moves the room layout (owner, 17 Nov 2026; Game Studio, after GW3)
- Why: opening Five Frames (a side game) made the YouTube frame and the side panel / chat shift and shrink.
- What: a game (side game or table) opens over the existing screen (its frame, the video's place by the GW3 rule);
  the video, the rail and the side panel keep their size and place while a game opens, plays and closes.
- Done when: opening and closing every game at 1366, 1920 and a phone leaves the video and side panel rects unchanged
  (± 1 px); Test Lab hook `games.layoutStable` (records the rects before / after).
- Tests: a games harness compares `getBoundingClientRect()` of the player and `.side` before, during and after a
  game; shots at 4 sizes.
- Owner's pick: his message to the Planner (17 Nov 2026).
- Done: #532 (`claude/gw4-layout-stable`, Game Studio, 17 Nov 2026; harness `games-layout`, Test Lab
  `games.layoutStable`); owner's hand test sent to the Planner.

### GW5. Game frames scale in proportion, with a minimum and maximum size (owner, 17 Nov 2026; Game Studio; "very important")
- Why: making Five Frames narrower wraps its legend ("In the right place / In the word / Not in the word") and
  collapses the head buttons to icons. The owner wants every game to look the same at any size, only bigger or smaller.
- What: every game (side games incl. Snack Bar, Window Garden, Five Frames; every shared table) lays out once at a
  design size and scales as a whole (e.g. a fixed-ratio stage with `transform: scale` or container units), keeping
  its aspect ratio; a resizable frame keeps that ratio while dragged and stops at a minimum (still readable, controls
  ≥ 24 px, 44 px on a phone) and a maximum (the space it gets). No wrapping, no icon-only collapse, no scroll.
- Done when: each game at its minimum, a middle and its maximum size looks the same apart from scale; Test Lab hook
  `games.scaleCheck` (sets the frame to min / mid / max).
- Tests: games harness resizes each frame to min / mid / max and checks the ratio and that no text box wraps
  differently; shots per game at the three sizes; `CLAUDE.md` §6 "no scrolling inside a view" still holds.
- Owner's pick: his message to the Planner (17 Nov 2026).
- Done: #537 (`claude/gw5-proportional`, Game Studio, 17 Nov 2026; harness `games-scale`, Test Lab `games.scaleCheck`).
  Left open: Last Heart running in a sideways tablet's video's place ≈ 10 px small print (needs its own compact layout).

### SRC2. "What are we watching?" source picker: big grid (owner, 17 Nov 2026; lane A, first)
- Why: the ⠿ popover (SRC1) is small and menu-like; the owner wants big tiles with category chips.
- What: option A of `docs/internal/design/source-picker.md` (sketches `source-picker/a-computer.svg`,
  `a-phone.svg`): the 12 tiles and chips in that note, source vs action tiles, Coming tiles that explain; in the
  video's place on a computer, in the side panel's place while a YouTube video shows (nothing over the YouTube
  player), a bottom sheet on a phone; opened by ⠿ and the empty room's "🔍 Search a video"; no brand logos; arrow keys,
  Esc, focus return; no scroll inside the view.
- Done when: it replaces SRC1's popover on computer + phone; Test Lab hook `sources.picker`; harness in the `site`
  job (open, filter, pick a source, run an action, Esc); shots at 4 sizes; owner's hand test.
- Owner's pick: A "Big grid" (picks page, 17 Nov 2026).
- Done: #527 (`claude/src2-source-picker-grid`, lane A, 17 Nov 2026; live in v0.9.97.160; harness `sources`, Test Lab
  `sources.picker` / `sources.open`, shots `sources`, `sources-youtube`, `sources-music`); owner's hand test 27ab.

### GMP2. Sea Battle and the Five Frames Duel show and offer 3–6 players (owner, 17 Nov 2026; Game Studio)
- Why: the owner still sees "1–2 players" on Sea Battle and the Five Frames Duel; GMP b (#483, live since 0.9.97.153)
  should allow up to 6 (anyone can attack any other fleet).
- What: check the games hall and lobby labels and that the live build really seats 3–6 (old text, a missed path, or a
  cached build); fix what is wrong. Optional, Game Studio's call: 1–2 jokers for 3+ player Sea Battle if they make it
  more fun. Classics stay as they are.
- Done when: the hall and lobby say "2–6 players" (EN + TR) for both, a 4-player live game works; Test Lab hook
  `games.seats` (fills seats with bots).
- Tests: a games e2e with 4 `GameSocket` players in each; live e2e green; a hand test for the owner (3+ people).
- Owner's pick: his message to the Planner (17 Nov 2026).
- Done: #538 (`claude/gmp2-six-seats`, Game Studio, 17 Nov 2026): the server seated six since GMP b (#483), only
  the hall's `GAME_CATALOG` (`max: 2`) and the two descriptions said 2. Test Lab `games.seats` (three 🤖 friends),
  harness `lab-table-friend` (hall label, four players at each); e2e `sea-many` / `duel-many` (3 and 6) unchanged.

### FD1. Feed start window and Shorts view: design options, then build (owner, 17 Nov 2026; Design first, then lane A)
- Why: SH2's "♾ Shorts feed / ▶ Video feed" window and the Shorts view are cramped and unclear; things overlap; a
  Discover chip (Popular, Music …) starts the feed at once, before he has chosen.
- What (owner's asks):
  - Choose first, then a clear "Start feed" button; options more detailed and meaningful but simple-looking, not cramped;
    each control says what it does.
  - The window opens on the RIGHT side of the screen so the playing Short / video stays visible while he sets it up.
  - A started feed is seen by everyone; anyone may cancel it and start their own.
  - Host setting in Room rules: "Only the host can start a feed" (default: everyone can).
  - Tidy the Shorts view: nothing overlapping, clear labels.
- Design step: `docs/internal/design/feed-start.md` with 2–3 options (recommended first, a short preview each, computer
  + phone sketches), sent to the Planner as text. Build only after the owner's pick.
- **Owner's pick (17 Nov 2026, picks page):** A, right drawer with 3 steps on one screen (`design/feed-start.md` A,
  sketches `feed-start/a-*.svg` incl. the tidy Shorts view); the host rule also covers steering and stopping.
- Done when: the picked design is live; Test Lab hook `feed.start`; the host rule enforced on the server (protocol
  optional field) with an e2e; shots at 4 sizes; owner's hand test.
- Done: #529 (FD1a, v0.9.97.160) + #535 (FD1b, v0.9.97.161), 17 Nov 2026.

### FC1. PRIORITY: the feed's country choice really gives that country's videos (owner, 17 Nov 2026; lane A, first)
- Why: the owner picks Japan in the ♾ Shorts feed and keeps getting Indian videos; "the country options never work,
  something is wrong in the logic; this is important".
- Lead (Planner, not verified): the Shorts pool (`youtubePool`, `apps/server/src/youtube.ts`) is a `search.list` with
  `regionCode` + `relevanceLanguage` = the UI language (`tr` / `en`). On `search.list`, `regionCode` only limits to
  videos *viewable* in that country, not made there, and the language is never the country's (Japanese for Japan), so
  globally popular Shorts win. The ▶ video chart uses `videos.list chart=mostPopular` with `regionCode`, which is
  per-country: check whether it behaves correctly.
- What: audit every place a country is used (Shorts pool, video chart, 🧭 "Same topic, another country", the
  steering) and fix the logic so a chosen country yields that country's content: e.g. the country's main language
  as `relevanceLanguage` (a small country → language map), the chart where the API offers one, and a test that
  the chosen region reaches the request. Keep quota cost in mind (`EXPECTED_UNITS`) and the shared cache keys.
- Also (owner, same day): **words, country and kind combine.** Today the words box and the country are separate. He
  wants e.g. Japan + "hay" = Shorts tagged / titled "hay" from Japan, and Popular + Japan + "hay" = the most viewed of
  those. Make every pick in the feed window (kind chip, country, words / @channel) one combined query where the API
  allows it (`search.list` takes `q` + `regionCode` + `relevanceLanguage` + `videoCategoryId` + `order`;
  `chart=mostPopular` takes no words, so with words use `order=viewCount`); say plainly in the window what "Will
  play" means. Where a combination truly can't work, don't fake it: grey it out with a one-line reason.
- Also: **review the kind chips** (Popular, Music, Gaming, Comedy, Animals, Sports): check what each really returns
  per country (category ids that exist per region, empty or off-topic results) and keep, fix, rename or drop each;
  write the findings in the PR. Don't add complexity that doesn't pay off.
- Done when: Japan, Turkey, US, Brazil and Germany each give mostly that country's Shorts and videos, alone and
  combined with words and a kind (a live
  spot-check list in the PR); unit tests for the request parameters; Test Lab hook `feed.region`; owner's hand test.
- Owner's pick: his message to the Planner (17 Nov 2026).
- Done: #539 (v0.9.97.163), 17 Nov 2026.

### RC1. The session recap, redesigned: design options, then build (owner, 17 Nov 2026; Design first, then lane A)
- Why: today's recap (Profile menu, `ui/recap.ts`) is hard to find, looks out of place, and its phone-like story screen
  with side swipes is not what he wants. He wants something people love and use at the end of a session.
- What (owner's asks; he is undecided on the flow, so give options):
  - Findable but not screen-filling. Beautiful backgrounds with our logo, several cute designs; facts get their own
    background (e.g. "most emojis").
  - Ideas for getting people to see it at the end of a session although we can't know when they close the tab,
    without nagging people who already know it.
  - Flow he leans to: only the host can start it; others send "ask the host to show the recap"; on the host's yes it
    plays for everyone in the video's place like a newly opened video (Shorts view switches to the normal view), the
    queue unchanged: a horizontal, windowed, scrolling show (not a phone story), maybe with its own music. Content:
    when you started, how long you watched, the most-used emoji and who sent it, who talked most, etc.
  - Session rule: a "day" is a session, not a date. Proposal to check: a session starts after a gap of ≥ 4 h without
    activity (today's `SESSION_GAP_MS`); the recap can be shown once per session after ≥ 30 min of watching; after it
    is shown it cannot be shown again in that session; the next session resets it. The design note confirms or
    improves this rule.
- Design step: `docs/internal/design/session-recap.md` with 2–3 options for look, entry point and flow (recommended
  first, short previews), sent to the Planner as text. Build only after the owner's pick.
- **Owner's picks (17 Nov 2026, picks page):** look A night stage (one 16:9 scene per fact, own background each, logo,
  filmstrip); who A host shows, guests ask ("🙋 Ask the host", one toast "Show to everyone / Not now"); where A ✨ on the
  rail once ready (≥ 30 min, gold dot until opened); music A our own Web Audio pad, low, 🔇, off when sounds are muted.
  Defaults he saw and did not object to: nudges N1 / N2 / N4 (max one per person per session, "Don't remind me"), the
  session rule with Design's 4 improvements (`design/session-recap.md`).
- Done when: the picked design is live; Test Lab hook `recap.show`; server rule (once per session) with an e2e;
  privacy page checked (no new data unless stated); shots at 4 sizes; owner's hand test.

Game Studio cards (GMP, GW2, GP1, GT1, QZ2, WG2): `docs/internal/cards-games.md`.
- Done: #536 (v0.9.97.165), 17 Nov 2026.

### UI4. The owner's 17 Nov polish pass (owner, 17 Nov 2026; lane A, after FC1 and RC1)
- Why: the owner's notes after trying SRC2 / FD1 live.
- What:
  1. **No feed pill on top.** Remove the "♾ Feed: … · N left · by …" pill from above the video / the "Now playing"
     bar in the room view and the Shorts view. The feed shows only where the feed lives (the feed window / drawer and
     the queue's feed row). Keep pause / stop there.
  2. **Drive-In is the default theme.** Every new visitor and every room starts in the Drive-In theme
     (`themes.ts` `acikhava`); anyone can change it and the choice stays saved in the browser as today. A saved
     choice is never overwritten. (The owner: "I like it most right now; we may change it later.")
  3. **"What are we watching?" picker polish (SRC2):** (a) the grid sits too high with empty space below: centre it
     and balance the card in the space it gets; (b) service marks: show the official logo / icon of a service only
     where that brand's published guidelines allow it at tile size (YouTube's rules forbid the logo under 100 px and
     as the most prominent element, so YouTube and Shorts likely stay our glyph + the name; check TikTok, Vimeo,
     Dailymotion, YouTube Music, Spotify-like podcast marks one by one and write the findings in the PR; never a
     lookalike); (c) planned services: one tile "🎬 Subscription services · Coming" (everyone with their own
     subscription, via the extension), **no service names** (CLAUDE.md §6: a name only if it really works; store
     policy) unless the owner decides otherwise.
  4. **Shorts view "Other" button does nothing.** The rail's groups (Talk · Watch · Room) are liked; its "Other" /
     "More" entry doesn't work. Fix it (open its menu on laptop and phone) with a harness check.
- Done when: all four live on computer + phone; Test Lab hooks `ui.feedPill` (gone), `theme.default`, `sources.picker`
  layout check, `shorts.more`; shots at 4 sizes; owner's hand test.
- Owner's pick: his message to the Planner (17 Nov 2026).
- Done: #543 (v0.9.97.166), 17 Nov 2026.

### LH2. Last Heart fits a sideways tablet (Game Studio proposal, 17 Nov 2026; Game Studio)
- Why: on a sideways tablet (1180 × 820) Last Heart in the video's place needs ≈ 930 × 715 for seats + table + hand;
  the box is ≈ 740 × 650, so the whole game scales and its small print shows ≈ 10 px (rule: ≥ 13 px).
- What: a compact layout for a short, narrowish box (container query on the game box, like Quiz and Sea Battle):
  seats as a row of chips over the table, table cards and hand one size smaller, the status line on one row; nothing
  scrolls. The compact layout is for the video's place and the Games tab only, never switched by resizing a free
  window (GW5 rule).
- Done when: games-sweep `tabland` pokerPlay has no text under 13 px and nothing cut off (EN + TR, 2–6 players);
  games-scale unchanged; Test Lab hook `poker.compact`; shots at 4 sizes; owner's hand test on a sideways tablet.
- Done: #546 (`claude/lh2-poker-compact`, Game Studio, 17 Nov 2026): compact layout in the video's place on a short box
  (`poker.css`), three+ opponents as compact rows in the wide one, `shrinkToFit` grows an overflowing own box (six at
  Last Heart fell to 0.4); Lab `poker.compact`, games-sweep `pokerSix` (CI tabland row).

### LH3. Last Heart fits an upright tablet; the phone's pot box (Game Studio proposal, 17 Nov 2026; Game Studio)
- Why: on an upright tablet (820 × 1180) Last Heart running in the video's place gets a very short, wide box
  (≈ 714 × 349) and its text shows ≈ 10.6 px (rule: ≥ 13 px); game-proportions `upright/pokerPlay/stage` fails (also on
  main, not in CI). In a phone's Games tab the pot box clips its second feed line and the board slots leave its right
  third empty (first-look review on LH2).
- What: a layout for that short, wide box at 13 px (no scrolling, 2–6 players); the phone's pot box shows its lines and
  uses its width. Only the video's place and the Games tab; never a free window (GW5).
- Done when: game-proportions `upright` pokerPlay passes and runs in CI; games-sweep Last Heart rows stay green; Test Lab
  hook `poker.compact` covers it (six players); owner's hand test on an upright tablet.
- Owner's pick: the Planner's approval (17 Nov 2026).
- Done: #547 (`claude/lh3-poker-upright`, Game Studio, 17 Nov 2026): the compact table's container query takes the
  short, wide box too (tighter rows, newest feed line); phone pot box (board ≤ 40 px, newest feed line); games-sweep
  `tabup`, CI game-proportions `upright` + games-sweep `tabup` Last Heart row.

### XO1. Tic-tac-toe's board fills a sideways tablet's video place (Game Studio proposal, 17 Nov 2026; Game Studio)
- Why: on a sideways tablet the board is only 256 × 256 in a 740 × 653 box (games-sweep "the board is a fair size"; also
  on main, not in CI).
- What: the board grows to the box's height there, like the other boards.
- Done when: games-sweep `tabland` xox passes and runs in CI's tabland row; Test Lab hook `games.open.xox` opens it;
  owner's hand test on a sideways tablet.
- Owner's pick: the Planner's approval (17 Nov 2026).
- Done: #548 (`claude/xo1-classics-board`, Game Studio, 17 Nov 2026): waiting note and "Just watch" on one row in a
  not-wide video place (`classics.css`); CI tabland games-sweep row includes xox.

### BG1. Backgammon fits an upright tablet's video place (Game Studio proposal, 17 Nov 2026; Game Studio)
- Why: on an upright tablet (video place ≈ 714 × 349, side-by-side layout) backgammon's bar text showed 12.6 px and its
  🏆 pills were clipped at the right; games-sweep's "board is the hero" check flagged the intended side-by-side layout
  (found on LH3/XO1; also on main, not in CI).
- What: the column beside the board has room for the players' rows and the Stub row at 13 px; the check accepts the
  wide video place's side-by-side layout.
- Done when: games-sweep `tabup` Classics (xox, chess, backgammon) pass and run in CI; Test Lab hook `games.open.classics`
  opens the table; owner's hand test on an upright tablet.
- Owner's pick: the Planner's approval (17 Nov 2026).
- Done: #549 (`claude/bg1-backgammon-upright`, Game Studio, 17 Nov 2026): backgammon's board 46 % of a short, wide box,
  "0 watching" hidden there (`classics.css`); games-sweep hero check exception; CI tabup row adds xox, chess, backgammon.

### GD1. BUG: games throw players out at random (owner, 19 Nov 2026, "important"; Game Studio, first)
- Why: playing a table with a friend on different devices, one of them is thrown out of the game now and then with no
  message.
- What: find every path that drops a player from a table: the silent game connection (`GHOST_MS`, `ghost.ts`), the
  15 s ping on a background tab / phone sleep / Wi-Fi switch, `openSocket`'s HTTP fallback, the table's seat recovery
  after a reconnect, a table closed by its host, a stale-state reset. Log each drop reason (server and client, no
  personal data) and reproduce with two real browsers on different networks (throttled, one backgrounded). Fix the
  causes; a reconnect within the grace keeps the seat silently; a real removal always shows a plain message saying why.
- Done when: a 20-minute two-browser game per table kind (Classics, Sea Battle, Quiz, Draw & Guess, Last Heart) with
  a backgrounded tab, a 10 s network cut and a phone lock never drops a seat; every removal shows its reason;
  Test Lab scenario `game.drop` (cut, background, ghost) shows the message; an e2e in the `games` job with `GameSocket`.
- Tests: `ghost` unit tests, the new e2e, owner's hand test with a friend (B 10–14).
- Owner's pick: none needed.
- Done: https://github.com/alperenakturk/screen-with-me/pull/553 (`claude/game-drops`, Game Studio, 19 Nov 2026): the room's "at this table" mark re-sent after every
  room reconnect (both players reconnecting closed the table as empty after 2 min); game pages find a dead line
  (`link-watch.ts`) and take their seat back; Draw's grace 60 s; drop reasons in the Worker log; Test Lab `game.drop`;
  harness `games-drop`. Quiz's line watch waits for Game Studio 2.

### CAM2. BUG: the camera doesn't show on a laptop (owner, 19 Nov 2026; lane A, first)
- Why: the owner turns the camera on in a room on his laptop and no camera picture appears ("kamera modu açılmıyor").
- What: reproduce in Chromium with a fake camera (`--use-fake-device-for-media-stream`) at 1366 and 1920, with and
  without voice joined, in each theme; find where the camera window fails to open or stays hidden (permission state,
  the camera window's spot / size, a layout change since GW4–GW5, the 📷 button's state); fix it; if the browser
  refuses the camera, show a plain message saying why and how to allow it.
- Done when: 📷 on a laptop shows my camera window and the friend sees it, at 1366 and 1920; a refused permission
  shows a message; Test Lab hook `camera.open` (fake stream); a harness check in the `site` or `e2e` job.
- Tests: the new harness check; `scripts/shots.cjs` first look; owner's hand test on his laptop.
- Owner's pick: none needed.
- Done: https://github.com/alperenakturk/screen-with-me/pull/555 (`claude/cam2-laptop-camera`, lane A, 19 Nov 2026): the
  camera window's remembered "−" opens again when cameras come back and when my camera turns on; a refused camera says
  why and how (browser / phone / computer / busy / none) next to the 📷 pressed; a left-and-rejoined person no longer
  waits ~11 s for voice and camera (DTLS goodbye closes the dead connection); Test Lab `camera.open`; harness
  `cam-laptop`; hand test 27ai.

### QZ4. Quiz: many more questions, kinds and topics, with easy / medium / hard (owner, 19 Nov 2026; Game Studio 2)
- Why: the owner wants a lot more variety.
- What: more topics and question kinds (e.g. true / false, which came first, odd one out, picture-free "guess the
  year"), every question tagged easy / medium / hard; a level choice in the lobby (Mixed by default); at least
  ~3× today's question count, EN + TR, facts checked, nothing about specific films or series (public-text rule).
  Keep the question data in a lazy chunk; mind `scripts/size-budget.mjs`.
- Done when: the lobby offers the level; each topic has questions at every level; `check-game-text.mjs` passes;
  Test Lab hook `quiz.level`; a unit test that every question has a level, a topic and both languages.
- Tests: unit + `games` e2e; owner's hand test.
- Owner's pick: none needed.
- Done: #554 (`claude/quiz-more-questions`, Game Studio 2, 19 Nov 2026): 5329 questions (fourth bank, 18 topics, kinds
  `first` / `odd` / `year`), every question levelled, the lobby's Level row, picking moved to `quiz-pick.ts` (the browser
  no longer loads the bank), Test Lab `quiz.level`.

### TG1. The Together card gets one row shorter while a side game is open (owner, 19 Nov 2026; lane A, after CAM2)
- Why: at 1366 Five Frames' window covers the Together card's "Join voice / Share" buttons.
- What: while a side game's window is open beside the chat, the Together card shows one row (🎙 Join voice and 📤
  Share side by side), so the buttons stay visible and clickable; back to full when the game closes.
- Done when: at 1366 and 1920 with Five Frames, Snack Bar and Window Garden open, Join voice and Share are visible and
  work; Test Lab hook `together.compact`; a harness check in the `site` job; first look shots.
- Tests: harness; owner's hand test.
- Owner's pick: A "Kart kısalsın" (Planner chat, 19 Nov 2026).
- Done: https://github.com/alperenakturk/screen-with-me/pull/558 (`claude/tg1-together-compact`, lane A, 19 Nov 2026):
  while a game window lies over the side panel the Together card is compact (title, small faces, counts in one row;
  the buttons in one row, Share icon-only in voice), the share menu lifts over the game window; Test Lab
  `together.compact`; harness `together-compact`; hand test 27ak.

### QZ3. Quiz: a real ×2 joker (owner, 19 Nov 2026, "important"; Game Studio 2, first)
- Why: the owner finds ×2 "Double" useless as it is (played before you know the answer).
- What (owner confirmed, 19 Nov 2026): ×2 can be pressed **after
  picking an answer**, until the answer is shown: "give me double points for this question". Pressed before picking,
  it still works but the press costs answer time and loses the first-answer bonus. Once per game, like now. ½ and ↺
  stay unless the Planner says otherwise. Server-checked (`apps/server/src/quiz.ts`), rules text and How to play in
  EN + TR.
- Done when: ×2 after an answer doubles that question's points for a right answer (0 for a wrong one, no penalty);
  before an answer it costs the bonus; Test Lab hook `quiz.joker.double`; server unit test; e2e step in `games`.
- Tests: unit + e2e; owner's hand test.
- Owner's pick: "Cevaptan sonra" (Planner chat, 19 Nov 2026).
- Done: QZ3 PR (`claude/quiz-double-joker`, Game Studio 2, 19 Nov 2026): ×2 after answering until the reveal (right ×2,
  wrong 0; before answering no first-answer bonus), the reveal waits 2.5 s for it, Test Lab `quiz.joker.double`; with
  GD1's follow-ups for Quiz (`watchLink`, 60 s grace).

### FW1. Five Frames: real words only, plus the missing categories (owner, 19 Nov 2026; Game Studio 2, after QZ4)
- Why: Five Frames accepts odd non-words, and categories such as country and city names are missing.
- What: clean the answer and accepted-guess lists (EN and TR) to common real words; add categories (countries,
  cities, and others a player would expect: animals, food, …) as word lists by category, with the category shown
  as a hint; a guess must be a real word of the language (or of the category's list).
- Done when: no non-word in the answer lists (a check script over the lists); each new category has enough answers
  for weeks of play in both languages; Test Lab hook `fiveFrames.category`; unit tests.
- Tests: unit + list check; owner's hand test.
- Owner's pick: none needed.
- Done: FW1 PR (`claude/fw1-five-frames-words`, Game Studio 2, 20 Nov 2026): guesses must be seen ≥ 5 times and answers
  ≥ 20 times in OpenSubtitles (offline filter, `<lang>-keep.txt` exceptions): EN 7,716 / 2,036, TR 7,657 / 2,056;
  seven categories per language (`<lang>-cat-<id>.txt`, 22–44 words) with the category select as the hint, its own
  daily word, save and share line; `build-words.py --check`; Test Lab `fiveFrames.category`; harnesses `five-frames`
  and `lab-games`; tickets centred on the whole row, stub without the tear line; hand test 27al.
