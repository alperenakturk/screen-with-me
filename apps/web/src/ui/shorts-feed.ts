import type { FeedIn, FeedInfo, FeedKind, FeedSource } from '@swm/shared/feed';
import { freshIds } from '@swm/shared/feed';
import type { ClientMessage, Media, QueueItem } from '@swm/shared/protocol';
import { feedSearchParams, parseSearchAnswer, POOL_RESULTS, wordsRequest } from '@swm/shared/youtube-search';
import { debugHooks } from '../debug-lab.ts';
import { lang, t } from '../i18n.ts';

/**
 * The room's feeds (0.9.91 ♾ Shorts; card SH2 adds ▶ videos, the Queue row, steering and the room's memory). The feed
 * itself (what it follows, paused or not) lives on the room's server object, so everyone sees it in the Queue and can
 * pause, resume or steer it. One tab runs it (`FeedInfo.by`): when fewer than its low water mark are left in the
 * queue, it asks the Worker for the next page and adds the ones the room has not played (`feed-played`, asked once)
 * and doesn't hold. A runner who leaves hands it to whoever opens the feed next, or to the first person still in the
 * room who may change the queue.
 */
const LOW_WATER: Record<FeedKind, number> = { shorts: 3, videos: 2 };
/** Added per round (the rest of the page waits for the next round). */
const PER_ROUND: Record<FeedKind, number> = { shorts: 8, videos: 3 };
/** Pages in a row that brought nothing new before the feed gives up (each one costs a call). */
const EMPTY_PAGES_MAX = 3;

/** What the running tab keeps between rounds (this tab only; a new runner starts from the first page). */
interface Run {
  /** The feed it was made for (source + label); a steer makes a new run. */
  key: string;
  next: string | null;
  pending: string[];
  done: boolean;
  /** Ids this run found already (so a page found twice adds nothing twice). */
  seen: Set<string>;
}

export interface FeedOptions {
  queueItems: () => QueueItem[];
  current: () => QueueItem | null;
  /** My member id and the ids of everyone in the room now. */
  myId: () => string | null;
  memberIds: () => string[];
  /** May I add to the queue (not "only the host" for me)? */
  canAdd: () => boolean;
  send: (message: ClientMessage) => void;
  /** A short note to the person (feed started, stopped, quota). */
  note: (text: string) => void;
  /** The feed changed (rows and buttons follow). */
  changed: () => void;
}

const isShortItem = (item: QueueItem | null) => !!item && ((item.media.kind === 'youtube' && item.media.short === true) || item.media.kind === 'tiktok');
const runKey = (feed: FeedInfo) => JSON.stringify([feed.kind, feed.label, feed.source]);

