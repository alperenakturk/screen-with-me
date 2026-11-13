// 0.9.97.128: on a phone the game head's ⋯ opens a bottom sheet with "Leave table" and "Close table". The sheet lives
// on the page, and at the sheets' usual z-index it opened under the game stage, so every table's lobby covered it (lane
// A's PH1 first look: Draw & Guess). For every table the Test Lab can open (its "Open a table" commands, so a new
// table is covered by itself): ⋯ is tappable, both sheet buttons are the topmost element at their centre, and a tap
// on "Leave table" really leaves (a lobby needs no "are you sure").
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 --var SWM_LOCAL_UNPACED:1)
//   NODE_PATH=$(npm root -g) node scripts/harness/game-more/run.cjs [site]
const { chromium, devices } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:8787';
let fails = 0;
const check = (ok, label, extra) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra !== undefined && !ok ? ' → ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`);
  if (!ok) fails++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 8000) {
  for (let i = 0; i < ms / 100; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await wait(100);
  }
  return null;
}

/** What a finger at the centre of each visible button in `sel` would hit: 'ok', or what covers it. */
const topmost = (page, sel) =>
  page.evaluate((sel) => {
    const out = {};
    for (const b of document.querySelectorAll(sel)) {
      const r = b.getBoundingClientRect();
      if (b.hidden || !r.width || !r.height) continue;
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      const name = [...b.classList].find((c) => c.startsWith('game-')) || b.className;
      out[name] = b.contains(hit) ? 'ok' : `covered by ${hit?.id ? '#' + hit.id : ''}.${String(hit?.className || hit?.tagName).split(' ').join('.')}`;
    }
    return out;
  }, sel);

async function person(browser, opts, lang) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript((lang) => {
    for (const [k, v] of Object.entries({ lang, name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1' })) localStorage.setItem(k, v);
  }, lang);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${SITE}/r/gm${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
  await page.waitForFunction(() => !!window.__swmLab?.list?.().some((c) => c.id.startsWith('games.open.')), null, { timeout: 20000 });
  await wait(2500);
  await page.evaluate(() => document.querySelector('.swm-intro')?.remove());
  return { ctx, page, errors };
}

(async () => {
  const browser = await chromium.launch();
  const lang = process.env.LANG_GM || 'en';
  const probe = await person(browser, devices['iPhone 13'], lang);
  const tables = await probe.page.evaluate(() =>
    window.__swmLab
      .list()
      .filter((c) => c.id.startsWith('games.open.') && /^Open a table/.test(typeof c.title === 'string' ? c.title : c.title?.en ?? ''))
      .map((c) => c.id.slice('games.open.'.length)),
  );
  await probe.ctx.close();
  check(tables.length >= 6, `the lab lists the tables (${tables.join(', ')})`, tables);
  for (const kind of tables) {
    const { ctx, page, errors } = await person(browser, devices['iPhone 13'], lang);
    await page.evaluate((k) => window.__swmLab.run(`games.open.${k}`), kind);
    const more = await until(() => page.evaluate(() => {
      const b = document.querySelector('#game-stage .game-more');
      return !!b && b.getBoundingClientRect().width > 0 && !document.querySelector('#game-stage')?.hidden;
    }));
    // A first-time "How to play" card may sit over the table; it is not what this checks.
    await page.evaluate(() => [...document.querySelectorAll('#game-stage button')].find((b) => /^(Skip|Atla)$/.test(b.textContent.trim()))?.click());
    await wait(600);
    check(!!more, `${kind}: the head shows ⋯ on a phone`);
    if (!more) {
      await ctx.close();
      continue;
    }
    const head = await topmost(page, '#game-stage .game-more');
    check(head['game-more'] === 'ok', `${kind}: ⋯ is on top`, head);
    await page.tap('#game-stage .game-more');
    const open = await until(() => page.evaluate(() => {
      const pop = document.querySelector('.game-more-pop');
      return !!pop && !pop.hidden;
    }), 3000);
    check(!!open, `${kind}: ⋯ opens the sheet`);
    const hits = await topmost(page, '.game-more-pop button');
    check(hits['game-leave'] === 'ok', `${kind}: "Leave table" is on top in the sheet`, hits);
    check(!('game-end' in hits) || hits['game-end'] === 'ok', `${kind}: "Close table" is on top in the sheet (when shown)`, hits);
    if (hits['game-leave'] === 'ok') {
      await page.tap('.game-more-pop .game-leave');
      const left = await until(() => page.evaluate(() => {
        const stage = document.querySelector('#game-stage');
        return !stage || stage.hidden || !stage.querySelector('.game-fit')?.childElementCount;
      }), 5000);
      check(!!left, `${kind}: a tap on "Leave table" leaves the table`);
    }
    check(!errors.length, `${kind}: no page errors`, errors);
    await ctx.close();
  }
  await browser.close();
  if (fails) {
    console.log(`✗ ${fails} check(s) failed`);
    process.exit(1);
  }
  console.log('✓ Game head ⋯ harness passed');
})();
