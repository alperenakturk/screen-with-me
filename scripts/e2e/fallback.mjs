// HTTP fallback (0.9.92, docs/internal/hotspot-connection.md): a person whose network lets no WebSocket through joins
// the same room over plain HTTP requests (open / send / poll / close) next to a normal WebSocket user. Chat, sync,
// voice signalling, kicks, reconnect with the same member id, leaving, limits, a game and the WebSocket probe.
const base = process.argv[2] ?? 'ws://localhost:8787';
const http = base.replace(/^ws/, 'http');
const room = 'e2efb' + Math.random().toString(36).slice(2, 8);
const V = 3;
const ok = (cond, msg) => {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('ok  ' + msg);
};

/** Shared inbox helpers. */
function mailbox(name) {
  const inbox = [];
  const waiters = [];
  const push = (m) => {
    const w = waiters.find((w) => w.pred(m));
    if (w) {
      waiters.splice(waiters.indexOf(w), 1);
      w.resolve(m);
    } else inbox.push(m);
  };
  const next = (pred, label, ms = 10000) =>
    new Promise((resolve, reject) => {
      const found = inbox.find(pred);
      if (found) {
        inbox.splice(inbox.indexOf(found), 1);
        return resolve(found);
      }
      const w = { pred, resolve };
      waiters.push(w);
      setTimeout(() => {
        if (waiters.includes(w)) reject(new Error(`${name}: timeout waiting for ${label}`));
      }, ms);
    });
  return { inbox, push, next };
}

function wsClient(name, path = `/api/rooms/${room}/ws`) {
  const ws = new WebSocket(`${base}${path}`);
  const box = mailbox(name);
  ws.addEventListener('message', (e) => box.push(JSON.parse(e.data)));
  const opened = new Promise((r, j) => {
    ws.addEventListener('open', r);
    ws.addEventListener('error', j);
  });
  return { ...box, opened, send: (m) => ws.send(JSON.stringify(m)), close: () => ws.close() };
}

/** A raw HTTP fallback client (what `HttpSocket` in packages/shared/src/socket.ts does in the browser). */
async function httpClient(name, path = `/api/rooms/${room}/ws`) {
  const url = (op, sid) => `${http}${path}?http=${op}${sid ? `&sid=${sid}` : ''}`;
  const opened = await fetch(url('open'), { method: 'POST' });
  if (!opened.ok) throw new Error(`${name}: open ${opened.status}`);
  const { sid } = await opened.json();
  const box = mailbox(name);
  let closed = null;
  let polls = 0;
  (async () => {
    while (closed === null) {
      const r = await fetch(url('poll', sid)).catch(() => null);
      polls++;
      if (!r) continue;
      if (r.status === 410) {
        closed = (await r.json()).code;
        break;
      }
      if (r.status === 200) for (const line of (await r.text()).split('\n')) if (line) box.push(JSON.parse(line));
    }
  })();
  const post = (body) => fetch(url('send', sid), { method: 'POST', body: JSON.stringify(body) });
  return {
    ...box,
    sid,
    url,
    post,
    send: (m) => post([JSON.stringify(m)]),
    leave: () => fetch(url('close', sid), { method: 'POST' }),
    closed: () => closed,
    polls: () => polls,
  };
}

// 1) WebSocket person and HTTP person in one room.
const alice = wsClient('Alice');
await alice.opened;
alice.send({ t: 'hello', v: V, name: 'Alice', cid: 'cid-alice-fb-0001' });
const wa = await alice.next((m) => m.t === 'welcome', 'welcome');

const bob = await httpClient('Bob');
ok(/^[0-9a-f]{32}$/.test(bob.sid), 'Fallback session opened');
await bob.send({ t: 'hello', v: V, name: 'Bob', cid: 'cid-bob-fb-001' });
const wb = await bob.next((m) => m.t === 'welcome', 'welcome');
ok(wb.members.some((m) => m.name === 'Alice') && wb.members.some((m) => m.name === 'Bob'), 'Bob joined over HTTP and sees Alice');
const seen = await alice.next((m) => m.t === 'members' && m.members.some((x) => x.name === 'Bob'), 'members');
ok(seen.members.length === 2, 'Alice (WebSocket) sees Bob (HTTP) in the room');

// 2) Clock, chat both ways, sync both ways.
const c = Date.now();
await bob.send({ t: 'ping', c });
const pong = await bob.next((m) => m.t === 'pong', 'pong');
ok(pong.c === c && typeof pong.s === 'number', `Ping / pong over HTTP (${Date.now() - c} ms)`);

