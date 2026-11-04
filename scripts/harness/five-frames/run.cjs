// 🎟️ Five Frames in the room (card "Daily word game"): Alex opens it from the gallery's "On the side".
// Checks: it opens with seven ticket rows and an alphabetical tray, fits without scrollbars (own size, a small window,
// a phone), a wrong guess typed with the tray gets the right ✓ / • marks, an unknown word is refused, the physical
// keyboard types only while the board has the focus (the room's keys stay the room's), solving shows the result and a
// spoiler-free share line, the result survives a reload, Turkish has its own alphabet.
//
//   npm run dev, then: node scripts/harness/five-frames/run.cjs [site]
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] ?? 'http://localhost:5173';
const ROOT = require('path').resolve(__dirname, '../../..');
const room = 'ff' + Math.random().toString(36).slice(2, 8);
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

async function person(ctx, name, avatar) {
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', name, e.message));
  await page.goto(`${SITE}/`);
  await page.waitForTimeout(800);
  await page.evaluate(([n, a]) => {
    localStorage.setItem('name', n);
    localStorage.setItem('avatar', a);
    localStorage.setItem('lang', 'en');
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('tipsSeen', '1');
    for (const k of ['snackBar', 'windowGarden', 'fiveFrames']) localStorage.setItem(k + ':howSeen', '1');
    localStorage.setItem('opt:hubTab', 'side');
  }, [name, avatar]);
  await page.goto(`${SITE}/r/${room}#back`);
  await until(() => page.evaluate(() => !!document.querySelector('#game-btn')));
  await page.waitForTimeout(1200);
  return page;
}
const open = (page) =>
  page.evaluate(async () => {
    const button = ['#dock-game', '#game-btn', '#more-game'].map((x) => document.querySelector(x)).find((e) => e && (e.getBoundingClientRect().width > 0 || e.id === 'more-game'));
    button.click();
    for (let i = 0; i < 30 && !document.querySelector('#game-menu [data-solo="word"]'); i++) await new Promise((r) => setTimeout(r, 100));
    document.querySelector('#game-menu [data-solo="word"]')?.click();
    for (let i = 0; i < 50 && !document.querySelector('#game-stage .ff-key'); i++) await new Promise((r) => setTimeout(r, 100));
    return !!document.querySelector('#game-stage .ff-key');
  });
const fits = (page) =>
  page.evaluate(() => {
    const out = [];
    for (const sel of ['#game-stage .game-stage-body', '#game-stage .ff']) {
      const e = document.querySelector(sel);
      if (e && (e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1)) out.push(`${sel} ${e.scrollWidth}×${e.scrollHeight} in ${e.clientWidth}×${e.clientHeight}`);
    }
    const st = document.getElementById('game-stage').getBoundingClientRect();
    if (st.width < 100 || st.right > innerWidth + 1 || st.bottom > innerHeight + 1 || st.left < -1 || st.top < -1) out.push(`window ${JSON.stringify(st)}`);
    return out;
  });
// Today's answer and a wrong guess, worked out with the game's own rules and list (dev server modules).
const solve = (page, lang) =>
  page.evaluate(async ([root, lang]) => {
    const rules = await import(`/@fs${root}/packages/shared/src/games/five-frames.ts`);
    const { WORDS, ANSWERS } = await import(`/src/games/words/${lang}.ts`);
    const chars = Array.from(WORDS);
    const words = [];
    for (let i = 0; i < chars.length; i += 5) words.push(chars.slice(i, i + 5).join(''));
    const answers = ANSWERS.split(',').map((n) => words[parseInt(n, 36)]);
    const answer = rules.answerFor(rules.dayNumber(), answers, lang);
    const wrong = words.find((w) => w !== answer && new Set(w).size === 5 && rules.score(w, answer).some((m) => m !== 'miss')) ?? words.find((w) => w !== answer);
    return { answer, wrong, marks: rules.score(wrong, answer), day: rules.dayNumber() };
  }, [ROOT, lang]);
