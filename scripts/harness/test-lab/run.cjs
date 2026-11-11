// 🐞 Test Lab (card DL, DL1): the drawer, the command box, 📊 Status, 📜 Log and "🐞 This is a bug" (grown from card
// 12's test panel). The owner: "the debug mode itself must not be buggy", so this also checks that with the lab off
// nothing of it loads, that a failing command never breaks the room, that undo works and that the log is redacted.
//
//   built site on wrangler dev (CI):  npm run build && (cd apps/server && npx wrangler dev --port 8787)
//                                     node scripts/harness/test-lab/run.cjs http://localhost:8787
//   or the dev servers:               npm run dev, then node scripts/harness/test-lab/run.cjs http://localhost:5173
//   in Turkish (card LABTR):          LAB_LANG=tr node scripts/harness/test-lab/run.cjs
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
// LABTR: the whole run in English (default) or Turkish; `L(en, tr)` picks the text a check expects.
const LANG = process.env.LAB_LANG === 'tr' ? 'tr' : 'en';
const L = (en, tr) => (LANG === 'tr' ? tr : en);
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
  await ctx.addInitScript((lang) => {
    if (!localStorage.getItem('lang')) localStorage.setItem('lang', lang);
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('tipsSeen', '1');
  }, LANG);
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
  check(facts.includes(`${L('Site version', 'Site sürümü')}=${site}`) && facts.some((f) => new RegExp(`^${L('Browser', 'Tarayıcı')}=Chrome \\d+`).test(f)) && facts.some((f) => f.startsWith(`${L('Screen', 'Ekran')}=`)), '📊 Status: versions, browser, screen', facts.join(' | '));
  check(!!(await page.$('.lab-graph')), '📊 Status: the drift graph');
  check(await page.$('#debug-tvlab') !== null && await page.$('#debug-measure') !== null && await page.$('.debug-first') !== null, 'card 12\'s switches and "first-time visitor" are still there');
  // Every tab shows something: its tools, or "comes in a later step" (no empty screen).
  const empty = [];
  for (const tab of ['friends', 'video', 'games', 'scenarios', 'screen']) {
    await page.click(`.lab-tab[data-tab="${tab}"]`);
    const text = (await page.textContent('.lab-body')).trim();
    if (text.length < 20) empty.push(tab);
  }
  check(empty.length === 0, 'no tab is an empty screen (its tools or "comes in a later step")', empty.join(','));
  await page.click('.lab-tab[data-tab="friends"]');
  check((await page.textContent('.lab-body')).includes(L('work in a room', 'bir odada çalışır')), '👥 outside a room says fake friends work in a room');

  // ---- In a room: status lines from the features, the log ----
  const room = `lab${Math.random().toString(36).slice(2, 7)}`;
  await enterRoom(page, room);
  await page.keyboard.press('Control+Shift+D');
  await page.waitForSelector('.lab-drawer:not([hidden])');
  await page.click('.lab-tab[data-tab="status"]');
  await page.waitForTimeout(1200);
  const roomFacts = await page.$$eval('.debug-facts dt', (d) => d.map((x) => `${x.textContent}=${x.nextElementSibling.textContent}`));
  check(roomFacts.some((f) => f.startsWith(L('Clock difference', 'Saat farkı')) && /🟢|🟡|🔴/.test(f) && /ms/.test(f)) && roomFacts.includes(L('People in the room=1', 'Odadaki kişi=1')) && roomFacts.includes(L('Connection=🟢 good (live connection)', 'Bağlantı=🟢 iyi (canlı bağlantıyla bağlı)')), 'in a room: clock difference with its colour, people, connection in plain words', roomFacts.join(' | '));
  check(roomFacts.some((f) => f.startsWith(L('Voice connections=', 'Ses bağlantıları='))) && roomFacts.some((f) => f.startsWith(L('Stream connections=', 'Yayın bağlantıları='))), 'in a room: voice and stream connection states', roomFacts.join(' | '));
  // LABTR: every line on 📊 Status in the page's language, no technical words in Turkish.
  const jargon = roomFacts.filter((f) => (LANG === 'tr' ? /websocket|http|peer|ice|rtt|offset|fallback|\b(the|my|not|none)\b/i : /\b(yok|bağlı|odada)\b/).test(f));
  check(jargon.length === 0, `📊 Status speaks ${LANG === 'tr' ? 'plain Turkish' : 'English'} only`, jargon.join(' | '));
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
  check(red?.dir === 'error' && (LANG === 'tr' ? /bekleniyor/ : /expected/).test(red.text), 'a failing command writes a red line', JSON.stringify(red));
  await page.fill('#chat-input', 'still alive');
  await page.press('#chat-input', 'Enter');
  check(!!(await until(() => page.evaluate(() => [...document.querySelectorAll('.chat-line')].some((l) => l.textContent.includes('still alive'))))), '…and the room keeps working');
  const unknown = await page.evaluate(() => window.__swmLab.run('no.such').then(() => 'ran', () => 'refused'));
  check(unknown === 'refused', 'an unknown command is refused, not run');

  // ---- This is a bug ----
  await page.click('.lab-bug');
  const text = await page.inputValue('.lab-bug-text');
  check(text.startsWith(L('Sidelit bug report', 'Sidelit hata raporu (Sidelit bug report)')) && text.includes(site) && text.includes(L('Log, last 2 minutes', 'Kayıt, son 2 dakika')) && text.includes('lab log check') && text.includes(L('Clock difference', 'Saat farkı')), '🐞 This is a bug: versions, state, the log of the last 2 minutes', text.split('\n').slice(0, 4).join(' / '));
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
  await phone.addInitScript((lang) => localStorage.setItem('lang', lang), LANG);
  const pp = await phone.newPage();
  await pp.goto(`${SITE}/?debug=1`);
  await pp.waitForSelector('.debug-fab');
  await pp.tap('.debug-fab');
  const fits = await pp.evaluate(() => {
    const r = document.querySelector('.lab-drawer').getBoundingClientRect();
    return { ok: r.left >= 0 && r.right <= innerWidth + 1 && r.top > 0 && r.bottom <= innerHeight + 1, wide: document.documentElement.scrollWidth <= innerWidth };
  });
  check(fits.ok && fits.wide, 'iPhone 13: a bottom sheet that fits, no sideways scroll', JSON.stringify(fits));
  // LAB3: a long fact name wraps instead of squeezing its value off the drawer; a touch screen gets a plain
  // "🔎 Commands" button instead of "⌘ Ctrl+K".
  const factCols = await pp.evaluate(() => {
    const drawer = document.querySelector('.lab-drawer').getBoundingClientRect();
    const dds = [...document.querySelectorAll('.lab-drawer .debug-facts dd')].map((d) => d.getBoundingClientRect()).filter((r) => r.width > 0);
    return { n: dds.length, narrow: dds.filter((r) => r.width < drawer.width * 0.4 || r.right > drawer.right + 1).length };
  });
  check(factCols.n > 0 && factCols.narrow === 0, 'iPhone 13: every fact\'s value has room in the drawer (no squeezed or cut column)', JSON.stringify(factCols));
  const cmdLabel = await pp.evaluate(() => document.querySelector('.lab-cmd-open')?.textContent ?? '');
  check(!/Ctrl|⌘/.test(cmdLabel) && cmdLabel.includes('🔎'), 'iPhone 13: the command box button says what it is, no keyboard shortcut', cmdLabel);

  // LABFAB: in the room an upright phone has no floating 🐞 (it covered the player row, chat names and the Shorts
  // video): ⋯ More has a 🐞 tile that opens the drawer, ⋯ is ringed red on errors; held sideways a small 🐞 waits in
  // the bottom right corner, clear of the video, its own bar and the rail (also in fullscreen).
  await enterRoom(pp, `lab-fab-${Date.now().toString(36)}`, 'Robin');
  await pp.evaluate(() => { document.querySelector('.first-tip, .tip-bubble')?.remove(); });
  check(!(await shown(pp, '.debug-fab')), 'iPhone 13 room: no floating 🐞 while upright');
  await pp.evaluate(() => window.dispatchEvent(new Event('swm-debug-error')));
  check(await pp.evaluate(() => getComputedStyle(document.querySelector('#strip-more')).boxShadow.includes('229, 72, 77')), 'iPhone 13 room: ⋯ is ringed red while the lab has errors');
  await pp.tap('#strip-more');
  const labTile = await until(() => pp.$('.ph-sheet .ph-lab-tile'));
  check(!!labTile && (await labTile.evaluate((b) => b.classList.contains('has-error'))), 'iPhone 13 room: ⋯ More has a red-ringed 🐞 Test Lab tile');
  check(!!labTile && /·/.test(await labTile.innerText()), 'iPhone 13 room: the tile says there are errors in words, not only red', labTile && (await labTile.innerText()));
  if (labTile) await labTile.tap();
  check(!!(await until(() => shown(pp, '.lab-drawer'))), 'iPhone 13 room: the tile opens the drawer');
  // LAB3: in a room the drawer also lists the room's lines (long names such as "Clock difference (…)").
  const roomCols = await pp.evaluate(() => {
    const drawer = document.querySelector('.lab-drawer').getBoundingClientRect();
    const dds = [...document.querySelectorAll('.lab-drawer .debug-facts dd')].map((d) => d.getBoundingClientRect()).filter((r) => r.width > 0);
    return { n: dds.length, narrow: dds.filter((r) => r.width < drawer.width * 0.4 || r.right > drawer.right + 1).length };
  });
  check(roomCols.n > 8 && roomCols.narrow === 0, 'iPhone 13 room: every fact\'s value has room in the drawer (Font shown included)', JSON.stringify(roomCols));
  await pp.evaluate(() => document.querySelector('.debug-fab').click());
  await until(async () => !(await shown(pp, '.lab-drawer')));
  const clearOfAll = () => pp.evaluate(() => {
    const f = document.querySelector('.debug-fab');
    const a = f.getBoundingClientRect();
    if (a.width < 2) return 'hidden';
    const hit = [...document.querySelectorAll('button, a, input, video, iframe, .player')].filter((e) => {
      if (e === f) return false;
      const b = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      if (b.width < 2 || b.height < 2 || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
      return !(b.right <= a.left || b.left >= a.right || b.bottom <= a.top || b.top >= a.bottom);
    });
    return hit.length ? hit.map((e) => e.id || e.className || e.tagName).join(', ') : 'clear';
  });
  await pp.setViewportSize({ width: 664, height: 390 });
  await pp.waitForTimeout(800);
  check((await clearOfAll()) === 'hidden', 'iPhone 13 sideways, no video: no floating 🐞 (⋯ shows there)', await clearOfAll());
  await pp.evaluate(() => window.__swmLab.run('friends.add')); // the sync test needs a second person
  await until(() => pp.evaluate(() => document.querySelectorAll('#voice-people .voice-face').length > 1));
  await pp.evaluate(() => document.querySelector('#sync-test')?.click());
  await until(() => pp.evaluate(() => !!document.querySelector('.room.has-item')));
  await pp.waitForTimeout(800);
  check((await clearOfAll()) === 'clear', 'iPhone 13 sideways: a small 🐞 shows, clear of everything', await clearOfAll());
  await pp.evaluate(() => document.querySelector('#fullscreen')?.click());
  await pp.waitForTimeout(800);
  check((await clearOfAll()) === 'hidden', 'iPhone 13 sideways fullscreen: no 🐞 (the rail\'s foot is full on small phones)', await clearOfAll());
  await phone.close();

  // ---- The other language (LABTR) ----
  const other = LANG === 'tr' ? 'en' : 'tr';
  await page.evaluate((l) => localStorage.setItem('lang', l), other);
  await page.reload();
  await page.waitForSelector('.debug-fab');
  await page.click('.debug-fab');
  check((await page.textContent('.lab-tab[data-tab="log"]')).includes(other === 'tr' ? 'Kayıt' : 'Log'), `${other === 'tr' ? 'Turkish' : 'English'} texts after a reload`);
  await page.evaluate((l) => localStorage.setItem('lang', l), LANG);
  await page.reload();
  await page.waitForSelector('.debug-fab');
  await page.click('.debug-fab');
  // The language buttons switch the lab at once, no reload (the room's top bar keeps them; the profile menu presses them).
  await page.evaluate((l) => document.querySelector(`.topbar [data-lang="${l}"]`)?.click(), other);
  const switched = await until(() => page.evaluate((l) => document.querySelector('.lab-tab[data-tab="log"]')?.textContent.includes(l === 'tr' ? 'Kayıt' : 'Log') && document.querySelector('.lab-bug')?.textContent.includes(l === 'tr' ? 'Bu bir hata' : 'This is a bug'), other), 3000);
  check(!!switched, 'the lab follows a language change at once (tabs, buttons)');
  await page.evaluate((l) => document.querySelector(`.topbar [data-lang="${l}"]`)?.click(), LANG);
  // The command box finds a command by its words in either language, accents optional.
  for (const words of ['kopar', 'baglantimi', 'drop my']) {
    await page.keyboard.press('Control+K');
    await page.keyboard.type(words);
    const found = await page.$$eval('.lab-cmd-item', (i) => i.map((x) => x.dataset.command));
    check(found.includes('net.drop'), `the command box finds net.drop by "${words}"`, found.join(','));
    await page.keyboard.press('Escape');
  }
  // Every command row in this language: Turkish rows carry no English helper words, English rows no Turkish ones.
  const leftovers = [];
  for (const tab of ['status', 'friends', 'video', 'games', 'scenarios', 'screen', 'log']) {
    await page.click(`.lab-tab[data-tab="${tab}"]`);
    await page.waitForTimeout(150);
    const rows = await page.$$eval('.lab-command-text, .lab-scenario-head, .lab-scenario > p', (r) => r.map((x) => x.textContent));
    for (const row of rows) if ((LANG === 'tr' ? /\b(the|my|your|with|when|a fake)\b/i : /\b(sahte|bir|odada|değil)\b/i).test(row)) leftovers.push(`${tab}: ${row.slice(0, 80)}`);
  }
  check(leftovers.length === 0, `every command says it in ${LANG === 'tr' ? 'Turkish' : 'English'}`, leftovers.slice(0, 4).join(' || '));

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

  // QA2-A #3: on a sideways tablet (touch, no mouse) the open drawer lies over the room; the room keeps its width.
  {
    const tab = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true });
    const tp = await tab.newPage();
    await tp.goto(`${SITE}/?debug=1`);
    await tp.waitForSelector('.debug-fab');
    await enterRoom(tp, `lab-tab-${Date.now().toString(36)}`, 'Robin');
    await tp.evaluate(() => { document.querySelector('.first-tip, .tip-bubble')?.remove(); });
    const before = await tp.evaluate(() => Math.round(document.querySelector('.room').getBoundingClientRect().width));
    await tp.evaluate(() => document.querySelector('.debug-fab').click());
    await until(() => shown(tp, '.lab-drawer'));
    const after = await tp.evaluate(() => ({ cls: document.documentElement.className, room: Math.round(document.querySelector('.room').getBoundingClientRect().width), pad: getComputedStyle(document.body).paddingRight }));
    check(after.cls.includes('is-touch') && !after.cls.includes('has-mouse') && after.room === before && after.pad === '0px', 'sideways tablet: the open drawer lies over the room, the room keeps its width', JSON.stringify({ before, ...after }));
    await tab.close();
  }

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Test Lab works');
  process.exit(fails ? 1 : 0);
})();
