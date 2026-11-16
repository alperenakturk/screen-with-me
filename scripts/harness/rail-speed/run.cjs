// Card UI2: one speed picker. On a computer the rail's ⋯ shows one "⏩ Speed · 1×" row instead of 12 buttons; it opens
// the ready speeds and − / + for a custom one, and the speed reaches everyone (a friend on a phone sees it too). A
// fresh browser has "Keep the controls open" off.
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/rail-speed/run.cjs [http://localhost:8787] [http://localhost:5300/video.webm] [out-dir]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
const OUT = process.argv[4] || require('os').tmpdir();
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const room = `rs${Math.random().toString(36).slice(2, 8)}`;
  async function person(name, options, lang) {
    const ctx = await browser.newContext(options);
    await ctx.addInitScript((l) => {
      try {
        localStorage.setItem('tipsSeen', '1');
        localStorage.setItem('lang', l);
        localStorage.setItem('opt:autoInvite', '0');
      } catch {}
    }, lang);
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/${room}?debug=1`);
    await page.fill('#name', name);
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    return page;
  }
  const lab = async (page) => JSON.parse((await page.evaluate(async () => (await window.__swmLab.run('rail.speed')).text)).replace(/^[^{]*/, ''));
  /** The rail opens as the mouse reaches the video's right edge (it hides while a video plays). */
  const openRail = async (page) => {
    const w = await page.evaluate(() => { const r = document.querySelector('.player-wrap').getBoundingClientRect(); return { r: r.right, t: r.top, h: r.height }; });
    await page.mouse.move(w.r - 220, w.t + w.h / 2);
    await page.mouse.move(w.r - 20, w.t + w.h / 2, { steps: 5 });
    await page.waitForSelector('#dock-more', { state: 'visible', timeout: 4000 }).catch(() => {});
  };
  const rateIs = (page, rate) => page.waitForFunction(async (r) => {
    const text = (await window.__swmLab.run('rail.speed')).text;
    return JSON.parse(text.replace(/^[^{]*/, '')).rate === r;
  }, rate, { timeout: 6000 }).then(() => true).catch(() => false);

  // Computer (English) with a friend on a phone (Turkish).
  const alex = await person('Alex', { viewport: { width: 1366, height: 768 } }, 'en');
  const sam = await person('Sam', { ...devices['iPhone 13'] }, 'tr');
  const fresh = await lab(alex);
  check(fresh.railPin === 'unset (off)' && !(await alex.evaluate(() => document.querySelector('#theater').classList.contains('rail-pin'))), 'a fresh browser has "Keep the controls open" off', JSON.stringify(fresh));
  await alex.evaluate((u) => {
    const i = document.getElementById('media-input');
    i.value = u;
    i.form.requestSubmit(i.form.querySelector('button[value=load]'));
  }, VIDEO);
  await alex.waitForFunction(() => (document.querySelector('#player video')?.currentTime ?? 0) > 0.3, null, { timeout: 15000 }).catch(() => {});

  // The rail's ⋯: one row, short menu.
  await openRail(alex);
  await alex.click('#dock-more');
  await alex.waitForTimeout(250);
  const menu = await alex.evaluate(() => {
    const row = document.querySelector('#dock-speed-row');
    const r = row.getBoundingClientRect();
    return { row: row.textContent.trim(), rowH: Math.round(r.height), picker: !document.querySelector('#dock-more-picker').hidden, visibleSpeeds: [...document.querySelectorAll('#dock-more-pop [data-rate]')].filter((b) => b.getBoundingClientRect().height > 0).length, height: Math.round(document.querySelector('#dock-more-pop').getBoundingClientRect().height) };
  });
  await alex.screenshot({ path: `${OUT}/rail-speed-menu.png` });
  check(/Speed/.test(menu.row) && /1×/.test(menu.row) && !menu.picker && menu.visibleSpeeds === 0 && menu.height <= 320, 'the ⋯ menu has one "⏩ Speed · 1×" row and no speed grid; the menu is short', JSON.stringify(menu));
  await alex.click('#dock-speed-row');
  await alex.waitForTimeout(150);
  const picker = await alex.evaluate(() => ({ fits: (() => { const m = document.querySelector('#dock-more-pop').getBoundingClientRect(); const last = [...document.querySelectorAll('#dock-more-pop > *')].filter((n) => n.getBoundingClientRect().height > 0).pop().getBoundingClientRect(); const v = document.querySelector('.player-wrap').getBoundingClientRect(); return last.bottom <= Math.min(m.bottom, v.bottom, innerHeight) + 1 && m.top >= v.top - 1; })(), ready: [...document.querySelectorAll('#dock-more-picker [data-rate]')].map((b) => b.textContent), steps: document.querySelectorAll('#dock-more-picker [data-step]').length, value: document.querySelector('#dock-more-picker .speed-value').textContent }));
  await alex.screenshot({ path: `${OUT}/rail-speed-picker.png` });
  check(picker.ready.join(' ') === '0.5× 1× 1.25× 1.5× 2×' && picker.steps === 2 && picker.value === '1×' && picker.fits, 'the row opens the ready speeds and − 1× +; the whole menu stays on the video', JSON.stringify(picker));

  // A ready speed, then a custom one: both reach the friend.
  await alex.click('#dock-more-picker [data-rate="1.5"]');
  check((await rateIs(alex, 1.5)) && (await rateIs(sam, 1.5)), '1.5× reaches everyone');
  if (await alex.isHidden('#dock-more-pop')) {
    await openRail(alex);
    await alex.click('#dock-more');
  }
  if (await alex.isHidden('#dock-more-picker')) await alex.click('#dock-speed-row');
  await alex.click('#dock-more-picker [data-step="1"]');
  check((await rateIs(alex, 1.55)) && (await rateIs(sam, 1.55)), '+ makes a custom 1.55× for everyone');
  const shown = await alex.evaluate(() => ({ row: document.querySelector('#dock-speed-row .dock-speed-now').textContent, value: document.querySelector('#dock-more-picker .speed-value').textContent, open: !document.querySelector('#dock-more-picker').hidden }));
  check(shown.row === '1.55×' && shown.value === '1.55×' && shown.open, 'the row and the picker show 1.55×; the picker stays open for more steps', JSON.stringify(shown));
  const video = await alex.evaluate(() => document.querySelector('#player video')?.playbackRate);
  check(Math.abs((video ?? 0) - 1.55) < 0.06, 'the video plays at 1.55×', String(video));

  // − steps back by 0.05 for everyone; a ready speed resets it.
  await alex.click('#dock-more-picker [data-step="-1"]');
  check((await rateIs(alex, 1.5)) && (await rateIs(sam, 1.5)), '− brings it back to 1.5× for everyone');
  await alex.click('#dock-more-picker [data-rate="1"]');
  check((await rateIs(alex, 1)) && (await rateIs(sam, 1)), '1× resets it for everyone');

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ One speed picker everywhere');
  process.exit(fails ? 1 : 0);
})();
