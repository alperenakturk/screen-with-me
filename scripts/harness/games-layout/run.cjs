// Card GW4 (owner, 17 Nov 2026: "opening Five Frames made the YouTube frame and the chat shift and shrink"): opening,
// playing and closing a game never moves the room. Every side game and table, with a video file (and a YouTube video at
// 1366), at 1366, 1920 and a phone: the video's box and the side panel's box stay the same (± 1 px) before, while and
// after the game is open, measured by the Test Lab hook `games.layoutStable`. A phone's Games tab turns the video into
// a strip on purpose (PH2), so there only the side panel is judged and the video must be back once the game is gone.
//
//   built site + local server with the lab flag (CI's prepare) and a video on :5300 (scripts/ci-test-video.sh), then:
//   node scripts/harness/games-layout/run.cjs [site] [video]
//   SIZES=1366 GAMES=word,sea VIDEOS=file narrow it.
const { chromium, devices } = require('playwright');
const { viaYouTube } = require('../via-youtube.cjs');

const SITE = process.argv[2] || 'http://localhost:8787';
const FILM = process.argv[3] || 'http://localhost:5300/video.webm';
const YOUTUBE = 'https://www.youtube.com/watch?v=M7lc1UVf-VE';
const pick = (env, all) => (process.env[env] ? process.env[env].split(',') : all);
const SIZES = {
  1366: { ctx: { viewport: { width: 1366, height: 768 } }, videos: ['file', 'youtube'] },
  1920: { ctx: { viewport: { width: 1920, height: 1080 } }, videos: ['file'] },
  phone: { ctx: devices['iPhone 13'], videos: ['file'] },
};
const GAMES = pick('GAMES', ['word', 'snack', 'garden', 'classics', 'sea', 'duel', 'quiz', 'draw', 'poker']);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let fails = 0;
const check = (ok, label, extra) => {
  if (!ok) {
    fails++;
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=games-layout::${label} → ${JSON.stringify(extra)}`);
  }
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra !== undefined ? ` → ${JSON.stringify(extra)}` : ''}`);
};

async function roomPage(browser, size, video) {
  const ctx = await browser.newContext({ ...SIZES[size].ctx });
  await viaYouTube(ctx);
  await ctx.addInitScript(() => {
    const seen = { lang: 'en', name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', extUpdateSeen: '9' };
    for (const g of ['snackBar', 'windowGarden', 'fiveFrames', 'classics:xox', 'sea', 'duel', 'quiz', 'draw', 'poker']) seen[`${g}:howSeen`] = '1';
    for (const [k, v] of Object.entries(seen)) localStorage.setItem(k, v);
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
  await page.goto(`${SITE}/r/gl${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
  await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#media-input'), null, { timeout: 25000 });
  await page.waitForSelector('.room-title-dot[data-status="open"]', { state: 'attached', timeout: 25000 }).catch(() => {});
  await page.waitForFunction(() => window.__swmLab.list().some((c) => c.id === 'games.layoutStable'), null, { timeout: 25000 }).catch(() => {});
  await page.addStyleTag({ content: '#debug-panel-root { display: none !important; }' });
  await page.evaluate((url) => {
    const input = document.querySelector('#media-input');
    input.value = url;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#media-form button[value="load"]').click();
  }, video === 'youtube' ? YOUTUBE : FILM);
  await page.waitForFunction(() => document.querySelector('.room')?.classList.contains('has-item'), null, { timeout: 15000 }).catch(() => {});
  await wait(2500);
  return { ctx, page, errors };
}

(async () => {
  const browser = await chromium.launch();
  for (const size of pick('SIZES', Object.keys(SIZES))) {
    for (const video of pick('VIDEOS', SIZES[size].videos).filter((v) => SIZES[size].videos.includes(v))) {
      const { ctx, page, errors } = await roomPage(browser, size, video);
      const start = await page.evaluate(() => document.querySelector('.player-wrap')?.getBoundingClientRect().height ?? 0);
      for (const game of GAMES) {
        const res = await page.evaluate((g) => window.__swmLab.run('games.layoutStable', g).then((l) => ({ dir: l.dir, text: l.text })), game);
        let out = null;
        try {
          out = JSON.parse(res.text.slice(res.text.indexOf('{')));
        } catch {}
        check(res.dir === 'lab' && out?.stable === true, `${size} · ${video} · ${game}: the video and the side panel stay put`, out ?? res);
        if (size === 'phone') {
          // PH2: the Games tab shrinks the video to a strip; going back to the Room tab brings it back whole.
          await page.evaluate(() => document.querySelector('.ph-strip-back, .ph-tabs [data-tab="room"]')?.click());
          await wait(700);
          const h = await page.evaluate(() => document.querySelector('.player-wrap')?.getBoundingClientRect().height ?? 0);
          check(Math.abs(h - start) <= 1, `${size} · ${video} · ${game}: back in the Room tab the video is its old size`, { start, now: h });
        }
      }
      check(!errors.length, `${size} · ${video}: no page errors`, errors.slice(0, 2));
      await ctx.close();
    }
  }
  await browser.close();
  console.log(fails ? `\n${fails} check(s) failed` : '\nall checks passed');
  process.exit(fails ? 1 : 0);
})();
