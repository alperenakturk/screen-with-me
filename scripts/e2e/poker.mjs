// Life poker: seats in the lobby, host settings (jokers), dealing (each player gets only their own cards), turns
// (out of turn refused), the special moves (disqualify refunds the target and costs 10 life, peek shows a card only
// to the one who peeked, free fold gives your bets back), the showdown and the next hand.
const base = process.argv[2] ?? 'ws://localhost:8787';
const game = 'poker' + Math.random().toString(36).slice(2, 8);

function client(name, cid) {
  const ws = new WebSocket(`${base}/api/poker/${game}/ws`);
  // GHOST: like the game pages, a ping every 15 s (a socket silent for 90 s is closed as a dead connection).
  setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ t: 'ping' })), 15_000).unref();
  const inbox = [];
  let last = null;
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    inbox.push(m);
    if (m.t === 'state') last = m;
  });
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 1, name, cid })));
  const wait = async (pred, label, ms = 8000) => {
    for (let i = 0; i < ms / 50; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
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

const alex = client('Alex', 'pokerAlex00001');
const wa = await alex.wait((m) => m.t === 'welcome', 'welcome alex');
const sam = client('Sam', 'pokerSam0001');
const wy = await sam.wait((m) => m.t === 'welcome', 'welcome sam');
const max = client('Max', 'pokerMax00001');
const wc = await max.wait((m) => m.t === 'welcome', 'welcome can');
await sleep(300);
const lobby = max.state;
ok(lobby.phase === 'lobby' && lobby.players.length === 3 && lobby.host === wa.you, 'Three seats in the lobby, the first one is the host');

sam.send({ t: 'settings', jokers: true });
ok((await sam.wait((m) => m.t === 'error', 'not host')).code === 'not_host', 'Only the host changes the deck');
alex.send({ t: 'settings', jokers: true });
await max.wait((m) => m.t === 'state' && m.jokers === true, 'jokers');
ok(true, 'The host turned jokers on');

sam.send({ t: 'start' });
ok((await sam.wait((m) => m.t === 'error', 'not host start')).code === 'not_host', 'Only the host deals');
alex.send({ t: 'start' });
const cardsA = await alex.wait((m) => m.t === 'cards', 'cards alex');
const cardsY = await sam.wait((m) => m.t === 'cards', 'cards sam');
await max.wait((m) => m.t === 'cards', 'cards can');
await sleep(300);
ok(cardsA.cards.length === 2 && cardsY.cards.length === 2 && cardsA.cards.join() !== cardsY.cards.join(), 'Everyone got two cards of their own');
const s1 = alex.state;
ok(s1.phase === 'preflop' && s1.pot === 6 && s1.players.every((p) => !('cards' in p)), 'Preflop: blinds 2 + 4 in the pot, nobody sees others’ cards');
ok(!alex.inbox.some((m) => m.t === 'cards' && m.cards.join() === cardsY.cards.join()), 'Sam’s cards never reached Alex');

const byId = { [wa.you]: alex, [wy.you]: sam, [wc.you]: max };
const actor = () => byId[alex.state.toAct];
const others = () => Object.values(byId).filter((c) => c !== actor());

// Out of turn.
const wrong = others()[0];
wrong.send({ t: 'act', a: 'call' });
ok((await wrong.wait((m) => m.t === 'error', 'turn')).code === 'not_your_turn', 'Acting out of turn is refused');

// The first to act raises to 20.
const raiser = actor();
const raiserId = Object.keys(byId).find((k) => byId[k] === raiser);
raiser.send({ t: 'act', a: 'raise', to: 20 });
await alex.wait((m) => m.t === 'state' && m.last?.e === 'act' && m.last.a === 'raise', 'raise');
ok(alex.state.pot === 26 && alex.state.currentBet === 20, 'Raise to 20: the pot holds 26');

// Someone else disqualifies the raiser: the raiser gets their 20 back, the mover loses 10 life.
const mover = Object.values(byId).find((c) => c !== raiser);
const moverId = Object.keys(byId).find((k) => byId[k] === mover);
const moverLife = alex.state.players.find((p) => p.id === moverId).life;
mover.send({ t: 'move', m: 'dq', target: raiserId });
await alex.wait((m) => m.t === 'state' && m.last?.e === 'move' && m.last.m === 'dq', 'dq');
const afterDq = alex.state;
const r = afterDq.players.find((p) => p.id === raiserId);
const mv = afterDq.players.find((p) => p.id === moverId);
ok(r.dq && r.life === 100 && mv.life === moverLife - 10 && mv.used.includes('dq'), 'Disqualify: the raiser is out of the hand with all 100 life, the mover paid 10');

// Peek: only the one who peeked sees the card.
const peeker = Object.values(byId).find((c) => c !== raiser && c !== mover);
peeker.send({ t: 'move', m: 'peek', target: moverId });
const peek = await peeker.wait((m) => m.t === 'peek', 'peek');
await sleep(300);
ok(peek.target === moverId && typeof peek.card === 'string' && !mover.inbox.some((m) => m.t === 'peek') && !raiser.inbox.some((m) => m.t === 'peek'), 'Peek: the card went only to the one who peeked');

// Play the hand out: whoever acts checks or calls.
for (let i = 0; i < 20 && alex.state.phase !== 'showdown'; i++) {
  const s = alex.state;
  const c = byId[s.toAct];
  if (!c) break;
  c.send({ t: 'act', a: s.options && s.options.call > 0 ? 'call' : 'check' });
  await alex.wait((m) => m.t === 'state' && (m.toAct !== s.toAct || m.phase !== s.phase), 'next turn');
}
const sd = alex.state;
ok(sd.phase === 'showdown' && sd.board.length === 5 && sd.players.filter((p) => p.cards).length === 2, 'Showdown: five shared cards, the two left show their hands');
const total = sd.players.reduce((sum, p) => sum + p.life, 0);
ok(total === 300 - 10 - 5, 'No life was created or lost (only the 10 + 5 spent on moves)');
ok(sd.players.some((p) => p.won > 0), 'Someone won the pot');

// The next hand after the pause, with new cards. Like the game page, ping now and then: a pause whose time is up moves
// on with any message even when the server's alarm runs late (live, right after a deploy).
const pinger = setInterval(() => {
  for (const c of [alex, sam, max]) if (c.ws.readyState === WebSocket.OPEN) c.send({ t: 'ping' });
}, 1000);
const next = await alex.wait((m) => m.t === 'cards' && m.hand === 2, 'hand 2', 12000);
clearInterval(pinger);
ok(next.cards.length === 2, 'The next hand is dealt after the showdown');

for (const c of [alex, sam, max]) c.ws.close();
console.log('poker: all passed');
setTimeout(() => process.exit(0), 100);
