// Yayının gerçek testi: iki Chrome (sahte kamera). Ali kamerayla yayın açar, Ayşe "▶ Yayını izle"ye basar; Ayşe'de
// görüntünün gerçekten aktığı (kareler ilerliyor) ve sınırların göründüğü ölçülür. Sonra ekran paylaşımı denenir
// (başsız Chrome'da ekran seçimi kendiliğinden yapılır: --auto-select-desktop-capture-source).
//
//   node scripts/harness/voice/live.mjs [site]
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../embed/cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const EXT = join(here, '../../../apps/extension/dist');
const SITE = process.argv[2] ?? 'http://localhost:5173';
const room = 'yayin' + Math.random().toString(36).slice(2, 8);
const ARGS = [
  '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream',
  '--autoplay-policy=no-user-gesture-required',
  '--auto-select-desktop-capture-source=Entire screen',
  '--enable-usermedia-screen-capturing',
];

let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
};
const until = async (fn, ms = 10000) => {
  for (let i = 0; i < ms / 250; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
};

async function person(name, avatar) {
  const b = await launch({ ext: EXT, out: join(here, `live-${name}`), args: ARGS });
  await b.navigate(`${SITE}/`);
  await b.sleep(1500);
  await b.evaluate(`localStorage.setItem('name', ${JSON.stringify(name)}); localStorage.setItem('avatar', ${JSON.stringify(avatar)}); localStorage.setItem('lang','tr'); 1`);
  await b.navigate(`${SITE}/r/${room}#back`);
  return b;
}
const frames = (b) =>
  b.evaluate(`(async () => { const v = document.getElementById('live-video'); const a = v.getVideoPlaybackQuality?.().totalVideoFrames ?? 0; await new Promise((r) => setTimeout(r, 1500)); return { n: (v.getVideoPlaybackQuality?.().totalVideoFrames ?? 0) - a, w: v.videoWidth, h: v.videoHeight }; })()`);

const ali = await person('Ali', 'wizard');
const ayse = await person('Ayse', 'elf');
const ready = (b) => b.evaluate(`!document.getElementById('live-card').hidden && document.getElementById('people-count')?.textContent === '2'`);
check(!!(await until(async () => (await ready(ali)) && (await ready(ayse)), 20000)), 'yayın kartı görünüyor');
check((await ali.evaluate(`document.getElementById('live-limit').textContent`)).includes('4'), 'yayın yokken sınır görünüyor (en fazla 4 izleyici)');

await ali.evaluate(`document.getElementById('live-camera').click(); 1`);
const offered = await until(() => ayse.evaluate(`(() => { const w = document.getElementById('live-watch'); return !w.hidden ? document.getElementById('live-status').textContent : null; })()`), 10000);
check(!!offered && offered.includes('Ali'), 'Ali kamerayla yayın açtı: Ayşe’de "Yayını izle" ve durum', String(offered));
check(!!(await ali.evaluate(`!document.getElementById('live-window').hidden`)), 'Ali kendi yayınının önizlemesini görüyor');
await ayse.evaluate(`document.getElementById('live-watch').click(); 1`);
const playing = await until(() => ayse.evaluate(`(() => { const v = document.getElementById('live-video'); return !document.getElementById('live-window').hidden && v.videoWidth > 0 && v.currentTime > 0 ? { w: v.videoWidth, h: v.videoHeight } : null; })()`), 15000);
check(!!playing, 'Ayşe yayını izliyor (görüntü geldi)', JSON.stringify(playing));
const f = await frames(ayse);
check(f.n > 8, `yayın görüntüsü akıyor (1,5 sn'de ${f.n} kare, ${f.w}×${f.h})`);
const viewers = await until(async () => {
  const text = await ali.evaluate(`document.getElementById('live-limit').textContent`);
  return text.includes('1/4') ? text : null;
}, 8000);
check(!!viewers, 'Ali’de "İzleyen 1/4"', String(viewers));
await ayse.shot('izliyor');
await ayse.evaluate(`document.getElementById('live-big').click(); 1`);
await ayse.sleep(400);
await ayse.shot('buyuk');

// Bitir: Ayşe'de pencere kapanır.
await ali.evaluate(`document.getElementById('live-stop').click(); 1`);
check(!!(await until(() => ayse.evaluate(`document.getElementById('live-window').hidden`), 8000)), 'Ali yayını bitirince Ayşe’de pencere kapandı');

// Ekran paylaşımı (başsız Chrome'da tüm ekran kendiliğinden seçilir; olmazsa bilgi olarak yazılır).
await ali.evaluate(`document.getElementById('live-screen').click(); 1`);
const screen = await until(() => ali.evaluate(`(() => { const s = document.getElementById('live-status').textContent; return s.includes('paylaşıyorsun') ? s : null; })()`), 8000);
if (screen) {
  await ayse.evaluate(`document.getElementById('live-watch').click(); 1`);
  // Başsız Chrome'da "tüm ekran" değişmediği için kare üretmeyebilir: görüntü akışının izleyiciye bağlandığına bakılır,
  // kare sayısı bilgi olarak yazılır (gerçek ekranda elle denenmeli).
  const linked = await until(
    () => ayse.evaluate(`(() => { const v = document.getElementById('live-video'); const s = v.srcObject; return !document.getElementById('live-window').hidden && s && s.getVideoTracks().some((t) => t.readyState === 'live') ? s.getVideoTracks().length : null; })()`),
    15000,
  );
  check(!!linked, 'ekran paylaşımının görüntü akışı izleyiciye bağlandı');
  console.log('     ekran paylaşımı kareleri (başsız Chrome):', JSON.stringify(await frames(ayse)));
  await ali.evaluate(`document.getElementById('live-stop').click(); 1`);
} else {
  console.log('     (bu ortamda ekran seçimi kendiliğinden yapılamadı: ekran paylaşımı elle denenmeli)');
}

ali.close();
ayse.close();
console.log(failed ? `\n✗ ${failed} kontrol başarısız` : '\n✓ Yayın testi geçti');
process.exit(failed ? 1 : 0);
