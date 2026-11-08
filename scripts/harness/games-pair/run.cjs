// Two people at every table (card BH13-G, Game Studio): Alex opens a table, Sam joins from the invite card. Every Classics
// board (XOX, Four in a Row, dama, chess, backgammon, reversi), Sea Battle and Last Heart are played a few turns between
// the two; then Sam reloads mid-game (he is back in his seat with the same board / fleet / cards), and Sam's network
// drops for 8 s (the browser goes offline and back): the table carries on and both still see each other's moves. Quiz
// and Draw & Guess get the same drop. No page errors anywhere.
//
//   npm run dev (its server has the lab flag), then: node scripts/harness/games-pair/run.cjs [site]
//   BOARDS=dama,chess limits the Classics boards; TABLES=sea,poker,quiz,draw the other tables.
const { chromium } = require('playwright');
const path = require('path');

const SITE = process.argv[2] || 'http://localhost:5173';
const ALL_BOARDS = ['xox', 'four', 'dama', 'chess', 'backgammon', 'reversi'];
const BOARDS = process.env.BOARDS ? process.env.BOARDS.split(',') : ALL_BOARDS;
const TABLES = process.env.TABLES ? process.env.TABLES.split(',') : ['sea', 'poker', 'quiz', 'draw'];
const DROP_MS = 8000;
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

async function person(browser, room, name, avatar) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript(([name, avatar]) => {
    for (const [k, v] of Object.entries({ lang: 'en', name, avatar, 'opt:autoInvite': '0', tipsSeen: '1', 'opt:leaveWarn': '1' })) localStorage.setItem(k, v);
    for (const k of ['sea:howSeen', 'quiz:howSeen', 'draw:howSeen', 'poker:howSeen', 'classics:xox:howSeen', 'classics:four:howSeen', 'classics:dama:howSeen', 'classics:chess:howSeen', 'classics:backgammon:howSeen', 'classics:reversi:howSeen']) localStorage.setItem(k, '1');
  }, [name, avatar]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('dialog', (d) => d.accept().catch(() => {}));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${SITE}/r/${room}?debug=1#back`);
  await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#game-btn'), null, { timeout: 20000 });
  await wait(1500);
  return { ctx, page, errors, name };
}
const run = (page, id) => page.evaluate((id) => window.__swmLab.run(id).then((l) => l.text), id);

/** Sam presses Join on Alex's invite card. */
async function join(sam) {
  const card = await until(() => sam.page.evaluate(() => !!document.querySelector('#game-invite .btn.primary')));
  await sam.page.evaluate(() => document.querySelector('#game-invite .btn.primary')?.click());
  return !!card;
}

/** After a reload the table reopens by itself, or the invite / 🎮 brings it back. */
async function backAtTable(p, sel) {
  await p.page.waitForFunction(() => !!document.querySelector('#game-btn'), null, { timeout: 20000 }).catch(() => {});
  let back = await until(() => p.page.evaluate((sel) => !document.getElementById('game-stage')?.hidden && !!document.querySelector(`#game-stage ${sel}`), sel), 8000);
  if (!back) {
    await p.page.evaluate(() => (document.querySelector('#game-invite .btn.primary') ?? document.getElementById('game-btn'))?.click());
    back = await until(() => p.page.evaluate((sel) => !!document.querySelector(`#game-stage ${sel}`), sel), 8000);
  }
  return !!back;
}

/** The network drops for `ms` and comes back (the page stays open). */
async function drop(p, ms = DROP_MS) {
  await p.ctx.setOffline(true);
  await wait(ms);
  await p.ctx.setOffline(false);
}

// ---- Classics ----
const boardSig = (page) =>
  page.evaluate(() => {
    const b = document.querySelector('#game-stage #xox-board');
    if (!b) return null;
    // A cell's name says what is on it (backgammon's checkers are empty discs, only the name counts them).
    return [...b.querySelectorAll('.xox-cell, .dama-cell, .four-cell, .bg-point, .bg-bar, .bg-off')].map((c) => `${c.className.replace(/\b(placed|movable|picked|target|last|flip|from)\b/g, '').replace(/\s+/g, ' ').trim()}|${c.getAttribute('aria-label') ?? ''}|${c.textContent.trim()}`).join(';');
  });
