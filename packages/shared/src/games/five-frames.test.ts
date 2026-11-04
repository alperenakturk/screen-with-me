import { describe, expect, it } from 'vitest';
import {
  ALPHABET, FRAMES_VERSION, MAX_TRIES,
  answerFor, dayNumber, freshFrames, liveStreak, guess, loadFrames, normalize, record, saveFrames, score, seeded, shareLine,
  solved, today, trayMarks, upper, wellFormed, type DayGame,
} from './five-frames.ts';

const allowAll = { allowed: () => true };
const allowNone = { allowed: () => false };

describe('Five Frames marks', () => {
  it('right place, in the word, not in the word', () => {
    expect(score('crane', 'crane')).toEqual(['hit', 'hit', 'hit', 'hit', 'hit']);
    expect(score('nacre', 'crane')).toEqual(['near', 'near', 'near', 'near', 'hit']);
    expect(score('fight', 'crane')).toEqual(['miss', 'miss', 'miss', 'miss', 'miss']);
  });

  it('repeated letters count only as often as the answer has them', () => {
    // One "e" in the answer: the right-place one wins, the other is not in the word.
    expect(score('geese', 'those')).toEqual(['miss', 'miss', 'miss', 'hit', 'hit']);
    expect(score('eerie', 'crane')).toEqual(['miss', 'miss', 'near', 'miss', 'hit']);
    // Two "l" in the answer, three in the guess: both right places take them, the first "l" gets nothing.
    expect(score('lolly', 'hello')).toEqual(['miss', 'near', 'hit', 'hit', 'miss']);
    // Two "l" in the answer, none in place: two "in the word" marks, and only two.
    expect(score('llama', 'hello')).toEqual(['near', 'near', 'miss', 'miss', 'miss']);
    // A right place later in the word takes the letter before an earlier "in the word".
    expect(score('apple', 'plate')).toEqual(['near', 'near', 'miss', 'near', 'hit']);
    expect(score('speed', 'abide')).toEqual(['miss', 'miss', 'near', 'miss', 'near']);
  });

  it('Turkish: İ/i and I/ı are different letters, lower case the Turkish way', () => {
    expect(normalize('IŞIK', 'tr')).toBe('ışık');
    expect(normalize('İNCİR', 'tr')).toBe('incir');
    expect(normalize('İncir', 'en')).not.toBe('incir');
    expect(upper('i', 'tr')).toBe('İ');
    expect(upper('ı', 'tr')).toBe('I');
    expect(score('ılgın', 'ilgin')).toEqual(['miss', 'hit', 'hit', 'miss', 'hit']);
    expect(score('kağıt', 'kâğıt'.normalize('NFC').replace('â', 'a'))).toEqual(['hit', 'hit', 'hit', 'hit', 'hit']);
    expect(wellFormed('çiçek', 'tr')).toBe(true);
    expect(wellFormed('çiçek', 'en')).toBe(false);
    expect(wellFormed('ışık', 'tr')).toBe(false);
    // Decomposed input (c + combining cedilla) composes into one letter.
    expect(wellFormed(normalize('çiçek', 'tr'), 'tr')).toBe(true);
  });

  it('the letter tray keeps each letter’s best mark', () => {
    const tray = trayMarks(['nacre', 'crane'], 'crane');
    expect(tray.get('n')).toBe('hit');
    expect(tray.get('e')).toBe('hit');
    expect(trayMarks(['fight'], 'crane').get('f')).toBe('miss');
  });

  it('alphabets: English 26 letters, Turkish 29, no duplicates', () => {
    expect(ALPHABET.en).toHaveLength(26);
    expect(ALPHABET.tr).toHaveLength(29);
    expect(new Set(ALPHABET.tr).size).toBe(29);
    expect(ALPHABET.tr).not.toContain('q');
  });
});

