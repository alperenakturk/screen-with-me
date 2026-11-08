# Gate check 0.9.98 (card G98c, 8 Nov 2026, against main at 2617906, 0.9.97.84)

Earlier checks:
- G98: 5 Nov, against e132e2d (0.9.97.60).
- G98b: 8 Nov, against 4766263 (0.9.97.75).

This page redoes the check against today's main. Each item below is one of:
- ✅ done (with proof);
- ❌ missing (with what it needs);
- 👤 only the owner can do it.

## In short

Every gate item a script can check is ✅. What is left is the owner's:
- his hand-test round on a real phone and computer;
- confirming that no bug he reported is still open;
- saying "0.9.98".

The list of what only he can do is at the end of this page.

## 0.9.98's own gate

| Item | State | Proof |
|---|---|---|
| Screenshot sweep fixed | ✅ | `scripts/harness/sweep/run.cjs` (110 screens, 5 sizes × EN + TR) passed in G98b. Since then, PERF1b compared every element's computed style before / after on 144 screens: only timing noise differs. |
| Tablet harness | ✅ | `scripts/harness/tablet/run.cjs` runs in CI's "Games quality" job on every PR. It passed locally on 0.9.97.83 ("Tablets: the room fits upright and sideways"). |
| Contrast + keyboard harness | ✅ | `scripts/harness/a11y/run.cjs` runs in CI's `site` job on every PR. It passed locally on 0.9.97.83 ("axe finds nothing, the keyboard tour works"). |

## Every release (the last ones: 0.9.97.80 – .84)

| Item | State | Proof |
|---|---|---|
| Typecheck + unit tests, a test for every change, harnesses of the touched area | ✅ | CI's `checks`, `site`, `games` and `e2e` jobs are green on each of these PRs (.82 = #343, .83 = #345, .84 = #344). Each card brought its own check: YTK (`vimeo`, `shorts-rail`, `room-extras`), FF2 / GW (games-sweep resize + fullscreen passes), LIVE-GREEN (`GameSocket` self-test), PERF1b (`room-css`), BH12 (`yt-room`, `shorts-rail`). |
| Docs: CLAUDE.md, STATUS hand tests, CHANGELOG | ✅ | Each release has its "Live" line, a STATUS hand-test block and a CHANGELOG block. |
| Same version in the footer and the extension | ✅ | `v0.9.97.84` in `apps/web/index.html` = `0.9.97.84` in `apps/extension/package.json`. |
| Deploy green, live e2e green on the first attempt | ✅ (.84 still running) | See the next table. |

## Live e2e on the first attempt, since G98b

| Version | Main run | Deploy + live e2e | First attempt | Tag |
|---|---|---|---|---|
| .76 | 42432587774 | ✅ | clean | ✅ |
| .77 | 42433408090 | cancelled | ghost.mjs failed, its retry cut off | – |
| .78 | 42434827850 | ✅ | clean | ✅ |
| .79 | 42436121162 | ✅ | classics-switch.mjs + sea.mjs passed only on retry | ✅ |
| .80 | 42437819286 | ✅ | clean | ✅ |
| .81 | 42439678811 | ✅ | clean | ✅ |
| .82 | 42440779262 | ✅ | clean | ✅ |
| .83 | 42442919894 | ✅ | clean | ✅ |
| .84 | 42443908127 | running at the time of writing | – | – |

Notes on the table:
- **.77:** the .78 push cancelled its run (the cancel came 17 s after that push, not at the time limit). .78 then
  deployed the same code.
- **.79:** in both files a game socket was cut by the network (1006), at 57 s and at 0.5 s after it opened. The cause
  was found and fixed in .82 (card LIVE-GREEN): the game e2e reconnect after a network drop the way the pages do, with
  guardrails so a real server reset still fails the run.
- **No `GameSocket` drop warnings** appear in .82 or .83. The only 1006 closes in all these logs are the .77 and .79
  ones above.
- **Result:** .80, .81, .82 and .83 are four clean deploys in a row. The milestone item "3 in a row" is met.

## Every milestone step (0.9.97 → 0.9.98)

| Item | State | Proof / what it needs |
|---|---|---|
| No open bug the owner reported in this step | ✅ (to confirm 👤) | CARDS "In progress" is empty. Ready lists CAM1 and MB, but both shipped (.64, .67); the Planner can move them to Done. The only open GitHub issue is #227, a test "Feedback: fdfsfds" with no content, which can be closed. CAM1 (the owner's own camera bug) still needs his retest on his phones. |
| The step's STATUS hand-test boxes ticked or noted | 👤 | The 0.9.97 blocks in STATUS "Owner's hand tests" (from 0.9.97.38 up to .84) hold 107 open boxes and 4 ticked. The "Next round, start here" list on top has 11 open items. That one round covers most of the blocks below it. |
| Live e2e first-attempt green on 3 deploys in a row | ✅ | .80 → .83, see above. |
| Phone + computer each tried on a real device | 👤 | The owner's round below, steps 1 – 9. |
| Every new string has its English (and Turkish) | ✅ | `node scripts/check-texts.mjs`: "36 text tables and 305 inline pairs, 2693 strings, each in English and Turkish". `node scripts/check-game-text.mjs`: "10 game text tables: English and Turkish have the same keys". Both run in CI. |
| Tablet batch done | ✅ | MB (.67) and GT (.63) shipped. The tablet harness covers the Test Lab drawer, the stream card, cinema, the lazy windows and the games' free windows, and runs in CI. |
| A one-paragraph summary | ✅ | `CHANGELOG.md` now has a paragraph for the whole 0.9.97 step above its release blocks (this PR). |

## What only the owner can do (plain words, for his test round)

1. **One evening with a friend, on a computer:**
   - "Next round, start here" in STATUS, items 1 – 7: YouTube together, fullscreen and the rail, voice and cameras,
     screen share, the door ("Ask before letting people in"), a private message, a game table.
   - About 45 minutes.
2. **His phone (Android or iPhone), the friend on the computer:**
   - Items 8 – 9: join by the QR code, YouTube, then Shorts swiping together.
   - Then the camera retest from CAM1 (0.9.97.64): switch to the back camera, the friend's picture never stays black,
     the back camera is not a mirror.
3. **The extension in Chrome on a film page** (item 10, a legal demo player such as the Video.js or Plyr demo):
   - "Go to the film", the rail, our fullscreen and the film's own ⛶.
4. **Edge, Brave and Opera** (item 11): the same short list in each.
   - This can wait until just before the store submission.
5. **A quick look at the home page and a room:** nothing looks different or flashes unstyled. This checks 0.9.97.83,
   which moved the room's styles into their own file.
6. **Say "0.9.98"** when he is happy with the round. The third version part only moves on his word.

Not part of this gate: tag `v0.9.97.74` is still missing. Its deploy was green, but the tag push was refused because
that push changed a workflow; TAG1 (#333) stops this from happening again.
