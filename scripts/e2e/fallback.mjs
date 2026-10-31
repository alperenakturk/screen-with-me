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
const ali = wsClient('Ali');
await ali.opened;
ali.send({ t: 'hello', v: V, name: 'Ali', cid: 'cid-ali-fb-0001' });
const wa = await ali.next((m) => m.t === 'welcome', 'welcome');

const ayse = await httpClient('Ayse');
ok(/^[0-9a-f]{32}$/.test(ayse.sid), 'Fallback session opened');
await ayse.send({ t: 'hello', v: V, name: 'Ayse', cid: 'cid-ayse-fb-001' });
const wb = await ayse.next((m) => m.t === 'welcome', 'welcome');
ok(wb.members.some((m) => m.name === 'Ali') && wb.members.some((m) => m.name === 'Ayse'), 'Ayşe joined over HTTP and sees Ali');
const seen = await ali.next((m) => m.t === 'members' && m.members.some((x) => x.name === 'Ayse'), 'members');
ok(seen.members.length === 2, 'Ali (WebSocket) sees Ayşe (HTTP) in the room');

// 2) Clock, chat both ways, sync both ways.
const c = Date.now();
await ayse.send({ t: 'ping', c });
const pong = await ayse.next((m) => m.t === 'pong', 'pong');
ok(pong.c === c && typeof pong.s === 'number', `Ping / pong over HTTP (${Date.now() - c} ms)`);

await ayse.send({ t: 'chat', text: 'merhaba http' });
const chat1 = await ali.next((m) => m.t === 'chat' && m.message.text === 'merhaba http', 'chat from Ayse');
ok(chat1.message.by.name === 'Ayse', 'Chat HTTP → WebSocket');
const sentAt = Date.now();
ali.send({ t: 'chat', text: 'merhaba ws' });
await ayse.next((m) => m.t === 'chat' && m.message.text === 'merhaba ws', 'chat from Ali');
ok(true, `Chat WebSocket → HTTP (held poll answered in ${Date.now() - sentAt} ms)`);

ali.send({ t: 'load', media: { kind: 'youtube', id: 'aqz-KE-bpKQ' } });
const load = await ayse.next((m) => m.t === 'state' && m.action === 'load', 'load');
ok(load.state.item?.media.id === 'aqz-KE-bpKQ', 'Ali opened a video, Ayşe (HTTP) got it');
await ayse.send({ t: 'pause', position: 42, at: Date.now() });
const paused = await ali.next((m) => m.t === 'state' && m.action === 'pause', 'pause');
ok(paused.state.paused && Math.abs(paused.state.position - 42) < 0.5 && paused.by.name === 'Ayse', 'Ayşe paused at 42 s, Ali followed');
await ayse.send({ t: 'seek', position: 100, at: Date.now() });
const seek = await ali.next((m) => m.t === 'state' && m.action === 'seek', 'seek');
ok(Math.abs(seek.state.position - 100) < 0.5, 'Ayşe seeked, Ali followed');

// 3) Several messages in one request keep their order; rate limits still apply.
await ayse.post([JSON.stringify({ t: 'chat', text: 'bir' }), JSON.stringify({ t: 'chat', text: 'iki' }), JSON.stringify({ t: 'chat', text: 'üç' })]);
const order = [];
for (let i = 0; i < 3; i++) order.push((await ali.next((m) => m.t === 'chat' && ['bir', 'iki', 'üç'].includes(m.message.text), 'batch')).message.text);
ok(order.join() === 'bir,iki,üç', 'A batch of messages arrives in order');
const bad = await ayse.post([12]);
ok(bad.status === 204, 'A non-text message is accepted as a request…');
const badMsg = await ayse.next((m) => m.t === 'error' && m.code === 'bad_message', 'bad_message');
ok(!!badMsg, '…and answered like a binary frame (bad_message)');
const notArray = await ayse.post({ t: 'chat' });
ok(notArray.status === 400, 'A body that is not a list is refused (400)');
const tooMany = await ayse.post(Array.from({ length: 41 }, () => '{"t":"ping","c":1}'));
ok(tooMany.status === 400, 'More than 40 messages in one request are refused');

