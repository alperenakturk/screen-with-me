import {
  cleanPageToken,
  FEED_RESULTS,
  isPoolKind,
  isPoolRegionChoice,
  isQuotaError,
  parseChannelParam,
  poolRegion,
  isVideoId,
  LIKE_SEARCH_PAGE,
  parseVideoItems,
  POOL_CATEGORY,
  POOL_RESULTS,
  poolWindow,
  titleWords,
  normalizeQuery,
  parseDurations,
  parseUpright,
  parseSearchItems,
  SEARCH_RESULTS,
  shortsOnly,
  type SearchAnswer,
  type SearchResult,
} from '@swm/shared/youtube-search';
import type { UsageKind } from '@swm/shared/yt-usage';
import { recordUsage } from './usage.ts';

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

/** The API key plus the calls one request made (card Y3: counted per day for the quota form). */
interface ApiKey {
  key: string;
  calls: Record<string, number>;
}

async function callYouTube(path: string, params: Record<string, string>, api: ApiKey): Promise<{ ok: true; body: unknown } | { ok: false; quota: boolean }> {
  const url = new URL(`${API}/${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set('key', api.key);
  api.calls[path] = (api.calls[path] ?? 0) + 1;
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
  const resultKey = cacheKey(url.origin, `yt-search2?hl=${lang}&q=${encodeURIComponent(query)}${short ? '&short=1' : ''}${page ? `&page=${page}` : ''}`);
  const quotaKey = cacheKey(url.origin, 'yt-quota');
  const cached = await cache.match(resultKey);
  if (cached) return cached;
  if (await cache.match(quotaKey)) return json({ error: 'quota' });

  // Only real calls to YouTube count against the address's limit (answers from the cache are free).
  if (env.SEARCH_LIMIT && !(await env.SEARCH_LIMIT.limit({ key: await ipKey() })).success) return json({ error: 'busy' });

  const api: ApiKey = { key: env.YOUTUBE_API_KEY, calls: {} };
  try {
    return await searchWith(api, query, lang, short, page, cache, resultKey, quotaKey);
  } finally {
    await recordUsage(env, 'search', api.calls);
  }
}

async function searchWith(api: ApiKey, query: string, lang: 'tr' | 'en', short: boolean, page: string | null, cache: Cache, resultKey: Request, quotaKey: Request): Promise<Response> {
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
    api,
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
    // `player` with a `maxWidth` tells the video's shape (upright = a Short, 0.9.91.12); still 1 unit.
    const videos = await callYouTube(
      'videos',
      { part: 'contentDetails,player', maxWidth: '100', id: items.map((item) => item.id).join(','), fields: 'items(id,contentDetails/duration,player(embedWidth,embedHeight))' },
      api,
    );
    if (videos.ok) items = parseSearchItems(search.body, parseDurations(videos.body), limit, parseUpright(videos.body));
  }
  // The feed only takes real Shorts (YouTube's "short" filter means under 4 minutes): short and, when the shapes
  // came, upright.
  if (short) {
    items = shortsOnly(items);
    if (items.some((item) => item.short)) items = items.filter((item) => item.short);
  }
  const next = cleanPageToken((search.body as { nextPageToken?: unknown } | null)?.nextPageToken);
  const response = json(next ? { items, next } : { items }, RESULT_TTL_S);
  await cache.put(resultKey, response.clone());
  return response;
}

type Call = Awaited<ReturnType<typeof callYouTube>>;

/**
 * The shared steps of the Shorts answers: the cache, the "quota used up" memory and the per-address limit around
 * `work`, which makes the real calls. Only calls that reach YouTube count against the address's limit.
 */
async function cached(request: Request, url: URL, env: Env, ipKey: () => Promise<string>, kind: UsageKind, path: string, work: (api: ApiKey) => Promise<SearchAnswer | Call>): Promise<Response> {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  if (!env.YOUTUBE_API_KEY) return json({ error: 'off' });
  const cache = caches.default;
  const resultKey = cacheKey(url.origin, path);
  const quotaKey = cacheKey(url.origin, 'yt-quota');
  const hit = await cache.match(resultKey);
  if (hit) return hit;
  if (await cache.match(quotaKey)) return json({ error: 'quota' });
  if (env.SEARCH_LIMIT && !(await env.SEARCH_LIMIT.limit({ key: await ipKey() })).success) return json({ error: 'busy' });
  const api: ApiKey = { key: env.YOUTUBE_API_KEY, calls: {} };
  const answer = await work(api).finally(() => recordUsage(env, kind, api.calls));
  if ('ok' in answer) {
    if (answer.ok) return json({ error: 'failed' });
    if (answer.quota) {
      await cache.put(quotaKey, json({ error: 'quota' }, QUOTA_TTL_S));
      return json({ error: 'quota' });
    }
    return json({ error: 'failed' });
  }
  if ('error' in answer) return json(answer);
  const response = json(answer, RESULT_TTL_S);
  await cache.put(resultKey, response.clone());
  return response;
}

/** Only real Shorts: short, and upright when the shapes came. */
function keepShorts(items: SearchResult[]): SearchResult[] {
  const shorts = shortsOnly(items);
  return shorts.some((item) => item.short) ? shorts.filter((item) => item.short) : shorts;
}

/** search.list for Shorts + videos.list for their length and shape (101 units). */
async function searchShorts(params: Record<string, string>, key: ApiKey, limit: number): Promise<SearchAnswer | Call> {
  const search = await callYouTube(
    'search',
    {
      part: 'snippet',
      type: 'video',
      videoEmbeddable: 'true',
      videoDuration: 'short',
      maxResults: String(limit),
      fields: 'nextPageToken,items(id/videoId,snippet(title,channelTitle,liveBroadcastContent))',
      ...params,
    },
    key,
  );
  if (!search.ok) return search;
  let items = parseSearchItems(search.body, new Map(), limit);
  if (items.length > 0) {
    const videos = await callYouTube(
      'videos',
      { part: 'contentDetails,player', maxWidth: '100', id: items.map((item) => item.id).join(','), fields: 'items(id,contentDetails/duration,player(embedWidth,embedHeight))' },
      key,
    );
    if (videos.ok) items = parseSearchItems(search.body, parseDurations(videos.body), limit, parseUpright(videos.body));
  }
  items = keepShorts(items);
  const next = cleanPageToken((search.body as { nextPageToken?: unknown } | null)?.nextPageToken);
  return next ? { items, next } : { items };
}

/**
 * `GET /api/youtube/pool?kind=popular|music|…&hl=tr|en&page=…` — "🎲 Keşfet" (0.9.91.18): the most watched Shorts
 * of the last two weeks in a category, one shared pool per language and day (the cache key carries the UTC day), so
 * every room draws from the same answer and a day costs one search per pool page. Rooms shuffle it themselves. Only
 * `safeSearch=strict` here: nobody chose a topic, the room just gets what the pool has.
 */
export async function youtubePool(request: Request, url: URL, env: Env, ipKey: () => Promise<string>): Promise<Response> {
  const kind = url.searchParams.get('kind');
  if (!isPoolKind(kind)) return new Response('Bad kind', { status: 400 });
  const lang = url.searchParams.get('hl') === 'en' ? 'en' : 'tr';
  const rawPage = url.searchParams.get('page');
  const page = rawPage === null ? null : cleanPageToken(rawPage);
  if (rawPage !== null && page === null) return new Response('Bad page', { status: 400 });
  // Card 10 (owner's pick A): the viewer's country by default (Cloudflare's `cf.country` for this request, never
  // stored or logged), a chosen country, or `world` (no region). One shared pool per kind + region + language + day.
  const choice = url.searchParams.get('region') ?? 'auto';
  if (!isPoolRegionChoice(choice)) return new Response('Bad region', { status: 400 });
  const region = poolRegion(choice, (request as Request & { cf?: { country?: unknown } }).cf?.country, lang);
  const { day, publishedAfter } = poolWindow(Date.now());
  const category = POOL_CATEGORY[kind];
  return cached(request, url, env, ipKey, 'pool', `yt-pool2?kind=${kind}&hl=${lang}&region=${region}&day=${day}${page ? `&page=${page}` : ''}`, (key) =>
    searchShorts(
      {
        q: '#shorts',
        order: 'viewCount',
        publishedAfter,
        ...(region === 'world' ? {} : { regionCode: region }),
        relevanceLanguage: lang,
        safeSearch: 'strict',
        ...(category ? { videoCategoryId: category } : {}),
        ...(page ? { pageToken: page } : {}),
      },
      key,
      POOL_RESULTS,
    ),
  );
}

const VIDEO_FIELDS = 'items(id,snippet(title,channelTitle,channelId,liveBroadcastContent),contentDetails/duration,player(embedWidth,embedHeight))';

/**
 * `GET /api/youtube/like?id=<video>&hl=tr|en&page=…` — "✨ Bunun gibi" (0.9.91.18): more Shorts like the one playing.
 * First the same channel's latest uploads (4 units: the video, the channel's uploads playlist, its items, their
 * shapes), then `next` switches to a search on the title's words (101 units a page). There is no official "related
 * videos" any more (YouTube removed `relatedToVideoId` in 2023).
 */
export async function youtubeLike(request: Request, url: URL, env: Env, ipKey: () => Promise<string>): Promise<Response> {
  const id = url.searchParams.get('id');
  if (!isVideoId(id)) return new Response('Bad id', { status: 400 });
  const lang = url.searchParams.get('hl') === 'en' ? 'en' : 'tr';
  const rawPage = url.searchParams.get('page');
  const page = rawPage === null ? null : cleanPageToken(rawPage);
  if (rawPage !== null && page === null) return new Response('Bad page', { status: 400 });
  return cached(request, url, env, ipKey, 'like', `yt-like1?id=${id}&hl=${lang}${page ? `&page=${page}` : ''}`, async (key) => {
    const source = await callYouTube('videos', { part: 'snippet', id, fields: 'items(snippet(title,channelId))' }, key);
    if (!source.ok) return source;
    const snippet = ((source.body as { items?: { snippet?: { title?: unknown; channelId?: unknown } }[] } | null)?.items ?? [])[0]?.snippet;
    const words = typeof snippet?.title === 'string' ? titleWords(snippet.title) : null;
    const bySearch = (token: string | null) =>
      words
        ? searchShorts({ q: `${words} #shorts`, relevanceLanguage: lang, safeSearch: 'moderate', ...(token ? { pageToken: token } : {}) }, key, FEED_RESULTS)
        : Promise.resolve<SearchAnswer>({ items: [] });
    if (page) {
      const answer = await bySearch(page === LIKE_SEARCH_PAGE ? null : page);
      return 'items' in answer ? { ...answer, items: answer.items.filter((item) => item.id !== id) } : answer;
    }
    const channelId = typeof snippet?.channelId === 'string' && /^UC[A-Za-z0-9_-]{22}$/.test(snippet.channelId) ? snippet.channelId : null;
    let items: SearchResult[] = [];
    if (channelId) {
      const channel = await callYouTube('channels', { part: 'contentDetails', id: channelId, fields: 'items/contentDetails/relatedPlaylists/uploads' }, key);
      if (!channel.ok) return channel;
      const uploads = ((channel.body as { items?: { contentDetails?: { relatedPlaylists?: { uploads?: unknown } } }[] } | null)?.items ?? [])[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (typeof uploads === 'string' && /^UU[A-Za-z0-9_-]{22}$/.test(uploads)) {
        const list = await callYouTube('playlistItems', { part: 'contentDetails', playlistId: uploads, maxResults: '50', fields: 'items/contentDetails/videoId' }, key);
        if (!list.ok) return list;
        const ids = ((list.body as { items?: { contentDetails?: { videoId?: unknown } }[] } | null)?.items ?? [])
          .map((item) => item.contentDetails?.videoId)
          .filter((x): x is string => isVideoId(x) && x !== id);
        if (ids.length) {
          const videos = await callYouTube('videos', { part: 'snippet,contentDetails,player', maxWidth: '100', id: ids.join(','), fields: VIDEO_FIELDS }, key);
          if (!videos.ok) return videos;
          items = keepShorts(parseVideoItems(videos.body));
        }
      }
    }
    // Too few from the channel: start with the title's words at once.
    if (items.length < 4) {
      const answer = await bySearch(null);
      if (!('items' in answer)) return answer;
      const seen = new Set(items.map((item) => item.id));
      items = [...items, ...answer.items.filter((item) => item.id !== id && !seen.has(item.id))];
      return answer.next ? { items, next: answer.next } : { items };
    }
    return words ? { items, next: LIKE_SEARCH_PAGE } : { items };
  });
}

