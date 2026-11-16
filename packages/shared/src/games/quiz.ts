// Quiz: 2–8 players, 5 / 10 / 15 questions (the host also picks the language and a topic), four options or true /
// false, 15 s each, or a typed answer (QZ2: 20 s, forgiving match: `matchTyped`). Harder questions and typed ones are
// worth more (`quizLevelBonus`). Points come from `scoring.ts` (speed, being among the first, streaks); everyone has one 50:50
// joker per game. When everyone answered or the time is up the right option and who picked what are shown, then the
// next question; a podium at the end. The server (Durable Object `Quiz`) picks the questions, shuffles the options
// and only tells the right one at the reveal. This file: messages, validation, question picking.

import { CLIENT_ID, cleanName, cleanText, isAvatar, type Avatar } from '../protocol.ts';
import { QUIZ_BANK, QUIZ_CATEGORIES, type QuizCategory, type QuizEntry } from './quiz-questions.ts';

/** 2: host settings (language, category, length), the 50:50 joker, rank / streak points. 3 (QZ2): typed answers. */
export const QUIZ_PROTOCOL_VERSION = 3;
export const QUIZ_MAX_PLAYERS = 8;
export const QUIZ_QUESTIONS = 10;
/** Game lengths the host can pick. */
export const QUIZ_COUNTS = [5, 10, 15] as const;
export type QuizCount = (typeof QUIZ_COUNTS)[number];
export const QUIZ_ANSWER_MS = 15_000;
export const QUIZ_REVEAL_MS = 4_000;
/** A typed-answer question gets more time (QZ2). */
export const QUIZ_TYPED_MS = 20_000;
/** The longest typed answer the table keeps (after `cleanText`). */
export const QUIZ_TYPED_MAX = 40;
/** The answer time of a question. */
export const quizAnswerMs = (typed: boolean | undefined): number => (typed ? QUIZ_TYPED_MS : QUIZ_ANSWER_MS);
/**
 * QZ2: harder questions are worth more: easy ×1, medium ×1.2, hard ×1.5; a typed answer ×1.3 on top. The bank's
 * older entries have no difficulty: medium.
 */
export function quizLevelBonus(level: 1 | 2 | 3 | undefined, typed: boolean | undefined): number {
  return ({ 1: 1, 2: 1.2, 3: 1.5 } as const)[level ?? 2] * (typed ? 1.3 : 1);
}

/** Folds a typed answer for comparing: case, accents, Turkish ı / İ, punctuation (not a number's minus), spaces and a
 * leading "the". */
export function foldAnswer(text: string): string {
  return text
    .replace(/[İIı]/g, 'i')
    .toLowerCase()
    // A minus sign before a number stays ("-40" is not "40"), as "minus" / "eksi" typed out.
    .replace(/(^|\s)(?:minus|eksi)\s*(?=\d)/g, '$1~')
    .replace(/[-−–](?=\d)/g, '~')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}~]+/gu, ' ')
    .trim()
    .replace(/^the /, '')
    .replace(/ /g, '');
}

/** Damerau–Levenshtein distance capped at 2 (one swap of neighbours counts as one typo). */
function typos(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  return d[a.length]![b.length]!;
}

/**
 * Is a typed answer right? Folded (`foldAnswer`) it equals an accepted answer, or is one typo away when that answer has
 * 5+ letters and is not a number (numbers must be exact).
 */
export function matchTyped(input: string, accepted: readonly string[]): boolean {
  const said = foldAnswer(input);
  if (!said) return false;
  return accepted.some((answer) => {
    const want = foldAnswer(answer);
    if (said === want) return true;
    return want.length >= 5 && !/\d/.test(want) && typos(said, want) <= 1;
  });
}
/** Questions the same game object does not ask again (rematches get new questions). */
export const QUIZ_RECENT = 150;
/** A browser remembers this many questions it has seen and sends them as a bitmap (base64) in its hello. */
export const QUIZ_SEEN_KEEP = 600;
/** Room for a bitmap of 4800 bank ids. */
export const SEEN_CHARS = 800;

/** Bank ids → a base64 bitmap (bit `id` set): compact enough for the hello's 1000 characters. */
export function encodeSeen(ids: readonly number[]): string {
  const max = Math.max(-1, ...ids.filter((id) => Number.isInteger(id) && id >= 0 && id < SEEN_CHARS * 6));
  const bytes = new Uint8Array(Math.ceil((max + 1) / 8));
  for (const id of ids) if (Number.isInteger(id) && id >= 0 && id <= max) bytes[id >> 3]! |= 1 << (id & 7);
  let text = '';
  for (const b of bytes) text += String.fromCharCode(b);
  return btoa(text);
}
export function decodeSeen(text: string): number[] {
  try {
    const raw = atob(text);
    const ids: number[] = [];
    for (let i = 0; i < raw.length; i++) {
      const b = raw.charCodeAt(i);
      for (let bit = 0; bit < 8; bit++) if (b & (1 << bit)) ids.push(i * 8 + bit);
    }
    return ids;
  } catch {
    return [];
  }
}

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
  /** In the reveal of a typed question: what this player typed (cleaned; never sent before the reveal). */
  said?: string;
  /** Right answers in a row (shown from 2 on). */
  streak: number;
  /** The 50:50 joker is used up (once per game). */
  joker: boolean;
  online: boolean;
}

