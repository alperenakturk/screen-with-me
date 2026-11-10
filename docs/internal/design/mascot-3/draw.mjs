// MASCOT3 (Design session, 10 Nov 2026): the final Stub set. The owner picked direction C of MASCOT2 (Stub, the
// ticket). Everything is drawn on the 64 × 64 grid of today's mascot, so it drops into the same places:
//   svg/stub-<mood>.svg        the moods logo.ts knows (default, happy, watching, waiting, wow) + sorry
//   svg/stub-small.svg         the ≤ 32 px cut (favicon-size readable)
//   svg/stub-referee*.svg      the games' referee (plain, cheer, gasp): Quiz, Draw & Guess, Last Heart, Classics
//   svg/stub-opponent.svg      the Classics / Sea Battle bot avatar (face fills a circle)
//   svg/stub-win.svg, stub-sorry.svg   the result card (a win cheered, a little sorry for a loss)
//   svg/stub-home.svg          the home art (card 15c scene) with Stub's usher torch as the light's source
//   costumes/<theme>.svg       Stub in each theme's costume, 240 × 240, the same format as docs/internal/design/themes/
//                              (the home page lifts the <g transform="translate(26 58) scale(2.6)"> group out of it)
//   node docs/internal/design/mascot-3/draw.mjs   (index.html is built too)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const here = (p) => new URL(p, import.meta.url);
mkdirSync(here('./svg/'), { recursive: true });
mkdirSync(here('./costumes/'), { recursive: true });

// ---------------------------------------------------------------- colours
export const C = {
  ink: '#140d33', // eyes, mouth: the D1 logo's eye colour (the family trait)
  line: '#9a4f16', // outline, arms, legs: dark enough on cream (Matinee) and on gold scenes
  perf: '#b8661a', // perforation and the printed play mark
  cream: '#fff3d6', gold: '#ffc65a', amber: '#ff9440', // the D1 light
  cheek: '#ff8f6a',
};
const GRAD = (p) => `<linearGradient id="${p}-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.cream}"/><stop offset=".5" stop-color="${C.gold}"/><stop offset="1" stop-color="${C.amber}"/></linearGradient><radialGradient id="${p}-glow"><stop offset="0" stop-color="${C.gold}" stop-opacity=".5"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient>`;

