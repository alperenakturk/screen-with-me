// The Shorts rail (0.9.92.2, owner chose C): on wide screens the Shorts bar is a column right of the video and the
// top bar folds on screens under 900 px tall; phones have their own slim bar (phone harness). Checks at laptop, monitor, big and short
// screens: the page never scrolls, the rail sits right of the video and fits beside it, ⋯ shows only when the top bar
// is folded and brings it back, Enter / 💬 open the message box; on a phone the phone bar stays under the video.
//
//   npm run dev, then: NODE_PATH=$(npm root -g) node scripts/harness/shorts-rail/run.cjs [site]
const { viaYouTube } = require('../via-youtube.cjs');
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:5173';
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};

async function openShort(ctx) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // What the page sends to the room (card YTK checks "▶ Play now" and the arrow keys by it).
  const sent = [];
  page.on('websocket', (ws) => ws.on('framesent', (f) => sent.push(String(f.payload))));
  await page.addInitScript(() => {
    // Also runs in the YouTube frame, where storage is off limits.
    try {
      localStorage.setItem('tipsSeen', '1');
    } catch {}
  });
  await page.goto(`${SITE}/r/rail${Math.random().toString(36).slice(2, 7)}`);
  await page.fill('#name', 'Alex');
  await page.click('#name-form button.primary');
  await page.waitForSelector('#media-input, #add-toggle', { state: 'attached' });
  // On a phone the link box is in ＋ → Add a video (0.9.92.3).
  if (!(await page.isVisible('#media-input'))) {
    await page.click('#chat-plus');
    await page.click('.ph-sheet .ph-tile >> nth=0');
  }
  await page.fill('#media-input', 'https://www.youtube.com/shorts/aqz-KE-bpKQ');
  await page.click('#media-form button[value=load]');
  await page.waitForFunction(() => document.documentElement.classList.contains('shorts-view'));
  await page.waitForTimeout(800);
  return { page, errors, sent };
}

const box = (page, sel) =>
  page.evaluate((s) => {
    const r = document.querySelector(s).getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), b: Math.round(r.bottom) };
  }, sel);

