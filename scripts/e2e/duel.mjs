// ⚔️ Five Frames Duel (card FFDUEL): two people race to the same word; the server holds it. Checks: before the end no
// message to a player or a watcher carries the answer or the other player's letters (only marks); bad guesses are
// refused one by one; a watcher can't guess or take a seat mid-game; a reconnect keeps a board; two winning guesses at
// the same moment give exactly one winner, the same for everyone; then everyone sees the word and both boards; a
// rematch is a practice word (never the day's); two used-up boards are a draw.
import { GameSocket } from './game-socket.mjs';
import { answerFor, decodeWords, score } from '../../packages/shared/src/games/five-frames.ts';
import * as EN from '../../packages/shared/src/games/words/en.ts';

const base = process.argv[2] ?? 'ws://localhost:8787';
const game = 'fd' + Math.random().toString(36).slice(2, 8);
const { allowed, answers } = decodeWords(EN.WORDS, EN.ANSWERS);
const words = [...allowed];

function client(name, cid) {
  const ws = new GameSocket(`${base}/api/duel/${game}/ws`);
  // GHOST: like the game pages, a ping every 15 s (a socket silent for 90 s is closed as a dead connection).
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
/** Messages a client got while a game was on that carry any of these words (case-insensitive, whole JSON text). */
const leaked = (c, list) => c.raw.filter((text) => {
  const m = JSON.parse(text);
  if (m.t === 'state' && m.phase === 'over') return false;
  const low = text.toLowerCase();
  return list.some((w) => low.includes(`"${w}"`));
});

const A = 'a'.repeat(32);
const B = 'b'.repeat(32);
const alex = client('Alex', A);
ok(await until(() => alex.state?.seat === 0 && alex.state.phase === 'wait'), 'Alex sits in seat 1, the table waits');
let sam = client('Sam', B);
ok(await until(() => sam.state?.seat === 1), 'Sam sits in seat 2');
const robin = client('Robin', 'c'.repeat(32));
ok(await until(() => robin.state?.seat === -1), 'Robin watches');
ok(!alex.state.answer && !robin.state.answer, 'nobody has a word yet');

// Turkish, then English again: a language change resets "ready".
alex.send({ t: 'ready', on: true });
ok(await until(() => sam.state.players[0].ready), 'Alex is ready');
sam.send({ t: 'lang', lang: 'tr' });
ok(await until(() => alex.state.lang === 'tr' && !alex.state.players[0].ready), 'a new language: Turkish, and Alex is not ready any more');
alex.send({ t: 'lang', lang: 'en' });
ok(await until(() => sam.state.lang === 'en'), 'back to English');
alex.send({ t: 'guess', word: 'crane' });
ok(await until(() => alex.inbox.some((m) => m.code === 'over')), 'no guessing before the game starts');
alex.send({ t: 'ready', on: true });
sam.send({ t: 'ready', on: true });
ok(await until(() => alex.state.phase === 'play' && sam.state.phase === 'play' && robin.state.phase === 'play'), 'both ready: the race starts');
const day = alex.state.daily;
ok(Number.isInteger(day) && day > 0, `the first game is the word of the day (#${day})`);
const answer = answerFor(day, answers, 'en');

// Bad guesses: refused, nothing counted.
for (const [word, code] of [['abc', 'short'], ['ab1de', 'letters'], ['qqqqq', 'unknown']]) {
  alex.inbox.length = 0;
  alex.send({ t: 'guess', word });
  ok(await until(() => alex.inbox.some((m) => m.code === code)), `"${word}" is refused (${code})`);
}
ok(alex.state.players[0].marks.length === 0, 'no bad guess counted');
robin.inbox.length = 0;
robin.send({ t: 'guess', word: answer });
ok(await until(() => robin.inbox.some((m) => m.code === 'not_player')), 'a watcher cannot guess');
robin.send({ t: 'sit' });
ok(await until(() => robin.inbox.some((m) => m.code === 'in_progress')), 'a watcher cannot take a seat mid-game');

// A few wrong guesses each (words that share letters with the answer, so the marks say something).
const wrong = words.filter((w) => w !== answer && new Set(w).size === 5 && score(w, answer).some((m) => m !== 'miss'));
const alexWords = wrong.slice(0, 2);
const samWords = wrong.slice(2, 5);
for (const w of alexWords) alex.send({ t: 'guess', word: w });
for (const w of samWords) sam.send({ t: 'guess', word: w });
ok(await until(() => alex.state.players[0].marks.length === 2 && alex.state.players[1].marks.length === 3), 'each sees the other board grow');
ok(JSON.stringify(alex.state.players[1].marks) === JSON.stringify(samWords.map((w) => score(w, answer))), "Alex gets Sam's marks, right ones");
ok(!alex.state.players[1].words && !sam.state.players[0].words, "nobody gets the other player's words");
ok(alex.state.players[0].words?.join() === alexWords.join(), 'each gets their own words');
ok(!robin.state.players[0].words && !robin.state.players[1].words, 'the watcher gets marks only');
alex.inbox.length = 0;
alex.send({ t: 'guess', word: alexWords[0] });
ok(await until(() => alex.inbox.some((m) => m.code === 'repeat')), 'the same word twice is refused');

// A reconnect keeps the board.
sam.ws.close();
ok(await until(() => alex.state.players[1].online === false), 'Sam drops: Alex sees him away');
sam = client('Sam', B);
ok(await until(() => sam.state?.seat === 1 && sam.state.phase === 'play'), 'Sam comes back to his seat');
ok(sam.state.players[1].words?.join() === samWords.join(), '… with his three guesses as they were');

// Nothing leaked so far: no message to Alex or Robin named the answer or a word of Sam's; none to Sam named Alex's.
ok(leaked(alex, [answer, ...samWords]).length === 0, "Alex never got the answer or Sam's letters");
ok(leaked(robin, [answer, ...samWords, ...alexWords]).length === 0, 'Robin never got the answer or any letters');
ok(leaked(sam, [answer, ...alexWords]).length === 0, "Sam never got the answer or Alex's letters");

// Both find it at the same moment: one winner, the same for everyone; the late one is told.
alex.inbox.length = 0;
sam.inbox.length = 0;
alex.send({ t: 'guess', word: answer });
sam.send({ t: 'guess', word: answer });
ok(await until(() => alex.state.phase === 'over' && sam.state.phase === 'over' && robin.state.phase === 'over'), 'the game is over for everyone');
const winner = alex.state.winner;
ok((winner === 0 || winner === 1) && sam.state.winner === winner && robin.state.winner === winner && !alex.state.draw, `exactly one winner, the same for all (seat ${winner + 1})`);
const late = winner === 0 ? sam : alex;
ok(await until(() => late.inbox.some((m) => m.code === 'over')), 'the second winning guess came too late and was told so');
ok(alex.state.players[winner].wins === 1 && alex.state.players[1 - winner].wins === 0, 'one win counted');
ok(robin.state.answer === answer && alex.state.answer === answer, 'now everyone sees the word');
ok(robin.state.players[1].words?.join().startsWith(samWords.join()), 'and both boards');

// Play again: a practice word, never the day's.
alex.send({ t: 'rematch' });
ok(await until(() => sam.state.players[0].ready && sam.state.phase === 'over'), 'Alex wants to play again');
sam.send({ t: 'rematch' });
ok(await until(() => alex.state.phase === 'play' && alex.state.round === 2), 'both again: a new game');
ok(alex.state.daily === null, 'the rematch is a practice word');
ok(alex.state.players.every((p) => p.marks.length === 0), 'new boards');
// Both use every try on wrong words: a draw (unless a word happens to be the practice word).
const pool = words.filter((w) => w !== answer).slice(100, 114);
for (let i = 0; i < 7; i++) {
  alex.send({ t: 'guess', word: pool[i] });
  sam.send({ t: 'guess', word: pool[7 + i] });
  await sleep(40);
}
ok(await until(() => alex.state.phase === 'over'), 'seven guesses each: the game ends');
const someoneSolved = alex.state.players.some((p) => p.solved);
ok(someoneSolved ? alex.state.winner !== null : alex.state.draw && alex.state.winner === null, someoneSolved ? 'a lucky guess won (no draw to check)' : 'nobody found it: a draw');
ok(alex.state.answer !== answer, 'the practice word was not the day’s word');

for (const c of [alex, sam, robin]) c.ws.close();

// ---- NG1: best of three in hard mode, at a new table ----
// The players play like a simple solver: each guess fits every mark seen so far (so it also keeps hard mode's rule).
const game2 = 'fm' + Math.random().toString(36).slice(2, 8);
function client2(name, cid) {
  const ws = new GameSocket(`${base}/api/duel/${game2}/ws`);
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
const p1 = client2('Alex', 'd'.repeat(32));
ok(await until(() => p1.state?.seat === 0), 'match table: Alex sits');
const p2 = client2('Sam', 'e'.repeat(32));
ok(await until(() => p2.state?.seat === 1), 'match table: Sam sits');
p2.send({ t: 'settings', bestOf: 3, hard: true });
ok(await until(() => p1.state.bestOf === 3 && p1.state.hard === true), 'Sam picks best of three and hard mode; Alex sees it');
p1.send({ t: 'ready', on: true });
p2.send({ t: 'ready', on: true });
ok(await until(() => p1.state.phase === 'play'), 'the match starts');
ok(Number.isInteger(p1.state.daily), 'game 1 of the match is the word of the day');
p1.inbox.length = 0;
p1.send({ t: 'settings', hard: false });
ok(await until(() => p1.inbox.some((m) => m.code === 'in_progress')), 'settings cannot change during a match');

// Hard mode: a word that ignores a found letter is refused, with the letter named.
const answer2 = answerFor(p1.state.daily, answers, 'en');
const withHit = words.find((w) => w !== answer2 && score(w, answer2).some((m) => m === 'hit'));
p1.send({ t: 'guess', word: withHit });
ok(await until(() => p1.state.players[0].marks.length === 1), 'Alex guesses a word with a letter in the right place');
const hitAt = score(withHit, answer2).indexOf('hit');
const breaker = words.find((w) => w[hitAt] !== withHit[hitAt] && w !== withHit);
p1.inbox.length = 0;
p1.send({ t: 'guess', word: breaker });
ok(await until(() => p1.inbox.some((m) => m.code === 'hard' && m.letter === withHit[hitAt] && m.at === hitAt)), `hard mode refuses a guess without the found letter (${withHit[hitAt]} at ${hitAt + 1})`);
ok(p1.state.players[0].marks.length === 1, '… and it does not count');

/** The words still possible after these guesses and marks. */
const fits = (guesses, marks) => words.filter((w) => guesses.every((g, i) => score(g, w).join() === marks[i].join()));
/** Plays one guess for a player: the first word that fits everything they saw. */
async function solverGuess(c, seat) {
  const me = c.state.players[seat];
  const left = fits(me.words ?? [], me.marks).filter((w) => !(me.words ?? []).includes(w));
  const before = me.marks.length;
  c.send({ t: 'guess', word: left[0] });
  return until(() => c.state.players[seat].marks.length > before || c.state.phase === 'over', 5000);
}
// Game 1: Alex finds the word of the day.
p1.send({ t: 'guess', word: answer2 });
ok(await until(() => p1.state.phase === 'over' && p1.state.winner === 0), 'Alex wins game 1');
ok(p1.state.match.wins.join() === '1,0' && !p1.state.match.over && p1.state.match.games === 1, 'the match stands 1–0 after game 1, not over');
let rounds = 1;
while (!p1.state.match.over && rounds < 3) {
  const r = p1.state.round;
  p1.send({ t: 'rematch' });
  p2.send({ t: 'rematch' });
  ok(await until(() => p1.state.phase === 'play' && p1.state.round === r + 1), `game ${rounds + 1} starts`);
  ok(p1.state.daily === null && p1.state.match.games === rounds, `game ${rounds + 1} is a practice word, the match goes on`);
  for (let i = 0; i < 7 && p1.state.phase === 'play'; i++) {
    if (p1.state.phase === 'play' && !p1.state.players[0].solved && !p1.state.players[0].out) await solverGuess(p1, 0);
    if (p2.state.phase === 'play' && !p2.state.players[1].solved && !p2.state.players[1].out) await solverGuess(p2, 1);
  }
  ok(await until(() => p1.state.phase === 'over'), `game ${rounds + 1} ends (every guess kept hard mode's rule)`);
  rounds++;
}
const m = p1.state.match;
ok(m.over && m.games <= 3 && (Math.max(...m.wins) >= 2 || m.games === 3), `the match is over after ${m.games} games (${m.wins.join('–')})`);
ok(m.winner === (m.wins[0] === m.wins[1] ? null : m.wins[0] > m.wins[1] ? 0 : 1), 'the match winner is the one with more wins');
const r2 = p1.state.round;
p1.send({ t: 'rematch' });
p2.send({ t: 'rematch' });
ok(await until(() => p1.state.phase === 'play' && p1.state.round === r2 + 1), 'Play again starts a new match');
ok(p1.state.match.games === 0 && p1.state.match.wins.join() === '0,0', 'the new match starts from 0–0');
for (const c of [p1, p2]) c.ws.close();
console.log('✓ Five Frames Duel e2e passed');
process.exit(0);
