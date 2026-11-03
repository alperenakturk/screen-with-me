// Extension popup (0.9.89): with no room open it offers the home page only; with a room open in another tab its main
// button switches to that tab. Needs Playwright (preinstalled in cloud sessions) and the dev extension + `npm run dev`:
//   npm run build:extension:dev
//   NODE_PATH=$(npm root -g) node scripts/harness/popup/run.cjs apps/extension/dist [screenshot.png]
const { chromium } = require('playwright');
const ext = process.argv[2];
let fails = 0;
const check = (ok, label, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`); if (!ok) fails++; };
(async () => {
  const ctx = await chromium.launchPersistentContext('', {
    headless: true,
    channel: 'chromium',
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`, '--no-sandbox'],
  });
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const id = new URL(sw.url()).host;
  // 1) No room open: the popup offers the home page only.
  let popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForTimeout(500);
  check((await popup.textContent('#action')).includes('Sidelit') && (await popup.isHidden('#action2')), 'no room: "Open Sidelit" only');
  await popup.close();
  // 2) A room open in another tab: "Back to my room" switches to it.
  const room = await ctx.newPage();
  await room.goto('http://localhost:5173/r/popupchk12');
  await room.waitForTimeout(800);
  popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await popup.waitForTimeout(500);
  const main = await popup.textContent('#action');
  check(main.includes('Odama dön') || main.includes('Back to my room'), 'room open elsewhere: main button goes back to it', main);
  check(await popup.isVisible('#action2'), 'second button opens the home page');
  if (process.argv[3]) await popup.screenshot({ path: process.argv[3] });
  await popup.click('#action').catch(() => {});
  await room.waitForTimeout(600);
  const visible = await room.evaluate(() => document.visibilityState);
  check(visible === 'visible', 'the room tab became the active tab', visible);
  await ctx.close();
  console.log(fails ? `✗ ${fails} failed` : '✓ all passed');
  process.exit(fails ? 1 : 0);
})();
