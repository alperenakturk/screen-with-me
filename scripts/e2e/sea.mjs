// 🚢 Sea Battle (Game Studio): two people place and fire; the server keeps the fleets hidden. Checks: each player gets
// only their own ships (and the other side's sunk ones), a watcher gets none until the game is over, shots out of turn
// or twice are refused, a bad fleet is refused, a hit shoots again and a miss passes the turn, the game ends when a
// fleet is sunk and everyone then sees both fleets; a reload keeps the seat; Glowbeam plays a whole game.
import { GameSocket } from './game-socket.mjs';
const base = process.argv[2] ?? 'ws://localhost:8787';
const game = 'sb' + Math.random().toString(36).slice(2, 8);

function client(name, cid, id = game) {
  const ws = new GameSocket(`${base}/api/sea/${id}/ws`);
  // GHOST: like the game pages, a ping every 15 s (a socket silent for 90 s is closed as a dead connection).
  setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ t: 'ping' })), 15_000).unref();
  const inbox = [];
  let last = null;
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'state') last = m;
  });
  const opened = new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 1, name, cid })));
  return { ws, inbox, opened, send: (m) => ws.send(JSON.stringify(m)), get state() { return last; } };
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
/** Every message a client got never shows ships of the other seat (unless that sea's game is over). */
const leaks = (c, otherSeat) => c.inbox.filter((m) => m.t === 'state' && m.phase !== 'over' && m.seas[otherSeat]?.ships);

const alex = client('Alex', 'a'.repeat(32));
ok(await until(() => alex.state?.seat === 0 && alex.state.phase === 'place'), 'Alex sits in seat 1 with a fleet to place');
ok(alex.state.places?.length === 5 && alex.state.seas[0].ships?.length === 5, 'Alex sees his own random fleet');
const sam = client('Sam', 'b'.repeat(32));
ok(await until(() => sam.state?.seat === 1), 'Sam sits in seat 2');
const watcher = client('Robin', 'c'.repeat(32));
ok(await until(() => watcher.state?.seat === -1), 'Robin watches');
ok(!watcher.state.seas[0].ships && !watcher.state.seas[1].ships, 'the watcher sees no ships');
ok(!alex.state.seas[1].ships && !sam.state.seas[0].ships, "nobody sees the other player's ships");

// A bad fleet is refused (overlapping ships).
alex.inbox.length = 0;
alex.send({ t: 'place', ships: [{ at: 0, down: false }, { at: 0, down: true }, { at: 40, down: false }, { at: 60, down: false }, { at: 80, down: false }] });
ok(await until(() => alex.inbox.some((m) => m.code === 'bad_fleet')), 'an overlapping fleet is refused');
// Alex lays his fleet along rows 0, 2, 4, 6, 8; then a shuffle and back.
const ROWS = [0, 1, 2, 3, 4].map((i) => ({ at: i * 20, down: false }));
alex.send({ t: 'place', ships: ROWS });
ok(await until(() => alex.state.places?.[1]?.at === 20), 'Alex places his own fleet');
alex.send({ t: 'ready', on: true });
ok(await until(() => alex.state.players[0].ready), 'Alex is ready');
alex.send({ t: 'shot', cell: 0 });
ok(await until(() => alex.inbox.some((m) => m.code === 'not_your_turn')), 'no shooting before both are ready');
sam.send({ t: 'ready', on: true });
ok(await until(() => alex.state.phase === 'play' && sam.state.phase === 'play'), 'both ready: the battle starts');
ok(alex.state.turn === 0, 'seat 1 shoots first');

// Out of turn.
sam.inbox.length = 0;
sam.send({ t: 'shot', cell: 0 });
ok(await until(() => sam.inbox.some((m) => m.code === 'not_your_turn')), "a shot out of turn is refused");

