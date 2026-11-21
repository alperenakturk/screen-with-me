// Card FR1: "Rate the film". Alex (host) starts the poll, Sam can't; both get the same poll with the people to pick
// from; a bad answer is refused, a second answer from the same browser is ignored; when everyone has answered the
// results come out by themselves: the average, the picks with names, the counts, and never a browser id or who voted
// what. A late joiner gets the poll in the welcome; the host closes it for everyone. Every step waits for a message.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'filmrate' + Math.random().toString(36).slice(2, 8);
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function client(hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, ...hello })));
  const wait = async (pred, label, ms = 15000) => {
    for (let t = 0; t < ms; t += 50) {
      const i = inbox.findIndex(pred);
      if (i >= 0) return inbox.splice(i, 1)[0];
      await sleep(50);
    }
    throw new Error('timeout ' + label);
  };
  const send = (m) => ws.send(JSON.stringify(m));
  const close = () => new Promise((r) => (ws.readyState === WebSocket.CLOSED ? r() : (ws.addEventListener('close', () => r()), ws.close())));
  return { ws, inbox, wait, send, close };
}

const alex = client({ name: 'Alex', cid: 'rateAlex12345' });
const hello = await alex.wait((m) => m.t === 'welcome', 'welcome');
const sam = client({ name: 'Sam', cid: 'rateSam123456' });
const samHello = await sam.wait((m) => m.t === 'welcome', 'welcome Sam');
ok(!hello.rate && !samHello.rate, 'no poll in a new room');

sam.send({ t: 'rate-start' });
await sam.wait((m) => m.t === 'error' && m.code === 'not_host', 'guest refused');
ok(true, 'a guest cannot start the poll');

alex.send({ t: 'rate-start' });
const started = await sam.wait((m) => m.t === 'rate' && m.rate, 'poll to Sam');
const poll = started.rate;
ok(poll.by === 'Alex' && poll.answered === 0 && poll.waiting === 2 && !poll.results, 'the host starts it; it waits for 2');
const names = poll.people.map((p) => p.name).sort();
ok(names.join() === 'Alex,Sam', 'the people to pick from are the room', names);
const samId = poll.people.find((p) => p.name === 'Sam').id;
const alexId = poll.people.find((p) => p.name === 'Alex').id;
await alex.wait((m) => m.t === 'rate' && m.rate?.id === poll.id, 'poll to Alex');

alex.send({ t: 'rate-start' });
const same = await alex.wait((m) => m.t === 'rate', 'second start');
ok(same.rate.id === poll.id, 'a second start while it runs keeps the same poll');

sam.send({ t: 'rate-answer', id: poll.id, stars: 7 });
await sam.wait((m) => m.t === 'error' && m.code === 'bad_message', 'bad answer');
ok(true, 'a bad answer (7 stars) is refused');

sam.send({ t: 'rate-answer', id: poll.id, stars: 4.5, most: samId, least: alexId, again: 'yes', word: 'fun' });
const one = await alex.wait((m) => m.t === 'rate' && m.rate?.answered === 1, 'one answered');
ok(!one.rate.results, 'after one of two answers no results yet');
sam.send({ t: 'rate-answer', id: poll.id, stars: 0.5 });
await sleep(600);
ok(!alex.inbox.some((m) => m.t === 'rate' && m.rate?.answered === 2), 'a second answer from the same browser is ignored');

alex.send({ t: 'rate-answer', id: poll.id, stars: 3, most: samId, again: 'maybe', word: 'fun' });
const done = await sam.wait((m) => m.t === 'rate' && m.rate?.results, 'results');
const r = done.rate.results;
ok(r.votes === 2 && r.stars === 3.8, 'everyone answered: the results come out (average 3.8)', r.stars);
ok(r.most[0]?.name === 'Sam' && r.most[0].n === 2 && r.least[0]?.name === 'Alex' && r.least[0].n === 1, 'the picks carry names and counts');
ok(r.again.yes === 1 && r.again.maybe === 1 && r.words.fun === 2, 'again and one-word counts');
const wire = JSON.stringify(done);
ok(!wire.includes('rateSam123456') && !wire.includes('rateAlex12345') && !wire.includes('"answers"') && !wire.includes('"expect"'), 'no browser ids, no who-voted-what on the wire');

const kim = client({ name: 'Kim', cid: 'rateKim123456' });
const kimHello = await kim.wait((m) => m.t === 'welcome', 'welcome Kim');
ok(kimHello.rate?.id === poll.id && kimHello.rate.results?.votes === 2, 'a late joiner gets the poll with its results');

sam.send({ t: 'rate-end' });
await sam.wait((m) => m.t === 'error' && m.code === 'not_host', 'guest close refused');
alex.send({ t: 'rate-end' });
await kim.wait((m) => m.t === 'rate' && m.rate === null, 'closed');
ok(true, 'the host closes it for everyone');

// A new poll; the host shows the results before everyone answered.
alex.send({ t: 'rate-start' });
const second = (await kim.wait((m) => m.t === 'rate' && m.rate && !m.rate.results, 'second poll')).rate;
ok(second.id !== poll.id && second.waiting === 3, 'a new poll waits for the 3 people now here');
kim.send({ t: 'rate-answer', id: second.id, stars: 5 });
await alex.wait((m) => m.t === 'rate' && m.rate?.answered === 1, 'Kim answered');
alex.send({ t: 'rate-end' });
const early = await sam.wait((m) => m.t === 'rate' && m.rate?.results, 'early results');
ok(early.rate.results.votes === 1 && early.rate.results.stars === 5, '"Show the results now" counts who answered');
sam.send({ t: 'rate-answer', id: second.id, stars: 1 });
await sleep(500);
ok(!sam.inbox.some((m) => m.t === 'rate' && m.rate?.results?.votes === 2), 'no answers after the results are out');

await Promise.all([alex.close(), sam.close(), kim.close()]);
console.log('film rate: all checks passed');
