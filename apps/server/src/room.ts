import { DurableObject } from 'cloudflare:workers';
import {
  PROTOCOL_VERSION,
  SYSTEM_MEMBER_ID,
  expectedPosition,
  parseClientMessage,
  type Avatar,
  type RoomSettings,
  type ChatMessage,
  type ClientMessage,
  type Media,
  type Member,
  type QueueItem,
  type ServerMessage,
} from '@swm/shared/protocol';
import { applyRoomAction, initialRoom, setItemTitle, type RoomAction, type RoomData } from '@swm/shared/room-logic';
import { WAIT_MAX_MS, WaitTracker } from '@swm/shared/waiting';
import { RateLimiter } from './rate-limit.ts';
import { resolveTitle } from './titles.ts';

const MAX_MEMBERS = 50;
/** Kimse kalmayan oda bu süre sonra silinir. */
const EMPTY_ROOM_TTL_MS = 24 * 60 * 60 * 1000;
/** Sonradan gelenlerin görebileceği son sohbet mesajı sayısı. */
const CHAT_HISTORY = 50;
/** Odadan çıkarılan kişi bu süre boyunca geri giremez. */
const KICK_BAN_MS = 10 * 60 * 1000;
/** Oda adına yapılan hareketler (otomatik bekleme) bu "kişi" adına duyurulur. */
const SYSTEM: Member = { id: SYSTEM_MEMBER_ID, name: 'ScreenWithMe' };

/** Her WebSocket bağlantısına iliştirilen bilgi. Sunucu uykuya geçse bile korunur. */
interface Attachment {
  id: string;
  name: string | null;
  avatar?: Avatar;
  /** Tarayıcının kalıcı kimliği (varsa). */
  cid?: string;
  joinedAt?: number;
}

type Joined = Attachment & { name: string };

function memberOf(attachment: Joined): Member {
  return attachment.avatar
    ? { id: attachment.id, name: attachment.name, avatar: attachment.avatar }
    : { id: attachment.id, name: attachment.name };
}

