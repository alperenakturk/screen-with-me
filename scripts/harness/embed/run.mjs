// "Film sitenin içinde" uçtan uca testi: gerçek Chrome + eklenti + sahte ikinci kullanıcı.
//
//   npm run build:extension:dev
//   npm run dev                                   (sunucu 8787 + site 5173)
//   node scripts/harness/embed/film-server.mjs    (sahte video sitesi 5299/5300)
//   node scripts/harness/embed/run.mjs [eklenti-klasörü] [site] [sunucu-ws] [çıktı-öneki]
//
// Film sayfası 127.0.0.1'de açılır (site localhost'ta): farklı site sayılır, yani gerçek
// hayattaki gibi ayrı süreçte (OOPIF) ve üçüncü taraf çerçevede çalışır.
import { resolve } from 'node:path';
import { launch } from './cdp.mjs';

const EXT = resolve(process.argv[2] ?? 'apps/extension/dist');
const SITE = process.argv[3] ?? 'http://localhost:5173';
const WS = process.argv[4] ?? 'ws://localhost:8787';
const OUT = process.argv[5] ?? resolve('embed-test');
const FILM = 'http://127.0.0.1:5299';

let failed = 0;
const check = (ok, text, detail = '') => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${text}${!ok && detail ? ` → ${detail}` : ''}`);
};
const near = (a, b, tolerance = 1.5) => typeof a === 'number' && Math.abs(a - b) <= tolerance;

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
  const position = () => (state.paused ? state.position : state.position + ((Date.now() - state.updatedAt) / 1000) * state.rate);
  return {
    send: (m) => ws.send(JSON.stringify(m)),
    wait,
    clear: () => inbox.splice(0),
    get state() {
      return state;
    },
    get members() {
      return members;
    },
    position,
    close: () => ws.close(),
  };
}

const room = 'emb' + Math.random().toString(36).slice(2, 7);
const a = await launch({ ext: EXT, out: OUT });
check(!a.loaded.error, 'eklenti yüklendi', JSON.stringify(a.loaded.error));

// Ayşe: sitede, "filmleri burada aç" açık.
await a.navigate(`${SITE}/`);
await a.sleep(1500);
await a.evaluate(
  `localStorage.setItem('name','Ayşe'); localStorage.setItem('avatar','wizard'); localStorage.setItem('identityAt', String(Date.now())); localStorage.setItem('opt:embed','1'); localStorage.setItem('lang','tr'); 1`,
);
await a.navigate(`${SITE}/r/${room}#back`);
await a.sleep(3500);
check((await a.evaluate(`document.documentElement.dataset.swmEmbed`)) === '1', 'site eklentinin gömme desteğini görüyor');

const bora = await fakeUser(room, 'Bora');
const videoTime = (frame) => a.evalFrame(frame, `(() => { const v = document.querySelector('video'); return v ? { t: v.currentTime, paused: v.paused, rate: v.playbackRate } : null; })()`);

// ---- 1) İç içe oynatıcılı film sayfası sitenin içinde açılır ----
bora.send({ t: 'load', media: { kind: 'page', url: `${FILM}/film-nested` }, title: 'Big Buck Bunny (test)' });
await a.sleep(7000);
const view = await a.evaluate(`(() => ({
  embed: !!window.__swm?.embed(),
  loading: document.getElementById('embed-loading').hidden,
  external: document.getElementById('external').hidden,
  iframe: document.querySelector('#player iframe')?.src ?? null,
  out: !document.getElementById('embed-out').hidden,
  url: location.href,
}))()`);
check(view?.embed && view.loading && view.external && view.iframe?.startsWith(FILM), 'film sayfası odanın içinde açıldı (sekme gitmedi)', JSON.stringify(view));
check(view?.url?.startsWith(`${SITE}/r/${room}`), 'sekme sitede kaldı', view?.url);
check(view?.out, '"Ayrı sekmede aç" düğmesi görünüyor');
const ayse = bora.members.filter((m) => m.name === 'Ayşe');
check(ayse.length === 1 && ayse[0].client !== 'ext', 'Ayşe odada tek kez görünüyor (site bağlantısı, eklentinin ayrı bağlantısı yok)', JSON.stringify(bora.members));
await a.shot('1-embedded');

// ---- 2) Odadan gelen komutlar çerçevedeki videoya uygulanır ----
bora.send({ t: 'play', position: 20, at: Date.now() });
await a.sleep(4000);
let v = await videoTime(':5300/player');
check(v && !v.paused && near(v.t, bora.position()), 'Bora oynattı → Ayşe’nin çerçevesindeki video oynuyor, aynı yerde', JSON.stringify({ v, room: bora.position() }));
await a.shot('2-playing');
bora.send({ t: 'pause', position: 42, at: Date.now() });
await a.sleep(2000);
v = await videoTime(':5300/player');
check(v?.paused && near(v.t, 42, 0.5), 'Bora durdurdu (42 sn) → çerçevede durdu', JSON.stringify(v));
const status = await a.evaluate(`(() => { const p = window.__swm.embed(); return { t: p.getTime(), d: p.getDuration(), paused: p.isPaused() }; })()`);
check(status && near(status.t, 42, 0.6) && status.d > 500 && status.paused, 'site çerçevedeki videonun durumunu biliyor (ilerleme çubuğu, pinler)', JSON.stringify(status));

