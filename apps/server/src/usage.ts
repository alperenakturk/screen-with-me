import { DurableObject } from 'cloudflare:workers';
import { addUsage, budgetCheck, cleanUsage, pruneUsage, unitsOf, unitsToday, usageDay, type UsageBook, type UsageKind } from '@swm/shared/yt-usage';
import { readCapped } from './fallback.ts';

/**
 * YouTube usage counters (card Y3, for the quota increase form): one instance (`usage`) keeps per UTC day how many
 * requests of each kind reached YouTube, the API calls by method and their units, at most 90 days. Nothing about
 * people: no words, no IP, no room id. `POST /add {kind, calls}` (from the Worker and the room objects), `GET /read`.
 */
export class YoutubeUsage extends DurableObject<Env> {
  /** Security M3: units allowed today but not counted yet, and what each address was allowed today. In memory only. */
  private budgetDay = '';
  private pending = 0;
  private ips = new Map<string, number>();

  override async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    const now = Date.now();
    const book = (await this.ctx.storage.get<UsageBook>('book')) ?? {};
    if (usageDay(now) !== this.budgetDay) {
      this.budgetDay = usageDay(now);
      this.pending = 0;
      this.ips.clear();
    }
    if (path === '/spend' && request.method === 'POST') {
      const body = await readCapped(request, 256).catch(() => null);
      let ask: { ip?: unknown; cost?: unknown } = {};
      try {
        ask = body ? JSON.parse(body) : {};
      } catch {
        ask = {};
      }
      const ip = typeof ask.ip === 'string' ? ask.ip.slice(0, 64) : '';
      const cost = typeof ask.cost === 'number' && Number.isInteger(ask.cost) && ask.cost > 0 && ask.cost <= 1000 ? ask.cost : null;
      if (cost === null) return new Response('bad', { status: 400 });
      const verdict = budgetCheck(unitsToday(book, now), this.pending, this.ips.get(ip) ?? 0, cost);
      if (verdict === 'ok') {
        this.pending += cost;
        if (this.ips.size >= 50_000 && !this.ips.has(ip)) this.ips.clear();
        this.ips.set(ip, (this.ips.get(ip) ?? 0) + cost);
      }
      return new Response(verdict);
    }
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
    // Counted now: what was allowed for it is no longer pending.
    this.pending = Math.max(0, this.pending - unitsOf(usage.calls));
    return new Response('ok');
  }
}

/**
 * Security M3: asks the budget before a request goes to YouTube. 'day' = today's budget is spent, 'ip' = this address
 * had its share. Without the object (tests) or when it can't be reached, the request may go (YouTube's own quota still
 * stops it; a broken counter must not turn search off).
 */
export async function spendBudget(env: Env, ip: string, cost: number): Promise<'ok' | 'day' | 'ip'> {
  if (!env.USAGE) return 'ok';
  try {
    const stub = env.USAGE.get(env.USAGE.idFromName('usage'));
    const answer = await (await stub.fetch('https://usage/spend', { method: 'POST', body: JSON.stringify({ ip, cost }) })).text();
    return answer === 'day' || answer === 'ip' ? answer : 'ok';
  } catch {
    return 'ok';
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
  // Both sides trimmed: an HTTP header loses spaces / a newline at its ends, a pasted GitHub secret may keep them.
  const given = (request.headers.get('X-Usage-Token') ?? '').trim();
  const key = (env.USAGE_TOKEN ?? '').trim();
  if (!key || !env.USAGE || !(await sameText(given, key))) return new Response('Forbidden', { status: 403 });
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
