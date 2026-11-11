// NG3 motion (owner's pick 10: 4): the game window slides in as it opens, a chess piece slides from its old square to
// the new one (and the real piece shows again after), and with "reduce motion" (the system setting) none of it plays.
//
//   npm run dev (or wrangler dev with the built site), then: node scripts/harness/motion/run.cjs [site]
const { chromium } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 6000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await wait(100);
  }
  return null;
}

async function run(browser, reduced) {
  const label = reduced ? 'reduced motion' : 'motion';
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  await page.goto(`${SITE}/`);
  await page.evaluate(() => {
    for (const [k, v] of Object.entries({ name: 'Alex', avatar: 'wizard', lang: 'en', 'opt:autoInvite': '0', tipsSeen: '1', 'classics:howSeen': '1' })) localStorage.setItem(k, v);
  });
  await page.goto(`${SITE}/r/mo${Math.random().toString(36).slice(2, 8)}#back`);
  await page.waitForFunction(() => !!document.querySelector('#game-btn'), null, { timeout: 15000 });
  await wait(2500);
  // Count the animations the window gets in the moment it opens.
  const opened = await page.evaluate(async () => {
    document.getElementById('game-btn').click();
    // The hall is a lazy chunk: wait for its tab and card (a slow runner needs more than a fixed pause).
    const find = async (sel) => { for (let i = 0; i < 100; i++) { const el = document.querySelector(sel); if (el) return el; await new Promise((r) => setTimeout(r, 50)); } return null; };
    (await find('#game-menu [data-tab="together"]'))?.click();
    await new Promise((r) => setTimeout(r, 150));
    const card = await find('#game-menu [data-kind="classics"]');
    if (!card) return -1;
    card.click();
    const stage = document.getElementById('game-stage');
    for (let i = 0; i < 20 && stage.hidden; i++) await new Promise((r) => setTimeout(r, 10));
    return stage.getAnimations().length;
  });
  check(reduced ? opened === 0 : opened > 0, `${label}: the game window ${reduced ? 'just appears' : 'slides in as it opens'}`, String(opened));
  await until(() => page.evaluate(() => { const b = document.querySelector('#game-stage .cl-box[data-board="chess"]'); return b && !b.disabled; }), 8000);
  await page.evaluate(() => document.querySelector('#game-stage .cl-box[data-board="chess"]').click());
  await until(() => page.evaluate(() => document.querySelectorAll('#game-stage .chess-cell.piece-X').length === 16), 6000);
  await page.evaluate(() => [...document.querySelectorAll('#game-stage .cl-bot-level')][0].click());
  await until(() => page.evaluate(() => document.querySelector('#game-stage #seat-1')?.classList.contains('bot')), 5000);
  // e2 → e4; watch for the sliding copy on the board until Stub answers.
  await page.evaluate(() => {
    window.__ghosts = 0;
    new MutationObserver((list) => {
      for (const m of list) for (const n of m.addedNodes) if (n.classList?.contains('move-ghost')) window.__ghosts++;
    }).observe(document.querySelector('#game-stage .chess-board'), { childList: true });
    const cells = document.querySelectorAll('#game-stage .chess-board .dama-cell');
    cells[52].click();
    setTimeout(() => cells[36].click(), 150);
  });
  const answered = await until(() => page.evaluate(() => document.querySelector('#game-stage .chess-cell.lit.piece-O') && /your turn/i.test(document.getElementById('xox-status')?.textContent ?? '')), 8000);
  check(!!answered, `${label}: e2–e4 and Stub's answer are played`);
  await wait(500);
  const after = await page.evaluate(() => ({
    ghosts: window.__ghosts,
    left: document.querySelectorAll('#game-stage .move-ghost').length,
    hidden: document.querySelectorAll('#game-stage .dama-cell.arriving').length,
    e4: document.querySelectorAll('#game-stage .chess-board .dama-cell')[36].classList.contains('piece-X'),
  }));
  check(reduced ? after.ghosts === 0 : after.ghosts >= 2, `${label}: ${reduced ? 'no piece slides' : 'both moves slide (my pawn and Stub’s answer)'}`, JSON.stringify(after));
  check(after.left === 0 && after.hidden === 0 && after.e4, `${label}: after the slide the real pieces show on their squares, no copy left`, JSON.stringify(after));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  await run(browser, false);
  await run(browser, true);
  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Motion harness passed');
  process.exit(failed ? 1 : 0);
})();
