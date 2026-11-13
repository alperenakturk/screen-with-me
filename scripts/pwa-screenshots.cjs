// PWA1: the two screenshots the manifest offers in the install sheet (Android shows them before "Install"): the home
// page on a phone (narrow, 1080 × 1920) and on a computer (wide, 1920 × 1200), English, the default theme. Run after a
// home page change and commit the two files:
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/pwa-screenshots.cjs [http://localhost:8787]
const { chromium } = require('playwright');
const path = require('path');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = path.join(__dirname, '../apps/web/public/screenshots');

(async () => {
  const browser = await chromium.launch();
  for (const [file, opts] of [
    ['home-phone.jpg', { viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
    ['home-wide.jpg', { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 }],
  ]) {
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript(() => {
      localStorage.setItem('lang', 'en');
      localStorage.setItem('iosHintSeen', '1');
    });
    const page = await ctx.newPage();
    await page.goto(`${SITE}/`);
    await page.waitForSelector('.hm-first');
    // First look: the phone shot ends cleanly under the two start buttons (the small print below them is cut off
    // at 640 px otherwise), and the "made for computers" note doesn't argue against installing.
    await page.addStyleTag({ content: '.touch-note, .hm-save, #shorts-door, .hm-cont { visibility: hidden !important; }' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 82 });
    console.log(`wrote ${file}`);
    await ctx.close();
  }
  await browser.close();
})();
