// 🎲 Classics, card CL2 (owner: "I picked chess once and then couldn't switch to any other game"): the board changes
// at any time. For every pair of boards (from → to), against Glowbeam: a game is started on `from`; a plain switch is
// refused while it runs (the page asks "End this game and change?" first), a switch with `end` ends it and puts `to` on
// the table, fresh. Then the same from a finished game, and between two people (both see the new board).
const base = process.argv[2] ?? 'ws://localhost:8787';
const game = 'cs' + Math.random().toString(36).slice(2, 8);
const BOARDS = ['xox', 'four', 'dama', 'chess', 'backgammon'];

function client(name, cid) {
  const ws = new WebSocket(`${base}/api/games/${game}/ws`);
  const inbox = [];
  let last = null;
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'state') last = m;
  });
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 2, game: 'xox', name, cid, classics: true })));
  return { ws, inbox, send: (m) => ws.send(JSON.stringify(m)), get state() { return last; } };
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
const sq = (name) => (8 - Number(name[1])) * 8 + (name.charCodeAt(0) - 97);
/** A first move for white (X) on each board: it starts the game. */
const FIRST = {
  xox: 4,
  four: 3,
  dama: (5 * 8 + 3) * 64 + (4 * 8 + 3),
  chess: sq('e2') * 64 + sq('e4'),
  backgammon: 1000, // ROLL
};

const alex = client('Alex', 'c'.repeat(32));
ok(await until(() => alex.state?.classics === true), 'a Classics table opens');
alex.send({ t: 'bot', level: 1 });
ok(await until(() => alex.state.seats[1]?.bot === 1), 'Glowbeam sits');

/** Puts `kind` on the table with a fresh game (ending whatever runs). */
async function onBoard(kind) {
  alex.send({ t: 'switch', game: kind, end: true });
  return until(() => alex.state.kind === kind && !alex.state.started && alex.state.chosen === true);
}
/** Starts a game on the board on the table: my first move (Glowbeam may answer). */
async function start() {
  const kind = alex.state.kind;
  // X starts a fresh game; if Glowbeam started this one (after a rematch) it is running already.
  if (alex.state.started) return true;
  alex.send({ t: 'move', cell: FIRST[kind] });
  return until(() => alex.state.started === true && alex.state.game.winner === null);
}

for (const from of BOARDS) {
  for (const to of BOARDS) {
    if (from === to) continue;
    // Paced like a person: the table's normal limit (20 messages, then 8 a second) also holds here.
    await sleep(1300);
    ok(await onBoard(from), `${from} on the table`);
    ok(await start(), `${from}: a game against Glowbeam is running`);
    alex.inbox.length = 0;
    alex.send({ t: 'switch', game: to });
    const refused = await until(() => alex.inbox.some((m) => m.t === 'error' && m.code === 'in_progress'));
    ok(refused && alex.state.kind === from, `${from} → ${to}: a plain switch waits for "End this game?"${refused ? '' : ` (got ${JSON.stringify(alex.inbox.filter((m) => m.t === 'error').map((m) => m.code))}, started ${alex.state.started}, winner ${alex.state.game.winner})`}`);
    alex.send({ t: 'switch', game: to, end: true });
    ok(await until(() => alex.state.kind === to && !alex.state.started && alex.state.game.winner === null), `${from} → ${to}: "End and change" puts ${to} on the table, fresh`);
  }
}

// After a finished game the board changes at once (no "end" needed): tic-tac-toe played out against Glowbeam.
ok(await onBoard('xox'), 'tic-tac-toe again');
for (let i = 0; i < 6 && alex.state.game.winner === null; i++) {
  const free = alex.state.game.board.findIndex((c) => c === null);
  const before = alex.state.game.board.filter(Boolean).length;
  if (alex.state.game.turn === 'X') alex.send({ t: 'move', cell: free });
  await until(() => alex.state.game.winner !== null || alex.state.game.board.filter(Boolean).length >= before + 2, 6000);
}
ok(alex.state.game.winner !== null, `the game is over (${alex.state.game.winner})`);
alex.send({ t: 'switch', game: 'chess' });
ok(await until(() => alex.state.kind === 'chess'), 'after a finished game: chess at once');

// Glowbeam opens the next game (the starter swaps after a rematch): still a switch away.
alex.send({ t: 'rematch' });
await until(() => alex.state.started === true, 4000);
alex.send({ t: 'switch', game: 'dama', end: true });
ok(await until(() => alex.state.kind === 'dama' && !alex.state.started), 'even when Glowbeam made the first move, "End and change" works');

// Between two people: Sam takes Glowbeam's seat, a game runs, Alex ends it for another board; both see it.
const sam = client('Sam', 'd'.repeat(32));
ok(await until(() => sam.state?.kind === 'dama'), 'Sam joins the table');
sam.send({ t: 'sit', seat: 1 });
ok(await until(() => alex.state.seats[1]?.name === 'Sam'), 'Sam sits');
ok(await start(), 'a dama game between two people runs');
alex.send({ t: 'switch', game: 'backgammon', end: true });
ok(await until(() => alex.state.kind === 'backgammon' && sam.state.kind === 'backgammon' && !sam.state.started), 'Alex ends it for backgammon: both see the new board');
sam.send({ t: 'move', cell: FIRST.backgammon });
alex.send({ t: 'move', cell: FIRST.backgammon });
await until(() => alex.state.started === true, 4000);
sam.send({ t: 'switch', game: 'xox', end: true });
ok(await until(() => alex.state.kind === 'xox' && sam.state.kind === 'xox'), 'the other player can end and change too');

alex.ws.close();
sam.ws.close();
console.log('✓ Classics switching passed');
process.exit(0);
