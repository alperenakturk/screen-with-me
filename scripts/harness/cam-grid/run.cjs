// Card CAM3 (owner, 21 Nov 2026): the camera window.
//  1. A fresh browser and an old one (with "free" saved by an earlier default) both start in the one window (framed).
//  2. 1–8 cameras (Test Lab `camera.grid`, drawn cameras) at three window shapes: rows never hold more cameras lower
//     down, every tile is the same size, 4:3, inside the window, none overlapping; 4 = 2 × 2, 5 = 3 + 2.
//  3. The window resizes from all eight handles (each edge and corner moves the right sides); free tiles resize from
//     their edges too and keep the camera's shape.
//  4. Card VC4: past 4 cameras the chat shows one note per room (Test Lab `voice.crowdNote`), even with activity hidden.
//
//   built site on wrangler dev:  node scripts/harness/cam-grid/run.cjs http://localhost:8787 [screenshot folder]
const { chromium } = require('playwright');
const fs = require('fs');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || '';
if (OUT) fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
const check = (ok, label, extra) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra !== undefined ? ` → ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : ''}`);
  if (!ok) fails++;
};
const until = async (fn, ms = 10000) => {
  for (let i = 0; i < ms / 200; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
};

async function open(browser, saved, viewport = { width: 1366, height: 768 }) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript((saved) => {
    if (!sessionStorage.getItem('lab:seeded')) {
      sessionStorage.setItem('lab:seeded', '1');
      Object.assign(localStorage, { lang: 'en', tipsSeen: '1', 'opt:autoInvite': '0' }, saved);
    }
  }, saved);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${SITE}/?debug=1`);
  await page.waitForFunction(() => sessionStorage.getItem('swm:debug') === '1', null, { timeout: 10000 });
  await page.goto(`${SITE}/r/grid${Math.random().toString(36).slice(2, 7)}`);
  await page.fill('#name', 'Alex');
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await until(() => page.evaluate(() => !!window.__swmLab));
  return { page, ctx, errors };
}

/** The window, its tiles and the rows they form (tiles grouped by their top edge). */
const GRID = () => {
  const box = document.getElementById('voice-cams');
  const b = box.getBoundingClientRect();
  const tiles = [...box.querySelectorAll('.cam-tile')].map((t) => {
    const r = t.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  const rows = [];
  for (const t of [...tiles].sort((p, q) => p.y - q.y)) {
    const row = rows.find((r) => Math.abs(r.y - t.y) < 3);
    if (row) row.n++;
    else rows.push({ y: t.y, n: 1 });
  }
  return { free: box.classList.contains('free'), hidden: box.hidden, box: { x: b.left, y: b.top, w: b.width, h: b.height }, tiles, rows: rows.map((r) => r.n) };
};

function gridOk(g) {
  const why = [];
  const sum = g.rows.reduce((a, b) => a + b, 0);
  if (sum !== g.tiles.length) why.push('rows');
  for (let i = 1; i < g.rows.length; i++) if (g.rows[i] > g.rows[i - 1]) why.push(`row ${i + 1} has more`);
  const w0 = g.tiles[0]?.w ?? 0;
  for (const t of g.tiles) {
    if (Math.abs(t.w - w0) > 1.5) why.push('sizes differ');
    if (Math.abs(t.w / t.h - 4 / 3) > 0.03) why.push(`not 4:3 (${t.w}×${t.h})`);
    if (t.x < g.box.x - 1 || t.y < g.box.y - 1 || t.x + t.w > g.box.x + g.box.w + 1 || t.y + t.h > g.box.y + g.box.h + 1) why.push('outside');
  }
  for (let i = 0; i < g.tiles.length; i++) {
    for (let j = i + 1; j < g.tiles.length; j++) {
      const a = g.tiles[i];
      const b = g.tiles[j];
      if (a.x + 1 < b.x + b.w && b.x + 1 < a.x + a.w && a.y + 1 < b.y + b.h && b.y + 1 < a.y + a.h) why.push('overlap');
    }
  }
  return why;
}

/** Drags from the middle of `selector` by (dx, dy). */
async function pull(page, selector, dx, dy) {
  const r = await page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  }, selector);
  if (!r) return false;
  await page.mouse.move(r.x, r.y);
  await page.mouse.down();
  await page.mouse.move(r.x + dx / 2, r.y + dy / 2, { steps: 4 });
  await page.mouse.move(r.x + dx, r.y + dy, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  return true;
}

(async () => {
  const browser = await chromium.launch();

  // 1. Fresh and old profiles start framed.
  const fresh = await open(browser, {});
  await fresh.page.evaluate(() => window.__swmLab.run('camera.grid', '2'));
  const f = await fresh.page.evaluate(GRID);
  check(!f.hidden && !f.free, 'a fresh browser starts in the one window (framed)', f);
  await fresh.ctx.close();
  const old = await open(browser, { 'opt:camLayout': 'free' });
  await old.page.evaluate(() => window.__swmLab.run('camera.grid', '2'));
  const o = await old.page.evaluate(GRID);
  check(!o.hidden && !o.free, 'an old browser with "free" saved also starts in the one window', o);
  await old.ctx.close();

  // 2. The grid rule at three shapes.
  const { page, errors } = await open(browser, {});
  await page.evaluate(() => window.__swmLab.run('camera.grid', '4'));
  const shapes = [
    ['wide', { w: 620, h: 300 }],
    ['4:3', { w: 480, h: 380 }],
    ['tall', { w: 240, h: 520 }],
  ];
  for (const [label, want] of shapes) {
    // Size the window with its bottom-right handle (from its current size to the wanted one).
    const now = await page.evaluate(GRID);
    // Move it to the top left first so it has room to grow.
    await pull(page, '#voice-cams .cam-bar-title', 40 - now.box.x, 70 - now.box.y);
    const at = await page.evaluate(GRID);
    await pull(page, '#voice-cams .cam-resize', want.w - at.box.w, want.h - at.box.h);
    const sized = await page.evaluate(GRID);
    check(Math.abs(sized.box.w - want.w) < 12 && Math.abs(sized.box.h - want.h) < 12, `${label}: the window takes the size pulled to`, { want, got: sized.box });
    for (let n = 1; n <= 8; n++) {
      const out = await page.evaluate((n) => window.__swmLab.run('camera.grid', String(n)), n);
      await page.waitForTimeout(60);
      const g = await page.evaluate(GRID);
      const why = gridOk(g);
      check(g.tiles.length === n && why.length === 0, `${label}, ${n} camera${n > 1 ? 's' : ''}: rows ${g.rows.join(' + ')}, same size, 4:3, inside, apart`, { why, g, out });
      if (label === '4:3' && n === 4) check(g.rows.join() === '2,2', '4:3 window, 4 cameras: 2 × 2', g.rows);
      if (label === '4:3' && n === 5) check(g.rows.join() === '3,2', '4:3 window, 5 cameras: 3 + 2', g.rows);
      if (label === 'wide' && n === 2) check(g.rows.join() === '2', 'wide window, 2 cameras: side by side', g.rows);
      if (label === 'tall' && n === 2) check(g.rows.join() === '1,1', 'tall window, 2 cameras: stacked', g.rows);
      if (OUT && [4, 5, 8].includes(n)) await page.screenshot({ path: `${OUT}/grid-${label.replace(':', 'x')}-${n}.png` });
    }
  }

  // 3. All eight handles.
  await page.evaluate(() => window.__swmLab.run('camera.grid', '4'));
  await pull(page, '#voice-cams .cam-bar-title', 400 - (await page.evaluate(GRID)).box.x, 200 - (await page.evaluate(GRID)).box.y);
  const start = (await page.evaluate(GRID)).box;
  await pull(page, '#voice-cams .cam-resize', 360 - start.w, 280 - start.h);
  const moves = {
    n: [0, -40, (a, b) => b.y < a.y - 30 && Math.abs(b.y + b.h - (a.y + a.h)) < 3 && Math.abs(b.w - a.w) < 3],
    s: [0, 40, (a, b) => b.h > a.h + 30 && Math.abs(b.y - a.y) < 3],
    e: [40, 0, (a, b) => b.w > a.w + 30 && Math.abs(b.x - a.x) < 3],
    w: [-40, 0, (a, b) => b.x < a.x - 30 && Math.abs(b.x + b.w - (a.x + a.w)) < 3],
    ne: [40, -40, (a, b) => b.w > a.w + 30 && b.y < a.y - 30 && Math.abs(b.x - a.x) < 3],
    nw: [-40, -40, (a, b) => b.x < a.x - 30 && b.y < a.y - 30 && Math.abs(b.x + b.w - (a.x + a.w)) < 3],
    se: [40, 40, (a, b) => b.w > a.w + 30 && b.h > a.h + 30 && Math.abs(b.x - a.x) < 3 && Math.abs(b.y - a.y) < 3],
    sw: [-40, 40, (a, b) => b.x < a.x - 30 && b.h > a.h + 30 && Math.abs(b.y - a.y) < 3],
  };
  for (const [edge, [dx, dy, ok]] of Object.entries(moves)) {
    const a = (await page.evaluate(GRID)).box;
    const found = await pull(page, `#voice-cams > [data-edge='${edge}']`, dx, dy);
    const g = await page.evaluate(GRID);
    check(found && ok(a, g.box) && gridOk(g).length === 0, `the window resizes from its ${edge} handle (the grid follows)`, { a, b: g.box, why: gridOk(g) });
  }
  check(!!(await page.evaluate(() => localStorage.getItem('camFloat:spot'))), 'the size is remembered');
  if (OUT) await page.screenshot({ path: `${OUT}/handles.png` });

  // Free tiles: edges resize and keep the camera's shape.
  await page.evaluate(() => document.querySelector('#voice-cams .cam-layout').click());
  await page.waitForTimeout(300);
  const before = await page.evaluate(GRID);
  check(before.free && before.tiles.length === 4, 'the free layout is one press away', before);
  await pull(page, '#voice-cams .cam-tile', -400, 120);
  const sel = '#voice-cams .cam-tile';
  const t0 = (await page.evaluate(GRID)).tiles[0];
  for (const [edge, dx, dy, grow] of [['w', -50, 0, true], ['n', 0, -40, true], ['e', -30, 0, false], ['sw', -40, 30, true]]) {
    const a = (await page.evaluate(GRID)).tiles[0];
    await page.hover(sel);
    const found = await pull(page, `${sel} [data-edge='${edge}']`, dx, dy);
    const b = (await page.evaluate(GRID)).tiles[0];
    const ratio = Math.abs(b.w / b.h - 4 / 3) < 0.03;
    check(found && ratio && (grow ? b.w > a.w + 20 : b.w < a.w - 15), `a free tile resizes from its ${edge} edge and stays 4:3`, { a, b });
  }
  check(t0.w > 0, 'free tile measured');
  if (OUT) await page.screenshot({ path: `${OUT}/free.png` });
  await page.evaluate(() => document.querySelector('#voice-cams .cam-layout').click());
  check(await page.evaluate(() => localStorage.getItem('opt:camView') === 'group'), 'the switch is saved under the new key');
  // Card VC4: past 4 cameras the chat says once per room that slow connections may struggle, visible even while room
  // activity lines are hidden; a second time it stays quiet.
  await page.evaluate(() => localStorage.setItem('opt:chatEvents', '0'));
  const first = await page.evaluate(() => window.__swmLab.run('voice.crowdNote', '5 5'));
  const note = await page.evaluate(() => {
    const n = document.querySelector('.chat-list .chat-note');
    return n ? { shown: n.getBoundingClientRect().height > 0, text: n.textContent, hidden: document.querySelector('.chat-list').classList.contains('hide-events') } : null;
  });
  check(!!note && note.shown && /4 cameras/.test(note.text), 'VC4: 5 cameras put one note in the chat, shown even with room activity hidden', { first, note });
  const again = await page.evaluate(() => window.__swmLab.run('voice.crowdNote', '6 6'));
  const count = await page.evaluate(() => document.querySelectorAll('.chat-list .chat-note').length);
  check(count === 1, 'VC4: the note comes once per room', { again, count });
  const within = await page.evaluate(() => window.__swmLab.run('voice.crowdNote', 'reset').then(() => window.__swmLab.run('voice.crowdNote', '4 6')));
  check(await page.evaluate(() => document.querySelectorAll('.chat-list .chat-note').length) === 1, 'VC4: 4 cameras and 6 in voice are within what we recommend (no note)', within);
  check(errors.length === 0, 'no page errors', errors);

  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nall passed');
  process.exit(fails ? 1 : 0);
})();
