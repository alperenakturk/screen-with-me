// Elle video seçimi: otomatik seçim yanılınca (fragman, önizleme, büyük bir reklam videosu) kullanıcı film
// sayfasında doğru videoyu kendisi gösterir. Seçim modunda bu çerçevedeki her videonun üstüne bir çerçeve ve
// "🎯 Bunu senkronla" düğmesi çizilir. Sitenin CSS'inden etkilenmesin diye kapalı shadow DOM.

import { findVideos } from '@swm/shared/video-element';
import { langReady, t } from './i18n.ts';

/** Bundan küçük videolara düğme konmaz (logo animasyonu, küçük önizleme; düğme de sığmaz). */
const MIN_W = 120;
const MIN_H = 68;

let host: HTMLElement | null = null;
let shadow: ShadowRoot | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const boxes = new Map<HTMLVideoElement, HTMLElement>();
let onPick: ((video: HTMLVideoElement) => void) | null = null;
let current: HTMLVideoElement | null = null;

export function startPicking(pick: (video: HTMLVideoElement) => void, selected: HTMLVideoElement | null): void {
  onPick = pick;
  current = selected;
  void langReady.then(() => {
    if (!onPick) return;
    if (!host) {
      host = document.createElement('swm-picker');
      shadow = host.attachShadow({ mode: 'closed' });
      const style = document.createElement('style');
      style.textContent = `
        :host { all: initial; }
        .box { position: fixed; z-index: 2147483646; box-sizing: border-box; border: 3px solid #8b6cff; border-radius: 10px;
          background: rgb(20 16 60 / .35); pointer-events: none; }
        .box.current { border-color: #3ddc97; }
        button { position: absolute; transform: translate(-50%, -50%); white-space: nowrap; pointer-events: auto; font: 700 16px/1.3 system-ui, sans-serif; color: #fff; background: #7c5cff; border: 0;
          border-radius: 999px; padding: 11px 20px; cursor: pointer; box-shadow: 0 6px 24px rgb(0 0 0 / .45); }
        .current button { background: #1f9e6a; }
        button:hover { filter: brightness(1.12); }
        small { display: block; font-weight: 500; font-size: 12px; opacity: .85; }
      `;
      shadow.append(style);
      document.documentElement.append(host);
    }
    render();
    // Sayfa kayınca/oynatıcı büyüyünce çerçeveler videoyu izlesin. Düğmeler baştan yaratılmaz (basarken kaybolmasın).
    timer ??= setInterval(render, 400);
  });
}

export function stopPicking(): void {
  onPick = null;
  if (timer !== null) clearInterval(timer);
  timer = null;
  boxes.clear();
  host?.remove();
  host = null;
  shadow = null;
}

function render(): void {
  if (!shadow || !onPick) return;
  if (host && !host.isConnected) document.documentElement.append(host);
  const seen = new Set<HTMLVideoElement>();
  for (const video of findVideos(document, true)) {
    const r = video.getBoundingClientRect();
    const onScreen = r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
    if (r.width < MIN_W || r.height < MIN_H || !onScreen) continue;
    seen.add(video);
    let box = boxes.get(video);
    if (!box) {
      box = makeBox(video);
      boxes.set(video, box);
      shadow.append(box);
    }
    Object.assign(box.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    // Düğme videonun ekranda görünen kısmının ortasında (video ekrandan taşsa da basılabilsin).
    const top = Math.max(r.top, 0);
    const bottom = Math.min(r.bottom, innerHeight);
    const left = Math.max(r.left, 0);
    const right = Math.min(r.right, innerWidth);
    const button = box.firstElementChild as HTMLElement;
    button.style.left = `${(left + right) / 2 - r.left}px`;
    button.style.top = `${Math.max(28, (top + bottom) / 2 - r.top)}px`;
  }
  for (const [video, box] of boxes) {
    if (seen.has(video)) continue;
    box.remove();
    boxes.delete(video);
  }
}

function makeBox(video: HTMLVideoElement): HTMLElement {
  const box = document.createElement('div');
  box.className = video === current ? 'box current' : 'box';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = video === current ? t('pickCurrent') : t('pickThis');
  const minutes = Number.isFinite(video.duration) && video.duration > 0 ? Math.round(video.duration / 60) : 0;
  if (minutes > 0) {
    const info = document.createElement('small');
    info.textContent = t('pickLength').replace('{n}', String(minutes));
    button.append(info);
  }
  // Film sitesi tıklamayı görüp reklam penceresi açmasın.
  for (const type of ['pointerdown', 'mousedown', 'mouseup', 'pointerup'] as const) {
    button.addEventListener(type, (event) => event.stopPropagation());
  }
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onPick?.(video);
  });
  box.append(button);
  return box;
}
