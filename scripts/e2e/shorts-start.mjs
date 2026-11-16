// Card SH1 (2): a Short starts as soon as every viewer's player is primed (loaded, holding at 0:00), with
// SHORT_LEAD_MS (1.5 s) as the cap. Two fake viewers measure "swipe → start" for a fast room (both primed at once), a
// slow one (one primes after 800 ms) and one that never primes (the cap).
const base = process.argv[2] ?? 'ws://localhost:8787';
const room = 'sstart' + Math.random().toString(36).slice(2, 8);
function client(name, cid) {
  const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
  const inbox = [];
  ws.addEventListener('message', (e) => inbox.push(JSON.parse(e.data)));
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 3, name, cid })));
  const wait = async (pred, label) => {
    for (let i = 0; i < 100; i++) {
      const idx = inbox.findIndex(pred);
      if (idx >= 0) return inbox.splice(idx, 1)[0];
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error('timeout ' + label);
  };
  return { ws, wait, inbox, send: (m) => ws.send(JSON.stringify({ at: Date.now(), ...m })) };
}
const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const alex = client('Alex', 'sstartAlex001');
const sam = client('Sam', 'sstartSam0001');
await alex.wait((m) => m.t === 'welcome', 'welcome alex');
await sam.wait((m) => m.t === 'welcome', 'welcome sam');

/** Alex swipes to a Short; each viewer primes after its delay (null: never). Returns ms from the swipe to the start. */
async function swipe(id, delays) {
  const sentAt = Date.now();
  alex.send({ t: 'load', media: { kind: 'youtube', id, short: true } });
  const first = await sam.wait((m) => m.t === 'state' && m.state.item?.media.id === id, 'short ' + id);
  // One round trip (swipe → state back), measured here: on live it was 0.1–0.6 s and pushed "fast" past 0.7 s
  // (16 Nov 2026), so the upper bounds below allow it; the lower bounds stay as they are (latency only adds).
  const rtt = Date.now() - sentAt;
  await alex.wait((m) => m.t === 'state' && m.state.item?.media.id === id, 'short (alex) ' + id);
  const itemId = first.state.item.id;
  ok(first.state.position === 0 && first.state.updatedAt - Date.now() > 1000, `${id}: the Short holds at 0:00 in its lead-in`);
  [alex, sam].forEach((c, i) => {
    if (delays[i] !== null) setTimeout(() => c.send({ t: 'ready', ready: true, primed: itemId }), delays[i]);
  });
  let start = first.state.updatedAt;
  const early = await sam.wait((m) => m.t === 'state' && m.action === 'play' && m.state.item?.id === itemId, 'early start').catch(() => null);
  if (early) start = early.state.updatedAt;
  ok((early?.state ?? first.state).position === 0, `${id}: it starts from 0:00`);
  return { ms: start - sentAt, rtt };
}

const { ms: fast, rtt: fastRtt } = await swipe('dQw4w9WgXcQ', [0, 0]);
ok(fast < 700 + fastRtt, `Fast: both primed at once → it starts ${fast} ms after the swipe (under 0.7 s + one round trip, ${fastRtt} ms)`);
await sleep(300);
const { ms: slow, rtt: slowRtt } = await swipe('M7lc1UVf-VE', [0, 800]);
ok(slow >= 900 && slow < 1400 + slowRtt, `Slow: one viewer primed after 800 ms → it starts ${slow} ms after the swipe (round trip ${slowRtt} ms)`);
await sleep(300);
const { ms: never, rtt: neverRtt } = await swipe('jNQXAC9IVRw', [0, null]);
ok(never >= 1300 && never <= 1700 + neverRtt, `Never primed: the 1.5 s cap starts it ${never} ms after the swipe (round trip ${neverRtt} ms)`);

for (const c of [alex, sam]) c.ws.close();
setTimeout(() => process.exit(0), 100);
