// PlayWithMe XOX: iki oyuncu oturur, üçüncü izler; hamleler sunucuda doğrulanır, kazanan ve skor, rövanş, boş
// koltuğa oturma.
const base = process.argv[2] ?? 'ws://localhost:8787';
const game = 'xox' + Math.random().toString(36).slice(2, 8);

function client(name, cid) {
  const ws = new WebSocket(`${base}/api/games/${game}/ws`);
  const inbox = [];
  let last = null;
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'state') last = m;
  });
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 1, game: 'xox', name, cid })));
  const wait = async (pred, label, ms = 8000) => {
    for (let i = 0; i < ms / 50; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`${name}: timeout ${label}`);
  };
  return {
    ws,
    wait,
    inbox,
    send: (m) => ws.send(JSON.stringify(m)),
    get state() {
      return last;
    },
  };
}
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ali = client('Ali', 'xoxAli0000001');
await ali.wait((m) => m.t === 'welcome', 'welcome ali');
const ayse = client('Ayse', 'xoxAyse000001');
await ayse.wait((m) => m.t === 'welcome', 'welcome ayse');
const can = client('Can', 'xoxCan0000001');
await can.wait((m) => m.t === 'welcome', 'welcome can');
await sleep(300);
const s0 = can.state;
ok(s0.seats[0]?.name === 'Ali' && s0.seats[1]?.name === 'Ayse', 'İlk iki kişi X ve O koltuğunda');
ok(s0.watchers.length === 1 && s0.watchers[0].name === 'Can', 'Üçüncü kişi izleyici');

// Sıra: X başlar; O sırası değilken oynayamaz; izleyici oynayamaz.
ayse.send({ t: 'move', cell: 4 });
await ayse.wait((m) => m.t === 'error' && m.code === 'not_your_turn', 'not your turn');
ok(true, 'Sırası olmayan oynayamıyor');
can.send({ t: 'move', cell: 4 });
await can.wait((m) => m.t === 'error' && m.code === 'not_player', 'not player');
ok(true, 'İzleyici oynayamıyor');

// X kazanır: 0,1,2.
for (const [who, cell] of [[ali, 0], [ayse, 3], [ali, 1], [ayse, 4], [ali, 2]]) {
  who.send({ t: 'move', cell });
  await sleep(150);
}
await sleep(300);
const won = can.state;
ok(won.xox.winner === 'X' && JSON.stringify(won.xox.line) === '[0,1,2]', 'X üç taşı dizdi, kazandı (izleyici de gördü)');
ok(won.score.X === 1 && won.score.O === 0, 'Skor tutuldu');
ali.send({ t: 'move', cell: 5 });
await ali.wait((m) => m.t === 'error', 'no move after win');
ok(true, 'Oyun bitince hamle yok');

// Rövanş: başlayan değişir (O).
ayse.send({ t: 'rematch' });
await sleep(300);
ok(can.state.xox.board.every((c) => c === null) && can.state.xox.turn === 'O', 'Rövanşta tahta temiz, bu el O başlıyor');

// Ayşe çıkar: koltuğu ayrılı ama boş sayılır; Can oturur.
ayse.ws.close();
await sleep(500);
ok(can.state.seats[1]?.online === false, 'Çıkan oyuncunun koltuğu "bağlı değil" görünüyor');
can.send({ t: 'sit', seat: 1 });
await sleep(300);
ok(can.state.seats[1]?.name === 'Can' && can.state.watchers.length === 0, 'İzleyici boşalan koltuğa oturdu');

// Ali yenilerse (aynı tarayıcı kimliği) koltuğunda kalır.
ali.ws.close();
await sleep(300);
const ali2 = client('Ali', 'xoxAli0000001');
await ali2.wait((m) => m.t === 'welcome', 'welcome ali2');
await sleep(300);
ok(ali2.state.seats[0]?.name === 'Ali' && ali2.state.seats[0]?.online === true, 'Yenileyen oyuncu koltuğunda kaldı');

// Emoji: sadece sabit listeden, herkese gider.
can.send({ t: 'react', emoji: '🔥' });
const r = await ali2.wait((m) => m.t === 'react', 'react');
ok(r.emoji === '🔥' && r.from.name === 'Can', 'Emoji herkese gitti');

for (const c of [ali2, can]) c.ws.close();
setTimeout(() => process.exit(0), 100);
