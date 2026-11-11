// Card LAB3: a phone held sideways. (1) The first-time tips never cover "Watch fullscreen": held sideways they wait
// hidden and come back when the phone is upright. (2) An iPhone SE's empty room fits sideways: "No video yet", the steps
// and "Run a sync test" all inside the screen, nothing cut off.
//
//   built site on wrangler dev (CI):  npm run build && (cd apps/server && npx wrangler dev --port 8787)
//                                     node scripts/harness/phone-sideways/run.cjs http://localhost:8787
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};
const until = async (fn, ms = 8000) => {
  for (let i = 0; i < ms / 150; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
};
const tipShown = (page) =>
  page.evaluate(() => {
    const t = document.querySelector('.first-tip');
    if (!t) return false;
    const r = t.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(t).display !== 'none';
  });

async function enter(page, room, name, tips) {
  await page.addInitScript((seen) => {
    localStorage.setItem('lang', 'en');
    if (seen) localStorage.setItem('tipsSeen', '1');
  }, !tips);
  await page.goto(`${SITE}/r/${room}`);
  await page.fill('#name', name);
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
}

(async () => {
  const browser = await chromium.launch();
  const se = devices['iPhone SE'];
  const sideways = { width: se.viewport.height, height: se.viewport.width };

  // ---- (2) The empty room fits sideways on an iPhone SE ----
  {
    const ctx = await browser.newContext({ ...se });
    const page = await ctx.newPage();
    await enter(page, `side-fit-${Date.now().toString(36)}`, 'Alex', false);
    await page.setViewportSize(sideways);
    await page.waitForTimeout(800);
    const fit = await page.evaluate(() => {
      const wrap = document.querySelector('.player-wrap').getBoundingClientRect();
      const parts = ['#sync-test', '.room .empty h2, .room .empty h3, .room .empty strong'].map((s) => document.querySelector(s)).filter(Boolean);
      const box = (e) => e.getBoundingClientRect();
      const inside = parts.every((e) => {
        const r = box(e);
        return r.top >= Math.max(0, wrap.top) - 1 && r.bottom <= Math.min(innerHeight, wrap.bottom) + 1;
      });
      return { inside, parts: parts.length, wrap: [wrap.top, wrap.bottom].map(Math.round), vh: innerHeight, scroll: document.documentElement.scrollHeight <= innerHeight + 1 };
    });
    check(fit.parts >= 1 && fit.inside, 'iPhone SE sideways, empty room: the heading and "Run a sync test" are inside the screen', JSON.stringify(fit));
    check(fit.scroll, 'iPhone SE sideways, empty room: the page does not scroll', JSON.stringify(fit));
    await ctx.close();
  }

  // ---- (1) The tips wait while the phone is sideways ----
  {
    const room = `side-tip-${Date.now().toString(36)}`;
    const friend = await browser.newContext();
    const fp = await friend.newPage();
    await enter(fp, room, 'Sam', false);
    const ctx = await browser.newContext({ ...se });
    const page = await ctx.newPage();
    await enter(page, room, 'Alex', true);
    check(!!(await until(() => tipShown(page))), 'upright: the first tip shows');
    // Something to watch, so sideways shows the video and "Watch fullscreen".
    await fp.evaluate(() => document.querySelector('#sync-test')?.click());
    await until(() => page.evaluate(() => !!document.querySelector('.room.has-item')));
    await page.setViewportSize(sideways);
    await page.waitForTimeout(800);
    const turn = await page.evaluate(() => {
      const b = document.querySelector('.ph-turn-fs, .ph-turn button');
      if (!b) return null;
      const r = b.getBoundingClientRect();
      return r.width > 0 ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
    });
    check(!!turn, 'sideways with a video: "Watch fullscreen" shows', turn);
    check(!(await tipShown(page)), 'sideways: the tip waits hidden');
    if (turn) check(await page.evaluate(({ x, y }) => !document.elementFromPoint(x, y)?.closest('.first-tip'), turn), 'sideways: nothing of the tip over "Watch fullscreen"');
    await page.setViewportSize(se.viewport);
    check(!!(await until(() => tipShown(page), 4000)), 'upright again: the tip comes back');
    await ctx.close();
    await friend.close();
  }

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ A sideways phone: tips wait, the empty room fits');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
