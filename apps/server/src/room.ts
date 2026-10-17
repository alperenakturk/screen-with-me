import { DurableObject } from 'cloudflare:workers';
import {
  PROTOCOL_VERSION,
  applyAction,
  initialState,
  parseClientMessage,
  type Member,
  type PlaybackState,
  type ServerMessage,
} from '@wb/shared/protocol';

const MAX_MEMBERS = 50;
/** Kimse kalmayan oda bu süre sonra silinir. */
const EMPTY_ROOM_TTL_MS = 24 * 60 * 60 * 1000;

/** Her WebSocket bağlantısına iliştirilen bilgi. Sunucu uykuya geçse bile korunur. */
interface Attachment {
  id: string;
  name: string | null;
}

/**
 * Bir izleme odası. Her oda ID'si için Cloudflare bu sınıftan tek bir nesne
 * çalıştırır; odadaki herkes aynı nesneye bağlanır. Böylece odalar birbirinden
 * bağımsız ölçeklenir.
 *
 * WebSocket Hibernation kullanılır: kimse bir şey yapmazken nesne uykuya
 * geçer ve ücret işlemez, bağlantılar açık kalır. Uyanınca constructor tekrar
 * çalışır, bu yüzden oda durumu bellekte değil depoda (storage) da tutulur.
 */
export class Room extends DurableObject<Env> {
  private state: PlaybackState = initialState(Date.now());

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<PlaybackState>('state');
      if (saved) this.state = saved;
    });
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);

    if (this.openSockets().length > MAX_MEMBERS) {
      this.sendTo(server, { t: 'error', code: 'room_full' });
      server.close(4001, 'room_full');
    } else {
      const attachment: Attachment = { id: crypto.randomUUID().slice(0, 8), name: null };
      server.serializeAttachment(attachment);
      await this.ctx.storage.deleteAlarm();
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const message = typeof raw === 'string' ? parseClientMessage(raw) : null;
    if (message === null) {
      this.sendTo(ws, { t: 'error', code: 'bad_message' });
      return;
    }

    const attachment = ws.deserializeAttachment() as Attachment;

    if (message.t === 'ping') {
      this.sendTo(ws, { t: 'pong', c: message.c, s: Date.now() });
      return;
    }

    if (message.t === 'hello') {
      if (message.v !== PROTOCOL_VERSION) {
        this.sendTo(ws, { t: 'error', code: 'version' });
        ws.close(4002, 'version');
        return;
      }
      attachment.name = message.name;
      ws.serializeAttachment(attachment);
      const members = this.members();
      this.sendTo(ws, { t: 'welcome', you: attachment.id, state: this.state, members });
      this.broadcast({ t: 'members', members }, ws);
      return;
    }

    if (attachment.name === null) {
      this.sendTo(ws, { t: 'error', code: 'not_joined' });
      return;
    }

    this.state = applyAction(this.state, message, Date.now());
    await this.ctx.storage.put('state', this.state);
    this.broadcast({
      t: 'state',
      state: this.state,
      action: message.t,
      by: { id: attachment.id, name: attachment.name },
    });
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code === 1005 ? 1000 : code);
    } catch {
      // Zaten kapanmış olabilir.
    }
    await this.onLeave(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.onLeave(ws);
  }

  /** Oda uzun süre boş kaldığında çalışır ve depoyu temizler. */
  override async alarm(): Promise<void> {
    if (this.openSockets().length === 0) await this.ctx.storage.deleteAll();
  }

  private async onLeave(leaving: WebSocket): Promise<void> {
    this.broadcast({ t: 'members', members: this.members(leaving) }, leaving);
    if (this.openSockets(leaving).length === 0) {
      await this.ctx.storage.setAlarm(Date.now() + EMPTY_ROOM_TTL_MS);
    }
  }

  private openSockets(except?: WebSocket): WebSocket[] {
    return this.ctx
      .getWebSockets()
      .filter((ws) => ws !== except && ws.readyState === WebSocket.OPEN);
  }

  private members(except?: WebSocket): Member[] {
    const members: Member[] = [];
    for (const ws of this.openSockets(except)) {
      const attachment = ws.deserializeAttachment() as Attachment | null;
      if (attachment?.name) members.push({ id: attachment.id, name: attachment.name });
    }
    return members;
  }

  private broadcast(message: ServerMessage, except?: WebSocket): void {
    const data = JSON.stringify(message);
    for (const ws of this.openSockets(except)) {
      const attachment = ws.deserializeAttachment() as Attachment | null;
      if (attachment?.name) ws.send(data);
    }
  }

  private sendTo(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Bağlantı kapanmışsa önemli değil.
    }
  }
}
