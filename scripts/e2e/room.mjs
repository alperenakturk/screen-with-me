// İki/üç istemciyi sunucuya bağlayıp oda akışını uçtan uca dener.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'e2e' + Math.random().toString(36).slice(2, 8);
const V = 3;

function client(name) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  const waiters = [];
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    const w = waiters.find((w) => w.pred(m));
    if (w) { waiters.splice(waiters.indexOf(w), 1); w.resolve(m); } else inbox.push(m);
  });
  const next = (pred, label) =>
    new Promise((resolve, reject) => {
      const found = inbox.find(pred);
      if (found) { inbox.splice(inbox.indexOf(found), 1); return resolve(found); }
      waiters.push({ pred, resolve });
      setTimeout(() => reject(new Error(`${name}: timeout waiting for ${label}`)), 10000);
    });
  // Like next, but resolves null after `ms` and forgets the wait (for things an outside service decides).
  const maybe = (pred, ms) =>
    new Promise((resolve) => {
      const found = inbox.find(pred);
      if (found) { inbox.splice(inbox.indexOf(found), 1); return resolve(found); }
      const w = { pred, resolve };
      waiters.push(w);
      setTimeout(() => { const i = waiters.indexOf(w); if (i >= 0) { waiters.splice(i, 1); resolve(null); } }, ms);
    });
  const opened = new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  return { ws, next, maybe, opened, inbox, send: (m) => ws.send(JSON.stringify(m)) };
}

const ok = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg); console.log('ok  ' + msg); };
const YT = (id) => ({ kind: 'youtube', id });

const a = client('Alex');
await a.opened;
a.send({ t: 'hello', v: V, name: 'Alex' });
const wa = await a.next((m) => m.t === 'welcome', 'welcome');
ok(wa.members.length === 1 && wa.state.item === null && wa.queue.length === 0, 'Alex odaya girdi, oda boş');

const b = client('Sam');
await b.opened;
b.send({ t: 'hello', v: V, name: 'Sam' });
await b.next((m) => m.t === 'welcome', 'welcome');
await a.next((m) => m.t === 'members', 'members');

const sentAt = Date.now();
a.send({ t: 'enqueue', media: YT('aqz-KE-bpKQ') });
const first = await b.next((m) => m.t === 'state' && m.action === 'load', 'load');
ok(first.state.item.media.id === 'aqz-KE-bpKQ' && !first.state.paused, `Boş odada sıraya eklenen video hemen başladı (${Date.now() - sentAt} ms)`);
// The title comes from YouTube's oEmbed, an outside service: when it doesn't answer in time the room keeps its fallback
// (no title message) and the test says which happened instead of failing (Planner, card Y1: an outside service must
// not decide "live e2e green on the first attempt").
const tt = await b.maybe((m) => m.t === 'title', 8000);
if (tt) ok(tt.itemId === first.state.item.id && typeof tt.title === 'string', `Başlık sonradan geldi: "${tt.title}" (${Date.now() - sentAt} ms)`);
else console.log("ok  YouTube's title service didn't answer in 8 s: the room keeps the fallback title (no title message)");

b.send({ t: 'enqueue', media: YT('dQw4w9WgXcQ') });
const q1 = await a.next((m) => m.t === 'queue', 'queue add');
ok(q1.queue.length === 1 && q1.change.kind === 'add' && q1.change.by.name === 'Sam', 'Sam sıraya ekledi, Alex gördü');

a.send({ t: 'enqueue', media: YT('jNQXAC9IVRw') });
const q2 = await b.next((m) => m.t === 'queue' && m.queue.length === 2, 'queue add 2');
const [x, y] = q2.queue;

a.send({ t: 'move', id: y.id, to: 0 });
const q3 = await b.next((m) => m.t === 'queue' && m.change?.kind === 'move', 'queue move');
ok(q3.queue[0].id === y.id, 'Sıra yeniden düzenlendi');

a.send({ t: 'next', from: first.state.item.id });
b.send({ t: 'next', from: first.state.item.id });
const n = await a.next((m) => m.t === 'state' && m.action === 'next', 'next');
ok(n.state.item.id === y.id, 'Video bitince sıradakine geçildi');
await new Promise((r) => setTimeout(r, 300));
ok(!a.inbox.some((m) => m.t === 'state' && m.action === 'next'), 'Aynı anda gelen iki "bitti" sadece bir kez uygulandı');

b.send({ t: 'jump', id: x.id });
const j = await a.next((m) => m.t === 'state' && m.action === 'load' && m.state.item.id === x.id, 'jump');
ok(j.state.item.id === x.id, 'Sıradan bir video seçilip hemen oynatıldı');

b.send({ t: 'react', emoji: '🔥' });
const r = await a.next((m) => m.t === 'reaction', 'reaction');
ok(r.emoji === '🔥' && r.by.name === 'Sam', 'Emoji tepkisi ulaştı');

a.send({ t: 'chat', text: 'selam <b>herkes</b>' });
const c1 = await b.next((m) => m.t === 'chat', 'chat');
ok(c1.message.text === 'selam <b>herkes</b>' && c1.message.by.name === 'Alex', 'Sohbet mesajı ulaştı (metin olduğu gibi, HTML olarak işlenmez)');

// Art arda basmak serbest ama kötüye kullanım sınırı var (RateLimiter(12, 5): bir anda en fazla ~12).
for (let i = 0; i < 40; i++) b.send({ t: 'react', emoji: '😂' });
await new Promise((r) => setTimeout(r, 500));
const got = a.inbox.filter((m) => m.t === 'reaction').length;
ok(got >= 10 && got <= 16, `Emoji yağmuru serbest ama sınırlı (40 gönderildi, ${got} ulaştı)`);

const c = client('Max');
await c.opened;
c.send({ t: 'hello', v: V, name: 'Max' });
const wc = await c.next((m) => m.t === 'welcome', 'welcome');
ok(wc.state.item.id === x.id && wc.chat.length === 1, 'Sonradan gelen Max videoyu ve sohbet geçmişini aldı');

const old = client('Eski');
await old.opened;
old.send({ t: 'hello', v: V - 1, name: 'Eski' });
const ve = await old.next((m) => m.t === 'error', 'version error');
ok(ve.code === 'version', 'Eski sürüm istemciye "sayfayı yenile" hatası gitti');

for (const k of [a, b, c, old]) k.ws.close();
console.log('\nTüm uçtan uca kontroller geçti.');
setTimeout(() => process.exit(0), 100);
