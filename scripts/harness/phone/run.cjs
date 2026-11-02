// Phones: the room as an app screen (0.9.92.3, owner's picks 1A 2B 3A 6B 7A 8A 9A on
// https://claude.ai/artifact/MsCuFRZjQ6EyDAX8YFtEQu): no top bar, the video edge to edge, the faces strip (🎙 📷 ⋯),
// the chat, the message box with 😀 and ＋; everything else in bottom sheets. Also fullscreen without the browser's
// (iPhone) and by turning the phone sideways, Shorts fitting the screen with touch swipes. Needs Playwright
// (preinstalled in cloud sessions), `npm run dev` and a long local video (for example the embed harness's
// `FILM_VIDEO=… node scripts/harness/embed/film-server.mjs`, which serves it on :5300):
//   NODE_PATH=$(npm root -g) node scripts/harness/phone/run.cjs [http://localhost:5173] [http://localhost:5300/video.webm]
const { chromium, devices } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:5173';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};
const rect = (page, selector) =>
  page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
  }, selector);

async function enter(page, room) {
  await page.addInitScript(() => {
    localStorage.setItem('tipsSeen', '1');
    // The site starts in English (0.9.92.3); these checks read Turkish labels.
    if (!localStorage.getItem('lang')) localStorage.setItem('lang', 'tr');
  });
  await page.goto(`${SITE}/r/${room}`);
  await page.fill('#name', 'Alex');
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await page.waitForTimeout(1500);
}

/** Puts links / words in the room's link box: on a phone through ＋ → Add a video. */
async function addMedia(page, text, mode) {
  if (!(await page.isVisible('#media-input'))) {
    await page.click('#chat-plus');
    await page.click('.ph-sheet .ph-tile >> nth=0');
  }
  await page.fill('#media-input', text);
  if (mode) await page.click(`#media-form button[value=${mode}]`);
}

