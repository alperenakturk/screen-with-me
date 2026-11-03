import { DurableObject } from 'cloudflare:workers';
import { hashIp, ipHashKey, newIpHashKey } from '@swm/shared/ip-hash';

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

/** The Worker's copy of the day's key (one object call per isolate and day). */
let cached: { day: string; key: Promise<CryptoKey> } | null = null;

async function todaysKey(env: Env): Promise<CryptoKey> {
  const day = new Date().toISOString().slice(0, 10);
  if (cached?.day !== day) {
    const key = (async () => {
      const entry = (await (await env.IPKEYS.get(env.IPKEYS.idFromName('keys')).fetch('https://keys/')).json()) as { day: string; key: string };
      return ipHashKey(entry.key);
    })();
    cached = { day, key };
  }
  const current = cached;
  try {
    return await current.key;
  } catch {
    // The key object can't be reached: try again on the next request, and meanwhile hash with this isolate's own
    // random key (limits then count per isolate for a moment; the site keeps working).
    if (cached === current) cached = null;
    isolateKey ??= ipHashKey(newIpHashKey());
    return isolateKey;
  }
}

let isolateKey: Promise<CryptoKey> | null = null;

/** The visitor's IP as the rate limits see it: `hashIp` with today's key. */
export async function ipKey(request: Request, env: Env): Promise<string> {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local';
  return hashIp(ip, await todaysKey(env));
}
