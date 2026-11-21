# AI team playbook: running many Claude Code cloud sessions as one team

A reusable, project-independent guide to how this project runs a team of Claude Code cloud sessions for one human
owner. Copy it to a new project and replace the names. Sources: `CLAUDE.md` §4, §5, §9; `planner-handoff.md`;
`CARDS.md`; `STATUS.md`; `OPTIMIZATION.md`; `docs-sprawl.md`; `tools.md`; `scripts/check-docs.mjs`. State as of
21 Nov 2026. The GitHub side (repo settings, CI, auto-merge, secrets) is in `../github-playbook.md`.

## 1. Roles and the hub

Every session has exactly one role, given in its first message or its title (no role given = Developer).

| Role | Does | Edits |
|---|---|---|
| **Planner** (the hub; no code) | Talks to the owner; turns ideas into cards (what, why, done when, tests); orders and routes them; opens, briefs and archives sessions; batches the shared docs; keeps the owner's board current | the rules file, the card board, the roadmap's Focus, STATUS decisions / ideas, the board, its own handoff file |
| **Developer, lane A / A2 / B …** | Takes the top Ready card of its lane → In progress → build + test → PR → merge → deploy checked → reports "card X done: <PR>" | its cards' code and tests, the feature's reference section, its changelog fragment |
| **Game Studio** (or any feature studio) | One product area end to end (code, art, sound, server objects) | that area's code, tests, design notes, reference sections |
| **Security** (read-only) | Bugs, security, privacy reviews | a dated review file, "Proposed" cards |
| **Research** (read-only) | Market, competitors, users, technical questions | `research/<topic>.md`, "Proposed" cards |
| **Design** | Logo, mascot, brand, screens; a picked design becomes a card | `design/<topic>.md`, art the build scripts copy; never product code |

Rules for all roles:
- **The owner talks only to the Planner.** Every other session reports to the Planner with `send_message` when a job
  ends (what was done, PR link, open questions, what the owner must decide or test) and never asks the owner itself,
  unless the owner opened that session.
- **Split by files, not by topic:** two sessions never edit the same lines. Each lane owns a list of files; the
  Planner splits a big batch so lanes don't overlap (lane A = site / server, A2 = room UI extras, Game Studio = one
  session per game, each with its own files; a shared file such as a game "stage" is done first by one session).
- **Never start work without a card.** An idea that comes up mid-task goes to STATUS "Ideas waiting for the owner's
  pick"; the Planner orders it later.
- **Building PRs never edit shared docs** (STATUS, CARDS, archive). A session sends the Planner its hand tests and
  "card X done: <PR>"; the Planner moves them in one batch PR.
- **Every change is a branch + PR**, never a push to `main`; auto-merge on every PR; a docs-only PR may be merged by
  its own session once CI is green. Branches `claude/<short-english-slug>`.

## 2. Files every project needs

| File | Holds | Size guard |
|---|---|---|
| `CLAUDE.md` | Rules and a map only: what the product is, where things live, language, roles, working with the owner, product rules, invariants (one line + "ref:" link), commands, release checklist. **Never what a release did.** Only the Planner edits it | ≤ 30 KB, CI (`check-docs.mjs`) |
| `docs/internal/STATUS.md` | Task queue (one block per lane, continue from the first unchecked item), owner's hand tests, owner's to-dos, pending decisions, ideas waiting for the owner's pick | ≤ 30 KB, CI; aim 15–20 KB |
| `docs/internal/CARDS.md` | Card format, lanes table, In progress, Ready (+ per-area card files, a Proposed file) | ≤ 30 KB, CI |
| `docs/internal/ROADMAP.md` | "Focus: now / next / frozen" and milestone gates | aim ≈ 15 KB |
| `CHANGELOG.md` + `changelog/next/<branch>.md` | What shipped, user-facing. Each PR adds a fragment file; CI folds them at release (no conflicts on one file) | — |
| `docs/internal/architecture/` | How each feature works (files, messages, constants, tests); the developer who changes a feature updates its section in the same PR | split into area files |
| `docs/internal/archive/` | Done cards, ticked hand tests, old release narration, moved verbatim | unlimited, rarely read |
| `docs/internal/planner-handoff.md` | The Planner's working memory: live version, running sessions + ids + their queues, what waits on the owner, scheduled tasks | rewritten at each Planner handoff |
| `docs/internal/tools.md` | Skills and tools the owner has and when to use them | — |

