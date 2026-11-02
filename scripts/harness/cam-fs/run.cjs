// One camera window in fullscreen (0.9.93.3, owner: "in fullscreen it is narrow and stacks the cameras; make it wide
// and side by side like outside"): two people in voice with fake cameras, the "one window" layout floating, a video
// file playing; in the window and in fullscreen the two tiles sit side by side. Needs Playwright, `npm run dev` and a
// local video (e.g. `python3 -m http.server 5300` in a folder with `video.webm`):
//   NODE_PATH=$(npm root -g) node scripts/harness/cam-fs/run.cjs [http://localhost:5173] [http://localhost:5300/video.webm]
const { chromium } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:5173';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};
(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const room = `cam${Math.random().toString(36).slice(2, 7)}`;
  async function enter(name) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['camera', 'microphone'] });
    await ctx.addInitScript(() => {
      for (const [k, v] of Object.entries({ tipsSeen: '1', lang: 'en', 'opt:camLayout': 'group', 'opt:camFloat': '1', 'opt:voiceCheck': 'skip', 'opt:joinCam': '1', 'opt:ipNotice:voice': '1' })) localStorage.setItem(k, v);
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => check(false, `${name}: no page errors`, e.message));
    await page.goto(`${SITE}/r/${room}`);
    await page.fill('#name', name);
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await page.waitForTimeout(800);
    return page;
  }
  const a = await enter('Alex');
  const b = await enter('Sam');
  await a.fill('#media-input', VIDEO);
  await a.click('#media-form button[value=load]');
  await a.waitForTimeout(4500);
  for (const p of [a, b]) await p.evaluate(() => document.querySelector('#voice-join')?.click());
  await a.waitForFunction(() => document.querySelectorAll('#voice-cams .cam-tile video').length >= 2, null, { timeout: 15000 }).catch(() => {});
  await a.waitForTimeout(1500);
  const tiles = (p) => p.evaluate(() => {
    const box = document.querySelector('#voice-cams').getBoundingClientRect();
    return { box: { w: Math.round(box.width), h: Math.round(box.height), x: Math.round(box.x) }, tiles: [...document.querySelectorAll('#voice-cams .cam-tile')].map((t) => { const r = t.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width) }; }), fs: !!document.fullscreenElement };
  });
  const win = await tiles(a);
  check(win.tiles.length >= 2 && Math.abs(win.tiles[0].y - win.tiles[1].y) < 4, 'window: the two cameras sit side by side', JSON.stringify(win));
  // Fullscreen with the rail's ⛶.
  const wrap = await a.evaluate(() => { const r = document.querySelector('.player-wrap').getBoundingClientRect(); return { r: r.right, y: r.top + r.height / 2 }; });
  await a.mouse.move(wrap.r - 15, wrap.y, { steps: 3 });
  await a.waitForTimeout(400);
  await a.click('#dock-exit');
  await a.waitForTimeout(1500);
  const fs = await tiles(a);
  check(fs.fs, 'the rail\'s ⛶ opens fullscreen');
  check(fs.tiles.length >= 2 && Math.abs(fs.tiles[0].y - fs.tiles[1].y) < 4, 'fullscreen: the two cameras sit side by side too', JSON.stringify(fs));
  check(fs.box.w > fs.box.h, 'fullscreen: the window is wider than tall', JSON.stringify(fs.box));
  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ Camera window keeps its cameras side by side');
  process.exit(fails ? 1 : 0);
})();
