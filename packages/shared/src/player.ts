/**
 * Senkron motoru hangi oynatıcıyla konuştuğunu bilmez; sadece bu arayüzü
 * kullanır. YouTube oynatıcısı, sayfadaki <video> öğesi ve ileride eklentinin
 * başka sitelerde bulduğu videolar bu arayüzü uygular.
 */
export interface PlayerAdapter {
  /**
   * Oynatma hızı küçük adımlarla (örn. 1.05x) ayarlanabiliyor mu?
   * Öyleyse küçük kaymalar sıçramadan, hafifçe hızlanıp yavaşlayarak düzeltilir.
   * YouTube sadece 0.25'lik adımlara izin verdiği için false.
   */
  readonly fineRate: boolean;
  /**
   * Biz sardığımızda oynatıcı kendiliğinden "oynuyor/durdu" olayları da yollar mı?
   * (YouTube yollar; tarayıcının <video>'su yollamaz.) Öyleyse sarmadan hemen
   * sonraki bir oynat/durdur olayı kullanıcıdan gelmiş sayılmaz.
   */
  readonly seekNoise?: boolean;
  getTime(): number;
  /** Videonun toplam süresi (saniye); bilinmiyorsa 0. */
  getDuration(): number;
  isPaused(): boolean;
  /** Video sona geldi mi? (Sona gelen videoyu tekrar başlatmamak için.) */
  isEnded(): boolean;
  /**
   * Oynat dense takılmadan oynayabilecek kadar yüklendi mi? ("Herkes hazır" için;
   * bilinmiyorsa true kabul edilir.)
   */
  canPlayThrough?(): boolean;
  getRate(): number;
  /** Tarayıcı otomatik oynatmayı engellerse 'blocked' döner. */
  play(): Promise<'ok' | 'blocked'>;
  pause(): void;
  seek(seconds: number): void;
  setRate(rate: number): void;
  /** Oynatıcının kendi olaylarını dinler (kullanıcı tıkladı mı, biz mi tetikledik ayırt etmez). */
  onEvent(listener: (event: PlayerEvent) => void): void;
  destroy(): void;
  /**
   * Our own volume control (0.9.90.1, the site's players have no controls of their own any more). Local only:
   * never sent to the room. 0–1.
   */
  getVolume?(): number;
  setVolume?(volume: number): void;
  isMuted?(): boolean;
  setMuted?(muted: boolean): void;
  /**
   * Open another video in the same player (YouTube: `cueVideoById`) instead of building a new one: switching shorts
   * took 1–2 s because every switch rebuilt the YouTube iframe. Resolves when the new video is cued.
   */
  load?(videoId: string): Promise<void>;
  /** Captions: `null` = this video has none (the button stays hidden). */
  captions?(): boolean | null;
  setCaptions?(on: boolean): void;
}

export type PlayerEvent = 'play' | 'pause' | 'ratechange';
