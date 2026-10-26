import { el } from '../dom.ts';

/**
 * Düğmenin üstünde kısa süre beliren küçük uyarı balonu (ör. "tek başınasın"). Pencere açmaz,
 * kendiliğinden kaybolur; aynı anda tek balon.
 */
let current: HTMLElement | null = null;
let timer = 0;

export function flashHint(anchor: HTMLElement, text: string, ms = 2800): void {
  current?.remove();
  clearTimeout(timer);
  const bubble = el('div', { class: 'hint-bubble', role: 'status' }, text);
  document.body.append(bubble);
  const r = anchor.getBoundingClientRect();
  const w = bubble.offsetWidth;
  // Düğmenin ortasına hizalı, ekrandan taşmasın; üstte yer yoksa altına.
  const left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), innerWidth - w - 8);
  const above = r.top - bubble.offsetHeight - 8;
  bubble.style.left = `${left}px`;
  bubble.style.top = `${above > 8 ? above : r.bottom + 8}px`;
  current = bubble;
  timer = window.setTimeout(() => {
    bubble.remove();
    if (current === bubble) current = null;
  }, ms);
}
