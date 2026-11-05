// node --test scripts/check-game-text.test.mjs — the games' EN / TR text key check (scripts/check-game-text.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSource } from './check-game-text.mjs';

const table = (en, tr) => `import x from './y';\nconst TEXT = {\n  en: ${en},\n  tr: ${tr},\n} as const;\nconst other = { z: 1 };\n`;

test('the same keys pass, whatever the values look like', () => {
  const en = `{ a: 'A, b: c', 'hub.tab': "x", n: 3, f: (n: number) => \`\${n} {left}\`, g: (s) => { const q = { no: 1 }; return s; }, list: ['x', 'y'], nest: { deep: 'd' }, rows: [{ k: 'v' }] }`;
  const tr = `{ a: 'A', 'hub.tab': 'y', n: 4, f: (n: number) => \`\${n} kaldı\`, g: (s) => s, list: ['x'], nest: { deep: 'ç' }, rows: [{ k: 'w' }] }`;
  assert.deepEqual(checkSource(table(en, tr), 'ok.ts'), []);
});

test('a key missing in Turkish is reported, top level and nested', () => {
  const problems = checkSource(table(`{ a: 'A', b: 'B', nest: { deep: 'd', more: 'm' } }`, `{ a: 'A', nest: { deep: 'd' } }`), 'bad.ts');
  assert.deepEqual(problems, ['bad.ts: "b" is in en but not in tr', 'bad.ts: "nest.more" is in en but not in tr']);
});

test('a key only in Turkish is reported too', () => {
  assert.deepEqual(checkSource(table(`{ a: 'A' }`, `{ a: 'A', extra: 'E' }`), 'x.ts'), ['x.ts: "extra" is in tr but not in en']);
});

test('a missing language and a file without TEXT', () => {
  assert.deepEqual(checkSource(`const TEXT = { en: { a: 1 } };`, 'one.ts'), ['one.ts: TEXT has no "tr" table']);
  assert.deepEqual(checkSource(`const t = 1;`, 'none.ts'), []);
});
