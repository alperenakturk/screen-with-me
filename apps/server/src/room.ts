import { DurableObject } from 'cloudflare:workers';
import {
  PROTOCOL_VERSION,
  parseClientMessage,
  type Avatar,
  type ChatMessage,
  type ClientMessage,
  type Media,
  type Member,
  type QueueItem,
  type ServerMessage,
} from '@swm/shared/protocol';
import { applyRoomAction, initialRoom, setItemTitle, type RoomAction, type RoomData } from '@swm/shared/room-logic';
import { RateLimiter } from './rate-limit.ts';
import { resolveTitle } from './titles.ts';

const MAX_MEMBERS = 50;
/** Kimse kalmayan oda bu süre sonra silinir. */
const EMPTY_ROOM_TTL_MS = 24 * 60 * 60 * 1000;
/** Sonradan gelenlerin görebileceği son sohbet mesajı sayısı. */
const CHAT_HISTORY = 50;

/** Her WebSocket bağlantısına iliştirilen bilgi. Sunucu uykuya geçse bile korunur. */
interface Attachment {
  id: string;
  name: string | null;
  avatar?: Avatar;
}

function memberOf(attachment: Attachment & { name: string }): Member {
  return attachment.avatar
    ? { id: attachment.id, name: attachment.name, avatar: attachment.avatar }
    : { id: attachment.id, name: attachment.name };
}

function titleKey(media: Media): string {
  return media.kind === 'youtube' ? `yt:${media.id}` : media.url;
}

