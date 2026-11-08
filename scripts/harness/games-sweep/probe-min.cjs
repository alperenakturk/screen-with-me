// Card GW helper (not in CI): finds, for every game, the smallest free window (in the game's own shape) where the game
// still shows at scale 1 with no text under 13 px. Prints catalog-ready minSize values.
const { chromium } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:5173';
const GAMES = {
  picker: { table: 'classics', picker: true }, xox: { table: 'classics', board: 'xox' }, four: { table: 'classics', board: 'four' },
  dama: { table: 'classics', board: 'dama' }, chess: { table: 'classics', board: 'chess' }, backgammon: { table: 'classics', board: 'backgammon' },
  reversi: { table: 'classics', board: 'reversi' }, draw: { table: 'draw' }, quiz: { table: 'quiz' }, poker: { table: 'poker' }, sea: { table: 'sea' },
  seaPlay: { table: 'sea', play: true }, snack: { solo: 'snack' }, garden: { solo: 'garden' }, word: { solo: 'word' },
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx.addInitScript((lang) => {
    for (const [k, v] of Object.entries({ lang, name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', 'snackBar:howSeen': '1', 'windowGarden:howSeen': '1', 'fiveFrames:howSeen': '1' })) localStorage.setItem(k, v);
  }, process.env.LANG2 || 'en');
  const page = await ctx.newPage();
  await page.goto(`${SITE}/r/pm${Math.random().toString(36).slice(2, 7)}?debug=1#back`);
  await page.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 });
  await wait(3000);
  const run = (id, arg) => page.evaluate(([id, arg]) => window.__swmLab.run(id, arg).then((l) => l.text), [id, arg]);
  for (const name of (process.env.GAMES || Object.keys(GAMES).join(',')).split(',')) {
    const g = GAMES[name];
    await run(`games.open.${g.table ?? g.solo}`);
    await wait(2000);
    if (g.picker) { await page.evaluate(() => { const b = document.querySelector('#game-stage #cl-shelf-open'); if (b && !b.hidden) b.click(); }); await wait(600); }
    if (g.board) {
      const has = await page.evaluate((b) => document.querySelector(`#game-stage .cl-box[data-board="${b}"].on`) !== null, g.board);
      if (!has) { await page.evaluate(() => document.querySelector('#cl-shelf-open')?.click()); await wait(300); await page.evaluate((b) => document.querySelector(`#game-stage .cl-box[data-board="${b}"]`)?.click(), g.board); await wait(1200); }
    }
    if (g.play) { await run('sea.bot'); await page.waitForFunction(() => { if (document.querySelector('#game-stage .sea')?.dataset.phase === 'play') return true; document.querySelector('#game-stage .sea-ready-btn:not(:disabled)')?.click(); return false; }, null, { timeout: 10000, polling: 500 }).catch(() => {}); await wait(600); }
    // The window's own size now (the game's `size`), then shrink in its shape until the scale drops or text gets small.
    const own = await page.evaluate(() => { const r = document.querySelector('#game-stage').getBoundingClientRect(); return [r.width, r.height]; });
    let best = 1;
    for (let z = 1; z >= 0.5; z -= 0.01) {
      const ok = await page.evaluate(async ([w, h]) => {
        const s = document.querySelector('#game-stage');
        s.style.width = `${w}px`;
        s.style.height = `${h}px`;
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 60))));
        const fit = Number(getComputedStyle(s).getPropertyValue('--fit')) || 1;
        let small = false;
        for (const el of s.querySelectorAll('*')) {
          const st = getComputedStyle(el);
          if (st.display === 'none' || st.visibility === 'hidden') continue;
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          if (!own || el.closest('[aria-hidden="true"], svg, .dama-board, .chess-board, .bg-board, .xox-board, .sea-grid')) continue;
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          if (parseFloat(st.fontSize) * fit < 12.8) small = true;
        }
        // The sweep's rule: the board is the game and takes a fair share of the window.
        const boards = [...s.querySelectorAll('.dama-board, .bg-board, .xox-board, .four-board, .sea-grid')];
        const b = boards.find((x) => x.getBoundingClientRect().width > 0);
        const box = s.getBoundingClientRect();
        const fair = !b || b.closest('[hidden]') || (b.getBoundingClientRect().width >= Math.min(260, box.width * 0.6) && b.getBoundingClientRect().height >= 150);
        // Nothing in the head is cut off.
        const head = s.querySelector('.game-stage-head');
        const headOk = [...head.querySelectorAll('button')].every((x) => x.hidden || x.getBoundingClientRect().width === 0 || x.getBoundingClientRect().right <= box.right + 1);
        return fit >= 0.999 && !small && fair && headOk;
      }, [own[0] * z, own[1] * z]);
      if (!ok) break;
      best = z;
    }
    console.log(`${name}: own ${own.map(Math.round).join('×')} → smallest ${Math.ceil(own[0] * best)}×${Math.ceil(own[1] * best)} (zoom ${best.toFixed(2)})`);
    await page.evaluate(() => { const s = document.querySelector('#game-stage'); s.style.width = ''; s.style.height = ''; dispatchEvent(new Event('resize')); });
  }
  await browser.close();
})();
