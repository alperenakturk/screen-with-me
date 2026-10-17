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
  getTime(): number;
  /** Videonun toplam süresi (saniye); bilinmiyorsa 0. */
  getDuration(): number;
  isPaused(): boolean;
  /** Video sona geldi mi? (Sona gelen videoyu tekrar başlatmamak için.) */
  isEnded(): boolean;
  getRate(): number;
  /** Tarayıcı otomatik oynatmayı engellerse 'blocked' döner. */
  play(): Promise<'ok' | 'blocked'>;
  pause(): void;
  seek(seconds: number): void;
  setRate(rate: number): void;
  /** Oynatıcının kendi olaylarını dinler (kullanıcı tıkladı mı, biz mi tetikledik ayırt etmez). */
  onEvent(listener: (event: PlayerEvent) => void): void;
  destroy(): void;
}

export type PlayerEvent = 'play' | 'pause' | 'ratechange';
