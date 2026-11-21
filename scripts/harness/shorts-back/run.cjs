// Card SH1 (1): the way back into the Shorts view. After "↩ Room view" a phone (Room tab) shows "📱 Shorts view" in
// the strip under the video while a Short plays, and it works any number of times; a computer keeps its own
// "📱 Shorts view" button. YouTube's player is the test stand-in (fake-youtube.cjs, card CI4).
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/shorts-back/run.cjs [http://localhost:8787] [out-dir]
const { fakeYouTube } = require('../fake-youtube.cjs');
const { phoneReady } = require('../phone-ready.cjs');
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || require('os').tmpdir();
const SHORT = 'https://www.youtube.com/shorts/aqz-KE-bpKQ';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};

(async () => {
  const browser = await chromium.launch();
  for (const [label, options, lang] of [
    ['phone', { ...devices['Pixel 7'] }, 'tr'],
    ['phone', { ...devices['iPhone 13'] }, 'en'],
    ['computer', { viewport: { width: 1366, height: 768 } }, 'en'],
    ['tablet', { ...devices['iPad Mini'] }, 'en'],
    ['tablet', { ...devices['iPad Mini landscape'] }, 'tr'],
  ]) {
    const ctx = await browser.newContext(options);
    await fakeYouTube(ctx);
    await ctx.addInitScript((l) => {
      try {
        localStorage.setItem('tipsSeen', '1');
        localStorage.setItem('lang', l);
        localStorage.setItem('opt:autoInvite', '0');
      } catch {}
    }, lang);
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/sb${Math.random().toString(36).slice(2, 8)}?debug=1`);
    await page.fill('#name', 'Alex');
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await phoneReady(page);
    if (!(await page.isVisible('#media-input'))) await page.click('#ph-tab-search');
    await page.fill('#media-input', SHORT);
    await page.click('#media-form button[value=load]');
    const inShorts = () => page.evaluate(() => document.documentElement.classList.contains('shorts-view'));
    const opened = await page.waitForFunction(() => document.documentElement.classList.contains('shorts-view'), null, { timeout: 15000 }).then(() => true).catch(() => false);
    check(opened, `${label} ${lang}: a Short opens the Shorts view`);
    const name = label === 'computer' ? label : `${label}-${lang}`;
    for (let round = 1; round <= 3; round++) {
      // A phone leaves through ⋯ → ↩ Room view; a computer has the button in the Shorts bar.
      if (label === 'phone') {
        await page.click('#ph-shorts-more');
        await page.click(`.ph-sheet .ph-row:has-text("${lang === 'tr' ? 'Oda görünümü' : 'Room view'}")`);
      } else await page.click('#shorts-exit');
      await page.waitForFunction(() => !document.documentElement.classList.contains('shorts-view'), null, { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(500);
      const sel = label === 'phone' ? '.ph-shorts-back' : '#shorts-enter';
      // The button is there and not covered (the room's intro may still be fading out for a moment).
      await page.waitForFunction((s) => {
        const b = document.querySelector(s);
        const r = b?.getBoundingClientRect();
        return !!r && r.width > 0 && b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
      }, sel, { timeout: 3000 }).catch(() => {});
      const back = await page.evaluate((s) => {
        const b = document.querySelector(s);
        if (!b || b.hidden || b.closest('[hidden]')) return null;
        const r = b.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return { text: b.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), onTop: !!top && b.contains(top), inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth };
      }, sel);
      if (round === 1) await page.screenshot({ path: `${OUT}/shorts-back-${name}.png` });
      const word = lang === 'tr' ? /Shorts görünümü/ : /Shorts view/;
      check(!(await inShorts()) && !!back && word.test(back.text) && back.onTop && back.inView && back.h >= (label === 'phone' ? 44 : 24), `${label} ${lang} round ${round}: after "↩ Room view" a clear "📱 Shorts view" is there`, JSON.stringify(back));
      if (round === 1) {
        const lab = await page.evaluate(async () => (await window.__swmLab.run('shorts.state')).text);
        check(/"view":"room"/.test(lab) && /"wayBack":true/.test(lab), `${label} ${lang}: shorts.state says the room view with the way back offered`, lab);
      }
      if (!back) break;
      await page.click(sel);
      const again = await page.waitForFunction(() => document.documentElement.classList.contains('shorts-view'), null, { timeout: 5000 }).then(() => true).catch(() => false);
      check(again, `${label} ${lang} round ${round}: it brings the Shorts view back`);
    }
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ The way back into the Shorts view works');
  process.exit(fails ? 1 : 0);
})();
