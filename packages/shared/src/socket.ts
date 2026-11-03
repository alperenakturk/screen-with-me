/**
 * Connections that survive networks where WebSockets never open (0.9.92, `docs/internal/hotspot-connection.md`).
 *
 * `openSocket(url)` first tries a normal WebSocket. If it neither opens nor closes within `WS_OPEN_MS` (the owner's
 * phone hotspot: the page loads, the WebSocket hangs on "Bağlanıyor…") or fails before opening, it switches to the
 * HTTP fallback (`HttpSocket`: one held GET for what the server says, POSTs for what we say; server side
 * `apps/server/src/fallback.ts`). Both look like a WebSocket to the code using them (`readyState`, `send`, `close`,
 * `open` / `message` / `close` events), so the room, the games and every message stay exactly the same.
 *
 * Normal users never use the fallback: it only starts after a WebSocket failed. Once it was needed, the page (and the
 * tab, for 30 min) goes straight to it, and with `upgrade` a small probe checks every few minutes whether WebSockets
 * work again; then the socket closes with `UPGRADE_CODE` and the caller reconnects over a WebSocket.
 */

export type Transport = 'ws' | 'http';

export interface SocketEvents {
  open: Record<string, never>;
  message: { data: string };
  close: { code: number; reason: string; wasClean: boolean };
}
type Listener<K extends keyof SocketEvents> = (event: SocketEvents[K]) => void;

/** The part of `WebSocket` our clients use. */
export interface SwmSocket {
  readonly readyState: number;
  /** Which way this connection goes (null while it is still trying). */
  readonly transport: Transport | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener<K extends keyof SocketEvents>(type: K, listener: Listener<K>): void;
}

export const CONNECTING = 0;
export const OPEN = 1;
export const CLOSING = 2;
export const CLOSED = 3;

/** Close code of a fallback connection that steps aside because WebSockets work again (reconnect right away). */
export const UPGRADE_CODE = 4100;
/** A WebSocket that has not opened by then is given up for the HTTP fallback. */
export const WS_OPEN_MS = 6_000;
/** How long the tab remembers that it needed the fallback. */
const PREFER_HTTP_MS = 30 * 60_000;
const PREFER_KEY = 'swm:http';
/** Upgrade probes: first after a minute, then less and less often. */
const PROBE_FIRST_MS = 60_000;
const PROBE_MAX_MS = 10 * 60_000;
const PROBE_TIMEOUT_MS = 6_000;
/** A poll is answered within the server's hold time (20 s); give up on it a bit later. */
const POLL_TIMEOUT_MS = 35_000;
const SEND_TIMEOUT_MS = 15_000;
/** Failed requests in a row before the fallback connection counts as closed. */
const MAX_ERRORS = 3;
const SEND_BATCH = 40;
/** How long to wait after a 429 (the Worker's per-address limit for fallback requests, security M4). */
const LIMITED_WAIT_MS = 1500;
const SEND_BATCH_BYTES = 900_000;

let preferHttpUntil = 0;

function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

/** Did this tab need the fallback recently? */
export function prefersHttp(now = Date.now()): boolean {
  if (preferHttpUntil > now) return true;
  try {
    const saved = Number(storage()?.getItem(PREFER_KEY) ?? 0);
    if (saved > now) {
      preferHttpUntil = saved;
      return true;
    }
  } catch {
    // Storage blocked: memory only.
  }
  return false;
}

/** Remembers (or forgets) that WebSockets don't work here. */
export function setPreferHttp(on: boolean, now = Date.now()): void {
  preferHttpUntil = on ? now + PREFER_HTTP_MS : 0;
  try {
    if (on) storage()?.setItem(PREFER_KEY, String(preferHttpUntil));
    else storage()?.removeItem(PREFER_KEY);
  } catch {
    // Storage blocked: memory only.
  }
}

class Emitter {
  private readonly listeners: { [K in keyof SocketEvents]: Listener<K>[] } = { open: [], message: [], close: [] };

  addEventListener<K extends keyof SocketEvents>(type: K, listener: Listener<K>): void {
    (this.listeners[type] as Listener<K>[]).push(listener);
  }

