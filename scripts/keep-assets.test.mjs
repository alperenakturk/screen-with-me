// node --test scripts/keep-assets.test.mjs — card GR1: earlier builds' assets stay for open tabs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assetNames, planKept } from './keep-assets.mjs';

const now = Date.UTC(2026, 10, 16, 12);
const DAY = 86_400_000;

test("the live build's files the new build lacks are kept from now on", () => {
  const kept = planKept({ liveBuild: ['room-AAAAAAAA.js', 'gallery-BBBBBBBB.js'], newBuild: ['room-AAAAAAAA.js', 'gallery-CCCCCCCC.js'], now });
  assert.deepEqual(kept, { 'gallery-BBBBBBBB.js': new Date(now).toISOString() });
});

test('older kept files stay for 7 days, then go; one the new build has again is not "kept"', () => {
  const liveKept = {
    'sea-DDDDDDDD.js': new Date(now - 2 * DAY).toISOString(),
    'quiz-EEEEEEEE.js': new Date(now - 8 * DAY).toISOString(),
    'duel-FFFFFFFF.js': new Date(now - 1 * DAY).toISOString(),
  };
  const kept = planKept({ liveBuild: [], liveKept, newBuild: ['duel-FFFFFFFF.js'], now });
  assert.deepEqual(Object.keys(kept), ['sea-DDDDDDDD.js']);
  assert.equal(kept['sea-DDDDDDDD.js'], liveKept['sea-DDDDDDDD.js'], 'keeps its first replaced time');
});

test('asset names in a page and in a chunk (both Vite forms)', () => {
  const html = '<script type="module" src="/assets/index-C7La95Aa.js"></script><link href="/assets/index-CpE9gHIt.css">';
  const chunk = 'import("./gallery-CLTdYarp.js");const d=["assets/sea-NI9oqF9B.js","assets/sea-DIMKOMeQ.css"]';
  assert.deepEqual(assetNames(html), ['index-C7La95Aa.js', 'index-CpE9gHIt.css']);
  assert.deepEqual(assetNames(chunk), ['gallery-CLTdYarp.js', 'sea-NI9oqF9B.js', 'sea-DIMKOMeQ.css']);
});
