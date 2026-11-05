// "Scroll Shorts together" (Research card, the owner's copy A): the home page's door creates a one-time room that
// starts a 🎲 Discover "Popular" feed as soon as I'm in, so the room opens in the Shorts view. Checks on a computer and
// a phone (EN + TR): the door is on the first screen, the room plays a Short from the pool, the feed keeps the queue
// filled, and a room made with plain "Create room" asks for no Shorts. The pool answer is faked (no YouTube key here).
//
//   npm run build && wrangler dev (8787), then: NODE_PATH=$(npm root -g) node scripts/harness/shorts-door/run.cjs [site]
const { viaYouTube } = require('../via-youtube.cjs');
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};

const POOL = Array.from({ length: 12 }, (_, i) => ({ id: i === 0 ? 'aqz-KE-bpKQ' : `doorShort${String(i).padStart(2, '0')}`, title: `Short ${i}`, channel: 'C', duration: 30, live: false, short: true }));

async function setup(ctx, lang) {
  await viaYouTube(ctx);
  const asked = [];
  await ctx.route('**/api/youtube/pool**', (route) => {
    asked.push(route.request().url());
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: POOL }) });
  });
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('opt:autoInvite', '0');
      if (!localStorage.getItem('lang')) localStorage.setItem('lang', l);
    } catch {}
  }, lang);
  return asked;
}

async function enter(page) {
  await page.waitForSelector('#name');
  await page.fill('#name', 'Alex');
  await page.click('#name-form button.primary');
}

async function run(name, options, lang) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(options);
  const asked = await setup(ctx, lang);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${SITE}/`);
  await page.waitForSelector('#shorts-door');
  const door = await page.evaluate(() => {
    const el = document.querySelector('#shorts-door');
    const r = el.getBoundingClientRect();
    return { text: el.textContent, top: Math.round(r.top), bottom: Math.round(r.bottom), right: Math.round(r.right), h: innerHeight, w: innerWidth, sw: document.documentElement.scrollWidth };
  });
  const want = lang === 'tr' ? "Shorts'u birlikte kaydır" : 'Scroll Shorts together';
  check(door.text.includes(want) && door.text.includes(lang === 'tr' ? 'Herkes kaydırabilir' : 'Anyone can swipe'), `${name}: the door says "${want}"`, door.text);
  check(door.bottom <= door.h && door.top >= 0 && door.right <= door.w && door.sw <= door.w, `${name}: the door is on the first screen, nothing sideways`, door);

  await page.click('#shorts-door');
  await page.waitForURL(/\/r\/[a-z0-9]+/);
  await enter(page);
  const started = await page
    .waitForFunction(() => document.documentElement.classList.contains('shorts-view'), null, { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  check(started, `${name}: the room opens in the Shorts view`);
  check(asked.length > 0 && asked.every((url) => /kind=popular/.test(url)), `${name}: the feed asks Discover's "Popular" pool`, asked);
  await page.waitForTimeout(2500);
  const state = await page.evaluate(() => ({
    feedOn: document.querySelector('#shorts-feed')?.classList.contains('on'),
    left: document.querySelector('#shorts-left')?.textContent ?? '',
    saved: Object.keys(sessionStorage).filter((k) => k.startsWith('shorts:') && sessionStorage.getItem(k)),
  }));
  check(state.feedOn === true, `${name}: the ♾ feed runs`, state);
  check(Number.parseInt(state.left.replace(/\D/g, '') || '0', 10) >= 2, `${name}: the next Shorts wait in the queue`, state.left);
  check(state.saved.length === 0, `${name}: the door's mark is used once`, state.saved);

  // A plain "Create room" asks for no Shorts.
  const before = asked.length;
  await page.goto(`${SITE}/`);
  await page.click('#start-form button.primary');
  await page.waitForURL(/\/r\/[a-z0-9]+/);
  await enter(page);
  await page.waitForTimeout(2500);
  const plain = await page.evaluate(() => document.documentElement.classList.contains('shorts-view'));
  check(asked.length === before && !plain, `${name}: "Create room" stays an empty room`, { asked: asked.length - before, plain });
  check(errors.length === 0, `${name}: no page errors`, errors);
  await browser.close();
}

(async () => {
  await run('computer EN', { viewport: { width: 1366, height: 768 } }, 'en');
  await run('computer TR', { viewport: { width: 1366, height: 768 } }, 'tr');
  await run('phone EN', { ...devices['Pixel 7'] }, 'en');
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Shorts door: every check passed');
  process.exit(failed ? 1 : 0);
})();
