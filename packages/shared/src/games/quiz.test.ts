import { describe, expect, it } from 'vitest';
import { doubledAfter, QUIZ_DOUBLE_GRACE_MS, QUIZ_LEVELS, levelDifficulty, QUIZ_PROTOCOL_VERSION, QUIZ_QUESTIONS, QUIZ_TYPED_MAX, SEEN_CHARS, decodeSeen, encodeSeen, fiftyFifty, foldAnswer, matchTyped, parseQuizMessage, quizLevelBonus,  roundWinners, tournamentOrder, typedHint, QUIZ_OFFER, QUIZ_ROUND_QUESTIONS } from './quiz.ts';
import { QUIZ_BANK, QUIZ_CATEGORIES } from './quiz-questions.ts';
import { pickQuestions, quizOffer, quizPool } from './quiz-pick.ts';

describe('Quiz', () => {
  it('question bank: lots of questions, every category, four different options, no duplicates', () => {
    for (const lang of ['tr', 'en'] as const) {
      const pool = quizPool(lang);
      expect(pool.length).toBeGreaterThanOrEqual(380);
      const texts = pool.map((id) => QUIZ_BANK[id]![lang]!.q);
      expect(new Set(texts).size).toBe(texts.length);
      for (const category of QUIZ_CATEGORIES) expect(quizPool(lang, category).length).toBeGreaterThanOrEqual(20);
    }
    for (const entry of QUIZ_BANK) {
      expect(entry.tr ?? entry.en).toBeTruthy();
      for (const text of [entry.tr, entry.en]) {
        if (!text) continue;
        expect(text.q.trim()).toBe(text.q);
        if (entry.typed) {
          expect(text.a!.length).toBeGreaterThan(0);
          expect(text.o).toBeUndefined();
          continue;
        }
        expect(new Set(text.o).size).toBe(text.o!.length);
        expect(text.o!.length).toBe(entry.tf === undefined && entry.k !== 'first' ? 4 : 2);
      }
    }
  });

  it('QZ4: every question has a level, a topic and both languages; every topic has every level', () => {
    expect(QUIZ_BANK.length).toBeGreaterThanOrEqual(5000);
    const bilingual = QUIZ_BANK.filter((e) => e.en && e.tr).length;
    expect(bilingual / QUIZ_BANK.length).toBeGreaterThan(0.97);
    for (const entry of QUIZ_BANK) {
      expect([1, 2, 3]).toContain(entry.d);
      expect(QUIZ_CATEGORIES).toContain(entry.c);
      if (entry.k === 'year') for (const o of entry.en?.o ?? []) expect(o).toMatch(/^\d{1,4}( BCE?)?$/);
    }
    // The new categories ask the four new kinds too.
    for (const kind of ['first', 'odd', 'year'] as const) expect(QUIZ_BANK.filter((e) => e.k === kind).length).toBeGreaterThan(80);
    for (const lang of ['tr', 'en'] as const)
      for (const category of QUIZ_CATEGORIES)
        for (const level of ['easy', 'medium', 'hard'] as const) expect(quizPool(lang, category, undefined, level).length, `${lang} ${category} ${level}`).toBeGreaterThanOrEqual(15);
  });

  it('QZ4: a level picks only that level (Mixed: every level, easier first) and is a valid setting', () => {
    for (const level of ['easy', 'medium', 'hard'] as const) {
      const qs = pickQuestions('en', 15, Math.random, 'mix', [], undefined, level);
      expect(qs).toHaveLength(15);
      expect(qs.every((q) => q.level === levelDifficulty(level) && QUIZ_BANK[q.id]!.d === q.level)).toBe(true);
    }
    const mixed = pickQuestions('tr', 15, Math.random, 'history');
    expect(mixed.map((q) => q.level)).toEqual([...mixed.map((q) => q.level)].sort());
    // A level too small for the game tops up from the topic's other levels.
    const typedHard = pickQuestions('en', 15, Math.random, 'general', [], (e) => !!e.typed, 'hard');
    expect(typedHard).toHaveLength(15);
    for (const level of QUIZ_LEVELS) expect(parseQuizMessage(JSON.stringify({ t: 'settings', level }))).toEqual({ t: 'settings', level });
    expect(parseQuizMessage(JSON.stringify({ t: 'settings', level: 'expert' }))).toBeNull();
    expect(quizOffer('en', Math.random, 'hard')).toHaveLength(QUIZ_OFFER);
  });

  it('QZ4: a full seen bitmap of the grown bank fits in a hello', () => {
    const ids = Array.from({ length: 600 }, (_, i) => QUIZ_BANK.length - 1 - i * 3);
    const seen = encodeSeen(ids);
    expect(seen.length).toBeLessThanOrEqual(SEEN_CHARS);
    const hello = parseQuizMessage(JSON.stringify({ t: 'hello', v: QUIZ_PROTOCOL_VERSION, name: 'Alex', seen }));
    expect(hello && 'seen' in hello && decodeSeen(hello.seen!).sort((a, b) => a - b)).toEqual([...ids].sort((a, b) => a - b));
  });

  it('picked questions: different, options shuffled, the right option in the right place', () => {
    const questions = pickQuestions('tr', 15);
    expect(questions).toHaveLength(15);
    expect(new Set(questions.map((q) => q.id)).size).toBe(15);
    for (const q of questions) {
      const entry = QUIZ_BANK[q.id]!;
      if (entry.typed) {
        expect(q.typed && q.options.length === 0 && q.accept).toEqual([...entry.tr!.a!]);
        continue;
      }
      if (entry.tf === undefined) expect(q.options[q.correct]).toBe(entry.tr!.o![0]);
      else expect(q.correct).toBe(entry.tf ? 0 : 1);
      expect([...q.options].sort()).toEqual([...entry.tr!.o!].sort());
    }
    // The right option is not always in the same place.
    const spots = new Set(pickQuestions('en', 15).filter((q) => q.options.length === 4).map((q) => q.correct));
    expect(spots.size).toBeGreaterThan(1);
  });

  it('topics, lengths and recently asked questions', () => {
    const space = pickQuestions('en', 5, Math.random, 'space');
    expect(space).toHaveLength(5);
    expect(space.every((q) => q.cat === 'space')).toBe(true);
    const first = pickQuestions('tr', 15);
    const second = pickQuestions('tr', 15, Math.random, 'mix', first.map((q) => q.id));
    expect(second.some((q) => first.some((f) => f.id === q.id))).toBe(false);
    // A topic smaller than what is avoided still fills the game.
    const all = quizPool('tr', 'math');
    expect(pickQuestions('tr', 10, Math.random, 'math', all)).toHaveLength(10);
  });

  it('50:50 hides two wrong options, never on true / false', () => {
    const [q] = pickQuestions('tr', 40).filter((x) => x.options.length === 4);
    for (let i = 0; i < 20; i++) {
      const hide = fiftyFifty(q!);
      expect(hide).toHaveLength(2);
      expect(hide).not.toContain(q!.correct);
    }
    expect(fiftyFifty({ id: 0, cat: 'general', level: 1, question: '?', options: ['Doğru', 'Yanlış'], correct: 0 })).toEqual([]);
  });

  it('message validation', () => {
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 3, pick: 2 }))).toEqual({ t: 'answer', n: 3, pick: 2 });
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 0, pick: 2 }))).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 3, pick: 4 }))).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 15, pick: 0 }))).toEqual({ t: 'answer', n: 15, pick: 0 });
    expect(parseQuizMessage(JSON.stringify({ t: 'joker', n: 2 }))).toEqual({ t: 'joker', n: 2 });
    expect(parseQuizMessage(JSON.stringify({ t: 'settings', lang: 'en', topic: 'space', count: 5 }))).toEqual({ t: 'settings', lang: 'en', topic: 'space', count: 5 });
    expect(parseQuizMessage(JSON.stringify({ t: 'settings', topic: 'films', count: 7 }))).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'hello', v: 1, name: 'Sam', lang: 'en' }))).toEqual({ t: 'hello', v: 1, name: 'Sam', lang: 'en' });
  });

  it('typed answers (QZ2): cleaned, capped, never empty', () => {
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 2, text: '  Mount   Everest ' }))).toEqual({ t: 'answer', n: 2, text: 'Mount Everest' });
    const long = parseQuizMessage(JSON.stringify({ t: 'answer', n: 2, text: 'x'.repeat(500) }));
    expect(long && 'text' in long && long.text.length).toBe(QUIZ_TYPED_MAX);
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 2, text: '\u0000\u202e\n ' }))).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 2, text: 42 }))).toBeNull();
    const odd = parseQuizMessage(JSON.stringify({ t: 'answer', n: 2, text: 'Pa\u202eris\u0007' }));
    expect(odd && 'text' in odd && /[\u202e\u0007]/.test(odd.text)).toBe(false);
  });

  it('typed answers match forgivingly: case, accents, ı / İ, "the", one typo on longer words, numbers exact', () => {
    expect(foldAnswer('  The Pacific-Ocean! ')).toBe('pacificocean');
    expect(foldAnswer('İSTANBUL')).toBe(foldAnswer('istanbul'));
    expect(matchTyped('istanbul', ['İstanbul'])).toBe(true);
    expect(matchTyped('ISTANBUL', ['İstanbul'])).toBe(true);
    expect(matchTyped('Ankara', ['İstanbul'])).toBe(false);
    expect(matchTyped('akciger', ['Akciğer'])).toBe(true);
    expect(matchTyped('Sao Paulo', ['São Paulo'])).toBe(true);
    expect(matchTyped('Jupitre', ['Jupiter'])).toBe(true);
    expect(matchTyped('Jupitr', ['Jupiter'])).toBe(true);
    expect(matchTyped('Jptr', ['Jupiter'])).toBe(false);
    expect(matchTyped('Mars', ['Mars'])).toBe(true);
    expect(matchTyped('Mors', ['Mars'])).toBe(false);
    expect(matchTyped('207', ['206'])).toBe(false);
    expect(matchTyped('206', ['206'])).toBe(true);
    expect(matchTyped('40', ['-40'])).toBe(false);
    expect(matchTyped('−40', ['-40'])).toBe(true);
    expect(matchTyped('minus 40', ['-40'])).toBe(true);
    expect(matchTyped('eksi 40', ['-40'])).toBe(true);
    expect(matchTyped('X-ray', ['X-ray'])).toBe(true);
    expect(matchTyped('ten', ['10', 'ten'])).toBe(true);
    expect(matchTyped('', ['10'])).toBe(false);
    expect(matchTyped('!!!', ['10'])).toBe(false);
  });

  it('harder questions and typed answers are worth more (QZ2)', () => {
    expect(quizLevelBonus(1, false)).toBe(1);
    expect(quizLevelBonus(undefined, false)).toBe(1.2);
    expect(quizLevelBonus(3, false)).toBe(1.5);
    expect(quizLevelBonus(3, true)).toBeCloseTo(1.95);
  });
});

