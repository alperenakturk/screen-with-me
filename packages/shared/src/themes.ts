/**
 * The site's theme ids (styles.css `[data-theme]` blocks, apps/web/src/themes.ts for swatches and pictures). A saved
 * id that is no longer offered falls back to Night (`gece`) so nothing a user saved breaks: 'uzay' and 'siber' (old),
 * 'opera' (0.9.97.38, owner) and 'gemi' Ocean Liner (card NP1, 0.9.97.102, owner's themes pick B).
 */
export const THEME_IDS = [
  'gece', 'matinee', 'okyanus', 'gunbatimi', 'neon',
  'lokum', 'binbirgece', 'sinema', 'acikhava', 'tren',
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = 'gece';

/** Themes that were removed; listed so the fallback is a decision, not an accident. */
export const REMOVED_THEMES = ['uzay', 'siber', 'opera', 'gemi'] as const;

export function isTheme(x: unknown): x is ThemeId {
  return typeof x === 'string' && (THEME_IDS as readonly string[]).includes(x);
}

/** The theme to show for a saved value: the value itself while it exists, otherwise the default. */
export function resolveTheme(saved: unknown): ThemeId {
  return isTheme(saved) ? saved : DEFAULT_THEME;
}
