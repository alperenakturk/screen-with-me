/**
 * Card FR1 (owner, 21 Nov 2026): "Rate the film together". The host starts a short poll from the film page (the
 * extension's rail); everyone answers the same fixed questions one after another; then a results card for all.
 * The server keeps who answered what (by the browser's key, never sent); clients only get counts and the names of
 * the people picked. No film title is part of it.
 */

/** The "one word for it" choices (fixed; the UI translates them). */
export const RATE_WORDS = ['fun', 'moving', 'gripping', 'clever', 'cozy', 'meh'] as const;
export type RateWord = (typeof RATE_WORDS)[number];
/** "Would you watch it again?" */
export const RATE_AGAIN = ['yes', 'maybe', 'no'] as const;
export type RateAgain = (typeof RATE_AGAIN)[number];
/** At most this many people can be picked from (the people in the room when the poll started). */
export const RATE_PEOPLE_MAX = 16;
/** A poll older than this is dropped (a late joiner never gets an hours-old poll). */
export const RATE_MAX_AGE_MS = 60 * 60 * 1000;

export interface RatePerson {
  id: string;
  name: string;
  avatar?: string;
}

/** One person's answers (sent once, at the end of the questions). */
export interface RateAnswer {
  /** 0.5–5 in half steps. */
  stars: number;
  /** A person id from the poll's `people` (absent: skipped). */
  most?: string;
  least?: string;
  again?: RateAgain;
  word?: RateWord;
}

export interface RatePick {
  id: string;
  name: string;
  avatar?: string;
  n: number;
}

export interface RateResults {
  votes: number;
  /** The average, rounded to one decimal. */
  stars: number;
  /** How many gave each half star: index 0 = 0.5 … index 9 = 5. */
  hist: number[];
  /** The people picked, most votes first (ties by name). */
  most: RatePick[];
  least: RatePick[];
  again: Record<RateAgain, number>;
  words: Record<RateWord, number>;
}

/** What every client sees. */
export interface FilmRate {
  id: string;
  /** The host who started it (display name). */
  by: string;
  at: number;
  people: RatePerson[];
  /** How many answered so far / how many the poll waits for. */
  answered: number;
  waiting: number;
  /** Present once the results are out. */
  results?: RateResults;
}

export function isStars(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0.5 && x <= 5 && Number.isInteger(x * 2);
}

/** Validates a client's answer and copies it into a new object (null: bad). */
export function cleanRateAnswer(m: Record<string, unknown>): RateAnswer | null {
  if (!isStars(m.stars)) return null;
  const out: RateAnswer = { stars: m.stars };
  const id = (x: unknown) => typeof x === 'string' && x.length > 0 && x.length <= 40;
  if (m.most !== undefined) {
    if (!id(m.most)) return null;
    out.most = m.most as string;
  }
  if (m.least !== undefined) {
    if (!id(m.least)) return null;
    out.least = m.least as string;
  }
  if (m.again !== undefined) {
    if (!(RATE_AGAIN as readonly unknown[]).includes(m.again)) return null;
    out.again = m.again as RateAgain;
  }
  if (m.word !== undefined) {
    if (!(RATE_WORDS as readonly unknown[]).includes(m.word)) return null;
    out.word = m.word as RateWord;
  }
  return out;
}

/** Counts the answers; picks that name nobody in `people` are ignored. */
export function tallyRate(answers: RateAnswer[], people: RatePerson[]): RateResults {
  const hist = Array.from({ length: 10 }, () => 0);
  const again = { yes: 0, maybe: 0, no: 0 } as Record<RateAgain, number>;
  const words = Object.fromEntries(RATE_WORDS.map((w) => [w, 0])) as Record<RateWord, number>;
  const most = new Map<string, number>();
  const least = new Map<string, number>();
  const known = new Map(people.map((p) => [p.id, p]));
  let sum = 0;
  for (const a of answers) {
    sum += a.stars;
    hist[Math.round(a.stars * 2) - 1]!++;
    if (a.again) again[a.again]++;
    if (a.word) words[a.word]++;
    if (a.most && known.has(a.most)) most.set(a.most, (most.get(a.most) ?? 0) + 1);
    if (a.least && known.has(a.least)) least.set(a.least, (least.get(a.least) ?? 0) + 1);
  }
  const picks = (m: Map<string, number>): RatePick[] =>
    [...m]
      .map(([id, n]) => {
        const p = known.get(id)!;
        return p.avatar ? { id, name: p.name, avatar: p.avatar, n } : { id, name: p.name, n };
      })
      .sort((x, y) => y.n - x.n || x.name.localeCompare(y.name));
  return {
    votes: answers.length,
    stars: answers.length ? Math.round((sum / answers.length) * 10) / 10 : 0,
    hist,
    most: picks(most),
    least: picks(least),
    again,
    words,
  };
}

/** The word most people chose (null: nobody chose one; a tie goes to the first in RATE_WORDS). */
export function topWord(r: RateResults): RateWord | null {
  let best: RateWord | null = null;
  for (const w of RATE_WORDS) if (r.words[w] > 0 && (!best || r.words[w] > r.words[best])) best = w;
  return best;
}