describe('quiz bank 2 and rotation (P9)', () => {
  it('the bank grew past 1100 questions, every one valid, with a difficulty on the new ones', () => {
    expect(QUIZ_BANK.length).toBeGreaterThan(1100);
    for (const entry of QUIZ_BANK) {
      expect(entry.en || entry.tr).toBeTruthy();
      for (const text of [entry.en, entry.tr]) {
        if (!text) continue;
        expect(text.q.length).toBeLessThanOrEqual(160);
        if (entry.typed) continue;
        expect(new Set(text.o).size).toBe(text.o!.length);
        expect(text.o!.length).toBe(entry.tf === undefined && entry.k !== 'first' ? 4 : 2);
      }
    }
    expect(QUIZ_BANK.slice(-700).every((e) => e.d === 1 || e.d === 2 || e.d === 3)).toBe(true);
  });

  it('a browser seen-list: questions travel as a small bitmap', () => {
    const ids = [0, 7, 8, 9, 300, 1170];
    const text = encodeSeen(ids);
    expect(text.length).toBeLessThan(SEEN_CHARS);
    expect(decodeSeen(text)).toEqual(ids);
    expect(decodeSeen('!!!')).toEqual([]);
    const hello = parseQuizMessage(JSON.stringify({ t: 'hello', v: QUIZ_PROTOCOL_VERSION, name: 'Sam', seen: encodeSeen(Array.from({ length: 600 }, (_, i) => i * 2)) }));
    expect(hello && hello.t === 'hello' && hello.seen && decodeSeen(hello.seen)).toHaveLength(600);
  });

  it('skips seen questions while enough are left, and warms up from easy to hard', () => {
    const pool = quizPool('en', 'space');
    const avoid = pool.slice(0, pool.length - 12);
    const picked = pickQuestions('en', 10, Math.random, 'space', avoid);
    expect(picked.every((q) => !avoid.includes(q.id))).toBe(true);
    const levels = picked.map((q) => QUIZ_BANK[q.id]!.d ?? 2);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });
});

