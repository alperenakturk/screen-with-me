// QUOTA1a: the free keepalive (`@swm/shared/keepalive`) on the server side. Every Durable Object with sockets answers
// the exact keepalive text through the runtime (`setWebSocketAutoResponse`): no wake, no request billed, and a room
// where people only watch can hibernate. Liveness checks (the room's stale check, the games' ghost check) read the
// runtime's time of the last such answer next to the last real message. An HTTP fallback session can't be answered by
// the runtime: its keepalive reaches the object, which answers it itself (`answerKeepalive`).
import { KEEPALIVE, KEEPALIVE_ACK, lastHeard } from '@swm/shared/keepalive';

/** Call in the object's constructor. */
export function startKeepalive(ctx: DurableObjectState): void {
  try {
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(KEEPALIVE, KEEPALIVE_ACK));
  } catch {
    // A runtime without it: the object answers the keepalive itself below.
  }
}

/** The keepalive over the HTTP fallback (or a runtime without auto-response): true when `raw` was it and got its answer. */
export function answerKeepalive(ws: { send(data: string): void }, raw: string | ArrayBuffer): boolean {
  if (raw !== KEEPALIVE) return false;
  try {
    ws.send(KEEPALIVE_ACK);
  } catch {
    // Closed meanwhile.
  }
  return true;
}

/** When the runtime last answered this socket's keepalive (null: never, or not a runtime WebSocket). */
export function autoAnswered(ctx: DurableObjectState, ws: unknown): Date | null {
  try {
    return ctx.getWebSocketAutoResponseTimestamp(ws as WebSocket);
  } catch {
    return null;
  }
}

/** A socket's "last heard": its last message (`seen`) or the runtime's last keepalive answer, whichever is later. */
export function heardAt(ctx: DurableObjectState, ws: unknown, seen: number | undefined): number | undefined {
  return lastHeard(seen, autoAnswered(ctx, ws));
}
