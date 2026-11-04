// Theme previews come at once (card R8): on a slow network the theme window's pictures (mascot + scene) are ready
// ≤ 150 ms after it opens, because opening the profile menu (where "Change theme" sits) already fetched them.
// Control: the theme window opened from a fresh page without the menu still has pictures loading.
//
//   npm run dev, then: node scripts/harness/theme-previews/run.cjs [site]
const { chromium } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
};

async function run(browser, warmUp) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  await page.goto(`${SITE}/`);
  await page.evaluate(() => {
    for (const [k, v] of Object.entries({ name: 'Alex', avatar: 'wizard', lang: 'en', 'opt:autoInvite': '0', tipsSeen: '1' })) localStorage.setItem(k, v);
  });
  await page.goto(`${SITE}/r/tp${Math.random().toString(36).slice(2, 8)}#back`);
  await page.waitForFunction(() => !!document.querySelector('#settings-open'), null, { timeout: 15000 });
  await page.waitForTimeout(1000);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 300, downloadThroughput: 400_000, uploadThroughput: 200_000 });
  if (warmUp) {
    await page.click('.profile-btn');
    await page.locator('#settings-themes button.btn').first().waitFor({ timeout: 5000 });
    await page.waitForTimeout(6000); // a person looking at the menu
  }
  const r = await page.evaluate(async () => {
    const t0 = performance.now();
    document.querySelector('#settings-themes button.btn').click();
    const imgs = () => [...document.querySelectorAll('.theme-dialog .theme-preview img')];
    while (performance.now() - t0 < 4000) {
      const list = imgs();
      if (list.length && list.every((i) => i.complete && i.naturalWidth > 0)) return { ms: performance.now() - t0, n: list.length };
      await new Promise((res) => requestAnimationFrame(res));
    }
    const list = imgs();
    return { ms: -1, n: list.length, ready: list.filter((i) => i.complete && i.naturalWidth > 0).length };
  });
  await ctx.close();
  return r;
}

(async () => {
  const browser = await chromium.launch();
  const warm = await run(browser, true);
  check(warm.n > 3 && warm.ms >= 0 && warm.ms <= 150, 'after the profile menu opened, every preview is ready ≤ 150 ms after the window opens', JSON.stringify(warm));
  const cold = await run(browser, false);
  check(cold.ms < 0 || cold.ms > 150, 'control: without the menu first, the pictures still had to load', JSON.stringify(cold));
  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Theme previews harness passed');
  process.exit(failed ? 1 : 0);
})();
