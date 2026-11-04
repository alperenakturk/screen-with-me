// Chess, the third board of 🎲 Classics (P7, `docs/internal/design/games/classics.md`). In-house rules: the server
// checks every move with them, the page draws with them, and the Glowbeam bot plays with them.
//
// - 8 × 8 board, cells 0–63, row 0 at the top. X (white) starts at the bottom (rows 6–7) and plays first.
// - `board` holds whose piece stands on a cell (the shared `BoardState` shape); `kinds` holds which piece it is, one
//   letter per cell: p pawn, n knight, b bishop, r rook, q queen, k king, '.' empty.
// - Castling (both sides), en passant, promotion (queen, rook, bishop or knight), check, mate, stalemate, the
//   50-move rule, threefold repetition and too little material to mate are all handled.
// - A move is `promo * 4096 + from * 64 + to`; `promo` is 0 queen, 1 rook, 2 bishop, 3 knight (only for a pawn
//   reaching the last row; any other move uses 0).

import { isBoardState, other, type BoardRules, type BoardState, type Cell, type Mark } from './board.ts';

export const SIZE = 8;
const CELLS = SIZE * SIZE;
export const PROMOTIONS = ['q', 'r', 'b', 'n'] as const;
/** Half-moves without a capture or a pawn move that end a game in a draw (50 moves each). */
export const FIFTY = 100;
/** Repetitions of one position kept (one per half-move since the last capture / pawn move, so ≤ FIFTY). */
const MAX_SEEN = FIFTY + 2;

export type PieceKind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type ChessEnd = 'mate' | 'stalemate' | 'fifty' | 'repeat' | 'material';

export interface ChessState extends BoardState {
  /** One letter per cell (`PieceKind` or '.'). */
  kinds: string;
  /** Castling still allowed: K / Q white king- / queen-side, k / q black. */
  castle: string;
  /** The square a pawn skipped over on the last move (en passant target), or null. */
  ep: number | null;
  /** Half-moves since the last capture or pawn move. */
  halfmove: number;
  /** Short hashes of the positions since the last capture or pawn move (threefold repetition). */
  seen: string[];
  /** The side to move is in check. */
  check: boolean;
  /** Why the game ended. */
  end: ChessEnd | null;
  /** The last move's from-cell (the page marks both squares). */
  from?: number;
}

const rowOf = (cell: number) => Math.floor(cell / SIZE);
const colOf = (cell: number) => cell % SIZE;
const at = (row: number, col: number) => row * SIZE + col;
const inside = (row: number, col: number) => row >= 0 && row < SIZE && col >= 0 && col < SIZE;
const BACK = 'rnbqkbnr';
const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]] as const;
const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]] as const;
const ROOK = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
const BISHOP = [[-1, -1], [-1, 1], [1, -1], [1, 1]] as const;
/** The direction a side's pawns move (row step). */
const ahead = (mark: Mark) => (mark === 'X' ? -1 : 1);
const homeRow = (mark: Mark) => (mark === 'X' ? 7 : 0);

export function newGame(starter: Mark = 'X'): ChessState {
  const board = Array<Cell>(CELLS).fill(null);
  const kinds = Array<string>(CELLS).fill('.');
  for (let col = 0; col < SIZE; col++) {
    board[at(0, col)] = 'O';
    kinds[at(0, col)] = BACK[col]!;
    board[at(1, col)] = 'O';
    kinds[at(1, col)] = 'p';
    board[at(6, col)] = 'X';
    kinds[at(6, col)] = 'p';
    board[at(7, col)] = 'X';
    kinds[at(7, col)] = BACK[col]!;
  }
  const s: ChessState = {
    board,
    kinds: kinds.join(''),
    turn: starter,
    winner: null,
    line: null,
    starter,
    castle: 'KQkq',
    ep: null,
    halfmove: 0,
    seen: [],
    check: false,
    end: null,
  };
  s.seen = [positionKey(s)];
  return s;
}

