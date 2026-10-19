// Sunucu ile istemciler (site ve ileride eklenti) arasındaki mesaj formatı.
// Bu dosya hem tarayıcıda hem Cloudflare sunucusunda çalışır, bu yüzden
// DOM'a veya Node'a özel hiçbir şey kullanmaz.

export const PROTOCOL_VERSION = 3;

export const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{4,32}$/;
export const NAME_MAX_LENGTH = 32;
export const CHAT_MAX_LENGTH = 300;
export const QUEUE_MAX_LENGTH = 100;
export const MIN_RATE = 0.25;
export const MAX_RATE = 2;
/** Bir mesajın en fazla kaç bayt olabileceği (kötü niyetli büyük mesajlara karşı). */
export const MAX_MESSAGE_BYTES = 4096;
/**
 * Emoji tepkileri, sekizli sayfalar halinde (arayüzde ↑↓ ile sayfa değişir).
 * İlk sayfa her zamanki; sonrakiler daha absürt/eğlenceli. Sunucu listede
 * olmayanı kabul etmez. Sona sayfa eklemek eski istemcileri bozmaz.
 */
export const REACTION_PAGES = [
  ['😂', '😮', '😍', '😱', '👏', '🔥', '😢', '💀'],
  ['🤮', '💩', '🥵', '🤡', '🤯', '😴', '🙄', '🥴'],
  ['😡', '🍿', '🎉', '👀', '💔', '🙏', '😈', '👻'],
] as const;

export const REACTIONS = REACTION_PAGES.flat();

export type Reaction = (typeof REACTION_PAGES)[number][number];

/**
 * Çizilmiş avatarlar (public/avatars/<kimlik>.svg; scripts/avatars.mjs çizer). Değer,
 * metin geçen yerlerde (sohbet satırı, bildirim) kullanılan emoji karşılığı.
 */
export const DRAWN_AVATARS = {
  astronaut: '🧑‍🚀',
  alien: '👽',
  cyber: '🕶️',
  wizard: '🧙',
  warrior: '⚔️',
  elf: '🧝',
  dwarf: '⛏️',
  janissary: '🎖️',
  horseman: '🏹',
  veiled: '🧕',
  scientist: '🧪',
  sidekick: '😰',
  chemist: '⚗️',
  lawyer: '⚖️',
  swordsman: '🗡️',
  sorceress: '🧙‍♀️',
  netrunner: '👩‍💻',
  strawhat: '👒',
  cook: '🍳',
  greenblade: '🍃',
  hunter: '🐺',
  hacker: '💻',
  dragonqueen: '🐉',
  jester: '🃏',
  nightguard: '🦇',
  catburglar: '🐈‍⬛',
  goth: '🖤',
  cavecreature: '💍',
  earthgirl: '🪨',
  airmonk: '🌀',
  waterfriend: '💧',
  sponge: '🧽',
  starfish: '⭐',
  squid: '🦑',
  pinecap: '🌲',
  sweaterkid: '🧶',
  cartoonist: '✏️',
  armadillo: '🐾',
  wizardboy: '⚡',
  redhead: '🍫',
  wizardgirl: '📚',
  director: '🎬',
  diva: '🎭',
  driver: '🚗',
  captain: '⚓',
  conductor: '🚂',
} as const;

export type DrawnAvatar = keyof typeof DRAWN_AVATARS;

/**
 * Avatar sayfaları: 0) temalara ait karakterler, 1) hayvanlar (emoji), 2-4) parodiler
 * (sadece tarzı andırır, isim yok): film, dizi, anime. Sunucu bunların dışındakini kabul
 * etmez; yeni avatar eklemek eski istemcileri bozmaz (onlarda emoji yerine kimlik görünür).
 */
