// Sound effects in a real Chromium: two people (separate browsers) in one room; checks which sounds really play
// (the site fires `swm-sound` for every sound it plays) for room join, reload, voice, microphone, chat, settings
// and an XOX game. The sounds themselves are not judged here, only when they play.
//
//   npm run dev   (other terminal)
//   node scripts/harness/sound/run.mjs [http://localhost:5173]
import { createRequire } from 'node:module';

// Playwright is installed globally in cloud sessions (require works from anywhere, ESM import does not).
const { chromium } = createRequire(import.meta.url)('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
const room = 'snd' + Math.random().toString(36).slice(2, 8);
const browser = await chromium.launch({
  executablePath: process.env.CHROME || undefined,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'],
});

let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
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

async function person(name, avatar) {
  const context = await browser.newContext({ permissions: ['microphone', 'camera'] });
  await context.addInitScript(() => {
    window.__sounds = [];
    addEventListener('swm-sound', (e) => window.__sounds.push(e.detail));
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log(`[${name}] pageerror`, e.message));
  await page.goto(`${SITE}/`);
  await page.evaluate(([n, a]) => {
    localStorage.setItem('name', n);
    localStorage.setItem('avatar', a);
    localStorage.setItem('lang', 'tr');
    localStorage.setItem('opt:ipNotice:voice', '1');
    localStorage.setItem('opt:voiceCheck', 'skip');
  }, [name, avatar]);
  await page.goto(`${SITE}/r/${room}#back`);
  await page.waitForSelector('#people-count');
  // A real click: browsers only allow sound after the person has touched the page.
  await page.mouse.click(5, 300);
  return page;
}
const sounds = (page) => page.evaluate(() => window.__sounds.splice(0));
const count = (list, id) => list.filter((s) => s === id).length;

const alex = await person('Alex', 'wizard');
await sleep(800);
await sounds(alex);
const sam = await person('Sam', 'elf');
await until(async () => (await alex.textContent('#people-count')) === '2');
await sleep(500);
let a = await sounds(alex);
check(count(a, 'roomJoin') === 1, 'Alex hears Sam joining the room', a.join());

// A reload is not a new arrival.
await sam.reload();
await sam.waitForSelector('#people-count');
await sam.mouse.click(5, 300);
await until(async () => (await alex.textContent('#people-count')) === '2');
await sleep(1500);
a = await sounds(alex);
check(count(a, 'roomJoin') === 0, 'a reload plays no join sound', a.join());

// Voice: my own join confirms; others' join only while I'm in voice.
await alex.click('#voice-join');
await until(async () => (await alex.evaluate(() => window.__sounds.includes('meJoin'))));
a = await sounds(alex);
check(count(a, 'meJoin') === 1, 'Alex hears his own voice join', a.join());
await sounds(sam);
await sam.click('#voice-join');
await until(async () => (await alex.evaluate(() => window.__sounds.includes('voiceJoin'))));
a = await sounds(alex);
let b = await sounds(sam);
check(count(a, 'voiceJoin') === 1, 'Alex (in voice) hears Sam joining voice', a.join());
check(count(b, 'meJoin') === 1 && count(b, 'voiceJoin') === 0, 'Sam hears only her own join', b.join());

// Microphone toggles (button and M key).
await sam.click('#voice-mic');
await sam.mouse.click(5, 300);
await sam.keyboard.press('m');
await sleep(300);
b = await sounds(sam);
check(b.join() === 'micOff,micOn', 'mic off / on sounds', b.join());

// Chat: no sound while the chat is on screen, a sound when another tab is open.
await alex.fill('#chat-input', 'merhaba');
await alex.press('#chat-input', 'Enter');
await sleep(800);
b = await sounds(sam);
check(count(b, 'chat') === 0, 'no chat sound while the chat is visible', b.join());
await sam.click('[data-tab="queue"]');
await alex.fill('#chat-input', 'nasılsın');
await alex.press('#chat-input', 'Enter');
await sleep(800);
b = await sounds(sam);
check(count(b, 'chat') === 1, 'chat sound when the chat tab is not open', b.join());
await sam.click('[data-tab="chat"]');
check(count(await sounds(alex), 'chat') === 0, 'my own message plays nothing');

// Voice leave.
await sam.click('#voice-leave');
await sleep(1200);
a = await sounds(alex);
b = await sounds(sam);
check(count(a, 'voiceLeave') === 1, 'Alex hears Sam leaving voice', a.join());
check(count(b, 'meLeave') === 1, 'Sam hears her own leave', b.join());

// Settings: switching sounds off silences everything.
await sam.evaluate(() => localStorage.setItem('opt:sounds', '0'));
await alex.click('[data-tab="queue"]');
await sam.fill('#chat-input', 'sessiz');
await sam.press('#chat-input', 'Enter');
await sleep(800);
check(count(await sounds(alex), 'chat') === 1, 'Alex still hears (his own setting)');
await alex.evaluate(() => localStorage.setItem('opt:sounds', '0'));
await sleep(4200);
await sam.fill('#chat-input', 'yine sessiz');
await sam.press('#chat-input', 'Enter');
await sleep(800);
check((await sounds(alex)).length === 0, 'no sound at all when switched off');
await alex.evaluate(() => localStorage.setItem('opt:sounds', '1'));
await sam.evaluate(() => localStorage.setItem('opt:sounds', '1'));
await alex.click('[data-tab="chat"]');
await alex.click('#voice-leave');
await sleep(300);
await sounds(alex);

// Settings dialog has the switch and the volume slider.
await alex.click('#settings-open');
const ui = await alex.evaluate(() => ({
  on: document.querySelector('#opt-sounds')?.checked,
  vol: document.querySelector('#opt-soundvolume')?.value,
  visible: !!document.querySelector('#opt-soundvolume')?.offsetParent,
}));
check(ui.on === true && ui.vol === '70' && ui.visible, 'Settings → My screen: sounds on, volume 70 %', JSON.stringify(ui));
await alex.keyboard.press('Escape');
await sleep(300);

// XOX: invite, every piece, win / lose.
await sounds(sam);
await alex.click('#dock-game'); // card 2: the rail holds 🎮 on a computer
await alex.click('.hub-game >> nth=0');
await until(async () => (await sam.evaluate(() => window.__sounds.includes('gameInvite'))));
b = await sounds(sam);
check(count(b, 'gameInvite') === 1, 'Sam hears the game invite', b.join());
await sam.click('#game-invite .btn.primary');
const seated = await until(async () => {
  const s = await alex.textContent('#xox-status');
  return s && !s.includes('…') && (await alex.$$('#xox-board .xox-cell')).length === 9 ? s : null;
}, 15000);
check(!!seated, 'both are seated', String(seated));
await sounds(alex);
await sounds(sam);
// Whoever starts plays 0, 1, 2 (top row); the other 3, 4.
const myTurn = (page) => page.evaluate(() => document.querySelector('#xox-board')?.classList.contains('my-turn'));
await until(async () => (await myTurn(alex)) || (await myTurn(sam)));
const first = (await alex.evaluate(() => document.querySelector('#xox-board')?.classList.contains('my-turn'))) ? alex : sam;
const second = first === alex ? sam : alex;
const move = async (page, i) => {
  await until(async () => page.evaluate(() => document.querySelector('#xox-board')?.classList.contains('my-turn')));
  await page.click(`#xox-board .xox-cell >> nth=${i}`);
  await sleep(400);
};
await move(first, 0);
await move(second, 3);
await move(first, 1);
await move(second, 4);
await move(first, 2);
await sleep(800);
const f = await sounds(first);
const s = await sounds(second);
check(count(f, 'place') === 5 && count(s, 'place') === 5, 'every piece plays a place sound for both', `${f.join()} | ${s.join()}`);
check(count(f, 'win') === 1 && count(s, 'lose') === 1, 'winner hears win, loser hears lose', `${f.join()} | ${s.join()}`);

await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : '\nall sound checks passed');
process.exit(failed ? 1 : 0);