/** Is `cell` attacked by any piece of `by`? */
export function attacked(board: readonly Cell[], kinds: string, cell: number, by: Mark): boolean {
  const row = rowOf(cell);
  const col = colOf(cell);
  // Pawns attack diagonally forward, so look one row behind (from the attacker's view).
  const pr = row - ahead(by);
  for (const dc of [-1, 1]) {
    const c = col + dc;
    if (inside(pr, c) && board[at(pr, c)] === by && kinds[at(pr, c)] === 'p') return true;
  }
  for (const [dr, dc] of KNIGHT) {
    const r = row + dr;
    const c = col + dc;
    if (inside(r, c) && board[at(r, c)] === by && kinds[at(r, c)] === 'n') return true;
  }
  for (const [dr, dc] of KING) {
    const r = row + dr;
    const c = col + dc;
    if (inside(r, c) && board[at(r, c)] === by && kinds[at(r, c)] === 'k') return true;
  }
  const slide = (dirs: readonly (readonly [number, number])[], hit: string) => {
    for (const [dr, dc] of dirs) {
      let r = row + dr;
      let c = col + dc;
      while (inside(r, c)) {
        const i = at(r, c);
        if (board[i] !== null) {
          if (board[i] === by && hit.includes(kinds[i]!)) return true;
          break;
        }
        r += dr;
        c += dc;
      }
    }
    return false;
  };
  return slide(ROOK, 'rq') || slide(BISHOP, 'bq');
}

const kingOf = (board: readonly Cell[], kinds: string, mark: Mark) => {
  for (let i = 0; i < CELLS; i++) if (board[i] === mark && kinds[i] === 'k') return i;
  return -1;
};

/** Moves that follow the pieces' paths, before the "own king not left in check" test. */
function pseudoMoves(s: ChessState): number[] {
  const mark = s.turn;
  const foe = other(mark);
  const out: number[] = [];
  const add = (from: number, to: number) => {
    if (s.kinds[from] === 'p' && rowOf(to) === homeRow(foe)) for (let p = 0; p < PROMOTIONS.length; p++) out.push(p * 4096 + from * CELLS + to);
    else out.push(from * CELLS + to);
  };
  for (let from = 0; from < CELLS; from++) {
    if (s.board[from] !== mark) continue;
    const kind = s.kinds[from] as PieceKind;
    const row = rowOf(from);
    const col = colOf(from);
    if (kind === 'p') {
      const r = row + ahead(mark);
      if (inside(r, col) && s.board[at(r, col)] === null) {
        add(from, at(r, col));
        const r2 = r + ahead(mark);
        const start = mark === 'X' ? 6 : 1;
        if (row === start && s.board[at(r2, col)] === null) add(from, at(r2, col));
      }
      for (const dc of [-1, 1]) {
        const c = col + dc;
        if (!inside(r, c)) continue;
        const to = at(r, c);
        if (s.board[to] === foe || to === s.ep) add(from, to);
      }
      continue;
    }
    const steps = (dirs: readonly (readonly [number, number])[], slide: boolean) => {
      for (const [dr, dc] of dirs) {
        let r = row + dr;
        let c = col + dc;
        while (inside(r, c)) {
          const to = at(r, c);
          if (s.board[to] === mark) break;
          add(from, to);
          if (s.board[to] !== null || !slide) break;
          r += dr;
          c += dc;
        }
      }
    };
    if (kind === 'n') steps(KNIGHT, false);
    else if (kind === 'b') steps(BISHOP, true);
    else if (kind === 'r') steps(ROOK, true);
    else if (kind === 'q') (steps(ROOK, true), steps(BISHOP, true));
    else if (kind === 'k') {
      steps(KING, false);
      // Castling: rights kept, the squares between empty, the king not in, through or into check.
      const home = homeRow(mark);
      if (from === at(home, 4) && !attacked(s.board, s.kinds, from, foe)) {
        const [kSide, qSide] = mark === 'X' ? ['K', 'Q'] : ['k', 'q'];
        const empty = (...cols: number[]) => cols.every((c) => s.board[at(home, c)] === null);
        const safe = (...cols: number[]) => cols.every((c) => !attacked(s.board, s.kinds, at(home, c), foe));
        if (s.castle.includes(kSide) && empty(5, 6) && safe(5, 6) && s.kinds[at(home, 7)] === 'r' && s.board[at(home, 7)] === mark) out.push(from * CELLS + at(home, 6));
        if (s.castle.includes(qSide) && empty(1, 2, 3) && safe(2, 3) && s.kinds[at(home, 0)] === 'r' && s.board[at(home, 0)] === mark) out.push(from * CELLS + at(home, 2));
      }
    }
  }
  return out;
}

