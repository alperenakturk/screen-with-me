// YouTube room on a computer (0.9.92.9 pick 5B on https://claude.ai/artifact/LP8aB9RzKFZh3N6sAkEDvG; 0.9.93): the room's
// notes (everyone-ready wait …) sit in the chat panel above the message box, or above the video with the side panel
// hidden; emojis fly over the video again (0.9.93, owner: "they don't harm the content"). The rail beside the video
// comes when the mouse reaches the video's right edge and goes as soon as it leaves; "Keep the controls open" (⋯ or
// Settings) pins it, and an old "hide the controls" choice no longer hides it. The YouTube player only has to be
// created, not to play (the cloud's headless Chromium can't decode it). Needs Playwright and `npm run dev`:
//   NODE_PATH=$(npm root -g) node scripts/harness/yt-room/run.cjs [http://localhost:5173]
const { chromium } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:5173';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};
const box = (page, selector) =>
  page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width };
  }, selector);

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const room = `yt${Math.random().toString(36).slice(2, 7)}`;
  async function enter(name) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', 'en');
      // 0.9.92.8's "hide the controls": gone in 0.9.93, the rail must come back for people who used it.
      localStorage.setItem('opt:railOff', '1');
    });
    await page.goto(`${SITE}/r/${room}`);
    await page.fill('#name', name);
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await page.waitForTimeout(1200);
    return page;
  }
  const alex = await enter('Alex');
  const sam = await enter('Sam');
  await alex.fill('#media-input', 'https://www.youtube.com/watch?v=M7lc1UVf-VE');
  await alex.press('#media-input', 'Enter');
  await alex.waitForFunction(() => document.querySelector('#theater')?.classList.contains('yt-rail'), null, { timeout: 15000 });
  check(true, 'YouTube player → the rail beside the video');

  // 5B: a note goes to the chat panel, just above the message box.
  await alex.evaluate(() => {
    const banner = document.querySelector('#waiting-banner');
    banner.textContent = 'Waiting for Sam…';
    banner.hidden = false;
  });
  await alex.waitForTimeout(200);
  check(await alex.evaluate(() => !!document.querySelector('[data-panel="chat"] > .yt-notices > #waiting-banner')), 'the wait note is in the chat panel');
  const note = await box(alex, '#waiting-banner');
  const form = await box(alex, '#chat-form');
  const video = await box(alex, '.player');
  check(note && form && note.b <= form.t + 1 && note.t > form.t - 120, 'just above the message box', JSON.stringify({ note, form }));
  check(note && video && note.l >= video.r, 'not over the video');

  // 0.9.93: Sam's emoji flies over the video on Alex's screen again.
  await sam.keyboard.press('1');
  await alex.waitForSelector('.reactions-layer .r-float', { timeout: 3000 }).catch(() => {});
  const float = await box(alex, '.reactions-layer .r-float');
  check(!!float, 'an emoji flies over the video');
  check(float && video && float.x > video.l && float.x < video.r, 'inside the video', JSON.stringify({ float, video }));

  // The right edge (0.9.93): the rail shows for a moment with a new video, then waits for the mouse at the edge.
  const idle = () => alex.evaluate(() => document.querySelector('#theater').classList.contains('dock-idle'));
  const playerRight = async () => (await box(alex, '.player')).r;
  const wrapBox = await box(alex, '.player-wrap');
  check(await alex.evaluate(() => !document.querySelector('#theater').classList.contains('rail-off') && !document.querySelector('#rail-show')), 'an old "hide the controls" no longer hides the rail');
  await alex.mouse.move(wrapBox.x, wrapBox.y);
  await alex.waitForTimeout(3000);
  check(await idle(), 'mouse in the middle: the rail rests');
  const wide = await playerRight();
  check(Math.abs(wide - wrapBox.r) < 2, 'resting rail: the video takes the full width', JSON.stringify({ wide, wrap: wrapBox.r }));
  await alex.mouse.move(wrapBox.x + 40, wrapBox.y + 10, { steps: 3 });
  await alex.waitForTimeout(400);
  check(await idle(), 'a mouse move in the middle does not bring it');
  await alex.mouse.move(wrapBox.r - 12, wrapBox.y, { steps: 4 });
  await alex.waitForTimeout(350);
  check(!(await idle()), 'mouse at the right edge: the rail opens at once');
  const narrow = await playerRight();
  check(narrow < wrapBox.r - 40, 'the video makes room beside the rail', JSON.stringify({ narrow }));
  await alex.mouse.move(wrapBox.r - 30, wrapBox.y + 60, { steps: 2 });
  await alex.waitForTimeout(800);
  check(!(await idle()), 'on the rail: it stays');
  await alex.mouse.move(wrapBox.x, wrapBox.y, { steps: 4 });
  await alex.waitForTimeout(600);
  check(await idle(), 'mouse leaves: it closes quickly');

  // Pin it from ⋯.
  await alex.mouse.move(wrapBox.r - 12, wrapBox.y, { steps: 4 });
  await alex.waitForTimeout(350);
  await alex.click('#dock-more');
  await alex.click('#rail-pin');
  await alex.mouse.move(wrapBox.x, wrapBox.y, { steps: 4 });
  await alex.waitForTimeout(3200);
  check(!(await idle()) && (await alex.evaluate(() => document.querySelector('#rail-pin').getAttribute('aria-pressed'))) === 'true', 'pinned from ⋯: it stays open');
  check(await alex.evaluate(() => document.querySelector('#opt-railpin').checked), 'Settings shows it pinned');
  // Unpin from Settings → My screen.
  await alex.evaluate(() => {
    const box = document.querySelector('#opt-railpin');
    box.checked = false;
    box.dispatchEvent(new Event('change'));
  });
  await alex.mouse.move(wrapBox.x + 20, wrapBox.y, { steps: 2 });
  await alex.waitForTimeout(800);
  check(await idle(), 'unpinned in Settings: it rests again');
  check(await alex.evaluate(() => localStorage.getItem('opt:railPin') === '0'), 'remembered');

  // 0.9.93.2 (owner: "in fullscreen it opens at the right but doesn't go away when I move left"): a window of the
  // rail (😀) closes when the mouse goes off onto the video, or when the video is clicked, and the rail goes with it.
  const popOpen = () => alex.evaluate(() => !document.querySelector('#dock-react-pop').hidden);
  async function leaveWithWindow(where, x, y, right) {
    await alex.mouse.move(right - 12, y, { steps: 4 });
    await alex.waitForTimeout(350);
    await alex.click('#dock-react');
    await alex.waitForTimeout(250);
    const opened = await popOpen();
    await alex.mouse.move(x, y, { steps: 5 });
    await alex.waitForTimeout(1100);
    check(opened && !(await popOpen()) && (await idle()), `${where}: 😀 open, the mouse goes onto the video: window and rail close`);
    await alex.mouse.move(right - 12, y, { steps: 4 });
    await alex.waitForTimeout(350);
    await alex.click('#dock-react');
    await alex.waitForTimeout(250);
    await alex.mouse.click(x, y);
    await alex.waitForTimeout(900);
    check(!(await popOpen()) && (await idle()), `${where}: a click on the video closes them too`);
  }
  await leaveWithWindow('window', wrapBox.x, wrapBox.y, wrapBox.r);
  // Fullscreen with the rail's ⛶.
  await alex.mouse.move(wrapBox.r - 12, wrapBox.y, { steps: 4 });
  await alex.waitForTimeout(350);
  await alex.click('#dock-exit');
  await alex.waitForTimeout(1200);
  const inFs = await alex.evaluate(() => document.fullscreenElement?.id === 'theater');
  check(inFs, 'the rail\'s ⛶ opens fullscreen');
  if (inFs) {
    const vw = await alex.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    await alex.mouse.move(vw.w / 2, vw.h / 2, { steps: 4 });
    await alex.waitForTimeout(3000);
    check(await idle(), 'fullscreen: the rail rests');
    await alex.mouse.move(vw.w - 8, vw.h / 2, { steps: 4 });
    await alex.waitForTimeout(350);
    check(!(await idle()), 'fullscreen: the right edge opens it');
    await alex.mouse.move(vw.w / 2, vw.h / 2, { steps: 5 });
    await alex.waitForTimeout(600);
    check(await idle(), 'fullscreen: moving left closes it');
    await leaveWithWindow('fullscreen', vw.w / 2, vw.h / 2, vw.w);
    // 0.9.93.5 (owner's screenshot: the rail stayed in fullscreen): ⋯ open, Esc, then the mouse onto the video. The
    // key press made the focused ⋯ count as keyboard focus and held the rail out.
    await alex.mouse.move(vw.w - 8, vw.h / 2, { steps: 4 });
    await alex.waitForTimeout(300);
    await alex.click('#dock-more');
    await alex.waitForTimeout(250);
    await alex.keyboard.press('Escape');
    await alex.mouse.move(vw.w / 2, vw.h / 2, { steps: 6 });
    await alex.waitForTimeout(1200);
    check(await idle(), 'fullscreen: ⋯, Esc, mouse onto the video: the rail goes');
    check(await alex.evaluate(() => !document.querySelector('#fs-dock')?.contains(document.activeElement)), 'fullscreen: the rail let go of the focus');
    // 0.9.93.4 (owner: "messages from the side like normal, not from the bottom"): a message comes down from the top
    // right, left of the rail, never over the player's own bar at the bottom.
    await sam.fill('#chat-input', 'hello from the side');
    await sam.press('#chat-input', 'Enter');
    await sam.evaluate(() => document.activeElement?.blur());
    await alex.waitForSelector('#toasts .toast', { timeout: 4000 }).catch(() => {});
    const toast = await box(alex, '#toasts .toast');
    const rail = await box(alex, '#fs-dock');
    check(toast && rail && toast.r <= rail.l - 4 && toast.r > vw.w - 200, 'fullscreen: a message sits just left of the rail', JSON.stringify({ toast, rail }));
    check(toast && toast.t < vw.h / 3, 'fullscreen: it comes from the top, not over the player\'s bar', JSON.stringify(toast));
    await alex.evaluate(() => document.exitFullscreen());
    await alex.waitForTimeout(800);
  }

  // Side panel hidden: the note sits above the video, emojis still fly over the video.
  await alex.click('#side-toggle').catch(() => alex.evaluate(() => document.querySelector('#side-toggle')?.click()));
  await alex.waitForTimeout(3500);
  check(await alex.evaluate(() => !!document.querySelector('.yt-notices-top > #waiting-banner')), 'side panel hidden: the note is above the video');
  await alex.evaluate(() => (document.querySelector('#waiting-banner').hidden = false));
  const top = await box(alex, '#waiting-banner');
  const video2 = await box(alex, '.player');
  check(top && video2 && top.w > 0 && top.b <= video2.t + 1, 'above, not on it', JSON.stringify({ top, video2 }));
  await alex.evaluate(() => document.querySelectorAll('.reactions-layer .r-float').forEach((n) => n.remove()));
  await sam.keyboard.press('2');
  await alex.waitForTimeout(300);
  const float2 = await box(alex, '.reactions-layer .r-float');
  check(float2 && float2.x > video2.l && float2.x < video2.r, 'side panel hidden: the emoji flies over the video', JSON.stringify({ float2, video2 }));

  // Back with the side panel: the note returns to the chat panel.
  await alex.evaluate(() => document.querySelector('#side-toggle')?.click());
  await alex.waitForTimeout(300);
  check(await alex.evaluate(() => !!document.querySelector('[data-panel="chat"] > .yt-notices > #waiting-banner')), 'side panel back: the note is in the chat again');

  // A video file keeps everything on the video (8B).
  await alex.fill('#media-input', 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm');
  await alex.click('#media-form button[value=load]');
  await alex.waitForFunction(() => !document.querySelector('#theater')?.classList.contains('yt-rail'), null, { timeout: 15000 });
  await alex.waitForTimeout(300);
  check(await alex.evaluate(() => document.querySelector('#waiting-banner')?.parentElement?.classList.contains('player-wrap')), 'a video file: the note is back on the video');

  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ YouTube room: notes in the chat, emojis on the video, the rail at the edge');
  process.exit(fails ? 1 : 0);
})();
