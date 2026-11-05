// Tablets (card T, owner's pick B on https://claude.ai/artifact/GXitrW7UaKsiWHBtWzk4Mw; notes in
// docs/internal/design/tablet.md). Upright tablets get the room as the video on top (the rail beside it) and two
// columns below: chat, and Together + Queue / People; the page never scrolls. Sideways tablets keep the computer
// layout. Checks on an iPad (820×1180 ↔ 1180×820) and an Android tablet (768×1024), touch, no mouse:
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   (cd <folder with video.webm> && python3 -m http.server 5300)
//   NODE_PATH=$(npm root -g) node scripts/harness/tablet/run.cjs [site] [video] [screenshot folder]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const SITE = process.argv[2] || 'http://localhost:8787';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
const OUT = process.argv[4] || '/tmp/tablet';
fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
const check = (ok, label, extra) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra !== undefined ? ' → ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)) : ''}`);
  if (!ok) fails++;
};

const TABLETS = [
  ['iPad', { ...devices['iPad Pro 11'], viewport: { width: 820, height: 1180 } }],
  ['Android tablet', { ...devices['Galaxy Tab S4'], viewport: { width: 768, height: 1024 } }],
];

const room = () => `tab${Math.random().toString(36).slice(2, 7)}`;

async function join(page, name) {
  await page.waitForSelector('#name');
  await page.fill('#name', name);
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await page.waitForTimeout(1000);
}

async function addVideo(page) {
  await page.evaluate((v) => {
    const i = document.querySelector('#media-input');
    i.value = v;
    i.form.requestSubmit();
  }, VIDEO);
  await page.waitForFunction(() => document.querySelector('.room.has-item'), null, { timeout: 8000 });
  await page.waitForTimeout(1500);
}

/** The room's layout in one look. */
const measure = (page) =>
  page.evaluate(() => {
    const r = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      const st = getComputedStyle(e);
      return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height), shown: b.width > 0 && b.height > 0 && st.visibility !== 'hidden' && Number(st.opacity) > 0.2 };
    };
    const html = document.documentElement;
    const rail = [...document.querySelectorAll('#fs-dock button')].filter((b) => b.getBoundingClientRect().width > 0 && getComputedStyle(b).display !== 'none');
    return {
      classes: html.className,
      sh: html.scrollHeight,
      sw: html.scrollWidth,
      vh: innerHeight,
      vw: innerWidth,
      player: r('#player'),
      wrap: r('.player-wrap'),
      dock: r('#fs-dock'),
      chat: r('.chat-panel'),
      chatInput: r('#chat-input'),
      together: r('#together'),
      tabsNav: r('.tabs'),
      queue: r('[data-panel="queue"]'),
      people: r('[data-panel="people"]'),
      chatTab: r('[data-tab="chat"]'),
      railMin: rail.length ? Math.min(...rail.map((b) => Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height))) : 0,
      dockOpacity: getComputedStyle(document.querySelector('#fs-dock')).opacity,
    };
  });

function uprightChecks(where, m) {
  check(m.classes.includes('tablet-up') && !m.classes.includes('phone'), `${where}: upright tablet layout (not the phone's)`, m.classes);
  check(m.sh <= m.vh + 1 && m.sw <= m.vw, `${where}: the page never scrolls`, { sh: m.sh, vh: m.vh, sw: m.sw });
  check(m.dock?.shown && Number(m.dockOpacity) >= 0.99, `${where}: the rail is on screen`, m.dockOpacity);
  check(m.dock && m.player && m.dock.l >= m.player.r - 1, `${where}: the rail sits beside the video, never over it`, { dock: m.dock?.l, player: m.player?.r });
  check(m.railMin >= 44, `${where}: rail buttons are ≥ 44 px`, m.railMin);
  check(m.chat?.shown && m.together?.shown && m.chat.r <= m.together.l + 1 && m.chat.t >= m.wrap.b, `${where}: two columns under the video (chat left, Together right)`, { chat: m.chat, together: m.together });
  check(m.chat && m.together && m.chat.w > m.together.w, `${where}: the chat column is the wider one`, { chat: m.chat?.w, together: m.together?.w });
  check(m.chatInput?.shown && m.chatInput.b <= m.vh, `${where}: the message box is on screen`, m.chatInput);
  check(m.queue?.shown && m.queue.l >= m.together.l - 1 && m.queue.t >= m.together.b, `${where}: the queue sits under Together`, m.queue);
  check(!m.chatTab?.shown, `${where}: no Chat tab (the chat has its own column)`);
  check(m.wrap && m.wrap.h <= m.vh * 0.55, `${where}: the video leaves ≥ 45 % of the height below it`, { h: m.wrap?.h, vh: m.vh });
}

