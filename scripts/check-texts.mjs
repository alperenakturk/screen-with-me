// Every user-facing string has an English and a Turkish version (card MB). Two kinds of text tables are checked:
//   - an object with `en` and `tr` members (`const TEXT = { en: {...}, tr: {...} }` in the lazy chunks, the games,
//     the Test Lab, the home page…; also `Record<'en' | 'tr', …>` tables such as Snack Bar's badges);
//   - an inline pair `{ en: '…', tr: '…' }` (card LABTR: the Test Lab's commands, status lines and step texts), and every
//     lab command (an object with `id`, `tab` and `run`) must give its title, help and tag as such a pair;
//   - a file with two top-level tables `const tr = {...}` and `const en = {...}` (the extension's i18n.ts), or a
//     top-level `en` whose Turkish lives in a sibling `<name>-tr.ts` (the site's i18n.ts + i18n-tr.ts, card PERF1a:
//     the Turkish table is its own chunk).
// Both sides must have the same keys (nested objects too), arrays the same length, and no string may be empty.
// The source is parsed with Vite's own parser (rolldown, oxc), so nothing is run and no file has to follow a type pattern.
//
// The games' own tables (`apps/web/src/games`) are also checked by Game Studio's `scripts/check-game-text.mjs`; this
// one covers everything else (the site's i18n.ts, the lazy chunks, the Test Lab, the extension, shared word lists) and
// reads the games too, as a second look.
//
//   node scripts/check-texts.mjs          (CI; exits 1 on a gap)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseAst } from 'rolldown/parseAst';

const ROOTS = ['apps/web/src', 'apps/extension/src', 'packages/shared/src'];
const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.ts$/.test(name) && !/\.(test|d)\.ts$/.test(name)) files.push(path);
  }
};
ROOTS.forEach(walk);

const problems = [];
let tables = 0;
let strings = 0;
let pairs = 0;
const lineOf = (src, at) => src.slice(0, at).split('\n').length;

/** The expression under `as const`, `satisfies …`, `<T>x`, `x!`. */
function bare(node) {
  while (node && /^TS(As|Satisfies|TypeAssertion|NonNull)Expression$/.test(node.type)) node = node.expression;
  return node;
}
function keyOf(p, src) {
  if (p.computed) return `[${src.slice(p.key.start, p.key.end)}]`;
  return p.key.type === 'Identifier' ? p.key.name : String(p.key.value);
}
function members(obj, src) {
  const map = new Map();
  for (const p of obj.properties) {
    if (p.type === 'SpreadElement') map.set(`...${src.slice(p.argument.start, p.argument.end)}`, p.argument);
    else map.set(keyOf(p, src), p.value);
  }
  return map;
}
const isText = (n) => (n.type === 'Literal' && typeof n.value === 'string') || n.type === 'TemplateLiteral';
const textOf = (n) => (n.type === 'Literal' ? n.value : n.quasis.map((q) => q.value.cooked).join('x'));
/** Compares two text trees; `where` names the path for the report. */
function compare(en, tr, where, src) {
  const a = bare(en);
  const b = bare(tr);
  if (a.type === 'ObjectExpression' && b.type === 'ObjectExpression') {
    const ma = members(a, src);
    const mb = members(b, src);
    for (const [k, v] of ma) {
      if (!mb.has(k)) problems.push(`${where}.${k}: no Turkish text`);
      else compare(v, mb.get(k), `${where}.${k}`, src);
    }
    for (const k of mb.keys()) if (!ma.has(k)) problems.push(`${where}.${k}: no English text`);
    return;
  }
  if (a.type === 'ArrayExpression' && b.type === 'ArrayExpression') {
    if (a.elements.length !== b.elements.length) problems.push(`${where}: ${a.elements.length} English items, ${b.elements.length} Turkish`);
    a.elements.forEach((e, i) => e && b.elements[i] && compare(e, b.elements[i], `${where}[${i}]`, src));
    return;
  }
  const shape = (n) => (n.type === 'ObjectExpression' || n.type === 'ArrayExpression' ? n.type : 'value');
  if (shape(a) !== shape(b)) {
    problems.push(`${where}: English and Turkish have different shapes`);
    return;
  }
  if (isText(a)) strings++;
  const blank = (n) => isText(n) && textOf(n).trim() === '';
  // Both blank = on purpose (a slot that shows nothing); one blank = a missing translation.
  if (blank(a) && !blank(b)) problems.push(`${where}: empty English text`);
  if (blank(b) && !blank(a)) problems.push(`${where}: empty Turkish text`);
  if (process.env.SAME && isText(a) && isText(b) && textOf(a) === textOf(b) && /[a-z]{4}/i.test(textOf(a))) console.log(`same: ${where} ${JSON.stringify(textOf(a))}`);
}

