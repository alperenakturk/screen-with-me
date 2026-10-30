import { describe, expect, it } from 'vitest';
import { qrMatrix, qrSvg } from './qr.ts';

describe('qrMatrix', () => {
  it('picks the smallest version that fits', () => {
    expect(qrMatrix('A').length).toBe(21);
    expect(qrMatrix('https://screen-with-me.swm-server.workers.dev/tv/123456').length).toBe(33);
    expect(qrMatrix('y'.repeat(100)).length).toBe(41);
  });

  it('draws the three finder patterns', () => {
    const m = qrMatrix('hello');
    const n = m.length;
    for (const [r, c] of [
      [0, 0],
      [0, n - 7],
      [n - 7, 0],
    ] as const) {
      expect(m[r]![c]).toBe(true);
      expect(m[r + 1]![c + 1]).toBe(false);
      expect(m[r + 3]![c + 3]).toBe(true);
    }
    // The fixed dark module next to the bottom-left finder.
    expect(m[n - 8]![8]).toBe(true);
  });

  it('refuses text that does not fit', () => {
    expect(() => qrMatrix('z'.repeat(200))).toThrow();
  });

  it('makes an SVG with a quiet zone', () => {
    expect(qrSvg('A')).toContain('viewBox="0 0 29 29"');
  });
});
