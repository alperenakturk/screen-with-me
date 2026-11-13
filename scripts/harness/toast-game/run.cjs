// GS QA1 finding 3: on a laptop, chat messages shown over the video (cinema, fullscreen) never sit
// over an open game window (#game-stage as a free window); they move to its left, or below it when there is no room.
// The game window is stood in for by a box with the same id and place (a real table needs the lab server).
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/toast-game/run.cjs [http://localhost:8787] [http://localhost:5300/video.webm]
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};

(async () => {
  const browser = await chromium.launch();
  const room = `tg${Math.random().toString(36).slice(2, 8)}`;
  const enter = async (name) => {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await ctx.addInitScript(() => {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', 'en');
      localStorage.setItem('opt:autoInvite', '0');
    });
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/${room}`);
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
  // Alex goes to cinema mode (T): messages then show over / under the video instead of in the side panel.
  await alex.evaluate(() => document.activeElement?.blur());
  await alex.mouse.move(683, 300);
  await alex.keyboard.press('t');
  await alex.waitForTimeout(600);
  const say = async (text) => {
    await sam.fill('#chat-input', text);
    await sam.press('#chat-input', 'Enter');
    await alex.waitForFunction((t) => [...document.querySelectorAll('.toasts .toast')].some((n) => n.textContent.includes(t)), text, { timeout: 8000 }).catch(() => {});
    return alex.evaluate((t) => {
      const b = [...document.querySelectorAll('.toasts .toast')].find((n) => n.textContent.includes(t))?.getBoundingClientRect();
      return b ? { left: b.left, top: b.top, right: b.right, bottom: b.bottom } : null;
    }, text);
  };
  const plain = await say('first, no game');
  check(!!plain, 'cinema mode: a message shows', JSON.stringify(plain));

  // A game window opens right where that message was (stood in for by a box with the game window's id).
  for (const [label, wide] of [['beside the window', false], ['above or below the window (no room on its left)', true]]) {
    await alex.evaluate(([p, w]) => {
      document.getElementById('game-stage')?.remove();
      const stage = document.createElement('section');
      stage.id = 'game-stage';
      const width = w ? Math.min(innerWidth * 0.66, p.right - 20) : 380;
      Object.assign(stage.style, { position: 'fixed', top: `${Math.max(0, p.top - 40)}px`, left: `${p.right - width + 10}px`, width: `${width}px`, height: '200px', zIndex: 5, background: '#333' });
      document.body.append(stage);
      dispatchEvent(new Event('resize'));
    }, [plain, wide]);
    const t = await say(`hello ${label}`);
    const g = await alex.evaluate(() => {
      const r = document.getElementById('game-stage').getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    });
    const overlap = !!t && t.left < g.right && t.right > g.left && t.top < g.bottom && t.bottom > g.top;
    check(!!t && !overlap && t.left >= 0 && t.right <= 1366 && t.top >= 0 && t.bottom <= 768, `a message never covers the game window: ${label}`, JSON.stringify({ t, g }));
  }

  // Without a game window they go back to their own place.
  await alex.evaluate(() => {
    document.getElementById('game-stage')?.remove();
    dispatchEvent(new Event('resize'));
  });
  const back = await say('no game now');
  check(!!back && Math.abs(back.right - plain.right) < 4, 'without a game window they are back where they were', JSON.stringify({ back, plain }));

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Messages keep clear of the game window');
  process.exit(fails ? 1 : 0);
})();
