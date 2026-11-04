// 🌱 Window Garden: the cozy solo collection game played beside the video (CARDS.md "Window Garden"). Pure rules, no
// DOM and no network: the page ticks it with how long the room's video played and keeps it in `localStorage` as one
// versioned JSON (`GARDEN_KEY`).
//
// Rules (owner, 2 Nov 2026: "basic but meaningful, a collection feel, sweet and cozy"):
// - Plants in pots on a windowsill grow only while the room's video plays, faster when they were watered.
// - Only in a room (owner, 4 Nov 2026): it moves only while its window is open (or minimized) in a room and the room's
//   video plays; nothing grows, dries or seeds while the person is away.
// - Nothing ever dies: a dry pot only grows slower until it is watered again.
// - Seeds: a common one every 30 watched minutes, a better one when a film (≥ 20 min) ends, a rare one after a full
//   evening together (90 min watched with someone else in the room).
// - Glowbeam the grow lamp (owner's pick 9, 4 Nov 2026): once per film, Glowbeam shines on one pot, +25 % growth while
//   that film plays.
// - Hybrid colours (owner's pick 7): a plant that blooms beside another plant in bloom may drop a colour seed; each
//   plant has two colours (`HYBRID_COLORS`), each a new album entry (`plant:colour`), 24 finds in all.
// - Memories (owner's pick 10): each album entry remembers the film it bloomed during and who was in the room.
// - Decorations (owner's pick 6): looks only, bought with petals (1 per pick, 3 for a new album entry); the fairy
//   lights and the lantern bring night visitors (a moth, a firefly) that go into the album when first seen.
// - A plant in bloom is picked into the album (every plant found, with how many times): the collection. Three pots.

export const GARDEN_KEY = 'windowGarden';
export const GARDEN_VERSION = 1;

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export const RARITIES: readonly Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];

/** Watched minutes from seed to bloom (watered all the way). */
export const GROW_MINUTES: Record<Rarity, number> = { common: 20, uncommon: 45, rare: 90, legendary: 180 };

/**
 * Our own plants, the Design session's first album (`docs/internal/design/side-games/garden/plants/<id>.svg`). The
 * album shows them in this order; more can join later (an id never changes, saves keep counting it).
 */
export const PLANTS: Record<Rarity, readonly string[]> = {
  common: ['fern', 'mint', 'sunbell'],
  uncommon: ['night-tulip', 'lantern-cactus'],
  rare: ['moonbloom', 'reel-vine'],
  legendary: ['popcorn-shrub'],
};
export type PlantId = string;
export const PLANT_IDS: readonly PlantId[] = RARITIES.flatMap((r) => PLANTS[r]);
export const rarityOf = (plant: PlantId): Rarity | null => RARITIES.find((r) => PLANTS[r].includes(plant)) ?? null;

/** Growth stages a plant shows: seed → sprout → leaves → bud → bloom. */
export const STAGES = 5;
/** A full watering lasts this many watched seconds; a dry pot grows at `DRY_SPEED`. */
export const WATER_LAST_S = 25 * 60;
export const DRY_SPEED = 0.25;
/** A common seed every this many watched seconds. */
export const SEED_EVERY_S = 30 * 60;
/** A film this long or longer gives a seed when it ends (once per item). */
export const FILM_MIN_S = 20 * 60;
/** Watched together this long in one evening → a rare seed (once per evening). */
export const EVENING_S = 90 * 60;
/** A break this long starts a new evening. */
export const EVENING_GAP_MS = 4 * 3600_000;
/** Pots on the sill (the scene has three slots). */
export const POTS = 3;
/** Ticks longer than this are ignored (a sleeping laptop is not watching). */
export const MAX_TICK_S = 5;
/** Glowbeam's lamp: this much faster growth for the pot it shines on, while the film it was placed in plays. */
export const LAMP_BONUS = 0.25;
/** Seeds kept at most per rarity (an old forgotten tab cannot pile up thousands). */
export const SEEDS_MAX = 99;
const ENDED_KEEP = 20;

