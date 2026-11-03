export type TabId = 'chat' | 'queue' | 'people';

export function isTabId(x: unknown): x is TabId {
  return x === 'chat' || x === 'queue' || x === 'people';
}

/**
 * Sağ paneldeki sekmeler: Sohbet, Sıra, Kişiler. 👤 Profil sağ üstte açılan menü (room.ts `profile-pop`), ⚙️ Ayarlar
 * ekranın ortasında pencere (`settings-dialog.ts`).
 */
export function createTabs(root: HTMLElement, onChange: (tab: TabId, chatShown: boolean) => void, split: () => boolean = () => false) {
  const panels = [...root.querySelectorAll<HTMLElement>('[data-panel]')];
  let active: TabId = 'chat';
  /** Split (upright tablet, card T): the chat is its own column and always shown; the tabs choose Queue or People. */
  let sideTab: TabId = 'queue';

  function show(tab: TabId): void {
    active = tab;
    const both = split();
    if (tab !== 'chat') sideTab = tab;
    const lit = both && tab === 'chat' ? sideTab : tab;
    for (const button of document.querySelectorAll<HTMLElement>('[data-tab]')) button.setAttribute('aria-selected', String(button.dataset.tab === lit));
    for (const panel of panels) panel.hidden = both ? panel.dataset.panel !== 'chat' && panel.dataset.panel !== sideTab : panel.dataset.panel !== tab;
    onChange(tab, both || tab === 'chat');
  }

  root.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest?.<HTMLElement>('[data-tab]');
    if (button && isTabId(button.dataset.tab)) show(button.dataset.tab);
  });
  show('chat');

  return {
    show,
    get active(): TabId {
      return active;
    },
    /** Is the chat on screen (its tab, or the upright tablet's own chat column)? */
    get chatShown(): boolean {
      return active === 'chat' || split();
    },
    /** Lays the panels out again (the window entered or left the split layout). */
    refresh(): void {
      show(active);
    },
  };
}
