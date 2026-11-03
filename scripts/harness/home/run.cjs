// Card 15 (owner's pick A, "two screens, one moment"): the home page's hero shows a laptop and a phone in the same room,
// the same video moving at the same second on both (one shared animation), a sync line between them and a message
// passing from one to the other; three short features right under it; no theme picker (card 6g.4: Gece by default,
// the theme is changed inside the room). At 1920, 1366 and
// 1024 px the hero fits the first screen; at 390 px (a phone) the home stays the app start screen (no hero picture, no
// strip). No console errors; screenshots in the output folder.
//
//   npm run dev, then: NODE_PATH=$(npm root -g) node scripts/harness/home/run.cjs [site] [out-folder]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:5173';
const OUT = process.argv[3] || '.';
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};

(async () => {
  const browser = await chromium.launch();
  const sizes = [
    ['1920', { viewport: { width: 1920, height: 1080 } }],
    ['1366', { viewport: { width: 1366, height: 768 } }],
    ['1024', { viewport: { width: 1024, height: 768 } }],
    ['390', devices['iPhone 13']],
  ];
  for (const lang of ['en', 'tr']) {
    for (const [name, opts] of sizes) {
      const ctx = await browser.newContext(opts);
      await ctx.addInitScript((lang) => localStorage.setItem('lang', lang), lang);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
      await page.goto(SITE);
      await page.waitForSelector('.home-hero');
      await page.waitForTimeout(700);
      const where = `${lang} ${name}`;
      const m = await page.evaluate(() => {
        const box = (s) => {
          const e = document.querySelector(s);
          if (!e) return null;
          const r = e.getBoundingClientRect();
          const st = getComputedStyle(e);
          return { x: Math.round(r.left), y: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: Math.round(r.width), h: Math.round(r.height), shown: r.width > 0 && st.display !== 'none' && st.visibility !== 'hidden' };
        };
        const bars = [...document.querySelectorAll('.ts-bar i')].map((i) => i.getAnimations()[0]?.currentTime ?? null);
        return {
          vh: innerHeight,
          vw: innerWidth,
          scrollW: document.documentElement.scrollWidth,
          hero: box('.home-hero'),
          laptop: box('.ts-laptop'),
          phone: box('.ts-phone'),
          sync: box('.ts-sync'),
          strip: box('.home-strip'),
          themes: box('.home-themes'),
          theme: document.documentElement.dataset.theme,
          strips: [...document.querySelectorAll('.home-strip > div')].map((d) => d.innerText.trim().split('\n')[0]),
          bars,
        };
      });
      check(m.scrollW <= m.vw, `${where}: no sideways scroll`, { scrollW: m.scrollW, vw: m.vw });
      check(!m.themes && m.theme === 'gece', `${where}: no theme picker on the home page, Gece in a fresh browser (card 6g.4)`, m.theme);
      if (name === '390') {
        check(!m.laptop.shown && !m.strip.shown, `${where}: the phone home stays the app start screen (no hero picture, no strip)`, { laptop: m.laptop.shown, strip: m.strip.shown });
      } else {
        check(m.laptop.shown && m.phone.shown && m.phone.x > m.laptop.x, `${where}: a laptop and a phone side by side`, { laptop: m.laptop, phone: m.phone });
        check(m.sync.shown && m.sync.x >= m.laptop.r - 8 && m.sync.r <= m.phone.x + 8, `${where}: the sync line runs between them`, m.sync);
        check(m.bars.length === 2 && m.bars[0] !== null && Math.abs(m.bars[0] - m.bars[1]) < 50, `${where}: the same video at the same second on both screens`, m.bars);
        check(m.hero.b <= m.vh, `${where}: the hero fits the first screen`, { heroBottom: m.hero.b, vh: m.vh });
        check(m.strip.shown && m.strips.length === 3 && m.strip.y >= m.hero.b, `${where}: three features right under the hero`, m.strips);
      }
      check(errors.length === 0, `${where}: no console errors`, errors);
      await page.screenshot({ path: `${OUT}/home-${lang}-${name}.png` });
      await ctx.close();
    }
  }
  // Reduced motion: the screens stand still.
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(SITE);
  await page.waitForSelector('.ts-bar i');
  const still = await page.evaluate(() => [...document.querySelectorAll('.ts-bar i, .ts-bubble')].every((e) => e.getAnimations().length === 0));
  check(still, 'reduced motion: nothing moves');
  await ctx.close();
  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Home page hero A works');
  process.exit(failed ? 1 : 0);
})();
