import { el } from './dom.ts';
import { t, type I18nKey } from './i18n.ts';
import { load, save } from './storage.ts';

/** Hepsi koyu; renkleri styles.css'teki [data-theme] blokları belirler. */
export const THEMES = [
  { id: 'gece', swatch: ['#0f1014', '#7c5cff'] },
  { id: 'okyanus', swatch: ['#07131a', '#22c3e6'] },
  { id: 'gunbatimi', swatch: ['#150c10', '#ff6b4a'] },
  { id: 'neon', swatch: ['#06060b', '#ff2bd6'] },
  { id: 'siyah', swatch: ['#000000', '#e8e8e8'] },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

function isTheme(x: unknown): x is ThemeId {
  return THEMES.some((theme) => theme.id === x);
}

export function currentTheme(): ThemeId {
  const saved = load('theme');
  return isTheme(saved) ? saved : 'gece';
}

export function applyTheme(id: ThemeId): void {
  document.documentElement.dataset.theme = id;
  save('theme', id);
  window.dispatchEvent(new Event('themechange'));
}

/** Tema renk örneklerini bir kutuya çizer; tıklanınca tema değişir. */
export function renderThemePicker(container: HTMLElement): void {
  const draw = () =>
    container.replaceChildren(
      ...THEMES.map((theme) => {
        const button = el(
          'button',
          { type: 'button', class: 'theme-option', role: 'radio', 'aria-checked': String(theme.id === currentTheme()) },
          el('span', { class: 'theme-swatch', style: `background: linear-gradient(135deg, ${theme.swatch[0]} 50%, ${theme.swatch[1]} 50%)` }),
          el('span', {}, t(`theme.${theme.id}` as I18nKey)),
        );
        button.addEventListener('click', () => applyTheme(theme.id));
        return button;
      }),
    );
  draw();
  window.addEventListener('themechange', draw);
  window.addEventListener('langchange', draw);
}
