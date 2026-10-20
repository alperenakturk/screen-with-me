// Sadece video: film sayfasındaki asıl oynatıcı ekranı (ya da verilen boşluğu) kaplar, sayfanın
// geri kalanı gizlenir, oturmayan kısımlar siyah kalır (YouTube'daki gibi). Oynatıcı film
// sayfasının içindeki başka bir çerçevedeyse, üstteki sayfa o çerçeveyi büyütür.
// Film sayfasının üstüne açılan oda katmanında (kabuk) video, sitenin bıraktığı deliğe yerleşir:
// üst çerçevede deliğin kenarlarına kadar boşluk bırakılır, iç çerçeveler kendi alanını kaplar.

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

/** Oda görünümünde boşlukların zemini: sitenin "Gece" teması. */
export const ROOM_BG =
  'radial-gradient(ellipse 70% 45% at 50% -5%, rgb(139 108 255 / .24), transparent 70%), linear-gradient(#171c40, #0c0e1e 60%)';

/**
 * Videonun oynatıcı kutusu: video ile aşağı yukarı aynı büyüklükteki en dıştaki ata (kendi
 * kontrolleri onun içinde olur). Kutu yoksa videonun kendisi.
 */
function playerBox(video: HTMLVideoElement): HTMLElement {
  const v = video.getBoundingClientRect();
  let box: HTMLElement = video;
  for (let el = video.parentElement; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    const r = el.getBoundingClientRect();
    // Kontrol çubuğu kadar büyük olabilir; başlık/açıklama gibi başka içeriği de saran kutu oynatıcı değildir.
    if (r.width < v.width - 2 || r.height > v.height + 72 || r.width > v.width + 24) break;
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
