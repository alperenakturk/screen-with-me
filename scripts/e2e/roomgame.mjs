// In-room games hub: up to 4 tables at once (two can play XOX while others play a quiz), one table per person (a new
// one replaces my old one when nobody else is at it, otherwise table_own), tables_full, who is at which table
// (members), only the opener or the host closes a table, newcomers see the tables in welcome, the old single-game
// messages still work, and the game object really opens under the table id.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'rgame' + Math.random().toString(36).slice(2, 8);
const V = Number(process.env.SWM_V ?? 3);
function client(hello) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: V, ...hello })));
  const wait = async (pred, label, ms = 8000) => {
    for (let i = 0; i < ms / 50; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error('timeout ' + label);
  };
  return { ws, wait, inbox, send: (m) => ws.send(JSON.stringify(m)) };
}
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};

const a = client({ name: 'Ali', cid: 'rgameAli00001' });
const wa = await a.wait((m) => m.t === 'welcome', 'welcome a');
ok(wa.game === undefined && Array.isArray(wa.tables) && wa.tables.length === 0, 'A new room has no tables');
const b = client({ name: 'Ayse', cid: 'rgameAyse0001' });
await b.wait((m) => m.t === 'welcome', 'welcome b');

a.send({ t: 'table', open: 'xox' });
const t1 = await b.wait((m) => m.t === 'tables' && m.opened, 'xox table');
const xox = t1.tables.find((x) => x.id === t1.opened);
ok(xox.kind === 'xox' && t1.by.name === 'Ali' && /^[A-Za-z0-9_-]{3,40}$/.test(xox.id), 'Ali opened an XOX table (everyone got it)');
ok(!JSON.stringify(t1).includes('rgameAli'), 'The opener’s persistent id is never sent');
await b.wait((m) => m.t === 'game' && m.game?.id === xox.id, 'legacy game');

b.send({ t: 'table', open: 'quiz' });
const t2 = await a.wait((m) => m.t === 'tables' && m.opened && m.by.name === 'Ayse', 'quiz table');
const quiz = t2.tables.find((x) => x.id === t2.opened);
ok(t2.tables.length === 2 && quiz.kind === 'quiz', 'Ayşe opened a quiz table at the same time: two tables');

a.send({ t: 'at', table: xox.id });
const at = await b.wait((m) => m.t === 'members' && m.members.some((x) => x.name === 'Ali' && x.table === xox.id), 'at xox');
ok(at.members.find((x) => x.name === 'Ayse').table === undefined, 'Members show who is at which table');

b.send({ t: 'table', close: xox.id });
ok((await b.wait((m) => m.t === 'error', 'not host close')).code === 'not_host', 'Someone else cannot close a table they did not open');

// Ali opens Draw & Guess: nobody else is at his XOX table, so it is replaced.
a.send({ t: 'table', open: 'draw' });
const t3 = await b.wait((m) => m.t === 'tables' && m.tables.some((x) => x.id === m.opened && x.kind === 'draw'), 'draw table');
const draw = t3.tables.find((x) => x.id === t3.opened);
ok(t3.tables.length === 2 && !t3.tables.some((x) => x.id === xox.id) && draw.kind === 'draw', 'My new table replaced my empty old one');

b.send({ t: 'at', table: draw.id });
await a.wait((m) => m.t === 'members' && m.members.some((x) => x.name === 'Ayse' && x.table === draw.id), 'ayse at draw');
a.send({ t: 'table', open: 'four' });
ok((await a.wait((m) => m.t === 'error', 'own')).code === 'table_own', 'With someone at my table I cannot open another (table_own)');

// The game object opens under the table id.
const dws = new WebSocket(`${base}/api/draw/${draw.id}/ws`);
const drawWelcome = await new Promise((resolve, reject) => {
  dws.addEventListener('open', () => dws.send(JSON.stringify({ t: 'hello', v: 2, name: 'Ayse', cid: 'rgameAyse0001', lang: 'tr' })));
  dws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.t === 'welcome' || m.t === 'error') resolve(m);
  });
  setTimeout(() => reject(new Error('timeout draw')), 8000);
});
dws.close();
ok(drawWelcome.t === 'welcome', 'Draw & Guess opened under the table id');

// Four tables at most.
const c = client({ name: 'Can', cid: 'rgameCan00001' });
const wc = await c.wait((m) => m.t === 'welcome', 'welcome c');
ok(wc.tables.length === 2 && wc.tables.some((x) => x.id === draw.id) && wc.game?.id === draw.id, 'A newcomer sees the open tables');
c.send({ t: 'table', open: 'four' });
await a.wait((m) => m.t === 'tables' && m.tables.length === 3, 'three');
const d = client({ name: 'Deniz', cid: 'rgameDeniz001' });
await d.wait((m) => m.t === 'welcome', 'welcome d');
d.send({ t: 'table', open: 'xox' });
await a.wait((m) => m.t === 'tables' && m.tables.length === 4, 'four');
const e = client({ name: 'Eda', cid: 'rgameEda00001' });
await e.wait((m) => m.t === 'welcome', 'welcome e');
e.send({ t: 'table', open: 'quiz' });
ok((await e.wait((m) => m.t === 'error', 'full')).code === 'tables_full', 'A fifth table is refused (tables_full)');

// The host (Ali, first in) closes Ayşe's quiz table.
a.send({ t: 'table', close: quiz.id });
const closed = await b.wait((m) => m.t === 'tables' && m.closed === quiz.id, 'host close');
ok(closed.by.name === 'Ali' && closed.tables.length === 3, 'The host closed someone else’s table');

// The opener closes theirs; the people at it lose the mark.
a.send({ t: 'table', close: draw.id });
await b.wait((m) => m.t === 'tables' && m.closed === draw.id, 'opener close');
const after = await b.wait((m) => m.t === 'members' && !m.members.some((x) => x.table === draw.id), 'unmarked');
ok(after.members.every((x) => x.table !== draw.id), 'Closing a table clears who was at it');

// Old clients: {t:'game', end:true} closes my newest table.
c.send({ t: 'game', end: true });
const legacy = await a.wait((m) => m.t === 'tables' && m.closed && m.by?.name === 'Can', 'legacy end');
ok(legacy.by.name === 'Can' && legacy.tables.length === 1, 'The old "end game" message closes my table');

b.send({ t: 'table', open: 'chess' });
ok((await b.wait((m) => m.t === 'error', 'bad')).code === 'bad_message', 'An unknown game is refused');

for (const x of [a, b, c, d, e]) x.ws.close();
console.log('roomgame: all passed');
