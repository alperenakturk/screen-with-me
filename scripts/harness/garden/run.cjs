// 🌱 Window Garden in the room (card "Window Garden"): two people, Alex opens it from the gallery's "On the side".
// Checks: it opens, fits without scrollbars (own size, a small window, a phone sheet), plants don't grow while
// nothing plays, they grow while the sync test plays, one blooms and is picked into the album, a thirsty pot shows 💧
// and can be watered, a seed is planted in the empty pot, the message box keeps the focus.
//
//   npm run dev, then: node scripts/harness/garden/run.cjs [site]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
const room = 'wg' + Math.random().toString(36).slice(2, 8);
let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
};
const until = async (fn, ms = 10000) => {
  for (let i = 0; i < ms / 200; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function person(ctx, name, avatar, extra = {}) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', name, e.message));
  await page.goto(`${SITE}/`);
  await page.waitForTimeout(800);
  await page.evaluate(([n, a, more]) => {
    localStorage.setItem('name', n);
    localStorage.setItem('avatar', a);
    localStorage.setItem('lang', 'en');
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('tipsSeen', '1');
    for (const k of ['snackBar', 'windowGarden', 'fiveFrames']) localStorage.setItem(k + ':howSeen', '1');
    localStorage.setItem('opt:hubTab', 'side');
    for (const [k, v] of Object.entries(more)) localStorage.setItem(k, v);
  }, [name, avatar, extra]);
  await page.goto(`${SITE}/r/${room}#back`);
  await until(() => page.evaluate(() => !!document.querySelector('#game-btn')));
  await page.waitForTimeout(1500);
  return page;
}
const openGarden = (page) =>
  page.evaluate(async () => {
    const button = ['#dock-game', '#game-btn', '#more-game'].map((x) => document.querySelector(x)).find((e) => e && (e.getBoundingClientRect().width > 0 || e.id === 'more-game'));
    button.click();
    for (let i = 0; i < 30 && !document.querySelector('#game-menu [data-solo="garden"]'); i++) await new Promise((r) => setTimeout(r, 100));
    document.querySelector('#game-menu [data-solo="garden"]')?.click();
    for (let i = 0; i < 50 && !document.querySelector('#game-stage .wg'); i++) await new Promise((r) => setTimeout(r, 100));
    return !!document.querySelector('#game-stage .wg');
  });
const fits = (page) =>
  page.evaluate(() => {
    const out = [];
    for (const sel of ['#game-stage .game-stage-body', '#game-stage .wg']) {
      const e = document.querySelector(sel);
      if (e && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)) out.push(`${sel} ${e.scrollWidth}×${e.scrollHeight} in ${e.clientWidth}×${e.clientHeight}`);
    }
    const st = document.getElementById('game-stage').getBoundingClientRect();
    if (st.width < 100 || st.right > innerWidth + 1 || st.bottom > innerHeight + 1 || st.left < -1 || st.top < -1) out.push(`window ${JSON.stringify(st)}`);
    return out;
  });
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('windowGarden') || 'null'));