function newId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
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
  private room: RoomData = initialRoom(Date.now());
  private chat: ChatMessage[] = [];
  private titles = new Map<string, string | null>();

  // Her bağlantı için ayrı kovalar: genel komutlar, emoji, sohbet.
  private readonly commandLimit = new RateLimiter(20, 4);
  private readonly reactionLimit = new RateLimiter(6, 1.5);
  private readonly chatLimit = new RateLimiter(5, 0.5);

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<RoomData>('room');
      if (saved && Array.isArray(saved.queue)) this.room = saved;
      this.chat = (await ctx.storage.get<ChatMessage[]>('chat')) ?? [];
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
      const attachment: Attachment = { id: newId().slice(0, 8), name: null };
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
      this.join(ws, attachment, message.v, message.name, message.avatar);
      return;
    }

    if (attachment.name === null) {
      this.sendTo(ws, { t: 'error', code: 'not_joined' });
      return;
    }
    const me = memberOf({ ...attachment, name: attachment.name });

    if (!this.commandLimit.allow(me.id)) {
      this.sendTo(ws, { t: 'error', code: 'rate_limited' });
      return;
    }

    switch (message.t) {
      case 'react':
        if (this.reactionLimit.allow(me.id)) this.broadcast({ t: 'reaction', emoji: message.emoji, by: me });
        return;
      case 'chat':
        if (!this.chatLimit.allow(me.id)) {
          this.sendTo(ws, { t: 'error', code: 'rate_limited' });
          return;
        }
        await this.addChat({ id: newId(), text: message.text, by: me, at: Date.now() });
        return;
      case 'load':
      case 'enqueue': {
        // Video beklemeden herkese gider; başlık (biliniyorsa hemen, yoksa) sonradan eklenir.
        const item = this.makeItem(message.media, me, message.title ?? null);
        await this.apply(ws, me, { t: message.t, item });
        if (item.title === null) await this.fillTitle(item);
        return;
      }
      default:
        await this.apply(ws, me, message);
    }
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
    if (this.openSockets().length === 0) {
      await this.ctx.storage.deleteAll();
      this.room = initialRoom(Date.now());
      this.chat = [];
    }
  }

  private join(ws: WebSocket, attachment: Attachment, version: number, name: string, avatar: Avatar | undefined): void {
    if (version !== PROTOCOL_VERSION) {
      this.sendTo(ws, { t: 'error', code: 'version' });
      ws.close(4002, 'version');
      return;
    }
    attachment.name = name;
    if (avatar) attachment.avatar = avatar;
    else delete attachment.avatar;
    ws.serializeAttachment(attachment);
    const members = this.members();
    this.sendTo(ws, {
      t: 'welcome',
      you: attachment.id,
      state: this.room.state,
      queue: this.room.queue,
      members,
      chat: this.chat,
    });
    this.broadcast({ t: 'members', members }, ws);
  }

  /** Bir oynatma/sıra komutunu uygular, kaydeder ve değişenleri herkese yollar. */
  private async apply(ws: WebSocket, me: Member, action: RoomAction): Promise<void> {
    const update = applyRoomAction(this.room, action, Date.now());
    if (update.error) this.sendTo(ws, { t: 'error', code: update.error });
    if (update.stateAction === null && !update.queueChanged) return;

    this.room = update.data;
    await this.ctx.storage.put('room', this.room);
    if (update.queueChanged) {
      this.broadcast({
        t: 'queue',
        queue: this.room.queue,
        change: update.change ? { ...update.change, by: me } : null,
      });
    }
    if (update.stateAction !== null) {
      this.broadcast({ t: 'state', state: this.room.state, action: update.stateAction, by: me });
    }
  }

  private makeItem(media: Media, me: Member, givenTitle: string | null): QueueItem {
    return { id: newId(), media, title: givenTitle ?? this.titles.get(titleKey(media)) ?? null, by: me.name };
  }

  /** Başlığı bulur, odadaki öğeye yazar ve herkese bildirir. */
  private async fillTitle(item: QueueItem): Promise<void> {
    const key = titleKey(item.media);
    if (this.titles.has(key)) return;
    const title = await resolveTitle(item.media);
    // Bulunamadıysa hatırlama: geçici bir ağ sorunu olabilir, bir dahaki sefere tekrar denensin.
    if (title === null) return;
    if (this.titles.size > 500) this.titles.clear();
    this.titles.set(key, title);
    // Beklerken oda değişmiş olabilir; güncel duruma uygula.
    const next = setItemTitle(this.room, item.id, title);
    if (next === null) return;
    this.room = next;
    await this.ctx.storage.put('room', this.room);
    this.broadcast({ t: 'title', itemId: item.id, title });
  }

  private async addChat(message: ChatMessage): Promise<void> {
    this.chat = [...this.chat, message].slice(-CHAT_HISTORY);
    await this.ctx.storage.put('chat', this.chat);
    this.broadcast({ t: 'chat', message });
  }

  private async onLeave(leaving: WebSocket): Promise<void> {
    const attachment = leaving.deserializeAttachment() as Attachment | null;
    if (attachment) {
      for (const limiter of [this.commandLimit, this.reactionLimit, this.chatLimit]) limiter.forget(attachment.id);
    }
    this.broadcast({ t: 'members', members: this.members(leaving) }, leaving);
    if (this.openSockets(leaving).length === 0) {
      await this.ctx.storage.setAlarm(Date.now() + EMPTY_ROOM_TTL_MS);
    }
  }

  private openSockets(except?: WebSocket): WebSocket[] {
    return this.ctx.getWebSockets().filter((ws) => ws !== except && ws.readyState === WebSocket.OPEN);
  }

  private members(except?: WebSocket): Member[] {
    const members: Member[] = [];
    for (const ws of this.openSockets(except)) {
      const attachment = ws.deserializeAttachment() as Attachment | null;
      if (attachment?.name) members.push(memberOf({ ...attachment, name: attachment.name }));
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

// ClientMessage'ın tüm türlerinin yukarıda ele alındığını derleyiciye kontrol ettirir.
type _Handled = Exclude<ClientMessage['t'], 'ping' | 'hello' | 'react' | 'chat' | 'load' | 'enqueue' | RoomAction['t']>;
const _exhaustive: [_Handled] extends [never] ? true : never = true;
void _exhaustive;
