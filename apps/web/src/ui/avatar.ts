import { AVATAR_PAGES, AVATAR_TABS, isDrawnAvatar, type Avatar } from '@swm/shared/protocol';
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
 * Sayfalı avatar seçici: üstte "Temalı / Parodi" sekmeleri, Parodi seçiliyse
 * altında "Film / Dizi / Anime / Oyun", en altta ızgara.
 */
export function renderAvatarPicker(
  container: HTMLElement,
  current: () => Avatar,
  onPick: (avatar: Avatar) => void,
  onDouble?: () => void,
): () => void {
  // Hep "Temalı" ile açılır; kullanıcı isterse diğer sekmelere geçer.
  let page = 0;
  const tabRow = (items: Array<{ label: string; selected: boolean; go: () => void }>, extra = '') =>
    el(
      'div',
      { class: `avatar-tabs${extra}`, role: 'tablist' },
      ...items.map((item) => {
        const tab = el('button', { type: 'button', class: 'avatar-tab', role: 'tab', 'aria-selected': String(item.selected) }, item.label);
        tab.addEventListener('click', () => {
          item.go();
          draw();
        });
        return tab;
      }),
    );
  const draw = () => {
    const active = AVATAR_TABS.find((tab) => (tab.pages as readonly number[]).includes(page)) ?? AVATAR_TABS[0];
    const rows = [
      tabRow(AVATAR_TABS.map((tab) => ({
        label: t(`avatarPage.${tab.key}` as I18nKey),
        selected: tab === active,
        // Aynı sekmeye tekrar basınca alt sayfa korunur; başka sekmeye geçince ilk sayfası
        go: () => {
          if (tab !== active) {
            page = tab.pages[0];
          }
        },
      }))),
    ];
    if ('subs' in active) {
      rows.push(tabRow(active.subs.map((sub, i) => ({
        label: t(`avatarPage.${sub}` as I18nKey),
        selected: active.pages[i] === page,
        go: () => {
          page = active.pages[i]!;
        },
      })), ' sub'));
    }
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
    container.replaceChildren(...rows, grid);
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
