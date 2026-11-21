import { describe, expect, it } from 'vitest';
import { cleanRateAnswer, isStars, tallyRate, topWord } from './film-rate.ts';
import { parseClientMessage } from './protocol.ts';

const people = [
  { id: 'a', name: 'Alex', avatar: 'fox' },
  { id: 's', name: 'Sam' },
  { id: 'l', name: 'Lee' },
];

describe('film rate (FR1)', () => {
  it('takes half stars from 0.5 to 5 only', () => {
    expect([0.5, 1, 3.5, 5].every(isStars)).toBe(true);
    expect([0, 0.25, 5.5, NaN, '4', null].some(isStars)).toBe(false);
  });

  it('copies a valid answer and refuses a bad one', () => {
    const raw = { stars: 4.5, most: 's', least: 'l', again: 'yes', word: 'fun', extra: 'x' };
    const answer = cleanRateAnswer(raw);
    expect(answer).toEqual({ stars: 4.5, most: 's', least: 'l', again: 'yes', word: 'fun' });
    expect(answer).not.toBe(raw);
    expect(cleanRateAnswer({ stars: 4.2 })).toBeNull();
    expect(cleanRateAnswer({ stars: 3, again: 'often' })).toBeNull();
    expect(cleanRateAnswer({ stars: 3, word: '<b>' })).toBeNull();
    expect(cleanRateAnswer({ stars: 3, most: 'x'.repeat(41) })).toBeNull();
    expect(cleanRateAnswer({ stars: 3 })).toEqual({ stars: 3 });
  });

  it('parses rate messages', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'rate-start', junk: 1 }))).toEqual({ t: 'rate-start' });
    expect(parseClientMessage(JSON.stringify({ t: 'rate-end' }))).toEqual({ t: 'rate-end' });
    expect(parseClientMessage(JSON.stringify({ t: 'rate-answer', id: 'p1', stars: 2.5, word: 'cozy' }))).toEqual({ t: 'rate-answer', id: 'p1', stars: 2.5, word: 'cozy' });
    expect(parseClientMessage(JSON.stringify({ t: 'rate-answer', id: 'p1', stars: 7 }))).toBeNull();
    expect(parseClientMessage(JSON.stringify({ t: 'rate-answer', stars: 3 }))).toBeNull();
  });

  it('counts the answers', () => {
    const r = tallyRate(
      [
        { stars: 5, most: 'a', least: 's', again: 'yes', word: 'fun' },
        { stars: 4, most: 'a', least: 'l', again: 'maybe', word: 'fun' },
        { stars: 2.5, most: 's', least: 'nobody', word: 'meh' },
      ],
      people,
    );
    expect(r.votes).toBe(3);
    expect(r.stars).toBe(3.8);
    expect(r.hist[9]).toBe(1);
    expect(r.hist[7]).toBe(1);
    expect(r.hist[4]).toBe(1);
    expect(r.most).toEqual([
      { id: 'a', name: 'Alex', avatar: 'fox', n: 2 },
      { id: 's', name: 'Sam', n: 1 },
    ]);
    expect(r.least.map((p) => p.name)).toEqual(['Lee', 'Sam']);
    expect(r.again).toEqual({ yes: 1, maybe: 1, no: 0 });
    expect(topWord(r)).toBe('fun');
    expect(topWord(tallyRate([], people))).toBeNull();
    expect(tallyRate([], people).stars).toBe(0);
  });
});
