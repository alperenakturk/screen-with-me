// Phones (0.9.91.2): the room as an app on an upright phone, menus as bottom sheets, fullscreen without the browser's
// (iPhone) and by turning the phone sideways, Shorts fitting the screen with touch swipes. Needs Playwright
// (preinstalled in cloud sessions), `npm run dev` and a long local video (for example the embed harness's
// `FILM_VIDEO=… node scripts/harness/embed/film-server.mjs`, which serves it on :5300):
//   NODE_PATH=$(npm root -g) node scripts/harness/phone/run.cjs [http://localhost:5173] [http://localhost:5300/video.webm]
const { chromium, devices } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:5173';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};
const rect = (page, selector) =>
  page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.left, y: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };
  }, selector);

async function enter(page, room) {
  await page.goto(`${SITE}/r/${room}`);
  await page.waitForTimeout(1200);
  await page.fill('input', 'Alp');
  await page.click('button.primary');
  for (let i = 0; i < 5 && !(await page.$('#media-input:visible')); i++) {
    const next = await page.$('button.primary:visible');
    if (next) await next.click();
    await page.waitForTimeout(900);
  }
}

(async () => {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const id = () => `ph${Math.random().toString(36).slice(2, 7)}`;

  // 1) iPhone held upright: an app-like room, nothing wider than the screen, the chat box on screen.
  {
    const ctx = await browser.newContext({ ...devices['iPhone 13'], permissions: ['camera', 'microphone'] });
    // iPhone Safari has no fullscreen for page elements.
    await ctx.addInitScript(() => (Element.prototype.requestFullscreen = undefined));
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await enter(page, id());
    await page.fill('#media-input', VIDEO);
    await page.click('#media-form button[value=load]');
    await page.waitForSelector('#player video');
    await page.waitForTimeout(1500);
    const vw = await page.evaluate(() => innerWidth);
    const vh = await page.evaluate(() => innerHeight);
    check(vw === 390 && (await page.evaluate(() => document.documentElement.scrollWidth)) <= vw, 'telefon: sayfa ekrandan geniş değil', `genişlik ${vw}`);
    const form = await rect(page, '#chat-form');
    check(!!form && form.b <= vh + 1 && form.y > vh / 2, 'telefon: mesaj kutusu ekranın altında görünüyor (sayfa kaydırmadan)', JSON.stringify({ form, vh }));
    check(!(await page.isVisible('#media-form')) && (await page.isVisible('#add-toggle')), 'telefon: video oynarken link kutusu ＋ düğmesinde');
    await page.click('#add-toggle');
    check(await page.isVisible('#media-input'), 'telefon: ＋ link kutusunu açıyor');
    await page.click('#add-toggle');
    check(!(await page.isVisible('.voice-ptt')), 'telefon: bas-konuş (V tuşu) gizli');
    // Menus open as bottom sheets inside the screen.
    for (const [button, sheet, label] of [
      ['#game-btn', '#game-menu', 'oyun menüsü'],
      ['#speed-btn', '#speed-pop', 'hız'],
      ['#profile-btn, .profile-btn', '.profile-pop', 'profil menüsü'],
      ['#live-share', '#live-menu', 'paylaş menüsü'],
    ]) {
      await page.click(button);
      await page.waitForTimeout(350);
      const r = await rect(page, sheet);
      check(!!r && r.x >= -1 && Math.abs(r.r - vw) <= 1 && Math.abs(r.b - vh) <= 1 && r.h > 40, `telefon: ${label} alttan açılan panel`, JSON.stringify(r));
      await page.mouse.click(vw / 2, 30);
      await page.waitForTimeout(250);
    }
    // Fullscreen without the browser's: the theater covers the window, the dock is there, its exit works.
    await page.click('#fullscreen');
    await page.waitForTimeout(600);
    const theater = await rect(page, '#theater');
    check(await page.evaluate(() => document.getElementById('theater').classList.contains('pseudo-fs')) && !!theater && theater.w === vw && Math.abs(theater.h - vh) <= 1, 'iPhone: tam ekran (tarayıcının tam ekranı olmadan) pencereyi kaplıyor', JSON.stringify(theater));
    check((await rect(page, '#fs-dock'))?.w > 30, 'iPhone: tam ekranda dock görünüyor');
    await page.click('#dock-exit');
    await page.waitForTimeout(400);
    check(!(await page.evaluate(() => document.getElementById('theater').classList.contains('fake-fs'))), 'iPhone: dock\'taki çıkış tam ekrandan çıkarıyor');
    // Turning the phone sideways opens it, upright closes it.
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(600);
    check(await page.evaluate(() => document.getElementById('theater').classList.contains('pseudo-fs')), 'telefon yan çevrilince tam ekran açılıyor');
    const dock = await rect(page, '#fs-dock');
    check(!!dock && dock.y >= 0 && dock.b <= 390, 'yan tutulan telefonda dock ekrana sığıyor', JSON.stringify(dock));
    await page.setViewportSize({ width: 390, height: 664 });
    await page.waitForTimeout(600);
    check(!(await page.evaluate(() => document.getElementById('theater').classList.contains('pseudo-fs'))), 'telefon dik tutulunca oda geri geliyor');
    check(errors.length === 0, 'telefon: sayfa hatası yok', errors.join(' | '));
    await ctx.close();
  }

  // 2) Shorts on an Android phone: opens by itself, fits the screen, a swipe up goes to the next one.
  {
    const ctx = await browser.newContext({ ...devices['Pixel 7'] });
    const page = await ctx.newPage();
    await enter(page, id());
    await page.fill('#media-input', 'https://www.youtube.com/shorts/aqz-KE-bpKQ https://www.youtube.com/shorts/dQw4w9WgXcQ https://www.youtube.com/shorts/9bZkp7q5F8I');
    await page.click('#media-form button[value=load]');
    await page.waitForTimeout(4000);
    check(await page.evaluate(() => document.querySelector('.room').classList.contains('shorts')), 'Shorts: Short açılınca Shorts görünümü kendiliğinden');
    const fit = await page.evaluate(() => ({ doc: document.documentElement.scrollHeight, vh: innerHeight, bar: document.getElementById('shorts-bar').getBoundingClientRect().bottom }));
    check(fit.doc <= fit.vh + 1 && fit.bar <= fit.vh + 1, 'Shorts: ekrana sığıyor (sayfa kaymıyor)', JSON.stringify(fit));
    const before = await page.textContent('#now-title');
    const box = await rect(page, '.player-wrap');
    const cdp = await ctx.newCDPSession(page);
    const x = box.x + box.w / 2;
    const y = box.y + box.h / 2;
    const touch = (type, at) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y: at }] });
    await touch('touchStart', y + 120);
    for (let i = 1; i <= 6; i++) {
      await touch('touchMove', y + 120 - i * 30);
      await page.waitForTimeout(16);
    }
    await touch('touchEnd');
    await page.waitForTimeout(2500);
    check((await page.textContent('#now-title')) !== before, 'Shorts: yukarı kaydırınca sıradaki açılıyor');
    await ctx.close();
  }

  await browser.close();
  console.log(fails ? `\n✗ ${fails} kontrol başarısız` : '\n✓ Telefon testi geçti');
  process.exit(fails ? 1 : 0);
})();
