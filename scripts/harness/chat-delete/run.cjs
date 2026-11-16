// Card MSG1: "Delete for everyone" as people see it. Computer (EN): Sam opens ⋯ on his own message, the menu offers
// "🗑 Delete for everyone", the question, then everyone sees "Sam deleted a message"; Sam has no ⋯ on Alex's message;
// Alex (host) deletes Sam's next one ("Alex (host) deleted Sam's message"); the lines stay after a reload. Phone
// (TR): Kim long-presses her bubble, the same menu opens ("🗑 Herkesten sil"). Test Lab hook `chat.delete`.
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 --var SWM_LAB_SERVER:1 --var LAB_CODE:harness-lab-code)
//   NODE_PATH=$(npm root -g) node scripts/harness/chat-delete/run.cjs [http://localhost:8787] [out-dir]
const { chromium, devices } = require('playwright');
const { phoneReady } = require('../phone-ready.cjs');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || require('os').tmpdir();
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};
const lab = async (page, id) => (await page.evaluate(async (id) => (await window.__swmLab.run(id)).text, id)).replace(/^\S+\s/, '');
const room = `del${Math.random().toString(36).slice(2, 8)}`;

async function join(browser, name, options, lang) {
  const ctx = await browser.newContext(options);
  await ctx.addInitScript((l) => {
    try {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', l);
      localStorage.setItem('opt:autoInvite', '0');
    } catch {}
  }, lang);
  const page = await ctx.newPage();
  await page.goto(`${SITE}/r/${room}?debug=harness-lab-code`);
  await page.fill('#name', name);
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await phoneReady(page);
  return { ctx, page };
}
const lineOf = (page, text) => page.locator('#chat-list .chat-line', { hasText: text });
async function say(page, text, others) {
  await page.fill('#chat-input', text);
  await page.press('#chat-input', 'Enter');
  for (const p of [page, ...others]) await lineOf(p, text).waitFor({ timeout: 10000 });
}
const deletedLines = (page) => page.$$eval('#chat-list .chat-deleted', (l) => l.map((x) => x.textContent.slice(x.querySelector('time').textContent.length).trim()));
const waitDeleted = (page, text) =>
  page.waitForFunction((t) => [...document.querySelectorAll('#chat-list .chat-deleted')].some((l) => l.textContent.includes(t)), text, { timeout: 10000 }).then(
    () => true,
    () => false,
  );
async function deleteByMenu(page, text) {
  const line = lineOf(page, text);
  await line.hover();
  await line.locator('.chat-more').click();
  await page.waitForSelector('.chat-menu:not([hidden])');
  const item = await page.textContent('.chat-menu-item');
  const focused = await page.evaluate(() => document.activeElement?.classList.contains('chat-menu-item'));
  await page.click('.chat-menu-item');
  await page.waitForSelector('.confirm-dialog');
  await page.click('.confirm-dialog .btn.primary');
  return { item, focused };
}

