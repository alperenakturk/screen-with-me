import { describe, expect, it } from 'vitest';
import { boardDone, boardSolved, duelGuess, duelOutcome, duelPlace, duelPoints, duelRanks, duelTimeUp, duelWordsVisible, parseDuelMessage, practiceWord, type DuelBoard } from './duel.ts';
import { MAX_TRIES } from './five-frames.ts';

const ANSWER = 'crane';
const LIST = new Set(['crane', 'slate', 'pious', 'mound', 'fight', 'lucky', 'brick', 'dwarf', 'nymph']);
const allowed = (w: string) => LIST.has(w);
const wrong = ['slate', 'pious', 'mound', 'fight', 'lucky', 'brick', 'dwarf'];

describe('Five Frames Duel judging', () => {
  it('counts a good guess and refuses bad ones without changing the board', () => {
    const board: DuelBoard = { guesses: [] };
    expect(duelGuess(board, 'SLATE', ANSWER, 'en', allowed)).toBeNull();
    expect(board.guesses).toEqual(['slate']);
    expect(duelGuess(board, 'slat', ANSWER, 'en', allowed)).toBe('short');
    expect(duelGuess(board, 'sl4te', ANSWER, 'en', allowed)).toBe('letters');
    expect(duelGuess(board, 'zzzzz', ANSWER, 'en', allowed)).toBe('unknown');
    expect(duelGuess(board, 'slate', ANSWER, 'en', allowed)).toBe('repeat');
    expect(board.guesses).toEqual(['slate']);
  });

  it('the first to solve wins at once', () => {
    const boards: DuelBoard[] = [{ guesses: ['slate'] }, { guesses: ['pious'] }];
    expect(duelOutcome(boards, ANSWER, 0)).toBeNull();
    duelGuess(boards[1]!, 'crane', ANSWER, 'en', allowed);
    expect(duelOutcome(boards, ANSWER, 1)).toBe(1);
    expect(boardSolved(boards[1]!, ANSWER)).toBe(true);
  });

  it('a player out of tries waits for the other; both out is a draw', () => {
    const boards: DuelBoard[] = [{ guesses: [] }, { guesses: [] }];
    for (const w of wrong) duelGuess(boards[0]!, w, ANSWER, 'en', allowed);
    expect(boards[0]!.guesses).toHaveLength(MAX_TRIES);
    expect(boardDone(boards[0]!, ANSWER)).toBe(true);
    expect(duelOutcome(boards, ANSWER, 0)).toBeNull();
    // A finished board takes no more guesses.
    expect(duelGuess(boards[0]!, 'crane', ANSWER, 'en', allowed)).toBe('done');
    for (const w of wrong.slice(0, -1)) duelGuess(boards[1]!, w, ANSWER, 'en', allowed);
    expect(duelOutcome(boards, ANSWER, 1)).toBeNull();
    duelGuess(boards[1]!, 'nymph', ANSWER, 'en', allowed);
    expect(duelOutcome(boards, ANSWER, 1)).toBe('draw');
  });

  it('the other can still win after one ran out of tries', () => {
    const boards: DuelBoard[] = [{ guesses: [...wrong] }, { guesses: ['slate'] }];
    duelGuess(boards[1]!, 'crane', ANSWER, 'en', allowed);
    expect(duelOutcome(boards, ANSWER, 1)).toBe(1);
  });

  it('GMP b: with three or more the race goes on until every board is done; places follow the finishing order', () => {
    const boards: (DuelBoard | null)[] = [{ guesses: ['slate'] }, null, { guesses: [] }, { guesses: [] }];
    const solved: number[] = [];
    duelGuess(boards[3]!, 'crane', ANSWER, 'en', allowed);
    solved.push(3);
    // Seat 3 solved first, but seats 0 and 2 still play.
    expect(duelOutcome(boards, ANSWER, 3, solved)).toBeNull();
    duelGuess(boards[0]!, 'crane', ANSWER, 'en', allowed);
    solved.push(0);
    expect(duelOutcome(boards, ANSWER, 0, solved)).toBeNull();
    for (const w of wrong) duelGuess(boards[2]!, w, ANSWER, 'en', allowed);
    expect(duelOutcome(boards, ANSWER, 2, solved)).toBe(3);
    expect(duelRanks(boards, ANSWER, solved)).toEqual([2, 0, 3, 1]);
  });

  it('FW2 bug: a solver keeps the place they finished in while the others still race (not the count of solvers)', () => {
    // Owner, 21 Nov 2026: two players both showed "2nd" though one finished first.
    const boards: DuelBoard[] = [{ guesses: [] }, { guesses: [] }, { guesses: [] }];
    const solved: number[] = [];
    duelGuess(boards[1]!, 'crane', ANSWER, 'en', allowed);
    solved.push(1);
    duelGuess(boards[0]!, 'slate', ANSWER, 'en', allowed);
    duelGuess(boards[0]!, 'crane', ANSWER, 'en', allowed);
    solved.push(0);
    expect(duelOutcome(boards, ANSWER, 0, solved)).toBeNull();
    expect(duelPlace(solved, 1)).toBe(1);
    expect(duelPlace(solved, 0)).toBe(2);
    expect(duelPlace(solved, 2)).toBe(0);
  });

  it('FW2: points are 7 → 1 by the guess it took, plus 3 for the first to find it', () => {
    const boards: (DuelBoard | null)[] = [{ guesses: ['slate', 'pious', 'crane'] }, null, { guesses: ['crane'] }, { guesses: [...wrong] }];
    // Seat 0 found it first (on the third guess), seat 2 second (on the first), seat 3 never.
    expect(duelPoints(boards, ANSWER, [0, 2])).toEqual([5 + 3, 0, 7, 0]);
    const seventh: DuelBoard = { guesses: [...wrong.slice(0, 6), 'crane'] };
    expect(duelPoints([seventh], ANSWER, [])).toEqual([1]);
  });

  it('FW2: when the time runs out every unfinished board is out; first solver wins, or a draw', () => {
    const boards: DuelBoard[] = [{ guesses: ['slate'] }, { guesses: ['crane'] }, { guesses: [] }];
    expect(duelTimeUp(boards, ANSWER, [1])).toBe(1);
    expect(boards.map((b) => boardDone(b, ANSWER))).toEqual([true, true, true]);
    expect(boards[1]!.timeUp).toBeUndefined();
    expect(duelRanks(boards, ANSWER, [1])).toEqual([2, 1, 2]);
    const two: DuelBoard[] = [{ guesses: [] }, { guesses: ['slate'] }];
    expect(duelTimeUp(two, ANSWER, [])).toBe('draw');
    expect(duelGuess(two[0]!, 'slate', ANSWER, 'en', allowed)).toBe('done');
  });

  it('FW2: a time limit is only one of the offered ones', () => {
    expect(parseDuelMessage(JSON.stringify({ t: 'settings', time: 120 }))).toEqual({ t: 'settings', time: 120 });
    expect(parseDuelMessage(JSON.stringify({ t: 'settings', time: 0 }))).toEqual({ t: 'settings', time: 0 });
    expect(parseDuelMessage(JSON.stringify({ t: 'settings', time: 7 }))).toBeNull();
    expect(parseDuelMessage(JSON.stringify({ t: 'settings', time: '120' }))).toBeNull();
  });

  it('GMP b: six players, nobody solves: a draw, everyone shares the first place', () => {
    const boards: DuelBoard[] = Array.from({ length: 6 }, () => ({ guesses: [...wrong] }));
    expect(duelOutcome(boards, ANSWER, 5, [])).toBe('draw');
    expect(duelRanks(boards, ANSWER, [])).toEqual([1, 1, 1, 1, 1, 1]);
  });

  it('GMP b: two players keep the old rule even with an empty seat around', () => {
    const boards: (DuelBoard | null)[] = [null, { guesses: ['slate'] }, { guesses: [] }];
    duelGuess(boards[2]!, 'crane', ANSWER, 'en', allowed);
    expect(duelOutcome(boards, ANSWER, 2, [2])).toBe(2);
    expect(duelRanks(boards, ANSWER, [2])).toEqual([0, 2, 1]);
  });

  it('a practice word is never the day’s word', () => {
    const answers = ['crane', 'slate', 'pious'];
    for (let i = 0; i < 20; i++) expect(practiceWord(answers, 'crane', () => i / 20)).not.toBe('crane');
    expect(practiceWord(answers, 'crane', () => 0.9999)).toBe('pious');
  });
});

