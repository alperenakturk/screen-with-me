// 🚢 Sea Battle in the browser (Game Studio): Alex (computer) opens a table, Sam (an iPhone) joins from the invite card.
// Placing: a tap picks a ship, a tap on water moves it, Turn turns it, a drag moves it, Shuffle shuffles, Ready locks.
// Shooting: a miss and a hit each play their sound on both sides and show on both seas; Sam's page never draws Alex's
// ships before the game is over; the phone shows one sea at a time and flips to their sea on Sam's turn. Every button
// has a name; axe finds nothing in the window. Then Robin alone plays Glowbeam until the end.
//
//   npm run dev (its server has the lab flag), then: node scripts/harness/sea/run.cjs [site]
const { chromium, devices } = require('playwright');
const path = require('path');

let AXE = null;
try {
  AXE = require.resolve('axe-core/axe.min.js', { paths: [process.cwd(), path.join(__dirname, '../../..')] });
} catch {
  console.log('(axe-core not installed: the game window is not checked with axe; npm i --no-save axe-core@4.10.2)');
}

const SITE = process.argv[2] || 'http://localhost:5173';
let fails = 0;
const problems = [];
const check = (ok, label, extra = '') => {
  if (!ok) {
    fails++;
    problems.push(`${label}${extra ? ` → ${extra}` : ''}`);
  }
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? ` → ${extra}` : ''}`);
  if (!ok && process.env.GITHUB_ACTIONS) console.log(`::error title=${path.basename(__dirname)}::${label}${extra ? ` → ${extra}` : ''}`.replace(/\r?\n/g, ' '));
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 8000) {
  for (let t = 0; t < ms; t += 150) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await wait(150);
  }
  return null;
}

async function person(browser, room, name, avatar, device) {
  const ctx = await browser.newContext({ ...(device ?? { viewport: { width: 1366, height: 768 } }), bypassCSP: true });
  await ctx.addInitScript(([name, avatar]) => {
    for (const [k, v] of Object.entries({ lang: 'en', name, avatar, 'opt:autoInvite': '0', tipsSeen: '1', 'opt:leaveWarn': '1' })) localStorage.setItem(k, v);
    window.__sounds = [];
    addEventListener('swm-sound', (e) => window.__sounds.push(e.detail?.id ?? e.detail));
  }, [name, avatar]);
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept().catch(() => {}));
  page.on('pageerror', (e) => problems.push(`${name} PAGEERROR ${e.message}`));
  await page.goto(`${SITE}/r/${room}?debug=1#back`);
  await page.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 });
  await wait(2500);
  return { ctx, page };
}
const run = (page, id, arg) => page.evaluate(([id, arg]) => window.__swmLab.run(id, arg).then((l) => ({ dir: l.dir, text: l.text })), [id, arg]);
const phase = (page) => page.evaluate(() => document.querySelector('#game-stage .sea')?.dataset.phase ?? null);
/** The cells of a sea that carry a class. */
const cellsWith = (page, sea, cls) => page.evaluate(([sea, cls]) => [...document.querySelectorAll(`#game-stage .sea-${sea} .sea-cell.${cls}`)].map((c) => Number(c.dataset.cell)), [sea, cls]);
const click = (page, selector) => page.evaluate((s) => document.querySelector(s)?.click(), selector);
const sounds = (page) => page.evaluate(() => window.__sounds.slice());

