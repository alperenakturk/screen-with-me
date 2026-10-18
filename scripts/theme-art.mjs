// Çizimli temaların resimlerini (SVG) üretir: her tema için bir sahne (sayfanın
// arkasında, ekranı kaplar) ve o temanın kostümünü giymiş maskot (sol alt köşe).
// Dış paket ya da dışarıdan resim/font yok; her şey burada şekillerle çiziliyor.
//
//   node scripts/theme-art.mjs   → apps/web/public/themes/*.svg
//
// Sahnelerde ortası (içeriğin durduğu yer) boş bırakılır; süsler kenarlarda.

import { mkdirSync, writeFileSync } from 'node:fs';
import { LOGO_FROM, LOGO_INK, LOGO_TO } from '../packages/shared/src/logo.ts';

const OUT = new URL('../apps/web/public/themes/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const W = 1600;
const H = 900;

/** Aynı çıktıyı versin diye tohumlu rastgele sayı. */
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n) => Math.round(n * 10) / 10;

function svg(w, h, body, extra = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"${extra}>${body}</svg>\n`;
}

const GLOW = (id, std) =>
  `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${std}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;

/** Dört köşeli parıltı yıldızı. */
function sparkle(x, y, r, color, opacity = 1) {
  const s = r * 0.28;
  return `<path d="M${f(x)} ${f(y - r)} Q${f(x + s)} ${f(y - s)} ${f(x + r)} ${f(y)} Q${f(x + s)} ${f(y + s)} ${f(x)} ${f(y + r)} Q${f(x - s)} ${f(y + s)} ${f(x - r)} ${f(y)} Q${f(x - s)} ${f(y - s)} ${f(x)} ${f(y - r)}Z" fill="${color}" opacity="${opacity}"/>`;
}

// ---- Maskot (logo): 64'lük ızgarada, istenen yere ve boyuta ----

const LOGO_DEFS = `<linearGradient id="lg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${LOGO_FROM}"/><stop offset="1" stop-color="${LOGO_TO}"/></linearGradient>`;

function eye(cx, look = [2.5, -1.5]) {
  const px = cx + look[0];
  const py = 25.5 + look[1];
  return `<ellipse cx="${cx}" cy="25.5" rx="8.5" ry="11" fill="#fff"/><circle cx="${px}" cy="${py}" r="4.8" fill="${LOGO_INK}"/><circle cx="${f(px + 1.55)}" cy="${f(py - 1.6)}" r="1.6" fill="#fff"/>`;
}

/** Logo; `face: false` ise gözleri çizme (gözlüklü maskot kendi çizer). */
function logo(x, y, size, { face = true, look, mouth = true } = {}) {
  const k = size / 64;
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(k * 1000) / 1000})">
<rect width="64" height="64" rx="16" fill="url(#lg)"/>
${face ? eye(22, look) + eye(42, look) : ''}
${mouth ? '<path d="M28.5 38.5 L38 44 L28.5 49.5 Z" fill="#fff" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>' : ''}
</g>`;
}

// =====================================================================
// UZAY: birkaç sevimli gezegen, kuyruklu yıldız, roket, UFO, parıltılar
// =====================================================================

function uzayScene() {
  const kawaii = (cx, cy, r) => `
<g opacity=".9"><circle cx="${f(cx - r * 0.32)}" cy="${f(cy - r * 0.05)}" r="${f(r * 0.07)}" fill="#1b1446"/><circle cx="${f(cx + r * 0.32)}" cy="${f(cy - r * 0.05)}" r="${f(r * 0.07)}" fill="#1b1446"/>
<path d="M${f(cx - r * 0.14)} ${f(cy + r * 0.12)} Q${f(cx)} ${f(cy + r * 0.26)} ${f(cx + r * 0.14)} ${f(cy + r * 0.12)}" stroke="#1b1446" stroke-width="${f(r * 0.05)}" fill="none" stroke-linecap="round"/>
<ellipse cx="${f(cx - r * 0.5)}" cy="${f(cy + r * 0.14)}" rx="${f(r * 0.12)}" ry="${f(r * 0.07)}" fill="#ff8fb8" opacity=".6"/><ellipse cx="${f(cx + r * 0.5)}" cy="${f(cy + r * 0.14)}" rx="${f(r * 0.12)}" ry="${f(r * 0.07)}" fill="#ff8fb8" opacity=".6"/></g>`;

  const sparkles = [
    [470, 90, 9], [1080, 70, 7], [1500, 330, 10], [90, 430, 8], [1230, 640, 7], [380, 780, 6],
    [1530, 520, 6], [690, 40, 6], [960, 820, 5], [250, 210, 6], [1320, 380, 5], [60, 260, 5],
  ].map(([x, y, r]) => sparkle(x, y, r, '#fff6c8', 0.85)).join('');

  return svg(W, H, `
<defs>
${GLOW('g', 4)}
<radialGradient id="peach" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ffe2b8"/><stop offset=".55" stop-color="#f59a74"/><stop offset="1" stop-color="#9b3f6b"/></radialGradient>
<radialGradient id="blue" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#b6e6ff"/><stop offset=".5" stop-color="#4f8de8"/><stop offset="1" stop-color="#1c2669"/></radialGradient>
<radialGradient id="pink" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ffd1ea"/><stop offset="1" stop-color="#c2508f"/></radialGradient>
<radialGradient id="mint" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#d6ffe9"/><stop offset="1" stop-color="#3aa880"/></radialGradient>
<linearGradient id="tail" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#9fd8ff" stop-opacity="0"/></linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8ffe0" stop-opacity=".45"/><stop offset="1" stop-color="#a8ffe0" stop-opacity="0"/></linearGradient>
<mask id="cres"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="160" cy="104" r="28" fill="#000"/></mask>
</defs>
<!-- Hilal -->
<circle cx="146" cy="116" r="30" fill="#f6f2ff" mask="url(#cres)" filter="url(#g)"/>
<!-- Halkalı şeftali gezegen (sağ üst) -->
<g transform="rotate(-16 1390 180)">
  <ellipse cx="1390" cy="180" rx="92" ry="20" fill="none" stroke="#ffe7c4" stroke-opacity=".55" stroke-width="7"/>
</g>
<circle cx="1390" cy="180" r="50" fill="url(#peach)"/>
<g transform="rotate(-16 1390 180)"><path d="M1298 180 A92 20 0 0 0 1482 180" fill="none" stroke="#ffe7c4" stroke-opacity=".85" stroke-width="7"/></g>
${kawaii(1390, 180, 50)}
<!-- Mavi gezegen (sağ alt) -->
<circle cx="1470" cy="715" r="66" fill="url(#blue)"/>
<path d="M1410 690 Q1470 676 1532 694 M1406 726 Q1470 742 1534 722" stroke="#d6f0ff" stroke-opacity=".35" stroke-width="7" fill="none" stroke-linecap="round"/>
${kawaii(1470, 715, 66)}
<!-- Küçük gezegenler -->
<circle cx="232" cy="352" r="21" fill="url(#pink)"/>
<circle cx="1186" cy="128" r="13" fill="url(#mint)"/>
<circle cx="1555" cy="430" r="8" fill="#ffd27a" opacity=".9"/>
<!-- Kuyruklu yıldız -->
<path d="M566 112 L404 36 L560 104 Z" fill="url(#tail)"/>
<circle cx="566" cy="111" r="6" fill="#fff" filter="url(#g)"/>
<!-- Roket -->
<g transform="translate(1250 480) rotate(38)">
  <path d="M0 22 Q-7 40 0 52 Q7 40 0 22Z" fill="#ffb347"/><path d="M0 26 Q-3.5 38 0 46 Q3.5 38 0 26Z" fill="#fff3a6"/>
  <path d="M-11 12 L-18 26 L-9 22Z M11 12 L18 26 L9 22Z" fill="#ff6f91"/>
  <path d="M0 -26 Q12 -12 11 18 L-11 18 Q-12 -12 0 -26Z" fill="#f3f1ff"/>
  <circle cx="0" cy="-2" r="5.5" fill="#6ee7ff" stroke="#8a7dff" stroke-width="2"/>
</g>
<!-- UFO -->
<g transform="translate(330 560)">
  <path d="M-30 18 L30 18 L58 120 L-58 120Z" fill="url(#beam)"/>
  <ellipse cx="0" cy="8" rx="34" ry="11" fill="#b9b3ff"/><path d="M-16 4 Q0 -22 16 4Z" fill="#9cf0ff" opacity=".85"/>
  <circle cx="-18" cy="10" r="2.6" fill="#ffe27a"/><circle cx="0" cy="13" r="2.6" fill="#ffe27a"/><circle cx="18" cy="10" r="2.6" fill="#ffe27a"/>
</g>
${sparkles}
`);
}

function uzayMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}${GLOW('g', 3)}
<radialGradient id="pl" cx="35%" cy="25%" r="85%"><stop offset="0" stop-color="#c8b8ff"/><stop offset=".6" stop-color="#6a4fd8"/><stop offset="1" stop-color="#2a1c6e"/></radialGradient>
<radialGradient id="glass" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#e8f6ff" stop-opacity=".35"/><stop offset="1" stop-color="#9fd8ff" stop-opacity=".08"/></radialGradient>
</defs>
<!-- Küçük gezegen -->
<ellipse cx="120" cy="226" rx="104" ry="40" fill="url(#pl)"/>
<ellipse cx="72" cy="214" rx="12" ry="5" fill="#2a1c6e" opacity=".45"/><ellipse cx="160" cy="222" rx="16" ry="6" fill="#2a1c6e" opacity=".45"/><ellipse cx="118" cy="236" rx="9" ry="3.5" fill="#2a1c6e" opacity=".4"/>
<!-- Bayrak -->
<line x1="186" y1="206" x2="186" y2="128" stroke="#dfe3f5" stroke-width="3" stroke-linecap="round"/>
<path d="M188 130 L220 140 L188 152Z" fill="#6ee7ff"/><path d="M196 136 L206 141 L196 146Z" fill="#fff"/>
<!-- Astronot: yaka, kask içinde logo -->
<rect x="66" y="166" width="108" height="26" rx="13" fill="#e7e9f5" stroke="#b8bdd6" stroke-width="3"/>
<circle cx="88" cy="179" r="4" fill="#ff6f91"/><circle cx="102" cy="179" r="4" fill="#6ee7ff"/>
${logo(80, 86, 80, { look: [2, -1] })}
<circle cx="120" cy="124" r="62" fill="url(#glass)" stroke="#eef4ff" stroke-width="5"/>
<path d="M78 98 Q92 72 122 66" stroke="#fff" stroke-opacity=".75" stroke-width="6" fill="none" stroke-linecap="round"/>
<!-- Anten -->
<line x1="150" y1="68" x2="160" y2="42" stroke="#dfe3f5" stroke-width="3" stroke-linecap="round"/>
<circle cx="161" cy="39" r="6" fill="#ffe27a" filter="url(#g)"/>
${sparkle(36, 70, 9, '#fff6c8')}${sparkle(214, 72, 6, '#fff6c8')}
`);
}

// =====================================================================
// CYBERPUNK: neon şehir silueti, sentetik güneş, uçan arabalar, tabelalar
// =====================================================================

const PINK = '#ff2a6d';
const CYAN = '#05d9e8';
const YELLOW = '#f9f002';

function siberScene() {
  const r = rng(7);
  const parts = [];
  // Binalar: kenarlarda uzun, ortada alçak (içeriğin arkası sakin kalsın)
  let x = -10;
  const buildings = [];
  while (x < W) {
    const w = 46 + Math.floor(r() * 70);
    const centerness = 1 - Math.abs(x + w / 2 - W / 2) / (W / 2); // ortada 1, kenarda 0
    const h = 110 + r() * 220 + (1 - centerness) * 230;
    buildings.push({ x, w, h });
    x += w + 2 + Math.floor(r() * 8);
  }
  // Ortadaki güneşin önünde bina olmasın (aralardan güneş parça parça görünüyordu).
  const shown = buildings.filter((b) => b.x + b.w < 600 || b.x > 1000);
  buildings.length = 0;
  buildings.push(...shown);
  for (const b of buildings) {
    const top = H - b.h;
    const edge = r() < 0.5 ? PINK : CYAN;
    parts.push(`<rect x="${b.x}" y="${f(top)}" width="${b.w}" height="${f(b.h)}" fill="#0c0520"/>`);
    parts.push(`<line x1="${b.x}" y1="${f(top)}" x2="${b.x + b.w}" y2="${f(top)}" stroke="${edge}" stroke-width="2" opacity=".8" filter="url(#n)"/>`);
    // Pencereler
    for (let wy = top + 12; wy < H - 10; wy += 12) {
      for (let wx = b.x + 6; wx < b.x + b.w - 8; wx += 9) {
        const v = r();
        if (v < 0.13) {
          const c = v < 0.06 ? CYAN : v < 0.1 ? PINK : YELLOW;
          parts.push(`<rect x="${wx}" y="${f(wy)}" width="5" height="6" fill="${c}" opacity="${f(0.45 + r() * 0.45)}"/>`);
        }
      }
    }
    // Anten ve kırmızı ışık
    if (b.h > 380 && r() < 0.6) {
      const ax = b.x + b.w / 2;
      parts.push(`<line x1="${ax}" y1="${f(top)}" x2="${ax}" y2="${f(top - 34)}" stroke="#3b2a5c" stroke-width="2"/><circle cx="${ax}" cy="${f(top - 36)}" r="3" fill="${PINK}" filter="url(#n)"/>`);
    }
  }
  // Neon tabelalar (yazısız, soyut işaretler)
  const signs = buildings.filter((b) => b.h > 360).slice(0, 7);
  signs.forEach((b, i) => {
    const sx = b.x + b.w / 2 - 12;
    const sy = H - b.h + 40 + (i % 3) * 30;
    const c = [PINK, CYAN, YELLOW][i % 3];
    let glyphs = '';
    for (let g = 0; g < 4; g++) glyphs += `<line x1="${sx + 6}" y1="${sy + 14 + g * 18}" x2="${sx + 18}" y2="${sy + 14 + g * 18 + (g % 2 ? 4 : -2)}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
    parts.push(`<g filter="url(#n)"><rect x="${sx}" y="${sy}" width="24" height="84" rx="3" fill="#13072b" stroke="${c}" stroke-width="2.5"/>${glyphs}</g>`);
  });
  // Binalar arası neon kablolar ve gökyüzüne lazer ışınları
  for (let i = 0; i + 2 < buildings.length; i += 2) {
    const a = buildings[i];
    const b = buildings[i + 2];
    if (b.x - a.x > 300) continue;
    const ax = a.x + a.w / 2;
    const bx = b.x + b.w / 2;
    const y1 = H - Math.min(a.h, b.h) + 60;
    const c = i % 4 ? CYAN : PINK;
    parts.push(`<path d="M${ax} ${f(y1)} Q${f((ax + bx) / 2)} ${f(y1 + 50)} ${bx} ${f(y1)}" stroke="${c}" stroke-width="1.8" fill="none" opacity=".6" filter="url(#n)"/>`);
  }
  const tall = [...buildings].sort((p, q) => q.h - p.h).slice(0, 4);
  tall.forEach((b, i) => {
    const bx = b.x + b.w / 2;
    const tx = bx + (bx < W / 2 ? 260 : -260) + i * 30;
    parts.push(`<line x1="${bx}" y1="${f(H - b.h)}" x2="${f(tx)}" y2="0" stroke="${i % 2 ? CYAN : PINK}" stroke-width="2" opacity=".18"/>`);
  });
  // Hologram halka (sol)
  parts.push(`<g filter="url(#n)" opacity=".8"><ellipse cx="190" cy="300" rx="58" ry="18" fill="none" stroke="${CYAN}" stroke-width="2"/><ellipse cx="190" cy="280" rx="40" ry="12" fill="none" stroke="${CYAN}" stroke-width="1.5" opacity=".6"/><path d="M178 262 L206 278 L178 294Z" fill="none" stroke="${PINK}" stroke-width="2.5" stroke-linejoin="round"/></g>`);
  // Uçan arabalar (ışık izleri)
  const cars = [[120, 250, 1, PINK], [300, 330, -1, CYAN], [1290, 210, -1, CYAN], [1460, 300, 1, PINK], [1180, 380, 1, YELLOW], [70, 420, 1, CYAN]];
  for (const [cx, cy, dir, c] of cars) {
    parts.push(`<line x1="${cx}" y1="${cy}" x2="${cx - dir * 70}" y2="${cy + 4}" stroke="${c}" stroke-width="2" opacity=".55"/><ellipse cx="${cx}" cy="${cy}" rx="11" ry="4.5" fill="#1d1238" stroke="${c}" stroke-width="1.5" filter="url(#n)"/>`);
  }

  // Sentetik güneş: ufukta, çizgili
  let stripes = '';
  for (let i = 0; i < 9; i++) stripes += `<rect x="600" y="${f(700 + i * 16)}" width="400" height="${f(2.5 + i * 1.4)}" fill="#000"/>`;
  // Güneşin ufkun altında kalan yarısı görünmesin
  stripes += `<rect x="0" y="842" width="${W}" height="${H - 842}" fill="#000"/>`;

  // Yer ızgarası
  let grid = '';
  for (let i = 0; i < 6; i++) {
    const y = 842 + i * i * 2.2;
    grid += `<line x1="0" y1="${f(y)}" x2="${W}" y2="${f(y)}"/>`;
  }
  for (let i = -12; i <= 12; i++) grid += `<line x1="${800 + i * 30}" y1="842" x2="${800 + i * 160}" y2="${H}"/>`;

  return svg(W, H, `
<defs>
${GLOW('n', 3.5)}
<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${YELLOW}"/><stop offset=".55" stop-color="#ff7a3d"/><stop offset="1" stop-color="${PINK}"/></linearGradient>
<linearGradient id="hz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PINK}" stop-opacity="0"/><stop offset=".75" stop-color="${PINK}" stop-opacity=".22"/><stop offset="1" stop-color="#7a04eb" stop-opacity=".12"/></linearGradient>
<mask id="sunm"><rect width="${W}" height="${H}" fill="#fff"/>${stripes}</mask>
</defs>
<rect y="430" width="${W}" height="470" fill="url(#hz)"/>
<circle cx="800" cy="842" r="190" fill="url(#sun)" mask="url(#sunm)" opacity=".85" filter="url(#n)"/>
${parts.join('')}
<g stroke="${PINK}" stroke-opacity=".5" stroke-width="1.2">${grid}</g>
`);
}

