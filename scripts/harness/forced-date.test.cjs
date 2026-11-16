// node --test scripts/harness/forced-date.test.cjs — card CI3: the date sweep's clock shift.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { shiftMs } = require('./forced-date.cjs');

const DAY = 86_400_000;
const now = Date.UTC(2026, 10, 16, 9);

test('nothing set: no shift', () => {
  assert.equal(shiftMs({}, now), 0);
});

test('a fixed date: noon UTC that day', () => {
  assert.equal(shiftMs({ SWM_TEST_DATE: '2026-12-24' }, now), Date.UTC(2026, 11, 24, 12) - now);
});

test('days ahead, and the sweep: 1–60 days from the run number, the same sum as the date-sweep issue', () => {
  assert.equal(shiftMs({ SWM_TEST_DAYS: '3' }, now), 3 * DAY);
  for (const n of [0, 1, 9, 123, 4567]) {
    const days = shiftMs({ SWM_TEST_DAYS: 'sweep', GITHUB_RUN_NUMBER: String(n) }, now) / DAY;
    assert.equal(days, 1 + ((n * 7) % 60));
    assert.ok(days >= 1 && days <= 60);
  }
});