const sheetName = (page) => page.evaluate(() => {
  const s = document.querySelector('.ph-sheet');
  return s && !s.hidden ? s.dataset.sheet : null;
});

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const id = () => `ph${Math.random().toString(36).slice(2, 7)}`;

  // 1) iPhone held upright: the room as an app screen.
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], permissions: ['camera', 'microphone'] });
    // iPhone Safari has no fullscreen for page elements.
    await ctx.addInitScript(() => (Element.prototype.requestFullscreen = undefined));
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await enter(page, id());
    const vw = await page.evaluate(() => innerWidth);
    const vh = await page.evaluate(() => innerHeight);
    const doc = await page.evaluate(() => ({ cls: document.documentElement.className, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight }));
    check(doc.cls.includes('ph-room') && doc.sw <= vw && doc.sh <= vh, 'phone: app screen, nothing wider or taller than the screen', JSON.stringify({ ...doc, vw, vh }));
    check(!(await page.isVisible('.topbar')), 'phone: no top bar (2B)');
    const theater = await rect(page, '#theater');
    check(!!theater && theater.x === 0 && Math.abs(theater.w - vw) <= 1 && theater.y <= 1, 'phone: the video edge to edge at the top', JSON.stringify(theater));
    const strip = await rect(page, '.together-strip');
    check(!!strip && Math.abs(strip.y - theater.b) <= 2 && (await page.isVisible('#strip-mic')) && (await page.isVisible('#strip-cam')) && (await page.isVisible('#strip-more')), 'phone: faces strip under the video with 🎙 📷 ⋯');
    const form = await rect(page, '#chat-form');
    check(!!form && Math.abs(form.b - vh) <= 1 && (await page.isVisible('#chat-react')) && (await page.isVisible('#chat-plus')), 'phone: message box at the bottom with 😀 and ＋', JSON.stringify(form));
    check(!(await page.isVisible('.voice-ptt')), 'phone: push-to-talk (V key) hidden');
    // ＋ → Add a video: the link box and the queue in one sheet; "Play now" plays and closes it.
    await page.click('#chat-plus');
    check((await sheetName(page)) === 'plus' && (await page.$$('.ph-sheet .ph-tile')).length >= 4, 'phone: ＋ opens a sheet of actions');
    await page.click('.ph-sheet .ph-tile >> nth=0');
    check((await sheetName(page)) === 'add' && (await page.isVisible('.ph-sheet #media-input')) && (await page.isVisible('.ph-sheet [data-panel="queue"]')), 'phone: Add a video = link box + queue in one sheet');
    await page.fill('#media-input', VIDEO);
    await page.click('#media-form button[value=load]');
    await page.waitForSelector('#player video');
    await page.waitForTimeout(1200);
    check((await sheetName(page)) === null && (await page.evaluate(() => !!document.querySelector('.stage #media-form'))), '"Play now" closes the sheet; the link box is back in its place');
    // Several links at once into the queue from the sheet (the room's code must still find its note and queue).
    await addMedia(page, 'https://www.youtube.com/watch?v=aqz-KE-bpKQ https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'enqueue');
    await page.waitForTimeout(1500);
    const many = await page.evaluate(() => ({ queued: document.querySelectorAll('#queue li').length, note: document.getElementById('media-done')?.textContent ?? '' }));
    check(many.queued === 2 && many.note.length > 0, 'phone: two links at once go to the queue from the Add sheet', JSON.stringify(many));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    // ⋯ More: invite, queue, people, games, recap, film time, profile, settings, language.
    await page.click('#strip-more');
    check((await sheetName(page)) === 'more' && (await page.$$('.ph-sheet .ph-tile')).length === 9, 'phone: ⋯ opens the More sheet (9 tiles)');
    await page.click('.ph-sheet .ph-tile >> nth=2');
    check((await sheetName(page)) === 'people' && (await page.isVisible('.ph-sheet #members')), 'phone: More → People shows the people list');
    // The phone's back button closes a sheet.
    await page.evaluate(() => history.back());
    await page.waitForTimeout(400);
    check((await sheetName(page)) === null && (await page.evaluate(() => !!document.querySelector('.tabs-card [data-panel="people"]'))), 'phone: back closes the sheet, the panel is back in the room');
    // 😀 opens the emoji tray as a bottom sheet; 😀 again closes it.
    await page.click('#chat-react');
    await page.waitForTimeout(300);
    const tray = await rect(page, '.toolbar .react-tray');
    check(!!tray && tray.x >= -1 && Math.abs(tray.r - vw) <= 1 && Math.abs(tray.b - vh) <= 1 && tray.h > 40, 'phone: 😀 opens the emoji tray from the bottom', JSON.stringify(tray));
    const onTop = await page.evaluate(() => {
      const r = document.querySelector('.toolbar .react-tray').getBoundingClientRect();
      return document.elementFromPoint(r.left + r.width / 2, r.bottom - 10)?.closest('.react-tray') !== null;
    });
    check(onTop, 'phone: the tray covers the message box (not under it)');
    await page.mouse.click(vw / 2, 120);
    await page.waitForTimeout(300);
    check(!(await page.isVisible('.toolbar .react-tray')), 'phone: a tap outside closes it');
    // The toolbar's windows still open as sheets (games, speed) and the profile menu too.
    for (const [open, tileIndex, pop, label] of [
      ['#chat-plus', 1, '#game-menu', 'games'],
      ['#chat-plus', 4, '#speed-pop', 'speed'],
      ['#strip-more', 6, '.profile-pop', 'profile'],
    ]) {
      await page.click(open);
      await page.click(`.ph-sheet .ph-tile >> nth=${tileIndex}`);
      await page.waitForTimeout(400);
      const r = await rect(page, pop);
      check(!!r && r.x >= -1 && Math.abs(r.r - vw) <= 1 && Math.abs(r.b - vh) <= 1 && r.h > 40, `phone: ${label} opens as a bottom sheet`, JSON.stringify(r));
      await page.mouse.click(vw / 2, 30);
      await page.waitForTimeout(300);
    }
    await page.click('#strip-more');
    await page.click('.ph-sheet .ph-tile >> nth=7');
    await page.waitForTimeout(300);
    const settings = await rect(page, '#settings-dialog .settings-window');
    check(!!settings && settings.w >= vw - 1 && settings.h >= vh - 1, 'phone: settings is a full page', JSON.stringify(settings));
    await page.keyboard.press('Escape');
    // Camera on from the strip's 📷 (fake camera): my face shows the live picture; tapping it shows it big.
    await page.click('#strip-cam');
    // The IP notice, then the pre-join check (camera preview): accept both.
    for (let i = 0; i < 6 && !(await page.evaluate(() => !!document.querySelector('#voice-people .face-cam'))); i++) {
      await page.waitForTimeout(600);
      const button = await page.$('.dialog-backdrop:not([hidden]) button.primary');
      if (button) await button.click().catch(() => {});
    }
    await page.waitForFunction(() => document.querySelector('#voice-people .face-cam')?.readyState >= 2, null, { timeout: 15000 }).catch(() => {});
    const faceCam = await page.evaluate(() => ({ cam: document.querySelector('#voice-people .face-cam')?.readyState ?? -1, playing: !document.querySelector('#voice-people .face-cam')?.paused }));
    check(faceCam.cam >= 2 && faceCam.playing, 'phone: camera on → my face in the strip shows the live picture', JSON.stringify(faceCam));
    await page.click('#voice-people .together-person');
    await page.waitForTimeout(500);
    check(await page.evaluate(() => !!document.querySelector('.person-pop .person-cam')), 'phone: tapping a face opens their sheet with the camera big');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    // Fullscreen without the browser's: the theater covers the window, the dock is there, its exit works.
    await page.click('#chat-plus');
    await page.click('.ph-sheet .ph-tile:has-text("Tam ekran")');
    await page.waitForTimeout(600);
    const fsBox = await rect(page, '#theater');
    check(await page.evaluate(() => document.getElementById('theater').classList.contains('pseudo-fs')) && !!fsBox && fsBox.w === vw && Math.abs(fsBox.h - vh) <= 1, 'iPhone: ＋ → Fullscreen covers the window (no browser fullscreen)', JSON.stringify(fsBox));
    check((await rect(page, '#fs-dock'))?.w > 30, 'iPhone: the dock shows in fullscreen');
    await page.click('#dock-exit');
    await page.waitForTimeout(400);
    check(!(await page.evaluate(() => document.getElementById('theater').classList.contains('fake-fs'))), 'iPhone: the dock\'s exit leaves fullscreen');
    // Turning the phone sideways opens it, upright closes it.
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(600);
    check(await page.evaluate(() => document.getElementById('theater').classList.contains('pseudo-fs')), 'phone turned sideways opens fullscreen');
    const dock = await rect(page, '#fs-dock');
    check(!!dock && dock.y >= 0 && dock.b <= 390, 'sideways: the dock fits the screen', JSON.stringify(dock));
    // 4B: a slim column beside the video (never on it), only 💬 😀 🎙 📷 and exit.
    const player = await rect(page, '#player');
    const shown = await page.evaluate(() => [...document.querySelectorAll('#fs-dock .dock-btn')].filter((b) => b.offsetParent).map((b) => b.id).join(','));
    check(!!dock && !!player && dock.x >= player.r - 1 && dock.r >= 843 && dock.w <= 70 && dock.h >= 380, 'sideways: the dock is a column beside the video', JSON.stringify({ dock, player }));
    check(shown === 'dock-chat,dock-react,dock-mic,dock-cam,dock-exit', 'sideways: the dock holds 💬 😀 🎙 📷 and exit', shown);
    await page.click('#dock-chat');
    await page.waitForTimeout(300);
    const pop = await rect(page, '#dock-chat-form');
    const popVisible = await page.evaluate(() => {
      const f = document.getElementById('dock-chat-form');
      const r = f.getBoundingClientRect();
      return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('#dock-chat-form') === f;
    });
    check(!!pop && popVisible && pop.r <= dock.x + 1, 'sideways: 💬 opens the message box left of the dock', JSON.stringify(pop));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await page.setViewportSize({ width: 390, height: 664 });
    await page.waitForTimeout(600);
    check(!(await page.evaluate(() => document.getElementById('theater').classList.contains('pseudo-fs'))), 'phone upright again: the room comes back');
    check(errors.length === 0, 'phone: no page errors', errors.join(' | '));
    await ctx.close();
  }

  // 1b) A desktop window keeps the desktop room (top bar, side panel, no phone strip).
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await enter(page, id());
    check(!(await page.evaluate(() => document.documentElement.classList.contains('ph-room'))) && (await page.isVisible('.topbar')) && (await page.isVisible('.tabs')) && !(await page.isVisible('#strip-more')) && !(await page.isVisible('#chat-plus')), 'desktop: the desktop room, no phone parts');
    await ctx.close();
  }

  // 2) Shorts on an Android phone: opens by itself, fits the screen, a swipe up goes to the next one.
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    const page = await ctx.newPage();
    const roomId = id();
    await enter(page, roomId);
    await addMedia(page, 'https://www.youtube.com/shorts/aqz-KE-bpKQ https://www.youtube.com/shorts/dQw4w9WgXcQ https://www.youtube.com/shorts/9bZkp7q5F8I', 'load');
    await page.waitForTimeout(4000);
    check(await page.evaluate(() => document.querySelector('.room').classList.contains('shorts')), 'Shorts: Short açılınca Shorts görünümü kendiliğinden');
    const fit = await page.evaluate(() => ({ doc: document.documentElement.scrollHeight, vh: innerHeight, bar: document.getElementById('shorts-bar').getBoundingClientRect().bottom }));
    check(fit.doc <= fit.vh + 1 && fit.bar <= fit.vh + 1, 'Shorts: ekrana sığıyor (sayfa kaymıyor)', JSON.stringify(fit));
    const before = await page.textContent('#now-title');
    const box = await rect(page, '.player-wrap');
    const cdp = await ctx.newCDPSession(page);
    // 0.9.91.17: YouTube's own bar is on the video (YouTube's rules: nothing of ours over its player), so the swipe
    // is beside it; on a phone (0.9.92.4) the video fills the width: the swipe starts on the bar under it.
    const strip = await rect(page, '.ph-shorts-bar');
    const x = strip ? 20 : Math.max(4, box.x / 2);
    const y = strip ? strip.y + strip.h / 2 - 120 : box.y + box.h / 2;
    const touch = (type, at) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: at }] });
    await touch('touchStart', y + 120);
    for (let i = 1; i <= 6; i++) {
      await touch('touchMove', y + 120 - i * 30);
      await page.waitForTimeout(16);
    }
    await touch('touchEnd');
    await page.waitForTimeout(2500);
    check((await page.textContent('#now-title')) !== before, 'Shorts: yukarı kaydırınca sıradaki açılıyor');
    // 0.9.92.4 (pick 5A): the video takes the screen, one slim bar under it; no top bar.
    const vh2 = await page.evaluate(() => innerHeight);
    const video = await rect(page, '.player-wrap');
    const bar = await rect(page, '.ph-shorts-bar');
    check((await page.evaluate(() => document.documentElement.classList.contains('ph-shorts'))) && !(await page.isVisible('.topbar')) && video.h >= vh2 - 110 && Math.abs(bar.b - vh2) <= 1 && bar.y >= video.b - 1 && bar.y - video.b <= 30, 'Shorts: the video takes the screen, one bar under it, no top bar', JSON.stringify({ video, bar, vh2 }));
    check(await page.evaluate(() => ['#ph-shorts-chat', '#ph-shorts-react', '#ph-shorts-prev', '#ph-shorts-next', '#ph-shorts-more'].every((s) => !!document.querySelector(s)?.offsetWidth) && document.querySelectorAll('.ph-faces .seat').length >= 1), 'Shorts: the bar has the seats and 💬 😀 ▲ ▼ ⋯');
    // A friend writes: the message shows in the bar for a moment; 💬 opens the chat.
    const friend = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const fp = await friend.newPage();
    await enter(fp, roomId);
    await fp.keyboard.press('Enter');
    await fp.fill('#shorts-input', 'what a great one');
    await fp.press('#shorts-input', 'Enter');
    const toast = await page.waitForFunction(() => { const t = document.querySelector('.ph-toast'); return t && !t.hidden ? t.textContent : null; }, null, { timeout: 8000 }).then((h) => h.jsonValue()).catch(() => null);
    check(!!toast && toast.includes('what a great one'), 'Shorts: a friend\'s message shows in the bar', String(toast));
    await page.click('#ph-shorts-chat');
    await page.waitForTimeout(300);
    check((await sheetName(page)) === 'shorts-chat' && (await page.isVisible('.ph-sheet #chat-input')) && (await page.textContent('.ph-sheet #chat-list')).includes('what a great one'), 'Shorts: 💬 opens the chat with the message box');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    // ⋯ → Add: the Shorts add window opens as a sheet; a tap on its backdrop (over the video) closes it.
    await page.click('#ph-shorts-more');
    check((await sheetName(page)) === 'shorts-more' && (await page.$$('.ph-sheet .ph-tile')).length >= 7, 'Shorts: ⋯ opens the Shorts menu');
    await page.click('.ph-sheet .ph-tile:has-text("Ekle")');
    await page.waitForTimeout(400);
    const add = await rect(page, '#shorts-add-form');
    check(!!add && Math.abs(add.b - vh2) <= 1 && (await page.isVisible('.ph-pop-backdrop')), 'Shorts: ⋯ → Add opens as a bottom sheet with a backdrop', JSON.stringify(add));
    await page.mouse.click(30, 60);
    await page.waitForTimeout(300);
    check(!(await page.isVisible('#shorts-add-form')) && !(await page.isVisible('.ph-pop-backdrop')), 'Shorts: a tap over the video closes it');
    // Sideways: the bar becomes a column right of the video.
    await page.setViewportSize({ width: 915, height: 412 });
    await page.waitForTimeout(500);
    const side = { video: await rect(page, '.player-wrap'), bar: await rect(page, '.ph-shorts-bar') };
    check(side.bar.x >= side.video.r - 1 && side.video.h >= 400 && side.bar.h >= 400, 'Shorts sideways: the bar is a column right of the video', JSON.stringify(side));
    await page.setViewportSize({ width: 412, height: 839 });
    await page.waitForTimeout(400);
    // ↩ Room view: back to the phone room, the seats back in place.
    await page.click('#ph-shorts-more');
    await page.click('.ph-sheet .ph-tile:has-text("Oda görünümü")');
    await page.waitForTimeout(900);
    check((await page.evaluate(() => document.documentElement.classList.contains('ph-room') && !!document.querySelector('.stage > #seats-l') && !document.querySelector('.ph-shorts-bar'))), 'Shorts: ↩ Room view brings the phone room back');
    await friend.close();
    await ctx.close();
  }

  // 2b) Themes on a phone (0.9.91.5): only the plain ones are offered; a scene theme chosen on a computer shows as
  // Gece here (and stays saved).
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    const page = await ctx.newPage();
    await page.goto(`${SITE}/`);
    await page.evaluate(() => localStorage.setItem('theme', 'sinema'));
    await page.goto(`${SITE}/`);
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => ({ chips: document.querySelectorAll('#theme-strip .theme-chip').length, shown: document.documentElement.dataset.theme, saved: localStorage.getItem('theme') }));
    check(r.chips === 4 && r.shown === 'gece' && r.saved === 'sinema', 'telefon: sadece düz renk temaları, resimli tema telefonda Gece görünüyor', JSON.stringify(r));
    await ctx.close();
    const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const dp = await desk.newPage();
    await dp.goto(`${SITE}/`);
    await dp.waitForTimeout(1200);
    check((await dp.evaluate(() => document.querySelectorAll('#theme-strip .theme-chip').length)) === 11, 'bilgisayarda bütün temalar duruyor');
    await desk.close();
  }

  // 2c) Search (0.9.91.12, a stand-in search answer: the cloud has no YouTube key): a Short found by the link box's
  // search opens in the Shorts view, and the Shorts bar's "＋ Ekle" searches Shorts only and queues them.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const asked = [];
    await page.route('**/api/youtube/search**', (route) => {
      const url = new URL(route.request().url());
      asked.push(url.searchParams.get('short') === '1' ? 'short' : 'all');
      const q = url.searchParams.get('q') ?? '';
      // Feeds (0.9.91.13): each topic has its own Shorts.
      const feed = (prefix) => Array.from({ length: 5 }, (_, i) => ({ id: `${prefix}${i}`.padEnd(11, 'x'), title: `${prefix} ${i}`, channel: 'K', duration: 30, live: false, short: true }));
      const items = q === 'kediler' ? feed('kedi') : q === 'kopekler' ? feed('kopek') : url.searchParams.get('short') === '1'
        ? [{ id: '9bZkp7q5F8I', title: 'Bir Short', channel: 'K', duration: 30, live: false, short: true }, { id: 'kJQP7kiw5Fk', title: 'Başka Short', channel: 'K', duration: 40, live: false, short: true }]
        : [{ id: 'aqz-KE-bpKQ', title: 'Dikey video', channel: 'K', duration: 45, live: false, short: true }, { id: 'dQw4w9WgXcQ', title: 'Yatay video', channel: 'K', duration: 212, live: false }];
      route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items }) });
    });
    await enter(page, id());
    await page.fill('#media-input', 'komik kediler');
    await page.press('#media-input', 'Enter');
    await page.waitForSelector('.search-row');
    const mark = await page.textContent('.search-row .search-meta');
    await page.click('.search-row .search-main');
    await page.waitForTimeout(2500);
    check(mark.includes('Shorts') && (await page.evaluate(() => document.querySelector('.room').classList.contains('shorts'))), 'arama: Shorts sonucu işaretli ve seçilince Shorts görünümünde açılıyor', mark);
    await page.click('#shorts-add');
    await page.fill('#shorts-add-input', 'komik kediler');
    await page.press('#shorts-add-input', 'Enter');
    await page.waitForSelector('#shorts-add-results .shorts-result');
    const rows = await page.$$eval('#shorts-add-results .shorts-result', (r) => r.length);
    await page.click('#shorts-add-results .shorts-result');
    await page.waitForTimeout(800);
    const queued = await page.evaluate(() => document.querySelectorAll('#queue-list li, .queue-item').length);
    const added = await page.evaluate(() => document.querySelector('#shorts-add-results .shorts-result')?.classList.contains('added'));
    check(rows === 2 && added && queued >= 1 && asked.includes('short'), 'Shorts çubuğu: “＋ Ekle” kelimeyle sadece Shorts arıyor, sonuç tek tıkla sıraya giriyor', JSON.stringify({ rows, added, queued, asked }));
    const mic = await page.evaluate(() => ({ off: document.getElementById('shorts-mic').classList.contains('off'), cam: document.getElementById('shorts-cam').classList.contains('off') }));
    check(mic.off && mic.cam, 'sese katılmadan önce 🎙 ve 📷 ikisi de kapalı görünüyor', JSON.stringify(mic));
    // A new Shorts feed takes the old feed's Shorts out of the queue (0.9.91.13).
    const queueIds = () => page.evaluate(() => [...document.querySelectorAll('#queue li')].map((li) => li.textContent).join('|'));
    const startFeed = async (topic) => {
      // A running feed stops with the first press; the next one opens the topic box.
      if ((await page.getAttribute('#shorts-feed', 'aria-pressed')) === 'true') await page.click('#shorts-feed');
      await page.click('#shorts-feed');
      await page.fill('#shorts-feed-topic', topic);
      await page.press('#shorts-feed-topic', 'Enter');
      await page.waitForTimeout(4500);
    };
    await startFeed('kediler');
    const first = await queueIds();
    await startFeed('kopekler');
    const second = await queueIds();
    check(first.includes('kedi') && second.includes('kopek') && !second.includes('kedi'), 'Shorts akışı: yeni akış başlayınca eski akışın videoları sıradan çıkıyor', JSON.stringify({ first: first.slice(0, 120), second: second.slice(0, 120) }));
    await ctx.close();
  }

  // 3) Desktop, real fullscreen: the join-voice notice opens inside the fullscreen view (it used to open behind it).
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['camera', 'microphone'] });
    const page = await ctx.newPage();
    await enter(page, id());
    await addMedia(page, VIDEO, 'load');
    await page.waitForSelector('#player video');
    await page.waitForTimeout(800);
    await page.click('#fullscreen');
    await page.waitForTimeout(600);
    const fs = await page.evaluate(() => document.fullscreenElement?.id ?? null);
    await page.mouse.move(640, 400);
    await page.click('#dock-mic');
    await page.waitForTimeout(600);
    const seen = await page.evaluate(() => {
      const d = document.querySelector('.confirm-dialog');
      return { dialog: !!d, inside: !!d && !!document.fullscreenElement?.contains(d) };
    });
    check(fs === 'theater' && seen.dialog && seen.inside, 'tam ekran: sese katılırken çıkan uyarı tam ekranın içinde görünüyor', JSON.stringify({ fs, seen }));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.evaluate(() => document.exitFullscreen?.().catch(() => {}));
    await page.waitForTimeout(400);
    check(!(await page.evaluate(() => document.querySelector('#theater .dialog-backdrop'))), 'tam ekrandan çıkınca pencereler yerine döndü');
    await ctx.close();
  }

  await browser.close();
  console.log(fails ? `\n✗ ${fails} kontrol başarısız` : '\n✓ Telefon testi geçti');
  process.exit(fails ? 1 : 0);
})();
