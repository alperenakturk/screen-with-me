// Quiz: lobby, host settings (language, topic, length; others get not_host), questions (the right option stays secret
// until the reveal), the 50:50 joker (only to its user, once per game), reveal with points and rank, moving on by
// itself, podium at the end, new game with new questions. QZ5: no true / false or typed questions; a 5-question game
// ends with a closest-guess question (a number; closest 200, with two players the other 0).
import { dropFor } from './drop.mjs';
import { GameSocket } from './game-socket.mjs';
import { QUIZ_BANK, guessValue } from '../../packages/shared/src/games/quiz-questions.ts';
import { quizLevelBonus } from '../../packages/shared/src/games/quiz.ts';
const base = process.argv[2] ?? 'ws://localhost:8787';
const game = 'quiz' + Math.random().toString(36).slice(2, 8);

function client(name, cid, id = game) {
  const ws = new GameSocket(`${base}/api/quiz/${id}/ws`);
  // GHOST: like the game pages, a ping every 15 s (a socket silent for 90 s is closed as a dead connection).
  setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ t: 'ping' })), 15_000).unref();
  const inbox = [];
  let last = null;
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'state') last = m;
  });
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 4, name, cid, lang: 'tr' })));
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
ok(alex.state.level === 'mix', 'QZ4: the level is Mixed by default');
alex.send({ t: 'settings', lang: 'en', topic: 'general', count: 5, level: 'hard' });
await sam.wait((m) => m.t === 'state' && m.count === 5 && m.lang === 'en' && m.topic === 'general' && m.level === 'hard', 'settings');
ok(true, 'Host picked English, general knowledge, 5 questions, Hard; everyone sees it');

sam.send({ t: 'start' });
ok((await sam.wait((m) => m.t === 'error', 'not host start')).code === 'not_host', 'Only the host starts the game');
sam.send({ t: 'hello', v: 4, name: 'Other', cid: 'quizOther0001', lang: 'tr' });
ok((await sam.wait((m) => m.t === 'error', 'second hello')).code === 'bad', 'A second hello on the same connection is refused');
alex.inbox.length = 0;
alex.send({ t: 'start' });
const q1 = await alex.wait((m) => m.t === 'state' && m.phase === 'question', 'q1');
ok(q1.n === 1 && q1.total === 5 && q1.cat === 'general' && q1.options.length >= 2 && !q1.guess && !('correct' in q1), 'First question: general knowledge, options (four, or two on "which came first"), right option hidden');
ok(q1.lv === 3 && QUIZ_BANK[q1.qid]?.d === 3, 'QZ4: a Hard game asks a hard question, and says so (lv 3)');
// The bank's own English text (an ASCII test failed on names such as "László Bíró", a QZ4 hard question).
ok(q1.question === QUIZ_BANK[q1.qid]?.en.q, 'The question is in English');

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
const answerOf = (s, pick) => (s.guess ? { t: 'answer', n: s.n, num: 1000 + pick } : { t: 'answer', n: s.n, pick });
alex.send(answerOf(q1, alexPick));
const mid = await sam.wait((m) => m.t === 'state' && m.phase === 'question' && m.players.some((p) => p.answered), 'answered');
ok(mid.players.every((p) => !('pick' in p)), 'Kimin neyi seçtiği açıklamaya kadar gizli');
sam.send(answerOf(q1, samPick));
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
  ok(!!alex.state.guess === (n === 5) && (n === 5 || alex.state.options.length >= 2), n === 5 ? 'QZ5: the fifth question of five is a closest guess' : `Question ${n}: an option question`);
  alex.send(answerOf(alex.state, 0));
  sam.send(answerOf(alex.state, 0));
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

