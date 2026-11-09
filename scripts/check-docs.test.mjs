// node --test scripts/check-docs.test.mjs — the CLAUDE.md size and "nothing lost" check (scripts/check-docs.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { identifiersOf, missingIdentifiers, sizeProblem, MAX_BYTES } from './check-docs.mjs';

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
