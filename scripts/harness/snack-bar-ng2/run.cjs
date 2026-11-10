// 🍿 Snack Bar extras (card NG2): a save from before NG2 carries over, each place has its own shop-front colours, a
// stand's milestone plays its own sound, this week's seasonal stand sits on top of Upgrades and the Test Lab moves the
// week on, the film's receipt carries the manager's report; laptop and phone, no scrollbars.
//
//   npm run dev (or wrangler dev with the built site), then: node scripts/harness/snack-bar-ng2/run.cjs [site]
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
    // These checks were written for Snack Bar's free window; since 0.9.97.112 a 1366 laptop opens it in the video's
    // place by default (no room beside the video), so the run picks the free window as a person would with the switch.
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


const SEASONS = ['cocoa', 'lemonade', 'cotton-candy', 'caramel-apple'];
const weekNow = () => Math.floor((Math.floor(Date.now() / 86_400_000) + 3) / 7);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  // A version 2 save from before NG2 (no `season` field): it must load as it is.
  const old = {
    v: 2, coins: 5e6, earned: 5e6, lifetime: 5e6, watched: 0, stars: 0, cinemas: 0, seen: Date.now(),
    levels: { popcorn: 49, soda: 12, nachos: 3, candy: 0, 'second-counter': 0, hotdog: 0, 'ice-cream': 0, arcade: 0 },
    stats: { served: 5, customers: 0, together: 0, voiceServed: 0, films: 0, watched: 0 }, badges: ['first-sale'], film: null,
    receipts: [], decor: ['marquee'], recipes: [], staff: [],
  };
  const page = await person(ctx, 'sbn' + Math.random().toString(36).slice(2, 8), { snackBar: JSON.stringify(old) });
  check(await openSnack(page), 'Snack Bar opens with a save from before NG2');
  await wait(800);
  const loaded = await saved(page);
  check(loaded?.levels.popcorn === 49 && loaded.coins >= 5e6 && loaded.season === null, 'the old save carries over (levels, coins kept, no seasonal stand yet)', JSON.stringify(loaded && { levels: loaded.levels, coins: loaded.coins, season: loaded.season }));

  // Place colours: the lobby's defaults, then the drive-in's own.
  const colours = () =>
    page.evaluate(() => {
      const sb = document.querySelector('#game-stage .sb');
      const art = sb.querySelector('.sb-scene-art');
      const stop = art.querySelector(`#${art.dataset.prefix}cswall stop`);
      return { place: sb.dataset.place, panel: getComputedStyle(sb).getPropertyValue('--sb-panel').trim(), wall: stop ? getComputedStyle(stop).stopColor : '' };
    });
  const lobby = await colours();
  // A real click: it gives the page the user activation sounds need.
  await page.evaluate(() => {
    window.__sounds = [];
    addEventListener('swm-sound', (e) => window.__sounds.push(e.detail));
  });
  // SIDE340 (0.9.97.115): on this laptop the window is the narrow column beside the video, where the popcorn row (the
  // oldest) is out of sight: a real click on the window's title gives the activation, then the row's button is pressed.
  await page.click('#game-stage .game-stage-title');
  await page.evaluate(() => document.querySelector('#game-stage .sb-row[data-stand="popcorn"] .sb-price').click());
  await wait(600);
  const sounds = await page.evaluate(() => window.__sounds);
  check((await saved(page)).levels.popcorn === 50 && sounds.includes('snackPop'), "popcorn's level-50 milestone plays the popcorn's own sound", JSON.stringify(sounds));
  await lab(page, 'snackBar.place');
  await wait(400);
  const drive = await colours();
  check(lobby.place === 'lobby' && drive.place === 'drive-in' && drive.panel && drive.panel !== lobby.panel && drive.wall !== lobby.wall, 'the drive-in has its own shop-front colours (panel and back wall)', JSON.stringify({ lobby, drive }));
  await page.screenshot({ path: __dirname + '/ng2-drive-in.png' });

  // This week's seasonal stand: on top of Upgrades, bought with coins.
  await page.evaluate(() => document.querySelector('#game-stage .sb-upgrades-open').click());
  await wait(300);
  const row = await page.evaluate(() => document.querySelector('#game-stage .sb-up.sb-season')?.dataset.season ?? null);
  check(row === SEASONS[weekNow() % 4], "Upgrades shows this week's seasonal stand on top", `${row} (expected ${SEASONS[weekNow() % 4]})`);
  // 0.9.97.115: in the narrow column the Upgrades list may scroll inside its panel (✕ stays in sight); nothing else may.
  const upFit = (await fits(page)).filter((f) => !f.startsWith('#game-stage .sb-panel '));
  const upClose = await page.evaluate(() => {
    const p = document.querySelector('#game-stage .sb-panel').getBoundingClientRect();
    const x = document.querySelector('#game-stage .sb-panel-close').getBoundingClientRect();
    return x.height > 0 && x.top >= p.top - 1 && x.bottom <= p.bottom + 1;
  });
  check(upFit.length === 0 && upClose, 'the Upgrades panel with the seasonal stand fits (its list may scroll inside, ✕ in sight)', upFit.join('; '));
  await page.evaluate(() => document.querySelector('#game-stage .sb-up.sb-season .sb-up-buy').click());
  await wait(300);
  const bought = (await saved(page)).season;
  check(bought?.level === 1 && bought.week === weekNow(), 'a level of the seasonal stand is bought', JSON.stringify(bought));
  await page.screenshot({ path: __dirname + '/ng2-upgrades.png' });

  // The Test Lab moves the week on: the stand leaves, the next one comes, a line says so.
  const next = await lab(page, 'snackBar.season');
  await wait(400);
  const after = await page.evaluate(() => ({
    row: document.querySelector('#game-stage .sb-up.sb-season')?.dataset.season,
    hint: document.querySelector('#game-stage .sb-note, #game-stage .game-hint')?.textContent ?? '',
    season: JSON.parse(localStorage.getItem('snackBar')).season,
  }));
  check(after.row === SEASONS[(weekNow() + 1) % 4] && /cocoa|lemonade|cotton-candy|caramel-apple/.test(JSON.stringify(next)) && JSON.stringify(next).includes(after.row) && after.season === null && /Hot cocoa|Lemonade|Cotton candy|Caramel apples/.test(after.hint), "next week: last week's stand leaves and the next one comes", JSON.stringify({ next, ...after }));

  // The manager's report on the film's receipt.
  await page.evaluate(() => document.querySelector('.sb-panel-close')?.click());
  await lab(page, 'snackBar.report');
  await wait(500);
  const report = await page.evaluate(() => {
    const r = document.querySelector('#game-stage .sb-receipt .sb-report');
    return r && { rows: [...r.querySelectorAll('li')].map((li) => li.textContent), next: r.querySelector('li[data-next]')?.dataset.next };
  });
  check(!!report && report.rows.length === 2 && /Popcorn machine \d+ %/.test(report.rows[0]) && report.next !== 'none' && report.rows[1].length > 9, "the receipt carries the manager's report: what sold most and what to buy next", JSON.stringify(report));
  check((await fits(page)).length === 0, 'the receipt with the report fits without scrollbars (laptop)', (await fits(page)).join('; '));
  await page.screenshot({ path: __dirname + '/ng2-report.png' });

  // Phone: the receipt with its report and Upgrades with the seasonal stand fit.
  const phone = await browser.newContext({ ...devices['iPhone 13'] });
  const pam = await person(phone, 'sbq' + Math.random().toString(36).slice(2, 8), { snackBar: JSON.stringify(await saved(page)) });
  check(await openSnack(pam), 'phone: Snack Bar opens');
  await wait(800);
  await lab(pam, 'snackBar.report');
  await wait(500);
  check(!!(await pam.evaluate(() => document.querySelector('#game-stage .sb-report'))) && (await fits(pam)).length === 0, 'phone: the receipt with the report fits', (await fits(pam)).join('; '));
  await pam.screenshot({ path: __dirname + '/ng2-phone-report.png' });
  await pam.evaluate(() => document.querySelector('.sb-collect')?.click());
  await wait(300);
  await pam.evaluate(() => document.querySelector('#game-stage .sb-upgrades-open').click());
  await wait(300);
  const small = await pam.evaluate(() =>
    [...document.querySelectorAll('#game-stage .sb-up.sb-season .sb-up-buy')].filter((b) => b.getBoundingClientRect().height < 43.5).length,
  );
  check(small === 0 && (await fits(pam)).length === 0, 'phone: Upgrades with the seasonal stand fits, its button is a 44 px target', (await fits(pam)).join('; '));
  await pam.screenshot({ path: __dirname + '/ng2-phone-upgrades.png' });

  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Snack Bar NG2 harness passed');
  process.exit(failed ? 1 : 0);
})();
