// node --test scripts/ci-workflow.test.mjs — guards in .github/workflows/test.yml that once broke silently (card CI2).
// A job whose `if` has no status function gets an implicit success() over every job up its `needs` chain; on a push
// the PR-only test jobs are skipped, so deploy / tag were skipped too. No YAML library here (the `changes` job runs
// before `npm ci`): the jobs are read by indentation, which is enough for these few lines.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE = join(dirname(fileURLToPath(import.meta.url)), '..', '.github', 'workflows', 'test.yml');

/** Every job under `jobs:` as { needs, if } (single-line values only). */
function jobs(text) {
  const out = {};
  const lines = text.split('\n');
  const start = lines.indexOf('jobs:');
  let name = null;
  for (const line of lines.slice(start + 1)) {
    const job = line.match(/^ {2}([a-z][\w-]*):\s*$/);
    if (job) { name = job[1]; out[name] = {}; continue; }
    const key = name && line.match(/^ {4}(needs|if):\s*(.+)$/);
    if (key) out[name][key[1]] = key[2].trim();
  }
  return out;
}

const all = jobs(readFileSync(FILE, 'utf8'));
const cond = (job) => (all[job]?.if ?? '').replace(/^\$\{\{\s*|\s*\}\}$/g, '');

test('the jobs are found', () => {
  for (const name of ['changes', 'checks', 'e2e', 'site', 'games', 'test', 'deploy', 'tag']) assert.ok(all[name], name);
});

test('the summary job `test` always reports and waits for every test job', () => {
  assert.match(cond('test'), /\balways\(\)/);
  for (const job of ['changes', 'checks', 'e2e', 'site', 'games']) assert.match(all.test.needs, new RegExp(`\\b${job}\\b`));
});

test('deploy runs despite skipped test jobs, but only after the tests passed, never in a cancelled run', () => {
  const c = cond('deploy');
  assert.match(c, /!cancelled\(\)/, 'a status function, so skipped jobs up the chain do not skip the deploy');
  assert.doesNotMatch(c, /\balways\(\)/, 'always() would deploy from a cancelled run');
  assert.match(c, /needs\.test\.result == 'success'/);
  assert.match(c, /needs\.changes\.outputs\.code == 'true'/, 'a docs-only push deploys nothing');
  assert.match(c, /github\.ref == 'refs\/heads\/main'/);
});

test('tag runs only after a live deploy, never in a cancelled run', () => {
  const c = cond('tag');
  assert.match(c, /!cancelled\(\)/);
  assert.match(c, /needs\.deploy\.result == 'success'/);
  assert.match(c, /needs\.deploy\.outputs\.live == 'true'/);
});
