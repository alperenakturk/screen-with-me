// Sesli sohbetin gerçek testi: iki ayrı Chrome (sahte mikrofon: Chrome'un ürettiği bip sesi) aynı odaya girer,
// ikisi de "Sese katıl"a basar; her biri diğerinin sesini gerçekten duyuyor mu (gelen akışta ses enerjisi var mı)?
// Eşler arası (varsayılan) ya da Cloudflare Realtime (sunucuda anahtar varsa) fark etmez.
//
//   node scripts/harness/voice/run.mjs https://screen-with-me.swm-server.workers.dev
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../embed/cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const EXT = join(here, '../../../apps/extension/dist');
const SITE = process.argv[2] ?? 'http://localhost:5173';
const room = 'ses' + Math.random().toString(36).slice(2, 8);
const FAKE_MIC = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'];

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

/**
 * İki kişinin sahte mikrofonu aynı anda aynı bip'i çalarsa yankı engelleyici kendi mikrofonundaki bip'i karşıdan gelenin
 * yankısı sanıp siler (test bazen sessizlik ölçer). VOICE_A / VOICE_B: farklı ses dosyaları (wav), bkz. shell.mjs.
 */
const micFile = (file) => (file ? [`--use-file-for-fake-audio-capture=${file}`] : []);

async function person(name, avatar, file) {
  const b = await launch({ ext: EXT, out: join(here, `voice-${name}`), args: [...FAKE_MIC, ...micFile(file)] });
  await b.navigate(`${SITE}/`);
  await b.sleep(1500);
  await b.evaluate(`localStorage.setItem('name', ${JSON.stringify(name)}); localStorage.setItem('avatar', ${JSON.stringify(avatar)}); localStorage.setItem('lang','tr'); 1`);
  await b.navigate(`${SITE}/r/${room}#back`);
  return b;
}

/** Sayfadaki uzak ses akışlarının (görünmez <audio>) ses enerjisi: Web Audio ile kısa süre dinler. */
const LEVEL = `(async () => {
  const audios = [...document.querySelectorAll('audio')].filter((a) => a.srcObject);
  if (!audios.length) return { n: 0, rms: 0 };
  const ctx = new AudioContext();
  let best = 0;
  for (const a of audios) {
    const src = ctx.createMediaStreamSource(a.srcObject);
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 100));
      an.getFloatTimeDomainData(buf);
      let s = 0;
      for (const v of buf) s += v * v;
      best = Math.max(best, Math.sqrt(s / buf.length));
    }
  }
  await ctx.close();
  return { n: audios.length, rms: best };
})()`;

