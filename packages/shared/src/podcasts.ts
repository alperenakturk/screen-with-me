// Podcasts together (card P2, research `docs/internal/research/more-players.md`): words in the link box → "🎧 Podcasts"
// → shows from Apple's free iTunes Search API → a show's newest episodes from its RSS feed → an episode is a plain
// audio file the room already syncs (`{kind:'html5', url, poster}`). The Worker does the calls (`apps/server/src/
// podcasts.ts`); these are the pure parts: what is taken from Apple's answers and from a feed, and the answers' shape.

export const PODCAST_RESULTS = 12;
export const PODCAST_EPISODES = 30;
/**
 * PERF1c: a feed is read and parsed only up to this many `<item>`s. Feeds list the newest first by convention, and we
 * show the newest `PODCAST_EPISODES`; a 4 MB feed parsed whole took 14–24 ms of CPU, over the Worker's 10 ms (Free plan).
 */
export const FEED_MAX_ITEMS = 200;
/** A feed is never read past this many bytes, whatever its items. */
export const FEED_MAX_BYTES = 4 * 1024 * 1024;
/** A show's id at Apple (its `collectionId`): digits only. */
export const PODCAST_ID = /^\d{1,12}$/;
/** Cover art is only taken from Apple's image servers (the site's CSP allows those). */
export const PODCAST_ART = /^https:\/\/[a-z0-9-]+\.mzstatic\.com\/[^\s"'<>]{1,500}$/;

export interface PodcastShow {
  id: string;
  title: string;
  author: string;
  art: string | null;
}
export interface PodcastEpisode {
  title: string;
  url: string;
  /** Seconds (0 = not known). */
  duration: number;
  /** Published (ms since 1970; 0 = not known). */
  date: number;
}
export type ShowsAnswer = { items: PodcastShow[] } | { error: 'busy' | 'failed' };
export type EpisodesAnswer = { show: { title: string; art: string | null }; items: PodcastEpisode[] } | { error: 'busy' | 'failed' | 'none' };

const text = (value: unknown, max = 200): string =>
  typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '';
export const cleanArt = (value: unknown): string | null => (typeof value === 'string' && PODCAST_ART.test(value) ? value : null);
function cleanAudioUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.href.length <= 2048 ? url.href : null;
  } catch {
    return null;
  }
}

/** Apple's search answer → shows that have a feed. */
export function parseItunesSearch(body: unknown, limit = PODCAST_RESULTS): PodcastShow[] {
  const results = (body as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return [];
  const shows: PodcastShow[] = [];
  for (const r of results as Record<string, unknown>[]) {
    if (!r || typeof r !== 'object') continue;
    const id = typeof r.collectionId === 'number' ? String(r.collectionId) : '';
    const title = text(r.collectionName ?? r.trackName);
    if (!PODCAST_ID.test(id) || !title || typeof r.feedUrl !== 'string') continue;
    shows.push({ id, title, author: text(r.artistName, 100), art: cleanArt(r.artworkUrl600) ?? cleanArt(r.artworkUrl100) });
    if (shows.length >= limit) break;
  }
  return shows;
}

/** Apple's lookup answer for one show → its feed address, title and art. */
export function parseItunesLookup(body: unknown): { feed: string; title: string; art: string | null } | null {
  const r = ((body as { results?: unknown } | null)?.results as Record<string, unknown>[] | undefined)?.[0];
  if (!r || typeof r.feedUrl !== 'string') return null;
  const feed = cleanAudioUrl(r.feedUrl);
  return feed ? { feed, title: text(r.collectionName), art: cleanArt(r.artworkUrl600) ?? cleanArt(r.artworkUrl100) } : null;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decode(value: string): string {
  const raw = value.replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1');
  return raw
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, name: string) => {
      if (name[0] === '#') {
        const code = name[1] === 'x' || name[1] === 'X' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : ' ';
      }
      return ENTITIES[name.toLowerCase()] ?? all;
    });
}
const tag = (item: string, name: string): string | null => {
  const m = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1]! : null;
};
const attr = (element: string, name: string): string | null => {
  const m = element.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[2] ?? m[3] ?? null) : null;
};

/** "1:02:03", "62:03", "3723" → seconds. */
export function parseDuration(value: string | null): number {
  if (!value) return 0;
  const v = value.trim();
  if (/^\d+$/.test(v)) return Math.min(Number(v), 48 * 3600);
  const parts = v.split(':').map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !Number.isFinite(p) || p < 0)) return 0;
  return parts.reduce((sum, p) => sum * 60 + p, 0);
}