(async () => {
  const browser = await chromium.launch();
  const ctxA = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const ctxS = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const seed = JSON.stringify({
    v: 1,
    pots: [{ plant: 'mint', growth: 0.9985, water: 1 }, { plant: 'fern', growth: 0.6, water: 0.1 }, null],
    seeds: { common: 2, uncommon: 0, rare: 0, legendary: 0 },
    colorSeeds: [{ plant: 'mint', color: 'sky' }],
    album: { fern: 1 },
    watched: 0, seedClock: 0, together: 0, eveningSeed: false, seen: Date.now() - 3 * 3600_000, ended: [],
  });
  const alex = await person(ctxA, 'Alex', 'wizard', { windowGarden: seed });
  const sam = await person(ctxS, 'Sam', 'elf');

  check(await openGarden(alex), 'Window Garden opens from the gallery’s "On the side"');
  check((await fits(alex)).length === 0, 'fits without scrollbars at its own size', (await fits(alex)).join('; '));
  check(/1\/24/.test(await alex.evaluate(() => document.querySelector('.wg-album-count').textContent)), 'the album says 1/24');
  const drop = await alex.evaluate(() => !!document.querySelector('.wg-pot[data-pot="1"] .wg-drop'));
  check(drop, 'a thirsty pot shows 💧');

  // Nothing plays: no growth.
  const g0 = (await saved(alex)).pots[0].growth;
  await wait(6000);
  check((await saved(alex)).pots[0].growth === g0, 'no growth while nothing plays');
  check(/Resting/.test(await alex.evaluate(() => document.querySelector('.wg-state').textContent)), 'the pill says resting');
  const back = (await saved(alex)).pots[1];
  check(back.growth === 0.6 && back.water === 0.1, 'three hours away: nothing grew or dried (only in a room)', JSON.stringify(back));
  const rest = await alex.evaluate(() => { const n = document.querySelector('.wg-rest'); return n && !n.hidden ? n.textContent : null; });
  check(!!rest && /Resting until the film plays/.test(rest) && /away/.test(rest), 'the scene says it rests until the film plays', String(rest));

  // Water the thirsty fern, keeping the focus in the message box.
  await alex.evaluate(() => document.getElementById('chat-input')?.focus());
  await alex.click('.wg-pot[data-pot="1"]');
  await alex.click('.wg-action .wg-btn.main');
  const fern = (await until(async () => { const s = await saved(alex); return s.pots[1].water > 0.9 ? s : null; }, 4000))?.pots[1];
  check(fern && fern.water > 0.9, 'watering fills the pot’s water (saved)', JSON.stringify(fern));
  const focus = await alex.evaluate(() => document.activeElement?.id);
  check(focus === 'chat-input', 'the message box keeps the focus', String(focus));

  // Plant a seed in the empty pot.
  await alex.click('.wg-pot[data-pot="2"]');
  await alex.click('.wg-action .wg-btn.seed-common');
  const planted = await until(async () => { const s = await saved(alex); return s.pots[2] ? s : null; }, 4000);
  check(!!planted && planted.seeds.common === 1, 'a seed is planted in the empty pot', JSON.stringify(planted?.pots[2]));

  // The sync test plays: the mint blooms, gets picked into the album.
  await alex.evaluate(() => document.getElementById('sync-test').click());
  const growing = await until(() => alex.evaluate(() => document.querySelector('.wg-state').classList.contains('on') && /Growing/.test(document.querySelector('.wg-state').getAttribute('aria-label'))), 8000);
  check(!!growing, 'the pill turns to "Growing" when the room plays');
  check(await alex.evaluate(() => document.querySelector('.wg-rest').hidden), 'the resting sign goes away while the film plays');
  const bloomed = await until(() => alex.evaluate(() => document.querySelector('.wg-pot[data-pot="0"]').classList.contains('bloom')), 10000);
  check(!!bloomed, 'the mint blooms while the video plays');
  await alex.click('.wg-pot[data-pot="0"]');
  await alex.click('.wg-action .wg-btn.main');
  const picked = await until(async () => { const s = await saved(alex); return s.album.mint ? s : null; }, 4000);
  check(!!picked && picked.pots[0] === null, 'Pick puts it into the album and frees the pot');
  const note = await alex.evaluate(() => document.querySelector('.wg-note')?.textContent ?? '');
  check(/New in your album/.test(note), 'a first find says "New in your album"', note);
  check(/2\/24/.test(await alex.evaluate(() => document.querySelector('.wg-album-count').textContent)), 'the album says 2/24');

  // Pick 10: the mint's album page remembers the film it bloomed during and who was there.
  await alex.evaluate(() => document.querySelectorAll('.wg-album-cell')[1].click());
  const pageText = await alex.evaluate(() => { const p = document.querySelector('.wg-page'); return p && !p.hidden ? p.textContent : null; });
  check(!!pageText && /Mint ×1/.test(pageText) && /with Sam/.test(pageText), 'the album page remembers the film and who was in the room', String(pageText));
  check((await fits(alex)).length === 0, 'the album page fits', (await fits(alex)).join('; '));
  await alex.evaluate(() => document.querySelector('.wg-page-close').click());

  // Pick 7: a colour seed grows a coloured plant.
  await alex.click('.wg-pot[data-pot="0"]');
  await alex.click('.wg-action .wg-btn.seed-color');
  const colored = await until(async () => { const s = await saved(alex); return s.pots[0]?.color ? s : null; }, 4000);
  check(!!colored && colored.pots[0].plant === 'mint' && colored.pots[0].color === 'sky' && colored.colorSeeds.length === 0, 'a colour seed grows a sky blue mint', JSON.stringify(colored?.pots[0]));
  check(await alex.evaluate(() => /^(night|dawn|day|dusk)$/.test(document.querySelector('.wg-scene').dataset.time)), 'the sky outside follows the time of day');

  // Pick 6: petals from picking buy decorations; the 🎨 window lists them and the night visitors.
  const petals = (await saved(alex)).petals;
  check(petals >= 3, 'picking gave petals (3 for a new album entry)', String(petals));
  await alex.evaluate(() => document.querySelector('.wg-decor-open').click());
  await alex.evaluate(() => document.querySelector('.wg-decor-item .wg-btn.main')?.click());
  const bought = await until(async () => { const s = await saved(alex); return s.decor.length ? s : null; }, 4000);
  check(!!bought && bought.decor[0] === 'curtains', 'the curtains are bought with petals', JSON.stringify(bought?.decor));
  check(await alex.evaluate(() => getComputedStyle(document.querySelector('.wg-decor-layer [data-decor="curtains"]')).display !== 'none'), 'the curtains hang at the window');
  check((await fits(alex)).length === 0, 'the decorations window fits', (await fits(alex)).join('; '));
  await alex.evaluate(() => document.querySelector('.wg-page-close').click());

  // Stub the grow lamp (pick 9): once per film, on a growing plant.
  await alex.click('.wg-pot[data-pot="1"]');
  await alex.evaluate(() => document.querySelector('.wg-action .wg-btn.lamp')?.click());
  const lit = await until(async () => { const s = await saved(alex); return s.lamp ? s : null; }, 6000);
  check(!!lit && lit.lamp.pot === 1, 'Stub shines on the chosen pot (saved with the film)', JSON.stringify(lit?.lamp));
  check(await alex.evaluate(() => !!document.querySelector('.wg-pot[data-pot="1"] .wg-lamp svg')), 'Stub is drawn over that pot');
  await alex.click('.wg-pot[data-pot="2"]');
  const again = await alex.evaluate(() => { const b = document.querySelector('.wg-action .wg-btn.lamp'); return b ? b.disabled : 'none'; });
  check(again === true || again === 'none', 'only once per film: no second lamp', String(again));
  await alex.click('.wg-pot[data-pot="1"]');
  await alex.screenshot({ path: __dirname + '/garden-window.png' });

  // Pick 11 B: a long film that ended while I was in the room (noted by the room page) gives its seed.
  const seedsBefore = (await saved(alex)).seeds;
  await alex.evaluate(() => localStorage.setItem('sideFilms', JSON.stringify([{ id: 'long-film-1', duration: 1500, at: Date.now() }])));
  const gotSeed = await until(async () => { const s = await saved(alex); return s.ended.includes('long-film-1') ? s : null; }, 8000);
  check(!!gotSeed && gotSeed.seeds.uncommon + gotSeed.seeds.rare > seedsBefore.uncommon + seedsBefore.rare, 'a film that ended while I was in the room gives a seed', JSON.stringify(gotSeed?.seeds));

  // Smaller screen.
  await alex.setViewportSize({ width: 900, height: 560 });
  await wait(600);
  check((await fits(alex)).length === 0, 'fits a 900×560 window', (await fits(alex)).join('; '));

  // QA3 (d): a wide, low game window (an upright tablet's panel under the video, about 796 × 460): the sill beside the
  // pot's card and the album, not a strip across the top.
  await alex.setViewportSize({ width: 1366, height: 900 });
  await wait(400);
  const strip = await alex.evaluate(() => {
    const stage = document.querySelector('#game-stage');
    const win = stage.closest('.game-window, [class*=float]') || stage.parentElement;
    Object.assign(win.style, { left: '10px', top: '60px', width: '796px', height: '460px', maxWidth: 'none', maxHeight: 'none' });
    // The fit wrapper (`.game-fit`) settles on the new size after a resize observer and a frame or two.
    return new Promise((done) => setTimeout(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect();
      const scene = r('#game-stage .wg-scene'); const album = r('#game-stage .wg-album');
      done({ sceneW: Math.round(scene.width), sceneH: Math.round(scene.height), besideAlbum: album.left >= scene.right, album: [Math.round(album.left), Math.round(album.width)], sceneL: Math.round(scene.left) });
    }, 900));
  });
  check(strip.besideAlbum && strip.sceneH >= 0.6 * strip.sceneW, 'a wide, low window: the sill stands beside the album, not a strip', JSON.stringify(strip));
  await alex.setViewportSize({ width: 900, height: 560 });
  await wait(400);

  // Phone.
  const phone = await browser.newContext({ ...devices['iPhone 13'] });
  const pam = await person(phone, 'Pam', 'elf');
  check(await openGarden(pam), 'phone: it opens');
  await wait(500);
  check((await fits(pam)).length === 0, 'phone: fits without scrollbars', (await fits(pam)).join('; '));
  await pam.screenshot({ path: __dirname + '/garden-phone.png' });

  // QA3 (d): a sideways phone: the album's eight 44 px cells stay inside the window (two of them ran past its edge).
  const side = await browser.newContext({ ...devices['iPhone 13 landscape'] });
  const sid = await person(side, 'Sid', 'elf');
  check(await openGarden(sid), 'sideways phone: it opens');
  await wait(500);
  const albumEdge = await sid.evaluate(() => {
    // Against the column the album shares with the pot's card (the window's padding hid an overflow of 10 px).
    const box = { right: document.querySelector('#game-stage .wg-action').getBoundingClientRect().right, bottom: document.querySelector('#game-stage .wg').getBoundingClientRect().bottom };
    const cells = [...document.querySelectorAll('#game-stage .wg-album-cell')].map((c) => c.getBoundingClientRect());
    return { cells: cells.length, out: cells.filter((c) => c.right > box.right + 0.5 || c.bottom > box.bottom + 0.5).length, small: cells.filter((c) => c.width < 44 || c.height < 44).length };
  });
  check(albumEdge.cells === 8 && albumEdge.out === 0 && albumEdge.small === 0, 'sideways phone: the album stays inside the window, every cell ≥ 44 px', JSON.stringify(albumEdge));
  check((await fits(sid)).length === 0, 'sideways phone: fits without scrollbars', (await fits(sid)).join('; '));

  // 0.9.97.119: the body follows a light theme (Matinee): dark words on light cards; Night keeps its own colours.
  const look = () => alex.evaluate(() => {
    const lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
    const wg = document.querySelector('.wg');
    const bg = getComputedStyle(wg).backgroundImage.match(/rgba?\([^)]+\)/)?.[0] ?? 'rgb(0,0,0)';
    return { bg: lum(bg), text: lum(getComputedStyle(document.querySelector('.wg-action-title')).color) };
  });
  const night = await look();
  check(night.bg < 0.3 && night.text > 0.7, 'Night: the garden keeps its night colours', JSON.stringify(night));
  await alex.evaluate(() => document.documentElement.setAttribute('data-theme', 'matinee'));
  await wait(300);
  const matinee = await look();
  check(matinee.bg > 0.7 && matinee.text < 0.3, 'Matinee: a light body with dark words', JSON.stringify(matinee));

  void sam;
  await browser.close();
  console.log(failed ? `\n✗ ${failed} checks failed` : '\n✓ Window Garden harness passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
