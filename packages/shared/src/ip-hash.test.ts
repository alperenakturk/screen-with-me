import { describe, expect, it } from 'vitest';
import { dailyKeyCache, hashIp, ipHashKey, newIpHashKey } from './ip-hash.ts';

describe('IP hash with a daily key (security M5)', () => {
  it('the same address with the same day key gives the same short value', async () => {
    const key = await ipHashKey(newIpHashKey());
    const a = await hashIp('203.0.113.7', key);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(await hashIp('203.0.113.7', key)).toBe(a);
    expect(await hashIp('203.0.113.8', key)).not.toBe(a);
  });

  it('another day (another key) gives another value, so days cannot be linked', async () => {
    const today = await ipHashKey(newIpHashKey());
    const tomorrow = await ipHashKey(newIpHashKey());
    expect(await hashIp('203.0.113.7', today)).not.toBe(await hashIp('203.0.113.7', tomorrow));
  });

  it('is not the plain SHA-256 that anyone could recompute for every IPv4 address', async () => {
    const key = await ipHashKey(newIpHashKey());
    const plain = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('swm-ip:203.0.113.7'));
    const plainHex = Array.from(new Uint8Array(plain).slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('');
    expect(await hashIp('203.0.113.7', key)).not.toBe(plainHex);
  });

  it('new keys are 32 random bytes', () => {
    const a = newIpHashKey();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(newIpHashKey()).not.toBe(a);
  });
});

describe('dailyKeyCache (security R4-2)', () => {
  const day = (iso: string) => Date.parse(iso);
  const raw = 'ab'.repeat(32);

  it('a first call that never answers does not hold the next one', async () => {
    let calls = 0;
    const cache = dailyKeyCache((signal) => {
      calls++;
      if (calls === 1) return new Promise(() => {}); // the object never answers (a cancelled request)
      void signal;
      return Promise.resolve({ day: '2026-11-04', key: raw });
    }, 50);
    const first = await cache(day('2026-11-04T10:00:00Z')); // the timeout: this isolate's own key
    const second = await cache(day('2026-11-04T10:00:01Z')); // asks again and gets the day's key
    expect(calls).toBe(2);
    const sameAsDay = await hashIp('1.2.3.4', second);
    expect(sameAsDay).toBe(await hashIp('1.2.3.4', await ipHashKey(raw)));
    expect(await hashIp('1.2.3.4', first)).not.toBe(sameAsDay);
  });

  it('caches the resolved key for the day and asks again the next day', async () => {
    let calls = 0;
    const cache = dailyKeyCache(async () => {
      calls++;
      return { day: calls === 1 ? '2026-11-04' : '2026-11-05', key: calls === 1 ? raw : 'cd'.repeat(32) };
    });
    const a = await cache(day('2026-11-04T10:00:00Z'));
    const b = await cache(day('2026-11-04T23:59:59Z'));
    expect(calls).toBe(1);
    expect(a).toBe(b);
    await cache(day('2026-11-05T00:00:01Z'));
    expect(calls).toBe(2);
  });

  it('a failing object falls back to one isolate key and keeps asking', async () => {
    let calls = 0;
    const cache = dailyKeyCache(async () => {
      calls++;
      throw new Error('unreachable');
    });
    const a = await cache();
    const b = await cache();
    expect(calls).toBe(2);
    expect(a).toBe(b);
  });
});
