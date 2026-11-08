// Speed and weight pass (card PERF1, docs/internal/perf-1.md): opens the built site as a phone (Pixel 7, 4× slower
// CPU, 4G-like network) and as a laptop (1366 × 768, no throttling) and measures, as the median of fresh visits, the
// time and the bytes on the wire for:
//   home  → navigation to the "Create room" button on screen
//   join  → navigation to a room's join card (name field)
//   room  → "Enter the room" pressed to the room's live connection
//   game  → a Classics table asked for (Test Lab command) to its picker on screen
// Prints a table; it fails nothing (phone-speed is the budgeted check). Needs the built site on a local server:
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 &)
//   NODE_PATH=$(npm root -g) node scripts/harness/perf/run.cjs [http://localhost:8787] [runs]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const RUNS = Number(process.argv[3] || 3);
const PROFILES = {
  phone: { context: { ...devices['Pixel 7'] }, cpu: 4, network: { offline: false, latency: 60, downloadThroughput: (9000 * 1024) / 8, uploadThroughput: (3000 * 1024) / 8 } },
  laptop: { context: { viewport: { width: 1366, height: 768 } }, cpu: 1, network: null },
};

async function visit(browser, profile) {
  const ctx = await browser.newContext(profile.context);
  await ctx.addInitScript(() => {
    localStorage.setItem('tipsSeen', '1');
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('opt:tableHow', '0');
  });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu });
  await cdp.send('Network.enable');
  if (profile.network) await cdp.send('Network.emulateNetworkConditions', profile.network);
  let bytes = 0;
  cdp.on('Network.loadingFinished', (e) => (bytes += e.encodedDataLength));
  const out = {};
  const step = async (name, run) => {
    bytes = 0;
    const t = Date.now();
    await run();
    out[name] = { ms: Date.now() - t, kb: bytes / 1024 };
  };
  await step('home', async () => {
    await page.goto(`${SITE}/`);
    await page.waitForSelector('#start-form button.primary', { state: 'visible' });
  });
  const room = `perf${Math.random().toString(36).slice(2, 7)}`;
  await step('join', async () => {
    await page.goto(`${SITE}/r/${room}?debug=1`);
    await page.waitForSelector('#name', { state: 'visible' });
  });
  await page.fill('#name', 'Robin');
  await step('room', async () => {
    await page.click('#name-form button.primary');
    await page.waitForFunction(() => !!document.documentElement.dataset.swmTransport);
  });
  await page.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 });
  await page.waitForTimeout(2500);
  await step('game', async () => {
    await page.evaluate(() => window.__swmLab.run('games.open.classics'));
    await page.waitForFunction(() => {
      const p = document.querySelector('#game-stage .cl-picker');
      return p && !p.hidden && p.getBoundingClientRect().height > 0;
    }, null, { timeout: 20000 });
  });
  await ctx.close();
  return out;
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

(async () => {
  const browser = await chromium.launch();
  for (const [name, profile] of Object.entries(PROFILES)) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await visit(browser, profile));
    for (const s of ['home', 'join', 'room', 'game']) {
      const ms = median(runs.map((r) => r[s].ms));
      const kb = median(runs.map((r) => r[s].kb));
      console.log(`${name.padEnd(6)} ${s.padEnd(5)} ${String(ms).padStart(5)} ms  ${kb.toFixed(0).padStart(4)} kB on the wire  (runs ${runs.map((r) => r[s].ms).join(', ')})`);
    }
  }
  await browser.close();
})();
