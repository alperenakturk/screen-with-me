// 0.9.93.2 room extras in a real browser: the friendly room name, "Continue where you left off" on the home page, the
// "?" shortcuts card, handing the host role on from the People tab, and the "3-2-1, together" countdown over the video
// on both screens. Needs Playwright, `npm run dev` and a local video (the cloud can't fetch outside ones), e.g.
// `python3 -m http.server 5300` in a folder with `video.webm`:
//   NODE_PATH=$(npm root -g) node scripts/harness/room-extras/run.cjs [http://localhost:5173] [http://localhost:5300/video.webm]
const { chromium } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:5173';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const room = `ex${Math.random().toString(36).slice(2, 8)}`;
  const errors = [];
  async function enter(name) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', 'en');
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
    await page.goto(`${SITE}/r/${room}`);
    await page.fill('#name', name);
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await page.waitForTimeout(800);
    return page;
  }
  const alex = await enter('Alex');

  // A friendly name instead of "Room <code>", the same in the tab's title.
  const title = await alex.textContent('.room-title-name');
  check(/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(title) && !title.includes(room), 'the room has a friendly name', title);
  check((await alex.title()).startsWith(title), 'the tab shows it too', await alex.title());

  // ? opens the shortcuts card, ? or Esc closes it.
  await alex.mouse.click(5, 300);
  await alex.keyboard.press('Shift+Slash');
  const card = await alex.waitForSelector('.shortcuts-dialog', { timeout: 2000 }).catch(() => null);
  check(!!card && (await alex.$$eval('.shortcuts-list kbd', (k) => k.length)) >= 9, '? opens the shortcuts card');
  const fits = await alex.evaluate(() => {
    const r = document.querySelector('.shortcuts-dialog').getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight;
  });
  check(fits, 'it fits the screen');
  await alex.keyboard.press('Escape');
  await alex.waitForTimeout(200);
  check(!(await alex.$('.shortcuts-dialog')), 'Esc closes it');

  // Sam comes in; Alex hands Sam the host role from the People tab.
  const sam = await enter('Sam');
  check((await sam.textContent('.room-title-name')) === title, 'everyone sees the same room name');
  await alex.click('[data-tab="people"]').catch(() => alex.evaluate(() => document.querySelector('[data-tab="people"]')?.click()));
  await alex.waitForTimeout(300);
  const crown = await alex.$('#members .make-host');
  check(!!crown, 'the host sees "Make host" next to Sam');
  await crown?.click();
  await alex.waitForSelector('.confirm-dialog');
  await alex.click('.confirm-dialog .btn.primary');
  await sam.waitForFunction(() => document.querySelector('#members .person.me .host-badge')?.textContent === '👑', null, { timeout: 4000 }).catch(() => {});
  check(await sam.evaluate(() => document.querySelector('#members .person.me')?.textContent.includes('👑')), 'Sam is the host now');
  await alex.waitForFunction(() => !document.querySelector('#members .make-host'), null, { timeout: 4000 }).catch(() => {});
  check(!(await alex.$('#members .make-host')), 'Alex is a guest now (no host buttons)');

  // Sam (host) opens a video file: with two people everyone sees 3-2-1, then it plays together.
  await sam.fill('#media-input', VIDEO);
  await sam.click('#media-form button[value=load]');
  const counting = await Promise.all([alex, sam].map((p) => p.waitForSelector('.countdown', { timeout: 6000 }).then(() => true, () => false)));
  check(counting.every(Boolean), 'both screens show the countdown');
  const number = await alex.textContent('.countdown-n').catch(() => '');
  check(/^[123]$/.test(number.trim()), 'it counts seconds', number);
  const held = await alex.evaluate(() => {
    const v = document.querySelector('.player video');
    return v ? { paused: v.paused, time: v.currentTime } : null;
  });
  check(!held || (held.paused && held.time < 0.5), 'the video waits at its start meanwhile', JSON.stringify(held));
  await alex.waitForTimeout(4200);
  check(!(await alex.$('.countdown')), 'then the countdown goes');
  const playing = await alex.evaluate(() => {
    const v = document.querySelector('.player video');
    return v ? !v.paused : null;
  });
  const times = await Promise.all([alex, sam].map((p) => p.evaluate(() => document.querySelector('.player video')?.currentTime ?? -1)));
  check(playing === true && times.every((x) => x > 0.3), 'and the video plays on both', JSON.stringify(times));
  check(Math.abs(times[0] - times[1]) < 0.6, 'they started together', JSON.stringify(times));

  // Home: "Continue where you left off" brings Alex back to this room.
  await alex.goto(SITE);
  const cont = await alex.waitForSelector('#continue:not([hidden])', { timeout: 4000 }).catch(() => null);
  check(!!cont, 'home: "Continue where you left off" is there');
  check((await alex.textContent('#continue .continue-name')) === title, 'with the room\'s name', await alex.textContent('#continue .continue-name').catch(() => ''));
  await alex.waitForTimeout(800);
  check((await alex.textContent('#continue .continue-status')).includes('inside'), 'and who is inside now', await alex.textContent('#continue .continue-status'));
  check((await alex.getAttribute('#continue a.btn', 'href')) === `/r/${room}`, 'its button goes back in');
  await alex.click('#continue .icon-btn');
  await alex.reload();
  await alex.waitForTimeout(500);
  check(await alex.evaluate(() => document.querySelector('#continue')?.hidden === true), '✕ forgets it');

  check(errors.length === 0, 'no page errors', errors.join(' | '));
  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ Room extras work');
  process.exit(fails ? 1 : 0);
})();
