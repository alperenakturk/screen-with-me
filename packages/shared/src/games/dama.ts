// Dama (Turkish draughts), the first new board of 🎲 Classics (owner's pick 5 A, `docs/internal/design/games/classics.md`).
// The server checks every move with these rules; the page draws with them; the Stub bot plays with them.
//
// Rules (Turkish dama):
// - 8 × 8 board (cells 0–63, row 0 at the top). Each side has 16 men on its 2nd and 3rd rows; X (white) starts at the
//   bottom, moves up and plays first.
// - A man steps one square forward or sideways (never backward, never diagonally).
// - A man captures by jumping an enemy piece next to it (forward or sideways) onto the empty square behind it.
// - A man reaching the far row becomes a king (dama) at the end of its move. A king moves any distance along a row or
//   column, and captures at a distance: it passes empty squares, jumps exactly one enemy piece and lands on any empty
//   square beyond it.
// - Capturing is compulsory, and you must take the most pieces you can. A capture goes on with the same piece while it
//   can (each jumped piece is removed at once); a king may not turn straight back (180°) between two captures.
// - You win when the other side has no pieces or no legal move. A game is a draw after 60 moves in a row without a
//   capture or a man's move.
//
// A move is `from * 64 + to`. During a capture chain the same player plays again (`chain` is the capturing piece).

import { isBoardState, other, type BoardRules, type BoardState, type Cell, type Mark } from './board.ts';

export const SIZE = 8;
const CELLS = SIZE * SIZE;
/** Quiet moves (no capture, no man moving) that end a game in a draw. */
export const QUIET_DRAW = 60;

export interface DamaState extends BoardState {
  /** Cells holding a king. */
  kings: number[];
  /** The piece that must go on capturing (same player's turn), or null. */
  chain: number | null;
  /** The direction of the last capture in a chain (a king may not turn straight back). */
  chainDir: number | null;
  /** Moves in a row without a capture or a man's move. */
  quiet: number;
}

/** Up, down, left, right as [row step, column step]. */
const DIRS: readonly (readonly [number, number])[] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
const OPPOSITE = [1, 0, 3, 2];
const forward = (mark: Mark) => (mark === 'X' ? 0 : 1);
const rowOf = (cell: number) => Math.floor(cell / SIZE);
const colOf = (cell: number) => cell % SIZE;
const at = (row: number, col: number) => row * SIZE + col;
const inside = (row: number, col: number) => row >= 0 && row < SIZE && col >= 0 && col < SIZE;
/** Directions a piece may use: a man never goes backward. */
const dirsFor = (mark: Mark, king: boolean): number[] => (king ? [0, 1, 2, 3] : [forward(mark), 2, 3]);
const lastRow = (mark: Mark) => (mark === 'X' ? 0 : SIZE - 1);

export function newGame(starter: Mark = 'X'): DamaState {
  const board = Array<Cell>(CELLS).fill(null);
  for (let col = 0; col < SIZE; col++) {
    board[at(1, col)] = 'O';
    board[at(2, col)] = 'O';
    board[at(5, col)] = 'X';
    board[at(6, col)] = 'X';
  }
  return { board, turn: starter, winner: null, line: null, starter, kings: [], chain: null, chainDir: null, quiet: 0 };
}

interface Jump {
  to: number;
  over: number;
  dir: number;
}

/** The captures one piece can make from `cell` right now. */
function jumps(board: readonly Cell[], kings: ReadonlySet<number>, cell: number, mark: Mark, forbid: number | null): Jump[] {
  const king = kings.has(cell);
  const out: Jump[] = [];
  for (const dir of dirsFor(mark, king)) {
    if (forbid !== null && king && dir === OPPOSITE[forbid]) continue;
    const [dr, dc] = DIRS[dir]!;
    let row = rowOf(cell) + dr;
    let col = colOf(cell) + dc;
    if (king) while (inside(row, col) && board[at(row, col)] === null) (row += dr), (col += dc);
    if (!inside(row, col) || board[at(row, col)] !== other(mark)) continue;
    const over = at(row, col);
    row += dr;
    col += dc;
    while (inside(row, col) && board[at(row, col)] === null) {
      out.push({ to: at(row, col), over, dir });
      if (!king) break;
      row += dr;
      col += dc;
    }
  }
  return out;
}

function afterJump(board: readonly Cell[], kings: ReadonlySet<number>, from: number, jump: Jump): { board: Cell[]; kings: Set<number> } {
  const next = board.slice();
  next[jump.to] = next[from]!;
  next[from] = null;
  next[jump.over] = null;
  const nextKings = new Set(kings);
  nextKings.delete(jump.over);
  if (nextKings.delete(from)) nextKings.add(jump.to);
  return { board: next, kings: nextKings };
}

