// Phone speed test (0.9.93.6): opens the built site as a mid-range phone (Pixel 7 screen, 4× slower CPU, a 4G-like
// network) and measures, as the median of a few fresh visits:
//   home  → from navigation to the "Create room" button on screen,
//   join  → from navigation to a room's join card (name field) on screen,
//   room  → from pressing "Enter the room" to the room's live connection (`data-swm-transport` set).
// Fails when a median is over its budget. Needs Playwright (preinstalled in cloud sessions) and the built site on a
// server, e.g. `npm run build` then `npm run dev` (wrangler dev serves apps/web/dist on :8787):
//   NODE_PATH=$(npm root -g) node scripts/harness/phone-speed/run.cjs [http://localhost:8787] [runs]
const { chromium, devices } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:8787';
const RUNS = Number(process.argv[3] || 3);
// Budgets in ms (median). Measured 2 Nov 2026 in the cloud container: see docs/internal/perf-1.md "The budgeted phone check".
const BUDGET = { home: 1500, join: 1500, room: 1500 };
const CPU = 4;
const NETWORK = { offline: false, latency: 60, downloadThroughput: (9000 * 1024) / 8, uploadThroughput: (3000 * 1024) / 8 };

async function visit(browser) {
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  await ctx.addInitScript(() => localStorage.setItem('tipsSeen', '1'));
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', NETWORK);
  const out = {};
  let t = Date.now();
  await page.goto(`${SITE}/`);
  await page.waitForSelector('#start-form button.primary', { state: 'visible' });
  out.home = Date.now() - t;
  const room = `speed${Math.random().toString(36).slice(2, 7)}`;
  t = Date.now();
  await page.goto(`${SITE}/r/${room}`);
  await page.waitForSelector('#name', { state: 'visible' });
  out.join = Date.now() - t;
  await page.fill('#name', 'Sam');
  t = Date.now();
  await page.click('#name-form button.primary');
  await page.waitForSelector('html[data-swm-transport]', { timeout: 20000 });
  out.room = Date.now() - t;
  await ctx.close();
  return out;
}

(async () => {
  const browser = await chromium.launch();
  const runs = [];
  await visit(browser); // warm-up: the server's first answers (cold Durable Objects) are not the page's speed
  for (let i = 0; i < RUNS; i++) runs.push(await visit(browser));
  await browser.close();
  const median = (k) => runs.map((r) => r[k]).sort((a, b) => a - b)[Math.floor(runs.length / 2)];
  let fails = 0;
  for (const k of Object.keys(BUDGET)) {
    const m = median(k);
    const ok = m <= BUDGET[k];
    if (!ok) fails++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${k}: median ${m} ms (budget ${BUDGET[k]}; runs ${runs.map((r) => r[k]).join(', ')})`);
  }
  console.log(fails ? `✗ ${fails} over budget` : `✓ phone speed within budget (CPU ${CPU}×, 4G-like network, ${RUNS} runs)`);
  process.exit(fails ? 1 : 0);
})();
