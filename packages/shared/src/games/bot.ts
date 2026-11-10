// Stub, the bot of 🎲 Classics (owner's pick 6 A: someone alone in the room plays against Stub). It plays on
// the server with the same rules the players use, so it can never cheat. Two levels: easy (often a random move, never
// looks far) and medium (a small minimax search). Pure: no timers, no randomness except the `random` passed in.

import type { BoardState, Mark } from './board.ts';
import { other } from './board.ts';
import { COLS, ROWS, dropRow, play as playFour } from './four.ts';
import { ROLL, legalMoves as bgMoves, pips, play as playBg, type BackgammonState } from './backgammon.ts';
import { legalMoves as chessMoves, play as playChess, playLegal as playChessLegal, type ChessState } from './chess.ts';
import { legalMoves as damaMoves, play as playDama, type DamaState } from './dama.ts';
import { legalMoves as reversiMoves, mobility, play as playReversi, type ReversiState } from './reversi.ts';
import { LINES, play as playXox } from './xox.ts';

export type BotKind = 'xox' | 'four' | 'dama' | 'chess' | 'backgammon' | 'reversi';
export type BotLevel = 1 | 2;

/** Every legal move of the side to play. */
export function movesOf(kind: BotKind, state: BoardState): number[] {
  if (state.winner !== null) return [];
  if (kind === 'xox') return state.board.flatMap((c, i) => (c === null ? [i] : []));
  if (kind === 'four') return Array.from({ length: COLS }, (_, c) => c).filter((c) => dropRow(state.board, c) !== -1);
  if (kind === 'chess') return chessMoves(state as ChessState);
  if (kind === 'backgammon') return bgMoves(state as BackgammonState);
  if (kind === 'reversi') return reversiMoves(state as ReversiState);
  return damaMoves(state as DamaState);
}

const PLAY = { xox: playXox, four: playFour, dama: playDama, chess: playChess, backgammon: playBg, reversi: playReversi } as const;
// Chess moves come from `legalMoves` here, so the search skips `play`'s own legality check (GP3: twice as fast).
const apply = (kind: BotKind, state: BoardState, move: number) => (kind === 'chess' ? playChessLegal(state as ChessState, move) : PLAY[kind](state, state.turn, move));

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
  if (kind === 'chess') return evaluateChess(state as ChessState, me);
  if (kind === 'reversi') return evaluateReversi(state, me);
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

/** Chess: material in pawns, a little for pawns moving up and pieces near the middle. */
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3.2, r: 5, q: 9, k: 0 };
function evaluateChess(s: ChessState, me: Mark): number {
  let score = 0;
  s.board.forEach((c, i) => {
    if (c === null) return;
    const kind = s.kinds[i]!;
    const row = Math.floor(i / 8);
    const col = i % 8;
    let value = VALUE[kind] ?? 0;
    if (kind === 'p') value += (c === 'X' ? 6 - row : row - 1) * 0.05;
    else if (kind === 'n' || kind === 'b') value += (3.5 - Math.max(Math.abs(row - 3.5), Math.abs(col - 3.5))) * 0.05;
    score += c === me ? value : -value;
  });
  if (s.check) score += s.turn === me ? -0.2 : 0.2;
  return score;
}

/**
 * Reversi: corners are worth most, the cells next to an empty corner are dangerous (they hand it over), edges are
 * good; having more moves than the other side counts too. The disc count itself only matters at the end (the search
 * sees the win).
 */
const REVERSI_WEIGHTS = [
  100, -20, 10, 5, 5, 10, -20, 100,
  -20, -50, -2, -2, -2, -2, -50, -20,
  10, -2, 1, 1, 1, 1, -2, 10,
  5, -2, 1, 0, 0, 1, -2, 5,
  5, -2, 1, 0, 0, 1, -2, 5,
  10, -2, 1, 1, 1, 1, -2, 10,
  -20, -50, -2, -2, -2, -2, -50, -20,
  100, -20, 10, 5, 5, 10, -20, 100,
];
const CORNER_NEIGHBOURS: Record<number, number[]> = { 0: [1, 8, 9], 7: [6, 14, 15], 56: [48, 49, 57], 63: [54, 55, 62] };
function evaluateReversi(state: BoardState, me: Mark): number {
  const b = state.board;
  let score = 0;
  b.forEach((c, i) => {
    if (c === null) return;
    let w = REVERSI_WEIGHTS[i]!;
    // Once a corner is taken, its neighbours are safe cells, not traps.
    for (const [corner, near] of Object.entries(CORNER_NEIGHBOURS)) if (near.includes(i) && b[Number(corner)] !== null) w = 5;
    score += c === me ? w : -w;
  });
  score += (mobility(b, me) - mobility(b, other(me))) * 3;
  return score;
}

