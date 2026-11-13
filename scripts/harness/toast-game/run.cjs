// Chat messages and an open game window on a computer (1366 × 768), with a real side game (Snack Bar):
// - GS QA1 finding 3 (.132): messages shown over the video never sit over the game window;
// - B2 on .132 (.133): opening a side game leaves cinema mode and its free window lines up over the side panel's chat,
//   so a new message would show nowhere. While the window covers the chat, messages come as toasts, clear of it;
// - once the window is put away (✕) the chat is in view again and no toast shows.
// Needs the built site on wrangler dev with the Test Lab (`?debug=1`) and a video file:
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/toast-game/run.cjs [http://localhost:8787] [http://localhost:5300/video.webm] [shot-dir]
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
/** Optional folder for a screenshot of the toast beside Snack Bar (first look). */
const SHOT = process.argv[4];
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const room = `tg${Math.random().toString(36).slice(2, 8)}`;
  const enter = async (name) => {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await ctx.addInitScript(() => {
      for (const [k, v] of Object.entries({ tipsSeen: '1', lang: 'en', 'opt:autoInvite': '0', 'snackBar:howSeen': '1' })) localStorage.setItem(k, v);
    });
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/${room}?debug=1`);
    await page.fill('#name', name);
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await page.waitForTimeout(800);
    return page;
  };
  const alex = await enter('Alex');
  await alex.fill('#media-input', VIDEO);
  await alex.keyboard.press('Enter');
  await alex.waitForTimeout(2500);
  const sam = await enter('Sam');
  await alex.waitForFunction(() => !!window.__swmLab, null, { timeout: 15000 });
  // Alex goes to cinema mode (T): messages then show over / under the video instead of in the side panel.
  await alex.evaluate(() => document.activeElement?.blur());
  await alex.mouse.move(683, 300);
  await alex.keyboard.press('t');
  await alex.waitForTimeout(600);

  /** Sam writes; Alex's toast for it (null when none shows within `ms`) and the game window's box. */
  const say = async (text, ms = 6000) => {
    await sam.fill('#chat-input', text);
    await sam.press('#chat-input', 'Enter');
    await alex.waitForFunction((t) => [...document.querySelectorAll('.toasts .toast')].some((n) => n.textContent.includes(t)), text, { timeout: ms }).catch(() => {});
    return alex.evaluate((t) => {
      const box = (e) => {
        if (!e || e.hidden || e.closest('[hidden]')) return null;
        const r = e.getBoundingClientRect();
        return r.width > 0 ? { left: r.left, top: r.top, right: r.right, bottom: r.bottom } : null;
      };
      const node = [...document.querySelectorAll('.toasts .toast')].find((n) => n.textContent.includes(t));
      const shown = !!node && getComputedStyle(node.parentElement).display !== 'none';
      return { toast: shown ? box(node) : null, game: box(document.getElementById('game-stage')), chat: box(document.getElementById('chat-list')) };
    }, text);
  };
  const hit = (a, b) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const onScreen = (r) => !!r && r.left >= 0 && r.right <= 1366 && r.top >= 0 && r.bottom <= 768;

  const plain = await say('first, no game');
  check(!!plain.toast && onScreen(plain.toast), 'cinema mode: a message shows over the video', JSON.stringify(plain.toast));

  // Snack Bar opens: cinema mode ends, its free window sits over the side panel's chat.
  await alex.evaluate(() => window.__swmLab.run('games.open.snack'));
  await alex.waitForFunction(() => {
    const s = document.getElementById('game-stage');
    return !!s && !s.hidden && s.classList.contains('solo-game') && !s.querySelector('.game-stage-loading');
  }, null, { timeout: 12000 });
  await alex.evaluate(() => document.querySelector('#game-stage .htp:not([hidden]) .htp-skip')?.click());
  await wait(800);
  const cinemaLeft = await alex.evaluate(() => !document.querySelector('.room')?.classList.contains('cinema'));
  check(cinemaLeft, 'opening Snack Bar leaves cinema mode');
  const open = await say('hello while I play');
  if (SHOT) await wait(700);
  if (SHOT) await alex.screenshot({ path: `${SHOT}/toast-beside-snack-bar.png` });
  check(hit(open.game, open.chat), 'the side game window covers the chat (the case this fixes)', JSON.stringify({ game: open.game, chat: open.chat }));
  check(!!open.toast && onScreen(open.toast) && !hit(open.toast, open.game), 'a new message shows as a toast, clear of the game window and on screen', JSON.stringify(open));

  // ✕ puts the window away: the chat is in view, no toast.
  await alex.click('#game-stage .game-minimize');
  await wait(600);
  const back = await say('game put away', 2500);
  check(!back.game && !back.toast, 'with the window put away the message is only in the chat (no toast)', JSON.stringify(back));

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Messages show and keep clear of the game window');
  process.exit(fails ? 1 : 0);
})();
