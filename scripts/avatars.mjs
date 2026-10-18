// Çizilmiş avatarlar (SVG, 64x64 yuvarlak rozet). Maskottan (mor kare) ayrı: insan ya da
// yaratık yüzleri. Kimlikler packages/shared/src/avatars.ts ile aynı olmalı.
//
//   node scripts/avatars.mjs  → apps/web/public/avatars/*.svg ve apps/extension/static/avatars/*.svg
//
// Parodiler sadece tarzı andırır: isim, logo, birebir kostüm yok.

import { mkdirSync, writeFileSync } from 'node:fs';

const OUTS = [new URL('../apps/web/public/avatars/', import.meta.url), new URL('../apps/extension/static/avatars/', import.meta.url)];
for (const out of OUTS) mkdirSync(out, { recursive: true });

const INK = '#1d1430';

const badge = (bg, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="c"><circle cx="32" cy="32" r="32"/></clipPath></defs><g clip-path="url(#c)"><rect width="64" height="64" fill="${bg}"/>${body}</g></svg>\n`;

const shoulders = (fill, extra = '') => `<path d="M6 64 Q8 45 32 43 Q56 45 58 64Z" fill="${fill}"/>${extra}`;
const neck = (skin) => `<rect x="28" y="38" width="8" height="7" fill="${skin}"/>`;
const face = (skin, cx = 32, cy = 30, r = 12) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${skin}"/>`;
const eyes = (y = 30, dx = 5, color = INK) =>
  `<ellipse cx="${32 - dx}" cy="${y}" rx="1.7" ry="2.2" fill="${color}"/><ellipse cx="${32 + dx}" cy="${y}" rx="1.7" ry="2.2" fill="${color}"/><circle cx="${32 - dx + 0.6}" cy="${y - 0.8}" r=".6" fill="#fff"/><circle cx="${32 + dx + 0.6}" cy="${y - 0.8}" r=".6" fill="#fff"/>`;
const smile = (y = 35.5, w = 4) => `<path d="M${32 - w} ${y} Q32 ${y + 3} ${32 + w} ${y}" stroke="#6b2f2f" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
const blush = (y = 34) => `<ellipse cx="24.5" cy="${y}" rx="2.2" ry="1.3" fill="#ff8fa3" opacity=".55"/><ellipse cx="39.5" cy="${y}" rx="2.2" ry="1.3" fill="#ff8fa3" opacity=".55"/>`;

const AVATARS = {
  // ---------- Tematik ----------
  astronaut: badge('#1b2550', `
${shoulders('#e9ecf5', '<rect x="38" y="50" width="8" height="5" rx="1" fill="#6ee7ff"/><circle cx="24" cy="54" r="3" fill="#ff6f91"/>')}
<circle cx="32" cy="29" r="19" fill="#f1f3fa" stroke="#c9cfe0" stroke-width="2"/>
<rect x="17" y="19" width="30" height="21" rx="10" fill="#22306b"/>
<clipPath id="v"><rect x="17" y="19" width="30" height="21" rx="10"/></clipPath>
<g clip-path="url(#v)">${face('#f2c9a8', 32, 31, 10)}${eyes(30, 4)}${smile(34.5, 3)}</g>
<path d="M21 23 Q26 20 31 21" stroke="#fff" stroke-opacity=".7" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M44 14 L48 7" stroke="#c9cfe0" stroke-width="2"/><circle cx="48.5" cy="6" r="2.5" fill="#ffd27a"/>`),

  alien: badge('#23124a', `
${shoulders('#5a3a9a', '<path d="M24 46 L32 54 L40 46" stroke="#8fe36b" stroke-width="2" fill="none"/>')}
<path d="M26 14 L21 5 M38 14 L43 5" stroke="#8fe36b" stroke-width="2" stroke-linecap="round"/><circle cx="21" cy="4.5" r="2.5" fill="#d6ff9e"/><circle cx="43" cy="4.5" r="2.5" fill="#d6ff9e"/>
<ellipse cx="32" cy="29" rx="15" ry="17" fill="#8fe36b"/>
<ellipse cx="25" cy="29" rx="5.5" ry="3.4" transform="rotate(28 25 29)" fill="#0d0d18"/><ellipse cx="39" cy="29" rx="5.5" ry="3.4" transform="rotate(-28 39 29)" fill="#0d0d18"/>
<circle cx="26.5" cy="27.5" r="1" fill="#fff"/><circle cx="40.5" cy="27.5" r="1" fill="#fff"/>
<path d="M29 38 Q32 40 35 38" stroke="#2f6b1f" stroke-width="1.4" fill="none" stroke-linecap="round"/>`),

  cyber: badge('#120a26', `
${shoulders('#1c1430', '<path d="M14 54 Q20 46 32 45 Q44 46 50 54" stroke="#05d9e8" stroke-width="1.8" fill="none"/>')}
${neck('#e9b896')}${face('#e9b896')}
<path d="M27 19 L29 6 L32 16 L34 4 L36 16 L39 7 L38 20Z" fill="#ff2a6d"/>
<rect x="18" y="25" width="28" height="9" rx="4" fill="#0b0418" stroke="#05d9e8" stroke-width="1.6"/>
<rect x="22" y="28" width="7" height="3" rx="1.5" fill="#05d9e8"/><rect x="35" y="28" width="7" height="3" rx="1.5" fill="#ff2a6d"/>
<path d="M40 36 h3 l2 2 h3" stroke="#05d9e8" stroke-width="1" fill="none"/>
<path d="M29 37.5 Q33 39 36 36.5" stroke="#6b2f2f" stroke-width="1.5" fill="none" stroke-linecap="round"/>`),

  wizard: badge('#1d2640', `
${shoulders('#7d879e')}
${face('#f1d3b8', 32, 32, 10.5)}
<path d="M22 34 Q24 38 28 37 Q32 39 36 37 Q40 38 42 34 Q44 48 37 56 Q34 60 32 62 Q30 60 27 56 Q20 48 22 34Z" fill="#f4f5fa"/>
<path d="M32 36 Q27 34 24 37 Q28 37 30 38Z M32 36 Q37 34 40 37 Q36 37 34 38Z" fill="#ffffff"/>
${eyes(30.5, 4)}
<path d="M24.5 27 Q27 25 30 26.5 M34 26.5 Q37 25 39.5 27" stroke="#f4f5fa" stroke-width="2" fill="none" stroke-linecap="round"/>
<ellipse cx="32" cy="22.5" rx="21" ry="3.6" fill="#6f788e"/>
<path d="M20 22 Q25 12 30 4 Q32 1 36 0 Q34 5 35 9 Q39 16 44 22Z" fill="#7d879e"/>
<path d="M21 21 Q32 18.5 43 21" stroke="#4b5266" stroke-width="2.4" fill="none"/>`),

  warrior: badge('#2a1f18', `
${shoulders('#8f98aa', '<circle cx="14" cy="52" r="8" fill="#aeb6c7"/><circle cx="50" cy="52" r="8" fill="#aeb6c7"/><path d="M32 46 V64" stroke="#6b7385" stroke-width="2"/>')}
${neck('#e8b48f')}${face('#e8b48f')}
${eyes(31)}
<path d="M28.5 37 H35.5" stroke="#6b2f2f" stroke-width="1.6" stroke-linecap="round"/>
<path d="M19 31 Q19 15 32 14 Q45 15 45 31 L42 31 L42 26 L22 26 L22 31Z" fill="#aeb6c7"/>
<rect x="30.5" y="26" width="3" height="9" rx="1" fill="#aeb6c7"/>
<path d="M32 14 Q40 4 48 8 Q42 8 40 12 Q36 13 33 15Z" fill="#c0392b"/>
<path d="M20 26 H44" stroke="#8f98aa" stroke-width="1.5"/>`),

  elf: badge('#173022', `
<path d="M17 28 Q16 50 20 60 L44 60 Q48 50 47 28Z" fill="#f2d27a"/>
${shoulders('#2f6b3f', '<path d="M32 44 L29 50 L32 54 L35 50Z" fill="#d6a843"/>')}
${neck('#f3d6c0')}
<path d="M21 30 L11 21 L20 34Z M43 30 L53 21 L44 34Z" fill="#f3d6c0"/>
${face('#f3d6c0')}
<path d="M20 26 Q22 16 32 16 Q42 16 44 26 Q38 21 32 21 Q26 21 20 26Z" fill="#f2d27a"/>
<path d="M21 23 Q32 18 43 23" stroke="#3f8a4f" stroke-width="1.4" fill="none"/>
<path d="M28 20 q2 -4 4 0 q-2 2 -4 0Z M33 20 q2 -4 4 0 q-2 2 -4 0Z" fill="#5fbf6f"/>
<path d="M25 30 q2 -1.6 4 0 M35 30 q2 -1.6 4 0" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
${smile(36, 3)}${blush(34)}`),

  dwarf: badge('#2b1d12', `
${shoulders('#6b4226')}
${face('#efc4a0', 32, 30, 11.5)}
<path d="M20 31 Q20 46 26 56 Q29 62 32 64 Q35 62 38 56 Q44 46 44 31 Q40 36 32 36 Q24 36 20 31Z" fill="#c8662a"/>
<path d="M28 44 V58 M36 44 V58" stroke="#a24f1c" stroke-width="2.4"/>
<circle cx="28" cy="52" r="2" fill="#d6a843"/><circle cx="36" cy="52" r="2" fill="#d6a843"/>
<path d="M27 35 Q32 33 37 35 Q32 38 27 35Z" fill="#a24f1c"/>
<circle cx="32" cy="32" r="3.2" fill="#e7a986"/>
${eyes(28.5, 4.6)}
<path d="M24.5 25.5 L29.5 26.5 M39.5 25.5 L34.5 26.5" stroke="#a24f1c" stroke-width="2.4" stroke-linecap="round"/>
<path d="M19 26 Q19 13 32 13 Q45 13 45 26Z" fill="#8b8f99"/>
<rect x="17" y="24" width="30" height="4" rx="2" fill="#6f737d"/>
<path d="M32 13 V24" stroke="#a7abb5" stroke-width="2"/>`),

  janissary: badge('#3a1220', `
${shoulders('#b8243e', '<path d="M22 46 Q32 54 42 46" stroke="#e6b85c" stroke-width="2.4" fill="none"/>')}
${neck('#e8b48f')}${face('#e8b48f')}
${eyes(30)}
<path d="M32 35 Q27 33 23.5 36 Q25 37.5 27 36.5 Q30 36 32 36.5 Q34 36 37 36.5 Q39 37.5 40.5 36 Q37 33 32 35Z" fill="#2a1a12"/>
<path d="M21 24 Q19 6 32 3 Q43 2 46 12 Q55 24 58 44 Q52 41 49 32 Q47 25 43 24Z" fill="#f5f0e6" stroke="#d8cfbd" stroke-width="1.4" stroke-linejoin="round"/>
<rect x="20" y="21" width="24" height="5.5" rx="2.7" fill="#f5f0e6" stroke="#d8cfbd" stroke-width="1.2"/>
<path d="M29 21 Q32 11 35 21Z" fill="#e6b85c"/><circle cx="32" cy="23.7" r="1.6" fill="#2fb5a8"/>`),

  horseman: badge('#2a1a10', `
<path d="M44 26 Q60 40 46 62" stroke="#8a5a2b" stroke-width="2.6" fill="none"/><path d="M45 27 L46 62" stroke="#e8d9b8" stroke-width=".8"/>
${shoulders('#7a5a32', '<path d="M12 54 H52 M14 59 H50 M20 49 H44" stroke="#5a3f20" stroke-width="1.4"/><path d="M24 44 V64 M32 44 V64 M40 44 V64" stroke="#5a3f20" stroke-width="1"/>')}
${neck('#d9a47e')}${face('#d9a47e')}
${eyes(30.5)}
<path d="M32 35.5 Q28 34 25 37 M32 35.5 Q36 34 39 37" stroke="#2a1a12" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<path d="M30 39 Q32 42 34 39" stroke="#2a1a12" stroke-width="2" fill="none"/>
<path d="M20 25 Q24 8 32 3 Q40 8 44 25Z" fill="#a0302a"/>
<path d="M18 26 Q32 20 46 26 Q46 30 44 30 Q32 25 20 30 Q18 30 18 26Z" fill="#d9c3a0"/>
<path d="M21 27 l1 2 M25 25.5 l1 2 M29 24.8 l.6 2 M33 24.8 l.4 2 M37 25.2 l.4 2 M41 26.2 l.2 2" stroke="#b8a07c" stroke-width="1"/>
<circle cx="32" cy="9" r="1.8" fill="#e6b85c"/>`),

  veiled: badge('#141238', `
${shoulders('#3b2d7a')}
<path d="M17 34 Q14 16 32 13 Q50 16 47 34 Q48 46 44 50 L20 50 Q16 46 17 34Z" fill="#3b2d7a"/>
${face('#e3b896', 32, 31, 10.5)}
<path d="M21 33 Q32 31 43 33 Q43 44 32 48 Q21 44 21 33Z" fill="#1f6f73"/>
${[23, 27, 31.5, 36, 40.5].map((x, i) => `<circle cx="${x}" cy="${i === 2 ? 32 : 32.6}" r="1.2" fill="#e8c27a"/>`).join('')}
<path d="M25 28.5 Q27 27 29.5 28.5 Q27 30 25 28.5Z M34.5 28.5 Q37 27 39 28.5 Q37 30 34.5 28.5Z" fill="#fff"/>
<circle cx="27.3" cy="28.6" r="1.2" fill="${INK}"/><circle cx="36.8" cy="28.6" r="1.2" fill="${INK}"/>
<path d="M24.5 28.3 Q27 26.3 30 28.3 M34 28.3 Q37 26.3 39.5 28.3" stroke="${INK}" stroke-width="1" fill="none"/>
<path d="M22 22 Q32 17 42 22" stroke="#e8c27a" stroke-width="1.6" fill="none"/><circle cx="32" cy="21" r="1.8" fill="#e8c27a"/>`),

  // ---------- Parodi (sadece tarzı andırır) ----------
  // Çılgın bilim insanı: dikenli açık mavi saç, tek kaş, beyaz önlük
  scientist: badge('#1f3a3a', `
${shoulders('#f1f3f6', '<path d="M26 44 L32 56 L38 44Z" fill="#7fb8c4"/>')}
${neck('#efd9c4')}
<path d="M17 28 L9 22 L17 20 L12 11 L22 15 L22 5 L29 12 L33 3 L36 12 L43 6 L42 15 L52 12 L46 20 L55 23 L47 28Z" fill="#b9d8e6"/>
<ellipse cx="32" cy="31" rx="11.5" ry="13" fill="#efd9c4"/>
<path d="M22.5 26 Q32 23 41.5 26" stroke="#8fb5c4" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<path d="M25 29.5 h4.5 M34.5 29.5 h4.5" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>
<circle cx="27.3" cy="31" r="1.4" fill="${INK}"/><circle cx="36.8" cy="31" r="1.4" fill="${INK}"/>
<path d="M27 38 Q29.5 36.5 32 38 Q34.5 39.5 37 37.5" stroke="#6b2f2f" stroke-width="1.5" fill="none" stroke-linecap="round"/>`),

  // Gergin torun: kahve saç, sarı tişört, endişeli ağız, ter damlası
  sidekick: badge('#3a2a10', `
${shoulders('#f2d13b')}
${neck('#f3d6c0')}${face('#f3d6c0', 32, 31, 12.5)}
<path d="M19.5 29 Q19 16 32 16 Q45 16 44.5 29 Q42 22 38 23 Q34 20 30 23 Q24 21 19.5 29Z" fill="#6b4a2b"/>
<circle cx="27" cy="31" r="3" fill="#fff"/><circle cx="37" cy="31" r="3" fill="#fff"/>
<circle cx="27" cy="31.3" r="1.1" fill="${INK}"/><circle cx="37" cy="31.3" r="1.1" fill="${INK}"/>
<path d="M27 38.5 q1.5 -1.5 2.5 0 q1.5 1.5 2.5 0 q1.5 -1.5 2.5 0 q1 1 2 0" stroke="#6b2f2f" stroke-width="1.4" fill="none" stroke-linecap="round"/>
<path d="M45 25 q2 3 0 5 q-2 -2 0 -5Z" fill="#7fd0ff"/>`),

  // Kimya öğretmeni: kel, köşeli gözlük, keçi sakal, açık yeşil gömlek
  chemist: badge('#20301f', `
${shoulders('#a8c686', '<path d="M26 44 L32 50 L38 44" stroke="#7f9a5f" stroke-width="2" fill="none"/>')}
${neck('#e9c4a4')}
<ellipse cx="32" cy="29" rx="12" ry="14" fill="#e9c4a4"/>
<ellipse cx="20" cy="31" rx="2" ry="3" fill="#e0b896"/><ellipse cx="44" cy="31" rx="2" ry="3" fill="#e0b896"/>
<path d="M21 23 Q22 19 25 18 M43 23 Q42 19 39 18" stroke="#8a7a68" stroke-width="1.6" fill="none"/>
<rect x="22.5" y="27" width="8" height="5.6" rx="1.2" fill="none" stroke="#1a1a1a" stroke-width="1.6"/>
<rect x="33.5" y="27" width="8" height="5.6" rx="1.2" fill="none" stroke="#1a1a1a" stroke-width="1.6"/>
<path d="M30.5 29 H33.5" stroke="#1a1a1a" stroke-width="1.4"/>
<circle cx="26.5" cy="29.8" r="1.1" fill="${INK}"/><circle cx="37.5" cy="29.8" r="1.1" fill="${INK}"/>
<path d="M24 25 L29.5 25.8 M40 25 L34.5 25.8" stroke="#6b5a48" stroke-width="1.6" stroke-linecap="round"/>
<path d="M27 37 Q32 35 37 37 Q37 43 32 44 Q27 43 27 37Z M29 38.5 Q32 37.3 35 38.5 Q32 39.5 29 38.5Z" fill="#6b5a48" fill-rule="evenodd"/>`),

  // Sinsi avukat: geriye taranmış kahve saç, açık mavi takım, renkli kravat, kocaman gülüş
  lawyer: badge('#2b1a33', `
${shoulders('#5aa0d8', '<path d="M26 43 L32 52 L38 43Z" fill="#fff"/><path d="M30 46 L32 44 L34 46 L33 58 L31 58Z" fill="#ff8a3d"/><circle cx="32" cy="49" r=".9" fill="#ffd23d"/><circle cx="32.5" cy="53" r=".9" fill="#ffd23d"/>')}
${neck('#efc7a6')}${face('#efc7a6')}
<path d="M19.5 28 Q18 15 31 14 Q43 13 45 24 Q40 18 33 19 Q27 19 24 23 Q22 24 19.5 28Z" fill="#7a4a2a"/>
<path d="M24 26 Q27 23.5 30 25.5 M34 25.5 Q37 23.5 40 26" stroke="#5a341c" stroke-width="1.6" fill="none" stroke-linecap="round"/>
${eyes(29.5, 4.8)}
<path d="M25.5 34.5 Q32 41 38.5 34.5Z" fill="#fff" stroke="#6b2f2f" stroke-width="1.3" stroke-linejoin="round"/>`),

  // Kara kılıççı: dikenli siyah saç, burnunda yara izi, koyu zırh, omzunda dev kılıç kabzası
  swordsman: badge('#121212', `
<path d="M44 64 L50 6" stroke="#5a3b22" stroke-width="5" stroke-linecap="round"/><rect x="40" y="18" width="18" height="4" rx="1.5" fill="#8f98aa" transform="rotate(6 49 20)"/>
${shoulders('#2c2f36', '<path d="M10 52 Q20 46 32 46 Q44 46 54 52" stroke="#6b7385" stroke-width="2" fill="none"/><circle cx="16" cy="54" r="6" fill="#3a3e47"/>')}
${neck('#e0b08c')}${face('#e0b08c')}
<path d="M18 28 L14 18 L21 20 L20 10 L27 16 L30 7 L34 15 L39 8 L40 17 L47 14 L44 22 L49 27 L42 24 Q32 17 22 24Z" fill="#141414"/>
<path d="M24.5 29.5 L29.5 30.5 M39.5 29.5 L34.5 30.5" stroke="#141414" stroke-width="2.2" stroke-linecap="round"/>
<path d="M25 32 Q27.3 31 29.5 32 M34.5 32 Q36.7 31 39 32" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M24 34.5 L40 31.5" stroke="#a0605a" stroke-width="1.6" stroke-linecap="round"/>
<path d="M28.5 38 H35.5" stroke="#6b2f2f" stroke-width="1.5" stroke-linecap="round"/>`),
};

for (const [id, content] of Object.entries(AVATARS)) {
  for (const out of OUTS) writeFileSync(new URL(`${id}.svg`, out), content.replace(/\n\s*\n/g, '\n'));
}
console.log(`✓ ${Object.keys(AVATARS).length} avatar → apps/web/public/avatars, apps/extension/static/avatars`);
