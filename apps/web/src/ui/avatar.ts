import { AVATAR_PAGES, AVATAR_TABS, AVATARS_PER_VIEW, avatarPageOf, isDrawnAvatar, type Avatar } from '@swm/shared/protocol';
import { el } from '../dom.ts';
import { t, type I18nKey } from '../i18n.ts';

/** Avatarın görsel hali: çizilmiş avatar resim, hayvan emoji. */
export function avatarNode(avatar: string | undefined, className = 'avatar-pic'): HTMLElement {
  if (isDrawnAvatar(avatar)) {
    return el('span', { class: `${className} drawn` }, el('img', { src: `/avatars/${avatar}.svg`, alt: '', draggable: 'false' }));
  }
  return el('span', { class: className }, avatar ?? '🙂');
}

/**
 * Sayfalı avatar seçici: üstte "Temalı / Hayvanlar / Parodi" sekmeleri, Parodi seçiliyse
 * altında "Film / Dizi / Anime", en altta ızgara. Açılışta seçili avatarın sayfası gösterilir.
 */
export function renderAvatarPicker(
  container: HTMLElement,
  current: () => Avatar,
  onPick: (avatar: Avatar) => void,
  onDouble?: () => void,
): () => void {
  let page = avatarPageOf(current());
  // Bir sayfada 20'den fazla avatar varsa ‹ › ile görünüm değişir (açılışta seçili olanınki).
  let view = Math.max(0, Math.floor((AVATAR_PAGES[page] as readonly string[]).indexOf(current()) / AVATARS_PER_VIEW));
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
            view = 0;
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
          view = 0;
        },
      })), ' sub'));
    }
    const grid = el(
      'div',
      { class: 'avatar-grid', role: 'radiogroup' },
      ...AVATAR_PAGES[page]!.slice(view * AVATARS_PER_VIEW, (view + 1) * AVATARS_PER_VIEW).map((option) => {
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
    const views = Math.ceil(AVATAR_PAGES[page]!.length / AVATARS_PER_VIEW);
    if (views > 1) {
      const pager = el('div', { class: 'avatar-pager' });
      const prev = el('button', { type: 'button', class: 'avatar-tab', 'aria-label': t('avatarMore') }, '‹');
      const next = el('button', { type: 'button', class: 'avatar-tab', 'aria-label': t('avatarMore') }, '›');
      prev.addEventListener('click', () => {
        view = (view - 1 + views) % views;
        draw();
      });
      next.addEventListener('click', () => {
        view = (view + 1) % views;
        draw();
      });
      pager.append(prev, el('span', { class: 'muted small' }, `${view + 1} / ${views}`), next);
      container.replaceChildren(...rows, grid, pager);
      return;
    }
    container.replaceChildren(...rows, grid);
  };
  draw();
  return draw;
}
/**
 * Büyük avatar penceresi: ekranın ortasında, geniş kutucuklarla. Seçince hemen uygulanır;
 * çift tık, "Tamam", Esc ya da dışarı tıklamak kapatır. Odadaki ayarlardan açılır.
 */
export function openAvatarDialog(current: () => Avatar, onPick: (avatar: Avatar) => void): void {
  const picker = el('div', { class: 'avatar-picker huge' });
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
  };
  const closeButton = el('button', { type: 'button', class: 'icon-btn dialog-x', 'aria-label': t('close'), title: t('close') }, '✕');
  closeButton.addEventListener('click', close);
  const done = el('button', { type: 'button', class: 'btn primary' }, t('done'));
  done.addEventListener('click', close);
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
  renderAvatarPicker(picker, current, onPick, close);
  document.body.append(backdrop);
  done.focus();
}