  protected emit<K extends keyof SocketEvents>(type: K, event: SocketEvents[K]): void {
    for (const listener of [...(this.listeners[type] as Listener<K>[])]) {
      try {
        listener(event);
      } catch (error) {
        // Like a real WebSocket: one listener's error does not stop the others.
        setTimeout(() => {
          throw error;
        });
      }
    }
  }
}

/** `ws(s)://host/path` → `http(s)://host/path?http=op&…`. */
function fallbackUrl(wsUrl: string, op: string, sid?: string): string {
  const url = new URL(wsUrl.replace(/^ws/, 'http'));
  url.searchParams.set('http', op);
  if (sid) url.searchParams.set('sid', sid);
  return url.toString();
}

/** Client end of the HTTP fallback (server: `apps/server/src/fallback.ts`). */
export class HttpSocket extends Emitter implements SwmSocket {
  readyState = CONNECTING;
  readonly transport: Transport = 'http';
  private sid: string | null = null;
  private outbox: string[] = [];
  private sending = false;
  private errors = 0;
  private readonly abort = new AbortController();

  constructor(private readonly url: string) {
    super();
    void this.start();
  }

  send(data: string): void {
    if (this.readyState === CONNECTING) throw new Error('InvalidStateError: still connecting');
    if (this.readyState !== OPEN) return;
    this.outbox.push(data);
    void this.flush();
  }

  close(code = 1000, reason = ''): void {
    if (this.readyState === CLOSING || this.readyState === CLOSED) return;
    const sid = this.sid;
    this.readyState = CLOSING;
    this.abort.abort();
    if (sid) {
      // Must reach the room even while the tab is closing or reloading (a WebSocket's TCP close does that by itself):
      // a beacon is made for this; a keepalive request where there is none or it is refused.
      const url = fallbackUrl(this.url, 'close', sid);
      let queued = false;
      try {
        queued = typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(url);
      } catch {
        queued = false;
      }
      if (!queued) void fetch(url, { method: 'POST', keepalive: true, cache: 'no-store' }).catch(() => {});
    }
    setTimeout(() => this.finish(code, reason, true), 0);
  }

  private async start(): Promise<void> {
    try {
      const response = await fetch(fallbackUrl(this.url, 'open'), { method: 'POST', cache: 'no-store', signal: timed(this.abort.signal, SEND_TIMEOUT_MS) });
      if (!response.ok) return this.finish(1006, `open ${response.status}`);
      const { sid } = (await response.json()) as { sid?: unknown };
      if (typeof sid !== 'string') return this.finish(1006, 'open');
      if (this.readyState !== CONNECTING) return;
      this.sid = sid;
      this.readyState = OPEN;
      this.emit('open', {});
      void this.pollLoop();
    } catch {
      this.finish(1006, 'open failed');
    }
  }

  private async pollLoop(): Promise<void> {
    while (this.readyState === OPEN && this.sid) {
      try {
        const response = await fetch(fallbackUrl(this.url, 'poll', this.sid), { cache: 'no-store', signal: timed(this.abort.signal, POLL_TIMEOUT_MS) });
        if (response.status === 410) return this.finish(...(await closeOf(response)));
        // Too many requests from this address for a moment (the Worker's FALLBACK_LIMIT): wait, it is not a failure.
        if (response.status === 429) {
          await sleep(LIMITED_WAIT_MS);
          continue;
        }
        if (!response.ok && response.status !== 204) throw new Error(String(response.status));
        this.errors = 0;
        if (response.status === 204) continue;
        const text = await response.text();
        for (const line of text.split('\n')) {
          if (this.readyState !== OPEN) return;
          if (line) this.emit('message', { data: line });
        }
      } catch {
        if (this.readyState !== OPEN) return;
        if (++this.errors >= MAX_ERRORS) return this.finish(1006, 'poll failed');
        await sleep(500 * this.errors);
      }
    }
  }

