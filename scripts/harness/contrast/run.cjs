// Card THEME1: every theme's text must be readable (WCAG 2.1 AA): body text 4.5:1, large text (24 px, or 18.66 px bold)
// 3:1, measured against what is really behind each line, scene pictures and see-through cards included. For each theme
// and page it lists the visible text, takes a screenshot with all text made transparent (so only the background is left),
// and compares each line's colour with the background pixels under it. A line fails when the worst 15 % of its
// background pixels give less than the needed ratio (so one bright star does not fail a line, a bright band does). Text
// of disabled controls is skipped (WCAG exempts it), so is text inside the video. Screenshots of failing pages go to OUT.
//
//   npm run build && (cd apps/server && npx wrangler dev --port 8787 --var SWM_LAB_SERVER:1)
//   NODE_PATH=$(npm root -g) node scripts/harness/contrast/run.cjs [site] [out]
//   THEMES=gece,sinema · PAGES=home,room · DEVICES=laptop narrow the run; REPORT_ONLY=1 never fails (for audits).
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || '/tmp/contrast';
fs.mkdirSync(OUT, { recursive: true });
const pick = (env, all) => (process.env[env] ? process.env[env].split(',') : all);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const ALL_THEMES = ['gece', 'okyanus', 'gunbatimi', 'neon', 'lokum', 'binbirgece', 'sinema', 'acikhava', 'gemi', 'tren'];
const PLAIN = ['gece', 'okyanus', 'gunbatimi', 'neon'];
const THEMES = pick('THEMES', ALL_THEMES);
const PAGES = pick('PAGES', ['home', 'help', 'join', 'room', 'settings', 'games']);
const DEVICES = {
  laptop: { viewport: { width: 1366, height: 768 } },
  phone: devices['Pixel 7'],
};

/** Visible text runs in the viewport: one entry per element with its own text. */
function collect() {
  const out = [];
  const vw = innerWidth;
  const vh = innerHeight;
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  };
  const label = (el) => {
    const parts = [];
    for (let e = el; e && e !== document.body && parts.length < 3; e = e.parentElement) {
      parts.unshift(e.id ? `#${e.id}` : e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/)[0] : ''));
      if (e.id) break;
    }
    return parts.join(' > ');
  };
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent.replace(/\s+/g, ' ').trim();
    // Letters or digits only: a lone emoji or symbol is a picture, not text.
    if (!/[\p{L}\p{N}]/u.test(text)) continue;
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    if (el.closest('svg, .player-wrap video, iframe, .player, [aria-disabled="true"], :disabled, option, script, style, noscript, .skip-link, #skip-link')) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none') continue;
    let opacity = 1;
    let hidden = false;
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      opacity *= Number(cs.opacity);
      if (cs.display === 'none' || cs.visibility === 'hidden') hidden = true;
      // Dimmed on purpose = disabled look (WCAG: inactive controls are exempt).
      if (e.matches?.('.is-disabled, .dimmed, [data-disabled]')) hidden = true;
    }
    if (hidden || opacity < 0.05) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width < 4 || r.height < 6) continue;
    if (r.right < 0 || r.bottom < 0 || r.left > vw || r.top > vh) continue;
    // Clipped away by an overflow ancestor?
    let clipped = false;
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (/(hidden|auto|scroll|clip)/.test(cs.overflow + cs.overflowX + cs.overflowY)) {
        const b = e.getBoundingClientRect();
        if (r.bottom <= b.top + 1 || r.top >= b.bottom - 1 || r.right <= b.left + 1 || r.left >= b.right - 1) clipped = true;
      }
    }
    if (clipped) continue;
    // Covered by something on top (a dialog's backdrop, a window): not what the person reads now.
    const hit = document.elementFromPoint(Math.min(vw - 1, (r.left + r.right) / 2), Math.min(vh - 1, (r.top + r.bottom) / 2));
    if (hit && hit !== el && !el.contains(hit) && !hit.contains(el)) continue;
    const color = parse(s.webkitTextFillColor && s.webkitTextFillColor !== s.color && !/rgba\(0, 0, 0, 0\)/.test(s.webkitTextFillColor) ? s.webkitTextFillColor : s.color);
    if (!color) continue;
    seen.add(el);
    const size = parseFloat(s.fontSize);
    const bold = Number(s.fontWeight) >= 700;
    out.push({
      label: label(el),
      text: text.slice(0, 40),
      color,
      opacity,
      size,
      large: size >= 24 || (size >= 18.66 && bold),
      box: { x: Math.max(0, Math.floor(r.left)), y: Math.max(0, Math.floor(r.top)), w: Math.ceil(Math.min(r.right, vw) - Math.max(0, r.left)), h: Math.ceil(Math.min(r.bottom, vh) - Math.max(0, r.top)) },
    });
  }
  return out;
}

