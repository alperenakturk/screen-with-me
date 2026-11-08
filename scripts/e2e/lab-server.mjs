// Test Lab server powers (card DL3b): a Classics position, ending a Quiz phase now, filling the room's tip jar, a Sea
// Battle with one ship left each and the other fleet revealed.
// With `LAB_SERVER=1` (a local `wrangler dev --var SWM_LAB_SERVER:1`, as in CI) they must work. Without it (every live
// run, a plain local server) every one of them must be refused and change nothing: this is the proof that the live
// build never has these powers.
import { GameSocket } from './game-socket.mjs';
const base = process.argv[2] ?? 'ws://localhost:8787';
const lab = process.env.LAB_SERVER === '1' && /^ws:\/\/(localhost|127\.0\.0\.1)/.test(base);
const tag = Math.random().toString(36).slice(2, 8);
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function client(path, hello) {
  const ws = new GameSocket(`${base}${path}`);
  const inbox = [];
  let last = null;
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'state') last = m;
  });
  ws.addEventListener('open', () => ws.send(JSON.stringify(hello)));
  const wait = async (pred, label, ms = 10000) => {
    for (let t = 0; t < ms; t += 50) {
      const i = inbox.findIndex(pred);
      if (i >= 0) return inbox.splice(i, 1)[0];
      await sleep(50);
    }
    throw new Error('timeout ' + label);
  };
  return { ws, inbox, wait, send: (m) => ws.send(JSON.stringify(m)), get state() { return last; }, close: () => ws.close() };
}
const isError = (code) => (m) => m.t === 'error' && m.code === code;

console.log(lab ? 'local lab server: the lab messages must work' : 'not a lab server: every lab message must be refused');

// 1. Classics: chess mate in one.
{
  const alex = client(`/api/games/lab${tag}/ws`, { t: 'hello', v: 2, game: 'xox', name: 'Alex', cid: 'labAlex' + tag, classics: true });
  await alex.wait((m) => m.t === 'state', 'classics state');
  alex.send({ t: 'bot', level: 1 });
  await alex.wait((m) => m.t === 'state' && m.seats[1]?.bot, 'bot seated');
  alex.send({ t: 'lab', position: 'mate1' });
  if (lab) {
    const s = await alex.wait((m) => m.t === 'state' && m.kind === 'chess', 'chess position');
    ok(s.game.kinds.replace(/\./g, '') === 'kpppkr' || s.game.board.filter(Boolean).length === 6, 'Classics: the lab sets the chess mate-in-one position');
    alex.send({ t: 'move', cell: 56 * 64 + 0 });
    const mate = await alex.wait((m) => m.t === 'state' && m.game.end === 'mate', 'mate');
    ok(mate.game.winner === 'X', 'Classics: Ra1-a8 mates from it');
    alex.send({ t: 'lab', position: 'lastmove' });
    const rv = await alex.wait((m) => m.t === 'state' && m.kind === 'reversi', 'reversi position');
    ok(rv.game.board.filter((c) => c === null).length === 1, 'Classics: the lab sets the reversi last-move position');
    alex.send({ t: 'move', cell: 63 });
    const full = await alex.wait((m) => m.t === 'state' && m.kind === 'reversi' && m.game.winner !== null, 'reversi end');
    ok(full.game.winner === 'X' && full.game.board.every(Boolean), 'Classics: dark fills the last cell and wins');
    alex.send({ t: 'lab', position: 'nope' });
    await alex.wait(isError('kind'), 'unknown position refused');
    ok(true, 'Classics: an unknown position is refused');
  } else {
    await alex.wait(isError('lab_off'), 'lab_off from the game');
    await sleep(300);
    ok(alex.state.kind === 'xox' && alex.state.game.board.every((c) => c === null), 'Classics: refused (lab_off), the board is untouched');
  }
  alex.close();
}

