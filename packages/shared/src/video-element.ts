import type { PlayerAdapter, PlayerEvent } from './player.ts';

/**
 * Sayfadaki bir <video> öğesini senkron motorunun anlayacağı oynatıcıya çevirir.
 * Sitedeki doğrudan video linkleri ve eklentinin başka sitelerde bulduğu
 * videolar bunu kullanır. `release` öğeyi silmez, sadece dinlemeyi bırakır.
 */
export function wrapVideoElement(video: HTMLVideoElement): PlayerAdapter & { readonly element: HTMLVideoElement; release(): void } {
  const listeners = new Set<(event: PlayerEvent) => void>();
  const handlers: [string, () => void][] = (['play', 'pause', 'ratechange'] as const).map((type) => [
    type,
    () => listeners.forEach((listener) => listener(type)),
  ]);
  for (const [type, handler] of handlers) video.addEventListener(type, handler);

  const release = () => {
    listeners.clear();
    for (const [type, handler] of handlers) video.removeEventListener(type, handler);
  };

  return {
    element: video,
    fineRate: true,
    getTime: () => video.currentTime,
    getDuration: () => (Number.isFinite(video.duration) ? video.duration : 0),
    isPaused: () => video.paused,
    isEnded: () => video.ended,
    // HAVE_FUTURE_DATA: şu anki konumdan ileriye biraz veri var.
    canPlayThrough: () => video.readyState >= 3,
    getRate: () => video.playbackRate,
    async play() {
      try {
        await video.play();
        return 'ok';
      } catch (error) {
        return error instanceof DOMException && error.name === 'NotAllowedError' ? 'blocked' : 'ok';
      }
    },
    pause: () => video.pause(),
    seek: (seconds) => {
      video.currentTime = seconds;
    },
    setRate: (rate) => {
      video.playbackRate = rate;
    },
    onEvent: (listener) => listeners.add(listener),
    release,
    destroy: release,
  };
}

/** Bir videonun "asıl video" olma puanı için gereken bilgiler. */
export interface VideoInfo {
  width: number;
  height: number;
  /** Saniye; bilinmiyorsa 0 ya da NaN. */
  duration: number;
  playing: boolean;
  visible: boolean;
  /** Döngüde ve sessiz: arka plan videosu ya da reklam. */
  loopMuted?: boolean;
  /** Ekranda sabit duran (fixed/sticky) küçük video: köşedeki "yapışkan" reklam. */
  stickySmall?: boolean;
}

/** Bundan küçük videolar (önizleme, logo animasyonu) yok sayılır. */
const MIN_AREA = 200 * 112;

/**
 * Sayfada birden çok video olabilir (reklam, önizleme, arka plan). Asıl filmi
 * bulmak için: görünür ve yeterince büyük olmalı; uzun süreli (film/dizi) ve
 * oynayan videolar öne çıkar. 0 = aday değil.
 */
export function scoreVideo(info: VideoInfo): number {
  const area = info.width * info.height;
  if (!info.visible || area < MIN_AREA) return 0;
  let score = area;
  const duration = Number.isFinite(info.duration) ? info.duration : 0;
  if (duration > 600) score *= 3;
  else if (duration > 120) score *= 1.5;
  // 60 sn'den kısa: büyük ihtimalle reklam ya da önizleme (film henüz yokken bile tek aday olmasın diye çok düşük).
  else if (duration > 0 && duration < 60) score *= 0.1;
  if (info.loopMuted) score *= 0.2;
  if (info.stickySmall) score *= 0.3;
  if (info.playing) score *= 1.2;
  return Math.round(score);
}

/**
 * Belgedeki <video>'ları bulur. Normal yerde hiç yoksa açık shadow DOM'ların
 * içine de bakar (bazı oynatıcılar videoyu orada saklar). Derin tarama pahalı
 * olduğu için sadece gerektiğinde yapılır.
 */
export function findVideos(root: Document | ShadowRoot | Element, deep = true): HTMLVideoElement[] {
  const direct = [...root.querySelectorAll('video')];
  if (direct.length > 0 || !deep) return direct;
  const found: HTMLVideoElement[] = [];
  const visit = (node: Document | ShadowRoot | Element) => {
    for (const el of node.querySelectorAll('*')) {
      if (!el.shadowRoot) continue;
      found.push(...el.shadowRoot.querySelectorAll('video'));
      visit(el.shadowRoot);
    }
  };
  visit(root);
  return found;
}

export function describeVideo(video: HTMLVideoElement): VideoInfo {
  const rect = video.getBoundingClientRect();
  const style = getComputedStyle(video);
  const screen = Math.max(1, innerWidth * innerHeight);
  return {
    width: rect.width,
    height: rect.height,
    duration: video.duration,
    playing: !video.paused && !video.ended,
    visible: video.isConnected && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.05,
    loopMuted: video.loop && video.muted,
    stickySmall: (rect.width * rect.height) / screen < 0.2 && isPinned(video),
  };
}

/** Video ya da birkaç üst atası ekrana sabitlenmiş mi (fixed/sticky)? Köşedeki reklamlar böyle durur. */
function isPinned(video: HTMLElement): boolean {
  let el: HTMLElement | null = video;
  for (let i = 0; el && i < 6; i++, el = el.parentElement) {
    const position = getComputedStyle(el).position;
    if (position === 'fixed' || position === 'sticky') return true;
  }
  return false;
}
