// Film sayfasında oda görünümü (kabuk) uçtan uca testi: gerçek Chrome + eklenti + sahte ikinci kullanıcı.
//
//   npm run build:extension:dev
//   npm run dev                                   (sunucu 8787 + site 5173)
//   node scripts/harness/embed/film-server.mjs    (sahte video sitesi 5299/5300)
//   node scripts/harness/embed/run.mjs [eklenti-klasörü] [site] [sunucu-ws] [çıktı-öneki]
//
// Akış: Sam sitedeki odada bir film sayfası açar → sekme film sayfasına gider → eklenti sitenin
// oda sayfasını katman olarak açar → video bulununca katmanda delik açılır, video oraya oturur.
// Film sayfası 127.0.0.1'de (site localhost'ta): farklı site, yani gerçek hayattaki gibi.
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { decodePng, launch } from './cdp.mjs';

const EXT = resolve(process.argv[2] ?? 'apps/extension/dist');
const SITE = process.argv[3] ?? 'http://localhost:5173';
const WS = process.argv[4] ?? 'ws://localhost:8787';
const OUT = process.argv[5] ?? resolve('shell-test');
const FILM = 'http://127.0.0.1:5299';

let failed = 0;
const check = (ok, text, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}${!ok && detail ? ` → ${detail}` : ''}`);
};
const near = (a, b, tolerance = 1.5) => typeof a === 'number' && Math.abs(a - b) <= tolerance;

// ---- Piksel yardımcıları (saydamlık testleri) ----
/** Katmanın clip-path yolundaki dikdörtgenler: [0] ekran, [1] delik, [2..] adacıklar. */
const clipRects = (clip) =>
  [...String(clip).matchAll(/M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*H\s*(-?[\d.]+)\s*V\s*(-?[\d.]+)/g)].map((m) => ({ x: +m[1], y: +m[2], r: +m[3], b: +m[4] }));
const inRect = (p, r, pad = 0) => p.x >= r.x + pad && p.x <= r.r - pad && p.y >= r.y + pad && p.y <= r.b - pad;
const pxDiff = (p, q) => Math.max(...p.map((v, i) => Math.abs(v - q[i])));
/** Chrome'un opak koyu zemini (#121212 civarı): düz, koyu gri. */
const flatDark = ([r, g, b]) => Math.max(r, g, b) <= 32 && Math.max(r, g, b) - Math.min(r, g, b) <= 6;
const bright = ([r, g, b]) => r + g + b > 150;
/** Bölgedeki ızgara noktaları (adım `step`), `avoid` dikdörtgenleri (+pay) hariç. */
function gridPoints(region, avoid = [], step = 6, pad = 12) {
  const points = [];
  for (let y = Math.ceil(region.y) + 2; y < region.b - 2; y += step) {
    for (let x = Math.ceil(region.x) + 2; x < region.r - 2; x += step) {
      if (!avoid.some((r) => inRect({ x, y }, { x: r.x - pad, y: r.y - pad, r: r.r + pad, b: r.b + pad }))) points.push({ x, y });
    }
  }
  return points;
}

/** Film sayfasında örtünün (data-swm-cover) ne zaman eklenip kalktığını kaydeder (sayfanın en başında çalışır). */
const COVER_SCRIPT = `(() => {
  if (window !== top) return;
  const log = { atStart: !!document.querySelector('[data-swm-cover]'), added: null, removed: null, shellAt: null, clipAt: null, events: [] };
  const ev = (what) => log.events.length < 60 && log.events.push(Math.round(performance.now()) + ' ' + what);
  // Odak modu (html.swm-focus) ve işaretli oynatıcı ne zaman açılıp kapanıyor: flaşın nedenini görmek için.
  let focused = false;
  window.__swmCover = log;
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'attributes') {
        if (m.attributeName === 'class' && m.target === document.documentElement) {
          const now = m.target.classList.contains('swm-focus');
          if (now !== focused) ev(now ? 'focus+' : 'focus-');
          focused = now;
        } else if (m.attributeName === 'data-swm-focus') ev('mark ' + (m.target.hasAttribute('data-swm-focus') ? '+' : '-') + m.target.tagName + '#' + m.target.id);
        continue;
      }
      for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        if (n.hasAttribute('data-swm-cover') && log.added === null) log.added = performance.now();
        if (n.tagName === 'IFRAME' && String(n.src).startsWith('chrome-extension://') && log.shellAt === null) log.shellAt = performance.now();
      }
      for (const n of m.removedNodes) if (n.nodeType === 1 && n.hasAttribute('data-swm-cover')) log.removed = performance.now();
    }
  }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-swm-focus', 'class'] });
  let lastClip = '';
  const timer = setInterval(() => {
    const s = document.querySelector('iframe[src^="chrome-extension://"]');
    const clip = s ? s.style.clipPath : '';
    if (clip !== lastClip) { ev('clip ' + (clip ? clip.slice(17, 60) : 'none') + ' h=' + (s ? s.style.height : '')); lastClip = clip; }
    if (s && s.style.clipPath && log.clipAt === null) log.clipAt = performance.now();
    if (performance.now() > 4000) clearInterval(timer);
  }, 5);
})();`;

/** Sahte ikinci kullanıcı (gerçek sunucuya WebSocket ile bağlanır). */
async function fakeUser(room, name) {
  const ws = new WebSocket(`${WS}/api/rooms/${room}/ws`);
  const inbox = [];
  let state = null;
  let members = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'welcome' || m.t === 'state') state = m.state;
    if (m.t === 'welcome' || m.t === 'members') members = m.members;
  });
  await new Promise((r) => ws.addEventListener('open', r));
  ws.send(JSON.stringify({ t: 'hello', v: 3, name }));
  const wait = async (pred, ms = 8000) => {
    for (let t = 0; t < ms; t += 100) {
      const found = inbox.find(pred);
      if (found) return found;
      await new Promise((r) => setTimeout(r, 100));
    }
    return null;
  };
  await wait((m) => m.t === 'welcome');
  return {
    send: (m) => ws.send(JSON.stringify(m)),
    wait,
    count: (pred) => inbox.filter(pred).length,
    clear: () => inbox.splice(0),
    get state() {
      return state;
    },
    get members() {
      return members;
    },
    close: () => ws.close(),
  };
}

/** `fn` doğru dönene kadar bekler (en fazla `ms`). */
async function until(fn, ms = 10000) {
  for (let t = 0; t < ms; t += 250) {
    const value = await fn();
    if (value) return value;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

const room = 'shl' + Math.random().toString(36).slice(2, 7);
// Card 2b: with a display (`xvfb-run -a node scripts/harness/embed/run.mjs`) Chrome runs headful and the real mouse
// opens and closes the film page's rail; headless Chrome routes mouse events wrongly between the film page and our overlay
// (it even reports moves on the film while the mouse is on the overlay), so there the rail is pinned out and only the
// open / close checks are skipped.
const HEADFUL = !!process.env.DISPLAY;
const a = await launch({ ext: EXT, out: OUT, headless: !HEADFUL });
check(!a.loaded.error, 'eklenti yüklendi', JSON.stringify(a.loaded.error));
await a.cdp('Page.addScriptToEvaluateOnNewDocument', { source: COVER_SCRIPT });
const coverLog = () =>
  a.evaluate(
    `(() => { const l = window.__swmCover; if (!l) return null; return { ...l, firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime ?? null, now: !!document.querySelector('[data-swm-cover]') }; })()`,
  );
/**
 * Sayfanın boyanan her karesini kaydeder (Page.startScreencast). Dönen `stop()` her karede film sitesinin bej
 * zemininin (#f3f1ea) ekranın sol şeridinde ne kadar göründüğünü verir: oda katmanı gelmeden film sitesi bir an bile
 * görünürse (flaş) bej oranı yüksek olur. Oda görünümünde o şerit sitenin koyu zemini, örtü ya da kabuk zeminidir.
 */
function beigeShare(img) {
  let beige = 0;
  let n = 0;
  for (let y = 0.1; y < 0.95; y += 0.05) {
    for (let x = 0.01; x < 0.12; x += 0.02) {
      const [r, g, b] = img.at(x * img.width, y * img.height);
      n++;
      if (Math.abs(r - 243) <= 8 && Math.abs(g - 241) <= 8 && Math.abs(b - 234) <= 8) beige++;
    }
  }
  return beige / n;
}
async function recordFlash(label) {
  const frames = [];
  const off = a.onEvent((m) => {
    if (m.method !== 'Page.screencastFrame') return;
    frames.push({ data: m.params.data, t: m.params.metadata.timestamp });
    void a.cdp('Page.screencastFrameAck', { sessionId: m.params.sessionId });
  });
  await a.cdp('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  return async () => {
    await a.cdp('Page.stopScreencast');
    off();
    let worst = 0;
    let worstAt = -1;
    const shares = [];
    const t0 = frames[0]?.t ?? 0;
    frames.forEach(({ data, t }, i) => {
      const share = beigeShare(decodePng(Buffer.from(data, 'base64')));
      if (share > 0) writeFileSync(`${OUT}-flash-${label}-${i}.png`, Buffer.from(data, 'base64'));
      shares.push(`${Math.round((t - t0) * 1000)}ms:${Math.round(share * 100)}%`);
      if (share > worst) {
        worst = share;
        worstAt = i;
      }
    });
    const beigeFrames = shares.filter((x) => !x.endsWith(':0%')).length;
    return { frames: frames.length, beigeFrames, worst: Math.round(worst * 100) / 100, worstAt, shares: shares.join(' ') };
  };
}
const fmt = (n) => (typeof n === 'number' ? Math.round(n) : n);
const coverText = (l) => (l ? `başta:${l.atStart} eklendi:${fmt(l.added)} kalktı:${fmt(l.removed)} katman:${fmt(l.shellAt)} delik:${fmt(l.clipAt)} ilk-boyama:${fmt(l.firstPaint)} ms` : 'kayıt yok');

// Sam: sitede (adı ve teması kayıtlı).
await a.navigate(`${SITE}/`);
await a.sleep(1500);
await a.evaluate(`localStorage.setItem('name','Sam'); localStorage.setItem('avatar','wizard'); localStorage.setItem('lang','tr'); 1`);
await a.navigate(`${SITE}/r/${room}#back`);
await a.sleep(3000);
check((await a.evaluate(`document.documentElement.dataset.swmShell`)) === '1', 'site eklentinin kabuğu bildiğini görüyor');
const riley = await fakeUser(room, 'Riley');
check(!!(await until(() => riley.members.length === 2)), 'Sam ve Riley odada');

