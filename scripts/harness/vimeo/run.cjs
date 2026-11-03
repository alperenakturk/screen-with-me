// Vimeo in the room (card P1): two people, a Vimeo link, Vimeo's embed player replaced by a fake page that speaks the
// same postMessage protocol as player.js (the cloud can't reach player.vimeo.com; the owner checks the real player).
// Checks: the link opens a Vimeo frame (not the Shorts view) for both, in "do not track" mode with the unlisted hash,
// play / pause / seek reach the other person's player, the speed stays 1×, nothing of ours is over the player.
//
//   npm run dev, then: node scripts/harness/vimeo/run.cjs [site]
const { chromium } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
const room = 'vm' + Math.random().toString(36).slice(2, 8);
const ID = '123456789';
const HASH = 'abcdef1234';
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

// The fake player: says "ready", sends only the events the host asked for (JSON strings, like the real one),
// answers getDuration, and logs every command.
const FAKE = `<!doctype html><html><body style="margin:0;background:#123;color:#fff;font:14px sans-serif">fake Vimeo
<script>
  window.cmds = [];
  window.wanted = [];
  let t = 0, playing = false, last = performance.now();
  const D = 300;
  const out = (o) => parent.postMessage(JSON.stringify(o), '*');
  const ev = (name, data) => { if (wanted.includes(name)) out({ event: name, data }); };
  const info = () => ({ seconds: t, duration: D, percent: t / D });
  addEventListener('message', (e) => {
    const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data || {};
    if (!d.method) return;
    if (d.method === 'addEventListener') { wanted.push(d.value); return; }
    window.cmds.push(d.method);
    if (d.method === 'ping') out({ event: 'ready' });
    if (d.method === 'getDuration') out({ method: 'getDuration', value: D });
    if (d.method === 'play') { playing = true; last = performance.now(); ev('play', info()); }
    if (d.method === 'pause') { playing = false; ev('pause', info()); }
    if (d.method === 'setCurrentTime') { t = Number(d.value) || 0; last = performance.now(); window.seekedTo = t; ev('seeked', info()); }
    if (d.method === 'setPlaybackRate') out({ event: 'error', data: { name: 'Error', message: 'not allowed', method: 'setPlaybackRate' } });
  });
  setInterval(() => {
    const now = performance.now();
    if (playing) t += (now - last) / 1000;
    last = now;
    if (playing) ev('timeupdate', info());
  }, 250);
  window.userPause = () => { playing = false; ev('pause', info()); };
  window.userPlay = () => { playing = true; last = performance.now(); ev('play', info()); };
  window.userSeek = (s) => { t = s; last = performance.now(); ev('seeked', info()); ev('timeupdate', info()); };
  window.time = () => t;
  setTimeout(() => out({ event: 'ready' }), 100);
</script></body></html>`;

async function person(browser, name, avatar) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.route('https://player.vimeo.com/video/**', (r) => r.fulfill({ contentType: 'text/html', body: FAKE }));
  await page.goto(`${SITE}/`);
  await page.waitForTimeout(1200);
  await page.evaluate(([n, a]) => {
    localStorage.setItem('name', n);
    localStorage.setItem('avatar', a);
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('tipsSeen', '1');
  }, [name, avatar]);
  await page.goto(`${SITE}/r/${room}#back`);
  await page.waitForTimeout(2000);
  return page;
}
const frameOf = (page) => page.frames().find((f) => f.url().includes('player.vimeo.com/video/'));

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const alex = await person(browser, 'Alex', 'wizard');
  const sam = await person(browser, 'Sam', 'elf');

  await alex.evaluate(([id, hash]) => {
    const i = document.getElementById('media-input');
    i.value = `https://vimeo.com/${id}/${hash}`;
    i.form.querySelector('button[value=load]').click();
  }, [ID, HASH]);
  const both = await until(async () => frameOf(alex) && frameOf(sam));
  check(!!both, 'a Vimeo link opens the Vimeo player for both people');
  const shorts = await alex.evaluate(() => !!document.querySelector('.room.shorts'));
  check(!shorts, 'a Vimeo video stays in the room view (not the Shorts view)');
  const src = await alex.evaluate(() => document.querySelector('#player iframe')?.src ?? '');
  check(src.includes(`/video/${ID}?`) && src.includes(`h=${HASH}`) && src.includes('dnt=1'), 'embed with the unlisted hash, in "do not track" mode', src);

  const listening = await until(() => frameOf(alex).evaluate(() => ['play', 'pause', 'timeupdate', 'seeked', 'ended'].every((e) => window.wanted.includes(e))));
  check(!!listening, 'the page asks the player for play / pause / timeupdate / seeked / ended');

  const playing = await until(async () => {
    const a = await frameOf(alex)?.evaluate(() => window.cmds.includes('play') && window.time() > 0.3);
    const b = await frameOf(sam)?.evaluate(() => window.cmds.includes('play') && window.time() > 0.3);
    return a && b;
  }, 15000);
  check(!!playing, 'the room plays: both players got "play" and move');

  await frameOf(alex).evaluate(() => window.userPause());
  const paused = await until(() => frameOf(sam).evaluate(() => window.cmds.includes('pause')), 8000);
  check(!!paused, 'Alex pauses in Vimeo’s own bar → Sam’s player pauses too');

  // Right after the remote pause arrived (no wait): a quick play must not be swallowed.
  await frameOf(sam).evaluate(() => window.userPlay());
  const resumed = await until(() => frameOf(alex).evaluate(() => window.cmds.filter((c) => c === 'play').length >= 2 && window.time() > 1), 8000);
  check(!!resumed, 'Sam plays → Alex’s player plays too');

  await frameOf(sam).evaluate(() => window.userSeek(120));
  const seeked = await until(() => frameOf(alex).evaluate(() => (window.seekedTo ?? 0) > 115 && window.time() > 115), 8000);
  check(!!seeked, 'Sam jumps to 2:00 → Alex’s player is sent there', JSON.stringify(await Promise.all([alex, sam].map((p) => frameOf(p).evaluate(() => ({ to: window.seekedTo, t: window.time(), c: window.cmds.join(',') }))))));

  const rate = await alex.evaluate(() => document.querySelector('#speed-btn, #dock-speed')?.textContent ?? '');
  check(!/[2-4]×/.test(rate), 'speed stays 1× on Vimeo', rate);
  const asked = await frameOf(alex).evaluate(() => window.cmds.includes('setPlaybackRate'));
  check(!asked, 'the page never asks Vimeo to change the speed');

  const over = await alex.evaluate(() => {
    const vis = (s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
    return { catcher: vis('#fs-catcher'), controls: vis('#fs-controls') };
  });
  check(!over.catcher && !over.controls, 'nothing of ours over the player', JSON.stringify(over));

  const title = await alex.evaluate(() => document.getElementById('now-title')?.textContent ?? '');
  check(/Vimeo|\S/.test(title) && !title.includes('undefined'), 'the queue shows a title', title);

  await alex.screenshot({ path: __dirname + '/vimeo-alex.png' });
  await browser.close();
  console.log(failed ? `\n✗ ${failed} checks failed` : '\n✓ Vimeo harness passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
