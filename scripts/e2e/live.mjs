// Yayın (ekran paylaşımı / kamera): odada tek yayın, en fazla 4 izleyici, bağlantı mesajları sadece yayıncı ile
// izleyicisi arasında, yayıncı çıkınca izleyiciler bırakılır.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'live' + Math.random().toString(36).slice(2, 8);
const V = Number(process.env.SWM_V ?? 3);
function client(hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  let members = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'welcome' || m.t === 'members') members = m.members;
  });
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: V, ...hello })));
  const wait = async (pred, label, ms = 8000) => {
    for (let i = 0; i < ms / 50; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error('timeout ' + label);
  };
  return { ws, wait, inbox, send: (m) => ws.send(JSON.stringify(m)), get members() { return members; } };
}
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const welcome = await (async () => {
  const a = client({ name: 'Alex', cid: 'liveAlex000001' });
  const w = await a.wait((m) => m.t === 'welcome', 'welcome');
  return { a, w };
})();
const { a } = welcome;
if (!welcome.w.voice) {
  console.log('(sesli sohbet/yayın bu sunucuda kapalı: test atlandı)');
  process.exit(0);
}
const b = client({ name: 'Sam', cid: 'liveSam00001' });
await b.wait((m) => m.t === 'welcome', 'welcome b');

// İzlenecek yayın yokken izleme isteği yok sayılır.
b.send({ t: 'live-watch', on: true });
await sleep(300);
ok(!b.members.find((m) => m.name === 'Sam')?.watching, 'Yayın yokken izleyici olunamıyor');

a.send({ t: 'live', on: true, kind: 'screen' });
await b.wait((m) => m.t === 'members' && m.members.some((x) => x.name === 'Alex' && x.live === 'screen'), 'alex live');
ok(true, 'Alex yayında (ekran)');
b.send({ t: 'live', on: true, kind: 'camera' });
const busy = await b.wait((m) => m.t === 'error', 'busy');
ok(busy.code === 'live_busy', 'İkinci yayın reddedildi (live_busy)');

// Yayın bağlantı mesajı: izlemeyen birine gitmez; izleyince gider.
a.send({ t: 'live-signal', to: b.members.find((m) => m.name === 'Sam').id, data: { candidate: { candidate: 'x' } } });
await sleep(300);
ok(!b.inbox.some((m) => m.t === 'live-signal'), 'İzlemeyen kişiye yayın bağlantı mesajı gitmiyor');
b.send({ t: 'live-watch', on: true });
await a.wait((m) => m.t === 'members' && m.members.some((x) => x.name === 'Sam' && x.watching), 'watching');
const samId = a.members.find((m) => m.name === 'Sam').id;
a.send({ t: 'live-signal', to: samId, data: { sdp: { type: 'offer', sdp: 'v=0' } } });
const sig = await b.wait((m) => m.t === 'live-signal', 'signal');
ok(sig.from === a.members.find((m) => m.name === 'Alex').id, 'İzleyene yayıncının teklifi ulaştı (gönderen belli)');

// İzleyici sınırı: 4.
const extra = [];
for (let i = 0; i < 3; i++) {
  const e = client({ name: `W${i}`, cid: `liveW${i}0000000` });
  await e.wait((m) => m.t === 'welcome', 'welcome extra');
  e.send({ t: 'live-watch', on: true });
  extra.push(e);
}
await a.wait((m) => m.t === 'members' && m.members.filter((x) => x.watching).length === 4, 'four watching');
ok(true, '4 kişi izliyor');
const c = client({ name: 'Max', cid: 'liveMax000001' });
await c.wait((m) => m.t === 'welcome', 'welcome c');
c.send({ t: 'live-watch', on: true });
const full = await c.wait((m) => m.t === 'error', 'full');
ok(full.code === 'live_full', '5. izleyici reddedildi (live_full)');

// Yönetici (Alex, ilk giren) başkasının yayınını durdurabilir; yönetici olmayan durduramaz. (Eski mesajlar karışmasın
// diye her adımdan önce kutular boşaltılır.)
const clear = () => [a, b, c].forEach((x) => (x.inbox.length = 0));
const live = (x, name, on = true) => (m) => m.t === 'members' && m.members.some((y) => y.name === name && !!y.live === on);
clear();
a.send({ t: 'live', on: false });
await b.wait(live(b, 'Alex', false), 'alex off');
clear();
b.send({ t: 'live', on: true, kind: 'camera' });
await a.wait(live(a, 'Sam'), 'sam live');
c.send({ t: 'live-stop' });
const notHost = await c.wait((m) => m.t === 'error', 'not host');
ok(notHost.code === 'not_host', 'Yönetici olmayan yayını durduramıyor (not_host)');
clear();
a.send({ t: 'live-stop' });
const stopped = await b.wait((m) => m.t === 'error', 'stopped');
ok(stopped.code === 'live_stopped', 'Yönetici yayını durdurdu, yayıncıya haber gitti (live_stopped)');
await a.wait((m) => m.t === 'members' && !m.members.some((x) => x.live || x.watching), 'stopped members');
ok(true, 'Durdurulan yayın ve izleyicileri listeden kalktı');
// "Sadece yönetici yayın açsın": açılınca başkasının süren yayını kapanır, sonra açamaz; yönetici açabilir.
clear();
b.send({ t: 'live', on: true, kind: 'camera' });
await a.wait(live(a, 'Sam'), 'sam live again');
clear();
a.send({ t: 'settings', liveHostOnly: true });
const locked = await b.wait((m) => m.t === 'error', 'locked stop');
ok(locked.code === 'live_stopped', 'Kilit açılınca başkasının yayını kapandı');
await b.wait((m) => m.t === 'settings' && m.settings.liveHostOnly === true, 'settings');
b.send({ t: 'live', on: true, kind: 'screen' });
const denied = await b.wait((m) => m.t === 'error', 'live host');
ok(denied.code === 'live_host', 'Kilitliyken yönetici olmayan yayın açamıyor (live_host)');
clear();
a.send({ t: 'live', on: true, kind: 'screen' });
await b.wait(live(b, 'Alex'), 'host live');
ok(true, 'Kilitliyken yönetici yayın açabiliyor');

// Yayıncı çıkınca yayın biter, izleyiciler bırakılır.
a.ws.close();
await b.wait((m) => m.t === 'members' && !m.members.some((x) => x.live || x.watching), 'cleared');
ok(true, 'Yayıncı çıkınca yayın ve izleyiciler kalktı');

for (const x of [b, c, ...extra]) x.ws.close();
setTimeout(() => process.exit(0), 100);
