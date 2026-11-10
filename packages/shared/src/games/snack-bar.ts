// 🍿 Snack Bar: the solo idle game played beside the video (CARDS.md "Snack Bar", research
// `docs/internal/research/solo-games-accounts.md` Part A). Pure rules, no DOM and no network: the page ticks the save
// with how long the room's video played, and keeps it in `localStorage` as one versioned JSON (`SNACK_KEY`).
//
// Rules (owner, 2 Nov 2026):
// - Income only while the room's video plays (`ctx.playing`); a paused or empty room earns nothing.
// - Together bonus: +10 % per other person in the room, +5 % more for each of them who is in voice with me.
// - Only in a room (owner, 4 Nov 2026): the game moves only while its window is open (or minimized) in a room and the
//   room's video plays. Nothing is paid for the time away (the old "while you were away" share is gone, 0.9.97.31).
// - Prestige "open a new cinema": restart with stars, each star a lasting income bonus.
// - Side games 2 (owner's picks 1, 2, 4; 4 Nov 2026): customers walk up with a line and a tap serves them for more
//   (missing one costs nothing); at a film's end Stub hands over a receipt with a golden bucket; badges, each worth
//   +1 % income (a few silly ones give nothing).
// - Every new cinema is a different place (owner's pick 3): the lobby, then a drive-in (soda ×2), a rooftop (+25 %
//   between 20:00 and 04:00), an art house (candy ×3 income, ×2 price), then round again.
// - Decorations (owner's pick 6): looks only, bought once with coins, kept over every cinema.
// - NG2 (owner's picks 8: 1–4, 10 Nov 2026): each place has its own shop-front colours (the page), a seasonal stand
//   that changes every week (four in turn, a badge each), a manager's report on each film's receipt (what sold, what
//   to buy next) and a short sound per stand at its milestones (the page). Saves carry over: `season` is optional.

export const SNACK_KEY = 'snackBar';
/**
 * 2 = SB3 (owner, 10 Nov 2026: "give it proper logic and maths like other clicker games"): eight stands with their own
 * price growth, recipes, staff, the menu bonus and the daily special. A version 1 save is migrated (`loadSnack`):
 * every level, coin, star, badge and decoration is kept, and no stand earns less than it did.
 */
export const SNACK_VERSION = 2;

/** The stands, cheapest first (art: `apps/web/src/games/art/snack-bar/<id>.svg`). Ids never change (saves keep them). */
export type StandId = 'popcorn' | 'soda' | 'nachos' | 'candy' | 'second-counter' | 'hotdog' | 'ice-cream' | 'arcade';

export interface StandInfo {
  id: StandId;
  /** Price of the first level. */
  cost: number;
  /** Every level costs this much more than the last (1.08 for popcorn up to 1.15 for the arcade). */
  growth: number;
  /** Coins per second each level earns (before bonuses). */
  rate: number;
}

/**
 * SB3 economy (`docs/internal/design/games/snack-bar-3.md`, checked by `scripts/snack-sim.mjs`): each stand costs
 * ~25× the one before and earns ~8× more, so its first level pays itself back ~3× slower (20 s for popcorn, ~17 h for
 * the arcade: the stands open one after another over hours of film, not minutes). The cheap stands' prices grow slower
 * (×1.08 a level up to ×1.15 for the arcade), so they stay worth levelling long after the next stand opens; with the
 * milestones, recipes and the menu bonus the best buy moves between stands instead of always being the newest one
 * (v1: every stand grew ×1.15 and only the newest one paid).
 */
export const STANDS: readonly StandInfo[] = [
  { id: 'popcorn', cost: 10, growth: 1.08, rate: 0.5 },
  { id: 'soda', cost: 250, growth: 1.09, rate: 4 },
  { id: 'nachos', cost: 6_000, growth: 1.1, rate: 32 },
  { id: 'candy', cost: 150_000, growth: 1.11, rate: 250 },
  { id: 'second-counter', cost: 4e6, growth: 1.12, rate: 2_000 },
  { id: 'hotdog', cost: 1e8, growth: 1.13, rate: 16_000 },
  { id: 'ice-cream', cost: 2.5e9, growth: 1.14, rate: 130_000 },
  { id: 'arcade', cost: 6e10, growth: 1.15, rate: 1_000_000 },
];
export const STAND_IDS = STANDS.map((s) => s.id);

/** Version 1's price growth (kept for the migration's note and the tests). */
export const COST_GROWTH_V1 = 1.15;
/** A stand's income doubles when it reaches each of these levels. */
export const MILESTONES: readonly number[] = [10, 25, 50, 100, 200, 300, 400];

/** The menu bonus: +10 % income for every stand at level `MENU_LEVEL` or more (eight stands: up to +80 %). */
export const MENU_LEVEL = 25;
export const MENU_BONUS = 0.1;

/**
 * Recipes: three one-time upgrades a stand, each doubling it. A recipe shows once the stand has `need` levels and
 * costs `price` × the stand's first price. Ids `<stand>:<1|2|3>`; they start over with a new cinema.
 */
