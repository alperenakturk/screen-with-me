// ART-S (Design, 11 Nov 2026): the screens where scene art meets the UI. Home, join card and room in the scene themes
// at 1366, 1920 and tablet; the Sea Battle lobby in dark themes; Window Garden in Matinee.
//   npm run dev ; NODE_PATH=$(npm root -g) node docs/internal/design/art-s/shots.cjs <site> <out> [themes] [extra.css]
const { chromium } = require('playwright');
const fs = require('fs');
const [SITE = 'http://localhost:5173', OUT = '/tmp/art-s', THEMES = 'sinema,lokum', CSS] = process.argv.slice(2);
const css = CSS ? fs.readFileSync(CSS, 'utf8') : '';
fs.mkdirSync(OUT, { recursive: true });
const SIZES = { '1366': { width: 1366, height: 768 }, '1920': { width: 1920, height: 1080 }, 'tab-p': { width: 820, height: 1180 }, 'tab-l': { width: 1180, height: 820 } };
const rid = () => `arts${Math.random().toString(36).slice(2, 7)}`;
async function join(p) {
  await p.waitForSelector('#name'); await p.fill('#name', 'Alex'); await p.click('#name-form button.primary');
  await p.waitForSelector('.room'); await p.waitForTimeout(3800);
  await p.evaluate(() => document.querySelectorAll('.intro, .first-tip').forEach((e) => e.remove()));
}
async function hall(p) { await p.evaluate(() => (document.querySelector('#more-game') || document.querySelector('#dock-game'))?.click()); await p.waitForTimeout(1500); }
const SCREENS = {
  home: ['/', (p) => p.waitForTimeout(1800)],
  join: [null, (p) => p.waitForSelector('#name').then(() => p.waitForTimeout(1200))],
  room: [null, join],
  sea: [null, async (p) => { await join(p); await hall(p); await p.evaluate(() => [...document.querySelectorAll('.hub-game')].find((t) => /sea/i.test(t.textContent))?.click()); await p.waitForTimeout(2500); }],
  garden: [null, async (p) => { await join(p); await hall(p); await p.evaluate(() => [...document.querySelectorAll('.hub-tab')].find((t) => /side/i.test(t.textContent))?.click()); await p.waitForTimeout(400); await p.evaluate(() => [...document.querySelectorAll('.hub-side')].find((t) => /garden/i.test(t.textContent))?.click()); await p.waitForTimeout(2500); await p.evaluate(() => document.querySelectorAll('.htp-skip, [data-act="skip"]').forEach((b) => b.click())); await p.waitForTimeout(600); }],
};
const PLAN = (process.env.PLAN || 'home:1366,1920,tab-p,tab-l;join:1366,1920,tab-p;room:1366,1920,tab-l').split(';').map((x) => { const [s, z] = x.split(':'); return [s, z.split(',')]; });
(async () => {
  const b = await chromium.launch();
  for (const theme of THEMES.split(',')) for (const [screen, sizes] of PLAN) for (const size of sizes) {
    const ctx = await b.newContext({ viewport: SIZES[size] });
    await ctx.addInitScript((th) => { localStorage.setItem('lang', 'en'); localStorage.setItem('theme', th); localStorage.setItem('tipsSeen', '1'); localStorage.setItem('opt:autoInvite', '0'); }, theme);
    if (css) await ctx.addInitScript((c) => { const add = () => { const s = document.createElement('style'); s.textContent = c; document.head.append(s); }; document.head ? add() : document.addEventListener('DOMContentLoaded', add); }, css);
    const p = await ctx.newPage();
    const [path, prep] = SCREENS[screen];
    try { await p.goto(SITE + (path ?? `/r/${rid()}`)); await prep(p); await p.screenshot({ path: `${OUT}/${theme}-${screen}-${size}.png` }); }
    catch (e) { console.log('ERR', theme, screen, size, e.message.split('\n')[0]); }
    await ctx.close();
  }
  await b.close(); console.log('done');
})();