// 0b) Sitede (kabuk değil): herkes 💬 Sohbet'le açılır; ⚙️ Ayarlar ortada pencere; 👤 sağ üstte en sonda, profil
// panelini açıp kapatır.
const ACTIVE_TAB = `document.querySelector('[data-tab][aria-selected=true]')?.dataset.tab`;
const hostTab = await until(async () => ((await a.evaluate(ACTIVE_TAB)) === 'chat' ? 'chat' : null), 5000);
check(hostTab === 'chat', 'odayı kuran (yönetici) sitede 💬 Sohbet sekmesiyle açılıyor', String(await a.evaluate(ACTIVE_TAB)));
await a.evaluate(`document.getElementById('settings-open').click(); 1`);
const settingsOpen = await until(() =>
  a.evaluate(`!document.getElementById('settings-dialog').hidden && !document.querySelector('.settings-nav [data-sec=schedule]').hidden && !document.querySelector('.host-ui').hidden`),
);
check(!!settingsOpen, '⚙️ ayarlar penceresi açılıyor, yöneticiye oda kuralları ve planlı başlangıç görünüyor');
await a.evaluate(`document.getElementById('settings-close').click(); 1`);
check(!!(await a.evaluate(`document.getElementById('settings-dialog').hidden`)), 'ayarlar penceresi ✕ ile kapanıyor');
const profileSpot = await a.evaluate(
  `(() => { const r = document.querySelector('.topbar-right'); const b = r?.lastElementChild; const p = b?.previousElementSibling; return { last: b?.id === 'settings-open' ? 'settings' : null, before: p?.classList.contains('profile-btn') ? 'profile' : null, n: r?.children.length }; })()`,
);
check(profileSpot?.last === 'settings' && profileSpot.before === 'profile', '👤 sağ üstte, ⚙️ hemen sağında (0.9.87)', JSON.stringify(profileSpot));
check(!(await a.evaluate(`!!document.querySelector('.tab-gear, #profile-settings')`)), 'ayarların eski girişleri (sekme yanı, profil menüsü) kalktı');
const profileAt = await a.center('.topbar-right .profile-btn');
if (profileAt) await a.click(profileAt.x, profileAt.y);
await a.sleep(300);
const profileOpen = await a.evaluate(
  `(() => { const p = document.querySelector('.profile-pop'); const b = document.querySelector('.topbar-right .profile-btn').getBoundingClientRect(); const r = p.getBoundingClientRect(); return !p.hidden && !!p.querySelector('#rename-form') && r.top >= b.bottom - 2 && Math.abs(r.right - b.right) < 40; })()`,
);
if (profileAt) await a.click(profileAt.x, profileAt.y);
await a.sleep(300);
const profileClosed = await a.evaluate(`document.querySelector('.profile-pop').hidden`);
check(profileOpen && profileClosed, '👤 profil menüsünü düğmenin altında açar, tekrar basınca kapanır', `açtı:${profileOpen} kapattı:${profileClosed}`);
await a.shot('0-site-oda');
{
  // İkinci kişi (yönetici değil) ayrı tarayıcıda: 💬 Sohbet'te açılmalı.
  const c = await launch({ ext: EXT, out: `${OUT}-casey` });
  await c.navigate(`${SITE}/`);
  await c.sleep(1500);
  await c.evaluate(`localStorage.setItem('name','Casey'); localStorage.setItem('avatar','elf'); localStorage.setItem('lang','tr'); 1`);
  await c.navigate(`${SITE}/r/${room}#back`);
  const cemIn = await until(() => riley.members.some((m) => m.name === 'Casey'), 10000);
  await c.sleep(1200);
  const cemTab = await c.evaluate(ACTIVE_TAB);
  check(!!cemIn && cemTab === 'chat', 'ikinci kişi (yönetici değil) sitede 💬 Sohbet sekmesinde açılıyor', `odada:${!!cemIn} sekme:${cemTab}`);
  c.close();
  check(!!(await until(() => riley.members.length === 2, 15000)), 'Casey çıktı (odada yine 2 kişi)', JSON.stringify(riley.members.map((m) => m.name)));
}

// 1) Sam bir film sayfası açar → sekme oraya gider, eklenti katmanı açar.
await a.evaluate(`(() => { const i = document.getElementById('media-input'); i.value = '${FILM}/film'; i.form.querySelector('button[value=load]').click(); return 1; })()`);
// "Şimdi aç" önce kısaca anlatıp sorar.
check(!!(await until(() => a.evaluate(`!!document.querySelector('.confirm-dialog')`))), '"Şimdi aç" film linkinde önce soruyor');
const stopFlash1 = await recordFlash('film');
await a.evaluate(`document.querySelector('.confirm-dialog .btn.primary').click(); 1`);
const onFilm = await until(async () => String(await a.evaluate('location.href')).startsWith(`${FILM}/film`));
check(!!onFilm, 'kendi açtığı film sayfasına sekme kendiliğinden gitti');
const shellUp = await until(() => a.evaluate(`!!document.querySelector('iframe[src^="chrome-extension://"]')`));
check(!!shellUp, 'film sayfasında odanın katmanı açıldı');
const once = await until(() => riley.members.length === 2 && riley.members.filter((m) => m.name === 'Sam').length === 1, 12000);
check(!!once, 'Sam odada yine tek kez (bağlantıyı katmandaki site tutuyor)', JSON.stringify(riley.members.map((m) => m.name)));

// 2) Video bulununca katmanda delik açılır, video deliğe yerleşir.
const holed = await until(() => a.evaluate(`getComputedStyle(document.querySelector('iframe[src^="chrome-extension://"]')).clipPath.startsWith('path(')`), 15000);
check(!!holed, 'video bulundu: katmanda videonun yeri delik');
{
  const flash = await stopFlash1();
  console.log('     flaş /film:', JSON.stringify(flash));
  if (flash.worst >= 0.3) console.log('     olaylar:', JSON.stringify((await coverLog())?.events ?? null));
  check(flash.frames > 0 && flash.worst < 0.3, 'siteden film sayfasına geçerken film sitesi hiçbir karede görünmedi (flaş yok)', JSON.stringify(flash));
}
check(await a.evaluate(`!!document.querySelector('[data-swm-focus]') && document.documentElement.classList.contains('swm-focus')`), 'film videosu deliğe yerleşti');
{
  // 0.9.90: the room view fits the window on the film page (scrolling moved the hole, the film lagged behind), and
  // 🏠 / 👁 / 🎯 sit together in the middle of the top bar.
  const fit = await a.evalFrame('shell=1', `(() => { const se = document.scrollingElement; const g = document.querySelector('.shell-tools')?.getBoundingClientRect(); const kids = [...document.querySelectorAll('.shell-tools .nav-link:not([hidden])')].map((b) => b.className); const mid = g ? (g.left + g.right) / 2 : 0; return { scroll: se.scrollHeight - innerHeight, kids, mid: Math.round(mid), w: innerWidth }; })()`);
  check(fit && fit.scroll <= 1, 'film sayfasında oda görünümü pencereye sığıyor (kaymıyor)', JSON.stringify(fit));
  check(fit && fit.kids.length >= 2 && Math.abs(fit.mid - fit.w / 2) < fit.w * 0.15, '🏠 / 👁 / 🎯 üst çubuğun ortasında', JSON.stringify(fit));
}
await a.sleep(800);
await a.shot('1-oda-gorunumu');

// 1b) Reloading the film page by mistake (F5) keeps the room view: the overlay comes back, the hole opens again and
// Sam is still in the room once (owner's report, 0.9.91.4).
{
  await a.evaluate('location.reload(); 1').catch(() => {});
  await a.sleep(1500);
  const back = await until(() => a.evaluate(`!!document.querySelector('iframe[src^="chrome-extension://"]') && getComputedStyle(document.querySelector('iframe[src^="chrome-extension://"]')).clipPath.startsWith('path(')`), 15000);
  const once = await until(() => riley.members.length === 2 && riley.members.filter((m) => m.name === 'Sam').length === 1, 12000);
  check(!!back && !!once, 'film sayfası yenilenince oda görünümü geri geliyor (katman + delik, Sam odada tek kez)', JSON.stringify({ back, members: riley.members.map((m) => m.name) }));
  await a.shot('1b-yenileme');
}

// 2a) Örtü (ilk geliş: sekmenin bu sitede örtü işareti yok, örtü depodaki oda listesiyle gelir).
{
  const l = await coverLog();
  console.log('     örtü /film:', coverText(l));
  check(!!l && (l.atStart || l.added !== null), 'film sayfasına ilk gelişte örtü (data-swm-cover) eklendi', coverText(l));
  check(!!l && l.removed !== null && !l.now && (l.shellAt === null || l.removed >= l.shellAt), 'örtü katmanın ilk yerleşimi gelince kalktı', coverText(l));
}
// Koordinat sağlaması: katman ve içindeki site film sayfasıyla aynı koordinatlarda (piksel testleri buna dayanır).
{
  const page = await a.evaluate(`[innerWidth, innerHeight]`);
  const site = await a.evalFrame('shell=1', `[innerWidth, innerHeight]`);
  check(JSON.stringify(page) === JSON.stringify(site), 'katmandaki site film sayfasıyla aynı boyutta (koordinatlar ortak)', `${page} / ${site}`);
}
// Altyazı testi için videoya varsayılan bir WebVTT altyazısı eklenir (sayfanın kendi altyazısı gibi en altta çizilir).
await a.evaluate(`(() => {
  const v = document.querySelector('video');
  const t = document.createElement('track');
  t.kind = 'subtitles'; t.srclang = 'tr'; t.label = 'TR'; t.default = true;
  t.src = 'data:text/vtt;charset=utf-8,' + encodeURIComponent('WEBVTT\\n\\n00:00:00.000 --> 09:59:59.000\\nALTYAZI TESTI: bu satir gorunmeli\\n');
  v.append(t);
  return 1;
})()`);

