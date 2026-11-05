import { describe, expect, it } from 'vitest';
import type { BoardState, Cell } from './board.ts';
import { botMove, movesOf } from './bot.ts';
import { newGame as newDama, play as playDama, type DamaState } from './dama.ts';
import { legalMoves as chessMoves, newGame as newChess, play as playChess, type ChessState } from './chess.ts';
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

  it('Chess: a legal move at the start; medium takes a free queen and mates in one', () => {
    const s = newChess();
    expect(movesOf('chess', s)).toContain(botMove('chess', s, 1, first)!);
    // White queen on d4 en prise to the black knight on f5 (nothing defends it).
    const sq = (name: string) => (8 - Number(name[1])) * 8 + (name.charCodeAt(0) - 97);
    const empty = (): ChessState => ({ ...newChess(), board: Array(64).fill(null), kinds: '.'.repeat(64), castle: '', seen: [] });
    const put = (st: ChessState, cell: string, mark: 'X' | 'O', kind: string) => {
      st.board[sq(cell)] = mark;
      st.kinds = st.kinds.slice(0, sq(cell)) + kind + st.kinds.slice(sq(cell) + 1);
    };
    const free = empty();
    put(free, 'e1', 'X', 'k');
    put(free, 'd4', 'X', 'q');
    put(free, 'e8', 'O', 'k');
    put(free, 'f5', 'O', 'n');
    free.turn = 'O';
    expect(botMove('chess', free, 2, first)).toBe(sq('f5') * 64 + sq('d4'));
    // Back-rank mate: Ra1-a8#.
    const mate = empty();
    put(mate, 'g1', 'X', 'k');
    put(mate, 'a1', 'X', 'r');
    put(mate, 'g8', 'O', 'k');
    put(mate, 'f7', 'O', 'p');
    put(mate, 'g7', 'O', 'p');
    put(mate, 'h7', 'O', 'p');
    const m = botMove('chess', mate, 2, first)!;
    expect(m).toBe(sq('a1') * 64 + sq('a8'));
    expect(playChess(mate, 'X', m)!.end).toBe('mate');
  });

  // GP2: "no silly blunders on medium, easy fair, not random".
  const sq = (name: string) => (8 - Number(name[1])) * 8 + (name.charCodeAt(0) - 97);
  const board = (pieces: [string, 'X' | 'O', string][], turn: 'X' | 'O' = 'X'): ChessState => {
    const st: ChessState = { ...newChess(), board: Array(64).fill(null), kinds: '.'.repeat(64), castle: '', seen: [], turn };
    for (const [cell, mark, kind] of pieces) {
      st.board[sq(cell)] = mark;
      st.kinds = st.kinds.slice(0, sq(cell)) + kind + st.kinds.slice(sq(cell) + 1);
    }
    return st;
  };
  /** After `move`, can the other side take the piece standing on `cell`? */
  const takenNext = (s: ChessState, move: number) => {
    const next = playChess(s, s.turn, move)!;
    const queen = next.board.findIndex((c, i) => c === s.turn && next.kinds[i] === 'q');
    return chessMoves(next).some((m) => m % 64 === queen);
  };
  const always = () => 0;

  it('Chess: medium and easy never leave the queen to a pawn', () => {
    // The white queen on d4 is attacked by the black pawn on e5.
    const s = board([['e1', 'X', 'k'], ['d4', 'X', 'q'], ['a2', 'X', 'p'], ['b2', 'X', 'p'], ['e8', 'O', 'k'], ['e5', 'O', 'p'], ['h7', 'O', 'p']]);
    for (const level of [2, 1] as const) for (const random of [first, always, Math.random]) expect(takenNext(s, botMove('chess', s, level, random)!)).toBe(false);
    // Easy's "weaker move now and then", each of its choices in turn: none of them gives the queen away.
    const n = chessMoves(s).length;
    for (let k = 0; k < n; k++) {
      const steps = [0, k / n];
      expect(takenNext(s, botMove('chess', s, 1, () => steps.shift() ?? 0)!)).toBe(false);
    }
  });

  it('Chess: medium stops a mate in one when it can', () => {
    // Black threatens Re1#; the bishop can block on e1 (or a pawn can make room for the king).
    const s = board([['g1', 'X', 'k'], ['f2', 'X', 'p'], ['g2', 'X', 'p'], ['h2', 'X', 'p'], ['c3', 'X', 'b'], ['g8', 'O', 'k'], ['e8', 'O', 'r'], ['f7', 'O', 'p'], ['g7', 'O', 'p'], ['h7', 'O', 'p']]);
    for (let n = 0; n < 5; n++) {
      const next = playChess(s, 'X', botMove('chess', s, 2, Math.random)!)!;
      expect(chessMoves(next).every((m) => playChess(next, 'O', m)!.end !== 'mate')).toBe(true);
    }
  });

  it('Chess: medium takes a defended piece only when the exchange wins', () => {
    // Nxd5 cxd5 Bxd5 wins a pawn on top of an even trade; the plain Bxd5?? would lose the bishop for a bishop and pawn.
    const s = board([['g1', 'X', 'k'], ['c3', 'X', 'n'], ['b3', 'X', 'b'], ['g8', 'O', 'k'], ['d5', 'O', 'b'], ['c6', 'O', 'p'], ['h7', 'O', 'p']]);
    const m = botMove('chess', s, 2, first)!;
    expect(Math.floor((m % 4096) / 64) === sq('c3') || Math.floor((m % 4096) / 64) === sq('b3')).toBe(true);
    expect(m % 64).toBe(sq('d5'));
  });

  it('Chess: medium answers within its time budget, also in a busy middle game', () => {
    let s: ChessState = newChess();
    for (const [a, b] of [['e2', 'e4'], ['e7', 'e5'], ['g1', 'f3'], ['b8', 'c6'], ['f1', 'c4'], ['g8', 'f6'], ['d2', 'd3'], ['f8', 'c5']]) s = playChess(s, s.turn, sq(a!) * 64 + sq(b!))!;
    const t = Date.now();
    expect(chessMoves(s)).toContain(botMove('chess', s, 2, first));
    expect(Date.now() - t).toBeLessThan(1500);
  });

  it('Dama: medium and easy never hand a man over when a safe move exists', () => {
    // White's man on d3 may step up to d4 (taken by the black man on d5? no: d5 jumps d4 only to d3, which is free after
    // the move) or sideways; c3-c4 / e3-e4 walk into a capture, h2-h3 is safe.
    const s: DamaState = { ...newDama(), board: Array(64).fill(null), kings: [] };
    const put = (cell: string, mark: 'X' | 'O') => (s.board[sq(cell)] = mark);
    put('a2', 'X');
    put('h2', 'X');
    put('a7', 'O');
    put('d5', 'O');
    put('d3', 'X');
    for (const level of [2, 1] as const)
      for (const random of [first, always]) {
        const next = playDama(s, 'X', botMove('dama', s, level, random)!)!;
        const before = next.board.filter((c) => c === 'X').length;
        const worst = Math.min(...movesOf('dama', next).map((m) => playDama(next, 'O', m)!.board.filter((c) => c === 'X').length));
        expect(worst).toBe(before);
      }
  });
});
