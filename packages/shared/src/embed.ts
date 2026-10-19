// "Film sitenin içinde": başka bir sitedeki film sayfası odanın oynatıcı alanında
// (iframe) açılır, eklenti o çerçevedeki videoyu senkronlar. Oda bağlantısını site
// tutar (aynı kişi odada iki kez görünmesin); eklenti sadece site ile çerçeve
// arasında mesaj taşır. Bu dosya iki tarafın ortak kurallarını içerir.

import type { ClientMessage, PlaybackState } from './protocol.ts';

/** Sayfa çerçevede açılabilir mi? `xfo`/`csp`: site izin vermiyor; `insecure`: https içinde http sayfa. */
export type FrameVerdict = 'ok' | 'xfo' | 'csp' | 'insecure';

interface HeaderBag {
  get(name: string): string | null;
}

/**
 * Yanıt başlıklarından sayfanın `embedder` (bizim site) içinde açılıp açılamayacağını
 * tahmin eder. Başlıkları kaldırmıyoruz (mağaza kuralı); sadece önceden bakıp
 * açılamayacak sayfada boşuna hata ekranı göstermeden ayrı sekmeye düşüyoruz.
 *
 * Tarayıcının kuralı: CSP'de `frame-ancestors` varsa X-Frame-Options yok sayılır.
 */
export function frameVerdict(headers: HeaderBag, pageUrl: string, embedder: string): FrameVerdict {
  let page: URL;
  let parent: URL;
  try {
    page = new URL(pageUrl);
    parent = new URL(embedder);
  } catch {
    return 'ok';
  }
  if (parent.protocol === 'https:' && page.protocol === 'http:') return 'insecure';

  const csp = headers.get('content-security-policy');
  if (csp) {
    let hasAncestors = false;
    // Birden çok CSP başlığı virgülle birleşir; her biri ayrı ayrı uygulanır.
    for (const policy of csp.split(',')) {
      const sources = frameAncestors(policy);
      if (sources === null) continue;
      hasAncestors = true;
      if (!sources.some((source) => sourceMatches(source, parent, page))) return 'csp';
    }
    if (hasAncestors) return 'ok';
  }

  const xfo = headers.get('x-frame-options');
  if (xfo) {
    for (const raw of xfo.split(',')) {
      const value = raw.trim().toLowerCase();
      if (value === 'deny') return 'xfo';
      if (value === 'sameorigin' && page.origin !== parent.origin) return 'xfo';
      // ALLOW-FROM eskidi; Chrome tanımaz, yok sayar.
    }
  }
  return 'ok';
}

/** Politikadaki `frame-ancestors` kaynakları; yönerge yoksa null. */
function frameAncestors(policy: string): string[] | null {
  for (const directive of policy.split(';')) {
    const [name, ...sources] = directive.trim().split(/\s+/);
    if (name?.toLowerCase() === 'frame-ancestors') return sources.filter(Boolean);
  }
  return null;
}

/** Tek bir CSP kaynağı (`'self'`, `*`, `https:`, `*.ornek.com`, `https://ornek.com:443`) bizim siteyi kapsıyor mu? */
function sourceMatches(source: string, parent: URL, page: URL): boolean {
  const s = source.toLowerCase();
  if (s === "'none'") return false;
  if (s === "'self'") return parent.origin === page.origin;
  if (s === '*') return parent.protocol === 'http:' || parent.protocol === 'https:';
  if (/^[a-z][a-z0-9+.-]*:$/.test(s)) return s === parent.protocol || (s === 'http:' && parent.protocol === 'https:');
  const match = /^(?:([a-z][a-z0-9+.-]*):\/\/)?(\*\.)?([^:/]+|\*)(?::(\d+|\*))?(?:\/.*)?$/.exec(s);
  if (!match) return false;
  const [, scheme, wildcard, host, port] = match;
  if (scheme && `${scheme}:` !== parent.protocol && !(scheme === 'http' && parent.protocol === 'https:')) return false;
  if (!scheme && parent.protocol !== page.protocol && !(page.protocol === 'http:' && parent.protocol === 'https:')) return false;
  const hostname = parent.hostname;
  if (host === '*') {
    // "*" tek başına değilse (ör. "https://*") her ana bilgisayar.
  } else if (wildcard) {
    if (!hostname.endsWith(`.${host}`)) return false;
  } else if (hostname !== host) {
    return false;
  }
  if (port === '*') return true;
  // Port yazılmamışsa sadece varsayılan port (adreste port görünmez).
  if (!port) return parent.port === '';
  return parent.port === port || (parent.port === '' && port === (parent.protocol === 'https:' ? '443' : '80'));
}

/** Çerçevedeki senkron motorunun odaya gönderebileceği mesajlar (site bunları kendi bağlantısından yollar). */
const RELAYABLE = new Set<ClientMessage['t']>(['play', 'pause', 'seek', 'rate', 'next', 'ready']);

export function isRelayable(message: ClientMessage): boolean {
  return RELAYABLE.has(message.t);
}

/** Sitenin çerçevedeki videoya verdiği komutlar (tam ekran kontrolleri, pin şeridi, hız menüsü). */
export type EmbedControl =
  | { action: 'play' }
  | { action: 'pause' }
  | { action: 'seek'; time: number }
  | { action: 'rate'; rate: number }
  | { action: 'sync-all' };

/** Çerçevedeki videonun durumu (sitedeki ilerleme çubuğu ve pin şeridi için). */
export interface EmbedStatus {
  time: number;
  duration: number;
  paused: boolean;
  rate: number;
}

/** Site → eklenti (site-bridge → arka plan). */
export type EmbedRequest =
  /** `resume`: arka plan yeniden başladı, aynı film için bağlantı yeniden kuruluyor (kontrol yapma). */
  | { type: 'start'; roomId: string; url: string; resume?: boolean }
  | { type: 'state'; state: PlaybackState }
  | { type: 'clock'; offset: number; synced: boolean }
  | { type: 'control'; control: EmbedControl }
  | { type: 'stop' };

/** Eklenti → site. */
export type EmbedReply =
  /** Başlıklara göre açılamaz: hemen ayrı sekmeye düş. */
  | { type: 'blocked'; reason: Exclude<FrameVerdict, 'ok'> }
  /** Engel görünmüyor: çerçeveyi aç. */
  | { type: 'try' }
  /** Çerçevedeki film sayfasında eklenti çalıştı (sayfa gerçekten açıldı). */
  | { type: 'frame' }
  | { type: 'send'; message: ClientMessage }
  | { type: 'status'; status: EmbedStatus }
  /** Çerçevede basılan kısayol (1–8 emoji, Enter mesaj, P pin): site kendi kısayolu gibi işler. */
  | { type: 'key'; key: string }
  /** Film sitesinin kendi tam ekran düğmesine basıldı: site kendi tam ekranını açsın (arayüzümüz görünsün). */
  | { type: 'fullscreen' };

/** Çerçeveden siteye iletilen kısayol tuşları. */
export function isForwardedKey(key: string): boolean {
  return key === 'Enter' || key.toLowerCase() === 'p' || /^[1-8]$/.test(key);
}
