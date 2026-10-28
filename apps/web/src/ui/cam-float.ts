import { el } from '../dom.ts';
import { t } from '../i18n.ts';
import { load, save } from '../storage.ts';

/** Kayıtlı yer ve genişlik: kabın (pencere ya da video) oranı olarak (ekran boyu değişse de aynı yerde dursun). */
interface Spot {
  x: number;
  y: number;
  w: number;
  /** Height as a share of the container, once the person has resized it (0.9.85: both directions). */
  h?: number;
}

const NORMAL_DEFAULT: Spot = { x: 0.74, y: 0.58, w: 0.2 };
const FS_DEFAULT: Spot = { x: 0.82, y: 0.08, w: 0.15 };
const MIN_WIDTH = 140;
const MIN_HEIGHT = 110;
/** Kabın en fazla bu oranı kadar genişleyebilir (videonun tamamını kaplamasın). */
const MAX_SHARE = 0.7;

function readSpot(key: string, fallback: Spot): Spot {
  try {
    const spot = JSON.parse(load(key) ?? 'null') as Spot | null;
    if (spot && [spot.x, spot.y, spot.w].every((n) => Number.isFinite(n) && n >= 0 && n <= 1)) {
      return spot.h !== undefined && !(Number.isFinite(spot.h) && spot.h > 0 && spot.h <= 1) ? { x: spot.x, y: spot.y, w: spot.w } : spot;
    }
  } catch {
    // bozuk kayıt: varsayılan
  }
  return fallback;
}

/**
 * Kamera kutuları (görüntülü sohbet) üç yerde durabilir:
 * - "Birlikte" kartında (varsayılan): küçük ızgara; köşedeki ⧉ ile serbest bırakılır.
 * - Serbest (sitede, tam ekran değilken): sayfanın üstünde yüzen pencere; her yere sürüklenir, köşesinden
 *   boyutlandırılır, ⤓ ile karta döner. Yer ve boyut bu tarayıcıda hatırlanır (`camFloat`).
 * - Tam ekranda: kendiliğinden videonun içine gelir (tam ekranda sadece o görünür); orada da sürüklenir ve
 *   boyutlandırılır, yeri ayrı hatırlanır (`camFloatFs`).
 * Kutular hep aynı öğeler: yer değişince taşınır (görüntü yeniden kurulmaz), taşınınca oynatma sürdürülür.
 * Film sayfasındaki katmanda (kabuk) yüzen pencere bir adacıktır (`data-island`): deliğin üstünde de görünür.
 */
