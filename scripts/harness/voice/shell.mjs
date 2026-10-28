// Film sayfasındaki katmanda sesli/görüntülü sohbetin gerçek testi: Ali sitedeki odada, Ayşe eklentiyle film sayfasında.
// Ayşe'nin sesi ve kamerası eklentinin görünmeyen sayfasında (offscreen) çalışır; ilk katılışta izin sekmesi (mic.html)
// açılır; kameralar katmandaki siteye eklentinin yerel köprüsüyle gelir.
//
//   npm run build:extension:dev ; sunucu (8787) + site (5173) ; node scripts/harness/embed/film-server.mjs
//   VOICE_A=a.wav VOICE_B=b.wav node scripts/harness/voice/shell.mjs [site] [sunucu-ws]
// (iki farklı ses dosyası: ffmpeg ile ör. "sine=frequency=330,tremolo=f=3" ve "anoisesrc=color=pink,tremolo=f=2")
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from '../embed/cdp.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const EXT = join(here, '../../../apps/extension/dist');
const SITE = process.argv[2] ?? 'http://localhost:5173';
const WS = process.argv[3] ?? 'ws://localhost:8787';
const FILM = 'http://127.0.0.1:5299/film';
const room = 'sesf' + Math.random().toString(36).slice(2, 8);
const FAKE_MIC = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'];
/**
 * İki kişinin sahte mikrofonu aynı anda aynı bip'i çalarsa yankı engelleyici kendi mikrofonundaki bip'i karşıdan gelen
 * bip'in yankısı sanıp siler (test bazen sessizlik ölçer). VOICE_A / VOICE_B: farklı ses dosyaları (wav).
 */
const micFile = (file) => (file ? [`--use-file-for-fake-audio-capture=${file}`] : []);

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

async function person(name, avatar, args = FAKE_MIC) {
  const b = await launch({ ext: EXT, out: join(here, `voice-${name}`), args });
  await b.navigate(`${SITE}/`);
  await b.sleep(1500);
  await b.evaluate(`localStorage.setItem('name', ${JSON.stringify(name)}); localStorage.setItem('avatar', ${JSON.stringify(avatar)}); localStorage.setItem('lang','tr'); localStorage.setItem('opt:duck2','1'); 1`);
  await b.navigate(`${SITE}/r/${room}#back`);
  return b;
}

