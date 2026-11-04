import { describe, expect, it } from 'vitest';
import type { Cell } from './board.ts';
import { CHESS, isChessState, legalMoves, newGame, play, tooLittle, type ChessState } from './chess.ts';

/** A position from FEN (row 0 = rank 8; X = white). */
function fen(text: string): ChessState {
  const [rows, side, castle, ep, half] = text.split(' ');
  const board: Cell[] = [];
  let kinds = '';
  for (const row of rows!.split('/')) {
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < Number(ch); i++) (board.push(null), (kinds += '.'));
      } else {
        board.push(ch === ch.toUpperCase() ? 'X' : 'O');
        kinds += ch.toLowerCase();
      }
    }
  }
  const sq = (name: string) => (8 - Number(name[1])) * 8 + (name.charCodeAt(0) - 97);
  return {
    board,
    kinds,
    turn: side === 'w' ? 'X' : 'O',
    winner: null,
    line: null,
    starter: 'X',
    castle: castle === '-' ? '' : castle!,
    ep: ep === '-' ? null : sq(ep!),
    halfmove: Number(half ?? 0),
    seen: [],
    check: false,
    end: null,
  };
}
const sq = (name: string) => (8 - Number(name[1])) * 8 + (name.charCodeAt(0) - 97);
const mv = (from: string, to: string, promo = 0) => promo * 4096 + sq(from) * 64 + sq(to);

function perft(s: ChessState, depth: number): number {
  if (depth === 0) return 1;
  let n = 0;
  for (const move of legalMoves(s)) {
    const next = play(s, s.turn, move)!;
    n += depth === 1 ? 1 : perft(next, depth - 1);
  }
  return n;
}

describe('Chess', () => {
  it('perft from the start: 20, 400, 8902', () => {
    const s = newGame();
    expect(perft(s, 1)).toBe(20);
    expect(perft(s, 2)).toBe(400);
    expect(perft(s, 3)).toBe(8902);
  });

  it('perft on "Kiwipete" (castling, en passant, promotion, pins): 48, 2039', () => {
    const s = fen('r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0');
    expect(perft(s, 1)).toBe(48);
    expect(perft(s, 2)).toBe(2039);
  });

  it('perft on an en passant / promotion position: 14, 191, 2812', () => {
    const s = fen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0');
    expect(perft(s, 1)).toBe(14);
    expect(perft(s, 2)).toBe(191);
    expect(perft(s, 3)).toBe(2812);
  });

  it("fool's mate ends the game: mate, black wins", () => {
    let s = newGame();
    for (const [from, to] of [['f2', 'f3'], ['e7', 'e5'], ['g2', 'g4'], ['d8', 'h4']] as const) s = play(s, s.turn, mv(from, to))!;
    expect(s.winner).toBe('O');
    expect(s.end).toBe('mate');
    expect(s.check).toBe(true);
    expect(legalMoves(s)).toEqual([]);
  });

  it('stalemate is a draw', () => {
    const s = fen('7k/5Q2/6K1/8/8/8/8/8 w - - 0');
    const after = play(s, 'X', mv('f7', 'e7'))!; // the king still has g8
    expect(after.winner).toBeNull();
    const stale = play(fen('7k/8/6K1/8/8/8/8/5Q2 w - - 0'), 'X', mv('f1', 'f7'))!;
    expect(stale.winner).toBe('draw');
    expect(stale.end).toBe('stalemate');
  });

  it('castling moves the rook and is refused through check', () => {
    const s = fen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0');
    const castled = play(s, 'X', mv('e1', 'g1'))!;
    expect(castled.kinds[sq('f1')]).toBe('r');
    expect(castled.kinds[sq('h1')]).toBe('.');
    expect(castled.castle).toBe('kq');
    // A black rook on f8 covers f1: no king-side castling, queen-side still fine.
    const covered = fen('5r1k/8/8/8/8/8/8/R3K2R w KQ - 0');
    expect(legalMoves(covered)).not.toContain(mv('e1', 'g1'));
    expect(legalMoves(covered)).toContain(mv('e1', 'c1'));
  });

  it('en passant takes the pawn beside, only right after the double step', () => {
    let s = fen('4k3/3p4/8/4P3/8/8/8/4K3 b - - 0');
    s = play(s, 'O', mv('d7', 'd5'))!;
    expect(s.ep).toBe(sq('d6'));
    const took = play(s, 'X', mv('e5', 'd6'))!;
    expect(took.kinds[sq('d5')]).toBe('.');
    expect(took.board[sq('d6')]).toBe('X');
    // Waiting a move loses the right.
    const waited = play(play(s, 'X', mv('e1', 'f1'))!, 'O', mv('e8', 'f8'))!;
    expect(legalMoves(waited)).not.toContain(mv('e5', 'd6'));
  });

  it('a pawn on the last row becomes the piece chosen', () => {
    const s = fen('4k3/1P6/8/8/8/8/8/4K3 w - - 0');
    expect(legalMoves(s).filter((m) => m % 4096 === sq('b7') * 64 + sq('b8'))).toHaveLength(4);
    expect(play(s, 'X', mv('b7', 'b8', 3))!.kinds[sq('b8')]).toBe('n');
    expect(play(s, 'X', mv('b7', 'b8', 0))!.kinds[sq('b8')]).toBe('q');
  });

  it('threefold repetition and the 50-move rule draw', () => {
    let s = newGame();
    const shuffle = [['g1', 'f3'], ['g8', 'f6'], ['f3', 'g1'], ['f6', 'g8']] as const;
    for (let i = 0; i < 2; i++) for (const [from, to] of shuffle) s = play(s, s.turn, mv(from, to))!;
    expect(s.winner).toBe('draw');
    expect(s.end).toBe('repeat');
    const fifty = play(fen('4k3/8/8/8/8/8/8/R3K3 w - - 99'), 'X', mv('a1', 'a2'))!;
    expect(fifty.end).toBe('fifty');
  });

  it('kings alone (or with one minor piece) cannot mate', () => {
    const s = fen('4k3/8/8/8/8/8/8/4K3 w - - 0');
    expect(tooLittle(s.board, s.kinds)).toBe(true);
    expect(tooLittle(fen('4k3/8/8/8/8/8/8/3NK3 w - - 0').board, fen('4k3/8/8/8/8/8/8/3NK3 w - - 0').kinds)).toBe(true);
    const rook = fen('4k3/8/8/8/8/8/8/3RK3 w - - 0');
    expect(tooLittle(rook.board, rook.kinds)).toBe(false);
    const took = play(fen('4k3/8/8/8/8/8/3r4/4K3 w - - 0'), 'X', mv('e1', 'd2'))!;
    expect(took.end).toBe('material');
  });

  it('refuses illegal moves and odd states', () => {
    const s = newGame();
    expect(play(s, 'O', mv('e7', 'e5'))).toBeNull();
    expect(play(s, 'X', mv('e2', 'e5'))).toBeNull();
    expect(play(s, 'X', -1)).toBeNull();
    expect(isChessState(s)).toBe(true);
    expect(isChessState({ ...s, kinds: s.kinds.replace('k', 'q') })).toBe(false);
    expect(isChessState({ ...s, castle: 'XX' })).toBe(false);
    expect(CHESS.rematch(s).starter).toBe('O');
  });
});
