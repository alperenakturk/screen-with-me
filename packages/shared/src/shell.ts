// "Kabuk": film kendi sekmesinde oynarken eklenti, sitenin oda sayfasını sayfanın üstüne tam
// ekran bir katman olarak açar (film sayfası → eklentinin shell.html'i → sitemiz?shell=1).
// Katmanda videonun olduğu yere bir delik açılır; film sitesinin videosu o deliğe yerleşir.
// Böylece film sayfasındaki arayüz sitenin birebir aynısıdır. Oda bağlantısını site tutar;
// eklenti sadece site ile film çerçevesindeki senkron motoru arasında mesaj taşır.
// Bu dosya üç tarafın (site, shell.html, arka plan) ortak mesajlarını içerir.

import type { EmbedReply, EmbedRequest } from './embed.ts';
import type { Member, RtcRequest, RtcResult, Signal, VoiceMode } from './protocol.ts';

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
  | { type: 'pick'; on: boolean }
  /** Kullanıcı sitede bir bağlantıyı yeni sekmede açıyor: o sekme reklam sayılıp kapatılmasın. */
  | { type: 'open-ok' }
  /** Kapatılan reklam sekmesini geri aç. */
  | { type: 'reopen'; url: string }
  /** Film sayfasında sesli sohbet: eklentinin görünmeyen sayfası (offscreen) mikrofonu ve bağlantıları tutar. */
  | { type: 'voice'; msg: VoiceUp };

/** Eklenti → site. */
export type ExtToSite =
  | { type: 'store'; entries: StoreEntries }
  | { type: 'reply'; reply: EmbedReply }
  /**
   * Film sekmesinin adresi (odadaki sayfa bu mu?). `strayed`: film sayfası reklam yönlendirmesiyle başka bir siteye
   * gitti (oda hâlâ aynı filmde; site "Filme geri dön" der).
   */
  | { type: 'page'; url: string; strayed?: boolean }
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
  | { type: 'picked' }
  /** Film sayfasının açtığı bir sekme (başka siteye giden, büyük ihtimalle reklam) kapatıldı. */
  | { type: 'tab-closed'; url: string }
  /** Eklentinin kabukta neleri desteklediği (eski eklentide gelmez: o zaman ses kapalı kalır). */
  | { type: 'caps'; voice: boolean }
  | { type: 'voice'; msg: VoiceDown };

/**
 * Site → eklentinin ses sayfası (offscreen). Film sayfasındaki katmanda mikrofon izni film sitesinin adına sorulurdu;
 * ses bu yüzden eklentide çalışır, oda bağlantısı yine sitede kalır (bağlantı mesajlarını site taşır).
 */
export type VoiceUp =
  /** Bu sitenin (yeni bağlantının) haberi: ses sayfası durumunu söyler. */
  | { op: 'hello' }
  /** `quiet`: kendiliğinden yeniden katılma (izin yoksa izin sekmesi açılmaz, sessizce vazgeçilir). */
  | { op: 'join'; mode: VoiceMode; myId: string; members: Member[]; quiet?: boolean }
  /** Seste iken site yeniden bağlandı (yeni üye kimliği): bağlantılar baştan kurulur, mikrofon kalır. */
  | { op: 'reset'; myId: string; members: Member[] }
  | { op: 'leave' }
  | { op: 'mic'; on: boolean }
  | { op: 'members'; myId: string | null; members: Member[] }
  | { op: 'signal'; from: string; data: Signal }
  | { op: 'rtc-result'; id: number; result: RtcResult };

/** Eklentinin ses sayfası → site. */
export type VoiceDown =
  | { op: 'state'; active: boolean; mic: boolean }
  /** Odaya "seste miyim / mikrofonum" bildir (site kendi bağlantısından yollar). */
  | { op: 'announce'; on: boolean; mic?: boolean }
  | { op: 'signal'; to: string; data: Signal }
  | { op: 'rpc'; id: number; request: RtcRequest }
  /** Dinlenenlerin ses seviyesi (0–1) ve kendi mikrofonumun seviyesi. */
  | { op: 'levels'; levels: [string, number][]; me: number }
  | { op: 'failed'; memberId: string }
  /** Katılamadı: `denied` mikrofon izni verilmedi. */
  | { op: 'error'; code: 'denied' | 'failed' };

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
