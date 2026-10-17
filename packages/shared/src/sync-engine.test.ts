import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerClock } from './clock.ts';
import type { PlayerAdapter, PlayerEvent } from './player.ts';
import type { ClientMessage, PlaybackState } from './protocol.ts';
import { SyncEngine } from './sync-engine.ts';

/** Gerçek oynatıcı gibi davranan sahte oynatıcı. Zaman sadece `run` ile ilerler. */
class FakePlayer implements PlayerAdapter {
  fineRate = false;
  seekNoise = false;
  time = 0;
  paused = true;
  ended = false;
  stalled = false;
  rate = 1;
  autoplayAllowed = true;
  /** >0 ise oynat dendikten bu kadar sonra başlar (yavaş yükleme, reklam). */
  startDelayMs = 0;
  playCalls = 0;
  private wantsToPlay = false;
  private listeners: ((event: PlayerEvent) => void)[] = [];

  getTime = () => this.time;
  getDuration = () => 600;
  isPaused = () => this.paused;
  isEnded = () => this.ended;
  getRate = () => this.rate;
  async play() {
    this.playCalls++;
    if (!this.autoplayAllowed) return 'blocked' as const;
    this.wantsToPlay = true;
    const start = () => {
      if (!this.wantsToPlay || !this.paused) return;
      this.paused = false;
      this.emit('play');
    };
    if (this.startDelayMs > 0) setTimeout(start, this.startDelayMs);
    else start();
    return 'ok' as const;
  }
  pause = () => {
    this.wantsToPlay = false;
    this.paused = true;
    this.emit('pause');
  };
  seek = (seconds: number) => {
    this.time = seconds;
  };
  setRate = (rate: number) => {
    this.rate = rate;
    this.emit('ratechange');
  };
  onEvent = (listener: (event: PlayerEvent) => void) => {
    this.listeners.push(listener);
  };
  destroy = () => {};

  emit(event: PlayerEvent) {
    for (const listener of this.listeners) listener(event);
  }
  tick(seconds: number) {
    if (!this.paused && !this.stalled) this.time += seconds * this.rate;
  }
}

let player: FakePlayer;
let sent: ClientMessage[];
let engine: SyncEngine;
let clock: ServerClock;
let autoplayBlocked: number;
let ended: string[];

/** Gerçek zamanı ve oynatıcının zamanını birlikte ilerletir. */
async function run(ms: number) {
  for (let i = 0; i < ms; i += 50) {
    player.tick(0.05);
    await vi.advanceTimersByTimeAsync(50);
  }
}

function state(patch: Partial<PlaybackState> = {}): PlaybackState {
  return {
    item: { id: 'item1', media: { kind: 'youtube', id: 'dQw4w9WgXcQ' }, title: null, by: 'Ali' },
    paused: false,
    position: 0,
    rate: 1,
    updatedAt: Date.now(),
    ...patch,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ now: 1_000_000 });
  player = new FakePlayer();
  sent = [];
  autoplayBlocked = 0;
  ended = [];
  clock = new ServerClock(() => Date.now());
  clock.addSample(Date.now(), Date.now());
  engine = new SyncEngine({
    clock,
    send: (message) => sent.push(message),
    onAutoplayBlocked: () => autoplayBlocked++,
    onEnded: (itemId) => ended.push(itemId),
    wallNow: () => Date.now(),
  });
});

afterEach(() => {
  engine.destroy();
  vi.useRealTimers();
});

describe('applying remote state', () => {
  it('jumps to the room position and plays without echoing anything back', async () => {
    engine.receive(state({ position: 42 }));
    engine.attach(player);
    await run(2000);

    expect(player.paused).toBe(false);
    expect(player.time).toBeCloseTo(44, 0);
    expect(sent).toEqual([]);
  });

  it('follows a remote pause and seek', async () => {
    engine.receive(state());
    engine.attach(player);
    await run(2000);

    engine.receive(state({ paused: true, position: 100 }));
    await run(2000);

    expect(player.paused).toBe(true);
    expect(player.time).toBe(100);
    expect(sent).toEqual([]);
  });
});

