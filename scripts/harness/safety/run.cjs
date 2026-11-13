// SAFE1 (owner, 13 Nov 2026): "🔇 Block for me" and "🚩 Report" in the person menu, in real browsers. Alex (computer)
// and Kim (a phone) block Sam: Sam's new chat lines and emojis vanish for them only, Pat still sees everything, the
// block survives a reload and "Unblock" brings the lines back. The report dialog sends the room, the shown name and
// Sam's last lines, never an id. The Worker takes a report through `/api/feedback` and refuses a bad one. Needs the
// built site on wrangler dev:
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/safety/run.cjs [http://localhost:8787]
const { chromium, devices } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || require('os').tmpdir();
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};

(async () => {
  const browser = await chromium.launch();
  const room = `safe${Math.random().toString(36).slice(2, 8)}`;
  const enter = async (name, options = { viewport: { width: 1280, height: 800 } }, langCode = 'en') => {
    const ctx = await browser.newContext(options);
    await ctx.addInitScript((l) => {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', l);
      localStorage.setItem('opt:autoInvite', '0');
    }, langCode);
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/${room}`);
    await page.fill('#name', name);
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await page.waitForTimeout(800);
    return page;
  };
  const say = async (page, text) => {
    await page.fill('#chat-input', text);
    await page.press('#chat-input', 'Enter');
  };
  const texts = (page) => page.evaluate(() => [...document.querySelectorAll('#chat-list .chat-text')].map((p) => p.textContent));
  const waitText = (page, text) => page.waitForFunction((t) => [...document.querySelectorAll('#chat-list .chat-text')].some((p) => p.textContent === t), text, { timeout: 8000 }).catch(() => {});
  /** Opens someone's person menu (their face in Together, the strip on a phone) and presses the row matching `re`. */
  const menuRow = async (page, who, re, shot) => {
    await page.evaluate((w) => [...document.querySelectorAll('.together-person')].find((b) => b.textContent.includes(w))?.click(), who);
    await page.waitForSelector('.person-pop', { timeout: 5000 }).catch(() => {});
    if (shot) await page.screenshot({ path: `${OUT}/safety-${shot}.png` });
    const row = await page.evaluate((src) => {
      const b = [...document.querySelectorAll('.person-pop-item')].find((n) => new RegExp(src).test(n.textContent));
      const r = b?.getBoundingClientRect();
      const text = b?.textContent ?? '';
      const fits = r ? r.top >= 0 && r.bottom <= innerHeight + 1 && r.height >= 24 : false;
      b?.click();
      return { text, fits };
    }, re.source);
    return row;
  };

  /**
   * B2 on .132: the report dialog on a phone held sideways (a 390 px tall screen): the reason chips stay on one row (it
   * scrolls sideways if needed) and the note box keeps room for at least two lines of text.
   */
  const sidewaysReport = async (page, lang) => {
    const d = await page.evaluate(() => {
      const dialog = document.querySelector('.report-dialog');
      const area = dialog?.querySelector('textarea');
      if (!dialog || !area) return null;
      const r = dialog.getBoundingClientRect();
      const cs = getComputedStyle(area);
      const line = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.25;
      const inner = area.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const rows = new Set([...dialog.querySelectorAll('.fb-chip')].map((c) => Math.round(c.getBoundingClientRect().top))).size;
      const send = dialog.querySelector('#report-send')?.getBoundingClientRect();
      return {
        sideways: document.documentElement.classList.contains('sideways'),
        lines: Math.round((inner / line) * 10) / 10,
        rows,
        inView: r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1,
        send: !!send && send.bottom <= innerHeight + 1 && send.height >= 24,
      };
    });
    await page.screenshot({ path: `${OUT}/safety-report-sideways-${lang}.png` });
    check(!!d && d.sideways && d.rows === 1 && d.lines >= 2 && d.inView && d.send, `the report dialog on a sideways phone (${lang}): reasons on one row, the note box ≥ 2 lines, Send in view`, JSON.stringify(d));
  };

  const alex = await enter('Alex');
  const sam = await enter('Sam');
  const pat = await enter('Pat');
  const kim = await enter('Kim', { ...devices['iPhone 13'] }, 'tr');

  await say(sam, 'hello from sam');
  await waitText(alex, 'hello from sam');
  // Alex (computer) blocks Sam from the person menu.
  const block = await menuRow(alex, 'Sam', /Block for me/, 'menu-1280');
  check(/🔇 Block for me/.test(block.text) && block.fits, 'the person menu has "🔇 Block for me" (computer), in view', JSON.stringify(block));
  const hint = await alex.evaluate(() => document.querySelector('.hint-bubble')?.textContent ?? '');
  check(/Sam is blocked for you/.test(hint), 'a note says it is for me only', hint);
  let seen = await texts(alex);
  check(!seen.includes('hello from sam'), "Sam's earlier line is hidden for Alex at once", JSON.stringify(seen));

  // Kim (a phone, Turkish): a face opens the People sheet; Sam's row has 🔇 "Benim için engelle" and 🚩 "Bildir".
  await waitText(kim, 'hello from sam');
  await kim.locator('.together-person', { hasText: 'Sam' }).tap();
  await kim.waitForSelector('#members .person .safety-block', { timeout: 5000 }).catch(() => {});
  await kim.waitForTimeout(400);
  await kim.screenshot({ path: `${OUT}/safety-people-phone-tr.png` });
  const kimRow = await kim.evaluate(() => {
    const row = [...document.querySelectorAll('#members .person')].find((li) => li.textContent.includes('Sam'));
    const b = row?.querySelector('.safety-block');
    const rep = row?.querySelector('.safety-report');
    const r = b?.getBoundingClientRect();
    const out = { block: b?.getAttribute('aria-label') ?? '', report: rep?.getAttribute('aria-label') ?? '', fits: r ? r.top >= 0 && r.bottom <= innerHeight + 1 && r.width >= 24 && r.height >= 24 : false, mine: !!document.querySelector('#members .person.me .safety-block') };
    b?.click();
    return out;
  });
  check(/Benim için engelle: Sam/.test(kimRow.block) && /Bildir: Sam/.test(kimRow.report) && kimRow.fits && !kimRow.mine, 'the phone People sheet: Sam\'s row has 🔇 Benim için engelle and 🚩 Bildir (≥ 24 px, in view), my own row none', JSON.stringify(kimRow));
  const kimNow = await kim.evaluate(() => [...document.querySelectorAll('#members .person')].find((li) => li.textContent.includes('Sam'))?.querySelector('.safety-block')?.getAttribute('aria-pressed'));
  check(kimNow === 'true', 'the row shows Sam as blocked (🔈, pressed)', kimNow);
  // The report dialog on the phone, in Turkish: fits the screen with nothing sideways.
  await kim.evaluate(() => [...document.querySelectorAll('#members .person')].find((li) => li.textContent.includes('Sam'))?.querySelector('.safety-report')?.click());
  await kim.waitForSelector('.report-dialog', { timeout: 5000 }).catch(() => {});
  const kimDialog = await kim.evaluate(() => {
    const d = document.querySelector('.report-dialog');
    const r = d?.getBoundingClientRect();
    return d ? { title: d.querySelector('h3')?.textContent, inView: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1, sideways: document.documentElement.scrollWidth > innerWidth + 1, note: !!document.querySelector('.hint-bubble'), tip: /Benim için engelle/.test(d.textContent) } : null;
  });
  await kim.screenshot({ path: `${OUT}/safety-report-phone-tr.png` });
  check(kimDialog?.title === 'Sam adlı kişiyi bildir' && kimDialog.inView && !kimDialog.sideways, 'the report dialog fits a phone (Turkish title)', JSON.stringify(kimDialog));
  check(kimDialog && !kimDialog.note && !kimDialog.tip, 'no leftover "blocked" note over it, and no "use Block" tip when Sam is already blocked', JSON.stringify(kimDialog));
  // Turned sideways with the dialog open.
  await kim.setViewportSize({ width: 844, height: 390 });
  await kim.waitForFunction(() => document.documentElement.classList.contains('sideways'), null, { timeout: 5000 }).catch(() => {});
  await kim.waitForTimeout(500);
  await sidewaysReport(kim, 'tr');
  // A small phone turned (an iPhone SE: 667 × 375): the Turkish reasons no longer fit one row and scroll instead.
  await kim.setViewportSize({ width: 667, height: 375 });
  await kim.waitForTimeout(500);
  await sidewaysReport(kim, 'tr-se');
  await kim.setViewportSize({ width: 390, height: 664 });
  await kim.waitForTimeout(500);
  await kim.keyboard.press('Escape');
  await kim.keyboard.press('Escape');
  await kim.evaluate(() => document.querySelector('.hint-bubble')?.remove());

  // Sam writes and reacts again: Alex and Kim see nothing, Pat sees both.
  await say(sam, 'second from sam');
  await say(pat, 'pat is here');
  await waitText(pat, 'second from sam');
  await waitText(alex, 'pat is here');
  await waitText(kim, 'pat is here');
  seen = await texts(alex);
  check(!seen.includes('second from sam') && seen.includes('pat is here'), "Alex: Sam's new line hidden, Pat's shown", JSON.stringify(seen));
  const kimSees = await texts(kim);
  check(!kimSees.includes('second from sam') && kimSees.includes('pat is here'), "Kim (phone): Sam's new line hidden, Pat's shown", JSON.stringify(kimSees));
  const patSees = await texts(pat);
  check(patSees.includes('hello from sam') && patSees.includes('second from sam'), 'Pat (did not block) sees every line from Sam', JSON.stringify(patSees));
  // Sam still sees Alex's messages (block is local only).
  await say(alex, 'alex still talks');
  await waitText(sam, 'alex still talks');
  check((await texts(sam)).includes('alex still talks'), 'Sam still gets Alex\'s messages (nothing goes to the server)');

  // Reactions: Sam's emoji reaches Pat, never Alex.
  // Reactions: Sam's emoji rises for Pat, never for Alex (counted as they appear: they fly away quickly).
  for (const page of [alex, pat]) {
    await page.evaluate(() => {
      window.__floats = 0;
      new MutationObserver((rs) => {
        for (const r of rs) for (const n of r.addedNodes) if (n.classList?.contains('r-float')) window.__floats++;
      }).observe(document.body, { childList: true, subtree: true });
    });
  }
  const sent = await sam.evaluate(() => {
    document.querySelector('.react-open')?.click();
    const pick = document.querySelector('.react-tray .reaction-btn:not(.sticker-open)');
    pick?.click();
    return pick?.textContent ?? null;
  });
  await pat.waitForFunction(() => window.__floats > 0, null, { timeout: 5000 }).catch(() => {});
  await alex.waitForTimeout(500);
  const floats = { alex: await alex.evaluate(() => window.__floats), pat: await pat.evaluate(() => window.__floats) };
  check(sent && floats.pat > 0 && floats.alex === 0, "Sam's emoji rises for Pat, never for Alex", JSON.stringify({ sent, ...floats }));

  // The Test Lab hook's data: the block is stored per room and survives a reload.
  const stored = await alex.evaluate((r) => localStorage.getItem(`block:${r}`), room);
  check(/Sam/.test(stored ?? ''), 'the block is kept per room (block:<room>)', stored);
  await alex.reload();
  await alex.waitForSelector('.room');
  await waitText(alex, 'pat is here');
  seen = await texts(alex);
  check(!seen.includes('hello from sam') && !seen.includes('second from sam') && seen.includes('pat is here'), 'after a reload Sam stays hidden for Alex', JSON.stringify(seen));

  // Report: the dialog shows what is sent; the body carries no id. (The request is answered here, not sent on.)
  let body = null;
  await alex.route('**/api/feedback', async (route) => {
    body = JSON.parse(route.request().postData() ?? 'null');
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
  });
  const report = await menuRow(alex, 'Sam', /Report/);
  check(/🚩 Report/.test(report.text), 'the person menu has "🚩 Report"', report.text);
  await alex.waitForSelector('.report-dialog', { timeout: 5000 }).catch(() => {});
  const dialog = await alex.evaluate(() => {
    const d = document.querySelector('.report-dialog');
    const r = d?.getBoundingClientRect();
    return d ? { title: d.querySelector('h3')?.textContent, chips: d.querySelectorAll('[data-reason]').length, abuse: !!d.querySelector('a[href*="terms.html"][href*="#abuse"]'), disabled: d.querySelector('#report-send').disabled, inView: r.top >= 0 && r.bottom <= innerHeight + 1 } : null;
  });
  check(dialog?.title === 'Report Sam' && dialog.chips === 4 && dialog.abuse && dialog.disabled && dialog.inView, 'the dialog: title, four reasons, the abuse link, Send off until a reason is picked, fits', JSON.stringify(dialog));
  await alex.click('.report-dialog [data-reason="spam"]');
  await alex.fill('#report-note', 'keeps posting links');
  await alex.evaluate(() => { const d = document.querySelector('.report-dialog details'); if (d) d.open = true; });
  await alex.screenshot({ path: `${OUT}/safety-report-1280.png` });
  await alex.click('#report-send');
  await alex.waitForSelector('.report-dialog .fb-sent', { timeout: 5000 }).catch(() => {});
  const keys = body ? Object.keys(body).sort().join() : '';
  check(keys === 'kind,lines,name,note,reason,room', 'the report sends only kind, reason, room, name, lines and note', keys);
  check(body?.kind === 'report' && body.room === room && body.name === 'Sam' && body.lines.includes('hello from sam') && body.lines.includes('second from sam') && !body.lines.includes('pat is here'), "it carries Sam's last lines, nobody else's", JSON.stringify(body));
  check(!/"(id|pk|cid|ip)"/.test(JSON.stringify(body)), 'no id, person key, browser id or address in it');
  const lab = await alex.evaluate(() => document.querySelector('.report-dialog .fb-sent h4')?.textContent ?? '');
  check(/Thanks/.test(lab), 'a sent report says thanks', lab);
  await alex.keyboard.press('Escape');

  // Unblock: the lines come back.
  const unblock = await menuRow(alex, 'Sam', /Unblock/, 'menu-blocked-1280');
  check(/🔈 Unblock/.test(unblock.text), 'the same menu offers "🔈 Unblock"', unblock.text);
  seen = await texts(alex);
  check(seen.includes('hello from sam') && seen.includes('second from sam'), "after Unblock Sam's lines show again", JSON.stringify(seen));

  // The Worker: a report takes the feedback path (no token locally: "off" = it was valid), a bad one is refused.
  const post = (payload) => pat.evaluate(async (p) => {
    const res = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    return { status: res.status, body: await res.json().catch(() => null) };
  }, payload);
  const good = await post({ kind: 'report', reason: 'abuse', room, name: 'Sam', lines: ['x'] });
  // Validation comes before the limits, so "busy" (the feedback e2e already used this address's hour) is a pass too.
  check((good.status === 200 && (good.body?.error === 'off' || good.body?.ok === true)) || (good.status === 429 && good.body?.error === 'busy'), 'the Worker accepts a valid report (past validation)', JSON.stringify(good));
  const bad = await post({ kind: 'report', reason: 'abuse', room: 'no/room', name: 'Sam', lines: [] });
  check(bad.status === 400, 'the Worker refuses a report with a bad room', JSON.stringify(bad));

  // TR clock (owner, 13 Nov 2026): a Turkish screen shows 24-hour times, whatever the browser's own language.
  const kimTimes = await kim.evaluate(() => [...document.querySelectorAll('#chat-list time')].map((t) => t.textContent));
  check(kimTimes.length > 0 && kimTimes.every((t) => /^\d{2}[:.]\d{2}$/.test(t)), 'a Turkish screen shows chat times as 24-hour "14:05"', JSON.stringify(kimTimes.slice(0, 3)));

  // The same in English, on a phone that joins already held sideways (an iPhone 13 turned: 844 × 390).
  const lee = await enter('Lee', { ...devices['iPhone 13 landscape'] });
  await lee.waitForFunction(() => document.documentElement.classList.contains('sideways'), null, { timeout: 5000 }).catch(() => {});
  await lee.evaluate(() => [...document.querySelectorAll('.together-person')].find((b) => b.textContent.includes('Pat'))?.click());
  await lee.waitForSelector('#members .person .safety-report', { timeout: 5000 }).catch(() => {});
  await lee.evaluate(() => [...document.querySelectorAll('#members .person')].find((li) => li.textContent.includes('Pat'))?.querySelector('.safety-report')?.click());
  await lee.waitForSelector('.report-dialog', { timeout: 5000 }).catch(() => {});
  await lee.waitForTimeout(400);
  await sidewaysReport(lee, 'en');

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Block for me and Report work');
  process.exit(fails ? 1 : 0);
})();
