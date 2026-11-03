// 🍿 Snack Bar: the solo idle game played beside the video (CARDS.md "Snack Bar", research
// `docs/internal/research/solo-games-accounts.md` Part A). Pure rules, no DOM and no network: the page ticks the save
// with how long the room's video played, and keeps it in `localStorage` as one versioned JSON (`SNACK_KEY`).
//
// Rules (owner, 2 Nov 2026):
// - Income only while the room's video plays (`ctx.playing`); a paused or empty room earns nothing.
// - Together bonus: +10 % per other person in the room, +5 % more for each of them who is in voice with me.
// - "While you were away": coming back pays a share of the base income for the time away, capped.
// - Prestige "open a new cinema": restart with stars, each star a lasting income bonus.

export const SNACK_KEY = 'snackBar';
export const SNACK_VERSION = 1;

/** The Design session's upgrades (`docs/internal/design/side-games/snack-bar/items/<id>.svg`, scene groups). */
export type StandId = 'popcorn' | 'soda' | 'nachos' | 'candy' | 'second-counter';

export interface StandInfo {
  id: StandId;
  /** Price of the first level. */
  cost: number;
  /** Coins per second each level earns (before bonuses). */
  rate: number;
}

/** In unlock order; each one costs ~11× the one before and earns ~8× more. */
export const STANDS: readonly StandInfo[] = [
  { id: 'popcorn', cost: 10, rate: 0.5 },
  { id: 'soda', cost: 120, rate: 4 },
  { id: 'nachos', cost: 1_300, rate: 30 },
  { id: 'candy', cost: 14_000, rate: 220 },
  { id: 'second-counter', cost: 150_000, rate: 1_600 },
];
export const STAND_IDS = STANDS.map((s) => s.id);

/** Every level costs this much more than the last. */
export const COST_GROWTH = 1.15;
/** A stand's income doubles when it reaches each of these levels. */
export const MILESTONES: readonly number[] = [10, 25, 50, 100, 200];

/** Together bonus per other person in the room, and extra per other person in voice with me. */
export const TOGETHER_BONUS = 0.1;
export const VOICE_BONUS = 0.05;
/** Others beyond this many add nothing (a big room should not break the economy). */
export const TOGETHER_MAX = 9;

/** Away: at least this long counts, at most this long is paid, at this share of the base income. */
export const AWAY_MIN_S = 60;
export const AWAY_CAP_S = 2 * 3600;
export const AWAY_SHARE = 0.25;

/** A tap on the counter ("serve") pays this many seconds of income, at least 1 coin; only while the video plays. */
export const SERVE_SECONDS = 1;
/** Ticks longer than this are ignored (a sleeping laptop or a frozen tab is not watching). */
export const MAX_TICK_S = 5;

/** A new cinema opens once this cinema earned this much; stars = floor(sqrt(earned / STAR_UNIT)). */
export const PRESTIGE_MIN = 1_000_000;
export const STAR_UNIT = 100_000;
/** Each star: +5 % income for good. */
export const STAR_BONUS = 0.05;

export interface SnackSave {
  v: typeof SNACK_VERSION;
  /** Coins to spend. */
  coins: number;
  /** Coins earned in this cinema (for prestige). */
  earned: number;
  /** Coins earned over every cinema. */
  lifetime: number;
  /** Seconds of the room's video played while the game ticked. */
  watched: number;
  levels: Record<StandId, number>;
  /** Stars from earlier cinemas (not spent: each one is a lasting bonus). */
  stars: number;
  /** How many cinemas were opened after the first. */
  cinemas: number;
  /** Wall-clock time (ms) the game last ticked or was closed; 0 = never. */
  seen: number;
}

export interface SnackContext {
  /** The room's video is playing (not paused, not in the "3-2-1" hold, something loaded). */
  playing: boolean;
  /** Other people in the room (by person, not tabs; TVs not counted). */
  others: number;
  /** Other people in voice while I am in voice too (0 when I am not in voice). */
  voiceOthers: number;
}

