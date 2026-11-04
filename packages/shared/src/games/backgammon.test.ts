import { describe, expect, it } from 'vitest';
import { BACKGAMMON, BAR, OFF, ROLL, isBackgammonState, legalMoves, newGame, pips, play, type BackgammonState } from './backgammon.ts';

const mv = (from: number, to: number) => from * 32 + to;
/** Dice that come out as given (each value 1–6). */
const dice = (...values: number[]) => {
  let i = 0;
  return () => (values[i++ % values.length]! - 1) / 6 + 0.01;
};
/** A position from a list of [point, count] (X positive, O negative); the rest goes off. */
function pos(points: [number, number][], turn: 'X' | 'O', diceLeft: number[], bar = { X: 0, O: 0 }): BackgammonState {
  const pts = Array<number>(24).fill(0);
  for (const [i, n] of points) pts[i] = n;
  const on = (m: 'X' | 'O') => pts.reduce((t, v) => t + (m === 'X' ? Math.max(v, 0) : Math.max(-v, 0)), 0) + bar[m];
  return {
    board: pts.map((n) => (n > 0 ? 'X' : n < 0 ? 'O' : null)),
    turn,
    winner: null,
    line: null,
    starter: 'X',
    pts,
    bar,
    off: { X: 15 - on('X'), O: 15 - on('O') },
    dice: diceLeft,
    rolled: diceLeft.slice(0, 2),
    passed: null,
  };
}

describe('Backgammon', () => {
  it('starts with 15 checkers a side, 167 pips each; the first move is a roll', () => {
    const s = newGame();
    expect(isBackgammonState(s)).toBe(true);
    expect(pips(s, 'X')).toBe(167);
    expect(pips(s, 'O')).toBe(167);
    expect(legalMoves(s)).toEqual([ROLL]);
    expect(play(s, 'O', ROLL)).toBeNull();
    const rolled = play(s, 'X', ROLL, dice(3, 1))!;
    expect(rolled.dice).toEqual([3, 1]);
    // 8/5 6/5 (the classic 3-1) is allowed step by step.
    const a = play(rolled, 'X', mv(7, 4))!;
    expect(a.turn).toBe('X');
    const b = play(a, 'X', mv(5, 4))!;
    expect(b.turn).toBe('O');
    expect(b.pts[4]).toBe(2);
    expect(b.dice).toEqual([]);
  });

  it('a double gives four steps', () => {
    const s = play(newGame(), 'X', ROLL, dice(6, 6))!;
    expect(s.dice).toEqual([6, 6, 6, 6]);
    let t = s;
    for (const m of [mv(23, 17), mv(23, 17), mv(12, 6), mv(12, 6)]) t = play(t, 'X', m)!;
    expect(t.turn).toBe('O');
  });

  it('a blot is hit and must enter from the bar first; a blocked point stops it', () => {
    const s = pos([[10, 1], [8, -1], [0, -2], [23, -2]], 'X', [2, 5]);
    const hit = play(s, 'X', mv(10, 8))!;
    expect(hit.bar.O).toBe(1);
    expect(hit.pts[8]).toBe(1);
    // O on the bar with 1 and 6: enters on 0 (own) — 5 is free too, but only bar moves count.
    const o = { ...hit, turn: 'O' as const, dice: [1, 6] };
    expect(legalMoves(o).every((m) => Math.floor(m / 32) === BAR)).toBe(true);
    // Every entry point blocked: the roll passes the turn.
    const shut = pos([[0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [23, -14]], 'O', [], { X: 0, O: 1 });
    const after = play(shut, 'O', ROLL, dice(3, 4))!;
    expect(after.turn).toBe('X');
    expect(after.passed).toBe('O');
  });

  it('you must use both dice if you can, and the larger one if only one fits', () => {
    // X on 7 with 6 and 1: 7→1 then 1→0, or 7→6→0. Both dice can be used, so a lone step that blocks the other is refused.
    const one = pos([[7, 1], [2, -2], [20, -13]], 'X', [6, 5]);
    // 7→1 (6) leaves 1→? 5 can't (off needs all home: it is home), so bears off: both used. 7→2 (5) is blocked.
    expect(legalMoves(one)).toEqual([mv(7, 1)]);
    // Only one die usable: the larger.
    const big = pos([[13, 1], [7, -2], [1, -2], [20, -11]], 'X', [6, 1]);
    // 13→7 blocked (6), 13→12 (1) then 12→6 (6) works: both dice → the 1 first is the only way.
    expect(legalMoves(big)).toEqual([mv(13, 12)]);
  });

  it('bears off with the exact die, or a larger one from the highest point', () => {
    const s = pos([[2, 1], [0, 1], [23, -15]], 'X', [6, 1]);
    const moves = legalMoves(s);
    expect(moves).toContain(mv(2, OFF));
    expect(moves).toContain(mv(0, OFF));
    // Not allowed while a checker is outside home.
    const out = pos([[2, 1], [9, 1], [23, -15]], 'X', [3, 1]);
    expect(legalMoves(out)).not.toContain(mv(2, OFF));
    // The last checker off wins.
    const last = pos([[0, 1], [23, -15]], 'X', [1, 2]);
    const won = play(last, 'X', mv(0, OFF))!;
    expect(won.winner).toBe('X');
    expect(won.off.X).toBe(15);
  });

  it('refuses rolling twice, wrong turns and odd states', () => {
    const s = play(newGame(), 'X', ROLL, dice(4, 2))!;
    expect(play(s, 'X', ROLL)).toBeNull();
    expect(play(s, 'X', mv(0, 4))).toBeNull();
    expect(isBackgammonState({ ...s, pts: s.pts.map((n, i) => (i === 5 ? 6 : n)) })).toBe(false);
    expect(BACKGAMMON.rematch(s).starter).toBe('O');
  });

  it('a random game always ends with a winner (rules never stall)', () => {
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let s = newGame();
    for (let i = 0; i < 3000 && s.winner === null; i++) {
      const moves = legalMoves(s);
      s = play(s, s.turn, moves[Math.floor(random() * moves.length)]!, random)!;
      expect(isBackgammonState(s)).toBe(true);
    }
    expect(s.winner === 'X' || s.winner === 'O').toBe(true);
  });
});
