// ⚔️ Five Frames Duel for 2–6 (card GMP b): three, then six players race on the same word. Checks: the third and later
// people sit with "sit" (a seventh can't); the game starts when every seated player is ready; nobody playing gets
// another player's letters before the end (marks only); with three or more the race goes on after the first solve and
// ends when every board is done; the places follow the finishing order (and everyone who didn't find it shares the
// place after the last solver); six used-up boards are a draw with everyone first.
import { GameSocket } from './game-socket.mjs';
import { answerFor, decodeWords } from '../../packages/shared/src/games/five-frames.ts';
import * as EN from '../../packages/shared/src/games/words/en.ts';

const base = process.argv[2] ?? 'ws://localhost:8787';
const { allowed, answers } = decodeWords(EN.WORDS, EN.ANSWERS);
const words = [...allowed];
const NAMES = ['Alex', 'Sam', 'Robin', 'Kim', 'Lee', 'Max', 'Ari'];

function client(game, name, cid) {
  const ws = new GameSocket(`${base}/api/duel/${game}/ws`);
  setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ t: 'ping' })), 15_000).unref();
  const inbox = [];
  const raw = [];
  let last = null;
  ws.addEventListener('message', (e) => {
    raw.push(String(e.data));
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'state') last = m;
  });
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 1, name, cid })));
  return { ws, inbox, raw, send: (m) => ws.send(JSON.stringify(m)), get state() { return last; } };
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
/** Seven allowed words that are not the answer and share no letters with the first ones used (any will do). */
const wrongFor = (answer) => words.filter((w) => w !== answer).slice(0, 7);

async function table(n) {
  const game = 'fm' + Math.random().toString(36).slice(2, 8);
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

// ---- Three players ----
{
  const { people } = await table(3);
  const [alex, sam, robin] = people;
  alex.send({ t: 'ready', on: true });
  sam.send({ t: 'ready', on: true });
  await sleep(400);
  ok(alex.state.phase === 'wait', 'three seated: two ready is not enough');
  robin.send({ t: 'ready', on: true });
  ok(await until(() => people.every((p) => p.state.phase === 'play')), 'all three ready: the race starts');
  const answer = answerFor(alex.state.daily, answers, 'en');
  const wrong = wrongFor(answer);
  alex.send({ t: 'guess', word: wrong[0] });
  sam.send({ t: 'guess', word: wrong[1] });
  ok(await until(() => robin.state.players[0].marks.length === 1 && robin.state.players[1].marks.length === 1), 'every board\'s marks reach the others');
  const robinPlay = robin.raw.filter((t) => JSON.parse(t).phase === 'play');
  ok(!robinPlay.some((t) => t.includes(`"${wrong[0]}"`) || t.includes(`"${wrong[1]}"`)), 'no player gets another player\'s letters during the game');
  ok(!people.some((p) => p.raw.some((t) => JSON.parse(t).phase === 'play' && t.includes(`"${answer}"`))), 'nobody gets the answer during the game');
  // Sam solves first, then Alex; Robin runs out of tries.
  sam.send({ t: 'guess', word: answer });
  ok(await until(() => alex.state.players[1].solved), 'Sam finds it first');
  await sleep(300);
  ok(alex.state.phase === 'play', 'with three the race goes on after the first solve');
  alex.send({ t: 'guess', word: answer });
  ok(await until(() => robin.state.players[0].solved), 'Alex finds it second');
  ok(robin.state.phase === 'play', 'Robin still plays');
  for (const w of wrong) robin.send({ t: 'guess', word: w });
  ok(await until(() => people.every((p) => p.state.phase === 'over')), 'every board done: the game is over');
  const end = alex.state;
  ok(end.winner === 1 && !end.draw, 'the first to solve (Sam) wins');
  ok(JSON.stringify(end.ranks) === JSON.stringify([2, 1, 3]), `places follow the finishing order: ${JSON.stringify(end.ranks)}`);
  ok(people.every((p) => p.state.answer === answer && JSON.stringify(p.state.ranks) === JSON.stringify(end.ranks)), 'everyone sees the word and the same places');
  ok(robin.state.players[0].words?.length === 2, 'at the end everyone sees every board\'s letters');
  for (const p of people) p.ws.close();
}

// ---- Six players, and a seventh ----
{
  const { game, people } = await table(6);
  const extra = client(game, NAMES[6], 'g'.repeat(32));
  ok(await until(() => extra.state?.seat === -1), 'a seventh person watches');
  extra.send({ t: 'sit' });
  ok(await until(() => extra.inbox.some((m) => m.code === 'full')), 'a seventh can\'t sit: six seats at most');
  ok(extra.state.players.length === 6 && extra.state.players.every(Boolean), 'six seats, all taken');
  for (const p of people) p.send({ t: 'ready', on: true });
  ok(await until(() => people.every((p) => p.state.phase === 'play')), 'six ready: the race starts');
  const answer = answerFor(people[0].state.daily, answers, 'en');
  const wrong = wrongFor(answer);
  for (const p of people) for (const w of wrong) p.send({ t: 'guess', word: w });
  ok(await until(() => people.every((p) => p.state.phase === 'over'), 15000), 'six used-up boards: the game is over');
  ok(people[0].state.draw && people[0].state.winner === null, 'nobody found it: a draw');
  ok(JSON.stringify(people[0].state.ranks) === JSON.stringify([1, 1, 1, 1, 1, 1]), 'everyone shares the first place');
  ok(extra.state.players.every((p) => p.words?.length === 7), 'the watcher sees all six boards at the end');
  for (const p of [...people, extra]) p.ws.close();
}
console.log('\n✓ Five Frames Duel for 3 and 6 players');
process.exit(0);
