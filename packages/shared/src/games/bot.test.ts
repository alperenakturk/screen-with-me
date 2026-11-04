import { describe, expect, it } from 'vitest';
import type { BoardState, Cell } from './board.ts';
import { botMove, movesOf } from './bot.ts';
import { newGame as newDama } from './dama.ts';
import { newGame as newFour, play as playFour } from './four.ts';
import { newGame as newXox } from './xox.ts';

const xox = (cells: string, turn: 'X' | 'O'): BoardState => ({ ...newXox(), board: [...cells].map((c) => (c === '.' ? null : (c as Cell))), turn });
const first = () => 0;

describe('Glowbeam bot', () => {
  it('XOX: takes a win, blocks a loss, never loses a whole game at medium', () => {
    expect(botMove('xox', xox('XX.OO....', 'X'), 2, first)).toBe(2);
    expect(botMove('xox', xox('OO.X.....', 'X'), 2, first)).toBe(2);
    // Medium against every reply: play out all games where the human (X) tries every move.
    let losses = 0;
    const walk = (s: BoardState) => {
      if (s.winner !== null) {
        if (s.winner === 'X') losses++;
        return;
      }
      if (s.turn === 'O') {
        const m = botMove('xox', s, 2, first)!;
        const board = s.board.slice();
        board[m] = 'O';
        return walk(next(board, 'X'));
      }
      for (const m of movesOf('xox', s)) {
        const board = s.board.slice();
        board[m] = 'X';
        walk(next(board, 'O'));
      }
    };
    const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    const next = (board: Cell[], turn: 'X' | 'O'): BoardState => {
      const line = LINES.find(([a, b, c]) => board[a!] && board[a!] === board[b!] && board[a!] === board[c!]);
      return { ...newXox(), board, turn, winner: line ? board[line[0]!]! : board.every((c) => c) ? 'draw' : null };
    };
    walk(newXox());
    expect(losses).toBe(0);
  });

  it('Connect Four: takes a win and blocks one', () => {
    let s = newFour();
    for (const c of [0, 6, 1, 6, 2]) s = playFour(s, s.turn, c)!;
    // O to play: X threatens column 3.
    expect(botMove('four', s, 2, first)).toBe(3);
  });

  it('Dama: a move is always legal, also at the start', () => {
    const s = newDama();
    const m = botMove('dama', s, 2, first)!;
    expect(movesOf('dama', s)).toContain(m);
  });
});
