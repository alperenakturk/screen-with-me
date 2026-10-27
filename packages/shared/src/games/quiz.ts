// Bilgi yarışması: 2–8 kişi, 10 soru, dört şık, her soruya 15 sn. Doğru cevap 100–200 puan (hızlı olan çok alır),
// yanlış 0. Herkes cevaplayınca ya da süre bitince doğru şık ve kimin neyi seçtiği gösterilir, sonra sıradaki soru.
// Son soruda kürsü. Sunucu (ayrı Durable Object `Quiz`) soruları seçer, şıkları karıştırır, doğru şıkkı ancak
// açıklamada söyler. Bu dosya mesajlar, doğrulama ve puan.

import { CLIENT_ID, cleanName, isAvatar, type Avatar } from '../protocol.ts';
import { QUIZ_BANK, type QuizEntry } from './quiz-questions.ts';

export const QUIZ_PROTOCOL_VERSION = 1;
export const QUIZ_MAX_PLAYERS = 8;
export const QUIZ_QUESTIONS = 10;
export const QUIZ_ANSWER_MS = 15_000;
export const QUIZ_REVEAL_MS = 4_000;

export type QuizLang = 'tr' | 'en';
export type QuizPhase = 'lobby' | 'question' | 'reveal' | 'over';

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
  online: boolean;
}

export type QuizClientMessage =
  | { t: 'hello'; v: number; name: string; avatar?: Avatar; cid?: string; lang?: QuizLang }
  | { t: 'start' }
  /** `n`: hangi soruya (geç kalan cevap bir sonrakine sayılmasın). */
  | { t: 'answer'; n: number; pick: number }
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
      /** Sadece açıklamada. */
      correct?: number;
      endsAt: number | null;
      lang: QuizLang;
    }
  | { t: 'error'; code: QuizErrorCode }
  | { t: 'pong'; now: number };

export type QuizErrorCode = 'version' | 'bad' | 'full' | 'rate' | 'too_few';

const isInt = (x: unknown, min: number, max: number): x is number => Number.isInteger(x) && (x as number) >= min && (x as number) <= max;

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
    case 'answer':
      return isInt(m.n, 1, QUIZ_QUESTIONS) && isInt(m.pick, 0, 3) ? { t: 'answer', n: m.n, pick: m.pick } : null;
    case 'start':
    case 'ping':
      return { t: m.t };
    default:
      return null;
  }
}

/** Doğru cevabın puanı: hemen bilen 200, son anda bilen 100. */
export function answerPoints(remainingMs: number): number {
  return 100 + Math.round((100 * Math.max(0, Math.min(remainingMs, QUIZ_ANSWER_MS))) / QUIZ_ANSWER_MS);
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

/** Bankadan rastgele `count` soru; şıklar karışık (doğru şıkkın yeri her soruda başka). */
export function pickQuestions(lang: QuizLang, count = QUIZ_QUESTIONS, random: () => number = Math.random): QuizQuestion[] {
  const bank: QuizEntry[] = [...QUIZ_BANK[lang]];
  const out: QuizQuestion[] = [];
  while (out.length < count && bank.length) {
    const [question, correct, ...wrong] = bank.splice(Math.floor(random() * bank.length), 1)[0]!;
    const options = [correct, ...wrong];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [options[i], options[j]] = [options[j]!, options[i]!];
    }
    out.push({ question, options, correct: options.indexOf(correct) });
  }
  return out;
}

export const QUIZ_ID_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;
