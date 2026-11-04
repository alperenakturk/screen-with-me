// 🍿 Snack Bar: the solo idle game played beside the video (CARDS.md "Snack Bar", research
// `docs/internal/research/solo-games-accounts.md` Part A). Pure rules, no DOM and no network: the page ticks the save
// with how long the room's video played, and keeps it in `localStorage` as one versioned JSON (`SNACK_KEY`).
//
// Rules (owner, 2 Nov 2026):
// - Income only while the room's video plays (`ctx.playing`); a paused or empty room earns nothing.
// - Together bonus: +10 % per other person in the room, +5 % more for each of them who is in voice with me.
// - Only in a room (owner, 4 Nov 2026): the game moves only while its window is open (or minimized) in a room and the
//   room's video plays. Nothing is paid for the time away (the old "while you were away" share is gone, 0.9.97.29).
// - Prestige "open a new cinema": restart with stars, each star a lasting income bonus.
// - Side games 2 (owner's picks 1, 2, 4; 4 Nov 2026): customers walk up with a line and a tap serves them for more
//   (missing one costs nothing); at a film's end Glowbeam hands over a receipt with a golden bucket; badges, each worth
//   +1 % income (a few silly ones give nothing).
// - Every new cinema is a different place (owner's pick 3): the lobby, then a drive-in (soda ×2), a rooftop (+25 %
//   between 20:00 and 04:00), an art house (candy ×3 income, ×2 price), then round again.
// - Decorations (owner's pick 6): looks only, bought once with coins, kept over every cinema.

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

/** A tap on the counter ("serve") pays this many seconds of income, at least 1 coin; only while the video plays. */
export const SERVE_SECONDS = 1;
/** Ticks longer than this are ignored (a sleeping laptop or a frozen tab is not watching). */
export const MAX_TICK_S = 5;

/** A new cinema opens once this cinema earned this much; stars = floor(sqrt(earned / STAR_UNIT)). */
export const PRESTIGE_MIN = 1_000_000;
export const STAR_UNIT = 100_000;
/** Each star: +5 % income for good. */
export const STAR_BONUS = 0.05;

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

export type PlaceId = 'lobby' | 'drive-in' | 'rooftop' | 'art-house';
const PLACES_AFTER: readonly PlaceId[] = ['drive-in', 'rooftop', 'art-house'];
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
}

export function freshSnack(): SnackSave {
  const levels = Object.fromEntries(STAND_IDS.map((id) => [id, 0])) as Record<StandId, number>;
  levels.popcorn = 1;
  return {
    v: SNACK_VERSION, coins: 0, earned: 0, lifetime: 0, watched: 0, levels, stars: 0, cinemas: 0, seen: 0,
    stats: { served: 0, customers: 0, together: 0, voiceServed: 0, films: 0, watched: 0 },
    badges: [], film: null, receipts: [], decor: [],
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

/** Coins per second of one stand before the room's bonuses. */
export function standRate(stand: StandInfo, level: number): number {
  return stand.rate * level * milestoneFactor(level);
}

export const starFactor = (save: SnackSave): number => 1 + STAR_BONUS * save.stars;

/** Badges with a bonus: +1 % each. */
export const badgeFactor = (save: SnackSave): number =>
  1 + BADGE_BONUS * save.badges.filter((id) => BADGES.find((b) => b.id === id)?.bonus).length;

/** Coins per second without the together bonus (in this cinema's place, at this local hour). */
export function baseRate(save: SnackSave, hour = new Date().getHours()): number {
  const stands = STANDS.reduce((sum, stand) => sum + standRate(stand, save.levels[stand.id]) * placeRate(save, stand.id), 0);
  return stands * starFactor(save) * badgeFactor(save) * placeFactor(save, hour);
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
/** This film's record (a new one when the room's item changed). */
function filmOf(save: SnackSave, ctx: SnackContext): SnackFilm | null {
  const id = ctx.item?.id;
  if (!id) return null;
  if (save.film?.item !== id) save.film = { item: id, watched: 0, served: 0, coins: 0 };
  return save.film;
}

export function tick(save: SnackSave, seconds: number, ctx: SnackContext, now = Date.now()): number {
  save.seen = now;
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
  const coins = Math.max(1, incomeRate(save, ctx) * SERVE_SECONDS);
  served(save, ctx, coins);
  return coins;
}

/** A tap on a waiting customer: more than a plain tap. 0 while the video is not playing. */
export function serveCustomer(save: SnackSave, ctx: SnackContext): number {
  if (!ctx.playing) return 0;
  const coins = Math.max(CUSTOMER_MIN, incomeRate(save, ctx) * CUSTOMER_SECONDS);
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
  const best = [...STANDS].sort((a, b) => standRate(b, save.levels[b.id]) - standRate(a, save.levels[a.id]))[0]!.id;
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
  return (factor * stand.cost * COST_GROWTH ** level * (COST_GROWTH ** count - 1)) / (COST_GROWTH - 1);
}

/** How many levels of a stand the coins buy now (at most `limit`). */
export function affordable(save: SnackSave, id: StandId, limit = 1000): number {
  const stand = standOf(id);
  const level = save.levels[id];
  const factor = placeCost(save, id);
  const first = factor * stand.cost * COST_GROWTH ** level;
  if (save.coins < first) return 0;
  const n = Math.floor(Math.log((save.coins * (COST_GROWTH - 1)) / first + 1) / Math.log(COST_GROWTH));
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
  const text = (Math.floor(scaled * 10 ** digits) / 10 ** digits).toFixed(digits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  return `${text}${UNITS[unit]}`;
}
