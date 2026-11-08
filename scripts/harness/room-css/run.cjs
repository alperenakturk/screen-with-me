// Card PERF1b: the room's styles (room.css → `room-*.css`) load only with the room. The home page and /connection
// never download them; the room page has them before it draws anything of the room (no unstyled flash on the join
// card or in the room), on a computer and on a phone.
//
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/room-css/run.cjs [http://localhost:8787]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};
const isRoomCss = (url) => /\/assets\/room-[\w-]+\.css$/.test(url);

/** The first time the join card / the room shows up, is a room-only rule already applied? */
const WATCH = () => {
  window.__firstPaint = {};
  const look = () => {
    const card = document.querySelector('#name-form');
    if (card && !window.__firstPaint.join) {
      const box = card.closest('.join-card') ?? card;
      window.__firstPaint.join = { maxWidth: getComputedStyle(box).maxWidth };
    }
    const room = document.querySelector('.room');
    if (room && !window.__firstPaint.room) window.__firstPaint.room = { display: getComputedStyle(room).display };
  };
  new MutationObserver(look).observe(document, { subtree: true, childList: true });
};

(async () => {
  const browser = await chromium.launch();
  try {
    for (const [label, opts] of [
      ['computer', { viewport: { width: 1366, height: 768 } }],
      ['phone', { ...devices['iPhone 13'] }],
    ]) {
      // Pages without the room: no room stylesheet.
      for (const path of ['/', '/connection']) {
        const ctx = await browser.newContext(opts);
        const page = await ctx.newPage();
        const css = [];
        page.on('request', (r) => isRoomCss(r.url()) && css.push(r.url()));
        await page.goto(SITE + path, { waitUntil: 'load' });
        await page.waitForTimeout(path === '/' ? 1500 : 4000);
        check(css.length === 0, `${label} ${path}: the room's stylesheet is not downloaded`, css);
        await ctx.close();
      }
      // The room: its stylesheet is in before the join card and the room are drawn.
      const ctx = await browser.newContext(opts);
      await ctx.addInitScript(() => {
        localStorage.setItem('tipsSeen', '1');
        localStorage.setItem('opt:autoInvite', '0');
      });
      await ctx.addInitScript(WATCH);
      const page = await ctx.newPage();
      const css = [];
      page.on('request', (r) => isRoomCss(r.url()) && css.push(r.url()));
      await page.goto(`${SITE}/r/roomcss${Math.random().toString(36).slice(2, 7)}`, { waitUntil: 'load' });
      await page.waitForSelector('#name');
      const join = await page.evaluate(() => window.__firstPaint.join);
      check(css.length === 1, `${label} room: the room's stylesheet is downloaded once`, css.length);
      // The join card's width limit (`.join-card { max-width }`) comes from room.css only.
      check(join && join.maxWidth !== 'none', `${label} room: the join card is styled from its first frame`, join);
      await page.fill('#name', 'Alex');
      await page.click('#name-form button.primary');
      await page.waitForSelector('.room');
      await page.waitForTimeout(300);
      const room = await page.evaluate(() => window.__firstPaint.room);
      check(room && room.display !== 'block' && room.display !== 'inline', `${label} room: the room is laid out by its stylesheet from its first frame`, room);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  if (failed) {
    console.log(`\n✗ ${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("\n✓ The room's styles load only with the room (card PERF1b)");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
