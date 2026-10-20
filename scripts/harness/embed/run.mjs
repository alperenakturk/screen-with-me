// Film sayfasında oda görünümü (kabuk) uçtan uca testi: gerçek Chrome + eklenti + sahte ikinci kullanıcı.
//
//   npm run build:extension:dev
//   npm run dev                                   (sunucu 8787 + site 5173)
//   node scripts/harness/embed/film-server.mjs    (sahte video sitesi 5299/5300)
//   node scripts/harness/embed/run.mjs [eklenti-klasörü] [site] [sunucu-ws] [çıktı-öneki]
//
// Akış: Ayşe sitedeki odada bir film sayfası açar → sekme film sayfasına gider → eklenti sitenin
// oda sayfasını katman olarak açar → video bulununca katmanda delik açılır, video oraya oturur.
// Film sayfası 127.0.0.1'de (site localhost'ta): farklı site, yani gerçek hayattaki gibi.
import { resolve } from 'node:path';
import { launch } from './cdp.mjs';

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
const a = await launch({ ext: EXT, out: OUT });
check(!a.loaded.error, 'eklenti yüklendi', JSON.stringify(a.loaded.error));

// Ayşe: sitede (adı ve teması kayıtlı).
await a.navigate(`${SITE}/`);
await a.sleep(1500);
await a.evaluate(`localStorage.setItem('name','Ayşe'); localStorage.setItem('avatar','wizard'); localStorage.setItem('lang','tr'); 1`);
await a.navigate(`${SITE}/r/${room}#back`);
await a.sleep(3000);
check((await a.evaluate(`document.documentElement.dataset.swmShell`)) === '1', 'site eklentinin kabuğu bildiğini görüyor');
const bora = await fakeUser(room, 'Bora');
check(!!(await until(() => bora.members.length === 2)), 'Ayşe ve Bora odada');

// 1) Ayşe bir film sayfası açar → sekme oraya gider, eklenti katmanı açar.
await a.evaluate(`(() => { const i = document.getElementById('media-input'); i.value = '${FILM}/film'; i.form.querySelector('button[value=load]').click(); return 1; })()`);
// "Şimdi aç" önce kısaca anlatıp sorar.
check(!!(await until(() => a.evaluate(`!!document.querySelector('.confirm-dialog')`))), '"Şimdi aç" film linkinde önce soruyor');
await a.evaluate(`document.querySelector('.confirm-dialog .btn.primary').click(); 1`);
const onFilm = await until(async () => String(await a.evaluate('location.href')).startsWith(`${FILM}/film`));
check(!!onFilm, 'kendi açtığı film sayfasına sekme kendiliğinden gitti');
const shellUp = await until(() => a.evaluate(`!!document.querySelector('iframe[src^="chrome-extension://"]')`));
check(!!shellUp, 'film sayfasında odanın katmanı açıldı');
const once = await until(() => bora.members.length === 2 && bora.members.filter((m) => m.name === 'Ayşe').length === 1, 12000);
check(!!once, 'Ayşe odada yine tek kez (bağlantıyı katmandaki site tutuyor)', JSON.stringify(bora.members.map((m) => m.name)));

// 2) Video bulununca katmanda delik açılır, video deliğe yerleşir.
const holed = await until(() => a.evaluate(`getComputedStyle(document.querySelector('iframe[src^="chrome-extension://"]')).clipPath.startsWith('path(')`), 15000);
check(!!holed, 'video bulundu: katmanda videonun yeri delik');
check(await a.evaluate(`!!document.querySelector('[data-swm-focus]') && document.documentElement.classList.contains('swm-focus')`), 'film videosu deliğe yerleşti');
await a.sleep(800);
await a.shot('1-oda-gorunumu');

// 2b) Katmanda sıra ve link kutusu yok, profil sekmesi var; açılan pencere videonun önünde.
const SHELL_CLIP = `getComputedStyle(document.querySelector('iframe[src^="chrome-extension://"]')).clipPath`;
check(
  await a.evalFrame(
    'shell=1',
    `getComputedStyle(document.getElementById('media-form')).display === 'none' && getComputedStyle(document.querySelector('.tab[data-tab=queue]')).display === 'none' && !!document.querySelector('.tab[data-tab=profile]')`,
  ),
  'katmanda sıra ve link kutusu gizli, 👤 profil sekmesi var',
);
const clipBefore = await a.evaluate(SHELL_CLIP);
await a.evalFrame('shell=1', `(async () => { const m = await import('/src/themes.ts'); m.openThemeDialog(); return 1; })()`);
// Pencere açıkken delik tamamen kapanır: yolda ekran + delik + deliği kapatan adacık (3 parça).
const covered = await until(async () => {
  const clip = await a.evaluate(SHELL_CLIP);
  return clip !== clipBefore && (clip.match(/M/g) || []).length === 3 ? clip : null;
});
check(!!covered, 'tema penceresi açıkken delik kapandı (pencere videonun önünde)');
await a.shot('1b-pencere-onde');
await a.evalFrame('shell=1', `document.querySelector('.dialog-backdrop .btn.primary')?.click(); 1`);
check(!!(await until(async () => (await a.evaluate(SHELL_CLIP)) === clipBefore)), 'pencere kapanınca delik geri açıldı');