/** The most pieces this piece can still take in one chain from here. */
function longest(board: readonly Cell[], kings: ReadonlySet<number>, cell: number, mark: Mark, forbid: number | null): number {
  let best = 0;
  for (const jump of jumps(board, kings, cell, mark, forbid)) {
    const next = afterJump(board, kings, cell, jump);
    best = Math.max(best, 1 + longest(next.board, next.kings, jump.to, mark, jump.dir));
  }
  return best;
}

/** Every legal move for the player to move (`from * 64 + to`). */
export function legalMoves(state: DamaState): number[] {
  if (state.winner !== null) return [];
  const mark = state.turn;
  const kings = new Set(state.kings);
  const pieces = state.chain !== null ? [state.chain] : state.board.flatMap((c, i) => (c === mark ? [i] : []));
  // Captures first: only those on a longest chain count.
  let most = 0;
  const captures: { move: number; score: number }[] = [];
  for (const cell of pieces) {
    for (const jump of jumps(state.board, kings, cell, mark, state.chain !== null ? state.chainDir : null)) {
      const next = afterJump(state.board, kings, cell, jump);
      const score = 1 + longest(next.board, next.kings, jump.to, mark, jump.dir);
      most = Math.max(most, score);
      captures.push({ move: cell * CELLS + jump.to, score });
    }
  }
  if (most > 0) return captures.filter((c) => c.score === most).map((c) => c.move);
  if (state.chain !== null) return [];
  const moves: number[] = [];
  for (const cell of pieces) {
    const king = kings.has(cell);
    for (const dir of dirsFor(mark, king)) {
      const [dr, dc] = DIRS[dir]!;
      let row = rowOf(cell) + dr;
      let col = colOf(cell) + dc;
      while (inside(row, col) && state.board[at(row, col)] === null) {
        moves.push(cell * CELLS + at(row, col));
        if (!king) break;
        row += dr;
        col += dc;
      }
    }
  }
  return moves;
}

/** The side to play must capture now (every legal move is a capture). */
export function mustCapture(state: DamaState): boolean {
  if (state.winner !== null) return false;
  const kings = new Set(state.kings);
  const pieces = state.chain !== null ? [state.chain] : state.board.flatMap((c, i) => (c === state.turn ? [i] : []));
  return pieces.some((cell) => jumps(state.board, kings, cell, state.turn, state.chain !== null ? state.chainDir : null).length > 0);
}

export function play(state: BoardState, mark: Mark, move: number): DamaState | null {
  const s = state as DamaState;
  if (s.winner !== null || s.turn !== mark || !Number.isInteger(move) || !legalMoves(s).includes(move)) return null;
  const from = Math.floor(move / CELLS);
  const to = move % CELLS;
  const kings = new Set(s.kings);
  const jump = jumps(s.board, kings, from, mark, s.chain !== null ? s.chainDir : null).find((j) => j.to === to);
  let board: Cell[];
  let nextKings: Set<number>;
  if (jump) {
    ({ board, kings: nextKings } = afterJump(s.board, kings, from, jump));
    // The chain goes on while this piece can still take.
    if (longest(board, nextKings, to, mark, jump.dir) > 0) {
      return { ...s, board, kings: [...nextKings].sort((a, b) => a - b), chain: to, chainDir: jump.dir, quiet: 0, last: to };
    }
  } else {
    board = s.board.slice();
    board[to] = board[from]!;
    board[from] = null;
    nextKings = new Set(kings);
    if (nextKings.delete(from)) nextKings.add(to);
  }
  const wasMan = !kings.has(from);
  if (wasMan && rowOf(to) === lastRow(mark)) nextKings.add(to);
  const next: DamaState = {
    ...s,
    board,
    kings: [...nextKings].sort((a, b) => a - b),
    turn: other(mark),
    chain: null,
    chainDir: null,
    quiet: jump || wasMan ? 0 : s.quiet + 1,
    last: to,
  };
  if (!board.includes(other(mark)) || legalMoves(next).length === 0) next.winner = mark;
  else if (next.quiet >= QUIET_DRAW) next.winner = 'draw';
  return next;
}

export function rematch(state: BoardState): DamaState {
  return newGame(other(state.starter));
}

export function isDamaState(x: unknown): x is DamaState {
  if (!isBoardState(x, CELLS, 0)) return false;
  const s = x as DamaState;
  const cell = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < CELLS;
  return (
    Array.isArray(s.kings) &&
    s.kings.every((k) => cell(k) && s.board[k] !== null) &&
    (s.chain === null || (cell(s.chain) && s.board[s.chain] === s.turn)) &&
    (s.chainDir === null || (Number.isInteger(s.chainDir) && s.chainDir >= 0 && s.chainDir < 4)) &&
    Number.isInteger(s.quiet) &&
    s.quiet >= 0
  );
}

export const DAMA: BoardRules = { moves: CELLS * CELLS, newGame, play, rematch, isState: isDamaState };
