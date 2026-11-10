// Card SZ: the room's lazy chunks. The voice windows and the stream engine are not downloaded with the room, but are
// fetched by themselves once the room has settled (so a first press opens them at once). When a chunk can't load,
// joining voice, starting a stream and watching one fail closed (nothing goes to the room, the person is told).
// Card SIMP1 removed the IP notice: with the chunks there, "Join voice" and "Screen" go ahead with no notice first.
//
//   built site on wrangler dev (CI):  npm run build && (cd apps/server && npx wrangler dev --port 8787)
//                                     node scripts/harness/lazy-gates/run.cjs http://localhost:8787
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const LAZY = /\/(voice-check|live-engine)-[\w-]+\.js$/;
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

async function person(browser, room, name, { blockChunks = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['microphone', 'camera'] });
  // A blocked chunk makes main.ts reload the page once ("a new version"); here it has already done so (offline).
  if (blockChunks) await ctx.addInitScript(() => sessionStorage.setItem('swm-stale-reload', String(Date.now())));
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
  if (blockChunks) await page.route(LAZY, (route) => route.abort());
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
  check(alex.fetched.length === 0, 'the pre-join check and the stream engine are not downloaded with the room', alex.fetched.join(' '));
  const warmed = await until(async () => ['voice-check', 'live-engine'].every((c) => alex.fetched.includes(c)), 12000);
  check(!!warmed, 'they are fetched by themselves once the room has settled', alex.fetched.join(' '));

  // ---- Voice and streams fail closed when their chunks can't load ----
  const sam = await person(browser, room, 'Sam', { blockChunks: true });
  await sam.page.click('#voice-join');
  await sam.page.waitForTimeout(1500);
  check(!sentVoiceOn(sam), 'blocked chunks: joining voice sends nothing to the room');
  check(await sam.page.evaluate(() => document.getElementById('voice-on').hidden), 'blocked chunks: not in voice');
  check(/voice/i.test(await hint(sam.page)), 'blocked chunks: the person is told', await hint(sam.page));

  await sam.page.click('#live-share');
  await sam.page.click('#live-screen');
  await sam.page.waitForTimeout(1500);
  check(!sentLiveOn(sam), 'blocked chunks: starting a stream sends nothing to the room');
  check(await sam.page.evaluate(() => document.getElementById('live-window').hidden), 'blocked chunks: no stream window');

  // ---- Control: with the chunks voice goes ahead, no IP notice first (card SIMP1) ----
  await alex.page.click('#voice-join');
  check(!!(await until(async () => sentVoiceOn(alex))), 'with its chunk Alex joins voice');
  check(!(await alex.page.evaluate(() => !!document.querySelector('.ip-notice'))), 'no IP notice before voice');

  // ---- Sam watches Alex's stream: a blocked stream engine = no watching ----
  await alex.page.click('#live-share');
  await alex.page.click('#live-screen');
  const streaming = await until(async () => sentLiveOn(alex), 10000);
  if (streaming) {
    const watch = await until(() => sam.page.evaluate(() => !document.getElementById('live-watch').hidden), 8000);
    if (watch) {
      await sam.page.click('#live-watch');
      await sam.page.waitForTimeout(1500);
      check(!sam.sent.some((m) => /"t":"live-watch"/.test(m) && /"on":true/.test(m)), 'blocked chunks: watching a stream sends nothing to the room');
    } else check(false, 'Sam sees "Watch" for Alex\'s stream');
  } else console.log('     (no screen capture in this browser: the watch check is skipped)');

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Lazy chunks and their gates work');
  process.exit(fails ? 1 : 0);
})();
