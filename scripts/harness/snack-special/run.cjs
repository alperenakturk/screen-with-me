// 0.9.97.137: the Snack Bar's daily special ("⭐ ×2 today" on one stand, a different one each UTC day) never makes a
// row taller or the game smaller. Run with the special forced to each stand (the page's clock set to a day where that
// stand is the special; the results are keyed by the special the page shows) on an upright Android tablet, where the game's free window is the tightest: every row keeps
// the height it has on a day whose special is out of sight, the window's scale stays the same and text stays ≥ 11 px.
// Deterministic: it no longer depends on which day CI runs.
//   npm run build && (cd apps/server && npx wrangler dev --port 8787) and a video at :5300 (see tablet/run.cjs)
//   NODE_PATH=$(npm root -g) node scripts/harness/snack-special/run.cjs [http://localhost:8787] [video url]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
// A UTC day for each stand being the special (specialOf(dayNumber()), days since 1970: packages/shared/src/games/snack-bar.ts).
const DAYS = {
  nachos: '2026-11-10', hotdog: '2026-11-11', popcorn: '2026-11-12', 'ice-cream': '2026-11-13',
  arcade: '2026-11-14', soda: '2026-11-18', candy: '2026-11-20', 'second-counter': '2026-11-26',
};
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : ''}`);
  if (!ok) fails++;
};

async function snackAt(browser, day) {
  const ctx = await browser.newContext({ ...devices['Galaxy Tab S4'], viewport: { width: 768, height: 1024 } });
  await ctx.addInitScript((at) => {
    // The page's clock on that day (time still runs): the special is worked out from today's date.
    const Real = Date;
    const offset = at - Real.now();
    class Fake extends Real {
      constructor(...a) {
        super(...(a.length ? a : [Real.now() + offset]));
      }
      static now() {
        return Real.now() + offset;
      }
    }
    globalThis.Date = Fake;
    if (location.port !== '8787') return;
    localStorage.setItem('lang', 'en');
    localStorage.setItem('tipsSeen', '1');
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('snackBar:howSeen', '1');
  }, Date.parse(`${day}T12:00:00Z`));
  const page = await ctx.newPage();
  await page.goto(`${SITE}/r/snk${Math.random().toString(36).slice(2, 7)}`);
  await page.fill('#name', 'Alex');
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  // CI (16 Nov 2026): a link sent before the room's live connection was open got lost on a slow runner (no item after
  // 20 s). Wait for the connection, and send the link again once if no item shows.
  await page.waitForSelector('.room-title-dot[data-status="open"]', { state: 'attached', timeout: 20000 }).catch(() => {});
  const send = () =>
    page.evaluate((v) => {
      const i = document.querySelector('#media-input');
      i.value = v;
      i.form.requestSubmit();
    }, VIDEO);
  await send();
  // CI3: the state itself, with room for a slow runner (8 s timed out now and then; adding the item waits on the server).
  const added = () => page.waitForFunction(() => document.querySelector('.room.has-item'), null, { timeout: 10000, polling: 100 });
  await added().catch(async () => {
    await send();
    await added();
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('#dock-game')?.click());
  await page.waitForSelector('#game-menu:not([hidden])');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#game-menu [data-tab="side"]')?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#game-menu [data-solo="snack"]')?.click());
  await page.waitForSelector('#game-stage:not([hidden]) .sb-row', { timeout: 8000 });
  await page.waitForTimeout(1500);
  const g = await page.evaluate(() => {
    const s = document.querySelector('#game-stage');
    const fit = Number(getComputedStyle(s).getPropertyValue('--fit')) || 1;
    const texts = [...s.querySelectorAll('.game-stage-body *')].filter((e) => !e.closest('[aria-hidden="true"], svg') && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getBoundingClientRect().width > 0);
    const rows = [...s.querySelectorAll('.sb-row')].filter((r) => !r.hidden && r.offsetHeight);
    return {
      fit: Math.round(fit * 1000) / 1000,
      minText: Math.round(Math.min(...texts.map((e) => parseFloat(getComputedStyle(e).fontSize) * fit)) * 10) / 10,
      rows: Object.fromEntries(rows.map((r) => [r.dataset.stand, r.offsetHeight])),
      special: s.querySelector('.sb-row.special')?.dataset.stand ?? null,
      tag: s.querySelector('.sb-row.special .sb-tag')?.textContent ?? '',
    };
  });
  await ctx.close();
  return g;
}

(async () => {
  const reachable = await fetch(VIDEO, { method: 'HEAD' }).then((r) => r.ok, () => false);
  if (!reachable) {
    console.log(`✗ No video at ${VIDEO}`);
    process.exit(2);
  }
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  // Keyed by the special the page shows (the page's day decides it, in the browser's own time zone).
  const results = [];
  for (const day of Object.values(DAYS)) results.push({ day, ...(await snackAt(browser, day)) });
  if (process.env.SNACK_DEBUG) console.log(JSON.stringify(results, null, 1));
  // The baseline: a day whose special is not among the rows shown.
  const base = results.find((g) => !g.special || !(g.special in g.rows));
  check(!!base, 'a day with the special out of sight exists (the baseline)', base ?? results);
  const shown = Object.keys(base?.rows ?? {});
  const covered = new Set(results.filter((g) => g.special && g.special in g.rows).map((g) => g.special));
  check(shown.length > 0 && shown.every((id) => covered.has(id)), `every stand shown is the special on one of the days (${shown.join(', ')})`, [...covered]);
  for (const g of results) {
    if (!base || !g.special || !(g.special in g.rows)) continue;
    check(/×2/.test(g.tag), `${g.special} special (${g.day}): its row shows the tag`, g.tag);
    const taller = Object.entries(g.rows).filter(([id, h]) => base.rows[id] !== undefined && h > base.rows[id] + 1);
    check(taller.length === 0, `${g.special} special: no row grows`, { rows: g.rows, base: base.rows });
    check(g.fit >= base.fit - 0.005, `${g.special} special: the game is not scaled smaller`, { fit: g.fit, base: base.fit });
    check(g.minText >= 11, `${g.special} special: text stays ≥ 11 px`, g.minText);
  }
  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ The daily special never shrinks the Snack Bar');
  process.exit(fails ? 1 : 0);
})();
