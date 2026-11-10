// Card QA1 part 4: canary rooms on the live server. A few idle room connections that only say hello and send the free
// keepalive; the server never closes such a connection by itself, so when one closes with anything but our own close,
// the server (or the network) dropped it: after a deploy that means Cloudflare restarted the room objects. wait-live.mjs
// waits for a quiet spell of them before the live e2e, and run.mjs keeps them open during the live e2e so a failed file
// can say whether the server dropped connections while it ran (a restart) or not (then the failure is the code's).
import { appendFileSync } from 'node:fs';

const KEEPALIVE_MS = 20_000;

/**
 * Opens `count` canary room connections at `base` (ws:// or wss://). Every drop is recorded `{ at, code }` and the
 * connection is opened again (in a fresh room, as a restarted object would be met by a person reconnecting).
 * `connectLog` (run.mjs's pacing file) gets a line per connection, so the canaries count against the per-address limit.
 */
export function startCanary(base, { count = 3, connectLog = null, onDrop = () => {} } = {}) {
  const drops = [];
  let stopped = false;
  const sockets = new Set();
  const open = () => {
    if (stopped) return;
    if (connectLog) appendFileSync(connectLog, `${Date.now()}\n`);
    const room = 'canary' + Math.random().toString(36).slice(2, 8);
    const ws = new WebSocket(`${base}/api/rooms/${room}/ws`);
    let beat = null;
    sockets.add(ws);
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({ t: 'hello', v: 3, name: 'Canary', cid: 'canary' + Math.random().toString(36).slice(2, 10) }));
      beat = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('{"t":"hb"}'), KEEPALIVE_MS);
    });
    ws.addEventListener('close', (event) => {
      clearInterval(beat);
      sockets.delete(ws);
      if (stopped) return;
      const drop = { at: Date.now(), code: event.code, room };
      drops.push(drop);
      onDrop(drop);
      // A fresh room a moment later, like a person reconnecting.
      setTimeout(open, 1000);
    });
  };
  for (let i = 0; i < count; i++) open();
  return {
    drops,
    /** Drops between two times (ms since epoch). */
    between: (from, to) => drops.filter((d) => d.at >= from && d.at <= to),
    stop() {
      stopped = true;
      for (const ws of sockets) ws.close(1000, 'done');
    },
  };
}

/**
 * Waits until the canaries have seen no drop for `quietMs`, at most `limitMs`. Resolves `{ quiet, waited, drops }`.
 */
export async function waitQuiet(base, { quietMs = 60_000, limitMs = 4 * 60_000, count = 3, log = console.log } = {}) {
  const started = Date.now();
  let lastDrop = started;
  const canary = startCanary(base, {
    count,
    onDrop: (d) => {
      lastDrop = d.at;
      log(`  canary room dropped by the server (code ${d.code}) ${Math.round((d.at - started) / 1000)} s into the wait: objects still restarting`);
    },
  });
  try {
    while (Date.now() - lastDrop < quietMs) {
      if (Date.now() - started > limitMs) return { quiet: false, waited: Date.now() - started, drops: canary.drops.length };
      await new Promise((r) => setTimeout(r, 1000));
    }
    return { quiet: true, waited: Date.now() - started, drops: canary.drops.length };
  } finally {
    canary.stop();
  }
}
