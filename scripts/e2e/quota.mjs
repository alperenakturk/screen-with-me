// QUOTA1a: the limits that keep one client from using up the Free Durable Object quotas.
// 1. The free keepalive: the room and a game table answer `{"t":"hb"}` with `{"t":"hb"}` (the runtime's auto-response;
//    the object isn't woken, so nothing else changes).
// 2. The message ceiling: a connection that sends 300 messages at once gets `flood` and is closed with 1008; the others
//    in the room carry on.
// 3. The per-address cap: one address can hold 12 connections in a room, the 13th gets `room_ip_full` (4012). CI's local
//    server runs unpaced (every test comes from one address), so this part runs against a normal server only.
const base = process.argv[2] ?? 'ws://localhost:8787';
const local = /localhost|127\.0\.0\.1/.test(base);
const unpaced = local && process.env.SWM_E2E_UNPACED === '1';
const room = 'quota' + Math.random().toString(36).slice(2, 8);
const V = Number(process.env.SWM_V ?? 3);
const KEEPALIVE = '{"t":"hb"}';
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function socket(path) {
  const ws = new WebSocket(`${base}${path}`);
  const inbox = [];
  const raw = [];
  let closed = null;
  ws.addEventListener('message', (e) => {
    raw.push(String(e.data));
    try {
      inbox.push(JSON.parse(e.data));
    } catch {
      // not JSON
    }
  });
  ws.addEventListener('close', (e) => (closed = e.code));
  const opened = new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const wait = async (pred, label, ms = 8000) => {
    for (let i = 0; i < ms / 50; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await sleep(50);
    }
    throw new Error('timeout ' + label);
  };
  return { ws, inbox, raw, wait, opened, closed: () => closed, send: (m) => ws.send(typeof m === 'string' ? m : JSON.stringify(m)) };
}
const join = async (name, cid) => {
  const c = socket(`/api/rooms/${room}/ws`);
  await c.opened;
  c.send({ t: 'hello', v: V, name, cid });
  await c.wait((m) => m.t === 'welcome', `welcome ${name}`);
  return c;
};

// 1. The free keepalive, in the room and at a game table.
const alex = await join('Alex', 'quotaAlex00001');
alex.send(KEEPALIVE);
await sleep(600);
ok(alex.raw.includes(KEEPALIVE), 'the room answers the free keepalive');
alex.send({ t: 'game', kind: 'classics' });
const game = await alex.wait((m) => m.t === 'game' && m.game, 'table');
const table = socket(`/api/games/${game.game.id}/ws`);
await table.opened;
table.send({ t: 'hello', v: 2, game: 'xox', name: 'Alex', cid: 'quotaAlex00001', classics: true });
await table.wait((m) => m.t === 'state', 'table state');
table.send(KEEPALIVE);
await sleep(600);
ok(table.raw.includes(KEEPALIVE), 'a game table answers the free keepalive');
// Old pages' real ping still gets its clock answer.
alex.send({ t: 'ping', c: 123 });
const pong = await alex.wait((m) => m.t === 'pong', 'pong');
ok(pong.c === 123 && typeof pong.s === 'number', "an old page's ping still gets the clock answer");
table.ws.close();

// 2. The message ceiling.
const sam = await join('Sam', 'quotaSam000001');
for (let i = 0; i < 300; i++) sam.send({ t: 'ping', c: i });
const flood = await sam.wait((m) => m.t === 'error' && m.code === 'flood', 'flood');
for (let i = 0; i < 40 && sam.closed() === null; i++) await sleep(100);
ok(flood && sam.closed() === 1008, 'a connection that sends 300 at once gets "flood" and is closed with 1008');
alex.send({ t: 'chat', text: 'still here' });
await alex.wait((m) => m.t === 'chat' && m.message.text === 'still here', 'chat after flood');
ok(alex.closed() === null, 'the others in the room carry on');

// 3. The per-address cap.
if (unpaced) {
  console.log('    (CI local server runs unpaced: the per-address cap is checked on the live run)');
} else {
  const extra = [];
  // Alex is one; 11 more reach 12, the next is refused.
  for (let i = 0; i < 12; i++) {
    const s = socket(`/api/rooms/${room}/ws`);
    await s.opened;
    extra.push(s);
  }
  await sleep(800);
  const refused = extra.filter((s) => s.inbox.some((m) => m.t === 'error' && m.code === 'room_ip_full'));
  // A page sends its hello at once; the refused connection is closed on it.
  refused[0]?.send({ t: 'hello', v: V, name: 'Extra', cid: 'quotaExtra0001' });
  for (let i = 0; i < 50 && refused[0] && refused[0].closed() === null; i++) await sleep(100);
  ok(refused.length === 1 && refused[0].closed() === 4012 && refused[0] === extra[11], 'the 13th connection from one address gets "room_ip_full" (4012)');
  for (const s of extra) s.ws.close();
}
// 4. IMG2: chat images run out (1 day in a one-time room): the lab server ages them at once; the message stays, a newcomer
//    gets no image data for it.
if (local && process.env.LAB_SERVER === '1') {
  const PIC = 'data:image/webp;base64,' + 'UklGRg'.repeat(2_000);
  alex.send({ t: 'chat', text: 'look', image: PIC });
  const shown = await alex.wait((m) => m.t === 'chat' && m.message.text === 'look', 'image chat');
  alex.send({ t: 'lab', op: 'age-images' });
  await sleep(500);
  const kim = await join('Kim', 'quotaKim000001');
  await sleep(800);
  const welcome = kim.raw.map((r) => JSON.parse(r)).find((m) => m.t === 'welcome');
  ok(welcome.chat.some((m) => m.id === shown.message.id) && !kim.inbox.some((m) => m.t === 'chat-image'), 'a chat image runs out: its message stays, its data is gone');
  kim.ws.close();
} else {
  console.log('    (image expiry is checked on a local lab server)');
}
alex.ws.close();
process.exit(0);
