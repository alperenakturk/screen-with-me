// CI diet: what a change needs. Prints `code=true|false` and `web=true|false` (also into $GITHUB_OUTPUT).
//   code: anything besides docs (`docs/**`, `*.md`) changed: run the tests (and deploy on main).
//   web:  the site, the shared code, the harnesses or the workflows changed: run the browser harnesses too.
// The range: a PR = its merge commit's first parent .. HEAD (the PR's own change). main = the last successful run on
// main .. HEAD, not just this push: on main the concurrency group keeps only one pending run, so a newer push cancels an
// older pending one, and a docs-only push after a cancelled code push must still deploy that code. A successful run
// means everything up to its commit is live (it deployed, or its own range had nothing to deploy). A manual run, or a
// base we can't find, runs everything.
// Card CI3 (release train): also prints `tree` (a hash of every code file at HEAD, docs left out) and, on main,
// `proven=true|false`. A PR run whose tests all passed saves a tiny cache named `tested-code-<tree>`; main's run looks
// for one with its own tree. Found: this exact code (whatever docs came with it) already passed every test job in a PR,
// so main goes straight to the deploy. Not found (two PRs merged without updating, or main moved under a PR): main runs
// the PR test jobs itself before it deploys.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

export const isCode = (file) => !/^docs\/|\.md$/.test(file);
export const isWeb = (file) => /^(apps\/web\/|packages\/shared\/|scripts\/harness\/|\.github\/workflows\/|\.github\/actions\/|site\.config\.json$|scripts\/site-config\.)/.test(file);

/** What a list of changed files needs. */
export function decide(files) {
  return { code: files.some(isCode), web: files.some((f) => isCode(f) && isWeb(f)) };
}

/** The code's fingerprint from `git ls-tree -r HEAD`: every code file's path and blob hash, docs left out. */
export function codeTreeKey(lsTree) {
  const lines = lsTree.split('\n').filter((l) => l && isCode(l.slice(l.indexOf('\t') + 1)));
  return createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 40);
}

/** The cache a green PR run saves for its tested code, and main's run looks for. */
export const testedKey = (tree) => `tested-code-${tree}`;

/** Whether the API's list of caches holds the exact key (the API matches a key prefix). */
export const hasTested = (caches, tree) => caches.some((c) => c.key === testedKey(tree));

/** The newest successful run on main other than this one, from the API's list of runs (newest first). */
export function lastGoodSha(runs, currentRunId) {
  const good = runs.find((r) => r.id !== currentRunId && r.head_branch === 'main' && r.event !== 'pull_request' && r.status === 'completed' && r.conclusion === 'success');
  return good ? good.head_sha : null;
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const hasCommit = (sha) => { try { git('cat-file', '-e', `${sha}^{commit}`); return true; } catch { return false; } };
const isAncestor = (sha) => { try { git('merge-base', '--is-ancestor', sha, 'HEAD'); return true; } catch { return false; } };

const { GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token, GITHUB_API_URL: api = 'https://api.github.com' } = process.env;
const ask = (path) => fetch(`${api}/repos/${repo}${path}`, {
  headers: { accept: 'application/vnd.github+json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
});

/** Whether a green PR run already tested exactly this code (its cache exists, in any branch's scope). */
async function proven(tree) {
  if (!repo) return false;
  try {
    const res = await ask(`/actions/caches?key=${testedKey(tree)}&per_page=10`);
    if (!res.ok) { console.log(`::warning::caches list answered ${res.status}; main runs the PR test jobs`); return false; }
    const { actions_caches: caches = [] } = await res.json();
    return hasTested(caches, tree);
  } catch (error) {
    console.log(`::warning::caches list failed (${error.message}); main runs the PR test jobs`);
    return false;
  }
}

async function mainBase() {
  const runId = process.env.GITHUB_RUN_ID;
  if (!repo) return null;
  const res = await ask('/actions/workflows/test.yml/runs?branch=main&status=success&per_page=30');
  if (!res.ok) { console.log(`::warning::runs list answered ${res.status}; testing everything`); return null; }
  const { workflow_runs: runs = [] } = await res.json();
  return lastGoodSha(runs, Number(runId));
}

async function main() {
  const event = process.env.EVENT;
  let base = null;
  if (event === 'pull_request') base = 'HEAD^1';
  else if (event === 'push') base = await mainBase();
  let out = { code: true, web: true };
  if (base && hasCommit(base) && (base === 'HEAD^1' || isAncestor(base))) {
    const list = git('diff', '--name-only', base, 'HEAD');
    const files = list ? list.split('\n') : [];
    console.log(`changes since ${base}:\n${list || '(none)'}`);
    out = decide(files);
  } else {
    console.log(`no usable base (${base ?? 'none'}): testing everything`);
  }
  const tree = codeTreeKey(git('ls-tree', '-r', 'HEAD'));
  // Only main asks: a PR, a manual run and a docs-only push never skip on it.
  const tested = event === 'push' && out.code ? await proven(tree) : false;
  console.log(`code=${out.code} web=${out.web} tree=${tree} proven=${tested}${tested ? ' (a green PR run tested exactly this code)' : ''}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `code=${out.code}\nweb=${out.web}\ntree=${tree}\nproven=${tested}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
