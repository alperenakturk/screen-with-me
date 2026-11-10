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
import { LANGS, MAX_TRIES, guess, type GuessError, type Lang, type Mark } from './five-frames.ts';

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

/**
 * The result after a guess by seat `by`: that seat when it solved (the first to solve wins), 'draw' when both boards
 * are used up without the word, null while the game goes on.
 */
export function duelOutcome(boards: readonly DuelBoard[], answer: string, by: number): number | 'draw' | null {
  if (boardSolved(boards[by]!, answer)) return by;
  if (boards.every((b) => boardDone(b, answer))) return 'draw';
  return null;
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
      /** Two seats (null = free). */
      players: (DuelPlayer | null)[];
      /** My seat (-1 = watching). */
      seat: number;
      winner: number | null;
      draw: boolean;
      /** The word, only once the game is over. */
      answer?: string;
      /** Games played at this table (a new one = new boards). */
      round: number;
      watchers: { id: string; name: string; avatar?: Avatar }[];
    }
  /** My guess wasn't counted: why (`short` / `letters` / `unknown` / `repeat` / `done`). */
  | { t: 'error'; code: string }
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
    case 'lab':
      return m.op === 'answer' ? { t: 'lab', op: 'answer' } : null;
    default:
      return null;
  }
}
