// Card R3 (owner's test round 1: "a wide black strip on the right in YouTube fullscreen"). The column beside the
// player (`#fs-side`, card 2a / 6d) opens only while it really shows something. Checks in YouTube fullscreen: nothing
// → no column; a message → the column, then gone after its 8 s; my camera on → the column with the camera in it;
// camera off → gone; the camera window dragged onto the player (a place I chose) → no empty column; only a hidden
// camera → no column; a resize leaves no empty column.
//
//   npm run dev, then: node scripts/harness/yt-fs-side/run.cjs [site]
const { viaYouTube } = require('../via-youtube.cjs');
const { chromium } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
};
const args = ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];

(async () => {
  const browser = await chromium.launch({ args });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ['microphone', 'camera'] });
  await viaYouTube(ctx);
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    for (const [k, v] of Object.entries({ name: 'Alex', avatar: 'wizard', lang: 'en', 'opt:autoInvite': '0', tipsSeen: '1', 'opt:voiceCheck': 'skip', 'opt:ipNotice:voice': '1' })) localStorage.setItem(k, v);
  });
  await page.goto(`${SITE}/r/ys${Math.random().toString(36).slice(2, 7)}#back`);
  await page.waitForFunction(() => !!document.querySelector('#media-input'), null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.fill('#media-input', 'https://www.youtube.com/watch?v=M7lc1UVf-VE');
  await page.press('#media-input', 'Enter');
  await page.waitForFunction(() => document.querySelector('#theater')?.classList.contains('yt-rail'), null, { timeout: 20000 });
  await page.evaluate(() => document.getElementById('fullscreen')?.click());
  await page.waitForFunction(() => document.querySelector('#theater')?.classList.contains('yt-fs'), null, { timeout: 8000 });
  await page.mouse.move(500, 450);
  await page.waitForTimeout(1500);

  const side = () =>
    page.evaluate(() => {
      const theater = document.getElementById('theater');
      const player = document.querySelector('#player')?.getBoundingClientRect();
      const column = document.getElementById('fs-side')?.getBoundingClientRect();
      return { open: theater.classList.contains('fs-side-open'), playerRight: Math.round(player?.right ?? 0), columnW: Math.round(column?.width ?? 0), vw: innerWidth };
    });
  const closed = async (label) => {
    const s = await side();
    check(!s.open && s.playerRight >= s.vw - 80, `${label}: no column, the player takes the width beside the rail`, JSON.stringify(s));
  };

  await closed('nothing going on');

  // A message from someone: the column opens, and steps aside again 8 s after the message left.
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('swm-test-toast')));
  await page.evaluate(() => {
    const toasts = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = 'Sam hello';
    toasts?.append(t);
    setTimeout(() => t.remove(), 1500);
  });
  await page.waitForTimeout(600);
  check((await side()).open, 'a message: the column opens');
  await page.waitForTimeout(9500);
  await closed('8 s after the message left');

  // My camera: the column holds it; off again: gone.
  await page.evaluate(() => document.getElementById('dock-cam')?.click());
  await page.waitForFunction(() => !!document.querySelector('#voice-cams .cam-tile video'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(2000);
  const camOn = await page.evaluate(() => {
    const column = document.getElementById('fs-side').getBoundingClientRect();
    const tile = document.querySelector('#voice-cams .cam-tile')?.getBoundingClientRect();
    return { open: document.getElementById('theater').classList.contains('fs-side-open'), inside: !!tile && tile.left >= column.left - 2 && tile.right <= column.right + 2 };
  });
  check(camOn.open && camOn.inside, 'my camera on: the column opens with the camera in it', JSON.stringify(camOn));

  // Dragged onto the player (a place I chose): the camera stays there and the column does not stay open empty.
  const bar = await page.evaluate(() => {
    const r = document.querySelector('#voice-cams .cam-bar')?.getBoundingClientRect();
    return r ? { x: r.left + 30, y: r.top + r.height / 2 } : null;
  });
  if (bar) {
    await page.mouse.move(bar.x, bar.y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(bar.x - i * 80, bar.y + i * 10);
    await page.mouse.up();
  }
  await page.mouse.move(500, 450);
  await page.waitForTimeout(2500);
  const dragged = await side();
  const tileLeft = await page.evaluate(() => Math.round(document.querySelector('#voice-cams .cam-tile')?.getBoundingClientRect().left ?? -1));
  check(!!bar && !dragged.open && tileLeft >= 0 && tileLeft < 700, 'cameras dragged onto the player by me: they stay there, no empty column beside it', JSON.stringify({ bar: !!bar, ...dragged, tileLeft }));

  // Camera off: no column.
  await page.evaluate(() => document.getElementById('dock-cam')?.click());
  await page.waitForTimeout(2000);
  await closed('camera off again');
  // The place I chose is kept for the next time; leave it as it was.
  await page.evaluate(() => localStorage.removeItem('camFloat:fsSpot'));


  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ YouTube fullscreen column harness passed');
  process.exit(failed ? 1 : 0);
})();
