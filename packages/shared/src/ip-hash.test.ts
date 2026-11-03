import { describe, expect, it } from 'vitest';
import { hashIp, ipHashKey, newIpHashKey } from './ip-hash.ts';

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
