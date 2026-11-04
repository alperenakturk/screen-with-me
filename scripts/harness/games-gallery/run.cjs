// 🎮 Games gallery (card GG, owner's pick B "two tabs"): two people in a room.
// Checks: 🎮 under the video and the rail's 🎮 open the gallery with "Together" / "On the side" tabs and covers; every
// Together card opens its table (the other person gets the invite); the On the side tab lists Snack Bar (opens it,
// with its progress) and the two coming games; the last tab is remembered; the gallery fits without scrollbars on a
// laptop, a small window and a phone (where ⋯ → Games opens it).
//
//   npm run dev, then: node scripts/harness/games-gallery/run.cjs [site]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
const room = 'gg' + Math.random().toString(36).slice(2, 8);
let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
};
const until = async (fn, ms = 10000) => {
  for (let i = 0; i < ms / 200; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
};

async function person(ctx, name, avatar, extra = {}) {
  const page = await ctx.newPage();
  await page.goto(`${SITE}/`);
  await page.waitForTimeout(800);
  await page.evaluate(([n, a, more]) => {
    localStorage.setItem('name', n);
    localStorage.setItem('avatar', a);
    localStorage.setItem('lang', 'en');
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('tipsSeen', '1');
    for (const [k, v] of Object.entries(more)) localStorage.setItem(k, v);
  }, [name, avatar, extra]);
  await page.goto(`${SITE}/r/${room}#back`);
  await until(() => page.evaluate(() => !!document.querySelector('#game-btn')));
  await page.waitForTimeout(1500);
  return page;
}
const gallery = (page, opener = '#dock-game') =>
  page.evaluate(async (sel) => {
    const menu = document.getElementById('game-menu');
    // The first of these that is on screen (the rail only shows when the video is big enough).
    const seen = (e) => e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden';
    const button = [sel, '#dock-game', '#game-btn', '#more-game'].map((x) => document.querySelector(x)).find((e) => seen(e) || e?.id === 'more-game');
    if (!menu.hidden) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    button.click();
    for (let i = 0; i < 30 && (menu.hidden || !menu.querySelector('.hub-cover svg')); i++) await new Promise((r) => setTimeout(r, 100));
    const r = menu.getBoundingClientRect();
    const panel = menu.querySelector('.hub-panel:not([hidden])');
    return {
      open: !menu.hidden,
      tabs: [...menu.querySelectorAll('.hub-tab')].map((b) => b.dataset.tab),
      on: menu.querySelector('.hub-tab.on')?.dataset.tab,
      cards: [...menu.querySelectorAll('.hub-card')].map((b) => b.dataset.kind),
      covers: menu.querySelectorAll('.hub-card .hub-cover svg').length,
      sides: [...menu.querySelectorAll('.hub-side')].map((b) => `${b.dataset.solo ?? '-'}:${b.disabled ? 'off' : 'on'}`),
      progress: menu.querySelector('.hub-progress')?.textContent ?? '',
      scroll: menu.scrollHeight > menu.clientHeight + 1 || menu.scrollWidth > menu.clientWidth + 1,
      onScreen: r.width > 100 && r.height > 100 && r.top >= -1 && r.left >= -1 && r.bottom <= innerHeight + 1 && r.right <= innerWidth + 1,
      size: `${Math.round(r.width)}×${Math.round(r.height)} at ${Math.round(r.left)},${Math.round(r.top)} panel ${panel?.scrollHeight} via ${button.id} in ${menu.parentElement?.className} ${[...document.querySelectorAll('#dock-game,#game-btn')].map((e) => `${e.id}:${Math.round(e.getBoundingClientRect().width)}:${getComputedStyle(e).visibility}`).join(' ')}`,
    };
  }, opener);
const tab = (page, id) => page.evaluate((x) => document.querySelector(`#game-menu .hub-tab[data-tab="${x}"]`).click(), id);

(async () => {
  const browser = await chromium.launch();
  const ctxA = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const ctxS = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const alex = await person(ctxA, 'Alex', 'wizard', { snackBar: JSON.stringify({ v: 1, coins: 12480, earned: 12480, lifetime: 12480, levels: { popcorn: 3 }, stars: 0, cinemas: 0, seen: 0, watched: 0 }) });
  const sam = await person(ctxS, 'Sam', 'elf');
  // Something plays, so the rail is there (an empty room on a computer shows no rail until card 6e).
  await alex.evaluate(() => document.getElementById('sync-test').click());
  await until(() => alex.evaluate(() => !!document.querySelector('#theater.dock-window, .dock-window')), 8000);
  await alex.waitForTimeout(500);

  const g = await gallery(alex);
  check(g.open && g.tabs.join() === 'together,side', 'the gallery opens with two tabs', JSON.stringify(g));
  check(g.on === 'together', 'it starts on Together', String(g.on));
  check(g.cards.join() === 'draw,quiz,poker,classics', 'Together has a card per room game', g.cards.join());
  check(g.covers >= 4, 'covers are drawn on the cards', String(g.covers));
  check(!g.scroll && g.onScreen, 'fits without scrollbars on a laptop', g.size);
  await alex.screenshot({ path: __dirname + '/gallery-together.png' });

  await tab(alex, 'side');
  const s = await gallery(alex);
  check(s.on === 'side', 'the last tab is remembered', String(s.on));
  check(s.sides.join() === 'snack:on,garden:on,word:on', 'On the side: Snack Bar, Window Garden and Five Frames open', s.sides.join());
  check(/12\.4K/.test(s.progress), 'Snack Bar shows my progress', s.progress);
  check(!s.scroll && s.onScreen, 'the side tab fits too', s.size);
  await alex.screenshot({ path: __dirname + '/gallery-side.png' });

  // A Snack Bar row opens the game.
  await alex.evaluate(() => document.querySelector('#game-menu [data-solo="snack"]').click());
  check(!!(await until(() => alex.evaluate(() => !!document.querySelector('#game-stage:not([hidden]) .sb')))), 'its row opens Snack Bar');

  // Every Together card opens its table (the window switches from Snack Bar to the table; Sam gets the invite).
  await tab(alex, 'together').catch(() => {});
  for (const kind of ['classics', 'draw', 'quiz', 'poker']) {
    await gallery(alex);
    await alex.evaluate(() => document.querySelector('#game-menu .hub-tab[data-tab="together"]').click());
    await alex.evaluate((k) => document.querySelector(`#game-menu .hub-card[data-kind="${k}"]`).click(), kind);
    const opened = await until(() => alex.evaluate(() => { const st = document.getElementById('game-stage'); return !st.hidden && !st.querySelector('.sb') && !st.querySelector('.game-stage-loading') ? st.querySelector('.game-stage-title-text')?.textContent : null; }), 8000);
    check(!!opened, `the ${kind} card opens its table`, String(opened));
    const invited = await until(() => sam.evaluate(() => !!document.getElementById('game-invite')), 4000);
    check(!!invited, `Sam gets the ${kind} invite`);
    if (kind === 'classics') {
      // R10: in a narrow window the game's name stays whole; only "· started by …" gets cut.
      const narrow = await alex.evaluate(async () => {
        const st = document.getElementById('game-stage');
        const old = st.getAttribute('style') ?? '';
        st.style.width = '260px';
        st.style.right = 'auto';
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const name = st.querySelector('.game-stage-title-name');
        const by = st.querySelector('.game-stage-title-by');
        const box = st.querySelector('.game-stage-title').getBoundingClientRect();
        const n = name?.getBoundingClientRect();
        const stageRight = st.getBoundingClientRect().right;
        const out = name && by && n ? { name: name.textContent, whole: name.scrollWidth <= name.clientWidth + 1 && n.right <= box.right + 1, inside: box.right <= stageRight + 1 } : null;
        st.setAttribute('style', old);
        return out;
      });
      check(!!narrow && narrow.whole && narrow.inside, 'a 260 px window: the game\'s name stays whole on its own row of the head, inside the window (R10)', JSON.stringify(narrow));
    }
    // Close it again so the hall never fills up.
    await alex.evaluate(() => document.querySelector('#game-stage .game-end')?.click());
    await alex.waitForTimeout(300);
    await alex.evaluate(() => document.querySelector('.dialog-backdrop:not([hidden]) .btn.primary')?.click());
    await until(() => alex.evaluate(() => document.getElementById('game-stage').hidden), 4000);
  }

  // The ⋯ More menu's Games opens the same gallery.
  const more = await gallery(alex, '#more-game');
  check(more.open && more.tabs.length === 2 && !more.scroll, '⋯ → Games opens the gallery', JSON.stringify(more));

  // A small window.
  await alex.setViewportSize({ width: 900, height: 560 });
  await alex.waitForTimeout(400);
  const small = await gallery(alex);
  check(!small.scroll && small.onScreen, 'fits a 900×560 window', small.size);

  // Phone: ⋯ → Games opens it as a sheet.
  const phone = await browser.newContext({ ...devices['iPhone 13'] });
  const pam = await person(phone, 'Pam', 'elf');
  await pam.evaluate(() => localStorage.setItem('opt:gamesSeen', '9.9.9'));
  const p = await gallery(pam, '#more-game');
  check(p.open && p.tabs.length === 2, 'phone: ⋯ → Games opens the gallery', JSON.stringify(p));
  check(!p.scroll && p.onScreen, 'phone: the sheet fits without scrollbars', p.size);
  await pam.screenshot({ path: __dirname + '/gallery-phone.png' });

  await browser.close();
  console.log(failed ? `\n✗ ${failed} checks failed` : '\n✓ Games gallery harness passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
