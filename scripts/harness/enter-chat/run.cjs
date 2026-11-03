// Card R2 (owner's test round 1: "the first Enter opens an empty side panel, only the second opens the message box").
// One Enter puts the cursor in the message box wherever the chat lives: the side panel (empty room, a video, after a
// rail button was pressed), cinema mode and fullscreen (the rail's message window).
//
//   npm run dev, a local video on :5300 (e.g. `python3 -m http.server 5300` in a folder with `video.webm`), then:
//   node scripts/harness/enter-chat/run.cjs [site] [video]
const { chromium } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
const VIDEO = process.argv[3] ?? 'http://localhost:5300/video.webm';
let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  await page.goto(`${SITE}/`);
  await page.evaluate(() => {
    for (const [k, v] of Object.entries({ name: 'Alex', avatar: 'wizard', lang: 'en', 'opt:autoInvite': '0', tipsSeen: '1' })) localStorage.setItem(k, v);
  });
  await page.goto(`${SITE}/r/ent${Math.random().toString(36).slice(2, 7)}#back`);
  await page.waitForFunction(() => !!document.querySelector('#game-btn'), null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  const active = () => page.evaluate(() => document.activeElement?.id ?? null);
  const enter = async (label, want) => {
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    const got = await active();
    check(got === want, `${label}: one Enter → the message box`, String(got));
  };

  await page.mouse.click(683, 400);
  await enter('empty room', 'chat-input');
  await page.fill('#media-form input', VIDEO);
  await page.press('#media-form input', 'Enter');
  await page.waitForFunction(() => document.querySelector('.room')?.classList.contains('has-item'), null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.mouse.click(400, 350);
  await enter('a video, side panel', 'chat-input');
  for (const id of ['dock-react', 'dock-more']) {
    await page.mouse.move(1000, 380);
    await page.evaluate((id) => document.getElementById(id)?.click(), id);
    await page.waitForTimeout(200);
    await page.mouse.click(400, 350);
    await page.waitForTimeout(200);
    await enter(`after the rail's ${id}`, 'chat-input');
  }
  const blur = () => page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : null));
  await blur();
  await page.keyboard.press('t');
  await page.waitForTimeout(500);
  const cinema = await page.evaluate(() => document.querySelector('.room')?.classList.contains('cinema'));
  check(cinema, 'T opens cinema mode');
  await page.mouse.move(400, 350);
  await page.waitForTimeout(3000);
  await enter('cinema mode (the rail resting)', 'dock-chat-input');
  await blur();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  if (await page.evaluate(() => document.querySelector('.room')?.classList.contains('cinema'))) {
    await blur();
    await page.keyboard.press('t');
    await page.waitForTimeout(400);
  }
  await page.evaluate(() => document.getElementById('fullscreen')?.click());
  check(await page.waitForFunction(() => !!document.fullscreenElement || !!document.querySelector('.fake-fs'), null, { timeout: 5000 }).then(() => true, () => false), 'fullscreen opens');
  await page.waitForTimeout(900);
  await page.mouse.move(400, 350);
  await page.waitForTimeout(3000);
  await enter('fullscreen (the rail resting)', 'dock-chat-input');

  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Enter chat harness passed');
  process.exit(failed ? 1 : 0);
})();
