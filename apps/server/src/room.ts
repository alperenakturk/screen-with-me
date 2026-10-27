import { DurableObject } from 'cloudflare:workers';
import {
  MAX_PINS,
  MAX_STICKERS,
  PROTOCOL_VERSION,
  SYSTEM_MEMBER_ID,
  CLIENT_ID,
  YOUTUBE_MAX_RATE,
  expectedPosition,
  parseClientMessage,
  stickerId,
  type Avatar,
  type ClientKind,
  type RoomSettings,
  type ChatMessage,
  type ClientMessage,
  type Media,
  type Member,
  type Pin,
  type PinList,
  type QueueItem,
  type ServerMessage,
  type RtcResult,
  VOICE_MAX,
  VOICE_MAX_P2P,
  CAM_MAX,
  LIVE_MAX_VIEWERS,
  type LiveKind,
} from '@swm/shared/protocol';
import { applyRoomAction, initialRoom, setItemTitle, type RoomAction, type RoomData } from '@swm/shared/room-logic';
import { WAIT_MAX_MS, WaitTracker, type WaitSnapshot } from '@swm/shared/waiting';
import { RECAP_MAX_AGE_MS, RECAPS_KEEP, RECAPS_KEEP_SAVED, StatsTracker, type Recap, type StatsData } from '@swm/shared/recap';
import { RateLimiter } from './rate-limit.ts';
import { closeTracks, newSession, publish, pull, realtimeConfig, renegotiate } from './realtime.ts';
import { resolveTitle } from './titles.ts';

const MAX_MEMBERS = 50;
/** Kimse kalmayan oda bu süre sonra silinir. */
const EMPTY_ROOM_TTL_MS = 24 * 60 * 60 * 1000;
/** Kaydedilmiş oda boşken bu kadar saklanır. */
const SAVED_ROOM_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Kayıtlı odada en fazla kaç videonun kaldığı yer hatırlanır. */
const MAX_HISTORY = 30;
/** Shorts'ta ↑ (bir öncekine dön) için hatırlanan son oynayanlar. */
const MAX_PLAYED = 30;
/** Boş oda oynuyorken bundan uzun boş kaldıysa, dönüşte kaldığı yerde durmuş olarak açılır. */
const FREEZE_AFTER_MS = 60_000;

