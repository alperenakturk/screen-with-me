// "How to play" pictures for the table games (GP2, Game Studio): 320 × 180, night-gold, no words (one set for every
// language; each game passes its own titles and lines). Run: node docs/internal/design/games/tutorial-tables/gen.mjs
// It writes apps/web/src/games/art/tutorial/<name>.svg. Our own drawings only (no product's look).
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../../../../apps/web/src/games/art/tutorial');
const GOLD = '#ffc65a';
const PALE = '#fff3d6';
const INK = '#16122c';
const MUTED = '#8f87b8';

const frame = (body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22174f"/><stop offset="1" stop-color="#120d2c"/></linearGradient><radialGradient id="glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${GOLD}" stop-opacity=".45"/><stop offset="1" stop-color="${GOLD}" stop-opacity="0"/></radialGradient>${defs}</defs><rect width="320" height="180" rx="16" fill="url(#bg)"/>${body}</svg>`;
const glow = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#glow)"/>`;
const arrow = (x1, y1, x2, y2, color = GOLD, w = 4) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 10;
  const p1 = [x2 - h * Math.cos(a - 0.5), y2 - h * Math.sin(a - 0.5)];
  const p2 = [x2 - h * Math.cos(a + 0.5), y2 - h * Math.sin(a + 0.5)];
  return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/><path d="M${p1[0].toFixed(1)} ${p1[1].toFixed(1)}L${x2} ${y2}L${p2[0].toFixed(1)} ${p2[1].toFixed(1)}" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
};
const curve = (x1, y1, cx, cy, x2, y2, color = GOLD) => {
  const a = Math.atan2(y2 - cy, x2 - cx);
  const h = 9;
  return `<path d="M${x1} ${y1}Q${cx} ${cy} ${x2} ${y2}" stroke="${color}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-dasharray="7 5"/><path d="M${(x2 - h * Math.cos(a - 0.5)).toFixed(1)} ${(y2 - h * Math.sin(a - 0.5)).toFixed(1)}L${x2} ${y2}L${(x2 - h * Math.cos(a + 0.5)).toFixed(1)} ${(y2 - h * Math.sin(a + 0.5)).toFixed(1)}" stroke="${color}" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
};
/** An n × n board of cells at (x, y) with cell size s; `fill(r, c)` gives a cell's colour. */
const grid = (x, y, n, s, fill, stroke = '#00000033') => {
  let out = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out += `<rect x="${x + c * s}" y="${y + r * s}" width="${s}" height="${s}" fill="${fill(r, c)}" stroke="${stroke}" stroke-width=".8"/>`;
  return out;
};
const disc = (x, y, r, dark) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${dark ? '#24212e' : '#fff8ec'}" stroke="${dark ? '#000' : '#b9a37c'}" stroke-width="1.5"/>`;
const check = (x, y, s = 1, color = GOLD) => `<path d="M${x - 9 * s} ${y}l${6 * s} ${7 * s} ${13 * s}-${15 * s}" stroke="${color}" stroke-width="${5 * s}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const crown = (x, y) => `<path d="M${x - 11} ${y + 6}l-2-13 7 6 6-9 6 9 7-6-2 13z" fill="${GOLD}" stroke="#7a4f12" stroke-width="1.2"/>`;
const dice = (x, y, n) => {
  const pips = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[n];
  return `<rect x="${x - 18}" y="${y - 18}" width="36" height="36" rx="8" fill="${PALE}" stroke="#b9a37c" stroke-width="2"/>${pips.map(([a, b]) => `<circle cx="${x + a * 9}" cy="${y + b * 9}" r="3.6" fill="${INK}"/>`).join('')}`;
};

const ART = {
  // ---- Classics ----
  'xox-1-turns': frame(
    `${grid(110, 40, 3, 34, () => '#2a2350', '#8f84d8')}<g stroke="#ff7aa8" stroke-width="6" stroke-linecap="round"><path d="M118 48l18 18M136 48l-18 18M186 116l18 18M204 116l-18 18"/></g><g fill="none" stroke="#6fc8ff" stroke-width="5"><circle cx="161" cy="91" r="10"/><circle cx="127" cy="125" r="10"/></g>${glow(195, 57, 30)}<circle cx="195" cy="57" r="10" fill="none" stroke="#6fc8ff" stroke-width="5" stroke-dasharray="4 4"/>`,
  ),
  'xox-2-line': frame(
    `${grid(110, 40, 3, 34, () => '#2a2350', '#8f84d8')}<g stroke="#ff7aa8" stroke-width="6" stroke-linecap="round"><path d="M118 48l18 18M136 48l-18 18M152 82l18 18M170 82l-18 18M186 116l18 18M204 116l-18 18"/></g><g fill="none" stroke="#6fc8ff" stroke-width="5"><circle cx="195" cy="57" r="10"/><circle cx="127" cy="125" r="10"/></g><path d="M114 44L210 140" stroke="${GOLD}" stroke-width="6" stroke-linecap="round" opacity=".9"/>${glow(160, 92, 70)}`,
  ),
  'four-1-drop': frame(
    `<rect x="84" y="46" width="152" height="112" rx="10" fill="#2f5fd0"/>${[0, 1, 2, 3, 4, 5].map((c) => [0, 1, 2, 3].map((r) => `<circle cx="${103 + c * 23}" cy="${64 + r * 26}" r="9" fill="${r === 3 && c < 3 ? (c % 2 ? '#ffd24a' : '#ff5d6c') : r === 2 && c === 1 ? '#ff5d6c' : '#0e1430'}"/>`).join('')).join('')}<circle cx="172" cy="22" r="9" fill="#ff5d6c"/>${arrow(172, 34, 172, 120)}`,
  ),
  'four-2-four': frame(
    `<rect x="84" y="30" width="152" height="128" rx="10" fill="#2f5fd0"/>${[0, 1, 2, 3, 4, 5].map((c) => [0, 1, 2, 3, 4].map((r) => {
      const win = r + c === 5 && c >= 1 && c <= 4;
      const col = win ? '#ff5d6c' : (r === 4 && c % 2) || (r === 3 && c === 5) ? '#ffd24a' : '#0e1430';
      return `<circle cx="${103 + c * 23}" cy="${48 + r * 25}" r="9" fill="${col}"${win ? ` stroke="${GOLD}" stroke-width="3"` : ''}/>`;
    }).join('')).join('')}${glow(160, 98, 60)}`,
  ),
  'dama-1-move': frame(
    `${grid(100, 30, 5, 24, (r, c) => ((r + c) % 2 ? '#a8703f' : '#ecd6a8'))}${disc(160, 102, 9, false)}${arrow(160, 90, 160, 64)}${arrow(150, 102, 128, 102)}${arrow(170, 102, 192, 102)}<path d="M160 116v14" stroke="#e05a5a" stroke-width="4" stroke-linecap="round"/><path d="M152 124l16 12M168 124l-16 12" stroke="#e05a5a" stroke-width="3" stroke-linecap="round" opacity=".8"/>`,
  ),
  'dama-2-jump': frame(
    `${grid(100, 30, 5, 24, (r, c) => ((r + c) % 2 ? '#a8703f' : '#ecd6a8'))}${disc(112, 114, 9, false)}${disc(136, 114, 9, true)}${disc(160, 90, 9, true)}${curve(112, 104, 128, 84, 160, 114)}${curve(160, 104, 170, 70, 160, 66)}${crown(232, 60)}${disc(232, 92, 12, false)}`,
  ),
  'chess-1-moves': frame(
    `${grid(96, 26, 5, 26, (r, c) => ((r + c) % 2 ? '#a8703f' : '#ecd6a8'))}<text x="161" y="114" text-anchor="middle" font-size="26" fill="#fff8ea" stroke="#000" stroke-width="1.2">♞</text>${[[-1, -2], [1, -2], [-2, -1], [2, -1], [-2, 1], [2, 1]].map(([a, b]) => `<circle cx="${161 + a * 26}" cy="${105 + b * 26}" r="6" fill="${GOLD}" opacity=".85"/>`).join('')}`,
  ),
  'chess-2-mate': frame(
    `${grid(96, 26, 5, 26, (r, c) => ((r + c) % 2 ? '#a8703f' : '#ecd6a8'))}<rect x="148" y="26" width="26" height="26" fill="#e05a5a" opacity=".55"/><text x="161" y="47" text-anchor="middle" font-size="22" fill="#1a1622" stroke="#fff" stroke-width=".8">♚</text><text x="109" y="47" text-anchor="middle" font-size="22" fill="#fff8ea" stroke="#000" stroke-width="1">♜</text>${arrow(124, 39, 144, 39, '#e05a5a', 3)}${glow(256, 90, 40)}<circle cx="256" cy="90" r="20" fill="${GOLD}"/>${check(256, 92, 1, INK)}`,
  ),
  'backgammon-1-roll': frame(
    `<rect x="40" y="36" width="170" height="110" rx="8" fill="#2e5d3c"/>${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${46 + i * 27} 36l13 46 13-46z" fill="${i % 2 ? '#c0533a' : '#e9c27a'}"/>`).join('')}${disc(86, 126, 10, false)}${disc(86, 106, 10, false)}${curve(86, 96, 120, 60, 152, 126)}${dice(250, 70, 5)}${dice(258, 118, 3)}`,
  ),
  'backgammon-2-home': frame(
    `<rect x="40" y="36" width="170" height="110" rx="8" fill="#2e5d3c"/>${[0, 1, 2, 3, 4, 5].map((i) => `<path d="M${46 + i * 27} 146l13-46 13 46z" fill="${i % 2 ? '#c0533a' : '#e9c27a'}"/>`).join('')}${disc(160, 136, 10, false)}${disc(187, 136, 10, false)}<rect x="226" y="36" width="54" height="110" rx="8" fill="#4a2c1c"/>${[0, 1, 2, 3].map((i) => `<rect x="234" y="${124 - i * 14}" width="38" height="10" rx="3" fill="#fff8ec" stroke="#b9a37c"/>`).join('')}${arrow(196, 126, 232, 74)}`,
  ),
  'reversi-1-flip': frame(
    `${grid(72, 40, 6, 22, () => '#2f7a4c', '#1d5534')}${disc(83, 95, 8, true)}${disc(105, 95, 8, false)}${disc(127, 95, 8, false)}${glow(149, 95, 22)}${disc(149, 95, 8, true)}<path d="M100 76q16-12 32 0" stroke="${GOLD}" stroke-width="3" fill="none" stroke-linecap="round"/>${arrow(222, 70, 222, 120, MUTED, 3)}${disc(222, 56, 10, false)}${disc(222, 134, 10, true)}`,
  ),
  'reversi-2-count': frame(
    `${[0, 1, 2, 3, 4, 5, 6].map((i) => `<ellipse cx="110" cy="${140 - i * 10}" rx="26" ry="8" fill="#24212e" stroke="#000" stroke-width="1.5"/>`).join('')}${[0, 1, 2, 3].map((i) => `<ellipse cx="210" cy="${140 - i * 10}" rx="26" ry="8" fill="#fff8ec" stroke="#b9a37c" stroke-width="1.5"/>`).join('')}${glow(110, 60, 36)}${crown(110, 64)}`,
  ),
  // ---- Sea Battle ----
  'sea-1-place': frame(
    `${grid(70, 26, 6, 21, () => '#0d1b46', '#ffe7a822')}<rect x="91" y="47" width="63" height="21" rx="5" fill="#8b93b8"/><rect x="175" y="68" width="21" height="63" rx="5" fill="#c9cbe0" stroke="${GOLD}" stroke-width="2.5"/><rect x="70" y="110" width="42" height="21" rx="5" fill="#8b93b8"/>${curve(210, 78, 246, 96, 214, 132)}`,
  ),
  'sea-2-shoot': frame(
    `${grid(70, 26, 6, 21, () => '#0d1b46', '#ffe7a822')}<circle cx="102" cy="58" r="5" fill="none" stroke="${PALE}" stroke-opacity=".7" stroke-width="2"/><circle cx="165" cy="100" r="7" fill="${GOLD}"/>${glow(165, 100, 24)}<path d="M165 86v-8M165 114v8M151 100h-8M179 100h8" stroke="${GOLD}" stroke-width="3" stroke-linecap="round"/>${curve(196, 100, 240, 60, 214, 40)}<circle cx="252" cy="122" r="20" fill="none" stroke="${GOLD}" stroke-width="3"/><path d="M252 106v32M236 122h32" stroke="${GOLD}" stroke-width="2"/>`,
  ),
  'sea-3-sink': frame(
    `${grid(70, 26, 6, 21, () => '#0d1b46', '#ffe7a822')}${[0, 1, 2].map((i) => `<rect x="${112 + i * 21}" y="68" width="21" height="21" fill="#6b4a12" stroke="${GOLD}" stroke-width="2"/><path d="M${116 + i * 21} 72l13 13M${129 + i * 21} 72l-13 13" stroke="#ffe7a8" stroke-width="2"/>`).join('')}${[[91, 47], [112, 47], [133, 47], [154, 47], [175, 47], [91, 68], [175, 68], [91, 89], [112, 89], [133, 89], [154, 89], [175, 89]].map(([x, y]) => `<circle cx="${x + 10.5}" cy="${y + 10.5}" r="2.5" fill="${PALE}" fill-opacity=".35"/>`).join('')}${glow(254, 90, 40)}${crown(254, 94)}`,
  ),
  // ---- Quiz ----
  'quiz-1-answer': frame(
    `${[0, 1, 2, 3].map((i) => `<rect x="${60 + (i % 2) * 104}" y="${56 + Math.floor(i / 2) * 50}" width="96" height="40" rx="10" fill="${i === 1 ? '#3a2d78' : '#2a2350'}" stroke="${i === 1 ? GOLD : '#8f84d8'}" stroke-width="${i === 1 ? 3 : 1.5}"/>`).join('')}<rect x="60" y="22" width="200" height="22" rx="8" fill="#ffffff14"/><circle cx="276" cy="34" r="14" fill="none" stroke="#ffffff33" stroke-width="4"/><path d="M276 20a14 14 0 0 1 12 21" stroke="${GOLD}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  ),
  'quiz-2-reveal': frame(
    `${[0, 1, 2, 3].map((i) => `<rect x="${60 + (i % 2) * 104}" y="${46 + Math.floor(i / 2) * 54}" width="96" height="42" rx="10" fill="${i === 2 ? '#3a5d2e' : '#2a2350'}" stroke="${i === 2 ? GOLD : '#8f84d8'}" stroke-width="${i === 2 ? 3 : 1.5}" opacity="${i === 2 ? 1 : 0.45}"/>`).join('')}${check(108, 122)}<circle cx="96" cy="88" r="7" fill="#ff7aa8"/><circle cx="114" cy="88" r="7" fill="#6fc8ff"/><text x="270" y="70" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" font-weight="800" fill="${GOLD}">+</text>`,
  ),
  'quiz-3-podium': frame(
    `<rect x="126" y="70" width="68" height="86" rx="6" fill="${GOLD}"/><rect x="58" y="98" width="68" height="58" rx="6" fill="#cfc8ea"/><rect x="194" y="116" width="68" height="40" rx="6" fill="#c08a4a"/><circle cx="160" cy="50" r="14" fill="#6fc8ff"/><circle cx="92" cy="80" r="12" fill="#ff7aa8"/><circle cx="228" cy="98" r="12" fill="#a3e07a"/>${glow(160, 50, 34)}${crown(160, 30)}`,
  ),
  // ---- Draw & Guess ----
  'draw-1-pick': frame(
    `${[0, 1, 2].map((i) => `<rect x="${46 + i * 80}" y="56" width="68" height="76" rx="10" fill="${i === 1 ? '#3a2d78' : '#2a2350'}" stroke="${i === 1 ? GOLD : '#8f84d8'}" stroke-width="${i === 1 ? 3 : 1.5}"/><rect x="${58 + i * 80}" y="84" width="44" height="6" rx="3" fill="${PALE}" opacity="${i === 1 ? 0.9 : 0.4}"/><rect x="${64 + i * 80}" y="98" width="32" height="6" rx="3" fill="${PALE}" opacity="${i === 1 ? 0.6 : 0.25}"/>`).join('')}${glow(160, 94, 50)}`,
  ),
  'draw-2-draw': frame(
    `<rect x="54" y="28" width="160" height="124" rx="10" fill="#fbf6ec"/><path d="M84 116c10-40 34-58 52-40s20 36 46 6" stroke="#2a2350" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="142" cy="62" r="10" fill="none" stroke="#e05a5a" stroke-width="4"/><g transform="rotate(35 246 82)"><rect x="236" y="40" width="20" height="74" rx="4" fill="${GOLD}"/><path d="M236 114l10 20 10-20z" fill="#e9c9a0"/><path d="M243 128l3 6 3-6z" fill="${INK}"/></g>`,
  ),
  'draw-3-guess': frame(
    `<rect x="40" y="34" width="150" height="30" rx="14" fill="#2a2350"/><rect x="54" y="45" width="70" height="8" rx="4" fill="${PALE}" opacity=".4"/><rect x="40" y="74" width="150" height="30" rx="14" fill="#2a2350"/><rect x="54" y="85" width="90" height="8" rx="4" fill="${PALE}" opacity=".4"/><rect x="40" y="114" width="150" height="30" rx="14" fill="#3a5d2e" stroke="${GOLD}" stroke-width="2.5"/>${check(166, 128, 0.8)}${glow(252, 100, 40)}<text x="252" y="112" text-anchor="middle" font-family="system-ui,sans-serif" font-size="34" font-weight="900" fill="${GOLD}">+</text>`,
  ),
};

for (const [name, svg] of Object.entries(ART)) writeFileSync(join(OUT, `${name}.svg`), svg + '\n');
console.log(`wrote ${Object.keys(ART).length} pictures to ${OUT}`);
