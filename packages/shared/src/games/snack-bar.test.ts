import { describe, expect, it } from 'vitest';
import {
  BADGES, BUCKET_MIN, BUCKET_SECONDS, CUSTOMER_MIN, CUSTOMER_SECONDS, MAX_TICK_S, RECEIPT_MIN_S, PRESTIGE_MIN, SNACK_VERSION, STANDS,
  affordable, badgeFactor, baseRate, buy, checkBadges, collectReceipt, costOf, receiptFor, serveCustomer, formatCoins, freshSnack, incomeRate, loadSnack,
  ROOFTOP_BONUS, buyDecor, placeCost, placeOf, milestoneFactor, newCinema, nextMilestone, saveSnack, serve, starsFor, tick, togetherFactor, unlocked,
  STAR_BONUS, STAR_UNIT, MENU_BONUS, MENU_LEVEL, RECIPE_IDS, STAFF, SPECIAL_FACTOR, PLANETARIUM_BONUS, SEASIDE_CUSTOMERS, V1_STAR_RATIO,
  buyRecipe, hire, menuFactor, recipeInfo, recipesOpen, specialOf, standIncome, STAND_IDS,
} from './snack-bar.ts';

const alone = { playing: true, others: 0, voiceOthers: 0 };
const paused = { playing: false, others: 3, voiceOthers: 3 };