// Alex aims with Sam's own view (a test may read it): first a miss (the turn passes), Sam misses back, then every cell
// of Sam's fleet (each hit keeps the turn).
const samShips = sam.state.seas[1].ships.flat();
const missCell = [...Array(100).keys()].find((c) => !samShips.includes(c));
alex.send({ t: 'shot', cell: missCell });
ok(await until(() => alex.state.seas[1].shots.length === 1 && alex.state.turn === 1), 'a miss passes the turn');
ok(alex.state.last?.result === 'miss', 'everyone hears it was a miss');
sam.send({ t: 'shot', cell: 99 });
ok(await until(() => alex.state.turn === 0), 'Sam misses at the far corner: back to Alex');
alex.inbox.length = 0;
alex.send({ t: 'shot', cell: missCell });
ok(await until(() => alex.inbox.some((m) => m.code === 'shot_twice')), 'the same cell twice is refused');
for (const [n, cell] of samShips.entries()) {
  await sleep(150); // a person's pace: the table's limit (20 messages, then 8 a second) holds here too
  alex.send({ t: 'shot', cell });
  ok(await until(() => alex.state.seas[1].shots.length === n + 2), `Alex hits ${cell}`);
  if (n === 0) ok(alex.state.turn === 0 && alex.state.last?.result === 'hit', 'a hit lets Alex shoot again');
}
// Alex's view arrives first; Sam's own copy of the same shot can be a moment behind on live.
ok(await until(() => sam.state.seas[1].sunk.length === 5), 'every ship of Sam is sunk');
ok(leaks(alex, 1).length === 0 && leaks(sam, 0).length === 0 && leaks(watcher, 0).length === 0 && leaks(watcher, 1).length === 0, 'no message ever carried a hidden ship');
ok(await until(() => alex.state.phase === 'over' && alex.state.winner === 0), 'Alex sinks the whole fleet and wins');
ok(await until(() => watcher.state.seas[0].ships && watcher.state.seas[1].ships), 'after the game everyone sees both fleets');
ok(alex.state.players[0].wins === 1, 'the score counts the win');

// Reload: Sam comes back to the same seat.
sam.ws.close();
await sleep(300);
const sam2 = client('Sam', 'b'.repeat(32));
ok(await until(() => sam2.state?.seat === 1), 'a reload keeps the seat');

// Rematch: a new game, Sam shoots first.
alex.send({ t: 'rematch' });
ok(await until(() => alex.state.phase === 'place' && alex.state.turn === 1 && alex.state.seas[0].shots.length === 0), 'rematch: a fresh game, the other player shoots first');

// Glowbeam: Robin alone at a new table plays a whole game against the bot.
const solo = client('Robin', 'c'.repeat(32), game + 'g');
ok(await until(() => solo.state?.seat === 0), 'Robin sits at an empty table');
solo.send({ t: 'bot', level: 2 });
ok(await until(() => solo.state.players[1]?.bot === 2 && solo.state.players[1].ready), 'Glowbeam sits, ready');
solo.send({ t: 'ready', on: true });
ok(await until(() => solo.state.phase === 'play'), 'the battle with Glowbeam starts');
let cell = 0;
// LIVE-GREEN: live plays until Glowbeam has fired a few shots (its bot runs in the same object either way); the local run
// plays the whole game.
const live = !/localhost|127\.0\.0\.1/.test(base);
for (let guard = 0; guard < 400 && solo.state.phase === 'play' && !(live && solo.state.seas[0].shots.length >= 3); guard++) {
  if (solo.state.turn !== 0) {
    await until(() => solo.state.turn === 0 || solo.state.phase !== 'play', 5000);
    continue;
  }
  const shot = new Set(solo.state.seas[1].shots.map(([c]) => c));
  while (shot.has(cell)) cell++;
  const before = solo.state.seas[1].shots.length;
  await sleep(150);
  solo.send({ t: 'shot', cell });
  await until(() => solo.state.seas[1].shots.length > before || solo.state.phase !== 'play', 4000);
}
if (!live) ok(solo.state.phase === 'over', `the game against Glowbeam ends (${solo.state.winner === 0 ? 'Robin' : 'Glowbeam'} wins)`);
ok(solo.state.seas[0].shots.length > 0, 'Glowbeam fired');
ok(leaks(solo, 1).length === 0, "Glowbeam's fleet never reached Robin before the end");

for (const c of [alex, sam2, watcher, solo]) c.ws.close();
console.log('✓ Sea Battle passed');
process.exit(0);
