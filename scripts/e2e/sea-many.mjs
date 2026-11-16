// 🚢 Sea Battle for 2–6 (card GMP b): three, then six players. Checks: the third and later people sit with "sit" (a
// seventh can't); the game starts when every seated player is ready; a player gets only their own ships, a watcher
// every ship; a shot must name a seat still afloat that isn't mine; a fleet that sinks is out (never gets the turn
// again) and keeps watching; the last fleet afloat wins, the places follow the sinking order; Stub can't join a table
// of three.
import { GameSocket } from './game-socket.mjs';

const base = process.argv[2] ?? 'ws://localhost:8787';
const NAMES = ['Alex', 'Sam', 'Robin', 'Kim', 'Lee', 'Max', 'Ari'];

function client(game, name, cid) {
  const ws = new GameSocket(`${base}/api/sea/${game}/ws`);
  setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ t: 'ping' })), 15_000).unref();
  const inbox = [];
  let last = null;
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'state') last = m;
  });
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 1, name, cid })));
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

async function table(n) {
  const game = 'sm' + Math.random().toString(36).slice(2, 8);
  const people = [];
  for (let i = 0; i < n; i++) {
    const c = client(game, NAMES[i], String.fromCharCode(97 + i).repeat(32));
    people.push(c);
    ok(await until(() => c.state && (i < 2 ? c.state.seat === i : c.state.seat === -1)), `${n} players: ${NAMES[i]} ${i < 2 ? `sits in seat ${i + 1}` : 'watches first'}`);
    if (i >= 2) {
      c.send({ t: 'sit' });
      ok(await until(() => c.state.seat === i), `${n} players: ${NAMES[i]} takes seat ${i + 1} with "sit"`);
    }
  }
  return { game, people };
}

/**
 * Plays until the game is over: on its turn a player shoots the next cell of `pick(state)`'s sea, a hit and then a miss (read from the
 * watcher, who sees every fleet, so the run stays short on live). Returns the seats that had a turn after being sunk
 * (should stay empty).
 */
async function play(people, pick, watcher) {
  const outTurns = [];
  for (let step = 0; step < 4000; step++) {
    const s = people[0].state;
    if (s.phase === 'over') return outTurns;
    const shooter = people[s.turn];
    if (s.players[s.turn]?.out) outTurns.push(s.turn);
    const target = pick(s);
    const shot = new Set(s.seas[target].shots.map(([c]) => c));
    // One hit, then one miss: a hit keeps the turn, so the turn goes round the table and past every sunk fleet.
    const ship = new Set(watcher.state.seas[target].ships.flat());
    const missNext = s.last?.by === s.turn && s.last.result !== 'miss';
    const cell = Array.from({ length: 100 }, (_, i) => i).find((c) => !shot.has(c) && ship.has(c) !== missNext);
    const before = JSON.stringify(s.seas[target].shots.length) + s.turn;
    shooter.send({ t: 'shot', cell, target });
    await until(() => JSON.stringify(people[0].state.seas[target].shots.length) + people[0].state.turn !== before || people[0].state.phase === 'over', 4000);
  }
  throw new Error('FAIL: the game never ended');
}

// ---- Three players ----
{
  const { game, people } = await table(3);
  const [alex, sam, robin] = people;
  alex.send({ t: 'bot', level: 1 });
  ok(await until(() => alex.inbox.some((m) => m.code === 'too_many')), 'Stub can\'t join a table of three');
  const watcher = client(game, NAMES[6], 'g'.repeat(32));
  ok(await until(() => watcher.state?.seat === -1), 'a fourth person watches');
  for (const p of people) p.send({ t: 'ready', on: true });
  ok(await until(() => people.every((p) => p.state.phase === 'play')), 'all three ready: the battle starts');
  const s = alex.state;
  ok(s.seas.length === 3 && s.players.length === 3, 'three seas, three players');
  ok(people.every((p, i) => p.state.seas.every((sea, j) => (i === j ? !!sea.ships : !sea.ships))), 'each player gets only their own ships');
  ok(watcher.state.seas.every((sea) => !!sea.ships), 'the watcher sees every ship');
  const turn = s.turn;
  const shooter = people[turn];
  shooter.send({ t: 'shot', cell: 0 });
  ok(await until(() => shooter.inbox.some((m) => m.code === 'bad_target')), 'with three a shot must name its target');
  shooter.send({ t: 'shot', cell: 0, target: turn });
  ok(await until(() => shooter.inbox.filter((m) => m.code === 'bad_target').length === 2), 'never my own sea');
  // Alex and Sam shoot Robin (seat 3) until his fleet sinks (Robin shoots Alex), then Alex and Sam fight on.
  const outTurns = await play(people, (st) => (st.players[2].out || st.turn === 2 ? (st.turn === 0 ? 1 : 0) : 2), watcher);
  ok(!outTurns.length, 'a sunk fleet never gets the turn again');
  const end = alex.state;
  ok(end.phase === 'over' && (end.winner === 0 || end.winner === 1), `the last fleet afloat wins (${NAMES[end.winner]})`);
  ok(end.players[2].out && end.ranks[2] === 3, `Robin, sunk first, is third: ${JSON.stringify(end.ranks)}`);
  ok(end.ranks[end.winner] === 1 && end.ranks[1 - end.winner] === 2, 'the winner first, the last one sunk second');
  ok(people.every((p) => p.state.seas.every((sea) => !!sea.ships)), 'at the end everyone sees every fleet');
  ok(robin.state.seat === 2, 'Robin keeps his seat and watches the end');
  for (const p of [...people, watcher]) p.ws.close();
}

// ---- Six players, and a seventh ----
{
  const { game, people } = await table(6);
  const extra = client(game, NAMES[6], 'g'.repeat(32));
  ok(await until(() => extra.state?.seat === -1), 'a seventh person watches');
  extra.send({ t: 'sit' });
  ok(await until(() => extra.inbox.some((m) => m.code === 'full')), 'a seventh can\'t sit: six seats at most');
  for (const p of people) p.send({ t: 'ready', on: true });
  ok(await until(() => people.every((p) => p.state.phase === 'play')), 'six ready: the battle starts');
  // Everyone shoots the next seat still afloat after them.
  const outTurns = await play(people, (st) => {
    for (let k = 1; k < 6; k++) {
      const i = (st.turn + k) % 6;
      if (!st.players[i].out) return i;
    }
    return (st.turn + 1) % 6;
  }, extra);
  ok(!outTurns.length, 'six players: a sunk fleet never gets the turn again');
  const end = people[0].state;
  ok(end.phase === 'over' && end.players.filter((p) => p.out).length === 5, 'five fleets sunk: one left afloat wins');
  ok([...end.ranks].sort().join() === '1,2,3,4,5,6', `six different places: ${JSON.stringify(end.ranks)}`);
  for (const p of [...people, extra]) p.ws.close();
}
console.log('\n✓ Sea Battle for 3 and 6 players');
process.exit(0);
