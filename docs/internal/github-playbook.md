# GitHub playbook

A reusable, project-independent record of how this project set up GitHub and what it learned, so the next project can
repeat it. Facts come from the repo (`.github/`, `scripts/`, the security reviews, `reference.md` "CI") and from the
owner's sessions; state as of 21 Nov 2026. Where the repo does not record a setting, it says **check in Settings**.

## 1. Repo settings checklist

| Setting | Where | What we chose and why |
|---|---|---|
| Visibility | Settings → General | **Public**, so GitHub Actions minutes are free. Public is not "open source": licence is "all rights reserved, source-available" (`LICENSE`), every `package.json` has `"license": "UNLICENSED"` + `"private": true`, and no public text says "open source". A public repo means every doc, commit and old file is readable: a "secret address" is never access control (security review 4, R4-11). |
| Description, website, social preview | Settings → General | Description + website set; a 1280 × 640 social preview image (upload by hand; not readable through the API). |
| Merge button | Settings → General → Pull Requests | **Squash merge**: one commit per PR on `main`. Whether merge commits / rebase are switched off: check in Settings. |
| Allow auto-merge | same place | **On since 21 Nov 2026.** Before that, a green PR waited until its session came back to merge it; with 7 parallel sessions, every merge on `main` sent the others back for another ~30 min CI run. |
| Automatically delete head branches | same place | **On.** GitHub deletes a PR's branch when it merges. Only branches pushed without a PR stay; a session's `git push origin --delete` can fail through the cloud proxy, so remove those by hand (Code → Branches). |
| Ruleset for `main` | Settings → Rules → Rulesets | Active on the default branch: no deletion, no force push, PR required with 0 approvals (solo owner), required checks **`changes` + `test`**, "up to date with main" **not** required (green PRs whose files don't overlap merge without updating). |
| Actions permissions | Settings → Actions → General | Workflow token = **read repository contents**; **require approval for all external contributors** (fork PRs cannot burn minutes). |
| Environment `production` | Settings → Environments | Deployment branches = `main` only. Holds the deploy secrets (cloud provider token + account id, API keys, feedback token, a lab code) and the variable `FEEDBACK_REPO`. The only repository-level secret is `TAG_TOKEN` (tag job). |
| Dependabot | Settings → Code security + `.github/dependabot.yml` | Alerts, security updates (grouped) and malware alerts on. Config: weekly npm (max 5 open PRs, dev dependencies grouped as `dev-tools`) + weekly `github-actions`. Dependabot PRs go through CI like any other change. |
| CodeQL | Settings → Code security → Code scanning | "Default setup" (JavaScript / TypeScript). Free on public repos. |
| Secret scanning + push protection | Settings → Code security | Free on public repos; recorded as **still disabled** on 4 Nov 2026: check in Settings and turn both on. Scan the full history once before going public (security review 2). |
| Private vulnerability reporting | Settings → Code security | On; `SECURITY.md` links "Report a vulnerability" plus a contact e-mail. |
| Account | Your profile → Settings | 2FA with an authenticator app and recovery codes kept safe; "Keep my email addresses private" + "Block command line pushes that expose my email"; `git config user.email` = the `…@users.noreply.github.com` address. |
| Templates | `.github/` | `pull_request_template.md` (What / Tests / Version), `ISSUE_TEMPLATE/bug_report.md` (label `bug`, points security reports to `SECURITY.md`, asks for version, browser, device) and `idea.md` (label `idea`). |

## 2. CI/CD pipeline

Two workflows: `test.yml` (tests, deploy, tag, nightly sweep) and `monitor.yml` (uptime).

**Triggers of `test.yml`:** `push` to `main`, every `pull_request`, `workflow_dispatch` (manual "Run workflow"), and a
nightly `schedule`. Never `pull_request_target` (fork PRs then run with a read-only token and no secrets). Never
`paths-ignore`: a required check from a workflow that never started stays "pending" forever; a job skipped by its `if`
reports success instead.

**Concurrency:** one group per PR (a new push cancels the PR's older run) or per ref on `main`. Runs on `main` are never
cancelled by the group itself; the group keeps one running and one pending run, so a newer merge replaces an older
*pending* one. The nightly run has its own group so it never blocks a deploy. The `deploy` job has its own group
`deploy` with `cancel-in-progress: false`: two deploys never overlap, the next one waits.

**Jobs, in order:**
1. `settle` (only real work on a push to `main`, `scripts/ci-settle.mjs`): waits until `main` has been quiet for 2 min,
   so PRs merged close together go live as **one deploy**; if a newer merge overtook it, the run cancels itself (the
   only job with `actions: write`) and the newer run carries its code. If the API fails it just goes on.
2. `changes` (`scripts/ci-changes.mjs`, tested by its own `.test.mjs` first): sets outputs `code` (anything besides
   `docs/**` and `*.md`), `web` (site, shared code, harnesses, workflows), `tree` (a fingerprint of the code files) and
   `proven`. On `main` the diff starts at the **last successful run on main**, not the previous push, so a docs-only
   push after a cancelled code push still tests and deploys that code. Also runs the PR-only guard
   `check-version-edits.mjs` (a PR never sets a version) and `check-docs.mjs --against <base>` (docs stay small, no
   identifier lost); these live here because docs-only PRs skip the later jobs.
3. Test jobs in parallel, each starting with the composite action `.github/actions/prepare` (Node, `npm ci`, build,
   optional local server and Playwright, browser download cached), so they never drift apart:
   `checks` (typecheck, the `check-*.mjs` scripts, unit tests, build, size budget; push + PR), and on PRs `e2e`, `site`,
   `contrast`, `games`, `games-more`, `game-windows`. Keep jobs about equal length: wall-clock time is the longest job;
   `scripts/ci-timings.mjs` measures medians per job and step. Each job prints the tail of the server log on failure.
4. `test` (the ruleset's required check, `if: always()`): green only when every test job passed or was skipped on
   purpose; red when one failed or was cancelled, or `changes` failed. Without `always()` a failed job upstream could
   make it "skipped", which a required check counts as success.
5. "Proven" code: when a PR's `test` passes, it saves a tiny cache keyed by the code fingerprint. If `main`'s merged code
   has the same fingerprint, `main` skips the PR test jobs and runs only `checks`; a combination no PR tested (two PRs
   merged without updating) runs everything again.
6. `deploy` (only `main`, not cancelled, `test` and `changes` succeeded, code changed; `environment: production`):
   checks the keys exist (warns and skips without them) → numbers the release → `npm ci` + build (a guard step fails if
   any deploy secret is in that environment) → keeps the previous build's hashed files so open tabs still load lazy
   chunks → deploys → `scripts/wait-live.mjs` waits until `/api/version` answers the new version id 8 times in a row,
   at least 2 min after the deploy, then a quiet spell of canary rooms (the host keeps restarting server objects for
   minutes after a deploy).
7. `live-e2e` (3 shards, `fail-fast: false`, `environment: production`): the full end-to-end suite against the live
   site; a file that passes only on its retry prints a warning.
8. `tag` (only when deployed and every live shard passed): `scripts/tag-live.mjs` tags `v<version>` at the deployed
   commit and back-fills earlier live versions without a tag; records the number as released; creates a GitHub release
   from the `changelog/next/*.md` fragments added since the previous tag (`scripts/changelog.mjs notes`). The only job
   with `contents: write`. Lesson: GitHub refuses `GITHUB_TOKEN` a tag on a commit whose `.github/workflows` differ from
   main's head, so tags went missing; a fine-grained `TAG_TOKEN` (this repo only, Contents + Workflows read/write) fixes
   it. A refused tag is a warning, never a red run.

**Release numbering (CI does it, nobody edits versions):** `release-series.txt` holds the series (e.g. `0.9.97`); the
deploy uses the series + the highest tag's last part + 1 and writes it into the build only (never committed). The
number is reused if the live e2e fails. PRs add user-facing bullets to `changelog/next/<branch>.md`; a later docs PR
runs `changelog.mjs fold` into `CHANGELOG.md`. `check-version-edits.mjs` fails a PR that touches a version by hand.

**Nightly date sweep:** the same test jobs on `main` at 02:17 UTC with the browser clock moved 1–60 days ahead (a
different day each night), never deploying. A failure opens one issue labelled `date-sweep`; the next green night closes
it. Catches tests that depend on today's date.

**Uptime monitor (`monitor.yml`):** every 30 min (`7,37 * * * *`) plus manual; skipped in forks
(`if: github.repository == ...`); `issues: write` only. `scripts/monitor.mjs` checks the home page, `/api/version` and a
tiny room join, retrying once after a minute. Down: opens **one** issue labelled `outage` (GitHub notifies the owner, no
extra account), later checks edit it in place (no new notification); the first green check closes it with a comment.
The run itself stays green (a red scheduled run would e-mail every 30 min). Lesson: GitHub runs schedules best-effort
(1 of ≈ 12 planned runs on one day), so the main check moved into the app's own cron; the workflow stays as the outside
backup.

**Workflow hygiene:** top-level `permissions: contents: read`, wider permissions only on the job that needs them;
every action pinned by commit SHA with the tag in a comment (`actions/checkout@<sha> # v7.0.1`; Dependabot keeps them
current); `timeout-minutes` on every job; `scripts/ci-workflow.test.mjs` checks the permissions stay as designed.

## 3. Working with many AI sessions

- **Every change through a branch and a PR**, branch `claude/<short-english-slug>`; nobody pushes to `main` (the
  ruleset enforces it). Commits: imperative English summary, no version, trailing `Co-Authored-By`.
- **Docs-only PRs** are merged by their own session once green (the test jobs skip, the required checks still pass).
- **Auto-merge:** with "Allow auto-merge" on, a session enables auto-merge (squash) right after opening the PR and can
  stop; GitHub merges when `changes` + `test` are green. Do this for every PR.
- **The PR template** asks What / Tests / Version (version is now always "CI numbers it"). For UI changes the PR also
  lists findings of a fresh screenshot review as fixed or answered.
- **Shared-file rule (the big lesson):** parallel sessions must **not** append to the same shared files in their PRs
  (here: `STATUS.md`, `archive/cards-done.md`). Each PR touches only its own files; feature notes go into per-branch
  fragments (`changelog/next/<branch>.md`); one coordinator session batches the shared edits in its own PR. Otherwise
  every merge conflicts with every open PR and each fix costs another full CI run.
- **Split work by files** so no two sessions touch the same lines; give each session one group of work, then a fresh
  session (small contexts are cheaper).
- **Merged-branch cleanup:** check with `git merge-base --is-ancestor <branch> origin/main` before deleting; better,
  GitHub deletes head branches automatically on merge.
- **Flaky tests double CI time.** A step that depends on a third-party site (here: YouTube's response times) failed
  often enough that reruns doubled the CI time. Tests must not depend on outside response times: fake or stub the
  outside service in the browser, serve test media locally, and keep real-service checks as a manual or separate,
  non-required step. Likewise no test may depend on today's date (the nightly sweep proves it).
- **Merge timing:** merges within ~2 min go out as one deploy (`settle`); a newer merge replaces an older pending deploy
  run, which is safe because the next run diffs from the last *successful* run.

## 4. Secrets and safety

- **Never commit secrets**, tokens, private e-mails or hidden addresses; the repo is public. `.gitignore` local env
  files; keep secret scanning + push protection on.
- **Deploy secrets live in the `production` environment** (branches = `main` only), so no other job or branch can read
  them. Repository-level secrets only for jobs that cannot use the environment (here only `TAG_TOKEN`).
- **Secrets only on the step that needs them** (step `env`, never job `env`): never in the environment of `npm ci`
  (install scripts run third-party code) or the build. A guard step greps `env` and fails if one leaks there. A "keys
  present?" step uses `secrets.X != ''` and skips the deploy with a warning instead of failing.
- **Upload secrets to the host from a temp file** (`$RUNNER_TEMP`), never echo or log them.
- **Smallest tokens:** fine-grained, one repository, the fewest permissions, an expiry date with a calendar reminder
  (e.g. feedback token = Issues: write on one repo; cloud token = a custom "deploy scripts: edit" token, never a global
  key). Optional secrets degrade to "feature off" with a warning.
- **Private data never in public issues:** user feedback goes to a separate **private** repository (variable
  `FEEDBACK_REPO`); without it the feature answers "off".
- **Test powers stay local:** flags that unlock test features (`--var` on the local dev server) are never in the deploy
  config.
- **Forks:** `pull_request` only, approval for external contributors, monitor/sweep jobs check `github.repository`.
- **Breach plan** (`breach-plan.md`): contain in the first hour (roll back the deploy by re-running the last good `main`
  commit, rotate every possibly exposed secret, switch the feature off), investigate with Actions runs and the GitHub
  audit log, report to the authority within 72 hours where the law says so, tell the people affected, fix with a
  regression test. `SECURITY.md` links it.
- **2FA everywhere** that can deploy or publish (GitHub, cloud host, store and API accounts), with recovery codes in the
  password manager.

## 5. Next project: setup in order

1. Create the repo; decide public (free minutes) vs private; add `LICENSE`, `SECURITY.md`, `README.md`, `.gitignore`;
   mark packages `"private": true`.
2. Account: 2FA, private commit e-mail, block pushes that expose it.
3. Settings → General: squash merge only, **Allow auto-merge on, Automatically delete head branches on**, description,
   website, social preview.
4. Settings → Actions → General: read-only workflow token; approval for all external contributors.
5. Settings → Code security: Dependabot alerts + security updates, secret scanning + push protection, CodeQL default
   setup, private vulnerability reporting. Add `.github/dependabot.yml` (npm + github-actions, weekly).
6. Add `.github/pull_request_template.md` and `ISSUE_TEMPLATE/` (bug, idea).
7. Write `test.yml`: `permissions: contents: read`, SHA-pinned actions, a `changes` job (no `paths-ignore`), parallel
   test jobs through one composite `prepare` action, and an `if: always()` aggregator job named `test`.
8. Settings → Rules → Rulesets for `main`: PR required, no force push, no deletion, required checks `changes` + `test`.
9. Settings → Environments → `production` (branch `main`); put deploy secrets there, step-scoped, with a guard step.
10. Add deploy → wait-live → live e2e → tag (CI numbering, release notes from per-branch fragments); add a
    `TAG_TOKEN` from the start if workflows will change often.
11. Add the uptime workflow (one `outage` issue, run stays green) and, if the host has one, an in-app cron as the main
    check; add a nightly run that shifts the date.
12. Session rules in `CLAUDE.md`: branch naming, auto-merge on every PR, no shared-file edits in parallel PRs (one
    coordinator), no tests that depend on third-party sites or today's date.
