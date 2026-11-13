// PH1b mockups (Design, 13 Nov 2026): the phone room as an app-like screen, three options.
//   A = bottom tabs (Room · Search · Games · Me) + one input row   (recommended)
//   B = today's layout + one input row, ⋯ holds the rest
//   C = hybrid: one input row, Search and Me open as full pages from the strip (no permanent bar)
// Same tokens and proposal.css as mockups.mjs; 390 × 664 = an iPhone 13's room with Safari's bars showing.
//   NODE_PATH=$(npm root -g) node docs/internal/design/phone-room/app-mockups.mjs [out folder]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const here = (p) => new URL(p, import.meta.url);
const OUT = process.argv[2] || '/tmp/ph1b-mockups';
mkdirSync(OUT, { recursive: true });
const W = 390, H = 664;
const THEMES = {
  gece: { '--bg': '#0b0d1f', '--surface': '#151a2e', '--surface-2': '#1e2440', '--border': '#2a3152', '--field-border': 'color-mix(in srgb, #9aa0c2 60%, #151a2e)', '--text': '#eceefa', '--muted': '#9aa0c2', '--accent': '#8b6cff', '--accent-btn': '#6a4cf2', '--on-accent': '#ffffff', '--screen': '#000' },
  matinee: { '--bg': '#e8dfcf', '--surface': '#f1eadd', '--surface-2': '#e2d7c5', '--border': '#c9b99f', '--field-border': '#7d6c56', '--text': '#26201a', '--muted': '#564b3e', '--accent': '#9a3517', '--on-accent': '#ffffff', '--screen': '#231c16' },
  okyanus: { '--bg': '#051726', '--surface': '#0b2338', '--surface-2': '#123049', '--border': '#1c405e', '--field-border': 'color-mix(in srgb, #8db0c4 60%, #0b2338)', '--text': '#e6f4fb', '--muted': '#8db0c4', '--accent': '#2ec5e8', '--on-accent': '#032130', '--screen': '#000' },
};
const T = {
  en: {
    tabs: [['🎬', 'Room'], ['🔍', 'Search'], ['🎮', 'Games'], ['👤', 'Me']],
    say: 'Say something…', typed: 'Starting in 5!',
    feed: [['sys', 'Alex', 'opened the room 🎉'], ['sys', 'Sam', 'joined'], ['msg', 'Sam', 'This one? 🍿'], ['sys', 'Alex', 'started “Weekend trip.webm”'], ['me', 'Alex', 'Yes, go!']],
    now: 'Weekend trip.webm', searchPh: 'Search YouTube or paste a link',
    results: [['Night train timelapse', 'Rail Views · 12:04'], ['City lights from above', 'Sky Cam · 8:31'], ['Rainy café ambience', 'Slow Rooms · 1:02:10'], ['Ocean waves 4K', 'Blue Hour · 30:00']],
    upNext: 'Up next', auto: 'Play the next video automatically', add: 'Add', play: 'Play',
    games: [['🎲', 'Classics', 'Board games for 2–4'], ['🚢', 'Sea Battle', '2 players'], ['✏️', 'Draw & Guess', '3+ players'], ['❓', 'Quiz', 'Everyone'], ['❤️', 'Last Heart', '2–6 players']],
    side: 'Side games · just you', sideList: 'Snack Bar · Window Garden · Five Frames',
    name: 'Alex', thisRoom: 'Room', save: 'Save the room', saveD: 'Saved rooms keep their link and queue', rules: 'Room rules', rulesD: 'The room host Alex sets these rules.',
    view: 'My screen', fly: 'Flying emojis', flyD: 'Reactions rise from the bottom of the video', theme: 'Theme', themeV: 'Night',
    sound: 'Sound & camera', ask: 'Check before joining voice', askD: 'Shows your microphone and camera before you join', about: 'About', help: 'Help',
    people: 'People', peopleRows: [['🧑', 'Alex', '👑 host'], ['👩', 'Sam', '🎙']], invite: 'Invite',
    moreRows: [['👥', 'People', '2'], ['🎮', 'Games'], ['💾', 'Save the room'], ['⚙️', 'Settings'], ['❓', 'Help']],
    back: 'Back to the room', search: 'Search',
    react: 'Reactions', image: 'Send an image', emoji: ['😂', '😍', '🔥', '👏', '😱', '😢', '🍿', '🎉'],
  },
  tr: {
    tabs: [['🎬', 'Oda'], ['🔍', 'Ara'], ['🎮', 'Oyunlar'], ['👤', 'Ben']],
    say: 'Bir şey yaz…', typed: '5 saniyeye başlıyor!',
    feed: [['sys', 'Alex', 'odayı açtı 🎉'], ['sys', 'Sam', 'katıldı'], ['msg', 'Sam', 'Bu mu? 🍿'], ['sys', 'Alex', '“Hafta sonu gezisi.webm” başlattı'], ['me', 'Alex', 'Evet, başlat!']],
    now: 'Hafta sonu gezisi.webm', searchPh: "YouTube'da ara ya da link yapıştır",
    results: [['Gece treni hızlandırılmış', 'Rail Views · 12:04'], ['Yukarıdan şehir ışıkları', 'Sky Cam · 8:31'], ['Yağmurlu kafe sesi', 'Slow Rooms · 1:02:10'], ['Okyanus dalgaları 4K', 'Blue Hour · 30:00']],
    upNext: 'Sırada', auto: 'Sıradaki video kendiliğinden başlasın', add: 'Ekle', play: 'Oynat',
    games: [['🎲', 'Klasikler', '2–4 kişilik masa oyunları'], ['🚢', 'Amiral Battı', '2 oyuncu'], ['✏️', 'Çiz ve Bil', '3+ oyuncu'], ['❓', 'Bilgi Yarışması', 'Herkes'], ['❤️', 'Son Kalp', '2–6 oyuncu']],
    side: 'Yan oyunlar · sadece sen', sideList: 'Atıştırmalık Büfe · Pencere Bahçesi · Beş Kare',
    name: 'Alex', thisRoom: 'Oda', save: 'Odayı kaydet', saveD: 'Kayıtlı odalar linkini ve sırasını korur', rules: 'Oda kuralları', rulesD: 'Bu kuralları oda yöneticisi Alex belirliyor.',
    view: 'Ekranım', fly: 'Uçuşan emojiler', flyD: 'Tepkiler videonun altından yükselir', theme: 'Tema', themeV: 'Matine',
    sound: 'Ses ve kamera', ask: 'Sese katılmadan önce kontrol et', askD: 'Katılmadan önce mikrofonunu ve kameranı gösterir', about: 'Hakkında', help: 'Yardım',
    people: 'Kişiler', peopleRows: [['🧑', 'Alex', '👑 yönetici'], ['👩', 'Sam', '🎙']], invite: 'Davet et',
    moreRows: [['👥', 'Kişiler', '2'], ['🎮', 'Oyunlar'], ['💾', 'Odayı kaydet'], ['⚙️', 'Ayarlar'], ['❓', 'Yardım']],
    back: 'Odaya dön', search: 'Ara',
    react: 'Tepki', image: 'Resim gönder', emoji: ['😂', '😍', '🔥', '👏', '😱', '😢', '🍿', '🎉'],
  },
};
const css = readFileSync(here('./proposal.css'), 'utf8');
const base = `*{box-sizing:border-box}body{margin:0;font:15px/1.4 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
.phone{position:relative;width:${W}px;height:${H}px;overflow:hidden;background:var(--bg);color:var(--text);display:flex;flex-direction:column}
.phone.short{height:${H}px}
input{font:inherit;color:var(--text);background:var(--surface-2);border:1px solid var(--field-border);outline:none}
input::placeholder{color:var(--muted)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 16px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font:inherit;font-weight:600}
.btn.primary{background:var(--accent-btn,var(--accent));border-color:var(--accent-btn,var(--accent));color:var(--on-accent)}
.video{flex:0 0 auto;width:100%;aspect-ratio:16/9;background:linear-gradient(135deg,#d9603b,#6b3fa0 60%,#1d2e6b)}
.video.tall{flex:1 1 auto;aspect-ratio:auto;display:grid;place-items:center;background:var(--screen)}
.video.tall i{display:block;height:100%;aspect-ratio:9/16;background:linear-gradient(170deg,#2f9a8a,#1d3e6b 70%,#1a1a3a)}
/* the strip under the video: faces on the left, the video's own controls on the right */
.together-strip{display:flex;align-items:center;gap:6px;padding:6px 8px;border-bottom:1px solid var(--border);background:var(--surface)}
.faces{flex:1;display:flex;align-items:center;min-width:0;min-height:44px;background:none;border:0;color:var(--muted);font:inherit;font-size:13px;gap:8px;padding:0 4px;border-radius:10px}
.faces span.av{width:32px;height:32px;border-radius:50%;background:#f0b86a;display:grid;place-items:center;font-size:17px;border:2px solid var(--surface)}
.faces span.av+span.av{margin-left:-14px;background:#7ab8f0}
.now{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px;color:var(--muted)}
.feed{flex:1;min-height:0;padding:10px 12px;display:flex;flex-direction:column;gap:6px;justify-content:flex-end;overflow:hidden}
.sys{font-size:13px;color:var(--muted);font-style:italic;display:flex;gap:6px;align-items:center}
.sys b{font-style:normal;color:var(--text);font-weight:600}
.mini{width:22px;height:22px;border-radius:50%;background:#f0b86a;display:inline-grid;place-items:center;font-size:12px;font-style:normal;flex:0 0 auto}
.mini.b{background:#7ab8f0}
.msg{display:flex;gap:8px;align-items:flex-end}.bubble{padding:7px 12px;border-radius:12px;background:var(--surface-2);max-width:78%}
.msg.me{flex-direction:row-reverse}.msg.me .bubble{background:var(--accent-btn,var(--accent));color:var(--on-accent)}
/* the bottom tabs: the computer's .tab look, the line on top because the bar sits at the bottom */
.tabbar{display:flex;border-top:1px solid var(--border);background:var(--surface);padding-bottom:4px}
.tabbar .tab{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;min-height:52px;background:transparent;border:0;border-top:2px solid transparent;color:var(--muted);font:inherit;font-size:12px;font-weight:600}
.tabbar .tab i{font-style:normal;font-size:20px;line-height:1.1}
.tabbar .tab[aria-selected=true]{color:var(--text);border-top-color:var(--accent)}
.page{flex:1;min-height:0;overflow:hidden;padding:12px}
.page-head{display:flex;align-items:center;gap:8px;min-height:52px;padding:0 8px;border-bottom:1px solid var(--border);background:var(--surface);font-weight:700}
.field{display:flex;gap:6px}.field input{flex:1;min-width:0;height:44px;border-radius:12px;padding:0 12px}
.res{display:flex;gap:10px;align-items:center;padding:6px 0}
.thumb{flex:0 0 112px;height:63px;border-radius:10px;background:linear-gradient(135deg,#3a4a8a,#8a4a6a)}
.res:nth-child(2n) .thumb{background:linear-gradient(135deg,#d0803a,#5a3a8a)}
.res:nth-child(3n) .thumb{background:linear-gradient(135deg,#3a8a7a,#2a3a5a)}
.res .t{flex:1;min-width:0}.res .t b{display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.res .t span{font-size:12px;color:var(--muted)}
.res .btn{min-width:44px;padding:0 10px}
.label{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin:14px 4px 6px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:2px 12px}
.item{display:flex;align-items:center;gap:12px;min-height:52px;padding:6px 0}
.item+.item{border-top:1px solid var(--border)}
.item .t{flex:1;min-width:0}.item .t b{display:block;font-weight:600;font-size:15px}.item .t span{display:block;font-size:12.5px;color:var(--muted);line-height:1.3}
.item .v{color:var(--muted);font-size:14px}
.ico{font-size:22px;width:28px;text-align:center}
.sw{flex:0 0 auto;width:44px;height:26px;border-radius:13px;background:var(--accent-btn,var(--accent));position:relative}.sw::after{content:'';position:absolute;right:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff}
.sw.off{background:var(--surface-2);border:1px solid var(--field-border)}.sw.off::after{right:auto;left:2px;top:2px;background:var(--muted)}
.me-head{display:flex;align-items:center;gap:14px;padding:4px 4px 2px}
.big{width:72px;height:72px;border-radius:50%;background:#f0b86a;display:grid;place-items:center;font-size:40px;position:relative}
.pen{position:absolute;right:-4px;bottom:-4px;width:28px;height:28px;border-radius:50%;background:var(--surface-2);border:1px solid var(--border);display:grid;place-items:center;font-size:13px}
.me-head .nm{font-size:20px;font-weight:700;display:flex;align-items:center;gap:8px}.me-head .nm small{font-size:14px;color:var(--muted)}
.emoji-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:2px;padding:6px}
.emoji-grid button{min-height:44px;font-size:24px;background:none;border:0;border-radius:10px}
.ph-sheet,.ph-backdrop{position:absolute}
`;
const tabbar = (t, sel) => `<nav class="tabbar">${t.tabs.map(([i, l], n) => `<button class="tab" aria-selected="${n === sel}"><i>${i}</i>${l}</button>`).join('')}</nav>`;
const feed = (t) => `<div class="feed">${t.feed.map(([k, who, txt]) => k === 'sys' ? `<div class="sys"><span class="mini${who === 'Sam' ? ' b' : ''}">${who === 'Sam' ? '👩' : '🧑'}</span><span><b>${who}</b> ${txt}</span></div>` : `<div class="msg${k === 'me' ? ' me' : ''}"><span class="bubble">${txt}</span></div>`).join('')}</div>`;
const faces = (t) => `<button class="faces"><span class="av">🧑</span><span class="av">👩</span>2</button>`;
// One input row: 🔗 invite · box · 🎙 · 📷 · 😀; typing turns 🎙 📷 into ➤ (CSS only, like PH1's swap).
const inputRow = (t, typing, lead = '🔗') => `<form class="chat-form" onsubmit="return false"><button type="button" class="chat-tool">${lead}</button><input id="chat-input" placeholder="${t.say}" value="${typing ? t.typed : ''}">${typing ? '<button class="chat-send">➤</button>' : '<button type="button" class="chat-tool">🎙</button><button type="button" class="chat-tool">📷</button>'}<button type="button" class="chat-tool">😀</button></form>`;
const playStrip = (t, extra = '') => `<div class="together-strip">${faces(t)}<button class="cam-ctl">📌</button><button class="cam-ctl">⏩</button><button class="cam-ctl">🔄</button><button class="cam-ctl">⏭</button>${extra}</div>`;
const sheet = (title, body) => `<div class="ph-backdrop"></div><div class="ph-sheet"><div class="ph-sheet-head"><h3>${title}</h3><button class="btn ph-sheet-close">✕</button></div><div class="ph-sheet-body">${body}</div></div>`;
const rows = (list) => list.map(([i, l, e]) => `<button class="ph-row"><span class="ph-row-ico">${i}</span>${l}${e ? `<span class="ph-row-end">${e}</span>` : ''}</button>`).join('');
const searchBody = (t) => `<div class="field"><input placeholder="${t.searchPh}" value="night"></div>${t.results.map(([a, b], i) => `<div class="res"><span class="thumb"></span><span class="t"><b>${a}</b><span>${b}</span></span><button class="btn" aria-label="${t.add}">＋</button></div>`).join('')}<div class="label">${t.upNext} · 1</div><div class="res"><span class="thumb"></span><span class="t"><b>${t.now}</b><span>▶</span></span></div>`;
const gamesBody = (t) => `<div class="card">${t.games.map(([i, a, b]) => `<div class="item"><span class="ico">${i}</span><span class="t"><b>${a}</b><span>${b}</span></span><span class="v">›</span></div>`).join('')}</div><div class="label">${t.side}</div><div class="card"><div class="item"><span class="ico">🍿</span><span class="t"><span>${t.sideList}</span></span><span class="v">›</span></div></div>`;
const meBody = (t) => `<div class="me-head"><span class="big">🧑<span class="pen">✎</span></span><span class="nm">${t.name} <small>✎</small></span></div>
<div class="label">${t.thisRoom}</div><div class="card"><div class="item"><span class="t"><b>${t.save}</b><span>${t.saveD}</span></span><span class="sw"></span></div><div class="item"><span class="t"><b>${t.rules}</b><span>${t.rulesD}</span></span><span class="v">›</span></div></div>
<div class="label">${t.view}</div><div class="card"><div class="item"><span class="t"><b>${t.fly}</b><span>${t.flyD}</span></span><span class="sw"></span></div><div class="item"><span class="t"><b>${t.theme}</b></span><span class="v">${t.themeV} ›</span></div></div>
<div class="label">${t.sound}</div><div class="card"><div class="item"><span class="t"><b>${t.ask}</b><span>${t.askD}</span></span><span class="sw off"></span></div></div>`;
const S = {
  // A: bottom tabs
  'a-room': (t) => `<div class="video"></div>${playStrip(t)}${feed(t)}${inputRow(t, false)}${tabbar(t, 0)}`,
  'a-typing': (t) => `<div class="video"></div>${playStrip(t)}${feed(t)}${inputRow(t, true)}${tabbar(t, 0)}`,
  'a-react': (t) => `<div class="video"></div>${playStrip(t)}${feed(t)}${inputRow(t, false)}${tabbar(t, 0)}${sheet(t.react, `<div class="emoji-grid">${t.emoji.map((e) => `<button>${e}</button>`).join('')}</div>${rows([['🖼', t.image]])}`)}`,
  'a-people': (t) => `<div class="video"></div>${playStrip(t)}${feed(t)}${inputRow(t, false)}${tabbar(t, 0)}${sheet(`${t.people} · 2`, rows(t.peopleRows) + rows([['🔗', t.invite]]))}`,
  'a-search': (t) => `<div class="page">${searchBody(t)}</div>${tabbar(t, 1)}`,
  'a-games': (t) => `<div class="page">${gamesBody(t)}</div>${tabbar(t, 2)}`,
  'a-me': (t) => `<div class="page">${meBody(t)}</div>${tabbar(t, 3)}`,
  'a-shorts': (t) => `<div class="video tall"><i></i></div>${playStrip(t, '<button class="cam-ctl">💬</button>')}${inputRow(t, false)}${tabbar(t, 0)}`,
  // B: today's layout, one input row, ⋯ for the rest
  'b-room': (t) => `<div class="video"></div>${playStrip(t, '<button class="strip-more">⋯</button>')}${feed(t)}${inputRow(t, false)}`,
  'b-more': (t) => `<div class="video"></div>${playStrip(t, '<button class="strip-more">⋯</button>')}${feed(t)}${inputRow(t, false)}${sheet(t.now, rows([['🔍', t.search]]) + rows(t.moreRows))}`,
  // C: hybrid, 🔍 and 👤 in the strip open full pages with a back arrow
  'c-room': (t) => `<div class="video"></div><div class="together-strip">${faces(t)}<button class="cam-ctl">🔍</button><button class="cam-ctl">🎮</button><button class="cam-ctl">👤</button><button class="strip-more">⋯</button></div>${feed(t)}${inputRow(t, false)}`,
  'c-search': (t) => `<div class="page-head"><button class="btn ph-sheet-close">←</button>${t.search}</div><div class="page">${searchBody(t)}</div>`,
};
const frame = (theme, lang, name) => `<div class="phone" data-theme="${theme}" style="${Object.entries(THEMES[theme]).map(([k, v]) => `${k}:${v}`).join(';')}">${S[name](T[lang])}</div>`;
const page = (body) => `<!doctype html><html class="ph-room" lang="en"><head><meta charset="utf-8"><title>PH1b app-like phone room</title><style>${css}\n${base}</style></head><body>${body}</body></html>`;
const ALL = [];
for (const name of Object.keys(S)) ALL.push(['gece', 'en', name]);
for (const name of Object.keys(S).filter((n) => n.startsWith('a-'))) ALL.push(['matinee', 'tr', name], ['okyanus', 'en', name]);
writeFileSync(here('./app-mockups.html'), page(`<div style="display:flex;flex-wrap:wrap;gap:16px;padding:16px;background:#333">${ALL.map(([th, l, n]) => `<figure style="margin:0"><figcaption style="color:#ddd;font:12px system-ui;margin:0 0 4px">${th} · ${l} · ${n}</figcaption>${frame(th, l, n)}</figure>`).join('')}</div>`));
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 2, viewport: { width: W, height: H } });
for (const [th, l, n] of ALL) { await p.setContent(page(frame(th, l, n))); await p.screenshot({ path: `${OUT}/${th}-${l}-${n}.png` }); }
await b.close();
console.log('✓ app-mockups.html +', ALL.length, 'PNGs in', OUT);
