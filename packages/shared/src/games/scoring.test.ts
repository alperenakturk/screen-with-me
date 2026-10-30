import { describe, expect, it } from 'vitest';
import { DRAW_MIN_POINTS, drawGuessPoints, drawerPoints, quizPoints } from './scoring.ts';

const T = 10_000;

describe('Points', () => {
  it('quiz: speed, the first right answers and streaks', () => {
    expect(quizPoints(T, T, 1, 1)).toBe(200);
    expect(quizPoints(0, T, 1, 1)).toBe(100);
    expect(quizPoints(T, T, 2, 1)).toBe(175);
    expect(quizPoints(T, T, 3, 1)).toBe(160);
    expect(quizPoints(T, T, 4, 1)).toBe(150);
    expect(quizPoints(0, T, 8, 1)).toBe(50);
    expect(quizPoints(T, T, 1, 3)).toBe(220);
    expect(quizPoints(T, T, 1, 9)).toBe(230);
    expect(quizPoints(-5, T, 9, 0)).toBe(50);
  });

  it('draw: first and fast is best, later guessers and many wrong tries get less', () => {
    expect(drawGuessPoints(T, T, 1, 0)).toBe(200);
    expect(drawGuessPoints(T, T, 2, 0)).toBe(160);
    expect(drawGuessPoints(0, T, 1, 0)).toBe(60);
    // Two wrong tries are free, then −10 % each, at most half.
    expect(drawGuessPoints(T, T, 1, 2)).toBe(200);
    expect(drawGuessPoints(T, T, 1, 3)).toBe(180);
    expect(drawGuessPoints(T, T, 1, 50)).toBe(100);
    expect(drawGuessPoints(0, T, 8, 20)).toBe(DRAW_MIN_POINTS);
    // Strictly falling with the order.
    const byRank = [1, 2, 3, 4, 5].map((rank) => drawGuessPoints(T / 2, T, rank, 0));
    expect([...byRank].sort((a, b) => b - a)).toEqual(byRank);
    expect(new Set(byRank).size).toBe(5);
  });

  it('drawer: the guessers’ average times the share who guessed', () => {
    expect(drawerPoints([], 3)).toBe(0);
    expect(drawerPoints([200, 160, 128], 3)).toBe(163);
    expect(drawerPoints([200], 2)).toBe(100);
    expect(drawerPoints([150], 1)).toBe(150);
    expect(drawerPoints([100, 100], 0)).toBe(0);
  });
});
