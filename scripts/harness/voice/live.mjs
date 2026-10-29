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

// 0.9.90.8: no separate camera stream any more; a screen stream can carry my camera in its corner.
check(!!(await ali.evaluate(`!document.getElementById('live-camera') && !document.getElementById('live-with-cam-row').hidden`)), '"Kamerayla yayın" yok, yerine ekran yayınında "kameram da köşede görünsün"');
await ali.evaluate(`(async () => { const c = document.getElementById('live-with-cam'); c.checked = true; c.dispatchEvent(new Event('change')); document.getElementById('live-screen').click(); await new Promise((r) => setTimeout(r, 400)); if (document.querySelector('.ip-notice')) document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
const offered = await until(() => ayse.evaluate(`(() => { const w = document.getElementById('live-watch'); return !w.hidden ? document.getElementById('live-status').textContent : null; })()`), 10000);
check(!!offered && offered.includes('Ali'), 'Ali ekranını kamerasıyla paylaştı: Ayşe’de "Yayını izle" ve durum', String(offered));
const composedTrack = await ali.evaluate(`(() => { const t = document.getElementById('live-video').srcObject?.getVideoTracks()[0]; return t ? { generated: typeof MediaStreamTrackGenerator === 'function' && t instanceof MediaStreamTrackGenerator, state: t.readyState } : null; })()`);
check(!!composedTrack?.generated && composedTrack.state === 'live', 'yayın görüntüsü ekran + kamera birleşimi (köşede kamera)', JSON.stringify(composedTrack));
check(!!(await ali.evaluate(`!document.getElementById('live-window').hidden`)), 'Ali kendi yayınının önizlemesini görüyor');
await ayse.evaluate(`(async () => { document.getElementById('live-watch').click(); await new Promise((r) => setTimeout(r, 400)); if (document.querySelector('.ip-notice')) document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
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

// Ekran paylaşımı (başsız Chrome'da tüm ekran kendiliğinden seçilir; olmazsa bilgi olarak yazılır). Kalite "yazı net".
check(!!(await ali.evaluate(`document.getElementById('live-quality-row').hidden`)), 'yayın yokken kalite seçimi gizli (sadece kendi ekran yayınında)');
await ali.evaluate(`(() => { const s = document.getElementById('live-quality'); s.value = 'text'; s.dispatchEvent(new Event('change')); const c = document.getElementById('live-with-cam'); c.checked = false; c.dispatchEvent(new Event('change')); return 1; })()`);
await ali.evaluate(`(async () => { document.getElementById('live-screen').click(); await new Promise((r) => setTimeout(r, 400)); if (document.querySelector('.ip-notice')) document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
const screen = await until(() => ali.evaluate(`(() => { const s = document.getElementById('live-status').textContent; return s.includes('paylaşıyorsun') ? s : null; })()`), 8000);
if (screen) {
  await ayse.evaluate(`(async () => { document.getElementById('live-watch').click(); await new Promise((r) => setTimeout(r, 400)); if (document.querySelector('.ip-notice')) document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
  // Başsız Chrome'da "tüm ekran" değişmediği için kare üretmeyebilir: görüntü akışının izleyiciye bağlandığına bakılır,
  // kare sayısı bilgi olarak yazılır (gerçek ekranda elle denenmeli).
  const linked = await until(
    () => ayse.evaluate(`(() => { const v = document.getElementById('live-video'); const s = v.srcObject; return !document.getElementById('live-window').hidden && s && s.getVideoTracks().some((t) => t.readyState === 'live') ? s.getVideoTracks().length : null; })()`),
    15000,
  );
  check(!!linked, 'ekran paylaşımının görüntü akışı izleyiciye bağlandı');
  const hint = await ali.evaluate(`(() => { const t = document.getElementById('live-video').srcObject?.getVideoTracks()[0]; return t ? { hint: t.contentHint, fps: t.getSettings().frameRate } : null; })()`);
  check(hint?.hint === 'detail' && hint.fps <= 15, '"Yazı net": görüntü keskinlik öncelikli, en fazla 15 kare', JSON.stringify(hint));
  // Yayın sürerken "akıcı"ya geçilir.
  await ali.evaluate(`(() => { const s = document.getElementById('live-quality'); s.value = 'motion'; s.dispatchEvent(new Event('change')); return 1; })()`);
  const hint2 = await until(() => ali.evaluate(`(() => { const t = document.getElementById('live-video').srcObject?.getVideoTracks()[0]; return t?.contentHint === 'motion' ? t.contentHint : null; })()`), 4000);
  check(!!hint2, 'yayın sürerken "akıcı"ya geçildi');
  console.log('     ekran paylaşımı kareleri (başsız Chrome):', JSON.stringify(await frames(ayse)));
  await ali.evaluate(`document.getElementById('live-stop').click(); 1`);
} else {
  console.log('     (bu ortamda ekran seçimi kendiliğinden yapılamadı: ekran paylaşımı elle denenmeli)');
}

// Yönetici (Ali) Ayşe'nin yayınını durdurur; sonra "yayını sadece yönetici açsın".
await until(() => ali.evaluate(`!document.getElementById('live-screen').hidden`), 8000);
await ayse.evaluate(`(async () => { document.getElementById('live-screen').click(); await new Promise((r) => setTimeout(r, 400)); if (document.querySelector('.ip-notice')) document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
const kill = await until(() => ali.evaluate(`!document.getElementById('live-kill').hidden`), 10000);
check(!!kill, 'yönetici başkasının yayınında "⏹ Yayını durdur" görüyor');
check(!!(await ayse.evaluate(`document.getElementById('live-kill').hidden`)), 'yönetici olmayan kendi yayınında durdur düğmesini görmüyor');
await ali.evaluate(`document.getElementById('live-kill').click(); 1`);
const killed = await until(() => ayse.evaluate(`(() => { const h = document.querySelector('.hint-bubble'); return document.getElementById('live-window').hidden && h ? h.textContent : null; })()`), 10000);
check(!!killed && killed.includes('durdurdu'), 'Ayşe’nin yayını durdu, nedeni yazıyor', String(killed));
await ali.evaluate(`(() => { const c = document.getElementById('opt-livehost'); c.checked = true; c.dispatchEvent(new Event('change')); return 1; })()`);
const lockedUi = await until(() => ayse.evaluate(`document.getElementById('live-share').classList.contains('is-full')`), 8000);
check(!!lockedUi, 'kilitliyken Ayşe’de "Paylaş" düğmesi soluk');
await ayse.evaluate(`document.getElementById('live-share').click(); 1`);
const lockedHint = await until(() => ayse.evaluate(`[...document.querySelectorAll('.hint-bubble')].map((h) => h.textContent).find((x) => x.includes('yönetici')) ?? null`), 5000);
check(!!lockedHint && lockedHint.includes('yönetici') && !!(await ayse.evaluate(`document.getElementById('live-menu').hidden`)), 'basınca menü açılmıyor, nedeni yazıyor', String(lockedHint));

ali.close();
ayse.close();
console.log(failed ? `\n✗ ${failed} kontrol başarısız` : '\n✓ Yayın testi geçti');
process.exit(failed ? 1 : 0);