function visit(node, fn) {
  if (!node || typeof node.type !== 'string') return;
  fn(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach((v) => v && typeof v === 'object' && visit(v, fn));
    else if (value && typeof value === 'object' && typeof value.type === 'string') visit(value, fn);
  }
}

/** Top-level `en` tables waiting for their Turkish in a sibling `-tr.ts` file, and those files' `tr` tables. */
const loneEn = new Map();
const siblingTr = new Map();

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  if (!/\btr\b/.test(src) || !/\ben\b/.test(src)) continue;
  const ast = parseAst(src, { lang: 'ts' });
  const name = relative(process.cwd(), file);
  const top = new Map();
  for (const stmt of ast.body) {
    const decl = stmt.type === 'ExportNamedDeclaration' ? stmt.declaration : stmt;
    if (decl?.type !== 'VariableDeclaration') continue;
    for (const d of decl.declarations) {
      const init = d.init && bare(d.init);
      if (d.id.type === 'Identifier' && ['en', 'tr'].includes(d.id.name) && init?.type === 'ObjectExpression') top.set(d.id.name, init);
    }
  }
  visit(ast, (node) => {
    // LABTR: an inline pair `{ en: '…', tr: '…' }` (the Test Lab's commands and status lines) needs both texts.
    if (node.type === 'ObjectExpression' && node.properties.length === 2) {
      const m = members(node, src);
      if (m.has('en') && m.has('tr') && isText(m.get('en')) && isText(m.get('tr'))) {
        pairs++;
        compare(m.get('en'), m.get('tr'), `${name}:${lineOf(src, node.start)}`, src);
      }
    }
    // LABTR: a Test Lab command (an object with `id`, `tab` and `run`) says its title, help and tag in both languages.
    if (node.type === 'ObjectExpression') {
      const m = members(node, src);
      if (m.has('id') && m.has('tab') && m.has('run')) {
        for (const key of ['title', 'help', 'where']) {
          const v = m.get(key) && bare(m.get(key));
          if (v && isText(v)) problems.push(`${name}:${lineOf(src, v.start)} lab command ${key}: no Turkish text (write { en, tr })`);
        }
      }
    }
    if (node.type !== 'VariableDeclarator' || !node.init) return;
    const init = bare(node.init);
    if (init.type !== 'ObjectExpression') return;
    const m = members(init, src);
    if (m.has('en') && m.has('tr')) {
      tables++;
      compare(m.get('en'), m.get('tr'), `${name} ${src.slice(node.id.start, node.id.end).split(':')[0]}`, src);
    }
  });
  if (top.has('en') && top.has('tr')) {
    tables++;
    compare(top.get('en'), top.get('tr'), name, src);
  } else if (top.has('en')) loneEn.set(file.replace(/\.ts$/, ''), { node: top.get('en'), name, src });
  else if (top.has('tr') && /-tr\.ts$/.test(file)) siblingTr.set(file.replace(/-tr\.ts$/, ''), top.get('tr'));
}
for (const [base, en] of loneEn) {
  const tr = siblingTr.get(base);
  if (!tr) continue;
  tables++;
  compare(en.node, tr, `${en.name} + ${relative(process.cwd(), `${base}-tr.ts`)}`, en.src);
}
for (const base of siblingTr.keys()) {
  if (!loneEn.has(base)) problems.push(`${relative(process.cwd(), `${base}-tr.ts`)}: a Turkish table without its English one`);
}

if (problems.length) {
  console.error(`✗ ${problems.length} text(s) without both languages:`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
if (tables < 10) {
  console.error(`✗ only ${tables} text tables found: the check no longer sees the code`);
  process.exit(1);
}
console.log(`✓ ${tables} text tables and ${pairs} inline pairs, ${strings} strings, each in English and Turkish`);