  private async flush(): Promise<void> {
    if (this.sending || !this.sid) return;
    this.sending = true;
    try {
      while (this.outbox.length && this.readyState === OPEN) {
        let size = 0;
        let count = 0;
        while (count < this.outbox.length && count < SEND_BATCH && (count === 0 || size + this.outbox[count]!.length <= SEND_BATCH_BYTES)) size += this.outbox[count++]!.length;
        const batch = this.outbox.slice(0, count);
        try {
          const response = await fetch(fallbackUrl(this.url, 'send', this.sid), {
            method: 'POST',
            body: JSON.stringify(batch),
            headers: { 'Content-Type': 'text/plain' },
            cache: 'no-store',
            signal: timed(this.abort.signal, SEND_TIMEOUT_MS),
          });
          if (response.status === 410) return this.finish(...(await closeOf(response)));
          // Rate limited for a moment: keep the batch and send it again a little later.
          if (response.status === 429) {
            await sleep(LIMITED_WAIT_MS);
            continue;
          }
          // A refused batch (too large, bad) is dropped like a message the server ignores; the connection stays.
          this.outbox.splice(0, count);
          this.errors = 0;
        } catch {
          if (this.readyState !== OPEN) return;
          // Not known whether it arrived: send once more (the server's own checks make a repeat harmless), then give up.
          if (++this.errors >= MAX_ERRORS) return this.finish(1006, 'send failed');
          await sleep(500 * this.errors);
        }
      }
    } finally {
      this.sending = false;
    }
  }

  private finish(code: number, reason: string, wasClean = false): void {
    if (this.readyState === CLOSED) return;
    this.readyState = CLOSED;
    this.abort.abort();
    this.emit('close', { code, reason, wasClean });
  }
}

async function closeOf(response: Response): Promise<[number, string, boolean]> {
  try {
    const body = (await response.json()) as { code?: unknown; reason?: unknown };
    return [typeof body.code === 'number' ? body.code : 1006, typeof body.reason === 'string' ? body.reason : '', true];
  } catch {
    return [1006, 'gone', false];
  }
}

/** `signal` that also aborts after `ms` (no `AbortSignal.any`: older Safari lacks it). */
function timed(signal: AbortSignal, ms: number): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const stop = () => {
    clearTimeout(timer);
    controller.abort();
  };
  if (signal.aborted) stop();
  else signal.addEventListener('abort', stop, { once: true });
  return controller.signal;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface OpenSocketOptions {
  /** On the fallback: probe now and then and close with `UPGRADE_CODE` once WebSockets work (the room reconnects). */
  upgrade?: boolean;
  /** Which way the connection went (diagnostics, tests). */
  onTransport?: (transport: Transport) => void;
  /** Tests: skip the WebSocket (`'http'`) or the fallback (`'ws'`). */
  force?: Transport;
  wsOpenMs?: number;
  probeFirstMs?: number;
}

/** A WebSocket, or the HTTP fallback when WebSockets don't open here. */
class SmartSocket extends Emitter implements SwmSocket {
  readyState = CONNECTING;
  transport: Transport | null = null;
  private inner: SwmSocket | WebSocket | null = null;
  private probeTimer: ReturnType<typeof setTimeout> | null = null;
  private probeDelay: number;

  constructor(
    private readonly url: string,
    private readonly options: OpenSocketOptions,
  ) {
    super();
    // `__swmProbeMs`: harness only (scripts/harness/hotspot), so the test doesn't wait a minute.
    this.probeDelay = options.probeFirstMs ?? (globalThis as { __swmProbeMs?: number }).__swmProbeMs ?? PROBE_FIRST_MS;
    const mode = options.force ?? (prefersHttp() ? 'http' : 'ws');
    if (mode === 'http') this.useHttp();
    else this.useWebSocket();
  }

  send(data: string): void {
    if (this.readyState === CONNECTING) throw new Error('InvalidStateError: still connecting');
    if (this.readyState === OPEN) this.inner?.send(data);
  }

  close(code = 1000, reason = ''): void {
    if (this.readyState === CLOSED || this.readyState === CLOSING) return;
    this.stopProbe();
    const inner = this.inner;
    if (inner && inner.readyState !== CLOSED) {
      this.readyState = CLOSING;
      try {
        inner.close(code, reason);
      } catch {
        inner.close();
      }
    } else {
      setTimeout(() => this.finish({ code, reason, wasClean: true }), 0);
    }
  }