export const RECIPE_STEPS: readonly { need: number; price: number }[] = [
  { need: 5, price: 30 },
  { need: 25, price: 1_200 },
  { need: 75, price: 90_000 },
];
export const RECIPE_FACTOR = 2;
export type RecipeId = `${StandId}:${1 | 2 | 3}`;
export const RECIPE_IDS: readonly RecipeId[] = STAND_IDS.flatMap((id) => [1, 2, 3].map((n) => `${id}:${n}` as RecipeId));

/** Staff: hired once with coins, kept over every cinema (like decorations). The page carries out what they do. */
export type StaffId = 'tip-box' | 'usher' | 'long-line' | 'manager';
export const STAFF: readonly { id: StaffId; cost: number }[] = [
  /** Taps on the counter pay `TAP_SECONDS_TIPBOX` s of income instead of `SERVE_SECONDS`. */
  { id: 'tip-box', cost: 400 },
  /** Serves a waiting customer after `USHER_DELAY_S` s (the page). */
  { id: 'usher', cost: 6_000 },
  /** Customers come twice as often (the page halves its wait). */
  { id: 'long-line', cost: 80_000 },
  /** A customer pays `CUSTOMER_SECONDS_MANAGER` s of income instead of `CUSTOMER_SECONDS`. */
  { id: 'manager', cost: 1_500_000 },
];
export const TAP_SECONDS_TIPBOX = 2;
export const USHER_DELAY_S = 8;
export const CUSTOMER_SECONDS_MANAGER = 10;

/** The daily special: one stand a day (UTC) earns ×2 (`specialOf`). */
export const SPECIAL_FACTOR = 2;
/** The stand on special on this UTC day (days since 1970); the same for everyone, a different one most days. */
export function specialOf(day: number): StandId {
  // A small integer hash (xorshift-multiply), so neighbouring days spread over the stands.
  let x = Math.floor(day) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x45d9f3b) >>> 0;
  x = (x ^ (x >>> 16)) >>> 0; // a bitwise result is signed: back to unsigned, or the index could go negative
  return STAND_IDS[x % STAND_IDS.length]!;
}
/** Today's UTC day number (for `specialOf`). */
export const dayNumber = (now = Date.now()): number => Math.floor(now / 86_400_000);

/** Together bonus per other person in the room, and extra per other person in voice with me. */
export const TOGETHER_BONUS = 0.1;
export const VOICE_BONUS = 0.05;
/** Others beyond this many add nothing (a big room should not break the economy). */
export const TOGETHER_MAX = 9;

/** A tap on the counter ("serve") pays this many seconds of income, at least 1 coin; only while the video plays. */
export const SERVE_SECONDS = 1;
/** Ticks longer than this are ignored (a sleeping laptop or a frozen tab is not watching). */
export const MAX_TICK_S = 5;

/**
 * A new cinema opens once this cinema earned this much; stars = floor(cbrt(earned / STAR_UNIT)), a soft curve: twice
 * the stars take eight times the coins (v1: a square root). SB3: the first one opens after ~2 h of film for an active
 * player, with ~25 stars.
 */
export const PRESTIGE_MIN = 1e11;
export const STAR_UNIT = 6.4e6;
/** Each star: +2 % income for good (v1: 5 %; a v1 save's stars are converted so they keep their bonus, `V1_STAR_RATIO`). */
export const STAR_BONUS = 0.02;
export const V1_STAR_RATIO = 2.5;

/** A customer served: this many seconds of income (at least `CUSTOMER_MIN` coins). */
export const CUSTOMER_SECONDS = 5;
export const CUSTOMER_MIN = 3;
/** A receipt needs this much of the film watched with the game going. */
export const RECEIPT_MIN_S = 5 * 60;
/** The golden bucket: this many seconds of base income (at least `BUCKET_MIN`). */
export const BUCKET_SECONDS = 60;
export const BUCKET_MIN = 25;
/** Each badge with a bonus: +1 % income for good. */
export const BADGE_BONUS = 0.01;
const RECEIPTS_KEEP = 20;

export type PlaceId = 'lobby' | 'drive-in' | 'rooftop' | 'art-house' | 'seaside' | 'planetarium';
/** SB3 added the seaside and the planetarium after the art house (a v1 save past its fourth cinema moves on the round). */
const PLACES_AFTER: readonly PlaceId[] = ['drive-in', 'rooftop', 'art-house', 'seaside', 'planetarium'];
/** The seaside: customers pay ×2. */
export const SEASIDE_CUSTOMERS = 2;
/** The planetarium: +25 % income while nobody else is in the room (a quiet night under the stars). */
export const PLANETARIUM_BONUS = 0.25;
/** The place of this cinema: the first is the lobby, then the three places in turn. */
export const placeOf = (save: SnackSave): PlaceId => (save.cinemas < 1 ? 'lobby' : PLACES_AFTER[(save.cinemas - 1) % PLACES_AFTER.length]!);
export const ROOFTOP_BONUS = 0.25;
const isNight = (hour: number) => hour >= 20 || hour < 4;
/** A stand's income in this place. */
export function placeRate(save: SnackSave, id: StandId): number {
  const place = placeOf(save);
  if (place === 'drive-in' && id === 'soda') return 2;
  if (place === 'art-house' && id === 'candy') return 3;
  return 1;
}
/** A stand's price in this place. */
export const placeCost = (save: SnackSave, id: StandId): number => (placeOf(save) === 'art-house' && id === 'candy' ? 2 : 1);
/** The whole cinema's income in this place at this local hour. */
export const placeFactor = (save: SnackSave, hour: number): number => (placeOf(save) === 'rooftop' && isNight(hour) ? 1 + ROOFTOP_BONUS : 1);

