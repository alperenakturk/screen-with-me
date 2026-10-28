// PlayWithMe XOX: iki oyuncu oturur, üçüncü izler; hamleler sunucuda doğrulanır, kazanan ve skor, rövanş, boş
// koltuğa oturma. Sonda Dört Taş: taş sütunun dibine düşer, dört taş kazanır; başka türün koduna girilemez.
const base = process.argv[2] ?? 'ws://localhost:8787';
const game = 'xox' + Math.random().toString(36).slice(2, 8);

function client(name, cid, { id = game, kind = 'xox' } = {}) {
  const ws = new WebSocket(`${base}/api/games/${id}/ws`);
  const inbox = [];
  let last = null;
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'state') last = m;
  });
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 2, game: kind, name, cid })));
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
/** Waits until `fn()` is truthy (live network delays vary: fixed sleeps made the live run flaky). */
async function until(fn, ms = 8000) {
  for (let i = 0; i < ms / 50; i++) {
    try {
      if (fn()) return true;
    } catch {
      // state not there yet
    }
    await sleep(50);
  }
  return false;
}
/** Plays moves in order, each one only after the watcher has seen the previous one land. */
async function play(watcher, moves, filled) {
  for (const [who, cell] of moves) {
    const before = watcher.state.game.board.filter((c) => c !== null).length;
    who.send({ t: 'move', cell });
    await until(() => watcher.state.game.board.filter((c) => c !== null).length > before);
  }
  return filled;
}

const ali = client('Ali', 'xoxAli0000001');
await ali.wait((m) => m.t === 'welcome', 'welcome ali');
const ayse = client('Ayse', 'xoxAyse000001');
await ayse.wait((m) => m.t === 'welcome', 'welcome ayse');
const can = client('Can', 'xoxCan0000001');
await can.wait((m) => m.t === 'welcome', 'welcome can');
await until(() => can.state?.seats[1]?.name === 'Ayse' && can.state.watchers.length === 1);
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
await play(can, [[ali, 0], [ayse, 3], [ali, 1], [ayse, 4], [ali, 2]]);
await until(() => can.state.game.winner === 'X');
const won = can.state;
ok(won.kind === 'xox' && won.game.winner === 'X' && JSON.stringify(won.game.line) === '[0,1,2]', 'X üç taşı dizdi, kazandı (izleyici de gördü)');
ok(won.score.X === 1 && won.score.O === 0, 'Skor tutuldu');
ali.send({ t: 'move', cell: 5 });
await ali.wait((m) => m.t === 'error', 'no move after win');
ok(true, 'Oyun bitince hamle yok');

// Rövanş: başlayan değişir (O).
ayse.send({ t: 'rematch' });
await until(() => can.state.game.board.every((c) => c === null));
ok(can.state.game.board.every((c) => c === null) && can.state.game.turn === 'O', 'Rövanşta tahta temiz, bu el O başlıyor');

// Ayşe çıkar: koltuğu ayrılı ama boş sayılır; Can oturur.
ayse.ws.close();
await until(() => can.state.seats[1]?.online === false);
ok(can.state.seats[1]?.online === false, 'Çıkan oyuncunun koltuğu "bağlı değil" görünüyor');
can.send({ t: 'sit', seat: 1 });
await until(() => can.state.seats[1]?.name === 'Can');
ok(can.state.seats[1]?.name === 'Can' && can.state.watchers.length === 0, 'İzleyici boşalan koltuğa oturdu');

// Ali yenilerse (aynı tarayıcı kimliği) koltuğunda kalır.
ali.ws.close();
await sleep(300);
const ali2 = client('Ali', 'xoxAli0000001');
await ali2.wait((m) => m.t === 'welcome', 'welcome ali2');
await until(() => ali2.state?.seats[0]?.online === true);
ok(ali2.state.seats[0]?.name === 'Ali' && ali2.state.seats[0]?.online === true, 'Yenileyen oyuncu koltuğunda kaldı');

// Emoji: sadece sabit listeden, herkese gider.
can.send({ t: 'react', emoji: '🔥' });
const r = await ali2.wait((m) => m.t === 'react', 'react');
ok(r.emoji === '🔥' && r.from.name === 'Can', 'Emoji herkese gitti');

for (const c of [ali2, can]) c.ws.close();

// Dört Taş: aynı sunucu nesnesi, başka tür.
const fourId = 'four' + Math.random().toString(36).slice(2, 8);
const red = client('Ali', 'fourAli000001', { id: fourId, kind: 'four' });
await red.wait((m) => m.t === 'welcome', 'welcome red');
const yellow = client('Ayse', 'fourAyse00001', { id: fourId, kind: 'four' });
await yellow.wait((m) => m.t === 'welcome', 'welcome yellow');
await until(() => yellow.state?.kind === 'four');
ok(yellow.state.kind === 'four' && yellow.state.game.board.length === 42, 'Dört Taş odası açıldı (7×6 tahta)');
red.send({ t: 'move', cell: 3 });
await until(() => yellow.state.game.board[5 * 7 + 3] === 'X');
ok(yellow.state.game.board[5 * 7 + 3] === 'X', 'Taş sütunun en altına düştü');
// Yatay dört: kırmızı 0,1,2,3 (sarı üstlerine).
await play(yellow, [[yellow, 3], [red, 0], [yellow, 0], [red, 1], [yellow, 1], [red, 2]]);
await until(() => yellow.state.game.winner === 'X');
ok(yellow.state.game.winner === 'X' && yellow.state.game.line.length === 4, 'Kırmızı yan yana dört taş dizdi, kazandı');
yellow.send({ t: 'move', cell: 7 });
const bad = await yellow.wait((m) => m.t === 'error', 'bad column');
ok(bad.code === 'not_your_turn', 'Oyun bitince (ve olmayan sütuna) hamle yok');
// Başka türün koduna girilemez.
const wrong = client('Can', 'fourCan000001', { id: fourId, kind: 'xox' });
const kindErr = await wrong.wait((m) => m.t === 'error', 'kind');
ok(kindErr.code === 'kind', 'Dört Taş koduna XOX olarak girilemiyor (kind)');
for (const c of [red, yellow, wrong]) c.ws.close();
setTimeout(() => process.exit(0), 100);
