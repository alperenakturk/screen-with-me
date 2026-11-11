// node --test scripts/check-docs.test.mjs — the CLAUDE.md size and "nothing lost" check (scripts/check-docs.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { headingsOf, identifiersOf, missingHeadings, missingIdentifiers, sizeProblem, MAX_BYTES, WATCHED } from './check-docs.mjs';

test('the size limit is 30 KB and only a larger file fails', () => {
  assert.equal(MAX_BYTES, 30 * 1024);
  assert.equal(sizeProblem(MAX_BYTES), null);
  assert.match(sizeProblem(MAX_BYTES + 1), /over the 30720-byte limit/);
});

test('inline code spans are found once each, fenced blocks are skipped', () => {
  const md = 'Use `room.css` and `GameSocket`, again `room.css`.\n```bash\nnpm run `dev`\n```\nThen ` GHOST_MS `.';
  assert.deepEqual(identifiersOf(md), ['room.css', 'GameSocket', 'GHOST_MS']);
});

test('an identifier missing from every text is reported, one found anywhere is not', () => {
  const old = '`a.ts` `b.ts` `C_MAX`';
  assert.deepEqual(missingIdentifiers(old, ['see a.ts', 'C_MAX = 3']), ['b.ts']);
  assert.deepEqual(missingIdentifiers(old, ['a.ts b.ts C_MAX']), []);
});

test('STATUS.md and CARDS.md are watched too, and a message names the file', () => {
  assert.deepEqual(WATCHED.map((w) => w.file), ['CLAUDE.md', 'docs/internal/STATUS.md', 'docs/internal/CARDS.md']);
  assert.match(sizeProblem(40000, 30 * 1024, 'docs/internal/CARDS.md'), /^docs\/internal\/CARDS\.md is 40000 bytes/);
});

test('card headings outside fences are found; one that is no longer a whole line anywhere is reported', () => {
  const old = '## Ready\n### QA1. Faster CI\n- Why: x\n```\n### <short title>\n```\n### R4-6. Hygiene\n';
  assert.deepEqual(headingsOf(old), ['### QA1. Faster CI', '### R4-6. Hygiene']);
  assert.deepEqual(missingHeadings(old, ['### QA1. Faster CI\n', 'see ### R4-6. Hygiene inline']), ['### R4-6. Hygiene']);
  assert.deepEqual(missingHeadings(old, ['### QA1. Faster CI', 'archive\n  ### R4-6. Hygiene  \n']), []);
});