await bob.send({ t: 'chat', text: 'hello over http' });
const chat1 = await alice.next((m) => m.t === 'chat' && m.message.text === 'hello over http', 'chat from Bob');
ok(chat1.message.by.name === 'Bob', 'Chat HTTP → WebSocket');
const sentAt = Date.now();
alice.send({ t: 'chat', text: 'hello over ws' });
await bob.next((m) => m.t === 'chat' && m.message.text === 'hello over ws', 'chat from Alice');
ok(true, `Chat WebSocket → HTTP (held poll answered in ${Date.now() - sentAt} ms)`);

alice.send({ t: 'load', media: { kind: 'youtube', id: 'aqz-KE-bpKQ' } });
const load = await bob.next((m) => m.t === 'state' && m.action === 'load', 'load');
ok(load.state.item?.media.id === 'aqz-KE-bpKQ', 'Alice opened a video, Bob (HTTP) got it');
await bob.send({ t: 'pause', position: 42, at: Date.now() });
const paused = await alice.next((m) => m.t === 'state' && m.action === 'pause', 'pause');
ok(paused.state.paused && Math.abs(paused.state.position - 42) < 0.5 && paused.by.name === 'Bob', 'Bob paused at 42 s, Alice followed');
await bob.send({ t: 'seek', position: 100, at: Date.now() });
const seek = await alice.next((m) => m.t === 'state' && m.action === 'seek', 'seek');
ok(Math.abs(seek.state.position - 100) < 0.5, 'Bob seeked, Alice followed');

// 3) Several messages in one request keep their order; rate limits still apply.
await bob.post([JSON.stringify({ t: 'chat', text: 'one' }), JSON.stringify({ t: 'chat', text: 'two' }), JSON.stringify({ t: 'chat', text: 'three' })]);
const order = [];
for (let i = 0; i < 3; i++) order.push((await alice.next((m) => m.t === 'chat' && ['one', 'two', 'three'].includes(m.message.text), 'batch')).message.text);
ok(order.join() === 'one,two,three', 'A batch of messages arrives in order');
const bad = await bob.post([12]);
ok(bad.status === 204, 'A non-text message is accepted as a request…');
const badMsg = await bob.next((m) => m.t === 'error' && m.code === 'bad_message', 'bad_message');
ok(!!badMsg, '…and answered like a binary frame (bad_message)');
const notArray = await bob.post({ t: 'chat' });
ok(notArray.status === 400, 'A body that is not a list is refused (400)');
const tooMany = await bob.post(Array.from({ length: 41 }, () => '{"t":"ping","c":1}'));
ok(tooMany.status === 400, 'More than 40 messages in one request are refused');

// 4) Voice signalling between a WebSocket and an HTTP person.
alice.send({ t: 'voice', on: true, mic: true });
await bob.send({ t: 'voice', on: true, mic: true });
await alice.next((m) => m.t === 'members' && m.members.find((x) => x.name === 'Bob')?.voice, 'Bob in voice');
await bob.send({ t: 'signal', to: wa.you, data: { candidate: { candidate: 'candidate:http', sdpMid: '0', sdpMLineIndex: 0 } } });
const sig = await alice.next((m) => m.t === 'signal', 'signal');
ok(sig.from === wb.you && sig.data.candidate.candidate === 'candidate:http', 'Voice signal HTTP → WebSocket');
alice.send({ t: 'signal', to: wb.you, data: { candidate: { candidate: 'candidate:ws', sdpMid: '0', sdpMLineIndex: 0 } } });
const sig2 = await bob.next((m) => m.t === 'signal', 'signal back');
ok(sig2.data.candidate.candidate === 'candidate:ws', 'Voice signal WebSocket → HTTP');

// 5) Reconnect: the same browser comes back with `prev` and keeps its member id; the old session is closed.
const bob2 = await httpClient('Bob2');
await bob2.send({ t: 'hello', v: V, name: 'Bob', cid: 'cid-bob-fb-001', prev: wb.you });
const wb2 = await bob2.next((m) => m.t === 'welcome', 'welcome 2');
ok(wb2.you === wb.you, 'Reconnect over HTTP keeps the member id');
for (let i = 0; i < 50 && bob.closed() === null; i++) await new Promise((r) => setTimeout(r, 100));
ok(bob.closed() === 4005, 'The replaced session learns it was replaced (410, 4005)');
const members2 = await alice.next((m) => m.t === 'members' && m.members.filter((x) => x.name === 'Bob').length === 1, 'one Bob');
ok(members2.members.length === 2, 'Bob appears once after reconnecting');

