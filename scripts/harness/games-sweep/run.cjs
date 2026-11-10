// Games quality sweep (card BHG, Game Studio): every game in the room's games stage, on a computer (1366 × 768,
// 1920 × 1080) and a phone (iPhone 13, Pixel 7), in English and Turkish. For each one it checks the owner's rules:
// no scrollbar inside the game (only lists that grow without end may scroll), no text under 13 px, nothing cut off
// (every visible control inside the game's window and the screen), and the room page itself never scrolls.
// Screenshots go to SHOTS (default: a temp folder) for a human look.
//
//   npm run dev (its server has the lab flag), then: node scripts/harness/games-sweep/run.cjs [site]
//   GAMES=chess,quiz SIZES=laptop LANGS=en narrows the run; FRIENDS=3 adds the Test Lab's fake friends to the room.
//   Card GW: on computers every game is also shrunk to its smallest and grown to its largest window and put in its own
//   fullscreen (browser and whole tab); GW_LANGS=tr runs those passes in Turkish only, GW_LANGS=none skips them.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const SITE = process.argv[2] || 'http://localhost:5173';
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'games-sweep-'));
const pick = (env, all) => (process.env[env] ? process.env[env].split(',') : all);

const SIZES = {
  laptop: { viewport: { width: 1366, height: 768 } },
  desktop: { viewport: { width: 1920, height: 1080 } },
  iphone: devices['iPhone 13'],
  pixel: devices['Pixel 7'],
};
// A table kind and, for the Classics, the board to put on it.
const GAMES = {
  picker: { table: 'classics', picker: true },
  xox: { table: 'classics', board: 'xox' },
  four: { table: 'classics', board: 'four' },
  dama: { table: 'classics', board: 'dama' },
  chess: { table: 'classics', board: 'chess' },
  backgammon: { table: 'classics', board: 'backgammon' },
  reversi: { table: 'classics', board: 'reversi' },
  draw: { table: 'draw' },
  quiz: { table: 'quiz' },
  poker: { table: 'poker' },
  sea: { table: 'sea' },
  // Sea Battle in battle: Glowbeam sits, I'm ready, both seas show.
  seaPlay: { table: 'sea', play: true },
  // ⚔️ Five Frames Duel: waiting alone, then racing with Sam (a socket from this script) on the board and the tray.
  duel: { table: 'duel' },
  duelPlay: { table: 'duel', race: true },
  snack: { solo: 'snack' },
  garden: { solo: 'garden' },
  word: { solo: 'word' },
};
// Card GW: each game's smallest and largest free window, read from the catalog (the harness may run on the built site).
const CATALOG = fs.readFileSync(path.join(__dirname, '../../../packages/shared/src/games/catalog.ts'), 'utf8');
/** The catalog entry a game's window follows: a Classics board (or its picker), a table, a side game. */
function catalogEntry(g) {
  const section = (start) => CATALOG.slice(CATALOG.indexOf(start));
  const find = (text, key) => {
    const m = new RegExp(`\\n  ${key}: \\{[^}]*minSize: \\[(\\d+), (\\d+)\\], maxSize: \\[(\\d+), (\\d+)\\]`).exec(text);
    return m ? { min: [+m[1], +m[2]], max: [+m[3], +m[4]] } : null;
  };
  if (g.picker) return find(section('CLASSICS_SIZES'), 'picker');
  if (g.board) return find(section('CLASSICS_SIZES'), g.board);
  if (g.solo) return find(section('SOLO_CATALOG'), g.solo);
  return find(section('GAME_CATALOG'), g.table);
}
// Lists that grow without end and may scroll (the owner's rule allows them).
const MAY_SCROLL = ['.draw-chat', '.draw-guesses', '.chat-list', '.quiz-players', '.sb-upgrades', '.wg-album-page', '.htp'];

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

