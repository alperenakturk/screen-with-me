// GHOST: a game connection that dies without a close frame (a phone losing its network: 1006, no goodbye) must not stay
// "online" for ever. In Draw & Guess, Quiz, Classics and Sea Battle a second player goes silent (their socket stays
// open, nothing is sent); the game object's alarm closes it after about 90 s (`GHOST_MS`), the player shows offline soon after,
// and the game handles it like a real leave (Draw / Quiz: back to the lobby after the 20 s grace). The four games run
// side by side, so the file takes about 2 minutes (live, after every deploy: the Quiz only).
const base = process.argv[2] ?? 'ws://localhost:8787';
const tag = Math.random().toString(36).slice(2, 8);
const PING_MS = 15_000;

const ok = (c, m) => {
  if (!c) throw new Error('FAIL: ' + m);
  console.log('ok  ' + m);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms) {
  for (let i = 0; i < ms / 100; i++) {
    try {
      if (fn()) return true;
    } catch {
      // not there yet
    }
    await sleep(100);
  }
  return false;
}

/**
 * A game client; `pinging` = like the game pages (a ping every 15 s, and a new connection with the same browser id when
 * the network drops it), else it goes silent after its hello. Live run 0.9.97.77: the runner's own Quiz socket was cut
 * by the network (1006, the server never saw it go) and the test, unlike a page, never came back.
 */
function client(path, hello, pinging) {
  const inbox = [];
  let last = null;
  let closed = null;
  let stopped = false;
  let ws;
  const connect = () => {
    const socket = new WebSocket(`${base}${path}`);
    ws = socket;
    socket.addEventListener('message', (e) => {
      const m = JSON.parse(e.data);
      inbox.push(m);
      if (m.t === 'state') last = m;
    });
    socket.addEventListener('close', (e) => {
      closed = e.code;
      if (pinging && !stopped && socket === ws) {
        console.log(`    (${hello.name}'s pinging socket was dropped with ${e.code}: back like a page)`);
        setTimeout(connect, 500);
      }
    });
    socket.addEventListener('open', () => socket.send(JSON.stringify(hello)));
  };
  connect();
  const timer = pinging ? setInterval(() => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ t: 'ping' })), PING_MS) : null;
  return {
    get ws() {
      return ws;
    },
    inbox,
    send: (m) => ws.send(JSON.stringify(m)),
    get state() {
      return last;
    },
    get closed() {
      return closed;
    },
    stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      try {
        ws.close();
      } catch {
        // already closed
      }
    },
  };
}

const OFFLINE_MS = 130_000; // 90 s + room for a live alarm that runs late right after a deploy
const GRACE_MS = 30_000;

async function draw() {
  const path = `/api/draw/gh${tag}/ws`;
  const alex = client(path, { t: 'hello', v: 3, name: 'Alex', cid: 'ghostDrawAlex01', lang: 'en' }, true);
  await until(() => alex.state, 8000);
  const sam = client(path, { t: 'hello', v: 3, name: 'Sam', cid: 'ghostDrawSam001', lang: 'en' }, false);
  ok(await until(() => alex.state?.players?.filter((p) => p.online).length === 2, 8000), 'Draw: two players online');
  alex.send({ t: 'start' });
  ok(await until(() => alex.state.phase !== 'lobby', 8000), 'Draw: the game starts');
  const silentAt = Date.now();
  ok(await until(() => alex.state.players.some((p) => p.name === 'Sam' && !p.online), OFFLINE_MS), 'Draw: the silent player shows offline after about 90 s');
  ok(alex.state.players.some((p) => p.name === 'Alex' && p.online), 'Draw: the player who keeps pinging stays online');
  console.log(`    (Draw: offline after ${Math.round((Date.now() - silentAt) / 1000)} s; the server closed it with ${sam.closed ?? 'nothing yet'})`);
  ok(await until(() => alex.state.phase === 'lobby', GRACE_MS), 'Draw: with one player left the game goes back to the lobby after the grace');
  alex.stop();
  sam.stop();
}

async function quiz() {
  const path = `/api/quiz/gh${tag}/ws`;
  const alex = client(path, { t: 'hello', v: 2, name: 'Alex', cid: 'ghostQuizAlex01', lang: 'en' }, true);
  await until(() => alex.state, 8000);
  const sam = client(path, { t: 'hello', v: 2, name: 'Sam', cid: 'ghostQuizSam001', lang: 'en' }, false);
  ok(await until(() => alex.state?.players?.filter((p) => p.online).length === 2, 8000), 'Quiz: two players online');
  alex.send({ t: 'start' });
  ok(await until(() => alex.state.phase === 'question', 8000), 'Quiz: the game starts');
  ok(await until(() => alex.state.players.some((p) => p.name === 'Sam' && !p.online), OFFLINE_MS), 'Quiz: the silent player shows offline after about 90 s');
  ok(alex.state.players.some((p) => p.name === 'Alex' && p.online), 'Quiz: the player who keeps pinging stays online');
  ok(await until(() => alex.state.phase === 'lobby', GRACE_MS), 'Quiz: with one player left the game goes back to the lobby after the grace');
  alex.stop();
  sam.stop();
}

async function classics() {
  const path = `/api/games/gh${tag}/ws`;
  const hello = (name, cid) => ({ t: 'hello', v: 2, game: 'xox', name, cid, classics: true });
  const alex = client(path, hello('Alex', 'ghostClasAlex01'), true);
  await until(() => alex.state, 8000);
  const sam = client(path, hello('Sam', 'ghostClasSam001'), false);
  ok(await until(() => alex.state?.seats?.every((s) => s?.online), 8000), 'Classics: both seats online');
  ok(await until(() => alex.state.seats.some((s) => s?.name === 'Sam' && !s.online), OFFLINE_MS), 'Classics: the silent player\'s seat shows offline after about 90 s (a watcher may sit)');
  ok(alex.state.seats.some((s) => s?.name === 'Alex' && s.online), 'Classics: the player who keeps pinging stays online');
  ok(alex.state.seats.some((s) => s?.name === 'Sam'), 'Classics: the seat stays theirs, as after a real leave');
  alex.stop();
  sam.stop();
}

async function sea() {
  const path = `/api/sea/gh${tag}/ws`;
  const alex = client(path, { t: 'hello', v: 1, name: 'Alex', cid: 'a'.repeat(31) + 'g' }, true);
  await until(() => alex.state, 8000);
  const sam = client(path, { t: 'hello', v: 1, name: 'Sam', cid: 's'.repeat(31) + 'g' }, false);
  ok(await until(() => alex.state?.players?.every((p) => p?.online), 8000), 'Sea Battle: both players online');
  ok(await until(() => alex.state.players.some((p) => p?.name === 'Sam' && !p.online), OFFLINE_MS), 'Sea Battle: the silent player shows offline after about 90 s');
  ok(alex.state.players.some((p) => p?.name === 'Alex' && p.online), 'Sea Battle: the player who keeps pinging stays online');
  alex.stop();
  sam.stop();
}

// A player who keeps pinging is never taken for a ghost (checked by every game above: Alex stays online throughout).
// Live (after every deploy) runs the Quiz only, the object with the busiest alarm: the four games share one code path
// (`apps/server/src/ghost.ts`) that the local run covers in full, and fewer sockets left open for 90 s keep the live
// run short and less exposed to the network.
const live = !/localhost|127\.0\.0\.1/.test(base);
await Promise.all(live ? [quiz()] : [draw(), quiz(), classics(), sea()]);
setTimeout(() => process.exit(0), 100);
