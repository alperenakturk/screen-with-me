import { debugHooks, type LabCommand } from './debug-lab.ts';
import { load, save } from './storage.ts';

/**
 * Card FONT1 (Design's docs/internal/design/fonts.md): the site's font, a per-browser setting like the theme. Every
 * choice only sets `data-font` on `<html>`; styles.css maps it to `--font` (text) and `--font-title` (titles). The
 * faces are self-hosted OFL variable fonts (public/fonts, a latin and a latin-ext file each, `unicode-range`), and a
 * browser downloads a face only when a rule uses it, so only the picked font is ever fetched. `device` (the default
 * until the owner picks one) downloads nothing for the text.
 */
export const FONTS = ['device', 'sidelit', 'poster', 'polished', 'readable', 'rounded', 'easy'] as const;
export type FontId = (typeof FONTS)[number];

/** The default until the owner's pick (fonts.md Q1: A = 'sidelit', B = 'poster', C = 'polished', D = 'device'). */
export const DEFAULT_FONT: FontId = 'device';

const isFont = (x: unknown): x is FontId => FONTS.includes(x as FontId);

export function currentFont(): FontId {
  const saved = load('font');
  return isFont(saved) ? saved : DEFAULT_FONT;
}

/** Applies a font at once (no pictures to wait for); `remember: false` only shows it (the Test Lab's cycle). */
export function applyFont(id: FontId, { remember = true } = {}): void {
  if (remember) save('font', id);
  if (id === 'device') delete document.documentElement.dataset.font;
  else document.documentElement.dataset.font = id;
  window.dispatchEvent(new Event('fontchange'));
}

const FONT_NAMES: Record<FontId, { en: string; tr: string }> = {
  device: { en: "the device's font", tr: 'cihazın yazı tipi' },
  sidelit: { en: 'Sidelit (Bricolage + Figtree)', tr: 'Sidelit (Bricolage + Figtree)' },
  poster: { en: 'Poster (Fraunces + Manrope)', tr: 'Afiş (Fraunces + Manrope)' },
  polished: { en: 'Polished (Bricolage + Plus Jakarta Sans)', tr: 'Cilalı (Bricolage + Plus Jakarta Sans)' },
  readable: { en: 'Readable (Atkinson Hyperlegible Next)', tr: 'Okunaklı (Atkinson Hyperlegible Next)' },
  rounded: { en: 'Rounded (Nunito)', tr: 'Yuvarlak (Nunito)' },
  easy: { en: 'Easy reading (Lexend)', tr: 'Kolay okuma (Lexend)' },
};

/**
 * 🐞 Test Lab (card FONT1): "fonts.next" shows the next font on this page only (the saved choice stays, Undo puts it
 * back), "fonts.<id>" one font; the status line names the font shown (the factory runs only while the lab is open).
 */
export function registerFontLab(): void {
  const shownFont = (): FontId => (document.documentElement.dataset.font as FontId | undefined) ?? 'device';
  const show = (id: FontId) => applyFont(id, { remember: false });
  const back = () => show(currentFont());
  debugHooks.register('fonts', () => ({
    commands: [
      {
        id: 'fonts.next',
        title: { en: 'Font: show the next one', tr: 'Yazı tipi: sıradakini göster' },
        help: { en: 'This page only, your saved font stays; run again for the next', tr: 'Yalnızca bu sayfada, kayıtlı yazı tipin değişmez; tekrar çalıştır, bir sonraki gelsin' },
        tab: 'screen',
        run: () => show(FONTS[(FONTS.indexOf(shownFont()) + 1) % FONTS.length]!),
        undo: back,
      },
      ...FONTS.map((id): LabCommand => ({
        id: `fonts.${id}`,
        title: { en: `Font: ${FONT_NAMES[id].en}`, tr: `Yazı tipi: ${FONT_NAMES[id].tr}` },
        help: { en: 'This page only, your saved font stays', tr: 'Yalnızca bu sayfada, kayıtlı yazı tipin değişmez' },
        tab: 'screen',
        run: () => show(id),
        undo: back,
      })),
    ],
    status: () => [[{ en: 'Font shown', tr: 'Gösterilen yazı tipi' }, FONT_NAMES[shownFont()]]],
  }));
}
