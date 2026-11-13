import { el } from '../dom.ts';

const MAX_TOASTS = 4;
const TOAST_MS = 5000;
/**
 * Card R21: on a computer the messages come in on the right side. Card R25 (owner: "they sit right where I type"): they
 * start below the rail's message box (open or not, so they never jump), at least this share of the video's height down.
 */
const SIDE_TOP = 0.45;
/** Gap between the message box (or its 💬 button) and the first message. */
const BOX_GAP = 16;
/** The player's own bar (seek line + buttons) at the video's foot, plus a gap: messages never reach into it. */
const BAR_SPACE = 96;

/**
 * Chat messages over the video (fullscreen, or the window with the side panel hidden), shown for a few seconds.
 * In fullscreen they flow up from the quick message box (0.9.90.1, owner's choice): left-aligned to it, the newest
 * closest to the box, like a live-stream chat, so the eye looks at one place. Elsewhere they sit at the top right.
 * (The old draggable "💬 Mesajlar burada" handle is gone.) With the dock they come down from the top right, just left
 * of it, in the window and in fullscreen alike (0.9.93.4; from 0.9.91.1 they flowed up from its foot in fullscreen).
 */
export function createToasts(container: HTMLElement, anchor: HTMLElement, dock?: HTMLElement) {
  const theater = container.closest<HTMLElement>('.theater');
  const room = container.closest<HTMLElement>('.room');
  const inFullscreen = () => !!theater?.matches(':fullscreen, .fake-fs');
  /** Where the newest message may end at most (viewport y); null = no limit. */
  let floor: number | null = null;

  /**
   * GS QA1 finding 3: an open game window (a free window over the video on a computer) is never covered. The messages
   * move to its left when there is room for them there, else just below it (above it when below is off the screen).
   * A game filling the video's place keeps them where they are (there is nowhere else to put them).
   */
  function dodgeGame(): void {
    const stage = document.getElementById('game-stage');
    const parent = container.offsetParent as HTMLElement | null;
    if (!stage || !parent || document.documentElement.classList.contains('phone') || stage.closest('[hidden]')) return;
    const g = stage.getBoundingClientRect();
    const p = parent.getBoundingClientRect();
    if (g.width === 0 || g.width > p.width * 0.85) return;
    const c = container.getBoundingClientRect();
    const width = Math.max(c.width, container.firstElementChild ? 0 : 260);
    const left = c.width > 0 ? c.left : c.right - width;
    const overlaps = left < g.right && c.right > g.left && c.top < g.bottom && Math.max(c.bottom, c.top + 60) > g.top;
    if (!overlaps) return;
    // `important`: cinema's message strip places itself with !important rules (room.css); place() resets them.
    const set = (prop: string, value: string) => container.style.setProperty(prop, value, 'important');
    const height = Math.max(c.height, 32);
    if (g.left - p.left >= width + 24) {
      set('left', 'auto');
      set('right', `${Math.round(p.right - g.left + 12)}px`);
    } else if (g.bottom + height + 10 <= innerHeight) {
      set('bottom', 'auto');
      set('top', `${Math.round(g.bottom - p.top + 10)}px`);
    } else if (g.top - height - 10 >= 0) {
      set('bottom', 'auto');
      set('top', `${Math.round(g.top - p.top - height - 10)}px`);
    }
  }

  function layout(): void {
    place();
    dodgeGame();
  }

  function place(): void {
    const s = container.style;
    for (const prop of ['left', 'right', 'top', 'bottom']) if (s.getPropertyPriority(prop)) s.removeProperty(prop);
    const parent = container.offsetParent as HTMLElement | null;
    const box = anchor.getBoundingClientRect();
    const docked = dock?.getBoundingClientRect();
    // With the dock (window or fullscreen) they come down from the top right, just left of it, as in the window
    // (0.9.93.4, owner: "from the side like normal, not from the bottom"): at the bottom they covered the player's
    // own bar (YouTube's settings and fullscreen buttons).
    if (parent && docked && docked.width > 0 && theater?.classList.contains('dock-mode')) {
      const p = parent.getBoundingClientRect();
      s.bottom = s.left = 'auto';
      // Card R15: where the rail sits when it shows. A resting YouTube rail is slid to the right (its transform), and
      // messages laid out against that left edge ended up under the rail once it came out.
      const slid = new DOMMatrixReadOnly(getComputedStyle(dock!).transform === 'none' ? undefined : getComputedStyle(dock!).transform).m41;
      s.right = `${Math.max(20, Math.round(p.right - (docked.left - slid) + 14))}px`;
      container.classList.remove('left', 'up');
      // Card R21 (owner: "bigger, and from a clearly visible place on the right side, not the very top right"): on a
      // computer in fullscreen, or in the window with the side panel hidden, they come in a quarter down the video,
      // with bigger text (.toasts.right-side), and stop above the player's own bar. Phones and the cinema strip keep theirs.
      const phone = document.documentElement.classList.contains('phone');
      const cinema = !inFullscreen() && !!room?.classList.contains('cinema');
      if (!phone && !cinema && (inFullscreen() || room?.classList.contains('side-hidden'))) {
        // The message box opens lined up with 💬 (fullscreen.ts openPop); messages start below whichever ends lower.
        const below = [dock!.querySelector('#dock-chat'), dock!.querySelector('#dock-chat-form')]
          .map((e) => e?.getBoundingClientRect())
          .filter((r): r is DOMRect => !!r && r.height > 0)
          .reduce((low, r) => Math.max(low, r.bottom - p.top + BOX_GAP), 0);
        s.top = `${Math.round(Math.max(p.height * SIDE_TOP, below))}px`;
        floor = p.bottom - BAR_SPACE;
        container.classList.add('right-side');
        return;
      }
      floor = null;
      container.classList.remove('right-side');
      // On the film page in fullscreen the film site's own top bar (title, back, cast) sits at the top (sweep-2 #12).
      s.top = inFullscreen() ? (document.documentElement.classList.contains('shell') ? '64px' : '20px') : '58px';
      return;
    }
    floor = null;
    container.classList.remove('right-side');
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
  // R25: the message box opening or closing moves the messages below it.
  const box = dock?.querySelector('#dock-chat-form');
  if (box) new MutationObserver(() => requestAnimationFrame(layout)).observe(box, { attributes: true, attributeFilter: ['hidden', 'style'] });
  addEventListener('resize', layout);
  layout();

  return {
    show(name: string, text: string, mine: boolean): void {
      layout();
      while (container.childElementCount >= MAX_TOASTS) container.firstElementChild?.remove();
      const toast = el('div', { class: mine ? 'toast me' : 'toast' }, el('span', { class: 'toast-name' }, name), ' ', text);
      container.append(toast);
      // Older messages make room: the newest never reaches the player's bar.
      while (floor !== null && container.childElementCount > 1 && toast.getBoundingClientRect().bottom > floor) container.firstElementChild?.remove();
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
