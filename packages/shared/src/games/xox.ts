// XOX (tic-tac-toe) kuralları: sunucu hamleleri buna göre doğrular, site tahtayı buna göre çizer.
// Tahta 9 hücre (soldan sağa, yukarıdan aşağı 0–8). X ve O sırayla oynar; her yeni elde başlayan değişir.

export type Mark = 'X' | 'O';
export type Cell = Mark | null;

export interface XoxState {
  board: Cell[];
  turn: Mark;
  /** Kazanan; 'draw' berabere; null sürüyor. */
  winner: Mark | 'draw' | null;
  /** Kazanan üçlü (hücre numaraları). */
  line: number[] | null;
  /** Bu eli kim başlattı (sonraki eli diğeri başlatır). */
  starter: Mark;
}

export const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function newGame(starter: Mark = 'X'): XoxState {
  return { board: Array<Cell>(9).fill(null), turn: starter, winner: null, line: null, starter };
}

/** Hamle geçerli mi: oyun sürüyor, sıra bu işarette, hücre boş. */
export function canMove(state: XoxState, mark: Mark, cell: number): boolean {
  return state.winner === null && state.turn === mark && Number.isInteger(cell) && cell >= 0 && cell < 9 && state.board[cell] === null;
}

/** Hamleyi uygular (yeni durum döner); geçersizse null. */
export function play(state: XoxState, mark: Mark, cell: number): XoxState | null {
  if (!canMove(state, mark, cell)) return null;
  const board = state.board.slice();
  board[cell] = mark;
  const line = LINES.find(([a, b, c]) => board[a] !== null && board[a] === board[b] && board[a] === board[c]) ?? null;
  const full = board.every((c) => c !== null);
  return {
    board,
    turn: mark === 'X' ? 'O' : 'X',
    winner: line ? mark : full ? 'draw' : null,
    line: line ? [...line] : null,
    starter: state.starter,
  };
}

/** Sonraki el: başlayan değişir. */
export function rematch(state: XoxState): XoxState {
  return newGame(state.starter === 'X' ? 'O' : 'X');
}

/** Dışarıdan (depodan, ağdan) gelen durumu doğrular. */
export function isXoxState(x: unknown): x is XoxState {
  const s = x as XoxState | null;
  const mark = (m: unknown) => m === 'X' || m === 'O';
  return (
    !!s &&
    Array.isArray(s.board) &&
    s.board.length === 9 &&
    s.board.every((c) => c === null || mark(c)) &&
    mark(s.turn) &&
    mark(s.starter) &&
    (s.winner === null || s.winner === 'draw' || mark(s.winner)) &&
    (s.line === null || (Array.isArray(s.line) && s.line.length === 3))
  );
}