/** Kayıtlı odada bir videonun kaldığı yer ve pinleri. */
interface HistoryEntry {
  position: number;
  pins: Array<Pin & { owner: string }>;
  at: number;
}
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
  /** 'ext': eklentiyle film sayfasında. */
  client?: ClientKind;
  /** Sesli sohbette: mikrofon açık mı, yayınladığı akış ve Cloudflare oturumu (oturum istemcilere gitmez). */
  voice?: { mic: boolean; track?: string; session?: string; cam?: boolean };
  /** Film sayfasında reklam oynuyor (eklenti bildirir): oda bu kişiyi beklemez. */
  ad?: boolean;
  /** Yayın yapıyor (odada tek yayın) / yayını izliyor. */
  live?: LiveKind;
  watching?: boolean;
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
  const member: Member = { id: attachment.id, name: attachment.name };
  if (attachment.avatar) member.avatar = attachment.avatar;
  if (attachment.client === 'ext') member.client = 'ext';
  // Cloudflare oturumu gizli kalır; diğerleri sadece akışın adını ve mikrofon durumunu görür.
  if (attachment.voice) {
    member.voice = { mic: attachment.voice.mic, ...(attachment.voice.track ? { track: attachment.voice.track } : {}), ...(attachment.voice.cam ? { cam: true } : {}) };
  }
  if (attachment.ad) member.ad = true;
  if (attachment.live) member.live = attachment.live;
  if (attachment.watching) member.watching = true;
  return member;
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
  if (media.kind === 'test') return 'test';
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
  /**
   * Açık videonun pinlenmiş anları; video değişince sıfırlanır. `owner` pinleyenin kalıcı
   * anahtarı (kendi pinini silebilsin); istemcilere hiç gönderilmez.
   */
  private pins: { itemId: string | null; list: Array<Pin & { owner: string }> } = { itemId: null, list: [] };
  private chat: ChatMessage[] = [];
  /**
   * Odanın özel emojileri (kimlik → data: adresi), eklenme sırasıyla. Her biri depoda ayrı
   * anahtarda (`sticker:<id>`; tek değer en fazla 128 KB), sıra `stickers` listesinde.
   */
  private stickers = new Map<string, string>();
  /** Özel emojiyi ekleyenin kalıcı anahtarı (kaldırabilsin diye; istemcilere gitmez). */
  private stickerOwners: Record<string, string> = {};
  /** Sıradaki her öğeye oy verenlerin kalıcı anahtarları (istemcilere gitmez; sadece sayı gider). */
  private voters: Record<string, string[]> = {};
  private titles = new Map<string, string>();
  /** Oturum özeti sayaçları (son özetten beri) ve önceki özetler. */
  private stats = new StatsTracker();
  private recaps: Recap[] = [];
  /** Kayıtlı oda: video (titleKey) → kaldığı yer + pinler. */
  private history: Record<string, HistoryEntry> = {};
  /** Daha önce oynayanlar (en yenisi sonda): "bir önceki" bunlardan gelir. */
  private played: QueueItem[] = [];
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
  // Emojiler art arda atılabilir (abanma serbest); bu sadece kötüye kullanımı keser. Yönetici isterse
  // settings.reactionGap ile kişi başı aralık koyar (lastReaction).
  private readonly reactionLimit = new RateLimiter(12, 5);
  /** Yöneticinin emoji aralığı için kişinin (tarayıcının) son geçen emojisi; sadece aralık açıkken yazılır. */
  private readonly lastReaction = new Map<string, number>();
  /** "Odaya döndüm" haberi: kişi başı en fazla yarım dakikada bir (filmdekileri kart yağmuruna tutmasın). */
  private readonly homeLimit = new RateLimiter(1, 1 / 30);
  /** Özel emoji ekleme: birkaç tane hemen, sonra 20 sn'de bir (büyük veri). */
  private readonly stickerLimit = new RateLimiter(4, 0.05);
  // Sohbet: art arda 8 mesaj, sonra saniyede 1 (daha sıkısı arkadaşlar arasında yazışırken takılıyordu).
  private readonly chatLimit = new RateLimiter(8, 1);
  /** Sesli sohbetin bağlantı işleri (her yeni dinlenen kişi için birkaç istek). */
  private readonly rtcLimit = new RateLimiter(30, 3);
  /** Eşler arası seste bağlantı mesajları (her eş için teklif/cevap + birkaç ağ adayı). */
  private readonly signalLimit = new RateLimiter(80, 10);

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<RoomData>('room');
      if (saved && Array.isArray(saved.queue)) this.room = saved;
      this.chat = (await ctx.storage.get<ChatMessage[]>('chat')) ?? [];
      this.voters = (await ctx.storage.get<Record<string, string[]>>('voters')) ?? {};
      const stickerIds = (await ctx.storage.get<string[]>('stickers')) ?? [];
      this.stickerOwners = (await ctx.storage.get<Record<string, string>>('stickerOwners')) ?? {};
      const stickerData = await ctx.storage.get<string>(stickerIds.map((id) => `sticker:${id}`));
      for (const id of stickerIds) {
        const data = stickerData.get(`sticker:${id}`);
        if (data) this.stickers.set(id, data);
      }
      this.hostKey = (await ctx.storage.get<string>('host')) ?? null;
      this.hostGoneAt = (await ctx.storage.get<number>('hostGoneAt')) ?? null;
      // Eski biçim (anahtar → bitiş zamanı, 10 dk'lık yasak) artık geçersiz; sadece yeni biçim okunur.
      const bans = (await ctx.storage.get<Record<string, Ban | number>>('bans')) ?? {};
      for (const [key, ban] of Object.entries(bans)) if (typeof ban === 'object') this.bans[key] = ban;
      this.settings = (await ctx.storage.get<RoomSettings>('settings')) ?? { waitForAll: true };
      this.waits.restore(await ctx.storage.get<WaitSnapshot>('waits'));
      this.emptySince = (await ctx.storage.get<number>('emptySince')) ?? null;
      const pins = await ctx.storage.get<typeof this.pins>('pins');
      if (pins && Array.isArray(pins.list)) this.pins = pins;
      this.history = (await ctx.storage.get<Record<string, HistoryEntry>>('history')) ?? {};
      this.stats = new StatsTracker(await ctx.storage.get<StatsData>('stats'));
      this.recaps = (await ctx.storage.get<Recap[]>('recaps')) ?? [];
      this.played = (await ctx.storage.get<QueueItem[]>('played')) ?? [];
    });
  }

  override async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    // Ana sayfadaki kayıtlı odalar listesi: oda hâlâ kayıtlı mı, adı, içeride kaç kişi var.
    if (path.endsWith('/info')) {
      return Response.json({ saved: this.settings.saved === true, name: this.settings.name ?? null, online: this.joined().length });
    }
    // Yönetici odayı ana sayfadaki listeden çıkardı: kayıt kalkar (boşsa 24 saat sonra silinir).
    if (path.endsWith('/unsave') && request.method === 'POST') return this.unsaveFromHome(request);
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
      await this.freezeIfLongEmpty();
      this.statsTick(true);
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

    // Emoji ve "odaya döndüm" kendi sınırlarıyla: emoji yağmuru kişinin oynat/durdur/sar komutlarını tüketmesin.
    const cheap = message.t === 'react' || message.t === 'home' || message.t === 'rtc' || message.t === 'signal';
    if (!cheap && !this.commandLimit.allow(me.id)) {
      this.sendTo(ws, { t: 'error', code: 'rate_limited' });
      return;
    }

    // Yönetici modları: oynatma ya da sıra yöneticiye kilitliyse başkasının isteği reddedilir
    // (istemci "not_host" alınca kendi oynatıcısını odanın durumuna geri döndürür).
    if (!this.isHost(ws)) {
      const playback = ['play', 'pause', 'seek', 'rate', 'load', 'jump', 'prev'].includes(message.t);
      const queueEdit = ['enqueue', 'dequeue', 'move'].includes(message.t);
      if ((playback && this.settings.hostOnly) || (queueEdit && this.settings.lockQueue)) {
        this.sendTo(ws, { t: 'error', code: 'not_host' });
        return;
      }
    }

    switch (message.t) {
      case 'vote':
        await this.vote(keyOf(attachment), message.id, message.up);
        return;
      case 'voice':
        await this.setVoice(ws, attachment, message.on, message.mic, message.cam);
        return;
      case 'live':
        this.setLive(ws, attachment, message.on, message.kind);
        return;
      case 'live-watch':
        this.setWatch(ws, attachment, message.on);
        return;
      case 'live-signal': {
        // Yayın bağlantısı sadece yayıncı ile onu izleyen arasında (IP'ler sadece yayına katılanlara görünür).
        if (!this.signalLimit.allow(me.id)) return;
        const target = this.openSockets().find((c) => (c.deserializeAttachment() as Attachment | null)?.id === message.to);
        const other = target?.deserializeAttachment() as Attachment | null;
        const paired = (attachment.live && other?.watching) || (attachment.watching && other?.live);
        if (target && paired) this.sendTo(target, { t: 'live-signal', from: me.id, data: message.data });
        return;
      }
      case 'signal': {
        // Eşler arası ses: bağlantı mesajını sadece ikisi de seste ise karşıya ilet (sunucu içeriğe bakmaz,
        // sadece doğrulanmış kopyasını taşır). Kim seste değilse IP adresini kimse öğrenemez.
        if (!this.signalLimit.allow(me.id) || !attachment.voice) return;
        const target = this.openSockets().find((c) => (c.deserializeAttachment() as Attachment | null)?.id === message.to);
        const other = target?.deserializeAttachment() as Attachment | null;
        if (target && other?.voice) this.sendTo(target, { t: 'signal', from: me.id, data: message.data });
        return;
      }
      case 'rtc':
        if (!this.rtcLimit.allow(me.id)) {
          this.sendTo(ws, { t: 'rtc', id: message.id, ok: false, error: 'rate_limited' });
          return;
        }
        await this.rtc(ws, message);
        return;
      case 'home':
        // Sadece haber: filmdekilere "sen de dön" diye sorulur (sık basılıp kimseyi rahatsız etmesin).
        if (!this.homeLimit.allow(keyOf(attachment))) return;
        this.broadcast({ t: 'home', by: me }, ws);
        return;
      case 'react': {
        // Yönetici emojileri kapattıysa (yönetici dahil) kimse atamaz. Sınırlar kişi (tarayıcı) başına:
        // aynı kişinin ikinci sekmesi aralığı aşamasın.
        const who = keyOf(attachment);
        if (this.settings.noReactions || !this.reactionLimit.allow(who)) return;
        // Yöneticinin koyduğu aralık (küçük pay: ağ gecikmesi iki basışı yaklaştırabilir).
        const gap = (this.settings.reactionGap ?? 0) * 1000;
        if (gap > 0) {
          const now = Date.now();
          if (now - (this.lastReaction.get(who) ?? 0) < gap - 150) return;
          this.lastReaction.set(who, now);
        }
        if (message.sticker !== undefined) {
          if (!this.stickers.has(message.sticker)) return;
          this.broadcast({ t: 'reaction', sticker: message.sticker, by: me });
        } else {
          this.broadcast({ t: 'reaction', emoji: message.emoji, by: me });
        }
        this.stats.reaction(who, me, message.emoji ?? null);
        await this.saveStats();
        return;
      }
      case 'sticker-add': {
        const id = await stickerId(message.data);
        if (this.stickers.has(id)) return;
        if (!this.stickerLimit.allow(keyOf(attachment))) {
          this.sendTo(ws, { t: 'error', code: 'rate_limited' });
          return;
        }
        // Dolunca en eski özel emoji gider.
        while (this.stickers.size >= MAX_STICKERS) {
          const oldest = this.stickers.keys().next().value as string;
          this.stickers.delete(oldest);
          delete this.stickerOwners[oldest];
          await this.ctx.storage.delete(`sticker:${oldest}`);
          this.broadcast({ t: 'sticker-removed', id: oldest });
        }
        this.stickers.set(id, message.data);
        this.stickerOwners[id] = keyOf(attachment);
        await this.ctx.storage.put({ [`sticker:${id}`]: message.data, stickers: [...this.stickers.keys()], stickerOwners: this.stickerOwners });
        this.broadcast({ t: 'sticker', sticker: { id, data: message.data } });
        return;
      }
      case 'sticker-remove': {
        if (!this.stickers.has(message.id)) return;
        if (this.stickerOwners[message.id] !== keyOf(attachment) && !this.isHost(ws)) {
          this.sendTo(ws, { t: 'error', code: 'not_host' });
          return;
        }
        this.stickers.delete(message.id);
        delete this.stickerOwners[message.id];
        await this.ctx.storage.delete(`sticker:${message.id}`);
        await this.ctx.storage.put({ stickers: [...this.stickers.keys()], stickerOwners: this.stickerOwners });
        this.broadcast({ t: 'sticker-removed', id: message.id });
        return;
      }
      case 'pin': {
        const item = this.room.state.item;
        if (!item) return;
        if (this.pins.itemId !== item.id) this.pins = { itemId: item.id, list: [] };
        if (this.pins.list.length >= MAX_PINS) {
          this.sendTo(ws, { t: 'error', code: 'rate_limited' });
          return;
        }
        // Anı sunucu kendi oynatma durumundan hesaplar (istemciye güvenmez).
        const at = Math.round(expectedPosition(this.room.state, Date.now()) * 10) / 10;
        const pin: Pin & { owner: string } = { id: newId(), at, by: { id: me.id, name: me.name }, owner: keyOf(attachment) };
        if (me.avatar) pin.by.avatar = me.avatar;
        if (message.note) pin.note = message.note;
        this.pins.list.push(pin);
        this.stats.pin(keyOf(attachment), me);
        this.pins.list.sort((x, y) => x.at - y.at);
        await this.savePins();
        return;
      }
      case 'unpin': {
        const pin = this.pins.list.find((p) => p.id === message.id);
        if (!pin) return;
        if (pin.owner !== keyOf(attachment) && !this.isHost(ws)) {
          this.sendTo(ws, { t: 'error', code: 'not_host' });
          return;
        }
        this.pins.list = this.pins.list.filter((p) => p !== pin);
        await this.savePins();
        return;
      }
      case 'recap':
      case 'recap-save': {
        if (!this.commandLimit.allow(me.id)) return;
        this.statsTick();
        if (this.stats.isEmpty()) {
          this.sendTo(ws, { t: 'error', code: 'recap_empty' });
          return;
        }
        const now = Date.now();
        // Bugünün özeti: oturumun başından şimdiye, sayaç sıfırlanmaz; sadece isteyene gider.
        const recap = this.stats.recap(now, newId());
        if (message.t === 'recap') {
          this.sendTo(ws, { t: 'recap', recap, by: me });
          return;
        }
        // Kaydet: aynı oturumun önceki kaydı yenisiyle değişir (oturum başı aynı).
        const keep = this.settings.saved ? RECAPS_KEEP_SAVED : RECAPS_KEEP;
        this.recaps = [...this.recaps.filter((r) => now - r.to < RECAP_MAX_AGE_MS && r.from !== recap.from), recap].slice(-keep);
        await this.ctx.storage.put('recaps', this.recaps);
        this.broadcast({ t: 'recaps', recaps: this.recaps });
        return;
      }
      case 'recaps':
        this.sendTo(ws, { t: 'recaps', recaps: this.recaps.filter((r) => Date.now() - r.to < RECAP_MAX_AGE_MS) });
        return;
      case 'chat':
        if (!this.chatLimit.allow(me.id)) {
          this.sendTo(ws, { t: 'error', code: 'rate_limited' });
          return;
        }
        this.stats.chat(keyOf(attachment), me);
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
      case 'ready': {
        // Reklam: `ad` gelince işaret değişir; motorun sonraki "takıldım"ı reklamdayken bekletmez (film reklam boyunca
        // ilerlemez), "oynuyorum" (film geri geldi) işareti kaldırır.
        const ad = message.ad ?? (message.ready ? false : attachment.ad === true);
        if (ad !== (attachment.ad === true)) {
          if (ad) attachment.ad = true;
          else delete attachment.ad;
          ws.serializeAttachment(attachment);
          this.broadcast(this.membersMessage());
        }
        this.waits.setReady(me.id, message.ready || ad);
        await this.evaluateWait();
        await this.saveWaits();
        return;
      }
      case 'settings': {
        if (!this.isHost(ws)) {
          this.sendTo(ws, { t: 'error', code: 'not_host' });
          return;
        }
        const next: RoomSettings = { ...this.settings };
        if (message.waitForAll !== undefined) next.waitForAll = message.waitForAll;
        if (message.hostOnly !== undefined) next.hostOnly = message.hostOnly;
        if (message.lockQueue !== undefined) next.lockQueue = message.lockQueue;
        if (message.autoNext !== undefined) next.autoNext = message.autoNext;
        if (message.loop !== undefined) next.loop = message.loop;
        if (message.saved !== undefined) next.saved = message.saved;
        if (message.noReactions !== undefined) next.noReactions = message.noReactions;
        if (message.reactionGap !== undefined) next.reactionGap = message.reactionGap;
        if (message.name !== undefined) next.name = message.name;
        // Kayıt kapanınca hatırlananlar da silinir.
        if (message.saved === false && Object.keys(this.history).length) {
          this.history = {};
          await this.ctx.storage.delete('history');
        }
        if (message.startsAt === null) delete next.startsAt;
        // Geçmişte ya da 30 günden ileride plan olmaz.
        else if (message.startsAt !== undefined && message.startsAt > Date.now() && message.startsAt < Date.now() + 30 * 86_400_000) next.startsAt = message.startsAt;
        this.settings = next;
        await this.ctx.storage.put('settings', this.settings);
        this.broadcast({ t: 'settings', settings: this.settings });
        await this.evaluateWait();
        await this.scheduleAlarm();
        return;
      }
      case 'next': {
        // Döngü açıkken biten Shorts sıradakine geçmez, başa sarar ("Sonraki"ye basmak yine geçer).
        const item = this.room.state.item;
        const loop = message.end && this.settings.loop && item?.media.kind === 'youtube' && item.media.short;
        await this.apply(ws, me, loop ? { t: 'restart', from: message.from } : { t: 'next', from: message.from });
        return;
      }
      case 'prev': {
        const item = this.played.at(-1);
        if (item) await this.apply(ws, me, { t: 'prev', from: message.from, item });
        return;
      }
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
    if (this.openSockets().length === 0 && (this.emptySince === null || now - this.emptySince >= this.emptyTtl())) {
      await this.ctx.storage.deleteAll();
      this.room = initialRoom(now);
      this.chat = [];
      this.stickers.clear();
      this.stickerOwners = {};
      this.pins = { itemId: null, list: [] };
      this.hostKey = null;
      this.hostGoneAt = null;
      this.bans = {};
      this.settings = { waitForAll: true };
      this.voters = {};
      this.history = {};
      this.played = [];
      this.stats = new StatsTracker(null, now);
      this.recaps = [];
      this.waits.restore({ notReady: [], cooldownUntil: [], waitingFor: [], waitingSince: null });
      this.emptySince = null;
      return;
    }
    if (this.waits.waitingSince !== null && now - this.waits.waitingSince >= WAIT_MAX_MS) await this.evaluateWait();
    if (this.settings.startsAt !== undefined && now >= this.settings.startsAt) await this.startScheduled(now);
    await this.scheduleAlarm();
  }

  /** Planlı saat geldi: plan kalkar, durmuş bir video varsa oda herkes için oynar. */
  private async startScheduled(now: number): Promise<void> {
    const { startsAt: _done, ...rest } = this.settings;
    this.settings = rest;
    await this.ctx.storage.put('settings', this.settings);
    this.broadcast({ t: 'settings', settings: this.settings });
    const state = this.room.state;
    if (state.item && state.paused) {
      this.statsTick();
      this.room = { ...this.room, state: { ...state, paused: false, updatedAt: now } };
      await this.ctx.storage.put('room', this.room);
      this.broadcast({ t: 'state', state: this.room.state, action: 'play', by: SYSTEM });
    }
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
    if (this.emptySince !== null) times.push(this.emptySince + this.emptyTtl());
    if (this.settings.startsAt !== undefined) times.push(this.settings.startsAt);
    if (times.length) await this.ctx.storage.setAlarm(Math.min(...times));
    else await this.ctx.storage.deleteAlarm();
  }

  /** Ana sayfadan kayıt kaldırma: sadece yöneticinin tarayıcı kimliğiyle. */
  private async unsaveFromHome(request: Request): Promise<Response> {
    const body = (await request.json().catch(() => null)) as { cid?: unknown } | null;
    const cid = typeof body?.cid === 'string' && CLIENT_ID.test(body.cid) ? body.cid : null;
    if (!cid || `c:${cid}` !== this.hostKey) return new Response('forbidden', { status: 403 });
    if (this.settings.saved) {
      const { saved: _saved, ...rest } = this.settings;
      this.settings = rest;
      this.history = {};
      await this.ctx.storage.delete('history');
      await this.ctx.storage.put('settings', this.settings);
      this.broadcast({ t: 'settings', settings: this.settings });
      await this.scheduleAlarm();
    }
    return new Response('ok');
  }

  /** Özet sayacına "şu ana kadar oynadı mı" bilgisini işler (oda durumu değişmeden önce çağrılır). */
  private statsTick(present = this.openSockets().length > 0): void {
    const s = this.room.state;
    this.stats.tick(Date.now(), !s.paused && s.item !== null, s.rate, present);
  }

  private async saveStats(): Promise<void> {
    await this.ctx.storage.put('stats', this.stats.data);
  }

  /** Boş oda ne kadar saklanır: kaydedilmiş oda 30 gün, diğerleri 24 saat. */
  private emptyTtl(): number {
    return this.settings.saved ? SAVED_ROOM_TTL_MS : EMPTY_ROOM_TTL_MS;
  }

  /**
   * Oda oynarken herkes çıktıysa saat ilerlemeye devam eder; dönen kişi videoyu çok ileride
   * bulurdu. Bir dakikadan uzun boş kaldıysa video, son kişinin çıktığı anda durmuş sayılır.
   * (Kısa kopmalarda, ör. sayfa yenileme, oynamaya devam eder.)
   */
  private async freezeIfLongEmpty(): Promise<void> {
    const state = this.room.state;
    if (this.emptySince === null || state.paused || !state.item || Date.now() - this.emptySince < FREEZE_AFTER_MS) return;
    const position = expectedPosition(state, this.emptySince);
    this.room = { ...this.room, state: { ...state, paused: true, position, updatedAt: Date.now() } };
    await this.ctx.storage.put('room', this.room);
  }

  /** Kayıtlı odada bir videonun kaldığı yeri ve pinlerini hatırlar (en yeni MAX_HISTORY tane). */
  private remember(item: QueueItem, position: number): void {
    const pins = this.pins.itemId === item.id ? this.pins.list : [];
    this.history[titleKey(item.media)] = { position: Math.round(position), pins, at: Date.now() };
    const keys = Object.keys(this.history).sort((a, b) => this.history[b]!.at - this.history[a]!.at);
    for (const key of keys.slice(MAX_HISTORY)) delete this.history[key];
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
    if (hello.client) attachment.client = hello.client;
    else delete attachment.client;
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
    this.stats.people(members.length);
    await this.saveStats();
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
      pins: this.currentPins(),
      voice: this.env.VOICE !== 'off',
      voiceMode: realtimeConfig(this.env) ? 'sfu' : 'p2p',
    });
    // Özel emojiler tek tek (hepsi bir mesajda 1 MB sınırını aşabilir).
    for (const [id, data] of this.stickers) this.sendTo(ws, { t: 'sticker', sticker: { id, data } });
    this.broadcast({ t: 'members', members, hostId }, ws);
    this.sendBans();
  }

  /** Sesli sohbete katıl / ayrıl / mikrofonu aç-kapa (bağlantı başına; herkese `members` gider). */
  private async setVoice(ws: WebSocket, attachment: Attachment, on: boolean, mic?: boolean, cam?: boolean): Promise<void> {
    if (on) {
      if (this.env.VOICE === 'off') return this.sendTo(ws, { t: 'error', code: 'voice_unavailable' });
      const max = realtimeConfig(this.env) ? VOICE_MAX : VOICE_MAX_P2P;
      const inVoice = this.joined().filter((a) => a.voice && a.id !== attachment.id).length;
      if (!attachment.voice && inVoice >= max) return this.sendTo(ws, { t: 'error', code: 'voice_full' });
      attachment.voice = { ...attachment.voice, mic: mic ?? attachment.voice?.mic ?? true };
      // Kamera sadece eşler arası seste (Cloudflare yolunda görüntü yok); aynı anda en fazla CAM_MAX.
      if (cam !== undefined && !realtimeConfig(this.env)) {
        const cams = this.joined().filter((a) => a.voice?.cam && a.id !== attachment.id).length;
        if (cam && !attachment.voice.cam && cams >= CAM_MAX) {
          ws.serializeAttachment(attachment);
          this.sendTo(ws, { t: 'error', code: 'cam_full' });
          this.broadcast(this.membersMessage());
          return;
        }
        if (cam) attachment.voice.cam = true;
        else delete attachment.voice.cam;
      }
    } else {
      if (!attachment.voice) return;
      delete attachment.voice;
    }
    ws.serializeAttachment(attachment);
    this.broadcast(this.membersMessage());
  }

  /**
   * Yayın aç/kapa: odada aynı anda tek yayın (başkası yayındaysa `live_busy`). Yayın bitince izleyiciler bırakılır.
   */
  private setLive(ws: WebSocket, attachment: Attachment, on: boolean, kind?: LiveKind): void {
    if (on && kind) {
      if (this.joined().some((a) => a.live && a.id !== attachment.id)) return this.sendTo(ws, { t: 'error', code: 'live_busy' });
      attachment.live = kind;
      delete attachment.watching;
      ws.serializeAttachment(attachment);
    } else {
      if (!attachment.live) return;
      delete attachment.live;
      ws.serializeAttachment(attachment);
      this.clearWatchers();
    }
    this.broadcast(this.membersMessage());
  }

  /** Yayını izle/bırak: en fazla LIVE_MAX_VIEWERS kişi (yayıncı her izleyiciye ayrı kopya yollar). */
  private setWatch(ws: WebSocket, attachment: Attachment, on: boolean): void {
    if (on) {
      if (attachment.watching || attachment.live || !this.joined().some((a) => a.live)) return;
      const viewers = this.joined().filter((a) => a.watching).length;
      if (viewers >= LIVE_MAX_VIEWERS) return this.sendTo(ws, { t: 'error', code: 'live_full' });
      attachment.watching = true;
    } else {
      if (!attachment.watching) return;
      delete attachment.watching;
    }
    ws.serializeAttachment(attachment);
    this.broadcast(this.membersMessage());
  }

  /** Yayın bitti: izleyicilerin işareti kalkar. */
  private clearWatchers(except?: WebSocket): void {
    for (const socket of this.openSockets(except)) {
      const a = socket.deserializeAttachment() as Attachment | null;
      if (!a?.watching) continue;
      delete a.watching;
      socket.serializeAttachment(a);
    }
  }

  /**
   * Sesli sohbetin bağlantı işleri: Cloudflare Realtime'a bu bağlantı adına gideriz. Oturum sunucuda tutulur,
   * istemci sadece odadaki birinin sesini üye kimliğiyle isteyebilir.
   */
  private async rtc(ws: WebSocket, message: Extract<ClientMessage, { t: 'rtc' }>): Promise<void> {
    const reply = (result: RtcResult) => this.sendTo(ws, { t: 'rtc', id: message.id, ...result });
    const config = realtimeConfig(this.env);
    if (!config) return reply({ ok: false, error: 'voice_unavailable' });
    // Bekleme sırasında bağlantının bilgisi değişmiş olabilir: her adımda tazesini oku.
    const fresh = () => ws.deserializeAttachment() as Attachment | null;
    const me = fresh();
    if (!me?.voice) return reply({ ok: false, error: 'not_in_voice' });
    try {
      if (message.op === 'session') {
        if (!me.voice.session) {
          const session = await newSession(config);
          const now = fresh();
          if (!now?.voice) return reply({ ok: false, error: 'not_in_voice' });
          now.voice.session = session;
          ws.serializeAttachment(now);
        }
        return reply({ ok: true });
      }
      const session = me.voice.session;
      if (!session) return reply({ ok: false, error: 'not_in_voice' });
      switch (message.op) {
        case 'publish': {
          const sdp = await publish(config, session, message.sdp, message.mid, message.track);
          const now = fresh();
          if (now?.voice) {
            now.voice.track = message.track;
            ws.serializeAttachment(now);
            // Diğerleri yeni akışı görünce dinlemeye başlar.
            this.broadcast(this.membersMessage());
          }
          return reply({ ok: true, sdp, sdpType: 'answer' });
        }
        case 'pull': {
          const target = this.joined().find((a) => a.id === message.from);
          if (!target?.voice?.track || !target.voice.session) return reply({ ok: false, error: 'no_track' });
          const result = await pull(config, session, target.voice.session, target.voice.track);
          return reply({ ok: true, mid: result.mid, renegotiate: result.renegotiate, ...(result.sdp ? { sdp: result.sdp, sdpType: result.sdpType } : {}) });
        }
        case 'renegotiate':
          await renegotiate(config, session, message.sdp);
          return reply({ ok: true });
        case 'close':
          await closeTracks(config, session, message.mids);
          return reply({ ok: true });
      }
    } catch (error) {
      console.warn('realtime', String(error));
      return reply({ ok: false, error: 'upstream' });
    }
  }

  /** Açık videonun pinleri (sahipleri olmadan); başka videoya aitse ya da boşsa yok. */
  private currentPins(): PinList | undefined {
    const item = this.room.state.item;
    if (!item || this.pins.itemId !== item.id || this.pins.list.length === 0) return undefined;
    return { itemId: item.id, pins: this.pins.list.map(({ owner: _owner, ...pin }) => pin) };
  }

  private async savePins(): Promise<void> {
    await this.ctx.storage.put('pins', this.pins);
    const list = this.currentPins();
    this.broadcast({ t: 'pins', pins: list ?? { itemId: this.pins.itemId ?? '', pins: [] } });
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
    const joined = this.joined();
    const present = new Set(joined.map((a) => a.id));
    // Tek kişiyken (aynı tarayıcının birden çok sekmesi de tek kişi) bekleme yok: kişi kendi yüklemesi
    // yüzünden odayı kendine durdurmasın. Senkron özellikleri 2+ kişiyle anlamlı.
    const people = new Set(joined.map((a) => a.cid ?? a.id)).size;
    const decision = this.waits.decide(now, this.settings.waitForAll && people >= 2, !state.paused && state.item !== null, present);

    if (decision.kind === 'start') {
      this.statsTick();
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
        this.statsTick();
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

    const before = this.room.state;
    this.statsTick();
    this.room = update.data;
    const actor = ws.deserializeAttachment() as Attachment | null;
    if (update.stateAction !== null && actor) this.stats.action(keyOf(actor), me, update.stateAction);
    const opened = this.room.state.item;
    if (opened && opened.id !== before.item?.id) {
      this.stats.video(opened.id, opened.title);
      // YouTube 2x'ten hızlı oynatmaz: önceki videodan kalan yüksek hız düşürülür.
      if (opened.media.kind === 'youtube' && this.room.state.rate > YOUTUBE_MAX_RATE) {
        this.room = { ...this.room, state: { ...this.room.state, rate: YOUTUBE_MAX_RATE } };
      }
    }
    if (before.item && before.item.id !== this.room.state.item?.id) {
      // "Bir önceki" listesi: geri dönülen listeden çıkar, geçilen listeye girer.
      if (action.t === 'prev') this.played.pop();
      else this.played = [...this.played.filter((p) => p.id !== before.item!.id), before.item].slice(-MAX_PLAYED);
      await this.ctx.storage.put('played', this.played);
    }
    let resumed: number | undefined;
    let restoredPins = false;
    const now = Date.now();
    if (this.settings.saved && before.item?.id !== this.room.state.item?.id) {
      // "Sıradaki" ile geçilen video bitmiş (ya da atlanmış) sayılır: baştan başlasın.
      if (before.item && action.t === 'next') delete this.history[titleKey(before.item.media)];
      else if (before.item) this.remember(before.item, expectedPosition(before, now));
      const item = this.room.state.item;
      const saved = item ? this.history[titleKey(item.media)] : undefined;
      if (item && saved) {
        // Baştan 15 sn'den azsa baştan başlamak daha doğal.
        if (saved.position > 15) {
          resumed = saved.position;
          this.room = { ...this.room, state: { ...this.room.state, position: saved.position, updatedAt: now } };
        }
        if (saved.pins.length) {
          this.pins = { itemId: item.id, list: saved.pins.map((p) => ({ ...p })) };
          restoredPins = true;
        }
      }
      await this.ctx.storage.put('history', this.history);
    }
    await this.ctx.storage.put('room', this.room);
    await this.saveStats();
    if (update.queueChanged) {
      // Sıradan çıkanların oyları unutulur.
      const ids = new Set(this.room.queue.map((q) => q.id));
      for (const id of Object.keys(this.voters)) if (!ids.has(id)) delete this.voters[id];
      await this.ctx.storage.put('voters', this.voters);
      this.broadcast({
        t: 'queue',
        queue: this.room.queue,
        change: update.change ? { ...update.change, by: me } : null,
      });
    }
    if (update.stateAction !== null) {
      this.broadcast({ t: 'state', state: this.room.state, action: update.stateAction, by: me, ...(resumed !== undefined ? { resumed } : {}) });
    }
    // Pinler video mesajından sonra gitsin (istemci yeni videoda pin listesini sıfırlıyor).
    if (restoredPins) await this.savePins();
  }

  /**
   * Sıradaki bir öğeye oy ver / geri al. Sıra oya göre (çok olan önde) yeniden dizilir; eşit
   * oydakiler eklenme sırasını korur. Sıradakine geçişte en çok oy alan oynar.
   */
  private async vote(key: string, itemId: string, up: boolean): Promise<void> {
    if (!this.room.queue.some((q) => q.id === itemId)) return;
    const list = new Set(this.voters[itemId] ?? []);
    if (up) list.add(key);
    else list.delete(key);
    this.voters[itemId] = [...list];
    const order = new Map(this.room.queue.map((q, i) => [q.id, i]));
    const queue = this.room.queue
      .map((q) => ({ ...q, votes: this.voters[q.id]?.length ?? 0 }))
      .sort((a, b) => b.votes - a.votes || order.get(a.id)! - order.get(b.id)!);
    this.room = { ...this.room, queue };
    await this.ctx.storage.put({ room: this.room, voters: this.voters });
    this.broadcast({ t: 'queue', queue: this.room.queue, change: null });
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
    this.stats.title(item.id, title);
    await this.saveStats();
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
      for (const limiter of [this.commandLimit, this.chatLimit, this.rtcLimit, this.signalLimit]) limiter.forget(attachment.id);
      // Kişi başı tutulanlar: aynı tarayıcının başka bağlantısı kalmadıysa unutulur.
      const key = keyOf(attachment);
      if (!this.joined(leaving).some((other) => keyOf(other) === key)) {
        this.reactionLimit.forget(key);
        this.homeLimit.forget(key);
        this.lastReaction.delete(key);
      }
      this.waits.remove(attachment.id);
      // Yayıncı çıktı: yayın biter, izleyiciler bırakılır.
      if (attachment.live) this.clearWatchers(leaving);
      // Yöneticinin son bağlantısı gittiyse saymaya başla (bkz. settleHost).
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
    if (this.openSockets(leaving).length === 0) {
      this.statsTick(false);
      await this.saveStats();
      // Kayıtlı odada son kişi çıkınca açık videonun yeri de hatırlansın.
      const state = this.room.state;
      if (this.settings.saved && state.item) {
        this.remember(state.item, expectedPosition(state, Date.now()));
        await this.ctx.storage.put('history', this.history);
      }
      await this.setEmptySince(Date.now());
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
  'ping' | 'hello' | 'vote' | 'recap' | 'recap-save' | 'recaps' | 'home' | 'voice' | 'rtc' | 'signal' | 'live' | 'live-watch' | 'live-signal' | 'react' | 'sticker-add' | 'sticker-remove' | 'pin' | 'unpin' | 'chat' | 'rename' | 'kick' | 'unban' | 'ready' | 'settings' | 'load' | 'enqueue' | RoomAction['t']
>;
const _exhaustive: [_Handled] extends [never] ? true : never = true;
void _exhaustive;
