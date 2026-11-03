// 🎧 Podcasts in the room (card P2): two people; Alex types words in the link box, presses "🎧 Podcasts" on the
// results, opens a show and plays an episode. The Worker's answers and the audio file are stand-ins (the cloud can't
// reach Apple or podcast hosts; the owner checks the real thing). Checks: shows and episodes list, an episode plays
// for both with the show's cover art, its title is "show · episode", Back returns to the shows, errors are explained.
//
//   npm run dev, then: node scripts/harness/podcasts/run.cjs [site]
const { chromium } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
const room = 'pd' + Math.random().toString(36).slice(2, 8);
const ART = 'https://is1-ssl.mzstatic.com/image/thumb/test/600x600bb.png';
const AUDIO = 'https://podcast.example/night-radio-2.wav';
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

// 60 s of a quiet 440 Hz tone as a WAV file.
function wav(seconds = 60, rate = 8000) {
  const n = seconds * rate;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(rate, 24); buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 2000), 44 + i * 2);
  return buf;
}
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64');
const SHOWS = { items: [{ id: '123', title: 'Night Radio', author: 'Some Host', art: ART }, { id: '124', title: 'Quiet Hour', author: '', art: null }] };
const EPISODES = { show: { title: 'Night Radio', art: ART }, items: [{ title: 'Stars and moons', url: AUDIO, duration: 60, date: Date.UTC(2026, 10, 3) }, { title: 'Hello', url: AUDIO + '?1', duration: 300, date: Date.UTC(2026, 10, 2) }] };

async function person(browser, name, avatar) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', name, e.message));
  await page.route('**/api/podcasts/search*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify((r.request().postData() ?? '').includes('nothing') ? { items: [] } : SHOWS) }));
  await page.route('**/api/podcasts/episodes*', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(r.request().url().includes('id=124') ? { error: 'failed' } : EPISODES) }));
  await page.route('https://podcast.example/**', (r) => r.fulfill({ contentType: 'audio/wav', body: wav() }));
  await page.route('https://is1-ssl.mzstatic.com/**', (r) => r.fulfill({ contentType: 'image/png', body: PNG }));
  await page.goto(`${SITE}/`);
  await page.waitForTimeout(1000);
  await page.evaluate(([n, a]) => {
    localStorage.setItem('name', n);
    localStorage.setItem('avatar', a);
    localStorage.setItem('lang', 'en');
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('tipsSeen', '1');
  }, [name, avatar]);
  await page.goto(`${SITE}/r/${room}#back`);
  await until(() => page.evaluate(() => !!document.getElementById('media-input')));
  await page.waitForTimeout(1500);
  return page;
}
const search = (page, words) => page.evaluate(async (w) => {
  const i = document.getElementById('media-input');
  i.value = w;
  i.form.requestSubmit(i.form.querySelector('.media-search') ?? undefined);
  for (let n = 0; n < 40 && !document.querySelector('#search-results .search-podcasts'); n++) await new Promise((r) => setTimeout(r, 100));
  document.querySelector('#search-results .search-podcasts')?.click();
  for (let n = 0; n < 40 && !document.querySelector('#search-results .podcast-shows, #search-results .search-note:not(.muted)'); n++) await new Promise((r) => setTimeout(r, 100));
  return document.getElementById('search-results').textContent;
}, words);

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const alex = await person(browser, 'Alex', 'wizard');
  const sam = await person(browser, 'Sam', 'elf');

  const text = await search(alex, 'night radio');
  check(/Podcasts for “night radio”/.test(text) && /Night Radio/.test(text) && /Some Host/.test(text), '"🎧 Podcasts" on the results lists the shows', text.slice(0, 200));
  const artOk = await alex.evaluate(() => document.querySelector('#search-results .podcast-shows img')?.getAttribute('src'));
  check(artOk?.includes('mzstatic.com'), 'shows have their cover art', String(artOk));

  await alex.evaluate(() => document.querySelector('#search-results [data-show="123"]').click());
  const eps = await until(() => alex.evaluate(() => document.querySelectorAll('#search-results .podcast-episodes .search-row').length), 5000);
  check(eps === 2, 'a show opens its newest episodes', String(eps));
  const meta = await alex.evaluate(() => document.querySelector('#search-results .podcast-episodes .search-meta')?.textContent ?? '');
  check(/2026/.test(meta) && /1:00/.test(meta), 'episodes show their date and length', meta);
  await alex.evaluate(() => document.querySelector('#search-results .podcast-back').click());
  const backed = await until(() => alex.evaluate(() => !!document.querySelector('#search-results .podcast-shows')), 4000);
  check(!!backed, '‹ Shows goes back to the list');
  await alex.evaluate(() => document.querySelector('#search-results [data-show="123"]').click());
  await until(() => alex.evaluate(() => !!document.querySelector('#search-results .podcast-episodes')), 4000);
  await alex.evaluate(() => document.querySelector('#search-results .podcast-episodes .search-now').click());

  const both = await until(async () => {
    const a = await alex.evaluate(() => { const v = document.querySelector('#player video'); return v && v.currentTime > 0.5 ? v.poster : null; });
    const b = await sam.evaluate(() => { const v = document.querySelector('#player video'); return v && v.currentTime > 0.5 ? v.poster : null; });
    return a && b ? [a, b] : null;
  }, 15000);
  check(!!both, 'the episode plays for both people');
  check(!!both && both.every((p) => p.includes('mzstatic.com')), 'with the show’s cover art instead of a black box', JSON.stringify(both));
  const title = await sam.evaluate(() => document.getElementById('now-title')?.textContent ?? '');
  check(/Night Radio · Stars and moons/.test(title), 'its title is "show · episode" for everyone', title);
  const gap = await until(async () => {
    const a = await alex.evaluate(() => document.querySelector('#player video').currentTime);
    const b = await sam.evaluate(() => document.querySelector('#player video').currentTime);
    return Math.abs(a - b) < 1 ? Math.abs(a - b) : null;
  }, 8000);
  check(gap !== null, 'both are at the same spot (< 1 s apart)', String(gap));
  await alex.screenshot({ path: __dirname + '/podcast-room.png' });

  // A show whose feed can't be read, and words with no show.
  await search(alex, 'quiet');
  await alex.evaluate(() => document.querySelector('#search-results [data-show="124"]').click());
  const err = await until(() => alex.evaluate(() => /can’t be reached/.test(document.getElementById('search-results').textContent)), 4000);
  check(!!err, 'a feed that fails is explained');
  const none = await search(alex, 'nothing at all');
  check(/No podcasts found/.test(none), 'words with no show say so', none.slice(0, 120));

  await browser.close();
  console.log(failed ? `\n✗ ${failed} checks failed` : '\n✓ Podcasts harness passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
