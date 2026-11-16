// node --test scripts/release.test.mjs — card CI3b: CI numbers every release; notes from changelog/next/; the PR check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyVersion, nextVersion, parseSeries, shownVersions } from './release-version.mjs';
import { block, compareVersions, foldedVersions, insertBlocks, isFragment, shortDate } from './changelog.mjs';
import { violations } from './check-version-edits.mjs';

const footer = (v) => `<footer><span class="footer-version">v${v}</span></footer>`;
const ext = (v) => `${JSON.stringify({ name: '@swm/extension', private: true, version: v }, null, 2)}\n`;

test('the next number: the highest tag of the series + 1; another series starts at .1', () => {
  const tags = ['v0.9.97.139', 'v0.9.97.140', 'v0.9.96.12', 'v0.9.97.99', 'notes', 'v0.9.97.140-rc'];
  assert.equal(nextVersion(tags, '0.9.97'), '0.9.97.141');
  assert.equal(nextVersion(tags, '0.9.98'), '0.9.98.1', 'the owner moved the third part');
  assert.equal(nextVersion([], '0.9.97'), '0.9.97.1');
});

test('a failed live e2e burns no number: no tag, so the next run gets the same one', () => {
  const tags = ['v0.9.97.140'];
  assert.equal(nextVersion(tags, '0.9.97'), '0.9.97.141');
  assert.equal(nextVersion(tags, '0.9.97'), '0.9.97.141', 'the run after a red live e2e: the same number again');
  assert.equal(nextVersion([...tags, 'v0.9.97.141'], '0.9.97'), '0.9.97.142');
});

test('release-series.txt: three numeric parts only', () => {
  assert.equal(parseSeries('0.9.97\n'), '0.9.97');
  assert.throws(() => parseSeries('0.9.97.1'));
  assert.throws(() => parseSeries('next'));
});

test('applying a number writes the same one into the footer and the extension', () => {
  const out = applyVersion({ footer: footer('0.9.97.140'), extension: ext('0.9.97.140') }, '0.9.97.141');
  assert.deepEqual(shownVersions(out), { footer: '0.9.97.141', extension: '0.9.97.141' });
  assert.match(out.extension, /^\{\n {2}"name"/, 'the file keeps its two-space form');
  assert.throws(() => applyVersion({ footer: '<footer></footer>', extension: ext('1') }, '2'));
});

test('the PR check: a version set by hand fails, a fold of tagged versions passes', () => {
  const same = { footer: footer('0.9.97.140'), extension: ext('0.9.97.140') };
  const tagged = new Set(['0.9.97.140', '0.9.97.141']);
  assert.deepEqual(violations({ base: same, head: same, addedChangelogLines: ['- a line'], tagged }), []);
  const bumped = { footer: footer('0.9.97.142'), extension: ext('0.9.97.142') };
  assert.equal(violations({ base: same, head: bumped, addedChangelogLines: [], tagged }).length, 2);
  assert.match(violations({ base: same, head: same, addedChangelogLines: ['### 0.9.97.142 — 16 Nov'], tagged })[0], /not tagged yet/);
  assert.deepEqual(violations({ base: same, head: same, addedChangelogLines: ['### 0.9.97.141 — 16 Nov'], tagged }), [], 'a fold');
  const split = { footer: footer('0.9.97.140'), extension: ext('0.9.97.139') };
  assert.ok(violations({ base: split, head: split, addedChangelogLines: [], tagged }).some((v) => /different numbers/.test(v)));
});

test('notes: fragments only (not the README), one readable block per release', () => {
  assert.equal(isFragment('changelog/next/claude-st2.md'), true);
  assert.equal(isFragment('changelog/next/README.md'), false);
  assert.equal(isFragment('docs/x.md'), false);
  assert.equal(shortDate('2026-11-16T11:41:30+03:00'), '16 Nov');
  assert.equal(block('0.9.97.141', '16 Nov', ['- One.\n', '- Two.']), '### 0.9.97.141 — 16 Nov\n\n- One.\n- Two.\n');
  assert.match(block('0.9.97.142', '17 Nov', []), /behind the scenes/);
});

test('fold: blocks go above the newest one, newest first; the versions already there are known', () => {
  const log = '# Changelog\n\nIntro.\n\n## 0.9.97\n\nText.\n\n### 0.9.97.140 — 15 Nov\n\n- Old.\n';
  assert.deepEqual([...foldedVersions(log)], ['0.9.97.140']);
  const out = insertBlocks(log, [block('0.9.97.142', '17 Nov', ['- B.']), block('0.9.97.141', '16 Nov', ['- A.'])]);
  assert.ok(out.indexOf('0.9.97.142') < out.indexOf('0.9.97.141') && out.indexOf('0.9.97.141') < out.indexOf('0.9.97.140'));
  assert.equal(insertBlocks(log, []), log);
  assert.ok(compareVersions('0.9.97.100', '0.9.97.99') > 0);
});
