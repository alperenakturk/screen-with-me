import { DurableObject } from 'cloudflare:workers';
import {
  MAX_PINS,
  MAX_TABLES,
  TABLE_EMPTY_MS,
  MAX_STICKERS,
  MAX_CHAT_IMAGES,
  PROTOCOL_VERSION,
  SYSTEM_MEMBER_ID,
  CLIENT_ID,
  maxRateFor,
  countdownMedia,
  COUNTDOWN_MS,
  expectedPosition,
  parseClientMessage,
  stickerId,
  type Avatar,
  type ClientKind,
  type RoomSettings,
  type ChatMessage,
  type ClientMessage,
  cleanTitle,
  isPublicMedia,
  type Media,
  type Member,
  type Pin,
  type PinList,
  type QueueItem,
  type ServerMessage,
  type RtcResult,
  VOICE_MAX,
  VOICE_MAX_P2P,
  type TvOp,
  CAM_MAX,
  LIVE_MAX_VIEWERS,
  type LiveKind,
  type RoomGame,
  type RoomGameKind,
} from '@swm/shared/protocol';
import { applyRoomAction, freshItem, freshRoom, initialRoom, setItemTitle, TITLE_MAX_AGE_MS, type RoomAction, type RoomData } from '@swm/shared/room-logic';
import { WAIT_MAX_MS, WaitTracker, type WaitSnapshot } from '@swm/shared/waiting';
import { freshRecaps, RECAP_MAX_AGE_MS, RECAPS_KEEP, RECAPS_KEEP_SAVED, StatsTracker, type Recap, type StatsData } from '@swm/shared/recap';
import { PollHub, readCapped } from './fallback.ts';
import { IP_HEADER, ROOM_HEADER } from './ip.ts';
import { labServer } from './lab.ts';
import { PLANT_IDS } from '@swm/shared/games/garden';
import { RateLimiter } from './rate-limit.ts';
import { closeTracks, newSession, publish, pull, realtimeConfig, renegotiate } from './realtime.ts';
import { resolveTitle } from './titles.ts';
import { recordUsage } from './usage.ts';
import { allowUpload } from './upload-gate.ts';
import { tvOn } from './tv-switch.ts';

const MAX_MEMBERS = 50;
/** Security L5: a connection that never says `hello` is closed after this long, and at most this many may wait. */
const UNJOINED_MS = 15_000;
const MAX_UNJOINED = 30;
/** R12 "Ask before letting people in": at most this many people wait at the door at once, this many per address, and
 * each waits this long before the door closes on them; someone let in (or in the room) passes straight in for a day. */
const MAX_KNOCKS = 8;
const KNOCKS_PER_IP = 2;
const KNOCK_MAX_MS = 10 * 60_000;
const ADMIT_TTL_MS = 24 * 3600_000;
const MAX_ADMITTED = 500;
/** Custom emoji uploads per room and day (each can be ~280 KB and is kept with the room). */
const STICKER_ADDS_PER_DAY = 60;
/** Images sent in chat per room and day (0.9.88). */
const CHAT_IMAGES_PER_DAY = 100;
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
const SYSTEM: Member = { id: SYSTEM_MEMBER_ID, name: 'Sidelit' };

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
  /** When the connection was accepted (security L5: an unjoined one is closed after UNJOINED_MS). */
  openedAt?: number;
  /** 'ext': eklentiyle film sayfasında. */
  client?: ClientKind;
  /** Sesli sohbette: mikrofon açık mı, yayınladığı akış ve Cloudflare oturumu (oturum istemcilere gitmez). */
  voice?: { mic: boolean; track?: string; session?: string; cam?: boolean; switching?: boolean };
  /** Film sayfasında reklam oynuyor (eklenti bildirir): oda bu kişiyi beklemez. */
  ad?: boolean;
  /** Yayın yapıyor (odada tek yayın) / yayını izliyor. */
  live?: LiveKind;
  watching?: boolean;
  /** The game table this connection has open. */
  table?: string;
  /** R11: the opaque per-room person key sent to clients (`personKeyFor`), from the browser id. */
  pk?: string;
  /** R12: waiting at the door for the host (name, avatar, when, and the hello to finish joining with once let in). */
  knock?: { name: string; avatar?: Avatar; at: number; hello: Extract<ClientMessage, { t: 'hello' }> };
  /** Short hash of the connection's IP (set by the Worker): abuse limits only; never stored or sent to clients. */
  ip?: string;
  /** A paired TV: `cid` is its person's (so it is the same person: host rights, kicks, counted once). */
  tv?: boolean;
}

/** A TV's link token: whose TV it is (`keyOf`) and the name / avatar it joins with. */
interface TvToken {
  key: string;
  name: string;
  avatar?: Avatar;
  /** Last use; a token unused for `TV_TOKEN_TTL_MS` is dropped. */
  at: number;
}
/** A paired TV may reconnect with its token for this long after its last use (a TV left on overnight re-pairs). */
const TV_TOKEN_TTL_MS = 12 * 60 * 60_000;
const MAX_TV_TOKENS = 50;
/** A reconnect keeps its member id for this long after it was last given out (see `memberIds`). */
const MEMBER_ID_TTL_MS = 24 * 60 * 60_000;
const MAX_MEMBER_IDS = 200;

/**
 * Bu kadar süredir hiç mesaj (ping dahil) gelmeyen bağlantı kopmuş sayılır ve kapatılır.
 * İstemciler 10 sn'de bir ping atar; ama Chrome arka plandaki sekmelerde zamanlayıcıyı
 * dakikada bire kadar yavaşlattığı için süre uzun tutulur.
 */
const STALE_MS = 150_000;
/** Hayalet ayıklama en fazla bu sıklıkla çalışır. */
const PRUNE_EVERY_MS = 20_000;

type Joined = Attachment & { name: string };

/** A game table: the game, its opener's persistent key (never sent to clients) and since when nobody has it open. */
interface Table {
  game: RoomGame;
  owner: string;
  emptyAt: number | null;
}

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
    member.voice = { mic: attachment.voice.mic, ...(attachment.voice.track ? { track: attachment.voice.track } : {}), ...(attachment.voice.cam ? { cam: true } : {}), ...(attachment.voice.cam && attachment.voice.switching ? { switching: true } : {}) };
  }
  if (attachment.ad) member.ad = true;
  if (attachment.live) member.live = attachment.live;
  if (attachment.watching) member.watching = true;
  if (attachment.tv) member.tv = true;
  if (attachment.table) member.table = attachment.table;
  if (attachment.pk) member.pk = attachment.pk;
  return member;
}

/** Yöneticilik ve atma için kişiyi tanıyan anahtar: kalıcı kimlik varsa o, yoksa bağlantı. */
/** Serves that fill the room's tip jar (side games 2). */
const TIP_JAR_SIZE = 60;

function keyOf(attachment: Attachment): string {
  return attachment.cid ? `c:${attachment.cid}` : `i:${attachment.id}`;
}

/** Aynı tarayıcıdan bağlı ikinci bir kişinin yasağı: tarayıcı + isim. */
function banKey(attachment: Attachment, name: string | null): string {
  return `${keyOf(attachment)}|n:${name ?? ''}`;
}

