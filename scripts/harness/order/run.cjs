// BH5 "order of things" (docs/internal/order-of-things.md): records when each first-entry thing appears in a real
// browser and checks the order: the intro first, the invite window only after it, the first-time tips only after the
// invite window closed; nothing of the room before the first welcome; nothing twice; a reload brings none of them.
// Needs the built site on wrangler dev:
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/order/run.cjs [http://localhost:8787]
const { chromium } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:8787';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};

// Runs in the page from the first script on: a timeline of first appearances / removals (ms since navigation).
const RECORD = () => {
  const log = (window.__order = []);
  const seen = new Set();
  const mark = (what) => log.push({ what, at: Math.round(performance.now()) });
  const look = () => {
    const now = {
      intro: !!document.querySelector('.swm-intro'),
      invite: !!document.querySelector('.invite-dialog:not([hidden])'),
      tip: !!document.querySelector('.first-tip'),
      joined: document.documentElement.dataset.swmJoined === '1',
    };
    for (const [k, on] of Object.entries(now)) {
      if (on && !seen.has(k)) { seen.add(k); mark(k + '+'); }
      if (!on && seen.has(k) && !seen.has(k + '-')) { seen.add(k + '-'); mark(k + '-'); }
      if (on && seen.has(k + '-') && !seen.has(k + '+2')) { seen.add(k + '+2'); mark(k + '+2'); }
    }
  };
  new MutationObserver(look).observe(document, { subtree: true, childList: true, attributes: true });
};

(async () => {
  const browser = await chromium.launch();
  const room = `ord${Math.random().toString(36).slice(2, 8)}`;
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    if (!sessionStorage.getItem('order:set')) {
      sessionStorage.setItem('order:set', '1');
      localStorage.setItem('lang', 'en');
      localStorage.setItem('opt:autoInvite', '1');
    }
  });
  await ctx.addInitScript(RECORD);
  const page = await ctx.newPage();
  await page.goto(`${SITE}/r/${room}`);
  await page.fill('#name', 'Alex');
  await page.click('#name-form button.primary');
  await page.waitForSelector('.invite-dialog:not([hidden])', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForSelector('.first-tip', { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(500);
  const t = await page.evaluate(() => window.__order);
  const at = (w) => t.find((e) => e.what === w)?.at ?? null;
  console.log('     timeline:', t.map((e) => `${e.what}@${e.at}`).join(' '));
  check(at('joined+') !== null && at('intro+') !== null && at('intro+') >= at('joined+') - 50, 'the intro starts with the first welcome, not before');
  check(at('invite+') !== null && at('intro-') !== null && at('invite+') >= at('intro-'), 'the invite window opens only after the intro has gone');
  check(at('tip+') !== null && at('invite-') !== null && at('tip+') >= at('invite-'), 'the first-time tips come only after the invite window closed');
  check(at('tip+') !== null && at('intro-') !== null && at('tip+') >= at('intro-'), 'the first-time tips never sit under the intro');
  check(!t.some((e) => e.what.endsWith('+2')), 'nothing shows twice', t.filter((e) => e.what.endsWith('+2')).map((e) => e.what).join(','));

  // Close the tips, reload: none of the first-entry things again.
  await page.evaluate(() => document.querySelectorAll('.first-tip').forEach((n) => n.remove()));
  await page.reload();
  await page.waitForSelector('.room', { timeout: 10000 });
  await page.waitForTimeout(3500);
  const r = await page.evaluate(() => window.__order);
  check(!r.some((e) => /^(intro|invite|tip)\+/.test(e.what)), 'a reload brings no intro, invite window or tips', r.map((e) => e.what).join(' '));
  check(r.some((e) => e.what === 'joined+'), 'a reload still marks the tab as in the room after its welcome');

  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ Order of things');
  process.exit(fails ? 1 : 0);
})();
