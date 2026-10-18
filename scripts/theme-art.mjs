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


// ---- Art Deco temaların ortak parçaları (afiş dokusu, ışın, ışık konisi, bulut) ----

const rad = (d) => (d * Math.PI) / 180;
const BLUR = (id, std) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${std}"/></filter>`;

// Afiş dokusu: koyu ve açık iki kat ince kumlanma (eski baskı gibi).
const GRAIN_DEFS = `
<filter id="grainD" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="4" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3 0 0 0 -1.62"/></filter>
<filter id="grainL" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="9" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 .95  0 0 0 0 .85  -3 0 0 0 1.38"/></filter>`;
const grain = (o = 0.22) => `<rect width="${W}" height="${H}" filter="url(#grainD)" opacity="${o}"/><rect width="${W}" height="${H}" filter="url(#grainL)" opacity="${f(o * 0.6 * 100) / 100}"/>`;

/** Kâğıt kesik bulutun gölgesi. */
const SOFT = (color) => `<filter id="soft" x="-15%" y="-40%" width="135%" height="190%"><feDropShadow dx="4" dy="7" stdDeviation="6" flood-color="${color}" flood-opacity=".4"/></filter>`;

function star5(cx, cy, r, color, opacity = 1) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = rad(-90 + i * 36);
    const rr = i % 2 ? r * 0.42 : r;
    pts.push(`${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`);
  }
  return `<path d="M${pts.join(' L')}Z" fill="${color}" opacity="${opacity}"/>`;
}

/** Güneş ışını (sunburst): merkezden dilimler; `fill` dilimin adıma oranı. */
function rays(cx, cy, r, n, colors, { from = 0, to = 360, fill = 0.5, opacity = 1 } = {}) {
  const step = (to - from) / n;
  let s = '';
  for (let i = 0; i < n; i++) {
    const a = rad(from + i * step);
    const b = rad(from + i * step + step * fill);
    s += `<path d="M${f(cx)} ${f(cy)} L${f(cx + Math.cos(a) * r)} ${f(cy + Math.sin(a) * r)} L${f(cx + Math.cos(b) * r)} ${f(cy + Math.sin(b) * r)}Z" fill="${colors[i % colors.length]}"/>`;
  }
  return `<g opacity="${opacity}">${s}</g>`;
}

/**
 * Her sahnenin kendi tanımları (degrade, kırpma) olur; kimlikler sahne içinde tekil.
 * cone: (x, y) noktasından (tx, ty)'ye genişleyen ışık konisi (uçta yarı genişlik hw).
 */
function scene() {
  const defs = [];
  let n = 0;
  const id = (p) => `${p}${++n}`;
  return {
    defs,
    id,
    /** Gövde tamamen hesaplandıktan sonra tanımları yerleştirir (koniler tanım ekler). */
    svg(body) {
      return svg(W, H, body.replace('__DEFS__', defs.join('')));
    },
    cone(x, y, tx, ty, hw, color, a0 = 0.4, a1 = 0) {
      const g = id('cone');
      defs.push(`<linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="${x}" y1="${y}" x2="${tx}" y2="${ty}"><stop offset="0" stop-color="${color}" stop-opacity="${a0}"/><stop offset="1" stop-color="${color}" stop-opacity="${a1}"/></linearGradient>`);
      const ang = Math.atan2(ty - y, tx - x);
      const px = -Math.sin(ang) * hw;
      const py = Math.cos(ang) * hw;
      return `<path d="M${x} ${y} L${f(tx + px)} ${f(ty + py)} L${f(tx - px)} ${f(ty - py)}Z" fill="url(#${g})"/>`;
    },
    /** Kâğıt kesik bulut: tabanı düz, üstü tümsekli; arkasında kaydırılmış koyu kat (kabartma). */
    cloud(x, y, w, h, seed, { top, bottom, edge }) {
      const r = rng(seed);
      const g = id('cg');
      const cp = id('cc');
      defs.push(`<linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="0" y1="${f(y - h * 0.5)}" x2="0" y2="${f(y + h)}"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`);
      defs.push(`<clipPath id="${cp}"><rect x="${f(x - h)}" y="${f(y - h * 2)}" width="${f(w + h * 2)}" height="${f(h * 3)}"/></clipPath>`);
      const bumps = Math.max(3, Math.round(w / (h * 0.85)));
      let s = '';
      for (let i = 0; i < bumps; i++) {
        const t = (i + 0.5) / bumps;
        const br = h * (0.42 + 0.5 * Math.sin(Math.PI * t)) * (0.85 + r() * 0.3);
        s += `<circle cx="${f(x + w * t + (r() - 0.5) * h * 0.3)}" cy="${f(y + h - br)}" r="${f(br)}"/>`;
      }
      s += `<rect x="${f(x)}" y="${f(y + h * 0.5)}" width="${f(w)}" height="${f(h * 0.5)}" rx="${f(h * 0.25)}"/>`;
      return `<g filter="url(#soft)"><g clip-path="url(#${cp})"><g fill="${edge}" transform="translate(5 6)">${s}</g><g fill="url(#${g})">${s}</g></g></g>`;
    },
  };
}

/** Arkadan görülen, yüzsüz seyirci başı ve omuzları; (x, y) omuz hizası. */
function head(x, y, r, fill, rim) {
  return `<path d="M${f(x - r * 2.1)} ${f(y + r)} Q${f(x - r * 2)} ${f(y - r * 0.6)} ${f(x)} ${f(y - r * 0.7)} Q${f(x + r * 2)} ${f(y - r * 0.6)} ${f(x + r * 2.1)} ${f(y + r)}Z" fill="${fill}"/><circle cx="${f(x)}" cy="${f(y - r * 1.5)}" r="${f(r)}" fill="${fill}"${rim ? ` stroke="${rim}" stroke-width="1.4" stroke-opacity=".6"` : ''}/>`;
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
  // Gezegenlerde yüz yok (kullanıcı istemedi): krater ve bantlarla süslenir.

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
<filter id="neb" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
<radialGradient id="galaxy"><stop offset="0" stop-color="#fff2d6" stop-opacity=".9"/><stop offset=".4" stop-color="#b9a6ff" stop-opacity=".5"/><stop offset="1" stop-color="#6a4fd8" stop-opacity="0"/></radialGradient>
</defs>
<!-- Orta süsler (ana sayfada ve kenar boşluklarında görünür): bulutsu, sarmal gökada,
     halkalı küçük gezegen, uydu ve asteroit kuşağı -->
<ellipse cx="760" cy="360" rx="420" ry="120" fill="#7a5cff" opacity=".10" filter="url(#neb)"/>
<ellipse cx="900" cy="430" rx="300" ry="80" fill="#2ec5e8" opacity=".08" filter="url(#neb)"/>
<g transform="translate(800 300) rotate(-18)" opacity=".75">
  <ellipse rx="70" ry="24" fill="url(#galaxy)"/>
  <path d="M-62 4 Q-20 -26 18 -8 Q40 4 60 -4 M62 -4 Q20 26 -18 8 Q-40 -4 -60 4" stroke="#e8e0ff" stroke-opacity=".35" stroke-width="3" fill="none"/>
  <circle r="6" fill="#fff6e0" filter="url(#g)"/>
</g>
<g transform="translate(620 560)">
  <ellipse rx="44" ry="9" fill="none" stroke="#c9f2ff" stroke-opacity=".45" stroke-width="4" transform="rotate(14)"/>
  <circle r="22" fill="url(#mint)"/>
  <path d="M-42 -10 A44 9 0 0 0 42 10" fill="none" stroke="#c9f2ff" stroke-opacity=".8" stroke-width="4" transform="rotate(14)"/>
</g>
<g transform="translate(1010 640) rotate(-24)" opacity=".9">
  <rect x="-26" y="-6" width="18" height="12" fill="#5b7bd8" stroke="#a9c1ff" stroke-width="1.5"/>
  <rect x="8" y="-6" width="18" height="12" fill="#5b7bd8" stroke="#a9c1ff" stroke-width="1.5"/>
  <rect x="-8" y="-8" width="16" height="16" rx="3" fill="#e6e9f5"/>
  <path d="M0 -8 V-18" stroke="#e6e9f5" stroke-width="2"/><circle cx="0" cy="-20" r="2.5" fill="#ffd27a"/>
</g>
${Array.from({ length: 34 }, (_, i) => {
  const a = i / 33;
  const x = 380 + a * 840;
  const y = 700 - Math.sin(a * Math.PI) * 90 + ((i * 37) % 11) - 5;
  return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.5 + ((i * 13) % 5) * 0.6)}" fill="#c9bfe8" opacity="${f(0.25 + ((i * 7) % 5) * 0.08)}"/>`;
}).join('')}<!-- Üstteki süsler biraz aşağıda: üst şerit ve geniş ekranda kırpılan üst kısım kapatmasın -->
<g transform="translate(0 90)">
<!-- Hilal -->
<circle cx="146" cy="116" r="30" fill="#f6f2ff" mask="url(#cres)" filter="url(#g)"/>
<!-- Halkalı şeftali gezegen (sağ üst) -->
<g transform="rotate(-16 1390 180)">
  <ellipse cx="1390" cy="180" rx="92" ry="20" fill="none" stroke="#ffe7c4" stroke-opacity=".55" stroke-width="7"/>
