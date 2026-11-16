// Card MSG1: "Delete for everyone". Alex (host), Sam and Kim. Sam deletes his own message: everyone gets the line, a
// newcomer's history has it with no text. Kim can't delete Sam's message (the server refuses), the host can. A
// private message can be deleted by its sender (only the two get the line), never by the host. A reconnect of the same
// browser still owns its old messages; deletes are rate-limited. Every step waits for state, never a fixed sleep.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'chatdel' + Math.random().toString(36).slice(2, 8);
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
const say = async (who, text, others) => {
  who.send({ t: 'chat', text });
  const m = await who.wait((x) => x.t === 'chat' && x.message.text === text, `own echo "${text}"`);
  for (const o of others) await o.wait((x) => x.t === 'chat' && x.message.id === m.message.id, `"${text}" arrives`);
  return m.message.id;
};
const deletedLine = (id) => (x) => x.t === 'chat-deleted' && x.message.id === id;

const alex = client({ name: 'Alex', avatar: 'wizard', cid: 'chatdelAlex00001' });
const wa = await alex.wait((m) => m.t === 'welcome', 'welcome alex');
const sam = client({ name: 'Sam', avatar: 'elf', cid: 'chatdelSam000002' });
await sam.wait((m) => m.t === 'welcome', 'welcome sam');
const kim = client({ name: 'Kim', avatar: 'pinecap', cid: 'chatdelKim000003' });
await kim.wait((m) => m.t === 'welcome', 'welcome kim');
ok(wa.hostId === wa.you, 'Alex, the first in, is the host');

// 1. Sam deletes his own message: all three get the line, with Sam as who deleted it and no text.
const own = await say(sam, 'Sam: oops, wrong room', [alex, kim]);
sam.send({ t: 'chat-delete', id: own });
for (const [c, n] of [[alex, 'Alex'], [sam, 'Sam'], [kim, 'Kim']]) {
  const d = await c.wait(deletedLine(own), `${n} gets Sam's delete`);
  ok(d.message.text === '' && d.message.deleted.by.name === 'Sam' && d.message.by.name === 'Sam', `${n} sees "Sam deleted a message"`);
}

// 2. Kim can't delete Sam's message: the server says no, nobody gets a line.
const second = await say(sam, 'Sam: second message', [alex, kim]);
kim.send({ t: 'chat-delete', id: second });
const refused = await kim.wait((m) => m.t === 'error', 'Kim is refused');
ok(refused.code === 'not_host', `Kim can't delete Sam's message (${refused.code})`);
await say(kim, 'Kim: marker 1', [alex, sam]);
ok(!alex.inbox.some(deletedLine(second)) && !sam.inbox.some(deletedLine(second)), 'Nobody got a deleted line for it');

// 3. The host deletes Sam's message: the line names Alex as who deleted it.
alex.send({ t: 'chat-delete', id: second });
for (const [c, n] of [[alex, 'Alex'], [sam, 'Sam'], [kim, 'Kim']]) {
  const d = await c.wait(deletedLine(second), `${n} gets the host's delete`);
  ok(d.message.deleted.by.name === 'Alex' && d.message.by.name === 'Sam', `${n} sees "Alex (host) deleted Sam's message"`);
}
// Deleting it again does nothing (no second line, no error).
alex.send({ t: 'chat-delete', id: second });
kim.send({ t: 'chat', text: 'Kim: marker 2' });
await alex.wait((m) => m.t === 'chat' && m.message.text === 'Kim: marker 2', 'marker 2 at Alex');
ok(!alex.inbox.some(deletedLine(second)) && !alex.inbox.some((m) => m.t === 'error'), 'A second delete of the same message changes nothing');

// 4. A newcomer's history: both lines are there with no text, the other messages unchanged.
const nina = client({ name: 'Nina', avatar: 'elf', cid: 'chatdelNina00004' });
const wn = await nina.wait((m) => m.t === 'welcome', 'welcome nina');
const byId = new Map(wn.chat.map((m) => [m.id, m]));
ok(byId.get(own)?.deleted && byId.get(own).text === '', 'The stored history has no text for Sam’s own delete');
ok(byId.get(second)?.deleted?.by.name === 'Alex' && byId.get(second).text === '', 'and none for the host’s delete');
ok(!JSON.stringify(wn.chat).includes('oops, wrong room') && !JSON.stringify(wn.chat).includes('second message'), 'The deleted texts are gone from the room');
ok(wn.chat.some((m) => m.text === 'Kim: marker 1'), 'Other messages stay');

// 5. Private: Sam → Kim. The host can't delete it; Sam can, and only Sam and Kim get the line.
const kimId = wn.members.find((m) => m.name === 'Kim')?.id;
sam.send({ t: 'chat', text: 'Sam to Kim: secret', to: kimId });
const priv = (await kim.wait((m) => m.t === 'chat' && m.message.text === 'Sam to Kim: secret', 'Kim gets the private message')).message;
await sam.wait((m) => m.t === 'chat' && m.message.id === priv.id, 'Sam gets his private echo');
alex.send({ t: 'chat-delete', id: priv.id });
const hostRefused = await alex.wait((m) => m.t === 'error', 'the host is refused on a private message');
ok(hostRefused.code === 'not_host', 'The host can’t delete someone’s private message');
sam.send({ t: 'chat-delete', id: priv.id });
await sam.wait(deletedLine(priv.id), 'Sam gets his private delete');
await kim.wait(deletedLine(priv.id), 'Kim gets the private delete');
await say(sam, 'Sam: marker 3', [alex, kim, nina]);
ok(!alex.inbox.some(deletedLine(priv.id)) && !nina.inbox.some(deletedLine(priv.id)), 'Only Sam and Kim got the private delete');

// 6. Sam reconnects (same browser): his message from before still is his to delete.
const before = await say(sam, 'Sam: before reload', [alex, kim]);
await sam.close();
const sam2 = client({ name: 'Sam', avatar: 'elf', cid: 'chatdelSam000002' });
await sam2.wait((m) => m.t === 'welcome', 'welcome sam again');
sam2.send({ t: 'chat-delete', id: before });
await sam2.wait(deletedLine(before), 'Sam deletes his message from before the reload');
ok(true, 'A reconnect keeps the right to delete my own messages');

// 7. Rate limit: the host's burst of deletes is cut off (six messages from three people, within their chat limits).
const burst = [];
for (let i = 0; i < 6; i++) {
  const writer = [sam2, kim, nina][i % 3];
  burst.push(await say(writer, `Burst ${i}`, [alex]));
}
for (const id of burst) alex.send({ t: 'chat-delete', id });
const limited = await alex.wait((m) => m.t === 'error' && m.code === 'rate_limited', 'a delete burst is rate-limited');
ok(limited.code === 'rate_limited', 'Deletes are rate-limited');

for (const c of [alex, sam2, kim, nina]) c.ws.close();
console.log('\nchat-delete: all passed');
process.exit(0);
