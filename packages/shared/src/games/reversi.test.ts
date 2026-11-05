import { describe, expect, it } from 'vitest';
import type { Cell } from './board.ts';
import { botMove } from './bot.ts';
import { labPosition } from './lab-positions.ts';
import { counts, flipsOf, isReversiState, legalCells, legalMoves, newGame, play, rematch, REVERSI, type ReversiState } from './reversi.ts';

/** A board from 8 strings of `x` / `o` / `.`. */
function boardOf(rows: string[]): Cell[] {
  return rows.join('').split('').map((c) => (c === 'x' ? 'X' : c === 'o' ? 'O' : null));
}

describe('reversi', () => {
  it('starts with two discs each in the middle and four legal moves', () => {
    const s = newGame();
    expect(counts(s.board)).toEqual({ X: 2, O: 2 });
    expect(legalMoves(s)).toEqual([19, 26, 37, 44]);
    expect(isReversiState(s)).toBe(true);
  });

  it('turns over the closed line and passes the turn', () => {
    const s = play(newGame(), 'X', 19)!;
    expect(s.board[19]).toBe('X');
    expect(s.board[27]).toBe('X');
    expect(s.flipped).toEqual([27]);
    expect(s.turn).toBe('O');
    expect(s.last).toBe(19);
    expect(counts(s.board)).toEqual({ X: 4, O: 1 });
  });

  it('refuses out of turn, taken, non-closing and out-of-range cells', () => {
    const s = newGame();
    expect(play(s, 'O', 19)).toBeNull();
    expect(play(s, 'X', 27)).toBeNull();
    expect(play(s, 'X', 0)).toBeNull();
    expect(play(s, 'X', 64)).toBeNull();
    expect(play(s, 'X', 1.5)).toBeNull();
  });

  it('turns over several lines at once', () => {
    const board = boardOf([
      'x.x.x...',
      '.ooo....',
      'xo.ox...',
      '.ooo....',
      'x.x.x...',
      '........',
      '........',
      '........',
    ]);
    expect(flipsOf(board, 'X', 18)).toEqual([9, 10, 11, 17, 19, 25, 26, 27]);
  });

  it('lets the other side pass when it has no move, and ends when neither can move', () => {
    // Light's discs sit next to dark corners: light can never close a line, dark has two moves.
    const pass: ReversiState = { ...newGame(), board: boardOf(['xo......', '........', '........', '........', '........', '........', '........', '......ox']) };
    expect(legalCells(pass.board, 'O')).toEqual([]);
    expect(legalCells(pass.board, 'X')).toEqual([2, 61]);
    const after = play(pass, 'X', 2)!;
    expect(after.turn).toBe('X');
    expect(after.passed).toBe('O');
    expect(after.winner).toBeNull();
    // Dark's last move: nobody can move any more, so the game ends and the discs are counted (dark 6, light 0).
    const end = play(after, 'X', 61)!;
    expect(end.winner).toBe('X');
    expect(end.passed).toBeNull();
    expect(counts(end.board)).toEqual({ X: 6, O: 0 });
  });

  it('counts the discs at the end: more wins, equal is a draw', () => {
    const last = labPosition('reversi', 'lastmove') as ReversiState;
    expect(last).not.toBeNull();
    expect(legalMoves(last)).toEqual([63]);
    const done = play(last, 'X', 63)!;
    expect(done.board.every((c) => c !== null)).toBe(true);
    expect(done.winner).toBe('X');
    // Light 33, dark 30, one cell left: dark plays it and turns one light disc over, 32–32 is a draw.
    const even: ReversiState = { ...newGame(), board: boardOf(['oooooooo', 'oooooooo', 'oooooooo', 'oooooooo', 'xxxxxxxx', 'xxxxxxxx', 'xxxxxxxx', 'xxxxxo.x']) };
    const drawn = play(even, 'X', 62)!;
    expect(counts(drawn.board)).toEqual({ X: 32, O: 32 });
    expect(drawn.winner).toBe('draw');
  });

  it('swaps who starts on a rematch and checks stored states', () => {
    expect(rematch(newGame('X')).turn).toBe('O');
    expect(REVERSI.isState({ ...newGame(), flipped: [70] })).toBe(false);
    expect(REVERSI.isState({ ...newGame(), passed: 'Z' })).toBe(false);
    expect(REVERSI.isState({ ...newGame(), board: [] })).toBe(false);
  });
});

describe('reversi bot', () => {
  it('always plays a legal move, and takes a corner when it can', () => {
    let s: ReversiState = newGame();
    for (let n = 0; n < 60 && s.winner === null; n++) {
      const move = botMove('reversi', s, n % 2 ? 2 : 1, () => 0.9);
      expect(move).not.toBeNull();
      expect(legalMoves(s)).toContain(move);
      s = play(s, s.turn, move!)!;
    }
    expect(s.winner).not.toBeNull();
    // X can take a1 (0) or play elsewhere: medium takes the corner.
    const corner: ReversiState = { ...newGame(), board: boardOf(['.o......', '.ox.....', '..ox....', '...x....', '........', '........', '........', '........']) };
    expect(legalMoves(corner)).toContain(0);
    expect(botMove('reversi', corner, 2, () => 0.5)).toBe(0);
  });

  it('medium beats easy more often than not', { timeout: 60_000 }, () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let medium = 0;
    for (let game = 0; game < 4; game++) {
      let s: ReversiState = newGame(game % 2 ? 'O' : 'X');
      const mediumMark = game % 2 ? 'O' : 'X';
      while (s.winner === null) s = play(s, s.turn, botMove('reversi', s, s.turn === mediumMark ? 2 : 1, random)!)!;
      if (s.winner === mediumMark) medium++;
    }
    expect(medium).toBeGreaterThanOrEqual(3);
  });
});
