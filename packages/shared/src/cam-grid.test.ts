import { describe, expect, it } from 'vitest';
import { camGrid, camGridBoxes, splitRows } from './cam-grid.ts';

/** Three window shapes: wide (16:9), square-ish (4:3) and tall (a column). */
const SHAPES = { wide: [640, 360], fourThree: [480, 360], tall: [240, 560] } as const;

describe('camera grid (CAM3)', () => {
  it('never puts more tiles in a lower row than an upper one', () => {
    for (let n = 1; n <= 8; n++) {
      for (const [w, h] of Object.values(SHAPES)) {
        const { rows } = camGrid(n, w, h);
        expect(rows.reduce((a, b) => a + b, 0)).toBe(n);
        for (let i = 1; i < rows.length; i++) expect(rows[i]!).toBeLessThanOrEqual(rows[i - 1]!);
        // Rows are as even as possible: never two tiles apart.
        expect(rows[0]! - rows[rows.length - 1]!).toBeLessThanOrEqual(1);
      }
    }
  });

  it('splits rows the Meet way, extras on top', () => {
    expect(splitRows(5, 2)).toEqual([3, 2]);
    expect(splitRows(7, 3)).toEqual([3, 2, 2]);
    expect(splitRows(6, 2)).toEqual([3, 3]);
    expect(splitRows(6, 3)).toEqual([2, 2, 2]);
    expect(splitRows(4, 2)).toEqual([2, 2]);
  });

  it('picks the shape from the window: 2 side by side when wide, stacked when tall', () => {
    expect(camGrid(2, ...SHAPES.wide).rows).toEqual([2]);
    expect(camGrid(2, ...SHAPES.tall).rows).toEqual([1, 1]);
    expect(camGrid(3, 900, 240).rows).toEqual([3]);
    expect(camGrid(3, ...SHAPES.wide).rows).toEqual([2, 1]);
    expect(camGrid(3, ...SHAPES.tall).rows).toEqual([1, 1, 1]);
  });

  it('gives 4 = 2×2, 5 = 3+2, 6 = 3+3 in a 4:3 window', () => {
    expect(camGrid(4, ...SHAPES.fourThree).rows).toEqual([2, 2]);
    expect(camGrid(5, ...SHAPES.fourThree).rows).toEqual([3, 2]);
    expect(camGrid(6, ...SHAPES.fourThree).rows).toEqual([3, 3]);
    expect(camGrid(8, ...SHAPES.fourThree).rows).toEqual([3, 3, 2]);
    expect(camGrid(6, 300, 560).rows).toEqual([2, 2, 2]);
  });

  it('is the biggest tile of every row count', () => {
    for (let n = 1; n <= 8; n++) {
      for (const [w, h] of Object.values(SHAPES)) {
        const best = camGrid(n, w, h);
        for (let r = 1; r <= n; r++) {
          const rows = splitRows(n, r);
          const tileW = Math.min((w - (rows[0]! - 1) * 6) / rows[0]!, ((h - (rows.length - 1) * 6) / rows.length) * (4 / 3));
          expect(best.tileW).toBeGreaterThanOrEqual(tileW - 0.5);
        }
      }
    }
  });

  it('keeps every tile inside the box, 4:3 and apart (no face cut by the edge)', () => {
    for (let n = 1; n <= 8; n++) {
      for (const [w, h] of Object.values(SHAPES)) {
        const grid = camGrid(n, w, h);
        const boxes = camGridBoxes(grid, w, h);
        expect(boxes).toHaveLength(n);
        for (const b of boxes) {
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.y).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w).toBeLessThanOrEqual(w + 0.01);
          expect(b.y + b.h).toBeLessThanOrEqual(h + 0.01);
          expect(b.w / b.h).toBeCloseTo(4 / 3, 5);
        }
        for (let i = 0; i < boxes.length; i++) {
          for (let j = i + 1; j < boxes.length; j++) {
            const a = boxes[i]!;
            const b = boxes[j]!;
            const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
            expect(overlap).toBe(false);
          }
        }
      }
    }
  });

  it('handles nothing to place', () => {
    expect(camGrid(0, 300, 200).rows).toEqual([]);
    expect(camGridBoxes(camGrid(0, 300, 200), 300, 200)).toEqual([]);
  });
});