// QZ5: closest guesses (a local lab server makes the next game guesses only; live answers lab_off and this part is
// skipped). Two players: the closer guess gets 200, the other 0; a guess stays hidden until the reveal.
{
  const guessGame = game + 'g';
  const carl = client('Alex', 'quizGssAlex001', guessGame);
  const wc = await carl.wait((m) => m.t === 'welcome', 'guess welcome');
  const dana = client('Sam', 'quizGssSam0001', guessGame);
  const wd = await dana.wait((m) => m.t === 'welcome', 'guess welcome 2');
  await carl.wait((m) => m.t === 'state' && m.players.length === 2, 'guess two');
  carl.send({ t: 'lab', op: 'guess' });
  carl.send({ t: 'settings', lang: 'en', count: 5 });
  const refused = await carl.wait((m) => m.t === 'error' || (m.t === 'state' && m.count === 5), 'lab guess', 4000);
  if (refused.t === 'error') {
    ok(refused.code === 'lab_off', 'Closest guesses: skipped (not a local lab server)');
  } else {
    carl.inbox.length = 0;
    carl.send({ t: 'start' });
    const gq = await carl.wait((m) => m.t === 'state' && m.phase === 'question', 'guess q1');
    const v = guessValue(QUIZ_BANK[gq.qid]);
    ok(gq.guess === true && gq.options.length === 0 && !('value' in gq) && v !== null && gq.endsAt - Date.now() > 15_000, 'A closest-guess question: no options, the number not sent, 20 s to answer');
    dana.send({ t: 'answer', n: 1, num: v + 1000 });
    const mid = await carl.wait((m) => m.t === 'state' && m.phase === 'question' && m.players.some((p) => p.answered), 'guess answered');
    ok(mid.players.every((p) => !('guess' in p) && !('pick' in p)), 'A guess stays hidden until the reveal');
    carl.send({ t: 'joker', n: 1, kind: 'double' });
    carl.send({ t: 'answer', n: 1, pick: 0 });
    carl.send({ t: 'answer', n: 1, num: 'many' });
    await new Promise((r) => setTimeout(r, 300));
    ok(!carl.state.players.find((p) => p.id === wc.you).answered && !carl.state.players.find((p) => p.id === wc.you).jokers, 'No joker, no option pick and no text on a closest guess');
    carl.send({ t: 'answer', n: 1, num: v + 1 });
    const gr = await carl.wait((m) => m.t === 'state' && m.phase === 'reveal', 'guess reveal');
    const a = gr.players.find((p) => p.id === wc.you);
    const s = gr.players.find((p) => p.id === wd.you);
    ok(gr.value === v && !('correct' in gr) && a.guess === v + 1 && a.rank === 1 && a.gained === 200 && s.guess === v + 1000 && s.gained === 0, `Reveal: the number (${v}); the closer guess 200, the other 0 (two players), no speed bonus`);
  }
  carl.ws.close();
  dana.ws.close();
}
// QZ3: ×2 after answering. Alex answers right, then plays ×2 (the reveal waits a moment so it can be pressed): double
// points. Sam answers wrong, then plays ×2: still 0. A second ×2 in the same game does nothing.
{
  const dGame = game + 'd';
  const eve = client('Alex', 'quizDblAlex001', dGame);
  const we = await eve.wait((m) => m.t === 'welcome', 'double welcome');
  const fay = client('Sam', 'quizDblSam0001', dGame);
  const wf = await fay.wait((m) => m.t === 'welcome', 'double welcome 2');
  await eve.wait((m) => m.t === 'state' && m.players.length === 2, 'double two');
  eve.send({ t: 'settings', lang: 'en', count: 5 });
  await eve.wait((m) => m.t === 'state' && m.count === 5 && m.lang === 'en', 'double settings');
  eve.inbox.length = 0;
  eve.send({ t: 'start' });
  const q = await eve.wait((m) => m.t === 'state' && m.phase === 'question' && m.n === 1, 'double q1');
  const entry = QUIZ_BANK[q.qid];
  // The right answer from the bank: the right text (the server shuffled the options).
  const rightPick = q.options.indexOf(entry.en.o?.[0]);
  const wrongPick = q.options.length ? (rightPick + 1) % q.options.length : 0;
  eve.send({ t: 'answer', n: 1, pick: rightPick });
  await eve.wait((m) => m.t === 'state' && m.players.some((p) => p.id === we.you && p.answered), 'double answered');
  eve.send({ t: 'joker', n: 1, kind: 'double' });
  await eve.wait((m) => m.t === 'state' && m.players.some((p) => p.id === we.you && p.jokers?.includes('double')), 'double played');
  fay.send({ t: 'answer', n: 1, pick: wrongPick });
  const lastAt = Date.now();
  const mid = await eve.wait((m) => m.t === 'state' && m.players.every((p) => p.answered), 'all answered');
  ok(mid.phase === 'question' && mid.endsAt - lastAt <= 3000, 'Everyone answered: the reveal waits a moment for a ×2 (≤ 3 s)');
  fay.send({ t: 'joker', n: 1, kind: 'double' });
  const r = await eve.wait((m) => m.t === 'state' && m.phase === 'reveal', 'double reveal', 6000);
  const a = r.players.find((p) => p.id === we.you);
  const b = r.players.find((p) => p.id === wf.you);
  // A fast first right answer is about 200 points × the level bonus; doubled it is about twice that.
  const plain = 200 * quizLevelBonus(entry.d);
  ok(a.pick === 0 || a.pick === rightPick, 'Alex answered right');
  ok(a.gained >= Math.round(plain * 2 * 0.9), `×2 after a right answer doubles it (${a.gained} ≥ ${Math.round(plain * 1.8)})`);
  ok(b.gained === 0 && b.jokers?.includes('double'), '×2 after a wrong answer: still 0, no penalty');
  // A second ×2 in the game is refused: Alex answers the next question right and presses again.
  const q2 = await eve.wait((m) => m.t === 'state' && m.phase === 'question' && m.n === 2, 'double q2', 8000);
  const e2 = QUIZ_BANK[q2.qid];
  const r2pick = q2.options.indexOf(e2.en.o?.[0]);
  eve.send({ t: 'answer', n: 2, pick: r2pick });
  eve.send({ t: 'joker', n: 2, kind: 'double' });
  fay.send({ t: 'answer', n: 2, pick: (r2pick + 1) % q2.options.length });
  const r2 = await eve.wait((m) => m.t === 'state' && m.phase === 'reveal' && m.n === 2, 'double reveal 2', 6000);
  const a2 = r2.players.find((p) => p.id === we.you);
  ok(a2.gained > 0 && a2.gained < Math.round(400 * quizLevelBonus(e2.d)) && a2.jokers.filter((k) => k === 'double').length === 1, '×2 works once a game');
  eve.ws.close();
  fay.ws.close();
}
setTimeout(() => process.exit(0), 100);
