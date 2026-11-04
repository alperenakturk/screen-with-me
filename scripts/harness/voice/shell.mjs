// Film sayfasındaki katmanda sesli/görüntülü sohbetin gerçek testi: Alex sitedeki odada, Sam eklentiyle film sayfasında.
// Sam'in sesi ve kamerası eklentinin görünmeyen sayfasında (offscreen) çalışır; ilk katılışta izin sekmesi (mic.html)
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

// Odayı sahte bir üçüncü kişi (Casey) film sayfasıyla kurar.
const casey = new WebSocket(`${WS}/api/rooms/${room}/ws`);
await new Promise((r) => casey.addEventListener('open', r));
casey.send(JSON.stringify({ t: 'hello', v: 3, name: 'Casey', cid: 'sesCasey00001' }));

const alex = await person('Alex', 'wizard', [...FAKE_MIC, ...micFile(process.env.VOICE_A)]);
const sam = await person('Sam', 'elf', [...FAKE_MIC, ...micFile(process.env.VOICE_B)]);
/** Kişi sitedeki odada "Filme git"e basar, film sayfasındaki katmanda ses kartını bekler. */
async function toFilm(b, who) {
  const goCard = await until(() => b.evaluate(`!document.getElementById('external').hidden && !document.getElementById('external-go').hidden`), 15000);
  check(!!goCard, `${who} sitedeki odada "Filme git" kartını gördü`);
  await b.evaluate(`document.getElementById('external-go').click(); 1`);
  const card = await until(() => b.evalFrame('shell=1', `(() => { const c = document.getElementById('voice-card'); return !!c && !c.hidden; })()`), 20000);
  check(!!card, `${who}: film sayfasındaki katmanda sesli sohbet kartı görünüyor`);
}

await until(() => sam.evaluate(`document.getElementById('people-count')?.textContent === '3'`), 20000);
casey.send(JSON.stringify({ t: 'load', media: { kind: 'page', url: FILM } }));

