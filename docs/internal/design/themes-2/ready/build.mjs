// THEME2 ready-to-drop set (Design, 10 Nov 2026): the three new themes Matinee, Graphite and Pine, in the product's own
// shapes, for lane A to copy in if the owner picks themes-2.md Q1 A or B. Writes, next to this file:
//   themes.css                 the :root[data-theme='…'] token blocks (paste into apps/web/src/styles.css)
//   pine.svg                   Pine's scene (1600 × 900; landmarks only in the right 45 % and the bottom 25 %)
//   glowbeam-<id>.svg          today's Glowbeam in each theme's costume (240 × 240, like docs/internal/design/themes/)
//   preview.html               the three costumes + Pine's scene with the hero-text zone marked
//   node docs/internal/design/themes-2/ready/build.mjs
import { writeFileSync } from 'node:fs';
const out = (name, s) => { writeFileSync(new URL(name, import.meta.url), s); console.log('✓', name, `${(s.length / 1024).toFixed(1)} KB`); };
const f = (n) => Math.round(n * 10) / 10;
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------------------------------------------------------------- tokens
export const THEMES = {
  matinee: {
    swatch: ['#f4ede1', '#b03f1c'], plain: true, en: 'Matinee', tr: 'Matine',
    note: 'Matinee: the first light theme. Warm paper, ink text, rust accent; no picture, a faint paper grain and one soft window light.',
    tokens: {
      'color-scheme': 'light', '--bg': '#f4ede1', '--surface': '#fffaf1', '--surface-2': '#efe5d4', '--border': '#d6c8b2',
      '--field-border': '#8a7a64', '--text': '#1f1a14', '--muted': '#5c5244', '--accent': '#b03f1c', '--accent-hover': '#c24a24',
      '--on-accent': '#ffffff', '--danger': '#b3261e', '--ok': '#1d7a4f', '--warn': '#8a5a00', '--glow': 'none',
      '--art': `radial-gradient(ellipse 60% 50% at 85% 0%, rgb(255 214 150 / 0.35), transparent 70%),
    radial-gradient(1px 1px at 20px 30px, rgb(120 90 50 / 0.12) 99%, transparent),
    radial-gradient(1px 1px at 70px 90px, rgb(120 90 50 / 0.1) 99%, transparent),
    linear-gradient(#f7f1e6, #f1e8d9)`,
      '--art-size': '100% 100%, 97px 103px, 131px 127px, 100% 100%',
      '--mascot': "url('/themes/matinee-maskot.svg')",
    },
  },
  graphite: {
    swatch: ['#1b1b1f', '#ffc65a'], plain: true, en: 'Graphite', tr: 'Grafit',
    note: 'Graphite: neutral grey and the brand gold; no glows, no stars, no aura. For people who want no decoration.',
    tokens: {
      '--bg': '#111113', '--surface': '#1b1b1f', '--surface-2': '#25252a', '--border': '#33333a', '--field-border': '#76767f',
      '--text': '#f2f2f4', '--muted': '#a8a8b3', '--accent': '#ffc65a', '--accent-hover': '#ffd27a', '--on-accent': '#1d1405',
      '--glow': 'none', '--art': 'linear-gradient(#17171a, #111113)', '--art-size': '100% 100%', '--aura': 'none',
      '--mascot': "url('/themes/graphite-maskot.svg')",
    },
  },
  pine: {
    swatch: ['#12231b', '#f0b85a'], plain: false, en: 'Pine Woods', tr: 'Çam Ormanı',
    note: 'Pine Woods: a forest at night, a sheet screen between two pines and a campfire; deep green, amber accent.',
    tokens: {
      '--bg': '#0b1611', '--surface': 'rgb(18 35 27 / 0.88)', '--surface-2': 'rgb(26 48 37 / 0.93)', '--border': '#2f4d3e',
      '--field-border': '#6f8c7b', '--text': '#ecf3ec', '--muted': '#a2bcab', '--accent': '#f0b85a', '--accent-hover': '#f6ca7c',
      '--on-accent': '#1f1504', '--ok': '#5fd39a', '--radius': '10px',
      '--art': 'linear-gradient(#08120e, #10251b 60%, #0b1611)', '--art-size': '100% 100%',
      '--scene': "url('/themes/pine.svg')", '--mascot': "url('/themes/pine-maskot.svg')",
    },
  },
};
let css = `/* THEME2 ready set (docs/internal/design/themes-2.md). Paste after the other theme blocks in styles.css.
   --field-border is new (inputs, selects, a toggle's off state; ≥ 3:1 on --surface): add it to :root as
   color-mix(in srgb, var(--muted) 60%, var(--surface)) and use it there, or keep these values only for the new themes. */\n`;
