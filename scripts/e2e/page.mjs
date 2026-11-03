// Sayfa türü: eklentinin yollayacağı "load page + title" mesajı.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'pg' + Math.random().toString(36).slice(2, 8);
const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
const inbox = [];
ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
await new Promise((r) => ws.addEventListener('open', r));
const wait = async (pred) => {
  for (let i = 0; i < 100; i++) {
    const m = inbox.find(pred);
    if (m) return m;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('timeout');
};
ws.send(JSON.stringify({ t: 'hello', v: 3, name: 'Ali' }));
await wait((m) => m.t === 'welcome');
ws.send(JSON.stringify({ t: 'load', media: { kind: 'page', url: 'https://film.example/dizi/bolum-1' }, title: 'Dizi – 1. Bölüm' }));
const s = await wait((m) => m.t === 'state');
// Security L4: a page title chosen by the client carries its site's name.
const check = (pass, label, detail) => {
  if (!pass) throw new Error('FAIL: ' + label + ' ' + JSON.stringify(detail));
  console.log('ok  ' + label);
};
check(s.state.item.media.kind === 'page' && s.state.item.title === 'Dizi – 1. Bölüm · film.example', 'A film page with its tab title is accepted, with the site name next to it', s);
ws.send(JSON.stringify({ t: 'enqueue', media: { kind: 'page', url: 'https://film.example/dizi/bolum-2' } }));
const q = await wait((m) => m.t === 'queue');
const t = await wait((m) => m.t === 'title');
check(q.queue[0].media.kind === 'page' && t.title === 'film.example', 'A film page without a title gets its site name', [q, t]);
ws.close();
setTimeout(() => process.exit(0), 100);
