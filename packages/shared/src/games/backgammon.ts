// Backgammon, the fourth board of 🎲 Classics (P8, `docs/internal/design/games/classics.md`). In-house rules: the server
// checks every move and rolls the dice (the page and the bot never roll), the page draws with them, Glowbeam plays them.
//
// - 24 points, numbered 0–23. X (white) moves from 23 down to 0 and bears off below 0; its home is points 0–5.
//   O (black) moves from 0 up to 23 and bears off above 23; its home is points 18–23. `pts[i]` > 0 is X checkers,
//   < 0 is O checkers. 15 checkers a side.
// - A turn: roll (move `ROLL`), then one checker step per message (`from * 32 + to`; from 24 = the bar, to 25 = off).
//   A double gives four steps. You must use as many dice as you can; if only one of two dice can be used, the larger.
// - A single opposing checker on the landing point is hit and goes to the bar; a checker on the bar must enter first
//   (X onto 24 − die, O onto die − 1). Two or more opposing checkers block a point.
// - Bearing off once all 15 are home: the exact die, or a larger die from the highest point you hold.
// - The first to bear off all 15 wins. No doubling cube (owner's plan: left out at first).

import { type BoardRules, type BoardState, type Cell, type Mark, other } from './board.ts';

export const POINTS = 24;
export const CHECKERS = 15;
export const BAR = 24;
export const OFF = 25;
/** The move that rolls the dice. */
export const ROLL = 1000;

export interface BackgammonState extends BoardState {
  /** Checkers per point: X positive, O negative. */
  pts: number[];
  bar: { X: number; O: number };
  off: { X: number; O: number };
  /** The dice still to use (empty: the player to move must roll). */
  dice: number[];
  /** The last roll, as rolled (for the page). */
  rolled: number[];
  /** Who could not move with their roll (the turn passed). */
  passed: Mark | null;
}

const sign = (mark: Mark) => (mark === 'X' ? 1 : -1);
const owned = (n: number, mark: Mark) => n * sign(mark) > 0;
const count = (n: number, mark: Mark) => (owned(n, mark) ? Math.abs(n) : 0);
const blocked = (n: number, mark: Mark) => n * sign(mark) <= -2;
const isHome = (point: number, mark: Mark) => (mark === 'X' ? point <= 5 : point >= 18);
const encode = (from: number, to: number) => from * 32 + to;
export const fromOf = (move: number) => Math.floor(move / 32);
export const toOf = (move: number) => move % 32;

function boardOf(pts: readonly number[]): Cell[] {
  return pts.map((n) => (n > 0 ? 'X' : n < 0 ? 'O' : null));
}

export function newGame(starter: Mark = 'X'): BackgammonState {
  const pts = Array<number>(POINTS).fill(0);
  pts[23] = 2;
  pts[12] = 5;
  pts[7] = 3;
  pts[5] = 5;
  pts[0] = -2;
  pts[11] = -5;
  pts[16] = -3;
  pts[18] = -5;
  return { board: boardOf(pts), turn: starter, winner: null, line: null, starter, pts, bar: { X: 0, O: 0 }, off: { X: 0, O: 0 }, dice: [], rolled: [], passed: null };
}

interface Pos {
  pts: number[];
  bar: { X: number; O: number };
  off: { X: number; O: number };
}
interface Step {
  from: number;
  to: number;
  die: number;
}

/** Every single checker step with one die (no "use the most dice" filtering yet). */
function stepsFor(p: Pos, mark: Mark, die: number): Step[] {
  if (p.bar[mark] > 0) {
    const to = mark === 'X' ? 24 - die : die - 1;
    return blocked(p.pts[to]!, mark) ? [] : [{ from: BAR, to, die }];
  }
  const out: Step[] = [];
  let allHome = true;
  for (let i = 0; i < POINTS; i++) if (owned(p.pts[i]!, mark) && !isHome(i, mark)) allHome = false;
  for (let from = 0; from < POINTS; from++) {
    if (!owned(p.pts[from]!, mark)) continue;
    const to = from - die * sign(mark);
    if (to >= 0 && to < POINTS) {
      if (!blocked(p.pts[to]!, mark)) out.push({ from, to, die });
      continue;
    }
    if (!allHome) continue;
    const exact = mark === 'X' ? to === -1 : to === POINTS;
    // A larger die bears off only from the highest point held (none farther from home).
    const farther = mark === 'X' ? p.pts.slice(from + 1, 6).some((n) => owned(n, mark)) : p.pts.slice(18, from).some((n) => owned(n, mark));
    if (exact || !farther) out.push({ from, to: OFF, die });
  }
  return out;
}

function applyStep(p: Pos, mark: Mark, step: Step): Pos {
  const pts = p.pts.slice();
  const bar = { ...p.bar };
  const off = { ...p.off };
  if (step.from === BAR) bar[mark] -= 1;
  else pts[step.from] = pts[step.from]! - sign(mark);
  if (step.to === OFF) off[mark] += 1;
  else {
    if (pts[step.to] === -sign(mark)) {
      // A hit: the lone checker goes to the bar.
      pts[step.to] = 0;
      bar[other(mark)] += 1;
    }
    pts[step.to] = pts[step.to]! + sign(mark);
  }
  return { pts, bar, off };
}

const without = (dice: readonly number[], die: number) => {
  const i = dice.indexOf(die);
  return dice.slice(0, i).concat(dice.slice(i + 1));
};

