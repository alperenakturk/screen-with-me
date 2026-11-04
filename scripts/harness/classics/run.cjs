// 🎲 Classics in the room (P6): the hall offers one Classics card (no separate XOX / Four in a Row cards); it opens the
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
  const shelf = await until(() => page.evaluate(() => { const s = document.querySelector('#game-stage .cl-shelf'); return s && !s.hidden ? [...s.querySelectorAll('.cl-box')].map((b) => `${b.dataset.board}:${b.disabled}`) : null; }), 8000);
  check(!!shelf && shelf.length === 5 && shelf.includes('dama:false') && shelf.includes('chess:false') && shelf.includes('tavla:true'), 'the game shelf: XOX, Four in a Row, Dama, Chess to play; backgammon "soon"', JSON.stringify(shelf));
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
  const locked = await page.evaluate(() => { document.querySelector('#cl-shelf-open')?.click(); return [...document.querySelectorAll('#game-stage .cl-box')].filter((b) => !b.disabled).map((b) => b.dataset.board); });
  check(JSON.stringify(locked) === '["dama"]', 'mid-game the shelf only lets you go back to this board', JSON.stringify(locked));
  await page.evaluate(() => document.querySelector('#game-stage .cl-box[data-board="dama"]').click());
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

  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Classics harness passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
