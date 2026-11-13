// Card CAM1 (the owner's test with a friend on phones and a computer): a computer (Alex) and an iPhone 13 (Sam) in voice
// with their cameras on (Chromium's fake camera).
//  1. each side gets the other's picture, moving (computer ⇄ phone);
//  2. the phone's camera row and person sheet fit the screen, nothing covers the message box;
//  3. a camera switch goes in place: Alex never sees Sam's camera go off, the room says "switching" meanwhile, and
//     Sam's picture moves again quickly;
//  4. only the front camera's own preview is a mirror: a rear camera is not, and the others never see a mirror;
//  5. a picture that stops (Test Lab: "the others get no picture for N s") says "waiting for the picture…" and comes
//     back by itself; a paused picture plays again; the Test Lab's Status lists every camera picture.
//
//   built site on wrangler dev:  node scripts/harness/cam-phone/run.cjs http://localhost:8787 [screenshot folder]
const { chromium, devices } = require('playwright');
const fs = require('fs');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || '';
if (OUT) fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
const check = (ok, label, extra) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra !== undefined ? ` → ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : ''}`);
  if (!ok) fails++;
};
const until = async (fn, ms = 10000) => {
  for (let i = 0; i < ms / 200; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
};

/** How many frames a picture draws in `ms` (0 = black / stuck). */
const moving = (page, sel, ms = 1200) =>
  page.evaluate(
    async ([sel, ms]) => {
      const v = document.querySelector(sel);
      if (!v || !v.videoWidth) return 0;
      const a = v.getVideoPlaybackQuality().totalVideoFrames;
      await new Promise((r) => setTimeout(r, ms));
      return v.getVideoPlaybackQuality().totalVideoFrames - a;
    },
    [sel, ms],
  );

async function person(browser, room, name, opts, rear = false) {
  const ctx = await browser.newContext({ ...opts, permissions: ['microphone', 'camera'] });
  await ctx.addInitScript((rear) => {
    localStorage.setItem('lang', 'en');
    localStorage.setItem('tipsSeen', '1');
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('opt:voiceCheck', 'skip');
    localStorage.setItem('opt:ipNotice:voice', '1');
    // A phone has a front and a rear camera; Chromium's fake device is one: list a second one (opening it falls back to
    // the default device, which is what a vanished pick does too).
    const list = MediaDevices.prototype.enumerateDevices;
    MediaDevices.prototype.enumerateDevices = async function () {
      const out = await list.call(this);
      const cam = out.find((d) => d.kind === 'videoinput' && d.deviceId);
      return cam ? [...out, { deviceId: 'lab-rear', groupId: cam.groupId, kind: 'videoinput', label: 'Back Camera', toJSON() {} }] : out;
    };
    // Chromium's fake camera has no facing: pretend which way it looks.
    const real = MediaStreamTrack.prototype.getSettings;
    MediaStreamTrack.prototype.getSettings = function () {
      const s = real.call(this);
      return this.kind === 'video' && this.readyState !== undefined && !s.facingMode ? { ...s, facingMode: window.__facing ?? (rear ? 'environment' : 'user') } : s;
    };
  }, rear);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const heard = [];
  page.on('websocket', (ws) => ws.on('framereceived', (f) => /"switching":true/.test(String(f.payload)) && heard.push(Date.now())));
  const sent = [];
  page.on('websocket', (ws) => ws.on('framesent', (f) => /"t":"voice"/.test(String(f.payload)) && sent.push({ at: Date.now(), data: String(f.payload) })));
  await page.goto(`${SITE}/?debug=1`);
  // The page turns the lab on once its app has started, which can be after "load": leaving before that left the tab
  // without the lab, and the 🐞 never came in the room (1 in 3 on a CI-like server).
  await page.waitForFunction(() => sessionStorage.getItem('swm:debug') === '1', null, { timeout: 10000 });
  await page.goto(`${SITE}/r/${room}`);
  await page.fill('#name', name);
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await page.waitForFunction(() => document.documentElement.dataset.swmTransport === 'ws', null, { timeout: 15000 });
  return { page, ctx, errors, heard, sent };
}

async function joinWithCam(page) {
  await page.evaluate(() => document.getElementById('voice-join').click());
  await until(() => page.evaluate(() => !document.getElementById('voice-on').hidden));
  await page.evaluate(() => document.getElementById('voice-cam').click());
  await until(() => page.evaluate(() => !!document.querySelector('.cam-tile.mine video')?.videoWidth));
}

const shot = async (page, name) => OUT && page.screenshot({ path: `${OUT}/${name}.png` });

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const room = `cam${Math.random().toString(36).slice(2, 7)}`;
  const alex = await person(browser, room, 'Alex', { viewport: { width: 1366, height: 768 } });
  const sam = await person(browser, room, 'Sam', { ...devices['iPhone 13'] });
  await joinWithCam(alex.page);
  await joinWithCam(sam.page);

  // ---- 1. Both ways ----
  const samId = await until(() => sam.page.evaluate(() => document.querySelector('.cam-tile.mine')?.dataset.voiceId ?? null));
  const remoteOnAlex = `#voice-cams .cam-tile[data-voice-id="${samId}"] video`;
  check(!!(await until(async () => (await moving(alex.page, remoteOnAlex)) > 3)), "the computer gets the phone's camera, moving");
  check(!!(await until(async () => (await moving(sam.page, '.ph-cams .ph-cam:not(:has(.mine)) video')) > 3)), "the phone gets the computer's camera, moving (camera row)");

  // ---- 2. The phone's camera row and person sheet ----
  await sam.page.waitForTimeout(500);
  await shot(sam.page, 'phone-row');
  const row = await sam.page.evaluate(() => {
    const r = (e) => e && e.getBoundingClientRect();
    const tiles = [...document.querySelectorAll('.ph-cams .ph-cam')].map(r);
    const input = r(document.getElementById('chat-input'));
    const row = r(document.querySelector('.ph-cams'));
    return {
      tiles: tiles.length,
      inside: tiles.every((t) => t.left >= -1 && t.right <= innerWidth + 1 && t.width >= 96),
      names: [...document.querySelectorAll('.ph-cam-name')].every((n) => n.textContent.trim() && n.scrollWidth <= n.clientWidth + 1),
      clear: !!input && !!row && row.bottom <= input.top,
      pageScroll: document.documentElement.scrollWidth > innerWidth + 1,
    };
  });
  check(row.tiles === 2 && row.inside && row.names && row.clear && !row.pageScroll, 'phone: two cameras in the row, whole, named, clear of the message box', row);
  await sam.page.click('.ph-cams .ph-cam:not(:has(.mine))');
  const sheet = await until(() =>
    sam.page.evaluate(() => {
      const pop = document.querySelector('.person-pop');
      const cam = pop?.querySelector('.person-cam');
      if (!pop || !cam || !cam.videoWidth) return null;
      const p = pop.getBoundingClientRect();
      // Only the buttons that show (PH1: the camera size presets are hidden on a phone).
      const buttons = [...pop.querySelectorAll('button')].map((b) => b.getBoundingClientRect()).filter((r) => r.width > 0);
      return {
        fits: p.top >= -1 && p.bottom <= innerHeight + 1 && p.left >= -1 && p.right <= innerWidth + 1,
        buttonsShown: buttons.every((b) => b.bottom <= innerHeight + 1 && b.height >= 36),
        camH: Math.round(cam.getBoundingClientRect().height),
        vh: innerHeight,
      };
    }),
  );
  await shot(sam.page, 'phone-sheet');
  check(!!sheet && sheet.fits && sheet.buttonsShown && sheet.camH <= sheet.vh * 0.36, "phone: the person sheet with Alex's camera fits, its buttons on screen", sheet);
  await sam.page.keyboard.press('Escape');
  await sam.page.waitForTimeout(400);

  // ---- 3. Switching the camera: in place, "switching" meanwhile ----
  // The lab's hooks come with its drawer: open it once on both (the 🐞 sits under the phone's sheet layer).
  for (const p of [sam.page, alex.page]) {
    await until(() => p.evaluate(() => !!document.querySelector('.debug-fab')));
    await p.evaluate(() => document.querySelector('.debug-fab').click());
    await until(() => p.evaluate(() => !!window.__swmLab));
    await p.evaluate(() => document.querySelector('.debug-fab').click());
  }
  const before = alex.heard.length;
  const offBefore = sam.sent.filter((s) => /"cam":false/.test(s.data)).length;
  const t0 = Date.now();
  const switched = await sam.page.evaluate(() => window.__swmLab.run('voice.switchCam'));
  check(switched.dir !== 'error', 'the Test Lab switches the camera', switched);
  const back = await until(async () => (await moving(alex.page, remoteOnAlex, 600)) > 2, 6000);
  const took = Date.now() - t0;
  check(!!back && took < 3000, `the computer sees the switched camera moving within 3 s (${(took / 1000).toFixed(1)} s)`);
  check(alex.heard.length > before, 'the room says "switching" while it runs (others show "camera changing…")');
  check(sam.sent.filter((s) => /"cam":false/.test(s.data)).length === offBefore, 'the switch never turns the camera off for the others');
  check(await alex.page.evaluate((sel) => !document.querySelector(sel)?.parentElement.dataset.camNote, remoteOnAlex), 'no note left on the picture after the switch');

  // The phone's faces strip has a 🔄 that does the same with one press.
  const flipShown = await until(() => sam.page.evaluate(() => !document.getElementById('strip-flip')?.hidden && document.getElementById('strip-flip').getBoundingClientRect().width >= 36));
  check(!!flipShown, "phone: 🔄 switch camera in the faces strip (camera on, two cameras)");
  const heardBefore = alex.heard.length;
  await sam.page.click('#strip-flip');
  check(!!(await until(async () => alex.heard.length > heardBefore, 4000)) && !!(await until(async () => (await moving(alex.page, remoteOnAlex, 600)) > 2, 6000)), 'phone: the 🔄 switches in place, the computer keeps a moving picture');
  await shot(sam.page, 'phone-strip-flip');

  // ---- 4. Mirrors ----
  const tf = (page, sel) => page.evaluate((sel) => (document.querySelector(sel) ? getComputedStyle(document.querySelector(sel)).transform : 'none'), sel);
  check(/^matrix\(-1/.test(await tf(alex.page, '.cam-tile.mine video')), 'front camera: my own preview is a mirror (computer)');
  check((await tf(alex.page, remoteOnAlex)) === 'none', "nobody else's picture is a mirror");
  check(/^matrix\(-1/.test(await tf(sam.page, '.ph-cam .face-cam.mine')), 'front camera: my own preview is a mirror (phone)');
  await sam.page.evaluate(() => (window.__facing = 'environment'));
  await sam.page.evaluate(() => window.__swmLab.run('voice.switchCam'));
  await until(() => sam.page.evaluate(() => document.documentElement.dataset.swmCamFacing === 'environment'), 5000);
  await sam.page.waitForTimeout(400);
  check((await tf(sam.page, '.ph-cam .face-cam.mine')) === 'none', 'rear camera: my own preview is not a mirror (moving left looks left)');
  check((await tf(alex.page, remoteOnAlex)) === 'none', 'rear camera: what the others see is not a mirror either');
  await sam.page.evaluate(() => (window.__facing = 'user'));
  await sam.page.evaluate(() => window.__swmLab.run('voice.switchCam'));
  await sam.page.waitForTimeout(800);

  // ---- 5. A picture that stops, and a paused one ----
  await sam.page.evaluate(() => window.__swmLab.run('voice.camPause', '5'));
  const note = await until(() => alex.page.evaluate((sel) => document.querySelector(sel)?.parentElement.dataset.camNote ?? null, remoteOnAlex), 5000);
  await shot(alex.page, 'computer-waiting');
  check(/Waiting for the picture/.test(String(note)), 'a stopped picture says "waiting for the picture…"', note);
  const status = await alex.page.evaluate(() => window.__swmLab?.status?.().find(([k]) => k === 'Camera pictures')?.[1] ?? null);
  check(/Sam: note/.test(String(status)), '📊 Status lists the camera pictures and their state', status);
  const healed = await until(async () => (await moving(alex.page, remoteOnAlex, 600)) > 2 && (await alex.page.evaluate((sel) => !document.querySelector(sel)?.parentElement.dataset.camNote, remoteOnAlex)), 10000);
  check(!!healed, 'the picture comes back by itself, the note goes');
  await alex.page.evaluate((sel) => document.querySelector(sel).pause(), remoteOnAlex);
  check(!!(await until(() => alex.page.evaluate((sel) => !document.querySelector(sel).paused, remoteOnAlex), 3000)), 'a paused picture plays again by itself');

  check(alex.errors.length === 0 && sam.errors.length === 0, 'no page errors', [...alex.errors, ...sam.errors]);
  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Cameras on phones work');
  process.exit(fails ? 1 : 0);
})();
