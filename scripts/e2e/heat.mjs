// Zaman çizelgesinde tepkiler: sunucu tepkinin videonun hangi anında atıldığını ekler,
// yeni gelen geçmişi `welcome` ile alır, video değişince sıfırlanır.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'heat' + Math.random().toString(36).slice(2, 8);
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

const ali = client({ name: 'Ali', cid: 'heatAli12345' });
await ali.wait((m) => m.t === 'welcome', 'welcome ali');
ali.send({ t: 'load', media: { kind: 'youtube', id: 'dQw4w9WgXcQ' } });
const loaded = await ali.wait((m) => m.t === 'state' && m.state.item, 'loaded');
const itemId = loaded.state.item.id;
// Duraklatıp 125. saniyeye sar: tepki tam o ana yazılmalı.
ali.send({ t: 'pause', position: 125, at: Date.now() });
await ali.wait((m) => m.t === 'state' && m.state.paused, 'paused');

ali.send({ t: 'react', emoji: '😂' });
const r = await ali.wait((m) => m.t === 'reaction', 'reaction');
ok(r.itemId === itemId && Math.abs(r.at - 125) < 0.5, 'Tepki videonun o anki saniyesiyle geliyor');

ali.send({ t: 'react', emoji: '😂' });
await ali.wait((m) => m.t === 'reaction', 'reaction 2');
ali.send({ t: 'react', emoji: '🔥' });
await ali.wait((m) => m.t === 'reaction', 'reaction 3');

const ayse = client({ name: 'Ayse', cid: 'heatAyse1234' });
const w = await ayse.wait((m) => m.t === 'welcome', 'welcome ayse');
ok(
  w.heat?.itemId === itemId && w.heat.marks.length === 1 && w.heat.marks[0].s === 120 && w.heat.marks[0].n === 3 && w.heat.marks[0].emoji === '😂',
  'Yeni gelen tepki geçmişini welcome ile alıyor (120–130 sn: 3 tepki, en çok 😂)',
);

ali.send({ t: 'load', media: { kind: 'youtube', id: 'jNQXAC9IVRw' } });
await ali.wait((m) => m.t === 'state' && m.state.item && m.state.item.id !== itemId, 'new video');
const can = client({ name: 'Can', cid: 'heatCan12345' });
const w2 = await can.wait((m) => m.t === 'welcome', 'welcome can');
ok(w2.heat === undefined, 'Yeni video açılınca tepki geçmişi sıfırlanıyor');

for (const c of [ali, ayse, can]) c.ws.close();
setTimeout(() => process.exit(0), 100);