</g>
<circle cx="1390" cy="180" r="50" fill="url(#peach)"/>
<g transform="rotate(-16 1390 180)"><path d="M1298 180 A92 20 0 0 0 1482 180" fill="none" stroke="#ffe7c4" stroke-opacity=".85" stroke-width="7"/></g>
<circle cx="1372" cy="166" r="9" fill="#d9785e" opacity=".55"/><circle cx="1406" cy="196" r="6" fill="#d9785e" opacity=".5"/><circle cx="1410" cy="160" r="4" fill="#d9785e" opacity=".45"/>
</g>
<!-- Mavi gezegen (sağ alt) -->
<circle cx="1470" cy="715" r="66" fill="url(#blue)"/>
<path d="M1410 690 Q1470 676 1532 694 M1406 726 Q1470 742 1534 722" stroke="#d6f0ff" stroke-opacity=".35" stroke-width="7" fill="none" stroke-linecap="round"/>
<circle cx="1446" cy="700" r="10" fill="#2f5fb8" opacity=".45"/><circle cx="1494" cy="736" r="7" fill="#2f5fb8" opacity=".4"/>
<!-- Küçük gezegenler -->
<circle cx="232" cy="352" r="21" fill="url(#pink)"/>
<circle cx="1186" cy="218" r="13" fill="url(#mint)"/>
<circle cx="1555" cy="430" r="8" fill="#ffd27a" opacity=".9"/>
<!-- Kuyruklu yıldız -->
<g transform="translate(0 100)"><path d="M566 112 L404 36 L560 104 Z" fill="url(#tail)"/>
<circle cx="566" cy="111" r="6" fill="#fff" filter="url(#g)"/></g>
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
  // Neon zeplin (sol kenarda, video izlerken de görünsün): yanında ekran, ekranda oynat işareti
  parts.push(`<g transform="translate(150 280) scale(.8)">
<path d="M-96 0 Q-96 -34 0 -36 Q96 -34 104 0 Q96 34 0 36 Q-96 34 -96 0Z" fill="#1a0f33" stroke="${CYAN}" stroke-width="2" filter="url(#n)"/>
<path d="M-96 0 L-124 -26 L-114 0 L-124 26Z" fill="#1a0f33" stroke="${CYAN}" stroke-width="2"/>
<rect x="-46" y="-20" width="92" height="40" rx="5" fill="#0b0418" stroke="${PINK}" stroke-width="2.5" filter="url(#n)"/>
<path d="M-8 -11 L12 0 L-8 11Z" fill="${PINK}" filter="url(#n)"/>
<path d="M-20 36 h40 v10 h-40Z" fill="#1a0f33" stroke="${CYAN}" stroke-width="1.5"/>
<circle cx="96" cy="0" r="3" fill="${YELLOW}" filter="url(#n)"/><circle cx="-110" cy="-14" r="2.5" fill="${PINK}" filter="url(#n)"/>
</g>`);

  // Uçan arabalar: ortada ışık izi bırakarak süzülen küçük kapsüller
  const car = (x, y, dir, color) => `<g transform="translate(${x} ${y}) scale(${dir} 1)">
<path d="M-150 2 H-18" stroke="${color}" stroke-width="2" opacity=".5" stroke-linecap="round"/>
<path d="M-110 6 H-20" stroke="${color}" stroke-width="1.2" opacity=".3" stroke-linecap="round"/>
<path d="M-20 4 Q-18 -8 0 -9 Q18 -8 22 4 Z" fill="#1a0f33" stroke="${color}" stroke-width="1.6" filter="url(#n)"/>
<rect x="-24" y="3" width="50" height="6" rx="3" fill="#1a0f33" stroke="${color}" stroke-width="1.6"/>
<circle cx="22" cy="6" r="2" fill="${YELLOW}" filter="url(#n)"/>
</g>`;
  parts.push(car(640, 330, 1, CYAN), car(1000, 280, -1, PINK), car(820, 420, 1, PINK), car(560, 470, -1, CYAN));

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
  // Yüzüklerin Efendisi havası: sisli karlı dağlar, dağa oyulmuş beyaz şehir, kulenin
  // etrafında süzülen gölge ejderha, kartallar, harabeler, dumanlı uzak tepe.
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
  const eagle = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 0 Q-20 -14 -46 -6 Q-28 -4 -14 6 Q-6 2 0 8 Q6 2 14 6 Q28 -4 46 -6 Q20 -14 0 0Z" fill="#0b1020"/>`;
  // Beyaz şehir: yedi kademeli surlar (mazgallı), kemerli kapılar, ara kuleler, en üstte
  // balkonlu ana kule ve sancak.
  const tiers = [0, 1, 2, 3, 4].map((i) => {
    const y = 760 - i * 34;
    const x1 = 1225 + i * 22;
    const x2 = 1495 - i * 22;
    const fill = ['#cfd6e4', '#c3cadb', '#b8c0d3', '#adb6cb', '#a3adc4'][i];
    let merlons = '';
    for (let mx = x1 + 2; mx < x2 - 6; mx += 10) merlons += `<rect x="${mx}" y="${y - 5}" width="5" height="5" fill="${fill}"/>`;
    const gate = `<path d="M${(x1 + x2) / 2 - 7} ${y + 30} V${y + 16} A7 7 0 0 1 ${(x1 + x2) / 2 + 7} ${y + 16} V${y + 30}Z" fill="#3a4258"/>`;
    const towers = [x1 - 6, x2 - 8].map((tx) => `<rect x="${tx}" y="${y - 14}" width="14" height="44" fill="${fill}"/><path d="M${tx - 2} ${y - 14} L${tx + 7} ${y - 26} L${tx + 16} ${y - 14}Z" fill="#8e98b0"/>`).join('');
    let windows = '';
    for (let wx = x1 + 18; wx < x2 - 18; wx += 26) windows += `<rect x="${wx}" y="${y + 9}" width="4" height="7" rx="2" fill="#ffd27a" opacity="${(wx * 7) % 3 ? 0.85 : 0.35}"/>`;
    return `${merlons}<rect x="${x1}" y="${y}" width="${x2 - x1}" height="30" fill="${fill}"/><path d="M${x1} ${y} H${x2}" stroke="#eef2fa" stroke-width="2"/>${gate}${windows}${towers}`;
  }).join('');
  const city = `
<g>
  <path d="M1180 900 L1240 640 L1330 560 L1420 620 L1520 600 L1600 660 V900Z" fill="#1c2436"/>
  ${tiers}
  <rect x="1345" y="520" width="28" height="120" fill="#e6ebf5"/>
  <path d="M1345 520 H1373 V640 H1345Z" fill="url(#tower)"/>
  <rect x="1339" y="548" width="40" height="6" rx="2" fill="#f4f6fb"/>
  ${[0, 1, 2, 3].map((i) => `<rect x="${1341 + i * 10}" y="542" width="4" height="6" fill="#f4f6fb"/>`).join('')}
  <rect x="1355" y="566" width="8" height="14" rx="4" fill="#ffd27a"/><rect x="1355" y="596" width="8" height="12" rx="4" fill="#ffd27a" opacity=".7"/>
  <path d="M1341 520 L1359 462 L1377 520Z" fill="#eef2fa"/><path d="M1359 462 L1377 520 H1366Z" fill="#c9d0e0"/>
  <path d="M1359 462 V436 L1384 444 L1359 452" stroke="#d6a843" stroke-width="2" fill="#f0f3fa"/>
</g>`;
  // Gölge ejderha: kulenin etrafında süzülen, kanatları açık koyu siluet ve dönüş izi
  const shadowDragon = `
<ellipse cx="1360" cy="500" rx="150" ry="46" fill="none" stroke="#9fb0d8" stroke-opacity=".12" stroke-width="2" stroke-dasharray="6 10"/>
<g transform="translate(1236 486) rotate(-8) scale(1.15)" fill="#04060c" opacity=".88">
  <path d="M0 0 Q18 -6 34 -2 Q46 -8 54 -4 L62 -6 L56 0 Q48 4 36 4 Q22 10 6 8 Q-14 10 -30 18 Q-46 26 -60 22 Q-44 18 -34 10 Q-20 2 0 0Z"/>
  <path d="M14 -2 Q4 -40 -30 -56 Q-14 -44 -18 -32 Q-30 -40 -44 -36 Q-28 -28 -26 -18 Q-38 -20 -46 -12 Q-24 -10 6 2Z"/>
  <path d="M24 0 Q40 -34 70 -44 Q58 -30 62 -20 Q72 -26 84 -22 Q70 -14 70 -6 Q78 -6 86 0 Q60 2 30 4Z"/>
  <path d="M54 -4 l4 -7 l2 6Z M58 -5 l6 -5 l0 6Z"/>
</g>`;
  const ruins = `<g fill="#111827" transform="translate(70 34)">
  <rect x="470" y="700" width="16" height="70"/><rect x="520" y="716" width="16" height="54"/><path d="M466 700 H540 V708 H466Z"/>
  <rect x="556" y="740" width="16" height="30"/><path d="M552 742 l10 -8 l14 6Z"/>
</g>`;

  return svg(W, H, `
<defs>
<filter id="blur" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="14"/></filter>
${GLOW('g', 5)}
<radialGradient id="halo"><stop offset="0" stop-color="#e8eeff" stop-opacity=".35"/><stop offset="1" stop-color="#e8eeff" stop-opacity="0"/></radialGradient>
<radialGradient id="ember"><stop offset="0" stop-color="#ff8a3d" stop-opacity=".55"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></radialGradient>
<linearGradient id="aurora" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5dffb0"/><stop offset=".5" stop-color="#7a8cff"/><stop offset="1" stop-color="#c77dff"/></linearGradient>
<linearGradient id="fall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe8ff"/><stop offset="1" stop-color="#cfe8ff" stop-opacity="0"/></linearGradient>
<linearGradient id="tower" x1="0" y1="0" x2="1" y2="0"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#5a6684" stop-opacity=".45"/></linearGradient>
</defs>
${stars}
<!-- Kuzey ışıkları: gökyüzünde dalgalanan soluk büyü ışığı -->
<path d="M-20 300 Q240 220 520 280 T1080 250 T1640 290" stroke="url(#aurora)" stroke-width="70" fill="none" opacity=".22" filter="url(#blur)"/>
<path d="M-20 340 Q300 280 620 330 T1240 300 T1640 330" stroke="url(#aurora)" stroke-width="40" fill="none" opacity=".16" filter="url(#blur)"/>
<!-- Ay ve kartallar biraz aşağıda (üst şerit kapatmasın) -->
<g transform="translate(0 80)">
<circle cx="140" cy="190" r="150" fill="url(#halo)"/>
<circle cx="140" cy="190" r="54" fill="#eef1fb"/>
<circle cx="122" cy="178" r="9" fill="#d9deee"/><circle cx="158" cy="204" r="12" fill="#d9deee"/>
${eagle(1040, 170, 1)}${eagle(1120, 210, 0.7)}${eagle(560, 120, 0.55)}
</g>
<!-- Uzak dağlar, dumanlı tepe ve etrafında dönen ejderha -->
${range(560, 260, 90, 3, '#2a3550', '#d9e2f2')}
<circle cx="1040" cy="330" r="70" fill="url(#ember)" opacity=".7"/>
${mist(600, 0.22)}
${range(680, 220, 110, 9, '#1d263b', '#b9c6dd')}
${mist(700, 0.18)}
<!-- Uçan ada: altından şelale akar, üstünde minik ağaç ve taş kemer -->
<g transform="translate(600 330)">
  <path d="M-10 20 Q-4 120 6 200" stroke="url(#fall)" stroke-width="10" fill="none" opacity=".75"/>
  <path d="M-90 0 Q0 -16 90 0 L40 40 L10 92 L-14 50 L-56 30Z" fill="#3a3550"/>
  <path d="M-90 0 Q0 -16 90 0 Q60 10 0 8 Q-60 10 -90 0Z" fill="#3f7a52"/>
  <path d="M30 -2 V-30" stroke="#2a2030" stroke-width="4"/><circle cx="30" cy="-38" r="13" fill="#2f6a46"/><circle cx="20" cy="-30" r="9" fill="#2f6a46"/>
  <path d="M-50 2 V-22 Q-38 -36 -26 -22 V2 H-32 V-18 Q-38 -26 -44 -18 V2Z" fill="#8e98b0"/>
  <circle cx="-38" cy="-12" r="3" fill="#8ff7e1" filter="url(#g)"/>
</g>
<!-- Büyücü kulesi (sol dağın eteğinde): mor sivri çatı, parlayan pencere -->
<g transform="translate(470 560)">
  <rect x="-12" y="0" width="24" height="120" fill="#1f2638"/>
  <path d="M-20 2 L0 -60 L20 2Z" fill="#4b2f7a"/><path d="M0 -60 L20 2 H8Z" fill="#3a2460"/>
  <path d="M0 -60 Q14 -70 10 -84" stroke="#d6a843" stroke-width="2" fill="none"/><circle cx="10" cy="-86" r="3" fill="#ffd27a" filter="url(#g)"/>
  <rect x="-4" y="22" width="8" height="12" rx="4" fill="#b98cff" filter="url(#g)"/>
  <rect x="-4" y="60" width="8" height="10" rx="4" fill="#ffd27a" opacity=".7"/>
</g>
<!-- Renkli, sevimli ejderha ortada süzülüyor (gölge ejderhanın neşeli kuzeni) -->
${dragon(930, 250, 0.65, 1, { body: '#e8746a', dark: '#b4483f', belly: '#ffd9a8', wing: '#f29a5c' })}
<!-- Kale ve ejderha sağ kenarda: video izlerken de yanda görünsün -->
<g transform="translate(150 0)">${city}${shadowDragon}</g>
${range(800, 120, 140, 21, '#141b2b', null)}
<!-- Tepe ve harabeler -->
<path d="M140 900 Q260 680 420 690 Q560 700 640 900Z" fill="#101624"/>
${ruins}
${pines}
<!-- Parlayan mantarlar ve ateş böcekleri (alt kısım, büyülü orman havası) -->
<g filter="url(#g)">
  ${[[250, 872, 1], [282, 880, 0.7], [1100, 878, 0.8], [1135, 884, 0.6], [760, 884, 0.7]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-3" y="-14" width="6" height="14" fill="#cfe8ff"/><path d="M-14 -12 Q0 -30 14 -12Z" fill="#7be0ff"/><circle cx="-5" cy="-18" r="2" fill="#fff"/></g>`).join('')}
  ${Array.from({ length: 22 }, (_, i) => `<circle cx="${f(180 + ((i * 397) % 1240))}" cy="${f(660 + ((i * 131) % 200))}" r="${f(1.6 + (i % 3) * 0.7)}" fill="#e8ff9a" opacity="${f(0.45 + (i % 4) * 0.12)}"/>`).join('')}
