// ⚔️ Five Frames Duel (card FFDUEL, Game Studio; notes in docs/internal/design/games/five-frames-duel.md): two players
// race to find the same five-letter word, each on their own board. Pure rules and the protocol. The server
// (`apps/server/src/duel.ts`) holds the answer and every guess and judges them: before the game ends a player gets only
// their own letters, the other board comes as marks (✓ • ×) only, and nobody gets the answer.
//
// - The table's first game is the day's word (the same one as the solo Five Frames, in the language picked at the
//   table); every rematch is a practice word picked at random (never the day's word).
// - The first to solve wins at once. If both use all seven tries without solving, it is a draw (they used the same
//   number of tries, so there is nothing fairer to count).
// - Guesses follow the solo game's rules (`five-frames.ts`): five letters of the language, a word from the list, no
//   repeat.

import { CLIENT_ID, cleanName, isAvatar, type Avatar } from '../protocol.ts';
import { LANGS, MAX_TRIES, WORD_LENGTH, guess, letters, score, type GuessError, type Lang, type Mark } from './five-frames.ts';

export const DUEL_PROTOCOL_VERSION = 1;
export const DUEL_ID_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;

export type DuelPhase = 'wait' | 'play' | 'over';

/** One player's board: the guesses so far (normalized words). */
export interface DuelBoard {
  guesses: string[];
}

export const boardSolved = (board: DuelBoard, answer: string): boolean => board.guesses.includes(answer);
export const boardDone = (board: DuelBoard, answer: string): boolean => boardSolved(board, answer) || board.guesses.length >= MAX_TRIES;

/**
 * Adds a guess to a board after the solo game's checks (`guess` in `five-frames.ts`). Returns null when it counted, or
 * why not (the board doesn't change then).
 */
export function duelGuess(board: DuelBoard, raw: string, answer: string, lang: Lang, allowed: (word: string) => boolean): GuessError | null {
  return guess({ day: 0, guesses: board.guesses }, raw, answer, lang, { allowed });
}

/** GMP (b): the most seats at a duel table (the first two people sit by themselves, the others press "Sit"). */
export const DUEL_MAX_SEATS = 6;

/**
 * The result after a guess by seat `by` (`boards` per seat, null = an empty seat; `solved` = the seats in the order
 * they found the word). Two players: the first to solve wins at once, 'draw' when both boards are used up. Three or more
 * (GMP b, owner: "more players racing on the same word"): the race goes on until every board is done; the first to
 * solve wins, 'draw' when nobody did. Null while the game goes on.
 */
export function duelOutcome(boards: readonly (DuelBoard | null)[], answer: string, by: number, solved: readonly number[] = []): number | 'draw' | null {
  const seated = boards.filter((b): b is DuelBoard => !!b);
  if (seated.length <= 2) {
    if (boards[by] && boardSolved(boards[by]!, answer)) return by;
    if (seated.every((b) => boardDone(b, answer))) return 'draw';
    return null;
  }
  if (!seated.every((b) => boardDone(b, answer))) return null;
  return solved.length ? solved[0]! : 'draw';
}

/**
 * The places at the end (GMP b): per seat, 1 for the first to solve, 2 for the next…, then every seat that didn't
 * solve shares the place after the last solver; 0 for an empty seat.
 */
export function duelRanks(boards: readonly (DuelBoard | null)[], answer: string, solved: readonly number[]): number[] {
  const order = solved.filter((i, k) => boards[i] && boardSolved(boards[i]!, answer) && solved.indexOf(i) === k);
  return boards.map((b, i) => {
    if (!b) return 0;
    const at = order.indexOf(i);
    return at >= 0 ? at + 1 : order.length + 1;
  });
}

/**
 * FW2: a seat's place among the players who found the word so far (1 = first), 0 while it hasn't. The page showed the
 * count of solvers instead, so the first finder read "2nd" as soon as a second one found it.
 */
export function duelPlace(solved: readonly number[], seat: number): number {
  return solved.indexOf(seat) + 1;
}

/**
 * Hard mode (NG1, owner's pick 9.4): every letter found so far must be used again. A ✓ letter stays in its place; a •
 * letter appears somewhere (as many times as the marks have shown it). Returns null when the guess keeps to that, or
 * the first rule it breaks: the letter and, for a ✓, its place (0-based). Both normalized words.
 */
export function hardModeMiss(previous: readonly string[], answer: string, word: string): { letter: string; at?: number } | null {
  const w = letters(word);
  for (const before of previous) {
    const marks = score(before, answer);
    const b = letters(before);
    // Right places first.
    for (let i = 0; i < WORD_LENGTH; i++) if (marks[i] === 'hit' && w[i] !== b[i]) return { letter: b[i]!, at: i };
    // Then every letter the guess showed as in the word, counted.
    const need = new Map<string, number>();
    b.forEach((c, i) => {
      if (marks[i] !== 'miss') need.set(c, (need.get(c) ?? 0) + 1);
    });
    for (const [c, n] of need) if (w.filter((x) => x === c).length < n) return { letter: c };
  }
  return null;
}

