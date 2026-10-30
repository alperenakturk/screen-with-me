import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { load, save } from '../storage.ts';

/** A saved place and width, as a share of the container (the video box, or the window when free). */
interface Spot {
  x: number;
  y: number;
  w: number;
}

type Where = 'video' | 'free' | 'fs';

const DEFAULTS: Record<Where, Spot> = {
  video: { x: 0.6, y: 0.5, w: 0.36 },
  free: { x: 0.62, y: 0.12, w: 0.3 },
  fs: { x: 0.56, y: 0.5, w: 0.3 },
};
const KEYS: Record<Where, string> = { video: 'liveSpot:video', free: 'liveSpot:free', fs: 'liveSpot:fs' };
const MIN_WIDTH = 200;
/** It may grow to this share of its container (⤢ covers the whole video). */
const MAX_SHARE = 0.9;
const EDGE = 8;
/** Below this width the window stays in the video (no room to float it on a phone). */
const NARROW = 700;

const share = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;

function readSpot(where: Where): Spot {
  try {
    const spot = JSON.parse(load(KEYS[where]) ?? 'null') as Spot | null;
    if (spot && share(spot.x) && share(spot.y) && share(spot.w) && spot.w > 0) return spot;
  } catch {
    // broken record: default
  }
  return DEFAULTS[where];
}

/**
 * The stream window (0.9.91.15, owner: "free like the cameras"): it sits in the video (default) or floats freely on
 * the page (⧉; ⤓ puts it back); drag it anywhere, resize it from its corner (it keeps 16:9), double click resets the
 * place. In fullscreen it always lives inside the video, with its own place. Places are remembered as shares of the
 * container, separately for the video, the page and fullscreen. On the film page (shell) a free window is an island.
 */