describe('Snack Bar economy', () => {
  it('starts with one popcorn machine and earns only while the video plays', () => {
    const save = freshSnack();
    expect(save.levels.popcorn).toBe(1);
    expect(baseRate(save)).toBe(0.5);
    expect(tick(save, 2, alone, 1000)).toBe(1);
    expect(save.coins).toBe(1);
    expect(save.watched).toBe(2);
    expect(tick(save, 2, paused, 2000)).toBe(0);
    expect(incomeRate(save, paused)).toBe(0);
    expect(save.coins).toBe(1);
    expect(save.seen).toBe(2000);
  });

  it('ignores long ticks (sleeping laptop) and bad numbers', () => {
    const save = freshSnack();
    expect(tick(save, MAX_TICK_S + 1, alone)).toBe(0);
    expect(tick(save, -1, alone)).toBe(0);
    expect(tick(save, Number.NaN, alone)).toBe(0);
    expect(save.coins).toBe(0);
  });

  it('together bonus: +10 % per other person, +5 % more in voice, capped', () => {
    expect(togetherFactor(alone)).toBe(1);
    expect(togetherFactor({ playing: true, others: 1, voiceOthers: 0 })).toBeCloseTo(1.1);
    expect(togetherFactor({ playing: true, others: 1, voiceOthers: 1 })).toBeCloseTo(1.15);
    expect(togetherFactor({ playing: true, others: 3, voiceOthers: 2 })).toBeCloseTo(1.4);
    // Voice never counts more people than the room has; a huge room stops at 9 others.
    expect(togetherFactor({ playing: true, others: 1, voiceOthers: 5 })).toBeCloseTo(1.15);
    expect(togetherFactor({ playing: true, others: 50, voiceOthers: 50 })).toBeCloseTo(1 + 0.9 + 0.45);
    const save = freshSnack();
    tick(save, 1, { playing: true, others: 2, voiceOthers: 0 });
    expect(save.coins).toBeCloseTo(0.6);
  });

  it('serving pays a second of income, at least 1, only while playing', () => {
    const save = freshSnack();
    expect(serve(save, paused)).toBe(0);
    expect(serve(save, alone)).toBe(1);
    save.levels.popcorn = 9;
    expect(serve(save, alone)).toBe(4.5);
  });

  it('only in a room: time away pays nothing, a long gap between ticks is ignored', () => {
    const save = freshSnack();
    save.coins = 100;
    save.seen = 1_000_000;
    // Coming back hours later: the first tick after reopening measures from the page's own clock, never from `seen`.
    expect(tick(save, 3 * 3600, alone, 1_000_000 + 3 * 3600_000)).toBe(0);
    expect(save.coins).toBe(100);
    expect(save.seen).toBe(1_000_000 + 3 * 3600_000);
    expect(tick(save, 1, alone)).toBeCloseTo(0.5);
  });

  it('prices grow by each stand\'s own step (popcorn 8 %); bulk cost and what the coins afford agree', () => {
    expect(costOf('popcorn', 0)).toBeCloseTo(10);
    expect(costOf('popcorn', 1)).toBeCloseTo(10.8);
    expect(costOf('popcorn', 1, 2)).toBeCloseTo(10.8 + 11.664);
    expect(costOf('popcorn', 1, 0)).toBe(0);
    expect(costOf('arcade', 1)).toBeCloseTo(6e10 * 1.15);
    const save = freshSnack();
    save.coins = 10.8 + 11.664 + 1;
    expect(affordable(save, 'popcorn')).toBe(2);
    save.coins = costOf('popcorn', 1, 5);
    expect(affordable(save, 'popcorn')).toBe(5);
    expect(affordable(save, 'popcorn', 3)).toBe(3);
    save.coins = 1;
    expect(affordable(save, 'popcorn')).toBe(0);
  });

  it('buying: stands unlock one after another, never below zero', () => {
    const save = freshSnack();
    expect(unlocked(save, 'soda')).toBe(true);
    expect(unlocked(save, 'nachos')).toBe(false);
    expect(buy(save, 'soda')).toBe(false);
    save.coins = 300;
    expect(buy(save, 'soda')).toBe(true);
    expect(save.levels.soda).toBe(1);
    expect(save.coins).toBeCloseTo(50);
    expect(unlocked(save, 'nachos')).toBe(true);
    expect(buy(save, 'nachos')).toBe(false);
    expect(buy(save, 'popcorn', 0)).toBe(false);
    save.coins = costOf('popcorn', 1, 3);
    expect(buy(save, 'popcorn', 3)).toBe(true);
    expect(save.coins).toBeGreaterThanOrEqual(0);
    expect(save.levels.popcorn).toBe(4);
  });

  it('milestones double a stand’s income', () => {
    expect(milestoneFactor(9)).toBe(1);
    expect(milestoneFactor(10)).toBe(2);
    expect(milestoneFactor(25)).toBe(4);
    expect(milestoneFactor(1000)).toBe(128);
    expect(nextMilestone(0)).toBe(10);
    expect(nextMilestone(10)).toBe(25);
    expect(nextMilestone(200)).toBe(300);
    expect(nextMilestone(400)).toBeNull();
    const save = freshSnack();
    save.levels.popcorn = 10;
    expect(baseRate(save)).toBe(0.5 * 10 * 2);
  });

  it('every stand is a step up from the last; cheaper stands grow slower', () => {
    expect(STANDS).toHaveLength(8);
    STANDS.slice(1).forEach((stand, i) => {
      const before = STANDS[i]!;
      expect(stand.cost).toBeGreaterThan(before.cost * 10);
      expect(stand.rate / stand.cost).toBeLessThan(before.rate / before.cost);
      expect(stand.growth).toBeGreaterThan(before.growth);
      expect(stand.growth).toBeGreaterThanOrEqual(1.07);
      expect(stand.growth).toBeLessThanOrEqual(1.15);
    });
  });

  it('a new cinema keeps stars as a lasting bonus and starts the rest over', () => {
    const save = freshSnack();
    save.earned = PRESTIGE_MIN - 1;
    expect(starsFor(save)).toBe(0);
    expect(newCinema(save)).toBe(false);
    // Stars = cube root of earned / STAR_UNIT: 8× the coins for twice the stars.
    save.earned = STAR_UNIT * 27_000;
    expect(starsFor(save)).toBe(30);
    save.earned = STAR_UNIT * 8 * 27_000;
    expect(starsFor(save)).toBe(60);
    save.lifetime = 5e12;
    save.coins = 123;
    save.levels.soda = 40;
    save.recipes = ['popcorn:1'];
    save.staff = ['usher'];
    expect(newCinema(save)).toBe(true);
    expect(save).toMatchObject({ coins: 0, earned: 0, lifetime: 5e12, stars: 60, cinemas: 1, recipes: [], staff: ['usher'] });
    expect(save.levels.soda).toBe(0);
    expect(save.levels.popcorn).toBe(1);
    expect(baseRate(save, 12)).toBeCloseTo(0.5 * (1 + 60 * STAR_BONUS));
  });
});

