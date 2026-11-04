// A browser that forbids direct connections (Chromium's WebRTC policy "Disable non-proxied UDP": a Brave / Vivaldi
// setting, uBlock Origin's WebRTC option, Opera's VPN) gathers no network address, so voice can never connect. Since
// 0.9.91.17 the room says why and how to fix it (`packages/shared/src/ice-watch.ts`). Two Chromes with that policy
// join voice; the hint must appear for both.
//
// Uses Playwright's Chromium: the full Chrome binary ignores `--force-webrtc-ip-handling-policy` (it reads the
// profile setting instead), the headless shell applies it.
//
//   node scripts/harness/voice/blocked.mjs http://localhost:5173
//   POLICY=default node scripts/harness/voice/blocked.mjs   (control: no hint, voice connects)
import { createRequire } from 'node:module';

const { chromium } = createRequire(import.meta.url)('playwright');
const SITE = process.argv[2] ?? 'http://localhost:5173';
const room = 'blk' + Math.random().toString(36).slice(2, 8);
const FAKE = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'];
/** `POLICY=default`: the control run, the hint must NOT appear and voice connects. */
const blocked = process.env.POLICY !== 'default';
const ARGS = blocked ? [...FAKE, '--force-webrtc-ip-handling-policy=disable_non_proxied_udp'] : FAKE;

let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
};
const until = async (fn, ms = 10000) => {
  for (let i = 0; i < ms / 250; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
};

async function person(name, avatar) {
  const browser = await chromium.launch({ args: ARGS });
  const page = await browser.newPage();
  const b = {
    navigate: (url) => page.goto(url),
    evaluate: (code) => page.evaluate(code),
    close: () => browser.close(),
  };
  await b.navigate(`${SITE}/`);
  await page.waitForTimeout(1500);
  // Skip the pre-join check (`opt:voiceCheck` = skip) and the IP notice so "Sese katıl" joins at once.
  await b.evaluate(
    `localStorage.setItem('name', ${JSON.stringify(name)}); localStorage.setItem('avatar', ${JSON.stringify(avatar)}); localStorage.setItem('lang','tr'); localStorage.setItem('opt:voiceCheck','skip'); localStorage.setItem('opt:ipNotice:voice','0'); 1`,
  );
  await b.navigate(`${SITE}/r/${room}#back`);
  return b;
}

const JOIN = `(async () => { document.getElementById('voice-join').click(); for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 150)); const d = document.querySelector('.confirm-dialog'); if (d) d.querySelector('.btn.primary').click(); } return 1; })()`;
const HINT = `[...document.querySelectorAll('.hint, .flash-hint, [role=status], [role=tooltip]')].map((e) => e.textContent).join(' | ')`;

const alex = await person('Alex', 'wizard');
const sam = await person('Sam', 'elf');
const ready = (b) => b.evaluate(`!document.getElementById('voice-card').hidden && document.getElementById('people-count')?.textContent === '2'`);
check(!!(await until(async () => (await ready(alex)) && (await ready(sam)), 20000)), 'both in the room, voice card shown');
await alex.evaluate(JOIN);
await sam.evaluate(JOIN);
check(!!(await until(async () => (await alex.evaluate(`document.querySelectorAll('#voice-people .voice-face').length`)) === 2, 15000)), 'both in voice');
for (const [name, b] of [['Alex', alex], ['Sam', sam]]) {
  const shown = () => b.evaluate(`document.body.innerText.includes('doğrudan bağlantıları engelliyor')`);
  if (blocked) {
    check(!!(await until(shown, 15000)), `${name} sees "your browser blocks direct connections"`, await b.evaluate(HINT).catch(() => ''));
  } else {
    const heard = await until(() => b.evaluate(`document.querySelectorAll('audio').length >= 1`), 15000);
    check(!!heard && !(await shown()), `${name}: voice connects and no "blocked" hint`);
  }
}
await alex.close();
await sam.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
