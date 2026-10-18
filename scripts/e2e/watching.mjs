// "Herkes odaya dönmeden yeni video yok": odada bir sayfa (film) açıkken, o sayfada eklentiyle
// izleyen biri varsa siteden yeni video açılamaz; o kişi odaya dönünce açılabilir.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'watch' + Math.random().toString(36).slice(2, 8);
function client(hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, ...hello })));
  const wait = async (pred, label) => {
    for (let i = 0; i < 40; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('timeout ' + label);
  };
  return { ws, wait, inbox, send: (m) => ws.send(JSON.stringify(m)) };
}
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const site = client({ name: 'Ali', cid: 'watchAli1234', client: 'web' });
await site.wait((m) => m.t === 'welcome', 'welcome site');
site.send({ t: 'load', media: { kind: 'page', url: 'https://example.com/film' }, title: 'Film' });
await site.wait((m) => m.t === 'state' && m.state.item?.media.kind === 'page', 'page loaded');

const ext = client({ name: 'Ayse', cid: 'watchAyse123', client: 'ext' });
const we = await ext.wait((m) => m.t === 'welcome', 'welcome ext');
const members = await site.wait((m) => m.t === 'members' && m.members.length === 2, 'members');
ok(members.members.find((m) => m.name === 'Ayse').client === 'ext', 'Filmdeki kişi listede "eklentide" olarak görünüyor');

site.send({ t: 'load', media: { kind: 'youtube', id: 'dQw4w9WgXcQ' } });
const err = await site.wait((m) => m.t === 'error', 'refused');
ok(err.code === 'others_watching', 'Biri hâlâ filmdeyken siteden yeni video açılamıyor');

site.send({ t: 'enqueue', media: { kind: 'youtube', id: 'dQw4w9WgXcQ' } });
const q = await site.wait((m) => m.t === 'queue', 'queue');
ok(q.queue.length === 1, 'Sıraya eklemek serbest (film bölünmüyor)');

ext.send({ t: 'load', media: { kind: 'page', url: 'https://example.com/film-2' }, title: 'Film 2' });
const s2 = await site.wait((m) => m.t === 'state' && m.state.item?.media.url === 'https://example.com/film-2', 'ext share');
ok(!!s2, 'Filmdeki kişi eklentiden yeni sayfa paylaşabilir');

// Ayşe "Odaya dön" der: eklenti bağlantısı kapanır, siteden katılır.
ext.ws.close();
await sleep(300);
const back = client({ name: 'Ayse', cid: 'watchAyse123', client: 'web' });
await back.wait((m) => m.t === 'welcome', 'welcome back');
site.inbox.length = 0;
site.send({ t: 'load', media: { kind: 'youtube', id: 'dQw4w9WgXcQ' } });
const s3 = await site.wait((m) => m.t === 'state' || m.t === 'error', 'load after back');
ok(s3.t === 'state' && s3.state.item?.media.kind === 'youtube', 'Herkes odaya dönünce yeni video açılabiliyor');
void we;

for (const c of [site, back]) c.ws.close();
setTimeout(() => process.exit(0), 100);
