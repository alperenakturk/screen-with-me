// PH1 mockups (Design, 13 Nov 2026): the proposed phone room, drawn with proposal.css and the real theme tokens, at an
// iPhone 13's 390 × 844 (and 844 × 390 sideways). Writes mockups.html (all screens) and, with Playwright, PNGs:
//   NODE_PATH=$(npm root -g) node docs/internal/design/phone-room/mockups.mjs [out folder]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const here = (p) => new URL(p, import.meta.url);
const OUT = process.argv[2] || '/tmp/ph1-mockups';
mkdirSync(OUT, { recursive: true });
const THEMES = {
  gece: { '--bg': '#0b0d1f', '--surface': '#151a2e', '--surface-2': '#1e2440', '--border': '#2a3152', '--field-border': 'color-mix(in srgb, #9aa0c2 60%, #151a2e)', '--text': '#eceefa', '--muted': '#9aa0c2', '--accent': '#8b6cff', '--accent-btn': '#6a4cf2', '--on-accent': '#ffffff', '--screen': '#000', '--screen-lit': '#000' },
  matinee: { '--bg': '#e8dfcf', '--surface': '#f1eadd', '--surface-2': '#e2d7c5', '--border': '#c9b99f', '--field-border': '#7d6c56', '--text': '#26201a', '--muted': '#564b3e', '--accent': '#9a3517', '--on-accent': '#ffffff', '--screen': '#231c16', '--screen-lit': '#43382c' },
  okyanus: { '--bg': '#051726', '--surface': '#0b2338', '--surface-2': '#123049', '--border': '#1c405e', '--field-border': 'color-mix(in srgb, #8db0c4 60%, #0b2338)', '--text': '#e6f4fb', '--muted': '#8db0c4', '--accent': '#2ec5e8', '--on-accent': '#032130', '--screen': '#000', '--screen-lit': '#000' },
};
const T = {
  en: { playing: 'Weekend trip.webm', say: 'Say something…', typed: 'Starting in 5!', noVideo: 'No video yet', search: 'Search a video', invite: 'Invite', more: 'Snug Veranda', people1: '1 person', rows: [['🔗', 'Invite'], ['👥', 'People', '2'], ['🎮', 'Games'], ['💾', 'Save the room'], ['👤', 'Profile'], ['⚙️', 'Settings'], ['❓', 'Help']], plus: [['📌', 'Pin'], ['⏩', 'Speed', '1×'], ['🔄', 'Sync'], ['⏭', 'Skip']], addTitle: 'Add a video', addPh: 'Search YouTube or paste a link', addQ: 'Add to queue', playNow: 'Play now', queue: 'Queue', auto: 'Play the next video automatically', qEmpty: 'The queue is empty. Paste a link and press "Add to queue".', full: 'Watch fullscreen', upright: 'or hold the phone upright', chat: [['Sam', 'This one? 🍿'], ['Alex', 'Yes, go!']] },
  tr: { playing: 'Hafta sonu gezisi.webm', say: 'Bir şey yaz…', typed: '5 saniyeye başlıyor!', noVideo: 'Henüz video yok', search: 'Video ara', invite: 'Davet et', more: 'Alacakaranlık Avlu', people1: '1 kişi', rows: [['🔗', 'Davet et'], ['👥', 'Kişiler', '2'], ['🎮', 'Oyunlar'], ['💾', 'Odayı kaydet'], ['👤', 'Profil'], ['⚙️', 'Ayarlar'], ['❓', 'Yardım']], plus: [['📌', 'Pin'], ['⏩', 'Hız', '1×'], ['🔄', 'Eşitle'], ['⏭', 'Geç']], addTitle: 'Video ekle', addPh: "YouTube'da ara ya da link yapıştır", addQ: 'Sıraya ekle', playNow: 'Hemen oynat', queue: 'Sıra', auto: 'Sıradaki video kendiliğinden başlasın', qEmpty: 'Sıra boş. Bir link yapıştırıp "Sıraya ekle"ye bas.', full: 'Tam ekran izle', upright: 'ya da telefonu dik tut', chat: [['Sam', 'Bu mu? 🍿'], ['Alex', 'Evet, başlat!']] },
};
const css = readFileSync(here('./proposal.css'), 'utf8');
const base = `.phone[data-theme=matinee] .empty{--text:#f1e8d8;--surface-2:#3a3128;--border:#54483a;color:var(--text)}
*{box-sizing:border-box}body{margin:0;font:15px/1.4 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
.phone{position:relative;width:390px;height:844px;overflow:hidden;background:var(--bg);color:var(--text);display:flex;flex-direction:column}
.phone.side{width:844px;height:390px;flex-direction:row}
input{font:inherit;color:var(--text);background:var(--surface-2);border:1px solid var(--field-border);outline:none}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px;border-radius:10px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);font:inherit;font-weight:600}
.btn.primary{background:var(--accent-btn,var(--accent));border-color:var(--accent-btn,var(--accent));color:var(--on-accent)}
.video{flex:0 0 auto;width:100%;aspect-ratio:16/9;background:linear-gradient(135deg,#d9603b,#6b3fa0 60%,#1d2e6b);position:relative}
.video.empty-v{background:radial-gradient(ellipse 70% 75% at 50% 42%,var(--screen-lit),var(--screen) 80%)}
.together-strip{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--border);background:var(--surface)}
.voice-people{flex:1;display:flex;gap:6px}.voice-avatar{width:38px;height:38px;border-radius:50%;background:#f0b86a;display:grid;place-items:center;font-size:20px}
.voice-avatar.b{background:#7ab8f0}
.chat{flex:1;padding:12px;display:flex;flex-direction:column;gap:8px;justify-content:flex-end}
.msg{display:flex;gap:8px;align-items:flex-end}.msg b{font-size:13px;color:var(--muted)}.bubble{padding:8px 12px;border-radius:12px;background:var(--surface-2);max-width:82%}
.msg.me{flex-direction:row-reverse}.msg.me .bubble{background:var(--accent-btn,var(--accent));color:var(--on-accent)}
.room{display:contents}.empty{position:absolute;inset:0}
.empty h2{margin:0;font-size:16px}
.chat-form #chat-input::placeholder{color:var(--muted)}
.side-col{flex:0 0 200px;display:grid;place-content:center;justify-items:center;gap:12px;padding:12px;background:var(--bg)}
.side-col .btn{white-space:nowrap}
.side-col .muted{color:var(--muted);font-size:13px}
.label{font-size:13px;font-weight:700;color:var(--muted);margin:10px 6px 4px}
.toggle-row{display:flex;align-items:center;gap:10px;justify-content:space-between;min-height:44px;padding:0 6px;font-size:14px}
.sw{width:42px;height:24px;border-radius:12px;background:var(--accent-btn,var(--accent));position:relative}.sw::after{content:'';position:absolute;right:3px;top:3px;width:18px;height:18px;border-radius:50%;background:#fff}
.note{color:var(--muted);font-size:13px;padding:0 6px}
.addrow{display:flex;gap:6px;margin:8px 6px}.addrow input{flex:1;min-width:0;height:44px;border-radius:12px;padding:0 12px}
.addbtns{display:grid;grid-template-columns:44px 1fr 1fr;gap:6px;margin:0 6px}
.dot{width:9px;height:9px;border-radius:50%;background:#3ccf8e;display:inline-block;margin-right:8px}
.sheet-sub{color:var(--muted);font-weight:400}
`;
const room = (t, { typing = false, empty = false } = {}) => `
<div class="video${empty ? ' empty-v' : ''}">${empty ? `<div class="room"><div class="empty"><h2>${t.noVideo}</h2><div class="ph-empty-actions"><button class="btn primary">🔍 ${t.search}</button><button class="btn">🔗 ${t.invite}</button></div></div></div>` : ''}</div>
<div class="together-strip"><div class="voice-people"><span class="voice-avatar">🧑</span><span class="voice-avatar b">👩</span></div><button class="cam-ctl">🎙</button><button class="cam-ctl">📷</button>${empty ? '' : '<button class="strip-fs">⛶</button>'}<button class="strip-more">⋯</button></div>
<div class="chat">${empty ? '' : t.chat.map(([n, m], i) => `<div class="msg${i ? ' me' : ''}"><span class="bubble">${m}</span></div>`).join('')}</div>
<form class="chat-form" onsubmit="return false"><button type="button" class="chat-tool">😀</button><input id="chat-input" placeholder="${t.say}" value="${typing ? t.typed : ''}"><button type="button" class="chat-attach">🖼</button><button type="button" class="chat-tool" id="chat-search">🔍</button><button type="button" class="chat-tool" id="chat-plus">＋</button><button class="chat-send">➤</button></form>`;
const sheet = (title, body, sub = '') => `<div class="ph-backdrop"></div><div class="ph-sheet"><div class="ph-sheet-head"><h3>${title}${sub}</h3><button class="btn ph-sheet-close">✕</button></div><div class="ph-sheet-body">${body}</div></div>`;
const rows = (list) => list.map(([i, l, e]) => `<button class="ph-row"><span class="ph-row-ico">${i}</span>${l}${e ? `<span class="ph-row-end">${e}</span>` : ''}</button>`).join('');
const SCREENS = {
  room: (t) => room(t),
  typing: (t) => room(t, { typing: true }),
  empty: (t) => room(t, { empty: true }),
  more: (t) => room(t) + sheet(`<span class="dot"></span>${t.more}`, rows(t.rows), ` <span class="sheet-sub">· ${t.people1}</span>`),
  plus: (t) => room(t) + sheet(`▶ ${t.playing}`, rows(t.plus)),
  search: (t) => room(t) + sheet(t.addTitle, `<div class="addrow"><input placeholder="${t.addPh}"></div><div class="addbtns"><button class="btn">🔍</button><button class="btn primary">${t.addQ}</button><button class="btn">${t.playNow}</button></div><div class="label">${t.queue}</div><div class="toggle-row">${t.auto}<span class="sw"></span></div><p class="note">${t.qEmpty}</p>`),
  sideways: (t) => `<div class="video" style="flex:1 1 auto;width:auto;height:auto;align-self:center;aspect-ratio:16/9"></div><div class="side-col"><button class="btn primary">⛶ ${t.full}</button><div class="ph-side-actions"><button class="chat-tool">💬</button><button class="chat-tool">🎙</button></div><span class="muted">${t.upright}</span></div>`,
};
const frame = (theme, lang, name) => `<div class="phone${name === 'sideways' ? ' side' : ''}" data-theme="${theme}" style="${Object.entries(THEMES[theme]).map(([k, v]) => `${k}:${v}`).join(';')}">${SCREENS[name](T[lang])}</div>`;
// The proposal's selectors start with html.ph-room / html.sideways: the mockup page carries those classes.
const page = (body) => `<!doctype html><html class="ph-room sideways" lang="en"><head><meta charset="utf-8"><title>PH1 phone room mockups</title><style>${base}\n${css}\n.ph-sheet,.ph-backdrop{position:absolute}</style></head><body>${body}</body></html>`;
const ALL = [];
for (const theme of Object.keys(THEMES)) for (const lang of ['en', 'tr']) for (const name of Object.keys(SCREENS)) ALL.push([theme, lang, name]);
writeFileSync(here('./mockups.html'), page(`<div style="display:flex;flex-wrap:wrap;gap:16px;padding:16px;background:#333">${ALL.filter(([th, l]) => l === 'en' || th === 'gece').map(([th, l, n]) => `<figure style="margin:0"><figcaption style="color:#ddd;font:12px system-ui;margin:0 0 4px">${th} · ${l} · ${n}</figcaption>${frame(th, l, n)}</figure>`).join('')}</div>`));
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 2 });
for (const [th, l, n] of ALL) {
  const side = n === 'sideways';
  await p.setViewportSize(side ? { width: 844, height: 390 } : { width: 390, height: 844 });
  await p.setContent(page(frame(th, l, n)));
  await p.screenshot({ path: `${OUT}/${th}-${l}-${n}.png` });
}
await b.close();
console.log('✓ mockups.html +', ALL.length, 'PNGs in', OUT);
