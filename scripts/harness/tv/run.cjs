// TV version (A + C): a TV pairs with a code, shows the room in TV mode (video, faces, messages, emojis, the remote's
// bar), the phone becomes its remote (card, muted player, push-to-talk), a friend speaking glows on the TV. Needs
// Playwright (preinstalled in cloud sessions), a server serving the built site (`npm run build` then `wrangler dev`, or
// `npm run dev`) and a local video:
//   NODE_PATH=$(npm root -g) node scripts/harness/tv/run.cjs [http://localhost:8787] [http://localhost:5300/video.webm]
const { chromium, devices } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:8787';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};
const until = async (fn, ms = 10000) => {
  for (let i = 0; i < ms / 200; i++) {
    const value = await fn().catch(() => null);
    if (value) return value;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
};

async function enter(page, room, name) {
  await page.goto(`${SITE}/r/${room}`);
  await page.waitForTimeout(1200);
  await page.fill('input', name);
  await page.click('button.primary');
  for (let i = 0; i < 5 && !(await page.$('#media-input:visible')); i++) {
    const next = await page.$('button.primary:visible');
    if (next) await next.click();
    await page.waitForTimeout(900);
  }
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const room = `tv${Math.random().toString(36).slice(2, 7)}`;
  const errors = [];

  // The TV: a big screen, keys only.
  // Hidden feature (0.9.91.6): without the lab switch the TV pages fall back to the home page.
  const plainCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await plainCtx.addInitScript(() => { localStorage.setItem('tipsSeen', '1'); if (!localStorage.getItem('lang')) localStorage.setItem('lang', 'tr'); });
  const plain = await plainCtx.newPage();
  await plain.goto(`${SITE}/tv`);
  await plain.waitForTimeout(800);
  check(new URL(plain.url()).pathname === '/' && !(await plain.$('.tvp-code')), 'hidden: /tv opens the home page without the lab switch', plain.url());
  await plain.goto(`${SITE}/tv-test`);
  await plain.waitForTimeout(800);
  check(new URL(plain.url()).pathname === '/', 'hidden: /tv-test opens the home page without the lab switch');
  await plainCtx.close();

  // The TV: a big screen, keys only (lab switch on).
  const tvCtx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await tvCtx.addInitScript(() => { localStorage.setItem('tipsSeen', '1'); if (!localStorage.getItem('lang')) localStorage.setItem('lang', 'tr'); });
  const tv = await tvCtx.newPage();
  tv.on('pageerror', (e) => errors.push(`tv: ${e.message}`));
  await tv.goto(`${SITE}/tv?tvlab=1`);
  const code = (await until(() => tv.evaluate(() => document.querySelector('.tvp-code')?.textContent?.replace(/\D/g, '') || null))) ?? '';
  check(/^\d{6}$/.test(code), 'TV: shows a 6-digit code', code);
  check(await tv.evaluate(() => document.querySelector('.tvp-qr')?.getAttribute('src')?.startsWith('data:image/svg+xml')), 'TV: shows a QR code');

  // The phone pairs it.
  const phoneCtx = await browser.newContext({ ...devices['iPhone 13'], permissions: ['camera', 'microphone'] });
  await phoneCtx.addInitScript(() => { localStorage.setItem('tipsSeen', '1'); if (!localStorage.getItem('lang')) localStorage.setItem('lang', 'tr'); });
  const phone = await phoneCtx.newPage();
  phone.on('pageerror', (e) => errors.push(`phone: ${e.message}`));
  await phone.goto(`${SITE}/?tvlab=1`);
  await phone.waitForFunction(() => localStorage.getItem('opt:tvLab') === '1');
  await enter(phone, room, 'Alp');
  // Since 0.9.92.3 a phone has no top bar, so the button exists but is not on screen (the TV version is frozen until
  // the Google Cast version; a way to it on a phone is an open idea). The harness presses it directly.
  check(!!(await until(() => phone.$('#tv-btn'))), 'phone: the 📺 TV button exists (lab switch on; TV code loaded on demand)', await phone.evaluate(() => localStorage.getItem('opt:tvLab') + ' ' + location.href));
  await phone.evaluate(() => document.querySelector('#tv-btn').click());
  check(await phone.isVisible('.tv-pair-dialog'), 'phone: the pair dialog opens');
  check((await phone.$$eval('.tv-step', (s) => s.length)) === 3, 'phone: the window explains it in 3 steps');
  await phone.fill('#tv-code', code);
  await phone.click('.tv-pair-form button');
  const inRoom = await until(() => tv.evaluate(() => document.documentElement.classList.contains('tv-mode') && location.pathname.includes('/r/')));
  check(!!inRoom, 'TV: opens the room in TV mode after pairing', await tv.url());
  check(await until(() => phone.isVisible('.tv-remote')), 'phone: the remote card appears');
  check(!(await phone.isVisible('.tv-pair-dialog')), 'phone: the pair dialog closes');
  const faces = await until(() => tv.evaluate(() => [...document.querySelectorAll('.tv-face-name')].map((e) => e.textContent).join(',') || null));
  check(faces === 'Alp', 'TV: one face (me, not twice), named after the phone', faces);
  check(await tv.evaluate(() => getComputedStyle(document.querySelector('.topbar')).display === 'none'), 'TV: no top bar, no side panel');

  // A video from the phone plays on the TV (fills the screen); the phone's own player is muted.
  await phone.fill('#media-input', VIDEO);
  await phone.click('#media-form button[value=load]');
  check(!!(await until(() => tv.evaluate(() => (document.querySelector('#player video')?.currentTime ?? 0) > 0.3))), 'TV: the video plays');
  const theater = await tv.evaluate(() => {
    const r = document.getElementById('theater').getBoundingClientRect();
    return { w: r.width, h: r.height };
  });
  check(theater.w === 1920 && Math.abs(theater.h - 1080) <= 1, 'TV: the room fills the screen', JSON.stringify(theater));
  const status = await until(() => tv.evaluate(() => (document.querySelector('.tv-status:not([hidden])')?.textContent ?? '') || null));
  check(!!status && /Senkron|Sync/.test(status), 'TV: shows the sync status line', status ?? '');
  check(!!(await until(() => phone.evaluate(() => document.querySelector('#player video')?.muted === true))), "phone: its own player is muted (the TV plays the film's sound)");

  // Remote keys: OK opens the bar, arrows move, Back closes; ↑ opens emojis and OK sends one.
  await tv.keyboard.press('Enter');
  check(await tv.isVisible('.tv-bar'), 'TV: OK opens the big button bar');
  const first = await tv.evaluate(() => document.activeElement?.className ?? '');
  await tv.keyboard.press('ArrowRight');
  const second = await tv.evaluate(() => document.activeElement?.textContent ?? '');
  check(first.includes('tv-btn') && /Emoji/.test(second), 'TV: arrows move the focus between buttons', second);
  await tv.keyboard.press('Escape');
  check(!(await tv.isVisible('.tv-bar')), 'TV: Back closes the bar');
  await tv.keyboard.press('ArrowUp');
  check(await tv.isVisible('.tv-emojis'), 'TV: ↑ opens the emojis');
  await tv.keyboard.press('Enter');
  check(!!(await until(() => phone.evaluate(() => document.querySelector('#reactions-layer')?.childElementCount > 0))), 'TV: OK sends an emoji (it flies on the phone)');
  await tv.keyboard.press('Escape');
  await tv.keyboard.press('Escape');
  // Pause from the TV's bar.
  await tv.keyboard.press('Enter');
  await tv.keyboard.press('Enter');
  check(!!(await until(() => phone.evaluate(() => document.querySelector('#player video')?.paused === true))), 'TV: ⏯ pauses the room');
  await tv.keyboard.press('Escape');
  // Back with nothing open asks before disconnecting; "Stay" keeps the TV.
  await tv.keyboard.press('Escape');
  check(await tv.isVisible('.tv-confirm'), 'TV: Back asks before leaving the room');
  await tv.keyboard.press('Enter');
  check(!(await tv.isVisible('.tv-confirm')) && (await tv.evaluate(() => location.pathname.startsWith('/r/'))), 'TV: "Stay" keeps the TV in the room');

  // Messages: typed on the phone, big on the TV; the phone turns them off.
  await phone.fill('#chat-input', 'hello from the couch');
  await phone.press('#chat-input', 'Enter');
  check(!!(await until(() => tv.evaluate(() => document.querySelector('#toasts')?.textContent?.includes('hello from the couch')))), 'TV: a message from the phone shows on the TV');
  await phone.click('#tv-r-chat');
  check(!!(await until(() => tv.evaluate(() => document.documentElement.classList.contains('tv-no-chat')))), 'phone: turns the messages on the TV off');
  check(!!(await until(() => phone.evaluate(() => document.querySelector('.tv-remote')?.textContent?.includes('kapalı') || document.querySelector('.tv-remote')?.textContent?.includes('off')))), 'phone: the card shows the TV state');

  // A friend joins voice: the TV listens (no microphone) and her face glows while she speaks.
  const friendCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['camera', 'microphone'] });
  await friendCtx.addInitScript(() => { localStorage.setItem('tipsSeen', '1'); if (!localStorage.getItem('lang')) localStorage.setItem('lang', 'tr'); });
  const friend = await friendCtx.newPage();
  friend.on('pageerror', (e) => errors.push(`friend: ${e.message}`));
  await friend.goto(`${SITE}/?tvlab=1`);
  await friend.waitForFunction(() => localStorage.getItem('opt:tvLab') === '1');
  await enter(friend, room, 'Ece');
  check(!(await friend.$('#tv-btn')), 'computer: no TV button (pairing is a phone job), even with the lab switch');
  await friend.evaluate(`(async () => { document.getElementById('voice-join').click(); for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 150)); const d = document.querySelector('.confirm-dialog'); if (!d) { if (i > 10) break; continue; } d.querySelector('.btn.primary').click(); } return 1; })()`);
  check(!!(await until(() => tv.evaluate(() => !!document.querySelector('.tv-face.in-voice')), 15000)), 'TV: the friend in voice gets a green ring');
  check(!!(await until(() => tv.evaluate(() => [...document.querySelectorAll('audio')].some((a) => a.srcObject)), 15000)), 'TV: listens to voice without a microphone (audio arrives)');
  // The fake microphone beeps briefly about once a second; one glow in 25 s is enough (15 s missed it once in six runs).
  const glowed = !!(await until(() => tv.evaluate(() => !!document.querySelector('.tv-face.speaking')), 25000));
  check(glowed, 'TV: the speaking face glows');
  // Missed about once in seven runs on a loaded cloud machine (three browsers, a video, fake microphones): print what
  // the friend and the TV had then, so the next miss says why.
  if (!glowed || process.env.TV_DEBUG) console.log('debug', await friend.evaluate(() => JSON.stringify({ mic: document.querySelector('#voice-mic')?.className, joined: !document.querySelector('#voice-on')?.hidden })), await tv.evaluate(() => JSON.stringify([...document.querySelectorAll('audio')].map((a) => ({ muted: a.muted, vol: a.volume, paused: a.paused })))));

  // The phone in voice: push-to-talk (the microphone is off until the big button is held), voices not played here.
  await phone.evaluate(`(async () => { document.querySelector('.tv-ptt').click(); for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 150)); const d = document.querySelector('.confirm-dialog'); if (!d) { if (i > 10) break; continue; } d.querySelector('.btn.primary').click(); } return 1; })()`);
  check(!!(await until(() => phone.evaluate(() => document.querySelector('.tv-ptt')?.textContent?.match(/Basılı|Hold/)), 15000)), 'phone: in voice, the big button says "hold to talk"');
  await phone.waitForTimeout(1500);
  check(await phone.evaluate(() => [...document.querySelectorAll('audio')].every((a) => a.muted || a.volume === 0)), 'phone: plays no voices while the TV does');

  // Disconnect from the phone: the TV goes back to its pairing screen.
  await phone.click('#tv-r-unlink');
  check(!!(await until(() => tv.evaluate(() => location.pathname === '/tv'))), 'phone: "Disconnect the TV" sends the TV back to its code screen');
  check(!!(await until(() => phone.evaluate(() => document.querySelector('.tv-remote')?.hidden === true))), 'phone: the remote card goes away');

  check(errors.length === 0, 'no page errors', errors.join(' | '));
  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ all TV checks passed');
  process.exit(fails ? 1 : 0);
})();
