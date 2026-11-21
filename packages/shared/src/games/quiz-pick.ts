// Quiz question picking (QZ4: apart from `quiz.ts`, which the browser loads, so only the server and the tests load the
// whole bank; the browser gets a question's level as the state's `lv`).

import { QUIZ_BANK, QUIZ_CATEGORIES, guessValue, isRetired, type QuizCategory, type QuizEntry } from './quiz-questions.ts';
import { QUIZ_OFFER, QUIZ_QUESTIONS, QUIZ_ROUND_QUESTIONS, levelDifficulty, type QuizLang, type QuizLevel, type QuizQuestion, type QuizTopic } from './quiz.ts';

/** QZ5: four-option questions (`choice`) or closest-guess questions (`guess`). True / false and typed words are retired. */
export type QuizPoolKind = 'choice' | 'guess';

/** Questions of a language (and topic, level and kind), as bank ids. */
export function quizPool(lang: QuizLang, topic: QuizTopic = 'mix', only?: (entry: QuizEntry) => boolean, level: QuizLevel = 'mix', kind: QuizPoolKind = 'choice'): number[] {
  const d = levelDifficulty(level);
  const ids: number[] = [];
  QUIZ_BANK.forEach((entry, id) => {
    if (!entry[lang] || isRetired(entry) || (guessValue(entry) !== null) !== (kind === 'guess')) return;
    if ((topic === 'mix' || entry.c === topic) && (!d || (entry.d ?? 2) === d) && (!only || only(entry))) ids.push(id);
  });
  return ids;
}

/** `count` random ids of a kind, skipping `avoid` while enough are left; a level, then a topic short of questions tops
 * up from the topic's other levels, then from every topic. */
function drawIds(lang: QuizLang, count: number, random: () => number, topic: QuizTopic, avoided: ReadonlySet<number>, level: QuizLevel, kind: QuizPoolKind, only?: (entry: QuizEntry) => boolean): number[] {
  let all = quizPool(lang, topic, only, level, kind);
  const topUp = (more: number[]) => (all = [...all, ...more.filter((id) => !all.includes(id))]);
  if (level !== 'mix' && all.length < count) topUp(quizPool(lang, topic, only, 'mix', kind));
  if (topic !== 'mix' && all.length < count) topUp(quizPool(lang, 'mix', only, level, kind));
  const fresh = all.filter((id) => !avoided.has(id));
  const pool = fresh.length >= count ? fresh : all;
  const out: number[] = [];
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(random() * pool.length), 1)[0]!);
  return out;
}

/** A bank entry as asked: four options shuffled (the right one moves), or a closest guess with its number. */
function toQuestion(id: number, lang: QuizLang, random: () => number): QuizQuestion {
  const entry = QUIZ_BANK[id]!;
  const text = entry[lang]!;
  const level = entry.d ?? 2;
  const value = guessValue(entry);
  if (value !== null) return { id, cat: entry.c, level, question: text.q, options: [], correct: 0, guess: true, value };
  const given = text.o ?? [];
  const right = given[0]!;
  const options = [...given];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [options[i], options[j]] = [options[j]!, options[i]!];
  }
  return { id, cat: entry.c, level, question: text.q, options, correct: options.indexOf(right) };
}

/**
 * A game's questions: `count` in all, of which `guesses` are closest-guess questions (QZ5), of the language and topic,
 * skipping `avoid` (recently asked) while enough are left. Option questions go from easy to hard; the guesses come
 * spread out, the last one closing the game (5: …, guess; 10: 5th and 10th; 15: 5th, 10th and 15th).
 */
export function pickQuestions(
  lang: QuizLang,
  count: number = QUIZ_QUESTIONS,
  random: () => number = Math.random,
  topic: QuizTopic = 'mix',
  avoid: readonly number[] = [],
  only?: (entry: QuizEntry) => boolean,
  level: QuizLevel = 'mix',
  guesses = 0,
): QuizQuestion[] {
  const avoided = new Set(avoid);
  const g = Math.max(0, Math.min(count, guesses));
  const choices = drawIds(lang, count - g, random, topic, avoided, level, 'choice', only).map((id) => toQuestion(id, lang, random));
  const guessed = drawIds(lang, g, random, topic, avoided, level, 'guess', only).map((id) => toQuestion(id, lang, random));
  // A game warms up: easier questions first, harder towards the end.
  const out = choices.map((q, i) => ({ q, i })).sort((a, b) => a.q.level - b.q.level || a.i - b.i).map(({ q }) => q);
  const total = out.length + guessed.length;
  guessed.sort((a, b) => a.level - b.level).forEach((q, k) => out.splice(Math.round(((k + 1) * total) / guessed.length) - 1, 0, q));
  return out;
}

/** The categories a tournament picker is offered: `QUIZ_OFFER` different ones with questions in the language. */
export function quizOffer(lang: QuizLang, random: () => number = Math.random, level: QuizLevel = 'mix'): QuizCategory[] {
  const cats = QUIZ_CATEGORIES.filter((c) => quizPool(lang, c, undefined, level).length >= QUIZ_ROUND_QUESTIONS * 4);
  const out: QuizCategory[] = [];
  while (out.length < QUIZ_OFFER && cats.length) out.push(cats.splice(Math.floor(random() * cats.length), 1)[0]!);
  return out;
}
