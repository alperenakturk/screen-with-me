// The game window's head and free window (owner's bugs W1–W5, 10 Nov 2026): every head button does its job.
// Checks, on a computer (1366 × 768 and 1920 × 1080) and a phone:
//   W1  Snack Bar has no ⛶ (and Escape / a lab call can't put it on the whole screen); the other games keep theirs.
//   W2  "In the video's place" works with no video and with a video file; over a YouTube video the switch is gone (only
//       the free window is possible) and the head says why.
//   W3  The head's 🎮 opens the games hall right under itself, visible, in the free window, in the video's place and in
//       a table's own full screen; pressed again it closes.
//   W5  The free window follows a drag of its head (over a video file it may cover the video, nothing pushes it away);
//       over a YouTube player it never covers it and never jumps while dragged; each game remembers its own spot and
//       size; ✕ and 🎮 bring it back in the same spot; a double click on the head puts it back; the corner resizes it.
//
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 --var SWM_LOCAL_UNPACED:1 --var SWM_LAB_SERVER:1)
//   node scripts/harness/game-window-head/run.cjs [site]
const { chromium, devices } = require('playwright');
const { viaYouTube } = require('../via-youtube.cjs');

const SITE = process.argv[2] || 'http://localhost:8787';
const VIDEO = `${SITE}/sample.mp4`;
const YOUTUBE = 'https://www.youtube.com/watch?v=M7lc1UVf-VE';
let fails = 0;
const check = (ok, label, extra) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra !== undefined && !ok ? ' → ' + JSON.stringify(extra) : ''}`);
  if (!ok) fails++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 8000) {
  for (let i = 0; i < ms / 100; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await wait(100);
  }
  return null;
}

async function room(browser, viewport, { phone = false } = {}) {
  const ctx = await browser.newContext(phone ? { ...devices['Pixel 7'] } : { viewport });
  await viaYouTube(ctx);
  await ctx.addInitScript(() => {
    for (const [k, v] of Object.entries({ lang: 'en', name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', 'snackBar:howSeen': '1', 'windowGarden:howSeen': '1', 'fiveFrames:howSeen': '1', 'classics:chess:howSeen': '1' })) localStorage.setItem(k, v);
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${SITE}/r/gh${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
  await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#media-input'), null, { timeout: 20000 });
  await wait(1200);
  return { ctx, page, errors };
}
const openGame = async (page, kind) => {
  await page.evaluate((k) => window.__swmLab.run(`games.open.${k}`), kind);
  await until(() => page.evaluate(() => !document.getElementById('game-stage').hidden && !document.querySelector('#game-stage .game-stage-loading')));
  await page.evaluate(() => document.querySelector('#game-stage .htp:not([hidden]) .htp-skip')?.click());
  await wait(500);
};
const load = async (page, url, youtube = false) => {
  await page.fill('#media-input', url);
  await page.evaluate(() => (document.querySelector('#media-form button[value="load"]') ?? document.querySelector('#media-form button')).click());
  if (youtube) return until(() => page.evaluate(() => document.getElementById('theater').classList.contains('yt-rail')), 15000);
  return until(() => page.evaluate(() => !!document.querySelector('.room.has-item, #theater video')), 10000);
};
const box = (page) =>
  page.evaluate(() => {
    const s = document.getElementById('game-stage');
    const r = s.getBoundingClientRect();
    const t = document.getElementById('theater').getBoundingClientRect();
    const v = document.querySelector('.player-wrap').getBoundingClientRect();
    const hit = (a) => r.left < a.right - 1 && a.left < r.right - 1 && r.top < a.bottom - 1 && a.top < r.bottom - 1;
    return {
      x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      hidden: s.hidden, mode: ['float', 'stage', 'below', 'full'].find((m) => s.classList.contains(m)),
      overPlayer: hit(t), overVideo: hit(v), onScreen: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
      inVideo: s.parentElement?.classList.contains('player-wrap') ?? false,
    };
  });
const visible = (page, sel) =>
  page.evaluate((q) => {
    const e = document.querySelector(q);
    if (!e || e.hidden || e.closest('[hidden]')) return false;
    const r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(20, r.height / 2));
    return !!top && e.contains(top);
  }, sel);
/** Drags the window's head by (dx, dy) in `steps` moves; returns the window's box after each move. */
async function dragHead(page, dx, dy, steps = 12) {
  const h = await page.evaluate(() => {
    const r = document.querySelector('#game-stage .game-stage-title').getBoundingClientRect();
    return { x: r.left + 12, y: r.top + r.height / 2 };
  });
  await page.mouse.move(h.x, h.y);
  await page.mouse.down();
  const path = [];
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(h.x + (dx * i) / steps, h.y + (dy * i) / steps);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    path.push(await box(page));
  }
  await page.mouse.up();
  await wait(200);
  return path;
}
const dblHead = (page) => page.evaluate(() => document.querySelector('#game-stage .game-stage-title').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
const near = (a, b, d = 3) => Math.abs(a.x - b.x) <= d && Math.abs(a.y - b.y) <= d && Math.abs(a.w - b.w) <= d && Math.abs(a.h - b.h) <= d;

(async () => {
  const browser = await chromium.launch();

  // ---- 1366 × 768, no video, then a video file ----
  {
    const { ctx, page, errors } = await room(browser, { width: 1366, height: 768 });
    const L = '1366';
    await openGame(page, 'snack');
    check(!(await visible(page, '#game-stage .game-full')), `${L} W1: Snack Bar has no ⛶`);
    await page.keyboard.press('Escape');
    check(!(await page.evaluate(() => document.getElementById('game-stage').classList.contains('game-max') || !!document.fullscreenElement)), `${L} W1: nothing puts Snack Bar on the whole screen`);
    // W3: 🎮 in the free window's head.
    await page.click('#game-stage .game-hub-open');
    check(!!(await until(() => visible(page, '#game-menu'), 3000)), `${L} W3: 🎮 in the free window opens the hall, visible`);
    const menuBelow = await page.evaluate(() => document.getElementById('game-menu').getBoundingClientRect().top >= document.querySelector('#game-stage .game-hub-open').getBoundingClientRect().bottom - 1);
    check(menuBelow, `${L} W3: the hall hangs under the 🎮 pressed`);
    await page.click('#game-stage .game-hub-open');
    check(await page.evaluate(() => document.getElementById('game-menu').hidden), `${L} W3: 🎮 again closes the hall`);
    // W2: in the video's place, with no video.
    await page.click('#game-stage .place-stage');
    await wait(400);
    let b = await box(page);
    check(b.mode === 'stage' && b.inVideo && b.w > 600, `${L} W2: "in the video's place" (no video) puts Snack Bar in the video's frame`, b);
    await page.click('#game-stage .game-hub-open');
    check(!!(await until(() => visible(page, '#game-menu'), 3000)), `${L} W3: 🎮 in the video's place opens the hall, visible`);
    await page.keyboard.press('Escape');
    await page.click('#game-stage .place-float');
    await wait(300);
    // A video file: the video's place, then the free window over the video.
    check(!!(await load(page, VIDEO)), `${L}: the room plays a video file`);
    await page.click('#game-stage .place-stage');
    await wait(400);
    b = await box(page);
    check(b.mode === 'stage' && b.inVideo, `${L} W2: "in the video's place" (video file) works`, b);
    await page.click('#game-stage .place-float');
    await wait(400);
    const start = await box(page);
    check(start.mode === 'float', `${L}: back to the free window`, start);
    // W5: a drag onto the video: the window follows the mouse every step and may cover the video.
    const path = await dragHead(page, -560, 40);
    const smooth = path.every((p, i) => i === 0 || (p.x < path[i - 1].x && path[i - 1].x - p.x < 80));
    const end = path[path.length - 1];
    check(smooth && Math.abs(end.x - (start.x - 560)) <= 3, `${L} W5: the window follows a drag of its head smoothly`, path.map((p) => p.x));
    await wait(300);
    const dropped = await box(page);
    check(dropped.overVideo && near(dropped, end), `${L} W5: dropped over a video file it stays there (no pushing away)`, dropped);
    // Resize from the corner.
    const grip = await page.$('#game-stage .game-resize');
    const g = await grip.boundingBox();
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await page.mouse.down();
    await page.mouse.move(g.x + 60, g.y + 80, { steps: 6 });
    await page.mouse.up();
    await wait(300);
    const grown = await box(page);
    check(grown.w > dropped.w + 20 && grown.x === dropped.x && grown.y === dropped.y, `${L} W5: the corner resizes it, its top-left stays`, { dropped, grown });
    // Each game keeps its own spot: Window Garden opens at its own place, Snack Bar comes back to its own.
    await openGame(page, 'garden');
    const garden = await box(page);
    check(!near(garden, grown, 20), `${L} W5: another game keeps its own spot`, { garden, snack: grown });
    await openGame(page, 'snack');
    check(near(await box(page), grown), `${L} W5: Snack Bar comes back to its own spot and size`, { now: await box(page), grown });
    // ✕ then 🎮: back in the same spot.
    await page.click('#game-stage .game-minimize');
    await wait(300);
    await page.evaluate(() => (document.querySelector('#dock-game') ?? document.querySelector('#game-btn')).click());
    await until(() => page.evaluate(() => !document.getElementById('game-stage').hidden));
    await wait(300);
    check(near(await box(page), grown), `${L} W5: ✕ and back: the same spot`, await box(page));
    // A reload remembers it.
    await page.reload();
    await page.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 });
    await wait(1200);
    await openGame(page, 'snack');
    check(near(await box(page), grown), `${L} W5: after a reload Snack Bar opens where I left it`, await box(page));
    // Double click on the head: its own size, back home.
    await dblHead(page);
    await wait(300);
    const home = await box(page);
    check(home.w === 400 && home.x + home.w >= 1366 - 10, `${L} W5: a double click on the head puts it back (own size, right edge)`, home);
    // The lab's reset does the same.
    await dragHead(page, -300, 0, 4);
    await page.evaluate(() => window.__swmLab.run('gameWindow.reset'));
    await wait(300);
    check(near(await box(page), home), `${L}: the Test Lab's "back to its own size and spot" works`, await box(page));
    // A table keeps ⛶; its 🎮 opens the hall even in the game's own full screen.
    await openGame(page, 'classics');
    check(await visible(page, '#game-stage .game-full'), `${L} W1: a table (Classics) keeps ⛶`);
    await page.click('#game-stage .game-full');
    await until(() => page.evaluate(() => document.fullscreenElement?.id === 'game-stage'));
    await page.click('#game-stage .game-hub-open');
    check(!!(await until(() => visible(page, '#game-menu'), 3000)), `${L} W3: 🎮 in a table's full screen opens the hall, visible`);
    // Switching to Snack Bar from there leaves the full screen (Snack Bar never has it).
    await page.evaluate(() => document.querySelector('#game-menu [data-tab="side"]')?.click());
    await until(() => page.evaluate(() => !!document.querySelector('#game-menu [data-solo="snack"]')));
    await page.evaluate(() => document.querySelector('#game-menu [data-solo="snack"]').click());
    const out = await until(() => page.evaluate(() => !document.fullscreenElement && !document.getElementById('game-stage').classList.contains('game-max') && !document.getElementById('game-stage').hidden));
    check(!!out, `${L} W1: switching to Snack Bar from a table's full screen leaves it`);
    check(!errors.length, `${L}: no page errors`, errors.slice(0, 2));
    await ctx.close();
  }

  // ---- YouTube, two screen sizes ----
  for (const [L, viewport] of [['1366 YouTube', { width: 1366, height: 768 }], ['1920 YouTube', { width: 1920, height: 1080 }]]) {
    const { ctx, page, errors } = await room(browser, viewport);
    check(!!(await load(page, YOUTUBE, true)), `${L}: the room plays a YouTube video`);
    for (const kind of ['snack', 'classics']) {
      await openGame(page, kind);
      const b = await box(page);
      const head = await page.evaluate(() => ({ title: document.querySelector('#game-stage .game-stage-head').title, switchShown: !document.querySelector('#game-stage .game-place').hidden }));
      check(b.mode === 'float' && !b.overPlayer, `${L} ${kind}: opens beside the player`, b);
      check(!head.switchShown && /YouTube/.test(head.title), `${L} ${kind} W2: no placement switch over YouTube; the head says why`, head);
      // Drag it right across the player: never over it, never a jump.
      const path = await dragHead(page, -viewport.width, 60, 16);
      const over = path.filter((p) => p.overPlayer);
      const jumps = path.filter((p, i) => i > 0 && Math.hypot(p.x - path[i - 1].x, p.y - path[i - 1].y) > viewport.width / 16 + 40);
      check(!over.length && path.every((p) => p.onScreen), `${L} ${kind} W5: dragged onto the player it never covers it`, over[0]);
      check(!jumps.length, `${L} ${kind} W5: … and it never jumps while dragged`, path.map((p) => [p.x, p.y]));
      await wait(300);
      const after = await box(page);
      check(!after.overPlayer && after.onScreen, `${L} ${kind} W5: dropped, it settles beside the player`, after);
      await page.click('#game-stage .game-hub-open');
      check(!!(await until(() => visible(page, '#game-menu'), 3000)), `${L} ${kind} W3: 🎮 opens the hall`);
      await page.keyboard.press('Escape');
      await dblHead(page);
      await wait(300);
      check(!(await box(page)).overPlayer, `${L} ${kind}: a double click puts it back, still beside the player`, await box(page));
    }
    check(!errors.length, `${L}: no page errors`, errors.slice(0, 2));
    await ctx.close();
  }

  // ---- A phone: side games play full, no ⛶, 🎮 opens the hall ----
  {
    const { ctx, page, errors } = await room(browser, null, { phone: true });
    await openGame(page, 'snack');
    const b = await box(page);
    check(b.mode === 'full', 'phone: Snack Bar plays on the whole screen', b);
    check(!(await visible(page, '#game-stage .game-full')), 'phone: no ⛶');
    await page.evaluate(() => document.querySelector('#game-stage .game-hub-open').click());
    check(!!(await until(() => visible(page, '#game-menu'), 3000)), 'phone W3: 🎮 opens the hall');
    check(!errors.length, 'phone: no page errors', errors.slice(0, 2));
    await ctx.close();
  }

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Game window head harness passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
