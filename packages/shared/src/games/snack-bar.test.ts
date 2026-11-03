import { describe, expect, it } from 'vitest';
import {
  AWAY_CAP_S, AWAY_SHARE, MAX_TICK_S, PRESTIGE_MIN, SNACK_VERSION, STANDS,
  affordable, awayBonus, baseRate, buy, collectAway, costOf, formatCoins, freshSnack, incomeRate, loadSnack,
  milestoneFactor, newCinema, nextMilestone, saveSnack, serve, starsFor, tick, togetherFactor, unlocked,
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

  it('away bonus: a capped share of the base income, nothing for short breaks or a new game', () => {
    const save = freshSnack();
    expect(awayBonus(save, 10_000_000).coins).toBe(0);
    save.seen = 1_000_000;
    expect(awayBonus(save, 1_000_000 + 30_000).coins).toBe(0);
    expect(awayBonus(save, 1_000_000 + 600_000)).toEqual({ seconds: 600, coins: 0.5 * 600 * AWAY_SHARE });
    const day = awayBonus(save, 1_000_000 + 24 * 3600_000);
    expect(day.seconds).toBe(AWAY_CAP_S);
    expect(day.coins).toBe(0.5 * AWAY_CAP_S * AWAY_SHARE);
    // A clock that went backwards pays nothing.
    expect(awayBonus(save, 0).coins).toBe(0);
    const paid = collectAway(save, 1_000_000 + 600_000);
    expect(save.coins).toBe(paid.coins);
    expect(save.seen).toBe(1_600_000);
    expect(collectAway(save, 1_600_000).coins).toBe(0);
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
