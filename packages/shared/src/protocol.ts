// Sunucu ile istemciler (site ve ileride eklenti) arasındaki mesaj formatı.
// Bu dosya hem tarayıcıda hem Cloudflare sunucusunda çalışır, bu yüzden
// DOM'a veya Node'a özel hiçbir şey kullanmaz.

export const PROTOCOL_VERSION = 1;

export const ROOM_ID_PATTERN = /^[A-Za-z0-9_-]{4,32}$/;
export const NAME_MAX_LENGTH = 32;
export const MIN_RATE = 0.25;
export const MAX_RATE = 2;
/** Bir mesajın en fazla kaç bayt olabileceği (kötü niyetli büyük mesajlara karşı). */
export const MAX_MESSAGE_BYTES = 4096;

export type Media =
  | { kind: 'youtube'; id: string }
  | { kind: 'html5'; url: string };

/**
 * Odanın tek doğru kaynağı. Sunucu tutar, herkes buna uyar.
 * `position`, `updatedAt` anındaki saniyedir. Video oynuyorsa o andan
 * beri geçen süre eklenerek şu anki konum hesaplanır (bkz. expectedPosition).
 */
export interface PlaybackState {
  media: Media | null;
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

export type Action = 'load' | 'play' | 'pause' | 'seek' | 'rate';

/** İstemci → sunucu. `at`, istemcinin tahmin ettiği sunucu saatidir. */
export type ClientMessage =
  | { t: 'hello'; v: number; name: string }
  | { t: 'ping'; c: number }
  | { t: 'load'; media: Media }
  | { t: 'play'; position: number; at: number }
  | { t: 'pause'; position: number; at: number }
  | { t: 'seek'; position: number; at: number }
  | { t: 'rate'; rate: number; position: number; at: number };

export type ErrorCode = 'bad_message' | 'not_joined' | 'version' | 'room_full';

/** Sunucu → istemci. */
export type ServerMessage =
  | { t: 'welcome'; you: string; state: PlaybackState; members: Member[] }
  | { t: 'pong'; c: number; s: number }
  | { t: 'state'; state: PlaybackState; action: Action; by: Member }
  | { t: 'members'; members: Member[] }
  | { t: 'error'; code: ErrorCode };

export function initialState(now: number): PlaybackState {
  return { media: null, paused: true, position: 0, rate: 1, updatedAt: now };
}

/** İstemcinin "şu anda yaptım" dediği zamana en fazla bu kadar geçmişe kadar güvenilir. */
export const MAX_CLIENT_LAG_MS = 2000;

export type ActionMessage = Exclude<ClientMessage, { t: 'hello' } | { t: 'ping' }>;

/** Sunucuda bir komutu oda durumuna uygular. */
export function applyAction(state: PlaybackState, message: ActionMessage, now: number): PlaybackState {
  if (message.t === 'load') {
    return { media: message.media, paused: true, position: 0, rate: state.rate, updatedAt: now };
  }
  // İstemci, komutu verdiği anın sunucu saatini (`at`) yollar; ağ gecikmesi
  // kadar geride kalmamak için o an kullanılır. Saçma değerlere karşı sınırlanır.
  const at = Math.min(now, Math.max(now - MAX_CLIENT_LAG_MS, message.at));
  const base: PlaybackState = { ...state, position: message.position, updatedAt: at };
  switch (message.t) {
    case 'play':
      return { ...base, paused: false };
    case 'pause':
      return { ...base, paused: true };
    case 'seek':
      return base;
    case 'rate':
      return { ...base, rate: message.rate };
  }
}

/** Verilen sunucu saatinde videonun kaçıncı saniyede olması gerektiği. */
export function expectedPosition(state: PlaybackState, serverNow: number): number {
  if (state.paused) return state.position;
  const elapsed = Math.max(0, serverNow - state.updatedAt) / 1000;
  return state.position + elapsed * state.rate;
}

// ---- Doğrulama ----
// Sunucu, istemciden gelen hiçbir şeye körü körüne güvenmez.

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function isPosition(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0 && x < 1e6;
}

function isTimestamp(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x > 0;
}

export function isValidRate(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= MIN_RATE && x <= MAX_RATE;
}

export function cleanName(x: unknown): string | null {
  if (typeof x !== 'string') return null;
  const name = x.replace(/\s+/g, ' ').trim().slice(0, NAME_MAX_LENGTH);
  return name.length > 0 ? name : null;
}

export function isValidMedia(x: unknown): x is Media {
  if (!isObject(x)) return false;
  if (x.kind === 'youtube') return typeof x.id === 'string' && YOUTUBE_ID.test(x.id);
  if (x.kind === 'html5') {
    if (typeof x.url !== 'string' || x.url.length > 2048) return false;
    try {
      const u = new URL(x.url);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
      return false;
    }
  }
  return false;
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
      return isValidMedia(m.media) ? { t: 'load', media: m.media } : null;
    case 'play':
    case 'pause':
    case 'seek':
      if (!isPosition(m.position) || !isTimestamp(m.at)) return null;
      return { t: m.t, position: m.position, at: m.at };
    case 'rate':
      if (!isValidRate(m.rate) || !isPosition(m.position) || !isTimestamp(m.at)) return null;
      return { t: 'rate', rate: m.rate, position: m.position, at: m.at };
    default:
      return null;
  }
}
