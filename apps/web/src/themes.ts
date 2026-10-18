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

/** Temanın resimleri (styles.css'teki --scene / --mascot / desen ile aynı adresler). */
function themeImages(id: ThemeId): string[] {
  const urls = [`/themes/${id}-maskot.svg`];
  if (['uzay', 'siber', 'ortacag', 'lokum', 'binbirgece'].includes(id)) urls.push(`/themes/${id}.svg`);
  if (id === 'lokum') urls.push('/themes/lokum-desen.svg');
  return urls;
}

/** Resimleri indirip çözer; en fazla `ms` bekler (yavaş ağda tema değişimi takılmasın). */
function preload(urls: string[], ms: number): Promise<void> {
  const all = Promise.all(
    urls.map((src) => {
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => undefined);
    }),
  ).then(() => undefined);
  return Promise.race([all, new Promise<void>((resolve) => setTimeout(resolve, ms))]);
}

let applying = 0;

/**
 * Temayı uygular. Önce temanın resimleri yüklenir, sonra renkler ve resimler birlikte
 * değişir (yoksa önce yıldızlar, sonra gezegen gelir; tuhaf duruyordu). İlk açılışta
 * beklenmez: renkler hemen gelsin. Arka arkaya tıklanırsa sadece sonuncusu uygulanır.
 */
export function applyTheme(id: ThemeId, { wait = true } = {}): void {
  save('theme', id);
  const ticket = ++applying;
  const set = () => {
    if (ticket !== applying) return;
    document.documentElement.dataset.theme = id;
    window.dispatchEvent(new Event('themechange'));
  };
  if (!wait) {
    set();
    return;
  }
  void preload(themeImages(id), 1500).then(set);
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
