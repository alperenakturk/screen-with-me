// Çizimli temaların resimlerini (SVG) üretir: her tema için bir sahne (sayfanın
// arkasında, ekranı kaplar) ve o temanın kostümünü giymiş maskot (sol alt köşe).
// Dış paket ya da dışarıdan resim/font yok; her şey burada şekillerle çiziliyor.
//
//   node scripts/theme-art.mjs   → apps/web/public/themes/*.svg
//
// Sahnelerde ortası (içeriğin durduğu yer) boş bırakılır; süsler kenarlarda.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

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

// =====================================================================
// MEHTAPLI GECELER (kimlik: lokum): oryantalist yağlı boya havasında mehtap gecesi. Solda çini pano,
// mermer sütun ve kemerden sarkan kandil; sağda servi ve pirinç fener; ortada ay ışığında Boğaz,
// karşı kıyıda saray surları, camiler ve kule; fenerli mehtap kayıkları, taş korkuluk
// =====================================================================

/**
 * Fırça kenarı: şeklin kenarını gürültüyle hafifçe dalgalandırır (yağlı boya / ahşap baskı
 * gibi, cetvelle çizilmiş durmasın). `scale` dalganın genliği.
 */
const BRUSH = (id, scale = 6, freq = 0.035, seed = 3) =>
  `<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${scale}" xChannelSelector="R" yChannelSelector="G"/></filter>`;
/**
 * Bulut / duman dokusu: gürültüden saydamlık üretir; şekli bu filtreyle doldurunca içi
 * kümelenmiş bulut gibi olur. `fx fy` yatay/dikey sıklık (dikey düşükse uzun bulut).
 */
const CLOUDY = (id, fx, fy, seed, gain = 1.6, bias = -0.55) =>
  `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${fx} ${fy}" numOctaves="4" seed="${seed}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${gain} 0 0 0 ${bias}" result="a"/><feComposite in="SourceGraphic" in2="a" operator="in"/></filter>`;

/** n köşeli yıldız (iç yarıçap oranı k). */
function starPath(cx, cy, r, n, k = 0.45, rot = -90) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rad(rot + (i * 180) / n);
    const rr = i % 2 ? r * k : r;
    pts.push(`${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`);
  }
  return `M${pts.join(' L')}Z`;
}

/** Sabit sayıda yıldız (gökyüzü), y aralığında. */
function stars(seed, n, y0, y1, color = '#fff', maxR = 1.4, maxO = 0.8) {
  const r = rng(seed);
  let s = '';
  for (let i = 0; i < n; i++) s += `<circle cx="${f(r() * W)}" cy="${f(y0 + r() * (y1 - y0))}" r="${f(0.4 + r() * maxR)}" fill="${color}" opacity="${f(0.15 + r() * maxO)}"/>`;
  return s;
}

const COBALT = '#1d3f8a';
const TURQ = '#2fa6b0';
const CORAL = '#d8452e';
const CREAM = '#f3ead8';
const minaret = (x, base, h, w = 8) => `<rect x="${f(x - w / 2)}" y="${f(base - h)}" width="${w}" height="${f(h)}"/><rect x="${f(x - w / 2 - 3)}" y="${f(base - h * 0.62)}" width="${w + 6}" height="4" rx="2"/><rect x="${f(x - w / 2 - 2)}" y="${f(base - h * 0.84)}" width="${w + 4}" height="3.5" rx="1.75"/><path d="M${f(x - w / 2)} ${f(base - h)} L${f(x)} ${f(base - h - h * 0.18)} L${f(x + w / 2)} ${f(base - h)}Z"/>`;
const dome = (cx, base, rx, ry) => `<path d="M${f(cx - rx)} ${f(base)} A${f(rx)} ${f(ry)} 0 0 1 ${f(cx + rx)} ${f(base)}Z"/><rect x="${f(cx - 1.5)}" y="${f(base - ry - 14)}" width="3" height="14"/>`;
const cypress = (x, base, h, w = 9) => `<path d="M${x} ${base} C${f(x - w)} ${f(base - h * 0.4)} ${f(x - w * 0.66)} ${f(base - h * 0.8)} ${x} ${f(base - h)} C${f(x + w * 0.66)} ${f(base - h * 0.8)} ${f(x + w)} ${f(base - h * 0.4)} ${x} ${base}Z"/>`;