/** A move by whoever may: a free cell, a column, or a movable piece and its first target (backgammon rolls first). */
function move(page, board) {
  return page.evaluate(async (board) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const q = (s) => document.querySelector(`#game-stage ${s}`);
    if (board === 'reversi') {
      const c = q('.rv-cell.target:not(:disabled)');
      c?.click();
      return !!c;
    }
    if (board === 'xox' || board === 'four') {
      const c = q('.xox-cell:not([class*="mark-"]):not(:disabled), .four-cell:not(:disabled)');
      c?.click();
      return !!c;
    }
    if (board === 'backgammon') {
      const roll = q('#bg-roll:not([hidden]):not(:disabled)');
      if (roll) {
        roll.click();
        await sleep(900);
      }
    }
    for (const from of document.querySelectorAll('#game-stage .movable')) {
      from.click();
      await sleep(150);
      const to = q('.target');
      if (to) {
        to.click();
        return true;
      }
    }
    // Chess promotion chooser, if a pawn reached the last rank.
    const promo = q('.cl-promo button');
    promo?.click();
    return !!promo;
  }, board);
}
/** One ply by whichever of the two has the turn; true when one of them moved. */
async function ply(alex, sam, board) {
  for (let i = 0; i < 20; i++) {
    for (const p of [alex, sam]) if (await move(p.page, board)) return true;
    await wait(300);
  }
  return false;
}

async function classics(browser, board) {
  const room = 'gp' + Math.random().toString(36).slice(2, 8);
  const alex = await person(browser, room, 'Alex', 'wizard');
  const sam = await person(browser, room, 'Sam', 'pirate');
  await run(alex.page, 'games.open.classics');
  await until(() => alex.page.evaluate(() => !!document.querySelector('#game-stage #cl-shelf-open, #game-stage .cl-picker')));
  if (!(await alex.page.evaluate((b) => !!document.querySelector(`#game-stage .cl-box[data-board="${b}"].on`), board))) {
    if (!(await alex.page.evaluate(() => !!document.querySelector('#game-stage .cl-picker:not([hidden]) .cl-box')))) {
      await alex.page.evaluate(() => document.querySelector('#cl-shelf-open')?.click());
      await wait(300);
    }
    await alex.page.evaluate((b) => document.querySelector(`#game-stage .cl-box[data-board="${b}"]`)?.click(), board);
  }
  await until(() => alex.page.evaluate((b) => document.querySelector('#game-stage .xox-page')?.dataset.board === b, board));
  check(await join(sam), `${board}: Sam gets the invite card`);
  const seated = await until(() => alex.page.evaluate(() => /Sam/.test(document.querySelector('#game-stage .xox-page')?.textContent ?? '')));
  check(!!seated, `${board}: Sam takes the other seat`);
  const onSam = await until(() => sam.page.evaluate((b) => document.querySelector('#game-stage .xox-page')?.dataset.board === b && !!document.querySelector('#game-stage #xox-board'), board));
  check(!!onSam, `${board}: Sam sees the same board`);

  let plies = 0;
  for (let i = 0; i < 4; i++) if (await ply(alex, sam, board)) plies++;
  await wait(600);
  check(plies >= 3, `${board}: the two play turns (${plies} of 4 plies)`);
  const samBefore = await boardSig(sam.page);
  const alexBefore = await boardSig(alex.page);

  // Sam reloads mid-game.
  await sam.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  check(await backAtTable(sam, '#xox-board'), `${board}: after a reload Sam is back at the table`);
  const samAfter = await until(async () => {
    const s = await boardSig(sam.page);
    return s === samBefore ? s : null;
  });
  check(!!samAfter, `${board}: … with the same board`);
  check(/Alex/.test(await sam.page.evaluate(() => document.querySelector('#game-stage .xox-page')?.textContent ?? '')) && /Sam/.test(await alex.page.evaluate(() => document.querySelector('#game-stage .xox-page')?.textContent ?? '')), `${board}: … both still seated`);
  check((await boardSig(alex.page)) === alexBefore, `${board}: Alex's board did not change while Sam reloaded`);

  // Sam's network drops for a moment; the table carries on.
  await drop(sam);
  await wait(3000);
  const a0 = await boardSig(alex.page);
  const s0 = await boardSig(sam.page);
  const moved = (await ply(alex, sam, board)) && (await ply(alex, sam, board));
  const both = await until(async () => (await boardSig(alex.page)) !== a0 && (await boardSig(sam.page)) !== s0, 10000);
  const state = async (p) => p.page.evaluate(() => ({ status: document.querySelector('#game-stage .xox-status, #game-stage .mt-status, #game-stage [role=status]')?.textContent?.trim().slice(0, 60), movable: document.querySelectorAll('#game-stage .movable').length, turn: document.querySelector('#game-stage .xox-page')?.dataset.turn }));
  check(moved && !!both, `${board}: after an ${DROP_MS / 1000} s network drop the game goes on and both see the moves`, JSON.stringify({ moved, a: await state(alex), s: await state(sam) }));
  const errs = [...alex.errors, ...sam.errors];
  check(!errs.length, `${board}: no page errors`, errs.slice(0, 2).join(' | '));
  await alex.ctx.close();
  await sam.ctx.close();
}

