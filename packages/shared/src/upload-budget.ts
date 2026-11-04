/**
 * Security review 4, R4-1: images (custom emojis and chat images) are kept in the rooms' storage, and room ids are free
 * to invent, so a per-room limit alone lets one address fill the account's storage by spreading uploads over many fresh
 * rooms. Before a room stores an image it asks one small counter (`UploadGate`, the server) with this rule:
 * - per IP hash at most `UPLOAD_BYTES_PER_IP_DAY` per UTC day, across every room;
 * - for everyone at most `UPLOAD_BYTES_PER_DAY` per UTC day.
 * Real use is far below both: a room of friends adds a few emojis (≤ 280 KB each) and some chat images (≤ 280 KB).
 * The state holds only today's hashes with their byte counts and is reset when the day changes.
 */

/** One address, all rooms, one UTC day: about 70 full-size images. */
export const UPLOAD_BYTES_PER_IP_DAY = 20_000_000;
/** Everyone, one UTC day (Workers Free has 5 GB of Durable Object storage; one-off rooms are deleted after 24 h). */
export const UPLOAD_BYTES_PER_DAY = 400_000_000;
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
}

export interface UploadLimits {
  perIp: number;
  perDay: number;
}

export const UPLOAD_LIMITS: UploadLimits = { perIp: UPLOAD_BYTES_PER_IP_DAY, perDay: UPLOAD_BYTES_PER_DAY };

export type UploadAnswer = 'ok' | 'ip' | 'day' | 'bad';

/** A valid IP hash or browser key as the room passes it (hex, or the `cid` form `keyOf` makes). */
export const UPLOAD_KEY = /^[0-9A-Za-z:_-]{1,80}$/;

export const emptyUploadState = (day: number): UploadState => ({ day, total: 0, perIp: {} });

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
  const today = state && state.day === day ? state : emptyUploadState(day);
  if (!UPLOAD_KEY.test(key) || !Number.isInteger(bytes) || bytes <= 0 || bytes > UPLOAD_MAX_BYTES) return { answer: 'bad', state: today };
  const mine = today.perIp[key] ?? 0;
  if (today.total + bytes > limits.perDay) return { answer: 'day', state: today };
  if (mine + bytes > limits.perIp) return { answer: 'ip', state: today };
  const perIp = { ...today.perIp };
  if (mine === 0 && Object.keys(perIp).length >= UPLOAD_MAX_ADDRESSES) {
    // A flood of new addresses: keep counting the day's total but stop remembering more of them.
    return { answer: 'ok', state: { day, total: today.total + bytes, perIp } };
  }
  perIp[key] = mine + bytes;
  return { answer: 'ok', state: { day, total: today.total + bytes, perIp } };
}