/** Yıldız ve altıgen çini deseni (mavi zemin, turkuaz altı köşeli yıldızlar, beyaz kenar). */
function tilePattern(id, { bg = COBALT, star = TURQ, line = CREAM, dot = CORAL, s = 1 } = {}) {
  const w = 60 * s;
  const h = 103.92 * s;
  const pts = [[0, 0], [w, 0], [0, h], [w, h], [w / 2, h / 2]];
  const st = pts.map(([x, y]) => `<path d="${starPath(x, y, 24 * s, 6, 0.58, -90)}" fill="${star}" stroke="${line}" stroke-width="${f(1.6 * s)}"/><circle cx="${x}" cy="${y}" r="${f(6 * s)}" fill="${dot}" stroke="${line}" stroke-width="${f(1 * s)}"/>`).join('');
  const hexes = [[w / 2, 0], [0, h / 2], [w, h / 2], [w / 2, h]].map(([x, y]) => `<path d="${starPath(x, y, 7 * s, 6, 0.86, 0)}" fill="${line}" opacity=".7"/>`).join('');
  return `<pattern id="${id}" width="${f(w)}" height="${f(h)}" patternUnits="userSpaceOnUse"><rect width="${f(w)}" height="${f(h)}" fill="${bg}"/>${st}${hexes}</pattern>`;
}

/** Zincirle sarkan kandil (cam gövde, içinde ışık); zincir `top`tan başlar. */
function kandil(x, len, glass = '#e8a83a', id = 'kg', top = 0) {
  return `<path d="M${x} ${top} V${len}" stroke="#b08a3a" stroke-width="2" stroke-dasharray="5 3"/>
<g transform="translate(${x} ${len})">
  <circle cy="34" r="60" fill="url(#${id})"/>
  <path d="M-6 0 H6 L10 8 H-10Z" fill="#c99a45"/>
  <path d="M-10 8 Q-30 30 -16 52 Q0 62 16 52 Q30 30 10 8Z" fill="${glass}" opacity=".85"/>
  <path d="M-10 8 Q-30 30 -16 52" stroke="#fff3c8" stroke-width="2" fill="none" opacity=".6"/>
  <ellipse cy="36" rx="7" ry="10" fill="#fff4c8" filter="url(#gl)"/>
  <path d="M-16 52 Q0 62 16 52 L8 62 H-8Z" fill="#c99a45"/><circle cy="68" r="3" fill="#c99a45"/>
</g>`;
}

/** Kayık; `lantern` ise pruvada fener ve sudaki yansıması. */
function caique(x, y, s, { hull = '#120a12', lantern = true, canopy } = {}) {
  return `<g transform="translate(${x} ${y}) scale(${s})">
${lantern ? `<rect x="40" y="2" width="4" height="40" fill="#ffc870" opacity=".35" filter="url(#b4)"/>` : ''}
<path d="M-60 -4 Q-70 -16 -76 -22 Q-40 6 0 6 Q40 6 70 -18 Q66 -8 56 0 Q20 12 -40 8Z" fill="${hull}"/>
${canopy ? `<path d="M-30 -4 V-26 H20 V-4" stroke="${hull}" stroke-width="2.5" fill="none"/><path d="M-34 -26 Q-6 -36 24 -26Z" fill="${canopy}"/>` : ''}
<path d="M-12 -4 L-18 -20 M8 -4 L14 -18" stroke="${hull}" stroke-width="3"/><circle cx="-18" cy="-24" r="5" fill="${hull}"/><circle cx="14" cy="-22" r="5" fill="${hull}"/>
${lantern ? `<path d="M44 -6 V-30" stroke="${hull}" stroke-width="2"/><rect x="38" y="-40" width="12" height="13" rx="3" fill="#ffc870" filter="url(#gl)"/>` : ''}
</g>`;
}

/**
 * Karşı kıyının silüeti (elle dizilmiş): solda saray surları ve kuleleri, büyük ve küçük cami,
 * aralarda evler ve serviler, sağda tepede yuvarlak kule. Uzakta olduğu için tek renk.
 */