describe('Five Frames Duel messages', () => {
  it('copies good messages and refuses bad ones', () => {
    expect(parseDuelMessage(JSON.stringify({ t: 'guess', word: 'crane', extra: 1 }))).toEqual({ t: 'guess', word: 'crane' });
    expect(parseDuelMessage(JSON.stringify({ t: 'guess', word: 'x'.repeat(21) }))).toBeNull();
    expect(parseDuelMessage(JSON.stringify({ t: 'guess', word: 5 }))).toBeNull();
    expect(parseDuelMessage(JSON.stringify({ t: 'lang', lang: 'tr' }))).toEqual({ t: 'lang', lang: 'tr' });
    expect(parseDuelMessage(JSON.stringify({ t: 'lang', lang: 'de' }))).toBeNull();
    expect(parseDuelMessage(JSON.stringify({ t: 'ready', on: 'yes' }))).toBeNull();
    expect(parseDuelMessage(JSON.stringify({ t: 'lab', op: 'answer' }))).toEqual({ t: 'lab', op: 'answer' });
    expect(parseDuelMessage(JSON.stringify({ t: 'lab', op: 'win' }))).toBeNull();
    expect(parseDuelMessage(JSON.stringify({ t: 'hello', v: 1, name: 'Alex', cid: 'not a cid!' }))).toEqual({ t: 'hello', v: 1, name: 'Alex' });
    expect(parseDuelMessage('{')).toBeNull();
  });
});

