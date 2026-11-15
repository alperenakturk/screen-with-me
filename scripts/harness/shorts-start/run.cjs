// Card SH1 (2): the next Short starts at 0:00 for everyone. Two people watch a Short with another queued; the next
// one starts (▼, the same start as when one ends by itself). Each page's Test Lab `shorts.state` says where its player
// was when the new Short first moved: it must be near 0:00 for both (before the fix the room's clock had run on while
// the players loaded, so everyone was seeked 2–3 s in). Needs YouTube.
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/shorts-start/run.cjs [http://localhost:8787]
const { viaYouTube } = require('../via-youtube.cjs');
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const SHORTS = ['https://www.youtube.com/shorts/aqz-KE-bpKQ', 'https://www.youtube.com/shorts/aqz-KE-bpKQ', 'https://www.youtube.com/shorts/aqz-KE-bpKQ'];
/** "Starts at 0:00": the player's first moving moment is within this many seconds of the start. */
const MAX_OFFSET = 0.6;
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};

(async () => {
  const browser = await chromium.launch();
  const room = `ss${Math.random().toString(36).slice(2, 8)}`;
  const enter = async (name) => {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await viaYouTube(ctx);
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem('tipsSeen', '1');
        localStorage.setItem('lang', 'en');
        localStorage.setItem('opt:autoInvite', '0');
      } catch {}
    });
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/${room}?debug=1`);
    await page.fill('#name', name);
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await page.waitForFunction(() => !!window.__swmLab);
    return page;
  };
  const state = async (page) => JSON.parse((await page.evaluate(async () => (await window.__swmLab.run('shorts.state')).text)).replace(/^\S+\s/, ''));
  const alex = await enter('Alex');
  const sam = await enter('Sam');
  await alex.fill('#media-input', SHORTS[0]);
  await alex.click('#media-form button[value=load]');
  for (const link of SHORTS.slice(1)) {
    await alex.waitForTimeout(800);
    await alex.evaluate((l) => {
      // In the Shorts view the link box is the bar's ＋; the room's own form still takes a link.
      const input = document.getElementById('media-input');
      input.value = l;
      document.getElementById('media-form').requestSubmit(document.querySelector('#media-form button[value=enqueue]'));
    }, link);
  }
  await alex.waitForFunction(() => document.documentElement.classList.contains('shorts-view'), null, { timeout: 15000 });
  /** Polls a page's `shorts.state` until `test` holds (Playwright's waitForFunction can't await the lab). */
  const until = async (page, test, ms = 30000) => {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const s = await state(page).catch(() => null);
      if (s && test(s)) return s;
      await page.waitForTimeout(250);
    }
    return null;
  };
  // Let the first Short play on both.
  for (const page of [alex, sam]) await until(page, (s) => s.start !== null);
  await alex.waitForTimeout(2500);
  for (let round = 1; round <= 2; round++) {
    const before = (await state(alex)).start?.item;
    await alex.click('#shorts-next');
    const starts = [];
    for (const page of [alex, sam]) starts.push((await until(page, (s) => !!s.start && s.start.item !== before))?.start ?? null);
    check(starts.every((s) => s && s.offset <= MAX_OFFSET), `round ${round}: the next Short starts at 0:00 for both (player time when it first moved ≤ ${MAX_OFFSET} s)`, JSON.stringify(starts));
    await alex.waitForTimeout(2000);
  }

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ The next Short starts at 0:00 for everyone');
  process.exit(fails ? 1 : 0);
})();
