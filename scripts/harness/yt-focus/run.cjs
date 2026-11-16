// Card VC1 (YouTube's volume couldn't be dragged) + R26: a click in the YouTube player gives the keyboard focus back to
// the room after a moment (Enter then opens the message box), but while the player's volume keeps changing (a drag on
// YouTube's own slider) the focus stays in the player until the volume rests. The drag is played by changing the
// player's volume from the page while the focus is in the frame (the cloud can't play YouTube itself).
//
//   npm run dev, then: NODE_PATH=$(npm root -g) node scripts/harness/yt-focus/run.cjs [site]
const { viaYouTube } = require('../via-youtube.cjs');
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:5173';
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await viaYouTube(ctx);
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', 'en');
    } catch {}
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${SITE}/r/ytf${Math.random().toString(36).slice(2, 7)}?debug=1`);
  await page.fill('#name', 'Alex');
  await page.click('#name-form button.primary');
  await page.waitForSelector('#media-input');
  await page.fill('#media-input', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ');
  await page.click('#media-form button[value=load]');
  await page.waitForSelector('#theater iframe');
  await page.waitForFunction(() => document.querySelector('#theater iframe')?.src.includes('enablejsapi'), null, { timeout: 15000 }).catch(() => {});
  await sleep(4000);
  const lab = async () => JSON.parse((await page.evaluate(async () => (await window.__swmLab.run('player.focus')).text)).replace(/^\S+\s/, ''));
  const frame = await (await page.$('#theater iframe')).boundingBox();
  const inFrame = () => page.evaluate(() => document.activeElement instanceof HTMLIFrameElement);

  // 1. A plain click on the video: the focus comes back, and Enter opens the message box (R26).
  await page.mouse.click(frame.x + frame.width / 2, frame.y + frame.height / 3);
  await sleep(80);
  const tookIt = await inFrame();
  await sleep(900);
  const state = await lab();
  check(tookIt && !state.inPlayer, 'a click in the player: the focus goes in, then back to the room', { tookIt, state });
  await page.keyboard.press('Enter');
  await sleep(300);
  check((await page.evaluate(() => document.activeElement?.id)) === 'chat-input', 'then Enter opens the message box');

  // 2. A drag on YouTube's volume: the volume keeps changing, the focus stays in the player.
  await page.mouse.click(frame.x + 60, frame.y + frame.height - 20);
  const moved = [];
  for (let i = 0; i < 16; i++) {
    const level = 90 - i * 4;
    await page.evaluate((v) => {
      const range = document.getElementById('fs-volume');
      range.value = String(v);
      range.dispatchEvent(new Event('input'));
    }, level);
    await sleep(100);
    if (i === 12) moved.push(await lab());
  }
  const during = moved[0];
  check(during?.inPlayer === true && during.volume !== null && during.volume < 0.9, 'while the volume is being dragged the focus stays in the player', during);
  await sleep(2200);
  check(!(await lab()).inPlayer, 'when the volume rests, the focus comes back to the room');
  check(errors.length === 0, 'no page errors', errors);
  await browser.close();
  console.log(failed ? `\n${failed} FAILED` : '\nall ok');
  process.exit(failed ? 1 : 0);
})();
