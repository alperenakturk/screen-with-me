import type { PlayerAdapter } from '@swm/shared/player';
import { wrapVideoElement } from '@swm/shared/video-element';

/** Doğrudan video linkleri (.mp4, .webm) için tarayıcının kendi oynatıcısı. */
export function createHtml5Player(container: HTMLElement, url: string, onError: () => void): PlayerAdapter {
  const video = document.createElement('video');
  video.src = url;
  video.controls = true;
  video.playsInline = true;
  video.preload = 'auto';
  // Tarayıcının kendi tam ekranı yerine bizimki kullanılsın (emojiler ve kontroller orada görünür).
  video.setAttribute('controlslist', 'nofullscreen');
  video.addEventListener('error', onError);
  container.append(video);

  const adapter = wrapVideoElement(video);
  return {
    ...adapter,
    destroy: () => {
      adapter.release();
      video.removeAttribute('src');
      video.load();
      container.replaceChildren();
    },
  };
}
