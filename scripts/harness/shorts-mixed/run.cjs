// Card SH1 item 4 (TikTok, small): a queue that mixes YouTube Shorts and TikToks, pasted at once, swipes through in
// paste order on a computer (EN) and a phone (TR). A TikTok app share link (vm.tiktok.com) is looked up by the server
// (stubbed here: the cloud can't reach tiktok.com) and keeps its place in the list; TikTok's player is a fake page
// that speaks its postMessage protocol (as in scripts/harness/tiktok). While a TikTok plays, the ♾ window says TikTok
// has no feed and points to links; on a YouTube Short that note is gone. YouTube's player is the test stand-in (fake-youtube.cjs, card CI4).
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/shorts-mixed/run.cjs [http://localhost:8787] [out-dir]
const { fakeYouTube } = require('../fake-youtube.cjs');
const { phoneReady } = require('../phone-ready.cjs');
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || require('os').tmpdir();
const TT_FULL = '7000000000000000001';
const TT_SHORT = '7000000000000000002';
const SHORT_LINK = 'https://vm.tiktok.com/ZMabc123/';
// Paste order: YouTube, TikTok (short share link), TikTok (full link), YouTube.
const PASTE = [
  'https://www.youtube.com/shorts/aqz-KE-bpKQ',
  SHORT_LINK,
  `https://www.tiktok.com/@someone/video/${TT_FULL}`,
  'https://www.youtube.com/shorts/jNQXAC9IVRw',
].join('\n');
const EXPECT = [
  { kind: 'youtube', id: 'aqz-KE-bpKQ' },
  { kind: 'tiktok', id: TT_SHORT },
  { kind: 'tiktok', id: TT_FULL },
  { kind: 'youtube', id: 'jNQXAC9IVRw' },
];
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};

const FAKE = `<!doctype html><html><body style="margin:0;background:#111;color:#fff;font:14px sans-serif">fake TikTok
<script>
  let t = 0, playing = false, last = performance.now();
  const send = (type, value) => parent.postMessage({ 'x-tiktok-player': true, type, value }, '*');
  addEventListener('message', (e) => {
    const d = e.data || {};
    if (!d['x-tiktok-player']) return;
    if (d.type === 'play') { playing = true; last = performance.now(); send('onStateChange', 1); }
    if (d.type === 'pause') { playing = false; send('onStateChange', 2); }
    if (d.type === 'seekTo') { t = Number(d.value) || 0; last = performance.now(); }
  });
  setInterval(() => {
    const now = performance.now();
    if (playing) t += (now - last) / 1000;
    last = now;
    send('onCurrentTime', { currentTime: t, duration: 60 });
  }, 250);
  setTimeout(() => send('onPlayerReady'), 100);
</script></body></html>`;

