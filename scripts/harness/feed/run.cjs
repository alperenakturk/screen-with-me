// Card SH2: the room's feeds from the Queue ("Up next"). With no feed the Queue offers "♾ Shorts feed" and "▶ Video
// feed"; the window starts one; the Queue row shows it to everyone with ⏸ / ▶, 🧭 Steer and ✕; a steer swaps the
// queued videos for ones that follow it (nothing the room played comes back); Test Lab `feed.state` reports it. A
// computer and a phone, with a second person who sees the row. YouTube's answers are faked (no API key locally).
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/feed/run.cjs [http://localhost:8787] [out-dir]
const { viaYouTube } = require('../via-youtube.cjs');
const { phoneReady } = require('../phone-ready.cjs');
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || require('os').tmpdir();
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};

/** 11-character fake ids that say where they came from: `pop<region><n>`, `chan…`, `topi…`. */
const fakeId = (prefix, n) => `${prefix}${String(n).padStart(11 - prefix.length, '0')}`;
/** Fake YouTube answers by endpoint; every call is logged so the test can see what was asked. */
async function fakeYouTube(ctx, asked) {
  await ctx.route('**/api/youtube/**', (route) => {
    const url = new URL(route.request().url());
    asked.push(url.pathname + url.search);
    const region = url.searchParams.get('region') ?? 'auto';
    const prefix = url.pathname.endsWith('/chart') ? `p${region.slice(0, 2)}` : url.pathname.endsWith('/channel') ? 'ch' : url.pathname.endsWith('/like') ? 'lk' : `t${region.slice(0, 2)}`;
    const short = url.searchParams.get('short') === '1' || url.pathname.endsWith('/pool');
    const items = Array.from({ length: 10 }, (_, i) => ({ id: fakeId(prefix, i), title: `${prefix} ${i}`, channel: 'C', duration: short ? 30 : 600, live: false, ...(short ? { short: true } : {}) }));
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items }) });
  });
}

