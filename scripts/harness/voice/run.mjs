// Sesli sohbetin gerçek testi: iki ayrı Chrome (sahte mikrofon: Chrome'un ürettiği bip sesi) aynı odaya girer,
// ikisi de "Sese katıl"a basar; her biri diğerinin sesini gerçekten duyuyor mu (gelen akışta ses enerjisi var mı)?
// Eşler arası (varsayılan) ya da Cloudflare Realtime (sunucuda anahtar varsa) fark etmez.
//
//   node scripts/harness/voice/run.mjs https://screen-with-me.swm-server.workers.dev
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

/**
 * Without VOICE_A / VOICE_B the harness writes its own two "voices" (20 s, 48 kHz mono): a harmonic tone whose pitch
 * glides, cut into syllables (~4 a second), different pitch and rhythm per person. Speech-like on purpose: noise
 * suppression keeps it, and the two never cancel each other in the echo canceller.
 */
function voiceWav(f0, syllables, seed) {
  const rate = 48000;
  const n = rate * 20;
  const data = Buffer.alloc(44 + n * 2);
  data.write('RIFF', 0);
  data.writeUInt32LE(36 + n * 2, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(rate, 24);
  data.writeUInt32LE(rate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(n * 2, 40);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const pitch = f0 * (1 + 0.15 * Math.sin(2 * Math.PI * 0.7 * t + seed));
    phase += (2 * Math.PI * pitch) / rate;
    const voice = Math.sin(phase) + 0.5 * Math.sin(2 * phase) + 0.3 * Math.sin(3 * phase) + 0.15 * Math.sin(5 * phase);
    const syl = Math.max(0, Math.sin(Math.PI * syllables * t + seed)) ** 2;
    data.writeInt16LE(Math.round(voice * syl * 0.25 * 32767), 44 + i * 2);
  }
  const file = join(tmpdir(), `swm-voice-${f0}.wav`);
  writeFileSync(file, data);
  return file;
}
process.env.VOICE_A ||= voiceWav(190, 4.2, 0);
process.env.VOICE_B ||= voiceWav(120, 3.1, 1.3);

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

const alex = await person('Alex', 'wizard', process.env.VOICE_A);
const sam = await person('Sam', 'elf', process.env.VOICE_B);
// İkisi de odaya girmiş olsun (kart görünür ve kişi sayısı 2): yoksa katılma mesajı bağlantıdan önce gider.
const ready = (b) => b.evaluate(`!document.getElementById('voice-card').hidden && document.getElementById('people-count')?.textContent === '2'`);
const available = await until(async () => (await ready(alex)) && (await ready(sam)), 20000);
check(!!available, 'sesli sohbet kartı görünüyor');
if (!available) {
  console.log('Sesli sohbet kartı görünmüyor (sunucuda kapalı mı?): test duruyor.');
  alex.close();
  sam.close();
  process.exit(1);
}
// 0.9.90.6 pre-join check: after the IP notice a small window with my voice level, the device lists and "join muted".
await alex.evaluate(`(async () => { document.getElementById('voice-join').click(); await new Promise((r) => setTimeout(r, 400)); if (document.querySelector('.ip-notice')) document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
const checkWin = await until(
  () =>
    alex.evaluate(`(() => { const c = document.querySelector('.voice-check'); if (!c) return null; const w = parseFloat(c.querySelector('.voice-check-level i')?.style.width ?? '0'); const mics = c.querySelectorAll('.voice-check-select')[0].options.length; return w > 5 && mics >= 2 ? { w, mics } : null; })()`),
  8000,
);
check(!!checkWin, 'sese katılmadan önce kontrol penceresi: ses çubuğu doluyor, mikrofon listesi var', JSON.stringify(checkWin));
await alex.shot('ses-oncesi-kontrol');
// "Kameram açık girsin" opens the preview (my own picture before anyone sees it).
const camPreview = await alex.evaluate(`(async () => { const c = document.querySelector('.voice-check'); const box = [...c.querySelectorAll('.voice-check-toggle')].find((l) => l.textContent.includes('Kameram')).querySelector('input'); box.checked = true; box.dispatchEvent(new Event('change')); for (let i = 0; i < 40; i++) { await new Promise((r) => setTimeout(r, 100)); const v = c.querySelector('video'); if (v.videoWidth > 0) { const w = v.videoWidth; box.checked = false; box.dispatchEvent(new Event('change')); return w; } } return JSON.stringify({ off: c.querySelector('.voice-check-off').textContent, offHidden: c.querySelector('.voice-check-off').hidden, src: !!c.querySelector('video').srcObject, ready: c.querySelector('video').readyState }); })()`);
check(typeof camPreview === 'number' && camPreview > 0, '“Kameram açık girsin”: pencerede kendi kamera önizlemem', String(camPreview));
await alex.evaluate(`(() => { const c = document.querySelector('.voice-check'); const muted = [...c.querySelectorAll('.voice-check-toggle')].find((l) => l.textContent.includes('kapalı')).querySelector('input'); muted.checked = true; document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
await until(() => alex.evaluate(`!document.getElementById('voice-on').hidden`), 10000);
await sam.evaluate(`(async () => { document.getElementById('voice-join').click(); for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 150)); const d = document.querySelector('.confirm-dialog'); if (!d) { if (i > 10) break; continue; } d.querySelector('.btn.primary').click(); } return 1; })()`);
const bothIn = await until(async () => (await alex.evaluate(`document.querySelectorAll('#voice-people .voice-face').length`)) === 2, 15000);
check(!!bothIn, 'ikisi de seste (kartta iki avatar)');
const joinedMuted = await until(() => sam.evaluate(`!!document.querySelector('#voice-people .voice-muted')`), 8000);
check(!!joinedMuted, '“Mikrofonum kapalı girsin”: Alex seste ama mikrofonu kapalı');
await alex.evaluate(`document.getElementById('voice-mic').click(); 1`);
await until(() => sam.evaluate(`!document.querySelector('#voice-people .voice-muted')`), 8000);
const alexHears = await until(async () => (await alex.evaluate(`document.querySelectorAll('audio').length`)) >= 1, 20000);
const samHears = await until(async () => (await sam.evaluate(`document.querySelectorAll('audio').length`)) >= 1, 20000);
check(!!alexHears && !!samHears, 'ikisinde de karşı tarafın ses akışı geldi');
await alex.sleep(1500);
const la = await alex.evaluate(LEVEL);
const lb = await sam.evaluate(LEVEL);
// "Really hears" = clearly louder than the same stream with the other person's microphone off. A fixed level was
// wrong: WebRTC's noise suppression and auto gain damp a steady test tone by an amount that depends on the file.
const quiet = async (speaker, listener) => {
  await speaker.evaluate(`document.getElementById('voice-mic').click(); 1`);
  await speaker.sleep(1200);
  const level = await listener.evaluate(LEVEL);
  await speaker.evaluate(`document.getElementById('voice-mic').click(); 1`);
  await speaker.sleep(1200);
  return level;
};
const qa = await quiet(sam, alex);
const qb = await quiet(alex, sam);
console.log('     ses enerjisi:', JSON.stringify({ alex: la, sam: lb, alexMuted: qa, samMuted: qb }));
const hears = (on, off) => on.rms > 0.002 && on.rms > 4 * off.rms;
check(hears(la, qa) && hears(lb, qb), 'iki taraf da karşının sesini gerçekten duyuyor (sahte mikrofonun sesi geliyor, kapatınca kesiliyor)');

// Kendi sesimin seviyesi: 🎙 düğmesinin altındaki çubuk sahte mikrofonun bip'iyle doluyor.
const bar = await until(() => alex.evaluate(`(() => { const i = document.querySelector('#voice-mic .mic-level > i'); const w = parseFloat(i?.style.width ?? '0'); return w > 5 ? w : null; })()`), 8000);
check(!!bar, 'kendi ses seviyesi göstergesi doluyor (' + bar + '%)');

// "🎛" on myself (0.9.90.6): another microphone while in voice; it switches in place (no leave), the voice keeps coming.
await alex.evaluate(`[...document.querySelectorAll('#voice-people .together-person')].find((p) => p.textContent.includes('Sen'))?.click(); 1`);
await alex.sleep(300);
await alex.evaluate(`[...document.querySelectorAll('.person-pop-item')].find((b) => b.textContent.includes('🎛'))?.click(); 1`);
const devWin = await until(() => alex.evaluate(`(() => { const s = document.querySelector('.voice-check .voice-check-select'); return s && s.options.length >= 2 ? s.options.length : null; })()`), 6000);
check(!!devWin, 'kendi menümde “🎛 Mikrofon ve kamera seç” pencereyi açıyor', String(devWin));
await alex.evaluate(`(() => { const s = document.querySelector('.voice-check .voice-check-select'); s.value = s.options[s.options.length - 1].value; s.dispatchEvent(new Event('change')); return 1; })()`);
await alex.sleep(600);
await alex.evaluate(`document.querySelector('.confirm-dialog .btn.primary').click(); 1`);
await alex.sleep(2000);
const afterSwitch = await sam.evaluate(LEVEL);
const stillTwo = await sam.evaluate(`document.querySelectorAll('#voice-people .voice-face').length`);
check(!!(await alex.evaluate(`localStorage.getItem('opt:micDevice')`)) && afterSwitch.rms > 0.01 && stillTwo === 2, 'mikrofon değişti: Alex seste kaldı, Sam onu duymaya devam ediyor', JSON.stringify({ afterSwitch, stillTwo }));

// Kamera: Alex 📷 → Sam'de Alex'in kutusu, içinde gerçekten görüntü (kareler ilerliyor); Alex kendi önizlemesini görür.
await alex.evaluate(`document.getElementById('voice-cam').click(); 1`);
const camSeen = await until(
  () => sam.evaluate(`(() => { const v = document.querySelector('#voice-cams .cam-tile video'); return v && v.videoWidth > 0 && v.currentTime > 0 ? { w: v.videoWidth, h: v.videoHeight } : null; })()`),
  15000,
);
check(!!camSeen, 'Alex kamerasını açtı: Sam onun görüntüsünü görüyor', JSON.stringify(camSeen));
const ownPreview = await alex.evaluate(`!!document.querySelector('#voice-cams .cam-tile.mine video')`);
check(ownPreview, 'Alex kendi kamera önizlemesini görüyor');
const frames = await sam.evaluate(`(async () => { const v = document.querySelector('#voice-cams .cam-tile video'); const a = v.getVideoPlaybackQuality?.().totalVideoFrames ?? 0; await new Promise((r) => setTimeout(r, 1500)); return (v.getVideoPlaybackQuality?.().totalVideoFrames ?? 0) - a; })()`);
check(frames > 5, 'kamera görüntüsü akıyor (1,5 sn\'de ' + frames + ' kare)');
await sam.shot('kamera-kart');
// Kameralar serbest (0.9.81): ⧉ → sayfada yüzen pencere; sürüklenir, köşesinden büyür, görüntü kesilmez.
const BOX = `(() => { const b = document.getElementById('voice-cams'); const r = b.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), floating: b.classList.contains('floating'), fs: b.classList.contains('in-fs'), parent: b.parentElement === document.body ? 'body' : b.parentElement.className, t: b.querySelector('video')?.currentTime ?? 0 }; })()`;
// Card 6g.7 (owner, like Meet): the first camera opens its own window (one window, the default); no tiles in the
// Together card, no pop-out button.
const popped = await until(async () => {
  const box = await sam.evaluate(BOX);
  return box.floating && box.parent === 'body' ? box : null;
});
check(!!popped, 'the first camera opens in its own window on the page (not in the Together card)', JSON.stringify(popped));
check(await sam.evaluate(`!document.getElementById('voice-cams').classList.contains('free') && !document.querySelector('#voice-cams .cam-pop, #voice-cams .cam-dock-btn') && !document.querySelector('.together-card #voice-cams')`), 'one window by default, no pop-out / put-back buttons, no tiles in the card');
const drag = async (from, dx, dy) => {
  await sam.mouse('mouseMoved', from.x, from.y);
  await sam.mouse('mousePressed', from.x, from.y);
  for (let i = 1; i <= 6; i++) await sam.mouse('mouseMoved', from.x + (dx * i) / 6, from.y + (dy * i) / 6, { buttons: 1 });
  await sam.mouse('mouseReleased', from.x + dx, from.y + dy);
  await sam.sleep(200);
};
const stillClick = async (at) => {
  await sam.mouse('mouseMoved', at.x, at.y);
  await sam.mouse('mousePressed', at.x, at.y);
  await sam.mouse('mouseReleased', at.x, at.y);
  await sam.sleep(300);
};
const close = (a, b, tolerance = 6) => Math.abs(a - b) <= tolerance;
// 0.9.90.5 camera layout 2 "free tiles": every camera is its own window. Since card 6g it is no longer the default
// (the one window is, checked above), so switch to it the way a person does: the pill's layout button.
await sam.evaluate(`if (!document.getElementById('voice-cams').classList.contains('free')) document.querySelector('#voice-cams .cam-layout').click(); 1`);
await sam.sleep(400);
const TILE = `(() => { const t = document.querySelector('#voice-cams .cam-tile:not(.mine)'); if (!t) return null; const r = t.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), r: Math.round(r.right), island: t.hasAttribute('data-island'), free: document.getElementById('voice-cams').classList.contains('free'), t: t.querySelector('video').currentTime, iw: Math.round(document.querySelector('.player-wrap').getBoundingClientRect().right) }; })()`;
const t0 = await until(() => sam.evaluate(TILE));
// 0.9.91.5 (owner): the cameras start attached under the pill, which holds only camera / layout buttons (mic, camera
// and stream are on the dock).
const PILL_AT = `(() => { const r = document.querySelector('#voice-cams .cam-pill').getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), r: Math.round(r.right), b: Math.round(r.bottom), w: r.width, h: r.height, ctls: document.querySelectorAll('#voice-cams .cam-pill .cam-ctl').length }; })()`;
const pill0 = await sam.evaluate(PILL_AT);
check(!!t0 && t0.free && t0.island && close(t0.r, pill0.r) && t0.y >= pill0.b && t0.y - pill0.b < 20, 'serbest kutular: Alex’in kamerası kendi penceresinde, küçük menünün hemen altına yapışık', JSON.stringify({ t0, pill0 }));
check(pill0.ctls === 0, 'küçük menüde mikrofon / kamera / yayın düğmesi yok (onlar dock’ta), sadece kamera ayarları', String(pill0.ctls));
await drag({ x: pill0.x + 8, y: pill0.y + pill0.h / 2 }, -200, 60);
const pillMoved = await sam.evaluate(PILL_AT);
const tFollow = await sam.evaluate(TILE);
check(close(pillMoved.x, pill0.x - 200) && close(tFollow.r, pillMoved.r) && tFollow.y >= pillMoved.b && tFollow.y - pillMoved.b < 20, 'menü sürüklenince yapışık kamera onunla geliyor', JSON.stringify({ pillMoved, tFollow }));
await sam.evaluate(`document.querySelector('#voice-cams .cam-reset').click(); 1`);
await sam.sleep(300);
await drag({ x: t0.x + t0.w / 2, y: t0.y + t0.h / 2 }, -300, 150);
const t1 = await sam.evaluate(TILE);
check(close(t1.x, t0.x - 300) && close(t1.y, t0.y + 150), 'kamera kutusu tek başına sürükleniyor', JSON.stringify({ önce: t0, sonra: t1 }));
await drag({ x: t1.x + t1.w - 5, y: t1.y + t1.h - 5 }, 80, 100);
const t2 = await sam.evaluate(TILE);
check(t2.w - t1.w > 60 && t2.h - t1.h > 80, 'kamera kutusu köşesinden iki yönde büyüyor', `${t1.w}×${t1.h} → ${t2.w}×${t2.h}`);
await sam.sleep(700);
check((await sam.evaluate(TILE)).t > t2.t, 'kutu taşınırken görüntü durmadı');
check(String(await sam.evaluate(`localStorage.getItem('camTiles:spot')`)).includes('Alex'), 'kutunun yeri kişiye göre hatırlanıyor');
// Person menu in the free layout: size presets and "hide (for me only)".
await stillClick({ x: t2.x + t2.w / 2, y: t2.y + t2.h / 2 });
const sizeMenu = await until(() => sam.evaluate(`(() => { const m = document.querySelector('.person-pop'); return m ? { sizes: m.querySelectorAll('.person-pop-size').length, hide: [...m.querySelectorAll('.person-pop-item')].some((b) => b.textContent.includes('🙈')) } : null; })()`), 4000);
check(!!sizeMenu && sizeMenu.sizes === 3 && sizeMenu.hide, 'kameraya tıklayınca menüde boyut (küçük/orta/büyük) ve “gizle”', JSON.stringify(sizeMenu));
await sam.evaluate(`document.querySelector('.person-pop-size').click(); 1`);
await sam.sleep(300);
const t3 = await sam.evaluate(TILE);
check(t3.w < t2.w - 60, '“Küçük”: kutu küçüldü, yerinde kaldı', `${t2.w} → ${t3.w}`);
await stillClick({ x: t3.x + t3.w / 2, y: t3.y + t3.h / 2 });
await sam.evaluate(`[...document.querySelectorAll('.person-pop-item')].find((b) => b.textContent.includes('🙈')).click(); 1`);
const hidden = await until(() => sam.evaluate(`(() => { const b = document.querySelector('#voice-cams .cam-hidden-btn'); return !document.querySelector('#voice-cams .cam-tile:not(.mine)') && b && !b.hidden ? b.textContent : null; })()`), 3000);
check(!!hidden && hidden.includes('1'), '“Gizle”: Alex’in kamerası sadece Sam’de gizlendi, “👁 1” düğmesi çıktı', String(hidden));
check(await alex.evaluate(`!!document.querySelector('#voice-cams .cam-tile.mine')`), 'Alex kendi kamerasını açık görüyor (gizlemek sadece Sam için)');
await sam.evaluate(`document.querySelector('#voice-cams .cam-hidden-btn').click(); 1`);
check(!!(await until(() => sam.evaluate(TILE), 3000)), '“👁 1” ile gizli kamera geri geldi');
await sam.evaluate(`document.querySelector('#voice-cams .cam-lineup').click(); 1`);
await sam.sleep(300);
const t4 = await sam.evaluate(TILE);
const pill4 = await sam.evaluate(PILL_AT);
check(close(t4.r, pill4.r) && t4.y >= pill4.b && close(t4.w, t3.w, 2), '“⊞ Diz”: kutu menünün altına geri yapıştı (boyutu kaldı)', JSON.stringify({ t4, pill4 }));
await sam.shot('kamera-serbest-kutular');
// "▣": the 0.9.81 single window is still there (all tiles in one box).
await sam.evaluate(`document.querySelector('#voice-cams .cam-layout').click(); 1`);
const grouped = await until(async () => {
  const box = await sam.evaluate(BOX);
  return box.floating && !(await sam.evaluate(`document.getElementById('voice-cams').classList.contains('free')`)) ? box : null;
});
check(!!grouped, '“▣”: kameralar tek pencerede toplandı', JSON.stringify(grouped));
const title = await sam.center('#voice-cams .cam-bar-title');
await drag(title, -300, -200);
const moved = await sam.evaluate(BOX);
check(Math.abs(moved.x - (grouped.x - 300)) < 6 && Math.abs(moved.y - (grouped.y - 200)) < 6, 'yüzen pencere sürüklenince taşındı', JSON.stringify({ önce: grouped, sonra: moved }));
const corner = await sam.center('#voice-cams .cam-resize');
await drag(corner, 120, 0);
const grown = await sam.evaluate(BOX);
check(grown.w - moved.w > 100, 'köşesinden çekince büyüdü', `${moved.w} → ${grown.w}`);
await sam.sleep(700);
check((await sam.evaluate(BOX)).t > grown.t, 'taşınırken kamera görüntüsü durmadı');
check(!!(await sam.evaluate(`localStorage.getItem('camFloat:spot')`)), 'yeri ve boyutu hatırlanıyor');
// 0.9.85: the window resizes vertically too, and the tiles fill it.
const corner2 = await sam.center('#voice-cams .cam-resize');
await drag(corner2, 0, 140);
const taller = await sam.evaluate(BOX);
check(taller.h - grown.h > 100, 'köşeden aşağı çekince yüksekliği de değişti (iki yönlü boyut)', `${grown.h} → ${taller.h}`);
// 0.9.91.5: no mic / camera buttons under the cameras any more: the dock next to the video has them.
check((await sam.evaluate(`document.querySelectorAll('#voice-cams .cam-ctl').length`)) === 0, 'yüzen pencerede mikrofon / kamera düğmesi yok (dock’ta)');
await sam.evaluate(`document.getElementById('dock-mic').click(); 1`);
const mutedByCtl = await until(() => alex.evaluate(`!!document.querySelector('#voice-people .voice-muted')`), 8000);
check(!!mutedByCtl, 'videonun yanındaki dock’un 🎙 düğmesiyle mikrofon kapandı');
await sam.evaluate(`document.getElementById('dock-mic').click(); 1`);
await until(() => alex.evaluate(`!document.querySelector('#voice-people .voice-muted')`), 8000);
// Person menu (Discord-like): click Alex's tile → pin; click Alex's face → mute for me.
const alexTile = await sam.center('#voice-cams .cam-tile:not(.mine)');
await sam.mouse('mouseMoved', alexTile.x, alexTile.y);
await sam.mouse('mousePressed', alexTile.x, alexTile.y);
await sam.mouse('mouseReleased', alexTile.x, alexTile.y);
const menuItems = await until(() => sam.evaluate(`(() => { const m = document.querySelector('.person-pop'); return m ? [...m.querySelectorAll('.person-pop-item')].map((b) => b.textContent) : null; })()`), 4000);
check(!!menuItems && menuItems.some((x) => x.includes('📌')) && !!(await sam.evaluate(`!!document.querySelector('.person-pop-range')`)), 'kameraya tıklayınca kişi menüsü: ses düzeyi ve büyüt', JSON.stringify(menuItems));
await sam.evaluate(`[...document.querySelectorAll('.person-pop-item')].find((b) => b.textContent.includes('📌')).click(); 1`);
check(await sam.evaluate(`!!document.querySelector('#voice-cams .cam-tile.pinned')`), '📌 ile Alex’in kamerası büyüdü (sabitlendi)');
// 0.9.91.16 (owner: pinning in the one-window layout looked broken, the other camera spilled out of the window).
await sam.evaluate(`document.getElementById('voice-cam').click(); 1`);
await until(() => sam.evaluate(`document.querySelectorAll('#voice-cams .cam-tile').length === 2`), 8000);
await sam.sleep(500);
await sam.shot('kamera-sabit-pencere');
const spot = await sam.evaluate(`(() => { const box = document.getElementById('voice-cams').getBoundingClientRect(); const tiles = [...document.querySelectorAll('#voice-cams .cam-tile')].map((t) => ({ pinned: t.classList.contains('pinned'), r: t.getBoundingClientRect() })); const p = tiles.find((t) => t.pinned)?.r; const o = tiles.find((t) => !t.pinned)?.r; return { inside: tiles.every(({ r }) => r.left >= box.left - 1 && r.right <= box.right + 1 && r.top >= box.top - 1 && r.bottom <= box.bottom + 1), bigger: !!p && !!o && p.width > o.width * 2, beside: !!p && !!o && o.left >= p.right - 1, n: tiles.length }; })()`);
check(spot.inside && spot.bigger && spot.beside, 'tek pencerede sabitlenen kamera solda büyük, diğeri sağda; hepsi pencerenin içinde', JSON.stringify(spot));
await sam.evaluate(`document.getElementById('voice-cam').click(); 1`);
// Back to Alex's camera alone, and its picture moving again, before the fullscreen checks below.
await until(async () => {
  const f = await sam.evaluate(`(async () => { const v = [...document.querySelectorAll('#voice-cams .cam-tile video')]; const a = v.map((x) => x.getVideoPlaybackQuality?.().totalVideoFrames ?? 0); await new Promise((r) => setTimeout(r, 800)); return { tiles: v.length, moving: v.every((x, i) => (x.getVideoPlaybackQuality?.().totalVideoFrames ?? 0) - a[i] > 2) }; })()`);
  return f.tiles === 1 && f.moving;
}, 10000);
await sam.evaluate(`[...document.querySelectorAll('#voice-people .together-person')].find((p) => p.textContent.includes('Alex')).click(); 1`);
await sam.sleep(300);
await sam.evaluate(`[...document.querySelectorAll('.person-pop-item')].find((b) => b.textContent.includes('🔇')).click(); 1`);
await sam.sleep(300);
const mutedForMe = await sam.evaluate(`[...document.querySelectorAll('audio')].filter((a) => a.srcObject).every((a) => a.muted)`);
check(mutedForMe, '“Benim için sustur”: Alex’in sesi sadece Sam’de kısıldı');
const alexStillOn = await alex.evaluate(`!document.querySelector('#voice-people .voice-muted')`);
check(alexStillOn, 'Alex’in mikrofonu açık kaldı (sadece Sam duymuyor)');
await sam.evaluate(`[...document.querySelectorAll('#voice-people .together-person')].find((p) => p.textContent.includes('Alex')).click(); 1`);
await sam.sleep(300);
await sam.evaluate(`[...document.querySelectorAll('.person-pop-item')].find((b) => b.textContent.includes('🔊')).click(); 1`);
await sam.sleep(300);
check(await sam.evaluate(`[...document.querySelectorAll('audio')].filter((a) => a.srcObject).every((a) => !a.muted)`), 'sesini tekrar açınca duyuluyor');
const kickOffer = await alex.evaluate(`(() => { [...document.querySelectorAll('#voice-people .together-person')].find((p) => p.textContent.includes('Sam'))?.click(); return [...document.querySelectorAll('.person-pop-item')].some((b) => b.textContent.includes('🚪')); })()`);
check(kickOffer, 'yönetici (Alex) kişi menüsünde “Odadan çıkar”ı görüyor');
await alex.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); 1`);
await sam.shot('kamera-serbest');
// Tam ekranda kameralar kendiliğinden videonun içine gelir; orada da sürüklenir.
await sam.evaluate(`document.getElementById('sync-test')?.click(); 1`);
await sam.sleep(1500);
await sam.evaluate(`document.getElementById('fullscreen')?.click(); 1`);
await sam.sleep(1200);
const inFs = await sam.evaluate(BOX);
check(inFs.fs && inFs.parent.includes('player-wrap') && inFs.w > 80 && inFs.h > 50, 'tam ekranda kameralar videonun içinde', JSON.stringify(inFs));
const fsTitle = await sam.center('#voice-cams .cam-bar-title');
await drag(fsTitle, -200, 150);
const fsMoved = await sam.evaluate(BOX);
check(Math.abs(fsMoved.x - (inFs.x - 200)) < 6 && Math.abs(fsMoved.y - (inFs.y + 150)) < 6, 'tam ekranda da sürükleniyor', JSON.stringify({ önce: inFs, sonra: fsMoved }));
await sam.shot('kamera-tam-ekran');
// Free tiles in fullscreen too: inside the video, in its top-right corner, a separate place from the page.
await sam.evaluate(`document.querySelector('#voice-cams .cam-layout').click(); 1`);
await sam.sleep(400);
// Since 0.9.91.13 the sync test (our own player) has the dock in fullscreen too: the column starts left of it.
const fsTile = await sam.evaluate(`(() => { const t = document.querySelector('#voice-cams .cam-tile'); const w = document.querySelector('.player-wrap').getBoundingClientRect(); const d = document.getElementById('fs-dock').getBoundingClientRect(); const edge = d.width > 0 ? d.left : w.right; const r = t.getBoundingClientRect(); return { inside: r.left >= w.left && r.right <= w.right && r.top >= w.top && r.bottom <= w.bottom, right: Math.round(edge - r.right), parent: document.getElementById('voice-cams').parentElement.className }; })()`);
check(fsTile.inside && fsTile.right >= 0 && fsTile.right <= 30 && fsTile.parent.includes('player-wrap'), 'tam ekranda serbest kutular videonun içinde, sağ üstte (dock’un solunda)', JSON.stringify(fsTile));
await sam.shot('kamera-tam-ekran-serbest');
await sam.evaluate(`document.querySelector('#voice-cams .cam-layout').click(); 1`);
await sam.sleep(300);
await sam.evaluate(`document.fullscreenElement ? document.exitFullscreen().then(() => 1) : (document.getElementById('fs-exit')?.click(), 1)`);
await sam.sleep(700);
const back = await sam.evaluate(BOX);
check(back.parent === 'body' && !back.fs && Math.abs(back.x - grown.x) < 6, 'tam ekrandan çıkınca sayfadaki yerine döndü', JSON.stringify(back));
const docked = await sam.evaluate(BOX);
check(docked.floating && docked.parent === 'body', 'the window stays on the page (there is no card place any more)', JSON.stringify(docked));
// Opening and closing a game must not drop the cameras (owner's friends saw tiles disappear and come back).
const FLOW = `(async () => { const v = [...document.querySelectorAll('#voice-cams .cam-tile video')]; const a = v.map((x) => x.getVideoPlaybackQuality?.().totalVideoFrames ?? 0); await new Promise((r) => setTimeout(r, 1200)); return { tiles: v.length, moving: v.every((x, i) => (x.getVideoPlaybackQuality?.().totalVideoFrames ?? 0) - a[i] > 3) }; })()`;
await alex.evaluate(`document.getElementById('game-btn').click(); 1`);
await alex.sleep(300);
await alex.evaluate(`document.querySelector('.hub-game').click(); 1`);
await alex.sleep(2500);
const withGame = await sam.evaluate(FLOW);
check(withGame.tiles === 1 && withGame.moving, 'oyun açılınca kameralar yerinde ve akıyor', JSON.stringify(withGame));
await alex.evaluate(`document.querySelector('.game-end').click(); 1`);
await alex.sleep(300);
await alex.evaluate(`document.querySelector('.dialog-backdrop:not([hidden]) .btn.primary')?.click(); 1`);
await alex.sleep(2500);
const afterGame = await sam.evaluate(FLOW);
check(afterGame.tiles === 1 && afterGame.moving, 'oyun kapanınca kameralar yerinde ve akıyor', JSON.stringify(afterGame));
// A reconnect must not leave a second (frozen) tile of the same person behind.
// 0.9.90.5: while Alex reconnects his tile never vanishes (a "📶 reconnecting" tile holds his place).
// 0.9.91.16 (owner: "why does it throw me out of voice and put me back"): a reconnect keeps the member id, so the
// direct connection is not rebuilt: Sam keeps receiving the very same camera stream from Alex.
const STREAM_ID = `(() => { const v = [...document.querySelectorAll('#voice-cams .cam-tile video')].find((x) => x.srcObject && !x.closest('.cam-tile.me')); return v ? v.srcObject.getVideoTracks()[0]?.id ?? null : null; })()`;
const streamBefore = await sam.evaluate(STREAM_ID);
const watchTiles = sam.evaluate(`(async () => { let min = 9; let note = false; for (let i = 0; i < 50; i++) { const t = document.querySelectorAll('#voice-cams .cam-tile'); min = Math.min(min, t.length); note ||= !!document.querySelector('#voice-cams .cam-tile.reconnecting'); await new Promise((r) => setTimeout(r, 100)); } return { min, note }; })()`);
await alex.evaluate(`document.getElementById('profile-reconnect').click(); 1`);
const during = await watchTiles;
console.log('     yeniden bağlanırken:', JSON.stringify(during));
check(during.min >= 1, 'Alex yeniden bağlanırken kamera kutusu kaybolmadı', JSON.stringify(during));
await alex.sleep(1000);
const afterReconnect = await sam.evaluate(FLOW);
const alexCount = await sam.evaluate(`document.querySelectorAll('#people-list [data-member-id]').length`);
check(afterReconnect.tiles === 1 && afterReconnect.moving, 'Alex yeniden bağlanınca Sam’de tek kamera kutusu var ve akıyor', JSON.stringify({ afterReconnect, alexCount }));
const streamAfter = await sam.evaluate(STREAM_ID);
check(!!streamBefore && streamBefore === streamAfter, 'Alex yeniden bağlanınca ses / görüntü bağlantısı kopmadı (aynı akış sürüyor)', JSON.stringify({ streamBefore, streamAfter }));
// The pill grows / shrinks from its corner (0.9.90.8).
await sam.evaluate(`if (!document.getElementById('voice-cams').classList.contains('free')) document.querySelector('#voice-cams .cam-layout').click(); 1`);
await sam.sleep(300);
const PILL = `(() => { const r = document.querySelector('#voice-cams .cam-pill').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()`;
const p0 = await sam.evaluate(PILL);
// Grab its real corner: a position set by hand in style is put back by the layout on its next update (the old check
// set left/top to 200 and then dragged the video under it).
await sam.mouse('mouseMoved', p0.x + p0.w / 2, p0.y + p0.h / 2);
await sam.sleep(200);
const p1 = await sam.evaluate(PILL);
await drag({ x: p1.x + p1.w - 3, y: p1.y + p1.h - 3 }, 80, 30);
const p2 = await sam.evaluate(PILL);
check(p2.w > p1.w * 1.2, 'küçük menü köşesinden çekince büyüyor', JSON.stringify({ p0, p1, p2, hit: await sam.evaluate(`document.elementFromPoint(${p1.x + p1.w - 3}, ${p1.y + p1.h - 3})?.className`) }));
check(Number(await sam.evaluate(`localStorage.getItem('camPill:scale')`)) > 1, 'menünün boyu hatırlanıyor');
await sam.shot('kucuk-menu-buyuk');
console.log('     menü:', JSON.stringify({ p0, p2 }));
await sam.evaluate(`document.querySelector('#voice-cams .cam-reset').click(); 1`);
// 0.9.91.5 (owner): the pill comes and goes with the cameras: no camera, no pill (even in voice).
await alex.evaluate(`document.getElementById('voice-cam').click(); 1`);
const camGone = await until(() => sam.evaluate(`document.getElementById('voice-cams').hidden`), 8000);
check(!!camGone, 'Alex kamerasını kapatınca kutusu da küçük menü de kalktı (Sam seste olsa da)');

// 0.9.90.9 Shorts view (owner's idea): no camera tiles; Alex's camera fills his seat's avatar circle; only 🎙 / 📷 below.
await alex.evaluate(`document.getElementById('voice-cam').click(); 1`);
await sam.evaluate(`(() => { const i = document.getElementById('media-input'); i.value = 'https://www.youtube.com/shorts/aqz-KE-bpKQ'; i.form.querySelector('button[value=load]').click(); return 1; })()`);
const inShorts = await until(() => sam.evaluate(`document.querySelector('.room.shorts') ? 1 : null`), 10000);
check(!!inShorts, 'Shorts açıldı (oturma odası görünümü)');
const seatCam = await until(
  () =>
    sam.evaluate(`(() => { const v = [...document.querySelectorAll('.seat:not(.me) .seat-cam')].find((x) => x.videoWidth > 0); const r = v?.getBoundingClientRect(); return v ? { w: Math.round(r.width), h: Math.round(r.height), tiles: getComputedStyle(document.getElementById('voice-cams')).display } : null; })()`),
  12000,
);
check(!!seatCam && seatCam.tiles === 'none' && seatCam.w >= 70, 'Shorts’ta Alex’in kamerası profil yuvarlağının içinde, kamera kutuları yok', JSON.stringify(seatCam));
const shortsCtl = await sam.evaluate(`(() => { const v = document.getElementById('shorts-voice'); return v && !v.hidden ? [...v.querySelectorAll('button:not([hidden])')].map((b) => b.textContent) : null; })()`);
check(!!shortsCtl && shortsCtl.length === 2, 'Shorts’un alt çubuğunda sadece 🎙 ve 📷', JSON.stringify(shortsCtl));
await sam.evaluate(`document.getElementById('shorts-mic').click(); 1`);
check(!!(await until(() => alex.evaluate(`!!document.querySelector('#voice-people .voice-muted')`), 8000)), 'Shorts’taki 🎙 ile mikrofon kapandı');
await sam.evaluate(`document.getElementById('shorts-mic').click(); 1`);
await until(() => alex.evaluate(`!document.querySelector('#voice-people .voice-muted')`), 8000);
await sam.shot('shorts-kamera');
for (const b of [alex, sam]) await b.evaluate(`document.getElementById('shorts-exit')?.click(); 1`);
await alex.evaluate(`document.getElementById('voice-cam').click(); 1`);
await alex.sleep(800);

// Sessize alma: Sam 🔇 → Alex'te sesi biter (akış kalır, enerji düşer), Sam'in avatarında 🔇.
await sam.evaluate(`document.getElementById('voice-mic').click(); 1`);
await alex.sleep(2000);
const muted = await alex.evaluate(LEVEL);
const badge = await alex.evaluate(`!!document.querySelector('#voice-people .voice-muted')`);
check(muted.rms < 0.005 && badge, 'Sam sessize alınca Alex onu duymuyor ve 🔇 görünüyor', JSON.stringify({ muted, badge }));
// Reconnecting (network hiccup) must keep a muted microphone muted; it used to come back on by itself.
await sam.evaluate(`document.getElementById('profile-reconnect').click(); 1`);
await alex.sleep(6000);
console.log('     Sam (yeniden bağlandıktan sonra):', JSON.stringify(await sam.evaluate(`({ muted: document.getElementById('voice-mic').classList.contains('muted-mic'), key: Object.keys(localStorage).filter((k) => k.startsWith('voiceMic')).map((k) => k + '=' + localStorage.getItem(k)), on: !document.getElementById('voice-on').hidden })`)));
const samRows = await alex.evaluate(`[...document.querySelectorAll('#voice-people [data-voice-id]')].length`);
const stillMuted = await alex.evaluate(`!!document.querySelector('#voice-people .voice-muted')`);
const afterLevel = await alex.evaluate(LEVEL);
check(stillMuted && afterLevel.rms < 0.005, 'Sam yeniden bağlanınca mikrofonu yine kapalı (kendiliğinden açılmadı)', JSON.stringify({ stillMuted, afterLevel, samRows }));
const roomTitle = await alex.evaluate(`document.querySelector('.room-title')?.textContent ?? ''`);
check(/· 2 /.test(roomTitle), 'yeniden bağlanan kişi odada iki kez sayılmıyor', roomTitle);

// Bas-konuş: Sam seçer (mikrofon kapalı durur), V'ye basılı tutunca Alex onu duyar, bırakınca susar.
await sam.evaluate(`(() => { const c = document.getElementById('voice-ptt'); c.checked = true; c.dispatchEvent(new Event('change')); return 1; })()`);
await sam.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true })); 1`);
const pttOn = await until(() => alex.evaluate(`!document.querySelector('#voice-people .voice-muted')`), 8000);
// BH10: the level is measured over a short window, so right after the switch it still holds the silence before it.
const pttLevel = (await until(async () => { const l = await alex.evaluate(LEVEL); return l.rms > 0.01 ? l : null; }, 6000)) ?? (await alex.evaluate(LEVEL));
check(!!pttOn && pttLevel.rms > 0.01, 'bas-konuş: Sam V’ye basılı tutunca Alex onu duyuyor', JSON.stringify(pttLevel));
await sam.evaluate(`document.dispatchEvent(new KeyboardEvent('keyup', { key: 'v', bubbles: true })); 1`);
const pttOff = await until(() => alex.evaluate(`!!document.querySelector('#voice-people .voice-muted')`), 8000);
check(!!pttOff, 'bas-konuş: V bırakılınca Sam yine sessiz (🔇)');
await sam.evaluate(`(() => { const c = document.getElementById('voice-ptt'); c.checked = false; c.dispatchEvent(new Event('change')); return 1; })()`);

// Kim durdurdu: Alex senkron testini açıp durdurunca Sam'de videonun üstünde "Alex durdurdu" notu.
await alex.evaluate(`document.getElementById('sync-test').click(); 1`);
await until(() => sam.evaluate(`!!document.querySelector('#player canvas, #player video')`), 10000);
await alex.sleep(1500);
await alex.evaluate(`document.getElementById('fs-play').click(); 1`);
const notice = await until(() => sam.evaluate(`(() => { const n = document.getElementById('action-notice'); return n && !n.hidden ? n.textContent : null; })()`), 8000);
check(!!notice && notice.includes('Alex'), 'Alex durdurunca Sam’de videonun üstünde not çıktı', String(notice));
const ownNotice = await alex.evaluate(`document.getElementById('action-notice').hidden`);
check(ownNotice, 'kendi hareketim için not çıkmıyor');

// Ayrılma: Sam ayrılınca Alex'te akışı kalkar.
await sam.evaluate(`document.getElementById('voice-leave').click(); 1`);
const gone = await until(async () => (await alex.evaluate(`document.querySelectorAll('audio').length`)) === 0, 10000);
check(!!gone, 'Sam sesten ayrılınca Alex tarafında akışı kapandı');

alex.close();
sam.close();
console.log(failed ? `\n✗ ${failed} kontrol başarısız` : '\n✓ Sesli sohbet testi geçti');
process.exit(failed ? 1 : 0);