</g>
`);
}

function ortacagMascot() {
  // Yaşlı büyücü: geniş kenarlı sivri gri şapka, gür kaşlar, uzun beyaz sakal,
  // gri cüppe ve ucunda ışık parlayan boğumlu asa.
  return svg(240, 240, `
<defs>${LOGO_DEFS}${GLOW('g', 4)}
<linearGradient id="robe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a93a8"/><stop offset="1" stop-color="#5b6377"/></linearGradient>
<linearGradient id="beard" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9dde8"/></linearGradient>
</defs>
<!-- Taş zemin -->
<path d="M18 224 Q120 208 222 224 V238 H18Z" fill="#2a3242"/>
<!-- Asa (arkada, sağda) -->
<path d="M190 226 L184 70" stroke="#6b4a2b" stroke-width="7" stroke-linecap="round"/>
<path d="M184 82 q-8 -6 -6 -16 M186 104 q8 -4 8 -12" stroke="#6b4a2b" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M184 70 q-12 -10 -4 -24 q8 -10 16 0 q8 14 -12 24Z" fill="none" stroke="#6b4a2b" stroke-width="4"/>
<circle cx="186" cy="54" r="9" fill="#e8f4ff" filter="url(#g)"/>
${sparkle(206, 38, 7, '#e8f4ff')}${sparkle(166, 30, 4, '#e8f4ff')}
<!-- Cüppe -->
<path d="M62 150 Q50 196 44 224 H196 Q190 196 178 150Z" fill="url(#robe)"/>
<path d="M120 166 V224" stroke="#4b5266" stroke-width="2" opacity=".6"/>
<!-- El asayı tutuyor -->
<circle cx="184" cy="150" r="10" fill="#f1d3b8"/>
${logo(72, 92, 96, { look: [2, 0] })}
<!-- Gür beyaz kaşlar -->
<path d="M84 114 Q98 104 112 112 Q98 110 86 118Z M128 112 Q142 104 156 114 Q144 110 130 118Z" fill="#f4f5fa"/>
<!-- Sakal: ağzın altından dalgalı uçlarla aşağı iner (ağız görünür kalır) -->
<path d="M84 170 Q92 176 104 174 Q112 178 120 177 Q128 178 136 174 Q148 176 156 170
         Q160 192 150 208 Q146 220 132 228 Q128 214 124 226 Q120 236 116 226 Q112 214 108 228 Q94 220 90 208 Q80 192 84 170Z"
  fill="url(#beard)" stroke="#c9cedb" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M100 188 Q106 200 104 210 M120 186 Q122 200 120 216 M140 188 Q134 200 136 210" stroke="#c9cedb" stroke-width="1.5" fill="none"/>
<!-- Bıyık: ağzın iki yanından -->
<path d="M118 168 Q102 164 90 174 Q102 173 112 176Z M122 168 Q138 164 150 174 Q138 173 128 176Z" fill="#f4f5fa"/>
<!-- Sivri, geniş kenarlı gri şapka (ucu hafif bükük) -->
<path d="M50 104 Q120 86 190 104 Q170 112 120 110 Q70 112 50 104Z" fill="#6f788e"/>
<path d="M78 102 Q96 60 112 30 Q118 18 130 12 Q124 26 128 40 Q140 70 162 102 Q120 94 78 102Z" fill="#7d879e" stroke="#5c657a" stroke-width="2" stroke-linejoin="round"/>
<path d="M84 98 Q120 90 156 98" stroke="#4b5266" stroke-width="5" fill="none"/>
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
  // Karşı kıyının ve Galata tepesinin zemin eğrileri
  const farGround = (x) => 736 - 26 * Math.sin((Math.PI * (x - 820)) / 780);
  const hillGround = (x) => 700 + 70 * ((1600 - x) / 240) ** 2;
  // Evler zemin eğrisine oturur (ground sayı ya da x'e göre yükseklik veren fonksiyon) ve
  // gövdeleri aşağıya kadar iner: tepede ya da kıyıda hiçbiri havada kalmaz.
  const houses = (x0, x1, ground, seed) => {
    const rr = rng(seed);
    let s = '';
    for (let x = x0; x < x1; ) {
      const w = 26 + rr() * 26;
      const h = 24 + rr() * 34;
      const base = (typeof ground === 'function' ? Math.min(ground(x), ground(x + w)) : ground) + 2;
      s += `<path d="M${f(x)} 800 V${f(base - h)} L${f(x + w / 2)} ${f(base - h - 12)} L${f(x + w)} ${f(base - h)} V800Z"/>`;
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
  // Ayın denizdeki yansıması: ayın tam altında, aşağı doğru genişleyen titrek ışık şeritleri
  const moonPath = (cx) => {
    const rr = rng(31);
    let s = `<ellipse cx="${cx}" cy="836" rx="54" ry="66" fill="url(#halo)" opacity=".8"/>`;
    for (let i = 0; i < 14; i++) {
      const y = 778 + i * 8.5;
      const w = 12 + i * 4.4;
      const off = (rr() - 0.5) * 10;
      // Her şeridi rastgele bir yerden böl: düz merdiven değil, dalgada kırılan ışık gibi dursun
      const cut = cx - w / 2 + off + w * (0.25 + rr() * 0.5);
      const gap = 2 + rr() * 4;
      const line = (a, b) => `<line x1="${f(a)}" y1="${f(y)}" x2="${f(b)}" y2="${f(y)}" stroke="#ffe9c9" stroke-width="${f(1.6 + i * 0.12)}" stroke-linecap="round" opacity="${f(0.8 - i * 0.035)}"/>`;
      s += line(cx - w / 2 + off, cut - gap / 2) + line(cut + gap / 2, cx + w / 2 + off);
    }
    return s;
  };
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
<mask id="cres"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="1502" cy="256" r="40" fill="#000"/></mask>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
${iznikCorner(false)}${iznikCorner(true)}
<!-- Ortada soluk yıldızlar: gökyüzü boş kalmasın -->
${Array.from({ length: 70 }, () => `<circle cx="${f(r() * W)}" cy="${f(200 + r() * 420)}" r="${f(0.6 + r() * 1.3)}" fill="#ffe9c9" opacity="${f(0.2 + r() * 0.5)}"/>`).join('')}
<!-- Hilal ve martılar -->
<circle cx="1480" cy="270" r="130" fill="url(#halo)"/>
<circle cx="1480" cy="270" r="46" fill="#ffe9c9" mask="url(#cres)"/>
${gull(980, 320, 1.2)}${gull(1030, 296, 0.9)}${gull(560, 340, 1)}${gull(610, 320, 0.7)}
${nazar(110, 210)}${lamp(215, 170, '#e8425a')}${lamp(1368, 240, '#3cc6b8')}
<!-- Karşı kıyı (uzak, soluk) -->
<g fill="#2a1226">${houses(830, 1600, farGround, 5)}<path d="M820 800 ${Array.from({ length: 40 }, (_, i) => { const x = 820 + i * 20; return `L${x} ${f(farGround(x))}`; }).join(' ')} L1600 ${f(farGround(1600))} V800Z"/></g>
<!-- Tarihi yarımada: saray, eski cami, büyük cami, serviler, evler -->
<g fill="#13060e">
  ${palace(20, 760)}
  ${oldMosque(400, 760, 0.9)}
  ${grandMosque(700, 760, 0.85)}
  ${houses(260, 300, 760, 7)}${houses(500, 560, 760, 8)}
  ${[250, 268, 540, 556, 880, 900].map((x) => cypress(x, 760, 70)).join('')}
  <path d="M0 760 H960 V770 H0Z"/>
  <!-- Galata tepesi -->
  <path d="M1360 800 ${Array.from({ length: 13 }, (_, i) => { const x = 1360 + i * 20; return `L${x} ${f(hillGround(x))}`; }).join(' ')} V800Z"/>
  ${houses(1376, 1446, hillGround, 11)}${houses(1496, 1600, hillGround, 12)}
  ${galata(1470, hillGround(1470) + 2)}
</g>
<g fill="#ffc96b" opacity=".75">
  ${[420, 455, 700, 735, 770, 1460, 1476, 120, 160].map((x, i) => `<rect x="${x}" y="${i > 6 ? 726 : i > 4 ? 600 : 742}" width="5" height="8" rx="2.5"/>`).join('')}
</g>
<!-- Boğaz -->
<rect y="770" width="${W}" height="130" fill="url(#sea)"/>
${ripples}
${moonPath(1480)}
${maiden(1040, 816)}
${ship(300, 850, 0.9)}${ship(1230, 866, 0.7)}
${kayik(620, 832)}${kayik(860, 872)}${kayik(1340, 884)}
`);
}

/**
 * Lokum temasının arka plan deseni: Türk kilimi gibi tekrar eden döşeme. Basamaklı göbek
 * (madalyon), uçlarında çengeller, ortada sekiz köşeli yıldız, köşelerde yarım
 * göbekler ve ince çerçeve. Çok soluk: gözü yormaz, yakından bakınca işçilik görünür.
 */
function lokumPattern() {
  const S = 120;
  const c = S / 2;
  // Basamaklı baklava: yarıçap R, basamak st
  const stepped = (cx, cy, R, st) => {
    const pts = [];
    for (let i = 0; i <= R / st; i++) pts.push([cx + i * st, cy - R + i * st], [cx + (i + 1) * st, cy - R + i * st]);
    const q = pts.filter(([x]) => x <= cx + R);
    const right = q.map(([x, y]) => [x, y]);
    const all = [
      ...right,
      ...right.map(([x, y]) => [x, 2 * cy - y]).reverse(),
      ...right.map(([x, y]) => [2 * cx - x, 2 * cy - y]),
      ...right.map(([x, y]) => [2 * cx - x, y]).reverse(),
    ];
    return `M${all.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L')}Z`;
  };
  const star8 = (cx, cy, r) => {
    const pts = [];
    for (let i = 0; i < 16; i++) {
      const a = (Math.PI / 8) * i - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      pts.push(`${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`);
    }
    return `M${pts.join(' L')}Z`;
  };
  // Göbeğin dört ucunda çengel (koç boynuzu kıvrımı)
  const hook = (x, y, rot) => `<path transform="translate(${x} ${y}) rotate(${rot})" d="M0 0 v-7 q0 -4 4 -4 q4 0 4 4 q0 3 -3 3" fill="none" stroke="#e6b85c" stroke-width="1.6" stroke-linecap="round"/>`;
  const corner = (x, y) => `<path d="${stepped(x, y, 16, 4)}" fill="#3cc6b8" fill-opacity=".55"/><path d="${star8(x, y, 5)}" fill="#e6b85c"/>`;
  return svg(S, S, `
<g opacity=".16">
  <rect x=".75" y=".75" width="${S - 1.5}" height="${S - 1.5}" fill="none" stroke="#e6b85c" stroke-width="1" stroke-dasharray="2 4"/>
  <path d="${stepped(c, c, 36, 6)}" fill="none" stroke="#e6b85c" stroke-width="1.6"/>
  <path d="${stepped(c, c, 26, 5)}" fill="#f08cae" fill-opacity=".6"/>
  <path d="${stepped(c, c, 15, 3)}" fill="#1d4fb8" fill-opacity=".8"/>
  <path d="${star8(c, c, 9)}" fill="#e6b85c"/>
  ${hook(c, c - 38, 0)}${hook(c + 38, c, 90)}${hook(c, c + 38, 180)}${hook(c - 38, c, 270)}
  ${corner(0, 0)}${corner(S, 0)}${corner(0, S)}${corner(S, S)}
  ${[[c, 6], [c, S - 6], [6, c], [S - 6, c]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#3cc6b8"/>`).join('')}
</g>`);
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
`);
}

