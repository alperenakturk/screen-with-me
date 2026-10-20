import { load, save } from '../storage.ts';

export type TabId = 'chat' | 'queue' | 'people' | 'profile' | 'settings';

/** Sağ paneldeki sekmeler. Son açılan sekme tarayıcıda hatırlanır. */
export function createTabs(root: HTMLElement, onChange: (tab: TabId) => void) {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-tab]')];
  const panels = [...root.querySelectorAll<HTMLElement>('[data-panel]')];
  let active: TabId = 'chat';

  function show(tab: TabId): void {
    active = tab;
    save('tab', tab);
    for (const button of buttons) button.setAttribute('aria-selected', String(button.dataset.tab === tab));
    for (const panel of panels) panel.hidden = panel.dataset.panel !== tab;
    onChange(tab);
  }

  for (const button of buttons) button.addEventListener('click', () => show(button.dataset.tab as TabId));
  const saved = load('tab');
  show(saved === 'queue' || saved === 'people' || saved === 'profile' || saved === 'settings' ? saved : 'chat');

  return {
    show,
    get active(): TabId {
      return active;
    },
  };
}
