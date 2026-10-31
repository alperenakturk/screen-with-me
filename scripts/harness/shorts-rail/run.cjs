// The Shorts rail (0.9.92.2, owner chose C): on wide screens the Shorts bar is a column right of the video and the
// top bar folds on screens under 900 px tall; phones keep the bottom bar. Checks at laptop, monitor, big and short
// screens: the page never scrolls, the rail sits right of the video and fits beside it, ⋯ shows only when the top bar
// is folded and brings it back, Enter / 💬 open the message box; on a phone the bar stays under the video.
//
//   npm run dev, then: NODE_PATH=$(npm root -g) node scripts/harness/shorts-rail/run.cjs [site]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:5173';
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};

async function openShort(ctx) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('tipsSeen', '1'));
  await page.goto(`${SITE}/r/rail${Math.random().toString(36).slice(2, 7)}`);
  await page.fill('#name', 'Alex');
  await page.click('#name-form button.primary');
  await page.waitForSelector('#media-input, #add-toggle', { state: 'attached' });
  if (await page.$('#add-toggle:visible')) await page.click('#add-toggle');
  await page.fill('#media-input', 'https://www.youtube.com/shorts/aqz-KE-bpKQ');
  await page.click('#media-form button[value=load]');
  await page.waitForFunction(() => document.documentElement.classList.contains('shorts-view'));
  await page.waitForTimeout(800);
  return { page, errors };
}

const box = (page, sel) =>
  page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) };
  }, sel);

(async () => {
  const browser = await chromium.launch();
  const sizes = [
    ['laptop 1366×768', 1366, 768, true],
    ['monitor 1920×1080', 1920, 1080, false],
    ['big 2560×1440', 2560, 1440, false],
    ['short 1024×640', 1024, 640, true],
  ];
  for (const [name, width, height, folded] of sizes) {
    const ctx = await browser.newContext({ viewport: { width, height } });
    const { page, errors } = await openShort(ctx);
    const video = await box(page, '.player-wrap');
    const bar = await box(page, '#shorts-bar');
    const nav = await box(page, '#shorts-nav');
    const doc = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, w: innerWidth, h: innerHeight }));
    check(doc.sw <= doc.w && doc.sh <= doc.h, `${name}: the page doesn't scroll`, doc);
    check(bar.x >= video.r && bar.w <= 56 && bar.y >= video.y, `${name}: the rail is right of the video`, { video, bar });
    check(bar.b <= nav.y && nav.b <= video.b + 1, `${name}: the rail and ▲▼ fit beside the video`, { bar, nav, video });
    const old = Math.min(Math.max(320, height - 210), 880);
    check(video.h > old, `${name}: the video is taller than with the bottom bar`, { now: video.h, before: old });
    const more = await page.isVisible('#shorts-more');
    check(more === folded, `${name}: ⋯ only when the top bar is folded`, { more, folded });
    if (folded) {
      const hidden = await box(page, '.topbar');
      await page.click('#shorts-more');
      await page.waitForTimeout(350);
      const shown = await box(page, '.topbar');
      await page.mouse.click(8, height - 8);
      await page.waitForTimeout(350);
      const again = await box(page, '.topbar');
      check(hidden.b <= 0 && shown.y === 0 && again.b <= 0, `${name}: ⋯ shows the top bar, a click elsewhere folds it`, { hidden: hidden.b, shown: shown.y, again: again.b });
    }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const typing = await page.evaluate(() => document.activeElement?.id);
    const chat = await box(page, '#shorts-chat');
    check(typing === 'shorts-input' && chat.x >= video.r && chat.r <= width, `${name}: Enter opens the message box beside the rail`, { typing, chat });
    await page.keyboard.press('Escape');
    await page.click('#shorts-feed');
    await page.waitForTimeout(300);
    const feed = await box(page, '#shorts-feed-form');
    check(feed.r <= width && feed.b <= height && feed.y >= 0, `${name}: the ♾ window stays on screen`, feed);
    check(errors.length === 0, `${name}: no page errors`, errors);
    await ctx.close();
  }
  const phone = await browser.newContext({ ...devices['Pixel 7'] });
  const { page, errors } = await openShort(phone);
  const video = await box(page, '.player-wrap');
  const bar = await box(page, '#shorts-bar');
  check(bar.y >= video.b && (await page.isVisible('#shorts-input')) && !(await page.isVisible('#shorts-chat-btn')), 'phone: the bar stays under the video with the message box', { video, bar });
  check(errors.length === 0, 'phone: no page errors', errors);
  await phone.close();
  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Shorts rail works');
  process.exit(failed ? 1 : 0);
})();
