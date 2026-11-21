// DG2 (owner, 21 Nov 2026): Draw & Guess in the video's place and in the free window. Bug: when a drawing ended, the
// results view (the word and the round's points over the canvas) did not fit the clipped overlay, so the stage scaled the
// whole game down again and again (≈ 10 % of its box). Three players (this page + two fake guests on the game socket):
// lobby → choose → draw → reveal with everyone's points → the podium. At every phase the canvas keeps one size, stays
// 4 : 3, is the biggest part of the box, the game's scale does not drop, the side column stays narrow, the chat's text is
// readable and nothing is cut; the Test Lab's eight-player preview (`draw.reveal8`) fits too. Laptop 1366, desktop 1920
// and a phone (its Games tab: the canvas keeps its size there too).
//
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 --var SWM_LAB_SERVER:1)
//   NODE_PATH=$(npm root -g) node scripts/harness/draw-layout/run.cjs [site]     (SIZES=laptop,desktop,phone SHOTS=dir GUESTS=2..7)
const { chromium, devices } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SITE = process.argv[2] || 'http://localhost:8787';
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'draw-layout-'));
const SIZES = {
  laptop: { viewport: { width: 1366, height: 768 } },
  desktop: { viewport: { width: 1920, height: 1080 } },
  phone: devices['iPhone 13'],
};
let fails = 0;
const check = (ok, label, extra) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra !== undefined && !ok ? ' → ' + JSON.stringify(extra) : ''}`);
  if (!ok) {
    fails++;
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=draw-layout::${label}`);
  }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 10000) {
  for (let i = 0; i < ms / 100; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await wait(100);
  }
  return null;
}

/** A fake guest at the table: picks the first word when it draws, guesses the word it is told. */
async function guest(GameSocket, url, name, cid, shared) {
  const ws = new GameSocket(url);
  let me = null;
  let last = null;
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, name, cid, lang: 'en' })));
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.t === 'welcome') me = m.you;
    if (m.t === 'choices') {
      shared.word = m.words[0];
      ws.send(JSON.stringify({ t: 'choose', index: 0 }));
    }
    if (m.t === 'state') last = m;
  });
  const ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ t: 'ping' })), 15000);
  return {
    guess: (text) => ws.send(JSON.stringify({ t: 'guess', text })),
    get drawing() {
      return !!last && last.phase === 'draw' && last.drawer === me;
    },
    close: () => {
      clearInterval(ping);
      ws.finished = true;
      ws.close();
    },
  };
}

const measure = (page) =>
  page.evaluate(() => {
    const stage = document.getElementById('game-stage');
    const r = (s) => {
      const e = stage.querySelector(s);
      if (!e || !e.offsetParent) return null;
      const b = e.getBoundingClientRect();
      return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), b: Math.round(b.bottom), r: Math.round(b.right) };
    };
    const feed = stage.querySelector('.draw-feed .draw-line');
    const fitEl = stage.querySelector('.game-fit');
    const overlay = stage.querySelector('.draw-overlay');
    return {
      box: r('.game-stage-body'),
      canvas: r('#draw-canvas'),
      wrap: r('.draw-canvas-wrap'),
      side: r('.draw-side'),
      fit: Number(getComputedStyle(stage).getPropertyValue('--fit')) || 1,
      inTab: stage.classList.contains('in-tab'),
      overlayCut: !!overlay && !overlay.hidden && overlay.scrollHeight > overlay.clientHeight + 1,
      gameCut: !!fitEl && (fitEl.scrollHeight > fitEl.clientHeight + 1 || fitEl.scrollWidth > fitEl.clientWidth + 1),
      // The chat's text on the screen (its font size times the game's scale).
      // (A phone's Games tab hides the chat while I draw: the tools take its room.)
      chatPx: !feed || !feed.offsetHeight ? null : Math.round(parseFloat(getComputedStyle(feed).fontSize) * (feed.getBoundingClientRect().height / feed.offsetHeight) * 10) / 10,
      gains: stage.querySelectorAll('.draw-gains li').length,
      // Every player's chip in the results is whole inside the canvas (none clipped by the list).
      gainsCut: [...stage.querySelectorAll('.draw-gains li')].filter((li) => {
        const a = li.getBoundingClientRect();
        const o = overlay.getBoundingClientRect();
        return a.top < o.top - 1 || a.bottom > o.bottom + 1 || a.left < o.left - 1 || a.right > o.right + 1 || a.bottom > li.parentElement.getBoundingClientRect().bottom + 1;
      }).length,
      // Every player's name in the side list shows at least a few letters.
      namesHidden: [...stage.querySelectorAll('.draw-pname')].filter((n) => n.offsetParent && n.scrollWidth > n.clientWidth + 1 && n.clientWidth < 24).length,
    };
  });

