import { describe, expect, it } from 'vitest';
import {
  DRY_SPEED, EVENING_GAP_MS, EVENING_S, FILM_MIN_S, GARDEN_VERSION, PLANTS, PLANT_IDS, POTS,
  SEEDS_MAX, SEED_EVERY_S, WATER_LAST_S,
  ALBUM_IDS, COLOR_SEEDS_MAX, HYBRID_COLORS, LAMP_BONUS, plantColor, filmEnded, found, freshGarden, lampFree, placeLamp, inBloom, loadGarden, minutesLeft, pick, plant, rarityOf, saveGarden,
  stageOf, tickGarden, water, type GardenSave,
} from './garden.ts';

const play = { playing: true, others: 0 };
const withFriend = { playing: true, others: 1 };
/** Runs `seconds` of watching in 5 s ticks (the page ticks about once a second). */
function watch(garden: GardenSave, seconds: number, ctx = play, start = 1_000_000): void {
  for (let s = 0; s < seconds; s += 5) tickGarden(garden, Math.min(5, seconds - s), ctx, start + s * 1000);
}
const seq = (...values: number[]) => () => values.shift() ?? 0;

describe('Window Garden growth', () => {
  it('starts with a growing fern, a seed and three pots', () => {
    const garden = freshGarden();
    expect(garden.pots).toHaveLength(POTS);
    expect(garden.pots[0]).toMatchObject({ plant: 'fern' });
    expect(garden.seeds.common).toBe(1);
  });

  it('grows only while the video plays; a watered common plant blooms in 20 min', () => {
    const garden = freshGarden();
    garden.pots[0] = { plant: 'mint', growth: 0, water: 1 };
    tickGarden(garden, 5, { playing: false, others: 3 });
    expect(garden.pots[0]!.growth).toBe(0);
    watch(garden, 10 * 60);
    expect(garden.pots[0]!.growth).toBeCloseTo(0.5);
    expect(stageOf(garden.pots[0]!)).toBe(2);
    expect(minutesLeft(garden.pots[0]!)).toBe(10);
    garden.pots[0]!.water = 1;
    watch(garden, 10 * 60);
    expect(inBloom(garden.pots[0]!)).toBe(true);
    expect(stageOf(garden.pots[0]!)).toBe(4);
  });

  it('a dry pot never dies, it only grows slower; watering brings full speed back', () => {
    const garden = freshGarden();
    garden.pots[0] = { plant: 'night-tulip', growth: 0, water: 0 };
    watch(garden, 600);
    expect(garden.pots[0]!.growth).toBeCloseTo((600 * DRY_SPEED) / (45 * 60));
    expect(garden.pots[0]!.water).toBe(0);
    expect(water(garden, 0)).toBe(true);
    expect(water(garden, 0)).toBe(false);
    expect(water(garden, 1)).toBe(false);
    const before = garden.pots[0]!.growth;
    watch(garden, 600);
    expect(garden.pots[0]!.growth - before).toBeCloseTo(600 / (45 * 60));
    expect(garden.pots[0]!.water).toBeCloseTo(1 - 600 / WATER_LAST_S);
  });

  it('a tick that runs out of water half-way grows partly fast, partly slow', () => {
    const garden = freshGarden();
    garden.pots[0] = { plant: 'mint', growth: 0, water: 2 / WATER_LAST_S };
    tickGarden(garden, 4, play);
    expect(garden.pots[0]!.growth).toBeCloseTo((2 + 2 * DRY_SPEED) / (20 * 60));
    expect(garden.pots[0]!.water).toBe(0);
  });

  it('ignores long ticks and bad numbers', () => {
    const garden = freshGarden();
    const growth = garden.pots[0]!.growth;
    tickGarden(garden, 60, play);
    tickGarden(garden, Number.NaN, play);
    tickGarden(garden, -3, play);
    expect(garden.pots[0]!.growth).toBe(growth);
    expect(garden.watched).toBe(0);
  });
});

