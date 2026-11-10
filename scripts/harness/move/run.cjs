// 📲 Move to another device (card "Move my things to another device"): a laptop in a room sends, a phone opens the QR
// link (`/#move=<code>`) and receives. Checks: Settings → Me → the dialog; Send shows a 6-digit code and a QR; the
// phone's link starts "Receive" by itself; nothing moves until the laptop presses Send; the phone gets the game save,
// the saved rooms (joined with its own) and the name; a refusal and a wrong code are explained.
//
//   npm run dev, then: node scripts/harness/move/run.cjs [site]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
const room = 'mv' + Math.random().toString(36).slice(2, 8);
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
const snack = JSON.stringify({ v: 1, coins: 4321, earned: 4321, lifetime: 4321, watched: 60, levels: { popcorn: 4 }, stars: 0, cinemas: 0, seen: 0 });

async function laptop(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror laptop', e.message));
  await page.goto(`${SITE}/`);
  await page.waitForTimeout(1000);
  await page.evaluate((s) => {
    localStorage.setItem('name', 'Alex');
    localStorage.setItem('avatar', 'wizard');
    localStorage.setItem('lang', 'en');
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('tipsSeen', '1');
    localStorage.setItem('snackBar', s);
    localStorage.setItem('savedRooms', JSON.stringify([{ id: 'movieNight1', name: 'Movie night', at: 100 }]));
  }, snack);
  await page.goto(`${SITE}/r/${room}#back`);
  await until(() => page.evaluate(() => !!document.getElementById('settings-move')));
  await page.waitForTimeout(800);
  return page;
}
async function phone(browser, hash) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror phone', e.message));
  await page.goto(`${SITE}/`);
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    localStorage.setItem('lang', 'en');
    localStorage.setItem('savedRooms', JSON.stringify([{ id: 'phoneRoom1', name: 'Phone room', at: 50 }]));
  });
  await page.goto(`${SITE}/${hash}`);
  return page;
}
const startSend = async (page) => {
  // Card SIMP1: Settings → Me → Move to another device.
  await page.evaluate(() => document.getElementById('settings-move').click());
  await until(() => page.evaluate(() => !!document.querySelector('.move-dialog [data-move="send"]')), 5000);
  await page.evaluate(() => document.querySelector('.move-dialog [data-move="send"]').click());
  return until(() => page.evaluate(() => document.querySelector('[data-move-code]')?.dataset.moveCode), 5000);
};
const statusOf = (page) => page.evaluate(() => document.querySelector('.move-dialog .move-status')?.textContent ?? '');

(async () => {
  const browser = await chromium.launch();
  const alex = await laptop(browser);
  const code = await startSend(alex);
  check(/^\d{6}$/.test(code ?? ''), 'profile menu → Move → Send shows a 6-digit code', String(code));
  check(await alex.evaluate(() => !!document.querySelector('.move-qr svg')), 'and a QR code');

  const pam = await phone(browser, `#move=${code}`);
  const asked = await until(() => alex.evaluate(() => !!document.querySelector('.move-dialog [data-move="yes"]')), 8000);
  check(!!asked, 'the phone’s QR link starts "Receive" by itself and the laptop is asked');
  check(await pam.evaluate(() => location.hash === ''), 'the code leaves the phone’s address bar');
  check(/Press “Send”/.test(await statusOf(pam)), 'the phone waits for the laptop to say yes', await statusOf(pam));
  check(await pam.evaluate(() => localStorage.getItem('snackBar') === null), 'nothing moved before Send');

  await alex.evaluate(() => document.querySelector('.move-dialog [data-move="yes"]').click());
  const moved = await until(() => pam.evaluate(() => /Moved:/.test(document.querySelector('.move-dialog .move-status')?.textContent ?? '')), 8000);
  check(!!moved, 'the phone says what moved', await statusOf(pam));
  const there = await pam.evaluate(() => ({ snack: localStorage.getItem('snackBar'), rooms: JSON.parse(localStorage.getItem('savedRooms') || '[]').map((r) => r.id), name: localStorage.getItem('name') }));
  check(there.snack === snack, 'the Snack Bar save arrived as it was');
  check(there.rooms.join() === 'movieNight1,phoneRoom1', 'saved rooms are joined with the phone’s own', there.rooms.join());
  check(there.name === 'Alex', 'the name fills the phone’s empty one', String(there.name));
  check(/Done/.test(await statusOf(alex)), 'the laptop says done', await statusOf(alex));
  await pam.screenshot({ path: __dirname + '/move-phone.png' });
  await alex.screenshot({ path: __dirname + '/move-laptop.png' });

  // A refusal.
  await alex.evaluate(() => document.querySelector('.move-dialog [data-move="close"]').click());
  const code2 = await startSend(alex);
  const sam = await phone(browser, '');
  await sam.evaluate(() => (location.hash = ''));
  await sam.evaluate(() => import('/src/ui/move-device.ts').then((m) => m.openMoveDialog()));
  await sam.evaluate(() => document.querySelector('.move-dialog [data-move="get"]').click());
  await sam.fill('.move-input', code2);
  await sam.evaluate(() => document.querySelector('.move-dialog [data-move="go"]').click());
  await until(() => alex.evaluate(() => !!document.querySelector('.move-dialog [data-move="no"]')), 8000);
  await alex.evaluate(() => document.querySelector('.move-dialog [data-move="no"]').click());
  const refused = await until(() => sam.evaluate(() => /said no/.test(document.querySelector('.move-dialog .move-status')?.textContent ?? '')), 6000);
  check(!!refused, 'a "No" on the laptop reaches the phone');

  // A wrong code.
  await sam.fill('.move-input', '000001');
  await sam.evaluate(() => document.querySelector('.move-dialog [data-move="go"]').click());
  const none = await until(() => sam.evaluate(() => /No device shows this code/.test(document.querySelector('.move-dialog .move-status')?.textContent ?? '')), 6000);
  check(!!none, 'a wrong code: "No device shows this code"', await statusOf(sam) + ' disabled=' + (await sam.evaluate(() => document.querySelector('.move-dialog [data-move="go"]')?.disabled)));

  await browser.close();
  console.log(failed ? `\n✗ ${failed} checks failed` : '\n✓ Move harness passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