export const AVATAR_PAGES = [
  [
    'astronaut', 'alien', 'cyber', 'netrunner', 'wizard', 'sorceress', 'warrior', 'elf', 'dwarf',
    'janissary', 'horseman', 'veiled', 'director', 'diva', 'driver', 'captain', 'conductor',
  ],
  ['🦊', '🐼', '🐸', '🐯', '🐨', '🐙', '🦄', '🐧', '🐵', '🐶', '🐱', '🦁', '🐻', '🐰', '🐲', '👽'],
  ['hacker', 'jester', 'nightguard', 'catburglar', 'cavecreature', 'wizardboy', 'redhead', 'wizardgirl'],
  [
    'scientist', 'sidekick', 'chemist', 'lawyer', 'hunter', 'dragonqueen', 'goth',
    'sponge', 'starfish', 'squid', 'pinecap', 'sweaterkid', 'cartoonist', 'armadillo',
  ],
  ['strawhat', 'swordsman', 'cook', 'greenblade', 'airmonk', 'waterfriend', 'earthgirl'],
] as const;

/**
 * Seçicideki sekmeler: Temalı, Hayvanlar, Parodi; Parodi'nin altında Film / Dizi / Anime.
 * Her sekme AVATAR_PAGES'teki sayfa numaralarını tutar.
 */
export const AVATAR_TABS = [
  { key: 'theme', pages: [0] },
  { key: 'animals', pages: [1] },
  { key: 'parody', pages: [2, 3, 4], subs: ['film', 'series', 'anime'] },
] as const;

/** Avatarın bulunduğu sayfa (yoksa 0). */
export function avatarPageOf(avatar: string | null | undefined): number {
  return Math.max(0, AVATAR_PAGES.findIndex((p) => (p as readonly string[]).includes(avatar ?? '')));
}

export const AVATARS = AVATAR_PAGES.flat();

export type Avatar = (typeof AVATAR_PAGES)[number][number];

export function isAvatar(x: unknown): x is Avatar {
  return typeof x === 'string' && (AVATARS as readonly string[]).includes(x);
}

export function isDrawnAvatar(x: unknown): x is DrawnAvatar {
  return typeof x === 'string' && Object.prototype.hasOwnProperty.call(DRAWN_AVATARS, x);
}

/** Metin içinde gösterilecek hali: çizilmiş avatarın emoji karşılığı, hayvanın kendisi. */
export function avatarText(avatar: string | undefined | null): string {
  if (!avatar) return '';
  return isDrawnAvatar(avatar) ? DRAWN_AVATARS[avatar] : avatar;
}

/** Yeni gelen için rastgele: tematik karakterler ve hayvanlardan. */
export function randomAvatar(): Avatar {
  const pool = [...AVATAR_PAGES[0], ...AVATAR_PAGES[1]];
  return pool[Math.floor(Math.random() * pool.length)]!;
}

export const TITLE_MAX_LENGTH = 200;

export type Media =
  | { kind: 'youtube'; id: string }
  /** Doğrudan video dosyası (.mp4 vb.); sitede oynar. */
  | { kind: 'html5'; url: string }
  /** Videonun içinde olduğu bir web sayfası; eklentiyle, herkes kendi sekmesinde açarak izler. */
  | { kind: 'page'; url: string }
  /** Senkron testi: sitenin çizdiği 12 sn'lik sayaç (dosya yok); iki ekran aynı sayıyı göstermeli. */
  | { kind: 'test' };

/** Sıradaki ya da şu an oynayan bir video. */
export interface QueueItem {
  id: string;
  media: Media;
  /** Sunucunun bulduğu başlık (bulamazsa null). */
  title: string | null;
  /** Ekleyen kişinin adı. */
  by: string;
  /** Sıradakiler için 👍 sayısı (sıra buna göre dizilir; yoksa 0). */
  votes?: number;
}

/**
 * Odanın oynatma durumu. Sunucu tutar, herkes buna uyar.
 * `position`, `updatedAt` anındaki saniyedir. Video oynuyorsa o andan
 * beri geçen süre eklenerek şu anki konum hesaplanır (bkz. expectedPosition).
 */
export interface PlaybackState {
  item: QueueItem | null;
  paused: boolean;
  position: number;
  rate: number;
  /** Sunucu saatine göre milisaniye. */
  updatedAt: number;
}

/** Bağlantının nereden geldiği: sitedeki oda sayfası mı, eklentiyle film sayfası mı. */
export type ClientKind = 'web' | 'ext';

export interface Member {
  id: string;
  name: string;
  /** Eski istemciler avatar yollamaz; o zaman yoktur. */
  avatar?: Avatar;
  /** 'ext': eklentiyle bir sayfada (filmde) izliyor. Eski istemcilerde yok (site sayılır). */
  client?: ClientKind;
}