describe('Snack Bar save', () => {
  it('round-trips as one versioned JSON', () => {
    const save = freshSnack();
    save.coins = 42.5;
    save.levels.candy = 3;
    save.stars = 2;
    const text = saveSnack(save);
    expect(JSON.parse(text).v).toBe(SNACK_VERSION);
    expect(loadSnack(text)).toEqual(save);
    expect(loadSnack(JSON.parse(text))).toEqual(save);
  });

  it('broken, missing or unknown versions start a fresh game', () => {
    for (const raw of [null, undefined, '', '{', 'null', 42, [], { v: 999, coins: 5 }, { v: 0, coins: 5 }, { coins: 5 }]) {
      expect(loadSnack(raw)).toEqual(freshSnack());
    }
  });

  it('cleans wrong fields one by one', () => {
    const save = loadSnack({
      v: SNACK_VERSION,
      coins: -5,
      earned: 'lots',
      lifetime: 10,
      watched: Infinity,
      levels: { popcorn: 0, soda: 2.7, nachos: -1, candy: '9', unknown: 4 },
      stars: 1.9,
      cinemas: NaN,
      seen: 1234,
      extra: true,
    });
    expect(save.coins).toBe(0);
    expect(save.earned).toBe(0);
    expect(save.lifetime).toBe(10);
    expect(save.watched).toBe(0);
    expect(save.levels).toEqual({ popcorn: 1, soda: 2, nachos: 0, candy: 0, 'second-counter': 0, hotdog: 0, 'ice-cream': 0, arcade: 0 });
    expect(save.stars).toBe(1);
    expect(save.cinemas).toBe(0);
    expect(save.seen).toBe(1234);
    expect('extra' in save).toBe(false);
  });
});

describe('formatCoins in Turkish (QA2)', () => {
  it('uses a decimal comma and Turkish units', () => {
    expect(formatCoins(0.5, 'tr')).toBe('0,5');
    expect(formatCoins(999, 'tr')).toBe('999');
    expect(formatCoins(6000, 'tr')).toBe('6 B');
    expect(formatCoins(1_234_567, 'tr')).toBe('1,23 Mn');
    expect(formatCoins(34_500_000_000, 'tr')).toBe('34,5 Mr');
    expect(formatCoins(6000)).toBe('6K');
  });
});

describe('formatCoins', () => {
  it('short amounts in every language', () => {
    expect(formatCoins(0)).toBe('0');
    expect(formatCoins(-3)).toBe('0');
    expect(formatCoins(Number.NaN)).toBe('0');
    expect(formatCoins(2.5)).toBe('2.5');
    expect(formatCoins(12.7)).toBe('12');
    expect(formatCoins(999)).toBe('999');
    expect(formatCoins(1000)).toBe('1K');
    expect(formatCoins(1234)).toBe('1.23K');
    expect(formatCoins(34_560)).toBe('34.5K');
    expect(formatCoins(999_999)).toBe('999K');
    expect(formatCoins(2_000_000)).toBe('2M');
    expect(formatCoins(1.5e12)).toBe('1.5T');
    expect(formatCoins(1e40)).toBe('1.00e40');
  });
});