const WIN = 10_000;
/** `hot`: the move that led here took a piece (an exchange may be going on; dama: or a chain goes on). */
function search(kind: BotKind, state: BoardState, me: Mark, depth: number, alpha: number, beta: number, hot = false): number {
  if (state.winner !== null) return state.winner === 'draw' ? 0 : state.winner === me ? WIN + depth : -WIN - depth;
  // Captures are followed at the search's end after a capture (an exchange is going on), during a dama chain, and
  // whenever the other side is to move there (it may take something at once); a quiet leaf with me to move is cheap.
  if (depth === 0)
    return QUIET_KINDS.has(kind) && (hot || state.turn !== me || (kind === 'dama' && (state as DamaState).chain !== null))
      ? quiesce(kind, state, me, alpha, beta, QUIESCE_PLIES)
      : evaluate(kind, state, me);
  if (Date.now() > deadline) throw TIME_UP;
  const moves = ordered(kind, state, movesOf(kind, state));
  if (!moves.length) return 0;
  const maximizing = state.turn === me;
  let best = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    const next = apply(kind, state, move);
    if (!next) continue;
    const value = search(kind, next, me, depth - 1, alpha, beta, QUIET_KINDS.has(kind) && took(state, next));
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

/**
 * GP2 (no silly blunders on medium): a search that stops right after a capture can't see the piece taken back (the
 * "horizon"), so it walked into simple exchanges. At the search's end the capture games (chess, dama) go on with
 * captures only (and dama's forced chain jumps) until the position is quiet; the side to move may also stop there
 * ("stand pat") unless dama forces it on.
 */
const QUIET_KINDS: ReadonlySet<BotKind> = new Set(['chess', 'dama']);
const QUIESCE_PLIES = 4;
function pieces(state: BoardState, mark: Mark): number {
  let n = 0;
  for (const c of state.board) if (c === mark) n++;
  return n;
}
/** Did the move from `before` to `after` take a piece of the other side? */
function took(before: BoardState, after: BoardState): boolean {
  const them = other(before.turn);
  return pieces(after, them) < pieces(before, them);
}
function quiesce(kind: BotKind, state: BoardState, me: Mark, alpha: number, beta: number, left: number): number {
  if (state.winner !== null) return state.winner === 'draw' ? 0 : state.winner === me ? WIN : -WIN;
  if (Date.now() > deadline) throw TIME_UP;
  const forced = kind === 'dama' && (state as DamaState).chain !== null;
  const stand = evaluate(kind, state, me);
  if (left === 0) return stand;
  const maximizing = state.turn === me;
  const them = other(state.turn);
  const before = pieces(state, them);
  let best = forced ? (maximizing ? -Infinity : Infinity) : stand;
  if (!forced) {
    if (maximizing) {
      if (stand >= beta) return stand;
      alpha = Math.max(alpha, stand);
    } else {
      if (stand <= alpha) return stand;
      beta = Math.min(beta, stand);
    }
  }
  const moves = movesOf(kind, state);
  // Which moves are captures, told without playing them all: in chess the target square holds a piece (or it is en
  // passant, or a promotion); in dama capturing is a must, so when one move captures, every move does.
  let noisy: number[];
  if (kind === 'chess') {
    const c = state as ChessState;
    noisy = moves.filter((m) => {
      const from = Math.floor((m % 4096) / 64);
      const to = m % 64;
      return c.board[to] !== null || (c.kinds[from] === 'p' && (to === c.ep || to < 8 || to >= 56));
    });
  } else {
    const first = moves.length ? apply(kind, state, moves[0]!) : null;
    noisy = forced || (first && pieces(first, them) < before) ? moves : [];
  }
  for (const move of ordered(kind, state, noisy)) {
    const next = apply(kind, state, move);
    if (!next) continue;
    const value = quiesce(kind, next, me, alpha, beta, left - 1);
    if (maximizing) {
      best = Math.max(best, value);
      alpha = Math.max(alpha, value);
    } else {
      best = Math.min(best, value);
      beta = Math.min(beta, value);
    }
    if (beta <= alpha) break;
  }
  return Number.isFinite(best) ? best : stand;
}

const DEPTH: Record<BotKind, Record<BotLevel, number>> = { xox: { 1: 1, 2: 9 }, four: { 1: 2, 2: 5 }, dama: { 1: 1, 2: 3 }, chess: { 1: 1, 2: 3 }, backgammon: { 1: 1, 2: 1 }, reversi: { 1: 1, 2: 4 } };
/** Easy Stub plays a random move this often. */
const EASY_RANDOM = 0.35;

/** Backgammon: one checker step judged by the position it leaves (dice make deep search pointless here). */
function backgammonValue(s: BackgammonState, me: Mark): number {
  const them = other(me);
  const mine = (n: number) => (me === 'X' ? n > 0 : n < 0);
  let score = (pips(s, them) - pips(s, me)) * 0.1 + s.bar[them] * 3 - s.bar[me] * 3 + s.off[me] * 0.5;
  s.pts.forEach((n, i) => {
    if (!mine(n)) return;
    const k = Math.abs(n);
    // A made point (2+) is safe and blocks; a blot can be hit (worse the deeper in my own half it would be sent back).
    if (k >= 2) score += 0.6 + ((me === 'X' ? i <= 5 : i >= 18) ? 0.4 : 0);
    else score -= 0.8 + (me === 'X' ? (23 - i) / 24 : i / 24) * 0.8;
  });
  return score;
}

/** Stub's move for the side to play, or null when there is none. */
export function botMove(kind: BotKind, state: BoardState, level: BotLevel, random: () => number = Math.random): number | null {
  const moves = movesOf(kind, state);
  if (!moves.length) return null;
  if (kind === 'backgammon') {
    if (moves[0] === ROLL) return ROLL;
    if (level === 1 && random() < 0.5) return moves[Math.floor(random() * moves.length)]!;
    const me = state.turn;
    let best = moves[0]!;
    let bestValue = -Infinity;
    for (const move of moves) {
      const next = playBg(state, me, move, random);
      if (!next) continue;
      const value = next.winner === me ? Infinity : backgammonValue(next, me);
      if (value > bestValue) (bestValue = value), (best = move);
    }
    return best;
  }
  const slack = EASY_SLACK[kind];
  if (level === 1 && slack === Infinity && random() < EASY_RANDOM) return moves[Math.floor(random() * moves.length)]!;
  const me = state.turn;
  /** Every move with its value at `depth` (plain minimax at the root, so each value is exact). */
  const root = (depth: number): [number, number][] => {
    const out: [number, number][] = [];
    for (const move of ordered(kind, state, moves)) {
      const next = apply(kind, state, move);
      if (next) out.push([move, search(kind, next, me, depth - 1, -Infinity, Infinity, QUIET_KINDS.has(kind) && took(state, next))]);
    }
    return out;
  };
  // The capture games think against a time budget (GP2): the full depth first; if a very busy position runs out of
  // time, a quick one-move look answers instead, so Stub never keeps a table waiting.
  let scored: [number, number][] = [];
  if (QUIET_KINDS.has(kind)) {
    // GP3: medium chess looks three half-moves ahead (it sees a fork) now that a move is cheap to play; a position too
    // busy for that falls back to two, then one, all within the budget.
    const full = DEPTH[kind][level];
    const depths = full > 2 ? [full, full - 1, 1] : full > 1 ? [full, 1] : [1];
    const started = Date.now();
    for (const [i, depth] of depths.entries()) {
      deadline = i === depths.length - 1 ? Date.now() + BOT_BUDGET_MS / 2 : started + BOT_BUDGET_MS;
      try {
        scored = root(depth);
        break;
      } catch (error) {
        if (error !== TIME_UP) throw error;
      } finally {
        deadline = Infinity;
      }
    }
    if (!scored.length) return moves[0]!;
  } else scored = root(DEPTH[kind][level]);
  if (!scored.length) return moves[0]!;
  const top = Math.max(...scored.map(([, v]) => v));
  // Easy (GP2: "fair, not random"): now and then a weaker move, but only one close to its best, never a gift.
  const near = level === 1 && random() < EASY_RANDOM ? scored.filter(([, v]) => v >= top - slack && top - v < WIN / 2) : [];
  const pool = near.length ? near : scored.filter(([, v]) => v === top);
  return pool[Math.floor(random() * pool.length)]![0];
}

/**
 * How far below its best easy Stub may play now and then: about a minor piece in chess, a man in dama, an edge
 * cell in reversi. XOX and Four in a Row keep a plain random move (a child can win them).
 */
const EASY_SLACK: Record<BotKind, number> = { xox: Infinity, four: Infinity, dama: 1.2, chess: 2.5, reversi: 12, backgammon: Infinity };

/** How long Stub may think about one move in chess / dama (it also waits `BOT_DELAY_MS` before answering). */
export const BOT_BUDGET_MS = 500;
const TIME_UP = Symbol('time up');
let deadline = Infinity;
/** Captures first, the most valuable piece taken first (alpha-beta cuts far more that way); other kinds as they come. */
function ordered(kind: BotKind, state: BoardState, moves: number[]): number[] {
  if (kind !== 'chess') return moves;
  const c = state as ChessState;
  const gain = (m: number) => (c.board[m % 64] !== null ? (VALUE[c.kinds[m % 64]!] ?? 0) * 10 - (VALUE[c.kinds[Math.floor((m % 4096) / 64)]!] ?? 0) : -100);
  return moves.slice().sort((a, b) => gain(b) - gain(a));
}
