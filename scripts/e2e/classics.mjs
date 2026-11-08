// 🎲 Classics (P6): one table, a shelf of boards. Alex opens a Classics table and sits alone; Glowbeam the bot takes
// the other seat and answers every move through the server's rules; the board switches from the shelf only while no
// game is in progress; dama moves are checked (a man may not step backward); a second person joins the table and
// gets the board on it, whatever board their hello named.
const base = process.argv[2] ?? 'ws://localhost:8787';
const game = 'cl' + Math.random().toString(36).slice(2, 8);

function client(name, cid, kind = 'xox') {
  const ws = new WebSocket(`${base}/api/games/${game}/ws`);
  // GHOST: like the game pages, a ping every 15 s (a socket silent for 45 s is closed as a dead connection).
  setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ t: 'ping' })), 15_000).unref();
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

// Backgammon (P8): the server rolls the dice; a client can't send its own dice, only a roll and checker steps.
alex.send({ t: 'switch', game: 'backgammon' });
ok(await until(() => alex.state.kind === 'backgammon' && alex.state.game.pts?.length === 24 && alex.state.game.dice.length === 0), 'backgammon from the shelf: 24 points, nobody has rolled');
const ROLL = 1000;
sam.send({ t: 'move', cell: ROLL });
ok(await until(() => sam.inbox.some((m) => m.t === 'error' && m.code === 'not_your_turn')), 'only the player to move may roll');
alex.send({ t: 'move', cell: ROLL });
ok(await until(() => alex.state.game.rolled.length === 2 && alex.state.game.rolled.every((d) => d >= 1 && d <= 6)), `the server rolls two dice (${alex.state.game.rolled?.join('–')})`);
const g = alex.state.game;
ok(g.dice.length > 0 || g.passed === 'X', 'the roll leaves dice to use (or passes the turn when none fit)');

// Reversi: the server checks every disc (it must close a line), turns lines over, passes a side without a move and
// counts the discs at the end. A whole game between Alex (dark, X) and Sam (light, O), each playing a legal cell.
alex.send({ t: 'switch', game: 'reversi', end: true });
const discs = (b, m) => b.filter((c) => c === m).length;
ok(await until(() => alex.state.kind === 'reversi' && discs(alex.state.game.board, 'X') === 2 && discs(alex.state.game.board, 'O') === 2 && !alex.state.started), 'reversi from the shelf (ending the backgammon game): two discs each in the middle');
/** The cells `mark` may play (a plain copy of the rules, to drive the game). */
function legal(board, mark) {
  const them = mark === 'X' ? 'O' : 'X';
  const out = [];
  for (let i = 0; i < 64; i++) {
    if (board[i] !== null) continue;
    for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
      let r = Math.floor(i / 8) + dr;
      let c = (i % 8) + dc;
      let seen = 0;
      while (r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === them) (r += dr), (c += dc), seen++;
      if (seen && r >= 0 && r < 8 && c >= 0 && c < 8 && board[r * 8 + c] === mark) {
        out.push(i);
        break;
      }
    }
  }
  return out;
}
const rvErrors = () => alex.inbox.filter((m) => m.t === 'error' && m.code === 'not_your_turn').length;
let errorsBefore = rvErrors();
alex.send({ t: 'move', cell: 0 });
ok(await until(() => rvErrors() > errorsBefore), 'a disc that closes no line is refused');
sam.send({ t: 'move', cell: 19 });
ok(await until(() => sam.inbox.some((m) => m.t === 'error' && m.code === 'not_your_turn')), 'light may not play on dark’s turn');
alex.send({ t: 'move', cell: 19 });
ok(await until(() => alex.state.game.board[27] === 'X' && alex.state.game.flipped?.join() === '27' && alex.state.game.turn === 'O'), 'dark plays d3: d4 turns over, light’s turn');
let rvPlies = 1;
let sawPass = false;
while (alex.state.game.winner === null && rvPlies < 70) {
  const g = alex.state.game;
  const cells = legal(g.board, g.turn);
  ok(cells.length > 0, `ply ${rvPlies}: the side to move has a move (${g.turn})`);
  const cell = cells[(rvPlies * 7) % cells.length];
  const before = g.board.filter(Boolean).length;
  (g.turn === 'X' ? alex : sam).send({ t: 'move', cell });
  if (!(await until(() => alex.state.game.board.filter(Boolean).length === before + 1, 4000))) break;
  if (alex.state.game.passed) sawPass = true;
  rvPlies++;
}
const end = alex.state.game;
const x = discs(end.board, 'X');
const o = discs(end.board, 'O');
ok(end.winner === (x > o ? 'X' : x < o ? 'O' : 'draw'), `reversi plays to the end: ${x}–${o}, ${end.winner === 'draw' ? 'a draw' : `${end.winner} wins`}${sawPass ? ' (with a pass)' : ''}`);
ok(sam.state.game.winner === end.winner && sam.state.score[end.winner === 'draw' ? 'draw' : end.winner] >= 1, 'both players see the result, the score counts it');

alex.ws.close();
sam.ws.close();
console.log('✓ Classics passed');
