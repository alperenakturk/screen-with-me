// Card GT: every game's own texts (the `TEXT` table of a game chunk, `{ en: {…}, tr: {…} }`, kept out of i18n.ts for
// the room page's size budget) have the same keys in English and Turkish, nested tables included. A key missing in
// one language shows up as `undefined` or an English word on a Turkish screen, which no type check catches when the
// code reads it through a string variable. Runs in CI next to the name check:
//   node scripts/check-game-text.mjs [folder or file …]   (default: apps/web/src/games)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const LANGS = ['en', 'tr'];

/** Every .ts file under the given folders / files. */
function files(paths) {
  const out = [];
  for (const p of paths) {
    if (statSync(p).isDirectory()) out.push(...files(readdirSync(p).map((n) => join(p, n))));
    else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

/**
 * The key paths of an object literal starting at `src[start] === '{'` (a small scanner, enough for our tables:
 * strings, template literals, comments, nested objects, arrays and arrow functions). A function body (`=> {`) is
 * skipped; its contents are code, not keys. Returns the paths ("a", "a.b") and the index after the closing brace.
 */
export function objectKeys(src, start) {
  const keys = [];
  const stack = []; // { kind: '{' | '[' | '(' | 'block', path?: string }
  let i = start;
  let expectKey = false;
  const top = () => stack[stack.length - 1];
  const skipString = (q) => {
    i++;
    while (i < src.length && src[i] !== q) {
      if (src[i] === '\\') i++;
      else if (q === '`' && src[i] === '$' && src[i + 1] === '{') {
        // A ${…} inside a template: skip to its matching brace.
        let depth = 1;
        i += 2;
        while (i < src.length && depth) {
          if (src[i] === '{') depth++;
          else if (src[i] === '}') depth--;
          else if (src[i] === "'" || src[i] === '"' || src[i] === '`') skipString(src[i]);
          i++;
        }
        continue;
      }
      i++;
    }
  };
  let lastKey = null;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '/' && src[i + 1] === '/') {
      i = src.indexOf('\n', i);
      if (i < 0) break;
      continue;
    }
    if (ch === '/' && src[i + 1] === '*') {
      i = src.indexOf('*/', i) + 2;
      continue;
    }
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    const inObject = top()?.kind === '{';
    if (expectKey && inObject) {
      // A key: an identifier, a number or a quoted string, then ':' (or a shorthand / method, which our tables don't use).
      const m = /^(?:([A-Za-z_$][\w$]*)|'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|(\d+))\s*:/.exec(src.slice(i));
      expectKey = false;
      if (m) {
        const name = m[1] ?? m[2] ?? m[3] ?? m[4];
        const path = top().path ? `${top().path}.${name}` : name;
        keys.push(path);
        lastKey = path;
        i += m[0].length;
        continue;
      }
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      skipString(ch);
      i++;
      continue;
    }
    if (ch === '{') {
      const before = src.slice(Math.max(0, i - 4), i).trimEnd();
      const block = before.endsWith('=>') || top()?.kind === 'block';
      const parent = top();
      const path = !parent ? '' : parent.kind === '{' ? lastKey : parent.kind === '[' ? `${parent.path}[]` : parent.path;
      stack.push(block ? { kind: 'block' } : { kind: '{', path });
      expectKey = !block;
      i++;
      continue;
    }
    if (ch === '[' || ch === '(') {
      const parent = top();
      stack.push(parent?.kind === 'block' ? { kind: 'block' } : { kind: ch, path: parent?.kind === '{' ? lastKey : parent?.path });
      i++;
      continue;
    }
    if (ch === '}' || ch === ']' || ch === ')') {
      stack.pop();
      i++;
      if (!stack.length) return { keys, end: i };
      continue;
    }
    if (ch === ',' && top()?.kind === '{') expectKey = true;
    i++;
  }
  throw new Error('unclosed object');
}

/** The problems of one file's TEXT table (empty when fine or when it has none). */
export function checkSource(src, name) {
  const at = src.search(/\bconst TEXT\b[^=]*=\s*\{/);
  if (at < 0) return [];
  const open = src.indexOf('{', src.indexOf('=', at));
  const { keys } = objectKeys(src, open);
  const problems = [];
  const byLang = Object.fromEntries(LANGS.map((l) => [l, new Set(keys.filter((k) => k.startsWith(`${l}.`)).map((k) => k.slice(l.length + 1)))]));
  for (const l of LANGS) if (!keys.includes(l)) problems.push(`${name}: TEXT has no "${l}" table`);
  for (const a of LANGS) {
    for (const b of LANGS) {
      if (a === b || !keys.includes(a) || !keys.includes(b)) continue;
      for (const k of byLang[a]) if (!byLang[b].has(k)) problems.push(`${name}: "${k}" is in ${a} but not in ${b}`);
    }
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const targets = process.argv.slice(2);
  const list = files(targets.length ? targets : ['apps/web/src/games']);
  let tables = 0;
  const problems = [];
  for (const f of list) {
    const src = readFileSync(f, 'utf8');
    if (!/\bconst TEXT\b/.test(src)) continue;
    tables++;
    problems.push(...checkSource(src, f));
  }
  if (problems.length) {
    console.log(problems.join('\n'));
    console.log(`\n✗ ${problems.length} text key(s) differ between English and Turkish`);
    process.exit(1);
  }
  console.log(`✓ ${tables} game text tables: English and Turkish have the same keys`);
}
