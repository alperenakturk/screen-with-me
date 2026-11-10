// Card LAYOUT1: where things open on each kind of device, and whether that makes sense. For every device (phones
// upright and sideways, an iPad both ways, a laptop, a desktop, a wide screen) it opens a room with a video, then each
// window the room has: the rail, a chat message from a friend, the invite window, the settings dialog, the Test Lab, every
// table and side game, the camera window, the stream window and the Shorts view. For each it records the box, how it
// opened (in the video's place, a free window, full screen, a sheet) and generic checks: inside the screen, nothing of
// it cut off, not covering the rail, the page not scrolling. A JSON report and a screenshot per step go to OUT.
//
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 --var SWM_LAB_SERVER:1)
//   (cd <folder with video.webm> && python3 -m http.server 5300)
//   NODE_PATH=$(npm root -g) node scripts/harness/layout-audit/run.cjs [site] [video] [out]
//   DEVICES=laptop,iphone narrows the run; STEPS=games,invite narrows the steps.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const { viaYouTube } = require('../via-youtube.cjs');

const SITE = process.argv[2] || 'http://localhost:8787';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
const OUT = process.argv[4] || '/tmp/layout-audit';
fs.mkdirSync(OUT, { recursive: true });
const pick = (env, all) => (process.env[env] ? process.env[env].split(',') : all);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const DEVICES = {
  iphone: devices['iPhone 13'],
  'iphone-side': devices['iPhone 13 landscape'],
  pixel: devices['Pixel 7'],
  'pixel-side': devices['Pixel 7 landscape'],
  ipad: devices['iPad (gen 7)'],
  'ipad-side': devices['iPad (gen 7) landscape'],
  laptop: { viewport: { width: 1366, height: 768 } },
  desktop: { viewport: { width: 1920, height: 1080 } },
  wide: { viewport: { width: 2560, height: 1440 } },
};
const GAMES = ['classics', 'sea', 'draw', 'quiz', 'poker', 'snack', 'garden', 'word'];
const STEPS = pick('STEPS', ['room', 'rail', 'message', 'invite', 'settings', 'lab', 'games', 'camera', 'stream', 'shorts']);

