// 🐞 Test Lab, every games command (card LAB2, Game Studio): opens each side game and each table from the 🎮 tab and
// runs every command registered for it, on a computer and a phone, in English and Turkish. A command may answer "not
// now, because …" (its `available` text), but it must never throw (an error line starting with ▶), never leave a page
// error behind, and every listed id must exist. The "not now" answers are printed so their help lines can be checked.
//
//   npm run dev (a local lab server), then: node scripts/harness/lab-games-all/run.cjs [site]
//   ONLY=laptop-en narrows the run (laptop-en, laptop-tr, phone-en, phone-tr).
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:5173';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 8000) => {
  for (let i = 0; i < ms / 150; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await wait(150);
  }
  return null;
};

/** Every command, by the game whose window registers it (in the order a person would try them). */
const SOLO = {
  snack: { root: '.sb', ids: ['snackBar.coins', 'snackBar.levels', 'snackBar.upgrades', 'snackBar.customer', 'snackBar.receipt', 'snackBar.report', 'snackBar.season', 'snackBar.milestone', 'snackBar.badges', 'snackBar.place'] },
  garden: { root: '.wg', ids: ['garden.seeds', 'garden.grow', 'garden.bloom', 'garden.hybrid', 'garden.sky', 'garden.rain', 'garden.visitor'] },
  word: { root: '.ff', ids: ['fiveFrames.answer', 'fiveFrames.day'] },
};
const TABLES = {
  classics: { root: '.xox-page', ids: ['classics.picker', 'classics.pick.chess', 'classics.position.mate1', 'classics.pick.dama', 'classics.position.chain', 'classics.pick.backgammon', 'classics.position.bearoff', 'classics.silent'] },
  sea: { root: '.sea', ids: ['sea.bot', 'sea.zoom', 'sea.oneLeft', 'sea.reveal', 'sea.silent'] },
  duel: { root: '.duel', ids: ['duel.match', 'duel.answer', 'duel.win', 'duel.silent'] },
  quiz: { root: '.quiz-page', ids: ['quiz.referee', 'quiz.skip', 'quiz.toEnd', 'games.friend', 'games.friendQuiet', 'games.friendLeave', 'quiz.silent'] },
  draw: { root: '.draw-page', ids: ['draw.referee', 'draw.skip', 'draw.toEnd', 'draw.silent'] },
  poker: { root: '.pk', ids: ['poker.referee', 'poker.end', 'poker.silent'] },
};
const GLOBAL = ['games.speed', 'games.playing', 'games.tipjar', 'games.friend', 'games.friendLeave', 'games.restore'];

async function audit(browser, device, lang) {
  const label = `${device}-${lang}`;
  const ctx = await browser.newContext(device === 'phone' ? { ...devices['iPhone 13'] } : { viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript((l) => {
    localStorage.setItem('lang', l);
    for (const [k, v] of Object.entries({ name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', 'snackBar:howSeen': '1', 'windowGarden:howSeen': '1', 'fiveFrames:howSeen': '1', 'sea:howSeen': '1', 'classics:howSeen': '1', 'quiz:howSeen': '1', 'draw:howSeen': '1', 'poker:howSeen': '1', 'duel:howSeen': '1' })) localStorage.setItem(k, v);
  }, lang);
  const page = await ctx.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto(`${SITE}/r/la${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
  await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#game-btn'), null, { timeout: 20000 });
  await wait(2500);
  const run = (id, arg) =>
    page.evaluate(([id, arg]) => window.__swmLab.run(id, arg).then((l) => ({ dir: l.dir, text: l.text }), (e) => ({ dir: 'missing', text: String(e?.message ?? e) })), [id, arg]);
  const broken = [];
  const notNow = [];
  const runAll = async (where, ids) => {
    for (const id of ids) {
      // A game registers its commands as it mounts: give a just-opened one a moment.
      let r = await run(id);
      for (let i = 0; i < 20 && r.dir === 'missing'; i++) {
        await wait(200);
        r = await run(id);
      }
      if (r.dir === 'missing' || (r.dir === 'error' && r.text.startsWith('▶'))) broken.push(`${where} ${id}: ${r.text}`);
      else if (r.dir === 'error') notNow.push(`${id}: ${r.text}`);
      await wait(350);
    }
  };
  for (const [kind, game] of Object.entries(SOLO)) {
    const opened = await run(`games.open.${kind}`);
    const ok = opened.dir === 'lab' && (await until(() => page.evaluate(() => !!document.querySelector('#game-stage .game-stage-body > :not(.game-stage-loading)'))));
    check(!!ok, `${label}: opens ${kind} from the 🎮 tab`, opened.text);
    if (ok) await runAll(kind, game.ids);
  }
  await runAll('hall', GLOBAL);
  for (const [kind, game] of Object.entries(TABLES)) {
    const opened = await run(`games.open.${kind}`);
    const ok = opened.dir === 'lab' && (await until(() => page.evaluate(() => !!document.querySelector('#game-stage .game-stage-body > :not(.game-stage-loading)')), 10000));
    check(!!ok, `${label}: opens a ${kind} table from the 🎮 tab`, opened.text);
    if (!ok) continue;
    await wait(1200);
    await runAll(kind, game.ids);
    // A silent table talks again after its 3 s.
    await wait(3500);
  }
  check(broken.length === 0, `${label}: every games command runs without an error`, broken.join(' | '));
  check(pageErrors.length === 0, `${label}: no page error`, pageErrors.slice(0, 3).join(' | '));
  console.log(`     ${label}: "not now" answers (${notNow.length}):\n       ${notNow.join('\n       ')}`);
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  const only = process.env.ONLY;
  for (const device of ['laptop', 'phone']) for (const lang of ['en', 'tr']) if (!only || only === `${device}-${lang}`) await audit(browser, device, lang);
  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Every games command passed');
  process.exit(fails ? 1 : 0);
})();
