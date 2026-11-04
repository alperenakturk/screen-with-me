import { describe, expect, it } from 'vitest';
import { canMove, isXoxState, newGame, play, rematch } from './xox.ts';

describe('xox', () => {
  it('lets players alternate and rejects out-of-turn or taken cells', () => {
    let s = newGame();
    expect(canMove(s, 'O', 0)).toBe(false);
    s = play(s, 'X', 4)!;
    expect(s.turn).toBe('O');
    expect(play(s, 'O', 4)).toBeNull();
    expect(play(s, 'X', 0)).toBeNull();
    expect(play(s, 'O', 9)).toBeNull();
    expect(play(s, 'O', 1.5)).toBeNull();
  });

  it('detects a win with the winning line and stops the game', () => {
    let s = newGame();
    for (const [mark, cell] of [['X', 0], ['O', 3], ['X', 1], ['O', 4], ['X', 2]] as const) s = play(s, mark, cell)!;
    expect(s.winner).toBe('X');
    expect(s.line).toEqual([0, 1, 2]);
    expect(play(s, 'O', 5)).toBeNull();
  });

  it('detects a draw', () => {
    let s = newGame();
    const moves = [4, 0, 8, 2, 1, 7, 6, 3, 5];
    moves.forEach((cell, i) => (s = play(s, i % 2 ? 'O' : 'X', cell)!));
    expect(s.winner).toBe('draw');
    expect(s.line).toBeNull();
  });

  it('alternates the starter on rematch', () => {
    const s = rematch(newGame('X'));
    expect(s.starter).toBe('O');
    expect(s.turn).toBe('O');
    expect(s.board.every((c) => c === null)).toBe(true);
  });

  it('validates stored state', () => {
    expect(isXoxState(newGame())).toBe(true);
    expect(isXoxState({ board: [], turn: 'X' })).toBe(false);
    expect(isXoxState({ ...newGame(), board: Array(9).fill('Z') })).toBe(false);
  });
});

import { parseGameMessage } from './protocol.ts';

describe('parseGameMessage', () => {
  it('accepts valid messages and rejects the rest', () => {
    expect(parseGameMessage(JSON.stringify({ t: 'hello', v: 1, game: 'xox', name: ' Ali ', cid: 'abcdefgh12' }))).toEqual({
      t: 'hello',
      v: 1,
      game: 'xox',
      name: 'Ali',
      cid: 'abcdefgh12',
    });
    expect(parseGameMessage(JSON.stringify({ t: 'hello', v: 1, game: 'satranç', name: 'Ali' }))).toBeNull();
    expect(parseGameMessage(JSON.stringify({ t: 'move', cell: 4 }))).toEqual({ t: 'move', cell: 4 });
    expect(parseGameMessage(JSON.stringify({ t: 'move', cell: 4096 }))).toBeNull();
    expect(parseGameMessage(JSON.stringify({ t: 'sit', seat: 1 }))).toEqual({ t: 'sit', seat: 1 });
    expect(parseGameMessage(JSON.stringify({ t: 'react', emoji: '🔥' }))).toEqual({ t: 'react', emoji: '🔥' });
    expect(parseGameMessage(JSON.stringify({ t: 'react', emoji: '💩' }))).toBeNull();
    expect(parseGameMessage('not json')).toBeNull();
  });
});
