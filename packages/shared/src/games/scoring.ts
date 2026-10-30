// Points for the timed guessing games (Quiz, Draw & Guess). Pure functions, so the formulas are tested and the same
// numbers can be explained in the UI. Owner's rules (Oct 2026): the first right answer is worth clearly more, the
// last one and answers after many wrong tries are worth less, and the drawer's points are balanced against the
// guessers' (one drawing round is worth about one good guess).

/** Share of the time left, 0–1. */
const share = (leftMs: number, totalMs: number): number => (totalMs > 0 ? Math.max(0, Math.min(leftMs, totalMs)) / totalMs : 0);

/** Quiz: speed part 50–150, bonus for the first three right answers (50 / 25 / 10) and a streak bonus (+10 for every
 * right answer in a row after the first, at most +30). A wrong or missing answer gets 0. Best case 230. */
export const QUIZ_RANK_BONUS = [50, 25, 10] as const;
export function quizPoints(leftMs: number, totalMs: number, rank: number, streak: number): number {
  const speed = 50 + Math.round(100 * share(leftMs, totalMs));
  const bonus = QUIZ_RANK_BONUS[rank - 1] ?? 0;
  return speed + bonus + 10 * Math.min(3, Math.max(0, streak - 1));
}

/** Wrong guesses that cost nothing (typos, a first idea). */
export const DRAW_FREE_TRIES = 2;
export const DRAW_MIN_POINTS = 10;

/**
 * Draw & Guess, a guesser: `200 × time × order × tries`.
 * - time: 0.3 (last second) … 1 (at once)
 * - order: 0.8 for every earlier guesser (1st 1, 2nd 0.8, 3rd 0.64, …): the first is worth clearly more, the last least
 * - tries: −10 % for every wrong guess after the first two free ones, never below half
 * At least 10.
 */
export function drawGuessPoints(leftMs: number, totalMs: number, rank: number, wrong: number): number {
  const time = 0.3 + 0.7 * share(leftMs, totalMs);
  const order = 0.8 ** Math.max(0, rank - 1);
  const tries = Math.max(0.5, 1 - 0.1 * Math.max(0, wrong - DRAW_FREE_TRIES));
  return Math.max(DRAW_MIN_POINTS, Math.round(200 * time * order * tries));
}

/**
 * Draw & Guess, the drawer (at the end of the round): the guessers' average × the share of players who guessed.
 * Everyone guessed fast → about as much as a fast guess; half guessed → half of their average; nobody → 0. So over a
 * game where everyone draws once, drawing is worth about the same as guessing.
 */
export function drawerPoints(gains: readonly number[], possible: number): number {
  if (!gains.length || possible <= 0) return 0;
  const average = gains.reduce((sum, x) => sum + x, 0) / gains.length;
  return Math.round(average * Math.min(1, gains.length / possible));
}
