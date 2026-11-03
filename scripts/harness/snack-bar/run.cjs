// 🍿 Snack Bar in the room (card "Snack Bar"): two people, Alex opens it from 🎮 → "Play on the side".
// Checks: the hub entry, the window fits without scrollbars (default, smallest free window, phone sheet), no income
// while nothing plays, income + the together bonus while the sync test plays, a tap serves, buying a stand, the
// "while you were away" note, buttons never take the focus (the message box keeps it), one tab plays at a time,
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
    for (const sel of ['#game-stage .game-stage-body', '#game-stage .sb', '#game-stage .sb-rows']) {
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
  const seed = JSON.stringify({ v: 1, coins: 500, earned: 500, lifetime: 500, watched: 0, levels: { popcorn: 1 }, stars: 0, cinemas: 0, seen: Date.now() - 600_000 });
  const alex = await person(ctxA, 'Alex', 'wizard', { snackBar: seed });
  const sam = await person(ctxS, 'Sam', 'elf');

  const hub = await alex.evaluate(async () => {
    document.getElementById('game-btn').click();
    await new Promise((r) => setTimeout(r, 150));
    const menu = document.getElementById('game-menu');
    const result = { side: menu.textContent.includes('Play on the side'), entry: !!menu.querySelector('[data-solo="snack"]') };
    document.getElementById('game-btn').click();
    return result;
  });
  check(hub.side && hub.entry, '🎮 shows "Play on the side" with Snack Bar', JSON.stringify(hub));

  check((await openSnack(alex)) === 'ok', 'Snack Bar opens in the game window');
  const away = await until(() => alex.evaluate(() => { const n = document.querySelector('.sb-note'); return n && !n.hidden ? n.textContent : null; }), 3000);
  check(!!away && /away/i.test(away), '"While you were away" pays a capped bonus on opening', String(away));
  const afterAway = await coins(alex);
  check(afterAway > 500 && afterAway <= 500 + 0.5 * 600 * 0.25 + 1, 'the away bonus is 25 % of the base income for 10 min', String(afterAway));
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
  const playing = await until(() => alex.evaluate(() => /Film on/.test(document.querySelector('.sb-state').textContent)), 10000);
  check(!!playing, 'the pill turns to "Film on" when the room plays');
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
  check(rowsShown >= 3, 'at least three upgrade rows show', String(rowsShown));
  await alex.screenshot({ path: __dirname + '/snack-window.png' });

  // Close: saved, window gone.
  await alex.evaluate(() => [...document.querySelectorAll('#game-stage .game-stage-head button')].find((b) => b.title === 'Close')?.click());
  const closed = await until(() => alex.evaluate(() => document.getElementById('game-stage').hidden && !document.querySelector('.sb')), 3000);
  check(!!closed, 'Close shuts the game');
  const lock = await alex.evaluate(() => localStorage.getItem('snackBar:tab'));
  check(!lock, 'closing lets go of the one-tab lock', String(lock));

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
  check(phoneRows === 5, 'phone: all five upgrades show', String(phoneRows));
  await pam.screenshot({ path: __dirname + '/snack-phone.png' });

  await browser.close();
  console.log(failed ? `\n✗ ${failed} checks failed` : '\n✓ Snack Bar harness passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
