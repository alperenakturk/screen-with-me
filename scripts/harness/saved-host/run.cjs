// BH6 (STATUS idea 11): a saved room is "mine" in my saved-rooms list only while I am its host. After "Make host" the
// old host's row is no longer marked as theirs (its ✕ would warn about unsaving a room they can no longer unsave), and
// the new host's row is. Needs the built site on wrangler dev:
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/saved-host/run.cjs [http://localhost:8787]
const { chromium } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:8787';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};

(async () => {
  const browser = await chromium.launch();
  const room = `svh${Math.random().toString(36).slice(2, 8)}`;
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
    await page.waitForTimeout(1200);
    return page;
  };
  const row = (page) =>
    page.evaluate((id) => (JSON.parse(localStorage.getItem('savedRooms') || '[]').find((r) => r.id === id) ?? null), room);

  const alex = await enter('Alex');
  await alex.evaluate(() => {
    document.getElementById('save-name').value = 'Movie night';
    document.getElementById('save-form').requestSubmit();
  });
  await alex.waitForTimeout(800);
  check((await row(alex))?.mine === true, 'the host saves the room: their row is theirs');

  const sam = await enter('Sam');
  const samBefore = await row(sam);
  check(samBefore && !samBefore.mine, 'a guest gets the saved room in their list, not as theirs', JSON.stringify(samBefore));

  await alex.evaluate(() => document.querySelector('.people-list .make-host, .make-host')?.click());
  await alex.waitForSelector('.dialog-backdrop:not([hidden]) .btn.primary', { timeout: 5000 }).catch(() => {});
  await alex.click('.dialog-backdrop:not([hidden]) .btn.primary');
  await alex.waitForTimeout(1500);
  const alexAfter = await row(alex);
  const samAfter = await row(sam);
  check(alexAfter && !alexAfter.mine, 'BH6: after "Make host" the old host\'s row is no longer theirs', JSON.stringify(alexAfter));
  check(samAfter?.mine === true, 'BH6: the new host\'s row is theirs', JSON.stringify(samAfter));

  // A reload of the old host: no moment where the row is theirs again before the members arrive.
  await alex.addInitScript((id) => {
    const seen = [];
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'savedRooms') seen.push((JSON.parse(v).find((r) => r.id === id) ?? {}).mine === true);
      return orig.call(this, k, v);
    };
    window.__mineWrites = seen;
  }, room);
  await alex.reload();
  await alex.waitForSelector('.room');
  await alex.waitForTimeout(1500);
  const writes = await alex.evaluate(() => window.__mineWrites);
  check(!writes.includes(true) && !(await row(alex))?.mine, 'BH6: a reload never marks it theirs again', JSON.stringify(writes));

  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ Saved rooms follow the host');
  process.exit(fails ? 1 : 0);
})();
