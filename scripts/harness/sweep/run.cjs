// Design sweep (card 16): screenshots of every main screen at the five sizes, in English + Gece and Turkish + a scene
// theme (phones offer plain themes only: Okyanus there), plus scripted checks on each: no sideways page scroll, nothing
// of ours past the right edge, no console errors, and pages that should fit the window (the room, the join card) don't
// scroll. Kept for later sweeps: run it, then look through the screenshots.
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   (cd <folder with video.webm> && python3 -m http.server 5300)
//   NODE_PATH=$(npm root -g) node scripts/harness/sweep/run.cjs [site] [video] [out folder]
const { chromium, devices } = require('playwright');
const fs = require('fs');
const SITE = process.argv[2] || 'http://localhost:8787';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
const OUT = process.argv[4] || '/tmp/sweep';
fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
let shots = 0;
const check = (ok, label, extra = '') => {
  if (!ok) {
    console.log(`FAIL ${label}${extra ? ' → ' + extra : ''}`);
    fails++;
  }
};

const SIZES = [
  ['1920x1080', { viewport: { width: 1920, height: 1080 } }],
  ['1366x768', { viewport: { width: 1366, height: 768 } }],
  ['1024x640', { viewport: { width: 1024, height: 640 } }],
  ['390x844', { ...devices['iPhone 13'] }],
  ['844x390', { ...devices['iPhone 13 landscape'] }],
];
const LOOKS = [
  ['en', 'gece'],
  ['tr', 'sinema'],
];

/** Screens: [name, path, prepare(page), must the page fit the window?] */
const room = () => `sweep${Math.random().toString(36).slice(2, 7)}`;
async function join(page) {
  await page.waitForSelector('#name');
  await page.fill('#name', 'Alex');
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await page.waitForTimeout(1200);
}
const SCREENS = [
  ['home', () => '/', null, false],
  ['join', () => `/r/${room()}`, (p) => p.waitForSelector('#name'), true],
  ['room-empty', () => `/r/${room()}`, join, true],
  [
    'room-video',
    () => `/r/${room()}`,
    async (p) => {
      await join(p);
      // On a phone the link box sits behind ＋: fill it directly.
      await p.evaluate((v) => {
        const i = document.querySelector('#media-input');
        i.value = v;
        i.form.requestSubmit();
      }, VIDEO);
      await p.waitForTimeout(2500);
    },
    true,
  ],
  [
    // A link that can't be played: its note must not make the room scroll (card A11y / sweep, 0.9.96.13).
    'room-error',
    () => `/r/${room()}`,
    async (p) => {
      await join(p);
      await p.evaluate((v) => {
        const i = document.querySelector('#media-input');
        i.value = v.replace(/[^/]+$/, 'missing-video.webm');
        i.form.requestSubmit();
      }, VIDEO);
      await p.waitForTimeout(3000);
    },
    true,
  ],
  [
    'settings',
    () => `/r/${room()}`,
    async (p) => {
      await join(p);
      await p.evaluate(() => document.querySelector('#settings-open')?.click() ?? document.querySelector('#strip-more')?.click());
      await p.waitForTimeout(600);
    },
    false,
  ],
  [
    'invite',
    () => `/r/${room()}`,
    async (p) => {
      await join(p);
      await p.evaluate(() => document.querySelector('#invite-btn')?.click());
      await p.waitForTimeout(800);
    },
    false,
  ],
  ['connection', () => '/connection', (p) => p.waitForTimeout(5000), false],
  ['help', () => '/help.html', null, false],
  ['privacy', () => '/privacy.html', null, false],
  ['thanks', () => '/thanks.html', null, true],
];

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  for (const [size, opts] of SIZES) {
    const phone = size.startsWith('390') || size.startsWith('844');
    for (const [lang, sceneTheme] of LOOKS) {
      const theme = phone && sceneTheme !== 'gece' ? 'okyanus' : sceneTheme;
      for (const [name, path, prepare, fits] of SCREENS) {
        const ctx = await browser.newContext(opts);
        await ctx.addInitScript(
          ([l, th]) => {
            localStorage.setItem('lang', l);
            localStorage.setItem('theme', th);
            localStorage.setItem('tipsSeen', '1');
            localStorage.setItem('opt:autoInvite', '0');
          },
          [lang, theme],
        );
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));
        const where = `${name} · ${size} · ${lang}+${theme}`;
        try {
          await page.goto(SITE + path());
          await page.waitForTimeout(800);
          if (prepare) await prepare(page);
          const m = await page.evaluate(() => {
            const vw = document.documentElement.clientWidth;
            const off = [];
            for (const e of document.querySelectorAll('button, a, input, label, h1, h2, h3, p, .card')) {
              const r = e.getBoundingClientRect();
              const st = getComputedStyle(e);
              if (r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && r.right > vw + 1 && !e.closest('[hidden], .dock-pop, .hint-bubble')) off.push(`${e.tagName}.${String(e.className).slice(0, 30)}`);
            }
            return { sw: document.documentElement.scrollWidth, vw, sh: document.documentElement.scrollHeight, vh: innerHeight, off: off.slice(0, 5) };
          });
          check(m.sw <= m.vw, `${where}: no sideways page scroll`, `${m.sw} > ${m.vw}`);
          check(m.off.length === 0, `${where}: nothing past the right edge`, m.off.join(' '));
          if (fits) check(m.sh <= m.vh + 1, `${where}: fits the window (no page scroll)`, `${m.sh} > ${m.vh}`);
          check(errors.length === 0, `${where}: no console errors`, errors.slice(0, 2).join(' | '));
          await page.screenshot({ path: `${OUT}/${lang}-${theme}-${size}-${name}.png` });
          shots++;
        } catch (e) {
          check(false, `${where}: opened`, e.message.split('\n')[0]);
        }
        await ctx.close();
      }
    }
  }
  await browser.close();
  console.log(`${shots} screenshots in ${OUT}`);
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Design sweep: every screen passed its checks');
  process.exit(fails ? 1 : 0);
})();
