// Sadece video: film sayfasındaki asıl oynatıcı ekranı (ya da verilen boşluğu) kaplar, sayfanın
// geri kalanı gizlenir, oturmayan kısımlar siyah kalır (YouTube'daki gibi). Oynatıcı film
// sayfasının içindeki başka bir çerçevedeyse, üstteki sayfa o çerçeveyi büyütür.
// İki yerde kullanılır: sitenin içinde açılan film (boşluk yok) ve film kendi sekmesindeyken
// "oda görünümü" (sitedeki oda gibi: üstte şerit, sağda panel, altta araç çubuğu için boşluk).

const MARK = 'data-swm-focus';
const STYLE_ID = 'swm-focus-style';
const CSS = `
html.swm-focus, html.swm-focus body { overflow: hidden !important; background: var(--swm-bg, #000) !important; }
html.swm-focus body { visibility: hidden !important; }
html.swm-focus [${MARK}], html.swm-focus [${MARK}] * { visibility: visible !important; }
html.swm-focus [${MARK}] { position: fixed !important;
  inset: var(--swm-top, 0px) var(--swm-right, 0px) var(--swm-bottom, 0px) var(--swm-left, 0px) !important;
  width: calc(100vw - var(--swm-left, 0px) - var(--swm-right, 0px)) !important;
  height: calc(100vh - var(--swm-top, 0px) - var(--swm-bottom, 0px)) !important;
  max-width: none !important; max-height: none !important; min-width: 0 !important; min-height: 0 !important; margin: 0 !important;
  padding: 0 !important; border: 0 !important; border-radius: var(--swm-radius, 0px) !important; overflow: hidden !important;
  transform: none !important; z-index: 2147483646 !important; background: #000 !important; }
html.swm-focus [${MARK}] video { object-fit: contain !important; }
html.swm-focus video[${MARK}] { object-fit: contain !important; }
`;

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Oda görünümünün ölçüleri (overlay aynı sayıları kullanır): üst şerit 56 px, sağda panel,
 * videonun altında pin şeridi + araç çubuğu, her yanda 16 px boşluk (sitedeki oda gibi).
 */
export function roomLayout(width: number): Insets & { side: number } {
  const side = width < 1000 ? 280 : 320;
  return { top: 72, left: 16, right: side + 32, bottom: 96, side };
}

/** Bizim ⛶ ile tam ekran: altta kontrol şeridi için boşluk (overlay aynı sayıyı kullanır). */
export const FS_BOTTOM = 112;

/** Oda görünümünde boşlukların zemini: sitenin "Gece" teması. */
export const ROOM_BG =
  'radial-gradient(ellipse 70% 45% at 50% -5%, rgb(139 108 255 / .24), transparent 70%), linear-gradient(#171c40, #0c0e1e 60%)';

/**
 * Videonun oynatıcı kutusu: video ile aşağı yukarı aynı büyüklükteki en dıştaki ata (kendi
 * kontrolleri onun içinde olur). Kutu yoksa videonun kendisi.
 */
function playerBox(video: HTMLVideoElement): HTMLElement {
  const v = video.getBoundingClientRect();
  const area = Math.max(1, v.width * v.height);
  let box: HTMLElement = video;
  for (let el = video.parentElement; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    const r = el.getBoundingClientRect();
    if (r.width * r.height > area * 1.6 || r.width < v.width - 2) break;
    box = el;
  }
  return box;
}

/**
 * Bu çerçevede video yoksa büyütülecek iç çerçeve: videonun olduğu çerçeve kendini bildirdiyse
 * (`preferred`, postMessage zinciriyle) o; yoksa en büyük görünür çerçeve (oynatıcı genelde odur).
 */
export function biggestFrame(preferred: HTMLElement | null = null): HTMLElement | null {
  if (preferred?.isConnected) return preferred;
  let best: HTMLElement | null = null;
  let bestArea = 200 * 120;
  for (const frame of document.querySelectorAll<HTMLElement>('iframe, frame')) {
    const r = frame.getBoundingClientRect();
    const area = r.width * r.height;
    if (area > bestArea && getComputedStyle(frame).visibility !== 'hidden') {
      best = frame;
      bestArea = area;
    }
  }
  return best;
}

/**
 * Video henüz bulunmadan oynatıcının olası yeri (uyarı kartındaki ok için): en büyük video, yoksa en
 * büyük çerçeve, o da yoksa oynatıcıya benzeyen kutu (çoğu sitede oynat'a basmadan önce sadece kapak
 * resmi + ▶ olan, 16:9'a yakın büyük bir alan vardır).
 */
export function likelyPlayer(): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestArea = 160 * 90;
  for (const video of document.querySelectorAll('video')) {
    const r = video.getBoundingClientRect();
    if (r.width * r.height > bestArea) {
      best = video;
      bestArea = r.width * r.height;
    }
  }
  if (best) return playerBox(best as HTMLVideoElement);
  const frame = biggestFrame();
  if (frame) return frame;
  const screen = innerWidth * innerHeight;
  bestArea = 320 * 180;
  for (const box of document.querySelectorAll<HTMLElement>('div, section, figure, a, button, img, picture, canvas')) {
    const r = box.getBoundingClientRect();
    const area = r.width * r.height;
    const ratio = r.width / Math.max(1, r.height);
    // Eşitlikte içteki (sonra gelen) kutu kazanır: oynatıcının kendisi, sarmalayıcısı değil.
    if (area >= bestArea && area < screen * 0.9 && ratio > 1.2 && ratio < 2.4 && r.height >= 180) {
      best = box;
      bestArea = area;
    }
  }
  return best;
}

let current: HTMLElement | null = null;

/**
 * Odaklanılacak öğeyi işaretler. `video`: bu çerçevenin senkronlanan videosu (yoksa null →
 * içteki oynatıcı çerçevesi). `on`: odak açık mı. `inset`: videonun etrafında bırakılacak boşluk.
 */
export function applyFocus(on: boolean, video: HTMLVideoElement | null, inset: Insets = NO_INSETS, preferredFrame: HTMLElement | null = null): void {
  const root = document.documentElement;
  for (const side of ['top', 'right', 'bottom', 'left'] as const) root.style.setProperty(`--swm-${side}`, `${inset[side]}px`);
  // Boşluk varsa (oda görünümü) zemin sitenin teması, video köşeleri yuvarlak; yoksa simsiyah.
  const roomy = inset.top > 0;
  if (roomy) {
    root.style.setProperty('--swm-bg', ROOM_BG);
    root.style.setProperty('--swm-radius', '12px');
  } else {
    root.style.removeProperty('--swm-bg');
    root.style.removeProperty('--swm-radius');
  }
  // Zaten büyütülmüş kutu hâlâ doğruysa yeniden ölçme (büyütülmüşken ölçülen kutu yanlış olur).
  const keep =
    on &&
    current?.isConnected &&
    (video ? current === video || current.contains(video) : /^i?frame$/i.test(current.tagName) && (!preferredFrame || current === preferredFrame));
  const target = on ? (keep ? current : video ? playerBox(video) : biggestFrame(preferredFrame)) : null;
  if (target === current && root.classList.contains('swm-focus') === !!target) return;
  current?.removeAttribute(MARK);
  current = target;
  if (!target) {
    root.classList.remove('swm-focus');
    for (const name of ['top', 'right', 'bottom', 'left', 'bg', 'radius']) root.style.removeProperty(`--swm-${name}`);
    return;
  }
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    (document.head ?? root).append(style);
  }
  target.setAttribute(MARK, '');
  root.classList.add('swm-focus');
}
