// Games: minimize, restore and reload in the middle of a game (card BHG, Game Studio). For every Classics board,
// played alone against Glowbeam: a move is made (with its sound), the window is minimized and brought back with the
// same board, the page is reloaded mid-game (the "are you sure?" is accepted) and the table comes back with my seat
// and the same board; every visible button in the window has a name (keyboard / screen readers). Then Quiz and Draw &
// Guess with two people: a reload mid-question / mid-round keeps the player in the game (the server waits 20 s for
// them); a side game open (or minimized) before a reload is open (or minimized) after it.
//
//   npm run dev (its server has the lab flag), then: node scripts/harness/games-resume/run.cjs [site]
const { chromium } = require('playwright');
const path = require('path');

// axe-core (WCAG 2.1 A + AA) inside the game window, when installed (CI's accessibility step installs it).
let AXE = null;
try {
  AXE = require.resolve('axe-core/axe.min.js', { paths: [process.cwd(), path.join(__dirname, '../../..')] });
} catch {
  console.log('(axe-core not installed: the game windows are not checked with axe; npm i --no-save axe-core@4.10.2)');
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
  // In CI each failure is also an annotation on the check (readable without the whole log).
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
  // bypassCSP: axe is injected as a script, which the built site's CSP (served by wrangler, as in CI) refuses.
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, bypassCSP: true });
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
// What the board shows: every cell's or point's classes and text, so a restored board can be compared.
const boardSig = (page) =>
  page.evaluate(() => {
    const b = document.querySelector('#game-stage #xox-board');
    if (!b) return null;
    return [...b.querySelectorAll('.xox-cell, .dama-cell, .four-cell, .bg-point')].map((c) => `${c.className.replace(/\b(placed|movable|picked|target|last)\b/g, '').replace(/\s+/g, ' ').trim()}|${c.textContent.trim()}`).join(';');
  });
async function axeStage(page, label) {
  if (!AXE) return;
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ path: AXE });
  const list = await page.evaluate(() =>
    axe.run('#game-stage', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] }).then((r) => r.violations.map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`)),
  );
  check(list.length === 0, `${label}: axe finds nothing in the game window`, list.join(' ; '));
}
const unnamed = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('#game-stage button, #game-stage [role="button"], #game-stage input, #game-stage select')]
      .filter((b) => {
        const r = b.getBoundingClientRect();
        if (!r.width || !r.height || b.closest('[hidden], [aria-hidden="true"]')) return false;
        const label = b.getAttribute('aria-label') || b.getAttribute('title') || b.textContent.trim() || (b.labels && [...b.labels].map((l) => l.textContent).join('').trim()) || b.getAttribute('placeholder');
        return !label;
      })
      .map((b) => b.id || b.className)
      .slice(0, 5),
  );

// A move on the board: a free XOX cell, a Connect Four column, or (dama, chess, backgammon) a movable piece and its
// first target; backgammon rolls first.
async function move(page, board) {
  return page.evaluate(async (board) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const q = (s) => document.querySelector(`#game-stage ${s}`);
    if (board === 'xox' || board === 'four') {
      const c = q('.xox-cell:not([class*="mark-"]):not(:disabled), .four-cell:not(:disabled)');
      c?.click();
      return !!c;
    }
    if (board === 'backgammon') {
      q('#bg-roll:not([hidden]):not(:disabled)')?.click();
      await sleep(900);
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
    return false;
  }, board);
}

