import { DurableObject } from 'cloudflare:workers';

/** A waiting TV's code is good for this long; then the TV shows a new one. */
const CODE_TTL_MS = 10 * 60_000;

/**
 * One TV waiting to be paired, named by the 6-digit code it shows (`/api/tv/<code>/ws`). A phone in a room types the
 * code; its room calls `deliver` here with the room id and a link token, this object hands them to the TV and closes.
 * Nothing is stored: the code lives only as long as the TV's connection (at most `CODE_TTL_MS`). A second TV that
 * picked the same code is turned away (`4009`) and picks another.
 */
export class TvLink extends DurableObject<Env> {
  override async fetch(request: Request): Promise<Response> {
    if (new URL(request.url).pathname === '/deliver' && request.method === 'POST') {
      const tv = this.ctx.getWebSockets().find((ws) => ws.readyState === WebSocket.OPEN);
      if (!tv) return new Response('No TV', { status: 404 });
      const body = (await request.json()) as { room: string; token: string };
      tv.send(JSON.stringify({ t: 'paired', room: body.room, token: body.token }));
      tv.close(1000, 'paired');
      return new Response('ok');
    }
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    if (this.ctx.getWebSockets().filter((ws) => ws !== server && ws.readyState === WebSocket.OPEN).length > 0) {
      server.send(JSON.stringify({ t: 'taken' }));
      server.close(4009, 'taken');
    } else {
      server.send(JSON.stringify({ t: 'waiting', ttl: CODE_TTL_MS }));
      await this.ctx.storage.setAlarm(Date.now() + CODE_TTL_MS);
    }
    return new Response(null, { status: 101, webSocket: client });
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

  // The TV only listens; anything it sends is ignored (keep-alive pings included).
  override async webSocketMessage(): Promise<void> {}

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code, 'closed');
    } catch {
      // Already closed.
    }
  }
}
