# Gate check 0.9.98 (card G98, 5 Nov 2026, against main at e132e2d, 0.9.97.60)

What `ROADMAP.md` "Milestone gates to 1.0" asks for 0.9.98 (design sweep, tablet, accessibility), what it asks of every
release, and what it asks of every milestone step. Each item is done (with its proof), missing (with what it needs) or
the owner's. Run in the cloud on the built site (`npm run build`, `wrangler dev`, a local `video.webm`).

**Verdict: not full yet.** The checks a script can do pass (the tablet check after the Planner's pick A, 0.9.97.62). Two Ready cards of this step are still open (CAM1, MB), and the owner's parts (hand tests, real
devices) are open.

## 0.9.98's own gate

| Item | State | Proof / what it needs |
|---|---|---|
| Screenshot sweep fixed | ✅ done | `scripts/harness/sweep/run.cjs`: 110 screens (5 sizes × EN + Gece / TR + scene theme), every check passed (no sideways scroll, nothing past the right edge, no console errors, fitting screens don't scroll). Sweep 1–3 findings closed in STATUS "Design sweep"; the one minor left there (a failed video link's error card made the room scroll 7–34 px) does not show in this sweep. |
| Tablet harness | ✅ 91 / 91 (0.9.97.62) | `scripts/harness/tablet/run.cjs` (iPad 820×1180 ↔ 1180×820, Android 768×1024). The one failure on e132e2d ("XOX opens in the video's place", card T) came from CL2 (0.9.97.59): every room game opens in the free mini window, phones excepted. The Planner's pick A: that rule holds on tablets too. The check now asks that the window is whole on screen and moves by its head; it reports how much of the chat column it covers at first (26 % on an upright iPad: the window opens centred on the right, `stage.ts` `spot` { x: 1, y: 0.5 }, Game Studio's code). |
| Contrast + keyboard harness | ✅ done | `scripts/harness/a11y/run.cjs` (axe WCAG 2.1 A + AA on home, join, room, settings, invite, help in EN at 1366×768 and on a phone, plus the keyboard tour): 23 / 23, also in CI. Game windows: Game Studio's `games-resume` runs axe inside every game window (BHG). |

## Every release (checked on the last three: 0.9.97.58, .59, .60)

| Item | State | Proof / what it needs |
|---|---|---|
| Typecheck + unit tests | ✅ | CI `test` job green on every merge (430 unit tests). |
| A test for every change, a fixed bug's test first failing | ✅ | EXT1's fullscreen sweep check failed on the old `fullscreen.ts`; the privacy card's policy checks; Game Studio's CL2 / BHG checks (their PRs). |
| Harnesses of the touched area | ✅ | embed (EXT1, all green headful), help (privacy), games-sweep / games-resume (CL2). |
| Docs: CLAUDE.md, STATUS hand tests, README TR + EN | ✅ / ⚠️ | CLAUDE.md "Live" and STATUS hand tests updated for each. The READMEs carry the badge "0.9.97" (the minor version only) and no per-release lines; they say the same thing in both languages. Nothing missing unless the owner wants per-release notes there. |
| Same version in the footer and the extension | ✅ | `apps/web/index.html` `v0.9.97.60` = `apps/extension/package.json` `0.9.97.60`. |
| Deploy green, live e2e green on the first attempt | ✅ | Runs 41946773632 (.58), 41948407199 (.59), 41988761693 (.60): deploy green, no "failed on the live run's first attempt" line in any of the three logs, each ends "✓ Tüm uçtan uca testler geçti". |

## Every milestone step (0.9.97 → 0.9.98)

| Item | State | Proof / what it needs |
|---|---|---|
| No open bug the owner reported in this step | ❌ open | **CAM1** (the owner's real phone test, 4 Nov: a black remote camera, a slow lens switch, a mirrored rear camera; lane B2, Ready). Everything else the owner reported is Done (round 1, round 2, EXT1, CL2's "stuck after chess"). |
| The step's STATUS hand-test boxes ticked or noted | 👤 owner | STATUS "Owner's hand tests" has 221 open boxes in all; this step's rounds (from 0.9.97.56 "Next round, start here" down to 0.9.97.60) wait for the owner. |
| Live e2e first-attempt green on 3 deploys in a row | ✅ | The three runs above. |
| Phone + computer each tried on a real device | 👤 owner | The owner's phone test of 4 Nov found CAM1; a retry after CAM1, and a computer pass on the round in STATUS. |
| Every new string has its English | ✅ / ⚠️ | `i18n.ts` types the English table as `Record<Key, string>`, so a Turkish key without English fails the typecheck. The lazy chunks' own `TEXT` tables (games, home, feedback, move, podcasts…) have no such check yet: card **MB** adds a script. |
| A one-paragraph summary | ✅ (this PR) | Added to STATUS "History (short)" for 0.9.97 (no `CHANGELOG.md` yet). |

## Also open before the step closes (the Ready cards of this step)
- **CAM1** (lane B2): phone cameras; see above.
- **MB** (lane B2): strings EN + TR checked by a script, the tablet harness extended (Test Lab drawer, stream card, cinema,
  lazy windows), `store/src/room.html` and `npm run store` refreshed, help / policy / code agree on every limit.
  The privacy card's help-harness checks already cover the policy's numbers.
- The tablet decision above: decided (Planner's A, 0.9.97.62). Optional for Game Studio: open the window clear of the upright tablet's chat column.

## Owner's
- The hand-test rounds in STATUS (0.9.97.56 → .60), a phone + a computer on real devices.
- Saying when the step is full: the third version part moves only when the owner says so.