/** Reads the background screenshot in the page and rates each run. */
async function rate(dataUrl, runs) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const scale = img.width / innerWidth;
  const lin = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const lum = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
  return runs.map((run) => {
    const { x, y, w, h } = run.box;
    const d = g.getImageData(Math.round(x * scale), Math.round(y * scale), Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))).data;
    const a = run.color[3] * run.opacity;
    const ratios = [];
    const step = Math.max(1, Math.floor(d.length / 4 / 600));
    for (let i = 0; i < d.length; i += 4 * step) {
      const br = d[i];
      const bg = d[i + 1];
      const bb = d[i + 2];
      const fr = run.color[0] * a + br * (1 - a);
      const fg = run.color[1] * a + bg * (1 - a);
      const fb = run.color[2] * a + bb * (1 - a);
      const l1 = lum(fr, fg, fb);
      const l2 = lum(br, bg, bb);
      ratios.push((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
    }
    ratios.sort((p, q) => p - q);
    const worst = ratios[Math.floor(ratios.length * 0.15)] ?? 21;
    const median = ratios[Math.floor(ratios.length / 2)] ?? 21;
    return { ...run, ratio: Math.round(worst * 100) / 100, median: Math.round(median * 100) / 100, need: run.large ? 3 : 4.5 };
  });
}

const HIDE_TEXT = `*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important;
  text-shadow: none !important; caret-color: transparent !important; text-decoration-color: transparent !important; }
  input::placeholder, textarea::placeholder { color: transparent !important; }`;