// 2b) Katmanda sıra ve link kutusu yok, profil sekmesi var; açılan pencere videonun önünde.
const SHELL_CLIP = `getComputedStyle(document.querySelector('iframe[src^="chrome-extension://"]')).clipPath`;
check(
  await a.evalFrame(
    'shell=1',
    `getComputedStyle(document.getElementById('media-form')).display === 'none' && getComputedStyle(document.querySelector('.tab[data-tab=queue]')).display === 'none' && document.querySelector('.topbar-right')?.lastElementChild?.previousElementSibling?.classList.contains('profile-btn') && document.querySelector('.topbar-right')?.lastElementChild?.id === 'settings-open'`,
  ),
  'katmanda sıra ve link kutusu gizli, 👤 profil düğmesi sağ üstte (⚙️ hemen sağında)',
);
check((await a.evalFrame('shell=1', ACTIVE_TAB)) === 'chat', 'katmanda yönetici de 💬 Sohbet sekmesiyle açılıyor (Ayarlar değil)', String(await a.evalFrame('shell=1', ACTIVE_TAB)));
const clipBefore = await a.evaluate(SHELL_CLIP);
// The dock shows in the window too since 0.9.91.5 and comes and goes with the film's bar, so the clip path is compared
// by meaning, not as text: is the hole covered by an island, and is there an island over a given box?
const holeCoveredNow = async () => {
  const rects = clipRects(await a.evaluate(SHELL_CLIP));
  const hole = rects[1];
  return !!hole && rects.slice(2).some((r) => r.x <= hole.x + 2 && r.y <= hole.y + 2 && r.r >= hole.r - 2 && r.b >= hole.b - 2);
};
const islandOver = async (box) => clipRects(await a.evaluate(SHELL_CLIP)).slice(2).some((r) => r.x <= box.x + 2 && r.y <= box.y + 2 && r.r >= box.r - 2 && r.b >= box.b - 2);
await a.evalFrame('shell=1', `(async () => { const m = await import('/src/themes.ts'); m.openThemeDialog(); return 1; })()`);
// Pencere açıkken delik tamamen kapanır: yolda ekran + delik + deliği kapatan adacık (3 parça).
const covered = await until(async () => {
  const clip = await a.evaluate(SHELL_CLIP);
  return clip !== clipBefore && (clip.match(/M/g) || []).length === 3 ? clip : null;
});
check(!!covered, 'tema penceresi açıkken delik kapandı (pencere videonun önünde)');
await a.shot('1b-pencere-onde');
await a.evalFrame('shell=1', `document.querySelector('.dialog-backdrop:not([hidden]) .btn.primary')?.click(); 1`);
check(!!(await until(async () => !(await holeCoveredNow()))), 'pencere kapanınca delik geri açıldı');
// ⚙️ Ayarlar penceresi de delikten önde.
await a.evalFrame('shell=1', `document.getElementById('settings-open').click(); 1`);
const settingsCovered = await until(async () => {
  const clip = await a.evaluate(SHELL_CLIP);
  return clip !== clipBefore && (clip.match(/M/g) || []).length === 3 ? clip : null;
});
check(!!settingsCovered, 'ayarlar penceresi açıkken delik kapandı');
await a.evalFrame('shell=1', `document.getElementById('settings-close').click(); 1`);
check(!!(await until(async () => !(await holeCoveredNow()))), 'ayarlar kapanınca delik geri açıldı');
// Card 2: no toolbar under the video on the film page; the rail is a column beside the film (never over the film's
// video), and its emoji window opens over the hole as an island (visible, clickable).
check(await a.evalFrame('shell=1', `getComputedStyle(document.querySelector('.toolbar')).display === 'none'`), 'film sayfası: videonun altında araç çubuğu yok (tek ray)');
// Card 2b: the film page's rail waits for the mouse at the film's right edge (a thin gutter of our overlay). Headless
// Chrome does not route mouse events into the overlay while the film page is fullscreen (headful Chrome does: run with
// HEADFUL=1 under `xvfb-run -a` to try the real mouse), so headless runs tell the site the mouse reached the edge.
const EDGE_BOX = `(() => { const r = document.getElementById('rail-edge').getBoundingClientRect(); return r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`;
const IN_FS = `document.getElementById('theater').classList.contains('fake-fs')`;
async function toEdge() {
  const edge = await a.evalFrame('shell=1', EDGE_BOX);
  if (edge) await a.mouse('mouseMoved', edge.x, edge.y);
}
/** The mouse passes the edge and goes straight back onto the film. */
async function passBy(back) {
  const edge = await a.evalFrame('shell=1', EDGE_BOX);
  if (!edge) return;
  await a.mouse('mouseMoved', edge.x, edge.y);
  await a.sleep(40);
  await a.mouse('mouseMoved', back.x, back.y);
}
const RAIL_OUT = `!document.getElementById('theater').classList.contains('dock-idle')`;
if (HEADFUL) {
  await toEdge();
  check(!!(await until(() => a.evalFrame('shell=1', RAIL_OUT), 2000)), 'film sayfası: fare filmin sağ kenarına gelince ray açılıyor');
  // Card R5: the last 40 px of the film itself bring the rail too (the film's frame tells the site), not only the thin
  // gutter beside it; a mouse in the middle of the film lets it rest again.
  const hole = clipRects(await a.evaluate(SHELL_CLIP))[1];
  await a.mouse('mouseMoved', (hole.x + hole.r) / 2, (hole.y + hole.b) / 2);
  await a.sleep(150);
  await a.mouse('mouseMoved', (hole.x + hole.r) / 2 - 10, (hole.y + hole.b) / 2);
  const rested = await until(async () => !(await a.evalFrame('shell=1', RAIL_OUT)), 3000);
  const film = clipRects(await a.evaluate(SHELL_CLIP))[1];
  for (let x = (film.x + film.r) / 2; x < film.r - 20; x += 60) await a.mouse('mouseMoved', x, (film.y + film.b) / 2);
  await a.mouse('mouseMoved', film.r - 20, (film.y + film.b) / 2);
  await a.sleep(60);
  await a.mouse('mouseMoved', film.r - 18, (film.y + film.b) / 2);
  check(!!rested && !!(await until(() => a.evalFrame('shell=1', RAIL_OUT), 2000)), 'film sayfası: filmin son 40 px\'i de rayı açıyor (R5)', JSON.stringify({ rested, film }));
  // EXT1 (owner): the mouse goes from the side panel back across the rail and the film's right edge to the middle of the
  // film, at a person's pace: the film's "at the edge" and "away from it" come within 300 ms, and the rail stayed out.
  {
    const side = await a.evalFrame('shell=1', `(() => { const r = document.querySelector('.chat-panel').getBoundingClientRect(); return { x: r.left + 40, y: r.top + r.height / 2 }; })()`);
    await a.mouse('mouseMoved', side.x, (film.y + film.b) / 2);
    await a.sleep(600);
    for (let x = side.x; x >= (film.x + film.r) / 2; x -= 40) {
      await a.mouse('mouseMoved', x, (film.y + film.b) / 2);
      await a.sleep(35);
    }
    const restedBack = await until(async () => !(await a.evalFrame('shell=1', RAIL_OUT)), 2500);
    check(!!restedBack, 'film sayfası: fare yan panelden rayın ve filmin kenarının üstünden filmin ortasına geçince ray kapanıyor (EXT1)');
    await a.mouse('mouseMoved', film.r - 20, (film.y + film.b) / 2);
    await a.sleep(60);
    await a.mouse('mouseMoved', film.r - 18, (film.y + film.b) / 2);
    await until(() => a.evalFrame('shell=1', RAIL_OUT), 2000);
  }
  // BH10 (owner): "Keep the controls open" holds the rail in the window too, also when the mouse leaves the film.
  await a.evalFrame('shell=1', `document.getElementById('rail-pin').click(); 1`);
  const chatBox = await a.evalFrame('shell=1', `(() => { const r = document.querySelector('.chat-panel').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await a.mouse('mouseMoved', (film.x + film.r) / 2, (film.y + film.b) / 2);
  await a.sleep(150);
  await a.mouse('mouseMoved', chatBox.x, chatBox.y);
  await a.sleep(3200);
  check(!!(await a.evalFrame('shell=1', RAIL_OUT)), 'film sayfası: "Kumanda hep açık" iken fare filmden 3 sn uzakta, ray açık kalıyor');
  // Unpinned again (the fullscreen edge checks below need a rail that rests), the mouse back at the film's right edge
  // so the rail is out for the next check, as after R5.
  await a.evalFrame('shell=1', `document.getElementById('rail-pin').click(); 1`);
  await a.mouse('mouseMoved', film.r - 20, (film.y + film.b) / 2);
  await a.sleep(60);
  await a.mouse('mouseMoved', film.r - 18, (film.y + film.b) / 2);
  await until(() => a.evalFrame('shell=1', RAIL_OUT), 2000);
} else {
  console.log('skip film sayfası: rayın açılıp kapanması (headless; xvfb-run ile gerçek fare)');
  await a.evalFrame('shell=1', `document.getElementById('rail-pin').click(); 1`);
}
await a.sleep(400);
const RAIL_VS_FILM = async () => {
  const dock = await a.evalFrame('shell=1', `(() => { const r = document.getElementById('fs-dock').getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; })()`);
  const hole = clipRects(await a.evaluate(SHELL_CLIP))[1];
  const film = await a.evaluate(`(() => { const r = document.querySelector('video').getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; })()`);
  return { dock, hole, film, apart: dock.x >= film.r - 1 && dock.x >= hole.r - 1 };
};
const railRoom = await RAIL_VS_FILM();
check(railRoom.apart, 'film sayfası: ray filmin yanında, filmin videosunun üstünde değil', JSON.stringify(railRoom));
await a.evalFrame('shell=1', `document.getElementById('dock-react').click(); 1`);
const POP_BOX = `(() => { const r = document.getElementById('dock-react-pop').getBoundingClientRect(); return r.width ? { x: r.left, y: r.top, r: r.right, b: r.bottom } : null; })()`;
const trayBox = await until(() => a.evalFrame('shell=1', POP_BOX));
const trayIsland = trayBox && (await until(() => islandOver(trayBox)));
check(!!trayIsland, 'rayın emoji penceresi deliğin üstünde adacık (katmanda görünüyor)', JSON.stringify(trayBox));
await a.shot('1d-tepki-tepsisi');
await a.evalFrame('shell=1', `document.getElementById('dock-react').click(); 1`);
check(!!trayBox && !!(await until(async () => !(await islandOver(trayBox)))), 'pencere kapanınca adacık kalktı');
// EXT1 (owner: "games don't work on the film page"): the games hall opens next to the rail's 🎮, inside the rail, and
// was clipped away (invisible). The hall, a Classics table (a move against Glowbeam) and a side game show over the film.
{
  // Seen = its middle is not in the film's open hole, or an island of ours covers it there (the hole may also close).
  const seen = async (box) => {
    const rects = clipRects(await a.evaluate(SHELL_CLIP));
    const x = (box.x + box.r) / 2, y = (box.y + box.b) / 2;
    const at = (r) => r.x <= x && x <= r.r && r.y <= y && y <= r.b;
    return !rects[1] || !at(rects[1]) || rects.slice(2).some(at);
  };
  // Helpers defined in the overlay page once, then called with fixed selectors.
  const HELPERS = `(() => { window.__swmBox = (sel) => { const e = document.querySelector(sel); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return r.width ? { x: r.left, y: r.top, r: r.right, b: r.bottom } : null; }; window.__swmCenter = (sel) => { const c = document.querySelector(sel); if (!c) return null; const r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }; return 1; })()`;
  await a.evalFrame('shell=1', HELPERS);
  await a.evalFrame('shell=1', `document.getElementById('dock-game').click(); 1`);
  const hall = await until(() => a.evalFrame('shell=1', `document.querySelector('#game-menu [data-kind="classics"]') ? __swmBox('#game-menu') : null`));
  check(!!hall && !!(await until(() => seen(hall))), 'film sayfası: oyun salonu filmin üstünde görünüyor (adacık) (EXT1)', JSON.stringify(hall));
  await a.shot('1e-oyun-salonu');
  await a.evalFrame('shell=1', `document.querySelector('#game-menu [data-kind="classics"]').click(); 1`);
  const stage = await until(() => a.evalFrame('shell=1', `document.querySelector('#game-stage .xox-cell, #game-stage .dama-cell') ? __swmBox('#game-stage') : null`), 10000);
  check(!!stage && !!(await until(() => seen(stage))), 'film sayfası: Klasikler masası filmin yerinde görünüyor (EXT1)', JSON.stringify(stage));
  // A real move against Glowbeam: XOX picked on the game shelf (it covers the board until a game is picked).
  await a.evalFrame('shell=1', `document.querySelector('#game-stage .cl-box[data-board="xox"]')?.click(); 1`);
  await a.sleep(800);
  await a.evalFrame('shell=1', `document.querySelector('#game-stage .cl-bot-level')?.click(); 1`);
  await a.sleep(1500);
  const BOARD = `(document.getElementById('xox-board')?.innerHTML ?? '')`;
  await a.evalFrame('shell=1', HELPERS);
  // The table may still switch to the board it remembers: try until a move of mine lands.
  let dama = false;
  let mine = null;
  for (let i = 0; i < 8 && !mine; i++) {
    const before = await a.evalFrame('shell=1', BOARD);
    dama = await a.evalFrame('shell=1', `!!document.querySelector('#game-stage .dama-cell')`);
    const first = await a.evalFrame('shell=1', dama ? `__swmCenter('#game-stage .dama-cell.movable')` : `__swmCenter('#xox-board > :nth-child(5)')`);
    if (first) await a.click(first.x, first.y);
    if (dama) {
      const to = await until(() => a.evalFrame('shell=1', `__swmCenter('#game-stage .dama-cell.target')`), 1500);
      if (to) await a.click(to.x, to.y);
    }
    mine = await until(async () => {
      const now = await a.evalFrame('shell=1', BOARD);
      const picked = await a.evalFrame('shell=1', `!!document.querySelector('#game-stage .dama-cell.picked')`);
      return now && now !== before && !picked ? now : null;
    }, 1200);
  }
  const answered = mine && (await until(async () => (await a.evalFrame('shell=1', BOARD)) !== mine, 6000));
  check(!!mine && !!answered, `film sayfası: ${dama ? 'dama' : 'XOX'} hamlesi (gerçek tıklama) oynandı, Glowbeam cevap verdi (EXT1)`);
  await a.shot('1f-klasikler');
  await a.evalFrame('shell=1', `document.querySelector('#game-stage .game-end')?.click(); 1`);
  await a.sleep(300);
  await a.evalFrame('shell=1', `document.querySelector('.dialog-backdrop:not([hidden]) .btn.primary')?.click(); 1`);
  await until(() => a.evalFrame('shell=1', `!document.querySelector('#game-stage .xox-cell')`), 5000);
  await a.evalFrame('shell=1', `document.getElementById('dock-game').click(); 1`);
  await until(() => a.evalFrame('shell=1', `!!document.querySelector('#game-menu [data-tab="side"]')`));
  await a.evalFrame('shell=1', `document.querySelector('#game-menu [data-tab="side"]').click(); 1`);
  await until(() => a.evalFrame('shell=1', `!!document.querySelector('#game-menu [data-solo="snack"]')`));
  await a.evalFrame('shell=1', `document.querySelector('#game-menu [data-solo="snack"]').click(); 1`);
  const scene = await until(() => a.evalFrame('shell=1', `(() => { document.querySelector('.htp:not([hidden]) .htp-skip')?.click(); return __swmBox('.sb-scene'); })()`), 10000);
  check(!!scene && !!(await until(() => seen(scene))), 'film sayfası: Snack Bar penceresi filmin üstünde görünüyor (EXT1)', JSON.stringify(scene));
  await a.shot('1g-snack-bar');
  // W1 (owner): no game has its own full screen: no ⛶ in the head. Its 🎮 opens the hall on the film page too (W3).
  check(!!(await a.evalFrame('shell=1', `!document.querySelector('#game-stage .game-full')`)), 'film page: no ⛶ in the game window (W1)');
  await a.evalFrame('shell=1', `document.querySelector('#game-stage .game-hub-open').click(); 1`);
  await until(() => a.evalFrame('shell=1', `!!document.querySelector('#game-menu:not([hidden]) [data-tab="side"]')`));
  await a.evalFrame('shell=1', `document.querySelector('#game-menu [data-tab="side"]').click(); 1`);
  await until(() => a.evalFrame('shell=1', `!!document.querySelector('#game-menu [data-solo="garden"]')`));
  await a.evalFrame('shell=1', `document.querySelector('#game-menu [data-solo="garden"]').click(); 1`);
  const gardenScene = await until(() => a.evalFrame('shell=1', `(() => { document.querySelector('.htp:not([hidden]) .htp-skip')?.click(); return __swmBox('.wg'); })()`), 10000);
  check(!!gardenScene && !!(await until(() => seen(gardenScene))), 'film page: the game window’s 🎮 opens the hall and Window Garden opens from it, over the film (W3)', JSON.stringify(gardenScene));
  await a.evalFrame('shell=1', `document.querySelector('#game-stage .game-minimize')?.click(); 1`);
  await a.sleep(500);
}

// 2c) Film sitesinin kendi ⛶ düğmesi → odanın tam ekranı (sitenin kontrolleri görünür).
const fsButton = await a.center('#fs');
if (fsButton) await a.click(fsButton.x, fsButton.y);
const fake = await until(() => a.evalFrame('shell=1', `document.getElementById('theater').classList.contains('fake-fs')`));
check(!!fake, 'film sitesinin ⛶ düğmesi → odanın tam ekranı');
const PAGE_FS = `document.fullscreenElement === document.documentElement`;
check(!!(await until(() => a.evaluate(PAGE_FS))), 'filmin ⛶ düğmesi: bütün film sayfası tam ekran (odanın tam ekranı, yalnızca film kutusu değil) (EXT1)');
await a.sleep(800);
await a.shot('1c-tam-ekran');
// EXT1 (owner): the film's own ⛶ pressed again leaves the room's fullscreen.
{
  const again = await a.center('#fs');
  if (again) await a.click(again.x, again.y);
  const left = await until(async () => !(await a.evaluate('!!document.fullscreenElement')) && !(await a.evalFrame('shell=1', `document.getElementById('theater').classList.contains('fake-fs')`)), 4000);
  check(!!left, "filmin ⛶ düğmesine ikinci basış odanın tam ekranından çıkarıyor (EXT1)");
  if (!left) await a.evalFrame('shell=1', `document.getElementById('dock-exit').click(); 1`);
}
await a.sleep(800);

// 3) Senkron: Riley oynatır / durdurur → film videosu uyar.
riley.send({ t: 'play', position: 30, at: Date.now() });
const playing = await until(async () => {
  const v = await a.evaluate(`(() => { const v = document.querySelector('video'); return v && { t: v.currentTime, p: v.paused }; })()`);
  return v && !v.p && near(v.t, 30, 3) ? v : null;
}, 15000);
check(!!playing, 'Riley oynattı → film videosu oynuyor, aynı yerde', JSON.stringify(playing));
riley.send({ t: 'pause', position: 42, at: Date.now() });
const paused = await until(async () => {
  const v = await a.evaluate(`(() => { const v = document.querySelector('video'); return { t: v.currentTime, p: v.paused }; })()`);
  return v.p && near(v.t, 42) ? v : null;
});
check(!!paused, 'Riley durdurdu (42 sn) → film videosu durdu');

// 4) Sam film sitesinin kendi oynatıcısıyla oynatır → oda oynar.
riley.clear();
await a.evaluate(`document.querySelector('video').play().then(() => 1)`);
const bySam = await riley.wait((m) => m.t === 'state' && !m.state.paused && m.by?.name === 'Sam', 8000);
check(!!bySam, 'Sam film videosunu oynattı → oda oynuyor (Sam adına)');

// 4b) Film sitesi oynarken adresine sorgu eklerse (zaman damgası gibi) film kapanıp video durmasın.
await a.evaluate(`history.replaceState(null, '', location.pathname + '?t=45'); 1`);
await a.sleep(2500);
check(await a.evaluate(`!document.querySelector('video').paused`), 'film sitesi adresine sorgu ekledi → video durmadı');

// 5) Katmandaki site videonun durumunu biliyor (ilerleme, pin şeridi için).
const t = await until(() => a.evalFrame('shell=1', `window.__swm?.player()?.getTime()`));
check(typeof t === 'number' && t > 40, 'katmandaki site film videosunun yerini biliyor', String(t));

// 6) Kısayol (odak film sayfasında) ve katmandan sohbet.
riley.clear();
await a.press('1', 'Digit1', 49);
check(!!(await riley.wait((m) => m.t === 'reaction', 5000)), '1 tuşu (odak film sayfasında) → emoji odaya gitti');
// 6b) Card R26 (owner: "after a click on the video Enter no longer opens the message box"): a click in the film,
// then Enter: the room's message box gets the focus (the film page forwards the key to the room view).
{
  const v = await a.evaluate(`(() => { const r = document.querySelector('video').getBoundingClientRect(); return { x: r.left + r.width / 3, y: r.top + r.height / 2 }; })()`);
  await a.click(v.x, v.y);
  await a.sleep(400);
  await a.press('Enter', 'Enter', 13);
  const typed = await until(() => a.evalFrame('shell=1', `['chat-input', 'dock-chat-input'].includes(document.activeElement?.id) ? document.activeElement.id : ''`), 3000);
  check(!!typed, 'filme tıklayınca Enter odanın mesaj kutusunu açıyor (R26)', String(typed));
  await a.press('Escape', 'Escape', 27);
  await a.click(v.x, v.y);
  await a.sleep(600);
}
await a.evalFrame('shell=1', `(() => { const i = document.getElementById('chat-input'); i.value = 'katmandan selam'; i.form.requestSubmit(); return 1; })()`);
check(!!(await riley.wait((m) => m.t === 'chat' && m.message.text === 'katmandan selam', 5000)), 'katmandaki sohbet odaya gitti');

// 7) Katmandaki ayar (tema) ana siteye de geçer.
await a.evalFrame('shell=1', `(async () => { const m = await import('/src/themes.ts'); m.applyTheme('okyanus', { wait: false }); return 1; })()`);

const SHELL = `document.querySelector('iframe[src^="chrome-extension://"]')`;
const FLOATS = `document.querySelectorAll('#reactions-layer .r-float').length`;

// 7b) Uçuşan emojiler: art arda basınca her biri ayrı uçar ("×2" yok, varsayılan beklemesiz).
await a.sleep(3500);
{
  const before = await a.evalFrame('shell=1', FLOATS);
  riley.clear();
  // İstemci iki emoji arasında en az 150 ms bekler (tuş tekrarı da sayılmaz): 200 ms arayla bas.
  for (let i = 0; i < 4; i++) {
    await a.press('1', 'Digit1', 49);
    await a.sleep(200);
  }
  await a.sleep(500);
  const after = await a.evalFrame(
    'shell=1',
    `({ n: ${FLOATS}, counts: document.querySelectorAll('#reactions-layer .r-count').length, cooling: !!document.querySelector('.reaction-bar.cooling') })`,
  );
  await a.sleep(500);
  const sent = riley.count((m) => m.t === 'reaction');
  check(
    after.n - before >= 4 && after.counts === 0 && !after.cooling && sent >= 4,
    '4 kez hızlıca 1 → 4 ayrı uçan emoji (×2 sayacı yok, bekleme yok)',
    `önce:${before} sonra:${after.n} ×sayaç:${after.counts} bekleme:${after.cooling} Riley'ye giden:${sent}`,
  );
  await a.shot('5-ucusan-emojiler');
  // Art arda 10 emoji: adacıklar birbirine binmemeli (çift-tek kuralında kesişen yer katmandan kesilir → yarım/silik
  // emoji) ve her uçan emojinin ortası bir adacığın içinde olmalı.
  for (let i = 0; i < 10; i++) {
    await a.press(String((i % 8) + 1), `Digit${(i % 8) + 1}`, 49 + (i % 8));
    await a.sleep(170);
  }
  await a.sleep(300);
  const rects = clipRects(await a.evaluate(`getComputedStyle(${SHELL}).clipPath`)).slice(2);
  const centers = await a.evalFrame('shell=1', `[...document.querySelectorAll('#reactions-layer .r-float')].map((e) => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })`);
  const overlaps = rects.some((p, i) => rects.some((q, j) => j > i && p.x < q.r && q.x < p.r && p.y < q.b && q.y < p.b));
  const uncovered = centers.filter((c) => !rects.some((r) => c.x >= r.x && c.x <= r.r && c.y >= r.y && c.y <= r.b));
  check(
    centers.length >= 6 && !overlaps && uncovered.length === 0,
    'art arda 10 emoji: adacıklar çakışmıyor, her emoji tam görünür (yarım/silik değil)',
    `emoji:${centers.length} adacık:${rects.length} çakışma:${overlaps} açıkta:${uncovered.length}`,
  );
  await a.shot('5b-emoji-yagmuru');
}

