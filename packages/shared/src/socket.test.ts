import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpSocket, UPGRADE_CODE, openSocket, prefersHttp, setPreferHttp } from './socket.ts';

/** A WebSocket that neither opens nor closes (the owner's phone hotspot), or one that opens at once. */
class FakeWebSocket {
  static all: FakeWebSocket[] = [];
  static opens = false;
  readyState = 0;
  sent: string[] = [];
  private listeners: Record<string, ((event: unknown) => void)[]> = {};
  constructor(readonly url: string) {
    FakeWebSocket.all.push(this);
    if (FakeWebSocket.opens) {
      setTimeout(() => {
        this.readyState = 1;
        this.emit('open', {});
        if (url.endsWith('/api/probe')) this.emit('message', { data: 'ok' });
      }, 0);
    }
  }
  addEventListener(type: string, fn: (event: unknown) => void) {
    (this.listeners[type] ??= []).push(fn);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    if (this.readyState === 3) return;
    this.readyState = 3;
    setTimeout(() => this.emit('close', { code: 1006, reason: '', wasClean: false }), 0);
  }
  emit(type: string, event: unknown) {
    for (const fn of this.listeners[type] ?? []) fn(event);
  }
}

/** The fallback server (`apps/server/src/fallback.ts`) in a few lines: one session, held polls. */
class FakeServer {
  sent: string[] = [];
  queue: string[] = [];
  closed: { code: number } | null = null;
  ops: string[] = [];
  private wake: (() => void) | null = null;
  fetch = async (input: string, init?: RequestInit): Promise<Response> => {
    const url = new URL(input);
    const op = url.searchParams.get('http')!;
    this.ops.push(op);
    if (op === 'open') return Response.json({ sid: 'S1' });
    if (op === 'send') {
      if (this.closed) return Response.json(this.closed, { status: 410 });
      this.sent.push(...(JSON.parse(String(init?.body)) as string[]));
      return new Response(null, { status: 204 });
    }
    if (op === 'close') return new Response(null, { status: 204 });
    // poll
    if (!this.queue.length && !this.closed) {
      await new Promise<void>((resolve) => {
        this.wake = resolve;
        init?.signal?.addEventListener('abort', () => resolve());
      });
    }
    if (init?.signal?.aborted) throw new DOMException('aborted', 'AbortError');
    if (this.queue.length) return new Response(this.queue.splice(0).join('\n'));
    if (this.closed) return Response.json(this.closed, { status: 410 });
    return new Response(null, { status: 204 });
  };
  say(...messages: string[]) {
    this.queue.push(...messages);
    this.wake?.();
  }
  end(code: number) {
    this.closed = { code };
    this.wake?.();
  }
}

