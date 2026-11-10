// Card QA1: how long CI takes, job by job and step by step. Median (and the slowest) of the last N finished runs of
// the Tests workflow, separately for pull requests and for main (push: deploy + live e2e). Prints a Markdown table to
// paste into docs/internal/architecture/reference.md "CI".
//
//   node scripts/ci-timings.mjs [--runs 10] [--event pull_request|push|both] [--steps]
//
// Needs the `gh` CLI signed in (cloud sessions have it for search and the REST API). Reads only.
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const RUNS = Number(opt('runs', '10'));
const EVENTS = opt('event', 'both') === 'both' ? ['pull_request', 'push'] : [opt('event')];
const STEPS = args.includes('--steps');
const REPO = opt('repo', 'alperenakturk/screen-with-me');

const api = (path) => JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8', maxBuffer: 64 << 20 }));
const secs = (a, b) => (a && b ? (Date.parse(b) - Date.parse(a)) / 1000 : null);
const median = (xs) => {
  const s = xs.filter((x) => x !== null).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const fmt = (s) => (s === null ? '–' : s >= 60 ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : `0:${String(Math.round(s)).padStart(2, '0')}`);

for (const event of EVENTS) {
  // Finished runs only; cancelled ones (superseded by a newer push) say nothing about how long a run takes.
  const branch = event === 'push' ? '&branch=main' : '';
  const list = api(`repos/${REPO}/actions/workflows/test.yml/runs?event=${event}&status=completed&per_page=50${branch}`).workflow_runs;
  const runs = list.filter((r) => r.conclusion === 'success' || r.conclusion === 'failure').slice(0, RUNS);
  const jobs = new Map(); // name → { total: [], steps: Map(step → []) }
  const walls = [];
  for (const run of runs) {
    const js = api(`repos/${REPO}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs?per_page=50`).jobs;
    let first = null;
    let last = null;
    for (const job of js) {
      if (job.conclusion === 'skipped' || !job.started_at || !job.completed_at) continue;
      first = first && first < job.started_at ? first : job.started_at;
      last = last && last > job.completed_at ? last : job.completed_at;
      const entry = jobs.get(job.name) ?? { total: [], steps: new Map() };
      entry.total.push(secs(job.started_at, job.completed_at));
      for (const step of job.steps ?? []) {
        if (step.conclusion === 'skipped') continue;
        const list2 = entry.steps.get(step.name) ?? [];
        list2.push(secs(step.started_at, step.completed_at));
        entry.steps.set(step.name, list2);
      }
      jobs.set(job.name, entry);
    }
    walls.push(secs(run.run_started_at ?? run.created_at, run.updated_at));
  }
  console.log(`\n### ${event === 'push' ? 'main (push: deploy + live e2e)' : 'pull requests'}: last ${runs.length} finished runs`);
  console.log(`Whole run, first job start → last job end (median / slowest): ${fmt(median(walls))} / ${fmt(Math.max(...walls.filter(Boolean)))}\n`);
  console.log('| Job | Median | Slowest | Runs |');
  console.log('|---|---|---|---|');
  for (const [name, e] of [...jobs].sort((a, b) => median(b[1].total) - median(a[1].total))) {
    console.log(`| ${name} | ${fmt(median(e.total))} | ${fmt(Math.max(...e.total))} | ${e.total.length} |`);
  }
  if (!STEPS) continue;
  for (const [name, e] of [...jobs].sort((a, b) => median(b[1].total) - median(a[1].total))) {
    console.log(`\n**${name}** (median ${fmt(median(e.total))})\n`);
    console.log('| Step | Median | Slowest |');
    console.log('|---|---|---|');
    for (const [step, xs] of [...e.steps].sort((a, b) => median(b[1]) - median(a[1]))) {
      if (median(xs) < 2) continue;
      console.log(`| ${step} | ${fmt(median(xs))} | ${fmt(Math.max(...xs))} |`);
    }
  }
}
