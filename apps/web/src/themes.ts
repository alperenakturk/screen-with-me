import { el } from './dom.ts';
import { t, type I18nKey } from './i18n.ts';
import { load, save } from './storage.ts';

/**
 * Hepsi koyu; renkleri ve çizimli arka planları styles.css'teki [data-theme]
 * blokları belirler. Neon'dan sonrakiler resimli ve maskotlu (public/themes/*.svg).
 * Kaldırılan bir temayı seçmiş olan (eski 'uzay', 'siber') currentTheme'de 'gece'ye düşer.
 */
export const THEMES = [
  { id: 'gece', swatch: ['#141936', '#8b6cff'] },
  { id: 'okyanus', swatch: ['#0b2a45', '#2ec5e8'] },
  { id: 'gunbatimi', swatch: ['#3a1530', '#ff7a4d'] },
  { id: 'neon', swatch: ['#050508', '#ff2bd6'] },
  { id: 'lokum', swatch: ['#2a0e1e', '#f08cae'] },
  { id: 'binbirgece', swatch: ['#141236', '#e8c27a'] },
  { id: 'sinema', swatch: ['#0d1020', '#e9b949'] },
  { id: 'opera', swatch: ['#0f3638', '#e8708a'] },
  { id: 'acikhava', swatch: ['#1a1340', '#ff8a6b'] },
  { id: 'gemi', swatch: ['#24425e', '#ec6a5a'] },
  { id: 'tren', swatch: ['#0e1428', '#6fd6a8'] },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

function isTheme(x: unknown): x is ThemeId {
  return THEMES.some((theme) => theme.id === x);
}

export function currentTheme(): ThemeId {
  const saved = load('theme');
  return isTheme(saved) ? saved : 'gece';
}

/** Sahnesi (public/themes/<tema>.svg) olan temalar; diğerlerinin sadece maskotu var. */
const SCENE_THEMES: readonly ThemeId[] = [
  'lokum', 'binbirgece',
  'sinema', 'opera', 'acikhava', 'gemi', 'tren',
];

/** Ana sayfa şeridinde kaç tema görünsün (kaydırma çubuğu çıkmasın). */
const STRIP_COUNT = 6;

/** Temanın resimleri (styles.css'teki --scene / --mascot / desen ile aynı adresler). */
function themeImages(id: ThemeId): string[] {
  const urls = [`/themes/${id}-maskot.svg`];
  if (SCENE_THEMES.includes(id)) urls.push(`/themes/${id}.svg`);
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
  // Hepsini göstermek yana kayan uzun bir şerit yapıyordu: her açılışta seçili tema + rastgele
  // birkaç tema (çoğu resimli). Tamamı odada ve üstteki 🎨 menüsünde seçilebilir.
  const others = THEMES.filter((theme) => theme.id !== currentTheme())
    .map((theme) => ({ theme, key: Math.random() + (SCENE_THEMES.includes(theme.id) ? 0 : 0.6) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, STRIP_COUNT - 1)
    .map((x) => x.theme);
  const shown = THEMES.filter((theme) => theme.id === currentTheme() || others.includes(theme));
  const draw = () =>
    container.replaceChildren(
      el('span', { class: 'theme-strip-label' }, t('settings.theme')),
      ...shown.map((theme) => {
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

/**
 * Büyük tema penceresi: her tema bir önizleme kartı (sahnesi, renkleri ve maskotu). Karta
 * basınca tema hemen arkada uygulanır (canlı önizleme); "Tamam", Esc ya da dışarısı kapatır.
 */
export function openThemeDialog(): void {
  const grid = el('div', { class: 'theme-cards', role: 'radiogroup' });
  const draw = () =>
    grid.replaceChildren(
      ...THEMES.map((theme) => {
        const scene = SCENE_THEMES.includes(theme.id) ? `url('/themes/${theme.id}.svg') center bottom / cover no-repeat, ` : '';
        const preview = el(
          'span',
          { class: 'theme-preview', style: `background: ${scene}linear-gradient(160deg, ${theme.swatch[0]} 55%, ${theme.swatch[1]})` },
          el('img', { src: `/themes/${theme.id}-maskot.svg`, alt: '', loading: 'lazy' }),
        );
        const card = el(
          'button',
          { type: 'button', class: 'theme-card', role: 'radio', 'aria-checked': String(theme.id === currentTheme()), style: `--chip-b: ${theme.swatch[1]}` },
          preview,
          el('span', { class: 'theme-card-name' }, t(`theme.${theme.id}` as I18nKey)),
        );
        card.addEventListener('click', () => applyTheme(theme.id));
        return card;
      }),
    );
  draw();
  window.addEventListener('themechange', draw);
  const close = () => {
    backdrop.remove();
    window.removeEventListener('themechange', draw);
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
  };
  const x = el('button', { type: 'button', class: 'icon-btn dialog-x', title: t('close'), 'aria-label': t('close') }, '✕');
  x.addEventListener('click', close);
  const done = el('button', { type: 'button', class: 'btn primary' }, t('done'));
  done.addEventListener('click', close);
  const dialog = el(
    'div',
    { class: 'avatar-dialog theme-dialog card', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('settings.theme') },
    el('div', { class: 'dialog-head' }, el('h3', {}, t('pickTheme')), x),
    grid,
    el('div', { class: 'dialog-foot' }, done),
  );
  const backdrop = el('div', { class: 'dialog-backdrop' }, dialog);
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener('keydown', onKey);
  document.body.append(backdrop);
  done.focus();
}

/** Ayarlarda: şu anki tema küçük önizlemeyle + "Temayı değiştir" (büyük pencere açar). */
export function renderThemeSetting(container: HTMLElement): void {
  const draw = () => {
    const theme = THEMES.find((x) => x.id === currentTheme()) ?? THEMES[0];
    const button = el('button', { type: 'button', class: 'btn' }, t('changeTheme'));
    button.addEventListener('click', openThemeDialog);
    container.replaceChildren(
      el('span', { class: 'theme-now' }, el('img', { src: `/themes/${theme.id}-maskot.svg`, alt: '' }), el('b', {}, t(`theme.${theme.id}` as I18nKey))),
      button,
    );
  };
  draw();
  window.addEventListener('themechange', draw);
  window.addEventListener('langchange', draw);
}
