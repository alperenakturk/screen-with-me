// Bugünün özeti: sayaçlar, sadece isteyene gitmesi, sıfırlanmaması, kaydetme; yönetici emojileri kapatınca tepki gitmez.
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

const host = client({ name: 'Alex', cid: 'recapAlex1234' });
await host.wait((m) => m.t === 'welcome', 'welcome');
const guest = client({ name: 'Sam', cid: 'recapSam123' });
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
const r1 = await guest.wait((m) => m.t === 'recap', 'recap to guest');
await sleep(800);
ok(!host.inbox.some((m) => m.t === 'recap'), 'Özet sadece isteyene gitti');
const sam = r1.recap.people.find((p) => p.name === 'Sam');
const alex = r1.recap.people.find((p) => p.name === 'Alex');
ok(sam?.chat === 3 && alex?.reactions === 2 && alex?.sad === 1, 'Mesaj ve tepkiler kişi kişi sayıldı');
ok(r1.recap.videos === 1 && r1.recap.peak === 2, 'Video ve en kalabalık an sayıldı');
ok(!JSON.stringify(r1).includes('recapAlex1234'), 'Özette tarayıcı kimlikleri yok');

host.send({ t: 'recap' });
const again = await host.wait((m) => m.t === 'recap', 'recap again');
ok(again.recap.chat === 3 && again.recap.from === r1.recap.from, 'Tekrar bakınca sayaç sıfırlanmamış (aynı oturum)');
guest.send({ t: 'recap-save' });
const list = await host.wait((m) => m.t === 'recaps' && m.recaps.length === 1, 'recaps');
ok(list.recaps[0].from === r1.recap.from, 'Kaydedilen özet herkesin listesinde');
guest.send({ t: 'recap-save' });
const again2 = await host.wait((m) => m.t === 'recaps', 'recaps again');
ok(again2.recaps.length === 1, 'Aynı oturumu tekrar kaydetmek çoğaltmıyor');

// Yönetici emojileri kapatır
host.send({ t: 'settings', noReactions: true });
await guest.wait((m) => m.t === 'settings' && m.settings.noReactions, 'noReactions');
host.inbox.length = 0;
guest.send({ t: 'react', emoji: '🔥' });
await sleep(1500);
ok(!host.inbox.some((m) => m.t === 'reaction'), 'Emojiler kapalıyken tepki kimseye gitmiyor');

for (const c of [host, guest]) c.ws.close();
setTimeout(() => process.exit(0), 100);
