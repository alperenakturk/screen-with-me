// node --test scripts/tag-live.test.mjs — which versions the `tag` job tags (card TAG1, scripts/tag-live.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planTags, ownerSteps, versionAtLeast, wentLive } from './tag-live.mjs';

const commits = [
  { sha: 'z1', version: '0.9.97.69' }, // before tags began: never tagged
  { sha: 'a1', version: '0.9.97.72' }, // tagged long ago
  { sha: 'b1', version: '0.9.97.73' },
  { sha: 'b2', version: '0.9.97.73' }, // a CI-only commit after .73 (same version, deployed again)
  { sha: 'c1', version: '0.9.97.74' }, // live, but main's workflows changed after it
  { sha: 'd1', version: '0.9.97.75' }, // this run
];
const live = new Set(['z1', 'b1', 'b2', 'c1', 'd1']);
const base = {
  commits,
  tagged: ['0.9.97.72'],
  isLive: async (sha) => live.has(sha),
  sameWorkflows: async (sha) => sha !== 'c1',
};

test('every untagged live version once, at its first live commit', async () => {
  assert.deepEqual(await planTags(base), [
    { version: '0.9.97.73', sha: 'b1', action: 'push' },
    { version: '0.9.97.74', sha: 'c1', action: 'owner' },
    { version: '0.9.97.75', sha: 'd1', action: 'push' },
  ]);
});

test('a version already tagged is left alone (a version deployed again keeps its first tag)', async () => {
  const plan = await planTags({ ...base, tagged: ['0.9.97.72', '0.9.97.73', '0.9.97.74', '0.9.97.75'] });
  assert.deepEqual(plan, []);
});

test('a version that never reached live gets no tag; a later live commit of it does', async () => {
  const plan = await planTags({ ...base, isLive: async (sha) => sha !== 'b1' && live.has(sha) });
  assert.deepEqual(plan[0], { version: '0.9.97.73', sha: 'b2', action: 'push' });
  const none = await planTags({ ...base, isLive: async (sha) => sha === 'd1' });
  assert.deepEqual(none.map((p) => p.version), ['0.9.97.75']);
});

test('a commit whose workflows differ from main is never pushed by the token, only reported', async () => {
  const plan = await planTags({ ...base, sameWorkflows: async () => false });
  assert.ok(plan.every((p) => p.action === 'owner'));
});

test('TAG2: with a token that may tag workflow changes (TAG_TOKEN), every untagged live version is pushed', async () => {
  const plan = await planTags({ ...base, sameWorkflows: async () => false, canTagWorkflows: true });
  assert.deepEqual(plan.map((p) => [p.version, p.action]), [['0.9.97.73', 'push'], ['0.9.97.74', 'push'], ['0.9.97.75', 'push']]);
});

test("the owner's steps name the version, the commit and the release page", () => {
  const text = ownerSteps('owner/repo', '0.9.97.74', '7d6201b0123456789');
  assert.match(text, /v0\.9\.97\.74/);
  assert.match(text, /7d6201b/);
  assert.match(text, /https:\/\/github\.com\/owner\/repo\/releases\/new/);
});

test('versions compare part by part', () => {
  assert.ok(versionAtLeast('0.9.97.70', '0.9.97.70'));
  assert.ok(versionAtLeast('0.9.97.100', '0.9.97.70'));
  assert.ok(versionAtLeast('0.9.98', '0.9.97.70'));
  assert.ok(!versionAtLeast('0.9.97.69', '0.9.97.70'));
  assert.ok(!versionAtLeast('0.9.96.25', '0.9.97.70'));
});

test('a run went live when its deploy and every live e2e shard passed (QA1 part 1b); older runs had no shards', () => {
  const job = (name, conclusion) => ({ name, conclusion });
  assert.equal(wentLive([job('deploy', 'success')]), true, 'before the split the e2e lived inside deploy');
  assert.equal(wentLive([job('deploy', 'success'), job('live-e2e (1)', 'success'), job('live-e2e (2)', 'success')]), true);
  assert.equal(wentLive([job('deploy', 'success'), job('live-e2e (1)', 'success'), job('live-e2e (2)', 'failure')]), false);
  assert.equal(wentLive([job('deploy', 'failure'), job('live-e2e (1)', 'skipped')]), false);
  assert.equal(wentLive([job('deploy', 'success'), job('live-e2e (1)', 'cancelled')]), false);
});
