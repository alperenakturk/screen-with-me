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
// 0.9.90.6 pre-join check: after the IP notice a small window with my voice level, the device lists and "join muted".
await ali.evaluate(`(async () => { document.getElementById('voice-join').click(); await new Promise((r) => setTimeout(r, 400)); if (document.querySelector('.ip-notice')) document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
const checkWin = await until(
  () =>
    ali.evaluate(`(() => { const c = document.querySelector('.voice-check'); if (!c) return null; const w = parseFloat(c.querySelector('.voice-check-level i')?.style.width ?? '0'); const mics = c.querySelectorAll('.voice-check-select')[0].options.length; return w > 5 && mics >= 2 ? { w, mics } : null; })()`),
  8000,
);
check(!!checkWin, 'sese katılmadan önce kontrol penceresi: ses çubuğu doluyor, mikrofon listesi var', JSON.stringify(checkWin));
await ali.shot('ses-oncesi-kontrol');
// "Kameram açık girsin" opens the preview (my own picture before anyone sees it).
const camPreview = await ali.evaluate(`(async () => { const c = document.querySelector('.voice-check'); const box = [...c.querySelectorAll('.voice-check-toggle')].find((l) => l.textContent.includes('Kameram')).querySelector('input'); box.checked = true; box.dispatchEvent(new Event('change')); for (let i = 0; i < 40; i++) { await new Promise((r) => setTimeout(r, 100)); const v = c.querySelector('video'); if (v.videoWidth > 0) { const w = v.videoWidth; box.checked = false; box.dispatchEvent(new Event('change')); return w; } } return JSON.stringify({ off: c.querySelector('.voice-check-off').textContent, offHidden: c.querySelector('.voice-check-off').hidden, src: !!c.querySelector('video').srcObject, ready: c.querySelector('video').readyState }); })()`);
check(typeof camPreview === 'number' && camPreview > 0, '“Kameram açık girsin”: pencerede kendi kamera önizlemem', String(camPreview));
await ali.evaluate(`(() => { const c = document.querySelector('.voice-check'); const muted = [...c.querySelectorAll('.voice-check-toggle')].find((l) => l.textContent.includes('kapalı')).querySelector('input'); muted.checked = true; document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
await until(() => ali.evaluate(`!document.getElementById('voice-on').hidden`), 10000);
await ayse.evaluate(`(async () => { document.getElementById('voice-join').click(); for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 150)); const d = document.querySelector('.confirm-dialog'); if (!d) { if (i > 10) break; continue; } d.querySelector('.btn.primary').click(); } return 1; })()`);
const bothIn = await until(async () => (await ali.evaluate(`document.querySelectorAll('#voice-people .voice-face').length`)) === 2, 15000);
check(!!bothIn, 'ikisi de seste (kartta iki avatar)');
const joinedMuted = await until(() => ayse.evaluate(`!!document.querySelector('#voice-people .voice-muted')`), 8000);
check(!!joinedMuted, '“Mikrofonum kapalı girsin”: Ali seste ama mikrofonu kapalı');
await ali.evaluate(`document.getElementById('voice-mic').click(); 1`);
await until(() => ayse.evaluate(`!document.querySelector('#voice-people .voice-muted')`), 8000);
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

// "🎛" on myself (0.9.90.6): another microphone while in voice; it switches in place (no leave), the voice keeps coming.
await ali.evaluate(`[...document.querySelectorAll('#voice-people .together-person')].find((p) => p.textContent.includes('Sen'))?.click(); 1`);
await ali.sleep(300);
await ali.evaluate(`[...document.querySelectorAll('.person-pop-item')].find((b) => b.textContent.includes('🎛'))?.click(); 1`);
const devWin = await until(() => ali.evaluate(`(() => { const s = document.querySelector('.voice-check .voice-check-select'); return s && s.options.length >= 2 ? s.options.length : null; })()`), 6000);
check(!!devWin, 'kendi menümde “🎛 Mikrofon ve kamera seç” pencereyi açıyor', String(devWin));
await ali.evaluate(`(() => { const s = document.querySelector('.voice-check .voice-check-select'); s.value = s.options[s.options.length - 1].value; s.dispatchEvent(new Event('change')); return 1; })()`);
await ali.sleep(600);
await ali.evaluate(`document.querySelector('.confirm-dialog .btn.primary').click(); 1`);
await ali.sleep(2000);
const afterSwitch = await ayse.evaluate(LEVEL);
const stillTwo = await ayse.evaluate(`document.querySelectorAll('#voice-people .voice-face').length`);
check(!!(await ali.evaluate(`localStorage.getItem('opt:micDevice')`)) && afterSwitch.rms > 0.01 && stillTwo === 2, 'mikrofon değişti: Ali seste kaldı, Ayşe onu duymaya devam ediyor', JSON.stringify({ afterSwitch, stillTwo }));

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
const stillClick = async (at) => {
  await ayse.mouse('mouseMoved', at.x, at.y);
  await ayse.mouse('mousePressed', at.x, at.y);
  await ayse.mouse('mouseReleased', at.x, at.y);
  await ayse.sleep(300);
};
const close = (a, b, tolerance = 6) => Math.abs(a - b) <= tolerance;
// 0.9.90.5 camera layout 2 "free tiles" (default): every camera is its own window.
const TILE = `(() => { const t = document.querySelector('#voice-cams .cam-tile:not(.mine)'); if (!t) return null; const r = t.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), island: t.hasAttribute('data-island'), free: document.getElementById('voice-cams').classList.contains('free'), t: t.querySelector('video').currentTime, iw: Math.round(document.querySelector('.player-wrap').getBoundingClientRect().right) }; })()`;
const t0 = await until(() => ayse.evaluate(TILE));
check(!!t0 && t0.free && t0.island && close(t0.r, t0.iw - 12), 'serbest kutular: Ali’nin kamerası kendi penceresinde, videonun sağ üst köşesinde sırada', JSON.stringify(t0));
const pillCtls = await ayse.evaluate(`(() => { const c = document.querySelector('#voice-cams .cam-pill .cam-controls'); return c && getComputedStyle(c).display !== 'none' ? c.querySelectorAll('button:not([hidden])').length : 0; })()`);
check(pillCtls === 3, 'serbest kutularda 🎙, 📷 ve 🖥️ küçük kontrol hapında', String(pillCtls));
await drag({ x: t0.x + t0.w / 2, y: t0.y + t0.h / 2 }, -300, 150);
const t1 = await ayse.evaluate(TILE);
check(close(t1.x, t0.x - 300) && close(t1.y, t0.y + 150), 'kamera kutusu tek başına sürükleniyor', JSON.stringify({ önce: t0, sonra: t1 }));
await drag({ x: t1.x + t1.w - 5, y: t1.y + t1.h - 5 }, 80, 100);
const t2 = await ayse.evaluate(TILE);
check(t2.w - t1.w > 60 && t2.h - t1.h > 80, 'kamera kutusu köşesinden iki yönde büyüyor', `${t1.w}×${t1.h} → ${t2.w}×${t2.h}`);
await ayse.sleep(700);
check((await ayse.evaluate(TILE)).t > t2.t, 'kutu taşınırken görüntü durmadı');
check(String(await ayse.evaluate(`localStorage.getItem('camTiles:spot')`)).includes('Ali'), 'kutunun yeri kişiye göre hatırlanıyor');
// Person menu in the free layout: size presets and "hide (for me only)".
await stillClick({ x: t2.x + t2.w / 2, y: t2.y + t2.h / 2 });
const sizeMenu = await until(() => ayse.evaluate(`(() => { const m = document.querySelector('.person-pop'); return m ? { sizes: m.querySelectorAll('.person-pop-size').length, hide: [...m.querySelectorAll('.person-pop-item')].some((b) => b.textContent.includes('🙈')) } : null; })()`), 4000);
check(!!sizeMenu && sizeMenu.sizes === 3 && sizeMenu.hide, 'kameraya tıklayınca menüde boyut (küçük/orta/büyük) ve “gizle”', JSON.stringify(sizeMenu));
await ayse.evaluate(`document.querySelector('.person-pop-size').click(); 1`);
await ayse.sleep(300);
const t3 = await ayse.evaluate(TILE);
check(t3.w < t2.w - 60, '“Küçük”: kutu küçüldü, yerinde kaldı', `${t2.w} → ${t3.w}`);
await stillClick({ x: t3.x + t3.w / 2, y: t3.y + t3.h / 2 });
await ayse.evaluate(`[...document.querySelectorAll('.person-pop-item')].find((b) => b.textContent.includes('🙈')).click(); 1`);
const hidden = await until(() => ayse.evaluate(`(() => { const b = document.querySelector('#voice-cams .cam-hidden-btn'); return !document.querySelector('#voice-cams .cam-tile:not(.mine)') && b && !b.hidden ? b.textContent : null; })()`), 3000);
check(!!hidden && hidden.includes('1'), '“Gizle”: Ali’nin kamerası sadece Ayşe’de gizlendi, “👁 1” düğmesi çıktı', String(hidden));
check(await ali.evaluate(`!!document.querySelector('#voice-cams .cam-tile.mine')`), 'Ali kendi kamerasını açık görüyor (gizlemek sadece Ayşe için)');
await ayse.evaluate(`document.querySelector('#voice-cams .cam-hidden-btn').click(); 1`);
check(!!(await until(() => ayse.evaluate(TILE), 3000)), '“👁 1” ile gizli kamera geri geldi');
await ayse.evaluate(`document.querySelector('#voice-cams .cam-lineup').click(); 1`);
await ayse.sleep(300);
const t4 = await ayse.evaluate(TILE);
check(close(t4.r, t4.iw - 12) && close(t4.w, t3.w, 2), '“⊞ Diz”: kutu sıraya döndü (boyutu kaldı)', JSON.stringify(t4));
await ayse.shot('kamera-serbest-kutular');
// "▣": the 0.9.81 single window is still there (all tiles in one box).
await ayse.evaluate(`document.querySelector('#voice-cams .cam-layout').click(); 1`);
const grouped = await until(async () => {
  const box = await ayse.evaluate(BOX);
  return box.floating && !(await ayse.evaluate(`document.getElementById('voice-cams').classList.contains('free')`)) ? box : null;
});
check(!!grouped, '“▣”: kameralar tek pencerede toplandı', JSON.stringify(grouped));
const title = await ayse.center('#voice-cams .cam-bar-title');
await drag(title, -300, -200);
const moved = await ayse.evaluate(BOX);
check(Math.abs(moved.x - (grouped.x - 300)) < 6 && Math.abs(moved.y - (grouped.y - 200)) < 6, 'yüzen pencere sürüklenince taşındı', JSON.stringify({ önce: grouped, sonra: moved }));
const corner = await ayse.center('#voice-cams .cam-resize');
await drag(corner, 120, 0);
const grown = await ayse.evaluate(BOX);
check(grown.w - moved.w > 100, 'köşesinden çekince büyüdü', `${moved.w} → ${grown.w}`);
await ayse.sleep(700);
check((await ayse.evaluate(BOX)).t > grown.t, 'taşınırken kamera görüntüsü durmadı');
check(!!(await ayse.evaluate(`localStorage.getItem('camFloat:spot')`)), 'yeri ve boyutu hatırlanıyor');
// 0.9.85: the window resizes vertically too, and the tiles fill it.
const corner2 = await ayse.center('#voice-cams .cam-resize');
await drag(corner2, 0, 140);
const taller = await ayse.evaluate(BOX);
check(taller.h - grown.h > 100, 'köşeden aşağı çekince yüksekliği de değişti (iki yönlü boyut)', `${grown.h} → ${taller.h}`);
// Meet-style buttons under the cameras in the floating window.
const ctls = await ayse.evaluate(`(() => { const c = document.querySelector('#voice-cams .cam-controls'); return c && getComputedStyle(c).display !== 'none' ? c.querySelectorAll('button:not([hidden])').length : 0; })()`);
check(ctls === 3, 'yüzen pencerede kameraların altında 🎙, 📷 ve 🖥️ düğmeleri', String(ctls));
await ayse.evaluate(`document.querySelector('#voice-cams .cam-ctl-mic').click(); 1`);
const mutedByCtl = await until(() => ali.evaluate(`!!document.querySelector('#voice-people .voice-muted')`), 8000);
check(!!mutedByCtl, 'kamera altındaki 🎙 ile mikrofon kapandı');
await ayse.evaluate(`document.querySelector('#voice-cams .cam-ctl-mic').click(); 1`);
await until(() => ali.evaluate(`!document.querySelector('#voice-people .voice-muted')`), 8000);
// Person menu (Discord-like): click Ali's tile → pin; click Ali's face → mute for me.
const aliTile = await ayse.center('#voice-cams .cam-tile:not(.mine)');
await ayse.mouse('mouseMoved', aliTile.x, aliTile.y);
await ayse.mouse('mousePressed', aliTile.x, aliTile.y);
await ayse.mouse('mouseReleased', aliTile.x, aliTile.y);
const menuItems = await until(() => ayse.evaluate(`(() => { const m = document.querySelector('.person-pop'); return m ? [...m.querySelectorAll('.person-pop-item')].map((b) => b.textContent) : null; })()`), 4000);
check(!!menuItems && menuItems.some((x) => x.includes('📌')) && !!(await ayse.evaluate(`!!document.querySelector('.person-pop-range')`)), 'kameraya tıklayınca kişi menüsü: ses düzeyi ve büyüt', JSON.stringify(menuItems));
await ayse.evaluate(`[...document.querySelectorAll('.person-pop-item')].find((b) => b.textContent.includes('📌')).click(); 1`);
check(await ayse.evaluate(`!!document.querySelector('#voice-cams .cam-tile.pinned')`), '📌 ile Ali’nin kamerası büyüdü (sabitlendi)');
await ayse.evaluate(`[...document.querySelectorAll('#voice-people .together-person')].find((p) => p.textContent.includes('Ali')).click(); 1`);
await ayse.sleep(300);
await ayse.evaluate(`[...document.querySelectorAll('.person-pop-item')].find((b) => b.textContent.includes('🔇')).click(); 1`);
await ayse.sleep(300);
const mutedForMe = await ayse.evaluate(`[...document.querySelectorAll('audio')].filter((a) => a.srcObject).every((a) => a.muted)`);
check(mutedForMe, '“Benim için sustur”: Ali’nin sesi sadece Ayşe’de kısıldı');
const aliStillOn = await ali.evaluate(`!document.querySelector('#voice-people .voice-muted')`);
check(aliStillOn, 'Ali’nin mikrofonu açık kaldı (sadece Ayşe duymuyor)');
await ayse.evaluate(`[...document.querySelectorAll('#voice-people .together-person')].find((p) => p.textContent.includes('Ali')).click(); 1`);
await ayse.sleep(300);
await ayse.evaluate(`[...document.querySelectorAll('.person-pop-item')].find((b) => b.textContent.includes('🔊')).click(); 1`);
await ayse.sleep(300);
check(await ayse.evaluate(`[...document.querySelectorAll('audio')].filter((a) => a.srcObject).every((a) => !a.muted)`), 'sesini tekrar açınca duyuluyor');
const kickOffer = await ali.evaluate(`(() => { [...document.querySelectorAll('#voice-people .together-person')].find((p) => p.textContent.includes('Ayse'))?.click(); return [...document.querySelectorAll('.person-pop-item')].some((b) => b.textContent.includes('🚪')); })()`);
check(kickOffer, 'yönetici (Ali) kişi menüsünde “Odadan çıkar”ı görüyor');
await ali.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); 1`);
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
// Free tiles in fullscreen too: inside the video, in its top-right corner, a separate place from the page.
await ayse.evaluate(`document.querySelector('#voice-cams .cam-layout').click(); 1`);
await ayse.sleep(400);
const fsTile = await ayse.evaluate(`(() => { const t = document.querySelector('#voice-cams .cam-tile'); const w = document.querySelector('.player-wrap').getBoundingClientRect(); const r = t.getBoundingClientRect(); return { inside: r.left >= w.left && r.right <= w.right && r.top >= w.top && r.bottom <= w.bottom, right: Math.round(w.right - r.right), parent: document.getElementById('voice-cams').parentElement.className }; })()`);
check(fsTile.inside && fsTile.right <= 14 && fsTile.parent.includes('player-wrap'), 'tam ekranda serbest kutular videonun içinde, sağ üst köşede', JSON.stringify(fsTile));
await ayse.shot('kamera-tam-ekran-serbest');
await ayse.evaluate(`document.querySelector('#voice-cams .cam-layout').click(); 1`);
await ayse.sleep(300);
await ayse.evaluate(`document.fullscreenElement ? document.exitFullscreen().then(() => 1) : (document.getElementById('fs-exit')?.click(), 1)`);
await ayse.sleep(700);
const back = await ayse.evaluate(BOX);
check(back.parent === 'body' && !back.fs && Math.abs(back.x - grown.x) < 6, 'tam ekrandan çıkınca sayfadaki yerine döndü', JSON.stringify(back));
await ayse.evaluate(`document.querySelector('#voice-cams .cam-dock-btn').click(); 1`);
const docked = await ayse.evaluate(BOX);
check(!docked.floating && docked.parent !== 'body', '⤓ ile karta geri döndü', JSON.stringify(docked));
// Opening and closing a game must not drop the cameras (owner's friends saw tiles disappear and come back).
const FLOW = `(async () => { const v = [...document.querySelectorAll('#voice-cams .cam-tile video')]; const a = v.map((x) => x.getVideoPlaybackQuality?.().totalVideoFrames ?? 0); await new Promise((r) => setTimeout(r, 1200)); return { tiles: v.length, moving: v.every((x, i) => (x.getVideoPlaybackQuality?.().totalVideoFrames ?? 0) - a[i] > 3) }; })()`;
await ali.evaluate(`document.getElementById('game-btn').click(); 1`);
await ali.sleep(300);
await ali.evaluate(`document.querySelector('.hub-game').click(); 1`);
await ali.sleep(2500);
const withGame = await ayse.evaluate(FLOW);
check(withGame.tiles === 1 && withGame.moving, 'oyun açılınca kameralar yerinde ve akıyor', JSON.stringify(withGame));
await ali.evaluate(`document.querySelector('.game-end').click(); 1`);
await ali.sleep(2500);
const afterGame = await ayse.evaluate(FLOW);
check(afterGame.tiles === 1 && afterGame.moving, 'oyun kapanınca kameralar yerinde ve akıyor', JSON.stringify(afterGame));
// A reconnect must not leave a second (frozen) tile of the same person behind.
// 0.9.90.5: while Ali reconnects his tile never vanishes (a "📶 reconnecting" tile holds his place).
const watchTiles = ayse.evaluate(`(async () => { let min = 9; let note = false; for (let i = 0; i < 50; i++) { const t = document.querySelectorAll('#voice-cams .cam-tile'); min = Math.min(min, t.length); note ||= !!document.querySelector('#voice-cams .cam-tile.reconnecting'); await new Promise((r) => setTimeout(r, 100)); } return { min, note }; })()`);
await ali.evaluate(`document.getElementById('profile-reconnect').click(); 1`);
const during = await watchTiles;
console.log('     yeniden bağlanırken:', JSON.stringify(during));
check(during.min >= 1, 'Ali yeniden bağlanırken kamera kutusu kaybolmadı', JSON.stringify(during));
await ali.sleep(1000);
const afterReconnect = await ayse.evaluate(FLOW);
const aliCount = await ayse.evaluate(`document.querySelectorAll('#people-list [data-member-id]').length`);
check(afterReconnect.tiles === 1 && afterReconnect.moving, 'Ali yeniden bağlanınca Ayşe’de tek kamera kutusu var ve akıyor', JSON.stringify({ afterReconnect, aliCount }));
// 0.9.90.8: floating, the pill stays while Ayşe is in voice even when no camera is on (mic, stream from the video).
await ayse.evaluate(`document.querySelector('#voice-cams .cam-pop').click(); if (!document.getElementById('voice-cams').classList.contains('free')) document.querySelector('#voice-cams .cam-layout').click(); 1`);
await ayse.sleep(300);
await ali.evaluate(`document.getElementById('voice-cam').click(); 1`);
const pillKept = await until(() => ayse.evaluate(`(() => { const b = document.getElementById('voice-cams'); const p = b.querySelector('.cam-pill'); return !b.hidden && !b.querySelector('.cam-tile') && p && p.getBoundingClientRect().width > 0 ? { mic: !!p.querySelector('.cam-ctl-mic:not([hidden])'), live: !!p.querySelector('.cam-ctl-live:not([hidden])') } : null; })()`), 8000);
check(!!pillKept && pillKept.mic, 'Ali kamerasını kapatınca kutusu kalktı, Ayşe seste olduğu için küçük menü (🎙) yerinde', JSON.stringify(pillKept));
check(!!pillKept?.live, 'küçük menüde yayın düğmesi (🖥️) var');
const PILL = `(() => { const r = document.querySelector('#voice-cams .cam-pill').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`;
const p0 = await ayse.evaluate(PILL);
await ayse.evaluate(`(() => { const p = document.querySelector('#voice-cams .cam-pill'); p.style.left = '200px'; p.style.top = '200px'; return 1; })()`);
const p1 = await ayse.evaluate(PILL);
await drag({ x: p1.x + p1.w - 3, y: p1.y + p1.h - 3 }, 80, 30);
const p2 = await ayse.evaluate(PILL);
check(p2.w > p1.w * 1.2, 'küçük menü köşesinden çekince büyüyor', `${Math.round(p1.w)} → ${Math.round(p2.w)}`);
check(Number(await ayse.evaluate(`localStorage.getItem('camPill:scale')`)) > 1, 'menünün boyu hatırlanıyor');
await ayse.shot('kucuk-menu-buyuk');
console.log('     menü:', JSON.stringify({ p0, p2 }));
await ayse.evaluate(`document.querySelector('#voice-cams .cam-reset').click(); document.querySelector('#voice-cams .cam-dock-btn').click(); 1`);
const camGone = await until(() => ayse.evaluate(`document.getElementById('voice-cams').hidden`), 8000);
check(!!camGone, 'karta geri konunca boş kamera kutusu kalktı (kartın kendi düğmeleri var)');

// 0.9.90.9 Shorts view (owner's idea): no camera tiles; Ali's camera fills his seat's avatar circle; only 🎙 / 📷 below.
await ali.evaluate(`document.getElementById('voice-cam').click(); 1`);
await ayse.evaluate(`(() => { const i = document.getElementById('media-input'); i.value = 'https://www.youtube.com/shorts/aqz-KE-bpKQ'; i.form.querySelector('button[value=load]').click(); return 1; })()`);
const inShorts = await until(() => ayse.evaluate(`document.querySelector('.room.shorts') ? 1 : null`), 10000);
check(!!inShorts, 'Shorts açıldı (oturma odası görünümü)');
const seatCam = await until(
  () =>
    ayse.evaluate(`(() => { const v = [...document.querySelectorAll('.seat:not(.me) .seat-cam')].find((x) => x.videoWidth > 0); const r = v?.getBoundingClientRect(); return v ? { w: Math.round(r.width), h: Math.round(r.height), tiles: getComputedStyle(document.getElementById('voice-cams')).display } : null; })()`),
  12000,
);
check(!!seatCam && seatCam.tiles === 'none' && seatCam.w >= 70, 'Shorts’ta Ali’nin kamerası profil yuvarlağının içinde, kamera kutuları yok', JSON.stringify(seatCam));
const shortsCtl = await ayse.evaluate(`(() => { const v = document.getElementById('shorts-voice'); return v && !v.hidden ? [...v.querySelectorAll('button:not([hidden])')].map((b) => b.textContent) : null; })()`);
check(!!shortsCtl && shortsCtl.length === 2, 'Shorts’un alt çubuğunda sadece 🎙 ve 📷', JSON.stringify(shortsCtl));
await ayse.evaluate(`document.getElementById('shorts-mic').click(); 1`);
check(!!(await until(() => ali.evaluate(`!!document.querySelector('#voice-people .voice-muted')`), 8000)), 'Shorts’taki 🎙 ile mikrofon kapandı');
await ayse.evaluate(`document.getElementById('shorts-mic').click(); 1`);
await until(() => ali.evaluate(`!document.querySelector('#voice-people .voice-muted')`), 8000);
await ayse.shot('shorts-kamera');
for (const b of [ali, ayse]) await b.evaluate(`document.getElementById('shorts-exit')?.click(); 1`);
await ali.evaluate(`document.getElementById('voice-cam').click(); 1`);
await ali.sleep(800);

// Sessize alma: Ayşe 🔇 → Ali'de sesi biter (akış kalır, enerji düşer), Ayşe'nin avatarında 🔇.
await ayse.evaluate(`document.getElementById('voice-mic').click(); 1`);
await ali.sleep(2000);
const muted = await ali.evaluate(LEVEL);
const badge = await ali.evaluate(`!!document.querySelector('#voice-people .voice-muted')`);
check(muted.rms < 0.005 && badge, 'Ayşe sessize alınca Ali onu duymuyor ve 🔇 görünüyor', JSON.stringify({ muted, badge }));
// Reconnecting (network hiccup) must keep a muted microphone muted; it used to come back on by itself.
await ayse.evaluate(`document.getElementById('profile-reconnect').click(); 1`);
await ali.sleep(6000);
console.log('     Ayşe (yeniden bağlandıktan sonra):', JSON.stringify(await ayse.evaluate(`({ muted: document.getElementById('voice-mic').classList.contains('muted-mic'), key: Object.keys(localStorage).filter((k) => k.startsWith('voiceMic')).map((k) => k + '=' + localStorage.getItem(k)), on: !document.getElementById('voice-on').hidden })`)));
const ayseRows = await ali.evaluate(`[...document.querySelectorAll('#voice-people [data-voice-id]')].length`);
const stillMuted = await ali.evaluate(`!!document.querySelector('#voice-people .voice-muted')`);
const afterLevel = await ali.evaluate(LEVEL);
check(stillMuted && afterLevel.rms < 0.005, 'Ayşe yeniden bağlanınca mikrofonu yine kapalı (kendiliğinden açılmadı)', JSON.stringify({ stillMuted, afterLevel, ayseRows }));
const roomTitle = await ali.evaluate(`document.querySelector('.room-title')?.textContent ?? ''`);
check(/· 2 /.test(roomTitle), 'yeniden bağlanan kişi odada iki kez sayılmıyor', roomTitle);

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
