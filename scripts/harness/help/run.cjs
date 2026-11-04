// The help page (card 7): served with the site's real security headers (apps/web/public/_headers), it loads with no
// CSP or page errors in both languages, every in-page link resolves to a section of the shown language, a section
// link in Turkish lands on the Turkish section, the numbers it states match the code, and the room links to it
// (footer, profile menu, ⋯ More, the "can't reach the room" card) in the room's language; card 8: the extension page and
// the "Go to the film" card say why the extension asks for every website and link the answer.
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
      // R9: Help is in the profile menu's small line (Help · Feedback · Privacy), not in ⋯ More.
      await page.click('.topbar-right .profile-btn');
      const [popup] = await Promise.all([room.waitForEvent('page', { timeout: 5000 }).catch(() => null), page.click('#profile-help')]);
      check(!!popup && new RegExp(`/help(\\.html)?\\?lang=${lang}`).test(popup.url()), `room ${lang}: the profile menu's Help opens the help page in a new tab`, popup?.url());
      if (popup) await popup.close();
      check(page.url().includes('/r/help'), `room ${lang}: the room tab stays in the room`);
      // Card 8: the "Go to the film" card (no extension here) says why the extension asks for every website.
      await page.fill('#media-input', 'https://example.com/films/demo.html');
      await page.press('#media-input', 'Enter');
      await page.click(lang === 'en' ? 'button:has-text("Add anyway")' : 'button:has-text("Yine de ekle")');
      await page.waitForSelector('#external:not([hidden]) #external-noext');
      const why = await page.evaluate(() => {
        const box = document.querySelector('#external');
        return {
          text: document.querySelector('.external-why')?.innerText ?? '',
          href: document.querySelector('#external-why-more')?.getAttribute('href'),
          fits: box.scrollHeight <= box.clientHeight + 1,
        };
      });
      const whyText = lang === 'en' ? /Why every website\?.*does nothing outside a room/s : /Neden her site\?.*hiçbir şey yapmaz/s;
      check(whyText.test(why.text) && why.href === `/help.html?lang=${lang}#permissions`, `room ${lang}: the film card says why every website and links the answer`, why);
      check(why.fits, `room ${lang}: the film card fits its box`, why.fits);
      await page.setViewportSize({ width: 1024, height: 640 });
      await page.waitForTimeout(300);
      const short = await page.evaluate(() => {
        const box = document.querySelector('#external');
        return { fits: box.scrollHeight <= box.clientHeight + 1, link: document.querySelector('#external-why-more').getBoundingClientRect().height > 0 };
      });
      check(short.fits && short.link, `room ${lang}: on a short screen the card still fits and keeps the link`, short);
      await room.close();
    }
  }
  const ext = fs.readFileSync(path.join(PUBLIC, 'eklenti.html'), 'utf8');
  check(/href="\/help\.html"/.test(ext), 'the extension page links the help page');
  // Card 8: the extension page says why it asks for every website, in both languages, with a link to the answer.
  const extPage = await ctx.newPage();
  for (const lang of ['en', 'tr']) {
    await extPage.goto(`${base}/eklenti.html?lang=${lang}`);
    const note = await extPage.evaluate((lang) => {
      const el = document.querySelector(`[data-lang-block="${lang}"] .note[id^="why-all-sites"]`);
      return el && { shown: el.getBoundingClientRect().height > 0, text: el.innerText, href: el.querySelector('a')?.getAttribute('href') };
    }, lang);
    const re = lang === 'en' ? /all websites.*does nothing while you are not in a room/s : /tüm web sitelerindeki.*hiçbir şey yapmaz/s;
    check(!!note && note.shown && re.test(note.text) && note.href === `/help.html?lang=${lang}#permissions`, `extension page ${lang}: why every website, with the link to the answer`, note && note.href);
  }
  await extPage.close();

  // Card 11: the Thanks page, the six names exactly as the owner gave them, in his order; one screen without a scroll on
  // a computer and a phone, in both languages; linked from the footer and the Help page.
  const NAMES = ['Tecem Öztürk', 'Feyza Hacıalioğlu', 'Ömer Tuğrul Bakan', 'Ahmet Faruk Uğurluoğlu', 'Nevin Senem Kanar', 'Mert Arı'];
  for (const [label, viewport] of [['1366×768', { width: 1366, height: 768 }], ['390×844', { width: 390, height: 844 }]]) {
    const thanksCtx = await browser.newContext({ viewport });
    const page = await thanksCtx.newPage();
    const problems = [];
    page.on('pageerror', (e) => problems.push(e.message));
    page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
    for (const lang of ['en', 'tr']) {
      await page.goto(`${base}/thanks.html?lang=${lang}`);
      await page.waitForTimeout(150);
      const info = await page.evaluate((lang) => ({
        names: [...document.querySelectorAll('#thanks-names li')].map((li) => li.textContent),
        listLang: document.getElementById('thanks-names').lang,
        title: document.querySelector(`[data-lang-block="${lang}"] h1`)?.textContent,
        shown: !document.querySelector(`[data-lang-block="${lang}"]`).hidden,
        scroll: document.documentElement.scrollHeight > innerHeight + 1 || document.documentElement.scrollWidth > innerWidth + 1,
        feedback: document.querySelector(`.more[data-lang-block="${lang}"] a`)?.getAttribute('href'),
        mascot: document.querySelector('.glow')?.naturalWidth > 0,
      }), lang);
      check(JSON.stringify(info.names) === JSON.stringify(NAMES) && info.listLang === 'tr', `thanks ${lang} ${label}: the six names exactly, in order (lang="tr")`, info.names.join(', '));
      check(info.shown && info.title === (lang === 'en' ? 'Thank you' : 'Teşekkürler') && !info.scroll && info.mascot && info.feedback === '/#feedback', `thanks ${lang} ${label}: one screen, no scroll, Glowbeam, "send feedback" link`, JSON.stringify({ scroll: info.scroll, mascot: info.mascot }));
    }
    check(problems.length === 0, `thanks ${label}: no errors (CSP included)`, problems.join(' | '));
    await thanksCtx.close();
  }
  const helpHtml = fs.readFileSync(path.join(PUBLIC, 'help.html'), 'utf8');
  const index = fs.readFileSync(path.join(PUBLIC, '..', 'index.html'), 'utf8');
  check(/href="\/thanks\.html\?lang=en"/.test(helpHtml) && /href="\/thanks\.html\?lang=tr"/.test(helpHtml) && /data-thanks-link/.test(index), 'the Help page (EN + TR) and the footer link the Thanks page');

  await browser.close();
  server.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Help page works');
  process.exit(failed ? 1 : 0);
})();
