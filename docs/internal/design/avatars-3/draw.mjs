// Genre avatars for the "Genres / Türler" tab (Design session, owner's request after the IP audit).
// Each one is a genre type, never a specific character: no character's exact colours, outfit, signature prop or name.
// Same badge and helpers as avatars-2/full.mjs (64 x 64 circle, radial background, light on the face, two highlights
// in each eye, a rim light on the shoulders); ids are prefixed per avatar so many can sit inline on one page.
// Run: node docs/internal/design/avatars-3/draw.mjs → ./svg/<id>.svg
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = new URL('./svg/', import.meta.url);
mkdirSync(OUT, { recursive: true });
const INK = '#1d1430';

const badge = ([inner, outer], body, motif = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><clipPath id="K-c"><circle cx="32" cy="32" r="32"/></clipPath><radialGradient id="K-bg" cx="50%" cy="38%" r="68%"><stop offset="0" stop-color="${inner}"/><stop offset="1" stop-color="${outer}"/></radialGradient><radialGradient id="K-sk" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><g clip-path="url(#K-c)"><rect width="64" height="64" fill="url(#K-bg)"/>${motif}${body}<circle cx="32" cy="32" r="31.4" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1.2"/></g></svg>\n`;
const shoulders = (fill, extra = '') => `<path d="M6 64 Q8 45 32 43 Q56 45 58 64Z" fill="${fill}"/><path d="M8.5 62 Q12 47 32 45" stroke="#fff" stroke-opacity=".18" stroke-width="1.4" fill="none"/>${extra}`;
const neck = (skin) => `<rect x="28" y="38" width="8" height="7" fill="${skin}"/><rect x="28" y="38" width="8" height="2.6" fill="#000" opacity=".12"/>`;
const face = (skin, cx = 32, cy = 30, r = 12) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${skin}"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#K-sk)"/><path d="M${cx - 0.7} ${cy + 3.2} Q${cx} ${cy + 4.2} ${cx + 0.8} ${cy + 3.2}" stroke="#000" stroke-opacity=".22" stroke-width=".8" fill="none" stroke-linecap="round"/>`;
const eyes = (y = 30, dx = 5, color = INK) =>
  [32 - dx, 32 + dx].map((x) => `<ellipse cx="${x}" cy="${y}" rx="1.9" ry="2.4" fill="${color}"/><ellipse cx="${x}" cy="${y + 0.5}" rx="1.2" ry="1.4" fill="#5a4a7a" opacity=".55"/><circle cx="${x + 0.7}" cy="${y - 0.9}" r=".72" fill="#fff"/><circle cx="${x - 0.5}" cy="${y + 0.9}" r=".32" fill="#fff"/>`).join('');
const smile = (y = 35.5, w = 4) => `<path d="M${32 - w} ${y} Q32 ${y + 3} ${32 + w} ${y}" stroke="#6b2f2f" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
const blush = (y = 34, o = 0.55) => `<ellipse cx="24.5" cy="${y}" rx="2.2" ry="1.3" fill="#ff8fa3" opacity="${o}"/><ellipse cx="39.5" cy="${y}" rx="2.2" ry="1.3" fill="#ff8fa3" opacity="${o}"/>`;
const brows = (y = 26.4, c = '#3a2418', w = 1.4) => `<path d="M24.6 ${y} Q27 ${y - 1.4} 29.6 ${y} M34.4 ${y} Q37 ${y - 1.4} 39.4 ${y}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linecap="round"/>`;
const star = (x, y, r, c = '#fff3c0', o = 0.75) => `<path d="M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3}Z" fill="${c}" opacity="${o}"/>`;
const stars = `${star(10, 14, 2)}${star(54, 12, 1.5)}${star(56, 36, 1.2)}${star(7, 38, 1)}`;

// Skin tones used once each where possible, light to deep.
const SKIN = { a: '#f6d7c3', b: '#f0cfa8', c: '#efc4a0', d: '#e8b48f', e: '#e3b088', f: '#d9a07a', g: '#c58e68', h: '#c08a5e', i: '#b8774e', j: '#9a6440', k: '#7a4a30', l: '#5e3a26' };

export const GENRES = {
  // Detective: a fedora, a trench coat and a magnifying glass; short dark bob
  detective: badge(['#8fb0bc', '#22323c'], `
${shoulders('#c8a878', '<path d="M22 44.6 L32 56 L28 64 L14 64 Q14 50 22 44.6Z M42 44.6 L32 56 L36 64 L50 64 Q50 50 42 44.6Z" fill="#b08e5e"/><path d="M27 44 L32 50 L37 44Z" fill="#f4efe4"/>')}
<path d="M19.4 27 Q18 39 22.6 41 L24.2 30Z M44.6 27 Q46 39 41.4 41 L39.8 30Z" fill="#1e1410"/>
${neck(SKIN.l)}${face(SKIN.l)}
${eyes(31)}${brows(27, '#1e1410')}${smile(36, 3.6)}${blush(34.4, 0.35)}
<ellipse cx="32" cy="22.6" rx="19" ry="3.4" fill="#4a4038"/>
<path d="M20.4 22.4 Q20 11 32 11 Q44 11 43.6 22.4Z" fill="#5c5046"/>
<path d="M26.6 12.6 Q32 15.6 37.4 12.6" stroke="#3e352e" stroke-width="1.2" fill="none"/>
<rect x="20.6" y="18.4" width="22.8" height="3" fill="#2a221c"/>
<g transform="translate(50 50)"><path d="M-3.4 3.4 L-8.6 9" stroke="#6a4a2a" stroke-width="2.4" stroke-linecap="round"/><circle r="5" fill="#cfeaff" fill-opacity=".45" stroke="#d9a94a" stroke-width="1.6"/><path d="M-2.6 -1.6 Q-1.6 -3 0 -3.2" stroke="#fff" stroke-width=".9" fill="none" stroke-linecap="round"/></g>`),

  // Pirate: a tricorn with a gold edge, an eye patch, a short beard, a striped shirt
  pirate: badge(['#74c6dc', '#1a4a6a'], `
${shoulders('#f4efe4', '<path d="M8.6 54 Q30 49 55.4 54 M7 60 Q32 55 57 60" stroke="#2f5a9a" stroke-width="2.6" fill="none"/><path d="M26 44 L32 50 L38 44Z" fill="' + SKIN.f + '"/>')}
${neck(SKIN.f)}${face(SKIN.f)}
<path d="M21 31 Q21.6 42.6 32 43.4 Q42.4 42.6 43 31 Q41 37.4 37 38 Q32 36 27 38 Q23 37.4 21 31Z" fill="#5a3a22"/>
<path d="M28.6 39 Q32 40.4 35.4 39" stroke="#3a2418" stroke-width="1.3" fill="none" stroke-linecap="round"/>
${eyes(30.6).split('</ellipse>').slice(0, 0).join('')}
<ellipse cx="27" cy="30.6" rx="1.9" ry="2.4" fill="${INK}"/><circle cx="27.7" cy="29.7" r=".72" fill="#fff"/><circle cx="26.5" cy="31.5" r=".32" fill="#fff"/>
<path d="M20.6 25 L44 33.6" stroke="#1d1430" stroke-width="1.1"/><ellipse cx="37" cy="30.8" rx="3.4" ry="3" fill="#1d1430"/>
${brows(26.4, '#3a2418')}
<path d="M14 22.6 Q20 14 32 13.6 Q44 14 50 22.6 Q42 19.6 32 20.4 Q22 19.6 14 22.6Z" fill="#2a1c14"/>
<path d="M18 20 Q22 9 32 8.6 Q42 9 46 20 Q40 17.6 32 18 Q24 17.6 18 20Z" fill="#3a2a1e"/>
<path d="M14 22.6 Q20 14 32 13.6 Q44 14 50 22.6" stroke="#e6c26a" stroke-width="1.1" fill="none"/>`),

  // Astronaut: a round helmet with a visor glint, a white suit, our own mission patch
  astronaut: badge(['#4a4a8a', '#0a0a2a'], `
${shoulders('#eef1f6', '<rect x="20" y="49" width="8" height="8" rx="2" fill="#ff8a4a"/><circle cx="43" cy="53" r="4.4" fill="#2a3a7a"/>' + star(43, 53, 2.6, '#ffc65a', 1) + '<path d="M32 44 V64" stroke="#c8ced8" stroke-width="1.2"/>')}
${neck(SKIN.a)}
<path d="M19.6 26 Q19.4 18 32 17.4 Q44.6 18 44.4 26 Q40 21.4 33 22.4 Q26 21 19.6 26Z" fill="#7a4a2a"/>
${face(SKIN.a, 32, 31, 11)}
<path d="M21 28 Q22 20.4 32 20 Q42 20.4 43 28 Q38 23.6 32 24.6 Q26 23.6 21 28Z" fill="#7a4a2a"/>
${eyes(31.4, 4.4)}${smile(36, 3)}${blush(34.6)}
<circle cx="32" cy="30.6" r="17.6" fill="#bfe8ff" fill-opacity=".14" stroke="#eef1f6" stroke-width="3.2"/>
<path d="M19.6 22 Q23.4 15.4 30.4 14" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" opacity=".8"/>`, stars),

  // Inventor: an older inventor, grey bun, brass goggles up on the forehead, a lab coat with pens
  inventor: badge(['#8ad0c0', '#1d5a50'], `
${shoulders('#f6f6f2', '<path d="M24 44 L32 54 L40 44" fill="#5a8ab0"/><path d="M24 44 L29 64 M40 44 L35 64" stroke="#d6d6ce" stroke-width="1.2"/><rect x="41" y="52" width="7" height="6" rx="1" fill="#e6e6de"/><path d="M43 52 V48.6 M45.6 52 V49" stroke="#e05a4a" stroke-width="1.2" stroke-linecap="round"/>')}
<circle cx="32" cy="15" r="5.4" fill="#c9c9cf"/>
${neck(SKIN.h)}
<path d="M19.4 33 Q17 18 32 17 Q47 18 44.6 33 Q42 24 32 23.4 Q22 24 19.4 33Z" fill="#c9c9cf"/>
${face(SKIN.h)}
<path d="M20 27 Q21 18.4 32 18 Q43 18.4 44 27 Q38 21.6 32 22 Q26 21.6 20 27Z" fill="#d8d8de"/>
${eyes(31)}${brows(27.2, '#9a9aa2', 1.3)}${smile(35.8, 3.6)}
<path d="M23 34.6 Q24.4 35.6 25.6 35.2 M38.4 35.2 Q39.6 35.6 41 34.6" stroke="#000" stroke-opacity=".18" stroke-width=".8" fill="none"/>
<path d="M19.6 22.6 Q32 19.4 44.4 22.6" stroke="#5a3a22" stroke-width="2" fill="none"/>
<circle cx="26.6" cy="21.4" r="3.8" fill="#bfe4ff" fill-opacity=".7" stroke="#c9963a" stroke-width="1.6"/><circle cx="37.4" cy="21.4" r="3.8" fill="#bfe4ff" fill-opacity=".7" stroke="#c9963a" stroke-width="1.6"/>
<path d="M25 20.2 Q26 19.2 27.4 19.2 M35.8 20.2 Q36.8 19.2 38.2 19.2" stroke="#fff" stroke-width=".8" fill="none"/>`),

  // Ninja: an indigo hood with only the eyes showing, a teal headband with tails, under a big moon
  ninja: badge(['#f2a07a', '#5a1f1a'], `
${shoulders('#2a2a4a', '<path d="M22 44 L32 52 L42 44" stroke="#1a1a30" stroke-width="2" fill="none"/>')}
<path d="M19 30 Q18 17 32 16.4 Q46 17 45 30 Q45 42 32 44 Q19 42 19 30Z" fill="#2e2e52"/>
<path d="M19.6 30 Q19.6 30 32 30 Q44.4 30 44.4 30" fill="none"/>
<path d="M21 27.6 Q32 25.4 43 27.6 L43 34 Q32 36.2 21 34Z" fill="${SKIN.c}"/>
<path d="M21 27.6 Q32 25.4 43 27.6 L43 34 Q32 36.2 21 34Z" fill="url(#K-sk)"/>
${eyes(31, 5)}
<path d="M23.8 28.2 Q27 27 30 28.4 M34 28.4 Q37 27 40.2 28.2" stroke="#1a1a30" stroke-width="1.3" fill="none" stroke-linecap="round"/>
<path d="M19 22.6 Q32 19.6 45 22.6 V25.4 Q32 22.4 19 25.4Z" fill="#2ab8a8"/>
<path d="M45 23.6 Q51 22 55 26.6 Q50 25.4 46.6 25.6 M45.4 24.6 Q50 27 52.6 32 Q48.6 28.6 45.6 26.4" fill="#2ab8a8"/>`, `<circle cx="47" cy="17" r="11" fill="#fff4dc" opacity=".55"/>`),

  // Cowboy: an older rancher, a wide hat, a grey moustache, a denim shirt and a teal neckerchief
  cowboy: badge(['#f6cc8a', '#a0582a'], `
${shoulders('#5a7aa8', '<path d="M24 43.4 L32 51 L40 43.4 L36 47.4 L32 46 L28 47.4Z" fill="#2aa898"/><path d="M14 52 L22 50 M50 52 L42 50" stroke="#4a6894" stroke-width="1.2"/><circle cx="32" cy="56" r="1" fill="#e6e0d0"/><circle cx="32" cy="61" r="1" fill="#e6e0d0"/>')}
${neck(SKIN.e)}${face(SKIN.e)}
${eyes(30.8)}${brows(26.8, '#a8a8a8', 1.5)}
<path d="M32 34.4 Q28 33 25 35.8 Q28.6 36.8 32 35.6 Q35.4 36.8 39 35.8 Q36 33 32 34.4Z" fill="#b8b8b8"/>
<path d="M29.4 38.6 Q32 40 34.6 38.6" stroke="#6b2f2f" stroke-width="1.3" fill="none" stroke-linecap="round"/>
<path d="M22.6 32.8 Q23.6 34 25 33.8 M39 33.8 Q40.4 34 41.4 32.8" stroke="#000" stroke-opacity=".18" stroke-width=".8" fill="none"/>
<path d="M9 22 Q12 26.4 32 26 Q52 26.4 55 22 Q52 19.4 46 20.6 Q32 22.6 18 20.6 Q12 19.4 9 22Z" fill="#8a5a32"/>
<path d="M19 21.4 Q19 9 26 9.6 Q29 10.4 32 13 Q35 10.4 38 9.6 Q45 9 45 21.4 Q32 23.6 19 21.4Z" fill="#9a6a3e"/>
<path d="M19.2 19 Q32 21.4 44.8 19" stroke="#4a3220" stroke-width="2" fill="none"/>`),

  // Vampire: a friendly one, pale skin, a widow's peak, a tall collar (black outside, wine inside), tiny fangs
  vampire: badge(['#a87ad0', '#2a1440'], `
${shoulders('#1a1424', '<path d="M8 40 Q14 46 22 45 L26 64 L8 64Z M56 40 Q50 46 42 45 L38 64 L56 64Z" fill="#7a1a32"/><path d="M8 40 Q12 34 16 38 Q20 40 22 45 Q14 46 8 40Z M56 40 Q52 34 48 38 Q44 40 42 45 Q50 46 56 40Z" fill="#1a1424"/><path d="M27 44 L32 50 L37 44Z" fill="#f4efe4"/><circle cx="32" cy="51.4" r="1.6" fill="#c0304a"/>')}
${neck(SKIN.a.replace('f6d7c3', 'eee4ea'))}${face('#eee4ea')}
<path d="M19.6 30 Q18.4 16 32 15.6 Q45.6 16 44.4 30 Q42.4 22.4 36 21 L32 26 L28 21 Q21.6 22.4 19.6 30Z" fill="#1e1428"/>
${eyes(31, 5, '#3a1430')}
<path d="M24.4 27.4 Q27 26 29.8 27.6 M34.2 27.6 Q37 26 39.6 27.4" stroke="#1e1428" stroke-width="1.3" fill="none" stroke-linecap="round"/>
<path d="M27.6 35.4 Q32 38.6 36.4 35.4" stroke="#8a2a3a" stroke-width="1.4" fill="none" stroke-linecap="round"/>
<path d="M29.4 36.4 L30 38.4 L30.8 36.8Z M33.2 36.8 L34 38.4 L34.6 36.4Z" fill="#fff"/>
${blush(34, 0.4)}`, `<path d="M47 13 q2.4 -3 4.6 -.4 q1.6 -1.6 3 .4 q-1.6 .2 -2.4 1.6 q-1 -1 -2.6 0 q-.6 -1.4 -2.6 -1.6Z" fill="#1a1024" opacity=".55"/>${star(10, 16, 1.6)}`),

  // Robot: a friendly boxy robot, round cyan eyes, an antenna, a speaker grille mouth, bolts
  robot: badge(['#ffd27a', '#c0802a'], `
${shoulders('#8a96aa', '<rect x="24" y="50" width="16" height="9" rx="2" fill="#5a6478"/><circle cx="28" cy="54.4" r="1.6" fill="#ff6a5a"/><circle cx="33" cy="54.4" r="1.6" fill="#ffd25a"/><circle cx="38" cy="54.4" r="1.6" fill="#5ae08a"/>')}
<rect x="27.6" y="38" width="8.8" height="7" fill="#6a7488"/><path d="M27.6 40.4 H36.4 M27.6 42.8 H36.4" stroke="#4a5266" stroke-width=".8"/>
<path d="M32 15 V8.6" stroke="#6a7488" stroke-width="1.6"/><circle cx="32" cy="7.4" r="2.4" fill="#ff6a5a"/><circle cx="31.4" cy="6.8" r=".7" fill="#fff"/>
<rect x="17.6" y="14.6" width="28.8" height="25" rx="6" fill="#b4c0d2" stroke="#8a96aa" stroke-width="1"/>
<rect x="17.6" y="14.6" width="28.8" height="25" rx="6" fill="url(#K-sk)"/>
<rect x="15" y="23" width="3" height="8" rx="1.4" fill="#8a96aa"/><rect x="46" y="23" width="3" height="8" rx="1.4" fill="#8a96aa"/>
<circle cx="25.6" cy="25.4" r="4.6" fill="#1d2a3a"/><circle cx="38.4" cy="25.4" r="4.6" fill="#1d2a3a"/>
<circle cx="25.6" cy="25.4" r="2.8" fill="#5ae0f0"/><circle cx="38.4" cy="25.4" r="2.8" fill="#5ae0f0"/>
<circle cx="26.6" cy="24.4" r=".9" fill="#fff"/><circle cx="39.4" cy="24.4" r=".9" fill="#fff"/>
<rect x="25" y="32.4" width="14" height="4" rx="2" fill="#1d2a3a"/><path d="M28 32.4 V36.4 M31 32.4 V36.4 M34 32.4 V36.4 M37 32.4 V36.4" stroke="#5ae0f0" stroke-width=".8"/>
<circle cx="20.4" cy="17.4" r=".9" fill="#8a96aa"/><circle cx="43.6" cy="17.4" r=".9" fill="#8a96aa"/><circle cx="20.4" cy="36.8" r=".9" fill="#8a96aa"/><circle cx="43.6" cy="36.8" r=".9" fill="#8a96aa"/>`),

  // Hero: our own superhero, curly hair, a teal domino mask, an orange cape, a gold spark emblem in a diamond
  hero: badge(['#86c8ff', '#1a3a8a'], `
<path d="M6 64 L12 42 Q20 40 32 42 Q44 40 52 42 L58 64Z" fill="#ff7a3a"/>
${shoulders('#1fa6a0', '<path d="M32 47 L38 53 L32 59 L26 53Z" fill="#ffd25a"/><path d="M32 49.6 L33 52 L35.4 53 L33 54 L32 56.4 L31 54 L28.6 53 L31 52Z" fill="#1fa6a0"/><path d="M12 42 Q16 46 20 44.6 M52 42 Q48 46 44 44.6" stroke="#e05a24" stroke-width="1.4" fill="none"/>')}
<g fill="#2a1a12"><circle cx="21" cy="21" r="6"/><circle cx="27" cy="16" r="6.4"/><circle cx="35" cy="15.4" r="6.6"/><circle cx="42" cy="19.6" r="6.2"/><circle cx="45.4" cy="27" r="5.2"/><circle cx="18.4" cy="28" r="5"/></g>
${neck(SKIN.j)}${face(SKIN.j)}
<g fill="#2a1a12"><circle cx="24" cy="20.6" r="4.4"/><circle cx="31" cy="18.6" r="4.6"/><circle cx="38" cy="19.6" r="4.4"/></g>
<path d="M20.6 30.4 Q21.4 25.4 27 26.4 Q30 26.8 32 28.4 Q34 26.8 37 26.4 Q42.6 25.4 43.4 30.4 Q42 35 37 33.6 Q34 33 32 31.4 Q30 33 27 33.6 Q22 35 20.6 30.4Z" fill="#1fa6a0"/>
<ellipse cx="27.2" cy="30.4" rx="2.6" ry="2.2" fill="#fff"/><ellipse cx="36.8" cy="30.4" rx="2.6" ry="2.2" fill="#fff"/>
<circle cx="27.6" cy="30.6" r="1.4" fill="${INK}"/><circle cx="36.4" cy="30.6" r="1.4" fill="${INK}"/><circle cx="28" cy="30" r=".5" fill="#fff"/><circle cx="36.8" cy="30" r=".5" fill="#fff"/>
<path d="M27.6 36.2 Q32 39.6 36.4 36.2" stroke="#5a1f1f" stroke-width="1.5" fill="none" stroke-linecap="round"/>`),

  // Merfolk: long dark waves with a shell clip, a scale top in teal and gold, under the sea
  mermaid: badge(['#7ae6e0', '#16608a'], `
<path d="M17 30 Q14 46 18 62 L26 62 Q22 46 24 34Z M47 30 Q50 46 46 62 L38 62 Q42 46 40 34Z" fill="#2a1a1e"/>
${shoulders('#21a89a', '<g fill="#e6c26a" opacity=".55"><path d="M18 52 q3 -3 6 0 q-3 3 -6 0Z"/><path d="M26 56 q3 -3 6 0 q-3 3 -6 0Z"/><path d="M34 52 q3 -3 6 0 q-3 3 -6 0Z"/><path d="M42 56 q3 -3 6 0 q-3 3 -6 0Z"/><path d="M30 60 q3 -3 6 0 q-3 3 -6 0Z"/></g><path d="M22 44 Q32 49 42 44" stroke="#f4efe4" stroke-width="1.4" fill="none"/>')}
${neck(SKIN.i)}${face(SKIN.i)}
<path d="M19.4 32 Q17.6 16 32 15.6 Q46.4 16 44.6 32 Q43 23 36 21.4 Q30 26 22.4 25 Q20.6 28 19.4 32Z" fill="#2a1a1e"/>
<path d="M22 20 Q26 16 30 19 Q34 16 38 19" stroke="#4a3238" stroke-width="1" fill="none"/>
<g transform="translate(40.6 22) rotate(20)"><path d="M0 0 L-3.4 -4.4 Q0 -6.4 3.4 -4.4Z" fill="#ffb0c0"/><path d="M0 0 L-1.6 -5 M0 0 V-5.6 M0 0 L1.6 -5" stroke="#e07a90" stroke-width=".5"/></g>
${eyes(31)}${brows(27.2, '#2a1a1e', 1.2)}${smile(35.8, 3.6)}${blush(34.2, 0.4)}`, `<g fill="none" stroke="#e6faff" stroke-width=".9" opacity=".6"><circle cx="8" cy="20" r="1.8"/><circle cx="56" cy="16" r="1.4"/><circle cx="58" cy="32" r="2.2"/><circle cx="6" cy="34" r="1.1"/></g>`),

  // Explorer: a khaki pith helmet, round glasses, a khaki shirt with pockets and binoculars, leaves behind
  explorer: badge(['#a6d880', '#2a5a2a'], `
${shoulders('#c9b07a', '<rect x="16" y="50" width="9" height="7" rx="1.4" fill="#b49a64"/><rect x="39" y="50" width="9" height="7" rx="1.4" fill="#b49a64"/><path d="M22 44 Q32 52 42 44" stroke="#5a3a22" stroke-width="1.4" fill="none"/><rect x="27.4" y="51" width="4" height="6" rx="1.6" fill="#2a2a2a"/><rect x="32.6" y="51" width="4" height="6" rx="1.6" fill="#2a2a2a"/><rect x="31" y="52" width="2" height="2" fill="#2a2a2a"/>')}
${neck(SKIN.b)}${face(SKIN.b)}
<path d="M20.4 28 Q20 23 24 22.4 L40 22.4 Q44 23 43.6 28 Q40 25 36 26 L28 26 Q24 25 20.4 28Z" fill="#1e1a1e"/>
${eyes(30.8, 4.8)}
<circle cx="27.2" cy="30.8" r="3.6" fill="none" stroke="#3a2a22" stroke-width="1.1"/><circle cx="36.8" cy="30.8" r="3.6" fill="none" stroke="#3a2a22" stroke-width="1.1"/><path d="M30.8 30.6 Q32 30 33.2 30.6" stroke="#3a2a22" stroke-width="1.1" fill="none"/>
${smile(36.2, 3.4)}${blush(34.6, 0.4)}
<ellipse cx="32" cy="22.6" rx="18.6" ry="3.4" fill="#d8c48e"/>
<path d="M17.6 22.6 Q17 8.6 32 8.4 Q47 8.6 46.4 22.6Z" fill="#e6d6a6"/>
<path d="M18.4 18.6 Q32 21 45.6 18.6" stroke="#8a6a3a" stroke-width="1.8" fill="none"/>
<path d="M22 13 Q26 9.6 31 9.4" stroke="#fff" stroke-opacity=".45" stroke-width="1.4" fill="none" stroke-linecap="round"/>`, `<g fill="#1e4a20" opacity=".5"><path d="M2 24 Q10 18 14 28 Q6 30 2 24Z"/><path d="M62 26 Q54 18 50 30 Q58 32 62 26Z"/></g>`),

  // Chef: an older chef, a tall toque, a grey beard, a white double-breasted jacket
  chef: badge(['#ffb894', '#b04a3a'], `
${shoulders('#f8f6f0', '<path d="M32 44 L36 48 V64" stroke="#d8d4c8" stroke-width="1.2" fill="none"/><g fill="#c8c0b0"><circle cx="40" cy="51" r="1.2"/><circle cx="40" cy="57" r="1.2"/><circle cx="46" cy="51" r="1.2"/><circle cx="46" cy="57" r="1.2"/></g><path d="M24 43.4 Q32 47.4 40 43.4" stroke="#d8d4c8" stroke-width="2.6" fill="none"/>')}
${neck(SKIN.k)}${face(SKIN.k)}
<path d="M21.6 31 Q22.4 43 32 43.6 Q41.6 43 42.4 31 Q40.6 37 36.6 37.4 Q32 36 27.4 37.4 Q23.4 37 21.6 31Z" fill="#c4c4c4"/>
<path d="M29 38.4 Q32 40 35 38.4" stroke="#5a1f1f" stroke-width="1.3" fill="none" stroke-linecap="round"/>
${eyes(30.6)}${brows(26.6, '#c4c4c4', 1.6)}
<rect x="20.6" y="17.6" width="22.8" height="5" rx="1.4" fill="#f4f2ec" stroke="#dcd8cc" stroke-width=".6"/>
<path d="M21 18 Q15 13 19 7.6 Q22 3.6 26.6 6 Q28 1.4 32 1.6 Q36 1.4 37.4 6 Q42 3.6 45 7.6 Q49 13 43 18Z" fill="#ffffff" stroke="#e4e0d6" stroke-width=".8"/>
<path d="M27 8 Q27.6 13 28 17.4 M37 8 Q36.4 13 36 17.4" stroke="#e4e0d6" stroke-width=".8" fill="none"/>`),

  // Rock star: blue-streaked long hair, round dark glasses, a studded leather jacket, a lightning earring
  rocker: badge(['#ff7ab8', '#4a1040'], `
<path d="M18 26 Q12 44 17 60 L25 58 Q21 44 23 32Z M46 26 Q52 44 47 60 L39 58 Q43 44 41 32Z" fill="#1a1426"/>
<path d="M16 40 Q15 50 18 58 M48 40 Q49 50 46 58" stroke="#3a7aff" stroke-width="2" fill="none" stroke-linecap="round"/>
${shoulders('#1e1a24', '<path d="M22 44 L30 54 L26 64 L16 64Z M42 44 L34 54 L38 64 L48 64Z" fill="#2c2634"/><g fill="#c8ccd6"><circle cx="18" cy="50" r=".9"/><circle cx="21" cy="47.6" r=".9"/><circle cx="46" cy="50" r=".9"/><circle cx="43" cy="47.6" r=".9"/></g><path d="M28 45 Q32 49 36 45" fill="#ff5a8a"/>')}
${neck(SKIN.d)}${face(SKIN.d)}
<path d="M19.4 30 Q18 15 32 14.6 Q46 15 44.6 30 Q42 21 35 20 Q30 24 22 23.4 Q20.4 26.6 19.4 30Z" fill="#1a1426"/>
<path d="M30 15.4 Q34 18.6 35 20" stroke="#3a7aff" stroke-width="2" fill="none" stroke-linecap="round"/>
<circle cx="27" cy="30.6" r="3.6" fill="#1a1426"/><circle cx="37" cy="30.6" r="3.6" fill="#1a1426"/><path d="M30.6 30.2 H33.4" stroke="#1a1426" stroke-width="1.2"/>
<path d="M25.2 29 Q26 28 27.4 27.8 M35.2 29 Q36 28 37.4 27.8" stroke="#fff" stroke-width=".8" fill="none" opacity=".8"/>
<path d="M27.4 35.6 Q32 39.6 36.6 35.6 Q32 37.4 27.4 35.6Z" fill="#8a1a3a"/>
<path d="M44.4 35 L43 38.4 L45 38.4 L43.6 42" stroke="#ffd25a" stroke-width="1.1" fill="none" stroke-linejoin="round"/>`, `${star(9, 18, 2.2, '#fff')}${star(55, 14, 1.6, '#fff')}`),

  // Ghost: a friendly sheet ghost with big eyes and a little "oh"
  ghost: badge(['#c4b4f6', '#2a2060'], `
<path d="M14 64 L14 30 Q14 10 32 10 Q50 10 50 30 L50 64Z" fill="#000" opacity=".12" transform="translate(1.2 1.2)"/>
<path d="M14 66 L14 30 Q14 10 32 10 Q50 10 50 30 L50 66Z" fill="#f8f6ff"/>
<path d="M14 66 L14 30 Q14 10 32 10 Q50 10 50 30 L50 66Z" fill="url(#K-sk)"/>
<path d="M20 20 Q24 14 30 13" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M44 34 Q48 44 46 56" stroke="#d8d0f0" stroke-width="1.4" fill="none"/>
<ellipse cx="26" cy="29" rx="3.4" ry="4.4" fill="${INK}"/><ellipse cx="38" cy="29" rx="3.4" ry="4.4" fill="${INK}"/>
<circle cx="27.2" cy="27.4" r="1.2" fill="#fff"/><circle cx="39.2" cy="27.4" r="1.2" fill="#fff"/><circle cx="25.2" cy="30.6" r=".5" fill="#fff"/><circle cx="37.2" cy="30.6" r=".5" fill="#fff"/>
<ellipse cx="32" cy="38" rx="2.4" ry="3" fill="#3a2a5a"/>
<ellipse cx="22.4" cy="35.4" rx="2.6" ry="1.5" fill="#ff8fb3" opacity=".55"/><ellipse cx="41.6" cy="35.4" rx="2.6" ry="1.5" fill="#ff8fb3" opacity=".55"/>`, stars),

  // Alien: a lilac visitor, two big almond eyes, two antennae with glowing tips, a silver collar
  alien: badge(['#5ad6c4', '#0a2a3a'], `
${shoulders('#c8ced8', '<path d="M18 46 Q32 52 46 46" stroke="#8a94a8" stroke-width="1.6" fill="none"/><circle cx="32" cy="55" r="3" fill="#5ad6c4"/><circle cx="32" cy="55" r="1.4" fill="#e8fffa"/>')}
<rect x="28.6" y="37" width="6.8" height="8" fill="#b89ae6"/>
<path d="M24 14 Q20 7 17 5" stroke="#b89ae6" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M40 14 Q44 7 47 5" stroke="#b89ae6" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<circle cx="16.6" cy="4.6" r="2.4" fill="#ffe86a"/><circle cx="47.4" cy="4.6" r="2.4" fill="#ffe86a"/>
<path d="M17 24 Q16 11 32 11 Q48 11 47 24 Q46 36 32 40.6 Q18 36 17 24Z" fill="#c4a8f0"/>
<path d="M17 24 Q16 11 32 11 Q48 11 47 24 Q46 36 32 40.6 Q18 36 17 24Z" fill="url(#K-sk)"/>
<path d="M21.4 24.6 Q22 19.6 27.6 20.6 Q30.4 22 29.6 26.6 Q28.4 30.4 24.4 29.4 Q21 28.4 21.4 24.6Z" fill="${INK}"/>
<path d="M42.6 24.6 Q42 19.6 36.4 20.6 Q33.6 22 34.4 26.6 Q35.6 30.4 39.6 29.4 Q43 28.4 42.6 24.6Z" fill="${INK}"/>
<circle cx="26.6" cy="22.8" r="1.3" fill="#fff"/><circle cx="37.4" cy="22.8" r="1.3" fill="#fff"/><circle cx="24.6" cy="26.6" r=".5" fill="#fff"/><circle cx="39.4" cy="26.6" r=".5" fill="#fff"/>
<path d="M28.6 34 Q32 36.4 35.4 34" stroke="#5a3a8a" stroke-width="1.4" fill="none" stroke-linecap="round"/>
<ellipse cx="22" cy="32" rx="2" ry="1.2" fill="#ff8fc3" opacity=".5"/><ellipse cx="42" cy="32" rx="2" ry="1.2" fill="#ff8fc3" opacity=".5"/>`, `${star(10, 20, 1.6)}${star(54, 22, 1.3)}<circle cx="52" cy="44" r="3.4" fill="#ffc65a" opacity=".45"/><ellipse cx="52" cy="44" rx="6" ry="1.4" fill="none" stroke="#ffc65a" stroke-opacity=".5" stroke-width=".8"/>`),

  // Samurai: a topknot, layered red-lacquer shoulder plates over a dark robe, a calm face, a rising sun
  samurai: badge(['#f4d6a6', '#8a3a2a'], `
${shoulders('#2a2236', '<path d="M6 54 Q10 46 22 45 L22 50 Q12 51 8 58Z M6 60 Q10 53 22 52 L22 57 Q12 58 8 64Z M58 54 Q54 46 42 45 L42 50 Q52 51 56 58Z M58 60 Q54 53 42 52 L42 57 Q52 58 56 64Z" fill="#b2362a"/><path d="M26 44 L32 52 L38 44" fill="#e8e0cc"/><path d="M29 44 L32 48 L35 44" fill="#2a2236"/>')}
${neck(SKIN.d.replace('e8b48f', 'e0a882'))}${face('#e0a882')}
<path d="M19.6 30 Q18.6 18 32 17.4 Q45.4 18 44.4 30 Q43 23 32 22.4 Q21 23 19.6 30Z" fill="#14101a"/>
<path d="M28.6 17.6 Q28 11 32 10 Q36 11 35.4 17.6Z" fill="#14101a"/><rect x="29.6" y="13" width="4.8" height="2" fill="#b2362a"/>
${eyes(31)}
<path d="M24.2 27.2 L29.6 27.8 M34.4 27.8 L39.8 27.2" stroke="#14101a" stroke-width="1.6" stroke-linecap="round"/>
<path d="M29 36.6 Q32 38 35 36.6" stroke="#6b2f2f" stroke-width="1.4" fill="none" stroke-linecap="round"/>`, `<circle cx="48" cy="20" r="9" fill="#e05a3a" opacity=".55"/>`),

  // Fairy: dark curls with a flower crown, see-through wings, a lavender dress, sparkles
  fairy: badge(['#ffdcf2', '#b05a9a'], `
<path d="M24 46 Q6 30 6 42 Q6 54 22 52Z M40 46 Q58 30 58 42 Q58 54 42 52Z" fill="#c8f0ff" fill-opacity=".7" stroke="#fff" stroke-width=".8"/>
<path d="M24 50 Q10 56 12 62 Q18 62 25 54Z M40 50 Q54 56 52 62 Q46 62 39 54Z" fill="#ffd6f0" fill-opacity=".7" stroke="#fff" stroke-width=".8"/>
${shoulders('#b49ae6', '<path d="M24 44 Q32 50 40 44" stroke="#f4efe4" stroke-width="1.4" fill="none"/>')}
<g fill="#24140e"><circle cx="20" cy="26" r="5"/><circle cx="23" cy="19" r="5.4"/><circle cx="30" cy="16" r="5.6"/><circle cx="37" cy="16.4" r="5.4"/><circle cx="43" cy="20.4" r="5.2"/><circle cx="45" cy="27" r="4.6"/></g>
${neck(SKIN.l.replace('5e3a26', '6a4028'))}${face('#6a4028')}
<g fill="#24140e"><circle cx="24.4" cy="21.6" r="3.8"/><circle cx="31" cy="20" r="4"/><circle cx="38" cy="20.6" r="3.8"/></g>
<g><circle cx="22" cy="18.6" r="2" fill="#ffb0c8"/><circle cx="27.6" cy="15.4" r="2" fill="#fff3a0"/><circle cx="33.4" cy="14.4" r="2" fill="#ffb0c8"/><circle cx="39" cy="15.4" r="2" fill="#b0e8c0"/><circle cx="43.6" cy="18.8" r="2" fill="#fff3a0"/></g>
${eyes(31)}${smile(35.8, 3.6)}${blush(34.2, 0.45)}`, `${star(10, 14, 2, '#fff')}${star(55, 12, 1.6, '#fff')}${star(58, 34, 1.1, '#fff')}`),

  // Spy: slicked hair, shades, an earpiece with a coiled wire, a navy turtleneck under a grey jacket, a spotlight
  spy: badge(['#6a7a9a', '#141a2a'], `
${shoulders('#5a6070', '<path d="M24 43 Q32 46 40 43 L40 64 L24 64Z" fill="#1e2640"/><path d="M24 43 L19 64 M40 43 L45 64" stroke="#454a58" stroke-width="1.2"/><path d="M24.4 44.6 Q32 47.6 39.6 44.6" stroke="#2c3656" stroke-width="2" fill="none"/>')}
${neck(SKIN.g)}${face(SKIN.g)}
<path d="M19.6 29 Q18.4 16 32 15.6 Q45.6 16 44.4 29 Q43 21.6 36 20.6 Q28 22 22 22.4 Q20.6 25 19.6 29Z" fill="#20160e"/>
<path d="M24 19 Q30 16.6 38 18" stroke="#3e2e22" stroke-width="1" fill="none"/>
<path d="M22.2 28.4 H30.4 Q30.4 33.4 26.4 33.4 Q22.2 33.4 22.2 28.4Z M33.6 28.4 H41.8 Q41.8 33.4 37.6 33.4 Q33.6 33.4 33.6 28.4Z" fill="#14141c"/>
<path d="M30.4 29 H33.6" stroke="#14141c" stroke-width="1.2"/>
<path d="M23.6 29.6 Q25 29 26.4 29.2 M35 29.6 Q36.4 29 37.8 29.2" stroke="#fff" stroke-width=".7" fill="none" opacity=".7"/>
<path d="M28.6 36.6 Q32 37.6 35.4 36.2" stroke="#6b2f2f" stroke-width="1.4" fill="none" stroke-linecap="round"/>
<circle cx="44.2" cy="31" r="1.4" fill="#2a2a32"/><path d="M44.2 32.4 q1.4 1 0 2 q-1.4 1 0 2 q1.4 1 0 2 q-1.2 1 -.4 4" stroke="#c8ccd6" stroke-width=".7" fill="none"/>`, `<path d="M18 0 L46 0 L56 64 L8 64Z" fill="#fff" opacity=".07"/>`),
};

export const NAMES = {
  detective: ['Detective', 'Dedektif'], pirate: ['Pirate', 'Korsan'], astronaut: ['Astronaut', 'Astronot'],
  inventor: ['Inventor', 'Mucit'], ninja: ['Ninja', 'Ninja'], cowboy: ['Cowboy', 'Kovboy'],
  vampire: ['Vampire', 'Vampir'], robot: ['Robot', 'Robot'], hero: ['Hero', 'Kahraman'], mermaid: ['Merfolk', 'Denizkızı'],
  explorer: ['Explorer', 'Kaşif'], chef: ['Chef', 'Şef'], rocker: ['Rocker', 'Rockçı'], ghost: ['Ghost', 'Hayalet'],
  alien: ['Alien', 'Uzaylı'], samurai: ['Samurai', 'Samuray'], fairy: ['Fairy', 'Peri'], spy: ['Spy', 'Casus'],
};

// The owner's pick (4 Nov 2026): all but `mermaid`. scripts/avatars.mjs ships every file in ./svg/, so a drawing that
// was not picked goes to ./unused/ instead.
export const NOT_PICKED = ['mermaid'];
const UNUSED = new URL('./unused/', import.meta.url);
mkdirSync(UNUSED, { recursive: true });
for (const [id, svg] of Object.entries(GENRES)) {
  const dir = NOT_PICKED.includes(id) ? UNUSED : OUT;
  writeFileSync(new URL(`${id}.svg`, dir), svg.replaceAll('K-', `${id}-`).replace(/\n\s*\n/g, '\n'));
}
console.log(`✓ ${Object.keys(GENRES).length - NOT_PICKED.length} genre avatars → avatars-3/svg, ${NOT_PICKED.length} → avatars-3/unused`);