/** Looks only (owner's pick 6): bought once, kept over every cinema and a new start keeps nothing. */
export type DecorId = 'marquee' | 'poster' | 'rope' | 'neon';
export const DECOR: readonly { id: DecorId; cost: number }[] = [
  { id: 'marquee', cost: 500 },
  { id: 'poster', cost: 5_000 },
  { id: 'rope', cost: 50_000 },
  { id: 'neon', cost: 500_000 },
];
/** Buys a decoration; false when owned already or too expensive. */
export function buyDecor(save: SnackSave, id: DecorId): boolean {
  const item = DECOR.find((d) => d.id === id);
  if (!item || save.decor.includes(id) || save.coins < item.cost) return false;
  save.coins -= item.cost;
  save.decor.push(id);
  return true;
}

export interface SnackStats {
  /** Serves (taps and customers) over every cinema. */
  served: number;
  /** Customers served. */
  customers: number;
  /** Seconds the game went while someone else was in the room. */
  together: number;
  /** Serves while someone else was in voice with me. */
  voiceServed: number;
  /** Receipts collected (films watched with the game going). */
  films: number;
  /** Seconds of film watched with the game going (all cinemas). */
  watched: number;
}

/** This film so far (for its receipt). */
export interface SnackFilm {
  item: string;
  watched: number;
  served: number;
  coins: number;
}

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
  stats: SnackStats;
  /** Badges earned (ids from `BADGES`), in the order they came. */
  badges: string[];
  /** The film (room item) the game is going in now. */
  film: SnackFilm | null;
  /** Room items whose receipt was already given. */
  receipts: string[];
  /** Decorations bought (looks only). */
  decor: DecorId[];
  /** Recipes bought in this cinema (SB3). */
  recipes: RecipeId[];
  /** Staff hired (SB3; kept over every cinema). */
  staff: StaffId[];
  /** NG2: this week's seasonal stand (`week` = `seasonWeek`); a new week starts it again at level 0. */
  season: { week: number; level: number } | null;
}

export interface SnackContext {
  /** The room's video is playing (not paused, not in the "3-2-1" hold, something loaded). */
  playing: boolean;
  /** Other people in the room (by person, not tabs; TVs not counted). */
  others: number;
  /** Other people in voice while I am in voice too (0 when I am not in voice). */
  voiceOthers: number;
  /** The room's item now (its receipt counts this film). */
  item?: { id: string } | null;
  /** The room's tip jar filled during this film: +10 % (pick 5). */
  boost?: boolean;
  /** NG2: this week (`seasonWeek`); the page passes it (the Test Lab can move it). Default: from `now`. */
  week?: number;
  /** Today's special (`specialOf(dayNumber())`, the page passes it): that stand earns ×2. */
  special?: StandId | null;
}

/** The room's full tip jar: this much more income for everyone until the film ends. */
export const TIP_BOOST = 0.1;

