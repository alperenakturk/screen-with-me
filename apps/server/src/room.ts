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
import { WAIT_MAX_MS, WaitTracker, type WaitSnapshot } from '@swm/shared/waiting';
import { RateLimiter } from './rate-limit.ts';
import { resolveTitle } from './titles.ts';

const MAX_MEMBERS = 50;
/** Kimse kalmayan oda bu süre sonra silinir. */
const EMPTY_ROOM_TTL_MS = 24 * 60 * 60 * 1000;
/** Sonradan gelenlerin görebileceği son sohbet mesajı sayısı. */
const CHAT_HISTORY = 50;
/**
 * Yönetici bundan uzun süre odada yoksa yöneticilik kalıcı olarak odadaki en eski
 * kişiye geçer (geri gelse de geri almaz). Sayfa yenilemek bu süreden kısa sürer.
 */
const HOST_GRACE_MS = 20_000;
/** Yasaklı listesi en fazla bu kadar kişi tutar (en eskisi düşer). */
const MAX_BANS = 200;
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
  /** Bu bağlantıdan en son mesaj (ping dahil) geldiği an; hayalet bağlantıları ayıklamak için. */
  seen?: number;
}

/**
 * Bu kadar süredir hiç mesaj (ping dahil) gelmeyen bağlantı kopmuş sayılır ve kapatılır.
 * İstemciler 10 sn'de bir ping atar; ama Chrome arka plandaki sekmelerde zamanlayıcıyı
 * dakikada bire kadar yavaşlattığı için süre uzun tutulur.
 */
const STALE_MS = 150_000;
/** Hayalet ayıklama en fazla bu sıklıkla çalışır. */
const PRUNE_EVERY_MS = 20_000;

type Joined = Attachment & { name: string };

/** Bir yasak: yönetici kaldırana kadar (ya da oda silinene kadar) geçerli. */
interface Ban {
  id: string;
  name: string;
  avatar?: Avatar;
}

function memberOf(attachment: Joined): Member {
  return attachment.avatar
    ? { id: attachment.id, name: attachment.name, avatar: attachment.avatar }
    : { id: attachment.id, name: attachment.name };
}

/** Yöneticilik ve atma için kişiyi tanıyan anahtar: kalıcı kimlik varsa o, yoksa bağlantı. */
function keyOf(attachment: Attachment): string {
  return attachment.cid ? `c:${attachment.cid}` : `i:${attachment.id}`;
}

