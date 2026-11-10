// MASCOT2 (Design session, 10 Nov 2026): four original mascot directions for Sidelit.
// Each keeps the family trait of the D1 logo (two dark ink eyes with a top-left glint) and is drawn on a 64 × 64 grid.
// Per direction: front, happy, small (the ≤ 32 px cut), costume (Sinema usher cap), and the home art with it.
// Run: node docs/internal/design/mascot-2/draw.mjs → ./svg/*.svg (+ index.html is static and reads them)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = new URL('./svg/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const INK = '#140d33';
const svg = (body, id, vb = '0 0 64 64') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body.replaceAll('K-', `${id}-`)}</svg>\n`;
const eyes = (x1, x2, y, rx, ry, glint = true, ink = INK) =>
  [x1, x2].map((x) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${ink}"/>` +
    (glint ? `<circle cx="${(x - rx * 0.32).toFixed(2)}" cy="${(y - ry * 0.4).toFixed(2)}" r="${(rx * 0.3).toFixed(2)}" fill="#fff" opacity=".92"/>` : '')).join('');
const happyEyes = (x1, x2, y, w, ink = INK, sw = 2.2) =>
  [x1, x2].map((x) => `<path d="M${x - w} ${y + 1} Q${x} ${y - w * 1.1} ${x + w} ${y + 1}" stroke="${ink}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`).join('');
const smile = (x, y, w, ink = INK, sw = 1.8) => `<path d="M${x - w} ${y} Q${x} ${y + w * 0.9} ${x + w} ${y}" stroke="${ink}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
const grin = (x, y, w, ink = INK) => `<path d="M${x - w} ${y} Q${x} ${y + w * 1.25} ${x + w} ${y} Z" fill="${ink}"/><path d="M${x - w * .5} ${y + w * .55} Q${x} ${y + w * .95} ${x + w * .5} ${y + w * .55}" fill="#ff8a8a" opacity=".9"/>`;
const cheeks = (x1, x2, y, r = 2.4) => `<ellipse cx="${x1}" cy="${y}" rx="${r}" ry="${r * .6}" fill="#ff8f6a" opacity=".45"/><ellipse cx="${x2}" cy="${y}" rx="${r}" ry="${r * .6}" fill="#ff8f6a" opacity=".45"/>`;
// The Sinema theme's usher cap, centred on (x, y) = the top of the head, scaled by s, tilted by r degrees.
const usherCap = (x, y, s = 1, r = -8) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M-9 0 L-8 -8 Q0 -10 8 -8 L9 0 Q0 2 -9 0Z" fill="#b8263a"/><path d="M-9 0 Q0 2 9 0 L9 -2.4 Q0 -.4 -9 -2.4Z" fill="#ffc65a"/><path d="M-8 -8 Q0 -10 8 -8" stroke="#ffd98a" stroke-width="1.2" fill="none"/><circle cx="0" cy="-5" r="1.4" fill="#ffc65a"/></g>`;

const GOLD = `<linearGradient id="K-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3d6"/><stop offset=".5" stop-color="#ffc65a"/><stop offset="1" stop-color="#ff9440"/></linearGradient>`;
const NIGHT = `<linearGradient id="K-night" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a2d86"/><stop offset="1" stop-color="#15103a"/></linearGradient>`;
const GLOW = `<radialGradient id="K-glow"><stop offset="0" stop-color="#ffc65a" stop-opacity=".55"/><stop offset="1" stop-color="#ffc65a" stop-opacity="0"/></radialGradient>`;

/* ---------------- A. Lumi, the night moth ----------------
   A plush moth drawn to the screen's light. Wings in night indigo with a gold rim and a play-triangle mark each,
   a cream-gold body with the face. Wings give a strong silhouette at 16 px; the body carries the light. */
