import { el } from './dom.ts';
import { t, type I18nKey } from './i18n.ts';
import { load, save } from './storage.ts';

/**
 * Hepsi koyu; renkleri ve çizimli arka planları styles.css'teki [data-theme]
 * blokları belirler. Uzaydan sonrakiler resimli ve maskotlu (public/themes/*.svg).
 */
export const THEMES = [
  { id: 'gece', swatch: ['#141936', '#8b6cff'] },
  { id: 'okyanus', swatch: ['#0b2a45', '#2ec5e8'] },
  { id: 'gunbatimi', swatch: ['#3a1530', '#ff7a4d'] },
  { id: 'neon', swatch: ['#050508', '#ff2bd6'] },
  { id: 'uzay', swatch: ['#1a1450', '#8ec5ff'] },
  { id: 'siber', swatch: ['#0b0418', '#ff2a6d'] },
  { id: 'ortacag', swatch: ['#1a1430', '#d6a843'] },
  { id: 'lokum', swatch: ['#2a0e1e', '#f08cae'] },
  { id: 'binbirgece', swatch: ['#141236', '#e8c27a'] },
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

/**
 * Ana sayfanın üstündeki tema şeridi: her tema küçük maskotu ve adıyla; tıklayınca hemen
 * uygulanır (kullanıcı odaya girmeden deneyebilsin). Dar ekranda yana kayar.
 */
export function renderThemeStrip(container: HTMLElement): void {
  const draw = () =>
    container.replaceChildren(
      el('span', { class: 'theme-strip-label' }, t('settings.theme')),
      ...THEMES.map((theme) => {
        const button = el(
          'button',
          {
            type: 'button',
            class: 'theme-chip',
            role: 'radio',
            'aria-checked': String(theme.id === currentTheme()),
            style: `--chip-a: ${theme.swatch[0]}; --chip-b: ${theme.swatch[1]}`,
          },
          el('img', { src: `/themes/${theme.id}-maskot.svg`, alt: '', loading: 'lazy' }),
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
