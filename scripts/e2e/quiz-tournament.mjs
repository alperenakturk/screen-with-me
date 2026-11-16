// QZ2: the Quiz tournament and the new jokers, three players, no lab powers (so it runs on live too).
// Tournament: each player picks a round's category in turn (only the picker may pick; time up = a random one), three
// questions a round, the round's best scorer wins it, the winner has the most round wins. Jokers: Double (×2 if
// right), Second chance (a wrong answer may be tried once more, half points, only that player hears "again"),
// 50:50; each kind once per game, one joker per question.
import { GameSocket } from './game-socket.mjs';
import { QUIZ_BANK } from '../../packages/shared/src/games/quiz-questions.ts';
import { quizLevelBonus } from '../../packages/shared/src/games/quiz.ts';
const base = process.argv[2] ?? 'ws://localhost:8787';
const game = 'quizt' + Math.random().toString(36).slice(2, 8);

function client(name, cid) {
  const ws = new GameSocket(`${base}/api/quiz/${game}/ws`);
  setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ t: 'ping' })), 15_000).unref();
  const inbox = [];
  let last = null;
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'state') last = m;
  });
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, name, cid, lang: 'en' })));
  let nudgedAt = 0;
  const wait = async (pred, label, ms = 15000) => {
    for (let i = 0; i < ms / 50; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The bank entry of the question on screen (the server never says the answer before the reveal). */
const entryOf = (s) => QUIZ_BANK[s.qid];
const rightMsg = (s) => {
  const e = entryOf(s);
  if (s.typed) return { t: 'answer', n: s.n, text: e.en.a[0] };
  if (e.tf !== undefined) return { t: 'answer', n: s.n, pick: e.tf ? 0 : 1 };
  return { t: 'answer', n: s.n, pick: s.options.indexOf(e.en.o[0]) };
};
const wrongMsg = (s, hide = []) => {
  if (s.typed) return { t: 'answer', n: s.n, text: 'zzzz' };
  const right = rightMsg(s).pick;
  return { t: 'answer', n: s.n, pick: s.options.findIndex((_, i) => i !== right && !hide.includes(i)) };
};

const alex = client('Alex', 'quizTnAlex0001');
const wa = await alex.wait((m) => m.t === 'welcome', 'welcome');
const sam = client('Sam', 'quizTnSam00001');
const ws = await sam.wait((m) => m.t === 'welcome', 'welcome sam');
const kim = client('Kim', 'quizTnKim00001');
const wk = await kim.wait((m) => m.t === 'welcome', 'welcome kim');
await alex.wait((m) => m.t === 'state' && m.players.length === 3, 'three');
alex.send({ t: 'settings', lang: 'en', mode: 'tournament', laps: 1 });
await sam.wait((m) => m.t === 'state' && m.mode === 'tournament' && m.laps === 1 && m.lang === 'en', 'settings');
ok(true, 'The host set up a one-lap tournament in English; everyone sees it');
for (const c of [alex, sam, kim]) c.inbox.length = 0;
alex.send({ t: 'start' });

// Round 1: Alex picks.
const p1 = await sam.wait((m) => m.t === 'state' && m.phase === 'pick', 'pick 1');
ok(p1.round === 1 && p1.rounds === 3 && p1.picker === wa.you && p1.offer.length === 3 && p1.total === 9, 'Round 1 of 3: Alex picks from three categories');
sam.send({ t: 'pick', cat: p1.offer[1] });
await sleep(400);
ok(sam.state.phase === 'pick', 'Only the picker may pick');
alex.send({ t: 'pick', cat: p1.offer[0] });
let q = await alex.wait((m) => m.t === 'state' && m.phase === 'question', 'r1 q1');
ok(q.cat === p1.offer[0] && q.n === 1 && q.round === 1, "Round 1's questions come from Alex's pick");

// Question 1: Alex Double, Sam Second chance, Kim 50:50 (or Double on a true / false question).
alex.send({ t: 'joker', n: 1, kind: 'double' });
sam.send({ t: 'joker', n: 1, kind: 'second' });
const kimKind = q.options.length === 2 ? 'double' : 'fifty';
kim.send({ t: 'joker', n: 1, kind: kimKind });
let kimHide = [];
if (kimKind === 'fifty') {
  const f = await kim.wait((m) => m.t === 'fifty', 'fifty');
  kimHide = f.hide;
  ok(q.typed ? f.hint && f.hint.length >= 1 && f.hide.length === 0 : f.hide.length === 2, q.typed ? `50:50 on a typed question gives a hint: "${f.hint}"` : '50:50 hides two options');
}
kim.send({ t: 'joker', n: 1, kind: 'second' });
const used = await alex.wait((m) => m.t === 'state' && m.players.filter((p) => p.jokers?.length).length === 3, 'jokers shown');
await sleep(300);
ok(used.players.find((p) => p.id === wk.you).jokers.length === 1 && alex.state.players.find((p) => p.id === wk.you).jokers.length === 1, 'One joker per question: Kim’s second joker on the same question is refused');

alex.send(rightMsg(q));
sam.send(wrongMsg(q));
const again = await sam.wait((m) => m.t === 'again', 'again');
await sleep(300);
ok(again.n === 1 && !alex.inbox.some((m) => m.t === 'again') && !alex.state.players.find((p) => p.id === ws.you).answered, 'Second chance: only Sam hears "try again", and Sam is not shown as answered');
sam.send(rightMsg(q));
kim.send(wrongMsg(q, kimHide));
let r = await alex.wait((m) => m.t === 'state' && m.phase === 'reveal', 'r1 reveal 1');
const e1 = entryOf(q);
const bonus = quizLevelBonus(e1.d, e1.typed);
const ra = r.players.find((p) => p.id === wa.you);
const rs = r.players.find((p) => p.id === ws.you);
ok(ra.rank === 1 && ra.gained >= Math.round(2 * 170 * bonus), `Double: Alex's right answer counts twice (${ra.gained})`);
ok(rs.gained > 0 && rs.gained <= Math.round((175 * bonus) / 2) + 2, `Second chance: Sam's second try counts half (${rs.gained})`);
ok(r.players.find((p) => p.id === wk.you).gained === 0, 'Kim was wrong');

// Questions 2 and 3: everyone wrong (Alex keeps the round).
for (const n of [2, 3]) {
  q = await alex.wait((m) => m.t === 'state' && m.phase === 'question' && m.n === n, `r1 q${n}`);
  for (const c of [alex, sam, kim]) c.send(wrongMsg(q));
  await alex.wait((m) => m.t === 'state' && m.phase === 'reveal' && m.n === n, `r1 reveal ${n}`);
}

// Round 2: Sam's turn; Sam lets the time run out, a category is picked at random.
const p2 = await kim.wait((m) => m.t === 'state' && m.phase === 'pick' && m.round === 2, 'pick 2', 20000);
ok(p2.picker === ws.you && p2.roundWin.length === 1 && p2.roundWin[0] === wa.you && p2.players.find((p) => p.id === wa.you).wins === 1, 'Round 1 went to Alex; round 2: Sam picks');
q = await kim.wait((m) => m.t === 'state' && m.phase === 'question' && m.round === 2, 'r2 q1', 20000);
ok(p2.offer.includes(q.cat) && q.n === 4, 'Time up: a random offered category, and the questions count on (question 4)');
alex.send({ t: 'joker', n: q.n, kind: 'double' });
await sleep(300);
ok(alex.state.players.find((p) => p.id === wa.you).jokers.length === 1, 'Each joker once per game: a second Double is refused');
kim.send(rightMsg(q));
alex.send(wrongMsg(q));
sam.send(wrongMsg(q));
await alex.wait((m) => m.t === 'state' && m.phase === 'reveal' && m.n === 4, 'r2 reveal 1');
for (const n of [5, 6]) {
  q = await alex.wait((m) => m.t === 'state' && m.phase === 'question' && m.n === n, `r2 q${n}`);
  for (const c of [alex, sam, kim]) c.send(wrongMsg(q));
  await alex.wait((m) => m.t === 'state' && m.phase === 'reveal' && m.n === n, `r2 reveal ${n}`);
}

// Round 3: Kim picks; nobody scores, nobody wins the round.
const p3 = await alex.wait((m) => m.t === 'state' && m.phase === 'pick' && m.round === 3, 'pick 3', 20000);
ok(p3.picker === wk.you && p3.roundWin[0] === wk.you, 'Round 2 went to Kim; round 3: Kim picks');
kim.send({ t: 'pick', cat: p3.offer[2] });
for (const n of [7, 8, 9]) {
  q = await alex.wait((m) => m.t === 'state' && m.phase === 'question' && m.n === n, `r3 q${n}`);
  for (const c of [alex, sam, kim]) c.send(wrongMsg(q));
  await alex.wait((m) => m.t === 'state' && m.phase === 'reveal' && m.n === n, `r3 reveal ${n}`);
}
const over = await alex.wait((m) => m.t === 'state' && m.phase === 'over', 'over', 20000);
const wins = Object.fromEntries(over.players.map((p) => [p.id, p.wins]));
ok(over.roundWin.length === 0 && wins[wa.you] === 1 && wins[wk.you] === 1 && wins[ws.you] === 0, 'Round 3 had no winner; Alex and Kim won a round each');
const ap = over.players.find((p) => p.id === wa.you).score;
const kp = over.players.find((p) => p.id === wk.you).score;
ok(ap !== kp, `A tie on round wins goes to points (Alex ${ap}, Kim ${kp})`);

for (const c of [alex, sam, kim]) c.ws.close();
setTimeout(() => process.exit(0), 100);
