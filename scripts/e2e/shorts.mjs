// Shorts: link işareti (short) korunur, ↑ ile bir öncekine dönülür, döngüde biten video başa sarar.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'shorts' + Math.random().toString(36).slice(2, 8);
function client(hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, ...hello })));
  const wait = async (pred, label, ms = 10000) => {
    for (let i = 0; i < ms / 100; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('timeout ' + label);
  };
  return { ws, wait, inbox, send: (m) => ws.send(JSON.stringify(m)) };
}
const ok = (c, m) => { if (!c) throw new Error('FAIL: ' + m); console.log('ok  ' + m); };
const short = (id) => ({ kind: 'youtube', id, short: true });

const host = client({ name: 'Ali', cid: 'shortsAli1234' });
await host.wait((m) => m.t === 'welcome', 'welcome');
const guest = client({ name: 'Ayse', cid: 'shortsAyse123' });
await guest.wait((m) => m.t === 'welcome', 'welcome guest');

host.send({ t: 'load', media: short('dQw4w9WgXcQ') });
const first = await guest.wait((m) => m.t === 'state' && m.state.item?.media.id === 'dQw4w9WgXcQ', 'loaded');
ok(first.state.item.media.short === true, 'Shorts işareti sunucudan geçiyor');
host.send({ t: 'enqueue', media: short('jNQXAC9IVRw') });
await guest.wait((m) => m.t === 'queue' && m.queue.length === 1, 'queued');

// Sonraki (↓), sonra bir önceki (↑): şu an oynayan sıranın başına geri girer.
guest.send({ t: 'next', from: first.state.item.id });
const second = await guest.wait((m) => m.t === 'state' && m.state.item?.media.id === 'jNQXAC9IVRw', 'next');
guest.send({ t: 'prev', from: second.state.item.id });
const back = await guest.wait((m) => m.t === 'state' && m.state.item?.media.id === 'dQw4w9WgXcQ', 'prev');
ok(back.state.item.id === first.state.item.id && back.state.position === 0, 'Bir önceki Shorts baştan açıldı');
const queue = await guest.wait((m) => m.t === 'queue' && m.queue[0]?.id === second.state.item.id, 'queue after prev');
ok(queue.queue.length === 1, 'Geçilen video sıranın başına döndü');
guest.send({ t: 'prev', from: back.state.item.id });
await new Promise((r) => setTimeout(r, 600));
ok(!guest.inbox.some((m) => m.t === 'state'), 'Dönülecek önceki yokken hiçbir şey olmuyor');

// Döngü: sadece yönetici açar; açıkken biten Shorts sıradakine geçmez, başa sarar.
guest.send({ t: 'settings', loop: true });
ok((await guest.wait((m) => m.t === 'error', 'guest loop')).code === 'not_host', 'Döngüyü sadece yönetici açabiliyor');
host.send({ t: 'settings', loop: true });
await guest.wait((m) => m.t === 'settings' && m.settings.loop === true, 'loop on');
host.send({ t: 'seek', position: 30, at: Date.now() });
await guest.wait((m) => m.t === 'state' && m.action === 'seek' && Math.round(m.state.position) === 30, 'seek 30');
guest.send({ t: 'next', from: back.state.item.id, end: true });
const looped = await guest.wait((m) => m.t === 'state' && m.action === 'seek', 'looped');
ok(looped.state.item.id === back.state.item.id && looped.state.position === 0 && !looped.state.paused, 'Döngüde biten Shorts başa sardı');
// Döngü açıkken de "Sonraki" (end olmadan) geçer.
guest.send({ t: 'next', from: back.state.item.id });
const skipped = await guest.wait((m) => m.t === 'state' && m.action === 'next', 'skip in loop');
ok(skipped.state.item.media.id === 'jNQXAC9IVRw', 'Döngüdeyken de sonrakine geçilebiliyor');

host.ws.close();
guest.ws.close();
process.exit(0);
