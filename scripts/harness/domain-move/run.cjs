// Moving to an own domain (card R3-3, docs/internal/custom-domain.md): the site is built with a test site.config.json
// whose main address is http://localhost:PORT and whose alias is http://127.0.0.1:PORT (one server, two addresses,
// like the Worker serving workers.dev and the own domain). Checks:
//   - a room link on the alias lands on the same room on the main address, with the page's fragment (one the site leaves alone) kept and
//     no `#handoff=` left in the address bar;
//   - the browser's saves went along: name, avatar, saved rooms, a game save (move keys) and a plain setting (lang);
//     a value the main address already had is not overwritten (fill only what is empty);
//   - a second visit to the alias only redirects (the saves went along once);
//   - a static page (help.html) on the alias moves to the main address too (domain.js);
//   - a crafted `#handoff=` opened directly on the main address (no alias referrer) writes nothing and is cleared;
//   - with the real site.config.json (no aliases) nothing moves.
//
//   NODE_PATH=$(npm root -g) node scripts/harness/domain-move/run.cjs
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '../../..');
const PORT = Number(process.env.PORT || 5391);
const MAIN = `http://localhost:${PORT}`;
const ALIAS = `http://127.0.0.1:${PORT}`;
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'swm-domain-'));
const config = path.join(work, 'site.config.json');
const out = path.join(work, 'dist');
fs.writeFileSync(config, JSON.stringify({ origin: MAIN, aliases: [ALIAS] }));
console.log('building the site with a two-address test config…');
execFileSync('npx', ['vite', 'build', '--outDir', out, '--emptyOutDir', '--logLevel', 'error'], {
  cwd: path.join(ROOT, 'apps/web'),
  env: { ...process.env, SWM_SITE_CONFIG: config },
  stdio: 'inherit',
});

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, MAIN).pathname);
  if (pathname.startsWith('/api/')) return res.writeHead(404).end('{}');
  let file = path.join(out, path.normalize(pathname).replace(/^([/\\])+/, ''));
  if (!file.startsWith(out) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(out, 'index.html');
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'referrer-policy': 'strict-origin-when-cross-origin' });
  res.end(fs.readFileSync(file));
});

const SAVED = JSON.stringify([{ id: 'abc12345', name: 'Movie club', mine: true, at: 1 }]);
const SNACK = JSON.stringify({ v: 1, coins: 1234, earned: 5000 });

