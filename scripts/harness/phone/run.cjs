// Phones: the room as an app screen (0.9.92.3; PH1 option A since 0.9.97.127): no top bar, the video edge to edge, the
// strip (faces + 📌 ⏩ 🔄 ⏭), the chat with the room's activity, one input row 🔗 · box · 🎙 · 📷 · 😀 and the bottom
// tabs Room · Search · Games · Me. Also fullscreen without the browser's
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

/** Puts links / words in the room's link box: on a phone through the Search tab. */
async function addMedia(page, text, mode) {
  if (!(await page.isVisible('#media-input'))) await page.click('#ph-tab-search');
  await page.fill('#media-input', text);
  if (mode) await page.click(`#media-form button[value=${mode}]`);
}

/** PH1: the Test Lab's phone room state (tab, typing, sheet, unread, which controls show). */
const phoneState = (page) => page.evaluate(() => {
  const html = document.documentElement;
  const shows = (sel) => {
    const n = document.querySelector(sel);
    return !!n && n.getClientRects().length > 0 && getComputedStyle(n).visibility !== 'hidden';
  };
  const sheet = document.querySelector('.ph-sheet');
  const unread = document.querySelector('#ph-side-chat .ph-unread, #ph-shorts-chat .ph-unread');
  return {
    tab: html.dataset.phTab,
    typing: !!document.querySelector('#chat-input')?.value,
    sheet: sheet && !sheet.hidden ? sheet.dataset.sheet : null,
    unread: unread && !unread.hidden ? Number(unread.textContent) : 0,
    visible: Object.fromEntries(['#chat-invite', '#chat-input', '#strip-mic', '#strip-cam', '#chat-send', '#chat-react', '.ph-strip-tools', '.ph-tabs', '.ph-empty-actions', '.ph-turn'].map((s) => [s, shows(s)])),
  };
});
const tab = (page, name) => page.getByRole('tab', { name, exact: true });