// ---- Sea Battle ----
async function sea(browser) {
  const room = 'gp' + Math.random().toString(36).slice(2, 8);
  const alex = await person(browser, room, 'Alex', 'wizard');
  const sam = await person(browser, room, 'Sam', 'pirate');
  await run(alex.page, 'games.open.sea');
  await until(() => alex.page.evaluate(() => !!document.querySelector('#game-stage .sea')));
  check(await join(sam), 'sea: Sam gets the invite card');
  const fleet = (p) => p.page.evaluate(() => [...document.querySelectorAll('#game-stage .sea-mine .sea-cell.ship')].map((c) => c.dataset.cell ?? c.getAttribute('aria-label')).join(','));
  check(!!(await until(async () => (await fleet(sam)).split(',').length === 17)), 'sea: Sam sees his own fleet');
  for (const p of [alex, sam]) await p.page.evaluate(() => document.querySelector('#game-stage .sea-ready-btn:not(:disabled)')?.click());
  const battle = await until(() => alex.page.evaluate(() => document.querySelector('#game-stage .sea')?.dataset.phase === 'play'), 10000);
  check(!!battle, 'sea: both ready, the battle starts');
  /** A shot by whoever has the turn, at their first untouched cell of the other sea. */
  const shoot = async () => {
    for (let i = 0; i < 20; i++) {
      for (const p of [alex, sam]) {
        const shot = await p.page.evaluate(() => {
          const sea = document.querySelector('#game-stage .sea');
          const theirs = sea?.querySelector('.sea-theirs');
          if (!theirs || !theirs.classList.contains('aim')) return false;
          const c = [...theirs.querySelectorAll('.sea-cell:not(.miss):not(.hit):not(.sunk):not(:disabled)')][0];
          c?.click();
          return !!c;
        });
        if (shot) return true;
      }
      await wait(300);
    }
    return false;
  };
  const marks = (p) => p.page.evaluate(() => document.querySelectorAll('#game-stage .sea-cell.miss, #game-stage .sea-cell.hit, #game-stage .sea-cell.sunk').length);
  let shots = 0;
  for (let i = 0; i < 3; i++) if (await shoot()) (shots++, await wait(500));
  check(shots >= 2, `sea: the two take shots (${shots} of 3)`);
  const fleetBefore = await fleet(sam);
  const marksBefore = await marks(sam);
  await sam.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  check(await backAtTable(sam, '.sea'), 'sea: after a reload Sam is back at the table');
  check(!!(await until(async () => (await fleet(sam)) === fleetBefore && (await marks(sam)) === marksBefore)), 'sea: … with his own fleet and every shot as it was', `${(await fleet(sam)).slice(0, 40)} / ${await marks(sam)} vs ${marksBefore}`);
  await drop(sam);
  await wait(3000);
  const a0 = await marks(alex);
  const s0 = await marks(sam);
  const shot = await shoot();
  check(shot && !!(await until(async () => (await marks(alex)) > a0 && (await marks(sam)) > s0, 10000)), `sea: after an ${DROP_MS / 1000} s network drop a shot reaches both seas`);
  const errs = [...alex.errors, ...sam.errors];
  check(!errs.length, 'sea: no page errors', errs.slice(0, 2).join(' | '));
  await alex.ctx.close();
  await sam.ctx.close();
}

