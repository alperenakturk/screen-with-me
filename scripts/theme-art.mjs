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
  const r = rng(11);
  let trees = '';
  for (let i = 0; i < 16; i++) {
    const tx = i * 26 + r() * 10 - 10;
    const th = 70 + r() * 70;
    const base = 860 - Math.sin(i / 3) * 10;
    trees += `<path d="M${f(tx)} ${f(base)} L${f(tx + 18)} ${f(base - th)} L${f(tx + 36)} ${f(base)}Z" fill="#0d1a17"/>`;
  }
  let stars = '';
  for (let i = 0; i < 70; i++) {
    stars += `<circle cx="${f(r() * W)}" cy="${f(r() * 520)}" r="${f(0.6 + r() * 1.3)}" fill="#fff6dc" opacity="${f(0.3 + r() * 0.6)}"/>`;
  }
  let fireflies = '';
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? r() * 420 : W - r() * 420;
    fireflies += `<circle cx="${f(side)}" cy="${f(420 + r() * 420)}" r="${f(1.5 + r() * 2)}" fill="#ffe28a" opacity="${f(0.4 + r() * 0.5)}" filter="url(#s)"/>`;
  }
  // Büyü izleri: kıvrımlı ışık çizgileri, uçlarında parıltılar
  const spell = (d, c) => `<path d="${d}" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round" opacity=".75" filter="url(#g)"/>`;
  const spells = [
    spell('M140 640 C220 560 120 500 220 430 S300 330 380 360', '#9b7bff'),
    spell('M1460 470 C1380 420 1480 360 1400 300 S1300 260 1250 300', '#5ff0d0'),
    spell('M520 140 C580 100 640 160 700 120', '#ffcf6b'),
  ].join('');
  const orbs = [[380, 360, '#c8b2ff'], [1250, 300, '#8ff7e1'], [700, 120, '#ffe08a'], [90, 520, '#c8b2ff'], [1520, 600, '#8ff7e1']]
    .map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="7" fill="${c}" filter="url(#g)"/>`).join('');
  const sparkles = [[420, 330, 10, '#e6dcff'], [230, 470, 7, '#e6dcff'], [1300, 270, 9, '#c9fff2'], [1420, 380, 6, '#c9fff2'], [740, 100, 7, '#fff1c2'], [600, 160, 5, '#fff1c2'], [120, 300, 6, '#fff1c2'], [1080, 90, 6, '#fff1c2']]
    .map(([x, y, s, c]) => sparkle(x, y, s, c, 0.9)).join('');

  return svg(W, H, `
<defs>
${GLOW('g', 6)}${GLOW('s', 2.5)}
<radialGradient id="halo"><stop offset="0" stop-color="#fff4c9" stop-opacity=".45"/><stop offset="1" stop-color="#fff4c9" stop-opacity="0"/></radialGradient>
</defs>
${stars}
<!-- Ay -->
<circle cx="1330" cy="150" r="170" fill="url(#halo)"/>
<circle cx="1330" cy="150" r="64" fill="#fff3c7"/>
<circle cx="1306" cy="134" r="10" fill="#efe0a8"/><circle cx="1350" cy="168" r="14" fill="#efe0a8"/><circle cx="1352" cy="124" r="6" fill="#efe0a8"/>
<!-- Uzak ejderha ay önünde -->
${dragon(1205, 255, 0.42, -1, { body: '#2c2346', dark: '#1d1733', belly: '#3a2f5c', wing: '#251d3d' })}
<!-- Uzak dağlar -->
<path d="M0 700 L120 610 L210 670 L330 560 L470 680 L560 620 L700 700 L860 640 L980 690 L1120 590 L1260 680 L1380 620 L1500 680 L1600 630 V900 H0Z" fill="#1b1533"/>
<!-- Sağ tepe ve kale -->
<path d="M980 900 Q1150 700 1360 730 Q1520 750 1600 700 V900Z" fill="#140f24"/>
<g fill="#0e0a1a">
  <rect x="1220" y="610" width="200" height="130"/>
  <rect x="1190" y="560" width="46" height="180"/><rect x="1404" y="570" width="46" height="170"/><rect x="1296" y="520" width="52" height="220"/>
  <path d="M1186 562 L1213 500 L1240 562Z M1400 572 L1427 514 L1454 572Z M1292 522 L1322 446 L1352 522Z"/>
  ${Array.from({ length: 9 }, (_, i) => `<rect x="${1222 + i * 22}" y="598" width="12" height="14"/>`).join('')}
