// Oturum özeti: sayaçlar, özetin herkese gitmesi, sıfırlanma, önceki özetler; yönetici emojileri kapatınca tepki gitmez.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'recap' + Math.random().toString(36).slice(2, 8);
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const host = client({ name: 'Ali', cid: 'recapAli1234' });
await host.wait((m) => m.t === 'welcome', 'welcome');
const guest = client({ name: 'Ayse', cid: 'recapAyse123' });
await guest.wait((m) => m.t === 'welcome', 'welcome guest');

host.send({ t: 'load', media: { kind: 'youtube', id: 'dQw4w9WgXcQ' } });
await guest.wait((m) => m.t === 'state' && m.state.item, 'loaded');
for (let i = 0; i < 3; i++) guest.send({ t: 'chat', text: 'selam ' + i });
host.send({ t: 'react', emoji: '😂' });
await guest.wait((m) => m.t === 'reaction', 'reaction');
await sleep(1300);
host.send({ t: 'react', emoji: '😢' });
await sleep(400);

guest.send({ t: 'recap' });
const r1 = await host.wait((m) => m.t === 'recap', 'recap to host');
const r2 = await guest.wait((m) => m.t === 'recap', 'recap to guest');
ok(r1.recap.id === r2.recap.id && r1.by.name === 'Ayse', 'Özet odadaki herkese gitti (açan: Ayse)');
const ayse = r1.recap.people.find((p) => p.name === 'Ayse');
const ali = r1.recap.people.find((p) => p.name === 'Ali');
ok(ayse?.chat === 3 && ali?.reactions === 2 && ali?.sad === 1, 'Mesaj ve tepkiler kişi kişi sayıldı');
ok(r1.recap.videos === 1 && r1.recap.peak === 2, 'Video ve en kalabalık an sayıldı');
ok(!JSON.stringify(r1).includes('recapAli1234'), 'Özette tarayıcı kimlikleri yok');

guest.send({ t: 'recap' });
ok((await guest.wait((m) => m.t === 'error', 'empty')).code === 'recap_empty', 'Hemen tekrar basınca: sayaç sıfırlanmış (boş)');
host.send({ t: 'recaps' });
const list = await host.wait((m) => m.t === 'recaps', 'recaps');
ok(list.recaps.length === 1 && list.recaps[0].id === r1.recap.id, 'Önceki özetler listesi');

// Yönetici emojileri kapatır
host.send({ t: 'settings', noReactions: true });
await guest.wait((m) => m.t === 'settings' && m.settings.noReactions, 'noReactions');
host.inbox.length = 0;
guest.send({ t: 'react', emoji: '🔥' });
await sleep(1500);
ok(!host.inbox.some((m) => m.t === 'reaction'), 'Emojiler kapalıyken tepki kimseye gitmiyor');

for (const c of [host, guest]) c.ws.close();
setTimeout(() => process.exit(0), 100);