/**
 * `GET /api/youtube/channel?c=UC…|@handle&hl=tr|en&page=…` — card 10: the ♾ feed from one channel (a channel link or
 * @handle typed into the ♾ window). channels.list (by id or `forHandle`, 1 unit) → the uploads playlist → its newest
 * 50 (playlistItems, 1 unit) → their length and shape (videos.list, 1 unit): 3 units a page, each page cached for the
 * day per channel. `next` is the playlist's page token. Words (a channel's name) stay a topic search on purpose: a name
 * can't be told from a topic, and a channel-name search would cost 100 units.
 */
export async function youtubeChannel(request: Request, url: URL, env: Env, ipKey: () => Promise<string>): Promise<Response> {
  const ref = parseChannelParam(url.searchParams.get('c'));
  if (!ref) return new Response('Bad channel', { status: 400 });
  const lang = url.searchParams.get('hl') === 'en' ? 'en' : 'tr';
  const rawPage = url.searchParams.get('page');
  const page = rawPage === null ? null : cleanPageToken(rawPage);
  if (rawPage !== null && page === null) return new Response('Bad page', { status: 400 });
  const { day } = poolWindow(Date.now());
  const label = 'id' in ref ? ref.id : `@${ref.handle.toLowerCase()}`;
  return cached(request, url, env, ipKey, 'channel', `yt-chan1?c=${encodeURIComponent(label)}&hl=${lang}&day=${day}${page ? `&page=${page}` : ''}`, async (key) => {
    const channel = await callYouTube(
      'channels',
      { part: 'contentDetails', ...('id' in ref ? { id: ref.id } : { forHandle: `@${ref.handle}` }), fields: 'items/contentDetails/relatedPlaylists/uploads' },
      key,
    );
    if (!channel.ok) return channel;
    const uploads = ((channel.body as { items?: { contentDetails?: { relatedPlaylists?: { uploads?: unknown } } }[] } | null)?.items ?? [])[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (typeof uploads !== 'string' || !/^UU[A-Za-z0-9_-]{22}$/.test(uploads)) return { items: [] };
    const list = await callYouTube(
      'playlistItems',
      { part: 'contentDetails', playlistId: uploads, maxResults: '50', fields: 'nextPageToken,items/contentDetails/videoId', ...(page ? { pageToken: page } : {}) },
      key,
    );
    if (!list.ok) return list;
    const body = list.body as { nextPageToken?: unknown; items?: { contentDetails?: { videoId?: unknown } }[] } | null;
    const ids = (body?.items ?? []).map((item) => item.contentDetails?.videoId).filter((x): x is string => isVideoId(x));
    const next = cleanPageToken(body?.nextPageToken);
    if (!ids.length) return next ? { items: [], next } : { items: [] };
    const videos = await callYouTube('videos', { part: 'snippet,contentDetails,player', maxWidth: '100', id: ids.join(','), fields: VIDEO_FIELDS }, key);
    if (!videos.ok) return videos;
    const items = keepShorts(parseVideoItems(videos.body));
    return next ? { items, next } : { items };
  });
}
