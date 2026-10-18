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

/**
 * Kademeli Art Deco kulesi: her kat bir öncekinden dar; yandan ışık alır (aydınlık ve
 * gölge yüz), dikey şeritler pencere gibi durur. c: { lit, shade, line, litLine, edge }.
 */
function tower(x, base, w, h, c, { litRight = true, tiers = 3, spire = 0 } = {}) {
  let s = '';
  let tx = x;
  let tw = w;
  let bottom = base;
  const shares = tiers === 1 ? [1] : tiers === 2 ? [0.72, 0.28] : [0.6, 0.24, 0.16];
  for (let t = 0; t < tiers; t++) {
    const th = h * shares[t];
    const top = bottom - th;
    const litW = tw * 0.42;
    const litX = litRight ? tx + tw - litW : tx;
    s += `<rect x="${f(tx)}" y="${f(top)}" width="${f(tw)}" height="${f(th + 1)}" fill="${c.shade}"/>`;
    s += `<rect x="${f(litX)}" y="${f(top)}" width="${f(litW)}" height="${f(th + 1)}" fill="${c.lit}"/>`;
    for (let k = tx + 5; k < tx + tw - 4; k += 7) {
      const onLit = k >= litX && k < litX + litW;
      s += `<rect x="${f(k)}" y="${f(top + 6)}" width="2" height="${f(th - 10)}" fill="${onLit ? c.litLine : c.line}"/>`;
    }
    s += `<rect x="${f(tx)}" y="${f(top)}" width="${f(tw)}" height="2.5" fill="${c.edge}"/>`;
    bottom = top;
    const nw = tw * 0.7;
    tx += (tw - nw) / 2;
    tw = nw;
  }
  if (spire) {
    const cx = tx + tw / 2;
    s += `<path d="M${f(cx - tw * 0.2)} ${f(bottom)} L${f(cx)} ${f(bottom - spire)} L${f(cx + tw * 0.2)} ${f(bottom)}Z" fill="${c.lit}"/>`;
  }
  return s;
}

/** Arkadan görülen, yüzsüz seyirci başı ve omuzları; (x, y) omuz hizası. */
function head(x, y, r, fill, rim) {
  return `<path d="M${f(x - r * 2.1)} ${f(y + r)} Q${f(x - r * 2)} ${f(y - r * 0.6)} ${f(x)} ${f(y - r * 0.7)} Q${f(x + r * 2)} ${f(y - r * 0.6)} ${f(x + r * 2.1)} ${f(y + r)}Z" fill="${fill}"/><circle cx="${f(x)}" cy="${f(y - r * 1.5)}" r="${f(r)}" fill="${fill}"${rim ? ` stroke="${rim}" stroke-width="1.4" stroke-opacity=".6"` : ''}/>`;
}

function note(x, y, s, color, o) {
  return `<g transform="translate(${f(x)} ${f(y)}) scale(${s})" fill="${color}" opacity="${o}"><ellipse rx="9" ry="6.5" transform="rotate(-20)"/><rect x="6.5" y="-44" width="3" height="44"/><path d="M9.5 -44 Q24 -36 22 -18 Q19 -30 9.5 -32Z"/></g>`;
}

// =====================================================================
// 1. PERDE AÇILIYOR (tiyatro, AYDINLIK): kadife perdeler, altın çerçeve,
//    çapraz spotlar, sahne ışıkları; arka duvarda sunburst ve kemerler
// =====================================================================

function perdeScene() {
  const S = scene();
  S.defs.push(`
<radialGradient id="wall" gradientUnits="userSpaceOnUse" cx="800" cy="860" r="1000"><stop offset="0" stop-color="#ffe9b8"/><stop offset=".3" stop-color="#f4b064"/><stop offset=".62" stop-color="#c0503c"/><stop offset="1" stop-color="#5a1424"/></radialGradient>
<linearGradient id="velvet" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a0d1a"/><stop offset=".5" stop-color="#c62a3a"/><stop offset=".64" stop-color="#e3545c"/><stop offset="1" stop-color="#5a0d1a"/></linearGradient>
<linearGradient id="fold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="50" y2="0" spreadMethod="repeat"><stop offset="0" stop-color="#6a1020"/><stop offset=".5" stop-color="#c62a3a"/><stop offset=".62" stop-color="#dc4a52"/><stop offset="1" stop-color="#6a1020"/></linearGradient>
<linearGradient id="curtShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a0510" stop-opacity=".75"/><stop offset=".75" stop-color="#2a0510" stop-opacity="0"/></linearGradient>
<linearGradient id="valShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0510" stop-opacity=".7"/><stop offset="1" stop-color="#2a0510" stop-opacity="0"/></linearGradient>
<linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e09450"/><stop offset="1" stop-color="#6e3418"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe6a6"/><stop offset=".5" stop-color="#dba443"/><stop offset="1" stop-color="#8a5a1c"/></linearGradient>
<linearGradient id="goldH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5a1c"/><stop offset=".5" stop-color="#ffe6a6"/><stop offset="1" stop-color="#8a5a1c"/></linearGradient>
${GLOW('g', 5)}${BLUR('blur', 18)}${GRAIN_DEFS}`);

  // Perde: her kıvrım ayrı bir şerit; yukarıda geniş, bağda toplanır, aşağıda açılır.
  const curtain = () => {
    const k = 8;
    const T = (t) => 300 * t;
    const M = (t) => 140 * t;
    const B = (t) => 235 * t;
    let s = '';
    for (let i = 0; i < k; i++) {
      const a = i / k;
      const b = (i + 1) / k;
      s += `<path d="M${f(T(a))} 0 L${f(T(b))} 0 Q${f(T(b) * 0.93)} 380 ${f(M(b))} 545 Q${f(M(b) * 1.08)} 720 ${f(B(b))} 900 L${f(B(a))} 900 Q${f(M(a) * 1.08)} 720 ${f(M(a))} 545 Q${f(T(a) * 0.93)} 380 ${f(T(a))} 0Z" fill="url(#velvet)"/>`;
    }
    s += `<path d="M0 0 H300 Q279 380 140 545 Q151 720 235 900 H0Z" fill="url(#curtShade)"/>`;
    // Altın bağ ve püskül
    s += `<path d="M-4 526 Q84 516 156 540 Q86 566 -4 558Z" fill="url(#gold)"/>`;
    s += `<circle cx="156" cy="542" r="10" fill="url(#gold)"/><path d="M150 550 L142 600 H170 L162 550Z" fill="url(#gold)"/>`;
    for (let x = 144; x <= 168; x += 4) s += `<line x1="${x}" y1="600" x2="${x}" y2="612" stroke="#b9822c" stroke-width="2"/>`;
    // Altın çerçeve (sahne ağzı) en kenarda
    s += `<rect x="0" y="0" width="16" height="900" fill="url(#goldH)"/><rect x="20" y="0" width="3" height="900" fill="#ffe6a6" opacity=".7"/>`;
    return s;
  };

  // Üst saçak: kıvrımlı kadife, alt kenarı fistolu, altın saçaklı
  let scal = 'M0 0 H1600 V188';
  let fringe = 'M1600 188';
  let tassels = '';
  for (let x = 1600; x > 0; x -= 100) {
    scal += ` Q${x - 50} 246 ${x - 100} 188`;
    fringe += ` Q${x - 50} 246 ${x - 100} 188`;
    tassels += `<path d="M${x - 54} 216 h8 l3 22 h-14Z" fill="url(#gold)"/>`;
  }
  scal += 'Z';

  // Sahne tahtaları: kaçış noktasına doğru
  let planks = '';
  for (let i = -16; i <= 16; i++) planks += `<line x1="${800 + i * 60}" y1="790" x2="${f(800 + i * 60 * 1.2245)}" y2="900" stroke="#5a2a12" stroke-opacity=".35" stroke-width="2"/>`;
  let foot = '';
  for (let x = 320; x <= 1280; x += 60) foot += `<path d="M${x - 14} 798 A14 9 0 0 1 ${x + 14} 798Z" fill="#fff4d0" filter="url(#g)"/>`;

  let arches = '';
  for (let k = 0; k < 5; k++) {
    const r = 420 + k * 70;
    arches += `<path d="M${800 - r} 790 A${r} ${r} 0 0 1 ${800 + r} 790" fill="none" stroke="#fff0c8" stroke-opacity="${f(0.32 - k * 0.04)}" stroke-width="${k % 2 ? 2 : 4}"/>`;
  }

  return S.svg(`
<defs>__DEFS__</defs>
<rect width="${W}" height="${H}" fill="url(#wall)"/>
${rays(800, 860, 1300, 44, ['#fff3d6'], { from: 180, to: 360, fill: 0.5, opacity: 0.16 })}
${arches}
<!-- Sahne -->
<path d="M0 790 H1600 V900 H0Z" fill="url(#floor)"/>
${planks}
<ellipse cx="800" cy="842" rx="380" ry="42" fill="#fff6dc" opacity=".45" filter="url(#blur)"/>
<rect x="0" y="782" width="${W}" height="12" fill="url(#gold)"/>
${foot}
<!-- Çapraz spotlar -->
${S.cone(300, 150, 760, 850, 160, '#fff6dc', 0.5, 0.06)}
${S.cone(1300, 150, 840, 850, 160, '#fff6dc', 0.5, 0.06)}
<!-- Perdeler -->
${curtain()}
<g transform="translate(${W} 0) scale(-1 1)">${curtain()}</g>
<!-- Saçak ve ortadaki altın yelpaze -->
<path d="${scal}" fill="url(#fold)"/>
<path d="M0 0 H1600 V160 H0Z" fill="url(#valShade)"/>
<path d="${fringe}" fill="none" stroke="url(#gold)" stroke-width="7"/>
${tassels}
${rays(800, 192, 70, 13, ['#ffe6a6', '#dba443'], { from: 180, to: 360, fill: 0.55, opacity: 0.95 })}
<circle cx="800" cy="192" r="16" fill="url(#gold)"/>
${grain(0.2)}
`);
}

function perdeMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}${GLOW('g', 4)}
<linearGradient id="vel" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="18" y2="0" spreadMethod="repeat"><stop offset="0" stop-color="#6a1020"/><stop offset=".55" stop-color="#d8414c"/><stop offset="1" stop-color="#6a1020"/></linearGradient>
<radialGradient id="spot" cx="50%" cy="60%" r="50%"><stop offset="0" stop-color="#fff2c8" stop-opacity=".75"/><stop offset="1" stop-color="#fff2c8" stop-opacity="0"/></radialGradient>
</defs>
<ellipse cx="120" cy="150" rx="96" ry="96" fill="url(#spot)"/>
<path d="M0 214 H240 V240 H0Z" fill="#c06a32"/><rect y="210" width="240" height="6" fill="#e6b85c"/>
<path d="M0 0 H62 Q46 110 26 132 Q40 176 56 214 H0Z" fill="url(#vel)"/>
<path d="M240 0 H178 Q194 110 214 132 Q200 176 184 214 H240Z" fill="url(#vel)"/>
<circle cx="28" cy="132" r="7" fill="#e6b85c"/><circle cx="212" cy="132" r="7" fill="#e6b85c"/>
<path d="M0 0 H240 V22 Q225 38 210 22 Q195 38 180 22 Q165 38 150 22 Q135 38 120 22 Q105 38 90 22 Q75 38 60 22 Q45 38 30 22 Q15 38 0 22Z" fill="url(#vel)" stroke="#e6b85c" stroke-width="3"/>
${logo(70, 98, 100, { look: [2, -1] })}
<!-- Papyon -->
<path d="M120 204 L98 192 L98 216Z M120 204 L142 192 L142 216Z" fill="#d8283a" stroke="#8a1020" stroke-width="2" stroke-linejoin="round"/>
<circle cx="120" cy="204" r="6" fill="#a81828"/>
<!-- Sahneye atılan güller -->
<circle cx="72" cy="224" r="5" fill="#e8425a"/><circle cx="176" cy="226" r="5" fill="#e8425a"/><path d="M76 226 l10 4 M172 228 l-10 3" stroke="#3a8a4a" stroke-width="2"/>
`);
}

// =====================================================================
// 2. SİNEMA SARAYI (KARANLIK): makine dairesinden salona uzanan ışık huzmesi,
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
// 3. CAZ KULÜBÜ (KARANLIK): sahnede spotun altında yüzsüz saksafoncu, davul,
//    kontrbas, eski mikrofon; tavandan sarkan deco lambalar, uçuşan notalar
// =====================================================================

function cazScene() {
  const S = scene();
  S.defs.push(`
<radialGradient id="bg" gradientUnits="userSpaceOnUse" cx="800" cy="900" r="1100"><stop offset="0" stop-color="#145058"/><stop offset=".5" stop-color="#0a262e"/><stop offset="1" stop-color="#04121a"/></radialGradient>
<linearGradient id="stage" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2814"/><stop offset="1" stop-color="#1a0c06"/></linearGradient>
<linearGradient id="wood" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a1a0a"/><stop offset=".55" stop-color="#9a5224"/><stop offset="1" stop-color="#3a1a0a"/></linearGradient>
<linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe2a0"/><stop offset="1" stop-color="#b8782a"/></linearGradient>
${GLOW('g', 4)}${BLUR('blur', 14)}${GRAIN_DEFS}`);
  const INK = '#030a0d';

  let arches = '';
  for (let k = 0; k < 6; k++) {
    const r = 360 + k * 80;
    arches += `<path d="M${800 - r} 900 V${900 - r * 0.55} Q${800 - r} ${900 - r * 1.05} 800 ${900 - r * 1.05} Q${800 + r} ${900 - r * 1.05} ${800 + r} ${900 - r * 0.55} V900" fill="none" stroke="${k % 2 ? '#3ab0a8' : '#f0a640'}" stroke-opacity="${f(0.2 - k * 0.02)}" stroke-width="3"/>`;
  }

  const lamps = [430, 800, 1170].map((x) => `
