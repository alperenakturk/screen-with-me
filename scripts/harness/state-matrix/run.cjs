// Card QA1 part 2: the states nobody listed. Every game in each placement it allows × side panel open / cinema mode
// (SIDES=open,closed; cinema mode is the room's only way to hide the side panel) × no video / a video file / a YouTube video × a 1366 laptop / a 1920 monitor / an upright tablet. In each state:
//   - nothing of the game is cut off (its window and every control inside it are inside the screen and the window);
//   - nothing sits over a YouTube player (YouTube's Required Minimum Functionality);
//   - a free window never covers the video unless I dragged it there (owner, 0.9.97.112: "never cover any part of our
//     video screen"; the one exception is no room anywhere beside the video, which the window then reports);
// and, once per screen size with no video, every button in a game's head visibly does something (the window, the
// page or a dialog changes), and the free window answers a real mouse: hover, drag by its head, resize from its corner
// (in proportion, inside the screen), a double click on the head puts it back.
//
//   built site + local server with the lab flag (CI's prepare), then:
//   NODE_PATH=$(npm root -g) node scripts/harness/state-matrix/run.cjs [site]
//   HEADFUL=1 xvfb-run -a node ...   real browser windows (CI); SIZES=1366 VIDEOS=file SIDES=open GAMES=sea,snack narrow it.
//   DEBUG=/tmp/x.png saves the screen when a head button changed nothing.
//   FILM_URL: the video file (default the film server's http://localhost:5300/video.webm; CI's games-more job serves one).
const { chromium } = require('playwright');
const { viaYouTube } = require('../via-youtube.cjs');

const SITE = process.argv[2] || 'http://localhost:8787';
const FILM = process.env.FILM_URL || 'http://localhost:5300/video.webm';
const YOUTUBE = 'https://www.youtube.com/watch?v=M7lc1UVf-VE';
const HEADFUL = process.env.HEADFUL === '1';
const pick = (env, all) => (process.env[env] ? process.env[env].split(',') : all);
const SIZES = {
  1366: { viewport: { width: 1366, height: 768 } },
  1920: { viewport: { width: 1920, height: 1080 } },
  tablet: { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true },
  'tablet-land': { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true },
};
const sizes = pick('SIZES', Object.keys(SIZES));
const videos = pick('VIDEOS', ['none', 'file', 'youtube']);
const sides = pick('SIDES', ['open', 'closed']);
// How many states run at once (each its own browser context and room).
const PARALLEL = Number(process.env.PARALLEL || 3);

let fails = 0;
const problems = [];
const check = (ok, label, extra) => {
  if (!ok) {
    fails++;
    problems.push(`${label}${extra !== undefined ? ` → ${JSON.stringify(extra)}` : ''}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=state-matrix::${label}${extra !== undefined ? ` → ${JSON.stringify(extra)}` : ''}`.replace(/\r?\n/g, ' '));
  }
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra !== undefined ? ` → ${JSON.stringify(extra)}` : ''}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 8000) {
  for (let i = 0; i < ms / 100; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await wait(100);
  }
  return null;
}

/** The open game in its state: where it is, against the screen and the video, and what is cut off. */
function measure() {
  const stage = document.getElementById('game-stage');
  if (!stage || stage.hidden || stage.getBoundingClientRect().width < 2) return { shown: false };
  const box = stage.getBoundingClientRect();
  const theater = document.getElementById('theater');
  const t = theater ? theater.getBoundingClientRect() : null;
  // The video itself: the player's box inside the theater (YouTube's iframe, our <video>), else the theater.
  const player = document.querySelector('#theater iframe, #theater video:not([hidden])');
  const p = player && player.getBoundingClientRect().width > 2 ? player.getBoundingClientRect() : t;
  const overlaps = (a, b) => !!a && !!b && a.left < b.right - 2 && b.left < a.right - 2 && a.top < b.bottom - 2 && b.top < a.bottom - 2;
  const visible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const name = (el) => (el.id ? `#${el.id}` : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : el.tagName.toLowerCase());
  const cut = [];
  for (const el of stage.querySelectorAll('button, input, select, textarea, a, h1, h2, h3, p, label')) {
    if (!visible(el) || el.closest('[aria-hidden="true"], svg')) continue;
    const r = el.getBoundingClientRect();
    let clipped = r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1 || r.left < -1 || r.top < -1 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1;
    // Inside a list that scrolls (a chat, a long list) it can be scrolled to: not cut off.
    if (clipped) for (let a = el.parentElement; a && a !== stage; a = a.parentElement) if (/(auto|scroll)/.test(getComputedStyle(a).overflowY + getComputedStyle(a).overflowX)) clipped = false;
    if (clipped) cut.push(`${name(el)} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 16)}" [${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}]`);
  }
  const offScreen = box.left < -1 || box.top < -1 || box.right > innerWidth + 1 || box.bottom > innerHeight + 1;
  return {
    shown: true,
    mode: stage.dataset.place || ['float', 'stage', 'below', 'full'].find((m) => stage.classList.contains(m)) || '?',
    youtube: !!theater?.classList.contains('yt-rail') || !!document.querySelector('#theater iframe[src*="youtube"]'),
    box: [box.left, box.top, box.width, box.height].map(Math.round),
    player: p ? [p.left, p.top, p.width, p.height].map(Math.round) : null,
    overPlayer: overlaps(box, p),
    offScreen,
    cut: cut.slice(0, 6),
  };
}