function siberMascot() {
  const arm = (side) => {
    const s = side; // -1 sol, 1 sağ
    const bx = 120 + s * 46;
    return `<g>
<path d="M${bx} 128 L${bx + s * 30} 150" stroke="#8f96ad" stroke-width="13" stroke-linecap="round"/>
<path d="M${bx + s * 30} 150 L${bx + s * 40} ${s < 0 ? 112 : 186}" stroke="#a9b0c6" stroke-width="11" stroke-linecap="round"/>
<circle cx="${bx}" cy="128" r="9" fill="#2b2f42" stroke="${CYAN}" stroke-width="3" filter="url(#n)"/>
<circle cx="${bx + s * 30}" cy="150" r="7.5" fill="#2b2f42" stroke="${PINK}" stroke-width="3" filter="url(#n)"/>
${s < 0
    ? `<g transform="translate(${bx + s * 40} 104)"><circle r="10" fill="#c3c9dc"/><rect x="-3" y="-22" width="6" height="16" rx="3" fill="#c3c9dc"/></g>`
    : `<g transform="translate(${bx + s * 40} 192)"><path d="M-9 0 L-14 12 M0 2 L0 15 M9 0 L14 12" stroke="#c3c9dc" stroke-width="4.5" stroke-linecap="round"/><circle r="8" fill="#c3c9dc"/></g>`}
</g>`;
  };
  return svg(240, 240, `
<defs>${LOGO_DEFS}${GLOW('n', 3)}
<linearGradient id="visor" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${CYAN}"/><stop offset="1" stop-color="${PINK}"/></linearGradient>
</defs>
<!-- Çatı kenarı -->
<rect x="18" y="214" width="204" height="22" rx="3" fill="#120a26"/><line x1="18" y1="214" x2="222" y2="214" stroke="${PINK}" stroke-width="3" filter="url(#n)"/>
<rect x="40" y="222" width="18" height="6" fill="${CYAN}" opacity=".7"/><rect x="170" y="222" width="26" height="6" fill="${YELLOW}" opacity=".7"/>
${arm(-1)}${arm(1)}
${logo(74, 90, 92, { face: false })}
<!-- Siber vizör -->
<g transform="translate(74 90) scale(1.4375)">
  <rect x="7" y="16" width="50" height="19" rx="7" fill="#0b0418" stroke="url(#visor)" stroke-width="2.4"/>
  <rect x="14" y="23" width="14" height="5" rx="2.5" fill="${CYAN}" filter="url(#n)"/><rect x="36" y="23" width="14" height="5" rx="2.5" fill="${PINK}" filter="url(#n)"/>
  <path d="M8 52 H18 L22 48 H30" stroke="${CYAN}" stroke-width="1.4" fill="none" opacity=".8"/>
</g>
<!-- Anten -->
<line x1="148" y1="92" x2="166" y2="58" stroke="#8f96ad" stroke-width="3.5" stroke-linecap="round"/>
<circle cx="168" cy="54" r="6" fill="${PINK}" filter="url(#n)"/>
`);
}

// =====================================================================
// FANTASTİK ORTA ÇAĞ: ay, dağlar, kale, uçan sevimli ejderha, büyü izleri
// =====================================================================

/** Sevimli ejderha; (x, y) gövde ortası, k ölçek, dir 1 sağa bakar. */
function dragon(x, y, k, dir = 1, colors = { body: '#4fbf72', dark: '#2f8f55', belly: '#c8f2a6', wing: '#3aa564' }) {
  return `<g transform="translate(${x} ${y}) scale(${dir * k} ${k})">
<path d="M-38 6 Q-70 0 -78 -18 Q-74 -6 -86 -4 L-80 -14 Q-60 16 -36 14Z" fill="${colors.dark}"/>
<path d="M-90 -6 L-80 -18 L-76 -4Z" fill="${colors.dark}"/>
<path d="M-6 -16 Q-30 -64 -62 -58 Q-48 -46 -50 -34 Q-36 -42 -32 -26 Q-22 -34 -8 -12Z" fill="${colors.wing}" stroke="${colors.dark}" stroke-width="3" stroke-linejoin="round"/>
<ellipse cx="0" cy="0" rx="40" ry="26" fill="${colors.body}"/>
<ellipse cx="4" cy="10" rx="26" ry="13" fill="${colors.belly}"/>
<path d="M14 18 l-4 14 h10 l-2 -12Z M-18 18 l-4 14 h10 l-2 -12Z" fill="${colors.dark}"/>
<path d="M-20 -24 l6 -9 l4 9 M-4 -27 l6 -9 l4 9 M12 -24 l6 -8 l3 9" fill="${colors.dark}"/>
<circle cx="40" cy="-20" r="22" fill="${colors.body}"/>
<ellipse cx="56" cy="-12" rx="14" ry="10" fill="${colors.body}"/>
<circle cx="60" cy="-15" r="1.8" fill="${colors.dark}"/><circle cx="66" cy="-13" r="1.8" fill="${colors.dark}"/>
<path d="M30 -38 l-6 -14 l12 8Z M44 -40 l2 -15 l8 12Z" fill="#f3e2a2"/>
<circle cx="42" cy="-24" r="8" fill="#fff"/><circle cx="44" cy="-24" r="5" fill="#1d1430"/><circle cx="46" cy="-26" r="1.8" fill="#fff"/>
<ellipse cx="36" cy="-10" rx="5" ry="3" fill="#ff8fa3" opacity=".7"/>
<path d="M46 -4 Q54 0 62 -4" stroke="${colors.dark}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
</g>`;
}

