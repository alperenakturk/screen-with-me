// Oda yöneticisi, atma ve isim değiştirme.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'host' + Math.random().toString(36).slice(2, 8);
function client(hello, where = room) {
  const ws = new WebSocket(`${base}/api/rooms/${where}/ws`);
  const inbox = [];
  let closed = null;
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('close', (e) => (closed = e.code));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, ...hello })));
  const wait = async (pred, label) => {
    for (let i = 0; i < 100; i++) {
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

b.send({ t: 'rename', name: 'Ayşe K.', avatar: 'dwarf' });
const ren = await a.wait((m) => m.t === 'members' && m.members.some((x) => x.name === 'Ayşe K.'), 'rename');
ok(ren.members.find((x) => x.name === 'Ayşe K.').avatar === 'dwarf', 'İsim ve avatar değişikliği herkese yansıdı');

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
// The close frame can take a moment on the live network.
for (let i = 0; i < 50 && b.closed() === null; i++) await sleep(100);
ok(kickedMsg.code === 'kicked' && b.closed() === 4003, 'Ali, Ayşe’yi attı; Ayşe’nin bağlantısı kapandı');
const left = await a2.wait((m) => m.t === 'members', 'members after kick');
ok(left.members.length === 1, 'Atılan kişi listeden düştü');

const b2 = client({ name: 'Ayse', cid: 'ayseCid12345' });
const again = await b2.wait((m) => m.t === 'error', 'ban');
ok(again.code === 'kicked', 'Atılan Ayşe geri giremiyor');

// Yasak listesi sadece yöneticiye gelir; yönetici yasağı kaldırınca geri girebilir.
const bans = await a2.wait((m) => m.t === 'bans' && m.bans.length === 1, 'bans');
ok(bans.bans[0].name === 'Ayşe K.' && !('cid' in bans.bans[0]), 'Yöneticiye çıkarılanlar listesi geldi (tarayıcı kimliği gizli)');
a2.inbox.length = 0; // eski (boş) listeler karışmasın
a2.send({ t: 'unban', id: bans.bans[0].id });
const cleared = await a2.wait((m) => m.t === 'bans' && m.bans.length === 0, 'unban');
ok(cleared.bans.length === 0, 'Yönetici yasağı kaldırdı');
const b3 = client({ name: 'Ayse', cid: 'ayseCid12345' });
const back = await b3.wait((m) => m.t === 'welcome' || m.t === 'error', 'rejoin');
ok(back.t === 'welcome', 'Yasağı kalkan Ayşe geri girebildi');
b3.send({ t: 'unban', id: 'whatever1' });
const notHost = await b3.wait((m) => m.t === 'error', 'unban not host');
ok(notHost.code === 'not_host', 'Yönetici olmayan yasak kaldıramaz');

// Yönetici kendi ikinci sekmesini (aynı kimlik) çıkarırsa kendini yasaklamaz.
const a3 = client({ name: 'Ali', cid: 'aliCid12345' });
const wa3 = await a3.wait((m) => m.t === 'welcome', 'welcome a3');
a2.send({ t: 'kick', id: wa3.you });
for (let i = 0; i < 20 && a3.closed() === null; i++) await sleep(100);
ok(a3.closed() === 4003 && a3.inbox.some((m) => m.code === 'kicked'), `Yönetici kendi diğer sekmesini kapattı, o sekme yeniden bağlanmaz (${a3.closed()})`);
const a4 = client({ name: 'Ali', cid: 'aliCid12345' });
const wa4 = await a4.wait((m) => m.t === 'welcome' || m.t === 'error', 'welcome a4');
ok(wa4.t === 'welcome', 'Yönetici kendini yasaklamadı');

// Aynı tarayıcıdan farklı isimle giren ikinci kişi (test ederken sık olur): o isim yasaklanır, yönetici değil.
const v = client({ name: 'Veli', cid: 'aliCid12345' });
const wv = await v.wait((m) => m.t === 'welcome', 'welcome veli');
a2.send({ t: 'kick', id: wv.you });
for (let i = 0; i < 20 && v.closed() === null; i++) await sleep(100);
ok(v.closed() === 4003 && a2.closed() === null && a4.closed() === null, 'Aynı tarayıcıdaki Veli atıldı, yönetici sekmeleri açık kaldı');
const v2 = client({ name: 'Veli', cid: 'aliCid12345' });
const wv2 = await v2.wait((m) => m.t === 'welcome' || m.t === 'error', 'veli rejoin');
ok(wv2.t === 'error' && wv2.code === 'kicked', 'Veli aynı isimle geri giremiyor');

// Yeni emoji sayfaları kabul ediliyor.
a4.send({ t: 'react', emoji: '🤮' });
const react = await b3.wait((m) => m.t === 'reaction', 'reaction');
ok(react.emoji === '🤮', 'Yeni emojiler (2. sayfa) herkese gidiyor');

// Handing the host role on (0.9.93.2): only the host may, it goes to that person (all their tabs) for good.
b3.inbox.length = 0;
a4.inbox.length = 0;
b3.send({ t: 'make-host', id: wa4.you });
ok((await b3.wait((m) => m.t === 'error', 'not_host make-host')).code === 'not_host', 'A guest cannot hand the host role on');
// Find Ayşe's member id from Ali's view.
a4.send({ t: 'rename', name: 'Ali' });
const roster = await a4.wait((m) => m.t === 'members', 'roster');
const ayse = roster.members.find((m) => m.name.startsWith('Ay'));
a4.send({ t: 'make-host', id: ayse.id });
const handed = await b3.wait((m) => m.t === 'members' && m.hostId === ayse.id, 'host handed');
ok(handed.hostId === ayse.id, 'The host hands the role to Ayşe; everyone sees the new host');
a4.send({ t: 'kick', id: ayse.id });
ok((await a4.wait((m) => m.t === 'error', 'old host kick')).code === 'not_host', 'The old host is a guest now');
b3.send({ t: 'make-host', id: wa4.you });
const backAgain = await a4.wait((m) => m.t === 'members' && m.hostId !== ayse.id, 'host back');
ok(backAgain.hostId !== ayse.id, 'Ayşe can hand it back');

for (const c of [a2, b3, a4]) c.ws.close();

// Security M2: while the host reloads (20 s grace) the oldest guest acts as host, but may not hand the role to
// themselves for good; the host comes back as host.
{
  const graceRoom = 'grace' + Math.random().toString(36).slice(2, 8);
  const host = client({ name: 'Alex', cid: 'alexCid12345' }, graceRoom);
  const hw = await host.wait((m) => m.t === 'welcome', 'grace host welcome');
  const guest = client({ name: 'Sam', cid: 'samCid123456' }, graceRoom);
  const gw = await guest.wait((m) => m.t === 'welcome', 'grace guest welcome');
  ok(gw.hostId === hw.you, 'Grace room: Alex is the host');
  host.ws.close();
  await guest.wait((m) => m.t === 'members' && m.hostId === gw.you, 'guest acts as host');
  guest.inbox.length = 0;
  guest.send({ t: 'make-host', id: gw.you });
  ok((await guest.wait((m) => m.t === 'error', 'grace make-host')).code === 'not_host', 'During the host\'s reload the acting guest cannot make themselves host');
  const back = client({ name: 'Alex', cid: 'alexCid12345' }, graceRoom);
  const bw = await back.wait((m) => m.t === 'welcome', 'host back welcome');
  ok(bw.hostId === bw.you, 'The host comes back within 20 s and is the host again');
  for (const c of [guest, back]) c.ws.close();
}
setTimeout(() => process.exit(0), 100);
