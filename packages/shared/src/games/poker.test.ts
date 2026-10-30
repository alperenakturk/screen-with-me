import { describe, expect, it } from 'vitest';
import {
  POKER_START_LIFE,
  PokerEngine,
  bestHand,
  blindsFor,
  buildPots,
  compareScores,
  handName,
  newDeck,
  newPokerData,
  parsePokerMessage,
  scoreFive,
} from './poker.ts';

/** A seeded random (same deck every run). */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

function table(n: number, jokers = false, seed = 7): PokerEngine {
  const engine = new PokerEngine(newPokerData(jokers), seeded(seed));
  for (let i = 0; i < n; i++) engine.addSeat({ key: `k${i}`, pid: `p${i}`, name: `P${i}` });
  return engine;
}

const lifeTotal = (e: PokerEngine) => e.data.seats.reduce((sum, s) => sum + s.life + s.paid, 0);
const toActKey = (e: PokerEngine) => e.data.seats[e.data.toAct]!.key;

describe('Poker hands', () => {
  it('ranks the categories', () => {
    const name = (cards: string) => handName(scoreFive(cards.split(' ')));
    expect(name('As Ks Qs Js Ts')).toBe('straightFlush');
    expect(name('9c 9d 9h 9s 2c')).toBe('quads');
    expect(name('9c 9d 9h 2s 2c')).toBe('fullHouse');
    expect(name('2h 7h 9h Jh Ah')).toBe('flush');
    expect(name('Ac 2d 3h 4s 5c')).toBe('straight');
    expect(name('9c 9d 9h 4s 2c')).toBe('trips');
    expect(name('9c 9d 4h 4s 2c')).toBe('twoPair');
    expect(name('9c 9d 4h 5s 2c')).toBe('pair');
    expect(name('9c Kd 4h 5s 2c')).toBe('high');
  });

  it('compares inside a category (kickers, the wheel is the lowest straight)', () => {
    const s = (cards: string) => scoreFive(cards.split(' '));
    expect(compareScores(s('Ac Ad Kh 4s 2c'), s('Ac Ad Qh Js Tc'))).toBeGreaterThan(0);
    expect(compareScores(s('6c 2d 3h 4s 5c'), s('Ac 2d 3h 4s 5c'))).toBeGreaterThan(0);
    expect(compareScores(s('Ac Kd Qh Js Tc'), s('Kc Qd Jh Ts 9c'))).toBeGreaterThan(0);
    expect(compareScores(s('9c 9d 9h 2s 2c'), s('8c 8d 8h As Ac'))).toBeGreaterThan(0);
  });

  it('picks the best five of seven, jokers stand for any card', () => {
    expect(handName(bestHand('As Ks 2d 3c Qs Js Ts'.split(' ')).score)).toBe('straightFlush');
    expect(handName(bestHand('X1 Ks 2d 3c Qs Js Ts'.split(' ')).score)).toBe('straightFlush');
    expect(handName(bestHand('X1 X2 9s 9d 9c 2h 3h'.split(' ')).score)).toBe('five');
    expect(handName(bestHand('X1 2c 7d 9h Js'.split(' ')).score)).toBe('pair');
  });

  it('decks: 52 cards, 54 with jokers, no duplicates', () => {
    expect(new Set(newDeck(false)).size).toBe(52);
    expect(new Set(newDeck(true)).size).toBe(54);
  });
});

describe('Side pots', () => {
  it('splits by what everyone put in; folded players are dead money', () => {
    // a all-in 10, b and c 30; d folded after 5.
    const pots = buildPots({ a: 10, b: 30, c: 30, d: 5 }, ['a', 'b', 'c']);
    expect(pots).toEqual([
      { amount: 35, eligible: ['a', 'b', 'c'] },
      { amount: 40, eligible: ['b', 'c'] },
    ]);
    expect(pots.reduce((s, p) => s + p.amount, 0)).toBe(75);
  });
});