/** The most dice that can still be used from here. */
function mostDice(p: Pos, mark: Mark, dice: readonly number[]): number {
  if (!dice.length || p.off[mark] === CHECKERS) return 0;
  let best = 0;
  for (const die of new Set(dice)) {
    for (const step of stepsFor(p, mark, die)) {
      best = Math.max(best, 1 + mostDice(applyStep(p, mark, step), mark, without(dice, die)));
      if (best === dice.length) return best;
    }
  }
  return best;
}

/** The steps allowed now: each starts a way of using as many dice as possible (and the larger die if only one). */
function legalSteps(s: BackgammonState): Step[] {
  if (s.winner !== null || !s.dice.length) return [];
  const p: Pos = s;
  const most = mostDice(p, s.turn, s.dice);
  if (most === 0) return [];
  let steps: Step[] = [];
  for (const die of new Set(s.dice)) {
    for (const step of stepsFor(p, s.turn, die)) {
      if (1 + mostDice(applyStep(p, s.turn, step), s.turn, without(s.dice, die)) === most) steps.push(step);
    }
  }
  if (most === 1 && s.dice.length === 2 && s.dice[0] !== s.dice[1]) {
    const high = Math.max(...steps.map((st) => st.die));
    steps = steps.filter((st) => st.die === high);
  }
  return steps;
}

/** Every legal move for the player to move: `ROLL` before the roll, then checker steps. */
export function legalMoves(s: BackgammonState): number[] {
  if (s.winner !== null) return [];
  if (!s.dice.length) return [ROLL];
  return [...new Set(legalSteps(s).map((st) => encode(st.from, st.to)))];
}

/** The player to move rolls; with no legal step at all, the turn passes at once. */
function roll(s: BackgammonState, random: () => number): BackgammonState {
  const a = 1 + Math.min(5, Math.floor(random() * 6));
  const b = 1 + Math.min(5, Math.floor(random() * 6));
  const dice = a === b ? [a, a, a, a] : [a, b];
  const next: BackgammonState = { ...s, dice, rolled: [a, b], passed: null };
  if (!legalSteps(next).length) return { ...next, dice: [], turn: other(s.turn), passed: s.turn };
  return next;
}

export function play(state: BoardState, mark: Mark, move: number, random: () => number = Math.random): BackgammonState | null {
  const s = state as BackgammonState;
  if (s.winner !== null || s.turn !== mark || !Number.isInteger(move)) return null;
  if (move === ROLL) return s.dice.length ? null : roll(s, random);
  // The same two points can be joined by two dice (bearing off with a larger one): use the smallest that works.
  const step = legalSteps(s)
    .filter((st) => encode(st.from, st.to) === move)
    .sort((a, b) => a.die - b.die)[0];
  if (!step) return null;
  const pos = applyStep(s, mark, step);
  const next: BackgammonState = { ...s, ...pos, board: boardOf(pos.pts), dice: without(s.dice, step.die), passed: null, last: step.to < POINTS ? step.to : undefined };
  if (next.last === undefined) delete next.last;
  if (pos.off[mark] === CHECKERS) return { ...next, winner: mark, dice: [] };
  // The turn ends when the dice are used up or none can be used any more.
  if (!next.dice.length || !legalSteps(next).length) return { ...next, dice: [], turn: other(mark) };
  return next;
}

export function rematch(state: BoardState): BackgammonState {
  return newGame(other(state.starter));
}

/** Pips each side still has to travel (the page shows them; the bot weighs them). */
export function pips(s: Pick<BackgammonState, 'pts' | 'bar'>, mark: Mark): number {
  let total = s.bar[mark] * 25;
  s.pts.forEach((n, i) => (total += count(n, mark) * (mark === 'X' ? i + 1 : POINTS - i)));
  return total;
}

export function isBackgammonState(x: unknown): x is BackgammonState {
  const s = x as BackgammonState | null;
  const mark = (m: unknown) => m === 'X' || m === 'O';
  const n = (v: unknown, max: number) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max;
  if (
    !s ||
    !Array.isArray(s.pts) ||
    s.pts.length !== POINTS ||
    !s.pts.every((v) => Number.isInteger(v) && Math.abs(v) <= CHECKERS) ||
    !Array.isArray(s.board) ||
    s.board.length !== POINTS ||
    !mark(s.turn) ||
    !mark(s.starter) ||
    !(s.winner === null || s.winner === 'draw' || mark(s.winner)) ||
    s.line !== null ||
    !s.bar ||
    !s.off ||
    !n(s.bar.X, CHECKERS) ||
    !n(s.bar.O, CHECKERS) ||
    !n(s.off.X, CHECKERS) ||
    !n(s.off.O, CHECKERS) ||
    !Array.isArray(s.dice) ||
    s.dice.length > 4 ||
    !s.dice.every((d) => Number.isInteger(d) && d >= 1 && d <= 6) ||
    !Array.isArray(s.rolled) ||
    s.rolled.length > 2 ||
    !s.rolled.every((d) => Number.isInteger(d) && d >= 1 && d <= 6) ||
    !(s.passed === null || mark(s.passed)) ||
    !(s.last === undefined || n(s.last, POINTS - 1))
  )
    return false;
  // 15 checkers a side, and the board's owners match the counts.
  const total = (m: Mark) => s.pts.reduce((t, v) => t + count(v, m), 0) + s.bar[m] + s.off[m];
  return total('X') === CHECKERS && total('O') === CHECKERS && s.board.every((c, i) => c === (s.pts[i]! > 0 ? 'X' : s.pts[i]! < 0 ? 'O' : null));
}

export const BACKGAMMON: BoardRules = { moves: ROLL + 1, newGame, play, rematch, isState: isBackgammonState };
