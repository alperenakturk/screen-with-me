// Card CH1: the room's chat stays (at least 1,000 messages until the room is deleted), not just the last 50. Six
// people write 130 numbered messages; a newcomer gets the newest pages on joining and every older one on request,
// all 130 in order; asking for older pages is rate-limited and a made-up page gives nothing.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'chathist' + Math.random().toString(36).slice(2, 8);
const TOTAL = 130;
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

const names = ['Alex', 'Sam', 'Kim', 'Lee', 'Max', 'Ana'];
const writers = [];
for (const [i, name] of names.entries()) {
  const c = client({ name, avatar: 'wizard', cid: `chathist${name}${'0'.repeat(8)}`.slice(0, 16) });
  await c.wait((m) => m.t === 'welcome', `welcome ${name}`);
  writers.push(c);
}
// 130 messages, one writer after another, within each person's chat limit (8 at once, then 1 a second): a quick
// start, then six people at about one message a second each.
for (let n = 1; n <= TOTAL; n++) {
  const w = writers[(n - 1) % writers.length];
  w.send({ t: 'chat', text: `History ${String(n).padStart(3, '0')}` });
  await sleep(n <= writers.length * 6 ? 20 : 200);
}
await writers[0].wait((m) => m.t === 'chat' && m.message.text === `History ${TOTAL}`, 'last message arrives', 30000);
ok(true, `${TOTAL} messages written by ${writers.length} people`);

const nina = client({ name: 'Nina', avatar: 'elf', cid: 'chathistNina0007' });
const welcome = await nina.wait((m) => m.t === 'welcome', 'welcome nina');
const texts = welcome.chat.map((m) => m.text);
ok(welcome.chat.length > 50 && welcome.chat.length <= 100, `A newcomer gets the newest pages, more than the old 50 (${welcome.chat.length})`);
ok(texts.at(-1) === `History ${TOTAL}`, 'The newest message is last');
ok(Number.isInteger(welcome.chatMore), `Older chat is offered (page ${welcome.chatMore})`);

const all = [...welcome.chat];
let more = welcome.chatMore;
while (more !== undefined) {
  nina.send({ t: 'chat-older', page: more });
  const page = await nina.wait((m) => m.t === 'chat-older', `older page ${more}`);
  ok(page.page === more && page.messages.length > 0, `Older page ${more}: ${page.messages.length} messages`);
  all.unshift(...page.messages);
  more = page.more;
  await sleep(300);
}
const numbers = all.map((m) => m.text).filter((t) => t.startsWith('History ')).map((t) => Number(t.slice(8)));
ok(numbers.length === TOTAL && numbers.every((n, i) => n === i + 1), `All ${TOTAL} messages come back, in order, none twice`);
ok(new Set(all.map((m) => m.id)).size === all.length, 'Every message has its own id');

// A page that is not there gives nothing; a bad page number is refused; asking too fast is rate-limited.
nina.send({ t: 'chat-older', page: 999 });
const none = await nina.wait((m) => m.t === 'chat-older', 'page 999');
ok(none.messages.length === 0 && none.more === undefined, 'A page that is not there is empty');
nina.inbox.length = 0;
nina.send({ t: 'chat-older', page: -1 });
await nina.wait((m) => m.t === 'error' && m.code === 'bad_message', 'negative page refused');
ok(true, 'A negative page number is refused');
await sleep(1500);
nina.inbox.length = 0;
for (let i = 0; i < 12; i++) nina.send({ t: 'chat-older', page: 0 });
await sleep(800);
ok(nina.inbox.some((m) => m.t === 'error' && m.code === 'rate_limited'), 'Asking for older pages too fast is rate-limited');

// Still there for someone who joins after everyone left and came back (the room object keeps it).
for (const c of [...writers, nina]) c.ws.close();
await sleep(1500);
const back = client({ name: 'Alex', avatar: 'wizard', cid: 'chathistAlex0000' });
const again = await back.wait((m) => m.t === 'welcome', 'welcome again');
ok(again.chat.at(-1)?.text === `History ${TOTAL}` && Number.isInteger(again.chatMore), 'After everyone left, the chat is still there');
back.ws.close();
console.log('\n✓ The chat stays and pages back in');
process.exit(0);
