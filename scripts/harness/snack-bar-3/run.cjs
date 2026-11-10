// 🍿 Snack Bar v2 (card SB3) in the room: a version 1 save is migrated, buy ×1 / ×10 / Max buy the right number of
// levels, the Upgrades panel lists recipes and staff and a recipe doubles its stand, the usher serves a waiting customer
// by itself, today's special is tagged, all eight stands fit without a scrollbar (laptop and phone), the new stands show
// in the lobby scene, the seaside and planetarium backdrops come with their cinemas.
//
//   npm run dev (or wrangler dev with the built site), then: node scripts/harness/snack-bar-3/run.cjs [site]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
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

async function person(ctx, room, extra = {}) {
  const page = await ctx.newPage();
  // The Test Lab (local server) changes the open game's own copy of the save (the game writes over localStorage).
  await page.goto(`${SITE}/?debug=1`);
  await page.waitForFunction(() => sessionStorage.getItem('swm:debug') === '1', null, { timeout: 10000 });
  await page.evaluate((more) => {
    localStorage.setItem('name', 'Alex');
    localStorage.setItem('avatar', 'wizard');
    localStorage.setItem('lang', 'en');
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('tipsSeen', '1');
    localStorage.setItem('snackBar:howSeen', '1');
    // These checks are for Snack Bar's free window (since 0.9.97.114 a 1366 laptop opens it there by itself, in the
    // narrow column beside the video); the pick stays so the run never depends on the column's width.
    localStorage.setItem('gamePlace:snack', 'float');
    for (const [k, v] of Object.entries(more)) localStorage.setItem(k, v);
  }, extra);
  await page.goto(`${SITE}/r/${room}#back`);
  await until(() => page.evaluate(() => document.documentElement.classList.contains('in-room') && !!document.querySelector('#game-btn')));
  await page.waitForTimeout(1200);
  return page;
}
const openSnack = (page) =>
  page.evaluate(async () => {
    document.getElementById('game-btn').click();
    await new Promise((r) => setTimeout(r, 150));
    document.querySelector('#game-menu [data-solo="snack"]')?.click();
    for (let i = 0; i < 50 && !document.querySelector('#game-stage .sb'); i++) await new Promise((r) => setTimeout(r, 100));
    return !!document.querySelector('#game-stage .sb');
  });
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('snackBar') || 'null'));
const fits = (page) =>
  page.evaluate(() => {
    const out = [];
    for (const sel of ['#game-stage .game-stage-body', '#game-stage .sb', '#game-stage .sb-rows', '#game-stage .sb-panel']) {
      const e = document.querySelector(sel);
      if (e && !e.hidden && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)) out.push(`${sel} ${e.scrollWidth}×${e.scrollHeight} in ${e.clientWidth}×${e.clientHeight}`);
    }
    return out;
  });