export interface RoomSettings {
  /** Videosu takılan biri olduğunda oda onu kısa süre beklesin mi? */
  waitForAll: boolean;
  /** Sadece yönetici oynat/durdur/sar/hız/yeni video yapabilsin (sıradakine geçiş herkese açık). */
  hostOnly?: boolean;
  /** Sıraya ekleme/silme/taşıma sadece yöneticide (oylama serbest). */
  lockQueue?: boolean;
  /** Planlı başlangıç (sunucu saati, ms): o an gelince oda kendiliğinden oynar. */
  startsAt?: number;
  /** Video bitince sıradakine kendiliğinden geçilsin mi? (yoksa açık; false: "başlat" düğmesi çıkar) */
  autoNext?: boolean;
  /** Kaydedilmiş oda: 30 gün saklanır, videoların kaldığı yer ve pinleri hatırlanır. */
  saved?: boolean;
}

/** Odadan çıkarılmış (yasaklı) biri. `id` yasağı kaldırmak içindir; tarayıcı kimliği gizli kalır. */
export interface BanEntry {
  id: string;
  name: string;
  avatar?: Avatar;
}

/** Oda adına yapılan (kişiden gelmeyen) hareketlerin "yapanı". */
export const SYSTEM_MEMBER_ID = 'system';

export interface ChatMessage {
  id: string;
  text: string;
  by: Member;
  /** Sunucu saati (ms). */
  at: number;
}

export type PlaybackAction = 'load' | 'next' | 'play' | 'pause' | 'seek' | 'rate';

export type QueueChange =
  | { kind: 'add'; item: QueueItem; by: Member }
  | { kind: 'remove'; item: QueueItem; by: Member }
  | { kind: 'move'; item: QueueItem; by: Member };

/** İstemci → sunucu. `at`, istemcinin tahmin ettiği sunucu saatidir. */
export type ClientMessage =
  /**
   * `cid`: tarayıcıda saklanan kalıcı kimlik. Sayfa yenilense de aynı kalır;
   * oda yöneticisinin yenileyince yöneticiliği kaybetmemesi ve atılan kişinin
   * hemen geri girememesi için kullanılır. Hesap değildir, sadece rastgele bir kod.
   */
  | { t: 'hello'; v: number; name: string; avatar?: Avatar; cid?: string; client?: ClientKind }
  /** İsim ya da avatar değiştir. */
  | { t: 'rename'; name: string; avatar?: Avatar }
  /** (Sadece oda yöneticisi) birini odadan çıkar; yönetici kaldırana kadar geri giremez. */
  | { t: 'kick'; id: string }
  /** (Sadece oda yöneticisi) bir yasağı kaldır (`id`: BanEntry.id). */
  | { t: 'unban'; id: string }
  /**
   * "Herkes hazır": videom takıldı (ready=false) ya da tekrar oynayabilir (ready=true).
   * Sunucu takılan biri olduğunda odayı kısa süre bekletir.
   */
  | { t: 'ready'; ready: boolean }
  /** (Sadece oda yöneticisi) oda ayarlarını değiştir. */
  /** Yalnızca gelen alanlar değişir; startsAt: null planı kaldırır. */
  | { t: 'settings'; waitForAll?: boolean; hostOnly?: boolean; lockQueue?: boolean; autoNext?: boolean; saved?: boolean; startsAt?: number | null }
  /** Sıradaki bir videoya oy ver (up) ya da oyunu geri al. */
  | { t: 'vote'; id: string; up: boolean }
  | { t: 'ping'; c: number }
  /** Hemen aç (şu an oynayanın yerine). `title` sadece sayfalar için kullanılır (sekmenin başlığı). */
  | { t: 'load'; media: Media; title?: string }
  /** Sıraya ekle. Oda boşsa hemen açılır. */
  | { t: 'enqueue'; media: Media; title?: string }
  | { t: 'dequeue'; id: string }
  | { t: 'move'; id: string; to: number }
  /** Sıradaki bir öğeyi hemen oynat. */
  | { t: 'jump'; id: string }
  /** Sıradakine geç. `from`, geçilecek (şu an oynayan) öğenin ID'si; aynı anda gelen istekler bir kez uygulanır. */
  | { t: 'next'; from: string }
  | { t: 'play'; position: number; at: number }
  | { t: 'pause'; position: number; at: number }
  | { t: 'seek'; position: number; at: number }
  | { t: 'rate'; rate: number; position: number; at: number }
  | { t: 'react'; emoji: Reaction; sticker?: undefined }
  /** Odadaki bir özel emojiyle (GIF/resim) tepki ver. */
  | { t: 'react'; sticker: string; emoji?: undefined }
  /** Odaya özel emoji ekle (küçültülmüş resim ya da GIF, data: adresi). Kimliğini sunucu hesaplar. */
  | { t: 'sticker-add'; data: string }
  /** Özel emojiyi odadan kaldır (ekleyen ya da yönetici). */
  | { t: 'sticker-remove'; id: string }
  /** Videonun şu anını pinle (an'ı sunucu hesaplar); isteğe bağlı kısa not. */
  | { t: 'pin'; note?: string }
  /** Pini kaldır (kendi pinin ya da yöneticiysen herhangi biri). */
  | { t: 'unpin'; id: string }
  | { t: 'chat'; text: string };

