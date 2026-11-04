// Card R13: a private message goes only to that person's connections (not their TV) and back to the sender's; never
// to a third member, never into the room's history, and a message for someone who left is refused.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'private' + Math.random().toString(36).slice(2, 8);
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

const alex = client({ name: 'Alex', avatar: 'wizard', cid: 'privateAlex0001' });
const wA = await alex.wait((m) => m.t === 'welcome', 'welcome alex');
const sam = client({ name: 'Sam', avatar: 'elf', cid: 'privateSam00002' });
const wS = await sam.wait((m) => m.t === 'welcome', 'welcome sam');
const samTab = client({ name: 'Sam', avatar: 'elf', cid: 'privateSam00002' });
await samTab.wait((m) => m.t === 'welcome', 'welcome sam tab');
const kim = client({ name: 'Kim', avatar: 'dwarf', cid: 'privateKim00003' });
await kim.wait((m) => m.t === 'welcome', 'welcome kim');
await sleep(300);
for (const c of [alex, sam, samTab, kim]) c.inbox.length = 0;

alex.send({ t: 'chat', text: 'just between us', to: wS.you });
const got = await sam.wait((m) => m.t === 'chat', 'sam gets it');
ok(got.message.text === 'just between us' && got.message.to?.id === wS.you && got.message.by.id === wA.you, 'The person gets it, marked as private to them');
await samTab.wait((m) => m.t === 'chat' && m.message.to, 'sam tab gets it');
ok(true, "The person's other tab gets it too");
const back = await alex.wait((m) => m.t === 'chat', 'alex gets his copy');
ok(back.message.to?.name === 'Sam', 'The sender gets their own copy ("to Sam")');
await sleep(600);
ok(!kim.inbox.some((m) => m.t === 'chat'), 'A third member never receives it');

alex.send({ t: 'chat', text: 'hello all' });
await kim.wait((m) => m.t === 'chat' && m.message.text === 'hello all', 'public reaches kim');
ok(true, 'A public message still reaches everyone');

alex.send({ t: 'chat', text: 'to myself', to: wA.you });
await alex.wait((m) => m.t === 'error' && m.code === 'private_gone', 'self refused');
ok(true, 'A private message to myself is refused');

alex.send({ t: 'chat', text: 'with a picture', to: wS.you, image: 'data:image/png;base64,iVBORw0KGgo=' });
await alex.wait((m) => m.t === 'error' && m.code === 'bad_message', 'image refused');
ok(true, 'A private message cannot carry an image');

const late = client({ name: 'Lee', avatar: 'warrior', cid: 'privateLee00004' });
const wL = await late.wait((m) => m.t === 'welcome', 'welcome late');
const texts = wL.chat.map((c) => c.text);
ok(texts.includes('hello all') && !texts.includes('just between us'), 'The history a newcomer gets has the public message, never the private one');
ok(!JSON.stringify(wL).includes('between us'), 'Nothing of it in the welcome at all');

kim.ws.close();
alex.send({ t: 'chat', text: 'are you there', to: '0123456789ab' });
await alex.wait((m) => m.t === 'error' && m.code === 'private_gone', 'gone refused');
ok(true, 'A private message for someone not in the room is refused (private_gone)');

for (const c of [alex, sam, samTab, late]) c.ws.close();
console.log('private: all passed');