describe('Snack Bar: customers, receipts, badges (side games 2)', () => {
  const film = { playing: true, others: 1, voiceOthers: 1, item: { id: 'film-a' } };

  it('a customer pays five seconds of income (at least 3), only while playing', () => {
    const save = freshSnack();
    expect(serveCustomer(save, { ...film, playing: false })).toBe(0);
    expect(serveCustomer(save, film)).toBe(CUSTOMER_MIN);
    save.levels.popcorn = 20;
    const got = serveCustomer(save, film);
    expect(got).toBeCloseTo(incomeRate(save, film) * CUSTOMER_SECONDS);
    expect(save.stats).toMatchObject({ served: 2, customers: 2, voiceServed: 2 });
  });

  it('a receipt after 5 min of a film with the game going, once, with a golden bucket', () => {
    const save = freshSnack();
    for (let s = 0; s < 4 * 60; s++) tick(save, 1, film);
    expect(receiptFor(save, 'film-a')).toBeNull();
    for (let s = 0; s < 60; s++) tick(save, 1, film);
    serve(save, film);
    const receipt = receiptFor(save, 'film-a')!;
    expect(receipt).toMatchObject({ item: 'film-a', served: 1, best: 'popcorn' });
    expect(receipt.watched).toBeCloseTo(RECEIPT_MIN_S);
    expect(receipt.bucket).toBe(Math.max(BUCKET_MIN, 0.5 * BUCKET_SECONDS));
    const before = save.coins;
    expect(collectReceipt(save, 'film-a')).toBe(receipt.bucket);
    expect(save.coins).toBeCloseTo(before + receipt.bucket);
    expect(collectReceipt(save, 'film-a')).toBe(0);
    expect(save.stats.films).toBe(1);
    // Another film starts a new record.
    tick(save, 1, { ...film, item: { id: 'film-b' } });
    expect(save.film).toMatchObject({ item: 'film-b', served: 0 });
    expect(receiptFor(save, 'film-a')).toBeNull();
  });

  it('badges: earned once, +1 % each, the fun ones give nothing', () => {
    const save = freshSnack();
    expect(checkBadges(save)).toEqual([]);
    serve(save, film);
    expect(checkBadges(save).map((b) => b.id)).toEqual(['first-sale']);
    expect(checkBadges(save)).toEqual([]);
    expect(badgeFactor(save)).toBeCloseTo(1.01);
    save.badges.push('tap-happy');
    expect(badgeFactor(save)).toBeCloseTo(1.01);
    expect(baseRate(save)).toBeCloseTo(0.5 * 1.01);
    expect(BADGES).toHaveLength(41);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(41);
  });

  it('round-trips the new fields; unknown badges and broken records are dropped', () => {
    const save = freshSnack();
    serve(save, film);
    checkBadges(save);
    const back = loadSnack(saveSnack(save));
    expect(back.stats).toEqual(save.stats);
    expect(back.badges).toEqual(['first-sale']);
    expect(back.film).toEqual(save.film);
    const broken = loadSnack({ ...JSON.parse(saveSnack(save)), badges: ['first-sale', 'nope', 3], film: { item: 7 }, receipts: 'x' });
    expect(broken.badges).toEqual(['first-sale']);
    expect(broken.film).toBeNull();
    expect(broken.receipts).toEqual([]);
    // An old save without the new fields loads with fresh ones.
    const old = loadSnack({ v: 1, coins: 5, levels: { popcorn: 2 } });
    expect(old.stats.served).toBe(0);
    expect(old.badges).toEqual([]);
  });
});

describe('Snack Bar: coin amounts', () => {
  it('keeps the zeros of whole amounts (100K, 500K were shown as 1K, 5K)', () => {
    expect(formatCoins(100_000)).toBe('100K');
    expect(formatCoins(500_000)).toBe('500K');
    expect(formatCoins(10_000)).toBe('10K');
    expect(formatCoins(1_200)).toBe('1.2K');
    expect(formatCoins(1_000_000)).toBe('1M');
    expect(formatCoins(20_500_000)).toBe('20.5M');
  });
});

