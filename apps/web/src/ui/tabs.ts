export type TabId = 'chat' | 'queue' | 'people' | 'profile' | 'settings';

export function isTabId(x: unknown): x is TabId {
  return x === 'chat' || x === 'queue' || x === 'people' || x === 'profile' || x === 'settings';
}

/**
 * Sağ paneldeki sekmeler. Düğmeler sayfanın herhangi bir yerinde olabilir (👤 Profil sağ üstte).
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

  // Sonradan eklenen düğmeler (sağ üstteki profil) için de: tıklama belgede yakalanır.
  document.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest?.<HTMLElement>('[data-tab]');
    if (!button || !isTabId(button.dataset.tab)) return;
    // Açık sekmenin düğmesine (sağ üstteki profil) tekrar basınca sohbete dönülür.
    show(button.dataset.tab === active && button.dataset.tab === 'profile' ? 'chat' : button.dataset.tab);
  });
  show('chat');

  return {
    show,
    get active(): TabId {
      return active;
    },
  };
}
