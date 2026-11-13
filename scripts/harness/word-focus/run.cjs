// BUG6 (owner): a word game takes the keyboard as it opens: letters typed without a click go into the guess (Five
// Frames, and the Five Frames Duel when the race starts). A click in the chat box sends the keys there (the word does
// not change, no room shortcut fires); Esc in the chat or a click on the game brings them back. After the "How to play"
// cards close, the keys go to the word too. Turkish letters as well.
//
//   npm run dev, then: node scripts/harness/word-focus/run.cjs [site]
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:5173';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 10000) => {
  for (let i = 0; i < ms / 150; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await wait(150);
  }
  return null;
};

async function room(browser, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript((more) => {
    for (const [k, v] of Object.entries({ name: 'Robin', avatar: 'wizard', lang: 'en', 'opt:autoInvite': '0', tipsSeen: '1', 'duel:howSeen': '1', ...more })) localStorage.setItem(k, v);
  }, extra);
  const page = await ctx.newPage();
  await page.goto(`${SITE}/r/wf${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
  await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#game-btn'), null, { timeout: 20000 });
  await wait(2500);
  return { ctx, page, run: (id) => page.evaluate((i) => window.__swmLab.run(i).then((l) => ({ dir: l.dir, text: l.text })), id) };
}
/** The letters in the row being typed (Five Frames / the Duel board). */
const typedRow = (page) =>
  page.evaluate(() => {
    const row = document.querySelector('#game-stage .ff-board .ff-row.current') ?? document.querySelector('#game-stage .ff-board .ff-row:not(.done)');
    return row ? [...row.querySelectorAll('.ff-cell')].map((c) => c.textContent.trim()).join('') : null;
  });

/** The room's state the shortcuts T (cinema), F / Space (fullscreen, play) would change. */
const roomKeysState = (page) =>
  page.evaluate(() => ({ cinema: document.documentElement.classList.contains('cinema-on'), full: !!document.fullscreenElement || !!document.querySelector('.fake-fs') }));

(async () => {
  const browser = await chromium.launch();

  // ---- Five Frames: open, type without a click ----
  const a = await room(browser, { 'fiveFrames:howSeen': '1' });
  await a.run('games.open.word');
  await until(() => a.page.evaluate(() => !!document.querySelector('#game-stage .ff-board .ff-row')));
  await until(() => a.page.evaluate(() => document.activeElement?.classList.contains('ff-board')), 5000);
  await a.page.keyboard.type('cra');
  await wait(200);
  check(/^CRA/i.test((await typedRow(a.page)) ?? ''), 'Five Frames: letters typed right after opening go into the word', await typedRow(a.page));
  // The chat box takes the keys; the word and the room stay as they are.
  const before = await typedRow(a.page);
  await a.page.evaluate(() => document.getElementById('chat-input').focus());
  await a.page.keyboard.type('hi m');
  await wait(200);
  const chat = await a.page.evaluate(() => document.getElementById('chat-input').value);
  check(chat === 'hi m' && (await typedRow(a.page)) === before, 'a click in the chat box sends the keys there (the word does not change)', `${chat} / ${await typedRow(a.page)}`);
  // Esc in the chat: back to the word.
  await a.page.keyboard.press('Escape');
  await wait(150);
  await a.page.keyboard.type('n');
  await wait(200);
  check(/^CRAN/i.test((await typedRow(a.page)) ?? ''), 'Esc in the chat gives the keys back to the word', await typedRow(a.page));
  // A click on the game (not the board itself) brings them back too.
  await a.page.evaluate(() => document.getElementById('chat-input').focus());
  await a.page.click('#game-stage .ff-head, #game-stage .ff-tray');
  await wait(150);
  await a.page.keyboard.type('e');
  await wait(200);
  check(/^CRANE/i.test((await typedRow(a.page)) ?? ''), 'a click on the game gives the keys back', await typedRow(a.page));
  const status = await a.page.evaluate(() => JSON.stringify(window.__swmLab.status?.() ?? ''));
  check(/the word/.test(status), 'the lab shows where the keyboard goes', status.slice(0, 200));
  await a.ctx.close();

  // ---- Owner bug (0.9.97.126): T, M, F and Space on a word game's board are letters, not room shortcuts ----
  const d = await room(browser, { 'fiveFrames:howSeen': '1' });
  await d.run('games.open.word');
  await until(() => d.page.evaluate(() => document.activeElement?.classList.contains('ff-board')), 8000);
  for (const key of ['t', 'm', 'f', 'Space']) await d.page.keyboard.press(key);
  await wait(300);
  const dState = await roomKeysState(d.page);
  check(!dState.cinema && !dState.full, 'Five Frames: T / M / F / Space on the board turn on no cinema mode and no fullscreen', JSON.stringify(dState));
  check(/^TMF/i.test((await typedRow(d.page)) ?? ''), 'Five Frames: T, M and F land in the word', await typedRow(d.page));
  for (let i = 0; i < 3; i++) await d.page.keyboard.press('Backspace');
  const lab = await d.run('fiveFrames.keys');
  check(/\bok:/.test(lab.text ?? '') && /"TMF"/.test(lab.text ?? ''), 'the Test Lab command "room shortcuts stay quiet on the board" passes', lab.text);
  await d.ctx.close();

  // ---- Five Frames in Turkish, first open with the "How to play" cards ----
  const b = await room(browser, { lang: 'tr', 'fiveFrames:lang': 'tr' });
  await b.run('games.open.word');
  const cards = await until(() => b.page.evaluate(() => { const h = document.querySelector('#game-stage .htp'); return h && !h.hidden; }), 8000);
  if (cards) await b.page.evaluate(() => document.querySelector('#game-stage .htp-skip, #game-stage .htp [data-skip], #game-stage .htp button.ghost')?.click());
  await until(() => b.page.evaluate(() => document.activeElement?.classList.contains('ff-board')), 5000);
  // The word's own language (Five Frames keeps it apart from the site's): the TR button, with the mouse.
  if (await b.page.$('#game-stage .ff-lang[data-lang="tr"]')) await b.page.click('#game-stage .ff-lang[data-lang="tr"]');
  await until(() => b.page.evaluate(() => document.querySelector('#game-stage .ff-lang.on')?.dataset.lang === 'tr' && document.querySelectorAll('#game-stage .ff-tray .ff-key').length > 30 && document.activeElement?.classList.contains('ff-board')), 8000);
  await wait(500);
  // A Turkish keyboard's key presses, sent to whatever has the focus (Playwright knows only the US layout's keys).
  await b.page.evaluate(() => {
    for (const key of 'ğüş') document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
  await wait(200);
  const tr = (await typedRow(b.page)) ?? '';
  check(/^(ĞÜŞ|ğüş)/i.test(tr) || /ĞÜŞ/.test(tr), `Turkish letters go into the word right after the "How to play" cards (${cards ? 'cards shown' : 'no cards'})`, tr);
  await b.ctx.close();

  // ---- The Duel: the race starts, the keys are the word's ----
  const c = await room(browser);
  await c.run('games.open.duel');
  await until(() => c.page.evaluate(() => !!document.querySelector('#game-stage .duel')));
  await wait(1000);
  await c.run('games.friend');
  await until(() => c.page.evaluate(() => [...document.querySelectorAll('#game-stage .duel-lobby li, #game-stage .duel-face')].some((x) => /🤖/.test(x.textContent))), 8000);
  // Ready with the mouse (the way a person does), then type without another click.
  await c.page.evaluate(() => [...document.querySelectorAll('#game-stage button')].find((x) => !x.disabled && x.offsetWidth && /ready/i.test(x.textContent))?.click());
  await until(() => c.page.evaluate(() => document.querySelector('#game-stage .duel')?.dataset.phase === 'play'), 10000);
  await wait(400);
  await c.page.keyboard.type('sla');
  await wait(200);
  check(/^SLA/i.test((await typedRow(c.page)) ?? ''), 'Duel: when the race starts the letters go into the word without a click', await typedRow(c.page));
  for (let i = 0; i < 3; i++) await c.page.keyboard.press('Backspace');
  for (const key of ['t', 'm', 'f', 'Space']) await c.page.keyboard.press(key);
  await wait(300);
  const cState = await roomKeysState(c.page);
  check(!cState.cinema && !cState.full && /^TMF/i.test((await typedRow(c.page)) ?? ''), 'Duel: T / M / F / Space are letters (no cinema mode, no fullscreen)', `${JSON.stringify(cState)} ${await typedRow(c.page)}`);
  await c.ctx.close();

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Word-game keyboard harness passed');
  process.exit(fails ? 1 : 0);
})();