describe('local user actions', () => {
  beforeEach(async () => {
    engine.receive(state());
    engine.attach(player);
    await run(2000);
  });

  it('broadcasts a pause after the debounce', async () => {
    player.pause();
    await run(400);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ t: 'pause' });
    expect((sent[0] as { position: number }).position).toBeCloseTo(2, 0);
  });

  it('treats a quick pause+play (YouTube scrubbing) as a seek, not a pause', async () => {
    player.seekNoise = true;
    player.pause();
    player.seek(300);
    await run(100);
    void player.play();
    await run(1000);
    expect(sent.map((m) => m.t)).toEqual(['seek']);
    expect((sent[0] as { position: number }).position).toBeCloseTo(300, 0);
  });

  it('still detects a seek made right after an unchanged state arrives', async () => {
    player.pause();
    await run(400);
    // Sunucu, bizim duraklatmamızı aynen geri yollar (hiçbir şey değişmez).
    engine.receive({ ...engine.getState()!, updatedAt: Date.now() });
    await run(100);
    player.seek(120);
    await run(600);
    expect(sent.map((m) => m.t)).toEqual(['pause', 'seek']);
    expect(sent[1]).toMatchObject({ position: 120 });
  });

  it("hears the user's pause even while the engine is busy correcting drift", async () => {
    player.fineRate = true;
    player.time -= 0.5; // geride kaldı → motor hafifçe hızlanır (kendi komutu)
    await run(500);
    expect(player.rate).toBeGreaterThan(1);
    player.pause();
    await run(500);
    expect(sent.map((m) => m.t)).toEqual(['pause']);
  });

  it("hears the user's pause right after the room jumped elsewhere", async () => {
    engine.receive(state({ position: 300, updatedAt: Date.now() }));
    await run(100);
    player.pause();
    await run(500);
    expect(sent.map((m) => m.t)).toEqual(['pause']);
  });

  it("a room message right after the user's pause does not undo it", async () => {
    // Normal <video>: duraklatma hemen gider.
    player.pause();
    engine.receive(state({ position: 2, updatedAt: Date.now() })); // hâlâ "oynuyor" diyen eski mesaj
    await run(500);
    expect(sent[0]).toMatchObject({ t: 'pause' });

    // YouTube: beklerken gelen mesaj videoyu yeniden başlatmaz.
    sent = [];
    engine.receive(state({ position: player.time, updatedAt: Date.now() }));
    await run(1500);
    player.seekNoise = true;
    player.pause();
    engine.receive(state({ position: player.time, updatedAt: Date.now() }));
    await run(500);
    expect(player.paused).toBe(true);
    expect(sent.map((m) => m.t)).toContain('pause');
  });

  it('detects a seek from the jump in time', async () => {
    player.seek(500);
    await run(600);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ t: 'seek' });
    const position = (sent[0] as { position: number }).position;
    expect(position).toBeGreaterThanOrEqual(500);
    expect(position).toBeLessThan(501);
  });

  it('does not mistake buffering for a seek', async () => {
    player.stalled = true;
    await run(800);
    player.stalled = false;
    await run(500);
    expect(sent).toEqual([]);
  });

  it('broadcasts speed changes', async () => {
    player.setRate(1.5);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ t: 'rate', rate: 1.5 });
  });

  it('does not broadcast the pause when the video ends, and reports the end once', async () => {
    player.ended = true;
    player.pause();
    await run(3000);
    expect(sent).toEqual([]);
    expect(ended).toEqual(['item1']);
  });
});

describe('drift correction', () => {
  it('jumps back in sync when far behind, silently', async () => {
    engine.receive(state());
    engine.attach(player);
    await run(2000);

    // Oynatıcı yavaş yavaş geride kalıyor (3 saniyede toplam 1.5 sn). Bu bir sarma değil.
    for (let i = 0; i < 30; i++) {
      player.time -= 0.05;
      await run(100);
    }
    const roomTime = (Date.now() - 1_000_000) / 1000;
    expect(sent).toEqual([]);
    expect(Math.abs(player.time - roomTime)).toBeLessThan(1);
  });

  it('nudges the speed instead of jumping when the player supports it', async () => {
    player.fineRate = true;
    engine.receive(state());
    engine.attach(player);
    await run(2000);

    player.time -= 0.5;
    await run(600);
    expect(player.rate).toBeGreaterThan(1);
    await run(15_000);
    expect(player.rate).toBe(1);
    expect(sent).toEqual([]);
  });
});

describe('slow start', () => {
  it('does not hammer play() while the video is still loading', async () => {
    player.startDelayMs = 4000;
    engine.receive(state());
    engine.attach(player);
    await run(2500);
    expect(player.playCalls).toBe(1);
    await run(3000);
    expect(player.paused).toBe(false);
    expect(player.playCalls).toBeLessThanOrEqual(2);
    expect(sent).toEqual([]);
  });

  it("still hears the user's pause while the video is loading", async () => {
    player.startDelayMs = 5000;
    engine.receive(state());
    engine.attach(player);
    await run(1500);
    player.pause();
    await run(500);
    expect(sent.map((m) => m.t)).toEqual(['pause']);
  });
});

describe('autoplay', () => {
  it('reports when the browser blocks playback and retries on resume', async () => {
    player.autoplayAllowed = false;
    engine.receive(state());
    engine.attach(player);
    await run(1000);
    expect(autoplayBlocked).toBe(1);
    expect(player.paused).toBe(true);

    await run(3000);
    expect(autoplayBlocked).toBe(1);

    player.autoplayAllowed = true;
    engine.resume();
    await run(500);
    expect(player.paused).toBe(false);
    expect(sent).toEqual([]);
  });
});
