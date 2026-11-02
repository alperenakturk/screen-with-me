// "3-2-1, together" (0.9.93.2): a video that starts from its beginning for the first time, with two or more people,
// starts a few seconds later for everyone (the state's `updatedAt` lies ahead); alone, for Shorts, for the same item a
// second time and with the host's switch off it starts at once.
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'count' + Math.random().toString(36).slice(2, 8);
function client(name, cid) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, name, cid })));
  const wait = async (pred, label) => {
    for (let i = 0; i < 100; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('timeout ' + label);
  };
  return { ws, wait, inbox, send: (m) => ws.send(JSON.stringify({ at: Date.now(), ...m })) };
}
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const video = (id) => ({ kind: 'youtube', id });
const ahead = (state) => state.updatedAt - Date.now();

const alex = client('Alex', 'countAlex0001');
await alex.wait((m) => m.t === 'welcome', 'welcome alex');
alex.send({ t: 'load', media: video('M7lc1UVf-VE') });
const alone = await alex.wait((m) => m.t === 'state' && m.state.item, 'alone');
ok(ahead(alone.state) < 500, 'Alone: the video starts at once');

const sam = client('Sam', 'countSam00001');
await sam.wait((m) => m.t === 'welcome', 'welcome sam');
alex.send({ t: 'load', media: video('aqz-KE-bpKQ') });
const two = await sam.wait((m) => m.t === 'state' && m.state.item?.media.id === 'aqz-KE-bpKQ', 'two');
ok(!two.state.paused && ahead(two.state) > 2000 && ahead(two.state) <= 3200, `Two people: the new video starts about 3 s later for everyone (${ahead(two.state)} ms)`);
ok(two.state.position < 1, 'It starts from the beginning');

// The same item again (pause, play at the start): no second countdown.
alex.send({ t: 'pause', position: 0 });
await sam.wait((m) => m.t === 'state' && m.state.paused, 'pause');
alex.send({ t: 'play', position: 0 });
const again = await sam.wait((m) => m.t === 'state' && !m.state.paused, 'play again');
ok(ahead(again.state) < 500, 'The same video played again from the start: no second countdown');

// Shorts flow one into the next: no countdown.
alex.send({ t: 'load', media: { kind: 'youtube', id: 'dQw4w9WgXcQ', short: true } });
const short = await sam.wait((m) => m.t === 'state' && m.state.item?.media.short, 'short');
ok(ahead(short.state) < 500, 'A Short starts at once');

// The host turns it off.
alex.send({ t: 'settings', countdown: false });
await sam.wait((m) => m.t === 'settings' && m.settings.countdown === false, 'settings');
alex.send({ t: 'load', media: video('jNQXAC9IVRw') });
const off = await sam.wait((m) => m.t === 'state' && m.state.item?.media.id === 'jNQXAC9IVRw', 'off');
ok(ahead(off.state) < 500, 'Turned off by the host: the video starts at once');

for (const c of [alex, sam]) c.ws.close();
setTimeout(() => process.exit(0), 100);
