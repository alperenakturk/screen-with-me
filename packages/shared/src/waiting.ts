// "Herkes hazır": videosu takılan (yükleniyor, reklam vb.) biri olduğunda oda
// onu kısa süre bekler. Kararlar burada; sunucu sadece uygular.
//
// Araştırmadan çıkan iki ders:
// 1) Sınırsız beklemek tek bir yavaş kişinin odayı sürekli durdurup başlatmasına
//    yol açar → en fazla WAIT_MAX_MS beklenir, sonra oda devam eder.
// 2) Aynı kişi art arda bekletmesin → bekleme bitince WAIT_COOLDOWN_MS boyunca
//    o kişinin "hazır değilim"i odayı tekrar durdurmaz.

/** En fazla bu kadar beklenir; sonra oda beklenenler olmadan devam eder. */
export const WAIT_MAX_MS = 12_000;
/** Bekleme bittikten sonra aynı kişi bu süre boyunca odayı tekrar bekletemez. */
export const WAIT_COOLDOWN_MS = 30_000;

export type WaitDecision =
  /** Odayı durdur ve bu kişileri bekle. */
  | { kind: 'start'; ids: string[] }
  /** Beklenenlerin listesi değişti (hâlâ bekleniyor). */
  | { kind: 'update'; ids: string[] }
  /** Herkes hazır (ya da süre doldu): oda devam etsin. */
  | { kind: 'resume'; timedOut: boolean }
  | { kind: 'none' };

/** Sunucu uyuyup uyanınca kaldığı yerden devam etmek için saklanan hâl. */
export interface WaitSnapshot {
  notReady: string[];
  cooldownUntil: [string, number][];
  waitingFor: string[];
  waitingSince: number | null;
}

export class WaitTracker {
  private notReady = new Set<string>();
  private cooldownUntil = new Map<string, number>();
  private waitingFor: string[] = [];
  /** Oda bu bekleme yüzünden ne zamandan beri duruyor (null: beklemiyor). */
  waitingSince: number | null = null;

  snapshot(): WaitSnapshot {
    return {
      notReady: [...this.notReady],
      cooldownUntil: [...this.cooldownUntil],
      waitingFor: this.waitingFor,
      waitingSince: this.waitingSince,
    };
  }

  restore(s: WaitSnapshot | undefined): void {
    if (!s) return;
    this.notReady = new Set(s.notReady);
    this.cooldownUntil = new Map(s.cooldownUntil);
    this.waitingFor = s.waitingFor;
    this.waitingSince = s.waitingSince;
  }

  setReady(id: string, ready: boolean): void {
    if (ready) this.notReady.delete(id);
    else this.notReady.add(id);
  }

  /** Security L3: this member may not make the room wait before `until` (a person's cooldown carried to a new id). */
  holdOff(id: string, until: number): void {
    if (until > (this.cooldownUntil.get(id) ?? 0)) this.cooldownUntil.set(id, until);
  }

  /** The members that may not make the room wait yet, with until when. */
  cooldowns(): [string, number][] {
    return [...this.cooldownUntil];
  }

  remove(id: string): void {
    this.notReady.delete(id);
    this.cooldownUntil.delete(id);
  }

  get waiting(): string[] {
    return this.waitingFor;
  }

  /** Biri elle oynat/durdur/sar yaptı: bekleme iptal, herkes temiz sayfa. */
  cancel(): boolean {
    const wasWaiting = this.waitingSince !== null;
    this.waitingSince = null;
    this.waitingFor = [];
    this.notReady.clear();
    return wasWaiting;
  }

  /**
   * Ne yapılacağına karar verir.
   * @param playing Oda şu an oynuyor mu (bekleme başlatmak için gerekir).
   * @param present Odada şu an bağlı olan üyeler.
   */
  decide(now: number, enabled: boolean, playing: boolean, present: Set<string>): WaitDecision {
    for (const id of this.notReady) if (!present.has(id)) this.notReady.delete(id);
    const blockers = enabled
      ? [...this.notReady].filter((id) => (this.cooldownUntil.get(id) ?? 0) <= now).sort()
      : [];

    if (this.waitingSince === null) {
      if (blockers.length === 0 || !playing) return { kind: 'none' };
      this.waitingSince = now;
      this.waitingFor = blockers;
      return { kind: 'start', ids: blockers };
    }

    const timedOut = now - this.waitingSince >= WAIT_MAX_MS;
    if (blockers.length === 0 || timedOut || !enabled) {
      // Bekletenler bir süre tekrar bekletemesin.
      for (const id of new Set([...this.waitingFor, ...blockers])) this.cooldownUntil.set(id, now + WAIT_COOLDOWN_MS);
      if (timedOut) this.notReady.clear();
      this.waitingSince = null;
      this.waitingFor = [];
      return { kind: 'resume', timedOut };
    }

    if (blockers.join() !== this.waitingFor.join()) {
      this.waitingFor = blockers;
      return { kind: 'update', ids: blockers };
    }
    return { kind: 'none' };
  }
}