/** A small fingerprint of what a person sees: the window, its placement, open dialogs and menus, the game's content. */
function seen() {
  const stage = document.getElementById('game-stage');
  const r = stage?.getBoundingClientRect();
  const open = [...document.querySelectorAll('.dialog-backdrop:not([hidden]), dialog[open], [role="menu"]:not([hidden]), [role="dialog"]:not([hidden]), .game-hub:not([hidden]), .hub:not([hidden])')].filter((d) => d.getBoundingClientRect().width > 0).length;
  return JSON.stringify({
    shown: !!stage && !stage.hidden && (r?.width ?? 0) > 2,
    cls: stage?.className ?? '',
    place: stage?.dataset.place ?? '',
    rect: r ? [r.left, r.top, r.width, r.height].map(Math.round) : null,
    open,
    body: stage?.querySelector('.game-stage-body')?.innerHTML.length ?? 0,
    // How many of the window's parts are on screen (an overlay such as "How to play" only flips a `hidden`).
    parts: stage ? [...stage.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().width > 0).length : 0,
    pressed: [...(stage?.querySelectorAll('.game-stage-head [aria-pressed], .game-stage-head [aria-expanded]') ?? [])].map((b) => b.getAttribute('aria-pressed') ?? b.getAttribute('aria-expanded')).join(),
    pill: !!document.querySelector('.game-pill:not([hidden]), .game-min:not([hidden]), .game-mini:not([hidden])'),
  });
}