export function freshSnack(): SnackSave {
  const levels = Object.fromEntries(STAND_IDS.map((id) => [id, 0])) as Record<StandId, number>;
  levels.popcorn = 1;
  return {
    v: SNACK_VERSION, coins: 0, earned: 0, lifetime: 0, watched: 0, levels, stars: 0, cinemas: 0, seen: 0,
    stats: { served: 0, customers: 0, together: 0, voiceServed: 0, films: 0, watched: 0 },
    badges: [], film: null, receipts: [], decor: [], recipes: [], staff: [], season: null,
  };
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
  // Version 1 (before SB3) has the same fields minus recipes and staff: everything it holds is kept as it is.
  if (record.v !== SNACK_VERSION && record.v !== 1) return freshSnack();
  const save = freshSnack();
  const levels = (record.levels && typeof record.levels === 'object' ? record.levels : {}) as Record<string, unknown>;
  for (const id of STAND_IDS) save.levels[id] = int(levels[id], 10_000);
  save.levels.popcorn = Math.max(1, save.levels.popcorn);
  save.coins = num(record.coins);
  save.earned = num(record.earned);
  save.lifetime = Math.max(num(record.lifetime), save.earned);
  save.watched = num(record.watched);
  save.stars = int(record.stars, 1_000_000);
  // A v1 star was +5 %, a v2 star is +2 %: the same bonus takes 2.5 as many (rounded up, never less).
  if (record.v === 1) save.stars = Math.ceil(save.stars * V1_STAR_RATIO);
  save.cinemas = int(record.cinemas, 1_000_000);
  save.seen = num(record.seen);
  const stats = (record.stats && typeof record.stats === 'object' ? record.stats : {}) as Record<string, unknown>;
  for (const key of Object.keys(save.stats) as (keyof SnackStats)[]) save.stats[key] = num(stats[key]);
  const ids = new Set(BADGES.map((b) => b.id));
  save.badges = Array.isArray(record.badges) ? [...new Set(record.badges.filter((id): id is string => typeof id === 'string' && ids.has(id)))] : [];
  const film = record.film as Record<string, unknown> | null | undefined;
  save.film =
    film && typeof film === 'object' && typeof film.item === 'string' && film.item.length <= 64
      ? { item: film.item, watched: num(film.watched), served: Math.floor(num(film.served)), coins: num(film.coins) }
      : null;
  save.decor = Array.isArray(record.decor) ? [...new Set(record.decor.filter((id): id is DecorId => DECOR.some((d) => d.id === id)))] : [];
  save.recipes = Array.isArray(record.recipes)
    ? [...new Set(record.recipes.filter((id): id is RecipeId => typeof id === 'string' && (RECIPE_IDS as readonly string[]).includes(id)))]
    : [];
  save.staff = Array.isArray(record.staff) ? [...new Set(record.staff.filter((id): id is StaffId => STAFF.some((s) => s.id === id)))] : [];
  const season = record.season as Record<string, unknown> | null | undefined;
  save.season =
    season && typeof season === 'object' && typeof season.week === 'number' && Number.isInteger(season.week) && season.week >= 0
      ? { week: season.week, level: int(season.level, SEASON_LEVELS) }
      : null;
  save.receipts = Array.isArray(record.receipts)
    ? record.receipts.filter((id): id is string => typeof id === 'string' && id.length <= 64).slice(-RECEIPTS_KEEP)
    : [];
  return save;
}

export const saveSnack = (save: SnackSave): string => JSON.stringify(save);

/** Income multiplier of one stand from its milestones (×2 for each one reached). */
export function milestoneFactor(level: number): number {
  return 2 ** MILESTONES.filter((m) => level >= m).length;
}

/** The next milestone above this level, or null after the last one. */
export const nextMilestone = (level: number): number | null => MILESTONES.find((m) => m > level) ?? null;

/** Coins per second of one stand before the room's bonuses (`recipes`: how many of its recipes are bought). */
export function standRate(stand: StandInfo, level: number, recipes = 0): number {
  return stand.rate * level * milestoneFactor(level) * RECIPE_FACTOR ** recipes;
}

/** How many of a stand's recipes this cinema bought. */
export const recipesOf = (save: SnackSave, id: StandId): number => save.recipes.filter((r) => r.startsWith(`${id}:`)).length;

/** The menu bonus: +10 % for every stand at level 25 or more. */
export const menuFactor = (save: SnackSave): number => 1 + MENU_BONUS * STAND_IDS.filter((id) => save.levels[id] >= MENU_LEVEL).length;

/** A stand's coins per second in this cinema (its recipes, the place's twist, today's special; no global bonuses). */
export function standIncome(save: SnackSave, id: StandId, special?: StandId | null): number {
  const stand = standOf(id);
  return standRate(stand, save.levels[id], recipesOf(save, id)) * placeRate(save, id) * (special === id ? SPECIAL_FACTOR : 1);
}

export const starFactor = (save: SnackSave): number => 1 + STAR_BONUS * save.stars;

/** Badges with a bonus: +1 % each. */
export const badgeFactor = (save: SnackSave): number =>
  1 + BADGE_BONUS * save.badges.filter((id) => BADGES.find((b) => b.id === id)?.bonus).length;

/** The bonuses on every stand: stars, badges, the menu bonus and the place at this hour. */
export const globalFactor = (save: SnackSave, hour = new Date().getHours()): number =>
  starFactor(save) * badgeFactor(save) * menuFactor(save) * placeFactor(save, hour) * seasonFactor(save);

// ---- NG2: the seasonal stand ----
/** Four seasonal stands, one a week in turn (the same week for everyone, on the UTC calendar). Ids never change. */
export type SeasonId = 'cocoa' | 'lemonade' | 'cotton-candy' | 'caramel-apple';
export const SEASONS: readonly SeasonId[] = ['cocoa', 'lemonade', 'cotton-candy', 'caramel-apple'];
export const SEASON_DAYS = 7;
/** A seasonal stand goes up to level 10, each level +5 % on the whole income while its week lasts. */
export const SEASON_LEVELS = 10;
export const SEASON_BONUS = 0.05;
/** Its price: this many seconds of the income now (without the seasonal stand itself), ×1.5 a level. */
export const SEASON_COST_SECONDS = 60;
export const SEASON_GROWTH = 1.5;
export const SEASON_COST_MIN = 50;
/** Reaching this level of a seasonal stand earns its badge (kept after the week ends). */
export const SEASON_BADGE_LEVEL = 5;
/** The week of a day number (`dayNumber`); weeks start on Monday (day 0, 1 Jan 1970, was a Thursday). */
export const seasonWeek = (day: number): number => Math.floor((day + 3) / SEASON_DAYS);
export const seasonOf = (week: number): SeasonId => SEASONS[((week % SEASONS.length) + SEASONS.length) % SEASONS.length]!;
/** Whole days left in this week's season, counting today (1 on its last day). */
export const seasonDaysLeft = (day: number): number => SEASON_DAYS - ((day + 3) % SEASON_DAYS);
/** The seasonal stand's level in this save's week (0 when none was bought this week). */
export const seasonLevel = (save: SnackSave, week?: number): number =>
  save.season && (week === undefined || save.season.week === week) ? save.season.level : 0;