(async () => {
  const browser = await chromium.launch();
  for (const board of ['xox', 'four', 'dama', 'chess', 'backgammon']) {
    const room = 'gr' + Math.random().toString(36).slice(2, 8);
    const { ctx, page } = await person(browser, room, 'Robin', 'wizard');
    await run(page, 'games.open.classics');
    await until(() => page.evaluate(() => !!document.querySelector('#game-stage #cl-shelf-open')));
    if (!(await page.evaluate((b) => !!document.querySelector(`#game-stage .cl-box[data-board="${b}"].on`), board))) {
      await page.evaluate(() => document.querySelector('#cl-shelf-open')?.click());
      await wait(300);
      await page.evaluate((b) => document.querySelector(`#game-stage .cl-box[data-board="${b}"]`)?.click(), board);
    }
    await until(() => page.evaluate(() => !!document.querySelector('#game-stage .cl-bot-level')));
    await page.evaluate(() => document.querySelector('#game-stage .cl-bot-level')?.click());
    await until(() => page.evaluate(() => /Glowbeam/.test(document.querySelector('#game-stage #seat-1')?.textContent ?? '')));
    await page.evaluate(() => (window.__sounds.length = 0));
    // Wait for my turn (Glowbeam may start), then move.
    let moved = false;
    for (let i = 0; i < 20 && !moved; i++) {
      moved = await move(page, board);
      if (!moved) await wait(400);
    }
    check(moved, `${board}: I can make a move against Glowbeam`);
    await wait(1600); // Glowbeam's answer
    const sounds = await page.evaluate(() => window.__sounds.slice());
    check(sounds.length > 0, `${board}: the move plays a sound`, JSON.stringify(sounds));
    const before = await boardSig(page);
    check(!!before, `${board}: the board shows`);

    const names = await unnamed(page);
    check(names.length === 0, `${board}: every button in the window has a name`, names.join(', '));
    await axeStage(page, board);

    await page.evaluate(() => document.querySelector('#game-stage .game-minimize')?.click());
    const hidden = await until(() => page.evaluate(() => document.getElementById('game-stage').hidden));
    check(!!hidden, `${board}: ✕ minimizes the window`);
    await page.evaluate(() => document.getElementById('game-btn')?.click());
    await until(() => page.evaluate(() => !document.getElementById('game-stage').hidden));
    check((await boardSig(page)) === before, `${board}: restored with the same board`);

    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForFunction(() => !!document.querySelector('#game-btn'), null, { timeout: 20000 }).catch(() => {});
    // After a reload the table is still there: it reopens, or the 🎮 / the invite brings it back.
    let back = await until(() => page.evaluate(() => !document.getElementById('game-stage')?.hidden && !!document.querySelector('#game-stage #xox-board')), 6000);
    if (!back) {
      await page.evaluate(() => (document.querySelector('#game-invite .btn.primary') ?? document.getElementById('game-btn'))?.click());
      back = await until(() => page.evaluate(() => !!document.querySelector('#game-stage #xox-board')), 6000);
    }
    check(!!back, `${board}: after a reload mid-game the table comes back`);
    const after = await until(boardSig.bind(null, page));
    check(after === before, `${board}: … with the same board`, after === before ? '' : `${(after ?? '').slice(0, 80)} vs ${before?.slice(0, 80)}`);
    const seat = await page.evaluate(() => document.querySelector('#game-stage #seat-0')?.textContent ?? '');
    check(/Robin/.test(seat), `${board}: … and I keep my seat`, seat);
    await ctx.close();
  }

  // Side games: a reload keeps the one I had open (open, or minimized as it was).
  for (const [kind, sel] of [['snack', '.sb'], ['garden', '.wg'], ['word', '.ff']]) {
    const room = 'gs' + Math.random().toString(36).slice(2, 8);
    const { ctx, page } = await person(browser, room, 'Robin', 'wizard');
    await page.evaluate(() => {
      for (const k of ['snackBar:howSeen', 'windowGarden:howSeen', 'fiveFrames:howSeen']) localStorage.setItem(k, '1');
    });
    await run(page, `games.open.${kind}`);
    const shown = await until(() => page.evaluate((sel) => !!document.querySelector(`#game-stage ${sel}`), sel));
    check(!!shown, `${kind}: opens`);
    await axeStage(page, kind);
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    const again = await until(() => page.evaluate((sel) => !document.getElementById('game-stage')?.hidden && !!document.querySelector(`#game-stage ${sel}`), sel), 12000);
    check(!!again, `${kind}: a reload opens it again`);
    await page.evaluate(() => document.querySelector('#game-stage .game-minimize')?.click());
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await page.waitForFunction(() => !!document.querySelector('#game-btn'), null, { timeout: 20000 }).catch(() => {});
    const dot = await until(() => page.evaluate(() => document.getElementById('game-btn')?.classList.contains('game-waiting')), 12000);
    const hid = await page.evaluate(() => document.getElementById('game-stage')?.hidden);
    check(!!dot && hid, `${kind}: minimized before a reload, minimized after it (the 🎮 has its dot)`, `dot ${dot} hidden ${hid}`);
    await ctx.close();
  }

  // BH10: Sam joins Alex's Classics table before the first move; once the game starts Sam sees the board (not the
  // shelf "Pick a board") and can play his turn without picking the board himself.
  {
    const room = 'gj' + Math.random().toString(36).slice(2, 8);
    const alex = await person(browser, room, 'Alex', 'wizard');
    const sam = await person(browser, room, 'Sam', 'pirate');
    await run(alex.page, 'games.open.classics');
    await until(() => alex.page.evaluate(() => !!document.querySelector('#game-stage #cl-shelf-open')));
    if (!(await alex.page.evaluate(() => !!document.querySelector('#game-stage .cl-box[data-board="xox"].on')))) {
      await alex.page.evaluate(() => document.querySelector('#cl-shelf-open')?.click());
      await wait(300);
      await alex.page.evaluate(() => document.querySelector('#game-stage .cl-box[data-board="xox"]')?.click());
    }
    await until(() => sam.page.evaluate(() => !!document.querySelector('#game-invite .btn.primary')));
    await sam.page.evaluate(() => document.querySelector('#game-invite .btn.primary')?.click());
    const seated = await until(() => alex.page.evaluate(() => /Sam/.test(document.querySelector('#game-stage #seat-1')?.textContent ?? '')));
    check(!!seated, 'Classics: Sam joins before the first move and takes the second seat');
    const first = await until(() => alex.page.evaluate(() => {
      const c = document.querySelector('#game-stage .xox-cell:not([class*="mark-"]):not(:disabled)');
      c?.click();
      return !!c;
    }));
    check(!!first, 'Classics: Alex plays the first move');
    const board = await until(() => sam.page.evaluate(() => {
      const shelf = document.querySelector('#game-stage .cl-shelf');
      return (!shelf || shelf.hidden) && document.querySelectorAll('#game-stage .xox-cell[class*="mark-"]').length === 1;
    }));
    check(!!board, 'Classics: Sam sees the board with Alex\'s move, not the shelf');
    await sam.page.evaluate(() => document.querySelector('#game-stage .xox-cell:not([class*="mark-"]):not(:disabled)')?.click());
    const second = await until(() => alex.page.evaluate(() => document.querySelectorAll('#game-stage .xox-cell[class*="mark-"]').length === 2));
    check(!!second, 'Classics: Sam plays his turn without picking the board himself');
    await alex.ctx.close();
    await sam.ctx.close();
  }

  // Quiz and Draw & Guess: two people, a reload in the middle keeps me in the game.
  for (const kind of ['quiz', 'draw']) {
    const room = 'gq' + Math.random().toString(36).slice(2, 8);
    const alex = await person(browser, room, 'Alex', 'wizard');
    const sam = await person(browser, room, 'Sam', 'pirate');
    await run(alex.page, `games.open.${kind}`);
    await until(() => sam.page.evaluate(() => !!document.querySelector('#game-invite .btn.primary')));
    await sam.page.evaluate(() => document.querySelector('#game-invite .btn.primary')?.click());
    const two = await until(() => alex.page.evaluate(() => document.querySelectorAll('#game-stage .draw-player').length >= 2));
    check(!!two, `${kind}: both people are in the lobby`);
    // The game's host is whoever reached the table first: both press Start, only the host's counts.
    for (const p of [alex.page, sam.page]) await p.evaluate(() => [...document.querySelectorAll('#game-stage .btn.primary')].find((b) => !b.disabled && b.offsetWidth)?.click());
    const going = await until(() => alex.page.evaluate(() => !document.querySelector('#game-stage .draw-page')?.classList.contains('draw-lobby')));
    check(!!going, `${kind}: the game starts`);
    const names = await unnamed(alex.page);
    check(names.length === 0, `${kind}: every button in the window has a name`, names.join(', '));
    await axeStage(alex.page, kind);
    await sam.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await sam.page.waitForFunction(() => !!document.querySelector('#game-btn'), null, { timeout: 20000 }).catch(() => {});
    let back = await until(() => sam.page.evaluate(() => !!document.querySelector('#game-stage .draw-page') && !document.getElementById('game-stage').hidden), 6000);
    if (!back) {
      await sam.page.evaluate(() => (document.querySelector('#game-invite .btn.primary') ?? document.getElementById('game-btn'))?.click());
      back = await until(() => sam.page.evaluate(() => !!document.querySelector('#game-stage .draw-page')), 6000);
    }
    check(!!back, `${kind}: after a reload mid-game Sam is back at the table`);
    const inGame = await until(() => sam.page.evaluate(() => !document.querySelector('#game-stage .draw-page')?.classList.contains('draw-lobby') && [...document.querySelectorAll('#game-stage .draw-player')].length >= 2), 6000);
    const seen = await sam.page.evaluate(() => ({ lobby: document.querySelector('#game-stage .draw-page')?.className, players: [...document.querySelectorAll('#game-stage .draw-player')].map((p) => p.textContent.trim()) }));
    check(!!inGame, `${kind}: … in the running game, with both players listed`, JSON.stringify(seen));
    await alex.ctx.close();
    await sam.ctx.close();
  }

  await browser.close();
  if (fails) console.log(`\n✗ ${fails} check(s) failed:\n  ${problems.join('\n  ')}`);
  else console.log('\n✓ Games resume passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