**Why the guards:** every session loads `CLAUDE.md` on every turn and reads STATUS / CARDS at the start. Here they
had grown to ≈ 590 KB (≈ 150 k tokens before any work) because every release appended a paragraph to one line,
causing constant merge conflicts. The fix: rules files never record releases, finished material moves verbatim to
`archive/` in the same PR that finishes it, and `check-docs.mjs` fails CI on size and, with `--against <ref>`, on any
backticked identifier or card heading lost in a move. The Planner rewrites rules; nobody "appends a note".

## 3. Card lifecycle

```
### <ID>. <short title> (<who asked, date>; <lane>)
- Why: <one line>
- Done when: <what can be checked, including its test hook or scenario>
- Tests: <unit / e2e / harness / owner's hand test>
- Owner's pick: <link or "none needed">
```

1. **Idea** (owner, session, review) → STATUS "Ideas" or "Proposed" cards.
2. **Ready:** the Planner writes the card, puts it in a lane, orders it against `ROADMAP.md` "Focus: now".
3. **In progress:** the lane's session takes the top Ready card and mirrors its steps into its task list and its
   STATUS task-queue lines.
4. **PR:** code + tests + reference section + changelog fragment; first-look screenshots for UI changes; auto-merge.
5. **Live:** CI deploys `main`, runs the e2e against the live site and tags the release; the session checks the run.
6. **Done:** the session sends the Planner "card X done: <PR>" + hand tests; the Planner moves the card verbatim to
   `archive/cards-done.md` and the tests onto the owner's board.

## 4. Session lifecycle

- **Open:** the Planner opens sessions (`create_session`) only while there is work, gives each a role, a card group
  and a title ("<Project> · <role> · <topic>"). It records the session id in `planner-handoff.md`.
- **Brief:** the first prompt (template below) names the role, the cards in order, the files it owns, what it must
  not touch and how to report.
- **Work:** visible task list from the start, mirrored into the STATUS task queue; one card group per session.
- **Report:** at the end of each card group, one `send_message` to the Planner (what, PR, tests, questions as text
  with 2–4 options, one recommended). Tell the Planner at once when anything runs out (usage, CI minutes, quotas).
- **Handoff is always the last task.** Never stop or reset mid-task: finish the current PR (merged and live), then
  write the handoff (STATUS lines, branch names, next card) and stop. Past ~300 k tokens a building session finishes
  its current PR and hands off; the Planner past ~400 k rewrites `planner-handoff.md` and hands off to a fresh Planner.
- **Archive:** the Planner archives the finished session and opens a fresh one for the next group. A daily scheduled
  task checks every session's `context_usage` and does this without being asked (re-bind it to the new Planner at
  each Planner handoff).

First-prompt template (copy, fill the brackets):

```
Role: <Developer lane X | Game Studio "<area>" | Security | Research | Design>. Read CLAUDE.md first.
Cards, in order: <ID1> → <ID2> → <ID3> (CARDS.md / <area cards file>).
You own: <files / folders>. Do not touch: <other lanes' files>, STATUS.md, CARDS.md, archive/.
<Shared file X>: done first by <session>; wait for its PR before you change it.
For each card: task list → branch claude/<slug> → build + tests (+ test hook) → reference section +
changelog/next/<branch>.md → PR with auto-merge → check the deploy and live e2e.
After each card: send_message to the Planner (<planner session id>): "card <ID> done: <PR>", hand tests for the
owner, open questions as text with 2–4 options, the recommended one first.
Never ask the owner. Never stop mid-task: the handoff (STATUS lines, branch names, next card) is your last task.
If a usage limit or quota stops you, tell the Planner at once.
```

## 5. Talking to the owner

- **One channel:** only the Planner talks to the owner, in the owner's language; everything in the repo stays English.
- **Only when needed:** a decision, a test, a secret. Otherwise one short summary when a group of work is finished,
  never a message per release.
- **Questions as clickable choices** in the Planner's chat: the recommended option first, a short preview each. No
  option pages or other web pages for the owner.
- **The owner's board is his only page:** one Artifact with his hand tests and open questions, kept by the Planner
  (a live fix becomes a test, a passed test or answered question goes).
- **Plain, not pleasing:** no flattery, no softening; a needed step is said plainly and never hidden for comfort.
- **Short report at the end of every task:** what was done, what was tried, what it is waiting for, what comes next.
- **Make technical decisions yourself** and say briefly why; ask only about the owner's things (accounts, money,
  publishing, legal commitments, product name, slogans).