describe('Snack Bar: places and decorations (side games 2)', () => {
  it('each new cinema is a different place with its own twist', () => {
    const save = freshSnack();
    save.levels = { popcorn: 1, soda: 1, nachos: 0, candy: 1, 'second-counter': 0, hotdog: 0, 'ice-cream': 0, arcade: 0 };
    expect(placeOf(save)).toBe('lobby');
    const lobby = baseRate(save, 12);
    save.cinemas = 1;
    expect(placeOf(save)).toBe('drive-in');
    expect(baseRate(save, 12)).toBeCloseTo(lobby + 4); // soda ×2
    save.cinemas = 2;
    expect(placeOf(save)).toBe('rooftop');
    expect(baseRate(save, 12)).toBeCloseTo(lobby);
    expect(baseRate(save, 22)).toBeCloseTo(lobby * (1 + ROOFTOP_BONUS));
    expect(baseRate(save, 3)).toBeCloseTo(lobby * (1 + ROOFTOP_BONUS));
    save.cinemas = 3;
    expect(placeOf(save)).toBe('art-house');
    expect(baseRate(save, 12)).toBeCloseTo(lobby + 2 * 250); // candy ×3
    expect(placeCost(save, 'candy')).toBe(2);
    save.coins = costOf('candy', 1) * 1.5;
    expect(buy(save, 'candy')).toBe(false); // twice the price here
    save.cinemas = 4;
    expect(placeOf(save)).toBe('seaside');
    save.cinemas = 5;
    expect(placeOf(save)).toBe('planetarium');
    save.cinemas = 6;
    expect(placeOf(save)).toBe('drive-in');
  });

  it('decorations are bought once and kept; looks only', () => {
    const save = freshSnack();
    const rate = baseRate(save, 12);
    expect(buyDecor(save, 'marquee')).toBe(false);
    save.coins = 600;
    expect(buyDecor(save, 'marquee')).toBe(true);
    expect(save.coins).toBe(100);
    expect(buyDecor(save, 'marquee')).toBe(false);
    expect(baseRate(save, 12)).toBe(rate);
    save.earned = PRESTIGE_MIN;
    expect(newCinema(save)).toBe(true);
    expect(save.decor).toEqual(['marquee']);
    expect(loadSnack({ ...JSON.parse(saveSnack(save)), decor: ['marquee', 'marquee', 'castle'] }).decor).toEqual(['marquee']);
  });
});

describe('the room\'s tip jar (side games 2, pick 5)', () => {
  it('a full jar adds 10 % for this film', async () => {
    const { TIP_BOOST } = await import('./snack-bar.ts');
    const save = freshSnack();
    const plain = incomeRate(save, alone);
    expect(incomeRate(save, { ...alone, boost: true })).toBeCloseTo(plain * (1 + TIP_BOOST));
    expect(incomeRate(save, { ...alone, playing: false, boost: true })).toBe(0);
  });
});

