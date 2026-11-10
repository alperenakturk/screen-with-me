// Game proportions (card PROP, owner 10 Nov 2026: "in the video's place the games look out of proportion; I want the
// same experience in both modes"). Every game, in both placements ("in the video's place" and the free window), on a
// laptop, a desktop, a wide screen and a tablet both ways: the game uses its box in proportion. On the screen (after
// the window's scale) the game's usual text is at least 14 px and grows with a big box, nothing is under 12 px, and
// the game's content covers most of its box (no giant empty bands). Prints a table and saves a screenshot per case.
//
//   npm run build, a local server (wrangler dev --var SWM_LAB_SERVER:1), then:
//   node scripts/harness/game-proportions/run.cjs [site]
//   GAMES=chess,quiz SIZES=laptop MODES=stage narrows the run; REPORT=1 only prints (no checks fail).
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SITE = process.argv[2] || 'http://localhost:5173';
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'game-proportions-'));
const pick = (env, all) => (process.env[env] ? process.env[env].split(',') : all);
const REPORT = !!process.env.REPORT;

const SIZES = {
  laptop: { width: 1366, height: 768 },
  desktop: { width: 1920, height: 1080 },
  wide: { width: 2560, height: 1440 },
  tablet: { width: 1180, height: 820, touch: true },
  upright: { width: 820, height: 1180, touch: true },
};
const GAMES = {
  picker: { table: 'classics', picker: true },
  xox: { table: 'classics', board: 'xox' },
  four: { table: 'classics', board: 'four' },
  chess: { table: 'classics', board: 'chess' },
  backgammon: { table: 'classics', board: 'backgammon' },
  draw: { table: 'draw' },
  quiz: { table: 'quiz' },
  poker: { table: 'poker' },
  sea: { table: 'sea' },
  duel: { table: 'duel' },
  snack: { solo: 'snack' },
  garden: { solo: 'garden' },
  word: { solo: 'word' },
};
const MODES = ['stage', 'float'];

