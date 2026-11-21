// Card SH1 (3): the speaking ring in the Shorts view. Alex (computer) and Sam (phone) watch a Short and join voice,
// each with Chromium's fake microphone playing a speech-like tone. Both see the green ring on the speaker's face in the
// Shorts seats (computer bar and the phone's Shorts bar), on their own face too, growing with the level; a muted
// person's ring goes out; under "reduce motion" the ring stays but nothing grows. YouTube's player is the test stand-in (fake-youtube.cjs, card CI4).
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/speak-ring/run.cjs [http://localhost:8787] [out-dir]
const { chromium, devices } = require('playwright');
const { fakeYouTube } = require('../fake-youtube.cjs');
const fs = require('fs');
const os = require('os');
const path = require('path');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || os.tmpdir();
const SHORT = 'https://www.youtube.com/shorts/aqz-KE-bpKQ';
const room = `ring${Math.random().toString(36).slice(2, 8)}`;
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
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

/** A speech-like "voice" (harmonic tone cut into syllables), different per person (see scripts/harness/voice/run.mjs). */
function voiceWav(f0, syllables, seed) {
  const rate = 48000;
  const n = rate * 30;
  const data = Buffer.alloc(44 + n * 2);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + n * 2, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(n * 2, 40);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    phase += (2 * Math.PI * f0 * (1 + 0.15 * Math.sin(2 * Math.PI * 0.7 * t + seed))) / rate;
    const voice = Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.3 * Math.sin(3 * phase) + 0.15 * Math.sin(5 * phase);
    const syl = Math.max(0, Math.sin(Math.PI * syllables * t + seed)) ** 2;
    data.writeInt16LE(Math.round(voice * syl * 0.25 * 32767), 44 + i * 2);
  }
  const file = path.join(os.tmpdir(), `swm-ring-${f0}.wav`);
  fs.writeFileSync(file, data);
  return file;
}
const FAKE = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'];

async function person(name, options, wav) {
  const browser = await chromium.launch({ args: [...FAKE, `--use-file-for-fake-audio-capture=${wav}`] });
  const ctx = await browser.newContext({ ...options, permissions: ['microphone'] });
  await fakeYouTube(ctx);
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', 'en');
      localStorage.setItem('opt:autoInvite', '0');
    } catch {}
  });
  const page = await ctx.newPage();
  await page.goto(`${SITE}/r/${room}?debug=1`);
  await page.fill('#name', name);
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  return { browser, page };
}

/** Join voice by the room's own button; the IP notice and the pre-join check are confirmed. */
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
const lab = async (page) => JSON.parse((await page.evaluate(async () => (await window.__swmLab.run('shorts.state')).text)).replace(/^\S+\s/, ''));
/** The ring on a seat face: is it lit, its glow and its growth. */
const faces = (page, scope) =>
  page.evaluate((scope) => {
    const read = (seat) => {
      const av = seat?.querySelector('.seat-av');
      if (!av) return null;
      const scale = new DOMMatrix(getComputedStyle(av).transform === 'none' ? undefined : getComputedStyle(av).transform).a;
      return { lit: av.dataset.speak !== undefined, scale: +scale.toFixed(3), shadow: av.style.boxShadow };
    };
    const root = document.querySelector(scope);
    return { me: read(root?.querySelector('.seat.me')), other: read(root?.querySelector('.seat:not(.me):not(.more)')) };
  }, scope);

