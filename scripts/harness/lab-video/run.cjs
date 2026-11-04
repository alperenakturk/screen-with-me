// 🐞 Test Lab, 🎬 Video & network (card DL, DL4): accidents on purpose, on this tab's own side. Each command does what
// it says and the room heals: a dropped connection comes back (same member id) after its down time, "the server
// restarted" reconnects at once with the same id, a slow network delays messages, the HTTP fallback can be forced and
// undone, a drift is corrected, a stall makes the room wait, and turning the lab off leaves nothing behind.
//
//   built site on wrangler dev (CI):  node scripts/harness/lab-video/run.cjs http://localhost:8787
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
  // My own room connections only (the fake friends' sockets go to the same address): a socket is mine once its hello
  // carries my name.
  const sent = [];
  const sockets = [];
  page.on('websocket', (ws) => {
    if (!/\/api\/rooms\//.test(ws.url())) return;
    let mine = null;
    const early = [];
    ws.on('framesent', (f) => {
      const frame = { at: Date.now(), data: String(f.payload) };
      if (mine === null && /"t":"hello"/.test(frame.data)) {
        mine = /"name":"Robin"/.test(frame.data);
        if (mine) {
          sockets.push(ws);
          sent.push(...early);
        }
      }
      if (mine) sent.push(frame);
      else if (mine === null) early.push(frame);
    });
  });
  const room = `lv${Math.random().toString(36).slice(2, 7)}`;
  await page.goto(`${SITE}/?debug=1`);
  await page.waitForSelector('.debug-fab');
  await page.goto(`${SITE}/r/${room}`);
  await page.fill('#name', 'Robin');
  await page.click('#name-form button.primary');
  await page.waitForSelector('.room');
  await page.waitForFunction(() => !!document.documentElement.dataset.swmTransport, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  const run = (id, arg) => page.evaluate(([i, a]) => window.__swmLab.run(i, a), [id, arg]);
  const transport = () => page.evaluate(() => document.documentElement.dataset.swmTransport);
  const dotStatus = () => page.evaluate(() => document.querySelector('.room-title-dot')?.dataset.status ?? null);
  const people = () => page.evaluate(() => {
    const n = /(\d+)/.exec(document.querySelector('.room-title-count')?.textContent ?? '');
    return n ? Number(n[1]) : 1;
  });
  const statusLine = (label) => page.evaluate((l) => window.__swmLab.status?.().find(([k]) => k === l)?.[1] ?? null, label);

  // ---- The 🎬 tab lists its commands; without a video the video ones refuse ----
  await page.click('.debug-fab');
  await page.click('.lab-tab[data-tab="video"]');
  const listed = await until(() => page.evaluate(() => [...document.querySelectorAll('.lab-view .lab-commands li')].map((li) => li.textContent).join(' | ') || null));
  check(!!listed && ['drop my connection', 'server restarted', 'slow', 'HTTP fallback', 'drift', 'stall'].every((w) => listed.includes(w)), '🎬 lists drop / restart / slow / fallback / drift / stall', String(listed).slice(0, 200));
  const noVideo = await run('video.drift');
  check(noVideo.dir === 'error' && /no video/.test(noVideo.text), 'drift without a video is refused, not run', JSON.stringify(noVideo));

  // ---- A friend and the sync test, so there is a room to wait for me ----
  await run('friends.add');
  await until(async () => (await people()) === 2);
  await page.evaluate(() => document.getElementById('sync-test')?.click());
  check(!!(await until(() => page.evaluate(() => !!document.querySelector('.room.has-item')))), 'the sync test plays (2 people)');
  await page.waitForTimeout(1500);

  // The sync test is 12 s long (an ended video never counts as stuck): stall and drift first.
  // ---- Stall: the room waits for me ----
  const stallAt = Date.now();
  await run('video.stall', '4');
  const notReady = await until(async () => sent.some((s) => s.at >= stallAt && /"t":"ready"/.test(s.data) && /"ready":false/.test(s.data)), 5000);
  check(!!notReady, 'a stall says "not ready" to the room');
  const waiting = await until(() => page.evaluate(() => { const b = document.getElementById('waiting-banner'); return b && !b.hidden ? b.textContent : null; }), 5000);
  check(!!waiting, 'the room waits (the waiting note shows)', String(waiting));
  const ready = await until(async () => sent.some((s) => s.at >= stallAt && /"t":"ready"/.test(s.data) && /"ready":true/.test(s.data)), 10000);
  check(!!ready, 'after its time "ready" again');

  // ---- Drift: corrected ----
  const jumpsBefore = (await page.evaluate(() => window.__swmLab.sync?.() ?? { jumps: 0 })).jumps;
  const drifted = await run('video.drift', '3');
  check(drifted.dir !== 'error', 'drift +3 s runs with a video', JSON.stringify(drifted));
  await page.waitForTimeout(400);
  const fixed = await until(async () => {
    const r = await page.evaluate(() => window.__swmLab.sync?.() ?? null);
    return r && r.jumps > jumpsBefore && r.drift !== null && Math.abs(r.drift) < 0.6 ? r : null;
  }, 8000);
  check(fixed !== null, `the drift correction jumps back in step (${fixed ? `${fixed.jumps - jumpsBefore} jump, ${fixed.drift.toFixed(2)} s` : 'no jump'})`);
  check(!sent.some((s) => /"t":"seek"/.test(s.data)), 'a drift is never sent to the room as my seek');

  // ---- Drop: down for its time, back with the same member id ----
  const socketsBefore = sockets.length;
  const dropAt = Date.now();
  await run('net.drop', '3');
  const reconnecting = await until(async () => ((await dotStatus()) === 'reconnecting' ? 'reconnecting' : null), 2000);
  check(!!reconnecting, 'the drop shows as reconnecting', String(await dotStatus()));
  const back = await until(async () => sockets.length > socketsBefore && sockets[sockets.length - 1] && !sockets[sockets.length - 1].isClosed(), 15000);
  const downFor = Date.now() - dropAt;
  check(!!back && downFor >= 2900, `the connection comes back after its down time (${(downFor / 1000).toFixed(1)} s)`);
  const hello = await until(async () => sent.filter((s) => s.at >= dropAt).map((s) => s.data).find((d) => /"t":"hello"/.test(d)) ?? null);
  check(!!hello && /"prev":"/.test(hello), 'it says hello with my old member id (prev)', String(hello).slice(0, 120));
  check(!!(await until(async () => (await people()) === 2)), 'still two people after the drop');

  // ---- "The server restarted": reconnect at once, same id ----
  const restartAt = Date.now();
  const before2 = sockets.length;
  await run('net.restart');
  const again = await until(async () => sockets.length > before2, 5000);
  check(!!again && Date.now() - restartAt < 5000, 'restart reconnects at once');
  const hello2 = await until(async () => sent.filter((s) => s.at >= restartAt).map((s) => s.data).find((d) => /"t":"hello"/.test(d)) ?? null);
  check(!!hello2 && /"prev":"/.test(hello2), 'with my member id (prev)');

  // ---- Slow network: a ping waits ----
  await until(async () => (await transport()) === 'ws');
  await run('net.slow', '700');
  check(String(await statusLine('Lab latency')).startsWith('700'), '📊 shows the lab latency', String(await statusLine('Lab latency')));
  const pingAt = Date.now();
  await page.evaluate(() => document.getElementById('chat-input') && (document.getElementById('chat-input').value = 'slow hello'));
  await page.press('#chat-input', 'Enter');
  const sentAt = await until(async () => sent.find((s) => s.at >= pingAt && /slow hello/.test(s.data))?.at ?? null, 5000);
  check(!!sentAt && sentAt - pingAt >= 600, `a message leaves ${sentAt ? sentAt - pingAt : '?'} ms later (≥ 600)`);
  await run('net.normal');
  check(!(await statusLine('Lab latency')), 'back to normal: no lab latency');

  // ---- Force the HTTP fallback, then back ----
  await run('net.http');
  check(!!(await until(async () => (await transport()) === 'http', 15000)), 'forced: the room reconnects over the HTTP fallback');
  check(!!(await until(async () => (await people()) === 2)), 'still in the room over the fallback');
  await run('net.normal');
  check(!!(await until(async () => (await transport()) === 'ws', 15000)), '"back to normal" goes back to a WebSocket');

  // ---- The ad film page is for a local server only, and refused without a room ----
  const ad = await page.evaluate(() => window.__swmLab.run('video.adFilm'));
  check(ad.dir !== 'error' || /local server/.test(ad.text), 'the ad film page command runs here or names its limit', JSON.stringify(ad));
  // Without the extension the link box asks first ("This link is a web page"), as it does for any film page.
  const asked = await until(() => page.evaluate(() => document.getElementById('ext-dialog')?.open === true), 3000);
  check(!!asked, 'without the extension it asks first, like the link box');
  if (asked) {
    await page.click('#ext-cancel');
    await until(() => page.evaluate(() => document.getElementById('ext-dialog')?.open === false), 3000);
  }

  // ---- Off: nothing stays ----
  await run('net.slow', '900');
  const offRun = await run('lab.off');
  check(offRun.dir !== 'error', 'the lab turns off', JSON.stringify(offRun));
  await page.waitForTimeout(300);
  const offAt = Date.now();
  await page.evaluate(() => (document.getElementById('chat-input').value = 'after the lab'));
  await page.press('#chat-input', 'Enter');
  const leftAt = await until(async () => sent.find((s) => s.at >= offAt && /after the lab/.test(s.data))?.at ?? null, 3000);
  check(!!leftAt && leftAt - offAt < 400, `with the lab off messages leave at once (${leftAt ? leftAt - offAt : '?'} ms)`);
  check(!(await page.evaluate(() => !!window.__swmLab)), 'the lab object is gone');

  await browser.close();
  console.log(fails ? `\n✗ ${fails} check(s) failed` : '\n✓ Test Lab video & network works');
  process.exit(fails ? 1 : 0);
})();
