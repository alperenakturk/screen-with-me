/**
 * Card SZ: lazy chunks that a first press must open at once (the IP notice, the pre-join check, the stream) are fetched
 * once the room has settled: `IDLE_AFTER_MS` after the room starts, when the browser is idle. Never on the room's
 * first paint, so the room page's own download stays small (scripts/size-budget.mjs).
 */
export const IDLE_AFTER_MS = 4000;

export function whenIdle(run: () => void): void {
  setTimeout(() => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => run(), { timeout: 4000 });
    else run();
  }, IDLE_AFTER_MS);
}