// ---------------------------------------------------------------- faces (card coordinates, face centre x 26.5)
const FX = 26.5;
const eye = (x, y, rx, ry, glint = true) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C.ink}"/>` + (glint ? `<circle cx="${(x - rx * 0.32).toFixed(2)}" cy="${(y - ry * 0.4).toFixed(2)}" r="${(rx * 0.3).toFixed(2)}" fill="#fff" opacity=".92"/>` : '');
const arc = (x, y, w, up = true, sw = 2.1) => `<path d="M${x - w} ${y} Q${x} ${up ? y - w * 1.15 : y + w * 1.0} ${x + w} ${y}" stroke="${C.ink}" stroke-width="${sw}" fill="none" stroke-linecap="round"/>`;
const cheeks = `<ellipse cx="16.5" cy="36" rx="2.2" ry="1.3" fill="${C.cheek}" opacity=".45"/><ellipse cx="36.5" cy="36" rx="2.2" ry="1.3" fill="${C.cheek}" opacity=".45"/>`;
const FACES = {
  default: eye(21.5, 30.5, 2.8, 3.9) + eye(31.5, 30.5, 2.8, 3.9) + arc(FX, 37.6, 2.6, false, 1.8),
  happy: arc(21.5, 31.6, 3) + arc(31.5, 31.6, 3) + `<path d="M22.5 36.6 Q${FX} 41.6 30.5 36.6 Z" fill="${C.ink}"/><path d="M24.5 38.8 Q${FX} 40.6 28.5 38.8" fill="#ff8a8a" opacity=".9"/>`,
  watching: eye(22.7, 29.8, 2.8, 3.9) + eye(32.7, 29.8, 2.8, 3.9) + `<path d="M24.6 37.4 Q${FX + 0.6} 39.6 29.2 37.2" stroke="${C.ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  waiting: arc(21.5, 30.6, 2.8, false, 1.9) + arc(31.5, 30.6, 2.8, false, 1.9) + `<path d="M24.2 38.4 H28.8" stroke="${C.ink}" stroke-width="1.8" stroke-linecap="round"/>`,
  wow: eye(21.5, 30, 3.1, 4.3) + eye(31.5, 30, 3.1, 4.3) + `<ellipse cx="${FX}" cy="38.6" rx="1.9" ry="2.4" fill="${C.ink}"/>`,
  sorry: eye(21.5, 31, 2.5, 3.4) + eye(31.5, 31, 2.5, 3.4) + `<path d="M18.6 25.6 L23.8 24.4 M34.4 25.6 L29.2 24.4" stroke="${C.ink}" stroke-width="1.5" stroke-linecap="round"/><path d="M23.4 39 Q25 37.6 26.5 38.6 Q28 39.6 29.6 38.2" stroke="${C.ink}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  determined: eye(21.5, 31, 2.6, 3.4) + eye(31.5, 31, 2.6, 3.4) + `<path d="M18.4 25.4 L24 27 M34.6 25.4 L29 27" stroke="${C.ink}" stroke-width="1.7" stroke-linecap="round"/><path d="M23.6 37.8 Q27 39.6 30.2 36.8" stroke="${C.ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
};

// ---------------------------------------------------------------- arms (canvas of the 64 grid, outside the tilt)
const limb = (d) => `<path d="${d}" stroke="${C.line}" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
// Left and right arm separately, so a costume can wave with one hand and hold the usher's torch with the other.
const LEFT = { down: limb('M9 34 L4 40'), up: limb('M9 30 L3 20'), out: limb('M9 31 L1 28'), none: '' };
const RIGHT = {
  down: limb('M56 31 L61 37'), up: limb('M55 26 L61 16'), out: limb('M56 28 L63 24'), none: '',
  wave: limb('M55 26 L60 17') + `<path d="M62 12 Q64 15 62 18 M58.6 10.6 Q61 12 61.4 14" stroke="${C.gold}" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".9"/>`,
  // The usher's torch, held level; its lens at (63, 28.6) is where the home art's light starts.
  torch: limb('M56 30 L58.5 29') + `<g transform="rotate(-8 60 29)"><rect x="56.5" y="27" width="5.4" height="4.2" rx="1" fill="#3a2d6e" stroke="${C.line}" stroke-width=".8"/><path d="M61.9 26.4 L64 25.4 V32.8 L61.9 31.8Z" fill="#fff3d6"/></g>`,
};
const ARMS = { down: ['down', 'down'], up: ['up', 'up'], out: ['out', 'out'], wave: ['down', 'wave'], torch: ['down', 'torch'], none: ['none', 'none'] };
const arms = (a) => { const [l, r] = Array.isArray(a) ? a : ARMS[a]; return LEFT[l] + RIGHT[r]; };

const LEGS = limb('M24 50 L23 58') + limb('M38 49 L39 57');

// ---------------------------------------------------------------- Stub
/** The ticket body (card coordinates), with face and an optional hat drawn in the same tilted group. */
function stub(p, { mood = 'default', arms: armsOpt = 'down', tilt = -5, hat = '', glow = true, legs = true, under = '', over = '' } = {}) {
  return `<defs>${GRAD(p)}</defs>${glow ? `<circle cx="32" cy="32" r="28" fill="url(#${p}-glow)"/>` : ''}${under}
<g transform="rotate(${tilt} 32 32)">
<path d="M10 16 H54 Q56 16 56 18 V27 A5 5 0 0 0 56 37 V46 Q56 48 54 48 H10 Q8 48 8 46 V37 A5 5 0 0 0 8 27 V18 Q8 16 10 16Z" fill="url(#${p}-gold)" stroke="${C.line}" stroke-width="1.3"/>
<path d="M44 19 V45" stroke="${C.perf}" stroke-width="1.4" stroke-dasharray="2 2.4"/>
<path d="M48 27.4 L53.6 32 L48 36.6Z" fill="${C.perf}"/>
<path d="M12 20 H40" stroke="#fffaf0" stroke-width="1.6" opacity=".75" stroke-linecap="round"/>
${FACES[mood]}${mood === 'determined' || mood === 'sorry' ? '' : cheeks}
${hat}
</g>
${arms(armsOpt)}${legs ? LEGS : ''}${over}`;
}
const svg64 = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${body}</svg>\n`;

// The ≤ 32 px cut: the ticket fills the box, thick outline, big eyes without glints, the perforation kept.
const small = (p) => `<defs>${GRAD(p)}</defs>
<path d="M6 12 H58 Q60 12 60 14 V26 A6 6 0 0 0 60 38 V50 Q60 52 58 52 H6 Q4 52 4 50 V38 A6 6 0 0 0 4 26 V14 Q4 12 6 12Z" fill="url(#${p}-gold)" stroke="${C.line}" stroke-width="2.6"/>
<path d="M46 15.5 V48.5" stroke="${C.line}" stroke-width="2.6" stroke-dasharray="3.4 3"/>
${eye(18.5, 31, 3.9, 5.4, false)}${eye(33.5, 31, 3.9, 5.4, false)}`;

// Referee: a striped cap and a whistle on a cord.
const refCap = `<g transform="translate(${FX} 16)"><path d="M-9.4 0 Q-9 -6.2 0 -6.6 Q9 -6.2 9.4 0Z" fill="#f4f4f6"/>${[-5.6, -1.6, 2.4, 6.2].map((x) => `<path d="M${x - 1} -6.2 L${x - 1.2} 0 H${x + 0.8} L${x + 1} -6.4Z" fill="#1b1b22"/>`).join('')}<path d="M-9.4 0 Q-9 -6.2 0 -6.6 Q9 -6.2 9.4 0" fill="none" stroke="#1b1b22" stroke-width=".8"/><path d="M-2 0 H16 Q16.4 2.2 12.6 2.2 H-2Z" fill="#1b1b22"/><circle cx="0" cy="-6.6" r="1.1" fill="#1b1b22"/></g>`;
const whistle = `<path d="M15 44 Q20 49 25 45" stroke="#2c6fd6" stroke-width="1" fill="none"/><g transform="translate(4 41)"><rect x="-1" y="-1.6" width="7" height="4.4" rx="2.2" fill="#c7ccd8" stroke="#5a6070" stroke-width=".7"/><circle cx="1.4" cy=".6" r="1" fill="#5a6070"/></g>`;
// Opponent avatar: a red sweatband, the face filling a circle crop (no legs, arms or glow).
const band = `<path d="M8.4 21.2 H55.6 V25.4 H8.4Z" fill="#e0475a"/><path d="M8.4 22.4 H55.6" stroke="#fff" stroke-width=".7" opacity=".7"/>`;

// ---------------------------------------------------------------- the set
const out = (name, s) => writeFileSync(here(name), s);
const SET = {
  'stub-default': stub('sd'),
  'stub-happy': stub('sh', { mood: 'happy', arms: 'up', tilt: -9 }),
  'stub-watching': stub('sw', { mood: 'watching', tilt: -3 }),
  'stub-waiting': stub('sz', { mood: 'waiting', tilt: -2 }),
  'stub-wow': stub('so', { mood: 'wow', arms: 'out', tilt: 4 }),
  'stub-sorry': stub('ss', { mood: 'sorry', tilt: 3, glow: false }),
  'stub-win': stub('sv', { mood: 'happy', arms: 'up', tilt: -10, over: `<path d="M4 8 L5.2 11 L8.2 12.2 L5.2 13.4 L4 16.4 L2.8 13.4 L-.2 12.2 L2.8 11Z" fill="${C.gold}"/><path d="M58 4 L58.8 6 L60.8 6.8 L58.8 7.6 L58 9.6 L57.2 7.6 L55.2 6.8 L57.2 6Z" fill="${C.cream}"/>` }),
  'stub-referee': stub('rp', { hat: refCap, over: whistle }),
  'stub-referee-cheer': stub('rc', { mood: 'happy', arms: 'up', tilt: -9, hat: refCap }),
  'stub-referee-gasp': stub('rg', { mood: 'wow', arms: 'out', tilt: 5, hat: refCap, over: whistle }),
  'stub-home-pose': stub('hp', { mood: 'happy', arms: 'torch', tilt: -6 }),
};
for (const [name, body] of Object.entries(SET)) out(`svg/${name}.svg`, svg64(body));
out('svg/stub-small.svg', svg64(small('sm')));
// The avatar: zoomed on the card so a circle crop shows the face and the band.
out('svg/stub-opponent.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="6 10 46 46" width="64" height="64"><circle cx="29" cy="33" r="23" fill="#2a2160"/>${stub('op', { mood: 'determined', tilt: 0, glow: false, legs: false, arms: 'none', hat: band })}</svg>\n`);

// ---------------------------------------------------------------- home art (card 15c scene, Stub in Glowbeam's box)
const sceneFile = readFileSync(here('../home-15c/scene.svg'), 'utf8');
const BOX = { x: 22, y: 112, size: 156 };
const LENS = [63, 28.6]; // torch lens in the 64 grid (after its small tilt)
const lx = +(BOX.x + (LENS[0] * BOX.size) / 64).toFixed(1), ly = +(BOX.y + (LENS[1] * BOX.size) / 64).toFixed(1);
const scene = sceneFile.slice(sceneFile.indexOf('>', sceneFile.indexOf('<svg')) + 1, sceneFile.lastIndexOf('</svg>'))
  .replace(/<text /g, `<text font-family="'Segoe UI', Helvetica, Arial, sans-serif" `)
  .replace('d="M118 190 L640 20 L640 370 Z"', `d="M${lx} ${ly} L640 20 L640 370 Z"`)
  .replace('<circle cx="100" cy="190" r="92"', `<circle cx="${lx}" cy="${ly}" r="70"`);
out('svg/stub-home.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 380"><defs><linearGradient id="bgh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22174f"/><stop offset="1" stop-color="#08061a"/></linearGradient></defs><rect width="640" height="380" rx="18" fill="url(#bgh)"/>${scene}<svg x="${BOX.x}" y="${BOX.y}" width="${BOX.size}" height="${BOX.size}" viewBox="0 0 64 64">${SET['stub-home-pose']}</svg></svg>\n`);
// The light's source as fractions of the mascot box (home.ts LAMP is GLOW.x + fx · GLOW.size, GLOW.y + fy · GLOW.size,
// in a box whose viewBox is 10.4 21.6 197.6 197.6 of the 240 costume canvas).
const cx = 26 + LENS[0] * 2.6, cy = 58 + LENS[1] * 2.6;
export const LAMP_FRACTION = [+((cx - 10.4) / 197.6).toFixed(3), +((cy - 21.6) / 197.6).toFixed(3)];

// ---------------------------------------------------------------- costumes (240 × 240, Stub at translate(26 58) scale(2.6))
const cos = (p, back, opts, front) => (opts = { ...opts, arms: [ARMS[opts.arms ?? 'down'][0], 'torch'] }, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240">${back}<g transform="translate(26 58) scale(2.6)">${stub(p, opts)}</g>${front}</svg>\n`);
const H = (inner) => `<g transform="translate(${FX} 16)">${inner}</g>`; // hats: (0, 0) = top edge centre of the ticket
const HATS = {
  nightcap: H(`<path d="M-11 0 Q-8 -12 6 -13 Q14 -12 19 -2 L15 -1 Q10 -8 4 -7 Q8 -4 11 0Z" fill="#3b4fb8"/><path d="M-11.6 0.6 Q0 -3.4 11.6 0.6 L11.6 -2.4 Q0 -6.4 -11.6 -2.4Z" fill="#f4f1ff"/><circle cx="19.4" cy="-1" r="2.8" fill="#f4f1ff"/>`),
  mask: `<rect x="15.4" y="25" width="22.2" height="11.4" rx="4.6" fill="#7fe0ff" fill-opacity=".28" stroke="#1d6f8a" stroke-width="1.8"/><path d="M15.4 30 H9 M37.6 30 H44" stroke="#1d6f8a" stroke-width="1.8"/><path d="M40.6 30 V14 Q40.6 10 44 10" stroke="#ffd34a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  sunglasses: H(`<g transform="translate(0 -1.4)"><rect x="-10" y="-3.4" width="8.4" height="5.4" rx="2.4" fill="#1b1b22"/><rect x="1.6" y="-3.4" width="8.4" height="5.4" rx="2.4" fill="#1b1b22"/><path d="M-1.6 -1.4 H1.6" stroke="#1b1b22" stroke-width="1.4"/><path d="M-8.4 -2.4 L-6 -2.4" stroke="#fff" stroke-width=".8" opacity=".6"/></g>`),
  headphones: `<path d="M9.4 27 Q9 14 32 13.2 Q55 14 54.6 27" stroke="#ff5a7a" stroke-width="2.2" fill="none"/><rect x="5.6" y="25" width="5.6" height="9.4" rx="2.4" fill="#2a1420" stroke="#ff5a7a" stroke-width="1.4"/><rect x="52.8" y="25" width="5.6" height="9.4" rx="2.4" fill="#2a1420" stroke="#ff5a7a" stroke-width="1.4"/>`,
  fez: H(`<g transform="rotate(-6)"><path d="M-7.6 0 L-6 -10.6 H6 L7.6 0Z" fill="#c8323c"/><path d="M-7.6 0 H7.6" stroke="#8e1f28" stroke-width="1.4"/><path d="M0 -10.6 Q4.6 -10 5.4 -4.4" stroke="#1b1b22" stroke-width="1" fill="none"/><circle cx="5.4" cy="-3.6" r="1.3" fill="#1b1b22"/></g>`),
  featherCap: H(`<path d="M-9 0 Q-8.4 -7.6 0 -8 Q8.4 -7.6 9 0Z" fill="#5a3aa8"/><path d="M-9 0 H9" stroke="#e8c27a" stroke-width="1.6"/><circle cx="0" cy="-4" r="1.6" fill="#e8c27a"/><path d="M4 -6.4 Q12 -16 18 -13 Q12 -11 6 -6" fill="#ff8f6a"/>`),
  usher: H(`<g transform="rotate(-6)"><path d="M-9 0 L-8 -8 Q0 -10 8 -8 L9 0 Q0 2 -9 0Z" fill="#b8263a"/><path d="M-9 0 Q0 2 9 0 L9 -2.4 Q0 -.4 -9 -2.4Z" fill="#ffc65a"/><path d="M-8 -8 Q0 -10 8 -8" stroke="#ffd98a" stroke-width="1.2" fill="none"/><circle cx="0" cy="-5" r="1.4" fill="#ffc65a"/></g>`),
  glasses3d: `<rect x="15.6" y="26.2" width="9.8" height="8.2" rx="1.6" fill="#ff4a5a" fill-opacity=".38" stroke="#f4f4f6" stroke-width="1.6"/><rect x="27.6" y="26.2" width="9.8" height="8.2" rx="1.6" fill="#38d2ff" fill-opacity=".38" stroke="#f4f4f6" stroke-width="1.6"/><path d="M25.4 29 H27.6 M15.6 29 H9 M37.4 29 H43" stroke="#f4f4f6" stroke-width="1.6"/>`,
  conductor: H(`<path d="M-10 0 L-8.6 -9.6 H8.6 L10 0Z" fill="#2a3d7a"/><rect x="-10" y="-3.6" width="20" height="3.6" fill="#d4a23e"/><path d="M-10 0.4 Q2 4 13 0 L12 -1.8 Q2 1.4 -10 -1.6Z" fill="#141020"/><rect x="-3" y="-8" width="6" height="3.2" rx="1" fill="#d4a23e"/>`),
  boater: H(`<ellipse cx="0" cy="-0.6" rx="14" ry="2.8" fill="#e9c77a" stroke="#8a6a2a" stroke-width=".8"/><path d="M-9.6 -1 L-8.8 -8 Q0 -10 8.8 -8 L9.6 -1Z" fill="#f2d48c" stroke="#8a6a2a" stroke-width=".8"/><rect x="-9.3" y="-4.6" width="18.6" height="2.8" fill="#b03f1c"/>`),
};
const COSTUMES = {
  gece: ['Night', `<path d="M196 36 A24 24 0 1 0 220 70 A18 18 0 1 1 196 36Z" fill="#ffe7a8"/><path d="M174 40 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2Z" fill="#fff3d6"/>`, { mood: 'waiting', hat: HATS.nightcap }, `<g transform="translate(196 190)"><path d="M-18 -16 H18 L14 22 H-14Z" fill="#e8394a"/><path d="M-8 -16 L-6 22 M4 -16 L3 22" stroke="#fff" stroke-width="4"/>${[-14, -6, 2, 10, -10, 6].map((x, i) => `<circle cx="${x}" cy="${-20 - (i % 3) * 3}" r="6" fill="#fff6e0"/>`).join('')}</g>`],
  okyanus: ['Ocean', `${[[196, 60, 7], [214, 90, 5], [186, 100, 4], [206, 30, 4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#9feaff" stroke-width="2" opacity=".8"/>`).join('')}<path d="M0 222 Q30 212 60 222 T120 222 T180 222 T240 222 V240 H0Z" fill="#2ec5e8" opacity=".5"/>`, { mood: 'wow', arms: 'out', tilt: 3, hat: HATS.mask }, ''],
  gunbatimi: ['Sunset', `<circle cx="190" cy="196" r="40" fill="#ff7a4d"/><rect x="0" y="206" width="240" height="34" fill="#e7b27a"/><g transform="translate(198 96)"><path d="M0 -40 Q-34 -40 -40 -8 H40 Q34 -40 0 -40Z" fill="#ff5a4a"/><path d="M-14 -38 Q-12 -20 -14 -8 M14 -38 Q12 -20 14 -8" stroke="#fff3d6" stroke-width="5"/><path d="M0 -8 V96" stroke="#7a4a2a" stroke-width="3"/></g>`, { mood: 'happy', arms: 'wave', tilt: -6, hat: HATS.sunglasses }, ''],
  neon: ['Neon', `<rect x="160" y="24" width="64" height="40" rx="8" fill="none" stroke="#ff5a7a" stroke-width="3"/><rect x="160" y="24" width="64" height="40" rx="8" fill="none" stroke="#ff5a7a" stroke-width="8" opacity=".25"/><path d="M186 54 V34 L202 30 V50" stroke="#ffb347" stroke-width="3" fill="none"/><circle cx="183" cy="54" r="4" fill="#ffb347"/><circle cx="199" cy="50" r="4" fill="#ffb347"/>`, { mood: 'happy', arms: 'up', tilt: -8, hat: HATS.headphones }, ''],
  lokum: ['Moonlit Nights', `<circle cx="196" cy="56" r="26" fill="#f6e7b8"/><path d="M150 214 Q195 206 240 214" stroke="#6aa0d8" stroke-width="3" opacity=".6" fill="none"/><path d="M0 222 H240" stroke="#2fa6b0" stroke-width="4" opacity=".5"/>`, { mood: 'default', hat: HATS.fez }, `<g transform="translate(210 196)"><path d="M0 26 V0" stroke="#3a8a5a" stroke-width="3"/><path d="M0 -2 Q-10 -10 -7 -22 Q-2 -14 0 -20 Q2 -14 7 -22 Q10 -10 0 -2Z" fill="#d8442e"/><path d="M0 14 Q-10 8 -12 0" stroke="#3a8a5a" stroke-width="3" fill="none"/></g>`],
  binbirgece: ['Arabian Nights', `${[[184, 34], [212, 60], [170, 80], [222, 24]].map(([x, y]) => `<path d="M${x} ${y - 6} L${x + 1.6} ${y - 1.6} L${x + 6} ${y} L${x + 1.6} ${y + 1.6} L${x} ${y + 6} L${x - 1.6} ${y + 1.6} L${x - 6} ${y} L${x - 1.6} ${y - 1.6}Z" fill="#e8c27a"/>`).join('')}`, { mood: 'happy', arms: 'up', tilt: -6, hat: HATS.featherCap, legs: false }, `<g transform="translate(120 214)"><path d="M-96 -8 Q-48 -18 0 -8 T96 -8 L90 10 Q48 0 0 10 T-90 10Z" fill="#b8263a"/><path d="M-88 -4 Q-44 -12 0 -3 T88 -4" stroke="#e8c27a" stroke-width="2.4" fill="none" stroke-dasharray="6 4"/>${[-96, 96].map((x) => `<path d="M${x} -8 l-6 -4 M${x} -8 l-6 4 M${x - (x > 0 ? -1 : 1) * 6} 10 l-6 4" stroke="#e8c27a" stroke-width="2"/>`).join('')}</g><g transform="translate(206 76)"><path d="M-18 6 Q-18 -6 0 -6 Q16 -6 22 -14 Q20 0 14 6Z" fill="#e8c27a"/><path d="M-4 -6 Q-4 -14 2 -16 Q4 -10 2 -6" fill="#ffd98a"/><rect x="-10" y="6" width="20" height="4" rx="2" fill="#a8822c"/></g>`],
  sinema: ['Picture Palace', `<g transform="translate(196 66)"><circle r="34" fill="#2a2a34" stroke="#e9b949" stroke-width="3"/>${[0, 72, 144, 216, 288].map((a) => `<circle cx="${(Math.cos((a * Math.PI) / 180) * 18).toFixed(1)}" cy="${(Math.sin((a * Math.PI) / 180) * 18).toFixed(1)}" r="8" fill="#14141c"/>`).join('')}<circle r="5" fill="#e9b949"/></g><path d="M240 120 L150 150 L240 190Z" fill="#fff3c8" opacity=".12"/>`, { mood: 'watching', tilt: -3, hat: HATS.usher }, ''],
  acikhava: ['Drive-In', `<path d="M0 222 H240" stroke="#3c3170" stroke-width="10"/><path d="M10 222 H40 M70 222 H100 M130 222 H160 M190 222 H220" stroke="#ffd27a" stroke-width="2"/>`, { mood: 'wow', arms: 'out', tilt: 3, hat: HATS.glasses3d }, `<g transform="translate(200 180)"><path d="M-18 -18 H18 L14 26 H-14Z" fill="#fff6e0"/><path d="M-18 -18 H18 L17 -8 H-17Z" fill="#ff8a6b"/><path d="M-6 -8 L-5 26 M6 -8 L5 26" stroke="#ff8a6b" stroke-width="4"/>${[-12, -4, 4, 12, -8, 8].map((x, i) => `<circle cx="${x}" cy="${-22 - (i % 3) * 3}" r="6" fill="#fff6e0" stroke="#e8d8b0"/>`).join('')}</g>`],
  tren: ['Night Express', `<path d="M0 222 H240" stroke="#3a2e57" stroke-width="6"/>${[4, 38, 72, 106, 140, 174, 208].map((x) => `<rect x="${x}" y="226" width="22" height="5" rx="1" fill="#3a2e57"/>`).join('')}`, { mood: 'default', hat: HATS.conductor }, `<g transform="translate(208 80)"><path d="M0 -40 V-26" stroke="#8a7a5a" stroke-width="3"/><path d="M-8 -26 H8 L10 -22 H-10Z" fill="#2a3d7a"/><rect x="-11" y="-22" width="22" height="30" rx="4" fill="#ffd27a" stroke="#2a3d7a" stroke-width="3"/><circle cy="-7" r="18" fill="#ffd27a" opacity=".25"/><rect x="-12" y="8" width="24" height="5" rx="2" fill="#2a3d7a"/></g>`],
  matinee: ['Matinee', `<g opacity=".95"><rect x="154" y="18" width="70" height="78" rx="6" fill="#fff4dc" stroke="#d6c8b2" stroke-width="3"/><path d="M189 18 V96 M154 57 H224" stroke="#d6c8b2" stroke-width="3"/><circle cx="204" cy="40" r="10" fill="#ffc65a" opacity=".85"/></g><path d="M0 226 H240" stroke="#d6c8b2" stroke-width="4"/>`, { mood: 'happy', arms: 'wave', tilt: -6, hat: HATS.boater, glow: false }, ''],
};
for (const [id, [, back, opts, front]] of Object.entries(COSTUMES)) out(`costumes/${id}.svg`, cos(`c${id}`, back, opts, front));

// ---------------------------------------------------------------- review page
const BG = { gece: '#141936', okyanus: '#0b2a45', gunbatimi: '#3a1530', neon: '#120b10', lokum: '#18224a', binbirgece: '#141236', sinema: '#0d1020', acikhava: '#1a1340', tren: '#0e1428', matinee: '#f4ede1' };
const tile = (src, label, bg = '#151a2e', w = 120) => `<figure style="background:${bg}"><img src="${src}" width="${w}" height="${w}" alt=""><figcaption>${label}</figcaption></figure>`;
const sizes = [64, 32, 24, 16].map((s) => `<span class="sz"><img src="svg/stub-default.svg" width="${s}" height="${s}" alt=""><img src="svg/stub-small.svg" width="${s}" height="${s}" alt=""><small>${s}px</small></span>`).join('');
out('index.html', `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Stub, the final set (MASCOT3)</title>
<style>:root{--bg:#0b0d1f;--text:#eceefa;--muted:#9aa0c2}body{margin:0;padding:20px 16px;background:var(--bg);color:var(--text);font:14px/1.5 system-ui,sans-serif}main{max-width:1180px;margin:0 auto}h1{font-size:22px;margin:0}h2{font-size:15px;margin:22px 0 8px;color:#ffc65a}p{color:var(--muted);margin:4px 0}
.row{display:flex;flex-wrap:wrap;gap:10px}figure{margin:0;padding:10px;border-radius:12px;text-align:center}figcaption{font-size:12px;margin-top:4px;color:var(--muted)}figure[style*="#f4ede1"] figcaption{color:#5c5244}
.sz{display:inline-flex;align-items:flex-end;gap:6px;margin-right:18px}.sz small{color:var(--muted)}.home{max-width:640px;width:100%;border-radius:18px}</style></head><body><main>
<h1>Stub, the final set (MASCOT3)</h1><p>Notes: <code>../mascot-3.md</code>. All on the 64 grid of today's mascot; costumes on the 240 canvas of <code>../themes/</code>.</p>
<h2>Moods (logo.ts names + sorry)</h2><div class="row">${['default', 'happy', 'watching', 'waiting', 'wow', 'sorry'].map((m) => tile(`svg/stub-${m}.svg`, m)).join('')}</div>
<h2>Small sizes: the full figure vs the ≤ 32 px cut</h2><div class="row" style="align-items:flex-end;background:#151a2e;padding:12px;border-radius:12px">${sizes}</div>
<div class="row" style="margin-top:8px;background:#f4ede1;padding:12px;border-radius:12px">${sizes}</div>
<h2>Games</h2><div class="row">${tile('svg/stub-referee.svg', 'referee · plain')}${tile('svg/stub-referee-cheer.svg', 'referee · cheer')}${tile('svg/stub-referee-gasp.svg', 'referee · gasp')}${tile('svg/stub-opponent.svg', 'opponent (bot avatar)')}${tile('svg/stub-win.svg', 'result · win')}${tile('svg/stub-sorry.svg', 'result · sorry')}</div>
<div class="row" style="margin-top:8px">${['stub-referee', 'stub-opponent'].map((n) => `<figure style="background:#151a2e"><img src="svg/${n}.svg" width="44" height="44" alt="" style="${n === 'stub-opponent' ? 'border-radius:50%' : ''}"><img src="svg/${n}.svg" width="32" height="32" alt="" style="${n === 'stub-opponent' ? 'border-radius:50%' : ''}"><figcaption>${n.replace('stub-', '')} at 44 / 32 px</figcaption></figure>`).join('')}</div>
<h2>Home art (Stub's usher torch is the light's source)</h2><img class="home" src="svg/stub-home.svg" alt="">
<h2>Theme costumes</h2><div class="row">${Object.entries(COSTUMES).map(([id, [name]]) => tile(`costumes/${id}.svg`, `${name} · ${id}`, BG[id], 150)).join('')}</div>
</main></body></html>
`);
console.log('✓ mascot-3; home LAMP fraction', LAMP_FRACTION);
