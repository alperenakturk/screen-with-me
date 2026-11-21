// Card SH3: in the Shorts view on a computer (and a tablet held sideways) 💬 opens the room's chat as a panel right of
// the video: it never covers the video, the rail or the seats; the page doesn't scroll; messages from a friend count
// on 💬 while it is closed; you read and send in it; the choice is kept per room over a reload; "↩ Room view" puts
// the chat back in the side panel. Test Lab `shorts.chat` reports it.
//
//   npm run dev, then: NODE_PATH=$(npm root -g) node scripts/harness/shorts-chat/run.cjs [site]
const { fakeYouTube } = require('../fake-youtube.cjs');
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:5173';
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};

async function join(ctx, room, name, lab = false) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    try {
      localStorage.setItem('tipsSeen', '1');
    } catch {}
  });
  await page.goto(`${SITE}/r/${room}${lab ? '?debug=1' : ''}`);
  await page.fill('#name', name);
  await page.click('#name-form button.primary');
  await page.waitForSelector('#chat-input', { state: 'attached' });
  return { page, errors };
}

const box = (page, sel) =>
  page.evaluate((s) => {
    const r = document.querySelector(s)?.getBoundingClientRect();
    return r ? { x: Math.round(r.x), y: Math.round(r.y), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height) } : null;
  }, sel);
const apart = (a, b) => !a || !b || !a.w || !b.w || a.r <= b.x || b.r <= a.x || a.b <= b.y || b.b <= a.y;
const say = async (page, text) => {
  await page.fill('#chat-input', text);
  await page.press('#chat-input', 'Enter');
};

