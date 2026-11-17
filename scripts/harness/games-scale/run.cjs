// Card GW5 (owner, 17 Nov 2026: "every game must look the same at any size, only bigger or smaller"; "very important"):
// every game in its free window (side games; tables in their 🪟 frame) at its smallest, a middle and its largest size
// (Test Lab `games.scaleCheck`), on a laptop and a big monitor. At each size: the window has the game's own shape, the
// game's layout is the same (nothing wraps or reflows: one fingerprint of its boxes in its own pixels), the head shows
// the same words, nothing inside scrolls; at the smallest the text is still ≥ 13 px on the screen and every button
// ≥ 24 px. Screenshots per game and size go to SHOTS.
//
//   built site + local server with the lab flag (CI's prepare), then:
//   node scripts/harness/games-scale/run.cjs [site]      SIZES=laptop GAMES=word,sea narrow it.
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SITE = process.argv[2] || 'http://localhost:8787';
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'games-scale-'));
const pick = (env, all) => (process.env[env] ? process.env[env].split(',') : all);
const SIZES = { laptop: { width: 1366, height: 768 }, desktop: { width: 1920, height: 1080 } };
const GAMES = pick('GAMES', ['word', 'snack', 'garden', 'classics', 'sea', 'duel', 'quiz', 'draw', 'poker']);
const SOLO = new Set(['word', 'snack', 'garden']);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let fails = 0;
const check = (ok, label, extra) => {
  if (!ok) {
    fails++;
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=games-scale::${label} → ${JSON.stringify(extra)}`);
  }
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra !== undefined ? ` → ${JSON.stringify(extra)}` : ''}`);
};

/** What a person sees in the window: the smallest text and button on the screen, any inner scrollbar. */
const look = () => {
  const stage = document.getElementById('game-stage');
  const box = stage.getBoundingClientRect();
  let text = Infinity;
  let button = Infinity;
  let scroll = '';
  for (const e of stage.querySelectorAll('*')) {
    if (e.closest('[hidden], .htp, .toast, .game-resize')) continue;
    const s = getComputedStyle(e);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.right < box.left || r.left > box.right || r.bottom < box.top || r.top > box.bottom) continue;
    if ([...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      const ratio = e.offsetHeight ? r.height / e.offsetHeight : 1;
      text = Math.min(text, parseFloat(s.fontSize) * ratio);
    }
    if (e.matches('button:not([disabled])')) button = Math.min(button, Math.max(r.width, r.height));
    const list = e.matches('.chat, [class*="log"], [class*="list"], [class*="feed"]');
    if (!list && /(auto|scroll)/.test(s.overflowY + s.overflowX) && (e.scrollHeight > e.clientHeight + 2 || e.scrollWidth > e.clientWidth + 2)) scroll ||= e.className || e.tagName;
  }
  return { text: Math.round(text * 10) / 10, button: Math.round(button), scroll };
};

(async () => {
  const browser = await chromium.launch();
  for (const size of pick('SIZES', Object.keys(SIZES))) {
    const ctx = await browser.newContext({ viewport: SIZES[size] });
    await ctx.addInitScript(() => {
      const seen = { lang: 'en', name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', extUpdateSeen: '9' };
      for (const g of ['snackBar', 'windowGarden', 'fiveFrames', 'sea', 'duel', 'quiz', 'draw', 'poker']) seen[`${g}:howSeen`] = '1';
      for (const [k, v] of Object.entries(seen)) localStorage.setItem(k, v);
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
    await page.goto(`${SITE}/r/gs${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
    await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('#media-input'), null, { timeout: 25000 });
    await page.waitForSelector('.room-title-dot[data-status="open"]', { state: 'attached', timeout: 25000 }).catch(() => {});
    await page.waitForFunction(() => window.__swmLab.list().some((c) => c.id === 'games.open.xox'), null, { timeout: 25000 }).catch(() => {});
    await page.addStyleTag({ content: '#debug-panel-root { display: none !important; }' });
    await wait(1000);
    const lab = (id, arg) => page.evaluate(([i, a]) => window.__swmLab.run(i, a).then((l) => ({ dir: l.dir, text: l.text }), (e) => ({ dir: 'error', text: String(e) })), [id, arg]);
    for (const game of GAMES) {
      const opened = await lab(`games.open.${game}`);
      await page.waitForFunction(() => {
        const b = document.querySelector('#game-stage .game-stage-body');
        return b && !b.querySelector('.game-stage-loading, .mt-loading') && b.childElementCount > 0;
      }, null, { timeout: 12000 }).catch(() => {});
      await wait(800);
      if (!SOLO.has(game)) await lab('games.frame', 'frame');
      await page.waitForFunction(() => window.__swmLab.list().some((c) => c.id === 'games.scaleCheck' && c.available === true), null, { timeout: 6000 }).catch(() => {});
      const rows = [];
      for (const s of ['min', 'mid', 'max']) {
        const r = await lab('games.scaleCheck', s);
        await wait(400);
        let out = null;
        try {
          out = JSON.parse(r.text.slice(r.text.indexOf('{')));
        } catch {}
        // A second read once the window settled (fonts, the game's own late layout): it must say the same.
        const again = await lab('games.scaleCheck', s);
        try {
          out = JSON.parse(again.text.slice(again.text.indexOf('{')));
        } catch {}
        if (!out) {
          check(false, `${size} · ${game} · ${s}: the lab measured the window`, { opened: opened.text, r: r.text });
          continue;
        }
        const seen = await page.evaluate(look);
        rows.push({ ...out, ...seen });
        await page.screenshot({ path: path.join(SHOTS, `${size}-${game}-${s}.png`) });
      }
      if (rows.length < 3) continue;
      console.log(`     ${size} · ${game}: ${rows.map((r) => `${r.size} ${r.box.join('×')} own ${r.own.join('×')} ×${r.fit.toFixed(2)} head ${r.head}`).join(' | ')}`);
      for (const r of rows) {
        check(Math.abs(r.ratio - r.design) / r.design < 0.02, `${size} · ${game} · ${r.size}: the window has the game's own shape`, { ratio: r.ratio, design: r.design, box: r.box });
        check(!r.scroll, `${size} · ${game} · ${r.size}: nothing inside scrolls`, r.scroll);
      }
      check(rows.every((r) => r.layout === rows[0].layout), `${size} · ${game}: the same layout at every size (nothing wraps or reflows)`, rows.map((r) => r.layout));
      check(rows.every((r) => r.labels === rows[0].labels), `${size} · ${game}: the head shows the same words at every size`, rows.map((r) => r.labels));
      check(rows[0].box[0] < rows[2].box[0] || rows[0].zoom === rows[2].zoom, `${size} · ${game}: the window grows from its smallest to its largest`, rows.map((r) => r.box));
      // (Text ≥ 13 px and 24 px targets at the smallest size: games-sweep's smallest-window pass.)
      await page.evaluate(() => document.querySelector('#game-stage .game-leave, #game-stage .game-minimize')?.click());
      await page.evaluate(() => document.querySelector('.dialog-backdrop:not([hidden]) .confirm-dialog .btn.primary')?.click());
      await wait(500);
    }
    check(!errors.length, `${size}: no page errors`, errors.slice(0, 2));
    await ctx.close();
  }
  await browser.close();
  console.log(`\nscreenshots: ${SHOTS}`);
  console.log(fails ? `${fails} check(s) failed` : 'all checks passed');
  process.exit(fails ? 1 : 0);
})();
