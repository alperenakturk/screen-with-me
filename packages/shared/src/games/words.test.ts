import { describe, expect, it } from 'vitest';
import { decodeWords, normalize, wellFormed } from './five-frames.ts';
import * as EN from './words/en.ts';
import * as TR from './words/tr.ts';
import { BLOCKED_EN, BLOCKED_TR } from './words/blocked.ts';

// GMP (owner, 15 Nov 2026): far more words, from open-licensed sources, answers clean and common
// (scripts/words/build-words.py; docs/internal/research/word-game.md "Shipped lists").
describe('word lists', () => {
  it('English: at least 10,000 guesses and 2,000 answers, five letters a–z, every answer a guess', () => {
    const { allowed, answers } = decodeWords(EN.WORDS, EN.ANSWERS);
    expect(allowed.size).toBeGreaterThanOrEqual(10_000);
    expect(answers.length).toBeGreaterThanOrEqual(2_000);
    expect(new Set(answers).size).toBe(answers.length);
    for (const w of allowed) expect(w).toMatch(/^[a-z]{5}$/);
    for (const w of answers) expect(allowed.has(w)).toBe(true);
  });

  it('English: no answer is on the bad-word list or our eye review', () => {
    const blocked = new Set(BLOCKED_EN.split(','));
    expect(blocked.size).toBeGreaterThan(100);
    const { answers } = decodeWords(EN.WORDS, EN.ANSWERS);
    expect(answers.filter((w) => blocked.has(w))).toEqual([]);
  });

  it('Turkish: at least 10,000 guesses and 2,000 answers, five Turkish letters, already in Turkish lower case', () => {
    const { allowed, answers } = decodeWords(TR.WORDS, TR.ANSWERS);
    expect(allowed.size).toBeGreaterThanOrEqual(10_000);
    expect(answers.length).toBeGreaterThanOrEqual(2_000);
    expect(new Set(answers).size).toBe(answers.length);
    for (const w of allowed) {
      expect(wellFormed(w, 'tr')).toBe(true);
      expect(normalize(w, 'tr')).toBe(w);
    }
    for (const w of answers) expect(allowed.has(w)).toBe(true);
    // İ/ı: typed upper case finds the word (KIŞIN -> kışın, İNSAN -> insan).
    expect(allowed.has(normalize('KIŞIN', 'tr'))).toBe(true);
    expect(allowed.has(normalize('İNSAN', 'tr'))).toBe(true);
  });

  it('Turkish: no answer is on the bad-word list or our eye review', () => {
    const blocked = new Set(BLOCKED_TR.split(','));
    expect(blocked.size).toBeGreaterThan(10);
    const { answers } = decodeWords(TR.WORDS, TR.ANSWERS);
    expect(answers.filter((w) => blocked.has(w))).toEqual([]);
  });
});