export const seasonFactor = (save: SnackSave): number => 1 + SEASON_BONUS * seasonLevel(save);
/** A new week: the old seasonal stand leaves (its badge stays). True when it changed the save. */
export function rollSeason(save: SnackSave, week: number): boolean {
  if (!save.season || save.season.week === week) return false;
  save.season = null;
  return true;
}
/** The price of the seasonal stand's next level (null at the top). */
export function seasonCost(save: SnackSave, week: number, hour = new Date().getHours()): number | null {
  const level = seasonLevel(save, week);
  if (level >= SEASON_LEVELS) return null;
  const rate = baseRate(save, hour) / seasonFactor(save);
  return Math.max(SEASON_COST_MIN, rate * SEASON_COST_SECONDS) * SEASON_GROWTH ** level;
}
/** Buys a level of this week's seasonal stand; false when at the top or too expensive. */
export function buySeason(save: SnackSave, week: number, hour = new Date().getHours()): boolean {
  rollSeason(save, week);
  const price = seasonCost(save, week, hour);
  if (price === null || price > save.coins * (1 + 1e-12)) return false;
  save.coins = Math.max(0, save.coins - price);
  save.season = { week, level: seasonLevel(save, week) + 1 };
  return true;
}

/** Coins per second without the together bonus (in this cinema's place, at this local hour, with today's special). */
export function baseRate(save: SnackSave, hour = new Date().getHours(), special?: StandId | null): number {
  const stands = STAND_IDS.reduce((sum, id) => sum + standIncome(save, id, special), 0);
  return stands * globalFactor(save, hour);
}

/** The together bonus: 1 alone, 1.1 with one other person, 1.15 when that person is in voice with me. */
export function togetherFactor(ctx: SnackContext): number {
  const others = Math.min(TOGETHER_MAX, Math.max(0, Math.floor(ctx.others)));
  const voice = Math.min(others, Math.max(0, Math.floor(ctx.voiceOthers)));
  return 1 + TOGETHER_BONUS * others + VOICE_BONUS * voice;
}

/** Coins per second right now (0 while the room's video is not playing). */
export function incomeRate(save: SnackSave, ctx: SnackContext): number {
  if (!ctx.playing) return 0;
  const alone = placeOf(save) === 'planetarium' && Math.floor(ctx.others) <= 0 ? 1 + PLANETARIUM_BONUS : 1;
  return baseRate(save, undefined, ctx.special) * togetherFactor(ctx) * (ctx.boost ? 1 + TIP_BOOST : 1) * alone;
}

function earn(save: SnackSave, coins: number): void {
  save.coins += coins;
  save.earned += coins;
  save.lifetime += coins;
}

/** Moves the game on by `seconds` of wall time. Returns the coins earned. */
/** This film's record (a new one when the room's item changed). */
function filmOf(save: SnackSave, ctx: SnackContext): SnackFilm | null {
  const id = ctx.item?.id;
  if (!id) return null;
  if (save.film?.item !== id) save.film = { item: id, watched: 0, served: 0, coins: 0 };
  return save.film;
}

export function tick(save: SnackSave, seconds: number, ctx: SnackContext, now = Date.now()): number {
  save.seen = now;
  rollSeason(save, ctx.week ?? seasonWeek(dayNumber(now)));
  if (!(seconds > 0) || seconds > MAX_TICK_S || !ctx.playing) return 0;
  save.watched += seconds;
  save.stats.watched += seconds;
  if (ctx.others > 0) save.stats.together += seconds;
  const coins = incomeRate(save, ctx) * seconds;
  earn(save, coins);
  const film = filmOf(save, ctx);
  if (film) {
    film.watched += seconds;
    film.coins += coins;
  }
  return coins;
}

function served(save: SnackSave, ctx: SnackContext, coins: number): void {
  earn(save, coins);
  save.stats.served += 1;
  if (ctx.voiceOthers > 0) save.stats.voiceServed += 1;
  const film = filmOf(save, ctx);
  if (film) {
    film.served += 1;
    film.coins += coins;
  }
}

