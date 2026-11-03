/**
 * Security M5: the short form of a visitor's IP address that our rate limits use. It is an HMAC-SHA-256 with a random
 * key that the server makes once per UTC day and throws away the next day, cut to 16 hex digits: without the key
 * nobody (us included, once the day is over) can work the address back out of it, and the same address gives the same
 * value only within one day.
 */
export async function hashIp(ip: string, key: CryptoKey): Promise<string> {
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`swm-ip:${ip}`));
  return Array.from(new Uint8Array(mac).slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Turns the day's raw key (32 random bytes in hex) into an HMAC key. */
export async function ipHashKey(hex: string): Promise<CryptoKey> {
  const bytes = new Uint8Array((hex.match(/../g) ?? []).map((h) => parseInt(h, 16)));
  return crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

/** 32 random bytes in hex: a new day's key. */
export function newIpHashKey(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('');
}
