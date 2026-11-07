// node --test scripts/ci-changes.test.mjs — the CI diet's "what changed?" step (scripts/ci-changes.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, execFile } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { decide, lastGoodSha } from './ci-changes.mjs';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'ci-changes.mjs');

test('decide: docs-only, code, web', () => {
  assert.deepEqual(decide(['docs/a.md', 'README.md', 'apps/web/notes.md']), { code: false, web: false });
  assert.deepEqual(decide(['docs/a.md', 'apps/server/src/index.ts']), { code: true, web: false });
  assert.deepEqual(decide(['packages/shared/src/x.ts']), { code: true, web: true });
  assert.deepEqual(decide(['.github/workflows/test.yml']), { code: true, web: true });
  assert.deepEqual(decide(['.github/actions/prepare/action.yml']), { code: true, web: true });
  assert.deepEqual(decide([]), { code: false, web: false });
});

test('lastGoodSha skips this run, cancelled / failed runs and PR runs', () => {
  const runs = [
    { id: 9, head_branch: 'main', event: 'push', status: 'in_progress', conclusion: null, head_sha: 'c' },
    { id: 8, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'cancelled', head_sha: 'b' },
    { id: 7, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'failure', head_sha: 'b0' },
    { id: 6, head_branch: 'main', event: 'pull_request', status: 'completed', conclusion: 'success', head_sha: 'pr' },
    { id: 5, head_branch: 'main', event: 'workflow_dispatch', status: 'completed', conclusion: 'success', head_sha: 'a' },
  ];
  assert.equal(lastGoodSha(runs, 9), 'a');
  assert.equal(lastGoodSha(runs.slice(0, 4), 9), null);
});

/** A repo with A (deployed), B (code, its run cancelled), C (docs only, this run). */
function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'ci-changes-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'ci@example.com');
  git('config', 'user.name', 'CI');
  const commit = (file, text) => {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), text);
    git('add', '-A');
    git('commit', '-qm', file);
    return git('rev-parse', 'HEAD');
  };
  const a = commit('apps/server/src/index.ts', '1');
  const b = commit('apps/server/src/index.ts', '2');
  const c = commit('docs/notes.md', 'x');
  return { dir, a, b, c };
}

function run(dir, env, runs) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ workflow_runs: runs }));
    }).listen(0, () => {
      const out = join(dir, 'out.txt');
      writeFileSync(out, '');
      execFile(process.execPath, [SCRIPT], {
        cwd: dir,
        encoding: 'utf8',
        env: { ...process.env, GITHUB_REPOSITORY: 'o/r', GITHUB_RUN_ID: '3', GITHUB_API_URL: `http://localhost:${server.address().port}`, GITHUB_OUTPUT: out, ...env },
      }, (error) => {
        server.close();
        if (error) reject(error);
        else resolve(readFileSync(out, 'utf8'));
      });
    });
  });
}

test('main: a docs-only push after a cancelled code push still deploys', async () => {
  const { dir, a, b, c } = repo();
  const runs = [
    { id: 3, head_branch: 'main', event: 'push', status: 'in_progress', conclusion: null, head_sha: c },
    { id: 2, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'cancelled', head_sha: b },
    { id: 1, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success', head_sha: a },
  ];
  assert.equal(await run(dir, { EVENT: 'push' }, runs), 'code=true\nweb=false\n');
});

test('main: a docs-only push after a deployed run deploys nothing', async () => {
  const { dir, b, c } = repo();
  const runs = [{ id: 2, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success', head_sha: b }];
  assert.equal(await run(dir, { EVENT: 'push' }, runs), 'code=false\nweb=false\n');
  void c;
});

test('main: no successful run yet, or a manual run: everything', async () => {
  const { dir } = repo();
  assert.equal(await run(dir, { EVENT: 'push' }, []), 'code=true\nweb=true\n');
  assert.equal(await run(dir, { EVENT: 'workflow_dispatch' }, []), 'code=true\nweb=true\n');
});

test('pull request: only its own change (first parent .. HEAD)', async () => {
  const { dir } = repo();
  assert.equal(await run(dir, { EVENT: 'pull_request' }, []), 'code=false\nweb=false\n');
});