// ---- Last Heart ----
async function poker(browser) {
  const room = 'gp' + Math.random().toString(36).slice(2, 8);
  const alex = await person(browser, room, 'Alex', 'wizard');
  const sam = await person(browser, room, 'Sam', 'pirate');
  await run(alex.page, 'games.open.poker');
  await until(() => alex.page.evaluate(() => !!document.querySelector('#game-stage .pk')));
  check(await join(sam), 'poker: Sam gets the invite card');
  check(!!(await until(() => alex.page.evaluate(() => document.querySelectorAll('#game-stage .pk-lobby-seats li').length >= 2))), 'poker: both are seated in the lobby');
  await until(() => alex.page.evaluate(() => {
    const b = [...document.querySelectorAll('#game-stage .pk-lobby .btn.primary')].find((b) => !b.disabled);
    b?.click();
    return !!b;
  }));
  const dealt = await until(() => sam.page.evaluate(() => document.querySelectorAll('#game-stage .pk-hand .pk-card').length === 2), 10000);
  check(!!dealt, 'poker: the host deals, Sam sees his two cards');
  const hand = (p) => p.page.evaluate(() => [...document.querySelectorAll('#game-stage .pk-hand .pk-card')].map((c) => c.textContent.trim()).join(' '));
  /** Check or call by whoever is to act. */
  const act = async () => {
    for (let i = 0; i < 30; i++) {
      for (const p of [alex, sam]) {
        const done = await p.page.evaluate(() => {
          const b = document.querySelector('#game-stage .pk-actions .btn.primary:not(:disabled)');
          b?.click();
          return !!b;
        });
        if (done) return true;
      }
      await wait(300);
    }
    return false;
  };
  check(await act(), 'poker: the first player acts');
  const samCards = await hand(sam);
  await sam.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
  check(await backAtTable(sam, '.pk'), 'poker: after a reload Sam is back at the table');
  check(!!(await until(async () => (await hand(sam)) === samCards, 10000)), 'poker: … with the same two cards', `${await hand(sam)} vs ${samCards}`);
  check(await act(), 'poker: the hand goes on after the reload');
  await drop(sam);
  await wait(3000);
  // What the table shows: street, pot, the shared cards and whose turn it is (it changes with every action).
  const feed = (p) => p.page.evaluate(() => ['.pk-street', '.pk-pot', '.pk-board', '.pk-status-text'].map((s) => document.querySelector(`#game-stage ${s}`)?.textContent ?? '').join('|'));
  const f0 = await feed(sam);
  const acted = await act();
  check(acted && !!(await until(async () => (await feed(sam)) !== f0, 10000)), `poker: after an ${DROP_MS / 1000} s network drop the table goes on and Sam sees it`);
  const errs = [...alex.errors, ...sam.errors];
  check(!errs.length, 'poker: no page errors', errs.slice(0, 2).join(' | '));
  await alex.ctx.close();
  await sam.ctx.close();
}

// ---- Quiz / Draw & Guess: a short drop keeps Sam in the running game ----
async function points(browser, kind) {
  const room = 'gp' + Math.random().toString(36).slice(2, 8);
  const alex = await person(browser, room, 'Alex', 'wizard');
  const sam = await person(browser, room, 'Sam', 'pirate');
  await run(alex.page, `games.open.${kind}`);
  check(await join(sam), `${kind}: Sam gets the invite card`);
  await until(() => alex.page.evaluate(() => document.querySelectorAll('#game-stage .draw-player').length >= 2));
  for (const p of [alex, sam]) await p.page.evaluate(() => [...document.querySelectorAll('#game-stage .btn.primary')].find((b) => !b.disabled && b.offsetWidth)?.click());
  const going = await until(() => alex.page.evaluate(() => !document.querySelector('#game-stage .draw-page')?.classList.contains('draw-lobby')));
  check(!!going, `${kind}: the game starts`);
  await drop(sam);
  const still = await until(() => sam.page.evaluate(() => !document.querySelector('#game-stage .draw-page')?.classList.contains('draw-lobby') && document.querySelectorAll('#game-stage .draw-player:not(.away)').length >= 2), 15000);
  const seen = await alex.page.evaluate(() => ({ lobby: document.querySelector('#game-stage .draw-page')?.classList.contains('draw-lobby'), away: document.querySelectorAll('#game-stage .draw-player.away').length }));
  check(!!still && !seen.lobby && seen.away === 0, `${kind}: after an ${DROP_MS / 1000} s network drop Sam is back in the running game, nobody away`, JSON.stringify(seen));
  const errs = [...alex.errors, ...sam.errors];
  check(!errs.length, `${kind}: no page errors`, errs.slice(0, 2).join(' | '));
  await alex.ctx.close();
  await sam.ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const board of BOARDS) await classics(browser, board);
  if (TABLES.includes('sea')) await sea(browser);
  if (TABLES.includes('poker')) await poker(browser);
  for (const kind of ['quiz', 'draw']) if (TABLES.includes(kind)) await points(browser, kind);
  await browser.close();
  if (fails) console.log(`\n✗ ${fails} check(s) failed:\n  ${problems.join('\n  ')}`);
  else console.log('\n✓ Games pair harness passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
