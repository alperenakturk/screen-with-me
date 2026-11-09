// QUOTA1a: what a busy evening costs the Free Durable Object quotas. Eight people in one room (the real client
// connection code, `RoomConnection`, so its pings are the page's), a video playing, chat and reactions, and two of them
// at a Classics table (the game page's keepalive). It reads the lab meter (`/api/lab/meter`, `apps/server/src/meter.ts`)
// once a minute and prints DO requests, WebSocket messages, storage rows written and awake time per minute.
//
//   (cd apps/server && npx wrangler dev --port 8787 --var SWM_LOCAL_UNPACED:1 --var SWM_LAB_SERVER:1)
//   node --experimental-transform-types scripts/harness/do-load/run.mjs [http://localhost:8787] [minutes] [busy|quiet]
//
// Free plan per day, for the whole account: 100 000 requests (WebSocket messages count 20:1), 100 000 rows written,
// 13 000 GB-s (an awake object is billed at 128 MB: ≈ 28 awake object-hours).
import { RoomConnection } from '../../../packages/shared/src/connection.ts';
import { ServerClock } from '../../../packages/shared/src/clock.ts';
import { GAME_CLOCK_EVERY, GAME_KEEPALIVE_MS, KEEPALIVE, keepaliveTicks } from '../../../packages/shared/src/keepalive.ts';

const SITE = (process.argv[2] || 'http://localhost:8787').replace(/\/$/, '');
const MINUTES = Number(process.argv[3] || 3);
// `busy`: chat and reactions all evening; `quiet`: everyone just watches (no chat, no reactions, no moves).
const SCENE = process.argv[4] === 'quiet' ? 'quiet' : 'busy';
const WS = SITE.replace(/^http/, 'ws');
const NAMES = ['Alex', 'Sam', 'Robin', 'Kim', 'Jo', 'Max', 'Lee', 'Ari'];
const roomId = 'load' + Math.random().toString(36).slice(2, 8);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const timers = [];
const every = (ms, fn, offset = 0) => timers.push(setTimeout(() => timers.push(setInterval(fn, ms)), offset));

async function meter(reset = false) {
  const r = await fetch(`${SITE}/api/lab/meter${reset ? '?reset=1' : ''}`);
  if (!r.ok) throw new Error(`/api/lab/meter: ${r.status} (start wrangler dev with SWM_LAB_SERVER:1)`);
  return r.json();
}

// The room: eight people.
let gameId = null;
const people = NAMES.map((name, i) => {
  const welcome = Promise.withResolvers();
  const conn = new RoomConnection({
    serverUrl: SITE,
    roomId,
    name,
    cid: `load${i}${roomId}`.padEnd(14, '0'),
    clock: new ServerClock(),
    handover: false,
    onMessage: (m) => {
      if (m.t === 'welcome') welcome.resolve();
      if (m.t === 'game' && m.game) gameId = m.game.id;
      if (m.t === 'welcome' && m.game) gameId = m.game.id;
    },
  });
  conn.connect();
  return { name, conn, welcome: welcome.promise };
});
await Promise.all(people.map((p) => p.welcome));
const [host] = people;
host.conn.send({ t: 'load', media: { kind: 'test' } });
await sleep(500);
host.conn.send({ t: 'play', position: 0, at: Date.now() });

// Two of them at a Classics table (XOX), with the game page's keepalive.
host.conn.send({ t: 'game', kind: 'classics' });
for (let i = 0; i < 50 && !gameId; i++) await sleep(100);
if (!gameId) throw new Error('no game table');
const players = people.slice(0, 2).map((p, i) => {
  const ws = new WebSocket(`${WS}/api/games/${gameId}/ws`);
  const me = { ws, mark: null, state: null };
  ws.addEventListener('open', () => ws.send(JSON.stringify({ t: 'hello', v: 2, game: 'xox', name: p.name, cid: `load${i}${roomId}`.padEnd(14, '0'), classics: true })));
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.t === 'state') {
      me.state = m;
      me.mark = m.seats[0]?.name === p.name ? 'X' : m.seats[1]?.name === p.name ? 'O' : null;
    }
  });
  const open = () => ws.readyState === WebSocket.OPEN;
  every(GAME_KEEPALIVE_MS, keepaliveTicks(GAME_CLOCK_EVERY, () => open() && ws.send(KEEPALIVE), () => open() && ws.send(JSON.stringify({ t: 'ping' }))));
  return me;
});
// A move every 20 s by whoever's turn it is; a new game when one ends.
if (SCENE === 'busy') every(20_000, () => {
  for (const p of players) {
    const g = p.state?.game;
    if (!g || p.ws.readyState !== WebSocket.OPEN) continue;
    if (g.winner) {
      p.ws.send(JSON.stringify({ t: 'rematch' }));
      return;
    }
    if (g.turn === p.mark) {
      const cell = g.board.findIndex((c) => !c);
      if (cell >= 0) p.ws.send(JSON.stringify({ t: 'move', cell }));
      return;
    }
  }
});

// Chat every 45 s and a reaction every 8 s per person, spread out.
if (SCENE === 'busy') people.forEach((p, i) => {
  every(45_000, () => p.conn.send({ t: 'chat', text: `line from ${p.name}` }), i * 5_600);
  every(8_000, () => p.conn.send({ t: 'react', emoji: '😂' }), i * 1_000);
});

await sleep(3_000);
await meter(true);
const minutes = [];
for (let m = 1; m <= MINUTES; m++) {
  await sleep(60_000);
  const read = await meter(true);
  minutes.push(read);
  const line = Object.entries(read)
    .map(([k, c]) => `${k}: ${c.requests} req (${c.messages} msg), ${c.rows} rows, ${(c.awakeMs / 1000).toFixed(0)} s awake`)
    .join(' · ');
  console.log(`minute ${m}: ${line}`);
}
const total = { requests: 0, messages: 0, rows: 0, awakeMs: 0 };
for (const read of minutes) for (const c of Object.values(read)) for (const k of Object.keys(total)) total[k] += c[k];
const per = (v) => v / MINUTES;
// Billed requests: HTTP and alarms 1:1, WebSocket messages 20:1.
const billed = per(total.requests - total.messages + total.messages / 20);
console.log(
  `\n${SCENE}, per minute (room + table): ${per(total.requests).toFixed(0)} requests (${per(total.messages).toFixed(0)} WebSocket messages, ≈ ${billed.toFixed(1)} billed), ` +
    `${per(total.rows).toFixed(1)} rows written, ${(per(total.awakeMs) / 1000).toFixed(0)} s awake`,
);
console.log(
  `one evening (3 h) of such a room: ≈ ${(billed * 180).toFixed(0)} of 100 000 billed requests, ${(per(total.rows) * 180).toFixed(0)} of 100 000 rows, ` +
    `${((per(total.awakeMs) / 1000) * 180 * 0.125).toFixed(0)} of 13 000 GB-s`,
);
for (const t of timers) clearInterval(t);
for (const p of people) p.conn.close();
for (const p of players) p.ws.close();
process.exit(0);
