/**
 * Card SZ: helpers for the room's lazy chunks.
 *
 * `loadChunk(() => import('./x.ts'))`: the module, or null when its chunk can't load (offline, a deploy replaced it).
 * main.ts handles a failed chunk (`vite:preloadError`: one reload "for the new version"), and Vite then resolves the
 * import to nothing instead of rejecting; anything chained onto `import()` itself runs inside Vite's wrapper and its
 * errors vanish the same way. So never chain onto `import()`: load through this and check for null.
 *
 * `whenIdle`: chunks that a first press must open at once (the IP notice, the pre-join check, the stream) are fetched
 * once the room has settled, `IDLE_AFTER_MS` after the room starts, when the browser is idle. Never on the room's first
 * paint, so the room page's own download stays small (scripts/size-budget.mjs).
 */
export async function loadChunk<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return (await load()) ?? null;
  } catch {
    return null;
  }
}

export const IDLE_AFTER_MS = 4000;

export function whenIdle(run: () => void): void {
  setTimeout(() => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => run(), { timeout: 4000 });
    else run();
  }, IDLE_AFTER_MS);
}
