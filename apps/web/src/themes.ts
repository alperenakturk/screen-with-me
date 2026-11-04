import { isPhone } from './device.ts';
import { el } from './dom.ts';
import { t, type I18nKey } from './i18n.ts';
import { load, save } from './storage.ts';

/**
 * Hepsi koyu; renkleri ve çizimli arka planları styles.css'teki [data-theme]
 * blokları belirler. Neon'dan sonrakiler resimli ve maskotlu (public/themes/*.svg).
 * Kaldırılan bir temayı seçmiş olan (eski 'uzay', 'siber'; 'opera' since 0.9.97.34, owner) currentTheme'de 'gece'ye düşer.
 */
export const THEMES = [
  { id: 'gece', swatch: ['#141936', '#8b6cff'] },
  { id: 'okyanus', swatch: ['#0b2a45', '#2ec5e8'] },
  { id: 'gunbatimi', swatch: ['#3a1530', '#ff7a4d'] },
  { id: 'neon', swatch: ['#050508', '#ff2bd6'] },
  { id: 'lokum', swatch: ['#18224a', '#e0a84a'] },
  { id: 'binbirgece', swatch: ['#141236', '#e8c27a'] },
  { id: 'sinema', swatch: ['#0d1020', '#e9b949'] },
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

/**
 * The plain themes (colors and a soft glow, no drawn scene). A phone offers only these (0.9.91.5, owner: the scenes
 * don't fit a phone screen); tablets and computers keep all. A scene theme chosen on a computer stays saved (the
 * settings are shared with the extension) and shows as Gece on a phone.
 */
const PLAIN_THEMES: readonly ThemeId[] = ['gece', 'okyanus', 'gunbatimi', 'neon'];
const offered = () => (isPhone() ? THEMES.filter((theme) => PLAIN_THEMES.includes(theme.id)) : THEMES);
/** The theme this screen shows for a choice. */
function shown(id: ThemeId): ThemeId {
  return isPhone() && !PLAIN_THEMES.includes(id) ? 'gece' : id;
}

/** Sahnesi (public/themes/<tema>.svg) olan temalar; diğerlerinin sadece maskotu var. */
const SCENE_THEMES: readonly ThemeId[] = [
  'lokum', 'binbirgece',
  'sinema', 'acikhava', 'gemi', 'tren',
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
    document.documentElement.dataset.theme = shown(id);
    window.dispatchEvent(new Event('themechange'));
  };
  if (!wait) {
    set();
    return;
  }
  void preload(themeImages(shown(id)), 1500).then(set);
}

/**
 * Ana sayfanın üstündeki tema şeridi: her tema küçük maskotu ve adıyla; tıklayınca hemen
 * uygulanır (kullanıcı odaya girmeden deneyebilsin). Dar ekranda yana kayar.
 */
export function renderThemeStrip(container: HTMLElement, { all = false } = {}): void {
  // Dar bir şeritte hepsi yana kayan uzun bir sıra yapıyordu: orada seçili tema + rastgele birkaç tema (çoğu
  // resimli). Ana sayfanın tema bölümünde (`all`) hepsi, sarılarak.
  const now = shown(currentTheme());
  const others = offered()
    .filter((theme) => theme.id !== now)
    .map((theme) => ({ theme, key: Math.random() + (SCENE_THEMES.includes(theme.id) ? 0 : 0.6) }))
    .sort((a, b) => a.key - b.key)
    .slice(0, STRIP_COUNT - 1)
    .map((x) => x.theme);
  const list = all ? offered() : offered().filter((theme) => theme.id === now || others.includes(theme));
  const draw = () =>
    container.replaceChildren(
      ...(all ? [] : [el('span', { class: 'theme-strip-label' }, t('settings.theme'))]),
      ...list.map((theme) => {
        const button = el(
          'button',
          {
            type: 'button',
            class: 'theme-chip',
            role: 'radio',
            'aria-checked': String(theme.id === shown(currentTheme())),
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
      ...offered().map((theme) => {
        const button = el(
          'button',
          { type: 'button', class: 'theme-option', role: 'radio', 'aria-checked': String(theme.id === shown(currentTheme())) },
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
  warmThemePreviews();
  const grid = el('div', { class: 'theme-cards', role: 'radiogroup' });
  const draw = () =>
    grid.replaceChildren(
      ...offered().map((theme) => {
        const scene = SCENE_THEMES.includes(theme.id) ? `url('/themes/${theme.id}.svg') center bottom / cover no-repeat, ` : '';
        const preview = el(
          'span',
          { class: 'theme-preview', style: `background: ${scene}linear-gradient(160deg, ${theme.swatch[0]} 55%, ${theme.swatch[1]})` },
          el('img', { src: `/themes/${theme.id}-maskot.svg`, alt: '' }),
        );
        const card = el(
          'button',
          { type: 'button', class: 'theme-card', role: 'radio', 'aria-checked': String(theme.id === shown(currentTheme())), style: `--chip-b: ${theme.swatch[1]}` },
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

let previewsWarm = false;
/**
 * Card R8: fetches every offered theme's preview pictures (mascot + scene) once, so the theme window shows them at
 * once. Called when the "Change theme" button is hovered / focused / pressed, and when the window opens.
 */
export function warmThemePreviews(): void {
  if (previewsWarm) return;
  previewsWarm = true;
  void preload(offered().flatMap((theme) => themeImages(theme.id)), 10_000);
}

/** Ayarlarda: şu anki tema küçük önizlemeyle + "Temayı değiştir" (büyük pencere açar). */
export function renderThemeSetting(container: HTMLElement): void {
  const draw = () => {
    const theme = THEMES.find((x) => x.id === shown(currentTheme())) ?? THEMES[0];
    const button = el('button', { type: 'button', class: 'btn' }, t('changeTheme'));
    button.addEventListener('click', openThemeDialog);
    for (const type of ['pointerenter', 'focus', 'pointerdown'] as const) button.addEventListener(type, warmThemePreviews, { once: true });
    container.replaceChildren(
      el('span', { class: 'theme-now' }, el('img', { src: `/themes/${theme.id}-maskot.svg`, alt: '' }), el('b', {}, t(`theme.${theme.id}` as I18nKey))),
      button,
    );
  };
  draw();
  window.addEventListener('themechange', draw);
  window.addEventListener('langchange', draw);
  // The profile menu holding this row opened: fetch the previews now (card R8).
  if ('IntersectionObserver' in window) {
    const seen = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      seen.disconnect();
      warmThemePreviews();
    });
    seen.observe(container);
  }
}
