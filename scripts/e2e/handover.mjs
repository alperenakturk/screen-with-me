// Yönetici devri: sayfa yenilemek (kısa kopma) yöneticiliği kaybettirmez; yönetici
// 20 sn'den uzun yoksa yöneticilik kalıcı olarak odadaki en eski kişiye geçer.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'hand' + Math.random().toString(36).slice(2, 8);
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
  return { ws, wait };
}
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const a = client({ name: 'Ali', cid: 'handAli12345' });
const wa = await a.wait((m) => m.t === 'welcome', 'welcome a');
ok(wa.hostId === wa.you, 'Ali yönetici');
const b = client({ name: 'Ayse', cid: 'handAyse1234' });
const wb = await b.wait((m) => m.t === 'welcome', 'welcome b');
await sleep(200);
const c = client({ name: 'Can', cid: 'handCan12345' });
await c.wait((m) => m.t === 'welcome', 'welcome c');

// Kısa kopma (sayfa yenileme): yönetici kalır.
a.ws.close();
await sleep(1500);
const a2 = client({ name: 'Ali', cid: 'handAli12345' });
const wa2 = await a2.wait((m) => m.t === 'welcome', 'welcome a2');
ok(wa2.hostId === wa2.you, 'Ali sayfayı yenileyince yönetici kaldı');

// Uzun yokluk: yöneticilik kalıcı olarak odadaki en eski kişiye (Ayşe) geçer.
a2.ws.close();
await sleep(21_000);
const a3 = client({ name: 'Ali', cid: 'handAli12345' });
const wa3 = await a3.wait((m) => m.t === 'welcome', 'welcome a3');
ok(wa3.hostId === wb.you, 'Ali 20 sn’den uzun yokken yöneticilik Ayşe’ye geçti ve Ali dönünce de Ayşe’de kaldı');
a3.ws.send(JSON.stringify({ t: 'kick', id: wb.you }));
const err = await a3.wait((m) => m.t === 'error', 'not host');
ok(err.code === 'not_host', 'Eski yönetici artık kimseyi atamaz');

// Reconnect: the new connection names the old one (`prev`, same browser id) → the old one leaves at once instead of
// staying in the room (with a frozen camera) until the stale check.
const d = client({ name: 'Dan', cid: 'handDan12345' });
const wd = await d.wait((m) => m.t === 'welcome', 'welcome d');
const d2 = client({ name: 'Dan', cid: 'handDan12345', prev: wd.you });
const wd2 = await d2.wait((m) => m.t === 'welcome', 'welcome d2');
ok(wd2.members.filter((m) => m.name === 'Dan').length === 1, 'Yeniden bağlanan Dan’in eski bağlantısı hemen düştü');
// 0.9.91.16: the reconnect keeps its member id (voice / camera connections between browsers survive it).
ok(wd2.you === wd.you, 'Yeniden bağlanan Dan aynı üye kimliğiyle döndü');
// Someone else can't drop a connection by naming it, nor take its id.
const e = client({ name: 'Eve', cid: 'handEve12345', prev: wd2.you });
const we = await e.wait((m) => m.t === 'welcome', 'welcome e');
ok(we.members.some((m) => m.id === wd2.you) && we.you !== wd2.you, 'Başka tarayıcı kimliğiyle `prev` kimseyi düşürmez, kimliğini alamaz');
// The connection is already gone (like after a server restart): the same browser still gets its id back.
d2.ws.close();
await sleep(500);
const d3 = client({ name: 'Dan', cid: 'handDan12345', prev: wd2.you });
const wd3 = await d3.wait((m) => m.t === 'welcome', 'welcome d3');
ok(wd3.you === wd.you, 'Bağlantısı tamamen kopmuş Dan de aynı kimlikle döndü');

for (const x of [a3, b, c, d, d2, d3, e]) x.ws.close();
setTimeout(() => process.exit(0), 100);
