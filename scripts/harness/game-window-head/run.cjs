// The game window's head and free window (owner's bugs W1–W5, 10 Nov 2026): every head button does its job.
// Checks, on a computer (1366 × 768 and 1920 × 1080) and a phone:
//   W1  No game has a ⛶ or any other way into its own full screen (owner: two placements only, the video's place and
//       the free window); in the video's fullscreen the game stays a free window inside it.
//   W2  "In the video's place" works with no video and with a video file; over a YouTube video the switch is gone (only
//       the free window is possible) and the head says why.
//   W3  The head's 🎮 opens the games hall right under itself, visible, in the free window, in the video's place and in
//       the video's fullscreen; pressed again it closes.
//   112 A side game opens right of the video (over the side panel)
//       when it fits there at its smallest readable size, else in the video's place; never over the video; hovering the
//       resize corner never moves the window; an old
//       saved spot is left behind once; from a free window 🎮's hall slides out of its left side, visible with the side
//       panel open or closed, and closes on Esc, an outside click or a chosen game.
//   QA2 Tablets: a side game lines up with the side panel (upright: its column beside the chat), never over the video; the rail's hall shows whole. 1366: words
//       on a table's head buttons where they fit, the paused note under the head, a gap to "Play now", a side game leaves
//       cinema mode. Phone: a one-row head (name, ?, 🎙, 🎮, ⋯ with Leave / Close); sideways Leave / Close in the head.
//   W5  The free window follows a drag of its head (over a video file it may cover the video, nothing pushes it away);
//       over a YouTube player it never covers it and never jumps while dragged; each game remembers its own spot and
//       size; ✕ and 🎮 bring it back in the same spot; a double click on the head puts it back; the corner resizes it.
//
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 --var SWM_LOCAL_UNPACED:1 --var SWM_LAB_SERVER:1)
//   node scripts/harness/game-window-head/run.cjs [site] [webm]   (a playable webm, default http://localhost:5300/video.webm)
const { chromium, devices } = require('playwright');
const { viaYouTube } = require('../via-youtube.cjs');

const SITE = process.argv[2] || 'http://localhost:8787';
const VIDEO = `${SITE}/sample.mp4`;
/** A video headless Chromium can play (H.264 it can't): CI serves one on :5300 (games-more's video step). */
const WEBM = process.argv[3] || 'http://localhost:5300/video.webm';
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
  // A table opens after the server lists it (a round trip): wait until the window shows that game, not the previous one.
  const solo = ['snack', 'garden', 'word'].includes(kind);
  const shown = await until(
    () =>
      page.evaluate((isSolo) => {
        const s = document.getElementById('game-stage');
        return !s.hidden && !s.querySelector('.game-stage-loading') && s.classList.contains('solo-game') === isSolo;
      }, solo),
    12000,
  );
  if (!shown) check(false, `${kind} opens`);
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
/** 0.9.97.117: a side game's home lines up with the side panel (its right edge and top) and stops above the message box. */
const panelFit = (page) =>
  page.evaluate(() => {
    const w = document.getElementById('game-stage').getBoundingClientRect();
    const p = document.querySelector('.room .side').getBoundingClientRect();
    const f = document.getElementById('chat-form').getBoundingClientRect();
    return { right: Math.abs(w.right - p.right) <= 2, top: Math.abs(w.top - p.top) <= 2, aboveInput: w.bottom <= f.top + 1, gap: Math.round(f.top - w.bottom) };
  });
