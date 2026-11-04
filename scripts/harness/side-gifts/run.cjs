// Side games 2, picks 5 + 8: the room's tip jar and a cutting for a friend, in two real browsers.
// Checks: Alex's Snack Bar serves fill the jar (the 🫙 pill shows how full); Alex gives a bloom's cutting to Sam from
// Window Garden ("🎁 Give a cutting" → Sam's name); Sam hears about it with the garden closed, opens Window Garden,
// finds the 🎁 seed in an empty pot's buttons and plants it; the bloom gives only one cutting.
//
//   npm run dev, then: node scripts/harness/side-gifts/run.cjs [site]
const { chromium } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
const room = 'gift' + Math.random().toString(36).slice(2, 8);
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

async function person(browser, name, avatar, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', name, e.message));
  await page.goto(`${SITE}/`);
  await page.evaluate(([n, a, more]) => {
    const keys = { name: n, avatar: a, lang: 'en', 'opt:autoInvite': '0', tipsSeen: '1', 'opt:hubTab': 'side', ...more };
    for (const k of ['snackBar', 'windowGarden', 'fiveFrames']) keys[k + ':howSeen'] = '1';
    for (const [k, v] of Object.entries(keys)) localStorage.setItem(k, v);
  }, [name, avatar, extra]);
  await page.goto(`${SITE}/r/${room}#back`);
  await until(() => page.evaluate(() => !!document.querySelector('#game-btn')));
  await page.waitForTimeout(1500);
  return page;
}
const openSolo = (page, kind, sel) =>
  page.evaluate(async ([kind, sel]) => {
    const button = ['#dock-game', '#game-btn'].map((x) => document.querySelector(x)).find((e) => e && e.getBoundingClientRect().width > 0);
    button.click();
    for (let i = 0; i < 30 && !document.querySelector(`#game-menu [data-solo="${kind}"]`); i++) await new Promise((r) => setTimeout(r, 100));
    document.querySelector(`#game-menu [data-solo="${kind}"]`)?.click();
    for (let i = 0; i < 50 && !document.querySelector(`#game-stage ${sel}`); i++) await new Promise((r) => setTimeout(r, 100));
    return !!document.querySelector(`#game-stage ${sel}`);
  }, [kind, sel]);
const buttons = (page) => page.evaluate(() => [...document.querySelectorAll('#game-stage .wg-btn')].map((b) => b.textContent.trim()));
const clickButton = (page, re) => page.evaluate((src) => {
  const b = [...document.querySelectorAll('#game-stage .wg-btn')].find((x) => new RegExp(src).test(x.textContent));
  b?.click();
  return !!b;
}, re.source);

(async () => {
  const browser = await chromium.launch();
  const bloom = JSON.stringify({
    v: 1,
    pots: [{ plant: 'mint', growth: 1, water: 1 }, null, null],
    seeds: { common: 0, uncommon: 0, rare: 0, legendary: 0 },
    album: {}, watched: 0, seedClock: 0, together: 0, eveningSeed: false, seen: Date.now(), ended: [],
  });
  const alex = await person(browser, 'Alex', 'wizard', { windowGarden: bloom });
  const sam = await person(browser, 'Sam', 'elf');

  // The tip jar: the sync test plays, Alex serves at the counter.
  await alex.evaluate(() => document.getElementById('sync-test').click());
  check(await openSolo(alex, 'snack', '.sb'), 'Alex opens Snack Bar');
  await until(() => alex.evaluate(() => document.querySelector('.sb-state')?.classList.contains('on')), 10000);
  for (let i = 0; i < 9; i++) {
    await alex.evaluate(() => document.querySelector('#game-stage .sb-scene').click());
    await wait(1100);
  }
  const jar = await until(() => alex.evaluate(() => { const j = document.querySelector('.sb-jar'); return j && !j.hidden ? j.textContent : null; }), 6000);
  check(!!jar && /🫙 \d+ %/.test(jar), 'the 🫙 pill shows how full the room\'s tip jar is', String(jar));
  const head = await alex.evaluate(() => { const h = document.querySelector('.sb-head'); return h.scrollWidth <= h.clientWidth + 1; });
  check(head, 'the head still fits with the jar pill');

  // A cutting for Sam.
  check(await openSolo(alex, 'garden', '.wg'), 'Alex opens Window Garden');
  await alex.evaluate(() => document.querySelector('#game-stage .wg-pot')?.click());
  await wait(400);
  check((await buttons(alex)).some((t) => /Give a cutting/.test(t)), 'a bloom offers "🎁 Give a cutting"', JSON.stringify(await buttons(alex)));
  await clickButton(alex, /Give a cutting/);
  await wait(300);
  check((await buttons(alex)).includes('Sam'), 'the chooser lists Sam', JSON.stringify(await buttons(alex)));
  await clickButton(alex, /^Sam$/);
  const sent = await until(() => alex.evaluate(() => { const n = document.querySelector('.wg-note'); return n && !n.hidden && /on its way to Sam/.test(n.textContent) ? n.textContent : null; }), 3000);
  check(!!sent, 'Alex is told the cutting is on its way');
  await wait(300);
  check(!(await buttons(alex)).some((t) => /Give a cutting/.test(t)), 'one cutting per bloom');
  const kept = await alex.evaluate(() => JSON.parse(localStorage.getItem('windowGarden')).pots[0].gifted);
  check(kept === true, 'the bloom remembers its cutting went');

  const waiting = await until(() => sam.evaluate(() => JSON.parse(localStorage.getItem('windowGarden:gifts') || '[]').length), 5000);
  check(waiting === 1, 'Sam\'s browser keeps the cutting with the garden closed');
  const hint = await sam.evaluate(() => [...document.querySelectorAll('.hint-bubble')].map((e) => e.textContent).join(' '));
  check(/gave you a cutting/.test(hint), 'Sam is told about it', hint.slice(0, 120));
  check(await openSolo(sam, 'garden', '.wg'), 'Sam opens Window Garden');
  const got = await until(async () => { const s = await sam.evaluate(() => JSON.parse(localStorage.getItem('windowGarden') || 'null')); return s?.giftSeeds?.length ? s : null; }, 6000);
  check(!!got && got.giftSeeds[0].from === 'Alex', 'the cutting arrives in Sam\'s tray with the giver\'s name');
  await sam.evaluate(() => document.querySelectorAll('#game-stage .wg-pot')[1]?.click());
  await wait(400);
  check(await clickButton(sam, /🎁 Mint/), 'an empty pot offers "🎁 Mint"', JSON.stringify(await buttons(sam)));
  const planted = await until(async () => { const s = await sam.evaluate(() => JSON.parse(localStorage.getItem('windowGarden'))); return s.pots[1]?.plant === 'mint' ? s : null; }, 4000);
  check(!!planted && planted.giftSeeds.length === 0, 'Sam plants it');

  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Side gifts harness passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