function ortacagScene() {
  // Yüzüklerin Efendisi havası: sisli karlı dağlar, dağa oyulmuş beyaz şehir, sırtta
  // yürüyen kafile, kartallar, harabeler, uzakta dağın etrafında dönen ejderha.
  const r = rng(11);
  let stars = '';
  for (let i = 0; i < 90; i++) {
    stars += `<circle cx="${f(r() * W)}" cy="${f(r() * 480)}" r="${f(0.5 + r() * 1.2)}" fill="#e8eeff" opacity="${f(0.25 + r() * 0.6)}"/>`;
  }
  // Sivri dağ sırası: noktaları rastgele üretilen tırtıklı silüet, tepelerinde kar
  const range = (base, amp, step, seed, fill, snow) => {
    const rr = rng(seed);
    const pts = [];
    for (let x = -40; x <= W + 40; x += step * (0.6 + rr() * 0.8)) pts.push([x, base - amp * (0.35 + rr() * 0.65)]);
    let d = `M-40 ${H} `;
    for (const [x, y] of pts) d += `L${f(x)} ${f(y)} `;
    d += `L${W + 40} ${H}Z`;
    let caps = '';
    if (snow) {
      for (let i = 1; i < pts.length - 1; i++) {
        const [x, y] = pts[i];
        if (y < pts[i - 1][1] && y < pts[i + 1][1] && base - y > amp * 0.55) {
          caps += `<path d="M${f(x)} ${f(y)} L${f(x - 18)} ${f(y + 22)} L${f(x - 6)} ${f(y + 16)} L${f(x + 4)} ${f(y + 24)} L${f(x + 16)} ${f(y + 20)}Z" fill="${snow}"/>`;
        }
      }
    }
    return `<path d="${d}" fill="${fill}"/>${caps}`;
  };
  const mist = (y, o) => `<ellipse cx="${W / 2}" cy="${y}" rx="${W * 0.7}" ry="34" fill="#c9d6ee" opacity="${o}" filter="url(#blur)"/>`;
  let pines = '';
  for (let i = 0; i < 18; i++) {
    const tx = i * 24 + r() * 8 - 14;
    const th = 60 + r() * 60;
    const base = 880 - Math.sin(i / 3) * 8;
    pines += `<path d="M${f(tx)} ${f(base)} L${f(tx + 15)} ${f(base - th)} L${f(tx + 30)} ${f(base)}Z" fill="#0a1018"/>`;
  }
  // Kafile: sırtta yürüyen küçük siluetler (biri asalı, biri yaylı)
  const walker = (x, y, kind) => `<g transform="translate(${x} ${y})" fill="#070a12">
<circle cx="0" cy="-17" r="3.2"/><path d="M-3.5 -13 L3.5 -13 L4.5 -2 L2 -2 L1.5 6 L-1.5 6 L-2 -2 L-4.5 -2Z"/>
${kind === 'staff' ? '<path d="M6 -24 L6 6" stroke="#070a12" stroke-width="1.6"/><circle cx="6" cy="-25" r="1.8" fill="#fff6d0"/>' : ''}
${kind === 'bow' ? '<path d="M-6 -20 Q-11 -10 -6 0" stroke="#070a12" stroke-width="1.4" fill="none"/>' : ''}
${kind === 'small' ? '' : '<path d="M-4.5 -12 L-7 -2 L-4 -3Z"/>'}
</g>`;
  const fellowship = [[300, 676, 'staff'], [318, 678, 'bow'], [334, 680, ''], [348, 684, 'small'], [358, 685, 'small'], [370, 686, '']]
    .map(([x, y, k]) => (k === 'small' ? `<g transform="translate(${x} ${y + 4}) scale(.7) translate(${-x} ${-y})">${walker(x, y, k)}</g>` : walker(x, y, k))).join('');
  const eagle = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 0 Q-20 -14 -46 -6 Q-28 -4 -14 6 Q-6 2 0 8 Q6 2 14 6 Q28 -4 46 -6 Q20 -14 0 0Z" fill="#0b1020"/>`;
  // Beyaz şehir: dağın yamacına basamak basamak surlar ve en üstte kule
  const city = `
<g>
  <path d="M1180 900 L1240 640 L1330 560 L1420 620 L1520 600 L1600 660 V900Z" fill="#1c2436"/>
  ${[0, 1, 2, 3, 4].map((i) => {
    const y = 760 - i * 34;
    const x1 = 1225 + i * 22;
    const x2 = 1495 - i * 22;
    return `<path d="M${x1} ${y} H${x2} V${y + 30} H${x1}Z" fill="${['#cfd6e4', '#c3cadb', '#b8c0d3', '#adb6cb', '#a3adc4'][i]}"/><path d="M${x1} ${y} H${x2}" stroke="#eef2fa" stroke-width="3"/>`;
  }).join('')}
  <rect x="1350" y="520" width="18" height="110" fill="#e6ebf5"/><path d="M1346 522 L1359 476 L1372 522Z" fill="#e6ebf5"/>
  <path d="M1359 476 V450 L1382 458 L1359 466" stroke="#d6a843" stroke-width="2" fill="#f0f3fa"/>
  ${Array.from({ length: 14 }, (_, i) => `<rect x="${f(1240 + (i % 7) * 34 + (i > 6 ? 17 : 0))}" y="${i > 6 ? 700 : 734}" width="5" height="8" rx="2.5" fill="#ffd27a" opacity=".85"/>`).join('')}
</g>`;
  const ruins = `<g fill="#111827">
  <rect x="470" y="700" width="16" height="70"/><rect x="520" y="716" width="16" height="54"/><path d="M466 700 H540 V708 H466Z"/>
  <rect x="556" y="740" width="16" height="30"/><path d="M552 742 l10 -8 l14 6Z"/>
</g>`;

  return svg(W, H, `
<defs>
<filter id="blur" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="14"/></filter>
${GLOW('g', 5)}
<radialGradient id="halo"><stop offset="0" stop-color="#e8eeff" stop-opacity=".35"/><stop offset="1" stop-color="#e8eeff" stop-opacity="0"/></radialGradient>
<radialGradient id="ember"><stop offset="0" stop-color="#ff8a3d" stop-opacity=".55"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></radialGradient>
</defs>
${stars}
<!-- Ay -->
<circle cx="300" cy="150" r="150" fill="url(#halo)"/>
<circle cx="300" cy="150" r="54" fill="#eef1fb"/>
<circle cx="282" cy="138" r="9" fill="#d9deee"/><circle cx="318" cy="164" r="12" fill="#d9deee"/>
<!-- Kartallar -->
${eagle(1040, 170, 1)}${eagle(1120, 210, 0.7)}${eagle(560, 120, 0.55)}
<!-- Uzak dağlar, dumanlı tepe ve etrafında dönen ejderha -->
${range(560, 260, 90, 3, '#2a3550', '#d9e2f2')}
<circle cx="1040" cy="330" r="70" fill="url(#ember)" opacity=".7"/>
<path transform="translate(1040 290) scale(.55)" d="M0 0 Q-30 -26 -70 -14 Q-40 -10 -26 4 Q-50 6 -66 20 Q-30 16 -10 10 Q4 18 22 12 L40 18 L30 6 Q50 -2 64 -16 Q30 -14 0 0Z" fill="#0b1020"/>
${mist(600, 0.22)}
${range(680, 220, 110, 9, '#1d263b', '#b9c6dd')}
${mist(700, 0.18)}
${city}
${range(800, 120, 140, 21, '#141b2b', null)}
<!-- Kafile ve harabeler -->
<path d="M140 900 Q260 680 420 690 Q560 700 640 900Z" fill="#101624"/>
${ruins}${fellowship}
<circle cx="420" cy="690" r="26" fill="url(#ember)"/><path d="M414 694 l6 -12 l6 12Z" fill="#ffb347"/>
${pines}
`);
}

