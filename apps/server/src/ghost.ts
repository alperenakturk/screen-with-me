// Ghost connections in the game objects (card GHOST): a socket that died without a close frame (1006, a phone that lost
// its network) stays "open" for the object, so its player stays online, keeps a seat or the turn, and the Quiz / Draw
// "too few players" grace never starts. Every game page pings every 15 s; a socket silent for `GHOST_MS` is closed in
// the object's alarm and goes through the same leave path as a real close. The time lives in the socket's attachment
// (hibernation keeps it), never in a bare timer (BH8).

/** A socket silent this long is taken for dead (three missed pings of the game pages, plus slack). */
export const GHOST_MS = 45_000;
/** The attachment is rewritten at most this often (a live socket's stored time is never older than this). */
const SEEN_EVERY_MS = 5_000;
/** The close code a ghost gets (the room uses the same one for its stale sockets). */
export const GHOST_CODE = 4004;

interface Seen {
  /** When the last message came (ms). */
  seen?: number;
  /** Closed as a ghost; its leave already ran. */
  ghost?: boolean;
}

type Socket = Pick<WebSocket, 'serializeAttachment' | 'deserializeAttachment' | 'close'>;

/** Notes a message's time on its socket. Call it before the handler reads the attachment, so a later write keeps it. */
export function touch(ws: Socket, now = Date.now()): void {
  const a = ws.deserializeAttachment() as Seen | null;
  if (!a || (a.seen !== undefined && now - a.seen < SEEN_EVERY_MS)) return;
  a.seen = now;
  ws.serializeAttachment(a);
}

/** When the alarm should look for ghosts next (null: no socket to watch). */
export function nextGhostCheck(sockets: Socket[]): number | null {
  let next: number | null = null;
  for (const ws of sockets) {
    const a = ws.deserializeAttachment() as Seen | null;
    if (a?.seen === undefined || a.ghost) continue;
    const due = a.seen + GHOST_MS + 1;
    if (next === null || due < next) next = due;
  }
  return next;
}

/** Closes every socket silent for longer than `GHOST_MS` and returns them, for the object's leave path. */
export function closeGhosts<S extends Socket>(sockets: S[], now = Date.now(), limit = GHOST_MS): S[] {
  const gone: S[] = [];
  for (const ws of sockets) {
    const a = ws.deserializeAttachment() as Seen | null;
    if (!a || a.seen === undefined || a.ghost || now - a.seen <= limit) continue;
    a.ghost = true;
    ws.serializeAttachment(a);
    try {
      ws.close(GHOST_CODE, 'stale');
    } catch {
      // Already closed.
    }
    gone.push(ws);
  }
  return gone;
}

/** True once the alarm has closed this socket as a ghost (its leave ran; a late close event must not run it again). */
export function wasGhost(ws: Socket): boolean {
  return !!(ws.deserializeAttachment() as Seen | null)?.ghost;
}
