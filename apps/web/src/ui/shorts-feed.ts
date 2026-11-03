import type { Media, QueueItem } from '@swm/shared/protocol';
import { isPoolKind, isPoolRegionChoice, isVideoId, parseChannelParam, parseSearchAnswer, POOL_RESULTS, type PoolKind, type PoolRegionChoice } from '@swm/shared/youtube-search';
import { lang, t } from '../i18n.ts';

/**
 * Endless Shorts feed (0.9.91, owner: "make Shorts scrolling great, the API is there now"): pick a topic and the
 * queue keeps filling with Shorts about it — when fewer than `LOW_WATER` are left, the next page of a Shorts-only
 * search (`/api/youtube/search?short=1&page=…`, 25 per page, ≈ 1 % of the day's quota) adds the ones not seen yet.
 * The person who started it runs it (remembered for this tab, `sessionStorage` `feed:<room>`); everyone just sees the
 * queue grow. It stops by itself when the topic runs dry or the day's searches are used up.
 */
const LOW_WATER = 3;
/** Added per round (the rest of the page waits for the next round). */
const PER_ROUND = 8;
const SEEN_MAX = 400;

/**
 * Where the Shorts come from: words (`topic`, a Shorts-only search), "🎲 Keşfet" (`pool`: today's shared pool of a
 * category, shuffled here) or "✨ Bunun gibi" (`like`: the playing Short's channel, then its title's words). 0.9.91.18.
 */
export type FeedSource =
  | { kind: 'topic' }
  | { kind: 'pool'; pool: PoolKind; region?: PoolRegionChoice }
  | { kind: 'like'; id: string }
  /** Card 10: one channel's Shorts (`c` = `UC…` or `@handle`, see `channelParam`). */
  | { kind: 'channel'; c: string };

interface FeedState {
  /** What the person sees ("kediler", "🎵 Müzik", "✨ Bunun gibi"). */
  topic: string;
  source?: FeedSource;
  next: string | null;
  seen: string[];
  /** Found but not added yet (a page has more than one round's worth). */
  pending: string[];
  /** The topic has no more pages. */
  done: boolean;
}
/** Pages in a row that brought nothing new before the feed gives up (each one costs a search). */
const EMPTY_PAGES_MAX = 3;

export interface FeedOptions {
  roomId: string;
  queueItems: () => QueueItem[];
  current: () => QueueItem | null;
  /** May I add to the queue (not "only the host" for me)? */
  canAdd: () => boolean;
  add: (media: Media) => void;
  /** Takes an item out of the queue (a new feed clears the old feed's Shorts, 0.9.91.13). */
  remove: (itemId: string) => void;
  /** A short note to the person (feed started, stopped, quota). */
  note: (text: string) => void;
  /** The feed turned on / off (buttons follow). */
  changed: () => void;
}

