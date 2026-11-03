// 🎟️ Five Frames (TR "Beş Kare"): the daily five-letter word game played beside the video (CARDS.md "Daily word
// game", research `docs/internal/research/word-game.md`, look `docs/internal/design/side-games/word/`). Pure rules,
// no DOM and no network: the same word for everyone on the same local day, seven tries, marks per letter, a share
// line without spoilers, one versioned JSON save in `localStorage` (`FRAMES_KEY`). Word lists live in their own
// modules; these rules take them as arguments.

export const FRAMES_KEY = 'fiveFrames';
export const FRAMES_VERSION = 1;
export const WORD_LENGTH = 5;
export const MAX_TRIES = 7;

export type Lang = 'en' | 'tr';
export const LANGS: readonly Lang[] = ['en', 'tr'];

/** Letters each language's words and keyboard use, in alphabetical order (the letter tray shows them like this). */
export const ALPHABET: Record<Lang, readonly string[]> = {
  en: Array.from('abcdefghijklmnopqrstuvwxyz'),
  tr: Array.from('abcçdefgğhıijklmnoöprsştuüvyz'),
};

/** ✓ right place · • in the word, another place · – not in the word. */
export type Mark = 'hit' | 'near' | 'miss';

/** Lower case the way the language does it (Turkish: I → ı, İ → i), composed, trimmed. */
export function normalize(word: string, lang: Lang): string {
  const text = word.normalize('NFC').trim();
  return lang === 'tr' ? text.toLocaleLowerCase('tr') : text.toLowerCase();
}

/** Upper case for showing letters (Turkish: i → İ, ı → I). */
export function upper(letter: string, lang: Lang): string {
  return lang === 'tr' ? letter.toLocaleUpperCase('tr') : letter.toUpperCase();
}

/** The letters of a word (Turkish letters are single code points once composed). */
export const letters = (word: string): string[] => Array.from(word);

/** Is this a five-letter word of the language's alphabet (already normalized)? */
export function wellFormed(word: string, lang: Lang): boolean {
  const chars = letters(word);
  return chars.length === WORD_LENGTH && chars.every((c) => ALPHABET[lang].includes(c));
}

/**
 * Marks a guess against the answer (both normalized). Repeated letters count only as often as the answer has them:
 * right places first, then "in the word" from left to right.
 */
export function score(guess: string, answer: string): Mark[] {
  const g = letters(guess);
  const a = letters(answer);
  const marks: Mark[] = g.map(() => 'miss');
  const left = new Map<string, number>();
  g.forEach((c, i) => {
    if (a[i] === c) marks[i] = 'hit';
    else left.set(a[i]!, (left.get(a[i]!) ?? 0) + 1);
  });
  g.forEach((c, i) => {
    if (marks[i] === 'hit') return;
    const n = left.get(c) ?? 0;
    if (n > 0) {
      marks[i] = 'near';
      left.set(c, n - 1);
    }
  });
  return marks;
}

/** The best mark each letter got so far (for the letter tray). */
export function trayMarks(guesses: readonly string[], answer: string): Map<string, Mark> {
  const rank: Record<Mark, number> = { miss: 0, near: 1, hit: 2 };
  const best = new Map<string, Mark>();
  for (const guess of guesses) {
    const marks = score(guess, answer);
    letters(guess).forEach((c, i) => {
      const mark = marks[i]!;
      const was = best.get(c);
      if (!was || rank[mark] > rank[was]) best.set(c, mark);
    });
  }
  return best;
}

/** Day 1 = 1 Nov 2026. A day is the player's own calendar day (like a newspaper puzzle). */
export const FIRST_DAY_UTC = Date.UTC(2026, 10, 1);
export function dayNumber(date: Date = new Date()): number {
  const local = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((local - FIRST_DAY_UTC) / 86_400_000) + 1;
}

/** A small seeded random (mulberry32): the same numbers on every device. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LANG_SEED: Record<Lang, number> = { en: 0x5eed_0001, tr: 0x5eed_0002 };

/**
 * The answer of a day: the list shuffled with a fixed seed, one word a day, a new shuffle every time the list runs
 * out (so every word comes once per round). Days before day 1 count as day 1.
 */
export function answerFor(day: number, answers: readonly string[], lang: Lang): string {
  if (!answers.length) throw new Error('no answers');
  const index = Math.max(0, Math.floor(day) - 1);
  const round = Math.floor(index / answers.length);
  const order = answers.map((_, i) => i);
  const random = seeded(LANG_SEED[lang] + round * 7919);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return answers[order[index % answers.length]!]!;
}

export interface DayGame {
  day: number;
  guesses: string[];
}

export type GuessError = 'done' | 'short' | 'letters' | 'unknown' | 'repeat';

export interface Words {
  /** Is this (normalized) word allowed as a guess? Answers always are. */
  allowed: (word: string) => boolean;
}