<line x1="${x}" y1="0" x2="${x}" y2="196" stroke="#1f4a52" stroke-width="2"/>
${S.cone(x, 222, x, 560, 80, '#ffd9a0', 0.16, 0)}
<path d="M${x - 28} 222 L${x - 16} 194 H${x + 16} L${x + 28} 222Z" fill="#f0a640"/><path d="M${x - 16} 194 H${x + 16}" stroke="#ffe2a0" stroke-width="2"/>
<ellipse cx="${x}" cy="224" rx="20" ry="4" fill="#fff2c8" filter="url(#g)"/>`).join('');

  // Saksafoncu: yüzsüz siluet, fötr şapka, pirinç saksafon; spot arkasından kenar ışığı
  const saxman = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s}) rotate(4)">
<g fill="${INK}" stroke="#f0a640" stroke-opacity=".45" stroke-width="1.5">
  <path d="M-24 -142 L-30 -4 L-14 -4 L-3 -118 L6 -4 L22 -4 L22 -142Z"/>
  <path d="M-20 -262 Q-32 -240 -28 -200 L-26 -140 L24 -140 L26 -200 Q28 -244 14 -262Z"/>
  <circle cx="-4" cy="-282" r="19"/>
  <ellipse cx="-4" cy="-296" rx="31" ry="6"/>
  <path d="M-22 -297 Q-22 -324 -4 -324 Q14 -324 14 -297Z"/>
  <ellipse cx="-24" cy="-3" rx="14" ry="5"/><ellipse cx="16" cy="-3" rx="14" ry="5"/>
</g>
<path d="M-22 -280 Q-34 -276 -40 -256 L-48 -172 Q-48 -150 -30 -152 Q-20 -154 -20 -172 L-22 -192" stroke="url(#brass)" stroke-width="10" fill="none" stroke-linecap="round"/>
<path d="M-30 -196 Q-20 -204 -8 -200 L-12 -186 Q-22 -190 -30 -186Z" fill="url(#brass)"/>
<path d="M-18 -250 L-44 -224 L-46 -206 M12 -248 L-8 -206 L-38 -184" stroke="${INK}" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
</g>`;

  const bass = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s}) rotate(-11)">
<line x1="0" y1="-40" x2="0" y2="0" stroke="#1a1a1a" stroke-width="3"/>
<path d="M0 -40 C-50 -40 -60 -80 -44 -110 C-34 -128 -46 -140 -40 -160 C-34 -190 -14 -196 0 -196 C14 -196 34 -190 40 -160 C46 -140 34 -128 44 -110 C60 -80 50 -40 0 -40Z" fill="url(#wood)" stroke="#f0a640" stroke-opacity=".4" stroke-width="1.5"/>
<rect x="-5" y="-310" width="10" height="120" rx="3" fill="#1a0c06"/>
<circle cx="0" cy="-316" r="9" fill="#1a0c06"/>
<path d="M-18 -120 q-6 -10 2 -20 M18 -120 q6 -10 -2 -20" stroke="#1a0c06" stroke-width="3" fill="none"/>
<rect x="-14" y="-92" width="28" height="5" fill="#d9b070"/>
${[-4.5, -1.5, 1.5, 4.5].map((d) => `<line x1="${d}" y1="-60" x2="${d * 0.5}" y2="-306" stroke="#fff2c8" stroke-opacity=".55" stroke-width=".8"/>`).join('')}
</g>`;

  const drum = `
<line x1="40" y1="840" x2="40" y2="640" stroke="#6a6a6a" stroke-width="3"/><line x1="40" y1="840" x2="22" y2="844" stroke="#6a6a6a" stroke-width="3"/><line x1="40" y1="840" x2="58" y2="844" stroke="#6a6a6a" stroke-width="3"/>
<ellipse cx="40" cy="640" rx="42" ry="6" fill="url(#brass)"/>
<circle cx="100" cy="778" r="62" fill="#7a1e22" stroke="#f1e2c4" stroke-width="7"/>
<clipPath id="dc"><circle cx="100" cy="778" r="50"/></clipPath>
<g clip-path="url(#dc)">${rays(100, 820, 80, 12, ['#f0a640'], { from: 180, to: 360, fill: 0.5, opacity: 0.85 })}</g>
<circle cx="100" cy="820" r="12" fill="#f0a640"/>`;

  const mic = `
<line x1="1372" y1="590" x2="1372" y2="840" stroke="#8a8a8a" stroke-width="3"/>
<ellipse cx="1372" cy="842" rx="24" ry="5" fill="#2a2a2a"/>
<rect x="1361" y="548" width="22" height="40" rx="9" fill="url(#brass)"/>
${[556, 564, 572, 580].map((y) => `<line x1="1363" y1="${y}" x2="1381" y2="${y}" stroke="#7a521a" stroke-width="1.5"/>`).join('')}`;

  const notes = [[420, 470, 1, 0.3], [520, 380, 0.8, 0.22], [690, 330, 1.1, 0.18], [930, 360, 0.9, 0.2], [1080, 450, 1, 0.26], [1230, 380, 0.8, 0.3], [600, 560, 0.7, 0.16], [1010, 590, 0.7, 0.16]]
    .map(([x, y, s, o]) => note(x, y, s, '#f0a640', o)).join('');

  return S.svg(`
<defs>__DEFS__</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
${arches}
${lamps}
${notes}
<!-- Sahne -->
<path d="M0 834 Q800 792 1600 834 V900 H0Z" fill="url(#stage)"/>
<path d="M0 834 Q800 792 1600 834" stroke="#f0a640" stroke-opacity=".5" stroke-width="3" fill="none"/>
<!-- Spot ve saksafoncu (sağ) -->
${S.cone(1530, 130, 1450, 860, 180, '#ffd9a0', 0.42, 0.05)}
<ellipse cx="1450" cy="846" rx="150" ry="22" fill="#ffe2b0" opacity=".45" filter="url(#blur)"/>
${saxman(1452, 846, 1.15)}
${mic}
<!-- Davul ve kontrbas (sol) -->
${S.cone(80, 130, 160, 860, 150, '#7fe0d8', 0.18, 0.02)}
${drum}
${bass(215, 846, 1)}
${grain(0.24)}
`);
}

function cazMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}
<linearGradient id="brass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe2a0"/><stop offset="1" stop-color="#b8782a"/></linearGradient>
</defs>
${note(34, 80, 0.9, '#f0a640', 0.9)}${note(206, 54, 0.7, '#3ab0a8', 0.9)}
<path d="M14 222 Q120 206 226 222 V238 H14Z" fill="#3a1a0a"/>
${logo(66, 96, 100, { look: [2, -1] })}
<!-- Fötr şapka -->
<ellipse cx="116" cy="100" rx="66" ry="12" fill="#1c2a30"/>
<path d="M76 100 Q74 58 116 56 Q158 58 156 100Z" fill="#24363e"/>
<path d="M90 70 Q116 62 142 70" stroke="#1c2a30" stroke-width="4" fill="none"/>
<rect x="77" y="86" width="78" height="10" fill="#f0a640"/>
<!-- Saksafon -->
<path d="M196 112 Q206 116 206 132 L200 206 Q198 226 180 224 Q166 222 168 204 L170 188" stroke="url(#brass)" stroke-width="12" fill="none" stroke-linecap="round"/>
<path d="M156 190 Q170 178 186 184 L182 202 Q170 198 158 204Z" fill="url(#brass)"/>
<circle cx="203" cy="152" r="3" fill="#7a521a"/><circle cx="202" cy="168" r="3" fill="#7a521a"/><circle cx="201" cy="184" r="3" fill="#7a521a"/>
`);
}

