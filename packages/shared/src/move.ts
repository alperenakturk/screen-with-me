// "Move my things to another device" (CARDS.md, research `research/solo-games-accounts.md` Part B option B): what goes
// from one browser to another, and how it merges there. Pure: the page reads / writes `localStorage` with the keys
// below; the server only relays the text once between two devices that share a 6-digit code (`apps/server/src/
// move-link.ts`) and stores nothing.

import { ROOM_ID_PATTERN } from './protocol.ts';
import { loadSnack } from './games/snack-bar.ts';
import { loadGarden } from './games/garden.ts';
import { loadFrames } from './games/five-frames.ts';

export const MOVE_VERSION = 1;
/** The 6-digit code both devices use (the same shape as the TV code). */
export const MOVE_CODE = /^\d{6}$/;
/** The code works this long (the sending device keeps it open). */
export const MOVE_TTL_MS = 10 * 60_000;
/** The moved text stays under this many characters (one WebSocket message, below Cloudflare's 1 MiB). */
export const MOVE_MAX_CHARS = 900_000;

/** Only these keys ever move: game saves, saved rooms, my emoji collection, my default name and avatar. */
export const MOVE_KEYS = ['snackBar', 'windowGarden', 'fiveFrames', 'savedRooms', 'stickerCollection', 'name', 'avatar'] as const;
export type MoveKey = (typeof MOVE_KEYS)[number];
const isMoveKey = (key: string): key is MoveKey => (MOVE_KEYS as readonly string[]).includes(key);

export interface MoveBlob {
  v: typeof MOVE_VERSION;
  /** When it was packed (ms). */
  at: number;
  items: Partial<Record<MoveKey, string>>;
}

/** What this device has, ready to send. Emoji images go last and are left out if the whole would be too big. */
export function packMove(get: (key: MoveKey) => string | null, now = Date.now()): MoveBlob {
  const items: Partial<Record<MoveKey, string>> = {};
  for (const key of MOVE_KEYS) {
    const value = get(key);
    if (typeof value === 'string' && value.length) items[key] = value;
  }
  const blob: MoveBlob = { v: MOVE_VERSION, at: now, items };
  if (encodeMove(blob).length > MOVE_MAX_CHARS) {
    // The emoji collection is the only big part: send as many of its newest images as fit.
    const images = parseList(items.stickerCollection).filter((x): x is string => typeof x === 'string');
    delete items.stickerCollection;
    while (images.length) {
      items.stickerCollection = JSON.stringify(images);
      if (encodeMove(blob).length <= MOVE_MAX_CHARS) break;
      images.shift();
      delete items.stickerCollection;
    }
  }
  return blob;
}

export const encodeMove = (blob: MoveBlob): string => JSON.stringify(blob);

/** Reads what arrived: null for anything that isn't a move of this version; unknown keys and non-text values dropped. */
export function decodeMove(text: unknown): MoveBlob | null {
  if (typeof text !== 'string' || text.length > MOVE_MAX_CHARS) return null;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (record.v !== MOVE_VERSION || !record.items || typeof record.items !== 'object') return null;
  const items: Partial<Record<MoveKey, string>> = {};
  for (const [key, value] of Object.entries(record.items as Record<string, unknown>)) {
    if (isMoveKey(key) && typeof value === 'string' && value.length) items[key] = value;
  }
  const at = typeof record.at === 'number' && Number.isFinite(record.at) ? record.at : 0;
  return { v: MOVE_VERSION, at, items };
}

function parseList(text: string | null | undefined): unknown[] {
  if (!text) return [];
  try {
    const data: unknown = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

/** How far a game save got: the bigger one is kept. */
export function progressOf(key: 'snackBar' | 'windowGarden' | 'fiveFrames', text: string | null | undefined): number {
  if (!text) return -1;
  if (key === 'snackBar') return loadSnack(text).lifetime;
  if (key === 'windowGarden') {
    const garden = loadGarden(text);
    return garden.watched + Object.values(garden.album).reduce((a, b) => a + b, 0) * 3600;
  }
  const frames = loadFrames(text);
  return frames.stats.en.played + frames.stats.tr.played;
}

interface Room {
  id: string;
  name: string;
  at: number;
  mine?: true;
}
const SAVED_MAX = 20;
const COLLECTION_MAX = 12;

function rooms(text: string | null | undefined): Room[] {
  return parseList(text).flatMap((x) => {
    const r = x as Partial<Room> | null;
    if (!r || typeof r.id !== 'string' || !ROOM_ID_PATTERN.test(r.id) || typeof r.name !== 'string' || typeof r.at !== 'number') return [];
    return [{ id: r.id, name: r.name.slice(0, 60), at: r.at, ...(r.mine === true ? { mine: true as const } : {}) }];
  });
}

export type MoveResult = Partial<Record<MoveKey, string>>;

/**
 * What to write on this device for an arrived move: game saves keep the one that got further, saved rooms and the
 * emoji collection are joined (no doubles, within their limits), my name and avatar only fill what is empty here.
 * Keys whose value would not change are left out.
 */
export function mergeMove(get: (key: MoveKey) => string | null, blob: MoveBlob): MoveResult {
  const out: MoveResult = {};
  const set = (key: MoveKey, value: string) => {
    if (value !== get(key)) out[key] = value;
  };
  for (const key of ['snackBar', 'windowGarden', 'fiveFrames'] as const) {
    const incoming = blob.items[key];
    if (incoming && progressOf(key, incoming) > progressOf(key, get(key))) set(key, incoming);
  }
  if (blob.items.savedRooms) {
    const byId = new Map<string, Room>();
    for (const room of [...rooms(get('savedRooms')), ...rooms(blob.items.savedRooms)]) {
      const old = byId.get(room.id);
      byId.set(room.id, old ? { ...old, ...(room.at > old.at ? { name: room.name, at: room.at } : {}), ...(old.mine || room.mine ? { mine: true as const } : {}) } : room);
    }
    const joined = [...byId.values()].sort((a, b) => b.at - a.at).slice(0, SAVED_MAX);
    set('savedRooms', JSON.stringify(joined));
  }
  if (blob.items.stickerCollection) {
    const images = [...parseList(get('stickerCollection')), ...parseList(blob.items.stickerCollection)].filter(
      (x): x is string => typeof x === 'string' && x.startsWith('data:image/'),
    );
    set('stickerCollection', JSON.stringify([...new Set(images)].slice(-COLLECTION_MAX)));
  }
  for (const key of ['name', 'avatar'] as const) {
    const incoming = blob.items[key];
    if (incoming && !get(key)) set(key, incoming.slice(0, 64));
  }
  return out;
}
