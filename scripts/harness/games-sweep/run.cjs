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
  xox: { table: 'classics', board: 'xox' },
  four: { table: 'classics', board: 'four' },
  dama: { table: 'classics', board: 'dama' },
  chess: { table: 'classics', board: 'chess' },
  backgammon: { table: 'classics', board: 'backgammon' },
  draw: { table: 'draw' },
  quiz: { table: 'quiz' },
  poker: { table: 'poker' },
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
function measure(mayScroll) {
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
    if (own && shown < 12.8 && !el.closest('.dama-board, .chess-board, .bg-board, .xox-board')) small.push(`${name(el)} ${shown.toFixed(1)}px "${el.textContent.trim().slice(0, 18)}"`);
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
  const b = stage.querySelector('.dama-board, .bg-board, .xox-board, .four-board');
  if (b) {
    const r = b.getBoundingClientRect();
    if (r.width < Math.min(260, box.width * 0.6) || r.height < 150) board = `${name(b)} ${Math.round(r.width)}×${Math.round(r.height)} in ${Math.round(box.width)}`;
  }
  const page = document.scrollingElement;
  return {
    stage: [Math.round(box.width), Math.round(box.height)],
    scrollers: [...new Set(scrollers)].slice(0, 6),
    small: [...new Set(small)].slice(0, 6),
    cut: [...new Set(cut)].slice(0, 6),
    board,
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
        if (g.board) {
          const has = await page.evaluate((b) => document.querySelector(`#game-stage .cl-box[data-board="${b}"].on`) !== null, g.board);
          if (!has) {
            await page.evaluate(() => document.querySelector('#cl-shelf-open')?.click());
            await wait(300);
            await page.evaluate((b) => document.querySelector(`#game-stage .cl-box[data-board="${b}"]`)?.click(), g.board);
            await wait(1200);
          }
        }
        const m = await page.evaluate(measure, MAY_SCROLL);
        await page.screenshot({ path: path.join(SHOTS, `${size}-${lang}-${game}.png`) });
        if (m.missing) {
          check(false, `${label}: the game window shows`);
          continue;
        }
        check(m.scrollers.length === 0, `${label}: no scrollbar inside (${m.stage.join('×')})`, m.scrollers.join(' | '));
        check(m.small.length === 0, `${label}: no text under 13 px`, m.small.join(' | '));
        check(m.cut.length === 0, `${label}: nothing cut off`, m.cut.join(' | '));
        check(!m.board, `${label}: the board is a fair size`, m.board);
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
