import { describe, expect, it } from 'vitest';
import { LAB_PASS_MS, labCodeMatches, labPassValid, makeLabPass, sameDigest } from './lab-pass.ts';

describe('lab code and pass (card LABLOCK)', () => {
  it('compares digests without an early exit', () => {
    expect(sameDigest('abcd', 'abcd')).toBe(true);
    expect(sameDigest('abcd', 'abce')).toBe(false);
    expect(sameDigest('abc', 'abcd')).toBe(false);
  });

  it('opens only with the right code', async () => {
    expect(await labCodeMatches('blue-otter-42', 'blue-otter-42')).toBe(true);
    expect(await labCodeMatches('blue-otter-41', 'blue-otter-42')).toBe(false);
    expect(await labCodeMatches('1', 'blue-otter-42')).toBe(false);
    expect(await labCodeMatches('', 'blue-otter-42')).toBe(false);
    expect(await labCodeMatches(42, 'blue-otter-42')).toBe(false);
    expect(await labCodeMatches('x'.repeat(500), 'x'.repeat(500))).toBe(false);
  });

  it('is shut when no code is set', async () => {
    expect(await labCodeMatches('anything', undefined)).toBe(false);
    expect(await labCodeMatches('', '')).toBe(false);
    expect(await labPassValid(await makeLabPass('s'), undefined)).toBe(false);
  });

  it('a pass works for 30 days, only with the secret that made it', async () => {
    const now = 1_800_000_000_000;
    const pass = await makeLabPass('secret-a', now);
    expect(await labPassValid(pass, 'secret-a', now + 1000)).toBe(true);
    expect(await labPassValid(pass, 'secret-a', now + LAB_PASS_MS - 1)).toBe(true);
    expect(await labPassValid(pass, 'secret-a', now + LAB_PASS_MS)).toBe(false);
    expect(await labPassValid(pass, 'secret-b', now + 1000)).toBe(false);
  });

  it('refuses a forged or stretched pass', async () => {
    const now = 1_800_000_000_000;
    const pass = await makeLabPass('secret-a', now);
    const [until, mac] = pass.split('.');
    // A later expiry with the old signature.
    expect(await labPassValid(`${Number(until) + 1000}.${mac}`, 'secret-a', now)).toBe(false);
    // A far-future expiry signed with the right secret still can't be longer than 30 days from now.
    const far = await makeLabPass('secret-a', now + 10 * LAB_PASS_MS);
    expect(await labPassValid(far, 'secret-a', now)).toBe(false);
    expect(await labPassValid('1', 'secret-a', now)).toBe(false);
    expect(await labPassValid(`${until}.${'0'.repeat(64)}`, 'secret-a', now)).toBe(false);
  });
});