  private useWebSocket(): void {
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.url);
    } catch {
      this.useHttp(true);
      return;
    }
    this.inner = ws;
    let opened = false;
    const timer = setTimeout(() => {
      if (opened || this.inner !== ws) return;
      this.inner = null;
      try {
        ws.close();
      } catch {
        // Never opened.
      }
      if (this.options.force === 'ws') this.finish({ code: 1006, reason: 'timeout', wasClean: false });
      else this.useHttp(true);
    }, this.options.wsOpenMs ?? WS_OPEN_MS);
    ws.addEventListener('open', () => {
      if (this.inner !== ws) return;
      opened = true;
      clearTimeout(timer);
      this.opened('ws');
    });
    ws.addEventListener('message', (event) => {
      if (this.inner === ws) this.emit('message', { data: String(event.data) });
    });
    ws.addEventListener('close', (event) => {
      if (this.inner !== ws) return;
      clearTimeout(timer);
      if (!opened && this.readyState === CONNECTING && this.options.force !== 'ws') {
        // Failed before it opened: maybe this network lets no WebSocket through.
        this.inner = null;
        this.useHttp(true);
        return;
      }
      this.finish({ code: event.code, reason: event.reason, wasClean: event.wasClean });
    });
  }

  /** `afterWsFailed`: remember for the tab only once the fallback really worked (see `opened`). */
  private useHttp(afterWsFailed = false): void {
    const socket = new HttpSocket(this.url);
    this.inner = socket;
    socket.addEventListener('open', () => {
      if (this.inner !== socket) return;
      if (afterWsFailed) setPreferHttp(true);
      this.opened('http');
    });
    socket.addEventListener('message', (event) => {
      if (this.inner === socket) this.emit('message', event);
    });
    socket.addEventListener('close', (event) => {
      // Not opened either (the network is down): the tab keeps preferring the fallback; the probe moves it back.
      if (this.inner === socket) this.finish(event);
    });
  }

  private opened(transport: Transport): void {
    if (this.readyState !== CONNECTING) return;
    this.transport = transport;
    this.readyState = OPEN;
    this.options.onTransport?.(transport);
    this.emit('open', {});
    if (transport === 'http' && this.options.upgrade) this.scheduleProbe();
  }

  private finish(event: SocketEvents['close']): void {
    if (this.readyState === CLOSED) return;
    this.stopProbe();
    this.readyState = CLOSED;
    this.emit('close', event);
  }

  private scheduleProbe(): void {
    this.stopProbe();
    this.probeTimer = setTimeout(() => {
      void probeWebSocket(this.url).then((works) => {
        if (this.readyState !== OPEN) return;
        if (!works) {
          this.probeDelay = Math.min(PROBE_MAX_MS, this.probeDelay * 2);
          this.scheduleProbe();
          return;
        }
        setPreferHttp(false);
        this.close(UPGRADE_CODE, 'upgrade');
      });
    }, this.probeDelay);
  }

  private stopProbe(): void {
    if (this.probeTimer !== null) clearTimeout(this.probeTimer);
    this.probeTimer = null;
  }
}

/** Opens a small WebSocket to `/api/probe` on the same server: true if it opens and answers. */
export function probeWebSocket(anyUrl: string, timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    let ws: WebSocket;
    try {
      const url = new URL(anyUrl.replace(/^http/, 'ws'));
      ws = new WebSocket(`${url.protocol}//${url.host}/api/probe`);
    } catch {
      resolve(false);
      return;
    }
    let settled = false;
    const done = (works: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(works);
      try {
        if (works) ws.send('bye');
        else ws.close();
      } catch {
        // Already closed.
      }
    };
    const timer = setTimeout(() => done(false), timeoutMs);
    ws.addEventListener('message', (event) => done(String(event.data) === 'ok'));
    ws.addEventListener('close', () => done(false));
  });
}

/** Opens a connection to an object's `ws(s)://…/ws` address (see the top of this file). */
export function openSocket(url: string, options: OpenSocketOptions = {}): SwmSocket {
  return new SmartSocket(url, options);
}
