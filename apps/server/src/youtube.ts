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
  videosOnly,
  POOL_REGIONS,
  type SearchAnswer,
  type SearchResult,
  WORDS_BODY_MAX,
} from '@swm/shared/youtube-search';
import { readCapped } from './fallback.ts';
import type { UsageKind } from '@swm/shared/yt-usage';
import { isPlaylistId } from '@swm/shared/media';
import { recordUsage, spendBudget } from './usage.ts';
import { EXPECTED_UNITS } from '@swm/shared/yt-usage';

const API = 'https://www.googleapis.com/youtube/v3';
const TIMEOUT_MS = 5000;
/** The pause before the one retry of a YouTube call that got a 5xx or no answer. */
const RETRY_MS = 400;
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

async function callYouTube(path: string, params: Record<string, string>, api: ApiKey): Promise<{ ok: true; body: unknown } | { ok: false; quota: boolean; status?: number }> {
  const url = new URL(`${API}/${path}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  url.searchParams.set('key', api.key);
  // One more try after a short pause when YouTube answers 5xx or does not answer in time (a live e2e saw one such
  // "failed" right after a deploy, 3 Nov 2026). Each try is counted; a 4xx never repeats.
  for (let attempt = 0; ; attempt++) {
    api.calls[path] = (api.calls[path] ?? 0) + 1;
    let status: number | 'no answer' = 'no answer';
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      status = response.status;
      const body: unknown = await response.json().catch(() => null);
      if (response.ok) return { ok: true, body };
      if (response.status < 500 || attempt > 0) {
        // Only the call's name and status reach the Worker's logs (never the key, the words or an address).
        console.warn(`youtube: ${path} answered ${status}`);
        return { ok: false, quota: response.status === 403 && isQuotaError(body), status: response.status };
      }
    } catch {
      if (attempt > 0) {
        console.warn(`youtube: ${path} answered ${status}`);
        return { ok: false, quota: false };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
  }
}

/**
 * `GET /api/youtube/search?q=…&hl=tr|en` — the room's link box asks this when someone types words instead of a link.
 * The API key stays here (Worker secret `YOUTUBE_API_KEY`); one search costs 101 of the 10 000 free daily units
 * (search.list 100 + videos.list 1 for the durations), so the cache and the per-IP limit matter.
 */
/**
 * Security M6: the words of a search (`q`) come in the POST body (form encoded, at most WORDS_BODY_MAX bytes), never in
 * the address, so the Worker's request logs never hold them. A missing or too large body gives no words.
 */
export async function readWords(request: Request): Promise<string> {
  const text = await readCapped(request, WORDS_BODY_MAX).catch(() => null);
  return text ? (new URLSearchParams(text).get('q') ?? '') : '';
}

export async function youtubeSearch(request: Request, url: URL, env: Env, ipKey: () => Promise<string>): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const query = normalizeQuery(await readWords(request));
  if (query === null) return new Response('Missing query', { status: 400 });
  const lang = url.searchParams.get('hl') === 'en' ? 'en' : 'tr';
  // Shorts feed (0.9.91): `short=1` asks for short videos only (25 per page), `page` continues an earlier answer.
  const short = url.searchParams.get('short') === '1';
  const rawPage = url.searchParams.get('page');
  const page = rawPage === null ? null : cleanPageToken(rawPage);
  if (rawPage !== null && page === null) return new Response('Bad page', { status: 400 });
  // Card SH2: "same topic, other country" (a Discover region), and the ▶ video feed (`long=1`: no Shorts).
  const rawRegion = url.searchParams.get('region');
  const region = rawRegion !== null && (POOL_REGIONS as readonly string[]).includes(rawRegion) ? rawRegion : null;
  const long = !short && url.searchParams.get('long') === '1';
  if (!env.YOUTUBE_API_KEY) return json({ error: 'off' });

  const cache = caches.default;
  const resultKey = cacheKey(url.origin, `yt-search2?hl=${lang}&q=${encodeURIComponent(query)}${short ? '&short=1' : ''}${long ? '&long=1' : ''}${region ? `&region=${region}` : ''}${page ? `&page=${page}` : ''}`);
  const quotaKey = cacheKey(url.origin, 'yt-quota');
  const cached = await cache.match(resultKey);
  if (cached) return markHit(cached);
  if (await cache.match(quotaKey)) return json({ error: 'quota' });

  // Only real calls to YouTube count against the address's limit (answers from the cache are free).
  if (env.SEARCH_LIMIT && !(await env.SEARCH_LIMIT.limit({ key: await ipKey() })).success) return json({ error: 'busy' });
  const budget = await budgetAnswer(env, await ipKey(), EXPECTED_UNITS.search);
  if (budget) return budget;

  const api: ApiKey = { key: env.YOUTUBE_API_KEY, calls: {} };
  try {
    return await searchWith(api, query, lang, short, page, cache, resultKey, quotaKey, region, long);
  } finally {
    await recordUsage(env, 'search', api.calls);
  }
}

async function searchWith(api: ApiKey, query: string, lang: 'tr' | 'en', short: boolean, page: string | null, cache: Cache, resultKey: Request, quotaKey: Request, region: string | null = null, long = false): Promise<Response> {
  const search = await callYouTube(
    'search',
    {
      part: 'snippet',
      type: 'video',
      // Only videos that may be played inside another site: everything else would fail in our player.
      videoEmbeddable: 'true',
      safeSearch: 'moderate',
      maxResults: String(short || long ? FEED_RESULTS : SEARCH_RESULTS),
      relevanceLanguage: lang,
      q: short ? `${query} #shorts` : query,
      ...(short ? { videoDuration: 'short' } : {}),
      ...(region ? { regionCode: region } : {}),
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

  const limit = short || long ? FEED_RESULTS : SEARCH_RESULTS;
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
  if (long) items = videosOnly(items);
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
/** Security M3: the daily budget's answer, or null when the request may go to YouTube. */
async function budgetAnswer(env: Env, ip: string, cost: number): Promise<Response | null> {
  const verdict = await spendBudget(env, ip, cost);
  if (verdict === 'day') return json({ error: 'quota' });
  if (verdict === 'ip') return json({ error: 'busy' });
  return null;
}

async function cached(request: Request, url: URL, env: Env, ipKey: () => Promise<string>, kind: UsageKind, cost: number, path: string, work: (api: ApiKey) => Promise<SearchAnswer | Call>): Promise<Response> {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  if (!env.YOUTUBE_API_KEY) return json({ error: 'off' });
  const cache = caches.default;
  const resultKey = cacheKey(url.origin, path);
  const quotaKey = cacheKey(url.origin, 'yt-quota');
  const hit = await cache.match(resultKey);
  if (hit) return markHit(hit);
  if (await cache.match(quotaKey)) return json({ error: 'quota' });
  if (env.SEARCH_LIMIT && !(await env.SEARCH_LIMIT.limit({ key: await ipKey() })).success) return json({ error: 'busy' });
  const budget = await budgetAnswer(env, await ipKey(), cost);
  if (budget) return budget;
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
async function searchShorts(params: Record<string, string>, key: ApiKey, limit: number, keep: (items: SearchResult[]) => SearchResult[] = keepShorts): Promise<SearchAnswer | Call> {
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
  items = keep(items);
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
  return cached(request, url, env, ipKey, 'pool', EXPECTED_UNITS.pool, `yt-pool2?kind=${kind}&hl=${lang}&region=${region}&day=${day}${page ? `&page=${page}` : ''}`, (key) =>
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
  // Card SH2: `videos=1` is the ▶ video feed's "like this video" (no Shorts, any length).
  const wantVideos = url.searchParams.get('videos') === '1';
  const keep = wantVideos ? videosOnly : keepShorts;
  return cached(request, url, env, ipKey, 'like', page ? EXPECTED_UNITS.likeSearch : EXPECTED_UNITS.like, `yt-like1?id=${id}&hl=${lang}${wantVideos ? '&videos=1' : ''}${page ? `&page=${page}` : ''}`, async (key) => {
    const source = await callYouTube('videos', { part: 'snippet', id, fields: 'items(snippet(title,channelId))' }, key);
    if (!source.ok) return source;
    const snippet = ((source.body as { items?: { snippet?: { title?: unknown; channelId?: unknown } }[] } | null)?.items ?? [])[0]?.snippet;
    const words = typeof snippet?.title === 'string' ? titleWords(snippet.title) : null;
    const bySearch = (token: string | null) =>
      words
        ? searchShorts(
            { q: wantVideos ? words : `${words} #shorts`, relevanceLanguage: lang, safeSearch: 'moderate', ...(wantVideos ? { videoDuration: 'any' } : {}), ...(token ? { pageToken: token } : {}) },
            key,
            FEED_RESULTS,
            keep,
          )
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
          items = keep(parseVideoItems(videos.body));
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
  // Card SH2: `of=<video>` is "continue from this channel" (the playing video's channel, one more unit to find it).
  const of = url.searchParams.get('of');
  const ref = of === null ? parseChannelParam(url.searchParams.get('c')) : null;
  if (of !== null ? !isVideoId(of) : !ref) return new Response('Bad channel', { status: 400 });
  const lang = url.searchParams.get('hl') === 'en' ? 'en' : 'tr';
  const rawPage = url.searchParams.get('page');
  const page = rawPage === null ? null : cleanPageToken(rawPage);
  if (rawPage !== null && page === null) return new Response('Bad page', { status: 400 });
  // Card SH2: `videos=1` keeps the channel's normal videos (the ▶ feed), `order=popular` sorts a page by views.
  const wantVideos = url.searchParams.get('videos') === '1';
  const popular = url.searchParams.get('order') === 'popular';
  const { day } = poolWindow(Date.now());
  const label = of !== null ? `of:${of}` : ref && 'id' in ref ? ref.id : `@${ref!.handle.toLowerCase()}`;
  const extra = `${wantVideos ? '&videos=1' : ''}${popular ? '&order=popular' : ''}`;
  const cost = of !== null ? EXPECTED_UNITS.chanOf : EXPECTED_UNITS.channel;
  return cached(request, url, env, ipKey, 'channel', cost, `yt-chan1?c=${encodeURIComponent(label)}&hl=${lang}&day=${day}${extra}${page ? `&page=${page}` : ''}`, async (key) => {
    let byId = ref && 'id' in ref ? ref.id : null;
    if (of !== null) {
      const source = await callYouTube('videos', { part: 'snippet', id: of, fields: 'items(snippet(channelId))' }, key);
      if (!source.ok) return source;
      const found = ((source.body as { items?: { snippet?: { channelId?: unknown } }[] } | null)?.items ?? [])[0]?.snippet?.channelId;
      if (typeof found !== 'string' || !/^UC[A-Za-z0-9_-]{22}$/.test(found)) return { items: [] };
      byId = found;
    }
    const channel = await callYouTube(
      'channels',
      { part: 'contentDetails', ...(byId ? { id: byId } : { forHandle: `@${(ref as { handle: string }).handle}` }), fields: 'items/contentDetails/relatedPlaylists/uploads' },
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
    const ids = (body?.items ?? []).map((item) => item.contentDetails?.videoId).filter((x): x is string => isVideoId(x) && x !== of);
    const next = cleanPageToken(body?.nextPageToken);
    if (!ids.length) return next ? { items: [], next } : { items: [] };
    const videos = await callYouTube(
      'videos',
      { part: `snippet,contentDetails,player${popular ? ',statistics' : ''}`, maxWidth: '100', id: ids.join(','), fields: popular ? `${VIDEO_FIELDS.slice(0, -1)},statistics/viewCount)` : VIDEO_FIELDS },
      key,
    );
    if (!videos.ok) return videos;
    let items = (wantVideos ? videosOnly : keepShorts)(parseVideoItems(videos.body));
    if (popular) {
      const views = viewCounts(videos.body);
      items = [...items].sort((a, b) => (views.get(b.id) ?? 0) - (views.get(a.id) ?? 0));
    }
    return next ? { items, next } : { items };
  });
}

/**
 * `GET /api/youtube/playlist?list=<id>&hl=tr|en&page=…` — card CR2: a YouTube / YouTube Music playlist or album link
 * pasted into the room fills the queue. playlistItems (1 unit, 50 a page) → their titles and length (videos.list,
 * 1 unit): 2 units a page, cached for the day per list. Shorts and normal videos both stay (an album is music, a list
 * can mix); the playlist's order is kept. A private or unknown list gives no items.
 */
export async function youtubePlaylist(request: Request, url: URL, env: Env, ipKey: () => Promise<string>): Promise<Response> {
  const list = url.searchParams.get('list');
  if (!isPlaylistId(list)) return new Response('Bad list', { status: 400 });
  const lang = url.searchParams.get('hl') === 'en' ? 'en' : 'tr';
  const rawPage = url.searchParams.get('page');
  const page = rawPage === null ? null : cleanPageToken(rawPage);
  if (rawPage !== null && page === null) return new Response('Bad page', { status: 400 });
  const { day } = poolWindow(Date.now());
  return cached(request, url, env, ipKey, 'playlist', EXPECTED_UNITS.playlist, `yt-list1?list=${list}&hl=${lang}&day=${day}${page ? `&page=${page}` : ''}`, async (key) => {
    const items = await callYouTube(
      'playlistItems',
      { part: 'contentDetails', playlistId: list, maxResults: '50', fields: 'nextPageToken,items/contentDetails/videoId', ...(page ? { pageToken: page } : {}) },
      key,
    );
    // A private, deleted or unknown list is a 404 from YouTube: no items, not an error.
    if (!items.ok) return 'status' in items && items.status === 404 ? { items: [] } : items;
    const body = items.body as { nextPageToken?: unknown; items?: { contentDetails?: { videoId?: unknown } }[] } | null;
    const ids = [...new Set((body?.items ?? []).map((item) => item.contentDetails?.videoId).filter(isVideoId))];
    const next = cleanPageToken(body?.nextPageToken);
    if (!ids.length) return next ? { items: [], next } : { items: [] };
    const videos = await callYouTube('videos', { part: 'snippet,contentDetails,player', maxWidth: '100', id: ids.join(','), fields: VIDEO_FIELDS }, key);
    if (!videos.ok) return videos;
    const found = new Map(parseVideoItems(videos.body, 50).map((item) => [item.id, item]));
    // videos.list answers in its own order: put the playlist's order back (a removed or private track is left out).
    const ordered = ids.flatMap((id) => (found.has(id) ? [found.get(id)!] : []));
    return next ? { items: ordered, next } : { items: ordered };
  });
}

/** videos.list `statistics/viewCount` by id (card SH2's "most viewed" channel feed). */
function viewCounts(body: unknown): Map<string, number> {
  const out = new Map<string, number>();
  for (const item of ((body as { items?: { id?: unknown; statistics?: { viewCount?: unknown } }[] } | null)?.items ?? [])) {
    const count = Number(item.statistics?.viewCount);
    if (typeof item.id === 'string' && Number.isFinite(count)) out.set(item.id, count);
  }
  return out;
}

/**
 * `GET /api/youtube/chart?kind=popular|music|…&region=auto|world|TR…&hl=…&page=…` — card SH2's ▶ "popular now" video
 * feed: YouTube's own most-popular chart (videos.list `chart=mostPopular`, 1 unit for 50), by country and category,
 * Shorts left out. One shared answer per kind + region + language + hour (it changes during the day).
 */
export async function youtubeChart(request: Request, url: URL, env: Env, ipKey: () => Promise<string>): Promise<Response> {
  const kind = url.searchParams.get('kind');
  if (!isPoolKind(kind)) return new Response('Bad kind', { status: 400 });
  const lang = url.searchParams.get('hl') === 'en' ? 'en' : 'tr';
  const rawPage = url.searchParams.get('page');
  const page = rawPage === null ? null : cleanPageToken(rawPage);
  if (rawPage !== null && page === null) return new Response('Bad page', { status: 400 });
  const choice = url.searchParams.get('region') ?? 'auto';
  if (!isPoolRegionChoice(choice)) return new Response('Bad region', { status: 400 });
  // The chart is per country: "world" falls back to the language's country.
  const picked = poolRegion(choice, (request as Request & { cf?: { country?: unknown } }).cf?.country, lang);
  const region = picked === 'world' ? (lang === 'en' ? 'US' : 'TR') : picked;
  const hour = new Date().toISOString().slice(0, 13);
  const category = POOL_CATEGORY[kind];
  return cached(request, url, env, ipKey, 'chart', EXPECTED_UNITS.chart, `yt-chart1?kind=${kind}&hl=${lang}&region=${region}&hour=${hour}${page ? `&page=${page}` : ''}`, async (key) => {
    const chart = await callYouTube(
      'videos',
      {
        part: 'snippet,contentDetails,player',
        chart: 'mostPopular',
        maxWidth: '100',
        maxResults: '50',
        regionCode: region,
        hl: lang,
        ...(category ? { videoCategoryId: category } : {}),
        ...(page ? { pageToken: page } : {}),
        fields: `nextPageToken,${VIDEO_FIELDS}`,
      },
      key,
    );
    if (!chart.ok) return chart;
    const items = videosOnly(parseVideoItems(chart.body));
    const next = cleanPageToken((chart.body as { nextPageToken?: unknown } | null)?.nextPageToken);
    return next ? { items, next } : { items };
  });
}

/**
 * Security R4-9: an answer from `caches.default` says so (`X-SWM-Cache: hit`), so the live e2e can tell whether the
 * Cache API works on this address (it may do nothing on `*.workers.dev`; then every repeated search spends quota).
 */
function markHit(response: Response): Response {
  const out = new Response(response.body, response);
  out.headers.set('X-SWM-Cache', 'hit');
  return out;
}
