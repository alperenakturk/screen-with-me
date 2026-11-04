// Card R21 (owner: "bigger, and from a clearly visible place on the right side, not the very top right"): the message
// sits on the right, 15–40 % down the video, ≥ 20 px text at 1920 × 1080 and ≥ 16 px at 1366 × 768; many in a row stay
// above YouTube's bar. Each check runs at 1440 × 900, 1920 × 1080 and 1366 × 768.
// Card R15 (owner's test round 2: "never open a stupid menu on the side like this"): YouTube fullscreen on a computer
// has no column beside the player any more (it was card 2a's `#fs-side`). Messages come down over the video from the
// top right, left of the rail, like with other players, never over YouTube's own bottom bar; the room's notes sit on
// the video; cameras float over the video in their one window. Checks: nothing going on, a message, a note, my camera:
// each time the player keeps the full width beside the rail.
//
//   npm run dev, then: node scripts/harness/yt-fs-side/run.cjs [site]
const { viaYouTube } = require('../via-youtube.cjs');
const { chromium } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
};
const args = ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'];
// YouTube's own bar (seek line + buttons) lives in the player's bottom ~60 px.
const YT_BAR = 64;

const SIZES = [
  { width: 1440, height: 900, font: 18 },
  { width: 1920, height: 1080, font: 20 },
  { width: 1366, height: 768, font: 16 },
];

(async () => {
  const browser = await chromium.launch({ args });
  for (const size of SIZES) await run(browser, size);
  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ YouTube fullscreen without a column: harness passed');
  process.exit(failed ? 1 : 0);
})();

