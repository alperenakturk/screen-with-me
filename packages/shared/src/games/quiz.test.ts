import { describe, expect, it } from 'vitest';
import { QUIZ_ANSWER_MS, QUIZ_QUESTIONS, answerPoints, parseQuizMessage, pickQuestions } from './quiz.ts';
import { QUIZ_BANK } from './quiz-questions.ts';

describe('Bilgi yarışması', () => {
  it('soru bankası: dört farklı şık, tekrar eden soru yok', () => {
    for (const bank of Object.values(QUIZ_BANK)) {
      expect(bank.length).toBeGreaterThanOrEqual(50);
      expect(new Set(bank.map((q) => q[0])).size).toBe(bank.length);
      for (const [, ...options] of bank) expect(new Set(options).size).toBe(4);
    }
  });

  it('seçilen sorular: farklı, şıklar karışık, doğru şık doğru yerde', () => {
    const questions = pickQuestions('tr');
    expect(questions).toHaveLength(QUIZ_QUESTIONS);
    expect(new Set(questions.map((q) => q.question)).size).toBe(QUIZ_QUESTIONS);
    for (const q of questions) {
      const entry = QUIZ_BANK.tr.find((e) => e[0] === q.question)!;
      expect(q.options[q.correct]).toBe(entry[1]);
      expect([...q.options].sort()).toEqual([...entry.slice(1)].sort());
    }
    // Doğru şık hep aynı yerde değil.
    const spots = new Set(pickQuestions('en', 10).map((q) => q.correct));
    expect(spots.size).toBeGreaterThan(1);
  });

  it('puan: hızlı cevap çok alır', () => {
    expect(answerPoints(QUIZ_ANSWER_MS)).toBe(200);
    expect(answerPoints(0)).toBe(100);
    expect(answerPoints(-5)).toBe(100);
  });

  it('mesaj doğrulama', () => {
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 3, pick: 2 }))).toEqual({ t: 'answer', n: 3, pick: 2 });
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 0, pick: 2 }))).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 3, pick: 4 }))).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'hello', v: 1, name: 'Ali', lang: 'en' }))).toEqual({ t: 'hello', v: 1, name: 'Ali', lang: 'en' });
  });
});
