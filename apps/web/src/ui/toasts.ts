import { el } from '../dom.ts';

const MAX_TOASTS = 4;
const TOAST_MS = 6000;

/** Tam ekranda gelen sohbet mesajlarını videonun köşesinde kısa süre gösterir. */
export function createToasts(container: HTMLElement) {
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
  };
}
