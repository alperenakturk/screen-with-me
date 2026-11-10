// Card LAB2: the owner runs his test round through the 🐞 Test Lab ("nothing may fail in the part we test with"). This
// runs every lab command once, on a computer and on a phone, in English and in Turkish, on a live-like address
// (`lab.localhost`: Chromium sends it to this computer by itself, while the server and the site treat it as any other
// site, so the owner's code unlocks the lab like on live; a `--host-resolver-rules` name such as lab-lock's `lab.test`
// gets its WebSockets refused in the cloud container), in a room with fake friends and the Sync test playing:
//   - no red line in the log except the commands that fail on purpose (lab.selfTest, scenario.selfTest);
//   - every command that offers Undo undoes without a red line;
//   - every tab of the drawer opens (the phone's bottom sheet too), the command box finds and runs a command,
//     "🐞 This is a bug" fills its text, and the page throws no error.
// Commands of the 🎮 tab are Game Studio's (their own sweep); `TABS=` narrows the run, `DEVICES=laptop` / `LANGS=tr`.
//
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 --var SWM_LAB_SERVER:1 --var LAB_CODE:harness-lab-code)
//   NODE_PATH=$(npm root -g) node scripts/harness/lab-sweep/run.cjs [code]
const { chromium, devices } = require('playwright');

const CODE = process.argv[2] && !/^https?:/.test(process.argv[2]) ? process.argv[2] : process.env.LAB_CODE || 'harness-lab-code';
const PORT = 8787;
const SITE = `http://${process.env.LAB_HOST || 'lab.localhost'}:${PORT}`;
const pick = (env, all) => (process.env[env] ? process.env[env].split(',') : all);
const DEVICES = pick('DEVICES', ['laptop', 'phone']);
const LANGS = pick('LANGS', ['en', 'tr']);
const TABS = pick('TABS', ['status', 'friends', 'video', 'scenarios', 'screen', 'log']);
/** Commands that fail on purpose. */
const EXPECTED_RED = new Set(['lab.selfTest', 'scenario.selfTest']);
/** Commands the sweep leaves to their own checks: they reload, leave the page or switch the lab off. */
const SKIP = new Set(['lab.reload', 'lab.firstVisit', 'lab.off', 'round.n2old', 'round.n4']);
/** Run in this order where it matters (the rest follow in the lab's order). */
const FIRST = ['friends.add'];
const LAST = ['friends.removeAll'];
/** Commands whose Undo would take away what the next ones need: undone at the end instead. */
const KEEP = new Set(['friends.add', 'friends.add3']);
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra !== '' ? ` → ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : ''}`);
  if (!ok) fails++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 8000) => {
  for (let i = 0; i < ms / 150; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await wait(150);
  }
  return null;
};

