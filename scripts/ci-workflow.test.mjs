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

/** Every job under `jobs:` as { needs, if, block } (single-line values; `block` = the job's own lines). */
function jobs(text) {
  const out = {};
  const lines = text.split('\n');
  const start = lines.indexOf('jobs:');
  let name = null;
  for (const line of lines.slice(start + 1)) {
    const job = line.match(/^ {2}([a-z][\w-]*):\s*$/);
    if (job) { name = job[1]; out[name] = { block: '' }; continue; }
    if (!name) continue;
    if (!line.trimStart().startsWith('#')) out[name].block += `${line}\n`;
    const key = line.match(/^ {4}(needs|if):\s*(.+)$/);
    if (key) out[name][key[1]] = key[2].trim();
  }
  return out;
}

const all = jobs(readFileSync(FILE, 'utf8'));
const cond = (job) => (all[job]?.if ?? '').replace(/^\$\{\{\s*|\s*\}\}$/g, '');

test('the jobs are found', () => {
  for (const name of ['changes', 'checks', 'e2e', 'site', 'contrast', 'games', 'games-more', 'game-windows', 'state-matrix', 'lab-sweep', 'test', 'deploy', 'live-e2e', 'tag']) assert.ok(all[name], name);
});

test('the summary job `test` always reports and waits for every test job', () => {
  assert.match(cond('test'), /\balways\(\)/);
  for (const job of ['changes', 'checks', 'e2e', 'site', 'contrast', 'games', 'games-more', 'game-windows', 'state-matrix', 'lab-sweep']) assert.match(all.test.needs, new RegExp(`\\b${job}\\b`));
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
  assert.match(c, /needs\.deploy\.outputs\.deployed == 'true'/);
  assert.match(c, /needs\.live-e2e\.result == 'success'/, 'QA1 part 1b: only after every live e2e shard passed');
});

test('the live e2e runs in shards on separate runners, only after a deploy, never skipping a shard on a failure', () => {
  const c = cond('live-e2e');
  assert.match(c, /!cancelled\(\)/);
  assert.match(c, /needs\.deploy\.outputs\.deployed == 'true'/);
  const block = all['live-e2e'].block;
  assert.match(block, /fail-fast: false/);
  assert.match(block, /shard: \[1, 2\]/);
  assert.match(block, /SWM_E2E_SHARD: \$\{\{ matrix\.shard \}\}\/2/);
  assert.match(block, /npm run e2e -- /);
});

test('tag: only contents: write + actions: read, never workflows; the catch-up script does the tagging (TAG1)', () => {
  const perms = all.tag.block.match(/^ {4}permissions:\n((?: {6}.+\n)+)/m)?.[1] ?? '';
  const granted = perms.trim().split('\n').map((l) => l.trim()).sort();
  assert.deepEqual(granted, ['actions: read', 'contents: write']);
  assert.match(all.tag.block, /node scripts\/tag-live\.mjs/);
  assert.match(all.tag.block, /fetch-depth: 0/, 'the catch-up reads older commits');
  for (const [name, job] of Object.entries(all)) {
    if (name !== 'tag') assert.doesNotMatch(job.block, /contents: write/, `${name} must not write to the repository`);
    assert.doesNotMatch(job.block, /workflows: write/, `${name} must not get workflow rights`);
  }
});
