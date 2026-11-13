// 🍿 Snack Bar in the room (card "Snack Bar"): two people, Alex opens it from 🎮 → "Play on the side".
// Checks: the hub entry, the window fits without scrollbars (default, smallest free window, phone sheet), no income
// while nothing plays, income + the together bonus while the sync test plays, a tap serves, buying a stand, the
// nothing paid for the time away (only in a room, 0.9.97.31) and the "closed until the film plays" sign, buttons never take the focus (the message box keeps it), one tab plays at a time,
// closing saves.
//
//   npm run dev, then: node scripts/harness/snack-bar/run.cjs [site]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
const room = 'sb' + Math.random().toString(36).slice(2, 8);
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
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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
    for (const k of ['snackBar', 'windowGarden', 'fiveFrames']) localStorage.setItem(k + ':howSeen', '1');
    for (const [k, v] of Object.entries(more)) localStorage.setItem(k, v);
  }, [name, avatar, extra]);
  await page.goto(`${SITE}/r/${room}#back`);
  await until(() => page.evaluate(() => document.documentElement.classList.contains('in-room') && !!document.querySelector('#game-btn')));
  await page.waitForTimeout(1500);
  return page;
}
const openSnack = (page) =>
  page.evaluate(async () => {
    document.getElementById('game-btn').click();
    await new Promise((r) => setTimeout(r, 150));
    const entry = document.querySelector('#game-menu [data-solo="snack"]');
    if (!entry) return 'no entry';
    entry.click();
    for (let i = 0; i < 50 && !document.querySelector('#game-stage .sb'); i++) await new Promise((r) => setTimeout(r, 100));
    return document.querySelector('#game-stage .sb') ? 'ok' : 'no game';
  });
const fits = (page) =>
  page.evaluate(() => {
    const out = [];
    for (const sel of ['#game-stage .game-stage-body', '#game-stage .sb', '#game-stage .sb-rows', '#game-stage .sb-panel', '#game-stage .sb-badge-grid']) {
      const e = document.querySelector(sel);
      if (e && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)) out.push(`${sel} ${e.scrollWidth}×${e.scrollHeight} in ${e.clientWidth}×${e.clientHeight}`);
    }
    const stage = document.getElementById('game-stage').getBoundingClientRect();
    if (stage.right > innerWidth + 1 || stage.bottom > innerHeight + 1 || stage.left < -1 || stage.top < -1) out.push(`window off screen ${JSON.stringify(stage)}`);
    return out;
  });
const coins = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('snackBar') || '{}').coins ?? null);
const text = (page, sel) => page.evaluate((s) => document.querySelector(s)?.textContent ?? '', sel);