export type QuizClientMessage =
  | { t: 'hello'; v: number; name: string; avatar?: Avatar; cid?: string; lang?: QuizLang; seen?: string }
  /** Host only, in the lobby or on the podium. */
  | { t: 'settings'; lang?: QuizLang; topic?: QuizTopic; count?: QuizCount }
  | { t: 'start' }
  /** `n`: which question (a late answer must not count for the next). `pick` an option, or `text` a typed answer. */
  | { t: 'answer'; n: number; pick: number }
  | { t: 'answer'; n: number; text: string }
  /** 50:50 on question `n` (before answering, once per game). */
  | { t: 'joker'; n: number }
  /** Test Lab (DL3b): end the current phase now; `typed` (QZ2): the next game asks only typed questions. Only a local
   * lab server acts on it. */
  | { t: 'lab'; op: 'skip' | 'typed' }
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
      /** The question's bank id (the browser remembers what it has seen, `encodeSeen`). */
      qid?: number;
      /** Only in the reveal. On a typed question 0, and a player's `pick` is 0 (right) or 1 (wrong). */
      correct?: number;
      /** A typed-answer question (no options; QZ2). */
      typed?: boolean;
      /** The reveal of a typed question: the right answer as shown. */
      answer?: string;
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

export type QuizErrorCode = 'version' | 'bad' | 'full' | 'rate' | 'too_few' | 'not_host' | 'lab_off';

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
      if (typeof m.seen === 'string' && m.seen.length <= SEEN_CHARS && /^[A-Za-z0-9+/=]*$/.test(m.seen)) hello.seen = m.seen;
      return hello;
    }
    case 'settings': {
      const out: Extract<QuizClientMessage, { t: 'settings' }> = { t: 'settings' };
      if (m.lang === 'tr' || m.lang === 'en') out.lang = m.lang;
      if (m.topic === 'mix' || (QUIZ_CATEGORIES as readonly unknown[]).includes(m.topic)) out.topic = m.topic as QuizTopic;
      if ((QUIZ_COUNTS as readonly unknown[]).includes(m.count)) out.count = m.count as QuizCount;
      return Object.keys(out).length > 1 ? out : null;
    }
    case 'answer': {
      if (!isInt(m.n, 1, maxQuestions)) return null;
      if (isInt(m.pick, 0, 3)) return { t: 'answer', n: m.n, pick: m.pick };
      if (typeof m.text !== 'string') return null;
      const text = cleanText(m.text, QUIZ_TYPED_MAX).trim();
      return text ? { t: 'answer', n: m.n, text } : null;
    }
    case 'joker':
      return isInt(m.n, 1, maxQuestions) ? { t: 'joker', n: m.n } : null;
    case 'lab':
      return m.op === 'skip' || m.op === 'typed' ? { t: 'lab', op: m.op } : null;
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
  /** A typed question (QZ2): `options` is empty, `accept` holds the accepted answers (server only, never sent). */
  typed?: true;
  accept?: string[];
}

/** Questions of a language (and topic), as bank ids. */
export function quizPool(lang: QuizLang, topic: QuizTopic = 'mix', only?: (entry: QuizEntry) => boolean): number[] {
  const ids: number[] = [];
  QUIZ_BANK.forEach((entry, id) => {
    if (entry[lang] && (topic === 'mix' || entry.c === topic) && (!only || only(entry))) ids.push(id);
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
  only?: (entry: QuizEntry) => boolean,
): QuizQuestion[] {
  const all = quizPool(lang, topic, only);
  const fresh = all.filter((id) => !avoid.includes(id));
  const pool = fresh.length >= count ? fresh : all;
  const out: QuizQuestion[] = [];
  while (out.length < count && pool.length) {
    const id = pool.splice(Math.floor(random() * pool.length), 1)[0]!;
    const entry = QUIZ_BANK[id]!;
    const text = entry[lang]!;
    if (entry.typed) {
      out.push({ id, cat: entry.c, question: text.q, options: [], correct: 0, typed: true, accept: [...(text.a ?? [])] });
      continue;
    }
    const given = text.o ?? [];
    if (entry.tf !== undefined) {
      out.push({ id, cat: entry.c, question: text.q, options: [...given], correct: entry.tf ? 0 : 1 });
      continue;
    }
    const right = given[0]!;
    const options = [...given];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [options[i], options[j]] = [options[j]!, options[i]!];
    }
    out.push({ id, cat: entry.c, question: text.q, options, correct: options.indexOf(right) });
  }
  // A game warms up: easier questions first, harder towards the end (unknown difficulty counts as medium).
  const level = (q: QuizQuestion) => QUIZ_BANK[q.id]!.d ?? 2;
  return out.map((q, i) => ({ q, i })).sort((a, b) => level(a.q) - level(b.q) || a.i - b.i).map(({ q }) => q);
}

/** 50:50: two random wrong options to hide (none on a true / false question). */
export function fiftyFifty(q: QuizQuestion, random: () => number = Math.random): number[] {
  if (q.options.length < 4) return [];
  const wrong = q.options.map((_, i) => i).filter((i) => i !== q.correct);
  wrong.splice(Math.floor(random() * wrong.length), 1);
  return wrong.sort((a, b) => a - b);
}

export const QUIZ_ID_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;
