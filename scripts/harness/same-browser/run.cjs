// Card R17 (owner: "a big problem"): two tabs of one browser in one room with different names ("Alex" and "Alex 2")
// must each see the other as a person, and keep doing so after a reload and while one tab sits in the background.
// Needs the built site on wrangler dev:
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/same-browser/run.cjs [http://localhost:8787] [seconds to wait, default 40]
const { chromium } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:8787';
const WAIT_S = Number(process.argv[3] || 40);
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};

(async () => {
  const browser = await chromium.launch();
  const room = `same${Math.random().toString(36).slice(2, 8)}`;
  // One context = one browser: both tabs share localStorage, so they have the same browser id (cid).
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('tipsSeen', '1');
    localStorage.setItem('lang', 'en');
    localStorage.setItem('opt:autoInvite', '0');
  });
  const enter = async (name) => {
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/${room}`);
    await page.fill('#name', name);
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await page.waitForTimeout(1000);
    return page;
  };
  const faces = (page) => page.evaluate(() => [...document.querySelectorAll('#voice-people .together-person')].map((b) => b.textContent.trim()));
  const sees = async (page, other) => (await faces(page)).some((t) => t.includes(other));
  const a = await enter('Alex');
  const b = await enter('Alex 2');
  await a.waitForTimeout(800);
  check(await sees(a, 'Alex 2'), 'the "Alex" tab shows "Alex 2"', JSON.stringify(await faces(a)));
  check(await sees(b, 'Alex'), 'the "Alex 2" tab shows "Alex"', JSON.stringify(await faces(b)));
  const title = await a.evaluate(() => document.querySelector('.room-title')?.textContent ?? '');
  check(/2 people/.test(title), 'the room counts 2 people', title);

  await b.reload();
  await b.waitForSelector('.room');
  await b.waitForTimeout(1500);
  check(await sees(a, 'Alex 2') && (await sees(b, 'Alex')), 'after a reload of "Alex 2" both still see each other', JSON.stringify([await faces(a), await faces(b)]));

  // The first tab reloads: it must come back as "Alex", not as the name the other tab saved last.
  await a.reload();
  await a.waitForSelector('.room');
  await a.waitForTimeout(1500);
  const meA = await a.evaluate(() => document.querySelector('#profile-open, .profile-btn')?.getAttribute('aria-label') ?? '');
  check(await sees(a, 'Alex 2') && (await sees(b, 'Alex')), 'after a reload of "Alex" both still see each other (each kept its own name)', JSON.stringify([await faces(a), await faces(b), meA]));

  // One tab in the background for a while (its timers slow down in a real browser; the room must keep it).
  await a.bringToFront();
  await a.waitForTimeout(WAIT_S * 1000);
  check(await sees(a, 'Alex 2') && (await sees(b, 'Alex')), `after ${WAIT_S} s with "Alex 2" in the background both still see each other`, JSON.stringify([await faces(a), await faces(b)]));

  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ Two names in one browser stay two people');
  process.exit(fails ? 1 : 0);
})();
