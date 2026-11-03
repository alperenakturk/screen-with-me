import { el } from '../dom.ts';
import { t, type I18nKey } from '../i18n.ts';

export type SettingsSection = 'view' | 'rules' | 'save' | 'schedule';

export interface MoreItem {
  icon: string;
  label: I18nKey;
  run: () => void;
  /** Dimmed (shown, not pressable) with this reason as its title. */
  dimmed?: string | null;
}

/**
 * The room's "⋯ More" list (card 6, owner's pick C): one place for what used to be spread over the settings dialog,
 * the profile menu and the empty room's card. The computer's top-bar menu and the phone's ⋯ sheet use this same list
 * in the same order.
 */
export function roomMoreItems(deps: {
  openSettings: (section: SettingsSection) => void;
  press: (selector: string) => void;
  /** Opens the games hall (the computer's own anchor under ⋯ More; the phone presses its sheet's 🎮). */
  games: () => void;
  isHost: () => boolean;
  hasItem: () => boolean;
  desktop: boolean;
}): MoreItem[] {
  const items: MoreItem[] = [{ icon: '🎮', label: 'more.games', run: deps.games }];
  if (deps.isHost()) items.push({ icon: '⏰', label: 'more.filmTime', run: () => deps.openSettings('schedule') });
  items.push(
    { icon: '💾', label: 'more.save', run: () => deps.openSettings('save') },
    { icon: '✨', label: 'more.recap', run: () => deps.press('#recap-open') },
  );
  if (deps.desktop) items.push({ icon: '⌨️', label: 'more.shortcuts', run: () => deps.press('#profile-keys') });
  items.push(
    // The sync test replaces what plays for everyone, so only from an empty room.
    { icon: '🧪', label: 'more.syncTest', run: () => deps.press('#sync-test'), dimmed: deps.hasItem() ? t('more.syncTestBusy') : null },
    { icon: '👑', label: 'more.rules', run: () => deps.openSettings('rules') },
  );
  return items;
}

/** The computer's "⋯ More" menu under its top-bar button. */
export function createRoomMoreMenu(button: HTMLButtonElement, items: () => MoreItem[]) {
  const pop = el('div', { class: 'room-more-pop', role: 'menu', hidden: 'hidden' });
  document.body.append(pop);
  const close = () => {
    pop.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    pop.replaceChildren(
      ...items().map((item) => {
        const row = el('button', { type: 'button', class: 'room-more-item', role: 'menuitem' }, el('span', { 'aria-hidden': 'true' }, item.icon), el('span', {}, t(item.label)));
        if (item.dimmed) {
          row.setAttribute('aria-disabled', 'true');
          row.title = item.dimmed;
        }
        row.addEventListener('click', () => {
          if (item.dimmed) return;
          close();
          item.run();
        });
        return row;
      }),
    );
    const r = button.getBoundingClientRect();
    pop.style.top = `${Math.round(r.bottom + 6)}px`;
    pop.style.right = `${Math.max(8, Math.round(innerWidth - r.right))}px`;
    pop.hidden = false;
    button.setAttribute('aria-expanded', 'true');
  };
  button.addEventListener('click', () => (pop.hidden ? open() : close()));
  document.addEventListener('pointerdown', (event) => {
    if (!pop.hidden && !pop.contains(event.target as Node) && !button.contains(event.target as Node)) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !pop.hidden) close();
  });
  return { close };
}