describe('Window Garden only in a room', () => {
  it('time away neither grows nor dries anything, and gives no seed', () => {
    const garden = freshGarden();
    garden.pots[0] = { plant: 'mint', growth: 0.3, water: 0.6 };
    garden.seen = 1_000_000;
    const seeds = { ...garden.seeds };
    // The first tick after a day away: the page measures from its own clock, so a whole day is never one tick.
    tickGarden(garden, 24 * 3600, withFriend, 1_000_000 + 24 * 3600_000);
    expect(garden.pots[0]).toEqual({ plant: 'mint', growth: 0.3, water: 0.6 });
    expect(garden.seeds).toEqual(seeds);
    expect(garden.watched).toBe(0);
  });
});

describe('Window Garden: Glowbeam the grow lamp', () => {
  it('once per film, +25 % growth for its pot while that film plays', () => {
    const garden = freshGarden();
    garden.pots[0] = { plant: 'mint', growth: 0, water: 1 };
    garden.pots[1] = { plant: 'fern', growth: 0, water: 1 };
    expect(placeLamp(garden, 2, 'film-a')).toBe(false); // an empty pot
    expect(placeLamp(garden, 0, null)).toBe(false); // no film
    expect(placeLamp(garden, 0, 'film-a')).toBe(true);
    expect(placeLamp(garden, 1, 'film-a')).toBe(false); // once per film
    const film = { playing: true, others: 0, item: { id: 'film-a' } };
    tickGarden(garden, 4, film);
    expect(garden.pots[0]!.growth).toBeCloseTo((4 * (1 + LAMP_BONUS)) / (20 * 60));
    expect(garden.pots[1]!.growth).toBeCloseTo(4 / (20 * 60));
    // The next film: the lamp is off until it is placed again.
    tickGarden(garden, 4, { ...film, item: { id: 'film-b' } });
    expect(garden.pots[0]!.growth).toBeCloseTo((4 * (1 + LAMP_BONUS) + 4) / (20 * 60));
    expect(lampFree(garden, 'film-b')).toBe(true);
    expect(loadGarden(saveGarden(garden)).lamp).toEqual({ pot: 0, item: 'film-a' });
    expect(loadGarden({ ...garden, lamp: { pot: 9, item: 'x' } }).lamp).toBeNull();
  });
});

describe('Window Garden seeds', () => {
  it('a common seed every 30 watched minutes', () => {
    const garden = freshGarden();
    watch(garden, SEED_EVERY_S - 5);
    expect(garden.seeds.common).toBe(1);
    expect(tickGarden(garden, 5, play).seeds).toEqual(['common']);
    expect(garden.seeds.common).toBe(2);
    expect(garden.seedClock).toBe(0);
  });

  it('a rare seed once per evening watched together; a long break starts a new evening', () => {
    const garden = freshGarden();
    watch(garden, EVENING_S - 5, play);
    expect(garden.seeds.rare).toBe(0);
    watch(garden, EVENING_S - 5, withFriend);
    expect(garden.seeds.rare).toBe(0);
    expect(tickGarden(garden, 5, withFriend, 2_000_000).seeds).toContain('rare');
    watch(garden, EVENING_S, withFriend, 2_000_000);
    expect(garden.seeds.rare).toBe(1);
    // Next evening.
    tickGarden(garden, 1, withFriend, 2_000_000 + EVENING_S * 1000 + EVENING_GAP_MS + 10_000);
    expect(garden.eveningSeed).toBe(false);
    expect(garden.together).toBe(1);
  });

  it('a film of 20 min or more gives one seed, once per item', () => {
    const garden = freshGarden();
    expect(filmEnded(garden, 'a', FILM_MIN_S - 1, seq(0.9))).toBeNull();
    expect(filmEnded(garden, 'b', FILM_MIN_S, seq(0.9))).toBe('uncommon');
    expect(filmEnded(garden, 'b', FILM_MIN_S, seq(0.9))).toBeNull();
    expect(filmEnded(garden, 'c', 7200, seq(0.1))).toBe('rare');
    expect(filmEnded(garden, '', 7200)).toBeNull();
    expect(garden.seeds).toMatchObject({ uncommon: 1, rare: 1 });
    for (let i = 0; i < 30; i++) filmEnded(garden, `x${i}`, 7200, seq(0.9));
    expect(garden.ended.length).toBeLessThanOrEqual(20);
  });

  it('seeds stop piling up at the cap', () => {
    const garden = freshGarden();
    garden.seeds.common = SEEDS_MAX;
    watch(garden, SEED_EVERY_S);
    expect(garden.seeds.common).toBe(SEEDS_MAX);
  });
});

