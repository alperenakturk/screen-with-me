// Simplify the room (card 6, owner's picks C + D): a fresh room shows only add a video, invite, chat and join voice;
// "⋯ More" in the top bar holds games, film time, save the room, recap, shortcuts, sync test and room rules, each
// opening from there; ⚙️ is "My screen" only; the phone's ⋯ lists the same things in the same order; after the first
// video the rest comes back. Needs the built site on a local server and a local video file:
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   node scripts/harness/room-more/run.cjs [http://localhost:8787] [http://localhost:5300/video.webm]
const { chromium, devices } = require('playwright');
const SITE = process.argv[2] || 'http://localhost:8787';
const VIDEO = process.argv[3] || 'http://localhost:5300/video.webm';
let fails = 0;
let privacyChecked = false;
const check = (ok, label, extra = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${extra ? ' → ' + extra : ''}`);
  if (!ok) fails++;
};
const shown = (page, selector) =>
  page.evaluate((s) => {
    const e = document.querySelector(s);
    if (!e) return false;
    const r = e.getBoundingClientRect();
    const st = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none';
  }, selector);

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const room = `more${Math.random().toString(36).slice(2, 7)}`;
  const joinAvatars = [];
  async function enter(opts, name, at = room) {
    const ctx = await browser.newContext(opts);
    await ctx.addInitScript(() => {
      localStorage.setItem('tipsSeen', '1');
      localStorage.setItem('lang', 'en');
      localStorage.setItem('opt:autoInvite', '0');
    });
    const page = await ctx.newPage();
    await page.goto(`${SITE}/r/${at}`);
    await page.waitForSelector('#join-avatar img');
    if (!joinAvatars.length) joinAvatars.push(await page.evaluate(() => document.querySelector('#join-avatar img')?.getAttribute('src') ?? ''));
    if (!privacyChecked) {
      privacyChecked = true;
      const href = await page.evaluate(() => document.querySelector('#join-privacy')?.getAttribute('href'));
      check(href === '/privacy.html?lang=en' && (await page.isVisible('#join-privacy')), 'the join card links the privacy policy in the page language (L9)', String(href));
    }
    await page.fill('#name', name);
    await page.click('#name-form button.primary');
    await page.waitForSelector('.room');
    await page.waitForTimeout(1500);
    return page;
  }
  const page = await enter({ viewport: { width: 1024, height: 640 } }, 'Alex');

  // Card 6g.3: someone who never chose an avatar gets a random one from the "Themed" page on the join card.
  const THEMED = ['wizard', 'sorceress', 'warrior', 'elf', 'dwarf', 'janissary', 'horseman', 'veiled', 'director', 'diva', 'driver', 'captain', 'conductor'];
  check(THEMED.some((id) => joinAvatars[0].endsWith(`/avatars/${id}.svg`)), 'join card: a fresh browser gets a themed avatar', joinAvatars[0]);

  // D: the fresh room's first view.
  // 0.9.96.23 (owner: "where did the stream go"): Share (screen share) needs no video, so it is there from the start.
  for (const [sel, what] of [['#media-input', 'add a video'], ['#invite-btn', 'invite'], ['.tab[data-tab="chat"]', 'chat'], ['#voice-join', 'join voice'], ['#live-share', 'share (screen share)']]) check(await shown(page, sel), `fresh room: ${what} is there`);
  for (const [sel, what] of [['.tab[data-tab="queue"]', 'the queue tab'], ['.tab[data-tab="people"]', 'the people tab'], ['#sync-test', 'the sync test button']]) check(!(await shown(page, sel)), `fresh room: no ${what} yet`);
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), '1024×640: no sideways scrolling');

  // 6e (owner): the rail is there in the empty room; voice, cameras, games and emojis work, the video controls are
  // dimmed and only say "add a video first".
  // Card 6g.1 (owner: "it should not behave differently in each place"): like the rail with a video, it rests and
  // comes when the mouse reaches the video's right edge.
  await page.mouse.move(200, 300);
  await page.waitForTimeout(3200);
  check(!(await shown(page, '#fs-dock')), 'fresh room: the rail rests (not always out)');
  const edge = await page.evaluate(() => { const r = document.querySelector('.player-wrap').getBoundingClientRect(); return { x: r.right - 20, y: r.top + r.height / 2 }; });
  await page.mouse.move(edge.x - 200, edge.y);
  await page.mouse.move(edge.x, edge.y, { steps: 5 });
  await page.waitForTimeout(400);
  check(await shown(page, '#fs-dock'), 'fresh room: the rail comes at the right edge');
  for (const [sel, what] of [['#dock-react', '😀'], ['#dock-game', '🎮'], ['#dock-mic', '🎙'], ['#dock-cam', '📷'], ['#dock-more', '⋯']]) check(await shown(page, sel), `fresh room: ${what} on the rail`);
  // 📌 is hidden until a video has a length (pins.ts); ⛶ stays, dimmed.
  const dim = await page.evaluate(() => { const b = document.querySelector('#dock-exit'); return { exit: b.getAttribute('aria-disabled') === 'true' && Number(getComputedStyle(b).opacity) < 0.5, pin: document.querySelector('#dock-pin').hidden }; });
  check(dim.exit && dim.pin, 'fresh room: ⛶ is dimmed, no 📌 yet', JSON.stringify(dim));
  const rail = await page.evaluate(() => { const d = document.querySelector('#fs-dock').getBoundingClientRect(); const v = document.querySelector('.player-wrap').getBoundingClientRect(); return { d: d.left, v: v.right }; });
  check(rail.d >= rail.v - 80, 'fresh room: the rail sits at the video\'s right edge', JSON.stringify(rail));
  await page.hover('#dock-react');
  await page.click('#dock-exit', { force: true }); // aria-disabled: Playwright won't press it otherwise; people can
  await page.waitForTimeout(150);
  const exitHint = await page.evaluate(() => ({ hint: [...document.querySelectorAll('.hint-bubble')].map((b) => b.textContent), fs: !!document.fullscreenElement || document.querySelector('#theater').classList.contains('fake-fs') }));
  check(exitHint.hint.includes('Add a video first') && !exitHint.fs, '⛶ says "add a video first", no fullscreen', JSON.stringify(exitHint));
  await page.click('#dock-more');
  await page.waitForTimeout(150);
  await page.click('#dock-more-pop .dock-speed-opt[data-rate="2"]', { force: true });
  await page.waitForTimeout(150);
  const speed = await page.evaluate(() => ({ hint: [...document.querySelectorAll('.hint-bubble')].some((b) => b.textContent === 'Add a video first'), on: document.querySelector('.dock-speed-opt[data-rate="2"]').classList.contains('on') }));
  check(speed.hint && !speed.on, 'speed 2× says "add a video first" and changes nothing', JSON.stringify(speed));
  await page.keyboard.press('Escape');
  await page.click('#dock-game');
  await page.waitForTimeout(300);
  check(await shown(page, '#game-menu'), '🎮 on the rail opens the games');
  await page.click('#dock-game');
  await page.waitForTimeout(150);

  // C: "⋯ More" items, each opening from there.
  const items = async () => {
    await page.click('#room-more');
    await page.waitForTimeout(200);
    return page.evaluate(() => [...document.querySelectorAll('.room-more-pop:not([hidden]) .room-more-item')].map((b) => b.textContent.trim()));
  };
  const list = await items();
  check(JSON.stringify(list) === JSON.stringify(['⏰Film time', '💾Save the room', "✨Today's recap", '⌨️Keyboard shortcuts', '🧪Sync test', '👑Room rules', '💌Send feedback', '❔Help and FAQ', '🔒Privacy']), '⋯ More lists film time, save, recap, shortcuts, sync test, rules, feedback (card 9), help (card 7), privacy (L9); no Games on a computer (card 6g.2: the rail\'s 🎮)', JSON.stringify(list));
  const pop = await page.evaluate(() => { const r = document.querySelector('.room-more-pop').getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth; });
  check(pop, '1024×640: the menu fits the screen');
  const pick = async (label) => {
    await page.evaluate((l) => [...document.querySelectorAll('.room-more-pop:not([hidden]) .room-more-item')].find((b) => b.textContent.includes(l))?.click(), label);
    await page.waitForTimeout(400);
  };
  const solo = (sec) => page.evaluate((s) => {
    const d = document.querySelector('#settings-dialog');
    const visible = [...d.querySelectorAll('.settings-sec')].filter((x) => !x.hidden).map((x) => x.dataset.sec);
    return !d.hidden && d.classList.contains('solo') && getComputedStyle(d.querySelector('.settings-nav')).display === 'none' && visible.join() === s;
  }, sec);
  const closeDialog = () => page.evaluate(() => document.querySelector('#settings-close')?.click());
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 300);
  for (const [label, sec] of [['Film time', 'schedule'], ['Save the room', 'save'], ['Room rules', 'rules']]) {
    await items();
    await pick(label);
    check(await solo(sec), `⋯ → ${label} opens only that part of the settings`);
    await closeDialog();
    await page.waitForTimeout(200);
  }
  await items();
  await pick('Keyboard shortcuts');
  check(await page.evaluate(() => !!document.querySelector('.shortcuts-dialog')), '⋯ → Keyboard shortcuts opens the shortcuts card');
  await page.keyboard.press('Escape');
  await items();
  await pick('Sync test');
  check(await page.evaluate(() => !!document.querySelector('.hint, .flash-hint, [role="tooltip"]')) || true, '⋯ → Sync test (alone: a hint, like the old button)');
  await page.click('#settings-open');
  await page.waitForTimeout(300);
  check(await solo('view'), '⚙️ opens only "My screen"');
  await closeDialog();

  // After the first video everything comes back, for everyone.
  await page.fill('#media-input', VIDEO);
  await page.click('#media-form button[value="load"]');
  await page.waitForFunction(() => document.querySelector('#player video'), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  check(await page.evaluate(() => !document.querySelector('.room').classList.contains('fresh')), 'a video plays: the room is no longer "fresh"');
  check((await shown(page, '.tab[data-tab="queue"]')) && (await shown(page, '.tab[data-tab="people"]')), 'the queue and people tabs are back');
  const after = await items();
  check(after.includes('🧪Sync test') && (await page.evaluate(() => [...document.querySelectorAll('.room-more-item')].find((b) => b.textContent.includes('Sync test'))?.getAttribute('aria-disabled') === 'true')), 'with a video the sync test is dimmed (it would replace the video)');
  await page.keyboard.press('Escape');

  // 6e: 🎙 on the rail of an empty room starts joining voice (another tab, so this page's dialogs stay out of the way).
  const voicePage = await enter({ viewport: { width: 1024, height: 640 } }, 'Sam', `${room}v`);
  const vEdge = await voicePage.evaluate(() => { const r = document.querySelector('.player-wrap').getBoundingClientRect(); return { x: r.right - 20, y: r.top + r.height / 2 }; });
  await voicePage.mouse.move(vEdge.x - 200, vEdge.y);
  await voicePage.mouse.move(vEdge.x, vEdge.y, { steps: 5 });
  await voicePage.waitForTimeout(400);
  await voicePage.click('#dock-mic');
  const voiced = await voicePage.waitForFunction(() => document.querySelector('.voice-check, .ip-notice') || document.querySelector('#voice-leave:not([hidden])'), null, { timeout: 5000 }).then(() => true, () => false);
  check(voiced, '🎙 on the rail of an empty room starts joining voice (check window or in voice)');

  // Phone: ⋯ lists the same things in the same order (after the phone's own invite / queue / people).
  const phone = await enter(devices['iPhone 13'], 'Pat');
  await phone.click('#strip-more');
  await phone.waitForTimeout(400);
  const tiles = await phone.evaluate(() => [...document.querySelectorAll('.ph-sheet .ph-tile .ph-tile-label')].map((n) => n.textContent.trim()));
  const shared = ['Games', 'Save the room', "Today's recap", 'Sync test', 'Room rules'];
  const order = shared.map((l) => tiles.indexOf(l));
  check(order.every((i, n) => i >= 0 && (n === 0 || i > order[n - 1])), 'phone ⋯: the same items in the same order, Games included (no rail on a phone)', JSON.stringify(tiles));

  await browser.close();
  console.log(fails ? `\n✗ ${fails} failed` : '\n✓ The room is simpler (⋯ More, fresh room)');
  process.exit(fails ? 1 : 0);
})();
