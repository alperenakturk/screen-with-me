// Card SRC1: the ⠿ Sources picker beside the link box, on a computer (English) and on a phone's 🔍 Search tab
// (Turkish). Vimeo's answers are stubbed in the browser (the real route needs the VIMEO_TOKEN secret; without it the
// server says "off", which the last part checks), and the web search's tab never leaves this machine.
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/sources/run.cjs [http://localhost:8787] [out-dir]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || require('os').tmpdir();
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};
const VIMEO_ITEMS = [
  { id: '76979871', title: 'A short film about light', user: 'Studio North', duration: 182, thumb: null },
  { id: '22439234', title: 'Mountains at dawn', user: 'Alex', duration: 3725, thumb: null },
];

(async () => {
  const browser = await chromium.launch();

  async function run(label, options, lang, phone) {
    const ctx = await browser.newContext(options);
    await ctx.addInitScript((l) => {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', l);
      localStorage.setItem('opt:autoInvite', '0');
    }, lang);
    // Nothing reaches the web search engine or Vimeo's player from this machine.
    await ctx.route(/duckduckgo\.com|player\.vimeo\.com|i\.vimeocdn\.com/, (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' }));
    let stubVimeo = true;
    await ctx.route('**/api/vimeo/status', (route) => (stubVimeo ? route.fulfill({ json: { on: true } }) : route.fallback()));
    let searched = null;
    await ctx.route('**/api/vimeo/search', (route) => {
      if (!stubVimeo) return route.fallback();
      searched = { method: route.request().method(), body: route.request().postData(), url: route.request().url() };
      return route.fulfill({ json: { items: VIMEO_ITEMS } });
    });
    const page = await ctx.newPage();
    const room = `src${Math.random().toString(36).slice(2, 8)}`;
    await page.goto(`${SITE}/r/${room}?debug=1`);
    await page.fill('#name', label === 'computer' ? 'Alex' : 'Sam');
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await page.waitForTimeout(800);
    const showSearch = async () => {
      if (phone && !(await page.isVisible('#media-input'))) await page.click('#ph-tab-search');
    };
    await showSearch();

    // 1. ⠿ beside the box opens three tiles; YouTube is the default.
    const button = await page.evaluate(() => {
      const b = document.getElementById('media-sources');
      const r = b?.getBoundingClientRect();
      const box = document.getElementById('media-input').getBoundingClientRect();
      return b ? { name: b.getAttribute('aria-label'), w: r.width, h: r.height, near: Math.abs(r.top - box.top) < 4 || r.top >= box.bottom - 2, onScreen: r.left >= 0 && r.right <= innerWidth } : null;
    });
    check(!!button && button.w >= (phone ? 44 : 24) && button.h >= (phone ? 44 : 24) && button.near && button.onScreen, `${label}: ⠿ sits beside the search box, big enough`, JSON.stringify(button));
    await page.click('#media-sources');
    await page.waitForSelector('#sources-pop:not([hidden]) .sources-tile');
    const pop = await page.evaluate(() => {
      const p = document.getElementById('sources-pop');
      const r = p.getBoundingClientRect();
      const tiles = [...p.querySelectorAll('.sources-tile')].map((t) => ({ source: t.dataset.source, checked: t.getAttribute('aria-checked'), text: t.textContent, h: t.getBoundingClientRect().height }));
      return { tiles, fits: r.left >= 0 && r.right <= innerWidth + 1 && r.top >= 0, sideways: document.documentElement.scrollWidth > innerWidth + 1, overflow: p.scrollHeight > p.clientHeight + 1 };
    });
    await page.screenshot({ path: `${OUT}/sources-${label}-${lang}.png` });
    check(pop.tiles.map((t) => t.source).join() === 'youtube,vimeo,web' && pop.tiles[0].checked === 'true' && pop.tiles.every((t) => t.h >= 44) && pop.fits && !pop.sideways && !pop.overflow, `${label}: three tiles (YouTube picked), each ≥ 44 px, on screen`, JSON.stringify(pop));
    const words = lang === 'tr' ? /Web’de ara/ : /Search the web/;
    check(words.test(pop.tiles[2].text), `${label}: the tiles are in ${lang === 'tr' ? 'Turkish' : 'English'}`, pop.tiles[2].text);

    // 2. Vimeo: the pick sticks (also after a reload); words search Vimeo; a result plays in our Vimeo player.
    await page.click('.sources-tile[data-source="vimeo"]');
    const placeholder = await page.getAttribute('#media-input', 'placeholder');
    check(/Vimeo/.test(placeholder), `${label}: the box now says it searches Vimeo`, placeholder);
    await page.reload();
    await page.waitForSelector('.room');
    await page.waitForTimeout(600);
    await showSearch();
    check((await page.evaluate(() => localStorage.getItem('searchSource'))) === 'vimeo' && /Vimeo/.test(await page.getAttribute('#media-input', 'placeholder')), `${label}: the source sticks after a reload`);
    await page.fill('#media-input', 'light film');
    await page.press('#media-input', 'Enter');
    await page.waitForSelector('#search-results .search-row', { timeout: 8000 }).catch(() => {});
    const rows = await page.evaluate(() => [...document.querySelectorAll('#search-results .search-row .search-title')].map((n) => n.textContent));
    await page.screenshot({ path: `${OUT}/sources-${label}-${lang}-vimeo.png` });
    check(rows.length === 2 && rows[0] === VIMEO_ITEMS[0].title, `${label}: Vimeo results show`, JSON.stringify(rows));
    check(searched?.method === 'POST' && /q=light\+film/.test(searched.body ?? '') && !/light/.test(searched.url), `${label}: the words go in the POST body, never in the address`, JSON.stringify(searched));
    await page.click('#search-results .search-row .search-now');
    const played = await page
      .waitForFunction((id) => [...document.querySelectorAll('iframe')].some((f) => f.src.includes(`player.vimeo.com/video/${id}`)), VIMEO_ITEMS[0].id, { timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    check(played, `${label}: "Play now" plays it in our Vimeo player`);

    // 3. Search the web: one new tab with the words; back in the room, the "paste the link" hint.
    await showSearch();
    await page.click('#media-sources');
    await page.waitForSelector('#sources-pop:not([hidden])');
    await page.click('.sources-tile[data-source="web"]');
    await page.fill('#media-input', 'cat video');
    const [tab] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), page.press('#media-input', 'Enter')]);
    const opened = tab ? new URL(tab.url() === 'about:blank' ? (await tab.waitForURL(/duckduckgo/, { timeout: 5000 }).catch(() => null), tab.url()) : tab.url()) : null;
    check(!!opened && opened.hostname === 'duckduckgo.com' && opened.searchParams.get('q') === 'cat video' && [...opened.searchParams.keys()].join() === 'q', `${label}: "Search the web" opens one tab with just the words`, opened?.toString());
    if (tab) await tab.close();
    await page.bringToFront();
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      dispatchEvent(new Event('focus'));
    });
    const hint = await page.waitForFunction(() => document.querySelector('.hint-bubble')?.textContent, null, { timeout: 4000 }).then((h) => h.jsonValue()).catch(() => '');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}/sources-${label}-${lang}-paste.png` });
    check(/link/i.test(hint) && (await page.evaluate(() => document.activeElement?.id)) === 'media-input', `${label}: back in the room, a hint says to paste the link and the box has focus`, hint);

    // 4. The Test Lab hook.
    const lab = await page.evaluate(async () => (await window.__swmLab.run('sources.state')).text);
    check(/"source":"web"/.test(lab) && /"last":\{"source":"web","words":"cat video"/.test(lab), `${label}: sources.state reports the source and the last search`, lab);

    // 5. Without the Vimeo secret (the real server here): the tile says "not available yet", a search says so too.
    stubVimeo = false;
    await page.reload();
    await page.waitForSelector('.room');
    await page.waitForTimeout(600);
    await showSearch();
    await page.click('#media-sources');
    await page.waitForFunction(() => document.querySelector('.sources-tile[data-source="vimeo"]')?.classList.contains('off'), null, { timeout: 5000 }).catch(() => {});
    const off = await page.evaluate(() => document.querySelector('.sources-tile[data-source="vimeo"]')?.textContent ?? '');
    check(lang === 'tr' ? /Henüz kullanılamıyor/.test(off) : /Not available yet/.test(off), `${label}: no Vimeo secret → the tile says "not available yet"`, off);
    await page.click('.sources-tile[data-source="vimeo"]');
    await page.fill('#media-input', 'anything');
    await page.press('#media-input', 'Enter');
    const note = await page.waitForFunction(() => document.querySelector('#search-results .search-note:not(.muted)')?.textContent, null, { timeout: 8000 }).then((h) => h.jsonValue()).catch(() => '');
    check(/Vimeo/.test(note) && /⠿/.test(note), `${label}: a Vimeo search without the secret explains it and points to ⠿`, note);
    // A pasted link still plays whatever the source is.
    await page.fill('#media-input', 'https://vimeo.com/22439234');
    await page.click('#media-form button[value="load"]');
    const link = await page.waitForFunction(() => [...document.querySelectorAll('iframe')].some((f) => f.src.includes('player.vimeo.com/video/22439234')), null, { timeout: 10000 }).then(() => true).catch(() => false);
    check(link, `${label}: a pasted link still plays`);
    await ctx.close();
  }

  await run('computer', { viewport: { width: 1366, height: 768 } }, 'en', false);
  await run('phone', { ...devices['Pixel 7'] }, 'tr', true);

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ The ⠿ Sources picker works');
  process.exit(fails ? 1 : 0);
})();
