// The owner's test board (a static page at a hidden address in apps/web/public/o-*/): it loads under the site's CSP
// without errors, stays out of search (meta + X-Robots-Tag), draws board.data.js, and the ticket follows the ticks,
// notes and decisions, also after a reload; it fits a phone without sideways scroll.
//
//   npm run build -w @swm/web && npm run dev -w @swm/server, then: node scripts/harness/owner-board/run.cjs [site]
//   (the built site on wrangler dev, :8787 by default: Vite's dev server has no _headers and no folder index pages)
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:8787';
const pub = path.join(__dirname, '../../../apps/web/public');
const dir = fs.readdirSync(pub).find((d) => /^o-[A-Za-z0-9]{24}$/.test(d));
let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
};

(async () => {
  check(!!dir, 'the board folder exists in public/');
  if (!dir) process.exit(1);
  global.window = {};
  require(path.join(pub, dir, 'board.data.js'));
  const data = global.window.SIDELIT_BOARD;
  const ids = data.tests.map((t) => t.id);
  check(new Set(ids).size === ids.length && data.tests.every((t) => t.group && t.title && Array.isArray(t.steps) && ['solo', 'tabs', 'second', 'friend', 'soon'].includes(t.filter)),
    'board.data.js: every test has a group, a known filter, a title, steps and a unique id');
  check(data.road.every((r) => ['done', 'now', 'next'].includes(r.status)) && data.decisions.every((d) => d.id && d.options?.length && (!d.link || d.link.startsWith('https://claude.ai/'))),
    'board.data.js: road statuses known, decisions have options, links only to claude.ai');

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const res = await page.goto(`${SITE}/${dir}/`);
  const h = res.headers();
  check(res.status() === 200, 'the page answers 200', String(res.status()));
  check(/noindex/.test(h['x-robots-tag'] ?? ''), 'X-Robots-Tag: noindex on the page', h['x-robots-tag']);
  check(/script-src 'self'/.test(h['content-security-policy'] ?? ''), 'the site\'s strict CSP applies', h['content-security-policy']);
  const robots = await page.getAttribute('meta[name="robots"]', 'content');
  check(/noindex/.test(robots ?? '') && /nofollow/.test(robots ?? ''), 'meta robots noindex, nofollow', robots);
  await page.waitForSelector('.item');
  check((await page.locator('#groups .item').count()) === data.tests.length, `all ${data.tests.length} tests drawn`);
  check(errors.length === 0, 'no errors or CSP refusals in the console', errors.join(' | '));
  const out = () => page.inputValue('#out');
  check(/Henüz bir şey işaretlemedin/.test(await out()), 'an empty ticket says nothing is ticked yet');

  const first = data.tests[0];
  await page.click(`.item[data-id="${first.id}"] button[data-v="ok"]`);
  check((await out()).startsWith('Deneme panosu sonuçlarım:\n✅ Çalışıyor:\n- ' + first.title), 'a ✅ puts the test in the ticket', await out());
  check((await page.textContent('#s-ok')) === '1', 'the ✅ count is 1');
  await page.fill(`.item[data-id="${first.id}"] .note`, 'all three devices move');
  check((await out()).includes(`- ${first.title} — not: all three devices move`), 'its note joins the ticket line');
  const second = data.tests[1];
  await page.click(`.item[data-id="${second.id}"] button[data-v="bad"]`);
  check((await out()).includes('❌ Sorunlu:\n- ' + second.title), 'a ❌ goes under "Sorunlu"');

  await page.click('#tab-dec');
  const d = data.decisions[1];
  await page.click(`#decisions .item[data-id="${d.id}"] button:has-text("${d.options[0]}")`);
  check((await out()).includes(`🗳️ Kararlarım:\n- ${d.title.split(':')[0]}: ${d.options[0]}`), 'a decision joins the ticket');
  await page.click('#tab-road');
  check((await page.locator('#road .step').count()) === data.road.length, 'the road shows every step');

  await page.reload();
  await page.waitForSelector('.item', { state: 'attached' });
  check(await page.isVisible('#p-road'), 'after a reload the last tab is open again');
  const kept = await out();
  check(kept.includes(first.title) && kept.includes('all three devices move') && kept.includes(d.options[0]), 'after a reload the ticks, notes and decisions are kept');
  await page.click('#tab-test');
  await page.click('.chip[data-f="soon"]');
  const soonShown = await page.locator('#groups .item').count();
  check(soonShown === data.tests.filter((t) => t.soon || t.filter === 'soon').length, 'the "Yakında" filter shows only the soon tests', String(soonShown));
  await page.click(`.chip[data-f="all"]`);
  await page.click(`.item[data-id="${first.id}"] button[data-v="ok"]`);
  check(!(await out()).includes('✅ Çalışıyor:'), 'a second press on ✅ takes the tick back');

  // A phone: no sideways scroll, the ticket stays on screen.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const p2 = await phone.newPage();
  await p2.goto(`${SITE}/${dir}/`);
  await p2.waitForSelector('.item');
  const fit = await p2.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth, tb: Math.round(document.querySelector('.ticket').getBoundingClientRect().bottom) }));
  check(fit.sw <= fit.w && fit.tb <= 844, 'on a phone: no sideways scroll, the ticket at the bottom', JSON.stringify(fit));
  // Private windows: storage that throws must not break the page.
  const locked = await browser.newContext();
  await locked.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  });
  const p3 = await locked.newPage();
  const errs3 = [];
  p3.on('pageerror', (e) => errs3.push(String(e)));
  await p3.goto(`${SITE}/${dir}/`);
  await p3.waitForSelector('.item');
  await p3.click(`.item[data-id="${first.id}"] button[data-v="skip"]`);
  check(errs3.length === 0 && (await p3.inputValue('#out')).includes('⏭ Atladım:'), 'without storage the board still works', errs3.join(' | '));

  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ owner board: harness passed');
  process.exit(failed ? 1 : 0);
})();