(async () => {
  const { GameSocket } = await import(path.join(__dirname, '../../e2e/game-socket.mjs'));
  const browser = await chromium.launch();
  for (const size of (process.env.SIZES || 'laptop,desktop,phone').split(',')) {
    const ctx = await browser.newContext(SIZES[size]);
    await ctx.addInitScript(() => {
      for (const [k, v] of Object.entries({ name: 'Robin', avatar: 'wizard', lang: 'en', 'opt:autoInvite': '0', tipsSeen: '1', 'draw:howSeen': '1' })) localStorage.setItem(k, v);
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => check(false, `${size}: no page error`, e.message));
    let gameUrl = null;
    page.on('websocket', (ws) => {
      if (/\/api\/draw\//.test(ws.url())) gameUrl = ws.url();
    });
    await page.goto(`${SITE}/r/dl${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
    await page.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 });
    await wait(2000);
    const run = (id) => page.evaluate((i) => window.__swmLab.run(i).then((l) => ({ dir: l.dir, text: l.text })), id);
    check((await run('games.open.draw')).dir === 'lab', `${size}: the table opens`);
    await page.waitForSelector('#game-stage .draw-page', { timeout: 15000 });
    if (size !== 'phone') {
      check(await until(() => page.evaluate(() => document.getElementById('game-stage').classList.contains('stage'))), `${size}: it opens in the video's place`);
    }
    await until(async () => gameUrl);
    const shared = { word: null };
    // GUESTS=7 fills the table (eight players: the reveal's longest list).
    const NAMES = ['Alex', 'Sam', 'Max', 'Kim', 'Lee', 'Jo', 'Pat'];
    const guests = [];
    for (const n of NAMES.slice(0, Number(process.env.GUESTS || 2))) guests.push(await guest(GameSocket, gameUrl, n, `dl${n}${size}0000001`.slice(0, 20), shared));
    await until(() => page.evaluate(() => (document.querySelector('#game-stage .lobby-players')?.textContent ?? '').includes('Sam')));
    const shot = async (label) => {
      await wait(700);
      const m = await measure(page);
      await page.screenshot({ path: path.join(SHOTS, `${size}-${label}.png`) });
      return m;
    };
    // The Test Lab's preview: the results with eight players (made up, on this screen only).
    check((await run('draw.reveal8')).dir === 'lab', `${size}: the Test Lab previews the results with 8 players`);
    await until(() => page.evaluate(() => document.querySelectorAll('#game-stage .draw-gains li').length === 8));
    const preview = await shot('reveal8');
    await until(() => page.evaluate(() => !!document.querySelector('#game-stage .draw-lobby')), 12000);
    await page.evaluate(() => [...document.querySelectorAll('#game-stage button')].find((b) => !b.disabled && /start/i.test(b.textContent))?.click());
    const seen = {};
    // Two turns: the page draws in one of them (its tools beside the canvas), the guests in the other.
    for (let turn = 0; turn < 3 && !(seen.drawMine && seen.drawOther && seen.reveal); turn++) {
      await until(() => page.evaluate(() => document.querySelector('#game-stage .draw-overlay')?.hidden || !!document.querySelector('#game-stage .draw-choices')), 15000);
      // The page's own turn: pick the first word.
      await page.evaluate(() => document.querySelector('#game-stage .draw-choices .btn')?.click());
      await until(() => page.evaluate(() => document.querySelector('#game-stage .draw-overlay')?.hidden), 15000);
      const mine = await page.evaluate(() => !document.querySelector('#game-stage #draw-tools').hidden);
      const m = await shot(mine ? 'draw-mine' : 'draw-other');
      seen[mine ? 'drawMine' : 'drawOther'] = m;
      // Everyone guesses: the guests the word the drawer has (mine: the hint shows it; theirs: they picked it).
      const word = mine ? await page.evaluate(() => document.querySelector('#draw-hint').textContent.trim()) : shared.word;
      for (const g of guests) if (!g.drawing) g.guess(word);
      if (!mine) await page.evaluate((w) => {
        const input = document.querySelector('#draw-input');
        input.value = w;
        input.form.requestSubmit();
      }, word);
      const revealed = await until(() => page.evaluate(() => document.querySelectorAll('#game-stage .draw-gains li').length >= 3), 15000);
      if (revealed && !seen.reveal) seen.reveal = await shot('reveal');
      await until(() => page.evaluate(() => !document.querySelector('#game-stage .draw-gains')), 15000);
    }
    await run('draw.toEnd');
    await until(() => page.evaluate(() => !!document.querySelector('#game-stage .gr-layer:not([hidden]), #game-stage .draw-lobby')), 30000);
    const over = await shot('over');

    const { drawMine, drawOther, reveal } = seen;
    check(drawMine && drawOther && reveal, `${size}: saw my drawing turn, theirs and a reveal with 3 players' points`, Object.keys(seen));
    if (drawMine && drawOther && reveal) {
      const ratio = (m) => m.canvas.w / m.canvas.h;
      for (const [label, m] of Object.entries({ drawMine, drawOther, reveal })) {
        check(Math.abs(ratio(m) - 4 / 3) < 0.03, `${size}/${label}: the canvas is 4 : 3`, m.canvas);
        check(!m.gameCut && !m.overlayCut, `${size}/${label}: nothing is cut`, m);
        if (m.chatPx !== null) check(m.chatPx >= (size === 'phone' ? 12 : 14), `${size}/${label}: the chat is readable (${m.chatPx} px)`);
      }
      // The results bug: the reveal keeps the drawing's size and scale.
      check(Math.abs(reveal.canvas.w - drawOther.canvas.w) <= 2 && Math.abs(reveal.fit - drawOther.fit) < 0.01, `${size}: the reveal keeps the canvas size (${reveal.canvas.w}×${reveal.canvas.h} @${reveal.fit.toFixed(2)} vs ${drawOther.canvas.w}×${drawOther.canvas.h} @${drawOther.fit.toFixed(2)})`);
      check(preview.gains === 8 && preview.gainsCut === 0 && !preview.overlayCut, `${size}: eight players' results fit the canvas (${preview.gainsCut} cut)`, preview);
      // (A phone's Games tab lists the players above the canvas: eight of them take more rows than three, so there only
      // the scale is compared.)
      check(Math.abs(preview.fit - drawOther.fit) < 0.01 && (size === 'phone' || Math.abs(preview.canvas.w - drawOther.canvas.w) <= 2), `${size}: eight players' results keep the game's size (@${preview.fit.toFixed(2)}, ${preview.canvas.w} px)`);
      check(reveal.gains >= 3, `${size}: the reveal lists 3 players' points (${reveal.gains})`);
      check(reveal.gainsCut === 0, `${size}: every player's points show whole in the results (${reveal.gainsCut} cut)`);
      check(drawOther.namesHidden === 0, `${size}: every name in the players list shows (${drawOther.namesHidden} hidden)`);
      // The drawer's tools do not shrink the canvas below the guessers' one by much.
      check(drawMine.canvas.h >= drawOther.canvas.h * 0.8, `${size}: the drawer's canvas stays big (${drawMine.canvas.w}×${drawMine.canvas.h} vs ${drawOther.canvas.w}×${drawOther.canvas.h})`);
      if (size !== 'phone') {
        const area = (drawOther.canvas.w * drawOther.canvas.h) / (drawOther.box.w * drawOther.box.h);
        check(area >= 0.4, `${size}: the canvas is the biggest part of the box (${Math.round(area * 100)} %)`);
        check(drawOther.side.w <= drawOther.box.w * 0.34, `${size}: the side column is narrow (${drawOther.side.w} of ${drawOther.box.w})`);
        check(drawMine.canvas.w * drawMine.canvas.h >= drawMine.box.w * drawMine.box.h * 0.33, `${size}: the drawer's canvas is big too`);
      }
    }
    check(!!over && !over.gameCut, `${size}: the podium fits`, over);
    for (const g of guests) g.close();
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `\n${fails} FAIL · shots in ${SHOTS}` : `\nall ok · shots in ${SHOTS}`);
  process.exit(fails ? 1 : 0);
})();
