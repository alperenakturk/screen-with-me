/**
 * Herkesin bilgisayar saati birkaç saniye farklı olabilir. Bu sınıf,
 * ping/pong ölçümleriyle sunucu saatini tahmin eder (NTP'nin basit hali).
 *
 * Her ölçümde: istemci `c` anında ping atar, sunucu kendi saatini `s` olarak
 * yollar, cevap `now` anında gelir. Gidiş-dönüş süresinin yarısı kadar
 * önce sunucu saati `s` idi; buradan fark (offset) hesaplanır. En kısa
 * gidiş-dönüşlü ölçüm en güvenilir olandır, o kullanılır.
 */
export class ServerClock {
  private samples: { rtt: number; offset: number }[] = [];
  private offset = 0;

  constructor(private readonly localNow: () => number = () => Date.now()) {}

  addSample(clientSent: number, serverTime: number): void {
    const now = this.localNow();
    const rtt = now - clientSent;
    if (rtt < 0) return;
    const offset = serverTime + rtt / 2 - now;
    this.samples.push({ rtt, offset });
    if (this.samples.length > 8) this.samples.shift();
    let best = this.samples[0]!;
    for (const sample of this.samples) if (sample.rtt < best.rtt) best = sample;
    this.offset = best.offset;
  }

  get synced(): boolean {
    return this.samples.length > 0;
  }

  /** Tahmini sunucu saati (ms). */
  now(): number {
    return this.localNow() + this.offset;
  }

  /** En iyi ölçümün gidiş-dönüş süresi (ms). */
  get rtt(): number | null {
    if (this.samples.length === 0) return null;
    return Math.min(...this.samples.map((s) => s.rtt));
  }
}
