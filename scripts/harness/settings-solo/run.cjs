// Card 6b (owner's bug, 3 Nov 2026): a settings section opened alone (⚙️ = My screen; ⋯ More → Film time / Save the
// room / Room rules) used to sit in the hidden section list's narrow column, each row wrapping word by word and the
// list scrolling inside the dialog. For every solo section at laptop and monitor sizes, in English and Turkish: the
// section gets the dialog's width, no row title wraps over 2 lines, and nothing scrolls inside the dialog.
//
//   npm run dev, then: NODE_PATH=$(npm root -g) node scripts/harness/settings-solo/run.cjs [site]
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:5173';
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};

const MEASURE = () => {
  const dialog = document.querySelector('#settings-dialog .settings-window');
  const main = document.querySelector('#settings-dialog .settings-main');
  const sec = [...document.querySelectorAll('#settings-dialog .settings-sec')].find((s) => !s.hidden);
  const d = dialog.getBoundingClientRect();
  const lines = (el) => {
    const r = el.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.3;
    return Math.round(r.height / lh);
  };
  const titles = [...sec.querySelectorAll('.set-row .set-text > b')].filter((b) => b.getBoundingClientRect().height > 0);
  return {
    dialog: { w: Math.round(d.width), h: Math.round(d.height), top: Math.round(d.top), bottom: Math.round(d.bottom) },
    main: Math.round(main.getBoundingClientRect().width),
    sec: sec.dataset.sec,
    worst: titles.reduce((m, b) => Math.max(m, lines(b)), 0),
    worstText: titles.sort((a, b) => lines(b) - lines(a))[0]?.textContent ?? '',
    scrolls: main.scrollHeight > main.clientHeight + 1 || dialog.scrollHeight > dialog.clientHeight + 1,
    vh: innerHeight,
  };
};

(async () => {
  const browser = await chromium.launch();
  for (const lang of ['en', 'tr']) {
    for (const [w, h] of [
      [1366, 768],
      [1920, 1080],
    ]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      await ctx.addInitScript((lang) => {
        localStorage.setItem('tipsSeen', '1');
        localStorage.setItem('lang', lang);
        localStorage.setItem('opt:autoInvite', '0');
      }, lang);
      const page = await ctx.newPage();
      await page.goto(`${SITE}/r/solo${Math.random().toString(36).slice(2, 7)}`);
      await page.fill('#name', 'Alex');
      await page.click('#name-form button.primary');
      await page.waitForSelector('#room-more');
      await page.waitForTimeout(800);
      const where = `${lang} ${w}×${h}`;
      // ⚙️ = My screen; ⋯ More → each room section (the first person in is the host, so all of them show).
      const openers = [['view', async () => page.click('#settings-open')]];
      for (const [sec, icon] of [
        ['schedule', '⏰'],
        ['save', '💾'],
        ['rules', '👑'],
      ]) {
        openers.push([
          sec,
          async () => {
            await page.click('#room-more');
            await page.click(`.room-more-pop .room-more-item:has-text("${icon}")`);
          },
        ]);
      }
      for (const [sec, openIt] of openers) {
        await openIt();
        await page.waitForSelector('#settings-dialog:not([hidden])');
        await page.waitForTimeout(250);
        const m = await page.evaluate(MEASURE);
        check(m.sec === sec, `${where} ${sec}: the right section opens`, m.sec);
        check(m.main >= m.dialog.w - 4 && m.main >= 420, `${where} ${sec}: the section gets the dialog's width (no empty column)`, { main: m.main, dialog: m.dialog.w });
        check(m.worst <= 2, `${where} ${sec}: no row title wraps over 2 lines`, { lines: m.worst, title: m.worstText });
        check(!m.scrolls && m.dialog.top >= 0 && m.dialog.bottom <= m.vh, `${where} ${sec}: fits without scrolling inside`, m.dialog);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(150);
      }
      await ctx.close();
    }
  }
  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Settings sections opened alone fit');
  process.exit(failed ? 1 : 0);
})();
