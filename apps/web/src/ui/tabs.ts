export type TabId = 'chat' | 'queue' | 'people' | 'settings';

export function isTabId(x: unknown): x is TabId {
  return x === 'chat' || x === 'queue' || x === 'people' || x === 'settings';
}

/**
 * Sağ paneldeki sekmeler (👤 Profil sekme değil: sağ üstte açılan menü, bkz. room.ts `profile-pop`).
 * Hangi sekmeyle açılacağına oda karar verir (yönetici Ayarlar, diğerleri Sohbet).
 */
export function createTabs(root: HTMLElement, onChange: (tab: TabId) => void) {
  const panels = [...root.querySelectorAll<HTMLElement>('[data-panel]')];
  let active: TabId = 'chat';

  function show(tab: TabId): void {
    active = tab;
    for (const button of document.querySelectorAll<HTMLElement>('[data-tab]')) button.setAttribute('aria-selected', String(button.dataset.tab === tab));
    for (const panel of panels) panel.hidden = panel.dataset.panel !== tab;
    onChange(tab);
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
  };
}