async function newPage(browser, size) {
  const ctx = await browser.newContext({ ...SIZES[size] });
  await viaYouTube(ctx);
  await ctx.addInitScript(() => {
    for (const [k, v] of Object.entries({ lang: 'en', name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', extUpdateSeen: '9', 'snackBar:howSeen': '1', 'windowGarden:howSeen': '1', 'fiveFrames:howSeen': '1', 'classics:chess:howSeen': '1' })) localStorage.setItem(k, v);
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => check(false, `${size}: no page error`, e.message.slice(0, 160)));
  await page.goto(`${SITE}/r/sm${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
  await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#media-input'), null, { timeout: 25000 });
  // The lab's own drawer and 🐞 stay out of the way (they are not what a person sees).
  await page.addStyleTag({ content: '#debug-panel-root { display: none !important; }' });
  await wait(1200);
  return { ctx, page };
}
const lab = (page, id) => page.evaluate((id) => window.__swmLab.run(id).then((l) => l.dir, (e) => String(e)), id);
async function openGame(page, kind) {
  const dir = await lab(page, `games.open.${kind}`);
  if (dir !== 'lab') return false;
  await page.waitForFunction(() => {
    const b = document.querySelector('#game-stage .game-stage-body');
    return b && !b.querySelector('.game-stage-loading, .mt-loading') && b.childElementCount > 0;
  }, null, { timeout: 12000 }).catch(() => {});
  await wait(700);
  return true;
}
async function setVideo(page, video) {
  if (video === 'none') return true;
  await page.evaluate((url) => {
    const input = document.querySelector('#media-input');
    input.value = url;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('#media-form button[value="load"]').click();
  }, video === 'youtube' ? YOUTUBE : FILM);
  const ok = await until(() => page.evaluate((yt) => (yt ? !!document.getElementById('theater')?.classList.contains('yt-rail') : !!document.querySelector('#theater video')?.readyState), video === 'youtube'), 15000);
  await wait(800);
  return !!ok;
}
/** The placements this game offers here: the switch's enabled buttons, or the one it is in. */
const placesOf = (page) =>
  page.evaluate(() => {
    const sw = document.querySelector('#game-stage .game-place');
    if (!sw || sw.hidden || sw.getBoundingClientRect().width === 0) return [];
    return [...sw.querySelectorAll('.game-place-btn')].filter((b) => !b.disabled && b.getBoundingClientRect().width > 0).map((b) => [...b.classList].find((c) => c.startsWith('place-')).slice(6));
  });

/** One state of the matrix: a room with this video and side panel, every game in every placement it offers. */
async function runState(browser, kinds, size, video, side) {
  // `closed` = cinema mode (card 14): the room's only way to hide the side panel.
  const where = `${size} · ${video} · ${side === 'closed' ? 'cinema mode' : 'side panel open'}`;
  const { ctx, page } = await newPage(browser, size);
  try {
    if (!(await setVideo(page, video))) {
      check(false, `${where}: the room plays the ${video === 'youtube' ? 'YouTube video' : 'video file'}`);
      return;
    }
    if (side === 'closed') {
      await page.evaluate(() => document.getElementById('side-toggle')?.click());
      await wait(600);
      const hidden = await page.evaluate(() => document.querySelector('.room')?.classList.contains('side-hidden'));
      if (!hidden) {
        // An upright tablet keeps its columns: there is no closed side panel to test.
        console.log(`skip ${where}: no side panel to close at this size`);
        return;
      }
    }
    for (const kind of kinds) {
      if (!(await openGame(page, kind))) {
        check(false, `${where} ${kind}: opens`);
        continue;
      }
      const places = await placesOf(page);
      for (const place of places.length ? places : [null]) {
        if (place) {
          await page.evaluate((p) => document.querySelector(`#game-stage .game-place-btn.place-${p}`)?.click(), place);
          await wait(600);
        }
        const m = await page.evaluate(measure);
        const label = `${where} ${kind} ${m.mode}`;
        if (!m.shown) {
          check(false, `${label}: the game window shows`);
          continue;
        }
        check(!m.offScreen && m.cut.length === 0, `${label}: nothing cut off`, m.offScreen ? { box: m.box } : m.cut);
        if (m.youtube) check(!m.overPlayer, `${label}: nothing over the YouTube player`, { game: m.box, player: m.player });
        else if (video === 'file' && m.mode === 'float' && m.overPlayer) {
          // Allowed on purpose: beside the video (side panel open) a side game keeps its minSize in the right column and
          // may cover the theater card's padding (≤ 48 px), never the picture (0.9.97.121). QA2 (owner's rule, Planner
          // 11 Nov 2026): no other exception: tablets line up with the side panel, a side game leaves cinema mode.
          const over = m.box[0] < m.player[0] + m.player[2] ? m.player[0] + m.player[2] - m.box[0] : 0;
          const known = side === 'open' && over <= 48;
          if (known) console.log(`note ${label}: over the video by ${over} px (known, see the comment)`);
          else check(false, `${label}: the free window leaves the video uncovered (not dragged)`, { game: m.box, video: m.player, over });
        }
      }
    }
  } finally {
    await ctx.close();
  }
}

/** Once per screen size, no video: every head button does something visible; on a computer, the real mouse. */
async function runHead(browser, kinds, size) {
  const { ctx, page } = await newPage(browser, size);
  const computer = !size.startsWith('tablet');
  try {
    for (const kind of kinds) {
      if (!(await openGame(page, kind))) continue;
      const count = await page.evaluate(() => [...document.querySelectorAll('#game-stage .game-stage-head button')].filter((b) => b.getBoundingClientRect().width > 0 && !b.disabled).length);
      for (let i = 0; i < count; i++) {
        if (!(await page.evaluate(seen).then((s) => JSON.parse(s).shown))) await openGame(page, kind);
        // A game's "How to play" shows by itself the first time: put it away first, so its own button has something to do.
        await page.evaluate(() => {
          const skip = document.querySelector('#game-stage .htp-skip');
          if (skip && skip.getBoundingClientRect().width > 0) skip.click();
        });
        await wait(300);
        const info = await page.evaluate((i) => {
          const b = [...document.querySelectorAll('#game-stage .game-stage-head button')].filter((x) => x.getBoundingClientRect().width > 0 && !x.disabled)[i];
          if (!b) return null;
          // The placement already in use: pressing it is meant to change nothing.
          if (b.matches('.game-place-btn.on, .game-place-btn[aria-pressed="true"]')) return { skip: true };
          const r = b.getBoundingClientRect();
          return { label: (b.getAttribute('aria-label') || b.title || b.textContent || b.className).trim().slice(0, 30), x: r.left + r.width / 2, y: r.top + r.height / 2, cls: b.className };
        }, i);
        if (!info || info.skip) continue;
        const before = await page.evaluate(seen);
        // A real click at the button's middle (what is on top there gets it, as for a person).
        await page.mouse.click(info.x, info.y);
        // Up to 1.5 s for a change (a window that animates in, a lazy chunk).
        let after = before;
        for (let t = 0; t < 15 && after === before; t++) {
          await wait(100);
          after = await page.evaluate(seen);
        }
        // DEBUG=<file.png>: the screen when a head button changed nothing.
        if (process.env.DEBUG && before === after) await page.screenshot({ path: process.env.DEBUG });
        check(before !== after, `${size} ${kind}: the head's "${info.label}" does something visible`, { cls: info.cls });
        // Put things back: close a dialog or menu (Cancel / Esc), bring the game back if the button closed or tucked it.
        await page.evaluate(() => {
          const cancel = document.querySelector('.dialog-backdrop:not([hidden]) .confirm-dialog .btn:not(.primary), .dialog-backdrop:not([hidden]) [data-cancel]');
          if (cancel) cancel.click();
        });
        await page.keyboard.press('Escape');
        await wait(300);
        if (!(await page.evaluate(seen).then((s) => JSON.parse(s).shown))) await openGame(page, kind);
      }
      // The real mouse on the free window (a computer; the side games open free when there is room beside the video).
      if (!computer) continue;
      if (!(await page.evaluate(() => document.getElementById('game-stage')?.dataset.place === 'float'))) continue;
      // Wait for the window to stop moving (it may still be gliding into place after opening or after the last button).
      const settled = async () => {
        let last = (await page.evaluate(measure)).box.join();
        for (let i = 0; i < 20; i++) {
          await wait(150);
          const now = await page.evaluate(measure);
          if (now.box.join() === last) return now;
          last = now.box.join();
        }
        return page.evaluate(measure);
      };
      const homeBox = (await settled()).box;
      const head = await page.evaluate(() => {
        const s = document.getElementById('game-stage').getBoundingClientRect();
        const h = document.querySelector('#game-stage .game-stage-head').getBoundingClientRect();
        const g = document.querySelector('#game-stage .game-resize')?.getBoundingClientRect();
        return { s: [s.left, s.top, s.width, s.height], hx: h.left + 30, hy: h.top + h.height / 2, gx: g ? g.left + g.width / 2 : null, gy: g ? g.top + g.height / 2 : null };
      });
      // Hover: a head button lights up under the mouse (read away from it first, then over it after its transition).
      await page.mouse.move(2, 2);
      await wait(400);
      const hover = await page.evaluate(() => {
        const b = document.querySelector('#game-stage .game-hub-open') ?? [...document.querySelectorAll('#game-stage .game-stage-head button')].find((x) => x.getBoundingClientRect().width > 0);
        const r = b.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, bg: ['backgroundColor', 'color', 'opacity', 'borderTopColor', 'boxShadow', 'transform', 'filter'].map((k) => getComputedStyle(b)[k]).join('|') };
      });
      await page.mouse.move(hover.x, hover.y, { steps: 4 });
      await wait(450);
      const hovered = await page.evaluate(({ x, y }) => {
        const b = document.elementFromPoint(x, y)?.closest('button');
        return b ? ['backgroundColor', 'color', 'opacity', 'borderTopColor', 'boxShadow', 'transform', 'filter'].map((k) => getComputedStyle(b)[k]).join('|') : '';
      }, hover);
      // Hover needs a real window (headless Chromium has no real hover).
      if (HEADFUL) check(hovered && hovered !== hover.bg, `${size} ${kind}: a head button lights up under the mouse`);
      // Drag by the head: the window follows the mouse and stays whole on screen.
      await page.mouse.move(head.hx, head.hy, { steps: 3 });
      await page.mouse.down();
      await page.mouse.move(head.hx - 160, head.hy + 60, { steps: 10 });
      await page.mouse.up();
      const moved = await settled();
      check(Math.abs(moved.box[0] - (head.s[0] - 160)) < 40 || Math.abs(moved.box[1] - (head.s[1] + 60)) < 40, `${size} ${kind}: dragging the head moves the free window`, { from: head.s.map(Math.round), to: moved.box });
      check(!moved.offScreen && moved.cut.length === 0, `${size} ${kind}: after a drag nothing is cut off`, moved.cut);
      // Resize from the corner: bigger, else smaller (a window at its largest or smallest here can only go one way), in
      // proportion, still on screen.
      if (head.gx !== null) {
        let grown = moved;
        for (const [dx, dy] of [[80, 60], [-80, -60]]) {
          const g = await page.evaluate(() => {
            const r = document.querySelector('#game-stage .game-resize').getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          });
          await page.mouse.move(g.x, g.y, { steps: 3 });
          await page.mouse.down();
          await page.mouse.move(g.x + dx, g.y + dy, { steps: 10 });
          await page.mouse.up();
          grown = await settled();
          if (grown.box[2] !== moved.box[2]) break;
        }
        const ratio = (b) => b[2] / b[3];
        if (grown.box[2] === moved.box[2]) console.log(`note ${size} ${kind}: the window is at its only size here (${moved.box[2]}×${moved.box[3]}), the corner can't change it`);
        else check(Math.abs(ratio(grown.box) - ratio(moved.box)) / ratio(moved.box) < 0.04, `${size} ${kind}: the corner resizes it in proportion`, { before: moved.box, after: grown.box });
        check(!grown.offScreen && grown.cut.length === 0, `${size} ${kind}: after a resize nothing is cut off`, grown.cut);
      }
      // A double click on the head puts it back home (beside the video, not over it).
      const title = await page.evaluate(() => {
        const r = document.querySelector('#game-stage .game-stage-title').getBoundingClientRect();
        return { x: r.left + Math.min(30, r.width / 2), y: r.top + r.height / 2 };
      });
      await page.mouse.dblclick(title.x, title.y);
      const home = await settled();
      // Home is where it opened (its size and spot before I moved it).
      const atHome = home.box.every((v, i) => Math.abs(v - homeBox[i]) <= 4);
      check(atHome, `${size} ${kind}: a double click on the head puts it back where it opened`, { now: home.box, opened: homeBox });
    }
  } finally {
    await ctx.close();
  }
}

