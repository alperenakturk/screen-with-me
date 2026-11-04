// 🐞 Test Lab (card DL, DL1): the drawer, the command box, 📊 Status, 📜 Log and "🐞 This is a bug" (grown from card
// 12's test panel). The owner: "the debug mode itself must not be buggy", so this also checks that with the lab off
// nothing of it loads, that a failing command never breaks the room, that undo works and that the log is redacted.
//
//   built site on wrangler dev (CI):  npm run build && (cd apps/server && npx wrangler dev --port 8787)
//                                     node scripts/harness/test-lab/run.cjs http://localhost:8787
//   or the dev servers:               npm run dev, then node scripts/harness/test-lab/run.cjs http://localhost:5173
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};
const shown = (page, selector) =>
  page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
  }, selector);
const until = async (fn, ms = 6000) => {
  for (let i = 0; i < ms / 150; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
};

async function enterRoom(page, room, name = 'Robin') {
  await page.goto(`${SITE}/r/${room}`);
  await page.fill('#name', name);
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await page.waitForFunction(() => document.documentElement.dataset.swmTransport === 'ws' || document.documentElement.dataset.swmTransport === 'http', null, { timeout: 15000 });
  await page.waitForTimeout(800);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript(() => {
    if (!localStorage.getItem('lang')) localStorage.setItem('lang', 'en');
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('tipsSeen', '1');
  });
  const page = await ctx.newPage();
  const chunks = [];
  page.on('request', (r) => {
    if (/test-lab|debug-panel/.test(r.url())) chunks.push(r.url());
  });

  // ---- Off: nothing of the lab loads, at home or in a room ----
  await page.goto(`${SITE}/`);
  await page.waitForTimeout(1000);
  const room0 = `lab${Math.random().toString(36).slice(2, 7)}`;
  await enterRoom(page, room0);
  check(!(await page.$('#debug-panel-root')) && chunks.length === 0, 'lab off: no lab on the page and its code is never downloaded (home and room)', chunks.join(' '));
  check(await page.evaluate(() => !('__swmLab' in window)), 'lab off: no lab object either');
  await page.fill('#chat-input', 'hello without the lab');
  await page.press('#chat-input', 'Enter');
  check(!!(await until(() => page.evaluate(() => [...document.querySelectorAll('.chat-line')].some((l) => l.textContent.includes('hello without the lab'))))), 'lab off: the room works as always (a chat message)');

  // ---- On ----
  await page.goto(`${SITE}/?debug=1`);
  await page.waitForSelector('.debug-fab');
  check(!page.url().includes('debug'), '?debug=1 leaves the address', page.url());
  check(await shown(page, '.debug-fab') && !(await shown(page, '.lab-drawer')), '🐞 shows, the drawer starts closed');
  await page.keyboard.press('Control+Shift+D');
  check(await shown(page, '.lab-drawer'), 'Ctrl+Shift+D opens the drawer');
  const tabs = await page.$$eval('.lab-tab', (t) => t.map((x) => x.dataset.tab));
  check(tabs.join(',') === 'status,friends,video,games,scenarios,screen,log', 'seven tabs: 📊 👥 🎬 🎮 🧪 🖥 📜', tabs.join(','));
  const facts = await page.$$eval('.debug-facts dt', (d) => d.map((x) => `${x.textContent}=${x.nextElementSibling.textContent}`));
  const site = (await page.textContent('.footer-version')).trim();
  check(facts.includes(`Site=${site}`) && facts.some((f) => /^Browser=Chrome \d+/.test(f)) && facts.some((f) => /^Screen=/.test(f)), '📊 Status: versions, browser, screen', facts.join(' | '));
  check(!!(await page.$('.lab-graph')), '📊 Status: the drift graph');
  check(await page.$('#debug-tvlab') !== null && await page.$('#debug-measure') !== null && await page.$('.debug-first') !== null, 'card 12\'s switches and "first-time visitor" are still there');
  await page.click('.lab-tab[data-tab="scenarios"]');
  check((await page.textContent('.lab-body')).includes('later step'), 'a tab without tools yet says so (no empty screen)');
  await page.click('.lab-tab[data-tab="friends"]');
  check((await page.textContent('.lab-body')).includes('work in a room'), '👥 outside a room says fake friends work in a room');

  // ---- In a room: status lines from the features, the log ----
  const room = `lab${Math.random().toString(36).slice(2, 7)}`;
  await enterRoom(page, room);
  await page.keyboard.press('Control+Shift+D');
  await page.waitForSelector('.lab-drawer:not([hidden])');
  await page.click('.lab-tab[data-tab="status"]');
  await page.waitForTimeout(1200);
  const roomFacts = await page.$$eval('.debug-facts dt', (d) => d.map((x) => `${x.textContent}=${x.nextElementSibling.textContent}`));
  check(roomFacts.some((f) => f.startsWith('Clock offset=') && /ms/.test(f)) && roomFacts.includes('People=1') && roomFacts.includes('Connection=WebSocket'), 'in a room: clock offset, people, connection', roomFacts.join(' | '));
  check(roomFacts.some((f) => f.startsWith('Voice peers=')) && roomFacts.some((f) => f.startsWith('Stream peers=')), 'in a room: voice and stream connection states', roomFacts.join(' | '));
  // The drawer makes room: the rail is never under it.
  const layout = await page.evaluate(() => {
    const d = document.querySelector('.lab-drawer').getBoundingClientRect();
    const rail = document.getElementById('fs-dock')?.getBoundingClientRect();
    return { drawerL: Math.round(d.left), railR: rail ? Math.round(rail.right) : null, scroll: document.documentElement.scrollWidth <= innerWidth };
  });
  check(layout.railR === null || layout.railR <= layout.drawerL + 1, 'the drawer never covers the rail (the page makes room)', JSON.stringify(layout));

  await page.click('.lab-tab[data-tab="log"]');
  await page.fill('#chat-input', 'lab log check');
  await page.press('#chat-input', 'Enter');
  const logged = await until(() => page.evaluate(() => { const dirs = window.__swmLab.log().filter((l) => l.type === 'chat').map((l) => l.dir); return dirs.includes('out') && dirs.includes('in') ? dirs.join(',') : null; }));
  check(!!logged && logged.includes('out') && logged.includes('in'), '📜 Log: my chat message out and back in', String(logged));
  const cid = await page.evaluate(() => localStorage.getItem('cid'));
  const allLog = await page.evaluate(() => JSON.stringify(window.__swmLab.log()));
  check(!!cid && !allLog.includes(cid), '📜 Log: the browser id never appears (redacted)');
  check((await page.textContent('.lab-log')).includes('lab log check'), '📜 Log: shown in the drawer');
  await page.fill('.lab-filter', 'zzz-nothing');
  check((await page.$$eval('.lab-line', (l) => l.length)) === 0, '📜 Log: the filter narrows it');
  await page.fill('.lab-filter', '');

  // ---- The command box: run, undo ----
  await page.keyboard.press('Control+K');
  check(await shown(page, '.lab-cmd-input'), 'Ctrl+K opens the command box');
  await page.keyboard.type('marker');
  const listed = await page.$$eval('.lab-cmd-item', (i) => i.map((x) => x.dataset.command));
  check(listed.includes('lab.mark'), 'typing narrows the commands', listed.join(','));
  await page.keyboard.press('Enter');
  const marked = await until(() => page.evaluate(() => window.__swmLab.log().some((l) => l.text === '— mark 1 —')));
  check(!!marked && !(await shown(page, '.lab-cmd-input')), 'Enter runs it (a marker in the log) and closes the box');
  check(await shown(page, '.lab-undo-btn'), 'the run offers Undo');
  await page.click('.lab-undo-btn');
  check(!(await page.evaluate(() => window.__swmLab.log().some((l) => l.text === '— mark 1 —'))), 'Undo takes it back');
  // Typing in the command box never reaches the room (1 would send an emoji, P open the pin note).
  await page.keyboard.press('Control+K');
  await page.keyboard.type('1p');
  check(await page.evaluate(() => document.getElementById('pin-form')?.hidden !== false), 'typing in the command box never reaches the room\'s shortcuts');
  await page.keyboard.press('Escape');

  // ---- A failing command: a red line, the room keeps working ----
  await page.evaluate(() => window.__swmLab.run('lab.selfTest'));
  const red = await page.evaluate(() => window.__swmLab.log().find((l) => l.type === 'lab.selfTest'));
  check(red?.dir === 'error' && /expected/.test(red.text), 'a failing command writes a red line', JSON.stringify(red));
  await page.fill('#chat-input', 'still alive');
  await page.press('#chat-input', 'Enter');
  check(!!(await until(() => page.evaluate(() => [...document.querySelectorAll('.chat-line')].some((l) => l.textContent.includes('still alive'))))), '…and the room keeps working');
  const unknown = await page.evaluate(() => window.__swmLab.run('no.such').then(() => 'ran', () => 'refused'));
  check(unknown === 'refused', 'an unknown command is refused, not run');

  // ---- This is a bug ----
  await page.click('.lab-bug');
  const text = await page.inputValue('.lab-bug-text');
  check(text.startsWith('Sidelit bug report') && text.includes(site) && text.includes('Log, last 2 minutes') && text.includes('lab log check') && text.includes('Clock offset'), '🐞 This is a bug: versions, state, the log of the last 2 minutes', text.split('\n').slice(0, 4).join(' / '));
  check(!text.includes(cid), 'the bug text has no browser id');
  await page.click('.lab-bug-copy');
  await page.waitForTimeout(300);
  check((await page.evaluate(() => navigator.clipboard.readText())) === text, 'Copy copies exactly the text shown');
  await page.keyboard.press('Escape');
  check(!(await shown(page, '.lab-bug-box')), 'Esc closes the bug text');

  // ---- An error on the page shows up ----
  await page.evaluate(() => setTimeout(() => { throw new Error('harness-boom'); }));
  await page.waitForTimeout(800);
  check(await page.evaluate(() => document.querySelector('.debug-fab').classList.contains('has-error') && window.__swmLab.log().some((l) => l.dir === 'error' && l.text.includes('harness-boom'))), 'a page error turns 🐞 red and lands in the log');

  // ---- Stays on after a reload; Esc in the drawer closes it ----
  await page.reload();
  await page.waitForSelector('.debug-fab');
  check(true, 'still on after a reload');
  await page.click('.debug-fab');
  await page.focus('.lab-tab[data-tab="status"]');
  await page.keyboard.press('Escape');
  check(!(await shown(page, '.lab-drawer')), 'Esc with the focus in the drawer closes it');

  // ---- A phone: a bottom sheet ----
  const phone = await browser.newContext({ ...devices['iPhone 13'] });
  await phone.addInitScript(() => localStorage.setItem('lang', 'en'));
  const pp = await phone.newPage();
  await pp.goto(`${SITE}/?debug=1`);
  await pp.waitForSelector('.debug-fab');
  await pp.tap('.debug-fab');
  const fits = await pp.evaluate(() => {
    const r = document.querySelector('.lab-drawer').getBoundingClientRect();
    return { ok: r.left >= 0 && r.right <= innerWidth + 1 && r.top > 0 && r.bottom <= innerHeight + 1, wide: document.documentElement.scrollWidth <= innerWidth };
  });
  check(fits.ok && fits.wide, 'iPhone 13: a bottom sheet that fits, no sideways scroll', JSON.stringify(fits));
  await phone.close();

  // ---- Turkish ----
  await page.evaluate(() => localStorage.setItem('lang', 'tr'));
  await page.reload();
  await page.waitForSelector('.debug-fab');
  await page.click('.debug-fab');
  check((await page.textContent('.lab-tab[data-tab="log"]')).includes('Kayıt'), 'Turkish texts');
  await page.evaluate(() => localStorage.setItem('lang', 'en'));

  // ---- Off again ----
  await page.click('.debug-off');
  check(!(await page.$('#debug-panel-root')) && !(await page.evaluate(() => document.documentElement.classList.contains('lab-open'))), '"Turn the lab off" removes it');
  await page.reload();
  await page.waitForTimeout(1000);
  check(!(await page.$('#debug-panel-root')), '…and it stays off after a reload');
  await page.goto(`${SITE}/?debug=1`);
  await page.waitForSelector('.debug-fab');
  await page.goto(`${SITE}/?debug=0`);
  await page.waitForTimeout(800);
  check(!(await page.$('#debug-panel-root')) && !page.url().includes('debug'), '?debug=0 turns it off');

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Test Lab works');
  process.exit(fails ? 1 : 0);
})();