describe('Quiz ×2 after answering (QZ3)', () => {
  it('doubles a right answer, a wrong one stays 0, and the reveal waits only briefly for it', () => {
    expect(doubledAfter({ gained: 180, rank: 1 })).toBe(360);
    expect(doubledAfter({ gained: 0 })).toBe(0);
    expect(QUIZ_DOUBLE_GRACE_MS).toBeGreaterThanOrEqual(1500);
    expect(QUIZ_DOUBLE_GRACE_MS).toBeLessThanOrEqual(3000);
  });
});

describe('Quiz tournament and jokers (QZ2)', () => {
  it('messages: joker kinds, a pick, tournament settings; anything else refused', () => {
    expect(parseQuizMessage(JSON.stringify({ t: 'joker', n: 4, kind: 'double' }))).toEqual({ t: 'joker', n: 4, kind: 'double' });
    expect(parseQuizMessage(JSON.stringify({ t: 'joker', n: 4 }))).toEqual({ t: 'joker', n: 4 });
    expect(parseQuizMessage(JSON.stringify({ t: 'joker', n: 4, kind: 'triple' }))).toBeNull();
    // A tournament of 8 players × 2 laps × 3 questions numbers up to 48.
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 48, pick: 1 }))).toEqual({ t: 'answer', n: 48, pick: 1 });
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 49, pick: 1 }))).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'pick', cat: 'body' }))).toEqual({ t: 'pick', cat: 'body' });
    expect(parseQuizMessage(JSON.stringify({ t: 'pick', cat: 'mix' }))).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'settings', mode: 'tournament', laps: 2 }))).toEqual({ t: 'settings', mode: 'tournament', laps: 2 });
    expect(parseQuizMessage(JSON.stringify({ t: 'settings', mode: 'league', laps: 3 }))).toBeNull();
  });

  it('a typed 50:50 shows the first letter and the length', () => {
    expect(typedHint('Berlin')).toBe('B·····');
    expect(typedHint('mount everest')).toBe('M···· ·······');
    expect(typedHint('206')).toBe('2··');
    expect(typedHint('istanbul')).toBe('I·······');
  });

  it('an offer is three different categories with enough questions', () => {
    for (const lang of ['en', 'tr'] as const) {
      const offer = quizOffer(lang);
      expect(offer).toHaveLength(QUIZ_OFFER);
      expect(new Set(offer).size).toBe(QUIZ_OFFER);
      for (const cat of offer) expect(quizPool(lang, cat).length).toBeGreaterThanOrEqual(QUIZ_ROUND_QUESTIONS * 4);
    }
  });

  it('a round goes to its best scorer, a tie to all of them, nobody when nobody scored', () => {
    expect(roundWinners({ a: 300, b: 120, c: 0 })).toEqual(['a']);
    expect(roundWinners({ a: 200, b: 200, c: 50 })).toEqual(['a', 'b']);
    expect(roundWinners({ a: 0, b: 0 })).toEqual([]);
    expect(roundWinners({})).toEqual([]);
  });

  it('the tournament ranks by round wins, then points', () => {
    const order = tournamentOrder([
      { id: 'a', wins: 1, score: 900 },
      { id: 'b', wins: 2, score: 300 },
      { id: 'c', wins: 1, score: 950 },
      { id: 'd', score: 2000 },
    ]);
    expect(order.map((p) => p.id)).toEqual(['b', 'c', 'a', 'd']);
  });
});
