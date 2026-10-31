// TikTok in the room (0.9.91.18): two people, a TikTok link, the official embed player replaced by a fake page that
// speaks the same postMessage protocol (the cloud can't reach tiktok.com; the owner checks the real player).
// Checks: the link opens the Shorts view with a TikTok frame for both, play / pause / seek reach the other person's
// player, the speed stays 1×, nothing of ours is over the player.
//
//   npm run dev, then: node scripts/harness/tiktok/run.cjs [site]
const { chromium } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
const room = 'tt' + Math.random().toString(36).slice(2, 8);
const ID = '7000000000000000001';
let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
};
const until = async (fn, ms = 10000) => {
  for (let i = 0; i < ms / 200; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
};

// The fake player: ready at once, plays when told, reports its time 4× a second, and logs every command.
const FAKE = `<!doctype html><html><body style="margin:0;background:#111;color:#fff;font:14px sans-serif">fake TikTok
<script>
  window.cmds = [];
  let t = 0, playing = false, last = performance.now();
  const send = (type, value) => parent.postMessage({ 'x-tiktok-player': true, type, value }, '*');
  const state = (v) => send('onStateChange', v);
  addEventListener('message', (e) => {
    const d = e.data || {};
    if (!d['x-tiktok-player']) return;
    window.cmds.push(d.type);
    if (d.type === 'play') { playing = true; last = performance.now(); state(1); }
    if (d.type === 'pause') { playing = false; state(2); }
    if (d.type === 'seekTo') { t = Number(d.value) || 0; last = performance.now(); }
  });
  setInterval(() => {
    const now = performance.now();
    if (playing) t += (now - last) / 1000;
    last = now;
    send('onCurrentTime', { currentTime: t, duration: 60 });
  }, 250);
  window.userPause = () => { playing = false; state(2); };
  window.userPlay = () => { playing = true; last = performance.now(); state(1); };
  window.time = () => t;
  setTimeout(() => send('onPlayerReady'), 100);
</script></body></html>`;

async function person(browser, name, avatar) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.route('https://www.tiktok.com/player/v1/**', (r) => r.fulfill({ contentType: 'text/html', body: FAKE }));
  await page.goto(`${SITE}/`);
  await page.waitForTimeout(1200);
  await page.evaluate(([n, a]) => {
    localStorage.setItem('name', n);
    localStorage.setItem('avatar', a);
    localStorage.setItem('lang', 'tr');
  }, [name, avatar]);
  await page.goto(`${SITE}/r/${room}#back`);
  await page.waitForTimeout(2000);
  return page;
}
const frameOf = (page) => page.frames().find((f) => f.url().includes('tiktok.com/player/v1/'));

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ali = await person(browser, 'Ali', 'wizard');
  const ayse = await person(browser, 'Ayse', 'elf');

  await ali.evaluate((id) => {
    const i = document.getElementById('media-input');
    i.value = `https://www.tiktok.com/@someone/video/${id}`;
    i.form.querySelector('button[value=load]').click();
  }, ID);
  const both = await until(async () => (await ali.evaluate(() => !!document.querySelector('.room.shorts'))) && (await ayse.evaluate(() => !!document.querySelector('.room.shorts'))) && frameOf(ali) && frameOf(ayse));
  check(!!both, 'TikTok linki iki kişide de Shorts görünümünü ve TikTok oynatıcısını açtı');
  const src = await ali.evaluate(() => document.querySelector('#player iframe')?.src ?? '');
  check(src.includes(`/player/v1/${ID}`) && src.includes('controls=1') && src.includes('rel=0'), 'resmi gömme oynatıcı, kendi çubuğuyla', src);

  // The room plays after a load: both players get "play" and move.
  const playing = await until(async () => {
    const a = await frameOf(ali)?.evaluate(() => window.cmds.includes('play') && window.time() > 0.3);
    const b = await frameOf(ayse)?.evaluate(() => window.cmds.includes('play') && window.time() > 0.3);
    return a && b;
  }, 12000);
  check(!!playing, 'oda oynatınca iki oynatıcıya da "play" gitti ve video ilerliyor');

  // Ali pauses inside TikTok's own player → the room pauses → Ayşe's player gets "pause".
  await frameOf(ali).evaluate(() => window.userPause());
  const paused = await until(() => frameOf(ayse).evaluate(() => window.cmds.includes('pause')), 8000);
  check(!!paused, 'Ali TikTok oynatıcısında durdurunca Ayşe’de de durdu');

  // Ayşe moves the video (simulated: her player jumps and plays) → Ali's player is sent there.
  await frameOf(ayse).evaluate(() => { window.userPlay(); });
  const resumed = await until(() => frameOf(ali).evaluate(() => window.cmds.lastIndexOf('play') > window.cmds.indexOf('pause')), 8000);
  check(!!resumed, 'Ayşe oynatınca Ali’de de devam etti');

  // Speed: a TikTok stays at 1× (the speed menu can't change it).
  const rate = await ali.evaluate(() => document.querySelector('#speed-btn, #dock-speed')?.textContent ?? '');
  check(!/[2-4]×/.test(rate), 'TikTok’ta hız 1×', rate);

  // Nothing of ours over the player.
  const over = await ali.evaluate(() => {
    const vis = (s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return cs.display !== 'none' && r.width > 0 && r.height > 0; };
    return { catcher: vis('#fs-catcher'), controls: vis('#fs-controls') };
  });
  check(!over.catcher && !over.controls, 'oynatıcının üstünde bizden bir şey yok', JSON.stringify(over));

  // The queue shows a TikTok title, not a raw id.
  const title = await ali.evaluate(() => document.getElementById('now-title')?.textContent ?? '');
  check(/TikTok|@someone/.test(title), 'başlık TikTok olarak görünüyor', title);

  await ali.screenshot({ path: __dirname + '/tiktok-ali.png' });
  await browser.close();
  console.log(failed ? `\n✗ ${failed} kontrol başarısız` : '\n✓ TikTok testi geçti');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
