// Art Deco / eski afiş tarzında tema ADAYLARI: sahne + maskot + koyu renk paleti.
// Seçilenler sonra scripts/theme-art.mjs'e taşınır; bu betik sadece önizleme üretir.
// Dış paket ya da dışarıdan resim/font yok; her şey şekillerle çiziliyor.
//
//   node scripts/theme-candidates.mjs            → store/theme-candidates/ (SVG + HTML + PNG)
//   node scripts/theme-candidates.mjs --no-shots → ekran görüntüsü almadan
//
// Sahne 1600×900, alttan hizalı ve ekranı kaplar: üst ~200 birim kırpılabilir, ortada
// (x 260–1340) içerik durur. Ana süsler kenarlarda, ortada sadece hafif ayrıntı.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { LOGO_FROM, LOGO_INK, LOGO_TO } from '../packages/shared/src/logo.ts';

const OUT = new URL('../store/theme-candidates/', import.meta.url);
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
const rad = (d) => (d * Math.PI) / 180;

function svg(w, h, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>\n`;
}

const GLOW = (id, std) =>
  `<filter id="${id}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${std}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
const BLUR = (id, std) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${std}"/></filter>`;

// Afiş dokusu: koyu ve açık iki kat ince kumlanma (eski baskı gibi).
const GRAIN_DEFS = `
<filter id="grainD" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="4" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3 0 0 0 -1.62"/></filter>
<filter id="grainL" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="9" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 .95  0 0 0 0 .85  -3 0 0 0 1.38"/></filter>`;
const grain = (o = 0.22) => `<rect width="${W}" height="${H}" filter="url(#grainD)" opacity="${o}"/><rect width="${W}" height="${H}" filter="url(#grainL)" opacity="${f(o * 0.6 * 100) / 100}"/>`;

/** Kâğıt kesik bulutun gölgesi. */
const SOFT = (color) => `<filter id="soft" x="-15%" y="-40%" width="135%" height="190%"><feDropShadow dx="4" dy="7" stdDeviation="6" flood-color="${color}" flood-opacity=".4"/></filter>`;

function sparkle(x, y, r, color, opacity = 1) {
  const s = r * 0.28;
  return `<path d="M${f(x)} ${f(y - r)} Q${f(x + s)} ${f(y - s)} ${f(x + r)} ${f(y)} Q${f(x + s)} ${f(y + s)} ${f(x)} ${f(y + r)} Q${f(x - s)} ${f(y + s)} ${f(x - r)} ${f(y)} Q${f(x - s)} ${f(y - s)} ${f(x)} ${f(y - r)}Z" fill="${color}" opacity="${opacity}"/>`;
}

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
// 1. SİNEMA SARAYI (KARANLIK): makine dairesinden salona uzanan ışık huzmesi,
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
// 2. OPERA GECESİ (orta): iki yanda üç kat altın yaldızlı localar, ortada koyu
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
// 3. AÇIK HAVA SİNEMASI (KARANLIK gece): sağda büyük perde, soldan uzanan
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
// 4. TRANSATLANTİK (şafak, aydınlık): sağda yükselen dev gemi burnu, kırmızı
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
// 5. GECE EKSPRESİ (KARANLIK): sağdan gelen aerodinamik deco lokomotif, farının
//     huzmesi, kemerli viyadük, uzak şehir ışıkları, solda saat kulesi ve sinyal
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

  // ---- Sol kenardaki yapı: üç kule seçeneği (a: saat kulesi, b: gar binası, c: gökdelen) ----
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

  // b) Art Deco tren garı: geniş cephe, yelpaze biçimli dev ışıklı pencere, oluklu yan
  //    pilonlar ve küre lambalar, ortada saatli küçük kule ve bayrak direği.
  const towerB = () => {
    let s = '';
    s += block(46, 600, 168, 200);
    s += `<path d="M58 790 V712 A72 72 0 0 1 202 712 V790Z" fill="#ffd27a" opacity=".85" filter="url(#g)"/>`;
    for (let a = 180; a <= 360; a += 22.5) s += `<line x1="130" y1="712" x2="${f(130 + Math.cos(rad(a)) * 72)}" y2="${f(712 + Math.sin(rad(a)) * 72)}" stroke="${NAVY}" stroke-width="3.5"/>`;
    s += `<path d="M110 712 A20 20 0 0 1 150 712Z" fill="${NAVY}"/><path d="M58 712 H202 M58 752 H202 M85 712 V790 M108 712 V790 M130 712 V790 M152 712 V790 M175 712 V790" stroke="${NAVY}" stroke-width="3.5"/>`;
    s += `<path d="M52 790 V712 A78 78 0 0 1 208 712 V790" fill="none" stroke="url(#gold)" stroke-width="4"/>`;
    s += block(40, 584, 180, 22) + chevrons(46, 214, 591, 14);
    for (const x of [0, 214]) {
      s += block(x, 520, 46, 280) + block(x + 5, 504, 36, 16) + block(x + 11, 492, 24, 12);
      for (let lx = x + 9; lx < x + 34; lx += 8) s += `<rect x="${lx}" y="540" width="3" height="240" fill="#0b1026" opacity=".7"/>`;
      s += `<rect x="${x + 21}" y="472" width="4" height="20" fill="url(#gold)"/><circle cx="${x + 23}" cy="466" r="10" fill="#fff2c8" filter="url(#g)"/>`;
    }
    s += block(96, 420, 68, 166) + clockFace(130, 470, 22);
    for (const y of [512, 540]) s += slit(112, y, 8, 18, 0.7) + slit(140, y, 8, 18, 0.5);
    s += block(102, 402, 56, 18) + block(110, 388, 40, 14) + block(118, 376, 24, 12);
    s += `<line x1="130" y1="376" x2="130" y2="318" stroke="#9aa4c8" stroke-width="2.5"/><path d="M132 320 L158 328 L132 336Z" fill="url(#gold)"/>`;
    s += `<rect x="62" y="786" width="136" height="8" fill="url(#gold)"/>`;
    return s;
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
  // a ve c uzun: üst şerit sivri ucu kesmesin diye tabandan biraz küçültülür
  const clock = variant === 'b' ? towerB() : `<g transform="translate(13 80) scale(.9)">${variant === 'a' ? towerA() : towerC()}</g>`;

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

// ---- Maskot (logo): 64'lük ızgarada, istenen yere ve boyuta (theme-art.mjs ile aynı) ----

const LOGO_DEFS = `<linearGradient id="lg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${LOGO_FROM}"/><stop offset="1" stop-color="${LOGO_TO}"/></linearGradient>`;

function eye(cx, look = [2.5, -1.5]) {
  const px = cx + look[0];
  const py = 25.5 + look[1];
  return `<ellipse cx="${cx}" cy="25.5" rx="8.5" ry="11" fill="#fff"/><circle cx="${px}" cy="${py}" r="4.8" fill="${LOGO_INK}"/><circle cx="${f(px + 1.55)}" cy="${f(py - 1.6)}" r="1.6" fill="#fff"/>`;
}

function logo(x, y, size, { face = true, look, mouth = true } = {}) {
  const k = size / 64;
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${f(k * 1000) / 1000})">
<rect width="64" height="64" rx="16" fill="url(#lg)"/>
${face ? eye(22, look) + eye(42, look) : ''}
${mouth ? '<path d="M28.5 38.5 L38 44 L28.5 49.5 Z" fill="#fff" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>' : ''}
</g>`;
}

// ---- Adaylar: ad, fikir, aydınlık, koyu arayüz paleti (styles.css'e aynen geçer) ----

const CANDIDATES = [
  {
    id: 'sinema', tr: 'Sinema Sarayı', en: 'Picture Palace', light: 'karanlık',
    idea: 'Eski sinema salonu: makine dairesinden uzanan ışık huzmesi, koltuk sıraları, yelpaze aplikler, film makarası',
    scene: sinemaScene, mascot: sinemaMascot,
    p: { bg: '#07080f', surface: 'rgb(14 16 28 / 0.86)', surface2: 'rgb(24 27 44 / 0.92)', border: '#2e3350', text: '#f2eee2', muted: '#a9a593', accent: '#e9b949', accentHover: '#f5cd6a', onAccent: '#1d1503' },
    art: 'linear-gradient(#0d1020, #05060c)',
  },
  {
    id: 'opera', tr: 'Opera Gecesi', en: 'Opera Night', light: 'orta',
    idea: 'Opera binası: iki yanda yaldızlı localar, ortada koyu kadife perde, kristal avize, orkestra ışıkları',
    scene: operaScene, mascot: operaMascot,
    p: { bg: '#08201f', surface: 'rgb(10 34 36 / 0.86)', surface2: 'rgb(16 48 50 / 0.92)', border: '#2f5e57', text: '#f4ecdc', muted: '#b5ab92', accent: '#e8708a', accentHover: '#f292a6', onAccent: '#2a0710' },
    art: 'linear-gradient(#0f3638, #08201f 60%, #051516)',
  },
  {
    id: 'acikhava', tr: 'Açık Hava Sineması', en: 'Drive-In', light: 'karanlık',
    idea: 'Gece arabalı sinema: sağda büyük perde, soldan projektör huzmesi, eski arabalar, ışıklı tabela',
    scene: acikhavaScene, mascot: acikhavaMascot,
    p: { bg: '#0a0920', surface: 'rgb(18 15 42 / 0.86)', surface2: 'rgb(30 24 62 / 0.92)', border: '#3c3170', text: '#f1ecff', muted: '#aaa1cf', accent: '#ff8a6b', accentHover: '#ffa58b', onAccent: '#2a0d06' },
    art: 'linear-gradient(#070618, #1a1340 60%, #0a0920)',
  },
  {
    id: 'gemi', tr: 'Transatlantik', en: 'Ocean Liner', light: 'aydınlık',
    idea: 'Şafakta okyanus: sağda yükselen dev gemi burnu ve kırmızı bacalar, doğan güneş, kâğıt bulutlar, martılar',
    scene: gemiScene, mascot: gemiMascot,
    p: { bg: '#0d1e2a', surface: 'rgb(14 30 42 / 0.86)', surface2: 'rgb(22 44 60 / 0.92)', border: '#36607a', text: '#f6efe3', muted: '#b7c0bf', accent: '#ec6a5a', accentHover: '#f4887a', onAccent: '#200806' },
    art: 'linear-gradient(#24425e, #0d1e2a)',
  },
  {
    id: 'tren-a', tr: 'Gece Ekspresi (A: saat kulesi)', en: 'Night Express', light: 'karanlık',
    idea: 'Gece treni: aerodinamik deco lokomotif ve far huzmesi, kemerli viyadük, uzak şehir, saat kulesi',
    scene: () => trenScene('a'), mascot: trenMascot,
    p: { bg: '#070a16', surface: 'rgb(14 18 34 / 0.86)', surface2: 'rgb(22 28 50 / 0.92)', border: '#2e3a5e', text: '#eef1f8', muted: '#9ea7c0', accent: '#6fd6a8', accentHover: '#92e4bf', onAccent: '#052016' },
    art: 'linear-gradient(#05070f, #0e1428 60%, #070a16)',
  },
  {
    id: 'tren-b', tr: 'Gece Ekspresi (B: gar binası)', en: 'Night Express', light: 'karanlık',
    idea: 'Gece treni: aerodinamik deco lokomotif ve far huzmesi, kemerli viyadük, uzak şehir, saat kulesi',
    scene: () => trenScene('b'), mascot: trenMascot,
    p: { bg: '#070a16', surface: 'rgb(14 18 34 / 0.86)', surface2: 'rgb(22 28 50 / 0.92)', border: '#2e3a5e', text: '#eef1f8', muted: '#9ea7c0', accent: '#6fd6a8', accentHover: '#92e4bf', onAccent: '#052016' },
    art: 'linear-gradient(#05070f, #0e1428 60%, #070a16)',
  },
  {
    id: 'tren-c', tr: 'Gece Ekspresi (C: gökdelen)', en: 'Night Express', light: 'karanlık',
    idea: 'Gece treni: aerodinamik deco lokomotif ve far huzmesi, kemerli viyadük, uzak şehir, saat kulesi',
    scene: () => trenScene('c'), mascot: trenMascot,
    p: { bg: '#070a16', surface: 'rgb(14 18 34 / 0.86)', surface2: 'rgb(22 28 50 / 0.92)', border: '#2e3a5e', text: '#eef1f8', muted: '#9ea7c0', accent: '#6fd6a8', accentHover: '#92e4bf', onAccent: '#052016' },
    art: 'linear-gradient(#05070f, #0e1428 60%, #070a16)',
  },
];

for (const c of CANDIDATES) {
  for (const [name, content] of [[`${c.id}.svg`, c.scene()], [`${c.id}-maskot.svg`, c.mascot()]]) {
    writeFileSync(new URL(name, OUT), content.replace(/\n\s*\n/g, '\n'));
    console.log(`✓ ${name} (${(content.length / 1024).toFixed(1)} KB)`);
  }
}

// ---- Önizleme sayfası: sitenin koyu arayüzü sahnenin üstünde (üst şerit, içerik alanı,
//      boş oda kartı ve sohbet). ?c=<kimlik> ile tek aday; ekran görüntüsü bundan alınır. ----

const data = CANDIDATES.map(({ id, tr, en, light, idea, p, art }) => ({ id, tr, en, light, idea, p, art }));
writeFileSync(new URL('preview.html', OUT), `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>Tema adayı</title>
<style>
html, body { margin: 0; height: 100%; overflow: hidden; font-family: system-ui, 'Segoe UI', Roboto, sans-serif; }
body { background: var(--art); color: var(--text); }
.scene { position: fixed; inset: 0; background: var(--scene) center bottom / cover no-repeat; }
.top { position: fixed; left: 0; right: 0; top: 0; height: 52px; display: flex; align-items: center; gap: 12px; padding: 0 20px; background: var(--surface); border-bottom: 1px solid var(--border); backdrop-filter: blur(6px); }
.brand { font-weight: 700; color: var(--text); }
.pill { padding: 6px 12px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); color: var(--muted); font-size: 13px; }
.grow { flex: 1; }
.btn { padding: 8px 14px; border-radius: 10px; background: var(--accent); color: var(--on-accent); font-weight: 600; font-size: 14px; border: 0; }
.area { position: fixed; top: 68px; bottom: 16px; left: 50%; width: 1280px; transform: translateX(-50%); outline: 2px dashed rgb(255 255 255 / 0.5); background: rgb(255 255 255 / 0.05); display: flex; gap: 16px; padding: 16px; box-sizing: border-box; }
.tag { position: absolute; right: 8px; top: -26px; font-size: 12px; color: #fff; background: rgb(0 0 0 / 0.55); padding: 3px 8px; border-radius: 6px; }
.video { flex: 1; border-radius: 14px; background: rgb(0 0 0 / 0.38); border: 1px solid var(--border); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; }
.mascot { width: 120px; height: 120px; background: var(--mascot) center / contain no-repeat; }
.video h2 { margin: 0; font-size: 22px; }
.video p { margin: 0; color: var(--muted); }
.side { width: 340px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; gap: 10px; font-size: 14px; }
.tabs { display: flex; gap: 6px; }
.tabs span { padding: 6px 10px; border-radius: 8px; color: var(--muted); }
.tabs span.on { background: var(--surface-2); color: var(--text); }
.msg b { color: var(--accent); margin-right: 6px; }
.input { margin-top: auto; display: flex; gap: 8px; }
.input div { flex: 1; padding: 9px 12px; border-radius: 10px; background: var(--surface-2); border: 1px solid var(--border); color: var(--muted); }
</style></head>
<body>
<div class="scene"></div>
<div class="top"><span class="brand">ScreenWithMe</span><span class="pill" id="name"></span><span class="grow"></span><span class="pill">👥 3</span><button class="btn">Davet et</button></div>
<div class="area"><span class="tag">içerik alanı · 1280 px</span>
  <div class="video"><div class="mascot"></div><h2>Henüz video yok</h2><p>Bir link yapıştır, birlikte izleyelim.</p><button class="btn">Video aç</button></div>
  <div class="side"><div class="tabs"><span class="on">Sohbet</span><span>Sıra</span><span>Kişiler</span></div>
    <div class="msg"><b>Deniz</b>Hazır mısınız?</div><div class="msg"><b>Ece</b>Mısırı aldım 🍿</div><div class="msg"><b>Can</b>Başlatıyorum!</div>
    <div class="input"><div>Mesaj yaz…</div><button class="btn">Gönder</button></div></div>
</div>
<script>
const DATA = ${JSON.stringify(data)};
const c = DATA.find((d) => d.id === new URLSearchParams(location.search).get('c')) || DATA[0];
const s = document.documentElement.style;
for (const [k, v] of Object.entries(c.p)) s.setProperty('--' + k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()).replace('surface2', 'surface-2'), v);
s.setProperty('--art', c.art);
s.setProperty('--scene', 'url(' + c.id + '.svg)');
s.setProperty('--mascot', 'url(' + c.id + '-maskot.svg)');
document.getElementById('name').textContent = 'Aday ' + (DATA.indexOf(c) + 1) + ' · ' + c.tr;
</script>
</body></html>
`);

// Hepsi bir arada: ekran görüntüleri, maskotlar ve renkler
writeFileSync(new URL('index.html', OUT), `<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><title>Art Deco tema adayları</title>
<style>
body { margin: 0; padding: 24px; background: #111; color: #eee; font-family: system-ui, 'Segoe UI', sans-serif; }
h1 { margin: 0 0 16px; font-size: 22px; }
.card { margin-bottom: 28px; background: #1b1b1b; border-radius: 12px; overflow: hidden; }
.card img.shot { width: 100%; display: block; }
.meta { display: flex; gap: 16px; align-items: center; padding: 12px 16px; flex-wrap: wrap; }
.meta img { width: 72px; height: 72px; }
.meta h2 { margin: 0; font-size: 18px; }
.meta p { margin: 4px 0 0; color: #aaa; font-size: 14px; }
.sw { display: flex; gap: 4px; margin-left: auto; }
.sw span { width: 26px; height: 26px; border-radius: 6px; border: 1px solid #333; }
</style></head><body>
<h1>Art Deco tema adayları (${CANDIDATES.length})</h1>
${data.map((c, i) => `<div class="card"><img class="shot" src="shot-${c.id}.png" alt="">
<div class="meta"><img src="${c.id}-maskot.svg" alt=""><div><h2>${i + 1}. ${c.tr} <small style="color:#888">(${c.en} · ${c.light})</small></h2><p>${c.idea}</p></div>
<div class="sw">${['bg', 'surface2', 'border', 'muted', 'text', 'accent'].map((k) => `<span title="${k}" style="background:${c.p[k]}"></span>`).join('')}</div></div></div>`).join('\n')}
</body></html>
`);
console.log('✓ preview.html, index.html');

// ---- Ekran görüntüleri (1910×900, headless Chrome) ----
if (!process.argv.includes('--no-shots')) {
  const CHROME = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].find((p) => p && existsSync(p));
  if (!CHROME) throw new Error('Chrome bulunamadı (CHROME ortam değişkeniyle yol verebilirsin).');
  const page = pathToFileURL(fileURLToPath(new URL('preview.html', OUT))).href;
  for (const c of CANDIDATES) {
    execFileSync(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
      '--allow-file-access-from-files', '--window-size=1910,900', '--virtual-time-budget=3000',
      `--screenshot=${fileURLToPath(new URL(`shot-${c.id}.png`, OUT))}`, `${page}?c=${c.id}`,
    ], { stdio: 'ignore' });
    console.log(`✓ shot-${c.id}.png`);
  }
}
