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

/**
 * Card GT (A's G98) + QA2: a game's free window on a tablet never covers the video; upright it opens clear of the chat
 * (the column beside it), as big as that space allows; sideways it lines up with the side panel with the message box
 * free; always whole on screen, readable, and the page never scrolls.
 */
/** The windows' own widths (catalog `size`): a window may stop growing there. */
const OWN_WIDTH = { snack: 400, garden: 400 };
// 0.9.97.112 (owner): the tables always play in the video's place; the free window is the side games' (checked here).
async function gameChecks(page, where, chatSel) {
  await page.evaluate(() => {
    for (const k of ['snackBar:howSeen', 'windowGarden:howSeen']) localStorage.setItem(k, '1');
  });
  for (const kind of ['snack', 'garden']) {
    // The hall: from the open game window's 🎮, else the rail's (which first brings back a minimized game).
    await page.evaluate(() => (document.querySelector('#game-stage:not([hidden]) .game-hub-open') ?? document.querySelector('#dock-game'))?.click());
    await page.waitForSelector('#game-menu:not([hidden])');
    await page.waitForTimeout(400);
    await page.evaluate(() => document.querySelector('#game-menu [data-tab="side"]')?.click());
    await page.waitForTimeout(300);
    await page.evaluate((k) => document.querySelector(`#game-menu [data-solo="${k}"]`)?.click(), kind);
    await page.waitForSelector('#game-stage:not([hidden])', { timeout: 5000 }).catch(() => {});
    // Each check is of a window at its home: a double click on the head forgets a spot an earlier round's drag left (W5).
    await page.evaluate(() => document.querySelector('#game-stage .game-stage-title')?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })));
    await page.waitForTimeout(1200);
    const g = await page.evaluate((sel) => {
      const box = (e) => {
        const b = e?.getBoundingClientRect();
        return b && { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), w: Math.round(b.width), h: Math.round(b.height) };
      };
      const s = document.querySelector('#game-stage');
      const fit = Number(getComputedStyle(s).getPropertyValue('--fit')) || 1;
      // Drawings (svg, aria-hidden art such as Snack Bar's sign) are pictures, not text: the same rule as games-sweep.
      const texts = [...s.querySelectorAll('.game-stage-body *')].filter((e) => !e.closest('[aria-hidden="true"], svg') && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getBoundingClientRect().width > 0);
      const px = texts.map((e) => parseFloat(getComputedStyle(e).fontSize) * fit);
      return { float: s.classList.contains('float'), stage: box(s), chat: box(document.querySelector(sel)), form: box(document.getElementById('chat-form')), video: box(document.querySelector('.player-wrap')), bar: Math.round(document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 0), vw: innerWidth, vh: innerHeight, sh: document.documentElement.scrollHeight, minText: px.length ? Math.round(Math.min(...px) * 10) / 10 : 0,
        // What the game's column is made of (heights in its own pixels), shown when its text gets too small.
        fit, blocks: [...(s.querySelector('.game-stage-body .sb, .game-stage-body .wg, .game-stage-body .ff')?.children ?? [])].filter((e) => e.offsetHeight).map((e) => `${e.className.split(' ')[0]} ${e.offsetHeight}`).join(', ') };
    }, chatSel);
    await page.screenshot({ path: `${OUT}/${where.replace(/ /g, '-')}-${kind}.png` });
    const s = g.stage;
    const c = g.chat;
    const clear = (o) => !o || s.r <= o.l + 1 || s.l >= o.r - 1 || s.b <= o.t + 1 || s.t >= o.b - 1;
    const sideways = where.includes('sideways');
    check(g.float, `${where}, ${kind}: the game opens in its small window`, g.float);
    // QA2 (Planner, 11 Nov 2026: never over the video): upright the window takes the column beside the chat; sideways it
    // lines up with the side panel like a computer's (over it, down to the message box, which stays free).
    check(clear(g.video), `${where}, ${kind}: the window never covers the video`, { stage: s, video: g.video });
    if (sideways) check(clear(g.form) && Math.abs(s.r - c.r) <= 2 && Math.abs(s.t - c.t) <= 2, `${where}, ${kind}: the window lines up with the side panel and leaves the message box free`, { stage: s, panel: c, form: g.form });
    else check(clear(c), `${where}, ${kind}: the window never covers the chat`, { stage: s, chat: c });
    check(s.t >= g.bar - 1, `${where}, ${kind}: the window leaves the top bar free`, { stage: s, bar: g.bar });
    check(s.l >= 0 && s.t >= 0 && s.r <= g.vw && s.b <= g.vh, `${where}, ${kind}: the window is whole on screen`, { stage: s, vw: g.vw, vh: g.vh });
    // Sized to the space: it touches the free strip's limit on one side (it can't grow without covering the chat or leaving the screen).
    const room = !c ? null : [
      { w: g.vw, h: c.t - g.bar }, { w: g.vw, h: g.vh - c.b }, { w: c.l, h: g.vh - g.bar }, { w: g.vw - c.r, h: g.vh - g.bar },
    ].filter((b) => s.w <= b.w && s.h <= b.h).map((b) => Math.min(b.w - s.w, b.h - s.h));
    if (!sideways) check((room && room.length && Math.min(...room) <= 20) || s.w >= OWN_WIDTH[kind] - 2, `${where}, ${kind}: the window is as big as the space beside the chat allows`, { stage: s, chat: c, spare: room });
    check(g.minText >= 11, `${where}, ${kind}: its text stays readable (≥ 11 px)`, g.minText >= 11 ? g.minText : { minText: g.minText, fit: g.fit, blocks: g.blocks });
    check(g.sh <= g.vh + 1, `${where}, ${kind}: the page never scrolls`, { sh: g.sh, vh: g.vh });
    if (kind === 'snack') {
      // G98 (lane A): the window moves by its head and stays on screen; card GT: and it still keeps off the chat.
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
        const r = document.querySelector('#game-stage').getBoundingClientRect();
        return { l: Math.round(r.left), t: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), vw: innerWidth, vh: innerHeight };
      });
      const clear = !c || moved.r <= c.l + 1 || moved.l >= c.r - 1 || moved.b <= c.t + 1 || moved.t >= c.b - 1;
      check(head && (moved.l !== s.l || moved.t !== s.t) && moved.r <= moved.vw && moved.b <= moved.vh && clear, `${where}, ${kind}: the window moves by its head, stays on screen and off the chat`, { before: s, moved, chat: c });
    }
  }
  // A table plays in the video's place, whole on screen, clear of the chat.
  await page.evaluate(() => (document.querySelector('#game-stage:not([hidden]) .game-hub-open') ?? document.querySelector('#dock-game'))?.click());
  await page.waitForSelector('#game-menu:not([hidden])');
  await page.waitForTimeout(400);
  await page.evaluate(() => document.querySelector('#game-menu [data-tab="together"]')?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('#game-menu [data-kind="sea"]')?.click());
  await page.waitForSelector('#game-stage:not([hidden])', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const t = await page.evaluate((sel) => {
    const s = document.querySelector('#game-stage');
    const r = s.getBoundingClientRect();
    const c = document.querySelector(sel)?.getBoundingClientRect();
    const apart = !c || r.right <= c.left + 1 || r.left >= c.right - 1 || r.bottom <= c.top + 1 || r.top >= c.bottom - 1;
    return { place: s.dataset.place, inVideo: !!s.parentElement?.classList.contains('player-wrap'), apart, onScreen: r.left >= -1 && r.top >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 };
  }, chatSel);
  check((t.place === 'stage' ? t.inVideo : t.place === 'float') && t.apart && t.onScreen, `${where}, sea: a table opens clear of the chat, whole on screen (${t.place})`, t);
  await page.evaluate(() => document.querySelector('#game-stage .game-end')?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('.dialog-backdrop:not([hidden]) .btn.primary')?.click());
  await page.waitForTimeout(600);
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
      // The 🐞 Test Lab is on in this tab (card MB checks its drawer on an upright tablet).
      sessionStorage.setItem('swm:debug', '1');
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

    // Card MB: the Test Lab is a bottom sheet on an upright tablet, the video and its rail stay in view above it.
    await page.waitForSelector('.debug-fab', { timeout: 8000 });
    await page.evaluate(() => document.querySelector('.debug-fab').click());
    await page.waitForSelector('.lab-drawer:not([hidden])', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);
    const lab = await page.evaluate(() => {
      const r = (q) => { const e = document.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height }; };
      return { drawer: r('.lab-drawer'), dock: r('#fs-dock'), wrap: r('.player-wrap'), vw: innerWidth, vh: innerHeight, sh: document.documentElement.scrollHeight, pad: getComputedStyle(document.body).paddingRight };
    });
    check(lab.drawer && Math.abs(lab.drawer.b - lab.vh) <= 1 && lab.drawer.w >= lab.vw - 1 && lab.drawer.t >= lab.vh * 0.45, `${label}: the Test Lab is a bottom sheet`, lab.drawer);
    check(lab.pad === '0px' && lab.wrap && lab.dock && lab.wrap.b <= lab.drawer.t + 1 && lab.dock.b <= lab.drawer.t + 1, `${label}: the video and its rail stay in view above the Test Lab`, lab);
    check(lab.sh <= lab.vh + 1, `${label}: the page never scrolls with the Test Lab open`, { sh: lab.sh, vh: lab.vh });
    await page.evaluate(() => document.querySelector('.debug-fab').click());
    await page.waitForTimeout(300);

    // Card MB: no keyboard shortcuts and no cinema mode on a touch-only tablet (both need a mouse / keyboard).
    await page.evaluate(() => document.querySelector('#room-more')?.click());
    await page.waitForTimeout(300);
    const moreKeys = await page.evaluate(() => [...document.querySelectorAll('.room-more-pop:not([hidden]) [role="menuitem"], .room-more-pop:not([hidden]) button')].some((b) => b.textContent.includes('⌨')));
    await page.keyboard.press('Escape');
    const rail = await page.evaluate(() => {
      const shown = (q) => { const e = document.querySelector(q); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; };
      return { cinema: shown('.dock-more-item:has(#dock-more-side)'), keys: shown('.dock-more-item[data-press="#profile-keys"]') };
    });
    check(!moreKeys, `${label}: ⋯ More has no keyboard shortcuts`);
    check(!rail.cinema && !rail.keys, `${label}: the rail's ⋯ offers no cinema mode or shortcuts`, rail);

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

      await page.setViewportSize({ width: 1180, height: 820 });
      await page.waitForTimeout(1200);
      await gameChecks(page, `${label} sideways`, '.room .side');
      await page.setViewportSize({ width: 820, height: 1180 });
      await page.waitForTimeout(1200);
    }

    await gameChecks(page, `${label} upright`, '.chat-panel');

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
