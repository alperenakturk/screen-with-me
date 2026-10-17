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
  else if (duration > 0 && duration < 60) score *= 0.5; // büyük ihtimalle reklam
  if (info.playing) score *= 1.2;
  return Math.round(score);
}

/**
 * Belgedeki <video>'ları bulur. Normal yerde hiç yoksa açık shadow DOM'ların
 * içine de bakar (bazı oynatıcılar videoyu orada saklar). Derin tarama pahalı
 * olduğu için sadece gerektiğinde yapılır.
 */
export function findVideos(root: Document | ShadowRoot | Element): HTMLVideoElement[] {
  const direct = [...root.querySelectorAll('video')];
  if (direct.length > 0) return direct;
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
  return {
    width: rect.width,
    height: rect.height,
    duration: video.duration,
    playing: !video.paused && !video.ended,
    visible: video.isConnected && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.05,
  };
}