describe('Window Garden planting and the album', () => {
  it('plants a seed in an empty pot, preferring plants not found yet', () => {
    const garden = freshGarden();
    garden.album = { fern: 1, mint: 2 };
    expect(plant(garden, 0, 'common')).toBeNull(); // pot 0 is taken
    expect(plant(garden, 9, 'common')).toBeNull();
    expect(plant(garden, 1, 'rare')).toBeNull(); // no rare seed
    // random: 0.5 → fresh pool (< 0.75), 0 → its first plant.
    expect(plant(garden, 1, 'common', seq(0.5, 0))).toBe('sunbell');
    expect(garden.seeds.common).toBe(0);
    expect(garden.pots[1]).toEqual({ plant: 'sunbell', growth: 0, water: 1 });
    expect(plant(garden, 2, 'common')).toBeNull(); // out of seeds
  });

  it('a rare seed sometimes turns legendary', () => {
    const garden = freshGarden();
    garden.seeds.rare = 2;
    expect(rarityOf(plant(garden, 1, 'rare', seq(0.05, 0.5, 0))!)).toBe('legendary');
    expect(rarityOf(plant(garden, 2, 'rare', seq(0.5, 0.5, 0.99))!)).toBe('rare');
  });

  it('picking a plant in bloom fills the album and frees the pot', () => {
    const garden = freshGarden();
    expect(pick(garden, 0)).toBeNull(); // not in bloom yet
    expect(pick(garden, 1)).toBeNull(); // empty
    garden.pots[0]!.growth = 1;
    expect(pick(garden, 0)).toEqual({ plant: 'fern', first: true });
    expect(garden.pots[0]).toBeNull();
    garden.pots[0] = { plant: 'fern', growth: 1, water: 0 };
    expect(pick(garden, 0)).toEqual({ plant: 'fern', first: false });
    expect(garden.album.fern).toBe(2);
    expect(found(garden)).toBe(1);
    expect(garden.pots).toHaveLength(POTS);
  });

  it('every plant has one rarity and a unique id', () => {
    expect(new Set(PLANT_IDS).size).toBe(PLANT_IDS.length);
    for (const id of PLANT_IDS) expect(rarityOf(id)).not.toBeNull();
    expect(rarityOf('nope')).toBeNull();
    expect(PLANTS.legendary.length).toBeGreaterThan(0);
  });
});

describe('Window Garden save', () => {
  it('round-trips as one versioned JSON', () => {
    const garden = freshGarden();
    garden.album = { fern: 2, moonbloom: 1, mint: 1 };
    garden.pots[2] = { plant: 'reel-vine', growth: 0.4, water: 0.5 };
    garden.seeds.rare = 3;
    garden.ended = ['item1'];
    const text = saveGarden(garden);
    expect(JSON.parse(text).v).toBe(GARDEN_VERSION);
    expect(loadGarden(text)).toEqual(garden);
  });

  it('broken, missing or unknown versions start a fresh garden', () => {
    for (const raw of [null, undefined, '', '{', 7, [], { v: 2 }, { pots: [] }]) expect(loadGarden(raw)).toEqual(freshGarden());
  });

  it('cleans wrong fields one by one', () => {
    const garden = loadGarden({
      v: GARDEN_VERSION,
      pots: [{ plant: 'fern', growth: 7, water: -1 }, { plant: 'weed', growth: 0.5, water: 1 }, 'x', { plant: 'mint' }],
      seeds: { common: 1e9, rare: 'two', legendary: 1.7 },
      album: { fern: 3, fake: 9, mint: -1 },
      watched: -5,
      seedClock: 1e9,
      together: 'long',
      eveningSeed: 'yes',
      seen: 99,
      ended: ['a', 5, 'x'.repeat(100), 'b'],
    });
    expect(garden.pots).toEqual([{ plant: 'fern', growth: 1, water: 0 }, null, null]);
    expect(garden.seeds).toEqual({ common: SEEDS_MAX, uncommon: 0, rare: 0, legendary: 1 });
    expect(garden.album).toEqual({ fern: 3 });
    expect(garden.watched).toBe(0);
    expect(garden.seedClock).toBe(SEED_EVERY_S);
    expect(garden.together).toBe(0);
    expect(garden.eveningSeed).toBe(false);
    expect(garden.seen).toBe(99);
    expect(garden.ended).toEqual(['a', 'b']);
  });
});

