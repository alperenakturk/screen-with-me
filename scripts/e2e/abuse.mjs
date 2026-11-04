// Security L2 + L5: room abuse limits. L2: signals are limited per person and per pair of people, so a flood is cut
// and a reconnect (a new member id) does not refill the budget. L5: a connection that never says `hello` is closed
// after ~15 s (it used to hold a seat for 150 s and 51 of them made the room "full").
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'abuse' + Math.random().toString(36).slice(2, 8);
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function client(hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  let closed = null;
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('close', (e) => (closed = e.code));
  if (hello) ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, ...hello })));
  const wait = async (pred, label, ms = 10000) => {
    for (let t = 0; t < ms; t += 100) {
      const i = inbox.findIndex(pred);
      if (i >= 0) return inbox.splice(i, 1)[0];
      await sleep(100);
    }
    throw new Error('timeout ' + label);
  };
  return { ws, inbox, wait, closed: () => closed, send: (m) => ws.send(JSON.stringify(m)) };
}

// L5: a silent socket is closed once another connection arrives after ~15 s.
const silent = client(null);
await new Promise((r) => silent.ws.addEventListener('open', r, { once: true }));
const silentAt = Date.now();
const a = client({ name: 'Alex', cid: 'abuseAlex0001' });
const wa = await a.wait((m) => m.t === 'welcome', 'welcome a');
const b = client({ name: 'Sam', cid: 'abuseSam00001' });
const wb = await b.wait((m) => m.t === 'welcome', 'welcome b');

// L2: both in voice; Alex floods Sam with candidates.
a.send({ t: 'voice', on: true, mic: true });
b.send({ t: 'voice', on: true, mic: true });
await sleep(500);
const candidate = { candidate: { candidate: 'candidate:1 1 udp 1 192.0.2.1 9 typ host', sdpMid: '0', sdpMLineIndex: 0 } };
b.inbox.length = 0;
for (let i = 0; i < 100; i++) a.send({ t: 'signal', to: wb.you, data: candidate });
await sleep(1000);
const first = b.inbox.filter((m) => m.t === 'signal').length;
ok(first >= 20 && first <= 50, `A burst of 100 signals to one person is cut (${first} arrived, security L2)`);

// Reconnecting with the same browser does not refill the pair's budget.
a.ws.close();
await sleep(300);
const a2 = client({ name: 'Alex', cid: 'abuseAlex0001' });
await a2.wait((m) => m.t === 'welcome', 'welcome a2');
a2.send({ t: 'voice', on: true, mic: true });
await sleep(500);
b.inbox.length = 0;
for (let i = 0; i < 100; i++) a2.send({ t: 'signal', to: wb.you, data: candidate });
await sleep(1000);
const second = b.inbox.filter((m) => m.t === 'signal').length;
ok(second <= 10, `A reconnect does not refill the signal budget (${second} arrived)`);

// L5 again: a new arrival once the silent socket is over 15 s old closes it. Timed from when it opened (plus a margin), not
// from a fixed sleep: on a busy runner the steps above take a different time each run (PR #282's flake).
await sleep(Math.max(0, silentAt + 17_000 - Date.now()));
const c = client({ name: 'Kim', cid: 'abuseKim00001' });
await c.wait((m) => m.t === 'welcome', 'welcome c');
for (let t = 0; t < 100 && silent.closed() === null; t++) await sleep(100);
// A second arrival if the first one's join ran before the server's clock passed 15 s (a slow welcome).
if (silent.closed() === null) {
  const d = client({ name: 'Lee', cid: 'abuseLee00001' });
  await d.wait((m) => m.t === 'welcome', 'welcome d');
  for (let t = 0; t < 100 && silent.closed() === null; t++) await sleep(100);
}
ok(silent.closed() === 4008, `A connection that never said hello is closed after ~15 s (code ${silent.closed()}, security L5)`);
ok(!!wa, 'The room still works for people who joined');

for (const k of [a2, b, c]) k.ws.close();
console.log('\n✓ Room abuse limits hold');
setTimeout(() => process.exit(0), 100);
