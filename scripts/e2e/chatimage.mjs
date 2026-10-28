// Images in chat (0.9.88): the data goes to everyone before its message, a latecomer gets the history's images one by
// one after welcome, an image with a caption keeps its text, and non-raster data is rejected.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'cimg' + Math.random().toString(36).slice(2, 8);
function client(hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  const log = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    log.push(m.t);
  });
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, ...hello })));
  const wait = async (pred, label) => {
    for (let i = 0; i < 100; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('timeout ' + label);
  };
  return { ws, wait, inbox, log, send: (m) => ws.send(JSON.stringify(m)) };
}
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };

// A real-sized picture (~150 KB of base64), far above the general 4 KB message limit.
const PIC = 'data:image/webp;base64,' + 'UklGRg'.repeat(25_000);

const ali = client({ name: 'Ali', cid: 'cimgAli12345' });
await ali.wait((m) => m.t === 'welcome', 'welcome ali');
const ayse = client({ name: 'Ayse', cid: 'cimgAyse1234' });
await ayse.wait((m) => m.t === 'welcome', 'welcome ayse');

ali.send({ t: 'chat', text: 'look at this', image: PIC });
const data = await ayse.wait((m) => m.t === 'chat-image', 'chat-image');
ok(data.data === PIC && /^[0-9a-f]{12}$/.test(data.id), 'The image data reaches the room');
const msg = await ayse.wait((m) => m.t === 'chat', 'chat with image');
ok(msg.message.image === data.id && msg.message.text === 'look at this', 'The message points at the image and keeps its caption');
ok(ayse.log.indexOf('chat-image') < ayse.log.indexOf('chat'), 'The data arrives before the message');

ali.send({ t: 'chat', text: '', image: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=' });
ali.send({ t: 'chat', text: 'plain text' });
const next = await ayse.wait((m) => m.t === 'chat', 'next chat');
ok(next.message.text === 'plain text' && next.message.image === undefined, 'An SVG "image" is rejected; plain text still works');

const can = client({ name: 'Can', cid: 'cimgCan12345' });
const welcome = await can.wait((m) => m.t === 'welcome', 'welcome can');
ok(welcome.chat.some((m) => m.image === data.id), 'The history in welcome contains the image message');
const late = await can.wait((m) => m.t === 'chat-image', 'late chat-image');
ok(late.id === data.id && late.data === PIC, 'A latecomer gets the image data after welcome');

for (const c of [ali, ayse, can]) c.ws.close();
console.log('chatimage: all passed');
