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

const alex = client('Alex', 'xoxAlex0000001');
await alex.wait((m) => m.t === 'welcome', 'welcome alex');
const sam = client('Sam', 'xoxSam000001');
await sam.wait((m) => m.t === 'welcome', 'welcome sam');
const max = client('Max', 'xoxMax0000001');
await max.wait((m) => m.t === 'welcome', 'welcome can');
await until(() => max.state?.seats[1]?.name === 'Sam' && max.state.watchers.length === 1);
const s0 = max.state;
ok(s0.seats[0]?.name === 'Alex' && s0.seats[1]?.name === 'Sam', 'İlk iki kişi X ve O koltuğunda');
ok(s0.watchers.length === 1 && s0.watchers[0].name === 'Max', 'Üçüncü kişi izleyici');

// Sıra: X başlar; O sırası değilken oynayamaz; izleyici oynayamaz.
sam.send({ t: 'move', cell: 4 });
await sam.wait((m) => m.t === 'error' && m.code === 'not_your_turn', 'not your turn');
ok(true, 'Sırası olmayan oynayamıyor');
max.send({ t: 'move', cell: 4 });
await max.wait((m) => m.t === 'error' && m.code === 'not_player', 'not player');
ok(true, 'İzleyici oynayamıyor');

// X kazanır: 0,1,2.
await play(max, [[alex, 0], [sam, 3], [alex, 1], [sam, 4], [alex, 2]]);
await until(() => max.state.game.winner === 'X');
const won = max.state;
ok(won.kind === 'xox' && won.game.winner === 'X' && JSON.stringify(won.game.line) === '[0,1,2]', 'X üç taşı dizdi, kazandı (izleyici de gördü)');
ok(won.score.X === 1 && won.score.O === 0, 'Skor tutuldu');
alex.send({ t: 'move', cell: 5 });
await alex.wait((m) => m.t === 'error', 'no move after win');
ok(true, 'Oyun bitince hamle yok');

// Rövanş: başlayan değişir (O).
sam.send({ t: 'rematch' });
await until(() => max.state.game.board.every((c) => c === null));
ok(max.state.game.board.every((c) => c === null) && max.state.game.turn === 'O', 'Rövanşta tahta temiz, bu el O başlıyor');

// Sam çıkar: koltuğu ayrılı ama boş sayılır; Max oturur.
sam.ws.close();
await until(() => max.state.seats[1]?.online === false);
ok(max.state.seats[1]?.online === false, 'Çıkan oyuncunun koltuğu "bağlı değil" görünüyor');
max.send({ t: 'sit', seat: 1 });
await until(() => max.state.seats[1]?.name === 'Max');
ok(max.state.seats[1]?.name === 'Max' && max.state.watchers.length === 0, 'İzleyici boşalan koltuğa oturdu');

// Alex yenilerse (aynı tarayıcı kimliği) koltuğunda kalır.
alex.ws.close();
await sleep(300);
const alex2 = client('Alex', 'xoxAlex0000001');
await alex2.wait((m) => m.t === 'welcome', 'welcome alex2');
await until(() => alex2.state?.seats[0]?.online === true);
ok(alex2.state.seats[0]?.name === 'Alex' && alex2.state.seats[0]?.online === true, 'Yenileyen oyuncu koltuğunda kaldı');

// Emoji: sadece sabit listeden, herkese gider.
max.send({ t: 'react', emoji: '🔥' });
const r = await alex2.wait((m) => m.t === 'react', 'react');
ok(r.emoji === '🔥' && r.from.name === 'Max', 'Emoji herkese gitti');

for (const c of [alex2, max]) c.ws.close();

// Dört Taş: aynı sunucu nesnesi, başka tür.
const fourId = 'four' + Math.random().toString(36).slice(2, 8);
const red = client('Alex', 'fourAlex000001', { id: fourId, kind: 'four' });
await red.wait((m) => m.t === 'welcome', 'welcome red');
const yellow = client('Sam', 'fourSam00001', { id: fourId, kind: 'four' });
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
const wrong = client('Max', 'fourMax000001', { id: fourId, kind: 'xox' });
const kindErr = await wrong.wait((m) => m.t === 'error', 'kind');
ok(kindErr.code === 'kind', 'Dört Taş koduna XOX olarak girilemiyor (kind)');
for (const c of [red, yellow, wrong]) c.ws.close();
setTimeout(() => process.exit(0), 100);
