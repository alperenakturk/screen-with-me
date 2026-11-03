// R12 "Ask before letting people in" in real browsers: the host turns it on (Room rules), the invite window shows the
// same switch, a friend waits on the "Waiting for the host" card, the host's "wants to join" card lets them in.
// Needs the built site on wrangler dev:
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/knock/run.cjs [http://localhost:8787]
const { chromium } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:8787';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};

(async () => {
  const browser = await chromium.launch();
  const room = `knk${Math.random().toString(36).slice(2, 8)}`;
  const enter = async (name) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(() => {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', 'en');
      localStorage.setItem('opt:autoInvite', '0');
    });
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/${room}`);
    await page.fill('#name', name);
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    return page;
  };
  const host = await enter('Alex');
  await host.waitForTimeout(1500);
  await host.evaluate(() => document.getElementById('opt-knock').click());
  await host.waitForTimeout(500);
  check(await host.evaluate(() => document.getElementById('opt-knock').checked), 'the host turns on "Ask before letting people in" in Room rules');
  await host.click('#invite-btn');
  await host.waitForSelector('.invite-dialog', { timeout: 5000 }).catch(() => {});
  const inviteSwitch = await host.evaluate(() => document.getElementById('invite-door')?.checked ?? null);
  check(inviteSwitch === true, 'the invite window has the same switch, on', String(inviteSwitch));
  await host.keyboard.press('Escape');

  const friend = await enter('Sam');
  await friend.waitForSelector('#knock-wait:not([hidden])', { timeout: 8000 }).catch(() => {});
  const waiting = await friend.evaluate(() => ({ shown: !document.getElementById('knock-wait').hidden, text: document.querySelector('#knock-wait h2')?.textContent ?? '' }));
  check(waiting.shown && /Waiting for the host/.test(waiting.text), 'the friend sees "Waiting for the host to let you in…"', waiting.text);
  await host.waitForSelector('.knock-card', { timeout: 8000 }).catch(() => {});
  const card = await host.evaluate(() => document.querySelector('.knock-card .knock-text')?.textContent ?? '');
  check(/Sam wants to join/.test(card), 'the host gets a "Sam wants to join" card with Let in / Refuse', card);
  await host.click('.knock-allow');
  await friend.waitForSelector('#knock-wait[hidden]', { state: 'attached', timeout: 8000 }).catch(() => {});
  await friend.waitForTimeout(800);
  const inRoom = await friend.evaluate(() => document.getElementById('knock-wait').hidden);
  const count = await host.evaluate(() => document.querySelector('.room-title')?.textContent ?? '');
  check(inRoom && /2 people/.test(count), 'Let in: the card goes, the friend is in the room ("2 people")', count);
  check(await host.evaluate(() => !document.querySelector('.knock-card')), "the host's card goes once answered");
  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ Ask before letting people in');
  process.exit(fails ? 1 : 0);
})();
