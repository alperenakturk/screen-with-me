// Card CAM2 (the owner, 19 Nov 2026: "the camera doesn't show on my laptop"): two computers in voice at 1366 and 1920.
//  1. 📷 shows my camera window with my picture, and the friend gets it moving, even when the camera window had been
//     folded with "−" before (that choice was remembered for good, so every later camera came as a bare "📷 1" strip);
//  2. the rail's 📷 (not in voice yet) joins with the camera on and shows the picture the same way;
//  3. a camera the browser refuses says why and how to allow it, on screen next to the 📷 that was pressed (it used to
//     sit in the page's top-left corner for 6 s), for each reason (blocked by the browser, by the computer, busy, none);
//  4. the Test Lab's `camera.open` (a drawn picture, `fold`, a refusal) does the same.
//
//   built site on wrangler dev:  node scripts/harness/cam-laptop/run.cjs http://localhost:8787 [screenshot folder]
const { chromium } = require('playwright');
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
const shot = async (page, name) => OUT && page.screenshot({ path: `${OUT}/${name}.png` });

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

/** My own camera picture: shown on screen, big enough, not covered at its middle. */
const mine = (page) =>
  page.evaluate(() => {
    const v = document.querySelector('.cam-tile.mine video');
    if (!v) return { shown: false, why: 'no tile' };
    const r = v.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const inside = r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
    return { shown: !!v.videoWidth && r.width >= 120 && r.height >= 80 && inside && !!hit && v.closest('.cam-tile').contains(hit), w: Math.round(r.width), h: Math.round(r.height), folded: document.getElementById('voice-cams').classList.contains('folded') };
  });

/**
 * The message about a refused camera: on screen, near `anchor` (a selector), with its text. `fail` makes the page's
 * camera open fail with that browser error until `allow()`.
 */
const note = (page, anchor) =>
  page.evaluate((anchor) => {
    const b = document.querySelector('.hint-bubble');
    const a = document.querySelector(anchor)?.getBoundingClientRect();
    if (!b || !a) return null;
    const r = b.getBoundingClientRect();
    const near = Math.abs(r.left + r.width / 2 - (a.left + a.width / 2)) < Math.max(260, r.width) && (Math.abs(r.bottom - a.top) < 60 || Math.abs(r.top - a.bottom) < 60);
    return { text: b.textContent, near, inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight };
  }, anchor);

