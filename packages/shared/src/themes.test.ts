import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, REMOVED_THEMES, THEME_IDS, resolveTheme } from './themes.ts';

describe('themes', () => {
  it('offers ten themes, Matinee in and Ocean Liner out (card NP1)', () => {
    expect(THEME_IDS).toHaveLength(10);
    expect(THEME_IDS).toContain('matinee');
    expect(THEME_IDS as readonly string[]).not.toContain('gemi');
  });

  it('keeps a saved theme that still exists', () => {
    for (const id of THEME_IDS) expect(resolveTheme(id)).toBe(id);
  });

  it('falls back to Night for a removed or unknown theme', () => {
    for (const id of REMOVED_THEMES) expect(resolveTheme(id)).toBe(DEFAULT_THEME);
    expect(resolveTheme(null)).toBe('gece');
    expect(resolveTheme(undefined)).toBe('gece');
    expect(resolveTheme('')).toBe('gece');
    expect(resolveTheme(42)).toBe('gece');
    expect(resolveTheme('GECE')).toBe('gece');
  });

  it('never lists a removed theme as offered', () => {
    for (const id of REMOVED_THEMES) expect(THEME_IDS as readonly string[]).not.toContain(id);
  });
});
