/**
 * HTTP fallback transport (0.9.92, `docs/internal/hotspot-connection.md`).
 *
 * On some networks (the owner's phone hotspot) the page loads but a WebSocket never opens: WebSockets always run over
 * a fresh TCP connection, while the page itself may arrive over HTTP/3 (QUIC, UDP) or through a proxy that breaks the
 * `Upgrade`. When the client's WebSocket does not open it switches to plain HTTP requests to the same address:
 *
 *   POST …/ws?http=open              → `{sid}` (a new connection; the Worker checks origin + connection limit)
 *   POST …/ws?http=send&sid=…        body: JSON array of message strings, applied in order
 *   GET  …/ws?http=poll&sid=…        held up to `HOLD_MS` until there is something to say; body: messages, one per line
 *   POST …/ws?http=close&sid=…       the client leaves
 *
 * A closed or unknown session answers `410 {code}` (the client then reconnects as it would after a WebSocket close).
 *
 * `PollSocket` behaves like the server end of a hibernatable WebSocket for the code that uses it (`send`, `close`,
 * `readyState`, `serializeAttachment` / `deserializeAttachment`), so the Durable Objects run every message through the
 * very same `webSocketMessage` — the same validation, rate limits and rules. Sessions live in memory only: while a
 * poll is held the object is awake anyway, and if the object restarts (a deploy) the client gets `410` and reconnects.
 */

/** How long a poll waits for news before answering empty (below the usual 30 s proxy / browser idle limits). */
export const HOLD_MS = 20_000;
/** A session that has not polled for this long is closed (the tab is gone). */
const IDLE_MS = 45_000;
/** At most this much per poll answer (stickers and chat images on join can be several large messages). */
const ANSWER_BYTES = 1_000_000;
/**
 * A session that lets more than this pile up (it stopped polling) is closed. A legitimate join into a room full of
 * custom emojis and chat images is the largest burst (24 + 12 images of ≤ 280 000 characters ≈ 10.1 M), so one session
 * may hold one such join; a joined connection cannot ask for it again (`hello` is accepted once, security review 2 H1).
 */
const QUEUE_BYTES = 11_000_000;
/** All sessions of one object together (the object's memory is 128 MB; the messages are ASCII JSON). */
const HUB_BYTES = 24_000_000;
/** A session that has not polled this long after `open` is closed (a real client polls at once). */
const FIRST_POLL_MS = 10_000;
/** Limits for one `send` request. */
const SEND_BODY_BYTES = 1_100_000;
const SEND_MAX_MESSAGES = 40;

export const POLL_CLOSED = 3;
const OPEN = 1;

/** Server end of one HTTP fallback connection (shaped like the parts of `WebSocket` the objects use). */
export class PollSocket {
  readyState = OPEN;
  closeCode = 1000;
  closeReason = '';
  /** Last time the client polled or sent (or now, while a poll is held). */
  seen = Date.now();
  /** Whether the client has polled at least once. */
  polled = false;
  readonly openedAt = Date.now();
  private queue: string[] = [];
  private queued = 0;
  private attachment: unknown = null;
  private waiter: (() => void) | null = null;

  constructor(
    readonly sid: string,
    private readonly onServerClose: (socket: PollSocket, code: number) => void,
    /** The hub's shared budget: asks for `delta` more characters (or gives some back); false = over the cap. */
    private readonly budget: (delta: number) => boolean = () => true,
  ) {}

  send(data: string): void {
    if (this.readyState !== OPEN) return;
    if (this.queued + data.length > QUEUE_BYTES || !this.budget(data.length)) {
      // What piled up is never read now: give the memory back before the client learns of the close.
      this.release();
      this.close(1009, 'overflow');
      return;
    }
    this.queue.push(data);
    this.queued += data.length;
    this.wake();
  }

  /** Closed by the room (kick, replaced, stale, full): the client learns it on its next poll. */
  close(code = 1000, reason = ''): void {
    if (this.readyState !== OPEN) return;
    this.markClosed(code, reason);
    this.onServerClose(this, code);
  }

  /** Closed without telling the room again (the client left, or the room already handles it). */
  markClosed(code: number, reason: string): void {
    this.readyState = POLL_CLOSED;
    this.closeCode = code;
    this.closeReason = reason;
    this.wake();
  }

  serializeAttachment(value: unknown): void {
    this.attachment = structuredClone(value);
  }

  deserializeAttachment(): unknown {
    return structuredClone(this.attachment);
  }

  /** Takes what is queued (up to `ANSWER_BYTES`, at least one message). */
  take(): string[] {
    let size = 0;
    let count = 0;
    while (count < this.queue.length && (count === 0 || size + this.queue[count]!.length <= ANSWER_BYTES)) size += this.queue[count++]!.length;
    this.queued -= size;
    this.budget(-size);
    return this.queue.splice(0, count);
  }

  /** Drops what is queued and gives it back to the hub's budget (the session is forgotten or overflowed). */
  release(): void {
    this.budget(-this.queued);
    this.queue = [];
    this.queued = 0;
  }

  get pending(): number {
    return this.queue.length;
  }

  /** Waits until something is queued, the socket closes or `ms` pass. A newer poll ends an older one's wait. */
  wait(ms: number): Promise<void> {
    this.wake();
    return new Promise((resolve) => {
      const timer = setTimeout(done, ms);
      const self = this;
      function done(): void {
        clearTimeout(timer);
        if (self.waiter === done) self.waiter = null;
        resolve();
      }
      this.waiter = done;
    });
  }

  get holding(): boolean {
    return this.waiter !== null;
  }

  private wake(): void {
    const waiter = this.waiter;
    this.waiter = null;
    waiter?.();
  }
}

