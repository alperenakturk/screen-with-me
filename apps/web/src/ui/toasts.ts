import { el } from '../dom.ts';

const MAX_TOASTS = 4;
const TOAST_MS = 5000;

/**
 * Chat messages over the video (fullscreen, or the window with the side panel hidden), shown for a few seconds.
 * In fullscreen they flow up from the quick message box (0.9.90.1, owner's choice): left-aligned to it, the newest
 * closest to the box, like a live-stream chat, so the eye looks at one place. Elsewhere they sit at the top right.
 * (The old draggable "💬 Mesajlar burada" handle is gone.) With the dock (option A, 0.9.91.1) they flow up next to it,
 * right-aligned to its left edge.
 */
export function createToasts(container: HTMLElement, anchor: HTMLElement, dock?: HTMLElement) {
  const theater = container.closest<HTMLElement>('.theater');
  const inFullscreen = () => !!theater?.matches(':fullscreen, .fake-fs');

  function layout(): void {
    const s = container.style;
    const parent = container.offsetParent as HTMLElement | null;
    const box = anchor.getBoundingClientRect();
    const docked = dock?.getBoundingClientRect();
    if (inFullscreen() && parent && docked && docked.width > 0 && theater?.classList.contains('dock-mode')) {
      const p = parent.getBoundingClientRect();
      s.top = s.left = 'auto';
      s.right = `${Math.round(p.right - docked.left + 14)}px`;
      s.bottom = `${Math.round(p.bottom - docked.bottom)}px`;
      container.classList.remove('left');
      container.classList.add('up');
      return;
    }
    if (inFullscreen() && parent && box.width > 0) {
      const p = parent.getBoundingClientRect();
      // Above the whole bar (the seek line sits over the message box), lined up with the box's left edge.
      const top = Math.min(box.top, anchor.closest('.fs-controls')?.querySelector('.fs-progress')?.getBoundingClientRect().top ?? box.top);
      s.top = s.right = 'auto';
      s.left = `${Math.round(box.left - p.left)}px`;
      s.bottom = `${Math.round(p.bottom - top + 10)}px`;
      container.classList.add('left', 'up');
      return;
    }
    s.left = s.bottom = '';
    s.right = '20px';
    s.top = '58px';
    container.classList.remove('left', 'up');
  }

  document.addEventListener('fullscreenchange', () => requestAnimationFrame(layout));
  if (theater) new MutationObserver(() => requestAnimationFrame(layout)).observe(theater, { attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', layout);
  layout();

  return {
    show(name: string, text: string, mine: boolean): void {
      layout();
      while (container.childElementCount >= MAX_TOASTS) container.firstElementChild?.remove();
      const toast = el('div', { class: mine ? 'toast me' : 'toast' }, el('span', { class: 'toast-name' }, name), ' ', text);
      container.append(toast);
      setTimeout(() => {
        // While the message box is open the messages stay readable.
        const hold = () => !!document.activeElement && (document.activeElement === anchor.querySelector('input') || document.activeElement === dock?.querySelector('input'));
        const leave = () => {
          if (hold()) {
            setTimeout(leave, 1000);
            return;
          }
          toast.classList.add('leaving');
          toast.addEventListener('animationend', () => toast.remove());
        };
        leave();
      }, TOAST_MS);
    },
    layout,
  };
}