describe('Snack Bar v2 (SB3): recipes, staff, the menu bonus, the special, the new places', () => {
  it('a recipe opens at the stand\'s level, in steps, and doubles the stand', () => {
    const save = freshSnack();
    expect(recipesOpen(save)).toEqual([]);
    save.levels.popcorn = 5;
    expect(recipesOpen(save)).toEqual(['popcorn:1']);
    const { price } = recipeInfo(save, 'popcorn:1');
    expect(buyRecipe(save, 'popcorn:1')).toBe(false); // no coins
    save.coins = price;
    const before = standIncome(save, 'popcorn');
    expect(buyRecipe(save, 'popcorn:1')).toBe(true);
    expect(save.coins).toBeCloseTo(0);
    expect(standIncome(save, 'popcorn')).toBeCloseTo(before * 2);
    expect(buyRecipe(save, 'popcorn:1')).toBe(false); // once
    expect(recipesOpen(save)).toEqual([]); // step 2 needs level 25
    save.levels.popcorn = 25;
    expect(recipesOpen(save)).toEqual(['popcorn:2']);
    expect(RECIPE_IDS).toHaveLength(24);
  });

  it('staff are hired once and do their job: tip box, manager', () => {
    const save = freshSnack();
    save.levels.popcorn = 100; // plenty of income, so the seconds show
    const ctx = { playing: true, others: 0, voiceOthers: 0 };
    const tap = serve(save, ctx);
    const customer = serveCustomer(save, ctx);
    save.coins = 1e12;
    for (const m of STAFF) expect(hire(save, m.id)).toBe(true);
    expect(hire(save, 'usher')).toBe(false);
    expect(serve(save, ctx)).toBeCloseTo(tap * 2);
    expect(serveCustomer(save, ctx)).toBeCloseTo(customer * 2);
  });

  it('the menu bonus: +10 % for every stand at level 25', () => {
    const save = freshSnack();
    expect(menuFactor(save)).toBe(1);
    save.levels.popcorn = MENU_LEVEL;
    save.levels.soda = MENU_LEVEL;
    expect(menuFactor(save)).toBeCloseTo(1 + 2 * MENU_BONUS);
  });

  it('the daily special: one stand ×2, the same for everyone on a day, all stands over the days', () => {
    const save = freshSnack();
    save.levels.soda = 3;
    const plain = incomeRate(save, alone);
    expect(incomeRate(save, { ...alone, special: 'soda' })).toBeCloseTo(plain + standIncome(save, 'soda') * (SPECIAL_FACTOR - 1));
    expect(specialOf(20_000)).toBe(specialOf(20_000));
    const seen = new Set(Array.from({ length: 200 }, (_, d) => specialOf(20_000 + d)));
    expect(seen.size).toBe(STAND_IDS.length);
  });

  it('the seaside pays customers ×2; the planetarium +25 % alone', () => {
    const save = freshSnack();
    save.levels.popcorn = 100;
    const ctx = { playing: true, others: 0, voiceOthers: 0 };
    const lobby = serveCustomer(save, ctx);
    save.cinemas = 4;
    expect(serveCustomer(save, ctx)).toBeCloseTo(lobby * SEASIDE_CUSTOMERS);
    save.cinemas = 5;
    const income = incomeRate(save, ctx);
    expect(income).toBeCloseTo(baseRate(save) * (1 + PLANETARIUM_BONUS));
    expect(incomeRate(save, { ...ctx, others: 1 })).toBeCloseTo(baseRate(save) * 1.1);
  });

  it('migrates a version 1 save: every level, coin and decoration kept, stars keep their bonus, no stand earns less', () => {
    const v1 = {
      v: 1, coins: 1234.5, earned: 5e6, lifetime: 9e6, watched: 3600, stars: 3, cinemas: 2, seen: 1,
      levels: { popcorn: 60, soda: 30, nachos: 12, candy: 3, 'second-counter': 1 },
      stats: { served: 10, customers: 2, together: 0, voiceServed: 0, films: 1, watched: 3600 },
      badges: ['first-sale'], film: null, receipts: [], decor: ['marquee'],
    };
    const save = loadSnack(v1);
    expect(save.v).toBe(SNACK_VERSION);
    expect(save).toMatchObject({ coins: 1234.5, earned: 5e6, lifetime: 9e6, cinemas: 2, decor: ['marquee'], badges: ['first-sale'], recipes: [], staff: [] });
    expect(save.levels).toMatchObject(v1.levels);
    expect(save.levels.hotdog).toBe(0);
    expect(save.stars).toBe(Math.ceil(3 * V1_STAR_RATIO));
    expect(1 + save.stars * STAR_BONUS).toBeGreaterThanOrEqual(1 + 3 * 0.05);
    // v1 income per stand: rate × level × 2 per milestone among 10, 25, 50, 100, 200.
    const v1Rate: Record<string, number> = { popcorn: 0.5, soda: 4, nachos: 30, candy: 220, 'second-counter': 1600 };
    const v1Milestones = (l: number) => 2 ** [10, 25, 50, 100, 200].filter((m) => l >= m).length;
    for (const [id, level] of Object.entries(v1.levels)) {
      expect(standIncome(save, id as never)).toBeGreaterThanOrEqual(v1Rate[id]! * level * v1Milestones(level));
    }
  });
});