/** A tap on the counter. Returns the coins earned (0 while the video is not playing). */
export function serve(save: SnackSave, ctx: SnackContext): number {
  if (!ctx.playing) return 0;
  const coins = Math.max(1, incomeRate(save, ctx) * (save.staff.includes('tip-box') ? TAP_SECONDS_TIPBOX : SERVE_SECONDS));
  served(save, ctx, coins);
  return coins;
}

/** A tap on a waiting customer: more than a plain tap. 0 while the video is not playing. */
export function serveCustomer(save: SnackSave, ctx: SnackContext): number {
  if (!ctx.playing) return 0;
  const seconds = save.staff.includes('manager') ? CUSTOMER_SECONDS_MANAGER : CUSTOMER_SECONDS;
  const place = placeOf(save) === 'seaside' ? SEASIDE_CUSTOMERS : 1;
  const coins = Math.max(CUSTOMER_MIN, incomeRate(save, ctx) * seconds * place);
  served(save, ctx, coins);
  save.stats.customers += 1;
  return coins;
}

/** What a customer says: a pool of lines picked by the room's moment (the page has the words). */
export type CustomerMood = 'long' | 'short' | 'friends' | 'voice' | 'any';
export function customerMood(ctx: SnackContext & { duration?: number }, random: () => number = Math.random): CustomerMood {
  const moods: CustomerMood[] = ['any', 'any'];
  if ((ctx.duration ?? 0) >= 90 * 60) moods.push('long', 'long');
  else if ((ctx.duration ?? 0) > 0 && (ctx.duration ?? 0) < 20 * 60) moods.push('short');
  if (ctx.others > 0) moods.push('friends');
  if (ctx.voiceOthers > 0) moods.push('voice');
  return moods[Math.min(moods.length - 1, Math.floor(random() * moods.length))]!;
}

export interface Receipt {
  item: string;
  watched: number;
  served: number;
  coins: number;
  /** The golden bucket's coins. */
  bucket: number;
  /** The stand earning the most now. */
  best: StandId;
}

/** The receipt for a film that ended (null: too little of it went with the game, or already given). */
export function receiptFor(save: SnackSave, itemId: string): Receipt | null {
  const film = save.film;
  if (!film || film.item !== itemId || film.watched < RECEIPT_MIN_S || save.receipts.includes(itemId)) return null;
  const best = [...STAND_IDS].sort((a, b) => standIncome(save, b) - standIncome(save, a))[0]!;
  return { item: itemId, watched: film.watched, served: film.served, coins: film.coins, bucket: Math.max(BUCKET_MIN, baseRate(save) * BUCKET_SECONDS), best };
}

/** Takes the golden bucket of a film's receipt. Returns the coins (0 when there is none). */
export function collectReceipt(save: SnackSave, itemId: string): number {
  const receipt = receiptFor(save, itemId);
  if (!receipt) return 0;
  earn(save, receipt.bucket);
  save.receipts = [...save.receipts, itemId].slice(-RECEIPTS_KEEP);
  save.stats.films += 1;
  return receipt.bucket;
}

/** The seasonal stands' pictures (the badge and the stand's row). */
export const SEASON_GLYPH: Record<SeasonId, string> = { cocoa: '☕', lemonade: '🍋', 'cotton-candy': '🍭', 'caramel-apple': '🍎' };

/** What the manager suggests buying next: the purchase that pays itself back the fastest. */
export type Suggestion =
  | { kind: 'stand'; id: StandId; level: number; price: number }
  | { kind: 'recipe'; id: RecipeId; price: number }
  | { kind: 'season'; id: SeasonId; level: number; price: number };
export interface ManagerReport {
  /** The best-selling stands now, at most three, with their share of the stands' income (0–1). */
  top: { id: StandId; share: number }[];
  /** The fastest payback among the next level of every open stand, the open recipes and this week's seasonal stand. */
  next: Suggestion | null;
}

/** NG2: the manager's report on a film's receipt. `week`: this week (`seasonWeek`). */
export function managerReport(save: SnackSave, week: number, hour = new Date().getHours()): ManagerReport {
  const incomes = STAND_IDS.map((id) => ({ id, income: standIncome(save, id) })).filter((x) => x.income > 0);
  const total = incomes.reduce((sum, x) => sum + x.income, 0);
  const top = incomes
    .sort((a, b) => b.income - a.income)
    .slice(0, 3)
    .map((x) => ({ id: x.id, share: total > 0 ? x.income / total : 0 }));
  const factor = globalFactor(save, hour);
  const options: { s: Suggestion; gain: number }[] = [];
  for (const id of STAND_IDS) {
    if (!unlocked(save, id)) continue;
    const level = save.levels[id];
    const gain = (standIncome({ ...save, levels: { ...save.levels, [id]: level + 1 } }, id) - standIncome(save, id)) * factor;
    options.push({ s: { kind: 'stand', id, level: level + 1, price: costOf(id, level, 1, placeCost(save, id)) }, gain });
  }
  for (const id of recipesOpen(save)) {
    const info = recipeInfo(save, id);
    options.push({ s: { kind: 'recipe', id, price: info.price }, gain: standIncome(save, info.stand) * (RECIPE_FACTOR - 1) * factor });
  }
  const seasonPrice = seasonCost(save, week, hour);
  if (seasonPrice !== null) {
    const level = seasonLevel(save, week);
    options.push({ s: { kind: 'season', id: seasonOf(week), level: level + 1, price: seasonPrice }, gain: (baseRate(save, hour) / seasonFactor(save)) * SEASON_BONUS });
  }
  const best = options.filter((o) => o.gain > 0).sort((a, b) => a.s.price / a.gain - b.s.price / b.gain)[0];
  return { top, next: best?.s ?? null };
}

