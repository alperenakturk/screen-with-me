// node --test scripts/ci-changes.test.mjs — the CI diet's "what changed?" step (scripts/ci-changes.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, execFile } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { codeTreeKey, decide, hasTested, lastGoodSha, testedKey } from './ci-changes.mjs';

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

/** The old two outputs, as the tests before CI3 read them. */
const run = async (dir, env, runs) => {
  const o = await outputs(dir, env, runs);
  return `code=${o.code}\nweb=${o.web}\n`;
};

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

/** Runs ci-changes.mjs against a fake API; answers its outputs as an object (`code`, `web`, `tree`, `proven`). */
function outputs(dir, env, runs, caches = []) {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      res.setHeader('content-type', 'application/json');
      if (req.url.includes('/actions/caches')) {
        const key = new URL(req.url, 'http://x').searchParams.get('key');
        res.end(JSON.stringify({ actions_caches: caches.filter((c) => c.key.startsWith(key)) }));
      } else res.end(JSON.stringify({ workflow_runs: runs }));
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
        else resolve(Object.fromEntries(readFileSync(out, 'utf8').trim().split('\n').map((l) => l.split('='))));
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

test('codeTreeKey: the code files only; a docs change keeps the key, a code change moves it', () => {
  const ls = (doc, code) => [
    `100644 blob ${doc}\tdocs/internal/STATUS.md`,
    `100644 blob ${doc}\tREADME.md`,
    `100644 blob ${code}\tapps/web/src/room.ts`,
  ].join('\n');
  assert.equal(codeTreeKey(ls('a1', 'c1')), codeTreeKey(ls('a2', 'c1')));
  assert.notEqual(codeTreeKey(ls('a1', 'c1')), codeTreeKey(ls('a1', 'c2')));
  assert.match(codeTreeKey(ls('a1', 'c1')), /^[0-9a-f]{40}$/);
});

test('hasTested: the exact key only (the API matches by prefix)', () => {
  assert.equal(hasTested([{ key: testedKey('ab') }], 'ab'), true);
  assert.equal(hasTested([{ key: testedKey('abc') }], 'ab'), false);
  assert.equal(hasTested([], 'ab'), false);
});

test('main: the code a green PR run tested (its cache exists) is proven; any other code is not', async () => {
  const { dir, a, b } = repo();
  const runs = [{ id: 1, head_branch: 'main', event: 'push', status: 'completed', conclusion: 'success', head_sha: a }];
  const tree = (await outputs(dir, { EVENT: 'push' }, runs)).tree;
  const hit = await outputs(dir, { EVENT: 'push' }, runs, [{ key: testedKey(tree), ref: 'refs/pull/7/merge' }]);
  assert.deepEqual(hit, { code: 'true', web: 'false', tree, proven: 'true' });
  const miss = await outputs(dir, { EVENT: 'push' }, runs, [{ key: testedKey('0'.repeat(40)), ref: 'refs/pull/8/merge' }]);
  assert.equal(miss.proven, 'false', 'a combination no PR tested: main runs the PR test jobs');
  void b;
});

test('pull request and manual runs never count as proven', async () => {
  const { dir } = repo();
  const tree = (await outputs(dir, { EVENT: 'pull_request' }, [])).tree;
  const caches = [{ key: testedKey(tree) }];
  assert.equal((await outputs(dir, { EVENT: 'pull_request' }, [], caches)).proven, 'false');
  assert.equal((await outputs(dir, { EVENT: 'workflow_dispatch' }, [], caches)).proven, 'false');
});
