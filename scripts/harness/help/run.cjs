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
    // Card R3-3: the build writes /domain.js from site.config.json (no aliases here: it does nothing).
    if (new URL(req.url, 'http://x').pathname === '/domain.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript', ...extra });
      res.end('// site.config.json has no aliases\n');
      return;
    }
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

/** A rate-limit binding's `limit` in wrangler.jsonc. */
const limit = (name) => Number(new RegExp(`"name": "${name}"[^}]*"limit": (\\d+)`).exec(fs.readFileSync(path.join(ROOT, 'apps/server/wrangler.jsonc'), 'utf8'))[1]);
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
      return p !== '/' && p !== '/connection' && !fs.existsSync(path.join(PUBLIC, p));
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

  // Privacy card (H3 + M7, 0.9.97.60): the privacy policy has the same sections in both languages, every contents
  // link resolves, and the numbers it states are the code's.
  {
    const n = (file, name) => constant(file, name);
    const DAY = 86_400_000;
    const nums = {
      chat: n('apps/server/src/room.ts', 'CHAT_HISTORY'),
      images: n('packages/shared/src/protocol.ts', 'MAX_CHAT_IMAGES'),
      emojis: n('packages/shared/src/protocol.ts', 'MAX_STICKERS'),
      empty: n('apps/server/src/room.ts', 'EMPTY_ROOM_TTL_MS') / 3_600_000,
      saved: n('apps/server/src/room.ts', 'SAVED_ROOM_TTL_MS') / DAY,
      history: n('apps/server/src/room.ts', 'MAX_HISTORY'),
      recaps: n('packages/shared/src/recap.ts', 'RECAPS_KEEP'),
      recapsSaved: n('packages/shared/src/recap.ts', 'RECAPS_KEEP_SAVED'),
      recapDays: n('packages/shared/src/recap.ts', 'RECAP_MAX_AGE_MS') / DAY,
      title: n('packages/shared/src/room-logic.ts', 'TITLE_MAX_AGE_MS') / DAY,
      memberIds: n('apps/server/src/room.ts', 'MEMBER_ID_TTL_MS') / 3_600_000,
      admitted: n('apps/server/src/room.ts', 'ADMIT_TTL_MS') / 3_600_000,
      tv: n('apps/server/src/room.ts', 'TV_TOKEN_TTL_MS') / 3_600_000,
      tvCode: n('apps/server/src/tv-link.ts', 'CODE_TTL_MS') / 60_000,
      game: n('apps/server/src/game.ts', 'EMPTY_TTL_MS') / 3_600_000,
      move: n('packages/shared/src/move.ts', 'MOVE_TTL_MS') / 60_000,
      usage: n('packages/shared/src/yt-usage.ts', 'USAGE_DAYS'),
      ytCache: n('apps/server/src/youtube.ts', 'RESULT_TTL_S') / 3600,
      tiktok: n('apps/server/src/tiktok.ts', 'RESULT_TTL_S') / 86_400,
      podSearch: n('apps/server/src/podcasts.ts', 'SEARCH_TTL_S') / 3600,
      podEpisodes: n('apps/server/src/podcasts.ts', 'EPISODES_TTL_S') / 3600,
    };
    const same = ['draw', 'quiz', 'poker'].every((f) => n(`apps/server/src/${f}.ts`, 'EMPTY_TTL_MS') / 3_600_000 === nums.game);
    check(same, 'privacy: every game object keeps its data as long as the one the policy names', nums.game);
    const day = (d, en) => (d === 7 ? (en ? 'a week' : 'bir hafta') : null);
    const expect = {
      en: [
        `last ${nums.chat} messages`, `at most ${nums.images})`, `at most ${nums.emojis} per`, `${nums.empty} hours after the last person leaves`,
        `${nums.saved} days if the host saved`, `last ${nums.history} videos`, `up to ${nums.recapsSaved} in a saved room, ${nums.recaps} otherwise`,
        `at most ${nums.recapDays} days`, `${nums.title} days`, `(kept ${nums.memberIds}\n            hours)`.replace(/\s+/g, ' '),
        `for ${nums.admitted} hours that the host let`, `at most ${nums.tv}\n            hours`.replace(/\s+/g, ' '), `valid for ${nums.tvCode}\n            minutes`.replace(/\s+/g, ' '),
        `deleted ${nums.game} hours after the last\n            player leaves`.replace(/\s+/g, ' '), `after ${nums.move} minutes or once used`,
        `kept ${nums.usage} days`, `up to ${nums.ytCache} hours by the\n            words`.replace(/\s+/g, ' '), day(nums.tiktok, true),
        nums.podSearch === 24 ? 'a day for searches' : `${nums.podSearch} hours for searches`, nums.podEpisodes === 1 ? 'an hour for\n            episodes'.replace(/\s+/g, ' ') : `${nums.podEpisodes} hours for episodes`,
      ],
      tr: [
        `son ${nums.chat} mesajı`, `(en fazla ${nums.images})`, `odada en fazla ${nums.emojis}`, `${nums.empty} saat sonra`, `${nums.saved}\n          gün sonra`.replace(/\s+/g, ' '),
        `son ${nums.history} video`, `kayıtlı odada en fazla ${nums.recapsSaved}, diğerlerinde ${nums.recaps}`, `en fazla ${nums.recapDays} gün`,
        `en fazla ${nums.title} gün`, `(${nums.memberIds} saat tutulur)`, `${nums.admitted} saat hatırlansın`, `en fazla ${nums.tv} saat`,
        `${nums.tvCode} dakika\n            geçerlidir`.replace(/\s+/g, ' '), `son oyuncu çıktıktan ${nums.game} saat sonra silinir`, `kod ${nums.move} dakika sonra`,
        `${nums.usage} gün tutulur`, `en fazla ${nums.ytCache} saat tutulur`, day(nums.tiktok, false),
        nums.podSearch === 24 ? 'aramalarda bir gün' : `aramalarda ${nums.podSearch} saat`, nums.podEpisodes === 1 ? 'bölümlerde bir saat' : `bölümlerde ${nums.podEpisodes} saat`,
      ],
    };
    const ids = {};
    for (const lang of ['en', 'tr']) {
      const page = await ctx.newPage();
      const problems = [];
      page.on('pageerror', (e) => problems.push(e.message));
      page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
      await page.goto(`${base}/privacy.html?lang=${lang}`);
      const info = await page.evaluate((lang) => {
        const block = document.querySelector(`[data-lang-block="${lang}"]`);
        const local = [...block.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href').slice(1));
        return {
          shown: !block.hidden,
          local,
          unresolved: local.filter((id) => !block.querySelector(`[id="${id}"]`)),
          ids: [...block.querySelectorAll('h2[id]')].map((e) => e.id.replace(/-tr$/, '')),
          rows: block.querySelectorAll('table tr').length,
          date: block.querySelector('.muted').textContent,
          text: block.innerText.replace(/\s+/g, ' '),
        };
      }, lang);
      ids[lang] = info;
      check(info.shown && info.unresolved.length === 0 && info.local.length >= 18, `privacy ${lang}: every contents link has its section`, info.unresolved);
      const wrong = expect[lang].filter((s) => s && !info.text.includes(s.replace(/\s+/g, ' ')));
      check(wrong.length === 0, `privacy ${lang}: the numbers match the code (${JSON.stringify(nums)})`, wrong);
      check(/screenwithme\.app@gmail\.com/.test(info.text) && /Alperen Aktürk/.test(info.text), `privacy ${lang}: names the controller and the contact address`);
      check(problems.length === 0, `privacy ${lang}: no CSP or page errors`, problems);
      await page.setViewportSize({ width: 360, height: 740 });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `privacy ${lang}: no sideways scroll on a phone`);
      await page.close();
    }
    check(JSON.stringify(ids.en.ids) === JSON.stringify(ids.tr.ids) && ids.en.rows === ids.tr.rows, 'privacy: English and Turkish have the same sections and table rows', { en: ids.en.ids, tr: ids.tr.ids, rows: [ids.en.rows, ids.tr.rows] });
    const dateEn = /Last updated: (\d+) (\w+) (\d{4})/.exec(ids.en.date);
    const dateTr = /Son güncelleme: (\d+) (\S+) (\d{4})/.exec(ids.tr.date);
    check(!!dateEn && !!dateTr && dateEn[1] === dateTr[1] && dateEn[3] === dateTr[3] && ids.en.text.includes(`${dateEn[1]} ${dateEn[2]} ${dateEn[3]}:`), 'privacy: a dated change line for the date at the top, the same in both languages', { en: ids.en.date, tr: ids.tr.date });
  }

  // Card TOS: the terms of use, in both languages: every contents link has its section, the same sections in EN and TR,
  // a dated change line, YouTube's Terms linked, the abuse contact with its answer time, the room retention it states
  // matching the privacy policy's numbers; linked from the footer, the help page and the extension page.
  {
    const nums = {
      empty: constant('apps/server/src/room.ts', 'EMPTY_ROOM_TTL_MS') / 3_600_000,
      saved: constant('apps/server/src/room.ts', 'SAVED_ROOM_TTL_MS') / 86_400_000,
    };
    const terms = {};
    for (const lang of ['en', 'tr']) {
      const page = await ctx.newPage();
      const problems = [];
      page.on('pageerror', (e) => problems.push(e.message));
      page.on('console', (m) => m.type() === 'error' && problems.push(m.text()));
      await page.goto(`${base}/terms.html?lang=${lang}`);
      const info = await page.evaluate((lang) => {
        const block = document.querySelector(`[data-lang-block="${lang}"]`);
        const local = [...block.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href').slice(1));
        return {
          shown: !block.hidden,
          title: document.title,
          local,
          unresolved: local.filter((id) => !block.querySelector(`[id="${id}"]`)),
          ids: [...block.querySelectorAll('h2[id]')].map((e) => e.id.replace(/-tr$/, '')),
          youtube: !!block.querySelector('a[href^="https://www.youtube.com/t/terms"]'),
          privacy: !!block.querySelector(`a[href^="/privacy.html?lang=${lang}"]`),
          date: block.querySelector('.muted').textContent,
          text: block.innerText.replace(/\s+/g, ' '),
        };
      }, lang);
      terms[lang] = info;
      check(info.shown && info.local.length >= 13 && info.unresolved.length === 0, `terms ${lang}: every contents link has its section`, info.unresolved);
      check(info.youtube && info.privacy, `terms ${lang}: links YouTube's Terms of Service and the privacy policy`);
      const abuse = lang === 'en' ? ['"Report"', 'within 72 hours', 'a day after the last person leaves (30 days for a saved room)'] : ['"Bildirim"', '72 saat içinde', 'son kişi çıktıktan bir gün sonra silinir (kayıtlı odada 30 gün)'];
      const missing = abuse.filter((x) => !info.text.includes(x));
      check(nums.empty === 24 && nums.saved === 30 && missing.length === 0, `terms ${lang}: the abuse contact, its answer time and the room's lifetime as the code keeps it`, missing);
      check(/screenwithme\.app@gmail\.com/.test(info.text) && /Alperen Aktürk/.test(info.text), `terms ${lang}: names who runs Sidelit and the contact address`);
      check(/13/.test(info.text) && /16/.test(info.text), `terms ${lang}: the same age rule as the privacy policy (13+, a parent under 16)`);
      check(problems.length === 0, `terms ${lang}: no CSP or page errors`, problems);
      await page.setViewportSize({ width: 360, height: 740 });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `terms ${lang}: no sideways scroll on a phone`);
      await page.close();
    }
    check(terms.en.ids.length >= 13 && JSON.stringify(terms.en.ids) === JSON.stringify(terms.tr.ids), 'terms: English and Turkish have the same sections', { en: terms.en.ids, tr: terms.tr.ids });
    const dEn = /Last updated: (\d+) (\w+) (\d{4})/.exec(terms.en.date);
    const dTr = /Son güncelleme: (\d+) (\S+) (\d{4})/.exec(terms.tr.date);
    check(!!dEn && !!dTr && dEn[1] === dTr[1] && dEn[3] === dTr[3] && terms.en.text.includes(`${dEn[1]} ${dEn[2]} ${dEn[3]}:`), 'terms: a dated change line for the date at the top, the same in both languages', { en: terms.en.date, tr: terms.tr.date });
    const linked = ['index.html', 'public/help.html', 'public/extension.html'].filter((f) => !fs.readFileSync(path.join(ROOT, 'apps/web', f), 'utf8').includes('/terms.html'));
    check(linked.length === 0 && fs.readFileSync(path.join(ROOT, 'apps/web/src/room.ts'), 'utf8').includes('id="join-terms"'), 'terms: linked from the footer, the join card, the help page and the extension page', linked);
    const siteUp = await fetch(SITE).then(() => true, () => false);
    if (!siteUp) console.log(`skip the footer's terms link: ${SITE} is not running`);
    else {
      const home = await ctx.newPage();
      await home.goto(`${SITE}/`);
      await home.evaluate(() => localStorage.setItem('lang', 'tr'));
      await home.reload();
      await home.waitForFunction(() => document.querySelector('a[data-terms-link]')?.getAttribute('href') !== '/terms.html', null, { timeout: 5000 }).catch(() => {});
      const footer = await home.evaluate(() => document.querySelector('a[data-terms-link]')?.getAttribute('href'));
      check(footer === '/terms.html?lang=tr', 'terms: the footer opens the terms in the page\'s language', footer);
      await home.close();
    }
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
  const ext = fs.readFileSync(path.join(PUBLIC, 'extension.html'), 'utf8');
  check(/href="\/help\.html"/.test(ext), 'the extension page links the help page');
  // Card 8: the extension page says why it asks for every website, in both languages, with a link to the answer.
  const extPage = await ctx.newPage();
  for (const lang of ['en', 'tr']) {
    await extPage.goto(`${base}/extension.html?lang=${lang}`);
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

  // BH3 (consistency): every number the privacy policy states is the code's, in both languages.
  {
    const raw = fs.readFileSync(path.join(PUBLIC, 'privacy.html'), 'utf8');
    const block = (lang) => {
      const start = raw.indexOf(`data-lang-block="${lang}"`);
      const end = lang === 'en' ? raw.indexOf('data-lang-block="tr"') : raw.length;
      return raw.slice(start, end).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
    };
    const H = 3_600_000;
    const D = 86_400_000;
    const n = {
      chat: constant('apps/server/src/room.ts', 'CHAT_HISTORY'),
      images: constant('packages/shared/src/protocol.ts', 'MAX_CHAT_IMAGES'),
      session: constant('packages/shared/src/recap.ts', 'SESSION_GAP_MS') / H,
      recapsSaved: constant('packages/shared/src/recap.ts', 'RECAPS_KEEP_SAVED'),
      recaps: constant('packages/shared/src/recap.ts', 'RECAPS_KEEP'),
      recapDays: constant('packages/shared/src/recap.ts', 'RECAP_MAX_AGE_MS') / D,
      moveMin: constant('packages/shared/src/move.ts', 'MOVE_TTL_MS') / 60_000,
      videos: constant('apps/server/src/room.ts', 'MAX_HISTORY'),
      stickers: constant('packages/shared/src/protocol.ts', 'MAX_STICKERS'),
      emptyH: constant('apps/server/src/room.ts', 'EMPTY_ROOM_TTL_MS') / H,
      savedDays: constant('apps/server/src/room.ts', 'SAVED_ROOM_TTL_MS') / D,
      tvTokenH: constant('apps/server/src/room.ts', 'TV_TOKEN_TTL_MS') / H,
      tvCodeMin: constant('apps/server/src/tv-link.ts', 'CODE_TTL_MS') / 60_000,
      gameH: constant('apps/server/src/game.ts', 'EMPTY_TTL_MS') / H,
      searchH: constant('apps/server/src/youtube.ts', 'RESULT_TTL_S') / 3600,
      titleDays: constant('packages/shared/src/room-logic.ts', 'TITLE_MAX_AGE_MS') / D,
      usageDays: constant('packages/shared/src/yt-usage.ts', 'USAGE_DAYS'),
      admitH: constant('apps/server/src/room.ts', 'ADMIT_TTL_MS') / H,
    };
    // The privacy policy's numbers are checked with the page itself above (privacy card, 0.9.97.60).
    void n;
    // Card MB: the numbers added since (the image budget, the room info / probe limit) and the TV being off.
    {
      const ipMb = constant('packages/shared/src/upload-budget.ts', 'UPLOAD_BYTES_PER_IP_DAY') / 1_000_000;
      const allMb = constant('packages/shared/src/upload-budget.ts', 'UPLOAD_BYTES_PER_DAY') / 1_000_000;
      // Room information and /api/probe share ROOM_INFO_LIMIT (wrangler.jsonc, per minute).
      const perMin = limit('ROOM_INFO_LIMIT');
      const says = {
        en: [`at most ${ipMb} MB of images per address and ${allMb} MB for everyone a day`, `at most ${perMin} a minute per address`, 'a test version, hidden by default'],
        tr: [`günde adres başına en fazla ${ipMb} MB, herkes için toplam ${allMb} MB resim`, `adres başına dakikada en fazla ${perMin}`, 'deneme sürümü, normalde gizli'],
      };
      for (const lang of ['en', 'tr']) {
        const text = block(lang);
        const wrong = says[lang].filter((x) => !text.includes(x));
        check(wrong.length === 0, `privacy ${lang}: image budget ${ipMb} / ${allMb} MB, info limit ${perMin} a minute, the TV hidden`, wrong);
      }
      // "Hidden" is true only while the deployed Worker has no TV=on (R4-10: the variable is set only locally).
      const wrangler = fs.readFileSync(path.join(ROOT, 'apps/server/wrangler.jsonc'), 'utf8');
      check(!/"TV"\s*:\s*"on"/.test(wrangler), 'the TV is off in the deployed config, as the privacy policy says');
      const helpText = helpHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const upload = [`at most ${ipMb} MB a day from one address`, `günde en fazla ${ipMb} MB`];
      check(upload.every((x) => helpText.includes(x)), `help (EN + TR): the image budget is the code's (${ipMb} MB)`, upload.filter((x) => !helpText.includes(x)));
    }
    // The games hall's quiz line ("Almost 400 questions in 11 topics") against the question bank (it once said "over
    // 400" with 395).
    const i18n = fs.readFileSync(path.join(ROOT, 'apps/web/src/i18n.ts'), 'utf8');
    const bank = fs.readFileSync(path.join(ROOT, 'packages/shared/src/games/quiz-questions.ts'), 'utf8');
    const topics = (/QUIZ_CATEGORIES = \[([^\]]+)\]/.exec(bank)?.[1] ?? '').split(',').length;
    // The real bank, loaded the way the server does (Node strips the types).
    const entries = Number(
      require('child_process')
        .spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', `import { QUIZ_BANK } from ${JSON.stringify('file://' + path.join(ROOT, 'packages/shared/src/games/quiz-questions.ts'))}; console.log(QUIZ_BANK.length);`], { encoding: 'utf8' })
        .stdout.trim(),
    );
    const quizLines = [...i18n.matchAll(/'games\.quiz\.text': '([^']+)'/g)].map((m) => m[1]);
    const claims = quizLines.map((line) => ({ line, almost: /Almost (\d+)|(\d+)’e yakın/.exec(line), topics: /(\d+) (?:topics|konu)/.exec(line)?.[1] }));
    const honest = claims.every((c) => c.almost && Number(c.almost[1] ?? c.almost[2]) > entries && entries >= Number(c.almost[1] ?? c.almost[2]) - 50 && Number(c.topics) === topics);
    check(honest, `the quiz line matches the bank (${entries} questions, ${topics} topics)`, claims.map((c) => c.line));
  }
  await browser.close();
  server.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ Help page works');
  process.exit(failed ? 1 : 0);
})();