- **Secrets:** never pasted in chat. When a step needs one, give every password-manager field at that moment (Title
  "Where – What for", user name, where to copy the password from, URL, notes with expiry, allowed characters).
- **"What should I test?":** the list lives in STATUS "Owner's hand tests"; explain the open items simply, tick what
  he reports.

## 6. Usage and cost

- **The limit is shared:** all sessions draw on one account's 5-hour and weekly usage limits. Seven parallel sessions
  used up the 5-hour window by early afternoon on 21 Nov 2026 and all stopped at once; four sessions had used up the
  weekly limit on 19 Nov. Plan **2–4 building sessions** at a time, open more only when one finishes, and queue the
  rest in `planner-handoff.md` ("not opened yet: open when a session finishes").
- **When a limit hits:** sessions show `failed` with "usage_limit_reached". Wait for the reset, then `send_message`
  "continue" to each; their task lists and STATUS lines tell them where they were.
- **Small contexts:** every turn re-reads the whole context, so a big context costs on every turn. Keep the rules file
  small, give each session one card group, hand off at ~300 k (Planner ~400 k).
- **CI minutes:** a full run took ~30 min here. Every re-run (a conflict on a shared file, a flaky test) doubles it.
  Docs-only PRs run only a tiny check job; superseded runs are cancelled; batch server changes into one deploy.
- **Expensive tools sparingly:** a multi-advisor council costs many sub-agents; use it only for big, hard-to-undo
  decisions (name, domain, what to cut, a big restructuring).

## 7. Lessons learned (to 21 Nov 2026)

1. **Seven parallel sessions hit the 5-hour usage limit by early afternoon**: all stopped together; the Planner
   restarted them after the reset. Fewer sessions finishing their work beats many stalled ones.
2. **Appending to shared files from parallel PRs caused merge conflicts** and ~30 min CI re-runs for every session
   after each merge. Fixed by the batching rule (building PRs never touch STATUS / CARDS / archive; the Planner
   batches) and by GitHub auto-merge (a green PR merges at once, not when its session comes back).
3. **Flaky tests that depend on outside sites doubled CI time** (a real video site's response time, a timing race).
   No required check may depend on a third-party site; stub it, keep the real check optional (card CI4).
4. **Sessions stopping mid-task for context size lost work.** Fixed by "the handoff is always the last task": finish
   the PR, then hand off.
5. **A daily scheduled context check** (`get_session` `context_usage`) finds sessions to hand off without the owner
   asking; it is bound to one session, so a new Planner must re-create it for itself.
6. **The owner's board is one Artifact**, updated in place; option pages and extra pages confused him.
7. **The rules file grew to 252 KB** because releases were recorded in it; size caps in CI plus "rules never record a
   release" fixed it (`OPTIMIZATION.md` Part B).
8. **The order matters:** the council review moved a site-stopping quota risk ahead of the docs clean-up. Ask "what
   can stop everything?" before "what is messy?".
9. **Ask the owner what "messy" means:** here it meant sessions, work flow and files, not product concepts.

## 8. Next project: setup in order

1. Repo, settings, CI and secrets: follow `../github-playbook.md` §5 (auto-merge on, branch rules, required checks).
2. Write `CLAUDE.md` from this project's skeleton: product, map, language, roles table, working with the owner,
   product rules, invariants, commands, release checklist. Keep it under 30 KB from day one.
3. Create `docs/internal/` with `STATUS.md`, `CARDS.md` (card format + lanes table), `ROADMAP.md` (Focus first),
   `planner-handoff.md`, `archive/`, `architecture/`, `tools.md`; `changelog/next/README.md` + `CHANGELOG.md`.
4. Add `scripts/check-docs.mjs` (size limits for `CLAUDE.md`, STATUS, CARDS; lost-identifier check with
   `--against`) to the always-running CI job.
5. Create the owner's board (one Artifact) and link it in the `CLAUDE.md` map.
6. Open the Planner session (title "<Project> · Planner", tag `role:planner`); it writes the first cards with the
   owner and the Focus list.
7. Create the daily scheduled context check, bound to the Planner.
8. Open one or two building sessions with the first-prompt template; add more only when the queue has file-separated
   work and the usage limit allows.
9. After the first week, look at what got messy (sizes, conflicts, re-runs) and turn each into a rule or a CI check.
