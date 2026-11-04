// Hidden test panel (card 12): `?debug=1` once in a tab shows 🐞 with the panel (versions, connection, sync, switches,
// errors + a copied report, "start as a first-time visitor"); `?debug=0` or "Turn the panel off" hides it; a normal
// visit loads nothing. Needs the built site on a local server:
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/debug/run.cjs [http://localhost:8787]
const { chromium, devices } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:8787';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};
const shown = (page, selector) =>
  page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
  }, selector);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(() => {
    if (!localStorage.getItem('lang')) localStorage.setItem('lang', 'en');
    localStorage.setItem('opt:autoInvite', '0');
  });
  const page = await ctx.newPage();
  const chunks = [];
  page.on('request', (r) => { if (/debug-panel/.test(r.url())) chunks.push(r.url()); });

  // A normal visit: nothing loads, nothing shows.
  await page.goto(`${SITE}/`);
  await page.waitForTimeout(1200);
  check(!(await page.$('#debug-panel-root')), 'normal visit: no panel');
  check(chunks.length === 0, 'normal visit: the panel\'s code is not downloaded', chunks.join(' '));

  // ?debug=1 once: 🐞 appears, the word leaves the address.
  await page.goto(`${SITE}/?debug=1`);
  await page.waitForSelector('.debug-fab');
  check(!page.url().includes('debug'), '?debug=1 is removed from the address', page.url());
  check(await shown(page, '.debug-fab'), '🐞 is shown');
  check(!(await shown(page, '.debug-panel')), 'the panel starts closed');
  await page.click('.debug-fab');
  check(await shown(page, '.debug-panel'), '🐞 opens the panel');
  const facts = await page.$$eval('.debug-facts dt', (d) => d.map((x) => `${x.textContent}=${x.nextElementSibling.textContent}`));
  const site = await page.textContent('.footer-version');
  check(facts.some((f) => f === `Site=${site.trim()}`), 'the site version', facts.join(' | '));
  check(facts.some((f) => f === 'Extension=not installed'), 'the extension (none here)');
  check(facts.some((f) => /^Connection=/.test(f)) && facts.some((f) => /^Browser=Chrome \d+ · /.test(f)) && facts.some((f) => /^Screen=1366×768/.test(f)), 'connection, browser and screen');
  check(await page.$('#debug-tvlab') !== null && await page.$('#debug-measure') !== null, 'TV lab and Shorts timing switches');
  check(await page.getAttribute('.debug-conn', 'href') === '/connection', 'the connection test link');
  check(await page.$('.debug-first') !== null, '"start as a first-time visitor"');

  // The switches really switch.
  await page.click('label[for="debug-tvlab"]');
  check(await page.evaluate(() => localStorage.getItem('opt:tvLab')) === '1', 'TV lab switch turns the lab on');
  await page.click('label[for="debug-tvlab"]');
  check(await page.evaluate(() => localStorage.getItem('opt:tvLab')) === '0', '…and off');
  await page.click('label[for="debug-measure"]');
  check(await page.evaluate(() => sessionStorage.getItem('olcum')) === '1', 'the Shorts timing switch (this tab)');
  await page.click('label[for="debug-measure"]');

  // Errors are collected, counted and copied in the report; no names or browser id in it.
  await page.evaluate(() => setTimeout(() => { throw new Error('harness-boom'); }));
  await page.waitForTimeout(1300);
  check(await page.evaluate(() => document.querySelector('.debug-fab').classList.contains('has-error')), '🐞 turns red on an error');
  check((await page.textContent('.debug-errors')).includes('harness-boom'), 'the error is listed');
  check((await page.textContent('.debug-errors-head h4')).includes('(1)'), 'the error count');
  await page.evaluate(() => localStorage.setItem('name', 'Robin'));
  await page.click('.debug-copy');
  await page.waitForTimeout(300);
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const cid = await page.evaluate(() => localStorage.getItem('cid'));
  check(copied.startsWith('Sidelit test report') && copied.includes('harness-boom') && copied.includes(site.trim()), 'Copy report: versions + errors', copied.split('\n').slice(0, 3).join(' / '));
  check(!copied.includes('Robin') && (!cid || !copied.includes(cid)), 'the report has no name or browser id');
  await page.click('.debug-clear');
  check((await page.textContent('.debug-errors-head h4')).includes('(0)'), 'Clear empties the list');

  // It stays on in this tab after a reload (and a new page).
  await page.goto(`${SITE}/help.html`);
  await page.goto(`${SITE}/`);
  await page.waitForSelector('.debug-fab');
  check(true, 'still on after moving to another page');

  // In a room: the sync numbers.
  const room = `dbg${Math.random().toString(36).slice(2, 7)}`;
  await page.evaluate(() => localStorage.setItem('tipsSeen', '1'));
  await page.goto(`${SITE}/r/${room}`);
  await page.fill('#name', 'Robin');
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await page.waitForTimeout(1500);
  await page.click('.debug-fab');
  await page.waitForTimeout(1200);
  const roomFacts = await page.$$eval('.debug-facts dt', (d) => d.map((x) => `${x.textContent}=${x.nextElementSibling.textContent}`));
  check(roomFacts.includes('People=1') && roomFacts.includes('Playing=nothing') && roomFacts.some((f) => /^Jumps=\d+/.test(f)), 'in a room: people, playing, sync jumps', roomFacts.join(' | '));
  check(roomFacts.includes('Connection=WebSocket'), 'in a room: the connection is WebSocket');
  check(await page.getAttribute('.debug-conn', 'href') === `/connection?room=${room}`, 'the connection test goes back to this room');
  const box = await page.evaluate(() => { const r = document.querySelector('.debug-panel').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.right <= innerWidth; });
  check(box, '1366×768: the panel fits the screen');
  await page.keyboard.press('Escape');
  check(!(await shown(page, '.debug-panel')), 'Esc closes the panel');

  // "Start as a first-time visitor" forgets the visit markers (never the browser id) and reloads.
  const before = await page.evaluate(() => localStorage.getItem('cid'));
  await page.click('.debug-fab');
  page.once('dialog', (d) => d.accept());
  await Promise.all([page.waitForNavigation(), page.click('.debug-first')]);
  await page.waitForSelector('#name');
  const after = await page.evaluate((r) => ({ name: localStorage.getItem('name'), tips: localStorage.getItem('tipsSeen'), me: localStorage.getItem(`me:${r}`), cid: localStorage.getItem('cid') }), room);
  check(!after.name && !after.tips && !after.me, 'first-time visitor: name, tips and the room\'s name forgotten', JSON.stringify(after));
  check(after.cid === before, 'first-time visitor: the browser id is kept');
  check(await shown(page, '#name'), 'first-time visitor: the room asks for a name again');

  // A phone.
  const phone = await browser.newContext({ ...devices['iPhone 13'] });
  const pp = await phone.newPage();
  await pp.goto(`${SITE}/?debug=1`);
  await pp.waitForSelector('.debug-fab');
  await pp.tap('.debug-fab');
  const fits = await pp.evaluate(() => { const r = document.querySelector('.debug-panel').getBoundingClientRect(); return { ok: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight, wide: document.documentElement.scrollWidth <= innerWidth }; });
  check(fits.ok && fits.wide, 'iPhone 13: the panel fits, no sideways scroll', JSON.stringify(fits));
  await phone.close();

  // Turning it off: the button, then ?debug=0.
  await page.goto(`${SITE}/`);
  await page.click('.debug-fab');
  await page.click('.debug-off');
  check(!(await page.$('#debug-panel-root')), '"Turn the panel off" removes it');
  await page.reload();
  await page.waitForTimeout(1000);
  check(!(await page.$('#debug-panel-root')), '…and it stays off after a reload');
  await page.goto(`${SITE}/?debug=1`);
  await page.waitForSelector('.debug-fab');
  await page.goto(`${SITE}/?debug=0`);
  await page.waitForTimeout(1000);
  check(!(await page.$('#debug-panel-root')) && !page.url().includes('debug'), '?debug=0 turns it off');

  // Turkish.
  await page.evaluate(() => localStorage.setItem('lang', 'tr'));
  await page.goto(`${SITE}/?debug=1`);
  await page.click('.debug-fab');
  check((await page.textContent('.debug-head h3')).includes('Test paneli'), 'Turkish texts');

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Test panel works');
  process.exit(fails ? 1 : 0);
})();
