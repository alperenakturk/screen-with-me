import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { load, save } from '../storage.ts';
import { isPhone } from '../device.ts';
import './live-float.css';

/** A saved place and width, as a share of the container (the video box, or the window when free). */
interface Spot {
  x: number;
  y: number;
  w: number;
}

type Where = 'video' | 'free' | 'fs';

const DEFAULTS: Record<Where, Spot> = {
  // Top right: the player's own bar (play, time, seek) is at the bottom (LAYOUT1: on a phone it covered it).
  video: { x: 0.6, y: 0.04, w: 0.36 },
  free: { x: 0.62, y: 0.12, w: 0.3 },
  fs: { x: 0.56, y: 0.5, w: 0.3 },
};
const KEYS: Record<Where, string> = { video: 'liveSpot:video', free: 'liveSpot:free', fs: 'liveSpot:fs' };
const MIN_WIDTH = 200;
/** On a phone the video is ≈ 390 px wide: 200 px would be half of it. */
const PHONE_MIN_WIDTH = 150;
/** It may grow to this share of its container. */
const MAX_SHARE = 0.9;
const EDGE = 8;
/** The gap a window keeps from the YouTube player when it settles beside it. */
const BESIDE_GAP = 8;
/** Below this width the window stays in the video (no room to float it on a phone). */
const NARROW = 700;

const share = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;

/** The saved spot, or null (a free window with none starts over the video: see `firstFree`). */
function savedSpot(where: Where): Spot | null {
  try {
    const spot = JSON.parse(load(KEYS[where]) ?? 'null') as Spot | null;
    if (spot && share(spot.x) && share(spot.y) && share(spot.w) && spot.w > 0) return spot;
  } catch {
    // broken record: default
  }
  return null;
}

/**
 * The stream window. ST1 (owner, 15 Nov 2026: "one button: fullscreen or a window I can put anywhere; simple"): a
 * viewer has one control, "⛶ Fullscreen" ⇄ "🪟 Window". As a window on a computer it floats freely on the page: drag it
 * anywhere, resize it from its corner (it keeps 16:9), double click resets the place; place and width are remembered as
 * shares of the screen, so they survive a reload. Fullscreen is the browser's own, for the stream alone (a cover-the-
 * screen fallback where the browser has none). In the room's fullscreen the window lives inside the video with its own
 * place; on a phone (≤ 700 px) it stays inside the video as before (the phone room's own sideways behaviour). With a
 * YouTube player on a computer the free window never covers it: it settles beside the player. On the film page
 * (shell) a free window is an island.
 */
