// Sadece video: film sayfasındaki asıl oynatıcı ekranı (ya da verilen boşluğu) kaplar, sayfanın
// geri kalanı gizlenir, oturmayan kısımlar siyah kalır (YouTube'daki gibi). Oynatıcı film
// sayfasının içindeki başka bir çerçevedeyse, üstteki sayfa o çerçeveyi büyütür.
// İki yerde kullanılır: sitenin içinde açılan film (boşluk yok) ve film kendi sekmesindeyken
// "oda görünümü" (üstte şerit, sağda panel için boşluk bırakılır; çerçeve/başlık engeli yok).

const MARK = 'data-swm-focus';
const STYLE_ID = 'swm-focus-style';
const CSS = `
html.swm-focus, html.swm-focus body { overflow: hidden !important; background: #000 !important; }
html.swm-focus body { visibility: hidden !important; }
html.swm-focus [${MARK}], html.swm-focus [${MARK}] * { visibility: visible !important; }
html.swm-focus [${MARK}] { position: fixed !important; inset: var(--swm-top, 0px) var(--swm-right, 0px) 0 0 !important;
  width: calc(100vw - var(--swm-right, 0px)) !important; height: calc(100vh - var(--swm-top, 0px)) !important;
  max-width: none !important; max-height: none !important; min-width: 0 !important; min-height: 0 !important; margin: 0 !important;
  padding: 0 !important; border: 0 !important; border-radius: 0 !important; transform: none !important; z-index: 2147483646 !important;
  background: #000 !important; }
html.swm-focus [${MARK}] video { object-fit: contain !important; }
html.swm-focus video[${MARK}] { width: calc(100vw - var(--swm-right, 0px)) !important; height: calc(100vh - var(--swm-top, 0px)) !important;
  object-fit: contain !important; }
`;

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

/** Bu çerçevede video yoksa: içindeki en büyük görünür çerçeve (oynatıcı genelde odur). */
function biggestFrame(): HTMLElement | null {
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
 * en büyük iç çerçeve). `on`: kullanıcı "sadece video"yu açık tutuyor mu.
 */
export function applyFocus(on: boolean, video: HTMLVideoElement | null, inset: { top: number; right: number } = { top: 0, right: 0 }): void {
  const root = document.documentElement;
  root.style.setProperty('--swm-top', `${inset.top}px`);
  root.style.setProperty('--swm-right', `${inset.right}px`);
  // Zaten büyütülmüş kutu hâlâ doğruysa yeniden ölçme (büyütülmüşken ölçülen kutu yanlış olur).
  const keep = on && current?.isConnected && (video ? current === video || current.contains(video) : /^i?frame$/i.test(current.tagName));
  const target = on ? (keep ? current : video ? playerBox(video) : biggestFrame()) : null;
  if (target === current && root.classList.contains('swm-focus') === !!target) return;
  current?.removeAttribute(MARK);
  current = target;
  if (!target) {
    root.classList.remove('swm-focus');
    root.style.removeProperty('--swm-top');
    root.style.removeProperty('--swm-right');
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

/** Oda görünümünde videonun etrafındaki boşluk: üst şerit ve sağ panel (overlay ile aynı ölçüler). */
export const ROOM_TOP = 52;
export const ROOM_SIDE = 340;