export interface PollHandlers {
  /** Sets the new connection up exactly like an accepted WebSocket (attachment, limits, "room full"). */
  admit: (socket: WebSocket, request: Request) => Promise<void>;
  message: (socket: WebSocket, raw: string) => Promise<void>;
  /** The connection is gone (the object's `webSocketClose`). */
  closed: (socket: WebSocket, code: number) => Promise<void>;
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
const gone = (socket?: PollSocket) => json({ code: socket?.closeCode ?? 1006, reason: socket?.closeReason ?? 'gone' }, 410);

/** The HTTP fallback sessions of one Durable Object. */
export class PollHub {
  private readonly sessions = new Map<string, PollSocket>();
  /** Characters queued in all sessions together (`HUB_BYTES`). */
  private queued = 0;
  private sweeper: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly handlers: PollHandlers) {}

  /** Open fallback connections, typed as WebSockets for the object's own lists. */
  sockets(): WebSocket[] {
    return [...this.sessions.values()].filter((s) => s.readyState === OPEN) as unknown as WebSocket[];
  }

  /** Answers a fallback request, or returns null when the request is not one (`?http=` missing). */
  async handle(request: Request): Promise<Response | null> {
    const url = new URL(request.url);
    const op = url.searchParams.get('http');
    if (op === null) return null;
    this.sweep();
    // Every request body is dealt with before any answer: an answer sent while the body is still unread made the dev
    // server's proxy throw ("Can't read from request stream after response has been sent") and drop the object's
    // next request (CI: a session that sent after it was closed broke the next `open` with a 500). Only `send` has a
    // body worth reading, and it is read as a stream that stops at `SEND_BODY_BYTES`: a chunked body has no
    // `Content-Length`, and reading one whole could pass the object's memory limit (security review 2, H1).
    let body = '';
    if (op === 'send' && request.method === 'POST') {
      const read = await readCapped(request, SEND_BODY_BYTES);
      if (read === null) return new Response('Too large', { status: 413 });
      body = read;
    } else {
      await request.body?.cancel().catch(() => {});
    }
    if (op === 'open') {
      if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
      const socket = new PollSocket(
        newSid(),
        (s, code) => queueMicrotask(() => void this.finish(s, code)),
        (delta) => {
          if (delta > 0 && this.queued + delta > HUB_BYTES) return false;
          this.queued = Math.max(0, this.queued + delta);
          return true;
        },
      );
      this.sessions.set(socket.sid, socket);
      this.startSweeper();
      await this.handlers.admit(socket as unknown as WebSocket, request);
      return json({ sid: socket.sid, hold: HOLD_MS });
    }
    const socket = this.sessions.get(url.searchParams.get('sid') ?? '');
    if (op === 'poll') {
      if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
      if (!socket) return gone();
      socket.seen = Date.now();
      socket.polled = true;
      if (!socket.pending && socket.readyState === OPEN) await socket.wait(HOLD_MS);
      socket.seen = Date.now();
      if (socket.pending) return new Response(socket.take().join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
      if (socket.readyState !== OPEN) {
        this.forget(socket);
        return gone(socket);
      }
      return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    if (!socket || socket.readyState !== OPEN) return gone(socket);
    socket.seen = Date.now();
    if (op === 'close') {
      socket.markClosed(1000, 'left');
      this.forget(socket);
      await this.handlers.closed(socket as unknown as WebSocket, 1000);
      return new Response(null, { status: 204 });
    }
    if (op !== 'send') return new Response('Unknown operation', { status: 400 });
    let messages: unknown;
    try {
      messages = JSON.parse(body);
    } catch {
      return new Response('Bad body', { status: 400 });
    }
    if (!Array.isArray(messages) || messages.length > SEND_MAX_MESSAGES) return new Response('Bad body', { status: 400 });
    for (const raw of messages) {
      if (socket.readyState !== OPEN) break;
      // Anything that is not a string is passed on as such: the object answers it like a binary frame (`bad_message`).
      await this.handlers.message(socket as unknown as WebSocket, typeof raw === 'string' ? raw : (null as unknown as string));
    }
    return new Response(null, { status: 204 });
  }

  /** Closes sessions whose tab stopped polling. */
  private sweep(now = Date.now()): void {
    for (const socket of this.sessions.values()) {
      if (socket.readyState !== OPEN) {
        // Closed by the room and never picked up: forget it after a while.
        if (now - socket.seen > IDLE_MS) this.forget(socket);
        continue;
      }
      // Never polled since `open`: not a real client (a real one polls at once), and its queue only grows.
      if (!socket.holding && (now - socket.seen > IDLE_MS || (!socket.polled && now - socket.openedAt > FIRST_POLL_MS))) {
        this.forget(socket);
        socket.markClosed(1006, 'idle');
        void this.handlers.closed(socket as unknown as WebSocket, 1006);
      }
    }
    if (this.sessions.size === 0 && this.sweeper !== null) {
      clearInterval(this.sweeper);
      this.sweeper = null;
    }
  }

  private forget(socket: PollSocket): void {
    this.sessions.delete(socket.sid);
    socket.release();
  }

  private startSweeper(): void {
    this.sweeper ??= setInterval(() => this.sweep(), 5_000);
  }

  private async finish(socket: PollSocket, code: number): Promise<void> {
    try {
      await this.handlers.closed(socket as unknown as WebSocket, code);
    } catch {
      // The object logs nothing for a closing connection either.
    }
  }
}

/**
 * Reads a request body as text, or returns null (and stops reading) once it passes `max` bytes. The rule (security
 * reviews 2 H1 and 3 R3-1): no Durable Object reads a request body without a cap; use this, never `request.json()`.
 */
export async function readCapped(request: Request, max: number): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    all.set(chunk, at);
    at += chunk.byteLength;
  }
  return new TextDecoder().decode(all);
}

function newSid(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
}
