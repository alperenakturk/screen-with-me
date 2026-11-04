// Owner's test round 1, R11: people are told apart by the server's opaque per-room person key (`pk`, from the
// browser id), not by name + avatar. Two browsers with the same name and avatar are two people; one browser's two tabs
// are one; the key never is the browser id and differs between rooms.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'people' + Math.random().toString(36).slice(2, 8);
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function client(hello, where = room) {
  const ws = new WebSocket(`${base}/api/rooms/${where}/ws`);
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
  return { ws, inbox, wait };
}
const same = { name: 'Alex', avatar: 'wizard' };
const first = client({ ...same, cid: 'peopleAlexA001' });
await first.wait((m) => m.t === 'welcome', 'welcome first');
const twin = client({ ...same, cid: 'peopleAlexB002' });
await twin.wait((m) => m.t === 'welcome', 'welcome twin');
const tab = client({ ...same, cid: 'peopleAlexA001' });
await tab.wait((m) => m.t === 'welcome', 'welcome tab');
const list = await first.wait((m) => m.t === 'members' && m.members.length === 3, 'three connections');
const keys = list.members.map((m) => m.pk);
ok(keys.every((k) => typeof k === 'string' && /^[0-9a-f]{16}$/.test(k)), 'Every member has an opaque person key');
ok(new Set(keys).size === 2, 'Two browsers with the same name and avatar are two people; the same browser\'s two tabs are one');
ok(!JSON.stringify(list).includes('peopleAlex'), 'The browser ids never reach other clients');

const elsewhere = 'people' + Math.random().toString(36).slice(2, 8);
const away = client({ ...same, cid: 'peopleAlexA001' }, elsewhere);
const wAway = await away.wait((m) => m.t === 'welcome', 'welcome elsewhere');
const mine = wAway.members.find((m) => m.id === wAway.you)?.pk;
ok(typeof mine === 'string' && !keys.includes(mine), 'Another room gives the same browser another key (not linkable)');

for (const c of [first, twin, tab, away]) c.ws.close();
console.log('people: all passed');