async function sweep(browser, device, lang) {
  const tag = `${device} · ${lang}`;
  const ctx = await browser.newContext({ ...(device === 'phone' ? devices['Pixel 7'] : { viewport: { width: 1366, height: 768 } }), permissions: ['clipboard-read', 'clipboard-write'] });
  await ctx.addInitScript((l) => {
    localStorage.setItem('lang', l);
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('tipsSeen', '1');
  }, lang);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('dialog', (d) => d.accept());

  // Unlock with the code (like the owner on his phone), then the room; the lab survives the room's reload.
  await page.goto(`${SITE}/?debug=${encodeURIComponent(CODE)}`);
  check(!!(await until(() => page.$('.debug-fab'))), `${tag}: the code unlocks the lab`);
  const room = `sw${Math.random().toString(36).slice(2, 7)}`;
  await page.goto(`${SITE}/r/${room}`);
  await page.fill('#name', 'Robin');
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await page.waitForFunction(() => window.__swmLab && window.__swmLab.list, null, { timeout: 20000 });
  await page.reload();
  await page.waitForSelector('.room');
  check(!!(await until(() => page.evaluate(() => !!window.__swmLab && !!document.querySelector('.debug-fab')))), `${tag}: the lab survives a reload of the room`);
  await wait(3500); // past the intro

  // Something playing: the room's own 🧪 Sync test (a video file link only plays on a local server, not on a live-like host). It
  // needs a second person, so a fake friend comes first (it stays for the friends' commands; undone at the end).
  await page.evaluate(() => window.__swmLab.run('friends.add'));
  await until(() => page.evaluate(() => window.__swmLab.list().find((c) => c.id === 'friends.say')?.available === true));
  await page.evaluate(() => document.querySelector('#sync-test')?.click());
  check(!!(await until(() => page.evaluate(() => window.__swmLab.list().find((c) => c.id === 'video.drift')?.available === true), 10000)), `${tag}: the Sync test plays (the video commands become available)`);
  await wait(1500);

  // ---- Every command ----
  const list = await page.evaluate(() => window.__swmLab.list());
  const ids = list.filter((c) => TABS_IN.includes(c.tab) && !SKIP_IN.includes(c.id)).map((c) => c.id);
  const order = [...FIRST.filter((id) => ids.includes(id)), ...ids.filter((id) => !FIRST.includes(id) && !LAST.includes(id)), ...LAST.filter((id) => ids.includes(id))];
  const bad = [];
  const skipped = [];
  let crowdAt = 0;
  for (const id of order) {
    // 🎬 "Open 12 more connections" uses a fifth of the minute's 60 new connections one address may open (live-like
    // host): the scenarios' fake friends start in a fresh minute, as the command's help says.
    if (id.startsWith('scenario.') && crowdAt) {
      await wait(Math.max(0, 62_000 - (Date.now() - crowdAt)));
      crowdAt = 0;
    }
    if (id === 'limits.crowd') crowdAt = Date.now();
    const now = (await page.evaluate(() => window.__swmLab.list())).find((c) => c.id === id);
    if (!now) continue;
    if (now.available !== true) {
      skipped.push(`${id} (${now.available})`);
      continue;
    }
    const line = await page.evaluate((x) => window.__swmLab.run(x).then((l) => ({ dir: l.dir, text: l.text })), id).catch((e) => ({ dir: 'error', text: String(e.message || e) }));
    const red = line.dir === 'error';
    if (red !== EXPECTED_RED.has(id)) bad.push(`${id}: ${line.text}`);
    // "This is a bug" opens its box: Esc closes it again (the owner's way back).
    if (id === 'lab.bug') {
      const open = await page.evaluate(() => { const b = document.querySelector('.lab-bug-box'); return !!b && !b.hidden; });
      if (!open) bad.push('lab.bug: the report box did not open');
      await page.keyboard.press('Escape');
      if (await page.evaluate(() => { const b = document.querySelector('.lab-bug-box'); return !!b && !b.hidden; })) bad.push('lab.bug: Esc does not close the report box');
    }
    // Scenarios and network accidents take a while; let the room settle before the next one.
    await wait(/^(scenario|net|limits|video)\./.test(id) ? 2500 : 400);
    // The fake friends stay for the commands after them; they leave with the last command (friends.removeAll).
    if (now.undo && !red && !KEEP.has(id)) {
      const back = await page.evaluate((x) => window.__swmLab.undo(x).then((l) => ({ dir: l.dir, text: l.text })), id).catch((e) => ({ dir: 'error', text: String(e.message || e) }));
      if (back.dir === 'error') bad.push(`${id} undo: ${back.text}`);
      await wait(300);
    }
  }
  for (const id of KEEP) {
    const back = await page.evaluate((x) => window.__swmLab.undo(x).then((l) => ({ dir: l.dir, text: l.text })), id).catch((e) => ({ dir: 'error', text: String(e.message || e) }));
    if (back.dir === 'error' && !/no fake|sahte arkadaş yok|nothing to undo|geri alınacak/i.test(back.text)) bad.push(`${id} undo: ${back.text}`);
  }
  check(bad.length === 0, `${tag}: every command runs (and undoes) without a red line, except the ones that fail on purpose (${order.length} commands)`, bad.join(' | '));
  if (skipped.length) console.log(`     ${tag}: not available here (they say why): ${skipped.join('; ')}`);
  const stray = (await page.evaluate(() => window.__swmLab.log())).filter((l) => l.dir === 'error' && !/selfTest|self-test|kendini/i.test(`${l.type} ${l.text}`));
  check(stray.length === 0, `${tag}: no other red line in the log`, stray.slice(0, 5).map((l) => `${l.type}: ${l.text}`).join(' | '));

  // ---- The drawer by hand: every tab, the command box, "This is a bug" ----
  await page.click('.debug-fab');
  check(!!(await until(() => page.evaluate(() => { const d = document.querySelector('.lab-drawer'); return d && !d.hidden && d.getBoundingClientRect().height > 0; }))), `${tag}: 🐞 opens the drawer${device === 'phone' ? ' (a bottom sheet)' : ''}`);
  const tabs = await page.$$eval('.lab-tab', (t) => t.map((x) => x.dataset.tab));
  const empty = [];
  for (const tab of tabs) {
    await page.click(`.lab-tab[data-tab="${tab}"]`);
    await wait(250);
    const ok = await page.evaluate(() => {
      const view = document.querySelector('.lab-body');
      return !!view && view.textContent.trim().length > 0;
    });
    if (!ok) empty.push(tab);
  }
  check(empty.length === 0, `${tag}: every tab shows its content (${tabs.length} tabs)`, empty.join(','));
  // Every command button of a tab is a real button with a title and a help line in the page's language.
  await page.click('.lab-tab[data-tab="video"]');
  await wait(250);
  const rows = await page.$$eval('.lab-command-text', (r) => r.map((x) => [x.querySelector('strong')?.textContent ?? '', x.querySelector('small')?.textContent ?? '']));
  check(rows.length > 0 && rows.every(([t, h]) => t.length > 3 && h.length > 10), `${tag}: every command row has a title and a help line`, rows.filter(([t, h]) => t.length <= 3 || h.length <= 10));
  // The command box: open, type, run the first match with Enter.
  await page.keyboard.press('Control+k');
  const box = await until(() => page.$('.lab-cmdbox:not([hidden]) .lab-cmd-input'));
  if (box) {
    await box.fill(lang === 'tr' ? 'işaret' : 'marker');
    await wait(200);
    // The log keeps only its newest lines, so count the marker runs rather than slicing by the old length.
    const marks = () => page.evaluate(() => window.__swmLab.log().filter((l) => l.type === 'lab.mark' && l.dir === 'lab').map((l) => l.text).join('|'));
    const before = await marks();
    await page.keyboard.press('Enter');
    const ran = await until(async () => (await marks()) !== before);
    check(!!ran, `${tag}: the command box finds "${lang === 'tr' ? 'işaret' : 'marker'}" and runs it with Enter`);
  } else check(false, `${tag}: Ctrl+K opens the command box`);
  await page.keyboard.press('Escape');
  // 🐞 This is a bug: the report's text has the facts and the log.
  const bugText = await page.evaluate(() => window.__swmLab.bugText());
  check(typeof bugText === 'string' && bugText.length > 200 && /0\.9\.\d+/.test(bugText), `${tag}: "This is a bug" builds a report with the version and the log`, typeof bugText === 'string' ? bugText.slice(0, 80) : bugText);
  check(errors.length === 0, `${tag}: no page error`, errors.slice(0, 3).join(' | '));
  // 🧪 Test round N2 "a browser that had Ocean Liner" reloads the page: Night shows; Undo reloads with my own theme back.
  if (device === 'laptop') {
    await page.evaluate(() => localStorage.setItem('theme', 'neon'));
    await page.reload();
    await page.waitForFunction(() => window.__swmLab && window.__swmLab.run, null, { timeout: 20000 });
    await page.evaluate(() => window.__swmLab.run('round.n2old'));
    // The site turns the old save into Night on load (NP1), so only what shows is checked.
    await page.waitForFunction(() => window.__swmLab && document.documentElement.dataset.theme === 'gece', null, { timeout: 20000 }).catch(() => null);
    const old = await page.evaluate(() => [document.documentElement.dataset.theme, localStorage.getItem('theme')]);
    check(old[0] === 'gece' && old[1] !== 'neon', `${tag}: Test round N2: an Ocean Liner save shows Night after the reload`, old);
    await page.evaluate(() => window.__swmLab.undo('round.n2old'));
    await page.waitForFunction(() => window.__swmLab && document.documentElement.dataset.theme === 'neon', null, { timeout: 20000 }).catch(() => null);
    const back = await page.evaluate(() => [document.documentElement.dataset.theme, localStorage.getItem('theme')]);
    check(back[0] === 'neon' && back[1] === 'neon', `${tag}: Test round N2: Undo puts my own theme back`, back);
  }
  await ctx.close();
}

const TABS_IN = TABS;
const SKIP_IN = [...SKIP];

(async () => {
  const browser = await chromium.launch({ args: ['--host-resolver-rules=MAP lab.test 127.0.0.1', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  let first = true;
  for (const device of DEVICES)
    for (const lang of LANGS) {
      // Each run opens dozens of connections from one address: the next one starts in a fresh minute (60 a minute).
      if (!first) await wait(62_000);
      first = false;
      await sweep(browser, device, lang);
    }
  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Test Lab sweep: every command, tab and box works');
  process.exit(fails ? 1 : 0);
})();