const lumi = {
  name: 'Lumi', tr: 'Lumi', idea: 'a plush night moth, drawn to the light of the screen',
  front: () => `<defs>${GOLD}${NIGHT}${GLOW}</defs>
<circle cx="32" cy="34" r="27" fill="url(#K-glow)"/>
<path d="M30 30 Q14 6 6 18 Q2 30 16 36 Q24 38 30 34Z M34 30 Q50 6 58 18 Q62 30 48 36 Q40 38 34 34Z" fill="url(#K-night)" stroke="#ffc65a" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M30 38 Q18 40 14 50 Q20 56 30 46Z M34 38 Q46 40 50 50 Q44 56 34 46Z" fill="url(#K-night)" stroke="#ffc65a" stroke-width="1.4" stroke-linejoin="round"/>
<path d="M13 20 L21 25 L13 30Z M51 20 L43 25 L51 30Z" fill="#ffc65a" opacity=".85"/>
<path d="M29 18 Q24 8 18 7 M35 18 Q40 8 46 7" stroke="#2a2060" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<circle cx="18" cy="7" r="2.6" fill="#fff3d6"/><circle cx="46" cy="7" r="2.6" fill="#fff3d6"/>
<ellipse cx="32" cy="36" rx="11" ry="15" fill="url(#K-gold)" stroke="#e08a2e" stroke-width="1"/>
<path d="M23 40 Q32 43 41 40 M24 46 Q32 49 40 46" stroke="#e8a245" stroke-width="1.2" fill="none" opacity=".7"/>
<path d="M24 25 Q32 19 40 25" stroke="#fffaf0" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/>
${eyes(28, 36, 32, 2.6, 3.6)}${cheeks(25, 39, 37)}${smile(32, 37.5, 2.2)}`,
  happy: () => `<defs>${GOLD}${NIGHT}${GLOW}</defs>
<circle cx="32" cy="34" r="27" fill="url(#K-glow)"/>
<path d="M30 28 Q12 0 4 12 Q0 26 16 32 Q24 35 30 32Z M34 28 Q52 0 60 12 Q64 26 48 32 Q40 35 34 32Z" fill="url(#K-night)" stroke="#ffc65a" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M30 38 Q18 42 15 52 Q21 57 30 46Z M34 38 Q46 42 49 52 Q43 57 34 46Z" fill="url(#K-night)" stroke="#ffc65a" stroke-width="1.4" stroke-linejoin="round"/>
<path d="M11 14 L19 19 L11 24Z M53 14 L45 19 L53 24Z" fill="#ffc65a" opacity=".85"/>
<path d="M29 18 Q25 7 19 4 M35 18 Q39 7 45 4" stroke="#2a2060" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<circle cx="19" cy="4" r="2.6" fill="#fff3d6"/><circle cx="45" cy="4" r="2.6" fill="#fff3d6"/>
<ellipse cx="32" cy="36" rx="11" ry="15" fill="url(#K-gold)" stroke="#e08a2e" stroke-width="1"/>
<path d="M24 25 Q32 19 40 25" stroke="#fffaf0" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".9"/>
${happyEyes(28, 36, 32, 2.6)}${cheeks(24.5, 39.5, 36.5)}${grin(32, 37, 3.6)}`,
  small: () => `<defs>${GOLD}</defs>
<path d="M29 30 Q12 2 3 16 Q0 31 17 37 Q25 38 29 34Z M35 30 Q52 2 61 16 Q64 31 47 37 Q39 38 35 34Z" fill="#2a2068" stroke="#ffc65a" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M29 39 Q15 43 13 55 Q21 59 29 47Z M35 39 Q49 43 51 55 Q43 59 35 47Z" fill="#2a2068" stroke="#ffc65a" stroke-width="2.2" stroke-linejoin="round"/>
<ellipse cx="32" cy="37" rx="12" ry="16" fill="url(#K-gold)"/>
${eyes(27.5, 36.5, 33, 3.3, 4.6, false)}`,
  head: [32, 21, 0.9],
};

