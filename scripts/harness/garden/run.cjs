// 🌱 Window Garden in the room (card "Window Garden"): two people, Alex opens it from the gallery's "On the side".
// Checks: it opens, fits without scrollbars (own size, a small window, a phone sheet), plants don't grow while
// nothing plays, they grow while the sync test plays, one blooms and is picked into the album, a thirsty pot shows 💧
// and can be watered, a seed is planted in the empty pot, the message box keeps the focus.
//
//   npm run dev, then: node scripts/harness/garden/run.cjs [site]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
const room = 'wg' + Math.random().toString(36).slice(2, 8);
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
  page.on('pageerror', (e) => console.log('pageerror', name, e.message));
  await page.goto(`${SITE}/`);
  await page.waitForTimeout(800);
  await page.evaluate(([n, a, more]) => {
    localStorage.setItem('name', n);
    localStorage.setItem('avatar', a);
    localStorage.setItem('lang', 'en');
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('tipsSeen', '1');
    localStorage.setItem('opt:hubTab', 'side');
    for (const [k, v] of Object.entries(more)) localStorage.setItem(k, v);
  }, [name, avatar, extra]);
  await page.goto(`${SITE}/r/${room}#back`);
  await until(() => page.evaluate(() => !!document.querySelector('#game-btn')));
  await page.waitForTimeout(1500);
  return page;
}
const openGarden = (page) =>
  page.evaluate(async () => {
    const button = ['#dock-game', '#game-btn', '#more-game'].map((x) => document.querySelector(x)).find((e) => e && (e.getBoundingClientRect().width > 0 || e.id === 'more-game'));
    button.click();
    for (let i = 0; i < 30 && !document.querySelector('#game-menu [data-solo="garden"]'); i++) await new Promise((r) => setTimeout(r, 100));
    document.querySelector('#game-menu [data-solo="garden"]')?.click();
    for (let i = 0; i < 50 && !document.querySelector('#game-stage .wg'); i++) await new Promise((r) => setTimeout(r, 100));
    return !!document.querySelector('#game-stage .wg');
  });
const fits = (page) =>
  page.evaluate(() => {
    const out = [];
    for (const sel of ['#game-stage .game-stage-body', '#game-stage .wg']) {
      const e = document.querySelector(sel);
      if (e && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)) out.push(`${sel} ${e.scrollWidth}×${e.scrollHeight} in ${e.clientWidth}×${e.clientHeight}`);
    }
    const st = document.getElementById('game-stage').getBoundingClientRect();
    if (st.width < 100 || st.right > innerWidth + 1 || st.bottom > innerHeight + 1 || st.left < -1 || st.top < -1) out.push(`window ${JSON.stringify(st)}`);
    return out;
  });
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('windowGarden') || 'null'));

(async () => {
  const browser = await chromium.launch();
  const ctxA = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const ctxS = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const seed = JSON.stringify({
    v: 1,
    pots: [{ plant: 'mint', growth: 0.9985, water: 1 }, { plant: 'fern', growth: 0.6, water: 0.1 }, null],
    seeds: { common: 2, uncommon: 0, rare: 0, legendary: 0 },
    album: { fern: 1 },
    watched: 0, seedClock: 0, together: 0, eveningSeed: false, seen: 0, ended: [],
  });
  const alex = await person(ctxA, 'Alex', 'wizard', { windowGarden: seed });
  const sam = await person(ctxS, 'Sam', 'elf');

  check(await openGarden(alex), 'Window Garden opens from the gallery’s "On the side"');
  check((await fits(alex)).length === 0, 'fits without scrollbars at its own size', (await fits(alex)).join('; '));
  check(/1\/8/.test(await alex.evaluate(() => document.querySelector('.wg-album-count').textContent)), 'the album says 1/8');
  const drop = await alex.evaluate(() => !!document.querySelector('.wg-pot[data-pot="1"] .wg-drop'));
  check(drop, 'a thirsty pot shows 💧');

  // Nothing plays: no growth.
  const g0 = (await saved(alex)).pots[0].growth;
  await wait(6000);
  check((await saved(alex)).pots[0].growth === g0, 'no growth while nothing plays');
  check(/Resting/.test(await alex.evaluate(() => document.querySelector('.wg-state').textContent)), 'the pill says resting');

  // Water the thirsty fern, keeping the focus in the message box.
  await alex.evaluate(() => document.getElementById('chat-input')?.focus());
  await alex.click('.wg-pot[data-pot="1"]');
  await alex.click('.wg-action .wg-btn.main');
  const fern = (await until(async () => { const s = await saved(alex); return s.pots[1].water > 0.9 ? s : null; }, 4000))?.pots[1];
  check(fern && fern.water > 0.9, 'watering fills the pot’s water (saved)', JSON.stringify(fern));
  const focus = await alex.evaluate(() => document.activeElement?.id);
  check(focus === 'chat-input', 'the message box keeps the focus', String(focus));

  // Plant a seed in the empty pot.
  await alex.click('.wg-pot[data-pot="2"]');
  await alex.click('.wg-action .wg-btn');
  const planted = await until(async () => { const s = await saved(alex); return s.pots[2] ? s : null; }, 4000);
  check(!!planted && planted.seeds.common === 1, 'a seed is planted in the empty pot', JSON.stringify(planted?.pots[2]));

  // The sync test plays: the mint blooms, gets picked into the album.
  await alex.evaluate(() => document.getElementById('sync-test').click());
  const growing = await until(() => alex.evaluate(() => /Growing/.test(document.querySelector('.wg-state').textContent)), 8000);
  check(!!growing, 'the pill turns to "Growing" when the room plays');
  const bloomed = await until(() => alex.evaluate(() => document.querySelector('.wg-pot[data-pot="0"]').classList.contains('bloom')), 10000);
  check(!!bloomed, 'the mint blooms while the video plays');
  await alex.click('.wg-pot[data-pot="0"]');
  await alex.click('.wg-action .wg-btn.main');
  const picked = await until(async () => { const s = await saved(alex); return s.album.mint ? s : null; }, 4000);
  check(!!picked && picked.pots[0] === null, 'Pick puts it into the album and frees the pot');
  const note = await alex.evaluate(() => document.querySelector('.wg-note')?.textContent ?? '');
  check(/New in your album/.test(note), 'a first find says "New in your album"', note);
  check(/2\/8/.test(await alex.evaluate(() => document.querySelector('.wg-album-count').textContent)), 'the album says 2/8');
  await alex.screenshot({ path: __dirname + '/garden-window.png' });

  // Smaller screen.
  await alex.setViewportSize({ width: 900, height: 560 });
  await wait(600);
  check((await fits(alex)).length === 0, 'fits a 900×560 window', (await fits(alex)).join('; '));

  // Phone.
  const phone = await browser.newContext({ ...devices['iPhone 13'] });
  const pam = await person(phone, 'Pam', 'elf');
  check(await openGarden(pam), 'phone: it opens');
  await wait(500);
  check((await fits(pam)).length === 0, 'phone: fits without scrollbars', (await fits(pam)).join('; '));
  await pam.screenshot({ path: __dirname + '/garden-phone.png' });

  void sam;
  await browser.close();
  console.log(failed ? `\n✗ ${failed} checks failed` : '\n✓ Window Garden harness passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
