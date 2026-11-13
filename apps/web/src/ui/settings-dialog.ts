import { t, type I18nKey } from '../i18n.ts';

/** `save` is the old name of the room's section (its save form now sits in "Room"). */
export type SettingsSection = 'me' | 'view' | 'room' | 'rules' | 'schedule' | 'sound' | 'about' | 'save';
type Section = Exclude<SettingsSection, 'save'>;

const TITLES: Record<Section, I18nKey> = {
  me: 'settings.secMe',
  view: 'settings.secView',
  room: 'settings.secRoom',
  rules: 'settings.secRules',
  schedule: 'settings.secSchedule',
  sound: 'settings.secSound',
  about: 'settings.secAbout',
};

/**
 * The settings window (⚙️): centred, its categories in a list on the left (a row of chips on a phone), the same order
 * everywhere (card SIMP1): Me · My screen · Room · Room rules · Film time (host only) · Sound & camera · About. The
 * switches themselves are wired in room.ts; this only opens, closes and moves between categories. The window always
 * stays in the page (hidden): on the film page an open one closes the hole (`.dialog-backdrop:not([hidden])`).
 * `onShow` runs when a category is shown (the Room and About categories fill in their facts then).
 */
export function createSettingsDialog(root: HTMLElement, isHost: () => boolean, onShow: (section: Section) => void = () => {}) {
  const backdrop = root.querySelector<HTMLElement>('#settings-dialog')!;
  const title = backdrop.querySelector<HTMLElement>('#settings-title')!;
  const close = backdrop.querySelector<HTMLButtonElement>('#settings-close')!;
  const navButtons = [...backdrop.querySelectorAll<HTMLButtonElement>('.settings-nav [data-sec]')];
  const sections = [...backdrop.querySelectorAll<HTMLElement>('.settings-sec')];
  let active: Section = 'view';
  let opener: HTMLElement | null = null;
  /** PH1: the categories are lent to the phone's Me tab; there they all show at once (Film time for the host only). */
  let inPage = false;
  let redirect: ((section: SettingsSection) => boolean) | null = null;

  function show(asked: SettingsSection): void {
    if (inPage) {
      for (const sec of sections) {
        sec.hidden = sec.dataset.sec === 'schedule' && !isHost();
        if (!sec.hidden) onShow(sec.dataset.sec as Section);
      }
      return;
    }
    let section: Section = asked === 'save' ? 'room' : asked;
    // Film time is the host's only.
    if (section === 'schedule' && !isHost()) section = 'rules';
    active = section;
    title.textContent = t(TITLES[section]);
    for (const button of navButtons) button.setAttribute('aria-current', String(button.dataset.sec === section));
    for (const sec of sections) sec.hidden = sec.dataset.sec !== section;
    onShow(section);
  }

  function render(): void {
    const host = isHost();
    backdrop.classList.toggle('is-host', host);
    for (const button of navButtons) if (button.classList.contains('host-only')) button.hidden = !host;
    show(active);
  }

  /** Opens at a category (⚙️: My screen; "⋯ More" items: theirs), the list of categories always beside it. */
  function open(section?: SettingsSection): void {
    if (redirect?.(section ?? 'view')) return;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    backdrop.hidden = false;
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

  return {
    open,
    close: hide,
    render,
    /** The categories, for the phone's Me tab (PH1). */
    sections: () => sections,
    /** PH1: on while the Me tab holds the categories (all shown), off when they go back into the window. */
    setInPage(on: boolean): void {
      inPage = on;
      if (on) backdrop.classList.toggle('is-host', isHost());
      show(active);
    },
    /** PH1: `open` asks this first; true means it was shown elsewhere (the phone's Me tab). */
    setRedirect(fn: (section: SettingsSection) => boolean): void {
      redirect = fn;
    },
  };
}
