import { el } from '../dom.ts';
import { t } from '../i18n.ts';

const AUTO_CLOSE_MS = 60_000;

/**
 * Video bitti ve "sıradakine otomatik geç" kapalı: küçük kart, başlık videonun linki,
 * "▶ Sıradakini başlat". (İstatistikler artık video sonunda değil, oturum özetinde.)
 */
export function showNextCard(container: HTMLElement, title: string, url: string | null, startNext: () => void): void {
  // The card may have moved to the chat panel (YouTube, 0.9.92.9): look for it everywhere.
  document.querySelector('.end-card')?.remove();
  const close = el('button', { type: 'button', class: 'btn small-btn' }, t('close'));
  const next = el('button', { type: 'button', class: 'btn small-btn primary' }, t('startNext'));
  const card = el(
    'div',
    { class: 'end-card next-card', role: 'dialog', 'aria-label': t('videoEnded') },
    el('h3', {}, t('videoEnded')),
    el('p', { class: 'end-name' }, url ? el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', title: t('endOpenLink') }, title) : title),
    el('div', { class: 'end-actions' }, next, close),
  );
  const timer = setTimeout(() => card.remove(), AUTO_CLOSE_MS);
  const done = () => {
    clearTimeout(timer);
    card.remove();
  };
  close.addEventListener('click', done);
  next.addEventListener('click', () => {
    done();
    startNext();
  });
  container.append(card);
}
