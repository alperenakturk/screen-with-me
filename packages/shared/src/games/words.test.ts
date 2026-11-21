import { describe, expect, it } from 'vitest';
import { CATEGORY_IDS, LEVELS, decodeCategories, decodeWords, levelWords, normalize, wellFormed } from './five-frames.ts';
import * as EN from './words/en.ts';
import * as TR from './words/tr.ts';
import { BLOCKED_EN, BLOCKED_TR } from './words/blocked.ts';

// GMP (owner, 15 Nov 2026): far more words, from open-licensed sources, answers clean and common
// (scripts/words/build-words.py; docs/internal/research/word-game.md "Shipped lists"). FW1 (19 Nov 2026): real words
// only (a guess must be in use, so the lists got shorter: about 7,700 each), plus the category lists.
// `python3 scripts/words/build-words.py --check` checks the lists against their sources; this checks the shipped shape.
describe('word lists', () => {
  it('English: at least 7,000 guesses and 2,000 answers, five letters a–z, every answer a guess', () => {
    const { allowed, answers } = decodeWords(EN.WORDS, EN.ANSWERS);
    expect(allowed.size).toBeGreaterThanOrEqual(7_000);
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

  it('Turkish: at least 7,000 guesses and 2,000 answers, five Turkish letters, already in Turkish lower case', () => {
    const { allowed, answers } = decodeWords(TR.WORDS, TR.ANSWERS);
    expect(allowed.size).toBeGreaterThanOrEqual(7_000);
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

  it('English: odd dictionary-only words are no longer guesses (FW1)', () => {
    const { allowed } = decodeWords(EN.WORDS, EN.ANSWERS);
    const odd = 'aahed aalii agamy almud apods attap balus binal boyau cabob coxae dinic eskar feals geums gyred koppa maneh oints yrapt zooea';
    expect(odd.split(' ').filter((w) => allowed.has(w))).toEqual([]);
    const real = 'house water bread music laugh happy cloud';
    expect(real.split(' ').filter((w) => !allowed.has(w))).toEqual([]);
  });

  it('Turkish: odd generated forms are no longer guesses (FW1)', () => {
    const { allowed } = decodeWords(TR.WORDS, TR.ANSWERS);
    const odd = 'abaca addol ahcar akont alpçı anığa badat bavcı bejde cetçi cupum damcı defçe fekki finon gaşye';
    expect(odd.split(' ').filter((w) => allowed.has(w))).toEqual([]);
  });

  for (const [lang, mod] of [['en', EN], ['tr', TR]] as const) {
    it(`${lang}: every category has three weeks of words, five letters of the alphabet, no repeats (FW1)`, () => {
      const cats = decodeCategories(mod.CATEGORIES);
      expect(Object.keys(mod.CATEGORIES).sort()).toEqual([...CATEGORY_IDS].sort());
      for (const cat of CATEGORY_IDS) {
        const words = cats[cat];
        expect(words.length, cat).toBeGreaterThanOrEqual(21);
        expect(new Set(words).size, cat).toBe(words.length);
        for (const w of words) {
          expect(wellFormed(w, lang), `${cat}: ${w}`).toBe(true);
          expect(normalize(w, lang)).toBe(w);
        }
      }
      // Packed text is whole words only (a stray letter would shift every word after it).
      for (const cat of CATEGORY_IDS) expect(Array.from(mod.CATEGORIES[cat]!).length % 5, cat).toBe(0);
    });
  }

  // The Turkish forms are made by scripts/words/build-words.py from Zemberek's lemmas and their marks: a hand-written
  // sample checks vowel harmony (evler, not evlar), voicing (ağacı), dropped vowels (burnu, ağzım), doubling (hakkı) and
  // d/t after a hard consonant (kapta, dalda), and that the wrong shapes are not accepted.
  it('Turkish: generated forms follow harmony and sound changes (hand-checked sample)', () => {
    const { allowed } = decodeWords(TR.WORDS, TR.ANSWERS);
    const right = 'evler ağacı burnu ağzım hakkı kolum gözün eller dalda kapta saati saate oğlum geldi okudu kızlı yazdı saçlı dağda gönlü sütlü yüzde';
    const wrong = 'evlar ağaçı hakı kızler dağta kapda gelde okıdu saata dalde ellar gözin oğlım sütla';
    expect(right.split(' ').filter((w) => !allowed.has(w))).toEqual([]);
    expect(wrong.split(' ').filter((w) => allowed.has(w))).toEqual([]);
  });
});

describe('word list levels (FW2)', () => {
  for (const [lang, mod] of [['en', EN], ['tr', TR]] as const) {
    it(`${lang}: a band per answer and per category word; every level big enough`, () => {
      const { answers } = decodeWords(mod.WORDS, mod.ANSWERS);
      expect(mod.BANDS).toMatch(/^[123]+$/);
      expect(mod.BANDS.length).toBe(answers.length);
      const sizes = Object.fromEntries(LEVELS.map((l) => [l, levelWords(answers, mod.BANDS, l).length]));
      // A year of daily words at least, Easy and Hard each without the other's words.
      for (const l of LEVELS) expect(sizes[l]).toBeGreaterThanOrEqual(365);
      expect(levelWords(answers, mod.BANDS, 'easy').some((w) => levelWords(answers, mod.BANDS, 'hard').includes(w))).toBe(false);
      const cats = decodeCategories(mod.CATEGORIES);
      for (const cat of CATEGORY_IDS) {
        expect(mod.CATEGORY_BANDS[cat]!.length).toBe(cats[cat].length);
        expect(levelWords(cats[cat], mod.CATEGORY_BANDS[cat], 'easy').length).toBeGreaterThanOrEqual(10);
      }
    });
  }
});
