// Çizilmiş avatarlar (SVG, 64x64 yuvarlak rozet). Maskottan (mor kare) ayrı: insan ya da
// yaratık yüzleri. Kimlikler packages/shared/src/avatars.ts ile aynı olmalı.
//
//   node scripts/avatars.mjs  → apps/web/public/avatars/*.svg (eklenti avatar göstermez; arayüz sitenin kendisi)
//
// Parodiler sadece tarzı andırır: isim, logo, birebir kostüm yok.

import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';

const OUTS = [new URL('../apps/web/public/avatars/', import.meta.url)];
for (const out of OUTS) mkdirSync(out, { recursive: true });

const INK = '#1d1430';

// Arka plan: ortası açık, kenarı koyu degrade ([iç, dış]). Renk, saç ve kıyafetle zıt olacak
// ve avatarın temasına uyacak şekilde seçilir (siyah saç koyu zeminde kaybolmasın).
const badge = ([inner, outer], body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="c"><circle cx="32" cy="32" r="32"/></clipPath><radialGradient id="bg" cx="50%" cy="40%" r="65%"><stop offset="0" stop-color="${inner}"/><stop offset="1" stop-color="${outer}"/></radialGradient></defs><g clip-path="url(#c)"><rect width="64" height="64" fill="url(#bg)"/>${body}</g></svg>\n`;

const shoulders = (fill, extra = '') => `<path d="M6 64 Q8 45 32 43 Q56 45 58 64Z" fill="${fill}"/>${extra}`;
const neck = (skin) => `<rect x="28" y="38" width="8" height="7" fill="${skin}"/>`;
const face = (skin, cx = 32, cy = 30, r = 12) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${skin}"/>`;
const eyes = (y = 30, dx = 5, color = INK) =>
  `<ellipse cx="${32 - dx}" cy="${y}" rx="1.7" ry="2.2" fill="${color}"/><ellipse cx="${32 + dx}" cy="${y}" rx="1.7" ry="2.2" fill="${color}"/><circle cx="${32 - dx + 0.6}" cy="${y - 0.8}" r=".6" fill="#fff"/><circle cx="${32 + dx + 0.6}" cy="${y - 0.8}" r=".6" fill="#fff"/>`;
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

  // ---------- Genres (card R20: the parodies were removed by the IP audit; only own archetypes) ----------
  // Kara kılıççı: dikenli siyah saç, burnunda yara izi, koyu zırh, omzunda dev kılıç kabzası
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

  // Kaşı kıvrık aşçı: bir gözü kapatan sarı saç, kıvrık kaş, siyah takım, mavi gömlek

  // Yeşil saçlı kılıç ustası: kısa yeşil saç, sol gözde yara (kapalı), üç altın küpe, kılıç kabzası

  // Beyaz saçlı canavar avcısı: uzun beyaz saç, sarı kedi gözleri, yara izi, omzunda kılıç

  // Siyah paltolu hacker: geriye taranmış siyah saç, minik oval siyah gözlük, siyah palto, yeşil kod

  // Ejderha kraliçesi: platin örgülü saç, mavi elbise, omzunda minik ejderha

  // Kaos palyaçosu: pembe-mavi iki at kuyruğu, göz altında minik kalp, kırmızı ruj

  // Gece bekçisi: yüzün üstünü saran kulaklı kara maske, güçlü çene, pelerin (amblem yok)

  // Kedi hırsız: kedi kulaklı siyah maske, siyah saç, kırmızı ruj

  // Gotik kız: çift siyah örgü, solgun ten, beyaz yuvarlak yaka, ifadesiz bakış

  // Mağara yaratığı: kel, solgun ten, kocaman mavi gözler, birkaç tel saç, sivri kulak, altın yüzük

  // Kör toprak bükücü kız: siyah topuz, perçem, sarı saç bandı, yeşil kıyafet, soluk bakışlar

  // Hava keşişi çocuk: kel, alnında mavi ok, turuncu-sarı cüppe, kocaman gülüş

  // Su bükücü kız: uzun kahve saç, yüz yanında saç halkaları, mavi kıyafet, mavi kolye

  // Deniz altı süngeri: parlak sarı kare gövde, delikler, kirpikli kocaman mavi gözler,
  // açık gülen ağız ve iki ön diş, çilli yanaklar, beyaz gömlek + kırmızı kravat

  // Pembe deniz yıldızı: tombul yuvarlak uçlu yıldız, birbirine yakın gözler, ince kaşlar,
  // kocaman gülüş, çiçekli yeşil şort

  // Huysuz ahtapot komşu: uzun kel kafa, ağır göz kapakları, sarkık burun, somurtkan ağız,
  // kahve gömlek

  // Gizem avcısı çocuk: önü beyaz arkası lacivert kasket (çam ağacı), kahve saç, turuncu tişört, lacivert yelek

  // Neşeli kazaklı kız: uzun kahve saç, pembe saç bandı, yıldızlı kazak, telli kocaman gülüş

  // Sert bakışlı dedektif (sakalsız): hacimli dalgalı kahve saç, alçak çatık kaşlar, kısık gözler,
  // somurtkan ağız, açık gri gömlek, kahve örgü kravat, lacivert rüzgârlık (yazı/arma yok)

  // Gözlüklü büyücü çocuk: dağınık siyah saç, yuvarlak gözlük, alnında şimşek izi, yeşil gözler,
  // siyah okul cüppesi ve kırmızı-altın çizgili kravat

  // Kızıl saçlı büyücü çocuk: turuncu-kızıl saç, çiller, mavi gözler, uzun yüz, cüppe ve kravat

  // Kıvırcık saçlı bilgin kız: gür kabarık kahve saç, kahve gözler, cüppe ve kravat, kitap

  // Kaygılı çizer (kesitli dizinin anlatıcısı tarzında): sarı ten, yumurta kafa, siyah kirpi
  // perçem, kalın dikdörtgen kaşlar, iri yuvarlak gözler, büyük burun, kuru kafalı siyah tişört

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

  // ---------- Oyun ----------
  // Hızlı mavi kirpi (eski platform oyunlarının maskotu tarzında): arkaya yatık mavi dikenler, sivri
  // kulaklar, açık ten rengi yüz, iri yeşil gözler, kendinden emin kaşlar ve yan gülüş; yeşil tepe zemini.
});

// Card R14: the parodies are Design's redraw (docs/internal/design/avatars-2/full/<id>.svg, generator full.mjs); they
// replace the drawings above (kept for the themed page) and add the new ones, so running this script never undoes it.
const REDRAW = new URL('../docs/internal/design/avatars-2/full/', import.meta.url);
for (const file of readdirSync(REDRAW).filter((f) => f.endsWith('.svg'))) {
  AVATARS[file.slice(0, -4)] = readFileSync(new URL(file, REDRAW), 'utf8');
}

// Card R20: the Genres tab is Design's own archetypes (docs/internal/design/avatars-3/svg/, the owner's pick).
const GENRES = new URL('../docs/internal/design/avatars-3/svg/', import.meta.url);
for (const file of readdirSync(GENRES).filter((f) => f.endsWith('.svg'))) {
  AVATARS[file.slice(0, -4)] = readFileSync(new URL(file, GENRES), 'utf8');
}

for (const [id, content] of Object.entries(AVATARS)) {
  for (const out of OUTS) writeFileSync(new URL(`${id}.svg`, out), content.replace(/\n\s*\n/g, '\n'));
}
console.log(`✓ ${Object.keys(AVATARS).length} avatar → apps/web/public/avatars`);
