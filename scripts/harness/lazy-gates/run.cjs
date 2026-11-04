// Card SZ: the room's lazy chunks. The IP notice is a privacy gate (security review 1, W1): when its chunk can't load,
// joining voice, starting a stream and watching one must fail closed (nothing goes to the room, the person is told).
// Also: the voice windows and the stream engine are not downloaded with the room, but are fetched by themselves once
// the room has settled (so a first press opens them at once).
//
//   built site on wrangler dev (CI):  npm run build && (cd apps/server && npx wrangler dev --port 8787)
//                                     node scripts/harness/lazy-gates/run.cjs http://localhost:8787
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const LAZY = /\/(ip-notice|voice-check|live-engine)-[\w-]+\.js$/;
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};
const until = async (fn, ms = 6000) => {
  for (let i = 0; i < ms / 150; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
};

async function person(browser, room, name, { blockNotice = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['microphone', 'camera'] });
  // A blocked chunk makes main.ts reload the page once ("a new version"); here it has already done so (offline).
  if (blockNotice) await ctx.addInitScript(() => sessionStorage.setItem('swm-stale-reload', String(Date.now())));
  await ctx.addInitScript(() => {
    localStorage.setItem('lang', 'en');
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('tipsSeen', '1');
    localStorage.setItem('opt:voiceCheck', 'skip');
  });
  const page = await ctx.newPage();
  const fetched = [];
  const sent = [];
  page.on('request', (r) => {
    if (LAZY.test(r.url())) fetched.push(r.url().match(LAZY)[1]);
  });
  page.on('websocket', (ws) => ws.on('framesent', (f) => sent.push(String(f.payload))));
  if (blockNotice) await page.route(/\/ip-notice-[\w-]+\.js$/, (route) => route.abort());
  await page.goto(`${SITE}/r/${room}`);
  await page.fill('#name', name);
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await page.waitForFunction(() => document.documentElement.dataset.swmTransport === 'ws', null, { timeout: 15000 });
  return { page, fetched, sent, ctx };
}
const sentVoiceOn = (p) => p.sent.some((m) => /"t":"voice"/.test(m) && /"on":true/.test(m));
const sentLiveOn = (p) => p.sent.some((m) => /"t":"live"/.test(m) && /"on":true/.test(m));
const hint = (page) => page.evaluate(() => [...document.querySelectorAll('.hint-bubble')].map((h) => h.textContent).join(' | '));

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--auto-select-desktop-capture-source=Entire screen'] });
  const room = `lazy${Math.random().toString(36).slice(2, 7)}`;

  // ---- Not with the room; fetched once it has settled ----
  const alex = await person(browser, room, 'Alex');
  await alex.page.waitForTimeout(1500);
  check(alex.fetched.length === 0, 'the IP notice, the pre-join check and the stream engine are not downloaded with the room', alex.fetched.join(' '));
  const warmed = await until(async () => ['ip-notice', 'voice-check', 'live-engine'].every((c) => alex.fetched.includes(c)), 12000);
  check(!!warmed, 'they are fetched by themselves once the room has settled', alex.fetched.join(' '));

  // ---- The gate fails closed when its chunk can't load ----
  const sam = await person(browser, room, 'Sam', { blockNotice: true });
  await sam.page.click('#voice-join');
  await sam.page.waitForTimeout(1500);
  check(!sentVoiceOn(sam), 'blocked IP notice: joining voice sends nothing to the room');
  check(await sam.page.evaluate(() => document.getElementById('voice-on').hidden), 'blocked IP notice: not in voice');
  check(/voice/i.test(await hint(sam.page)), 'blocked IP notice: the person is told', await hint(sam.page));

  await sam.page.click('#live-share');
  await sam.page.click('#live-screen');
  await sam.page.waitForTimeout(1500);
  check(!sentLiveOn(sam), 'blocked IP notice: starting a stream sends nothing to the room');
  check(await sam.page.evaluate(() => document.getElementById('live-window').hidden), 'blocked IP notice: no stream window');

  // ---- Control: with the chunk the notice shows and voice goes ahead ----
  await alex.page.click('#voice-join');
  const notice = await until(() => alex.page.evaluate(() => !!document.querySelector('.dialog-backdrop:not([hidden]) .ip-notice, .ip-notice')));
  check(!!notice, 'with its chunk the IP notice shows before voice');
  if (notice) await alex.page.click('.confirm-dialog .btn.primary');
  check(!!(await until(async () => sentVoiceOn(alex))), 'after "yes" Alex joins voice');

  // ---- Sam watches Alex's stream: blocked notice = no watching ----
  await alex.page.click('#live-share');
  await alex.page.click('#live-screen');
  const ask = await until(() => alex.page.evaluate(() => !!document.querySelector('.ip-notice')));
  if (ask) await alex.page.click('.confirm-dialog .btn.primary');
  const streaming = await until(async () => sentLiveOn(alex), 10000);
  if (streaming) {
    const watch = await until(() => sam.page.evaluate(() => !document.getElementById('live-watch').hidden), 8000);
    if (watch) {
      await sam.page.click('#live-watch');
      await sam.page.waitForTimeout(1500);
      check(!sam.sent.some((m) => /"t":"live-watch"/.test(m) && /"on":true/.test(m)), 'blocked IP notice: watching a stream sends nothing to the room');
    } else check(false, 'Sam sees "Watch" for Alex\'s stream');
  } else console.log('     (no screen capture in this browser: the watch check is skipped)');

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Lazy chunks and their gates work');
  process.exit(fails ? 1 : 0);
})();
