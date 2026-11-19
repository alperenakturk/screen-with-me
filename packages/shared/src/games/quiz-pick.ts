// Quiz question picking (QZ4: apart from `quiz.ts`, which the browser loads, so only the server and the tests load the
// whole bank; the browser gets a question's level as the state's `lv`).

import { QUIZ_BANK, QUIZ_CATEGORIES, type QuizCategory, type QuizEntry } from './quiz-questions.ts';
import { QUIZ_OFFER, QUIZ_QUESTIONS, QUIZ_ROUND_QUESTIONS, levelDifficulty, type QuizLang, type QuizLevel, type QuizQuestion, type QuizTopic } from './quiz.ts';

/** Questions of a language (and topic, and level), as bank ids. */
export function quizPool(lang: QuizLang, topic: QuizTopic = 'mix', only?: (entry: QuizEntry) => boolean, level: QuizLevel = 'mix'): number[] {
  const d = levelDifficulty(level);
  const ids: number[] = [];
  QUIZ_BANK.forEach((entry, id) => {
    if (entry[lang] && (topic === 'mix' || entry.c === topic) && (!d || (entry.d ?? 2) === d) && (!only || only(entry))) ids.push(id);
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
  level: QuizLevel = 'mix',
): QuizQuestion[] {
  const avoided = new Set(avoid);
  // A level with too few questions left (a small topic, a lab filter) tops up from the topic's other levels.
  let all = quizPool(lang, topic, only, level);
  if (level !== 'mix' && all.length < count) all = [...all, ...quizPool(lang, topic, only).filter((id) => !all.includes(id))];
  const fresh = all.filter((id) => !avoided.has(id));
  const pool = fresh.length >= count ? fresh : all;
  const out: QuizQuestion[] = [];
  while (out.length < count && pool.length) {
    const id = pool.splice(Math.floor(random() * pool.length), 1)[0]!;
    const entry = QUIZ_BANK[id]!;
    const text = entry[lang]!;
    const level = entry.d ?? 2;
    if (entry.typed) {
      out.push({ id, cat: entry.c, level, question: text.q, options: [], correct: 0, typed: true, accept: [...(text.a ?? [])] });
      continue;
    }
    const given = text.o ?? [];
    if (entry.tf !== undefined) {
      out.push({ id, cat: entry.c, level, question: text.q, options: [...given], correct: entry.tf ? 0 : 1 });
      continue;
    }
    const right = given[0]!;
    const options = [...given];
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [options[i], options[j]] = [options[j]!, options[i]!];
    }
    out.push({ id, cat: entry.c, level, question: text.q, options, correct: options.indexOf(right) });
  }
  // A game warms up: easier questions first, harder towards the end.
  return out.map((q, i) => ({ q, i })).sort((a, b) => a.q.level - b.q.level || a.i - b.i).map(({ q }) => q);
}

/** The categories a tournament picker is offered: `QUIZ_OFFER` different ones with questions in the language. */
export function quizOffer(lang: QuizLang, random: () => number = Math.random, level: QuizLevel = 'mix'): QuizCategory[] {
  const cats = QUIZ_CATEGORIES.filter((c) => quizPool(lang, c, undefined, level).length >= QUIZ_ROUND_QUESTIONS * 4);
  const out: QuizCategory[] = [];
  while (out.length < QUIZ_OFFER && cats.length) out.push(cats.splice(Math.floor(random() * cats.length), 1)[0]!);
  return out;
}