const STILL = `*, *::before, *::after { animation-play-state: paused !important; animation-delay: -1s !important; transition: none !important; }`;

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const results = [];
  let fails = 0;
  for (const device of pick('DEVICES', Object.keys(DEVICES))) {
    for (const theme of THEMES) {
      if (device === 'phone' && !PLAIN.includes(theme)) continue; // a phone shows only the plain themes
      const ctx = await browser.newContext({ ...DEVICES[device] });
      await ctx.addInitScript((th) => {
        for (const [k, v] of Object.entries({
          lang: 'en', theme: th, name: 'Robin', avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', introSeen: '1',
          'snackBar:howSeen': '1', 'windowGarden:howSeen': '1', 'fiveFrames:howSeen': '1',
        })) localStorage.setItem(k, v);
      }, theme);
      const page = await ctx.newPage();
      const audit = async (name) => {
        await page.addStyleTag({ content: STILL }).catch(() => {});
        await wait(400);
        const shown = await page.evaluate(() => document.documentElement.dataset.theme || 'gece');
        const runs = await page.evaluate(collect);
        const tag = await page.addStyleTag({ content: HIDE_TEXT });
        await wait(150);
        const buf = await page.screenshot();
        await tag.evaluate((n) => n.remove());
        const rated = await page.evaluate(([u, r]) => window.__rate(u, r), ['data:image/png;base64,' + buf.toString('base64'), runs]).catch(async () => {
          await page.evaluate(`window.__rate = ${rate.toString()}`);
          return page.evaluate(([u, r]) => window.__rate(u, r), ['data:image/png;base64,' + buf.toString('base64'), runs]);
        });
        const bad = rated.filter((r) => r.ratio < r.need);
        const key = `${device} · ${theme}${shown !== theme ? ` (shows ${shown})` : ''} · ${name}`;
        results.push({ device, theme, page: name, checked: rated.length, bad });
        if (bad.length) {
          fails += bad.length;
          await page.screenshot({ path: path.join(OUT, `${device}-${theme}-${name}.png`) });
          console.log(`FAIL ${key}: ${bad.length} of ${rated.length} text runs under AA`);
          for (const b of bad.slice(0, 12)) console.log(`       ${b.ratio.toFixed(2)} < ${b.need} (median ${b.median}) ${b.size}px "${b.text}" · ${b.label}`);
          if (bad.length > 12) console.log(`       … ${bad.length - 12} more in report.json`);
        } else console.log(`ok   ${key}: ${rated.length} text runs`);
      };
      const room = 'ct' + Math.random().toString(36).slice(2, 7);
      for (const name of PAGES) {
        try {
          if (name === 'home') {
            await page.goto(`${SITE}/`);
            await page.waitForSelector('.hm-first, #start-form', { timeout: 15000 });
            await wait(800);
            await audit('home');
            const tall = await page.evaluate(() => document.scrollingElement.scrollHeight > innerHeight + 50);
            if (tall) {
              await page.evaluate(() => document.querySelector('#how')?.scrollIntoView());
              await wait(400);
              await audit('home-how');
            }
          } else if (name === 'help') {
            await page.goto(`${SITE}/help.html`);
            await wait(800);
            await audit('help');
          } else if (name === 'join') {
            await page.goto(`${SITE}/r/${room}`);
            await page.waitForSelector('#name-form', { timeout: 15000 });
            await wait(600);
            await audit('join');
          } else if (name === 'room') {
            if (!page.url().includes(`/r/${room}`)) await page.goto(`${SITE}/r/${room}`);
            await page.waitForSelector('#name-form', { timeout: 15000 });
            await page.fill('#name', 'Robin');
            await page.click('#name-form button.primary');
            await page.waitForSelector('.room', { timeout: 15000 });
            await wait(3200); // past the intro
            await page.evaluate(() => {
              const input = document.querySelector('#chat-input, #chat-form input, #chat-form textarea');
              if (input) {
                input.value = 'Hello from Robin';
                document.querySelector('#chat-form')?.requestSubmit();
              }
            });
            await wait(800);
            await audit('room');
          } else if (name === 'settings') {
            if (!(await page.$('.room'))) continue;
            await page.evaluate(() => document.querySelector('#settings-open')?.click());
            await wait(700);
            await audit('settings');
            await page.keyboard.press('Escape');
            await wait(300);
          } else if (name === 'games') {
            if (!(await page.$('.room'))) continue;
            // On a computer the rail comes out when the mouse reaches the video's right edge.
            const edge = await page.evaluate(() => {
              const r = document.querySelector('.player-wrap')?.getBoundingClientRect();
              return r ? { x: r.right - 8, y: r.top + r.height / 2 } : null;
            });
            if (edge) await page.mouse.move(edge.x, edge.y, { steps: 4 });
            await wait(600);
            const dock = await page.$('#dock-game');
            if (dock && (await dock.isVisible())) await dock.click();
            else await page.evaluate(() => document.querySelector('#game-btn')?.click());
            await page.waitForSelector('#game-menu:not([hidden])', { timeout: 5000 }).catch(() => {});
            await wait(1200);
            await audit('games');
            await page.keyboard.press('Escape');
          }
        } catch (e) {
          console.log(`FAIL ${device} · ${theme} · ${name}: ${e.message.split('\n')[0]}`);
          fails++;
        }
      }
      await ctx.close();
    }
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 1));
  await browser.close();
  console.log(`\nReport: ${path.join(OUT, 'report.json')}`);
  if (fails && !process.env.REPORT_ONLY) {
    console.log(`✗ ${fails} text runs under WCAG AA`);
    process.exit(1);
  }
  console.log(fails ? `(report only) ${fails} text runs under WCAG AA` : '✓ every text run passes WCAG AA');
})();
