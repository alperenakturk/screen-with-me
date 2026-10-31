import { isTikTokShortLink, parseTikTok } from '@swm/shared/media';
import { isValidMedia } from '@swm/shared/protocol';

const TIMEOUT_MS = 4000;
const MAX_HOPS = 3;
/** A short link always leads to the same video: keep the answer for a week. */
const RESULT_TTL_S = 7 * 24 * 3600;

function json(body: unknown, maxAge = 0): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': maxAge > 0 ? `public, max-age=${maxAge}` : 'no-store' },
  });
}

/**
 * `GET /api/tiktok/resolve?u=https://vm.tiktok.com/ZM…/` (0.9.91.18): the TikTok app shares short links; the browser
 * can't follow them (another site, no CORS), so the Worker follows the redirects, only on TikTok's own short-link
 * hosts, and answers the video (`{media}`) or `{error:'failed'}`. Cached per link; only real lookups count against the
 * address's search limit.
 */
export async function tiktokResolve(request: Request, url: URL, env: Env, ipKey: () => Promise<string>): Promise<Response> {
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
  const raw = url.searchParams.get('u') ?? '';
  if (!isTikTokShortLink(raw)) return new Response('Bad link', { status: 400 });
  const start = new URL(/^[a-z]+:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
  start.protocol = 'https:';
  start.search = '';
  start.hash = '';
  const cache = caches.default;
  const key = new Request(`${url.origin}/__cache/tt-resolve1?u=${encodeURIComponent(start.toString())}`);
  const hit = await cache.match(key);
  if (hit) return hit;
  if (env.SEARCH_LIMIT && !(await env.SEARCH_LIMIT.limit({ key: await ipKey() })).success) return json({ error: 'busy' });

  let at = start;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    let response: Response;
    try {
      response = await fetch(at.toString(), { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch {
      return json({ error: 'failed' });
    }
    const location = response.headers.get('location');
    if (!location) break;
    try {
      at = new URL(location, at);
    } catch {
      break;
    }
    const media = parseTikTok(at);
    if (media && isValidMedia(media)) {
      const answer = json({ media }, RESULT_TTL_S);
      await cache.put(key, answer.clone());
      return answer;
    }
    // Only TikTok's own addresses are followed.
    if (!/(^|\.)tiktok\.com$/.test(at.hostname)) break;
  }
  return json({ error: 'failed' });
}