// =====================================================================
// 4. OPERA GECESİ (orta): iki yanda üç kat altın yaldızlı localar, ortada koyu
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
// 5. AÇIK HAVA SİNEMASI (KARANLIK gece): sağda büyük perde, soldan uzanan
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
// 6. ALTIN ŞEHİR (1930'lar, aydınlık): sağ üstte dev güneş ve yoğun ışınlar,
//    kâğıt kesik bulutlar, gümüş pervaneli uçak, bakır kademeli kuleler, yeşil deniz
// =====================================================================

function sehirScene() {
  const S = scene();
  const r = rng(61);
  S.defs.push(`
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a5a62"/><stop offset=".32" stop-color="#7aa596"/><stop offset=".6" stop-color="#e8d5a4"/><stop offset=".86" stop-color="#f2b46a"/><stop offset="1" stop-color="#e8955a"/></linearGradient>
<radialGradient id="fadeG" gradientUnits="userSpaceOnUse" cx="1440" cy="300" r="1250"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>
<mask id="fade"><rect width="${W}" height="${H}" fill="url(#fadeG)"/></mask>
<radialGradient id="sun" cx="40%" cy="40%" r="70%"><stop offset="0" stop-color="#fffbea"/><stop offset="1" stop-color="#ffd27a"/></radialGradient>
<linearGradient id="silver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset=".5" stop-color="#c6ccd4"/><stop offset="1" stop-color="#7c8692"/></linearGradient>
<linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a9478"/><stop offset="1" stop-color="#1c4a3e"/></linearGradient>
${SOFT('#3a2418')}${GLOW('g', 6)}${GRAIN_DEFS}`);

  const cloudC = { top: '#c8b8a6', bottom: '#8a7868', edge: '#5a4a40' };
  const clouds = [
    [30, 300, 340, 70, 1], [150, 380, 260, 52, 2], [1170, 470, 440, 72, 3], [1320, 420, 280, 52, 4],
    [620, 250, 220, 40, 5], [930, 320, 190, 36, 6],
  ].map(([x, y, w, h, s]) => S.cloud(x, y, w, h, s, cloudC)).join('');

  // Gümüş uçak: yandan, burnu hafif yukarı; pervaneler dönüyor (saydam disk)
  const plane = `<g transform="translate(220 300) rotate(-5)">
${[[-170, -6], [-200, 4], [-185, 14]].map(([x, y]) => `<line x1="${x}" y1="${y}" x2="${x + 60}" y2="${y}" stroke="#fff4dc" stroke-width="2" opacity=".6"/>`).join('')}
<path d="M-130 -6 L-152 -60 L-118 -60 L-94 -12Z" fill="url(#silver)" stroke="#6a7480" stroke-width="1.2"/>
<path d="M-150 0 Q-130 -18 -40 -20 L90 -18 Q130 -16 152 -4 Q158 2 152 8 Q120 18 60 18 L-60 14 Q-120 10 -150 4Z" fill="url(#silver)" stroke="#6a7480" stroke-width="1.2"/>
<ellipse cx="-128" cy="6" rx="36" ry="4.5" fill="#8a949e"/>
<path d="M-10 8 L64 8 L26 28 L-52 28Z" fill="#9aa4ae"/>
${Array.from({ length: 10 }, (_, i) => `<rect x="${-60 + i * 14}" y="-10" width="8" height="7" rx="2" fill="#3a4a5a"/>`).join('')}
<path d="M118 -12 L136 -10 L132 -4 L114 -5Z" fill="#2a3a4a"/>
<rect x="-150" y="-1" width="300" height="3" fill="#c8382c" opacity=".8"/>
<ellipse cx="36" cy="14" rx="26" ry="8" fill="url(#silver)"/>
<ellipse cx="64" cy="14" rx="4" ry="28" fill="#fff" opacity=".35"/><circle cx="63" cy="14" r="4" fill="#6a7480"/>
<ellipse cx="156" cy="2" rx="3.5" ry="26" fill="#fff" opacity=".35"/>
</g>`;

  // Kuleler: güneş sağda → sağ yüzleri aydınlık
  const C = { lit: '#e8995e', shade: '#8f4530', line: '#6a2e20', litLine: '#c87444', edge: '#ffd9a8' };
  const far = { lit: '#d9a07a', shade: '#a8684e', line: '#8a5040', litLine: '#c08a68', edge: '#f2d0b0' };
  let mid = '';
  for (let x = 270; x < 1320;) {
    const w = 40 + r() * 50;
    const h = 60 + r() * 120;
    mid += tower(x, 802, w, h, far, { tiers: r() < 0.5 ? 2 : 3 });
    x += w + 4 + r() * 10;
  }
  const left = [[-10, 90, 520, 0], [70, 72, 420, 0], [128, 108, 600, 70], [226, 64, 360, 0]];
  // Sağdakiler güneşin altında alçak kalır (güneş görünsün), en sağdaki yüksek
  const right = [[1300, 64, 300, 0], [1352, 96, 420, 60], [1446, 74, 340, 0], [1520, 90, 560, 0]];
  const towers = [...left, ...right].map(([x, w, h, sp]) => tower(x, 802, w, h, C, { spire: sp })).join('');

  let glitter = '';
  for (let i = 0; i < 16; i++) {
    const y = 812 + i * 5.5;
    const w = 30 + i * 9;
    glitter += `<line x1="${f(1440 - w / 2 + (r() - 0.5) * 20)}" y1="${f(y)}" x2="${f(1440 + w / 2 + (r() - 0.5) * 20)}" y2="${f(y)}" stroke="#fff2c8" stroke-width="2" opacity="${f(0.7 - i * 0.035)}" stroke-dasharray="${f(10 + r() * 20)} ${f(6 + r() * 10)}"/>`;
  }
  let ripples = '';
  for (let i = 0; i < 40; i++) {
    const x = r() * W;
    const y = 810 + r() * 85;
    ripples += `<line x1="${f(x)}" y1="${f(y)}" x2="${f(x + 20 + r() * 40)}" y2="${f(y)}" stroke="${r() < 0.5 ? '#e8995e' : '#bfe0d0'}" stroke-width="1.6" opacity="${f(0.2 + r() * 0.3)}"/>`;
  }

  return S.svg(`
<defs>__DEFS__</defs>
<rect width="${W}" height="${H}" fill="url(#sky)"/>
<g mask="url(#fade)">${rays(1440, 300, 2000, 96, ['#fff4d8', '#f3c97a', '#bfe0d0'], { fill: 0.5, opacity: 0.5 })}</g>
<circle cx="1440" cy="300" r="150" fill="none" stroke="#fff2c8" stroke-width="2" opacity=".45"/>
<circle cx="1440" cy="300" r="122" fill="none" stroke="#fff2c8" stroke-width="3" opacity=".7"/>
<circle cx="1440" cy="300" r="100" fill="url(#sun)" filter="url(#g)"/>
${clouds}

${mid}
${towers}
${plane}
<rect x="0" y="800" width="${W}" height="100" fill="url(#sea)"/>
<rect x="0" y="798" width="${W}" height="5" fill="#4a2618"/>
${ripples}
${glitter}
${grain(0.2)}
`);
}

function sehirMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}
<radialGradient id="sun" cx="40%" cy="40%" r="70%"><stop offset="0" stop-color="#fffbea"/><stop offset="1" stop-color="#ffd27a"/></radialGradient>
<linearGradient id="leather" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a8683a"/><stop offset="1" stop-color="#6a3a1c"/></linearGradient>
</defs>
${rays(200, 44, 60, 16, ['#ffd27a'], { fill: 0.5, opacity: 0.5 })}
<circle cx="200" cy="44" r="24" fill="url(#sun)"/>
<!-- Atkı rüzgârda -->
<path d="M150 190 Q190 186 226 160 Q214 182 230 186 Q196 206 150 206Z" fill="#f4ead6" stroke="#d6c8a8" stroke-width="2"/>
${logo(70, 96, 100, { look: [2, -1] })}
<!-- Pilot başlığı ve gözlük -->
<path d="M66 132 Q60 70 120 64 Q180 70 174 132 Q170 108 160 100 Q120 90 80 100 Q70 108 66 132Z" fill="url(#leather)" stroke="#4a2410" stroke-width="2.5"/>
<path d="M72 134 Q68 150 76 160 L84 156 Q78 146 80 132Z M168 134 Q172 150 164 160 L156 156 Q162 146 160 132Z" fill="url(#leather)"/>
<path d="M76 92 H164" stroke="#4a2410" stroke-width="5"/>
<circle cx="100" cy="88" r="15" fill="#9fd8d0" fill-opacity=".7" stroke="#d9a94a" stroke-width="5"/>
<circle cx="140" cy="88" r="15" fill="#9fd8d0" fill-opacity=".7" stroke="#d9a94a" stroke-width="5"/>
<path d="M94 82 q4 -4 9 -2 M134 82 q4 -4 9 -2" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
`);
}

// =====================================================================
// 7. BÜYÜK SİRK (sıcak, orta-aydınlık): çizgili çadır tavanı, flamalar, ip
//    cambazı (yüzsüz, şemsiyeli), arena halkası ve altın yıldızlar
// =====================================================================

function sirkScene() {
  const S = scene();
  S.defs.push(`
<radialGradient id="calm" gradientUnits="userSpaceOnUse" cx="800" cy="460" r="560"><stop offset="0" stop-color="#2a0606" stop-opacity=".45"/><stop offset="1" stop-color="#2a0606" stop-opacity="0"/></radialGradient>
<radialGradient id="dark" gradientUnits="userSpaceOnUse" cx="800" cy="-200" r="1100"><stop offset="0" stop-color="#1a0404" stop-opacity=".75"/><stop offset=".6" stop-color="#1a0404" stop-opacity=".25"/><stop offset="1" stop-color="#1a0404" stop-opacity=".1"/></radialGradient>
<linearGradient id="wallG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a1210"/><stop offset="1" stop-color="#2a0808"/></linearGradient>
<radialGradient id="sand" gradientUnits="userSpaceOnUse" cx="800" cy="900" r="700"><stop offset="0" stop-color="#f0cf90"/><stop offset="1" stop-color="#b8844a"/></radialGradient>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe6a6"/><stop offset="1" stop-color="#c08a2c"/></linearGradient>
${GLOW('g', 4)}${BLUR('blur', 16)}${GRAIN_DEFS}`);

  // Bayrak zinciri: iki sarkık ip, üçgen flamalar
  const bunting = (x1, y1, x2, y2, sag) => {
    const cx = (x1 + x2) / 2;
    const cy = Math.max(y1, y2) + sag;
    let s = `<path d="M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}" stroke="#f4e6c8" stroke-width="2" fill="none"/>`;
    const colors = ['#f2c14e', '#2f8f8a', '#f4e6c8', '#3a6ab0'];
    let i = 0;
    for (let t = 0.03; t < 0.98; t += 0.055) {
      const px = (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t * t * x2;
      const py = (1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t * t * y2;
      s += `<path d="M${f(px - 13)} ${f(py)} L${f(px + 13)} ${f(py)} L${f(px)} ${f(py + 30)}Z" fill="${colors[i++ % colors.length]}"/>`;
    }
    return s;
  };

  // İp ve cambaz
  const wire = [[110, 336], [800, 386], [1490, 336]];
  const wy = (x) => {
    let best = 0;
    for (let t = 0; t <= 1; t += 0.001) {
      const px = (1 - t) ** 2 * wire[0][0] + 2 * (1 - t) * t * wire[1][0] + t * t * wire[2][0];
      if (Math.abs(px - x) < 1) best = (1 - t) ** 2 * wire[0][1] + 2 * (1 - t) * t * wire[1][1] + t * t * wire[2][1];
    }
    return best;
  };
  const ax = 1392;
  const ay = wy(ax);
  const acrobat = `<g transform="translate(${ax} ${f(ay)})" fill="#1a0606">
<circle cx="0" cy="-60" r="8"/><path d="M-7 -52 L7 -52 L6 -22 L-6 -22Z"/>
<path d="M-6 -23 L-10 0 L-5 0 L0 -15 L5 0 L10 0 L6 -23Z"/>
<path d="M-28 -44 L0 -50 L28 -44" stroke="#1a0606" stroke-width="3.5" fill="none" stroke-linecap="round"/>
<line x1="28" y1="-44" x2="28" y2="-84" stroke="#1a0606" stroke-width="2.5"/>
<path d="M6 -84 Q28 -106 50 -84Z" fill="#f2c14e" stroke="#1a0606" stroke-width="2"/>
<path d="M-12 -24 Q0 -8 12 -24 L14 -18 Q0 -2 -14 -18Z" fill="#c8423a"/>
</g>`;
  const poles = [110, 1490].map((x) => `<rect x="${x - 5}" y="336" width="10" height="460" fill="#6a2a1a"/><rect x="${x - 26}" y="326" width="52" height="10" fill="url(#gold)"/>`).join('');

  // Tribün: arkadan görülen küçük seyirci başları
  let crowd = '';
  for (let row = 0; row < 4; row++) {
    const y = 668 + row * 26;
    crowd += `<rect x="0" y="${y}" width="${W}" height="26" fill="${row % 2 ? '#3a0e0c' : '#320c0a'}"/>`;
    for (let x = (row % 2) * 9; x < W; x += 18) crowd += `<circle cx="${x}" cy="${y + 2}" r="5" fill="#2a0908"/>`;
  }
  let valance = '';
  for (let x = 0; x < W; x += 60) valance += `<path d="M${x} 640 Q${x + 30} 676 ${x + 60} 640Z" fill="${(x / 60) % 2 ? '#c8423a' : '#f1dcb4'}"/>`;

  // Arena kenarı yıldızlı
  const cx = 800, cy = 960, rx = 860, ry = 200;
  let ringStars = '';
  for (let a = 196; a <= 344; a += 8) ringStars += star5(cx + Math.cos(rad(a)) * rx, cy + Math.sin(rad(a)) * ry, 8, '#ffe6a6');

  const pedestal = (x, y, extra) => `<g transform="translate(${x} ${y})">