/** Measures the open game: inner scrollbars, small text, cut-off controls, page scroll. */
function measure({ mayScroll, minTarget }) {
  const stage = document.querySelector('#game-stage');
  if (!stage || stage.hidden) return { missing: true };
  const box = stage.getBoundingClientRect();
  const vw = innerWidth;
  const vh = innerHeight;
  const name = (el) => (el.id ? `#${el.id}` : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : el.tagName.toLowerCase());
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const scrollers = [];
  const small = [];
  const cut = [];
  for (const el of stage.querySelectorAll('*')) {
    if (!visible(el)) continue;
    if (el.closest('[aria-hidden="true"], svg')) continue;
    const s = getComputedStyle(el);
    const scrollsY = /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 2;
    const scrollsX = /(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 2;
    if ((scrollsY || scrollsX) && !mayScroll.some((sel) => el.closest(sel))) scrollers.push(`${name(el)} ${scrollsY ? `${el.scrollHeight}>${el.clientHeight}` : `w${el.scrollWidth}>${el.clientWidth}`}`);
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    // The size on screen: a game scaled down to fit (transform: scale) shows its text smaller than its font-size.
    // Measured on the nearest box at least 100 px wide: a narrow span's offsetWidth is rounded to whole pixels, which
    // made a 13 px seed count read as 11.7 px.
    let ref = el;
    while (ref.parentElement && ref !== stage && ref.offsetWidth < 100) ref = ref.parentElement;
    const shown = parseFloat(s.fontSize) * (ref.offsetWidth > 0 ? ref.getBoundingClientRect().width / ref.offsetWidth : 1);
    if (own && shown < 12.8 && !el.closest('.dama-board, .chess-board, .bg-board, .xox-board, .sea-grid')) small.push(`${name(el)} ${shown.toFixed(1)}px "${el.textContent.trim().slice(0, 18)}"`);
    if (/^(BUTTON|INPUT|SELECT|TEXTAREA|A)$/.test(el.tagName) || own) {
      const r = el.getBoundingClientRect();
      // Clipped by a scrolling ancestor is fine (it can be scrolled to); clipped by the game's window or the screen is not.
      let clipped = r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1 || r.right > vw + 1 || r.bottom > vh + 1 || r.left < -1 || r.top < -1;
      if (clipped) {
        for (let p = el.parentElement; p && p !== stage; p = p.parentElement) {
          const ps = getComputedStyle(p);
          if (/(auto|scroll)/.test(ps.overflowY + ps.overflowX)) clipped = false;
        }
      }
      if (clipped) cut.push(`${name(el)} [${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}] "${el.textContent.trim().slice(0, 18)}"`);
    }
  }
  // A board is the game: it must be there and take a fair share of the window (a CSS slip once made it 0 wide).
  let board = '';
  const boards = [...stage.querySelectorAll('.dama-board, .bg-board, .xox-board, .four-board, .sea-grid')];
  // A phone shows one Sea Battle sea at a time: measure the one on screen.
  const b = boards.find((x) => x.getBoundingClientRect().width > 0) ?? boards[0];
  // Classics' picker shows no board at all (CL2): nothing to measure there.
  if (b && !b.closest('[hidden]')) {
    const r = b.getBoundingClientRect();
    if (r.width < Math.min(260, box.width * 0.6) || r.height < 150) board = `${name(b)} ${Math.round(r.width)}×${Math.round(r.height)} in ${Math.round(box.width)}`;
  }
  // CL2: the board is the hero: no other block of the table is bigger, and nothing stands beside it as a column
  // (the old layout had seats, status and settings in a column left of a small board).
  let hero = '';
  const tableBox = stage.querySelector('.mt-table');
  if (b && tableBox && !tableBox.hidden) {
    const br = b.getBoundingClientRect();
    for (const part of tableBox.children) {
      if (!visible(part) || part.contains(b) || part.matches('.mt-watch-pop')) continue;
      const r = part.getBoundingClientRect();
      if (r.width * r.height > br.width * br.height) hero += `${name(part)} is bigger than the board; `;
      const overlap = Math.min(r.bottom, br.bottom) - Math.max(r.top, br.top);
      const beside = r.right <= br.left + 2 || r.left >= br.right - 2;
      if (beside && overlap > br.height * 0.3 && r.height > 60) hero += `${name(part)} stands beside the board; `;
    }
  }
  // CL2: a Draw & Guess / Quiz lobby is one card: no players column beside it.
  const lobby = stage.querySelector('.draw-page.draw-lobby');
  if (lobby) {
    const side = lobby.querySelector('.draw-side');
    if (side && visible(side)) hero += 'the lobby has a column beside its card; ';
    if (!lobby.querySelector('.lobby-players')) hero += 'the lobby shows no players row; ';
  }
  // GP2: every control is big enough to hit: 44 px on a phone (Apple / Material), 24 px elsewhere (WCAG 2.2 AA).
  // A board cell counts too; the smaller side of the box is what a finger has to hit.
  const tiny = [];
  for (const el of stage.querySelectorAll('button, [role="button"], input, select, a[href]')) {
    if (!visible(el) || el.disabled || el.closest('[aria-hidden="true"], [hidden]')) continue;
    const r = el.getBoundingClientRect();
    const side = Math.min(r.width, r.height);
    // The two places a phone's width can't give 44 px: Five Frames' keys (10 a row, like the phone's own keyboard: tall
    // enough, at least 26 wide) and Sea Battle's 10 × 10 cells (the owner's question on how a phone aims is open).
    if (el.matches('.ff-key') && r.height >= minTarget - 0.5 && r.width >= 26) continue;
    if (el.matches('.sea-cell')) continue;
    if (side < minTarget - 0.5) tiny.push(`${name(el)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  const page = document.scrollingElement;
  return {
    tiny: [...new Set(tiny)],
    tinyCount: tiny.length,
    stage: [Math.round(box.width), Math.round(box.height)],
    scrollers: [...new Set(scrollers)].slice(0, 6),
    small: [...new Set(small)].slice(0, 6),
    cut: [...new Set(cut)].slice(0, 6),
    board,
    hero,
    pageScroll: page.scrollHeight > innerHeight + 2 ? `${page.scrollHeight}>${innerHeight}` : '',
  };
}

/** Runs `measure` and reports its findings under `label`. */
async function judge(page, label, phone) {
  const m = await page.evaluate(measure, { mayScroll: MAY_SCROLL, minTarget: phone ? 44 : 24 });
  if (m.missing) return check(false, `${label}: the game window shows`), null;
  check(m.scrollers.length === 0, `${label}: no scrollbar inside (${m.stage.join('×')})`, m.scrollers.join(' | '));
  check(m.small.length === 0, `${label}: no text under 13 px`, m.small.join(' | '));
  check(m.cut.length === 0, `${label}: nothing cut off`, m.cut.join(' | '));
  check(!m.board, `${label}: the board is a fair size`, m.board);
  return m;
}
const stageBox = (page) => page.evaluate(() => {
  const r = document.querySelector('#game-stage').getBoundingClientRect();
  return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight };
});
/**
 * Card GW: the free window shrunk to its smallest and grown to its largest by its corner (never past the catalog's
 * limits, or the screen), then the game's own fullscreen (⛶): the whole screen, the same checks, and Esc brings the
 * window back where it was.
 */
async function windowPasses(page, label, g, phone) {
  const lim = catalogEntry(g);
  const float = await page.evaluate(() => document.querySelector('#game-stage')?.classList.contains('float'));
  if (lim && float) {
    const start = await stageBox(page);
    const drag = async (dx, dy) => {
      const grip = await page.$('#game-stage .game-resize');
      const b = await grip.boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + dx, b.y + dy, { steps: 6 });
      await page.mouse.up();
      await wait(700);
      return stageBox(page);
    };
    const small = await drag(-3000, -3000);
    const screenSmall = start.vw - 16 < lim.min[0] || start.vh - 16 < lim.min[1];
    check(screenSmall || (small.w >= lim.min[0] - 2 && small.h >= lim.min[1] - 2), `${label}: the grip stops at the smallest size (${lim.min.join('×')})`, `${small.w}×${small.h}`);
    await judge(page, `${label} at its smallest`, phone);
    const big = await drag(3000, 3000);
    check(big.w <= lim.max[0] + 2 && big.h <= lim.max[1] + 2 && big.x + big.w <= big.vw && big.y + big.h <= big.vh, `${label}: the grip stops at the largest size (${lim.max.join('×')}) or the screen`, `${big.w}×${big.h} at ${big.x},${big.y}`);
    await judge(page, `${label} at its largest`, phone);
    // Back to its own size for the next game (double click on the head).
    await page.evaluate(() => document.querySelector('#game-stage .game-stage-title')?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
    await wait(400);
  }
  const before = await stageBox(page);
  const button = await page.$('#game-stage .game-full');
  if (!button || !(await button.isVisible())) return check(false, `${label}: ⛶ shows in the game's head`);
  await button.click();
  await wait(900);
  const full = await stageBox(page);
  check(full.w >= full.vw - 1 && full.h >= full.vh - 1 && full.x <= 0 && full.y <= 0, `${label}: ⛶ puts the game on the whole screen`, `${full.w}×${full.h} at ${full.x},${full.y}`);
  const fit = await page.evaluate(() => Number(getComputedStyle(document.querySelector('#game-stage')).getPropertyValue('--fit')) || 1);
  check(fit >= 0.999, `${label}: in fullscreen the game is shown at least at its own size (scale ${fit.toFixed(2)})`);
  await judge(page, `${label} in fullscreen`, phone);
  await page.screenshot({ path: path.join(SHOTS, `${label.replace(/\//g, '-')}-full.png`) });
  // A headless browser can't press its own Esc for fullscreen: ⛶ again leaves (Esc is the browser's own key there).
  await button.click();
  await wait(900);
  const same = (a, b) => Math.abs(a.w - b.w) <= 2 && Math.abs(a.h - b.h) <= 2 && Math.abs(a.x - b.x) <= 2 && Math.abs(a.y - b.y) <= 2;
  const back = await stageBox(page);
  check(same(back, before), `${label}: leaving fullscreen brings the window back where it was`, `${JSON.stringify(before)} → ${JSON.stringify(back)}`);
  // Where there is no Fullscreen API (the film page's overlay, an iPhone) ⛶ fills the whole tab and Esc leaves.
  await page.evaluate(() => Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => false }));
  await button.click();
  await wait(700);
  const tab = await stageBox(page);
  check(tab.w >= tab.vw - 1 && tab.h >= tab.vh - 1, `${label}: without the Fullscreen API ⛶ fills the tab`, `${tab.w}×${tab.h}`);
  await page.keyboard.press('Escape');
  await wait(700);
  const back2 = await stageBox(page);
  check(same(back2, before), `${label}: Esc leaves the whole-tab view, the window comes back`, `${JSON.stringify(before)} → ${JSON.stringify(back2)}`);
  await page.evaluate(() => delete document.fullscreenEnabled);
}

(async () => {
  const browser = await chromium.launch();
  for (const size of pick('SIZES', Object.keys(SIZES))) {
    for (const lang of pick('LANGS', ['en', 'tr'])) {
      const ctx = await browser.newContext({ ...SIZES[size] });
      await ctx.addInitScript((lang) => {
        for (const [k, v] of Object.entries({ lang, name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', 'snackBar:howSeen': '1', 'windowGarden:howSeen': '1', 'fiveFrames:howSeen': '1' })) localStorage.setItem(k, v);
      }, lang);
      const page = await ctx.newPage();
      page.on('pageerror', (e) => problems.push(`${size}/${lang} PAGEERROR ${e.message}`));
      const room = 'gs' + Math.random().toString(36).slice(2, 8);
      await page.goto(`${SITE}/r/${room}?debug=1#back`);
      await page.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 });
      await wait(3500);
      const run = (id, arg) => page.evaluate(([id, arg]) => window.__swmLab.run(id, arg).then((l) => ({ dir: l.dir, text: l.text })), [id, arg]);
      // FRIENDS=n: the Test Lab's fake friends in the room (their names in the tables, the side games' "others").
      for (let i = 0; i < Number(process.env.FRIENDS || 0); i++) await run('friends.add');
      if (process.env.FRIENDS) await wait(1500);
      for (const game of pick('GAMES', Object.keys(GAMES))) {
        const g = GAMES[game];
        const label = `${size}/${lang}/${game}`;
        const opened = await run(`games.open.${g.table ?? g.solo}`);
        if (opened.dir !== 'lab') {
          check(false, `${label}: opens`, opened.text);
          continue;
        }
        // Wait for the game's own content, then put the board on the Classics table.
        await page.waitForFunction(() => {
          const b = document.querySelector('#game-stage .game-stage-body');
          // CLFLASH: a Classics table shows "Setting up the table…" (.mt-loading) until its state comes.
          return b && !b.querySelector('.game-stage-loading, .mt-loading') && b.childElementCount > 0;
        }, null, { timeout: 12000 }).catch(() => {});
        await wait(900);
        if (g.picker) {
          // The picker first (CL2): open it again if an earlier board is on the table.
          await page.evaluate(() => {
            const b = document.querySelector('#game-stage #cl-shelf-open');
            if (b && !b.hidden) b.click();
          });
          const alone = await page.waitForFunction(() => !document.querySelector('#game-stage .cl-picker')?.hidden && !!document.querySelector('#game-stage .mt-table')?.hidden, null, { timeout: 6000 }).then(() => true, () => false);
          check(alone, `${label}: the picker shows alone (no board behind it)`);
        }
        if (g.board) {
          const has = await page.evaluate((b) => document.querySelector(`#game-stage .cl-box[data-board="${b}"].on`) !== null, g.board);
          // The picker step before may have left the picker open on a table that already has this board: its box then
          // counts as chosen but the window still shows (and is sized for) the picker. A press on the box closes it.
          const pickerOpen = await page.evaluate(() => document.querySelector('#game-stage .xox-page')?.dataset.board === 'picker');
          let shown = false;
          // A slow runner (CI) may not have drawn the picker 300 ms after "Change game", or a pass before may have left a
          // game in progress ("End this game and change?"): try a few times, waiting for each step instead of a fixed time.
          for (let tries = 0; tries < 4 && !shown; tries++) {
            if (tries === 0 && has && !pickerOpen) { shown = true; break; }
            const onPicker = await page.evaluate(() => document.querySelector('#game-stage .xox-page')?.dataset.board === 'picker');
            if (!onPicker) await page.evaluate(() => document.querySelector('#game-stage #cl-shelf-open')?.click());
            await page.waitForFunction((b) => !!document.querySelector(`#game-stage .cl-box[data-board="${b}"]`)?.offsetParent, g.board, { timeout: 4000 }).catch(() => {});
            await page.evaluate((b) => document.querySelector(`#game-stage .cl-box[data-board="${b}"]`)?.click(), g.board);
            await wait(300);
            await page.evaluate(() => document.querySelector('.dialog-backdrop:not([hidden]) .confirm-dialog .btn.primary')?.click());
            shown = await page.waitForFunction((b) => document.querySelector('#game-stage .xox-page')?.dataset.board === b, g.board, { timeout: 4000 }).then(() => true, () => false);
          }
          if (shown) await wait(600);
          check(shown, `${label}: the ${g.board} board is on the table`);
        }
        if (g.play) {
          // Glowbeam's seat and the Ready button come a moment later on a slow runner (CI once ran out of a 10 s wait):
          // ask for Glowbeam again every few seconds (a taken seat just refuses it) and press Ready until the battle starts.
          let playing = false;
          for (let tries = 0; tries < 5 && !playing; tries++) {
            await run('sea.bot');
            playing = await page
              .waitForFunction(
                () => {
                  if (document.querySelector('#game-stage .sea')?.dataset.phase === 'play') return true;
                  document.querySelector('#game-stage .sea-ready-btn:not(:disabled)')?.click();
                  return false;
                },
                null,
                { timeout: 4000, polling: 400 },
              )
              .then(() => true, () => false);
          }
          check(playing, `${label}: the battle against Glowbeam starts`);
          await wait(600);
        }
        let sam = null;
        if (g.race) {
          // Sam joins the table from this script (a plain socket), says ready, guesses once; I press Ready.
          const id = await page.evaluate(() => document.querySelector('#game-stage .duel')?.dataset.table);
          sam = new WebSocket(`${SITE.replace(/^http/, 'ws')}/api/duel/${id}/ws`);
          sam.addEventListener('open', () => {
            sam.send(JSON.stringify({ t: 'hello', v: 1, name: 'Sam', cid: 's'.repeat(32) }));
            sam.send(JSON.stringify({ t: 'ready', on: true }));
          });
          // Once the race is on, Sam guesses once (his marks show on my screen; the word list is English by default).
          let guessed = false;
          sam.addEventListener('message', (e) => {
            const m = JSON.parse(e.data);
            if (m.t === 'state' && m.phase === 'play' && !guessed) {
              guessed = true;
              sam.send(JSON.stringify({ t: 'guess', word: 'slate' }));
            }
          });
          const racing = await page
            .waitForFunction(() => {
              if (document.querySelector('#game-stage .duel')?.dataset.phase === 'play') return true;
              document.querySelector('#game-stage .duel-ready.primary')?.click();
              return false;
            }, null, { timeout: 10000, polling: 300 })
            .then(() => true, () => false);
          check(racing, `${label}: the race with Sam starts`);
          // Two letters typed on my board, and Sam's first row of marks.
          await page.evaluate(() => ['a', 'b'].forEach((k) => document.querySelector(`#game-stage .ff-key[data-key="${k}"]`)?.click()));
          await wait(2000);
        }
        const phone = size === 'iphone' || size === 'pixel';
        const m = await page.evaluate(measure, { mayScroll: MAY_SCROLL, minTarget: phone ? 44 : 24 });
        await page.screenshot({ path: path.join(SHOTS, `${size}-${lang}-${game}.png`) });
        if (m.missing) {
          check(false, `${label}: the game window shows`);
          continue;
        }
        check(m.scrollers.length === 0, `${label}: no scrollbar inside (${m.stage.join('×')})`, m.scrollers.join(' | '));
        check(m.small.length === 0, `${label}: no text under 13 px`, m.small.join(' | '));
        check(m.cut.length === 0, `${label}: nothing cut off`, m.cut.join(' | '));
        check(!m.board, `${label}: the board is a fair size`, m.board);
        check(!m.hero, `${label}: the board / lobby card is the hero (nothing beside it)`, m.hero);
        sam?.close();
        check(m.tinyCount === 0, `${label}: every control is at least ${phone ? 44 : 24} px to hit`, m.tiny.slice(0, process.env.TINY_ALL ? 200 : 6).join(' | '));
        check(!m.pageScroll, `${label}: the page does not scroll`, m.pageScroll);
        // Card GW passes: computers only (phones play full screen); GW_LANGS narrows them (CI: Turkish, the longer texts).
        if (!phone && pick('GW_LANGS', ['en', 'tr']).includes(lang)) await windowPasses(page, label, g, phone);
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(`\nScreenshots: ${SHOTS}`);
  if (fails) console.log(`\n✗ ${fails} check(s) failed:\n  ${problems.join('\n  ')}`);
  else console.log('\n✓ Games sweep passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
