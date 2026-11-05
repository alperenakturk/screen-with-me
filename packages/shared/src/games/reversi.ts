// Reversi on the 🎲 Classics shelf (the owner: "add the other games slowly"). 8 × 8, X (dark) and O (light) put one
// disc a turn on an empty cell; it must close at least one straight line (row, column or diagonal) of the other's
// discs between itself and a disc of its own, and every closed line turns over. A side without a legal move passes
// (the turn stays with the other side); when neither can move the game ends and the side with more discs wins.
// Cells: left to right, top to bottom; a move is the cell (0–63).

import { isBoardState, other, type BoardRules, type BoardState, type Cell, type Mark } from './board.ts';

export const SIZE = 8;
const CELLS = SIZE * SIZE;
const DIRS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

export interface ReversiState extends BoardState {
  /** The side that had to pass on the last turn (no legal move), so the page can say so; null otherwise. */
  passed: Mark | null;
  /** The discs the last move turned over (for the page's flip animation). */
  flipped: number[];
}

export function newGame(starter: Mark = 'X'): ReversiState {
  const board = Array<Cell>(CELLS).fill(null);
  // The usual start: two of each in the middle, crossed (d4 / e5 light, e4 / d5 dark).
  board[27] = 'O';
  board[36] = 'O';
  board[28] = 'X';
  board[35] = 'X';
  return { board, turn: starter, winner: null, line: null, starter, passed: null, flipped: [] };
}

/** The discs `mark` would turn over by playing `cell` (empty when the move is not legal). */
export function flipsOf(board: readonly Cell[], mark: Mark, cell: number): number[] {
  if (!Number.isInteger(cell) || cell < 0 || cell >= CELLS || board[cell] !== null) return [];
  const row = Math.floor(cell / SIZE);
  const col = cell % SIZE;
  const them = other(mark);
  const out: number[] = [];
  for (const [dr, dc] of DIRS) {
    const run: number[] = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r * SIZE + c] === them) {
      run.push(r * SIZE + c);
      r += dr;
      c += dc;
    }
    if (run.length && r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r * SIZE + c] === mark) out.push(...run);
  }
  return out.sort((a, b) => a - b);
}

/** Whether `mark` playing the empty `cell` closes any line (no lists built: the bot asks this a lot). */
function closesAny(board: readonly Cell[], mark: Mark, cell: number): boolean {
  const row = Math.floor(cell / SIZE);
  const col = cell % SIZE;
  const them = other(mark);
  for (const [dr, dc] of DIRS) {
    let r = row + dr;
    let c = col + dc;
    let seen = 0;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r * SIZE + c] === them) {
      seen++;
      r += dr;
      c += dc;
    }
    if (seen && r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r * SIZE + c] === mark) return true;
  }
  return false;
}

/** How many legal cells `mark` has. */
export function mobility(board: readonly Cell[], mark: Mark): number {
  let n = 0;
  for (let i = 0; i < CELLS; i++) if (board[i] === null && closesAny(board, mark, i)) n++;
  return n;
}

/** Every legal cell for `mark`. */
export function legalCells(board: readonly Cell[], mark: Mark): number[] {
  const out: number[] = [];
  for (let i = 0; i < CELLS; i++) if (board[i] === null && closesAny(board, mark, i)) out.push(i);
  return out;
}

/** The legal moves of the side to play (none once the game is over). */
export function legalMoves(state: ReversiState): number[] {
  return state.winner === null ? legalCells(state.board, state.turn) : [];
}

/** Discs on the board per side. */
export function counts(board: readonly Cell[]): { X: number; O: number } {
  let X = 0;
  let O = 0;
  for (const c of board) {
    if (c === 'X') X++;
    else if (c === 'O') O++;
  }
  return { X, O };
}

export function play(state: BoardState, mark: Mark, cell: number): ReversiState | null {
  const s = state as ReversiState;
  if (s.winner !== null || s.turn !== mark) return null;
  const flipped = flipsOf(s.board, mark, cell);
  if (!flipped.length) return null;
  const board = s.board.slice();
  board[cell] = mark;
  for (const i of flipped) board[i] = mark;
  const them = other(mark);
  const base = { board, line: null, starter: s.starter, last: cell, flipped };
  if (mobility(board, them)) return { ...base, turn: them, winner: null, passed: null };
  // The other side has no move: it passes, I play again; when I can't either, the game is over.
  if (mobility(board, mark)) return { ...base, turn: mark, winner: null, passed: them };
  const n = counts(board);
  return { ...base, turn: them, winner: n.X === n.O ? 'draw' : n.X > n.O ? 'X' : 'O', passed: null };
}

export function rematch(state: BoardState): ReversiState {
  return newGame(other(state.starter));
}

export function isReversiState(x: unknown): x is ReversiState {
  const s = x as ReversiState | null;
  return (
    isBoardState(x, CELLS, 0) &&
    !!s &&
    (s.passed === null || s.passed === 'X' || s.passed === 'O') &&
    Array.isArray(s.flipped) &&
    s.flipped.length < CELLS &&
    s.flipped.every((i) => Number.isInteger(i) && i >= 0 && i < CELLS)
  );
}

export const REVERSI: BoardRules = { moves: CELLS, newGame, play, rematch, isState: isReversiState };
