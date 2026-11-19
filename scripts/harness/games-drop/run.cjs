// Players thrown out of tables (card GD1, Game Studio). Alex opens a tic-tac-toe table and Sam joins. Then:
// 1. Both room connections come back at once (the Test Lab's "Pretend the server restarted", as after a deploy): the
//    room must still count both at the table. Before GD1 the new connections never said so again, the room took the
//    table for empty and closed it 2 minutes later, throwing both out.
// 2. Sam's table line goes dead without a close event (`game.drop.cut`): his page finds it within seconds, reconnects,
//    and the game goes on with both seated (before GD1 it stayed frozen until the table counted him gone).
// 3. Sam's tab comes back from the background (`game.drop.background`) on a healthy line: nothing is dropped.
// No page errors.
//
//   npm run dev (its server has the lab flag), then: node scripts/harness/games-drop/run.cjs [site]
const { chromium } = require('playwright');
const path = require('path');

const SITE = process.argv[2] || 'http://localhost:5173';
let fails = 0;
const check = (ok, label, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? ` → ${extra}` : ''}`);
  if (!ok && process.env.GITHUB_ACTIONS) console.log(`::error title=${path.basename(__dirname)}::${label}${extra ? ` → ${extra}` : ''}`.replace(/\r?\n/g, ' '));
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 8000) {
  for (let t = 0; t < ms; t += 200) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await wait(200);
  }
  return null;
}

async function person(browser, room, name, avatar) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript(([name, avatar]) => {
    for (const [k, v] of Object.entries({ lang: 'en', name, avatar, 'opt:autoInvite': '0', tipsSeen: '1', 'opt:leaveWarn': '1', 'classics:xox:howSeen': '1' })) localStorage.setItem(k, v);
  }, [name, avatar]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('dialog', (d) => d.accept().catch(() => {}));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${SITE}/r/${room}?debug=1#back`);
  await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#game-btn'), null, { timeout: 20000 });
  await wait(1500);
  return { ctx, page, errors };
}
const run = (page, id) => page.evaluate((id) => window.__swmLab.run(id).then((l) => l.text), id);
/** A Test Lab status line's value. */
const status = (page, label) => page.evaluate((label) => window.__swmLab.status().find(([l]) => l === label)?.[1] ?? null, label);
const board = (page) => page.evaluate(() => [...document.querySelectorAll('#game-stage .xox-cell')].map((c) => c.className).join(';'));
/** One move by whoever has the turn. */
async function ply(alex, sam) {
  for (let i = 0; i < 20; i++) {
    for (const p of [alex, sam]) {
      const moved = await p.page.evaluate(() => {
        const c = document.querySelector('#game-stage .xox-cell:not([class*="mark-"]):not(:disabled)');
        c?.click();
        return !!c;
      });
      if (moved) return true;
    }
    await wait(300);
  }
  return false;
}

(async () => {
  const browser = await chromium.launch();
  const room = 'gd' + Math.random().toString(36).slice(2, 8);
  const alex = await person(browser, room, 'Alex', 'wizard');
  const sam = await person(browser, room, 'Sam', 'pirate');
  await run(alex.page, 'games.open.classics');
  await until(() => alex.page.evaluate(() => !!document.querySelector('#game-stage #cl-shelf-open, #game-stage .cl-picker')));
  if (!(await alex.page.evaluate(() => document.querySelector('#game-stage .xox-page')?.dataset.board === 'xox'))) {
    if (!(await alex.page.evaluate(() => !!document.querySelector('#game-stage .cl-picker:not([hidden]) .cl-box')))) {
      await alex.page.evaluate(() => document.querySelector('#cl-shelf-open')?.click());
      await wait(300);
    }
    await alex.page.evaluate(() => document.querySelector('#game-stage .cl-box[data-board="xox"]')?.click());
  }
  await until(() => alex.page.evaluate(() => document.querySelector('#game-stage .xox-page')?.dataset.board === 'xox'));
  await until(() => sam.page.evaluate(() => !!document.querySelector('#game-invite .btn.primary')));
  await sam.page.evaluate(() => document.querySelector('#game-invite .btn.primary')?.click());
  check(!!(await until(() => alex.page.evaluate(() => /Sam/.test(document.querySelector('#game-stage .xox-page')?.textContent ?? '')))), 'Sam joins and sits at the table');
  check(!!(await until(async () => (await status(alex.page, 'At my table (room)')) === '2')), 'the room counts both at the table');
  check((await ply(alex, sam)) && (await ply(alex, sam)), 'the two play');

  // 1. Both rooms reconnect (a deploy): the table must stay counted as used.
  await Promise.all([run(alex.page, 'net.restart'), run(sam.page, 'net.restart')]);
  await wait(4000);
  const counted = await until(async () => (await status(alex.page, 'At my table (room)')) === '2' && (await status(sam.page, 'At my table (room)')) === '2', 10000);
  check(!!counted, 'after both room connections come back the room still counts both at the table (no "empty table" close)', JSON.stringify({ alex: await status(alex.page, 'At my table (room)'), sam: await status(sam.page, 'At my table (room)') }));

  // 2. Sam's table line goes dead without a close event.
  await run(sam.page, 'game.drop.cut');
  const found = await until(async () => /^1,/.test((await status(sam.page, 'Table line drops')) ?? ''), 20000);
  check(!!found, "Sam's page finds the dead table line and reconnects", await status(sam.page, 'Table line drops'));
  await wait(1500);
  const a0 = await board(alex.page);
  const s0 = await board(sam.page);
  check(await ply(alex, sam), 'after the reconnect a move can be made');
  check(!!(await until(async () => (await board(alex.page)) !== a0 && (await board(sam.page)) !== s0, 10000)), '… and both see it');
  check(/Sam/.test(await alex.page.evaluate(() => document.querySelector('#game-stage .xox-page')?.textContent ?? '')), '… with Sam still seated');

  // 3. Back from the background on a healthy line: nothing dropped.
  await run(sam.page, 'game.drop.background');
  await wait(10000);
  check(/^1,/.test((await status(sam.page, 'Table line drops')) ?? ''), 'a healthy line is kept when the tab comes back from the background', await status(sam.page, 'Table line drops'));

  const errs = [...alex.errors, ...sam.errors];
  check(!errs.length, 'no page errors', errs.slice(0, 2).join(' | '));
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nall ok');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