/** Best of three (NG1, owner's pick 9.3): the match is over when someone has two wins, or after three games. */
export const MATCH_GAMES = 3;
export function matchOver(bestOf: 1 | 3, wins: readonly number[], games: number): boolean {
  if (bestOf === 1) return games >= 1;
  return Math.max(...wins) >= 2 || games >= MATCH_GAMES;
}
/** The match's winner (seat), or null for a tie (GMP b: the one seat with the most wins, any number of seats). */
export function matchWinner(wins: readonly number[]): number | null {
  const best = Math.max(0, ...wins.map((w) => w ?? 0));
  const top = wins.flatMap((w, i) => ((w ?? 0) === best ? [i] : []));
  return best > 0 && top.length === 1 ? top[0]! : null;
}

/** A practice word: any answer except `avoid` (the day's word), picked with `random` (the server's secure one). */
export function practiceWord(answers: readonly string[], avoid: string, random: () => number): string {
  const pool = answers.length > 1 ? answers.filter((w) => w !== avoid) : answers;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!;
}

export type DuelClientMessage =
  | { t: 'hello'; v: number; name: string; avatar?: Avatar; cid?: string }
  | { t: 'ping' }
  | { t: 'ready'; on: boolean }
  | { t: 'lang'; lang: Lang }
  | { t: 'guess'; word: string }
  | { t: 'sit' }
  | { t: 'rematch' }
  | { t: 'settings'; bestOf?: 1 | 3; hard?: boolean }
  | { t: 'lab'; op: 'answer' };

export interface DuelPlayer {
  id: string;
  name: string;
  avatar?: Avatar;
  online: boolean;
  ready: boolean;
  wins: number;
  /** The marks of every guess (everyone may see these). */
  marks: Mark[][];
  /** The words: only on my own board, and on both once the game is over. */
  words?: string[];
  solved: boolean;
  /** Used all seven tries without the word. */
  out: boolean;
  /** FW2: the place this seat found the word in (1 = first), sent once it has; absent before. */
  place?: number;
}

export type DuelServerMessage =
  | { t: 'welcome'; you: string; now: number }
  | { t: 'pong'; now: number }
  | {
      t: 'state';
      phase: DuelPhase;
      /** The word language of this game (chosen while waiting). */
      lang: Lang;
      /** The day number of the day's word, or null for a practice word. */
      daily: number | null;
      /** Two to six seats (null = free; GMP b). */
      players: (DuelPlayer | null)[];
      /** My seat (-1 = watching). */
      seat: number;
      winner: number | null;
      draw: boolean;
      /** GMP b: each seat's place once the game is over (1 = first to solve; 0 = an empty seat). */
      ranks?: number[];
      /** The word, only once the game is over. */
      answer?: string;
      /** Games played at this table (a new one = new boards). */
      round: number;
      /** NG1: one game or best of three, and hard mode (letters found must be used again). */
      bestOf: 1 | 3;
      hard: boolean;
      /** The match so far: games played in it, wins per seat, whether it is over (and who won it, null = a tie). */
      match: { games: number; wins: number[]; over: boolean; winner: number | null };
      watchers: { id: string; name: string; avatar?: Avatar }[];
    }
  /** My guess wasn't counted: why (`short` / `letters` / `unknown` / `repeat` / `done`). */
  | { t: 'error'; code: string; letter?: string; at?: number }
  /** Test Lab, a local lab server only: the answer, to this tab. */
  | { t: 'reveal'; answer: string };

/** Checks and copies a client message (never trusts its shape). */
export function parseDuelMessage(raw: string): DuelClientMessage | null {
  if (raw.length > 1000) return null;
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!m || typeof m !== 'object') return null;
  switch (m.t) {
    case 'hello': {
      const name = cleanName(m.name);
      if (typeof m.v !== 'number' || name === null) return null;
      const hello: Extract<DuelClientMessage, { t: 'hello' }> = { t: 'hello', v: m.v, name };
      if (isAvatar(m.avatar)) hello.avatar = m.avatar;
      if (typeof m.cid === 'string' && CLIENT_ID.test(m.cid)) hello.cid = m.cid;
      return hello;
    }
    case 'ping':
    case 'sit':
    case 'rematch':
      return { t: m.t };
    case 'ready':
      return typeof m.on === 'boolean' ? { t: 'ready', on: m.on } : null;
    case 'lang':
      return (LANGS as readonly unknown[]).includes(m.lang) ? { t: 'lang', lang: m.lang as Lang } : null;
    case 'guess':
      // Five letters (Turkish ones are single code points once composed); the server normalizes and checks the rest.
      return typeof m.word === 'string' && m.word.length > 0 && m.word.length <= 20 ? { t: 'guess', word: m.word } : null;
    case 'settings': {
      const out: Extract<DuelClientMessage, { t: 'settings' }> = { t: 'settings' };
      if (m.bestOf === 1 || m.bestOf === 3) out.bestOf = m.bestOf;
      if (typeof m.hard === 'boolean') out.hard = m.hard;
      return out.bestOf === undefined && out.hard === undefined ? null : out;
    }
    case 'lab':
      return m.op === 'answer' ? { t: 'lab', op: 'answer' } : null;
    default:
      return null;
  }
}

/**
 * GMP (owner, 15 Nov 2026): who sees the letters of seat `side` while a game goes on. A player sees their own (the others
 * only as colour marks); a watcher (said hello, no seat) sees every board's letters live; everyone sees all at the end.
 * The answer itself stays hidden from everyone until the game is over.
 */
export function duelWordsVisible(viewer: number, side: number, watcher: boolean, over: boolean): boolean {
  if (over || viewer === side) return true;
  return viewer < 0 && watcher;
}