const ali = await person('Ali', 'wizard', process.env.VOICE_A);
const ayse = await person('Ayse', 'elf', process.env.VOICE_B);
// İkisi de odaya girmiş olsun (kart görünür ve kişi sayısı 2): yoksa katılma mesajı bağlantıdan önce gider.
const ready = (b) => b.evaluate(`!document.getElementById('voice-card').hidden && document.getElementById('people-count')?.textContent === '2'`);
const available = await until(async () => (await ready(ali)) && (await ready(ayse)), 20000);
check(!!available, 'sesli sohbet kartı görünüyor');
if (!available) {
  console.log('Sesli sohbet kartı görünmüyor (sunucuda kapalı mı?): test duruyor.');
  ali.close();
  ayse.close();
  process.exit(1);
}
await ali.evaluate(`(async () => { document.getElementById('voice-join').click(); await new Promise((r) => setTimeout(r, 400)); if (document.querySelector('.ip-notice')) document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
await until(() => ali.evaluate(`!document.getElementById('voice-on').hidden`), 10000);
await ayse.evaluate(`(async () => { document.getElementById('voice-join').click(); await new Promise((r) => setTimeout(r, 400)); if (document.querySelector('.ip-notice')) document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
const bothIn = await until(async () => (await ali.evaluate(`document.querySelectorAll('#voice-people .voice-face').length`)) === 2, 15000);
check(!!bothIn, 'ikisi de seste (kartta iki avatar)');
const aliHears = await until(async () => (await ali.evaluate(`document.querySelectorAll('audio').length`)) >= 1, 20000);
const ayseHears = await until(async () => (await ayse.evaluate(`document.querySelectorAll('audio').length`)) >= 1, 20000);
check(!!aliHears && !!ayseHears, 'ikisinde de karşı tarafın ses akışı geldi');
await ali.sleep(1500);
const la = await ali.evaluate(LEVEL);
const lb = await ayse.evaluate(LEVEL);
console.log('     ses enerjisi:', JSON.stringify({ ali: la, ayse: lb }));
check(la.rms > 0.01 && lb.rms > 0.01, 'iki taraf da karşının sesini gerçekten duyuyor (sahte mikrofonun bip sesi geliyor)');

// Kendi sesimin seviyesi: 🎙 düğmesinin altındaki çubuk sahte mikrofonun bip'iyle doluyor.
const bar = await until(() => ali.evaluate(`(() => { const i = document.querySelector('#voice-mic .mic-level > i'); const w = parseFloat(i?.style.width ?? '0'); return w > 5 ? w : null; })()`), 8000);
check(!!bar, 'kendi ses seviyesi göstergesi doluyor (' + bar + '%)');

// Kamera: Ali 📷 → Ayşe'de Ali'nin kutusu, içinde gerçekten görüntü (kareler ilerliyor); Ali kendi önizlemesini görür.
await ali.evaluate(`document.getElementById('voice-cam').click(); 1`);
const camSeen = await until(
  () => ayse.evaluate(`(() => { const v = document.querySelector('#voice-cams .cam-tile video'); return v && v.videoWidth > 0 && v.currentTime > 0 ? { w: v.videoWidth, h: v.videoHeight } : null; })()`),
  15000,
);
check(!!camSeen, 'Ali kamerasını açtı: Ayşe onun görüntüsünü görüyor', JSON.stringify(camSeen));
const ownPreview = await ali.evaluate(`!!document.querySelector('#voice-cams .cam-tile.mine video')`);
check(ownPreview, 'Ali kendi kamera önizlemesini görüyor');
const frames = await ayse.evaluate(`(async () => { const v = document.querySelector('#voice-cams .cam-tile video'); const a = v.getVideoPlaybackQuality?.().totalVideoFrames ?? 0; await new Promise((r) => setTimeout(r, 1500)); return (v.getVideoPlaybackQuality?.().totalVideoFrames ?? 0) - a; })()`);
check(frames > 5, 'kamera görüntüsü akıyor (1,5 sn\'de ' + frames + ' kare)');
await ayse.shot('kamera-kart');
// Kameralar serbest (0.9.81): ⧉ → sayfada yüzen pencere; sürüklenir, köşesinden büyür, görüntü kesilmez.
const BOX = `(() => { const b = document.getElementById('voice-cams'); const r = b.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), floating: b.classList.contains('floating'), fs: b.classList.contains('in-fs'), parent: b.parentElement === document.body ? 'body' : b.parentElement.className, t: b.querySelector('video')?.currentTime ?? 0 }; })()`;
await ayse.evaluate(`document.querySelector('#voice-cams .cam-pop').click(); 1`);
const popped = await until(async () => {
  const box = await ayse.evaluate(BOX);
  return box.floating && box.parent === 'body' ? box : null;
});
check(!!popped, '⧉ ile kameralar sayfada yüzen pencereye çıktı', JSON.stringify(popped));
const drag = async (from, dx, dy) => {
  await ayse.mouse('mouseMoved', from.x, from.y);
  await ayse.mouse('mousePressed', from.x, from.y);
  for (let i = 1; i <= 6; i++) await ayse.mouse('mouseMoved', from.x + (dx * i) / 6, from.y + (dy * i) / 6, { buttons: 1 });
  await ayse.mouse('mouseReleased', from.x + dx, from.y + dy);
  await ayse.sleep(200);
};
const title = await ayse.center('#voice-cams .cam-bar-title');
await drag(title, -300, -200);
const moved = await ayse.evaluate(BOX);
check(Math.abs(moved.x - (popped.x - 300)) < 6 && Math.abs(moved.y - (popped.y - 200)) < 6, 'yüzen pencere sürüklenince taşındı', JSON.stringify({ önce: popped, sonra: moved }));
const corner = await ayse.center('#voice-cams .cam-resize');
await drag(corner, 120, 0);
const grown = await ayse.evaluate(BOX);
check(grown.w - moved.w > 100, 'köşesinden çekince büyüdü', `${moved.w} → ${grown.w}`);
await ayse.sleep(700);
check((await ayse.evaluate(BOX)).t > grown.t, 'taşınırken kamera görüntüsü durmadı');
check(!!(await ayse.evaluate(`localStorage.getItem('camFloat:spot')`)), 'yeri ve boyutu hatırlanıyor');
await ayse.shot('kamera-serbest');
// Tam ekranda kameralar kendiliğinden videonun içine gelir; orada da sürüklenir.
await ayse.evaluate(`document.getElementById('sync-test')?.click(); 1`);
await ayse.sleep(1500);
await ayse.evaluate(`document.getElementById('fullscreen')?.click(); 1`);
await ayse.sleep(1200);
const inFs = await ayse.evaluate(BOX);
check(inFs.fs && inFs.parent.includes('player-wrap') && inFs.w > 80 && inFs.h > 50, 'tam ekranda kameralar videonun içinde', JSON.stringify(inFs));
const fsTitle = await ayse.center('#voice-cams .cam-bar-title');
await drag(fsTitle, -200, 150);
const fsMoved = await ayse.evaluate(BOX);
check(Math.abs(fsMoved.x - (inFs.x - 200)) < 6 && Math.abs(fsMoved.y - (inFs.y + 150)) < 6, 'tam ekranda da sürükleniyor', JSON.stringify({ önce: inFs, sonra: fsMoved }));
await ayse.shot('kamera-tam-ekran');
await ayse.evaluate(`document.fullscreenElement ? document.exitFullscreen().then(() => 1) : (document.getElementById('fs-exit')?.click(), 1)`);
await ayse.sleep(700);
const back = await ayse.evaluate(BOX);
check(back.parent === 'body' && !back.fs && Math.abs(back.x - grown.x) < 6, 'tam ekrandan çıkınca sayfadaki yerine döndü', JSON.stringify(back));
await ayse.evaluate(`document.querySelector('#voice-cams .cam-dock-btn').click(); 1`);
const docked = await ayse.evaluate(BOX);
check(!docked.floating && docked.parent !== 'body', '⤓ ile karta geri döndü', JSON.stringify(docked));
await ali.evaluate(`document.getElementById('voice-cam').click(); 1`);
const camGone = await until(() => ayse.evaluate(`document.getElementById('voice-cams').hidden`), 8000);
check(!!camGone, 'Ali kamerasını kapatınca Ayşe\'de kutu kalktı');

// Sessize alma: Ayşe 🔇 → Ali'de sesi biter (akış kalır, enerji düşer), Ayşe'nin avatarında 🔇.
await ayse.evaluate(`document.getElementById('voice-mic').click(); 1`);
await ali.sleep(2000);
const muted = await ali.evaluate(LEVEL);
const badge = await ali.evaluate(`!!document.querySelector('#voice-people .voice-muted')`);
check(muted.rms < 0.005 && badge, 'Ayşe sessize alınca Ali onu duymuyor ve 🔇 görünüyor', JSON.stringify({ muted, badge }));

// Bas-konuş: Ayşe seçer (mikrofon kapalı durur), V'ye basılı tutunca Ali onu duyar, bırakınca susar.
await ayse.evaluate(`(() => { const c = document.getElementById('voice-ptt'); c.checked = true; c.dispatchEvent(new Event('change')); return 1; })()`);
await ayse.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true })); 1`);
const pttOn = await until(() => ali.evaluate(`!document.querySelector('#voice-people .voice-muted')`), 8000);
await ali.sleep(1500);
const pttLevel = await ali.evaluate(LEVEL);
check(!!pttOn && pttLevel.rms > 0.01, 'bas-konuş: Ayşe V’ye basılı tutunca Ali onu duyuyor', JSON.stringify(pttLevel));
await ayse.evaluate(`document.dispatchEvent(new KeyboardEvent('keyup', { key: 'v', bubbles: true })); 1`);
const pttOff = await until(() => ali.evaluate(`!!document.querySelector('#voice-people .voice-muted')`), 8000);
check(!!pttOff, 'bas-konuş: V bırakılınca Ayşe yine sessiz (🔇)');
await ayse.evaluate(`(() => { const c = document.getElementById('voice-ptt'); c.checked = false; c.dispatchEvent(new Event('change')); return 1; })()`);

// Kim durdurdu: Ali senkron testini açıp durdurunca Ayşe'de videonun üstünde "Ali durdurdu" notu.
await ali.evaluate(`document.getElementById('sync-test').click(); 1`);
await until(() => ayse.evaluate(`!!document.querySelector('#player canvas, #player video')`), 10000);
await ali.sleep(1500);
await ali.evaluate(`document.getElementById('fs-play').click(); 1`);
const notice = await until(() => ayse.evaluate(`(() => { const n = document.getElementById('action-notice'); return n && !n.hidden ? n.textContent : null; })()`), 8000);
check(!!notice && notice.includes('Ali'), 'Ali durdurunca Ayşe’de videonun üstünde not çıktı', String(notice));
const ownNotice = await ali.evaluate(`document.getElementById('action-notice').hidden`);
check(ownNotice, 'kendi hareketim için not çıkmıyor');

// Ayrılma: Ayşe ayrılınca Ali'de akışı kalkar.
await ayse.evaluate(`document.getElementById('voice-leave').click(); 1`);
const gone = await until(async () => (await ali.evaluate(`document.querySelectorAll('audio').length`)) === 0, 10000);
check(!!gone, 'Ayşe sesten ayrılınca Ali tarafında akışı kapandı');

ali.close();
ayse.close();
console.log(failed ? `\n✗ ${failed} kontrol başarısız` : '\n✓ Sesli sohbet testi geçti');
process.exit(failed ? 1 : 0);
