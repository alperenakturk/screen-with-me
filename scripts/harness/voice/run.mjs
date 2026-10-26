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

async function person(name, avatar) {
  const b = await launch({ ext: EXT, out: join(here, `voice-${name}`), args: FAKE_MIC });
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

const ali = await person('Ali', 'wizard');
const ayse = await person('Ayse', 'elf');
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
await ali.evaluate(`document.getElementById('voice-join').click(); 1`);
await until(() => ali.evaluate(`!document.getElementById('voice-on').hidden`), 10000);
await ayse.evaluate(`document.getElementById('voice-join').click(); 1`);
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

// Sessize alma: Ayşe 🔇 → Ali'de sesi biter (akış kalır, enerji düşer), Ayşe'nin avatarında 🔇.
await ayse.evaluate(`document.getElementById('voice-mic').click(); 1`);
await ali.sleep(2000);
const muted = await ali.evaluate(LEVEL);
const badge = await ali.evaluate(`!!document.querySelector('#voice-people .voice-muted')`);
check(muted.rms < 0.005 && badge, 'Ayşe sessize alınca Ali onu duymuyor ve 🔇 görünüyor', JSON.stringify({ muted, badge }));

// Ayrılma: Ayşe ayrılınca Ali'de akışı kalkar.
await ayse.evaluate(`document.getElementById('voice-leave').click(); 1`);
const gone = await until(async () => (await ali.evaluate(`document.querySelectorAll('audio').length`)) === 0, 10000);
check(!!gone, 'Ayşe sesten ayrılınca Ali tarafında akışı kapandı');

ali.close();
ayse.close();
console.log(failed ? `\n✗ ${failed} kontrol başarısız` : '\n✓ Sesli sohbet testi geçti');
process.exit(failed ? 1 : 0);
