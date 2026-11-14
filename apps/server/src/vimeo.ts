import { readWords } from './youtube.ts';
import { normalizeQuery } from '@swm/shared/youtube-search';
import { parseVimeoSearch, vimeoSearchUrl, type VimeoAnswer } from '@swm/shared/vimeo-search';

/**
 * Card SRC1: `POST /api/vimeo/search` (words in the body, security M6) asks the Vimeo API for public videos that any
 * site may embed. The `VIMEO_TOKEN` secret (an unauthenticated app token, scope `public`) stays in this Worker: it goes
 * only in the header of the call to api.vimeo.com and never into an answer, a log line or a cache key. Without the
 * secret the answer is `{error:'off'}` and the page says "not available yet". Answers are cached a day by the words;
 * only real calls count against `SEARCH_LIMIT` (shared with the YouTube and podcast searches).
 */
const TIMEOUT_MS = 6000;
const SEARCH_TTL_S = 24 * 3600;

const cacheKey = (origin: string, path: string) => new Request(`${origin}/__cache/${path}`);
function json(answer: VimeoAnswer, maxAge = 0): Response {
  return new Response(JSON.stringify(answer), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': maxAge > 0 ? `public, max-age=${maxAge}` : 'no-store' },
  });
}

export async function vimeoSearch(request: Request, url: URL, env: Env, ipKey: () => Promise<string>): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const query = normalizeQuery(await readWords(request));
  if (query === null) return new Response('Missing query', { status: 400 });
  const token = env.VIMEO_TOKEN?.trim();
  if (!token) return json({ error: 'off' });

  const cache = caches.default;
  const key = cacheKey(url.origin, `vimeo-search1?q=${encodeURIComponent(query)}`);
  const cached = await cache.match(key);
  if (cached) return cached;
  if (env.SEARCH_LIMIT && !(await env.SEARCH_LIMIT.limit({ key: await ipKey() })).success) return json({ error: 'busy' });

  try {
    const response = await fetch(vimeoSearchUrl(query), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Authorization: `bearer ${token}`, Accept: 'application/vnd.vimeo.*+json;version=3.4' },
    });
    if (!response.ok) {
      // Only the status reaches the logs (never the token or the words).
      console.warn(`vimeo: search answered ${response.status}`);
      return json({ error: response.status === 429 ? 'busy' : 'failed' });
    }
    const answer = json({ items: parseVimeoSearch(await response.json().catch(() => null)) }, SEARCH_TTL_S);
    await cache.put(key, answer.clone());
    return answer;
  } catch {
    console.warn('vimeo: search had no answer');
    return json({ error: 'failed' });
  }
}

/** `GET /api/vimeo/status` → `{on}`: whether Vimeo search is set up (the picker's tile says "not available yet" if not). */
export function vimeoStatus(env: Env): Response {
  return new Response(JSON.stringify({ on: !!env.VIMEO_TOKEN?.trim() }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