interface Applied {
  board: Cell[];
  kinds: string[];
  capture: boolean;
  pawn: boolean;
}

/** The board after a move (no legality checks). */
function applyMove(s: ChessState, move: number): Applied {
  const promo = Math.floor(move / 4096);
  const from = Math.floor((move % 4096) / CELLS);
  const to = move % CELLS;
  const board = s.board.slice();
  const kinds = s.kinds.split('');
  const mark = board[from]!;
  const kind = kinds[from]!;
  let capture = board[to] !== null;
  if (kind === 'p' && to === s.ep && board[to] === null) {
    // En passant: the captured pawn stands beside the mover, not on the target square.
    const victim = at(rowOf(from), colOf(to));
    board[victim] = null;
    kinds[victim] = '.';
    capture = true;
  }
  if (kind === 'k' && Math.abs(colOf(to) - colOf(from)) === 2) {
    // Castling moves the rook too.
    const row = rowOf(from);
    const [rookFrom, rookTo] = colOf(to) === 6 ? [at(row, 7), at(row, 5)] : [at(row, 0), at(row, 3)];
    board[rookTo] = board[rookFrom]!;
    kinds[rookTo] = 'r';
    board[rookFrom] = null;
    kinds[rookFrom] = '.';
  }
  board[to] = mark;
  kinds[to] = kind === 'p' && rowOf(to) === homeRow(other(mark)) ? PROMOTIONS[promo] ?? 'q' : kind;
  board[from] = null;
  kinds[from] = '.';
  return { board, kinds, capture, pawn: kind === 'p' };
}

/** Every legal move of the side to play. */
export function legalMoves(s: ChessState): number[] {
  if (s.winner !== null) return [];
  const mark = s.turn;
  return pseudoMoves(s).filter((move) => {
    const next = applyMove(s, move);
    const kinds = next.kinds.join('');
    const king = kingOf(next.board, kinds, mark);
    return king >= 0 && !attacked(next.board, kinds, king, other(mark));
  });
}