(async () => {
  const browser = await chromium.launch();
  for (const [label, options, lang] of [
    ['computer', { viewport: { width: 1366, height: 768 } }, 'en'],
    ['phone', { ...devices['Pixel 7'] }, 'tr'],
  ]) {
    const room = `fd${Math.random().toString(36).slice(2, 8)}`;
    const asked = [];
    const open = async (name, opts) => {
      const ctx = await browser.newContext(opts);
      await viaYouTube(ctx);
      await fakeYouTube(ctx, asked);
      await ctx.addInitScript((l) => {
        try {
          localStorage.setItem('tipsSeen', '1');
          localStorage.setItem('lang', l);
          localStorage.setItem('opt:autoInvite', '0');
        } catch {}
      }, lang);
      const page = await ctx.newPage();
      await page.goto(`${SITE}/r/${room}?debug=1`);
      await page.fill('#name', name);
      await page.click('#name-form button.primary');
      await page.waitForSelector('.room');
      await phoneReady(page);
      return page;
    };
    const page = await open('Alex', options);
    const friend = await open('Sam', { viewport: { width: 1280, height: 800 } });
    // The Queue: a tab beside the chat on a computer, under the search box (🔍) on a phone.
    const showQueue = async (p, phone) => {
      if (phone) await p.click('#ph-tab-search');
      else await p.click('.tab[data-tab="queue"]');
      await p.waitForSelector('#feed-row', { state: 'visible' });
    };
    const phone = label === 'phone';
    await showQueue(page, phone);
    await showQueue(friend, false);
    const startBtns = await page.evaluate(() => [...document.querySelectorAll('#feed-row button')].map((b) => ({ id: b.id, h: Math.round(b.getBoundingClientRect().height) })));
    check(startBtns.map((b) => b.id).join() === 'feed-open-shorts,feed-open-videos' && startBtns.every((b) => b.h >= (phone ? 44 : 24)), `${label}: no feed → the Queue offers ♾ Shorts feed and ▶ Video feed`, JSON.stringify(startBtns));

    // ▶ Video feed → 🔥 Popular now (the chart, 1 unit): the window fits the screen and starts it.
    await page.click('#feed-open-videos');
    await page.waitForSelector('#feed-window');
    await page.waitForTimeout(300);
    const box = await page.evaluate(() => {
      const r = document.getElementById('feed-window').getBoundingClientRect();
      const w = document.getElementById('feed-window');
      const video = document.querySelector('.player-wrap')?.getBoundingClientRect();
      return { x: r.left, y: r.top, r: r.right, b: r.bottom, vw: innerWidth, vh: innerHeight, scroll: w.scrollHeight > w.clientHeight + 1, tab: document.querySelector('.feed-tab[aria-checked="true"]')?.dataset.kind, backdrop: !!document.querySelector('.feed-backdrop'), modal: w.getAttribute('aria-modal'), videoLeftFree: !video || video.width === 0 || r.left >= video.left + video.width * 0.5 || r.top >= video.top + video.height * 0.35 };
    });
    check(box.x >= 0 && box.y >= 0 && Math.abs(box.r - box.vw) <= 1 && box.b <= box.vh + 1 && !box.scroll && box.tab === 'videos' && !box.backdrop && box.modal === null && box.videoLeftFree, `${label}: the ▶ drawer sits on the right (a half sheet on a phone), whole (no scrollbar), no backdrop, the video stays visible`, JSON.stringify(box));
    await page.screenshot({ path: `${OUT}/feed-${label}-start.png` });
    // Card FD1: a tile only selects; the summary says what will play; "▶ Start feed" starts it.
    await page.click('#feed-pools .feed-pool[data-pool="music"]');
    const chosen = await page.evaluate(() => ({ queue: document.querySelectorAll('#queue li').length, summary: document.getElementById('feed-summary')?.textContent ?? '', checked: document.querySelector('.feed-pool[aria-checked="true"]')?.dataset.pool, open: !!document.getElementById('feed-window') }));
    check(chosen.open && chosen.queue === 0 && chosen.checked === 'music' && /Music|Müzik/.test(chosen.summary), `${label}: a tile only selects it; the summary says what will play`, JSON.stringify(chosen));
    await page.click('#feed-start');
    await page.waitForFunction(() => document.querySelectorAll('#queue li').length >= 1, null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const started = await friend.evaluate(async () => ({ row: document.getElementById('feed-row-text')?.textContent ?? '', items: [...document.querySelectorAll('#queue li')].length, lab: (await window.__swmLab?.run('feed.state'))?.text }));
    check(/Video|video/.test(started.row) && asked.some((a) => a.startsWith('/api/youtube/chart?kind=music')), `${label}: ▶ Popular now · Music runs and the friend sees it in the Queue`, JSON.stringify({ started, asked: asked.slice(-2) }));

    // ⏸ from the friend's side: paused for everyone, ▶ resumes.
    await friend.click('#feed-row-pause');
    await page.waitForFunction(() => document.getElementById('feed-row')?.classList.contains('paused'), null, { timeout: 5000 }).catch(() => {});
    const paused = await page.evaluate(() => document.getElementById('feed-row').classList.contains('paused'));
    await friend.click('#feed-row-pause');
    await page.waitForFunction(() => !document.getElementById('feed-row')?.classList.contains('paused'), null, { timeout: 5000 }).catch(() => {});
    check(paused, `${label}: the friend pauses it from the Queue, and resumes it`);

    // 🧭 Steer → 🌍 same topic, other country: the queued videos change to that country's chart.
    const before = await page.evaluate(() => [...document.querySelectorAll('#queue li')].map((li) => li.textContent).join('|'));
    await page.click('#feed-row-steer');
    await page.waitForSelector('#feed-steer-country');
    await page.screenshot({ path: `${OUT}/feed-${label}-steer.png` });
    const steerBox = await page.evaluate(() => {
      const w = document.getElementById('feed-window');
      const r = w.getBoundingClientRect();
      return { b: r.bottom, vh: innerHeight, rows: document.querySelectorAll('.feed-row-line').length, lines: [...document.querySelectorAll('.feed-row-line p')].every((p) => p.textContent.length > 10) };
    });
    check(steerBox.rows === 4 && steerBox.lines && steerBox.b <= steerBox.vh + 1, `${label}: the drawer shows four ways to steer, each described`, JSON.stringify(steerBox));
    // Everyone sees the pill above the video: what runs, how many left, who started it.
    const pill = await friend.evaluate(() => ({ hidden: document.getElementById('feed-pill')?.hidden, text: document.getElementById('feed-pill')?.textContent ?? '', stop: !!document.getElementById('feed-pill-stop') }));
    check(!pill.hidden && /Alex/.test(pill.text) && /left|kaldı/.test(pill.text) && pill.stop, `${label}: the friend sees the feed pill (what, how many left, by Alex) with ⏸ and ✕`, JSON.stringify(pill));
    await page.selectOption('#feed-steer-region', 'JP');
    await page.click('#feed-steer-country');
    await page.waitForTimeout(5000);
    const after = await page.evaluate(() => [...document.querySelectorAll('#queue li')].map((li) => li.textContent).join('|'));
    check(asked.some((a) => a.includes('/chart?kind=music&region=JP')) && /pJP/.test(after) && !/pau/.test(after), `${label}: a steer to Japan swaps the queued videos for Japan's`, JSON.stringify({ before: before.slice(0, 80), after: after.slice(0, 80) }));
    const lab = await page.evaluate(async () => (await window.__swmLab.run('feed.state')).text);
    check(/"steers":1/.test(lab) && /"kind":"videos"/.test(lab) && /"remembered":\d+/.test(lab), `${label}: feed.state reports the feed, one steer and the remembered count`, lab);
    await page.keyboard.press('Escape').catch(() => {});

    // ✕ stops it for everyone; the two start buttons come back.
    await friend.click('#feed-row-stop');
    await page.waitForFunction(() => !!document.getElementById('feed-open-shorts'), null, { timeout: 5000 }).catch(() => {});
    check(await page.evaluate(() => !!document.getElementById('feed-open-shorts')), `${label}: ✕ from the friend stops it for everyone`);

    // Card FC1: words + a kind chip + a country combine into one query; a video link greys the kind and the country.
    // (A long video plays, so the ▶ Videos kind: a Shorts feed waits while a video of the other kind plays.)
    await showQueue(page, phone);
    await page.click('#feed-open-videos');
    await page.click('#feed-pools .feed-pool[data-pool="popular"]');
    await page.fill('#feed-topic', 'hay');
    await page.selectOption('#feed-region', 'JP');
    const willPlay = await page.textContent('#feed-summary');
    asked.length = 0;
    await page.click('#feed-start');
    for (let i = 0; i < 40 && !asked.some((a) => a.includes('/search')); i++) await page.waitForTimeout(200);
    const region = JSON.parse((await page.evaluate(async () => (await window.__swmLab.run('feed.region')).text)).replace(/^▶ /, ''));
    check(
      region.source?.kind === 'topic' && region.source.q === 'hay' && region.source.pool === 'popular' && region.source.region === 'JP' && region.youtube?.relevanceLanguage === 'ja' && region.youtube?.regionCode === 'JP' && region.youtube?.order === 'viewCount' && region.youtube?.q === 'hay',
      `${label}: Popular + Japan + "hay" is one query in Japanese, by views (feed.region)`,
      JSON.stringify({ region, willPlay }),
    );
    check(asked.some((a) => /\/search\?long=1&region=JP&cat=popular/.test(a)), `${label}: the request carries the country and the kind`, JSON.stringify(asked.slice(0, 3)));
    check(/hay/.test(willPlay ?? '') && /🇯🇵/.test(willPlay ?? ''), `${label}: "Will play" names the words and the country`, willPlay);
    await friend.click('#feed-row-stop').catch(() => {});
    await page.waitForFunction(() => !!document.getElementById('feed-open-shorts'), null, { timeout: 5000 }).catch(() => {});
    await page.click('#feed-open-shorts');
    await page.fill('#feed-topic', 'https://www.youtube.com/watch?v=M7lc1UVf-VE');
    const grey = await page.evaluate(() => ({ note: !document.getElementById('feed-no-combine')?.hidden, tiles: [...document.querySelectorAll('#feed-pools .feed-pool')].every((b) => b.disabled), region: document.getElementById('feed-region')?.disabled }));
    check(grey.note && grey.tiles && grey.region, `${label}: a video link greys the kinds and the country, with the reason`, JSON.stringify(grey));
    await page.keyboard.press('Escape').catch(() => {});
    await page.context().close();
    await friend.context().close();
  }
  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ feeds from the Queue');
  process.exit(fails ? 1 : 0);
})();
