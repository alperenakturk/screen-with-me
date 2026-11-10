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

async function person(browser, opts, lang = 'en', more = {}) {
  const ctx = await browser.newContext(opts);
  await ctx.addInitScript(([lang, more]) => {
    for (const [k, v] of Object.entries({ lang, name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', 'opt:tableHow': '1', ...more })) localStorage.setItem(k, v);
  }, [lang, more]);
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
  // THEMEG (W's first look in Matinee): the cards, the tables' "?", the dice, the turn ring and the hall's UPDATED badge
  // take the room theme's colours; the pink / blue turn ring stays for the X / O boards only.
  {
    const rgb = (c) => c.replace(/\s+/g, '');
    const { ctx, page, run } = await person(browser, devices['iPhone 13'], 'en', { theme: 'matinee', 'classics:backgammon:howSeen': '1' });
    await page.evaluate(() => document.querySelector('.swm-intro')?.remove());
    await run('games.open.classics');
    await until(() => page.evaluate(() => !!document.querySelector('#game-stage [data-board="backgammon"]')));
    await press(page, '[data-board="backgammon"]');
    await until(() => page.evaluate(() => !!document.querySelector('#game-stage .cl-bot-level')));
    await page.evaluate(() => document.querySelector('#game-stage .cl-bot-level')?.click());
    const roll = await until(() => page.evaluate(() => [...document.querySelectorAll('#game-stage .btn.primary')].find((b) => b.getBoundingClientRect().width > 0 && !b.disabled && /Roll/.test(b.textContent)) ? true : null), 8000);
    if (roll) await page.evaluate(() => [...document.querySelectorAll('#game-stage .btn.primary')].find((b) => /Roll/.test(b.textContent)).click());
    await until(() => page.evaluate(() => !!document.querySelector('#game-stage .bg-die') && !!document.querySelector('#game-stage .htp-head')));
    const m = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const tok = (n) => { const d = document.createElement('i'); d.style.color = root.getPropertyValue(n); document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; };
      const turn = document.querySelector('#game-stage .xox-player.turn');
      const q = document.querySelector('#game-stage .htp-head');
      return { text: tok('--text'), accent: tok('--accent'), die: getComputedStyle(document.querySelector('#game-stage .bg-dice') ?? document.body).color, ring: turn ? getComputedStyle(turn).borderTopColor : null, q: q ? getComputedStyle(q).color : null };
    });
    check(rgb(m.die) === rgb(m.text), 'Matinee phone: the backgammon dice are in the theme\'s text colour (not cream on cream)', m);
    check(m.ring && rgb(m.ring) === rgb(m.accent), 'Matinee phone: backgammon rings the turn in the theme\'s accent, not the X mark\'s pink', m);
    check(m.q && rgb(m.q) === rgb(m.text), 'Matinee phone: the tables\' "?" is in the theme\'s text colour', m);
    await ctx.close();
  }
  {
    const { ctx, page, run } = await person(browser, { viewport: { width: 1366, height: 768 } }, 'en', { theme: 'matinee' });
    await page.evaluate(() => document.querySelector('.swm-intro')?.remove());
    await run('games.open.snack');
    const open = await until(() => page.evaluate(() => !![...document.querySelectorAll('#game-stage .htp')].find((l) => !l.hidden)), 8000);
    const m = await page.evaluate(() => {
      const card = [...document.querySelectorAll('#game-stage .htp')].find((l) => !l.hidden);
      const cs = card && getComputedStyle(card);
      return { color: cs?.color, bg: cs?.backgroundImage ?? '' };
    });
    const text = await page.evaluate(() => { const d = document.createElement('i'); d.style.color = 'var(--text)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; });
    check(open && m.color === text && !/34,\s*26,\s*74/.test(m.bg), 'Matinee: Snack Bar\'s How to play card takes the theme (its text colour, no navy)', { open, ...m, text });
    await page.evaluate(() => document.querySelector('#game-stage .htp-skip')?.click());
    await page.evaluate(() => document.querySelector('#game-stage .game-hub-open')?.click());
    const badge = await until(() => page.evaluate(() => { const b = document.querySelector('#game-menu .hub-badge.updated'); return b ? getComputedStyle(b).backgroundColor : null; }), 6000);
    check(!!badge && !/111,\s*211,\s*255/.test(badge), 'Matinee: the hall\'s UPDATED badge is not the old light blue', badge);
    await ctx.close();
  }
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