describe('Five Frames Duel: hard mode and best of three (NG1)', () => {
  it('hard mode keeps ✓ letters in place and uses every • letter', async () => {
    const { hardModeMiss } = await import('./duel.ts');
    // CRANE vs SLATE: A and E are ✓ (places 2 and 4), nothing else.
    expect(hardModeMiss(['slate'], 'crane', 'brick')).toEqual({ letter: 'a', at: 2 });
    expect(hardModeMiss(['slate'], 'crane', 'shame')).toBeNull();
    // CRANE vs NACRE: every letter is in the word but out of place (•): all five must come back.
    expect(hardModeMiss(['nacre'], 'crane', 'brace')).toEqual({ letter: 'n' });
    expect(hardModeMiss(['nacre'], 'crane', 'crane')).toBeNull();
    // GEESE vs EERIE: E ✓ at places 1 and 4, a third E • : three E's, two of them in place.
    expect(hardModeMiss(['geese'], 'eerie', 'eerie')).toBeNull();
    expect(hardModeMiss(['geese'], 'eerie', 'eaten')).toEqual({ letter: 'e', at: 1 });
    expect(hardModeMiss(['geese'], 'eerie', 'beige')).toEqual({ letter: 'e' });
    expect(hardModeMiss([], 'crane', 'zzzzz')).toBeNull();
  });

  it('hard mode works with Turkish letters', async () => {
    const { hardModeMiss } = await import('./duel.ts');
    // KALEM vs KILIÇ: K ✓ at 0, L ✓ at 2.
    expect(hardModeMiss(['kalem'], 'kılıç', 'kalın')).toBeNull();
    expect(hardModeMiss(['kalem'], 'kılıç', 'kaşık')).toEqual({ letter: 'l', at: 2 });
    expect(hardModeMiss(['kalem'], 'kılıç', 'sabun')).toEqual({ letter: 'k', at: 0 });
  });

  it('a best-of-three match ends at two wins or after three games', async () => {
    const { matchOver, matchWinner } = await import('./duel.ts');
    expect(matchOver(1, [1, 0], 1)).toBe(true);
    expect(matchOver(3, [1, 0], 1)).toBe(false);
    expect(matchOver(3, [1, 1], 2)).toBe(false);
    expect(matchOver(3, [2, 0], 2)).toBe(true);
    expect(matchOver(3, [1, 1], 3)).toBe(true);
    expect(matchWinner([2, 1])).toBe(0);
    expect(matchWinner([1, 1])).toBeNull();
    // GMP b: any number of seats; a tie at the top is no winner.
    expect(matchWinner([0, 1, 2, 0, 1, 0])).toBe(2);
    expect(matchWinner([2, 0, 2])).toBeNull();
    expect(matchWinner([0, 0, 0])).toBeNull();
  });

  it('copies the settings message', () => {
    expect(parseDuelMessage(JSON.stringify({ t: 'settings', bestOf: 3, hard: true }))).toEqual({ t: 'settings', bestOf: 3, hard: true });
    expect(parseDuelMessage(JSON.stringify({ t: 'settings', bestOf: 2 }))).toBeNull();
    expect(parseDuelMessage(JSON.stringify({ t: 'settings', hard: 'yes' }))).toBeNull();
  });
});

// GMP (owner, 15 Nov 2026): watchers see every board's letters live; a player only their own (the others as marks).
describe('who sees the letters', () => {
  it('a player sees only their own letters while the game goes on', () => {
    expect(duelWordsVisible(0, 0, false, false)).toBe(true);
    expect(duelWordsVisible(0, 1, false, false)).toBe(false);
  });
  it('a seated player never gets the watcher view', () => {
    expect(duelWordsVisible(1, 0, true, false)).toBe(false);
  });
  it('a watcher (no seat) sees every board\'s letters live; a connection without hello sees none', () => {
    expect(duelWordsVisible(-1, 0, true, false)).toBe(true);
    expect(duelWordsVisible(-1, 1, true, false)).toBe(true);
    expect(duelWordsVisible(-1, 0, false, false)).toBe(false);
  });
  it('everyone sees every board at the end', () => {
    expect(duelWordsVisible(1, 0, false, true)).toBe(true);
  });
});