/** Sayfadaki uzak ses akışlarının (görünmez <audio>) ses enerjisi. */
const LEVEL = `(async () => {
  const audios = [...document.querySelectorAll('audio')].filter((a) => a.srcObject);
  if (!audios.length) return { n: 0, rms: 0 };
  const ctx = new AudioContext();
  let best = 0;
  for (const a of audios) {
    const an = ctx.createAnalyser();
    an.fftSize = 2048;
    ctx.createMediaStreamSource(a.srcObject).connect(an);
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

// Odayı sahte bir üçüncü kişi (Cem) film sayfasıyla kurar.
const cem = new WebSocket(`${WS}/api/rooms/${room}/ws`);
await new Promise((r) => cem.addEventListener('open', r));
cem.send(JSON.stringify({ t: 'hello', v: 3, name: 'Cem', cid: 'sesCem0000001' }));

const ali = await person('Ali', 'wizard', [...FAKE_MIC, ...micFile(process.env.VOICE_A)]);
const ayse = await person('Ayse', 'elf', [...FAKE_MIC, ...micFile(process.env.VOICE_B)]);
/** Kişi sitedeki odada "Filme git"e basar, film sayfasındaki katmanda ses kartını bekler. */
async function toFilm(b, who) {
  const goCard = await until(() => b.evaluate(`!document.getElementById('external').hidden && !document.getElementById('external-go').hidden`), 15000);
  check(!!goCard, `${who} sitedeki odada "Filme git" kartını gördü`);
  await b.evaluate(`document.getElementById('external-go').click(); 1`);
  const card = await until(() => b.evalFrame('shell=1', `(() => { const c = document.getElementById('voice-card'); return !!c && !c.hidden; })()`), 20000);
  check(!!card, `${who}: film sayfasındaki katmanda sesli sohbet kartı görünüyor`);
}

await until(() => ayse.evaluate(`document.getElementById('people-count')?.textContent === '3'`), 20000);
cem.send(JSON.stringify({ t: 'load', media: { kind: 'page', url: FILM } }));

// İzin yolu (ayrı tarayıcı, istem kendiliğinden kabul edilmez; CDP eklenti kökenine izin veremiyor): ilk katılışta
// izin sekmesi (mic.html) açılır; kişi izin vermeden kapatırsa katmanda "izin verilmedi" uyarısı, ses kapalı kalır.
{
  const deniz = await person('Deniz', 'elf', ['--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required']);
  await toFilm(deniz, 'Deniz');
  await deniz.evalFrame('shell=1', `document.getElementById('voice-join').click(); 1`);
  const micTab = await until(async () => ((await deniz.browser('Target.getTargets')).result?.targetInfos ?? []).find((t) => t.url.endsWith('/mic.html')), 10000);
  check(!!micTab, 'izin yokken "Sese katıl" izin sekmesini (mic.html) açtı');
  if (micTab) {
    const page = await deniz.attach(micTab.targetId);
    const label = await until(() => page.evaluate(`document.getElementById('allow')?.textContent`), 5000);
    check(!!label && label.includes('Mikrofon'), 'izin sekmesinde "Mikrofon iznini ver" düğmesi var', String(label));
    await deniz.browser('Target.closeTarget', { targetId: micTab.targetId });
  }
  const warned = await until(() => deniz.evalFrame('shell=1', `(() => { const h = document.querySelector('.hint-bubble'); return h && document.getElementById('voice-on').hidden ? h.textContent : null; })()`), 8000);
  check(!!warned, 'izin sekmesi izinsiz kapatılınca katmanda uyarı, ses kapalı', String(warned));
  deniz.close();
}

await toFilm(ayse, 'Ayşe');
// Ayşe'nin tarayıcısında istem kendiliğinden kabul edilir (sahte cihaz): izin zaten var, doğrudan katılır.
await ayse.evalFrame('shell=1', `document.getElementById('voice-join').click(); 1`);
const ayseIn = await until(() => ayse.evalFrame('shell=1', `!document.getElementById('voice-on').hidden`), 15000);
check(!!ayseIn, 'Ayşe film sayfasında seste (ses eklentinin görünmeyen sayfasında)');

await ali.evaluate(`document.getElementById('voice-join').click(); 1`);
const bothIn = await until(async () => (await ali.evaluate(`document.querySelectorAll('#voice-people .voice-face.in-voice').length`)) === 2, 15000);
check(!!bothIn, 'ikisi de seste (Ali’nin kartında iki avatar)');
const aliHears = await until(async () => (await ali.evaluate(`document.querySelectorAll('audio').length`)) >= 1, 20000);
check(!!aliHears, 'Ali, Ayşe’nin (eklentiden gelen) ses akışını aldı');
await ali.sleep(1500);
const la = await ali.evaluate(LEVEL);
console.log('     Ali’de ses enerjisi:', JSON.stringify(la));
check(la.rms > 0.01, 'Ali, film sayfasındaki Ayşe’yi gerçekten duyuyor');
const ayseHears = await until(
  () => ayse.evalFrame('shell=1', `(() => { const f = [...document.querySelectorAll('#voice-people [data-voice-id]')]; return f.some((x) => x.classList.contains('speaking')); })()`),
  15000,
);
check(!!ayseHears, 'Ayşe (eklenti) Ali’yi duyuyor: konuşan göstergesi yanıyor');
const ducked = await until(() => ayse.evaluate(`(() => { const v = document.querySelector('video'); return v && v.volume < 0.9 ? v.volume : null; })()`), 10000);
check(!!ducked, 'Ali konuşurken film sesi kısıldı', String(ducked));

/** Kamera kutularındaki görüntüler: [kimin, genişlik, oynuyor mu] (kare geliyorsa genişlik > 0, zaman ilerler). */
const CAMS = `(async () => {
  const vids = [...document.querySelectorAll('#voice-cams .cam-tile')].map((t) => ({ t, v: t.querySelector('video'), at: t.querySelector('video').currentTime }));
  await new Promise((r) => setTimeout(r, 600));
  return vids.map(({ t, v, at }) => ({ name: t.querySelector('.cam-name').textContent, mine: t.classList.contains('mine'), w: v.videoWidth, moving: v.currentTime > at }));
})()`;
const sees = (list, name, mine = false) => (list ?? []).some((c) => c.name === name && c.mine === mine && c.w > 0 && c.moving);

// Görüntülü sohbet film sayfasında: Ali'nin kamerası katmandaki siteye eklentinin köprüsüyle gelir.
await ali.evaluate(`document.getElementById('voice-cam').click(); 1`);
const camButton = await until(() => ayse.evalFrame('shell=1', `!document.getElementById('voice-cam').hidden`), 10000);
check(!!camButton, 'film sayfasında da kamera düğmesi var');
const ayseSeesAli = await until(async () => {
  const list = await ayse.evalFrame('shell=1', CAMS);
  return sees(list, 'Ali') ? list : null;
}, 20000);
check(!!ayseSeesAli, 'Ayşe film sayfasında Ali’nin kamerasını görüyor (köprüden kareler geliyor)', JSON.stringify(ayseSeesAli));
// Ayşe kamerasını film sayfasından açar (kamera eklentinin görünmeyen sayfasında).
await ayse.evalFrame('shell=1', `document.getElementById('voice-cam').click(); 1`);
const ayseOwn = await until(async () => {
  const list = await ayse.evalFrame('shell=1', CAMS);
  return sees(list, 'Ayse', true) ? list : null;
}, 20000);
check(!!ayseOwn, 'Ayşe film sayfasında kendi kamerasının önizlemesini görüyor', JSON.stringify(ayseOwn));
const aliSeesAyse = await until(async () => {
  const list = await ali.evaluate(CAMS);
  return sees(list, 'Ayse') ? list : null;
}, 20000);
check(!!aliSeesAyse, 'Ali sitede Ayşe’nin (film sayfasından açılan) kamerasını görüyor', JSON.stringify(aliSeesAyse));

// Kameralar serbest (0.9.81) film sayfasında da: yüzen pencere deliğin üstüne gelince adacık olur (görünür kalır).
const SHELL_CLIP = `getComputedStyle(document.querySelector('iframe[src^="chrome-extension://"]')).clipPath`;
await ayse.evalFrame('shell=1', `document.querySelector('#voice-cams .cam-pop').click(); 1`);
const floated = await until(() => ayse.evalFrame('shell=1', `(() => { const b = document.getElementById('voice-cams'); return b.classList.contains('floating') && b.hasAttribute('data-island'); })()`));
check(!!floated, 'film sayfasında kameralar serbest bırakılabiliyor');
await ayse.evalFrame('shell=1', `(() => { const b = document.getElementById('voice-cams'); const w = document.querySelector('.player-wrap').getBoundingClientRect(); b.style.left = w.right + 40 + 'px'; b.style.top = '120px'; dispatchEvent(new Event('swm-layout')); return 1; })()`);
await ayse.sleep(400);
const clipOut = await ayse.evaluate(SHELL_CLIP);
await ayse.evalFrame('shell=1', `(() => { const b = document.getElementById('voice-cams'); const w = document.querySelector('.player-wrap').getBoundingClientRect(); b.style.left = w.left + 30 + 'px'; b.style.top = w.top + 30 + 'px'; dispatchEvent(new Event('swm-layout')); return 1; })()`);
const clipOver = await until(async () => {
  const clip = await ayse.evaluate(SHELL_CLIP);
  return clip !== clipOut ? clip : null;
}, 5000);
check(!!clipOver, 'yüzen kamera penceresi deliğin üstündeyken adacık (film sayfasında görünüyor)');
await ayse.shot('kamera-film-serbest');
await ayse.evalFrame('shell=1', `document.querySelector('#voice-cams .cam-dock-btn').click(); 1`);
const dockedBack = await until(() => ayse.evalFrame('shell=1', `!document.getElementById('voice-cams').classList.contains('floating')`));
check(!!dockedBack, 'kameralar karta geri döndü');

// Bas-konuş film sayfasında: V tuşu film sitesine gösterilmeden katmana gider (basınca ve bırakınca).
await ayse.evalFrame('shell=1', `(() => { const c = document.getElementById('voice-ptt'); c.checked = true; c.dispatchEvent(new Event('change')); return 1; })()`);
const pttMuted = await until(() => ali.evaluate(`!!document.querySelector('#voice-people .voice-muted')`), 8000);
await ayse.evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true })); 1`);
const pttTalk = await until(() => ali.evaluate(`!document.querySelector('#voice-people .voice-muted')`), 8000);
await ayse.evaluate(`window.dispatchEvent(new KeyboardEvent('keyup', { key: 'v', bubbles: true })); 1`);
const pttBack = await until(() => ali.evaluate(`!!document.querySelector('#voice-people .voice-muted')`), 8000);
check(!!pttMuted && !!pttTalk && !!pttBack, 'bas-konuş film sayfasında: V basılıyken mikrofon açık, bırakınca kapalı', JSON.stringify({ pttMuted, pttTalk, pttBack }));
await ayse.evalFrame('shell=1', `(() => { const c = document.getElementById('voice-ptt'); c.checked = false; c.dispatchEvent(new Event('change')); return 1; })()`);

