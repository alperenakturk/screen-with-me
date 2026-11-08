// LIVE-GREEN (Game Studio): a WebSocket for the game e2e files that behaves like the game pages after a network drop.
// On live the runner's sockets are cut now and then (1006, no close frame: 0.9.97.75 draw.mjs, .77 ghost.mjs, .79 sea.mjs
// 479 ms after open and classics-switch.mjs at 57 s); the pages connect again with the same browser id and carry on, the
// tests used to stop and fail on their first attempt. GameSocket opens a new connection after a 1006, sends again what
// the test's "open" listeners send (the hello), and queues what the test sends meanwhile. Any other close (the test's own
// `close()`, the server's 4xxx codes) reaches the test's "close" listeners as before. Same API as the WebSocket the tests
// used: addEventListener('open' | 'message' | 'close'), send, close, readyState.
//
// Guardrails (Planner), so a drop never hides a real server bug:
//   (a) at most MAX_DROPS reconnects in one test file; the next drop fails the file;
//   (b) when every open socket of one object (same address) drops within RESET_MS, that is the object resetting: the
//       file fails at once and nothing reconnects;
//   (c) every drop prints a `::warning::` (on CI) with the address, the close code, the time and how long it was open;
//   (d) `labDrop()` cuts a socket as the network would, for the local self-test (classics.mjs).
const DROP = 1006;
/** Reconnects allowed in one test file. */
export const MAX_DROPS = 3;
/** Every open socket of one object dropping within this window = the object reset. */
export const RESET_MS = 2000;

let dropsInFile = 0;
/** Open (or reconnecting) GameSockets per object address. */
const peers = new Map();

function fail(line) {
  console.log(process.env.GITHUB_ACTIONS ? `::error::${line}` : `FAIL ${line}`);
  process.exit(1);
}

export class GameSocket extends EventTarget {
  constructor(url) {
    super();
    this.url = url;
    this.path = new URL(url).pathname;
    this.closing = false;
    /** The test saw the final close: no more reconnecting. */
    this.finished = false;
    /** When this socket last dropped (for the reset check). */
    this.droppedAt = 0;
    this.queue = [];
    if (!peers.has(this.path)) peers.set(this.path, new Set());
    peers.get(this.path).add(this);
    this.connect();
  }

  connect() {
    const ws = new WebSocket(this.url);
    this.ws = ws;
    this.openedAt = Date.now();
    ws.addEventListener('open', () => {
      if (ws !== this.ws) return;
      // The test's own listeners first (its hello), then what it sent while the connection was coming back.
      this.dispatchEvent(new Event('open'));
      for (const data of this.queue.splice(0)) ws.send(data);
    });
    ws.addEventListener('message', (event) => {
      if (ws === this.ws) this.dispatchEvent(new MessageEvent('message', { data: event.data }));
    });
    ws.addEventListener('close', (event) => {
      if (ws !== this.ws) return;
      if (event.code === DROP && !this.closing) return this.dropped(event.code);
      this.end(event.code, event.reason, event.wasClean);
    });
  }

  /** The network cut this socket: check the guardrails, then connect again like a page. */
  dropped(code) {
    const now = Date.now();
    this.droppedAt = now;
    const line = `network drop (${code}) on ${this.path} at ${new Date(now).toISOString()} after ${now - this.openedAt} ms open`;
    // (b) Every socket of this object that is still meant to be open dropped within RESET_MS: the object reset.
    const group = [...peers.get(this.path)].filter((s) => !s.finished && !s.closing);
    if (group.length >= 2 && group.every((s) => now - s.droppedAt <= RESET_MS)) {
      fail(`${line}: every one of the ${group.length} sockets of this object dropped within ${RESET_MS} ms, so the object reset (a server bug, not the network)`);
    }
    // (a) A few drops in one file are the network; more are something else.
    dropsInFile++;
    if (dropsInFile > MAX_DROPS) fail(`${line}: drop ${dropsInFile} in this file, more than the ${MAX_DROPS} a network blip explains`);
    // (c) Every drop is visible, so they can be counted across runs.
    console.log(process.env.GITHUB_ACTIONS ? `::warning::${line}: connecting again like a page (${dropsInFile}/${MAX_DROPS})` : `    (${line}: connecting again like a page, ${dropsInFile}/${MAX_DROPS})`);
    setTimeout(() => {
      if (!this.closing && !this.finished) this.connect();
    }, 300);
  }

  end(code, reason, wasClean) {
    this.finished = true;
    peers.get(this.path)?.delete(this);
    const closed = new Event('close');
    Object.assign(closed, { code, reason, wasClean });
    this.dispatchEvent(closed);
  }

  /** (d) The self-test: this socket is cut as the network would cut it (no close frame reaches the test's listeners). */
  labDrop() {
    const ws = this.ws;
    this.ws = { readyState: WebSocket.CLOSED };
    try {
      ws.close();
    } catch {
      // already closed
    }
    this.dropped(DROP);
  }

  /** CONNECTING while a dropped connection comes back, so tests that check OPEN wait instead of giving up. */
  get readyState() {
    if (this.reconnecting()) return WebSocket.CONNECTING;
    return this.ws.readyState;
  }

  /** A dropped connection is on its way back (the old one is gone, the new one not open yet). */
  reconnecting() {
    return this.droppedAt > 0 && !this.finished && !this.closing && this.ws.readyState !== WebSocket.OPEN;
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(data);
    else if (this.ws.readyState === WebSocket.CONNECTING || this.reconnecting()) this.queue.push(data);
    else this.ws.send(data);
  }

  close(code, reason) {
    this.closing = true;
    peers.get(this.path)?.delete(this);
    if (this.ws.close) this.ws.close(code, reason);
  }
}