function ortacagMascot() {
  // Korucu: kukuletalı pelerin, yaprak broş, dik tutulan kılıç.
  return svg(240, 240, `
<defs>${LOGO_DEFS}
<linearGradient id="cloak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f5a3a"/><stop offset="1" stop-color="#22331f"/></linearGradient>
<linearGradient id="blade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e9eef8"/><stop offset="1" stop-color="#9aa6bd"/></linearGradient>
</defs>
<!-- Taş zemin -->
<path d="M20 222 Q120 206 220 222 V236 H20Z" fill="#2a3242"/>
<!-- Pelerin (arkada) -->
<path d="M58 120 Q50 190 40 222 H200 Q190 190 182 120Z" fill="url(#cloak)"/>
${logo(72, 96, 96, { look: [1, 0] })}
<!-- Kukuleta: yüzü çerçeveler -->
<path d="M62 150 Q52 70 120 56 Q188 70 178 150 Q172 104 160 94 Q120 70 80 94 Q68 104 62 150Z" fill="url(#cloak)" stroke="#1a2717" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M120 56 Q132 40 150 44 Q136 50 132 62Z" fill="#33492f"/>
<!-- Yaprak broş -->
<path d="M120 196 Q108 186 120 172 Q132 186 120 196Z" fill="#7fc47a" stroke="#d6a843" stroke-width="2.5"/>
<!-- Kılıç -->
<g transform="translate(196 132)">
  <path d="M-4 -86 L4 -86 L5 30 L0 38 L-5 30Z" fill="url(#blade)"/>
  <rect x="-18" y="30" width="36" height="6" rx="3" fill="#d6a843"/>
  <rect x="-4" y="36" width="8" height="26" rx="3" fill="#5a3b22"/>
  <circle cx="0" cy="66" r="5" fill="#d6a843"/>
</g>
`);
}

// =====================================================================
// LOKUM (Turkish Delight): eski İstanbul. Boğaz, saray surları, kubbeli camiler,
// Galata, Kız Kulesi, yelkenliler ve kayıklar, serviler, martılar, İznik köşeleri
// =====================================================================