function titleKey(media: Media): string {
  if (media.kind === 'test') return 'test';
  if (media.kind === 'tiktok') return `tt:${media.id}`;
  if (media.kind === 'vimeo') return `vm:${media.id}`;
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
  /**
   * Images sent in chat (0.9.88): id → data URL, oldest first; storage `chatimg:<id>` + order `chatImages`. Only the
   * images of messages still in the chat history are kept (at most MAX_CHAT_IMAGES); deleted with the room.
   */
  private chatImages = new Map<string, string>();
  private chatImageDay: { day: number; count: number } = { day: 0, count: 0 };
  /** Chat images per IP: a few at once, then one every 10 s. */
  private readonly imageLimit = new RateLimiter(5, 0.1);
  /** Özel emojiyi ekleyenin kalıcı anahtarı (kaldırabilsin diye; istemcilere gitmez). */
  private stickerOwners: Record<string, string> = {};
  /** Sıradaki her öğeye oy verenlerin kalıcı anahtarları (istemcilere gitmez; sadece sayı gider). */
  private voters: Record<string, string[]> = {};
  /** Looked-up titles by video, with when (card Y2: a YouTube title is kept at most 30 days). */
  private titles = new Map<string, { title: string; at: number }>();
  /** Oturum özeti sayaçları (son özetten beri) ve önceki özetler. */
  private stats = new StatsTracker();
  private recaps: Recap[] = [];
  /** Kayıtlı oda: video (titleKey) → kaldığı yer + pinler. */
  private history: Record<string, HistoryEntry> = {};
  /** Daha önce oynayanlar (en yenisi sonda): "bir önceki" bunlardan gelir. */
  private played: QueueItem[] = [];
  /** Odada açık oyun ve açanın kalıcı anahtarı (anahtar istemcilere gitmez). */
  /** Game tables, oldest first: the game, its opener's key (never sent) and since when nobody has it open. */
  private tables: Table[] = [];
  private hostKey: string | null = null;
  /** True on a local test server (`wrangler dev`): local media links are allowed there (security L4). */
  private devHost = false;
  /** A local lab server (`lab.ts`, Test Lab DL3b): only then does a `lab` message do anything. */
  private lab = false;
  /** Security L3: person key → until when they may not make the room wait (memory only; at most a minute old). */
  private readonly waitCooldowns = new Map<string, number>();
  /** The last item that started playing (it got its "3-2-1" then, or didn't need one): no second countdown. */
  private counted: string | null = null;
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
  /** HTTP fallback connections (`fallback.ts`): the same messages and rules as the WebSockets. */
  private readonly polls = new PollHub({
    admit: (socket, request) => this.admit(socket, request),
    message: (socket, raw) => this.webSocketMessage(socket, raw),
    closed: (socket, code) => this.webSocketClose(socket, code),
    schedule: () => this.scheduleAlarm(),
  });

  // Her bağlantı için ayrı kovalar: genel komutlar, emoji, sohbet.
  private readonly commandLimit = new RateLimiter(20, 4);
  // Emojiler art arda atılabilir (abanma serbest); bu sadece kötüye kullanımı keser. Yönetici isterse
  // settings.reactionGap ile kişi başı aralık koyar (lastReaction).
  private readonly reactionLimit = new RateLimiter(12, 5);
  /** Yöneticinin emoji aralığı için kişinin (tarayıcının) son geçen emojisi; sadece aralık açıkken yazılır. */
  private readonly lastReaction = new Map<string, number>();
  /** "Odaya döndüm" haberi: kişi başı en fazla yarım dakikada bir (filmdekileri kart yağmuruna tutmasın). */
  private readonly homeLimit = new RateLimiter(1, 1 / 30);
  /** Side games 2: a tip per person at most every 2 s; a cutting per person at most every 30 s. */
  private readonly tipLimit = new RateLimiter(2, 0.5);
  private readonly giftLimit = new RateLimiter(1, 1 / 30);
  /** The room's tip jar (pick 5): filled by everyone's Snack Bar serves; full = +10 % for everyone till the film ends. */
  private tipJar: { fill: number; boost: string | null } = { fill: 0, boost: null };
  /** Custom emojis added today in this room (`stickerDay` in storage); at most STICKER_ADDS_PER_DAY. */
  private stickerDay: { day: number; count: number } = { day: 0, count: 0 };
  /** Özel emoji ekleme: birkaç tane hemen, sonra 20 sn'de bir (büyük veri). */
  private readonly stickerLimit = new RateLimiter(4, 0.05);
  // Sohbet: art arda 8 mesaj, sonra saniyede 1 (daha sıkısı arkadaşlar arasında yazışırken takılıyordu).
  private readonly chatLimit = new RateLimiter(8, 1);
  /** Sesli sohbetin bağlantı işleri (her yeni dinlenen kişi için birkaç istek). */
  private readonly rtcLimit = new RateLimiter(30, 3);
  /** Eşler arası seste bağlantı mesajları (her eş için teklif/cevap + birkaç ağ adayı). */
  private readonly signalLimit = new RateLimiter(80, 10);
  /**
   * Security L2: signals per person (browser) and per pair of people, so a reconnect (a new member id) no longer
   * resets the flood limit and one person cannot hammer one other person. A real call needs an offer, an answer and
   * some ICE candidates per pair; a camera on/off or a reconnect adds a few more.
   */
  private readonly personSignalLimit = new RateLimiter(120, 12);
  private readonly pairSignalLimit = new RateLimiter(40, 2);
  /** TV pairing attempts per person: a wrong code costs one (6-digit codes can't be guessed this way). */
  private readonly tvLinkLimit = new RateLimiter(5, 5 / 60);
  private readonly tvLimit = new RateLimiter(20, 4);
  private tvTokens: Record<string, TvToken> = {};
  /**
   * Member ids given out, by browser id (0.9.91.16): a reconnect of the same browser keeps its member id, so the
   * voice and camera connections between browsers (they don't pass through us) survive a dropped room connection or
   * a server restart. Owner: "why does it throw me out of voice and put me back". Browser ids never leave the server.
   */
  private memberIds: Record<string, { cid: string; at: number }> = {};
  /** R11: the salt of this room's person keys (storage `personSalt`, made on first use). */
  private personSalt: string | null = null;
  /** R12: person key → when they were last in (or let in); they pass the door for `ADMIT_TTL_MS` (storage `admitted`). */
  private admitted: Record<string, number> = {};
  /** This room's id (from the Worker's header; a paired TV is told where to go). */
  private roomId: string | null = null;

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
      this.stickerDay = (await ctx.storage.get<{ day: number; count: number }>('stickerDay')) ?? this.stickerDay;
      const imageIds = (await ctx.storage.get<string[]>('chatImages')) ?? [];
      const imageData = await ctx.storage.get<string>(imageIds.map((id) => `chatimg:${id}`));
      for (const id of imageIds) {
        const data = imageData.get(`chatimg:${id}`);
        if (data) this.chatImages.set(id, data);
      }
      this.chatImageDay = (await ctx.storage.get<{ day: number; count: number }>('chatImageDay')) ?? this.chatImageDay;
      this.hostKey = (await ctx.storage.get<string>('host')) ?? null;
      this.hostGoneAt = (await ctx.storage.get<number>('hostGoneAt')) ?? null;
      this.counted = (await ctx.storage.get<string>('counted')) ?? null;
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
      await this.pruneRecaps(Date.now());
      this.played = (await ctx.storage.get<QueueItem[]>('played')) ?? [];
      this.tvTokens = (await ctx.storage.get<Record<string, TvToken>>('tvTokens')) ?? {};
      this.memberIds = (await ctx.storage.get<Record<string, { cid: string; at: number }>>('memberIds')) ?? {};
      this.admitted = (await ctx.storage.get<Record<string, number>>('admitted')) ?? {};
      this.roomId = (await ctx.storage.get<string>('roomId')) ?? null;
      const tables = await ctx.storage.get<Table[]>('tables');
      // Before tables a room held one game ('game').
      const single = tables ? null : await ctx.storage.get<{ game: RoomGame; owner: string }>('game');
      this.tables = tables ?? (single ? [{ ...single, emptyAt: Date.now() }] : []);
    });
  }

  override async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    // A room on a local test server (`wrangler dev`) may queue local video files and film pages (harnesses).
    if (/^(localhost|127\.0\.0\.1)$/.test(new URL(request.url).hostname)) this.devHost = true;
    this.lab ||= labServer(this.env, request);
    // Ana sayfadaki kayıtlı odalar listesi: oda hâlâ kayıtlı mı, adı, içeride kaç kişi var.
    if (path.endsWith('/info')) {
      // The join screen (0.9.91.20) also shows who is waiting and what is on: the names of up to 3 people (one per
      // person, TVs left out), how many people, and the playing item's title. Anyone with the link could join and see
      // the same; nothing else (browser ids, IPs) ever leaves.
      const people = new Map<string, string>();
      for (const a of this.joined()) if (a.name && !a.tv && !people.has(keyOf(a))) people.set(keyOf(a), a.name);
      const item = this.room.state.item;
      return Response.json({
        saved: this.settings.saved === true,
        name: this.settings.name ?? null,
        online: this.joined().length,
        count: people.size,
        people: [...people.values()].slice(0, 3),
        playing: item ? (item.title ?? null) : null,
      });
    }
    // Yönetici odayı ana sayfadaki listeden çıkardı: kayıt kalkar (boşsa 24 saat sonra silinir).
    if (path.endsWith('/unsave') && request.method === 'POST') return this.unsaveFromHome(request);
    const roomId = request.headers.get(ROOM_HEADER);
    if (roomId && roomId !== this.roomId) {
      this.roomId = roomId;
      await this.ctx.storage.put('roomId', roomId);
    }
    // Networks where the WebSocket never opens (phone hotspots): the same connection over plain HTTP requests.
    const polled = await this.polls.handle(request);
    if (polled) return polled;
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    await this.admit(server, request);
    return new Response(null, { status: 101, webSocket: client });
  }

  /** A new connection (WebSocket or HTTP fallback): full room → closed, otherwise it waits for its hello. */
  private async admit(server: WebSocket, request: Request): Promise<void> {
    // Security L5: "full" counts people who joined; sockets that never said hello are closed after UNJOINED_MS and
    // only MAX_UNJOINED may wait at once (51 silent sockets used to make a room "full" for 150 s).
    const now = Date.now();
    this.closeUnjoined(now, server);
    const others = this.openSockets().filter((s) => s !== server).map((s) => s.deserializeAttachment() as Attachment | null);
    const joined = others.filter((a) => a?.name).length;
    const waiting = others.length - joined;
    if (joined >= MAX_MEMBERS || waiting >= MAX_UNJOINED) {
      this.sendTo(server, { t: 'error', code: 'room_full' });
      server.close(4001, 'room_full');
    } else {
      const ip = request.headers.get(IP_HEADER);
      const attachment: Attachment = { id: newId().slice(0, 8), name: null, openedAt: now, ...(ip ? { ip } : {}) };
      server.serializeAttachment(attachment);
      await this.freezeIfLongEmpty();
      this.statsTick(true);
      await this.setEmptySince(null);
    }
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
      // One hello per connection (security review 2, H1 / M1): a second one could change the browser id at will (every
      // per-person limit bypassed) and re-sent every custom emoji and chat image (a memory flood over the fallback).
      // Clients never send it twice; a reconnect is a new connection.
      if (attachment.name !== null || attachment.knock) {
        this.sendTo(ws, { t: 'error', code: 'bad_message' });
        return;
      }
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
        await this.setVoice(ws, attachment, message.on, message.mic, message.cam, message.switching);
        return;
      case 'live':
        this.setLive(ws, attachment, message.on, message.kind);
        return;
      case 'live-stop':
        if (!this.isHost(ws)) return this.sendTo(ws, { t: 'error', code: 'not_host' });
        this.stopLive();
        return;
      case 'live-watch':
        this.setWatch(ws, attachment, message.on);
        return;
      case 'game':
        // Old clients: one game per room.
        if (message.kind) await this.openTable(ws, attachment, me, message.kind);
        else {
          const mine = [...this.tables].reverse().find((t) => t.owner === keyOf(attachment)) ?? (this.isHost(ws) ? this.tables.at(-1) : undefined);
          if (mine) await this.closeTable(ws, attachment, me, mine.game.id);
        }
        return;
      case 'table':
        if (message.open) await this.openTable(ws, attachment, me, message.open);
        else if (message.close) await this.closeTable(ws, attachment, me, message.close);
        return;
      case 'at':
        await this.setAt(ws, attachment, message.table);
        return;
      case 'live-signal': {
        // Yayın bağlantısı sadece yayıncı ile onu izleyen arasında (IP'ler sadece yayına katılanlara görünür).
        if (!this.signalLimit.allow(me.id)) return;
        const target = this.openSockets().find((c) => (c.deserializeAttachment() as Attachment | null)?.id === message.to);
        const other = target?.deserializeAttachment() as Attachment | null;
        if (other && !this.signalAllowed(attachment, other)) return;
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
        if (other && !this.signalAllowed(attachment, other)) return;
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
      case 'tv-link':
        await this.linkTv(ws, attachment, joined, message.code);
        return;
      case 'tv':
        await this.relayTv(ws, attachment, message.op, message.value);
        return;
      case 'tip': {
        // Only while something plays; the jar is for this film.
        if (!this.room.state.item || this.room.state.paused || !this.tipLimit.allow(keyOf(attachment))) return;
        this.tipJar.fill += 1;
        if (this.tipJar.fill >= TIP_JAR_SIZE) {
          this.tipJar = { fill: 0, boost: this.room.state.item.id };
          this.broadcast({ t: 'tipjar', fill: 0, size: TIP_JAR_SIZE, boost: this.tipJar.boost, by: me });
        } else if (this.tipJar.fill % 5 === 0) {
          this.broadcast({ t: 'tipjar', fill: this.tipJar.fill, size: TIP_JAR_SIZE, boost: this.tipJar.boost });
        }
        return;
      }
      case 'lab':
        // Test Lab (DL3b): fill the tip jar for the film now, on a local lab server only (`lab.ts`).
        if (!this.lab) return this.sendTo(ws, { t: 'error', code: 'bad_message' });
        if (!this.room.state.item) return;
        this.tipJar = { fill: 0, boost: this.room.state.item.id };
        this.broadcast({ t: 'tipjar', fill: 0, size: TIP_JAR_SIZE, boost: this.tipJar.boost, by: me });
        return;
      case 'gift': {
        // A cutting goes to one person in the room (by person, not to myself); its plant is checked against the album.
        const mine = attachment.pk;
        const target = this.joined().find((a) => a.id === message.to && !a.tv);
        if (!target || !mine || target.pk === mine || !PLANT_IDS.includes(message.plant) || !this.giftLimit.allow(keyOf(attachment))) return;
        for (const socket of this.openSockets()) {
          const a = socket.deserializeAttachment() as Attachment | null;
          if (a?.name && !a.tv && !a.knock && a.pk === target.pk) this.sendTo(socket, { t: 'gift', from: me, plant: message.plant });
        }
        return;
      }
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
        // Per IP (a new browser id doesn't reset it), a daily cap per room and the daily byte budget across all rooms
        // (R4-1, `UploadGate`): images are big and kept for days.
        const uploader = attachment.ip ?? keyOf(attachment);
        if (!this.stickerLimit.allow(uploader) || !(await this.countStickerAdd()) || !(await allowUpload(this.env, uploader, message.data.length))) {
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
        this.broadcast({ t: 'sticker', sticker: { id, data: message.data } }, ws);
        this.sendTo(ws, { t: 'sticker', sticker: { id, data: message.data }, mine: true });
        return;
      }
      case 'sticker-clear': {
        if (!this.isHost(ws)) {
          this.sendTo(ws, { t: 'error', code: 'not_host' });
          return;
        }
        const ids = [...this.stickers.keys()];
        if (ids.length === 0) return;
        this.stickers.clear();
        this.stickerOwners = {};
        await this.ctx.storage.delete(ids.map((id) => `sticker:${id}`));
        await this.ctx.storage.put({ stickers: [], stickerOwners: {} });
        for (const id of ids) this.broadcast({ t: 'sticker-removed', id });
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
        let image: string | undefined;
        if (message.image !== undefined) {
          const uploader = attachment.ip ?? keyOf(attachment);
          // A picture this room already keeps is not stored again, so only a new one counts against the budget (R4-1).
          const fresh = !this.chatImages.has(await stickerId(message.image));
          if (!this.imageLimit.allow(uploader) || !(await this.countChatImage()) || (fresh && !(await allowUpload(this.env, uploader, message.image.length)))) {
            this.sendTo(ws, { t: 'error', code: 'rate_limited' });
            return;
          }
          image = await this.storeChatImage(message.image);
        }
        if (message.to !== undefined) {
          this.sendPrivate(ws, me, message.to, message.text);
          return;
        }
        this.stats.chat(keyOf(attachment), me);
        await this.addChat({ id: newId(), text: message.text, by: me, at: Date.now(), ...(image ? { image } : {}) });
        return;
      case 'rename': {
        if (attachment.tv) return;
        const oldPk = attachment.pk;
        attachment.name = message.name;
        if (message.avatar) attachment.avatar = message.avatar;
        attachment.pk = await this.personKeyFor(attachment);
        ws.serializeAttachment(attachment);
        // My TV keeps my name and avatar (it is me on another screen).
        for (const tv of this.tvSockets(keyOf(attachment))) {
          const a = tv.deserializeAttachment() as Attachment;
          if (a.pk !== oldPk) continue;
          a.name = attachment.name;
          if (attachment.avatar) a.avatar = attachment.avatar;
          a.pk = attachment.pk;
          tv.serializeAttachment(a);
        }
        this.broadcast(this.membersMessage());
        return;
      }
      case 'kick':
        await this.kick(ws, me, message.id);
        return;
      case 'knock-answer':
        await this.answerKnock(ws, message.id, message.allow);
        return;
      case 'make-host':
        await this.makeHost(ws, message.id);
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
        // Security L3: the 30 s "don't make the room wait again" belongs to the person (browser), so a reconnect with
        // a new member id does not reset it.
        if (!message.ready && !ad) {
          const until = this.waitCooldowns.get(keyOf(attachment)) ?? 0;
          if (until > Date.now()) this.waits.holdOff(me.id, until);
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
        if (message.liveHostOnly !== undefined) next.liveHostOnly = message.liveHostOnly;
        if (message.countdown !== undefined) next.countdown = message.countdown;
        if (message.knock !== undefined) {
          next.knock = message.knock;
          // Everyone in the room now may come back without knocking.
          if (message.knock) for (const a of this.joined()) await this.admit24h(keyOf(a));
        }
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
        // BH3: the door opened (the switch went off): whoever waits comes in now instead of waiting out the 10 minutes.
        if (message.knock === false) {
          for (const waiting of this.openSockets()) {
            const a = waiting.deserializeAttachment() as Attachment | null;
            if (!a?.knock || a.name) continue;
            const hello = a.knock.hello;
            delete a.knock;
            waiting.serializeAttachment(a);
            await this.join(waiting, a, hello);
          }
        }
        // "Sadece yönetici yayın açsın" açıldı: başkasının süren yayını kapanır.
        if (message.liveHostOnly === true) this.stopLive(true);
        await this.evaluateWait();
        await this.scheduleAlarm();
        return;
      }
      case 'next': {
        // Döngü açıkken biten Shorts sıradakine geçmez, başa sarar ("Sonraki"ye basmak yine geçer).
        const item = this.room.state.item;
        const loop = message.end && this.settings.loop && ((item?.media.kind === 'youtube' && item.media.short) || item?.media.kind === 'tiktok');
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
        // Security L4: only public addresses go into a room (a local test server may use its own).
        if (!this.devHost && !isPublicMedia(message.media)) return this.sendTo(ws, { t: 'error', code: 'bad_link' });
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
    await this.polls.sweepDue(now);
    // Empty but never marked empty: the object restarted while only HTTP fallback connections (kept in memory) were
    // in (or an old version's alarm). Start counting now instead of deleting a room people were just in.
    if (this.openSockets().length === 0 && this.emptySince === null) await this.setEmptySince(now);
    if (this.openSockets().length === 0 && this.emptySince !== null && now - this.emptySince >= this.emptyTtl()) {
      await this.ctx.storage.deleteAll();
      this.room = initialRoom(now);
      this.chat = [];
      this.stickers.clear();
      this.stickerOwners = {};
      this.stickerDay = { day: 0, count: 0 };
      this.chatImages.clear();
      this.chatImageDay = { day: 0, count: 0 };
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
      this.tables = [];
      // In-memory records the next write would otherwise put back (security review 2, L8).
      this.tvTokens = {};
      this.memberIds = {};
      this.counted = null;
      this.personSalt = null;
      this.admitted = {};
      return;
    }
    await this.pruneRecaps(now);
    if (this.waits.waitingSince !== null && now - this.waits.waitingSince >= WAIT_MAX_MS) await this.evaluateWait();
    await this.closeEmptyTables(now);
    if (this.settings.startsAt !== undefined && now >= this.settings.startsAt) await this.startScheduled(now);
    await this.scheduleAlarm();
  }

  /**
   * R12: does this hello have to wait at the door? Not when the setting is off, for the host, for someone already in
   * the room (another tab) or let in within a day. A full door (too many waiting, or too many from one address)
   * refuses the knock. A TV is its person's second device and never knocks (it came with a token).
   */
  private async mustKnock(ws: WebSocket, attachment: Attachment, hello: Extract<ClientMessage, { t: 'hello' }>): Promise<boolean> {
    if (!this.settings.knock || attachment.tv || this.hostKey === null) return false;
    const key = keyOf(attachment);
    if (key === this.hostKey || this.joined(ws).some((a) => keyOf(a) === key)) return false;
    const seen = this.admitted[key];
    if (seen !== undefined && Date.now() - seen < ADMIT_TTL_MS) return false;
    // BH3: the same browser knocking again (a reload, a dropped network) replaces its older knock: one card per person.
    for (const old of this.openSockets(ws)) {
      const a = old.deserializeAttachment() as Attachment | null;
      if (a?.knock && !a.name && keyOf(a) === key) {
        try {
          old.close(4005, 'replaced');
        } catch {
          // Already closed.
        }
      }
    }
    const waiting = this.knockers(ws).filter((a) => keyOf(a) !== key);
    if (waiting.length >= MAX_KNOCKS || (attachment.ip && waiting.filter((a) => a.ip === attachment.ip).length >= KNOCKS_PER_IP)) {
      this.sendTo(ws, { t: 'error', code: 'knock_busy' });
      ws.close(4010, 'knock_busy');
      return true;
    }
    attachment.knock = { name: hello.name, ...(hello.avatar ? { avatar: hello.avatar } : {}), at: Date.now(), hello };
    ws.serializeAttachment(attachment);
    this.sendKnocks();
    return true;
  }

  /** R12: the connections waiting at the door, oldest first. */
  private knockers(except?: WebSocket): Attachment[] {
    return this.openSockets(except)
      .map((s) => s.deserializeAttachment() as Attachment | null)
      .filter((a): a is Attachment => !!a?.knock && !a.name)
      .sort((a, b) => a.knock!.at - b.knock!.at);
  }

  /**
   * R12: the host's tabs get the list of who waits; everyone waiting learns whether a host is there to answer. BH3: the
   * host is whoever acts as host now (`hostId`: the real host, or the oldest person while they are away), the same rule
   * `answerKnock` checks, and everyone else gets an empty list, so cards never stay with someone who lost the role.
   */
  private sendKnocks(except?: WebSocket): void {
    const waiting = this.knockers(except);
    const list = waiting.map((a) => ({ id: a.id, name: a.knock!.name, ...(a.knock!.avatar ? { avatar: a.knock!.avatar } : {}) }));
    const hostId = this.hostId(except);
    const hostAttachment = this.joined(except).find((a) => a.id === hostId);
    const actingKey = hostAttachment ? keyOf(hostAttachment) : null;
    let hostHere = false;
    for (const ws of this.openSockets(except)) {
      const a = ws.deserializeAttachment() as Attachment | null;
      if (!a?.name || a.tv) continue;
      const isHost = keyOf(a) === actingKey;
      if (isHost) hostHere = true;
      this.sendTo(ws, { t: 'knocks', list: isHost ? list : [] });
    }
    for (const ws of this.openSockets(except)) {
      const a = ws.deserializeAttachment() as Attachment | null;
      if (a?.knock && !a.name) this.sendTo(ws, { t: 'knock-wait', hostHere });
    }
  }

  /** R12: the host lets someone in (they finish joining now) or refuses them (banned like a kick). */
  private async answerKnock(ws: WebSocket, id: string, allow: boolean): Promise<void> {
    if (!this.isHost(ws)) {
      this.sendTo(ws, { t: 'error', code: 'not_host' });
      return;
    }
    const target = this.openSockets().find((s) => {
      const a = s.deserializeAttachment() as Attachment | null;
      return a?.id === id && !!a.knock && !a.name;
    });
    if (target) {
      const a = target.deserializeAttachment() as Attachment;
      const knock = a.knock!;
      if (allow) {
        await this.admit24h(keyOf(a));
        delete a.knock;
        target.serializeAttachment(a);
        await this.join(target, a, knock.hello);
      } else {
        const keys = Object.keys(this.bans);
        if (keys.length >= MAX_BANS) delete this.bans[keys[0]!];
        this.bans[keyOf(a)] = { id: newId(), name: knock.name, ...(knock.avatar ? { avatar: knock.avatar } : {}) };
        await this.ctx.storage.put('bans', this.bans);
        this.sendTo(target, { t: 'error', code: 'kicked' });
        try {
          target.close(4003, 'kicked');
        } catch {
          // Already closed.
        }
        this.sendBans();
      }
    }
    this.sendKnocks(target && !allow ? target : undefined);
  }

  /** R12: this person may pass the door for a day (also refreshed whenever they join or leave). */
  private async admit24h(key: string): Promise<void> {
    const now = Date.now();
    for (const [k, at] of Object.entries(this.admitted)) if (now - at > ADMIT_TTL_MS) delete this.admitted[k];
    delete this.admitted[key];
    this.admitted[key] = now;
    const keys = Object.keys(this.admitted);
    for (const k of keys.slice(0, Math.max(0, keys.length - MAX_ADMITTED))) delete this.admitted[k];
    await this.ctx.storage.put('admitted', this.admitted);
  }

  /**
   * R11: a person's key for the other clients, the same for every tab (and paired TV) of one browser, different for two
   * browsers even with the same name and avatar. A hash of the browser id with a random salt kept by this room, so it
   * can't be turned back into the id or linked to the same person in another room.
   */
  private async personKeyFor(attachment: Attachment): Promise<string> {
    this.personSalt ??= (await this.ctx.storage.get<string>('personSalt')) ?? null;
    if (!this.personSalt) {
      this.personSalt = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
      await this.ctx.storage.put('personSalt', this.personSalt);
    }
    // R16 / R17: a person is the browser *and* the name (as kicks are: `banKey`): two names in one browser are two
    // people (the owner's "alperen" and "alperen 2" in one Chrome), the same name in its tabs / TV stays one.
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${this.personSalt}|${keyOf(attachment)}|n:${attachment.name ?? ''}`));
    return [...new Uint8Array(digest).slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /** Saved recaps live at most `RECAP_MAX_AGE_MS` (90 days): older ones leave storage on load and on each alarm, not
   * only when someone reads or saves one (security review 2, L8). */
  private async pruneRecaps(now: number): Promise<void> {
    const kept = freshRecaps(this.recaps, now);
    if (kept.length === this.recaps.length) return;
    this.recaps = kept;
    await this.ctx.storage.put('recaps', this.recaps);
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
  /** Security L2: one signal from `from` to `to`, counted per person and per pair (by browser, not connection). */
  private signalAllowed(from: Attachment, to: Attachment): boolean {
    return this.personSignalLimit.allow(keyOf(from)) && this.pairSignalLimit.allow(`${keyOf(from)}>${keyOf(to)}`);
  }

  /** Security L3: copies the members' wait cooldowns to their people (browsers). */
  private rememberWaitCooldowns(): void {
    const now = Date.now();
    for (const [key, until] of this.waitCooldowns) if (until <= now) this.waitCooldowns.delete(key);
    for (const [id, until] of this.waits.cooldowns()) {
      if (until <= now) continue;
      const a = this.joined().find((m) => m.id === id);
      if (a) this.waitCooldowns.set(keyOf(a), Math.max(until, this.waitCooldowns.get(keyOf(a)) ?? 0));
    }
  }

  /** Security L5: closes connections that have not said `hello` within UNJOINED_MS (except `keep`). */
  private closeUnjoined(now: number, keep?: WebSocket): void {
    for (const ws of this.openSockets()) {
      if (ws === keep) continue;
      const a = ws.deserializeAttachment() as Attachment | null;
      if (!a || a.name || a.openedAt === undefined || now - a.openedAt <= UNJOINED_MS) continue;
      if (a.knock && now - a.knock.at <= KNOCK_MAX_MS) continue;
      try {
        ws.close(a.knock ? 4011 : 4008, a.knock ? 'knock_timeout' : 'no_hello');
      } catch {
        // Already closed.
      }
    }
  }

  private async pruneStale(now: number): Promise<void> {
    this.lastPrune = now;
    this.closeUnjoined(now);
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
    for (const table of this.tables) if (table.emptyAt !== null) times.push(table.emptyAt + TABLE_EMPTY_MS);
    // BH8: HTTP fallback sessions that stop polling are closed in the alarm.
    const due = this.polls.nextDue();
    if (due !== null) times.push(due);
    if (times.length) await this.ctx.storage.setAlarm(Math.min(...times));
    else await this.ctx.storage.deleteAlarm();
  }

  /** Ana sayfadan kayıt kaldırma: sadece yöneticinin tarayıcı kimliğiyle. */
  /** Counts one chat image for today; false when the room's daily cap is used up. */
  private async countChatImage(): Promise<boolean> {
    const day = Math.floor(Date.now() / 86_400_000);
    if (this.chatImageDay.day !== day) this.chatImageDay = { day, count: 0 };
    if (this.chatImageDay.count >= CHAT_IMAGES_PER_DAY) return false;
    this.chatImageDay.count++;
    await this.ctx.storage.put('chatImageDay', this.chatImageDay);
    return true;
  }

  /** Keeps a chat image and sends its data to everyone (before the message that shows it). Returns its id. */
  private async storeChatImage(data: string): Promise<string> {
    const id = await stickerId(data);
    const known = this.chatImages.delete(id);
    // Sent again: it moves to the newest end (everyone here already has the data).
    this.chatImages.set(id, data);
    await this.ctx.storage.put({ [`chatimg:${id}`]: data, chatImages: [...this.chatImages.keys()] });
    if (!known) this.broadcast({ t: 'chat-image', id, data });
    return id;
  }

  /** Drops images whose messages left the chat history, and the oldest ones beyond MAX_CHAT_IMAGES. */
  private async pruneChatImages(): Promise<void> {
    const used = new Set(this.chat.flatMap((m) => (m.image ? [m.image] : [])));
    const drop = [...this.chatImages.keys()].filter((id) => !used.has(id));
    const kept = [...this.chatImages.keys()].filter((id) => used.has(id));
    drop.push(...kept.slice(0, Math.max(0, kept.length - MAX_CHAT_IMAGES)));
    if (drop.length === 0) return;
    for (const id of drop) this.chatImages.delete(id);
    await this.ctx.storage.delete(drop.map((id) => `chatimg:${id}`));
    await this.ctx.storage.put('chatImages', [...this.chatImages.keys()]);
  }

  /** Counts one custom emoji upload for today; false when the room's daily cap is used up. */
  private async countStickerAdd(): Promise<boolean> {
    const day = Math.floor(Date.now() / 86_400_000);
    if (this.stickerDay.day !== day) this.stickerDay = { day, count: 0 };
    if (this.stickerDay.count >= STICKER_ADDS_PER_DAY) return false;
    this.stickerDay.count++;
    await this.ctx.storage.put('stickerDay', this.stickerDay);
    return true;
  }

  private async unsaveFromHome(request: Request): Promise<Response> {
    // Capped like every body a room object reads (the Worker already refuses > 1 KB; this holds even without it).
    const text = await readCapped(request, 1024).catch(() => null);
    let body: { cid?: unknown } | null = null;
    try {
      body = text ? (JSON.parse(text) as { cid?: unknown }) : null;
    } catch {
      body = null;
    }
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
    // Herkes çıkıp bir dakikadan uzun boş kalan odada açık oyunlar da biter (dönen kişi eski oyunu bulmasın).
    if (this.tables.length && this.emptySince !== null && Date.now() - this.emptySince >= FREEZE_AFTER_MS) {
      this.tables = [];
      await this.ctx.storage.put('tables', this.tables);
    }
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
    if (hello.tv) {
      // A paired TV joins as its person's second device: their browser id (never sent to anyone), name and avatar.
      // R4-10: only while the TV is switched on (`TV=on`).
      const token = tvOn(this.env) ? this.tvTokens[hello.tv] : undefined;
      if (!token || Date.now() - token.at > TV_TOKEN_TTL_MS) {
        this.sendTo(ws, { t: 'error', code: 'tv_token' });
        ws.close(4006, 'tv_token');
        return;
      }
      token.at = Date.now();
      const owner = this.joined(ws).find((a) => keyOf(a) === token.key && !a.tv);
      if (owner) {
        token.name = owner.name;
        if (owner.avatar) token.avatar = owner.avatar;
      }
      await this.ctx.storage.put('tvTokens', this.tvTokens);
      attachment.cid = token.key.slice(2);
      attachment.tv = true;
      hello = { ...hello, name: token.name, ...(token.avatar ? { avatar: token.avatar } : {}) };
    } else {
      delete attachment.tv;
    }
    if (this.bans[keyOf(attachment)] || this.bans[banKey(attachment, hello.name)]) {
      this.sendTo(ws, { t: 'error', code: 'kicked' });
      ws.close(4003, 'kicked');
      return;
    }

    // R12: with "Ask before letting people in", a newcomer waits at the door until the host lets them in.
    if (await this.mustKnock(ws, attachment, hello)) return;
    await this.admit24h(keyOf(attachment));

    attachment.name = hello.name;
    attachment.pk = await this.personKeyFor(attachment);
    attachment.joinedAt ??= Date.now();
    if (hello.avatar) attachment.avatar = hello.avatar;
    else delete attachment.avatar;
    ws.serializeAttachment(attachment);

    // A reconnect replaces its previous connection right away (same browser id + the old member id): otherwise the
    // old one stayed in the room — with its frozen camera tile — until the stale check (up to 150 s).
    if (hello.prev && attachment.cid) {
      for (const other of this.openSockets(ws)) {
        const old = other.deserializeAttachment() as Attachment | null;
        if (old?.id !== hello.prev || old.cid !== attachment.cid) continue;
        try {
          other.close(4005, 'replaced');
        } catch {
          // Already closing.
        }
        await this.onLeave(other);
      }
      // Same browser as the one that had this id, and nobody holds it now: keep it.
      const given = this.memberIds[hello.prev];
      const taken = this.openSockets(ws).some((other) => (other.deserializeAttachment() as Attachment | null)?.id === hello.prev);
      if (given?.cid === attachment.cid && Date.now() - given.at < MEMBER_ID_TTL_MS && !taken) {
        attachment.id = hello.prev;
        ws.serializeAttachment(attachment);
      }
    }
    await this.rememberMemberId(attachment);
    // Yeni gelen, aslında kopmuş birini odada görmesin.
    await this.pruneStale(Date.now());
    await this.settleHost(ws, attachment);
    // Odaya ilk giren yönetici olur.
    if (this.hostKey === null) {
      this.hostKey = keyOf(attachment);
      await this.ctx.storage.put('host', this.hostKey);
    }

    await this.freshenTitles();
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
      ...(this.tables.length ? { game: this.tables.at(-1)!.game } : {}),
      tables: this.tables.map((t) => t.game),
    });
    // Özel emojiler tek tek (hepsi bir mesajda 1 MB sınırını aşabilir).
    // The person who added an emoji gets `mine` so they can remove it after a reload (the owner key itself never leaves).
    const myKey = keyOf(attachment);
    for (const [id, data] of this.stickers) {
      this.sendTo(ws, { t: 'sticker', sticker: { id, data }, ...(this.stickerOwners[id] === myKey ? { mine: true } : {}) });
    }
    // Chat images of the history, one per message (the 1 MB limit again).
    for (const [id, data] of this.chatImages) this.sendTo(ws, { t: 'chat-image', id, data });
    if (this.tipJar.fill || this.tipJar.boost) this.sendTo(ws, { t: 'tipjar', fill: this.tipJar.fill, size: TIP_JAR_SIZE, boost: this.tipJar.boost });
    this.broadcast({ t: 'members', members, hostId }, ws);
    this.sendBans();
    // R12: the host (any of their tabs) sees who is waiting at the door; those waiting learn a host is here.
    if (this.settings.knock || this.knockers().length) this.sendKnocks();
    // My phone / computer learns that my TV is here (and a phone joining later learns it too).
    if (attachment.tv) for (const other of this.personSockets(myKey, ws)) this.sendTo(other, { t: 'tv', op: 'present', value: true });
    else if (this.tvSockets(myKey).length) this.sendTo(ws, { t: 'tv', op: 'present', value: true });
  }

  private async rememberMemberId(attachment: Attachment): Promise<void> {
    if (!attachment.cid) return;
    const now = Date.now();
    for (const [id, entry] of Object.entries(this.memberIds)) if (now - entry.at > MEMBER_ID_TTL_MS) delete this.memberIds[id];
    delete this.memberIds[attachment.id];
    const ids = Object.keys(this.memberIds);
    for (const id of ids.slice(0, Math.max(0, ids.length - MAX_MEMBER_IDS + 1))) delete this.memberIds[id];
    this.memberIds[attachment.id] = { cid: attachment.cid, at: now };
    await this.ctx.storage.put('memberIds', this.memberIds);
  }

  /** My TV connections (`key` = keyOf of the person). */
  private tvSockets(key: string, except?: WebSocket): WebSocket[] {
    return this.openSockets(except).filter((s) => {
      const a = s.deserializeAttachment() as Attachment | null;
      return !!a?.name && a.tv === true && keyOf(a) === key;
    });
  }

  /** My other (not TV) connections: phone, computer, film page. */
  private personSockets(key: string, except?: WebSocket): WebSocket[] {
    return this.openSockets(except).filter((s) => {
      const a = s.deserializeAttachment() as Attachment | null;
      return !!a?.name && !a.tv && keyOf(a) === key;
    });
  }

  /**
   * Pair the TV showing `code` to me: a fresh link token goes to the TV through its waiting object (`TvLink`); the TV
   * then joins this room with it. Only a person with a browser id can pair (the TV becomes "them").
   */
  private async linkTv(ws: WebSocket, attachment: Attachment, me: Joined, code: string): Promise<void> {
    if (attachment.tv || !attachment.cid || !tvOn(this.env)) return this.sendTo(ws, { t: 'error', code: 'tv_code' });
    const key = keyOf(attachment);
    if (!this.tvLinkLimit.allow(key)) return this.sendTo(ws, { t: 'error', code: 'rate_limited' });
    const token = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
    const now = Date.now();
    for (const [old, entry] of Object.entries(this.tvTokens)) if (now - entry.at > TV_TOKEN_TTL_MS) delete this.tvTokens[old];
    const keys = Object.keys(this.tvTokens);
    if (keys.length >= MAX_TV_TOKENS) delete this.tvTokens[keys[0]!];
    this.tvTokens[token] = { key, name: me.name, ...(me.avatar ? { avatar: me.avatar } : {}), at: now };
    const room = this.roomId;
    const delivered = room
      ? await this.env.TVLINKS.get(this.env.TVLINKS.idFromName(code))
          .fetch('https://tv/deliver', { method: 'POST', body: JSON.stringify({ room, token }) })
          .then((r) => r.ok)
          .catch(() => false)
      : false;
    if (!delivered) {
      delete this.tvTokens[token];
      return this.sendTo(ws, { t: 'error', code: 'tv_code' });
    }
    await this.ctx.storage.put('tvTokens', this.tvTokens);
    this.sendTo(ws, { t: 'tv', op: 'linked' });
  }

  /**
   * Phone ⇄ TV: from my phone / computer to my TV(s), from my TV to my other connections; never to anyone else.
   * `unlink` from the phone also drops my link tokens (the TV can't come back without a new code).
   */
  private async relayTv(ws: WebSocket, attachment: Attachment, op: TvOp, value?: number | boolean): Promise<void> {
    const key = keyOf(attachment);
    if (!this.tvLimit.allow(attachment.id)) return;
    const message: ServerMessage = value === undefined ? { t: 'tv', op } : { t: 'tv', op, value };
    if (attachment.tv) {
      for (const other of this.personSockets(key)) this.sendTo(other, message);
      return;
    }
    if (op === 'unlink') {
      let changed = false;
      for (const [token, entry] of Object.entries(this.tvTokens)) {
        if (entry.key !== key) continue;
        delete this.tvTokens[token];
        changed = true;
      }
      if (changed) await this.ctx.storage.put('tvTokens', this.tvTokens);
    }
    for (const tv of this.tvSockets(key)) this.sendTo(tv, message);
  }

  /**
   * Opens a game table (at most MAX_TABLES; the game itself runs in its own object under a new id). One table per
   * person: opening another replaces my old one if nobody else has it open, otherwise `table_own`.
   */
  private async openTable(ws: WebSocket, attachment: Attachment, me: Member, kind: RoomGameKind): Promise<void> {
    const key = keyOf(attachment);
    const old = this.tables.find((t) => t.owner === key);
    if (old) {
      const others = this.joined().some((a) => a.table === old.game.id && keyOf(a) !== key);
      if (others) return this.sendTo(ws, { t: 'error', code: 'table_own' });
      this.dropTable(old.game.id);
    }
    if (this.tables.length >= MAX_TABLES) return this.sendTo(ws, { t: 'error', code: 'tables_full' });
    const game: RoomGame = { kind, id: newId(), by: me, at: Date.now() };
    // Counts as empty until someone opens it (the opener does at once).
    this.tables.push({ game, owner: key, emptyAt: Date.now() });
    await this.saveTables();
    this.broadcast({ t: 'tables', tables: this.tables.map((t) => t.game), opened: game.id, by: me });
    // Old clients follow the newest table.
    this.broadcast({ t: 'game', game });
  }

  /** Closes a table: its opener or the host. People at it are sent back (their clients close the game). */
  private async closeTable(ws: WebSocket, attachment: Attachment, me: Member, id: string): Promise<void> {
    const table = this.tables.find((t) => t.game.id === id);
    if (!table) return;
    if (table.owner !== keyOf(attachment) && !this.isHost(ws)) return this.sendTo(ws, { t: 'error', code: 'not_host' });
    this.dropTable(id);
    await this.saveTables();
    this.broadcast({ t: 'tables', tables: this.tables.map((t) => t.game), closed: id, by: me });
    this.broadcast(this.tables.length ? { t: 'game', game: this.tables.at(-1)!.game } : { t: 'game', game: null, by: me });
    this.broadcast(this.membersMessage());
  }

  /** Removes a table and the "at this table" marks (without saving or telling anyone). */
  private dropTable(id: string): void {
    this.tables = this.tables.filter((t) => t.game.id !== id);
    for (const socket of this.openSockets()) {
      const a = socket.deserializeAttachment() as Attachment | null;
      if (a?.table !== id) continue;
      delete a.table;
      socket.serializeAttachment(a);
    }
  }

  /** "I have this table open" (or none): shown in the hub; a table nobody has open closes after TABLE_EMPTY_MS. */
  private async setAt(ws: WebSocket, attachment: Attachment, table: string | null): Promise<void> {
    if (table !== null && !this.tables.some((t) => t.game.id === table)) return;
    if ((attachment.table ?? null) === table) return;
    if (table === null) delete attachment.table;
    else attachment.table = table;
    ws.serializeAttachment(attachment);
    this.broadcast(this.membersMessage());
    await this.markEmptyTables();
  }

  /** Updates when each table became empty (nobody has it open); saves and re-arms the alarm when that changed. */
  private async markEmptyTables(except?: WebSocket): Promise<void> {
    const used = new Set(this.joined(except).flatMap((a) => (a.table ? [a.table] : [])));
    let changed = false;
    for (const table of this.tables) {
      const emptyAt = used.has(table.game.id) ? null : (table.emptyAt ?? Date.now());
      if (emptyAt !== table.emptyAt) {
        table.emptyAt = emptyAt;
        changed = true;
      }
    }
    if (!changed) return;
    await this.saveTables();
    await this.scheduleAlarm();
  }

  /** Closes tables nobody has had open for TABLE_EMPTY_MS. */
  private async closeEmptyTables(now: number): Promise<void> {
    const old = this.tables.filter((t) => t.emptyAt !== null && now - t.emptyAt >= TABLE_EMPTY_MS);
    if (!old.length) return;
    for (const table of old) {
      this.dropTable(table.game.id);
      this.broadcast({ t: 'tables', tables: this.tables.map((t) => t.game), closed: table.game.id });
    }
    await this.saveTables();
    this.broadcast(this.tables.length ? { t: 'game', game: this.tables.at(-1)!.game } : { t: 'game', game: null });
  }

  private async saveTables(): Promise<void> {
    await this.ctx.storage.put('tables', this.tables);
  }

  /** Sesli sohbete katıl / ayrıl / mikrofonu aç-kapa (bağlantı başına; herkese `members` gider). */
  private async setVoice(ws: WebSocket, attachment: Attachment, on: boolean, mic?: boolean, cam?: boolean, switching?: boolean): Promise<void> {
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
        // CAM1: "camera changing…" lasts only while the camera is on; every other voice message clears it.
        if (cam && switching) attachment.voice.switching = true;
        else delete attachment.voice.switching;
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
      if (this.settings.liveHostOnly && !this.isHost(ws)) return this.sendTo(ws, { t: 'error', code: 'live_host' });
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

  /**
   * Yöneticinin "yayını durdur"u (ya da "sadece yönetici yayın açsın" açılınca başkasının yayını): yayıncıya
   * `live_stopped` gider (görüntüsünü kapatır), izleyiciler bırakılır.
   */
  private stopLive(onlyOthers = false): void {
    for (const socket of this.openSockets()) {
      const a = socket.deserializeAttachment() as Attachment | null;
      if (!a?.live || (onlyOthers && this.isHost(socket))) continue;
      delete a.live;
      socket.serializeAttachment(a);
      this.sendTo(socket, { t: 'error', code: 'live_stopped' });
      this.clearWatchers();
      this.broadcast(this.membersMessage());
    }
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

  /**
   * The host hands the role to someone in the room (0.9.93.2, owner): it goes to that person (all their tabs, by
   * browser), for good, as if they had made the room; the old host becomes a guest. Not to a TV (it is its person).
   */
  private async makeHost(ws: WebSocket, targetId: string): Promise<void> {
    // Security M2: only the real host may hand the role on. During the host's reload grace (HOST_GRACE_MS) the oldest
    // guest acts as host, but must not be able to make that permanent for themselves.
    const me = ws.deserializeAttachment() as Attachment | null;
    if (!this.isHost(ws) || !me || keyOf(me) !== this.hostKey) return this.sendTo(ws, { t: 'error', code: 'not_host' });
    const target = this.joined().find((a) => a.id === targetId);
    if (!target || target.tv || keyOf(target) === this.hostKey) return;
    this.hostKey = keyOf(target);
    await this.ctx.storage.put('host', this.hostKey);
    await this.setHostGone(null);
    this.broadcast(this.membersMessage());
    // BH4: the new host gets the list of people removed (else they could not let anyone back in until a reload).
    this.sendBans();
    // BH3: the knock cards move to the new host (the old one's empty).
    if (this.knockers().length) this.sendKnocks();
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
      this.rememberWaitCooldowns();
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
      // YouTube 2x'ten hızlı oynatmaz, TikTok hep 1×: önceki videodan kalan yüksek hız düşürülür.
      const max = maxRateFor(opened.media);
      if (this.room.state.rate > max) this.room = { ...this.room, state: { ...this.room.state, rate: max } };
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
    await this.countdown(now, resumed !== undefined);
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
   * "3-2-1, together" (0.9.93.2, owner): the first time an item starts playing from its beginning, with two or more
   * people (by browser, TVs aside), it starts COUNTDOWN_MS later for everyone: `updatedAt` lies ahead, the engines hold
   * the player at the start until then (it buffers meanwhile) and every page shows the countdown. Not for Shorts /
   * TikTok / film pages / the sync test (`countdownMedia`), a video that resumes where it was left, or when the host
   * turned it off. Each item gets it once (`counted`).
   */
  private async countdown(now: number, resumed: boolean): Promise<void> {
    const state = this.room.state;
    const item = state.item;
    if (!item || state.paused || item.id === this.counted) return;
    this.counted = item.id;
    await this.ctx.storage.put('counted', item.id);
    if (resumed || this.settings.countdown === false || !countdownMedia(item.media) || expectedPosition(state, now) > 1) return;
    const people = new Set(this.joined().filter((a) => !a.tv).map((a) => keyOf(a)));
    if (people.size < 2) return;
    this.room = { ...this.room, state: { ...state, position: Math.max(0, expectedPosition(state, now)), updatedAt: now + COUNTDOWN_MS } };
  }

  /**
   * Sıradaki bir öğeye oy ver / geri al. Sıra oya göre (çok olan önde) yeniden dizilir; eşit
   * oydakiler eklenme sırasını korur. Sıradakine geçişte en çok oy alan oynar.
   */
  private async vote(key: string, itemId: string, up: boolean): Promise<void> {
    if (!this.room.queue.some((q) => q.id === itemId)) return;
    // Only people in the room count, at most `MAX_MEMBERS` per item (security review 2, M1: the list used to grow
    // without a cap until the storage value limit froze the queue).
    const present = new Set(this.joined().map((a) => keyOf(a)));
    const list = new Set((this.voters[itemId] ?? []).filter((k) => present.has(k)));
    if (up) list.add(key);
    else list.delete(key);
    this.voters[itemId] = [...list].slice(-MAX_MEMBERS);
    const order = new Map(this.room.queue.map((q, i) => [q.id, i]));
    const queue = this.room.queue
      .map((q) => ({ ...q, votes: this.voters[q.id]?.length ?? 0 }))
      .sort((a, b) => b.votes - a.votes || order.get(a.id)! - order.get(b.id)!);
    this.room = { ...this.room, queue };
    await this.ctx.storage.put({ room: this.room, voters: this.voters });
    this.broadcast({ t: 'queue', queue: this.room.queue, change: null });
  }

  /**
   * Card Y2 (YouTube Developer Policies: non-authorized data at most 30 days): drops stored YouTube titles older than
   * 30 days (or of unknown age) from the room, the recently played list and saved recaps, then looks the playing item's
   * and the next few queued items' titles up again. Runs when someone joins; a room nobody joins keeps nothing visible.
   */
  private async freshenTitles(): Promise<void> {
    const now = Date.now();
    const room = freshRoom(this.room, now);
    const played = this.played.map((p) => freshItem(p, now));
    const playedChanged = played.some((p, i) => p !== this.played[i]);
    const recaps = this.recaps.map((r) => (now - r.to > TITLE_MAX_AGE_MS && r.titles.length ? { ...r, titles: [] } : r));
    const recapsChanged = recaps.some((r, i) => r !== this.recaps[i]);
    if (room !== this.room) {
      this.room = room;
      await this.ctx.storage.put('room', this.room);
    }
    if (playedChanged) {
      this.played = played;
      await this.ctx.storage.put('played', this.played);
    }
    if (recapsChanged) {
      this.recaps = recaps;
      await this.ctx.storage.put('recaps', this.recaps);
    }
    for (const [key, value] of this.titles) if (now - value.at > TITLE_MAX_AGE_MS) this.titles.delete(key);
    const refill = [this.room.state.item, ...this.room.queue.slice(0, 10)].filter((i): i is QueueItem => !!i && i.media.kind === 'youtube' && i.title === null);
    for (const item of refill) void this.fillTitle(item);
  }

  private makeItem(media: Media, me: Member, givenTitle: string | null): QueueItem {
    const cached = this.titles.get(titleKey(media));
    if (givenTitle !== null) return { id: newId(), media, title: withHost(media, givenTitle), by: me.name };
    if (cached && Date.now() - cached.at <= TITLE_MAX_AGE_MS) return { id: newId(), media, title: cached.title, titleAt: cached.at, by: me.name };
    return { id: newId(), media, title: null, by: me.name };
  }

  /** Başlığı bulur, odadaki öğeye yazar ve herkese bildirir. */
  private async fillTitle(item: QueueItem): Promise<void> {
    const key = titleKey(item.media);
    const cached = this.titles.get(key);
    const fresh = cached && Date.now() - cached.at <= TITLE_MAX_AGE_MS ? cached : null;
    if (fresh && item.title === fresh.title) return;
    const title = fresh?.title ?? (await resolveTitle(item.media));
    // Card Y3: a YouTube title lookup that reached YouTube's oEmbed counts for the quota form (0 units).
    if (!fresh && item.media.kind === 'youtube') void recordUsage(this.env, 'oembed', { oembed: 1 });
    // Bulunamadıysa hatırlama: geçici bir ağ sorunu olabilir, bir dahaki sefere tekrar denensin.
    if (title === null) return;
    const at = fresh?.at ?? Date.now();
    if (!fresh) {
      if (this.titles.size > 500) this.titles.clear();
      this.titles.set(key, { title, at });
    }
    // Beklerken oda değişmiş olabilir; güncel duruma uygula.
    const next = setItemTitle(this.room, item.id, title, at);
    if (next === null) return;
    this.room = next;
    await this.ctx.storage.put('room', this.room);
    this.stats.title(item.id, title);
    await this.saveStats();
    this.broadcast({ t: 'title', itemId: item.id, title });
  }

  /**
   * R13: a private message goes to the person's own connections (not their TV) and back to mine; never into the
   * room's history, the recap or anyone else's socket.
   */
  private sendPrivate(ws: WebSocket, me: Member, toId: string, text: string): void {
    // R16: by person (browser + name), so another name in the same browser is someone else, not myself.
    const mine = (ws.deserializeAttachment() as Attachment).pk;
    const target = this.joined().find((a) => a.id === toId && !a.tv);
    if (!target || !mine || target.pk === mine) {
      this.sendTo(ws, { t: 'error', code: 'private_gone' });
      return;
    }
    const theirs = target.pk;
    const message: ChatMessage = { id: newId(), text, by: me, at: Date.now(), to: memberOf(target) };
    for (const socket of this.openSockets()) {
      const a = socket.deserializeAttachment() as Attachment | null;
      if (!a?.name || a.tv || a.knock) continue;
      if (a.pk === mine || a.pk === theirs) this.sendTo(socket, { t: 'chat', message });
    }
  }

  private async addChat(message: ChatMessage): Promise<void> {
    this.chat = [...this.chat, message].slice(-CHAT_HISTORY);
    await this.ctx.storage.put('chat', this.chat);
    this.broadcast({ t: 'chat', message });
    if (message.image || this.chatImages.size) await this.pruneChatImages();
  }

  private async onLeave(leaving: WebSocket): Promise<void> {
    const attachment = leaving.deserializeAttachment() as Attachment | null;
    if (attachment) {
      for (const limiter of [this.commandLimit, this.chatLimit, this.rtcLimit, this.signalLimit, this.tvLimit]) limiter.forget(attachment.id);
      // Kişi başı tutulanlar: aynı tarayıcının başka bağlantısı kalmadıysa unutulur.
      const key = keyOf(attachment);
      if (!this.joined(leaving).some((other) => keyOf(other) === key)) {
        this.reactionLimit.forget(key);
        this.homeLimit.forget(key);
        this.lastReaction.delete(key);
      }
      // Security L3: their wait cooldown stays with the person after they leave.
      const until = this.waits.cooldowns().find(([id]) => id === attachment.id)?.[1] ?? 0;
      if (until > Date.now()) this.waitCooldowns.set(keyOf(attachment), Math.max(until, this.waitCooldowns.get(keyOf(attachment)) ?? 0));
      this.waits.remove(attachment.id);
      // My TV left: my phone / computer stops showing it as connected.
      if (attachment.tv && attachment.name && !this.tvSockets(key, leaving).length) {
        for (const other of this.personSockets(key, leaving)) this.sendTo(other, { t: 'tv', op: 'present', value: false });
      }
      // Yayıncı çıktı: yayın biter, izleyiciler bırakılır.
      if (attachment.live) this.clearWatchers(leaving);
      // Yöneticinin son bağlantısı gittiyse saymaya başla (bkz. settleHost).
      if (attachment.name && key === this.hostKey && this.hostGoneAt === null && !this.joined(leaving).some((a) => keyOf(a) === key)) {
        await this.setHostGone(Date.now());
      }
    }
    this.broadcast(this.membersMessage(leaving), leaving);
    // R12: a knocker gave up, or the host left (those waiting learn nobody can answer now).
    if (attachment?.knock || (attachment?.name && this.knockers(leaving).length)) this.sendKnocks(leaving);
    if (attachment?.name && this.settings.knock) await this.admit24h(keyOf(attachment));
    if (attachment?.table) await this.markEmptyTables(leaving);
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
    return [...this.ctx.getWebSockets(), ...this.polls.sockets()].filter((ws) => ws !== except && ws.readyState === WebSocket.OPEN);
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
  'ping' | 'hello' | 'tv-link' | 'tv' | 'vote' | 'recap' | 'recap-save' | 'recaps' | 'home' | 'tip' | 'lab' | 'gift' | 'voice' | 'rtc' | 'signal' | 'live' | 'live-watch' | 'live-stop' | 'live-signal' | 'game' | 'table' | 'at' | 'react' | 'sticker-add' | 'sticker-remove' | 'sticker-clear' | 'pin' | 'unpin' | 'chat' | 'rename' | 'kick' | 'knock-answer' | 'make-host' | 'unban' | 'ready' | 'settings' | 'load' | 'enqueue' | RoomAction['t']
>;
const _exhaustive: [_Handled] extends [never] ? true : never = true;
void _exhaustive;

/**
 * Security L4: a film page's title is chosen by the person who opened it, so its site's name goes with it ("Title ·
 * site.example"), and nobody can make a page look like it is somewhere else.
 */
function withHost(media: Media, title: string): string {
  if (media.kind !== 'page') return title;
  let host = '';
  try {
    host = new URL(media.url).hostname.replace(/^www\./, '');
  } catch {
    return title;
  }
  if (!host || title.toLowerCase().includes(host.toLowerCase())) return title;
  return cleanTitle(`${title} · ${host}`) ?? title;
}
