// Pinlenmiş anlar: sunucu anı kendi hesaplar, herkese tam liste yollar, yeni gelen welcome ile
// alır; kendi pinini (yönetici hepsini) kaldırır; video değişince pinler sıfırlanır.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'pins' + Math.random().toString(36).slice(2, 8);
function client(hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, ...hello })));
  const wait = async (pred, label) => {
    for (let i = 0; i < 100; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('timeout ' + label);
  };
  return { ws, wait, inbox, send: (m) => ws.send(JSON.stringify(m)) };
}
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };

const alex = client({ name: 'Alex', cid: 'pinsAlex12345' });
await alex.wait((m) => m.t === 'welcome', 'welcome alex');
const sam = client({ name: 'Sam', cid: 'pinsSam1234' });
await sam.wait((m) => m.t === 'welcome', 'welcome sam');
alex.send({ t: 'load', media: { kind: 'youtube', id: 'dQw4w9WgXcQ' } });
const loaded = await alex.wait((m) => m.t === 'state' && m.state.item, 'loaded');
const itemId = loaded.state.item.id;
alex.send({ t: 'pause', position: 125, at: Date.now() });
await alex.wait((m) => m.t === 'state' && m.state.paused, 'paused');

sam.send({ t: 'pin', note: 'Burayı anlamadım' });
const p1 = await alex.wait((m) => m.t === 'pins' && m.pins.pins.length === 1, 'pin 1');
const pin = p1.pins.pins[0];
ok(p1.pins.itemId === itemId && Math.abs(pin.at - 125) < 0.5 && pin.note === 'Burayı anlamadım' && pin.by.name === 'Sam', 'Pin o anın saniyesi, notu ve pinleyenle herkese gidiyor');
ok(!('owner' in pin) && !JSON.stringify(p1).includes('pinsSam1234'), 'Pinleyenin tarayıcı kimliği istemcilere gitmiyor');

const max = client({ name: 'Max', cid: 'pinsMax12345' });
const w = await max.wait((m) => m.t === 'welcome', 'welcome can');
ok(w.pins?.pins.length === 1 && w.pins.pins[0].id === pin.id, 'Yeni gelen pinleri welcome ile alıyor');

max.send({ t: 'unpin', id: pin.id });
const err = await max.wait((m) => m.t === 'error', 'unpin refused');
ok(err.code === 'not_host', 'Başkasının pinini (yönetici değilse) kaldıramıyor');
sam.send({ t: 'unpin', id: pin.id });
const p2 = await alex.wait((m) => m.t === 'pins' && m.pins.pins.length === 0, 'unpinned');
ok(!!p2, 'Kendi pinini kaldırabiliyor');

alex.send({ t: 'pin' });
await alex.wait((m) => m.t === 'pins' && m.pins.pins.length === 1, 'pin 2');
alex.send({ t: 'load', media: { kind: 'youtube', id: 'jNQXAC9IVRw' } });
await alex.wait((m) => m.t === 'state' && m.state.item && m.state.item.id !== itemId, 'new video');
const dan = client({ name: 'Dan', cid: 'pinsDan12345' });
const w2 = await dan.wait((m) => m.t === 'welcome', 'welcome dan');
ok(w2.pins === undefined, 'Yeni video açılınca pinler sıfırlanıyor');

for (const c of [alex, sam, max, dan]) c.ws.close();
setTimeout(() => process.exit(0), 100);
