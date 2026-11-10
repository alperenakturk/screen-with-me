// MATINEE2 (Design, 10 Nov 2026): every room state in the Matinee theme, at 1366 × 768 and on a phone, optionally with
// an override stylesheet (the proposal) injected, so "before" and "after" come from the same live site.
//   npm run dev ; a video at <video url> (e.g. ffmpeg testsrc2 → video.webm, python3 -m http.server 5300)
//   [ONLY=room-empty,settings] NODE_PATH=$(npm root -g) node docs/internal/design/themes-2/matinee2/shots.cjs <site> <video url> <out> [override.css]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const [SITE = 'http://localhost:5173', VIDEO = 'http://localhost:5300/video.webm', OUT = '/tmp/matinee2', CSS] = process.argv.slice(2);
const css = CSS ? fs.readFileSync(CSS, 'utf8') : '';
fs.mkdirSync(OUT, { recursive: true });
const rid = () => `mt${Math.random().toString(36).slice(2, 7)}`;
async function join(p) {
  await p.waitForSelector('#name');
  await p.fill('#name', 'Alex');
  await p.click('#name-form button.primary');
  await p.waitForSelector('.room');
  await p.waitForTimeout(3800);
  await p.evaluate(() => document.querySelectorAll('.intro, .first-tip').forEach((e) => e.remove()));
}
async function play(p) {
  await p.evaluate((v) => { const i = document.querySelector('#media-input'); i.value = v; i.form.requestSubmit(); }, VIDEO);
  await p.waitForTimeout(3500);
}
async function hall(p) { await p.evaluate(() => (document.querySelector('#more-game') || document.querySelector('#dock-game'))?.click()); await p.waitForTimeout(1500); }
const DESK = [
  ['home', '/', async (p) => p.waitForTimeout(1500)],
  ['room-empty', null, join],
  ['room-playing', null, async (p) => { await join(p); await play(p); }],
  ['room-playing-side-closed', null, async (p) => { await join(p); await play(p); await p.evaluate(() => document.querySelector('#side-toggle')?.click()); await p.waitForTimeout(800); }],
  ['room-fullscreen', null, async (p) => { await join(p); await play(p); await p.evaluate(() => document.querySelector('.theater')?.classList.add('fake-fs')); await p.mouse.move(600, 400); await p.waitForTimeout(800); }],
  ['games-hall', null, async (p) => { await join(p); await hall(p); }],
  ['game-video-place', null, async (p) => { await join(p); await hall(p); await p.locator('.hub-game', { hasText: 'Classics' }).click(); await p.waitForTimeout(2500); }],
  ['game-free-window', null, async (p) => { await join(p); await hall(p); await p.evaluate(() => [...document.querySelectorAll('.hub-tab')].find((t) => /side/i.test(t.textContent))?.click()); await p.waitForTimeout(500); await p.evaluate(() => [...document.querySelectorAll('.hub-side')].find((t) => /snack/i.test(t.textContent))?.click()); await p.waitForTimeout(2500); await p.evaluate(() => document.querySelector('.game-place-btn.place-float')?.click()); await p.waitForTimeout(1200); }],
  ['settings', null, async (p) => { await join(p); await p.click('#settings-open'); await p.waitForTimeout(800); }],
  ['invite', null, async (p) => { await join(p); await p.click('#invite-btn'); await p.waitForTimeout(900); }],
];
const PHONE = [
  ['phone-room-empty', join],
  ['phone-room-playing', async (p) => { await join(p); await play(p); }],
  ['phone-game', async (p) => { await join(p); await hall(p); await p.locator('.hub-game', { hasText: 'Classics' }).click(); await p.waitForTimeout(2500); }],
  ['phone-settings', async (p) => { await join(p); await p.evaluate(() => (document.querySelector('#settings-open') || document.querySelector('#strip-more'))?.click()); await p.waitForTimeout(800); }],
];
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const run = async (name, opts, path, prep) => {
    const ctx = await b.newContext(opts);
    await ctx.addInitScript(() => { localStorage.setItem('lang', 'en'); localStorage.setItem('theme', 'matinee'); localStorage.setItem('tipsSeen', '1'); localStorage.setItem('opt:autoInvite', '0'); });
    if (css) await ctx.addInitScript((c) => { const add = () => { const s = document.createElement('style'); s.id = 'matinee2'; s.textContent = c; document.head.append(s); }; document.head ? add() : document.addEventListener('DOMContentLoaded', add); }, css);
    const p = await ctx.newPage();
    try { await p.goto(SITE + (path ?? `/r/${rid()}`)); await prep(p); await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('✓', name); }
    catch (e) { console.log('ERR', name, e.message.split('\n')[0]); }
    await ctx.close();
  };
  for (const [name, path, prep] of DESK.filter(([n]) => !process.env.ONLY || process.env.ONLY.split(',').includes(n))) await run(name, { viewport: { width: 1366, height: 768 } }, path, prep);
  for (const [name, prep] of PHONE.filter(([n]) => !process.env.ONLY || process.env.ONLY.split(',').includes(n))) await run(name, { ...devices['iPhone 13'] }, null, prep);
  await b.close();
})();
