// Game window rules (owner, 4 Nov 2026, 🎮 Game Studio P1): a game window's ✕ only minimizes it, in every game; leaving
// or ending a table are their own buttons and ask first while a game is in progress; closing the tab mid-game asks "are
// you sure?" (never on a plain page close); the hall's per-table control is "End", never a ✕.
// Checks: Alex opens XOX, Sam joins, one move each → ✕ minimizes (the table stays, Alex is still at it), 🎮 brings it
// back, a reload asks first (beforeunload, only mid-game), Leave asks first, End asks first and Cancel keeps the table,
// the hall's row says "End"; after the game is over a reload asks nothing.
//
//   npm run dev, then: node scripts/harness/game-window/run.cjs [site]
const { chromium } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
const room = 'gw' + Math.random().toString(36).slice(2, 8);
let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await wait(150);
  }
  return null;
}

async function person(browser, name, avatar) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  await page.goto(`${SITE}/`);
  await page.evaluate(([n, a]) => {
    const keys = { name: n, avatar: a, lang: 'en', 'opt:autoInvite': '0', tipsSeen: '1', 'opt:leaveWarn': '1' };
    for (const [k, v] of Object.entries(keys)) localStorage.setItem(k, v);
  }, [name, avatar]);
  await page.goto(`${SITE}/r/${room}#back`);
  await page.waitForFunction(() => !!document.querySelector('#game-btn'), null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  return page;
}
const stageHidden = (page) => page.evaluate(() => document.getElementById('game-stage').hidden);
const tables = (page) => page.evaluate(() => document.querySelectorAll('#game-menu .hub-table, #game-menu [data-table]').length);
const dialogShown = (page) => page.evaluate(() => !!document.querySelector('.dialog-backdrop:not([hidden]) .confirm-dialog'));
const cancelDialog = (page) => page.evaluate(() => document.querySelector('.dialog-backdrop:not([hidden]) .confirm-actions .btn:not(.primary)')?.click());
/** Clicks a free cell of the XOX board. */
const move = (page) =>
  page.evaluate(() => {
    const cell = [...document.querySelectorAll('#game-stage .xox-cell')].find((c) => !/mark-/.test(c.className));
    cell?.click();
    return !!cell;
  });

(async () => {
  const browser = await chromium.launch();
  const alex = await person(browser, 'Alex', 'wizard');
  const sam = await person(browser, 'Sam', 'elf');

  await alex.evaluate(async () => {
    document.getElementById('game-btn').click();
    await new Promise((r) => setTimeout(r, 300));
    document.querySelector('#game-menu [data-tab="together"]')?.click();
    await new Promise((r) => setTimeout(r, 150));
    document.querySelector('#game-menu [data-kind="xox"]')?.click();
  });
  check(!!(await until(() => alex.evaluate(() => !!document.querySelector('#game-stage .xox-cell')), 8000)), 'Alex opens XOX');
  await wait(1500);
  await sam.evaluate(() => document.querySelector('#game-invite .btn.primary')?.click());
  check(!!(await until(() => sam.evaluate(() => !!document.querySelector('#game-stage .xox-cell')), 8000)), 'Sam joins the table');
  await wait(1200);

  // Before any move: the game has not started, a reload asks nothing.
  let asked = false;
  const onDialog = async (d) => {
    if (d.type() === 'beforeunload') asked = true;
    await d.dismiss().catch(() => {});
  };
  // One move each (X starts; whoever's turn it is plays).
  for (let i = 0; i < 2; i++) {
    for (const p of [alex, sam]) await move(p);
    await wait(600);
  }
  const marks = await alex.evaluate(() => document.querySelectorAll('#game-stage .xox-cell[class*="mark-"]').length);
  check(marks >= 2, 'both played a move', String(marks));

  // ✕ only minimizes.
  const head = await alex.evaluate(() => [...document.querySelectorAll('#game-stage .game-stage-head button')].filter((b) => !b.hidden).map((b) => `${b.className.replace(/btn|small-btn/g, '').trim()}:${b.textContent.trim()}`));
  check(head.some((h) => /game-minimize:✕/.test(h)), 'the window has a ✕ (minimize)', JSON.stringify(head));
  await alex.evaluate(() => document.querySelector('#game-stage .game-minimize').click());
  check(!!(await until(() => stageHidden(alex), 3000)), '✕ puts the window away');
  await wait(800);
  const still = await sam.evaluate(() => !!document.querySelector('#game-stage .xox-cell') && !document.getElementById('game-stage').hidden);
  check(still, 'the table is still there for Sam (✕ never ends a game)');
  const atTable = await alex.evaluate(() => !!document.querySelector('#game-stage .xox-cell'));
  check(atTable, 'Alex is still at the table (the game stays mounted)');
  await alex.evaluate(() => document.getElementById('game-btn').click());
  check(!!(await until(async () => !(await stageHidden(alex)), 3000)), '🎮 brings the table back');

  // Closing / reloading the tab mid-game asks first.
  alex.on('dialog', onDialog);
  await alex.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await wait(800);
  check(asked, 'a reload in the middle of a game asks "are you sure?"');
  const stayed = await alex.evaluate(() => !!document.querySelector('#game-stage .xox-cell')).catch(() => false);
  check(stayed, 'saying "stay" keeps the game');

  // Leave and End ask first; Cancel keeps everything.
  await alex.evaluate(() => document.querySelector('#game-stage .game-leave').click());
  check(!!(await until(() => dialogShown(alex), 2000)), 'Leave table asks first while the game is on');
  await cancelDialog(alex);
  await wait(300);
  check(!(await stageHidden(alex)), 'Cancel: still at the table');
  await alex.evaluate(() => document.querySelector('#game-stage .game-end').click());
  check(!!(await until(() => dialogShown(alex), 2000)), 'End table asks first');
  await cancelDialog(alex);
  await wait(800);
  check(!(await stageHidden(sam)), 'Cancel: the table stays for everyone');

  // The hall's row says "End", never a ✕.
  await alex.evaluate(() => document.querySelector('#game-stage .game-hub-open').click());
  await wait(500);
  const rowClose = await alex.evaluate(() => [...document.querySelectorAll('#game-menu .hub-close')].map((b) => b.textContent.trim()));
  check(rowClose.length > 0 && rowClose.every((x) => x === 'End'), 'the hall\'s table row has "End", no ✕', JSON.stringify(rowClose));
  await alex.keyboard.press('Escape');

  // Finish the game (play it out), then a reload asks nothing.
  for (let i = 0; i < 6; i++) {
    for (const p of [alex, sam]) await move(p);
    await wait(500);
    const done = await alex.evaluate(() => document.querySelector('#game-stage .xox-board, #game-stage .board')?.classList.contains('done'));
    if (done) break;
  }
  const over = await alex.evaluate(() => !!document.querySelector('#game-stage .done'));
  check(over, 'the game is over');
  asked = false;
  await alex.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  await wait(1500);
  check(!asked, 'after the game, a reload asks nothing');

  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Game window harness passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
