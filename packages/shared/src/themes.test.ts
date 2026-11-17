import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, FALLBACK_THEME, REMOVED_THEMES, THEME_IDS, resolveTheme } from './themes.ts';

describe('themes', () => {
  it('offers ten themes, Matinee in and Ocean Liner out (card NP1)', () => {
    expect(THEME_IDS).toHaveLength(10);
    expect(THEME_IDS).toContain('matinee');
    expect(THEME_IDS as readonly string[]).not.toContain('gemi');
  });

  it('keeps a saved theme that still exists', () => {
    for (const id of THEME_IDS) expect(resolveTheme(id)).toBe(id);
  });

  it('gives a new visitor Drive-In (card UI4)', () => {
    expect(DEFAULT_THEME).toBe('acikhava');
    expect(resolveTheme(null)).toBe('acikhava');
    expect(resolveTheme(undefined)).toBe('acikhava');
    expect(resolveTheme('')).toBe('acikhava');
  });

  it('falls back to Night for a removed or unknown saved theme', () => {
    for (const id of REMOVED_THEMES) expect(resolveTheme(id)).toBe(FALLBACK_THEME);
    expect(FALLBACK_THEME).toBe('gece');
    expect(resolveTheme(42)).toBe('gece');
    expect(resolveTheme('GECE')).toBe('gece');
  });

  it('never lists a removed theme as offered', () => {
    for (const id of REMOVED_THEMES) expect(THEME_IDS as readonly string[]).not.toContain(id);
  });
});