// =====================================================================
// BİNBİR GECE: ay ışığında çöl, kumullar, kervan, vaha, uzak saray
// =====================================================================

function binbirScene() {
  // Tek hörgüçlü deve (sağa bakar, ayaklar y=0'da), sırtında saçaklı örtü. Üst kenarlarda
  // ay ışığı çizgisi. İnsan figürü yok (düz ve yapay duruyordu).
  const INK = '#0b0817';
  const RIM = 'stroke="#e9cf98" stroke-opacity=".2" stroke-width="1.1"';
  const camel = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="${INK}">
<path d="M-27 -46 C-31 -36 -29 -27 -26 -22 L-25 0 L-20.5 0 L-21 -22 C-19 -30 -17 -40 -15 -45Z M-16 -44 L-13 -22 L-15.5 0 L-11.5 0 L-9.5 -22 L-9 -44Z M23 -44 L25 -22 L22.5 0 L26.5 0 L29 -22 L29.5 -44Z M30 -46 L34 -22 L33 0 L37 0 L37.5 -22 L36 -47Z"/>
<path d="M-34 -54 Q-41 -46 -39 -32" stroke="${INK}" stroke-width="2.2" fill="none"/>
<path d="M-34 -54 C-36 -64 -26 -68 -16 -66 C-10 -92 10 -94 16 -66 C22 -64 26 -60 30 -56 C36 -62 38 -76 42 -86 C44 -92 50 -96 56 -94 L64 -90 Q67 -86 62 -84 L55 -84 C51 -82 49 -76 47 -68 C45 -58 42 -50 36 -46 C30 -42 24 -42 18 -42 L-24 -42 C-32 -42 -34 -46 -34 -54Z" ${RIM}/>
<path d="M53 -94 l-2 -6 l5 4Z"/>
<g transform="translate(0 -14)"><path d="M-14 -54 Q1 -48 16 -54 L17 -42 Q1 -37 -15 -42Z" fill="#2a1e3c"/><path d="M-14 -42 v4 M-8 -40 v4 M-2 -39 v4 M4 -39 v4 M10 -40 v4 M16 -42 v4" stroke="#2a1e3c" stroke-width="1.4"/></g>
</g>`;
  // Develer arasındaki ip (öndekinin kuyruğundan arkadakinin başına)
  const rope = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} Q${(x1 + x2) / 2} ${Math.max(y1, y2) + 8} ${x2} ${y2}" stroke="${INK}" stroke-width="1" fill="none"/>`;
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
<!-- Ay ve kayan yıldız biraz aşağıda (üst şerit kapatmasın) -->
<g transform="translate(0 80)">
<circle cx="1475" cy="190" r="190" fill="url(#halo)"/>
<circle cx="1475" cy="190" r="70" fill="#fff1c9"/>
<circle cx="1453" cy="174" r="11" fill="#f1e1ac"/><circle cx="1498" cy="208" r="14" fill="#f1e1ac"/><circle cx="1493" cy="165" r="6" fill="#f1e1ac"/>
<path d="M200 120 L80 168" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7" filter="url(#g)"/>
</g>
<!-- Uçan halı (ortada, hafif dalgalı) -->
<g transform="translate(790 330) rotate(-6)">
  <path d="M-90 0 Q-45 -12 0 0 Q45 12 90 0 L70 34 Q25 22 -20 34 Q-60 46 -110 34Z" fill="#a8324a"/>
  <path d="M-80 8 Q-40 -2 0 9 Q40 20 80 9 M-92 26 Q-52 16 -16 27 Q26 38 66 27" stroke="#e8c27a" stroke-width="2.5" fill="none"/>
  <path d="M-58 14 l8 -6 l8 6 l-8 6Z M-6 18 l8 -6 l8 6 l-8 6Z M44 18 l8 -6 l8 6 l-8 6Z" fill="#2a5a8a"/>
  ${[-110, -100, -90].map((x, i) => `<path d="M${x + i * 2} ${34 - i * 12} l-8 4" stroke="#e8c27a" stroke-width="2"/>`).join('')}
  <path d="M90 0 l9 -3 M80 17 l9 -3 M70 34 l9 -3" stroke="#e8c27a" stroke-width="2"/>
  ${sparkle(118, -14, 6, '#fff1c9')}${sparkle(-130, 12, 4, '#fff1c9')}
</g>
<!-- Uzak saray silueti (sol kenarda) -->
<g fill="#15122c" transform="translate(-915 0)">
  <rect x="960" y="590" width="190" height="40"/>
  <path d="M1010 592 Q1010 548 1040 540 Q1070 548 1070 592Z M1080 594 Q1080 566 1100 560 Q1120 566 1120 594Z M975 594 Q975 572 990 566 Q1005 572 1005 594Z"/>
  <rect x="948" y="530" width="8" height="64"/><path d="M946 532 L952 510 L958 532Z"/><rect x="1150" y="540" width="8" height="54"/><path d="M1148 542 L1154 520 L1160 542Z"/>
  <path d="M1040 540 V524" stroke="#15122c" stroke-width="3"/>
</g>
<!-- Uzak şehir (ortada, kumulların ardında) -->
<g fill="#1b1738">
  <rect x="660" y="600" width="260" height="40"/>
  <path d="M720 602 Q720 570 745 564 Q770 570 770 602Z M800 602 Q800 556 830 548 Q860 556 860 602Z M880 602 Q880 580 896 576 Q912 580 912 602Z"/>
  <rect x="690" y="548" width="7" height="56"/><path d="M688 550 L693.5 530 L699 550Z"/><rect x="930" y="556" width="7" height="48"/><path d="M928 558 L933.5 540 L939 558Z"/>
</g>
<g fill="#ffd58a" opacity=".55"><rect x="740" y="612" width="4" height="7" rx="2"/><rect x="826" y="610" width="4" height="7" rx="2"/><rect x="890" y="614" width="4" height="7" rx="2"/></g>
<!-- Arka kumullar -->
<path d="M0 640 Q200 590 420 630 Q640 670 860 610 Q1080 560 1300 620 Q1460 660 1600 610 V900 H0Z" fill="url(#dune1)"/>
<!-- Kervan sırtta -->
<g transform="translate(285 24)">${camel(1080, 608, 0.62)}${rope(1157, 588, 1121, 560)}${camel(1180, 612, 0.6)}${rope(1256, 599, 1219, 565)}${camel(1278, 622, 0.58)}</g>

<!-- Ön kumullar (ay ışığı tepelerde) -->
<path d="M0 760 Q260 690 560 740 Q860 790 1120 720 Q1380 660 1600 730 V900 H0Z" fill="url(#dune2)"/>
<path d="M0 840 Q300 800 640 836 Q980 870 1280 820 Q1460 796 1600 830 V900 H0Z" fill="#1a1428" opacity=".85"/>
${sand}
<!-- Vaha (sol) -->
<ellipse cx="150" cy="790" rx="120" ry="16" fill="url(#pond)"/>
<line x1="120" y1="786" x2="180" y2="786" stroke="#fff1c9" stroke-width="2.5" opacity=".6" stroke-linecap="round"/>
${palm(70, 792, 1)}${palm(185, 796, 0.8)}${palm(250, 794, 0.6)}
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
// SİNEMA SARAYI (KARANLIK): makine dairesinden salona uzanan ışık huzmesi,
//    koltuk sıraları ve arkadan görülen seyirciler, yelpaze aplikler, film makarası
// =====================================================================

function sinemaScene() {
  const S = scene();
  const r = rng(41);
  S.defs.push(`
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1020"/><stop offset="1" stop-color="#05060c"/></linearGradient>
<radialGradient id="screen" gradientUnits="userSpaceOnUse" cx="800" cy="480" r="620"><stop offset="0" stop-color="#3a3048" stop-opacity=".55"/><stop offset="1" stop-color="#3a3048" stop-opacity="0"/></radialGradient>
<linearGradient id="wallL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0b0e1c"/><stop offset="1" stop-color="#151a30"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2a0"/><stop offset=".55" stop-color="#d4a23e"/><stop offset="1" stop-color="#7a521a"/></linearGradient>
<radialGradient id="sconce" cx="50%" cy="100%" r="100%"><stop offset="0" stop-color="#ffd27a" stop-opacity=".8"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
${GLOW('g', 4)}${BLUR('blur', 10)}${GRAIN_DEFS}`);

  // Yan duvar: oluklu pilastrlar ve tepede kademeli taç
  const wall = () => {
    let s = `<rect x="0" y="0" width="230" height="900" fill="url(#wallL)"/>`;
    for (let x = 18; x < 220; x += 26) s += `<rect x="${x}" y="150" width="3" height="650" fill="#d4a23e" opacity=".12"/>`;
    s += `<path d="M0 150 H230 V170 H210 V190 H0Z" fill="#1c2238"/><path d="M0 150 H230" stroke="#d4a23e" stroke-opacity=".5" stroke-width="2"/>`;
    // Yelpaze aplik
    s += `<ellipse cx="130" cy="490" rx="90" ry="110" fill="url(#sconce)" opacity=".3"/>`;
    s += rays(130, 520, 64, 9, ['#ffd27a', '#d4a23e'], { from: 200, to: 340, fill: 0.6, opacity: 0.9 });
    s += `<path d="M106 520 H154 L144 540 H116Z" fill="url(#gold)"/>`;
    return s;
  };

  // Makine dairesi penceresi, projektör silueti ve huzme
  const booth = `
<rect x="30" y="210" width="190" height="96" fill="#070912"/>
<rect x="146" y="232" width="62" height="48" fill="#fff1c8" opacity=".85" filter="url(#g)"/>
<g fill="#05060c"><circle cx="164" cy="242" r="13"/><circle cx="194" cy="246" r="11"/><rect x="150" y="252" width="56" height="22" rx="3"/><rect x="204" y="258" width="10" height="9"/></g>
<circle cx="164" cy="242" r="5" fill="#2a2a3a"/><circle cx="194" cy="246" r="4" fill="#2a2a3a"/>`;
  let dust = '';
  for (let i = 0; i < 90; i++) {
    const t = 0.08 + r() * 0.92;
    const x = 214 + t * 1386;
    const y = 262 + t * 40 + (r() - 0.5) * 2 * 250 * t * 0.85;
    dust += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.6 + r() * 1.4)}" fill="#fff6dc" opacity="${f(0.15 + r() * 0.45)}"/>`;
  }

  // Film makarası ve kıvrılan şerit (sağ duvar)
  const filmPath = 'M1480 410 C1480 470 1400 470 1400 530 C1400 590 1470 600 1450 660';
  let holes = '';
  for (let i = 0; i < 5; i++) {
    const a = rad(i * 72 - 90);
    holes += `<circle cx="${f(1480 + Math.cos(a) * 44)}" cy="${f(330 + Math.sin(a) * 44)}" r="20" fill="#0b0e1c"/>`;
  }
  const reel = `
<path d="${filmPath}" stroke="#141826" stroke-width="30" fill="none"/>
<path d="${filmPath}" stroke="#d4a23e" stroke-opacity=".75" stroke-width="22" stroke-dasharray="4 7" fill="none"/>
<path d="${filmPath}" stroke="#1d2236" stroke-width="12" fill="none"/>
<circle cx="1480" cy="330" r="82" fill="#1c2238" stroke="url(#gold)" stroke-width="8"/>
${holes}<circle cx="1480" cy="330" r="12" fill="url(#gold)"/>`;

  // Koltuk sıraları: arkadan öne büyür; birkaç başta perdeden gelen ışık
  const rows = [
    { y: 772, w: 46, h: 34, c: '#1a1e33', gap: 8, heads: [120, 330, 1050, 1420], hr: 11 },
    { y: 832, w: 60, h: 44, c: '#11142a', gap: 10, heads: [200, 560, 1290, 1500], hr: 14 },
    { y: 905, w: 78, h: 58, c: '#090b16', gap: 12, heads: [], hr: 0 },
  ];
  let seats = '';
  rows.forEach((row, ri) => {
    const curve = (x) => -(((x - 800) / 800) ** 2) * 26;
    for (const hx of row.heads) seats += head(hx, row.y - row.h + curve(hx) + 4, row.hr, '#04050a', '#6a5a80');
    for (let x = -30 + ri * 17; x < W + 30; x += row.w + row.gap) {
      const y = row.y - row.h + curve(x + row.w / 2);
      seats += `<rect x="${f(x)}" y="${f(y)}" width="${row.w}" height="${row.h + 60}" rx="${f(row.w * 0.28)}" fill="${row.c}"/><rect x="${f(x + 6)}" y="${f(y + 2)}" width="${row.w - 12}" height="2" rx="1" fill="#4a4a6a" opacity=".5"/>`;
    }
  });
  let aisle = '';
  for (const x of [252, 1348]) for (let y = 760; y < 900; y += 34) aisle += `<circle cx="${x}" cy="${y}" r="2.6" fill="#ffc96b" filter="url(#g)"/>`;

  return S.svg(`
<defs>__DEFS__</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#screen)"/>
<!-- Perde üstü kademeli altın çizgiler -->
<path d="M300 236 H1300 M330 222 H1270 M360 208 H1240" stroke="#d4a23e" stroke-opacity=".28" stroke-width="2"/>
${wall()}
<g transform="translate(${W} 0) scale(-1 1)">${wall()}</g>
${booth}
<!-- Projektör huzmesi -->
${S.cone(214, 262, 1600, 300, 270, '#fff1c8', 0.3, 0.02)}
${S.cone(214, 262, 1600, 300, 90, '#fffbe8', 0.22, 0)}
${dust}
${reel}
${seats}
${aisle}
${grain(0.24)}
`);
}

function sinemaMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}${GLOW('g', 4)}
<linearGradient id="beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff1c8" stop-opacity=".55"/><stop offset="1" stop-color="#fff1c8" stop-opacity="0"/></linearGradient>
</defs>
<path d="M30 60 L240 10 L240 150Z" fill="url(#beam)"/>
<!-- Film makarası -->
<g transform="translate(46 186)">
  <circle r="38" fill="#1c2238" stroke="#d4a23e" stroke-width="5"/>
  ${[0, 1, 2, 3, 4].map((i) => { const a = rad(i * 72 - 90); return `<circle cx="${f(Math.cos(a) * 20)}" cy="${f(Math.sin(a) * 20)}" r="9" fill="#0b0e1c"/>`; }).join('')}
  <circle r="6" fill="#d4a23e"/>
</g>
<path d="M78 206 Q120 226 170 214 Q206 206 230 222" stroke="#141826" stroke-width="18" fill="none"/>
<path d="M78 206 Q120 226 170 214 Q206 206 230 222" stroke="#d4a23e" stroke-width="12" stroke-dasharray="3 5" fill="none" opacity=".8"/>
<path d="M78 206 Q120 226 170 214 Q206 206 230 222" stroke="#1d2236" stroke-width="6" fill="none"/>
${logo(76, 84, 96, { look: [2, -1] })}
<!-- Bere (eğik) -->
<path d="M72 102 Q66 70 104 60 Q150 50 170 78 Q176 90 166 96 Q120 84 72 102Z" fill="#b8283a" stroke="#7a1020" stroke-width="3" stroke-linejoin="round"/>
<path d="M120 58 l4 -12" stroke="#7a1020" stroke-width="5" stroke-linecap="round"/>
`);
}

// =====================================================================
// OPERA GECESİ (orta): iki yanda üç kat altın yaldızlı localar, ortada koyu
//    kadife perde ve kristal avize, en altta orkestra çukuru ışıkları
// =====================================================================

function operaScene() {
  const S = scene();
  S.defs.push(`
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f3638"/><stop offset=".6" stop-color="#0a2628"/><stop offset="1" stop-color="#051516"/></linearGradient>
<linearGradient id="fold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="64" y2="0" spreadMethod="repeat"><stop offset="0" stop-color="#3e0a14"/><stop offset=".55" stop-color="#6e1826"/><stop offset=".68" stop-color="#7e2030"/><stop offset="1" stop-color="#3e0a14"/></linearGradient>
<radialGradient id="stageGlow" gradientUnits="userSpaceOnUse" cx="800" cy="620" r="520"><stop offset="0" stop-color="#ffcf8a" stop-opacity=".28"/><stop offset="1" stop-color="#ffcf8a" stop-opacity="0"/></radialGradient>
<linearGradient id="crimson" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a42838"/><stop offset="1" stop-color="#5a1220"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe6a6"/><stop offset=".5" stop-color="#d9a94a"/><stop offset="1" stop-color="#8a5a1c"/></linearGradient>
<radialGradient id="boxGlow" cx="50%" cy="100%" r="90%"><stop offset="0" stop-color="#ffb860" stop-opacity=".45"/><stop offset="1" stop-color="#ffb860" stop-opacity="0"/></radialGradient>
<radialGradient id="chand" gradientUnits="userSpaceOnUse" cx="800" cy="240" r="240"><stop offset="0" stop-color="#ffe6a6" stop-opacity=".4"/><stop offset="1" stop-color="#ffe6a6" stop-opacity="0"/></radialGradient>
${GLOW('g', 3)}${GRAIN_DEFS}`);

  const boxes = () => {
    let s = `<rect x="0" y="120" width="290" height="700" fill="#0a2224"/>`;
    for (let lvl = 0; lvl < 3; lvl++) {
      const y = 330 + lvl * 165;
      const w = 200 + lvl * 28;
      s += `<rect x="0" y="${y - 120}" width="${w - 6}" height="120" fill="#2a120e"/><rect x="0" y="${y - 120}" width="${w - 6}" height="120" fill="url(#boxGlow)"/>`;
      for (const hx of [w * 0.32, w * 0.66]) s += head(hx, y - 8, 10, '#120604', '#ffb860');
      s += `<path d="M0 ${y - 120} H${w - 6} V${y - 98} Q${(w - 6) / 2} ${y - 66} 0 ${y - 98}Z" fill="#7a1a28"/><path d="M${w - 6} ${y - 98} Q${(w - 6) / 2} ${y - 66} 0 ${y - 98}" stroke="#d9a94a" stroke-width="2" fill="none"/>`;
      s += `<rect x="${w - 12}" y="${y - 126}" width="12" height="132" fill="url(#gold)"/>`;
      s += `<path d="M0 ${y} H${w} Q${w + 24} ${y + 27} ${w} ${y + 54} H0Z" fill="url(#crimson)"/>`;
      s += `<path d="M0 ${y} H${w} Q${w + 24} ${y + 27} ${w} ${y + 54} H0" stroke="url(#gold)" stroke-width="4" fill="none"/>`;
      for (let fx = 28; fx < w - 8; fx += 46) s += rays(fx, y + 46, 24, 7, ['#e8c06a'], { from: 180, to: 360, fill: 0.5, opacity: 0.85 });
    }
    return s;
  };

  let swags = '';
  for (let i = 0; i < 4; i++) {
    const x0 = 250 + i * 275;
    swags += `<path d="M${x0} 236 Q${x0 + 137} 330 ${x0 + 275} 236Z" fill="url(#crimson)"/><path d="M${x0} 236 Q${x0 + 137} 330 ${x0 + 275} 236" stroke="url(#gold)" stroke-width="4" fill="none"/>`;
  }

  // Kristal avize: zincir, üç halka, sarkan damlalar ve mumlar
  let drops = '';
  const ring = (cy, rx, step, len) => {
    let s = `<ellipse cx="800" cy="${cy}" rx="${rx}" ry="${f(rx * 0.16)}" fill="none" stroke="url(#gold)" stroke-width="4"/>`;
    for (let x = -rx + step / 2; x < rx; x += step) {
      const yy = cy + Math.sqrt(Math.max(0, 1 - (x / rx) ** 2)) * rx * 0.16;
      s += `<line x1="${f(800 + x)}" y1="${f(yy)}" x2="${f(800 + x)}" y2="${f(yy + len)}" stroke="#fff4d6" stroke-opacity=".8" stroke-width="1.5"/><circle cx="${f(800 + x)}" cy="${f(yy + len + 3)}" r="3" fill="#fff4d6" filter="url(#g)"/>`;
      s += `<rect x="${f(800 + x - 1.5)}" y="${f(cy - rx * 0.16 - 14)}" width="3" height="10" fill="#fff4d6" opacity=".7"/><circle cx="${f(800 + x)}" cy="${f(cy - rx * 0.16 - 17)}" r="2.4" fill="#ffd27a" filter="url(#g)"/>`;
    }
    return s;
  };
  drops += ring(276, 100, 20, 26) + ring(232, 66, 22, 20) + ring(196, 34, 17, 14);

  let pit = '';
  for (let x = 300; x <= 1300; x += 50) pit += `<path d="M${x - 9} 838 H${x + 9} L${x + 5} 828 H${x - 5}Z" fill="#d9a94a" opacity=".7"/><ellipse cx="${x}" cy="842" rx="16" ry="4" fill="#ffd27a" opacity=".35" filter="url(#g)"/>`;

  return S.svg(`
<defs>__DEFS__</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<!-- Sahne perdesi (orta, koyu ve sakin) -->
<rect x="240" y="236" width="1120" height="560" fill="url(#fold)"/>
<rect x="240" y="236" width="1120" height="560" fill="url(#stageGlow)"/>
<rect x="240" y="784" width="1120" height="10" fill="url(#gold)"/>
${swags}
<path d="M240 236 H1360" stroke="url(#gold)" stroke-width="6"/>
<!-- Büyük altın kemer -->
<path d="M240 800 V330 Q240 150 800 140 Q1360 150 1360 330 V800" fill="none" stroke="#d9a94a" stroke-opacity=".5" stroke-width="5"/>
<!-- Localar -->
${boxes()}
<g transform="translate(${W} 0) scale(-1 1)">${boxes()}</g>
<!-- Avize -->
<rect width="${W}" height="${H}" fill="url(#chand)"/>
<line x1="800" y1="0" x2="800" y2="176" stroke="#d9a94a" stroke-width="3"/>
${drops}
<!-- Orkestra çukuru -->
<rect x="0" y="800" width="${W}" height="100" fill="#041011"/>
<rect x="0" y="800" width="${W}" height="5" fill="url(#gold)"/>
${pit}
${grain(0.22)}
`);
}

function operaMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}${GLOW('g', 3)}
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe6a6"/><stop offset="1" stop-color="#b8862f"/></linearGradient>
</defs>
<path d="M0 208 Q60 196 120 210 Q180 196 240 208 V240 H0Z" fill="#7a1a28"/>
<path d="M0 208 Q60 196 120 210 Q180 196 240 208" stroke="#d9a94a" stroke-width="4" fill="none"/>
${logo(70, 96, 100, { look: [2, -1] })}
<!-- Tüylü altın taç bandı -->
<rect x="70" y="100" width="100" height="10" rx="5" fill="url(#gold)"/>
<circle cx="146" cy="104" r="9" fill="#2fb5a8" stroke="url(#gold)" stroke-width="3"/>
<path d="M150 98 Q160 52 196 34 Q182 64 172 92 Q188 72 206 68 Q186 90 160 104Z" fill="#3ab0a8" stroke="#1f6e68" stroke-width="2" stroke-linejoin="round"/>
<!-- Sapli opera dürbünü -->
<g transform="translate(46 168) rotate(-14)">
  <circle cx="-12" cy="0" r="11" fill="#1a2a2c" stroke="url(#gold)" stroke-width="4"/><circle cx="14" cy="0" r="11" fill="#1a2a2c" stroke="url(#gold)" stroke-width="4"/>
  <rect x="-2" y="-3" width="4" height="6" fill="url(#gold)"/><line x1="14" y1="11" x2="22" y2="48" stroke="url(#gold)" stroke-width="4" stroke-linecap="round"/>
  <circle cx="-15" cy="-3" r="3" fill="#fff" opacity=".6"/><circle cx="11" cy="-3" r="3" fill="#fff" opacity=".6"/>
</g>
${sparkle(206, 150, 7, '#ffe6a6')}${sparkle(30, 70, 6, '#ffe6a6')}
`);
}

