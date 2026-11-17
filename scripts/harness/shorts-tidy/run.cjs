// Card FD1b: the tidy Shorts view while a ♾ Shorts feed runs. On a computer the rail has three labelled groups (Talk ·
// Watch · Room) with names beside the icons where the page is wide enough, "N left" under ▲, the feed pill above the
// Short (never on the player), nothing overlapping, and a feed note under the Short or at its foot (never over the
// rail or the video). On a phone the bar shows 💬 Chat · 😀 React · ♾ Feed (marked on) · ▲ N left ▼ · ⋯ More and the
// pill sits above the Short. The Shorts view's styles are a lazy stylesheet: it must be in before the view shows.
// Test Lab `shorts.tidy` / `shorts.note` report it. YouTube's answers are faked (no quota, no network).
//
//   npm run dev, then: NODE_PATH=$(npm root -g) node scripts/harness/shorts-tidy/run.cjs [site]
const { viaYouTube } = require('../via-youtube.cjs');
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:5173';
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};
const SHORTS = ['9bZkp7q5F8I', 'aqz-KE-bpKQ', 'dQw4w9WgXcQ', 'M7lc1UVf-VE', 'jNQXAC9IVRw', 'kJQP7kiw5Fk'].map((id, i) => ({
  id,
  title: `Short ${i + 1}`,
  channel: 'Alex',
  duration: 30 + i,
  live: false,
  short: true,
}));

const lab = async (page, id) => (await page.evaluate(async (c) => (await window.__swmLab.run(c)).text, id)).replace(/^▶ /, '');

(async () => {
  const browser = await chromium.launch();
  const sizes = [
    ['laptop 1366×768', { viewport: { width: 1366, height: 768 } }, 'computer'],
    ['monitor 1920×1080', { viewport: { width: 1920, height: 1080 } }, 'computer'],
    ['iPhone 13', { ...devices['iPhone 13'] }, 'phone'],
  ];
  for (const [name, options, kind] of sizes) {
    const room = `shtidy${Math.random().toString(36).slice(2, 7)}`;
    const ctx = await browser.newContext(options);
    await viaYouTube(ctx);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      try {
        localStorage.setItem('tipsSeen', '1');
      } catch {}
    });
    await page.route('**/api/youtube/**', (route) => route.fulfill({ json: { items: SHORTS } }));
    await page.goto(`${SITE}/r/${room}?debug=1`);
    await page.fill('#name', 'Alex');
    await page.click('#name-form button.primary');
    await page.waitForSelector('#chat-input', { state: 'attached' });
    if (await page.isVisible('#ph-tab-search')) await page.click('#ph-tab-search');
    else await page.click('.tab[data-tab="queue"]');
    await page.click('#feed-open-shorts');
    await page.click('#feed-pools .feed-pool[data-pool="music"]');
    await page.click('#feed-start');
    await page.waitForFunction(() => document.documentElement.classList.contains('shorts-view'), null, { timeout: 15000 });
    // The view switches only once its stylesheet is in: the rail is laid out as a rail at once.
    const styled = await page.evaluate(() => getComputedStyle(document.querySelector('.room.shorts .theater .player-wrap')).aspectRatio);
    check(styled.replace(/\s/g, '') === '9/16', `${name}: the Shorts view's styles are in when it shows`, styled);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1200);
    const tidy = JSON.parse(await lab(page, 'shorts.tidy'));
    const scrolls = await page.evaluate(() => document.scrollingElement.scrollHeight > innerHeight + 1);
    check(!scrolls, `${name}: the page does not scroll`);
    check(tidy.pill?.inStage && tidy.pill.abovePlayer, `${name}: the feed pill sits above the Short, not on it`, tidy.pill);
    check(/^\d+ left$/.test(tidy.left ?? ''), `${name}: "N left" under ▲`, tidy.left);
    if (kind === 'computer') {
      check(tidy.heads.join(',') === 'Talk,Watch,Room', `${name}: the rail has three labelled groups`, tidy.heads);
      check(tidy.labels >= 8, `${name}: the rail's buttons show their names`, tidy.labels);
      check(!tidy.overlaps, `${name}: no rail button overlaps another or the video`);
      check(await page.evaluate(() => document.querySelector('#shorts-feed')?.getAttribute('aria-pressed') === 'true'), `${name}: ♾ is marked on while the feed runs`);
    } else {
      check(tidy.phone?.feedOn, `${name}: ♾ Feed is in the bar, marked on`, tidy.phone);
      const caps = tidy.phone?.captions ?? [];
      check(['Chat', 'React', 'Feed', 'More'].every((c) => caps.includes(c)) && caps.some((c) => /^\d+ left$/.test(c)), `${name}: the bar's captions`, caps);
    }
    await lab(page, 'shorts.note');
    await page.waitForTimeout(300);
    const noted = JSON.parse(await lab(page, 'shorts.tidy'));
    check(noted.hint && !noted.hint.overPlayer && !noted.hint.overRail, `${name}: a feed note never covers the video or the rail`, noted.hint);
    check(errors.length === 0, `${name}: no page errors`, errors);
    await ctx.close();
  }
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