describe('Window Garden: hybrid colours and memories (side games 2)', () => {
  const film = { playing: true, others: 1, item: { id: 'f1', title: 'Night Train' }, names: ['Sam'] };
  const always = () => 0;

  it('a bloom beside a bloom drops a colour seed; the rarer neighbour gives the second colour', () => {
    const garden = freshGarden();
    garden.pots = [
      { plant: 'mint', growth: 1, water: 1 },
      { plant: 'fern', growth: 0.9999, water: 1 },
      { plant: 'moonbloom', growth: 1, water: 1 },
    ];
    const result = tickGarden(garden, 1, film, 1_000_000, always);
    expect(result.bloomed).toEqual([1]);
    // Fern's left neighbour (mint, common) is found first: same rank → the first colour.
    expect(result.hybrids).toEqual([{ plant: 'fern', color: HYBRID_COLORS.fern![0] }]);
    expect(garden.pots[1]!.bloomed).toEqual({ title: 'Night Train', with: ['Sam'], at: 1_000_000 });
    // Nothing more drops while nothing new blooms.
    expect(tickGarden(garden, 1, film, 1_001_000, always).hybrids).toEqual([]);
  });

  it('a colour seed grows a coloured plant; picking it adds a new album entry with its memory', () => {
    const garden = freshGarden();
    garden.pots = [null, null, null];
    garden.colorSeeds = [{ plant: 'mint', color: 'sky' }];
    expect(plantColor(garden, 0, 0)).toEqual({ plant: 'mint', color: 'sky' });
    expect(garden.colorSeeds).toEqual([]);
    garden.pots[0]!.growth = 0.9999;
    tickGarden(garden, 1, film, 5_000, always);
    const got = pick(garden, 0)!;
    expect(got).toEqual({ plant: 'mint', color: 'sky', first: true });
    expect(garden.album['mint:sky']).toBe(1);
    expect(garden.memories['mint:sky']).toMatchObject({ title: 'Night Train', with: ['Sam'] });
    expect(found(garden)).toBe(1);
    expect(ALBUM_IDS).toHaveLength(24);
  });

  it('colour seeds stop at the cap and round-trip; bad colours are dropped', () => {
    const garden = freshGarden();
    garden.colorSeeds = Array.from({ length: COLOR_SEEDS_MAX }, () => ({ plant: 'fern', color: 'gold' as const }));
    garden.pots = [{ plant: 'mint', growth: 1, water: 1 }, { plant: 'fern', growth: 0.9999, water: 1 }, null];
    expect(tickGarden(garden, 1, film, 1, always).hybrids).toEqual([]);
    const back = loadGarden({ ...JSON.parse(saveGarden(garden)), colorSeeds: [{ plant: 'fern', color: 'rose' }, { plant: 'fern', color: 'gold' }], pots: [{ plant: 'fern', growth: 0.5, water: 1, color: 'sky' }] });
    expect(back.colorSeeds).toEqual([{ plant: 'fern', color: 'gold' }]);
    expect(back.pots[0]!.color).toBeUndefined();
  });
});
