# Planner handoff

The Planner's working memory, so a fresh Planner session can continue without the old chat (owner, 16 Nov 2026:
"keep contexts small, everything needed must be in the repo"). The Planner rewrites this file at every handoff;
rules stay in `CLAUDE.md`, cards in `CARDS.md` / `cards-games.md` / `cards-proposed.md`, the owner's lists in `STATUS.md`.

## State on 21 Nov 2026, ~15:50 UTC (handoff 7; previous Planner session_015Fyri2m6jBE1GMPtFWPUWZ)

**Speak Turkish to the owner, always** (he asked again on 21 Nov, firmly: "LÜTFEN"). Short, plain, no English
sentences in chat. **Never hand off or stop any session mid-task** (CLAUDE.md §4, owner 21 Nov).

**Live:** v0.9.97.191 (+ PTT1 #599, TG2 #604, LH4 #601 deploying). Shipped 21 Nov (all archived in
`archive/cards-done.md`, hand tests in STATUS + the board): CAM3, VC4, PTT1, TG2, RAIL2, GN1, EMO1, RC2 (look C
marquee + own pad), FR1, GFIT1, DG2, QZ5, SB2 (3 themes), FW2, STORE2 prep, LB1 research.

**New rules 21 Nov (in CLAUDE.md):** shared docs via the Planner (building PRs never edit STATUS / CARDS /
cards-games / archive; sessions send hand tests + "card X done", the Planner batches); GitHub auto-merge is on
(`enable_pr_auto_merge` squash on every PR); handoff always last. GitHub: Secret Protection + push protection on;
head branches auto-delete on merge (only branches pushed without a PR stay; `git push --delete` hangs through the proxy).

**Sessions running (all report to the Planner; tell them the new Planner id first):**
- lane A session_015Fyri6SPxNbYLvnpZcaWFd: PTT1 + TG2 done (merged), next CI4 (flaky CI steps).
- Game Studio "Last Heart" session_015Fyri79B8LRjKGwxV6dGXk: LH4 (round table #601 merged, harness + CI step next;
  owner picked table look A; five new sound ids approved; `.pk` styles moved to poker.css #597).
- Game Studio "Quiz fill" session_015Fyri3j4Uk18Hofr4MyQGQ: QZ5b (Quiz `data-fill` + sweep leftovers).
When one finishes: archive it; open the next card group in a fresh session (no Ready lane-A card after CI4 except
DM1 / FILM1, both waiting on the owner).

**Waiting on the owner (he said: tomorrow, 22 Nov; today only development):**
- Store submission (STORE2, by ~25 Nov): first the Brave / Edge hand test (STATUS 28), then the 10 steps in
  `docs/internal/web-store.md` (the Turkish step list was sent in chat on 21 Nov; resend it). After he submits: tell
  every session "no PROTOCOL_VERSION bump during the review"; move STORE2 to cards-done. PTT1's extension change goes
  in with the submitted zip (no new permission).
- FILM1 (TMDB film details): ask with AskUserQuestion: A "yes, only when the host presses" (recommended), B "not
  yet, room ratings only", C "automatic" (not recommended). Asked twice on 21 Nov, the dialog closed both times.
- Hand tests: the board (Artifact NWZG7GLH4JzAnZt1rNgrJo, version 84) has 19 new entries for 21 Nov.
- To-dos in STATUS: Cloudflare (2FA, members, usage alerts 50/80 %, one invocation log for CF-8), Google Cloud (2FA,
  key restriction), Dailymotion Player ID (DM1), VIMEO_TOKEN, `sidelit.app` trademark check, the feedback repo watch.
- Later ideas (STATUS): extension toggle-mic shortcut, noise-suppression switch, Sea Battle sails / paper boat redraw.

**Owner's questions answered 21 Nov:** how much work is left (~2–4 weeks; 1.0 possible first half of December if he
submits this week and does 10–15 hand tests a day); auto-merge explained; secret scanning explained; Letterboxd →
research done (`research/film-data.md`: Letterboxd API closed, TMDB recommended).

**Docs made 21 Nov:** `docs/internal/playbooks/` (github, cloudflare, security-privacy, ai-team, README) for future
projects; `OPTIMIZATION.md` state; `cloud-testing.md`. STATUS is ~29.9 KB of 30 KB: trim (archive ticked tests /
old ideas) before the next batch. CLAUDE.md is at ~30.7 KB of 30.72: any new rule must replace text.

**Scheduled:** "Daily context check" trig_013CUKnPzKhj5t5o3JEuqSpb (18:41 Istanbul) is bound to the previous Planner:
re-create it bound to yourself with the same prompt (`get_trigger`) and disable or delete the old one.

**Leftovers:** tag v0.9.97.113 missing; non-PR branches (claude/sea-ship-themes and older) can be deleted by the
owner in Code → Branches if he wants.
