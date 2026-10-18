import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerClock } from './clock.ts';
import { RoomConnection } from './connection.ts';

/** Sahte WebSocket: açılır, gönderilenleri kaydeder; sunucu cevabını test yazar. */
class FakeSocket {
  static OPEN = 1;
  static all: FakeSocket[] = [];
  readyState = 0;
  sent: { t: string; c?: number }[] = [];
  private listeners: Record<string, ((event: { data?: string }) => void)[]> = {};
  constructor(readonly url: string) {
    FakeSocket.all.push(this);
    setTimeout(() => {
      this.readyState = 1;
      this.emit('open');
    }, 0);
  }
  addEventListener(type: string, fn: (event: { data?: string }) => void) {
    (this.listeners[type] ??= []).push(fn);
  }
  send(raw: string) {
    this.sent.push(JSON.parse(raw));
  }
  close() {
    this.readyState = 3;
  }
  emit(type: string, data?: unknown) {
    for (const fn of this.listeners[type] ?? []) fn({ data: data === undefined ? undefined : JSON.stringify(data) });
  }
  /** Sunucu: bu bağlantıdaki son ping'e cevap ver. */
  pong() {
    const ping = [...this.sent].reverse().find((m) => m.t === 'ping');
    if (ping) this.emit('message', { t: 'pong', c: ping.c, s: Date.now() });
  }
}

function connect() {
  const conn = new RoomConnection({
    serverUrl: 'http://test',
    roomId: 'abc123',
    name: 'Ali',
    clock: new ServerClock(() => Date.now()),
    onMessage: () => {},
  });
  conn.connect();
  return conn;
}

beforeEach(() => {
  vi.useFakeTimers({ now: 1_000_000 });
  FakeSocket.all = [];
  vi.stubGlobal('WebSocket', FakeSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('RoomConnection silence detection', () => {
  it('reconnects when pings get no answer (half-open connection)', async () => {
    const conn = connect();
    await vi.advanceTimersByTimeAsync(5);
    FakeSocket.all[0]!.pong(); // ilk cevaplar geldi, sonra sunucu sustu
    await vi.advanceTimersByTimeAsync(40_000);
    expect(FakeSocket.all.length).toBe(2);
    conn.close();
  });

  it('stays connected while the server answers, even if pings are far apart', async () => {
    const conn = connect();
    await vi.advanceTimersByTimeAsync(5);
    for (let i = 0; i < 12; i++) {
      await vi.advanceTimersByTimeAsync(10_000);
      FakeSocket.all[0]!.pong();
    }
    expect(FakeSocket.all.length).toBe(1);
    conn.close();
  });
});
