# Gate check 0.9.98 (card G98b, 8 Nov 2026, against main at 4766263, 0.9.97.75)

First check: card G98 on 5 Nov, against e132e2d (0.9.97.60). This page redoes it against today's main. Since then these
cards have landed:
- CAM1 (.64), MB (.67), TOS (.66), LABLOCK (.69), OPS1 (.70), LABTR (.72), R3-3 (.75);
- CI2 (#326 / #329), STORE1, YTA;
- the games work (.61, .63, .65, .68, .71, .73, .74).

Each item below is ✅ done (with proof), ❌ missing (with what it needs) or 👤 the owner's. The script checks were run in
the cloud on the built site (`npm run build`, `wrangler dev` with CI's flags, a local `video.webm`).

## What still blocks 0.9.98 (and who owns it)

1. **The step's hand tests** (👤 owner):
   - STATUS "Owner's hand tests" from "Next round, start here" (0.9.97.56) down to 0.9.97.75: 94 open boxes, 2 ticked;
   - the CAM1 block (two phones and a computer in voice) is the one that matters most.
2. **A real phone and a real computer** (👤 owner): the phone check is the CAM1 retest (the owner's own bug from 4 Nov;
   fixed in 0.9.97.64, not yet confirmed on his phones). The computer check is one pass through the round in STATUS.
3. **Live e2e green on the first attempt, 3 deploys in a row** (❌ Developer A, a small card): .73 and .74 were clean,
   but in .75 `draw.mjs` passed only on its retry. Its Draw & Guess socket was closed with 1006, 12.6 s after it
   opened, and the player timed out "offline". The rule counts that as red until its cause is found.
4. **Saying the step is full** (👤 owner): the third version part moves only when the owner says so.
5. **Housekeeping** (not a gate item, 👤 owner or B2): tag `v0.9.97.74` is missing. Its deploy and live e2e were green,
   but GitHub refused the tag push because the push changed a workflow. TAG1 (#333) fixes this from now on.

Nothing else blocks: the step's own gate (sweep, tablet, accessibility) passes, and its two Ready cards (CAM1, MB) shipped.

## 0.9.98's own gate

| Item | State | Proof |
|---|---|---|
| Screenshot sweep fixed | ✅ | `scripts/harness/sweep/run.cjs` on main: 110 screens (5 sizes × EN + Gece / TR + scene theme), "every screen passed its checks". |
| Tablet harness | ✅ 143 / 143 | `scripts/harness/tablet/run.cjs` (iPad + Android, upright and sideways; since MB it also covers the Test Lab drawer, the stream card, cinema and the lazy windows). It needs the server on :8787 with CI's flags (`SWM_LAB_SERVER`, `LAB_CODE`): with the wrong port the Test Lab can't open and the run stops early, which is a set-up error, not a product one. |
| Contrast + keyboard harness | ✅ 23 / 23 | `scripts/harness/a11y/run.cjs` (axe WCAG 2.1 A + AA + the keyboard tour), "axe finds nothing, the keyboard tour works"; also in CI on every PR (`site` job). |

## Every release (the last three: 0.9.97.73, .74, .75)

| Item | State | Proof |
|---|---|---|
| Typecheck + unit tests | ✅ | CI green on each merge (#328, #332, #331; CI2's `checks` job). |
| A test for every change | ✅ | .73 and .74: Game Studio's games-sweep / games-youtube checks. .75: `check-domain.mjs` plus the `domain-move` harness (17 checks; its `#back` race was fixed in #334). |
| Harnesses of the touched area | ✅ | The `site` and `games` jobs run them on every PR (CI2). |
| Docs: CLAUDE.md, STATUS hand tests, README TR + EN | ✅ | CLAUDE.md "Live" and STATUS hand tests are updated for each release. `CHANGELOG.md` has one block per release (OPS1). The READMEs carry "0.9.97" in both languages. |
| Same version in the footer and the extension | ✅ | `v0.9.97.75` in `apps/web/index.html` = `0.9.97.75` in `apps/extension/package.json`. |
| Deploy green, live e2e green on the first attempt | ⚠️ | Runs 42426256343 (.73), 42427304689 (.74) and 42428121277 (.75): all three deploys and live e2e passed, and each ends "✓ Tüm uçtan uca testler geçti". .73 and .74 needed no retry. In .75, `draw.mjs` failed on its first attempt and passed on the retry (`##[warning]draw.mjs failed on the live run's first attempt`), see blocker 3. The .75 deploy also ran `check-domain.mjs --live`: "site address checks passed". |

## Every milestone step (0.9.97 → 0.9.98)

| Item | State | Proof / what it needs |
|---|---|---|
| No open bug the owner reported in this step | ✅ (to confirm 👤) | CAM1, the one open on 5 Nov, shipped in 0.9.97.64 (#316). The owner's own retest is blocker 2. CARDS "In progress" is empty. Ready holds only CAM1 and MB, both shipped. |
| The step's STATUS hand-test boxes ticked or noted | 👤 | 94 open boxes in this step's rounds (blocker 1). |
| Live e2e first-attempt green on 3 deploys in a row | ❌ | .73 ✅, .74 ✅, .75 retry (blocker 3). Three clean deploys after the cause is found close it. |
| Phone + computer each tried on a real device | 👤 | Blocker 2. |
| Every new string has its English | ✅ | `scripts/check-texts.mjs` (MB, LABTR) checks `i18n.ts`, every chunk's own `TEXT` table and the Test Lab's inline pairs in CI. |
| A one-paragraph summary | ✅ | STATUS "History (short)" for 0.9.97. `CHANGELOG.md` now lists every release; a short step paragraph can go above its 0.9.97 block when the step closes. |

## Landed since the first check (for the owner's summary)

- **Cameras on phones (CAM1):** cameras switch in place, a black picture recovers, and only the front camera is
  mirrored.
- **End-of-milestone batch (MB):** a text check, a tablet pass, the store copy, and the policy numbers matching the code.
- **Terms of use with an abuse contact (TOS).**
- **The Test Lab** is locked behind the owner's code (LABLOCK) and is in plain Turkish and English (LABTR).
- **Operations (OPS1):** a changelog, release tags, an uptime check and a cost guard.
- **CI split into parallel jobs (CI2)**, with a fix so deploy and tag run when the PR-only jobs are skipped.
- **Store submission dry run (STORE1)** and the **YouTube API audit pack (YTA)**.
- **The site's address in one setting (R3-3)**, ready for an own domain.
- **Games:**
  - Sea Battle and Reversi;
  - game windows clear of the chat on tablets and never over a YouTube video;
  - three polish rounds.