function shoreline(base) {
  const r = rng(77);
  const houses = (x0, x1, b = base) => {
    let out = '';
    for (let x = x0; x < x1; ) {
      const w = 14 + r() * 16;
      const h = 10 + r() * 16;
      out += `<path d="M${f(x)} ${b + 4} V${f(b - h)} L${f(x + w / 2)} ${f(b - h - 6)} L${f(x + w)} ${f(b - h)} V${b + 4}Z"/>`;
      x += w + 1.5;
    }
    return out;
  };
  const mosque = (cx, s) => `<path d="M${cx - 70 * s} ${base} V${base - 26 * s} H${cx + 70 * s} V${base}Z"/>${dome(cx, base - 26 * s, 40 * s, 36 * s)}${dome(cx - 46 * s, base - 26 * s, 16 * s, 14 * s)}${dome(cx + 46 * s, base - 26 * s, 16 * s, 14 * s)}`;
  const palace = (x0) => {
    let out = `<path d="M${x0} ${base} V${base - 22} H${x0 + 170} V${base}Z"/>`;
    for (let i = 0; i < 17; i++) out += `<rect x="${x0 + i * 10}" y="${base - 27}" width="5" height="5"/>`;
    for (const tx of [x0 + 6, x0 + 76, x0 + 150]) out += `<rect x="${tx}" y="${base - 44}" width="16" height="44"/><path d="M${tx - 3} ${base - 44} L${tx + 8} ${base - 66} L${tx + 19} ${base - 44}Z"/>`;
    return out;
  };
  const hillY = (x) => base - Math.max(0, 40 - ((x - 1340) / 120) ** 2 * 40);
  let hill = `M1220 ${base + 4}`;
  for (let x = 1220; x <= 1600; x += 20) hill += ` L${x} ${f(hillY(x))}`;
  hill += ` V${base + 4}Z`;
  return `<path d="M240 ${base + 4} V${base - 4} H1600 V${base + 4}Z"/>
${palace(250)}${houses(430, 470)}
${mosque(540, 1)}${minaret(456, base, 92, 5)}${minaret(624, base, 92, 5)}${minaret(470, base, 78, 4.5)}${minaret(610, base, 78, 4.5)}
${houses(640, 780)}${cypress(700, base - 10, 44, 6)}${cypress(712, base - 12, 36, 5)}
${mosque(860, 0.7)}${minaret(800, base, 70, 4)}${minaret(920, base, 70, 4)}
${houses(950, 1220)}${cypress(1010, base - 12, 40, 6)}${cypress(1130, base - 10, 34, 5)}
<path d="${hill}"/>${houses(1230, 1600, base - 6)}
<rect x="1326" y="${base - 136}" width="28" height="100"/><rect x="1322" y="${base - 142}" width="36" height="8" rx="2"/><path d="M1323 ${base - 142} L1340 ${base - 178} L1357 ${base - 142}Z"/>`;
}