</g>
<path d="M1213 500 V478 L1236 486 L1213 494 M1322 446 V420 L1348 429 L1322 438 M1427 514 V494 L1448 501 L1427 508" stroke="#d6a843" stroke-width="2.5" fill="#b0322a"/>
<g fill="#ffcf6b" filter="url(#s)">
  <rect x="1206" y="600" width="9" height="14" rx="4"/><rect x="1314" y="560" width="12" height="18" rx="6"/><rect x="1418" y="610" width="9" height="14" rx="4"/>
  <rect x="1262" y="650" width="10" height="16" rx="5"/><rect x="1360" y="660" width="10" height="16" rx="5"/>
</g>
<!-- Sol orman -->
${trees}
<!-- Uçan sevimli ejderha -->
${dragon(250, 190, 1.05, 1)}
<path d="M326 168 q14 -6 22 2 q10 -8 20 2" stroke="#ffcf6b" stroke-width="3" fill="none" stroke-linecap="round" filter="url(#s)"/>
${spells}${orbs}${sparkles}${fireflies}
`);
}

function ortacagMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}${GLOW('g', 3)}</defs>
${dragon(108, 168, 1.15, 1)}
<!-- Maskot ejderhanın sırtında, büyücü şapkasıyla -->
${logo(70, 92, 54, { look: [3, -1] })}
<path d="M66 100 Q97 96 128 100 L120 92 Q99 30 86 22 Q88 60 74 92Z" fill="#5b3cc4" stroke="#3a2490" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M62 100 Q97 108 132 100 Q97 94 62 100Z" fill="#3a2490"/>
<path d="M76 90 Q98 86 120 90" stroke="#ffcf6b" stroke-width="5" fill="none"/>
${sparkle(97, 60, 6, '#ffcf6b')}${sparkle(106, 78, 4, '#ffcf6b')}
<!-- Asa ve büyü -->
<line x1="136" y1="128" x2="170" y2="86" stroke="#8a5a2b" stroke-width="4.5" stroke-linecap="round"/>
<circle cx="172" cy="83" r="7" fill="#8ff7e1" filter="url(#g)"/>
${sparkle(194, 70, 8, '#c9fff2')}${sparkle(186, 46, 5, '#e6dcff')}${sparkle(212, 92, 4, '#c9fff2')}
`);
}

// =====================================================================
// LOKUM (Turkish Delight): İstanbul silueti, kandiller, lokumlar, laleler
// =====================================================================

