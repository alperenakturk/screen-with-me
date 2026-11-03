// Invite window (0.9.93.1, owner: "an invite screen when I enter the room, with a QR code"): it opens by itself when
// someone enters a room where nobody else is, the first-time tips wait for it, Copy puts the link on the clipboard,
// 🔗 Invite opens it again, a friend entering a room with people in it doesn't get it, and "show this when I'm alone"
// turned off keeps it away. Also the room title's "1 person", and a link pasted anywhere in the room goes to the queue.
// Needs Playwright and `npm run dev`:
//   NODE_PATH=$(npm root -g) node scripts/harness/invite/run.cjs [http://localhost:5173]
const { chromium, devices } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:5173';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};

(async () => {
  const browser = await chromium.launch();
  const room = `inv${Math.random().toString(36).slice(2, 7)}`;
  async function enter(name, opts = { viewport: { width: 1366, height: 768 } }, init = {}) {
    const ctx = await browser.newContext({ ...opts, permissions: ['clipboard-read', 'clipboard-write'] });
    await ctx.addInitScript((values) => {
      localStorage.setItem('lang', 'en');
      // Automated browsers only get the window when they ask for it (ui/invite.ts).
      if (!localStorage.getItem('opt:autoInvite')) localStorage.setItem('opt:autoInvite', '1');
      for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v);
    }, init);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => check(false, `${name}: no page errors`, e.message));
    await page.goto(`${SITE}/r/${room}`);
    await page.fill('#name', name);
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    return page;
  }

  // Alex is the first one in: the window opens by itself, the tips wait.
  const alex = await enter('Alex');
  const opened = await alex.waitForSelector('.invite-dialog', { timeout: 6000 }).then(() => true, () => false);
  check(opened, 'alone in the room: the invite window opens by itself');
  check(!(await alex.$('.first-tip')), 'the first-time tips wait while it is open');
  const link = await alex.inputValue('.invite-link');
  check(link.endsWith(`/r/${room}`), 'it shows the room link', link);
  check(await alex.evaluate(() => !!document.querySelector('.invite-actions a.invite-wa[href^="https://wa.me/?text="] svg.wa-glyph path')), 'a WhatsApp button with WhatsApp\'s own glyph');
  check(await alex.evaluate(() => getComputedStyle(document.querySelector('.invite-wa')).backgroundColor === 'rgb(37, 211, 102)'), 'in WhatsApp green');
  check(await alex.evaluate(() => document.querySelector('#invite-pane-qr').hidden && !document.querySelector('#invite-pane-link').hidden), 'the Link tab is open first');
  check((await alex.textContent('.room-title')).includes('1 person'), 'the title says "1 person"', await alex.textContent('.room-title'));
  await alex.click('.invite-copy');
  await alex.waitForTimeout(200);
  check((await alex.evaluate(() => navigator.clipboard.readText())) === link, 'Copy puts the link on the clipboard');
  check((await alex.textContent('.invite-copy')).includes('Copied'), 'Copy says it worked', await alex.textContent('.invite-copy'));
  const fit = await alex.evaluate(() => {
    const r = document.querySelector('.invite-dialog').getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
  });
  check(fit, 'the window fits the screen');
  // Card 4: the QR tab shows only the code, big, with "Copy image" (a PNG on the clipboard), no explanation sentence.
  await alex.click('.invite-tab[data-tab="qr"]');
  await alex.waitForTimeout(200);
  const qrTab = await alex.evaluate(() => {
    const pane = document.querySelector('#invite-pane-qr');
    const img = pane.querySelector('.invite-qr');
    return { shown: !pane.hidden, link: !document.querySelector('#invite-pane-link').hidden, w: img.getBoundingClientRect().width, loaded: img.naturalWidth > 0, text: pane.textContent.trim() };
  });
  check(qrTab.shown && !qrTab.link && qrTab.loaded && qrTab.w >= 200, 'QR tab: a big QR code', JSON.stringify(qrTab));
  check(qrTab.text === 'Copy image', 'QR tab: only "Copy image", no explanation sentence', qrTab.text);
  await alex.click('.invite-copy-image');
  await alex.waitForTimeout(500);
  const image = await alex.evaluate(async () => {
    const items = await navigator.clipboard.read();
    const item = items.find((i) => i.types.includes('image/png'));
    return item ? (await item.getType('image/png')).size : 0;
  });
  check(image > 1000, 'Copy image puts a PNG on the clipboard', `${image} bytes`);
  await alex.click('.invite-tab[data-tab="link"]');
  await alex.keyboard.press('Escape');
  await alex.waitForTimeout(300);
  check(!(await alex.$('.invite-dialog')), 'Esc closes it');
  await alex.waitForSelector('.first-tip', { timeout: 4000 }).catch(() => {});
  check(!!(await alex.$('.first-tip')), 'then the first-time tips come');
  await alex.evaluate(() => document.querySelector('.first-tip .icon-btn, .first-tip button:last-child')?.click());
  await alex.keyboard.press('Escape');

  // 🔗 Invite opens it again.
  await alex.click('#invite-btn');
  check(!!(await alex.waitForSelector('.invite-dialog', { timeout: 2000 }).catch(() => null)), '🔗 Invite opens it');
  await alex.click('.invite-close');

  // Sam comes into a room with someone in it: no window.
  const sam = await enter('Sam');
  await sam.waitForTimeout(2600);
  check(!(await sam.$('.invite-dialog')), 'a friend joining a room with people in it gets no window');
  check((await alex.textContent('.room-title')).includes('2 people'), 'the title says "2 people"');

  // A message while Alex's tab is in the background: "(1)" in the tab's title, gone when Alex comes back.
  await alex.evaluate(() => Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }));
  await sam.fill('#chat-input', 'hello there');
  await sam.press('#chat-input', 'Enter');
  await alex.waitForFunction(() => document.title.startsWith('(1) '), null, { timeout: 4000 }).catch(() => {});
  check((await alex.title()).startsWith('(1) '), 'a message in a background tab shows in its title', await alex.title());
  await alex.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  check(!(await alex.title()).startsWith('('), 'back on the tab the count goes', await alex.title());

  // Turned off in the window: a new empty room doesn't open it.
  await alex.click('#invite-btn');
  await alex.waitForSelector('.invite-dialog');
  await alex.uncheck('#invite-auto');
  check((await alex.evaluate(() => localStorage.getItem('opt:autoInvite'))) === '0', '"show when alone" off is remembered');
  await alex.click('.invite-close');
  await alex.goto(`${SITE}/r/${room}x`);
  await alex.fill('#name', 'Alex');
  await alex.click('#name-form button.primary');
  await alex.waitForSelector('.room');
  await alex.waitForTimeout(2600);
  check(!(await alex.$('.invite-dialog')), 'turned off: an empty room opens without it');

  // A link pasted anywhere in the room (outside a text box) goes to the queue / plays (0.9.93.1).
  await alex.evaluate(() => document.activeElement?.blur());
  await alex.evaluate(() => {
    const data = new DataTransfer();
    data.setData('text/plain', 'https://www.youtube.com/watch?v=M7lc1UVf-VE');
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  const pasted = await alex.waitForFunction(() => document.querySelector('#theater')?.classList.contains('yt-rail'), null, { timeout: 8000 }).then(() => true, () => false);
  check(pasted, 'a link pasted anywhere in the room plays');
  // Words pasted outside a box do nothing.
  const before = await alex.inputValue('#media-input');
  await alex.evaluate(() => {
    const data = new DataTransfer();
    data.setData('text/plain', 'just some words');
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  check((await alex.inputValue('#media-input')) === before, 'pasted words (not a link) are left alone');

  // Phone: a bottom-friendly window that fits.
  const phone = await enter('Pat', devices['iPhone 13'], {});
  await phone.goto(`${SITE}/r/${room}p`);
  await phone.fill('#name', 'Pat');
  await phone.click('#name-form button.primary');
  const onPhone = await phone.waitForSelector('.invite-dialog', { timeout: 6000 }).then(() => true, () => false);
  check(onPhone, 'phone: it opens there too');
  const phoneFit = await phone.evaluate(() => {
    const r = document.querySelector('.invite-dialog')?.getBoundingClientRect();
    return !!r && r.top >= 0 && r.bottom <= innerHeight && r.right <= innerWidth;
  });
  check(phoneFit, 'phone: the window fits the screen');
  await phone.click('.invite-tab[data-tab="qr"]');
  await phone.waitForTimeout(200);
  const phoneQr = await phone.evaluate(() => {
    const d = document.querySelector('.invite-dialog');
    const r = d.getBoundingClientRect();
    return { fits: r.top >= 0 && r.bottom <= innerHeight, scroll: d.scrollHeight > d.clientHeight + 1, w: document.querySelector('.invite-qr').getBoundingClientRect().width };
  });
  check(phoneQr.fits && !phoneQr.scroll && phoneQr.w >= 180, 'phone: the QR tab fits without scrolling', JSON.stringify(phoneQr));

  // 1024×640 (a small laptop): both tabs fit without scrolling.
  const small = await enter('Kim', { viewport: { width: 1024, height: 640 } }, {});
  await small.goto(`${SITE}/r/${room}s`);
  await small.fill('#name', 'Kim');
  await small.click('#name-form button.primary');
  await small.waitForSelector('.invite-dialog', { timeout: 6000 }).catch(() => {});
  const noScroll = () => small.evaluate(() => {
    const d = document.querySelector('.invite-dialog');
    const r = d.getBoundingClientRect();
    return r.top >= 0 && r.bottom <= innerHeight && d.scrollHeight <= d.clientHeight + 1;
  });
  const linkFits = await noScroll();
  await small.click('.invite-tab[data-tab="qr"]');
  await small.waitForTimeout(200);
  check(linkFits && (await noScroll()), '1024×640: both tabs fit without scrolling');

  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ Invite window works');
  process.exit(fails ? 1 : 0);
})();
