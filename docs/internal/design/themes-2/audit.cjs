// THEME2 audit (Design session): for every theme, at 1366 × 768, English, screenshots of home, the room, the room-rules
// dialog, the games hall and a game window (Classics), and the contrast of every visible text against the real pixels behind it (scene
// pictures included). Text is hidden for a second screenshot; each text box's background pixels are sampled and the
// text colour is checked against them (the 10th-percentile pixel = the worst common spot behind the text).
//   npm run dev   (site on :5173, server on :8787)
//   [SIZE=1920x1080] [ONLY=home] [THEMES=matinee] [CSS=proposal.css] NODE_PATH=$(npm root -g) node docs/internal/design/themes-2/audit.cjs [site] [out folder]
const { chromium } = require('playwright');
const fs = require('fs');
const SITE = process.argv[2] || 'http://localhost:5173';
const OUT = process.argv[3] || '/tmp/themes-2';
fs.mkdirSync(OUT, { recursive: true });
const [W, H] = (process.env.SIZE || '1366x768').split('x').map(Number); // SIZE=1920x1080 for another window
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null; // ONLY=home,room to run some screens
const THEMES = process.env.THEMES ? process.env.THEMES.split(',') : ['gece', 'okyanus', 'gunbatimi', 'neon', 'lokum', 'binbirgece', 'sinema', 'acikhava', 'gemi', 'tren'];
const EXTRA_CSS = process.env.CSS ? fs.readFileSync(process.env.CSS, 'utf8') : ''; // CSS=proposal.css: measure a proposal
const rid = () => `audit${Math.random().toString(36).slice(2, 7)}`;
async function join(p) {
  await p.waitForSelector('#name');
  await p.fill('#name', 'Alex');
  await p.click('#name-form button.primary');
  await p.waitForSelector('.room');
  await p.waitForTimeout(3800); // the intro plays for 2.7 s on the first entry
}
const SCREENS = [
  ['home', () => '/', async (p) => p.waitForTimeout(1800)],
  ['room', () => `/r/${rid()}`, join],
  ['dialog', () => `/r/${rid()}`, async (p) => { await join(p); await p.click('#room-more'); await p.waitForTimeout(400); await p.locator('button.room-more-item', { hasText: 'Room rules' }).click(); await p.waitForTimeout(800); }],
  // The games hall waits behind an invisible 🎮 under ⋯ More on a computer (#more-game).
  ['games', () => `/r/${rid()}`, async (p) => { await join(p); await p.evaluate(() => document.querySelector('#more-game').click()); await p.waitForTimeout(1500); }],
  ['game', () => `/r/${rid()}`, async (p) => { await join(p); await p.evaluate(() => document.querySelector('#more-game').click()); await p.waitForTimeout(1500); await p.locator('.hub-game', { hasText: 'Classics' }).click(); await p.waitForTimeout(2500); }],
];

// In the page: every visible text leaf with its colour, size, weight, kind and box.
const collect = () => {
  const out = [];
  const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted').trim();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  // Text behind an open modal is dimmed on purpose: only the modal's own text counts.
  const modal = [...document.querySelectorAll('[aria-modal="true"], dialog[open]')].find((m) => m.getBoundingClientRect().width > 0);
  while (walker.nextNode()) {
    const t = walker.currentNode;
    if (!t.textContent.trim() || t.textContent.trim().length < 2) continue;
    const el = t.parentElement;
    if (!el || seen.has(el) || (modal && !modal.contains(el))) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const range = document.createRange(); range.selectNodeContents(t);
    const r = range.getBoundingClientRect();
    if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    let hidden = false; for (let a = el; a; a = a.parentElement) { const s = getComputedStyle(a); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) { hidden = true; break; } }
    if (hidden || el.closest('[aria-hidden="true"]')) continue;
    // Covered by something else (a game window over the side panel): not readable, not ours to measure.
    const top = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
    if (top && !el.contains(top) && !top.contains(el)) continue;
    const kind = el.closest('button, .btn, [role=button], [role=tab], [role=menuitem]') ? 'button' : el.closest('a') ? 'link'
      : el.closest('.muted, .small') || cs.color === muted ? 'muted' : 'body';
    const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 700;
    out.push({ text: t.textContent.trim().slice(0, 40), color: cs.color, kind, large: size >= 24 || (size >= 18.66 && bold), size,
      box: [Math.max(0, r.left), Math.max(0, r.top), Math.min(innerWidth, r.right), Math.min(innerHeight, r.bottom)] });
  }
  return out;
};

// In the page: sample the text-free screenshot under every box; worst-ish contrast per text.
const measure = async ({ png, items }) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + png; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const sx = img.width / innerWidth;
  const lum = ([r, gg, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  return items.map((it) => {
    const m = it.color.match(/[\d.]+/g).map(Number); const alpha = m[3] ?? 1;
    if (it.color.startsWith('color(srgb')) for (let k = 0; k < 3; k++) m[k] *= 255; // color-mix() results come as color(srgb 0–1)
    const [x0, y0, x1, y1] = it.box.map((v) => Math.round(v * sx));
    const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
    const d = g.getImageData(x0, y0, w, h).data; const rs = [];
    const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 400)));
    for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4; const bg = [d[i], d[i + 1], d[i + 2]];
      const fg = [0, 1, 2].map((k) => m[k] * alpha + bg[k] * (1 - alpha));
      rs.push(ratio(fg, bg));
    }
    rs.sort((p, q) => p - q);
    return { ...it, p10: +rs[Math.floor(rs.length * 0.1)].toFixed(2), med: +rs[Math.floor(rs.length / 2)].toFixed(2) };
  });
};

(async () => {
  const browser = await chromium.launch();
  const report = {};
  for (const theme of THEMES) {
    report[theme] = {};
    for (const [name, path, prepare] of SCREENS.filter(([n]) => !ONLY || ONLY.includes(n))) {
      const ctx = await browser.newContext({ viewport: { width: W, height: H } });
      await ctx.addInitScript((th) => { localStorage.setItem('lang', 'en'); localStorage.setItem('theme', th); localStorage.setItem('tipsSeen', '1'); localStorage.setItem('opt:autoInvite', '0'); }, theme);
      if (EXTRA_CSS) await ctx.addInitScript((c) => { const add = () => { const st = document.createElement('style'); st.textContent = c; document.head.append(st); }; document.head ? add() : document.addEventListener('DOMContentLoaded', add); }, EXTRA_CSS);
      const p = await ctx.newPage();
      try {
        await p.goto(SITE + path(), { waitUntil: 'networkidle' });
        await prepare(p);
        await p.evaluate(() => document.querySelectorAll('.intro, .first-tip').forEach((e) => e.remove()));
        await p.waitForTimeout(600);
        await p.screenshot({ path: `${OUT}/${theme}-${name}.png` });
        const items = await p.evaluate(collect);
        await p.addStyleTag({ content: '*, *::before, *::after { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; caret-color: transparent !important; }' });
        await p.waitForTimeout(150);
        const png = (await p.screenshot()).toString('base64');
        report[theme][name] = await p.evaluate(measure, { png, items });
      } catch (e) { console.log('ERR', theme, name, e.message.split('\n')[0]); report[theme][name] = []; }
      await ctx.close();
    }
    console.log('✓', theme);
  }
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
  await browser.close();
})();
