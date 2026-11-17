// Sketches for source-picker options B and C (Design, 17 Nov 2026), same style and size as source-picker/a-computer.svg.
// Run: node docs/internal/design/source-picker-sketches.mjs docs/internal/design
import fs from 'node:fs';

const ROOT = process.argv[2];
const C = { bg: '#0b0d1f', s1: '#15183a', s2: '#1d2150', bd: '#2c3170', ac: '#8b6cff', tx: '#f1eefc', mu: '#b9b4d8', gold: '#ffc65a', cream: '#fff3d6', ink: '#140d33' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const R = (x, y, w, h, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 10}" fill="${o.fill ?? C.s1}" stroke="${o.stroke ?? C.bd}" stroke-width="${o.sw ?? 1}"${o.dash ? ' stroke-dasharray="6 4"' : ''}/>`;
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size ?? 13}"${o.bold ? ` font-weight="${o.bold}"` : ''} fill="${o.fill ?? C.tx}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}>${esc(s)}</text>`;
const glowbeam = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="32" cy="32" r="17" fill="${C.cream}"/><path d="M29 27 L64 8 L64 56 L29 37 Z" fill="${C.gold}" opacity=".35"/><ellipse cx="27" cy="32" rx="2.6" ry="3.6" fill="${C.ink}"/><ellipse cx="36" cy="32" rx="2.6" ry="3.6" fill="${C.ink}"/></g>`;
const badge = (cx, cy, g, r = 16) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.s1}" stroke="${C.ac}" stroke-width="1.5"/>` + T(cx, cy + r * 0.36, g, { size: r * 0.95, anchor: 'middle' });
const room = (video) =>
  `<rect width="1366" height="768" fill="${C.bg}"/>` +
  R(24, 20, 930, 44) + T(44, 48, 'Search YouTube or paste a link…', { size: 15, fill: C.mu }) +
  R(900, 26, 48, 32, { rx: 8, fill: C.s2, stroke: C.ac, sw: 2 }) + T(924, 48, '⠿', { size: 17, anchor: 'middle' }) +
  R(980, 20, 362, 728) + T(1000, 50, 'Side panel (chat · queue · people)', { size: 14, fill: C.mu }) +
  (video ? R(24, 80, 930, 668, { rx: 16, fill: '#05060f' }) + `<path d="M190 380 l50 28 l-50 28 z" fill="${C.bd}"/>` + T(215, 470, 'The video stays uncovered', { size: 13, anchor: 'middle', fill: C.mu }) : '');
