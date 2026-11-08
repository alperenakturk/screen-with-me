// Card YTG (the YouTube audit, gap 2): on a computer nothing of ours may sit in front of the YouTube player, games
// included. While the room plays a YouTube video a game's window keeps to the space beside the player (under it when
// the window is too small), "in the video's place" is not offered, a drag can't bring it over the player, going
// fullscreen tucks the game away and bringing a game up in fullscreen leaves fullscreen. The YouTube player only has
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
    return { shown: true, overlap, onScreen, mode: ['float', 'stage', 'below', 'full'].find((m) => s.classList.contains(m)), game: [g.left, g.top, g.width, g.height].map(Math.round), player: [t.left, t.top, t.width, t.height].map(Math.round), stageBtn: document.querySelector('#game-stage .place-stage')?.disabled ?? null };
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
    for (const kind of ['classics', 'sea']) {
      await page.evaluate((k) => window.__swmLab.run(`games.open.${k}`), kind);
      const w = await until(async () => {
        const x = await where(page);
        return x.shown ? x : null;
      });
      await wait(600);
      const now = await where(page);
      check(now.shown && !now.overlap && now.onScreen, `${label} ${kind}: the game window opens clear of the YouTube player, whole on screen`, now ?? w);
      if (now.mode === 'float') check(now.stageBtn === true, `${label} ${kind}: "in the video's place" is not offered`, now);
      // Pressing "in the video's place" anyway does nothing; a drag of the head onto the player can't bring it there.
      await page.evaluate(() => document.querySelector('#game-stage .place-stage')?.click());
      if (now.mode === 'float') {
        const head = await page.evaluate(() => {
          const r = document.querySelector('#game-stage .game-stage-head').getBoundingClientRect();
          const t = document.getElementById('theater').getBoundingClientRect();
          return { x: r.left + 40, y: r.top + r.height / 2, tx: t.left + t.width / 2, ty: t.top + t.height / 2 };
        });
        await page.mouse.move(head.x, head.y);
        await page.mouse.down();
        await page.mouse.move(head.tx, head.ty, { steps: 8 });
        await page.mouse.up();
        await wait(300);
      }
      const after = await where(page);
      check(after.shown && !after.overlap && after.onScreen, `${label} ${kind}: after "in the video's place" and a drag onto the player it still keeps clear`, after);
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
      check(back.shown && !back.overlap, `${label}: … and the window is clear of the player again`, back);
      // Card GW: the game's own fullscreen (⛶) still works over a YouTube room: the game alone on the screen, not tucked away.
      await page.click('#game-stage .game-full');
      const own = await until(() => page.evaluate(() => document.fullscreenElement?.id === 'game-stage' && !document.getElementById('game-stage').hidden));
      check(!!own, `${label}: ⛶ puts the game itself on the whole screen (the YouTube room stays behind)`);
      await page.click('#game-stage .game-full');
      const out = await until(() => page.evaluate(() => !document.fullscreenElement && !document.getElementById('game-stage').hidden));
      const clear = await where(page);
      check(!!out && clear.shown && !clear.overlap, `${label}: leaving the game's fullscreen brings the window back clear of the player`, clear);
      // A video that isn't YouTube (the sync test): "in the video's place" is offered again.
      await page.evaluate(() => window.__swmLab.run('games.open.classics'));
      await page.fill('#media-input', `${SITE}/sample.mp4`);
      await page.evaluate(() => document.querySelector('#media-form button[value="load"]')?.click());
      const free = await until(() => page.evaluate(() => !document.getElementById('theater').classList.contains('yt-rail') && document.querySelector('#game-stage .place-stage')?.disabled === false));
      check(!!free, `${label}: with a video that isn't YouTube "in the video's place" is offered again`);
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
