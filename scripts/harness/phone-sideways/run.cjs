// Cards LAB3 + PH1 + PH4: a phone held sideways. PH4 (owner, 19 Nov 2026: "everything upright, except watching the
// video"): on a Galaxy S5, an iPhone SE and an iPhone 13 held sideways,
//   (1) the home page, joining and the room before its first video show the full-screen "Turn your phone upright" note
//       (EN and TR), it covers the whole screen and nothing under it takes a tap; upright again, it goes;
//   (2) with a video, the Room tab keeps today's sideways view: no note, ⛶ "Watch fullscreen" beside the video, and 💬
//       opens the chat beside it (still no note); a phone has no first-time tips;
//   (3) the Games, Search and Me tabs, the games hall and the invite window show the note; back on the Room tab it goes.
// The Test Lab's `phone.turnNote` says the same as the page.
//
//   built site on wrangler dev (CI):  npm run build && (cd apps/server && npx wrangler dev --port 8787 --var SWM_LAB_SERVER:1)
//                                     node scripts/harness/phone-sideways/run.cjs http://localhost:8787
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? ` → ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : ''}`);
  if (!ok) fails++;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 8000) => {
  for (let i = 0; i < ms / 150; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await wait(150);
  }
  return null;
};
const tipShown = (page) =>
  page.evaluate(() => {
    const t = document.querySelector('.first-tip');
    if (!t) return false;
    const r = t.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(t).display !== 'none';
  });

/** What the note looks like now: shown, covering the screen, on top at the given selector's middle, its text. */
const note = (page, under) =>
  page.evaluate(async (sel) => {
    const n = document.getElementById('turn-note');
    if (!n) return { exists: false };
    const r = n.getBoundingClientRect();
    const target = sel && document.querySelector(sel);
    let blocked = null;
    if (target) {
      const b = target.getBoundingClientRect();
      const hit = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, b.left + b.width / 2)), Math.min(innerHeight - 1, Math.max(0, b.top + b.height / 2)));
      blocked = !!hit && n.contains(hit);
    }
    const inert = [...document.body.children].filter((c) => c !== n).every((c) => c.inert);
    const lab = window.__swmLab ? JSON.parse((await window.__swmLab.run('phone.turnNote')).text.replace(/^\S+\s/, '')) : null;
    return {
      shown: !n.hidden && r.width > 0,
      covers: r.left <= 0 && r.top <= 0 && r.right >= innerWidth && r.bottom >= innerHeight,
      blocked,
      inert,
      text: n.querySelector('.turn-note-t')?.textContent,
      lab,
    };
  }, under ?? null);

/** Turns the page to `size` and waits for the note to settle. */
async function turn(page, size) {
  await page.setViewportSize(size);
  await wait(500);
}

async function enter(page, room, name, { tips = false, lang = 'en' } = {}) {
  await page.addInitScript(
    ([seen, l]) => {
      localStorage.setItem('lang', l);
      if (seen) localStorage.setItem('tipsSeen', '1');
    },
    [!tips, lang],
  );
  await page.goto(`${SITE}/?debug=1`);
  await page.waitForFunction(() => !!window.__swmLab, null, { timeout: 15000 });
  await page.goto(`${SITE}/r/${room}`);
  await page.fill('#name', name);
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
}

const DEVICES = [
  ['Galaxy S5', devices['Galaxy S5']],
  ['iPhone SE', devices['iPhone SE']],
  ['iPhone 13', devices['iPhone 13']],
];

