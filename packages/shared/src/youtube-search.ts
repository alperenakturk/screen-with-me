/**
 * YouTube search inside the app (link box: type words instead of a link). The Worker calls the YouTube Data API with
 * the key that only it knows (`/api/youtube/search`); this file holds the pure parts both sides share: query
 * cleanup, the answer's shape and turning the API's JSON into it.
 */

/** Longest query we accept (YouTube's own box allows more, nobody needs it). */
export const SEARCH_QUERY_MAX = 100;
/** Results per search (search.list costs 100 units however many come back; 12 fit two rows of the list). */
export const SEARCH_RESULTS = 12;
/** Shorts feed (0.9.91): results per page (same 100 units as 12, so take the most YouTube gives). */
export const FEED_RESULTS = 25;
/** A Short is at most this long (YouTube allows up to 3 minutes since 2024). */
export const SHORT_MAX_SECONDS = 180;

export interface SearchResult {
  /** 11-character video id; the thumbnail is built from it (`i.ytimg.com`), no URL from the API reaches the page. */
  id: string;
  title: string;
  channel: string;
  /** Seconds; null when unknown (or a live stream). */
  duration: number | null;
  live: boolean;
  /** A YouTube Short (0.9.91.12): an upright video of at most `SHORT_MAX_SECONDS`; it opens in the Shorts view. */
  short?: boolean;
}

/**
 * - `quota`: today's searches are used up (YouTube resets the quota at midnight Pacific time).
 * - `off`: the server has no API key (local development, CI).
 * - `busy`: this address searched too often in the last minute.
 * - `failed`: anything else (network, YouTube error).
 */
export type SearchError = 'quota' | 'off' | 'busy' | 'failed';

/** `next`: the token for the following page (Shorts feed: "more of the same" without repeating). */
export type SearchAnswer = { items: SearchResult[]; next?: string } | { error: SearchError };

const PAGE_TOKEN = /^[A-Za-z0-9_-]{1,100}$/;
/** A page token as YouTube sends it (letters, digits, - and _); anything else is null. */
export function cleanPageToken(value: unknown): string | null {
  return typeof value === 'string' && PAGE_TOKEN.test(value) ? value : null;
}

/** Only real Shorts: known duration up to `SHORT_MAX_SECONDS`, not live. */
export function shortsOnly(items: SearchResult[]): SearchResult[] {
  return items.filter((item) => !item.live && item.duration !== null && item.duration <= SHORT_MAX_SECONDS);
}

/** Same words → same cache entry: trimmed, inner spaces collapsed, lower case. Null when nothing is left. */
export function normalizeQuery(raw: string): string | null {
  const text = raw.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().toLocaleLowerCase('tr');
  if (!text) return null;
  return Array.from(text).slice(0, SEARCH_QUERY_MAX).join('');
}

/** ISO 8601 duration as YouTube sends it (`PT1H2M3S`, `P1DT2H`) → seconds; null if it doesn't parse or is 0. */
export function parseIsoDuration(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match) return null;
  const [, d, h, m, s] = match.map((part) => Number(part ?? 0));
  const total = d! * 86400 + h! * 3600 + m! * 60 + s!;
  return total > 0 ? total : null;
}

/** `1:02:03` / `4:05`. */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };

/** search.list returns titles HTML-escaped (`Rock &amp; Roll`); the page writes them as text, so decode once. */
export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+|#39);/gi, (whole, name: string) => {
    const lower = name.toLowerCase();
    if (lower in ENTITIES) return ENTITIES[lower]!;
    const code = lower.startsWith('#x') ? parseInt(lower.slice(2), 16) : lower.startsWith('#') ? Number(lower.slice(1)) : NaN;
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function clean(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const text = decodeEntities(value).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
  return Array.from(text).slice(0, max).join('');
}

/**
 * search.list JSON (+ durations from videos.list) → our results. Anything unexpected is skipped, never trusted:
 * only well-formed video ids survive, texts are cut and cleaned.
 */
