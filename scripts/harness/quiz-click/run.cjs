// 🎮 QZ2: a Quiz answer registers on the first press. The page's player presses an option while another player's
// answer makes the table send a new state (before 0.9.97.142 that rebuilt the buttons under the press, and the click
// never came); the press still counts once. Then the keyboard (Enter) answers the next question.
//
//   npm run dev (a local lab server), then: node scripts/harness/quiz-click/run.cjs [site]
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:5173';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 15000) => {
  for (let i = 0; i < ms / 100; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await wait(100);
  }
  return null;
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript(() => {
    for (const [k, v] of Object.entries({ lang: 'en', name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', 'quiz:howSeen': '1' })) localStorage.setItem(k, v);
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  let last = null;
  let quizUrl = null;
  const sent = [];
  page.on('websocket', (ws) => {
    if (!/\/api\/quiz\//.test(ws.url())) return;
    quizUrl = ws.url();
    ws.on('framereceived', (f) => {
      try {
        const m = JSON.parse(String(f.payload));
        if (m.t === 'state') last = m;
      } catch {}
    });
    ws.on('framesent', (f) => {
      try {
        const m = JSON.parse(String(f.payload));
        if (m.t === 'answer') sent.push(m);
      } catch {}
    });
  });
  await page.goto(`${SITE}/r/qc${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
  await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#game-btn'), null, { timeout: 20000 });
  await wait(2000);
  await page.evaluate(() => window.__swmLab.run('games.open.quiz'));
  check(!!(await until(async () => last && quizUrl)), 'the Quiz table opens');

  // Two more players over plain sockets (Node's WebSocket): Sam answers on command, Alex never does.
  const others = {};
  for (const name of ['Sam', 'Alex']) {
    const ws = new WebSocket(quizUrl);
    others[name] = { ws, state: null };
    ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, name, avatar: 'fox', lang: 'en' })));
    ws.addEventListener('message', (e) => {
      const m = JSON.parse(String(e.data));
      if (m.t === 'state') others[name].state = m;
    });
  }
  check(!!(await until(async () => last.players.filter((p) => p.online).length === 3)), 'three players at the table');
  await page.evaluate(() => [...document.querySelectorAll('#game-stage button')].find((b) => /start/i.test(b.textContent) && !b.disabled)?.click());
  check(!!(await until(async () => last.phase === 'question' && last.n === 1 && (last.options?.length ?? 0) >= 2)), 'question 1 is asked');
  await wait(700);

  // 1. Press (mouse down) on option A; Sam answers while the button is held; then release.
  const box = await page.locator('#game-stage .quiz-option').first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const before = last;
  others.Sam.ws.send(JSON.stringify({ t: 'answer', n: 1, pick: 1 }));
  await until(async () => last !== before && last.players.some((p) => p.name === 'Sam' && p.answered), 5000);
  await wait(150);
  await page.mouse.up();
  await wait(400);
  check(sent.filter((m) => m.n === 1).length === 1, 'one press sends exactly one answer while states stream in', JSON.stringify(sent));
  check(await page.evaluate(() => document.querySelector('#game-stage .quiz-option')?.classList.contains('picked')), 'the pressed option shows as picked');
  check(!!(await until(async () => last.players.find((p) => p.name === 'Robin')?.answered, 3000)), 'the table has my answer');

  // 2. Next question: the keyboard answers (focus + Enter), the focus ring stays.
  await page.evaluate(() => window.__swmLab.run('quiz.skip'));
  check(!!(await until(async () => last.phase === 'question' && last.n === 2, 15000)), 'question 2 is asked');
  await wait(700);
  // Reach option B by Tab, as a keyboard user would (from option A, focused first).
  await page.locator('#game-stage .quiz-option').first().focus();
  await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
  await page.keyboard.press('Enter');
  await wait(400);
  check(sent.filter((m) => m.n === 2).length === 1 && sent.find((m) => m.n === 2).pick === 1, 'Enter answers the focused option once', JSON.stringify(sent));
  check(ring !== 'none', 'the focused option keeps a visible focus ring', ring);

  check(errors.length === 0, 'no page errors', errors.join(' | '));
  for (const o of Object.values(others)) o.ws.close();
  await browser.close();
  console.log(fails ? `${fails} failed` : 'all ok');
  process.exit(fails ? 1 : 0);
})();
