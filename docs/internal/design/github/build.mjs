// GitHub page art (Design session, card GH): README hero banners (EN + TR) and the social preview.
// Night-gold D1 style: our own dark background so it reads on GitHub's light and dark themes alike.
// The wordmark font (Bricolage Grotesque ExtraBold, OFL) is embedded, so the SVGs look the same in an <img>.
// Run: node docs/internal/design/github/build.mjs → ./banner-en.svg, ./banner-tr.svg, ./social-preview.svg
//      then (PNG, Chromium): node docs/internal/design/github/build.mjs --png
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../../../../', import.meta.url);
const here = new URL('./', import.meta.url);
const read = (p) => readFileSync(new URL(p, root));
const b64 = (buf) => Buffer.from(buf).toString('base64');
const svgUri = (p) => `data:image/svg+xml;base64,${b64(read(p))}`;

const FONT = b64(read('apps/web/public/fonts/bricolage-grotesque-800.woff2'));
const LOGO = svgUri('apps/web/public/logo.svg');
const GLOW = svgUri('apps/web/public/mascot-happy.svg');
const FACES = ['captain', 'sorceress', 'astronaut'].map((id) => svgUri(`apps/web/public/avatars/${id}.svg`));
const SANS = "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";

const TEXT = {
  en: { s1: 'Different screens,', s2: 'same moment.', line: 'Watch any video with friends, in sync. Free, no account.', sync: 'In sync · 30 ms', chat: 'this part!', people: '3 watching · 2 in voice' },
  tr: { s1: 'Ayrı ekranlar,', s2: 'aynı an.', line: 'Arkadaşlarınla her videoyu aynı anda izle. Ücretsiz, hesap yok.', sync: 'Senkron · 30 ms', chat: 'işte bu kısım!', people: '3 kişi izliyor · 2’si seste' },
};

// The home art (card 15c scene) with Glowbeam and three themed faces filled in; emoji left out (they depend on fonts).
function scene(t, p) {
  let s = readFileSync(new URL('../home-15c/scene.svg', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->\s*/, '');
  s = s.replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  s = s.replace(/id="hm-/g, `id="${p}hm-`).replace(/url\(#hm-/g, `url(#${p}hm-`).replace(/href="#hm-/g, `href="#${p}hm-`);
  s = s.replace(/(data-art="artSync">)[^<]*/, `$1${t.sync}`).replace(/(data-art="artChat">)[^<]*/, `$1${t.chat}`).replace(/(data-art="artPeople">)[^<]*/, `$1${t.people}`);
  let i = 0;
  s = s.replace(/class="hm-face" href=""/g, () => `class="hm-face" href="${FACES[i++]}"`);
  s = s.replace(/<text /g, `<text font-family="${SANS}" `);
  return `${s}<image href="${GLOW}" x="22" y="112" width="156" height="156"/>`;
}

const defs = (p) => `<defs>
<style>@font-face{font-family:'SL Bricolage';src:url(data:font/woff2;base64,${FONT}) format('woff2');font-weight:800}</style>
<linearGradient id="${p}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22174f"/><stop offset="1" stop-color="#08061a"/></linearGradient>
<radialGradient id="${p}glow" cx=".72" cy=".55" r=".6"><stop offset="0" stop-color="#ffc65a" stop-opacity=".16"/><stop offset="1" stop-color="#ffc65a" stop-opacity="0"/></radialGradient>
<radialGradient id="${p}vig" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></radialGradient>
</defs>`;
const stars = (w, h) => [[.06, .18, 1.6], [.32, .1, 1.1], [.46, .86, 1.3], [.58, .08, 1], [.93, .12, 1.4], [.97, .78, 1.1], [.04, .82, 1]]
  .map(([x, y, r]) => `<circle cx="${(x * w).toFixed(0)}" cy="${(y * h).toFixed(0)}" r="${r}" fill="#fff3d6" opacity=".5"/>`).join('');
const word = (x, y, size) => `<text x="${x}" y="${y}" font-family="'SL Bricolage', ${SANS}" font-weight="800" font-size="${size}" letter-spacing="-0.02em" fill="#fff3d6">Sidelit</text>`;

function banner(lang) {
  const t = TEXT[lang], p = `b${lang}-`, W = 1280, H = 400;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Sidelit: ${t.s1} ${t.s2}">${defs(p)}
<rect width="${W}" height="${H}" rx="24" fill="url(#${p}bg)"/><rect width="${W}" height="${H}" rx="24" fill="url(#${p}glow)"/><rect width="${W}" height="${H}" rx="24" fill="url(#${p}vig)"/>${stars(W, H)}
<image href="${LOGO}" x="72" y="74" width="84" height="84"/>
${word(176, 142, 76)}
<text x="74" y="236" font-family="'SL Bricolage', ${SANS}" font-weight="800" font-size="50" letter-spacing="-0.02em" fill="#ffffff">${t.s1}</text>
<text x="74" y="294" font-family="'SL Bricolage', ${SANS}" font-weight="800" font-size="50" letter-spacing="-0.02em" fill="#ffc65a">${t.s2}</text>
<text x="76" y="342" font-family="${SANS}" font-size="20" fill="#c9c0ea">${t.line}</text>
<svg x="610" y="20" width="640" height="380" viewBox="0 0 640 380">${scene(t, p)}</svg>
</svg>\n`;
}

function social() {
  const t = TEXT.en, p = 'sp-', W = 1280, H = 640;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs(p)}
<rect width="${W}" height="${H}" fill="url(#${p}bg)"/><rect width="${W}" height="${H}" fill="url(#${p}glow)"/><rect width="${W}" height="${H}" fill="url(#${p}vig)"/>${stars(W, H)}
<image href="${LOGO}" x="80" y="104" width="120" height="120"/>
${word(224, 200, 112)}
<text x="82" y="340" font-family="'SL Bricolage', ${SANS}" font-weight="800" font-size="72" letter-spacing="-0.02em" fill="#ffffff">${t.s1}</text>
<text x="82" y="428" font-family="'SL Bricolage', ${SANS}" font-weight="800" font-size="72" letter-spacing="-0.02em" fill="#ffc65a">${t.s2}</text>
<text x="84" y="500" font-family="${SANS}" font-size="28" fill="#c9c0ea">Watch any video with friends, in sync.</text>
<text x="84" y="542" font-family="${SANS}" font-size="28" fill="#c9c0ea">Free · no account · no ads</text>
<svg x="736" y="170" width="520" height="309" viewBox="0 0 640 380">${scene(t, p)}</svg>
</svg>\n`;
}

const out = { 'banner-en.svg': banner('en'), 'banner-tr.svg': banner('tr'), 'social-preview.svg': social() };
for (const [f, s] of Object.entries(out)) writeFileSync(new URL(f, here), s);
console.log('✓', Object.keys(out).join(', '));

if (process.argv.includes('--png')) {
  const { createRequire } = await import('node:module');
  const { chromium } = createRequire(import.meta.url)('playwright');
  const b = await chromium.launch();
  for (const [svg, png, w, h, scale] of [['banner-en.svg', 'banner-en@2x.png', 1280, 400, 2], ['banner-tr.svg', 'banner-tr@2x.png', 1280, 400, 2], ['social-preview.svg', 'social-preview.png', 1280, 640, 1]]) {
    const page = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
    await page.goto(new URL(svg, here).href);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await page.screenshot({ path: new URL(png, here).pathname, omitBackground: true });
  }
  await b.close();
  console.log('✓ PNGs');
}
