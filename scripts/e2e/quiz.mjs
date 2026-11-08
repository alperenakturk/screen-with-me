// Quiz: lobby, host settings (language, topic, length; others get not_host), questions (the right option stays secret
// until the reveal), the 50:50 joker (only to its user, once per game), reveal with points and rank, moving on by
// itself, podium at the end, new game with new questions.
import { dropFor } from './drop.mjs';
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
  let nudgedAt = 0;
  const wait = async (pred, label, ms = 8000) => {
    for (let i = 0; i < ms / 50; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      // Like the game page: a phase whose time is up and that hasn't moved gets a ping (any message makes the server
      // catch up). Live alarms can run tens of seconds late right after a deploy (BH2: draw.mjs waited 25 s silently).
      const now = Date.now();
      if (last?.endsAt && last.endsAt + 1500 < now && now - nudgedAt > 3000 && ws.readyState === WebSocket.OPEN) {
        nudgedAt = now;
        ws.send(JSON.stringify({ t: 'ping' }));
      }
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

const alex = client('Alex', 'quizAlex000001');
const wa = await alex.wait((m) => m.t === 'welcome', 'welcome');
alex.send({ t: 'start' });
ok((await alex.wait((m) => m.t === 'error', 'few')).code === 'too_few', 'Tek kişiyken başlamıyor');
const sam = client('Sam', 'quizSam00001');
const wy = await sam.wait((m) => m.t === 'welcome', 'welcome sam');
await alex.wait((m) => m.t === 'state' && m.players.length === 2, 'two');

ok(alex.state.host === wa.you && alex.state.count === 10 && alex.state.topic === 'mix' && alex.state.lang === 'tr', 'The first player is the host; defaults: 10 mixed questions in Turkish');
sam.send({ t: 'settings', count: 5 });
ok((await sam.wait((m) => m.t === 'error', 'not host')).code === 'not_host', 'Only the host changes the settings');
alex.send({ t: 'settings', lang: 'en', topic: 'general', count: 5 });
await sam.wait((m) => m.t === 'state' && m.count === 5 && m.lang === 'en' && m.topic === 'general', 'settings');
ok(true, 'Host picked English, general knowledge, 5 questions; everyone sees it');

sam.send({ t: 'start' });
ok((await sam.wait((m) => m.t === 'error', 'not host start')).code === 'not_host', 'Only the host starts the game');
sam.send({ t: 'hello', v: 2, name: 'Other', cid: 'quizOther0001', lang: 'tr' });
ok((await sam.wait((m) => m.t === 'error', 'second hello')).code === 'bad', 'A second hello on the same connection is refused');
alex.inbox.length = 0;
alex.send({ t: 'start' });
const q1 = await alex.wait((m) => m.t === 'state' && m.phase === 'question', 'q1');
ok(q1.n === 1 && q1.total === 5 && q1.cat === 'general' && q1.options.length >= 2 && !('correct' in q1), 'First question: general knowledge, right option hidden');
ok(/^[\x00-\x7F’…“”°×−]+$/.test(q1.question), 'The question is in English');

// 50:50 (on a four-option question): only Alex gets the hidden options; a second use does nothing.
let fiftyHide = null;
if (q1.options.length === 4) {
  alex.send({ t: 'joker', n: 1 });
  const fifty = await alex.wait((m) => m.t === 'fifty', 'fifty');
  fiftyHide = fifty.hide;
  await sam.wait((m) => m.t === 'state' && m.players.some((p) => p.id === wa.you && p.joker), 'joker shown');
  ok(fifty.n === 1 && fifty.hide.length === 2 && !sam.inbox.some((m) => m.t === 'fifty'), '50:50: two options hidden, only for Alex; the others see the joker is used');
  alex.send({ t: 'joker', n: 1 });
  await new Promise((r) => setTimeout(r, 300));
  ok(!alex.inbox.some((m) => m.t === 'fifty'), 'The joker works once per game');
  // A second person's joker on the same question hides the same pair (two identities can't corner the answer).
  sam.send({ t: 'joker', n: 1 });
  const fiftyY = await sam.wait((m) => m.t === 'fifty', 'fifty sam');
  ok([...fiftyY.hide].sort().join() === [...fiftyHide].sort().join(), '50:50 hides one pair per question for everyone');
}
// Alex picks an option the joker left (or 0), Sam the next one; the reveal shows the right option and the points.
const alexPick = [0, 1, 2, 3].find((i) => i < q1.options.length && !(fiftyHide ?? []).includes(i));
const samPick = [0, 1, 2, 3].find((i) => i < q1.options.length && i !== alexPick && !(fiftyHide ?? []).includes(i));
alex.send({ t: 'answer', n: 1, pick: alexPick });
const mid = await sam.wait((m) => m.t === 'state' && m.phase === 'question' && m.players.some((p) => p.answered), 'answered');
ok(mid.players.every((p) => !('pick' in p)), 'Kimin neyi seçtiği açıklamaya kadar gizli');
sam.send({ t: 'answer', n: 1, pick: samPick });
const rev = await alex.wait((m) => m.t === 'state' && m.phase === 'reveal', 'reveal');
const a = rev.players.find((p) => p.id === wa.you);
const y = rev.players.find((p) => p.id === wy.you);
// Alex answered first: if right he is #1 (speed + 50 bonus); Sam, if right, is #1 or #2.
const expectA = rev.correct === alexPick ? a.gained >= 150 && a.rank === 1 : a.gained === 0;
const expectY = rev.correct === samPick ? y.gained >= 75 && y.rank >= 1 : y.gained === 0;
ok(Number.isInteger(rev.correct) && a.pick === alexPick && y.pick === samPick && expectA && expectY, 'Reveal: right option, picks, points with the first-answer bonus');
if (fiftyHide) ok(!fiftyHide.includes(rev.correct), 'The 50:50 never hid the right option');
ok(a.score === a.gained && y.score === y.gained, 'Puanlar toplama eklendi');
// İkinci cevap aynı soruya sayılmaz.
alex.send({ t: 'answer', n: 1, pick: 2 });
const q2 = await alex.wait((m) => m.t === 'state' && m.phase === 'question' && m.n === 2, 'q2', 8000);
ok(q2.players.every((p) => !p.answered), '4 sn sonra ikinci soruya geçildi');

// The rest quickly: both always pick 0.
for (let n = 2; n <= 5; n++) {
  if (n > 2) await alex.wait((m) => m.t === 'state' && m.phase === 'question' && m.n === n, `q${n}`, 9000);
  alex.send({ t: 'answer', n, pick: 0 });
  sam.send({ t: 'answer', n, pick: 0 });
}
const over = await alex.wait((m) => m.t === 'state' && m.phase === 'over', 'over', 9000);
ok(over.players.every((p) => p.score >= 0) && !('question' in over), 'Five questions done: podium');

alex.inbox.length = 0;
alex.send({ t: 'start' });
const again = await alex.wait((m) => m.t === 'state' && m.phase === 'question', 'again');
ok(again.n === 1 && again.players.every((p) => p.score === 0 && !p.joker && p.streak === 0), 'New game: scores, jokers and streaks reset');
ok(again.question !== q1.question, 'A rematch asks new questions');

// BHG: one of two players reloads mid-game: the game waits for them (FEW_GRACE_MS) instead of going to the lobby.
const samDropWait = dropFor(sam.ws, 'Sam');
await alex.wait((m) => m.t === 'state' && m.players.some((p) => !p.online), 'sam offline', samDropWait);
await new Promise((r) => setTimeout(r, 1200));
ok(alex.state.phase !== 'lobby', 'A player who drops mid-game does not send the game back to the lobby at once');
const sam2 = client('Sam', 'quizSam00001');
await sam2.wait((m) => m.t === 'welcome', 'sam back');
const back = await sam2.wait((m) => m.t === 'state', 'sam state');
ok(back.phase !== 'lobby' && back.players.length === 2 && back.players.every((p) => p.online), 'Back within the grace: the same game goes on with both players');

for (const c of [alex, sam2]) c.ws.close();
setTimeout(() => process.exit(0), 100);
