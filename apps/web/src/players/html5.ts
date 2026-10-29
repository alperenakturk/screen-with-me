import type { PlayerAdapter } from '@swm/shared/player';
import { wrapVideoElement } from '@swm/shared/video-element';

/** Doğrudan video linkleri (.mp4, .webm) için tarayıcının kendi oynatıcısı. */
export function createHtml5Player(container: HTMLElement, url: string, onError: () => void): PlayerAdapter {
  const video = document.createElement('video');
  video.src = url;
  // Our bar is the only remote (0.9.90.1): no browser controls on top of it.
  video.controls = false;
  video.playsInline = true;
  video.preload = 'auto';
  // Tarayıcının kendi tam ekranı yerine bizimki kullanılsın (emojiler ve kontroller orada görünür).
  video.setAttribute('controlslist', 'nofullscreen');
  video.addEventListener('error', onError);
  container.append(video);

  const adapter = wrapVideoElement(video);
  return {
    ...adapter,
    getVolume: () => video.volume,
    setVolume: (volume) => (video.volume = Math.min(1, Math.max(0, volume))),
    isMuted: () => video.muted,
    setMuted: (muted) => (video.muted = muted),
    destroy: () => {
      adapter.release();
      video.removeAttribute('src');
      video.load();
      container.replaceChildren();
    },
  };
}
