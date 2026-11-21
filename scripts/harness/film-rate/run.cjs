// Card FR1: "Rate the film" through the real UI. Alex (host, laptop) starts it with Test Lab `film.rate` (on the film
// page the rail's ⭐ does it; on the plain site the button stays hidden, checked here). Alex and Sam (a phone) each go
// through the five questions (half stars, people, again, one word), send, and both see the same results card; the
// window fits without scrolling, its targets are big enough, nothing errors. "To the chat" closes it and opens the chat.
//
//   wrangler dev with the lab flag (CI), then: NODE_PATH=$(npm root -g) node scripts/harness/film-rate/run.cjs [site]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};
const lab = async (page, id) => (await page.evaluate(async (c) => (await window.__swmLab.run(c)).text, id)).replace(/^▶ /, '');
const state = async (page) => JSON.parse(await lab(page, 'film.rate.state'));

async function join(browser, options, room, name) {
  const ctx = await browser.newContext(options);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    try {
      localStorage.setItem('tipsSeen', '1');
    } catch {}
  });
  await page.goto(`${SITE}/r/${room}?debug=1`);
  await page.fill('#name', name);
  await page.click('#name-form button.primary');
  await page.waitForSelector('#chat-input', { state: 'attached' });
  return { ctx, page, errors };
}

/** The open window: inside the screen, nothing scrolls, every button ≥ 24 px (44 px on a phone for the choices). */
const fit = (page) =>
  page.evaluate(() => {
    const card = document.querySelector('.fr-card');
    if (!card) return null;
    const r = card.getBoundingClientRect();
    const small = [...card.querySelectorAll('button')].filter((b) => b.getBoundingClientRect().width > 0).filter((b) => {
      const s = b.getBoundingClientRect();
      return s.width < 24 || s.height < 24;
    });
    return {
      inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
      scrolls: card.scrollHeight > card.clientHeight + 2 || document.scrollingElement.scrollWidth > innerWidth + 1,
      small: small.map((b) => b.getAttribute('aria-label') || b.textContent),
    };
  });

/** One person's way through the questions. */
async function answer(page, label, { star, most, again, word }) {
  await page.waitForSelector('.fr-card.fr-ask', { timeout: 8000 });
  const box = await fit(page);
  check(box?.inside && !box.scrolls && box.small.length === 0, `${label}: the questions fit, no scrolling, targets ≥ 24 px`, box);
  check((await page.isDisabled('.fr-next')) === true, `${label}: "Next" waits for the stars`);
  await page.click(`.fr-half[aria-label="${star} stars"]`);
  check((await page.textContent('.fr-value')) === `${star} / 5`, `${label}: a half star is taken (${star})`, await page.textContent('.fr-value'));
  await page.click('.fr-next');
  check((await state(page)).step === 'most', `${label}: on to "Who liked it most?"`);
  await page.click(`.fr-most .fr-chip:has-text("${most}")`);
  // "Who liked it least?" is skipped.
  await page.click('.fr-skip');
  await page.click(`.fr-again .fr-chip:has-text("${again}")`);
  check((await state(page)).step === 'word', `${label}: the last question is the one word`);
  await page.click(`.fr-word .fr-chip:has-text("${word}")`);
  await page.click('.fr-next');
}

(async () => {
  const browser = await chromium.launch();
  const room = `fr${Math.random().toString(36).slice(2, 8)}`;
  const alex = await join(browser, { viewport: { width: 1366, height: 768 } }, room, 'Alex');
  const sam = await join(browser, { ...devices['iPhone 13'] }, room, 'Sam');
  const a = alex.page;
  const s = sam.page;
  check((await state(a)).button === false, 'on the plain site the rail has no ⭐ (film page only)');
  check((await lab(s, 'film.rate')) === 'not host', 'a guest cannot start it from the lab either');
  await lab(a, 'film.rate');
  await answer(a, 'host', { star: 4.5, most: 'Sam', again: 'Yes', word: 'Fun' });
  await a.waitForSelector('.fr-card.fr-wait');
  check((await a.textContent('.fr-count')).includes('1 of 2'), 'the host waits: 1 of 2 answered', await a.textContent('.fr-count'));
  check(await a.isVisible('.fr-wait .btn.primary'), 'the host can show the results now');
  await answer(s, 'guest (phone)', { star: 3.5, most: 'Sam', again: 'Maybe', word: 'Fun' });
  for (const [who, page] of [['host', a], ['guest', s]]) {
    await page.waitForSelector('.fr-card.fr-results', { timeout: 8000 });
    const st = await state(page);
    check(st.view === 'results' && st.results?.votes === 2 && st.results.stars === 4, `${who}: the results card shows 4.0 from 2 people`, st.results);
    const text = await page.textContent('.fr-card');
    check(/Sam \(2\)/.test(text) && /Fun/.test(text) && /👍 1 · 🤔 1/.test(text), `${who}: picks, again and the word are on the card`, text);
    const box = await fit(page);
    check(box?.inside && !box.scrolls && box.small.length === 0, `${who}: the results fit, no scrolling`, box);
  }
  await s.click('.fr-results .btn.primary');
  await s.waitForTimeout(400);
  check(!(await s.isVisible('.fr-card')), '"To the chat" closes the card');
  check(await a.isVisible('.fr-card'), 'it closes for that person only');
  await a.click('.fr-results .fr-nav .btn:not(.primary)');
  await s.waitForTimeout(600);
  check((await state(a)).poll === null && (await state(s)).poll === null, 'the host closes it for everyone');
  check(alex.errors.length === 0 && sam.errors.length === 0, 'no page errors', [...alex.errors, ...sam.errors]);
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