(async () => {
  const alex = await person('Alex', { viewport: { width: 1366, height: 768 } }, voiceWav(190, 4.2, 0));
  const sam = await person('Sam', { ...devices['Pixel 7'] }, voiceWav(120, 3.1, 1.3));
  await alex.page.fill('#media-input', SHORT);
  await alex.page.click('#media-form button[value=load]');
  const shorts = await until(async () => (await alex.page.evaluate(() => document.documentElement.classList.contains('shorts-view'))) && (await sam.page.evaluate(() => document.documentElement.classList.contains('shorts-view'))), 20000);
  check(!!shorts, 'both are in the Shorts view');
  check(!!(await joinVoice(alex.page)) && !!(await joinVoice(sam.page)), 'both joined voice');
  await until(() => alex.page.evaluate(() => document.querySelectorAll('#voice-people .voice-face').length === 2), 15000);
  // Alex may have joined muted by the pre-join check's default: make sure both microphones are on.
  for (const p of [alex.page, sam.page]) {
    await p.evaluate(() => {
      const mic = document.getElementById('voice-mic');
      if (mic && /off|muted/i.test(mic.className + mic.getAttribute('aria-pressed'))) mic.click();
    });
  }

  // 1. Computer: both faces ring (mine too), with a glow and a little growth.
  const computer = await until(async () => {
    const f = await faces(alex.page, '.room');
    return f.me?.lit && f.other?.lit ? f : null;
  }, 20000);
  check(!!computer, 'computer Shorts bar: Sam\'s face and my own face ring while we speak', JSON.stringify(computer ?? (await faces(alex.page, '.room'))));
  let grew = 0;
  for (let i = 0; i < 20; i++) {
    const f = await faces(alex.page, '.room');
    grew = Math.max(grew, f.other?.scale ?? 0, f.me?.scale ?? 0);
    await sleep(100);
  }
  check(grew > 1.005 && grew <= 1.081, 'the face grows a little with the voice (≤ 8 %)', String(grew));
  await alex.page.screenshot({ path: `${OUT}/speak-ring-computer.png` });
  const state = await lab(alex.page);
  check(state.speakers.includes('Sam') && state.speakers.includes('Alex') && state.rings >= 2, 'shorts.state lists the speakers and the rings', JSON.stringify(state));

  // 2. Phone: the faces in the Shorts bar ring.
  const phone = await until(async () => {
    const f = await faces(sam.page, '.ph-faces');
    return f.me?.lit && f.other?.lit ? f : null;
  }, 15000);
  check(!!phone, 'phone Shorts bar: Alex\'s face and my own face ring', JSON.stringify(phone ?? (await faces(sam.page, '.ph-faces'))));
  await until(() => sam.page.evaluate(() => document.querySelector('.ph-toast')?.hidden !== false), 8000);
  await sam.page.screenshot({ path: `${OUT}/speak-ring-phone.png` });
  if (process.env.RING_PEEK) {
    await sam.page.evaluate(() => document.querySelector("#waiting-banner")?.setAttribute("hidden", ""));
    await sam.page.screenshot({ path: `${OUT}/speak-ring-phone-peek.png`, clip: { x: 0, y: 760, width: 412, height: 155 } });
  }

  // 3. Sam mutes: his ring goes out on Alex's screen (Alex's own stays).
  await sam.page.evaluate(() => document.getElementById('voice-mic').click());
  const out = await until(async () => {
    const f = await faces(alex.page, '.room');
    return !f.other?.lit && f.me?.lit ? f : null;
  }, 5000);
  check(!!out, 'a muted person\'s ring goes out; mine stays', JSON.stringify(out ?? (await faces(alex.page, '.room'))));

  // 4. Reduce motion: the ring stays, nothing grows.
  await alex.page.emulateMedia({ reducedMotion: 'reduce' });
  await sleep(600);
  let still = null;
  for (let i = 0; i < 10; i++) {
    const f = await faces(alex.page, '.room');
    if (f.me?.lit) still = !still || f.me.scale !== 1 ? f.me : still;
    await sleep(100);
  }
  check(!!still && still.scale === 1 && /var\(--ok\)/.test(still.shadow) && !/px \d+px var\(--ok\)/.test(still.shadow), 'reduce motion: only the ring (no growth, no glow)', JSON.stringify(still));

  // 5. Leaving voice clears every ring.
  await alex.page.evaluate(() => document.getElementById('voice-leave').click());
  const cleared = await until(() => alex.page.evaluate(() => document.querySelectorAll('.seat-av[data-speak]').length === 0), 3000);
  check(!!cleared, 'leaving voice clears the rings');

  await alex.browser.close();
  await sam.browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ The speaking ring works');
  process.exit(fails ? 1 : 0);
})();
