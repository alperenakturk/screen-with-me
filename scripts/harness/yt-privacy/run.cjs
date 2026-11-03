// YouTube privacy (card 6a, security review 2 H2): a room page with nothing from YouTube on it makes no request to
// www.youtube.com (the player API loads only when a YouTube item is about to play), and the YouTube player comes from
// the privacy-enhanced host youtube-nocookie.com. Needs Playwright and the site:
//   npm run dev   (or the built site on wrangler dev, which serves _headers: use that for the CSP check)
//   node scripts/harness/yt-privacy/run.cjs [http://localhost:5173]
const { chromium } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:5173';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};

(async () => {
  const browser = await chromium.launch();
  for (const [label, viewport] of [['computer', { width: 1366, height: 768 }], ['phone', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport });
    await ctx.addInitScript(() => {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', 'en');
      localStorage.setItem('opt:autoInvite', '0');
      // R3-5: every CSP refusal is kept, so the trimmed policy (no s.ytimg.com, no www.youtube.com frames) is checked.
      window.__csp = [];
      document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    const page = await ctx.newPage();
    const youtube = [];
    page.on('request', (r) => {
      const host = new URL(r.url()).hostname;
      if (/(^|\.)youtube\.com$|(^|\.)youtube-nocookie\.com$|(^|\.)ytimg\.com$/.test(host)) youtube.push(r.url());
    });
    await page.goto(`${SITE}/r/ytp${Math.random().toString(36).slice(2, 7)}`);
    await page.fill('#name', 'Alex');
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await page.waitForTimeout(3000);
    check(youtube.length === 0, `${label}: a room with nothing playing asks YouTube for nothing`, youtube.slice(0, 3).join(' '));
    if (label === 'computer') {
      await page.fill('#media-input', 'https://www.youtube.com/watch?v=M7lc1UVf-VE');
      await page.press('#media-input', 'Enter');
      await page.waitForSelector('#player iframe', { timeout: 15000 }).catch(() => {});
      const src = await page.evaluate(() => document.querySelector('#player iframe')?.src ?? '');
      check(src.startsWith('https://www.youtube-nocookie.com/embed/M7lc1UVf-VE'), 'a YouTube video plays from youtube-nocookie.com', src.slice(0, 80));
      check(youtube.some((u) => u.includes('/iframe_api')), 'the player API loaded with the first YouTube video');
      await page.waitForTimeout(3000);
      const refused = await page.evaluate(() => window.__csp);
      check(refused.length === 0, 'no CSP refusals with the YouTube player (R3-5: s.ytimg.com and www.youtube.com frames dropped)', refused.join(' | '));
    }
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ YouTube privacy');
  process.exit(fails ? 1 : 0);
})();
