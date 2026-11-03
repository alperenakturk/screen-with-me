// One camera window in fullscreen (0.9.93.3, owner: "in fullscreen it is narrow and stacks the cameras; make it wide
// and side by side like outside"): two people in voice with fake cameras, the "one window" layout floating, a video
// file playing; in the window and in fullscreen the two tiles sit side by side. Needs Playwright, `npm run dev` and a
// local video (e.g. `python3 -m http.server 5300` in a folder with `video.webm`):
//   NODE_PATH=$(npm root -g) node scripts/harness/cam-fs/run.cjs [http://localhost:5173] [http://localhost:5300/video.webm]
const { viaYouTube } = require('../via-youtube.cjs');
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
    await viaYouTube(ctx);
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
  // Card 2a (owner's D): with YouTube in fullscreen the cameras live in the column beside the player, never on it, in
  // the one-window layout and in the free layout.
  await a.evaluate(() => document.exitFullscreen?.().catch(() => {}));
  await a.waitForTimeout(800);
  await a.fill('#media-input', 'https://www.youtube.com/watch?v=M7lc1UVf-VE');
  await a.click('#media-form button[value=load]');
  await a.waitForFunction(() => document.querySelector('#theater')?.classList.contains('yt-rail') && document.querySelector('#player iframe'), null, { timeout: 15000 }).catch(() => {});
  await a.waitForTimeout(1500);
  const inColumn = () => a.evaluate(() => {
    const frame = document.querySelector('#player iframe')?.getBoundingClientRect();
    const side = document.querySelector('#fs-side')?.getBoundingClientRect();
    const pieces = [...document.querySelectorAll('#voice-cams .cam-tile, #voice-cams .cam-pill, #voice-cams:not(.free)')].map((n) => n.getBoundingClientRect()).filter((r) => r.width > 0);
    const over = pieces.filter((r) => frame && r.left < frame.right - 1 && frame.left < r.right - 1 && r.top < frame.bottom - 1 && frame.top < r.bottom - 1);
    const outside = pieces.filter((r) => side && (r.left < side.left - 1 || r.right > side.right + 1));
    return { n: pieces.length, over: over.length, outside: outside.length, side: side && Math.round(side.width) };
  });
  for (const layout of ['group', 'free']) {
    await a.evaluate((l) => {
      localStorage.setItem('opt:camLayout', l);
      for (const k of ['camFloat:fsSpot', 'camTiles:fsSpot', 'camPill:fsSpot']) localStorage.removeItem(k);
    }, layout);
    await a.reload();
    await a.waitForSelector('.room');
    await a.waitForFunction(() => document.querySelector('#player iframe') && document.querySelectorAll('#voice-cams .cam-tile video').length >= 2, null, { timeout: 20000 }).catch(() => {});
    await a.waitForTimeout(1200);
    const w2 = await a.evaluate(() => { const r = document.querySelector('.player-wrap').getBoundingClientRect(); return { r: r.right, y: r.top + r.height / 2 }; });
    await a.mouse.move(w2.r - 8, w2.y, { steps: 3 });
    await a.waitForTimeout(400);
    await a.click('#dock-exit');
    await a.waitForTimeout(1500);
    await a.mouse.move(400, 400, { steps: 3 });
    await a.waitForTimeout(3000);
    const col = await inColumn();
    if (process.env.SHOTS) await a.screenshot({ path: `${process.env.SHOTS}/yt-fs-${layout}.png` });
    check(col.n >= 2 && col.over === 0 && col.outside === 0, `YouTube fullscreen (${layout}): the cameras are in the column beside the player`, JSON.stringify(col));
    await a.evaluate(() => document.exitFullscreen?.().catch(() => {}));
    await a.waitForTimeout(600);
  }

  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ Camera window keeps its cameras side by side');
  process.exit(fails ? 1 : 0);
})();