function lokumScene() {
  const r = rng(23);
  const minaret = (x, base, h, w = 8) => `<rect x="${f(x - w / 2)}" y="${f(base - h)}" width="${w}" height="${f(h)}"/><rect x="${f(x - w / 2 - 3)}" y="${f(base - h * 0.62)}" width="${w + 6}" height="4" rx="2"/><rect x="${f(x - w / 2 - 2)}" y="${f(base - h * 0.84)}" width="${w + 4}" height="3.5" rx="1.75"/><path d="M${f(x - w / 2)} ${f(base - h)} L${f(x)} ${f(base - h - h * 0.16)} L${f(x + w / 2)} ${f(base - h)}Z"/>`;
  const dome = (cx, base, rx, ry) => `<path d="M${f(cx - rx)} ${f(base)} A${f(rx)} ${f(ry)} 0 0 1 ${f(cx + rx)} ${f(base)}Z"/><rect x="${f(cx - 1.5)}" y="${f(base - ry - 14)}" width="3" height="14"/>`;
  // Büyük cami: kademeli kubbeler + 6 minare (Sultanahmet esintisi, genel)
  const grandMosque = (cx, base, s) => `
<path d="M${cx - 130 * s} ${base} V${base - 50 * s} H${cx + 130 * s} V${base}Z"/>
${dome(cx, base - 50 * s, 62 * s, 60 * s)}
${dome(cx - 72 * s, base - 50 * s, 32 * s, 28 * s)}${dome(cx + 72 * s, base - 50 * s, 32 * s, 28 * s)}
${dome(cx - 112 * s, base - 50 * s, 18 * s, 16 * s)}${dome(cx + 112 * s, base - 50 * s, 18 * s, 16 * s)}
${[-170, -150, 150, 170].map((dx) => minaret(cx + dx * s, base, (dx % 20 === 10 ? 190 : 170) * s)).join('')}
${minaret(cx - 205 * s, base, 150 * s)}${minaret(cx + 205 * s, base, 150 * s)}`;
  // Ayasofya esintisi: büyük basık kubbe, payandalar, 4 minare
  const oldMosque = (cx, base, s) => `
<path d="M${cx - 100 * s} ${base} V${base - 60 * s} H${cx + 100 * s} V${base}Z"/>
<path d="M${cx - 80 * s} ${base - 60 * s} V${base - 90 * s} H${cx + 80 * s} V${base - 60 * s}Z"/>
${dome(cx, base - 90 * s, 70 * s, 46 * s)}
${minaret(cx - 120 * s, base, 160 * s)}${minaret(cx + 120 * s, base, 160 * s)}${minaret(cx - 96 * s, base, 140 * s)}${minaret(cx + 96 * s, base, 140 * s)}`;
  // Saray surları ve kuleleri (Topkapı esintisi)
  const palace = (x0, base) => {
    let s = `<path d="M${x0} ${base} V${base - 44} H${x0 + 230} V${base}Z"/>`;
    for (let i = 0; i < 12; i++) s += `<rect x="${x0 + i * 20}" y="${base - 52}" width="10" height="8"/>`;
    for (const tx of [x0 + 10, x0 + 110, x0 + 210]) s += `<rect x="${tx}" y="${base - 86}" width="26" height="86"/><path d="M${tx - 4} ${base - 86} L${tx + 13} ${base - 122} L${tx + 30} ${base - 86}Z"/>`;
    return s;
  };
  const galata = (x, base) => `<rect x="${x - 22}" y="${base - 150}" width="44" height="150"/><rect x="${x - 27}" y="${base - 158}" width="54" height="10" rx="3"/><path d="M${x - 24} ${base - 158} L${x} ${base - 218} L${x + 24} ${base - 158}Z"/>`;
  const cypress = (x, base, h) => `<path d="M${x} ${base} C${x - 9} ${base - h * 0.4} ${x - 6} ${base - h * 0.8} ${x} ${base - h} C${x + 6} ${base - h * 0.8} ${x + 9} ${base - h * 0.4} ${x} ${base}Z"/>`;
  const houses = (x0, x1, base, seed) => {
    const rr = rng(seed);
    let s = '';
    for (let x = x0; x < x1; ) {
      const w = 26 + rr() * 26;
      const h = 24 + rr() * 34;
      s += `<path d="M${f(x)} ${base} V${f(base - h)} L${f(x + w / 2)} ${f(base - h - 12)} L${f(x + w)} ${f(base - h)} V${base}Z"/>`;
      x += w + 2;
    }
    return s;
  };
  // Kız Kulesi: küçük adada kule
  const maiden = (x, y) => `<g fill="#1a0a14"><ellipse cx="${x}" cy="${y}" rx="58" ry="10"/><rect x="${x - 34}" y="${y - 28}" width="68" height="26"/><rect x="${x - 10}" y="${y - 78}" width="20" height="52"/><path d="M${x - 14} ${y - 78} H${x + 14} L${x} ${y - 104}Z"/></g><rect x="${x - 4}" y="${y - 70}" width="8" height="10" rx="4" fill="#ffd58a" opacity=".9"/>`;
  // Kadırga: yelkenli eski gemi
  const ship = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
<path d="M-70 0 Q0 22 70 0 L58 -10 H-62Z" fill="#1a0a14"/>
<line x1="-20" y1="-10" x2="-20" y2="-86" stroke="#1a0a14" stroke-width="3"/><line x1="24" y1="-10" x2="24" y2="-70" stroke="#1a0a14" stroke-width="3"/>
<path d="M-20 -84 Q6 -60 -20 -24Z M-20 -84 Q-46 -54 -20 -24Z" fill="#f3dfc8" opacity=".85"/>
<path d="M24 -68 Q44 -48 24 -22Z" fill="#f3dfc8" opacity=".8"/>
<path d="M-20 -86 L-4 -92 L-20 -96" fill="#e8425a"/>
</g>`;
  const kayik = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-26 0 Q0 9 26 0 L22 -5 H-22Z" fill="#1a0a14"/><path d="M-2 -5 L-2 -22 L10 -6Z" fill="#f3dfc8" opacity=".75"/></g>`;
  const gull = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M-14 0 Q-7 -8 0 0 Q7 -8 14 0" stroke="#f6e7ee" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  // İznik köşe süsü: lale, karanfil ve kıvrık dallar (kobalt, turkuaz, mercan)
  const iznikCorner = (flip) => `<g transform="${flip ? `translate(${W} 0) scale(-1 1)` : ''}">
<path d="M0 0 H230 Q170 30 120 70 Q70 110 0 190Z" fill="#0f2a5a" opacity=".55"/>
<path d="M0 0 H230 Q170 30 120 70 Q70 110 0 190" stroke="#e6b85c" stroke-width="3" fill="none" opacity=".8"/>
<path d="M18 18 Q80 30 104 80 M18 18 Q30 80 80 104" stroke="#3cc6b8" stroke-width="3" fill="none"/>
<path d="M104 80 q-10 -22 4 -32 q4 10 10 4 q6 10 -4 28Z" fill="#e8425a"/>
<path d="M80 104 q-22 -4 -26 -20 q12 0 12 -8 q14 4 14 28Z" fill="#e8425a"/>
<circle cx="56" cy="40" r="10" fill="#f3f0ff" opacity=".9"/><circle cx="56" cy="40" r="4" fill="#3cc6b8"/>
<path d="M150 24 q8 -12 18 0 q-8 10 -18 0Z M34 140 q-12 -8 0 -18 q10 8 0 18Z" fill="#3cc6b8"/>
</g>`;
  // Nazar boncuğu: zincirle sarkan
  const nazar = (x, len) => `<line x1="${x}" y1="0" x2="${x}" y2="${len}" stroke="#c99a45" stroke-width="2"/><g transform="translate(${x} ${len + 20})"><circle r="20" fill="#1d4fb8"/><circle r="13" fill="#fff"/><circle r="8" fill="#6fb6ff"/><circle r="4" fill="#0b1020"/><circle cx="-6" cy="-7" r="3" fill="#fff" opacity=".7"/></g>`;
  const lamp = (x, len, c) => `<line x1="${x}" y1="0" x2="${x}" y2="${len}" stroke="#c99a45" stroke-width="2"/>
<g transform="translate(${x} ${len})" filter="url(#g)"><path d="M-8 0 H8 L14 10 Q22 28 0 50 Q-22 28 -14 10Z" fill="${c}" opacity=".9"/><path d="M-14 10 H14 M-18 24 H18" stroke="#e6b85c" stroke-width="2"/><circle cy="58" r="3" fill="#e6b85c"/></g>`;
  let water = '';
  for (let i = 0; i < 26; i++) water += `<line x1="${f(r() * W)}" y1="${f(790 + r() * 100)}" x2="${f(r() * W)}" y2="0" stroke="none"/>`;
  let ripples = '';
  for (let i = 0; i < 30; i++) {
    const x = r() * W;
    const y = 800 + r() * 90;
    ripples += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + 18 + r() * 30)}" y2="${f(y)}" stroke="#f6c9d8" stroke-width="1.5" opacity="${f(0.1 + r() * 0.2)}"/>`;
  }

  return svg(W, H, `
<defs>
${GLOW('g', 5)}
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#ff9fbf" stop-opacity="0"/><stop offset="1" stop-color="#ff9fbf" stop-opacity=".18"/></linearGradient>
<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a1f3a"/><stop offset="1" stop-color="#140713"/></linearGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#ffe6c4" stop-opacity=".4"/><stop offset="1" stop-color="#ffe6c4" stop-opacity="0"/></radialGradient>
<mask id="cres"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="1222" cy="166" r="40" fill="#000"/></mask>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
${iznikCorner(false)}${iznikCorner(true)}
<!-- Hilal ve martılar -->
<circle cx="1200" cy="180" r="130" fill="url(#halo)"/>
<circle cx="1200" cy="180" r="46" fill="#ffe9c9" mask="url(#cres)"/>
${gull(980, 260, 1.2)}${gull(1030, 236, 0.9)}${gull(560, 300, 1)}${gull(610, 280, 0.7)}
${nazar(300, 120)}${lamp(380, 70, '#e8425a')}${lamp(1320, 90, '#3cc6b8')}
<!-- Karşı kıyı (uzak, soluk) -->
<g fill="#2a1226">${houses(820, 1600, 742, 5)}<path d="M820 742 Q1100 700 1600 720 V746 H820Z"/></g>
<!-- Tarihi yarımada: saray, eski cami, büyük cami, serviler, evler -->
<g fill="#13060e">
  ${palace(20, 760)}
  ${oldMosque(400, 760, 0.9)}
  ${grandMosque(700, 760, 0.85)}
  ${houses(260, 300, 760, 7)}${houses(500, 560, 760, 8)}
  ${[250, 268, 540, 556, 880, 900].map((x) => cypress(x, 760, 70)).join('')}
  <path d="M0 760 H960 V770 H0Z"/>
  <!-- Galata tepesi -->
  <path d="M1360 770 Q1440 690 1600 700 V770Z"/>
  ${galata(1470, 700)}
  ${houses(1380, 1440, 730, 11)}${houses(1500, 1600, 712, 12)}
</g>
<g fill="#ffc96b" opacity=".75">
  ${[420, 455, 700, 735, 770, 1460, 1476, 120, 160].map((x, i) => `<rect x="${x}" y="${i > 6 ? 726 : i > 4 ? 600 : 742}" width="5" height="8" rx="2.5"/>`).join('')}
</g>
<!-- Boğaz -->
<rect y="770" width="${W}" height="130" fill="url(#sea)"/>
${ripples}
<g stroke="#ffe9c9" stroke-linecap="round" opacity=".55"><line x1="1160" y1="790" x2="1240" y2="790" stroke-width="3"/><line x1="1176" y1="808" x2="1224" y2="808" stroke-width="3"/><line x1="1188" y1="826" x2="1212" y2="826" stroke-width="2.5"/></g>
${maiden(1040, 816)}
${ship(300, 850, 0.9)}${ship(1430, 860, 0.7)}
${kayik(620, 832)}${kayik(860, 872)}${kayik(1260, 846)}
`);
}

function lokumMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}${GLOW('g', 3)}
<linearGradient id="tea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2562c"/><stop offset="1" stop-color="#8f1e12"/></linearGradient>
</defs>
<!-- Minder -->
<path d="M30 214 Q120 188 210 214 Q214 232 196 236 H44 Q26 232 30 214Z" fill="#b8243e"/>
<path d="M36 214 Q120 194 204 214" stroke="#e6b85c" stroke-width="4" fill="none"/>
<circle cx="34" cy="226" r="6" fill="#e6b85c"/><circle cx="206" cy="226" r="6" fill="#e6b85c"/>
<!-- Yeniçeri börkü: arkaya sarkan beyaz keçe + altın kaşıklık -->
<path d="M84 98 Q80 40 120 30 Q158 26 168 58 Q196 96 206 160 Q186 150 176 118 Q170 96 156 98Z" fill="#f5f0e6" stroke="#d8cfbd" stroke-width="3" stroke-linejoin="round"/>
${logo(74, 92, 92, { look: [2, 0] })}
<rect x="80" y="84" width="80" height="18" rx="9" fill="#f5f0e6" stroke="#d8cfbd" stroke-width="3"/>
<path d="M110 84 Q120 52 130 84Z" fill="#e6b85c" stroke="#b8862f" stroke-width="2"/>
<circle cx="120" cy="92" r="5" fill="#2fb5a8" stroke="#b8862f" stroke-width="2"/>
<!-- Bıyık -->
<path d="M120 148 Q106 140 96 150 Q92 156 98 158 Q104 150 120 154 Q136 150 142 158 Q148 156 144 150 Q134 140 120 148Z" fill="#2a1a12"/>
<!-- İnce belli çay bardağı -->
<g transform="translate(184 168)">
  <ellipse cx="0" cy="30" rx="20" ry="5" fill="#e6b85c"/>
  <path d="M-10 -10 Q-14 6 -5 12 Q-9 22 -8 28 H8 Q9 22 5 12 Q14 6 10 -10Z" fill="url(#tea)" stroke="#f3e8e8" stroke-width="2" opacity=".95"/>
  <path d="M-4 -18 q4 -6 0 -12 M4 -18 q4 -6 0 -12" stroke="#fff" stroke-opacity=".6" stroke-width="2" fill="none" stroke-linecap="round"/>
