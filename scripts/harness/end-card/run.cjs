// Card EC1: the "Video ended / ▶ Start next / Close" card is a centered dialog over the room view (not a note in the
// chat), on a computer, a phone and a tablet, English and Turkish. It opens through the Test Lab (`endcard.show`)
// while a video file plays, and closes with Esc, a click outside, Close, "Start next" and when the next video starts.
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 --var SWM_LAB_SERVER:1)
//   NODE_PATH=$(npm root -g) node scripts/harness/end-card/run.cjs [http://localhost:8787] [http://localhost:5300/video.webm] [out-dir]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
const OUT = process.argv[4] || require('os').tmpdir();
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [label, options, lang] of [
    ['computer', { viewport: { width: 1366, height: 768 } }, 'en'],
    ['phone', { ...devices['iPhone 13'] }, 'tr'],
    ['tablet', { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true }, 'en'],
  ]) {
    const ctx = await browser.newContext(options);
    await ctx.addInitScript((l) => {
      try {
        localStorage.setItem('tipsSeen', '1');
        localStorage.setItem('lang', l);
        localStorage.setItem('opt:autoInvite', '0');
      } catch {}
    }, lang);
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/ec${Math.random().toString(36).slice(2, 8)}?debug=1`);
    await page.fill('#name', 'Alex');
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    const play = (url) =>
      page.evaluate((u) => {
        const input = document.getElementById('media-input');
        input.value = u;
        input.form.requestSubmit(input.form.querySelector('button[value=load]'));
      }, url);
    await play(VIDEO);
    await page.waitForFunction(() => (document.querySelector('#player video')?.currentTime ?? 0) > 0.3, null, { timeout: 15000 }).catch(() => {});
    const lab = (id) => page.evaluate(async (c) => (await window.__swmLab.run(c)).text, id);
    const open = async () => {
      await lab('endcard.show');
      return page.waitForSelector('.end-backdrop .end-dialog', { timeout: 5000 }).then(() => true).catch(() => false);
    };
    const isOpen = () => page.evaluate(() => !!document.querySelector('.end-backdrop'));

    check(await open(), `${label}: the Test Lab opens the "Video ended" card`);
    await page.waitForTimeout(400);
    const box = await page.evaluate(() => {
      const d = document.querySelector('.end-dialog');
      const r = d.getBoundingClientRect();
      const title = d.querySelector('.end-title');
      const line = parseFloat(getComputedStyle(title).lineHeight);
      const buttons = [...d.querySelectorAll('.end-buttons .btn')].map((b) => {
        const br = b.getBoundingClientRect();
        return { text: b.textContent.trim(), w: Math.round(br.width), h: Math.round(br.height) };
      });
      const link = d.querySelector('.end-link');
      return {
        dx: Math.round(r.left + r.width / 2 - innerWidth / 2),
        dy: Math.round(r.top + r.height / 2 - innerHeight / 2),
        inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight,
        scrolls: d.scrollHeight > d.clientHeight + 1,
        lines: Math.round(title.getBoundingClientRect().height / line),
        underline: getComputedStyle(title).textDecorationLine,
        link: link ? { text: link.textContent, name: link.getAttribute('aria-label'), w: Math.round(link.getBoundingClientRect().width) } : null,
        focus: document.activeElement?.classList.contains('end-next') ?? false,
        kicker: d.querySelector('.end-kicker')?.textContent,
        inChat: !!document.querySelector('.side .end-card, .yt-notices .end-card, .end-card'),
        buttons,
      };
    });
    await page.screenshot({ path: `${OUT}/end-card-${label}-${lang}.png` });
    const words = lang === 'tr' ? /Video bitti/ : /Video ended/;
    check(Math.abs(box.dx) <= 2 && Math.abs(box.dy) <= innerHeightTolerance(options) && box.inView && !box.scrolls, `${label}: the card sits in the middle of the screen, whole, without a scrollbar`, JSON.stringify(box));
    check(words.test(box.kicker ?? '') && box.lines <= 2 && box.underline === 'none' && box.link?.text === '↗' && !!box.link.name && box.link.w >= 24, `${label}: "${lang === 'tr' ? 'Video bitti' : 'Video ended'}", a plain title in at most 2 lines, the link only a small ↗`, JSON.stringify(box));
    check(box.focus && !box.inChat, `${label}: focus starts on "Start next"; nothing in the chat`, JSON.stringify(box));
    if (label === 'phone') {
      const [a, b] = box.buttons;
      check(!!a && !!b && a.h >= 44 && b.h >= 44 && Math.abs(a.w - b.w) <= 2, `${label}: the two buttons share the width, ≥ 44 px`, JSON.stringify(box.buttons));
    }
    const read = await lab('endcard.show');
    check(/"open":"dialog"/.test(read), `${label}: endcard.show reports the open dialog`, read);

    // Esc, a click outside, Close and "Start next" all close it.
    await page.keyboard.press('Escape');
    check(!(await isOpen()), `${label}: Esc closes it`);
    await open();
    await page.mouse.click(5, Math.round((options.viewport?.height ?? 600) - 5));
    check(!(await isOpen()), `${label}: a click outside closes it`);
    await open();
    await page.click('.end-close');
    check(!(await isOpen()), `${label}: Close closes it`);
    await open();
    await page.click('.end-next');
    check(!(await isOpen()), `${label}: "Start next" closes it`);
    // Someone else starts the next video: the card goes away by itself.
    await open();
    await play(`${VIDEO}?second`);
    const gone = await page.waitForFunction(() => !document.querySelector('.end-backdrop'), null, { timeout: 8000 }).then(() => true).catch(() => false);
    check(gone, `${label}: the card closes when the next video starts`);
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ The "Video ended" card is a centered dialog');
  process.exit(fails ? 1 : 0);

  /** The dialog is centered; a phone's browser bars may shift it a little. */
  function innerHeightTolerance(options) {
    return options.isMobile ? 40 : 2;
  }
})();