/** A short hash of what makes two positions the same (pieces, side to move, castling, a usable en passant). */
function positionKey(s: ChessState): string {
  let epUsable = '';
  if (s.ep !== null) {
    const r = s.ep - ahead(s.turn) * SIZE;
    for (const dc of [-1, 1]) {
      const c = colOf(s.ep) + dc;
      const cell = r + dc;
      if (c >= 0 && c < SIZE && s.board[cell] === s.turn && s.kinds[cell] === 'p') epUsable = String(s.ep);
    }
  }
  const text = s.board.map((c, i) => (c === null ? '.' : c === 'X' ? s.kinds[i]!.toUpperCase() : s.kinds[i])).join('') + s.turn + s.castle + epUsable;
  // FNV-1a, 32 bits: plenty for at most ~100 positions in one game.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** Neither side can ever mate: kings alone, or a lone bishop / knight, or bishops all on one colour. */
export function tooLittle(board: readonly Cell[], kinds: string): boolean {
  const rest: { kind: string; cell: number }[] = [];
  for (let i = 0; i < CELLS; i++) if (board[i] !== null && kinds[i] !== 'k') rest.push({ kind: kinds[i]!, cell: i });
  if (rest.length === 0) return true;
  if (rest.some((p) => p.kind === 'p' || p.kind === 'r' || p.kind === 'q')) return false;
  if (rest.length === 1) return true;
  // Only bishops left, every one on the same colour of square.
  if (rest.every((p) => p.kind === 'b')) {
    const shade = (cell: number) => (rowOf(cell) + colOf(cell)) % 2;
    return rest.every((p) => shade(p.cell) === shade(rest[0]!.cell));
  }
  return false;
}

const CASTLE_LOST: Record<number, string> = { [at(7, 4)]: 'KQ', [at(7, 7)]: 'K', [at(7, 0)]: 'Q', [at(0, 4)]: 'kq', [at(0, 7)]: 'k', [at(0, 0)]: 'q' };

export function play(state: BoardState, mark: Mark, move: number): ChessState | null {
  const s = state as ChessState;
  if (s.winner !== null || s.turn !== mark || !Number.isInteger(move) || move < 0 || !legalMoves(s).includes(move)) return null;
  const from = Math.floor((move % 4096) / CELLS);
  const to = move % CELLS;
  const done = applyMove(s, move);
  const kinds = done.kinds.join('');
  // Castling rights go when a king or rook leaves its square or a rook is taken on it.
  let castle = s.castle;
  for (const cell of [from, to]) for (const ch of CASTLE_LOST[cell] ?? '') castle = castle.replace(ch, '');
  const doubleStep = done.pawn && Math.abs(rowOf(to) - rowOf(from)) === 2;
  const reset = done.capture || done.pawn;
  const next: ChessState = {
    ...s,
    board: done.board,
    kinds,
    turn: other(mark),
    castle,
    ep: doubleStep ? (from + to) / 2 : null,
    halfmove: reset ? 0 : s.halfmove + 1,
    seen: [],
    check: false,
    end: null,
    last: to,
    from,
  };
  const key = positionKey(next);
  next.seen = reset ? [key] : [...s.seen, key].slice(-MAX_SEEN);
  const king = kingOf(next.board, kinds, next.turn);
  next.check = king >= 0 && attacked(next.board, kinds, king, mark);
  const replies = legalMoves(next);
  if (replies.length === 0) {
    next.winner = next.check ? mark : 'draw';
    next.end = next.check ? 'mate' : 'stalemate';
  } else if (next.halfmove >= FIFTY) {
    next.winner = 'draw';
    next.end = 'fifty';
  } else if (next.seen.filter((k) => k === key).length >= 3) {
    next.winner = 'draw';
    next.end = 'repeat';
  } else if (tooLittle(next.board, kinds)) {
    next.winner = 'draw';
    next.end = 'material';
  }
  return next;
}

export function rematch(state: BoardState): ChessState {
  return newGame(other(state.starter));
}

export function isChessState(x: unknown): x is ChessState {
  if (!isBoardState(x, CELLS, 0)) return false;
  const s = x as ChessState;
  const cell = (n: unknown) => Number.isInteger(n) && (n as number) >= 0 && (n as number) < CELLS;
  return (
    typeof s.kinds === 'string' &&
    s.kinds.length === CELLS &&
    /^[pnbrqk.]+$/.test(s.kinds) &&
    s.board.every((c, i) => (c === null) === (s.kinds[i] === '.')) &&
    // Exactly one king a side.
    s.board.filter((c, i) => c === 'X' && s.kinds[i] === 'k').length === 1 &&
    s.board.filter((c, i) => c === 'O' && s.kinds[i] === 'k').length === 1 &&
    typeof s.castle === 'string' &&
    /^K?Q?k?q?$/.test(s.castle) &&
    (s.ep === null || cell(s.ep)) &&
    Number.isInteger(s.halfmove) &&
    s.halfmove >= 0 &&
    Array.isArray(s.seen) &&
    s.seen.length <= MAX_SEEN &&
    s.seen.every((k) => typeof k === 'string' && k.length <= 8) &&
    typeof s.check === 'boolean' &&
    (s.end === null || ['mate', 'stalemate', 'fifty', 'repeat', 'material'].includes(s.end)) &&
    (s.from === undefined || cell(s.from))
  );
}

export const CHESS: BoardRules = { moves: PROMOTIONS.length * 4096, newGame, play, rematch, isState: isChessState };
