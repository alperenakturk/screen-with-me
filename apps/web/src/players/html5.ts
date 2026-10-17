import type { PlayerAdapter, PlayerEvent } from '@swm/shared/player';

/**
 * Doğrudan video linkleri (.mp4, .webm) için tarayıcının kendi oynatıcısı.
 * İleride eklenti, başka sitelerdeki <video> öğeleri için aynı yaklaşımı kullanacak.
 */
export function createHtml5Player(container: HTMLElement, url: string, onError: () => void): PlayerAdapter {
  const video = document.createElement('video');
  video.src = url;
  video.controls = true;
  video.playsInline = true;
  video.preload = 'auto';
  // Tarayıcının kendi tam ekranı yerine bizimki kullanılsın (emojiler ve kontroller orada görünür).
  video.setAttribute('controlslist', 'nofullscreen');
  container.append(video);

  const listeners = new Set<(event: PlayerEvent) => void>();
  const emit = (event: PlayerEvent) => () => listeners.forEach((listener) => listener(event));
  video.addEventListener('play', emit('play'));
  video.addEventListener('pause', emit('pause'));
  video.addEventListener('ratechange', emit('ratechange'));
  video.addEventListener('error', onError);

  return {
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
    destroy: () => {
      listeners.clear();
      video.removeAttribute('src');
      video.load();
      container.replaceChildren();
    },
  };
}
