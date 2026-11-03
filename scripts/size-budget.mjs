// Size budget for what a phone downloads to open a room (phone speed, 0.9.93.6): the site's entry script and
// stylesheet plus everything the room page imports statically, gzipped. Chunks loaded later (games, recap, invite
// window, TV, image tools) are not counted. Run after `npm run build`; fails when a budget is exceeded, so a change that
// makes the room heavier has to raise the budget on purpose.
//   node scripts/size-budget.mjs [apps/web/dist]
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = process.argv[2] ?? 'apps/web/dist';
const assets = join(dist, 'assets');
// Budgets in kB (gzip). Measured 2 Nov 2026 after the lazy split: JS 135.6, CSS 35.0.
// JS raised to 145 by card T (tablets, 3 Nov 2026; the Planner's rule): the upright-tablet check has to run before the
// room lays out (device.ts), and the split chat / tabs and the game placement live in modules the room loads anyway,
// so JS reached 140.1. The tablet styles themselves are a lazy stylesheet (tablet.css) and are not counted.
const BUDGET = { js: 145, css: 37 };

const gz = (file) => gzipSync(readFileSync(join(assets, file))).length / 1024;
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const entry = html.match(/src="\/assets\/([^"]+\.js)"/)?.[1];
const css = [...html.matchAll(/href="\/assets\/([^"]+\.css)"/g)].map((m) => m[1]);
const room = readdirSync(assets).find((f) => /^room-[\w-]+\.js$/.test(f) && !f.startsWith('room-id'));
if (!entry || !room) throw new Error('entry or room chunk not found');

// Static imports only (`from"./x.js"` / `import"./x.js"`); dynamic `import("./x.js")` chunks load later.
const seen = new Set();
function walk(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const code = readFileSync(join(assets, file), 'utf8');
  for (const m of code.matchAll(/(?:from|import)\s*"\.\/([\w.-]+\.js)"/g)) walk(m[1]);
}
walk(entry);
walk(room);

const js = [...seen].reduce((sum, f) => sum + gz(f), 0);
const cssSize = css.reduce((sum, f) => sum + gz(f), 0);
console.log(`Room page, gzipped: JS ${js.toFixed(1)} kB (${seen.size} files, budget ${BUDGET.js}) · CSS ${cssSize.toFixed(1)} kB (budget ${BUDGET.css})`);
for (const f of [...seen].sort((a, b) => gz(b) - gz(a))) console.log(`  ${gz(f).toFixed(1).padStart(6)} kB  ${f}`);
const over = [js > BUDGET.js && `JS ${js.toFixed(1)} > ${BUDGET.js}`, cssSize > BUDGET.css && `CSS ${cssSize.toFixed(1)} > ${BUDGET.css}`].filter(Boolean);
if (over.length) {
  console.error(`✗ Over the room page budget: ${over.join(', ')}`);
  process.exit(1);
}
console.log('✓ Room page within its budget');