// =====================================================================
// AÇIK HAVA SİNEMASI (KARANLIK gece): sağda büyük perde, soldan uzanan
//    projektör huzmesi, arkadan görülen eski arabalar, ışıklı tabela direği
// =====================================================================

function acikhavaScene() {
  const S = scene();
  const r = rng(55);
  S.defs.push(`
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070618"/><stop offset=".55" stop-color="#1a1340"/><stop offset=".82" stop-color="#4a2352"/><stop offset="1" stop-color="#1a0f2a"/></linearGradient>
<linearGradient id="scr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2d0"/><stop offset="1" stop-color="#f0a08a"/></linearGradient>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140e2a"/><stop offset="1" stop-color="#07050f"/></linearGradient>
<mask id="cres"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="1254" cy="244" r="24" fill="#000"/></mask>
${GLOW('g', 4)}${GLOW('g2', 14)}${GRAIN_DEFS}`);

  let stars = '';
  for (let i = 0; i < 130; i++) stars += `<circle cx="${f(r() * W)}" cy="${f(r() * 680)}" r="${f(0.5 + r() * 1.2)}" fill="#fff" opacity="${f(0.2 + r() * 0.6)}"/>`;
  stars += [[420, 250, 7], [980, 210, 6], [700, 420, 5], [1120, 380, 5]].map(([x, y, s]) => sparkle(x, y, s, '#fff2d0', 0.8)).join('');

  // Perde: kademeli deco çerçeve, iskelet ayaklar
  const screen = `
<g stroke="#2a1f44" stroke-width="6"><line x1="1380" y1="520" x2="1360" y2="760"/><line x1="1560" y1="520" x2="1580" y2="760"/><line x1="1370" y1="640" x2="1570" y2="700"/><line x1="1370" y1="700" x2="1570" y2="640"/></g>
<path d="M1336 520 V310 H1376 V292 H1420 V276 H1520 V292 H1564 V310 H1604 V520Z" fill="#1c1434"/>
${star5(1470, 300, 14, '#ffd27a')}
<rect x="1352" y="326" width="236" height="178" fill="url(#scr)" filter="url(#g2)" opacity=".95"/>
<clipPath id="scrc"><rect x="1352" y="326" width="236" height="178"/></clipPath>
<g clip-path="url(#scrc)">${rays(1470, 504, 220, 16, ['#fff8e6'], { from: 180, to: 360, fill: 0.5, opacity: 0.25 })}</g>`;

  // Makine dairesi ve tabela direği (sol)
  let bulbs = '';
  for (let y = 400; y < 740; y += 22) bulbs += `<circle cx="38" cy="${y}" r="3" fill="#ffd27a" filter="url(#g)"/><circle cx="92" cy="${y}" r="3" fill="#ffd27a" filter="url(#g)"/>`;
  const sign = `
<path d="M34 760 V400 L50 380 V360 L65 340 L80 360 V380 L96 400 V760Z" fill="#1c1434" stroke="#ff8a6b" stroke-width="2"/>
${[450, 520, 590, 660].map((y) => `<path d="M48 ${y} L65 ${y + 18} L82 ${y}" stroke="#ff8a6b" stroke-width="5" fill="none" filter="url(#g)"/>`).join('')}
${bulbs}
${star5(65, 318, 22, '#ffd27a')}
<path d="M120 760 V676 H140 V660 H230 V676 H250 V760Z" fill="#170f2c"/>
<rect x="226" y="690" width="22" height="18" fill="#fff1c8" filter="url(#g)"/>`;

  // Arkadan görülen 50'ler arabası: kanatçıklar, kırmızı stop lambaları
  const car = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
<ellipse cx="0" cy="2" rx="66" ry="5" fill="#000" opacity=".4"/>
<path d="M-64 0 L-66 -28 L-62 -42 L-40 -44 L-30 -66 Q0 -74 30 -66 L40 -44 L62 -42 L66 -28 L64 0Z" fill="#0d0a1c"/>
<path d="M-62 -42 L-58 -54 L-44 -44Z M62 -42 L58 -54 L44 -44Z" fill="#0d0a1c"/>
<path d="M-26 -62 Q0 -68 26 -62 L33 -46 H-33Z" fill="#3a2a5a" opacity=".85"/>
<rect x="-60" y="-14" width="120" height="4" rx="2" fill="#8a86a8" opacity=".7"/>
<ellipse cx="-52" cy="-30" rx="7" ry="5" fill="#ff3b3b" filter="url(#g)"/><ellipse cx="52" cy="-30" rx="7" ry="5" fill="#ff3b3b" filter="url(#g)"/>
</g>`;
  const cars = [380, 560, 740, 920, 1100, 1280].map((x) => car(x, 790, 0.62)).join('')
    + [300, 620, 980, 1300].map((x) => car(x, 842, 0.95)).join('')
    + [150, 1460].map((x) => car(x, 905, 1.45)).join('');

  // Direkler arasında ampul zinciri
  let garland = '';
  const gpath = (x1, y1, x2, y2, sag) => {
    let s = `<path d="M${x1} ${y1} Q${(x1 + x2) / 2} ${Math.max(y1, y2) + sag} ${x2} ${y2}" stroke="#2a1f44" stroke-width="1.5" fill="none"/>`;
    for (let t = 0.05; t < 1; t += 0.07) {
      const cx = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * ((x1 + x2) / 2) + t * t * x2;
      const cy = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * (Math.max(y1, y2) + sag) + t * t * y2;
      s += `<circle cx="${f(cx)}" cy="${f(cy + 4)}" r="2.6" fill="${Math.round(t * 14) % 2 ? '#ffd27a' : '#ff8a6b'}" filter="url(#g)"/>`;
    }
    return s;
  };
  garland += gpath(96, 420, 800, 560, 40) + gpath(800, 560, 1336, 470, 30);

  return S.svg(`
<defs>__DEFS__</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
${stars}
<circle cx="1240" cy="250" r="26" fill="#fff2d0" mask="url(#cres)"/>
<path d="M0 712 Q200 676 420 700 Q700 730 960 690 Q1200 660 1600 704 V760 H0Z" fill="#120c26"/>
<!-- Projektör huzmesi soldan perdeye -->
${S.cone(248, 699, 1470, 415, 100, '#fff1c8', 0.22, 0.06)}
${screen}
${sign}
${garland}
<rect x="0" y="752" width="${W}" height="148" fill="url(#ground)"/>
${cars}
${grain(0.24)}
`);
}

function acikhavaMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}${GLOW('g', 4)}
<linearGradient id="car" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a6b"/><stop offset="1" stop-color="#b8322a"/></linearGradient>
</defs>
${sparkle(30, 40, 7, '#fff2d0')}${sparkle(210, 60, 5, '#fff2d0')}
${logo(70, 70, 100, { face: false })}
<!-- Kırmızı-mavi 3B gözlük -->
<g transform="translate(70 70) scale(1.5625)">
  <path d="M4 18 H60" stroke="#f4efe4" stroke-width="3"/>
  <rect x="7" y="15" width="22" height="16" rx="3" fill="#ff3b4a" fill-opacity=".85" stroke="#f4efe4" stroke-width="2.5"/>
  <rect x="35" y="15" width="22" height="16" rx="3" fill="#2ec5e8" fill-opacity=".85" stroke="#f4efe4" stroke-width="2.5"/>
</g>
<!-- Arabanın önü: logo arabada oturuyor -->
<path d="M14 196 Q16 160 50 156 L190 156 Q224 160 226 196 V222 H14Z" fill="url(#car)"/>
<path d="M40 156 L64 132 H176 L200 156" fill="#9fd8ff" fill-opacity=".35" stroke="#f4efe4" stroke-width="3"/>
<rect x="70" y="190" width="100" height="18" rx="6" fill="#3a1010"/>
${[82, 98, 114, 130, 146].map((x) => `<rect x="${x}" y="193" width="10" height="12" rx="2" fill="#c9c4d8"/>`).join('')}
<circle cx="40" cy="190" r="12" fill="#fff2d0" filter="url(#g)"/><circle cx="200" cy="190" r="12" fill="#fff2d0" filter="url(#g)"/>
<rect x="10" y="220" width="220" height="8" rx="4" fill="#c9c4d8"/>
`);
}

// =====================================================================
// TRANSATLANTİK (şafak, aydınlık): sağda yükselen dev gemi burnu, kırmızı
//    bacalar, solda ufuktan doğan güneş ve ışınlar, kâğıt bulutlar, martılar
// =====================================================================

