import { DurableObject } from 'cloudflare:workers';
import { addUsage, cleanUsage, pruneUsage, type UsageBook, type UsageKind } from '@swm/shared/yt-usage';
import { readCapped } from './fallback.ts';

/**
 * YouTube usage counters (card Y3, for the quota increase form): one instance (`usage`) keeps per UTC day how many
 * requests of each kind reached YouTube, the API calls by method and their units, at most 90 days. Nothing about
 * people: no words, no IP, no room id. `POST /add {kind, calls}` (from the Worker and the room objects), `GET /read`.
 */
export class YoutubeUsage extends DurableObject<Env> {
  override async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    const now = Date.now();
    const book = (await this.ctx.storage.get<UsageBook>('book')) ?? {};
    if (path === '/read' && request.method === 'GET') {
      return new Response(JSON.stringify(pruneUsage(book, now)), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
    }
    if (path !== '/add' || request.method !== 'POST') return new Response('Not found', { status: 404 });
    const body = await readCapped(request, 1024).catch(() => null);
    let parsed: unknown = null;
    try {
      parsed = body ? JSON.parse(body) : null;
    } catch {
      parsed = null;
    }
    const usage = cleanUsage(parsed);
    if (!usage) return new Response('bad', { status: 400 });
    await this.ctx.storage.put('book', addUsage(book, usage.kind, usage.calls, now));
    return new Response('ok');
  }
}

/** Counts one request's calls to YouTube (never throws: the counters must not break a search). */
export async function recordUsage(env: Env, kind: UsageKind, calls: Record<string, number>): Promise<void> {
  if (!env.USAGE || !Object.keys(calls).length) return;
  try {
    const stub = env.USAGE.get(env.USAGE.idFromName('usage'));
    await stub.fetch('https://usage/add', { method: 'POST', body: JSON.stringify({ kind, calls }) });
  } catch {
    // Counting is best effort.
  }
}

/**
 * `GET /api/youtube/usage` for the owner: the counters, only with the header `X-Usage-Token` equal to the Worker
 * secret `USAGE_TOKEN` (refused without the secret too).
 */
export async function youtubeUsage(request: Request, env: Env): Promise<Response> {
  const given = request.headers.get('X-Usage-Token') ?? '';
  if (!env.USAGE_TOKEN || !env.USAGE || !(await sameText(given, env.USAGE_TOKEN))) return new Response('Forbidden', { status: 403 });
  return env.USAGE.get(env.USAGE.idFromName('usage')).fetch('https://usage/read');
}

/** Compares two secrets without leaking their length or prefix through timing. */
async function sameText(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}
