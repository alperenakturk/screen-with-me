// Card GW3 (owner, 17 Nov 2026): switching the room view ↔ the Shorts view with a table open keeps the game, its mode and
// its connection. A table in the video's place becomes a free window in the Shorts view (no ▣ / 🪟 there) and goes back
// to the video's place in the room view; a frame stays a frame. No game or room socket closes or reopens on the way,
// opening a game never drops the room's connection, and nothing is ever in the browser's full screen. Needs YouTube.
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 --var SWM_LOCAL_UNPACED:1 --var SWM_LAB_SERVER:1)
//   NODE_PATH=$(npm root -g) node scripts/harness/games-shorts/run.cjs [http://localhost:8787]
const { viaYouTube } = require('../via-youtube.cjs');
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const SHORT = 'https://www.youtube.com/shorts/aqz-KE-bpKQ';
let fails = 0;
const check = (ok, label, extra) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra !== undefined && !ok ? ' → ' + JSON.stringify(extra) : ''}`);
  if (!ok) fails++;
};
const until = (page, fn, arg, timeout = 8000) => page.waitForFunction(fn, arg, { timeout }).then(() => true).catch(() => false);
/** The Test Lab's `games.frame` (no argument would flip the mode, so a mode is always passed). */
const frameState = (page, arg) => page.evaluate(async (a) => {
  const line = (await window.__swmLab.run('games.frame', a)).text;
  return JSON.parse(line.slice(line.indexOf('{')));
}, arg);
const shortsView = (page) => page.evaluate(() => document.documentElement.classList.contains('shorts-view'));

(async () => {
  const browser = await chromium.launch();
  for (const [label, viewport] of [['1366', { width: 1366, height: 768 }], ['1920', { width: 1920, height: 1080 }]]) {
    const ctx = await browser.newContext({ viewport });
    await viaYouTube(ctx);
    await ctx.addInitScript(() => {
      for (const [k, v] of Object.entries({ lang: 'en', name: 'Alex', avatar: 'wizard', tipsSeen: '1', 'opt:autoInvite': '0', 'classics:chess:howSeen': '1' })) localStorage.setItem(k, v);
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    // Every WebSocket the page opens, and whether it closed.
    const sockets = [];
    page.on('websocket', (ws) => {
      const s = { url: ws.url(), closed: false };
      sockets.push(s);
      ws.on('close', () => (s.closed = true));
    });
    const open = () => sockets.filter((s) => !s.closed && !/vite|hmr/.test(s.url));
    await page.goto(`${SITE}/r/gs${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
    await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#media-input'), null, { timeout: 20000 });
    await page.fill('#media-input', SHORT);
    await page.click('#media-form button[value=load]');
    check(await until(page, () => document.documentElement.classList.contains('shorts-view'), null, 15000), `${label}: a Short opens the Shorts view`);
    await page.click('#shorts-exit');
    check(await until(page, () => !document.documentElement.classList.contains('shorts-view')), `${label}: ↩ Room view leaves it`);
    const roomSockets = open().length;
    check(roomSockets >= 1, `${label}: the room's connection is open`, sockets);
    const before = sockets.length;
    // A table opens in the video's place (the first time): one new socket, the room's stays open.
    await page.evaluate(() => window.__swmLab.run('games.open.classics'));
    await until(page, () => !document.getElementById('game-stage')?.hidden && !!document.querySelector('#game-stage .game-fit > *'));
    await page.waitForTimeout(800);
    let st = await frameState(page, 'place');
    check(st.view === 'place' && !st.gameFullscreen, `${label}: the table is in the video's place, not full screen`, st);
    const withGame = open().length;
    check(withGame === roomSockets + 1 && sockets.slice(0, before).every((s) => !s.closed), `${label}: opening the table adds its socket and drops none`, sockets);
    const count = sockets.length;
    // Into the Shorts view and back, twice, in each mode.
    for (const mode of ['place', 'frame']) {
      st = await frameState(page, mode);
      for (let round = 1; round <= 2; round++) {
        // (A frame may sit over the button: the frame I chose over the player, GW2; a person moves it, we press it.)
        await page.evaluate(() => document.getElementById('shorts-enter').click());
        check(await until(page, () => document.documentElement.classList.contains('shorts-view')), `${label} ${mode} ${round}: 📱 Shorts view opens`);
        await page.waitForTimeout(600);
        const inShorts = await page.evaluate(() => {
          const s = document.getElementById('game-stage');
          const r = s.getBoundingClientRect();
          return { hidden: s.hidden, float: s.classList.contains('float'), modeButton: !s.querySelector('.game-mode')?.hidden, onScreen: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, fs: !!document.fullscreenElement };
        });
        st = await frameState(page, mode);
        check(!inShorts.hidden && inShorts.float && !inShorts.modeButton && inShorts.onScreen && !inShorts.fs && st.view === 'shorts' && st.mode === mode, `${label} ${mode} ${round}: in the Shorts view the table is a free window (no ▣ / 🪟), its mode kept`, { inShorts, st });
        await page.click('#shorts-exit');
        check(await until(page, () => !document.documentElement.classList.contains('shorts-view')), `${label} ${mode} ${round}: ↩ Room view`);
        await page.waitForTimeout(600);
        st = await frameState(page, mode);
        check(st.view === (mode === 'place' ? 'place' : 'frame') && !st.gameFullscreen, `${label} ${mode} ${round}: back in the room view the table is ${mode === 'place' ? "in the video's place" : 'its frame'} again`, st);
      }
    }
    check(sockets.length === count && open().length === withGame, `${label}: no socket closed or reopened on the way`, sockets);
    check(await page.evaluate(() => !!document.querySelector('#game-stage .xox-page, #game-stage .game-fit > *')), `${label}: the game is still there`);
    check(!errors.length, `${label}: no page errors`, errors.slice(0, 2));
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Games keep their mode and connection across the Shorts view');
  process.exit(fails ? 1 : 0);
})();
