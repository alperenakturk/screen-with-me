// Card EC1: the "Video ended" dialog and its styles, loaded before it first opens (the room page's JS and CSS budget).
import './end-card.css';
import { el } from '../dom.ts';
import { t } from '../i18n.ts';

const AUTO_CLOSE_MS = 60_000;

/** Opens the dialog; returns its close function. `gone` runs once it is closed. */
export function openDialog(title: string, url: string | null, startNext: () => void, gone: () => void): () => void {
  const next = el('button', { type: 'button', class: 'btn primary end-next' }, t('startNext'));
  const close = el('button', { type: 'button', class: 'btn end-close' }, t('close'));
  const heading = el('p', { class: 'end-kicker muted small', id: 'end-dialog-title' }, t('videoEnded'));
  const name = el('span', { class: 'end-title' }, title);
  const link = url ? el('a', { class: 'end-link', href: url, target: '_blank', rel: 'noopener noreferrer', title: t('endOpenLink'), 'aria-label': t('endOpenLink') }, '↗') : null;
  const dialog = el(
    'div',
    { class: 'end-dialog card', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'end-dialog-title' },
    heading,
    el('p', { class: 'end-title-row' }, name, ...(link ? [link] : [])),
    el('div', { class: 'end-buttons' }, close, next),
  );
  const backdrop = el('div', { class: 'dialog-backdrop end-backdrop' }, dialog);
  const timer = setTimeout(() => done(), AUTO_CLOSE_MS);
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') done();
  };
  function done(): void {
    clearTimeout(timer);
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
    gone();
  }
  close.addEventListener('click', done);
  next.addEventListener('click', () => {
    done();
    startNext();
  });
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) done();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop);
  next.focus();
  return done;
}
