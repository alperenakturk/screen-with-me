// LIVE-GREEN (Game Studio): a WebSocket for the game e2e files that behaves like the game pages after a network drop.
// On live the runner's sockets are cut now and then (1006, no close frame: 0.9.97.75 draw.mjs, .77 ghost.mjs, .79 sea.mjs
// 479 ms after open and classics-switch.mjs at 57 s); the pages connect again with the same browser id and carry on, the
// tests used to stop and fail on their first attempt. GameSocket opens a new connection after a 1006, sends again what
// the test's "open" listeners send (the hello), queues what the test sends meanwhile, and prints a warning line (a
// `::warning::` on CI) so every drop stays visible. Any other close (the test's own `close()`, the server's 4xxx codes)
// reaches the test's "close" listeners as before. Same API as the WebSocket the tests used: addEventListener('open' |
// 'message' | 'close'), send, close, readyState.
const DROP = 1006;
/** More drops than this in one socket's life is no longer "the network now and then": the test sees the close. */
const MAX_DROPS = 3;

export class GameSocket extends EventTarget {
  constructor(url) {
    super();
    this.url = url;
    this.drops = 0;
    this.closing = false;
    /** The test saw the final close: no more reconnecting. */
    this.finished = false;
    this.queue = [];
    this.connect();
  }

  connect() {
    const ws = new WebSocket(this.url);
    this.ws = ws;
    const openedAt = Date.now();
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
      if (event.code === DROP && !this.closing && this.drops < MAX_DROPS) {
        this.drops++;
        const where = new URL(this.url).pathname;
        const line = `network drop (1006) on ${where} after ${Date.now() - openedAt} ms: connecting again like a page (${this.drops}/${MAX_DROPS})`;
        console.log(process.env.GITHUB_ACTIONS ? `::warning::${line}` : `    (${line})`);
        setTimeout(() => this.connect(), 300);
        return;
      }
      this.finished = true;
      const closed = new Event('close');
      Object.assign(closed, { code: event.code, reason: event.reason, wasClean: event.wasClean });
      this.dispatchEvent(closed);
    });
  }

  /** CONNECTING while a dropped connection comes back, so tests that check OPEN wait instead of giving up. */
  get readyState() {
    if (this.reconnecting()) return WebSocket.CONNECTING;
    return this.ws.readyState;
  }

  /** A dropped connection is on its way back (the old one is gone, the new one not open yet). */
  reconnecting() {
    return this.drops > 0 && !this.finished && !this.closing && this.ws.readyState !== WebSocket.OPEN;
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(data);
    else if (this.ws.readyState === WebSocket.CONNECTING || this.reconnecting()) this.queue.push(data);
    else this.ws.send(data);
  }

  close(code, reason) {
    this.closing = true;
    this.ws.close(code, reason);
  }
}