(async () => {
  // The "keeps playing" checks need a real video: without the local server they used to fail as "paused at 0 s",
  // which reads like a bug in the room (BH, 4 Nov 2026). Say what is missing instead.
  const reachable = await fetch(VIDEO, { method: 'HEAD' }).then((r) => r.ok, () => false);
  if (!reachable) {
    console.log(`✗ No video at ${VIDEO}: start one first, e.g. (cd <folder with video.webm> && python3 -m http.server 5300)`);
    process.exit(2);
  }
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [label, opts] of TABLETS) {
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript(() => {
      // Only on our pages (the YouTube frame has no storage).
      if (location.port !== '8787' && !location.hostname.includes('swm-server')) return;
      localStorage.setItem('lang', 'en');
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('opt:autoInvite', '0');
      localStorage.setItem('opt:voiceCheck', 'skip');
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const id = room();
    await page.goto(`${SITE}/r/${id}`);
    await join(page, 'Alex');
    let m = await measure(page);
    await page.screenshot({ path: `${OUT}/${label.replace(/ /g, '-')}-empty.png` });
    uprightChecks(`${label} empty room`, m);

    await addVideo(page);
    m = await measure(page);
    await page.screenshot({ path: `${OUT}/${label.replace(/ /g, '-')}-video.png` });
    uprightChecks(`${label} playing`, m);

    // A tab press shows People in the right column; the chat stays.
    await page.click('[data-tab="people"]');
    await page.waitForTimeout(200);
    m = await measure(page);
    check(m.people?.shown && !m.queue?.shown && m.chat?.shown, `${label}: People in the right column, the chat stays`, { people: m.people?.shown, queue: m.queue?.shown, chat: m.chat?.shown });
    await page.click('[data-tab="queue"]');

    // Someone else's message counts as seen (no chat sound): the chat is always on screen.
    const friend = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
    await friend.addInitScript(() => localStorage.setItem('tipsSeen', '1'));
    await friend.goto(`${SITE}/r/${id}`);
    await join(friend, 'Sam');
    await friend.fill('#chat-input', 'Hello from the sofa');
    await friend.press('#chat-input', 'Enter');
    await page.waitForFunction(() => document.querySelector('#chat-list')?.textContent?.includes('Hello from the sofa'), null, { timeout: 5000 });
    m = await measure(page);
    uprightChecks(`${label} with a friend`, m);
    await friend.context().close();

    if (label === 'iPad') {
      // Turning the iPad: the computer layout, no reload, the video keeps playing.
      const before = await page.evaluate(() => {
        window.__same = true;
        return document.querySelector('#player video')?.currentTime ?? -1;
      });
      await page.setViewportSize({ width: 1180, height: 820 });
      await page.waitForTimeout(1200);
      m = await measure(page);
      const after = await page.evaluate(() => ({ same: window.__same === true, time: document.querySelector('#player video')?.currentTime ?? -1, paused: document.querySelector('#player video')?.paused }));
      await page.screenshot({ path: `${OUT}/iPad-sideways.png` });
      check(!m.classes.includes('tablet-up'), 'iPad sideways: the computer layout', m.classes);
      check(after.same && after.time > before && !after.paused, 'iPad turned: no reload, the video keeps playing', { before, ...after });
      check(m.chatTab?.shown, 'iPad sideways: the Chat tab is back');
      check(m.sh <= m.vh + 1, 'iPad sideways: the page never scrolls', { sh: m.sh, vh: m.vh });
      check(m.dock?.shown && m.dock.l >= m.player.r - 1 && m.railMin >= 44, 'iPad sideways: the rail beside the video, ≥ 44 px buttons', { dock: m.dock, railMin: m.railMin });
      await page.setViewportSize({ width: 820, height: 1180 });
      await page.waitForTimeout(1200);
      m = await measure(page);
      uprightChecks('iPad turned back upright', m);

      // A board game opens in the free mini window (CL2, 0.9.97.59; the Planner's pick A on the gate check G98: one rule
      // everywhere except phones). It fits on screen and moves by its head.
      await page.evaluate(() => document.querySelector('#dock-game')?.click());
      await page.waitForSelector('#game-menu:not([hidden])');
      await page.waitForTimeout(400);
      await page.evaluate(() => document.querySelector('#game-menu [data-kind="classics"]')?.click());
      await page.waitForSelector('#game-stage:not([hidden])', { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(800);
      const game = await page.evaluate(() => {
        const s = document.querySelector('#game-stage');
        const w = document.querySelector('.player-wrap')?.getBoundingClientRect();
        const g = s?.getBoundingClientRect();
        const c = document.querySelector('.chat-panel')?.getBoundingClientRect();
        const over = g && c ? Math.max(0, Math.min(g.right, c.right) - Math.max(g.left, c.left)) * Math.max(0, Math.min(g.bottom, c.bottom) - Math.max(g.top, c.top)) : 0;
        return { float: s?.classList.contains('float'), g: g && { l: Math.round(g.left), r: Math.round(g.right), t: Math.round(g.top), b: Math.round(g.bottom), h: Math.round(g.height) }, w: w && { t: Math.round(w.top), b: Math.round(w.bottom) }, chatCovered: c ? Math.round((100 * over) / (c.width * c.height)) : null, sh: document.documentElement.scrollHeight, vh: innerHeight, vw: innerWidth };
      });
      await page.screenshot({ path: `${OUT}/iPad-xox.png` });
      check(game.float && game.g?.h > 200 && game.g.l >= 0 && game.g.t >= 0 && game.g.r <= game.vw && game.g.b <= game.vh, 'iPad upright: XOX opens in the free window, whole on screen', game);
      console.log(`info iPad upright: the game window covers ${game.chatCovered} % of the chat column`);
      const head = await page.evaluate(() => {
        const r = document.querySelector('#game-stage .game-stage-title')?.getBoundingClientRect();
        return r && { x: r.left + Math.min(40, r.width / 2), y: r.top + r.height / 2 };
      });
      if (head) {
        await page.mouse.move(head.x, head.y);
        await page.mouse.down();
        await page.mouse.move(head.x - 120, head.y + 200, { steps: 6 });
        await page.mouse.up();
        await page.waitForTimeout(200);
      }
      const moved = await page.evaluate(() => {
        const g = document.querySelector('#game-stage').getBoundingClientRect();
        return { l: Math.round(g.left), t: Math.round(g.top), r: Math.round(g.right), b: Math.round(g.bottom), vw: innerWidth, vh: innerHeight };
      });
      check(head && (moved.l !== game.g.l || moved.t !== game.g.t) && moved.r <= moved.vw && moved.b <= moved.vh, 'iPad upright: the game window moves by its head and stays on screen', { before: game.g, moved });
      check(game.sh <= game.vh + 1, 'iPad upright with a game: the page never scrolls', game);
      await page.evaluate(() => document.querySelector('#game-stage .game-minimize')?.click());
      await page.waitForTimeout(300);
      await page.evaluate(() => document.querySelector('.dialog-backdrop:not([hidden]) .btn.primary')?.click());
      await page.waitForTimeout(500);
    }

    // The Shorts bar on one row (upright).
    await page.evaluate(() => {
      const i = document.querySelector('#media-input');
      i.value = 'https://www.youtube.com/shorts/aqz-KE-bpKQ';
      i.form.querySelector('[value="load"]').click();
    });
    await page.waitForFunction(() => document.documentElement.classList.contains('shorts-view'), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const bar = await page.evaluate(() => {
      const b = document.querySelector('#shorts-bar');
      const kids = [...(b?.querySelectorAll(':scope > *') ?? [])].filter((k) => k.getBoundingClientRect().height > 0);
      const mids = kids.map((k) => { const r = k.getBoundingClientRect(); return r.top + r.height / 2; });
      const tops = { size: mids.length && Math.max(...mids) - Math.min(...mids) < 16 ? 1 : 2 };
      return { on: document.documentElement.classList.contains('shorts-view'), rows: tops.size, sh: document.documentElement.scrollHeight, vh: innerHeight };
    });
    await page.screenshot({ path: `${OUT}/${label.replace(/ /g, '-')}-shorts.png` });
    check(bar.on && bar.rows === 1, `${label} Shorts: the bottom bar is one row`, bar);
    check(!errors.length, `${label}: no page errors`, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Tablets: the room fits upright and sideways');
  process.exit(fails ? 1 : 0);
})();
