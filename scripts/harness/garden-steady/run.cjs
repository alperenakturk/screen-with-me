// 🌱 WG2: Window Garden keeps still while you play, and its new extras work. Every button's box is recorded after each
// step (seeds, picking pots, planting, growing, watering, a bloom, picking it, Turkish) and none may move; then the 🎨
// page: a window view and a pot colour (shown and saved), and the compost (5 petals → a seed). ("Water all" and the
// rules: packages/shared/src/games/garden.test.ts.)
//
//   npm run dev (a local lab server), then: node scripts/harness/garden-steady/run.cjs [site]   (SIZES=laptop,phone)
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:5173';
const SIZES = (process.env.SIZES || 'laptop,phone').split(',');
const DEV = { laptop: { viewport: { width: 1366, height: 768 } }, phone: devices['iPhone 13'], tablet: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true } };
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  for (const size of SIZES) {
    const ctx = await browser.newContext(DEV[size]);
    await ctx.addInitScript(() => {
      for (const [k, v] of Object.entries({ lang: 'en', name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', 'windowGarden:howSeen': '1' })) localStorage.setItem(k, v);
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${SITE}/r/gs${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
    await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#game-btn'), null, { timeout: 20000 });
    await wait(1500);
    const run = (id) => page.evaluate((id) => window.__swmLab.run(id).then((l) => l.text), id);
    await run('games.open.garden');
    await page.waitForSelector('#game-stage .wg-pot', { timeout: 15000 });
    await wait(800);

    // 1. Nothing moves.
    const boxes = () =>
      page.evaluate(() => {
        const out = {};
        const n = {};
        for (const b of document.querySelectorAll('#game-stage .wg button, #game-stage .wg-scene, #game-stage .wg-action')) {
          if (!b.offsetWidth) continue;
          const key = `${[...b.classList].filter((c) => !['on', 'main', 'full', 'lamp', 'give'].includes(c)).join('.')}${b.dataset.pot ?? ''}`;
          n[key] = (n[key] ?? 0) + 1;
          const r = b.getBoundingClientRect();
          // An action button is the same place whatever it says: keep its right edge and its row.
          out[`${key}#${n[key]}`] = b.classList.contains('wg-btn') ? [Math.round(r.right), Math.round(r.y), Math.round(r.height)] : [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
        }
        return out;
      });
    let prev = await boxes();
    const moved = [];
    const step = async (label, fn) => {
      await fn();
      await wait(600);
      const now = await boxes();
      for (const [k, b] of Object.entries(now)) if (prev[k] && prev[k].some((v, i) => Math.abs(v - b[i]) > 1)) moved.push(`${label}: ${k} ${prev[k]} → ${b}`);
      prev = now;
    };
    const click = (sel) => page.evaluate((s) => document.querySelector(s)?.click(), sel);
    const action = (re) => page.evaluate((src) => [...document.querySelectorAll('#game-stage .wg-action-buttons button')].find((b) => new RegExp(src, 'i').test(b.textContent) && !b.disabled)?.click(), re.source);
    await step('seeds', () => run('garden.seeds'));
    for (const i of [1, 2, 0, 1]) await step(`pot ${i}`, () => click(`#game-stage .wg-pot[data-pot="${i}"]`));
    await step('plant', () => page.evaluate(() => document.querySelector('#game-stage .wg-action-buttons button:not(:disabled)')?.click()));
    await step('pot 2', () => click('#game-stage .wg-pot[data-pot="2"]'));
    await step('plant 2', () => page.evaluate(() => document.querySelector('#game-stage .wg-action-buttons button:not(:disabled)')?.click()));
    await step('grow', () => run('garden.grow'));
    await step('pot 0', () => click('#game-stage .wg-pot[data-pot="0"]'));
    await step('water', () => action(/water|sula/));
    await step('bloom', () => run('garden.bloom'));
    await step('pick', () => action(/pick|topla/));
    for (const i of [1, 2, 0]) await step(`pot ${i} again`, () => click(`#game-stage .wg-pot[data-pot="${i}"]`));
    await step('Turkish', () => page.evaluate(() => { localStorage.setItem('lang', 'tr'); document.documentElement.lang = 'tr'; dispatchEvent(new Event('langchange')); }));
    for (const i of [1, 2, 0]) await step(`TR pot ${i}`, () => click(`#game-stage .wg-pot[data-pot="${i}"]`));
    check(moved.length === 0, `${size}: no button or panel moves while playing (${Object.keys(prev).length} watched)`, moved.slice(0, 6).join(' | '));
    await page.evaluate(() => { localStorage.setItem('lang', 'en'); document.documentElement.lang = 'en'; dispatchEvent(new Event('langchange')); });
    await wait(400);

    // 2. The 🎨 page: a view, a pot colour, the compost.
    await run('garden.decor');
    await wait(500);
    check(await page.evaluate(() => !!document.querySelector('#game-stage .wg-page:not([hidden]) .wg-chip-view-sea')), `${size}: the 🎨 page shows the window views`);
    const fits = await page.evaluate(() => { const p = document.querySelector('#game-stage .wg-page'); return p && p.scrollHeight <= p.clientHeight + 1; });
    check(fits, `${size}: the 🎨 page fits without scrolling`);
    await click('#game-stage .wg-chip-view-sea');
    await wait(300);
    await click('#game-stage .wg-swatch-sage');
    await wait(300);
    const look = await page.evaluate(() => ({
      sea: getComputedStyle(document.querySelector('#game-stage .wg-view [data-view="sea"]')).display !== 'none',
      pots: document.querySelector('#game-stage .wg')?.dataset.pots,
      save: JSON.parse(Object.entries(localStorage).find(([k, v]) => /windowGarden/.test(k) && /"pots"/.test(v))?.[1] || '{}'),
    }));
    check(look.sea && look.pots === 'sage' && look.save.view === 'sea' && look.save.potColor === 'sage', `${size}: the sea view and sage pots show and are saved`, JSON.stringify({ sea: look.sea, pots: look.pots, view: look.save.view, potColor: look.save.potColor }));
    const before = look.save;
    await page.evaluate(() => [...document.querySelectorAll('#game-stage .wg-page button')].find((b) => /→/.test(b.textContent))?.click());
    await wait(400);
    const after = await page.evaluate(() => JSON.parse(Object.entries(localStorage).find(([k, v]) => /windowGarden/.test(k) && /"pots"/.test(v))?.[1] || '{}'));
    check(after.petals === before.petals - 5 && after.seeds.common === before.seeds.common + 1, `${size}: compost turns 5 petals into a seed`, `${before.petals}/${before.seeds?.common} → ${after.petals}/${after.seeds?.common}`);
    await click('#game-stage .wg-page-close');

    check(errors.length === 0, `${size}: no page errors`, errors.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `${fails} failed` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
