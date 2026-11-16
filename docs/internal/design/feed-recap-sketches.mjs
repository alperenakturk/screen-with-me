// Sketch generator for docs/internal/design/feed-start/ and session-recap/ (Design, 16 Nov 2026).
// Run: node docs/internal/design/feed-recap-sketches.mjs docs/internal/design
import fs from 'node:fs';
const ROOT = process.argv[2];
const C = { bg: '#0b0d1f', s1: '#15183a', s2: '#1d2150', bd: '#2c3170', ac: '#8b6cff', tx: '#f1eefc', mu: '#b9b4d8', gold: '#ffc65a', cream: '#fff3d6', orange: '#ff8f3a', n1: '#22174f', n2: '#08061a', ink: '#140d33' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const R = (x, y, w, h, o = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 10}" fill="${o.fill ?? C.s1}" stroke="${o.stroke ?? C.bd}" stroke-width="${o.sw ?? 1}"${o.op ? ` opacity="${o.op}"` : ''}${o.dash ? ' stroke-dasharray="6 4"' : ''}/>`;
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-size="${o.size ?? 13}"${o.bold ? ` font-weight="${o.bold === true ? 700 : o.bold}"` : ''} fill="${o.fill ?? C.tx}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}${o.op ? ` opacity="${o.op}"` : ''}>${esc(s)}</text>`;
const B = (x, y, w, h, label, o = {}) => R(x, y, w, h, { rx: o.rx ?? 10, fill: o.primary ? C.ac : o.sel ? '#2a2366' : C.s2, stroke: o.sel ? C.ac : o.primary ? C.ac : C.bd, sw: o.sel ? 2 : 1 }) + T(x + w / 2, y + h / 2 + (o.size ?? 13) * 0.36, label, { size: o.size ?? 13, bold: o.bold ?? 600, anchor: 'middle', fill: o.primary ? '#fff' : C.tx });
const note = (x, y, n, s) => `<circle cx="${x}" cy="${y}" r="11" fill="${C.gold}"/>` + T(x, y + 4.5, n, { size: 12, bold: 800, anchor: 'middle', fill: C.ink }) + (s ? T(x + 16, y + 4.5, s, { size: 12, fill: C.gold, bold: 600 }) : '');
const logo = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect width="64" height="64" rx="16" fill="${C.n1}"/><path d="M29 27 L64 8 L64 56 L29 37 Z" fill="${C.gold}" opacity=".75"/><path d="M12 20 L31 32 L12 44 Z" fill="#fff" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><ellipse cx="44" cy="32" rx="2.6" ry="3.6" fill="${C.ink}"/><ellipse cx="53" cy="32" rx="2.6" ry="3.6" fill="${C.ink}"/></g>`;
const glow = (x, y, s = 1, mouth = 'smile') => `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="40" cy="32" r="23" fill="${C.gold}" opacity=".25"/><path d="M5 32 L28 17.5 A17 17 0 1 1 28 46.5 Z" fill="${C.gold}" stroke="${C.gold}" stroke-width="2" stroke-linejoin="round"/><ellipse cx="38" cy="30" rx="2.8" ry="3.9" fill="#1a1036"/><ellipse cx="47" cy="30" rx="2.8" ry="3.9" fill="#1a1036"/>${mouth === 'wow' ? '<ellipse cx="42.5" cy="39" rx="1.7" ry="2.1" fill="#1a1036"/>' : '<path d="M38.5 37.5 Q42.5 42 46.5 37.5" stroke="#1a1036" stroke-width="1.6" fill="none" stroke-linecap="round"/>'}</g>`;
const svg = (w, h, body, title) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" font-family="system-ui, sans-serif"><title>${esc(title)}</title><rect width="${w}" height="${h}" fill="${C.bg}"/>${body}</svg>\n`;
const write = (f, s) => { fs.mkdirSync(`${ROOT}/${f.split('/')[0]}`, { recursive: true }); fs.writeFileSync(`${ROOT}/${f}`, s); };
const topbar = (w) => R(0, 0, w, 52, { rx: 0, fill: '#0e1029', stroke: C.bd }) + logo(16, 12, 0.44) + T(52, 32, 'Sidelit', { bold: 700, size: 15 }) + B(w - 260, 10, 92, 32, '🔗 Invite', { primary: true }) + R(w - 150, 10, 34, 32) + T(w - 133, 31, '⋯', { anchor: 'middle' }) + `<circle cx="${w - 80}" cy="26" r="15" fill="${C.s2}" stroke="${C.ac}"/>`;
const video = (x, y, w, h, label = 'The video keeps playing') => R(x, y, w, h, { rx: 14, fill: '#05060f' }) + `<path d="M${x + w / 2 - 22} ${y + h / 2 - 28} l50 28 l-50 28 z" fill="#2c3170"/>` + T(x + w / 2, y + h / 2 + 52, label, { anchor: 'middle', fill: C.mu, size: 13 });

// ---------- FEED START ----------
// Shared: the drawer content (option A), at x,y with width w.
function drawerA(x, y, w, h, opt = {}) {
  let s = R(x, y, w, h, { rx: 16, fill: C.s1, stroke: C.ac, sw: 1.5 });
  const px = x + 16, iw = w - 32;
  s += T(px, y + 30, opt.running ? 'Feed' : 'Start a feed', { size: 17, bold: 800 }) + B(x + w - 46, y + 12, 30, 30, '✕', { size: 14 });
  let cy = y + 46;
  if (opt.running) {
    s += R(px, cy, iw, 58, { fill: '#2a2366', stroke: C.ac }) + T(px + 12, cy + 22, '♾ On now: 🎵 Music · 🇹🇷', { bold: 700, size: 14 }) + T(px + 12, cy + 42, 'Started by Sam · everyone sees it', { size: 12, fill: C.mu });
    s += B(px + iw - 150, cy + 14, 70, 30, '⏸ Pause', { size: 12 }) + B(px + iw - 74, cy + 14, 66, 30, '✕ Stop', { size: 12 });
    cy += 70;
    s += T(px, cy + 12, 'Start a different feed (replaces Sam’s)', { size: 12, fill: C.mu });
    cy += 24;
  }
  s += T(px, cy + 12, '1  What to watch', { size: 12, bold: 700, fill: C.gold });
  cy += 22;
  const half = (iw - 8) / 2;
  s += B(px, cy, half, 46, '♾ Shorts', { sel: true, size: 14 }) + B(px + half + 8, cy, half, 46, '▶ Videos', { size: 14 });
  s += T(px + 10, cy + 60, 'Short vertical clips, one after another', { size: 11.5, fill: C.mu });
  cy += 78;
  s += T(px, cy + 12, '2  Where they come from', { size: 12, bold: 700, fill: C.gold });
  cy += 22;
  const tiles = [['🔥', 'Popular now', 'Most watched today'], ['🎵', 'Music', 'Hits and new songs'], ['🎮', 'Gaming', 'Plays and clips'], ['😂', 'Comedy', 'Sketches, fails'], ['🐾', 'Animals', 'Cats, dogs, more'], ['⚽', 'Sports', 'Goals, highlights']];
  const tw = (iw - 16) / 3, th = opt.compact ? 52 : 62;
  tiles.forEach(([e, n, d], i) => {
    const tx = px + (i % 3) * (tw + 8), ty = cy + Math.floor(i / 3) * (th + 8), sel = i === 1;
    s += R(tx, ty, tw, th, { fill: sel ? '#2a2366' : C.s2, stroke: sel ? C.ac : C.bd, sw: sel ? 2 : 1 }) + T(tx + 10, ty + 22, `${e} ${n}`, { size: 12.5, bold: 700 }) + (opt.compact ? '' : T(tx + 10, ty + 42, d, { size: 10.5, fill: C.mu })) + (sel ? T(tx + tw - 16, ty + 18, '✓', { fill: C.ac, bold: 800 }) : '');
  });
  cy += 2 * (th + 8) + 4;
  s += R(px, cy, iw, 38, { fill: C.s2 }) + T(px + 12, cy + 24, '🔤 Or your own: words, a video or @channel', { size: 12, fill: C.mu });
  cy += 50;
  s += T(px, cy + 12, '3  Country', { size: 12, bold: 700, fill: C.gold }) + R(px + 90, cy - 4, iw - 90, 30) + T(px + 102, cy + 16, '🌍 My country (Türkiye)  ▾', { size: 12 });
  cy += 40;
  s += `<line x1="${px}" x2="${px + iw}" y1="${cy}" y2="${cy}" stroke="${C.bd}"/>`;
  s += T(px, cy + 22, 'Will play: ♾ Shorts · 🎵 Music · 🇹🇷 for everyone', { size: 12.5, bold: 600 });
  s += B(px, cy + 34, iw, 46, opt.running ? '▶ Start this feed instead' : '▶ Start feed', { primary: true, size: 15, bold: 800 });
  if (opt.hostOnly) s += T(px, cy + 98, '🔒 Only the host can start a feed in this room', { size: 11.5, fill: C.mu });
  return s;
}
// A-computer: normal room, drawer on the right over the side panel; the video stays visible.
{
  const W = 1366, H = 768;
  let s = topbar(W);
  s += R(24, 68, 930, 40) + T(40, 93, 'Search YouTube or paste a link…', { fill: C.mu });
  s += video(24, 120, 930, 524);
  s += R(36, 132, 420, 32, { rx: 16, fill: '#000', stroke: C.ac, op: 0.85 }) + T(52, 153, '♾ Feed: 🎵 Music · by Sam   ⏸   ✕', { size: 13, bold: 600 });
  s += R(980, 68, 362, 680, { op: 0.35 }) + T(1000, 96, 'Side panel (under the drawer)', { fill: C.mu, size: 12, op: 0.6 });
  s += drawerA(946, 64, 404, 506, {});
  s += note(470, 148, '1', 'Everyone sees the running feed here; anyone can ✕ it') + note(930, 300, '2') + note(930, 552, '3');
  s += T(24, 676, '② The drawer opens on the right: no backdrop, the video is not dimmed and keeps playing.', { size: 12, fill: C.gold }) + T(24, 696, '③ Tiles only select (✓). Nothing starts until “▶ Start feed”. Esc / ✕ closes without changes.', { size: 12, fill: C.gold });
  write('feed-start/a-computer.svg', svg(W, H, s, 'Feed start, option A: right drawer (computer, 1366)'));
}
// A-phone: bottom sheet, top 40 % keeps the video.
{
  const W = 390, H = 844;
  let s = video(0, 0, 390, 300, 'The Short / video stays visible');
  s += R(10, 12, 250, 28, { rx: 14, fill: '#000', stroke: C.ac, op: 0.85 }) + T(22, 31, '♾ Music · by Sam   ✕', { size: 12, bold: 600 });
  s += `<g>${drawerA(0, 286, 390, 560, { compact: true })}</g>`;
  s += R(165, 292, 60, 5, { rx: 3, fill: C.mu, stroke: 'none' });
  write('feed-start/a-phone.svg', svg(W, H, s, 'Feed start, option A: half sheet (phone)'));
}
// Tidy Shorts view (A): labelled rail in three groups, the feed pill, toasts away from the rail, drawer right of it.
function rail(x, y, labels = true) {
  const groups = [['Talk', [['💬', 'Chat'], ['😀', 'React'], ['🎙', 'Voice'], ['📹', 'Camera']]], ['Watch', [['＋', 'Add'], ['♾', 'Feed'], ['🔁', 'Loop']]], ['Room', [['🎮', 'Games'], ['↩', 'Room view'], ['⋯', 'More']]]];
  let s = '', cy = y;
  for (const [g, items] of groups) {
    s += T(x, cy + 10, g.toUpperCase(), { size: 9.5, bold: 700, fill: C.mu, op: 0.8 });
    cy += 16;
    for (const [e, l] of items) {
      const on = l === 'Feed';
      s += R(x, cy, labels ? 118 : 46, 40, { rx: 12, fill: on ? '#2a2366' : C.s2, stroke: on ? C.ac : C.bd, sw: on ? 2 : 1 }) + T(x + 23, cy + 26, e, { size: 16, anchor: 'middle' }) + (labels ? T(x + 46, cy + 25, l, { size: 12.5, bold: 600 }) : '');
      cy += 46;
    }
    cy += 8;
  }
  return s;
}
{
  const W = 1366, H = 768;
  let s = `<rect width="${W}" height="${H}" fill="url(#sky)"/><defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#232262"/><stop offset="1" stop-color="#080a1c"/></linearGradient></defs>`;
  s += R(330, 14, 404, 720, { rx: 16, fill: '#05060f' }) + T(532, 380, 'Short', { anchor: 'middle', fill: C.mu, size: 16 });
  s += R(400, 26, 264, 30, { rx: 15, fill: '#000', stroke: C.ac, op: 0.9 }) + T(532, 46, '♾ Feed: 🎵 Music · 12 left · by Sam', { size: 12, bold: 600, anchor: 'middle' });
  s += `<circle cx="250" cy="370" r="36" fill="${C.s2}" stroke="${C.ac}" stroke-width="3"/>` + T(250, 426, 'Alex (you)', { anchor: 'middle', size: 12 });
  s += rail(748, 20);
  s += B(748, 640, 46, 42, '▲', { size: 15 }) + T(771, 700, '12 left', { size: 11, anchor: 'middle', fill: C.mu }) + B(748, 708, 46, 42, '▼', { size: 15 });
  s += R(330, 690, 404, 40, { rx: 12, fill: '#11132b', stroke: C.gold, op: 0.95 }) + T(346, 715, 'Toasts sit here, under the Short, never on the rail', { size: 12, fill: C.cream });
  s += drawerA(900, 14, 450, 506, {});
  s += note(390, 72, '1', 'A pill: a feed runs, who started it, how many left') + note(880, 30, '2') + note(882, 240, '3') + note(812, 696, '4') + note(320, 700, '5');
  s += T(24, 610, '③ Rail: three labelled groups (Talk · Watch · Room).', { size: 12, fill: C.gold }) + T(24, 630, '   Labels show when the screen is wide enough;', { size: 12, fill: C.gold }) + T(24, 650, '   icons + tooltips otherwise.', { size: 12, fill: C.gold });
  s += T(24, 670, '④ ▲ / ▼ with “12 left” instead of a bare number.', { size: 12, fill: C.gold });
  write('feed-start/a-shorts-computer.svg', svg(W, H, s, 'Option A in the Shorts view (computer, 1366)'));
}
{
  const W = 390, H = 844;
  let s = R(0, 0, 390, 760, { rx: 0, fill: '#05060f', stroke: 'none' }) + T(195, 380, 'Short', { anchor: 'middle', fill: C.mu, size: 16 });
  s += R(10, 12, 280, 30, { rx: 15, fill: '#000', stroke: C.ac, op: 0.9 }) + T(22, 32, '♾ Music · 12 left · by Sam    ✕', { size: 12, bold: 600 });
  s += R(0, 760, 390, 84, { rx: 0, fill: C.s1 });
  const items = [['💬', 'Chat'], ['😀', 'React'], ['♾', 'Feed'], ['▲', ''], ['▼', ''], ['⋯', 'More']];
  items.forEach(([e, l], i) => { const x = 14 + i * 62; s += R(x, 770, 52, 44, { rx: 14, fill: e === '♾' ? '#2a2366' : C.s2, stroke: e === '♾' ? C.ac : C.bd }) + T(x + 26, 798, e, { size: 17, anchor: 'middle' }) + (l ? T(x + 26, 832, l, { size: 10.5, anchor: 'middle', fill: C.mu }) : ''); });
  s += T(232, 832, '12 left', { size: 10.5, anchor: 'middle', fill: C.mu });
  s += note(300, 27, '1') + note(140, 754, '2', '♾ Feed moves out of ⋯ into the bar');
  write('feed-start/a-shorts-phone.svg', svg(W, H, s, 'Option A in the Shorts view (phone)'));
}
// Option B: three-step wizard popping out of the rail / ♾ button.
{
  const W = 1366 + 40 + 390, H = 768;
  let s = topbar(1366) + video(24, 68, 930, 680) + R(980, 68, 362, 680, { op: 0.5 });
  const px = 1000, py = 140, pw = 330;
  s += R(px - 16, py - 16, pw + 32, 430, { rx: 16, fill: C.s1, stroke: C.ac, sw: 1.5 });
  s += T(px, py + 12, 'Start a feed', { size: 17, bold: 800 }) + T(px + pw, py + 12, 'Step 2 of 3', { size: 12, fill: C.mu, anchor: 'end' });
  s += R(px, py + 24, pw, 6, { rx: 3, fill: C.s2, stroke: 'none' }) + R(px, py + 24, pw * 0.66, 6, { rx: 3, fill: C.ac, stroke: 'none' });
  s += T(px, py + 60, 'Where should the ♾ Shorts come from?', { size: 14, bold: 700 });
  [['🔥 Popular now', 'Most watched today'], ['🎵 Music', 'Hits and new songs'], ['😂 Comedy', 'Sketches, fails'], ['🔤 My own words or @channel', '']].forEach(([a, b], i) => { const y = py + 76 + i * 56; s += R(px, y, pw, 48, { fill: i === 1 ? '#2a2366' : C.s2, stroke: i === 1 ? C.ac : C.bd, sw: i === 1 ? 2 : 1 }) + T(px + 14, y + (b ? 21 : 29), a, { size: 13.5, bold: 700 }) + (b ? T(px + 14, y + 39, b, { size: 11, fill: C.mu }) : ''); });
  s += T(px, py + 314, '… 3 more categories', { size: 12, fill: C.mu });
  s += B(px, py + 336, 100, 42, '‹ Back') + B(px + pw - 150, py + 336, 150, 42, 'Next: country ›', { primary: true });
  s += T(px - 10, py + 440, 'Step 3 ends with “▶ Start feed”.', { size: 12, fill: C.gold });
  const ox = 1406;
  s += R(ox, 0, 390, 768, { rx: 0, fill: C.bg, stroke: 'none' }) + video(ox, 0, 390, 300);
  s += R(ox, 290, 390, 478, { rx: 16, fill: C.s1, stroke: C.ac }) + T(ox + 16, 324, 'Start a feed · 2 of 3', { size: 16, bold: 800 });
  ['🔥 Popular now', '🎵 Music', '😂 Comedy', '🔤 My own words'].forEach((a, i) => { s += R(ox + 16, 344 + i * 58, 358, 50, { fill: i === 1 ? '#2a2366' : C.s2, stroke: i === 1 ? C.ac : C.bd, sw: i === 1 ? 2 : 1 }) + T(ox + 30, 374 + i * 58, a, { size: 14, bold: 700 }); });
  s += B(ox + 16, 690, 110, 46, '‹ Back') + B(ox + 204, 690, 170, 46, 'Next ›', { primary: true });
  write('feed-start/b-steps.svg', svg(W, H, s, 'Feed start, option B: three steps (computer + phone)'));
}
// Option C: ready-made feed cards + one switch for Shorts / Videos.
{
  const W = 1366 + 40 + 390, H = 768;
  let s = topbar(1366) + video(24, 68, 900, 680);
  const px = 950, pw = 392;
  s += R(px - 12, 64, pw + 24, 690, { rx: 16, fill: C.s1, stroke: C.ac, sw: 1.5 });
  s += T(px + 4, 96, 'Pick a feed', { size: 17, bold: 800 }) + R(px + pw - 190, 76, 186, 32, { rx: 16, fill: C.s2 }) + R(px + pw - 188, 78, 90, 28, { rx: 14, fill: C.ac, stroke: 'none' }) + T(px + pw - 143, 97, '♾ Shorts', { size: 12, bold: 700, anchor: 'middle' }) + T(px + pw - 51, 97, '▶ Videos', { size: 12, bold: 600, anchor: 'middle' });
  const cards = [['🔥', 'Popular in Türkiye', 'What most people watch right now'], ['🎵', 'Music', 'New songs and hits, back to back'], ['🎮', 'Gaming', 'Best plays and funny clips'], ['😂', 'Comedy', 'Sketches, pranks and fails'], ['🐾', 'Animals', 'Cats, dogs and everything cute'], ['⚽', 'Sports', 'Goals and highlights']];
  cards.forEach(([e, n, d], i) => { const y = 122 + i * 66; const sel = i === 1; s += R(px, y, pw, 58, { rx: 12, fill: sel ? '#2a2366' : C.s2, stroke: sel ? C.ac : C.bd, sw: sel ? 2 : 1 }) + `<circle cx="${px + 30}" cy="${y + 29}" r="19" fill="${C.s1}"/>` + T(px + 30, y + 35, e, { size: 17, anchor: 'middle' }) + T(px + 60, y + 25, n, { size: 14, bold: 700 }) + T(px + 60, y + 44, d, { size: 11.5, fill: C.mu }) + (sel ? T(px + pw - 22, y + 34, '✓', { fill: C.ac, bold: 800, size: 16 }) : ''); });
  s += R(px, 522, pw, 58, { rx: 12, fill: C.s2, dash: true }) + T(px + 16, 546, '🔤 Make your own', { size: 14, bold: 700 }) + T(px + 16, 566, 'Words, a video link or a @channel', { size: 11.5, fill: C.mu });
  s += T(px, 610, 'Country: 🌍 My country ▾', { size: 12.5, fill: C.mu });
  s += B(px, 630, pw, 50, '▶ Start “Music” for everyone', { primary: true, size: 15, bold: 800 });
  const ox = 1406;
  s += R(ox, 0, 390, 768, { rx: 0, fill: C.bg, stroke: 'none' }) + video(ox, 0, 390, 250);
  s += R(ox, 240, 390, 528, { rx: 16, fill: C.s1, stroke: C.ac }) + T(ox + 16, 274, 'Pick a feed', { size: 16, bold: 800 }) + T(ox + 374, 274, '♾ Shorts | ▶ Videos', { size: 12, anchor: 'end', fill: C.mu });
  cards.slice(0, 5).forEach(([e, n], i) => { s += R(ox + 16, 290 + i * 60, 358, 52, { fill: i === 1 ? '#2a2366' : C.s2, stroke: i === 1 ? C.ac : C.bd, sw: i === 1 ? 2 : 1 }) + T(ox + 30, 322 + i * 60, `${e}  ${n}`, { size: 14, bold: 700 }); });
  s += B(ox + 16, 700, 358, 50, '▶ Start feed', { primary: true, size: 15, bold: 800 });
  write('feed-start/c-cards.svg', svg(W, H, s, 'Feed start, option C: ready-made feed cards (computer + phone)'));
}

// ---------- SESSION RECAP ----------
const SCENES = [
  { key: 'time', name: 'Night sky', a: '#22174f', b: '#08061a', ink: C.cream, big: '3 h 42 min', line: 'you watched together tonight', sub: 'Started 22:04 · 4 people', deco: 'stars' },
  { key: 'emoji', name: 'Emoji rain', a: '#0f766e', b: '#073b3a', ink: '#eafff9', big: '😂 × 64', line: 'the room’s favourite emoji', sub: 'Sam sent 31 of them', deco: 'rain' },
  { key: 'talker', name: 'Bubble pop', a: '#ffd7e2', b: '#ff9bb8', ink: '#3b0f2a', big: '💬 Sam', line: 'talked the most', sub: '58 messages', deco: 'bubbles' },
  { key: 'videos', name: 'Film reel', a: '#fff3d6', b: '#ffc65a', ink: '#2a1606', big: '9 videos', line: 'and 3 long ones', sub: 'Last: A night walk by the harbour', deco: 'reel' },
  { key: 'crowd', name: 'Front row', a: '#1e3a8a', b: '#0b1430', ink: '#e8f0ff', big: '4 seats', line: 'filled at the busiest moment', sub: 'Alex, Sam, Robin, Kai', deco: 'seats' },
  { key: 'pauser', name: 'Snack break', a: '#fde68a', b: '#f59e0b', ink: '#3b2203', big: '⏸ Robin', line: 'paused the most', sub: '7 snack breaks', deco: 'popcorn' },
];
function deco(sc, x, y, w, h) {
  let s = '';
  const rnd = (i) => { const v = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return v - Math.floor(v); };
  if (sc.deco === 'stars') for (let i = 0; i < 40; i++) s += `<circle cx="${x + rnd(i) * w}" cy="${y + rnd(i + 50) * h * 0.7}" r="${1 + rnd(i + 9) * 1.6}" fill="#fff" opacity="${0.4 + rnd(i + 3) * 0.5}"/>`;
  if (sc.deco === 'rain') for (let i = 0; i < 26; i++) s += T(x + rnd(i) * w, y + 20 + rnd(i + 40) * h, '😂', { size: 14 + rnd(i + 7) * 14, op: 0.35 });
  if (sc.deco === 'bubbles') for (let i = 0; i < 14; i++) { const bx = x + rnd(i) * w, by = y + rnd(i + 30) * h, r = 14 + rnd(i + 3) * 26; s += `<rect x="${bx}" y="${by}" width="${r * 2}" height="${r * 1.3}" rx="${r * 0.6}" fill="#fff" opacity=".45"/>`; }
  if (sc.deco === 'reel') for (let i = 1; i < 2; i++) { const yy = y + h - 34; s += `<rect x="${x}" y="${yy}" width="${w}" height="24" fill="#2a1606" opacity=".85"/>`; for (let k = 0; k < w / 22; k++) s += `<rect x="${x + 6 + k * 22}" y="${yy + 6}" width="12" height="12" rx="2" fill="${C.cream}"/>`; }
  if (sc.deco === 'seats') for (let k = 0; k < 9; k++) s += `<rect x="${x + 20 + k * (w - 40) / 9}" y="${y + h - 60}" width="${(w - 40) / 9 - 8}" height="46" rx="12" fill="#b91c1c" opacity=".7"/>`;
  if (sc.deco === 'popcorn') for (let i = 0; i < 22; i++) s += `<circle cx="${x + rnd(i) * w}" cy="${y + rnd(i + 70) * h}" r="${6 + rnd(i + 5) * 9}" fill="#fff8e7" opacity=".7"/>`;
  return s;
}
function scene(sc, x, y, w, h, id, o = {}) {
  const k = w / 960;
  let s = `<defs><linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${sc.a}"/><stop offset="1" stop-color="${sc.b}"/></linearGradient><clipPath id="c${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${14 * k + 4}"/></clipPath></defs>`;
  s += `<g clip-path="url(#c${id})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#g${id})"/>`;
  // The logo's light cone sweeps across every scene: the family trait of the show.
  s += `<path d="M${x + w * 0.08} ${y + h * 0.5} L${x + w} ${y + h * 0.05} L${x + w} ${y + h * 0.95} Z" fill="${C.gold}" opacity=".10"/>`;
  s += deco(sc, x, y, w, h);
  s += T(x + w * 0.5, y + h * 0.48, sc.big, { size: 64 * k, bold: 900, anchor: 'middle', fill: sc.ink });
  s += T(x + w * 0.5, y + h * 0.48 + 40 * k, sc.line, { size: 24 * k, bold: 700, anchor: 'middle', fill: sc.ink });
  s += T(x + w * 0.5, y + h * 0.48 + 70 * k, sc.sub, { size: 17 * k, anchor: 'middle', fill: sc.ink, op: 0.85 });
  s += logo(x + 18 * k, y + 16 * k, 0.6 * k) + T(x + 62 * k, y + 42 * k, 'Sidelit · Session recap', { size: 15 * k, bold: 700, fill: sc.ink });
  if (o.glow) s += glow(x + w - 150 * k, y + h - 140 * k, 1.6 * k, 'wow');
  if (o.ctrl) s += R(x + w - 214 * k, y + 14 * k, 200 * k, 34 * k, { rx: 17 * k, fill: '#000', stroke: 'none', op: 0.45 }) + T(x + w - 114 * k, y + 37 * k, '⏸  🔊  ✕ Close for me', { size: 13 * k, anchor: 'middle', fill: '#fff' });
  s += '</g>';
  return s;
}
const roomFrame = (W) => topbar(W) + R(980, 68, 362, 680, { op: 1 }) + T(1000, 96, 'Chat stays usable', { fill: C.mu, size: 12 }) + R(996, 690, 330, 40) + T(1010, 715, 'So good 😂', { size: 12, fill: C.mu });
// Look A: "Night stage" — one scene at a time in the video's place, a filmstrip progress under it.
{
  const W = 1366, H = 768;
  let s = roomFrame(W);
  s += scene(SCENES[1], 24, 72, 930, 523, 'A', { glow: true, ctrl: true });
  const n = 8, fw = (930 - (n - 1) * 6) / n;
  for (let i = 0; i < n; i++) { const sc = SCENES[i % SCENES.length]; s += R(24 + i * (fw + 6), 610, fw, 52, { rx: 8, fill: sc.a, stroke: i === 1 ? '#fff' : C.bd, sw: i === 1 ? 2.5 : 1, op: i < 1 ? 0.55 : 1 }); s += T(24 + i * (fw + 6) + fw / 2, 641, ['⏱', '😂', '💬', '🎬', '💺', '⏸', '😢', '✨'][i], { size: 18, anchor: 'middle' }); }
  s += T(24, 690, 'Filmstrip under the show: each frame is one fact; the lit one plays now. Click a frame to jump (for yourself).', { size: 12, fill: C.gold });
  s += T(24, 710, 'Scenes slide in from the right (horizontal), 5 s each; with reduced motion they cross-fade and wait for ▶.', { size: 12, fill: C.gold });
  s += T(24, 736, 'The queue is untouched; at the end “▶ Back to the video” resumes where everyone was.', { size: 12, fill: C.gold });
  write('session-recap/look-a-stage.svg', svg(W, H, s, 'Recap look A: Night stage (computer, 1366)'));
}
// The scene set: every fact its own background.
{
  const W = 1366, H = 768;
  let s = T(24, 40, 'Look A: one scene per fact (16:9, the logo’s light cone and our wordmark on each)', { size: 18, bold: 800 });
  SCENES.forEach((sc, i) => { const x = 24 + (i % 3) * 446, y = 64 + Math.floor(i / 3) * 352; s += scene(sc, x, y, 426, 240, `S${i}`); s += T(x, y + 266, `${sc.name}`, { size: 15, bold: 700 }) + T(x, y + 288, { time: 'How long, when it started, how many people', emoji: 'Most-used emoji, who sent it most', talker: 'Who talked most', videos: 'How many videos, the last title', crowd: 'Most people at once, their avatars', pauser: 'Who paused most (a playful one)' }[sc.key], { size: 12.5, fill: C.mu }); });
  write('session-recap/look-a-scenes.svg', svg(W, H, s, 'Recap look A: the scenes'));
}
// Look B: Filmstrip — all facts as frames moving right-to-left like a reel.
{
  const W = 1366, H = 768;
  let s = roomFrame(W);
  s += R(24, 72, 930, 523, { rx: 14, fill: '#120d0a', stroke: C.bd });
  s += `<rect x="24" y="96" width="930" height="26" fill="#000"/><rect x="24" y="545" width="930" height="26" fill="#000"/>`;
  for (let k = 0; k < 42; k++) s += `<rect x="${30 + k * 22}" y="103" width="12" height="12" rx="2" fill="#3a3020"/><rect x="${30 + k * 22}" y="552" width="12" height="12" rx="2" fill="#3a3020"/>`;
  [0, 1, 2].forEach((i) => { s += scene(SCENES[i + 1], -150 + i * 440, 210, 420, 236, `B${i}`); });
  s += `<rect x="24" y="72" width="80" height="523" fill="url(#fadeL)"/><defs><linearGradient id="fadeL"><stop offset="0" stop-color="#120d0a"/><stop offset="1" stop-color="#120d0a" stop-opacity="0"/></linearGradient></defs>`;
  s += T(489, 588, '← the reel moves on its own, 2½ frames in view; the middle one is lit and read aloud', { size: 12.5, fill: C.gold, anchor: 'middle' });
  s += T(24, 630, 'Look B “Filmstrip”: the whole session as a strip of film. Busier, more “cinema”, frames are smaller (phone: 1 in view).', { size: 12, fill: C.gold });
  write('session-recap/look-b-filmstrip.svg', svg(W, H, s, 'Recap look B: Filmstrip (computer, 1366)'));
}
// Look C: Postcards — each fact a postcard dealt onto a table; ends as a collage poster.
{
  const W = 1366, H = 768;
  let s = roomFrame(W);
  s += R(24, 72, 930, 523, { rx: 14, fill: '#2b1d14', stroke: C.bd });
  const pos = [[60, 110, -6], [330, 130, 4], [600, 105, -3], [150, 330, 3], [440, 340, -5]];
  pos.forEach(([x, y, r], i) => { s += `<g transform="rotate(${r} ${x + 140} ${y + 90})">${R(x - 8, y - 8, 296, 196, { rx: 6, fill: '#fffaf0', stroke: '#e5d9c0' })}${scene(SCENES[i], x, y, 280, 158, `P${i}`)}<rect x="${x + 236}" y="${y + 6}" width="38" height="44" fill="#fff" stroke="#e5d9c0"/>${logo(x + 240, y + 12, 0.47)}</g>`; });
  s += glow(780, 430, 1.8);
  s += T(24, 630, 'Look C “Postcards”: each fact is a postcard with a Sidelit stamp, dealt onto a table; the last frame is the whole collage (Save image).', { size: 12, fill: C.gold });
  write('session-recap/look-c-postcards.svg', svg(W, H, s, 'Recap look C: Postcards (computer, 1366)'));
}
// Entry point + flow (option F1): rail ✨ chip, end card, "ask the host", the host's answer.
{
  const W = 1366, H = 768;
  let s = topbar(W);
  s += video(24, 68, 900, 506, '');
  // Rail beside the video with the ✨ button
  s += R(936, 68, 54, 506, { rx: 14, fill: C.s1 });
  ['💬', '😀', '🎙', '＋', '🎮'].forEach((e, i) => { s += B(942, 80 + i * 50, 42, 42, e, { size: 16 }); });
  s += R(942, 340, 42, 42, { rx: 10, fill: '#3a2a10', stroke: C.gold, sw: 2 }) + T(963, 367, '✨', { size: 17, anchor: 'middle' }) + `<circle cx="980" cy="344" r="5" fill="${C.gold}"/>`;
  s += note(1004, 362, '1');
  // End card in the video's place
  s += R(300, 220, 350, 200, { rx: 16, fill: C.s1, stroke: C.ac }) + T(475, 256, 'Video ended', { size: 16, bold: 800, anchor: 'middle' }) + T(475, 280, 'Nothing else in the queue', { size: 12.5, fill: C.mu, anchor: 'middle' });
  s += B(320, 300, 310, 44, '✨ Show tonight’s recap to everyone', { primary: true, size: 13.5 }) + B(320, 354, 150, 40, '▶ Play next', { size: 13 }) + B(480, 354, 150, 40, 'Close', { size: 13 });
  s += note(290, 230, '2');
  // Guest request toast (on a guest's screen) and the host's answer
  s += R(1000, 80, 350, 96, { rx: 14, fill: C.s2, stroke: C.ac }) + T(1016, 106, 'Guest’s ✨ menu', { size: 11, fill: C.mu }) + T(1016, 128, '✨ The recap is ready (1 h 40 min)', { size: 13, bold: 700 }) + B(1016, 138, 200, 30, '🙋 Ask the host to show it', { size: 12 });
  s += note(1360, 90, '3');
  s += R(1000, 196, 350, 108, { rx: 14, fill: C.s2, stroke: C.gold, sw: 1.5 }) + T(1016, 222, 'Host’s screen', { size: 11, fill: C.mu }) + T(1016, 244, '🙋 Sam asks to see the recap', { size: 13, bold: 700 }) + B(1016, 258, 160, 34, '✨ Show to everyone', { primary: true, size: 12 }) + B(1186, 258, 100, 34, 'Not now', { size: 12 });
  s += note(1360, 206, '4');
  // Nudge strip (quiet)
  s += R(24, 590, 900, 44, { rx: 12, fill: '#1a1530', stroke: C.gold, op: 0.95 }) + glow(30, 588, 0.7) + T(84, 618, 'Long night! The recap of these 3 h 12 min is ready under ✨ whenever you like.', { size: 13 }) + T(910, 618, '✕', { size: 14, anchor: 'end', fill: C.mu });
  s += note(14, 600, '5');
  s += T(24, 664, '① ✨ appears on the rail / top bar only once the session is eligible (≥ 30 min, ≥ 2 people). A gold dot until someone opened it.', { size: 12, fill: C.gold });
  s += T(24, 684, '② The natural end: the queue ran out. The host gets the button on the end card; guests get “🙋 Ask the host”.', { size: 12, fill: C.gold });
  s += T(24, 704, '③ ④ Guests ask (once per 10 min each); the host gets one toast with the names collected, never a popup.', { size: 12, fill: C.gold });
  s += T(24, 724, '⑤ At most one quiet line per session, never after the recap was shown, never for people who said “✕ don’t remind me”.', { size: 12, fill: C.gold });
  write('session-recap/entry-flow.svg', svg(W, H, s, 'Recap entry point and flow (computer, 1366)'));
}
// Phone: the recap in the video's place (upright and sideways).
{
  const W = 390 + 30 + 844, H = 844;
  let s = scene(SCENES[0], 0, 60, 390, 219, 'PH', {}) + R(0, 0, 390, 56, { rx: 0, fill: '#0e1029' }) + T(16, 34, 'Sidelit', { bold: 700 });
  s += R(0, 290, 390, 554, { rx: 0, fill: C.s1 }) + T(16, 320, 'Chat', { bold: 700 }) + T(16, 350, 'Sam: haha this is us 😂', { size: 13, fill: C.mu });
  s += R(8, 236, 374, 34, { rx: 17, fill: '#000', stroke: 'none', op: 0.45 }) + T(195, 258, '⏸   🔊   ✕ Close for me    ●●●○○○○○', { size: 12, anchor: 'middle', fill: '#fff' });
  s += T(16, 400, 'Upright: the recap is a 16:9 frame where the video is;', { size: 12, fill: C.gold }) + T(16, 418, 'chat stays below. A tap left / right steps back / on.', { size: 12, fill: C.gold });
  s += scene(SCENES[2], 420, 2, 844, 390, 'PL', { glow: true, ctrl: true }) + T(420, 420, 'Sideways: the show fills the screen like a video (it is one, for everyone).', { size: 12, fill: C.gold });
  write('session-recap/phone.svg', svg(W, H, s, 'Recap on a phone (upright and sideways)'));
}
console.log('ok');