async function run(browser, { width, height, font }) {
  console.log(`\n— ${width} × ${height}`);
  const mid = { x: Math.round(width * 0.35), y: Math.round(height / 2) };
  const ctx = await browser.newContext({ viewport: { width, height }, permissions: ['microphone', 'camera'] });
  await viaYouTube(ctx);
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    for (const [k, v] of Object.entries({ name: 'Alex', avatar: 'wizard', lang: 'en', 'opt:autoInvite': '0', tipsSeen: '1', 'opt:voiceCheck': 'skip', 'opt:ipNotice:voice': '1' })) localStorage.setItem(k, v);
  });
  await page.goto(`${SITE}/r/ys${Math.random().toString(36).slice(2, 7)}#back`);
  await page.waitForFunction(() => !!document.querySelector('#media-input'), null, { timeout: 15000 });
  await page.waitForTimeout(1200);
  await page.fill('#media-input', 'https://www.youtube.com/watch?v=M7lc1UVf-VE');
  await page.press('#media-input', 'Enter');
  await page.waitForFunction(() => document.querySelector('#theater')?.classList.contains('yt-rail'), null, { timeout: 20000 });
  await page.evaluate(() => document.getElementById('fullscreen')?.click());
  await page.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 8000 });
  await page.mouse.move(mid.x, mid.y);
  await page.waitForTimeout(1500);

  const look = () =>
    page.evaluate(() => {
      const box = (e) => {
        const r = e?.getBoundingClientRect();
        return r && r.width > 0 ? { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) } : null;
      };
      const theater = document.getElementById('theater');
      return {
        column: !!document.getElementById('fs-side') || theater.classList.contains('fs-side-open'),
        player: box(document.querySelector('#player iframe') ?? document.getElementById('player')),
        dock: box(document.getElementById('fs-dock')),
        vw: innerWidth,
      };
    });
  const fullWidth = async (label) => {
    const s = await look();
    check(!s.column && s.player && s.player.r >= s.vw - 80, `${label}: no column, the player keeps the width beside the rail`, JSON.stringify(s));
    return s;
  };

  await fullWidth('nothing going on');

  // A message from someone: it comes down over the video at the top right, left of the rail, never on YouTube's bar.
  await page.evaluate(() => {
    const toasts = document.getElementById('toasts');
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = 'Sam: hello';
    toasts?.append(t);
    setTimeout(() => t.remove(), 4000);
  });
  await page.waitForTimeout(600);
  const withToast = await fullWidth('a message');
  const toast = await page.evaluate(() => {
    const e = document.querySelector('#toasts .toast');
    const r = e?.getBoundingClientRect();
    return r ? { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom), font: parseFloat(getComputedStyle(e).fontSize) } : null;
  });
  const p = withToast.player;
  const down = toast && p ? Math.round(((toast.t - p.t) / (p.b - p.t)) * 100) : -1;
  check(
    !!toast && !!p && down >= 40 && down <= 60 && toast.r > (p.l + p.r) / 2 && toast.b < p.b - YT_BAR && (!withToast.dock || toast.r <= withToast.dock.l + 1 || withToast.dock.r - withToast.dock.l === 0),
    'the message comes in on the right side, 40–60 % down the video (below the message box), left of the rail, clear of YouTube\'s bottom bar',
    JSON.stringify({ toast, player: p, dock: withToast.dock, down }),
  );
  check(!!toast && toast.font >= font, `its text is at least ${font} px`, JSON.stringify(toast));

  // The rail comes out (mouse at the right edge): the message is still left of it, never under it.
  await page.mouse.move(width - 10, mid.y, { steps: 4 });
  await page.waitForTimeout(500);
  const out = await page.evaluate(() => {
    const t = document.querySelector('#toasts .toast')?.getBoundingClientRect();
    const d = document.getElementById('fs-dock').getBoundingClientRect();
    return { toastR: t ? Math.round(t.right) : null, dockL: Math.round(d.left), idle: document.getElementById('theater').classList.contains('dock-idle') };
  });
  check(out.toastR !== null && !out.idle && out.toastR <= out.dockL + 1, 'with the rail out, the message is still left of it', JSON.stringify(out));
  await page.mouse.move(mid.x, mid.y, { steps: 4 });
  await page.waitForTimeout(800);

  // Card R25: with the rail's message box open, a message starts below the box and its 💬, never over them.
  await page.mouse.move(width - 10, mid.y, { steps: 4 });
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = 'Sam: while you type';
    document.getElementById('toasts')?.append(t);
    setTimeout(() => t.remove(), 4000);
  });
  await page.waitForTimeout(300);
  const typing = await page.evaluate(() => {
    const r = (e) => { const b = e?.getBoundingClientRect(); return b && b.height > 0 ? { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom) } : null; };
    return { box: r(document.getElementById('dock-chat-form')), btn: r(document.getElementById('dock-chat')), toasts: [...document.querySelectorAll('#toasts .toast')].map(r), focused: document.activeElement?.id };
  });
  const overlaps = (a, b) => !!a && !!b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  check(!!typing.box && typing.toasts.length > 0 && typing.toasts.every((t) => t && !overlaps(t, typing.box) && !overlaps(t, typing.btn) && t.t >= typing.box.b && t.b < p.b - YT_BAR),
    'with the message box open, messages sit below it and its 💬, never over them (R25)', JSON.stringify(typing));
  await page.keyboard.press('Escape');
  await page.mouse.move(mid.x, mid.y, { steps: 4 });
  await page.waitForTimeout(600);

  // Many messages in a row (through the real chat; my own show too): they stack, the newest stays above YouTube's bar.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);
    await page.keyboard.type(`message number ${i} with a few more words so that it wraps onto a second line here`);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(450);
  }
  const stack = await page.evaluate(() => [...document.querySelectorAll('#toasts .toast')].map((e) => Math.round(e.getBoundingClientRect().bottom)));
  check(stack.length >= 2 && Math.max(...stack) < p.b - YT_BAR, 'six messages in a row stack and stay above YouTube\'s bar', JSON.stringify({ stack, bar: p.b - YT_BAR }));
  await page.keyboard.press('Escape');
  await page.mouse.move(mid.x, mid.y);
  await page.waitForTimeout(800);

  // A room note (the everyone-ready wait): on the video, as for video files.
  await page.evaluate(() => {
    const banner = document.getElementById('waiting-banner');
    banner.textContent = 'Waiting for Sam…';
    banner.hidden = false;
  });
  await page.waitForTimeout(400);
  const note = await page.evaluate(() => {
    const banner = document.getElementById('waiting-banner');
    const r = banner.getBoundingClientRect();
    return { inVideo: !!banner.closest('.player-wrap'), shown: r.width > 0, b: Math.round(r.bottom) };
  });
  const withNote = await fullWidth('a room note');
  check(note.inVideo && note.shown && note.b < withNote.player.b - YT_BAR, 'the note sits on the video, clear of YouTube\'s bottom bar', JSON.stringify(note));
  await page.evaluate(() => {
    document.getElementById('waiting-banner').hidden = true;
  });

  // My camera: its one window floats over the video; the player keeps the width.
  await page.evaluate(() => document.getElementById('dock-cam')?.click());
  await page.waitForFunction(() => !!document.querySelector('#voice-cams .cam-tile video'), null, { timeout: 15000 }).catch(() => {});
  await page.mouse.move(mid.x, mid.y);
  await page.waitForTimeout(2000);
  const withCam = await fullWidth('my camera on');
  const cam = await page.evaluate(() => {
    const tile = document.querySelector('#voice-cams .cam-tile')?.getBoundingClientRect();
    return tile ? { l: Math.round(tile.left), r: Math.round(tile.right), t: Math.round(tile.top), b: Math.round(tile.bottom) } : null;
  });
  check(!!cam && cam.l >= withCam.player.l && cam.r <= withCam.player.r + 1 && cam.b <= height, 'my camera floats over the video', JSON.stringify({ cam, player: withCam.player }));
  await page.evaluate(() => document.getElementById('dock-cam')?.click());
  await page.waitForTimeout(1500);
  await fullWidth('camera off again');

  await ctx.close();
}
