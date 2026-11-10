// Card QA1 part 1b: the live e2e's shards (scripts/e2e/shard.mjs). Run: node --test scripts/e2e/shard.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LIVE_SECONDS, shardFiles } from './shard.mjs';

const FILES = JSON.parse(readFileSync(new URL('./run.mjs', import.meta.url), 'utf8').match(/const FILES = (\[[^\]]+\])/)[1].replace(/'/g, '"'));

test('every e2e file runs in exactly one shard, in its own order', () => {
  for (const n of [1, 2, 3]) {
    const shards = Array.from({ length: n }, (_, i) => shardFiles(FILES, i + 1, n));
    assert.deepEqual([...shards.flat()].sort(), [...FILES].sort(), `${n} shards cover every file once`);
    for (const s of shards) assert.deepEqual(s, FILES.filter((f) => s.includes(f)), 'a shard keeps run.mjs order');
  }
});

test('two shards take about the same time on live', () => {
  const time = (files) => files.reduce((t, f) => t + (LIVE_SECONDS[f] ?? 15), 0);
  const [a, b] = [shardFiles(FILES, 1, 2), shardFiles(FILES, 2, 2)].map(time);
  assert.ok(Math.abs(a - b) <= 20, `${a} s vs ${b} s`);
});

test('every e2e file has a measured live time (a new file: add it to LIVE_SECONDS after its first live run)', () => {
  const missing = FILES.filter((f) => !(f in LIVE_SECONDS));
  assert.deepEqual(missing, []);
});