for (const [id, t] of Object.entries(THEMES)) {
  css += `/* ${t.note} */\n:root[data-theme='${id}'] {\n${Object.entries(t.tokens).map(([k, v]) => `  ${k}: ${v};`).join('\n')}\n}\n`;
}
css += `/* themes.ts: add to THEMES
${Object.entries(THEMES).map(([id, t]) => `  { id: '${id}', swatch: ['${t.swatch[0]}', '${t.swatch[1]}'] },`).join('\n')}
   and 'matinee', 'graphite' to PLAIN_THEMES (phones get them).
   i18n.ts / i18n-tr.ts:
${Object.entries(THEMES).map(([id, t]) => `  'theme.${id}': '${t.en}',   /  'theme.${id}': '${t.tr}',`).join('\n')}
   theme-art.mjs: copy pine.svg as public/themes/pine.svg, glowbeam-<id>.svg as public/themes/<id>-maskot.svg. */\n`;
out('themes.css', css);

// ---------------------------------------------------------------- Glowbeam in costume (today's N1, from docs/internal/design/themes/)
const glowbeam = (p, mouth = 'smile') => `<defs><linearGradient id="${p}f" gradientUnits="userSpaceOnUse" x1="4" y1="0" x2="60" y2="0"><stop offset="0" stop-color="#fff3d6"/><stop offset="0.45" stop-color="#ffc65a"/><stop offset="1" stop-color="#ff9440"/></linearGradient><radialGradient id="${p}g" gradientUnits="userSpaceOnUse" cx="40" cy="32" r="23"><stop offset="0" stop-color="#ffc65a" stop-opacity="0.45"/><stop offset="1" stop-color="#ffc65a" stop-opacity="0"/></radialGradient></defs><circle cx="40" cy="32" r="23" fill="url(#${p}g)"/><path d="M5 32 L28 17.5 A17 17 0 1 1 28 46.5 Z" fill="url(#${p}f)" stroke="url(#${p}f)" stroke-width="2" stroke-linejoin="round"/>`
  + (mouth === 'happy'
    ? `<path d="M35.4 30.6 Q38 26.6 40.6 30.6" fill="none" stroke="#1a1036" stroke-width="1.7" stroke-linecap="round"/><path d="M44.4 30.6 Q47 26.6 49.6 30.6" fill="none" stroke="#1a1036" stroke-width="1.7" stroke-linecap="round"/><path d="M38.6 36.6 Q42.5 41.6 46.4 36.6 Z" fill="#1a1036"/>`
    : `<ellipse cx="38" cy="30" rx="2.8" ry="3.9" fill="#1a1036"/><circle cx="37.2" cy="28.5" r=".84" fill="#fff" opacity=".9"/><ellipse cx="47" cy="30" rx="2.8" ry="3.9" fill="#1a1036"/><circle cx="46.2" cy="28.5" r=".84" fill="#fff" opacity=".9"/><path d="M39.5 38 Q42.5 40.4 45.5 38" fill="none" stroke="#1a1036" stroke-width="1.6" stroke-linecap="round"/>`);
const costume = (back, body, front) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">${back}<g transform="translate(26 58) scale(2.6)">${body}</g>${front}</svg>\n`;

