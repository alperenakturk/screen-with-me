// Card OFFLINE2: a lazy chunk that fails while our site can't be reached must not reload the page into the browser's
// error page, also when `navigator.onLine` stays true (Wi-Fi "connected" without internet). The page waits, asks our
// site again every 10 s. Card GR1: in a room it never reloads by itself. Once the site answers (or when a chunk is really
// gone after a new version) a calm "Sidelit was updated · ↻ Refresh" note shows, and only its tap reloads, once.
//
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/offline-reload/run.cjs [http://localhost:8787]
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};

async function openRoom(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('tipsSeen', '1');
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('lang', 'en');
  });
  const page = await ctx.newPage();
  const loads = [];
  page.on('framenavigated', (f) => f === page.mainFrame() && loads.push(f.url()));
  await page.goto(`${SITE}/r/offline${Math.random().toString(36).slice(2, 7)}`);
  await page.fill('#name', 'Alex');
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await page.waitForTimeout(800);
  loads.length = 0;
  return { ctx, page, loads };
}
/** The shortcuts card is a lazy chunk the room loads on `?`. */
const askShortcuts = (page) =>
  page.evaluate(() => {
    document.body.focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
  });
/** "↻ Refresh" reloads once, back into the room. */
async function tapRefresh(page, loads) {
  await page.click('#update-note button');
  const t0 = Date.now();
  while (Date.now() - t0 < 8000 && loads.length === 0) await page.waitForTimeout(250);
  check(loads.length === 1, '"↻ Refresh" reloads the page once', loads);
  await page.waitForSelector('.room', { timeout: 15000 }).catch(() => {});
  check(await inRoom(page), 'after it the room is back (no join card)');
}
const inRoom = (page) => page.evaluate(() => !!document.querySelector('.room') && location.protocol.startsWith('http')).catch(() => false);

(async () => {
  const browser = await chromium.launch();
  try {
    // 1. Our site can't be reached but the browser still says "online": no reload while it stays down.
    {
      const { ctx, page, loads } = await openRoom(browser);
      check(await page.evaluate(() => navigator.onLine), 'the browser says it is online');
      await page.route(`${SITE}/**`, (r) => r.abort('internetdisconnected'));
      await askShortcuts(page);
      await page.waitForTimeout(6000);
      check(loads.length === 0, 'site unreachable, onLine true: the page does not reload', loads);
      check(await inRoom(page), 'the room stays on screen (no browser error page)');
      // 2. The site answers again: within one re-check (10 s) the note shows (Chrome keeps the failed import), no reload.
      await page.unroute(`${SITE}/**`);
      const shown = await page.waitForSelector('#update-note', { timeout: 16000 }).then(() => true).catch(() => false);
      check(shown && loads.length === 0, 'the site answers again: the "Sidelit was updated" note shows, no reload', { loads });
      await tapRefresh(page, loads);
      await ctx.close();
    }
    // 3. A chunk that is really gone while the site answers (a new version was deployed): the note, never a reload.
    {
      const { ctx, page, loads } = await openRoom(browser);
      await page.route(/\/assets\/shortcuts-[\w-]+\.js$/, (r) => r.fulfill({ status: 404, body: 'gone' }));
      await askShortcuts(page);
      const shown = await page.waitForSelector('#update-note', { timeout: 8000 }).then(() => true).catch(() => false);
      await page.waitForTimeout(1500);
      const note = await page.evaluate(() => {
        const n = document.getElementById('update-note');
        const r = n?.getBoundingClientRect();
        return n && r && { text: n.textContent, button: n.querySelector('button')?.textContent, inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };
      });
      check(shown && loads.length === 0, 'a chunk gone after a new version: the note shows, the room stays (no reload)', { loads, note });
      check(!!note && /updated/.test(note.text) && /Refresh/.test(note.button) && note.inView, 'the note reads "Sidelit was updated · ↻ Refresh", whole on screen', note);
      check(await page.evaluate(() => document.querySelectorAll('#update-note').length === 1), 'one note, however often a chunk fails');
      await page.unroute(/\/assets\/shortcuts-[\w-]+\.js$/);
      await tapRefresh(page, loads);
      await ctx.close();
    }
  } finally {
    await browser.close();
  }
  if (failed) {
    console.log(`\n✗ ${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\n✓ A failed chunk waits for the network; in a room only a tap on "↻ Refresh" reloads (cards OFFLINE2, GR1)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