function lokumScene() {
  const r = rng(803);
  // Ay yolu: ayın altında, aşağı indikçe genişleyen fırça darbeleri
  let glitter = '';
  for (let i = 0; i < 150; i++) {
    const t = r();
    const y = 680 + t * 210;
    const spread = 20 + t * 170;
    const x = 1180 + (r() - 0.5) * 2 * spread * r();
    const w = 6 + r() * 22 * (0.5 + t);
    glitter += `<path d="M${f(x)} ${f(y)} h${f(w)}" stroke="${r() > 0.3 ? '#f4e6c8' : '#c8d4f0'}" stroke-width="${f(1 + t * 1.6)}" opacity="${f(0.3 + r() * 0.6 * (1 - Math.abs(x - 1180) / 260))}" stroke-linecap="round"/>`;
  }
  let ripples = '';
  for (let i = 0; i < 70; i++) {
    const y = 690 + r() * 200;
    ripples += `<path d="M${f(r() * W)} ${f(y)} h${f(10 + r() * 30)}" stroke="#7a8ab8" stroke-width="1.4" opacity="${f(0.08 + r() * 0.15)}"/>`;
  }
  // Uzak kıyı ışıkları (bulanık sıcak noktalar ve sudaki yansımaları)
  let lights = '';
  for (let i = 0; i < 40; i++) {
    const x = 280 + r() * 1040;
    const y = 652 + r() * 14;
    lights += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.2 + r())}" fill="#ffcf80"/><rect x="${f(x - 0.8)}" y="${f(y + 18)}" width="1.6" height="${f(8 + r() * 14)}" fill="#ffcf80" opacity=".35"/>`;
  }
  const balusters = Array.from({ length: 36 }, (_, i) => {
    const x = 20 + i * 44;
    return `<path d="M${x} 830 v-6 q-6 -8 -2 -18 q-8 -6 0 -14 v-6 h16 v6 q8 8 0 14 q4 10 -2 18 v6Z"/>`;
  }).join('');
  return svg(W, H, `
<defs>
${GLOW('gl', 6)}${BLUR('b4', 4)}${BLUR('b2', 1.6)}${BLUR('b30', 30)}${BRUSH('br', 8, 0.025, 14)}${BRUSH('br2', 4, 0.05, 9)}
${CLOUDY('cl', 0.0025, 0.011, 23, 1.8, -0.6)}${CLOUDY('mottle', 0.012, 0.02, 5, 1.4, -0.4)}
${tilePattern('tile', { s: 0.7, bg: '#1a3478', star: '#2a92a0' })}
${GRAIN_DEFS}
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#090e24"/><stop offset=".45" stop-color="#18224a"/><stop offset=".72" stop-color="#3a4870"/></linearGradient>
<radialGradient id="moonlit" cx="1180" cy="280" r="700" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#eef0ff"/><stop offset=".4" stop-color="#8a96c8"/><stop offset="1" stop-color="#2a3460"/></radialGradient>
<radialGradient id="halo" cx="1180" cy="280" r="300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff1d8" stop-opacity=".5"/><stop offset=".35" stop-color="#c8d0f0" stop-opacity=".15"/><stop offset="1" stop-color="#c8d0f0" stop-opacity="0"/></radialGradient>
<linearGradient id="cf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="cm"><rect y="100" width="${W}" height="500" fill="url(#cf)"/></mask>
<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26305a"/><stop offset="1" stop-color="#070a18"/></linearGradient>
<linearGradient id="marble" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a3644"/><stop offset=".35" stop-color="#8e8a96"/><stop offset=".6" stop-color="#6a6672"/><stop offset="1" stop-color="#26232e"/></linearGradient>
<radialGradient id="kg"><stop offset="0" stop-color="#ffc870" stop-opacity=".35"/><stop offset="1" stop-color="#ffc870" stop-opacity="0"/></radialGradient>
<linearGradient id="parapet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a8494"/><stop offset="1" stop-color="#3a3642"/></linearGradient>
<radialGradient id="lamp" cx="1372" cy="726" r="260" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffb84a" stop-opacity=".55"/><stop offset=".3" stop-color="#ff9a3a" stop-opacity=".18"/><stop offset="1" stop-color="#ff9a3a" stop-opacity="0"/></radialGradient>
<pattern id="floor" width="60" height="30" patternUnits="userSpaceOnUse"><rect width="60" height="30" fill="#2a2430"/><path d="M0 15 L30 0 L60 15 L30 30Z" fill="#4a4250"/></pattern>
<radialGradient id="vig" cx="50%" cy="45%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
${stars(81, 80, 0, 400, '#f2f0ff', 1, 0.5)}
<g mask="url(#cm)"><rect y="100" width="${W}" height="500" fill="url(#moonlit)" filter="url(#cl)" opacity=".45"/></g>
<rect width="${W}" height="${H}" fill="url(#halo)"/>
<circle cx="1180" cy="280" r="46" fill="#fff4dc"/>
<circle cx="1166" cy="268" r="9" fill="#e8dcc4" opacity=".6"/><circle cx="1194" cy="294" r="6" fill="#e8dcc4" opacity=".5"/>
<!-- Karşı kıyı: bulanık silüet ve ışıklar -->
<g fill="#1a1e3a" filter="url(#b2)">${shoreline(668)}</g>
<g filter="url(#b2)">${lights}</g>
<rect y="668" width="${W}" height="232" fill="url(#sea)"/>
${ripples}
${glitter}
<!-- Mehtap kayıkları -->
${caique(520, 770, 0.8, { hull: '#0e0a14', canopy: '#7a1e22' })}${caique(840, 812, 1, { hull: '#0e0a14', canopy: '#2a5a6a' })}${caique(1000, 734, 0.55, { hull: '#14101c' })}${caique(1290, 790, 0.85, { hull: '#0e0a14', canopy: '#8a6a2a' })}${caique(660, 722, 0.45, { hull: '#14101c' })}
<!-- Sol: çini pano, mermer sütun ve kemer, kemerden sarkan kandil -->
<g filter="url(#br2)">
  <rect x="-10" y="0" width="140" height="840" fill="url(#tile)"/>
  <rect x="-10" y="0" width="140" height="840" fill="#05040e" opacity=".45"/>
  <path d="M176 230 Q320 60 560 -30" stroke="url(#marble)" stroke-width="40" fill="none"/>
  <path d="M190 236 Q330 74 566 -12" stroke="#7a1e22" stroke-width="5" fill="none" opacity=".8"/>
  <rect x="122" y="220" width="58" height="580" fill="url(#marble)"/>
  <rect x="112" y="196" width="78" height="26" fill="url(#marble)"/><rect x="116" y="790" width="70" height="20" fill="url(#marble)"/>
</g>
${kandil(262, 190, '#c8402e', 'kg', 150)}
<!-- Sağ: servi ve fener -->
<g filter="url(#br)">
  <path d="M1460 840 C1410 640 1418 420 1462 220 C1504 420 1514 640 1468 840Z" fill="#0b1712"/>
  <path d="M1462 220 C1430 420 1424 600 1446 760" stroke="#2c4a3c" stroke-width="10" fill="none" opacity=".7"/>
  <path d="M1556 840 C1526 700 1530 540 1558 400 C1588 540 1592 700 1562 840Z" fill="#0a1410"/>
</g>
<rect width="${W}" height="${H}" fill="url(#lamp)"/>
<!-- Taş korkuluk ve döşeme -->
<rect y="772" width="${W}" height="14" fill="url(#parapet)"/>
<g fill="#5e5a68">${balusters}</g>
<rect y="830" width="${W}" height="12" fill="url(#parapet)"/>
<rect y="842" width="${W}" height="58" fill="url(#floor)"/>
<g transform="translate(1372 726)">
  <path d="M0 -40 V-26" stroke="#c99a45" stroke-width="3"/>
  <path d="M-16 -26 H16 L12 -18 H-12Z M-14 30 H14 L18 46 H-18Z" fill="#c99a45"/>
  <path d="M-12 -18 H12 L14 30 H-14Z" fill="#ffcf80" opacity=".9" filter="url(#gl)"/>
  <path d="M-4 -18 V30 M4 -18 V30" stroke="#8a6a2a" stroke-width="2"/>
</g>
<rect width="${W}" height="${H}" fill="#000" filter="url(#mottle)" opacity=".2"/>
<rect width="${W}" height="${H}" fill="url(#vig)"/>
${grain(0.15)}
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

// =====================================================================
// BİNBİR GECE: ay ışığında çöl, kumullar, kervan, vaha, uzak saray
// =====================================================================

function binbirScene() {
  // Tek hörgüçlü deve (sağa bakar, ayaklar y=0'da), sırtında saçaklı örtü. Üst kenarlarda
  // ay ışığı çizgisi. İnsan figürü yok (düz ve yapay duruyordu).
  const INK = '#0b0817';
  // Uzak saray: simetrik ve düz. Kemerli sur, kasnak üstünde büyük kubbe, iki yanda küçük
  // kubbeler ve balkonlu iki minare; hepsi aynı zemine oturur (yamuk durmasın).
  // (cx, base) zeminin ortası, s ölçek; lights: pencere ışıkları.
  const palace = (cx, base, s, lights = false) => {
    const X = (dx) => f(cx + dx * s);
    const Y = (dy) => f(base - dy * s);
    const dome = (dx, w, h, y0) => `<path d="M${X(dx - w)} ${Y(y0)} Q${X(dx - w)} ${Y(y0 + h * 0.9)} ${X(dx)} ${Y(y0 + h)} Q${X(dx + w)} ${Y(y0 + h * 0.9)} ${X(dx + w)} ${Y(y0)}Z"/><rect x="${X(dx - 0.8)}" y="${Y(y0 + h + 9)}" width="${f(1.6 * s)}" height="${f(9 * s)}"/>`;
    const minaret = (dx) => `<rect x="${X(dx - 4)}" y="${Y(96)}" width="${f(8 * s)}" height="${f(96 * s)}"/><rect x="${X(dx - 6.5)}" y="${Y(70)}" width="${f(13 * s)}" height="${f(4 * s)}"/><path d="M${X(dx - 4)} ${Y(96)} L${X(dx)} ${Y(116)} L${X(dx + 4)} ${Y(96)}Z"/>`;
    let arches = '';
    for (let i = -3; i <= 3; i++) arches += `<path d="M${X(i * 14 - 4)} ${Y(0)} V${Y(10)} Q${X(i * 14)} ${Y(17)} ${X(i * 14 + 4)} ${Y(10)} V${Y(0)}Z" fill="#0d0b20"/>`;
    const glow = lights ? `<g fill="#ffd58a" opacity=".6">${[-28, 0, 28].map((dx) => `<rect x="${X(dx - 2)}" y="${Y(30)}" width="${f(4 * s)}" height="${f(7 * s)}" rx="${f(2 * s)}"/>`).join('')}</g>` : '';
    return `<g fill="#18143a">
<rect x="${X(-60)}" y="${Y(26)}" width="${f(120 * s)}" height="${f(26 * s)}"/>
<rect x="${X(-26)}" y="${Y(42)}" width="${f(52 * s)}" height="${f(16 * s)}"/>
${dome(0, 26, 34, 42)}${dome(-44, 13, 18, 26)}${dome(44, 13, 18, 26)}
${minaret(-70)}${minaret(70)}
</g>${arches}${glow}`;
  };
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
${palace(150, 630, 1.05)}
<!-- Uzak şehir (ortada, kumulların ardında) -->
${palace(790, 618, 0.85, true)}
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

// =====================================================================
// GECE EKSPRESİ (KARANLIK): sağdan gelen aerodinamik deco lokomotif, farının huzmesi,
//     kemerli viyadük, uzak şehir ışıkları; solda deco saat kulesi ve sinyal
// =====================================================================

function trenScene() {
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

  // ---- Sol kenardaki yapı: deco saat kulesi ----
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

  // Deco saat kulesi: tren garının üstünde yükselen ince, kademeli kule; saat katı,
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

  // Uzun: üst şerit sivri ucu kesmesin diye tabandan biraz küçültülür
  const clock = `<g transform="translate(13 80) scale(.9)">${towerA()}</g>`;

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

// =====================================================================
// Sade temaların maskotları (sahne yok; boş odada ve ana sayfa başlığında görünür)
// =====================================================================

/** Gece: uyku başlıklı, patlamış mısırlı, yanında hilal ve yıldızlar. */

/** Okyanus: şnorkel ve maske, kabarcıklar, dalga. */

/** Gün batımı: güneş gözlüğü, şemsiye, buzlu içecek. */

/** Neon: kulaklık, neon parıltılı çerçeve, nota. */

const files = {
  'lokum.svg': lokumScene(),
  'lokum-desen.svg': lokumPattern(),
  'binbirgece.svg': binbirScene(),
  'sinema.svg': sinemaScene(),
  'acikhava.svg': acikhavaScene(),
  'gemi.svg': gemiScene(),
  'tren.svg': trenScene(),
};
// The theme mascots are Glowbeam in costume since card 6f (the Design session's drawings, 240 × 240, drop-in names):
// copied from docs/internal/design/themes/glowbeam-<theme>.svg as <theme>-maskot.svg.
for (const theme of ['gece', 'okyanus', 'gunbatimi', 'neon', 'lokum', 'binbirgece', 'sinema', 'acikhava', 'gemi', 'tren']) {
  files[`${theme}-maskot.svg`] = readFileSync(new URL(`../docs/internal/design/themes/glowbeam-${theme}.svg`, import.meta.url), 'utf8');
}
for (const [name, content] of Object.entries(files)) {
  writeFileSync(new URL(name, OUT), content.replace(/\n\s*\n/g, '\n'));
  console.log(`✓ themes/${name} (${(content.length / 1024).toFixed(1)} KB)`);
}
