// Card R14 (Design session): the parody avatars in direction A, "today's line, more detail", made from
// scripts/avatars.mjs with refined helpers (light on the face, irises with two highlights, a rim light on the
// shoulders, a small motif per avatar, ids prefixed per avatar) plus hand-drawn overrides from ./A/ and the
// near-copies made our own. Run: node docs/internal/design/avatars-2/full.mjs → ./full/*.svg (parody pages only).
// Çizilmiş avatarlar (SVG, 64x64 yuvarlak rozet). Maskottan (mor kare) ayrı: insan ya da
// yaratık yüzleri. Kimlikler packages/shared/src/avatars.ts ile aynı olmalı.
//
//   node scripts/avatars.mjs  → apps/web/public/avatars/*.svg (eklenti avatar göstermez; arayüz sitenin kendisi)
//
// Parodiler sadece tarzı andırır: isim, logo, birebir kostüm yok.

import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const OUTS = [new URL('./full/', import.meta.url)];
for (const out of OUTS) mkdirSync(out, { recursive: true });

const INK = '#1d1430';

// Arka plan: ortası açık, kenarı koyu degrade ([iç, dış]). Renk, saç ve kıyafetle zıt olacak
// ve avatarın temasına uyacak şekilde seçilir (siyah saç koyu zeminde kaybolmasın).
const badge = ([inner, outer], body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="K-c"><circle cx="32" cy="32" r="32"/></clipPath><radialGradient id="K-bg" cx="50%" cy="38%" r="68%"><stop offset="0" stop-color="${inner}"/><stop offset="1" stop-color="${outer}"/></radialGradient><radialGradient id="K-sk" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><g clip-path="url(#K-c)"><rect width="64" height="64" fill="url(#K-bg)"/><!--MOTIF-->${body}<circle cx="32" cy="32" r="31.4" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1.2"/></g></svg>\n`;

const shoulders = (fill, extra = '') => `<path d="M6 64 Q8 45 32 43 Q56 45 58 64Z" fill="${fill}"/><path d="M8.5 62 Q12 47 32 45" stroke="#fff" stroke-opacity=".18" stroke-width="1.4" fill="none"/>${extra}`;
const neck = (skin) => `<rect x="28" y="38" width="8" height="7" fill="${skin}"/><rect x="28" y="38" width="8" height="2.6" fill="#000" opacity=".12"/>`;
const face = (skin, cx = 32, cy = 30, r = 12) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${skin}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#K-sk)"/><path d="M${cx - 0.7} ${cy + 3.2} Q${cx} ${cy + 4.2} ${cx + 0.8} ${cy + 3.2}" stroke="#000" stroke-opacity=".22" stroke-width=".8" fill="none" stroke-linecap="round"/>`;
const eyes = (y = 30, dx = 5, color = INK) =>
  [32 - dx, 32 + dx].map((x) => `<ellipse cx="${x}" cy="${y}" rx="1.9" ry="2.4" fill="${color}"/><ellipse cx="${x}" cy="${y + 0.5}" rx="1.2" ry="1.4" fill="#5a4a7a" opacity=".55"/><circle cx="${x + 0.7}" cy="${y - 0.9}" r=".72" fill="#fff"/><circle cx="${x - 0.5}" cy="${y + 0.9}" r=".32" fill="#fff"/>`).join('');
const smile = (y = 35.5, w = 4) => `<path d="M${32 - w} ${y} Q32 ${y + 3} ${32 + w} ${y}" stroke="#6b2f2f" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
const blush = (y = 34) => `<ellipse cx="24.5" cy="${y}" rx="2.2" ry="1.3" fill="#ff8fa3" opacity=".55"/><ellipse cx="39.5" cy="${y}" rx="2.2" ry="1.3" fill="#ff8fa3" opacity=".55"/>`;

const AVATARS = {
  // ---------- Tematik ----------
  wizard: badge(['#4a6a9a', '#1d2a48'], `
${shoulders('#7d879e')}
${face('#f1d3b8', 32, 32, 10.5)}
<path d="M22 34 Q24 38 28 37 Q32 39 36 37 Q40 38 42 34 Q44 48 37 56 Q34 60 32 62 Q30 60 27 56 Q20 48 22 34Z" fill="#f4f5fa"/>
<path d="M32 36 Q27 34 24 37 Q28 37 30 38Z M32 36 Q37 34 40 37 Q36 37 34 38Z" fill="#ffffff"/>
${eyes(30.5, 4)}
<path d="M24.5 27 Q27 25 30 26.5 M34 26.5 Q37 25 39.5 27" stroke="#f4f5fa" stroke-width="2" fill="none" stroke-linecap="round"/>
<ellipse cx="32" cy="22.5" rx="21" ry="3.6" fill="#6f788e"/>
<path d="M20 22 Q25 12 30 4 Q32 1 36 0 Q34 5 35 9 Q39 16 44 22Z" fill="#7d879e"/>
<path d="M21 21 Q32 18.5 43 21" stroke="#4b5266" stroke-width="2.4" fill="none"/>`),

  warrior: badge(['#8a5a34', '#3a2216'], `
${shoulders('#8f98aa', '<circle cx="14" cy="52" r="8" fill="#aeb6c7"/><circle cx="50" cy="52" r="8" fill="#aeb6c7"/><path d="M32 46 V64" stroke="#6b7385" stroke-width="2"/>')}
${neck('#e8b48f')}${face('#e8b48f')}
${eyes(31)}
<path d="M28.5 37 H35.5" stroke="#6b2f2f" stroke-width="1.6" stroke-linecap="round"/>
<path d="M19 31 Q19 15 32 14 Q45 15 45 31 L42 31 L42 26 L22 26 L22 31Z" fill="#aeb6c7"/>
<rect x="30.5" y="26" width="3" height="9" rx="1" fill="#aeb6c7"/>
<path d="M32 14 Q40 4 48 8 Q42 8 40 12 Q36 13 33 15Z" fill="#c0392b"/>
<path d="M20 26 H44" stroke="#8f98aa" stroke-width="1.5"/>`),

  elf: badge(['#3f8a92', '#16383d'], `
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

  dwarf: badge(['#4f6f92', '#1f2e46'], `
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

  janissary: badge(['#34a39b', '#12403d'], `
${shoulders('#b8243e', '<path d="M22 46 Q32 54 42 46" stroke="#e6b85c" stroke-width="2.4" fill="none"/>')}
${neck('#e8b48f')}${face('#e8b48f')}
${eyes(30)}
<path d="M32 35 Q27 33 23.5 36 Q25 37.5 27 36.5 Q30 36 32 36.5 Q34 36 37 36.5 Q39 37.5 40.5 36 Q37 33 32 35Z" fill="#2a1a12"/>
<path d="M21 24 Q19 6 32 3 Q43 2 46 12 Q55 24 58 44 Q52 41 49 32 Q47 25 43 24Z" fill="#f5f0e6" stroke="#d8cfbd" stroke-width="1.4" stroke-linejoin="round"/>
<rect x="20" y="21" width="24" height="5.5" rx="2.7" fill="#f5f0e6" stroke="#d8cfbd" stroke-width="1.2"/>
<path d="M29 21 Q32 11 35 21Z" fill="#e6b85c"/><circle cx="32" cy="23.7" r="1.6" fill="#2fb5a8"/>`),

  horseman: badge(['#e0bd72', '#8a6a2a'], `
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

  veiled: badge(['#f3d58e', '#c08a34'], `
${shoulders('#3b2d7a')}
<path d="M17 34 Q14 16 32 13 Q50 16 47 34 Q48 46 44 50 L20 50 Q16 46 17 34Z" fill="#3b2d7a"/>
${face('#e3b896', 32, 31, 10.5)}
<path d="M21 33 Q32 31 43 33 Q43 44 32 48 Q21 44 21 33Z" fill="#1f6f73"/>
${[23, 27, 31.5, 36, 40.5].map((x, i) => `<circle cx="${x}" cy="${i === 2 ? 32 : 32.6}" r="1.2" fill="#e8c27a"/>`).join('')}
<path d="M25 28.5 Q27 27 29.5 28.5 Q27 30 25 28.5Z M34.5 28.5 Q37 27 39 28.5 Q37 30 34.5 28.5Z" fill="#fff"/>
<circle cx="27.3" cy="28.6" r="1.2" fill="${INK}"/><circle cx="36.8" cy="28.6" r="1.2" fill="${INK}"/>
<path d="M24.5 28.3 Q27 26.3 30 28.3 M34 28.3 Q37 26.3 39.5 28.3" stroke="${INK}" stroke-width="1" fill="none"/>
<path d="M22 22 Q32 17 42 22" stroke="#e8c27a" stroke-width="1.6" fill="none"/><circle cx="32" cy="21" r="1.8" fill="#e8c27a"/>`),

  // Art Deco temaları: Sinema Sarayı → bereli yönetmen, Opera Gecesi → opera sanatçısı,
  // Açık Hava Sineması → 3B gözlüklü sürücü, Transatlantik → kaptan, Gece Ekspresi → kondüktör

  // Bereli yönetmen: kırmızı bere, yuvarlak gözlük, keçi sakalı, kırmızı atkı, megafon
  director: badge(['#f0c95e', '#7a5210'], `
${shoulders('#2a2a33', '<path d="M20 47 Q32 53 44 47 L45 52 Q32 57 19 52Z" fill="#c8283a"/><g transform="translate(49 53) rotate(-25)"><path d="M-5 -3 L8 -8 V8 L-5 3Z" fill="#f4efe4" stroke="#2a2a33" stroke-width="1"/><rect x="-9" y="-2.5" width="4" height="5" fill="#2a2a33"/></g>')}
${neck('#f0c8a6')}${face('#f0c8a6')}
<path d="M20 31 Q19 23 24 20 H40 Q45 23 44 31 Q42.6 26 40 24.6 H24 Q21.4 26 20 31Z" fill="#3a2a22"/>
${eyes(30.6, 5)}
<circle cx="27" cy="30.6" r="3.9" fill="none" stroke="#2a2a2a" stroke-width="1.2"/><circle cx="37" cy="30.6" r="3.9" fill="none" stroke="#2a2a2a" stroke-width="1.2"/><path d="M30.9 30.4 H33.1" stroke="#2a2a2a" stroke-width="1.2"/>
<path d="M28.6 36 Q32 38 35.4 36" stroke="#6b2f2f" stroke-width="1.4" fill="none" stroke-linecap="round"/>
<path d="M28.4 39.4 Q32 38.6 35.6 39.4 Q34.4 43.6 32 44 Q29.6 43.6 28.4 39.4Z" fill="#3a2a22"/>
<path d="M17.6 23 Q15.6 12.6 30 11.4 Q46 10.4 47.2 19.6 Q46.4 24 40 22.6 Q30 20.6 17.6 23Z" fill="#b8283a"/>
<path d="M30.4 11.4 L31.4 7.4" stroke="#7a1020" stroke-width="2.2" stroke-linecap="round"/>`),

  // Opera sanatçısı: topuz saç, altın taç ve krem tüy, kapalı gözler, şarkı söyleyen ağız,
  // inci kolye, kırmızı elbise, yanda nota
  diva: badge(['#3ab0a8', '#0f3638'], `
<circle cx="32" cy="11.6" r="7" fill="#5a2418"/>
<path d="M18 33 Q16 18 32 15 Q48 18 46 33 Q44 26 40 24 Q32 21 24 24 Q20 26 18 33Z" fill="#5a2418"/>
${shoulders('#f0c8a6')}
<path d="M8 64 Q10 53 20 51 Q32 55 44 51 Q54 53 56 64Z" fill="#a42838"/>
${neck('#f0c8a6')}
${[24, 27, 30, 32, 34, 37, 40].map((x, i) => `<circle cx="${x}" cy="${[45.4, 46.8, 47.6, 47.8, 47.6, 46.8, 45.4][i]}" r="1.1" fill="#fbf6ea"/>`).join('')}
${face('#f0c8a6')}
<path d="M20 29 Q20 18.4 32 17.6 Q44 18.4 44 29 Q40.4 22.6 32 22.4 Q23.6 22.6 20 29Z" fill="#5a2418"/>
<path d="M24.6 17.6 L26.2 13.6 L28.4 16.4 L32 11.8 L35.6 16.4 L37.8 13.6 L39.4 17.6Z" fill="#e6c26a"/><circle cx="32" cy="15.6" r="1.3" fill="#e8708a"/>
<path d="M40 17 Q45 7 53 4 Q48.4 10.4 45.6 18.4Z" fill="#f4efe4"/><path d="M41.4 16.6 Q46 9 51.6 5.4" stroke="#d8cfbd" stroke-width=".7" fill="none"/>
<path d="M25 30 q2 -1.6 4 0 M35 30 q2 -1.6 4 0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<ellipse cx="32" cy="36.8" rx="2.1" ry="2.7" fill="#8a2030"/>
<circle cx="20.6" cy="34" r="1.2" fill="#fbf6ea"/><circle cx="43.4" cy="34" r="1.2" fill="#fbf6ea"/>
${blush(33.6)}
<g fill="#f0c95e"><ellipse cx="51" cy="35" rx="2.2" ry="1.6" transform="rotate(-20 51 35)"/><rect x="52.4" y="26" width="1" height="9"/><path d="M53.4 26 Q57 28 56.4 31.6 Q55.6 29 53.4 28.6Z"/></g>`),

  // Açık hava sineması sürücüsü: kabarık 50'ler saçı, kırmızı-mavi 3B gözlük, deri ceket,
  // altta direksiyon
  driver: badge(['#9a7ae0', '#1a1340'], `
${shoulders('#1f1d2a', '<path d="M26 44 L32 52 L38 44Z" fill="#f4efe4"/><path d="M22 44 L28 53 L32 47 M42 44 L36 53 L32 47" stroke="#3a3648" stroke-width="1.6" fill="none"/><circle cx="32" cy="74" r="21" fill="none" stroke="#ff8a6b" stroke-width="4"/><path d="M32 53 V60 M18 62 L26 60 M46 62 L38 60" stroke="#ff8a6b" stroke-width="3"/>')}
${neck('#e8b48f')}${face('#e8b48f')}
<path d="M19.4 29 Q17.4 15 28 11.6 Q40 8 45.6 16.4 Q46.8 22.4 44.4 29 Q43.4 22.6 40.4 20.6 Q34 22.6 26.4 20.6 Q22.4 22.6 19.4 29Z" fill="#2a1a12"/>
<path d="M27 12.4 Q33.6 4.6 42.6 8.6 Q36.6 8.8 33.4 13.4Z" fill="#2a1a12"/><path d="M29 13 Q34 9.4 39.6 10.4" stroke="#5a3a28" stroke-width="1" fill="none"/>
<path d="M19.4 29.6 H44.6" stroke="#f4efe4" stroke-width="1.2"/>
<rect x="20.6" y="26.6" width="10" height="7" rx="1.6" fill="#ff3b4a" fill-opacity=".88" stroke="#f4efe4" stroke-width="1.2"/>
<rect x="33.4" y="26.6" width="10" height="7" rx="1.6" fill="#2ec5e8" fill-opacity=".88" stroke="#f4efe4" stroke-width="1.2"/>
<path d="M27.4 37 Q32 40.4 36.6 37" stroke="#6b2f2f" stroke-width="1.5" fill="#fff" stroke-linecap="round"/>`),

  // Transatlantik kaptanı: beyaz kaptan şapkası (siyah siperlik, altın çapa), beyaz sakal,
  // lacivert ceket ve altın apoletler
  captain: badge(['#f7cf8e', '#b8603a'], `
${shoulders('#1c2a44', '<path d="M8 51 Q11 45.4 18 46 L17 52Z M56 51 Q53 45.4 46 46 L47 52Z" fill="#e6c26a"/><path d="M26 44 L32 52 L38 44Z" fill="#f4efe4"/><circle cx="29" cy="57" r="1.3" fill="#e6c26a"/><circle cx="35" cy="57" r="1.3" fill="#e6c26a"/>')}
${neck('#e8b48f')}${face('#e8b48f')}
<path d="M20 30 Q20.6 44 32 46.4 Q43.4 44 44 30 Q42 36 38 37 Q32 35.4 26 37 Q22 36 20 30Z" fill="#f2f2f2"/>
<path d="M26.6 36.4 Q32 34 37.4 36.4 Q32 38.6 26.6 36.4Z" fill="#dcdcdc"/>
<path d="M30 39.4 Q32 40.8 34 39.4" stroke="#6b2f2f" stroke-width="1.2" fill="none" stroke-linecap="round"/>
${eyes(30.4)}
<path d="M24.4 27 Q27 25.6 29.6 27 M34.4 27 Q37 25.6 39.6 27" stroke="#f2f2f2" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<path d="M17 21.4 Q16 10.6 32 9.6 Q48 10.6 47 21.4Z" fill="#fbf8f2" stroke="#d8d2c4" stroke-width="1"/>
<rect x="18" y="19.2" width="28" height="4" fill="#141a22"/>
<path d="M18 23.2 Q32 20.6 46 23.2 Q42 27.6 32 27 Q22 27.6 18 23.2Z" fill="#1e2630"/>
<g transform="translate(32 14.6)" fill="none" stroke="#d9a94a" stroke-width="1.2"><circle cy="-2.6" r="1.1"/><path d="M0 -1.5 V3 M-2.2 -.4 H2.2 M-2.6 1.6 Q0 4.4 2.6 1.6"/></g>`),

  // Gece treni kondüktörü: lacivert kasket (altın bant ve rozet), bıyık, altın düğmeli ceket
  conductor: badge(['#6fd6a8', '#1d5a46'], `
${shoulders('#1e2a4a', '<path d="M24 44 L32 49.6 L40 44" stroke="#e6c26a" stroke-width="1.3" fill="none"/><path d="M32 49.6 V64" stroke="#141a32" stroke-width="1.2"/><circle cx="29" cy="53" r="1.4" fill="#e6c26a"/><circle cx="29" cy="59" r="1.4" fill="#e6c26a"/><circle cx="35" cy="53" r="1.4" fill="#e6c26a"/><circle cx="35" cy="59" r="1.4" fill="#e6c26a"/>')}
${neck('#efc4a0')}${face('#efc4a0')}
<path d="M20.4 26 Q19.4 31 21 34.6 M43.6 26 Q44.6 31 43 34.6" stroke="#5a3a22" stroke-width="2.4" fill="none" stroke-linecap="round"/>
${eyes(31)}
<path d="M32 35.4 Q28 33.8 25.2 36.6 Q28 37.6 32 36.4 Q36 37.6 38.8 36.6 Q36 33.8 32 35.4Z" fill="#5a3a22"/>
<path d="M29.6 39.2 Q32 40.8 34.4 39.2" stroke="#6b2f2f" stroke-width="1.3" fill="none" stroke-linecap="round"/>
<path d="M19 24.4 V16.4 Q32 10.4 45 16.4 V24.4Z" fill="#1e2a4a"/>
<rect x="19" y="19.4" width="26" height="4" fill="#e6c26a"/>
<path d="M17 24.4 Q32 21.4 47 24.4 Q44 29.2 32 28.4 Q20 29.2 17 24.4Z" fill="#0c1020"/>
<circle cx="32" cy="15.6" r="2.3" fill="#e6c26a"/><circle cx="32" cy="15.6" r="1" fill="#1e2a4a"/>`),

  // ---------- Parodi (sadece tarzı andırır) ----------
  // Çılgın bilim insanı: dikenli açık mavi saç, tek kaş, beyaz önlük
  scientist: badge(['#3a8a76', '#123a32'], `
${shoulders('#f1f3f6', '<path d="M26 44 L32 56 L38 44Z" fill="#7fb8c4"/>')}
${neck('#efd9c4')}
<path d="M17 28 L9 22 L17 20 L12 11 L22 15 L22 5 L29 12 L33 3 L36 12 L43 6 L42 15 L52 12 L46 20 L55 23 L47 28Z" fill="#b9d8e6"/>
<ellipse cx="32" cy="31" rx="11.5" ry="13" fill="#efd9c4"/>
<path d="M22.5 26 Q32 23 41.5 26" stroke="#8fb5c4" stroke-width="2.6" fill="none" stroke-linecap="round"/>
<path d="M25 29.5 h4.5 M34.5 29.5 h4.5" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>
<circle cx="27.3" cy="31" r="1.4" fill="${INK}"/><circle cx="36.8" cy="31" r="1.4" fill="${INK}"/>
<path d="M27 38 Q29.5 36.5 32 38 Q34.5 39.5 37 37.5" stroke="#6b2f2f" stroke-width="1.5" fill="none" stroke-linecap="round"/>`),

  // Gergin torun: kahve saç, sarı tişört, endişeli ağız, ter damlası
  sidekick: badge(['#9ad6f2', '#3a86bd'], `
${shoulders('#f2d13b')}
${neck('#f3d6c0')}${face('#f3d6c0', 32, 31, 12.5)}
<path d="M19.5 29 Q19 16 32 16 Q45 16 44.5 29 Q42 22 38 23 Q34 20 30 23 Q24 21 19.5 29Z" fill="#6b4a2b"/>
<circle cx="27" cy="31" r="3" fill="#fff"/><circle cx="37" cy="31" r="3" fill="#fff"/>
<circle cx="27" cy="31.3" r="1.1" fill="${INK}"/><circle cx="37" cy="31.3" r="1.1" fill="${INK}"/>
<path d="M27 38.5 q1.5 -1.5 2.5 0 q1.5 1.5 2.5 0 q1.5 -1.5 2.5 0 q1 1 2 0" stroke="#6b2f2f" stroke-width="1.4" fill="none" stroke-linecap="round"/>
<path d="M45 25 q2 3 0 5 q-2 -2 0 -5Z" fill="#7fd0ff"/>`),

  // Kimya öğretmeni: kel, köşeli gözlük, keçi sakal, açık yeşil gömlek
  chemist: badge(['#e6c050', '#957018'], `
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
  lawyer: badge(['#f4ae52', '#b4601c'], `
${shoulders('#5aa0d8', '<path d="M26 43 L32 52 L38 43Z" fill="#fff"/><path d="M30 46 L32 44 L34 46 L33 58 L31 58Z" fill="#ff8a3d"/><circle cx="32" cy="49" r=".9" fill="#ffd23d"/><circle cx="32.5" cy="53" r=".9" fill="#ffd23d"/>')}
${neck('#efc7a6')}${face('#efc7a6')}
<path d="M19.5 28 Q18 15 31 14 Q43 13 45 24 Q40 18 33 19 Q27 19 24 23 Q22 24 19.5 28Z" fill="#7a4a2a"/>
<path d="M24 26 Q27 23.5 30 25.5 M34 25.5 Q37 23.5 40 26" stroke="#5a341c" stroke-width="1.6" fill="none" stroke-linecap="round"/>
${eyes(29.5, 4.8)}
<path d="M25.5 34.5 Q32 41 38.5 34.5Z" fill="#fff" stroke="#6b2f2f" stroke-width="1.3" stroke-linejoin="round"/>`),

  // Kara kılıççı: dikenli siyah saç, burnunda yara izi, koyu zırh, omzunda dev kılıç kabzası
  swordsman: badge(['#b23a42', '#4a0f14'], `
<path d="M44 64 L50 6" stroke="#5a3b22" stroke-width="5" stroke-linecap="round"/><rect x="40" y="18" width="18" height="4" rx="1.5" fill="#8f98aa" transform="rotate(6 49 20)"/>
${shoulders('#2c2f36', '<path d="M10 52 Q20 46 32 46 Q44 46 54 52" stroke="#6b7385" stroke-width="2" fill="none"/><circle cx="16" cy="54" r="6" fill="#3a3e47"/>')}
${neck('#e0b08c')}${face('#e0b08c')}
<path d="M18 28 L14 18 L21 20 L20 10 L27 16 L30 7 L34 15 L39 8 L40 17 L47 14 L44 22 L49 27 L42 24 Q32 17 22 24Z" fill="#141414"/>
<path d="M24.5 29.5 L29.5 30.5 M39.5 29.5 L34.5 30.5" stroke="#141414" stroke-width="2.2" stroke-linecap="round"/>
<path d="M25 32 Q27.3 31 29.5 32 M34.5 32 Q36.7 31 39 32" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M24 34.5 L40 31.5" stroke="#a0605a" stroke-width="1.6" stroke-linecap="round"/>
<path d="M28.5 38 H35.5" stroke="#6b2f2f" stroke-width="1.5" stroke-linecap="round"/>`),
};

Object.assign(AVATARS, {
  // ---------- Tematik kadın karakterler ----------
  // Büyücü kadın (orta çağ): uzun kızıl saç, altın taç bandı, mor cüppe, avucunda ışık
  sorceress: badge(['#7a6ac0', '#2a2050'], `
<path d="M17 30 Q14 52 19 62 L45 62 Q50 52 47 30Z" fill="#b5462a"/>
${shoulders('#5b3cc4', '<path d="M26 44 L32 50 L38 44" stroke="#d6a843" stroke-width="2" fill="none"/>')}
${neck('#f3d6c0')}${face('#f3d6c0')}
<path d="M20 28 Q20 16 32 15 Q44 16 44 28 Q40 20 32 20 Q24 20 20 28Z" fill="#b5462a"/>
<path d="M21 23 Q32 18 43 23" stroke="#d6a843" stroke-width="1.8" fill="none"/><circle cx="32" cy="20.3" r="2" fill="#8ff7e1"/>
${eyes(30.5, 4.6)}
<path d="M25 27.5 Q27 26.5 29.5 27.5 M34.5 27.5 Q37 26.5 39 27.5" stroke="#7a2a14" stroke-width="1.2" fill="none"/>
<path d="M29.5 36 Q32 37.8 34.5 36" stroke="#b03050" stroke-width="1.6" fill="none" stroke-linecap="round"/>${blush(34)}
<circle cx="50" cy="52" r="5" fill="#c9fff2" opacity=".9"/><circle cx="50" cy="52" r="8" fill="#8ff7e1" opacity=".25"/>`),

  // ---------- Parodi (sadece tarzı andırır) ----------
  // Hasır şapkalı korsan: dağınık siyah saç, hasır şapka (kırmızı bant), kırmızı açık yelek, göz altı yarası
  strawhat: badge(['#68bdf0', '#1f5a9a'], `
${shoulders('#d62f2f', '<path d="M28 44 L32 64 L36 44Z" fill="#f2c9a0"/>')}
${neck('#f2c9a0')}${face('#f2c9a0')}
<path d="M20 28 L18 22 L23 24 L22 18 L27 22 L30 17 L33 22 L37 18 L38 23 L43 21 L44 28 Q40 23 32 23 Q24 23 20 28Z" fill="#141414"/>
${eyes(30.5)}
<path d="M24 33.5 L27.5 34.5 M25 35 l1 -2" stroke="#a0505a" stroke-width="1" stroke-linecap="round"/>
<path d="M26 36 Q32 41 38 36" stroke="#6b2f2f" stroke-width="1.6" fill="#fff" stroke-linejoin="round"/>
<ellipse cx="32" cy="20" rx="20" ry="4.2" fill="#e8c35a"/>
<path d="M21 20 Q22 9 32 9 Q42 9 43 20Z" fill="#f0cf6a"/>
<path d="M21.5 17.5 Q32 15 42.5 17.5 L42.8 19.5 Q32 17 21.2 19.5Z" fill="#c62828"/>
<path d="M24 12 Q32 10.5 40 12" stroke="#c9a240" stroke-width=".8" fill="none"/>`),

  // Kaşı kıvrık aşçı: bir gözü kapatan sarı saç, kıvrık kaş, siyah takım, mavi gömlek
  cook: badge(['#56b8ae', '#1a5a55'], `
${shoulders('#1f2228', '<path d="M27 43 L32 52 L37 43Z" fill="#6aa8e0"/><path d="M31 46 h2 l1 10 h-4Z" fill="#141414"/>')}
${neck('#f2d0b0')}${face('#f2d0b0')}
<path d="M20 30 Q18 16 31 15 Q44 15 44 26 Q40 21 34 21 L33 34 Q27 33 24 37 Q20 35 20 30Z" fill="#f2d04a"/>
<ellipse cx="37" cy="30.5" rx="1.7" ry="2.2" fill="${INK}"/><circle cx="37.6" cy="29.7" r=".6" fill="#fff"/>
<path d="M34 27 Q37 25 40 27 Q41 28.5 39.5 28.8 Q39 27.6 38 28" stroke="#8a6a1a" stroke-width="1.2" fill="none" stroke-linecap="round"/>
<path d="M30 36.5 Q33 38 36 36" stroke="#6b2f2f" stroke-width="1.5" fill="none" stroke-linecap="round"/>`),

  // Yeşil saçlı kılıç ustası: kısa yeşil saç, sol gözde yara (kapalı), üç altın küpe, kılıç kabzası
  greenblade: badge(['#d0643e', '#5a1f14'], `
<path d="M12 64 L18 10" stroke="#2c2c2c" stroke-width="4" stroke-linecap="round"/><rect x="11" y="20" width="12" height="3" rx="1.2" fill="#d6a843" transform="rotate(8 17 21)"/>
${shoulders('#f4f4f4', '<path d="M8 60 Q32 54 56 60 V64 H8Z" fill="#2f7a3a"/>')}
${neck('#d9a47e')}${face('#d9a47e')}
<path d="M20 26 Q20 15 32 15 Q44 15 44 26 Q42 21 38 21 L35 19 L32 21 L29 19 L26 21 Q22 21 20 26Z" fill="#3fae4a"/>
<path d="M24 30.5 h4.5" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><path d="M26 25 L27.5 36" stroke="#a0505a" stroke-width="1.3"/>
<ellipse cx="37" cy="30.5" rx="1.7" ry="2.2" fill="${INK}"/>
<path d="M24 27 L29.5 28 M40 27 L34.5 28" stroke="#2f8a3a" stroke-width="1.8" stroke-linecap="round"/>
<path d="M29 37 H35" stroke="#6b2f2f" stroke-width="1.5" stroke-linecap="round"/>
<circle cx="19.5" cy="33" r="1" fill="#e8c35a"/><circle cx="19.8" cy="35.5" r="1" fill="#e8c35a"/><circle cx="20.2" cy="38" r="1" fill="#e8c35a"/>`),

  // Beyaz saçlı canavar avcısı: uzun beyaz saç, sarı kedi gözleri, yara izi, omzunda kılıç
  hunter: badge(['#56687c', '#1a222c'], `
<path d="M50 64 L44 6" stroke="#4a3a2a" stroke-width="4" stroke-linecap="round"/><rect x="38" y="16" width="14" height="3" rx="1.2" fill="#9aa3b5" transform="rotate(-6 45 17)"/>
<path d="M18 28 Q15 48 20 58 L44 58 Q49 48 46 28Z" fill="#e8ebf0"/>
${shoulders('#26282e', '<path d="M12 56 Q32 50 52 56" stroke="#6b5a48" stroke-width="2" fill="none"/>')}
${neck('#e2bfa0')}${face('#e2bfa0')}
<path d="M20 28 Q19 15 32 15 Q45 15 44 28 Q40 20 32 20 Q24 20 20 28Z" fill="#e8ebf0"/>
<ellipse cx="27" cy="30.5" rx="2" ry="1.8" fill="#f2c230"/><ellipse cx="37" cy="30.5" rx="2" ry="1.8" fill="#f2c230"/>
<rect x="26.6" y="29" width=".9" height="3" fill="${INK}"/><rect x="36.6" y="29" width=".9" height="3" fill="${INK}"/>
<path d="M24 27.5 L29.5 28.5 M40 27.5 L34.5 28.5" stroke="#b8bcc4" stroke-width="1.6" stroke-linecap="round"/>
<path d="M25 25 L28 35" stroke="#a0605a" stroke-width="1.2"/>
<path d="M29 37 H35" stroke="#6b2f2f" stroke-width="1.5" stroke-linecap="round"/>`),

  // Siyah paltolu hacker: geriye taranmış siyah saç, minik oval siyah gözlük, siyah palto, yeşil kod
  hacker: badge(['#1f8a4a', '#05240f'], `
<g fill="#5dff9a" opacity=".35" font-family="monospace" font-size="5"><text x="6" y="12">1 0 1</text><text x="44" y="20">0 1</text><text x="8" y="44">01</text><text x="48" y="40">1 0</text></g>
${shoulders('#101010', '<path d="M24 43 L32 58 L40 43" stroke="#2a2a2a" stroke-width="2" fill="none"/>')}
${neck('#e6c2a2')}${face('#e6c2a2')}
<path d="M20 27 Q20 15 32 15 Q44 15 44 27 Q40 18 32 19 Q24 18 20 27Z" fill="#101010"/>
<ellipse cx="27" cy="30" rx="4" ry="2.4" fill="#0a0a0a"/><ellipse cx="37" cy="30" rx="4" ry="2.4" fill="#0a0a0a"/>
<path d="M31 30 H33" stroke="#0a0a0a" stroke-width="1.2"/><path d="M25 29 l2 -0.6" stroke="#5dff9a" stroke-width=".7"/>
<path d="M29 37 H35" stroke="#6b2f2f" stroke-width="1.5" stroke-linecap="round"/>`),

  // Ejderha kraliçesi: platin örgülü saç, mavi elbise, omzunda minik ejderha
  dragonqueen: badge(['#8a3044', '#2a0c14'], `
<path d="M18 30 Q15 50 19 60 L45 60 Q49 50 46 30Z" fill="#eceae4"/>
${shoulders('#3a6ab0', '<path d="M24 46 Q32 50 40 46" stroke="#cfd8e8" stroke-width="1.5" fill="none"/>')}
${neck('#f3d6c0')}${face('#f3d6c0')}
<path d="M20 28 Q20 16 32 15 Q44 16 44 28 Q38 21 32 21 Q26 21 20 28Z" fill="#eceae4"/>
<path d="M21 25 Q32 19 43 25" stroke="#cfccc2" stroke-width="2.2" fill="none" stroke-dasharray="2 1.5"/>
${eyes(30.5, 4.6, '#4a3a8a')}
<path d="M29.5 36 Q32 37.5 34.5 36" stroke="#b03050" stroke-width="1.5" fill="none" stroke-linecap="round"/>${blush(34)}
<g transform="translate(46 44)"><path d="M-6 4 Q-2 -4 6 -2 Q10 0 8 4 Q4 8 -6 4Z" fill="#2a2a2a"/><path d="M0 -1 L-4 -9 L3 -3Z M4 -1 L6 -8 L7 -1Z" fill="#3a3a3a"/><circle cx="6" cy="1" r=".8" fill="#ff7a3d"/></g>`),

  // Kaos palyaçosu: pembe-mavi iki at kuyruğu, göz altında minik kalp, kırmızı ruj
  jester: badge(['#fff0f6', '#d2b4cc'], `
<path d="M16 22 Q6 30 9 46 Q14 40 18 30Z" fill="#ff5aa8"/><path d="M48 22 Q58 30 55 46 Q50 40 46 30Z" fill="#4a8af2"/>
${shoulders('#1a1a1a', '<path d="M8 64 V54 Q20 46 32 46 L32 64Z" fill="#d62f4f"/>')}
${neck('#fbe6dc')}${face('#fbe6dc')}
<path d="M20 26 Q20 15 32 15 L32 22 Q25 21 20 26Z" fill="#ff5aa8"/><path d="M44 26 Q44 15 32 15 L32 22 Q39 21 44 26Z" fill="#4a8af2"/>
<path d="M16 22 l4 4 M48 22 l-4 4" stroke="#1a1a1a" stroke-width="2"/>
${eyes(30.5, 4.6)}
<path d="M24.5 27.5 Q27 26 29.5 27.5 M34.5 27.5 Q37 26 39.5 27.5" stroke="${INK}" stroke-width="1" fill="none"/>
<path d="M38 34 q1 -1.2 2 0 q1 -1.2 2 0 q0 1.2 -2 2.4 q-2 -1.2 -2 -2.4Z" fill="#d62f4f"/>
<path d="M28.5 36.5 Q32 39.5 35.5 36.5 Q32 37.6 28.5 36.5Z" fill="#d62f4f"/>
<path d="M24 45 Q32 47 40 45" stroke="#d6a843" stroke-width="2" fill="none"/>`),

  // Gece bekçisi: yüzün üstünü saran kulaklı kara maske, güçlü çene, pelerin (amblem yok)
  nightguard: badge(['#f2d468', '#9c7e18'], `
<path d="M4 64 Q6 40 32 38 Q58 40 60 64Z" fill="#1c1c22"/>
${shoulders('#4a4d58')}
${neck('#e2b896')}
<path d="M20 30 Q20 18 32 17 Q44 18 44 30 L44 38 Q38 44 32 44 Q26 44 20 38Z" fill="#e2b896"/>
<path d="M19 33 L19 20 L22 9 L25 18 Q32 15 39 18 L42 9 L45 20 L45 33 Q41 36 38 33 L26 33 Q23 36 19 33Z" fill="#1c1c22"/>
<path d="M24 28 Q27 26 30 28 Q27 29.5 24 28Z M34 28 Q37 26 40 28 Q37 29.5 34 28Z" fill="#f4f4f4"/>
<path d="M29 39 H35" stroke="#6b2f2f" stroke-width="1.6" stroke-linecap="round"/>`),

  // Kedi hırsız: kedi kulaklı siyah maske, siyah saç, kırmızı ruj
  catburglar: badge(['#b47ae0', '#3e2266'], `
<path d="M18 30 Q15 50 19 58 L45 58 Q49 50 46 30Z" fill="#141414"/>
${shoulders('#141414', '<path d="M22 47 Q32 52 42 47" stroke="#6a6a7a" stroke-width="1.2" fill="none"/>')}
${neck('#f0cdb4')}${face('#f0cdb4')}
<path d="M20 30 Q19 19 22 13 L27 19 Q32 17 37 19 L42 13 Q45 19 44 30 L44 33 Q38 35 32 33 Q26 35 20 33Z" fill="#1a1a1a"/>
<path d="M23.5 29 Q27 26.5 30.5 29 Q27 31 23.5 29Z M33.5 29 Q37 26.5 40.5 29 Q37 31 33.5 29Z" fill="#9ae86a"/>
<circle cx="27" cy="29" r="1" fill="${INK}"/><circle cx="37" cy="29" r="1" fill="${INK}"/>
<path d="M29 37 Q32 39 35 37 Q32 38 29 37Z" fill="#c62838" stroke="#c62838" stroke-width="1"/>`),

  // Gotik kız: çift siyah örgü, solgun ten, beyaz yuvarlak yaka, ifadesiz bakış
  goth: badge(['#cfd8e2', '#6a7a8c'], `
<path d="M20 30 Q16 40 18 52 Q20 56 22 52 Q22 42 24 34Z M44 30 Q48 40 46 52 Q44 56 42 52 Q42 42 40 34Z" fill="#141414"/>
<path d="M18 40 h4 M18.4 46 h4 M42 40 h4 M41.6 46 h4" stroke="#2c2c2c" stroke-width="1.2"/>
${shoulders('#141414', '<path d="M22 46 Q26 50 31 46 L32 48 L33 46 Q38 50 42 46 Q38 44 32 45 Q26 44 22 46Z" fill="#f4f4f4"/>')}
${neck('#f2e6e0')}${face('#f2e6e0')}
<path d="M20 30 Q20 16 32 15 Q44 16 44 30 Q42 22 36 22 L32 20 L28 22 Q22 22 20 30Z" fill="#141414"/>
<path d="M22 22 H42" stroke="#141414" stroke-width="3"/>
${eyes(30.5, 4.6)}
<path d="M24 28 h5 M35 28 h5" stroke="#141414" stroke-width="1.2"/>
<path d="M29.5 36.5 H34.5" stroke="#5a2a3a" stroke-width="1.4" stroke-linecap="round"/>`),

  // Mağara yaratığı: kel, solgun ten, kocaman mavi gözler, birkaç tel saç, sivri kulak, altın yüzük
  cavecreature: badge(['#4f8272', '#10241d'], `
<path d="M14 64 Q16 49 32 47 Q48 49 50 64Z" fill="#b4b39a"/>
<rect x="29.5" y="40" width="5" height="8" fill="#c4c2a8"/>
<path d="M20 27 L7 20 L18 33Z M44 27 L57 20 L46 33Z" fill="#bdbba1"/>
<ellipse cx="32" cy="28" rx="14" ry="14.5" fill="#c9c7ad"/>
<path d="M27 14.5 Q25 19 26.5 23 M32 13.6 Q33.5 18 31.5 22.5 M37 14.5 Q39 19 37.3 23" stroke="#3a3a2a" stroke-width=".8" fill="none"/>
<circle cx="25.8" cy="29" r="4.8" fill="#e4edf0"/><circle cx="38.2" cy="29" r="4.8" fill="#e4edf0"/>
<circle cx="26.3" cy="29.4" r="2.8" fill="#4f93c6"/><circle cx="37.7" cy="29.4" r="2.8" fill="#4f93c6"/>
<circle cx="26.3" cy="29.4" r="1.4" fill="${INK}"/><circle cx="37.7" cy="29.4" r="1.4" fill="${INK}"/>
<circle cx="27.1" cy="28.4" r=".7" fill="#fff"/><circle cx="38.5" cy="28.4" r=".7" fill="#fff"/>
<circle cx="30.8" cy="34.2" r=".6" fill="#6a6a52"/><circle cx="33.2" cy="34.2" r=".6" fill="#6a6a52"/>
<path d="M25.5 37.2 Q32 39.6 38.5 37.2" stroke="#5a3a3a" stroke-width="1.3" fill="none" stroke-linecap="round"/>
<rect x="29.4" y="37.8" width="1.6" height="1.9" rx=".4" fill="#f2eecb"/><rect x="33.2" y="37.9" width="1.5" height="1.5" rx=".4" fill="#f2eecb"/>
<circle cx="32" cy="57" r="5.5" fill="#ffd86a" opacity=".25"/><circle cx="32" cy="57" r="3.2" fill="none" stroke="#f2c94c" stroke-width="1.7"/>`),

  // Kör toprak bükücü kız: siyah topuz, perçem, sarı saç bandı, yeşil kıyafet, soluk bakışlar
  earthgirl: badge(['#b4d07a', '#3d5a1c'], `
${shoulders('#4e8a3a', '<path d="M24 44 L32 52 L40 44" stroke="#e8c84a" stroke-width="2" fill="none"/>')}
${neck('#f3d9c4')}${face('#f3d9c4')}
<circle cx="32" cy="14" r="5.2" fill="#141414"/>
<path d="M20 28 Q19 34 21 38 M44 28 Q45 34 43 38" stroke="#141414" stroke-width="2.2" fill="none" stroke-linecap="round"/>
<path d="M19.5 30 Q18 15 32 15 Q46 15 44.5 30 Q43 24 40.5 22.5 L38.5 27 L35.5 22.5 L32 26.5 L28.5 22.5 L25.5 27 L23.5 22.5 Q21 24 19.5 30Z" fill="#141414"/>
<path d="M20.5 21 Q32 16.5 43.5 21" stroke="#e8c84a" stroke-width="1.8" fill="none"/>
<ellipse cx="27" cy="31" rx="1.9" ry="1.6" fill="#c9d2bf"/><ellipse cx="37" cy="31" rx="1.9" ry="1.6" fill="#c9d2bf"/><path d="M24.8 29.4 Q27 28.4 29.2 29.4 M34.8 29.4 Q37 28.4 39.2 29.4" stroke="#141414" stroke-width="1" fill="none"/>
<path d="M29 36.6 Q32.5 38 35.5 35.6" stroke="#6b2f2f" stroke-width="1.5" fill="none" stroke-linecap="round"/>${blush(34)}`),

  // Hava keşişi çocuk: kel, alnında mavi ok, turuncu-sarı cüppe, kocaman gülüş
  airmonk: badge(['#a6dcf6', '#3a7ab8'], `
${shoulders('#f08a2c', '<path d="M8 64 Q12 50 28 45 L40 64Z" fill="#f4cf45"/>')}
${neck('#f6dcc0')}
<ellipse cx="19.2" cy="30" rx="2.4" ry="3.4" fill="#efd0b2"/><ellipse cx="44.8" cy="30" rx="2.4" ry="3.4" fill="#efd0b2"/>
${face('#f6dcc0', 32, 29, 13)}
<path d="M30.3 16.2 L33.7 16.2 L33.7 20 L36.4 20 L32 25.2 L27.6 20 L30.3 20Z" fill="#3a8ad8"/>
${eyes(30.5, 5, '#3a3040')}
<path d="M26 35 Q32 41.5 38 35Z" fill="#fff" stroke="#6b2f2f" stroke-width="1.3" stroke-linejoin="round"/>${blush(34)}`),

  // Su bükücü kız: uzun kahve saç, yüz yanında saç halkaları, mavi kıyafet, mavi kolye
  waterfriend: badge(['#86d0ee', '#16467a'], `
<path d="M18 30 Q14 50 20 60 L44 60 Q50 50 46 30Z" fill="#4a2a18"/>
${shoulders('#2f6fb0', '<path d="M8 60 Q32 53 56 60 V64H8Z" fill="#bfe2f4"/><path d="M27 43 Q32 47 37 43" stroke="#1a3a8a" stroke-width="1.2" fill="none"/><circle cx="32" cy="46.6" r="2" fill="#3ab0e0" stroke="#e8f4ff" stroke-width=".6"/>')}
${neck('#b9805a')}${face('#b9805a')}
<path d="M20 29 Q19 15 32 15 Q45 15 44 29 Q41 20 32 20.5 Q23 20 20 29Z" fill="#4a2a18"/>
<path d="M21.5 25 Q16 30 19 36.5 Q21 33.5 21.5 30.5 M42.5 25 Q48 30 45 36.5 Q43 33.5 42.5 30.5" stroke="#4a2a18" stroke-width="2.4" fill="none"/>
<circle cx="19.4" cy="37" r="1.2" fill="#6ac0ee"/><circle cx="44.6" cy="37" r="1.2" fill="#6ac0ee"/>
${eyes(30.5, 4.6, '#234f9a')}
<path d="M29.5 36 Q32 37.8 34.5 36" stroke="#8a2a3a" stroke-width="1.5" fill="none" stroke-linecap="round"/>${blush(34)}`),

  // Deniz altı süngeri: parlak sarı kare gövde, delikler, kirpikli kocaman mavi gözler,
  // açık gülen ağız ve iki ön diş, çilli yanaklar, beyaz gömlek + kırmızı kravat
  sponge: badge(['#7adcf6', '#1a6aa8'], `
<rect x="14" y="44" width="36" height="9" fill="#fff"/><path d="M24 44 L30 49 L32 44 L34 49 L40 44Z" fill="#e6e6e6"/>
<path d="M30.7 45.5 H33.3 L34.4 52 L32 55 L29.6 52Z" fill="#e0342f"/>
<rect x="14" y="53" width="36" height="11" fill="#9a6230"/><path d="M14 55.5 H50" stroke="#2a1a10" stroke-width="1.6" stroke-dasharray="3.5 2.5"/>
<path d="M13 8 Q16.5 5.5 20 8 Q23.5 5.5 27 8 Q30.5 5.5 34 8 Q37.5 5.5 41 8 Q44.5 5.5 48 8 Q51 7 51 10 V45 H13 V10 Q13 8 13 8Z" fill="#fff36a" stroke="#d6c22e" stroke-width=".8"/>
<g fill="#cfd34a" opacity=".75"><ellipse cx="17.5" cy="14" rx="2" ry="2.6"/><ellipse cx="47" cy="16" rx="1.7" ry="2.3"/><ellipse cx="17" cy="38" rx="1.6" ry="2.2"/><ellipse cx="47" cy="39" rx="2" ry="2.6"/><ellipse cx="45" cy="10.5" rx="1.1" ry="1.3"/></g>
<circle cx="25.5" cy="22" r="6.6" fill="#fff" stroke="#2a2a2a" stroke-width=".7"/><circle cx="38.5" cy="22" r="6.6" fill="#fff" stroke="#2a2a2a" stroke-width=".7"/>
<circle cx="26.5" cy="22.4" r="3.2" fill="#46b4f0"/><circle cx="37.5" cy="22.4" r="3.2" fill="#46b4f0"/>
<circle cx="26.5" cy="22.4" r="1.5" fill="${INK}"/><circle cx="37.5" cy="22.4" r="1.5" fill="${INK}"/>
<circle cx="27.4" cy="21.3" r=".8" fill="#fff"/><circle cx="38.4" cy="21.3" r=".8" fill="#fff"/>
<path d="M21.5 16.2 L20.3 13.6 M25.5 15.4 V12.6 M29.5 16.2 L30.7 13.6 M34.5 16.2 L33.3 13.6 M38.5 15.4 V12.6 M42.5 16.2 L43.7 13.6" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>
<path d="M31 26 Q29.6 30 31.4 31.4 Q33.6 32 33.4 29.4 Q33 27 32.6 26Z" fill="#f1e050"/>
<circle cx="18.6" cy="31" r="3" fill="#f6a24e" opacity=".55"/><circle cx="45.4" cy="31" r="3" fill="#f6a24e" opacity=".55"/>
<g fill="#c8862a"><circle cx="17.6" cy="30.4" r=".5"/><circle cx="19.4" cy="31.6" r=".5"/><circle cx="44.6" cy="30.4" r=".5"/><circle cx="46.4" cy="31.6" r=".5"/></g>
<path d="M21 31.5 Q32 33.5 43 31.5 Q40 42 32 42 Q24 42 21 31.5Z" fill="#7a1f1f" stroke="#5a1a10" stroke-width=".8"/>
<path d="M26 38.6 Q32 36 38 38.6 Q35 41.6 32 41.6 Q29 41.6 26 38.6Z" fill="#ff7f8a"/>
<rect x="28.4" y="32.2" width="3.4" height="3.6" rx=".6" fill="#fff" stroke="#5a1a10" stroke-width=".5"/><rect x="32.2" y="32.2" width="3.4" height="3.6" rx=".6" fill="#fff" stroke="#5a1a10" stroke-width=".5"/>`),

  // Pembe deniz yıldızı: tombul yuvarlak uçlu yıldız, birbirine yakın gözler, ince kaşlar,
  // kocaman gülüş, çiçekli yeşil şort
  starfish: badge(['#fdf0c4', '#d9a648'], `
<path d="M28.6 6 Q32 1.6 35.4 6 Q39.6 16 43 22.5 Q53 22.6 58.4 26.6 Q62 30.6 57.6 34 Q50 39 46.6 43 L49 64 H15 L17.4 43 Q14 39 6.4 34 Q2 30.6 5.6 26.6 Q11 22.6 21 22.5 Q24.4 16 28.6 6Z" fill="#ffa6b8" stroke="#e57c94" stroke-width=".8"/>
<path d="M17.2 47 H46.8 L49 64 H15Z" fill="#8bd35a"/>
<path d="M16.2 52 H47.8 M16 57 H48.4" stroke="#5fae3a" stroke-width="1.6"/><path d="M38 47.4 L40.6 51.6 L43.2 47.4Z" fill="#ffe14a"/><circle cx="24" cy="60.5" r="1.4" fill="#f4fbe8"/>
<ellipse cx="28.4" cy="20.5" rx="3.2" ry="4.2" fill="#fff" stroke="#c96a80" stroke-width=".5"/><ellipse cx="35.6" cy="20.5" rx="3.2" ry="4.2" fill="#fff" stroke="#c96a80" stroke-width=".5"/>
<circle cx="29.2" cy="21.2" r="1.6" fill="${INK}"/><circle cx="34.8" cy="21.2" r="1.6" fill="${INK}"/>
<circle cx="29.8" cy="20.4" r=".55" fill="#fff"/><circle cx="35.4" cy="20.4" r=".55" fill="#fff"/>
<path d="M25.6 14.8 Q28 13.6 30.2 14.6 M38.4 14.8 Q36 13.6 33.8 14.6" stroke="${INK}" stroke-width="1" fill="none" stroke-linecap="round"/>
<ellipse cx="22.6" cy="28.4" rx="2.6" ry="1.5" fill="#ff6f92" opacity=".55"/><ellipse cx="41.4" cy="28.4" rx="2.6" ry="1.5" fill="#ff6f92" opacity=".55"/>
<path d="M24.5 28.4 Q32 30 39.5 28.4 Q37.5 36.6 32 36.6 Q26.5 36.6 24.5 28.4Z" fill="#b3263e"/>
<path d="M27.6 33.8 Q32 31.6 36.4 33.8 Q34.4 36.4 32 36.4 Q29.6 36.4 27.6 33.8Z" fill="#ff8a9c"/>`),

  // Huysuz ahtapot komşu: uzun kel kafa, ağır göz kapakları, sarkık burun, somurtkan ağız,
  // kahve gömlek
  squid: badge(['#d6c4f0', '#4a347a'], `
${shoulders('#6a5a9a', '<path d="M24 44 L32 50 L40 44" fill="#f2e6c8"/><path d="M14 52 H50 M11 58 H53" stroke="#8a7ac0" stroke-width="2"/><circle cx="32" cy="55" r="1.2" fill="#f2e6c8"/>')}
<rect x="28" y="38" width="8" height="8" fill="#a3c9c0"/>
<path d="M18.6 31 Q13.6 3 32 3 Q50.4 3 45.4 31 Q43.6 40 32 40 Q20.4 40 18.6 31Z" fill="#b2d6cd" stroke="#86ada3" stroke-width=".8"/>
<ellipse cx="26.6" cy="25" rx="4.6" ry="5.4" fill="#f6f2cf" stroke="#86ada3" stroke-width=".6"/><ellipse cx="37.4" cy="25" rx="4.6" ry="5.4" fill="#f6f2cf" stroke="#86ada3" stroke-width=".6"/>
<circle cx="27.4" cy="27" r="1.2" fill="#8a2a30"/><circle cx="36.6" cy="27" r="1.2" fill="#8a2a30"/>
<path d="M22 25.4 Q22 19.6 26.6 19.6 Q31.2 19.6 31.2 25.4Z M32.8 25.4 Q32.8 19.6 37.4 19.6 Q42 19.6 42 25.4Z" fill="#a0c6bc"/>
<path d="M22 25.4 H31.2 M32.8 25.4 H42" stroke="#5f8a80" stroke-width="1" stroke-linecap="round"/>
<path d="M30.4 28.4 Q29 37 30.4 42.6 Q32.6 45.4 34.2 42.4 Q35 36 33.6 28.4Z" fill="#a3c9c0" stroke="#86ada3" stroke-width=".6"/>
<path d="M24.4 36.8 Q26.6 35.4 29.4 36.8 M34.6 36.8 Q37.4 35.4 39.6 36.8" stroke="#4a5a52" stroke-width="1.3" fill="none" stroke-linecap="round"/>`),

  // Gizem avcısı çocuk: önü beyaz arkası lacivert kasket (çam ağacı), kahve saç, turuncu tişört, lacivert yelek
  pinecap: badge(['#96d696', '#245236'], `
${shoulders('#f2843a', '<path d="M6 64 Q8 45 24 43 L26.5 64Z M58 64 Q56 45 40 43 L37.5 64Z" fill="#2a3a5a"/>')}
${neck('#f3d6c0')}${face('#f3d6c0', 32, 31, 12)}
<path d="M20 31 Q19.5 25 21.5 23 L42.5 23 Q44.5 25 44 31 Q43 27 40.5 26 L37 27.5 L34 26 L30 27.5 L26.5 26 L23.5 27.5 Q21 27.5 20 31Z" fill="#6b4a2b"/>
<path d="M19.5 24.5 Q19.5 10 32 10 Q44.5 10 44.5 24.5Z" fill="#f4f4f4"/>
<path d="M19.5 24.5 Q19.5 13.5 25 11.2 L25.6 24.5Z M44.5 24.5 Q44.5 13.5 39 11.2 L38.4 24.5Z" fill="#2a4a8a"/>
<circle cx="32" cy="17" r="3.6" fill="none" stroke="#2a4a8a" stroke-width="1.2"/><path d="M32 13.8 L33.2 17 L32 20.2 L30.8 17Z" fill="#d8322e"/>
<path d="M18 24.5 Q32 21 50 23.2 Q50.5 26.2 46 26.4 Q32 24 18.6 26.6Z" fill="#2a4a8a"/>
${eyes(31.5, 4.8)}
<path d="M29.5 37 Q32.5 38.6 35 36.6" stroke="#6b2f2f" stroke-width="1.5" fill="none" stroke-linecap="round"/>`),

  // Neşeli kazaklı kız: uzun kahve saç, pembe saç bandı, yıldızlı kazak, telli kocaman gülüş
  sweaterkid: badge(['#ffc6de', '#b8467a'], `
<path d="M17 28 Q13 50 18 62 L46 62 Q51 50 47 28Z" fill="#6b3a22"/>
${shoulders('#d65aa8', '<rect x="26" y="41" width="12" height="4.5" rx="2.2" fill="#b8448a"/><path d="M32 48 l1.6 3.4 3.6 .4 -2.7 2.4 .8 3.6 -3.3 -1.9 -3.3 1.9 .8 -3.6 -2.7 -2.4 3.6 -.4Z" fill="#ffe14a"/>')}
${face('#f6dcc6')}
<path d="M20 28 Q19 15 32 15 Q45 15 44 28 Q40 21.5 32 22 Q24 21.5 20 28Z" fill="#6b3a22"/>
<path d="M20.5 22 Q32 15.5 43.5 22" stroke="#ff7ac0" stroke-width="2.2" fill="none"/>
${eyes(30.5, 4.8)}
<path d="M25 34.2 Q32 42 39 34.2Z" fill="#fff" stroke="#6b2f2f" stroke-width="1.2" stroke-linejoin="round"/>
<path d="M26.6 36 H37.4" stroke="#8a96aa" stroke-width=".9"/><g fill="#b8c2d2"><rect x="28" y="35.3" width="1.4" height="1.4"/><rect x="31.3" y="35.3" width="1.4" height="1.4"/><rect x="34.6" y="35.3" width="1.4" height="1.4"/></g>
<ellipse cx="23.5" cy="33.5" rx="2.6" ry="1.6" fill="#ff8fa3" opacity=".7"/><ellipse cx="40.5" cy="33.5" rx="2.6" ry="1.6" fill="#ff8fa3" opacity=".7"/>`),

  // Sert bakışlı dedektif (sakalsız): hacimli dalgalı kahve saç, alçak çatık kaşlar, kısık gözler,
  // somurtkan ağız, açık gri gömlek, kahve örgü kravat, lacivert rüzgârlık (yazı/arma yok)

  // Gözlüklü büyücü çocuk: dağınık siyah saç, yuvarlak gözlük, alnında şimşek izi, yeşil gözler,
  // siyah okul cüppesi ve kırmızı-altın çizgili kravat
  wizardboy: badge(['#c9a24a', '#5a3a12'], `
${shoulders('#16161c', '<path d="M24 43 L32 53 L40 43Z" fill="#e8e8e8"/><path d="M30.6 45 h2.8 l1 2 -1 9 -1.4 1.4 -1.4 -1.4 -1 -9Z" fill="#9a1f24"/><path d="M30.8 48.6 L33.4 47.8 M30.6 51.8 L33.4 51 M30.8 55 L33.2 54.2" stroke="#e0b240" stroke-width="1"/>')}
${neck('#f2d2b6')}${face('#f2d2b6')}
<path d="M19.6 30 Q17.4 17 26 14 Q33 11 40 14.4 Q46.6 18 44.4 30 Q43.4 24 40.6 22 L39 25 L37 21.4 L34 24.6 L32.4 20.6 L29.4 24.6 L27.6 21 L25 24.4 L23.6 21.4 Q21 24 19.6 30Z" fill="#141418"/>
<path d="M30.6 19.6 L28.6 23 L30.8 23 L29 26.6" stroke="#b8323a" stroke-width="1.1" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="27" cy="30.6" r="4.2" fill="none" stroke="#2a2a2a" stroke-width="1.3"/><circle cx="37" cy="30.6" r="4.2" fill="none" stroke="#2a2a2a" stroke-width="1.3"/>
<path d="M31.2 30.4 H32.8 M22.8 30 L20.6 29 M41.2 30 L43.4 29" stroke="#2a2a2a" stroke-width="1.2"/>
<circle cx="27" cy="30.8" r="1.6" fill="#3f9a4e"/><circle cx="37" cy="30.8" r="1.6" fill="#3f9a4e"/>
<circle cx="27" cy="30.8" r=".8" fill="${INK}"/><circle cx="37" cy="30.8" r=".8" fill="${INK}"/>
<circle cx="27.6" cy="30.1" r=".45" fill="#fff"/><circle cx="37.6" cy="30.1" r=".45" fill="#fff"/>
${smile(37, 3.6)}`),

  // Kızıl saçlı büyücü çocuk: turuncu-kızıl saç, çiller, mavi gözler, uzun yüz, cüppe ve kravat
  redhead: badge(['#7ab6e8', '#1c3f6e'], `
${shoulders('#16161c', '<path d="M24 43 L32 53 L40 43Z" fill="#e8e8e8"/><path d="M30.6 45 h2.8 l1 2 -1 9 -1.4 1.4 -1.4 -1.4 -1 -9Z" fill="#9a1f24"/><path d="M30.8 48.6 L33.4 47.8 M30.6 51.8 L33.4 51 M30.8 55 L33.2 54.2" stroke="#e0b240" stroke-width="1"/>')}
${neck('#f6dcc6')}
<ellipse cx="21" cy="31" rx="1.8" ry="2.8" fill="#f0d0b8"/><ellipse cx="43" cy="31" rx="1.8" ry="2.8" fill="#f0d0b8"/>
<ellipse cx="32" cy="30.8" rx="11.4" ry="13" fill="#f6dcc6"/>
<path d="M20.4 31 Q18.6 19 23 14.4 Q28 9.6 35 10.4 Q42.6 11.4 44.6 18.6 Q45.6 24 43.6 31 Q43 26 41.4 23.4 Q39 25.6 34.6 25.4 Q37.4 23.4 37.6 21.4 Q33 24.6 26.6 24.2 Q24 24 22.6 22.8 Q21 26 20.4 31Z" fill="#d9612a"/>
<path d="M24.4 16.4 Q30 12.4 37.4 13.6 Q41.6 14.6 43 18 M25.6 20.6 Q30 17.6 35.8 18.6 M38.4 19.6 Q40.6 20.6 41.4 22.8" stroke="#ee8a46" stroke-width="1.1" fill="none" stroke-linecap="round"/>
${eyes(31, 4.8, '#2f6fb8')}
<path d="M24.6 27.8 Q27 26.8 29.4 27.8 M34.6 27.8 Q37 26.8 39.4 27.8" stroke="#c0541f" stroke-width="1.1" fill="none" stroke-linecap="round"/>
<g fill="#d0844a" opacity=".7"><circle cx="24.8" cy="34.2" r=".55"/><circle cx="26.4" cy="35.1" r=".55"/><circle cx="25.4" cy="35.9" r=".45"/><circle cx="39.2" cy="34.2" r=".55"/><circle cx="37.6" cy="35.1" r=".55"/><circle cx="38.6" cy="35.9" r=".45"/><circle cx="31" cy="33.6" r=".45"/><circle cx="33" cy="33.6" r=".45"/></g>
<path d="M28.8 38.2 Q32 40.4 35.2 38.2" stroke="#6b2f2f" stroke-width="1.5" fill="none" stroke-linecap="round"/>`),

  // Kıvırcık saçlı bilgin kız: gür kabarık kahve saç, kahve gözler, cüppe ve kravat, kitap
  wizardgirl: badge(['#e6c58a', '#7a4e22'], `
<path d="M12 34 Q8 18 20 11 Q32 4 44 11 Q56 18 52 34 Q54 46 48 54 L16 54 Q10 46 12 34Z" fill="#7a4a26"/>
<path d="M14 30 Q12 38 15 46 M50 30 Q52 38 49 46 M18 20 Q22 14 28 13 M46 20 Q42 14 36 13" stroke="#5e3618" stroke-width="1.4" fill="none" stroke-linecap="round"/>
${shoulders('#16161c', '<path d="M24 43 L32 53 L40 43Z" fill="#e8e8e8"/><path d="M30.6 45 h2.8 l1 2 -1 9 -1.4 1.4 -1.4 -1.4 -1 -9Z" fill="#9a1f24"/><path d="M30.8 48.6 L33.4 47.8 M30.6 51.8 L33.4 51 M30.8 55 L33.2 54.2" stroke="#e0b240" stroke-width="1"/><rect x="42" y="50" width="11" height="13" rx="1" fill="#6a2a2a" transform="rotate(-10 47 56)"/><path d="M44 52 L44.6 61" stroke="#e0b240" stroke-width=".8" transform="rotate(-10 47 56)"/>')}
${neck('#f4d8c2')}${face('#f4d8c2')}
<path d="M19.6 29 Q18.4 16 30 14.6 Q42 13.6 44.4 26 Q43 21 39 20 Q38 23 34.6 22.4 Q31 25 27.6 22.4 Q24 24 22.6 22 Q20.6 25 19.6 29Z" fill="#7a4a26"/>
${eyes(30.6, 4.7, '#6a3e1e')}
<path d="M24.8 27.4 Q27 26.4 29.4 27.4 M34.6 27.4 Q37 26.4 39.2 27.4" stroke="#5e3618" stroke-width="1.1" fill="none" stroke-linecap="round"/>
<path d="M29.4 36.4 Q32 38.4 34.6 36.4" stroke="#a83a4a" stroke-width="1.5" fill="none" stroke-linecap="round"/>${blush(34)}`),

  // Kaygılı çizer (kesitli dizinin anlatıcısı tarzında): sarı ten, yumurta kafa, siyah kirpi
  // perçem, kalın dikdörtgen kaşlar, iri yuvarlak gözler, büyük burun, kuru kafalı siyah tişört
  cartoonist: badge(['#6cb2d8', '#16344e'], `
${shoulders('#161616', '<g transform="translate(32 55.5)"><path d="M-5 0 Q-5 -6.4 0 -6.4 Q5 -6.4 5 0 Q5 3 3 3.6 V6 H-3 V3.6 Q-5 3 -5 0Z" fill="#f2f2f2"/><circle cx="-2" cy="-.6" r="1.4" fill="#161616"/><circle cx="2" cy="-.6" r="1.4" fill="#161616"/></g>')}
<rect x="29" y="38" width="6" height="7" fill="#e6c64e"/>
<ellipse cx="21.4" cy="30" rx="2" ry="3" fill="#ead058"/><ellipse cx="42.6" cy="30" rx="2" ry="3" fill="#ead058"/>
<path d="M21.6 22 Q21.6 8.6 32 8.6 Q42.4 8.6 42.4 22 L41.8 33 Q40.4 43.4 32.6 43.4 Q24 43.4 22.4 35Z" fill="#f6dc62" stroke="#2a2a2a" stroke-width=".7"/>
<path d="M24.4 13.6 Q27.6 8.2 33 8.2 Q38.8 8.4 41.6 13.4 L43.6 10 L42.6 17.4 Q41.4 13.8 38.4 12.8 L39.4 9.6 L35.4 12.2 L33.6 7.2 L31.6 12 Q27.4 11.8 24.4 13.6Z" fill="#161616"/>
<rect x="22.6" y="19.4" width="8.6" height="3.6" fill="#161616"/><rect x="32.8" y="19.4" width="8.6" height="3.6" fill="#161616"/>
<circle cx="27" cy="27.4" r="3.8" fill="#fff" stroke="#161616" stroke-width=".8"/><circle cx="37" cy="27.4" r="3.8" fill="#fff" stroke="#161616" stroke-width=".8"/>
<circle cx="27.3" cy="27.8" r="1.1" fill="#161616"/><circle cx="36.7" cy="27.8" r="1.1" fill="#161616"/>
<path d="M23.8 32 Q27 33.6 30 32 M34 32 Q37 33.6 40.2 32" stroke="#b8962a" stroke-width=".9" fill="none"/>
<path d="M31.6 29 Q28.4 34.6 27.8 37 Q30.6 38.8 34.4 37.4" stroke="#7a5a12" stroke-width="1.1" fill="#f0d256" stroke-linejoin="round"/>
<path d="M29.6 41.2 Q32 39.6 34.6 41.2" stroke="#161616" stroke-width="1.2" fill="none" stroke-linecap="round"/>`),

  // Bilge armadillo (aynı dizinin vicdanı tarzında): turuncu zırh, uzun burun, kocaman sivri
  // kulaklar, sıkılmış yarı kapalı gözler, dişlerini gösteren ağız
  armadillo: badge(['#fbefcf', '#c49a5a'], `
<path d="M6 64 Q4 42 18 36 Q32 31 46 36 Q60 42 58 64Z" fill="#f09a3e"/>
<path d="M8 50 Q32 39 56 50 M6 58 Q32 47 58 58" stroke="#d47a2c" stroke-width="1.5" fill="none" stroke-linecap="round"/>
<g fill="#ffc07a" opacity=".7"><circle cx="16" cy="45" r="1.6"/><circle cx="48" cy="45" r="1.6"/><circle cx="12" cy="55" r="1.4"/><circle cx="52" cy="55" r="1.4"/></g>
<path d="M14 21 Q10 8 16 3 Q22 6 25 17Z M50 21 Q54 8 48 3 Q42 6 39 17Z" fill="#f6a443"/>
<path d="M16.4 18 Q14 9 17 6 Q20.6 9 22.4 16Z M47.6 18 Q50 9 47 6 Q43.4 9 41.6 16Z" fill="#ffb8a6"/>
<ellipse cx="32" cy="26" rx="14" ry="12.5" fill="#f8ae52"/>
<path d="M25.6 33 Q26 45 32 47.6 Q38 45 38.4 33Z" fill="#f8ae52"/>
<path d="M24.6 18.4 Q32 14.4 39.4 18.4" stroke="#e8923c" stroke-width="1.4" fill="none" stroke-linecap="round"/>
<ellipse cx="32" cy="46.6" rx="2.6" ry="1.8" fill="#5a3420"/><circle cx="31.2" cy="46.1" r=".6" fill="#fff" opacity=".6"/>
<ellipse cx="26.4" cy="26" rx="3.3" ry="3.8" fill="#fff"/><ellipse cx="37.6" cy="26" rx="3.3" ry="3.8" fill="#fff"/>
<circle cx="27" cy="26.6" r="2.3" fill="#2a1a10"/><circle cx="37" cy="26.6" r="2.3" fill="#2a1a10"/>
<circle cx="27.8" cy="25.6" r=".85" fill="#fff"/><circle cx="37.8" cy="25.6" r=".85" fill="#fff"/>
<ellipse cx="22" cy="32" rx="2.6" ry="1.5" fill="#ff7f8f" opacity=".45"/><ellipse cx="42" cy="32" rx="2.6" ry="1.5" fill="#ff7f8f" opacity=".45"/>
<path d="M30 40.2 Q32 41.6 34 40.2" stroke="#9a5a2a" stroke-width="1.1" fill="none" stroke-linecap="round"/>`),

  // Fesli zaman yolcusu: yan yatık kırmızı fes (siyah püskül), yana taranmış dağınık kahve saç, kalkık
  // kaşlar ve yamuk şakacı gülüş, kahve tüvit ceket, açık mor çizgili gömlek, bordo papyon; gece mavisi zemin
  timetraveler: badge(['#5a7ac4', '#141f48'], `
${shoulders('#8a6a48', `<path d="M25 43 L32 58 L39 43Z" fill="#cdbbe4"/><path d="M28.2 44 L31.2 53 M32 44 V57 M35.8 44 L32.8 53" stroke="#9d88c8" stroke-width=".8"/>
<path d="M25 43 L32 58 L27.5 63 L19.5 46.5Z M39 43 L32 58 L36.5 63 L44.5 46.5Z" fill="#6e5236"/>
<g fill="#a88760"><circle cx="13" cy="56" r=".7"/><circle cx="17" cy="51" r=".7"/><circle cx="12" cy="61" r=".7"/><circle cx="51" cy="56" r=".7"/><circle cx="47" cy="51" r=".7"/><circle cx="52" cy="61" r=".7"/><circle cx="16" cy="60" r=".6"/><circle cx="48" cy="60" r=".6"/></g>`)}
${neck('#f2d2b6')}
<path d="M26.4 42.6 L31 45 L26.4 47.4Z M37.6 42.6 L33 45 L37.6 47.4Z" fill="#7a1c2a"/><rect x="30.5" y="43.7" width="3" height="2.6" rx=".8" fill="#5c1320"/>
<ellipse cx="32" cy="31" rx="11.5" ry="12.6" fill="#f2d2b6"/>
<path d="M19.8 31 Q18 18.5 27.5 15.8 Q38.5 13.8 43.4 19.4 Q45.8 23.6 44.4 30.4 Q43.4 25.6 41.4 24 Q36.4 27 27.4 25.6 Q23.2 25 21.8 27.4 Q20.8 29.2 19.8 31Z" fill="#6b4528"/>
<path d="M23.6 25.4 Q30 18.6 41.8 22.6 M26 22.4 Q33 17.6 40.6 19.8" stroke="#83592f" stroke-width="1.4" fill="none" stroke-linecap="round"/>
<g transform="rotate(-8 33 13)"><path d="M25.8 19.6 L27.8 8 L38.2 8 L40.2 19.6 Q33 21.2 25.8 19.6Z" fill="#c8282e"/><path d="M27.2 12 Q33 13.2 38.8 12" stroke="#a81e24" stroke-width=".8" fill="none"/>
<ellipse cx="33" cy="8" rx="5.2" ry="1.3" fill="#a81e24"/><path d="M33 8 Q37.6 8.6 38.6 14" stroke="#1d1d1d" stroke-width="1" fill="none"/><ellipse cx="38.8" cy="15.3" rx="1.1" ry="1.9" fill="#1d1d1d"/></g>
<path d="M24.4 27.4 Q26.9 25.6 29.6 27 M34.4 26.6 Q37 24.8 39.6 26.6" stroke="#5a3a20" stroke-width="1.3" fill="none" stroke-linecap="round"/>
${eyes(30.6, 4.7)}
<path d="M26.8 36 Q32 40.8 37.8 35.2" stroke="#6b2f2f" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<ellipse cx="23.8" cy="34.4" rx="2.2" ry="1.2" fill="#ff8fa3" opacity=".4"/><ellipse cx="40.2" cy="34.4" rx="2.2" ry="1.2" fill="#ff8fa3" opacity=".4"/>`),

  // ---------- Oyun ----------
  // Hızlı mavi kirpi (eski platform oyunlarının maskotu tarzında): arkaya yatık mavi dikenler, sivri
  // kulaklar, açık ten rengi yüz, iri yeşil gözler, kendinden emin kaşlar ve yan gülüş; yeşil tepe zemini.
  speedster: badge(['#a6e86e', '#2c6f36'], `
<path d="M10 64 Q11 46 32 44 Q53 46 54 64Z" fill="#2a5fd8"/>
<ellipse cx="32" cy="60" rx="9" ry="9" fill="#f1cf9a"/>
<path d="M21 23 L3 15 L16 29 L1 33 L17 37 L5 47 L23 40Z" fill="#2a5fd8"/>
<path d="M43 23 L59 17 L47 30 L61 36 L45 39Z" fill="#2a5fd8"/>
<path d="M20.5 21 L17.5 6 L29 16Z M43.5 21 L46.5 6 L35 16Z" fill="#2a5fd8"/>
<path d="M21.6 18.6 L20 10 L26.6 15.8Z M42.4 18.6 L44 10 L37.4 15.8Z" fill="#f1cf9a"/>
<circle cx="32" cy="29" r="14" fill="#2a5fd8"/>
<path d="M21 31 Q20 22 26.5 21.5 Q32 21 32 26 Q32 21 37.5 21.5 Q44 22 43 31 Q43 41 32 42 Q21 41 21 31Z" fill="#f1cf9a"/>
<ellipse cx="27.5" cy="28" rx="4" ry="5.2" fill="#fff"/><ellipse cx="36.5" cy="28" rx="4" ry="5.2" fill="#fff"/>
<ellipse cx="28.6" cy="28.6" rx="2" ry="2.8" fill="#2e9c3e"/><ellipse cx="35.4" cy="28.6" rx="2" ry="2.8" fill="#2e9c3e"/>
<circle cx="28.8" cy="28.9" r="1.1" fill="#111"/><circle cx="35.2" cy="28.9" r="1.1" fill="#111"/>
<circle cx="29.4" cy="27.8" r=".6" fill="#fff"/><circle cx="35.8" cy="27.8" r=".6" fill="#fff"/>
<path d="M23.5 21.8 Q27.5 19.8 31 22.4 M33 22.4 Q36.5 19.8 40.5 21.8" stroke="#173a8a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
<ellipse cx="32" cy="33.8" rx="2.2" ry="1.6" fill="#1a1a1a"/><circle cx="31.4" cy="33.3" r=".5" fill="#fff" opacity=".7"/>
<path d="M27.4 37.2 Q33 40.6 37.6 35.8" stroke="#6b2f2f" stroke-width="1.5" fill="none" stroke-linecap="round"/>`),
});

const PARODY = ['armadillo'];
const star = (x, y, r, c = '#fff3c0') => `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3}Z" fill="${c}" opacity=".75"/>`;
const dots = (c) => `<g fill="${c}" opacity=".35"><circle cx="8" cy="18" r="1.4"/><circle cx="56" cy="14" r="1.1"/><circle cx="58" cy="36" r="1.3"/><circle cx="6" cy="38" r="1"/></g>`;
const MOTIF = {
  jester: `<g fill="#ff4f9a" opacity=".35"><path d="M6 14 l3 -3 3 3 -3 3Z"/><path d="M52 10 l3 -3 3 3 -3 3Z" fill="#4a8cff"/><path d="M55 38 l2.5 -2.5 2.5 2.5 -2.5 2.5Z"/></g>`,
  nightguard: `<path d="M44 4 L64 0 L64 22Z" fill="#fffbe0" opacity=".35"/>${dots('#3a2e10')}`,
  catburglar: `${star(10, 14, 2.2)}${star(54, 12, 1.6)}<circle cx="52" cy="40" r="5" fill="#fff6c8" opacity=".25"/>`,
  cavecreature: `<g fill="#9fd0b8" opacity=".3"><circle cx="8" cy="18" r="2.4"/><circle cx="56" cy="20" r="1.6"/><circle cx="54" cy="44" r="1.2"/></g>`,
  redhead: `${star(9, 14, 1.8)}${star(55, 12, 1.4)}`, wizardgirl: `${star(9, 16, 1.8)}${star(55, 14, 1.4)}`,
  sidekick: `<g fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"><circle cx="9" cy="16" r="3"/><circle cx="55" cy="42" r="2.4"/></g>`,
  chemist: `<g fill="#fff" opacity=".3"><path d="M7 12 h4 v4 l3 6 h-10 l3 -6Z"/></g>${dots('#5a4410')}`,
  lawyer: `${dots('#7a3a0a')}`, dragonqueen: `<path d="M50 8 q6 2 8 8 q-5 -2 -8 1 q1 -5 0 -9Z" fill="#ffb4a0" opacity=".35"/>${dots('#ffc0b0')}`,
  goth: `<g fill="#2a2a3a" opacity=".25"><path d="M6 16 q3 -4 6 0 q-3 -1 -3 2 q0 -3 -3 -2Z"/><path d="M50 12 q3 -4 6 0 q-3 -1 -3 2 q0 -3 -3 -2Z"/></g>`,
  starfish: `<g fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1"><circle cx="8" cy="40" r="2"/><circle cx="56" cy="44" r="1.6"/></g>`,
  squid: `<g fill="#fff" opacity=".35"><path d="M6 44 q2 -4 4 0 q-2 4 -4 0Z"/><path d="M54 14 q2 -4 4 0 q-2 4 -4 0Z"/></g>`,
  pinecap: `<path d="M4 46 L10 34 L16 46Z M50 48 L56 36 L62 48Z" fill="#1d4a2c" opacity=".45"/>`,
  sweaterkid: `<g fill="#fff" opacity=".45"><path d="M8 16 q1.5 -2 3 0 q1.5 -2 3 0 q0 2.4 -3 4.4 q-3 -2 -3 -4.4Z"/></g>${star(55, 14, 1.8)}`,
  cartoonist: dots('#fff'), armadillo: dots('#a07a3a'), timetraveler: `${star(9, 14, 1.8)}${star(54, 12, 1.4)}<circle cx="56" cy="40" r="3" fill="#9ab8ff" opacity=".3"/>`,
  swordsman: `<path d="M4 50 L60 20" stroke="#fff" stroke-opacity=".1" stroke-width="3"/>`, cook: `<g fill="#fff" opacity=".35"><path d="M6 16 q2 -3 0 -6 M10 16 q2 -3 0 -6" stroke="#fff" fill="none"/></g>`,
  greenblade: `<path d="M2 24 L62 40" stroke="#fff" stroke-opacity=".1" stroke-width="3"/>`,
  airmonk: `<g fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.2"><path d="M4 18 q6 -4 12 0"/><path d="M48 12 q6 -4 12 0"/></g>`,
  waterfriend: `<g fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.2"><path d="M3 44 q4 -3 8 0 t8 0"/><path d="M46 46 q4 -3 8 0 t8 0"/></g>`,
  earthgirl: `<g fill="#3a5a1c" opacity=".35"><path d="M6 46 l4 -6 4 6Z"/><path d="M52 46 l4 -6 4 6Z"/></g>`,
  hunter: `<g fill="#9fb4d0" opacity=".3"><circle cx="54" cy="14" r="6"/></g>`,
};
const OWN = new URL('./A/', import.meta.url);
for (const id of PARODY) {
  const drawn = new URL(`${id}.svg`, OWN);
  const content = existsSync(drawn)
    ? readFileSync(drawn, 'utf8')
    : AVATARS[id].replaceAll('K-', `${id}-`).replace('<!--MOTIF-->', MOTIF[id] ?? '');
  for (const out of OUTS) writeFileSync(new URL(`${id}.svg`, out), content.replace(/\n\s*\n/g, '\n'));
}
console.log(`✓ ${PARODY.length} parody avatars → docs/internal/design/avatars-2/full`);
