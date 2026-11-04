// Card R23 (owner, 4 Nov 2026, his screenshot of the Together card): while someone streams, the stream's line and
// buttons (status, Stop, quality, Watch, viewers) sit in the empty space right of the faces, not in a full-width row
// under the voice buttons that pushed the chat down. Before a stream the card looks as it did. Checks, on a computer
// (1366 × 768, 1920 × 1080), for the streamer (Alex: Stop, quality) and a viewer (Sam: Watch): the stream part is right
// of the faces and inside the card; the chat panel keeps the height it had before the stream (the viewer ± 4 px, the
// streamer at most the quality's one line); nothing is cut.
//
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)
//   NODE_PATH=$(npm root -g) node scripts/harness/live-card/run.cjs [site] [out-folder]
const { chromium } = require('playwright');

const SITE = process.argv[2] || 'http://localhost:8787';
const OUT = process.argv[3] || require('os').tmpdir();
let failed = 0;
const check = (ok, label, detail) => {
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : ` → ${JSON.stringify(detail)}`}`);
};

(async () => {
  const browser = await chromium.launch({
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--auto-select-desktop-capture-source=Entire screen', '--autoplay-policy=no-user-gesture-required'],
  });
  for (const [w, h] of [[1366, 768], [1920, 1080]]) {
    const room = `live${Math.random().toString(36).slice(2, 7)}`;
    const enter = async (name) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      await ctx.addInitScript(() => {
        localStorage.setItem('tipsSeen', '1');
        localStorage.setItem('lang', 'en');
        localStorage.setItem('opt:autoInvite', '0');
        localStorage.setItem('opt:ipNotice:stream', '1');
        localStorage.setItem('opt:ipNotice:watch', '1');
      });
      const page = await ctx.newPage();
      await page.goto(`${SITE}/r/${room}`);
      await page.waitForSelector('#join-avatar img');
      await page.fill('#name', name);
      await page.click('#name-form button.primary');
      await page.waitForSelector('.room');
      await page.waitForTimeout(1500);
      return page;
    };
    const alex = await enter('Alex');
    const sam = await enter('Sam');
    await sam.waitForTimeout(800);
    const measure = (page) =>
      page.evaluate(() => {
        const r = (e) => e && e.getBoundingClientRect();
        const card = r(document.querySelector('#together'));
        const faces = r(document.querySelector('#voice-people'));
        const live = document.querySelector('#live-card');
        const lr = live && !live.hidden ? r(live) : null;
        const chat = r(document.querySelector('.tabs-card'));
        const clipped = live && !live.hidden ? [...live.querySelectorAll('button:not([hidden]), select, .live-status, .voice-limit')].filter((e) => e.offsetParent && (e.scrollWidth > e.clientWidth + 1 || r(e).right > card.right + 1 || r(e).left < card.left - 1)).map((e) => e.id || e.className) : [];
        return {
          card: card && [Math.round(card.top), Math.round(card.bottom)],
          faces: faces && [Math.round(faces.left), Math.round(faces.top), Math.round(faces.right), Math.round(faces.bottom)],
          live: lr && [Math.round(lr.left), Math.round(lr.top), Math.round(lr.right), Math.round(lr.bottom)],
          active: !!live?.classList.contains('active'),
          chatH: Math.round(chat.height),
          clipped,
        };
      });
    const before = { alex: await measure(alex), sam: await measure(sam) };
    // Alex shares the screen (the IP notice was answered "don't show again" above).
    await alex.click('#live-share');
    await alex.click('#live-screen');
    await alex.waitForFunction(() => document.querySelector('#live-card')?.classList.contains('active'), null, { timeout: 10000 }).catch(() => {});
    await sam.waitForFunction(() => document.querySelector('#live-card')?.classList.contains('active'), null, { timeout: 10000 }).catch(() => {});
    await alex.waitForTimeout(800);
    for (const [who, page] of [['streamer', alex], ['viewer', sam]]) {
      const m = await measure(page);
      const b = before[who === 'streamer' ? 'alex' : 'sam'];
      const where = `${w}×${h} ${who}`;
      check(m.active, `${where}: the stream shows in the Together card`, m.active);
      check(!!m.live && !!m.faces && m.live[0] >= m.faces[2] - 1 && m.live[1] < m.faces[3] && m.live[3] > m.faces[1], `${where}: the stream part is right of the faces, in their row`, { live: m.live, faces: m.faces });
      // The viewer's part is two lines (status + viewers, Watch) and fits the faces' row; the streamer of a screen has a
      // third line for the quality, at most one line (30 px) off the chat (0.9.97.34: 96–131 px).
      const room = who === 'streamer' ? 30 : 4;
      check(m.chatH >= b.chatH - room, `${where}: the chat keeps its height (${b.chatH} px before the stream, ≤ ${room} px less)`, m.chatH);
      check(m.clipped.length === 0, `${where}: nothing of the stream part is cut or outside the card`, m.clipped);
      await page.locator('#together').screenshot({ path: `${OUT}/live-card-${w}-${who}.png` });
    }
    await alex.context().close();
    await sam.context().close();
  }
  await browser.close();
  console.log(failed ? `\n✗ ${failed} check(s) failed` : '\n✓ The stream fits beside the faces');
  process.exit(failed ? 1 : 0);
})();
