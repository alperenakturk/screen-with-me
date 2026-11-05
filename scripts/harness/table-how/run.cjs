// GP2: "How to play" cards for the tables (Classics boards, Sea Battle, Quiz, Draw & Guess), the side games' pattern:
// shown the first time a game (a Classics board) opens, Next / Let's play / ✕, then gone for good in this browser,
// and back from the "?" in the game window's head. Automated browsers get them only with `opt:tableHow` = '1'.
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 --var SWM_LOCAL_UNPACED:1)
//   NODE_PATH=$(npm root -g) node scripts/harness/table-how/run.cjs [site]
const { chromium, devices } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:8787';
let fails = 0;
const check = (ok, label, extra) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra !== undefined && !ok ? ' → ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`);
  if (!ok) fails++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 6000) {
  for (let i = 0; i < ms / 100; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await wait(100);
  }
  return null;
}

/** The cards layer now: open?, its title, the head's "?" (present / its size). */
const cards = (page) =>
  page.evaluate(() => {
    const layer = [...document.querySelectorAll('#game-stage .htp')].find((l) => !l.hidden);
    const q = document.querySelector('#game-stage .htp-head');
    const r = q?.getBoundingClientRect();
    return { open: !!layer, title: layer?.querySelector('.htp-title')?.textContent ?? '', art: !!layer?.querySelector('.htp-art svg'), next: layer?.querySelector('.htp-next')?.textContent ?? '', q: !!q, qSize: r ? Math.round(Math.min(r.width, r.height)) : 0, qName: q?.getAttribute('aria-label') ?? '' };
  });
const press = (page, sel) => page.evaluate((s) => document.querySelector(`#game-stage ${s}`)?.click(), sel);

async function person(browser, opts, lang = 'en') {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript((lang) => {
    for (const [k, v] of Object.entries({ lang, name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', 'opt:tableHow': '1' })) localStorage.setItem(k, v);
  }, lang);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${SITE}/r/th${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
  await page.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 });
  await wait(3200);
  return { ctx, page, errors, run: (id) => page.evaluate((id) => window.__swmLab.run(id), id) };
}

(async () => {
  const browser = await chromium.launch();
  for (const [label, opts] of [['computer', { viewport: { width: 1366, height: 768 } }], ['iPhone', devices['iPhone 13']]]) {
    const { ctx, page, errors, run } = await person(browser, opts);
    // Classics: the picker has no cards; a board brings its own the first time.
    await run('games.open.classics');
    await until(() => page.evaluate(() => !!document.querySelector('#game-stage .cl-picker:not([hidden])')));
    let c = await cards(page);
    check(!c.open && !c.q, `${label}: the Classics picker shows no cards and no "?"`, c);
    await press(page, '.cl-box[data-board="dama"]');
    c = await until(async () => {
      const x = await cards(page);
      return x.open ? x : null;
    });
    check(c && c.art && /forward|sideways/i.test(c.title), `${label}: dama's cards open the first time (picture + title)`, c);
    check(c && c.q && c.qSize >= (label === 'iPhone' ? 44 : 24) && c.qName === 'How to play', `${label}: a named "?" (the head; a phone: the game's bar), big enough to hit`, c);
    await press(page, '.htp:not([hidden]) .htp-next');
    c = await cards(page);
    check(c.open && /jump/i.test(c.title) && /let/i.test(c.next), `${label}: Next shows the last card with "Let's play"`, c);
    await press(page, '.htp:not([hidden]) .htp-next');
    c = await cards(page);
    check(!c.open, `${label}: "Let's play" closes them`, c);
    await press(page, '.htp-head');
    c = await cards(page);
    check(c.open && /forward|sideways/i.test(c.title), `${label}: the "?" opens them again from the first card`, c);
    await press(page, '.htp:not([hidden]) .htp-skip');
    check(!(await cards(page)).open, `${label}: ✕ closes them`);
    // Another board: its own cards; dama's never again.
    await press(page, '#cl-shelf-open');
    await wait(300);
    await press(page, '.cl-box[data-board="reversi"]');
    c = await until(async () => {
      const x = await cards(page);
      return x.open ? x : null;
    });
    check(c && /close a line/i.test(c.title), `${label}: reversi brings its own cards`, c);
    await press(page, '.htp:not([hidden]) .htp-skip');
    await press(page, '#cl-shelf-open');
    await wait(300);
    await press(page, '.cl-box[data-board="dama"]');
    await wait(1200);
    c = await cards(page);
    check(!c.open && c.q, `${label}: dama's cards don't come back by themselves (the "?" stays)`, c);
    // Sea Battle, Quiz, Draw & Guess.
    for (const [kind, title] of [['sea', /fleet/i], ['quiz', /answer fast/i], ['draw', /pick a word/i]]) {
      await run(`games.open.${kind}`);
      c = await until(async () => {
        const x = await cards(page);
        return x.open ? x : null;
      }, 8000);
      check(c && title.test(c.title) && c.art && c.q, `${label}: ${kind} opens with its cards and its "?"`, c);
      await press(page, '.htp:not([hidden]) .htp-skip');
      await wait(300);
    }
    check(!errors.length, `${label}: no page errors`, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // Turkish: the cards speak the page's language.
  const { ctx, page, run } = await person(browser, { viewport: { width: 1366, height: 768 } }, 'tr');
  await run('games.open.sea');
  const c = await until(async () => {
    const x = await cards(page);
    return x.open ? x : null;
  }, 8000);
  check(c && /filonu/i.test(c.title) && c.qName === 'Nasıl oynanır', 'Turkish: Sea Battle\'s cards and "?" in Turkish', c);
  await ctx.close();
  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Table How to play harness passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