function gemiScene() {
  const S = scene();
  const r = rng(97);
  S.defs.push(`
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#24425e"/><stop offset=".42" stop-color="#6a8aa0"/><stop offset=".72" stop-color="#f0c08a"/><stop offset=".82" stop-color="#f7dcae"/></linearGradient>
<radialGradient id="fadeG" gradientUnits="userSpaceOnUse" cx="190" cy="740" r="1300"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
<mask id="fade"><rect width="${W}" height="${H}" fill="url(#fadeG)"/></mask>
<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a8290"/><stop offset="1" stop-color="#143843"/></linearGradient>
<linearGradient id="hull" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0c1622"/><stop offset=".4" stop-color="#1c2c40"/><stop offset="1" stop-color="#2a3e56"/></linearGradient>
<linearGradient id="white" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff6e6"/><stop offset="1" stop-color="#cfc6b8"/></linearGradient>
<linearGradient id="funnel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8584a"/><stop offset="1" stop-color="#9a2a22"/></linearGradient>
<radialGradient id="sun" cx="50%" cy="60%" r="60%"><stop offset="0" stop-color="#fffbea"/><stop offset="1" stop-color="#ffc77a"/></radialGradient>
${SOFT('#5a3a30')}${GLOW('g', 6)}${GRAIN_DEFS}`);

  const cloudC = { top: '#f2d6b8', bottom: '#b8907a', edge: '#7a5a50' };
  const clouds = [[10, 430, 320, 60, 11], [110, 370, 210, 40, 12], [540, 300, 240, 38, 13], [880, 360, 200, 34, 14], [1000, 250, 180, 30, 15]]
    .map(([x, y, w, h, s]) => S.cloud(x, y, w, h, s, cloudC)).join('');
  const gull = (x, y, s) => `<path transform="translate(${x} ${y}) scale(${s})" d="M-16 0 Q-8 -9 0 0 Q8 -9 16 0" stroke="#24364a" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;

  let sea = '';
  for (let i = 0; i < 18; i++) {
    const y = 748 + i * 8;
    const w = 40 + i * 14;
    sea += `<line x1="${f(190 - w / 2 + (r() - 0.5) * 30)}" y1="${y}" x2="${f(190 + w / 2 + (r() - 0.5) * 30)}" y2="${y}" stroke="#fff2d4" stroke-width="2.2" opacity="${f(0.75 - i * 0.035)}" stroke-dasharray="${f(14 + r() * 24)} ${f(6 + r() * 12)}"/>`;
  }
  for (let i = 0; i < 36; i++) {
    const x = r() * W;
    const y = 750 + r() * 140;
    sea += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + 20 + r() * 40)}" y2="${f(y)}" stroke="#bfe6ea" stroke-width="1.5" opacity="${f(0.15 + r() * 0.3)}"/>`;
  }

  // Gemi: aşağıdan bakılan dev burun. Pruva öne yatık; güverte ve su hattı sağa doğru
  // birbirine yaklaşır (gemi uzaklaşıyor gibi), lomboz sıraları da aynı çizgilerde.
  const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  let portholes = '';
  for (const [from, to, o] of [[[1352, 444], [1600, 500], 0.85], [[1362, 560], [1600, 598], 0.6], [[1368, 680], [1600, 700], 0.45]]) {
    for (let i = 0; i < 12; i++) {
      const t = 0.06 + (i / 12) ** 1.15 * 0.94;
      const [x, y] = lerp(from, to, t);
      portholes += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(4.2 - t * 1.6)}" fill="#ffe2a8" opacity="${o}"/>`;
    }
  }
  const ship = `
<path d="M1500 262 L1494 150 Q1520 142 1548 150 L1552 262Z" fill="url(#funnel)"/><path d="M1494 150 Q1520 142 1548 150 L1547 172 Q1520 166 1495 172Z" fill="#141a22"/>
<path d="M1580 262 L1576 170 Q1596 164 1610 170 V262Z" fill="url(#funnel)"/><path d="M1576 170 Q1596 164 1610 170 V190 Q1596 186 1577 192Z" fill="#141a22"/>
<path d="M1426 360 V306 H1466 V266 H1600 V400Z" fill="url(#white)"/>
${Array.from({ length: 7 }, (_, i) => `<rect x="${1474 + i * 18}" y="280" width="10" height="8" rx="2" fill="#2a3a4a"/><rect x="${1436 + i * 22}" y="320" width="12" height="8" rx="2" fill="#2a3a4a"/>`).join('')}
<path d="M1372 882 Q1340 600 1316 318 L1600 392 V852Z" fill="url(#hull)"/>
<path d="M1316 318 L1600 392 V408 L1318 336Z" fill="url(#white)"/>
<path d="M1372 882 Q1340 600 1316 318" stroke="#ffe2b8" stroke-width="3" fill="none" opacity=".75"/>
<path d="M1368 852 L1600 826 V852 L1372 882Z" fill="#b8322a"/>
${portholes}
<g transform="translate(1348 400)" fill="none" stroke="#ffe2b8" stroke-width="3" opacity=".8"><circle cx="0" cy="-12" r="4"/><line x1="0" y1="-8" x2="0" y2="14"/><line x1="-8" y1="-2" x2="8" y2="-2"/><path d="M-10 6 Q0 18 10 6"/></g>
<path d="M1300 888 Q1330 862 1372 874 Q1400 864 1430 880 Q1370 896 1300 888Z" fill="#f4fbfa" opacity=".85"/>
<path d="M1250 894 Q1290 880 1330 892" stroke="#f4fbfa" stroke-width="3" fill="none" opacity=".6"/>`;

  const sail = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#24364a"><path d="M-14 0 H14 L10 5 H-10Z"/><path d="M0 -2 V-30 L12 -4Z"/><path d="M-2 -4 V-24 L-10 -4Z" opacity=".7"/></g>`;

  return S.svg(`
<defs>__DEFS__</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<g mask="url(#fade)">${rays(190, 740, 1700, 44, ['#fff2d4', '#f7cf8e'], { from: 180, to: 360, fill: 0.5, opacity: 0.38 })}</g>
<circle cx="190" cy="742" r="96" fill="url(#sun)" filter="url(#g)"/>
${clouds}
${gull(700, 420, 1.2)}${gull(760, 396, 0.9)}${gull(1050, 470, 1)}${gull(460, 520, 0.8)}${gull(1180, 300, 1.1)}
<rect x="0" y="740" width="${W}" height="160" fill="url(#sea)"/>
${sea}
${sail(640, 742, 0.9)}${sail(980, 744, 0.7)}
${ship}
${grain(0.2)}
`);
}

function gemiMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}</defs>
<path d="M0 214 Q30 202 60 214 T120 214 T180 214 T240 214 V240 H0Z" fill="#3a8290"/>
<path d="M0 226 Q30 214 60 226 T120 226 T180 226 T240 226 V240 H0Z" fill="#143843"/>
<path d="M200 60 l-12 -6 M206 70 l-14 0" stroke="#24364a" stroke-width="2.5" stroke-linecap="round"/>
${logo(70, 100, 100, { look: [2, -1] })}
<!-- Kaptan şapkası -->
<path d="M70 108 Q66 72 120 66 Q176 70 172 104 Q152 96 120 98 Q88 98 70 108Z" fill="#fbf8f2" stroke="#d8d2c4" stroke-width="2.5"/>
<path d="M72 104 Q120 92 170 102 L170 112 Q120 102 72 114Z" fill="#141a22"/>
<path d="M76 116 Q120 102 166 112 Q150 126 120 124 Q92 124 76 116Z" fill="#1e2630"/>
<g transform="translate(120 86)" fill="none" stroke="#d9a94a" stroke-width="2.5"><circle cy="-6" r="2.5"/><line y1="-3" y2="7"/><line x1="-5" y1="0" x2="5" y2="0"/><path d="M-6 4 Q0 10 6 4"/></g>
<!-- Can simidi -->
<g transform="translate(196 186)">
  <circle r="28" fill="none" stroke="#f4efe4" stroke-width="14"/>
  <circle r="28" fill="none" stroke="#e8584a" stroke-width="14" stroke-dasharray="22 22"/>
</g>
`);
}

// =====================================================================
// GECE EKSPRESİ / ŞEHİR EKSPRESİ (KARANLIK): sağdan gelen aerodinamik deco lokomotif,
//     farının huzmesi, kemerli viyadük, uzak şehir ışıkları; solda saat kulesi ve sinyal
//     ('a') ya da kemer taçlı gökdelen ve radyo direği ('c'). İki ayrı tema.
// =====================================================================

function trenScene(variant) {
  const S = scene();
  const r = rng(101);
  S.defs.push(`
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#05070f"/><stop offset=".62" stop-color="#0e1428"/><stop offset=".85" stop-color="#1e2444"/></linearGradient>
<linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a6a8e"/><stop offset=".35" stop-color="#2e3a5a"/><stop offset="1" stop-color="#141a2e"/></linearGradient>
<linearGradient id="steam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a92b0" stop-opacity=".35"/><stop offset="1" stop-color="#8a92b0" stop-opacity="0"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2d68c"/><stop offset="1" stop-color="#a8822c"/></linearGradient>
${GLOW('g', 4)}${GLOW('g2', 10)}${BLUR('blur', 12)}${GRAIN_DEFS}`);

  let stars = '';
  for (let i = 0; i < 110; i++) stars += `<circle cx="${f(r() * W)}" cy="${f(r() * 640)}" r="${f(0.5 + r() * 1.1)}" fill="#fff" opacity="${f(0.2 + r() * 0.6)}"/>`;

  // Uzak şehir: alçak bloklar, birkaç sarı pencere
  let city = '';
  for (let x = 0; x < W;) {
    const w = 24 + r() * 50;
    const h = 20 + r() * 70;
    city += `<rect x="${f(x)}" y="${f(770 - h)}" width="${f(w)}" height="${f(h)}" fill="#141a32"/>`;
    for (let k = 0; k < 3; k++) if (r() < 0.6) city += `<rect x="${f(x + 4 + r() * (w - 10))}" y="${f(770 - h + 6 + r() * (h - 12))}" width="3" height="4" fill="#ffd27a" opacity="${f(0.4 + r() * 0.4)}"/>`;
    x += w + 2;
  }

  // Viyadük: güverte ve kemerler
  let arches = '';
  for (let x = -40; x < W; x += 120) arches += `<path d="M${x + 14} 900 V866 A46 40 0 0 1 ${x + 106} 866 V900Z" fill="#0a0e1e"/>`;

  // Lokomotif: torpido burun, üç altın hız çizgisi, aydınlık kabin, far
  const loco = `
