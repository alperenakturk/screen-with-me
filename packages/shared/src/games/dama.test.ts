import { describe, expect, it } from 'vitest';
import type { Cell } from './board.ts';
import { DAMA, QUIET_DRAW, isDamaState, legalMoves, newGame, play, type DamaState } from './dama.ts';

const at = (row: number, col: number) => row * 8 + col;
const mv = (from: number, to: number) => from * 64 + to;
/** An empty board with the given pieces (`X`, `O`, kings by cell). */
function board(pieces: Record<number, 'X' | 'O'>, kings: number[] = [], turn: 'X' | 'O' = 'X'): DamaState {
  const cells = Array<Cell>(64).fill(null);
  for (const [cell, mark] of Object.entries(pieces)) cells[Number(cell)] = mark;
  return { board: cells, turn, winner: null, line: null, starter: 'X', kings, chain: null, chainDir: null, quiet: 0 };
}

describe('Dama (Turkish draughts)', () => {
  it('starts with 16 men a side on their 2nd and 3rd rows; X moves first, forward or sideways only', () => {
    const s = newGame();
    expect(s.board.filter((c) => c === 'X')).toHaveLength(16);
    expect(s.board.filter((c) => c === 'O')).toHaveLength(16);
    expect(s.board[at(5, 0)]).toBe('X');
    expect(s.board[at(2, 0)]).toBe('O');
    // Only the front row (row 5) can step up into row 4; sideways is blocked by neighbours.
    const moves = legalMoves(s);
    expect(moves).toHaveLength(8);
    expect(moves.every((m) => Math.floor((m % 64) / 8) === 4)).toBe(true);
    expect(play(s, 'O', moves[0]!)).toBeNull();
    expect(isDamaState(s)).toBe(true);
  });

  it('a man never moves backward or diagonally', () => {
    const s = board({ [at(4, 4)]: 'X', [at(0, 0)]: 'O' });
    const to = legalMoves(s).map((m) => m % 64).sort((a, b) => a - b);
    expect(to).toEqual([at(3, 4), at(4, 3), at(4, 5)]);
  });

  it('capturing is compulsory and the longest chain must be taken', () => {
    // X at (5,1) can take one; X at (5,6) can take two in a row (up, then up again).
    const s = board({ [at(5, 1)]: 'X', [at(4, 1)]: 'O', [at(5, 6)]: 'X', [at(4, 6)]: 'O', [at(2, 6)]: 'O', [at(0, 0)]: 'O' });
    expect(legalMoves(s)).toEqual([mv(at(5, 6), at(3, 6))]);
    const after = play(s, 'X', mv(at(5, 6), at(3, 6)))!;
    // The chain goes on with the same piece: still X's turn.
    expect(after.turn).toBe('X');
    expect(after.chain).toBe(at(3, 6));
    expect(after.board[at(4, 6)]).toBeNull();
    expect(legalMoves(after)).toEqual([mv(at(3, 6), at(1, 6))]);
    const done = play(after, 'X', mv(at(3, 6), at(1, 6)))!;
    expect(done.turn).toBe('O');
    expect(done.chain).toBeNull();
  });

  it('a man is crowned on the far row; a king moves and captures at a distance', () => {
    const s = board({ [at(1, 3)]: 'X', [at(7, 7)]: 'O' });
    const crowned = play(s, 'X', mv(at(1, 3), at(0, 3)))!;
    expect(crowned.kings).toEqual([at(0, 3)]);
    // A king on (7,0) takes the O at (7,4) from afar and may land on (7,5), (7,6) or (7,7).
    const k = board({ [at(7, 0)]: 'X', [at(7, 4)]: 'O', [at(0, 7)]: 'O' }, [at(7, 0)]);
    const landings = legalMoves(k).map((m) => m % 64).sort((a, b) => a - b);
    expect(landings).toEqual([at(7, 5), at(7, 6), at(7, 7)]);
  });

  it('a king may not turn straight back between two captures', () => {
    // King at (4,0) takes (4,2) landing on (4,3); the only other O is back at (4,1)? No: jumped pieces are gone, so
    // put one behind it at (4,6)... and one that would need a 180° turn is never offered.
    const s = board({ [at(4, 0)]: 'X', [at(4, 2)]: 'O', [at(2, 4)]: 'O', [at(7, 7)]: 'O' }, [at(4, 0)]);
    const first = legalMoves(s);
    // Only landing on (4,4) lets the chain go on (up the column to take (2,4)).
    expect(first).toEqual([mv(at(4, 0), at(4, 4))]);
    const mid = play(s, 'X', first[0]!)!;
    expect(mid.chainDir).toBe(3);
    expect(legalMoves(mid).every((m) => Math.floor(m / 64) === at(4, 4))).toBe(true);
  });

  it('taking the last piece wins; a side with no move loses; long quiet play is a draw', () => {
    const s = board({ [at(5, 1)]: 'X', [at(4, 1)]: 'O' });
    expect(play(s, 'X', mv(at(5, 1), at(3, 1)))!.winner).toBe('X');
    // O's only man is blocked: after X's move O has no move.
    const blocked = board({ [at(6, 0)]: 'X', [at(7, 1)]: 'X', [at(7, 2)]: 'X', [at(7, 0)]: 'O', [at(3, 3)]: 'X' });
    expect(play(blocked, 'X', mv(at(3, 3), at(2, 3)))!.winner).toBe('X');
    const kings = board({ [at(0, 0)]: 'X', [at(7, 7)]: 'O' }, [at(0, 0), at(7, 7)]);
    kings.quiet = QUIET_DRAW - 1;
    expect(play(kings, 'X', mv(at(0, 0), at(0, 1)))!.winner).toBe('draw');
  });

  it('round-trips through the generic rules and rejects broken states', () => {
    const s = DAMA.newGame('O');
    expect(s.turn).toBe('O');
    expect(DAMA.isState(JSON.parse(JSON.stringify(s)))).toBe(true);
    expect(DAMA.isState({ ...s, kings: [0] })).toBe(false);
    expect(DAMA.rematch(s).starter).toBe('X');
  });
});