<rect x="-46" y="-70" width="92" height="70" fill="#c8423a"/>
${[-34, -10, 14].map((dx) => `<rect x="${dx}" y="-70" width="12" height="70" fill="#f1dcb4"/>`).join('')}
<ellipse cx="0" cy="-70" rx="46" ry="12" fill="url(#gold)"/><ellipse cx="0" cy="0" rx="46" ry="10" fill="#8a2a22"/>
${star5(0, -36, 14, '#ffe6a6')}${extra}</g>`;
  const ball = `<circle cx="0" cy="-118" r="40" fill="#2f8f8a"/><path d="M-40 -118 A40 40 0 0 1 40 -118Z" fill="#f2c14e" transform="rotate(-25 0 -118)"/><circle cx="-14" cy="-132" r="8" fill="#fff" opacity=".4"/>`;
  const hoop = `<circle cx="0" cy="-150" r="60" fill="none" stroke="url(#gold)" stroke-width="9"/><circle cx="0" cy="-150" r="60" fill="none" stroke="#c8423a" stroke-width="9" stroke-dasharray="14 14"/>`;

  return S.svg(`
<defs>__DEFS__</defs>
<rect width="${W}" height="${H}" fill="#c9a57c"/>
${rays(800, -200, 1600, 40, ['#9a2e28'], { from: 0, to: 180, fill: 0.5 })}
<rect width="${W}" height="${H}" fill="url(#dark)"/>
<rect width="${W}" height="${H}" fill="url(#calm)"/>
${sparkle(420, 420, 8, '#ffe6a6', 0.8)}${sparkle(1180, 460, 7, '#ffe6a6', 0.8)}${sparkle(640, 300, 5, '#ffe6a6', 0.7)}${sparkle(980, 280, 6, '#ffe6a6', 0.7)}
${bunting(0, 214, 800, 256, 60)}${bunting(800, 256, 1600, 214, 60)}
${S.cone(800, 130, 200, 780, 120, '#fff6dc', 0.34, 0.04)}
${S.cone(800, 130, 1450, 760, 120, '#fff6dc', 0.34, 0.04)}
<rect x="0" y="640" width="${W}" height="160" fill="url(#wallG)"/>
${crowd}
${valance}
${poles}
<path d="M${wire[0][0]} ${wire[0][1]} Q${wire[1][0]} ${wire[1][1]} ${wire[2][0]} ${wire[2][1]}" stroke="#f4e6c8" stroke-width="2.5" fill="none"/>
${acrobat}
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#sand)"/>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#b33a30" stroke-width="30"/>
<ellipse cx="${cx}" cy="${cy}" rx="${rx - 15}" ry="${ry - 15}" fill="none" stroke="#ffe6a6" stroke-width="3" opacity=".7"/>
${ringStars}
<ellipse cx="200" cy="836" rx="150" ry="30" fill="#fff6dc" opacity=".35" filter="url(#blur)"/>
<ellipse cx="1450" cy="830" rx="150" ry="30" fill="#fff6dc" opacity=".35" filter="url(#blur)"/>
${pedestal(190, 850, ball)}
${pedestal(1450, 846, hoop)}
${grain(0.2)}
`);
}

function sirkMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe6a6"/><stop offset="1" stop-color="#c08a2c"/></linearGradient>
</defs>
${star5(34, 50, 12, '#f2c14e')}${star5(210, 140, 9, '#f2c14e')}${star5(200, 40, 6, '#f4e6c8')}
<path d="M20 222 Q120 204 220 222 V238 H20Z" fill="#b33a30"/><path d="M20 222 Q120 204 220 222" stroke="#ffe6a6" stroke-width="3" fill="none"/>
${logo(70, 100, 100, { look: [2, -1] })}
<!-- Eğik kırmızı silindir şapka -->
<g transform="rotate(-8 120 100)">
  <ellipse cx="120" cy="104" rx="58" ry="11" fill="#7a1a18"/>
  <path d="M86 104 L90 40 Q120 32 150 40 L154 104Z" fill="#c8302a"/>
  <rect x="88" y="84" width="64" height="14" fill="url(#gold)"/>
  <ellipse cx="120" cy="40" rx="30" ry="6" fill="#e04a40"/>
</g>
<!-- Baston -->
<line x1="186" y1="226" x2="198" y2="120" stroke="#1a0606" stroke-width="6" stroke-linecap="round"/>
<circle cx="199" cy="116" r="8" fill="url(#gold)"/>
`);
}

// =====================================================================
// 8. BALO SALONU (orta-koyu): disko küresi ve ışınları, damalı zemin, deco
//    sütunlar, yüzsüz dans eden çift (kırmızı yelpazeli)
// =====================================================================