/** Each plant's two hybrid colours; which one comes depends on the neighbour (rarer neighbour → the second). */
export type HybridColor = 'gold' | 'rose' | 'sky' | 'violet';
export const HYBRID_COLORS: Record<PlantId, readonly [HybridColor, HybridColor]> = {
  fern: ['gold', 'violet'],
  mint: ['rose', 'sky'],
  sunbell: ['rose', 'violet'],
  'night-tulip': ['gold', 'sky'],
  'lantern-cactus': ['rose', 'sky'],
  moonbloom: ['gold', 'rose'],
  'reel-vine': ['sky', 'violet'],
  'popcorn-shrub': ['rose', 'sky'],
};
/** A bloom beside a bloom drops a colour seed this often. */
export const HYBRID_CHANCE = 0.5;
export const COLOR_SEEDS_MAX = 9;
/** Every album entry: the plants, then each plant's colours (`plant:colour`). */
export const ALBUM_IDS: readonly string[] = [...Object.keys(HYBRID_COLORS), ...Object.entries(HYBRID_COLORS).flatMap(([id, colors]) => colors.map((c) => `${id}:${c}`))];
export const albumId = (plant: PlantId, color?: HybridColor | null): string => (color ? `${plant}:${color}` : plant);

export type GardenDecorId = 'curtains' | 'fairy-lights' | 'cat' | 'lantern';
export const GARDEN_DECOR: readonly { id: GardenDecorId; cost: number }[] = [
  { id: 'curtains', cost: 2 },
  { id: 'fairy-lights', cost: 4 },
  { id: 'cat', cost: 6 },
  { id: 'lantern', cost: 8 },
];
export type VisitorId = 'moth' | 'firefly';
/** Which decoration brings which visitor (only at dusk and at night). */
export const VISITORS: readonly { id: VisitorId; decor: GardenDecorId }[] = [
  { id: 'moth', decor: 'fairy-lights' },
  { id: 'firefly', decor: 'lantern' },
];
/** Each watched minute at dusk or night, a visitor comes this often (when its decoration is there). */
export const VISITOR_CHANCE = 0.12;
export const PETALS_PICK = 1;
export const PETALS_NEW = 3;

export interface ColorSeed {
  plant: PlantId;
  color: HybridColor;
}
/** What a bloom remembers (and the album keeps for its first find). */
export interface Memory {
  /** The film it bloomed during ('' when unknown). */
  title: string;
  /** Others in the room then (names, at most 6). */
  with: string[];
  /** When (ms). */
  at: number;
}

export interface Pot {
  plant: PlantId;
  /** 0 → 1 (bloom). */
  growth: number;
  /** 0 (dry) → 1 (just watered). */
  water: number;
  /** A hybrid colour, from a colour seed. */
  color?: HybridColor;
  /** Where it bloomed (set when it blooms). */
  bloomed?: Memory;
}

export interface GardenSave {
  v: typeof GARDEN_VERSION;
  /** `null` = an empty pot. Length = the pots I have. */
  pots: (Pot | null)[];
  seeds: Record<Rarity, number>;
  /** Every plant picked so far, with how many times. */
  album: Record<PlantId, number>;
  /** Watched seconds in all, and toward the next common seed. */
  watched: number;
  seedClock: number;
  /** This evening: watched together seconds, whether its rare seed was given, when it started. */
  together: number;
  eveningSeed: boolean;
  /** Wall-clock ms of the last tick (0 = never). */
  seen: number;
  /** Room items whose ending already gave a seed. */
  ended: string[];
  /** Glowbeam's lamp: the pot it shines on and the room item (film) it was placed in; null = not used yet. */
  lamp: { pot: number; item: string } | null;
  /** Colour seeds waiting to be planted. */
  colorSeeds: ColorSeed[];
  /** The memory of each album entry's first find. */
  memories: Record<string, Memory>;
  /** Petals to spend on decorations. */
  petals: number;
  decor: GardenDecorId[];
  /** Night visitors seen (album extras). */
  visitors: VisitorId[];
}

export interface GardenContext {
  playing: boolean;
  /** Other people in the room (by person, not tabs). */
  others: number;
  /** The room's item now (the lamp works only in the film it was placed in; its title goes into memories). */
  item?: { id: string; title?: string } | null;
  /** Others' names (for memories). */
  names?: string[];
}

export type Random = () => number;

export function freshGarden(): GardenSave {
  const pots: (Pot | null)[] = Array.from({ length: POTS }, () => null);
  pots[0] = { plant: 'fern', growth: 0.1, water: 1 };
  return {
    v: GARDEN_VERSION,
    pots,
    seeds: { common: 1, uncommon: 0, rare: 0, legendary: 0 },
    album: {},
    watched: 0,
    seedClock: 0,
    together: 0,
    eveningSeed: false,
    seen: 0,
    ended: [],
    lamp: null,
    colorSeeds: [],
    memories: {},
    petals: 0,
    decor: [],
    visitors: [],
  };
}

