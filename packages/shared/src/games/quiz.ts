// Quiz: 2–8 players, 5 / 10 / 15 questions (the host also picks the language and a topic), four options or true /
// false, 15 s each. Points come from `scoring.ts` (speed, being among the first, streaks); everyone has one 50:50
// joker per game. When everyone answered or the time is up the right option and who picked what are shown, then the
// next question; a podium at the end. The server (Durable Object `Quiz`) picks the questions, shuffles the options
// and only tells the right one at the reveal. This file: messages, validation, question picking.

import { CLIENT_ID, cleanName, isAvatar, type Avatar } from '../protocol.ts';
import { QUIZ_BANK, QUIZ_CATEGORIES, type QuizCategory } from './quiz-questions.ts';

/** 2: host settings (language, category, length), the 50:50 joker, rank / streak points. */
export const QUIZ_PROTOCOL_VERSION = 2;
export const QUIZ_MAX_PLAYERS = 8;
export const QUIZ_QUESTIONS = 10;
/** Game lengths the host can pick. */
export const QUIZ_COUNTS = [5, 10, 15] as const;
export type QuizCount = (typeof QUIZ_COUNTS)[number];
export const QUIZ_ANSWER_MS = 15_000;
export const QUIZ_REVEAL_MS = 4_000;
/** Questions the same game object does not ask again (rematches get new questions). */
export const QUIZ_RECENT = 150;

export type QuizLang = 'tr' | 'en';
export type QuizPhase = 'lobby' | 'question' | 'reveal' | 'over';
/** `mix`: every category. */
export type QuizTopic = QuizCategory | 'mix';
export { QUIZ_CATEGORIES, type QuizCategory };

export interface QuizPlayer {
  id: string;
  name: string;
  avatar?: Avatar;
  score: number;
  /** Bu soruyu cevapladı mı (hangi şık olduğu açıklamaya kadar gizli). */
  answered: boolean;
  /** Açıklamada: seçtiği şık ve kazandığı puan. */
  pick?: number;
  gained?: number;
  /** In the reveal: the order of this right answer (1 = first). */
  rank?: number;
  /** Right answers in a row (shown from 2 on). */
  streak: number;
  /** The 50:50 joker is used up (once per game). */
  joker: boolean;
  online: boolean;
}

export type QuizClientMessage =
  | { t: 'hello'; v: number; name: string; avatar?: Avatar; cid?: string; lang?: QuizLang }
  /** Host only, in the lobby or on the podium. */
  | { t: 'settings'; lang?: QuizLang; topic?: QuizTopic; count?: QuizCount }
  | { t: 'start' }
  /** `n`: hangi soruya (geç kalan cevap bir sonrakine sayılmasın). */
  | { t: 'answer'; n: number; pick: number }
  /** 50:50 on question `n` (before answering, once per game). */
  | { t: 'joker'; n: number }
  | { t: 'ping' };

export type QuizServerMessage =
  | { t: 'welcome'; you: string; now: number }
  | {
      t: 'state';
      phase: QuizPhase;
      players: QuizPlayer[];
      /** Soru numarası (1'den başlar) ve toplam. */
      n: number;
      total: number;
      question?: string;
      options?: string[];
      /** The question's category. */
      cat?: QuizCategory;
      /** Sadece açıklamada. */
      correct?: number;
      endsAt: number | null;
      lang: QuizLang;
      topic: QuizTopic;
      count: QuizCount;
      /** Who sets the language / topic / length (the first player still here). */
      host: string | null;
    }
  /** Only to the player who used the 50:50: the two wrong options to hide. */
  | { t: 'fifty'; n: number; hide: number[] }
  | { t: 'error'; code: QuizErrorCode }
  | { t: 'pong'; now: number };

export type QuizErrorCode = 'version' | 'bad' | 'full' | 'rate' | 'too_few' | 'not_host';

const isInt = (x: unknown, min: number, max: number): x is number => Number.isInteger(x) && (x as number) >= min && (x as number) <= max;
const maxQuestions: number = Math.max(...QUIZ_COUNTS);