/** Yöneticilik ve atma için kişiyi tanıyan anahtar: kalıcı kimlik varsa o, yoksa bağlantı. */
function keyOf(attachment: Attachment): string {
  return attachment.cid ? `c:${attachment.cid}` : `i:${attachment.id}`;
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
 *
 * Oda yöneticisi: odaya ilk giren kişi. Kalıcı kimliğiyle tanındığı için
 * sayfayı yenilese de yönetici kalır. Odada değilken, odadaki en eski kişi
 * geçici olarak yönetici sayılır; asıl yönetici dönünce yetki ona geri geçer.
 */
export class Room extends DurableObject<Env> {
  private room: RoomData = initialRoom(Date.now());
  private chat: ChatMessage[] = [];
  private titles = new Map<string, string>();
  private hostKey: string | null = null;
  /** Atılanlar: anahtar → ne zamana kadar giremez (ms). */
  private bans: Record<string, number> = {};
  private settings: RoomSettings = { waitForAll: true };
  /** "Herkes hazır": kim takıldı, oda bekliyor mu (bellekte; uyku sırasında zaten kimse oynatmıyor). */
  private readonly waits = new WaitTracker();
  private waitTimer: ReturnType<typeof setTimeout> | null = null;

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
      this.hostKey = (await ctx.storage.get<string>('host')) ?? null;
      this.bans = (await ctx.storage.get<Record<string, number>>('bans')) ?? {};
      this.settings = (await ctx.storage.get<RoomSettings>('settings')) ?? { waitForAll: true };
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
      await this.join(ws, attachment, message);
      return;
    }

    if (attachment.name === null) {
      this.sendTo(ws, { t: 'error', code: 'not_joined' });
      return;
    }
    const joined: Joined = { ...attachment, name: attachment.name };
    const me = memberOf(joined);

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
      case 'rename':
        attachment.name = message.name;
        if (message.avatar) attachment.avatar = message.avatar;
        ws.serializeAttachment(attachment);
        this.broadcast(this.membersMessage());
        return;
      case 'kick':
        await this.kick(ws, me, message.id);
        return;
      case 'ready':
        this.waits.setReady(me.id, message.ready);
        await this.evaluateWait();
        return;
      case 'settings':
        if (this.hostId() !== me.id) {
          this.sendTo(ws, { t: 'error', code: 'not_host' });
          return;
        }
        this.settings = { waitForAll: message.waitForAll };
        await this.ctx.storage.put('settings', this.settings);
        this.broadcast({ t: 'settings', settings: this.settings });
        await this.evaluateWait();
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
      this.hostKey = null;
      this.bans = {};
      this.settings = { waitForAll: true };
    }
  }

  private async join(ws: WebSocket, attachment: Attachment, hello: Extract<ClientMessage, { t: 'hello' }>): Promise<void> {
    if (hello.v !== PROTOCOL_VERSION) {
      this.sendTo(ws, { t: 'error', code: 'version' });
      ws.close(4002, 'version');
      return;
    }
    if (hello.cid) attachment.cid = hello.cid;
    const until = this.bans[keyOf(attachment)];
    if (until && until > Date.now()) {
      this.sendTo(ws, { t: 'error', code: 'kicked' });
      ws.close(4003, 'kicked');
      return;
    }

    attachment.name = hello.name;
    attachment.joinedAt ??= Date.now();
    if (hello.avatar) attachment.avatar = hello.avatar;
    else delete attachment.avatar;
    ws.serializeAttachment(attachment);

    // Odaya ilk giren yönetici olur.
    if (this.hostKey === null) {
      this.hostKey = keyOf(attachment);
      await this.ctx.storage.put('host', this.hostKey);
    }

    const { members, hostId } = this.membersMessage();
    this.sendTo(ws, {
      t: 'welcome',
      you: attachment.id,
      state: this.room.state,
      queue: this.room.queue,
      members,
      hostId,
      chat: this.chat,
      settings: this.settings,
      waiting: this.waits.waiting,
    });
    this.broadcast({ t: 'members', members, hostId }, ws);
  }

  private async kick(ws: WebSocket, me: Member, targetId: string): Promise<void> {
    if (this.hostId() !== me.id) {
      this.sendTo(ws, { t: 'error', code: 'not_host' });
      return;
    }
    const target = this.openSockets().find((s) => (s.deserializeAttachment() as Attachment | null)?.id === targetId);
    if (!target || target === ws) return;
    const attachment = target.deserializeAttachment() as Attachment;
    if (!attachment.name) return;

    // Süresi geçmiş yasakları temizle, yenisini ekle.
    const now = Date.now();
    for (const [key, until] of Object.entries(this.bans)) if (until <= now) delete this.bans[key];
    this.bans[keyOf(attachment)] = now + KICK_BAN_MS;
    await this.ctx.storage.put('bans', this.bans);

    this.sendTo(target, { t: 'error', code: 'kicked' });
    try {
      target.close(4003, 'kicked');
    } catch {
      // Zaten kapanmış olabilir.
    }
    this.broadcast({ t: 'kicked', who: memberOf({ ...attachment, name: attachment.name }), by: me }, target);
    this.broadcast(this.membersMessage(target), target);
  }

  /**
   * "Herkes hazır": takılan biri varsa odayı durdurur, herkes hazır olunca ya da
   * süre dolunca devam ettirir (kararlar WaitTracker'da).
   */
  private async evaluateWait(): Promise<void> {
    const now = Date.now();
    const state = this.room.state;
    const present = new Set(this.joined().map((a) => a.id));
    const decision = this.waits.decide(now, this.settings.waitForAll, !state.paused && state.item !== null, present);

    if (decision.kind === 'start') {
      this.room = { ...this.room, state: { ...state, paused: true, position: expectedPosition(state, now), updatedAt: now } };
      await this.ctx.storage.put('room', this.room);
      this.broadcast({ t: 'state', state: this.room.state, action: 'pause', by: SYSTEM });
      this.broadcast({ t: 'waiting', ids: decision.ids });
      // Süre dolunca beklenenler olmadan devam etmek için tekrar bak.
      if (this.waitTimer !== null) clearTimeout(this.waitTimer);
      this.waitTimer = setTimeout(() => void this.evaluateWait(), WAIT_MAX_MS + 50);
    } else if (decision.kind === 'update') {
      this.broadcast({ t: 'waiting', ids: decision.ids });
    } else if (decision.kind === 'resume') {
      if (this.waitTimer !== null) clearTimeout(this.waitTimer);
      this.waitTimer = null;
      if (state.paused && state.item !== null) {
        this.room = { ...this.room, state: { ...state, paused: false, updatedAt: now } };
        await this.ctx.storage.put('room', this.room);
        this.broadcast({ t: 'state', state: this.room.state, action: 'play', by: SYSTEM });
      }
      this.broadcast({ t: 'waiting', ids: [] });
    }
  }

  /** Bir oynatma/sıra komutunu uygular, kaydeder ve değişenleri herkese yollar. */
  private async apply(ws: WebSocket, me: Member, action: RoomAction): Promise<void> {
    const update = applyRoomAction(this.room, action, Date.now());
    if (update.error) this.sendTo(ws, { t: 'error', code: update.error });
    if (update.stateAction === null && !update.queueChanged) return;

    // Biri elle oynattı/durdurdu/sardı: otomatik bekleme iptal, o ne dediyse o.
    if (update.stateAction !== null && this.waits.cancel()) {
      if (this.waitTimer !== null) clearTimeout(this.waitTimer);
      this.waitTimer = null;
      this.broadcast({ t: 'waiting', ids: [] });
    }

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
      this.waits.remove(attachment.id);
    }
    this.broadcast(this.membersMessage(leaving), leaving);
    // Beklenen kişi çıktıysa oda beklemeyi bıraksın.
    if (this.waits.waitingSince !== null) await this.evaluateWait();
    if (this.openSockets(leaving).length === 0) {
      await this.ctx.storage.setAlarm(Date.now() + EMPTY_ROOM_TTL_MS);
    }
  }

  private openSockets(except?: WebSocket): WebSocket[] {
    return this.ctx.getWebSockets().filter((ws) => ws !== except && ws.readyState === WebSocket.OPEN);
  }

  private joined(except?: WebSocket): Joined[] {
    const list: Joined[] = [];
    for (const ws of this.openSockets(except)) {
      const attachment = ws.deserializeAttachment() as Attachment | null;
      if (attachment?.name) list.push({ ...attachment, name: attachment.name });
    }
    return list;
  }

  /** Şu anki yöneticinin üye ID'si: asıl yönetici odadaysa o, değilse odadaki en eski kişi. */
  private hostId(except?: WebSocket): string | null {
    const people = this.joined(except);
    const host = people.find((a) => keyOf(a) === this.hostKey);
    if (host) return host.id;
    let oldest: Joined | null = null;
    for (const a of people) if (!oldest || (a.joinedAt ?? 0) < (oldest.joinedAt ?? 0)) oldest = a;
    return oldest?.id ?? null;
  }

  private membersMessage(except?: WebSocket): Extract<ServerMessage, { t: 'members' }> {
    return { t: 'members', members: this.joined(except).map(memberOf), hostId: this.hostId(except) };
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
type _Handled = Exclude<
  ClientMessage['t'],
  'ping' | 'hello' | 'react' | 'chat' | 'rename' | 'kick' | 'ready' | 'settings' | 'load' | 'enqueue' | RoomAction['t']
>;
const _exhaustive: [_Handled] extends [never] ? true : never = true;
void _exhaustive;