// 6) Unknown or finished sessions answer 410.
const unknown = await fetch(`${http}/api/rooms/${room}/ws?http=poll&sid=${'0'.repeat(32)}`);
ok(unknown.status === 410 && (await unknown.json()).code === 1006, 'Unknown session → 410');
// Security M4: a malformed session id or an unknown step never reaches the room (the Worker answers 400).
ok((await fetch(`${http}/api/rooms/${room}/ws?http=poll&sid=nothex`)).status === 400, 'Malformed session id → 400 from the Worker');
ok((await fetch(`${http}/api/rooms/${room}/ws?http=poll`)).status === 400, 'Missing session id → 400');
ok((await fetch(`${http}/api/rooms/${room}/ws?http=dance&sid=${'0'.repeat(32)}`, { method: 'POST' })).status === 400, 'Unknown step → 400');

// 7) Kick: the host removes the HTTP person; they get the error, then the close code.
alice.send({ t: 'kick', id: wb2.you });
const kicked = await bob2.next((m) => m.t === 'error' && m.code === 'kicked', 'kicked');
for (let i = 0; i < 50 && bob2.closed() === null; i++) await new Promise((r) => setTimeout(r, 100));
ok(!!kicked && bob2.closed() === 4003, 'Kicked over HTTP: error, then 410 with 4003');
await alice.next((m) => m.t === 'members' && !m.members.some((x) => x.name === 'Bob'), 'Bob gone');
ok(true, 'Alice no longer sees Bob');

// 8) Leaving: Carl joins over HTTP and leaves with `close`; Alice sees him go.
const carl = await httpClient('Carl');
await carl.send({ t: 'hello', v: V, name: 'Carl', cid: 'cid-can-fb-0001' });
await carl.next((m) => m.t === 'welcome', 'welcome');
await alice.next((m) => m.t === 'members' && m.members.some((x) => x.name === 'Carl'), 'Carl in');
const left = await carl.leave();
ok(left.status === 204, 'Close request accepted');
await alice.next((m) => m.t === 'members' && !m.members.some((x) => x.name === 'Carl'), 'Carl gone');
ok(true, 'Alice sees Carl leave');
const after = await carl.send({ t: 'chat', text: 'still here?' });
ok(after.status === 410, 'A closed session cannot send any more');

// 9) Nothing to say: a poll is held and answered empty (204), not at once.
const dave = await httpClient('Dave');
await dave.send({ t: 'hello', v: V, name: 'Dave', cid: 'cid-dan-fb-0001' });
await dave.next((m) => m.t === 'welcome', 'welcome');
const heldStart = Date.now();
alice.send({ t: 'chat', text: 'late' });
await dave.next((m) => m.t === 'chat' && m.message.text === 'late', 'late chat');
ok(Date.now() - heldStart < 2000, 'A held poll answers as soon as there is news');
await dave.leave();

// 10) A game over the fallback (XOX on its own object).
const gid = 'g' + Math.random().toString(36).slice(2, 10);
const p1 = await httpClient('P1', `/api/games/${gid}/ws`);
await p1.send({ t: 'hello', v: 2, game: 'xox', name: 'P1', cid: 'cid-p1-fb-00001' });
const st = await p1.next((m) => m.t === 'state', 'game state');
ok(st.kind === 'xox', 'A game opens over the HTTP fallback');
await p1.leave();

// 11) The WebSocket probe used to switch back once WebSockets work.
const probe = new WebSocket(`${base}/api/probe`);
const probeAnswer = await new Promise((resolve, reject) => {
  probe.addEventListener('message', (e) => resolve(String(e.data)));
  probe.addEventListener('error', reject);
  setTimeout(() => reject(new Error('probe timeout')), 8000);
});
probe.send('bye');
ok(probeAnswer === 'ok', 'WebSocket probe answers "ok"');
const big = await fetch(`${http}/api/probe?bytes=200000`);
ok((await big.text()).length === 200000, 'Probe download of 200 kB (diagnostics)');

// 12) One hello per connection; votes count people in the room once (security review 2, H1 / M1).
alice.send({ t: 'hello', v: V, name: 'Mallory', cid: 'cid-rotated-00001' });
await alice.next((m) => m.t === 'error' && m.code === 'bad_message', 'second hello refused');
ok(true, 'A second hello on a joined connection is refused');
alice.send({ t: 'enqueue', media: { kind: 'youtube', id: 'M7lc1UVf-VE' } });
const queued = await alice.next((m) => m.t === 'queue' && m.queue.some((q) => q.media.id === 'M7lc1UVf-VE'), 'queued');
const itemId = queued.queue.find((q) => q.media.id === 'M7lc1UVf-VE').id;
for (let i = 0; i < 5; i++) {
  alice.send({ t: 'hello', v: V, name: 'Alice', cid: `cid-vote-rot-${i}0000` });
  alice.send({ t: 'vote', id: itemId, up: true });
  await new Promise((r) => setTimeout(r, 350)); // under the command limit (4 / s)
}
let votes = 0;
for (let i = 0; i < 5; i++) votes = (await alice.next((m) => m.t === 'queue', 'vote queue')).queue.find((q) => q.id === itemId).votes;
ok(votes === 1, `Votes with "changed" browser ids count once (${votes})`);
const hal = await httpClient('Hal');
await hal.send({ t: 'hello', v: V, name: 'Hal', cid: 'cid-hal-fb-00001' });
await hal.next((m) => m.t === 'welcome', 'welcome Hal');
await hal.send({ t: 'vote', id: itemId, up: true });
const twoVotes = await alice.next((m) => m.t === 'queue' && m.queue.find((q) => q.id === itemId)?.votes === 2, 'second voter');
ok(!!twoVotes, 'A second person in the room adds a second vote');
await hal.leave();
alice.send({ t: 'vote', id: itemId, up: true });
const present = await alice.next((m) => m.t === 'queue' && m.queue.find((q) => q.id === itemId)?.votes === 1, 'votes of people present');
ok(!!present, 'Only people in the room count (Hal left: back to 1)');

