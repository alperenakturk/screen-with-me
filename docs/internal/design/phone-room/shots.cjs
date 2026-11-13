// PH1 (Design, 13 Nov 2026): today's phone room, every state the card touches, in a few themes and both languages.
//   npm run dev ; a video at <video url> ; NODE_PATH=$(npm root -g) node docs/internal/design/phone-room/shots.cjs <site> <video> <out> [themes] [langs] [extra.css]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const [SITE = 'http://localhost:5173', VIDEO = 'http://localhost:5300/video.webm', OUT = '/tmp/ph1', THEMES = 'gece,matinee,sinema', LANGS = 'en,tr', CSS] = process.argv.slice(2);
const css = CSS ? fs.readFileSync(CSS, 'utf8') : '';
fs.mkdirSync(OUT, { recursive: true });
const rid = () => `ph${Math.random().toString(36).slice(2, 7)}`;
const up = devices['iPhone 13'], side = devices['iPhone 13 landscape'];
async function join(p) {
  await p.waitForSelector('#name'); await p.fill('#name', 'Alex'); await p.click('#name-form button[type=submit], #name-form button.primary');
  await p.waitForSelector('.room'); await p.waitForTimeout(3800);
  await p.evaluate(() => document.querySelectorAll('.intro, .first-tip, .hint-bubble').forEach((e) => e.remove()));
}
async function play(p) { await p.evaluate((v) => { const i = document.querySelector('#media-input'); i.value = v; i.form.requestSubmit(); }, VIDEO); await p.waitForTimeout(3000); }
const click = (sel) => (p) => p.evaluate((s) => document.querySelector(s)?.click(), sel).then(() => p.waitForTimeout(700));
const STATES = {
  home: [up, '/', (p) => p.waitForTimeout(1500)],
  join: [up, null, (p) => p.waitForSelector('#name').then(() => p.waitForTimeout(900))],
  empty: [up, null, join],
  playing: [up, null, async (p) => { await join(p); await play(p); }],
  plus: [up, null, async (p) => { await join(p); await play(p); await click('#chat-plus')(p); }],
  more: [up, null, async (p) => { await join(p); await click('#strip-more')(p); }],
  add: [up, null, async (p) => { await join(p); await play(p); await p.evaluate(() => document.querySelector('#chat-plus')?.click()); await p.waitForTimeout(500); await p.evaluate(() => document.querySelector('.ph-sheet .ph-tile')?.click()); await p.waitForTimeout(800); }],
  sideways: [side, null, async (p) => { await join(p); await play(p); }],
};
const PLAN = (process.env.STATES || Object.keys(STATES).join(',')).split(',');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const theme of THEMES.split(',')) for (const lang of LANGS.split(',')) for (const st of PLAN) {
    const [dev, path, prep] = STATES[st];
    const ctx = await b.newContext({ ...dev });
    await ctx.addInitScript(([l, th]) => { localStorage.setItem('lang', l); localStorage.setItem('theme', th); localStorage.setItem('tipsSeen', '1'); localStorage.setItem('opt:autoInvite', '0'); }, [lang, theme]);
    if (css) await ctx.addInitScript((c) => { const add = () => { const s = document.createElement('style'); s.textContent = c; document.head.append(s); }; document.head ? add() : document.addEventListener('DOMContentLoaded', add); }, css);
    const p = await ctx.newPage();
    try { await p.goto(SITE + (path ?? `/r/${rid()}`)); await prep(p); await p.screenshot({ path: `${OUT}/${theme}-${lang}-${st}.png` }); }
    catch (e) { console.log('ERR', theme, lang, st, e.message.split('\n')[0]); }
    await ctx.close();
  }
  await b.close(); console.log('done');
})();
