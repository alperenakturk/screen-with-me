// Card PH3 (GPH1 review): the phone's Games tab.
//  1. Upright on 568–664 px phones (iPhone SE, Galaxy S5, iPhone 13), with no video: the short video strip shows only
//     the empty room's Search / Invite buttons, whole inside the strip and above "Back to video" (its title and both
//     buttons used to be cut); the Room tab still shows the full card.
//  2. The page never scrolls. (Held sideways, PH4's turn note covers the Games tab: phone-sideways checks that.)
//  The Test Lab's `phoneRoom.gamesTab` reports both.
//
//   built site on wrangler dev:  node scripts/harness/phone-games-tab/run.cjs http://localhost:8787 [screenshot folder]
const { chromium, devices } = require('playwright');
const fs = require('fs');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || '';
if (OUT) fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
const check = (ok, label, extra) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra !== undefined ? ` → ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : ''}`);
  if (!ok) fails++;
};

const PHONES = [
  ['iPhone SE', devices['iPhone SE']],
  ['Galaxy S5', devices['Galaxy S5']],
  ['iPhone 13', devices['iPhone 13']],
];

(async () => {
  const browser = await chromium.launch();
  for (const [name, dev] of PHONES) {
    const ctx = await browser.newContext({ ...dev });
    await ctx.addInitScript(() => {
      if (sessionStorage.getItem('lab:seeded')) return;
      sessionStorage.setItem('lab:seeded', '1');
      Object.assign(localStorage, { name: 'Alex', avatar: 'wizard', lang: 'en', 'opt:autoInvite': '0', tipsSeen: '1' });
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${SITE}/?debug=1`);
    await page.waitForFunction(() => sessionStorage.getItem('swm:debug') === '1', null, { timeout: 10000 });
    await page.goto(`${SITE}/r/ph${Math.random().toString(36).slice(2, 8)}`);
    await page.waitForSelector('#name, .room');
    if (await page.isVisible('#name')) {
      await page.fill('#name', 'Alex');
      await page.click('#name-form button.primary');
    }
    await page.waitForSelector('.room');
    await page.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 });
    // The games' lab commands register a moment after the lab itself: try until the command is there.
    let opened = null;
    for (let i = 0; i < 40 && !opened; i++) {
      opened = await page.evaluate(() => window.__swmLab.run('games.open.xox')).catch(() => null);
      if (!opened) await page.waitForTimeout(250);
    }
    await page.waitForFunction(() => document.documentElement.classList.contains('ph-game-tab'), null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    check(!!opened && opened.dir !== 'error', `${name}: a game opens in the Games tab`, opened);
    const lab = await page.evaluate(() => window.__swmLab.run('phoneRoom.gamesTab'));
    let state = null;
    try {
      state = JSON.parse(String(lab.text).replace(/^▶\s*/, ''));
    } catch {
      // stays null
    }
    if (OUT) await page.screenshot({ path: `${OUT}/${name.replace(/\s+/g, '-')}.png` });
    check(!!state, `${name}: Test Lab phoneRoom.gamesTab reports`, lab);
    if (!state) {
      await ctx.close();
      continue;
    }
    check(!state.pageScrolls, `${name}: the page does not scroll`, state);
    const scrolled = await page.evaluate(() => {
      window.scrollTo(0, 400);
      const y = scrollY;
      window.scrollTo(0, 0);
      return y;
    });
    check(scrolled === 0, `${name}: the page cannot be scrolled down`, `scrollY ${scrolled}`);
    {
      check(state.emptyButtons === 2 && state.buttonsWhole && !state.titleShown, `${name}: the strip shows only Search / Invite, whole, above "Back to video"`, state);
      // The Room tab still has the empty room's full card.
      await page.evaluate(() => document.querySelector('.ph-tabs [data-tab="room"], #ph-tab-room')?.click());
      await page.waitForTimeout(600);
      const full = await page.evaluate(() => {
        const h = document.querySelector('.room .empty h2')?.getBoundingClientRect();
        return !!h && h.width > 0 && h.top >= 0;
      });
      check(full, `${name}: back in the Room tab the title "No video yet" shows again`);
    }
    check(errors.length === 0, `${name}: no page errors`, errors);
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nall passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
