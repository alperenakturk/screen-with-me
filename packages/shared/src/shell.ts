// "Kabuk": film kendi sekmesinde oynarken eklenti, sitenin oda sayfasını sayfanın üstüne tam
// ekran bir katman olarak açar (film sayfası → eklentinin shell.html'i → sitemiz?shell=1).
// Katmanda videonun olduğu yere bir delik açılır; film sitesinin videosu o deliğe yerleşir.
// Böylece film sayfasındaki arayüz sitenin birebir aynısıdır. Oda bağlantısını site tutar;
// eklenti sadece site ile film çerçevesindeki senkron motoru arasında mesaj taşır.
// Bu dosya üç tarafın (site, shell.html, arka plan) ortak mesajlarını içerir.

import type { EmbedReply, EmbedRequest } from './embed.ts';

/** Ekrandaki bir dikdörtgen (CSS pikseli, görünür alana göre). */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Katmanın hâli:
 * - `bar`: video henüz bulunmadı; üstte ince şerit, film sayfası görünür (kullanıcı oynat'a basabilsin).
 * - `full`: oda görünümü; `hole` videonun yeri, `islands` deliğin içinde yine görünmesi gerekenler
 *   (tepki kartları, bekleme bandı, kartlar).
 * - `open`: tam katman, delik yok (odada YouTube gibi sitenin kendi oynattığı bir şey var).
 */
export type ShellLayout =
  | { mode: 'bar'; height: number }
  | { mode: 'full'; hole: Rect; islands: Rect[] }
  | { mode: 'open' };

/** Ayar deposunun bir kaydı: değer ve ne zaman yazıldığı (hangisi yeniyse o geçerli). */
export interface StoreEntry {
  v: string;
  at: number;
}

export type StoreEntries = Record<string, StoreEntry>;

/** Site → eklenti (ana sitede site-bridge, kabukta shell.html dinler). */
export type SiteToExt =
  | { type: 'store-hello' }
  /** Kabuktaki oda sayfası dinlemeye başladı: sayfa adresi / video durumu yeniden gelsin (önceden gelen kaçmış olabilir). */
  | { type: 'shell-ready' }
  /** Sitede değişen ayarlar (ya da eklentide olmayan/daha eski olanlar). */
  | { type: 'store-push'; entries: StoreEntries }
  | { type: 'embed'; request: EmbedRequest }
  | { type: 'layout'; layout: ShellLayout }
  /** Sekmeyi başka bir adrese götür (yeni film sayfası ya da sitedeki oda). */
  | { type: 'navigate'; url: string }
  /** Bizim ⛶: film sayfasının tamamı tam ekran olsun (katman ve video birlikte). */
  | { type: 'fullscreen'; on: boolean }
  /** Elle video seçimi: film sayfasındaki videoların üstünde "Bunu senkronla" düğmeleri (aç/kapat). */
  | { type: 'pick'; on: boolean };

/** Eklenti → site. */
export type ExtToSite =
  | { type: 'store'; entries: StoreEntries }
  | { type: 'reply'; reply: EmbedReply }
  /** Film sekmesinin adresi (odadaki sayfa bu mu?). */
  | { type: 'page'; url: string }
  /** Film sayfasında senkronlanacak video bulundu mu? */
  | { type: 'video'; found: boolean }
  /** Tam ekran değişti (Esc ile çıkıldı vb.). */
  | { type: 'fullscreen'; on: boolean }
  /**
   * Film sayfasında delik açıldı: sayfa gizlendi, video deliğe oturdu. Site deliğin içini ancak bundan sonra saydam
   * yapar (önce yapınca, eklenti sayfayı gizleyene kadar geçen birkaç milisaniyede film sitesi görünüyordu).
   */
  | { type: 'hole' }
  /** Kullanıcı film sayfasında bir videoyu seçti: seçim modu bitti, senkron artık o videoda. */
  | { type: 'picked' };

/** Site ⇄ site-bridge / shell.html mesajlarındaki kaynak etiketleri. */
export const SITE_SOURCE = 'screenwithme-site';
export const EXT_SOURCE = 'screenwithme-extension';

/** Ana sitedeki köprünün desteklediği kabuk sürümü (eski eklenti bunu yazmaz → "güncelle" kartı). */
export const SHELL_VERSION = '1';

/** Delikli katmanın kırpma yolu: tüm ekran, içinde delik, deliğin içinde adacıklar (evenodd). */
export function holePath(width: number, height: number, hole: Rect, islands: Rect[]): string {
  const box = (r: Rect) => `M${r.x} ${r.y}H${r.x + r.w}V${r.y + r.h}H${r.x}Z`;
  const parts = [box({ x: 0, y: 0, w: width, h: height }), box(hole), ...islands.map(box)];
  return `path(evenodd, "${parts.join('')}")`;
}

/**
 * Üst üste binen adacıkları kapsayan tek dikdörtgende birleştirir. Kesme yolu çift-tek kuralıyla çizilir: iki
 * adacığın kesiştiği yer iki kez sayılıp katmandan kesilirdi (art arda atılan emojiler yarım/silik görünüyordu).
 */
export function mergeRects(rects: Rect[]): Rect[] {
  const out = rects.map((r) => ({ ...r }));
  const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  for (let merged = true; merged; ) {
    merged = false;
    for (let i = 0; i < out.length && !merged; i++) {
      for (let j = i + 1; j < out.length; j++) {
        const a = out[i]!;
        const b = out[j]!;
        if (!overlap(a, b)) continue;
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        out[i] = { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
        out.splice(j, 1);
        merged = true;
        break;
      }
    }
  }
  return out;
}

/** Gelen dikdörtgen geçerli mi (sayılar, makul boyut)? Bozuk mesaj yerleşimi bozmasın. */
export function isRect(x: unknown): x is Rect {
  const r = x as Rect | null;
  return (
    !!r &&
    [r.x, r.y, r.w, r.h].every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 100_000) &&
    r.w >= 0 &&
    r.h >= 0
  );
}

/** Gelen yerleşimi doğrular (en fazla 12 adacık). */
export function cleanLayout(x: unknown): ShellLayout | null {
  const l = x as Partial<{ mode: string; height: number; hole: unknown; islands: unknown }> | null;
  if (l?.mode === 'open') return { mode: 'open' };
  if (l?.mode === 'bar') return typeof l.height === 'number' && l.height > 0 && l.height < 400 ? { mode: 'bar', height: Math.round(l.height) } : null;
  if (l?.mode === 'full' && isRect(l.hole) && Array.isArray(l.islands)) {
    return { mode: 'full', hole: l.hole, islands: l.islands.filter(isRect).slice(0, 12) };
  }
  return null;
}

export type { EmbedReply, EmbedRequest };
