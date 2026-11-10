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
    // SIDE340 (0.9.97.114): Snack Bar reads well down to 320 px, so the column right of the video (about 354 px here) is
    // its home: it opens there, never over the video.
    check(first.mode === 'float' && !first.overVideo && first.w >= 320 && first.x + first.w >= 1366 - 10, `${L} 112: Snack Bar opens in the narrow column right of the video, never over it`, first);
    if (first.mode === 'stage') {
      await page.click('#game-stage .place-float');
      await wait(300);
    }
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
    check(home.mode === 'float' && !home.overVideo && Math.abs(home.w - first.w) <= 2 && home.x + home.w >= 1366 - 10, `${L} W5: a double click on the head puts it back in its home beside the video`, home);
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
    // Owner (0.9.97.112): side games open right of the video when they fit there at their smallest readable size
    // (catalog minSize), else in the video's place; the tables always play in the video's place, with no switch.
    // SIDE340 (0.9.97.114): the side games read well down to 320 px wide (catalog minSize).
    const minW = { snack: 320, garden: 320, word: 320 };
    for (const kind of ['snack', 'garden', 'word', 'classics', 'sea', 'quiz', 'draw', 'poker', 'duel']) {
      await openGame(page, kind);
      const b = await box(page);
      const room = await page.evaluate(() => innerWidth - document.getElementById('theater').getBoundingClientRect().right - 16);
      const switchShown = await page.evaluate(() => !document.querySelector('#game-stage .game-place').hidden);
      if (minW[kind]) {
        const fits = room >= minW[kind];
        check(fits ? b.mode === 'float' && !b.overPlayer && b.onScreen && b.x + b.w >= viewport.width - 12 && b.w >= minW[kind] : b.mode === 'stage' || (b.mode === 'float' && b.onScreen && b.w >= minW[kind]), `${L} ${kind}: ${fits ? 'opens right of the video, never over it' : "doesn't fit beside the video: its own window (the video's place once STAGE_READY)"}`, { b, room });
        check(switchShown, `${L} ${kind}: a side game keeps the placement switch`);
      } else {
        // Until card .113 turns stage.ts STAGE_READY on, a table keeps its free window and the switch; then it plays
        // in the video's place without one. Either way it opens whole on screen, and 🎮 shows the hall.
        check(b.onScreen && (b.mode === 'stage' ? b.inVideo && !switchShown : b.mode === 'float' && switchShown), `${L} ${kind}: a table opens in its placement (${b.mode}), whole on screen`, { b, switchShown });
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
      if (kind === 'snack') {
        await page.click('#game-stage .place-float');
        await wait(300);
      }
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

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Game window head harness passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
