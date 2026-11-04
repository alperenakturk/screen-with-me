import { DurableObject } from 'cloudflare:workers';
import { dailyKeyCache, hashIp, newIpHashKey } from '@swm/shared/ip-hash';

/**
 * Security M5: keeps the day's random key for the IP hash (one instance, `keys`). A new UTC day makes a new key and
 * overwrites the old one, so yesterday's hashes can no longer be matched to an address by anyone.
 */
export class IpKeys extends DurableObject<Env> {
  override async fetch(): Promise<Response> {
    const day = new Date().toISOString().slice(0, 10);
    let entry = await this.ctx.storage.get<{ day: string; key: string }>('key');
    if (!entry || entry.day !== day) {
      entry = { day, key: newIpHashKey() };
      await this.ctx.storage.put('key', entry);
    }
    return Response.json(entry, { headers: { 'Cache-Control': 'no-store' } });
  }
}

/** The Worker's copy of the day's key (security R4-2: only a resolved key is cached, the object call has a timeout). */
let todaysKey: ((now?: number) => Promise<CryptoKey>) | null = null;

function keyCache(env: Env) {
  todaysKey ??= dailyKeyCache(async (signal) => {
    const res = await env.IPKEYS.get(env.IPKEYS.idFromName('keys')).fetch('https://keys/', { signal });
    return (await res.json()) as { day: string; key: string };
  });
  return todaysKey;
}

/** The visitor's IP as the rate limits see it: `hashIp` with today's key. */
export async function ipKey(request: Request, env: Env): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  return hashIp(ip, await keyCache(env)());
}
