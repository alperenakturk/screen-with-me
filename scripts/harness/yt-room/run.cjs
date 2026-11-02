// YouTube room on a computer (0.9.92.9, owner's picks 1B and 5B on https://claude.ai/artifact/LP8aB9RzKFZh3N6sAkEDvG):
// nothing of ours over the YouTube player. Emojis rise from the sender's face (or the rail's 😀 with the side panel
// hidden), the room's notes (everyone-ready wait …) sit in the chat panel above the message box, or above the video
// with the side panel hidden. The YouTube player only has to be created, not to play (the cloud's headless Chromium
// can't decode it). Needs Playwright and `npm run dev`:
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

  // 1B: Sam's emoji rises from Sam's face on Alex's screen, none over the player.
  await sam.keyboard.press('1');
  await alex.waitForSelector('.r-from', { timeout: 3000 }).catch(() => {});
  const face = await alex.evaluate(() => {
    const person = [...document.querySelectorAll('#voice-people .together-person')].find((n) => n.textContent.includes('Sam'));
    const own = person?.querySelector('.voice-face');
    if (!own) return null;
    const r = own.getBoundingClientRect();
    return { x: r.left + r.width / 2, t: r.top };
  });
  const float = await box(alex, '.r-from');
  check(!!float, 'an emoji came');
  check(float && face && Math.abs(float.x - face.x) < 30, 'it rises from Sam\'s face', JSON.stringify({ float, face }));
  check(await alex.evaluate(() => document.querySelectorAll('.reactions-layer .r-float').length === 0), 'nothing flies over the player');

  // Side panel hidden: the note sits above the video, the emoji rises from the rail's 😀.
  await alex.click('#side-toggle').catch(() => alex.evaluate(() => document.querySelector('#side-toggle')?.click()));
  await alex.waitForTimeout(3500);
  check(await alex.evaluate(() => !!document.querySelector('.yt-notices-top > #waiting-banner')), 'side panel hidden: the note is above the video');
  await alex.evaluate(() => (document.querySelector('#waiting-banner').hidden = false));
  const top = await box(alex, '#waiting-banner');
  const video2 = await box(alex, '.player');
  check(top && video2 && top.w > 0 && top.b <= video2.t + 1, 'above, not on it', JSON.stringify({ top, video2 }));
  await sam.keyboard.press('2');
  await alex.waitForTimeout(300);
  const float2 = await box(alex, '.r-from');
  const react = await box(alex, '#dock-react');
  check(float2 && react && Math.abs(float2.x - react.x) < 30, 'side panel hidden: the emoji rises from the rail\'s 😀', JSON.stringify({ float2, react }));

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
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ YouTube room keeps the player clear');
  process.exit(fails ? 1 : 0);
})();
