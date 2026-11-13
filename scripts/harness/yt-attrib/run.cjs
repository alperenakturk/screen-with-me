// Card Y1 (YouTube Developer Policies III.F.2, audit prep): every list of YouTube API results says "Results from
// YouTube" and links YouTube's Terms of Service (new tab): the link box's search results, the Shorts view's ＋ Add
// search, and the ♾ window with 🎲 Discover and ✨ More like this. On a computer and a phone, EN + TR. The search API
// is stubbed (no key in the cloud / CI), so this runs anywhere.
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/yt-attrib/run.cjs [site] [screenshot folder]
const { chromium, devices } = require('playwright');
const fs = require('fs');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || '/tmp/yt-attrib';
fs.mkdirSync(OUT, { recursive: true });
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};
const ours = `(location.port === '8787' || location.port === '5173' || location.hostname.includes('swm-server'))`;
const items = Array.from({ length: 4 }, (_, i) => ({ id: `aqz-KE-bpK${i}`, title: `Sample video ${i + 1}`, channel: 'Sample channel', duration: 120 + i, live: false, short: i % 2 === 1 }));

/** The visible attribution line inside `scope`, with its Terms link. */
const attribution = (page, scope) =>
  page.evaluate((scope) => {
    const line = [...document.querySelectorAll(`${scope} .yt-attrib`)].find((e) => e.getClientRects().length > 0);
    const link = line?.querySelector('a');
    return line ? { text: line.textContent.trim(), href: link?.href, target: link?.target, rel: link?.rel } : null;
  }, scope);
const good = (a, lang) => !!a && a.href === 'https://www.youtube.com/t/terms' && a.target === '_blank' && a.rel.includes('noopener') && (lang === 'tr' ? /YouTube’dan/.test(a.text) && /Hizmet Şartları/.test(a.text) : /from YouTube/.test(a.text) && /Terms of Service/.test(a.text));

(async () => {
  const browser = await chromium.launch();
  for (const [label, opts] of [
    ['computer', { viewport: { width: 1366, height: 768 } }],
    ['phone', { ...devices['Pixel 7'] }],
  ]) {
    for (const lang of ['en', 'tr']) {
      const ctx = await browser.newContext(opts);
      await ctx.addInitScript(`${ours} && (localStorage.setItem('lang', '${lang}'), localStorage.setItem('tipsSeen', '1'), localStorage.setItem('opt:autoInvite', '0'))`);
      await ctx.route('**/api/youtube/search**', (route) => route.fulfill({ json: { items, next: null } }));
      const page = await ctx.newPage();
      const where = `${label} ${lang}`;
      await page.goto(`${SITE}/r/yt${Math.random().toString(36).slice(2, 7)}`);
      await page.fill('#name', 'Alex');
      await page.click('#name-form button.primary');
      await page.waitForSelector('.room');
      await page.waitForTimeout(1500);

      // 1) The link box's search (on a phone it sits in the Search tab, PH1).
      if (!(await page.isVisible('#media-input'))) {
        await page.click('#ph-tab-search');
        await page.waitForTimeout(400);
      }
      await page.fill('#media-input', 'sunset timelapse');
      await page.press('#media-input', 'Enter');
      await page.waitForSelector('.search-list', { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(300);
      const a1 = await attribution(page, '#media-form, .ph-sheet, body');
      check(good(a1, lang), `${where}: link-box search results say "from YouTube" + Terms link`, a1);
      await page.screenshot({ path: `${OUT}/${label}-${lang}-search.png` });

      // Into the Shorts view (a Short from the results; the player itself may not load in the cloud).
      await page.keyboard.press('Escape');
      await page.evaluate(() => {
        const i = document.querySelector('#media-input');
        i.value = 'https://www.youtube.com/shorts/aqz-KE-bpKQ';
        (i.form.querySelector('[value="load"]') ?? i.form).click?.();
        i.form.requestSubmit(i.form.querySelector('[value="load"]') ?? undefined);
      });
      await page.waitForFunction(() => document.documentElement.classList.contains('shorts-view'), null, { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(800);

      // 2) ＋ Add's Shorts search (its window carries the line).
      await page.evaluate(() => (document.querySelector('#shorts-add') ?? null)?.click());
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        const i = document.querySelector('#shorts-add-input');
        if (!i) return;
        i.value = 'cats';
        i.form.requestSubmit();
      });
      await page.waitForTimeout(800);
      const a2 = await attribution(page, '#shorts-add-form');
      check(good(a2, lang), `${where}: Shorts ＋ Add search says "from YouTube" + Terms link`, a2);
      await page.screenshot({ path: `${OUT}/${label}-${lang}-shorts-add.png` });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);

      // 3 + 4) The ♾ window: 🎲 Discover and ✨ More like this share it.
      await page.evaluate(() => (document.querySelector('#shorts-feed') ?? null)?.click());
      await page.waitForTimeout(500);
      const a3 = await attribution(page, '#shorts-feed-form');
      const both = await page.evaluate(() => ({ like: !!document.querySelector('#shorts-feed-form #shorts-like'), pools: !!document.querySelector('#shorts-feed-form #shorts-pools') }));
      check(good(a3, lang) && both.like && both.pools, `${where}: the ♾ window (Discover + More like this) says "from YouTube" + Terms link`, { a3, both });
      await page.screenshot({ path: `${OUT}/${label}-${lang}-feed.png` });
      await ctx.close();
    }
  }
  // The Help page says the same.
  {
    const page = await (await browser.newContext()).newPage();
    await page.goto(`${SITE}/help.html`);
    const help = await page.evaluate(() => [...document.querySelectorAll('a[href="https://www.youtube.com/t/terms"]')].length);
    check(help >= 2, 'Help page links YouTube\'s Terms of Service (EN + TR)', help);
  }
  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ YouTube results say where they come from, with the Terms link, everywhere');
  process.exit(failed ? 1 : 0);
})();