// İzin yolu (ayrı tarayıcı, istem kendiliğinden kabul edilmez; CDP eklenti kökenine izin veremiyor): ilk katılışta
// izin sekmesi (mic.html) açılır; kişi izin vermeden kapatırsa katmanda "izin verilmedi" uyarısı, ses kapalı kalır.
{
  const robin = await person('Robin', 'elf', ['--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required']);
  await toFilm(robin, 'Robin');
  await robin.evalFrame('shell=1', `(async () => { document.getElementById('voice-join').click(); await new Promise((r) => setTimeout(r, 400)); if (document.querySelector('.ip-notice')) document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
  const micTab = await until(async () => ((await robin.browser('Target.getTargets')).result?.targetInfos ?? []).find((t) => t.url.endsWith('/mic.html')), 10000);
  check(!!micTab, 'izin yokken "Sese katıl" izin sekmesini (mic.html) açtı');
  if (micTab) {
    const page = await robin.attach(micTab.targetId);
    const label = await until(() => page.evaluate(`document.getElementById('allow')?.textContent`), 5000);
    check(!!label && label.includes('Mikrofon'), 'izin sekmesinde "Mikrofon iznini ver" düğmesi var', String(label));
    await robin.browser('Target.closeTarget', { targetId: micTab.targetId });
  }
  const warned = await until(() => robin.evalFrame('shell=1', `(() => { const h = document.querySelector('.hint-bubble'); return h && document.getElementById('voice-on').hidden ? h.textContent : null; })()`), 8000);
  check(!!warned, 'izin sekmesi izinsiz kapatılınca katmanda uyarı, ses kapalı', String(warned));
  robin.close();
}

await toFilm(sam, 'Sam');
// Sam'in tarayıcısında istem kendiliğinden kabul edilir (sahte cihaz): izin zaten var, doğrudan katılır.
await sam.evalFrame('shell=1', `(async () => { document.getElementById('voice-join').click(); await new Promise((r) => setTimeout(r, 400)); if (document.querySelector('.ip-notice')) document.querySelector('.confirm-dialog .btn.primary').click(); return 1; })()`);
const samIn = await until(() => sam.evalFrame('shell=1', `!document.getElementById('voice-on').hidden`), 15000);
check(!!samIn, 'Sam film sayfasında seste (ses eklentinin görünmeyen sayfasında)');

// On the site the pre-join check (0.9.90.6) follows the IP notice: "Sese katıl" with the default devices.
await alex.evaluate(`(async () => { document.getElementById('voice-join').click(); for (let i = 0; i < 30; i++) { await new Promise((r) => setTimeout(r, 150)); const d = document.querySelector('.confirm-dialog'); if (!d) { if (i > 10) break; continue; } d.querySelector('.btn.primary').click(); } return 1; })()`);
const bothIn = await until(async () => (await alex.evaluate(`document.querySelectorAll('#voice-people .voice-face.in-voice').length`)) === 2, 15000);
check(!!bothIn, 'ikisi de seste (Alex’in kartında iki avatar)');
const alexHears = await until(async () => (await alex.evaluate(`document.querySelectorAll('audio').length`)) >= 1, 20000);
check(!!alexHears, 'Alex, Sam’in (eklentiden gelen) ses akışını aldı');
await alex.sleep(1500);
const la = await alex.evaluate(LEVEL);
console.log('     Alex’te ses enerjisi:', JSON.stringify(la));
check(la.rms > 0.01, 'Alex, film sayfasındaki Sam’i gerçekten duyuyor');
const samHears = await until(
  () => sam.evalFrame('shell=1', `(() => { const f = [...document.querySelectorAll('#voice-people [data-voice-id]')]; return f.some((x) => x.classList.contains('speaking')); })()`),
  15000,
);
check(!!samHears, 'Sam (eklenti) Alex’i duyuyor: konuşan göstergesi yanıyor');
const ducked = await until(() => sam.evaluate(`(() => { const v = document.querySelector('video'); return v && v.volume < 0.9 ? v.volume : null; })()`), 10000);
check(!!ducked, 'Alex konuşurken film sesi kısıldı', String(ducked));

/** Kamera kutularındaki görüntüler: [kimin, genişlik, oynuyor mu] (kare geliyorsa genişlik > 0, zaman ilerler). */
const CAMS = `(async () => {
  const vids = [...document.querySelectorAll('#voice-cams .cam-tile')].map((t) => ({ t, v: t.querySelector('video'), at: t.querySelector('video').currentTime }));
  await new Promise((r) => setTimeout(r, 600));
  return vids.map(({ t, v, at }) => ({ name: t.querySelector('.cam-name').textContent, mine: t.classList.contains('mine'), w: v.videoWidth, moving: v.currentTime > at }));
})()`;
const sees = (list, name, mine = false) => (list ?? []).some((c) => c.name === name && c.mine === mine && c.w > 0 && c.moving);

// Görüntülü sohbet film sayfasında: Alex'in kamerası katmandaki siteye eklentinin köprüsüyle gelir.
await alex.evaluate(`document.getElementById('voice-cam').click(); 1`);
const camButton = await until(() => sam.evalFrame('shell=1', `!document.getElementById('voice-cam').hidden`), 10000);
check(!!camButton, 'film sayfasında da kamera düğmesi var');
const samSeesAlex = await until(async () => {
  const list = await sam.evalFrame('shell=1', CAMS);
  return sees(list, 'Alex') ? list : null;
}, 20000);
check(!!samSeesAlex, 'Sam film sayfasında Alex’in kamerasını görüyor (köprüden kareler geliyor)', JSON.stringify(samSeesAlex));
// Sam kamerasını film sayfasından açar (kamera eklentinin görünmeyen sayfasında).
await sam.evalFrame('shell=1', `document.getElementById('voice-cam').click(); 1`);
const samOwn = await until(async () => {
  const list = await sam.evalFrame('shell=1', CAMS);
  return sees(list, 'Sam', true) ? list : null;
}, 20000);
check(!!samOwn, 'Sam film sayfasında kendi kamerasının önizlemesini görüyor', JSON.stringify(samOwn));
const alexSeesSam = await until(async () => {
  const list = await alex.evaluate(CAMS);
  return sees(list, 'Sam') ? list : null;
}, 20000);
check(!!alexSeesSam, 'Alex sitede Sam’in (film sayfasından açılan) kamerasını görüyor', JSON.stringify(alexSeesSam));

// Kameralar serbest (0.9.81) film sayfasında da: yüzen pencere deliğin üstüne gelince adacık olur (görünür kalır).
const SHELL_CLIP = `getComputedStyle(document.querySelector('iframe[src^="chrome-extension://"]')).clipPath`;
// Card 6g.7: cameras start in their own window (one window); switch it to free tiles here: the box lets clicks
// through, every tile (and the pill) is its own island.
await sam.evalFrame('shell=1', `(() => { if (!document.getElementById('voice-cams').classList.contains('free')) document.querySelector('#voice-cams .cam-layout').click(); return 1; })()`);
const floated = await until(() => sam.evalFrame('shell=1', `(() => { const b = document.getElementById('voice-cams'); const t = b.querySelector('.cam-tile'); return b.classList.contains('floating') && b.classList.contains('free') && !b.hasAttribute('data-island') && !!t && t.hasAttribute('data-island'); })()`));
check(!!floated, 'film sayfasında kameralar serbest bırakılabiliyor (her kutu ayrı adacık)');
await sam.evalFrame('shell=1', `(() => { const t = document.querySelector('#voice-cams .cam-tile'); const w = document.querySelector('.player-wrap').getBoundingClientRect(); t.style.left = w.right + 40 + 'px'; t.style.top = '120px'; dispatchEvent(new Event('swm-layout')); return 1; })()`);
await sam.sleep(400);
const clipOut = await sam.evaluate(SHELL_CLIP);
await sam.evalFrame('shell=1', `(() => { const t = document.querySelector('#voice-cams .cam-tile'); const w = document.querySelector('.player-wrap').getBoundingClientRect(); t.style.left = w.left + 30 + 'px'; t.style.top = w.top + 30 + 'px'; dispatchEvent(new Event('swm-layout')); return 1; })()`);
const clipOver = await until(async () => {
  const clip = await sam.evaluate(SHELL_CLIP);
  return clip !== clipOut ? clip : null;
}, 5000);
check(!!clipOver, 'kamera kutusu deliğin üstündeyken adacık (film sayfasında görünüyor)');
await sam.shot('kamera-film-serbest');
await sam.evalFrame('shell=1', `document.querySelector('#voice-cams .cam-layout').click(); 1`);
const grouped = await until(() => sam.evalFrame('shell=1', `(() => { const b = document.getElementById('voice-cams'); return b.classList.contains('floating') && !b.classList.contains('free') && b.hasAttribute('data-island'); })()`));
check(!!grouped, 'back to the one window (an island on the film page)');

// Bas-konuş film sayfasında: V tuşu film sitesine gösterilmeden katmana gider (basınca ve bırakınca).
await sam.evalFrame('shell=1', `(() => { const c = document.getElementById('voice-ptt'); c.checked = true; c.dispatchEvent(new Event('change')); return 1; })()`);
const pttMuted = await until(() => alex.evaluate(`!!document.querySelector('#voice-people .voice-muted')`), 8000);
await sam.evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true })); 1`);
const pttTalk = await until(() => alex.evaluate(`!document.querySelector('#voice-people .voice-muted')`), 8000);
await sam.evaluate(`window.dispatchEvent(new KeyboardEvent('keyup', { key: 'v', bubbles: true })); 1`);
const pttBack = await until(() => alex.evaluate(`!!document.querySelector('#voice-people .voice-muted')`), 8000);
check(!!pttMuted && !!pttTalk && !!pttBack, 'bas-konuş film sayfasında: V basılıyken mikrofon açık, bırakınca kapalı', JSON.stringify({ pttMuted, pttTalk, pttBack }));
await sam.evalFrame('shell=1', `(() => { const c = document.getElementById('voice-ptt'); c.checked = false; c.dispatchEvent(new Event('change')); return 1; })()`);

// 0.9.91.14 (owner): on the film page I choose the microphone / camera / speaker myself: "🎛" on myself lists the
// devices the extension knows (by name) and the choice goes to the extension.
{
  const listed = await sam.evalFrame(
    'shell=1',
    `(async () => {
      const me = [...document.querySelectorAll('#voice-people .together-person')].find((b) => b.querySelector('.voice-face.in-voice') && b.textContent.includes('${'Sen'}'))
        ?? document.querySelector('#voice-people .together-person');
      me.click();
      await new Promise((r) => setTimeout(r, 300));
      const item = [...document.querySelectorAll('.person-pop .person-pop-item')].find((b) => b.textContent.includes('🎛'));
      if (!item) return { item: false };
      item.click();
      for (let i = 0; i < 30 && !document.querySelector('.confirm-dialog .voice-check-select'); i++) await new Promise((r) => setTimeout(r, 100));
      const selects = [...document.querySelectorAll('.confirm-dialog .voice-check-select')];
      const mics = selects[0] ? [...selects[0].options].map((o) => o.textContent) : [];
      if (selects[0] && selects[0].options.length > 1) selects[0].value = selects[0].options[1].value;
      document.querySelector('.confirm-dialog .btn.primary')?.click();
      await new Promise((r) => setTimeout(r, 300));
      return { item: true, mics, saved: localStorage.getItem('opt:micName') ?? null };
    })()`,
  );
  check(!!listed?.item && listed.mics.length > 1, 'film sayfasında 🎛: mikrofonlar eklentiden geliyor (adlarıyla)', JSON.stringify(listed));
  const stillHears = await until(async () => {
    const l = await alex.evaluate(LEVEL);
    return l && l.rms > 0.01 ? l : null;
  }, 10000);
  check(!!stillHears, 'film sayfasında mikrofon değişince ses kopmadı (Alex yine duyuyor)', JSON.stringify(stillHears));
}

// Film sayfası yenilenir: ses eklentide sürer, yeni bağlantıyla yeniden kurulur (Alex yine duyar).
await sam.evaluate('location.reload(); 1');
await sam.sleep(3000);
const again = await until(async () => {
  const faces = await alex.evaluate(`document.querySelectorAll('#voice-people .voice-face.in-voice').length`);
  const audios = await alex.evaluate(`document.querySelectorAll('audio').length`);
  return faces === 2 && audios >= 1;
}, 25000);
check(!!again, 'film sayfası yenilenince ses kopmadı (Sam yeniden seste, Alex duyuyor)');
if (again) {
  // Yeni bağlantıda ses birkaç saniyede akmaya başlar: birkaç kez dinle.
  const lb = await until(async () => {
    const level = await alex.evaluate(LEVEL);
    return level.rms > 0.01 ? level : null;
  }, 15000);
  check(!!lb, 'yenilemeden sonra da Alex, Sam’i duyuyor', JSON.stringify(lb));
  const camsBack = await until(async () => {
    const mine = await sam.evalFrame('shell=1', CAMS);
    const theirs = await alex.evaluate(CAMS);
    return sees(mine, 'Alex') && sees(mine, 'Sam', true) && sees(theirs, 'Sam') ? true : null;
  }, 25000);
  check(!!camsBack, 'yenilemeden sonra kameralar iki tarafta da yine görünüyor');
}

// Sam katmandan sesten ayrılır → Alex'te akışı kalkar.
await until(() => sam.evalFrame('shell=1', `!document.getElementById('voice-on').hidden`), 10000);
await sam.evalFrame('shell=1', `document.getElementById('voice-leave').click(); 1`);
const gone = await until(async () => (await alex.evaluate(`document.querySelectorAll('audio').length`)) === 0, 10000);
check(!!gone, 'Sam ayrılınca Alex tarafında akışı kapandı');

// Sitede seste olan Alex filme geçer: izin zaten var, ses film sayfasında kendiliğinden devam eder.
await toFilm(alex, 'Alex');
const alexKept = await until(() => alex.evalFrame('shell=1', `!document.getElementById('voice-on').hidden`), 15000);
check(!!alexKept, 'sitede seste olan Alex filme geçince ses film sayfasında kendiliğinden açıldı');

casey.close();
alex.close();
sam.close();
console.log(failed ? `\n✗ ${failed} kontrol başarısız` : '\n✓ Film sayfasında sesli sohbet testi geçti');
process.exit(failed ? 1 : 0);