export function createShortsFeed(opts: FeedOptions) {
  const key = `feed:${opts.roomId}`;
  let state: FeedState | null = (() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) ?? 'null') as FeedState | null;
      return saved && typeof saved.topic === 'string' && saved.topic
        ? { ...saved, source: cleanSource(saved.source), seen: Array.isArray(saved.seen) ? saved.seen : [], pending: Array.isArray(saved.pending) ? saved.pending : [] }
        : null;
    } catch {
      return null;
    }
  })();
  let loading = false;
  let retryAt = 0;
  let emptyPages = 0;
  let later: ReturnType<typeof setTimeout> | undefined;

  const persist = () => {
    try {
      if (state) sessionStorage.setItem(key, JSON.stringify({ ...state, seen: state.seen.slice(-SEEN_MAX) }));
      else sessionStorage.removeItem(key);
    } catch {
      // Private mode: the feed just isn't remembered across reloads.
    }
  };

  /** Spread out like a pasted list: the server allows about 4 commands a second. */
  function add(ids: string[]): void {
    writeAdded([...readAdded(), ...ids]);
    ids.forEach((id, i) => setTimeout(() => opts.add({ kind: 'youtube', id, short: true }), i * 300));
    // Until they reach the queue it still looks short: no new round before they are in (or it would overfill).
    if (ids.length) retryAt = Date.now() + ids.length * 300 + 2000;
  }

  /** Shorts the feed put in the queue (also after it stopped): a new feed takes them out again. */
  const addedKey = `feedAdded:${opts.roomId}`;
  const readAdded = (): string[] => {
    try {
      const list = JSON.parse(sessionStorage.getItem(addedKey) ?? '[]') as unknown;
      return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string').slice(-SEEN_MAX) : [];
    } catch {
      return [];
    }
  };
  const writeAdded = (list: string[]) => {
    try {
      sessionStorage.setItem(addedKey, JSON.stringify(list.slice(-SEEN_MAX)));
    } catch {
      // Private mode: only this page knows.
    }
  };

  function stop(note?: string): void {
    state = null;
    persist();
    if (note) opts.note(note);
    opts.changed();
  }

  /** Called whenever the room's queue or video changes. */
  async function tick(): Promise<void> {
    if (!state || loading) return;
    if (Date.now() < retryAt) {
      // Look again when the pause is over (no queue change may come to wake us).
      clearTimeout(later);
      later = setTimeout(() => void tick(), retryAt - Date.now() + 50);
      return;
    }
    const current = opts.current();
    // The feed belongs to the Shorts session: if something else is playing now, it waits.
    if (current && !((current.media.kind === 'youtube' && current.media.short) || current.media.kind === 'tiktok')) return;
    const queue = opts.queueItems();
    if (queue.length >= LOW_WATER) return;
    if (!opts.canAdd()) return stop(t('feed.locked'));
    const have = new Set([...queue.map((item) => (item.media.kind === 'youtube' ? item.media.id : '')), current?.media.kind === 'youtube' ? current.media.id : '']);
    // Leftovers of the last page first (no search needed).
    const waiting = state.pending.filter((id) => !have.has(id));
    if (waiting.length > 0) {
      add(waiting.slice(0, PER_ROUND));
      state.pending = waiting.slice(PER_ROUND);
      persist();
      return;
    }
    if (state.done) return stop(t('feed.end', { topic: state.topic }));
    loading = true;
    const topic = state.topic;
    try {
      const page = state.next ? `&page=${encodeURIComponent(state.next)}` : '';
      const source = state.source ?? { kind: 'topic' };
      const path =
        source.kind === 'pool'
          ? `/api/youtube/pool?kind=${source.pool}&region=${source.region ?? 'auto'}`
          : source.kind === 'like'
            ? `/api/youtube/like?id=${source.id}`
            : source.kind === 'channel'
              ? `/api/youtube/channel?c=${encodeURIComponent(source.c)}`
              : `/api/youtube/search?short=1&q=${encodeURIComponent(topic)}`;
      const response = await fetch(`${path}&hl=${lang()}${page}`);
      const answer = response.ok ? parseSearchAnswer(await response.json(), POOL_RESULTS) : ({ error: 'failed' } as const);
      if (!state || state.topic !== topic) return;
      if ('error' in answer) {
        if (answer.error === 'busy' || answer.error === 'failed') {
          retryAt = Date.now() + 30_000;
          return;
        }
        return stop(t(answer.error === 'quota' ? 'feed.quota' : 'feed.off'));
      }
      const seen = new Set(state.seen);
      const fresh = answer.items.map((item) => item.id).filter((id) => !seen.has(id) && !have.has(id));
      // A pool is the same for every room today: each room plays it in its own random order.
      if (source.kind === 'pool') shuffle(fresh);
      state.seen.push(...fresh);
      add(fresh.slice(0, PER_ROUND));
      state.pending = fresh.slice(PER_ROUND);
      state.next = answer.next ?? null;
      state.done = !answer.next;
      emptyPages = fresh.length === 0 ? emptyPages + 1 : 0;
      if (fresh.length === 0 && (state.done || emptyPages >= EMPTY_PAGES_MAX)) return stop(t('feed.end', { topic }));
      persist();
      // A page with nothing new: try the next one shortly (bounded by EMPTY_PAGES_MAX).
      if (fresh.length === 0) setTimeout(() => void tick(), 500);
    } catch {
      retryAt = Date.now() + 30_000;
    } finally {
      loading = false;
    }
  }

  return {
    get topic(): string | null {
      return state?.topic ?? null;
    },
    start(topic: string, source: FeedSource = { kind: 'topic' }): void {
      const clean = topic.replace(/\s+/g, ' ').trim().slice(0, 80);
      if (!clean) return;
      if (!opts.canAdd()) {
        opts.note(t('feed.locked'));
        return;
      }
      // A new feed: the old feed's Shorts still waiting in the queue go (owner: "I don't want to see the feed I left");
      // the one playing now finishes. Spread out like adding: the server allows about 4 commands a second.
      const old = new Set(readAdded());
      const leftovers = opts.queueItems().filter((item) => item.media.kind === 'youtube' && old.has(item.media.id));
      leftovers.forEach((item, i) => setTimeout(() => opts.remove(item.id), i * 300));
      writeAdded([]);
      // "More like this" never brings back the Short it started from.
      state = { topic: clean, source, next: null, seen: source.kind === 'like' ? [source.id] : [], pending: [], done: false };
      // The new Shorts come after the old ones are gone (or the queue looks full to the first round).
      retryAt = leftovers.length ? Date.now() + leftovers.length * 300 + 800 : 0;
      emptyPages = 0;
      persist();
      opts.note(t('feed.started', { topic: clean }));
      opts.changed();
      void tick();
    },
    stop: () => stop(),
    tick: () => void tick(),
  };
}

function cleanSource(value: unknown): FeedSource {
  const source = (typeof value === 'object' && value !== null ? value : {}) as { kind?: unknown; pool?: unknown; id?: unknown; region?: unknown; c?: unknown };
  if (source.kind === 'pool' && isPoolKind(source.pool)) return { kind: 'pool', pool: source.pool, region: isPoolRegionChoice(source.region) ? source.region : 'auto' };
  if (source.kind === 'like' && isVideoId(source.id)) return { kind: 'like', id: source.id };
  if (source.kind === 'channel' && typeof source.c === 'string' && parseChannelParam(source.c)) return { kind: 'channel', c: source.c };
  return { kind: 'topic' };
}

function shuffle<T>(list: T[]): void {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
}