(async () => {
  await new Promise((resolve) => server.listen(PORT, resolve));
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // The main address already has a language; the alias has saves of its own.
    await page.goto(`${MAIN}/help.html`);
    await page.evaluate(() => localStorage.setItem('lang', 'tr'));
    await page.goto(`${ALIAS}/help.html`);
    await page.waitForURL(`${MAIN}/help.html`, { timeout: 5000 }).catch(() => {});
    check(page.url() === `${MAIN}/help.html`, 'a static page on the alias moves to the main address', page.url());

    // Saves on the alias (written on a page that doesn't move: the fake 404 api path).
    await page.goto(`${ALIAS}/api/blank`);
    await page.evaluate(
      ({ SAVED, SNACK }) => {
        localStorage.setItem('name', 'Alex');
        localStorage.setItem('avatar', 'wizard');
        localStorage.setItem('savedRooms', SAVED);
        localStorage.setItem('snackBar', SNACK);
        localStorage.setItem('lang', 'en');
        localStorage.setItem('opt:sounds', '0');
      },
      { SAVED, SNACK },
    );

    // A fragment the site doesn't act on (the room clears `#back` itself after reading it, which raced this check).
    await page.goto(`${ALIAS}/r/abc12345#keep-me`);
    await page.waitForURL((u) => u.origin === MAIN, { timeout: 8000 }).catch(() => {});
    await page.waitForFunction(() => location.hash === '#keep-me', null, { timeout: 8000 }).catch(() => {});
    const landed = new URL(page.url());
    check(landed.origin === MAIN && landed.pathname === '/r/abc12345', 'a room link on the alias lands on the same room on the main address', page.url());
    check(landed.hash === '#keep-me', 'the page fragment is kept and the handoff is gone from the address', landed.hash);
    const got = await page.evaluate(() => Object.fromEntries(['name', 'avatar', 'savedRooms', 'snackBar', 'lang', 'opt:sounds'].map((k) => [k, localStorage.getItem(k)])));
    check(got.name === 'Alex' && got.avatar === 'wizard', 'name and avatar went along', got);
    check((got.savedRooms || '').includes('abc12345'), 'saved rooms went along', got.savedRooms);
    check(got.snackBar === SNACK, 'a game save went along', got.snackBar);
    check(got['opt:sounds'] === '0', 'a plain setting went along', got['opt:sounds']);
    check(got.lang === 'tr', 'a value the main address already had is kept', got.lang);

    // A second visit to the alias only redirects.
    const second = [];
    page.on('framenavigated', (f) => f === page.mainFrame() && second.push(f.url()));
    await page.goto(`${ALIAS}/`);
    await page.waitForURL((u) => u.origin === MAIN, { timeout: 8000 }).catch(() => {});
    check(new URL(page.url()).origin === MAIN, 'a second alias visit still moves to the main address', page.url());
    check(!second.some((u) => u.includes('#handoff=')), 'the second visit carries nothing', second);

    // A crafted handoff opened directly (no alias referrer) writes nothing.
    const fresh = await browser.newContext();
    const p2 = await fresh.newPage();
    const crafted = encodeURIComponent(JSON.stringify({ at: Date.now(), move: JSON.stringify({ v: 1, at: 1, items: { name: 'Mallory' } }), extra: { 'opt:sounds': '0' }, hash: '#theme' }));
    await p2.goto(`${MAIN}/#handoff=${crafted}`);
    await p2.waitForFunction(() => !location.hash.startsWith('#handoff='), null, { timeout: 8000 }).catch(() => {});
    const fake = await p2.evaluate(() => ({ name: localStorage.getItem('name'), sounds: localStorage.getItem('opt:sounds'), hash: location.hash }));
    check(fake.name !== 'Mallory' && fake.sounds === null, 'a handoff without an alias referrer writes nothing', fake);
    check(!fake.hash.startsWith('#handoff='), 'and is cleared from the address', fake.hash);
    await fresh.close();

    // With an alias referrer: a fresh handoff is taken, an old or oversized one is not.
    const handoffUrl = (at, extra) => `${MAIN}/#handoff=${encodeURIComponent(JSON.stringify({ at, move: JSON.stringify({ v: 1, at: 1, items: {} }), extra, hash: '' }))}`;
    const tryHandoff = async (url) => {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      await p.goto(url, { referer: `${ALIAS}/` });
      await p.waitForFunction(() => !location.hash.startsWith('#handoff='), null, { timeout: 8000 }).catch(() => {});
      const value = await p.evaluate(() => ({ v: localStorage.getItem('opt:test'), hash: location.hash }));
      await ctx.close();
      return value;
    };
    const freshTake = await tryHandoff(handoffUrl(Date.now(), { 'opt:test': 'yes' }));
    check(freshTake.v === 'yes' && freshTake.hash === '', 'a fresh handoff from the alias is taken and cleared', freshTake);
    const oldTake = await tryHandoff(handoffUrl(Date.now() - 10 * 60_000, { 'opt:test': 'yes' }));
    check(oldTake.v === null && oldTake.hash === '', 'a handoff older than two minutes writes nothing (and is cleared)', oldTake);
    const bigTake = await tryHandoff(handoffUrl(Date.now(), { 'opt:test': 'yes', 'opt:big': 'x'.repeat(1_300_000) }));
    check(bigTake.v === null && bigTake.hash === '', 'an oversized handoff writes nothing (and is cleared)', bigTake.v);

    check(!errors.some((e) => /handoff|domain/i.test(e)), 'no page errors from the move', errors);

    // With the repo's real config (no aliases) the build's domain.js moves nothing.
    const real = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
    const realJs = fs.existsSync(path.join(ROOT, 'apps/web/dist/domain.js')) ? fs.readFileSync(path.join(ROOT, 'apps/web/dist/domain.js'), 'utf8') : null;
    if (realJs) check(realJs.includes(JSON.stringify(real.aliases)) && realJs.includes(real.origin), 'the real build carries the real config', real);
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(work, { recursive: true, force: true });
  }
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
