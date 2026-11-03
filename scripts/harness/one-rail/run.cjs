// One rail everywhere on a computer (card 2, owner): the empty room, a video file and the sync test get the same right
// rail as YouTube, never the old toolbar under the video, and the rail sits beside the video, never on it. The empty
// room's rail stays out (nothing to cover) with 📌 / ⛶ dimmed. (The film page is checked by scripts/harness/embed.)
// Needs the built site on a local server and a local video file:
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   (cd <folder with video.webm> && python3 -m http.server 5300)
//   node scripts/harness/one-rail/run.cjs [http://localhost:8787] [http://localhost:5300/video.webm]
const { chromium } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:8787';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
const SHOTS = process.env.SHOTS || '';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};
const rect = (page, selector) =>
  page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    const style = getComputedStyle(e);
    return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height, shown: r.width > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.05 };
  }, selector);
const overlap = (a, b) => a && b && a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1;

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const room = `rail${Math.random().toString(36).slice(2, 7)}`;
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('tipsSeen', '1');
    localStorage.setItem('lang', 'en');
    localStorage.setItem('opt:autoInvite', '0');
  });
  await page.goto(`${SITE}/r/${room}`);
  await page.fill('#name', 'Alex');
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await page.waitForTimeout(1500);

  // 1) A fresh room: no toolbar (card 6, owner's pick D), but the rail is there (card 6e, owner: voice, cameras, games
  // and emojis before any video).
  check(!(await rect(page, '.toolbar')).shown, 'fresh room: no toolbar under the video');
  // Card 6g.1: it rests like the rail with a video and comes at the video's right edge.
  {
    const w = await rect(page, '.player-wrap');
    await page.mouse.move(w.r - 220, w.t + w.h / 2);
    await page.mouse.move(w.r - 20, w.t + w.h / 2, { steps: 5 });
    await page.waitForTimeout(400);
  }
  check((await rect(page, '#fs-dock')).shown, 'fresh room: the rail is there at the right edge (card 6e, 6g.1)');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/empty.png` });

  // 2) A video file: the rail beside the video, resting until the mouse reaches the right edge.
  await page.fill('#media-input', VIDEO);
  await page.click('#media-form button[value="load"]');
  await page.waitForFunction(() => document.querySelector('#player video, #player .slot video'), null, { timeout: 15000 });
  await page.waitForTimeout(800);
  check(!(await rect(page, '.toolbar')).shown, 'video file: no toolbar under the video');
  const wrap = await rect(page, '.player-wrap');
  await page.mouse.move(wrap.l + wrap.w / 2, wrap.t + wrap.h / 2);
  await page.waitForTimeout(3200);
  check(await page.evaluate(() => document.querySelector('#theater').classList.contains('dock-idle')), 'video file: mouse in the middle → the rail rests');
  check(Math.abs((await rect(page, '.player')).r - wrap.r) < 2, 'video file: resting rail → the video takes the full width');
  await page.mouse.move(wrap.r - 20, wrap.t + wrap.h / 2, { steps: 4 });
  await page.waitForTimeout(500);
  const dock1 = await rect(page, '#fs-dock');
  const player1 = await rect(page, '.player');
  check(dock1.shown, 'video file: mouse at the right edge → the rail comes');
  check(!overlap(dock1, player1), 'video file: the rail is beside the video, never on it', JSON.stringify({ dock1, player1 }));
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/file.png` });

  // 3) Fullscreen: the same column.
  await page.click('#dock-exit');
  await page.waitForTimeout(800);
  await page.mouse.move(1440 - 10, 450, { steps: 4 });
  await page.waitForTimeout(500);
  const dock2 = await rect(page, '#fs-dock');
  check(dock2.shown && !overlap(dock2, await rect(page, '.player')), 'fullscreen: the rail is a column beside the video');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/fullscreen.png` });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);

  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ One rail everywhere');
  process.exit(fails ? 1 : 0);
})();
