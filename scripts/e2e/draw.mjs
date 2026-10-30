// Çiz-Bil: lobi, kelime seçimi (sadece çizene), çizimin aktarılması, geç gelenin çizimi alması, tahminler (yanlış
// herkese, "yaklaştın" sadece tahmin edene, doğru bilenin puanı), bilenlerin gizli sohbeti, herkes bilince turun
// bitmesi ve kelimenin açıklanması, sıranın sonraki çizene geçmesi.
const base = process.argv[2] ?? 'ws://localhost:8787';
const game = 'draw' + Math.random().toString(36).slice(2, 8);

function client(name, cid, id = game) {
  const ws = new WebSocket(`${base}/api/draw/${id}/ws`);
  const inbox = [];
  let last = null;
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'state') last = m;
  });
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 2, name, cid, lang: 'tr' })));
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
ok(right.name === 'Ayse' && right.rank === 1 && right.points > 150 && !can.inbox.some((m) => m.t === 'guess' && m.text.toLowerCase() === word), 'Ayşe guessed first (#1, > 150 points), the word was shown to nobody');

// Bilenler kendi arasında: Ayşe'nin mesajı Can'a gitmez, Ali'ye gider.
ayse.send({ t: 'guess', text: 'çok kolaydı' });
const secret = await ali.wait((m) => m.t === 'guess' && m.secret, 'secret');
await sleep(200);
ok(secret.text === 'çok kolaydı' && !can.inbox.some((m) => m.t === 'guess' && m.text === 'çok kolaydı'), 'Bilenin mesajı sadece çizene ve bilenlere gitti');

// Geç gelen o ana kadarki çizimi alır.
const deniz = client('Deniz', 'drawDeniz0001');
const list = await deniz.wait((m) => m.t === 'strokes', 'late strokes');
ok(list.list.length === 1, 'Geç gelen o ana kadarki çizimi aldı');
// Can tries three wrong words first (two are free, the third costs 10 %).
for (const w of ['xx1', 'xx2', 'xx3']) can.send({ t: 'guess', text: w });
await sleep(400);
deniz.send({ t: 'guess', text: word });
const second = await deniz.wait((m) => m.t === 'correct' && m.name === 'Deniz', 'deniz correct');
ok(second.rank === 2 && second.points < right.points, 'The second guesser gets less than the first');
can.send({ t: 'guess', text: word });
const third = await can.wait((m) => m.t === 'correct' && m.name === 'Can', 'can correct');
ok(third.rank === 3 && third.points < second.points, 'The third guesser, after three wrong tries, gets less still');
const reveal = await ayse.wait((m) => m.t === 'state' && m.phase === 'reveal', 'reveal', 6000);
ok(reveal.word === word, 'Everyone guessed: the round ended, the word was shown to everyone');
const drawerGain = reveal.players.find((p) => p.id === wa.you).gained;
const average = Math.round((right.points + second.points + third.points) / 3);
ok(drawerGain === average && reveal.players.find((p) => p.id === wa.you).score === drawerGain, 'The drawer got the guessers’ average (everyone guessed)');

// Sıradaki çizen: Ayşe (geliş sırası).
const next = await ayse.wait((m) => m.t === 'choices', 'next choices', 12000);
ok(next.words.length === 3 && ayse.state.drawer === wy.you, 'Sıra Ayşe’ye geçti, kelimeleri o seçiyor');

// Sıfırla: lobi, puanlar 0. (Kutuda oyun başlamadan önceki "lobi" mesajları var: önce boşalt.)
can.inbox.length = 0;
can.send({ t: 'reset' });
await can.wait((m) => m.t === 'state' && m.phase === 'lobby', 'lobby');
ok(can.state.players.every((p) => p.score === 0), 'Sıfırla: lobiye dönüldü, puanlar sıfır');

for (const c of [ali, ayse, can, deniz]) c.ws.close();

// A short game: the host picks English and one round each; two turns, then the podium.
const short = 'draw' + Math.random().toString(36).slice(2, 8);
const eda = client('Eda', 'drawEda000001', short);
const ew = await eda.wait((m) => m.t === 'welcome', 'welcome eda');
const fat = client('Fat', 'drawFat000001', short);
await fat.wait((m) => m.t === 'welcome', 'welcome fat');
await sleep(300);
ok(eda.state.host === ew.you && eda.state.rounds === 2, 'The first player is the host; default: everyone draws twice');
fat.send({ t: 'settings', rounds: 1 });
ok((await fat.wait((m) => m.t === 'error', 'not host')).code === 'not_host', 'Only the host changes the settings');
eda.send({ t: 'settings', rounds: 1, lang: 'en' });
await fat.wait((m) => m.t === 'state' && m.rounds === 1 && m.lang === 'en', 'settings');
eda.send({ t: 'start' });
for (const [drawer, guesser] of [[eda, fat], [fat, eda]]) {
  const words = await drawer.wait((m) => m.t === 'choices', 'short choices', 12000);
  ok(words.words.every((w) => /^[a-z ]+$/.test(w)), 'English words');
  drawer.send({ t: 'choose', index: 0 });
  await guesser.wait((m) => m.t === 'state' && m.phase === 'draw', 'short draw');
  guesser.send({ t: 'guess', text: words.words[0] });
  await guesser.wait((m) => m.t === 'state' && m.phase === 'reveal', 'short reveal');
}
const end = await eda.wait((m) => m.t === 'state' && m.phase === 'over', 'over', 12000);
ok(end.players.every((p) => p.score > 0), 'Everyone drew once: podium');
for (const c of [eda, fat]) c.ws.close();
setTimeout(() => process.exit(0), 100);