(async () => {
  const browser = await chromium.launch();
  const desk = { viewport: { width: 1366, height: 768 } };
  const alex = await join(browser, 'Alex', desk, 'en');
  const sam = await join(browser, 'Sam', desk, 'en');

  await say(alex.page, 'Hello from Alex', [sam.page]);
  await say(sam.page, 'Oops from Sam', [alex.page]);
  check((await lineOf(sam.page, 'Hello from Alex').locator('.chat-more').count()) === 0, 'computer: Sam has no ⋯ on Alex’s message');
  check((await lineOf(sam.page, 'Oops from Sam').locator('.chat-more').count()) === 1, 'computer: Sam has ⋯ on his own message');
  const hidden = await lineOf(sam.page, 'Oops from Sam').locator('.chat-more').evaluate((b) => getComputedStyle(b).opacity);
  check(hidden === '0', 'computer: ⋯ shows only on hover or focus', hidden);

  // Sam deletes his own message through the menu.
  const line = lineOf(sam.page, 'Oops from Sam');
  await line.hover();
  await line.locator('.chat-more').click();
  await sam.page.waitForSelector('.chat-menu:not([hidden])');
  await sam.page.screenshot({ path: `${OUT}/chat-delete-computer-menu.png` });
  const menuBox = await sam.page.$eval('.chat-menu', (m) => {
    const r = m.getBoundingClientRect();
    return { x: r.x, y: r.y, w: r.width, h: r.height, vw: innerWidth, vh: innerHeight };
  });
  check(menuBox.x >= 0 && menuBox.y >= 0 && menuBox.x + menuBox.w <= menuBox.vw && menuBox.y + menuBox.h <= menuBox.vh, 'computer: the menu sits inside the window', JSON.stringify(menuBox));
  check((await sam.page.textContent('.chat-menu-item')) === '🗑 Delete for everyone', 'computer: the menu offers "🗑 Delete for everyone"');
  await sam.page.keyboard.press('Escape');
  check(await sam.page.isHidden('.chat-menu'), 'computer: Esc closes the menu');
  const del = await deleteByMenu(sam.page, 'Oops from Sam');
  check(del.focused, 'computer: the menu opens with the focus on its item');
  check(await waitDeleted(alex.page, 'Sam deleted a message'), 'computer: Alex sees "Sam deleted a message"', JSON.stringify(await deletedLines(alex.page)));
  check(await waitDeleted(sam.page, 'Sam deleted a message'), 'computer: Sam sees it too');
  check((await lineOf(alex.page, 'Oops from Sam').count()) === 0, 'computer: the text is gone');

  // The host deletes Sam's next message.
  await say(sam.page, 'Rude from Sam', [alex.page]);
  check((await lineOf(alex.page, 'Rude from Sam').locator('.chat-more').count()) === 1, 'computer: the host has ⋯ on Sam’s message');
  await deleteByMenu(alex.page, 'Rude from Sam');
  check(await waitDeleted(sam.page, "Alex (host) deleted Sam's message"), 'computer: Sam sees "Alex (host) deleted Sam\'s message"', JSON.stringify(await deletedLines(sam.page)));
  await sam.page.screenshot({ path: `${OUT}/chat-delete-computer-lines.png` });

  // After a reload the lines are still there.
  await sam.page.reload();
  await sam.page.waitForSelector('.room');
  await lineOf(sam.page, 'Hello from Alex').waitFor({ timeout: 10000 });
  const after = await deletedLines(sam.page);
  check(after.length === 2 && after.includes('Sam deleted a message') && after.includes("Alex (host) deleted Sam's message"), 'computer: both lines stay after a reload', JSON.stringify(after));

  // Phone (TR): Kim long-presses her bubble.
  const kim = await join(browser, 'Kim', { ...devices['Pixel 7'] }, 'tr');
  await say(kim.page, 'Kim on the phone', [alex.page]);
  const bubble = lineOf(kim.page, 'Kim on the phone').locator('.chat-text');
  await bubble.scrollIntoViewIfNeeded();
  const box = await bubble.boundingBox();
  const cdp = await kim.ctx.newCDPSession(kim.page);
  const point = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] });
  const opened = await kim.page.waitForSelector('.chat-menu:not([hidden])', { timeout: 3000 }).then(
    () => true,
    () => false,
  );
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  check(opened, 'phone: a long press opens the message menu');
  check((await kim.page.textContent('.chat-menu-item').catch(() => '')) === '🗑 Herkesten sil', 'phone: it offers "🗑 Herkesten sil"');
  const itemBox = await kim.page.$eval('.chat-menu-item', (b) => b.getBoundingClientRect().height).catch(() => 0);
  check(itemBox >= 36, 'phone: the item is a big enough target', String(itemBox));
  await kim.page.screenshot({ path: `${OUT}/chat-delete-phone-menu.png` });
  await kim.page.click('.chat-menu-item');
  await kim.page.waitForSelector('.confirm-dialog');
  await kim.page.click('.confirm-dialog .btn.primary');
  check(await waitDeleted(alex.page, 'Kim deleted a message'), 'phone: Alex sees "Kim deleted a message"');
  check(await waitDeleted(kim.page, 'Kim bir mesajı sildi'), 'phone: Kim sees "Kim bir mesajı sildi"');

  // Test Lab hook.
  await say(alex.page, 'Lab deletes this', [sam.page]);
  const out = JSON.parse(await lab(alex.page, 'chat.delete'));
  check(typeof out.sent === 'string', 'chat.delete sends a delete for my newest message', JSON.stringify(out));
  check((await lineOf(sam.page, 'Lab deletes this').waitFor({ state: 'detached', timeout: 10000 }).then(() => true, () => false)), 'chat.delete: the message is gone for Sam');

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Messages can be deleted for everyone');
  process.exit(fails ? 1 : 0);
})();
