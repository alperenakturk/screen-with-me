// 🐞 Test Lab, 👥 Fake friends (card DL, DL2): one person alone tests two-person flows. Up to five 🤖 friends join as
// ordinary clients; each writes, reacts, plays / pauses / jumps, gets stuck (the room waits), leaves and comes back,
// knocks at the door, takes the host role; a chatty mode; all leave when the lab is turned off or the tab goes.
//
//   built site on wrangler dev (CI):  node scripts/harness/lab-friends/run.cjs http://localhost:8787
//   or the dev servers:               node scripts/harness/lab-friends/run.cjs http://localhost:5173
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
let fails = 0;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && extra ? ` → ${extra}` : ''}`);
  if (!ok) fails++;
};
const until = async (fn, ms = 8000) => {
  for (let i = 0; i < ms / 200; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await ctx.addInitScript(() => {
    if (!localStorage.getItem('lang')) localStorage.setItem('lang', 'en');
    localStorage.setItem('opt:autoInvite', '0');
    localStorage.setItem('tipsSeen', '1');
  });
  const page = await ctx.newPage();
  const room = `fr${Math.random().toString(36).slice(2, 7)}`;
  await page.goto(`${SITE}/?debug=1`);
  await page.waitForSelector('.debug-fab');
  await page.goto(`${SITE}/r/${room}`);
  await page.fill('#name', 'Robin');
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await page.waitForFunction(() => !!document.documentElement.dataset.swmTransport, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  const run = (id, arg) => page.evaluate(([i, a]) => window.__swmLab.run(i, a), [id, arg]);
  const people = () => page.evaluate(() => {
    const n = /(\d+)/.exec(document.querySelector('.room-title-count')?.textContent ?? '');
    return n ? Number(n[1]) : 1;
  });
  const chatHas = (text) => page.evaluate((t) => [...document.querySelectorAll('.chat-line')].some((l) => l.textContent.includes(t)), text);
  const logIn = (type) => page.evaluate((t) => window.__swmLab.log().filter((l) => l.dir === 'in' && l.type === t).length, type);

  // ---- Add, at most five ----
  check((await run('friends.say')).dir === 'error', 'with no friends a friend command is refused, not run');
  await run('friends.add3');
  check(!!(await until(async () => (await people()) === 4)), 'three fake friends join (4 people in the room)', String(await people()));
  await page.click('.debug-fab');
  await page.click('.lab-tab[data-tab="friends"]');
  const rows = await until(() => page.evaluate(() => {
    const r = [...document.querySelectorAll('.lab-friend')];
    return r.length === 3 && r.every((x) => x.textContent.includes('in the room')) ? r.map((x) => x.querySelector('strong').textContent).join(',') : null;
  }));
  check(!!rows && rows.split(',').every((n) => n.startsWith('🤖')), '👥 lists them with 🤖 in their names, "in the room"', String(rows));
  await run('friends.add3');
  check(!!(await until(async () => (await people()) === 6)), 'adding three more stops at five friends (6 people)', String(await people()));
  const sixth = await run('friends.add');
  check(sixth.dir === 'error' && /at most 5/.test(sixth.text), 'a sixth is refused (at most 5)', JSON.stringify(sixth));
  await run('friends.removeAll');
  check(!!(await until(async () => (await people()) === 1)), '"everyone leaves" empties the room again');

  // ---- What they do ----
  await run('friends.add');
  await until(async () => (await people()) === 2);
  await page.waitForTimeout(500);
  const said = await run('friends.say', '1');
  const line = said.text.replace(/^▶ /, '').replace(/^"|"$/g, '');
  check(!!(await until(() => chatHas(line))), 'a friend writes: the line shows in my chat', line);
  // BH10: a private message to a fake friend (a press on their name in the chat) goes through like to a real person.
  await page.click('.chat-line:not(.me) button.chat-name');
  const bar = await page.evaluate(() => document.querySelector('.chat-private-text')?.textContent ?? '');
  await page.fill('#chat-input', 'just for the robot');
  await page.press('#chat-input', 'Enter');
  const sentPrivate = await until(() => page.evaluate(() => [...document.querySelectorAll('.chat-line.private.me')].some((l) => l.textContent.includes('just for the robot'))));
  const refused = await page.evaluate(() => window.__swmLab.log().some((l) => l.dir === 'in' && l.type === 'error' && /private_gone/.test(l.text)));
  check(/🤖/.test(bar) && !!sentPrivate && !refused, 'a private message to a fake friend: the bar names them, my bubble is private, no refusal', JSON.stringify({ bar, sentPrivate, refused }));
  await page.click('.chat-private-end');
  await run('friends.react', '1');
  check(!!(await until(async () => (await logIn('reaction')) > 0)), 'a friend sends an emoji (it reaches me)');

  // The sync test plays (no longer alone); friends pause, play and jump.
  await page.evaluate(() => document.getElementById('sync-test')?.click());
  await until(() => page.evaluate(() => window.__swmLab.log().some((l) => l.type === 'state' && l.text.includes('"kind":"test"'))));
  await page.waitForTimeout(1500);
  await run('friends.pause', '1');
  const paused = await until(() => page.evaluate(() => [...window.__swmLab.log()].reverse().find((l) => l.type === 'state' && l.dir === 'in')?.text.includes('"paused":true')));
  check(!!paused, 'a friend pauses: the room pauses for me');
  await run('friends.play', '1');
  const played = await until(() => page.evaluate(() => [...window.__swmLab.log()].reverse().find((l) => l.type === 'state' && l.dir === 'in')?.text.includes('"paused":false')));
  check(!!played, 'a friend plays: the room plays for me');
  // Stuck video: the room waits for them, then goes on.
  await run('friends.stall', '1');
  const waited = await until(() => page.evaluate(() => window.__swmLab.log().some((l) => l.type === 'waiting' && l.text.includes('"ids":["'))));
  check(!!waited, 'a friend\'s video gets stuck: the room waits for them');

  const before = await page.evaluate(() => window.__swmLab.log().filter((l) => l.type === 'state' && l.dir === 'in').length);
  await run('friends.seek', '1');
  check(!!(await until(() => page.evaluate((n) => window.__swmLab.log().filter((l) => l.type === 'state' && l.dir === 'in').length > n, before))), 'a friend jumps: a new room state reaches me');

  // Leave and come back with the same member id.
  await run('friends.bounce', '1');
  check(!!(await until(async () => (await people()) === 1, 6000)), 'a friend leaves (1 person)…');
  check(!!(await until(async () => (await people()) === 2, 12000)), '…and comes back (2 people)');

  // Chatty mode at a 2 s pace.
  const linesBefore = await page.evaluate(() => document.querySelectorAll('.chat-line').length);
  await run('friends.chatty', '2');
  await page.waitForTimeout(5500);
  await run('friends.chatty');
  const linesAfter = await page.evaluate(() => document.querySelectorAll('.chat-line').length);
  const reactions = await logIn('reaction');
  check(linesAfter - linesBefore + reactions >= 3, 'chatty mode: they write and react by themselves', `${linesAfter - linesBefore} lines, ${reactions} emojis`);

  // ---- Knock at the door ----
  await page.evaluate(() => document.getElementById('opt-knock')?.click());
  await page.waitForTimeout(600);
  await run('friends.add');
  const card = await page.waitForSelector('.knock-card', { timeout: 8000 }).then(() => true, () => false);
  check(card, 'with "Ask before letting people in" a new fake friend knocks (I get the card)');
  const door = await until(() => page.evaluate(() => [...document.querySelectorAll('.lab-friend')].some((r) => r.textContent.includes('at the door'))));
  check(!!door, '👥 shows them "at the door"');
  await page.click('.knock-allow');
  check(!!(await until(async () => (await people()) === 3)), '"Let in": they join (3 people)');
  await page.evaluate(() => document.getElementById('opt-knock')?.click());

  // ---- Take the host role ----
  await run('friends.host', '1');
  const hostMoved = await until(() => page.evaluate(() => /Host=someone else/.test([...document.querySelectorAll('.debug-facts dt')].map((d) => `${d.textContent}=${d.nextElementSibling.textContent}`).join('|')) || window.__swmLab.log().some((l) => l.type === 'members' && l.dir === 'in')));
  await page.click('.lab-tab[data-tab="status"]');
  const hostLine = await until(() => page.evaluate(() => [...document.querySelectorAll('.debug-facts dt')].find((d) => d.textContent === 'Host')?.nextElementSibling.textContent === 'someone else'));
  check(!!hostMoved && !!hostLine, 'a fake friend takes the host role (👑 Make host)');
  // BH10: after handing it on I am a guest: the room rules show as a summary, not as switches.
  const guest = await until(() => page.evaluate(() => !document.getElementById('rules-summary').hidden && document.getElementById('opt-knock')?.closest('[hidden], .host-only')?.offsetParent == null));
  check(!!guest, 'after 👑 Make host I am a guest: the room rules are a summary for me');

  // ---- The room still works; turning the lab off sends them away ----
  await page.fill('#chat-input', 'me, still here');
  await page.press('#chat-input', 'Enter');
  check(!!(await until(() => chatHas('me, still here'))), 'my own chat still works with fake friends around');
  await page.click('.debug-off');
  check(!!(await until(async () => (await people()) === 1)), 'turning the lab off: every fake friend leaves');

  // ---- A reload sends them away too ----
  await page.goto(`${SITE}/?debug=1`);
  // The site's code may run after the load event: wait until the switch is on before leaving the page.
  await page.waitForSelector('.debug-fab');
  await page.goto(`${SITE}/r/${room}#back`);
  await page.waitForSelector('.room');
  await page.waitForSelector('.debug-fab');
  await page.waitForFunction(() => !!document.documentElement.dataset.swmTransport, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  await run('friends.add');
  await until(async () => (await people()) === 2);
  await page.reload();
  await page.waitForSelector('.room');
  await page.waitForTimeout(2500);
  check((await people()) === 1, 'a reload: the fake friends are gone', String(await people()));

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Fake friends work');
  process.exit(fails ? 1 : 0);
})();
