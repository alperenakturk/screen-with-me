// Card GN1 (owner, 21 Nov 2026): opening a shared table posts a line in the chat with the game's cover, "Alex opened
// a Sea Battle table" and Join. Alex opens Sea Battle from the games hall; Sam (another browser) sees the line, joins
// from it and is at the table; Alex's own line has no Join; "Hide activity" never hides it; when Alex ends the table
// the line greys out and its Join goes. Test Lab `chat.gameInvite` reports the lines. Also a phone look at the line.
//
//   npm run build, a local server (wrangler dev), then: node scripts/harness/game-chat/run.cjs [site]   (SHOTS=dir: pictures)
const { chromium, devices } = require('playwright');
const path = require('path');

const SITE = process.argv[2] || 'http://localhost:8787';
let fails = 0;
const check = (ok, label, extra = '') => {
  if (!ok) fails++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ` → ${extra}` : ''}`);
  if (!ok && process.env.GITHUB_ACTIONS) console.log(`::error title=${path.basename(__dirname)}::${label}`);
};

(async () => {
  const browser = await chromium.launch();
  const room = `gc${Math.random().toString(36).slice(2, 8)}`;
  async function person(name, options) {
    const ctx = await browser.newContext(options);
    await ctx.addInitScript((n) => {
      for (const [k, v] of Object.entries({ lang: 'en', name: n, avatar: 'wizard', 'opt:autoInvite': '0', tipsSeen: '1', gameMode: 'frame', 'opt:chatEvents': '0' })) localStorage.setItem(k, v);
      for (const k of ['sea', 'duel', 'quiz', 'draw', 'poker', 'classics:xox']) localStorage.setItem(`${k}:howSeen`, '1');
    }, name);
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/${room}?debug=1#back`);
    await page.waitForFunction(() => !!document.querySelector('#game-btn') && !!window.__swmLab, null, { timeout: 20000 });
    await page.waitForTimeout(1200);
    return page;
  }
  const lines = async (page) => JSON.parse((await page.evaluate(async () => (await window.__swmLab.run('chat.gameInvite')).text)).replace(/^[^[]*/, ''));
  const alex = await person('Alex', { viewport: { width: 1366, height: 768 } });
  const sam = await person('Sam', { viewport: { width: 1366, height: 768 } });
  const lee = await person('Lee', devices['iPhone 13']);

  // Alex opens Sea Battle from the hall.
  await alex.evaluate(() => ['#dock-game', '#game-btn', '#more-game'].map((x) => document.querySelector(x)).find((e) => e && (e.getBoundingClientRect().width > 0 || e.id === 'more-game'))?.click());
  await alex.waitForFunction(() => !!document.querySelector('#game-menu [data-kind="sea"]'), null, { timeout: 10000 });
  await alex.waitForTimeout(1200);
  await alex.evaluate(() => document.querySelector('#game-menu [data-kind="sea"]').click());
  await sam.waitForSelector('#chat-list .chat-game', { timeout: 10000 }).catch(() => {});
  await sam.waitForTimeout(800);

  const samLines = await lines(sam);
  check(samLines.length === 1 && samLines[0].kind === 'sea' && samLines[0].by === 'Alex' && samLines[0].join && !samLines[0].closed, 'Sam: one chat line for the new table, with Join', JSON.stringify(samLines));
  const look = await sam.evaluate(() => {
    const li = document.querySelector('#chat-list .chat-game');
    const r = li?.getBoundingClientRect();
    const cover = li?.querySelector('.chat-game-cover');
    const join = li?.querySelector('.chat-game-join')?.getBoundingClientRect();
    return {
      text: li?.querySelector('.chat-game-text')?.textContent ?? '',
      shown: !!r && r.width > 0 && r.height > 0,
      cover: !!cover?.querySelector('svg'),
      join: join ? [Math.round(join.width), Math.round(join.height)] : null,
      inList: !!r && r.right <= document.querySelector('#chat-list').getBoundingClientRect().right + 1,
    };
  });
  check(look.shown && look.text.includes('Alex opened a Sea Battle table'), 'Sam: the line says who opened which game', JSON.stringify(look));
  check(look.cover, 'Sam: the game\'s cover is drawn');
  if (process.env.SHOTS) await sam.screenshot({ path: `${process.env.SHOTS}/game-chat-laptop.png` });
  check(look.join && look.join[0] >= 24 && look.join[1] >= 24 && look.inList, 'Sam: Join is a real target inside the chat', JSON.stringify(look));
  check(await sam.evaluate(() => document.querySelector('#chat-list').classList.contains('hide-events')), 'Sam: activity is hidden, the game line shows anyway');
  const alexLines = await lines(alex);
  check(alexLines.length === 1 && !alexLines[0].join, 'Alex: their own line has no Join', JSON.stringify(alexLines));

  // Lee on a phone: the line fits the chat.
  await lee.evaluate(() => document.querySelector('[data-ph-tab="chat"], #ph-tab-chat')?.click());
  await lee.waitForTimeout(600);
  const phone = await lee.evaluate(() => {
    const li = document.querySelector('#chat-list .chat-game');
    const r = li?.getBoundingClientRect();
    return r ? { w: Math.round(r.width), r: Math.round(r.right), vw: innerWidth } : null;
  });
  check(phone && phone.r <= phone.vw, 'Lee (phone): the line fits the screen', JSON.stringify(phone));
  if (process.env.SHOTS) await lee.screenshot({ path: `${process.env.SHOTS}/game-chat-phone.png` });

  // Sam joins from the chat line.
  await sam.evaluate(() => document.querySelector('#chat-list .chat-game-join').click());
  const atTable = await sam.waitForFunction(() => {
    const s = document.getElementById('game-stage');
    return !!s && !s.hidden;
  }, null, { timeout: 10000 }).then(() => true).catch(() => false);
  check(atTable, 'Sam: Join from the chat opens the table');

  // Alex ends the table: the line greys out, no Join.
  await alex.evaluate(() => {
    const end = [...document.querySelectorAll('#game-stage button')].find((b) => /end|close/i.test(b.getAttribute('aria-label') || b.title || b.textContent || '') && b.offsetParent);
    end?.click();
  });
  await alex.waitForTimeout(300);
  await alex.evaluate(() => document.querySelector('.dialog-backdrop button.primary, .confirm-yes')?.click());
  await sam.waitForFunction(() => document.querySelector('#chat-list .chat-game.closed'), null, { timeout: 10000 }).catch(() => {});
  const after = await lines(sam);
  check(after.length === 1 && after[0].closed && !after[0].join, 'Sam: the table closed, the line greys out without Join', JSON.stringify(after));
  const greyText = await sam.evaluate(() => document.querySelector('#chat-list .chat-game .chat-game-state')?.textContent ?? '');
  check(greyText === 'The table closed', 'Sam: it says the table closed', greyText);
  if (process.env.SHOTS) await sam.screenshot({ path: `${process.env.SHOTS}/game-chat-closed-laptop.png` });

  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ A game table opened shows in the chat with Join');
  process.exit(fails ? 1 : 0);
})();