const shownRows = (page) => page.evaluate(() => [...document.querySelectorAll('#game-stage .sb-row')].filter((r) => !r.hidden).map((r) => r.dataset.stand));
const priceOf = (page, stand) => page.evaluate((s) => document.querySelector(`#game-stage .sb-row[data-stand="${s}"] .sb-price`)?.textContent ?? '', stand);
const clickBuy = (page, stand) => page.evaluate((s) => document.querySelector(`#game-stage .sb-row[data-stand="${s}"] .sb-price`)?.click(), stand);
const lab = (page, id, arg) => page.evaluate(([i, a]) => window.__swmLab.run(i, a), [id, arg]);
const mode = (page, m) => page.evaluate((x) => document.querySelector(`#game-stage .sb-mode[data-mode="${x}"]`)?.click(), String(m));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  // A version 1 save with stars, a level-12 popcorn and coins: migrated, nothing lost.
  const v1 = {
    v: 1, coins: 50_000, earned: 60_000, lifetime: 90_000, watched: 0, stars: 2, cinemas: 0, seen: Date.now(),
    levels: { popcorn: 12, soda: 3 }, stats: { served: 1 }, badges: ['first-sale'], decor: ['marquee'],
  };
  const room = 'sbv' + Math.random().toString(36).slice(2, 8);
  const page = await person(ctx, room, { snackBar: JSON.stringify(v1), 'snackBar:testGuests': '1' });
  check(await openSnack(page), 'Snack Bar opens with a version 1 save');
  await wait(800);
  const migrated = await until(async () => {
    const s = await saved(page);
    return s?.v === 2 ? s : null;
  }, 8000);
  check(!!migrated && migrated.levels.popcorn === 12 && migrated.levels.soda === 3 && migrated.coins >= 50_000 && migrated.stars === 5 && migrated.decor[0] === 'marquee', 'the version 1 save is migrated: levels, coins, decorations kept, 2 stars → 5', JSON.stringify(migrated && { v: migrated.v, levels: migrated.levels, coins: migrated.coins, stars: migrated.stars }));
  // Soda has levels, so nachos is open too; candy is the next locked one; the hot dog grill is out of sight.
  // SIDE340: in the narrow column beside the video (1366 laptop) three rows fit: the newest ones.
  const narrowFirst = await page.evaluate(() => document.getElementById('game-stage').getBoundingClientRect().width < 380);
  const wantRows = narrowFirst ? ['soda', 'nachos', 'candy'] : ['popcorn', 'soda', 'nachos', 'candy'];
  check(JSON.stringify(await shownRows(page)) === JSON.stringify(wantRows), 'rows: the open stands and the next locked one', JSON.stringify(await shownRows(page)));

  // Buy ×10 and Max.
  await mode(page, 10);
  await wait(200);
  check(/×10/.test(await priceOf(page, 'popcorn')), 'in ×10 mode the price says ×10', await priceOf(page, 'popcorn'));
  await clickBuy(page, 'popcorn');
  await wait(300);
  check((await page.evaluate(() => JSON.parse(localStorage.getItem('snackBar')).levels.popcorn)) === 22, '×10 buys ten popcorn levels', String((await saved(page)).levels.popcorn));
  await mode(page, 'max');
  await wait(1200);
  const before = (await saved(page)).levels.soda;
  const label = await priceOf(page, 'soda');
  await clickBuy(page, 'soda');
  await wait(300);
  const after = (await saved(page)).levels.soda;
  check(after - before > 1 && label.includes(`×${after - before}`), 'Max buys as many soda levels as the coins allow, and says how many', `${before} → ${after}, ${label}`);
  check(await page.evaluate(() => localStorage.getItem('snackBar:buyMode') === 'max'), 'the buy mode is remembered');
  await mode(page, 1);

  // The Upgrades panel: a recipe (popcorn ≥ 5) and the staff.
  await page.evaluate(() => document.querySelector('#game-stage .sb-upgrades-open').click());
  await wait(300);
  const panel = await page.evaluate(() => ({
    recipes: [...document.querySelectorAll('#game-stage .sb-up[data-recipe]')].map((r) => r.dataset.recipe),
    staff: [...document.querySelectorAll('#game-stage .sb-up[data-staff]')].map((r) => r.dataset.staff),
    title: document.querySelector('#game-stage .sb-panel h3')?.textContent ?? '',
  }));
  check(panel.recipes.includes('popcorn:1') && panel.staff.length === 4, 'Upgrades lists the open popcorn recipe and the four staff', JSON.stringify(panel));
  check((await fits(page)).length === 0, 'the Upgrades panel fits without scrollbars', (await fits(page)).join('; '));
  await page.screenshot({ path: __dirname + '/sb3-upgrades.png' });
  await page.evaluate(() => document.querySelector('#game-stage .sb-up[data-recipe="popcorn:1"] .sb-up-buy').click());
  await wait(300);
  check((await saved(page)).recipes.includes('popcorn:1'), 'a recipe is bought from the panel');
  // Hire the usher (coins from the Test Lab).
  await page.evaluate(() => document.querySelector('.sb-panel-close').click());
  await lab(page, 'snackBar.coins', 20_000);
  await wait(300);
  await page.evaluate(() => document.querySelector('#game-stage .sb-upgrades-open').click());
  await wait(300);
  await page.evaluate(() => document.querySelector('#game-stage .sb-up[data-staff="usher"] .sb-up-buy').click());
  await wait(300);
  check((await saved(page)).staff.includes('usher'), 'the usher is hired');
  await page.evaluate(() => document.querySelector('.sb-panel-close')?.click());

  // The film plays: a customer comes (test guests) and the usher serves them within a few seconds.
  // The sync test only plays with someone else in the room: Sam joins from a second browser.
  const samCtx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await person(samCtx, room);
  await page.evaluate(() => document.getElementById('sync-test')?.click());
  await until(() => page.evaluate(() => document.querySelector('#game-stage .sb-state')?.classList.contains('on')), 10000);
  const served0 = (await saved(page)).stats.customers;
  const ushered = await until(async () => (await saved(page)).stats.customers > served0, 20000);
  check(!!ushered, 'the usher serves a waiting customer by itself', JSON.stringify(await page.evaluate(() => ({ on: document.querySelector('#game-stage .sb-state')?.className, guest: !!document.querySelector('#game-stage .sb-guest'), stats: JSON.parse(localStorage.getItem('snackBar')).stats, staff: JSON.parse(localStorage.getItem('snackBar')).staff }))));

  // Today's special: one row is tagged.
  const special = await page.evaluate(() => [...document.querySelectorAll('#game-stage .sb-row.special')].map((r) => r.dataset.stand));
  const todays = await page.evaluate(async () => {
    const day = Math.floor(Date.now() / 86_400_000);
    let x = day >>> 0;
    x ^= x >>> 16;
    x = Math.imul(x, 0x45d9f3b) >>> 0;
    x = (x ^ (x >>> 16)) >>> 0;
    return ['popcorn', 'soda', 'nachos', 'candy', 'second-counter', 'hotdog', 'ice-cream', 'arcade'][x % 8];
  });
  const shownNow = await shownRows(page);
  check(shownNow.includes(todays) ? special.length === 1 && special[0] === todays : special.length === 0, "today's special is tagged on its row (when that row shows)", `${todays}: ${JSON.stringify(special)}`);

  // All eight stands: the rows fit the window (the rest is "+N more"), the new stands show in the scene.
  await lab(page, 'snackBar.levels');
  await wait(1200);
  const rowsAll = await shownRows(page);
  // SIDE340 (0.9.97.114): on a 1366 laptop the default window is the narrow column beside the video (about 354 px):
  // three rows there, four in a window of the game's own size.
  const narrowWindow = await page.evaluate(() => document.getElementById('game-stage').getBoundingClientRect().width < 380);
  check(rowsAll.length >= (narrowWindow ? 3 : 4) && rowsAll.includes('arcade'), `with eight stands the newest ones show (at least ${narrowWindow ? 'three' : 'four'} rows in the default window)`, JSON.stringify(rowsAll));
  check((await fits(page)).length === 0, 'eight stands fit without scrollbars (laptop)', (await fits(page)).join('; '));
  // 0.9.97.115 (owner: "Upgrades runs off the bottom, the staff list is cut"): with every stand open the list may scroll
  // inside the panel, its ✕ stays in sight and the last staff member can be reached.
  await page.evaluate(() => document.querySelector('#game-stage .sb-upgrades-open').click());
  await wait(400);
  const longList = await page.evaluate(async () => {
    const panel = document.querySelector('#game-stage .sb-panel');
    panel.scrollTop = panel.scrollHeight;
    await new Promise((r) => setTimeout(r, 100));
    const pr = panel.getBoundingClientRect();
    const close = panel.querySelector('.sb-panel-close').getBoundingClientRect();
    const rows = panel.querySelectorAll('.sb-up');
    const last = rows[rows.length - 1].getBoundingClientRect();
    return { rows: rows.length, close: close.top >= pr.top - 1 && close.bottom <= pr.bottom + 1, last: last.bottom <= pr.bottom + 1 && last.top >= pr.top, stage: (() => { const b = document.querySelector('#game-stage .game-stage-body'); return b.scrollHeight <= b.clientHeight + 1; })() };
  });
  check(longList.rows >= 12 && longList.close && longList.last && longList.stage, 'Upgrades with every stand: the list scrolls inside the panel, ✕ in sight, the last staff member reachable', JSON.stringify(longList));
  await page.evaluate(() => document.querySelector('#game-stage .sb-panel-close')?.click());
  await wait(300);
  const scene = await page.evaluate(() => {
    const art = document.querySelector('#game-stage .sb-scene-art');
    const p = art.dataset.prefix;
    return ['hotdog', 'ice-cream', 'arcade'].map((g) => art.querySelector(`#${p}${g}`)?.style.display !== 'none');
  });
  check(scene.every(Boolean), 'the hot dog grill, ice cream cart and arcade show in the scene', JSON.stringify(scene));
  check(await page.evaluate(() => /📋/.test(document.querySelector('#game-stage .sb-row[data-stand="popcorn"] .sb-tag')?.textContent ?? '') || document.querySelector('#game-stage .sb-row[data-stand="popcorn"]').hidden), 'a stand at level 25+ carries the menu mark');
  await page.screenshot({ path: __dirname + '/sb3-laptop.png' });

  // The new places: seaside (cinema #5) and planetarium (#6).
  // From the lobby the lab steps through the places: drive-in, rooftop, art house, then the seaside and planetarium.
  for (let i = 0; i < 3; i++) await lab(page, 'snackBar.place');
  for (const [cinemas, place, sign] of [[4, 'seaside', 'SEASIDE'], [5, 'planetarium', 'PLANETARIUM']]) {
    await lab(page, 'snackBar.place');
    await wait(400);
    const shown = await page.evaluate((id) => {
      const art = document.querySelector('#game-stage .sb-scene-art');
      return { backdrop: art.querySelector(`#${art.dataset.prefix}place-${id}`)?.style.display !== 'none', sign: art.querySelector(`#${art.dataset.prefix}sign text`)?.textContent };
    }, place);
    check(shown.backdrop && shown.sign === sign, `cinema #${cinemas + 1} is the ${place} with its own backdrop and sign`, JSON.stringify(shown));
    await page.screenshot({ path: __dirname + `/sb3-${place}.png` });
  }

  // Phone: eight stands fit, the controls are 44 px.
  const phone = await browser.newContext({ ...devices['iPhone 13'] });
  const save8 = await saved(page);
  const pam = await person(phone, 'sbp' + Math.random().toString(36).slice(2, 8), { snackBar: JSON.stringify(save8) });
  check(await openSnack(pam), 'phone: Snack Bar opens');
  await wait(800);
  check((await fits(pam)).length === 0, 'phone: eight stands fit without scrollbars', (await fits(pam)).join('; '));
  const small = await pam.evaluate(() =>
    [...document.querySelectorAll('#game-stage .sb :is(.sb-mode, .sb-upgrades-open, .sb-price)')]
      .filter((b) => b.offsetParent && b.getBoundingClientRect().height < 43.5)
      .map((b) => `${b.className} ${Math.round(b.getBoundingClientRect().height)}`),
  );
  check(small.length === 0, 'phone: the buy modes, Upgrades and prices are 44 px targets', small.join(', '));
  await pam.screenshot({ path: __dirname + '/sb3-phone.png' });

  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Snack Bar v2 harness passed');
  process.exit(failed ? 1 : 0);
})();
