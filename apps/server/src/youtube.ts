import {
  cleanPageToken,
  FEED_RESULTS,
  isQuotaError,
  normalizeQuery,
  parseDurations,
  parseSearchItems,
  SEARCH_RESULTS,
  shortsOnly,
  type SearchAnswer,
} from '@swm/shared/youtube-search';

const API = 'https://www.googleapis.com/youtube/v3';
const TIMEOUT_MS = 5000;
/** Same words in the same language are answered from the cache for a day (YouTube allows keeping results ≤ 30 days). */
const RESULT_TTL_S = 24 * 3600;
/**
 * After YouTube said "quota used up" nobody asks it again for 10 minutes. Requests refused for quota cost nothing, so
 * checking again this often is free: search opens by itself soon after the daily reset (midnight Pacific time).
 */
const QUOTA_TTL_S = 10 * 60;

/** Cache keys live under our own origin; they are never real addresses anybody can open. */
function cacheKey(origin: string, path: string): Request {
  return new Request(`${origin}/__cache/${path}`);
}

function json(answer: SearchAnswer, maxAge = 0): Response {
  return new Response(JSON.stringify(answer), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': maxAge > 0 ? `public, max-age=${maxAge}` : 'no-store',
    },
  });
}

async function callYouTube(path: string, params: Record<string, string>, key: string): Promise<{ ok: true; body: unknown } | { ok: false; quota: boolean }> {
  const url = new URL(`${API}/${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set('key', key);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const body: unknown = await response.json().catch(() => null);
    if (response.ok) return { ok: true, body };
    return { ok: false, quota: response.status === 403 && isQuotaError(body) };
  } catch {
    return { ok: false, quota: false };
  }
}

/**
 * `GET /api/youtube/search?q=…&hl=tr|en` — the room's link box asks this when someone types words instead of a link.
 * The API key stays here (Worker secret `YOUTUBE_API_KEY`); one search costs 101 of the 10 000 free daily units
 * (search.list 100 + videos.list 1 for the durations), so the cache and the per-IP limit matter.
 */
export async function youtubeSearch(request: Request, url: URL, env: Env, ipKey: () => Promise<string>): Promise<Response> {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const query = normalizeQuery(url.searchParams.get('q') ?? '');
  if (query === null) return new Response('Missing query', { status: 400 });
  const lang = url.searchParams.get('hl') === 'en' ? 'en' : 'tr';
  // Shorts feed (0.9.91): `short=1` asks for short videos only (25 per page), `page` continues an earlier answer.
  const short = url.searchParams.get('short') === '1';
  const rawPage = url.searchParams.get('page');
  const page = rawPage === null ? null : cleanPageToken(rawPage);
  if (rawPage !== null && page === null) return new Response('Bad page', { status: 400 });
  if (!env.YOUTUBE_API_KEY) return json({ error: 'off' });

  const cache = caches.default;
  const resultKey = cacheKey(url.origin, `yt-search?hl=${lang}&q=${encodeURIComponent(query)}${short ? '&short=1' : ''}${page ? `&page=${page}` : ''}`);
  const quotaKey = cacheKey(url.origin, 'yt-quota');
  const cached = await cache.match(resultKey);
  if (cached) return cached;
  if (await cache.match(quotaKey)) return json({ error: 'quota' });

  // Only real calls to YouTube count against the address's limit (answers from the cache are free).
  if (env.SEARCH_LIMIT && !(await env.SEARCH_LIMIT.limit({ key: await ipKey() })).success) return json({ error: 'busy' });

  const search = await callYouTube(
    'search',
    {
      part: 'snippet',
      type: 'video',
      // Only videos that may be played inside another site: everything else would fail in our player.
      videoEmbeddable: 'true',
      safeSearch: 'moderate',
      maxResults: String(short ? FEED_RESULTS : SEARCH_RESULTS),
      relevanceLanguage: lang,
      q: short ? `${query} #shorts` : query,
      ...(short ? { videoDuration: 'short' } : {}),
      ...(page ? { pageToken: page } : {}),
      fields: 'nextPageToken,items(id/videoId,snippet(title,channelTitle,liveBroadcastContent))',
    },
    env.YOUTUBE_API_KEY,
  );
  if (!search.ok) {
    if (search.quota) {
      await cache.put(quotaKey, json({ error: 'quota' }, QUOTA_TTL_S));
      return json({ error: 'quota' });
    }
    return json({ error: 'failed' });
  }

  const limit = short ? FEED_RESULTS : SEARCH_RESULTS;
  let items = parseSearchItems(search.body, new Map(), limit);
  if (items.length > 0) {
    // Durations are a nicety: if this call fails, the results still go out without them.
    const videos = await callYouTube('videos', { part: 'contentDetails', id: items.map((item) => item.id).join(','), fields: 'items(id,contentDetails/duration)' }, env.YOUTUBE_API_KEY);
    if (videos.ok) items = parseSearchItems(search.body, parseDurations(videos.body), limit);
  }
  // The feed only takes real Shorts (YouTube's "short" filter means under 4 minutes).
  if (short) items = shortsOnly(items);
  const next = cleanPageToken((search.body as { nextPageToken?: unknown } | null)?.nextPageToken);
  const response = json(next ? { items, next } : { items }, RESULT_TTL_S);
  await cache.put(resultKey, response.clone());
  return response;
}
