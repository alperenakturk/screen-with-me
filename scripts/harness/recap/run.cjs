// Card RC2: ✨ only after 2 h together (Test Lab `recap.button`), one press, once per session, a quiet start; each fact
// on a marquee sign with chasing bulbs (still with "reduce motion", checked at the end).
// Card RC1: the session recap for everyone. The host shows it (Test Lab `recap.show`: the lab server skips the 30 min
// together): after a 3-2-1 both people see the same scene in the video's place, inside the player box, the player
// hidden (never covered), nothing scrolling; only the host has "▶ Back to the video"; "✕ Close for me" closes it for
// one person only; the host's "Back to the video" ends it for everyone; a second show in the session is refused. With
// a Short playing the room leaves the Shorts view for the show and comes back after. Test Lab `recap.state` reports it.
//
//   wrangler dev with the lab flag (CI), then: NODE_PATH=$(npm root -g) node scripts/harness/recap/run.cjs [site]
const { viaYouTube } = require('../via-youtube.cjs');
const { chromium, devices } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};
const lab = async (page, id) => (await page.evaluate(async (c) => (await window.__swmLab.run(c)).text, id)).replace(/^▶ /, '');
const state = async (page) => JSON.parse(await lab(page, 'recap.state'));

async function join(browser, options, room, name) {
  const ctx = await browser.newContext(options);
  await viaYouTube(ctx);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    try {
      localStorage.setItem('tipsSeen', '1');
    } catch {}
  });
  await page.goto(`${SITE}/r/${room}?debug=1`);
  await page.fill('#name', name);
  await page.click('#name-form button.primary');
  await page.waitForSelector('#chat-input', { state: 'attached' });
  return { ctx, page, errors };
}

const stageBox = (page) =>
  page.evaluate(() => {
    const stage = document.querySelector('.rc-stage');
    const wrap = document.querySelector('.player-wrap');
    if (!stage || !wrap) return null;
    const s = stage.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    const frame = wrap.querySelector('iframe, video');
    return {
      inside: s.left >= w.left - 1 && s.right <= w.right + 1 && s.top >= w.top - 1 && s.bottom <= w.bottom + 1 && s.width > 100,
      playerHidden: !frame || getComputedStyle(frame).visibility === 'hidden' || getComputedStyle(frame.parentElement).visibility === 'hidden',
      scrolls: [...stage.querySelectorAll('*')].some((n) => n.scrollHeight > n.clientHeight + 2 && getComputedStyle(n).overflowY !== 'visible' && getComputedStyle(n).overflowY !== 'hidden'),
      back: !!stage.querySelector('.rc-back:not([hidden])'),
    };
  });