export function createLiveFloat(opts: { win: HTMLElement; wrap: HTMLElement; theater: HTMLElement; onMove: () => void }) {
  const { win, wrap, theater } = opts;
  const home = document.createComment('live-window');
  win.before(home);
  const modeButton = win.querySelector<HTMLButtonElement>('#live-mode')!;
  const grip = el('span', { class: 'live-resize', 'aria-hidden': 'true' });
  win.append(grip);
  /**
   * ST1 (Planner, 15 Nov 2026; YouTube's Required Minimum Functionality: nothing of ours over its player): in the
   * room's fullscreen on a YouTube video the stream window hides, and "📺 Stream" in the fullscreen rail beside the
   * video leaves fullscreen and shows it again. Other players keep the window inside their fullscreen.
   */
  const dockStream = el('button', { type: 'button', id: 'dock-stream', class: 'dock-btn', hidden: '' }, '📺');
  theater.querySelector('#fs-dock .dock-group')?.append(dockStream);
  dockStream.addEventListener('click', () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    theater.classList.remove('fake-fs');
    requestAnimationFrame(apply);
  });

  const spots: Record<Where, Spot | null> = { video: savedSpot('video'), free: savedSpot('free'), fs: savedSpot('fs') };

  const isFs = () => theater.matches(':fullscreen, .fake-fs');
  const narrow = () => innerWidth <= NARROW;
  /** The room's fullscreen on a YouTube player (computer): the window may not show there (see `dockStream`). */
  const awayForYoutube = () => isFs() && overYoutube() && !isFull();
  function syncRail(): void {
    const away = awayForYoutube();
    win.classList.toggle('yt-away', away);
    dockStream.hidden = !away || win.hidden;
    dockStream.title = t('live.backToStream');
    dockStream.setAttribute('aria-label', dockStream.title);
  }
  /** The stream's own fullscreen: the browser's (the window is the fullscreen element) or the fallback class. */
  const isFull = () => document.fullscreenElement === win || win.classList.contains('filled');
  const where = (): Where => (isFs() ? 'fs' : narrow() ? 'video' : 'free');
  const container = (w: Where) => (w === 'free' ? { w: innerWidth, h: innerHeight } : { w: wrap.clientWidth, h: wrap.clientHeight });
  /** A YouTube player shows beside the rail on a computer (the same test as the game window's, games/stage.ts). */
  const overYoutube = () => theater.classList.contains('yt-rail') && !isPhone();

  function labels(): void {
    const full = isFull();
    // A small window (a phone's, or one shrunk from its corner) shows the icon only; the word stays in its title.
    const word = full || win.offsetWidth >= 280;
    modeButton.textContent = full ? `🪟${word ? ` ${t('live.window')}` : ''}` : `⛶${word ? ` ${t('live.fullscreen')}` : ''}`;
    modeButton.title = t(full ? 'live.windowHint' : 'live.fullscreenHint');
    modeButton.setAttribute('aria-label', modeButton.title);
    modeButton.setAttribute('aria-pressed', String(full));
  }

  /**
   * A free window that would cover the YouTube player moves just beside it, to the nearest side where it fits on the
   * screen (left, right, above, below). When it fits on no side at its size, it shrinks (16:9, not below its smallest
   * width) to fit the side with the most room. Returns where it goes and how wide it is.
   */
  function clearOfPlayer(left: number, top: number, width: number): { left: number; top: number; width: number } {
    if (where() !== 'free' || !overYoutube()) return { left, top, width };
    const p = theater.getBoundingClientRect();
    const covers = (l: number, t: number, w: number) => p.width >= 2 && !(l >= p.right || p.left >= l + w || t >= p.bottom || p.top >= t + (w * 9) / 16);
    if (!covers(left, top, width)) return { left, top, width };
    const clamp = (o: { left: number; top: number; width: number }) => ({
      width: o.width,
      left: Math.min(Math.max(o.left, EDGE), innerWidth - EDGE - o.width),
      top: Math.min(Math.max(o.top, EDGE), innerHeight - EDGE - (o.width * 9) / 16),
    });
    // The room each side leaves: the widest 16:9 window that fits there.
    const fullH = innerHeight - 2 * EDGE;
    const fullW = innerWidth - 2 * EDGE;
    const sides = [
      { room: Math.min(p.left - BESIDE_GAP - EDGE, (fullH * 16) / 9), at: (w: number) => ({ left: p.left - w - BESIDE_GAP, top, width: w }) },
      { room: Math.min(innerWidth - EDGE - p.right - BESIDE_GAP, (fullH * 16) / 9), at: (w: number) => ({ left: p.right + BESIDE_GAP, top, width: w }) },
      { room: Math.min(fullW, ((p.top - BESIDE_GAP - EDGE) * 16) / 9), at: (w: number) => ({ left, top: p.top - (w * 9) / 16 - BESIDE_GAP, width: w }) },
      { room: Math.min(fullW, ((innerHeight - EDGE - p.bottom - BESIDE_GAP) * 16) / 9), at: (w: number) => ({ left, top: p.bottom + BESIDE_GAP, width: w }) },
    ];
    const near = (o: { left: number; top: number }) => Math.hypot(o.left - left, o.top - top);
    const fitting = sides
      .filter((s) => s.room >= width)
      .map((s) => clamp(s.at(width)))
      .filter((o) => !covers(o.left, o.top, o.width))
      .sort((a, b) => near(a) - near(b));
    if (fitting[0]) return fitting[0];
    const min = narrow() ? PHONE_MIN_WIDTH : MIN_WIDTH;
    const roomiest = [...sides].sort((a, b) => b.room - a.room)[0]!;
    if (roomiest.room >= min) return clamp(roomiest.at(Math.floor(roomiest.room)));
    // No room anywhere (a player as large as the screen): the smallest window in the screen's corner.
    return clamp({ left: innerWidth, top: innerHeight, width: min });
  }

  /**
   * First look (ST1 review): a free window with no saved place opens over the video's top right, as the stream window
   * always did, never over the side panel (it hid "Stop watching" and the people there).
   */
  function firstFree(): Spot {
    const v = wrap.getBoundingClientRect();
    if (v.width < 2 || !innerWidth || !innerHeight) return DEFAULTS.free;
    const width = Math.min(Math.max(MIN_WIDTH, v.width * 0.36), v.width * MAX_SHARE);
    return { x: (v.right - width - 12) / innerWidth, y: (v.top + 12) / innerHeight, w: width / innerWidth };
  }

  /** Puts the window where it belongs and sizes it from its saved spot. */
  function apply(): void {
    syncRail();
    const w = where();
    const parent = w === 'free' ? document.body : wrap;
    if (win.parentNode !== parent && !document.fullscreenElement?.contains(win)) {
      if (w === 'free') document.body.append(win);
      else home.after(win);
      void win.querySelector('video')?.play().catch(() => {});
    }
    win.classList.toggle('free', w === 'free');
    // On the film page a window on the page must show over the hole (inside the video it is an island anyway).
    win.toggleAttribute('data-island', w === 'free' || isFull());
    labels();
    if (isFull()) {
      win.style.left = win.style.top = win.style.width = '';
      opts.onMove();
      return;
    }
    const c = container(w);
    const spot = spots[w] ?? (w === 'free' ? firstFree() : DEFAULTS[w]);
    const width = Math.round(Math.min(Math.max(narrow() ? PHONE_MIN_WIDTH : MIN_WIDTH, spot.w * c.w), c.w * MAX_SHARE));
    const height = (width * 9) / 16;
    const left = Math.min(Math.max(EDGE, spot.x * c.w), Math.max(EDGE, c.w - width - EDGE));
    const top = Math.min(Math.max(EDGE, spot.y * c.h), Math.max(EDGE, c.h - height - EDGE));
    const at = clearOfPlayer(left, top, width);
    win.style.width = `${Math.round(at.width)}px`;
    win.style.left = `${Math.round(at.left)}px`;
    win.style.top = `${Math.round(at.top)}px`;
    labels();
    opts.onMove();
  }

  function remember(): void {
    const w = where();
    const c = container(w);
    if (!c.w || !c.h) return;
    spots[w] = { x: win.offsetLeft / c.w, y: win.offsetTop / c.h, w: win.offsetWidth / c.w };
    save(KEYS[w], JSON.stringify(spots[w]));
  }

  /** ⛶ / 🪟: the stream alone in the browser's fullscreen, or back to its window. */
  function toggleFull(): void {
    if (document.fullscreenElement === win) {
      void document.exitFullscreen().catch(() => {});
      return;
    }
    if (win.classList.contains('filled')) {
      win.classList.remove('filled');
      apply();
      return;
    }
    if (win.requestFullscreen && document.fullscreenEnabled) {
      win.requestFullscreen().catch(() => {
        win.classList.add('filled');
        apply();
      });
    } else {
      win.classList.add('filled');
      apply();
    }
  }
  modeButton.addEventListener('click', toggleFull);
  // Escape leaves the fallback too (the browser's own fullscreen handles its Escape itself).
  addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && win.classList.contains('filled')) {
      win.classList.remove('filled');
      apply();
    }
  });

  let drag: { id: number; resize: boolean; x: number; y: number; left: number; top: number; width: number } | null = null;
  let frame = 0;
  win.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || isFull()) return;
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
      win.style.width = `${Math.round(Math.min(Math.max(narrow() ? PHONE_MIN_WIDTH : MIN_WIDTH, drag.width + Math.max(dx, (dy * 16) / 9)), max))}px`;
    } else {
      const left = Math.min(Math.max(EDGE, drag.left + dx), Math.max(EDGE, c.w - win.offsetWidth - EDGE));
      const top = Math.min(Math.max(EDGE, drag.top + dy), Math.max(EDGE, c.h - win.offsetHeight - EDGE));
      const at = clearOfPlayer(left, top, win.offsetWidth);
      win.style.width = `${Math.round(at.width)}px`;
      win.style.left = `${Math.round(at.left)}px`;
      win.style.top = `${Math.round(at.top)}px`;
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
    const resized = drag.resize;
    drag = null;
    win.classList.remove('dragging');
    if (!still) {
      // A window grown from its corner over the YouTube player moves beside it.
      if (resized) {
        const at = clearOfPlayer(win.offsetLeft, win.offsetTop, win.offsetWidth);
        win.style.width = `${Math.round(at.width)}px`;
        win.style.left = `${Math.round(at.left)}px`;
        win.style.top = `${Math.round(at.top)}px`;
      }
      remember();
      labels();
    }
    opts.onMove();
  };
  win.addEventListener('pointerup', stop);
  win.addEventListener('pointercancel', stop);
  // Double click: back to the default place and size (this view only).
  win.addEventListener('dblclick', (event) => {
    if ((event.target as Element).closest('button') || isFull()) return;
    const w = where();
    spots[w] = null;
    save(KEYS[w], '');
    apply();
  });

  addEventListener('resize', () => {
    if (!win.hidden) apply();
  });
  document.addEventListener('fullscreenchange', () => {
    wasFs = isFs();
    if (!win.hidden) apply();
  });
  // The phones' own fullscreen and the film page's are a class on the theater, not real fullscreen; the YouTube rail
  // coming or going changes where the free window may sit. Both are classes on the theater.
  let wasFs = isFs();
  let wasYoutube = overYoutube();
  new MutationObserver(() => {
    if (isFs() === wasFs && overYoutube() === wasYoutube) return;
    wasFs = isFs();
    wasYoutube = overYoutube();
    if (!win.hidden) apply();
  }).observe(theater, { attributes: true, attributeFilter: ['class'] });

  return {
    apply,
    syncRail,
    /** Leaves the stream's own fullscreen (the stream ended or the window closed). */
    leaveFull(): void {
      if (document.fullscreenElement === win) void document.exitFullscreen().catch(() => {});
      win.classList.remove('filled');
    },
    /** Test Lab `stream.view`: the window's mode and box. */
    view(): { mode: 'window' | 'fullscreen' | 'hidden'; where: Where; box: number[]; overPlayer: boolean; onScreen: boolean } {
      const r = win.getBoundingClientRect();
      const p = theater.getBoundingClientRect();
      const shown = !win.hidden && !win.classList.contains('yt-away') && r.width > 0;
      const overPlayer = shown && overYoutube() && !isFull() && !(r.left >= p.right || p.left >= r.right || r.top >= p.bottom || p.top >= r.bottom);
      return {
        mode: win.hidden || win.classList.contains('yt-away') ? 'hidden' : isFull() ? 'fullscreen' : 'window',
        where: where(),
        box: [r.left, r.top, r.width, r.height].map(Math.round),
        overPlayer,
        onScreen: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
      };
    },
  };
}