<ellipse cx="1560" cy="560" rx="120" ry="36" fill="#8a92b0" opacity=".18" filter="url(#blur)"/>
<ellipse cx="1600" cy="510" rx="140" ry="40" fill="#8a92b0" opacity=".12" filter="url(#blur)"/>
<path d="M1346 802 Q1340 712 1414 664 Q1486 620 1600 616 V802Z" fill="url(#body)"/>
<path d="M1352 750 Q1366 690 1420 668 Q1490 630 1600 626" stroke="#a8b4d0" stroke-width="2.5" fill="none" opacity=".6"/>
${[728, 744, 760].map((y, i) => `<path d="M${1352 + i * 2} ${y} Q${1420} ${y - 30 + i * 4} ${1600} ${y - 40 + i * 8}" stroke="url(#gold)" stroke-width="5" fill="none"/>`).join('')}
<path d="M1352 792 L1396 760 L1352 774Z" fill="url(#gold)" opacity=".9"/>
<path d="M1512 646 Q1550 636 1600 634 V662 H1508Z" fill="#ffe2a0" filter="url(#g)"/>
<rect x="1370" y="782" width="230" height="20" fill="#0c1020"/>
${[1430, 1500, 1570].map((x) => `<circle cx="${x}" cy="802" r="18" fill="#0a0d18" stroke="#6a7090" stroke-width="2"/>`).join('')}
<circle cx="1362" cy="752" r="11" fill="#fffbe8" filter="url(#g2)"/>`;

  // ---- Sol kenardaki yapı: a) saat kulesi (Gece Ekspresi), c) gökdelen (Şehir Ekspresi) ----
  // Ortak parçalar: blok (ön yüz lacivert, sağ yan gölgede, solda ay ışığı çizgisi, tepesi
  // altın), ışıklı dar pencere, deco saat kadranı.
  const NAVY = '#1c2446';
  const SHADE = '#111731';
  const block = (x, y, w, h) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${NAVY}"/><rect x="${f(x + w * 0.74)}" y="${f(y)}" width="${f(w * 0.26)}" height="${f(h)}" fill="${SHADE}"/><rect x="${f(x)}" y="${f(y)}" width="2" height="${f(h)}" fill="#7a8cc0" opacity=".55"/><rect x="${f(x - 2)}" y="${f(y)}" width="${f(w + 4)}" height="3" fill="url(#gold)"/>`;
  const slit = (x, y, w, h, o) => `<rect x="${f(x)}" y="${f(y)}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" fill="#ffd27a" opacity="${f(o)}"/>`;
  const chevrons = (x1, x2, y, step = 14) => {
    let s = '';
    for (let x = x1; x + step <= x2; x += step) s += `<path d="M${x + 2} ${y} L${x + step / 2} ${y + 6} L${x + step - 2} ${y}" stroke="url(#gold)" stroke-width="2" fill="none"/>`;
    return s;
  };
  const clockFace = (cx, cy, rr) => {
    let s = `<circle cx="${cx}" cy="${cy}" r="${rr + 12}" fill="${SHADE}"/>`;
    s += rays(cx, cy, rr + 22, 24, ['#d9b45a'], { fill: 0.35, opacity: 0.45 });
    s += `<circle cx="${cx}" cy="${cy}" r="${rr + 5}" fill="none" stroke="url(#gold)" stroke-width="4"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="#fff2c8" filter="url(#g)"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${f(rr * 0.78)}" fill="none" stroke="#c9a85a" stroke-width="1"/>`;
    for (let i = 0; i < 12; i++) {
      const a = rad(i * 30);
      const l = i % 3 ? 0.1 : 0.2;
      s += `<line x1="${f(cx + Math.cos(a) * rr * (0.9 - l))}" y1="${f(cy + Math.sin(a) * rr * (0.9 - l))}" x2="${f(cx + Math.cos(a) * rr * 0.9)}" y2="${f(cy + Math.sin(a) * rr * 0.9)}" stroke="#2a2a3a" stroke-width="${i % 3 ? 1.5 : 2.5}"/>`;
    }
    s += `<line x1="${cx}" y1="${cy}" x2="${f(cx - rr * 0.18)}" y2="${f(cy - rr * 0.5)}" stroke="#1a1a2a" stroke-width="3" stroke-linecap="round"/>`;
    s += `<line x1="${cx}" y1="${cy}" x2="${f(cx + rr * 0.62)}" y2="${f(cy + rr * 0.12)}" stroke="#1a1a2a" stroke-width="2" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="2.5" fill="#1a1a2a"/>`;
    return s;
  };
  const signal = `<rect x="246" y="590" width="6" height="210" fill="#2a3050"/>
<rect x="236" y="586" width="26" height="54" rx="8" fill="#141a2e" stroke="#6a7aa8" stroke-width="2"/>
<circle cx="249" cy="602" r="7" fill="#3a1010"/><circle cx="249" cy="624" r="7" fill="#6fd6a8" filter="url(#g)"/>`;

  // a) Deco saat kulesi: tren garının üstünde yükselen ince, kademeli kule; saat katı,
  //    dikey kaburgalar, yan kanatlar, kemerli gar pencereleri, tepede kırmızı fener.
  const towerA = () => {
    const rr = rng(7);
    let s = '';
    for (const x of [34, 180]) {
      s += block(x, 560, 46, 240) + block(x + 6, 542, 34, 18) + block(x + 12, 528, 22, 14);
      for (let y = 578; y < 680; y += 24) s += slit(x + 19, y, 8, 15, 0.3 + rr() * 0.6);
    }
    s += block(78, 386, 104, 414);
    for (const fx of [94, 118, 142, 166]) s += `<rect x="${fx - 3}" y="400" width="6" height="290" fill="#2a3462"/><rect x="${fx - 3}" y="400" width="1.5" height="290" fill="#8a9ad0" opacity=".5"/>`;
    for (const wx of [102, 126, 150]) for (let y = 410; y < 670; y += 22) if (rr() < 0.7) s += slit(wx, y, 8, 14, 0.35 + rr() * 0.6);
    s += block(0, 690, 260, 110) + chevrons(6, 254, 698, 16);
    for (let i = 0; i < 5; i++) {
      const x = 16 + i * 48;
      s += `<path d="M${x} 790 V738 A15 15 0 0 1 ${x + 30} 738 V790Z" fill="#ffd27a" opacity=".85" filter="url(#g)"/><path d="M${x + 15} 723 V790 M${x} 756 H${x + 30}" stroke="${NAVY}" stroke-width="3"/>`;
    }
    s += block(66, 284, 128, 104) + clockFace(130, 336, 32);
    s += block(84, 254, 92, 30) + chevrons(88, 172, 262, 14);
    s += block(98, 230, 64, 24) + block(110, 212, 40, 18);
    s += `<path d="M118 212 L130 136 L142 212Z" fill="url(#gold)"/><path d="M130 136 L142 212 H136Z" fill="#7a5a1c" opacity=".6"/>`;
    s += `<line x1="130" y1="136" x2="130" y2="112" stroke="#9aa4c8" stroke-width="2"/><circle cx="130" cy="110" r="4" fill="#ff5a4a" filter="url(#g)"/>`;
    return s + signal;
  };

  // c) Deco gökdelen: kademeli gövde, ışıklı pencere ızgarası, iç içe kemerli taç ve
  //    üçgen pencereler, ince altın sivri uç; tepeden gökyüzüne iki arama ışığı; yanında
  //    kafes radyo direği.
  const towerC = () => {
    const rr = rng(13);
    let s = '';
    s += S.cone(130, 214, -120, -160, 70, '#cfe0ff', 0.16, 0) + S.cone(130, 214, 520, -200, 70, '#cfe0ff', 0.12, 0);
    const grid = (x, y, w, h) => {
      let g = block(x, y, w, h);
      for (let wx = x + 8; wx < x + w - 10; wx += 14) {
        g += `<rect x="${wx + 8}" y="${y + 6}" width="2" height="${h - 10}" fill="#2a3462"/>`;
        for (let wy = y + 12; wy < y + h - 12; wy += 18) if (rr() < 0.42) g += `<rect x="${wx}" y="${wy}" width="6" height="9" fill="#ffd27a" opacity="${f(0.35 + rr() * 0.55)}"/>`;
      }
      return g;
    };
    s += grid(44, 580, 172, 220) + chevrons(48, 212, 588, 14);
    s += grid(66, 430, 128, 152) + chevrons(70, 190, 438, 12);
    s += grid(86, 330, 88, 102);
    s += clockFace(130, 490, 22);
    for (let k = 0; k < 4; k++) {
      const cy = 332 - k * 24;
      const ar = 44 - k * 9;
      s += `<path d="M${130 - ar} ${cy} A${ar} ${ar} 0 0 1 ${130 + ar} ${cy}Z" fill="${NAVY}" stroke="url(#gold)" stroke-width="2.5"/>`;
      for (let a = 200; a <= 340; a += 20) {
        const px = 130 + Math.cos(rad(a)) * (ar - 9);
        const py = cy + Math.sin(rad(a)) * (ar - 9);
        s += `<path d="M${f(px + Math.cos(rad(a)) * 6)} ${f(py + Math.sin(rad(a)) * 6)} L${f(px + Math.cos(rad(a + 90)) * 2.5)} ${f(py + Math.sin(rad(a + 90)) * 2.5)} L${f(px - Math.cos(rad(a + 90)) * 2.5)} ${f(py - Math.sin(rad(a + 90)) * 2.5)}Z" fill="#ffd27a" opacity=".9"/>`;
      }
    }
    s += `<path d="M126 254 L130 150 L134 254Z" fill="url(#gold)"/><circle cx="130" cy="148" r="3.5" fill="#ff5a4a" filter="url(#g)"/>`;
    let lattice = `<path d="M226 800 L236 520 L246 800" stroke="#3a4470" stroke-width="3" fill="none"/>`;
    for (let y = 790; y > 540; y -= 22) {
      const t = (800 - y) / 280;
      const hw = 10 * (1 - t);
      lattice += `<path d="M${f(236 - hw)} ${y} L${f(236 + hw * 0.92)} ${y - 22}" stroke="#3a4470" stroke-width="1.5"/>`;
    }
    s += lattice + `<circle cx="236" cy="516" r="4" fill="#ff5a4a" filter="url(#g)"/>`;
    return s;
  };
  // İkisi de uzun: üst şerit sivri ucu kesmesin diye tabandan biraz küçültülür
  const clock = `<g transform="translate(13 80) scale(.9)">${variant === 'a' ? towerA() : towerC()}</g>`;

  return S.svg(`
<defs>__DEFS__</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
${stars}
${sparkle(520, 280, 7, '#fff2d0', 0.8)}${sparkle(1040, 230, 6, '#fff2d0', 0.8)}${sparkle(820, 380, 4, '#fff2d0', 0.7)}
${city}
<rect x="0" y="800" width="${W}" height="100" fill="#151a32"/>
<rect x="0" y="798" width="${W}" height="4" fill="#6a7090"/>
${arches}
${S.cone(1356, 752, 300, 790, 90, '#fff3c8', 0.36, 0)}
${loco}
${clock}
${grain(0.24)}
`);
}

function trenMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}${GLOW('g', 5)}
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2d68c"/><stop offset="1" stop-color="#a8822c"/></linearGradient>
</defs>
${sparkle(34, 44, 7, '#fff2d0')}${sparkle(208, 30, 5, '#fff2d0')}
<rect x="0" y="222" width="240" height="6" fill="#6a7090"/>${[10, 50, 90, 130, 170, 210].map((x) => `<rect x="${x}" y="228" width="22" height="6" fill="#2a3050"/>`).join('')}
${logo(70, 100, 100, { look: [2, -1] })}
<!-- Kondüktör şapkası -->
<path d="M76 108 V80 Q120 66 164 80 V108Z" fill="#1e2a4a" stroke="#141a32" stroke-width="2.5"/>
<rect x="76" y="94" width="88" height="10" fill="url(#gold)"/>
<path d="M70 108 Q120 100 172 108 Q160 122 120 120 Q82 122 70 108Z" fill="#0c1020"/>
<circle cx="120" cy="84" r="6" fill="url(#gold)"/>
<!-- Fener -->
<g transform="translate(196 170)">
  <path d="M-10 -40 Q0 -54 10 -40" stroke="#6a7090" stroke-width="3" fill="none"/>
  <rect x="-15" y="-40" width="30" height="8" rx="2" fill="#2a3050"/>
  <rect x="-12" y="-32" width="24" height="34" rx="4" fill="#ffe2a0" filter="url(#g)"/>
  <path d="M-12 -32 V2 M12 -32 V2 M0 -32 V2" stroke="#2a3050" stroke-width="2"/>
  <rect x="-15" y="2" width="30" height="8" rx="2" fill="#2a3050"/>
</g>
`);
}

function ekspresMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}${GLOW('g', 4)}
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2d68c"/><stop offset="1" stop-color="#a8822c"/></linearGradient>
</defs>
<!-- Arkada küçük deco gökdelen: kemerli taç, ışıklı pencereler -->
<g transform="translate(186 0)">
  <rect x="-22" y="96" width="44" height="126" fill="#1c2446"/><rect x="-12" y="70" width="24" height="28" fill="#1c2446"/>
  ${[84, 76, 68].map((y, k) => `<path d="M${-12 + k * 3} ${y} A${12 - k * 3} ${12 - k * 3} 0 0 1 ${12 - k * 3} ${y}Z" fill="#1c2446" stroke="url(#gold)" stroke-width="2"/>`).join('')}
  <path d="M-1.5 58 L0 30 L1.5 58Z" fill="url(#gold)"/><circle cy="28" r="3" fill="#ff5a4a" filter="url(#g)"/>
  ${[110, 130, 150, 170, 190].map((y, i) => `<rect x="-14" y="${y}" width="6" height="9" fill="#ffd27a" opacity="${i % 2 ? 0.5 : 0.9}"/><rect x="6" y="${y}" width="6" height="9" fill="#ffd27a" opacity="${i % 2 ? 0.9 : 0.4}"/>`).join('')}
</g>
${sparkle(34, 44, 7, '#fff2d0')}${sparkle(120, 30, 5, '#fff2d0')}
<rect x="0" y="222" width="240" height="6" fill="#6a7090"/>${[10, 50, 90, 130, 170, 210].map((x) => `<rect x="${x}" y="228" width="22" height="6" fill="#2a3050"/>`).join('')}
${logo(56, 100, 100, { look: [2, -1] })}
<!-- Kondüktör şapkası -->
<path d="M62 108 V80 Q106 66 150 80 V108Z" fill="#1e2a4a" stroke="#141a32" stroke-width="2.5"/>
<rect x="62" y="94" width="88" height="10" fill="url(#gold)"/>
<path d="M56 108 Q106 100 158 108 Q146 122 106 120 Q68 122 56 108Z" fill="#0c1020"/>
<circle cx="106" cy="84" r="6" fill="url(#gold)"/>
<!-- Altın bilet -->
<g transform="translate(36 186) rotate(-14)">
  <path d="M-22 -12 H22 V-4 A4 4 0 0 0 22 4 V12 H-22 V4 A4 4 0 0 0 -22 -4Z" fill="url(#gold)"/>
  <path d="M-10 -12 V12" stroke="#7a5a1c" stroke-width="1.5" stroke-dasharray="3 2"/><path d="M-2 0 H14" stroke="#7a5a1c" stroke-width="2"/>
</g>
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
  'lokum-desen.svg': lokumPattern(),
  'binbirgece.svg': binbirScene(),
  'binbirgece-maskot.svg': binbirMascot(),
  'sinema.svg': sinemaScene(),
  'sinema-maskot.svg': sinemaMascot(),
  'opera.svg': operaScene(),
  'opera-maskot.svg': operaMascot(),
  'acikhava.svg': acikhavaScene(),
  'acikhava-maskot.svg': acikhavaMascot(),
  'gemi.svg': gemiScene(),
  'gemi-maskot.svg': gemiMascot(),
  'tren.svg': trenScene('a'),
  'tren-maskot.svg': trenMascot(),
  'ekspres.svg': trenScene('c'),
  'ekspres-maskot.svg': ekspresMascot(),
};
for (const [name, content] of Object.entries(files)) {
  writeFileSync(new URL(name, OUT), content.replace(/\n\s*\n/g, '\n'));
  console.log(`✓ themes/${name} (${(content.length / 1024).toFixed(1)} KB)`);
}