/* ---------------- B. Pip, the lamp sprout ----------------
   A round night creature with a glowing flower bud growing from its head (two leaves, so it never reads as a lit
   fuse); the bud lights its face from the right (side-lit). Dark body, so the gold lamp and the cream eye whites carry it on any theme. */
const pip = {
  name: 'Pip', tr: 'Pip', idea: 'a round night creature with a glowing bud growing from its head, lighting its face from the side',
  body: (happy) => `<defs>${NIGHT}${GLOW}<radialGradient id="K-rim" cx=".9" cy=".35" r=".8"><stop offset="0" stop-color="#ffc65a" stop-opacity=".75"/><stop offset=".55" stop-color="#ffc65a" stop-opacity="0"/></radialGradient><radialGradient id="K-bulb" cx=".4" cy=".35"><stop offset="0" stop-color="#fffaf0"/><stop offset=".55" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff9a3c"/></radialGradient></defs>
<circle cx="46" cy="9" r="15" fill="url(#K-glow)"/>
<ellipse cx="22" cy="58" rx="5" ry="2.6" fill="#15103a"/><ellipse cx="38" cy="58" rx="5" ry="2.6" fill="#15103a"/>
<path d="M12 40 Q12 22 30 21 Q48 22 48 40 Q48 57 30 57 Q12 57 12 40Z" fill="url(#K-night)" stroke="#8f7ff0" stroke-width="1.8"/>
<path d="M12 40 Q12 22 30 21 Q48 22 48 40 Q48 57 30 57 Q12 57 12 40Z" fill="url(#K-rim)"/>
<path d="M31 21 Q33 12 41 9" stroke="#3fbf8a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
<path d="M32 16 Q25 11 22 14 Q26 19 32 16Z M35 13 Q37 6 42 6 Q41 12 35 13Z" fill="#3fbf8a"/>
<path d="M41 9 Q40 2 44.5 1.5 L46 4.5 L47.5 1.5 Q52 2 51 9 Q50 15 46 15 Q42 15 41 9Z" fill="url(#K-bulb)"/><circle cx="44" cy="6" r="1.4" fill="#fff" opacity=".9"/>
${happy ? `<path d="M10 38 Q4 30 7 24" stroke="#2c2368" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M48 36 Q55 30 54 23" stroke="#2c2368" stroke-width="4" fill="none" stroke-linecap="round"/>`
    : `<path d="M12 42 Q6 46 7 51" stroke="#2c2368" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M47 40 Q52 36 51 30" stroke="#2c2368" stroke-width="4" fill="none" stroke-linecap="round"/>`}
<ellipse cx="25" cy="36" rx="5.4" ry="6.2" fill="#fff6e0"/><ellipse cx="36" cy="36" rx="5.4" ry="6.2" fill="#fff6e0"/>
${happy ? happyEyes(25, 36, 37, 3) + grin(30.5, 45, 3.6) : eyes(26, 37, 36.8, 2.6, 3.6) + smile(30.5, 45, 2.6, '#fff6e0', 1.8)}
${cheeks(19.5, 42, 44, 2.2)}`,
  front() { return this.body(false); },
  happy() { return this.body(true); },
  small: () => `<defs><radialGradient id="K-bulb" cx=".4" cy=".35"><stop offset="0" stop-color="#fffaf0"/><stop offset=".55" stop-color="#ffd27a"/><stop offset="1" stop-color="#ff9a3c"/></radialGradient></defs>