describe('Snack Bar NG2: seasonal stands and the manager’s report', () => {
  it('weeks start on Monday and the four stands come in turn', async () => {
    const { seasonWeek, seasonOf, seasonDaysLeft, SEASONS } = await import('./snack-bar.ts');
    // Day 4 = Monday 5 Jan 1970: a new week; day 3 (Sunday) is the last day of the week before.
    expect(seasonWeek(4)).toBe(seasonWeek(3) + 1);
    expect(seasonWeek(4)).toBe(seasonWeek(10));
    expect(seasonDaysLeft(4)).toBe(7);
    expect(seasonDaysLeft(10)).toBe(1);
    expect(new Set([0, 1, 2, 3].map((w) => seasonOf(w))).size).toBe(SEASONS.length);
    expect(seasonOf(4)).toBe(seasonOf(0));
  });

  it('a seasonal stand costs a minute of income, adds 5 % a level and leaves with its week', async () => {
    const { buySeason, seasonCost, seasonFactor, rollSeason, SEASON_COST_MIN, SEASON_LEVELS, SEASON_GROWTH } = await import('./snack-bar.ts');
    const save = freshSnack();
    save.levels.popcorn = 100;
    save.coins = 1e12;
    const rate = baseRate(save, 12);
    const first = seasonCost(save, 7, 12)!;
    expect(first).toBeCloseTo(Math.max(SEASON_COST_MIN, rate * 60));
    expect(buySeason(save, 7, 12)).toBe(true);
    expect(seasonFactor(save)).toBeCloseTo(1.05);
    expect(baseRate(save, 12)).toBeCloseTo(rate * 1.05);
    // The price grows ×1.5 a level and is counted without the stand's own bonus.
    expect(seasonCost(save, 7, 12)).toBeCloseTo(first * SEASON_GROWTH);
    while (buySeason(save, 7, 12));
    expect(save.season).toEqual({ week: 7, level: SEASON_LEVELS });
    expect(seasonCost(save, 7, 12)).toBeNull();
    // A new week: the stand leaves and the bonus with it.
    expect(rollSeason(save, 8)).toBe(true);
    expect(save.season).toBeNull();
    expect(baseRate(save, 12)).toBeCloseTo(rate);
    // Too few coins: nothing changes.
    save.coins = 0;
    expect(buySeason(save, 8, 12)).toBe(false);
    expect(save.season).toBeNull();
  });

  it('tick ends last week’s stand', () => {
    const save = freshSnack();
    save.season = { week: 1, level: 3 };
    tick(save, 1, alone, 30 * 86_400_000);
    expect(save.season).toBeNull();
  });

  it('level 5 earns the season’s badge, which stays after the week', async () => {
    const { buySeason, seasonOf, rollSeason } = await import('./snack-bar.ts');
    const save = freshSnack();
    save.coins = 1e9;
    for (let i = 0; i < 4; i++) buySeason(save, 2, 12);
    expect(checkBadges(save).map((b) => b.id)).not.toContain(`season-${seasonOf(2)}`);
    buySeason(save, 2, 12);
    expect(checkBadges(save).map((b) => b.id)).toContain(`season-${seasonOf(2)}`);
    rollSeason(save, 3);
    expect(save.badges).toContain(`season-${seasonOf(2)}`);
    expect(BADGES.filter((b) => b.id.startsWith('season-'))).toHaveLength(4);
  });

  it('old saves carry over (no season) and a broken season is dropped', () => {
    const old = JSON.parse(saveSnack(freshSnack()));
    delete old.season;
    expect(loadSnack(JSON.stringify(old)).season).toBeNull();
    expect(loadSnack(JSON.stringify({ ...old, season: { week: 5, level: 99 } })).season).toEqual({ week: 5, level: 10 });
    expect(loadSnack(JSON.stringify({ ...old, season: { week: 'x', level: 2 } })).season).toBeNull();
    expect(loadSnack(JSON.stringify({ ...old, season: { week: 5, level: 3 } })).season).toEqual({ week: 5, level: 3 });
  });

  it('the report names the best sellers and the fastest payback', async () => {
    const { managerReport } = await import('./snack-bar.ts');
    const save = freshSnack();
    save.levels.popcorn = 30;
    save.levels.soda = 2;
    const report = managerReport(save, 7, 12);
    expect(report.top[0]!.id).toBe('popcorn');
    expect(report.top.reduce((sum, x) => sum + x.share, 0)).toBeCloseTo(1);
    expect(report.next).not.toBeNull();
    // Popcorn's first recipe (×2 for the stand that earns nearly everything) is the fastest payback here.
    expect(report.next).toMatchObject({ kind: 'recipe', id: 'popcorn:1' });
    // A late game (every stand at 400, every recipe bought): levels cost far more than they add, and the seasonal
    // stand (a minute of income for +5 %: 20 minutes back) is the best buy.
    const late = freshSnack();
    for (const id of STAND_IDS) late.levels[id] = 400;
    late.recipes = [...RECIPE_IDS];
    expect(managerReport(late, 7, 12).next).toMatchObject({ kind: 'season', level: 1 });
    // A fresh game: the next popcorn level (10 coins for +0.5/s) beats the seasonal stand's 50-coin minimum.
    expect(managerReport(freshSnack(), 7, 12).next).toMatchObject({ kind: 'stand', id: 'popcorn', level: 2 });
    // At the seasonal stand's top it is never suggested.
    save.season = { week: 7, level: 10 };
    expect(managerReport(save, 7, 12).next?.kind).not.toBe('season');
  });
});