export function parseSearchItems(
  search: unknown,
  durations: Map<string, number | null> = new Map(),
  limit = SEARCH_RESULTS,
  /** Ids of upright videos (from videos.list `player`): with a Short's length they are marked `short`. */
  upright: ReadonlySet<string> = new Set(),
): SearchResult[] {
  const items = typeof search === 'object' && search !== null ? (search as { items?: unknown }).items : null;
  if (!Array.isArray(items)) return [];
  const results: SearchResult[] = [];
  const seen = new Set<string>();
  for (const raw of items) {
    if (typeof raw !== 'object' || raw === null) continue;
    const item = raw as { id?: { videoId?: unknown }; snippet?: { title?: unknown; channelTitle?: unknown; liveBroadcastContent?: unknown } };
    const id = item.id?.videoId;
    if (typeof id !== 'string' || !VIDEO_ID.test(id) || seen.has(id)) continue;
    seen.add(id);
    const live = item.snippet?.liveBroadcastContent === 'live';
    const duration = live ? null : (durations.get(id) ?? null);
    const short = !live && upright.has(id) && duration !== null && duration <= SHORT_MAX_SECONDS;
    results.push({
      id,
      title: clean(item.snippet?.title, 200) || id,
      channel: clean(item.snippet?.channelTitle, 100),
      duration,
      live,
      ...(short ? { short: true } : {}),
    });
    if (results.length >= limit) break;
  }
  return results;
}

/**
 * videos.list (`part=player` with `maxWidth`) JSON → ids of upright videos. The API has no "is a Short" field, but
 * with a `maxWidth` it sizes the embed to the video's shape: taller than wide = upright (Shorts are upright). The
 * sizes may come as strings (int64 in Google's JSON). Same call as the durations, so it costs nothing extra.
 */
export function parseUpright(videos: unknown): Set<string> {
  const upright = new Set<string>();
  const items = typeof videos === 'object' && videos !== null ? (videos as { items?: unknown }).items : null;
  if (!Array.isArray(items)) return upright;
  for (const raw of items) {
    if (typeof raw !== 'object' || raw === null) continue;
    const item = raw as { id?: unknown; player?: { embedWidth?: unknown; embedHeight?: unknown } };
    const w = Number(item.player?.embedWidth);
    const h = Number(item.player?.embedHeight);
    if (typeof item.id === 'string' && VIDEO_ID.test(item.id) && w > 0 && h > w) upright.add(item.id);
  }
  return upright;
}

/** videos.list (`part=contentDetails`) JSON → id → seconds. */
export function parseDurations(videos: unknown): Map<string, number | null> {
  const map = new Map<string, number | null>();
  const items = typeof videos === 'object' && videos !== null ? (videos as { items?: unknown }).items : null;
  if (!Array.isArray(items)) return map;
  for (const raw of items) {
    if (typeof raw !== 'object' || raw === null) continue;
    const item = raw as { id?: unknown; contentDetails?: { duration?: unknown } };
    if (typeof item.id === 'string' && VIDEO_ID.test(item.id)) map.set(item.id, parseIsoDuration(item.contentDetails?.duration));
  }
  return map;
}

/** YouTube error JSON → is it "the daily quota is used up"? (403 with reason `quotaExceeded` / `dailyLimitExceeded`). */
export function isQuotaError(body: unknown): boolean {
  const errors = typeof body === 'object' && body !== null ? (body as { error?: { errors?: unknown } }).error?.errors : null;
  if (!Array.isArray(errors)) return false;
  return errors.some((e) => {
    const reason = typeof e === 'object' && e !== null ? (e as { reason?: unknown }).reason : null;
    return reason === 'quotaExceeded' || reason === 'dailyLimitExceeded' || reason === 'rateLimitExceeded';
  });
}

/** The client checks the server's answer the same way the server checks clients: unknown shapes become `failed`. */
export function parseSearchAnswer(body: unknown, limit = SEARCH_RESULTS): SearchAnswer {
  if (typeof body !== 'object' || body === null) return { error: 'failed' };
  const error = (body as { error?: unknown }).error;
  if (error === 'quota' || error === 'off' || error === 'busy' || error === 'failed') return { error };
  const items = (body as { items?: unknown }).items;
  if (!Array.isArray(items)) return { error: 'failed' };
  const results: SearchResult[] = [];
  for (const raw of items) {
    if (typeof raw !== 'object' || raw === null) continue;
    const item = raw as Partial<Record<keyof SearchResult, unknown>>;
    if (typeof item.id !== 'string' || !VIDEO_ID.test(item.id)) continue;
    results.push({
      id: item.id,
      title: clean(item.title, 200) || item.id,
      channel: clean(item.channel, 100),
      duration: typeof item.duration === 'number' && Number.isFinite(item.duration) && item.duration > 0 ? item.duration : null,
      live: item.live === true,
      ...(item.short === true ? { short: true } : {}),
    });
  }
  const next = cleanPageToken((body as { next?: unknown }).next);
  return next ? { items: results.slice(0, limit), next } : { items: results.slice(0, limit) };
}
