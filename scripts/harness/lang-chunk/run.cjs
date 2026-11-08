// Card PERF1a: only the page's language is downloaded. English lives in the main chunk; the Turkish table is its own
// chunk (`i18n-tr-*.js`), loaded before the site draws when the saved language is Turkish and on a switch to Turkish.
// Checks: an English page never fetches it; a Turkish page fetches it and never shows an English text first (home and
// a room's join card); the TR / EN switch works both ways, and a hover on TR fetches it ahead of the press.
//
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/lang-chunk/run.cjs [http://localhost:8787]
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};
const isTrChunk = (url) => /\/assets\/i18n-tr-[\w-]+\.js$/.test(url);

/** Every text the footer's privacy link ever showed, from the first frame on. */
const WATCH = () => {
  window.__privacyTexts = [];
  new MutationObserver(() => {
    const text = document.querySelector('[data-i18n="privacy"]')?.textContent ?? '';
    if (text && window.__privacyTexts.at(-1) !== text) window.__privacyTexts.push(text);
  }).observe(document, { subtree: true, childList: true, characterData: true });
};

async function open(browser, lang, path) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  if (lang) await context.addInitScript((l) => localStorage.setItem('lang', l), lang);
  await context.addInitScript(WATCH);
  const page = await context.newPage();
  const chunks = [];
  page.on('request', (req) => isTrChunk(req.url()) && chunks.push(req.url()));
  await page.goto(SITE + path, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('[data-i18n="privacy"]')?.textContent, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  return { context, page, chunks };
}

(async () => {
  const browser = await chromium.launch();
  try {
    // How the site stores a language (storage.ts `save`: the plain value); a wrong guess would make every check below lie.
    {
      const { context, page } = await open(browser, null, '/');
      await page.click('.topbar [data-lang="tr"]');
      await page.waitForFunction(() => document.documentElement.lang === 'tr', null, { timeout: 10000 });
      const stored = await page.evaluate(() => localStorage.getItem('lang'));
      check(stored === 'tr', 'a switch to Turkish is saved the way this harness sets it', stored);
      await context.close();
    }

    // English: the Turkish chunk is never fetched.
    {
      const { context, page, chunks } = await open(browser, null, '/');
      const seen = await page.evaluate(() => ({ lang: document.documentElement.lang, texts: window.__privacyTexts }));
      check(seen.lang === 'en' && seen.texts.join() === 'Privacy', 'English home page: English from the first frame', seen);
      check(chunks.length === 0, 'English home page: the Turkish chunk is not downloaded', chunks);

      // The switch: a hover fetches the chunk ahead, the press shows Turkish, EN brings English back.
      await page.hover('.topbar [data-lang="tr"]');
      await page.waitForTimeout(600);
      check(chunks.length === 1, 'hovering TR fetches the Turkish chunk ahead of the press', chunks.length);
      await page.click('.topbar [data-lang="tr"]');
      const tr = await page
        .waitForFunction(() => document.documentElement.lang === 'tr' && document.querySelector('[data-i18n="privacy"]')?.textContent === 'Gizlilik', null, { timeout: 5000 })
        .then(() => true, () => false);
      const pressed = await page.evaluate(() => document.querySelector('.topbar [data-lang="tr"]')?.getAttribute('aria-pressed'));
      check(tr && pressed === 'true', 'TR switches the page to Turkish and marks the TR button', { tr, pressed });
      await page.click('.topbar [data-lang="en"]');
      const en = await page
        .waitForFunction(() => document.documentElement.lang === 'en' && document.querySelector('[data-i18n="privacy"]')?.textContent === 'Privacy', null, { timeout: 5000 })
        .then(() => true, () => false);
      check(en, 'EN switches back to English', en);
      check(chunks.length === 1, 'the Turkish chunk is fetched once', chunks.length);
      await context.close();
    }

    // Turkish: the chunk is in before the first frame, so no English text ever shows.
    for (const [path, what] of [['/', 'home page'], ['/r/langchk1', 'join card']]) {
      const { context, page, chunks } = await open(browser, 'tr', path);
      const seen = await page.evaluate(() => ({ lang: document.documentElement.lang, texts: window.__privacyTexts }));
      check(seen.lang === 'tr' && seen.texts.join() === 'Gizlilik', `Turkish ${what}: Turkish from the first frame`, seen);
      check(chunks.length === 1, `Turkish ${what}: the Turkish chunk is downloaded once`, chunks.length);
      if (path !== '/') {
        const button = await page.evaluate(() => document.querySelector('#name-form button.primary')?.textContent?.trim() ?? '');
        check(/Odaya gir/i.test(button), 'Turkish join card: the button is Turkish', button);
      }
      await context.close();
    }

    // A Turkish page whose chunk can't load (a deploy replaced it) still works, in English.
    {
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
      await context.addInitScript(() => localStorage.setItem('lang', 'tr'));
      await context.route(/\/assets\/i18n-tr-[\w-]+\.js$/, (route) => route.abort());
      const page = await context.newPage();
      await page.goto(SITE + '/', { waitUntil: 'load' });
      const shown = await page
        .waitForFunction(() => document.querySelector('[data-i18n="privacy"]')?.textContent === 'Privacy' && document.querySelector('#start-form'), null, { timeout: 15000 })
        .then(() => true, () => false);
      check(shown, 'Turkish chunk blocked: the site still opens, in English', shown);
      await context.close();
    }
  } finally {
    await browser.close();
  }
  if (failed) {
    console.log(`\n✗ ${failed} check(s) failed`);
    process.exit(1);
  }
  console.log('\n✓ Only the page\'s language is downloaded (card PERF1a)');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
