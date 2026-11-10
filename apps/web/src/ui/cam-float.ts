import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { load, save } from '../storage.ts';
import { setIcon } from './icons.ts';

/** A saved place and size, as a share of the container (window or video), so it survives size changes. */
interface Spot {
  x: number;
  y: number;
  w: number;
  /** Height as a share of the container, once the person has resized it (0.9.85: both directions). */
  h?: number;
}

/** One camera's own place and size in the free layout (0.9.90.5); no x/y = lined up automatically. */
interface TileSpot {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
}

export type CamSize = 'small' | 'medium' | 'large';

/**
 * Default sizes (shares of the container's width). The default place is worked out from the video (card NP1, owner's
 * C2, like Meet): its bottom-left corner, above the video's own controls (`PLAYER_BAR`), until the person moves it.
 */
const NORMAL_DEFAULT: Spot = { x: 0, y: 0, w: 0.2 };
const FS_DEFAULT: Spot = { x: 0, y: 0, w: 0.26 };
/** Room left free under a default camera window for the player's own bar (YouTube's is ≈ 48 px plus its seek line). */
const PLAYER_BAR = 72;
/**
 * The one window keeps its cameras side by side (owner, 0.9.93.2: in fullscreen it was narrow and stacked them): at
 * least this wide per camera (up to three in a row), but never more than this share of its container.
 */
const ROW_TILE_W = 150;
const ROW_MAX_SHARE = 0.5;
const MIN_WIDTH = 140;
const MIN_HEIGHT = 110;
/** A window may grow to at most this share of its container (it must not cover the whole video). */
const MAX_SHARE = 0.7;
/** Free layout: smallest camera tile, default width and the size presets (share of the container's width). */
const MIN_TILE_W = 96;
const MIN_TILE_H = 72;
const TILE_W = { normal: 0.15, fs: 0.14 };
const SIZES: Record<CamSize, { normal: number; fs: number }> = {
  small: { normal: 0.1, fs: 0.09 },
  medium: { normal: 0.16, fs: 0.15 },
  large: { normal: 0.27, fs: 0.26 },
};
const GAP = 8;
const EDGE = 12;
/** At most this many people's tile places are remembered. */
const MAX_REMEMBERED = 30;

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;

function readSpot(key: string, fallback: Spot): Spot {
  try {
    const spot = JSON.parse(load(key) ?? 'null') as Spot | null;
    if (spot && [spot.x, spot.y, spot.w].every(finite)) {
      return spot.h !== undefined && !(finite(spot.h) && spot.h > 0) ? { x: spot.x, y: spot.y, w: spot.w } : spot;
    }
  } catch {
    // broken record: default
  }
  return fallback;
}

function readTiles(key: string): Map<string, TileSpot> {
  const map = new Map<string, TileSpot>();
  try {
    const raw = JSON.parse(load(key) ?? '{}') as Record<string, TileSpot>;
    for (const [person, spot] of Object.entries(raw ?? {})) {
      if (!spot || typeof spot !== 'object') continue;
      const clean: TileSpot = {};
      for (const k of ['x', 'y', 'w', 'h'] as const) if (finite(spot[k])) clean[k] = spot[k];
      map.set(person, clean);
    }
  } catch {
    // broken record: everything lined up
  }
  return map;
}

/**
 * Camera tiles (video chat) live in one of three places:
 * - In the "Birlikte" card (default): a small grid; "⧉" pops them out.
 * - Floating (on the site, not fullscreen) or inside the video in fullscreen. There are two layouts (owner's choice
 *   "layout 2", 29 Oct 2026):
 *   - **free** (default): every camera is its own small window: drag it anywhere, resize it from its corner, double
 *     click puts it back in line. A small pill holds the count, "line up", "back to default", "one window" and "back
 *     to the card" (0.9.91.5, owner: only camera and placement there; mic / camera / stream are on the dock). The
 *     cameras start attached under the pill and move with it; a camera dragged away is detached (double click or
 *     "line up" attaches it again). Places are remembered per person (name + avatar), separately for the page and
 *     fullscreen. The pill shows only while there is a camera.
 *   - **group**: the 0.9.81 window, all tiles in one box (dragged and resized as a whole).
 * The tiles are always the same elements: moving them never rebuilds the picture; moved videos are played again.
 * In the room view on the film page (shell) floating pieces are islands (`data-island`): visible over the hole.
 */
