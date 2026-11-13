// Card SIMP1 (owner, 10 Nov 2026): a calmer room screen and Settings in categories. Grew from card 6b's settings-solo
// check (a section's rows must not wrap word by word or scroll inside the dialog). At phone, tablet, laptop and desktop
// sizes, in English and Turkish:
//   - the room screen has no footer line and no visible room name / people count (the name stays the page's heading
//     for screen readers); the join screen has no footer line, its links sit behind ⓘ;
//   - ⚙️ opens Settings with the category list beside it, the same order everywhere (Me · My screen · Room · Room rules
//     · Film time · Sound & camera · About); "⋯ More" items open at their own category;
//   - every category fits without scrolling inside (Room rules in two groups, Playback / In the room), no row title
//     wraps over 2 lines (computer sizes);
//   - the moved items are there: Room shows the room's name and count, Me has "Move to another device", About shows
//     the version and the privacy / terms links, Sound & camera has the "Who sees what" link to the privacy policy's
//     voice section; the profile menu no longer has "Move to another device";
//   - there is no IP notice: "Join voice" goes straight to the pre-join check.
//
//   NODE_PATH=$(npm root -g) node scripts/harness/settings/run.cjs [site]   (site default http://localhost:8787)
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};

const ORDER = ['me', 'view', 'room', 'rules', 'schedule', 'sound', 'about'];

const MEASURE = () => {
  const dialog = document.querySelector('#settings-dialog .settings-window');
  const main = document.querySelector('#settings-dialog .settings-main');
  const nav = document.querySelector('#settings-dialog .settings-nav');
  const sec = [...document.querySelectorAll('#settings-dialog .settings-sec')].find((s) => !s.hidden);
  const d = dialog.getBoundingClientRect();
  const lines = (el) => {
    const r = el.getBoundingClientRect();
    const lh = parseFloat(getComputedStyle(el).lineHeight) || parseFloat(getComputedStyle(el).fontSize) * 1.3;
    return Math.round(r.height / lh);
  };
  const titles = [...sec.querySelectorAll('.set-row .set-text > b')].filter((b) => b.getBoundingClientRect().height > 0);
  return {
    dialog: { w: Math.round(d.width), top: Math.round(d.top), bottom: Math.round(d.bottom) },
    sec: sec.dataset.sec,
    nav: getComputedStyle(nav).display !== 'none' && nav.getBoundingClientRect().height > 0,
    order: [...nav.querySelectorAll('[data-sec]')].filter((b) => !b.hidden).map((b) => b.dataset.sec),
    worst: titles.reduce((m, b) => Math.max(m, lines(b)), 0),
    worstText: titles.sort((a, b) => lines(b) - lines(a))[0]?.textContent ?? '',
    over: Math.max(main.scrollHeight - main.clientHeight, dialog.scrollHeight - dialog.clientHeight, nav.scrollWidth - nav.clientWidth),
    vh: innerHeight,
  };
};

const SIZES = [
  ['phone', { ...devices['iPhone 13'] }],
  ['tablet', { viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true }],
  ['laptop', { viewport: { width: 1366, height: 768 } }],
  ['desktop', { viewport: { width: 1920, height: 1080 } }],
];

