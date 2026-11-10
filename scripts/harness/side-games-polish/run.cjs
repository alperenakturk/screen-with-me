// Side games polish (card GP, Design's `docs/internal/design/side-games-polish.md`): Snack Bar, Window Garden and
// Five Frames open at their ideal size, with readable text, a full window title, "How to play" cards and (Five Frames)
// ticket-mark cells (solid ✓ / dashed • / faded ×) with a legend and a row that turns over cell by cell.
// Checks per game at 1366×768 and 1920×1080: the scale (`--fit`) when it opens is 1 at 1366×768 and grows with the screen (LAYOUT1), no visible text in the game below
// 13 px after the scale, the window head shows the full title; on a phone (iPhone 13) nothing scrolls inside.
// "How to play": shows on the first open, not on the second, "?" brings it back, Esc closes it, Snack Bar keeps
// saving behind it. Five Frames: after Enter the cells get their colour one by one, ≈ 540 ms in all, the tray after
// the last; with reduced motion nothing turns; the legend's three labels in English and Turkish.
//
//   npm run dev, then: node scripts/harness/side-games-polish/run.cjs [site]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
};
const GAMES = { snack: 'Snack Bar', garden: 'Window Garden', word: 'Five Frames' };
const HOW_KEYS = ['snackBar:howSeen', 'windowGarden:howSeen', 'fiveFrames:howSeen'];

async function enter(ctx, { lang = 'en', seen = true, extra = {} } = {}) {
  const page = await ctx.newPage();
  await page.goto(`${SITE}/`);
  await page.waitForTimeout(500);
  await page.evaluate(([l, s, keys, more]) => {
    localStorage.setItem('name', 'Alex');
    localStorage.setItem('avatar', 'wizard');
    localStorage.setItem('lang', l);
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('tipsSeen', '1');
    for (const k of keys) s ? localStorage.setItem(k, '1') : localStorage.removeItem(k);
    for (const [k, v] of Object.entries(more)) localStorage.setItem(k, v);
  }, [lang, seen, HOW_KEYS, extra]);
  await page.goto(`${SITE}/r/gp${Math.random().toString(36).slice(2, 8)}#back`);
  await page.waitForFunction(() => document.documentElement.classList.contains('in-room') && !!document.querySelector('#game-btn'), null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  return page;
}
const open = (page, kind) =>
  page.evaluate(async (kind) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    document.getElementById('game-btn').click();
    await sleep(200);
    document.querySelector('#game-menu [data-tab="side"]')?.click();
    await sleep(100);
    document.querySelector(`#game-menu [data-solo="${kind}"]`)?.click();
    for (let i = 0; i < 60 && !document.querySelector('#game-stage .sb, #game-stage .wg, #game-stage .ff .ff-key'); i++) await sleep(100);
    await sleep(900);
  }, kind);
