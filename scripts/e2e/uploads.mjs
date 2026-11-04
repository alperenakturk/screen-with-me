// Security review 4, R4-1: images are counted across all rooms by one daily budget per address (`UploadGate`).
// Always: custom emojis and chat images still go through in two fresh rooms. With `UPLOAD_CAP=<bytes>` (a local
// `wrangler dev --var UPLOAD_IP_BYTES:<bytes>`), the address's uploads in fresh rooms stop at that budget, for emojis
// and chat images alike.
const base = process.argv[2] ?? 'ws://localhost:8787';
const cap = Number(process.env.UPLOAD_CAP || 0);
function client(room, hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, ...hello })));
  const wait = async (pred, label, tries = 100) => {
    for (let i = 0; i < tries; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('timeout ' + label);
  };
  return { ws, wait, inbox, send: (m) => ws.send(JSON.stringify(m)) };
}
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };
const fresh = () => 'upl' + Math.random().toString(36).slice(2, 8);
// A different picture each time (an id is the data's hash): ~60 KB of GIF-looking base64.
const image = (n) => 'data:image/gif;base64,R0lGODlh' + 'A'.repeat(60_000) + n.toString(36).padStart(8, 'A');

const alex = client(fresh(), { name: 'Alex', cid: 'uplAlex12345' });
await alex.wait((m) => m.t === 'welcome', 'welcome');
alex.send({ t: 'sticker-add', data: image(1) });
ok((await alex.wait((m) => m.t === 'sticker' || m.t === 'error', 'sticker 1')).t === 'sticker', 'A custom emoji is stored in a fresh room');
const pic = image(2);
alex.send({ t: 'chat', text: 'look', image: pic });
ok((await alex.wait((m) => m.t === 'chat-image' || m.t === 'error', 'chat image')).t === 'chat-image', 'A chat image is stored');
await alex.wait((m) => m.t === 'chat', 'chat line');
alex.ws.close();

const sam = client(fresh(), { name: 'Sam', cid: 'uplSam123456' });
await sam.wait((m) => m.t === 'welcome', 'welcome 2');
sam.send({ t: 'sticker-add', data: image(3) });
ok((await sam.wait((m) => m.t === 'sticker' || m.t === 'error', 'sticker 2')).t === 'sticker', 'Another fresh room takes an emoji too');
sam.ws.close();

if (cap > 0) {
  // Fill the address's budget over fresh rooms, one emoji each (each room's own limits stay far away).
  let refused = null;
  let stored = 0;
  for (let n = 10; n < 10 + Math.ceil(cap / 60_000) + 4 && !refused; n++) {
    const c = client(fresh(), { name: 'Max', cid: `uplMax${n}xxxx` });
    await c.wait((m) => m.t === 'welcome', 'welcome loop');
    c.send({ t: 'sticker-add', data: image(n) });
    const got = await c.wait((m) => m.t === 'sticker' || m.t === 'error', 'loop sticker');
    if (got.t === 'error') refused = got.code;
    else stored++;
    c.ws.close();
  }
  ok(refused === 'rate_limited', `Uploads across fresh rooms stop at the address's daily budget (stored ${stored}, then ${refused})`);
  const back = client(fresh(), { name: 'Mia', cid: 'uplMia123456' });
  await back.wait((m) => m.t === 'welcome', 'welcome last');
  back.send({ t: 'chat', text: 'new', image: image(999) });
  ok((await back.wait((m) => m.t === 'error' || m.t === 'chat-image', 'over budget')).t === 'error', 'A new chat image is refused once the budget is used');
  back.ws.close();
}
process.exit(0);