function lokumScene() {
  const r = rng(23);
  const minaret = (x, base, h) => `<rect x="${x - 5}" y="${base - h}" width="10" height="${h}"/><rect x="${x - 8}" y="${base - h * 0.62}" width="16" height="5" rx="2"/><rect x="${x - 7}" y="${base - h * 0.85}" width="14" height="4" rx="2"/><path d="M${x - 5} ${base - h} L${x} ${base - h - 30} L${x + 5} ${base - h}Z"/>`;
  const mosque = (cx, base, s) => `
<path d="M${cx - 120 * s} ${base} V${base - 60 * s} H${cx + 120 * s} V${base}Z"/>
<path d="M${cx - 60 * s} ${base - 60 * s} A${60 * s} ${58 * s} 0 0 1 ${cx + 60 * s} ${base - 60 * s}Z"/>
<rect x="${cx - 2 * s}" y="${base - 140 * s}" width="${4 * s}" height="${26 * s}"/>
<path d="M${cx - 112 * s} ${base - 60 * s} A${34 * s} ${30 * s} 0 0 1 ${cx - 44 * s} ${base - 60 * s}Z M${cx + 44 * s} ${base - 60 * s} A${34 * s} ${30 * s} 0 0 1 ${cx + 112 * s} ${base - 60 * s}Z"/>
${minaret(cx - 150 * s, base, 200 * s)}${minaret(cx + 150 * s, base, 200 * s)}${minaret(cx - 132 * s, base, 150 * s)}${minaret(cx + 132 * s, base, 150 * s)}`;
  // Kandil: zincirle tepeden sarkan renkli cam
  const lamp = (x, len, c) => `
<line x1="${x}" y1="0" x2="${x}" y2="${len}" stroke="#c99a45" stroke-width="2"/>
<g transform="translate(${x} ${len})" filter="url(#g)">
  <path d="M-8 0 H8 L14 10 Q22 28 0 50 Q-22 28 -14 10Z" fill="${c}" opacity=".9"/>
  <path d="M-14 10 H14 M-18 24 H18" stroke="#e6b85c" stroke-width="2"/>
  <path d="M0 50 L0 62" stroke="#e6b85c" stroke-width="2"/><circle cy="64" r="3" fill="#e6b85c"/>
</g>`;
  const cube = (x, y, s, rot, c) => {
    let sugar = '';
    for (let i = 0; i < 6; i++) sugar += `<circle cx="${f((r() - 0.5) * s * 0.8)}" cy="${f((r() - 0.5) * s * 0.8)}" r="1.4" fill="#fff" opacity=".8"/>`;
    return `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s}" rx="${s * 0.22}" fill="${c}"/><rect x="${-s / 2}" y="${-s / 2}" width="${s}" height="${s * 0.35}" rx="${s * 0.2}" fill="#fff" opacity=".18"/>${sugar}</g>`;
  };
  const cubes = [
    [120, 300, 34, 14, '#f6a3c1'], [420, 200, 26, -18, '#bfe08e'], [1490, 330, 32, 22, '#f6a3c1'], [1180, 210, 24, -10, '#ffffff'],
    [1560, 520, 22, 8, '#bfe08e'], [80, 560, 24, -24, '#ffffff'], [1260, 520, 20, 30, '#f6a3c1'], [330, 470, 20, 12, '#f6a3c1'],
  ].map((c) => cube(...c)).join('');
  let petals = '';
  for (let i = 0; i < 18; i++) {
    const x = i % 2 ? r() * 480 : W - r() * 480;
    petals += `<ellipse cx="${f(x)}" cy="${f(100 + r() * 600)}" rx="7" ry="4" transform="rotate(${f(r() * 180)} ${f(x)} 0)" fill="#ff9fbf" opacity="${f(0.35 + r() * 0.4)}"/>`;
  }
  const tulip = (x, y, s, c) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 0 Q-4 -40 0 -70" stroke="#2e7d5b" stroke-width="5" fill="none"/><path d="M0 -20 Q-26 -30 -30 -60 Q-10 -46 0 -30Z M0 -12 Q22 -24 26 -50 Q8 -38 0 -24Z" fill="#2e7d5b"/><path d="M-14 -70 Q-16 -96 -8 -104 Q-2 -90 0 -96 Q2 -90 8 -104 Q16 -96 14 -70 Q0 -60 -14 -70Z" fill="${c}"/></g>`;

  return svg(W, H, `
<defs>
${GLOW('g', 5)}
<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f3b4a"/><stop offset="1" stop-color="#0d1a24"/></linearGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#ffe6c4" stop-opacity=".4"/><stop offset="1" stop-color="#ffe6c4" stop-opacity="0"/></radialGradient>
<mask id="cres"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="1372" cy="134" r="46" fill="#000"/></mask>
</defs>
<!-- Hilal -->
<circle cx="1350" cy="150" r="150" fill="url(#halo)"/>
<circle cx="1350" cy="150" r="54" fill="#ffe9c9" mask="url(#cres)"/>
<!-- Kandiller -->
${lamp(110, 120, '#e8425a')}${lamp(270, 70, '#2fb5a8')}${lamp(1470, 90, '#e6b85c')}${lamp(1560, 150, '#e8425a')}
${cubes}${petals}
<!-- Siluet -->
<g fill="#13060e">
  ${mosque(430, 830, 1)}
  ${mosque(1180, 830, 0.8)}
  <rect x="740" y="690" width="44" height="140"/><path d="M736 692 L762 640 L788 692Z"/><rect x="744" y="720" width="36" height="6" fill="#1d0a16"/>
  <path d="M0 830 V780 H60 V760 H120 V800 H180 V770 H250 V830Z M600 830 V790 H660 V770 H720 V830Z M820 830 V780 H880 V800 H960 V770 H1010 V830Z M1340 830 V790 H1400 V760 H1470 V800 H1540 V780 H1600 V830Z"/>
  <rect y="828" width="${W}" height="4"/>
</g>
<g fill="#ffc96b" opacity=".8">
  <rect x="380" y="800" width="6" height="10" rx="3"/><rect x="420" y="800" width="6" height="10" rx="3"/><rect x="470" y="800" width="6" height="10" rx="3"/>
  <rect x="1150" y="806" width="5" height="9" rx="2.5"/><rect x="1205" y="806" width="5" height="9" rx="2.5"/><rect x="752" y="740" width="6" height="10" rx="3"/>
</g>
<!-- Boğaz ve ay yansıması -->
<rect y="832" width="${W}" height="68" fill="url(#sea)"/>
<g stroke="#ffe9c9" stroke-linecap="round" opacity=".55"><line x1="1310" y1="846" x2="1390" y2="846" stroke-width="3"/><line x1="1326" y1="862" x2="1374" y2="862" stroke-width="3"/><line x1="1338" y1="878" x2="1362" y2="878" stroke-width="2.5"/></g>
<!-- Laleler -->
${tulip(1530, 822, 0.9, '#e8425a')}${tulip(1570, 828, 0.7, '#f08cae')}
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

const files = {
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