// 13) A fallback session that never polls is closed within seconds (its queue would only grow).
const silentOpen = await fetch(`${http}/api/rooms/${room}/ws?http=open`, { method: 'POST' });
const { sid: silentSid } = await silentOpen.json();
await fetch(`${http}/api/rooms/${room}/ws?http=send&sid=${silentSid}`, { method: 'POST', body: JSON.stringify([JSON.stringify({ t: 'hello', v: V, name: 'Silent', cid: 'cid-silent-fb-01' })]) });
await alice.next((m) => m.t === 'members' && m.members.some((x) => x.name === 'Silent'), 'Silent in');
alice.inbox.length = 0; // older member lists (Hal leaving) must not count as Silent leaving
const silentAt = Date.now();
await alice.next((m) => m.t === 'members' && !m.members.some((x) => x.name === 'Silent'), 'Silent closed', 25000);
ok(true, `A session that never polls is closed (${((Date.now() - silentAt) / 1000).toFixed(1)} s after joining)`);

// 13b) Security R3-6: one address holds at most 3 open fallback sessions in one object; a 4th is refused (429) and
// fits again once one of them is closed.
const capRoom = 'fbcap' + Math.random().toString(36).slice(2, 8);
const capUrl = (op, sid) => `${http}/api/rooms/${capRoom}/ws?http=${op}${sid ? `&sid=${sid}` : ''}`;
const capSids = [];
for (let i = 0; i < 3; i++) {
  const opened = await fetch(capUrl('open'), { method: 'POST' });
  capSids.push((await opened.json()).sid);
}
const fourth = await fetch(capUrl('open'), { method: 'POST' });
ok(fourth.status === 429 && (await fourth.json()).code === 'busy', 'A 4th fallback session from one address is refused (429 busy)');
await fetch(capUrl('close', capSids.shift()), { method: 'POST' });
await new Promise((r) => setTimeout(r, 300));
const again = await fetch(capUrl('open'), { method: 'POST' });
ok(again.ok && typeof (await again.json()).sid === 'string', 'After one closes, the address may open another');
for (const sid of capSids) await fetch(capUrl('close', sid), { method: 'POST' });

// 14) Limits on the request itself (last: the refused upload ends this HTTP connection).
const eve = await httpClient('Eve');
const huge = await fetch(eve.url('send', eve.sid), { method: 'POST', body: 'x'.repeat(1_200_000) }).catch(() => null);
ok(!huge || huge.status === 413, 'A body over the limit is refused (413)');
await eve.leave().catch(() => {});
// A chunked body has no Content-Length: it is read as a stream and stopped at the limit, the room keeps running.
const frank = await httpClient('Frank');
const chunk = new TextEncoder().encode('x'.repeat(64_000));
let sentChunks = 0;
const stream = new ReadableStream({
  pull(controller) {
    if (sentChunks++ >= 40) controller.close(); // ≈ 2.5 MB
    else controller.enqueue(chunk);
  },
});
const chunked = await fetch(frank.url('send', frank.sid), { method: 'POST', body: stream, duplex: 'half' }).catch(() => null);
ok(!chunked || chunked.status === 413, `A chunked body over the limit is refused (${chunked?.status ?? 'connection ended'})`);
await frank.leave().catch(() => {});
const ping2 = Date.now();
alice.send({ t: 'ping', c: ping2 });
await alice.next((m) => m.t === 'pong' && m.c === ping2, 'pong after chunked');
const after2 = await httpClient('Gina');
await after2.send({ t: 'hello', v: V, name: 'Gina', cid: 'cid-gina-fb-0001' });
const wg = await after2.next((m) => m.t === 'welcome', 'welcome Gina');
ok(wg.members.some((m) => m.name === 'Alice'), 'The room still answers after it (same object, Alice still in)');
await after2.leave().catch(() => {});

console.log('\n✓ HTTP fallback works');
process.exit(0);
