import { describe, expect, it } from 'vitest';
import { doubledAfter, QUIZ_DOUBLE_GRACE_MS, QUIZ_LEVELS, levelDifficulty, QUIZ_PROTOCOL_VERSION, QUIZ_QUESTIONS, SEEN_CHARS, decodeSeen, encodeSeen, fiftyFifty, parseQuizMessage, quizLevelBonus, roundWinners, tournamentOrder, QUIZ_OFFER, QUIZ_FINALE_QUESTIONS, QUIZ_GUESS_POINTS, guessPoints, parseGuess, quizGuessCount, quizAnswerMs, QUIZ_ROUND_QUESTIONS } from './quiz.ts';
import { QUIZ_BANK, QUIZ_CATEGORIES, guessValue, isRetired } from './quiz-questions.ts';
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
        if (entry.k === 'guess') {
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
    const oddHard = pickQuestions('en', 15, Math.random, 'general', [], (e) => e.k === 'odd', 'hard');
    expect(oddHard).toHaveLength(15);
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
      expect(q.guess).toBeUndefined();
      expect(q.options[q.correct]).toBe(entry.tr!.o![0]);
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

  it('50:50 hides two wrong options, never with fewer than four', () => {
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
    // QZ5: a closest guess is a finite number (two decimals kept); text answers are gone.
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 5, num: 1889 }))).toEqual({ t: 'answer', n: 5, num: 1889 });
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 5, num: 3.14159 }))).toEqual({ t: 'answer', n: 5, num: 3.14 });
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 5, num: -40 }))).toEqual({ t: 'answer', n: 5, num: -40 });
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 5, num: '1889' }))).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 5, num: 1e13 }))).toBeNull();
    expect(parseQuizMessage('{"t":"answer","n":5,"num":1e999}')).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 5, text: 'Paris' }))).toBeNull();
    for (const op of ['skip', 'guess', 'finale']) expect(parseQuizMessage(JSON.stringify({ t: 'lab', op }))).toEqual({ t: 'lab', op });
    expect(parseQuizMessage(JSON.stringify({ t: 'lab', op: 'typed' }))).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'settings', lang: 'en', topic: 'space', count: 5 }))).toEqual({ t: 'settings', lang: 'en', topic: 'space', count: 5 });
    expect(parseQuizMessage(JSON.stringify({ t: 'settings', topic: 'films', count: 7 }))).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'hello', v: 1, name: 'Sam', lang: 'en' }))).toEqual({ t: 'hello', v: 1, name: 'Sam', lang: 'en' });
  });

  it('harder questions are worth more (QZ2)', () => {
    expect(quizLevelBonus(1)).toBe(1);
    expect(quizLevelBonus(undefined)).toBe(1.2);
    expect(quizLevelBonus(3)).toBe(1.5);
  });
});