export function createCamWindow(opts: {
  box: HTMLElement;
  theater: HTMLElement;
  wrap: HTMLElement;
  onMove: () => void;
  /** A tile was clicked (not dragged): opens the person menu. */
  onTileClick?: (tile: HTMLElement) => void;
  /** "👁 N": show the cameras I hid again. */
  onShowHidden?: () => void;
}) {
  const { box, theater, wrap } = opts;
  // Where it sits in the card (to come back).
  const home = document.createComment('cameras');
  box.before(home);

  const grid = el('div', { class: 'cam-grid' });
  const title = el('span', { class: 'cam-bar-title' });
  const foldButton = el('button', { type: 'button', class: 'cam-btn cam-fold' });
  const hiddenButton = el('button', { type: 'button', class: 'cam-btn cam-hidden-btn' });
  const lineUpButton = el('button', { type: 'button', class: 'cam-btn cam-lineup' }, '⊞');
  const resetButton = el('button', { type: 'button', class: 'cam-btn cam-reset' }, '↺');
  const layoutButton = el('button', { type: 'button', class: 'cam-btn cam-layout' });
  const bar = el(
    'div',
    { class: 'cam-bar' },
    el('span', { class: 'cam-grip', 'aria-hidden': 'true' }, '⠿'),
    title,
    hiddenButton,
    lineUpButton,
    resetButton,
    layoutButton,
    foldButton,
  );
  const resize = el('span', { class: 'cam-resize', 'aria-hidden': 'true' });
  /** Free layout: the bar in one small draggable pill. */
  const pill = el('div', { class: 'cam-pill' });
  /** Its corner makes the pill bigger or smaller (0.9.90.8, owner's request); remembered in this browser. */
  const pillGrip = el('span', { class: 'cam-pill-resize', 'aria-hidden': 'true' });
  const PILL_MIN = 0.7;
  const PILL_MAX = 1.8;
  let pillScale = Math.min(PILL_MAX, Math.max(PILL_MIN, Number(load('camPill:scale')) || 1));
  const setPillScale = (scale: number) => {
    pillScale = Math.min(PILL_MAX, Math.max(PILL_MIN, scale));
    pill.style.transform = pillScale === 1 ? '' : `scale(${pillScale.toFixed(3)})`;
  };
  setPillScale(pillScale);

  // Card 6g.7 (owner, like Meet): cameras start in their own window, never as tiles in the Together card (the chat keeps
  // its height), in the one-window layout. A saved "free" is only ever written by the person pressing the switch (the
  // old default was never saved), so it is kept.
  let folded = load('opt:camFolded') === '1';
  let layout: 'free' | 'group' = load('opt:camLayout') === 'free' ? 'free' : 'group';
  /** A saved place, or null: the default place (bottom left of the video). A reset saves 'null'. */
  const savedSpot = (key: string, fallback: Spot): Spot | null => (load(key) && load(key) !== 'null' ? readSpot(key, fallback) : null);
  let spots = { normal: savedSpot('camFloat:spot', NORMAL_DEFAULT), fs: savedSpot('camFloat:fsSpot', FS_DEFAULT) };
  const tileSpots = { normal: readTiles('camTiles:spot'), fs: readTiles('camTiles:fsSpot') };
  let pillSpots: { normal: Spot | null; fs: Spot | null } = {
    normal: load('camPill:spot') ? readSpot('camPill:spot', NORMAL_DEFAULT) : null,
    fs: load('camPill:fsSpot') ? readSpot('camPill:fsSpot', FS_DEFAULT) : null,
  };
  let count = 0;
  let hiddenCount = 0;
  let front = 1;

  const isFs = () => theater.matches(':fullscreen, .fake-fs');
  const mode = (): 'card' | 'float' | 'fs' => (isFs() ? 'fs' : 'float');
  const isFree = () => layout === 'free' && mode() !== 'card';
  const where = (): 'normal' | 'fs' => (mode() === 'fs' ? 'fs' : 'normal');
  /** Size of what floating pieces live in: the page, or the video box in fullscreen. */
  const container = () => (mode() === 'fs' ? { w: wrap.clientWidth, h: wrap.clientHeight } : { w: innerWidth, h: innerHeight });
  const tilesNow = () => [...grid.children] as HTMLElement[];
  const personOf = (tile: HTMLElement) => tile.dataset.person ?? tile.dataset.voiceId ?? '';

  function labels(): void {
    title.textContent = String(count);
    setIcon(title, 'cam');
    title.title = t('cam.title');
    const set = (button: HTMLElement, text: string) => {
      button.title = text;
      button.setAttribute('aria-label', text);
    };
    foldButton.textContent = folded ? '＋' : '−';
    set(foldButton, t(folded ? 'cam.expand' : 'cam.collapse'));
    hiddenButton.hidden = hiddenCount === 0;
    hiddenButton.textContent = `👁 ${hiddenCount}`;
    set(hiddenButton, t('cam.showHidden', { n: hiddenCount }));
    set(lineUpButton, t('cam.lineUp'));
    set(resetButton, t('cam.reset'));
    layoutButton.textContent = layout === 'free' ? '▣' : '⊡';
    set(layoutButton, t(layout === 'free' ? 'cam.group' : 'cam.free'));
  }

  function saveTiles(at: 'normal' | 'fs'): void {
    const map = tileSpots[at];
    while (map.size > MAX_REMEMBERED) map.delete(map.keys().next().value as string);
    save(at === 'fs' ? 'camTiles:fsSpot' : 'camTiles:spot', JSON.stringify(Object.fromEntries(map)));
  }
  function setTileSpot(person: string, spot: TileSpot): void {
    const map = tileSpots[where()];
    // Re-insert: the most recently touched is kept longest.
    map.delete(person);
    map.set(person, spot);
    saveTiles(where());
  }

  /**
   * Where the automatic places are: the video's top-right corner (on the page the video box, in fullscreen the whole
   * screen), in the container's coordinates.
   */
  function area(c: { w: number; h: number }): { top: number; right: number; bottom: number; left: number; maxW?: number } {
    // With the dock on the right (option A, 0.9.91.1; in the window too since 0.9.91.5) the column starts left of it.
    const docked = theater.classList.contains('dock-mode') ? theater.querySelector<HTMLElement>('#fs-dock')?.getBoundingClientRect() : undefined;
    const dock = docked && docked.width > 0 ? docked : undefined;
    if (mode() === 'fs') {
      const right = dock ? dock.left - wrap.getBoundingClientRect().left - GAP : c.w;
      return { top: 0, right: Math.min(c.w, right), bottom: c.h, left: 0 };
    }
    const r = wrap.getBoundingClientRect();
    return r.width > 200 && r.height > 120
      ? { top: Math.max(0, r.top), right: Math.min(c.w, dock ? dock.left - GAP : r.right), bottom: Math.min(c.h, r.bottom), left: Math.max(0, r.left) }
      : { top: 0, right: c.w, bottom: c.h, left: 0 };
  }

  /**
   * Free layout: places the pill and every tile: its own spot, or attached to the pill (a column under it, or above
   * it when the pill sits in the lower half; a new column to the left when full). `pillAt` while the pill is dragged:
   * the attached cameras follow it.
   */
  function applyFree(pillAt?: { left: number; top: number }): void {
    const at = where();
    const c = container();
    const map = tileSpots[at];
    const box = area(c);
    // The pill is scaled from its top-left corner: its drawn size counts for the corner and the edges.
    const pw = pill.offsetWidth * pillScale;
    const ph = pill.offsetHeight * pillScale;
    let pillLeft: number;
    let pillTop: number;
    if (pillAt) ({ left: pillLeft, top: pillTop } = pillAt);
    else {
      const spot = pillSpots[at];
      pillLeft = Math.round(Math.min(Math.max(0, spot ? spot.x * c.w : box.right - EDGE - pw), Math.max(0, c.w - pw)));
      pillTop = Math.round(Math.min(Math.max(0, spot ? spot.y * c.h : box.top + EDGE), Math.max(0, c.h - ph)));
      pill.style.left = `${pillLeft}px`;
      pill.style.top = `${pillTop}px`;
    }
    const up = pillTop + ph / 2 > c.h / 2;
    const startY = up ? pillTop - GAP : pillTop + ph + GAP;
    let right = Math.max(pillLeft + pw, MIN_TILE_W);
    let y = startY;
    let column = 0;
    for (const tile of tilesNow()) {
      const spot = map.get(personOf(tile)) ?? {};
      const attached = spot.x === undefined || spot.y === undefined;
      const width = Math.round(Math.min(Math.max((spot.w ?? TILE_W[at]) * c.w, MIN_TILE_W), c.w * MAX_SHARE, attached ? (box.maxW ?? Infinity) : Infinity));
      const height = Math.round(spot.h !== undefined ? Math.min(Math.max(spot.h * c.h, MIN_TILE_H), c.h * MAX_SHARE) : (width * 3) / 4);
      let left: number;
      let top: number;
      if (spot.x !== undefined && spot.y !== undefined) {
        left = spot.x * c.w;
        top = spot.y * c.h;
      } else {
        const full = up ? y - height < EDGE && y < startY : y + height > c.h - EDGE && y > startY;
        if (full) {
          right -= column + GAP;
          y = startY;
          column = 0;
        }
        left = right - width;
        top = up ? y - height : y;
        y = up ? y - height - GAP : y + height + GAP;
        column = Math.max(column, width);
      }
      tile.style.width = `${width}px`;
      tile.style.height = `${height}px`;
      tile.style.left = `${Math.round(Math.min(Math.max(0, left), Math.max(0, c.w - width)))}px`;
      tile.style.top = `${Math.round(Math.min(Math.max(0, top), Math.max(0, c.h - height)))}px`;
    }
  }

  function clearTiles(): void {
    for (const tile of tilesNow()) tile.style.left = tile.style.top = tile.style.width = tile.style.height = tile.style.zIndex = '';
  }

  /** Places the box (and in the free layout every tile) by the saved shares, inside the container. */
  function apply(): void {
    const m = mode();
    if (m === 'card' || isFree()) {
      box.style.left = box.style.top = box.style.width = box.style.height = '';
      box.classList.remove('sized');
      if (isFree()) applyFree();
      else clearTiles();
      return;
    }
    clearTiles();
    const c = container();
    const saved = m === 'fs' ? spots.fs : spots.normal;
    const spot = saved ?? (m === 'fs' ? FS_DEFAULT : NORMAL_DEFAULT);
    const inRow = Math.min(3, tilesNow().length);
    const row = inRow > 1 ? Math.min(inRow * ROW_TILE_W + (inRow - 1) * 6 + 16, c.w * ROW_MAX_SHARE) : 0;
    const width = Math.round(Math.min(Math.max(spot.w * c.w, MIN_WIDTH, row), c.w * MAX_SHARE));
    box.style.width = `${width}px`;
    // A set height: the tiles fill it (CSS .sized); folded shows only the title strip.
    const sized = spot.h !== undefined && !folded;
    box.classList.toggle('sized', sized);
    box.style.height = sized ? `${Math.round(Math.min(Math.max(spot.h! * c.h, MIN_HEIGHT), c.h * MAX_SHARE))}px` : '';
    const height = box.offsetHeight;
    let left = spot.x * c.w;
    let top = spot.y * c.h;
    if (!saved) {
      // Like Meet: the video's bottom-left corner, clear of the player's own bar.
      const video = area(c);
      left = video.left + EDGE;
      top = video.bottom - PLAYER_BAR - height;
      if (top < video.top + EDGE) top = video.bottom - height - EDGE;
    }
    box.style.left = `${Math.round(Math.min(Math.max(0, left), Math.max(0, c.w - width)))}px`;
    box.style.top = `${Math.round(Math.min(Math.max(0, top), Math.max(0, c.h - height)))}px`;
  }

  /** Grips and island marks on the tiles (they come and go with the people in voice). */
  function markTiles(): void {
    const free = isFree();
    const tiles = tilesNow();
    for (const tile of tiles) {
      if (!tile.querySelector('.cam-tile-resize')) tile.append(el('span', { class: 'cam-tile-resize', 'aria-hidden': 'true' }));
      tile.toggleAttribute('data-island', free);
    }
    // A pinned camera in the one-window layout (owner: pinning made the window look broken, the others spilled out):
    // it fills the left, the others share a strip on the right, everything inside the window.
    const spotlight = !free && mode() !== 'card' && tiles.length > 1 && tiles.some((tile) => tile.classList.contains('pinned'));
    grid.classList.toggle('spotlight', spotlight);
    grid.style.setProperty('--cam-others', String(Math.max(1, tiles.length - 1)));
  }

  /** Moves the box between the card, the page and the video; moved videos pause, so they are played again. */
  function place(): void {
    const m = mode();
    const free = isFree();
    const parent = m === 'fs' ? wrap : m === 'float' ? document.body : home.parentNode;
    if (parent && box.parentNode !== parent) {
      if (m === 'card') home.after(box);
      else parent.appendChild(box);
      for (const video of box.querySelectorAll('video')) void video.play().catch(() => {});
    }
    // The same pieces in another order: the pill holds the bar in the free layout.
    if (free) {
      if (pill.parentNode !== box || bar.parentNode !== pill) {
        pill.replaceChildren(bar, pillGrip);
        box.replaceChildren(pill, grid);
      }
    } else if (bar.parentNode !== box) {
      box.replaceChildren(bar, grid, resize);
    }
    // Only while there is a camera (owner: the pill comes with the camera; mic and camera are on the dock).
    box.hidden = count === 0 && hiddenCount === 0;
    box.classList.toggle('floating', m !== 'card');
    box.classList.toggle('in-fs', m === 'fs');
    box.classList.toggle('free', free);
    box.classList.toggle('folded', folded && m !== 'card');
    // In the shell a floating window may lie over the hole (inside the video it is an island anyway). In the free
    // layout the box covers the whole page and lets clicks through; the tiles and the pill are the islands.
    box.toggleAttribute('data-island', m === 'float' && !free);
    pill.toggleAttribute('data-island', free);
    markTiles();
    labels();
    apply();
    opts.onMove();
  }

  function remember(target: HTMLElement, kind: 'move' | 'size' | 'scale'): void {
    const m = mode();
    if (m === 'card') return;
    const c = container();
    if (isFree()) {
      const at = where();
      if (target === pill && kind === 'scale') {
        save('camPill:scale', pillScale.toFixed(3));
        return;
      }
      if (target === pill) {
        const spot: Spot = { x: pill.offsetLeft / c.w, y: pill.offsetTop / c.h, w: 0 };
        pillSpots = { ...pillSpots, [at]: spot };
        save(at === 'fs' ? 'camPill:fsSpot' : 'camPill:spot', JSON.stringify(spot));
        return;
      }
      const person = personOf(target);
      const prev = tileSpots[at].get(person) ?? {};
      const spot: TileSpot = { x: target.offsetLeft / c.w, y: target.offsetTop / c.h, w: target.offsetWidth / c.w };
      // The height is only fixed once the person resized it; otherwise the tile keeps a 4:3 shape.
      const h = kind === 'size' ? target.offsetHeight / c.h : prev.h;
      if (h !== undefined) spot.h = h;
      setTileSpot(person, spot);
      return;
    }
    const prev = (m === 'fs' ? spots.fs : spots.normal) ?? (m === 'fs' ? FS_DEFAULT : NORMAL_DEFAULT);
    // While folded only the place changes (the width comes back when opened).
    const spot: Spot = { x: box.offsetLeft / c.w, y: box.offsetTop / c.h, w: folded ? prev.w : box.offsetWidth / c.w };
    const h = folded ? prev.h : box.style.height ? box.offsetHeight / c.h : prev.h;
    if (h !== undefined) spot.h = h;
    if (m === 'fs') spots = { ...spots, fs: spot };
    else spots = { ...spots, normal: spot };
    save(m === 'fs' ? 'camFloat:fsSpot' : 'camFloat:spot', JSON.stringify(spot));
  }

  // Dragging (from anywhere but the buttons and the size corner) and resizing (bottom-right corner). In the free
  // layout each tile and the pill move on their own.
  let drag: {
    id: number;
    target: HTMLElement;
    kind: 'move' | 'size' | 'scale';
    x: number;
    y: number;
    left: number;
    top: number;
    width: number;
    height: number;
    scale: number;
  } | null = null;
  /** The tile under a pointerdown and whether the pointer moved since: a still click opens the person menu. */
  let downTile: HTMLElement | null = null;
  let moved = false;
  box.addEventListener(
    'pointerdown',
    (event) => {
      downTile = (event.target as Element).closest<HTMLElement>('.cam-tile');
      moved = false;
    },
    true,
  );
  box.addEventListener('click', (event) => {
    if ((event.target as Element).closest('button') || !downTile || moved) return;
    opts.onTileClick?.(downTile);
  });
  let frame = 0;
  box.addEventListener('pointerdown', (event) => {
    if (mode() === 'card' || event.button !== 0) return;
    const element = event.target as Element;
    if (element.closest('button')) return;
    let target: HTMLElement = box;
    let kind: 'move' | 'size' | 'scale' = element === resize ? 'size' : 'move';
    if (isFree()) {
      const tile = element.closest<HTMLElement>('.cam-tile');
      if (tile) {
        target = tile;
        kind = element.classList.contains('cam-tile-resize') ? 'size' : 'move';
        // The one I touch comes to the front.
        tile.style.zIndex = String(++front);
      } else if (element.closest('.cam-pill')) {
        target = pill;
        kind = element === pillGrip ? 'scale' : 'move';
      } else return;
    }
    drag = {
      id: event.pointerId,
      target,
      kind,
      x: event.clientX,
      y: event.clientY,
      left: target.offsetLeft,
      top: target.offsetTop,
      width: target.offsetWidth,
      height: target.offsetHeight,
      scale: pillScale,
    };
    box.setPointerCapture(event.pointerId);
    box.classList.add('dragging');
    target.classList.add('dragging');
    event.preventDefault();
  });
  box.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const c = container();
    const { target } = drag;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    if (drag.kind === 'scale') {
      // Pulling the corner right / down grows the pill, left / up shrinks it.
      setPillScale(drag.scale * (1 + (dx + dy) / Math.max(120, drag.width + drag.height)));
    } else if (drag.kind === 'move') {
      const k = target === pill ? pillScale : 1;
      const left = Math.round(Math.min(Math.max(0, drag.left + dx), Math.max(0, c.w - target.offsetWidth * k)));
      const top = Math.round(Math.min(Math.max(0, drag.top + dy), Math.max(0, c.h - target.offsetHeight * k)));
      target.style.left = `${left}px`;
      target.style.top = `${top}px`;
      // The cameras attached to the pill come along.
      if (target === pill) applyFree({ left, top });
    } else {
      const tile = target !== box;
      const max = Math.min(c.w * MAX_SHARE, c.w - drag.left);
      target.style.width = `${Math.round(Math.min(Math.max(tile ? MIN_TILE_W : MIN_WIDTH, drag.width + dx), max))}px`;
      // Both directions: the height is free too (tiles fill the box).
      const maxH = Math.min(c.h * MAX_SHARE, c.h - drag.top);
      target.style.height = `${Math.round(Math.min(Math.max(tile ? MIN_TILE_H : MIN_HEIGHT, drag.height + dy), maxH))}px`;
      if (!tile) box.classList.add('sized');
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
    const { target, kind } = drag;
    drag = null;
    box.classList.remove('dragging');
    target.classList.remove('dragging');
    // A still click on a tile is not a move (the person menu opens; the tile keeps its automatic place).
    if (moved) remember(target, kind);
    apply();
    opts.onMove();
  };
  box.addEventListener('pointerup', stop);
  box.addEventListener('pointercancel', stop);
  // Double click: back to the default place and size (free layout: that tile goes back in line).
  box.addEventListener('dblclick', (event) => {
    if (mode() === 'card') return;
    const element = event.target as Element;
    if (element.closest('button')) return;
    if (isFree()) {
      const tile = element.closest<HTMLElement>('.cam-tile');
      if (tile) {
        tileSpots[where()].delete(personOf(tile));
        saveTiles(where());
      } else if (element.closest('.cam-pill')) resetAll();
      apply();
      opts.onMove();
      return;
    }
    if (!element.closest('.cam-bar')) return;
    const fs = mode() === 'fs';
    spots = fs ? { ...spots, fs: null } : { ...spots, normal: null };
    save(fs ? 'camFloat:fsSpot' : 'camFloat:spot', 'null');
    apply();
    opts.onMove();
  });

  /** "↺": every tile and the pill back to their default place and size (this view only). */
  function resetAll(): void {
    const at = where();
    tileSpots[at].clear();
    saveTiles(at);
    pillSpots = { ...pillSpots, [at]: null };
    save(at === 'fs' ? 'camPill:fsSpot' : 'camPill:spot', '');
    setPillScale(1);
    save('camPill:scale', '');
  }

  foldButton.addEventListener('click', () => {
    folded = !folded;
    save('opt:camFolded', folded ? '1' : '0');
    place();
  });
  hiddenButton.addEventListener('click', () => opts.onShowHidden?.());
  // "⊞": line them up again (each keeps its width; places and set heights go).
  lineUpButton.addEventListener('click', () => {
    const at = where();
    for (const tile of tilesNow()) {
      const person = personOf(tile);
      const w = tileSpots[at].get(person)?.w;
      if (w === undefined) tileSpots[at].delete(person);
      else tileSpots[at].set(person, { w });
    }
    saveTiles(at);
    apply();
    opts.onMove();
  });
  resetButton.addEventListener('click', () => {
    resetAll();
    apply();
    opts.onMove();
  });
  layoutButton.addEventListener('click', () => {
    layout = layout === 'free' ? 'group' : 'free';
    save('opt:camLayout', layout);
    place();
  });

  // Entering / leaving fullscreen (real or the shell's "fake-fs") and window size changes move the pieces.
  document.addEventListener('fullscreenchange', place);
  new MutationObserver(place).observe(theater, { attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', apply);
  addEventListener('langchange', labels);
  place();

  return {
    /** Where the tiles go. */
    grid,
    /** The tiles changed: the count and the hidden count are written, places kept inside the container. */
    update(n: number, hidden = 0): void {
      const wasHidden = box.hidden;
      count = n;
      hiddenCount = hidden;
      markTiles();
      labels();
      box.hidden = count === 0 && hiddenCount === 0;
      if (wasHidden !== box.hidden) opts.onMove();
      if (mode() !== 'card') requestAnimationFrame(apply);
    },
    /** Does every camera have its own window right now (person menu: size presets instead of "show big")? */
    isFree,
    /** Person menu: small / medium / large for that person's tile (its place stays). */
    setSize(person: string, size: CamSize): void {
      const at = where();
      const prev = tileSpots[at].get(person) ?? {};
      const spot: TileSpot = { w: SIZES[size][at] };
      if (prev.x !== undefined && prev.y !== undefined) {
        spot.x = prev.x;
        spot.y = prev.y;
      }
      setTileSpot(person, spot);
      apply();
      opts.onMove();
    },
    /** The size preset closest to that person's tile (to mark it in the menu). */
    sizeOf(person: string): CamSize {
      const at = where();
      const w = tileSpots[at].get(person)?.w ?? TILE_W[at];
      let best: CamSize = 'medium';
      for (const size of ['small', 'medium', 'large'] as const) {
        if (Math.abs(SIZES[size][at] - w) < Math.abs(SIZES[best][at] - w)) best = size;
      }
      return best;
    },
  };
}
