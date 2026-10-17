// Oda yöneticisi, atma ve isim değiştirme.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'host' + Math.random().toString(36).slice(2, 8);
function client(hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  let closed = null;
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('close', (e) => (closed = e.code));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, ...hello })));
  const wait = async (pred, label) => {
    for (let i = 0; i < 40; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('timeout ' + label);
  };
  return { ws, wait, inbox, closed: () => closed, send: (m) => ws.send(JSON.stringify(m)) };
}
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const a = client({ name: 'Ali', cid: 'aliCid12345' });
const wa = await a.wait((m) => m.t === 'welcome', 'welcome a');
ok(wa.hostId === wa.you, 'İlk giren Ali oda yöneticisi');

const b = client({ name: 'Ayse', cid: 'ayseCid12345' });
const wb = await b.wait((m) => m.t === 'welcome', 'welcome b');
ok(wb.hostId === wa.you, 'Ayşe yöneticiyi Ali olarak görüyor');

b.send({ t: 'kick', id: wa.you });
const err = await b.wait((m) => m.t === 'error', 'not_host');
ok(err.code === 'not_host', 'Yönetici olmayan Ayşe kimseyi atamaz');

b.send({ t: 'rename', name: 'Ayşe K.', avatar: '🐼' });
const ren = await a.wait((m) => m.t === 'members' && m.members.some((x) => x.name === 'Ayşe K.'), 'rename');
ok(ren.members.find((x) => x.name === 'Ayşe K.').avatar === '🐼', 'İsim ve avatar değişikliği herkese yansıdı');

// Ali sayfayı yeniler: bağlantı kopar, aynı kimlikle geri gelir → yine yönetici.
a.ws.close();
await sleep(300);
const bAfter = await b.wait((m) => m.t === 'members' && m.members.length === 1, 'ali left');
ok(bAfter.hostId === wb.you, 'Ali yokken Ayşe geçici yönetici');
const a2 = client({ name: 'Ali', cid: 'aliCid12345' });
const wa2 = await a2.wait((m) => m.t === 'welcome', 'welcome a2');
ok(wa2.hostId === wa2.you, 'Ali yenileyip geri gelince yine yönetici');

a2.send({ t: 'kick', id: wb.you });
const kickedMsg = await b.wait((m) => m.t === 'error', 'kicked');
await sleep(300);
ok(kickedMsg.code === 'kicked' && b.closed() === 4003, 'Ali, Ayşe’yi attı; Ayşe’nin bağlantısı kapandı');
const left = await a2.wait((m) => m.t === 'members', 'members after kick');
ok(left.members.length === 1, 'Atılan kişi listeden düştü');

const b2 = client({ name: 'Ayse', cid: 'ayseCid12345' });
const again = await b2.wait((m) => m.t === 'error', 'ban');
ok(again.code === 'kicked', 'Atılan Ayşe hemen geri giremiyor');

a2.ws.close();
setTimeout(() => process.exit(0), 100);