// 7c) Deliğin içindeki emoji saydam: adacıkta (emojinin çevresi) videonun kendisi görünmeli, opak koyu gri (#121212) değil.
riley.send({ t: 'pause', position: 120, at: Date.now() });
await until(() => a.evaluate(`(() => { const v = document.querySelector('video'); return v.paused && Math.abs(v.currentTime - 120) < 1 && !v.seeking && v.readyState >= 2; })()`), 15000);
await a.sleep(3500); // önceki emojiler uçup gitsin
/** Emoji atar, uçarken ekranı çeker; adacıktaki (emojinin dışındaki) noktaları videoyla (A) karşılaştırır. */
async function floatSample(name, baseline) {
  await a.press('1', 'Digit1', 49);
  await a.sleep(450);
  const img = await a.pixels(name);
  const clip = await a.evaluate(`getComputedStyle(${SHELL}).clipPath`);
  const f = await a.evalFrame('shell=1', `(() => { const e = [...document.querySelectorAll('#reactions-layer .r-float')].at(-1); const r = e?.getBoundingClientRect(); return r ? { x: r.left, y: r.top, r: r.right, b: r.bottom } : null; })()`);
  const rects = clipRects(clip);
  const islands = rects.slice(2);
  const cx = f ? (f.x + f.r) / 2 : 0;
  const cy = f ? (f.y + f.b) / 2 : 0;
  const island = islands.find((r) => inRect({ x: cx, y: cy }, r));
  const points = island ? gridPoints(island, [f]) : [];
  let same = 0;
  let flat = 0;
  let lit = 0;
  // Videonun parlak yerlerinde de aynı mı? (Koyu yerlerde opak gri de videoya "benzer"; ayırt eden parlak noktalar.)
  let sameLit = 0;
  for (const p of points) {
    const A = baseline.at(p.x, p.y);
    const B = img.at(p.x, p.y);
    if (pxDiff(A, B) <= 24) same++;
    if (flatDark(B) && !flatDark(A)) flat++;
    if (bright(A)) {
      lit++;
      if (pxDiff(A, B) <= 24) sameLit++;
    }
  }
  const sampleA = island ? baseline.at(island.x + 4, island.y + 4) : null;
  const sampleB = island ? img.at(island.x + 4, island.y + 4) : null;
  return { island, float: f, n: points.length, same, flat, lit, sameLit, sampleA, sampleB, islands: islands.length };
}
const baseA = await a.pixels('6a-video-duruk');
const fl = await floatSample('6b-emoji-saydam', baseA);
console.log('     emoji adacığı:', JSON.stringify(fl));
check(
  !!fl.island && fl.n >= 30 && fl.lit >= 5 && fl.same / fl.n >= 0.9 && fl.flat / fl.n < 0.05,
  'uçan emojinin adacığında video görünüyor (opak #121212 zemin yok)',
  `nokta:${fl.n} videoyla-aynı:${fl.same} düz-koyu:${fl.flat} parlak:${fl.lit} adacık:${JSON.stringify(fl.island)}`,
);
// Karşı deneme (testin hatayı yakaladığını göstermek için): çerçevenin şemasını eski haline (normal) çevir → adacık opak olmalı.
await a.evaluate(`${SHELL}.style.setProperty('color-scheme', 'normal', 'important'); 1`);
await a.sleep(3500);
// Ekran görüntüsü ile kesme yolu farklı anlarda okunur (arada emoji adacığı değişebilir): en fazla 3 deneme, en iyisi.
let neg = await floatSample('6c-karsi-deneme-normal', baseA);
for (let i = 0; i < 2 && !(neg.lit >= 30 && neg.sameLit / neg.lit < 0.3); i++) {
  await a.sleep(3500);
  neg = await floatSample('6c-karsi-deneme-normal', baseA);
}
console.log('     karşı deneme (color-scheme:normal):', JSON.stringify(neg));
check(
  !!neg.island && neg.lit >= 30 && neg.sameLit / neg.lit < 0.3,
  "karşı deneme: çerçeve color-scheme:normal iken adacık opak (test eski hatayı yakalıyor)",
  `nokta:${neg.n} parlak:${neg.lit} parlakta-videoyla-aynı:${neg.sameLit} düz-koyu:${neg.flat}`,
);
await a.evaluate(`${SHELL}.style.setProperty('color-scheme', 'dark', 'important'); 1`);
await a.sleep(3500);