export interface Badge {
  id: string;
  /** Its picture on the badge wall. */
  glyph: string;
  /** +1 % income when earned (false: just for fun). */
  bonus: boolean;
  /** Earned now? */
  test: (save: SnackSave) => boolean;
}
const lv = (id: StandId, n: number) => (save: SnackSave) => save.levels[id] >= n;
/** The badge wall (owner's pick 4): thirty, three of them just for fun. An id never changes (saves keep it). */
export const BADGES: readonly Badge[] = [
  { id: 'first-sale', glyph: '🪙', bonus: true, test: (s) => s.stats.served >= 1 },
  { id: 'regular', glyph: '🙋', bonus: true, test: (s) => s.stats.customers >= 10 },
  { id: 'full-house', glyph: '👥', bonus: true, test: (s) => s.stats.customers >= 100 },
  { id: 'rush-hour', glyph: '🔥', bonus: true, test: (s) => s.stats.served >= 500 },
  { id: 'popcorn-10', glyph: '🍿', bonus: true, test: lv('popcorn', 10) },
  { id: 'popcorn-50', glyph: '🍿', bonus: true, test: lv('popcorn', 50) },
  { id: 'popcorn-100', glyph: '🍿', bonus: true, test: lv('popcorn', 100) },
  { id: 'soda-1', glyph: '🥤', bonus: true, test: lv('soda', 1) },
  { id: 'soda-25', glyph: '🥤', bonus: true, test: lv('soda', 25) },
  { id: 'nachos-1', glyph: '🌮', bonus: true, test: lv('nachos', 1) },
  { id: 'nachos-25', glyph: '🌮', bonus: true, test: lv('nachos', 25) },
  { id: 'candy-1', glyph: '🍬', bonus: true, test: lv('candy', 1) },
  { id: 'candy-25', glyph: '🍬', bonus: true, test: lv('candy', 25) },
  { id: 'second-1', glyph: '🏪', bonus: true, test: lv('second-counter', 1) },
  { id: 'second-25', glyph: '🏪', bonus: true, test: lv('second-counter', 25) },
  { id: 'coins-1k', glyph: '💰', bonus: true, test: (s) => s.lifetime >= 1_000 },
  { id: 'coins-1m', glyph: '💰', bonus: true, test: (s) => s.lifetime >= 1_000_000 },
  { id: 'coins-1b', glyph: '💎', bonus: true, test: (s) => s.lifetime >= 1_000_000_000 },
  { id: 'film-1', glyph: '🎬', bonus: true, test: (s) => s.stats.films >= 1 },
  { id: 'film-10', glyph: '🎞️', bonus: true, test: (s) => s.stats.films >= 10 },
  { id: 'film-50', glyph: '🏆', bonus: true, test: (s) => s.stats.films >= 50 },
  { id: 'together-1h', glyph: '🤝', bonus: true, test: (s) => s.stats.together >= 3600 },
  { id: 'together-10h', glyph: '💞', bonus: true, test: (s) => s.stats.together >= 36_000 },
  { id: 'voice-100', glyph: '🎙️', bonus: true, test: (s) => s.stats.voiceServed >= 100 },
  { id: 'star-1', glyph: '⭐', bonus: true, test: (s) => s.stars >= 1 },
  { id: 'cinema-3', glyph: '🏛️', bonus: true, test: (s) => s.cinemas >= 3 },
  { id: 'all-stands', glyph: '🧺', bonus: true, test: (s) => STAND_IDS.every((id) => s.levels[id] >= 10) },
  { id: 'just-looking', glyph: '👀', bonus: false, test: (s) => s.stats.watched >= 3600 && s.stats.served === 0 },
  { id: 'tap-happy', glyph: '👆', bonus: false, test: (s) => s.stats.served >= 2_000 },
  { id: 'popcorn-purist', glyph: '🌽', bonus: false, test: (s) => s.lifetime >= 10_000 && s.levels.soda === 0 },
  // SB3: the new stands, the recipes, the staff and the menu bonus.
  { id: 'hotdog-1', glyph: '🌭', bonus: true, test: lv('hotdog', 1) },
  { id: 'ice-cream-1', glyph: '🍦', bonus: true, test: lv('ice-cream', 1) },
  { id: 'arcade-1', glyph: '🕹️', bonus: true, test: lv('arcade', 1) },
  { id: 'first-recipe', glyph: '📜', bonus: true, test: (s) => s.recipes.length >= 1 },
  { id: 'head-chef', glyph: '👨‍🍳', bonus: true, test: (s) => s.recipes.length >= 12 },
  { id: 'full-staff', glyph: '🧑‍🤝‍🧑', bonus: true, test: (s) => STAFF.every((x) => s.staff.includes(x.id)) },
  { id: 'big-menu', glyph: '📋', bonus: true, test: (s) => STAND_IDS.filter((id) => s.levels[id] >= MENU_LEVEL).length >= 5 },
  // NG2: one for each seasonal stand, at level 5 in its week.
  ...SEASONS.map((id): Badge => ({
    id: `season-${id}`,
    glyph: SEASON_GLYPH[id],
    bonus: true,
    test: (s) => !!s.season && seasonOf(s.season.week) === id && s.season.level >= SEASON_BADGE_LEVEL,
  })),
];

