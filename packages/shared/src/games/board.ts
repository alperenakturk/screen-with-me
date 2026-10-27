// İki kişilik tahta oyunlarının ortak biçimi (XOX, Dört Taş): iki işaret sırayla oynar, kazanan dizi işaretlenir,
// her yeni elde başlayan değişir. Kurallar her oyunun kendi dosyasında; sunucu ve site aynı kuralları kullanır.

export type Mark = 'X' | 'O';
export type Cell = Mark | null;

export interface BoardState {
  /** Hücreler: soldan sağa, yukarıdan aşağı. */
  board: Cell[];
  turn: Mark;
  /** Kazanan; 'draw' berabere; null sürüyor. */
  winner: Mark | 'draw' | null;
  /** Kazanan dizi (hücre numaraları). */
  line: number[] | null;
  /** Bu eli kim başlattı (sonraki eli diğeri başlatır). */
  starter: Mark;
  /** Son konan taşın hücresi (site "yeni konan" canlandırması için). */
  last?: number;
}

export interface BoardRules {
  /** Hamle numarasının üst sınırı (XOX: hücre 0–8, Dört Taş: sütun 0–6). */
  moves: number;
  newGame(starter?: Mark): BoardState;
  /** Hamleyi uygular (yeni durum döner); geçersizse null. */
  play(state: BoardState, mark: Mark, move: number): BoardState | null;
  rematch(state: BoardState): BoardState;
  isState(x: unknown): x is BoardState;
}

export const other = (mark: Mark): Mark => (mark === 'X' ? 'O' : 'X');

/** Dışarıdan (depodan, ağdan) gelen durumun ortak kısmını doğrular. */
export function isBoardState(x: unknown, size: number, minLine: number): x is BoardState {
  const s = x as BoardState | null;
  const mark = (m: unknown) => m === 'X' || m === 'O';
  return (
    !!s &&
    Array.isArray(s.board) &&
    s.board.length === size &&
    s.board.every((c) => c === null || mark(c)) &&
    mark(s.turn) &&
    mark(s.starter) &&
    (s.winner === null || s.winner === 'draw' || mark(s.winner)) &&
    (s.line === null || (Array.isArray(s.line) && s.line.length >= minLine && s.line.every((i) => Number.isInteger(i) && i >= 0 && i < size))) &&
    (s.last === undefined || (Number.isInteger(s.last) && s.last >= 0 && s.last < size))
  );
}
