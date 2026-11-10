// 🐞 Test Lab, 🎮 "A 🤖 friend sits at this table" (card LAB2): at each two-person table the pretend player joins and
// plays along once the person starts: Quiz (answers), Draw & Guess (its turn: draws; mine: guesses), Last Heart (acts on
// its turn), the Five Frames Duel (Ready, then words), Sea Battle (fleet, Ready, shots). "Leave" takes it away; at the
// Classics the command says to play Stub. Reads the table's own state frames.
//
//   npm run dev (a local lab server), then: node scripts/harness/lab-table-friend/run.cjs [site]   (LAB_LANG=tr)
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:5173';
const LANG = process.env.LAB_LANG === 'tr' ? 'tr' : 'en';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 15000) => {
  for (let i = 0; i < ms / 200; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await wait(200);
  }
  return null;
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript((l) => {
    localStorage.setItem('lang', l);
    for (const [k, v] of Object.entries({ name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', 'sea:howSeen': '1', 'classics:howSeen': '1', 'quiz:howSeen': '1', 'draw:howSeen': '1', 'poker:howSeen': '1', 'duel:howSeen': '1', 'snackBar:howSeen': '1' })) localStorage.setItem(k, v);
  }, LANG);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // The latest state each table sent to this tab.
  const last = {};
  page.on('websocket', (ws) => {
    const m = /\/api\/(quiz|draw|poker|duel|sea|games)\//.exec(ws.url());
    if (!m) return;
    ws.on('framereceived', (f) => {
      try {
        const msg = JSON.parse(String(f.payload));
        if (msg.t === 'state') last[m[1]] = msg;
      } catch {}
    });
  });
  await page.goto(`${SITE}/r/tf${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
  await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#game-btn'), null, { timeout: 20000 });
  await wait(2500);
  const run = (id, arg) => page.evaluate(([id, arg]) => window.__swmLab.run(id, arg).then((l) => ({ dir: l.dir, text: l.text })), [id, arg]);
  const open = async (kind) => {
    await run(`games.open.${kind}`);
    await until(() => page.evaluate(() => !!document.querySelector('#game-stage .game-stage-body > :not(.game-stage-loading)')), 10000);
    await until(async () => last[kind === 'classics' ? 'games' : kind], 10000);
    await wait(800);
  };
  /** Presses the table's main button (Start / Ready) the way a person would. */
  const press = (re) =>
    page.evaluate((src) => {
      const re = new RegExp(src, 'i');
      const b = [...document.querySelectorAll('#game-stage button')].find((x) => !x.disabled && x.offsetWidth && re.test(x.textContent));
      b?.click();
      return b?.textContent ?? null;
    }, re.source);
  const START = /start|başlat|oyunu başlat/;
  const READY = /^\s*(✓\s*)?(ready|hazır)/;

  // Classics: the command says to play Stub.
  await open('classics');
  const cl = await run('games.friend');
  check(cl.dir === 'error' && /Stub/.test(cl.text), 'Classics: the friend command points to Stub', cl.text);

  // Quiz: the friend joins; I start; it answers the first question.
  await open('quiz');
  const q = await run('games.friend');
  check(q.dir === 'lab' && /🤖/.test(q.text), 'Quiz: a 🤖 friend sits down', q.text);
  check(!!(await until(async () => last.quiz?.players?.length === 2)), 'Quiz: two players in the lobby', JSON.stringify(last.quiz?.players?.map((p) => p.name)));
  await press(START);
  const answered = await until(async () => last.quiz?.phase === 'question' && last.quiz.players.some((p) => /🤖/.test(p.name) && p.answered), 20000);
  check(!!answered, 'Quiz: the friend answers the question', JSON.stringify({ phase: last.quiz?.phase, p: last.quiz?.players?.map((p) => [p.name, p.answered]) }));
  // "Jump to the result card": every phase skipped until the game is over, the card shows.
  const toEnd = await run('quiz.toEnd');
  const over = await until(async () => last.quiz?.phase === 'over' && (await page.evaluate(() => { const l = document.querySelector('#game-stage .gr-layer'); return !!l && !l.hidden; })), 30000);
  check(toEnd.dir === 'lab' && !!over, 'Quiz: "jump to the result card" ends the game on the result card', `${toEnd.text} ${last.quiz?.phase}`);
  check((await run('games.friendLeave')).dir === 'lab' && !!(await until(async () => !last.quiz.players.some((p) => /🤖/.test(p.name) && p.online))), 'Quiz: "leave" takes the friend away');

  // Last Heart: the friend acts when it is its turn.
  await open('poker');
  await run('games.friend');
  await until(async () => last.poker?.players?.length === 2);
  await press(START);
  const acted = await until(async () => {
    const s = last.poker;
    if (!s || s.phase === 'lobby') return null;
    const bot = s.players.find((p) => /🤖/.test(p.name));
    if (s.toAct && s.toAct !== bot?.id) await press(/check|call|bekle|gör|öde/);
    return bot && (s.phase === 'flop' || s.phase === 'turn' || s.phase === 'river' || s.phase === 'showdown' || s.phase === 'over');
  }, 30000);
  check(!!acted, 'Last Heart: the friend plays its turns (the hand moves on to the flop)', last.poker?.phase);
  await run('games.friendLeave');

  // Duel: the friend presses Ready; I press Ready; it guesses words.
  await open('duel');
  await run('games.friend');
  const friendReady = await until(async () => last.duel?.players?.some((p) => p && /🤖/.test(p.name) && p.ready));
  check(!!friendReady, 'Duel: the friend sits and presses Ready');
  await press(READY);
  const guessed = await until(async () => last.duel?.phase === 'play' && last.duel.players.some((p) => p && /🤖/.test(p.name) && p.marks.length > 0), 30000);
  check(!!guessed, 'Duel: the race starts and the friend guesses a word', JSON.stringify({ phase: last.duel?.phase }));
  await run('games.friendLeave');

  // Sea Battle: the friend places a fleet and readies; I ready; it shoots on its turn.
  await open('sea');
  await run('games.friend');
  const seaReady = await until(async () => last.sea?.players?.some((p) => p && /🤖/.test(p.name) && p.ready));
  check(!!seaReady, 'Sea Battle: the friend places a fleet and presses Ready');
  await press(READY);
  const shot = await until(async () => {
    const s = last.sea;
    if (!s || s.phase !== 'play') return null;
    if (s.turn === s.seat) {
      // My turn: shoot the first free cell of their sea.
      await page.evaluate(() => document.querySelector('#game-stage .sea-theirs .sea-cell:not(.miss):not(.hit):not(:disabled)')?.click());
      await wait(300);
      await page.evaluate(() => document.querySelector('#game-stage .sea-theirs .sea-cell.aimed')?.click());
    }
    return s.seas[s.seat].shots.length > 0;
  }, 30000);
  check(!!shot, 'Sea Battle: the friend shoots at my sea on its turn', JSON.stringify({ phase: last.sea?.phase, turn: last.sea?.turn }));
  await run('games.friendLeave');

  // Draw & Guess: the friend draws on its turn or guesses on mine.
  await open('draw');
  await run('games.friend');
  await until(async () => last.draw?.players?.length === 2);
  await press(START);
  const drew = await until(async () => {
    const s = last.draw;
    if (!s) return null;
    // My turn to choose: the first word.
    if (s.phase === 'choose') await page.evaluate(() => document.querySelector('#game-stage .draw-choice, #game-stage .draw-choices button')?.click());
    return s.phase === 'draw' ? s : null;
  }, 25000);
  check(!!drew, 'Draw & Guess: the round gets to drawing with the friend at the table', last.draw?.phase);
  await run('games.friendLeave');

  // Snack Bar: one level before the next milestone, ×1 reaches it (and plays the popcorn's own sound).
  await run('games.open.snack');
  await until(() => page.evaluate(() => !!document.querySelector('#game-stage .sb')), 8000);
  await wait(600);
  let ms = await run('snackBar.milestone');
  for (let i = 0; i < 10 && ms.dir !== 'lab'; i++) {
    await wait(300);
    ms = await run('snackBar.milestone');
  }
  const target = Number(/→ (\d+)/.exec(ms.text)?.[1]);
  await page.evaluate(() => document.querySelector('#game-stage .sb-mode[data-mode="1"]')?.click());
  await page.click('#game-stage .sb-row[data-stand="popcorn"] .sb-price');
  await wait(400);
  const level = await page.evaluate(() => JSON.parse(localStorage.getItem('snackBar')).levels.popcorn);
  check(ms.dir === 'lab' && level === target, 'Snack Bar: "one level before the next milestone", then ×1 reaches it', `${ms.text} → ${level}`);

  check(errors.length === 0, 'no page error', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Table friend harness passed');
  process.exit(fails ? 1 : 0);
})();
