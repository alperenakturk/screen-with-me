import { t, type I18nKey } from '../i18n.ts';

type Section = 'view' | 'rules' | 'save' | 'schedule';

const TITLES: Record<Section, I18nKey> = {
  view: 'settings.secView',
  rules: 'settings.secRules',
  save: 'settings.secSave',
  schedule: 'settings.secSchedule',
};

/**
 * Ayarlar penceresi (⚙️): sağ panelde sekme değil, ekranın ortasında solda bölümleri olan pencere (avatar seçici
 * gibi). Bölümler: Ekranım (sadece bende), Oda kuralları (yöneticiye anahtarlar, diğerlerine özet), Odayı kaydet,
 * Planlı başlangıç (sadece yönetici). Anahtarların kendisi room.ts'te bağlanır; burası sadece açar/kapar ve gezinir.
 * Pencere hep sayfada durur (gizli): kabukta açıkken delik kapanır (`.dialog-backdrop:not([hidden])`).
 */
export function createSettingsDialog(root: HTMLElement, isHost: () => boolean) {
  const backdrop = root.querySelector<HTMLElement>('#settings-dialog')!;
  const title = backdrop.querySelector<HTMLElement>('#settings-title')!;
  const close = backdrop.querySelector<HTMLButtonElement>('#settings-close')!;
  const navButtons = [...backdrop.querySelectorAll<HTMLButtonElement>('.settings-nav [data-sec]')];
  const sections = [...backdrop.querySelectorAll<HTMLElement>('.settings-sec')];
  let active: Section = 'view';
  let opener: HTMLElement | null = null;

  function show(section: Section): void {
    // Planlı başlangıç sadece yöneticiye.
    if (section === 'schedule' && !isHost()) section = 'rules';
    active = section;
    title.textContent = t(TITLES[section]);
    for (const button of navButtons) button.setAttribute('aria-current', String(button.dataset.sec === section));
    for (const sec of sections) sec.hidden = sec.dataset.sec !== section;
  }

  function render(): void {
    const host = isHost();
    backdrop.classList.toggle('is-host', host);
    for (const button of navButtons) if (button.classList.contains('host-only')) button.hidden = !host;
    show(active);
  }

  /**
   * `solo` (card 6, owner's pick C): only that section, no list of sections beside it. ⚙️ opens "My screen" so; the
   * room's other sections open from "⋯ More".
   */
  function open(section?: Section, solo = false): void {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    backdrop.hidden = false;
    backdrop.classList.toggle('solo', solo);
    render();
    if (section) show(section);
    close.focus();
  }

  function hide(): void {
    if (backdrop.hidden) return;
    backdrop.hidden = true;
    opener?.focus?.();
  }

  for (const button of navButtons) button.addEventListener('click', () => show(button.dataset.sec as Section));
  close.addEventListener('click', hide);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) hide();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !backdrop.hidden) hide();
  });
  addEventListener('langchange', () => (title.textContent = t(TITLES[active])));
  show('view');

  return { open, close: hide, render };
}
