// Card EMO1 (owner, 21 Nov 2026): "Hand signs" (two pages of eight) in the emoji picker with a skin tone.
// Sam on a phone opens 😀 React, picks Hand signs, a medium tone and 🫶: Alex (computer) sees 🫶🏽 rise. The tray fits the
// phone with no scrollbar, the tone is remembered after a reload, Test Lab `react.hands` reports it, and on the
// computer the rail's 😀 window reaches the same page with ▼. Turkish names on the second phone.
//
//   npm run build, a local server (wrangler dev), then: node scripts/harness/hands/run.cjs [site]   (SHOTS=dir)
const { chromium, devices } = require('playwright');
const path = require('path');

const SITE = process.argv[2] || 'http://localhost:8787';
const SHOTS = process.env.SHOTS;
let fails = 0;
const check = (ok, label, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${extra}` : ''}`);
  if (!ok && process.env.GITHUB_ACTIONS) console.log(`::error title=${path.basename(__dirname)}::${label}`);
};

(async () => {
  const browser = await chromium.launch();
  const room = `hd${Math.random().toString(36).slice(2, 8)}`;
  async function person(name, options, l = 'en') {
    const ctx = await browser.newContext(options);
    await ctx.addInitScript(([n, lang]) => {
      for (const [k, v] of Object.entries({ lang, name: n, avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1' })) localStorage.setItem(k, v);
    }, [name, l]);
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/${room}?debug=1#back`);
    await page.waitForFunction(() => !!window.__swmLab && !!document.querySelector('.reaction-bar'), null, { timeout: 20000 });
    await page.waitForTimeout(1000);
    return page;
  }
  const lab = async (page) => JSON.parse((await page.evaluate(async () => (await window.__swmLab.run('react.hands')).text)).replace(/^[^{]*/, ''));
  const alex = await person('Alex', { viewport: { width: 1366, height: 768 } });
  const sam = await person('Sam', devices['iPhone 13']);
  const kai = await person('Kai', devices['iPhone 13'], 'tr');
  await alex.evaluate(() => {
    window.__floats = [];
    new MutationObserver((rs) => {
      for (const r of rs) for (const n of r.addedNodes) if (n.classList?.contains('r-float')) window.__floats.push(n.textContent);
    }).observe(document.body, { childList: true, subtree: true });
  });

  // Sam: 😀 React → Hands → medium tone → 🫶.
  const tray = '.toolbar .react-tray';
  await sam.evaluate(() => document.querySelector('.toolbar .react-open')?.click());
  await sam.waitForTimeout(300);
  const chips = await sam.evaluate((s) => [...document.querySelectorAll(`${s} .tray-chip`)].map((c) => c.textContent), tray);
  check(chips.includes('Hand signs'), 'phone: the picker has a Hand signs tab', JSON.stringify(chips));
  await sam.evaluate((s) => [...document.querySelectorAll(`${s} .tray-chip`)].find((c) => c.textContent === 'Hand signs').click(), tray);
  await sam.waitForTimeout(200);
  const shown = await sam.evaluate((s) => [...document.querySelectorAll(`${s} .tray-grid .reaction-btn`)].map((b) => b.textContent), tray);
  check(shown.join('') === '👍👏🙌👋🤞🫶✌️👌', 'Hand signs: the first eight', shown.join(' '));
  const tones = await sam.evaluate((s) => [...document.querySelectorAll(`${s} .tray-tone`)].map((b) => b.getAttribute('aria-label')), tray);
  check(tones.length === 6 && tones[3] === 'Medium skin tone', 'Hands: six skin tones, named', JSON.stringify(tones));
  await sam.evaluate((s) => document.querySelectorAll(`${s} .tray-tone`)[3].click(), tray);
  await sam.waitForTimeout(200);
  const fit = await sam.evaluate((s) => {
    const t = document.querySelector(s);
    const r = t.getBoundingClientRect();
    const tone = document.querySelector(`${s} .tray-tone`).getBoundingClientRect();
    return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), vw: innerWidth, scroll: t.scrollHeight > t.clientHeight + 1 || t.scrollWidth > t.clientWidth + 1, tone: [Math.round(tone.width), Math.round(tone.height)] };
  }, tray);
  check(fit.l >= 0 && fit.r <= fit.vw && fit.t >= 0 && !fit.scroll, 'phone: the tray fits, no scrollbar', JSON.stringify(fit));
  check(fit.tone[0] >= 24 && fit.tone[1] >= 24, 'phone: tone buttons ≥ 24 px', JSON.stringify(fit.tone));
  if (SHOTS) await sam.screenshot({ path: `${SHOTS}/hands-phone-en.png` });
  const heart = await sam.evaluate((s) => [...document.querySelectorAll(`${s} .tray-grid .reaction-btn`)].map((b) => b.textContent)[5], tray);
  check(heart === '🫶\u{1F3FD}', 'the hands carry the tone', heart);
  await sam.evaluate((s) => [...document.querySelectorAll(`${s} .tray-grid .reaction-btn`)][5].click(), tray);
  await alex.waitForFunction(() => window.__floats.length > 0, null, { timeout: 5000 }).catch(() => {});
  const got = await alex.evaluate(() => window.__floats);
  check(got.some((x) => x.includes('🫶\u{1F3FD}')), 'Alex sees 🫶🏽 rise (the server took the toned hand)', JSON.stringify(got));
  const samLab = await lab(sam);
  check(samLab.tone === 3 && samLab.handsPage && samLab.hands[0] === '👍\u{1F3FD}', 'Test Lab react.hands reports tone and page', JSON.stringify(samLab));

  // The tone stays after a reload.
  await sam.reload();
  await sam.waitForFunction(() => !!window.__swmLab && !!document.querySelector('.reaction-bar'), null, { timeout: 20000 });
  await sam.waitForTimeout(800);
  check((await lab(sam)).tone === 3, 'the tone is remembered after a reload');

  // Kai (Turkish phone): Eller and the tone names.
  await kai.evaluate(() => document.querySelector('.toolbar .react-open')?.click());
  await kai.waitForTimeout(300);
  await kai.evaluate((s) => [...document.querySelectorAll(`${s} .tray-chip`)].find((c) => c.textContent === 'El işaretleri')?.click(), tray);
  await kai.waitForTimeout(200);
  const tr = await kai.evaluate((s) => document.querySelector(`${s} .tray-tone`)?.getAttribute('aria-label') ?? null, tray);
  check(tr === 'Varsayılan ten rengi', 'Turkish: El işaretleri, tone names in Turkish', tr);
  if (SHOTS) await kai.screenshot({ path: `${SHOTS}/hands-phone-tr.png` });

  // Alex (computer): the rail's 😀 window pages to the hands with ▼.
  const rail = await alex.evaluate(async () => {
    document.querySelector('#dock-react')?.click();
    await new Promise((r) => setTimeout(r, 200));
    for (let i = 0; i < 3; i++) {
      document.querySelector('#dock-react-pop .reaction-page:last-of-type')?.click();
      await new Promise((r) => setTimeout(r, 80));
    }
    return [...document.querySelectorAll('#dock-react-pop .reaction-btn:not(.sticker-open)')].map((b) => b.textContent).join('');
  });
  check(rail === '👍👏🙌👋🤞🫶✌️👌', 'computer: the rail\'s 😀 window reaches the hands page with ▼', rail);
  if (SHOTS) await alex.screenshot({ path: `${SHOTS}/hands-laptop-en.png` });

  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ The hands page sends hands in a skin tone');
  process.exit(fails ? 1 : 0);
})();