const num = (value: unknown, max = Number.MAX_VALUE): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.min(value, max) : 0;
const unit = (value: unknown): number => num(value, 1);

/**
 * Reads a saved garden: anything broken or from an unknown (newer) version gives a fresh one, wrong fields are cleaned
 * one by one, unknown plants dropped. Older versions are migrated step by step here (none yet).
 */
export function loadGarden(raw: unknown): GardenSave {
  let data: unknown = raw;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return freshGarden();
    }
  }
  if (!data || typeof data !== 'object' || (data as { v?: unknown }).v !== GARDEN_VERSION) return freshGarden();
  const record = data as Record<string, unknown>;
  const garden = freshGarden();
  const album = (record.album && typeof record.album === 'object' ? record.album : {}) as Record<string, unknown>;
  garden.album = {};
  for (const id of ALBUM_IDS) {
    const count = Math.floor(num(album[id], 1_000_000));
    if (count > 0) garden.album[id] = count;
  }
  const memories = (record.memories && typeof record.memories === 'object' ? record.memories : {}) as Record<string, unknown>;
  for (const id of ALBUM_IDS) {
    const memory = cleanMemory(memories[id]);
    if (memory) garden.memories[id] = memory;
  }
  garden.petals = Math.floor(num(record.petals, 9_999));
  garden.decor = Array.isArray(record.decor) ? [...new Set(record.decor.filter((id): id is GardenDecorId => GARDEN_DECOR.some((d) => d.id === id)))] : [];
  garden.visitors = Array.isArray(record.visitors) ? [...new Set(record.visitors.filter((id): id is VisitorId => VISITORS.some((v) => v.id === id)))] : [];
  garden.colorSeeds = (Array.isArray(record.colorSeeds) ? record.colorSeeds : [])
    .filter((c): c is ColorSeed => !!c && typeof c === 'object' && isColor((c as ColorSeed).plant, (c as ColorSeed).color))
    .map((c) => ({ plant: c.plant, color: c.color }))
    .slice(0, COLOR_SEEDS_MAX);
  const pots = Array.isArray(record.pots) ? record.pots : [];
  garden.pots = Array.from({ length: POTS }, (_, i) => {
    const pot = pots[i] as Record<string, unknown> | null | undefined;
    if (!pot || typeof pot !== 'object' || typeof pot.plant !== 'string' || !rarityOf(pot.plant)) return null;
    const clean: Pot = { plant: pot.plant, growth: unit(pot.growth), water: unit(pot.water) };
    if (isColor(pot.plant, pot.color)) clean.color = pot.color as HybridColor;
    const memory = cleanMemory(pot.bloomed);
    if (memory) clean.bloomed = memory;
    return clean;
  });
  const seeds = (record.seeds && typeof record.seeds === 'object' ? record.seeds : {}) as Record<string, unknown>;
  for (const r of RARITIES) garden.seeds[r] = Math.floor(num(seeds[r], SEEDS_MAX));
  garden.watched = num(record.watched);
  garden.seedClock = num(record.seedClock, SEED_EVERY_S);
  garden.together = num(record.together, EVENING_S);
  garden.eveningSeed = record.eveningSeed === true;
  garden.seen = num(record.seen);
  const lamp = record.lamp as Record<string, unknown> | null | undefined;
  garden.lamp =
    lamp && typeof lamp === 'object' && Number.isInteger(lamp.pot) && (lamp.pot as number) >= 0 && (lamp.pot as number) < POTS && typeof lamp.item === 'string' && lamp.item.length <= 64
      ? { pot: lamp.pot as number, item: lamp.item }
      : null;
  garden.ended = Array.isArray(record.ended) ? record.ended.filter((id): id is string => typeof id === 'string' && id.length <= 64).slice(-ENDED_KEEP) : [];
  return garden;
}

export const saveGarden = (garden: GardenSave): string => JSON.stringify(garden);

const isColor = (plant: unknown, color: unknown): boolean =>
  typeof plant === 'string' && typeof color === 'string' && !!HYBRID_COLORS[plant]?.includes(color as HybridColor);
function cleanMemory(raw: unknown): Memory | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const title = typeof m.title === 'string' ? m.title.slice(0, 120) : '';
  const names = Array.isArray(m.with) ? m.with.filter((n): n is string => typeof n === 'string').map((n) => n.slice(0, 40)).slice(0, 6) : [];
  return { title, with: names, at: num(m.at) };
}

/** Different plants found so far. */
export const found = (garden: GardenSave): number => Object.keys(garden.album).length;

