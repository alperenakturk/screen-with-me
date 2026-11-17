// Card YTG (the YouTube audit, gap 2) + GW2 + GW3: on a computer nothing of ours is put in front of a playing YouTube
// player. A table opens in the video's place (the video paused; never the browser's full screen, GW3) or in its 🪟 frame,
// whose home keeps beside the player; only a frame the user drags there himself sits over it (owner, 15 Nov 2026). Going fullscreen tucks the game away and bringing a
// game up in fullscreen leaves fullscreen. The YouTube player only has
// to be created (the room's item is YouTube); it need not play.
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 --var SWM_LOCAL_UNPACED:1 --var SWM_LAB_SERVER:1)
//   NODE_PATH=$(npm root -g) node scripts/harness/games-youtube/run.cjs [site]
const { chromium } = require('playwright');
const { viaYouTube } = require('../via-youtube.cjs');
const SITE = process.argv[2] || 'http://localhost:8787';
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
/** The game window against the player (the whole theater: the player widens when the rail beside it rests). */
const where = (page) =>
  page.evaluate(() => {
    const s = document.getElementById('game-stage');
    const t = document.getElementById('theater').getBoundingClientRect();
    if (!s || s.hidden) return { shown: false };
    const g = s.getBoundingClientRect();
    const overlap = g.left < t.right - 1 && t.left < g.right - 1 && g.top < t.bottom - 1 && t.top < g.bottom - 1;
    const onScreen = g.left >= -1 && g.top >= -1 && g.right <= innerWidth + 1 && g.bottom <= innerHeight + 1;
    return { shown: true, overlap, onScreen, mode: ['float', 'stage', 'below', 'full'].find((m) => s.classList.contains(m)), inPlace: !!s.parentElement?.classList.contains('player-wrap'), fs: !!document.fullscreenElement, game: [g.left, g.top, g.width, g.height].map(Math.round), player: [t.left, t.top, t.width, t.height].map(Math.round), switchGone: document.querySelector('#game-stage .game-place')?.hidden ?? null };
  });

