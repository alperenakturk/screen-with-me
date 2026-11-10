// THEME2: preview cards of the replacement palettes (and two kept themes for comparison) → palettes.svg.
//   node docs/internal/design/themes-2/palettes.mjs
import { writeFileSync } from 'node:fs';
const P = [
  ['Matinee (light)', { bg: '#f4ede1', surface: '#fffaf1', s2: '#efe5d4', border: '#8a7a64', text: '#1f1a14', muted: '#5c5244', accent: '#b03f1c', on: '#ffffff' }],
  ['Pine (scene)', { bg: '#0b1611', surface: '#12231b', s2: '#1a3025', border: '#2f4d3e', text: '#ecf3ec', muted: '#a2bcab', accent: '#f0b85a', on: '#1f1504' }],
  ['Graphite (plain)', { bg: '#111113', surface: '#1b1b1f', s2: '#25252a', border: '#45454e', text: '#f2f2f4', muted: '#a8a8b3', accent: '#ffc65a', on: '#1d1405' }],
  ['Gece today', { bg: '#0b0d1f', surface: '#151a2e', s2: '#1e2440', border: '#2a3152', text: '#eceefa', muted: '#9aa0c2', accent: '#8b6cff', btn: '#6a4cf2', on: '#ffffff' }],
  ['Okyanus today', { bg: '#051726', surface: '#0b2338', s2: '#123049', border: '#1c405e', text: '#e6f4fb', muted: '#8db0c4', accent: '#2ec5e8', on: '#032130' }],
];
const W = 300, H = 250, G = 16;
const field = (c) => `color-mix(in srgb, ${c.muted} 60%, ${c.surface})`;
const card = ([name, c], i) => {
  const x = G + i * (W + G);
  return `<g transform="translate(${x} ${G})">
  <rect width="${W}" height="${H}" rx="14" fill="${c.bg}"/>
  <text x="16" y="30" font-size="13" font-weight="700" fill="${c.muted}">${name}</text>
  <rect x="16" y="44" width="${W - 32}" height="${H - 60}" rx="12" fill="${c.surface}" stroke="${c.border}"/>
  <text x="32" y="74" font-size="17" font-weight="700" fill="${c.text}">Different screens,</text>
  <text x="32" y="96" font-size="17" font-weight="700" fill="${c.accent}">same moment.</text>
  <text x="32" y="120" font-size="13" fill="${c.text}">Watch a video with friends, in sync.</text>
  <text x="32" y="140" font-size="12" fill="${c.muted}">Saved room · 3 watching</text>
  <rect x="32" y="152" width="${W - 64}" height="30" rx="8" fill="${c.s2}" stroke="${c.field || c.border}" stroke-width="1.5"/>
  <text x="42" y="171" font-size="12" fill="${c.muted}">Search YouTube or paste a link</text>
  <rect x="32" y="192" width="104" height="30" rx="8" fill="${c.btn || c.accent}"/>
  <text x="84" y="211" font-size="13" font-weight="700" fill="${c.on}" text-anchor="middle">Create room</text>
  <text x="152" y="211" font-size="13" fill="${c.accent}" text-decoration="underline">How it works</text>
</g>`;
};
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${G + P.length * (W + G)}" height="${H + 2 * G}" font-family="system-ui, sans-serif">
<rect width="100%" height="100%" fill="#2a2a2e"/>
${P.map(card).join('\n')}
</svg>`;
writeFileSync(new URL('palettes.svg', import.meta.url), svg);
console.log('palettes.svg');
