// Dört Taş (dört sıralı): 7 sütun × 6 satır. Oyuncu bir sütun seçer, taş o sütunda en alttaki boş yere düşer.
// Yatay, dikey ya da çapraz dört aynı taş kazanır; tahta dolarsa berabere.

import { isBoardState, other, type BoardRules, type BoardState, type Cell, type Mark } from './board.ts';

export const COLS = 7;
export const ROWS = 6;
const SIZE = COLS * ROWS;

export function newGame(starter: Mark = 'X'): BoardState {
  return { board: Array<Cell>(SIZE).fill(null), turn: starter, winner: null, line: null, starter };
}

/** Sütunda taşın düşeceği satır; sütun doluysa -1. */
export function dropRow(board: readonly Cell[], col: number): number {
  for (let row = ROWS - 1; row >= 0; row--) if (board[row * COLS + col] === null) return row;
  return -1;
}

/** Konan taştan dört yöne bakar; dört (ya da fazlası) aynıysa o diziyi döner. */
function winLine(board: readonly Cell[], row: number, col: number, mark: Mark): number[] | null {
  for (const [dr, dc] of [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ] as const) {
    const cells = [row * COLS + col];
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r * COLS + c] === mark) {
        cells.push(r * COLS + c);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (cells.length >= 4) return cells.sort((a, b) => a - b);
  }
  return null;
}

export function play(state: BoardState, mark: Mark, col: number): BoardState | null {
  if (state.winner !== null || state.turn !== mark || !Number.isInteger(col) || col < 0 || col >= COLS) return null;
  const row = dropRow(state.board, col);
  if (row === -1) return null;
  const board = state.board.slice();
  const cell = row * COLS + col;
  board[cell] = mark;
  const line = winLine(board, row, col, mark);
  const full = board.every((c) => c !== null);
  return { board, turn: other(mark), winner: line ? mark : full ? 'draw' : null, line, starter: state.starter, last: cell };
}

export function rematch(state: BoardState): BoardState {
  return newGame(other(state.starter));
}

export function isFourState(x: unknown): x is BoardState {
  return isBoardState(x, SIZE, 4);
}

export const FOUR: BoardRules = { moves: COLS, newGame, play, rematch, isState: isFourState };
