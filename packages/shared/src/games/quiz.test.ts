import { describe, expect, it } from 'vitest';
import { QUIZ_QUESTIONS, fiftyFifty, parseQuizMessage, pickQuestions, quizPool } from './quiz.ts';
import { QUIZ_BANK, QUIZ_CATEGORIES } from './quiz-questions.ts';

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
        expect(new Set(text.o).size).toBe(text.o.length);
        expect(text.o.length).toBe(entry.tf === undefined ? 4 : 2);
      }
    }
  });

  it('picked questions: different, options shuffled, the right option in the right place', () => {
    const questions = pickQuestions('tr');
    expect(questions).toHaveLength(QUIZ_QUESTIONS);
    expect(new Set(questions.map((q) => q.id)).size).toBe(QUIZ_QUESTIONS);
    for (const q of questions) {
      const entry = QUIZ_BANK[q.id]!;
      if (entry.tf === undefined) expect(q.options[q.correct]).toBe(entry.tr!.o[0]);
      else expect(q.correct).toBe(entry.tf ? 0 : 1);
      expect([...q.options].sort()).toEqual([...entry.tr!.o].sort());
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
    expect(fiftyFifty({ id: 0, cat: 'general', question: '?', options: ['Doğru', 'Yanlış'], correct: 0 })).toEqual([]);
  });

  it('message validation', () => {
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 3, pick: 2 }))).toEqual({ t: 'answer', n: 3, pick: 2 });
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 0, pick: 2 }))).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 3, pick: 4 }))).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 15, pick: 0 }))).toEqual({ t: 'answer', n: 15, pick: 0 });
    expect(parseQuizMessage(JSON.stringify({ t: 'joker', n: 2 }))).toEqual({ t: 'joker', n: 2 });
    expect(parseQuizMessage(JSON.stringify({ t: 'settings', lang: 'en', topic: 'space', count: 5 }))).toEqual({ t: 'settings', lang: 'en', topic: 'space', count: 5 });
    expect(parseQuizMessage(JSON.stringify({ t: 'settings', topic: 'films', count: 7 }))).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'hello', v: 1, name: 'Ali', lang: 'en' }))).toEqual({ t: 'hello', v: 1, name: 'Ali', lang: 'en' });
  });
});
