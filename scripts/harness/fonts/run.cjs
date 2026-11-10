// Card FONT1: the "Font" setting. Checks that the default (Sidelit: Bricolage Grotesque + Figtree, card NP1) downloads
// only its own text font; that the device font downloads none in the room; that each choice applies at once, downloads only its own files (and the latin-ext one only when Turkish letters show) and
// stays after a reload; that the home titles use the wordmark's family with all Turkish letters; and the Test Lab's
// font commands.
//
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 --var SWM_LAB_SERVER:1)
//   NODE_PATH=$(npm root -g) node scripts/harness/fonts/run.cjs [site]
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, label, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra !== '' ? ` → ${typeof extra === 'string' ? extra : JSON.stringify(extra)}` : ''}`);
};

const FILES = {
  sidelit: 'figtree',
  poster: 'manrope',
  polished: 'plus-jakarta-sans',
  readable: 'atkinson-hyperlegible-next',
  rounded: 'nunito',
  easy: 'lexend',
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript(() => {
    for (const [k, v] of Object.entries({ lang: 'en', name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', 'swm:debug': '1' })) localStorage.setItem(k, v);
    sessionStorage.setItem('swm:debug', '1');
  });
  const page = await ctx.newPage();
  let fonts = [];
  page.on('request', (r) => {
    // The top bar's wordmark (bricolage-grotesque-800, since 0.9.95) loads on every page; it is not a text font.
    if (/\/fonts\/.*\.woff2/.test(r.url()) && !/bricolage-grotesque-800/.test(r.url())) fonts.push(r.url().split('/fonts/')[1]);
  });

  // Home: the titles use Bricolage Grotesque (the wordmark's family), the Turkish home too.
  await page.goto(`${SITE}/?debug=1`);
  await page.waitForSelector('.hm-slogan');
  await page.evaluate(() => document.fonts.ready);
  await wait(500);
  const title = await page.evaluate(() => getComputedStyle(document.querySelector('.hm-slogan')).fontFamily);
  check(/Sidelit Title/.test(title), 'home: the title uses the wordmark family', title);
  check(fonts.some((f) => f.startsWith('bricolage-grotesque-latin')), 'home: the title font is downloaded', fonts);
  check(fonts.some((f) => f.startsWith('figtree-latin')), 'home: the default text font (Figtree) is downloaded', fonts);
  check(!fonts.some((f) => /nunito|lexend|atkinson|manrope|plus-jakarta|fraunces/.test(f)), 'home: no other text font', fonts);
  const turkish = await page.evaluate(async () => {
    await document.fonts.load('800 64px "Sidelit Title"', 'ğĞşŞıİçÇöÖüÜ');
    return document.fonts.check('800 64px "Sidelit Title"', 'ğĞşŞıİçÇöÖüÜ');
  });
  check(turkish, 'home: the title font has every Turkish letter');

  // The room: the default downloads Figtree and nothing else for the text.
  const room = 'ft' + Math.random().toString(36).slice(2, 7);
  fonts = [];
  await page.goto(`${SITE}/r/${room}`);
  await page.fill('#name', 'Robin');
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await wait(3500);
  check(fonts.every((f) => /^(figtree|bricolage)/.test(f)), 'room: only the default font files are downloaded', fonts);
  const body = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  check(/^"Sidelit Body"/.test(body), 'room: the body uses the default font (Figtree)', body);

  // The setting: five choices with names.
  await page.evaluate(() => document.querySelector('#settings-open')?.click());
  await page.waitForSelector('#opt-font', { state: 'visible' });
  const options = await page.$$eval('#opt-font option', (o) => o.map((x) => [x.value, x.textContent.trim()]));
  check(options.length === 7 && options.every(([, text]) => text.length > 1), 'setting: seven named choices', options);
  check((await page.$eval('#opt-font', (s) => s.value)) === 'sidelit', 'setting: Sidelit is the default');
  await page.selectOption('#opt-font', 'device');
  await wait(300);
  const dev = await page.evaluate(() => [document.documentElement.dataset.font, getComputedStyle(document.body).fontFamily]);
  check(dev[0] === 'device' && /system-ui/.test(dev[1]) && !/Sidelit/.test(dev[1]), 'device: the device font is still a choice', dev);

  for (const [id, file] of Object.entries(FILES)) {
    fonts = [];
    await page.selectOption('#opt-font', id);
    await page.evaluate(() => document.fonts.ready);
    await wait(600);
    const shown = await page.evaluate(() => [document.documentElement.dataset.font, getComputedStyle(document.body).fontFamily]);
    check(shown[0] === id && shown[1].startsWith('"Sidelit'), `${id}: applies at once`, shown);
    // Sidelit's Figtree was downloaded with the page already (the default), so a second request is not expected.
    if (id === 'sidelit') check(await page.evaluate(() => document.fonts.check('16px "Sidelit Body"')), 'sidelit: its font is loaded');
    else check(fonts.some((f) => f.startsWith(`${file}-latin`)), `${id}: its font is downloaded`, fonts);
    const title = id === 'poster' ? 'fraunces' : 'bricolage';
    check(fonts.every((f) => f.startsWith(file) || f.startsWith(title)), `${id}: no other font is downloaded`, fonts);
    const tr = await page.evaluate(async () => {
      const face = getComputedStyle(document.body).fontFamily.split(',')[0];
      await document.fonts.load(`16px ${face}`, 'ğşİı');
      return document.fonts.check(`16px ${face}`, 'ğşİı');
    });
    check(tr, `${id}: Turkish letters (ğ ş İ ı) come from the font`);
  }

  // Stays after a reload.
  await page.selectOption('#opt-font', 'rounded');
  await page.reload();
  await page.waitForSelector('.room');
  check((await page.evaluate(() => document.documentElement.dataset.font)) === 'rounded', 'the choice stays after a reload');

  // Test Lab: fonts.next shows the next one on this page only; fonts.<id> one font.
  await page.waitForFunction(() => !!window.__swmLab, null, { timeout: 20000 }).catch(() => {});
  if (await page.evaluate(() => !!window.__swmLab)) {
    await page.evaluate(() => window.__swmLab.run('fonts.next'));
    check((await page.evaluate(() => document.documentElement.dataset.font)) === 'easy', 'Test Lab: fonts.next shows the next font (Rounded → Easy reading)');
    check((await page.evaluate(() => localStorage.getItem('font'))) === 'rounded', 'Test Lab: the saved font stays');
    await page.evaluate(() => window.__swmLab.run('fonts.device'));
    check((await page.evaluate(() => document.documentElement.dataset.font ?? 'device')) === 'device', 'Test Lab: fonts.device shows the device font');
  } else check(false, 'Test Lab: available with ?debug=1');

  // Back to the device font: nothing to download after a reload.
  await page.evaluate(() => document.querySelector('#settings-open')?.click());
  await page.waitForSelector('#opt-font', { state: 'visible' });
  await page.selectOption('#opt-font', 'device');
  fonts = [];
  await page.reload();
  await page.waitForSelector('.room');
  await wait(2500);
  check(fonts.length === 0, 'device font again: no font file after a reload', fonts);

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Font setting harness passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
