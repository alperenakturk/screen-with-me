import { describe, expect, it } from 'vitest';
import { ServerClock } from './clock.ts';

describe('ServerClock', () => {
  it('estimates the server offset from the lowest-latency sample', () => {
    let local = 1000;
    const clock = new ServerClock(() => local);
    expect(clock.synced).toBe(false);

    // Sunucu 5 saniye ileride. 1. ölçüm: 400ms gidiş-dönüş, asimetrik (yanıltıcı).
    local = 1400;
    clock.addSample(1000, 6300);
    // 2. ölçüm: 40ms gidiş-dönüş, simetrik → doğru fark.
    local = 2040;
    clock.addSample(2000, 7020);

    expect(clock.synced).toBe(true);
    expect(clock.rtt).toBe(40);
    expect(clock.now()).toBe(7040);
  });
});
