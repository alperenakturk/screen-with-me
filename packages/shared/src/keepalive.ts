// QUOTA1a: the keepalive that costs nothing. Every Durable Object answers this exact text itself
// (`setWebSocketAutoResponse`): the object is neither woken nor billed, so a room where people only watch can
// hibernate. A connection still needs a real ping now and then: the room's for `ServerClock` (sync), a game page's for
// its clock offset and for nudging an overdue phase. Old pages keep sending their real ping every 10 / 15 s and keep
// working (only this exact text is answered without the object).
//
// The HTTP fallback can't be answered that way: its requests reach the object, which answers `KEEPALIVE_ACK` itself.

/** What a page sends to keep its connection alive (exactly this text; never another spelling). */
export const KEEPALIVE = '{"t":"hb"}';
/** The answer (the runtime's, or the object's own over the HTTP fallback). */
export const KEEPALIVE_ACK = '{"t":"hb"}';

/** The room page's keepalive period (as the old ping's: the reconnect logic waits 15 s for an answer). */
export const ROOM_KEEPALIVE_MS = 10_000;
/** Every this many keepalive ticks the room page sends a real ping (a clock sample) instead: once a minute. */
export const ROOM_CLOCK_EVERY = 6;

/** The game pages' keepalive period (the objects' ghost limit is 90 s, room for a hidden tab's once-a-minute timers). */
export const GAME_KEEPALIVE_MS = 15_000;
/** Every this many ticks a game page sends a real ping (its clock offset): once a minute. */
export const GAME_CLOCK_EVERY = 4;

/**
 * One tick function for a page's keepalive timer: a real ping on the first tick and every `every`-th after it, the
 * free keepalive otherwise.
 */
export function keepaliveTicks(every: number, keepalive: () => void, ping: () => void): () => void {
  let tick = 0;
  return () => (tick++ % every === 0 ? ping() : keepalive());
}

/** When the connection was last heard from: the later of its last message and the runtime's last keepalive answer. */
export function lastHeard(seen: number | undefined, autoResponse: Date | null | undefined): number | undefined {
  const auto = autoResponse ? autoResponse.getTime() : undefined;
  if (seen === undefined) return auto;
  return auto !== undefined && auto > seen ? auto : seen;
}