// Matinee: a straw boater with a rust band, a ticket stub, an afternoon sun through a window.
const matinee = costume(
  `<g opacity=".9"><rect x="150" y="18" width="70" height="78" rx="6" fill="#fff4dc" stroke="#d6c8b2" stroke-width="3"/><path d="M185 18 V96 M150 57 H220" stroke="#d6c8b2" stroke-width="3"/><circle cx="200" cy="40" r="10" fill="#ffc65a" opacity=".85"/></g><path d="M0 226 H240" stroke="#d6c8b2" stroke-width="4"/>`,
  glowbeam('mt', 'happy') + `<ellipse cx="40" cy="17.4" rx="15.5" ry="3" fill="#e9c77a" stroke="#b8913e" stroke-width=".8"/><path d="M29.6 16.8 L30.6 9.6 Q40 7.4 49.4 9.6 L50.4 16.8 Z" fill="#f2d48c" stroke="#b8913e" stroke-width=".8"/><rect x="29.9" y="12.6" width="20.2" height="2.8" fill="#b03f1c"/>`,
  `<g transform="translate(36 168) rotate(-14)"><path d="M0 0 H50 V9 A4 4 0 0 0 50 17 V26 H0 V17 A4 4 0 0 0 0 9Z" fill="#b03f1c"/><path d="M36 2 V24" stroke="#fffaf1" stroke-width="1.6" stroke-dasharray="2.5 2"/><text x="17" y="17" font-family="system-ui, sans-serif" font-size="9" font-weight="800" fill="#fffaf1" text-anchor="middle">ADMIT</text></g>`,
);
// Graphite: a pencil tucked over the head and a drawn underline: no glow beyond Glowbeam's own.
const graphite = costume(
  `<path d="M30 214 Q120 202 214 214" stroke="#a8a8b3" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  glowbeam('gr') + `<g transform="rotate(-24 40 12)"><rect x="22" y="9.6" width="30" height="5.2" rx="1" fill="#ffc65a"/><rect x="22" y="9.6" width="30" height="1.7" fill="#ffe0a0"/><rect x="18.4" y="9.6" width="3.8" height="5.2" rx="1" fill="#e57a8a"/><rect x="21.6" y="9.6" width="1.6" height="5.2" fill="#9a9aa6"/><path d="M52 9.6 L58.6 12.2 L52 14.8Z" fill="#f2d6a6"/><path d="M56.6 11.4 L58.6 12.2 L56.6 13Z" fill="#2a2a30"/></g>`,
  `<g transform="translate(198 70)"><path d="M-14 0 Q0 -10 14 0 T42 0" stroke="#a8a8b3" stroke-width="3" fill="none" stroke-linecap="round" transform="scale(.6)"/><circle cx="-4" cy="18" r="2.5" fill="#ffc65a"/><circle cx="8" cy="26" r="1.8" fill="#a8a8b3"/></g>`,
);
// Pine: a knitted bobble hat, a toasted marshmallow on a stick, a little campfire.
const pine = costume(
  `<defs><radialGradient id="pnc"><stop offset="0" stop-color="#ffb347" stop-opacity=".4"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient></defs><g transform="translate(212 206) scale(.8)"><circle r="44" fill="url(#pnc)"/><path d="M-22 22 L22 10 M-22 10 L22 22" stroke="#5a3a22" stroke-width="7" stroke-linecap="round"/><path d="M-14 12 Q-16 -10 0 -30 Q4 -12 12 -16 Q18 -2 12 12Z" fill="#ff8f3a"/><path d="M-6 12 Q-8 -4 2 -16 Q4 -4 8 -6 Q10 4 6 12Z" fill="#ffd27a"/></g><path d="M0 230 H240" stroke="#2f4d3e" stroke-width="6"/>`,
  glowbeam('pn', 'happy') + `<path d="M24.6 19.4 Q26 6.6 40 6.2 Q54 6.6 55.4 19.4 Z" fill="#2f7a55"/><rect x="24" y="16.4" width="32" height="4.6" rx="2.2" fill="#e9e2cf"/><path d="M28 13 H52 M30 9.6 H50" stroke="#256045" stroke-width=".9" stroke-dasharray="1.6 1.4"/><circle cx="40" cy="4.6" r="3.6" fill="#e9e2cf"/>`,
  `<path d="M150 182 L196 124" stroke="#8a6a44" stroke-width="3.5" stroke-linecap="round"/><rect x="190" y="110" width="15" height="18" rx="5" fill="#f6ead2" transform="rotate(38 197 119)"/><path d="M193 124 Q197 118 203 121" stroke="#c9873a" stroke-width="3" fill="none" stroke-linecap="round"/>`,
);
out('glowbeam-matinee.svg', matinee);
out('glowbeam-graphite.svg', graphite);
out('glowbeam-pine.svg', pine);

// ---------------------------------------------------------------- Pine's scene
// Layout rule (themes-2.md): landmarks only at x ≥ 880 (right 45 %) or y ≥ 675 (bottom 25 %); the hero text column
// (left ~55 %, upper 75 %) gets only sky, stars and a far, dark ridge.
const W = 1600, H = 900;
function pineScene() {
  const r = rng(2611);
  let stars = '';
  for (let i = 0; i < 140; i++) {
    const x = r() * W, y = r() * 600;
    stars += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.4 + r() * 1.1)}" fill="#fff" opacity="${f((x < 880 ? 0.15 : 0.25) + r() * 0.45)}"/>`;
  }
  const tree = (x, base, h, w, fill, rim) => {
    let s = `<rect x="${f(x - w * 0.05)}" y="${f(base - h * 0.12)}" width="${f(w * 0.1)}" height="${f(h * 0.12)}" fill="#1a120c"/>`;
    const tiers = 5;
    for (let i = 0; i < tiers; i++) {
      const t = i / tiers;
      const y0 = base - h * 0.1 - h * 0.9 * t;
      const tw = w * (1 - t * 0.78);
      s += `<path d="M${f(x - tw / 2)} ${f(y0)} L${f(x)} ${f(y0 - h * 0.34)} L${f(x + tw / 2)} ${f(y0)} Z" fill="${fill}"/>`;
      if (rim) s += `<path d="M${f(x)} ${f(y0 - h * 0.34)} L${f(x + tw / 2)} ${f(y0)}" stroke="${rim}" stroke-width="1.5" opacity=".45"/>`;
    }
    return s;
  };
  // far ridge: low, in the bottom 25 % only
  let ridge = `<path d="M0 ${H} V720`;
  for (let x = 0; x <= W; x += 40) ridge += ` L${x} ${f(712 + Math.sin(x / 130) * 14 + r() * 10)}`;
  ridge += ` V${H} Z" fill="#0e2119"/>`;
  // a far treeline along the bottom (small trees, y ≥ 690)
  let far = '';
  for (let x = -10; x < W; x += 22 + r() * 18) far += tree(x, 790, 70 + r() * 50, 30 + r() * 14, '#0d1f17');
  // right side: the screen between two tall pines, the moon, a campfire
  const moon = `<circle cx="1420" cy="150" r="150" fill="url(#pnHalo)"/><circle cx="1420" cy="150" r="46" fill="#f4ecd2"/><circle cx="1404" cy="138" r="9" fill="#e2d8b8"/><circle cx="1432" cy="166" r="6" fill="#e2d8b8"/>`;
  const screen = `<path d="M1090 452 Q1240 470 1392 452" stroke="#c9b48a" stroke-width="3" fill="none"/>
<path d="M1102 460 Q1240 476 1380 460 L1384 616 Q1240 628 1098 616 Z" fill="#e9f0e6"/>
<path d="M1102 460 Q1240 476 1380 460 L1384 616 Q1240 628 1098 616 Z" fill="#cfe3d6" opacity=".55"/>
<path d="M1110 470 L1376 470 L1378 606 L1106 606 Z" fill="url(#pnPic)" opacity=".9"/>
<path d="M1240 520 L1300 600" stroke="#ffffff" stroke-opacity=".06" stroke-width="80"/>`;
  const beam = `<path d="M1180 786 L1106 470 L1378 470 L1204 786 Z" fill="url(#pnBeam)"/>`;
  const projector = `<rect x="1166" y="776" width="52" height="30" rx="6" fill="#2a2a2a"/><circle cx="1190" cy="770" r="12" fill="#3a3a3a" stroke="#777" stroke-width="2"/><circle cx="1196" cy="776" r="5" fill="#fff6d8"/>`;
  const fire = `<g transform="translate(1440 818)"><ellipse rx="190" ry="70" fill="url(#pnFire)"/><path d="M-30 18 L30 2 M-30 2 L30 18" stroke="#4a2e1a" stroke-width="10" stroke-linecap="round"/><path d="M-20 6 Q-24 -30 0 -60 Q6 -30 18 -36 Q26 -12 18 6Z" fill="#ff8f3a"/><path d="M-9 6 Q-12 -14 2 -32 Q6 -14 11 -16 Q14 -2 9 6Z" fill="#ffd27a"/></g>`;
  const logs = `<rect x="1300" y="836" width="80" height="16" rx="8" fill="#4a2e1a"/><rect x="1500" y="842" width="70" height="14" rx="7" fill="#4a2e1a"/>`;
  const big = tree(960, 880, 300, 120, '#0e2118') + tree(1600, 870, 420, 170, '#0e2118') + tree(1060, 880, 560, 210, '#12291e', '#6fa086') + tree(1530, 900, 640, 250, '#12291e', '#6fa086');
  const ground = `<path d="M0 ${H} V800 Q400 780 800 796 T1600 790 V${H} Z" fill="#0a1611"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>
<linearGradient id="pnSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#06100c"/><stop offset=".6" stop-color="#0f2419"/><stop offset="1" stop-color="#173426"/></linearGradient>
<linearGradient id="pnPic" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd9a0"/><stop offset=".55" stop-color="#ff9e6a"/><stop offset="1" stop-color="#6a4a8a"/></linearGradient>
<radialGradient id="pnHalo"><stop offset=".3" stop-color="#f4ecd2" stop-opacity=".14"/><stop offset="1" stop-color="#f4ecd2" stop-opacity="0"/></radialGradient>
<radialGradient id="pnFire"><stop offset="0" stop-color="#ffb347" stop-opacity=".35"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
<linearGradient id="pnBeam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff3c8" stop-opacity=".22"/><stop offset="1" stop-color="#fff3c8" stop-opacity="0"/></linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#pnSky)"/>${stars}${moon}${ridge}${far}${beam}${screen}${big}${ground}${projector}${logs}${fire}</svg>\n`;
}
const pineSvg = pineScene();
out('pine.svg', pineSvg);

// ---------------------------------------------------------------- preview
const swatches = Object.entries(THEMES).map(([id, t]) => `<figure style="background:${t.tokens['--bg']};color:${t.tokens['--text']}"><img src="glowbeam-${id}.svg" width="180" height="180" alt=""><figcaption>${t.en} · ${id}</figcaption></figure>`).join('');
out('preview.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>THEME2 ready set</title>
<style>body{margin:0;padding:16px;background:#222;color:#eee;font:14px system-ui,sans-serif}.row{display:flex;gap:12px;flex-wrap:wrap}figure{margin:0;padding:12px;border-radius:12px;text-align:center}
.scene{position:relative;max-width:1100px;margin-top:16px}.scene img{width:100%;display:block;border-radius:12px}.zone{position:absolute;left:0;top:0;width:55%;height:75%;border:2px dashed #ffc65a;border-radius:12px 0 0 0;box-sizing:border-box}
.zone span{position:absolute;left:8px;top:8px;background:#000a;padding:2px 6px;border-radius:4px}</style></head><body>
<div class="row">${swatches}</div>
<div class="scene"><img src="pine.svg" alt=""><div class="zone"><span>hero text zone: no landmarks</span></div></div></body></html>
`);
