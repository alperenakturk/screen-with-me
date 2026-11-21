// Card TG1 (owner, 19 Nov 2026): a side game's window lines up with the side panel, so at 1366 Five Frames covered the
// Together card's "Join voice" and "Share". While a game window lies over the panel the card is compact (one row of
// title, faces and counts, one row of buttons). At 1366 and 1920, with Snack Bar, Window Garden and Five Frames open,
// out of voice and in voice (English; Turkish once):
//  - the card is compact, every button of its row is whole, inside the card and not covered by the game window;
//  - "Join voice" joins, "Share" opens its menu and its "Share my screen" row can be pressed;
//  - ✕ (the game window put away) brings the full card back; the Test Lab's `together.compact` reports it.
//
//   built site on wrangler dev:  node scripts/harness/together-compact/run.cjs http://localhost:8787 [screenshot folder]
const { chromium } = require('playwright');
const fs = require('fs');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || '';
if (OUT) fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
const check = (ok, label, extra) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra !== undefined ? ` → ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : ''}`);
  if (!ok) fails++;
};
const until = async (fn, ms = 8000) => {
  for (let i = 0; i < ms / 200; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
};
const GAMES = { snack: 'Snack Bar', garden: 'Window Garden', word: 'Five Frames' };

async function enter(browser, viewport, lang) {
  const ctx = await browser.newContext({ viewport });
  await ctx.addInitScript((lang) => {
    if (sessionStorage.getItem('lab:seeded')) return;
    sessionStorage.setItem('lab:seeded', '1');
    Object.assign(localStorage, {
      name: 'Alex',
      avatar: 'wizard',
      lang,
      'opt:autoInvite': '0',
      tipsSeen: '1',
      'snackBar:howSeen': '1',
      'windowGarden:howSeen': '1',
      'fiveFrames:howSeen': '1',
      'opt:voiceCheck': 'skip',
      'opt:ipNotice:voice': '1',
    });
  }, lang);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${SITE}/?debug=1`);
  await page.waitForFunction(() => sessionStorage.getItem('swm:debug') === '1', null, { timeout: 10000 });
  await page.goto(`${SITE}/r/tg${Math.random().toString(36).slice(2, 8)}`);
  await page.waitForSelector('#name, .room');
  if (await page.isVisible('#name')) {
    await page.fill('#name', 'Alex');
    await page.click('#name-form button.primary');
  }
  await page.waitForFunction(() => document.documentElement.classList.contains('in-room') && !!document.querySelector('#game-btn'), null, { timeout: 15000 });
  await page.waitForTimeout(800);
  return { ctx, page, errors };
}

const open = (page, kind) =>
  page.evaluate(async (kind) => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    document.getElementById('game-btn').click();
    await sleep(200);
    document.querySelector('#game-menu [data-tab="side"]')?.click();
    await sleep(100);
    document.querySelector(`#game-menu [data-solo="${kind}"]`)?.click();
    for (let i = 0; i < 60 && !document.querySelector('#game-stage .sb, #game-stage .wg, #game-stage .ff .ff-key'); i++) await sleep(100);
    await sleep(900);
  }, kind);

