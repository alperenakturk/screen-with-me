import {
  PODCAST_EPISODES,
  PODCAST_ID,
  PODCAST_RESULTS,
  parseFeed,
  parseItunesLookup,
  parseItunesSearch,
  type EpisodesAnswer,
  type ShowsAnswer,
} from '@swm/shared/podcasts';
import { normalizeQuery } from '@swm/shared/youtube-search';

/**
 * Podcasts (card P2): `GET /api/podcasts/search?q&hl` asks Apple's free iTunes Search API (no key) for shows,
 * `GET /api/podcasts/episodes?id` looks the show up at Apple and reads its RSS feed for the newest episodes. The page
 * never passes an address: the feed always comes from Apple's own answer, so this Worker can't be made to open other
 * places. Both answers are cached (a day for searches, an hour for episodes) and only real calls count against
 * `SEARCH_LIMIT`. Nothing about the person is sent: Apple sees the words, the feed's host sees our Worker.
 */
const TIMEOUT_MS = 6000;
const SEARCH_TTL_S = 24 * 3600;
const EPISODES_TTL_S = 3600;
/** A feed bigger than this is cut there (episodes are newest first in nearly every feed). */
const FEED_MAX_BYTES = 4 * 1024 * 1024;

const cacheKey = (origin: string, path: string) => new Request(`${origin}/__cache/${path}`);
function json(answer: ShowsAnswer | EpisodesAnswer, maxAge = 0): Response {
  return new Response(JSON.stringify(answer), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': maxAge > 0 ? `public, max-age=${maxAge}` : 'no-store' },
  });
}
async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: 'application/json' } });
  return response.ok ? response.json() : null;
}
/** The start of a feed's text, at most `FEED_MAX_BYTES`. */
async function readFeed(url: string): Promise<string | null> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'follow', headers: { Accept: 'application/rss+xml, application/xml, text/xml' } });
  if (!response.ok || !response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < FEED_MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  void reader.cancel().catch(() => {});
  const all = new Uint8Array(Math.min(size, FEED_MAX_BYTES));
  let at = 0;
  for (const chunk of chunks) {
    const part = chunk.subarray(0, Math.max(0, all.length - at));
    all.set(part, at);
    at += part.length;
  }
  return new TextDecoder().decode(all);
}

export async function podcasts(request: Request, url: URL, env: Env, ipKey: () => Promise<string>): Promise<Response> {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const cache = caches.default;
  const allowed = async () => !env.SEARCH_LIMIT || (await env.SEARCH_LIMIT.limit({ key: await ipKey() })).success;

  if (url.pathname.endsWith('/search')) {
    const query = normalizeQuery(url.searchParams.get('q') ?? '');
    if (query === null) return new Response('Missing query', { status: 400 });
    const country = url.searchParams.get('hl') === 'tr' ? 'TR' : 'US';
    const key = cacheKey(url.origin, `pod-search1?c=${country}&q=${encodeURIComponent(query)}`);
    const cached = await cache.match(key);
    if (cached) return cached;
    if (!(await allowed())) return json({ error: 'busy' });
    try {
      const body = await getJson(`https://itunes.apple.com/search?media=podcast&entity=podcast&limit=${PODCAST_RESULTS + 8}&country=${country}&term=${encodeURIComponent(query)}`);
      if (!body) return json({ error: 'failed' });
      const answer = json({ items: parseItunesSearch(body) }, SEARCH_TTL_S);
      await cache.put(key, answer.clone());
      return answer;
    } catch {
      return json({ error: 'failed' });
    }
  }

  if (url.pathname.endsWith('/episodes')) {
    const id = url.searchParams.get('id') ?? '';
    if (!PODCAST_ID.test(id)) return new Response('Bad id', { status: 400 });
    const key = cacheKey(url.origin, `pod-episodes1?id=${id}`);
    const cached = await cache.match(key);
    if (cached) return cached;
    if (!(await allowed())) return json({ error: 'busy' });
    try {
      const show = parseItunesLookup(await getJson(`https://itunes.apple.com/lookup?id=${id}&entity=podcast`));
      if (!show) return json({ error: 'none' });
      const feed = await readFeed(show.feed);
      if (feed === null) return json({ error: 'failed' });
      const answer = json({ show: { title: show.title, art: show.art }, items: parseFeed(feed, PODCAST_EPISODES) }, EPISODES_TTL_S);
      await cache.put(key, answer.clone());
      return answer;
    } catch {
      return json({ error: 'failed' });
    }
  }
  return new Response('Not found', { status: 404 });
}