async function person(browser, room, name, viewport, saved = {}) {
  const ctx = await browser.newContext({ viewport, permissions: ['microphone', 'camera'] });
  await ctx.addInitScript((saved) => {
    // Seeded once per tab: a later reload keeps what the page saved itself.
    if (!sessionStorage.getItem('lab:seeded')) {
      sessionStorage.setItem('lab:seeded', '1');
      Object.assign(localStorage, { lang: 'en', tipsSeen: '1', 'opt:autoInvite': '0', 'opt:ipNotice:voice': '1', 'opt:voiceCheck': 'skip' }, saved);
    }
    // The test's own switch for a refusing camera (the browser's error name and message).
    const real = MediaDevices.prototype.getUserMedia;
    MediaDevices.prototype.getUserMedia = function (c) {
      const fail = window.__camFail;
      if (fail && c && c.video) return Promise.reject(new DOMException(fail[1], fail[0]));
      return real.call(this, c);
    };
  }, saved);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${SITE}/?debug=1`);
  await page.waitForFunction(() => sessionStorage.getItem('swm:debug') === '1', null, { timeout: 10000 });
  await page.goto(`${SITE}/r/${room}`);
  await page.fill('#name', name);
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await page.waitForFunction(() => document.documentElement.dataset.swmTransport === 'ws', null, { timeout: 15000 });
  return { page, ctx, errors };
}

const join = async (page) => {
  await page.evaluate(() => document.getElementById('voice-join').click());
  return until(() => page.evaluate(() => !document.getElementById('voice-on').hidden));
};

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  for (const [w, h] of [[1366, 768], [1920, 1080]]) {
    const room = `cam${Math.random().toString(36).slice(2, 7)}`;
    // Alex folded the camera window some day before ("−"): the saved choice is there from the start.
    const alex = await person(browser, room, 'Alex', { width: w, height: h }, { 'opt:camFolded': '1' });
    const sam = await person(browser, room, 'Sam', { width: w, height: h });
    await join(alex.page);
    await join(sam.page);

    // ---- 1. 📷 in the Together card ----
    await alex.page.evaluate(() => document.getElementById('voice-cam').click());
    const shown = await until(async () => {
      const m = await mine(alex.page);
      return m.shown ? m : null;
    });
    await shot(alex.page, `${w}-mine`);
    check(!!shown, `${w}: 📷 shows my camera window with my picture (it had been folded before)`, await mine(alex.page));
    const alexId = await alex.page.evaluate(() => document.querySelector('.cam-tile.mine')?.dataset.voiceId);
    const onSam = `#voice-cams .cam-tile[data-voice-id="${alexId}"] video`;
    check(!!(await until(async () => (await moving(sam.page, onSam)) > 3)), `${w}: the friend gets my camera, moving`);
    const samShown = await sam.page.evaluate((sel) => {
      const v = document.querySelector(sel);
      const r = v?.getBoundingClientRect();
      return !!r && r.width >= 120 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1;
    }, onSam);
    check(samShown, `${w}: the friend's camera window shows it on screen`);

    // Folding by hand still works while the cameras stay (the choice is the person's).
    await alex.page.evaluate(() => document.querySelector('#voice-cams .cam-fold')?.click());
    check(!!(await until(() => alex.page.evaluate(() => document.getElementById('voice-cams').classList.contains('folded')))), `${w}: "−" still folds the window`);
    await alex.page.evaluate(() => document.querySelector('#voice-cams .cam-fold')?.click());

    // ---- 3. Refusals: why, how, next to the 📷 pressed ----
    const reasons = [
      ['NotAllowedError', 'Permission denied', /address bar/],
      ['NotAllowedError', 'Permission denied by system', /Privacy/],
      ['NotReadableError', 'Could not start video source', /Another app/],
      ['NotFoundError', 'Requested device not found', /No camera found/],
    ];
    await alex.page.evaluate(() => document.getElementById('voice-cam').click()); // off
    await until(() => alex.page.evaluate(() => !document.querySelector('.cam-tile.mine')));
    for (const [name, message, want] of reasons) {
      await alex.page.evaluate((f) => (window.__camFail = f), [name, message]);
      await alex.page.evaluate(() => document.getElementById('voice-cam').click());
      const n = await until(() => note(alex.page, '#voice-cam'), 4000);
      check(!!n && want.test(n.text) && n.near && n.inside, `${w}: refused (${message}): the message says why and how, next to the card's 📷`, n);
      await alex.page.waitForTimeout(300);
      await alex.page.mouse.click(5, h - 5); // closes the message
    }
    await shot(alex.page, `${w}-refused`);
    await alex.page.evaluate(() => (window.__camFail = null));

    // ---- 2. The rail's 📷 before joining voice ----
    await alex.page.evaluate(() => document.getElementById('voice-leave').click());
    await until(() => alex.page.evaluate(() => document.getElementById('voice-on').hidden));
    await alex.page.evaluate(() => (window.__camFail = ['NotAllowedError', 'Permission denied']));
    const railShown = await alex.page.evaluate(() => document.getElementById('dock-cam')?.getBoundingClientRect().width > 0);
    if (railShown) {
      await alex.page.evaluate(() => document.getElementById('dock-cam').click());
      const n = await until(() => note(alex.page, '#dock-cam'), 5000);
      check(!!n && /address bar/.test(n.text) && n.near && n.inside, `${w}: the rail's 📷 refused: the message sits next to the rail's 📷`, n);
      await alex.page.mouse.click(5, h - 5);
      await alex.page.evaluate(() => (window.__camFail = null));
      await alex.page.evaluate(() => document.getElementById('voice-leave').click());
      await until(() => alex.page.evaluate(() => document.getElementById('voice-on').hidden));
      await alex.page.evaluate(() => localStorage.setItem('opt:camFolded', '1'));
      await alex.page.evaluate(() => document.getElementById('dock-cam').click());
      check(!!(await until(async () => ((await mine(alex.page)).shown ? true : null))), `${w}: the rail's 📷 joins voice and shows my picture`, await mine(alex.page));
      const railMoving = await until(async () => (await moving(sam.page, onSam)) > 3, 15000);
      if (!railMoving) console.log('debug rail', await sam.page.evaluate(() => [...document.querySelectorAll('#voice-cams .cam-tile')].map((t) => t.dataset.voiceId)), await sam.page.evaluate(() => window.__swmLab?.status?.().filter(([k]) => /Voice|Camera/.test(k))));
      check(!!railMoving, `${w}: after leaving and joining again with the rail's 📷, the friend gets my camera, moving`);
    } else check(false, `${w}: the rail's 📷 is on screen`);
    await alex.page.evaluate(() => (window.__camFail = null));

    // ---- 4. Test Lab ----
    await until(() => alex.page.evaluate(() => !!document.querySelector('.debug-fab')));
    await alex.page.evaluate(() => document.querySelector('.debug-fab').click());
    await until(() => alex.page.evaluate(() => !!window.__swmLab));
    await alex.page.evaluate(() => document.querySelector('.debug-fab').click());
    const labOn = await alex.page.evaluate(() => window.__swmLab.run('camera.open', 'fold'));
    check(labOn.dir !== 'error' && /shown/.test(JSON.stringify(labOn)), `${w}: Test Lab camera.open fold: the folded window opens with the drawn picture`, labOn);
    const labMoving = await until(async () => (await moving(sam.page, onSam)) > 3);
    if (!labMoving) console.log('debug', await moving(alex.page, '.cam-tile.mine video'), await sam.page.evaluate((sel) => { const v = document.querySelector(sel); return v ? [v.videoWidth, v.paused, v.readyState, v.srcObject?.getVideoTracks().map((t) => t.readyState + t.muted)] : 'no video'; }, onSam), await sam.page.evaluate(() => [...document.querySelectorAll('#voice-cams .cam-tile')].map((t) => t.dataset.voiceId + ':' + t.className)));
    check(!!labMoving, `${w}: the friend gets the Test Lab picture, moving`);
    const labNo = await alex.page.evaluate(() => window.__swmLab.run('camera.open', 'system'));
    check(labNo.dir !== 'error' && /camBlockedSystem/.test(JSON.stringify(labNo)), `${w}: Test Lab camera.open system: refused with the computer's reason`, labNo);
    const status = await alex.page.evaluate(() => window.__swmLab.status().find(([k]) => k === 'Camera refused')?.[1] ?? null);
    check(/NotAllowedError/.test(String(status)), `${w}: 📊 Status says why the camera was refused`, status);

    check(alex.errors.length === 0 && sam.errors.length === 0, `${w}: no page errors`, [...alex.errors, ...sam.errors]);
    await alex.ctx.close();
    await sam.ctx.close();
  }
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nall passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
