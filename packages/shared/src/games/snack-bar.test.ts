import { describe, expect, it } from 'vitest';
import {
  BADGES, BUCKET_MIN, BUCKET_SECONDS, CUSTOMER_MIN, CUSTOMER_SECONDS, MAX_TICK_S, RECEIPT_MIN_S, PRESTIGE_MIN, SNACK_VERSION, STANDS,
  affordable, badgeFactor, baseRate, buy, checkBadges, collectReceipt, costOf, receiptFor, serveCustomer, formatCoins, freshSnack, incomeRate, loadSnack,
  ROOFTOP_BONUS, buyDecor, placeCost, placeOf, milestoneFactor, newCinema, nextMilestone, saveSnack, serve, starsFor, tick, togetherFactor, unlocked,
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

  it('prices grow 15 % a level; bulk cost and what the coins afford agree', () => {
    expect(costOf('popcorn', 0)).toBeCloseTo(10);
    expect(costOf('popcorn', 1)).toBeCloseTo(11.5);
    expect(costOf('popcorn', 1, 2)).toBeCloseTo(11.5 + 13.225);
    expect(costOf('popcorn', 1, 0)).toBe(0);
    const save = freshSnack();
    save.coins = 11.5 + 13.225 + 1;
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
    save.coins = 200;
    expect(buy(save, 'soda')).toBe(true);
    expect(save.levels.soda).toBe(1);
    expect(save.coins).toBeCloseTo(80);
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
    expect(milestoneFactor(1000)).toBe(32);
    expect(nextMilestone(0)).toBe(10);
    expect(nextMilestone(10)).toBe(25);
    expect(nextMilestone(200)).toBeNull();
    const save = freshSnack();
    save.levels.popcorn = 10;
    expect(baseRate(save)).toBe(0.5 * 10 * 2);
  });

  it('every stand is a step up from the last', () => {
    STANDS.slice(1).forEach((stand, i) => {
      const before = STANDS[i]!;
      expect(stand.cost).toBeGreaterThan(before.cost * 5);
      expect(stand.rate / stand.cost).toBeLessThan(before.rate / before.cost);
    });
  });

  it('a new cinema keeps stars as a lasting bonus and starts the rest over', () => {
    const save = freshSnack();
    save.earned = PRESTIGE_MIN - 1;
    expect(starsFor(save)).toBe(0);
    expect(newCinema(save)).toBe(false);
    save.earned = 4_000_000;
    save.lifetime = 5_000_000;
    save.coins = 123;
    save.levels.soda = 40;
    expect(starsFor(save)).toBe(6);
    expect(newCinema(save)).toBe(true);
    expect(save).toMatchObject({ coins: 0, earned: 0, lifetime: 5_000_000, stars: 6, cinemas: 1 });
    expect(save.levels.soda).toBe(0);
    expect(save.levels.popcorn).toBe(1);
    expect(baseRate(save)).toBeCloseTo(0.5 * 1.3);
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
    for (const raw of [null, undefined, '', '{', 'null', 42, [], { v: 999, coins: 5 }, { coins: 5 }]) {
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
    expect(save.levels).toEqual({ popcorn: 1, soda: 2, nachos: 0, candy: 0, 'second-counter': 0 });
    expect(save.stars).toBe(1);
    expect(save.cinemas).toBe(0);
    expect(save.seen).toBe(1234);
    expect('extra' in save).toBe(false);
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
    expect(BADGES).toHaveLength(30);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(30);
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
    save.levels = { popcorn: 1, soda: 1, nachos: 0, candy: 1, 'second-counter': 0 };
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
    expect(baseRate(save, 12)).toBeCloseTo(lobby + 2 * 220); // candy ×3
    expect(placeCost(save, 'candy')).toBe(2);
    save.coins = costOf('candy', 1) * 1.5;
    expect(buy(save, 'candy')).toBe(false); // twice the price here
    save.cinemas = 4;
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
    newCinema(save);
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
