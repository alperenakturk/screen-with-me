import { describe, expect, it } from 'vitest';
import { KEEPALIVE, KEEPALIVE_ACK, keepaliveTicks, lastHeard } from './keepalive.ts';

describe('keepalive (QUOTA1a)', () => {
  it('is one exact text (the runtime matches it byte for byte)', () => {
    expect(KEEPALIVE).toBe(JSON.stringify({ t: 'hb' }));
    expect(KEEPALIVE_ACK).toBe(JSON.stringify({ t: 'hb' }));
  });

  it('ticks a real ping first and every n-th time, the keepalive otherwise', () => {
    const out: string[] = [];
    const tick = keepaliveTicks(4, () => out.push('k'), () => out.push('p'));
    for (let i = 0; i < 9; i++) tick();
    expect(out.join('')).toBe('pkkkpkkkp');
  });

  it('takes the later of the last message and the last auto-answer', () => {
    expect(lastHeard(1000, null)).toBe(1000);
    expect(lastHeard(1000, new Date(5000))).toBe(5000);
    expect(lastHeard(9000, new Date(5000))).toBe(9000);
    expect(lastHeard(undefined, new Date(5000))).toBe(5000);
    expect(lastHeard(undefined, null)).toBeUndefined();
  });
});