function baloScene() {
  const S = scene();
  const r = rng(83);
  S.defs.push(`
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26112f"/><stop offset=".7" stop-color="#1c0c24"/><stop offset="1" stop-color="#0f0614"/></linearGradient>
<radialGradient id="ballGlow" gradientUnits="userSpaceOnUse" cx="1420" cy="292" r="720"><stop offset="0" stop-color="#eaa5a0" stop-opacity=".28"/><stop offset="1" stop-color="#eaa5a0" stop-opacity="0"/></radialGradient>
<radialGradient id="ball" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#d6bcc8"/><stop offset="1" stop-color="#5a3a5a"/></radialGradient>
<linearGradient id="col" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3a1e3e"/><stop offset=".5" stop-color="#8a5a6a"/><stop offset="1" stop-color="#3a1e3e"/></linearGradient>
<linearGradient id="rose" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd8c4"/><stop offset="1" stop-color="#b87060"/></linearGradient>
<linearGradient id="dress" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e05a6a"/><stop offset="1" stop-color="#8a2038"/></linearGradient>
<linearGradient id="floorFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c0c24" stop-opacity=".75"/><stop offset="1" stop-color="#1c0c24" stop-opacity="0"/></linearGradient>
<clipPath id="ballc"><circle cx="1420" cy="292" r="72"/></clipPath>
${GLOW('g', 3)}${GRAIN_DEFS}`);

  // Duvarda soluk yelpaze sırası (ortadaki hafif ayrıntı)
  let fans = '';
  for (let x = 300; x <= 1300; x += 200) fans += rays(x, 700, 110, 11, ['#eaa58e'], { from: 180, to: 360, fill: 0.45, opacity: 0.1 }) + `<path d="M${x - 110} 700 A110 110 0 0 1 ${x + 110} 700" fill="none" stroke="#eaa58e" stroke-opacity=".22" stroke-width="2"/>`;

  // Disko küresi: yüzeyde enlem/boylam çizgileri ve rastgele parlayan kareler
  let facets = '';
  for (let y = 292 - 72; y < 292 + 72; y += 12) facets += `<line x1="1340" y1="${y}" x2="1500" y2="${y}" stroke="#3a2040" stroke-opacity=".45" stroke-width="1.2"/>`;
  for (let k = 1; k < 6; k++) facets += `<ellipse cx="1420" cy="292" rx="${f(72 * Math.cos(rad(k * 15)))}" ry="72" fill="none" stroke="#3a2040" stroke-opacity=".45" stroke-width="1.2"/>`;
  for (let i = 0; i < 26; i++) facets += `<rect x="${f(1360 + r() * 110)}" y="${f(230 + r() * 120)}" width="9" height="9" fill="#fff" opacity="${f(0.3 + r() * 0.6)}"/>`;
  let beams = '';
  for (let i = 0; i < 9; i++) {
    const a = rad(110 + i * 16);
    beams += S.cone(1420, 292, f(1420 + Math.cos(a) * 1100), f(292 + Math.sin(a) * 1100), 26, '#ffe0ea', 0.2, 0);
  }
  let dots = '';
  for (let i = 0; i < 70; i++) dots += sparkle(r() * W, 200 + r() * 560, 2 + r() * 4, r() < 0.5 ? '#ffe0ea' : '#fff4d6', f(0.25 + r() * 0.5));

  // Deco sütun: oluklu gövde, yelpaze başlık
  const column = () => {
    let s = `<rect x="0" y="180" width="70" height="620" fill="url(#col)"/>`;
    for (let x = 10; x < 64; x += 12) s += `<rect x="${x}" y="200" width="3" height="590" fill="#2a1430" opacity=".6"/>`;
    s += `<path d="M-10 180 H86 V164 H-10Z" fill="url(#rose)"/>` + rays(38, 164, 50, 9, ['#ffd8c4'], { from: 180, to: 360, fill: 0.5, opacity: 0.8 });
    return s;
  };

  // Damalı zemin: kaçış noktasına doğru
  const VY = 560, Y0 = 770;
  const ys = [770, 790, 814, 844, 880, 926];
  let floor = '';
  for (let k = 0; k < ys.length - 1; k++) {
    const y1 = ys[k], y2 = ys[k + 1];
    for (let i = -26; i < 26; i++) {
      const x = (ii, y) => f(800 + ii * 70 * (y - VY) / (Y0 - VY));
      floor += `<path d="M${x(i, y1)} ${y1} L${x(i + 1, y1)} ${y1} L${x(i + 1, y2)} ${y2} L${x(i, y2)} ${y2}Z" fill="${(i + k) % 2 ? '#e2c4b8' : '#2a1430'}"/>`;
    }
  }

  // Dans eden çift: yüzsüz siluetler. Erkek frakla, kadın geriye eğilmiş, elinde yelpaze
  const INK = '#0c0610';
  const couple = `<g transform="translate(150 836)">
<path d="M48 -150 Q38 -60 14 0 L140 0 Q118 -70 76 -152Z" fill="url(#dress)"/>
<path d="M48 -150 Q54 -190 64 -206 L80 -200 Q76 -176 76 -152Z" fill="url(#dress)"/>
<circle cx="80" cy="-222" r="13" fill="${INK}"/>
<path d="M66 -204 L98 -252" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
${rays(100, -256, 40, 9, ['#e8303f', '#b81e30'], { from: 200, to: 340, fill: 0.85 })}
<g fill="${INK}">
  <circle cx="0" cy="-250" r="15"/>
  <path d="M-15 -232 L17 -232 L24 -150 L20 -120 L-18 -120 L-23 -150Z"/>
  <path d="M-20 -140 L-34 -76 L-14 -110Z"/>
  <path d="M-18 -122 L-24 0 L-11 0 L0 -100 L8 0 L21 0 L19 -122Z"/>
</g>
<path d="M14 -216 Q40 -206 58 -180" stroke="${INK}" stroke-width="9" fill="none" stroke-linecap="round"/>
<path d="M-2 -224 L4 -214 L10 -224" fill="#f4ead6"/>
</g>`;

  return S.svg(`
<defs>__DEFS__</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#ballGlow)"/>
${fans}
${beams}
${dots}
<line x1="1420" y1="0" x2="1420" y2="220" stroke="#8a5a6a" stroke-width="3"/>
<circle cx="1420" cy="292" r="72" fill="url(#ball)"/>
<g clip-path="url(#ballc)">${facets}</g>
${sparkle(1392, 252, 16, '#fff')}
${floor}
<rect x="0" y="770" width="${W}" height="130" fill="url(#floorFade)"/>
<rect x="0" y="766" width="${W}" height="5" fill="url(#rose)"/>
${column()}
<g transform="translate(${W} 0) scale(-1 1)">${column()}</g>
${couple}
${grain(0.22)}
`);
}

function baloMascot() {
  return svg(240, 240, `
<defs>${LOGO_DEFS}${GLOW('g', 3)}
<linearGradient id="rose" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd8c4"/><stop offset="1" stop-color="#c0806a"/></linearGradient>
<radialGradient id="ball" cx="38%" cy="34%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#8a6a8a"/></radialGradient>
</defs>
<line x1="200" y1="0" x2="200" y2="22" stroke="#8a5a6a" stroke-width="2"/>
<circle cx="200" cy="42" r="20" fill="url(#ball)"/>
${sparkle(176, 70, 6, '#fff')}${sparkle(30, 40, 6, '#ffe0ea')}
<path d="M10 222 H230 V238 H10Z" fill="#2a1430"/>${[10, 50, 90, 130, 170, 210].map((x) => `<rect x="${x}" y="222" width="20" height="16" fill="#e2c4b8"/>`).join('')}
${logo(70, 98, 100, { look: [2, -1] })}
<!-- Küçük taç -->
<path d="M94 102 L98 74 L110 90 L120 66 L130 90 L142 74 L146 102Z" fill="url(#rose)" stroke="#a8604e" stroke-width="2" stroke-linejoin="round"/>
<circle cx="120" cy="92" r="5" fill="#e8303f"/>
<!-- Açık kırmızı yelpaze -->
<g transform="translate(40 200)">
  ${rays(0, 0, 54, 9, ['#e8303f', '#b81e30'], { from: 200, to: 340, fill: 0.9 })}
  <path d="M-51 -18 A54 54 0 0 1 51 -18" fill="none" stroke="#ffd8c4" stroke-width="2.5" transform="rotate(0)"/>
  <circle r="5" fill="#ffd8c4"/>
</g>
`);
}