// 7d) Pin: P (odak film sayfasında) → not kutusu → kaydet; tam ekran dışında video altındaki şerit görünür.
await a.press('p', 'KeyP', 80);
const pinForm = await until(() => a.evalFrame('shell=1', `!document.getElementById('pin-form').hidden`), 4000);
check(!!pinForm, 'P (odak film sayfasında) → pin not kutusu açıldı');
await a.evalFrame('shell=1', `(() => { const i = document.getElementById('pin-note'); i.value = 'test pini'; i.form.requestSubmit(); return 1; })()`);
const STRIP_SHOWN = (id) =>
  `(() => { const s = document.getElementById('${id}'); return !s.hidden && !s.classList.contains('empty') && getComputedStyle(s).display !== 'none' && s.offsetHeight > 0; })()`;
const stripOk = await until(() => a.evalFrame('shell=1', STRIP_SHOWN('pin-strip')), 6000);
check(!!stripOk, 'pin kaydedildi: tam ekran dışında video altındaki pin şeridi görünüyor');
await a.shot('7-pin-seridi');

// 7e) Tam ekran (film sitesinin ⛶'u): pinler gizli, altyazı kontrollerin üstünde, mesaj tutamağı saydam.
const fs2 = await a.center('#fs');
if (fs2) await a.click(fs2.x, fs2.y);
check(!!(await until(() => a.evalFrame('shell=1', `document.getElementById('theater').classList.contains('fake-fs')`))), 'tam ekrana geçildi (altyazı/pin/mesaj testleri için)');
await a.sleep(1500);
// R26 in fullscreen: a click in the film, then Enter opens the rail's message box.
{
  const v = await a.evaluate(`(() => { const r = document.querySelector('video').getBoundingClientRect(); return { x: r.left + r.width / 3, y: r.top + r.height / 2 }; })()`);
  await a.click(v.x, v.y);
  await a.sleep(400);
  await a.press('Enter', 'Enter', 13);
  const typed = await until(() => a.evalFrame('shell=1', `document.activeElement?.id === 'dock-chat-input'`), 3000);
  check(!!typed, 'tam ekranda filme tıklayınca Enter mesaj kutusunu açıyor (R26)');
  await a.press('Escape', 'Escape', 27);
  await a.click(v.x, v.y);
  await a.sleep(800);
}
// 7e-1) Option A (0.9.91.1): the film keeps its own player bar and fills the screen; our buttons are a dock on the
// right edge (an island), nothing of ours covers the bottom of the film.
{
  const cover = clipRects(await a.evaluate(`getComputedStyle(${SHELL}).clipPath`))[1];
  const screenH = await a.evaluate('innerHeight');
  check(!!cover && near(cover.b, screenH, 2), 'tam ekran: video ekranı kaplıyor, delik ekranın altına kadar', `delik alt:${cover?.b} ekran:${screenH}`);
  // No scrollbar on the right edge (owner's report): neither the room in the overlay nor the film page may scroll,
  // and the hole reaches the right edge of the screen.
  // `inner`: boxes in the film's player that would show a scrollbar (some players' boxes scroll). Headless Chrome
  // draws no scrollbars, so this looks for a scrollable box whose content is bigger than the box.
  const SCROLL = `(() => {
    const se = document.scrollingElement;
    const bars = (e) => {
      const s = getComputedStyle(e);
      if (s.scrollbarWidth === 'none') return false;
      const y = /auto|scroll/.test(s.overflowY) && (s.overflowY === 'scroll' || e.scrollHeight > e.clientHeight + 1);
      const x = /auto|scroll/.test(s.overflowX) && (s.overflowX === 'scroll' || e.scrollWidth > e.clientWidth + 1);
      return y || x;
    };
    const inner = [...document.querySelectorAll('[data-swm-focus], [data-swm-focus] *')].filter(bars).map((e) => e.tagName + '#' + e.id);
    return { over: se.scrollHeight - innerHeight, wide: se.scrollWidth - innerWidth, bar: innerWidth - document.documentElement.clientWidth, inner };
  })()`;
  const siteScroll = await a.evalFrame('shell=1', SCROLL);
  const filmScroll = await a.evaluate(SCROLL);
  const screenW = await a.evaluate('innerWidth');
  // Card 2b (owner's B): the rail rests until the mouse reaches the film's right edge; the film then narrows to make room.
  const DOCK_IDLE = `document.getElementById('theater').classList.contains('dock-idle')`;
  const holeRight = async () => clipRects(await a.evaluate(`getComputedStyle(${SHELL}).clipPath`))[1]?.r;
  let wideRight = screenW - 14;
  if (HEADFUL) {
    await a.mouse('mouseMoved', screenW / 2, screenH / 2);
    const rested = await until(() => a.evalFrame('shell=1', DOCK_IDLE), 4000);
    await a.sleep(400);
    wideRight = await holeRight();
    check(!!rested && near(wideRight, screenW - 14, 3), 'tam ekran: ray beklerken film neredeyse tüm genişlikte (sağda ince bir kenar)', JSON.stringify({ rested, wideRight, screenW }));
    await toEdge();
    const opened = await until(async () => !(await a.evalFrame('shell=1', DOCK_IDLE)), 2000);
    await a.sleep(500);
    const narrowRight = await holeRight();
    check(!!opened && narrowRight < wideRight - 40, 'tam ekran: fare sağ kenara gelince ray açılıyor, film ona yer açıyor', JSON.stringify({ opened, narrowRight, wideRight }));
  } else await a.sleep(500);
  const cover2 = clipRects(await a.evaluate(`getComputedStyle(${SHELL}).clipPath`))[1];
  Object.assign(cover, cover2);
  const railLeft = await a.evalFrame('shell=1', `document.getElementById('fs-dock').getBoundingClientRect().left`);
check(siteScroll.over <= 0 && siteScroll.wide <= 0 && siteScroll.bar === 0 && filmScroll.bar === 0 && filmScroll.inner.length === 0 && near(cover.r, railLeft, 2) && screenW - railLeft < 80, 'tam ekran: sağda kaydırma çubuğu yok, delik rayın sol kenarına kadar (ray ekranın sağında)', JSON.stringify({ siteScroll, filmScroll, holeRight: cover.r, railLeft, screenW }));
  const SKIN = `[...document.querySelectorAll('style')].some((s) => s.textContent.includes('-webkit-media-controls-enclosure'))`;
  await a.sleep(1500);
  check(!(await a.evaluate(SKIN)), 'tam ekran: film oynatıcısının kendi çubuğu yerinde (gizlenmiyor)');
  const dockR = await a.evalFrame('shell=1', `(() => { const r = document.getElementById('fs-dock').getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; })()`);
  const isHole = (r) => near(r.x, cover.x, 2) && near(r.y, cover.y, 2) && near(r.r, cover.r, 2) && near(r.b, cover.b, 2);
  const inside = (r, outer) => r.x >= outer.x - 2 && r.y >= outer.y - 2 && r.r <= outer.r + 2 && r.b <= outer.b + 2;
  const rects = clipRects(await a.evaluate(`getComputedStyle(${SHELL}).clipPath`)).slice(2);
  check(dockR.r - dockR.x > 30 && dockR.x >= cover.r - 2 && !rects.some((r) => r.r > cover.r + 2), 'tam ekran: sağdaki ray deliğin dışında bir sütun (katmanın kendisi, adacık gerekmez)', JSON.stringify({ dockR, cover, rects }));
const railFs = await RAIL_VS_FILM();
check(railFs.apart, 'tam ekran: ray filmin videosunun üstünde değil', JSON.stringify(railFs));
  check(!rects.some(isHole), 'tam ekran: videoya tıklamayı film oynatıcısı alıyor (deliğin tamamını kaplayan adacık yok)', JSON.stringify(rects));
  check(!rects.some((r) => r.b > screenH - 60 && r.r - r.x > 300), 'tam ekran: filmin alt kısmında (kendi çubuğu) bizim bir şeyimiz yok', JSON.stringify(rects));
  // Card 2b: the mouse goes back onto the film (its frames report the move): the rail goes and the film widens again.
  riley.send({ t: 'play', position: 60, at: Date.now() });
  if (HEADFUL) {
    await a.mouse('mouseMoved', screenW / 2, screenH / 2);
    await a.sleep(150);
    await a.mouse('mouseMoved', screenW / 2 - 20, screenH / 2);
    const closed = await until(() => a.evalFrame('shell=1', DOCK_IDLE), 2500);
    await a.sleep(500);
    check(!!closed && near(await holeRight(), wideRight, 3), 'tam ekran: fare filme dönünce ray kapanıyor, film yine genişliyor', JSON.stringify({ closed, right: await holeRight(), wideRight }));
    // A mouse passing by the edge (shorter than the open delay) doesn't make the film jump.
    await passBy({ x: screenW / 2, y: screenH / 2 });
    await a.sleep(400);
    check(!!(await a.evalFrame('shell=1', DOCK_IDLE)) && near(await holeRight(), wideRight, 3), 'tam ekran: kenardan geçip giden fare rayı açmıyor (film zıplamıyor)');
    // EXT1 (owner): the rail out at the right edge, the mouse goes back to the middle at a person's pace (over the rail
    // and the film's last 40 px): the rail stayed out until pause / play.
    await toEdge();
    await until(async () => !(await a.evalFrame('shell=1', DOCK_IDLE)), 2000);
    await a.sleep(800);
    for (let x = screenW - 8; x >= screenW / 2; x -= 40) {
      await a.mouse('mouseMoved', x, screenH / 2);
      await a.sleep(35);
    }
    const sweptBack = await until(() => a.evalFrame('shell=1', DOCK_IDLE), 2500);
    check(!!sweptBack, 'tam ekran: ray açıkken fare sağ kenardan ortaya kayınca ray kapanıyor (EXT1)');
    riley.send({ t: 'pause', position: 62, at: Date.now() });
    await a.sleep(800);
    await toEdge();
    await until(async () => !(await a.evalFrame('shell=1', DOCK_IDLE)), 2000);
    await a.sleep(400);
  } else {
    riley.send({ t: 'pause', position: 62, at: Date.now() });
    await a.sleep(800);
  }
  // The emoji window opens to the left of the dock: also an island.
  await a.evalFrame('shell=1', `document.getElementById('dock-react').click(); 1`);
  await a.sleep(500);
  const popR = await a.evalFrame('shell=1', `(() => { const r = document.getElementById('dock-react-pop').getBoundingClientRect(); return { x: r.left, y: r.top, r: r.right, b: r.bottom }; })()`);
  const popRects = clipRects(await a.evaluate(`getComputedStyle(${SHELL}).clipPath`)).slice(2);
  check(popR.r - popR.x > 100 && popRects.some((r) => inside(popR, r)), 'tam ekran: dock\'un emoji penceresi de adacık', JSON.stringify({ popR, popRects }));
  await a.shot('8a-dock-emoji');
  await a.evalFrame('shell=1', `document.getElementById('dock-react').click(); 1`);
  await a.sleep(400);
  riley.send({ t: 'play', position: 64, at: Date.now() });
}
{
  const pinsHidden = await a.evalFrame(
    'shell=1',
    `({ fs: getComputedStyle(document.getElementById('fs-pins')).display, strip: getComputedStyle(document.getElementById('pin-strip')).display })`,
  );
  check(pinsHidden.fs === 'none' && pinsHidden.strip === 'none', 'tam ekranda pin şeritleri gizli (#fs-pins, .pin-strip)', JSON.stringify(pinsHidden));

  const box = await a.evaluate(`(() => { const e = document.querySelector('[data-swm-focus]'); const r = e?.getBoundingClientRect(); return r ? { tag: e.tagName, id: e.id, top: r.top, bottom: r.bottom, h: r.height } : null; })()`);
  const holeRect = clipRects(await a.evaluate(`getComputedStyle(${SHELL}).clipPath`))[1];
  const screenH = await a.evaluate('innerHeight');
  const cue = await a.evaluate(`(() => { const t = document.querySelector('video').textTracks[0]; return t ? { mode: t.mode, active: t.activeCues?.length ?? 0 } : null; })()`);
  console.log('     tam ekran: oynatıcı', JSON.stringify(box), 'delik', JSON.stringify(holeRect), 'altyazı', JSON.stringify(cue));
  check(cue?.mode === 'showing' && cue.active > 0, 'film videosunun altyazısı açık (WebVTT, aktif satır var)', JSON.stringify(cue));
  // The film is never made smaller for our bar any more: the player fills the screen.
  check(!!box && near(box.bottom, screenH, 2) && box.h > screenH - 4, 'tam ekranda film küçülmüyor (oynatıcı ekranın altına kadar)', `oynatıcı:${JSON.stringify(box)} ekran:${screenH}`);
  const fsImg = await a.pixels('8-tam-ekran-altyazi');
  const dock = await a.evalFrame(
    'shell=1',
    `(() => { const d = document.getElementById('fs-dock'); const b = document.getElementById('dock-chat'); const r = b.getBoundingClientRect(); const dr = d.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { display: getComputedStyle(d).display, hit: hit?.closest('button')?.id ?? null, x: dr.left, y: dr.top, r: dr.right, b: dr.bottom }; })()`,
  );
  let dockLit = 0;
  for (let x = Math.ceil(dock.x) + 4; x < dock.r - 4; x += 4) for (let y = Math.ceil(dock.y) + 4; y < dock.b - 4; y += 6) if (Math.max(...fsImg.at(x, y)) > 150) dockLit++;
  console.log('     dock:', JSON.stringify(dock), 'parlak nokta:', dockLit);
  check(dock.display !== 'none' && dock.hit === 'dock-chat' && dockLit > 10, 'tam ekranda dock görünüyor (ikonlar çiziliyor, düğmeye basılabiliyor)', `${JSON.stringify(dock)} parlak:${dockLit}`);
  await a.press('1', 'Digit1', 49); // tam ekranda uçan emoji de adacık olsun
  await a.sleep(400);
  const fsFloat = await a.evalFrame('shell=1', `(() => { const r = [...document.querySelectorAll('#reactions-layer .r-float')].at(-1)?.getBoundingClientRect(); return r ? { y: r.top, b: r.bottom } : null; })()`);
  console.log('     tam ekranda uçan emoji:', JSON.stringify(fsFloat));
  await a.shot('8b-tam-ekran-emoji');
  const fsRects = clipRects(await a.evaluate(`getComputedStyle(${SHELL}).clipPath`));
  // evenodd: delik dışında kalan bir adacık ekranla çift sayılır → orası katmandan kesilir (film sayfası görünür).
  const outside = fsRects.slice(2).filter((r) => r.b > fsRects[1].b + 1 || r.y < fsRects[1].y - 1 || r.x < fsRects[1].x - 1 || r.r > fsRects[1].r + 1);
  console.log('     tam ekran clip:', JSON.stringify(fsRects));
  check(outside.length === 0, 'tam ekranda deliğin dışına taşan adacık yok (evenodd o bölgeyi katmandan keserdi)', JSON.stringify(outside));
  check(!!holeRect && near(holeRect.b, screenH, 2), 'tam ekranda delik ekranın altına kadar (filmin çubuğu açık)', `delik alt:${holeRect?.b}`);

  // Messages flow up next to the dock (right-aligned to its left edge).
  // The film is paused for these two pictures: its moving bar crossed the message's place between them (R25 moved the
  // message lower, into its path), which made a see-through box look different.
  riley.send({ t: 'pause', position: 75, at: Date.now() });
  await a.sleep(1500);
  const noHandle = await a.pixels('9a-mesajsiz');
  riley.send({ t: 'chat', text: 'tam ekranda saydam mi' });
  await until(() => a.evalFrame('shell=1', `!!document.querySelector('#toasts .toast')`), 5000);
  await a.sleep(400);
  const withHandle = await a.pixels('9b-mesaj');
  const toastR = await a.evalFrame('shell=1', `(() => { const e = document.querySelector('#toasts .toast:last-child'); const r = e?.getBoundingClientRect(); return r ? { x: r.left, y: r.top, r: r.right, b: r.bottom } : null; })()`);
  check(!!toastR && toastR.r <= dock.x - 4 && dock.x - toastR.r < 30 && toastR.b <= dock.b + 2, 'tam ekranda mesaj dock\'un hemen solunda', JSON.stringify({ toastR, dock }));
  // Cards R21 + R25: on the right side, below the rail's message box (40–60 % down), with big text, visible.
  const look = JSON.parse(await a.evalFrame('shell=1', `(() => { const e = document.querySelector('#toasts .toast:last-child'); const c = getComputedStyle(e); return JSON.stringify({ font: parseFloat(c.fontSize), vis: c.visibility }); })()`));
  const down = toastR ? Math.round((toastR.y / screenH) * 100) : -1;
  check(down >= 40 && down <= 60 && look.font >= 16 && look.vis === 'visible', 'tam ekranda mesaj sağda, mesaj kutusunun altında (ekranın %40–60 aşağısında), büyük yazıyla görünüyor (R21, R25)', JSON.stringify({ down, ...look }));
  /** Kutunun sol iç boşluğundaki noktalar (yazıdan uzak): beklenen B ≈ (1 − opaklık) × A. */
  const padSample = (r, keep, img) => {
    let ok = 0;
    let n = 0;
    let lit = 0;
    let flat = 0;
    for (let y = r.y + 3; y <= r.b - 3; y += 2) {
      for (let x = r.x + 3; x <= r.x + 9; x += 2) {
        const A = noHandle.at(x, y);
        const B = img.at(x, y);
        const want = A.map((v) => v * keep);
        n++;
        if (pxDiff(B, want) <= 22) ok++;
        if (bright(A)) lit++;
        if (flatDark(B) && bright(A)) flat++;
      }
    }
    return { n, ok, lit, flat };
  };
  if (toastR) {
    const ts = padSample(toastR, 0.3, withHandle);
    console.log('     mesaj:', JSON.stringify(toastR), JSON.stringify(ts));
    // Where the film is dark "lit" can be 0; an opaque grey box would still show as flat dark pixels over bright ones.
    check(ts.n > 10 && ts.ok / ts.n >= 0.8 && ts.flat === 0, 'tam ekranda gelen mesajın altında video görünüyor (saydam)', JSON.stringify(ts));
  } else check(false, 'tam ekranda gelen mesaj göründü');
  riley.send({ t: 'play', position: 75, at: Date.now() });
}
await a.evalFrame('shell=1', `document.getElementById('dock-exit').click(); 1`);
await a.sleep(800);
check(!(await until(() => a.evalFrame('shell=1', `document.getElementById('theater').classList.contains('fake-fs')`), 1500)), 'dock\'taki çıkış düğmesi tam ekrandan çıkardı');

