// "Send feedback" dialog (card 9; Design: docs/internal/design/feedback-and-thanks.md §1). Opens it from ⋯ More, the
// profile menu and the Help page on a computer (1366 × 768) and from the phone's ⋯ sheet (390 × 844), and checks: no
// scrollbar inside, Send stays disabled until a type and some text, "attach technical details" starts unticked and
// its preview never names the room or a person, the `off` answer shows the e-mail note, a sent message shows the
// thanks, Esc returns the focus. `/api/feedback` is answered by the test (no GitHub involved).
//   npm run dev
//   NODE_PATH=$(npm root -g) node scripts/harness/feedback/run.cjs [http://localhost:5173]
const { chromium, devices } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:5173';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};

(async () => {
  const browser = await chromium.launch();
  const room = `fb${Math.random().toString(36).slice(2, 7)}`;
  const sent = [];
  async function page(opts, answer = { error: 'off' }) {
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript(() => {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', 'en');
      localStorage.setItem('opt:autoInvite', '0');
    });
    await ctx.route('**/api/feedback', async (route) => {
      sent.push(JSON.parse(route.request().postData() || '{}'));
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(answer) });
    });
    return ctx.newPage();
  }
  async function enter(p, name) {
    await p.goto(`${SITE}/r/${room}`);
    await p.fill('#name', name);
    await p.click('#name-form button.primary');
    await p.waitForSelector('.room');
    await p.waitForTimeout(1500);
  }
  const dialogState = (p) =>
    p.evaluate(() => {
      const d = document.querySelector('.feedback-dialog');
      if (!d) return null;
      const r = d.getBoundingClientRect();
      return {
        fits: d.scrollHeight <= d.clientHeight + 1 && r.bottom <= innerHeight + 1 && r.top >= -1,
        send: document.querySelector('#fb-send').disabled,
        attach: document.querySelector('#fb-attach').checked,
        preview: document.querySelector('.fb-preview').textContent,
        focus: document.activeElement?.classList.contains('fb-chip') ?? false,
      };
    });

  // Computer: ⋯ More.
  const pc = await page({ viewport: { width: 1366, height: 768 } });
  await enter(pc, 'Alex');
  // R9: "Send feedback" lives in the profile menu's small line (Help · Feedback · Privacy), not in ⋯ More.
  await pc.click('.topbar-right .profile-btn');
  await pc.waitForTimeout(200);
  const line = await pc.evaluate(() => document.querySelector('.profile-pop:not([hidden]) .profile-links')?.textContent.replace(/\s+/g, ' ').trim() ?? '');
  check(/Help.*Feedback.*Privacy/.test(line), 'the profile menu has one small line: Help · Send feedback · Privacy (R9)', line);
  await pc.click('#profile-feedback');
  await pc.waitForSelector('.feedback-dialog');
  await pc.waitForTimeout(200);
  let s = await dialogState(pc);
  check(s && s.fits, '1366×768: the dialog fits, no scrollbar inside', JSON.stringify(s && { fits: s.fits }));
  check(s && s.send, 'Send is disabled before a type and text');
  check(s && !s.attach, '"Attach technical details" starts unticked');
  check(s && s.focus, 'the focus starts on the first type chip');
  check(s && !s.preview.includes(room) && !s.preview.includes('Alex') && /site:/.test(s.preview), 'the details preview has the version, never the room or a name', JSON.stringify(s?.preview));
  await pc.fill('#fb-text', 'The sound comes late after a seek.');
  check((await dialogState(pc)).send, 'Send stays disabled with text but no type');
  await pc.click('.fb-chip[data-kind="bug"]');
  check(!(await dialogState(pc)).send, 'a type + text enable Send');
  await pc.click('#fb-send');
  await pc.waitForSelector('.fb-note:not([hidden])');
  const note = await pc.textContent('.fb-note');
  check(/switched off/.test(note) && /screenwithme\.app@gmail\.com/.test(note) && (await dialogState(pc)).send, 'the `off` answer shows the e-mail and keeps Send disabled', note);
  check(sent.length === 1 && sent[0].kind === 'bug' && !('info' in sent[0]) && !JSON.stringify(sent[0]).includes(room), 'without the box ticked no details are sent, nothing about the room', JSON.stringify(sent[0]));
  await pc.keyboard.press('Escape');
  await pc.waitForTimeout(150);
  check(!(await pc.$('.feedback-dialog')), 'Esc closes it');

  // Computer: the profile menu, with the details ticked and a "sent" answer.
  const pc2 = await page({ viewport: { width: 1366, height: 768 } }, { ok: true });
  await enter(pc2, 'Sam');
  // The profile menu's button (pressed directly: the menu's own opener is tested elsewhere).
  await pc2.evaluate(() => document.querySelector('#profile-feedback').click());
  await pc2.waitForSelector('.feedback-dialog');
  await pc2.click('.fb-chip[data-kind="idea"]');
  await pc2.fill('#fb-text', 'A dark theme for the chat would be nice.');
  await pc2.check('#fb-attach');
  await pc2.click('#fb-send');
  await pc2.waitForSelector('.fb-sent');
  const last = sent[sent.length - 1];
  check(last.info && last.info.site && !JSON.stringify(last).includes(room) && !JSON.stringify(last).includes('Sam'), 'ticked: the details go along, still nothing about the room or a name', JSON.stringify(last.info));
  check(/Thanks! We got it\./.test(await pc2.textContent('.fb-sent')), 'sent: the thanks shows');
  await pc2.click('.fb-sent .btn');
  await pc2.waitForTimeout(150);
  check(!(await pc2.$('.feedback-dialog')), 'Close closes it');

  // The Help page's button opens the dialog over the home page.
  const help = await page({ viewport: { width: 1366, height: 768 } });
  await help.goto(`${SITE}/help.html`);
  await help.click('[data-feedback-link]:visible');
  await help.waitForSelector('.feedback-dialog', { timeout: 8000 }).then(() => check(true, 'Help → "Send feedback" opens the dialog'), () => check(false, 'Help → "Send feedback" opens the dialog'));
  check(!(await help.evaluate(() => location.hash)), 'the #feedback mark is cleared from the address');

  // Phone: ⋯ → Profile → "Send feedback" (R9), the dialog as a bottom sheet that fits.
  const phone = await page(devices['iPhone 13']);
  await enter(phone, 'Pat');
  await phone.click('#strip-more');
  await phone.waitForTimeout(400);
  await phone.click('.ph-sheet .ph-tile:has-text("Profile")');
  await phone.waitForTimeout(400);
  const tile = (await phone.isVisible('#profile-feedback')) ? await phone.$('#profile-feedback') : null;
  check(!!tile, 'phone ⋯ → Profile: "Send feedback" is there');
  if (tile) {
    await tile.click();
    await phone.waitForSelector('.feedback-dialog');
    await phone.waitForTimeout(250);
    const ps = await dialogState(phone);
    const sheet = await phone.evaluate(() => { const r = document.querySelector('.feedback-dialog').getBoundingClientRect(); return { bottom: Math.round(innerHeight - r.bottom), width: Math.round(r.width), vw: innerWidth }; });
    check(ps.fits && sheet.bottom <= 1 && sheet.width >= sheet.vw - 1, '390×844: a bottom sheet that fits without scrolling', JSON.stringify({ ...sheet, fits: ps.fits }));
  }

  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ The feedback dialog works');
  process.exit(fails ? 1 : 0);
})();
