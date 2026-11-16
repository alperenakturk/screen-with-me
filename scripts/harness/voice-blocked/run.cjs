// Card VC3: a voice link that never connects (a VPN or a strict network) says so. Two Chromes with a fake microphone
// join voice in a room where every ICE candidate is dropped (both sides: the direct path is "blocked"): after ~10 s
// each sees "Your voice isn't reaching the others" and an ⓘ on the other's face (Test Lab `voice.blocked`). With the
// path open again, rejoining connects and the note goes. A good link in a fresh room never shows the note.
//
//   npm run dev, then: NODE_PATH=$(npm root -g) node scripts/harness/voice-blocked/run.cjs [site]
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:5173';
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 10000) => {
  for (let i = 0; i < ms / 250; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await sleep(250);
  }
  return null;
};
const FAKE = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'];

async function person(browser, room, name) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['microphone'] });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', 'en');
      localStorage.setItem('opt:autoInvite', '0');
    } catch {}
    // The "blocked network": while `__dropIce` is on, no candidate from the other side is ever used.
    window.__dropIce = false;
    const add = RTCPeerConnection.prototype.addIceCandidate;
    RTCPeerConnection.prototype.addIceCandidate = function (...args) {
      return window.__dropIce ? Promise.resolve() : add.apply(this, args);
    };
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
const lab = async (page) => JSON.parse((await page.evaluate(async () => (await window.__swmLab.run('voice.blocked')).text)).replace(/^\S+\s/, ''));

(async () => {
  const browser = await chromium.launch({ args: FAKE });
  // 1. Blocked: nobody's candidates get through.
  const room = `vblk${Math.random().toString(36).slice(2, 7)}`;
  const alex = await person(browser, room, 'Alex');
  const sam = await person(browser, room, 'Sam');
  for (const p of [alex.page, sam.page]) await p.evaluate(() => (window.__dropIce = true));
  check(!!(await joinVoice(alex.page)) && !!(await joinVoice(sam.page)), 'both joined voice on a blocked network');
  await sleep(5000);
  check((await alex.page.isHidden('#voice-unreachable')), 'no note in the first seconds (a link takes a moment)');
  const shown = await until(async () => (await lab(alex.page)).note, 12000);
  const a = await lab(alex.page);
  check(!!shown && a.unreachable.includes('Sam'), 'Alex: "Your voice isn\'t reaching the others" after ~10 s, Sam listed', a);
  const text = await alex.page.textContent('#voice-unreachable');
  check(/VPN/.test(text) && !/\bICE\b|WebRTC|peer-to-peer/.test(text), 'the note speaks plainly (VPN, no technical words)', text);
  check(await alex.page.isVisible('#voice-people .voice-link-bad'), "an ⓘ on Sam's face");
  check((await until(async () => (await lab(sam.page)).note, 4000)) !== null, 'Sam sees the note too');
  // 2. The path opens again: Sam rejoins, the links connect and the note goes by itself.
  for (const p of [alex.page, sam.page]) await p.evaluate(() => (window.__dropIce = false));
  await sam.page.click('#voice-leave');
  await sleep(1000);
  await joinVoice(sam.page);
  const cleared = await until(async () => !(await lab(alex.page)).note && !(await lab(sam.page)).note, 20000);
  check(!!cleared, 'once the link connects the note and the ⓘ go away', await lab(alex.page));
  check(await alex.page.isHidden('#voice-people .voice-link-bad'), 'no ⓘ left');
  // 3. A good network from the start: never a note.
  const room2 = `vok${Math.random().toString(36).slice(2, 7)}`;
  const max = await person(browser, room2, 'Max');
  const kim = await person(browser, room2, 'Kim');
  await joinVoice(max.page);
  await joinVoice(kim.page);
  await sleep(13000);
  const good = await lab(max.page);
  check(!good.note && good.unreachable.length === 0 && good.links.some((l) => l.state === 'connected'), 'a good link never shows the note', good);
  const errors = [...alex.errors, ...sam.errors, ...max.errors, ...kim.errors];
  check(errors.length === 0, 'no page errors', errors);
  await browser.close();
  console.log(failed ? `\n${failed} FAILED` : '\nall ok');
  process.exit(failed ? 1 : 0);
})();