(async () => {
  const browser = await chromium.launch();
  const ctxA = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const ctxS = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const seed = JSON.stringify({ v: 1, coins: 500, earned: 500, lifetime: 500, watched: 0, levels: { popcorn: 1 }, stars: 0, cinemas: 0, seen: Date.now() - 600_000, film: { item: 'film-x', watched: 400, served: 3, coins: 60 } });
  const alex = await person(ctxA, 'Alex', 'wizard', { snackBar: seed, 'snackBar:testGuests': '1', sideFilms: JSON.stringify([{ id: 'film-x', duration: 1500, at: Date.now() }]) });
  const sam = await person(ctxS, 'Sam', 'elf');

  const hub = await alex.evaluate(async () => {
    document.getElementById('game-btn').click();
    await new Promise((r) => setTimeout(r, 150));
    const menu = document.getElementById('game-menu');
    const result = { side: !!menu.querySelector('[data-tab="side"]'), entry: !!menu.querySelector('[data-solo="snack"]') };
    document.getElementById('game-btn').click();
    return result;
  });
  check(hub.side && hub.entry, '🎮 has an "On the side" tab with Snack Bar', JSON.stringify(hub));

  check((await openSnack(alex)) === 'ok', 'Snack Bar opens in the game window');
  await wait(1500);
  const afterAway = await coins(alex);
  check(afterAway === 500, 'nothing is paid for the 10 min away (only in a room)', String(afterAway));

  // Pick 2 B: a film that ended while the game was closed: Glowbeam's receipt waits, with a golden bucket.
  await wait(400);
  await alex.screenshot({ path: __dirname + '/snack-receipt.png' });
  const receipt = await alex.evaluate(() => { const p = document.querySelector('.sb-panel.sb-panel-receipt'); return p && !p.hidden ? p.textContent : null; });
  check(!!receipt && /Receipt/.test(receipt) && /Customersserved3/.test(receipt.replace(/\s+/g, '')) && /Golden bucket/.test(receipt), 'the film\'s receipt waits (served 3, golden bucket)', String(receipt));
  await alex.evaluate(() => document.querySelector('.sb-collect').click());
  await wait(600);
  const afterBucket = await alex.evaluate(() => JSON.parse(localStorage.getItem('snackBar')));
  check(afterBucket.coins === 530 && afterBucket.stats.films === 1 && afterBucket.badges.includes('film-1'), 'Collect pays the bucket (60 s of income) and earns the "First receipt" badge', JSON.stringify({ coins: afterBucket.coins, films: afterBucket.stats.films, badges: afterBucket.badges }));
  check(await alex.evaluate(() => document.querySelector('.sb-panel').hidden), 'the receipt goes away after Collect');
  const rest = await alex.evaluate(() => { const n = document.querySelector('.sb-rest'); return n && !n.hidden ? n.textContent : null; });
  check(!!rest && /Closed until the film plays/.test(rest) && /away/.test(rest), 'the scene says it is closed until the film plays', String(rest));
  // 0.9.97.12x (QA2): the closed note sits clear of the SNACK BAR sign.
  const signClear = await alex.evaluate((() => {
    const sb = document.querySelector('.sb-rest'), art = document.querySelector('.sb-scene-art');
    const sign = art && art.querySelector(`#${art.dataset.prefix ?? ''}sign`);
    if (!sb || sb.hidden || !sign) return null;
    const a = sb.getBoundingClientRect(), b = sign.getBoundingClientRect();
    return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top) ? 'overlaps' : 'clear';
  }));
  check(signClear === 'clear', 'the "closed" note does not cover the SNACK BAR sign', String(signClear));
  const place = await alex.evaluate(() => document.getElementById('game-stage').className);
  check(/float/.test(place), 'it opens as a free window', place);
  check((await fits(alex)).length === 0, 'fits without scrollbars at its own size', (await fits(alex)).join('; '));

  // Nothing plays: no income.
  const c0 = await alex.evaluate(() => document.querySelector('.sb-coins').textContent);
  await wait(3200);
  const c1 = await alex.evaluate(() => document.querySelector('.sb-coins').textContent);
  check(c0 === c1, 'no income while nothing plays', `${c0} → ${c1}`);
  check(/Paused/.test(await text(alex, '.sb-state')), 'the pill says paused', await text(alex, '.sb-state'));
  await alex.evaluate(() => document.querySelector('.sb-scene').click());
  check(/while the film plays/.test(await text(alex, '.sb-note')), 'a tap while paused explains customers come with the film', await text(alex, '.sb-note'));

  // Buying works without taking the focus from the message box.
  await alex.click('#chat-input').catch(() => {});
  await alex.evaluate(() => document.getElementById('chat-input')?.focus());
  const box = await alex.$('.sb-row[data-stand="soda"] .sb-price');
  await box.click();
  const bought = await alex.evaluate(() => JSON.parse(localStorage.getItem('snackBar')).levels.soda);
  check(bought === 1, 'buying the soda fountain: level 1, saved', String(bought));
  const focus = await alex.evaluate(() => document.activeElement?.id || document.activeElement?.className || document.activeElement?.tagName);
  check(focus === 'chat-input', 'the message box keeps the focus after a click in the game', String(focus));
  const sceneSoda = await alex.evaluate(() => { const g = [...document.querySelectorAll('.sb-scene-art g')].find((x) => x.id.endsWith('soda')); return g && g.style.display !== 'none'; });
  check(!!sceneSoda, 'the soda appears on the counter');

  // Keys still reach the room: Escape out of the box, then "1" sends the first emoji.
  await alex.evaluate(() => document.activeElement?.blur());
  await alex.mouse.click(5, 300);
  const reacted = sam.waitForFunction(() => document.querySelectorAll('.reaction, .reactions-layer > *').length > 0, null, { timeout: 4000 }).then(() => true, () => false);
  await alex.keyboard.press('1');
  check(await reacted, 'key 1 still sends an emoji to the room with Snack Bar open');

  // The sync test plays: income comes, with the together bonus for Sam.
  await alex.evaluate(() => document.getElementById('sync-test')?.click());
  const playing = await until(() => alex.evaluate(() => document.querySelector('.sb-state').classList.contains('on') && /Film on/.test(document.querySelector('.sb-state').getAttribute('aria-label'))), 10000);
  check(!!playing, 'the pill turns to "Film on" when the room plays');
  check(await alex.evaluate(() => document.querySelector('.sb-rest').hidden), 'the "closed" sign goes away while the film plays');
  check(/\+10 %/.test(await text(alex, '.sb-together')), 'together bonus +10 % with one other person', await text(alex, '.sb-together'));
  const p0 = await alex.evaluate(() => JSON.parse(localStorage.getItem('snackBar')).coins);
  await wait(5600);
  const p1 = await alex.evaluate(() => JSON.parse(localStorage.getItem('snackBar')).coins);
  check(p1 > p0, 'income while the video plays (saved every 5 s)', `${p0} → ${p1}`);
  const served = await alex.evaluate(async () => {
    const before = document.querySelector('.sb-coins').textContent;
    document.querySelector('.sb-scene').click();
    return !!document.querySelector('.sb-pop') && before !== null;
  });
  check(served, 'a tap on the counter serves a customer (+coins pops up)');

  // Pick 1: a customer walks up with a line; a tap serves them for more.
  const guest = await until(() => alex.evaluate(() => { const g = document.querySelector('.sb-guest'); return g ? g.textContent : null; }), 8000);
  check(!!guest && guest.length > 3, 'a customer walks up to the counter with a line', String(guest));
  await wait(700);
  await alex.screenshot({ path: __dirname + '/snack-customer.png' });
  const g0 = await alex.evaluate(() => JSON.parse(localStorage.getItem('snackBar')).stats?.customers ?? 0);
  await alex.evaluate(() => document.querySelector('.sb-guest').click());
  await wait(900);
  const g1 = await alex.evaluate(() => { const s = JSON.parse(localStorage.getItem('snackBar')); return { customers: s.stats.customers, badges: s.badges }; });
  check(g1.customers === g0 + 1 && !(await alex.evaluate(() => document.querySelector('.sb-guest:not(.sb-guest-happy)'))), 'a tap serves the customer, who leaves happy', JSON.stringify(g1));
  check(g1.badges.includes('first-sale'), 'the "First sale" badge comes', JSON.stringify(g1.badges));

  // Pick 4: the badge wall.
  await alex.evaluate(() => document.querySelector('.sb-badges-open').click());
  const wall = await alex.evaluate(() => ({ all: document.querySelectorAll('.sb-badge').length, got: document.querySelectorAll('.sb-badge.got').length, shown: !document.querySelector('.sb-panel').hidden }));
  check(wall.shown && wall.all === 41 && wall.got >= 2, 'the badge wall shows 41 badges (with the seasonal ones), the earned ones lit', JSON.stringify(wall));
  check((await fits(alex)).length === 0, 'the badge wall fits without scrollbars', (await fits(alex)).join('; '));
  await alex.evaluate(() => document.querySelectorAll('.sb-badge')[1].click());
  check(/Serve 10/.test(await text(alex, '.sb-badge-detail')), 'a tap on a badge says how to earn it', await text(alex, '.sb-badge-detail'));
  await wait(400);
  await alex.screenshot({ path: __dirname + '/snack-badges.png' });
  await alex.evaluate(() => document.querySelector('.sb-panel-close').click());

  // One tab at a time.
  const second = await ctxA.newPage();
  await second.goto(`${SITE}/r/${room}#back`);
  await until(() => second.evaluate(() => !!document.querySelector('#game-btn')));
  await second.waitForTimeout(1200);
  await openSnack(second);
  const other = await until(() => second.evaluate(() => { const e = document.querySelector('.sb-elsewhere'); return e && !e.hidden; }), 3000);
  check(!!other, 'a second tab says "open in another tab" and does not play');
  await second.close();

  // Smallest free window: still no scrollbars (3 rows + "more").
  await alex.evaluate(() => {
    localStorage.setItem('gameFloat:zoom:snack', '0.45');
    dispatchEvent(new Event('resize'));
  });
  await alex.evaluate(() => document.querySelector('#game-stage .game-stage-head')?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
  await alex.setViewportSize({ width: 900, height: 560 });
  await wait(600);
  check((await fits(alex)).length === 0, 'fits a small screen without scrollbars', (await fits(alex)).join('; '));
  const rowsShown = await alex.evaluate(() => [...document.querySelectorAll('.sb-row')].filter((r) => !r.hidden).length);
  // 0.9.97.134: a window under 420 px tall keeps two stands (rather than scale the text below 13 px) and says the rest
  // come with a bigger window.
  const short = await alex.evaluate(() => document.querySelector('#game-stage .sb')?.clientHeight < 420);
  const moreShown = await alex.evaluate(() => !document.querySelector('#game-stage .sb-more')?.hidden);
  check(rowsShown >= (short ? 2 : 3) && (rowsShown >= 3 || moreShown), `at least ${short ? 'two' : 'three'} upgrade rows show (and "+N more")`, String(rowsShown));
  await alex.screenshot({ path: __dirname + '/snack-window.png' });

  // Game window rules (owner, 4 Nov 2026): no Close for a solo game, ✕ only minimizes, ↺ Start over asks first.
  const head = await alex.evaluate(() => [...document.querySelectorAll('#game-stage .game-stage-head button')].filter((b) => !b.hidden && b.offsetParent).map((b) => b.className + '|' + b.title));
  check(!head.some((h) => /game-leave|game-end|\|Close$/.test(h)), 'a solo game has no close or leave button', JSON.stringify(head));
  await alex.evaluate(() => document.querySelector('#game-stage .game-minimize').click());
  const minimized = await until(() => alex.evaluate(() => document.getElementById('game-stage').hidden && !!document.querySelector('#game-stage .sb')), 3000);
  check(!!minimized, '✕ only minimizes: the game stays mounted behind 🎮');
  const lock = await alex.evaluate(() => localStorage.getItem('snackBar:tab'));
  check(!!lock, 'minimized, it keeps its one-tab lock (it still plays)', String(lock));
  await alex.evaluate(() => document.getElementById('game-btn').click());
  check(!!(await until(() => alex.evaluate(() => !document.getElementById('game-stage').hidden), 3000)), '🎮 brings the minimized game back');
  await alex.evaluate(() => document.querySelector('.sg-restart').click());
  await wait(300);
  await alex.evaluate(() => document.querySelector('.dialog-backdrop:not([hidden]) .btn.primary')?.click());
  await wait(1200);
  const reset = await alex.evaluate(() => JSON.parse(localStorage.getItem('snackBar')));
  check(reset.coins < 20 && reset.levels.soda === 0 && reset.levels.popcorn === 1, '↺ Start over (after its question) starts from zero', JSON.stringify(reset.levels));

  // Picks 3 + 6: a later cinema is another place (here the rooftop), decorations are bought from the badge wall.
  await alex.goto(`${SITE}/`);
  await alex.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('snackBar'));
    localStorage.setItem('snackBar', JSON.stringify({ ...s, coins: 10_000, cinemas: 2, stars: 3 }));
    localStorage.removeItem('snackBar:tab');
  });
  await alex.goto(`${SITE}/r/${room}#back`);
  await until(() => alex.evaluate(() => !!document.querySelector('#game-btn')));
  await alex.waitForTimeout(1500);
  await openSnack(alex);
  await wait(800);
  const spot = await alex.evaluate(() => {
    const art = document.querySelector('.sb-scene-art');
    const prefix = art.dataset.prefix;
    const shown = (id) => getComputedStyle(art.querySelector('#' + prefix + id)).display !== 'none';
    return { sign: art.querySelector('#' + prefix + 'sign text').textContent, rooftop: shown('place-rooftop'), drive: shown('place-drive-in'), foot: document.querySelector('.sb-cinema').textContent };
  });
  check(spot.sign === 'ROOFTOP' && spot.rooftop && !spot.drive && /🌃/.test(spot.foot), 'cinema #3 is the rooftop: its sign, its skyline, its icon', JSON.stringify(spot));
  await alex.evaluate(() => document.querySelector('.sb-badges-open').click());
  await alex.evaluate(() => document.querySelector('.sb-decor-buy').click());
  await wait(500);
  const decor = await alex.evaluate(() => {
    const art = document.querySelector('.sb-scene-art');
    return { saved: JSON.parse(localStorage.getItem('snackBar')).decor, shown: getComputedStyle(art.querySelector('#' + art.dataset.prefix + 'decor-marquee')).display !== 'none', owned: document.querySelector('.sb-decor-buy')?.textContent };
  });
  check(decor.saved.includes('marquee') && decor.shown && /Yours/.test(decor.owned), 'a decoration is bought once and shows on the counter', JSON.stringify(decor));
  check((await fits(alex)).length === 0, 'the wall with decorations fits without scrollbars', (await fits(alex)).join('; '));
  await wait(300);
  await alex.screenshot({ path: __dirname + '/snack-decor.png' });
  await alex.evaluate(() => document.querySelector('.sb-panel-close').click());
  await wait(400);
  await alex.screenshot({ path: __dirname + '/snack-rooftop.png' });

  // Phone: the sheet fits, all five rows.
  const phone = await browser.newContext({ ...devices['iPhone 13'] });
  const pam = await person(phone, 'Pam', 'elf');
  const opened = await pam.evaluate(async () => {
    const btn = document.getElementById('game-btn');
    btn.click();
    await new Promise((r) => setTimeout(r, 200));
    document.querySelector('#game-menu [data-solo="snack"]')?.click();
    for (let i = 0; i < 50 && !document.querySelector('#game-stage .sb'); i++) await new Promise((r) => setTimeout(r, 100));
    return !!document.querySelector('#game-stage .sb');
  });
  check(opened, 'phone: Snack Bar opens');
  await wait(500);
  check((await fits(pam)).length === 0, 'phone: fits without scrollbars', (await fits(pam)).join('; '));
  const phoneRows = await pam.evaluate(() => [...document.querySelectorAll('.sb-row')].filter((r) => !r.hidden).length);
  // SB3: the open stands and the next locked one (a stand two steps away stays out of sight).
  check(phoneRows === 3, 'phone: a fresh game shows its two open stands and the next one', String(phoneRows));
  const phoneSign = await pam.evaluate((() => {
    const sb = document.querySelector('.sb-rest'), art = document.querySelector('.sb-scene-art');
    const sign = art && art.querySelector(`#${art.dataset.prefix ?? ''}sign`);
    if (!sb || sb.hidden || !sign) return null;
    const a = sb.getBoundingClientRect(), b = sign.getBoundingClientRect();
    return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top) ? 'overlaps' : 'clear';
  }));
  check(phoneSign === 'clear', 'phone: the "closed" note does not cover the SNACK BAR sign', String(phoneSign));
  const cinemaCut = await pam.evaluate(() => { const c = document.querySelector('.sb-cinema'); return c ? c.scrollWidth - c.clientWidth : -1; });
  check(cinemaCut === 0, 'phone: the cinema line ("Cinema 1 · ★ 0") is not cut off', String(cinemaCut));
  await pam.screenshot({ path: __dirname + '/snack-phone.png' });

  // QA2 (5): a sideways phone keeps the open stands in sight (the locked one gives way first, the list uses its height).
  const land = await browser.newContext({ ...devices['iPhone 13 landscape'] });
  const lan = await person(land, 'Lan', 'elf');
  await lan.evaluate(async () => {
    document.getElementById('game-btn').click();
    await new Promise((r) => setTimeout(r, 200));
    document.querySelector('#game-menu [data-solo="snack"]')?.click();
    for (let i = 0; i < 50 && !document.querySelector('#game-stage .sb'); i++) await new Promise((r) => setTimeout(r, 100));
  });
  await wait(800);
  const landRows = await lan.evaluate(() => [...document.querySelectorAll('.sb-row')].filter((r) => !r.hidden).map((r) => r.querySelector('.sb-name')?.textContent));
  check(landRows.some((n) => /Popcorn/.test(n ?? '')), 'sideways phone: the popcorn machine (open, affordable) is in the list', JSON.stringify(landRows));
  check((await fits(lan)).length === 0, 'sideways phone: fits without scrollbars', (await fits(lan)).join('; '));

  await browser.close();
  console.log(failed ? `\n✗ ${failed} checks failed` : '\n✓ Snack Bar harness passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
