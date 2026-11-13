// PWA1 (owner, 13 Nov 2026): the home-screen app. In real browsers:
// - a link shared to Sidelit (the manifest's share target: `/?share_url=…&share_text=…`) opens a new room, and once I'm
//   in it starts there; a share without a link stays on the home page with a clean address;
// - the "Create room" shortcut (`/?new=1`) opens a new room;
// - the screen wake lock is asked for while the room's video plays and let go on pause (the API is stubbed: headless
//   Chromium has no screen to keep on);
// - the "Add to Home Screen" hint shows once on iOS Safari (iPhone), never on Android or a computer.
// Needs the built site on wrangler dev and a video file (CI: scripts/ci-test-video.sh serves one on :5300):
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/pwa/run.cjs [http://localhost:8787] [http://localhost:5300/video.webm]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};

(async () => {
  const browser = await chromium.launch();
  const context = async (opts = { viewport: { width: 1280, height: 800 } }) => {
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript(() => {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', 'en');
      localStorage.setItem('opt:autoInvite', '0');
      // A stand-in Screen Wake Lock API that records what the page asks for.
      const log = [];
      window.__wake = log;
      Object.defineProperty(navigator, 'wakeLock', {
        configurable: true,
        value: {
          request: async (type) => {
            log.push(`request:${type}`);
            const listeners = [];
            const lock = {
              released: false,
              release: async () => {
                if (lock.released) return;
                lock.released = true;
                log.push('release');
                for (const fn of listeners) fn();
              },
              addEventListener: (_t, fn) => listeners.push(fn),
            };
            return lock;
          },
        },
      });
    });
    return ctx;
  };
  const join = async (page, name) => {
    await page.waitForSelector('#name', { timeout: 10000 });
    await page.fill('#name', name);
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
  };

  // 1. A shared YouTube-style text with the link inside it: a new room, the video starts there.
  {
    const ctx = await context();
    const page = await ctx.newPage();
    const text = `Look at this ${VIDEO} !`;
    await page.goto(`${SITE}/?share_title=${encodeURIComponent('A clip')}&share_text=${encodeURIComponent(text)}`);
    await page.waitForURL(/\/r\/[A-Za-z0-9_-]+$/, { timeout: 10000 }).catch(() => {});
    check(/\/r\/[A-Za-z0-9_-]+$/.test(new URL(page.url()).pathname), 'a share opens a new room', page.url());
    await join(page, 'Alex');
    const started = await page
      .waitForFunction((v) => document.querySelector('video')?.currentSrc === v || document.querySelector(`video[src="${v}"]`) !== null, VIDEO, { timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    check(started, 'the shared link starts in the room once I am in');
    // Wake lock: asked for while it plays, let go on pause.
    const asked = await page.waitForFunction(() => window.__wake.includes('request:screen'), null, { timeout: 10000 }).then(() => true).catch(() => false);
    check(asked, 'the screen wake lock is asked for while the video plays', JSON.stringify(await page.evaluate(() => window.__wake)));
    // A pause from the player itself goes to everyone (the room's paused state), like a press on its own control.
    await page.evaluate(() => document.querySelector('video')?.pause());
    const released = await page.waitForFunction(() => window.__wake.at(-1) === 'release', null, { timeout: 8000 }).then(() => true).catch(() => false);
    check(released, 'pausing lets the screen sleep again', JSON.stringify(await page.evaluate(() => window.__wake)));
    await ctx.close();
  }

  // 2. A share with no link: the home page, the share fields gone from the address.
  {
    const ctx = await context();
    const page = await ctx.newPage();
    await page.goto(`${SITE}/?share_title=Hello&share_text=${encodeURIComponent('just some words')}`);
    await page.waitForSelector('.hm-first');
    const url = new URL(page.url());
    check(url.pathname === '/' && !url.search.includes('share_'), 'a share without a link stays on the home page, address cleaned', page.url());
    await ctx.close();
  }

  // 3. The "Create room" shortcut.
  {
    const ctx = await context();
    const page = await ctx.newPage();
    await page.goto(`${SITE}/?new=1&source=shortcut`);
    await page.waitForURL(/\/r\/[A-Za-z0-9_-]+$/, { timeout: 10000 }).catch(() => {});
    check(/\/r\/[A-Za-z0-9_-]+$/.test(new URL(page.url()).pathname), 'the "Create room" shortcut opens a new room', page.url());
    await ctx.close();
  }

  // 4. The iOS "Add to Home Screen" hint: once on iPhone Safari, never on Android or a computer.
  {
    const ctx = await context({ ...devices['iPhone 13'] });
    const page = await ctx.newPage();
    await page.goto(`${SITE}/`);
    await page.waitForSelector('.hm-first');
    const hint = await page.evaluate(() => {
      const bar = document.querySelector('.hm-ios-hint');
      const r = bar?.getBoundingClientRect();
      const close = bar?.querySelector('[data-ios-close]')?.getBoundingClientRect();
      // In the page's flow under the start buttons, never over one (first look: a fixed bar covered Join on an SE).
      const join = document.getElementById('join-toggle')?.getBoundingClientRect();
      return bar
        ? { text: bar.textContent, below: !!join && r.top >= join.bottom, fits: r.left >= 0 && r.right <= innerWidth, share: !!bar.querySelector('.hm-ios-share svg'), close: close ? Math.min(close.width, close.height) : 0 }
        : null;
    });
    check(!!hint && /Add to Home Screen/.test(hint.text) && hint.below && hint.fits && hint.share && hint.close >= 40, 'iPhone Safari: the hint shows under the start buttons with the Share glyph, ✕ at least 40 px', JSON.stringify(hint));
    const noteShown = () => page.evaluate(() => getComputedStyle(document.querySelector('.hm-first .touch-note')).display !== 'none');
    check(!(await noteShown()), 'while the hint shows, the "made for computers" note is hidden (one of the two)');
    await page.click('.hm-ios-hint [data-ios-close]');
    check(await noteShown(), 'after ✕ the note comes back');
    await page.reload();
    await page.waitForSelector('.hm-first');
    check(!(await page.$('.hm-ios-hint')), 'after ✕ it never shows again');
    await ctx.close();
    // Inside the installed app (iOS reports navigator.standalone): no hint and no note.
    {
      const c = await context({ ...devices['iPhone 13'] });
      await c.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
      const p = await c.newPage();
      await p.goto(`${SITE}/`);
      await p.waitForSelector('.hm-first');
      const app = await p.evaluate(() => ({ hint: !!document.querySelector('.hm-ios-hint'), note: getComputedStyle(document.querySelector('.hm-first .touch-note')).display }));
      check(!app.hint && app.note === 'none', 'in the installed app: no install hint and no "made for computers" note', JSON.stringify(app));
      await c.close();
    }
    for (const [name, opts] of [['Android (Pixel 7)', devices['Pixel 7']], ['a computer', { viewport: { width: 1366, height: 768 } }]]) {
      const c = await context(opts);
      const p = await c.newPage();
      await p.goto(`${SITE}/`);
      await p.waitForSelector('.hm-first');
      await p.waitForTimeout(300);
      check(!(await p.$('.hm-ios-hint')), `${name}: no iOS hint`);
      await c.close();
    }
  }

  // 5. The manifest the browser reads: English, the share target and the shortcut.
  {
    const ctx = await context();
    const page = await ctx.newPage();
    const res = await page.goto(`${SITE}/manifest.webmanifest`);
    const m = await res.json().catch(() => null);
    check(m?.lang === 'en' && m.share_target?.action === '/' && m.shortcuts?.[0]?.url?.startsWith('/?new=1'), 'the served manifest has lang en, the share target and the shortcut');
    for (const shot of m?.screenshots ?? []) {
      const r = await page.goto(`${SITE}${shot.src}`);
      check(r?.status() === 200, `screenshot ${shot.src} is served`);
    }
    await ctx.close();
  }

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ The home-screen app works');
  process.exit(fails ? 1 : 0);
})();
