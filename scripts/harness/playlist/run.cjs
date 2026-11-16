// Card CR2: a YouTube Music album / playlist link fills the queue. The playlist endpoint is faked (no YouTube quota):
// pasting `music.youtube.com/playlist?list=OLAK5uy_…` asks `/api/youtube/playlist` once and the room gets every
// track in the playlist's order with its title (the first one plays when nothing was playing); a private / empty list
// says so and adds nothing. Test Lab `queue.playlist` adds the three fixture tracks. Computer (EN) and phone (TR).
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/playlist/run.cjs [http://localhost:8787] [out-dir]
const { chromium, devices } = require('playwright');
const { viaYouTube } = require('../via-youtube.cjs');
const { phoneReady } = require('../phone-ready.cjs');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || require('os').tmpdir();
const ALBUM = 'OLAK5uy_kHarnessAlbum0000000000000000000';
const EMPTY = 'PLharnessPrivateList00000';
const TRACKS = [
  { id: 'aqz-KE-bpKQ', title: 'Harness album · 1 Opening' },
  { id: 'jNQXAC9IVRw', title: 'Harness album · 2 Middle' },
  { id: 'dQw4w9WgXcQ', title: 'Harness album · 3 Late' },
  { id: 'M7lc1UVf-VE', title: 'Harness album · 4 Closing' },
];
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};
const lab = async (page, id) => (await page.evaluate(async (id) => (await window.__swmLab.run(id)).text, id)).replace(/^\S+\s/, '');
/** The queue's video ids, in order (from each row's thumbnail; the server may swap in YouTube's own titles). */
const roomTitles = (page) =>
  page.evaluate(() => [...document.querySelectorAll('.queue-item img.thumb')].map((e) => e.src.match(/\/vi\/([A-Za-z0-9_-]{11})\//)?.[1] ?? e.src));

(async () => {
  const browser = await chromium.launch();
  for (const [label, options, lang] of [
    ['computer', { viewport: { width: 1366, height: 768 } }, 'en'],
    ['phone', { ...devices['Pixel 7'] }, 'tr'],
  ]) {
    const asked = [];
    const ctx = await browser.newContext(options);
    await viaYouTube(ctx);
    await ctx.route('**/api/youtube/playlist**', (route) => {
      const url = new URL(route.request().url());
      asked.push(url.searchParams.get('list'));
      const items = url.searchParams.get('list') === ALBUM ? TRACKS.map((t) => ({ ...t, channel: 'Harness', duration: 200, live: false })) : [];
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items }) });
    });
    await ctx.addInitScript((l) => {
      try {
        localStorage.setItem('tipsSeen', '1');
        localStorage.setItem('lang', l);
        localStorage.setItem('opt:autoInvite', '0');
      } catch {}
    }, lang);
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/pl${Math.random().toString(36).slice(2, 8)}?debug=1`);
    await page.fill('#name', 'Alex');
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await phoneReady(page);
    const phone = label === 'phone';
    if (phone) await page.click('#ph-tab-search');

    // An empty / private list: a note, nothing added.
    await page.fill('#media-input', `https://music.youtube.com/playlist?list=${EMPTY}`);
    await page.press('#media-input', 'Enter');
    const note = await page
      .waitForFunction(() => [...document.querySelectorAll('.hint, .flash-hint, [role="status"]')].some((e) => /private|gizli/.test(e.textContent ?? '')), null, { timeout: 5000 })
      .then(() => true, () => false);
    check(note && asked.includes(EMPTY), `${label}: an empty or private playlist says so`, JSON.stringify(asked));

    // The album: every track, in order, with its title.
    await page.fill('#media-input', `https://music.youtube.com/playlist?list=${ALBUM}&si=share`);
    await page.press('#media-input', 'Enter');
    if (!phone) await page.click('.tab[data-tab="queue"]').catch(() => {});
    await page.waitForFunction((n) => document.querySelectorAll('.queue-item').length >= n, TRACKS.length - 1, { timeout: 15000 }).catch(() => {});
    const titles = await roomTitles(page);
    const want = TRACKS.map((t) => t.id);
    const tail = want.slice(want.length - titles.length);
    check(titles.length >= TRACKS.length - 1 && JSON.stringify(titles) === JSON.stringify(tail), `${label}: the album's tracks are in the queue, in the playlist's order`, JSON.stringify(titles));
    check(asked.filter((l) => l === ALBUM).length === 1, `${label}: the playlist was asked for once`, JSON.stringify(asked));
    check((await page.inputValue('#media-input')) === '', `${label}: the link box is empty again`);
    await page.screenshot({ path: `${OUT}/playlist-${label}.png` });

    // Test Lab: three fixture tracks.
    const before = titles.length;
    const out = JSON.parse(await lab(page, 'queue.playlist'));
    await page.waitForFunction((n) => document.querySelectorAll('.queue-item').length >= n, before + 3, { timeout: 10000 }).catch(() => {});
    const after = await roomTitles(page);
    check(out.queued === 3 && JSON.stringify(after.slice(-3)) === JSON.stringify(['aqz-KE-bpKQ', 'dQw4w9WgXcQ', 'jNQXAC9IVRw']), `${label}: queue.playlist adds the three fixture tracks`, JSON.stringify({ out, last: after.slice(-3) }));
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Playlist and album links fill the queue');
  process.exit(fails ? 1 : 0);
})();
