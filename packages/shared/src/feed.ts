import { isPoolKind, isPoolRegionChoice, isVideoId, parseChannelParam, POOL_REGIONS, type PoolKind, type PoolRegionChoice } from './youtube-search.ts';

/**
 * Card SH2: the room's feeds. A feed keeps the queue filled: ♾ Shorts (`shorts`) or ▶ videos (`videos`). Its
 * description lives on the room's server object, so everyone sees it as a row in the Queue and can pause, resume and
 * steer it; the tab of the person who runs it (`by`) makes the YouTube calls and adds the videos. The room also
 * remembers the ids it has played (`FeedMemory`), so a new or steered feed never brings them back.
 */
export type FeedKind = 'shorts' | 'videos';

/** How a channel feed picks: its newest uploads, a random order of them, or the most viewed of them. */
export type ChannelOrder = 'newest' | 'random' | 'popular';
const ORDERS: readonly ChannelOrder[] = ['newest', 'random', 'popular'];

/** A country a feed can be steered to ("same topic, other country"): a region of the Discover list or the world. */
export type FeedRegion = 'world' | (typeof POOL_REGIONS)[number];

export function isFeedRegion(value: unknown): value is FeedRegion {
  return value === 'world' || (typeof value === 'string' && (POOL_REGIONS as readonly string[]).includes(value));
}

export type FeedSource =
  /** Words (a YouTube search, the costly call: cached per query in the Worker). */
  | { kind: 'topic'; q: string; region?: FeedRegion }
  /** Shorts: today's shared Discover pool of a category. Videos: YouTube's "popular now" chart (1 unit a page). */
  | { kind: 'pool'; pool: PoolKind; region?: PoolRegionChoice }
  /** More like this video: its channel first, then its title's words. */
  | { kind: 'like'; id: string }
  /** One channel (`UC…` or `@handle`). */
  | { kind: 'channel'; c: string; order?: ChannelOrder }
  /** "Continue from this channel": the channel of this video (the Worker looks it up, 1 unit). */
  | { kind: 'chanOf'; id: string; order?: ChannelOrder };

/** What a client sends: the feed it starts or steers (`label` is what people see, e.g. "cats" or "🎵 Music"). */
export interface FeedIn {
  kind: FeedKind;
  label: string;
  source: FeedSource;
  paused: boolean;
}

/** What everyone gets: plus who runs it and how many times it was steered. */
export interface FeedInfo extends FeedIn {
  /** The member id of the person whose tab runs it. */
  by: string;
  steers: number;
}

export const FEED_LABEL_MAX = 80;
export const FEED_WORDS_MAX = 80;

/** Validates a client's feed into a new object; `clean` is the protocol's text cleaner. Null when anything is off. */
export function cleanFeedIn(x: unknown, clean: (text: string, max: number) => string): FeedIn | null {
  if (typeof x !== 'object' || x === null) return null;
  const m = x as { kind?: unknown; label?: unknown; source?: unknown; paused?: unknown };
  if (m.kind !== 'shorts' && m.kind !== 'videos') return null;
  if (typeof m.label !== 'string') return null;
  const label = clean(m.label, FEED_LABEL_MAX);
  if (!label) return null;
  const source = cleanFeedSource(m.source, clean);
  if (!source) return null;
  return { kind: m.kind, label, source, paused: m.paused === true };
}

export function cleanFeedSource(x: unknown, clean: (text: string, max: number) => string): FeedSource | null {
  if (typeof x !== 'object' || x === null) return null;
  const s = x as { kind?: unknown; q?: unknown; region?: unknown; pool?: unknown; id?: unknown; c?: unknown; order?: unknown };
  const order = ORDERS.includes(s.order as ChannelOrder) ? (s.order as ChannelOrder) : undefined;
  switch (s.kind) {
    case 'topic': {
      const q = typeof s.q === 'string' ? clean(s.q, FEED_WORDS_MAX) : '';
      if (!q) return null;
      return isFeedRegion(s.region) ? { kind: 'topic', q, region: s.region } : { kind: 'topic', q };
    }
    case 'pool':
      if (!isPoolKind(s.pool)) return null;
      return { kind: 'pool', pool: s.pool, region: isPoolRegionChoice(s.region) ? s.region : 'auto' };
    case 'like':
      return isVideoId(s.id) ? { kind: 'like', id: s.id } : null;
    case 'channel':
      if (typeof s.c !== 'string' || !parseChannelParam(s.c)) return null;
      return order ? { kind: 'channel', c: s.c, order } : { kind: 'channel', c: s.c };
    case 'chanOf':
      if (!isVideoId(s.id)) return null;
      return order ? { kind: 'chanOf', id: s.id, order } : { kind: 'chanOf', id: s.id };
    default:
      return null;
  }
}

/** Same feed, other words or way: a steer (counted), not a new feed. */
export function sameFeed(a: FeedInfo | null, b: FeedIn): boolean {
  return a !== null && a.kind === b.kind && JSON.stringify(a.source) === JSON.stringify(b.source) && a.label === b.label;
}

/**
 * The ids a room has played (YouTube ids only: public videos, nothing about people). A one-time room keeps them until
 * it is deleted; a saved room keeps the last FEED_MEMORY_MAX for FEED_MEMORY_DAYS. Pure and immutable (tested); the room
 * object stores `entries`.
 */
export const FEED_MEMORY_MAX = 2000;
export const FEED_MEMORY_DAYS = 30;
const DAY_MS = 86_400_000;

/** [id, played at (ms)], oldest first. */
export type FeedMemoryEntries = [string, number][];

export function rememberPlayed(entries: FeedMemoryEntries, id: string, now: number): FeedMemoryEntries {
  if (!isVideoId(id)) return entries;
  const kept = entries.filter(([other]) => other !== id);
  kept.push([id, now]);
  return pruneMemory(kept, now);
}

export function pruneMemory(entries: FeedMemoryEntries, now: number): FeedMemoryEntries {
  const oldest = now - FEED_MEMORY_DAYS * DAY_MS;
  const fresh = entries.filter(([, at]) => at >= oldest);
  return fresh.length > FEED_MEMORY_MAX ? fresh.slice(-FEED_MEMORY_MAX) : fresh;
}

/** A stored value back to entries (anything else is dropped). */
export function readMemory(x: unknown, now: number): FeedMemoryEntries {
  if (!Array.isArray(x)) return [];
  const entries = x.filter((e): e is [string, number] => Array.isArray(e) && isVideoId(e[0]) && typeof e[1] === 'number' && Number.isFinite(e[1]));
  return pruneMemory(entries, now);
}

/** The feed's "nothing to watch" check for a page of found ids: the ones the room has not played and doesn't hold. */
export function freshIds(found: readonly string[], skip: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of found) {
    if (skip.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}