export function createLiveFloat(opts: { win: HTMLElement; wrap: HTMLElement; theater: HTMLElement; onMove: () => void }) {
  const { win, wrap, theater } = opts;
  const home = document.createComment('live-window');
  win.before(home);
  const bar = win.querySelector<HTMLElement>('.live-bar')!;
  const popButton = el('button', { type: 'button', class: 'icon-btn live-pop' });
  bar.querySelector('#live-big')!.before(popButton);
  const grip = el('span', { class: 'live-resize', 'aria-hidden': 'true' });
  win.append(grip);

  let place: 'video' | 'free' = load('opt:livePlace') === 'free' ? 'free' : 'video';
  const spots: Record<Where, Spot> = { video: readSpot('video'), free: readSpot('free'), fs: readSpot('fs') };

  const isFs = () => theater.matches(':fullscreen, .fake-fs');
  const narrow = () => innerWidth <= NARROW;
  const where = (): Where => (isFs() ? 'fs' : place === 'free' && !narrow() && !win.classList.contains('big') ? 'free' : 'video');
  const container = (w: Where) => (w === 'free' ? { w: innerWidth, h: innerHeight } : { w: wrap.clientWidth, h: wrap.clientHeight });

  function labels(): void {
    const free = where() === 'free';
    popButton.textContent = free ? '⤓' : '⧉';
    popButton.title = t(free ? 'live.dock' : 'live.pop');
    popButton.setAttribute('aria-label', popButton.title);
    popButton.hidden = isFs() || narrow();
  }

  /** Puts the window where it belongs and sizes it from its saved spot. */
  function apply(): void {
    const w = where();
    const parent = w === 'free' ? document.body : wrap;
    if (win.parentNode !== parent) {
      if (w === 'free') document.body.append(win);
      else home.after(win);
      void win.querySelector('video')?.play().catch(() => {});
    }
    win.classList.toggle('free', w === 'free');
    // On the film page a window on the page must show over the hole (inside the video it is an island anyway).
    win.toggleAttribute('data-island', w === 'free');
    labels();
    if (win.classList.contains('big')) {
      win.style.left = win.style.top = win.style.width = '';
      opts.onMove();
      return;
    }
    const c = container(w);
    const spot = spots[w];
    const width = Math.round(Math.min(Math.max(MIN_WIDTH, spot.w * c.w), c.w * MAX_SHARE));
    const height = (width * 9) / 16;
    win.style.width = `${width}px`;
    win.style.left = `${Math.round(Math.min(Math.max(EDGE, spot.x * c.w), Math.max(EDGE, c.w - width - EDGE)))}px`;
    win.style.top = `${Math.round(Math.min(Math.max(EDGE, spot.y * c.h), Math.max(EDGE, c.h - height - EDGE)))}px`;
    opts.onMove();
  }

  function remember(): void {
    const w = where();
    const c = container(w);
    if (!c.w || !c.h) return;
    spots[w] = { x: win.offsetLeft / c.w, y: win.offsetTop / c.h, w: win.offsetWidth / c.w };
    save(KEYS[w], JSON.stringify(spots[w]));
  }

  popButton.addEventListener('click', () => {
    place = where() === 'free' ? 'video' : 'free';
    save('opt:livePlace', place);
    apply();
  });

  let drag: { id: number; resize: boolean; x: number; y: number; left: number; top: number; width: number } | null = null;
  let frame = 0;
  win.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || win.classList.contains('big')) return;
    if ((event.target as Element).closest('button')) return;
    drag = {
      id: event.pointerId,
      resize: event.target === grip,
      x: event.clientX,
      y: event.clientY,
      left: win.offsetLeft,
      top: win.offsetTop,
      width: win.offsetWidth,
    };
    win.setPointerCapture(event.pointerId);
    win.classList.add('dragging');
    event.preventDefault();
  });
  win.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const c = container(where());
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (drag.resize) {
      // The corner grows the width; the height follows (16:9).
      const max = Math.min(c.w * MAX_SHARE, c.w - drag.left - EDGE, ((c.h - drag.top - EDGE) * 16) / 9);
      win.style.width = `${Math.round(Math.min(Math.max(MIN_WIDTH, drag.width + Math.max(dx, (dy * 16) / 9)), max))}px`;
    } else {
      win.style.left = `${Math.round(Math.min(Math.max(EDGE, drag.left + dx), Math.max(EDGE, c.w - win.offsetWidth - EDGE)))}px`;
      win.style.top = `${Math.round(Math.min(Math.max(EDGE, drag.top + dy), Math.max(EDGE, c.h - win.offsetHeight - EDGE)))}px`;
    }
    // In the shell the hole and islands are reported once per frame.
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        opts.onMove();
      });
    }
  });
  const stop = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const still = Math.abs(event.clientX - drag.x) + Math.abs(event.clientY - drag.y) < 4;
    drag = null;
    win.classList.remove('dragging');
    if (!still) remember();
    opts.onMove();
  };
  win.addEventListener('pointerup', stop);
  win.addEventListener('pointercancel', stop);
  // Double click: back to the default place and size (this view only).
  win.addEventListener('dblclick', (event) => {
    if ((event.target as Element).closest('button') || win.classList.contains('big')) return;
    const w = where();
    spots[w] = DEFAULTS[w];
    save(KEYS[w], '');
    apply();
  });

  addEventListener('resize', () => {
    if (!win.hidden) apply();
  });
  document.addEventListener('fullscreenchange', () => {
    wasFs = isFs();
    apply();
  });
  // The phones' own fullscreen and the film page's are a class on the theater, not real fullscreen.
  let wasFs = isFs();
  new MutationObserver(() => {
    if (isFs() === wasFs) return;
    wasFs = isFs();
    apply();
  }).observe(theater, { attributes: true, attributeFilter: ['class'] });

  return {
    apply,
    /** ⤢: cover the whole video (a free window comes back into the video for it). */
    toggleBig(): void {
      win.classList.toggle('big');
      apply();
    },
  };
}