(async () => {
  const browser = await chromium.launch();
  const sizes = [
    ['laptop 1366×768', 1366, 768, true],
    ['monitor 1920×1080', 1920, 1080, false],
    ['big 2560×1440', 2560, 1440, false],
    ['short 1024×640', 1024, 640, true],
  ];
  for (const [name, width, height, folded] of sizes) {
    const ctx = await browser.newContext({ viewport: { width, height } });
    await viaYouTube(ctx);
    const { page, errors, sent } = await openShort(ctx);
    const video = await box(page, '.player-wrap');
    const bar = await box(page, '#shorts-bar');
    const nav = await box(page, '#shorts-nav');
    const doc = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, w: innerWidth, h: innerHeight }));
    check(doc.sw <= doc.w && doc.sh <= doc.h, `${name}: the page doesn't scroll`, doc);
    check(bar.x >= video.r && bar.w <= 56 && bar.y >= video.y, `${name}: the rail is right of the video`, { video, bar });
    check(bar.b <= nav.y && nav.b <= video.b + 1, `${name}: the rail and ▲▼ fit beside the video`, { bar, nav, video });
    const old = Math.min(Math.max(320, height - 210), 880);
    check(video.h > old, `${name}: the video is taller than with the bottom bar`, { now: video.h, before: old });
    const more = await page.isVisible('#shorts-more');
    check(more === folded, `${name}: ⋯ only when the top bar is folded`, { more, folded });
    if (folded) {
      const hidden = await box(page, '.topbar');
      await page.click('#shorts-more');
      await page.waitForTimeout(350);
      const shown = await box(page, '.topbar');
      await page.mouse.click(8, height - 8);
      await page.waitForTimeout(350);
      const again = await box(page, '.topbar');
      check(hidden.b <= 0 && shown.y === 0 && again.b <= 0, `${name}: ⋯ shows the top bar, a click elsewhere folds it`, { hidden: hidden.b, shown: shown.y, again: again.b });
    }
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    const typing = await page.evaluate(() => document.activeElement?.id);
    const chat = await box(page, '#shorts-chat');
    check(typing === 'shorts-input' && chat.x >= video.r && chat.r <= width, `${name}: Enter opens the message box beside the rail`, { typing, chat });
    await page.keyboard.press('Escape');
    await page.click('#shorts-feed');
    await page.waitForTimeout(300);
    const feed = await box(page, '#shorts-feed-form');
    check(feed.r <= width && feed.b <= height && feed.y >= 0, `${name}: the ♾ window stays on screen`, feed);
    // 0.9.93.1: the rail's square-button rule used to squeeze the windows' own buttons into 48 px squares.
    const start = await box(page, '#shorts-feed-form .feed-topic-row .btn');
    check(start.w > 60 && start.r <= feed.r, `${name}: "Start the feed" keeps its size inside the window`, { start, feed });
    await page.keyboard.press('Escape');
    await page.mouse.click(5, height / 2);
    // ＋ Add with search results (faked) stays on screen and its button is a normal button.
    await page.route('**/api/youtube/search**', (route) =>
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ items: Array.from({ length: 10 }, (_, i) => ({ id: `abcdefghij${i}`, title: `Result ${i}`, channel: 'C', duration: 30, live: false, short: true })) }),
      }),
    );
    await page.click('#shorts-add');
    await page.fill('#shorts-add-input', 'dogs');
    await page.press('#shorts-add-input', 'Enter');
    await page.waitForSelector('#shorts-add-results li');
    await page.waitForTimeout(300);
    const add = await box(page, '#shorts-add-form');
    const addButton = await box(page, '#shorts-add-form .feed-topic-row .btn');
    check(add.r <= width && add.b <= height && add.y >= 0, `${name}: the ＋ window with results stays on screen`, add);
    check(addButton.w > 40 && addButton.r <= add.r && Math.abs(addButton.y - (await box(page, '#shorts-add-input')).y) < 12, `${name}: ＋ Add's button sits beside the box`, addButton);
    const playNow = await box(page, '#shorts-add-form .shorts-play-now');
    check(playNow.w > 40 && playNow.x >= addButton.r && playNow.r <= add.r && Math.abs(playNow.y - addButton.y) < 4, `${name}: "▶ Play now" sits beside Add, inside the window`, { playNow, addButton, add });
    if (name.startsWith('laptop')) {
      const msgs = () => sent.map((m) => { try { return JSON.parse(m); } catch { return {}; } });
      // Shorts view: → / ← stay what they were (no seek of ours).
      await page.mouse.click(5, height / 2);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(500);
      check(!msgs().some((m) => m.t === 'seek'), `${name}: → in the Shorts view sends no seek`);
      // Words + "Play now": the first result opens at once and the window closes.
      await page.click('#shorts-add');
      await page.fill('#shorts-add-input', 'dogs');
      await page.click('#shorts-add-form .shorts-play-now');
      const loaded = await page.waitForFunction(() => document.querySelector('#shorts-add-form').hidden, null, { timeout: 4000 }).catch(() => null);
      const first = msgs().find((m) => m.t === 'load' && m.media?.id === 'abcdefghij0');
      check(!!loaded && !!first && first.media.short === true, `${name}: words + "▶ Play now" open the first Short found and close the window`, msgs().filter((m) => m.t === 'load').map((m) => m.media?.id));
      // Two links + "Play now": the first plays now, the second is queued.
      await page.waitForTimeout(600);
      await page.click('#shorts-add');
      await page.fill('#shorts-add-input', 'https://www.youtube.com/shorts/dQw4w9WgXcQ https://youtube.com/shorts/jNQXAC9IVRw');
      await page.click('#shorts-add-form .shorts-play-now');
      await page.waitForTimeout(1200);
      const many = msgs();
      check(many.some((m) => m.t === 'load' && m.media?.id === 'dQw4w9WgXcQ') && many.some((m) => m.t === 'enqueue' && m.media?.id === 'jNQXAC9IVRw'), `${name}: several links + "▶ Play now": the first plays, the rest are queued`, many.filter((m) => m.t === 'load' || m.t === 'enqueue').map((m) => `${m.t}:${m.media?.id}`));
    }
    check(await page.evaluate(() => document.querySelector('#player-error')?.hidden !== false || document.querySelector('#player-error').getBoundingClientRect().right < document.querySelector('.player-wrap').getBoundingClientRect().left), `${name}: a player note never covers the video`);
    check(errors.length === 0, `${name}: no page errors`, errors);
    await ctx.close();
  }
  const phone = await browser.newContext({ ...devices['Pixel 7'] });
  await viaYouTube(phone);
  const { page, errors } = await openShort(phone);
  const video = await box(page, '.player-wrap');
  // Phones have their own slim bar under the video (0.9.92.4, `ui/phone-room.ts`), not the rail.
  const bar = await box(page, '.ph-shorts-bar');
  check(!!bar && bar.y >= video.b - 1 && bar.h > 30 && (await page.isVisible('#ph-shorts-chat')) && !(await page.isVisible('#shorts-chat-btn')), 'phone: the phone bar stays under the video, no rail', { video, bar });
  check(errors.length === 0, 'phone: no page errors', errors);
  await phone.close();
  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Shorts rail works');
  process.exit(failed ? 1 : 0);
})();
