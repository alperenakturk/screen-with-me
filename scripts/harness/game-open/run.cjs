// Card GP1 (owner, 15 Nov 2026: "Classics stutters while opening; Snack Bar stutters and its pictures arrive late"):
// how long every game takes from the click on its card in the games hall (the hall already open) to its first frame
// with the game in it (its own content drawn, every picture in it decoded), on a laptop. Classics and Snack Bar must be
// ready in ≤ 300 ms (BUDGET); every game is measured and printed. A second pass on a touch tablet with real taps: one
// tap opens a game from the hall, picks Connect Four on the Classics shelf, seats Stub and drops a disc (no tap needs a
// second one); TAP=0 skips it.
//
//   npm run build, a local server (wrangler dev --var SWM_LAB_SERVER:1), then:
//   node scripts/harness/game-open/run.cjs [site]     GAMES=classics,snack narrows the run; CPU=4 slows the CPU 4×,
//   LATENCY=150 adds 150 ms to every request (CI runs it with both).
const { chromium, devices } = require('playwright');
const path = require('path');

const SITE = process.argv[2] || 'http://localhost:8787';
const BUDGET = Number(process.env.BUDGET || 300);
const MUST = ['classics', 'snack'];
const GAMES = (process.env.GAMES || 'classics,snack,garden,word,sea,duel,draw,quiz,poker').split(',');
let fails = 0;
const check = (ok, label, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? ` → ${extra}` : ''}`);
  if (!ok && process.env.GITHUB_ACTIONS) console.log(`::error title=${path.basename(__dirname)}::${label}`);
};
const SOLO = ['snack', 'garden', 'word'];

(async () => {
  const browser = await chromium.launch();
  const rows = [];
  for (const kind of GAMES) {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    await ctx.addInitScript(() => {
      for (const [k, v] of Object.entries({ lang: 'en', name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', gameMode: 'frame' })) localStorage.setItem(k, v);
      for (const k of ['sea', 'duel', 'quiz', 'draw', 'poker', 'classics:xox', 'snack', 'garden', 'word']) localStorage.setItem(`${k}:howSeen`, '1');
    });
    const page = await ctx.newPage();
    // A slower computer and a real network (the owner's stutter): CPU=4 slows the CPU, LATENCY=150 adds that many ms
    // to every request (the chunks come from the server, not the cache, the first time).
    if (process.env.CPU || process.env.LATENCY) {
      const cdp = await ctx.newCDPSession(page);
      if (process.env.CPU) await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.CPU) });
      if (process.env.LATENCY) {
        await cdp.send('Network.enable');
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: Number(process.env.LATENCY), downloadThroughput: 4e6 / 8 * 1024, uploadThroughput: 1e6 / 8 * 1024 });
      }
    }
    await page.goto(`${SITE}/r/go${Math.random().toString(36).slice(2, 8)}#back`);
    await page.waitForFunction(() => !!document.querySelector('#game-btn'), null, { timeout: 20000 });
    await page.waitForTimeout(1500);
    // The hall open (as the other harnesses open it: the 🎮 on screen, or the one in ⋯), then a moment for what it
    // starts loading.
    await page.evaluate(() => ['#dock-game', '#game-btn', '#more-game'].map((x) => document.querySelector(x)).find((e) => e && (e.getBoundingClientRect().width > 0 || e.id === 'more-game'))?.click());
    const sel = SOLO.includes(kind) ? `#game-menu [data-solo="${kind}"]` : `#game-menu [data-kind="${kind}"]`;
    if (SOLO.includes(kind)) await page.evaluate(() => document.querySelector('#game-menu [data-tab="side"]')?.click());
    await page.waitForFunction((s) => !!document.querySelector(s), sel, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const card = await page.$(sel);
    if (!card) {
      check(false, `${kind}: its card is in the hall`);
      await ctx.close();
      continue;
    }
    // The clock starts at the click and stops at the first frame where the game's content is drawn and every
    // <img> / <image> in it is decoded.
    await page.evaluate(() => {
      window.__openAt = 0;
      window.__readyAt = 0;
      const tick = () => {
        const s = document.getElementById('game-stage');
        const body = s && !s.hidden && s.querySelector('.game-fit');
        const content = body && !body.querySelector(':scope > .game-stage-loading') && body.childElementCount > 0 && body.getBoundingClientRect().width > 0;
        const imgs = content ? [...body.querySelectorAll('img')] : [];
        if (content && imgs.every((i) => i.complete && i.naturalWidth > 0)) {
          window.__readyAt = performance.now();
          return;
        }
        requestAnimationFrame(tick);
      };
      addEventListener('click', () => ((window.__openAt = performance.now()), requestAnimationFrame(tick)), { once: true, capture: true });
    });
    await page.evaluate((s) => document.querySelector(s).click(), sel);
    await page.waitForFunction(() => window.__readyAt > 0, null, { timeout: 15000 }).catch(() => {});
    const ms = await page.evaluate(() => (window.__readyAt ? Math.round(window.__readyAt - window.__openAt) : -1));
    rows.push([kind, ms]);
    const shown = ms >= 0;
    check(shown, `${kind}: one click on its card opens it`, 'nothing after 15 s');
    if (shown && MUST.includes(kind)) check(ms <= BUDGET, `${kind}: ready ${ms} ms after the click (budget ${BUDGET} ms)`, `${ms} ms`);
    await ctx.close();
  }

  // GP1: real taps on a touch tablet (a sideways iPad): each step must answer the first tap.
  if (process.env.TAP !== '0') {
    const ctx = await browser.newContext({ ...devices['iPad Pro 11 landscape'], viewport: { width: 1180, height: 820 } });
    await ctx.addInitScript(() => {
      for (const [k, v] of Object.entries({ lang: 'en', name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', gameMode: 'frame', 'classics:xox:howSeen': '1', 'classics:four:howSeen': '1', 'snack:howSeen': '1' })) localStorage.setItem(k, v);
    });
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/gt${Math.random().toString(36).slice(2, 8)}#back`);
    // After the room's intro (over the video and its rail for the first seconds; it takes the taps under it).
    // Waits until the 🎮 itself is under its centre (the intro starts a moment after the page shows).
    await page.waitForTimeout(1500);
    await page.waitForFunction(() => {
      const b = [...document.querySelectorAll('#dock-game, #game-btn')].find((e) => e.getBoundingClientRect().width > 0);
      const r = b?.getBoundingClientRect();
      return !!r && !document.querySelector('.swm-intro') && b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    }, null, { timeout: 20000 });
    await page.waitForTimeout(300);
    // One tap on the first visible match (its centre), then up to 4 s for `done` to hold.
    const tapOnce = async (selectors, done, label, arg = null) => {
      await page.waitForFunction((list) => list.some((x) => [...document.querySelectorAll(x)].some((e) => e.getBoundingClientRect().width > 0 && !e.disabled)), selectors, { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(300);
      const box = await page.evaluate((list) => {
        for (const x of list) {
          for (const e of document.querySelectorAll(x)) {
            const r = e.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && !e.disabled) return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          }
        }
        return null;
      }, selectors);
      if (!box) return check(false, `tablet tap: ${label}`, `nothing to tap (${selectors.join(', ')})`);
      await page.touchscreen.tap(box.x, box.y);
      const ok = await page.waitForFunction(done, arg, { timeout: 4000 }).then(() => true, () => false);
      const under = ok ? '' : await page.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return `${e?.tagName}.${e?.className} at ${Math.round(x)},${Math.round(y)}`; }, box);
      check(ok, `tablet tap: ${label} on the first tap`, under);
      return ok;
    };
    const hallOpen = () => { const m = document.getElementById('game-menu'); return !!m && !m.hidden; };
    if (await tapOnce(['#dock-game', '#game-btn'], hallOpen, 'the 🎮 opens the hall')) {
      if (await tapOnce(['#game-menu [data-kind="classics"]'], () => !!document.querySelector('#game-stage:not([hidden]) .cl-picker [data-board="four"]'), 'the Classics card opens the table')) {
        if (await tapOnce(['.cl-picker [data-board="four"]'], () => !!document.querySelector('#game-stage .four-board'), 'Connect Four on the shelf')) {
          await page.waitForTimeout(600);
          if (await tapOnce(['.cl-bot-level'], () => !!document.querySelector('.four-board.my-turn'), 'a level seats Stub')) {
            const marks = () => document.querySelectorAll('.four-board .mark-X, .four-board .mark-O').length;
            const before = await page.evaluate(marks);
            await tapOnce(['.four-board .four-cell:not(.mark-X):not(.mark-O)'], (n) => !document.querySelector('.four-board.my-turn') || document.querySelectorAll('.four-board .mark-X, .four-board .mark-O').length > n, 'a column drops a disc (my turn ends)', before);
          }
        }
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log('\ngame        ms (click → first frame with the game, pictures decoded)');
  for (const [k, ms] of rows) console.log(`${k.padEnd(10)}  ${ms}`);
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Games open at once');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
