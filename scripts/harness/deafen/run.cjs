// Card VC1: 🎧 deafen in voice. Two Chromes with a fake microphone join voice; Alex deafens: every voice he plays goes
// silent, his mic goes off, Sam sees a crossed 🎧 on his face (Test Lab `voice.deafen`), 🎙 while deafened undeafens
// (the mic comes back), and a reload keeps him deafened with the mic off.
//
//   npm run dev, then: NODE_PATH=$(npm root -g) node scripts/harness/deafen/run.cjs [site]
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:5173';
const room = `deaf${Math.random().toString(36).slice(2, 7)}`;
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 10000) => {
  for (let i = 0; i < ms / 200; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await sleep(200);
  }
  return null;
};
const FAKE = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'];

async function person(browser, name) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['microphone'] });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', 'en');
      localStorage.setItem('opt:autoInvite', '0');
    } catch {}
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${SITE}/r/${room}?debug=1`);
  await page.fill('#name', name);
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  return { page, errors };
}
/** Join voice by the room's own button; the pre-join check is confirmed. */
async function joinVoice(page) {
  await page.evaluate(async () => {
    document.getElementById('voice-join').click();
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 150));
      const d = document.querySelector('.confirm-dialog');
      if (!d) {
        if (i > 10) break;
        continue;
      }
      d.querySelector('.btn.primary').click();
    }
  });
  return until(() => page.evaluate(() => !document.getElementById('voice-on').hidden), 15000);
}
const lab = async (page, arg) => JSON.parse((await page.evaluate(async (arg) => (await window.__swmLab.run('voice.deafen', arg)).text, arg)).replace(/^\S+\s/, ''));
const micOn = (page) => page.evaluate(() => !document.getElementById('voice-mic').classList.contains('muted-mic'));

(async () => {
  const browser = await chromium.launch({ args: FAKE });
  const alex = await person(browser, 'Alex');
  const sam = await person(browser, 'Sam');
  check(!!(await joinVoice(alex.page)) && !!(await joinVoice(sam.page)), 'both joined voice');
  if (!(await micOn(alex.page))) await alex.page.click('#voice-mic');
  const heard = await until(() => alex.page.evaluate(() => [...document.querySelectorAll('body > audio')].some((a) => a.srcObject && !a.muted)), 15000);
  check(!!heard, "Alex plays Sam's voice");
  check(await alex.page.isVisible('#voice-deaf'), '🎧 sits beside 🎙');

  await alex.page.click('#voice-deaf');
  await sleep(500);
  let state = await lab(alex.page);
  check(state.deaf && state.inVoice && !state.mic && state.voicesMuted, 'deafened: every voice silent, the mic off', state);
  check((await alex.page.getAttribute('#voice-deaf', 'aria-pressed')) === 'true', '🎧 shows pressed');
  const seen = await until(async () => (await lab(sam.page)).deafened.includes('Alex'), 8000);
  check(!!seen, 'Sam sees Alex deafened');
  const badge = await until(() => sam.page.evaluate(() => !!document.querySelector('#voice-people .voice-muted .ico-headphones-off')), 8000);
  check(!!badge, "a crossed 🎧 on Alex's face for Sam");
  // A new voice coming in while deafened stays silent too.
  await sam.page.click('#voice-leave');
  await sleep(800);
  await joinVoice(sam.page);
  await sleep(2500);
  state = await lab(alex.page);
  check(state.voicesMuted, 'a voice that comes back while deafened is silent', state);

  // 🎙 while deafened undeafens and turns the mic on (Discord-like).
  await alex.page.click('#voice-mic');
  await sleep(500);
  state = await lab(alex.page);
  check(!state.deaf && state.mic && !state.voicesMuted, '🎙 while deafened: undeafened, mic on, voices back', state);
  const cleared = await until(async () => !(await lab(sam.page)).deafened.includes('Alex'), 8000);
  check(!!cleared, 'Sam sees the 🎧 mark go');

  // Kept over a reload: back in voice, still deafened, mic off.
  await lab(alex.page, 'on');
  await alex.page.reload();
  await alex.page.waitForSelector('.room');
  const back = await until(() => alex.page.evaluate(() => !document.getElementById('voice-on').hidden), 15000);
  await sleep(2000);
  state = await lab(alex.page);
  check(!!back && state.deaf && !state.mic && state.voicesMuted, 'a reload keeps me deafened with the mic off', state);
  const seenAgain = await until(async () => (await lab(sam.page)).deafened.includes('Alex'), 8000);
  check(!!seenAgain, 'Sam still sees Alex deafened after his reload');
  state = await lab(alex.page, 'off');
  check(!state.deaf && !state.voicesMuted, 'Test Lab "off" undeafens', state);
  check(alex.errors.length === 0 && sam.errors.length === 0, 'no page errors', [...alex.errors, ...sam.errors]);
  await browser.close();
  console.log(failed ? `\n${failed} FAILED` : '\nall ok');
  process.exit(failed ? 1 : 0);
})();
