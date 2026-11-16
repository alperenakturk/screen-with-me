// Card CI3 (release train): main's run waits until main has been quiet for a moment, so PRs merged close together go
// live in one deploy. The workflow's concurrency group keeps one run going and one pending on main (a newer push
// replaces the pending one); this step runs first in every main run:
//   - main's head is still this run's commit and was pushed SETTLE_S ago or more: go on (test, deploy, live e2e, tag);
//   - main moved on (a newer merge): this run cancels itself. The newer run is pending behind it, and its range starts at
//     the last successful run (ci-changes.mjs), so it tests and deploys this commit's code too. A cancelled run never
//     counts as "deployed";
//   - the API does not answer, or the cancel is refused: go on (the old one-run-per-push behaviour, never a lost deploy).
const SETTLE_MS = Number(process.env.SETTLE_S ?? 120) * 1000;
const MAX_MS = 10 * 60 * 1000;

/** What to do now: `go`, `superseded`, or wait `ms` more. */
export function settle({ headSha, headDate, mySha, now, settleMs = SETTLE_MS }) {
  if (headSha && headSha !== mySha) return { action: 'superseded' };
  const quiet = now - Date.parse(headDate);
  if (!headSha || !Number.isFinite(quiet) || quiet >= settleMs) return { action: 'go' };
  return { action: 'wait', ms: Math.min(15_000, settleMs - quiet) };
}

const { GITHUB_REPOSITORY: repo, GITHUB_TOKEN: token, GITHUB_SHA: mySha, GITHUB_RUN_ID: runId, GITHUB_API_URL: api = 'https://api.github.com' } = process.env;
const ask = (path, method = 'GET') => fetch(`${api}/repos/${repo}${path}`, {
  method,
  headers: { accept: 'application/vnd.github+json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function head() {
  try {
    const res = await ask('/commits/main');
    if (!res.ok) { console.log(`::warning::main's head answered ${res.status}; going on`); return {}; }
    const c = await res.json();
    return { headSha: c.sha, headDate: c.commit?.committer?.date };
  } catch (error) {
    console.log(`::warning::main's head failed (${error.message}); going on`);
    return {};
  }
}

async function main() {
  const start = Date.now();
  for (;;) {
    const h = await head();
    const d = settle({ ...h, mySha, now: Date.now() });
    if (d.action === 'go') { console.log(`main is quiet at ${mySha.slice(0, 7)}: going on`); return; }
    if (d.action === 'superseded') {
      console.log(`main moved on to ${h.headSha.slice(0, 7)}: its run (pending behind this one) takes this commit along; cancelling this run`);
      const res = await ask(`/actions/runs/${runId}/cancel`, 'POST').catch(() => null);
      if (res && res.status === 202) { await sleep(120_000); console.log('::warning::still running after the cancel; going on'); return; }
      console.log(`::warning::the cancel answered ${res?.status ?? 'nothing'}; going on`);
      return;
    }
    if (Date.now() - start > MAX_MS) { console.log('::warning::main kept moving for 10 min; going on'); return; }
    console.log(`waiting ${Math.round(d.ms / 1000)} s for main to stay quiet (merges close together go live together)`);
    await sleep(d.ms);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