</g>
<!-- Lokum -->
<g transform="translate(52 190) rotate(-12)"><rect x="-11" y="-11" width="22" height="22" rx="5" fill="#f6a3c1"/><circle cx="-4" cy="-3" r="1.4" fill="#fff"/><circle cx="4" cy="4" r="1.4" fill="#fff"/></g>
`);
}

// =====================================================================
// BİNBİR GECE: ay ışığında çöl, kumullar, kervan, vaha, uzak saray
// =====================================================================

function binbirScene() {
  const camel = (x, y, s, rider = false) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#0b0817">
<path d="M-34 -2 Q-36 -22 -22 -26 Q-14 -40 -2 -26 Q6 -38 18 -24 L26 -24 Q30 -34 36 -40 Q42 -48 48 -44 L50 -38 L44 -36 Q38 -28 36 -14 Q34 -2 26 0 Z"/>
<path d="M-28 -2 L-30 26 L-25 26 L-22 0 M-12 0 L-12 26 L-7 26 L-6 0 M12 0 L14 26 L19 26 L18 -2 M24 -2 L28 26 L33 26 L30 -4"/>
${rider ? '<path d="M-8 -30 Q-10 -46 0 -48 Q10 -46 8 -30Z"/><circle cx="0" cy="-54" r="6"/>' : ''}
</g>`;
  const palm = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#0a0716">
<path d="M-4 0 Q-10 -60 6 -120 L12 -118 Q0 -60 6 0Z"/>
<path d="M8 -120 Q-30 -136 -62 -112 Q-30 -122 6 -112Z M8 -120 Q40 -142 76 -118 Q40 -126 10 -112Z M8 -122 Q-12 -152 -40 -158 Q-14 -140 4 -116Z M8 -122 Q30 -156 58 -160 Q34 -140 12 -116Z M8 -118 Q-24 -100 -46 -70 Q-18 -96 6 -110Z M8 -118 Q40 -100 58 -72 Q34 -96 10 -110Z"/>
</g>`;
  const r = rng(31);
  let sand = '';
  for (let i = 0; i < 40; i++) sand += `<circle cx="${f(r() * W)}" cy="${f(800 + r() * 90)}" r="1.2" fill="#f1d9a6" opacity="${f(0.15 + r() * 0.3)}"/>`;

  return svg(W, H, `
<defs>
${GLOW('g', 6)}
<radialGradient id="halo"><stop offset="0" stop-color="#fff0c4" stop-opacity=".5"/><stop offset="1" stop-color="#fff0c4" stop-opacity="0"/></radialGradient>
<linearGradient id="dune1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7e6a7a"/><stop offset=".25" stop-color="#3b3150"/><stop offset="1" stop-color="#1e1a36"/></linearGradient>
<linearGradient id="dune2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9b77e"/><stop offset=".18" stop-color="#9a7a62"/><stop offset=".6" stop-color="#3d2f45"/><stop offset="1" stop-color="#1f1830"/></linearGradient>
<linearGradient id="pond" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f4f7a"/><stop offset="1" stop-color="#15203d"/></linearGradient>
</defs>
<!-- Ay -->
<circle cx="1250" cy="170" r="210" fill="url(#halo)"/>
<circle cx="1250" cy="170" r="78" fill="#fff1c9"/>
<circle cx="1226" cy="152" r="12" fill="#f1e1ac"/><circle cx="1276" cy="190" r="16" fill="#f1e1ac"/><circle cx="1270" cy="142" r="7" fill="#f1e1ac"/>
<!-- Kayan yıldız -->
<path d="M420 120 L300 168" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7" filter="url(#g)"/>
<!-- Uzak saray silueti -->
<g fill="#15122c">
  <rect x="960" y="590" width="190" height="40"/>
  <path d="M1010 592 Q1010 548 1040 540 Q1070 548 1070 592Z M1080 594 Q1080 566 1100 560 Q1120 566 1120 594Z M975 594 Q975 572 990 566 Q1005 572 1005 594Z"/>
  <rect x="948" y="530" width="8" height="64"/><path d="M946 532 L952 510 L958 532Z"/><rect x="1150" y="540" width="8" height="54"/><path d="M1148 542 L1154 520 L1160 542Z"/>
  <path d="M1040 540 V524" stroke="#15122c" stroke-width="3"/>
</g>
<!-- Arka kumullar -->
<path d="M0 640 Q200 590 420 630 Q640 670 860 610 Q1080 560 1300 620 Q1460 660 1600 610 V900 H0Z" fill="url(#dune1)"/>
<!-- Kervan sırtta -->
${camel(1030, 664, 0.9, true)}${camel(1120, 652, 0.85)}${camel(1205, 646, 0.8, true)}${camel(1285, 650, 0.75)}
<!-- Ön kumullar (ay ışığı tepelerde) -->
<path d="M0 760 Q260 690 560 740 Q860 790 1120 720 Q1380 660 1600 730 V900 H0Z" fill="url(#dune2)"/>
<path d="M0 840 Q300 800 640 836 Q980 870 1280 820 Q1460 796 1600 830 V900 H0Z" fill="#1a1428" opacity=".85"/>
${sand}
<!-- Vaha (sol) -->
<ellipse cx="300" cy="790" rx="120" ry="16" fill="url(#pond)"/>
<line x1="270" y1="786" x2="330" y2="786" stroke="#fff1c9" stroke-width="2.5" opacity=".6" stroke-linecap="round"/>
${palm(210, 792, 1)}${palm(330, 796, 0.8)}${palm(400, 794, 0.6)}
`);
}

function binbirMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}${GLOW('g', 3)}
<linearGradient id="carpet" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a1f4b"/><stop offset="1" stop-color="#b8325a"/></linearGradient>
</defs>
<!-- Uçan halı -->
<path d="M18 196 Q60 180 120 196 Q180 212 222 190 L210 220 Q168 238 120 222 Q66 206 30 222Z" fill="url(#carpet)" stroke="#e8b85c" stroke-width="3" stroke-linejoin="round"/>
<path d="M40 204 Q80 194 120 206 Q164 218 198 204" stroke="#e8b85c" stroke-width="2" fill="none" stroke-dasharray="6 5"/>
<path d="M14 198 l-8 4 M16 206 l-9 3 M26 222 l-6 7 M34 224 l-4 8 M214 192 l9 -2 M210 202 l9 0 M206 222 l6 6 M198 226 l4 8" stroke="#e8b85c" stroke-width="2.5" stroke-linecap="round"/>
${logo(76, 108, 88, { look: [2, -1] })}
<!-- Sarık -->
<path d="M70 118 Q72 70 120 66 Q168 70 170 118 Q152 102 120 104 Q88 102 70 118Z" fill="#f4efe4" stroke="#d6cdb8" stroke-width="3"/>
<path d="M78 104 Q120 84 162 104 M82 92 Q120 72 158 92" stroke="#d6cdb8" stroke-width="3" fill="none"/>
<circle cx="120" cy="96" r="8" fill="#2fb5a8" stroke="#e8b85c" stroke-width="3"/>
<path d="M124 90 Q136 56 150 50 Q140 70 130 92Z" fill="#ff8fb8"/>
<!-- Parıltı izi -->
${[[226, 172, 7], [236, 150, 4], [206, 160, 4], [12, 176, 5]].map(([x, y, s]) => `<g filter="url(#g)">${sparkle(x, y, s, '#ffe8a8')}</g>`).join('')}
`);
}