const tap = (page, word) => page.evaluate(async (w) => {
  for (const c of Array.from(w)) document.querySelector(`#game-stage .ff-key[data-key="${c}"]`).click();
  document.querySelector('#game-stage .ff-key[data-key="Enter"]').click();
}, word);
const row = (page, i) => page.evaluate((n) => [...document.querySelectorAll('#game-stage .ff-row')[n].querySelectorAll('.ff-cell')].map((c) => (c.classList.contains('hit') ? 'hit' : c.classList.contains('near') ? 'near' : c.classList.contains('miss') ? 'miss' : '-')), i);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['clipboard-read', 'clipboard-write'] });
  const alex = await person(ctx, 'Alex', 'wizard');

  check(await open(alex), 'Five Frames opens from the gallery’s "On the side"');
  const shape = await alex.evaluate(() => ({ rows: document.querySelectorAll('#game-stage .ff-row').length, keys: [...document.querySelectorAll('#game-stage .ff-key')].map((k) => k.dataset.key) }));
  check(shape.rows === 7, 'seven ticket rows', String(shape.rows));
  check(shape.keys.slice(0, 26).join('') === 'abcdefghijklmnopqrstuvwxyz' && shape.keys.at(-1) === 'Enter', 'an alphabetical tray, ⌫ and Enter at the end', shape.keys.join(''));
  check((await fits(alex)).length === 0, 'fits without scrollbars at its own size', (await fits(alex)).join('; '));

  const en = await solve(alex, 'en');
  await tap(alex, 'zzzzz');
  const refused = await alex.evaluate(() => document.querySelector('#game-stage .ff-message').textContent);
  check(/word list/.test(refused), 'an unknown word is refused', refused);
  for (let i = 0; i < 5; i++) await alex.evaluate(() => document.querySelector('#game-stage .ff-key[data-key="Backspace"]').click());
  await tap(alex, en.wrong);
  // The row turns over cell by cell (≈ 540 ms, card GP).
  await alex.waitForTimeout(700);
  const marks = await row(alex, 0);
  check(JSON.stringify(marks) === JSON.stringify(en.marks), `a wrong guess gets the right marks (${en.wrong})`, `${marks} vs ${en.marks}`);
  // IP audit ("make it ours"): marks differ by line and sign, never by a green / gold / grey fill.
  const looks = await alex.evaluate(() => ['hit', 'near', 'miss'].map((m) => {
    const c = document.querySelector(`#game-stage .ff-board .ff-cell.${m}`);
    if (!c) return null;
    const s = getComputedStyle(c);
    return { m, bg: s.backgroundColor, shadow: s.boxShadow, outline: s.outlineStyle, sign: getComputedStyle(c, '::after').content };
  }));
  const ok = looks.every((l) => !l || (!/63, 207, 142|58, 52, 88/.test(l.bg) && (l.m !== 'hit' || (/3px/.test(l.shadow) && /✓/.test(l.sign))) && (l.m !== 'near' || (l.outline === 'dashed' && /•/.test(l.sign))) && (l.m !== 'miss' || /×/.test(l.sign))));
  check(ok, 'ticket marks: solid frame ✓, dashed frame •, faded × (no green / gold / grey fills)', JSON.stringify(looks));

  // Keys typed while the message box has the focus stay the room's; on the focused board they are the game's.
  await alex.evaluate(() => document.getElementById('chat-input')?.focus());
  await alex.keyboard.type('ab');
  const chatText = await alex.evaluate(() => document.getElementById('chat-input')?.value ?? '');
  const typedRow = await alex.evaluate(() => document.querySelectorAll('#game-stage .ff-row')[1].textContent);
  check(chatText === 'ab' && !/A/.test(typedRow), 'with the message box focused, letters go to the chat, not the game', `${chatText} | ${typedRow}`);
  await alex.evaluate(() => { const i = document.getElementById('chat-input'); if (i) i.value = ''; });
  await alex.click('#game-stage .ff-board');
  await alex.keyboard.type(en.answer);
  await alex.keyboard.press('Enter');
  const solved = await until(() => alex.evaluate(() => /Solved in 2\/7/.test(document.querySelector('#game-stage .ff-message').textContent)), 4000);
  check(!!solved, 'typing on the focused board + Enter solves it in 2/7');
  const chatFocus = await alex.evaluate(() => document.activeElement?.id === 'chat-input');
  check(!chatFocus, 'Enter on the board did not open the message box');
  await alex.evaluate(() => document.querySelector('#game-stage .ff-share').click());
  const shared = await alex.evaluate(() => navigator.clipboard.readText());
  check(new RegExp(`^🍿 Five Frames #${en.day} · 2/7$`).test(shared) && !shared.toLowerCase().includes(en.answer), 'the share line has the day and tries, no letters', shared);
  check((await fits(alex)).length === 0, 'the finished board still fits', (await fits(alex)).join('; '));
  await alex.screenshot({ path: __dirname + '/frames-window.png' });

  // Reload: the solved day is kept.
  await alex.reload();
  await until(() => alex.evaluate(() => !!document.querySelector('#game-btn')));
  await alex.waitForTimeout(1200);
  await open(alex);
  const kept = await until(() => alex.evaluate(() => /Solved in 2\/7/.test(document.querySelector('#game-stage .ff-message')?.textContent ?? '')), 4000);
  check(!!kept, 'after a reload the day is still solved');

  // BH2: a streak with a missed day since its last win shows 🔥 0, not the old number.
  await alex.evaluate((d) => {
    const save = JSON.parse(localStorage.getItem('fiveFrames'));
    save.stats.en.streak = 3;
    save.stats.en.last = d - 2;
    delete save.games.en;
    localStorage.setItem('fiveFrames', JSON.stringify(save));
  }, en.day);
  await alex.reload();
  await until(() => alex.evaluate(() => !!document.querySelector('#game-btn')));
  await alex.waitForTimeout(1200);
  await open(alex);
  const shown = await until(() => alex.evaluate(() => document.querySelector('#game-stage .ff-streak')?.textContent || null), 4000);
  check(shown === '🔥 0', 'a missed day breaks the streak shown (🔥 0, not the old 🔥 3)', String(shown));

  // Turkish: its own alphabet and its own game.
  await alex.evaluate(() => document.querySelector('#game-stage .ff-lang[data-lang="tr"]').click());
  const tr = await until(() => alex.evaluate(() => { const keys = [...document.querySelectorAll('#game-stage .ff-key')].map((k) => k.dataset.key); return keys.length > 30 ? keys : null; }), 5000);
  check(!!tr && tr.includes('ç') && tr.includes('ğ') && tr.includes('ı') && tr.includes('i') && !tr.includes('q'), 'Turkish: Ç Ğ I İ Ö Ş Ü in the tray, no Q', tr?.join(''));
  check(await alex.evaluate(() => !document.querySelector('#game-stage .ff-row.done')), 'Turkish starts its own empty day');
  const trCase = await alex.evaluate(() => document.querySelector('#game-stage .ff-key[data-key="i"]').textContent + document.querySelector('#game-stage .ff-key[data-key="ı"]').textContent);
  check(trCase === 'İI', 'Turkish capitals: i → İ, ı → I', trCase);
  check((await fits(alex)).length === 0, 'Turkish fits too', (await fits(alex)).join('; '));

  await alex.setViewportSize({ width: 900, height: 560 });
  await alex.waitForTimeout(600);
  check((await fits(alex)).length === 0, 'fits a 900×560 window', (await fits(alex)).join('; '));

  const phone = await browser.newContext({ ...devices['iPhone 13'] });
  const pam = await person(phone, 'Pam', 'elf');
  check(await open(pam), 'phone: it opens');
  await pam.waitForTimeout(500);
  check((await fits(pam)).length === 0, 'phone: fits without scrollbars', (await fits(pam)).join('; '));
  await pam.screenshot({ path: __dirname + '/frames-phone.png' });

  await browser.close();
  console.log(failed ? `\n✗ ${failed} checks failed` : '\n✓ Five Frames harness passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
