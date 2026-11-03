// "Phone hotspot" in a real Chromium (0.9.92, docs/internal/hotspot-connection.md): a small proxy in front of the
// local server lets plain HTTP through but swallows every WebSocket upgrade (the connection neither opens nor
// closes, exactly what the owner's hotspot did). Bob opens the room through the proxy, Alice directly.
//
// Checks: Bob gets into the room over the HTTP fallback (no WebSocket), chat both ways, the sync test plays for her in
// step, a reload goes straight to the fallback, a network drop is survived, and once WebSockets work again she
// switches back to a WebSocket by herself (upgrade probe), keeping the same member id.
//
//   npm run build && (cd apps/server && npx wrangler dev --port 8787)   (other terminal; serves the built site)
//   node scripts/harness/hotspot/run.mjs [http://localhost:8787]
import { createRequire } from 'node:module';
import http from 'node:http';
import net from 'node:net';

const { chromium } = createRequire(import.meta.url)('playwright');

const TARGET = new URL(process.argv[2] ?? 'http://localhost:8787');
const PROXY_PORT = Number(process.env.PROXY_PORT ?? 8791);
const PROXY = `http://localhost:${PROXY_PORT}`;
const room = 'hot' + Math.random().toString(36).slice(2, 8);

// ── The "hotspot": `pass` forwards WebSockets, `blackhole` swallows them, `down` drops everything for a while. ──
let mode = 'blackhole';
const swallowed = new Set();
let upgrades = 0;
/** Room WebSockets swallowed (not the small upgrade probes). */
let roomUpgrades = 0;
const server = http.createServer((req, res) => {
  if (mode === 'down') {
    req.socket.destroy();
    return;
  }
  if (process.env.DEBUG && /http=(open|close)/.test(req.url ?? '')) console.log(`  [proxy] ${req.method} ${req.url?.replace(/sid=(\w{6})\w+/, 'sid=$1…')}`);
  const upstream = http.request({ host: TARGET.hostname, port: TARGET.port, method: req.method, path: req.url, headers: req.headers }, (answer) => {
    res.writeHead(answer.statusCode ?? 502, answer.headers);
    answer.pipe(res);
  });
  upstream.on('error', () => res.destroy());
  req.pipe(upstream);
});
server.on('upgrade', (req, socket, head) => {
  upgrades++;
  if (process.env.DEBUG) console.log(`  [proxy] upgrade ${req.url} (${mode})`);
  if (mode !== 'pass') {
    if (!req.url.startsWith('/api/probe')) roomUpgrades++;
    // Neither opens nor closes.
    swallowed.add(socket);
    socket.on('error', () => {});
    return;
  }
  const upstream = net.connect(Number(TARGET.port), TARGET.hostname, () => {
    upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n')}\r\n\r\n`);
    if (head.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
  socket.on('error', () => upstream.destroy());
});
const open = new Set();
server.on('connection', (socket) => {
  open.add(socket);
  socket.on('close', () => open.delete(socket));
});
await new Promise((resolve) => server.listen(PROXY_PORT, resolve));

const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
let failed = 0;
const check = (cond, label, detail = '') => {
  console.log(`${cond ? 'ok  ' : 'FAIL'} ${label}${!cond && detail ? ` → ${detail}` : ''}`);
  if (!cond) failed++;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms = 15000) => {
  for (let i = 0; i < ms / 200; i++) {
    const v = await fn().catch(() => null);
    if (v) return v;
    await sleep(200);
  }
  return null;
};

async function person(site, name, avatar, probeMs) {
  const context = await browser.newContext();
  if (probeMs) await context.addInitScript((ms) => (window.__swmProbeMs = ms), probeMs);
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log(`[${name}] pageerror`, e.message));
  if (process.env.DEBUG) page.on('console', (m) => console.log(`  [${name}] ${m.text()}`));
  await page.goto(`${site}/`);
  await page.evaluate(([n, a]) => {
    localStorage.setItem('name', n);
    localStorage.setItem('avatar', a);
    localStorage.setItem('lang', 'en');
  }, [name, avatar]);
  await page.goto(`${site}/r/${room}#back`);
  await page.waitForSelector('#people-count', { state: 'attached' });
  return page;
}
const transport = (page) => page.evaluate(() => document.documentElement.dataset.swmTransport ?? null);
const people = (page) => page.textContent('#people-count');
const say = async (page, text) => {
  await page.fill('#chat-input', text);
  await page.press('#chat-input', 'Enter');
};
const hasChat = (page, text) => page.evaluate((t) => [...document.querySelectorAll('#chat-list li')].some((li) => li.textContent?.includes(t)), text);

const alice = await person(TARGET.origin, 'Alice', 'wizard');
check((await until(() => transport(alice))) === 'ws', 'Alice (normal network) uses a WebSocket');

const started = Date.now();
// The upgrade probe would normally wait a minute; the test shortens it.
const bob = await person(PROXY, 'Bob', 'elf', 4000);
const joinedIn = await until(async () => (await people(alice)) === '2' && (await transport(bob)) === 'http', 20000);
check(!!joinedIn, `Bob (WebSockets swallowed) is in the room over the HTTP fallback (${((Date.now() - started) / 1000).toFixed(1)} s)`);
check(roomUpgrades === 1, `her WebSocket really hung (${roomUpgrades} swallowed)`);
check(!(await bob.isVisible('.net-hint')), 'no "cannot connect" warning for her');

await say(bob, 'hi, I am on a hotspot');
check(!!(await until(() => hasChat(alice, 'hi, I am on a hotspot'))), 'Chat HTTP → WebSocket');
await say(alice, 'welcome');
check(!!(await until(() => hasChat(bob, 'welcome'))), 'Chat WebSocket → HTTP');

// Sync: Alice starts the sync test, Bob's counter runs in step.
// The sync test lives in ⋯ More since card 6 (hidden button): press it directly.
await alice.evaluate(() => document.getElementById('sync-test').click());
const badge = await until(async () => {
  const text = await bob.textContent('#sync-badge');
  const visible = await bob.isVisible('#sync-badge');
  return visible && text && !(await bob.evaluate(() => document.getElementById('sync-badge')?.classList.contains('bad'))) ? text : null;
}, 20000);
check(!!badge, `the sync test plays in step for Bob: "${badge}"`);

// A reload goes straight to the fallback (the tab remembers it) instead of waiting for the WebSocket again.
const before = roomUpgrades;
const reloadAt = Date.now();
if (process.env.DEBUG)
  await bob.evaluate(() => {
    const log = (x) => localStorage.setItem('dbg', (localStorage.getItem('dbg') ?? '') + ' | ' + x);
    const beacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (u, d) => {
      const r = beacon(u, d);
      log('beacon ' + r + ' ' + u.slice(-50));
      return r;
    };
    addEventListener('pagehide', () => log('pagehide'), { capture: true });
    addEventListener('error', (e) => log('error ' + e.message));
  });
await bob.reload();
if (process.env.DEBUG) console.log('  dbg:', await bob.evaluate(() => localStorage.getItem('dbg')));
await bob.waitForSelector('#people-count', { state: 'attached' });
const back = await until(async () => {
  if (process.env.DEBUG) console.log(`  [t+${Date.now() - reloadAt}] online=${(await (await fetch(`${TARGET.origin}/api/rooms/${room}/info`)).json()).online} ${await transport(bob)} ${await people(bob)} ${await bob.evaluate(() => document.querySelector('.room-title-dot')?.getAttribute('data-status'))}`);
  return (await transport(bob)) === 'http' && (await people(bob)) === '2';
});
const reloadMs = Date.now() - reloadAt;
check(!!back && reloadMs < 5000, `after a reload she is back in ${(reloadMs / 1000).toFixed(1)} s, over HTTP right away`);
check(roomUpgrades === before, 'no new WebSocket attempt after the reload (only the small probe later)');

// The network drops for a while (poll + sends fail), then comes back: she reconnects by herself.
mode = 'down';
for (const socket of open) socket.destroy();
await sleep(6000);
mode = 'blackhole';
const status = (page) => page.evaluate(() => document.querySelector('.room-title-dot')?.getAttribute('data-status'));
check(!!(await until(async () => (await status(bob)) !== 'open', 10000)), 'she notices the drop');
const recovered = await until(async () => (await status(bob)) === 'open' && (await people(alice)) === '2' && (await transport(bob)) === 'http', 40000);
check(!!recovered, 'after a 6 s network drop she is back in the room');
await say(bob, 'back again');
check(!!(await until(() => hasChat(alice, 'back again'))), 'chat works again after the drop');

// The connection test page on the "hotspot": the WebSockets fail, the backup connection works, the verdict says so.
const diag = await (await browser.newContext()).newPage();
await diag.goto(`${PROXY}/`);
await diag.evaluate(() => localStorage.setItem('lang', 'en'));
await diag.goto(`${PROXY}/baglanti`);
const verdict = await until(async () => {
  const text = await diag.textContent('.diag-verdict');
  return text && text.length > 5 ? text : null;
}, 40000);
const rowsOk = await diag.evaluate(() => [...document.querySelectorAll('.diag-row')].map((li) => li.querySelector('.diag-icon')?.textContent).join(''));
check(!!verdict && verdict.includes('backup'), `/baglanti: "${verdict}"`);
check(rowsOk === '✅✅✅❌❌❌❌✅✅✅', `/baglanti rows: ${rowsOk} (page, request, big answer ok; probe + room WebSocket fail; fallback ok)`);
await diag.close();

// WebSockets start working: the probe notices and she moves to a WebSocket by herself, still one person in the room.
mode = 'pass';
const upgraded = await until(async () => (await transport(bob)) === 'ws', 40000);
check(!!upgraded, 'once WebSockets work again she switches to a WebSocket by herself');
await sleep(1500);
check((await people(alice)) === '2', 'still two people in the room after the switch');
await say(alice, 'now over a websocket');
check(!!(await until(() => hasChat(bob, 'now over a websocket'))), 'chat over the new WebSocket');

await browser.close();
for (const socket of swallowed) socket.destroy();
server.close();
console.log(failed ? `\n✗ ${failed} checks failed` : '\n✓ Hotspot fallback works');
process.exit(failed ? 1 : 0);