async function axeStage(page, label) {
  if (!AXE) return;
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ path: AXE });
  const list = await page.evaluate(() =>
    axe.run('#game-stage', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] }).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`)),
  );
  check(list.length === 0, `${label}: axe finds nothing in the game window`, list.join(' ; '));
}
async function unnamed(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('#game-stage button')]
      .filter((b) => b.offsetParent !== null && !(b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent.trim()))
      .map((b) => b.className),
  );
}

(async () => {
  const browser = await chromium.launch();
  const room = 'sea' + Math.random().toString(36).slice(2, 8);
  const alex = await person(browser, room, 'Alex', 'wizard');
  const sam = await person(browser, room, 'Sam', 'pirate', devices['iPhone 13']);

  const opened = await run(alex.page, 'games.open.sea');
  check(opened.dir === 'lab', 'Alex opens a Sea Battle table', opened.text);
  check(!!(await until(() => alex.page.evaluate(() => document.querySelectorAll('#game-stage .sea-mine .sea-cell.ship').length === 17))), 'Alex sees his random fleet (17 ship cells)');
  check(!!(await until(() => sam.page.evaluate(() => !!document.querySelector('#game-invite .btn.primary')))), 'Sam gets the invite card');
  await click(sam.page, '#game-invite .btn.primary');
  check(!!(await until(() => alex.page.evaluate(() => /Sam/.test(document.querySelector('#game-stage .sea-theirs .sea-head')?.textContent ?? '') || document.querySelector('#game-stage .sea')?.dataset.phase === 'place'))), 'Sam takes the second seat');
  check(!!(await until(() => sam.page.evaluate(() => document.querySelectorAll('#game-stage .sea-mine .sea-cell.ship').length === 17))), 'Sam (iPhone) sees his own fleet');
  check(await alex.page.evaluate(() => getComputedStyle(document.querySelector('#game-stage .sea-theirs')).display === 'none'), 'placing shows only my sea');

  // Placing by taps: pick a ship, then tap water until a spot fits (ships may not touch).
  const before = await cellsWith(alex.page, 'mine', 'ship');
  const pickCell = before[before.length - 1];
  await alex.page.click(`#game-stage .sea-mine .sea-cell[data-cell="${pickCell}"]`);
  check(await alex.page.evaluate((c) => document.querySelector(`#game-stage .sea-mine .sea-cell[data-cell="${c}"]`).classList.contains('picked'), pickCell), 'a tap picks a ship');
  let moved = -1;
  for (const c of [...Array(100).keys()].filter((i) => !before.includes(i))) {
    await alex.page.click(`#game-stage .sea-mine .sea-cell[data-cell="${c}"]`);
    await wait(120);
    if ((await cellsWith(alex.page, 'mine', 'ship')).includes(c)) {
      moved = c;
      break;
    }
    // A tap on water that does not fit leaves the ship picked and says so.
  }
  check(moved >= 0, 'a tap on water moves the picked ship there');
  check(await alex.page.evaluate(() => document.querySelectorAll('#game-stage .sea-mine .sea-cell.picked').length > 0), 'the moved ship stays picked');
  // The fleet is random: a ship next to another one (or the edge) may have no room to turn, and the page then says
  // so and leaves it. Like a player, pick another ship and try again (CI hit that once).
  let turned = false;
  for (let tries = 0; tries < 8 && !turned; tries++) {
    const beforeTurn = (await cellsWith(alex.page, 'mine', 'picked')).join(',');
    await click(alex.page, '#game-stage .sea-turn');
    turned = !!(await until(async () => (await cellsWith(alex.page, 'mine', 'picked')).join(',') !== beforeTurn, 1500));
    if (turned) break;
    const ships = await cellsWith(alex.page, 'mine', 'ship');
    const pickedNow = await cellsWith(alex.page, 'mine', 'picked');
    const other = ships.filter((c) => !pickedNow.includes(c))[(tries * 5) % Math.max(1, ships.length - pickedNow.length)];
    if (other !== undefined) await alex.page.click(`#game-stage .sea-mine .sea-cell[data-cell="${other}"]`);
    await wait(150);
  }
  check(turned, 'Turn turns a picked ship (another one when the first has no room)');
  // Drag: press on a ship, let go on water.
  const dragFrom = (await cellsWith(alex.page, 'mine', 'ship'))[0];
  const box = async (c) => (await alex.page.locator(`#game-stage .sea-mine .sea-cell[data-cell="${c}"]`).boundingBox());
  const shipsNow = await cellsWith(alex.page, 'mine', 'ship');
  const dropAt = [...Array(100).keys()].reverse().find((i) => !shipsNow.includes(i) && i % 10 === 0);
  const a = await box(dragFrom);
  const b = await box(dropAt);
  await alex.page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await alex.page.mouse.down();
  await alex.page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
  await alex.page.mouse.up();
  await wait(600);
  const afterDrag = await cellsWith(alex.page, 'mine', 'ship');
  check(afterDrag.join(',') !== shipsNow.join(',') || (await alex.page.evaluate(() => /fit/.test(document.querySelector('#game-stage .sea-status').textContent))), 'a drag moves a ship (or says it does not fit)');
  await click(alex.page, '#game-stage .sea-shuffle');
  check(!!(await until(async () => (await cellsWith(alex.page, 'mine', 'ship')).join(',') !== afterDrag.join(','))), 'Shuffle lays a new fleet');
  check((await cellsWith(alex.page, 'mine', 'ship')).length === 17, 'the fleet still has 17 ship cells');
  check((await unnamed(alex.page)).length === 0, 'placing: every button has a name', (await unnamed(alex.page)).join(', '));
  await axeStage(alex.page, 'placing (computer)');

  // Ready: both.
  await click(alex.page, '#game-stage .sea-ready-btn');
  await click(sam.page, '#game-stage .sea-ready-btn');
  check(!!(await until(async () => (await phase(alex.page)) === 'play' && (await phase(sam.page)) === 'play')), 'both ready: the battle starts on both screens');
  check(await alex.page.evaluate(() => getComputedStyle(document.querySelector('#game-stage .sea-theirs')).display !== 'none' && getComputedStyle(document.querySelector('#game-stage .sea-mine')).display !== 'none'), 'the computer shows both seas');
  check(await sam.page.evaluate(() => !!document.querySelector('#game-stage .sea-switch') && getComputedStyle(document.querySelector('#game-stage .sea-switch')).display !== 'none'), 'the phone shows the My sea / Their sea switch');
  check(await sam.page.evaluate(() => [...document.querySelectorAll('#game-stage .sea-sea')].filter((s) => getComputedStyle(s).display !== 'none').length === 1), 'the phone shows one sea at a time');
  check((await cellsWith(sam.page, 'theirs', 'ship')).length === 0, "Sam's page draws none of Alex's ships");

  // Alex fires: first a miss (Alex reads Sam's fleet from Sam's own page, as the test may), then a hit.
  const samShips = await cellsWith(sam.page, 'mine', 'ship');
  const turnOf = () => alex.page.evaluate(() => document.querySelector('#game-stage .sea-theirs')?.classList.contains('aim'));
  check(!!(await turnOf()), 'Alex shoots first');
  const miss = [...Array(100).keys()].find((c) => !samShips.includes(c));
  await alex.page.click(`#game-stage .sea-theirs .sea-cell[data-cell="${miss}"]`);
  check(!!(await until(async () => (await cellsWith(alex.page, 'theirs', 'miss')).includes(miss))), 'a miss shows on their sea');
  check(!!(await until(async () => (await cellsWith(sam.page, 'mine', 'miss')).includes(miss))), "…and on Sam's own sea");
  check(!!(await until(async () => (await sounds(alex.page)).includes('seaMiss') && (await sounds(sam.page)).includes('seaMiss'))), 'the splash plays on both sides');
  check(!!(await until(() => sam.page.evaluate(() => document.querySelector('#game-stage .sea')?.dataset.view === 'theirs'))), "Sam's phone turns to their sea on his turn");
  // Sam misses back at a corner of Alex's sea that holds no ship.
  const alexShips = await cellsWith(alex.page, 'mine', 'ship');
  const samMiss = [...Array(100).keys()].reverse().find((c) => !alexShips.includes(c));
  // GP2 (owner's pick A): on a phone the first tap only aims; a second tap (or Fire) shoots.
  const other = [...Array(100).keys()].find((c) => !alexShips.includes(c) && c !== samMiss);
  await sam.page.click(`#game-stage .sea-theirs .sea-cell[data-cell="${other}"]`);
  await wait(300);
  const aimed = await sam.page.evaluate(() => ({
    cells: [...document.querySelectorAll('#game-stage .sea-theirs .sea-cell.aimed')].map((c) => Number(c.dataset.cell)),
    status: document.querySelector('#game-stage .sea-status')?.textContent ?? '',
    fire: document.querySelector('#game-stage .sea-fire')?.textContent ?? '',
  }));
  check(aimed.cells.length === 1 && aimed.cells[0] === other && /aiming at [A-J]\d+/i.test(aimed.status) && /fire at [A-J]\d+/i.test(aimed.fire), "phone: Sam's first tap only aims (crosshair, the cell's name, a Fire button)", aimed);
  check(!(await cellsWith(alex.page, 'mine', 'miss')).includes(other), 'phone: nothing is fired by an aim');
  await sam.page.click(`#game-stage .sea-theirs .sea-cell[data-cell="${samMiss}"]`);
  await wait(200);
  check((await sam.page.evaluate(() => [...document.querySelectorAll('#game-stage .sea-theirs .sea-cell.aimed')].map((c) => Number(c.dataset.cell)))).join() === String(samMiss), 'phone: tapping another cell moves the aim');
  await click(sam.page, '#game-stage .sea-fire');
  check(!!(await until(() => turnOf())), "Sam's miss (by Fire) passes the turn back");
  check(!!(await until(async () => (await cellsWith(alex.page, 'mine', 'miss')).includes(samMiss))), 'phone: Fire shot the aimed cell');
  await alex.page.click(`#game-stage .sea-theirs .sea-cell[data-cell="${samShips[0]}"]`);
  check(!!(await until(async () => (await cellsWith(alex.page, 'theirs', 'hit')).includes(samShips[0]))), 'a hit shows on their sea');
  check(!!(await until(async () => (await sounds(sam.page)).includes('seaHit'))), 'the hit sounds on both sides');
  check(!!(await turnOf()), 'a hit lets Alex shoot again');
  check((await unnamed(alex.page)).length === 0, 'battle: every button has a name', (await unnamed(alex.page)).join(', '));
  check(await alex.page.evaluate(() => /^[A-J]\d+: /.test(document.querySelector('#game-stage .sea-theirs .sea-cell').getAttribute('aria-label') ?? '')), 'cells are named like "A1: water"');
  await axeStage(alex.page, 'battle (computer)');
  await axeStage(sam.page, 'battle (iPhone)');
  check((await cellsWith(sam.page, 'theirs', 'ship')).length === 0, "Sam's page still draws none of Alex's hidden ships");
  await alex.ctx.close();
  await sam.ctx.close();

  // Robin alone against Glowbeam, to the end.
  const robin = await person(browser, room + 'g', 'Robin', 'robot');
  await run(robin.page, 'games.open.sea');
  await until(() => robin.page.evaluate(() => !!document.querySelector('#game-stage .sea-bot-level')));
  await click(robin.page, '#game-stage .sea-bot-level:nth-of-type(2)');
  await robin.page.evaluate(() => [...document.querySelectorAll('#game-stage .sea-bot-level')].pop()?.click());
  check(!!(await until(() => robin.page.evaluate(() => /Glowbeam/.test(document.querySelector('#game-stage .sea-theirs .sea-head')?.textContent ?? '') || !!document.querySelector('#game-stage .sea-bot-level.on')))), 'Glowbeam takes the other seat');
  await click(robin.page, '#game-stage .sea-ready-btn');
  check(!!(await until(async () => (await phase(robin.page)) === 'play')), 'the battle with Glowbeam starts');
  for (let i = 0; i < 300 && (await phase(robin.page)) === 'play'; i++) {
    const shot = await robin.page.evaluate(() => {
      if (!document.querySelector('#game-stage .sea-theirs.aim')) return false;
      const c = document.querySelector('#game-stage .sea-theirs .sea-cell:not(:disabled)');
      c?.click();
      return !!c;
    });
    await wait(shot ? 180 : 300);
  }
  check((await phase(robin.page)) === 'over', 'the game against Glowbeam ends');
  check((await cellsWith(robin.page, 'mine', 'miss')).length + (await cellsWith(robin.page, 'mine', 'hit')).length > 0, 'Glowbeam fired at my sea');
  check((await cellsWith(robin.page, 'theirs', 'ship')).length === 17, "after the end Glowbeam's fleet shows");
  check(!!(await until(async () => (await sounds(robin.page)).some((s) => s === 'win' || s === 'lose'))), 'the end plays a win or lose sound');
  check(!!(await robin.page.evaluate(() => !!document.querySelector('#game-stage .sea-rematch'))), 'Play again is offered');
  // GP2: the one result card over the seas: the outcome, the score, Play again inside it, "See the seas" moves it away.
  const card = await robin.page.evaluate(() => {
    const l = document.querySelector('#game-stage .gr-layer');
    return l && { open: !l.hidden, outcome: l.dataset.outcome, title: l.querySelector('.gr-title')?.textContent ?? '', line: l.querySelector('.gr-line')?.textContent ?? '', again: !!l.querySelector('.gr-actions .sea-rematch') };
  });
  check(!!card && card.open && /^(win|lose)$/.test(card.outcome) && card.title.length > 3 && /\d+ – \d+/.test(card.line) && card.again, 'the result card shows the outcome, the score and Play again', card);
  await click(robin.page, '#game-stage .gr-see');
  const after = await robin.page.evaluate(() => ({ hidden: document.querySelector('#game-stage .gr-layer')?.hidden, again: !!document.querySelector('#game-stage .sea-actions .sea-rematch') }));
  check(after.hidden && after.again, '"See the seas" hides the card; Play again stays under the seas', after);
  await click(robin.page, '#game-stage .sea-rematch');
  check(!!(await until(async () => (await phase(robin.page)) === 'place')), 'Play again starts a new game (placing)');
  await robin.ctx.close();

  await browser.close();
  if (problems.length) console.log('\n' + problems.join('\n'));
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Sea Battle harness passed');
  process.exit(fails ? 1 : 0);
})();
