// YouTube room on a computer (0.9.92.9 pick 5B on https://claude.ai/artifact/LP8aB9RzKFZh3N6sAkEDvG; 0.9.93): the room's
// notes (everyone-ready wait …) sit in the chat panel above the message box, or above the video with the side panel
// hidden; emojis fly over the video again (0.9.93, owner: "they don't harm the content"). The rail beside the video
// comes when the mouse reaches the video's right edge and goes as soon as it leaves; "Keep the controls open" (⋯ or
// Settings) pins it, and an old "hide the controls" choice no longer hides it. The YouTube player only has to be
// created, not to play (the cloud's headless Chromium can't decode it). Needs Playwright and `npm run dev`:
//   NODE_PATH=$(npm root -g) node scripts/harness/yt-room/run.cjs [http://localhost:5173]
const { viaYouTube } = require('../via-youtube.cjs');
const { chromium } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:5173';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};
// Card 2a (owner's D): nothing of ours over the YouTube player by itself. Lists our visible things whose box meets the
// YouTube frame's box (popups only count while open, so the caller closes them first).
const OURS = '.r-float, .rail-edge, .countdown, .waiting-banner, .sync-badge, .action-notice, #toasts .toast, .cam-tile, .cam-pill, .live-window, .fs-dock, .fs-catcher, .game-invite, .end-card';
const overPlayer = (page) =>
  page.evaluate((ours) => {
    const frame = document.querySelector('#player iframe');
    if (!frame) return ['no YouTube frame'];
    const f = frame.getBoundingClientRect();
    const hits = [];
    for (const node of document.querySelectorAll(ours)) {
      const r = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      if (r.width < 1 || r.height < 1 || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.05) continue;
      if (r.left < f.right - 1 && f.left < r.right - 1 && r.top < f.bottom - 1 && f.top < r.bottom - 1) hits.push(`${node.className || node.id} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return hits;
  }, OURS);
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
    await viaYouTube(ctx);
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

  // Card 2a (owner's D): Sam's emoji rises from Sam's face beside the video, not over the YouTube player.
  await sam.keyboard.press('1');
  await alex.waitForSelector('.r-float.r-from', { timeout: 3000 }).catch(() => {});
  const float = await box(alex, '.r-float.r-from');
  const face = await box(alex, '#voice-people .voice-face:not(.me)');
  check(!!float, 'an emoji rises (from the sender\'s face)');
  check(float && video && float.l >= video.r, 'beside the video, not over it', JSON.stringify({ float, video, face }));
  const hits1 = await overPlayer(alex);
  check(hits1.length === 0, 'room view: nothing of ours over the YouTube player', hits1.join(' | '));

  // The right edge (0.9.93): the rail shows for a moment with a new video, then waits for the mouse at the edge.
  const idle = () => alex.evaluate(() => document.querySelector('#theater').classList.contains('dock-idle'));
  const playerRight = async () => (await box(alex, '.player')).r;
  const wrapBox = await box(alex, '.player-wrap');
  check(await alex.evaluate(() => !document.querySelector('#theater').classList.contains('rail-off') && !document.querySelector('#rail-show')), 'an old "hide the controls" no longer hides the rail');
  await alex.mouse.move(wrapBox.x, wrapBox.y);
  await alex.waitForTimeout(3000);
  check(await idle(), 'mouse in the middle: the rail rests');
  const wide = await playerRight();
  check(Math.abs(wide - (wrapBox.r - 14)) < 3, 'resting rail: the video takes the width but a thin gutter for the edge', JSON.stringify({ wide, wrap: wrapBox.r }));
  const edge = await box(alex, '#rail-edge');
  check(edge && edge.l >= wide - 1, 'the edge strip is in the gutter beside the player, not on it', JSON.stringify({ edge, wide }));
  const hits0 = await overPlayer(alex);
  check(hits0.length === 0, 'resting: nothing of ours over the YouTube player', hits0.join(' | '));
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
  // BH2: while the rail comes and goes it never covers the player, not even for a frame of the 0.22 s slide.
  const sample = () =>
    alex.evaluate(
      () =>
        new Promise((resolve) => {
          const hits = [];
          const t0 = performance.now();
          const step = () => {
            const f = document.querySelector('#player iframe').getBoundingClientRect();
            const d = document.getElementById('fs-dock');
            const r = d.getBoundingClientRect();
            const op = Number(getComputedStyle(d).opacity);
            if (op >= 0.05 && r.left < f.right - 1 && r.width > 0) hits.push(`${Math.round(performance.now() - t0)} ms: rail ${Math.round(r.left)} < player ${Math.round(f.right)} (opacity ${op.toFixed(2)})`);
            if (performance.now() - t0 < 900) requestAnimationFrame(step);
            else resolve(hits);
          };
          requestAnimationFrame(step);
        }),
    );
  const comingIn = sample();
  await alex.mouse.move(wrapBox.r - 12, wrapBox.y, { steps: 4 });
  const inHits = await comingIn;
  const goingOut = sample();
  await alex.mouse.move(wrapBox.x, wrapBox.y, { steps: 4 });
  const outHits = await goingOut;
  check(inHits.length === 0 && outHits.length === 0, 'the rail never covers the player while it slides in or out (every frame)', [...inHits, ...outHits].slice(0, 4).join(' | '));

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
    // Owner (a plain mouse laptop, no touch screen): right after the rail's ⛶, without moving the mouse, it rests.
    await alex.waitForTimeout(3000);
    check(await idle(), 'fullscreen (plain mouse): right after ⛶, no mouse move, the rail rests');
    await alex.mouse.move(vw.w / 2, vw.h / 2, { steps: 4 });
    await alex.waitForTimeout(3000);
    check(await idle(), 'fullscreen: the rail rests');
    // Card 6d (owner's bug): with nothing to show (no note, camera or message) there is no empty column: the player is
    // full width beside the resting rail's thin gutter.
    // (The 5B check above left the wait note up: take it down first.)
    await alex.evaluate(() => (document.querySelector('#waiting-banner').hidden = true));
    await alex.waitForTimeout(500);
    const bare = await alex.evaluate(() => ({ open: document.querySelector('#theater').classList.contains('fs-side-open'), right: Math.round(document.querySelector('.player').getBoundingClientRect().right), vw: innerWidth }));
    check(!bare.open && bare.right >= bare.vw - 16, 'fullscreen, nothing to show: no empty column, the player is full width', JSON.stringify(bare));
    // 🎙 / 📷 outside voice open the IP note; cancelled with the mouse (not Esc), the rail still goes.
    for (const id of ['dock-mic', 'dock-cam']) {
      await alex.mouse.move(vw.w - 8, vw.h / 2, { steps: 4 });
      await alex.waitForTimeout(300);
      await alex.click(`#${id}`);
      await alex.waitForTimeout(500);
      const cancel = await alex.evaluate(() => {
        const button = [...document.querySelectorAll('.dialog-backdrop:not([hidden]) button')][0];
        const r = button?.getBoundingClientRect();
        return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
      });
      if (cancel) await alex.mouse.click(cancel.x, cancel.y);
      await alex.mouse.move(vw.w / 2, vw.h / 2, { steps: 6 });
      await alex.waitForTimeout(1500);
      check(!!cancel && (await idle()), `fullscreen (plain mouse): ${id} outside voice, its note cancelled with the mouse, mouse to the middle: the rail goes`);
    }
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
    // Card 2a (owner's D): YouTube fullscreen has a column beside the player for the notes, cameras and messages.
    await alex.waitForTimeout(400); // the column slides in (0.22 s)
    const toast = await box(alex, '#toasts .toast');
    const side = await box(alex, '#fs-side');
    const fsPlayer = await box(alex, '.player');
    check(side && fsPlayer && side.w > 150 && fsPlayer.r <= side.l + 1, 'fullscreen: a column beside the player (the player ends where it starts)', JSON.stringify({ side, fsPlayer }));
    check(toast && side && toast.l >= side.l - 1 && toast.r <= side.r + 1, 'fullscreen: a message sits in the column, not on the player', JSON.stringify({ toast, side }));
    await alex.evaluate(() => {
      const banner = document.querySelector('#waiting-banner');
      banner.textContent = 'Waiting for Sam…';
      banner.hidden = false;
    });
    await alex.waitForTimeout(300);
    check(await alex.evaluate(() => !!document.querySelector('#fs-side-notices > #waiting-banner')), 'fullscreen: the wait note is in the column');
    await alex.evaluate(() => (document.querySelector('#waiting-banner').hidden = true));
    await sam.keyboard.press('3');
    await alex.waitForTimeout(400);
    const fsFloat = await box(alex, '.r-float.r-from');
    const fsPlayer2 = await box(alex, '.player');
    check(fsFloat && fsPlayer2 && fsFloat.x >= fsPlayer2.r, 'fullscreen: an emoji rises beside the player', JSON.stringify({ fsFloat, fsPlayer2 }));
    await alex.mouse.move(vw.w / 2, vw.h / 2, { steps: 4 });
    await alex.waitForTimeout(3200);
    const hitsFs = await overPlayer(alex);
    check(hitsFs.length === 0, 'fullscreen: nothing of ours over the YouTube player', hitsFs.join(' | '));
    // Card 6d: once the messages are gone (and a few seconds more) the column steps aside again.
    const closed = await alex
      .waitForFunction(() => !document.querySelector('#theater').classList.contains('fs-side-open'), null, { timeout: 30000 })
      .then(() => true, () => false);
    await alex.waitForTimeout(400);
    const after = await alex.evaluate(() => ({ right: Math.round(document.querySelector('.player').getBoundingClientRect().right), vw: innerWidth }));
    check(closed && after.right >= after.vw - 16, 'fullscreen: when the messages are gone the column steps aside, the player is full width again', JSON.stringify(after));
    await alex.evaluate(() => document.exitFullscreen());
    await alex.waitForTimeout(800);
  }

  // Cinema mode (card 14, the old "side panel hidden"): the note sits under the video at the strip's left end, never on
  // the player; emojis rise from the rail's 😀 beside the video.
  await alex.click('#side-toggle').catch(() => alex.evaluate(() => document.querySelector('#side-toggle')?.click()));
  await alex.waitForTimeout(3500);
  check(await alex.evaluate(() => !!document.querySelector('.yt-notices-top > #waiting-banner')), 'cinema mode: the note leaves the chat panel');
  await alex.evaluate(() => (document.querySelector('#waiting-banner').hidden = false));
  const top = await box(alex, '#waiting-banner');
  const video2 = await box(alex, '.player');
  check(top && video2 && top.w > 0 && (top.t >= video2.b - 1 || top.b <= video2.t + 1), 'cinema mode: the note is not on the video', JSON.stringify({ top, video2 }));
  await alex.evaluate(() => document.querySelectorAll('.r-float').forEach((n) => n.remove()));
  await sam.keyboard.press('2');
  await alex.waitForTimeout(400);
  const float2 = await box(alex, '.r-float.r-from');
  const video3 = await box(alex, '.player');
  check(float2 && video3 && float2.x >= video3.r, 'side panel hidden: the emoji rises from the rail\'s 😀, beside the video', JSON.stringify({ float2, video3 }));

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

  // 0.9.93.6 (owner's bug: "in YouTube fullscreen the rail never goes away"): a touch-screen laptop can report its
  // primary pointer as coarse, which made the room treat it as a tablet and keep the rail on screen for good. With a
  // mouse there it waits for the right edge like any computer. The device is simulated by answering the two media
  // queries the way such a laptop does.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await viaYouTube(ctx);
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', 'en');
      const real = window.matchMedia.bind(window);
      window.matchMedia = (q) => {
        const answer = q === '(pointer: coarse)' || q === '(any-pointer: fine) and (any-hover: hover)' ? true : null;
        if (answer === null) return real(q);
        return { matches: answer, media: q, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false };
      };
    });
    const touchRoom = `yt${Math.random().toString(36).slice(2, 7)}`;
    await page.goto(`${SITE}/r/${touchRoom}`);
    await page.fill('#name', 'Lee');
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await page.waitForTimeout(1200);
    await page.fill('#media-input', 'https://www.youtube.com/watch?v=M7lc1UVf-VE');
    await page.press('#media-input', 'Enter');
    await page.waitForFunction(() => document.querySelector('#theater')?.classList.contains('yt-rail'), null, { timeout: 15000 });
    const shown = () => page.evaluate(() => {
      const dock = document.querySelector('#fs-dock');
      const css = getComputedStyle(dock);
      return css.visibility !== 'hidden' && Number(css.opacity) > 0.05;
    });
    const w = await box(page, '.player-wrap');
    await page.mouse.move(w.x, w.y, { steps: 4 });
    await page.waitForTimeout(3200);
    check(!(await shown()), 'touch-screen laptop (window): with the mouse on the video the rail is not on screen');
    await page.mouse.move(w.r - 12, w.y, { steps: 4 });
    await page.waitForTimeout(400);
    check(await shown(), 'touch-screen laptop: the right edge opens it');
    await page.click('#dock-exit');
    await page.waitForTimeout(1200);
    if (await page.evaluate(() => document.fullscreenElement?.id === 'theater')) {
      const v = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
      await page.mouse.move(v.w - 8, v.h / 2, { steps: 4 });
      await page.waitForTimeout(300);
      await page.click('#dock-mic');
      await page.waitForTimeout(600);
      await page.keyboard.press('Escape');
      await page.mouse.move(v.w / 2, v.h / 2, { steps: 6 });
      await page.waitForTimeout(1500);
      check(!(await shown()), 'touch-screen laptop, fullscreen: 🎙 (outside voice), Esc, mouse to the middle: the rail goes');
    } else check(false, 'touch-screen laptop: fullscreen opened');
    await ctx.close();
  }

  // Card 2a: the Shorts view keeps everything of ours beside the YouTube player too (seats, rail, emojis from seats).
  {
    await alex.fill('#media-input', 'https://www.youtube.com/shorts/aqz-KE-bpKQ');
    await alex.click('#media-form button[value="load"]');
    await alex.waitForFunction(() => document.documentElement.classList.contains('shorts-view') && document.querySelector('#player iframe'), null, { timeout: 15000 }).catch(() => {});
    await alex.waitForTimeout(1500);
    await sam.keyboard.press('1');
    await alex.waitForTimeout(400);
    const hitsShorts = await overPlayer(alex);
    check(await alex.evaluate(() => document.documentElement.classList.contains('shorts-view')), 'a Short opens the Shorts view');
    check(hitsShorts.length === 0, 'Shorts view: nothing of ours over the YouTube player', hitsShorts.join(' | '));
  }

  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ YouTube room: nothing of ours over the player (notes, emojis, edge, fullscreen column)');
  process.exit(fails ? 1 : 0);
})();
