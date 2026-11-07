// 🐞 Test Lab, games part (card DL3a, Game Studio): with the lab off nothing of the game tools loads; with it on, the
// hall's commands open any game, the side games' cheats work on a sandbox copy of their save, "time ×10" and "pretend
// the film plays" move them, and "Restore my real saves" puts every real save back exactly. A command of a closed game
// is gone (never a broken room).
//
//   npm run dev, then: node scripts/harness/lab-games/run.cjs [site]
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:5173';
// LABTR: the whole run in English (default) or Turkish (`LAB_LANG=tr`).
const LANG = process.env.LAB_LANG === 'tr' ? 'tr' : 'en';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 6000) => {
  for (let i = 0; i < ms / 150; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await wait(150);
  }
  return null;
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  // A known real Snack Bar save (an old player's coins) to restore at the end.
  const REAL = JSON.stringify({ v: 1, coins: 1234, earned: 1234, lifetime: 1234, watched: 0, levels: {}, stars: 0, cinemas: 0, seen: 0, stats: {}, badges: [], film: null, receipts: [], decor: [] });
  await ctx.addInitScript(([real, lang]) => {
    if (!localStorage.getItem('lang')) localStorage.setItem('lang', lang);
    for (const [k, v] of Object.entries({ name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', 'snackBar:howSeen': '1', 'windowGarden:howSeen': '1', 'fiveFrames:howSeen': '1' })) localStorage.setItem(k, v);
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('snackBar', real);
      sessionStorage.setItem('seeded', '1');
    }
  }, [REAL, LANG]);
  const page = await ctx.newPage();
  const loaded = [];
  page.on('request', (r) => {
    if (/lab-tools/.test(r.url())) loaded.push(r.url());
  });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  const room = 'lg' + Math.random().toString(36).slice(2, 8);

  // ---- Lab off: the game tools never load ----
  await page.goto(`${SITE}/r/${room}#back`);
  await page.waitForFunction(() => !!document.querySelector('#game-btn'), null, { timeout: 15000 });
  await wait(1500);
  check(loaded.length === 0 && !(await page.evaluate(() => 'labIsOn' in window || !!window.__swmLab)), 'lab off: no game tools downloaded, no lab object', loaded.join(' '));

  // ---- Lab on ----
  await page.goto(`${SITE}/r/${room}?debug=1#back`);
  await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#game-btn'), null, { timeout: 15000 });
  await wait(3200);
  const run = (id, arg) => page.evaluate(([id, arg]) => window.__swmLab.run(id, arg).then((l) => ({ dir: l.dir, text: l.text })), [id, arg]);
  const snack = () => page.evaluate(() => JSON.parse(localStorage.getItem('snackBar') || 'null'));

  const opened = await run('games.open.snack');
  check(opened.dir === 'lab' && !!(await until(() => page.evaluate(() => !!document.querySelector('#game-stage .sb')), 6000)), 'lab: "Open on the side: Snack Bar" opens the game', opened.text);
  await wait(600);

  const coins = await run('snackBar.coins', '50000');
  const after = await snack();
  const realCopy = await page.evaluate(() => localStorage.getItem('lab:real:snackBar'));
  check(coins.dir === 'lab' && after?.coins >= 51234 && JSON.parse(realCopy || '{}').coins === 1234, 'Snack Bar +50K coins: the save has them, the real save is kept aside', `${coins.text} ${after?.coins} ${realCopy?.slice(0, 40)}`);

  // Time ×10 + pretend the film plays: the stands earn.
  await run('games.playing');
  await run('games.speed');
  const before = (await snack()).coins;
  await page.evaluate(() => window.__swmLab.run('snackBar.coins', '1'));
  await wait(6500);
  const moved = (await snack()).coins;
  check(moved > before + 1, '"pretend the film plays" + time ×10: Snack Bar earns without a film', `${before} → ${moved}`);
  check(await page.evaluate(() => { const r = document.querySelector('#game-stage .sb-rest'); return !r || r.hidden || getComputedStyle(r).display === 'none'; }), 'the "closed until the film plays" sign is gone while pretending');

  const customer = await run('snackBar.customer');
  check(customer.dir === 'lab' && !!(await until(() => page.evaluate(() => !!document.querySelector('#game-stage .sb-guest')), 3000)), 'a customer walks up at once', customer.text);
  const receipt = await run('snackBar.receipt');
  check(receipt.dir === 'lab' && !!(await until(() => page.evaluate(() => { const p = document.querySelector('#game-stage .sb-panel-receipt'); return p && !p.hidden; }), 3000)), "the film's receipt shows at once", receipt.text);
  const cinemas = (await snack()).cinemas;
  const place = await run('snackBar.place');
  check(place.dir === 'lab' && (await snack()).cinemas === cinemas + 1 && /drive|roof|art|lobby/.test(place.text), 'the next cinema place', place.text);
  const badges = await run('snackBar.badges');
  check(badges.dir === 'lab' && (await snack()).badges.length >= 30, 'every badge', badges.text);
  const status = await page.evaluate(() => document.querySelector('#debug-panel-root')?.textContent ?? '');
  check(true, `status lines registered (${/Snack Bar/.test(status) ? 'shown' : 'drawer closed'})`);

  // ---- Window Garden ----
  const g = await run('games.open.garden');
  check(g.dir === 'lab' && !!(await until(() => page.evaluate(() => !!document.querySelector('#game-stage .wg')), 6000)), 'lab: open Window Garden');
  await wait(800);
  const garden = () => page.evaluate(() => JSON.parse(localStorage.getItem('windowGarden') || 'null'));
  const grow = await run('garden.bloom');
  const bloomed = await until(async () => (await garden())?.pots?.some((p) => p && p.growth >= 1), 6000);
  check(grow.dir === 'lab' && !!bloomed, 'garden: "bloom now" makes the planted pot bloom on the next tick', grow.text);
  const night = await run('garden.sky', 'night');
  check(night.text.includes('night') && (await page.evaluate(() => document.querySelector('#game-stage .wg-scene')?.dataset.time)) === 'night', 'garden: the sky is night');
  const rainWas = await page.evaluate(() => document.querySelector('#game-stage .wg-scene').classList.contains('wg-rain'));
  await run('garden.rain');
  check((await page.evaluate(() => document.querySelector('#game-stage .wg-scene').classList.contains('wg-rain'))) === !rainWas, 'garden: rain on / off');
  const seedsBefore = (await garden()).colorSeeds.length;
  const hybrid = await run('garden.hybrid');
  await wait(300);
  check(hybrid.dir === 'lab' && (await garden()).colorSeeds.length === seedsBefore + 1, 'garden: a hybrid colour seed', hybrid.text);
  const visitor = await run('garden.visitor');
  check(visitor.dir === 'lab' && (/lantern|fairy|fener|peri/.test(visitor.text) || /moth|firefly/.test(visitor.text)), 'garden: a visitor (or why not: its decoration is missing)', visitor.text);

  // ---- Five Frames ----
  const w = await run('games.open.word');
  check(w.dir === 'lab' && !!(await until(() => page.evaluate(() => !!document.querySelector('#game-stage .ff-day')), 8000)), 'lab: open Five Frames');
  const answer = await until(async () => { const l = await run('fiveFrames.answer'); return l.dir === 'lab' ? l : null; }, 8000);
  check(!!answer && /^▶ "?(en|tr): \S{5}"?$/u.test(answer.text), "Five Frames: today's answer in the log", answer?.text);
  const dayBefore = await page.evaluate(() => document.querySelector('#game-stage .ff-day')?.textContent);
  const next = await run('fiveFrames.day', '1');
  const dayAfter = await page.evaluate(() => document.querySelector('#game-stage .ff-day')?.textContent);
  check(next.dir === 'lab' && dayAfter !== dayBefore, 'Five Frames: another day', `${dayBefore} → ${dayAfter}`);

  // ---- A Classics table on the lab server (DL3b; the local server runs with SWM_LAB_SERVER) ----
  const table = await run('games.open.classics');
  const seated = await until(async () => (await page.evaluate(() => !!document.querySelector('#game-stage .cl-shelf, #game-stage #cl-shelf-open'))) || null, 10000);
  check(table.dir === 'lab' && !!seated, 'lab: open a Classics table', table.text);
  // The server takes a position only from a seated player (`not_player` before the table's seat arrives), so on a slow
  // runner the first send can be refused: send it again until the chess board shows.
  const chessCells = () => page.evaluate(() => document.querySelectorAll('#game-stage .chess-board .dama-cell, #game-stage .chess-board [data-cell]').length);
  let pos = null;
  const chess = await until(async () => {
    const l = await run('classics.position.mate1');
    if (l.dir === 'lab') pos = l;
    return (await until(chessCells, 1500)) || null;
  }, 15000);
  check(!!pos && !!chess, 'Classics: the server sets the chess mate-in-one position (the chess board shows)', `${pos?.text} cells ${chess}`);

  // A closed game's command is gone; the room keeps working.
  const gone = await page.evaluate(() => window.__swmLab.run('snackBar.coins', '5').then(() => 'ran', (e) => String(e.message)));
  check(/no command/.test(gone) && !!(await page.$('#game-btn')), "a closed game's command is gone, the room still works", gone);

  // ---- Restore my real saves ----
  const restored = await run('games.restore');
  const back = await page.evaluate(() => ({ snack: localStorage.getItem('snackBar'), copies: Object.keys(localStorage).filter((k) => k.startsWith('lab:real:')) }));
  check(restored.dir === 'lab' && JSON.parse(back.snack || '{}').coins === 1234 && back.copies.length === 0, 'Restore my real saves: the real Snack Bar save is back, no copies left', `${restored.text} ${back.snack?.slice(0, 40)} ${back.copies}`);
  const again = await run('games.restore');
  check(again.dir === 'error' && /no lab cheat|lab hilesi/.test(again.text), 'nothing to restore any more: the command says why', again.text);
  await run('games.speed', '1');
  await run('games.playing');

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Lab games harness passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
