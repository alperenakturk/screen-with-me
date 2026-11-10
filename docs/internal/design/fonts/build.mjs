// FONT1: builds index.html, the sample page of the font candidates (fonts in files/, cut by subset.py).
//   node docs/internal/design/fonts/build.mjs
import { writeFileSync, statSync } from 'node:fs';
const here = new URL('.', import.meta.url);
// id, family name, axes (wght), latin + latin-ext KB (whole npm files), Turkish cut KB (subset.py's range), ₺?
export const FONTS = {
  'bricolage-grotesque': ['Bricolage Grotesque', '200–800 (+ opsz, wdth)', 58, 38, true],
  figtree: ['Figtree', '300–900', 29, 20, false],
  'plus-jakarta-sans': ['Plus Jakarta Sans', '200–800', 47, 26, true],
  inter: ['Inter', '100–900 (+ opsz)', 130, 40, true],
  fraunces: ['Fraunces', '100–900 (+ opsz, soft, wonk)', 68, 37, true],
  manrope: ['Manrope', '200–800', 39, 25, true],
  outfit: ['Outfit', '100–900', 45, 31, false],
  onest: ['Onest', '100–900', 60, 32, true],
  'space-grotesk': ['Space Grotesk', '300–700', 40, 20, true],
  'dm-sans': ['DM Sans', '100–1000 (+ opsz)', 53, 36, true],
  unbounded: ['Unbounded', '200–900', 165, 46, true],
  rubik: ['Rubik', '300–900', 53, 34, false],
  sora: ['Sora', '100–800', 48, 32, false],
  'instrument-sans': ['Instrument Sans', '400–700 (+ wdth)', 40, 29, false],
  'atkinson-hyperlegible-next': ['Atkinson Hyperlegible Next', '200–800', 51, 33, false],
  lexend: ['Lexend', '100–900', 72, 37, true],
  nunito: ['Nunito', '200–1000', 72, 36, true],
};
// [label, heading id, body id, note]
const SETS = [
  ['1 · recommended default', 'bricolage-grotesque', 'figtree', 'Keeps the wordmark face for titles; Figtree is warm, open and the smallest body here.'],
  ['2', 'bricolage-grotesque', 'plus-jakarta-sans', 'Same titles; a slightly more polished, geometric body.'],
  ['3', 'bricolage-grotesque', 'inter', 'The safest UI body, but Inter is on nearly every app and AI-made site: it reads generic.'],
  ['4 · cinema mood', 'fraunces', 'manrope', 'A soft poster serif for titles (night-gold, Picture Palace feel) with a clean grotesque body.'],
  ['5', 'outfit', 'onest', 'Round geometric titles, a friendly modern body; both light and young.'],
  ['6', 'space-grotesk', 'dm-sans', 'Techy and crisp; common in start-up sites.'],
  ['7 · playful', 'unbounded', 'rubik', 'Wide bold titles, soft rounded body; the most playful, heaviest titles (46 KB cut).'],
  ['8', 'sora', 'instrument-sans', 'Calm and neat; Instrument Sans only goes 400–700.'],
  ['9 · setting: Readable', 'atkinson-hyperlegible-next', 'atkinson-hyperlegible-next', 'Made by the Braille Institute for low vision: every letter clearly different (Il1, O0).'],
  ['10 · setting: Rounded', 'nunito', 'nunito', 'Rounded ends, soft and friendly; a good "cosy" choice.'],
  ['11 · setting: Easy reading', 'lexend', 'lexend', 'Wide spacing designed to cut reading stress; liked by many dyslexic readers.'],
];
const SAMPLE = {
  en: ['Different screens,', 'same moment.', 'Watch a video with friends anywhere, in sync. Talk, see each other and play in the same room.', 'Alex joined · 3 watching · Add to queue · Join voice · Say something…'],
  tr: ['Ayrı ekranlar,', 'aynı an.', 'Arkadaşlarınla nerede olursanız olun aynı videoyu aynı anda izle. Aynı odada konuş, birbirinizi gör, oyna.', 'Alex katıldı · 3 kişi izliyor · Sıraya ekle · Sese katıl · Bir şey yaz…'],
};
const GLYPHS = 'ğĞ şŞ ıI iİ çÇ öÖ üÜ · 0123456789 · “Il1 O0” · ₺';
const lic = (n) => `https://fonts.google.com/specimen/${n.replaceAll(' ', '+')}/license`;
const kb = (f) => { try { return statSync(new URL(`files/${f}`, here)).size; } catch { return 0; } };
const faces = Object.keys(FONTS).map((id) => [
  `@font-face{font-family:'${id}';src:url('files/${id}-latin.woff2') format('woff2');font-weight:100 1000;font-display:block;unicode-range:U+0000-00FF,U+2000-206F,U+20AC,U+2122}`,
  kb(`${id}-latin-ext.woff2`) ? `@font-face{font-family:'${id}';src:url('files/${id}-latin-ext.woff2') format('woff2');font-weight:100 1000;font-display:block;unicode-range:U+0100-02AF,U+20A0-20C0,U+1E00-1EFF}` : '',
].join('\n')).join('\n');
const fontInfo = (id) => { const [n, axes, full, cut, lira] = FONTS[id]; return `<a href="${lic(n)}">${n}</a> <span class="meta">OFL 1.1 · variable wght ${axes} · ${full} KB latin + latin-ext · ≈ ${cut} KB Turkish cut${lira ? '' : ' · no ₺ glyph'}</span>`; };
const block = (h, b, lang) => {
  const [t1, t2, sub, ui] = SAMPLE[lang];
  return `<div class="sample" lang="${lang}"><div class="h" style="font-family:'${h}',system-ui">${t1}<br><em>${t2}</em></div>
<p class="sub" style="font-family:'${b}',system-ui">${sub}</p><p class="ui" style="font-family:'${b}',system-ui">${ui}</p></div>`;
};
const card = ([label, h, b, note]) => `<section class="card"><h2>${label}</h2>
<p class="fam">Titles: ${fontInfo(h)}${h === b ? '' : `<br>Body: ${fontInfo(b)}`}</p>
<p class="note">${note}</p>
<div class="pair">${block(h, b, 'en')}${block(h, b, 'tr')}</div>
<p class="glyphs" style="font-family:'${b}',system-ui">${GLYPHS} <b style="font-family:'${h}'">${GLYPHS}</b></p></section>`;
const today = `<section class="card"><h2>Today</h2><p class="fam">Titles: system font (the home asks for 'Bricolage Grotesque', but the @font-face is named 'Sidelit Wordmark', so it falls back); body: system-ui.</p>
<div class="pair"><div class="sample"><div class="h" style="font-family:system-ui">${SAMPLE.en[0]}<br><em>${SAMPLE.en[1]}</em></div><p class="sub" style="font-family:system-ui">${SAMPLE.en[2]}</p><p class="ui" style="font-family:system-ui">${SAMPLE.en[3]}</p></div>
<div class="sample"><div class="h" style="font-family:system-ui">${SAMPLE.tr[0]}<br><em>${SAMPLE.tr[1]}</em></div><p class="sub" style="font-family:system-ui">${SAMPLE.tr[2]}</p><p class="ui" style="font-family:system-ui">${SAMPLE.tr[3]}</p></div></div></section>`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sidelit font candidates (FONT1)</title><style>
${faces}
:root{--bg:#0b0d1f;--surface:#151a2e;--border:#2a3152;--text:#eceefa;--muted:#9aa0c2;--gold:#ffc65a;--link:#b7a6ff}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,sans-serif;padding:24px 16px}
main{max-width:1180px;margin:0 auto}h1{font-size:22px;margin:0 0 4px}.lead{color:var(--muted);margin:0 0 20px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px 20px;margin:0 0 16px}
.card h2{font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--gold);margin:0 0 6px}
.fam{margin:0}.fam a{color:var(--link);font-weight:600}.meta{color:var(--muted);font-size:13px}.note{color:var(--muted);margin:4px 0 12px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}@media (max-width:760px){.pair{grid-template-columns:1fr}}
.h{font-weight:800;font-size:40px;line-height:1.05}.h em{font-style:normal;color:var(--gold)}
.sub{font-size:17px;margin:10px 0 6px}.ui{font-size:14px;font-weight:500;color:var(--muted);margin:0}
.glyphs{font-size:18px;margin:12px 0 0;color:var(--muted)}.glyphs b{color:var(--text);font-weight:700;margin-left:12px}
</style></head><body><main><h1>Font candidates (FONT1)</h1>
<p class="lead">All SIL Open Font License 1.1, self-hosted woff2, variable. Each card: titles + body in English and Turkish, then the Turkish letters. Notes: fonts.md.</p>
${today}
${SETS.map(card).join('\n')}
</main></body></html>
`;
writeFileSync(new URL('index.html', here), html);
console.log('index.html');
