// Moving my things to another device: the old device waits with a 6-digit code, the new one types it, the old one is
// asked and says yes, the text arrives once and both close; a wrong code, a refusal, a second sender and a second
// receiver are turned away, a sender that leaves takes the code with it.
const base = process.argv[2] ?? 'ws://localhost:8787';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
function socket(path) {
  const ws = new WebSocket(`${base}${path}`);
  const inbox = [];
  let closed = null;
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('close', (e) => (closed = e.code));
  const wait = async (pred, label, ms = 10000) => {
    for (let i = 0; i < ms / 100; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await sleep(100);
    }
    throw new Error('timeout ' + label);
  };
  const waitClose = async (label, ms = 10000) => {
    for (let i = 0; i < ms / 100; i++) {
      if (closed !== null) return closed;
      await sleep(100);
    }
    throw new Error('timeout close ' + label);
  };
  const opened = new Promise((r) => ws.addEventListener('open', r));
  return { ws, wait, waitClose, opened, send: async (m) => (await opened, ws.send(JSON.stringify(m))) };
}
const code = () => String(Math.floor(100000 + Math.random() * 900000));
const blob = JSON.stringify({ v: 1, at: 1, items: { name: 'Alex', snackBar: '{"v":1,"coins":5}' } });

// A code nobody shows.
const lost = socket(`/api/move/${code()}/ws?role=get`);
await lost.wait((m) => m.t === 'none', 'none');
ok((await lost.waitClose('none')) === 4404, 'A code no device shows: "none", closed');

// A bad code never reaches an object.
const bad = await fetch(base.replace(/^ws/, 'http') + '/api/move/12ab/ws');
ok(bad.status === 400, 'A malformed code is refused (400)');

// The whole way: wait, ask, send, receive once.
const c1 = code();
const sender = socket(`/api/move/${c1}/ws?role=send`);
ok((await sender.wait((m) => m.t === 'waiting', 'waiting')).ttl === 600000, 'The sender waits (10 min)');
const twin = socket(`/api/move/${c1}/ws?role=send`);
await twin.wait((m) => m.t === 'taken', 'taken');
ok((await twin.waitClose('taken')) === 4009, 'A second sender with the same code is turned away');
const receiver = socket(`/api/move/${c1}/ws?role=get`);
await receiver.wait((m) => m.t === 'waiting', 'receiver waiting');
await sender.wait((m) => m.t === 'asking', 'asking');
ok(true, 'The sender is asked before anything moves');
const second = socket(`/api/move/${c1}/ws?role=get`);
await second.wait((m) => m.t === 'busy', 'busy');
ok(true, 'A second receiver on the same code is turned away');
await sender.send({ t: 'send', data: blob });
const got = await receiver.wait((m) => m.t === 'blob', 'blob');
ok(got.data === blob, 'The receiver gets the text as it was sent');
await sender.wait((m) => m.t === 'sent', 'sent');
// The server closes both, but live the close of the receiver (closed from the sender's message) can arrive ~10 s after
// its last message (the 0.9.96.4 deploy); like the page, the receiver ends its side once it has the text.
receiver.ws.close();
ok((await sender.waitClose('sender')) === 1000, 'Both close: the code is used up');
const after = socket(`/api/move/${c1}/ws?role=get`);
await after.wait((m) => m.t === 'none', 'none after');
ok(true, 'The used code finds nothing any more');

// The sender says no.
const c2 = code();
const s2 = socket(`/api/move/${c2}/ws?role=send`);
await s2.wait((m) => m.t === 'waiting', 'waiting 2');
const r2 = socket(`/api/move/${c2}/ws?role=get`);
await s2.wait((m) => m.t === 'asking', 'asking 2');
await s2.send({ t: 'refuse' });
await r2.wait((m) => m.t === 'refused', 'refused');
ok(true, 'A refusal reaches the receiver');
r2.ws.close();

// The sender leaves while a receiver waits.
const c3 = code();
const s3 = socket(`/api/move/${c3}/ws?role=send`);
await s3.wait((m) => m.t === 'waiting', 'waiting 3');
const r3 = socket(`/api/move/${c3}/ws?role=get`);
await s3.wait((m) => m.t === 'asking', 'asking 3');
s3.ws.close();
await r3.wait((m) => m.t === 'none', 'none 3');
ok(true, 'A sender that leaves takes the code with it');

// The receiver cannot send anything to the sender.
const c4 = code();
const s4 = socket(`/api/move/${c4}/ws?role=send`);
await s4.wait((m) => m.t === 'waiting', 'waiting 4');
const r4 = socket(`/api/move/${c4}/ws?role=get`);
await s4.wait((m) => m.t === 'asking', 'asking 4');
await r4.send({ t: 'send', data: blob });
await sleep(500);
await s4.send({ t: 'refuse' });
const r4msg = await r4.wait((m) => m.t === 'refused' || m.t === 'blob', 'r4');
ok(r4msg.t === 'refused', 'Only the sender can send');
s4.ws.close();

console.log('\n✓ Move to another device works');
process.exit(0);
