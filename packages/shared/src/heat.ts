// Zaman çizelgesinde tepkiler: bir videoda hangi saniyelerde ne kadar emoji atıldığı.
// Sunucu tepkinin atıldığı anı kendi oynatma durumundan hesaplar (istemciye güvenmez),
// 10 sn'lik dilimlerde sayar; yeni gelen geçmişi `welcome` ile alır, sonra her tepkiyle
// (`at`) kendi kopyasını günceller. Site ve eklenti aynı sınıfı kullanır.

import type { Reaction } from './protocol.ts';

/** Dilim genişliği (sn). */
export const HEAT_BUCKET_S = 10;
/** En fazla bu kadar dilim (≈ 8 saat): bellek/depo sınırsız büyümesin. */
const MAX_BUCKETS = 3000;
/** Şeridin görünmesi için gereken en az tepki (bir iki emoji şerit açtırmasın). */
export const HEAT_MIN_TOTAL = 3;

/** Bir dilim: başladığı saniye, toplam tepki ve en çok atılan emoji. */
export interface HeatMark {
  s: number;
  n: number;
  emoji: Reaction;
}

/** Bir videonun tepki dağılımı (sunucu → istemci). */
export interface Heat {
  itemId: string;
  marks: HeatMark[];
}

export class HeatMap {
  private buckets = new Map<number, Map<Reaction, number>>();
  private total = 0;

  constructor(public itemId: string | null = null) {}

  /** Başka bir video açıldıysa sıfırlar. Sıfırlandıysa true. */
  reset(itemId: string | null): boolean {
    if (itemId === this.itemId) return false;
    this.itemId = itemId;
    this.buckets.clear();
    this.total = 0;
    return true;
  }

  add(at: number, emoji: Reaction, count = 1): void {
    if (!Number.isFinite(at) || at < 0) return;
    const bucket = Math.floor(at / HEAT_BUCKET_S);
    let counts = this.buckets.get(bucket);
    if (!counts) {
      if (this.buckets.size >= MAX_BUCKETS) return;
      counts = new Map();
      this.buckets.set(bucket, counts);
    }
    counts.set(emoji, (counts.get(emoji) ?? 0) + count);
    this.total += count;
  }

  get size(): number {
    return this.total;
  }

  /** Dilimler, zamana göre sıralı. */
  marks(): HeatMark[] {
    const out: HeatMark[] = [];
    for (const [bucket, counts] of this.buckets) {
      let n = 0;
      let top: Reaction | null = null;
      let topN = 0;
      for (const [emoji, c] of counts) {
        n += c;
        if (c > topN) {
          top = emoji;
          topN = c;
        }
      }
      if (top) out.push({ s: bucket * HEAT_BUCKET_S, n, emoji: top });
    }
    return out.sort((a, b) => a.s - b.s);
  }

  /** En çok tepki alan `k` an (birbirine 30 sn'den yakın olanlardan sadece en güçlüsü). */
  top(k = 3): HeatMark[] {
    const picked: HeatMark[] = [];
    for (const mark of this.marks().sort((a, b) => b.n - a.n)) {
      if (mark.n < 2) break;
      if (picked.some((p) => Math.abs(p.s - mark.s) < 30)) continue;
      picked.push(mark);
      if (picked.length === k) break;
    }
    return picked;
  }

  snapshot(): Heat | null {
    return this.itemId ? { itemId: this.itemId, marks: this.marks() } : null;
  }

  /** Sunucudan gelen geçmişi yükler (dilim başına sadece en sık emoji bilinir). */
  load(heat: Heat): void {
    this.itemId = heat.itemId;
    this.buckets.clear();
    this.total = 0;
    for (const mark of heat.marks) this.add(mark.s, mark.emoji, mark.n);
  }
}