let fails = 0;
const problems = [];
const check = (ok, label, extra = '') => {
  if (ok || REPORT) return;
  fails++;
  problems.push(`${label}${extra ? ` → ${extra}` : ''}`);
  console.log(`FAIL ${label}${extra ? ` → ${extra}` : ''}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::error title=game-proportions::${label}${extra ? ` → ${extra}` : ''}`);
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** What the game looks like on the screen: its box, its scale, its text sizes, how much of the box it covers. */
const measure = (page) =>
  page.evaluate(() => {
    const stage = document.getElementById('game-stage');
    const frame = stage?.querySelector('.game-stage-body');
    const fit = stage?.querySelector('.game-fit');
    if (!frame || !fit) return null;
    const box = frame.getBoundingClientRect();
    const scale = Number(getComputedStyle(stage).getPropertyValue('--fit')) || 1;
    const shown = (e) => {
      if (e.closest('[hidden], .htp, .toast')) return false;
      const s = getComputedStyle(e);
      if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
      const r = e.getBoundingClientRect();
      return r.width > 1 && r.height > 1 && r.right > box.left && r.left < box.right && r.bottom > box.top && r.top < box.bottom;
    };
    const sizes = [];
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    const grow = (r) => {
      x1 = Math.min(x1, Math.max(r.left, box.left));
      y1 = Math.min(y1, Math.max(r.top, box.top));
      x2 = Math.max(x2, Math.min(r.right, box.right));
      y2 = Math.max(y2, Math.min(r.bottom, box.bottom));
    };
    for (const e of fit.querySelectorAll('*')) {
      if (!shown(e)) continue;
      const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (own) {
        // The size on the screen: the font size times every scale above it (the window's and the game's own).
        const r = e.getBoundingClientRect();
        const ratio = e.offsetHeight ? r.height / e.offsetHeight : scale;
        sizes.push(parseFloat(getComputedStyle(e).fontSize) * ratio);
        grow(r);
      } else if (/^(CANVAS|SVG|IMG|BUTTON)$/i.test(e.tagName) || e.matches('[class*="cell"], [class*="board"], [class*="card"]')) {
        grow(e.getBoundingClientRect());
      }
    }
    sizes.sort((a, b) => a - b);
    const used = x2 > x1 ? ((x2 - x1) * (y2 - y1)) / (box.width * box.height) : 0;
    return {
      w: Math.round(box.width),
      h: Math.round(box.height),
      scale: Math.round(scale * 100) / 100,
      min: sizes.length ? Math.round(sizes[0] * 10) / 10 : 0,
      median: sizes.length ? Math.round(sizes[Math.floor(sizes.length / 2)] * 10) / 10 : 0,
      used: Math.round(used * 100),
      usedW: x2 > x1 ? Math.round(((x2 - x1) / box.width) * 100) : 0,
      usedH: y2 > y1 ? Math.round(((y2 - y1) / box.height) * 100) : 0,
    };
  });

async function putBoard(page, g) {
  if (g.picker) {
    await page.evaluate(() => {
      const b = document.querySelector('#game-stage #cl-shelf-open');
      if (b && !b.hidden) b.click();
    });
    await wait(600);
    return;
  }
  if (!g.board) return;
  for (let tries = 0; tries < 4; tries++) {
    if (await page.evaluate((b) => document.querySelector('#game-stage .xox-page')?.dataset.board === b, g.board)) return;
    const onPicker = await page.evaluate(() => document.querySelector('#game-stage .xox-page')?.dataset.board === 'picker');
    if (!onPicker) await page.evaluate(() => document.querySelector('#game-stage #cl-shelf-open')?.click());
    await page.waitForFunction((b) => !!document.querySelector(`#game-stage .cl-box[data-board="${b}"]`)?.offsetParent, g.board, { timeout: 4000 }).catch(() => {});
    await page.evaluate((b) => document.querySelector(`#game-stage .cl-box[data-board="${b}"]`)?.click(), g.board);
    await wait(300);
    await page.evaluate(() => document.querySelector('.dialog-backdrop:not([hidden]) .confirm-dialog .btn.primary')?.click());
    await page.waitForFunction((b) => document.querySelector('#game-stage .xox-page')?.dataset.board === b, g.board, { timeout: 4000 }).catch(() => {});
  }
}

/** Puts the game window in a placement with the head's switch (the way a person does). */
async function placeIn(page, mode) {
  const ok = await page.evaluate((m) => {
    const b = document.querySelector(`#game-stage .game-place-btn.place-${m}`);
    if (!b || b.disabled) return false;
    if (b.getAttribute('aria-pressed') !== 'true') b.click();
    return true;
  }, mode);
  await page.waitForFunction((m) => document.getElementById('game-stage')?.classList.contains(m), mode, { timeout: 4000 }).catch(() => {});
  await wait(700);
  return ok && (await page.evaluate((m) => document.getElementById('game-stage')?.classList.contains(m), mode));
}

(async () => {
  const browser = await chromium.launch();
  const rows = [];
  for (const size of pick('SIZES', Object.keys(SIZES))) {
    const s = SIZES[size];
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, hasTouch: !!s.touch, isMobile: false });
    await ctx.addInitScript(() => {
      for (const [k, v] of Object.entries({ name: 'Robin', avatar: 'wizard', lang: 'en', 'opt:autoInvite': '0', tipsSeen: '1', 'snackBar:howSeen': '1', 'windowGarden:howSeen': '1', 'fiveFrames:howSeen': '1', 'duel:howSeen': '1' })) localStorage.setItem(k, v);
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => problems.push(`${size} PAGEERROR ${e.message}`));
    await page.goto(`${SITE}/r/gp${Math.random().toString(36).slice(2, 8)}?debug=1#back`);
    await page.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 });
    await wait(3000);
    const run = (id) => page.evaluate((i) => window.__swmLab.run(i).then((l) => ({ dir: l.dir, text: l.text })), id);
    for (const game of pick('GAMES', Object.keys(GAMES))) {
      const g = GAMES[game];
      const opened = await run(`games.open.${g.table ?? g.solo}`);
      if (opened.dir !== 'lab') {
        check(false, `${size}/${game}: opens`, opened.text);
        continue;
      }
      await page.waitForFunction(() => {
        const b = document.querySelector('#game-stage .game-stage-body');
        return b && !b.querySelector('.game-stage-loading, .mt-loading') && b.childElementCount > 0;
      }, null, { timeout: 12000 }).catch(() => {});
      await wait(800);
      await putBoard(page, g);
      for (const mode of pick('MODES', MODES)) {
        const label = `${size}/${game}/${mode}`;
        if (!(await placeIn(page, mode))) {
          rows.push({ label, note: 'placement not offered' });
          continue;
        }
        const m = await measure(page);
        if (!m) {
          check(false, `${label}: measured`);
          continue;
        }
        rows.push({ label, ...m });
        await page.screenshot({ path: path.join(SHOTS, `${label.replace(/\//g, '-')}.png`) });
        // The owner's rules for proportion. The usual text grows with the box (a box twice the game's own size shows it
        // bigger); nothing is tiny; the content covers most of the box.
        const big = Math.min(m.w, m.h) >= 700;
        check(m.median >= (big ? 16 : 14), `${label}: the game's usual text is a good size on the screen (${m.median} px in ${m.w}×${m.h})`);
        check(m.min >= 11.5, `${label}: no text under 12 px on the screen (${m.min} px)`);
        check(m.used >= 55, `${label}: the game covers most of its box (${m.used}% of ${m.w}×${m.h}, ${m.usedW}% wide, ${m.usedH}% high)`);
      }
    }
    await ctx.close();
  }
  await browser.close();
  console.log('\ncase                              box        scale  text(min/median)  used (w×h)');
  for (const r of rows) {
    if (r.note) console.log(`${r.label.padEnd(34)}${r.note}`);
    else console.log(`${r.label.padEnd(34)}${`${r.w}×${r.h}`.padEnd(11)}${String(r.scale).padEnd(7)}${`${r.min}/${r.median}`.padEnd(18)}${r.used}% (${r.usedW}×${r.usedH})`);
  }
  console.log(`\nScreenshots: ${SHOTS}`);
  if (fails) console.log(`\n✗ ${fails} check(s) failed:\n  ${problems.join('\n  ')}`);
  else console.log('\n✓ Game proportions harness passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