// 4) Voice signalling between a WebSocket and an HTTP person.
ali.send({ t: 'voice', on: true, mic: true });
await ayse.send({ t: 'voice', on: true, mic: true });
await ali.next((m) => m.t === 'members' && m.members.find((x) => x.name === 'Ayse')?.voice, 'Ayse in voice');
await ayse.send({ t: 'signal', to: wa.you, data: { candidate: { candidate: 'candidate:http', sdpMid: '0', sdpMLineIndex: 0 } } });
const sig = await ali.next((m) => m.t === 'signal', 'signal');
ok(sig.from === wb.you && sig.data.candidate.candidate === 'candidate:http', 'Voice signal HTTP → WebSocket');
ali.send({ t: 'signal', to: wb.you, data: { candidate: { candidate: 'candidate:ws', sdpMid: '0', sdpMLineIndex: 0 } } });
const sig2 = await ayse.next((m) => m.t === 'signal', 'signal back');
ok(sig2.data.candidate.candidate === 'candidate:ws', 'Voice signal WebSocket → HTTP');

// 5) Reconnect: the same browser comes back with `prev` and keeps its member id; the old session is closed.
const ayse2 = await httpClient('Ayse2');
await ayse2.send({ t: 'hello', v: V, name: 'Ayse', cid: 'cid-ayse-fb-001', prev: wb.you });
const wb2 = await ayse2.next((m) => m.t === 'welcome', 'welcome 2');
ok(wb2.you === wb.you, 'Reconnect over HTTP keeps the member id');
for (let i = 0; i < 50 && ayse.closed() === null; i++) await new Promise((r) => setTimeout(r, 100));
ok(ayse.closed() === 4005, 'The replaced session learns it was replaced (410, 4005)');
const members2 = await ali.next((m) => m.t === 'members' && m.members.filter((x) => x.name === 'Ayse').length === 1, 'one Ayse');
ok(members2.members.length === 2, 'Ayşe appears once after reconnecting');

// 6) Unknown or finished sessions answer 410.
const unknown = await fetch(`${http}/api/rooms/${room}/ws?http=poll&sid=${'0'.repeat(32)}`);
ok(unknown.status === 410 && (await unknown.json()).code === 1006, 'Unknown session → 410');

// 7) Kick: the host removes the HTTP person; they get the error, then the close code.
ali.send({ t: 'kick', id: wb2.you });
const kicked = await ayse2.next((m) => m.t === 'error' && m.code === 'kicked', 'kicked');
for (let i = 0; i < 50 && ayse2.closed() === null; i++) await new Promise((r) => setTimeout(r, 100));
ok(!!kicked && ayse2.closed() === 4003, 'Kicked over HTTP: error, then 410 with 4003');
await ali.next((m) => m.t === 'members' && !m.members.some((x) => x.name === 'Ayse'), 'Ayse gone');
ok(true, 'Ali no longer sees Ayşe');

// 8) Leaving: Can joins over HTTP and leaves with `close`; Ali sees him go.
const can = await httpClient('Can');
await can.send({ t: 'hello', v: V, name: 'Can', cid: 'cid-can-fb-0001' });
await can.next((m) => m.t === 'welcome', 'welcome');
await ali.next((m) => m.t === 'members' && m.members.some((x) => x.name === 'Can'), 'Can in');
const left = await can.leave();
ok(left.status === 204, 'Close request accepted');
await ali.next((m) => m.t === 'members' && !m.members.some((x) => x.name === 'Can'), 'Can gone');
ok(true, 'Ali sees Can leave');
const after = await can.send({ t: 'chat', text: 'still here?' });
ok(after.status === 410, 'A closed session cannot send any more');

// 9) Nothing to say: a poll is held and answered empty (204), not at once.
const dan = await httpClient('Dan');
await dan.send({ t: 'hello', v: V, name: 'Dan', cid: 'cid-dan-fb-0001' });
await dan.next((m) => m.t === 'welcome', 'welcome');
const heldStart = Date.now();
ali.send({ t: 'chat', text: 'late' });
await dan.next((m) => m.t === 'chat' && m.message.text === 'late', 'late chat');
ok(Date.now() - heldStart < 2000, 'A held poll answers as soon as there is news');
await dan.leave();

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

// 12) Limits on the request itself (last: the refused upload ends this HTTP connection).
const eve = await httpClient('Eve');
const huge = await fetch(eve.url('send', eve.sid), { method: 'POST', body: 'x'.repeat(1_200_000) }).catch(() => null);
ok(!huge || huge.status === 413, 'A body over the limit is refused (413)');
await eve.leave().catch(() => {});

console.log('\n✓ HTTP fallback works');
process.exit(0);