const svg = (body, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1366 768" font-family="system-ui, sans-serif"><title>${esc(title)}</title>${body}</svg>\n`;
const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
// [glyph, name, line, coming?] — the tiles of source-picker.md "What goes in".
const SRC = {
  yt: ['⌕', 'YouTube', 'Search videos'], vf: ['▶', 'Video feed', 'Popular, back to back'], vim: ['⌕', 'Vimeo', 'Search Vimeo'], dm: ['▷', 'Dailymotion', 'Links', true],
  sf: ['♾', 'Shorts feed', 'Endless Shorts'], tt: ['♪', 'TikTok', 'Find one, paste its link'],
  pod: ['🎙', 'Podcasts', 'Shows and episodes'], ytm: ['♫', 'YouTube Music', 'Playlists and albums', true],
  link: ['🔗', 'Paste a link', 'A video link or file address'], web: ['🌐', 'Search the web', 'Find a video, bring its link'], film: ['🧩', 'Any film page', 'With the extension'],
};

// B. "Shelves": four labelled rows of wide, short tiles; Games is a link at the bottom; no chips.
{
  let s = room(false);
  s += R(24, 80, 930, 668, { rx: 16 }) + glowbeam(44, 94, 0.75) + T(100, 126, 'What are we watching?', { size: 22, bold: 800 }) + T(930, 126, '✕', { size: 20, anchor: 'middle', fill: C.mu });
  const shelves = [['Videos', ['yt', 'vf', 'vim', 'dm']], ['Shorts', ['sf', 'tt']], ['Music', ['pod', 'ytm']], ['From a link', ['link', 'web', 'film']]];
  const tw = 182, th = 78, x0 = 168;
  let y = 160;
  for (const [name, ids] of shelves) {
    s += T(48, y + 44, name, { size: 15, bold: 800, fill: C.gold });
    ids.forEach((id, i) => {
      const [g, n, line, coming] = SRC[id];
      const x = x0 + i * (tw + 10);
      const sel = id === 'yt';
      s += R(x, y, tw, th, { rx: 14, fill: C.s2, stroke: sel ? C.ac : C.bd, sw: sel ? 2.5 : 1 }) + badge(x + 30, y + th / 2, g) + T(x + 56, y + 36, n, { size: 14, bold: 700 }) + T(x + 56, y + 56, cut(line, coming ? 11 : 19), { size: 11.5, fill: C.mu });
      if (sel) s += T(x + tw - 16, y + 22, '✓', { size: 14, fill: C.ac, bold: 800 });
      if (coming) s += R(x + tw - 62, y + th - 24, 54, 18, { rx: 9, fill: C.s1, stroke: C.gold }) + T(x + tw - 35, y + th - 11, 'Coming', { size: 10.5, anchor: 'middle', fill: C.gold, bold: 600 });
    });
    // The empty space a short shelf leaves (one of B's "against" points), drawn dashed.
    if (ids.length < 4) s += R(x0 + ids.length * (tw + 10), y, (4 - ids.length) * (tw + 10) - 10, th, { rx: 14, fill: 'none', stroke: C.bd, dash: true });
    y += th + 24;
  }
  s += `<line x1="48" x2="930" y1="${y + 4}" y2="${y + 4}" stroke="${C.bd}"/>` + T(930, y + 36, '🎮 Games hall →', { size: 14, bold: 700, anchor: 'end', fill: C.ac });
  s += T(48, y + 36, 'Dashed: the empty space the shorter shelves leave.', { size: 12, fill: C.mu });
  s += T(683, 760, 'Option B sketch, computer 1366 × 768, empty room (Night theme). Four shelves, no chips; Games is a link.', { size: 11, anchor: 'middle', fill: C.mu });
  fs.writeFileSync(`${ROOT}/source-picker/b-computer.svg`, svg(s, 'Source picker option B: Shelves (computer, 1366)'));
}

// C. "Bigger ⠿ popover": today's popover under the box, ~460 px, a segmented filter bar and two columns of list rows.
{
  let s = room(true);
  const px = 488, py = 74, pw = 460;
  s += R(px, py, pw, 482, { rx: 14, stroke: C.ac, sw: 1.5 }) + `<path d="M${px + pw - 36} ${py + 1} l12 -10 l12 10 z" fill="${C.s1}" stroke="${C.ac}"/>`;
  s += T(px + 16, py + 32, 'Where should we look?', { size: 15, bold: 800 }) + T(px + pw - 18, py + 32, '✕', { size: 16, anchor: 'end', fill: C.mu });
  const segs = ['All', 'Videos', 'Shorts', 'Music', 'Link'];
  const segW = (pw - 32) / segs.length;
  s += R(px + 16, py + 46, pw - 32, 32, { rx: 16, fill: C.s2 }) + R(px + 18, py + 48, segW - 4, 28, { rx: 14, fill: C.ac, stroke: 'none' });
  segs.forEach((l, i) => (s += T(px + 16 + i * segW + segW / 2, py + 67, l, { size: 12.5, bold: 600, anchor: 'middle', fill: i ? C.tx : '#fff' })));
  const order = ['yt', 'sf', 'vf', 'tt', 'vim', 'pod', 'ytm', 'dm', 'link', 'web', 'film'];
  const cw = (pw - 40) / 2, rh = 58;
  order.forEach((id, i) => {
    const [g, n, line, coming] = SRC[id];
    const x = px + 16 + (i % 2) * (cw + 8), y = py + 92 + Math.floor(i / 2) * (rh + 4), sel = id === 'yt';
    s += R(x, y, cw, rh, { rx: 10, fill: sel ? '#2a2366' : C.s2, stroke: sel ? C.ac : C.bd, sw: sel ? 2 : 1 }) + badge(x + 24, y + rh / 2, g, 14) + T(x + 46, y + 25, n, { size: 13, bold: 700 }) + T(x + 46, y + 43, coming ? 'Coming soon' : cut(line, 24), { size: 11, fill: coming ? C.gold : C.mu });
    if (sel) s += T(x + cw - 12, y + 24, '✓', { size: 13, fill: C.ac, bold: 800, anchor: 'end' });
  });
  s += T(px + pw - 24, py + 92 + 5 * (rh + 4) + 36, '🎮 Games hall →', { size: 13, bold: 700, anchor: 'end', fill: C.ac });
  s += T(48, 700, 'C: today’s ⠿ popover widened to ~460 px: a segmented filter and two columns of list rows (glyph, name, one line).', { size: 12, fill: C.gold });
  s += T(48, 720, 'It hangs under the box, so it never covers any player; the rows read like a menu, not big tiles.', { size: 12, fill: C.gold });
  s += T(683, 760, 'Option C sketch, computer 1366 × 768, a video playing (Night theme). The popover opens from ⠿.', { size: 11, anchor: 'middle', fill: C.mu });
  fs.writeFileSync(`${ROOT}/source-picker/c-computer.svg`, svg(s, 'Source picker option C: Bigger ⠿ popover (computer, 1366)'));
}
console.log('ok');
