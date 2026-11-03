// Card R1 (owner's test round 1): opening, joining and closing a game while someone streams and both are in voice
// never closes a room connection, and the stream comes back after a dropped room connection with the same member id
// (the streamer and the viewer say it again; the server keeps the member id).
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'gst' + Math.random().toString(36).slice(2, 8);
const V = Number(process.env.SWM_V ?? 3);
function client(hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  let members = [];
  let closed = null;
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'welcome' || m.t === 'members') members = m.members;
  });
  ws.addEventListener('close', (e) => (closed = e.code));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: V, ...hello })));
  const wait = async (pred, label, ms = 8000) => {
    for (let i = 0; i < ms / 50; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error('timeout ' + label);
  };
  return { ws, wait, inbox, send: (m) => ws.send(JSON.stringify(m)), get members() { return members; }, get closed() { return closed; } };
}
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const alex = client({ name: 'Alex', cid: 'gstAlex000001' });
const welcome = await alex.wait((m) => m.t === 'welcome', 'welcome');
if (!welcome.voice) {
  console.log('(voice / streams are off on this server: skipped)');
  process.exit(0);
}
const sam = client({ name: 'Sam', cid: 'gstSam0000001' });
const samWelcome = await sam.wait((m) => m.t === 'welcome', 'welcome sam');
alex.send({ t: 'voice', on: true, mic: true });
sam.send({ t: 'voice', on: true, mic: true });
sam.send({ t: 'live', on: true, kind: 'screen' });
await alex.wait((m) => m.t === 'members' && m.members.some((x) => x.name === 'Sam' && x.live === 'screen'), 'sam live');
alex.send({ t: 'live-watch', on: true });
await sam.wait((m) => m.t === 'members' && m.members.some((x) => x.name === 'Alex' && x.watching), 'alex watching');
ok(true, 'Sam streams, Alex watches, both in voice');

for (const kind of ['xox', 'draw', 'quiz', 'poker']) {
  alex.send({ t: 'table', open: kind });
  const opened = await sam.wait((m) => m.t === 'tables' && m.opened, `${kind} opened`);
  const table = opened.tables.find((x) => x.id === opened.opened);
  sam.send({ t: 'at', table: table.id });
  await sleep(300);
  alex.send({ t: 'table', close: table.id });
  await sam.wait((m) => m.t === 'tables' && m.closed === table.id, `${kind} closed`);
  const still = sam.members.find((x) => x.name === 'Sam');
  const viewer = sam.members.find((x) => x.name === 'Alex');
  ok(alex.closed === null && sam.closed === null && still?.live === 'screen' && viewer?.watching && still?.voice && viewer?.voice, `${kind}: opened, joined and closed; no room connection closed, stream and voice untouched`);
}

// The streamer's room connection drops and comes back with the same member id: the server let go of the viewers, the
// streamer says "live" again, the viewer asks to watch again (what the page does, LiveP2p.resume / sync).
const samId = samWelcome.you;
sam.ws.close();
await alex.wait((m) => m.t === 'members' && !m.members.some((x) => x.id === samId), 'sam gone');
const back = client({ name: 'Sam', cid: 'gstSam0000001', prev: samId });
const backWelcome = await back.wait((m) => m.t === 'welcome', 'welcome back');
ok(backWelcome.you === samId, 'Sam gets the same member id back');
back.send({ t: 'voice', on: true, mic: true });
back.send({ t: 'live', on: true, kind: 'screen' });
await alex.wait((m) => m.t === 'members' && m.members.some((x) => x.id === samId && x.live === 'screen'), 'sam live again');
alex.send({ t: 'live-watch', on: true });
await alex.wait((m) => m.t === 'members' && m.members.some((x) => x.name === 'Alex' && x.watching), 'alex watching again');
ok(true, 'after the reconnect the stream and the watching are listed again');

for (const c of [alex, back]) c.ws.close();
console.log('\n✓ Games and streams keep the room connection');
setTimeout(() => process.exit(0), 100);
