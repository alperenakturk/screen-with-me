// Tarayıcı sesli otomatik oynatmayı engellediyse film çerçevesinde "İzlemeye başla" kartı:
// oynatma izni sadece o çerçevedeki bir tıklamayla alınabilir (sitedeki düğme işe yaramaz).
// Sitenin CSS'inden etkilenmesin diye kapalı shadow DOM.
// It sits just under the room's overlay (one z-index lower): it shows through the hole over the video, and a window
// of the site (⚙️, "Odaya dön"…) covers it. On the same z-index it was above the overlay and hid those windows.

import { langReady, t } from './i18n.ts';

let host: HTMLElement | null = null;
let follow: ReturnType<typeof setInterval> | undefined;

export function askToStart(video: HTMLVideoElement | null, onStart: () => void): void {
  // Dil eklentinin deposundan geliyor: yüklenmeden metin yazılırsa İngilizce kullanıcı Türkçe görürdü.
  void langReady.then(() => render(video, onStart));
}

function render(video: HTMLVideoElement | null, onStart: () => void): void {
  host?.remove();
  host = document.createElement('swm-start');
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    .box { position: fixed; z-index: 2147483646; display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 12px; background: rgb(0 0 0 / .72); font: 600 17px/1.4 system-ui, sans-serif; color: #fff; text-align: center; padding: 16px; }
    button { font: inherit; color: #fff; background: #7c5cff; border: 0; border-radius: 10px; padding: 12px 22px; cursor: pointer; }
  `;
  const box = document.createElement('div');
  box.className = 'box';
  // Over the video, following it: the room view moves the video into the hole after the card may already be up.
  const place = () => {
    const r = video?.isConnected ? video.getBoundingClientRect() : null;
    Object.assign(box.style, r && r.width > 100 ? { inset: 'auto', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` } : { inset: '0', width: 'auto', height: 'auto' });
  };
  place();
  clearInterval(follow);
  follow = setInterval(place, 250);
  const text = document.createElement('div');
  text.textContent = t('autoplayBlocked');
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = t('startPlayback');
  button.addEventListener('click', () => {
    clearStart();
    onStart();
  });
  box.append(text, button);
  shadow.append(style, box);
  document.documentElement.append(host);
}

export function clearStart(): void {
  clearInterval(follow);
  host?.remove();
  host = null;
}
