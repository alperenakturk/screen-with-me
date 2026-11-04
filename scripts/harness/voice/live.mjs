// Yayının gerçek testi: iki Chrome (sahte kamera). Alex kamerayla yayın açar, Sam "▶ Yayını izle"ye basar; Sam'de
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

const alex = await person('Alex', 'wizard');
const sam = await person('Sam', 'elf');
const ready = (b) => b.evaluate(`!document.getElementById('live-card').hidden && document.getElementById('people-count')?.textContent === '2'`);
check(!!(await until(async () => (await ready(alex)) && (await ready(sam)), 20000)), 'yayın kartı görünüyor');
check((await alex.evaluate(`document.getElementById('live-limit').textContent`)).includes('4'), 'yayın yokken sınır görünüyor (en fazla 4 izleyici)');

// 0.9.90.8: no separate camera stream any more; a screen stream can carry my camera in its corner.
check(!!(await alex.evaluate(`!document.getElementById('live-camera') && !document.getElementById('live-with-cam-row').hidden`)), '"Kamerayla yayın" yok, yerine ekran yayınında "kameram da köşede görünsün"');
await alex.evaluate(`(async () => { const c = document.getElementById('live-with-cam'); c.checked = true; c.dispatchEvent(new Event('change')); document.getElementById('live-screen').click(); await new Promise((r) => setTimeout(r, 400)); if (document.querySelector('.ip-notice')) document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
const offered = await until(() => sam.evaluate(`(() => { const w = document.getElementById('live-watch'); return !w.hidden ? document.getElementById('live-status').textContent : null; })()`), 10000);
check(!!offered && offered.includes('Alex'), 'Alex ekranını kamerasıyla paylaştı: Sam’de "Yayını izle" ve durum', String(offered));
const composedTrack = await alex.evaluate(`(() => { const t = document.getElementById('live-video').srcObject?.getVideoTracks()[0]; return t ? { generated: typeof MediaStreamTrackGenerator === 'function' && t instanceof MediaStreamTrackGenerator, state: t.readyState } : null; })()`);
check(!!composedTrack?.generated && composedTrack.state === 'live', 'yayın görüntüsü ekran + kamera birleşimi (köşede kamera)', JSON.stringify(composedTrack));
check(!!(await alex.evaluate(`!document.getElementById('live-window').hidden`)), 'Alex kendi yayınının önizlemesini görüyor');
await sam.evaluate(`(async () => { document.getElementById('live-watch').click(); await new Promise((r) => setTimeout(r, 400)); if (document.querySelector('.ip-notice')) document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
const playing = await until(() => sam.evaluate(`(() => { const v = document.getElementById('live-video'); return !document.getElementById('live-window').hidden && v.videoWidth > 0 && v.currentTime > 0 ? { w: v.videoWidth, h: v.videoHeight } : null; })()`), 15000);
check(!!playing, 'Sam yayını izliyor (görüntü geldi)', JSON.stringify(playing));
const f = await frames(sam);
check(f.n > 8, `yayın görüntüsü akıyor (1,5 sn'de ${f.n} kare, ${f.w}×${f.h})`);
const viewers = await until(async () => {
  const text = await alex.evaluate(`document.getElementById('live-limit').textContent`);
  return text.includes('1/4') ? text : null;
}, 8000);
check(!!viewers, 'Alex’te "İzleyen 1/4"', String(viewers));
await sam.shot('izliyor');

// 0.9.91.14 (owner): the stream window is free like the cameras. Drag it inside the video, pop it out onto the page,
// resize it from its corner; places are remembered; in fullscreen it lives inside the video.
const rect = (b) => b.evaluate(`(() => { const w = document.getElementById('live-window'); const r = w.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, inWrap: !!w.closest('.player-wrap'), free: w.classList.contains('free') }; })()`);
const dragBy = async (b, x, y, dx, dy) => {
  await b.mouse('mouseMoved', x, y, { button: 'none' });
  await b.mouse('mousePressed', x, y);
  for (let i = 1; i <= 6; i++) await b.mouse('mouseMoved', x + (dx * i) / 6, y + (dy * i) / 6);
  await b.mouse('mouseReleased', x + dx, y + dy);
  await b.sleep(200);
};
const before = await rect(sam);
await dragBy(sam, before.x + before.w / 2, before.y + before.h / 2, -160, -60);
const moved = await rect(sam);
check(moved.inWrap && moved.x < before.x - 100 && moved.y < before.y - 30, 'yayın penceresi videonun içinde sürüklenip taşındı', JSON.stringify({ before, moved }));
await sam.evaluate(`document.querySelector('#live-window .live-pop').click(); 1`);
await sam.sleep(200);
const popped = await rect(sam);
check(!popped.inWrap && popped.free, '⧉ ile pencere sayfaya çıktı (serbest)', JSON.stringify(popped));
await dragBy(sam, popped.x + popped.w / 2, popped.y + popped.h / 2, -300, 120);
const freeMoved = await rect(sam);
check(freeMoved.x < popped.x - 200 && freeMoved.y > popped.y + 80, 'serbest pencere sayfada istenen yere sürüklendi', JSON.stringify({ popped, freeMoved }));
await dragBy(sam, freeMoved.x + freeMoved.w - 6, freeMoved.y + freeMoved.h - 6, 120, 0);
const grown = await rect(sam);
await sam.mouse('mouseMoved', grown.x + 40, grown.y + 40, { button: 'none' });
await sam.sleep(300);
await sam.shot('serbest');
check(grown.w > freeMoved.w + 80 && Math.abs(grown.w / grown.h - 16 / 9) < 0.05, 'köşeden büyütüldü (16:9 kaldı)', JSON.stringify({ freeMoved, grown }));
// A real reload (navigating to the same address with a hash would not reload the page).
await sam.evaluate(`location.reload(); 1`);
await sam.sleep(1500);
await until(() => sam.evaluate(`!document.getElementById('live-watch').hidden && document.getElementById('live-watch').textContent.includes('izle')`), 15000);
await sam.sleep(1000);
await sam.evaluate(`document.getElementById('live-watch').click(); 1`);
// The IP notice asks again after a reload (unless "don't show again" was ticked).
await until(() => sam.evaluate(`(() => { const b = document.querySelector('.ip-notice')?.closest('.confirm-dialog')?.querySelector('.btn.primary'); if (b) b.click(); return !!b; })()`), 5000);
await until(() => sam.evaluate(`!document.getElementById('live-window').hidden`), 15000);
await sam.sleep(300);
const again = await rect(sam);
check(again.free && Math.abs(again.x - grown.x) < 4 && Math.abs(again.w - grown.w) < 4, 'yenileyince serbest yeri ve boyutu hatırlandı', JSON.stringify({ grown, again }));
await sam.evaluate(`document.querySelector('.theater').classList.add('fake-fs'); 1`);
await sam.sleep(300);
const fs = await rect(sam);
check(fs.inWrap && !fs.free, 'tam ekranda pencere videonun (tam ekranın) içinde', JSON.stringify(fs));
await sam.evaluate(`document.querySelector('.theater').classList.remove('fake-fs'); 1`);
await sam.sleep(300);
check((await rect(sam)).free, 'tam ekrandan çıkınca yine serbest');
await sam.evaluate(`document.querySelector('#live-window .live-pop').click(); 1`);
await sam.sleep(200);
check((await rect(sam)).inWrap, '⤓ ile videonun içine geri döndü');

// The streamer can hide their own preview (viewers still get the stream) and show it again.
await alex.evaluate(`document.getElementById('live-hide-self').click(); 1`);
await alex.sleep(300);
const selfHidden = await alex.evaluate(`document.getElementById('live-window').hidden && !document.getElementById('live-preview').hidden`);
check(!!selfHidden, 'Alex kendi yayınını gizledi, "👁 Yayınımı göster" çıktı');
const stillFlowing = await frames(sam);
check(stillFlowing.n > 8, `Alex gizlese de Sam yayını görmeye devam ediyor (${stillFlowing.n} kare)`);
await alex.evaluate(`document.getElementById('live-preview').click(); 1`);
await alex.sleep(300);
check(!!(await alex.evaluate(`!document.getElementById('live-window').hidden && document.getElementById('live-preview').hidden`)), 'Alex önizlemesini geri açtı');

await sam.evaluate(`document.getElementById('live-big').click(); 1`);
await sam.sleep(400);
await sam.shot('buyuk');

// Bitir: Sam'de pencere kapanır.
await alex.evaluate(`document.getElementById('live-stop').click(); 1`);
check(!!(await until(() => sam.evaluate(`document.getElementById('live-window').hidden`), 8000)), 'Alex yayını bitirince Sam’de pencere kapandı');

// Ekran paylaşımı (başsız Chrome'da tüm ekran kendiliğinden seçilir; olmazsa bilgi olarak yazılır). Kalite "yazı net".
check(!!(await alex.evaluate(`document.getElementById('live-quality-row').hidden`)), 'yayın yokken kalite seçimi gizli (sadece kendi ekran yayınında)');
await alex.evaluate(`(() => { const s = document.getElementById('live-quality'); s.value = 'text'; s.dispatchEvent(new Event('change')); const c = document.getElementById('live-with-cam'); c.checked = false; c.dispatchEvent(new Event('change')); return 1; })()`);
await alex.evaluate(`(async () => { document.getElementById('live-screen').click(); await new Promise((r) => setTimeout(r, 400)); if (document.querySelector('.ip-notice')) document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
const screen = await until(() => alex.evaluate(`(() => { const e = document.getElementById('live-status'); const s = e.title + ' ' + e.textContent; return s.includes('paylaşıyorsun') ? s : null; })()`), 8000);
if (screen) {
  await sam.evaluate(`(async () => { document.getElementById('live-watch').click(); await new Promise((r) => setTimeout(r, 400)); if (document.querySelector('.ip-notice')) document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
  // Başsız Chrome'da "tüm ekran" değişmediği için kare üretmeyebilir: görüntü akışının izleyiciye bağlandığına bakılır,
  // kare sayısı bilgi olarak yazılır (gerçek ekranda elle denenmeli).
  const linked = await until(
    () => sam.evaluate(`(() => { const v = document.getElementById('live-video'); const s = v.srcObject; return !document.getElementById('live-window').hidden && s && s.getVideoTracks().some((t) => t.readyState === 'live') ? s.getVideoTracks().length : null; })()`),
    15000,
  );
  check(!!linked, 'ekran paylaşımının görüntü akışı izleyiciye bağlandı');
  const hint = await alex.evaluate(`(() => { const t = document.getElementById('live-video').srcObject?.getVideoTracks()[0]; return t ? { hint: t.contentHint, fps: t.getSettings().frameRate } : null; })()`);
  check(hint?.hint === 'detail' && hint.fps <= 15, '"Yazı net": görüntü keskinlik öncelikli, en fazla 15 kare', JSON.stringify(hint));
  // Yayın sürerken "akıcı"ya geçilir.
  await alex.evaluate(`(() => { const s = document.getElementById('live-quality'); s.value = 'motion'; s.dispatchEvent(new Event('change')); return 1; })()`);
  const hint2 = await until(() => alex.evaluate(`(() => { const t = document.getElementById('live-video').srcObject?.getVideoTracks()[0]; return t?.contentHint === 'motion' ? t.contentHint : null; })()`), 4000);
  check(!!hint2, 'yayın sürerken "akıcı"ya geçildi');
  console.log('     ekran paylaşımı kareleri (başsız Chrome):', JSON.stringify(await frames(sam)));
  await alex.evaluate(`document.getElementById('live-stop').click(); 1`);
} else {
  console.log('     (bu ortamda ekran seçimi kendiliğinden yapılamadı: ekran paylaşımı elle denenmeli)');
}

// Yönetici (Alex) Sam'in yayınını durdurur; sonra "yayını sadece yönetici açsın".
await until(() => alex.evaluate(`!document.getElementById('live-screen').hidden`), 8000);
await sam.evaluate(`(async () => { document.getElementById('live-screen').click(); await new Promise((r) => setTimeout(r, 400)); if (document.querySelector('.ip-notice')) document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
const kill = await until(() => alex.evaluate(`!document.getElementById('live-kill').hidden`), 10000);
check(!!kill, 'yönetici başkasının yayınında "⏹ Yayını durdur" görüyor');
check(!!(await sam.evaluate(`document.getElementById('live-kill').hidden`)), 'yönetici olmayan kendi yayınında durdur düğmesini görmüyor');
await alex.evaluate(`document.getElementById('live-kill').click(); 1`);
const killed = await until(() => sam.evaluate(`(() => { const h = document.querySelector('.hint-bubble'); return document.getElementById('live-window').hidden && h ? h.textContent : null; })()`), 10000);
check(!!killed && killed.includes('durdurdu'), 'Sam’in yayını durdu, nedeni yazıyor', String(killed));
await alex.evaluate(`(() => { const c = document.getElementById('opt-livehost'); c.checked = true; c.dispatchEvent(new Event('change')); return 1; })()`);
const lockedUi = await until(() => sam.evaluate(`document.getElementById('live-share').classList.contains('is-full')`), 8000);
check(!!lockedUi, 'kilitliyken Sam’de "Paylaş" düğmesi soluk');
await sam.evaluate(`document.getElementById('live-share').click(); 1`);
const lockedHint = await until(() => sam.evaluate(`[...document.querySelectorAll('.hint-bubble')].map((h) => h.textContent).find((x) => x.includes('yönetici')) ?? null`), 5000);
check(!!lockedHint && lockedHint.includes('yönetici') && !!(await sam.evaluate(`document.getElementById('live-menu').hidden`)), 'basınca menü açılmıyor, nedeni yazıyor', String(lockedHint));

alex.close();
sam.close();
console.log(failed ? `\n✗ ${failed} kontrol başarısız` : '\n✓ Yayın testi geçti');
process.exit(failed ? 1 : 0);
