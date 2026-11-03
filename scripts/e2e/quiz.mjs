// Quiz: lobby, host settings (language, topic, length; others get not_host), questions (the right option stays secret
// until the reveal), the 50:50 joker (only to its user, once per game), reveal with points and rank, moving on by
// itself, podium at the end, new game with new questions.
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

const ali = client('Ali', 'quizAli000001');
const wa = await ali.wait((m) => m.t === 'welcome', 'welcome');
ali.send({ t: 'start' });
ok((await ali.wait((m) => m.t === 'error', 'few')).code === 'too_few', 'Tek kişiyken başlamıyor');
const ayse = client('Ayse', 'quizAyse00001');
const wy = await ayse.wait((m) => m.t === 'welcome', 'welcome ayse');
await ali.wait((m) => m.t === 'state' && m.players.length === 2, 'two');

ok(ali.state.host === wa.you && ali.state.count === 10 && ali.state.topic === 'mix' && ali.state.lang === 'tr', 'The first player is the host; defaults: 10 mixed questions in Turkish');
ayse.send({ t: 'settings', count: 5 });
ok((await ayse.wait((m) => m.t === 'error', 'not host')).code === 'not_host', 'Only the host changes the settings');
ali.send({ t: 'settings', lang: 'en', topic: 'general', count: 5 });
await ayse.wait((m) => m.t === 'state' && m.count === 5 && m.lang === 'en' && m.topic === 'general', 'settings');
ok(true, 'Host picked English, general knowledge, 5 questions; everyone sees it');

ayse.send({ t: 'start' });
ok((await ayse.wait((m) => m.t === 'error', 'not host start')).code === 'not_host', 'Only the host starts the game');
ayse.send({ t: 'hello', v: 2, name: 'Other', cid: 'quizOther0001', lang: 'tr' });
ok((await ayse.wait((m) => m.t === 'error', 'second hello')).code === 'bad', 'A second hello on the same connection is refused');
ali.inbox.length = 0;
ali.send({ t: 'start' });
const q1 = await ali.wait((m) => m.t === 'state' && m.phase === 'question', 'q1');
ok(q1.n === 1 && q1.total === 5 && q1.cat === 'general' && q1.options.length >= 2 && !('correct' in q1), 'First question: general knowledge, right option hidden');
ok(/^[\x00-\x7F’…“”°×−]+$/.test(q1.question), 'The question is in English');

// 50:50 (on a four-option question): only Ali gets the hidden options; a second use does nothing.
let fiftyHide = null;
if (q1.options.length === 4) {
  ali.send({ t: 'joker', n: 1 });
  const fifty = await ali.wait((m) => m.t === 'fifty', 'fifty');
  fiftyHide = fifty.hide;
  await ayse.wait((m) => m.t === 'state' && m.players.some((p) => p.id === wa.you && p.joker), 'joker shown');
  ok(fifty.n === 1 && fifty.hide.length === 2 && !ayse.inbox.some((m) => m.t === 'fifty'), '50:50: two options hidden, only for Ali; the others see the joker is used');
  ali.send({ t: 'joker', n: 1 });
  await new Promise((r) => setTimeout(r, 300));
  ok(!ali.inbox.some((m) => m.t === 'fifty'), 'The joker works once per game');
  // A second person's joker on the same question hides the same pair (two identities can't corner the answer).
  ayse.send({ t: 'joker', n: 1 });
  const fiftyY = await ayse.wait((m) => m.t === 'fifty', 'fifty ayse');
  ok([...fiftyY.hide].sort().join() === [...fiftyHide].sort().join(), '50:50 hides one pair per question for everyone');
}
// Ali picks an option the joker left (or 0), Ayşe the next one; the reveal shows the right option and the points.
const aliPick = [0, 1, 2, 3].find((i) => i < q1.options.length && !(fiftyHide ?? []).includes(i));
const aysePick = [0, 1, 2, 3].find((i) => i < q1.options.length && i !== aliPick && !(fiftyHide ?? []).includes(i));
ali.send({ t: 'answer', n: 1, pick: aliPick });
const mid = await ayse.wait((m) => m.t === 'state' && m.phase === 'question' && m.players.some((p) => p.answered), 'answered');
ok(mid.players.every((p) => !('pick' in p)), 'Kimin neyi seçtiği açıklamaya kadar gizli');
ayse.send({ t: 'answer', n: 1, pick: aysePick });
const rev = await ali.wait((m) => m.t === 'state' && m.phase === 'reveal', 'reveal');
const a = rev.players.find((p) => p.id === wa.you);
const y = rev.players.find((p) => p.id === wy.you);
// Ali answered first: if right he is #1 (speed + 50 bonus); Ayşe, if right, is #1 or #2.
const expectA = rev.correct === aliPick ? a.gained >= 150 && a.rank === 1 : a.gained === 0;
const expectY = rev.correct === aysePick ? y.gained >= 75 && y.rank >= 1 : y.gained === 0;
ok(Number.isInteger(rev.correct) && a.pick === aliPick && y.pick === aysePick && expectA && expectY, 'Reveal: right option, picks, points with the first-answer bonus');
if (fiftyHide) ok(!fiftyHide.includes(rev.correct), 'The 50:50 never hid the right option');
ok(a.score === a.gained && y.score === y.gained, 'Puanlar toplama eklendi');
// İkinci cevap aynı soruya sayılmaz.
ali.send({ t: 'answer', n: 1, pick: 2 });
const q2 = await ali.wait((m) => m.t === 'state' && m.phase === 'question' && m.n === 2, 'q2', 8000);
ok(q2.players.every((p) => !p.answered), '4 sn sonra ikinci soruya geçildi');

// The rest quickly: both always pick 0.
for (let n = 2; n <= 5; n++) {
  if (n > 2) await ali.wait((m) => m.t === 'state' && m.phase === 'question' && m.n === n, `q${n}`, 9000);
  ali.send({ t: 'answer', n, pick: 0 });
  ayse.send({ t: 'answer', n, pick: 0 });
}
const over = await ali.wait((m) => m.t === 'state' && m.phase === 'over', 'over', 9000);
ok(over.players.every((p) => p.score >= 0) && !('question' in over), 'Five questions done: podium');

ali.inbox.length = 0;
ali.send({ t: 'start' });
const again = await ali.wait((m) => m.t === 'state' && m.phase === 'question', 'again');
ok(again.n === 1 && again.players.every((p) => p.score === 0 && !p.joker && p.streak === 0), 'New game: scores, jokers and streaks reset');
ok(again.question !== q1.question, 'A rematch asks new questions');

for (const c of [ali, ayse]) c.ws.close();
setTimeout(() => process.exit(0), 100);
