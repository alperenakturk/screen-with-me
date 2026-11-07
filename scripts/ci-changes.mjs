// CI diet: what a change needs. Prints `code=true|false` and `web=true|false` (also into $GITHUB_OUTPUT).
//   code: anything besides docs (`docs/**`, `*.md`) changed: run the tests (and deploy on main).
//   web:  the site, the shared code, the harnesses or the workflows changed: run the browser harnesses too.
// The range: a PR = its merge commit's first parent .. HEAD (the PR's own change). main = the last successful run on
// main .. HEAD, not just this push: on main the concurrency group keeps only one pending run, so a newer push cancels an
// older pending one, and a docs-only push after a cancelled code push must still deploy that code. A successful run
// means everything up to its commit is live (it deployed, or its own range had nothing to deploy). A manual run, or a
// base we can't find, runs everything.
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

export const isCode = (file) => !/^docs\/|\.md$/.test(file);
export const isWeb = (file) => /^(apps\/web\/|packages\/shared\/|scripts\/harness\/|\.github\/workflows\/|\.github\/actions\/|site\.config\.json$|scripts\/site-config\.)/.test(file);

/** What a list of changed files needs. */
export function decide(files) {
  return { code: files.some(isCode), web: files.some((f) => isCode(f) && isWeb(f)) };
}

/** The newest successful run on main other than this one, from the API's list of runs (newest first). */
export function lastGoodSha(runs, currentRunId) {
  const good = runs.find((r) => r.id !== currentRunId && r.head_branch === 'main' && r.event !== 'pull_request' && r.status === 'completed' && r.conclusion === 'success');
  return good ? good.head_sha : null;
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const hasCommit = (sha) => { try { git('cat-file', '-e', `${sha}^{commit}`); return true; } catch { return false; } };
const isAncestor = (sha) => { try { git('merge-base', '--is-ancestor', sha, 'HEAD'); return true; } catch { return false; } };

async function mainBase() {
  const { GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: runId, GITHUB_TOKEN: token, GITHUB_API_URL: api = 'https://api.github.com' } = process.env;
  if (!repo) return null;
  const res = await fetch(`${api}/repos/${repo}/actions/workflows/test.yml/runs?branch=main&status=success&per_page=30`, {
    headers: { accept: 'application/vnd.github+json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
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
  console.log(`code=${out.code} web=${out.web}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `code=${out.code}\nweb=${out.web}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