const dblHead = (page) => page.evaluate(() => document.querySelector('#game-stage .game-stage-title').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
const near = (a, b, d = 3) => Math.abs(a.x - b.x) <= d && Math.abs(a.y - b.y) <= d && Math.abs(a.w - b.w) <= d && Math.abs(a.h - b.h) <= d;

(async () => {
  const browser = await chromium.launch();

  // ---- 1366 × 768, no video, then a video file ----
  {
    const { ctx, page, errors } = await room(browser, { width: 1366, height: 768 });
    const L = '1366';
    // 0.9.97.112: a spot saved by an older release is left behind once (the game opens in its new home).
    await page.evaluate(() => localStorage.setItem('gameFloat:spot:snack', JSON.stringify({ x: 0, y: 0 })));
    await openGame(page, 'snack');
    const first = await box(page);
    // 0.9.97.114 (owner): side games only ever play in the free window, in the right column. SIDE340 (0.9.97.115): they
    // read well down to 320 px, so the column right of the video (about 354 px here) holds them: never over the video.
    const fit1 = await panelFit(page);
    check(first.mode === 'float' && !first.overVideo && first.w >= 300 && fit1.right && fit1.top && fit1.aboveInput && fit1.gap <= 8, `${L} 117: Snack Bar's window lines up with the side panel down to just above the message box, never over the video`, { first, fit1 });
    check(await page.evaluate(() => document.querySelector('#game-stage .game-place').hidden), `${L} 114: a side game has no placement switch`);
    check(!(await page.$('#game-stage .game-full')), `${L} W1: Snack Bar has no ⛶`);
    await page.keyboard.press('Escape');
    check(!(await page.evaluate(() => document.getElementById('game-stage').classList.contains('game-max') || !!document.fullscreenElement)), `${L} W1: nothing puts Snack Bar on the whole screen`);
    // W3: 🎮 in the free window's head.
    await page.click('#game-stage .game-hub-open');
    check(!!(await until(() => visible(page, '#game-menu'), 3000)), `${L} W3: 🎮 in the free window opens the hall, visible`);
    await wait(300); // the slide-out (180 ms) ends
    const hallSide = await page.evaluate(() => {
      const m = document.getElementById('game-menu').getBoundingClientRect();
      const w = document.getElementById('game-stage').getBoundingClientRect();
      return { left: m.right <= w.left + 1, level: Math.abs(m.top - w.top) <= 2 };
    });
    check(hallSide.left && hallSide.level, `${L} 112: the hall slides out of the free window's left side, level with its top`, hallSide);
    await page.click('#game-stage .game-hub-open');
    check(await page.evaluate(() => document.getElementById('game-menu').hidden), `${L} W3: 🎮 again closes the hall`);
    // W2: a table plays in the video's place (no video), and its 🎮 shows the hall there.
    await openGame(page, 'classics');
    let b = await box(page);
    check(b.mode === 'stage' && b.inVideo && b.w > 600, `${L} W2: a table plays in the video's frame (no video)`, b);
    await page.click('#game-stage .game-hub-open');
    check(!!(await until(() => visible(page, '#game-menu'), 3000)), `${L} W3: 🎮 in the video's place opens the hall, visible`);
    await page.keyboard.press('Escape');
    // A video file: the table in the video's place; then Snack Bar's free window, dragged over the video.
    check(!!(await load(page, VIDEO)), `${L}: the room plays a video file`);
    b = await box(page);
    check(b.mode === 'stage' && b.inVideo, `${L} W2: with a video file the table stays in the video's place`, b);
    await openGame(page, 'snack');
    await wait(300);
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
    // 112-A: hovering the corner (no button held) never moves or resizes the window, also after a gesture whose end was lost.
    const g2 = await (await page.$('#game-stage .game-resize')).boundingBox();
    await page.mouse.move(g2.x + g2.width / 2, g2.y + g2.height / 2);
    await page.mouse.down();
    await page.evaluate(() => document.querySelector('#game-stage .game-resize').dispatchEvent(new PointerEvent('lostpointercapture', { pointerId: 1, bubbles: true })));
    await page.mouse.up();
    for (const [dx, dy] of [[-30, -10], [10, 20], [-60, 40], [5, 5]]) {
      await page.mouse.move(g2.x + g2.width / 2 + dx, g2.y + g2.height / 2 + dy, { steps: 3 });
      await page.mouse.move(g2.x + g2.width / 2, g2.y + g2.height / 2, { steps: 3 });
    }
    await wait(200);
    check(near(await box(page), grown, 1), `${L} 112: hovering the resize corner never moves or resizes the window`, { now: await box(page), grown });
    // 117: a drag goes on through a stray move with no button held (another pointer), and a drag whose release was never
    // heard ends at the next press without throwing the window back.
    {
      const before = await box(page);
      const t = await (await page.$('#game-stage .game-stage-title')).boundingBox();
      const hx = t.x + 30;
      const hy = t.y + t.height / 2;
      await page.mouse.move(hx, hy);
      await page.mouse.down();
      await page.mouse.move(hx - 20, hy + 10, { steps: 3 });
      await page.evaluate(() => document.querySelector('#game-stage .game-stage-head').dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'mouse', buttons: 0, clientX: 5, clientY: 5, bubbles: true })));
      await page.mouse.move(hx - 60, hy + 30, { steps: 4 });
      await page.mouse.up();
      await wait(300);
      const went = await box(page);
      check(Math.abs(went.x - (before.x - 60)) <= 3 && Math.abs(went.y - (before.y + 30)) <= 3, `${L} 117: a stray buttonless move doesn't end a drag`, { before, went });
      // A release nobody heard: press, move, then the button comes up outside (no pointerup reaches the page).
      await page.mouse.move(hx - 60, hy + 30);
      await page.mouse.down();
      await page.mouse.move(hx - 40, hy + 20, { steps: 3 });
      await wait(100);
      const held = await box(page);
      await page.evaluate(() => addEventListener('pointerup', (e) => e.stopPropagation(), { capture: true, once: true }));
      await page.mouse.up();
      await page.evaluate(() => document.querySelector('#game-stage .game-stage-head').dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, pointerType: 'mouse', buttons: 0, clientX: 5, clientY: 5, bubbles: true })));
      await wait(200);
      check(near(await box(page), held, 2), `${L} 117: a buttonless move after a lost release leaves the window where it stands`, { now: await box(page), held });
      await page.mouse.move(hx - 40, hy + 20);
      await page.mouse.down();
      await page.mouse.up();
      await wait(200);
      check(near(await box(page), held, 2), `${L} 117: the next press ends that drag without moving the window`, { now: await box(page), held });
    }
    const resized = await box(page);
    // Each game keeps its own spot: Window Garden opens at its own place, Snack Bar comes back to its own.
    await openGame(page, 'garden');
    const garden = await box(page);
    check(!near(garden, resized, 20), `${L} W5: another game keeps its own spot`, { garden, snack: resized });
    await openGame(page, 'snack');
    check(near(await box(page), resized), `${L} W5: Snack Bar comes back to its own spot and size`, { now: await box(page), resized });
    // ✕ then 🎮: back in the same spot.
    await page.click('#game-stage .game-minimize');
    await wait(300);
    await page.evaluate(() => (document.querySelector('#dock-game') ?? document.querySelector('#game-btn')).click());
    await until(() => page.evaluate(() => !document.getElementById('game-stage').hidden));
    await wait(300);
    check(near(await box(page), resized), `${L} W5: ✕ and back: the same spot`, await box(page));
    // A reload remembers it.
    await page.reload();
    await page.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 });
    await wait(1200);
    await openGame(page, 'snack');
    check(near(await box(page), resized), `${L} W5: after a reload Snack Bar opens where I left it`, await box(page));
    // Double click on the head: its own size, back home.
    await dblHead(page);
    await wait(300);
    const home = await box(page);
    // (The side panel may have grown since the first open: a video now plays. The home follows it.)
    const fitHome = await panelFit(page);
    check(home.mode === 'float' && !home.overVideo && fitHome.right && fitHome.top && fitHome.aboveInput && fitHome.gap <= 8, `${L} W5: a double click on the head puts it back in its home beside the video`, { home, fitHome });
    // The lab's reset does the same.
    await dragHead(page, -300, 0, 4);
    await page.evaluate(() => window.__swmLab.run('gameWindow.reset'));
    await wait(300);
    check(near(await box(page), home), `${L}: the Test Lab's "back to its own size and spot" works`, await box(page));
    // W1 (owner): no game has a ⛶ or any way into its own full screen: side games and tables alike.
    for (const kind of ['garden', 'word', 'classics']) {
      await openGame(page, kind);
      check(!(await page.$('#game-stage .game-full')), `${L} W1: ${kind} has no ⛶`);
    }
    await page.keyboard.press('f');
    await page.evaluate(() => document.querySelector('#game-stage .game-stage-title').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
    await wait(300);
    check(!(await page.evaluate(() => document.fullscreenElement?.id === 'game-stage' || document.getElementById('game-stage').classList.contains('game-max'))), `${L} W1: no key or double click puts a game on the whole screen`);
    // The video's own fullscreen: the game stays a free window inside it, and its 🎮 opens the hall there.
    await page.evaluate(() => document.getElementById('theater').requestFullscreen());
    await until(() => page.evaluate(() => document.fullscreenElement?.id === 'theater'));
    await wait(400);
    const inFs = await page.evaluate(() => {
      const s = document.getElementById('game-stage');
      return { inside: document.fullscreenElement?.contains(s) ?? false, hidden: s.hidden, float: s.classList.contains('float'), w: Math.round(s.getBoundingClientRect().width) };
    });
    check(inFs.inside && !inFs.hidden && (!inFs.float || inFs.w < 1366), `${L}: in the video's fullscreen a table stays inside it (its window or the video's place)`, inFs);
    await page.click('#game-stage .game-hub-open');
    check(!!(await until(() => visible(page, '#game-menu'), 3000)), `${L} W3: 🎮 in the video's fullscreen opens the hall, visible`);
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.fullscreenElement && document.exitFullscreen());
    await wait(300);
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

  // ---- 0.9.97.112: every game's home is right of the video; the hall shows with the side panel open or closed ----
  for (const [L, viewport] of [['1920 home', { width: 1920, height: 1080 }], ['1366 home', { width: 1366, height: 768 }]]) {
    const { ctx, page, errors } = await room(browser, viewport);
    // Owner (0.9.97.112–114): side games always open as the free window in the right column (never over the video when
    // they fit there at their smallest readable size, else over its edge by the difference); the tables always play in
    // the video's place. No game has a placement switch on a computer. SIDE340 (0.9.97.115): smallest readable 320 px.
    const minW = { snack: 320, garden: 320, word: 320 };
    for (const kind of ['snack', 'garden', 'word', 'classics', 'sea', 'quiz', 'draw', 'poker', 'duel']) {
      await openGame(page, kind);
      const b = await box(page);
      const room = await page.evaluate(() => innerWidth - document.getElementById('theater').getBoundingClientRect().right - 16);
      const switchShown = await page.evaluate(() => !document.querySelector('#game-stage .game-place').hidden);
      if (minW[kind]) {
        const fits = room >= minW[kind];
        const pf = await panelFit(page);
        check(b.mode === 'float' && b.onScreen && !b.overVideo && pf.right && pf.top && pf.aboveInput && pf.gap <= 8, `${L} ${kind}: opens over the side panel, lined up with it down to just above the message box, never over the video`, { b, room, pf });
        check(!switchShown, `${L} ${kind}: a side game has no placement switch`);
      } else {
        // Until card .113 turns stage.ts STAGE_READY on, a table keeps its free window and the switch; then it plays
        // in the video's place without one. Either way it opens whole on screen, and 🎮 shows the hall.
        check(b.onScreen && b.mode === 'stage' && b.inVideo && !switchShown, `${L} ${kind}: a table plays in the video's place, no switch`, { b, switchShown });
        await page.click('#game-stage .game-hub-open');
        check(!!(await until(() => visible(page, '#game-menu'), 3000)), `${L} ${kind}: 🎮 in the video's place opens the hall, visible`);
        await page.keyboard.press('Escape');
      }
    }
    // The side panel closed (cinema mode): the hall still opens beside the free window, visible.
    await page.evaluate(() => document.getElementById('side-toggle')?.click());
    await wait(500);
    for (const kind of ['snack', 'sea']) {
      await openGame(page, kind);
      await page.click('#game-stage .game-hub-open');
      check(!!(await until(() => visible(page, '#game-menu'), 3000)), `${L} ${kind}: side panel closed, 🎮 opens the hall beside the window, visible`);
      await page.keyboard.press('Escape');
      check(await page.evaluate(() => document.getElementById('game-menu').hidden), `${L} ${kind}: Esc closes the hall`);
    }
    // Choosing a game in the hall closes it.
    await page.click('#game-stage .game-hub-open');
    await page.evaluate(() => document.querySelector('#game-menu [data-tab="side"]')?.click());
    await until(() => page.evaluate(() => !!document.querySelector('#game-menu [data-solo="garden"]')));
    await page.evaluate(() => document.querySelector('#game-menu [data-solo="garden"]').click());
    check(!!(await until(() => page.evaluate(() => document.getElementById('game-menu').hidden))), `${L}: choosing a game closes the hall`);
    check(!errors.length, `${L}: no page errors`, errors.slice(0, 2));
    await ctx.close();
  }

  // ---- 0.9.97.114: a table opening in the video's place pauses the playing video for everyone; side games never do ----
  {
    const playBrowser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
    const name = 'gp' + Math.random().toString(36).slice(2, 8);
    const join = async (who) => {
      const ctx = await playBrowser.newContext({ viewport: { width: 1366, height: 768 } });
      await ctx.addInitScript((n) => {
        for (const [k, v] of Object.entries({ lang: 'en', name: n, avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', 'snackBar:howSeen': '1', 'classics:chess:howSeen': '1' })) localStorage.setItem(k, v);
      }, who);
      const page = await ctx.newPage();
      await page.goto(`${SITE}/r/${name}?debug=1#back`);
      await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#media-input'), null, { timeout: 20000 });
      await wait(1200);
      return { ctx, page };
    };
    const alex = await join('Alex');
    const sam = await join('Sam');
    const playing = (page) => page.evaluate(() => {
      const v = document.querySelector('#theater video');
      return !!v && !v.paused;
    });
    await load(alex.page, WEBM);
    const both = await until(async () => (await playing(alex.page)) && (await playing(sam.page)), 15000);
    check(!!both, '114: the video plays for both');
    if (both) {
      await openGame(alex.page, 'snack');
      await wait(1500);
      check((await playing(alex.page)) && (await playing(sam.page)), '114: opening a side game never pauses the video');
      await openGame(alex.page, 'classics');
      const paused = await until(async () => !(await playing(alex.page)) && !(await playing(sam.page)), 6000);
      check(!!paused, "114: opening a table in the video's place pauses the video for everyone");
      check(await alex.page.evaluate(() => [...document.querySelectorAll('.hint, [role="status"]')].some((e) => /paused for the game/i.test(e.textContent))), '114: a short note says "Video paused for the game"');
      await alex.page.evaluate(() => document.querySelector('#game-stage .game-minimize').click());
      await wait(2000);
      check(!(await playing(alex.page)) && !(await playing(sam.page)), "114: putting the table away doesn't play the video again");
    }
    await alex.ctx.close();
    await sam.ctx.close();
    await playBrowser.close();
  }

  // ---- The room's intro (over the video for its first ≈ 3 s) ends when a game opens, so the first click on the head works ----
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await ctx.addInitScript(() => {
      for (const [k, v] of Object.entries({ lang: 'en', name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', 'classics:chess:howSeen': '1' })) localStorage.setItem(k, v);
    });
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/gi${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
    const introShown = await until(() => page.evaluate(() => !!document.querySelector('.player-wrap .swm-intro') && !!window.__swmLab), 10000);
    check(!!introShown, 'intro: a fresh room shows its intro over the video');
    await page.evaluate(() => window.__swmLab.run('games.open.sea'));
    await until(() => page.evaluate(() => document.getElementById('game-stage').dataset.place === 'stage' && !!document.querySelector('#game-stage .htp-open')), 8000);
    check(!(await page.evaluate(() => !!document.querySelector('.player-wrap .swm-intro'))), 'intro: opening a game ends it');
    await page.click('#game-stage .htp-open');
    check(!!(await until(() => visible(page, '#game-stage .htp'), 3000)), "intro: the first click on the game's \"?\" opens How to play");
    await ctx.close();
  }

  // ---- A phone: side games play full, no ⛶, 🎮 opens the hall ----
  {
    const { ctx, page, errors } = await room(browser, null, { phone: true });
    await openGame(page, 'snack');
    const b = await box(page);
    check(b.mode === 'full', 'phone: Snack Bar plays on the whole screen', b);
    check(!(await page.$('#game-stage .game-full')), 'phone: no ⛶');
    await page.evaluate(() => document.querySelector('#game-stage .game-hub-open').click());
    check(!!(await until(() => visible(page, '#game-menu'), 3000)), 'phone W3: 🎮 opens the hall');
    check(!errors.length, 'phone: no page errors', errors.slice(0, 2));
    await ctx.close();
  }

  // ---- QA2 (B2's sweep): tablets, the hall, the paused note, head labels, the phone head, cinema mode ----
  // Tablets (touch, no mouse): a side game lines up with the side panel and never covers the video; the rail's 🎮 hall
  // shows whole.
  for (const [L, viewport] of [['tablet', { width: 820, height: 1180 }], ['tablet-land', { width: 1180, height: 820 }]]) {
    const ctx = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => {
      for (const [k, v] of Object.entries({ lang: 'en', name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', 'snackBar:howSeen': '1' })) localStorage.setItem(k, v);
    });
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/gq${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
    await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#media-input'), null, { timeout: 20000 });
    await wait(1200);
    await load(page, WEBM);
    await wait(1500);
    await page.evaluate(() => document.querySelector('.fs-dock #dock-game, .fs-dock .game-btn')?.click());
    const hall = await until(() => page.evaluate(() => {
      const m = document.getElementById('game-menu');
      if (!m || m.hidden) return null;
      const r = m.getBoundingClientRect();
      return { whole: r.top >= 0 && r.bottom <= innerHeight + 1 && m.scrollHeight <= m.clientHeight + 1, r: [r.top, r.bottom].map(Math.round) };
    }), 3000);
    check(!!hall && hall.whole, `${L} QA2: the rail's 🎮 hall shows whole`, hall);
    await page.keyboard.press('Escape');
    await wait(300);
    await openGame(page, 'snack');
    const b = await box(page);
    const pf = await panelFit(page);
    // Upright the side panel is under the video: the window takes its column beside the chat (the chat stays whole).
    const chatFree = await page.evaluate(() => {
      const w = document.getElementById('game-stage').getBoundingClientRect();
      const c = document.querySelector('.room .chat-panel')?.getBoundingClientRect();
      return !c || c.width < 1 || w.left >= c.right - 1 || w.right <= c.left + 1;
    });
    check(b.mode === 'float' && !b.overVideo && pf.top && (L === 'tablet' ? chatFree : pf.aboveInput), `${L} QA2: Snack Bar lines up with the side panel, never over the video, the message box free`, { b, pf, chatFree });
    await ctx.close();
  }
  // A computer: labels in a table's head where they fit, the paused note under the head (not over its buttons), the gap
  // to "Play now", and a side game leaving cinema mode.
  {
    const { ctx, page, errors } = await room(browser, { width: 1366, height: 768 });
    await load(page, WEBM);
    await page.evaluate(() => void document.querySelector('#theater video')?.play().catch(() => {}));
    await openGame(page, 'snack');
    // A 1366 laptop has no room for a gap to "Play now" at the game's smallest readable width (Planner's call pending):
    // the window may reach at most a few px over the link box's edge, never over the button's label.
    const gap = await page.evaluate(() => Math.round(document.getElementById('game-stage').getBoundingClientRect().left - document.getElementById('media-form').getBoundingClientRect().right));
    check(gap >= -8, '1366 QA2: a side game reaches at most a few px over the link box', { gap });
    await page.evaluate(() => document.querySelector('#game-stage .game-minimize').click());
    await page.evaluate(() => document.getElementById('side-toggle')?.click());
    await wait(600);
    const cinema = await page.evaluate(() => document.documentElement.classList.contains('cinema-on'));
    if (cinema) {
      await openGame(page, 'snack');
      const c = await box(page);
      check(!(await page.evaluate(() => document.documentElement.classList.contains('cinema-on'))) && !c.overVideo, '1366 QA2: a side game leaves cinema mode and stays off the video', c);
    } else check(false, '1366 QA2: cinema mode turns on (#side-toggle)');
    await openGame(page, 'xox');
    await page.evaluate(() => window.__swmLab.run('gameWindow.autoPause'));
    await wait(200);
    const head = await page.evaluate(() => {
      const h = document.querySelector('#game-stage .game-stage-head').getBoundingClientRect();
      const n = document.querySelector('.hint-bubble')?.getBoundingClientRect();
      return { labels: document.getElementById('game-stage').classList.contains('head-labels'), words: [...document.querySelectorAll('#game-stage .game-head-text')].filter((e) => e.getBoundingClientRect().width > 0).length, hint: n ? Math.round(n.top - h.bottom) : null };
    });
    check(head.labels && head.words >= 3, '1366 QA2: a table\'s head shows its buttons\' words when they fit', head);
    check(head.hint !== null && head.hint >= 0, '1366 QA2: "Video paused for the game" shows under the head, not over its buttons', head);
    check(!errors.length, '1366 QA2: no page errors', errors.slice(0, 2));
    await ctx.close();
  }
  // An upright phone with a table and a video: one-row head (name, ?, 🎙, 🎮, ⋯), the thumbnail is "back", ⋯ holds Leave /
  // Close with their words; sideways Leave / Close sit in the head.
  for (const [L, device] of [['phone', 'iPhone 13'], ['phone-land', 'iPhone 13 landscape']]) {
    const ctx = await browser.newContext({ ...devices[device] });
    await ctx.addInitScript(() => {
      for (const [k, v] of Object.entries({ lang: 'en', name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1' })) localStorage.setItem(k, v);
    });
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/gp${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
    await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#media-input'), null, { timeout: 20000 });
    await wait(1200);
    // The link box is in the phone's "＋ Add" sheet (hidden): fill and press it from the page.
    await page.evaluate((url) => {
      const input = document.querySelector('#media-input');
      input.value = url;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#media-form button[value="load"]').click();
    }, WEBM);
    await until(() => page.evaluate(() => document.querySelector('.room')?.classList.contains('has-item')), 15000);
    await openGame(page, 'xox');
    const h = await page.evaluate(() => {
      const head = document.querySelector('#game-stage .game-stage-head');
      const shown = (sel) => { const e = head.querySelector(sel); return !!e && e.getBoundingClientRect().width > 0; };
      const tops = new Set([...head.children].filter((c) => c.getBoundingClientRect().width > 0).map((c) => { const r = c.getBoundingClientRect(); return Math.round((r.top + r.height / 2) / 24); }));
      return { rows: tops.size, name: shown('.game-stage-title-name'), help: shown('.htp-head'), more: shown('.game-more'), leave: shown('.game-leave'), back: shown('.game-minimize') };
    });
    check(h.rows === 1 && h.name && h.help, `${L} QA2: the head is one row with the game's name and "?"`, h);
    if (L === 'phone') {
      check(h.more && !h.leave && !h.back, 'phone QA2: ⋯ instead of Leave / Close; the thumbnail is "back"', h);
      await page.evaluate(() => window.__swmLab.run('gameWindow.more'));
      await wait(300);
      const menu = await page.evaluate(() => [...document.querySelectorAll('.game-more-pop:not([hidden]) button')].filter((b) => b.getBoundingClientRect().width > 0).map((b) => b.textContent.trim()));
      check(menu.length >= 1 && menu.every((t) => t.length > 3), 'phone QA2: ⋯ opens Leave / Close with their words', menu);
    } else check(!h.more && h.leave, 'phone-land QA2: Leave / Close sit in the head', h);
    await ctx.close();
  }

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Game window head harness passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
