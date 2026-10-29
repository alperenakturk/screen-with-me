// Çiz-Bil: lobi, kelime seçimi (sadece çizene), çizimin aktarılması, geç gelenin çizimi alması, tahminler (yanlış
// herkese, "yaklaştın" sadece tahmin edene, doğru bilenin puanı), bilenlerin gizli sohbeti, herkes bilince turun
// bitmesi ve kelimenin açıklanması, sıranın sonraki çizene geçmesi.
const base = process.argv[2] ?? 'ws://localhost:8787';
const game = 'draw' + Math.random().toString(36).slice(2, 8);

function client(name, cid) {
  const ws = new WebSocket(`${base}/api/draw/${game}/ws`);
  const inbox = [];
  let last = null;
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'state') last = m;
  });
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 1, name, cid, lang: 'tr' })));
  const wait = async (pred, label, ms = 8000) => {
    for (let i = 0; i < ms / 50; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error(`${name}: timeout ${label}`);
  };
  return { ws, wait, inbox, send: (m) => ws.send(JSON.stringify(m)), get state() { return last; } };
}
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ali = client('Ali', 'drawAli000001');
const wa = await ali.wait((m) => m.t === 'welcome', 'welcome');
ali.send({ t: 'start' });
const few = await ali.wait((m) => m.t === 'error', 'too few');
ok(few.code === 'too_few', 'Tek kişiyken oyun başlamıyor (too_few)');
const ayse = client('Ayse', 'drawAyse00001');
const wy = await ayse.wait((m) => m.t === 'welcome', 'welcome ayse');
const can = client('Can', 'drawCan000001');
const wc = await can.wait((m) => m.t === 'welcome', 'welcome can');
await sleep(300);
ok(can.state.phase === 'lobby' && can.state.players.length === 3, 'Üç kişi lobide');

ayse.send({ t: 'start' });
const choices = await ali.wait((m) => m.t === 'choices', 'choices');
ok(choices.words.length === 3, 'İlk çizen (ilk gelen Ali) üç kelime aldı');
await sleep(200);
ok(!ayse.inbox.some((m) => m.t === 'choices') && can.state.phase === 'choose' && can.state.drawer === wa.you, 'Kelimeler sadece çizene gitti, diğerleri "seçiyor" görüyor');

ali.send({ t: 'choose', index: 1 });
const word = choices.words[1];
await ali.wait((m) => m.t === 'state' && m.phase === 'draw', 'draw ali');
await sleep(200);
ok(ali.state.word === word && !('word' in ayse.state) && ayse.state.hint.replace(/[_ ]/g, '') === '', 'Kelime sadece çizende; diğerlerinde "_ _ _"');

// Çizim: Ali çizer, Ayşe ve Can görür; Ayşe çizemez.
ali.send({ t: 'stroke', s: { c: 2, w: 1, p: [100, 100, 200, 150, 300, 220] } });
const st = await can.wait((m) => m.t === 'stroke', 'stroke');
ok(st.s.p.length === 6 && st.s.c === 2, 'Çizgi diğerlerine ulaştı');
ayse.send({ t: 'stroke', s: { c: 0, w: 0, p: [1, 1, 2, 2] } });
const nd = await ayse.wait((m) => m.t === 'error', 'not drawer');
ok(nd.code === 'not_drawer', 'Çizen olmayan çizemiyor');

// Yanlış tahmin herkese; doğru tahmin metni kimseye gitmez, puan.
ayse.send({ t: 'guess', text: 'yanlış kelime' });
const wrong = await can.wait((m) => m.t === 'guess', 'wrong guess');
ok(wrong.text === 'yanlış kelime' && wrong.name === 'Ayse', 'Yanlış tahmin herkese göründü');
ayse.send({ t: 'guess', text: word.toUpperCase() });
const right = await can.wait((m) => m.t === 'correct', 'correct');
await sleep(200);
ok(right.name === 'Ayse' && right.points > 100 && !can.inbox.some((m) => m.t === 'guess' && m.text.toLowerCase() === word), 'Ayşe bildi (puan > 100), kelime kimseye yazılmadı');
// The scores come with the next state, after the server has saved the guess (on the live server that can take more than
// 200 ms): wait for it instead of reading the last state at once.
const scoreOf = () => ali.state.players.find((p) => p.name === 'Ali').score;
for (let i = 0; i < 60 && scoreOf() !== 25; i++) await sleep(50);
ok(scoreOf() === 25, 'Çizen her bilen için 25 puan aldı');

// Bilenler kendi arasında: Ayşe'nin mesajı Can'a gitmez, Ali'ye gider.
ayse.send({ t: 'guess', text: 'çok kolaydı' });
const secret = await ali.wait((m) => m.t === 'guess' && m.secret, 'secret');
await sleep(200);
ok(secret.text === 'çok kolaydı' && !can.inbox.some((m) => m.t === 'guess' && m.text === 'çok kolaydı'), 'Bilenin mesajı sadece çizene ve bilenlere gitti');

// Geç gelen o ana kadarki çizimi alır.
const deniz = client('Deniz', 'drawDeniz0001');
const list = await deniz.wait((m) => m.t === 'strokes', 'late strokes');
ok(list.list.length === 1, 'Geç gelen o ana kadarki çizimi aldı');
deniz.send({ t: 'guess', text: word });
await deniz.wait((m) => m.t === 'correct', 'deniz correct');
can.send({ t: 'guess', text: word });
const reveal = await ayse.wait((m) => m.t === 'state' && m.phase === 'reveal', 'reveal', 6000);
ok(reveal.word === word, 'Herkes bilince tur bitti, kelime herkese açıklandı');

// Sıradaki çizen: Ayşe (geliş sırası).
const next = await ayse.wait((m) => m.t === 'choices', 'next choices', 12000);
ok(next.words.length === 3 && ayse.state.drawer === wy.you, 'Sıra Ayşe’ye geçti, kelimeleri o seçiyor');

// Sıfırla: lobi, puanlar 0. (Kutuda oyun başlamadan önceki "lobi" mesajları var: önce boşalt.)
can.inbox.length = 0;
can.send({ t: 'reset' });
await can.wait((m) => m.t === 'state' && m.phase === 'lobby', 'lobby');
ok(can.state.players.every((p) => p.score === 0), 'Sıfırla: lobiye dönüldü, puanlar sıfır');

for (const c of [ali, ayse, can, deniz]) c.ws.close();
setTimeout(() => process.exit(0), 100);
