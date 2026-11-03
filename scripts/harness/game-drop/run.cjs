// Card R1 (owner's test round 1: "a game throws people out of the room / the stream, and opens only on the second
// press"). Root cause: every deploy restarts the room's object and closes every room connection (the owner tested
// while ~10 versions went live). Voice came back with the same member id (0.9.91.16), but the page ended the stream and
// the watching on every welcome, and a game pressed while the connection was down was lost.
// Checks, in real Chromium with fake camera / screen: Sam streams, Alex watches, both in voice; Sam's and Alex's room
// connections drop (closed under them, like a restart): the stream keeps playing for Alex and is listed again; a game
// pressed while Alex's connection is down opens on that one press; games open and close without closing a room
// connection.
//
//   npm run dev, then: node scripts/harness/game-drop/run.cjs [site]
const { chromium } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
const room = 'gd' + Math.random().toString(36).slice(2, 8);
let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
};
const args = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--auto-select-desktop-capture-source=Entire screen', '--autoplay-policy=no-user-gesture-required'];

async function person(browser, name, avatar) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['microphone', 'camera'] });
  const page = await ctx.newPage();
  // Every room connection is kept so the test can drop it, and its closes are counted.
  await page.addInitScript(() => {
    const W = window.WebSocket;
    window.__rooms = [];
    window.__closes = [];
    window.WebSocket = class extends W {
      constructor(u, p) {
        super(u, p);
        const url = String(u);
        if (url.includes('/rooms/')) window.__rooms.push(this);
        this.addEventListener('close', (e) => window.__closes.push([url.replace(/^.*\/api\//, '').replace(/\?.*/, ''), e.code]));
      }
    };
  });
  await page.goto(`${SITE}/`);
  await page.evaluate(([n, a]) => {
    const keys = { name: n, avatar: a, lang: 'en', 'opt:autoInvite': '0', tipsSeen: '1', 'opt:voiceCheck': 'skip', 'opt:ipNotice:voice': '1', 'opt:ipNotice:stream': '1', 'opt:ipNotice:watch': '1' };
    for (const [k, v] of Object.entries(keys)) localStorage.setItem(k, v);
  }, [name, avatar]);
  await page.goto(`${SITE}/r/${room}#back`);
  await page.waitForFunction(() => !!document.querySelector('#game-btn'), null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  return page;
}
const liveState = (page) =>
  page.evaluate(() => ({
    active: document.getElementById('live-card')?.classList.contains('active'),
    shown: !document.getElementById('live-window')?.hidden,
    frames: document.getElementById('live-video')?.getVideoPlaybackQuality?.().totalVideoFrames ?? 0,
    status: document.getElementById('live-status')?.textContent ?? '',
  }));
const drop = (page) => page.evaluate(() => window.__rooms.filter((w) => w.readyState === 1).forEach((w) => w.close(4000, 'test drop')));
const roomCloses = (page) => page.evaluate(() => window.__closes.filter(([u]) => u.startsWith('rooms/')).length);

(async () => {
  const browser = await chromium.launch({ args });
  const alex = await person(browser, 'Alex', 'wizard');
  const sam = await person(browser, 'Sam', 'elf');
  for (const p of [alex, sam]) await p.evaluate(() => document.getElementById('voice-join')?.click());
  await alex.waitForTimeout(2500);
  await sam.evaluate(async () => {
    document.getElementById('live-share')?.click();
    await new Promise((r) => setTimeout(r, 300));
    document.getElementById('live-screen')?.click();
  });
  await alex.waitForTimeout(3000);
  await alex.evaluate(() => document.getElementById('live-watch')?.click());
  await alex.waitForTimeout(3000);
  const before = await liveState(alex);
  check(before.active && before.shown && before.frames > 0, 'Sam streams and Alex sees it', JSON.stringify(before));

  // Games while streaming: no room connection closes.
  for (const kind of ['xox', 'draw']) {
    await alex.evaluate(async (kind) => {
      document.getElementById('game-btn').click();
      await new Promise((r) => setTimeout(r, 300));
      document.querySelector('#game-menu [data-tab="together"]')?.click();
      await new Promise((r) => setTimeout(r, 150));
      document.querySelector(`#game-menu [data-kind="${kind}"]`)?.click();
    }, kind);
    await alex.waitForTimeout(2500);
    await sam.evaluate(() => document.querySelector('#game-invite .btn.primary, #game-invite button')?.click());
    await sam.waitForTimeout(2000);
    const open = await alex.evaluate(() => !document.getElementById('game-stage')?.hidden);
    await alex.evaluate(() => document.querySelector('#game-stage .game-end')?.click());
    await alex.waitForTimeout(600);
    await alex.evaluate(() => document.querySelector('.dialog-backdrop:not([hidden]) .btn.primary, .dialog-backdrop:not([hidden]) .danger')?.click());
    await alex.waitForTimeout(1500);
    const closes = (await roomCloses(alex)) + (await roomCloses(sam));
    const s = await liveState(alex);
    check(open && closes === 0 && s.active && s.shown, `${kind}: opens on one press, no room connection closes, the stream stays`, JSON.stringify({ open, closes, ...s }));
  }

  // Both room connections drop (a restart closes every connection): the stream keeps going.
  await drop(sam);
  await drop(alex);
  await alex.waitForTimeout(6000);
  const after = await liveState(alex);
  const mine = await liveState(sam);
  check(after.active && after.shown && after.frames > before.frames && /Sam/.test(after.status), 'after both connections dropped, Alex still sees Sam\'s stream (listed again, frames keep coming)', JSON.stringify(after));
  check(mine.active && /You/.test(mine.status), 'Sam is still streaming', JSON.stringify(mine));
  await alex.waitForTimeout(2000);
  const later = await liveState(alex);
  check(later.frames > after.frames, 'the picture keeps moving', `${after.frames} → ${later.frames}`);

  // A game pressed while the room connection is down opens on that press.
  await alex.evaluate(async () => {
    document.getElementById('game-btn').click();
    await new Promise((r) => setTimeout(r, 300));
    document.querySelector('#game-menu [data-tab="together"]')?.click();
  });
  await drop(alex);
  await alex.evaluate(() => document.querySelector('#game-menu [data-kind="xox"]')?.click());
  const opened = await alex.waitForFunction(() => !document.getElementById('game-stage')?.hidden, null, { timeout: 15000 }).then(() => true, () => false);
  check(opened, 'a game pressed while the room connection was down opens on that one press');

  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Game drop harness passed');
  process.exit(failed ? 1 : 0);
})();