// =====================================================================
// Sade temaların maskotları (sahne yok; boş odada ve ana sayfa başlığında görünür)
// =====================================================================

/** Gece: uyku başlıklı, patlamış mısırlı, yanında hilal ve yıldızlar. */
function geceMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}${GLOW('g', 3)}</defs>
<path d="M196 40 a26 26 0 1 0 22 40 a20 20 0 1 1 -22 -40Z" fill="#f4efff" filter="url(#g)"/>
${sparkle(40, 60, 8, '#fff6c8')}${sparkle(170, 30, 5, '#fff6c8')}${sparkle(60, 120, 5, '#fff6c8')}
${logo(70, 92, 100, { look: [2, -1] })}
<!-- Uyku başlığı -->
<path d="M72 106 Q74 60 120 56 Q168 58 172 84 Q186 104 204 112 Q186 122 170 104 Q150 94 72 106Z" fill="#7c5cff" stroke="#4b33b8" stroke-width="3" stroke-linejoin="round"/>
<circle cx="206" cy="113" r="10" fill="#fff"/>
<path d="M70 108 Q120 92 172 104" stroke="#fff" stroke-width="9" stroke-linecap="round" fill="none"/>
<!-- Patlamış mısır kovası -->
<g transform="translate(176 170)">
  <path d="M-22 -10 L22 -10 L16 40 L-16 40Z" fill="#fff"/>
  <path d="M-14 -10 L-10 40 M0 -10 L0 40 M14 -10 L10 40" stroke="#ff4d6d" stroke-width="6"/>
  <circle cx="-14" cy="-14" r="9" fill="#fff4d6"/><circle cx="0" cy="-20" r="10" fill="#fff4d6"/><circle cx="14" cy="-14" r="9" fill="#fff4d6"/><circle cx="-5" cy="-10" r="7" fill="#ffe7a8"/>
</g>
`);
}

/** Okyanus: şnorkel ve maske, kabarcıklar, dalga. */
function okyanusMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}</defs>
<path d="M0 212 Q30 196 60 212 T120 212 T180 212 T240 212 V240 H0Z" fill="#22c3e6" opacity=".55"/>
<path d="M0 224 Q30 208 60 224 T120 224 T180 224 T240 224 V240 H0Z" fill="#0f7fa3"/>
${logo(70, 84, 100, { look: [1, 0] })}
<!-- Dalış maskesi -->
<g transform="translate(70 84) scale(1.5625)">
  <rect x="6" y="13" width="52" height="25" rx="11" fill="#9cf0ff" fill-opacity=".28" stroke="#ffb347" stroke-width="3.5"/>
  <path d="M6 22 H-2 M58 22 H66" stroke="#2b2f42" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M14 18 Q18 15 22 17" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>
</g>
<!-- Şnorkel -->
<path d="M176 132 V60 Q176 48 188 48" stroke="#ff6f91" stroke-width="9" fill="none" stroke-linecap="round"/>
<path d="M176 132 Q176 148 158 150" stroke="#ff6f91" stroke-width="9" fill="none" stroke-linecap="round"/>
<g fill="none" stroke="#bff6ff" stroke-width="3"><circle cx="198" cy="34" r="7"/><circle cx="212" cy="16" r="5"/><circle cx="40" cy="70" r="6"/><circle cx="54" cy="46" r="4"/></g>
`);
}

/** Gün batımı: güneş gözlüğü, şemsiye, buzlu içecek. */
function gunbatimiMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}
<linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff6b4a"/></linearGradient>
</defs>
<circle cx="190" cy="62" r="36" fill="url(#sun)" opacity=".9"/>
<path d="M0 218 Q120 200 240 218 V240 H0Z" fill="#e8b27a"/>
<!-- Şemsiye -->
<line x1="44" y1="214" x2="58" y2="92" stroke="#f3e2c4" stroke-width="4"/>
<path d="M4 104 Q56 56 112 90 Q84 86 70 98 Q56 88 40 96 Q24 90 4 104Z" fill="#ff6b4a"/>
<path d="M40 96 Q48 70 58 66 M70 98 Q66 72 58 66" stroke="#fff" stroke-width="3" fill="none" opacity=".7"/>
${logo(80, 100, 96, { face: false })}
<!-- Güneş gözlüğü -->
<g transform="translate(80 100) scale(1.5)">
  <path d="M6 18 H58" stroke="#1b1446" stroke-width="3"/>
  <rect x="7" y="17" width="21" height="14" rx="6" fill="#1b1446"/><rect x="36" y="17" width="21" height="14" rx="6" fill="#1b1446"/>
  <path d="M11 21 l6 0 M40 21 l6 0" stroke="#ff9f7a" stroke-width="2" stroke-linecap="round"/>
</g>
<!-- İçecek -->
<g transform="translate(196 168)">
  <path d="M-16 -18 L16 -18 L10 30 L-10 30Z" fill="#ffb3c7" fill-opacity=".9" stroke="#fff" stroke-width="2"/>
  <line x1="6" y1="-18" x2="16" y2="-44" stroke="#22c3e6" stroke-width="4" stroke-linecap="round"/>
  <circle cx="-12" cy="-20" r="7" fill="#9be15d"/>
</g>
`);
}

/** Neon: kulaklık, neon parıltılı çerçeve, nota. */
function neonMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}${GLOW('n', 4)}</defs>
<rect x="66" y="88" width="108" height="108" rx="28" fill="none" stroke="#ff2bd6" stroke-width="4" filter="url(#n)"/>
${logo(70, 92, 100, { look: [2, -1] })}
<!-- Kulaklık -->
<path d="M62 126 Q62 60 120 60 Q178 60 178 126" stroke="#19f5a0" stroke-width="8" fill="none" stroke-linecap="round" filter="url(#n)"/>
<rect x="50" y="118" width="22" height="40" rx="10" fill="#151527" stroke="#19f5a0" stroke-width="4"/>
<rect x="168" y="118" width="22" height="40" rx="10" fill="#151527" stroke="#19f5a0" stroke-width="4"/>
<!-- Notalar -->
<g fill="#ff5ce0" filter="url(#n)">
  <path d="M200 70 V40 L222 34 V64" stroke="#ff5ce0" stroke-width="4" fill="none"/><circle cx="196" cy="72" r="6"/><circle cx="218" cy="66" r="6"/>
  <path d="M30 70 V48" stroke="#ff5ce0" stroke-width="4"/><circle cx="26" cy="72" r="6"/>
</g>
`);
}

const files = {
  'gece-maskot.svg': geceMascot(),
  'okyanus-maskot.svg': okyanusMascot(),
  'gunbatimi-maskot.svg': gunbatimiMascot(),
  'neon-maskot.svg': neonMascot(),
  'uzay.svg': uzayScene(),
  'uzay-maskot.svg': uzayMascot(),
  'siber.svg': siberScene(),
  'siber-maskot.svg': siberMascot(),
  'ortacag.svg': ortacagScene(),
  'ortacag-maskot.svg': ortacagMascot(),
  'lokum.svg': lokumScene(),
  'lokum-maskot.svg': lokumMascot(),
  'binbirgece.svg': binbirScene(),
  'binbirgece-maskot.svg': binbirMascot(),
};
for (const [name, content] of Object.entries(files)) {
  writeFileSync(new URL(name, OUT), content.replace(/\n\s*\n/g, '\n'));
  console.log(`✓ themes/${name} (${(content.length / 1024).toFixed(1)} KB)`);
}
