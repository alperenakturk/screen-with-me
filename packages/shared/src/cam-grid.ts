/**
 * Camera grid layout (card CAM3, owner 21 Nov 2026: "like Google Meet, done better").
 *
 * How the others tile (read 21 Nov 2026): Google Meet's "Auto" / "Tiled" picks a column count from the window's shape
 * so every tile is as big as possible and centres a shorter last row; Zoom's gallery view fills rows of equal size
 * (also centring the last row); Discord packs equal 16:9 tiles row by row. All three keep every tile the same size and
 * the same shape, which is what keeps faces whole. Ours does the same and adds two rules: rows never hold more tiles
 * lower down than higher up (5 = 3 + 2, 7 = 3 + 2 + 2, never 3 + 3 + 1), and the row count is the one that gives each
 * tile the biggest picture for this window's shape (2 = side by side in a wide window, stacked in a tall one).
 */
export interface CamGrid {
  /** Tiles per row, top first; never more lower down than higher up. */
  rows: number[];
  /** Every tile's size in px (all the same, at `ratio`). */
  tileW: number;
  tileH: number;
  /** The space the tiles really use (≤ the space given). */
  usedW: number;
  usedH: number;
}

/** Tiles per row for `n` tiles in `r` rows: as even as possible, the extra ones in the upper rows. */
export function splitRows(n: number, r: number): number[] {
  const rows: number[] = [];
  const base = Math.floor(n / r);
  for (let i = 0; i < r; i++) rows.push(base + (i < n % r ? 1 : 0));
  return rows.filter((k) => k > 0);
}

/**
 * The best grid for `n` tiles of shape `ratio` (width / height) in a `width` × `height` box with `gap` px between
 * tiles. Ties go to fewer rows (a wider grid reads better beside a video).
 */
export function camGrid(n: number, width: number, height: number, gap = 6, ratio = 4 / 3): CamGrid {
  if (n <= 0 || width <= 0 || height <= 0) return { rows: [], tileW: 0, tileH: 0, usedW: 0, usedH: 0 };
  let best: CamGrid | null = null;
  for (let r = 1; r <= n; r++) {
    const rows = splitRows(n, r);
    const cols = rows[0]!;
    const fitW = (width - (cols - 1) * gap) / cols;
    const fitH = (height - (rows.length - 1) * gap) / rows.length;
    const tileW = Math.max(0, Math.min(fitW, fitH * ratio));
    if (best && tileW <= best.tileW + 0.5) continue;
    const tileH = tileW / ratio;
    best = { rows, tileW, tileH, usedW: cols * tileW + (cols - 1) * gap, usedH: rows.length * tileH + (rows.length - 1) * gap };
  }
  return best!;
}

/** Each tile's box (x, y, w, h) for a grid placed in a `width` × `height` box: rows centred, the grid centred. */
export function camGridBoxes(grid: CamGrid, width: number, height: number, gap = 6): { x: number; y: number; w: number; h: number }[] {
  const out: { x: number; y: number; w: number; h: number }[] = [];
  const top = Math.max(0, (height - grid.usedH) / 2);
  grid.rows.forEach((k, row) => {
    const rowW = k * grid.tileW + (k - 1) * gap;
    const left = Math.max(0, (width - rowW) / 2);
    for (let i = 0; i < k; i++) out.push({ x: left + i * (grid.tileW + gap), y: top + row * (grid.tileH + gap), w: grid.tileW, h: grid.tileH });
  });
  return out;
}
