import { el } from '../dom.ts';
import { t } from '../i18n.ts';

export interface ConfirmOptions {
  icon?: string;
  title: string;
  text: string;
  yes: string;
  no?: string;
  /** Metnin altında ek içerik (ör. eklenti sayfası linki). */
  extra?: Node;
}

/** Ortada küçük onay penceresi (Esc, dışarı tıklama ve "Vazgeç" hayır sayılır). */
export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    const yes = el('button', { type: 'button', class: 'btn primary' }, options.yes);
    const no = el('button', { type: 'button', class: 'btn' }, options.no ?? t('cancel'));
    const dialog = el(
      'div',
      { class: 'confirm-dialog card', role: 'dialog', 'aria-modal': 'true', 'aria-label': options.title },
      options.icon ? el('div', { class: 'confirm-icon', 'aria-hidden': 'true' }, options.icon) : '',
      el('h3', {}, options.title),
      el('p', { class: 'muted' }, options.text),
      options.extra ?? '',
      el('div', { class: 'confirm-actions' }, no, yes),
    );
    const backdrop = el('div', { class: 'dialog-backdrop' }, dialog);
    const finish = (value: boolean) => {
      backdrop.remove();
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(false);
    };
    yes.addEventListener('click', () => finish(true));
    no.addEventListener('click', () => finish(false));
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) finish(false);
    });
    document.addEventListener('keydown', onKey);
    document.body.append(backdrop);
    yes.focus();
  });
}
