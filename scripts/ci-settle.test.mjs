// node --test scripts/ci-settle.test.mjs — card CI3: main's run waits for a quiet main, or gives way to a newer merge.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { settle } from './ci-settle.mjs';

const at = (s) => new Date(Date.UTC(2026, 10, 16, 9, 0, s)).toISOString();
const now = Date.parse(at(0)) + 60_000;

test('the head is this commit, pushed long enough ago: go', () => {
  assert.deepEqual(settle({ headSha: 'a', headDate: at(0), mySha: 'a', now: now + 60_000, settleMs: 120_000 }), { action: 'go' });
});

test('the head is this commit, pushed just now: wait, at most 15 s at a time', () => {
  assert.deepEqual(settle({ headSha: 'a', headDate: at(0), mySha: 'a', now, settleMs: 120_000 }), { action: 'wait', ms: 15_000 });
  assert.deepEqual(settle({ headSha: 'a', headDate: at(0), mySha: 'a', now: now + 55_000, settleMs: 120_000 }), { action: 'wait', ms: 5_000 });
});

test('main moved on: this run gives way to the newer one', () => {
  assert.deepEqual(settle({ headSha: 'b', headDate: at(30), mySha: 'a', now, settleMs: 120_000 }), { action: 'superseded' });
});

test('no answer from the API, or no date: go (never a lost deploy)', () => {
  assert.deepEqual(settle({ mySha: 'a', now }), { action: 'go' });
  assert.deepEqual(settle({ headSha: 'a', headDate: undefined, mySha: 'a', now }), { action: 'go' });
});