export function parseQuizMessage(raw: string): QuizClientMessage | null {
  if (raw.length > 1000) return null;
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!m || typeof m !== 'object') return null;
  switch (m.t) {
    case 'hello': {
      const name = cleanName(m.name);
      if (typeof m.v !== 'number' || name === null) return null;
      const hello: Extract<QuizClientMessage, { t: 'hello' }> = { t: 'hello', v: m.v, name };
      if (isAvatar(m.avatar)) hello.avatar = m.avatar;
      if (typeof m.cid === 'string' && CLIENT_ID.test(m.cid)) hello.cid = m.cid;
      if (m.lang === 'tr' || m.lang === 'en') hello.lang = m.lang;
      return hello;
    }
    case 'settings': {
      const out: Extract<QuizClientMessage, { t: 'settings' }> = { t: 'settings' };
      if (m.lang === 'tr' || m.lang === 'en') out.lang = m.lang;
      if (m.topic === 'mix' || (QUIZ_CATEGORIES as readonly unknown[]).includes(m.topic)) out.topic = m.topic as QuizTopic;
      if ((QUIZ_COUNTS as readonly unknown[]).includes(m.count)) out.count = m.count as QuizCount;
      return Object.keys(out).length > 1 ? out : null;
    }
    case 'answer':
      return isInt(m.n, 1, maxQuestions) && isInt(m.pick, 0, 3) ? { t: 'answer', n: m.n, pick: m.pick } : null;
    case 'joker':
      return isInt(m.n, 1, maxQuestions) ? { t: 'joker', n: m.n } : null;
    case 'start':
    case 'ping':
      return { t: m.t };
    default:
      return null;
  }
}

export interface QuizQuestion {
  /** Position in `QUIZ_BANK` (for "don't ask again"). */
  id: number;
  cat: QuizCategory;
  question: string;
  options: string[];
  correct: number;
}

/** Questions of a language (and topic), as bank ids. */
export function quizPool(lang: QuizLang, topic: QuizTopic = 'mix'): number[] {
  const ids: number[] = [];
  QUIZ_BANK.forEach((entry, id) => {
    if (entry[lang] && (topic === 'mix' || entry.c === topic)) ids.push(id);
  });
  return ids;
}

/**
 * `count` random questions of the language and topic, skipping `avoid` (recently asked) while enough are left. Four
 * options are shuffled (the right one moves); true / false keeps "true" first.
 */
export function pickQuestions(
  lang: QuizLang,
  count: number = QUIZ_QUESTIONS,
  random: () => number = Math.random,
  topic: QuizTopic = 'mix',
  avoid: readonly number[] = [],
): QuizQuestion[] {
  const all = quizPool(lang, topic);
  const fresh = all.filter((id) => !avoid.includes(id));
  const pool = fresh.length >= count ? fresh : all;
  const out: QuizQuestion[] = [];
  while (out.length < count && pool.length) {
    const id = pool.splice(Math.floor(random() * pool.length), 1)[0]!;
    const entry = QUIZ_BANK[id]!;
    const text = entry[lang]!;
    if (entry.tf !== undefined) {
      out.push({ id, cat: entry.c, question: text.q, options: [...text.o], correct: entry.tf ? 0 : 1 });
      continue;
    }
    const right = text.o[0];
    const options = [...text.o];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [options[i], options[j]] = [options[j]!, options[i]!];
    }
    out.push({ id, cat: entry.c, question: text.q, options, correct: options.indexOf(right) });
  }
  return out;
}

/** 50:50: two random wrong options to hide (none on a true / false question). */
export function fiftyFifty(q: QuizQuestion, random: () => number = Math.random): number[] {
  if (q.options.length < 4) return [];
  const wrong = q.options.map((_, i) => i).filter((i) => i !== q.correct);
  wrong.splice(Math.floor(random() * wrong.length), 1);
  return wrong.sort((a, b) => a - b);
}

export const QUIZ_ID_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;