// Film sayfası yenilenir: ses eklentide sürer, yeni bağlantıyla yeniden kurulur (Ali yine duyar).
await ayse.evaluate('location.reload(); 1');
await ayse.sleep(3000);
const again = await until(async () => {
  const faces = await ali.evaluate(`document.querySelectorAll('#voice-people .voice-face.in-voice').length`);
  const audios = await ali.evaluate(`document.querySelectorAll('audio').length`);
  return faces === 2 && audios >= 1;
}, 25000);
check(!!again, 'film sayfası yenilenince ses kopmadı (Ayşe yeniden seste, Ali duyuyor)');
if (again) {
  // Yeni bağlantıda ses birkaç saniyede akmaya başlar: birkaç kez dinle.
  const lb = await until(async () => {
    const level = await ali.evaluate(LEVEL);
    return level.rms > 0.01 ? level : null;
  }, 15000);
  check(!!lb, 'yenilemeden sonra da Ali, Ayşe’yi duyuyor', JSON.stringify(lb));
  const camsBack = await until(async () => {
    const mine = await ayse.evalFrame('shell=1', CAMS);
    const theirs = await ali.evaluate(CAMS);
    return sees(mine, 'Ali') && sees(mine, 'Ayse', true) && sees(theirs, 'Ayse') ? true : null;
  }, 25000);
  check(!!camsBack, 'yenilemeden sonra kameralar iki tarafta da yine görünüyor');
}

// Ayşe katmandan sesten ayrılır → Ali'de akışı kalkar.
await until(() => ayse.evalFrame('shell=1', `!document.getElementById('voice-on').hidden`), 10000);
await ayse.evalFrame('shell=1', `document.getElementById('voice-leave').click(); 1`);
const gone = await until(async () => (await ali.evaluate(`document.querySelectorAll('audio').length`)) === 0, 10000);
check(!!gone, 'Ayşe ayrılınca Ali tarafında akışı kapandı');

// Sitede seste olan Ali filme geçer: izin zaten var, ses film sayfasında kendiliğinden devam eder.
await toFilm(ali, 'Ali');
const aliKept = await until(() => ali.evalFrame('shell=1', `!document.getElementById('voice-on').hidden`), 15000);
check(!!aliKept, 'sitede seste olan Ali filme geçince ses film sayfasında kendiliğinden açıldı');

cem.close();
ali.close();
ayse.close();
console.log(failed ? `\n✗ ${failed} kontrol başarısız` : '\n✓ Film sayfasında sesli sohbet testi geçti');
process.exit(failed ? 1 : 0);