(async () => {
  const browser = await chromium.launch();

  for (const [label, dev] of DEVICES) {
    const up = dev.viewport;
    const side = { width: up.height, height: up.width };
    const lang = label === 'iPhone SE' ? 'tr' : 'en';
    const words = lang === 'tr' ? 'Telefonu dik tut' : 'Turn your phone upright';

    // ---- (1) Home, joining, the empty room ----
    {
      const ctx = await browser.newContext({ ...dev });
      const page = await ctx.newPage();
      await page.addInitScript((l) => localStorage.setItem('lang', l), lang);
      await page.goto(`${SITE}/?debug=1`);
      await page.waitForFunction(() => !!window.__swmLab, null, { timeout: 15000 });
      check(!(await note(page)).shown, `${label} upright, home: no note`);
      await turn(page, side);
      const home = await note(page, '#create-room, .hero .btn.primary, main button');
      check(home.shown && home.covers && home.text === words, `${label} sideways, home: "${words}" covers the screen`, home);
      check(home.blocked !== false && home.inert, `${label} sideways, home: nothing under the note takes a tap`, home);
      check(home.lab && home.lab.shown === true && home.lab.sideways === true, `${label}: the Test Lab's phone.turnNote says it shows`, home.lab);
      await turn(page, up);
      const back = await note(page);
      check(!back.shown && !back.inert, `${label} upright again, home: the note goes`, back);

      await page.goto(`${SITE}/r/side-join-${Date.now().toString(36)}`);
      await page.waitForSelector('#name');
      await turn(page, side);
      const join = await note(page, '#name');
      check(join.shown && join.blocked, `${label} sideways, joining: the note covers the name box`, join);
      await turn(page, up);
      await page.fill('#name', 'Alex');
      await page.click('#name-form button.primary');
      await page.waitForSelector('.room');
      await turn(page, side);
      const empty = await note(page);
      check(empty.shown, `${label} sideways, a room before its first video: the note`, empty);
      await ctx.close();
    }

    // ---- (2) Watching: the Room tab with a video ----
    const room = `side-${label.replace(/\W/g, '').toLowerCase()}-${Date.now().toString(36)}`;
    const friend = await browser.newContext();
    const fp = await friend.newPage();
    await enter(fp, room, 'Sam');
    const ctx = await browser.newContext({ ...dev });
    const page = await ctx.newPage();
    await enter(page, room, 'Alex', { tips: true, lang });
    if (label === 'Galaxy S5') check(!(await until(() => tipShown(page), 3000)), 'phone: no first-time tip');
    await fp.evaluate(() => document.querySelector('#sync-test')?.click());
    await until(() => page.evaluate(() => !!document.querySelector('.room.has-item')));
    await turn(page, side);
    const watch = await note(page);
    const fs = await page.evaluate(() => {
      const b = document.querySelector('.ph-turn-fs');
      const r = b?.getBoundingClientRect();
      return !!r && r.width > 0 && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest('.ph-turn-fs') === b;
    });
    check(!watch.shown && !watch.inert && watch.lab?.watching === true, `${label} sideways with a video: no note`, watch);
    check(fs, `${label} sideways with a video: "Watch fullscreen" shows and takes a tap`);
    await page.click('#ph-side-chat');
    await wait(500);
    const chat = await note(page);
    const sheet = await page.evaluate(() => document.querySelector('.ph-sheet:not([hidden])')?.dataset.sheet ?? null);
    check(sheet === 'shorts-chat' && !chat.shown, `${label} sideways: 💬 opens the chat beside the video, no note`, { sheet, ...chat });
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.querySelector('.ph-backdrop:not([hidden])')?.click());
    await wait(300);

    // ---- (3) Everything else sideways: the note ----
    for (const tab of ['games', 'search', 'me']) {
      await turn(page, up);
      await page.click(`#ph-tab-${tab}`);
      await wait(400);
      await turn(page, side);
      const n = await note(page, '.ph-tabs');
      check(n.shown && n.covers && n.blocked !== false, `${label} sideways, the ${tab} tab: the note`, n);
    }
    await turn(page, up);
    await page.click('#ph-tab-room');
    await wait(400);
    await turn(page, side);
    const again = await note(page);
    check(!again.shown, `${label} sideways, back on the Room tab: the note goes`, again);
    await turn(page, up);
    await page.evaluate(() => document.querySelector('#invite-btn').click());
    await page.waitForSelector('.invite-dialog');
    await turn(page, side);
    const inv = await note(page, '.invite-dialog');
    check(inv.shown && inv.blocked, `${label} sideways, the invite window: the note covers it`, inv);
    await turn(page, up);
    check(!(await note(page)).shown, `${label} upright, the invite window: no note`);
    await ctx.close();
    await friend.close();
  }

  // ---- A computer and a tablet never see it ----
  for (const [label, opts] of [['computer 1366 × 768', { viewport: { width: 1366, height: 768 } }], ['iPad Mini sideways', devices['iPad Mini landscape']]]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(`${SITE}/`);
    await wait(600);
    check(!(await note(page)).shown, `${label}: no note`);
    await ctx.close();
  }

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ A sideways phone shows only the video; everything else asks to turn it upright');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
