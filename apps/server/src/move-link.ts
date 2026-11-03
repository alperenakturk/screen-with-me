import { DurableObject } from 'cloudflare:workers';
import { MOVE_MAX_CHARS, MOVE_TTL_MS } from '@swm/shared/move';

/**
 * "Move my things to another device" (CARDS.md): one pair of devices, named by the 6-digit code the sending device
 * shows (`/api/move/<code>/ws?role=send|get`). The sender waits here; a receiver that types the code is announced to
 * it (`asking`), and only when the person on the sending device presses "Send" does its text come, which this object
 * hands to the receiver once and then closes both. Nothing is stored: the text passes through memory, the code lives
 * only as long as the sender's connection (at most `MOVE_TTL_MS`). Guessing codes gets nowhere: the sender must say yes,
 * and `CONNECT_LIMIT` counts every try.
 *
 * Messages (JSON): to the sender `waiting {ttl}`, `asking`, `sent`; to the receiver `waiting` (asked, wait for the
 * sender), `none` (no such code, closed 4404), `blob {data}` (then closed 1000), `refused` (closed 4403); from the
 * sender `send {data}` or `refuse`. A second sender with the same code gets `taken` (4009); a second receiver `busy`.
 */
export class MoveLink extends DurableObject<Env> {
  private role(ws: WebSocket): 'send' | 'get' | null {
    const tags = this.ctx.getTags(ws);
    return tags.includes('send') ? 'send' : tags.includes('get') ? 'get' : null;
  }
  private open(role: 'send' | 'get'): WebSocket[] {
    return this.ctx.getWebSockets(role).filter((ws) => ws.readyState === WebSocket.OPEN);
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    const role = new URL(request.url).searchParams.get('role') === 'send' ? 'send' : 'get';
    const { 0: client, 1: server } = new WebSocketPair();
    if (role === 'send') {
      if (this.open('send').length) {
        turnAway(server, 'taken', 4009);
      } else {
        this.ctx.acceptWebSocket(server, [role]);
        server.send(JSON.stringify({ t: 'waiting', ttl: MOVE_TTL_MS }));
        await this.ctx.storage.setAlarm(Date.now() + MOVE_TTL_MS);
      }
    } else {
      const sender = this.open('send')[0];
      if (!sender) {
        turnAway(server, 'none', 4404);
      } else if (this.open('get').length) {
        turnAway(server, 'busy', 4429);
      } else {
        this.ctx.acceptWebSocket(server, [role]);
        server.send(JSON.stringify({ t: 'waiting' }));
        sender.send(JSON.stringify({ t: 'asking' }));
      }
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (this.role(ws) !== 'send' || typeof message !== 'string' || message.length > MOVE_MAX_CHARS + 100) return;
    let data: { t?: unknown; data?: unknown } = {};
    try {
      data = JSON.parse(message) as typeof data;
    } catch {
      return;
    }
    const receiver = this.open('get')[0];
    if (!receiver) return;
    if (data.t === 'refuse') {
      receiver.send(JSON.stringify({ t: 'refused' }));
      receiver.close(4403, 'refused');
      return;
    }
    if (data.t !== 'send' || typeof data.data !== 'string' || data.data.length > MOVE_MAX_CHARS) return;
    receiver.send(JSON.stringify({ t: 'blob', data: data.data }));
    receiver.close(1000, 'moved');
    ws.send(JSON.stringify({ t: 'sent' }));
    ws.close(1000, 'moved');
    await this.ctx.storage.deleteAlarm();
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code, 'closed');
    } catch {
      // Already closed.
    }
    // The sender went away: a receiver still waiting learns the code is gone.
    if (this.role(ws) === 'send') {
      for (const other of this.open('get')) {
        other.send(JSON.stringify({ t: 'none' }));
        other.close(4404, 'none');
      }
    }
  }

  override async alarm(): Promise<void> {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(4010, 'expired');
      } catch {
        // Already closed.
      }
    }
  }
}

/** Says why and closes a socket this object never accepted for hibernation (`turnAway` callers do not call
 *  `acceptWebSocket` for it). Closing a hibernatable socket while `fetch` had not yet returned its 101 was delayed:
 *  the client heard the reason at once but the close came ~10 s later (CI run 41613478208, move.mjs). */
function turnAway(ws: WebSocket, t: string, code: number): void {
  ws.accept();
  ws.send(JSON.stringify({ t }));
  ws.close(code, t);
}