// ---- 3) Ayşe çerçevenin içinde oynatıcıya tıklar → odaya yayılır ----
bora.clear();
/** İç içe oynatıcının kendi ⏯ düğmesinin sayfadaki yeri (site çerçevesi + oynatıcı çerçevesi + düğme). */
const videoPoint = async () => {
  await a.evaluate(`document.querySelector('#player').scrollIntoView({ block: 'center' }); 1`);
  const f = await a.evaluate(`(() => { const r = document.querySelector('#player iframe').getBoundingClientRect(); return { x: r.x, y: r.y }; })()`);
  const p = await a.evalFrame(':5299/film-nested', `(() => { const r = document.querySelector('iframe').getBoundingClientRect(); return { x: r.x, y: r.y }; })()`);
  const v = await a.evalFrame(':5300/player', `(() => { const r = document.getElementById('pp').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
  return { x: f.x + p.x + v.x, y: f.y + p.y + v.y };
};
const box = await videoPoint();
await a.click(box.x, box.y);
const played = await bora.wait((m) => m.t === 'state' && m.action === 'play');
check(played?.by?.name === 'Ayşe', 'Ayşe çerçevede oynattı → oda oynuyor (Ayşe adına)', JSON.stringify(played?.by));

// ---- 4) Kısayollar çerçevedeyken de çalışır (odak çerçevede) ----
bora.clear();
await a.press('1', 'Digit1', 49);
const reaction = await bora.wait((m) => m.t === 'reaction');
check(reaction?.by?.name === 'Ayşe', '1 tuşu (odak çerçevede) → emoji odaya gitti', JSON.stringify(reaction));
await a.sleep(400);
await a.shot('3-reaction');
await a.sleep(1500);
await a.press('Enter', 'Enter', 13);
await a.sleep(300);
const focused = await a.evaluate(`document.activeElement?.id`);
check(focused === 'chat-input', 'Enter (odak çerçevede) → sitedeki sohbet kutusu', focused);
await a.type('Merhaba, çerçeveden yazıyorum');
await a.press('Enter', 'Enter', 13);
const chat = await bora.wait((m) => m.t === 'chat');
check(chat?.message?.text === 'Merhaba, çerçeveden yazıyorum', 'sohbet mesajı odaya gitti');
bora.send({ t: 'chat', text: 'Görüyorum 👍' });
bora.send({ t: 'react', emoji: '😂' });
await a.sleep(600);
await a.shot('4-chat');

// ---- 5) Pin: site P → not → sunucu anı kendi durumundan hesaplar ----
await a.click(box.x, box.y); // odak tekrar çerçevede; ayrıca durdurur
await a.sleep(800);
bora.clear();
await a.press('p', 'KeyP', 80);
await a.sleep(300);
await a.type('Tavşan uyandı');
await a.press('Enter', 'Enter', 13);
const pins = await bora.wait((m) => m.t === 'pins' && m.pins.pins.length > 0);
check(pins?.pins?.pins?.[0]?.note === 'Tavşan uyandı', 'P (odak çerçevede) → pin eklendi', JSON.stringify(pins));

// ---- 6) Tam ekran: sitenin tam ekranı (arayüzümüz görünür) ----
const fs = await a.center('#fullscreen');
await a.click(fs.x, fs.y);
await a.sleep(1200);
check((await a.evaluate(`document.fullscreenElement?.id`)) === 'theater', 'sitenin ⛶ düğmesi → oda tam ekran (çerçeve içinde)');
await a.mouse('mouseMoved', 640, 500);
await a.sleep(300);
await a.shot('5-fullscreen');
await a.evaluate(`document.exitFullscreen().then(() => 1)`);
await a.sleep(800);

// Film sitesinin kendi tam ekran düğmesi: sitenin tam ekranına çevrilir.
await a.evaluate(`document.querySelector('#player').scrollIntoView({ block: 'center' }); 1`);
const inner = await a.evalFrame(':5300/player', `(() => { const r = document.getElementById('fs').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
const frameRect = await a.evaluate(`(() => { const r = document.querySelector('#player iframe').getBoundingClientRect(); return { x: r.x, y: r.y }; })()`);
// İç içe: film sayfasındaki oynatıcı iframe'inin yeri + düğmenin onun içindeki yeri.
const playerRect = await a.evalFrame(':5299/film-nested', `(() => { const r = document.querySelector('iframe').getBoundingClientRect(); return { x: r.x, y: r.y }; })()`);
await a.click(frameRect.x + playerRect.x + inner.x, frameRect.y + playerRect.y + inner.y);
await a.sleep(1500);
const afterNative = await a.evaluate(`document.fullscreenElement?.id ?? null`);
check(afterNative === 'theater', 'film sitesinin kendi ⛶ düğmesi → sitenin tam ekranı açıldı', String(afterNative));
await a.shot('6-native-fullscreen');
await a.evaluate(`document.fullscreenElement ? document.exitFullscreen().then(() => 1) : 1`);
await a.sleep(800);

// ---- 7) Çerçeveye izin vermeyen siteler: hemen ayrı sekme kartı ----
for (const [path, label] of [
  ['/deny', 'X-Frame-Options: DENY'],
  ['/csp', "CSP frame-ancestors 'none'"],
]) {
  bora.send({ t: 'load', media: { kind: 'page', url: `${FILM}${path}` } });
  await a.sleep(2500);
  const card = await a.evaluate(`(() => ({ external: !document.getElementById('external').hidden, note: document.getElementById('external-note').textContent, iframe: !!document.querySelector('#player iframe'), url: location.href }))()`);
  check(card?.external && !card.iframe && card.note.length > 10 && card.url.startsWith(SITE), `${label} → ayrı sekme kartı + açıklama (sekme sitede)`, JSON.stringify(card));
  if (path === '/deny') await a.shot('7-blocked');
}

// Başlıklardan anlaşılamayan yasak (sadece iframe isteğinde DENY): el sıkışma gelmez → kart.
bora.send({ t: 'load', media: { kind: 'page', url: `${FILM}/sneaky` } });
await a.sleep(7000);
const sneaky = await a.evaluate(`(() => ({ external: !document.getElementById('external').hidden, note: document.getElementById('external-note').textContent, iframe: !!document.querySelector('#player iframe') }))()`);
check(sneaky?.external && !sneaky.iframe && sneaky.note.length > 10, 'önceden anlaşılamayan yasak → birkaç saniyede ayrı sekme kartı', JSON.stringify(sneaky));
await a.shot('8-timeout');

// ---- 8) Video doğrudan film sayfasında (iç içe değil) ----
bora.send({ t: 'load', media: { kind: 'page', url: `${FILM}/film` } });
await a.sleep(5000);
bora.send({ t: 'play', position: 100, at: Date.now() });
await a.sleep(3000);
v = await videoTime(':5299/film');
check(v && !v.paused && near(v.t, bora.position()), 'video film sayfasının kendisinde → senkron', JSON.stringify({ v, room: bora.position() }));
bora.send({ t: 'rate', rate: 1.5, position: bora.position(), at: Date.now() });
await a.sleep(1500);
v = await videoTime(':5299/film');
// Motor küçük kaymayı ±%5 hızla kapatır; 1.5 civarı yeterli.
check(Math.abs((v?.rate ?? 0) - 1.5) < 0.08, 'hız 1.5x çerçeveye uygulandı', JSON.stringify(v));

// ---- 9) Odada doğrudan video açılınca çerçeve kapanır, site kendi oynatıcısına döner ----
bora.send({ t: 'load', media: { kind: 'html5', url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' } });
await a.sleep(2500);
const html5 = await a.evaluate(`(() => ({ iframe: !!document.querySelector('#player iframe'), video: !!document.querySelector('#player video'), embed: !!window.__swm.embed(), out: !document.getElementById('embed-out').hidden }))()`);
check(html5 && !html5.iframe && html5.video && !html5.embed && !html5.out, 'doğrudan video → çerçeve kapandı, sitenin oynatıcısı açıldı', JSON.stringify(html5));
bora.send({ t: 'load', media: { kind: 'page', url: `${FILM}/film` } });
await a.sleep(5000);
check(await a.evaluate(`!!window.__swm.embed() && document.getElementById('embed-loading').hidden`), 'film sayfasına dönünce yine odanın içinde açıldı');

// ---- 10) "Ayrı sekmede aç": bugünkü yola döner, aynı kişi iki kez görünmez ----
const out = await a.center('#embed-out');
await a.click(out.x, out.y);
await a.sleep(5000);
const url = await a.evaluate('location.href');
check(url?.startsWith(`${FILM}/film`), '"Ayrı sekmede aç" → sekme film sayfasına gitti (eklentiyle)', url);
const ayse2 = bora.members.filter((m) => m.name === 'Ayşe');
check(ayse2.length === 1 && ayse2[0].client === 'ext', 'Ayşe yine tek kez (artık eklenti bağlantısı)', JSON.stringify(bora.members));
await a.shot('9-separate-tab');

bora.close();
a.close();
console.log(failed ? `\n✗ ${failed} kontrol başarısız` : '\n✓ Tüm kontroller geçti');
process.exit(failed ? 1 : 0);