// 8) Başkası odada sitenin oynattığı bir şey açar (senkron testi): katman tamamen açılır, film durur.
riley.send({ t: 'load', media: { kind: 'test' } });
const open = await until(() => a.evaluate(`getComputedStyle(document.querySelector('iframe[src^="chrome-extension://"]')).clipPath === 'none'`));
check(!!open, 'odada sitenin oynattığı video: katmanda delik kapandı');
check(await until(() => a.evaluate(`document.querySelector('video').paused`)), 'film videosu kendiliğinden durdu (odaya "durdur" gitmedi)');
check(riley.state?.item?.media.kind === 'test', 'oda yeni videoda kaldı (film durunca oda durmadı)');
await a.shot('2-site-oynatici');

// 9) Başkası yeni bir film sayfası açar → "Filme git" kartı; basınca sekme gider, iç içe oynatıcı deliğe oturur.
riley.send({ t: 'load', media: { kind: 'page', url: `${FILM}/deny-nested` } });
const card = await until(() => a.evalFrame('shell=1', `!document.getElementById('external').hidden && !document.getElementById('external-go').hidden`));
check(!!card, 'başkasının açtığı film için katmanda "Filme git" kartı');
await a.evalFrame('shell=1', `document.getElementById('external-go').click()`);
check(!!(await until(async () => String(await a.evaluate('location.href')).includes('/deny-nested'))), '"Filme git" → sekme yeni film sayfasına gitti');
const nested = await until(
  () => a.evaluate(`(() => { const s = document.querySelector('iframe[src^="chrome-extension://"]'); const f = document.querySelector('iframe[data-swm-focus]'); return !!s && getComputedStyle(s).clipPath.startsWith('path(') && !!f; })()`),
  20000,
);
check(!!nested, 'gömmeyi yasaklayan sayfa, iç içe oynatıcı: oynatıcı çerçevesi deliğe yerleşti');
await a.sleep(800);
await a.shot('3-ic-ice');
// EXT1 (owner): the film's own ⛶ inside a player frame of another origin opens the room's fullscreen and closes it again.
{
  const nestedFs = async () => {
    const f = await a.evaluate(`(() => { const f = document.querySelector('iframe[data-swm-focus]'); const r = f.getBoundingClientRect(); return { x: r.left, y: r.top }; })()`);
    const b = await a.evalFrame('/player', `(() => { const r = document.getElementById('fs').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (f && b) await a.click(f.x + b.x, f.y + b.y);
  };
  await nestedFs();
  const inFs = await until(async () => (await a.evaluate(PAGE_FS)) && (await a.evalFrame('shell=1', IN_FS)), 4000);
  check(!!inFs, 'iç içe oynatıcı: filmin ⛶ düğmesi → odanın tam ekranı (bütün sayfa) (EXT1)');
  await a.sleep(1000);
  // Headless Chrome routes a mouse press over the fullscreen page wrongly between our overlay and the film's frames
  // (see HEADFUL above), so there the second press is the film button's own click(); headful (xvfb-run) uses the mouse.
  if (HEADFUL) await nestedFs();
  else await a.evalFrame('/player', `document.getElementById('fs').click(); 1`);
  const outFs = await until(async () => !(await a.evaluate('!!document.fullscreenElement')) && !(await a.evalFrame('shell=1', IN_FS)), 4000);
  check(!!outFs, 'iç içe oynatıcı: filmin ⛶ düğmesine ikinci basış tam ekrandan çıkarıyor (EXT1)');
  if (!outFs) await a.evalFrame('shell=1', `document.getElementById('dock-exit').click(); 1`);
  await a.sleep(800);
}

// 9b) Video sonradan gelen sayfa (/late): oda görünümü hemen (video başlamadan) gelir, olası oynatıcı kutusu deliğe
// oturur. Aynı sekme aynı sitede: örtü sayfa yüklenirken hemen (document_start, sessionStorage işareti) gelmeli.
riley.send({ t: 'load', media: { kind: 'page', url: `${FILM}/late` } });
const lateCard = await until(() => a.evalFrame('shell=1', `!document.getElementById('external').hidden && !document.getElementById('external-go').hidden`));
check(!!lateCard, '/late için "Filme git" kartı');
const stopFlash2 = await recordFlash('late');
await a.evalFrame('shell=1', `document.getElementById('external-go').click()`);
const t0 = Date.now();
check(!!(await until(async () => String(await a.evaluate('location.href')).includes('/late'), 10000)), '"Filme git" → sekme /late sayfasına gitti');
const lateFull = await until(
  () =>
    a.evaluate(
      `(() => { const s = ${SHELL}; const f = document.querySelector('[data-swm-focus]'); return s && getComputedStyle(s).clipPath.startsWith('path(') && f ? { focus: f.tagName + '#' + f.id + '.' + f.className, go: !!document.getElementById('go'), video: !!document.querySelector('video') } : null; })()`,
    ),
  10000,
);
console.log(`     /late: ${Date.now() - t0} ms sonra`, JSON.stringify(lateFull));
{
  const flash = await stopFlash2();
  console.log('     flaş /late:', JSON.stringify(flash));
  check(flash.frames > 0 && flash.worst < 0.3, 'film sayfasından /late sayfasına geçerken film sitesi hiçbir karede görünmedi (flaş yok)', JSON.stringify(flash));
}
check(!!lateFull && lateFull.go, '/late: video başlamadan oda görünümü (katmanda clip-path delik) geldi', JSON.stringify(lateFull));
check(!!lateFull && /slot|player/.test(lateFull.focus), '/late: olası oynatıcı kutusu (#slot.player) data-swm-focus aldı', JSON.stringify(lateFull));
await a.shot('10-late-oda-gorunumu');
{
  const l = await coverLog();
  console.log('     örtü /late:', coverText(l));
  check(!!l && (l.atStart || l.added !== null), '/late (aynı sitede sonraki sayfa): örtü eklendi', coverText(l));
  check(
    !!l && (l.atStart || (l.added !== null && (l.firstPaint === null || l.added <= l.firstPaint))),
    '/late: örtü sayfanın ilk boyamasından önce vardı (film sitesi hiç görünmedi)',
    coverText(l),
  );
  check(!!l && l.removed !== null && !l.now, '/late: oda görünümü gelince örtü kalktı', coverText(l));
}
// ▶'a deliğin içinden basılır → oynatıcı çerçevesi yüklenir, odak ona geçer.
const goAt = await a.center('#go');
if (goAt) await a.click(goAt.x, goAt.y);
const lateFrame = await until(() => a.evaluate(`!!document.querySelector('iframe[data-swm-focus]')`), 15000);
check(!!lateFrame, "/late: ▶'a delikten basıldı → oynatıcı çerçevesi deliğe yerleşti");
await a.sleep(800);
await a.shot('11-late-oynatici');

// 9b-2) "👁 Sayfayı göster": katman üstte 48 px şeride çekilir (film sayfası olduğu gibi), "Oda görünümü" ile geri gelir.
{
  await a.evalFrame('shell=1', `document.querySelector('.shell-peek').click(); 1`);
  const peeked = await until(async () => {
    const s = await a.evaluate(`(() => { const f = ${SHELL}; return { h: f.style.height, clip: getComputedStyle(f).clipPath, focus: document.documentElement.classList.contains('swm-focus') }; })()`);
    return s.h === '48px' && s.clip === 'none' && !s.focus ? s : null;
  }, 5000);
  check(!!peeked, '👁 Sayfayı göster: katman 48 px şeride çekildi, video sayfası olduğu gibi görünüyor', JSON.stringify(peeked));
  await a.evalFrame('shell=1', `document.querySelector('.peek-strip .btn').click(); 1`);
  const backToRoom = await until(() => a.evaluate(`getComputedStyle(${SHELL}).clipPath !== 'none'`), 5000);
  check(!!backToRoom, '"Oda görünümü" ile katman geri geldi (delik yeniden açıldı)');
}

// 9b-3) Elle video seçimi: sayfada iki video var, otomatik seçim büyük "fragmanı" tutar. "🎯 Video seç" → film sayfası
// görünür, videoların üstünde düğmeler; küçük videonunkine basılır → senkron ve delik o videoya geçer.
{
  riley.send({ t: 'load', media: { kind: 'page', url: `${FILM}/two` } });
  const twoCard = await until(() => a.evalFrame('shell=1', `!document.getElementById('external').hidden && !document.getElementById('external-go').hidden`));
  check(!!twoCard, '/two için "Filme git" kartı');
  await a.evalFrame('shell=1', `document.getElementById('external-go').click()`);
  const focusOf = `(() => { const f = document.querySelector('[data-swm-focus]'); return f ? (f.querySelector('video') ?? f).id : null; })()`;
  const auto = await until(async () => (await a.evaluate(`location.pathname === '/two' && ${focusOf}`)) || null, 15000);
  check(auto === 'big', 'otomatik seçim büyük videoyu (fragman) deliğe oturttu', String(auto));
  const pickShown = await until(() => a.evalFrame('shell=1', `(() => { const b = document.querySelector('.shell-pick'); return !!b && !b.hidden; })()`), 5000);
  check(!!pickShown, 'film açıkken katmanda "🎯 Video seç" düğmesi var');
  await a.evalFrame('shell=1', `document.querySelector('.shell-pick').click(); 1`);
  const picking = await until(async () => {
    const s = await a.evaluate(`(() => { const f = ${SHELL}; return { h: f.style.height, focus: document.documentElement.classList.contains('swm-focus'), picker: !!document.querySelector('swm-picker') }; })()`);
    return s.h === '48px' && !s.focus && s.picker ? s : null;
  }, 5000);
  check(!!picking, 'seçim modu: katman şeride çekildi, film sayfası görünüyor, videoların üstünde düğmeler var', JSON.stringify(picking));
  await a.shot('12-video-secimi');
  const at = await a.center('#small');
  await a.sleep(700);
  if (at) await a.click(at.x, at.y);
  const chosen = await until(async () => {
    const s = await a.evaluate(`(() => ({ focus: ${focusOf}, clip: getComputedStyle(${SHELL}).clipPath, picker: !!document.querySelector('swm-picker') }))()`);
    return s.focus === 'small' && s.clip.startsWith('path(') && !s.picker ? s : null;
  }, 8000);
  check(!!chosen, 'küçük video seçildi: oda görünümüne dönüldü, delikte artık o video', JSON.stringify(chosen));
  riley.send({ t: 'play', position: 30, at: Date.now() });
  const follows = await until(() => a.evaluate(`(() => { const s = document.getElementById('small'); return !s.paused && Math.abs(s.currentTime - 30) < 3; })()`), 10000);
  check(!!follows, 'oda oynatınca seçilen (küçük) video oynuyor, odanın yerinde');
  check(await a.evaluate(`document.getElementById('big').paused`), 'fragman oynamıyor (senkron ondan çıktı)');
  riley.send({ t: 'pause', position: 40, at: Date.now() });
}

// 9b-4) Reklam sekmesi: film sayfası ilk tıklamada başka siteye yeni sekme açar → eklenti kapatır, film sekmesi önde
// kalır, katmanda "kapatıldı · Geri aç" notu; "Geri aç" sekmeyi açar (bu kez kapatılmaz).
const goFilm = async (path) => {
  riley.send({ t: 'load', media: { kind: 'page', url: `${FILM}${path}` } });
  const card = await until(() => a.evalFrame('shell=1', `!document.getElementById('external').hidden && !document.getElementById('external-go').hidden`));
  if (card) await a.evalFrame('shell=1', `document.getElementById('external-go').click()`);
  return until(async () => (await a.evaluate(`location.pathname === ${JSON.stringify(path)} && getComputedStyle(${SHELL}).clipPath.startsWith('path(')`)) || null, 15000);
};
const adTabs = async () => ((await a.browser('Target.getTargets')).result?.targetInfos ?? []).filter((t) => t.type === 'page' && t.url.includes('127.0.0.2:5299/ad'));
{
  check(!!(await goFilm('/popup')), '/popup: oda görünümü açıldı');
  await a.sleep(800);
  const at = await a.center('#v');
  if (at) await a.click(at.x, at.y + 40);
  const note = await until(() => a.evalFrame('shell=1', `(() => { const n = document.getElementById('tab-closed'); return n ? n.textContent : null; })()`), 8000);
  check(!!note && note.includes('127.0.0.2'), 'film sayfasının açtığı reklam sekmesi kapatıldı, katmanda not var', String(note));
  check((await adTabs()).length === 0, 'reklam sekmesi açık kalmadı');
  await a.evalFrame('shell=1', `document.querySelector('#tab-closed .btn').click(); 1`);
  const reopened = await until(async () => (await adTabs()).length === 1, 6000);
  check(!!reopened, '"Geri aç" reklam sekmesini geri açtı (bu kez kapatılmadı)');
  for (const t of await adTabs()) await a.browser('Target.closeTarget', { targetId: t.targetId });
}

// 9b-5) Yönlendirme: film sayfası ilk tıklamada sekmeyi başka siteye götürür → katman kalkmaz, "Filme geri dön" kartı;
// basınca film sayfasına dönülür.
{
  check(!!(await goFilm('/redirect')), '/redirect: oda görünümü açıldı');
  // Video deliğe yerleşsin (yerleşim birkaç kare sürer); tıklama kaçarsa bir kez daha.
  await a.sleep(800);
  for (let i = 0; i < 2; i++) {
    const at = await a.center('#v');
    if (at) await a.click(at.x, at.y + 40);
    if (await until(async () => String(await a.evaluate('location.href')).includes('127.0.0.2'), 3000)) break;
  }
  const stray = await until(async () => {
    const href = String(await a.evaluate('location.href'));
    if (!href.includes('127.0.0.2:5299/ad')) return null;
    return (await a.evalFrame('shell=1', `(() => { const s = document.getElementById('external-stray'); return !!s && !s.hidden && !document.getElementById('external').hidden ? document.getElementById('external-go').textContent : null; })()`)) || null;
  }, 12000);
  check(!!stray, 'reklam yönlendirmesi: katman kalktı değil, "Filme geri dön" kartı çıktı', String(stray));
  await a.shot('13-filme-geri-don');
  await a.evalFrame('shell=1', `document.getElementById('external-go').click(); 1`);
  const back = await until(async () => (await a.evaluate(`location.pathname === '/redirect' && !!${SHELL}`)) || null, 12000);
  check(!!back, '"Filme geri dön" → sekme film sayfasına döndü, oda görünümü yerinde');
}

// 9b-6) Ön-reklam (aynı <video>'da 12 sn'lik kısa video, sonra film): oda bu kişiyi beklemez, kişiler listesinde
// "reklamda" görünür; reklam bitince işaret kalkar ve film odanın yerine atlar.
if (process.env.FILM_AD) {
  check(!!(await goFilm('/preroll')), '/preroll: oda görünümü açıldı');
  riley.send({ t: 'play', position: 100, at: Date.now() });
  await riley.wait((m) => m.t === 'state' && !m.state.paused, 5000);
  riley.clear();
  const inAd = await until(() => riley.members?.some((m) => m.name === 'Sam' && m.ad), 10000);
  check(!!inAd, 'ön-reklam oynarken Sam kişiler listesinde "reklamda"');
  await a.sleep(1500);
  check(riley.count((m) => m.t === 'state' && m.state.paused) === 0, 'reklamdaki kişi için oda durmadı (herkes hazır beklemesi yok)');
  const done = await until(async () => {
    const v = await a.evaluate(`(() => { const v = document.getElementById('v'); return { src: v.currentSrc, t: v.currentTime, p: v.paused }; })()`);
    return !riley.members?.some((m) => m.name === 'Sam' && m.ad) && !v.src.includes('/ad.webm') && !v.p && v.t > 100 ? v : null;
  }, 30000);
  check(!!done, 'reklam bitti: işaret kalktı, film odanın yerinde (100+ sn) oynuyor', JSON.stringify(done));
  riley.send({ t: 'pause', position: 130, at: Date.now() });
} else {
  console.log('     (FILM_AD yok: ön-reklam testi atlandı)');
}

// 9c) İlgisiz bir sitedeki sekmede (oda varken) örtü ve katman hiç olmamalı.
{
  // 127.0.0.2: 127.0.0.1'den farklı site, yine yerel döngü. [::1] IPv6'sız Linux konteynerinde (bulut) açılmıyordu.
  const other = await a.openTab('http://127.0.0.2:5299/film', COVER_SCRIPT);
  await a.sleep(3500);
  const o = await other.evaluate(
    `({ href: location.href, log: window.__swmCover ?? null, cover: !!document.querySelector('[data-swm-cover]'), shell: !!document.querySelector('iframe[src^="chrome-extension://"]') })`,
  );
  console.log('     ilgisiz sekme:', JSON.stringify(o));
  // Flaş ölçüsünün sağlaması: katmansız film sayfasında sol şerit bej olmalı.
  const plain = beigeShare(decodePng(await other.capture()));
  check(plain > 0.8, 'flaş ölçüsü sağlaması: katmansız film sayfasında bej oranı yüksek', String(plain));
  check(!!o?.log && !o.cover && !o.shell && !o.log.atStart && o.log.added === null, 'ilgisiz sitedeki sekmede örtü ve katman hiç yok', JSON.stringify(o));
  await other.close();
}

// 9z) The site's windows are always in front of the film (owner's report: ⚙️ showed the film over the settings for a
// second, "Odaya dön" only blurred the screen). Right after a window opens, the hole is covered by an island (the
// overlay paints there) and the window's middle is our dialog, not the film.
const holeCovered = async () => {
  const rects = clipRects(await a.evaluate(SHELL_CLIP));
  const hole = rects[1];
  return !!hole && rects.slice(2).some((r) => r.x <= hole.x + 2 && r.y <= hole.y + 2 && r.r >= hole.r - 2 && r.b >= hole.b - 2);
};
const filmVisibleAt = async (selector) => {
  const c = await a.evalFrame('shell=1', `(() => { const r = document.querySelector('${selector}')?.getBoundingClientRect(); return r && { x: r.left + r.width / 2, y: r.top + 20 }; })()`);
  if (!c) return null;
  const img = decodePng(Buffer.from((await a.cdp('Page.captureScreenshot', { format: 'png' })).result.data, 'base64'));
  const frameAt = await a.evaluate(`(() => { const r = ${SHELL}.getBoundingClientRect(); return { x: r.left, y: r.top, s: devicePixelRatio }; })()`);
  const [r, g, b] = img.at((frameAt.x + c.x) * frameAt.s, (frameAt.y + c.y) * frameAt.s);
  return { r, g, b, inHole: !(await holeCovered()) };
};
{
  await a.evalFrame('shell=1', `document.getElementById('settings-open').click(); 1`);
  await a.sleep(150);
  const fast = await holeCovered();
  check(fast, 'film sayfası: ⚙️ ayarlar açılır açılmaz delik kapanıyor (film pencerenin üstüne binmiyor)');
  await a.shot('9z-ayarlar');
  await a.evalFrame('shell=1', `document.getElementById('settings-close').click(); 1`);
  await a.sleep(400);
}
// 10) Odaya dön: sekme sitedeki odaya döner, katman kalkar, ayar (tema) ana sitede de geçerli.
await a.evalFrame('shell=1', `document.querySelector('.shell-home').click()`);
await a.sleep(150);
check(await a.evalFrame('shell=1', `!!document.querySelector('.confirm-dialog')`), 'Odaya dön önce soruyor');
{
  const seen = await filmVisibleAt('.confirm-dialog');
  check(!!seen && !seen.inHole, '"Odaya dön" sorusu filmin önünde görünüyor (delik kapalı)', JSON.stringify(seen));
  await a.shot('10-odaya-don-sorusu');
}
await a.evalFrame('shell=1', `document.querySelector('.confirm-dialog .btn.primary').click(); 1`);
check(!!(await until(async () => String(await a.evaluate('location.href')).startsWith(`${SITE}/r/${room}`))), 'Odaya dön → sekme sitedeki odada');
await a.sleep(2500);
check((await a.evaluate(`document.documentElement.dataset.theme`)) === 'okyanus', 'katmanda seçilen tema ana sitede de geçerli');
const back = await until(() => riley.members.length === 2 && riley.members.filter((m) => m.name === 'Sam').length === 1, 10000);
check(!!back, 'Sam yine tek kez (artık ana sitenin bağlantısı)');
await a.shot('4-odaya-donus');

// 11) Ana sitede isim + avatar değişir (iki ayar art arda kaydedilir) → film sayfasında yeni isimle görünür.
// Eskiden eklentinin deposunda iki yazma birbirini eziyor, katman eski ismi kullanıyordu.
await a.evaluate(`(() => {
  const input = document.getElementById('rename-input');
  input.value = 'Sam Yeni';
  document.getElementById('rename-form').requestSubmit();
  return 1;
})()`);
await until(() => riley.members.some((m) => m.name === 'Sam Yeni'), 5000);
await a.sleep(800);
riley.send({ t: 'load', media: { kind: 'page', url: `${FILM}/film` } });
const renamedCard = await until(() => a.evaluate(`!document.getElementById('external').hidden && !document.getElementById('external-go').hidden`));
if (renamedCard) await a.evaluate(`document.getElementById('external-go').click(); 1`);
await until(async () => String(await a.evaluate('location.href')).includes('/film'), 10000);
const renamedShell = await until(
  () => a.evalFrame('shell=1', `document.querySelector('#people-count') ? 1 : 0`),
  15000,
);
await a.sleep(2500);
const names = riley.members.map((m) => m.name);
check(
  !!renamedShell && names.filter((n) => n === 'Sam Yeni').length === 1 && !names.includes('Sam'),
  'ana sitede değişen isim film sayfasında da geçerli (eski isimle görünmüyor)',
  JSON.stringify(names),
);

riley.close();
a.close();
console.log(failed ? `\n✗ ${failed} kontrol başarısız` : '\n✓ Tüm kontroller geçti');
process.exit(failed ? 1 : 0);
