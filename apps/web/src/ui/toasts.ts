import { el } from '../dom.ts';
import { load, save } from '../storage.ts';

const MAX_TOASTS = 4;
const TOAST_MS = 5000;

/**
 * Tam ekranda gelen sohbet mesajlarını videonun üstünde kısa süre gösterir. Fare oynayınca
 * "💬 Mesajlar burada" tutamağı görünür; sürükleyerek mesajların yeri değiştirilebilir
 * (çift tık: sağ üste geri). Seçilen yer hatırlanır; mesajlar tutamağın altında (alt
 * taraftaysa üstünde; kutu alttan sabit olduğu için yukarı doğru büyür) akar.
 */
export function createToasts(container: HTMLElement, handle: HTMLElement) {
  let pos: { x: number; y: number } | null = null;
  try {
    const saved = JSON.parse(load('toastPos') ?? 'null') as { x?: unknown; y?: unknown } | null;
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') pos = { x: saved.x, y: saved.y };
  } catch {
    // Bozuk kayıt: varsayılan yer.
  }

  function layout(): void {
    const parent = handle.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    const hs = handle.style;
    const s = container.style;
    if (!pos) {
      hs.left = hs.top = '';
      s.left = s.bottom = '';
      s.right = '20px';
      s.top = '58px';
      container.classList.remove('left', 'up');
      return;
    }
    const hw = handle.offsetWidth || 200;
    const hh = handle.offsetHeight || 30;
    const x = Math.min(Math.max(pos.x * w, 8), Math.max(8, w - hw - 8));
    const y = Math.min(Math.max(pos.y * h, 8), Math.max(8, h - hh - 8));
    hs.right = 'auto';
    hs.left = `${x}px`;
    hs.top = `${y}px`;
    const rightSide = x + hw / 2 > w / 2;
    const up = y + hh / 2 > h * 0.6;
    s.left = rightSide ? 'auto' : `${x}px`;
    s.right = rightSide ? `${w - x - hw}px` : 'auto';
    s.top = up ? 'auto' : `${y + hh + 8}px`;
    s.bottom = up ? `${h - y + 8}px` : 'auto';
    container.classList.toggle('left', !rightSide);
    container.classList.toggle('up', up);
  }

  handle.addEventListener('pointerdown', (event) => {
    const parent = handle.parentElement;
    if (!parent || event.button !== 0) return;
    const pr = parent.getBoundingClientRect();
    const hr = handle.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    handle.setPointerCapture(event.pointerId);
    const move = (ev: PointerEvent) => {
      pos = { x: (hr.left - pr.left + ev.clientX - startX) / pr.width, y: (hr.top - pr.top + ev.clientY - startY) / pr.height };
      layout();
    };
    const up = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', up);
      handle.removeEventListener('pointercancel', up);
      if (pos) save('toastPos', JSON.stringify(pos));
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
  });
  handle.addEventListener('dblclick', () => {
    pos = null;
    save('toastPos', 'null');
    layout();
  });
  document.addEventListener('fullscreenchange', () => requestAnimationFrame(layout));
  addEventListener('resize', layout);
  layout();

  return {
    show(name: string, text: string, mine: boolean): void {
      while (container.childElementCount >= MAX_TOASTS) container.firstElementChild?.remove();
      const toast = el('div', { class: mine ? 'toast me' : 'toast' }, el('span', { class: 'toast-name' }, name), ' ', text);
      container.append(toast);
      setTimeout(() => {
        toast.classList.add('leaving');
        toast.addEventListener('animationend', () => toast.remove());
      }, TOAST_MS);
    },
    layout,
  };
}
