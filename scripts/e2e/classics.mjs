// 🎲 Classics (P6): one table, a shelf of boards. Alex opens a Classics table and sits alone; Glowbeam the bot takes
// the other seat and answers every move through the server's rules; the board switches from the shelf only while no
// game is in progress; dama moves are checked (a man may not step backward); a second person joins the table and
// gets the board on it, whatever board their hello named.
const base = process.argv[2] ?? 'ws://localhost:8787';
const game = 'cl' + Math.random().toString(36).slice(2, 8);

function client(name, cid, kind = 'xox') {
  const ws = new WebSocket(`${base}/api/games/${game}/ws`);
  const inbox = [];
  let last = null;
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'state') last = m;
  });
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 2, game: kind, name, cid, classics: true })));
  return {
    ws,
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
async function until(fn, ms = 8000) {
  for (let i = 0; i < ms / 50; i++) {
    try {
      if (fn()) return true;
    } catch {
      // not there yet
    }
    await sleep(50);
  }
  return false;
}
const filled = (s) => s.game.board.filter((c) => c !== null).length;

const alex = client('Alex', 'a'.repeat(32));
ok(await until(() => alex.state?.classics === true && alex.state.kind === 'xox'), 'a Classics table opens on tic-tac-toe');
alex.send({ t: 'bot', level: 2 });
ok(await until(() => alex.state.seats[1]?.bot === 2), 'Glowbeam takes the empty seat (medium)');

// XOX against Glowbeam: it answers every move.
alex.send({ t: 'move', cell: 4 });
ok(await until(() => filled(alex.state) === 2, 6000), 'Glowbeam answers the move through the server');
ok(alex.state.started === true, 'the game counts as started');

// No other board while the game is on.
alex.send({ t: 'switch', game: 'dama' });
ok(await until(() => alex.inbox.some((m) => m.t === 'error' && m.code === 'in_progress')), 'the shelf is locked while a game is in progress');

// Play it out (Glowbeam never loses at medium), then switch to dama.
for (let i = 0; i < 6 && alex.state.game.winner === null; i++) {
  const free = alex.state.game.board.findIndex((c) => c === null);
  const before = filled(alex.state);
  alex.send({ t: 'move', cell: free });
  await until(() => alex.state.game.winner !== null || filled(alex.state) >= before + 2, 6000);
}
ok(alex.state.game.winner === 'O' || alex.state.game.winner === 'draw', `Glowbeam (medium) does not lose at tic-tac-toe (${alex.state.game.winner})`);
alex.send({ t: 'switch', game: 'dama' });
ok(await until(() => alex.state.kind === 'dama' && filled(alex.state) === 32), 'after the game: dama from the shelf, 16 men a side');
ok(alex.state.score.X === 0 && alex.state.score.O === 0, 'a new board starts a new score');

// A man may not step backward; a forward step is fine; Glowbeam answers.
const back = 5 * 8 * 64 + 6 * 8; // (5,0) → (6,0): backward (and blocked)
alex.send({ t: 'move', cell: back });
ok(await until(() => alex.inbox.some((m) => m.t === 'error' && m.code === 'not_your_turn')), 'an illegal dama move is refused');
const step = (5 * 8 + 3) * 64 + (4 * 8 + 3); // (5,3) → (4,3)
alex.send({ t: 'move', cell: step });
ok(await until(() => alex.state.game.board[4 * 8 + 3] === 'X' && alex.state.game.turn === 'X', 6000), 'a man steps forward; Glowbeam moves back');

// Someone joining names another board in their hello: they get the table's board.
const sam = client('Sam', 'b'.repeat(32), 'four');
ok(await until(() => sam.state?.kind === 'dama'), 'a newcomer gets the board on the table (dama), whatever they named');
ok(sam.state.seats[1]?.bot === 2, 'the newcomer watches: Glowbeam keeps its seat');
sam.send({ t: 'sit', seat: 1 });
ok(await until(() => alex.state.seats[1] && !alex.state.seats[1].bot && alex.state.seats[1].name === 'Sam'), 'a person can take Glowbeam\'s seat');
ok(alex.state.started === false && filled(alex.state) === 32, 'a new opponent starts the game over');

// Chess (P7) between two people: the server checks every move; fool's mate ends the game.
const sq = (name) => (8 - Number(name[1])) * 8 + (name.charCodeAt(0) - 97);
const mv = (from, to) => sq(from) * 64 + sq(to);
alex.send({ t: 'switch', game: 'chess' });
ok(await until(() => alex.state.kind === 'chess' && sam.state.kind === 'chess' && filled(alex.state) === 32 && alex.state.game.kinds?.length === 64), 'chess from the shelf: 32 pieces, both see it');
alex.send({ t: 'move', cell: mv('e1', 'e3') });
ok(await until(() => alex.inbox.filter((m) => m.t === 'error' && m.code === 'not_your_turn').length >= 2), 'an illegal chess move (the king jumping two squares) is refused');
const plies = [[alex, 'f2', 'f3'], [sam, 'e7', 'e5'], [alex, 'g2', 'g4'], [sam, 'd8', 'h4']];
for (const [who, from, to] of plies) {
  const before = alex.state.game.last;
  who.send({ t: 'move', cell: mv(from, to) });
  await until(() => alex.state.game.last === sq(to) && alex.state.game.last !== before, 6000);
}
ok(alex.state.game.winner === 'O' && alex.state.game.end === 'mate' && alex.state.score.O === 1, "fool's mate: black wins by checkmate, the score counts it");

alex.ws.close();
sam.ws.close();
console.log('✓ Classics passed');
