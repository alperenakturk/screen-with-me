// Bilgi yarışması: lobi, sorular (doğru şık açıklamaya kadar gitmez), herkes cevaplayınca açıklama ve puan, sıradaki
// soruya kendiliğinden geçiş, son soruda kürsü, yeni oyun.
const base = process.argv[2] ?? 'ws://localhost:8787';
const game = 'quiz' + Math.random().toString(36).slice(2, 8);

function client(name, cid) {
  const ws = new WebSocket(`${base}/api/quiz/${game}/ws`);
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

const ali = client('Ali', 'quizAli000001');
const wa = await ali.wait((m) => m.t === 'welcome', 'welcome');
ali.send({ t: 'start' });
ok((await ali.wait((m) => m.t === 'error', 'few')).code === 'too_few', 'Tek kişiyken başlamıyor');
const ayse = client('Ayse', 'quizAyse00001');
const wy = await ayse.wait((m) => m.t === 'welcome', 'welcome ayse');
await ali.wait((m) => m.t === 'state' && m.players.length === 2, 'two');

ali.inbox.length = 0;
ayse.send({ t: 'start' });
const q1 = await ali.wait((m) => m.t === 'state' && m.phase === 'question', 'q1');
ok(q1.n === 1 && q1.total === 10 && q1.options.length === 4 && !('correct' in q1), 'İlk soru geldi: dört şık, doğru şık gizli');

// Ali 0'ı, Ayşe 1'i seçer; açıklamada doğru şık ve puanlar.
ali.send({ t: 'answer', n: 1, pick: 0 });
const mid = await ayse.wait((m) => m.t === 'state' && m.phase === 'question' && m.players.some((p) => p.answered), 'answered');
ok(mid.players.every((p) => !('pick' in p)), 'Kimin neyi seçtiği açıklamaya kadar gizli');
ayse.send({ t: 'answer', n: 1, pick: 1 });
const rev = await ali.wait((m) => m.t === 'state' && m.phase === 'reveal', 'reveal');
const a = rev.players.find((p) => p.id === wa.you);
const y = rev.players.find((p) => p.id === wy.you);
const expectA = rev.correct === 0 ? a.gained > 100 : a.gained === 0;
const expectY = rev.correct === 1 ? y.gained > 100 : y.gained === 0;
ok(Number.isInteger(rev.correct) && a.pick === 0 && y.pick === 1 && expectA && expectY, 'Herkes cevaplayınca açıklama: doğru şık, seçimler, puanlar');
ok(a.score === a.gained && y.score === y.gained, 'Puanlar toplama eklendi');
// İkinci cevap aynı soruya sayılmaz.
ali.send({ t: 'answer', n: 1, pick: 2 });
const q2 = await ali.wait((m) => m.t === 'state' && m.phase === 'question' && m.n === 2, 'q2', 8000);
ok(q2.players.every((p) => !p.answered), '4 sn sonra ikinci soruya geçildi');

// Kalan sorular hızlıca: ikisi de hep 0'ı seçer.
for (let n = 2; n <= 10; n++) {
  if (n > 2) await ali.wait((m) => m.t === 'state' && m.phase === 'question' && m.n === n, `q${n}`, 9000);
  ali.send({ t: 'answer', n, pick: 0 });
  ayse.send({ t: 'answer', n, pick: 0 });
}
const over = await ali.wait((m) => m.t === 'state' && m.phase === 'over', 'over', 9000);
ok(over.players.every((p) => p.score >= 0) && !('question' in over), 'On soru bitti: kürsü');

ali.inbox.length = 0;
ali.send({ t: 'start' });
const again = await ali.wait((m) => m.t === 'state' && m.phase === 'question', 'again');
ok(again.n === 1 && again.players.every((p) => p.score === 0), 'Yeni oyun: puanlar sıfır, ilk soru');

for (const c of [ali, ayse]) c.ws.close();
setTimeout(() => process.exit(0), 100);