export function createCamWindow(opts: {
  box: HTMLElement;
  theater: HTMLElement;
  wrap: HTMLElement;
  /** Buttons under the tiles (mic / camera), shown in the floating window and in fullscreen. */
  controls?: HTMLElement;
  onMove: () => void;
  /** A tile was clicked (not dragged): opens the person menu. */
  onTileClick?: (tile: HTMLElement) => void;
}) {
  const { box, theater, wrap } = opts;
  // Kartta durduğu yer (geri dönmek için).
  const home = document.createComment('kameralar');
  box.before(home);

  const grid = el('div', { class: 'cam-grid' });
  const title = el('span', { class: 'cam-bar-title' });
  const popButton = el('button', { type: 'button', class: 'btn small-btn cam-pop' });
  const dockButton = el('button', { type: 'button', class: 'cam-btn cam-dock-btn' }, '⤓');
  const foldButton = el('button', { type: 'button', class: 'cam-btn cam-fold' });
  const bar = el('div', { class: 'cam-bar' }, el('span', { class: 'cam-grip', 'aria-hidden': 'true' }, '⠿'), title, foldButton, dockButton);
  const resize = el('span', { class: 'cam-resize', 'aria-hidden': 'true' });
  box.replaceChildren(bar, grid, ...(opts.controls ? [opts.controls] : []), resize, popButton);

  let floatOn = load('opt:camFloat') === '1';
  let folded = load('opt:camFolded') === '1';
  let spots = { normal: readSpot('camFloat:spot', NORMAL_DEFAULT), fs: readSpot('camFloat:fsSpot', FS_DEFAULT) };
  let count = 0;

  const isFs = () => theater.matches(':fullscreen, .fake-fs');
  const mode = (): 'card' | 'float' | 'fs' => (isFs() ? 'fs' : floatOn ? 'float' : 'card');
  /** Yüzerken kabın boyu: sayfada pencere, tam ekranda video kutusu. */
  const container = () => (mode() === 'fs' ? { w: wrap.clientWidth, h: wrap.clientHeight } : { w: innerWidth, h: innerHeight });

  function labels(): void {
    title.textContent = `📷 ${count}`;
    title.title = t('cam.title');
    const set = (button: HTMLElement, text: string) => {
      button.title = text;
      button.setAttribute('aria-label', text);
    };
    set(popButton, t('cam.float'));
    popButton.textContent = `⧉ ${t('cam.popShort')}`;
    set(dockButton, t('cam.dock'));
    foldButton.textContent = folded ? '＋' : '−';
    set(foldButton, t(folded ? 'cam.expand' : 'cam.collapse'));
  }

  /** Kayıtlı orana göre yerleştirir (kabın içinde kalacak şekilde). */
  function apply(): void {
    const m = mode();
    if (m === 'card') {
      box.style.left = box.style.top = box.style.width = box.style.height = '';
      box.classList.remove('sized');
      return;
    }
    const spot = m === 'fs' ? spots.fs : spots.normal;
    const c = container();
    const width = Math.round(Math.min(Math.max(spot.w * c.w, MIN_WIDTH), c.w * MAX_SHARE));
    box.style.width = `${width}px`;
    // A set height: the tiles fill it (CSS .sized); folded shows only the title strip.
    const sized = spot.h !== undefined && !folded;
    box.classList.toggle('sized', sized);
    box.style.height = sized ? `${Math.round(Math.min(Math.max(spot.h! * c.h, MIN_HEIGHT), c.h * MAX_SHARE))}px` : '';
    const height = box.offsetHeight;
    box.style.left = `${Math.round(Math.min(Math.max(0, spot.x * c.w), Math.max(0, c.w - width)))}px`;
    box.style.top = `${Math.round(Math.min(Math.max(0, spot.y * c.h), Math.max(0, c.h - height)))}px`;
  }

  /** Kart / sayfa / video arasında taşır; taşınan videolar duraklar, yeniden oynatılır. */
  function place(): void {
    const m = mode();
    const parent = m === 'fs' ? wrap : m === 'float' ? document.body : home.parentNode;
    if (parent && box.parentNode !== parent) {
      if (m === 'card') home.after(box);
      else parent.appendChild(box);
      for (const video of box.querySelectorAll('video')) void video.play().catch(() => {});
    }
    box.classList.toggle('floating', m !== 'card');
    box.classList.toggle('in-fs', m === 'fs');
    box.classList.toggle('folded', folded && m !== 'card');
    // Kabukta: sayfada yüzen pencere deliğin üstüne binebilir (videonun içindeyken zaten adacık).
    box.toggleAttribute('data-island', m === 'float');
    labels();
    apply();
    opts.onMove();
  }

  function remember(): void {
    const m = mode();
    if (m === 'card') return;
    const c = container();
    const prev = m === 'fs' ? spots.fs : spots.normal;
    // Küçültülmüşken sadece yer değişir (genişlik açılınca eskisi gibi).
    const spot: Spot = { x: box.offsetLeft / c.w, y: box.offsetTop / c.h, w: folded ? prev.w : box.offsetWidth / c.w };
    const h = folded ? prev.h : box.style.height ? box.offsetHeight / c.h : prev.h;
    if (h !== undefined) spot.h = h;
    if (m === 'fs') spots = { ...spots, fs: spot };
    else spots = { ...spots, normal: spot };
    save(m === 'fs' ? 'camFloat:fsSpot' : 'camFloat:spot', JSON.stringify(spot));
  }

  // Sürükleme (düğmeler ve boyut köşesi hariç her yerden) ve boyutlandırma (sağ alt köşe).
  let drag: { id: number; kind: 'move' | 'size'; x: number; y: number; left: number; top: number; width: number; height: number } | null = null;
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
    const target = event.target as Element;
    if (target.closest('button')) return;
    const kind = target === resize ? 'size' : 'move';
    drag = { id: event.pointerId, kind, x: event.clientX, y: event.clientY, left: box.offsetLeft, top: box.offsetTop, width: box.offsetWidth, height: box.offsetHeight };
    box.setPointerCapture(event.pointerId);
    box.classList.add('dragging');
    event.preventDefault();
  });
  box.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const c = container();
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    if (drag.kind === 'move') {
      box.style.left = `${Math.round(Math.min(Math.max(0, drag.left + dx), Math.max(0, c.w - box.offsetWidth)))}px`;
      box.style.top = `${Math.round(Math.min(Math.max(0, drag.top + dy), Math.max(0, c.h - box.offsetHeight)))}px`;
    } else {
      const max = Math.min(c.w * MAX_SHARE, c.w - drag.left);
      box.style.width = `${Math.round(Math.min(Math.max(MIN_WIDTH, drag.width + dx), max))}px`;
      // Both directions: the height is free too (tiles fill the box).
      const maxH = Math.min(c.h * MAX_SHARE, c.h - drag.top);
      box.style.height = `${Math.round(Math.min(Math.max(MIN_HEIGHT, drag.height + dy), maxH))}px`;
      box.classList.add('sized');
    }
    // Kabukta delik/adacık her karede bir kez bildirilsin.
    if (!frame) {
      frame = requestAnimationFrame(() => {
        frame = 0;
        opts.onMove();
      });
    }
  });
  const stop = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    drag = null;
    box.classList.remove('dragging');
    remember();
    apply();
    opts.onMove();
  };
  box.addEventListener('pointerup', stop);
  box.addEventListener('pointercancel', stop);
  // Çift tık: varsayılan yer ve boyut.
  bar.addEventListener('dblclick', () => {
    if (mode() === 'card') return;
    const fs = mode() === 'fs';
    spots = fs ? { ...spots, fs: FS_DEFAULT } : { ...spots, normal: NORMAL_DEFAULT };
    save(fs ? 'camFloat:fsSpot' : 'camFloat:spot', JSON.stringify(fs ? FS_DEFAULT : NORMAL_DEFAULT));
    apply();
    opts.onMove();
  });

  popButton.addEventListener('click', () => {
    floatOn = true;
    save('opt:camFloat', '1');
    place();
  });
  dockButton.addEventListener('click', () => {
    floatOn = false;
    save('opt:camFloat', '0');
    place();
  });
  foldButton.addEventListener('click', () => {
    folded = !folded;
    save('opt:camFolded', folded ? '1' : '0');
    place();
  });

  // Tam ekrana girip çıkınca (gerçek ya da kabuktaki "fake-fs") ve pencere boyu değişince yer güncellenir.
  document.addEventListener('fullscreenchange', place);
  new MutationObserver(place).observe(theater, { attributes: true, attributeFilter: ['class'] });
  addEventListener('resize', apply);
  addEventListener('langchange', labels);
  place();

  return {
    /** Kutuların konacağı yer. */
    grid,
    /** Kutular değişince: sayıyı yazar, yeri sınırların içinde tutar. */
    update(n: number): void {
      count = n;
      labels();
      if (mode() !== 'card') requestAnimationFrame(apply);
    },
  };
}
