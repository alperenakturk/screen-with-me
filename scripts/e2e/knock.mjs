// Owner's test round 1, R12: "Ask before letting people in". With the switch on, someone new waits at the door until
// the host lets them in; refused = banned like a kick; someone let in passes straight in later; with the host away
// they keep waiting; only the host answers; a full door refuses more knocks.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'knock' + Math.random().toString(36).slice(2, 8);
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function client(name, cid) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  let closed = null;
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('close', (e) => (closed = e.code));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, name, cid })));
  const wait = async (pred, label, ms = 10000) => {
    for (let t = 0; t < ms; t += 100) {
      const i = inbox.findIndex(pred);
      if (i >= 0) return inbox.splice(i, 1)[0];
      await sleep(100);
    }
    throw new Error('timeout ' + label);
  };
  return { ws, inbox, wait, closed: () => closed, send: (m) => ws.send(JSON.stringify(m)) };
}

let host = client('Alex', 'knockHostAlex01');
await host.wait((m) => m.t === 'welcome', 'host welcome');
host.send({ t: 'settings', knock: true });
await host.wait((m) => m.t === 'settings' && m.settings.knock === true, 'knock on');
ok(true, 'The host turns on "Ask before letting people in"');

// 1) A newcomer waits at the door; the host sees them.
const sam = client('Sam', 'knockSam000001');
const wait = await sam.wait((m) => m.t === 'knock-wait', 'sam waits');
const list = await host.wait((m) => m.t === 'knocks' && m.list.length === 1, 'host sees sam');
await sleep(300);
ok(wait.hostHere === true && !sam.inbox.some((m) => m.t === 'welcome') && list.list[0].name === 'Sam', 'A newcomer waits at the door (no welcome); the host sees them');
ok(!host.inbox.some((m) => m.t === 'members' && m.members.some((x) => x.name === 'Sam')), 'Someone at the door is not in the room\'s member list');

// 2) Only the host may answer.
const insider = client('Bo', 'knockHostAlex01'); // the host's second tab: passes straight in
await insider.wait((m) => m.t === 'welcome', 'host second tab passes');
ok(true, "The host's own second tab passes straight in");
insider.ws.close();

// 3) Let in → welcome, in the room.
host.send({ t: 'knock-answer', id: list.list[0].id, allow: true });
await sam.wait((m) => m.t === 'welcome', 'sam let in');
await host.wait((m) => m.t === 'members' && m.members.some((x) => x.name === 'Sam'), 'sam in members');
ok(true, 'Let in: the newcomer joins the room');
sam.send({ t: 'knock-answer', id: 'abcdefgh', allow: true });
ok((await sam.wait((m) => m.t === 'error', 'not host')).code === 'not_host', 'Only the host answers the door');

// 4) Someone let in comes back later without knocking.
sam.ws.close();
await sleep(400);
const samAgain = client('Sam', 'knockSam000001');
await samAgain.wait((m) => m.t === 'welcome', 'sam again');
ok(!samAgain.inbox.some((m) => m.t === 'knock-wait'), 'Someone let in passes straight in next time');

// 5) Refused = banned (a new connection from the same browser is refused too).
const eve = client('Eve', 'knockEve000001');
await eve.wait((m) => m.t === 'knock-wait', 'eve waits');
const eveCard = await host.wait((m) => m.t === 'knocks' && m.list.some((k) => k.name === 'Eve'), 'host sees eve');
host.send({ t: 'knock-answer', id: eveCard.list.find((k) => k.name === 'Eve').id, allow: false });
ok((await eve.wait((m) => m.t === 'error', 'eve refused')).code === 'kicked', 'Refused: the newcomer is turned away');
const eveAgain = client('Eve', 'knockEve000001');
ok((await eveAgain.wait((m) => m.t === 'error', 'eve banned')).code === 'kicked', 'Refused = banned: the same browser cannot knock again');

// 6) With the host away, a newcomer keeps waiting; the host sees them on return.
host.ws.close();
samAgain.ws.close();
await sleep(500);
const kim = client('Kim', 'knockKim000001');
const away = await kim.wait((m) => m.t === 'knock-wait', 'kim waits');
ok(away.hostHere === false, 'With the host away the newcomer waits and is told so (never let in by default)');
host = client('Alex', 'knockHostAlex01');
await host.wait((m) => m.t === 'welcome', 'host back');
const back = await host.wait((m) => m.t === 'knocks' && m.list.some((k) => k.name === 'Kim'), 'host sees kim');
ok(!!back && (await kim.wait((m) => m.t === 'knock-wait' && m.hostHere, 'kim told host is here')).hostHere, 'The host sees the waiting newcomer when they come back');

// 7) A full door: at most 2 knocks from one address at once (when the Worker knows the address).
const lee = client('Lee', 'knockLee000001');
await sleep(800);
const ray = client('Ray', 'knockRay000001');
await sleep(800);
const busy = ray.inbox.find((m) => m.t === 'error' && m.code === 'knock_busy');
const leeWaits = lee.inbox.some((m) => m.t === 'knock-wait');
ok(leeWaits && (busy || ray.inbox.some((m) => m.t === 'knock-wait')), `A third knock from one address ${busy ? 'is refused (knock_busy)' : 'waits (no address known on this server)'}`);

for (const c of [host, kim, lee, ray, eve, eveAgain]) c.ws.close();
console.log('knock: all passed');