(async () => {
  const browser = await chromium.launch();
  for (const [label, viewport] of [['1366×768', { width: 1366, height: 768 }], ['1920×1080', { width: 1920, height: 1080 }], ['1024×640', { width: 1024, height: 640 }]]) {
    const ctx = await browser.newContext({ viewport });
    await viaYouTube(ctx);
    await ctx.addInitScript(() => {
      for (const [k, v] of Object.entries({ lang: 'en', name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', 'classics:chess:howSeen': '1' })) localStorage.setItem(k, v);
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${SITE}/r/gy${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
    await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#media-input'), null, { timeout: 20000 });
    await wait(1500);
    await page.fill('#media-input', 'https://www.youtube.com/watch?v=M7lc1UVf-VE');
    await page.press('#media-input', 'Enter');
    const yt = await until(() => page.evaluate(() => document.getElementById('theater')?.classList.contains('yt-rail')), 15000);
    check(!!yt, `${label}: the room plays a YouTube video`);
    // GW3 (owner, 17 Nov 2026): a table opens in the video's place the first time (the video paused, the page around it
    // usable, never the browser's full screen), and in the mode used last after that. In the 🪟 frame its home keeps
    // clear of the player; a frame I drag onto the player stays there (CLAUDE.md §7: only a frame the user drags there).
    await page.evaluate(() => window.__swmLab.run('games.open.classics'));
    await until(async () => (await where(page)).shown);
    await wait(700);
    const full = await where(page);
    check(full.shown && full.mode === 'stage' && full.inPlace && !full.fs && full.game[2] < viewport.width - 100, `${label} classics: a table opens in the video's place, not full screen`, full);
    // GP1 (Planner, 16 Nov 2026: never open a frame whose text is below 11 px): the strip beside the player is too narrow
    // for a readable table on a computer (≈ 350 px at 1366, ≈ 430 px at 1920), so with no spot of mine the frame mode
    // keeps the table in the video's place (or under the player when the screen has room there). 🪟 stays in the head (owner: both modes
    // always): pressing it opens the frame at the right edge at a readable size, over part of the player (my choice).
    const asked = JSON.parse(await page.evaluate(() => window.__swmLab.run('games.frame', 'frame').then((l) => l.text.slice(l.text.indexOf('{')))));
    await wait(700);
    const kept = await where(page);
    const switchShown = await page.evaluate(() => !document.querySelector('#game-stage .game-mode')?.hidden);
    check((asked.forced ? kept.mode === 'stage' : kept.mode === 'below' && !kept.overlap) && switchShown, `${label} classics: no readable frame beside the player: the video's place (or under it), 🪟 still in the head`, { asked, kept, switchShown });
    if (kept.mode === 'stage') {
      await page.evaluate(() => document.querySelector('#game-stage .game-mode').click());
      await until(async () => (await where(page)).mode === 'float');
      await wait(700);
      const chosen = await where(page);
      check(chosen.mode === 'float' && chosen.onScreen && chosen.game[2] >= 0.85 * 540, `${label} classics: 🪟 opens the frame at a readable size (over the player is fine: I chose it)`, chosen);
      await page.evaluate(() => localStorage.removeItem('gameFloat:at:classics'));
    }
    for (const kind of ['classics', 'sea']) {
      if (kind === 'sea') {
        await page.evaluate(() => window.__swmLab.run('games.open.sea'));
        await until(async () => (await where(page)).shown);
        await wait(700);
      }
      // A frame I placed myself before (its spot saved) stays a frame, at a readable size, and may go over the player.
      await page.evaluate((k) => localStorage.setItem(`gameFloat:at:${k}`, JSON.stringify({ x: 1, y: 0.5 })), kind);
      await page.evaluate(() => window.__swmLab.run('games.frame', 'frame'));
      await until(async () => (await where(page)).mode === 'float');
      await wait(700);
      const now = await where(page);
      check(now.shown && now.mode === 'float' && now.onScreen && now.game[2] >= 0.85 * (kind === 'sea' ? 780 : 540), `${label} ${kind}: a frame I placed before opens as a frame at a readable size, whole on screen`, now);
      if (now.mode !== 'float') continue;
      const head = await page.evaluate(() => {
        // Grabbed by the game's name (a narrow head wraps its buttons under it).
        const r = document.querySelector('#game-stage .game-stage-title').getBoundingClientRect();
        const t = document.getElementById('theater').getBoundingClientRect();
        return { x: r.left + Math.min(40, r.width / 2), y: r.top + r.height / 2, tx: t.left + t.width / 2, ty: t.top + t.height / 2 };
      });
      await page.mouse.move(head.x, head.y);
      await page.mouse.down();
      await page.mouse.move(head.tx, head.ty, { steps: 8 });
      await page.mouse.up();
      await wait(400);
      const dragged = await where(page);
      check(dragged.shown && dragged.overlap && dragged.onScreen, `${label} ${kind}: a frame I drag onto the player stays there`, dragged);
      // A double click on the head forgets the spot: no readable frame fits beside the player, so the video's place again.
      await page.mouse.dblclick(head.x - (head.x - dragged.game[0]) + Math.min(40, dragged.game[2] / 4), dragged.game[1] + (head.y - now.game[1]));
      await wait(400);
      const home = await where(page);
      check(home.shown && ((home.mode === 'stage' && !home.fs) || !home.overlap), `${label} ${kind}: a double click forgets the spot: the video's place, or a frame clear of the player`, home);
      await page.evaluate((k) => localStorage.removeItem(`gameFloat:at:${k}`), kind);
    }
    if (label === '1366×768') {
      // Going fullscreen with the game open tucks it away (a dot on 🎮); bringing it up in fullscreen leaves fullscreen.
      await page.evaluate(() => document.getElementById('theater').requestFullscreen());
      const tucked = await until(() => page.evaluate(() => document.fullscreenElement && document.getElementById('game-stage').hidden));
      check(!!tucked, `${label}: going fullscreen tucks the game away`);
      await page.evaluate(() => window.__swmLab.run('games.open.sea'));
      const left = await until(() => page.evaluate(() => !document.fullscreenElement && !document.getElementById('game-stage').hidden));
      check(!!left, `${label}: bringing the game up in fullscreen leaves fullscreen`);
      const back = await where(page);
      check(back.shown && (back.mode === 'stage' || !back.overlap), `${label}: … and the table is in the video's place or clear of the player again`, back);
      // GW3: with a video that isn't YouTube the table's head has the ▣ / 🪟 switch, and the video's place works the same.
      await page.evaluate(() => window.__swmLab.run('games.open.classics'));
      // The game may cover the address box (the video's place): typed in from the page's side.
      await page.evaluate((url) => {
        const input = document.getElementById('media-input');
        input.value = url;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }, `${SITE}/sample.mp4`);
      await page.evaluate(() => document.querySelector('#media-form button[value="load"]')?.click());
      await until(() => page.evaluate(() => !document.getElementById('theater').classList.contains('yt-rail')));
      check(!!(await until(() => page.evaluate(() => !document.querySelector('#game-stage .game-mode')?.hidden))), `${label}: the table's head has ▣ / 🪟`);
      await page.evaluate(() => window.__swmLab.run('games.frame', 'place'));
      const fileFull = await until(async () => {
        const x = await where(page);
        return x.mode === 'stage' && x.inPlace && !x.fs ? x : null;
      });
      check(!!fileFull, `${label}: with a video that isn't YouTube the video's place works too`);
    }
    check(!errors.length, `${label}: no page errors`, errors.slice(0, 2));
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Games and YouTube harness passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
