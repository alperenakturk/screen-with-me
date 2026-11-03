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
// 145 since 0.9.96.5 (the Planner's rule: the first PR that crosses 140 raises it to 145 and says why; above 145, ask
// the Planner). The side games, the gallery, move-to-device and podcasts each left a small entry in the room page
// (their own code is in lazy chunks); podcasts crossed 140.
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