(async () => {
  const browser = await chromium.launch();
  for (const lang of ['en', 'tr']) {
    for (const [size, options] of SIZES) {
      const where = `${lang} ${size}`;
      const ctx = await browser.newContext(options);
      await ctx.addInitScript((lang) => {
        localStorage.setItem('tipsSeen', '1');
        localStorage.setItem('lang', lang);
        localStorage.setItem('opt:autoInvite', '0');
        localStorage.setItem('extUpdateSeen', '9');
      }, lang);
      const page = await ctx.newPage();
      page.on('pageerror', (e) => check(false, `${where}: no page error`, e.message));
      await page.goto(`${SITE}/r/set${Math.random().toString(36).slice(2, 7)}`);
      await page.waitForSelector('#name');

      // The join screen: no footer line, the links behind ⓘ.
      check(!(await page.isVisible('.footer')) && !(await page.isVisible('#join-privacy')), `${where} join: no footer line and no visible privacy line`);
      await page.click('.join-info summary');
      const href = await page.evaluate(() => document.querySelector('#join-privacy')?.getAttribute('href'));
      check((await page.isVisible('#join-privacy')) && (await page.isVisible('#join-terms')) && href === `/privacy.html?lang=${lang}`, `${where} join: ⓘ shows privacy and terms in the page language`, href);
      await page.click('.join-info summary');

      await page.fill('#name', 'Alex');
      await page.click('#name-form button.primary');
      await page.waitForSelector('.room-title-dot[data-status="open"]', { state: 'attached', timeout: 20000 });
      await page.waitForTimeout(800);

      // The room screen: no footer line, no visible name or count (the name is still the heading for screen readers).
      const top = await page.evaluate(() => {
        const name = document.querySelector('.room-title-name');
        const count = document.querySelector('.room-title-count');
        const seen = (el) => !!el && el.getBoundingClientRect().width > 2 && el.getBoundingClientRect().height > 2;
        return { name: seen(name), count: seen(count), heading: name?.tagName === 'H1' && (name.textContent ?? '').length > 0, version: document.querySelector('.footer-version')?.textContent?.trim() ?? '' };
      });
      check(!(await page.isVisible('.footer')), `${where} room: the footer line is gone`);
      check(!top.name && !top.count && top.heading, `${where} room: the name and count are not shown (the heading stays for screen readers)`, top);
      check(!(await page.isVisible('#profile-move')) && !(await page.$('#profile-move')), `${where} room: the profile menu has no "Move to another device"`);
      check(!(await page.$('#voice-ip')), `${where} room: no "people in voice can see your IP" line`);

      // PH1: a phone has no settings window: the Me tab holds every category as a card, in the same order.
      if (size === 'phone') {
        await page.getByRole('tab', { name: lang === 'tr' ? 'Ben' : 'Me', exact: true }).click();
        await page.waitForTimeout(300);
        const me = await page.evaluate(() => ({
          order: [...document.querySelectorAll('.ph-me .settings-sec')].map((x) => x.dataset.sec),
          shown: [...document.querySelectorAll('.ph-me .settings-sec')].every((x) => x.getBoundingClientRect().height > 0),
          dialog: !document.getElementById('settings-dialog')?.hidden && !!document.querySelector('#settings-dialog[open]'),
          roomName: document.getElementById('settings-room-name')?.textContent ?? '',
          version: document.getElementById('settings-version')?.textContent ?? '',
        }));
        check(JSON.stringify(me.order) === JSON.stringify(ORDER) && me.shown && !me.dialog, `${where}: the Me tab shows every category in order, no window`, me);
        check(me.roomName.length > 0 && me.roomName === (await page.textContent('.room-title-name')) && /^v\d/.test(me.version), `${where}: Me tab → Room has the room's name, About the version`, me);
        await page.click('#settings-move');
        const moveOpen = await page.waitForFunction(() => [...document.querySelectorAll('.dialog-backdrop:not([hidden]), dialog[open]')].some((d) => d.id !== 'settings-dialog'), null, { timeout: 6000 }).then(() => true, () => false);
        check(moveOpen, `${where}: Me tab → Move to another device opens its window`);
        await ctx.close();
        continue;
      }

      // ⚙️ opens Settings with the categories beside it.
      const openSettings = () => page.click('#settings-open');
      await openSettings();
      await page.waitForSelector('#settings-dialog:not([hidden])');
      await page.waitForTimeout(250);
      const first = await page.evaluate(MEASURE);
      check(first.sec === 'view' && first.nav, `${where}: ⚙️ opens "My screen" with the category list beside it`, { sec: first.sec, nav: first.nav });
      check(JSON.stringify(first.order) === JSON.stringify(ORDER), `${where}: the categories in the same order everywhere (host sees Film time)`, first.order);
      for (const sec of ORDER) {
        await page.click(`#settings-dialog .settings-nav [data-sec="${sec}"]`);
        await page.waitForTimeout(120);
        const m = await page.evaluate(MEASURE);
        check(m.sec === sec, `${where} ${sec}: the right category shows`, m.sec);
        check(m.over <= 1 && m.dialog.top >= 0 && m.dialog.bottom <= m.vh + 1, `${where} ${sec}: fits without scrolling inside`, { over: m.over, ...m.dialog, vh: m.vh });
        if (size === 'laptop' || size === 'desktop') check(m.worst <= 2, `${where} ${sec}: no row title wraps over 2 lines`, { lines: m.worst, title: m.worstText });
        // Room rules in two groups (Planner's pick C): the other group fits too, and each shows only its own rows.
        if (sec === 'rules') {
          await page.click('.rules-groups [data-rules="room"]');
          const r = await page.evaluate(MEASURE);
          const rows = await page.evaluate(() => [...document.querySelectorAll('.rules-box .set-row')].filter((x) => x.getBoundingClientRect().height > 0).map((x) => x.dataset.group));
          check(r.over <= 1 && rows.length === 5 && rows.every((g) => g === 'room'), `${where} rules → In the room: its five rows, no scrolling`, { over: r.over, rows });
          await page.click('.rules-groups [data-rules="play"]');
        }
      }

      // What moved in is there.
      const moved = await page.evaluate(() => ({
        roomName: document.getElementById('settings-room-name')?.textContent ?? '',
        heading: document.querySelector('.room-title-name')?.textContent ?? '',
        count: document.getElementById('settings-room-count')?.textContent ?? '',
        move: !!document.getElementById('settings-move'),
        version: document.getElementById('settings-version')?.textContent ?? '',
        privacy: document.getElementById('about-privacy')?.getAttribute('href'),
        terms: document.getElementById('about-terms')?.getAttribute('href'),
        whoSees: document.getElementById('settings-who-sees')?.getAttribute('href'),
      }));
      check(moved.roomName.length > 0 && moved.roomName === moved.heading && /1/.test(moved.count), `${where}: Room shows the room's name and "1 person"`, moved);
      check(moved.move, `${where}: Me has "Move to another device"`);
      check(moved.version === top.version && /^v\d/.test(moved.version), `${where}: About shows the site's version`, moved.version);
      check(moved.privacy === `/privacy.html?lang=${lang}` && moved.terms === `/terms.html?lang=${lang}`, `${where}: About links privacy and terms in the page language`, moved);
      check(moved.whoSees === `/privacy.html?lang=${lang}#${lang === 'tr' ? 'voice-tr' : 'voice'}`, `${where}: Sound & camera links the policy's voice section`, moved.whoSees);
      await page.keyboard.press('Escape');

      // "⋯ More" items open at their own category (computer sizes have the top-bar menu).
      if (await page.isVisible('#room-more')) {
        for (const [icon, sec] of [['⏰', 'schedule'], ['💾', 'room'], ['👑', 'rules']]) {
          await page.click('#room-more');
          await page.click(`.room-more-pop .room-more-item:has-text("${icon}")`);
          await page.waitForSelector('#settings-dialog:not([hidden])');
          const m = await page.evaluate(MEASURE);
          check(m.sec === sec && m.nav, `${where}: ⋯ More ${icon} opens "${sec}" with the list beside it`, { sec: m.sec, nav: m.nav });
          await page.keyboard.press('Escape');
        }
      }

      // Me → Move to another device opens its window (two clicks from ⚙️).
      await openSettings();
      await page.click('#settings-dialog .settings-nav [data-sec="me"]');
      await page.click('#settings-move');
      const moveOpen = await page.waitForFunction(() => [...document.querySelectorAll('.dialog-backdrop:not([hidden]), dialog[open]')].some((d) => d.id !== 'settings-dialog'), null, { timeout: 6000 }).then(() => true, () => false);
      check(moveOpen && (await page.isHidden('#settings-dialog')), `${where}: Me → Move to another device opens its window`);
      await page.keyboard.press('Escape');
      await ctx.close();
    }
  }

  // No IP notice: "Join voice" goes straight to the pre-join check (a fake microphone, on a computer).
  {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['microphone', 'camera'] });
    await ctx.addInitScript(() => {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', 'en');
      localStorage.setItem('opt:autoInvite', '0');
    });
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/setv${Math.random().toString(36).slice(2, 7)}`);
    await page.fill('#name', 'Alex');
    await page.click('#name-form button.primary');
    await page.waitForSelector('#voice-join:not([hidden])', { timeout: 20000 });
    await page.click('#voice-join');
    const next = await page
      .waitForFunction(() => (document.querySelector('.voice-check') ? 'check' : document.querySelector('.ip-notice') ? 'notice' : null), null, { timeout: 8000 })
      .then((h) => h.jsonValue(), () => null);
    check(next === 'check', 'voice: "Join voice" opens the pre-join check, no IP notice first', next);
    await ctx.close();
  }

  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Settings in categories; the room screen is calmer');
  process.exit(failed ? 1 : 0);
})();