const measure = (page) =>
  page.evaluate(() => {
    const st = document.getElementById('game-stage');
    const scale = parseFloat(getComputedStyle(st).getPropertyValue('--fit')) || 1;
    let min = 99;
    let where = '';
    for (const e of st.querySelectorAll('.game-fit *')) {
      if (e.closest('svg, [hidden]')) continue;
      if (![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      if (cs.visibility === 'hidden' || r.width === 0 || r.height === 0) continue;
      const px = parseFloat(cs.fontSize) * scale;
      if (px < min) (min = px), (where = `${e.className} "${e.textContent.trim().slice(0, 16)}"`);
    }
    const title = st.querySelector('.game-stage-title-text');
    const scrolls = [...st.querySelectorAll('*')].filter((e) => {
      const cs = getComputedStyle(e);
      return /(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1);
    });
    return { scale, min, where, title: title.textContent, cut: title.scrollWidth > title.clientWidth + 1, scrolls: scrolls.length };
  });

(async () => {
  const browser = await chromium.launch();

  // ---- Sizes and type, two screens, both languages for Five Frames ----
  for (const [w, h] of [[1366, 768], [1920, 1080]]) {
    for (const kind of Object.keys(GAMES)) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await enter(ctx);
      await open(page, kind);
      const m = await measure(page);
      // LAYOUT1 (the Planner's B2): a free window grows with the screen until resized, min(w / 1366, h / 768), at most
      // the game's largest size (1.5): scale 1 on a laptop, ≈ 1.41 at 1920 × 1080.
      const want = Math.min(1.5, Math.max(1, Math.min(w / 1366, h / 768)));
      check(Math.abs(m.scale - want) < 0.02, `${GAMES[kind]} at ${w}×${h}: opens at scale ${want.toFixed(2)}`, String(m.scale));
      check(m.min >= 13, `${GAMES[kind]} at ${w}×${h}: no text below 13 px`, `${m.min.toFixed(1)} px ${m.where}`);
      check(m.title === GAMES[kind] && !m.cut, `${GAMES[kind]} at ${w}×${h}: the window head shows the full title`, `${m.title} cut=${m.cut}`);
      await ctx.close();
    }
  }
  for (const kind of Object.keys(GAMES)) {
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await enter(ctx);
    await open(page, kind);
    const m = await measure(page);
    check(m.scrolls === 0 && m.min >= 13, `${GAMES[kind]} on a phone: nothing scrolls inside, text ≥ 13 px`, `${m.scrolls} scrollers, ${m.min.toFixed(1)} px ${m.where}`);
    await ctx.close();
  }

  // ---- How to play ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await enter(ctx, { seen: false });
    await open(page, 'snack');
    const first = await page.evaluate(() => {
      const layer = document.querySelector('#game-stage .htp');
      return { shown: !!layer && !layer.hidden, dots: layer?.querySelectorAll('.htp-dot').length, title: layer?.querySelector('.htp-title')?.textContent };
    });
    check(first.shown && first.dots === 4 && first.title === 'Earn while the room watches', 'Snack Bar: "How to play" shows on the first open (4 cards)', JSON.stringify(first));
    const scale = (await measure(page)).scale;
    check(scale === 1, 'the cards keep the game at scale 1', String(scale));
    // The game keeps going behind the cards: its save is written every 5 s.
    const before = await page.evaluate(() => localStorage.getItem('snackBar'));
    await page.waitForTimeout(6000);
    const after = await page.evaluate(() => localStorage.getItem('snackBar'));
    check(!!after && after !== before, 'the game keeps ticking behind the cards (it saved)');
    const walk = await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const layer = document.querySelector('#game-stage .htp');
      const titles = [];
      for (let i = 0; i < 4; i++) {
        titles.push(layer.querySelector('.htp-title').textContent);
        layer.querySelector('[data-how="next"]').click();
        await sleep(50);
      }
      return { titles, hidden: layer.hidden, seen: localStorage.getItem('snackBar:howSeen') };
    });
    check(walk.titles.length === 4 && new Set(walk.titles).size === 4 && walk.hidden && walk.seen === '1', 'Next walks the four cards, "Let\'s play" closes them and remembers it', JSON.stringify(walk));
    await page.evaluate(() => document.querySelector('#game-stage [data-how="open"]').click());
    const again = await page.evaluate(() => !document.querySelector('#game-stage .htp').hidden);
    check(again, '"?" brings the cards back');
    await page.focus('#game-stage .htp');
    await page.keyboard.press('ArrowRight');
    const second = await page.evaluate(() => document.querySelector('#game-stage .htp-title').textContent);
    check(second === 'Tap to serve', '→ goes to the next card while the cards have the focus', second);
    await page.keyboard.press('Escape');
    const closed = await page.evaluate(() => ({ hidden: document.querySelector('#game-stage .htp').hidden, stage: !document.getElementById('game-stage').hidden }));
    check(closed.hidden && closed.stage, 'Esc closes the cards and leaves the game open', JSON.stringify(closed));
    await page.reload();
    await page.waitForFunction(() => !!document.querySelector('#game-btn'));
    await page.waitForTimeout(1200);
    await open(page, 'snack');
    const reopened = await page.evaluate(() => document.querySelector('#game-stage .htp')?.hidden);
    check(reopened === true, 'not shown again on the second open');
    for (const [kind, n, title] of [['garden', 4, 'Plant a seed'], ['word', 3, 'Guess the five-letter word']]) {
      await open(page, kind);
      const r = await page.evaluate(() => {
        const layer = document.querySelector('#game-stage .htp');
        return { shown: !!layer && !layer.hidden, dots: layer?.querySelectorAll('.htp-dot').length, title: layer?.querySelector('.htp-title')?.textContent };
      });
      check(r.shown && r.dots === n && r.title === title, `${GAMES[kind]}: its own ${n} cards on its first open`, JSON.stringify(r));
    }
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await enter(ctx, { lang: 'tr', seen: false });
    await open(page, 'word');
    const tr = await page.evaluate(() => ({ title: document.querySelector('#game-stage .htp-title').textContent, next: document.querySelector('#game-stage [data-how="next"]').textContent }));
    check(tr.title === 'Beş harfli kelimeyi bul' && tr.next === 'İleri', 'the cards in Turkish', JSON.stringify(tr));
    await ctx.close();
  }

  // ---- Five Frames: legend, colours, the turn ----
  for (const [motion, lang] of [['no-preference', 'en'], ['reduce', 'tr']]) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: motion });
    const page = await enter(ctx, { lang, extra: { 'fiveFrames:lang': 'en' } });
    await open(page, 'word');
    const legend = await page.evaluate(() => [...document.querySelectorAll('#game-stage .ff-legend-item')].map((i) => [i.querySelector('.ff-cell').className.replace('ff-cell ff-swatch ', ''), i.textContent.slice(1)]));
    const want = lang === 'tr' ? 'hit:Doğru yerde,near:Kelimede var,miss:Kelimede yok' : 'hit:Right place,near:In the word,miss:Not in the word';
    check(legend.map(([m, l]) => `${m}:${l}`).join(',') === want, `the legend shows the three states (${lang.toUpperCase()})`, JSON.stringify(legend));
    const r = await page.evaluate(async () => {
      const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
      for (const c of 'about') document.querySelector(`#game-stage .ff-key[data-key="${c}"]`).click();
      const cells = [...document.querySelectorAll('#game-stage .ff-row')[0].querySelectorAll('.ff-cell')];
      const t0 = performance.now();
      const at = cells.map(() => null);
      const turning = new Set();
      const mo = new MutationObserver(() => cells.forEach((c, i) => {
        if (at[i] === null && /\b(hit|near|miss)\b/.test(c.className)) at[i] = performance.now() - t0;
        if (c.classList.contains('turn')) turning.add(i);
      }));
      for (const c of cells) mo.observe(c, { attributes: true, attributeFilter: ['class'] });
      document.querySelector('#game-stage .ff-key[data-key="Enter"]').click();
      let tray = null;
      for (let i = 0; i < 50; i++) {
        await sleep(20);
        if (tray === null && /\b(hit|near|miss)\b/.test(document.querySelector('#game-stage .ff-key[data-key="b"]').className)) tray = performance.now() - t0;
      }
      mo.disconnect();
      cells.forEach((c, i) => at[i] === null && /\b(hit|near|miss)\b/.test(c.className) && (at[i] = 0));
      return { at, tray, turned: turning.size, legend: document.querySelector('#game-stage .ff-legend').hidden };
    });
    if (motion === 'reduce') {
      check(r.turned === 0 && r.at.every((t) => t !== null && t < 100), 'reduced motion: nothing turns, the colours come at once', JSON.stringify(r));
    } else {
      const ordered = r.at.every((t, i) => t !== null && (i === 0 || t > r.at[i - 1]));
      const last = r.at[4];
      check(ordered && r.turned === 5, 'after Enter the cells get their colour one by one, in order', JSON.stringify(r.at));
      check(last > 380 && last < 700 && r.tray >= last, 'the turn takes ≈ 540 ms and the tray changes after the last cell', `last ${Math.round(last)} ms, tray ${Math.round(r.tray)} ms`);
    }
    check(r.legend === true, 'the legend folds away after the first scored guess');
    await ctx.close();
  }

  // ---- Card R8: on a slow network the cards show within 150 ms of picking a game (the hall warmed its chunk) ----
  for (const kind of Object.keys(GAMES)) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await enter(ctx, { seen: false });
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 300, downloadThroughput: 400_000, uploadThroughput: 200_000 });
    const ms = await page.evaluate(async (kind) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      document.getElementById('game-btn').click();
      for (let i = 0; i < 80 && !document.querySelector('#game-menu [data-tab="side"]'); i++) await sleep(100);
      document.querySelector('#game-menu [data-tab="side"]')?.click();
      await sleep(5000); // a person reading the hall
      const t0 = performance.now();
      document.querySelector(`#game-menu [data-solo="${kind}"]`)?.click();
      while (performance.now() - t0 < 5000) {
        const layer = document.querySelector('#game-stage .htp');
        if (layer && !layer.hidden && layer.getBoundingClientRect().width > 0) return performance.now() - t0;
        await new Promise((r) => requestAnimationFrame(r));
      }
      return -1;
    }, kind);
    check(ms >= 0 && ms <= 150, `${GAMES[kind]}: "How to play" shows ≤ 150 ms after it is picked on a slow network`, `${Math.round(ms)} ms`);
    await ctx.close();
  }

  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Side games polish harness passed');
  process.exit(failed ? 1 : 0);
})();
