// Cinema mode (card 14, docs/internal/design/cinema-mode.md): T / rail ⋯ / Esc, the largest 16:9 beside the rail, the
// rest of the page dark, the top bar at the top edge, chat as a strip under the video with a count on 💬, this tab only,
// computers only. Needs the built site on a local server and a local video file:
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   (cd <folder with video.webm> && python3 -m http.server 5300)
//   NODE_PATH=$(npm root -g) node scripts/harness/cinema/run.cjs [http://localhost:8787] [http://localhost:5300/video.webm]
const { chromium, devices } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:8787';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};
const rect = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r ? { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom } : null; }, sel);
const cinema = (page) => page.evaluate(() => document.querySelector('.room').classList.contains('cinema'));
const visible = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); return !!e && getComputedStyle(e).visibility !== 'hidden' && e.getBoundingClientRect().height > 0; }, sel);

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const room = `cine${Math.random().toString(36).slice(2, 7)}`;
  async function enter(opts, name) {
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript(() => {
      localStorage.setItem('tipsSeen', '1');
      if (!localStorage.getItem('lang')) localStorage.setItem('lang', 'en');
      localStorage.setItem('opt:autoInvite', '0');
    });
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/${room}`);
    await page.fill('#name', name);
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await page.waitForTimeout(1200);
    return page;
  }

  const page = await enter({ viewport: { width: 1366, height: 768 } }, 'Alex');
  await page.fill('#media-input', VIDEO);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2500);
  const friend = await enter({ viewport: { width: 1280, height: 720 } }, 'Sam');

  // T enters (not while typing: the link box still has the focus).
  await page.evaluate(() => document.activeElement?.blur());
  await page.mouse.move(683, 300);
  await page.keyboard.press('t');
  await page.waitForTimeout(600);
  check(await cinema(page), 'T enters cinema mode');
  const wrap = await rect(page, '.player-wrap');
  check(wrap.w >= 1223 + 58 - 2 && wrap.h >= 688 - 2, '1366×768: the video is 1223×688 (+ the rail)', JSON.stringify(wrap));
  check(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth), '1366×768: no page scroll');
  check(!(await visible(page, '.topbar')), 'the top bar is out of view');
  check(!(await visible(page, 'footer')), 'the footer is hidden');
  // Only the video, the rail and the dark layer: sweep points around the video.
  const sweep = await page.evaluate(() => {
    const bad = [];
    for (const [x, y] of [[5, 5], [683, 5], [1360, 5], [5, 384], [1360, 384], [5, 760], [683, 760], [1360, 760]]) {
      const e = document.elementFromPoint(x, y);
      if (!e || !(e.closest('.theater') || e.id === 'cinema-edge' || e.closest('.hint-bubble, .flash-hint, [role="status"]'))) bad.push(`${x},${y}:${e?.tagName}.${e?.className}`);
    }
    return bad;
  });
  check(sweep.length === 0, 'around the video only the dark layer', sweep.join(' '));

  // The top bar comes at the top edge and goes again.
  await page.mouse.move(683, 3);
  await page.waitForTimeout(400);
  check(await visible(page, '.topbar'), 'the mouse at the top edge shows the top bar');
  await page.mouse.move(683, 400);
  await page.waitForTimeout(900);
  check(!(await visible(page, '.topbar')), '…and it goes when the mouse leaves');

  // A message: a strip under the video, nothing of ours on the player, a count on 💬.
  await friend.fill('#chat-input', 'Popcorn ready');
  await friend.keyboard.press('Enter');
  await page.waitForTimeout(800);
  const toast = await rect(page, '.toasts .toast:last-child');
  const player = await rect(page, '.player');
  check(!!toast && toast.y >= player.b - 1, 'the message shows under the video', JSON.stringify({ toast, player }));
  check(!!toast && toast.b <= 768, 'the strip is on screen');
  check(await page.evaluate(() => { const b = document.querySelector('#dock-chat .cinema-badge'); return !!b && !b.hidden && b.textContent === '1'; }), '💬 shows 1 unread');

  // Esc with a rail window open closes the window first, cinema stays; a second Esc leaves.
  await page.mouse.move(wrap.r - 20, wrap.y + wrap.h / 2);
  await page.waitForTimeout(500);
  await page.click('#dock-more');
  await page.waitForTimeout(200);
  check(await page.evaluate(() => !document.querySelector('#dock-more-pop').hidden), 'rail ⋯ opens');
  check((await page.textContent('#dock-more-side')).includes('Leave cinema mode'), 'rail ⋯ has "Leave cinema mode"');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check(await cinema(page) && (await page.evaluate(() => document.querySelector('#dock-more-pop').hidden)), 'Esc closes the rail window first, cinema stays');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  check(!(await cinema(page)), 'the next Esc leaves cinema mode');
  check(await visible(page, '.side') && await visible(page, '.topbar'), 'leaving brings the side panel and the top bar back');

  // The rail's ⋯ enters it too.
  await page.mouse.move(wrap.r - 20, 300);
  const now = await rect(page, '.player-wrap');
  await page.mouse.move(now.r - 20, now.y + now.h / 2);
  await page.waitForTimeout(500);
  await page.click('#dock-more');
  await page.click('#dock-more-pop [data-press="#side-toggle"]');
  await page.waitForTimeout(500);
  check(await cinema(page), 'rail ⋯ → Cinema mode enters it');

  // This tab remembers it.
  await page.reload();
  await page.waitForSelector('.room');
  await page.waitForTimeout(1500);
  check(await cinema(page), 'a reload keeps cinema mode (this tab)');
  await page.keyboard.press('t');
  await page.waitForTimeout(300);
  check(!(await cinema(page)), 'T leaves it');

  // Typing a T in the chat box does nothing.
  await page.click('#chat-input');
  await page.keyboard.type('t');
  check(!(await cinema(page)), 'a T typed in the chat box does not toggle');
  await page.fill('#chat-input', '');

  // The shortcuts card lists T.
  await page.mouse.click(683, 300);
  await page.keyboard.press('?');
  await page.waitForTimeout(300);
  check((await page.textContent('.shortcuts-dialog')).includes('Cinema mode'), 'the shortcuts card lists T · Cinema mode');
  await page.keyboard.press('Escape');

  // 1920×1080.
  const big = await enter({ viewport: { width: 1920, height: 1080 } }, 'Kim');
  await big.mouse.move(900, 400);
  await big.keyboard.press('t');
  await big.waitForTimeout(600);
  const bigWrap = await rect(big, '.player-wrap');
  check(bigWrap.w >= 1778 + 58 - 2 && bigWrap.h >= 1000 - 2, '1920×1080: the video is 1778×1000 (+ the rail)', JSON.stringify(bigWrap));
  check(await big.evaluate(() => document.documentElement.scrollHeight <= innerHeight), '1920×1080: no page scroll');

  // Reduced motion: no fade.
  const calm = await enter({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' }, 'Lee');
  await calm.mouse.move(600, 300);
  await calm.keyboard.press('t');
  await calm.waitForTimeout(100);
  check(await calm.evaluate(() => getComputedStyle(document.querySelector('.theater')).animationName === 'none'), 'reduced motion: it switches at once');

  // Phones: no cinema mode (they already watch edge to edge).
  const phone = await enter({ ...devices['Pixel 7'] }, 'Pat');
  await phone.keyboard.press('t');
  await phone.waitForTimeout(300);
  check(!(await cinema(phone)), 'a phone has no cinema mode');

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Cinema mode works');
  process.exit(fails ? 1 : 0);
})();