(async () => {
  const browser = await chromium.launch();
  const sizes = [
    ['laptop 1366×768', { viewport: { width: 1366, height: 768 } }],
    ['monitor 1920×1080', { viewport: { width: 1920, height: 1080 } }],
    ['tablet sideways', { ...devices['iPad Pro 11 landscape'] }],
  ];
  for (const [name, options] of sizes) {
    const room = `shchat${Math.random().toString(36).slice(2, 7)}`;
    const ctx = await browser.newContext(options);
    await fakeYouTube(ctx);
    const friendCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const alex = await join(ctx, room, 'Alex', true);
    const sam = await join(friendCtx, room, 'Sam');
    const page = alex.page;
    if (!(await page.isVisible('#media-input'))) await page.click('#add-toggle').catch(() => {});
    await page.fill('#media-input', 'https://www.youtube.com/shorts/aqz-KE-bpKQ');
    await page.click('#media-form button[value=load]');
    await page.waitForFunction(() => document.documentElement.classList.contains('shorts-view'));
    // The friend writes from the room view (their own chat box).
    await sam.page.waitForFunction(() => document.documentElement.classList.contains('shorts-view'));
    await sam.page.click('#shorts-exit');
    await page.waitForTimeout(600);
    check(await page.isVisible('#shorts-chat-btn'), `${name}: 💬 is on the rail`);
    check(await page.isHidden('#shorts-chat-panel'), `${name}: the panel starts closed`);
    // A friend writes while it is closed: 💬 counts.
    await say(sam.page, 'Hello from Sam');
    await say(sam.page, 'Second line');
    await page.waitForFunction(() => document.querySelector('#shorts-chat-badge')?.textContent === '2', null, { timeout: 5000 }).catch(() => {});
    check((await page.textContent('#shorts-chat-badge')) === '2' && (await page.isVisible('#shorts-chat-badge')), `${name}: 💬 counts 2 unread`, await page.textContent('#shorts-chat-badge'));
    const before = await box(page, '.player-wrap');
    await page.click('#shorts-chat-btn');
    await page.waitForTimeout(400);
    const panel = await box(page, '#shorts-chat-panel');
    const video = await box(page, '.player-wrap');
    const rail = await box(page, '#shorts-bar');
    const seats = await box(page, '#seats-r');
    const vw = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight }));
    check(!!panel && panel.w >= 260 && panel.x >= rail.r && panel.r <= vw.w && panel.b <= vw.h, `${name}: the panel opens right of the rail, on screen`, { panel, rail, vw });
    check(apart(panel, video) && apart(panel, rail) && apart(panel, seats), `${name}: it covers neither the video, the rail nor the seats`, { panel, video, seats });
    check(Math.abs(panel.y - video.y) <= 2 && Math.abs(panel.b - video.b) <= 2, `${name}: it is as tall as the video`, { panel, video });
    check(Math.abs(video.h - before.h) <= 2, `${name}: the video keeps its size`, { before, video });
    check(vw.sw <= vw.w && vw.sh <= vw.h, `${name}: the page doesn't scroll`, vw);
    check(await page.isHidden('#shorts-chat-badge'), `${name}: opening clears the count`);
    const lines = await page.$$eval('#shorts-chat-panel .chat-text', (n) => n.map((x) => x.textContent));
    check(lines.includes('Hello from Sam') && lines.includes('Second line'), `${name}: the panel shows the room's chat`, lines);
    check((await page.evaluate(() => document.activeElement?.id)) === 'chat-input', `${name}: the message box has the focus`);
    await say(page, 'Hi Sam');
    const got = await sam.page.waitForFunction(() => [...document.querySelectorAll('.chat-text')].some((n) => n.textContent === 'Hi Sam'), null, { timeout: 5000 }).catch(() => null);
    check(!!got, `${name}: a message sent from the panel reaches the friend`);
    // A long chat scrolls inside the panel: the row never grows (long lines: the server lets 8 come at once).
    const long = (i) => `Line ${i} ${'and a long story about the video we are watching together '.repeat(4)}`.trim();
    for (let i = 0; i < 6; i++) await say(sam.page, long(i));
    await page.waitForFunction((last) => [...document.querySelectorAll('#shorts-chat-panel .chat-text')].some((n) => n.textContent === last), long(5), { timeout: 8000 }).catch(() => {});
    const tall = await box(page, '#shorts-chat-panel');
    const list = await page.evaluate(() => {
      const l = document.querySelector('#shorts-chat-panel #chat-list');
      return { scroll: l.scrollHeight > l.clientHeight, atEnd: l.scrollHeight - l.scrollTop - l.clientHeight < 60 };
    });
    check(Math.abs(tall.b - video.b) <= 2 && list.scroll && list.atEnd, `${name}: a long chat scrolls inside the panel, at its end`, { tall, list });
    check(await page.isHidden('#shorts-chat-badge'), `${name}: no count while the panel is open`);
    check((await page.$$eval('.seat-bubble', (n) => n.filter((b) => b.getClientRects().length).length)) === 0, `${name}: no seat bubbles while the panel shows the chat`);
    const lab = JSON.parse((await page.evaluate(async () => (await window.__swmLab.run('shorts.chat')).text)).replace(/^\S+\s/, ''));
    check(lab.open === true && lab.shown === true && lab.overPlayer === false && lab.unread === 0, `${name}: Test Lab shorts.chat`, lab);
    // Kept over a reload.
    await page.reload();
    await page.waitForFunction(() => document.documentElement.classList.contains('shorts-view'), null, { timeout: 15000 });
    await page.waitForTimeout(600);
    check(await page.isVisible('#shorts-chat-panel'), `${name}: a reload keeps the panel open`);
    // ✕ closes it and puts the chat back.
    await page.click('#shorts-chat-close');
    await page.waitForTimeout(300);
    check(await page.isHidden('#shorts-chat-panel'), `${name}: ✕ closes it`);
    check(await page.evaluate(() => !!document.querySelector('.side [data-panel="chat"] #chat-list')), `${name}: closed, the chat is back in the side panel`);
    // Enter opens it again; "↩ Room view" puts the chat back where it was and shows it.
    await page.mouse.click(5, 300);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    check(await page.isVisible('#shorts-chat-panel'), `${name}: Enter opens the panel`);
    await page.click('#shorts-exit');
    await page.waitForFunction(() => !document.documentElement.classList.contains('shorts-view'));
    await page.waitForTimeout(500);
    check(await page.evaluate(() => !!document.querySelector('.side [data-panel="chat"] #chat-list')) && (await page.isVisible('#chat-list')), `${name}: in the room view the chat is in the side panel again`);
    check(alex.errors.length === 0 && sam.errors.length === 0, `${name}: no page errors`, [...alex.errors, ...sam.errors]);
    await ctx.close();
    await friendCtx.close();
  }
  await browser.close();
  console.log(failed ? `\n${failed} FAILED` : '\nall ok');
  process.exit(failed ? 1 : 0);
})();