const addSeed = (garden: GardenSave, rarity: Rarity): void => {
  garden.seeds[rarity] = Math.min(SEEDS_MAX, garden.seeds[rarity] + 1);
};

/** A plant's stage now: 0 seed … 4 bloom. */
export function stageOf(pot: Pot): number {
  return pot.growth >= 1 ? STAGES - 1 : Math.min(STAGES - 2, Math.floor(pot.growth * (STAGES - 1) + 1e-9));
}
export const inBloom = (pot: Pot | null): boolean => pot !== null && pot.growth >= 1;

export interface TickResult {
  /** Seeds that came this tick (the page can show a little "a seed!" note). */
  seeds: Rarity[];
  /** Pots that bloomed this tick. */
  bloomed: number[];
  /** Colour seeds that dropped this tick. */
  hybrids: ColorSeed[];
}

/** Moves the garden on by `seconds` of wall time. */
export function tickGarden(garden: GardenSave, seconds: number, ctx: GardenContext, now = Date.now(), random: Random = Math.random): TickResult {
  const result: TickResult = { seeds: [], bloomed: [], hybrids: [] };
  // A long break starts a new evening.
  if (garden.seen && now - garden.seen > EVENING_GAP_MS) {
    garden.together = 0;
    garden.eveningSeed = false;
  }
  garden.seen = now;
  if (!(seconds > 0) || seconds > MAX_TICK_S || !ctx.playing) return result;
  garden.watched += seconds;
  garden.pots.forEach((pot, i) => {
    if (!pot || pot.growth >= 1) return;
    // Watered time grows at full speed, the rest at the dry speed.
    const wet = Math.min(seconds, pot.water * WATER_LAST_S);
    const grow = (wet + (seconds - wet) * DRY_SPEED) * (lampOn(garden, i, ctx.item?.id) ? 1 + LAMP_BONUS : 1);
    pot.water = Math.max(0, pot.water - seconds / WATER_LAST_S);
    const next = pot.growth + grow / (GROW_MINUTES[rarityOf(pot.plant) ?? 'common'] * 60);
    // Many small ticks add up a hair short of 1: count that as bloom.
    pot.growth = next > 1 - 1e-9 ? 1 : next;
    if (pot.growth >= 1) {
      result.bloomed.push(i);
      pot.bloomed = { title: (ctx.item?.title ?? '').slice(0, 120), with: (ctx.names ?? []).slice(0, 6), at: now };
    }
  });
  // A bloom beside a bloom may drop a colour seed (once per new bloom).
  for (const i of result.bloomed) {
    const pot = garden.pots[i]!;
    const neighbour = [garden.pots[i - 1], garden.pots[i + 1]].find((p) => p && p.growth >= 1);
    if (!neighbour || garden.colorSeeds.length >= COLOR_SEEDS_MAX || random() >= HYBRID_CHANCE) continue;
    const rank = (p: Pot) => RARITIES.indexOf(rarityOf(p.plant) ?? 'common');
    const color = HYBRID_COLORS[pot.plant]![rank(neighbour) > rank(pot) ? 1 : 0];
    const seed = { plant: pot.plant, color };
    garden.colorSeeds.push(seed);
    result.hybrids.push(seed);
  }
  garden.seedClock += seconds;
  if (garden.seedClock >= SEED_EVERY_S) {
    garden.seedClock -= SEED_EVERY_S;
    addSeed(garden, 'common');
    result.seeds.push('common');
  }
  if (ctx.others > 0 && !garden.eveningSeed) {
    garden.together += seconds;
    if (garden.together >= EVENING_S) {
      garden.together = EVENING_S;
      garden.eveningSeed = true;
      addSeed(garden, 'rare');
      result.seeds.push('rare');
    }
  }
  return result;
}

/**
 * A room item ended. A film of at least `FILM_MIN_S` gives one seed, once per item: uncommon, or rare one time in
 * five. Returns the seed, or null.
 */
export function filmEnded(garden: GardenSave, itemId: string, duration: number, random: Random = Math.random): Rarity | null {
  if (!(duration >= FILM_MIN_S) || !itemId || garden.ended.includes(itemId)) return null;
  garden.ended = [...garden.ended, itemId].slice(-ENDED_KEEP);
  const rarity: Rarity = random() < 0.2 ? 'rare' : 'uncommon';
  addSeed(garden, rarity);
  return rarity;
}

