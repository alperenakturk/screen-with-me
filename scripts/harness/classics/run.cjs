// 🎲 Classics in the room (P6–P8): the hall offers one Classics card (no separate XOX / Four in a Row cards); it opens the
// game shelf; Dama from the shelf; alone, "Play against Glowbeam" (easy) seats the bot; a dama move by click (a man,
// then a highlighted square); Glowbeam answers and referees; screenshots of the shelf and the board.
//
//   npm run dev, then: node scripts/harness/classics/run.cjs [site]
const { chromium } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
const room = 'cl' + Math.random().toString(36).slice(2, 8);
let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 6000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await wait(150);
  }
  return null;
}

(async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  await page.goto(`${SITE}/`);
  await page.evaluate(() => {
    for (const [k, v] of Object.entries({ name: 'Alex', avatar: 'wizard', lang: 'en', 'opt:autoInvite': '0', tipsSeen: '1' })) localStorage.setItem(k, v);
  });
  await page.goto(`${SITE}/r/${room}#back`);
  await page.waitForFunction(() => !!document.querySelector('#game-btn'), null, { timeout: 15000 });
  // Past the intro animation.
  await wait(3200);

  const hall = await page.evaluate(async () => {
    document.getElementById('game-btn').click();
    await new Promise((r) => setTimeout(r, 400));
    document.querySelector('#game-menu [data-tab="together"]')?.click();
    await new Promise((r) => setTimeout(r, 200));
    const kinds = [...document.querySelectorAll('#game-menu .hub-card[data-kind]')].map((b) => b.dataset.kind);
    return kinds;
  });
  check(hall.includes('classics') && !hall.includes('xox') && !hall.includes('four'), 'the hall has one Classics card, no separate XOX / Four in a Row', JSON.stringify(hall));
  await page.evaluate(() => document.querySelector('#game-menu [data-kind="classics"]').click());
  const shelf = await until(() => page.evaluate(() => { const s = document.querySelector('#game-stage .cl-picker'); return s && !s.hidden ? [...s.querySelectorAll('.cl-box')].map((b) => `${b.dataset.board}:${b.disabled}`) : null; }), 8000);
  check(!!shelf && shelf.length === 5 && shelf.every((b) => b.endsWith(':false')) && shelf.includes('chess:false') && shelf.includes('backgammon:false'), 'the picker: XOX, Four in a Row, Dama, Chess and Backgammon, all to play', JSON.stringify(shelf));
  // CL2: the picker comes first, alone: no board (no XOX table) behind it, and the window has the picker's size.
  const alone = await page.evaluate(() => {
    const table = document.querySelector('#game-stage .mt-table');
    const cells = [...document.querySelectorAll('#game-stage .xox-cell, #game-stage .dama-cell')].filter((c) => c.getBoundingClientRect().width > 0).length;
    return { tableHidden: !!table?.hidden, cells, board: document.querySelector('#game-stage .xox-page')?.dataset.board, cards: document.querySelectorAll('#game-stage .cl-card .cl-card-art svg').length };
  });
  check(alone.tableHidden && alone.cells === 0 && alone.board === 'picker' && alone.cards === 5, 'the picker shows alone: five cards with covers, no board behind it', JSON.stringify(alone));
  await wait(400);
  await page.screenshot({ path: __dirname + '/classics-shelf.png' });

  await page.evaluate(() => document.querySelector('#game-stage .cl-box[data-board="dama"]').click());
  check(!!(await until(() => page.evaluate(() => document.querySelectorAll('#game-stage .dama-cell.mark-X').length === 16), 6000)), 'Dama is on the table: 16 white men');
  const botOffer = await page.evaluate(() => { const b = document.querySelector('#game-stage .cl-bot'); return b && !b.hidden ? b.textContent : null; });
  check(!!botOffer && /Glowbeam/.test(botOffer), 'alone at the table: "Play against Glowbeam" is offered', String(botOffer));
  await page.evaluate(() => [...document.querySelectorAll('#game-stage .cl-bot-level')][0].click());
  check(!!(await until(() => page.evaluate(() => document.querySelector('#game-stage #seat-1')?.classList.contains('bot')), 5000)), 'Glowbeam takes the other seat');

  // A move by click: a movable man, then a highlighted square.
  const moved = await page.evaluate(async () => {
    const man = document.querySelector('#game-stage .dama-cell.movable');
    man?.click();
    await new Promise((r) => setTimeout(r, 150));
    const target = document.querySelector('#game-stage .dama-cell.target');
    const shown = !!target;
    target?.click();
    return shown;
  });
  check(moved, 'a man shows where it can go; a click moves it');
  const answered = await until(() => page.evaluate(() => /your turn/i.test(document.getElementById('xox-status')?.textContent ?? '') && document.querySelectorAll('#game-stage .dama-cell.mark-O').length === 16 && document.querySelector('#game-stage .dama-cell.placed.mark-O')), 6000);
  check(!!answered, 'Glowbeam answers; the referee says it is my turn again');
  check(await page.evaluate(() => !!document.querySelector('#game-stage .cl-ref-mascot svg')), 'Glowbeam stands beside the status line as the referee');
  // Mid-game "Change game" (in the window's head) asks first (CL2): Cancel keeps the game, "End and change" opens the
  // picker and the pick ends that game.
  const asked = await page.evaluate(async () => {
    const b = document.querySelector('#game-stage .game-stage-head #cl-shelf-open');
    b?.click();
    await new Promise((r) => setTimeout(r, 300));
    const dialog = document.querySelector('.dialog-backdrop:not([hidden]) .confirm-dialog');
    const cancel = dialog?.querySelector('.confirm-actions .btn:not(.primary)');
    cancel?.click();
    await new Promise((r) => setTimeout(r, 200));
    return { inHead: !!b, enabled: !!b && !b.disabled, asked: !!dialog, picker: !document.querySelector('#game-stage .cl-picker')?.hidden };
  });
  check(asked.inHead && asked.enabled && asked.asked && !asked.picker, 'mid-game "Change game" in the head asks first; Cancel keeps the board', JSON.stringify(asked));
  const changed = await page.evaluate(async () => {
    document.querySelector('#game-stage .game-stage-head #cl-shelf-open')?.click();
    await new Promise((r) => setTimeout(r, 300));
    document.querySelector('.dialog-backdrop:not([hidden]) .confirm-dialog .btn.primary')?.click();
    await new Promise((r) => setTimeout(r, 300));
    const picker = !document.querySelector('#game-stage .cl-picker')?.hidden;
    const enabled = [...document.querySelectorAll('#game-stage .cl-box')].filter((b) => !b.disabled).length;
    document.querySelector('#game-stage .cl-box[data-board="chess"]')?.click();
    return { picker, enabled };
  });
  const chessNow = await until(() => page.evaluate(() => document.querySelector('#game-stage .xox-page')?.dataset.board === 'chess' && document.querySelectorAll('#game-stage .chess-cell').length === 64), 6000);
  check(changed.picker && changed.enabled === 5 && !!chessNow, '"End and change" opens the picker with every game; picking chess ends the dama game', JSON.stringify(changed));
  await page.evaluate(() => {
    document.querySelector('#game-stage #cl-shelf-open')?.click();
  });
  await wait(300);
  await page.evaluate(() => document.querySelector('#game-stage .cl-box[data-board="dama"]')?.click());
  await until(() => page.evaluate(() => document.querySelectorAll('#game-stage .dama-cell.mark-X').length === 16), 6000);
  await wait(400);
  await page.screenshot({ path: __dirname + '/classics-dama.png' });
  const fit = await page.evaluate(() => { const b = document.querySelector('#game-stage .game-stage-body'); return b.scrollHeight <= b.clientHeight + 1 && b.scrollWidth <= b.clientWidth + 1; });
  check(fit, 'the board fits the game window without scrollbars');

  // Chess (P7): a fresh room's Classics table, chess from the shelf.
  await page.goto(`${SITE}/r/${room}c#back`);
  await page.waitForFunction(() => !!document.querySelector('#game-btn'), null, { timeout: 15000 });
  await wait(3200);
  await page.evaluate(async () => {
    document.getElementById('game-btn').click();
    await new Promise((r) => setTimeout(r, 400));
    document.querySelector('#game-menu [data-tab="together"]')?.click();
    await new Promise((r) => setTimeout(r, 200));
    document.querySelector('#game-menu [data-kind="classics"]').click();
  });
  const chessOpen = await until(() => page.evaluate(() => { const b = document.querySelector('#game-stage .cl-box[data-board="chess"]'); return b && !b.disabled; }), 5000);
  check(!!chessOpen, 'the shelf offers chess');
  await page.evaluate(() => document.querySelector('#game-stage .cl-box[data-board="chess"]').click());
  const pieces = await until(() => page.evaluate(() => { const c = document.querySelectorAll('#game-stage .chess-board .dama-cell'); return c.length === 64 && document.querySelectorAll('#game-stage .chess-cell.piece-X').length === 16 ? [...c].slice(0, 8).map((x) => x.textContent.replace('\uFE0E', '')).join('') : null; }), 6000);
  check(pieces === '♜♞♝♛♚♝♞♜', 'chess is on the table: 16 white pieces, the black back row in order', String(pieces));
  await page.evaluate(() => [...document.querySelectorAll('#game-stage .cl-bot-level')][1].click());
  check(!!(await until(() => page.evaluate(() => document.querySelector('#game-stage #seat-1')?.classList.contains('bot')), 5000)), 'Glowbeam (medium) sits down for chess');
  // e2 → e4 by two clicks: the pawn lights e3 and e4.
  const targets = await page.evaluate(async () => {
    const cells = document.querySelectorAll('#game-stage .chess-board .dama-cell');
    cells[52].click();
    await new Promise((r) => setTimeout(r, 150));
    const lit = [...cells].flatMap((c, i) => (c.classList.contains('target') ? [i] : []));
    cells[36].click();
    return lit;
  });
  check(JSON.stringify(targets) === '[36,44]', 'a pawn shows its two first steps (e3, e4)', JSON.stringify(targets));
  const replied = await until(() => page.evaluate(() => document.querySelectorAll('#game-stage .chess-cell.lit').length === 2 && document.querySelector('#game-stage .chess-cell.lit.piece-O') && /your turn/i.test(document.getElementById('xox-status')?.textContent ?? '')), 8000);
  check(!!replied, "Glowbeam answers with a black move; its squares are lit and it's my turn");
  await page.screenshot({ path: __dirname + '/classics-chess.png' });
  const chessFit = await page.evaluate(() => { const b = document.querySelector('#game-stage .game-stage-body'); return b.scrollHeight <= b.clientHeight + 1 && b.scrollWidth <= b.clientWidth + 1; });
  check(chessFit, 'the chess board fits the game window without scrollbars');
  const promoHidden = await page.evaluate(() => document.querySelector('#game-stage .cl-promo')?.hidden === true);
  check(promoHidden, 'the promotion chooser stays hidden until a pawn reaches the last row');

  // Backgammon (P8): another fresh room, backgammon from the shelf, Glowbeam (medium); the server rolls the dice.
  await page.goto(`${SITE}/r/${room}b#back`);
  await page.waitForFunction(() => !!document.querySelector('#game-btn'), null, { timeout: 15000 });
  await wait(3200);
  await page.evaluate(async () => {
    document.getElementById('game-btn').click();
    await new Promise((r) => setTimeout(r, 400));
    document.querySelector('#game-menu [data-tab="together"]')?.click();
    await new Promise((r) => setTimeout(r, 200));
    document.querySelector('#game-menu [data-kind="classics"]').click();
  });
  await until(() => page.evaluate(() => { const b = document.querySelector('#game-stage .cl-box[data-board="backgammon"]'); return b && !b.disabled; }), 5000);
  await page.evaluate(() => document.querySelector('#game-stage .cl-box[data-board="backgammon"]').click());
  const start = await until(() => page.evaluate(() => { const p = document.querySelectorAll('#game-stage .bg-board .bg-point'); return p.length === 24 ? document.querySelectorAll('#game-stage .bg-board .bg-checker.piece-X').length : null; }), 6000);
  check(start === 15, 'backgammon is on the table: 24 points, 15 white checkers shown', String(start));
  await page.evaluate(() => [...document.querySelectorAll('#game-stage .cl-bot-level')][1].click());
  await until(() => page.evaluate(() => document.querySelector('#game-stage #seat-1')?.classList.contains('bot')), 5000);
  const rollShown = await until(() => page.evaluate(() => { const r = document.getElementById('bg-roll'); return r && !r.hidden; }), 5000);
  check(!!rollShown, 'my turn: a Roll button under the board');
  await page.evaluate(() => document.getElementById('bg-roll').click());
  const rolled = await until(() => page.evaluate(() => document.querySelectorAll('#game-stage .bg-die').length >= 2 && document.querySelector('#game-stage .bg-point.movable, #game-stage .bg-bar.movable') ? document.querySelectorAll('#game-stage .bg-die').length : null), 6000);
  check(!!rolled, 'the server rolls: dice show, my checkers that can move light up', String(rolled));
  await page.screenshot({ path: __dirname + '/classics-backgammon.png' });
  // Play my whole turn by clicks (a movable point, then its first target), then Glowbeam takes its turn.
  for (let i = 0; i < 4; i++) {
    const stepped = await page.evaluate(async () => {
      const from = document.querySelector('#game-stage .bg-point.movable, #game-stage .bg-bar.movable');
      if (!from) return false;
      from.click();
      await new Promise((r) => setTimeout(r, 120));
      const to = document.querySelector('#game-stage .bg-point.target, #game-stage .bg-off.target');
      to?.click();
      await new Promise((r) => setTimeout(r, 400));
      return !!to;
    });
    if (!stepped) break;
  }
  const back = await until(() => page.evaluate(() => { const r = document.getElementById('bg-roll'); return r && !r.hidden && document.querySelectorAll('#game-stage .bg-board .bg-checker.piece-O').length >= 13; }), 15000);
  check(!!back, 'Glowbeam rolls and plays its turn; then the Roll button is mine again');
  const bgFit = await page.evaluate(() => { const b = document.querySelector('#game-stage .game-stage-body'); return b.scrollHeight <= b.clientHeight + 1 && b.scrollWidth <= b.clientWidth + 1; });
  check(bgFit, 'the backgammon board fits the game window without scrollbars');

  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Classics harness passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
