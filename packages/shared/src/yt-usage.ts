/**
 * YouTube usage counters for the quota increase form (card Y3): per UTC day, how many calls of each kind reached
 * YouTube and the quota units they cost. Nothing else is kept: no words, no IP, no room id. Pure (tested); the Worker's
 * `YoutubeUsage` object stores the result and keeps at most USAGE_DAYS days.
 */

/** Which feature made the calls. */
export type UsageKind = 'search' | 'pool' | 'like' | 'channel' | 'oembed';
export const USAGE_KINDS: readonly UsageKind[] = ['search', 'pool', 'like', 'channel', 'oembed'];

/** YouTube Data API v3 cost per call of each method (oEmbed is not the Data API: 0 units). */
export const UNIT_COST: Readonly<Record<string, number>> = { search: 100, videos: 1, channels: 1, playlistItems: 1, oembed: 0 };

export const USAGE_DAYS = 90;

export interface KindUsage {
  /** Requests of this kind that reached YouTube (one may make several API calls). */
  requests: number;
  /** API calls by method (`search`, `videos`, …). */
  calls: Record<string, number>;
  units: number;
}

/** "YYYY-MM-DD" (UTC) → kind → usage. */
export type UsageBook = Record<string, Partial<Record<UsageKind, KindUsage>>>;

export function usageDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** The units a set of calls cost (unknown methods count 1, YouTube's usual price). */
export function unitsOf(calls: Record<string, number>): number {
  let units = 0;
  for (const [method, count] of Object.entries(calls)) units += (UNIT_COST[method] ?? 1) * count;
  return units;
}

/** Adds one request's calls to the book (a new object) and drops days older than USAGE_DAYS. */
export function addUsage(book: UsageBook, kind: UsageKind, calls: Record<string, number>, now: number): UsageBook {
  const day = usageDay(now);
  const today = { ...(book[day] ?? {}) };
  const before = today[kind] ?? { requests: 0, calls: {}, units: 0 };
  const merged: Record<string, number> = { ...before.calls };
  for (const [method, count] of Object.entries(calls)) if (Number.isInteger(count) && count > 0) merged[method] = (merged[method] ?? 0) + count;
  today[kind] = { requests: before.requests + 1, calls: merged, units: before.units + unitsOf(calls) };
  return pruneUsage({ ...book, [day]: today }, now);
}

/** Only the last USAGE_DAYS days (today included). */
export function pruneUsage(book: UsageBook, now: number): UsageBook {
  const oldest = usageDay(now - (USAGE_DAYS - 1) * 86_400_000);
  const kept: UsageBook = {};
  for (const [day, usage] of Object.entries(book)) if (day >= oldest) kept[day] = usage;
  return kept;
}

/** Checks a `/add` body: a known kind and small positive counts by method name. */
export function cleanUsage(x: unknown): { kind: UsageKind; calls: Record<string, number> } | null {
  if (typeof x !== 'object' || x === null) return null;
  const { kind, calls } = x as { kind?: unknown; calls?: unknown };
  if (typeof kind !== 'string' || !(USAGE_KINDS as readonly string[]).includes(kind)) return null;
  if (typeof calls !== 'object' || calls === null) return null;
  const clean: Record<string, number> = {};
  for (const [method, count] of Object.entries(calls)) {
    if (!/^[a-zA-Z]{1,20}$/.test(method) || !Number.isInteger(count) || (count as number) < 1 || (count as number) > 100) return null;
    clean[method] = count as number;
  }
  return { kind: kind as UsageKind, calls: clean };
}

/**
 * Security M3: a daily budget for the YouTube API key. YouTube gives 10 000 units a day; we spend at most
 * DAILY_UNIT_BUDGET of them (the rest is headroom for counting gaps), and one address (its scrambled hash, in memory
 * only) at most IP_DAILY_UNITS (≈ 20 searches), so one script can no longer turn search off for everyone.
 */
export const DAILY_UNIT_BUDGET = 9000;
export const IP_DAILY_UNITS = 2000;

/** What a request is expected to cost before it is made (the real cost is counted afterwards). */
export const EXPECTED_UNITS = { search: 101, pool: 101, like: 4, likeSearch: 101, channel: 3 } as const;

/** All units counted today (UTC). */
export function unitsToday(book: UsageBook, now: number): number {
  let units = 0;
  for (const usage of Object.values(book[usageDay(now)] ?? {})) units += usage?.units ?? 0;
  return units;
}

/**
 * May a request of `cost` units go to YouTube? `spent` = units counted today, `pending` = units allowed but not yet
 * counted, `ipSpent` = what this address was allowed today. 'day' = the budget is out (answer "quota"), 'ip' = this
 * address had its share (answer "busy").
 */
export function budgetCheck(spent: number, pending: number, ipSpent: number, cost: number): 'ok' | 'day' | 'ip' {
  if (spent + pending + cost > DAILY_UNIT_BUDGET) return 'day';
  if (ipSpent + cost > IP_DAILY_UNITS) return 'ip';
  return 'ok';
}
