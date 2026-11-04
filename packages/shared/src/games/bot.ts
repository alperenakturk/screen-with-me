// Glowbeam, the bot of 🎲 Classics (owner's pick 6 A: someone alone in the room plays against Glowbeam). It plays on
// the server with the same rules the players use, so it can never cheat. Two levels: easy (often a random move, never
// looks far) and medium (a small minimax search). Pure: no timers, no randomness except the `random` passed in.

import type { BoardState, Mark } from './board.ts';
import { other } from './board.ts';
import { COLS, ROWS, dropRow, play as playFour } from './four.ts';
import { legalMoves as damaMoves, play as playDama, type DamaState } from './dama.ts';
import { LINES, play as playXox } from './xox.ts';

export type BotKind = 'xox' | 'four' | 'dama';
export type BotLevel = 1 | 2;

/** Every legal move of the side to play. */
export function movesOf(kind: BotKind, state: BoardState): number[] {
  if (state.winner !== null) return [];
  if (kind === 'xox') return state.board.flatMap((c, i) => (c === null ? [i] : []));
  if (kind === 'four') return Array.from({ length: COLS }, (_, c) => c).filter((c) => dropRow(state.board, c) !== -1);
  return damaMoves(state as DamaState);
}

const PLAY = { xox: playXox, four: playFour, dama: playDama } as const;
const apply = (kind: BotKind, state: BoardState, move: number) => PLAY[kind](state, state.turn, move);

/** How good the position is for `me` (positive = good), when nobody has won yet. */
function evaluate(kind: BotKind, state: BoardState, me: Mark): number {
  if (kind === 'xox') {
    let score = 0;
    for (const line of LINES) {
      const cells = line.map((i) => state.board[i]);
      const mine = cells.filter((c) => c === me).length;
      const theirs = cells.filter((c) => c === other(me)).length;
      if (!theirs) score += mine * mine;
      if (!mine) score -= theirs * theirs;
    }
    return score;
  }
  if (kind === 'four') {
    let score = 0;
    const b = state.board;
    const windows: number[][] = [];
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        for (const [dr, dc] of [
          [0, 1],
          [1, 0],
          [1, 1],
          [1, -1],
        ] as const) {
          const cells = [0, 1, 2, 3].map((k) => [r + dr * k, c + dc * k] as const);
          if (cells.every(([rr, cc]) => rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS)) windows.push(cells.map(([rr, cc]) => rr * COLS + cc));
        }
    for (const w of windows) {
      const mine = w.filter((i) => b[i] === me).length;
      const theirs = w.filter((i) => b[i] === other(me)).length;
      if (!theirs) score += [0, 1, 4, 16, 0][mine]!;
      if (!mine) score -= [0, 1, 5, 20, 0][theirs]!;
    }
    // The middle column is worth more.
    for (let r = 0; r < ROWS; r++) score += b[r * COLS + 3] === me ? 2 : b[r * COLS + 3] === other(me) ? -2 : 0;
    return score;
  }
  const s = state as DamaState;
  const kings = new Set(s.kings);
  let score = 0;
  s.board.forEach((c, i) => {
    if (c === null) return;
    const row = Math.floor(i / 8);
    const advance = c === 'X' ? 7 - row : row;
    const value = kings.has(i) ? 3 : 1 + advance * 0.04;
    score += c === me ? value : -value;
  });
  return score;
}

const WIN = 10_000;
function search(kind: BotKind, state: BoardState, me: Mark, depth: number, alpha: number, beta: number): number {
  if (state.winner !== null) return state.winner === 'draw' ? 0 : state.winner === me ? WIN + depth : -WIN - depth;
  if (depth === 0) return evaluate(kind, state, me);
  const moves = movesOf(kind, state);
  if (!moves.length) return 0;
  const maximizing = state.turn === me;
  let best = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    const next = apply(kind, state, move);
    if (!next) continue;
    const value = search(kind, next, me, depth - 1, alpha, beta);
    if (maximizing) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, value);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, value);
    }
    if (beta <= alpha) break;
  }
  return best;
}

const DEPTH: Record<BotKind, Record<BotLevel, number>> = { xox: { 1: 1, 2: 9 }, four: { 1: 2, 2: 5 }, dama: { 1: 1, 2: 3 } };
/** Easy Glowbeam plays a random move this often. */
const EASY_RANDOM = 0.35;

/** Glowbeam's move for the side to play, or null when there is none. */
export function botMove(kind: BotKind, state: BoardState, level: BotLevel, random: () => number = Math.random): number | null {
  const moves = movesOf(kind, state);
  if (!moves.length) return null;
  if (level === 1 && random() < EASY_RANDOM) return moves[Math.floor(random() * moves.length)]!;
  const me = state.turn;
  let best: number[] = [];
  let bestValue = -Infinity;
  for (const move of moves) {
    const next = apply(kind, state, move);
    if (!next) continue;
    const value = search(kind, next, me, DEPTH[kind][level] - 1, -Infinity, Infinity);
    if (value > bestValue) {
      bestValue = value;
      best = [move];
    } else if (value === bestValue) best.push(move);
  }
  return best.length ? best[Math.floor(random() * best.length)]! : moves[0]!;
}