<path d="M7 40 Q7 18 29 17 Q51 18 51 40 Q51 61 29 61 Q7 61 7 40Z" fill="#2c2370" stroke="#ffc65a" stroke-width="2"/>
<path d="M30 17 Q33 8 42 6" stroke="#3fbf8a" stroke-width="3.2" fill="none" stroke-linecap="round"/>
<path d="M42 8 Q41 0 46 0 L48 3 L50 0 Q55 0 54 8 Q53 15 48 15 Q43 15 42 8Z" fill="url(#K-bulb)"/>
<ellipse cx="21" cy="37" rx="7" ry="8" fill="#fff6e0"/><ellipse cx="37" cy="37" rx="7" ry="8" fill="#fff6e0"/>
<ellipse cx="22" cy="38" rx="3.4" ry="4.6" fill="${INK}"/><ellipse cx="38" cy="38" rx="3.4" ry="4.6" fill="${INK}"/>`,
  head: [27, 22, 1],
};

/* ---------------- C. Stub, the ticket ----------------
   A cinema ticket that came along: cream-gold card with notched sides, a perforation and a printed play triangle on
   its stub. Friendly rectangle, reads as "cinema" without any brand. Arms are tiny tabs. */
const stub = {
  name: 'Stub', tr: 'Stub', idea: 'a cinema ticket that came along, with a play mark printed on its stub',
  card: (happy) => {
    const tilt = happy ? -9 : -5;
    return `<defs>${GOLD}${GLOW}</defs>
<circle cx="32" cy="32" r="28" fill="url(#K-glow)"/>
<g transform="rotate(${tilt} 32 32)">
<path d="M10 16 H54 Q56 16 56 18 V27 A5 5 0 0 0 56 37 V46 Q56 48 54 48 H10 Q8 48 8 46 V37 A5 5 0 0 0 8 27 V18 Q8 16 10 16Z" fill="url(#K-gold)" stroke="#d07a24" stroke-width="1.2"/>
<path d="M44 19 V45" stroke="#c0701e" stroke-width="1.4" stroke-dasharray="2 2.4"/>
<path d="M48 27 L54 32 L48 37Z" fill="#c0701e"/>
<path d="M12 20 H40" stroke="#fffaf0" stroke-width="1.6" opacity=".7" stroke-linecap="round"/>
${happy ? happyEyes(21, 32, 31, 3) + grin(26.5, 37, 4) : eyes(21.5, 31.5, 30.5, 2.8, 3.9) + smile(26.5, 38, 2.6)}
${cheeks(16.5, 36.5, 36, 2.2)}
</g>
${happy ? `<path d="M9 30 L3 20" stroke="#d07a24" stroke-width="3.4" stroke-linecap="round"/><path d="M55 26 L61 16" stroke="#d07a24" stroke-width="3.4" stroke-linecap="round"/>`
    : `<path d="M9 34 L4 40" stroke="#d07a24" stroke-width="3.4" stroke-linecap="round"/><path d="M56 31 L61 37" stroke="#d07a24" stroke-width="3.4" stroke-linecap="round"/>`}
<path d="M24 50 L23 58 M38 49 L39 57" stroke="#d07a24" stroke-width="3.4" stroke-linecap="round"/>`;
  },
  front() { return this.card(false); },
  happy() { return this.card(true); },
  small: () => `<defs>${GOLD}</defs>
<path d="M6 12 H58 Q60 12 60 14 V26 A6 6 0 0 0 60 38 V50 Q60 52 58 52 H6 Q4 52 4 50 V38 A6 6 0 0 0 4 26 V14 Q4 12 6 12Z" fill="url(#K-gold)" stroke="#b8661a" stroke-width="2"/>
<path d="M46 15 V49" stroke="#b8661a" stroke-width="2.2" stroke-dasharray="3 3"/>
${eyes(18, 33, 32, 3.6, 5, false)}`,
  head: [27, 17, 0.9],
};

/* ---------------- D. Glowbeam 2 (evolution) ----------------
   Keeps today's name and colours but becomes a character: a round light-drop body with an ink outline (it no longer
   melts into gold scenes), a bigger face, two small arms, and the beam moved behind it as a soft tail of light. */
const glow2 = {
  name: 'Glowbeam 2', tr: 'Işıkçık 2', idea: 'today\'s Glowbeam grown into a character: outline, arms, a face that reads',
  drop: (happy) => `<defs>${GOLD}${GLOW}<linearGradient id="K-tail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffc65a" stop-opacity=".8"/><stop offset="1" stop-color="#ffc65a" stop-opacity="0"/></linearGradient></defs>