/** What the player shows now: `{kind, id}` from the frame's address. */
const playing = (page) =>
  page.evaluate(() => {
    const src = document.querySelector('#player iframe')?.src ?? '';
    const tt = src.match(/tiktok\.com\/player\/v1\/(\d+)/);
    if (tt) return { kind: 'tiktok', id: tt[1] };
    const yt = src.match(/\/embed\/([\w-]{11})/);
    return yt ? { kind: 'youtube', id: yt[1] } : null;
  });

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [label, options, lang] of [
    ['computer', { viewport: { width: 1366, height: 768 } }, 'en'],
    ['phone', { ...devices['Pixel 7'] }, 'tr'],
  ]) {
    const ctx = await browser.newContext(options);
    await fakeYouTube(ctx);
    await ctx.route('https://www.tiktok.com/player/v1/**', (r) => r.fulfill({ contentType: 'text/html', body: FAKE }));
    let lookups = 0;
    await ctx.route('**/api/tiktok/resolve?**', (r) => {
      lookups++;
      const asked = new URL(r.request().url()).searchParams.get('u');
      const body = asked === SHORT_LINK ? { media: { kind: 'tiktok', id: TT_SHORT } } : { error: 'failed' };
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    await ctx.addInitScript((l) => {
      try {
        localStorage.setItem('tipsSeen', '1');
        localStorage.setItem('lang', l);
        localStorage.setItem('opt:autoInvite', '0');
      } catch {}
    }, lang);
    const page = await ctx.newPage();
    // What went over the room connection (message types, errors in full): printed when a swipe doesn't arrive.
    const frames = [];
    const note = (dir, data) => {
      try {
        const m = JSON.parse(String(data));
        frames.push(`${dir}${m.t}${m.t === 'error' ? `:${m.code}` : m.t === 'next' ? `:${m.from}` : m.t === 'state' ? `:${m.state?.item?.media?.id ?? '-'}` : ''}`);
        if (frames.length > 40) frames.shift();
      } catch {}
    };
    page.on('websocket', (ws) => {
      ws.on('framesent', (f) => note('→', f.payload));
      ws.on('framereceived', (f) => note('←', f.payload));
    });
    await page.goto(`${SITE}/r/sm${Math.random().toString(36).slice(2, 8)}?debug=1`);
    await page.fill('#name', 'Alex');
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await phoneReady(page);
    // The room's live connection must be open first: a link sent before it opens is dropped (CI run 43917530748).
    await page.waitForSelector('.room-title-dot[data-status="open"]', { state: 'attached', timeout: 20000 });
    if (!(await page.isVisible('#media-input'))) await page.click('#ph-tab-search');
    await page.fill('#media-input', PASTE);
    await page.click('#media-form button[value=load]');
    const opened = await page.waitForFunction(() => document.documentElement.classList.contains('shorts-view'), null, { timeout: 15000 }).then(() => true).catch(() => false);
    check(opened, `${label}: the pasted list opens the Shorts view`);
    // The list goes out one link at a time (300 ms apart, a share link after its lookup): swipe only once all four are
    // in the room (one playing, three waiting), or a quick ▼ meets an empty queue (CI run 43900178828).
    const queued = await page.waitForFunction(() => /^3\b/.test(document.getElementById('shorts-left')?.textContent ?? ''), null, { timeout: 15000 }).then(() => true).catch(() => false);
    check(queued, `${label}: all four links reached the room (three waiting)`, await page.evaluate(() => document.getElementById('shorts-left')?.textContent ?? ''));
    check(lookups === 1, `${label}: the short share link was looked up once`, String(lookups));

    for (let i = 0; i < EXPECT.length; i++) {
      const want = EXPECT[i];
      const got = await page
        .waitForFunction((w) => {
          const src = document.querySelector('#player iframe')?.src ?? '';
          return w.kind === 'tiktok' ? src.includes(`/player/v1/${w.id}`) : src.includes(`/embed/${w.id}`);
        }, want, { timeout: 15000 })
        .then(() => true)
        .catch(() => false);
      check(got, `${label} ${i + 1}/${EXPECT.length}: ${want.kind} ${want.id} plays, in paste order`, got ? JSON.stringify(await playing(page)) : `${JSON.stringify(await playing(page))} · connection: ${frames.join(' ')}`);
      // Card SH1 (2): a TikTok (the fake player starts at 0:00) reports that it started from its very start.
      if (want.kind === 'tiktok') {
        let state = 'no start';
        for (let n = 0; n < 40 && !/"start":\d/.test(state); n++) {
          state = await page.evaluate(async () => (await window.__swmLab.run('shorts.state')).text).catch(() => 'no start');
          if (!/"start":\d/.test(state)) await page.waitForTimeout(200);
        }
        check(/"start":0[,}]/.test(state), `${label} ${i + 1}: Test Lab shorts.state says the TikTok started at 0:00`, state);
      }
      // The ♾ window: its TikTok note only while a TikTok plays.
      if (label === 'computer' && (i === 0 || i === 1)) {
        // The ♾ window (card SH2, `ui/feed-window.ts`, a lazy chunk) and its Shorts tab.
        await page.click('#shorts-feed');
        await page.waitForSelector('#feed-window', { timeout: 8000 }).catch(() => {});
        const note = await page.evaluate(() => {
          const n = document.getElementById('feed-tiktok');
          const r = n?.getBoundingClientRect();
          return { shown: !!n && !!r && r.height > 0, text: n?.textContent ?? '' };
        });
        check(want.kind === 'tiktok' ? note.shown && /no public feed/.test(note.text) : !note.shown, `${label}: the ♾ window's TikTok note ${want.kind === 'tiktok' ? 'shows on a TikTok' : 'is hidden on a YouTube Short'}`, JSON.stringify(note));
        if (want.kind === 'tiktok') await page.screenshot({ path: `${OUT}/shorts-mixed-feed-note.png` });
        await page.keyboard.press('Escape');
        await page.waitForSelector('#feed-window', { state: 'detached', timeout: 3000 }).catch(() => {});
      }
      if (i === EXPECT.length - 1) break;
      const inShorts = await page.evaluate(() => document.documentElement.classList.contains('shorts-view'));
      check(inShorts, `${label} ${i + 1}: still in the Shorts view`);
      // Swipe on: the computer's ↓ key, the phone's ▼ in its Shorts bar.
      if (label === 'computer') {
        await page.locator('body').focus().catch(() => {});
        await page.keyboard.press('ArrowDown');
      } else await page.click('#ph-shorts-next');
    }
    await page.screenshot({ path: `${OUT}/shorts-mixed-${label}.png` });
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ mixed Shorts queue passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
