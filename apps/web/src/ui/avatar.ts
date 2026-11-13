import { AVATAR_GRID, isDrawnAvatar, type Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { t, type I18nKey } from '../i18n.ts';

/** Avatarın görsel hali: çizilmiş avatar resim (eski kayıtlarda emoji olabilir). */
export function avatarNode(avatar: string | undefined, className = 'avatar-pic'): HTMLElement {
  if (isDrawnAvatar(avatar)) {
    return el('span', { class: `${className} drawn` }, el('img', { src: `/avatars/${avatar}.svg`, alt: '', draggable: 'false' }));
  }
  return el('span', { class: className }, avatar ?? '🙂');
}

/**
 * The avatar picker: one grid of every avatar in `AVATAR_GRID`'s fixed mixed order, no tabs (card R27); it scrolls
 * when the window is short.
 */
export function renderAvatarPicker(
  container: HTMLElement,
  current: () => Avatar,
  onPick: (avatar: Avatar) => void,
  onDouble?: () => void,
): () => void {
  const draw = () => {
    const grid = el(
      'div',
      { class: 'avatar-grid', role: 'radiogroup', 'aria-label': t('pickAvatar') },
      ...(AVATAR_GRID as readonly Avatar[]).map((option) => {
        const label = isDrawnAvatar(option) ? t(`avatar.${option}` as I18nKey) : option;
        const button = el(
          'button',
          { type: 'button', class: 'avatar-option', role: 'radio', 'aria-checked': String(option === current()), title: label, 'aria-label': label },
          avatarNode(option, 'avatar-glyph'),
        );
        // A pick only moves the mark (owner, 0.9.97.129): redrawing the grid sent its scroll back to the top on a phone.
        button.addEventListener('click', () => {
          onPick(option);
          for (const other of grid.querySelectorAll('.avatar-option')) other.setAttribute('aria-checked', String(other === button));
        });
        if (onDouble) button.addEventListener('dblclick', onDouble);
        return button;
      }),
    );
    container.replaceChildren(grid);
  };
  draw();
  return draw;
}
/**
 * Large avatar dialog in the middle of the screen. Picking only marks the choice; it is applied (and seen by others)
 * with "Done" or a double-click; ✕, Esc or a click outside cancel it (owner's feedback, 0.9.87). Opened from the
 * room's profile menu.
 */
export function openAvatarDialog(current: () => Avatar, onPick: (avatar: Avatar) => void): void {
  let chosen = current();
  const picker = el('div', { class: 'avatar-picker huge' });
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
  };
  const apply = () => {
    if (chosen !== current()) onPick(chosen);
    close();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
  };
  const closeButton = el('button', { type: 'button', class: 'icon-btn dialog-x', 'aria-label': t('close'), title: t('close') }, '✕');
  closeButton.addEventListener('click', close);
  const done = el('button', { type: 'button', class: 'btn primary' }, t('done'));
  done.addEventListener('click', apply);
  const dialog = el(
    'div',
    { class: 'avatar-dialog card', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('pickAvatar') },
    el('div', { class: 'dialog-head' }, el('h3', {}, t('pickAvatar')), closeButton),
    picker,
    el('div', { class: 'dialog-foot' }, done),
  );
  const backdrop = el('div', { class: 'dialog-backdrop' }, dialog);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey);
  renderAvatarPicker(picker, () => chosen, (avatar) => (chosen = avatar), apply);
  document.body.append(backdrop);
  done.focus();
}