const sheetName = (page) => page.evaluate(() => {
  const s = document.querySelector('.ph-sheet');
  return s && !s.hidden ? s.dataset.sheet : null;
});

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const id = () => `ph${Math.random().toString(36).slice(2, 7)}`;

  // 1) iPhone held upright: the room as an app screen with bottom tabs (PH1, design option A). Buttons are found by
  // their names (Turkish here: the checks run the page in Turkish), not by ids, so a renamed id can't hide a missing
  // button.
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
    // The bottom tabs: Room · Search · Games · Me, a tablist at the foot of the screen, Room selected.
    const tabNames = await page.locator('.ph-tabs [role=tab] .ph-tab-label').allTextContents();
    const tabsBox = await rect(page, '.ph-tabs[role=tablist]');
    check(tabNames.map((s) => s.trim()).join('|') === 'Oda|Ara|Oyunlar|Ben' && !!tabsBox && Math.abs(tabsBox.b - vh) <= 1, 'phone: bottom tabs Oda · Ara · Oyunlar · Ben', JSON.stringify({ tabNames, tabsBox }));
    check((await tab(page, 'Oda').getAttribute('aria-selected')) === 'true', 'phone: the Room tab is selected');
    // The empty room: 🔍 Search a video and 🔗 Invite; the strip shows only the faces.
    check(await page.getByRole('button', { name: /Video ara/ }).isVisible(), 'phone, empty room: "🔍 Video ara" in the box');
    const state0 = await phoneState(page);
    check(!state0.visible['.ph-strip-tools'] && state0.visible['#chat-input'] && state0.visible['#chat-invite'] && state0.visible['#chat-react'], 'phone, empty room: no Pin / Speed / Sync / Skip yet; the input row shows', JSON.stringify(state0.visible));
    // Search a video → the Search tab: the link box, then "Up next" (the queue).
    await page.getByRole('button', { name: /Video ara/ }).click();
    await page.waitForTimeout(300);
    check((await tab(page, 'Ara').getAttribute('aria-selected')) === 'true' && (await page.getByRole('combobox').or(page.locator('#media-input')).first().isVisible()) && (await page.getByText('Sırada', { exact: false }).first().isVisible()), 'phone: "Video ara" opens the Search tab with the link box and Up next');
    const searchBox = await rect(page, '#media-input');
    check(!!searchBox && searchBox.w >= vw - 40, 'phone: the search box takes the full width', JSON.stringify(searchBox));
    // "Play now" plays and goes back to the Room tab; the link box goes home.
    await page.fill('#media-input', VIDEO);
    await page.getByRole('button', { name: 'Şimdi aç', exact: true }).click();
    await page.waitForSelector('#player video');
    await page.waitForTimeout(1200);
    check((await phoneState(page)).tab === 'room' && (await page.evaluate(() => !!document.querySelector('.stage #media-form'))), '"Şimdi aç" goes to the Room tab; the link box is back in its place');
    // Two links at once into the queue: Up next grows, the tab stays.
    await tab(page, 'Ara').click();
    await page.fill('#media-input', 'https://www.youtube.com/watch?v=aqz-KE-bpKQ https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.getByRole('button', { name: /Sıraya ekle/ }).click();
    await page.waitForTimeout(1500);
    const many = await page.evaluate(() => ({ queued: document.querySelectorAll('#queue li').length, note: document.getElementById('media-done')?.textContent ?? '' }));
    check(many.queued === 2 && many.note.length > 0 && (await phoneState(page)).tab === 'search', 'phone: two links at once go to Up next; the Search tab stays', JSON.stringify(many));
    await tab(page, 'Oda').click();
    await page.waitForTimeout(300);
    // With a video: the strip has 📌 ⏩ 🔄 ⏭ (one tap each), the input row 🔗 · box · 🎙 · 📷 · 😀 at the bottom.
    const strip = await rect(page, '.together-strip');
    const video = await rect(page, '#theater');
    const toolNames = await page.locator('.ph-strip-tools button').evaluateAll((b) => b.map((x) => x.getAttribute('aria-label')));
    check(!!strip && Math.abs(strip.y - video.b) <= 2 && toolNames.length === 4, 'phone: the strip under the video holds four video tools', JSON.stringify({ toolNames, strip, video }));
    const row = await page.evaluate(() => ['#chat-invite', '#chat-input', '#strip-mic', '#strip-cam', '#chat-send', '#chat-react'].map((s) => {
      const r = document.querySelector(s)?.getBoundingClientRect();
      return r && r.width > 0 ? Math.round(r.left) : -1;
    }));
    const form = await rect(page, '#chat-form');
    check(row[0] >= 0 && row[0] < row[1] && row[1] < row[2] && row[2] < row[3] && row[3] < row[5] && row[4] === -1 && !!form && Math.abs(form.b - tabsBox.y) <= 2, 'phone: one input row 🔗 · box · 🎙 · 📷 · 😀 above the tabs (no ➤ while empty)', JSON.stringify({ row, form }));
    const sizes = await page.evaluate(() => ['#chat-invite', '#strip-mic', '#chat-react', '.ph-strip-tools button'].map((s) => {
      const b = document.querySelector(s);
      const r = b.getBoundingClientRect();
      return [Math.round(r.width), Math.round(r.height), getComputedStyle(b).borderRadius, getComputedStyle(b).boxShadow];
    }));
    check(sizes.every(([w, h, rad, sh]) => w === 44 && h === 44 && rad === '10px' && sh === 'none'), 'phone: one 44 px button shape, radius 10, no shadow', JSON.stringify(sizes));
    // Typing: ➤ takes the place of 🎙 📷.
    await page.fill('#chat-input', 'hello from the phone');
    const typing = await phoneState(page);
    check(typing.typing && typing.visible['#chat-send'] && !typing.visible['#strip-mic'] && !typing.visible['#strip-cam'], 'phone: while typing ➤ replaces 🎙 📷', JSON.stringify(typing.visible));
    await page.press('#chat-input', 'Enter');
    await page.waitForTimeout(300);
    check((await page.textContent('#chat-list')).includes('hello from the phone') && (await phoneState(page)).visible['#strip-mic'], 'phone: sent; 🎙 📷 are back');
    check(!(await page.isVisible('.voice-ptt')), 'phone: push-to-talk (V key) hidden');
    // Speed from the strip opens as a bottom sheet; a tap outside closes it.
    await page.getByRole('button', { name: /Hız/ }).first().click();
    await page.waitForTimeout(400);
    const speed = await rect(page, '#speed-pop');
    check(!!speed && speed.x >= -1 && Math.abs(speed.r - vw) <= 1 && Math.abs(speed.b - vh) <= 1 && speed.h > 40, 'phone: ⏩ Speed opens as a bottom sheet', JSON.stringify(speed));
    await page.mouse.click(vw / 2, 30);
    await page.waitForTimeout(300);
    // 😀 opens the emoji tray as a bottom sheet with "🖼 Resim gönder" in it; 😀 again closes it.
    await page.click('#chat-react');
    await page.waitForTimeout(400);
    const tray = await rect(page, '.toolbar .react-tray');
    check(!!tray && tray.x >= -1 && Math.abs(tray.r - vw) <= 1 && Math.abs(tray.b - vh) <= 1 && tray.h > 40, 'phone: 😀 opens the emoji tray from the bottom', JSON.stringify(tray));
    check(await page.locator('.react-tray').getByRole('button', { name: /Resim gönder/ }).isVisible(), 'phone: the tray holds "🖼 Resim gönder"');
    await page.click('#chat-react', { force: true }).catch(() => {});
    await page.mouse.click(vw / 2, 30);
    await page.waitForTimeout(300);
    check(!(await page.isVisible('.toolbar .react-tray')), 'phone: a tap outside closes it');
    // The faces open People: who is here, then 🔗 Invite; the phone's back button closes it.
    await page.click('#voice-people');
    await page.waitForTimeout(300);
    check((await sheetName(page)) === 'people' && (await page.isVisible('.ph-sheet #members')) && (await page.locator('.ph-sheet').getByRole('button', { name: /Davet/ }).isVisible()), 'phone: the faces open People with 🔗 Invite');
    await page.goBack();
    await page.waitForTimeout(300);
    check((await sheetName(page)) === null && (await page.evaluate(() => !!document.querySelector('.tabs-card [data-panel="people"]'))), 'phone: back closes the sheet, the panel is back in the room');
    // Games tab: the games hall in the panel, the tabs still on screen.
    await tab(page, 'Oyunlar').click();
    await page.waitForTimeout(600);
    const hall = await rect(page, '.ph-panel[data-ph-panel=games]');
    const inHall = await page.evaluate(() => !!document.querySelector('.ph-panel[data-ph-panel=games] #game-menu:not([hidden])'));
    check(!!hall && Math.abs(hall.b - tabsBox.y) <= 1 && Math.abs(hall.y - video.b) <= 2 && inHall && (await page.locator('.hub-game').count()) >= 3, 'phone: the Games tab shows the hall between the video and the tabs', JSON.stringify(hall));
    // Me tab: me, then the settings as cards (Me, My screen, Sound & camera, Room, About…), Recap; no settings window.
    await tab(page, 'Ben').click();
    await page.waitForTimeout(500);
    const me = await page.evaluate(() => ({
      head: document.querySelector('.ph-me-head')?.textContent ?? '',
      cards: [...document.querySelectorAll('.ph-me-card [data-sec]')].map((s) => s.dataset.sec),
      dialog: !!document.querySelector('#settings-dialog[open]'),
    }));
    check(me.head.includes('Alex') && me.cards.length >= 4 && me.cards.includes('view') && me.cards.includes('about') && !me.dialog, 'phone: the Me tab = me + every settings category as a card', JSON.stringify(me));
    check(await page.locator('.ph-me').getByRole('button', { name: /Özet/ }).isVisible(), 'phone: the Me tab has ✨ Recap');
    // A setting opened from elsewhere (the person menu's "Settings", a lab command) lands on the Me tab too.
    await tab(page, 'Oda').click();
    await page.evaluate(() => document.querySelector('#settings-open')?.click());
    await page.waitForTimeout(300);
    check((await phoneState(page)).tab === 'me' && !(await page.evaluate(() => !!document.querySelector('#settings-dialog[open]'))), 'phone: opening Settings goes to the Me tab, no window');
    // A reload lands on the same tab (sessionStorage per room).
    await page.reload();
    await page.waitForSelector('.room');
    await page.waitForTimeout(1500);
    check((await phoneState(page)).tab === 'me', 'phone: a reload keeps the tab');
    await tab(page, 'Oda').click();
    // Arrow keys move between the tabs.
    await tab(page, 'Oda').focus();
    await page.keyboard.press('ArrowRight');
    check((await phoneState(page)).tab === 'search' && (await page.evaluate(() => document.activeElement?.id)) === 'ph-tab-search', 'phone: → moves to the next tab');
    await page.keyboard.press('ArrowLeft');
    await page.waitForSelector('#player video');
    await page.waitForTimeout(800);
    // Camera on from the input row's 📷 (fake camera): one tile in the camera row; tapping it shows it big.
    await page.click('#strip-cam');
    for (let i = 0; i < 6 && !(await page.evaluate(() => !!document.querySelector('.ph-cams .ph-cam video'))); i++) {
      await page.waitForTimeout(600);
      const button = await page.$('.dialog-backdrop:not([hidden]) button.primary');
      if (button) await button.click().catch(() => {});
    }
    await page.waitForFunction(() => document.querySelector('.ph-cams .ph-cam video')?.readyState >= 2, null, { timeout: 15000 }).catch(() => {});
    const camRow = await page.evaluate(() => ({
      cam: document.querySelector('.ph-cams .ph-cam video')?.readyState ?? -1,
      inFace: !!document.querySelector('#voice-people video'),
      windows: [...document.querySelectorAll('#voice-cams, .voice-cams, .cam-pill')].some((e) => e.getBoundingClientRect().width > 0),
    }));
    check(camRow.cam >= 2 && !camRow.inFace && !camRow.windows, 'phone: camera on → one tile in the camera row, the face stays a face, no camera windows', JSON.stringify(camRow));
    await page.click('.ph-cams .ph-cam');
    await page.waitForTimeout(500);
    check(await page.evaluate(() => !!document.querySelector('.person-pop .person-cam')), 'phone: tapping a camera opens their sheet with the camera big');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    // Turning the phone sideways does nothing by itself (0.9.92.8): the video left; on the right ⛶ Watch fullscreen,
    // 💬 Chat and 🎙; no tabs and no input row.
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(600);
    const side = await phoneState(page);
    const turned = await page.evaluate(() => ({
      fs: document.getElementById('theater').classList.contains('pseudo-fs'),
      chat: document.querySelector('.room [data-panel="chat"]').getBoundingClientRect().width,
    }));
    check(!turned.fs && side.visible['.ph-turn'] && !side.visible['.ph-tabs'] && !side.visible['#chat-input'] && turned.chat === 0, 'phone turned sideways: no automatic fullscreen; no tabs or input row', JSON.stringify({ turned, side: side.visible }));
    for (const name of [/Tam ekran izle/, /Sohbet/, /Sese katıl/]) check(await page.locator('.ph-turn').getByRole('button', { name }).isVisible(), `sideways: the column has ${name.source}`);
    // A friend's message while sideways: 💬 shows a count; 💬 opens the chat as a sheet and clears it.
    await page.evaluate(() => {
      // A friend's line as chat.ts draws it (name + text).
      const li = document.createElement('li');
      li.className = 'chat-line';
      li.innerHTML = '<span class="chat-name">Sam</span><span class="chat-text">look at this</span>';
      document.getElementById('chat-list').append(li);
    });
    await page.waitForTimeout(200);
    check((await phoneState(page)).unread === 1 && (await page.locator('#ph-side-chat .ph-unread').textContent()) === '1', 'sideways: a new message puts 1 on 💬');
    await page.locator('.ph-turn').getByRole('button', { name: /Sohbet/ }).click();
    await page.waitForTimeout(300);
    check((await sheetName(page)) === 'shorts-chat' && (await phoneState(page)).unread === 0, 'sideways: 💬 opens the chat sheet and clears the count');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    // BH13: a video that can't be played here ("can't be played" card) offers no ⛶ "Watch fullscreen".
    const turnFsShown = () => page.evaluate(() => { const b = document.querySelector('.ph-turn-fs'); return !!b && b.getBoundingClientRect().width > 0; });
    await page.evaluate(() => {
      const err = document.getElementById('player-error');
      err.textContent = 'This video can\'t be played here.';
      err.hidden = false;
    });
    await page.waitForTimeout(150);
    check(!(await turnFsShown()), 'sideways: a video that can\'t be played offers no ⛶ "Watch fullscreen"');
    await page.evaluate(() => { document.getElementById('player-error').hidden = true; });
    await page.waitForTimeout(150);
    check(await turnFsShown(), 'sideways: ⛶ "Watch fullscreen" comes back once the video plays');
    // Fullscreen without the browser's (iPhone): the theater covers the window, the dock is a column beside the video.
    await page.click('.ph-turn-fs');
    await page.waitForTimeout(600);
    const fsBox = await rect(page, '#theater');
    check(await page.evaluate(() => document.getElementById('theater').classList.contains('pseudo-fs')) && !!fsBox && fsBox.w === 844 && Math.abs(fsBox.h - 390) <= 1, 'iPhone sideways: ⛶ covers the window (no browser fullscreen)', JSON.stringify(fsBox));
    const dock = await rect(page, '#fs-dock');
    const player = await rect(page, '#player');
    const shown = await page.evaluate(() => [...document.querySelectorAll('#fs-dock .dock-btn')].filter((b) => b.offsetParent).map((b) => b.id).join(','));
    check(!!dock && !!player && dock.y >= 0 && dock.b <= 390 && dock.x >= player.r - 1 && dock.r >= 843 && dock.w <= 70 && dock.h >= 380, 'sideways: the dock is a column beside the video', JSON.stringify({ dock, player }));
    check(shown === 'dock-chat,dock-react,dock-mic,dock-cam,dock-exit', 'sideways: the dock holds 💬 😀 🎙 📷 and exit', shown);
    // 💬 opens the side panel (faces, chat, message box) right of the dock; closed again, the video fills the screen.
    await page.click('#dock-chat');
    await page.waitForTimeout(300);
    const sidePanel = await rect(page, '.ph-fs-side');
    const sidePlayer = await rect(page, '#player');
    const sideDock = await rect(page, '#fs-dock');
    const inSide = await page.evaluate(() => !!document.querySelector('.ph-fs-side [data-panel="chat"]') && !!document.querySelector('.ph-fs-side #chat-form'));
    check(!!sidePanel && sidePanel.w > 200 && sidePanel.r >= 843 && inSide && sidePlayer.r <= sideDock.x + 1 && sideDock.r <= sidePanel.x + 1, 'sideways: 💬 opens the side panel with the chat, video and dock beside it', JSON.stringify({ sidePanel, sidePlayer, sideDock }));
    await page.click('#dock-chat');
    await page.waitForTimeout(300);
    const closed = await page.evaluate(() => document.querySelector('.ph-fs-side')?.hidden === true && !!document.querySelector('.room [data-panel="chat"]') && !document.querySelector('#theater [data-panel="chat"]'));
    check(closed, 'sideways: 💬 again closes it, the chat goes back to the room');
    await page.setViewportSize({ width: 390, height: 664 });
    await page.waitForTimeout(600);
    check(!(await page.evaluate(() => document.getElementById('theater').classList.contains('pseudo-fs'))) && (await phoneState(page)).visible['.ph-tabs'], 'phone upright again: the room and its tabs come back');
    // The keyboard makes the page short and wide-ish: that is not "turned sideways" (0.9.92.6, owner's screenshots).
    await page.focus('#chat-input');
    await page.setViewportSize({ width: 390, height: 330 });
    await page.waitForTimeout(600);
    const kb = await page.evaluate(() => ({ sideways: document.documentElement.classList.contains('sideways'), fs: document.getElementById('theater').classList.contains('pseudo-fs') }));
    await page.setViewportSize({ width: 390, height: 664 });
    await page.waitForTimeout(400);
    check(!kb.sideways && !kb.fs, 'phone: the keyboard opening does not count as turning sideways (no fullscreen, no layout jump)', JSON.stringify(kb));
    await page.evaluate(() => document.activeElement?.blur());
    // 10A: a table takes the whole screen; the video keeps playing as a small preview in its head.
    await tab(page, 'Oyunlar').click();
    await page.waitForTimeout(500);
    await page.click('.hub-game >> nth=0');
    await page.waitForTimeout(1500);
    const game = await rect(page, '#game-stage');
    const thumb = await rect(page, '#theater');
    const inHead = await page.evaluate(() => !!document.querySelector('#game-stage .game-stage-head #strip-voice'));
    check(!!game && game.w >= vw - 1 && game.h >= vh - 1 && (await phoneState(page)).tab === 'room', 'game: it takes the whole screen (back on the Room tab)', JSON.stringify(game));
    check(!!thumb && thumb.w <= 110 && thumb.w >= 60 && thumb.y < 40 && thumb.x < 30 && inHead, 'game: the video is a small preview in its head, 🎙 beside it', JSON.stringify(thumb));
    await page.mouse.click(thumb.x + thumb.w / 2, thumb.y + thumb.h / 2);
    await page.waitForTimeout(500);
    const back = await rect(page, '#theater');
    check(!(await page.evaluate(() => document.documentElement.classList.contains('ph-game'))) && back.w >= vw - 1 && (await page.evaluate(() => document.getElementById('ph-tab-games').classList.contains('game-waiting'))), 'game: a tap on the preview goes back to the video, a dot on the Games tab', JSON.stringify(back));
    await tab(page, 'Oyunlar').click();
    await page.waitForTimeout(500);
    check(await page.evaluate(() => document.documentElement.classList.contains('ph-game')), 'game: the Games tab brings the table back');
    // Back to the video from the table's preview: 🎙 📷 go back into the input row. (Leaving the table from the head's ⋯
    // is Game Studio's check: in the Draw & Guess lobby the ⋯ menu opens under the drawing layer, reported to them.)
    const thumb2 = await rect(page, '#theater');
    await page.mouse.click(thumb2.x + thumb2.w / 2, thumb2.y + thumb2.h / 2);
    await page.waitForTimeout(500);
    const left = await page.evaluate(() => ({
      game: document.documentElement.classList.contains('ph-game'),
      voice: !!document.querySelector('#chat-form #strip-voice'),
      dot: document.getElementById('ph-tab-games').classList.contains('game-waiting'),
    }));
    check(!left.game && left.voice && left.dot, 'game: back to the video puts 🎙 📷 back in the input row, the Games tab keeps its dot', JSON.stringify(left));
    check(errors.length === 0, 'phone: no page errors', errors.join(' | '));
    await ctx.close();
  }

  // 1a) The home page on a phone (card 15b): the art on top, two full-width buttons, the feature tiles at the foot of
  // the first screen, no link box.
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(SITE + '/');
    await page.waitForSelector('.hm-first');
    await page.waitForTimeout(600);
    const size = await page.evaluate(() => ({ feat: document.querySelector('.hm-feat').getBoundingClientRect().bottom, inner: innerHeight }));
    const create = await rect(page, '#start-form .hm-btn.primary');
    const join = await rect(page, '#join-toggle');
    check(size.feat <= size.inner && create?.w > 300 && join?.w > 300 && !(await page.isVisible('#start-link')), 'home: the first screen fits with two big buttons and no link box', JSON.stringify({ size, create, join }));
    await page.click('#join-toggle');
    check(await page.isVisible('#join-input'), 'home: "Join with a code" opens the code box');
    await ctx.close();
  }

  // 1b) A desktop window keeps the desktop room (top bar, side panel, no phone strip).
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await enter(page, id());
    check(!(await page.evaluate(() => document.documentElement.classList.contains('ph-room'))) && (await page.isVisible('.topbar')) && (await page.isVisible('.tabs')) && !(await page.isVisible('.ph-tabs')) && !(await page.isVisible('#chat-invite')), 'desktop: the desktop room, no phone parts');
    check(await page.isVisible('#media-form .media-search'), 'desktop: 🔍 Search next to the link box');
    // One remote (0.9.92.8): with a video the toolbar under it goes, the rail has ⋯ (speed, sync, next, panel).
    await addMedia(page, VIDEO, 'load');
    await page.waitForSelector('#player video');
    await page.hover('.player-wrap');
    await page.waitForTimeout(300);
    const remote = await page.evaluate(() => ({ toolbar: document.querySelector('.toolbar').getBoundingClientRect().height, more: !!document.getElementById('dock-more').offsetParent, speed: !!document.getElementById('dock-speed').offsetParent }));
    await page.click('#dock-more');
    await page.waitForTimeout(300);
    const morePop = await page.evaluate(() => [...document.querySelectorAll('#dock-more-pop .dock-more-item')].filter((b) => b.offsetParent).length);
    check(remote.toolbar === 0 && remote.more && !remote.speed && morePop >= 4, 'desktop: one remote: no toolbar, ⋯ on the rail holds speed / sync / next / panel', JSON.stringify({ remote, morePop }));
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
    // PH1: 💬 in the bar counts it.
    check((await phoneState(page)).unread === 1, 'Shorts: 💬 shows 1 unread', JSON.stringify(await phoneState(page)));
    await page.click('#ph-shorts-chat');
    await page.waitForTimeout(300);
    check((await sheetName(page)) === 'shorts-chat' && (await page.isVisible('.ph-sheet #chat-input')) && (await page.textContent('.ph-sheet #chat-list')).includes('what a great one'), 'Shorts: 💬 opens the chat with the message box');
    check((await phoneState(page)).unread === 0, 'Shorts: opening the chat clears the count');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    // ⋯ → Add: the Shorts add window opens as a sheet; a tap on its backdrop (over the video) closes it.
    await page.click('#ph-shorts-more');
    check((await sheetName(page)) === 'shorts-more' && (await page.$$('.ph-sheet .ph-row')).length >= 7, 'Shorts: ⋯ opens the Shorts menu');
    await page.click('.ph-sheet .ph-row:has-text("Ekle")');
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
    await page.click('.ph-sheet .ph-row:has-text("Oda görünümü")');
    await page.waitForTimeout(900);
    check((await page.evaluate(() => document.documentElement.classList.contains('ph-room') && !!document.querySelector('.stage > #seats-l') && !document.querySelector('.ph-shorts-bar'))), 'Shorts: ↩ Room view brings the phone room back');
    await friend.close();
    await ctx.close();
  }

  // 2a) Sideways before the first video (card 16 part 3): nothing to watch fullscreen yet, so the faces and the chat stay
  // on the right instead of "hold the phone upright".
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13 landscape'] });
    const page = await ctx.newPage();
    await enter(page, `phs${Math.random().toString(36).slice(2, 7)}`);
    const r = await page.evaluate(() => {
      const shown = (s) => {
        const e = document.querySelector(s);
        return !!e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none';
      };
      const input = document.querySelector('#chat-input')?.getBoundingClientRect();
      return { strip: shown('.together-strip'), chat: shown('[data-panel="chat"]'), turn: shown('.ph-turn'), inputOn: !!input && input.bottom <= innerHeight && input.width > 120, sh: document.documentElement.scrollHeight, vh: innerHeight };
    });
    check(r.strip && r.chat && r.inputOn && !r.turn && r.sh <= r.vh + 1, 'phone sideways, empty room: faces + chat on the right, no "hold upright", no scroll', JSON.stringify(r));
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
    // The home page has no theme picker since card 6g; the saved scene theme still shows as Gece on a phone.
    const r = await page.evaluate(() => ({ shown: document.documentElement.dataset.theme, saved: localStorage.getItem('theme') }));
    check(r.shown === 'gece' && r.saved === 'sinema', 'telefon: resimli tema telefonda Gece görünüyor (kayıtlı kalıyor)', JSON.stringify(r));
    await ctx.close();
    const desk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const dp = await desk.newPage();
    await dp.goto(`${SITE}/`);
    await dp.evaluate(() => localStorage.setItem('theme', 'sinema'));
    await dp.goto(`${SITE}/`);
    await dp.waitForTimeout(1200);
    check((await dp.evaluate(() => document.documentElement.dataset.theme)) === 'sinema', 'bilgisayarda resimli tema duruyor');
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
      if (url.searchParams.has('q') || route.request().method() !== 'POST') asked.push('words-in-address');
      // Security M6: the words come in the POST body.
      const q = new URLSearchParams(route.request().postData() ?? '').get('q') ?? '';
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
    check(rows === 2 && added && queued >= 1 && asked.includes('short') && !asked.includes('words-in-address'), 'Shorts çubuğu: “＋ Ekle” kelimeyle sadece Shorts arıyor, sonuç tek tıkla sıraya giriyor', JSON.stringify({ rows, added, queued, asked }));
    const mic = await page.evaluate(() => ({ off: document.getElementById('shorts-mic').classList.contains('off'), cam: document.getElementById('shorts-cam').classList.contains('off') }));
    // YT5 batch: before joining voice they look plain (no red "off"); red only once in voice.
    check(!mic.off && !mic.cam, 'sese katılmadan önce 🎙 ve 📷 kırmızı değil (sade)', JSON.stringify(mic));
    // A new Shorts feed takes the old feed's Shorts out of the queue (0.9.91.13).
    const queueIds = () => page.evaluate(() => [...document.querySelectorAll('#queue li')].map((li) => li.textContent).join('|'));
    const startFeed = async (topic) => {
      // ♾ always opens the window (0.9.92.6); a running feed shows on top of it with a stop button.
      await page.click('#shorts-feed');
      await page.waitForTimeout(200);
      await page.fill('#shorts-feed-topic', topic);
      await page.press('#shorts-feed-topic', 'Enter');
      await page.waitForTimeout(4500);
    };
    await startFeed('kediler');
    const first = await queueIds();
    await startFeed('kopekler');
    const second = await queueIds();
    check(first.includes('kedi') && second.includes('kopek') && !second.includes('kedi'), 'Shorts akışı: yeni akış başlayınca eski akışın videoları sıradan çıkıyor', JSON.stringify({ first: first.slice(0, 120), second: second.slice(0, 120) }));
    await page.click('#shorts-feed');
    await page.waitForTimeout(300);
    const now = await page.evaluate(() => ({ open: !document.getElementById('shorts-feed-form').hidden, now: document.getElementById('shorts-feed-now').hidden ? '' : document.getElementById('shorts-feed-now-text').textContent }));
    await page.click('#shorts-feed-stop');
    await page.waitForTimeout(300);
    const stopped = (await page.getAttribute('#shorts-feed', 'aria-pressed')) === 'false';
    check(now.open && now.now.includes('kopek') && stopped, 'Shorts akışı: açıkken ♾ akış penceresini açıyor (üstte açık akış), Durdur durduruyor', JSON.stringify({ now, stopped }));
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
    // The toolbar under the video is gone on a computer (0.9.92.8): the rail's last button opens fullscreen.
    await page.hover('.player-wrap');
    await page.click('#dock-exit');
    await page.waitForTimeout(600);
    const fs = await page.evaluate(() => document.fullscreenElement?.id ?? null);
    // Card 2: a video file's rail is a column beside the video too; it comes when the mouse reaches the right edge.
    await page.mouse.move(640, 400);
    await page.mouse.move(1270, 400, { steps: 4 });
    await page.waitForTimeout(400);
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