/** The card's buttons on screen: each whole, inside the card, its middle not covered. */
const buttons = (page) =>
  page.evaluate(() => {
    const card = document.getElementById('together');
    const c = card.getBoundingClientRect();
    const ids = document.getElementById('voice-on').hidden ? ['voice-join', 'live-share'] : ['voice-mic', 'voice-deaf', 'voice-cam', 'voice-sound', 'voice-leave', 'live-share'];
    const bad = [];
    for (const id of ids) {
      const b = document.getElementById(id);
      const r = b?.getBoundingClientRect();
      if (!b || !r || r.width < 1) {
        if (id !== 'voice-cam') bad.push(`${id} hidden`);
        continue;
      }
      if (r.left < c.left || r.right > c.right + 0.5 || r.bottom > c.bottom + 0.5) bad.push(`${id} outside the card`);
      for (const [fx, fy] of [[0.5, 0.5], [0.15, 0.5], [0.85, 0.5]]) {
        const hit = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
        if (!b.contains(hit)) bad.push(`${id} covered by ${hit?.id || hit?.className}`);
      }
      if (r.height < 24 || r.width < 24) bad.push(`${id} smaller than 24 px`);
    }
    return { compact: card.classList.contains('compact'), bad: [...new Set(bad)] };
  });

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const runs = [];
  for (const [w, h] of [[1366, 768], [1920, 1080]]) for (const kind of Object.keys(GAMES)) runs.push({ w, h, kind, lang: 'en' });
  runs.push({ w: 1366, h: 768, kind: 'word', lang: 'tr' });
  for (const { w, h, kind, lang } of runs) {
    const tag = `${w} ${GAMES[kind]}${lang === 'tr' ? ' (TR)' : ''}`;
    const { ctx, page, errors } = await enter(browser, { width: w, height: h }, lang);
    // The lab's hooks come with its drawer: opened once before the game (the drawer puts a game window away).
    await until(() => page.evaluate(() => !!document.querySelector('.debug-fab')));
    await page.evaluate(() => document.querySelector('.debug-fab').click());
    await until(() => page.evaluate(() => !!window.__swmLab));
    await page.evaluate(() => document.querySelector('.debug-fab').click());
    await page.waitForTimeout(300);
    const fullHeight = await page.evaluate(() => document.getElementById('together').getBoundingClientRect().height);
    await open(page, kind);
    const out = await buttons(page);
    check(out.compact && out.bad.length === 0, `${tag}: compact card, "Join voice" and "Share" whole and clear of the game`, out);
    if (OUT) await page.screenshot({ path: `${OUT}/${w}-${kind}-${lang}.png` });

    // Join voice from the compact card.
    await page.click('#voice-join');
    check(!!(await until(() => page.evaluate(() => !document.getElementById('voice-on').hidden))), `${tag}: "Join voice" joins from the compact card`);
    await page.waitForTimeout(400);
    const inVoice = await buttons(page);
    check(inVoice.compact && inVoice.bad.length === 0, `${tag}: in voice the mic, deafen, camera, Leave and Share fit in one row, clear of the game`, inVoice);
    if (OUT) await page.screenshot({ path: `${OUT}/${w}-${kind}-${lang}-voice.png` });

    // Share opens its menu over the game window, and its first row can be pressed.
    await page.click('#live-share');
    const menu = await until(() =>
      page.evaluate(() => {
        const item = document.getElementById('live-screen');
        const r = item?.getBoundingClientRect();
        if (!r || r.width < 1) return null;
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { reachable: item.contains(hit), name: document.getElementById('live-share').title };
      }),
    );
    check(!!menu && menu.reachable && !!menu.name, `${tag}: "Share" opens its menu, "Share my screen" can be pressed, the button keeps its name`, menu);
    // (Escape would also put a game window away: the button closes its menu.)
    await page.click('#live-share');

    // The Test Lab reports it, and ✕ (the game window put away) brings the full card back.
    const lab = await page.evaluate(() => window.__swmLab.run('together.compact'));
    check(lab.dir !== 'error' && /"compact":true/.test(lab.text) && /"share":"clear"/.test(lab.text), `${tag}: Test Lab together.compact says compact, Share clear`, lab);
    await page.evaluate(() => document.querySelector('#game-stage .game-minimize')?.click());
    const back = await until(() => page.evaluate(() => (document.getElementById('game-stage')?.hidden ?? true) && !document.getElementById('together').classList.contains('compact')));
    check(!!back, `${tag}: ✕ (the game window put away) brings the full card back`, await page.evaluate(() => [document.getElementById('game-stage')?.hidden, document.getElementById('together').className]));
    const after = await page.evaluate(() => document.getElementById('together').getBoundingClientRect().height);
    check(after >= fullHeight - 1, `${tag}: the full card is as tall as before (${Math.round(after)} ≥ ${Math.round(fullHeight)} px)`);
    check(errors.length === 0, `${tag}: no page errors`, errors);
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `\n${fails} FAILED` : '\nall passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