(async () => {
  const browser = await chromium.launch();
  for (const [label, link, guestOptions] of [
    ['video', 'https://www.youtube.com/watch?v=M7lc1UVf-VE', { viewport: { width: 1366, height: 768 } }],
    ['Short', 'https://www.youtube.com/shorts/aqz-KE-bpKQ', { ...devices['iPhone 13'] }],
  ]) {
    const room = `rc${Math.random().toString(36).slice(2, 8)}`;
    const alex = await join(browser, { viewport: { width: 1366, height: 768 } }, room, 'Alex');
    const sam = await join(browser, guestOptions, room, 'Sam');
    const a = alex.page;
    const s = sam.page;
    if (!(await a.isVisible('#media-input'))) await a.click('.tab[data-tab="queue"]').catch(() => {});
    await a.fill('#media-input', link);
    await a.click('#media-form button[value=load]');
    await s.waitForFunction(() => !document.querySelector('#empty') || document.querySelector('#empty').hidden || getComputedStyle(document.querySelector('#empty')).display === 'none', null, { timeout: 15000 }).catch(() => {});
    await a.waitForTimeout(1500);
    const short = label === 'Short';
    if (short) check(await a.evaluate(() => document.documentElement.classList.contains('shorts-view')), `${label}: the Short opens the Shorts view`);
    check((await state(a)).ready === false && (await state(a)).button === false, `${label}: ✨ is not there before 2 h together (RC2)`);
    // Card RC2: Test Lab `recap.button` counts 2 h together; ✨ shows for the host and the guest, nothing offers itself.
    await lab(a, 'recap.button');
    await s.waitForFunction(() => [...document.querySelectorAll('#dock-recap, #shorts-recap')].some((b) => !b.hidden), null, { timeout: 8000 }).catch(() => {});
    const [ra, rs] = [await state(a), await state(s)];
    check(ra.ready && ra.button && rs.ready && rs.button, `${label}: after 2 h together ✨ shows for the host and the guest`, [ra.button, rs.button]);
    const press = (page) => page.evaluate(() => [...document.querySelectorAll('#dock-recap, #shorts-recap')].find((b) => !b.hidden && b.getBoundingClientRect().width > 0)?.click() ?? [...document.querySelectorAll('#dock-recap, #shorts-recap')].find((b) => !b.hidden)?.click());
    check(!(await a.isVisible('.rc-nudge')) && !(await s.isVisible('.rc-nudge')), `${label}: no recap nudge appears by itself`);
    // Owner's pick A: anyone's one press starts it for the whole room.
    await press(s);
    await s.waitForSelector('.rc-stage', { timeout: 10000 });
    await a.waitForSelector('.rc-stage', { timeout: 10000 });
    check(true, `${label}: one press of the guest's ✨ starts the show for both`);
    const level = (await state(a)).stage?.level;
    check(typeof level === 'number' && level > 0 && level <= 0.025, `${label}: the music is quiet (gain ≤ 0.025; RC1 played at 3.5)`, level);
    if (short) check(await a.evaluate(() => !document.documentElement.classList.contains('shorts-view')), `${label}: the show switches to the normal view`);
    await a.waitForTimeout(3600);
    const sa = await state(a);
    const ss = await state(s);
    check(sa.stage && ss.stage && sa.stage.scene >= 0 && Math.abs(sa.stage.scene - ss.stage.scene) <= 1 && sa.stage.scenes === ss.stage.scenes, `${label}: both see the same scene after the 3-2-1`, [sa.stage, ss.stage]);
    check(sa.stage?.kind === 'time' || sa.stage?.scene > 0, `${label}: the show opens on the time scene`, sa.stage);
    // RC2 (owner's pick C): the fact is on a marquee sign with chasing bulbs; the first one reads "Now showing".
    const sign = sa.stage?.sign;
    check(sign && sign.bulbs >= 40 && sign.chasing && sign.lines.length === 3, `${label}: the scene is a marquee sign with chasing bulbs and three lines`, sign);
    if (sa.stage?.kind === 'time') check(/now showing/i.test(sign?.lines[0] ?? '') && /movie night/i.test(sign?.lines[1] ?? ''), `${label}: the first sign reads "Now showing: our movie night"`, sign?.lines);
    for (const [who, page] of [['host', a], ['guest', s]]) {
      const box = await stageBox(page);
      check(box?.inside && box.playerHidden && !box.scrolls, `${label}: ${who}: the stage is in the video's place, the player hidden (not covered), nothing scrolls`, box);
      check(box?.back === (who === 'host'), `${label}: ${who}: "Back to the video" only for the host`, box?.back);
    }
    await s.click('.rc-close');
    await s.waitForTimeout(400);
    check(!(await s.isVisible('.rc-stage')) && (await a.isVisible('.rc-stage')), `${label}: "Close for me" closes it for that person only`);
    await lab(a, 'recap.show');
    await a.waitForSelector('.error:not([hidden]), .toast, .hint-bubble', { timeout: 4000 }).catch(() => {});
    await a.click('.rc-back');
    await a.waitForTimeout(800);
    check(!(await a.isVisible('.rc-stage')), `${label}: "Back to the video" ends it`);
    check((await state(a)).status?.shown === true && (await state(s)).status?.shown === true, `${label}: the session's recap is marked shown for everyone`);
    check((await state(a)).button === false && (await state(s)).button === false, `${label}: once shown, ✨ is gone for the session (once per session)`);
    if (short) {
      await a.waitForFunction(() => document.documentElement.classList.contains('shorts-view'), null, { timeout: 5000 }).catch(() => {});
      check(await a.evaluate(() => document.documentElement.classList.contains('shorts-view')), `${label}: the Shorts view comes back after the show`);
    }
    check(alex.errors.length === 0 && sam.errors.length === 0, `${label}: no page errors`, [...alex.errors, ...sam.errors]);
    await alex.ctx.close();
    await sam.ctx.close();
  }
  // RC2: with "reduce motion" the bulbs stay lit and still (an earlier recap, alone, needs no second person).
  {
    const room = `rc${Math.random().toString(36).slice(2, 8)}`;
    const calm = await join(browser, { viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' }, room, 'Alex');
    const quiet = await join(browser, { viewport: { width: 1366, height: 768 } }, room, 'Sam');
    await calm.page.fill('#media-input', 'https://www.youtube.com/watch?v=M7lc1UVf-VE').catch(() => {});
    await calm.page.click('#media-form button[value=load]').catch(() => {});
    await calm.page.waitForTimeout(1200);
    await lab(calm.page, 'recap.show');
    await calm.page.waitForSelector('.rc-stage', { timeout: 10000 }).catch(() => {});
    await calm.page.waitForTimeout(3800);
    const sign = (await state(calm.page)).stage?.sign;
    check(sign && sign.bulbs > 0 && !sign.chasing, 'reduce motion: the sign\'s bulbs stay still', sign);
    await calm.ctx.close();
    await quiet.ctx.close();
  }
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