describe('Poker table', () => {
  it('blinds go up every five hands', () => {
    expect(blindsFor(1)).toEqual([2, 4]);
    expect(blindsFor(5)).toEqual([2, 4]);
    expect(blindsFor(6)).toEqual([4, 8]);
  });

  it('a heads-up hand: blinds, calls, streets, showdown; life is never created or lost', () => {
    const e = table(2);
    expect(e.startGame()).toBe(true);
    expect(e.data.phase).toBe('preflop');
    expect(lifeTotal(e)).toBe(2 * POKER_START_LIFE);
    // Heads-up the dealer (small blind) acts first preflop.
    expect(e.data.toAct).toBe(e.data.dealer);
    expect(e.act(toActKey(e), { a: 'call' }).ok).toBe(true);
    expect(e.act(toActKey(e), { a: 'check' }).ok).toBe(true);
    expect(e.data.phase).toBe('flop');
    expect(e.data.board).toHaveLength(3);
    for (const street of ['turn', 'river', 'showdown']) {
      e.act(toActKey(e), { a: 'check' });
      e.act(toActKey(e), { a: 'check' });
      expect(e.data.phase).toBe(street);
    }
    expect(e.data.board).toHaveLength(5);
    expect(Object.keys(e.data.result!.shown)).toHaveLength(2);
    expect(lifeTotal(e)).toBe(2 * POKER_START_LIFE);
  });

  it('refuses moves out of turn and bad amounts', () => {
    const e = table(3);
    e.startGame();
    const other = e.data.seats.find((s) => s.key !== toActKey(e))!.key;
    expect(e.act(other, { a: 'call' })).toEqual({ ok: false, why: 'not_your_turn' });
    expect(e.act(toActKey(e), { a: 'check' })).toEqual({ ok: false, why: 'bad_action' });
    expect(e.act(toActKey(e), { a: 'raise', to: 5 })).toEqual({ ok: false, why: 'bad_action' });
    expect(e.act(toActKey(e), { a: 'raise', to: 8 }).ok).toBe(true);
  });

  it('folding to one player ends the hand; an all-in runs the board out', () => {
    const e = table(3);
    e.startGame();
    e.act(toActKey(e), { a: 'fold' });
    e.act(toActKey(e), { a: 'fold' });
    expect(e.data.phase).toBe('showdown');
    expect(Object.keys(e.data.result!.shown)).toHaveLength(0);
    expect(lifeTotal(e)).toBe(300);

    const f = table(2, false, 3);
    f.startGame();
    f.act(toActKey(f), { a: 'raise', to: 100 });
    f.act(toActKey(f), { a: 'call' });
    expect(f.data.phase).toBe('showdown');
    expect(f.data.board).toHaveLength(5);
    expect(lifeTotal(f)).toBe(200);
  });

  it('disqualify: costs 10 life, needs 3 in the hand, refunds the target', () => {
    const e = table(3);
    e.startGame();
    const actor = toActKey(e);
    e.act(actor, { a: 'raise', to: 20 });
    const raiser = e.data.seats.find((s) => s.key === actor)!;
    const other = e.data.seats.find((s) => s.key !== actor)!;
    expect(e.move(other.key, 'dq', raiser.pid).ok).toBe(true);
    expect(raiser.dq).toBe(true);
    expect(raiser.life).toBe(100);
    expect(e.move(other.key, 'dq', raiser.pid)).toEqual({ ok: false, why: 'used' });
    // 10 life burned: the table's total drops by exactly that.
    expect(lifeTotal(e)).toBe(290);
    // Two left in the hand: nobody can disqualify any more.
    const third = e.data.seats.find((s) => s !== raiser && s !== other)!;
    expect(e.move(third.key, 'dq', other.pid)).toEqual({ ok: false, why: 'too_few' });
  });

  it('free fold: on your turn, get back what you put in', () => {
    const e = table(3);
    e.startGame();
    // The big blind folds for free when it is its turn.
    e.act(toActKey(e), { a: 'call' });
    e.act(toActKey(e), { a: 'call' });
    const bb = e.data.seats[e.data.toAct]!;
    expect(bb.paid).toBe(4);
    expect(e.move(bb.key, 'free').ok).toBe(true);
    expect(bb.folded && bb.life === 100).toBe(true);
    expect(e.data.phase).toBe('flop');
  });

  it('shield: a loser at the showdown gets half back; peek shows one of the target’s cards', () => {
    const e = table(2, false, 11);
    e.startGame();
    const [a, b] = e.data.seats;
    const peek = e.move(a!.key, 'peek', b!.pid);
    expect(peek.ok && b!.cards.includes(peek.peek!.card)).toBe(true);
    e.move(a!.key, 'shield');
    e.move(b!.key, 'shield');
    e.act(toActKey(e), { a: 'raise', to: 40 });
    e.act(toActKey(e), { a: 'call' });
    while (e.data.phase !== 'showdown') e.act(toActKey(e), { a: 'check' });
    const r = e.data.result!;
    const winners = Object.keys(r.won);
    if (winners.length === 1) {
      const loser = winners[0] === a!.key ? b! : a!;
      expect(r.shielded[loser.key]).toBe(20);
    }
    // 5 + 5 burned for the shields, 5 for the peek.
    expect(lifeTotal(e)).toBe(185);
  });

  it('the game ends when one player has life left', () => {
    const e = table(2, false, 5);
    e.startGame();
    for (let i = 0; i < 200 && e.data.phase !== 'over'; i++) {
      if (e.data.phase === 'showdown') e.nextHand();
      else e.act(toActKey(e), { a: 'raise', to: 1000 }).ok || e.act(toActKey(e), { a: 'call' });
    }
    expect(e.data.phase).toBe('over');
    expect(e.winner()?.life).toBe(200);
  });

  it('message validation', () => {
    expect(parsePokerMessage(JSON.stringify({ t: 'act', a: 'raise', to: 12 }))).toEqual({ t: 'act', a: 'raise', to: 12 });
    expect(parsePokerMessage(JSON.stringify({ t: 'act', a: 'raise', to: 1.5 }))).toBeNull();
    expect(parsePokerMessage(JSON.stringify({ t: 'move', m: 'dq', target: 'abc' }))).toEqual({ t: 'move', m: 'dq', target: 'abc' });
    expect(parsePokerMessage(JSON.stringify({ t: 'move', m: 'steal' }))).toBeNull();
    expect(parsePokerMessage(JSON.stringify({ t: 'settings', jokers: true }))).toEqual({ t: 'settings', jokers: true });
  });
});
