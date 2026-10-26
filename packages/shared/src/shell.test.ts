import { describe, expect, it } from 'vitest';
import { cleanLayout, holePath, mergeRects } from './shell.ts';

describe('kabuk yerleşimi', () => {
  it('deliği ve adacıkları evenodd yolu olarak çizer', () => {
    const path = holePath(1000, 600, { x: 10, y: 20, w: 300, h: 200 }, [{ x: 20, y: 30, w: 50, h: 40 }]);
    expect(path).toBe('path(evenodd, "M0 0H1000V600H0ZM10 20H310V220H10ZM20 30H70V70H20Z")');
  });

  it('bozuk yerleşimi reddeder, fazla adacığı keser', () => {
    expect(cleanLayout({ mode: 'open' })).toEqual({ mode: 'open' });
    expect(cleanLayout({ mode: 'bar', height: 56 })).toEqual({ mode: 'bar', height: 56 });
    expect(cleanLayout({ mode: 'bar', height: 9999 })).toBeNull();
    expect(cleanLayout({ mode: 'full', hole: { x: 0, y: 0, w: 'x', h: 1 }, islands: [] })).toBeNull();
    const many = Array.from({ length: 20 }, () => ({ x: 1, y: 1, w: 1, h: 1 }));
    const full = cleanLayout({ mode: 'full', hole: { x: 0, y: 0, w: 10, h: 10 }, islands: [...many, { x: NaN, y: 0, w: 1, h: 1 }] });
    expect(full?.mode === 'full' && full.islands.length).toBe(12);
    expect(cleanLayout(null)).toBeNull();
  });
});

describe('mergeRects', () => {
  it('merges overlapping islands into one box and keeps separate ones', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    const b = { x: 5, y: 5, w: 10, h: 10 };
    const far = { x: 100, y: 100, w: 5, h: 5 };
    expect(mergeRects([a, b, far])).toEqual([{ x: 0, y: 0, w: 15, h: 15 }, far]);
  });

  it('merges chains (a touches b, b touches c) and never leaves overlaps', () => {
    const rects = [
      { x: 0, y: 0, w: 10, h: 10 },
      { x: 30, y: 0, w: 10, h: 10 },
      { x: 8, y: 0, w: 25, h: 5 },
    ];
    expect(mergeRects(rects)).toEqual([{ x: 0, y: 0, w: 40, h: 10 }]);
  });
});