describe('Quiz closest guesses (QZ5)', () => {
  it('no true / false and no typed words are asked any more, in any topic, level or language', () => {
    for (const lang of ['tr', 'en'] as const)
      for (const topic of ['mix', ...QUIZ_CATEGORIES] as const)
        for (const kind of ['choice', 'guess'] as const)
          for (const id of quizPool(lang, topic, undefined, 'mix', kind)) {
            const e = QUIZ_BANK[id]!;
            expect(e.tf, `${id}`).toBeUndefined();
            expect(isRetired(e)).toBe(false);
            if (kind === 'choice') expect(e[lang]!.o).toHaveLength(e.k === 'first' ? 2 : 4);
            else expect(guessValue(e)).not.toBeNull();
          }
    // Every game of every topic, level and length: four options (two on "which came first") or a closest guess.
    for (const level of QUIZ_LEVELS)
      for (const topic of ['mix', ...QUIZ_CATEGORIES] as const) {
        const qs = pickQuestions('en', 15, Math.random, topic, [], undefined, level, quizGuessCount(15));
        expect(qs).toHaveLength(15);
        for (const q of qs) expect(q.guess ? q.options.length === 0 && Number.isFinite(q.value) : q.options.length >= 2 && !['True', 'False'].includes(q.options[0]!)).toBe(true);
      }
  });

  it('every category has closest-guess questions; the fifth bank brings three new topics', () => {
    for (const lang of ['tr', 'en'] as const) {
      expect(quizPool(lang, 'mix', undefined, 'mix', 'guess').length).toBeGreaterThanOrEqual(300);
      for (const topic of QUIZ_CATEGORIES) expect(quizPool(lang, topic, undefined, 'mix', 'guess').length, `${lang} ${topic}`).toBeGreaterThanOrEqual(10);
    }
    for (const topic of ['screen', 'games', 'travel'] as const) expect(QUIZ_CATEGORIES).toContain(topic);
    // A fifth-bank guess carries its number; an old typed number counts as a guess only when both languages agree.
    expect(guessValue({ c: 'math', d: 1, k: 'guess', n: 391, en: { q: '17 × 23?' }, tr: { q: '17 × 23?' } })).toBe(391);
    expect(guessValue({ c: 'math', d: 1, typed: true, en: { q: '?', a: ['12', 'twelve'] }, tr: { q: '?', a: ['12'] } })).toBe(12);
    expect(guessValue({ c: 'math', d: 1, typed: true, en: { q: '?', a: ['Paris'] } })).toBeNull();
    expect(guessValue({ c: 'math', d: 1, typed: true, en: { q: '?', a: ['12'] }, tr: { q: '?', a: ['13'] } })).toBeNull();
  });

  it('a classic game asks 1–3 of them, spread out, the last one closing the game; 20 s each', () => {
    expect([5, 10, 15].map(quizGuessCount)).toEqual([1, 2, 3]);
    for (const [count, at] of [[5, [4]], [10, [4, 9]], [15, [4, 9, 14]]] as const) {
      const qs = pickQuestions('en', count, Math.random, 'mix', [], undefined, 'mix', quizGuessCount(count));
      expect(qs.map((q, i) => (q.guess ? i : -1)).filter((i) => i >= 0)).toEqual([...at]);
    }
    // A topic or level short of guesses still fills the game (from the topic's other levels, then from every topic).
    expect(pickQuestions('tr', 5, Math.random, 'travel', [], undefined, 'hard', 5).every((q) => q.guess)).toBe(true);
    expect(quizAnswerMs(true)).toBe(20_000);
    expect(quizAnswerMs(false)).toBe(15_000);
    expect(QUIZ_FINALE_QUESTIONS).toBe(5);
  });

  it('closest scoring: 200 / 100 / 50 / 0; two players 200 / 0, three 200 / 100 / 0; ties share the better place', () => {
    expect(QUIZ_GUESS_POINTS).toEqual([200, 100, 50]);
    const four = guessPoints({ a: 1890, b: 1900, c: 1850, d: 2000, e: 1700 }, 1889, 5);
    expect(Object.fromEntries(Object.entries(four).map(([k, r]) => [k, r.points]))).toEqual({ a: 200, b: 100, c: 50, d: 0, e: 0 });
    expect(four.a!.place).toBe(1);
    expect(four.d!.place).toBe(4);
    expect(guessPoints({ a: 10, b: 11 }, 10, 2)).toEqual({ a: { place: 1, points: 200 }, b: { place: 2, points: 0 } });
    expect(guessPoints({ a: 10, b: 13, c: 20 }, 11, 3)).toEqual({ a: { place: 1, points: 200 }, b: { place: 2, points: 100 }, c: { place: 3, points: 0 } });
    // Equal distance on either side: both closest; the next one is third.
    expect(guessPoints({ a: 9, b: 11, c: 15, d: 30 }, 10, 4)).toEqual({ a: { place: 1, points: 200 }, b: { place: 1, points: 200 }, c: { place: 3, points: 50 }, d: { place: 4, points: 0 } });
    // A player who did not answer still counts for the ladder (three at the table, two guessed).
    expect(guessPoints({ a: 5, b: 7 }, 5, 3)).toEqual({ a: { place: 1, points: 200 }, b: { place: 2, points: 100 } });
    expect(guessPoints({}, 5, 3)).toEqual({});
  });

  it('a typed guess reads like people write numbers', () => {
    expect(parseGuess('1889')).toBe(1889);
    expect(parseGuess(' 1 440 ')).toBe(1440);
    expect(parseGuess('1,440')).toBe(1440);
    expect(parseGuess('1.440')).toBe(1440);
    expect(parseGuess('12.345.678')).toBe(12345678);
    expect(parseGuess('3,14')).toBe(3.14);
    expect(parseGuess('3.14159')).toBe(3.14);
    expect(parseGuess('0.125')).toBe(0.13);
    expect(parseGuess('−40')).toBe(-40);
    expect(parseGuess('-40')).toBe(-40);
    expect(parseGuess('.5')).toBe(0.5);
    for (const bad of ['', '-', 'abc', '12a', '1e5', '1.2.3', '1,2,3']) expect(parseGuess(bad), bad).toBeNull();
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
        if (entry.typed || entry.k === 'guess') continue;
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
    // A tournament of 8 players × 2 laps × 3 questions and its 5-question finale numbers up to 53.
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 53, pick: 1 }))).toEqual({ t: 'answer', n: 53, pick: 1 });
    expect(parseQuizMessage(JSON.stringify({ t: 'answer', n: 54, pick: 1 }))).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'pick', cat: 'body' }))).toEqual({ t: 'pick', cat: 'body' });
    expect(parseQuizMessage(JSON.stringify({ t: 'pick', cat: 'mix' }))).toBeNull();
    expect(parseQuizMessage(JSON.stringify({ t: 'settings', mode: 'tournament', laps: 2 }))).toEqual({ t: 'settings', mode: 'tournament', laps: 2 });
    expect(parseQuizMessage(JSON.stringify({ t: 'settings', mode: 'league', laps: 3 }))).toBeNull();
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
