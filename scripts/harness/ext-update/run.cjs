// Outdated-extension notice (ext-update.ts, BH13): the site compares the bridge's data-swm-extension with
// /extension-version.json. Checks: the top bar's "Extension" link gets its dot; on the home page the bubble shows by
// the link; in a fresh room the bubble never shows together with a first-time tip (it waits for them) and then shows;
// on a phone (the link hidden) no bubble points at nothing and the version isn't marked as seen.
// Needs the built site on wrangler dev:
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/ext-update/run.cjs [http://localhost:8787]
const { chromium, devices } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:8787';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};

// The bridge marks <html> once the page is there; an old version, and a log of what bubbles are on screen together.
const INIT = () => {
  document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.dataset.swmExtension = '0.9.90';
  });
  window.__both = 0;
  window.__ext = 0;
  new MutationObserver(() => {
    const ext = [...document.querySelectorAll('.hint-bubble')].some((b) => b.textContent.includes('v0.9.90'));
    if (ext) window.__ext++;
    if (ext && document.querySelector('.first-tip')) window.__both++;
  }).observe(document, { subtree: true, childList: true });
};

const extBubble = (page) =>
  page.evaluate(() => {
    const b = [...document.querySelectorAll('.hint-bubble')].find((x) => x.textContent.includes('v0.9.90'));
    const link = document.querySelector('.topbar a.nav-link[href="/extension.html"]');
    if (!b || !link) return null;
    const r = b.getBoundingClientRect();
    const l = link.getBoundingClientRect();
    return { dx: Math.abs(r.left + r.width / 2 - (l.left + l.width / 2)), gap: Math.min(Math.abs(r.bottom - l.top), Math.abs(r.top - l.bottom)) };
  });

(async () => {
  const browser = await chromium.launch();

  // 1. Home page, computer.
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await ctx.addInitScript(INIT);
    const page = await ctx.newPage();
    await page.goto(SITE + '/');
    await page.waitForFunction(() => document.querySelector('.topbar a.ext-update'), null, { timeout: 10000 }).catch(() => {});
    check(await page.evaluate(() => !!document.querySelector('.topbar a.nav-link.ext-update')), 'home: the Extension link has the dot');
    await page.waitForTimeout(800);
    const b = await extBubble(page);
    check(!!b && b.dx < 140 && b.gap < 20, 'home: the bubble sits by the Extension link', JSON.stringify(b));
    await ctx.close();
  }

  // 2. A fresh room, computer: the first-time tips first, the bubble after them, never both.
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await ctx.addInitScript(INIT);
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/ext${Math.random().toString(36).slice(2, 8)}`);
    await page.fill('#name', 'Alex');
    await page.keyboard.press('Enter');
    await page.waitForSelector('.first-tip', { timeout: 15000 }).catch(() => {});
    check(await page.evaluate(() => !!document.querySelector('.first-tip')), 'room: the first-time tips show');
    await page.waitForTimeout(2500);
    check((await page.evaluate(() => window.__ext)) === 0, 'room: no update bubble while a tip is open');
    for (let i = 0; i < 4 && (await page.$('.first-tip')); i++) {
      await page.click('.first-tip .btn.primary');
      await page.waitForTimeout(300);
    }
    await page.waitForFunction(() => window.__ext > 0, null, { timeout: 6000 }).catch(() => {});
    const b = await extBubble(page);
    check(!!b && b.dx < 140, 'room: the bubble shows once the tips are done', JSON.stringify(b));
    check((await page.evaluate(() => window.__both)) === 0, 'room: the bubble and a tip were never on screen together');
    await ctx.close();
  }

  // 3. Phone: the link is hidden, so no bubble, and the new version isn't marked as seen.
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    await ctx.addInitScript(INIT);
    const page = await ctx.newPage();
    await page.goto(SITE + '/');
    await page.waitForTimeout(5000);
    check((await page.evaluate(() => window.__ext)) === 0, 'phone: no bubble pointing at a hidden link');
    check((await page.evaluate(() => localStorage.getItem('extUpdateSeen'))) === null, 'phone: the version is not marked as seen');
    await ctx.close();
  }

  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ all passed');
  process.exit(fails ? 1 : 0);
})();