export const solved = (game: DayGame, answer: string): boolean => game.guesses.includes(answer);
export const finished = (game: DayGame, answer: string): boolean => solved(game, answer) || game.guesses.length >= MAX_TRIES;

/** Checks and adds a guess. Returns null when it was added, or why not (nothing changes then). */
export function guess(game: DayGame, raw: string, answer: string, lang: Lang, words: Words): GuessError | null {
  if (finished(game, answer)) return 'done';
  const word = normalize(raw, lang);
  if (letters(word).length !== WORD_LENGTH) return 'short';
  if (!wellFormed(word, lang)) return 'letters';
  if (game.guesses.includes(word)) return 'repeat';
  if (word !== answer && !words.allowed(word)) return 'unknown';
  game.guesses.push(word);
  return null;
}

export interface Stats {
  played: number;
  won: number;
  /** Days won in a row (a missed or lost day ends it), and the best run. */
  streak: number;
  best: number;
  /** The last day counted (so a day is counted once). */
  last: number;
  /** Wins by number of tries: index 0 = solved in 1. */
  tries: number[];
}

export interface FramesSave {
  v: typeof FRAMES_VERSION;
  games: Partial<Record<Lang, DayGame>>;
  stats: Record<Lang, Stats>;
}

const freshStats = (): Stats => ({ played: 0, won: 0, streak: 0, best: 0, last: 0, tries: Array.from({ length: MAX_TRIES }, () => 0) });
export const freshFrames = (): FramesSave => ({ v: FRAMES_VERSION, games: {}, stats: { en: freshStats(), tr: freshStats() } });

/** Counts a finished day once. A win continues the streak only if the day before was won too. */
export function record(save: FramesSave, lang: Lang, game: DayGame, answer: string): boolean {
  const stats = save.stats[lang];
  if (!finished(game, answer) || game.day <= stats.last) return false;
  const won = solved(game, answer);
  stats.played++;
  if (won) {
    stats.won++;
    stats.streak = stats.last === game.day - 1 ? stats.streak + 1 : 1;
    stats.best = Math.max(stats.best, stats.streak);
    const n = game.guesses.indexOf(answer);
    stats.tries[n] = (stats.tries[n] ?? 0) + 1;
  } else {
    stats.streak = 0;
  }
  stats.last = game.day;
  return true;
}

/** Today's game in this language: the saved one if it is today's, else a new empty one. */
export function today(save: FramesSave, lang: Lang, day: number): DayGame {
  const game = save.games[lang];
  if (game && game.day === day) return game;
  const fresh = { day, guesses: [] };
  save.games[lang] = fresh;
  return fresh;
}

/** The share line, without the word or any letter: "🍿 Five Frames #12 · 4/7", "… · X/7" when not solved. */
export function shareLine(title: string, game: DayGame, answer: string): string {
  const n = game.guesses.indexOf(answer);
  return `🍿 ${title} #${game.day} · ${n >= 0 ? n + 1 : 'X'}/${MAX_TRIES}`;
}

const num = (value: unknown, max: number): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(Math.min(value, max)) : 0;

/** Reads a save: broken or unknown versions start fresh, wrong fields are cleaned one by one. */
export function loadFrames(raw: unknown): FramesSave {
  let data: unknown = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return freshFrames();
    }
  }
  if (!data || typeof data !== 'object' || (data as { v?: unknown }).v !== FRAMES_VERSION) return freshFrames();
  const record = data as Record<string, unknown>;
  const save = freshFrames();
  const games = (record.games && typeof record.games === 'object' ? record.games : {}) as Record<string, unknown>;
  const stats = (record.stats && typeof record.stats === 'object' ? record.stats : {}) as Record<string, unknown>;
  for (const lang of LANGS) {
    const game = games[lang] as Record<string, unknown> | undefined;
    if (game && typeof game === 'object' && Array.isArray(game.guesses)) {
      const words = game.guesses
        .filter((w): w is string => typeof w === 'string')
        .map((w) => normalize(w, lang))
        .filter((w) => wellFormed(w, lang))
        .slice(0, MAX_TRIES);
      save.games[lang] = { day: num(game.day, 1e6), guesses: words };
    }
    const s = stats[lang] as Record<string, unknown> | undefined;
    if (s && typeof s === 'object') {
      const t = save.stats[lang];
      t.played = num(s.played, 1e6);
      t.won = Math.min(t.played, num(s.won, 1e6));
      t.streak = num(s.streak, 1e6);
      t.best = Math.max(t.streak, num(s.best, 1e6));
      t.last = num(s.last, 1e6);
      if (Array.isArray(s.tries)) t.tries = t.tries.map((_, i) => num((s.tries as unknown[])[i], 1e6));
    }
  }
  return save;
}

export const saveFrames = (save: FramesSave): string => JSON.stringify(save);