// =====================================================================
// 9. TRANSATLANTİK (şafak, aydınlık): sağda yükselen dev gemi burnu, kırmızı
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
// 10. GECE EKSPRESİ (KARANLIK): sağdan gelen aerodinamik deco lokomotif, farının
//     huzmesi, kemerli viyadük, uzak şehir ışıkları, solda saat kulesi ve sinyal
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

  // Saat kulesi (sol) ve sinyal direği
  const C = { lit: '#2e3a5e', shade: '#1a2140', line: '#141a32', litLine: '#ffd27a33', edge: '#6a7aa8' };
  const clock = `
${tower(30, 800, 200, 470, C, { litRight: true, tiers: 3, spire: 60 })}
<circle cx="130" cy="560" r="42" fill="#fff2c8" filter="url(#g)"/>
<circle cx="130" cy="560" r="42" fill="none" stroke="url(#gold)" stroke-width="5"/>
${Array.from({ length: 12 }, (_, i) => { const a = rad(i * 30); return `<line x1="${f(130 + Math.cos(a) * 32)}" y1="${f(560 + Math.sin(a) * 32)}" x2="${f(130 + Math.cos(a) * 37)}" y2="${f(560 + Math.sin(a) * 37)}" stroke="#2a2a3a" stroke-width="2"/>`; }).join('')}
<line x1="130" y1="560" x2="130" y2="532" stroke="#1a1a2a" stroke-width="4" stroke-linecap="round"/><line x1="130" y1="560" x2="150" y2="568" stroke="#1a1a2a" stroke-width="3" stroke-linecap="round"/>
<rect x="246" y="590" width="6" height="210" fill="#2a3050"/>
<rect x="236" y="586" width="26" height="54" rx="8" fill="#141a2e" stroke="#6a7aa8" stroke-width="2"/>
<circle cx="249" cy="602" r="7" fill="#3a1010"/><circle cx="249" cy="624" r="7" fill="#6fd6a8" filter="url(#g)"/>`;

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
    id: 'perde', tr: 'Perde Açılıyor', en: 'Curtain Up', light: 'aydınlık',
    idea: 'Tiyatro sahnesi: kırmızı kadife perdeler, altın çerçeve, çapraz spotlar, sahne ışıkları',
    scene: perdeScene, mascot: perdeMascot,
    p: { bg: '#2a0c14', surface: 'rgb(46 14 24 / 0.86)', surface2: 'rgb(68 22 34 / 0.92)', border: '#7a3440', text: '#fff1e2', muted: '#e2b9a2', accent: '#ffb347', accentHover: '#ffc870', onAccent: '#2a1404' },
    art: 'linear-gradient(#5a1424, #2a0c14 60%, #1a060c)',
  },
  {
    id: 'sinema', tr: 'Sinema Sarayı', en: 'Picture Palace', light: 'karanlık',
    idea: 'Eski sinema salonu: makine dairesinden uzanan ışık huzmesi, koltuk sıraları, yelpaze aplikler, film makarası',
    scene: sinemaScene, mascot: sinemaMascot,
    p: { bg: '#07080f', surface: 'rgb(14 16 28 / 0.86)', surface2: 'rgb(24 27 44 / 0.92)', border: '#2e3350', text: '#f2eee2', muted: '#a9a593', accent: '#e9b949', accentHover: '#f5cd6a', onAccent: '#1d1503' },
    art: 'linear-gradient(#0d1020, #05060c)',
  },
  {
    id: 'caz', tr: 'Caz Kulübü', en: 'Jazz Club', light: 'karanlık',
    idea: 'Konser sahnesi: spotun altında saksafoncu, davul ve kontrbas, sarkan deco lambalar, notalar',
    scene: cazScene, mascot: cazMascot,
    p: { bg: '#05161b', surface: 'rgb(8 30 36 / 0.86)', surface2: 'rgb(14 44 52 / 0.92)', border: '#1f5560', text: '#eaf6f2', muted: '#93b8b0', accent: '#f0a640', accentHover: '#f7bd66', onAccent: '#241302' },
    art: 'radial-gradient(ellipse 80% 60% at 50% 100%, #12424a, #04121a 70%)',
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
    id: 'sehir', tr: 'Altın Şehir', en: 'Golden City', light: 'aydınlık',
    idea: '1930’lar şehri: dev güneş ve ışınlar, kâğıt kesik bulutlar, gümüş pervaneli uçak, bakır kuleler, yeşil deniz',
    scene: sehirScene, mascot: sehirMascot,
    p: { bg: '#10262a', surface: 'rgb(16 36 40 / 0.86)', surface2: 'rgb(24 52 56 / 0.92)', border: '#3b6a66', text: '#fbf1de', muted: '#c3b597', accent: '#e8915a', accentHover: '#f2a878', onAccent: '#2a1206' },
    art: 'linear-gradient(#2a5a62, #10262a)',
  },
  {
    id: 'sirk', tr: 'Büyük Sirk', en: 'Big Top', light: 'orta-aydınlık',
    idea: 'Sirk çadırı: çizgili tavan, flamalar, şemsiyeli ip cambazı, arena halkası, altın yıldızlar',
    scene: sirkScene, mascot: sirkMascot,
    p: { bg: '#24090b', surface: 'rgb(42 14 14 / 0.86)', surface2: 'rgb(60 22 20 / 0.92)', border: '#7a3a2a', text: '#fff2df', muted: '#e0b896', accent: '#f2c14e', accentHover: '#ffd572', onAccent: '#2a1a02' },
    art: 'linear-gradient(#4a1210, #24090b)',
  },
  {
    id: 'balo', tr: 'Balo Salonu', en: 'Ballroom', light: 'orta-koyu',
    idea: 'Dans salonu: disko küresi ve ışınları, damalı zemin, deco sütunlar, yelpazeli dans eden çift',
    scene: baloScene, mascot: baloMascot,
    p: { bg: '#170b1d', surface: 'rgb(32 16 40 / 0.86)', surface2: 'rgb(46 24 56 / 0.92)', border: '#5e3a66', text: '#fbeef3', muted: '#c9a7b8', accent: '#eaa58e', accentHover: '#f4bda9', onAccent: '#2a1008' },
    art: 'linear-gradient(#26112f, #170b1d 70%, #0f0614)',
  },
  {
    id: 'gemi', tr: 'Transatlantik', en: 'Ocean Liner', light: 'aydınlık',
    idea: 'Şafakta okyanus: sağda yükselen dev gemi burnu ve kırmızı bacalar, doğan güneş, kâğıt bulutlar, martılar',
    scene: gemiScene, mascot: gemiMascot,
    p: { bg: '#0d1e2a', surface: 'rgb(14 30 42 / 0.86)', surface2: 'rgb(22 44 60 / 0.92)', border: '#36607a', text: '#f6efe3', muted: '#b7c0bf', accent: '#ec6a5a', accentHover: '#f4887a', onAccent: '#200806' },
    art: 'linear-gradient(#24425e, #0d1e2a)',
  },
  {
    id: 'tren', tr: 'Gece Ekspresi', en: 'Night Express', light: 'karanlık',
    idea: 'Gece treni: aerodinamik deco lokomotif ve far huzmesi, kemerli viyadük, uzak şehir, saat kulesi',
    scene: trenScene, mascot: trenMascot,
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
