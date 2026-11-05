// Test Lab (card DL3b): ready-made board positions for the Classics. Only a server started with the local lab flag
// accepts them (`SWM_LAB_SERVER`, never live); the rules check every position like a real game state.

import type { BoardState, Cell } from './board.ts';
import { isBackgammonState, newGame as newBackgammon, type BackgammonState } from './backgammon.ts';
import { isChessState, newGame as newChess, type ChessState } from './chess.ts';
import { isDamaState, newGame as newDama, type DamaState } from './dama.ts';
import type { GameKind } from './protocol.ts';
import { isReversiState, newGame as newReversi, type ReversiState } from './reversi.ts';

/** The positions a lab can set, per board. */
export const LAB_POSITIONS = {
  /** Chess: white (X) mates in one, Ra1–a8 (`56 * 64 + 0`). */
  chess: ['mate1'],
  /** Dama: white's man on a2 must take three black men in one chain (up, up, then sideways). */
  dama: ['chain'],
  /** Backgammon: every checker home on both sides, white to roll and bear off. */
  backgammon: ['bearoff'],
  /** Reversi: one empty cell left (h1, bottom right); dark (X) plays it, turns g1 over and wins. */
  reversi: ['lastmove'],
} as const satisfies Partial<Record<GameKind, readonly string[]>>;

export type LabPositionKind = keyof typeof LAB_POSITIONS;

export function isLabPosition(kind: string, name: unknown): kind is LabPositionKind {
  return kind in LAB_POSITIONS && (LAB_POSITIONS[kind as LabPositionKind] as readonly string[]).includes(name as string);
}

function chessMate1(): ChessState {
  const s = newChess('X');
  const board = Array<Cell>(64).fill(null);
  const kinds = Array<string>(64).fill('.');
  const put = (cell: number, mark: Cell, kind: string) => {
    board[cell] = mark;
    kinds[cell] = kind;
  };
  put(62, 'X', 'k'); // g1
  put(56, 'X', 'r'); // a1
  put(6, 'O', 'k'); // g8
  put(13, 'O', 'p'); // f7
  put(14, 'O', 'p'); // g7
  put(15, 'O', 'p'); // h7
  return { ...s, board, kinds: kinds.join(''), castle: '', ep: null, halfmove: 0, seen: [], check: false, end: null };
}

function damaChain(): DamaState {
  const s = newDama('X');
  const board = Array<Cell>(64).fill(null);
  board[48] = 'X'; // a2: jumps up over a3 and a5, then sideways over b6
  board[40] = 'O';
  board[24] = 'O';
  board[17] = 'O';
  board[63] = 'X';
  board[7] = 'O';
  return { ...s, board, kings: [], chain: null, chainDir: null, quiet: 0 };
}

function backgammonBearoff(): BackgammonState {
  const s = newBackgammon('X');
  const pts = Array<number>(24).fill(0);
  [3, 3, 3, 2, 2, 2].forEach((n, i) => {
    pts[i] = n;
    pts[23 - i] = -n;
  });
  return { ...s, pts, board: pts.map((n) => (n > 0 ? 'X' : n < 0 ? 'O' : null)), dice: [], rolled: [], passed: null };
}

function reversiLastMove(): ReversiState {
  const s = newReversi('X');
  // Light on the top three rows and on g1, dark everywhere else; h1 (63, bottom right) is the last empty cell.
  const board = Array.from({ length: 64 }, (_, i): Cell => (i < 24 || i === 62 ? 'O' : 'X'));
  board[63] = null;
  return { ...s, board, passed: null, flipped: [] };
}

/** The position, checked by the board's own state check (null if it doesn't pass). */
export function labPosition(kind: LabPositionKind, name: string): BoardState | null {
  if (!isLabPosition(kind, name)) return null;
  const state = kind === 'chess' ? chessMate1() : kind === 'dama' ? damaChain() : kind === 'reversi' ? reversiLastMove() : backgammonBearoff();
  const ok = kind === 'chess' ? isChessState(state) : kind === 'dama' ? isDamaState(state) : kind === 'reversi' ? isReversiState(state) : isBackgammonState(state);
  return ok ? state : null;
}
