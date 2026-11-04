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

/** Hiç açılmayan bağlantı (bazı mobil ağlarda el sıkışma asılı kalıyor); kapatılınca "close" olur. */
class HangingSocket extends FakeSocket {
  constructor(url: string) {
    super(url);
    this.readyState = 0;
  }
  override addEventListener(type: string, fn: (event: { data?: string }) => void) {
    // "open" hiç gelmesin.
    if (type !== 'open') super.addEventListener(type, fn);
  }
  override close() {
    this.readyState = 3;
    this.emit('close');
  }
}

describe('RoomConnection open timeout', () => {
  it('gives up on a socket that never opens, tries the HTTP fallback, retries and counts the failures', async () => {
    vi.stubGlobal('WebSocket', HangingSocket);
    // The HTTP fallback cannot reach the server either.
    const fetches: string[] = [];
    vi.stubGlobal('fetch', (url: string) => {
      fetches.push(url);
      return Promise.reject(new TypeError('offline'));
    });
    const failures: number[] = [];
    const conn = new RoomConnection({
      serverUrl: 'http://test',
      roomId: 'abc123',
      name: 'Ali',
      clock: new ServerClock(() => Date.now()),
      onMessage: () => {},
      onFailures: (n) => failures.push(n),
    });
    conn.connect();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(FakeSocket.all.length).toBe(1);
    expect(fetches).toEqual([]);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(fetches[0]).toBe('http://test/api/rooms/abc123/ws?http=open');
    expect(failures).toEqual([1]);
    await vi.advanceTimersByTimeAsync(30_000);
    expect(FakeSocket.all.length).toBeGreaterThanOrEqual(3);
    expect(failures.at(-1)).toBeGreaterThanOrEqual(2);
    conn.close();
  });
});

describe('handover: false (the Test Lab\'s fake friends)', () => {
  function storage() {
    const map = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, String(v)),
      removeItem: (k: string) => void map.delete(k),
    });
    return map;
  }
  const open = (handover?: boolean) => {
    const conn = new RoomConnection({ serverUrl: 'http://test', roomId: 'abc123', name: 'Ali', clock: new ServerClock(() => Date.now()), onMessage: () => {}, ...(handover === undefined ? {} : { handover }) });
    conn.connect();
    return conn;
  };

  it('neither takes the tab\'s handed-over member id nor leaves its own', async () => {
    const map = storage();
    map.set('swm:prev:abc123', JSON.stringify({ id: 'm-real', at: Date.now() }));
    const fake = open(false);
    await vi.advanceTimersByTimeAsync(1);
    const hello = FakeSocket.all[0]!.sent.find((m) => m.t === 'hello') as { prev?: string } | undefined;
    expect(hello?.prev).toBeUndefined();
    expect(map.has('swm:prev:abc123')).toBe(true);
    FakeSocket.all[0]!.emit('message', { t: 'welcome', you: 'm-fake', state: {}, queue: [], members: [], hostId: null, chat: [] });
    map.delete('swm:prev:abc123');
    fake.close();
    expect(map.has('swm:prev:abc123')).toBe(false);
  });

  it('a normal connection still takes and leaves it', async () => {
    const map = storage();
    map.set('swm:prev:abc123', JSON.stringify({ id: 'm-real', at: Date.now() }));
    const real = open();
    await vi.advanceTimersByTimeAsync(1);
    const hello = FakeSocket.all[0]!.sent.find((m) => m.t === 'hello') as { prev?: string } | undefined;
    expect(hello?.prev).toBe('m-real');
    real.close();
    expect(map.has('swm:prev:abc123')).toBe(true);
  });
});
