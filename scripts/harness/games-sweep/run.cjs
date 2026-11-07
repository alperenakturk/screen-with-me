// Games quality sweep (card BHG, Game Studio): every game in the room's games stage, on a computer (1366 × 768,
// 1920 × 1080) and a phone (iPhone 13, Pixel 7), in English and Turkish. For each one it checks the owner's rules:
// no scrollbar inside the game (only lists that grow without end may scroll), no text under 13 px, nothing cut off
// (every visible control inside the game's window and the screen), and the room page itself never scrolls.
// Screenshots go to SHOTS (default: a temp folder) for a human look.
//
//   npm run dev (its server has the lab flag), then: node scripts/harness/games-sweep/run.cjs [site]
//   GAMES=chess,quiz SIZES=laptop LANGS=en narrows the run; FRIENDS=3 adds the Test Lab's fake friends to the room.
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
  snack: { solo: 'snack' },
  garden: { solo: 'garden' },
  word: { solo: 'word' },
};
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
          return b && !b.querySelector('.game-stage-loading') && b.childElementCount > 0;
        }, null, { timeout: 12000 }).catch(() => {});
        await wait(900);
        if (g.picker) {
          // The picker first (CL2): open it again if an earlier board is on the table.
          await page.evaluate(() => {
            const b = document.querySelector('#game-stage #cl-shelf-open');
            if (b && !b.hidden) b.click();
          });
          await wait(600);
          const alone = await page.evaluate(() => !document.querySelector('#game-stage .cl-picker')?.hidden && !!document.querySelector('#game-stage .mt-table')?.hidden);
          check(alone, `${label}: the picker shows alone (no board behind it)`);
        }
        if (g.board) {
          const has = await page.evaluate((b) => document.querySelector(`#game-stage .cl-box[data-board="${b}"].on`) !== null, g.board);
          if (!has) {
            await page.evaluate(() => document.querySelector('#cl-shelf-open')?.click());
            await wait(300);
            await page.evaluate((b) => document.querySelector(`#game-stage .cl-box[data-board="${b}"]`)?.click(), g.board);
            await wait(1200);
          }
        }
        if (g.play) {
          await run('sea.bot');
          await wait(800);
          await page.evaluate(() => document.querySelector('#game-stage .sea-ready-btn')?.click());
          const playing = await page.waitForFunction(() => document.querySelector('#game-stage .sea')?.dataset.phase === 'play', null, { timeout: 6000 }).then(() => true, () => false);
          check(playing, `${label}: the battle against Glowbeam starts`);
          await wait(600);
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
        check(m.tinyCount === 0, `${label}: every control is at least ${phone ? 44 : 24} px to hit`, m.tiny.slice(0, process.env.TINY_ALL ? 200 : 6).join(' | '));
        check(!m.pageScroll, `${label}: the page does not scroll`, m.pageScroll);
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