let fails = 0;
const report = {};
const check = (ok, label, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? ` → ${extra}` : ''}`);
};

/** The box of the first visible element matching one of the selectors, with what it is and how it opened. */
function measure(selectors) {
  const vw = innerWidth;
  const vh = innerHeight;
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const el = selectors.map((s) => [...document.querySelectorAll(s)].find(visible)).find(Boolean);
  const box = (e) => {
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const video = box(document.querySelector('.player-wrap'));
  const rail = [...document.querySelectorAll('#fs-dock')].find(visible);
  const r = box(el);
  const out = {
    found: !!el,
    selector: el ? selectors.find((s) => el.matches(s)) : null,
    classes: el && typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 6).join(' ') : '',
    box: r,
    viewport: { w: vw, h: vh },
    video,
    html: document.documentElement.className.split(/\s+/).filter((c) => /phone|tablet|sideways|touch|mouse|fs|shorts|game/.test(c)).join(' '),
    pageScrolls: document.scrollingElement.scrollHeight > vh + 2 || document.scrollingElement.scrollWidth > vw + 2,
  };
  if (r) {
    out.inside = r.x >= -1 && r.y >= -1 && r.x + r.w <= vw + 1 && r.y + r.h <= vh + 1;
    out.share = Math.round(((r.w * r.h) / (vw * vh)) * 100);
    out.where = r.w >= vw - 2 && r.h >= vh - 2 ? 'whole screen' : video && Math.abs(r.x - video.x) < 6 && Math.abs(r.y - video.y) < 6 && Math.abs(r.w - video.w) < 12 ? "the video's place" : r.y + r.h >= vh - 2 && r.w >= vw - 2 ? 'bottom sheet' : 'free';
    if (rail) {
      const rr = rail.getBoundingClientRect();
      const ox = Math.min(r.x + r.w, rr.right) - Math.max(r.x, rr.left);
      const oy = Math.min(r.y + r.h, rr.bottom) - Math.max(r.y, rr.top);
      out.coversRail = ox > 8 && oy > 8 && !el.contains(rail) && !rail.contains(el);
    }
    // Controls inside it that the screen cuts off.
    const cut = [];
    for (const c of el.querySelectorAll('button, input, select, a[href]')) {
      if (!visible(c)) continue;
      const b = c.getBoundingClientRect();
      if (b.right > vw + 1 || b.bottom > vh + 1 || b.left < -1 || b.top < -1) {
        let scrolls = false;
        for (let p = c.parentElement; p && p !== el.parentElement; p = p.parentElement) if (/(auto|scroll)/.test(getComputedStyle(p).overflowY + getComputedStyle(p).overflowX)) scrolls = true;
        if (!scrolls) cut.push((c.id ? '#' + c.id : c.className.toString().split(' ')[0]) + ` [${Math.round(b.left)},${Math.round(b.top)}]`);
      }
    }
    out.cut = cut.slice(0, 5);
  }
  return out;
}

(async () => {
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--auto-select-desktop-capture-source=Entire screen', '--autoplay-policy=no-user-gesture-required'],
  });
  for (const device of pick('DEVICES', Object.keys(DEVICES))) {
    const phone = /iphone|pixel/.test(device);
    const touch = phone || /ipad/.test(device);
    const sideways = phone && /-side$/.test(device);
    const ctx = await browser.newContext({ ...DEVICES[device], permissions: ['camera', 'microphone'] });
    await viaYouTube(ctx);
    await ctx.addInitScript(() => {
      for (const [k, v] of Object.entries({
        lang: 'en', name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', 'opt:voiceCheck': 'skip',
        'opt:ipNotice:voice': '1', 'opt:ipNotice:stream': '1', 'opt:ipNotice:watch': '1',
        'snackBar:howSeen': '1', 'windowGarden:howSeen': '1', 'fiveFrames:howSeen': '1', 'swm:debug': '1',
      })) localStorage.setItem(k, v);
      sessionStorage.setItem('swm:debug', '1');
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const rows = (report[device] = {});
    const shot = (name) => page.screenshot({ path: path.join(OUT, `${device}-${name}.png`) });
    const note = async (name, selectors) => {
      const m = await page.evaluate(measure, selectors);
      rows[name] = m;
      await shot(name);
      const label = `${device} · ${name}`;
      if (!m.found) return check(false, `${label}: shows`, selectors.join(', '));
      console.log(`     ${label}: ${m.where} ${m.box.w}×${m.box.h} at ${m.box.x},${m.box.y} (${m.share}% of the screen) [${m.classes}]`);
      check(m.inside, `${label}: inside the screen`, JSON.stringify(m.box));
      check(!m.cut?.length, `${label}: none of its controls cut off by the screen`, (m.cut ?? []).join(' | '));
      check(!m.pageScrolls, `${label}: the page does not scroll`);
      return m;
    };
    const run = (id, arg) => page.evaluate(([i, a]) => window.__swmLab.run(i, a).then((l) => ({ dir: l.dir, text: l.text })), [id, arg]);
    const closeAll = async () => {
      await page.keyboard.press('Escape').catch(() => {});
      await wait(250);
      await page.keyboard.press('Escape').catch(() => {});
      await wait(250);
    };

    // The room with a video playing.
    const room = 'la' + Math.random().toString(36).slice(2, 7);
    await page.goto(`${SITE}/?debug=1`);
    await page.goto(`${SITE}/r/${room}`);
    await page.fill('#name', 'Robin');
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await page.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 }).catch(() => {});
    await wait(1500);
    await page.evaluate((url) => {
      const input = document.querySelector('#media-input');
      input.value = url;
      document.querySelector('#media-form').requestSubmit();
    }, VIDEO);
    await page.waitForFunction(() => document.querySelector('.player-wrap video'), null, { timeout: 10000 }).catch(() => {});
    await wait(1500);
    if (STEPS.includes('room')) await note('room', ['.player-wrap']);

    if (STEPS.includes('rail')) {
      const v = await page.evaluate(() => {
        const r = document.querySelector('.player-wrap')?.getBoundingClientRect();
        return r ? { x: r.right - 10, y: r.top + r.height / 2 } : null;
      });
      if (v && !touch) await page.mouse.move(v.x, v.y, { steps: 4 });
      await wait(700);
      // A sideways phone out of fullscreen shows the video and "Watch fullscreen" only (owner's 8B), no rail.
      await note('rail', sideways ? ['.ph-turn'] : ['#fs-dock', '.together-strip', '.ph-shorts-bar']);
      await page.mouse.move(5, 5);
    }

    if (STEPS.includes('message') && !sideways) {
      await run('friends.add');
      await wait(1500);
      await run('friends.say', '1');
      await wait(800);
      await note('message', ['.toasts .toast', '.ph-toast', '.chat-line:not(.me)']);
    }

    if (STEPS.includes('invite')) {
      await page.evaluate(() => document.querySelector('#invite-btn')?.click());
      await wait(900);
      await note('invite', ['.invite-dialog', '.dialog-backdrop:not([hidden]) .dialog', '.ph-sheet']);
      await closeAll();
    }

    if (STEPS.includes('settings')) {
      await page.evaluate(() => document.querySelector('#settings-open')?.click());
      await wait(800);
      await note('settings', ['#settings-dialog .dialog', '#settings-dialog']);
      await closeAll();
    }

    if (STEPS.includes('lab')) {
      await page.evaluate(() => document.querySelector('.debug-fab')?.click());
      await wait(900);
      await note('lab', ['.lab-drawer', '.debug-panel', '.test-lab']);
      // On a phone the drawer is a bottom sheet: 🐞 must not sit over its rows.
      if (phone) check(await page.evaluate(() => getComputedStyle(document.querySelector('.debug-fab')).display === 'none'), `${device} · lab: 🐞 hidden while the sheet is open`);
      await page.evaluate(() => document.querySelector('.debug-fab')?.click());
      await closeAll();
    }

    if (STEPS.includes('games')) {
      for (const game of GAMES) {
        const r = await run(`games.open.${game}`);
        if (r.dir === 'error') check(false, `${device} · game ${game}: opens`, r.text);
        await page.waitForFunction(() => {
          const b = document.querySelector('#game-stage .game-stage-body');
          return b && !b.querySelector('.game-stage-loading, .mt-loading') && b.childElementCount > 0;
        }, null, { timeout: 12000 }).catch(() => {});
        await wait(1200);
        const m = await note(`game-${game}`, ['#game-stage']);
        if (m?.found) {
          const mode = await page.evaluate(() => {
            const s = document.querySelector('#game-stage');
            return ['full', 'float', 'inplace', 'shorts'].filter((c) => s.classList.contains(c)).join(' ') || 'in the video';
          });
          rows[`game-${game}`].mode = mode;
          // A phone always plays a game on the whole screen, held either way (LAYOUT1: a Pixel 7 sideways is 863 px wide
          // and got the computer's free window). An upright tablet may cover the video (the Planner's A, card T).
          if (phone) check(mode.includes('full'), `${device} · game ${game}: the whole screen on a phone`, mode);
          else if (!touch) check(!m.coversRail, `${device} · game ${game}: does not cover the rail`);
        }
      }
      await page.evaluate(() => document.querySelector('#game-stage .game-minimize')?.click());
      await wait(500);
    }

    if (STEPS.includes('camera') && !sideways) {
      await page.evaluate(() => document.querySelector('#voice-join')?.click());
      await wait(2500);
      await page.evaluate(() => document.querySelector('#voice-cam')?.click());
      await wait(3000);
      await note('camera', ['.voice-cams.free .cam-tile', '.voice-cams.floating', '.cam-float', '.ph-cams', '.voice-cams']);
    }

    if (STEPS.includes('stream')) {
      await page.evaluate(() => {
        document.querySelector('#live-share')?.click();
        setTimeout(() => document.querySelector('#live-screen')?.click(), 300);
      });
      await wait(4000);
      const st = await note('stream', ['#live-window']);
      // My own picture starts in the top corner: the player's own bar (play, time) is at the bottom (LAYOUT1, phones).
      if (st?.found && st.video) check(st.box.y + st.box.h <= st.video.y + st.video.h * 0.78, `${device} · stream: clear of the player's bar`, JSON.stringify(st.box));
      await page.evaluate(() => document.querySelector('#live-stop')?.click());
      await wait(800);
    }

    if (STEPS.includes('shorts')) {
      // A fresh room: the first link plays at once (a Short opens the Shorts view; the player itself may not load here).
      const p2 = await ctx.newPage();
      await p2.goto(`${SITE}/r/${room}s`);
      await p2.fill('#name', 'Robin');
      await p2.click('#name-form button.primary');
      await p2.waitForSelector('.room');
      await wait(1200);
      await p2.evaluate(() => {
        const input = document.querySelector('#media-input');
        input.value = 'https://www.youtube.com/shorts/aqz-KE-bpKQ';
        document.querySelector('#media-form').requestSubmit();
      });
      await p2.waitForFunction(() => document.querySelector('.room.shorts'), null, { timeout: 10000 }).catch(() => {});
      await wait(2500);
      const m = await p2.evaluate(measure, ['.room.shorts .player-wrap', '.player-wrap']);
      rows.shorts = m;
      await p2.screenshot({ path: path.join(OUT, `${device}-shorts.png`) });
      check(m.found, `${device} · shorts: the Shorts view shows`);
      if (m.found) console.log(`     ${device} · shorts: video ${m.box.w}×${m.box.h} at ${m.box.x},${m.box.y} [${m.html}]`);
      check(!m.pageScrolls, `${device} · shorts: the page does not scroll`);
      await p2.close();
    }
    rows.errors = errors;
    check(errors.length === 0, `${device}: no page errors`, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`\nReport and screenshots: ${OUT}`);
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Layout audit passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