/** Adds the badges earned now; returns the new ones. */
export function checkBadges(save: SnackSave): Badge[] {
  const fresh = BADGES.filter((b) => !save.badges.includes(b.id) && b.test(save));
  for (const b of fresh) save.badges.push(b.id);
  return fresh;
}

const standOf = (id: StandId): StandInfo => STANDS.find((s) => s.id === id)!;

/** The price of the next `count` levels of a stand at `level` (`factor`: the place's price, `placeCost`). */
export function costOf(id: StandId, level: number, count = 1, factor = 1): number {
  const stand = standOf(id);
  if (count <= 0) return 0;
  const g = stand.growth;
  return (factor * stand.cost * g ** level * (g ** count - 1)) / (g - 1);
}

/** How many levels of a stand the coins buy now (at most `limit`). */
export function affordable(save: SnackSave, id: StandId, limit = 1000): number {
  const stand = standOf(id);
  const level = save.levels[id];
  const factor = placeCost(save, id);
  const g = stand.growth;
  const first = factor * stand.cost * g ** level;
  if (save.coins < first) return 0;
  const n = Math.floor(Math.log((save.coins * (g - 1)) / first + 1) / Math.log(g));
  // Float rounding can land one off on the boundary: step back while it costs more than we have.
  let count = Math.min(limit, Math.max(0, n));
  while (count > 0 && costOf(id, level, count, factor) > save.coins * (1 + 1e-12)) count--;
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
  const price = costOf(id, save.levels[id], count, placeCost(save, id));
  if (price > save.coins * (1 + 1e-12)) return false;
  save.coins = Math.max(0, save.coins - price);
  save.levels[id] += count;
  return true;
}

/** A recipe's stand, step (1–3), the levels it needs and its price in this cinema. */
export function recipeInfo(save: SnackSave, id: RecipeId): { stand: StandId; step: number; need: number; price: number } {
  const [stand, n] = id.split(':') as [StandId, string];
  const step = Number(n);
  const info = RECIPE_STEPS[step - 1]!;
  return { stand, step, need: info.need, price: standOf(stand).cost * info.price * placeCost(save, stand) };
}
/** Recipes that can be bought now (the stand has enough levels, the earlier steps are bought), cheapest first. */
export function recipesOpen(save: SnackSave): RecipeId[] {
  return RECIPE_IDS.filter((id) => {
    if (save.recipes.includes(id)) return false;
    const { stand, step, need } = recipeInfo(save, id);
    return save.levels[stand] >= need && (step === 1 || save.recipes.includes(`${stand}:${step - 1}` as RecipeId));
  }).sort((a, b) => recipeInfo(save, a).price - recipeInfo(save, b).price);
}
/** Buys a recipe; false when it is not open or too expensive. */
export function buyRecipe(save: SnackSave, id: RecipeId): boolean {
  if (!recipesOpen(save).includes(id)) return false;
  const { price } = recipeInfo(save, id);
  if (price > save.coins * (1 + 1e-12)) return false;
  save.coins = Math.max(0, save.coins - price);
  save.recipes.push(id);
  return true;
}
/** Hires a member of staff; false when hired already or too expensive. */
export function hire(save: SnackSave, id: StaffId): boolean {
  const item = STAFF.find((x) => x.id === id);
  if (!item || save.staff.includes(id) || save.coins < item.cost) return false;
  save.coins -= item.cost;
  save.staff.push(id);
  return true;
}

/** Stars a new cinema would bring now (0 before `PRESTIGE_MIN`). */
export function starsFor(save: SnackSave): number {
  // The small nudge keeps an exact cube (8 → 2) from rounding down.
  return save.earned >= PRESTIGE_MIN ? Math.floor(Math.cbrt(save.earned / STAR_UNIT) + 1e-9) : 0;
}

/** Opens a new cinema: coins and stands start over, stars are added. False when it is too early. */
export function newCinema(save: SnackSave): boolean {
  const stars = starsFor(save);
  if (stars < 1) return false;
  const fresh = freshSnack();
  save.coins = 0;
  save.earned = 0;
  save.levels = fresh.levels;
  save.recipes = [];
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
  const text = (Math.floor(scaled * 10 ** digits) / 10 ** digits).toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  return `${text}${UNITS[unit]}`;
}
