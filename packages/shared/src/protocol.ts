// Sunucu ile istemciler (site ve ileride eklenti) arasındaki mesaj formatı.
// Bu dosya hem tarayıcıda hem Cloudflare sunucusunda çalışır, bu yüzden
// DOM'a veya Node'a özel hiçbir şey kullanmaz.

export const PROTOCOL_VERSION = 2;

export const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{4,32}$/;
export const NAME_MAX_LENGTH = 32;
export const CHAT_MAX_LENGTH = 300;
export const QUEUE_MAX_LENGTH = 100;
export const MIN_RATE = 0.25;
export const MAX_RATE = 2;
/** Bir mesajın en fazla kaç bayt olabileceği (kötü niyetli büyük mesajlara karşı). */
export const MAX_MESSAGE_BYTES = 4096;
/** Gönderilebilecek emoji tepkileri. Sunucu bunların dışındakini kabul etmez. */
export const REACTIONS = ['😂', '😮', '😍', '😱', '👏', '🔥', '😢', '💀'] as const;

export type Reaction = (typeof REACTIONS)[number];

export type Media =
  | { kind: 'youtube'; id: string }
  | { kind: 'html5'; url: string };

/** Sıradaki ya da şu an oynayan bir video. */
export interface QueueItem {
  id: string;
  media: Media;
  /** Sunucunun bulduğu başlık (bulamazsa null). */
  title: string | null;
  /** Ekleyen kişinin adı. */
  by: string;
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

export interface Member {
  id: string;
  name: string;
}

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
  | { t: 'hello'; v: number; name: string }
  | { t: 'ping'; c: number }
  /** Hemen aç (şu an oynayanın yerine). */
  | { t: 'load'; media: Media }
  /** Sıraya ekle. Oda boşsa hemen açılır. */
  | { t: 'enqueue'; media: Media }
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
  | { t: 'react'; emoji: Reaction }
  | { t: 'chat'; text: string };

export type ErrorCode = 'bad_message' | 'not_joined' | 'version' | 'room_full' | 'rate_limited' | 'queue_full';

/** Sunucu → istemci. */
export type ServerMessage =
  | {
      t: 'welcome';
      you: string;
      state: PlaybackState;
      queue: QueueItem[];
      members: Member[];
      chat: ChatMessage[];
    }
  | { t: 'pong'; c: number; s: number }
  | { t: 'state'; state: PlaybackState; action: PlaybackAction; by: Member }
  | { t: 'queue'; queue: QueueItem[]; change: QueueChange | null }
  /** Video beklemeden yayınlanır; başlığı sonradan bulununca bu mesaj gelir. */
  | { t: 'title'; itemId: string; title: string }
  | { t: 'members'; members: Member[] }
  | { t: 'reaction'; emoji: Reaction; by: Member }
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

export function cleanChatText(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  // Kontrol karakterlerini at, boşlukları sadeleştir.
  const text = x.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length === 0) return null;
  return Array.from(text).slice(0, CHAT_MAX_LENGTH).join('');
}

export function cleanMedia(x: unknown): Media | null {
  if (!isObject(x)) return null;
  if (x.kind === 'youtube') {
    return typeof x.id === 'string' && YOUTUBE_ID.test(x.id) ? { kind: 'youtube', id: x.id } : null;
  }
  if (x.kind === 'html5') {
    if (typeof x.url !== 'string' || x.url.length > 2048) return null;
    try {
      const url = new URL(x.url);
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
      return { kind: 'html5', url: url.toString() };
    } catch {
      return null;
    }
  }
  return null;
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
      return { t: 'hello', v: m.v, name };
    }
    case 'ping':
      return isTimestamp(m.c) ? { t: 'ping', c: m.c } : null;
    case 'load':
    case 'enqueue': {
      const media = cleanMedia(m.media);
      return media ? { t: m.t, media } : null;
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
      return isReaction(m.emoji) ? { t: 'react', emoji: m.emoji } : null;
    case 'chat': {
      const text = cleanChatText(m.text);
      return text ? { t: 'chat', text } : null;
    }
    default:
      return null;
  }
}
