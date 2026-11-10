// NG3: the tables' badges, one style (owner's pick 10: 2). A rounded tile in the table's tint with a cream line icon
// and the D1 light's glint, on the 64 grid. Used on the lobby cards (h3::before) and on the games hall's covers.
//   node scripts/game-badges.mjs   → apps/web/src/games/art/badges/<kind>.svg
import { writeFileSync } from 'node:fs';

const INK = '#140d33';
const CREAM = '#fff3d6';
const line = (d, w = 3.6) => `<path d="${d}" fill="none" stroke="${CREAM}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const fill = (d, c = CREAM) => `<path d="${d}" fill="${c}"/>`;

/** Each table: its tint (the lobby card's) and its icon. */
const BADGES = {
  classics: {
    tint: '#7fd6a4',
    // a pawn and a die
    icon: `<circle cx="21" cy="24" r="5.6" fill="${CREAM}"/>` + fill('M13.5 46C15 40 17.4 34.6 21 29.5C24.6 34.6 27 40 28.5 46Z M11.5 45.5h19v4.5h-19Z') +
      `<rect x="33" y="26" width="20" height="20" rx="4.5" fill="none" stroke="${CREAM}" stroke-width="3.4" transform="rotate(10 43 36)"/>` +
      `<g fill="${CREAM}" transform="rotate(10 43 36)"><circle cx="38.5" cy="31.5" r="2"/><circle cx="47.5" cy="40.5" r="2"/><circle cx="43" cy="36" r="2"/></g>`,
  },
  draw: {
    tint: '#ffb74a',
    // a pencil writing a squiggle
    icon: line('M14 46c5-6 9 2 14-3s9 2 14-2', 3.2) + fill('M40.5 13.5l7 7L27 41l-9 2.5 2.5-9Z') + fill('M20.5 34.5l6.5 6.5-9 2.5Z', '#ffd9a0') +
      `<path d="M37 17l7 7" stroke="${INK}" stroke-opacity=".35" stroke-width="2"/>`,
  },
  quiz: {
    tint: '#6fc8ff',
    // a speech bubble with a question mark
    icon: line('M15 18h34a4 4 0 0 1 4 4v17a4 4 0 0 1-4 4H30l-9 7v-7h-6a4 4 0 0 1-4-4V22a4 4 0 0 1 4-4Z', 3.2) +
      line('M27 26.5a5 5 0 1 1 7 4.6c-1.6.7-2 1.6-2 3.4', 3.4) + `<circle cx="32" cy="39" r="2.1" fill="${CREAM}"/>`,
  },
  poker: {
    tint: '#ff6b8a',
    // a card with a heart
    icon: `<rect x="17" y="12" width="30" height="40" rx="5" fill="none" stroke="${CREAM}" stroke-width="3.4" transform="rotate(-8 32 32)"/>` +
      fill('M32 43.5c-6.5-4.6-10-8.4-10-12.6a5.4 5.4 0 0 1 10-2.8a5.4 5.4 0 0 1 10 2.8c0 4.2-3.5 8-10 12.6Z'),
  },
  sea: {
    tint: '#5fb3e0',
    // a sailing ship on a wave
    icon: fill('M31 12v24H17Z') + fill('M34 16l12 20H34Z', '#ffd9a0') + fill('M13 39h38l-5 8H18Z') + line('M10 53c4-3 8-3 11 0s8 3 11 0 8-3 11 0 7 3 11 0', 3),
  },
  duel: {
    tint: '#ffc65a',
    // two letter tiles, one ✓ one •
    icon: `<rect x="11" y="17" width="20" height="24" rx="4.5" fill="none" stroke="${CREAM}" stroke-width="3.4" transform="rotate(-8 21 29)"/>` +
      `<rect x="33" y="23" width="20" height="24" rx="4.5" fill="${CREAM}" transform="rotate(8 43 35)"/>` +
      line('M15.5 29.5l3.6 3.6 6.4-7.4', 3.2) + `<circle cx="43" cy="35" r="3.2" fill="${INK}"/>`,
  },
};

for (const [kind, { tint, icon }] of Object.entries(BADGES)) {
  const id = `bdg-${kind}`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><defs>` +
    `<linearGradient id="${id}-t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tint}"/><stop offset="1" stop-color="${tint}" stop-opacity=".55"/></linearGradient>` +
    `<radialGradient id="${id}-g" cx=".28" cy=".2" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>` +
    `<rect x="2" y="2" width="60" height="60" rx="17" fill="${INK}"/><rect x="2" y="2" width="60" height="60" rx="17" fill="url(#${id}-t)" opacity=".62"/>` +
    `<rect x="2" y="2" width="60" height="60" rx="17" fill="url(#${id}-g)"/><rect x="3" y="3" width="58" height="58" rx="16" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2"/>` +
    `<g filter="none">${icon}</g></svg>`;
  writeFileSync(new URL(`../apps/web/src/games/art/badges/${kind}.svg`, import.meta.url), svg);
}
console.log(`${Object.keys(BADGES).length} badges`);