/**
 * A feed's text → its newest episodes with an audio file (`<enclosure>` of an audio type, or an address ending like
 * audio). A small reader for RSS 2.0 as podcasts use it: no DOM in a Worker, and nothing in a feed is ever run.
 */
export function parseFeed(xml: string, limit = PODCAST_EPISODES, maxItems = FEED_MAX_ITEMS): PodcastEpisode[] {
  const episodes: PodcastEpisode[] = [];
  const itemPattern = /<item[\s>][\s\S]*?<\/item>/gi;
  let seen = 0;
  for (let match = itemPattern.exec(xml); match && seen < maxItems; match = itemPattern.exec(xml)) {
    seen++;
    const item = match[0];
    const enclosure = item.match(/<enclosure\b[^>]*>/i)?.[0] ?? '';
    const rawUrl = attr(enclosure, 'url');
    const type = attr(enclosure, 'type') ?? '';
    if (!rawUrl) continue;
    const url = cleanAudioUrl(decode(rawUrl));
    if (!url || !(type.startsWith('audio/') || /\.(mp3|m4a|aac|ogg|oga|opus|wav)(\?|$)/i.test(url))) continue;
    const title = text(decode(tag(item, 'title') ?? ''));
    if (!title) continue;
    const date = Date.parse(decode(tag(item, 'pubDate') ?? '').trim());
    episodes.push({ title, url, duration: parseDuration(decode(tag(item, 'itunes:duration') ?? '')), date: Number.isFinite(date) ? date : 0 });
  }
  return episodes.sort((a, b) => b.date - a.date).slice(0, limit);
}

/**
 * The Worker's feed reader (PERF1c): takes the body's chunks and says when to stop, at `FEED_MAX_ITEMS` closed items
 * or `FEED_MAX_BYTES`, so a huge feed is neither downloaded nor decoded whole.
 */
export class FeedReader {
  private readonly decoder = new TextDecoder();
  private parts: string[] = [];
  private bytes = 0;
  private items = 0;
  private tail = '';
  private readonly maxItems: number;
  private readonly maxBytes: number;

  constructor(maxItems = FEED_MAX_ITEMS, maxBytes = FEED_MAX_BYTES) {
    this.maxItems = maxItems;
    this.maxBytes = maxBytes;
  }

  /** Adds a chunk; true when the reader has enough and the rest of the body can be dropped. */
  push(chunk: Uint8Array): boolean {
    const room = this.maxBytes - this.bytes;
    const part = chunk.byteLength > room ? chunk.subarray(0, room) : chunk;
    this.bytes += part.byteLength;
    const text = this.decoder.decode(part, { stream: true });
    this.parts.push(text);
    // Count closing tags, also one split across two chunks (the last 6 characters are kept for the next look).
    const look = this.tail + text;
    this.items += look.match(/<\/item>/gi)?.length ?? 0;
    this.tail = look.slice(-6);
    if (/<\/item>/i.test(this.tail)) this.tail = '';
    return this.items >= this.maxItems || this.bytes >= this.maxBytes;
  }

  text(): string {
    return this.parts.join('') + this.decoder.decode();
  }
}

/** The Worker's answers, checked on the page. */
export function parseShowsAnswer(body: unknown): ShowsAnswer {
  const b = body as { items?: unknown; error?: unknown } | null;
  if (b?.error === 'busy') return { error: 'busy' };
  if (!b || !Array.isArray(b.items)) return { error: 'failed' };
  const items = (b.items as Partial<PodcastShow>[]).flatMap((s) =>
    s && typeof s.id === 'string' && PODCAST_ID.test(s.id) && typeof s.title === 'string' ? [{ id: s.id, title: text(s.title), author: text(s.author, 100), art: cleanArt(s.art) }] : [],
  );
  return { items };
}
export function parseEpisodesAnswer(body: unknown): EpisodesAnswer {
  const b = body as { show?: { title?: unknown; art?: unknown }; items?: unknown; error?: unknown } | null;
  if (b?.error === 'busy' || b?.error === 'none') return { error: b.error };
  if (!b || !Array.isArray(b.items)) return { error: 'failed' };
  const items = (b.items as Partial<PodcastEpisode>[]).flatMap((e) => {
    const url = e && typeof e.url === 'string' ? cleanAudioUrl(e.url) : null;
    return url && typeof e.title === 'string' ? [{ title: text(e.title), url, duration: typeof e.duration === 'number' ? e.duration : 0, date: typeof e.date === 'number' ? e.date : 0 }] : [];
  });
  return { show: { title: text(b.show?.title), art: cleanArt(b.show?.art) }, items };
}
