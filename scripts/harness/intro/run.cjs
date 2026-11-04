// The Sidelit intro (card 6f, Design's storyboard docs/internal/design/intro/): checks each part on its beat by pausing
// every animation and seeking it — the light is off before 0.72 s and fully on by 1.1 s (it grows from the triangle's
// tip), the eyes come in at 0.78 s, Glowbeam springs out at 1.1 s while the logo slides left, the line rises by 1.75 s,
// everything is gone after 2.7 s; reduced motion shows one still frame (no movement, all parts in place).
//   npm run dev
//   NODE_PATH=$(npm root -g) node scripts/harness/intro/run.cjs [http://localhost:5173]
const { chromium } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:5173';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};

(async () => {
  const browser = await chromium.launch();
  async function open(reducedMotion) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion });
    await ctx.addInitScript(() => {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', 'en');
      localStorage.setItem('opt:autoInvite', '0');
    });
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/intro${Math.random().toString(36).slice(2, 7)}`);
    await page.fill('#name', 'Alex');
    await page.click('#name-form button.primary');
    await page.waitForSelector('.swm-intro');
    await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
    return page;
  }
  /** Seeks every animation to `ms` and reads the parts. */
  const at = (page, ms) =>
    page.evaluate((ms) => {
      document.getAnimations().forEach((a) => (a.currentTime = ms));
      const q = (s) => document.querySelector(s);
      const op = (s) => Number(getComputedStyle(q(s)).opacity);
      const light = q('.swm-intro .logo-light').getBoundingClientRect();
      const logo = q('.swm-intro-logo').getBoundingClientRect();
      return { light: light.width / logo.width, lightOp: op('.swm-intro .logo-light'), eyes: op('.swm-intro .logo-eyes'), glow: op('.swm-intro-glow'), text: op('.swm-intro-text'), logoX: logo.left, root: op('.swm-intro') };
    }, ms);

  const page = await open('no-preference');
  const s0 = await at(page, 300);
  const s1 = await at(page, 1150);
  const s2 = await at(page, 1500);
  const s3 = await at(page, 1800);
  check(s0.light < 0.05 && s0.eyes === 0 && s0.glow === 0, '0.3 s: the logo, light off, no eyes, no Glowbeam', JSON.stringify(s0));
  check(s1.light > 0.4 && s1.lightOp === 1 && s1.eyes === 1, '1.15 s: the light has burst out of the tip, the eyes are open', JSON.stringify(s1));
  check(s2.glow === 1 && s2.logoX < s0.logoX - 20, '1.5 s: Glowbeam is out, the logo slid left', JSON.stringify({ glow: s2.glow, x0: s0.logoX, x: s2.logoX }));
  check(s3.text === 1, '1.8 s: "Enjoy the show!" is up', JSON.stringify(s3));
  check((await at(page, 2650)).root < 0.1, '2.65 s: the intro has faded');
  check(await page.evaluate(() => document.querySelector('.swm-intro-text').textContent === 'Enjoy the show!'), 'the line says "Enjoy the show!"');
  await page.evaluate(() => document.getAnimations().forEach((a) => a.play()));
  await page.waitForFunction(() => !document.querySelector('.swm-intro'), null, { timeout: 4000 }).then(() => check(true, 'it removes itself'), () => check(false, 'it removes itself'));

  const still = await open('reduce');
  const r0 = await at(still, 600);
  const r1 = await at(still, 1500);
  const moving = await still.evaluate(() => document.getAnimations().filter((a) => a.effect?.target !== document.querySelector('.swm-intro')).length);
  check(moving === 0, 'reduced motion: only the whole frame fades, nothing moves', String(moving));
  check(r0.glow === 1 && r0.eyes === 1 && r0.text === 1 && r0.light > 0.4 && r0.logoX === r1.logoX, 'reduced motion: one still frame with every part', JSON.stringify(r0));

  // Card R7: everyone who enters a room in a tab for the first time sees it (an invited friend in a fresh browser, a
  // tab opened with #back from the extension), never on a reload of that tab.
  const guestCtx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await guestCtx.addInitScript(() => {
    localStorage.setItem('tipsSeen', '1');
    localStorage.setItem('lang', 'en');
    localStorage.setItem('opt:autoInvite', '0');
  });
  const guest = await guestCtx.newPage();
  const roomPath = await page.evaluate(() => location.pathname);
  await guest.goto(`${SITE}${roomPath}`);
  await guest.fill('#name', 'Sam');
  await guest.click('#name-form button.primary');
  check(await guest.waitForSelector('.swm-intro', { timeout: 5000 }).then(() => true, () => false), 'an invited friend (a fresh browser opening the room\'s link) sees it');
  await guest.waitForFunction(() => !document.querySelector('.swm-intro'), null, { timeout: 6000 }).catch(() => {});
  await guest.reload();
  await guest.waitForSelector('.room');
  await guest.waitForTimeout(2500);
  check(!(await guest.$('.swm-intro')), 'not again on a reload of that tab');
  const back = await guestCtx.newPage();
  await back.goto(`${SITE}${roomPath}#back`);
  check(await back.waitForSelector('.swm-intro', { timeout: 6000 }).then(() => true, () => false), 'a new tab opened with #back (the extension\'s "open the room") sees it once');

  // Someone who waits at the door (R12, "ask before letting people in") sees it once let in, not behind the wait.
  await page.evaluate(() => {
    const box = document.getElementById('opt-knock');
    box.checked = true;
    box.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(500);
  const knockCtx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await knockCtx.addInitScript(() => {
    localStorage.setItem('tipsSeen', '1');
    localStorage.setItem('lang', 'en');
    localStorage.setItem('opt:autoInvite', '0');
  });
  const knocker = await knockCtx.newPage();
  await knocker.goto(`${SITE}${roomPath}`);
  await knocker.fill('#name', 'Kim');
  await knocker.click('#name-form button.primary');
  await knocker.waitForSelector('#knock-wait:not([hidden])', { timeout: 6000 }).catch(() => {});
  await knocker.waitForTimeout(3500);
  const behind = !!(await knocker.$('.swm-intro'));
  await page.click('.knock-allow', { timeout: 6000 }).catch(() => {});
  const after = await knocker.waitForSelector('.swm-intro', { timeout: 6000 }).then(() => true, () => false);
  check(!behind && after, 'waiting at the door: not behind the wait screen, it plays once let in', JSON.stringify({ behind, after }));

  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ The Sidelit intro plays on its beats');
  process.exit(fails ? 1 : 0);
})();
