// 🐞 Test Lab, 🧪 Scenarios (card DL, DL5): every scripted two-person check passes on a healthy room, each step shows ✓,
// a scenario cleans up after itself (its fake friends leave, a setting goes back), and a broken step is a ✗ with its
// reason and the later steps skipped, never a broken room.
//
//   built site on wrangler dev (CI):  node scripts/harness/lab-scenarios/run.cjs http://localhost:8787
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const SCENARIOS = ['basics', 'wait', 'knock', 'private', 'reconnect'];
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};
const until = async (fn, ms = 8000) => {
  for (let i = 0; i < ms / 200; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript(() => {
    if (!localStorage.getItem('lang')) localStorage.setItem('lang', 'en');
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('tipsSeen', '1');
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('     pageerror', e.message));
  const room = `sc${Math.random().toString(36).slice(2, 7)}`;
  await page.goto(`${SITE}/?debug=1`);
  await page.waitForSelector('.debug-fab');
  await page.goto(`${SITE}/r/${room}`);
  await page.fill('#name', 'Robin');
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await page.waitForFunction(() => !!document.documentElement.dataset.swmTransport, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  const run = (id, arg) => page.evaluate(([i, a]) => window.__swmLab.run(i, a), [id, arg]);
  const people = () => page.evaluate(() => {
    const n = /(\d+)/.exec(document.querySelector('.room-title-count')?.textContent ?? '');
    return n ? Number(n[1]) : 1;
  });

  // ---- The 🧪 tab lists every scenario with a Run button ----
  await page.click('.debug-fab');
  await page.click('.lab-tab[data-tab="scenarios"]');
  const listed = await until(() => page.evaluate(() => [...document.querySelectorAll('.lab-scenario')].map((s) => s.dataset.scenario).join(',') || null));
  check(listed === [...SCENARIOS, 'selfTest'].join(','), '🧪 lists the scenarios (and the self-test)', String(listed));

  // ---- Each one passes, step by step, and leaves the room as it was ----
  for (const id of SCENARIOS) {
    const started = Date.now();
    // The first through its Run button (the tab's own path), the rest through the command box's path.
    let line;
    if (id === SCENARIOS[0]) {
      await page.click(`.lab-scenario[data-scenario="${id}"] .lab-scenario-run`);
      line = await until(() => page.evaluate((i) => window.__swmLab.log().reverse().find((l) => l.type === `scenario.${i}` && l.text !== '▶') ?? null, id), 60000);
    } else line = await run(`scenario.${id}`);
    const steps = await page.evaluate((i) => [...document.querySelectorAll(`.lab-scenario[data-scenario="${i}"] .lab-step`)].map((s) => s.textContent), id);
    check(!!line && line.dir !== 'error' && steps.length > 0 && steps.every((s) => s.startsWith('✓')), `${id}: every step ✓ (${((Date.now() - started) / 1000).toFixed(1)} s)`, `${JSON.stringify(line)} ${JSON.stringify(steps)}`);
    check(!!(await until(async () => (await people()) === 1, 10000)), `${id}: its fake friends left again`, String(await people()));
  }
  check(!(await page.evaluate(() => window.__swmLab.log().some((l) => l.dir === 'error' && /knock/.test(l.text)))), 'the door setting went back (no knock errors)');
  const knockBack = await page.evaluate(() => document.getElementById('opt-knock')?.checked ?? false);
  check(knockBack === false, 'after "knock" the door is off again');

  // ---- A broken step: ✗ with its reason, the rest skipped, the room fine ----
  const broken = await run('scenario.selfTest');
  const brokenSteps = await page.evaluate(() => [...document.querySelectorAll('.lab-scenario[data-scenario="selfTest"] .lab-step')].map((s) => s.textContent));
  check(broken.dir === 'error' && /expected/.test(broken.text) && brokenSteps[0]?.startsWith('✓') && brokenSteps[1]?.startsWith('✗') && brokenSteps[2]?.startsWith('–'), 'a step that breaks is ✗ with why, the rest skipped (–), a red log line', JSON.stringify({ broken, brokenSteps }));
  check(await page.evaluate(() => document.querySelector('.room-title-dot')?.dataset.status === 'open'), 'the room keeps working');

  // ---- Not the host any more: "knock" refuses to start and says why ----
  await run('friends.add');
  await until(async () => (await people()) === 2);
  await run('friends.host');
  check(!!(await until(() => page.evaluate(() => window.__swmLab.status().some(([k, v]) => k === 'Host' && v === 'someone else')), 8000)), 'a fake friend took the host role');
  const notHost = await run('scenario.knock');
  check(notHost.dir === 'error' && /host/.test(notHost.text), 'not the host: "knock" refuses to start and says why', JSON.stringify(notHost));
  await run('friends.removeAll');

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Test Lab scenarios work');
  process.exit(fails ? 1 : 0);
})();