export type ErrorCode =
  | 'bad_message'
  | 'not_joined'
  | 'version'
  | 'room_full'
  | 'rate_limited'
  | 'queue_full'
  /** Oda yöneticisi seni çıkardı (ya da kısa süre önce çıkarılmıştın). */
  | 'kicked'
  /** Bu işlem sadece oda yöneticisine açık. */
  | 'not_host'
  /** Odada açık sayfayı (filmi) hâlâ izleyenler var: herkes odaya dönmeden yeni video açılamaz. */
  | 'others_watching';

/** Sunucu → istemci. */
export type ServerMessage =
  | {
      t: 'welcome';
      you: string;
      state: PlaybackState;
      queue: QueueItem[];
      members: Member[];
      /** Oda yöneticisinin üye ID'si. */
      hostId: string | null;
      chat: ChatMessage[];
      /** Eski sunucular yollamaz. */
      settings?: RoomSettings;
      /** Şu an beklenenler (üye ID'leri). */
      waiting?: string[];
      /** Açık videonun pinlenmiş anları. */
      pins?: PinList;
    }
  | { t: 'pong'; c: number; s: number }
  | { t: 'state'; state: PlaybackState; action: PlaybackAction; by: Member; /** Kayıtlı odada video kaldığı yerden açıldıysa o saniye. */ resumed?: number }
  | { t: 'queue'; queue: QueueItem[]; change: QueueChange | null }
  /** Video beklemeden yayınlanır; başlığı sonradan bulununca bu mesaj gelir. */
  | { t: 'title'; itemId: string; title: string }
  | { t: 'members'; members: Member[]; hostId: string | null }
  /** Biri odadan çıkarıldı (herkese duyurulur). */
  | { t: 'kicked'; who: Member; by: Member }
  /** Yasaklılar listesi (sadece yöneticiye; değişince ve yönetici değişince gelir). */
  | { t: 'bans'; bans: BanEntry[] }
  /** Oda takılan birini bekliyor (boş liste: bekleme bitti). */
  | { t: 'waiting'; ids: string[] }
  | { t: 'settings'; settings: RoomSettings }
  /** emoji ya da sticker (odadaki özel emojinin kimliği) gelir. */
  | { t: 'reaction'; emoji?: Reaction; sticker?: string; by: Member }
  /** Odaya bir özel emoji eklendi (girişte de odadakiler tek tek gelir). */
  | { t: 'sticker'; sticker: Sticker }
  /** Bir özel emoji odadan kaldırıldı. */
  | { t: 'sticker-removed'; id: string }
  /** Açık videonun pinleri değişti (tam liste). */
  | { t: 'pins'; pins: PinList }
  | { t: 'chat'; message: ChatMessage }
  | { t: 'error'; code: ErrorCode };