// 2c) Film sitesinin kendi ⛶ düğmesi → odanın tam ekranı (sitenin kontrolleri görünür).
const fsButton = await a.center('#fs');
if (fsButton) await a.click(fsButton.x, fsButton.y);
const fake = await until(() => a.evalFrame('shell=1', `document.getElementById('theater').classList.contains('fake-fs')`));
check(!!fake, 'film sitesinin ⛶ düğmesi → odanın tam ekranı');
await a.sleep(800);
await a.shot('1c-tam-ekran');
await a.evalFrame('shell=1', `document.getElementById('fs-exit').click(); 1`);
await a.sleep(800);

// 3) Senkron: Bora oynatır / durdurur → film videosu uyar.
bora.send({ t: 'play', position: 30, at: Date.now() });
const playing = await until(async () => {
  const v = await a.evaluate(`(() => { const v = document.querySelector('video'); return v && { t: v.currentTime, p: v.paused }; })()`);
  return v && !v.p && near(v.t, 30, 3) ? v : null;
}, 15000);
check(!!playing, 'Bora oynattı → film videosu oynuyor, aynı yerde', JSON.stringify(playing));
bora.send({ t: 'pause', position: 42, at: Date.now() });
const paused = await until(async () => {
  const v = await a.evaluate(`(() => { const v = document.querySelector('video'); return { t: v.currentTime, p: v.paused }; })()`);
  return v.p && near(v.t, 42) ? v : null;
});
check(!!paused, 'Bora durdurdu (42 sn) → film videosu durdu');

// 4) Ayşe film sitesinin kendi oynatıcısıyla oynatır → oda oynar.
bora.clear();
await a.evaluate(`document.querySelector('video').play().then(() => 1)`);
const byAyse = await bora.wait((m) => m.t === 'state' && !m.state.paused && m.by?.name === 'Ayşe', 8000);
check(!!byAyse, 'Ayşe film videosunu oynattı → oda oynuyor (Ayşe adına)');

// 5) Katmandaki site videonun durumunu biliyor (ilerleme, pin şeridi için).
const t = await until(() => a.evalFrame('shell=1', `window.__swm?.player()?.getTime()`));
check(typeof t === 'number' && t > 40, 'katmandaki site film videosunun yerini biliyor', String(t));

// 6) Kısayol (odak film sayfasında) ve katmandan sohbet.
bora.clear();
await a.press('1', 'Digit1', 49);
check(!!(await bora.wait((m) => m.t === 'reaction', 5000)), '1 tuşu (odak film sayfasında) → emoji odaya gitti');
await a.evalFrame('shell=1', `(() => { const i = document.getElementById('chat-input'); i.value = 'katmandan selam'; i.form.requestSubmit(); return 1; })()`);
check(!!(await bora.wait((m) => m.t === 'chat' && m.message.text === 'katmandan selam', 5000)), 'katmandaki sohbet odaya gitti');

// 7) Katmandaki ayar (tema) ana siteye de geçer.
await a.evalFrame('shell=1', `(async () => { const m = await import('/src/themes.ts'); m.applyTheme('okyanus', { wait: false }); return 1; })()`);

// 8) Başkası odada sitenin oynattığı bir şey açar (senkron testi): katman tamamen açılır, film durur.
bora.send({ t: 'load', media: { kind: 'test' } });
const open = await until(() => a.evaluate(`getComputedStyle(document.querySelector('iframe[src^="chrome-extension://"]')).clipPath === 'none'`));
check(!!open, 'odada sitenin oynattığı video: katmanda delik kapandı');
check(await until(() => a.evaluate(`document.querySelector('video').paused`)), 'film videosu kendiliğinden durdu (odaya "durdur" gitmedi)');
check(bora.state?.item?.media.kind === 'test', 'oda yeni videoda kaldı (film durunca oda durmadı)');
await a.shot('2-site-oynatici');

// 9) Başkası yeni bir film sayfası açar → "Filme git" kartı; basınca sekme gider, iç içe oynatıcı deliğe oturur.
bora.send({ t: 'load', media: { kind: 'page', url: `${FILM}/deny-nested` } });
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

// 10) Odaya dön: sekme sitedeki odaya döner, katman kalkar, ayar (tema) ana sitede de geçerli.
await a.evalFrame('shell=1', `document.querySelector('.shell-home').click()`);
await a.sleep(400);
check(await a.evalFrame('shell=1', `!!document.querySelector('.confirm-dialog')`), 'Odaya dön önce soruyor');
await a.evalFrame('shell=1', `document.querySelector('.confirm-dialog .btn.primary').click(); 1`);
check(!!(await until(async () => String(await a.evaluate('location.href')).startsWith(`${SITE}/r/${room}`))), 'Odaya dön → sekme sitedeki odada');
await a.sleep(2500);
check((await a.evaluate(`document.documentElement.dataset.theme`)) === 'okyanus', 'katmanda seçilen tema ana sitede de geçerli');
const back = await until(() => bora.members.length === 2 && bora.members.filter((m) => m.name === 'Ayşe').length === 1, 10000);
check(!!back, 'Ayşe yine tek kez (artık ana sitenin bağlantısı)');
await a.shot('4-odaya-donus');

bora.close();
a.close();
console.log(failed ? `\n✗ ${failed} kontrol başarısız` : '\n✓ Tüm kontroller geçti');
process.exit(failed ? 1 : 0);