<circle cx="30" cy="34" r="26" fill="url(#K-glow)"/>
<path d="M40 26 L63 14 L63 50 L40 40Z" fill="url(#K-tail)"/>
<path d="M30 6 Q36 16 44 24 Q50 32 48 41 Q45 55 30 55 Q15 55 12 41 Q10 32 16 24 Q24 16 30 6Z" fill="url(#K-gold)" stroke="#1a1036" stroke-width="2" stroke-linejoin="round"/>
<path d="M20 26 Q24 20 28 18" stroke="#fffaf0" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".9"/>
${happy ? `<path d="M13 38 Q5 33 6 25" stroke="#1a1036" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M47 37 Q55 32 54 24" stroke="#1a1036" stroke-width="2.6" fill="none" stroke-linecap="round"/>`
    : `<path d="M13 40 Q7 43 7 49" stroke="#1a1036" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M47 40 Q53 43 53 49" stroke="#1a1036" stroke-width="2.6" fill="none" stroke-linecap="round"/>`}
${happy ? happyEyes(24, 36, 36, 3, '#1a1036') + grin(30, 42, 4, '#1a1036') : eyes(24.5, 35.5, 36, 3, 4.2, true, '#1a1036') + smile(30, 43, 2.6, '#1a1036')}
${cheeks(19, 41, 42, 2.4)}`,
  front() { return this.drop(false); },
  happy() { return this.drop(true); },
  small: () => `<defs>${GOLD}</defs>
<path d="M32 3 Q40 15 48 24 Q56 33 53 44 Q49 60 32 60 Q15 60 11 44 Q8 33 16 24 Q24 15 32 3Z" fill="url(#K-gold)" stroke="#1a1036" stroke-width="3" stroke-linejoin="round"/>
${eyes(25, 39, 39, 3.8, 5.4, false, '#1a1036')}`,
  head: [30, 9, 0.85],
};

const SET = { lumi, pip, stub, glow2 };
for (const [id, m] of Object.entries(SET)) {
  writeFileSync(new URL(`${id}-front.svg`, OUT), svg(m.front(), `${id}f`));
  writeFileSync(new URL(`${id}-happy.svg`, OUT), svg(m.happy(), `${id}h`));
  writeFileSync(new URL(`${id}-small.svg`, OUT), svg(m.small(), `${id}s`));
  const [hx, hy, hs] = m.head;
  writeFileSync(new URL(`${id}-costume.svg`, OUT), svg(m.front() + usherCap(hx, hy, hs), `${id}c`));
}

// The home art (card 15c scene) with each mascot in Glowbeam's place, on the home page's night background.
const scene = readFileSync(new URL('../home-15c/scene.svg', import.meta.url), 'utf8').replace(/<!--[\s\S]*?-->\s*/, '')
  .replace(/<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/<text /g, `<text font-family="'Segoe UI', Helvetica, Arial, sans-serif" `);
for (const [id, m] of Object.entries(SET)) {
  const s = scene.replace(/id="hm-/g, `id="${id}-hm-`).replace(/url\(#hm-/g, `url(#${id}-hm-`).replace(/href="#hm-/g, `href="#${id}-hm-`);
  const inner = m.front().replaceAll('K-', `${id}m-`);
  writeFileSync(new URL(`${id}-home.svg`, OUT), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380"><defs><linearGradient id="${id}-bgh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22174f"/><stop offset="1" stop-color="#08061a"/></linearGradient></defs><rect width="640" height="380" rx="18" fill="url(#${id}-bgh)"/>${s}<svg x="22" y="112" width="156" height="156" viewBox="0 0 64 64">${inner}</svg></svg>\n`);
}
console.log('✓ mascot-2:', Object.keys(SET).join(', '));
export { SET };