describe('Five Frames days', () => {
  it('day 1 is 1 Nov 2026 in the player’s own calendar', () => {
    expect(dayNumber(new Date(2026, 10, 1, 0, 1))).toBe(1);
    expect(dayNumber(new Date(2026, 10, 1, 23, 59))).toBe(1);
    expect(dayNumber(new Date(2026, 10, 3, 12))).toBe(3);
    expect(dayNumber(new Date(2027, 0, 1))).toBe(62);
    // Across a daylight-saving change the count still moves one a day.
    expect(dayNumber(new Date(2027, 2, 29)) - dayNumber(new Date(2027, 2, 27))).toBe(2);
  });

  it('the seeded random gives the same numbers everywhere', () => {
    const a = seeded(42);
    const b = seeded(42);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect(first.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('every word comes once per round, rounds differ, languages differ', () => {
    const words = Array.from({ length: 50 }, (_, i) => `w${String(i).padStart(3, '0')}`);
    const round1 = Array.from({ length: 50 }, (_, d) => answerFor(d + 1, words, 'en'));
    const round2 = Array.from({ length: 50 }, (_, d) => answerFor(d + 51, words, 'en'));
    expect(new Set(round1).size).toBe(50);
    expect(new Set(round2).size).toBe(50);
    expect(round2).not.toEqual(round1);
    expect(answerFor(7, words, 'en')).toBe(answerFor(7, words, 'en'));
    expect(Array.from({ length: 10 }, (_, d) => answerFor(d + 1, words, 'tr'))).not.toEqual(round1.slice(0, 10));
    expect(answerFor(-5, words, 'en')).toBe(answerFor(1, words, 'en'));
    expect(() => answerFor(1, [], 'en')).toThrow();
  });
});

describe('Five Frames streak shown (BH2)', () => {
  it('holds through today and yesterday, breaks after a missed day', () => {
    const stats = { streak: 3, last: 5 };
    expect(liveStreak(stats, 5)).toBe(3);
    expect(liveStreak(stats, 6)).toBe(3);
    expect(liveStreak(stats, 7)).toBe(0);
  });
});

describe('Five Frames play', () => {
  it('checks guesses: length, letters, repeats, known words; the answer is always allowed', () => {
    const game: DayGame = { day: 3, guesses: [] };
    expect(guess(game, 'cran', 'crane', 'en', allowAll)).toBe('short');
    expect(guess(game, 'cr4ne', 'crane', 'en', allowAll)).toBe('letters');
    expect(guess(game, 'zzzzz', 'crane', 'en', allowNone)).toBe('unknown');
    expect(guess(game, ' Nacre ', 'crane', 'en', allowAll)).toBeNull();
    expect(guess(game, 'NACRE', 'crane', 'en', allowAll)).toBe('repeat');
    expect(guess(game, 'CRANE', 'crane', 'en', allowNone)).toBeNull();
    expect(solved(game, 'crane')).toBe(true);
    expect(guess(game, 'fight', 'crane', 'en', allowAll)).toBe('done');
    expect(game.guesses).toEqual(['nacre', 'crane']);
  });

  it('seven tries, then the day is over', () => {
    const game: DayGame = { day: 1, guesses: [] };
    const tries = ['aaaaa', 'bbbbb', 'ccccc', 'ddddd', 'eeeee', 'fffff', 'ggggg'];
    for (const t of tries) expect(guess(game, t, 'crane', 'en', allowAll)).toBeNull();
    expect(game.guesses).toHaveLength(MAX_TRIES);
    expect(guess(game, 'hhhhh', 'crane', 'en', allowAll)).toBe('done');
  });

  it('a Turkish guess typed with capital İ / I matches', () => {
    const game: DayGame = { day: 1, guesses: [] };
    expect(guess(game, 'İNCİR', 'incir', 'tr', allowNone)).toBeNull();
    expect(solved(game, 'incir')).toBe(true);
  });

  it('the share line tells the day and tries, never the word', () => {
    expect(shareLine('Five Frames', { day: 12, guesses: ['nacre', 'fight', 'trace', 'crane'] }, 'crane')).toBe('🍿 Five Frames #12 · 4/7');
    const lost = { day: 13, guesses: Array.from({ length: 7 }, () => 'fight') };
    expect(shareLine('Beş Kare', lost, 'crane')).toBe('🍿 Beş Kare #13 · X/7');
    expect(shareLine('Five Frames', lost, 'crane')).not.toMatch(/crane|fight/i);
  });
});

describe('Five Frames stats and save', () => {
  it('counts a finished day once; a streak needs the day before', () => {
    const save = freshFrames();
    const win = (day: number, n: number): DayGame => ({ day, guesses: [...Array.from({ length: n - 1 }, (_, i) => `aaaa${'bcdefg'[i]}`), 'crane'] });
    expect(record(save, 'en', { day: 1, guesses: ['nacre'] }, 'crane')).toBe(false); // not finished
    expect(record(save, 'en', win(1, 3), 'crane')).toBe(true);
    expect(record(save, 'en', win(1, 3), 'crane')).toBe(false);
    record(save, 'en', win(2, 1), 'crane');
    expect(save.stats.en).toMatchObject({ played: 2, won: 2, streak: 2, best: 2, last: 2 });
    expect(save.stats.en.tries.slice(0, 3)).toEqual([1, 0, 1]);
    record(save, 'en', win(4, 2), 'crane'); // day 3 skipped
    expect(save.stats.en.streak).toBe(1);
    record(save, 'en', { day: 5, guesses: Array.from({ length: 7 }, () => 'fight') }, 'crane');
    expect(save.stats.en).toMatchObject({ played: 4, won: 3, streak: 0, best: 2 });
    expect(save.stats.tr.played).toBe(0);
  });

  it('today’s game is kept for the day, a new day starts empty', () => {
    const save = freshFrames();
    const game = today(save, 'tr', 9);
    game.guesses.push('incir');
    expect(today(save, 'tr', 9).guesses).toEqual(['incir']);
    expect(today(save, 'tr', 10).guesses).toEqual([]);
    expect(today(save, 'en', 10).day).toBe(10);
  });

  it('round-trips as one versioned JSON and cleans what is wrong', () => {
    const save = freshFrames();
    today(save, 'en', 3).guesses.push('nacre');
    record(save, 'tr', { day: 2, guesses: ['incir'] }, 'incir');
    const text = saveFrames(save);
    expect(JSON.parse(text).v).toBe(FRAMES_VERSION);
    expect(loadFrames(text)).toEqual(save);
    for (const raw of [null, '', '{', 3, { v: 9 }]) expect(loadFrames(raw)).toEqual(freshFrames());
    const cleaned = loadFrames({
      v: FRAMES_VERSION,
      games: { en: { day: 4, guesses: ['CRANE', 'cr4ne', 7, 'toolong', 'nacre'] }, tr: { day: 'x', guesses: ['IŞILT'] }, de: { day: 1, guesses: [] } },
      stats: { en: { played: 3, won: 9, streak: 2, best: 1, last: 4, tries: [1, 'x', -2] } },
    });
    expect(cleaned.games.en).toEqual({ day: 4, guesses: ['crane', 'nacre'] });
    expect(cleaned.games.tr).toEqual({ day: 0, guesses: ['ışılt'] });
    expect('de' in cleaned.games).toBe(false);
    expect(cleaned.stats.en).toMatchObject({ played: 3, won: 3, streak: 2, best: 2, last: 4 });
    expect(cleaned.stats.en.tries).toEqual([1, 0, 0, 0, 0, 0, 0]);
  });
});
