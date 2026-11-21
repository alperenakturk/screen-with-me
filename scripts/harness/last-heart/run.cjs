// Card LH4 (owner's pick A, 21 Nov 2026): Last Heart's round table in the video's place. Five 🤖 friends sit (Test Lab
// `poker.compact`), the hand is dealt, and on a laptop and an upright tablet:
// - the table fills the place (`#game-stage.fill`) and stays at its own size after the deal (`--fit` 1: a deal measured
//   in the old layout flew out of the table and the stage shrank the game to 0.6);
// - the turn, my buttons, the special moves and the feed are in the side column (`.pk-side`), the rivals' bets lie on the
//   table as chips, the five shared cards are big (≥ 60 px on a laptop, ≥ 30 px on the tablet's short box);
// - nothing of the table spills out of the game, and no chip in flight sits outside its clipped layer;
// - 🪟 Frame puts the parts back where the window's layout expects them, and the video's place brings the side back.
//
//   built site + local server with the lab flag (CI's prepare), a video on :5300 (film-server), then:
//   node scripts/harness/last-heart/run.cjs [site]       SIZES=laptop narrows it; SHOTS=dir keeps the pictures.
const { chromium } = require('playwright');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SITE = process.argv[2] || 'http://localhost:8787';
const VIDEO = process.env.FILM_URL || 'http://localhost:5300/video.webm';
const SHOTS = process.env.SHOTS || fs.mkdtempSync(path.join(os.tmpdir(), 'last-heart-'));
const ALL = {
  laptop: { viewport: { width: 1366, height: 768 }, board: 60 },
  tablet: { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, board: 30 },
};
const SIZES = (process.env.SIZES || 'laptop,tablet').split(',');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let fails = 0;
const check = (ok, label, extra) => {
  if (!ok) {
    fails++;
    if (process.env.GITHUB_ACTIONS) console.log(`::error title=last-heart::${label} → ${JSON.stringify(extra)}`);
  }
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra !== undefined ? ` → ${JSON.stringify(extra)}` : ''}`);
};

async function lab(page, id) {
  await page.waitForFunction((id) => window.__swmLab?.list?.().some((c) => c.id === id), id, { timeout: 20000 });
  const r = await page.evaluate((id) => window.__swmLab.run(id).then((l) => ({ dir: l.dir, text: l.text }), (e) => ({ dir: 'error', text: String(e) })), id);
  await page.evaluate(() => document.querySelector('.debug-fab[aria-expanded="true"]')?.click());
  return r;
}

const measure = (page) =>
  page.evaluate(() => {
    const stage = document.querySelector('#game-stage');
    const pk = document.querySelector('#game-stage .pk');
    const box = (e) => e?.getBoundingClientRect();
    const card = box(document.querySelector('.pk-board .pk-card'));
    const frame = box(stage?.querySelector('.game-fit') ?? stage);
    const parts = [...(pk?.querySelectorAll('.pk-seats, .pk-middle, .pk-me-top, .pk-side') ?? [])].map(box);
    const spill = frame ? parts.filter((r) => r && (r.left < frame.left - 2 || r.right > frame.right + 2 || r.top < frame.top - 2 || r.bottom > frame.bottom + 2)).length : -1;
    return {
      fill: !!stage?.classList.contains('fill'),
      fit: Number(getComputedStyle(stage).getPropertyValue('--fit') || 1),
      side: !!pk?.querySelector(':scope > .pk-side .pk-actions') && !!pk?.querySelector(':scope > .pk-side .pk-status'),
      chips: pk?.querySelectorAll('.pk-seat-bet:not([hidden])').length ?? 0,
      board: card ? Math.round(card.width) : 0,
      spill,
      looseFly: document.querySelectorAll('.pk > .pk-fly').length,
      windowParts: !!pk?.querySelector(':scope > .pk-status') && !!pk?.querySelector('.pk-me > .pk-actions') && !pk?.querySelector(':scope > .pk-side'),
    };
  });

(async () => {
  const browser = await chromium.launch();
  for (const size of SIZES) {
    const spec = ALL[size];
    const ctx = await browser.newContext({ ...spec, board: undefined });
    await ctx.addInitScript(() => {
      try {
        for (const [k, v] of Object.entries({ lang: 'en', theme: 'gece', name: 'Alex', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', extUpdateSeen: '9', 'poker:howSeen': '1' })) localStorage.setItem(k, v);
      } catch {}
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => check(false, `${size}: no page error`, e.message));
    try {
      await page.goto(`${SITE}/r/lh${Math.random().toString(36).slice(2, 8)}?debug=1`);
      await page.waitForSelector('#name');
      await page.fill('#name', 'Alex');
      await page.click('#name-form button.primary');
      await page.waitForSelector('.room-title-dot[data-status="open"]', { state: 'attached', timeout: 20000 });
      await wait(1500);
      await page.evaluate((url) => {
        const input = document.querySelector('#media-input');
        input.value = url;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        document.querySelector('#media-form button[value="load"]').click();
      }, VIDEO);
      await wait(2500);
      await lab(page, 'games.open.poker');
      await page.waitForSelector('#game-stage .pk-lobby', { timeout: 15000 });
      await lab(page, 'poker.compact');
      await page.waitForFunction(() => document.querySelectorAll('#game-stage .pk-seat').length >= 5 && !!document.querySelector('#game-stage .pk-status'), null, { timeout: 30000 });
      // The deal and the blinds' chips land (≈ 1 s), then the stage has settled.
      await wait(2500);
      let m = await measure(page);
      await page.screenshot({ path: path.join(SHOTS, `${size}-table.png`) });
      check(m.fill, `${size}: the table fills the video's place`, m);
      check(m.fit >= 0.99, `${size}: the game stays at its own size after the deal (fit ${m.fit.toFixed(2)})`, m);
      check(m.side, `${size}: the turn and my buttons are in the side column`, m);
      check(m.chips >= 2, `${size}: the blinds lie on the table as chips`, m);
      check(m.board >= spec.board, `${size}: the shared cards are big (${m.board} px ≥ ${spec.board})`, m);
      check(m.spill === 0, `${size}: nothing of the table spills out of the game`, m);
      check(m.looseFly === 0, `${size}: flying chips stay in their clipped layer`, m);
      // A free window: the parts go back; the video's place: the side comes back.
      await page.locator('#game-stage button', { hasText: 'Frame' }).first().click();
      await wait(1500);
      m = await measure(page);
      check(!m.fill && m.windowParts, `${size}: in a free window the parts are back in the window's layout`, m);
      await page.locator('#game-stage button', { hasText: /video.s place/ }).first().click();
      await wait(1500);
      m = await measure(page);
      check(m.fill && m.side && m.fit >= 0.99, `${size}: back in the video's place, the round table again`, m);
      await page.screenshot({ path: path.join(SHOTS, `${size}-back.png`) });
    } catch (e) {
      check(false, `${size}: the run`, String(e.message).split('\n')[0]);
      await page.screenshot({ path: path.join(SHOTS, `${size}-error.png`) }).catch(() => {});
    }
    await ctx.close();
  }
  await browser.close();
  console.log(`shots: ${SHOTS}`);
  console.log(fails ? `✗ ${fails} check(s) failed` : '✓ Last Heart round table harness passed');
  process.exit(fails ? 1 : 0);
})();