/** Glowbeam shines on this pot now (placed in the room item `itemId`, which is still the one on). */
export function lampOn(garden: GardenSave, pot: number, itemId: string | null | undefined): boolean {
  return !!itemId && garden.lamp !== null && garden.lamp.pot === pot && garden.lamp.item === itemId;
}

/** The lamp can still be placed in this film (once per film). */
export const lampFree = (garden: GardenSave, itemId: string | null | undefined): boolean => !!itemId && garden.lamp?.item !== itemId;

/** Puts Glowbeam over a growing plant for the rest of this film. False when used already, no film, or nothing grows. */
export function placeLamp(garden: GardenSave, pot: number, itemId: string | null | undefined): boolean {
  const target = garden.pots[pot];
  if (!itemId || !lampFree(garden, itemId) || !target || target.growth >= 1) return false;
  garden.lamp = { pot, item: itemId };
  return true;
}

export function water(garden: GardenSave, pot: number): boolean {
  const target = garden.pots[pot];
  if (!target || target.growth >= 1 || target.water >= 1) return false;
  target.water = 1;
  return true;
}

/**
 * Plants a seed of this rarity in an empty pot. The plant is picked at random, preferring ones not in the album yet
 * (three times out of four when there are any). A rare seed blooms legendary one time in ten.
 */
export function plant(garden: GardenSave, pot: number, rarity: Rarity, random: Random = Math.random): PlantId | null {
  if (pot < 0 || pot >= garden.pots.length || garden.pots[pot] || garden.seeds[rarity] < 1) return null;
  const kind: Rarity = rarity === 'rare' && random() < 0.1 ? 'legendary' : rarity;
  const all = PLANTS[kind];
  const fresh = all.filter((id) => !garden.album[id]);
  const pool = fresh.length && random() < 0.75 ? fresh : all;
  const id = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!;
  garden.seeds[rarity]--;
  garden.pots[pot] = { plant: id, growth: 0, water: 1 };
  return id;
}

/** Picks a plant in bloom into the album. `first`: a new album entry (its memory is kept). */
export function pick(garden: GardenSave, pot: number): { plant: PlantId; color?: HybridColor; first: boolean } | null {
  const target = garden.pots[pot];
  if (!target || target.growth < 1) return null;
  const id = albumId(target.plant, target.color);
  const first = !garden.album[id];
  garden.album[id] = (garden.album[id] ?? 0) + 1;
  if (first && target.bloomed) garden.memories[id] = target.bloomed;
  garden.petals = Math.min(9_999, garden.petals + (first ? PETALS_NEW : PETALS_PICK));
  garden.pots[pot] = null;
  return { plant: target.plant, color: target.color, first };
}

/** Plants a colour seed (the `index`th waiting) in an empty pot. */
export function plantColor(garden: GardenSave, pot: number, index: number): ColorSeed | null {
  const seed = garden.colorSeeds[index];
  if (!seed || pot < 0 || pot >= garden.pots.length || garden.pots[pot]) return null;
  garden.colorSeeds.splice(index, 1);
  garden.pots[pot] = { plant: seed.plant, growth: 0, water: 1, color: seed.color };
  return seed;
}

/** Watched minutes left until this pot blooms, if it is kept watered. */
export function minutesLeft(pot: Pot): number {
  return Math.max(0, Math.ceil((1 - pot.growth) * GROW_MINUTES[rarityOf(pot.plant) ?? 'common'] - 1e-9));
}

/** Buys a garden decoration with petals; false when owned or too few petals. */
export function buyGardenDecor(garden: GardenSave, id: GardenDecorId): boolean {
  const item = GARDEN_DECOR.find((d) => d.id === id);
  if (!item || garden.decor.includes(id) || garden.petals < item.cost) return false;
  garden.petals -= item.cost;
  garden.decor.push(id);
  return true;
}

/** A visitor for this watched minute (dusk or night, its decoration there, by chance), or null. */
export function visitorFor(garden: GardenSave, sky: 'night' | 'dawn' | 'day' | 'dusk', random: Random = Math.random): VisitorId | null {
  if (sky !== 'night' && sky !== 'dusk') return null;
  const possible = VISITORS.filter((v) => garden.decor.includes(v.decor));
  if (!possible.length || random() >= VISITOR_CHANCE) return null;
  return possible[Math.min(possible.length - 1, Math.floor(random() * possible.length))]!.id;
}

/** A visitor was seen: true when it is new in the album. */
export function seeVisitor(garden: GardenSave, id: VisitorId): boolean {
  if (garden.visitors.includes(id)) return false;
  garden.visitors.push(id);
  return true;
}
