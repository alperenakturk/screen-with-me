import { el } from '../dom.ts';
import { t, type I18nKey } from '../i18n.ts';
import { isTyping } from './reactions.ts';

/** One row of the card: the keys ('–' and '/' are separators) and what they do (checked against the room's handlers). */
const ROWS: ReadonlyArray<readonly [keys: string[], what: I18nKey]> = [
  [['1', '–', '8'], 'keys.emoji'],
  [['Enter'], 'keys.chat'],
  [['P'], 'keys.pin'],
  [['M'], 'keys.mic'],
  [['V'], 'keys.ptt'],
  [['Space', '/', 'K'], 'keys.play'],
  [['T'], 'keys.cinema'],
  [['↑', '/', '↓'], 'keys.shorts'],
  [['Esc'], 'keys.close'],
  [['?'], 'keys.help'],
];

/**
 * "Keyboard shortcuts" card (0.9.93.2, owner): what the room's keys do. Opens with ? (outside a text box) and from
 * ⋯ / the profile menu; Esc, ✕ or a click outside closes it.
 */
export function openShortcuts(): void {
  if (document.querySelector('.shortcuts-dialog')) return;
  const close = el('button', { type: 'button', class: 'icon-btn', title: t('close'), 'aria-label': t('close') }, '✕');
  const list = el(
    'dl',
    { class: 'shortcuts-list' },
    ...ROWS.flatMap(([keys, what]) => [
      el('dt', {}, ...keys.map((key) => (key === '–' || key === '/' ? ` ${key} ` : el('kbd', {}, key)))),
      el('dd', {}, t(what)),
    ]),
  );
  const dialog = el(
    'div',
    { class: 'shortcuts-dialog card', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('keys.title') },
    el('div', { class: 'invite-head' }, el('h3', {}, `⌨️ ${t('keys.title')}`), close),
    list,
    el('p', { class: 'muted small' }, t('keys.note')),
  );
  const backdrop = el('div', { class: 'dialog-backdrop' }, dialog);
  const finish = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey, true);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' && event.key !== '?') return;
    event.stopImmediatePropagation();
    finish();
  };
  close.addEventListener('click', finish);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) finish();
  });
  document.addEventListener('keydown', onKey, true);
  document.body.append(backdrop);
  close.focus();
}

/** ? anywhere in the room (not while typing, not with another window open) opens the card. */
export function listenForShortcutsKey(): void {
  document.addEventListener('keydown', (event) => {
    if (event.key !== '?' || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
    if (document.querySelector('.dialog-backdrop:not([hidden])')) return;
    event.preventDefault();
    openShortcuts();
  });
}
