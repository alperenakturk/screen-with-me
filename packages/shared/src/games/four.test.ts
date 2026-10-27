import { describe, expect, it } from 'vitest';
import { COLS, dropRow, isFourState, newGame, play, rematch } from './four.ts';
import type { BoardState, Mark } from './board.ts';

/** Sırayla sütunlara oynar (X başlar). */
function moves(cols: number[], start: BoardState = newGame()): BoardState {
  let state = start;
  for (const col of cols) {
    const next = play(state, state.turn, col);
    if (!next) throw new Error(`geçersiz hamle: ${col}`);
    state = next;
  }
  return state;
}

describe('Dört Taş', () => {
  it('taş sütunun en altına düşer, üst üste dizilir', () => {
    const s = moves([3, 3]);
    expect(s.board[5 * COLS + 3]).toBe('X');
    expect(s.board[4 * COLS + 3]).toBe('O');
    expect(s.last).toBe(4 * COLS + 3);
    expect(dropRow(s.board, 3)).toBe(3);
  });

  it('dolu sütuna ve sırası olmayan oynayamaz', () => {
    const full = moves([0, 0, 0, 0, 0, 0]);
    expect(play(full, full.turn, 0)).toBeNull();
    expect(play(newGame(), 'O' as Mark, 2)).toBeNull();
    expect(play(newGame(), 'X', 7)).toBeNull();
  });

  it('yatay, dikey ve çapraz dört kazanır', () => {
    // Yatay: X 0,1,2,3 (O arada 0,1,2 üstüne).
    const h = moves([0, 0, 1, 1, 2, 2, 3]);
    expect(h.winner).toBe('X');
    expect(h.line).toEqual([35, 36, 37, 38]);
    // Dikey: X hep 4. sütuna.
    expect(moves([4, 5, 4, 5, 4, 5, 4]).winner).toBe('X');
    // Çapraz (sol alttan sağ üste).
    const d = moves([0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3]);
    expect(d.winner).toBe('X');
    expect(d.line).toHaveLength(4);
    // Kazandıktan sonra hamle yok.
    expect(play(h, h.turn, 5)).toBeNull();
  });

  it('rövanşta başlayan değişir, durum doğrulanır', () => {
    const next = rematch(moves([0]));
    expect(next.starter).toBe('O');
    expect(next.turn).toBe('O');
    expect(isFourState(next)).toBe(true);
    expect(isFourState({ ...next, board: next.board.slice(1) })).toBe(false);
    expect(isFourState({ ...next, line: [1, 2] })).toBe(false);
  });
});
