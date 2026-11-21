// Renders the SB2 ship-theme previews (one board per theme) to PNGs beside this file.
// Run: node --experimental-strip-types docs/internal/design/games/sea-ships/render.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(`${process.env.NODE_PATH ?? process.cwd()}/`)('playwright');
import { writeFileSync } from 'node:fs';
import { SEA_THEMES, shipSvg } from '../../../../../apps/web/src/games/sea-ships.ts';

const here = new URL('.', import.meta.url).pathname;
const fleet = [[5, 1, 1, false], [4, 3, 7, true], [3, 6, 0, false], [3, 8, 4, false], [2, 1, 8, false]];
const names = { navy: 'Navy', pirate: 'Pirates', toys: 'Bath toys' };
const board = (theme) => {
  const cell = 46;
  const ships = fleet.map(([len, r, c, down]) => {
    const w = down ? cell : len * cell;
    const h = down ? len * cell : cell;
    const inner = `<div style="position:absolute;left:0;top:0;width:${len * cell}px;height:${cell}px;${down ? `transform-origin:0 0;transform:rotate(90deg) translateY(-100%)` : ''}">${shipSvg(theme, len)}</div>`;
    return `<div style="position:absolute;left:${c * cell}px;top:${r * cell}px;width:${w}px;height:${h}px">${inner}</div>`;
  }).join('');
  const marks = `<div class="m miss" style="left:${3 * cell}px;top:${0}px"></div><div class="m hit" style="left:${3 * cell}px;top:${1 * cell}px">✸</div>`;
  return `<figure><figcaption>${names[theme]}</figcaption><div class="b">${ships}${marks}</div></figure>`;
};
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#0a1230;font:700 20px system-ui;color:#ffe7a8;display:flex;gap:28px;padding:24px}
figure{margin:0}figcaption{margin-bottom:8px}
.b{position:relative;width:460px;height:460px;border-radius:12px;background:radial-gradient(circle at 30% 20%,#11225a,#0d1b46);
background-image:linear-gradient(rgb(255 231 168/.14) 1px,transparent 1px),linear-gradient(90deg,rgb(255 231 168/.14) 1px,transparent 1px),radial-gradient(circle at 30% 20%,#11225a,#0d1b46);background-size:46px 46px,46px 46px,auto}
svg{width:100%;height:100%;display:block}
.m{position:absolute;width:46px;height:46px;display:grid;place-items:center;color:#ffc65a;font-size:24px}
.miss::before{content:'';width:15px;height:15px;border-radius:50%;border:2px solid rgb(255 243 214/.65)}
</style>${SEA_THEMES.map(board).join('')}`;
writeFileSync(`${here}preview.html`, html);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1520, height: 560 }, deviceScaleFactor: 1 });
await page.setContent(html);
await page.screenshot({ path: `${here}themes.png` });
for (const [i, t] of SEA_THEMES.entries()) await page.locator('figure').nth(i).screenshot({ path: `${here}${t}.png` });
await browser.close();