export function createShortsFeed(opts: FeedOptions) {
  let info: FeedInfo | null = null;
  let run: Run | null = null;
  /** The room's played ids (null until the server answered `feed-played`). */
  let played: Set<string> | null = null;
  let asked = false;
  let loading = false;
  let retryAt = 0;
  let emptyPages = 0;
  let later: ReturnType<typeof setTimeout> | undefined;

  const mine = () => info !== null && info.by === opts.myId();

  function send(feed: FeedIn | null): void {
    opts.send({ t: 'feed', feed });
  }

  /** Spread out like a pasted list: the server allows about 4 commands a second. */
  function add(kind: FeedKind, ids: string[]): void {
    ids.forEach((id, i) => {
      const media: Media = kind === 'shorts' ? { kind: 'youtube', id, short: true } : { kind: 'youtube', id };
      setTimeout(() => opts.send({ t: 'enqueue', media, feed: true }), i * 300);
    });
    // Until they reach the queue it still looks short: no new round before they are in (or it would overfill).
    if (ids.length) retryAt = Date.now() + ids.length * 300 + 2000;
  }

  /** A new or steered feed: what the last one queued goes again (the one playing finishes). */
  function clearQueued(): void {
    const left = opts.queueItems().filter((item) => item.feed);
    left.forEach((item, i) => setTimeout(() => opts.send({ t: 'dequeue', id: item.id }), i * 300));
    retryAt = left.length ? Date.now() + left.length * 300 + 800 : 0;
  }

  function stop(note?: string): void {
    if (info) send(null);
    if (note) opts.note(note);
  }

  function path(source: FeedSource, kind: FeedKind): string {
    const videos = kind === 'videos';
    switch (source.kind) {
      case 'pool':
        return videos ? `/api/youtube/chart?kind=${source.pool}&region=${source.region ?? 'auto'}` : `/api/youtube/pool?kind=${source.pool}&region=${source.region ?? 'auto'}`;
      case 'like':
        return `/api/youtube/like?id=${source.id}${videos ? '&videos=1' : ''}`;
      case 'channel':
        return `/api/youtube/channel?c=${encodeURIComponent(source.c)}${videos ? '&videos=1' : ''}${source.order === 'popular' ? '&order=popular' : ''}`;
      case 'chanOf':
        return `/api/youtube/channel?of=${source.id}${videos ? '&videos=1' : ''}${source.order === 'popular' ? '&order=popular' : ''}`;
      case 'topic':
        // Card FC1: words + country + kind chip in one query.
        return `/api/youtube/search?${videos ? 'long=1' : 'short=1'}${source.region && source.region !== 'world' ? `&region=${source.region}` : ''}${source.pool ? `&cat=${source.pool}` : ''}`;
    }
  }

  /** Called whenever the room's queue, video or people change. */
  async function tick(): Promise<void> {
    const feed = info;
    // A runner who left: the first person in the room who may add takes it over (their `feed` makes them the runner).
    if (feed && !feed.paused && !mine() && opts.canAdd()) {
      const here = opts.memberIds();
      if (!here.includes(feed.by) && [...here].sort()[0] === opts.myId()) send({ kind: feed.kind, label: feed.label, source: feed.source, paused: false });
    }
    if (!feed || feed.paused || !mine() || loading) return;
    if (!played) {
      if (!asked) {
        asked = true;
        opts.send({ t: 'feed-played' });
      }
      return;
    }
    if (!run || run.key !== runKey(feed)) {
      run = { key: runKey(feed), next: null, pending: [], done: false, seen: new Set(feed.source.kind === 'like' || feed.source.kind === 'chanOf' ? [feed.source.id] : []) };
      emptyPages = 0;
    }
    if (Date.now() < retryAt) {
      // Look again when the pause is over (no queue change may come to wake us).
      clearTimeout(later);
      later = setTimeout(() => void tick(), retryAt - Date.now() + 50);
      return;
    }
    const current = opts.current();
    // A feed belongs to its kind: while a video of the other kind plays, it waits.
    if (current && isShortItem(current) !== (feed.kind === 'shorts')) return;
    const queue = opts.queueItems();
    if (queue.length >= LOW_WATER[feed.kind]) return;
    if (!opts.canAdd()) return stop(t('feed.locked'));
    const inRoom = new Set([...queue.map((item) => (item.media.kind === 'youtube' ? item.media.id : '')), current?.media.kind === 'youtube' ? current.media.id : '']);
    const skip = new Set([...played, ...run.seen, ...inRoom]);
    // Leftovers of the last page first (no call needed).
    const waiting = run.pending.filter((id) => !played!.has(id) && !inRoom.has(id));
    if (waiting.length > 0) {
      add(feed.kind, waiting.slice(0, PER_ROUND[feed.kind]));
      run.pending = waiting.slice(PER_ROUND[feed.kind]);
      return;
    }
    if (run.done) return stop(t('feed.end', { topic: feed.label }));
    loading = true;
    const key = run.key;
    try {
      const page = run.next ? `&page=${encodeURIComponent(run.next)}` : '';
      const source = feed.source;
      // Security M6: a topic's words go in the body, never in the address.
      const response = await fetch(`${path(source, feed.kind)}&hl=${lang()}${page}`, source.kind === 'topic' ? wordsRequest(source.q) : undefined);
      const answer = response.ok ? parseSearchAnswer(await response.json(), POOL_RESULTS) : ({ error: 'failed' } as const);
      if (!info || !run || run.key !== key || !mine()) return;
      if ('error' in answer) {
        if (answer.error === 'busy' || answer.error === 'failed') {
          retryAt = Date.now() + 30_000;
          return;
        }
        return stop(t(answer.error === 'quota' ? 'feed.quota' : 'feed.off'));
      }
      const fresh = freshIds(
        answer.items.map((item) => item.id),
        skip,
      );
      // A pool, a chart or a random channel is the same for every room: each room plays it in its own order.
      if (source.kind === 'pool' || ((source.kind === 'channel' || source.kind === 'chanOf') && source.order === 'random')) shuffle(fresh);
      for (const id of fresh) run.seen.add(id);
      add(feed.kind, fresh.slice(0, PER_ROUND[feed.kind]));
      run.pending = fresh.slice(PER_ROUND[feed.kind]);
      run.next = answer.next ?? null;
      run.done = !answer.next;
      emptyPages = fresh.length === 0 ? emptyPages + 1 : 0;
      if (fresh.length === 0 && (run.done || emptyPages >= EMPTY_PAGES_MAX)) return stop(t('feed.end', { topic: feed.label }));
      // A page with nothing new: try the next one shortly (bounded by EMPTY_PAGES_MAX).
      if (fresh.length === 0) setTimeout(() => void tick(), 500);
    } catch {
      retryAt = Date.now() + 30_000;
    } finally {
      loading = false;
    }
  }

  /** Start a feed, or steer the running one of the same kind (its queued videos go; the next ones follow the steer). */
  function start(kind: FeedKind, label: string, source: FeedSource): void {
    const clean = label.replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!clean) return;
    if (!opts.canAdd()) {
      opts.note(t('feed.locked'));
      return;
    }
    clearQueued();
    send({ kind, label: clean, source, paused: false });
    opts.note(t(info?.kind === kind ? 'feed.steered' : 'feed.started', { topic: clean }));
  }

  // Card FC1: Test Lab `feed.region`: the running feed's request and the YouTube selection it stands for (country,
  // its language, kind chip, words, order), so a "Japan gives Indian videos" report can be checked at a glance.
  debugHooks.register('feedRegion', () => ({
    commands: [
      {
        id: 'feed.region',
        tab: 'status',
        run: () => {
          const feed = info;
          if (!feed) return JSON.stringify({ feed: null });
          const s = feed.source;
          const region = s.kind === 'topic' || s.kind === 'pool' ? (s.region ?? (s.kind === 'pool' ? 'auto' : 'world')) : null;
          const pageLang = lang() === 'en' ? 'en' : 'tr';
          const youtube =
            region === null || region === 'auto'
              ? null
              : s.kind === 'topic'
                ? feedSearchParams({ shape: feed.kind === 'shorts' ? 'shorts' : 'videos', words: s.q, region, pageLang, pool: s.pool ?? null })
                : s.kind === 'pool' && feed.kind === 'shorts'
                  ? feedSearchParams({ shape: 'shorts', region, pageLang, pool: s.pool })
                  : { chart: 'mostPopular', regionCode: region };
          return JSON.stringify({ kind: feed.kind, source: s, path: path(s, feed.kind), youtube, note: region === 'auto' ? "auto: the server uses the connection's country" : undefined });
        },
      },
    ],
  }));

  return {
    get info(): FeedInfo | null {
      return info;
    },
    /** Kept for older callers: the running feed's name. */
    get topic(): string | null {
      return info?.label ?? null;
    },
    /** This tab runs the feed (Test Lab). */
    get runner(): boolean {
      return mine();
    },
    /** How many played ids this tab knows (Test Lab). */
    get remembered(): number | null {
      return played ? played.size : null;
    },
    /** The server's feed (welcome or `feed`). */
    set(next: FeedInfo | null): void {
      const was = info;
      info = next;
      if (!next || (was && runKey(was) !== runKey(next))) run = null;
      // A runner asks the room's memory again when it (re)starts, so ids played meanwhile are skipped too.
      if (next && next.by === opts.myId() && (!was || was.by !== next.by || runKey(was) !== runKey(next))) {
        played = null;
        asked = false;
      }
      opts.changed();
      void tick();
    },
    played(ids: string[]): void {
      played = new Set(ids);
      void tick();
    },
    start,
    /** The 0.9.91 shortcut: a Shorts feed on these words. */
    startTopic(words: string): void {
      start('shorts', words, { kind: 'topic', q: words.replace(/\s+/g, ' ').trim().slice(0, 80) });
    },
    pause(paused: boolean): void {
      if (info) send({ kind: info.kind, label: info.label, source: info.source, paused });
    },
    stop: () => stop(),
    tick: () => void tick(),
  };
}

export type RoomFeed = ReturnType<typeof createShortsFeed>;

function shuffle<T>(list: T[]): void {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
}
