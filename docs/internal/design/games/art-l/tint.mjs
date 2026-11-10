// ART-L (Design, 10 Nov 2026): the games' tutorial pictures and Window Garden's scene are dark navy art; in Matinee
// (the light theme) they read as dark blocks on cream. Instead of a second set of files, every "chrome" colour in them
// (the background frame, panels, cells, lavender lines, and text drawn on them) becomes a CSS variable whose fallback is
// the original colour: dark themes look exactly as today, Matinee sets the variables to paper tones. Boards, pieces,
// felt, the mascot and the gold stay as drawn. The art is inlined (`?raw`), so the page's variables reach it.
//   node docs/internal/design/games/art-l/tint.mjs   → ./svg/tutorial/*.svg, ./svg/garden/window-sill.svg, ./matinee-art.css
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
const here = (p) => new URL(p, import.meta.url);
const ART = new URL('../../../../../apps/web/src/games/art/', import.meta.url);

// Shapes and gradient stops: dark navy → paper (Matinee tokens from themes-2/matinee2: page #e8dfcf, surface #f1eadd,
// surface-2 #e2d7c5, mat #ddd1bc). Colours not listed (boards, pieces, felt, gold, the mascot's ink) never change.
export const SHAPE = {
  // background frames (gradient stops)
  '#22174f': '#efe7da', '#120d2c': '#e2d7c4', '#2a2257': '#eadfcd', '#1a2150': '#e2d6c2',
  // walls, panels, cells, tracks
  '#120e27': '#e4d9c6', '#2a2350': '#f7f1e6', '#3a2d78': '#f6e4bf', '#3a3458': '#ddd1bc', '#24212e': '#e6dccb',
  '#16122c': '#d6c8b0', '#1a1622': '#e1d6c4', '#1d2353': '#e3d8c6',
  // lavender lines and frames
  '#8f84d8': '#a8997f', '#3a2e57': '#b5a68d', '#a79fc4': '#8a7c66',
};
// As a stroke a dark colour is a line (a drawing, a board edge) and stays dark on paper; only the lavender lines move.
const LINES = new Set(['#8f84d8', '#3a2e57', '#a79fc4']);
// Text drawn on those panels: light text → ink, gold and green numbers → their deep versions (AA on the paper).
export const TEXT = { '#fff3d6': '#26201a', '#fff8ea': '#26201a', '#cfc8ea': '#564b3e', '#a79fc4': '#564b3e', '#ffc65a': '#7a4a00', '#3ee08f': '#16653c' };
// Faint UI marks (bars, ghost letters) are cream / lavender at an opacity: on paper they become ink at that opacity.
// Solid cream shapes are objects (popcorn, cards, dice, pieces) and stay; a solid cream outline becomes a muted line.
export const GHOST = { '#fff3d6': '#3a2f25', '#fff4d6': '#3a2f25', '#fffaf0': '#3a2f25', '#cfc8ea': '#3a2f25', '#c9cbe0': '#3a2f25' };
export const LINE = { '#fff3d6': '#564b3e' };
// Window Garden's window: a soft dusk instead of the night navy (the moon still shows).
export const SILL = { '#2a2257': '#9fb2cc', '#1a2150': '#e6c7a6' };

const v = (prefix, hex) => `--${prefix}-${hex.slice(1).toLowerCase()}`;
function tint(svg, sill = false) {
  return svg.replace(/<(\w+)((?:\s[^>]*?)?)(\/?)>/g, (all, tag, attrs, self) => {
    const add = [];
    const faint = /\s(?:opacity|fill-opacity|stroke-opacity)="(?:0?\.\d+)"/.test(attrs);
    attrs = attrs.replace(/\s(fill|stroke|stop-color)="(#[0-9a-fA-F]{6})"/g, (m, attr, hex) => {
      const h = hex.toLowerCase();
      if (tag === 'text' && attr === 'fill' && TEXT[h]) add.push(`fill:var(${v('alt', h)},${h})`);
      else if (tag !== 'text' && faint && GHOST[h]) add.push(`${attr}:var(${v('alg', h)},${h})`);
      else if (tag !== 'text' && attr === 'stroke' && LINE[h]) add.push(`stroke:var(${v('alk', h)},${h})`);
      else if (sill && SILL[h]) add.push(`${attr}:var(${v('als', h)},${h})`);
      else if (SHAPE[h] && (attr !== 'stroke' || LINES.has(h))) add.push(`${attr}:var(${v('al', h)},${h})`);
      return m; // the attribute stays: the original colour for anything that ignores the style
    });
    if (!add.length) return all;
    if (/\sstyle="/.test(attrs)) attrs = attrs.replace(/\sstyle="([^"]*)"/, (m, st) => ` style="${st.replace(/;?\s*$/, ';')}${add.join(';')}"`);
    else attrs += ` style="${add.join(';')}"`;
    return `<${tag}${attrs}${self}>`;
  });
}

mkdirSync(here('./svg/tutorial/'), { recursive: true });
mkdirSync(here('./svg/garden/'), { recursive: true });
let changed = 0;
for (const f of readdirSync(new URL('tutorial/', ART))) {
  const out = tint(readFileSync(new URL(`tutorial/${f}`, ART), 'utf8'));
  writeFileSync(here(`./svg/tutorial/${f}`), out); changed++;
}
writeFileSync(here('./svg/garden/window-sill.svg'), tint(readFileSync(new URL('garden/window-sill.svg', ART), 'utf8'), true));

const block = (o, p) => Object.entries(o).map(([k, val]) => `  ${v(p, k)}: ${val};`).join('\n');
writeFileSync(here('./matinee-art.css'), `/* ART-L: the games' art in Matinee (docs/internal/design/games/art-l/README.md). The tutorial pictures and Window
   Garden's scene read these variables; every other theme leaves them unset, so the art keeps its own colours there.
   Goes into a stylesheet the games load (e.g. apps/web/src/games/how-to-play.css), or into room.css. */
:root[data-theme='matinee'] {
  /* shapes and gradient stops */
${block(SHAPE, 'al')}
  /* text on the art */
${block(TEXT, 'alt')}
  /* faint marks and cream outlines */
${block(GHOST, 'alg')}
${block(LINE, 'alk')}
  /* Window Garden's window: dusk */
${block(SILL, 'als')}
}
`);
console.log(`✓ ${changed} tutorial pictures + window-sill.svg + matinee-art.css`);