// 2. Quiz: the question ends now.
{
  const hello = (name) => ({ t: 'hello', v: 2, name, cid: `lab${name}${tag}`, lang: 'en' });
  const alex = client(`/api/quiz/labq${tag}/ws`, hello('Alex'));
  await alex.wait((m) => m.t === 'state', 'quiz alex');
  const sam = client(`/api/quiz/labq${tag}/ws`, hello('Sam'));
  await alex.wait((m) => m.t === 'state' && m.players.length === 2, 'quiz two players');
  alex.send({ t: 'start' });
  const q = await alex.wait((m) => m.t === 'state' && m.phase === 'question', 'first question');
  alex.send({ t: 'lab', op: 'skip' });
  if (lab) {
    const r = await alex.wait((m) => m.t === 'state' && m.phase === 'reveal', 'reveal now', 3000);
    ok(r.n === q.n && Date.now() < q.endsAt - 5000, 'Quiz: the lab ends the question at once (the reveal comes long before its time)');
  } else {
    await alex.wait(isError('lab_off'), 'lab_off from the quiz');
    await sleep(300);
    ok(alex.state.phase === 'question' && alex.state.endsAt === q.endsAt, 'Quiz: refused (lab_off), the question keeps its time');
  }
  alex.close();
  sam.close();
}

// 3. The room: the tip jar fills now.
{
  const alex = client(`/api/rooms/labr${tag}/ws`, { t: 'hello', v: 3, name: 'Alex', avatar: 'wizard', cid: 'labRoomAlex' + tag });
  await alex.wait((m) => m.t === 'welcome', 'room welcome');
  alex.send({ t: 'load', media: { kind: 'test' } });
  const st = await alex.wait((m) => m.t === 'state' && m.state.item, 'room state');
  alex.inbox.length = 0;
  alex.send({ t: 'lab', op: 'tipjar' });
  if (lab) {
    const jar = await alex.wait((m) => m.t === 'tipjar', 'tip jar');
    ok(jar.boost === st.state.item.id && jar.fill === 0, 'Room: the lab fills the tip jar for the film playing');
  } else {
    await alex.wait(isError('bad_message'), 'bad_message from the room');
    await sleep(300);
    ok(!alex.inbox.some((m) => m.t === 'tipjar'), 'Room: refused, the tip jar stays as it was');
  }
  alex.close();
}
// 4. Sea Battle: one ship left each, and their fleet revealed (to the asking tab only).
{
  const alex = client(`/api/sea/labs${tag}/ws`, { t: 'hello', v: 1, name: 'Alex', cid: 'labSeaAlex' + tag });
  await alex.wait((m) => m.t === 'state', 'sea state');
  alex.send({ t: 'bot', level: 1 });
  await alex.wait((m) => m.t === 'state' && m.players[1]?.bot === 1, 'Glowbeam sits');
  alex.inbox.length = 0;
  alex.send({ t: 'lab', op: 'oneLeft' });
  if (lab) {
    const s = await alex.wait((m) => m.t === 'state' && m.phase === 'play', 'one ship left');
    ok(s.players[0].left === 1 && s.players[1].left === 1 && s.turn === 0, 'Sea Battle: the lab leaves one ship each, my turn');
    alex.send({ t: 'lab', op: 'reveal' });
    const r = await alex.wait((m) => m.t === 'reveal', 'reveal');
    ok(r.seat === 1 && r.ships.length === 5, "Sea Battle: the lab reveals Glowbeam's fleet to this tab");
  } else {
    await alex.wait(isError('lab_off'), 'lab_off from the sea');
    alex.send({ t: 'lab', op: 'reveal' });
    await alex.wait(isError('lab_off'), 'lab_off for reveal');
    await sleep(300);
    ok(alex.state.phase === 'place' && !alex.inbox.some((m) => m.t === 'reveal'), 'Sea Battle: refused (lab_off), nothing revealed, the game untouched');
  }
  alex.close();
}
process.exit(0);
