/**
 * "Jeton kovası" hız sınırlayıcı: kovada en fazla `capacity` jeton olur,
 * saniyede `perSecond` jeton dolar, her mesaj bir jeton harcar. Kısa
 * patlamalara izin verir ama sürekli spam'i keser.
 *
 * Bellekte tutulur; sunucu uykuya geçip uyanırsa sıfırlanır, bu sorun değil.
 */
/** Security L2: the most keys one limiter remembers. */
const MAX_KEYS = 4000;

export class RateLimiter {
  private buckets = new Map<string, { tokens: number; last: number }>();

  constructor(
    private readonly capacity: number,
    private readonly perSecond: number,
  ) {}

  allow(key: string, now = Date.now()): boolean {
    // At most MAX_KEYS remembered keys (made-up browser ids must not grow the map without end); the oldest goes first.
    if (!this.buckets.has(key) && this.buckets.size >= MAX_KEYS) this.buckets.delete(this.buckets.keys().next().value!);
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, last: now };
    bucket.tokens = Math.min(this.capacity, bucket.tokens + ((now - bucket.last) / 1000) * this.perSecond);
    bucket.last = now;
    const allowed = bucket.tokens >= 1;
    if (allowed) bucket.tokens -= 1;
    this.buckets.set(key, bucket);
    return allowed;
  }

  forget(key: string): void {
    this.buckets.delete(key);
  }
}