let server: FakeServer;
beforeEach(() => {
  vi.useFakeTimers({ now: 1_000_000 });
  FakeWebSocket.all = [];
  FakeWebSocket.opens = false;
  server = new FakeServer();
  vi.stubGlobal('WebSocket', FakeWebSocket);
  vi.stubGlobal('fetch', server.fetch);
  setPreferHttp(false);
});
afterEach(() => {
  setPreferHttp(false);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('openSocket', () => {
  it('uses a WebSocket when it opens (normal networks never touch the fallback)', async () => {
    FakeWebSocket.opens = true;
    const socket = openSocket('ws://test/api/rooms/abc/ws');
    const opened = vi.fn();
    socket.addEventListener('open', opened);
    await vi.advanceTimersByTimeAsync(10);
    expect(opened).toHaveBeenCalledOnce();
    expect(socket.transport).toBe('ws');
    expect(server.ops).toEqual([]);
    expect(prefersHttp()).toBe(false);
  });

  it('switches to the HTTP fallback when the WebSocket hangs, and remembers it for the tab', async () => {
    const transports: string[] = [];
    const socket = openSocket('ws://test/api/rooms/abc/ws', { onTransport: (t) => transports.push(t) });
    const messages: string[] = [];
    socket.addEventListener('message', (e) => messages.push(e.data));
    await vi.advanceTimersByTimeAsync(5_900);
    expect(socket.readyState).toBe(0);
    await vi.advanceTimersByTimeAsync(200);
    expect(socket.readyState).toBe(1);
    expect(transports).toEqual(['http']);
    expect(FakeWebSocket.all[0]!.readyState).toBe(3);
    expect(prefersHttp()).toBe(true);

    socket.send('{"t":"hello"}');
    socket.send('{"t":"ping","c":1}');
    await vi.advanceTimersByTimeAsync(10);
    expect(server.sent).toEqual(['{"t":"hello"}', '{"t":"ping","c":1}']);

    server.say('{"t":"welcome"}', '{"t":"pong"}');
    await vi.advanceTimersByTimeAsync(10);
    expect(messages).toEqual(['{"t":"welcome"}', '{"t":"pong"}']);

    // Next connection in this tab goes straight to the fallback.
    const again = openSocket('ws://test/api/rooms/abc/ws');
    await vi.advanceTimersByTimeAsync(10);
    expect(again.transport).toBe('http');
    expect(FakeWebSocket.all.length).toBe(1);
    socket.close();
    again.close();
  });

  it('closes with the server’s code when the session ends (410)', async () => {
    const socket = new HttpSocket('ws://test/api/rooms/abc/ws');
    const closes: number[] = [];
    socket.addEventListener('close', (e) => closes.push(e.code));
    await vi.advanceTimersByTimeAsync(10);
    server.say('{"t":"error","code":"kicked"}');
    server.end(4003);
    await vi.advanceTimersByTimeAsync(10);
    expect(closes).toEqual([4003]);
    expect(socket.readyState).toBe(3);
  });

  it('waits on a 429 and sends the same batch again, never closing (security M4)', async () => {
    const socket = new HttpSocket('ws://test/api/rooms/abc/ws');
    await vi.advanceTimersByTimeAsync(10);
    const real = server.fetch;
    let limited = 0;
    vi.stubGlobal('fetch', (input: string, init?: RequestInit) => {
      const op = new URL(input).searchParams.get('http');
      if ((op === 'send' || op === 'poll') && limited < 6) {
        limited++;
        return Promise.resolve(new Response('Too many requests', { status: 429 }));
      }
      return real(input, init);
    });
    const closes: number[] = [];
    socket.addEventListener('close', (e) => closes.push(e.code));
    socket.send('{"t":"chat","text":"hi"}');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(closes).toEqual([]);
    expect(socket.readyState).toBe(1);
    expect(server.sent).toEqual(['{"t":"chat","text":"hi"}']);
    socket.close();
  });

  it('says it is closed after repeated failed polls', async () => {
    const socket = new HttpSocket('ws://test/api/rooms/abc/ws');
    await vi.advanceTimersByTimeAsync(10);
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('offline')));
    server.say('{"t":"x"}');
    const closes: number[] = [];
    socket.addEventListener('close', (e) => closes.push(e.code));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(closes).toEqual([1006]);
  });

  it('moves back to a WebSocket once the probe says WebSockets work', async () => {
    const socket = openSocket('ws://test/api/rooms/abc/ws', { upgrade: true, probeFirstMs: 1_000 });
    const closes: number[] = [];
    socket.addEventListener('close', (e) => closes.push(e.code));
    await vi.advanceTimersByTimeAsync(6_100);
    expect(socket.transport).toBe('http');
    // First probe: WebSockets still hang → try again later (twice the wait).
    await vi.advanceTimersByTimeAsync(1_000 + 6_100);
    expect(closes).toEqual([]);
    FakeWebSocket.opens = true;
    await vi.advanceTimersByTimeAsync(2_100);
    expect(closes).toEqual([UPGRADE_CODE]);
    expect(prefersHttp()).toBe(false);
    expect(server.ops).toContain('close');
  });
});