(async () => {
  const browser = await chromium.launch({ headless: !HEADFUL });
  // The games the lab can open (no list kept by hand).
  const probe = await newPage(browser, '1366');
  // The games register their lab commands a moment after the room starts.
  await probe.page.waitForFunction(() => window.__swmLab.list().filter((c) => c.id.startsWith('games.open.')).length > 3, null, { timeout: 20000 });
  await wait(1000);
  const kinds = pick('GAMES', await probe.page.evaluate(() => window.__swmLab.list().map((c) => c.id).filter((id) => id.startsWith('games.open.')).map((id) => id.slice(11))));
  await probe.ctx.close();
  console.log(`games: ${kinds.join(', ')} · sizes: ${sizes.join(', ')} · videos: ${videos.join(', ')} · side: ${sides.join(', ')}${HEADFUL ? ' · headful' : ''}`);
  const jobs = [];
  for (const size of sizes) {
    jobs.push(() => runHead(browser, kinds, size));
    for (const video of videos) for (const side of sides) jobs.push(() => runState(browser, kinds, size, video, side));
  }
  let next = 0;
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    while (next < jobs.length) await jobs[next++]().catch((e) => check(false, 'a state ran to its end', String(e.message ?? e).split('\n')[0]));
  }));
  await browser.close();
  if (problems.length) console.log(`\nProblems:\n  ${problems.join('\n  ')}`);
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Every game in every state: whole, clear of the video, its head buttons work');
  process.exit(fails ? 1 : 0);
})();