export function freshSnack(): SnackSave {
  const levels = Object.fromEntries(STAND_IDS.map((id) => [id, 0])) as Record<StandId, number>;
  levels.popcorn = 1;
  return { v: SNACK_VERSION, coins: 0, earned: 0, lifetime: 0, watched: 0, levels, stars: 0, cinemas: 0, seen: 0 };
}

const num = (value: unknown, max = Number.MAX_VALUE): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(value, max) : 0;
const int = (value: unknown, max: number): number => Math.floor(num(value, max));

/**
 * Reads a saved game: anything broken, missing or from an unknown (newer) version gives a fresh game, wrong fields
 * are cleaned one by one. Older versions are migrated step by step here (none yet: version 1 is the first).
 */
export function loadSnack(raw: unknown): SnackSave {
  let data: unknown = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return freshSnack();
    }
  }
  if (!data || typeof data !== 'object') return freshSnack();
  const record = data as Record<string, unknown>;
  if (record.v !== SNACK_VERSION) return freshSnack();
  const save = freshSnack();
  const levels = (record.levels && typeof record.levels === 'object' ? record.levels : {}) as Record<string, unknown>;
  for (const id of STAND_IDS) save.levels[id] = int(levels[id], 10_000);
  save.levels.popcorn = Math.max(1, save.levels.popcorn);
  save.coins = num(record.coins);
  save.earned = num(record.earned);
  save.lifetime = Math.max(num(record.lifetime), save.earned);
  save.watched = num(record.watched);
  save.stars = int(record.stars, 1_000_000);
  save.cinemas = int(record.cinemas, 1_000_000);
  save.seen = num(record.seen);
  return save;
}

export const saveSnack = (save: SnackSave): string => JSON.stringify(save);

/** Income multiplier of one stand from its milestones (×2 for each one reached). */
export function milestoneFactor(level: number): number {
  return 2 ** MILESTONES.filter((m) => level >= m).length;
}

/** The next milestone above this level, or null after the last one. */
export const nextMilestone = (level: number): number | null => MILESTONES.find((m) => m > level) ?? null;

/** Coins per second of one stand before the room's bonuses. */
export function standRate(stand: StandInfo, level: number): number {
  return stand.rate * level * milestoneFactor(level);
}

export const starFactor = (save: SnackSave): number => 1 + STAR_BONUS * save.stars;

/** Coins per second without the together bonus (the away bonus uses this). */
export function baseRate(save: SnackSave): number {
  return STANDS.reduce((sum, stand) => sum + standRate(stand, save.levels[stand.id]), 0) * starFactor(save);
}

/** The together bonus: 1 alone, 1.1 with one other person, 1.15 when that person is in voice with me. */
export function togetherFactor(ctx: SnackContext): number {
  const others = Math.min(TOGETHER_MAX, Math.max(0, Math.floor(ctx.others)));
  const voice = Math.min(others, Math.max(0, Math.floor(ctx.voiceOthers)));
  return 1 + TOGETHER_BONUS * others + VOICE_BONUS * voice;
}

/** Coins per second right now (0 while the room's video is not playing). */
export function incomeRate(save: SnackSave, ctx: SnackContext): number {
  return ctx.playing ? baseRate(save) * togetherFactor(ctx) : 0;
}

function earn(save: SnackSave, coins: number): void {
  save.coins += coins;
  save.earned += coins;
  save.lifetime += coins;
}

/** Moves the game on by `seconds` of wall time. Returns the coins earned. */
export function tick(save: SnackSave, seconds: number, ctx: SnackContext, now = Date.now()): number {
  save.seen = now;
  if (!(seconds > 0) || seconds > MAX_TICK_S || !ctx.playing) return 0;
  save.watched += seconds;
  const coins = incomeRate(save, ctx) * seconds;
  earn(save, coins);
  return coins;
}

/** A tap on the counter. Returns the coins earned (0 while the video is not playing). */
export function serve(save: SnackSave, ctx: SnackContext): number {
  if (!ctx.playing) return 0;
  const coins = Math.max(1, incomeRate(save, ctx) * SERVE_SECONDS);
  earn(save, coins);
  return coins;
}

