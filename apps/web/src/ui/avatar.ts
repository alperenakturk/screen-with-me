import { AVATAR_PAGES, isDrawnAvatar, type Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { t, type I18nKey } from '../i18n.ts';

/** Avatarın görsel hali: çizilmiş avatar resim, hayvan emoji. */
export function avatarNode(avatar: string | undefined, className = 'avatar-pic'): HTMLElement {
  if (isDrawnAvatar(avatar)) {
    return el('span', { class: `${className} drawn` }, el('img', { src: `/avatars/${avatar}.svg`, alt: '', draggable: 'false' }));
  }
  return el('span', { class: className }, avatar ?? '🙂');
}

const PAGE_KEYS: I18nKey[] = ['avatarPage.theme', 'avatarPage.animals', 'avatarPage.parody'];

/**
 * Sayfalı avatar seçici: üstte "Temalı / Hayvanlar / Parodi" sekmeleri, altında ızgara.
 * Açılışta seçili avatarın sayfası gösterilir.
 */
export function renderAvatarPicker(
  container: HTMLElement,
  current: () => Avatar,
  onPick: (avatar: Avatar) => void,
  onDouble?: () => void,
): () => void {
  let page = Math.max(0, AVATAR_PAGES.findIndex((p) => (p as readonly string[]).includes(current())));
  const draw = () => {
    const tabs = el(
      'div',
      { class: 'avatar-tabs', role: 'tablist' },
      ...PAGE_KEYS.map((key, i) => {
        const tab = el('button', { type: 'button', class: 'avatar-tab', role: 'tab', 'aria-selected': String(i === page) }, t(key));
        tab.addEventListener('click', () => {
          page = i;
          draw();
        });
        return tab;
      }),
    );
    const grid = el(
      'div',
      { class: 'avatar-grid', role: 'radiogroup' },
      ...AVATAR_PAGES[page]!.map((option) => {
        const label = isDrawnAvatar(option) ? t(`avatar.${option}` as I18nKey) : option;
        const button = el(
          'button',
          { type: 'button', class: 'avatar-option', role: 'radio', 'aria-checked': String(option === current()), title: label, 'aria-label': label },
          avatarNode(option, 'avatar-glyph'),
        );
        button.addEventListener('click', () => {
          onPick(option);
          draw();
        });
        if (onDouble) button.addEventListener('dblclick', onDouble);
        return button;
      }),
    );
    container.replaceChildren(tabs, grid);
  };
  draw();
  return draw;
}
