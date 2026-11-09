/**
 * Security review 4, R4-1: images (custom emojis and chat images) are kept in the rooms' storage, and room ids are free
 * to invent, so a per-room limit alone lets one address fill the account's storage by spreading uploads over many fresh
 * rooms. Before a room stores an image it asks one small counter (`UploadGate`, the server) with this rule:
 * - per IP hash at most `UPLOAD_BYTES_PER_IP_DAY` per UTC day, across every room;
 * - for everyone at most `UPLOAD_BYTES_PER_DAY` per UTC day;
 * - QUOTA1a / IMG2 (CF-5): for everyone at most `UPLOAD_BYTES_WINDOW` over the last `UPLOAD_WINDOW_DAYS` days. No image
 *   lives longer than that (a saved room is deleted 30 days after it empties, chat images go after 1 / 7 days), so this
 *   bounds the images the account can hold, well under the Free plan's 5 GB (a full storage stops every room until rooms
 *   expire, not just until midnight).
 * Real use is far below all three: a room of friends adds a few emojis (≤ 280 KB each) and some chat images (≤ 280 KB).
 * The state holds today's hashes with their byte counts (reset when the day changes) and the totals of the last days.
 * Each limit is also a Worker variable (`apps/server/src/limits.ts`).
 */

/** One address, all rooms, one UTC day: about 35 full-size images (carrier NAT shares it: generous on purpose). */
export const UPLOAD_BYTES_PER_IP_DAY = 10_000_000;
/** Everyone, one UTC day (was 400 MB: 30 days of it could pass the Free plan's 5 GB). */
export const UPLOAD_BYTES_PER_DAY = 150_000_000;
/** Everyone, the last `UPLOAD_WINDOW_DAYS` UTC days together (today included). */
export const UPLOAD_BYTES_WINDOW = 3_000_000_000;
export const UPLOAD_WINDOW_DAYS = 30;
/** The most one image can weigh; anything bigger is refused before it is counted. */
export const UPLOAD_MAX_BYTES = 300_000;
/** At most this many addresses are remembered in a day (older ones are counted in the day's total only). */
export const UPLOAD_MAX_ADDRESSES = 20_000;

export interface UploadState {
  /** UTC day number. */
  day: number;
  /** Bytes let through today for everyone. */
  total: number;
  /** IP hash → bytes let through today. */
  perIp: Record<string, number>;
  /** IMG2: the totals of the earlier days still in the window (UTC day → bytes). */
  past?: Record<string, number>;
}

export interface UploadLimits {
  perIp: number;
  perDay: number;
  /** IMG2: the window total (none: no window limit). */
  window?: number;
}

export const UPLOAD_LIMITS: UploadLimits = { perIp: UPLOAD_BYTES_PER_IP_DAY, perDay: UPLOAD_BYTES_PER_DAY, window: UPLOAD_BYTES_WINDOW };

/** `store`: the window total (what the account's rooms may still hold) is used up. */
export type UploadAnswer = 'ok' | 'ip' | 'day' | 'store' | 'bad';

/** A valid IP hash or browser key as the room passes it (hex, or the `cid` form `keyOf` makes). */
export const UPLOAD_KEY = /^[0-9A-Za-z:_-]{1,80}$/;

export const emptyUploadState = (day: number): UploadState => ({ day, total: 0, perIp: {} });

/** A new day's state: yesterday's (and earlier) totals move into `past`, days out of the window are dropped. */
function rollOver(state: UploadState | undefined, day: number): UploadState {
  if (state && state.day === day) return state;
  const past: Record<string, number> = {};
  for (const [d, bytes] of Object.entries(state?.past ?? {})) if (day - Number(d) < UPLOAD_WINDOW_DAYS) past[d] = bytes;
  if (state && state.total > 0 && day - state.day < UPLOAD_WINDOW_DAYS) past[String(state.day)] = state.total;
  return { ...emptyUploadState(day), ...(Object.keys(past).length ? { past } : {}) };
}

/** Bytes let through in the window (today included). */
export function windowTotal(state: UploadState): number {
  return state.total + Object.values(state.past ?? {}).reduce((a, b) => a + b, 0);
}

export const utcDay = (now: number): number => Math.floor(now / 86_400_000);

/**
 * Counts `bytes` for `key` at `now` when they fit; returns the answer and the new state (the old one when refused).
 * Pure, so the server object and the unit tests share it.
 */
export function takeUpload(
  state: UploadState | undefined,
  key: string,
  bytes: number,
  now: number,
  limits: UploadLimits = UPLOAD_LIMITS,
): { answer: UploadAnswer; state: UploadState } {
  const day = utcDay(now);
  const today = rollOver(state, day);
  if (!UPLOAD_KEY.test(key) || !Number.isInteger(bytes) || bytes <= 0 || bytes > UPLOAD_MAX_BYTES) return { answer: 'bad', state: today };
  const mine = today.perIp[key] ?? 0;
  if (limits.window !== undefined && windowTotal(today) + bytes > limits.window) return { answer: 'store', state: today };
  if (today.total + bytes > limits.perDay) return { answer: 'day', state: today };
  if (mine + bytes > limits.perIp) return { answer: 'ip', state: today };
  const perIp = { ...today.perIp };
  if (mine === 0 && Object.keys(perIp).length >= UPLOAD_MAX_ADDRESSES) {
    // A flood of new addresses: keep counting the day's total but stop remembering more of them.
    return { answer: 'ok', state: { ...today, total: today.total + bytes, perIp } };
  }
  perIp[key] = mine + bytes;
  return { answer: 'ok', state: { ...today, total: today.total + bytes, perIp } };
}
