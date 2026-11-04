import { describe, expect, it } from 'vitest';
import { legalMoves as backgammonMoves, play as playBackgammon, ROLL, OFF, fromOf, toOf, type BackgammonState } from './backgammon.ts';
import { legalMoves as chessMoves, play as playChess, type ChessState } from './chess.ts';
import { legalMoves as damaMoves, play as playDama, type DamaState } from './dama.ts';
import { LAB_POSITIONS, isLabPosition, labPosition } from './lab-positions.ts';

describe('lab positions', () => {
  it('every listed position passes its board check', () => {
    for (const [kind, names] of Object.entries(LAB_POSITIONS)) for (const name of names) expect(labPosition(kind as 'chess', name), `${kind}:${name}`).not.toBeNull();
  });

  it('refuses unknown kinds and names', () => {
    expect(isLabPosition('xox', 'mate1')).toBe(false);
    expect(isLabPosition('chess', 'nope')).toBe(false);
    expect(labPosition('chess', 'chain')).toBeNull();
  });

  it('chess mate1: Ra1-a8 is mate', () => {
    const s = labPosition('chess', 'mate1') as ChessState;
    const move = 56 * 64 + 0;
    expect(chessMoves(s)).toContain(move);
    expect(playChess(s, 'X', move)?.end).toBe('mate');
  });

  it('dama chain: three captures in one chain', () => {
    let s = labPosition('dama', 'chain') as DamaState;
    let taken = 0;
    while (s.turn === 'X' && taken < 5) {
      const moves = damaMoves(s);
      expect(moves.length).toBeGreaterThan(0);
      const before = s.board.filter((c) => c === 'O').length;
      s = playDama(s, 'X', moves[0]!)!;
      taken += before - s.board.filter((c) => c === 'O').length;
    }
    expect(taken).toBe(3);
  });

  it('backgammon bearoff: after a roll white can bear off', () => {
    const s = labPosition('backgammon', 'bearoff') as BackgammonState;
    const rolled = playBackgammon(s, 'X', ROLL, () => 0.99)!;
    expect(backgammonMoves(rolled).some((m) => toOf(m) === OFF && fromOf(m) < 6)).toBe(true);
  });
});

describe('lab messages in the game protocols', () => {
  it('parse the lab message without breaking the messages around it', async () => {
    const { parseQuizMessage } = await import('./quiz.ts');
    const { parseDrawMessage } = await import('./draw.ts');
    const { parseGameMessage } = await import('./protocol.ts');
    const { parseClientMessage } = await import('../protocol.ts');
    const j = (m: object) => JSON.stringify(m);
    expect(parseQuizMessage(j({ t: 'lab', op: 'skip' }))).toEqual({ t: 'lab', op: 'skip' });
    expect(parseQuizMessage(j({ t: 'lab', op: 'win' }))).toBeNull();
    expect(parseQuizMessage(j({ t: 'start' }))).toEqual({ t: 'start' });
    expect(parseDrawMessage(j({ t: 'lab', op: 'skip' }))).toEqual({ t: 'lab', op: 'skip' });
    for (const t of ['start', 'clear', 'undo', 'redo', 'reset']) expect(parseDrawMessage(j({ t }))).toEqual({ t });
    expect(parseGameMessage(j({ t: 'lab', position: 'mate1' }))).toEqual({ t: 'lab', position: 'mate1' });
    expect(parseGameMessage(j({ t: 'lab', position: '<b>' }))).toBeNull();
    expect(parseGameMessage(j({ t: 'rematch' }))).toEqual({ t: 'rematch' });
    expect(parseClientMessage(j({ t: 'lab', op: 'tipjar' }))).toEqual({ t: 'lab', op: 'tipjar' });
    expect(parseClientMessage(j({ t: 'lab', op: 'other' }))).toBeNull();
  });
});