/** Aynı tarayıcıdan bağlı ikinci bir kişinin yasağı: tarayıcı + isim. */
function banKey(attachment: Attachment, name: string | null): string {
  return `${keyOf(attachment)}|n:${name ?? ''}`;
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
  /** Yönetici ne zamandan beri odada yok (varsa). */
  private hostGoneAt: number | null = null;
  /** Atılanlar: kişi anahtarı (keyOf) → yasak. */
  private bans: Record<string, Ban> = {};
  private settings: RoomSettings = { waitForAll: true };
  /** "Herkes hazır": kim takıldı, oda bekliyor mu (depoya da yazılır; bkz. saveWaits). */
  private readonly waits = new WaitTracker();
  private waitTimer: ReturnType<typeof setTimeout> | null = null;
  /** Oda ne zamandan beri boş (24 saat sonra silinir). */
  private emptySince: number | null = null;
  /** Hayalet ayıklamanın en son çalıştığı an (bkz. pruneStale). */
  private lastPrune = 0;

  // Her bağlantı için ayrı kovalar: genel komutlar, emoji, sohbet.
  private readonly commandLimit = new RateLimiter(20, 4);
  private readonly reactionLimit = new RateLimiter(6, 1.5);
  // Sohbet: art arda 8 mesaj, sonra saniyede 1 (daha sıkısı arkadaşlar arasında yazışırken takılıyordu).
  private readonly chatLimit = new RateLimiter(8, 1);

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<RoomData>('room');
      if (saved && Array.isArray(saved.queue)) this.room = saved;
      this.chat = (await ctx.storage.get<ChatMessage[]>('chat')) ?? [];
      this.hostKey = (await ctx.storage.get<string>('host')) ?? null;
      this.hostGoneAt = (await ctx.storage.get<number>('hostGoneAt')) ?? null;
      // Eski biçim (anahtar → bitiş zamanı, 10 dk'lık yasak) artık geçersiz; sadece yeni biçim okunur.
      const bans = (await ctx.storage.get<Record<string, Ban | number>>('bans')) ?? {};
      for (const [key, ban] of Object.entries(bans)) if (typeof ban === 'object') this.bans[key] = ban;
      this.settings = (await ctx.storage.get<RoomSettings>('settings')) ?? { waitForAll: true };
      this.waits.restore(await ctx.storage.get<WaitSnapshot>('waits'));
      this.emptySince = (await ctx.storage.get<number>('emptySince')) ?? null;
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
      await this.setEmptySince(null);
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
    const now = Date.now();
    attachment.seen = now;
    ws.serializeAttachment(attachment);
    if (now - this.lastPrune > PRUNE_EVERY_MS) await this.pruneStale(now);

    if (message.t === 'ping') {
      this.sendTo(ws, { t: 'pong', c: message.c, s: Date.now() });
      return;
    }

    if (message.t === 'hello') {
      // Her hello herkese yayın tetikler; art arda hello ile odayı boğmasınlar.
      if (!this.commandLimit.allow(attachment.id)) {
        this.sendTo(ws, { t: 'error', code: 'rate_limited' });
        return;
      }
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
      case 'unban':
        await this.unban(ws, message.id);
        return;
      case 'ready':
        this.waits.setReady(me.id, message.ready);
        await this.evaluateWait();
        await this.saveWaits();
        return;
      case 'settings':
        if (!this.isHost(ws)) {
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

  /**
   * Tek alarm iki işe bakar (nesne uyusa da kaybolmasın diye setTimeout yerine):
   * 1) "Herkes hazır" beklemesinin süresi dolduysa odayı devam ettir.
   * 2) Oda 24 saattir boşsa depoyu temizle.
   */
  override async alarm(): Promise<void> {
    const now = Date.now();
    // emptySince yoksa: eski sürümün kurduğu 24 saatlik alarm (o zaman da boşsa sil).
    if (this.openSockets().length === 0 && (this.emptySince === null || now - this.emptySince >= EMPTY_ROOM_TTL_MS)) {
      await this.ctx.storage.deleteAll();
      this.room = initialRoom(now);
      this.chat = [];
      this.hostKey = null;
      this.hostGoneAt = null;
      this.bans = {};
      this.settings = { waitForAll: true };
      this.waits.restore({ notReady: [], cooldownUntil: [], waitingFor: [], waitingSince: null });
      this.emptySince = null;
      return;
    }
    if (this.waits.waitingSince !== null && now - this.waits.waitingSince >= WAIT_MAX_MS) await this.evaluateWait();
    await this.scheduleAlarm();
  }

  /**
   * Hayalet bağlantıları ayıklar: uyku/Wi-Fi değişimi gibi durumlarda istemci kopar ama
   * sunucu bağlantıyı açık sanmaya devam edebilir. O kişi odada görünür, kendisi ise kimseyi
   * görmez ve hareketleri gitmez. Uzun süredir sessiz olanları kapatıp listeden düşürürüz.
   */
  private async pruneStale(now: number): Promise<void> {
    this.lastPrune = now;
    for (const ws of this.openSockets()) {
      const a = ws.deserializeAttachment() as Attachment | null;
      if (!a?.name || a.seen === undefined || now - a.seen <= STALE_MS) continue;
      try {
        ws.close(4004, 'stale');
      } catch {
        // Zaten kapanmış olabilir.
      }
      await this.onLeave(ws);
    }
  }

  /** Bir sonraki alarmı en yakın işe göre kurar (yoksa kaldırır). */
  private async scheduleAlarm(): Promise<void> {
    const times: number[] = [];
    if (this.waits.waitingSince !== null) times.push(this.waits.waitingSince + WAIT_MAX_MS + 50);
    if (this.emptySince !== null) times.push(this.emptySince + EMPTY_ROOM_TTL_MS);
    if (times.length) await this.ctx.storage.setAlarm(Math.min(...times));
    else await this.ctx.storage.deleteAlarm();
  }

  /** Bekleme durumunu depoya yazar (nesne uyuyup uyanınca kaldığı yerden devam). */
  private async saveWaits(): Promise<void> {
    await this.ctx.storage.put('waits', this.waits.snapshot());
  }

  private async setEmptySince(at: number | null): Promise<void> {
    if (this.emptySince === at) return;
    this.emptySince = at;
    if (at === null) await this.ctx.storage.delete('emptySince');
    else await this.ctx.storage.put('emptySince', at);
    await this.scheduleAlarm();
  }

  private async join(ws: WebSocket, attachment: Attachment, hello: Extract<ClientMessage, { t: 'hello' }>): Promise<void> {
    if (hello.v !== PROTOCOL_VERSION) {
      this.sendTo(ws, { t: 'error', code: 'version' });
      ws.close(4002, 'version');
      return;
    }
    if (hello.cid) attachment.cid = hello.cid;
    if (this.bans[keyOf(attachment)] || this.bans[banKey(attachment, hello.name)]) {
      this.sendTo(ws, { t: 'error', code: 'kicked' });
      ws.close(4003, 'kicked');
      return;
    }

    attachment.name = hello.name;
    attachment.joinedAt ??= Date.now();
    if (hello.avatar) attachment.avatar = hello.avatar;
    else delete attachment.avatar;
    ws.serializeAttachment(attachment);

    // Yeni gelen, aslında kopmuş birini odada görmesin.
    await this.pruneStale(Date.now());
    await this.settleHost(ws, attachment);
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
    this.sendBans();
  }

  /**
   * Biri katılırken yöneticiliği netleştirir: yönetici süresinde döndüyse yönetici
   * kalır; HOST_GRACE_MS'den uzun yoksa yöneticilik kalıcı olarak odadaki en eski
   * kişiye (katılan hariç) geçer.
   */
  private async settleHost(ws: WebSocket, joining: Attachment): Promise<void> {
    if (this.hostKey === null || this.hostGoneAt === null) return;
    const returned = keyOf(joining) === this.hostKey;
    if (Date.now() - this.hostGoneAt < HOST_GRACE_MS) {
      if (returned) await this.setHostGone(null);
      return;
    }
    let oldest: Joined | null = null;
    for (const a of this.joined(ws)) if (!oldest || (a.joinedAt ?? 0) < (oldest.joinedAt ?? 0)) oldest = a;
    if (oldest) {
      this.hostKey = keyOf(oldest);
      await this.ctx.storage.put('host', this.hostKey);
    }
    // Odada kimse yoksa ve dönen asıl yöneticiyse yönetici kalır.
    if (oldest || returned) await this.setHostGone(null);
  }

  private async setHostGone(at: number | null): Promise<void> {
    this.hostGoneAt = at;
    if (at === null) await this.ctx.storage.delete('hostGoneAt');
    else await this.ctx.storage.put('hostGoneAt', at);
  }

  private async kick(ws: WebSocket, me: Member, targetId: string): Promise<void> {
    if (!this.isHost(ws)) {
      this.sendTo(ws, { t: 'error', code: 'not_host' });
      return;
    }
    const target = this.openSockets().find((s) => (s.deserializeAttachment() as Attachment | null)?.id === targetId);
    if (!target || target === ws) return;
    const attachment = target.deserializeAttachment() as Attachment;
    if (!attachment.name) return;

    // Aynı tarayıcıdan (aynı kimlik) bağlı biri: tarayıcıyı yasaklarsak yönetici de
    // giremez. Farklı isimliyse (aynı bilgisayardan ikinci kişi / test) sadece o isim
    // yasaklanır; aynı isimliyse yöneticinin kendi diğer sekmesidir, yasaksız kapatılır.
    const sameBrowser = keyOf(attachment) === keyOf(ws.deserializeAttachment() as Attachment);
    const sameName = sameBrowser && attachment.name === me.name;

    if (!sameName) {
      // Kalıcı yasak: yönetici listeden kaldırana kadar geri giremez.
      const keys = Object.keys(this.bans);
      if (keys.length >= MAX_BANS) delete this.bans[keys[0]!];
      const ban: Ban = { id: newId(), name: attachment.name };
      if (attachment.avatar) ban.avatar = attachment.avatar;
      this.bans[sameBrowser ? banKey(attachment, attachment.name) : keyOf(attachment)] = ban;
      await this.ctx.storage.put('bans', this.bans);
    }

    this.sendTo(target, { t: 'error', code: 'kicked' });
    try {
      target.close(4003, 'kicked');
    } catch {
      // Zaten kapanmış olabilir.
    }
    this.broadcast(this.membersMessage(target), target);
    if (sameName) return;
    this.broadcast({ t: 'kicked', who: memberOf({ ...attachment, name: attachment.name }), by: me }, target);
    // Aynı kişinin başka sekmedeki bağlantıları da (ör. site + eklenti) çıkarılır.
    // Aynı tarayıcıdaki çıkarmada sadece aynı isimli bağlantılar (yöneticiye dokunma).
    for (const other of this.openSockets(target)) {
      const a = other.deserializeAttachment() as Attachment | null;
      if (a && other !== ws && keyOf(a) === keyOf(attachment) && (!sameBrowser || a.name === attachment.name)) {
        this.sendTo(other, { t: 'error', code: 'kicked' });
        try {
          other.close(4003, 'kicked');
        } catch {
          // Zaten kapanmış olabilir.
        }
      }
    }
    this.sendBans();
  }

  private async unban(ws: WebSocket, banId: string): Promise<void> {
    if (!this.isHost(ws)) {
      this.sendTo(ws, { t: 'error', code: 'not_host' });
      return;
    }
    const entry = Object.entries(this.bans).find(([, ban]) => ban.id === banId);
    if (!entry) return;
    delete this.bans[entry[0]];
    await this.ctx.storage.put('bans', this.bans);
    this.sendBans();
  }

  /** Yasaklılar listesini yöneticiye (onun bütün bağlantılarına) yollar. */
  private sendBans(except?: WebSocket): void {
    const hostId = this.hostId(except);
    const people = this.joined(except);
    const host = people.find((a) => a.id === hostId);
    if (!host) return;
    const message: ServerMessage = { t: 'bans', bans: Object.values(this.bans) };
    for (const ws of this.openSockets(except)) {
      const a = ws.deserializeAttachment() as Attachment | null;
      if (a?.name && keyOf(a) === keyOf(host)) this.sendTo(ws, message);
    }
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
    if (decision.kind === 'start' || decision.kind === 'resume') {
      await this.saveWaits();
      await this.scheduleAlarm();
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
      await this.saveWaits();
      await this.scheduleAlarm();
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
      // Yöneticinin son bağlantısı gittiyse saymaya başla (bkz. settleHost).
      const key = keyOf(attachment);
      if (attachment.name && key === this.hostKey && this.hostGoneAt === null && !this.joined(leaving).some((a) => keyOf(a) === key)) {
        await this.setHostGone(Date.now());
      }
    }
    this.broadcast(this.membersMessage(leaving), leaving);
    // Yönetici çıktıysa geçici yönetici listeyi alsın.
    this.sendBans(leaving);
    // Beklenen kişi çıktıysa oda beklemeyi bıraksın.
    if (this.waits.waitingSince !== null) await this.evaluateWait();
    await this.saveWaits();
    if (this.openSockets(leaving).length === 0) await this.setEmptySince(Date.now());
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
    // Yönetici birden çok sekmeyle bağlıysa ilk bağlanan sekme 👑 gösterilir (yetki hepsinde: isHost).
    let host: Joined | null = null;
    for (const a of people) if (keyOf(a) === this.hostKey && (!host || (a.joinedAt ?? 0) < (host.joinedAt ?? 0))) host = a;
    if (host) return host.id;
    let oldest: Joined | null = null;
    for (const a of people) if (!oldest || (a.joinedAt ?? 0) < (oldest.joinedAt ?? 0)) oldest = a;
    return oldest?.id ?? null;
  }

  /**
   * Bu bağlantı yöneticinin mi? Kişiye göre bakılır: yönetici aynı tarayıcıdan iki
   * sekmeyle (ör. site + eklenti) bağlıysa ikisi de yöneticidir.
   */
  private isHost(ws: WebSocket): boolean {
    const hostId = this.hostId();
    const host = this.joined().find((a) => a.id === hostId);
    const me = ws.deserializeAttachment() as Attachment | null;
    return !!host && !!me && keyOf(me) === keyOf(host);
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
  'ping' | 'hello' | 'react' | 'chat' | 'rename' | 'kick' | 'unban' | 'ready' | 'settings' | 'load' | 'enqueue' | RoomAction['t']
>;
const _exhaustive: [_Handled] extends [never] ? true : never = true;
void _exhaustive;