/** Verilen sunucu saatinde videonun kaçıncı saniyede olması gerektiği. */
export function expectedPosition(state: PlaybackState, serverNow: number): number {
  if (state.paused) return state.position;
  const elapsed = Math.max(0, serverNow - state.updatedAt) / 1000;
  return state.position + elapsed * state.rate;
}

// ---- Doğrulama ----
// Sunucu, istemciden gelen hiçbir şeye körü körüne güvenmez. Geçerli bulunan
// veriler de yeni nesnelere kopyalanır; böylece fazladan alanlar sızmaz.

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const ITEM_ID = /^[A-Za-z0-9_-]{1,32}$/;
/** Tarayıcının kalıcı kimliği (bkz. hello.cid). */
export const CLIENT_ID = /^[A-Za-z0-9_-]{8,40}$/;

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function isPosition(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0 && x < 1e6;
}

function isTimestamp(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x > 0;
}

function isItemId(x: unknown): x is string {
  return typeof x === 'string' && ITEM_ID.test(x);
}

export function isValidRate(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= MIN_RATE && x <= MAX_RATE;
}

export function isReaction(x: unknown): x is Reaction {
  return typeof x === 'string' && (REACTIONS as readonly string[]).includes(x);
}

export function cleanName(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const name = x.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX_LENGTH);
  return name.length > 0 ? name : null;
}

/**
 * Özel emojiler (sticker): kullanıcının eklediği resim/GIF, `data:image/...;base64,` olarak.
 * Sadece raster biçimler (SVG yok: betik taşıyabilir). Oda başına en fazla MAX_STICKERS;
 * dolunca en eskisi gider. Kimlik verinin SHA-256 özetinin ilk 12 hanesi (iki taraf da hesaplar).
 */
