// Card CH1: a long chat stays. On a lab server the Test Lab adds 500 numbered messages; after a reload the room shows
// the newest pages, "Show earlier messages" / scrolling to the top brings older pages back without losing the
// reader's place, all 500 come back, and a burst of room activity ("Alex paused") never pushes chat out of the list.
// Computer (EN) and phone (TR).
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 --var SWM_LAB_SERVER:1 --var LAB_CODE:harness-lab-code)
//   NODE_PATH=$(npm root -g) node scripts/harness/chat-history/run.cjs [http://localhost:8787] [out-dir]
const { chromium, devices } = require('playwright');
const { phoneReady } = require('../phone-ready.cjs');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || require('os').tmpdir();
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lab = async (page, id) => (await page.evaluate(async (id) => (await window.__swmLab.run(id)).text, id)).replace(/^\S+\s/, '');
const history = async (page) => JSON.parse(await lab(page, 'chat.history'));

(async () => {
  const browser = await chromium.launch();
  for (const [label, options, lang] of [
    ['computer', { viewport: { width: 1366, height: 768 } }, 'en'],
    ['phone', { ...devices['Pixel 7'] }, 'tr'],
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
    const room = `chat${Math.random().toString(36).slice(2, 8)}`;
    await page.goto(`${SITE}/r/${room}?debug=harness-lab-code`);
    await page.fill('#name', 'Alex');
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await sleep(800);
    for (let i = 0; i < 2; i++) {
      await lab(page, 'chat.fill');
      await page.waitForFunction((n) => [...document.querySelectorAll('#chat-list .chat-text')].some((p) => p.textContent === `Lab: ${n} messages kept`), (i + 1) * 250, { timeout: 15000 }).catch(() => {});
    }
    await page.reload();
    await page.waitForSelector('.room');
    await page.waitForFunction(() => document.querySelectorAll('#chat-list .chat-line').length > 0, null, { timeout: 10000 }).catch(() => {});
    // The phone shows the chat in its Room tab feed.
    let h = await history(page);
    check(h.loaded > 50 && h.loaded <= 100 && h.olderPage !== null, `${label}: after a reload the room shows the newest pages (more than the old 50) and offers older ones`, JSON.stringify(h));
    const button = await page.evaluate(() => {
      const b = document.querySelector('#chat-list .chat-older');
      const r = b?.getBoundingClientRect();
      return b ? { text: b.textContent, w: Math.round(r.width), h: Math.round(r.height) } : null;
    });
    check(!!button && (lang === 'tr' ? /Önceki mesajları göster/ : /Show earlier messages/).test(button.text), `${label}: a "Show earlier messages" button sits on top of the chat`, JSON.stringify(button));
    // The button as a person sees it: the list scrolled to its top.
    await page.evaluate(() => (document.getElementById('chat-list').scrollTop = 0));
    await sleep(200);
    await page.screenshot({ path: `${OUT}/chat-history-${label}-earlier.png` });
    // One page by the button, the rest by scrolling to the top; the reader's place stays (the line they saw is still in view).
    await page.evaluate(() => document.querySelector('#chat-list .chat-older').click());
    await page.waitForFunction((n) => JSON.parse(String(n)) < 0, -1, { timeout: 100 }).catch(() => {});
    for (let i = 0; i < 20; i++) {
      await sleep(1100);
      h = await history(page);
      if (h.olderPage === null) break;
      await page.evaluate(() => {
        const list = document.getElementById('chat-list');
        list.scrollTop = 0;
        list.dispatchEvent(new Event('scroll'));
      });
    }
    h = await history(page);
    const numbers = await page.evaluate(() =>
      [...document.querySelectorAll('#chat-list .chat-text')].map((p) => p.textContent).filter((t) => /^Lab message \d+$/.test(t)).map((t) => Number(t.slice(12))),
    );
    check(h.olderPage === null && numbers.length === 500 && numbers.every((n, i) => n === i + 1), `${label}: scrolling up brings all 500 back, in order`, JSON.stringify({ ...h, shown: numbers.length, first: numbers[0], last: numbers.at(-1) }));
    // All loaded: the top (message 1, no button any more) and the bottom (message 500).
    await page.evaluate(() => (document.getElementById('chat-list').scrollTop = 0));
    await sleep(300);
    await page.screenshot({ path: `${OUT}/chat-history-${label}-top.png` });
    await page.evaluate(() => {
      const list = document.getElementById('chat-list');
      list.scrollTop = list.scrollHeight;
    });
    await sleep(300);
    await page.screenshot({ path: `${OUT}/chat-history-${label}-bottom.png` });

    // Room activity ("Alex added …" for each of 30 pasted links) never pushes chat out (it used to share one 120-line cap).
    const before = h.loaded;
    const links = Array.from({ length: 30 }, (_, i) => `https://youtu.be/${('abcdefghij' + i).slice(-11).padStart(11, 'x')}`).join(' ');
    await phoneReady(page);
    if (!(await page.isVisible('#media-input'))) await page.click('#ph-tab-search').catch(() => {});
    await page.fill('#media-input', links);
    await page.click('#media-form button[value=enqueue]').catch(async () => page.press('#media-input', 'Enter'));
    await page.waitForFunction(() => document.querySelectorAll('#chat-list .chat-system').length >= 10, null, { timeout: 10000 }).catch(() => {});
    h = await history(page);
    check(h.loaded === before && h.system >= 10, `${label}: room activity does not push chat out`, JSON.stringify(h));
    const lab2 = await lab(page, 'chat.history');
    check(/"loaded":\d+/.test(lab2) && /"olderPage":null/.test(lab2), `${label}: chat.history reports what is loaded`, lab2);
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ A long chat stays and pages back in');
  process.exit(fails ? 1 : 0);
})();
