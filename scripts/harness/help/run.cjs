// The help page (card 7): served with the site's real security headers (apps/web/public/_headers), it loads with no
// CSP or page errors in both languages, every in-page link resolves to a section of the shown language, a section
// link in Turkish lands on the Turkish section, the numbers it states match the code, and the room links to it
// (footer, profile menu, ⋯ More, the "can't reach the room" card) in the room's language.
//
//   NODE_PATH=$(npm root -g) node scripts/harness/help/run.cjs [site]   (site: `npm run dev`, for the room checks)
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '../../..');
const PUBLIC = path.join(ROOT, 'apps/web/public');
const SITE = process.argv[2] || 'http://localhost:5173';
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};

// The `/*` block of _headers, as the Worker's static assets send it.
function headers() {
  const out = {};
  let inBlock = false;
  for (const line of fs.readFileSync(path.join(PUBLIC, '_headers'), 'utf8').split('\n')) {
    if (line.startsWith('#') || !line.trim()) continue;
    if (!line.startsWith(' ')) inBlock = line.trim() === '/*';
    else if (inBlock) {
      const at = line.indexOf(':');
      out[line.slice(0, at).trim()] = line.slice(at + 1).trim();
    }
  }
  return out;
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.css': 'text/css' };
function serve() {
  const extra = headers();
  const server = http.createServer((req, res) => {
    const file = path.join(PUBLIC, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', ...extra });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

const constant = (file, name) => Number(new RegExp(`const ${name} = ([\\d_ *]+);`).exec(fs.readFileSync(path.join(ROOT, file), 'utf8'))[1].replace(/_/g, '').split('*').reduce((a, b) => a * Number(b), 1));

(async () => {
  const server = await serve();
  const base = `http://localhost:${server.address().port}`;
  check(!!headers()['Content-Security-Policy'], 'the real CSP is applied');
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  for (const lang of ['en', 'tr']) {
    const page = await ctx.newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push(e.message));
    page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
    await page.goto(`${base}/help.html?lang=${lang}`);
    const info = await page.evaluate((lang) => {
      const block = document.querySelector(`[data-lang-block="${lang}"]`);
      const other = document.querySelector(`[data-lang-block="${lang === 'en' ? 'tr' : 'en'}"]`);
      const local = [...block.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href').slice(1));
      return {
        shown: !block.hidden && other.hidden,
        htmlLang: document.documentElement.lang,
        title: document.title,
        local,
        unresolved: local.filter((id) => !block.querySelector(`[id="${id}"]`)),
        ids: [...block.querySelectorAll('[id]')].map((e) => e.id),
        text: block.innerText,
        site: [...block.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')),
      };
    }, lang);
    check(info.shown && info.htmlLang === lang, `${lang}: only the ${lang} block shows`, info.htmlLang);
    check(lang === 'en' ? /Help/.test(info.title) : /Yardım/.test(info.title), `${lang}: the title is in the language`, info.title);
    check(info.local.length >= 8 && info.unresolved.length === 0, `${lang}: every contents link has its section`, { links: info.local.length, unresolved: info.unresolved });
    check(lang === 'en' ? info.ids.every((id) => !id.endsWith('-tr')) : info.ids.every((id) => id.endsWith('-tr')), `${lang}: section ids match the block`, info.ids);
    // Links to our own pages exist.
    const missing = info.site.filter((href) => {
      const p = href.split(/[?#]/)[0];
      return p !== '/' && p !== '/baglanti' && !fs.existsSync(path.join(PUBLIC, p));
    });
    check(info.site.length > 0 && missing.length === 0, `${lang}: links to our own pages exist`, { links: info.site, missing });
    // The numbers it states are the code's.
    const voice = constant('packages/shared/src/protocol.ts', 'VOICE_MAX_P2P');
    const cams = constant('packages/shared/src/protocol.ts', 'CAM_MAX');
    const viewers = constant('packages/shared/src/protocol.ts', 'LIVE_MAX_VIEWERS');
    const chat = constant('apps/server/src/room.ts', 'CHAT_HISTORY');
    const saved = constant('apps/server/src/room.ts', 'SAVED_ROOM_TTL_MS') / 86_400_000;
    const empty = constant('apps/server/src/room.ts', 'EMPTY_ROOM_TTL_MS') / 86_400_000;
    const says =
      lang === 'en'
        ? [`${voice} people in voice`, `${cams} cameras`, `${viewers} people`, `last ${chat} messages`, `${saved} days`, empty === 1 ? 'a day after' : `${empty} days after`]
        : [`${voice} kişi`, `${cams} kamera`, `en fazla ${viewers} kişi`, `son ${chat} mesajını`, `${saved} gün`, empty === 1 ? 'bir gün sonra' : `${empty} gün sonra`];
    const wrong = says.filter((s) => !info.text.includes(s));
    check(wrong.length === 0, `${lang}: the numbers match the code (voice ${voice}, cameras ${cams}, viewers ${viewers}, chat ${chat}, rooms ${empty} / ${saved} days)`, wrong);
    // Clicking a contents link scrolls to its section.
    await page.click(`[data-lang-block="${lang}"] nav.toc a >> nth=4`);
    await page.waitForTimeout(200);
    const scrolled = await page.evaluate((lang) => {
      const id = location.hash.slice(1);
      const r = document.getElementById(id).getBoundingClientRect();
      return { id, top: Math.round(r.top), sy: Math.round(scrollY) };
    }, lang);
    check(scrolled.sy > 0 && scrolled.top >= -2 && scrolled.top < 80, `${lang}: a contents link scrolls to its section`, scrolled);
    await page.setViewportSize({ width: 360, height: 740 });
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    check(fits, `${lang}: no sideways scroll on a phone`);
    await page.setViewportSize({ width: 1280, height: 800 });
    check(problems.length === 0, `${lang}: no CSP or page errors`, problems);
    await page.close();
  }

  // A section link in Turkish (the room's "can't reach" card) lands on the Turkish section.
  const tr = await ctx.newPage();
  await tr.goto(`${base}/help.html?lang=tr#connection`);
  await tr.waitForTimeout(300);
  const landed = await tr.evaluate(() => Math.round(document.getElementById('connection-tr').getBoundingClientRect().top));
  check(landed >= -2 && landed < 80, 'tr: #connection lands on the Turkish section', landed);
  await tr.close();

  // The room links to it.
  let roomOk = true;
  try {
    await (await fetch(SITE)).text();
  } catch {
    roomOk = false;
  }
  if (!roomOk) {
    console.log(`skip room links: ${SITE} is not running`);
  } else {
    for (const lang of ['en', 'tr']) {
      const room = await browser.newContext({ viewport: { width: 1366, height: 800 } });
      await room.addInitScript((lang) => {
        localStorage.setItem('tipsSeen', '1');
        localStorage.setItem('opt:autoInvite', '0');
        localStorage.setItem('lang', lang);
      }, lang);
      const page = await room.newPage();
      await page.goto(`${SITE}/r/help${Math.random().toString(36).slice(2, 7)}`);
      await page.fill('#name', 'Alex');
      await page.click('#name-form button.primary');
      await page.waitForSelector('#room-more');
      const hrefs = await page.evaluate(() => ({
        footer: document.querySelector('.footer a[data-help-link]')?.getAttribute('href'),
        profile: document.querySelector('#profile-help')?.getAttribute('href'),
        net: document.querySelector('#net-hint-help')?.getAttribute('href'),
      }));
      check(hrefs.footer === `/help.html?lang=${lang}` && hrefs.profile === `/help.html?lang=${lang}`, `room ${lang}: footer and profile menu link the help page in the room's language`, hrefs);
      check(hrefs.net === `/help.html?lang=${lang}#connection`, `room ${lang}: the "can't reach the room" card links the connection section`, hrefs.net);
      await page.click('#room-more');
      const label = lang === 'en' ? 'Help and FAQ' : 'Yardım ve SSS';
      const [popup] = await Promise.all([room.waitForEvent('page', { timeout: 5000 }).catch(() => null), page.click(`.room-more-pop .room-more-item:has-text("${label}")`)]);
      check(!!popup && popup.url().includes(`/help.html?lang=${lang}`), `room ${lang}: ⋯ More → ${label} opens the help page in a new tab`, popup?.url());
      if (popup) await popup.close();
      check(page.url().includes('/r/help'), `room ${lang}: the room tab stays in the room`);
      await room.close();
    }
  }
  const ext = fs.readFileSync(path.join(PUBLIC, 'eklenti.html'), 'utf8');
  check(/href="\/help\.html"/.test(ext), 'the extension page links the help page');

  await browser.close();
  server.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Help page works');
  process.exit(failed ? 1 : 0);
})();
