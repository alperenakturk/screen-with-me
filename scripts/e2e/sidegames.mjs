// Side games 2: the room's tip jar (pick 5) fills with everyone's Snack Bar serves while the film plays, and a Window
// Garden cutting (pick 8) goes only to the person it is for, never to myself, a third member or with an unknown plant.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'sidegames' + Math.random().toString(36).slice(2, 8);
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
  const wait = async (pred, label, ms = 10000) => {
    for (let t = 0; t < ms; t += 100) {
      const i = inbox.findIndex(pred);
      if (i >= 0) return inbox.splice(i, 1)[0];
      await sleep(100);
    }
    throw new Error('timeout ' + label);
  };
  const send = (m) => ws.send(JSON.stringify(m));
  return { ws, inbox, wait, send };
}

const alex = client({ name: 'Alex', avatar: 'wizard', cid: 'sidegamesAlex01' });
const wA = await alex.wait((m) => m.t === 'welcome', 'welcome alex');
// Nothing plays yet: tips are dropped.
for (let i = 0; i < 2; i++) alex.send({ t: 'tip' });
alex.send({ t: 'load', media: { kind: 'test' } });
const st = await alex.wait((m) => m.t === 'state' && m.state.item, 'state');
if (st.state.paused) alex.send({ t: 'play', position: 0 });
await sleep(400);
const sam = client({ name: 'Sam', avatar: 'elf', cid: 'sidegamesSam002' });
const wS = await sam.wait((m) => m.t === 'welcome', 'welcome sam');
const kim = client({ name: 'Kim', avatar: 'dwarf', cid: 'sidegamesKim003' });
await kim.wait((m) => m.t === 'welcome', 'welcome kim');
await sleep(300);
for (const c of [alex, sam, kim]) c.inbox.length = 0;

// Two serves each at once (the per-person limit's burst), then one more after the limit refills = 5 coins.
for (let i = 0; i < 2; i++) {
  alex.send({ t: 'tip' });
  sam.send({ t: 'tip' });
}
await sleep(2300);
alex.send({ t: 'tip' });
const jar = await kim.wait((m) => m.t === 'tipjar', 'tip jar news');
ok(jar.fill === 5 && jar.size > 5 && jar.boost === null, `Everyone hears the tip jar fill (5 of ${jar.size}), not before the film played`);
for (let i = 0; i < 20; i++) alex.send({ t: 'tip' });
await sleep(600);
ok(!kim.inbox.some((m) => m.t === 'tipjar'), 'A flood of tips from one person is limited (no news for the extra ones)');
const late = client({ name: 'Lee', avatar: 'warrior', cid: 'sidegamesLee004' });
await late.wait((m) => m.t === 'welcome', 'welcome lee');
const lateJar = await late.wait((m) => m.t === 'tipjar', 'late jar');
ok(lateJar.fill >= 5, 'A newcomer gets the jar after the welcome');

// Cuttings.
alex.send({ t: 'gift', to: wS.you, plant: 'mint' });
const gift = await sam.wait((m) => m.t === 'gift', 'sam gets the cutting');
ok(gift.plant === 'mint' && gift.from.id === wA.you, 'The cutting reaches the person it is for, with the giver');
await sleep(500);
ok(!kim.inbox.some((m) => m.t === 'gift') && !alex.inbox.some((m) => m.t === 'gift'), 'Nobody else gets it, not even the giver');
alex.send({ t: 'gift', to: wS.you, plant: 'mint' });
await sleep(600);
ok(!sam.inbox.some((m) => m.t === 'gift'), 'A second cutting within 30 s is held back');
kim.send({ t: 'gift', to: wS.you, plant: 'dragon-lily' });
kim.send({ t: 'gift', to: wS.you, plant: '<b>' });
sam.send({ t: 'gift', to: wS.you, plant: 'fern' });
await sleep(600);
ok(!sam.inbox.some((m) => m.t === 'gift'), 'Unknown plants and cuttings to myself go nowhere');

for (const c of [alex, sam, kim, late]) c.ws.close();
console.log('\n✓ side games e2e passed');
process.exit(0);