export const STICKER_MAX_CHARS = 280_000;
export const MAX_STICKERS = 24;
const STICKER_DATA = /^data:image\/(?:png|gif|webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;
const STICKER_ID = /^[0-9a-f]{12}$/;

export interface Sticker {
  id: string;
  data: string;
}

export function isStickerData(x: unknown): x is string {
  return typeof x === 'string' && x.length <= STICKER_MAX_CHARS && STICKER_DATA.test(x);
}

export function isStickerId(x: unknown): x is string {
  return typeof x === 'string' && STICKER_ID.test(x);
}

export async function stickerId(data: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(digest).slice(0, 6), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Pin notu en fazla bu kadar karakter; bir videoda en fazla MAX_PINS pin. */
export const PIN_NOTE_MAX = 60;
export const MAX_PINS = 50;

/** Videonun pinlenmiş bir anı. `by` pinleyen (sadece isim/avatar; kimlik bilgisi gitmez). */
export interface Pin {
  id: string;
  /** Videonun kaçıncı saniyesi. */
  at: number;
  note?: string;
  by: { id: string; name: string; avatar?: Avatar };
}

/** Bir videonun pinleri (video değişince sıfırlanır). */
export interface PinList {
  itemId: string;
  pins: Pin[];
}

export function cleanChatText(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  // Kontrol karakterlerini at, boşlukları sadeleştir.
  const text = x.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length === 0) return null;
  return Array.from(text).slice(0, CHAT_MAX_LENGTH).join('');
}

export function cleanMedia(x: unknown): Media | null {
  if (!isObject(x)) return null;
  if (x.kind === 'test') return { kind: 'test' };
  if (x.kind === 'youtube') {
    return typeof x.id === 'string' && YOUTUBE_ID.test(x.id) ? { kind: 'youtube', id: x.id } : null;
  }
  if (x.kind === 'html5' || x.kind === 'page') {
    if (typeof x.url !== 'string' || x.url.length > 2048) return null;
    try {
      const url = new URL(x.url);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      return { kind: x.kind, url: url.toString() };
    } catch {
      return null;
    }
  }
  return null;
}

export function cleanTitle(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const title = x.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return title ? Array.from(title).slice(0, TITLE_MAX_LENGTH).join('') : null;
}

export function isValidMedia(x: unknown): x is Media {
  return cleanMedia(x) !== null;
}

export function parseClientMessage(raw: string): ClientMessage | null {
  if (raw.length > MAX_MESSAGE_BYTES) return null;
  let m: unknown;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(m)) return null;

  switch (m.t) {
    case 'hello': {
      const name = cleanName(m.name);
      if (typeof m.v !== 'number' || name === null) return null;
      // Avatar ve kalıcı kimlik isteğe bağlı: geçersizse sessizce yok sayılır, katılım engellenmez.
      const hello: Extract<ClientMessage, { t: 'hello' }> = { t: 'hello', v: m.v, name };
      if (isAvatar(m.avatar)) hello.avatar = m.avatar;
      if (typeof m.cid === 'string' && CLIENT_ID.test(m.cid)) hello.cid = m.cid;
      if (m.client === 'web' || m.client === 'ext') hello.client = m.client;
      return hello;
    }
    case 'rename': {
      const name = cleanName(m.name);
      if (name === null) return null;
      return isAvatar(m.avatar) ? { t: 'rename', name, avatar: m.avatar } : { t: 'rename', name };
    }
    case 'kick':
    case 'unban':
    case 'unpin':
      return isItemId(m.id) ? { t: m.t, id: m.id } : null;
    case 'ready':
      return typeof m.ready === 'boolean' ? { t: 'ready', ready: m.ready } : null;
    case 'settings': {
      const out: Extract<ClientMessage, { t: 'settings' }> = { t: 'settings' };
      for (const key of ['waitForAll', 'hostOnly', 'lockQueue', 'autoNext', 'saved'] as const) {
        if (typeof m[key] === 'boolean') out[key] = m[key] as boolean;
      }
      if (m.startsAt === null) out.startsAt = null;
      else if (isTimestamp(m.startsAt)) out.startsAt = m.startsAt;
      return Object.keys(out).length > 1 ? out : null;
    }
    case 'vote':
      return isItemId(m.id) && typeof m.up === 'boolean' ? { t: 'vote', id: m.id, up: m.up } : null;
    case 'ping':
      return isTimestamp(m.c) ? { t: 'ping', c: m.c } : null;
    case 'load':
    case 'enqueue': {
      const media = cleanMedia(m.media);
      if (!media) return null;
      const title = media.kind === 'page' ? cleanTitle(m.title) : null;
      return title ? { t: m.t, media, title } : { t: m.t, media };
    }
    case 'dequeue':
    case 'jump':
      return isItemId(m.id) ? { t: m.t, id: m.id } : null;
    case 'move':
      if (!isItemId(m.id) || !Number.isInteger(m.to) || (m.to as number) < 0 || (m.to as number) >= QUEUE_MAX_LENGTH) return null;
      return { t: 'move', id: m.id, to: m.to as number };
    case 'next':
      return isItemId(m.from) ? { t: 'next', from: m.from } : null;
    case 'play':
    case 'pause':
    case 'seek':
      if (!isPosition(m.position) || !isTimestamp(m.at)) return null;
      return { t: m.t, position: m.position, at: m.at };
    case 'rate':
      if (!isValidRate(m.rate) || !isPosition(m.position) || !isTimestamp(m.at)) return null;
      return { t: 'rate', rate: m.rate, position: m.position, at: m.at };
    case 'react':
      if (isReaction(m.emoji)) return { t: 'react', emoji: m.emoji };
      return isStickerId(m.sticker) ? { t: 'react', sticker: m.sticker } : null;
    case 'sticker-add':
      return isStickerData(m.data) ? { t: 'sticker-add', data: m.data } : null;
    case 'sticker-remove':
      return isStickerId(m.id) ? { t: 'sticker-remove', id: m.id } : null;
    case 'pin': {
      if (m.note === undefined) return { t: 'pin' };
      const note = cleanChatText(m.note);
      return note ? { t: 'pin', note: Array.from(note).slice(0, PIN_NOTE_MAX).join('') } : { t: 'pin' };
    }
    case 'chat': {
      const text = cleanChatText(m.text);
      return text ? { t: 'chat', text } : null;
    }
    default:
      return null;
  }
}

/** İnce hız ayarı: ±0.05 adım, MIN_RATE–MAX_RATE arası, iki basamağa yuvarlı. */
export function stepRate(rate: number, direction: 1 | -1): number {
  return Math.min(MAX_RATE, Math.max(MIN_RATE, Math.round((rate + direction * 0.05) * 100) / 100));
}