/** What coming back after being away pays (not added yet: `collectAway` does that). */
export function awayBonus(save: SnackSave, now = Date.now()): { seconds: number; coins: number } {
  if (!save.seen) return { seconds: 0, coins: 0 };
  const away = (now - save.seen) / 1000;
  if (!(away >= AWAY_MIN_S)) return { seconds: 0, coins: 0 };
  const seconds = Math.min(away, AWAY_CAP_S);
  return { seconds, coins: baseRate(save) * seconds * AWAY_SHARE };
}

export function collectAway(save: SnackSave, now = Date.now()): { seconds: number; coins: number } {
  const bonus = awayBonus(save, now);
  if (bonus.coins > 0) earn(save, bonus.coins);
  save.seen = now;
  return bonus;
}

const standOf = (id: StandId): StandInfo => STANDS.find((s) => s.id === id)!;

/** The price of the next `count` levels of a stand at `level`. */
export function costOf(id: StandId, level: number, count = 1): number {
  const stand = standOf(id);
  if (count <= 0) return 0;
  return (stand.cost * COST_GROWTH ** level * (COST_GROWTH ** count - 1)) / (COST_GROWTH - 1);
}

/** How many levels of a stand the coins buy now (at most `limit`). */
export function affordable(save: SnackSave, id: StandId, limit = 1000): number {
  const stand = standOf(id);
  const level = save.levels[id];
  const first = stand.cost * COST_GROWTH ** level;
  if (save.coins < first) return 0;
  const n = Math.floor(Math.log((save.coins * (COST_GROWTH - 1)) / first + 1) / Math.log(COST_GROWTH));
  // Float rounding can land one off on the boundary: step back while it costs more than we have.
  let count = Math.min(limit, Math.max(0, n));
  while (count > 0 && costOf(id, level, count) > save.coins * (1 + 1e-12)) count--;
  return count;
}

/** A stand shows up once the one before it has a level (popcorn always). */
export function unlocked(save: SnackSave, id: StandId): boolean {
  const index = STAND_IDS.indexOf(id);
  const before = STAND_IDS[index - 1];
  return !before || save.levels[before] > 0;
}

/** Buys `count` levels; false (and nothing changes) when it is locked or too expensive. */
export function buy(save: SnackSave, id: StandId, count = 1): boolean {
  if (!unlocked(save, id) || count < 1) return false;
  const price = costOf(id, save.levels[id], count);
  if (price > save.coins * (1 + 1e-12)) return false;
  save.coins = Math.max(0, save.coins - price);
  save.levels[id] += count;
  return true;
}

/** Stars a new cinema would bring now (0 before `PRESTIGE_MIN`). */
export function starsFor(save: SnackSave): number {
  return save.earned >= PRESTIGE_MIN ? Math.floor(Math.sqrt(save.earned / STAR_UNIT)) : 0;
}

/** Opens a new cinema: coins and stands start over, stars are added. False when it is too early. */
export function newCinema(save: SnackSave): boolean {
  const stars = starsFor(save);
  if (stars < 1) return false;
  const fresh = freshSnack();
  save.coins = 0;
  save.earned = 0;
  save.levels = fresh.levels;
  save.stars += stars;
  save.cinemas += 1;
  return true;
}

const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

/** Short coin amounts: 999, 1.2K, 34.5M, 120B … (the same in every language). */
export function formatCoins(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0';
  if (value < 1000) return value < 10 && value % 1 ? value.toFixed(1).replace(/\.0$/, '') : String(Math.floor(value));
  let unit = 0;
  let scaled = value;
  while (scaled >= 1000 && unit < UNITS.length - 1) {
    scaled /= 1000;
    unit++;
  }
  if (scaled >= 1000) return value.toExponential(2).replace('+', '');
  const digits = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  const text = (Math.floor(scaled * 10 ** digits) / 10 ** digits).toFixed(digits).replace(/\.?0+$/, '');
  return `${text}${UNITS[unit]}`;
}
