// R13 private messages in real browsers: a press on someone's name in the chat (or "Message privately" in the person
// menu) writes to them only; both chats mark it "🔒 Private · to / from"; a third person never sees it; ✕ goes back to
// the room chat; on a phone the bar fits. Needs the built site on wrangler dev:
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/private/run.cjs [http://localhost:8787]
const { chromium, devices } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:8787';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};

(async () => {
  const browser = await chromium.launch();
  const room = `prv${Math.random().toString(36).slice(2, 8)}`;
  const enter = async (name, options = { viewport: { width: 1280, height: 800 } }) => {
    const ctx = await browser.newContext(options);
    await ctx.addInitScript(() => {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', 'en');
      localStorage.setItem('opt:autoInvite', '0');
    });
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/${room}`);
    await page.fill('#name', name);
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await page.waitForTimeout(800);
    return page;
  };
  const say = async (page, text) => {
    await page.fill('#chat-input', text);
    await page.press('#chat-input', 'Enter');
  };
  const alex = await enter('Alex');
  const sam = await enter('Sam');
  const kim = await enter('Kim', { ...devices['iPhone 13'] });

  await say(alex, 'hi everyone');
  await sam.waitForSelector('.chat-line:not(.me) button.chat-name', { timeout: 8000 });
  await sam.click('.chat-line:not(.me) button.chat-name');
  const bar = await sam.evaluate(() => ({
    shown: !document.querySelector('.chat-private').hidden,
    text: document.querySelector('.chat-private-text')?.textContent ?? '',
    placeholder: document.getElementById('chat-input').placeholder,
    focused: document.activeElement?.id,
  }));
  check(bar.shown && /Only Alex will see this/.test(bar.text) && bar.focused === 'chat-input', 'a press on Alex\'s name: "Only Alex will see this" over the box, the box focused', bar.text);
  check(/Private message to Alex/.test(bar.placeholder), 'the box says who it writes to', bar.placeholder);
  await say(sam, 'psst, just you');

  await alex.waitForSelector('.chat-line.private', { timeout: 8000 }).catch(() => {});
  const got = await alex.evaluate(() => {
    const line = document.querySelector('.chat-line.private');
    return line ? { label: line.querySelector('.chat-private-label')?.textContent ?? '', text: line.querySelector('.chat-text')?.textContent ?? '' } : null;
  });
  check(got?.text === 'psst, just you' && /Private · from Sam/.test(got.label), 'Alex gets it marked "🔒 Private · from Sam"', JSON.stringify(got));
  await sam.waitForSelector('.chat-line.private.me', { timeout: 5000 }).catch(() => {});
  const mine = await sam.evaluate(() => document.querySelector('.chat-line.private.me .chat-private-label')?.textContent ?? [...document.querySelectorAll('.chat-line')].map((l) => l.className + ':' + l.textContent).join(' / '));
  check(/Private · to Alex/.test(mine), 'Sam\'s own copy says "🔒 Private · to Alex"', mine);
  await kim.waitForTimeout(800);
  const kimSees = await kim.evaluate(() => [...document.querySelectorAll('.chat-text')].map((p) => p.textContent));
  check(kimSees.includes('hi everyone') && !kimSees.includes('psst, just you'), 'Kim (a phone) sees the room message, never the private one', JSON.stringify(kimSees));

  await alex.click('.chat-line.private .chat-private-label');
  const reply = await alex.evaluate(() => document.querySelector('.chat-private-text')?.textContent ?? '');
  check(/Only Sam will see this/.test(reply), 'a press on the label answers Sam privately', reply);
  await alex.click('.chat-private-end');
  const ended = await alex.evaluate(() => ({ hidden: document.querySelector('.chat-private').hidden, placeholder: document.getElementById('chat-input').placeholder }));
  check(ended.hidden && !/Private/.test(ended.placeholder), '✕ goes back to the room chat', ended.placeholder);

  // The person menu: Alex presses Kim's face in Together → "Message privately".
  await alex.evaluate(() => [...document.querySelectorAll('.together-person')].find((b) => b.textContent.includes('Kim'))?.click());
  await alex.waitForSelector('.person-pop', { timeout: 5000 }).catch(() => {});
  const item = await alex.evaluate(() => [...document.querySelectorAll('.person-pop-item')].find((b) => /Message privately/.test(b.textContent))?.textContent ?? '');
  check(/Message privately/.test(item), 'the person menu has "🔒 Message privately"', item);
  await alex.evaluate(() => [...document.querySelectorAll('.person-pop-item')].find((b) => /Message privately/.test(b.textContent))?.click());
  const viaMenu = await alex.evaluate(() => document.querySelector('.chat-private-text')?.textContent ?? '');
  check(/Only Kim will see this/.test(viaMenu), 'it opens the chat writing to Kim only', viaMenu);
  await say(alex, 'for kim only');

  // Kim on the phone: the private line and an answer from the bar.
  await kim.waitForSelector('.chat-line.private .chat-private-label', { timeout: 8000 }).catch(() => {});
  await kim.click('.chat-line.private .chat-private-label').catch(() => {});
  const phone = await kim.evaluate(() => {
    const b = document.querySelector('.chat-private');
    const r = b?.getBoundingClientRect();
    const form = document.getElementById('chat-form').getBoundingClientRect();
    return b && !b.hidden && r ? { text: b.textContent, inView: r.top >= 0 && r.bottom <= innerHeight && r.right <= innerWidth + 1, aboveBox: r.bottom <= form.top + 1, scroll: document.documentElement.scrollWidth <= innerWidth } : null;
  });
  check(!!phone && /Only Alex/.test(phone.text) && phone.inView && phone.aboveBox && phone.scroll, 'on a phone the bar sits on screen right above the box, no side scroll', JSON.stringify(phone));
  const samSees = await sam.evaluate(() => [...document.querySelectorAll('.chat-text')].map((p) => p.textContent));
  check(!samSees.includes('for kim only'), 'Sam never sees Alex\'s message to Kim');

  await sam.reload();
  await sam.waitForSelector('.room');
  await sam.waitForTimeout(1200);
  const afterReload = await sam.evaluate(() => [...document.querySelectorAll('.chat-text')].map((p) => p.textContent));
  check(afterReload.includes('hi everyone') && !afterReload.includes('psst, just you'), 'after a reload the room history has no private messages', JSON.stringify(afterReload));

  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ Private messages');
  process.exit(fails ? 1 : 0);
})();
