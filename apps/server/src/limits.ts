// QUOTA1a: limits that keep one client from using up the Free plan's Durable Object quotas (every message that reaches
// an object is billed; on Free, a used-up quota stops every object until 00:00 UTC). Each limit has a default here and
// a Worker variable of the same name that overrides it without a code release (`wrangler.jsonc` `vars`, or the
// dashboard's Variables): only to loosen or tighten it in an emergency.
import { UPLOAD_BYTES_PER_DAY, UPLOAD_BYTES_PER_IP_DAY, UPLOAD_BYTES_WINDOW } from '@swm/shared/upload-budget';

export const LIMIT_DEFAULTS: Record<
  'MSG_RATE' | 'MSG_BURST' | 'DRAW_MSG_RATE' | 'ROOM_IP_CONNECTIONS' | 'FALLBACK_SESSIONS_PER_IP' | 'UPLOAD_IP_BYTES' | 'UPLOAD_DAY_BYTES' | 'UPLOAD_WINDOW_BYTES',
  number
> = {
  /**
   * Messages per second one connection may send on average (a token bucket: `MSG_BURST` at once, refilled at this
   * rate). The free keepalive never reaches the object and isn't counted; real pings are. A person never comes near:
   * a busy evening is under 1 a second, a join a handful, a voice call's connection setup a few dozen at once.
   */
  MSG_RATE: 20,
  /** The bucket's size: messages one connection may send at once (ICE candidates of a 6-person call fit). */
  MSG_BURST: 120,
  /** Draw & Guess: the drawer sends a stroke chunk every 50 ms (20 a second) plus guesses and chat. */
  DRAW_MSG_RATE: 40,
  /**
   * Connections from one address (IP hash) in one room at once. Generous on purpose: Turkish mobile carriers put many
   * people behind one address (carrier NAT), and a family shares one router; a room holds 50.
   */
  ROOM_IP_CONNECTIONS: 12,
  /**
   * QUOTA2: open HTTP-fallback sessions one address may hold across all rooms and tables (`fallback-gate.ts`). A
   * fallback session keeps its object awake; only networks where WebSockets never open use it (a phone hotspot), and a
   * household there has a few tabs, each with a room and maybe a table.
   */
  FALLBACK_SESSIONS_PER_IP: 12,
  /** Images (custom emojis, chat images) one address may store per UTC day, all rooms (`upload-budget.ts`). */
  UPLOAD_IP_BYTES: UPLOAD_BYTES_PER_IP_DAY,
  /** Images everyone may store per UTC day. */
  UPLOAD_DAY_BYTES: UPLOAD_BYTES_PER_DAY,
  /** IMG2: images everyone may store over the last 30 days (bounds what the account's storage holds). */
  UPLOAD_WINDOW_BYTES: UPLOAD_BYTES_WINDOW,
};

export type LimitName = keyof typeof LIMIT_DEFAULTS;

/** The limit's value: the Worker variable when it is a positive number, else the default. */
export function limitOf(env: object, name: LimitName): number {
  const raw = (env as Record<string, unknown>)[name];
  const value = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? value : LIMIT_DEFAULTS[name];
}

/** The close code for a connection that sent too much at once (WebSocket "policy violation"). */
export const FLOOD_CODE = 1008;

/**
 * The per-connection message ceiling: a token bucket per socket, in memory (an object that hibernates has had no
 * traffic, so a fresh bucket after a wake loses nothing). `allow` is false once the socket sent more than its share.
 */
export class FloodGuard {
  private readonly buckets = new WeakMap<object, { tokens: number; at: number }>();
  constructor(private readonly limits: () => { rate: number; burst: number }) {}

  allow(socket: object, now = Date.now()): boolean {
    const { rate, burst } = this.limits();
    const bucket = this.buckets.get(socket) ?? { tokens: burst, at: now };
    bucket.tokens = Math.min(burst, bucket.tokens + ((now - bucket.at) / 1000) * rate);
    bucket.at = now;
    this.buckets.set(socket, bucket);
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }
}

/** A guard reading the limits from the object's env on each use (a changed variable applies to the next message). */
export function floodGuard(env: object, rateName: LimitName = 'MSG_RATE'): FloodGuard {
  return new FloodGuard(() => ({ rate: limitOf(env, rateName), burst: limitOf(env, 'MSG_BURST') }));
}

/** Closes a flooding socket: the reason goes first (the room page shows it and reconnects). */
export function closeFlooder(ws: { send(data: string): void; close(code?: number, reason?: string): void }, error: string): void {
  try {
    ws.send(error);
    ws.close(FLOOD_CODE, 'flood');
  } catch {
    // Closed meanwhile.
  }
}
