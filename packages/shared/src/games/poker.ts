// Life poker ("Can Pokeri", 0.9.91.8): Texas Hold'em for 2–6 players where the chips are life. Everyone starts at
// 100 % life and bets it like chips; a player at 0 % is out; the last one with life wins. Owner's wish (Oct 2026):
// "fun mechanics, special moves like sacrificing 10 % of your life to disqualify a player for this hand (their bets
// are refunded) or folding this hand for free", with and without jokers, and no casino look.
//
// Special moves, each once per game:
// - disqualify (10 % of life, burned): a player leaves this hand, their bets this hand go back to them (only with 3+
//   players still in the hand, otherwise it would just win the pot)
// - free fold (on your turn): fold and take back what you put in this hand
// - shield (5 %): if you lose this hand at the showdown, half of what you put in comes back
// - peek (5 %): see one of a player's two cards
// Jokers (optional): two jokers in the deck, each one stands for any card (five of a kind beats a straight flush).
//
// This file is pure (no I/O): cards, hand ranking, side pots and the table engine (`PokerEngine`), so the rules are
// unit-tested and the server object only stores the state and runs the timers.

import { CLIENT_ID, cleanName, isAvatar, type Avatar } from '../protocol.ts';

export const POKER_PROTOCOL_VERSION = 1;
export const POKER_MAX_PLAYERS = 6;
export const POKER_START_LIFE = 100;
/** Blinds start at 2 / 4 and go up by that much every BLIND_EVERY hands. */
export const POKER_BLINDS = [2, 4] as const;
export const POKER_BLIND_EVERY = 5;
export const POKER_TURN_MS = 30_000;
/** A disconnected player's turn ends sooner. */
export const POKER_AWAY_TURN_MS = 4_000;
export const POKER_SHOWDOWN_MS = 5_000;
/** The pause when nothing has to be read: everyone else folded, or the game is decided (owner: "we waited ages"). */
export const POKER_QUICK_MS = 2_500;
export const MOVE_COST = { dq: 10, free: 0, shield: 5, peek: 5 } as const;
export type PokerMove = keyof typeof MOVE_COST;
export const POKER_MOVES = Object.keys(MOVE_COST) as PokerMove[];

// ---- Cards ----
/** "As" ace of spades, "Td" ten of diamonds, "2c"…; jokers "X1", "X2". */
export type Card = string;
export const RANKS = '23456789TJQKA';
export const SUITS = 'shdc';
export const isJoker = (c: Card): boolean => c[0] === 'X';
export const rankOf = (c: Card): number => RANKS.indexOf(c[0]!) + 2;
export const suitOf = (c: Card): string => c[1]!;

export function newDeck(jokers: boolean): Card[] {
  const deck: Card[] = [];
  for (const r of RANKS) for (const s of SUITS) deck.push(r + s);
  if (jokers) deck.push('X1', 'X2');
  return deck;
}

export function shuffle<T>(list: T[], random: () => number = Math.random): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list;
}

// ---- Hand ranking ----
/** 0 high card … 8 straight flush, 9 five of a kind (jokers only). */
export const HAND_NAMES = ['high', 'pair', 'twoPair', 'trips', 'straight', 'flush', 'fullHouse', 'quads', 'straightFlush', 'five'] as const;
export type HandName = (typeof HAND_NAMES)[number];
/** [category, tie-breakers…]; compare with `compareScores`. */
export type Score = number[];

export function compareScores(a: Score, b: Score): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Score of exactly five real cards. */
export function scoreFive(cards: readonly Card[]): Score {
  const ranks = cards.map(rankOf).sort((a, b) => b - a);
  const flush = cards.every((c) => suitOf(c) === suitOf(cards[0]!));
  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  // Groups: bigger count first, then higher rank.
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const unique = [...new Set(ranks)];
  let straightHigh = 0;
  if (unique.length === 5) {
    if (unique[0]! - unique[4]! === 4) straightHigh = unique[0]!;
    // The wheel: A-2-3-4-5.
    else if (unique.join() === '14,5,4,3,2') straightHigh = 5;
  }
  const order = groups.map((g) => g[0]);
  if (groups[0]![1] === 5) return [9, order[0]!];
  if (straightHigh && flush) return [8, straightHigh];
  if (groups[0]![1] === 4) return [7, ...order];
  if (groups[0]![1] === 3 && groups[1]?.[1] === 2) return [6, ...order];
  if (flush) return [5, ...ranks];
  if (straightHigh) return [4, straightHigh];
  if (groups[0]![1] === 3) return [3, ...order];
  if (groups[0]![1] === 2 && groups[1]?.[1] === 2) return [2, ...order];
  if (groups[0]![1] === 2) return [1, ...order];
  return [0, ...ranks];
}

const ALL_REAL = newDeck(false);

/** Best score of five cards that may hold jokers (each joker tries every card). */
function scoreWithJokers(cards: readonly Card[]): Score {
  const jokers = cards.filter(isJoker).length;
  if (!jokers) return scoreFive(cards);
  const real = cards.filter((c) => !isJoker(c));
  let best: Score = [-1];
  const tryWith = (extra: Card[]) => {
    const s = scoreFive([...real, ...extra]);
    if (compareScores(s, best) > 0) best = s;
  };
  if (jokers === 1) for (const a of ALL_REAL) tryWith([a]);
  else for (const a of ALL_REAL) for (const b of ALL_REAL) tryWith([a, b]);
  return best;
}

/** The best five of up to seven cards. */
export function bestHand(cards: readonly Card[]): { score: Score; cards: Card[] } {
  if (cards.length <= 5) return { score: scoreWithJokers(cards), cards: [...cards] };
  let best: { score: Score; cards: Card[] } = { score: [-1], cards: [] };
  const n = cards.length;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++) {
      const five = cards.filter((_, i) => i !== a && i !== b);
      const score = scoreWithJokers(five);
      if (compareScores(score, best.score) > 0) best = { score, cards: five };
    }
  return best;
}

export const handName = (score: Score): HandName => HAND_NAMES[score[0]!] ?? 'high';

// ---- Pots ----
export interface Pot {
  amount: number;
  /** Keys that can win it (in the hand, put in at least this level). */
  eligible: string[];
}

/** Main pot and side pots from what everyone put in this hand (folded players' life stays in as dead money). */
export function buildPots(paid: Record<string, number>, live: readonly string[]): Pot[] {
  const levels = [...new Set(live.map((k) => paid[k] ?? 0).filter((x) => x > 0))].sort((a, b) => a - b);
  const pots: Pot[] = [];
  let last = 0;
  for (const level of levels) {
    let amount = 0;
    for (const value of Object.values(paid)) amount += Math.max(0, Math.min(value, level) - last);
    const eligible = live.filter((k) => (paid[k] ?? 0) >= level);
    if (amount > 0) pots.push({ amount, eligible });
    last = level;
  }
  // Money above the highest live level (only folded players put in that much): goes to the last pot.
  let rest = 0;
  for (const value of Object.values(paid)) rest += Math.max(0, value - last);
  if (rest > 0) {
    if (pots.length) pots[pots.length - 1]!.amount += rest;
    else pots.push({ amount: rest, eligible: [...live] });
  }
  return pots;
}

// ---- Table engine ----
export type PokerPhase = 'lobby' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'over';
export type PokerAction = { a: 'fold' } | { a: 'check' } | { a: 'call' } | { a: 'raise'; to: number };

export interface PokerSeat {
  key: string;
  pid: string;
  name: string;
  avatar?: Avatar;
  life: number;
  cards: Card[];
  /** Put in during this betting round / this whole hand. */
  bet: number;
  paid: number;
  folded: boolean;
  /** Disqualified for this hand (by someone's move). */
  dq: boolean;
  allIn: boolean;
  acted: boolean;
  shield: boolean;
  used: Record<PokerMove, boolean>;
  /** Out of the game (life 0). */
  out: boolean;
}

export interface HandResult {
  /** What each key won (net of what came back). */
  won: Record<string, number>;
  /** Hands shown at the showdown: key → best five + name. */
  shown: Record<string, { cards: Card[]; best: Card[]; hand: HandName }>;
  /** Shield refunds. */
  shielded: Record<string, number>;
}

export interface PokerData {
  phase: PokerPhase;
  seats: PokerSeat[];
  dealer: number;
  toAct: number;
  board: Card[];
  deck: Card[];
  currentBet: number;
  minRaise: number;
  hand: number;
  jokers: boolean;
  result: HandResult | null;
  /** The last thing that happened (for the table's feed). */
  last: PokerEvent | null;
}

export type PokerEvent =
  | { e: 'blinds'; sb: string; bb: string; amounts: [number, number] }
  | { e: 'act'; by: string; a: PokerAction['a']; amount: number }
  | { e: 'move'; by: string; m: PokerMove; target?: string }
  | { e: 'timeout'; by: string };

export type MoveResult = { ok: true; peek?: { card: Card } } | { ok: false; why: PokerError };
export type PokerError = 'not_your_turn' | 'bad_action' | 'used' | 'no_life' | 'too_few' | 'bad_target' | 'phase';

const freshUsed = (): Record<PokerMove, boolean> => ({ dq: false, free: false, shield: false, peek: false });

export function newPokerData(jokers = false): PokerData {
  return { phase: 'lobby', seats: [], dealer: -1, toAct: -1, board: [], deck: [], currentBet: 0, minRaise: 0, hand: 0, jokers, result: null, last: null };
}

export function blindsFor(hand: number): [number, number] {
  const step = Math.floor(Math.max(0, hand - 1) / POKER_BLIND_EVERY);
  return [POKER_BLINDS[0] * (step + 1), POKER_BLINDS[1] * (step + 1)];
}

/**
 * The table's rules on a plain state object (the server stores `data` as JSON). Seats are added in the lobby; a hand
 * runs preflop → flop → turn → river → showdown; `nextHand()` after the showdown pause, `over` when one is left.
 */
export class PokerEngine {
  constructor(
    public data: PokerData,
    private readonly random: () => number = Math.random,
  ) {}

  private get seats(): PokerSeat[] {
    return this.data.seats;
  }

  /** In this hand: dealt in, not folded, not disqualified. */
  inHand(seat: PokerSeat): boolean {
    return !seat.out && seat.cards.length > 0 && !seat.folded && !seat.dq;
  }

  private canAct(seat: PokerSeat): boolean {
    return this.inHand(seat) && !seat.allIn;
  }

  private next(from: number, pred: (s: PokerSeat) => boolean): number {
    const n = this.seats.length;
    for (let i = 1; i <= n; i++) {
      const j = (from + i + n) % n;
      if (pred(this.seats[j]!)) return j;
    }
    return -1;
  }

  addSeat(seat: { key: string; pid: string; name: string; avatar?: Avatar }): boolean {
    if (this.seats.length >= POKER_MAX_PLAYERS || this.seats.some((s) => s.key === seat.key)) return false;
    this.seats.push({ ...seat, life: POKER_START_LIFE, cards: [], bet: 0, paid: 0, folded: false, dq: false, allIn: false, acted: false, shield: false, used: freshUsed(), out: false });
    return true;
  }

  /** A new game: everyone seated back to full life. */
  startGame(): boolean {
    if (this.seats.length < 2) return false;
    for (const s of this.seats) Object.assign(s, { life: POKER_START_LIFE, out: false, used: freshUsed() });
    this.data.hand = 0;
    this.data.dealer = -1;
    return this.startHand();
  }

  startHand(): boolean {
    const d = this.data;
    for (const s of this.seats) {
      if (s.life <= 0) s.out = true;
      Object.assign(s, { cards: [], bet: 0, paid: 0, folded: false, dq: false, allIn: false, acted: false, shield: false });
    }
    const alive = this.seats.filter((s) => !s.out);
    if (alive.length < 2) {
      d.phase = 'over';
      d.toAct = -1;
      return false;
    }
    d.hand += 1;
    d.result = null;
    d.board = [];
    d.deck = shuffle(newDeck(d.jokers), this.random);
    d.dealer = this.next(d.dealer, (s) => !s.out);
    for (const s of alive) s.cards = [d.deck.pop()!, d.deck.pop()!];
    const [sb, bb] = blindsFor(d.hand);
    // Heads-up: the dealer is the small blind.
    const sbSeat = alive.length === 2 ? d.dealer : this.next(d.dealer, (s) => !s.out);
    const bbSeat = this.next(sbSeat, (s) => !s.out);
    const sbPaid = this.pay(this.seats[sbSeat]!, sb);
    const bbPaid = this.pay(this.seats[bbSeat]!, bb);
    d.currentBet = Math.max(sbPaid, bbPaid);
    d.minRaise = bb;
    d.phase = 'preflop';
    d.last = { e: 'blinds', sb: this.seats[sbSeat]!.pid, bb: this.seats[bbSeat]!.pid, amounts: [sbPaid, bbPaid] };
    d.toAct = this.next(bbSeat, (s) => this.canAct(s));
    this.settle();
    return true;
  }

  /** Puts life into the pot (at most what the seat has; all-in at 0). */
  private pay(seat: PokerSeat, amount: number): number {
    const x = Math.max(0, Math.min(amount, seat.life));
    seat.life -= x;
    seat.bet += x;
    seat.paid += x;
    if (seat.life === 0) seat.allIn = true;
    return x;
  }

  /** What the player to act needs to call, and the smallest / largest "raise to". */
  options(): { call: number; minTo: number; maxTo: number } | null {
    const seat = this.seats[this.data.toAct];
    if (!seat || !this.isBetting()) return null;
    const call = Math.min(this.data.currentBet - seat.bet, seat.life);
    return { call, minTo: this.data.currentBet + this.data.minRaise, maxTo: seat.bet + seat.life };
  }

  isBetting(): boolean {
    return ['preflop', 'flop', 'turn', 'river'].includes(this.data.phase);
  }

  act(key: string, action: PokerAction): MoveResult {
    const d = this.data;
    if (!this.isBetting()) return { ok: false, why: 'phase' };
    const seat = this.seats[d.toAct];
    if (!seat || seat.key !== key) return { ok: false, why: 'not_your_turn' };
    const toCall = d.currentBet - seat.bet;
    let amount = 0;
    switch (action.a) {
      case 'fold':
        seat.folded = true;
        break;
      case 'check':
        if (toCall > 0) return { ok: false, why: 'bad_action' };
        break;
      case 'call':
        if (toCall <= 0) return { ok: false, why: 'bad_action' };
        amount = this.pay(seat, toCall);
        break;
      case 'raise': {
        const max = seat.bet + seat.life;
        const to = Math.min(Math.floor(action.to), max);
        const allIn = to === max;
        if (to <= d.currentBet || (!allIn && to - d.currentBet < d.minRaise)) return { ok: false, why: 'bad_action' };
        amount = this.pay(seat, to - seat.bet);
        // A short all-in does not reopen the betting for those who already acted.
        if (to - d.currentBet >= d.minRaise) {
          d.minRaise = to - d.currentBet;
          for (const s of this.seats) if (s !== seat) s.acted = false;
        }
        d.currentBet = to;
        break;
      }
    }
    seat.acted = true;
    d.last = { e: 'act', by: seat.pid, a: action.a, amount };
    this.advance();
    return { ok: true };
  }

  /** Time is up for the player to act: check if free, otherwise fold. */
  timeout(): void {
    const seat = this.seats[this.data.toAct];
    if (!seat || !this.isBetting()) return;
    const free = this.data.currentBet - seat.bet <= 0;
    this.act(seat.key, free ? { a: 'check' } : { a: 'fold' });
    this.data.last = { e: 'timeout', by: seat.pid };
  }

  move(key: string, m: PokerMove, targetPid?: string): MoveResult {
    const d = this.data;
    if (!this.isBetting()) return { ok: false, why: 'phase' };
    const seat = this.seats.find((s) => s.key === key);
    if (!seat || !this.inHand(seat)) return { ok: false, why: 'phase' };
    if (seat.used[m]) return { ok: false, why: 'used' };
    const cost = MOVE_COST[m];
    // A move never puts you out by itself: you need more life than it costs.
    if (cost > 0 && seat.life <= cost) return { ok: false, why: 'no_life' };
    const target = targetPid ? this.seats.find((s) => s.pid === targetPid) : undefined;
    let peek: Card | undefined;
    switch (m) {
      case 'dq': {
        if (!target || target === seat || !this.inHand(target)) return { ok: false, why: 'bad_target' };
        if (this.seats.filter((s) => this.inHand(s)).length < 3) return { ok: false, why: 'too_few' };
        target.life += target.paid;
        target.paid = 0;
        target.bet = 0;
        target.allIn = false;
        target.dq = true;
        // The bet to match may drop with them.
        d.currentBet = Math.max(0, ...this.seats.filter((s) => this.inHand(s)).map((s) => s.bet));
        break;
      }
      case 'free':
        if (this.seats[d.toAct] !== seat) return { ok: false, why: 'not_your_turn' };
        seat.life += seat.paid;
        seat.paid = 0;
        seat.bet = 0;
        seat.folded = true;
        seat.acted = true;
        d.currentBet = Math.max(0, ...this.seats.filter((s) => this.inHand(s)).map((s) => s.bet));
        break;
      case 'shield':
        seat.shield = true;
        break;
      case 'peek':
        if (!target || target === seat || !this.inHand(target)) return { ok: false, why: 'bad_target' };
        peek = target.cards[Math.floor(this.random() * target.cards.length)]!;
        break;
    }
    seat.life -= cost;
    seat.used[m] = true;
    d.last = { e: 'move', by: seat.pid, m, ...(target ? { target: target.pid } : {}) };
    if (m === 'dq' || m === 'free') {
      // Whoever was to act may be gone now.
      const current = this.seats[d.toAct];
      if (!current || !this.canAct(current)) d.toAct = this.next(d.toAct, (s) => this.canAct(s));
      this.settle();
    }
    return peek ? { ok: true, peek: { card: peek } } : { ok: true };
  }

  /** After an action: the next player, or the next street, or the end of the hand. */
  private advance(): void {
    const d = this.data;
    d.toAct = this.next(d.toAct, (s) => this.canAct(s));
    this.settle();
  }

  /** Moves the hand on while nobody needs to act. */
  private settle(): void {
    const d = this.data;
    for (;;) {
      const live = this.seats.filter((s) => this.inHand(s));
      if (live.length <= 1) return this.finish();
      const actors = live.filter((s) => !s.allIn);
      const done = actors.every((s) => s.acted && s.bet === d.currentBet) || (actors.length <= 1 && actors.every((s) => s.bet >= d.currentBet));
      if (!done) {
        if (d.toAct < 0 || !this.canAct(this.seats[d.toAct]!)) d.toAct = this.next(d.toAct, (s) => this.canAct(s));
        return;
      }
      if (d.phase === 'river') return this.finish();
      // Next street.
      for (const s of this.seats) {
        s.bet = 0;
        s.acted = false;
      }
      d.currentBet = 0;
      d.minRaise = blindsFor(d.hand)[1];
      if (d.phase === 'preflop') {
        d.board.push(d.deck.pop()!, d.deck.pop()!, d.deck.pop()!);
        d.phase = 'flop';
      } else if (d.phase === 'flop') {
        d.board.push(d.deck.pop()!);
        d.phase = 'turn';
      } else {
        d.board.push(d.deck.pop()!);
        d.phase = 'river';
      }
      d.toAct = this.next(d.dealer, (s) => this.canAct(s));
      // Everyone (but one) all-in: the board runs out by itself (the loop goes on).
      if (actors.length <= 1) d.toAct = -1;
    }
  }

  /** The hand ends: one left takes everything, otherwise the showdown (side pots, shields). */
  private finish(): void {
    const d = this.data;
    const live = this.seats.filter((s) => this.inHand(s));
    const result: HandResult = { won: {}, shown: {}, shielded: {} };
    const paid: Record<string, number> = {};
    for (const s of this.seats) if (s.paid > 0) paid[s.key] = s.paid;
    if (live.length === 1) {
      const total = Object.values(paid).reduce((a, b) => a + b, 0);
      live[0]!.life += total;
      result.won[live[0]!.key] = total;
    } else {
      // Run out the board if the hand ended all-in.
      while (d.board.length < 5) d.board.push(d.deck.pop()!);
      const scores = new Map<string, { score: Score; cards: Card[] }>();
      for (const s of live) {
        const best = bestHand([...s.cards, ...d.board]);
        scores.set(s.key, best);
        result.shown[s.key] = { cards: [...s.cards], best: best.cards, hand: handName(best.score) };
      }
      const winnersOf = (pots: Pot[]) =>
        pots.map((pot) => {
          let top: Score = [-1];
          for (const k of pot.eligible) if (compareScores(scores.get(k)!.score, top) > 0) top = scores.get(k)!.score;
          return pot.eligible.filter((k) => compareScores(scores.get(k)!.score, top) === 0);
        });
      const keys = live.map((s) => s.key);
      let pots = buildPots(paid, keys);
      // Shields: a live player who wins nothing gets half of what they put in back (taken out before splitting).
      const winning = new Set(winnersOf(pots).flat());
      for (const s of live) {
        if (!s.shield || winning.has(s.key)) continue;
        const back = Math.floor(s.paid / 2);
        if (back <= 0) continue;
        s.life += back;
        paid[s.key] = s.paid - back;
        result.shielded[s.key] = back;
      }
      pots = buildPots(paid, keys);
      const winners = winnersOf(pots);
      pots.forEach((pot, i) => {
        const list = winners[i]!;
        const share = Math.floor(pot.amount / list.length);
        let rest = pot.amount - share * list.length;
        // The odd point goes to the first winner after the dealer.
        const ordered = [...list].sort((a, b) => this.seatAfterDealer(a) - this.seatAfterDealer(b));
        for (const k of ordered) {
          const extra = rest > 0 ? 1 : 0;
          rest -= extra;
          const seat = this.seats.find((s) => s.key === k)!;
          seat.life += share + extra;
          result.won[k] = (result.won[k] ?? 0) + share + extra;
        }
      });
    }
    for (const s of this.seats) {
      s.bet = 0;
      s.paid = 0;
    }
    d.result = result;
    d.phase = 'showdown';
    d.toAct = -1;
  }

  private seatAfterDealer(key: string): number {
    const i = this.seats.findIndex((s) => s.key === key);
    return (i - this.data.dealer - 1 + this.seats.length) % this.seats.length;
  }

  /** After the showdown pause: the next hand, or the end of the game. */
  nextHand(): void {
    this.startHand();
  }

  /** The winner once the game is over. */
  winner(): PokerSeat | null {
    return this.data.phase === 'over' ? (this.seats.find((s) => !s.out && s.life > 0) ?? null) : null;
  }
}

// ---- Messages ----
export interface PokerPlayer {
  id: string;
  name: string;
  avatar?: Avatar;
  life: number;
  bet: number;
  folded: boolean;
  dq: boolean;
  allIn: boolean;
  shield: boolean;
  out: boolean;
  online: boolean;
  /** Moves already used this game. */
  used: PokerMove[];
  /** Has cards this hand (face down for others). */
  dealt: boolean;
  /** Shown at the showdown. */
  cards?: Card[];
  best?: Card[];
  hand?: HandName;
  won?: number;
  shielded?: number;
}

export type PokerClientMessage =
  | { t: 'hello'; v: number; name: string; avatar?: Avatar; cid?: string }
  /** Host only, in the lobby / after the game. */
  | { t: 'settings'; jokers: boolean }
  | { t: 'start' }
  | { t: 'act'; a: 'fold' | 'check' | 'call' }
  | { t: 'act'; a: 'raise'; to: number }
  | { t: 'move'; m: PokerMove; target?: string }
  /** Take a free seat (lobby or between games). */
  | { t: 'sit' }
  | { t: 'ping' };

export type PokerServerMessage =
  | { t: 'welcome'; you: string; now: number }
  | {
      t: 'state';
      phase: PokerPhase;
      players: PokerPlayer[];
      watchers: { id: string; name: string; avatar?: Avatar }[];
      board: Card[];
      pot: number;
      currentBet: number;
      toAct: string | null;
      dealer: string | null;
      /** For the player to act: call amount and raise limits. */
      options?: { call: number; minTo: number; maxTo: number };
      blinds: [number, number];
      hand: number;
      jokers: boolean;
      endsAt: number | null;
      host: string | null;
      last: PokerEvent | null;
      winner?: string;
    }
  /** Only to the owner: their two cards. */
  | { t: 'cards'; hand: number; cards: Card[] }
  /** Only to the one who peeked. */
  | { t: 'peek'; target: string; card: Card }
  | { t: 'error'; code: PokerErrorCode }
  | { t: 'pong'; now: number };

export type PokerErrorCode = 'version' | 'bad' | 'full' | 'rate' | 'too_few' | 'not_host' | PokerError;

const PID = /^[A-Za-z0-9_-]{1,20}$/;

export function parsePokerMessage(raw: string): PokerClientMessage | null {
  if (raw.length > 1000) return null;
  let m: Record<string, unknown>;
  try {
    m = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!m || typeof m !== 'object') return null;
  switch (m.t) {
    case 'hello': {
      const name = cleanName(m.name);
      if (typeof m.v !== 'number' || name === null) return null;
      const hello: Extract<PokerClientMessage, { t: 'hello' }> = { t: 'hello', v: m.v, name };
      if (isAvatar(m.avatar)) hello.avatar = m.avatar;
      if (typeof m.cid === 'string' && CLIENT_ID.test(m.cid)) hello.cid = m.cid;
      return hello;
    }
    case 'settings':
      return typeof m.jokers === 'boolean' ? { t: 'settings', jokers: m.jokers } : null;
    case 'act':
      if (m.a === 'fold' || m.a === 'check' || m.a === 'call') return { t: 'act', a: m.a };
      return m.a === 'raise' && Number.isInteger(m.to) && (m.to as number) > 0 && (m.to as number) <= 10_000 ? { t: 'act', a: 'raise', to: m.to as number } : null;
    case 'move':
      if (!(POKER_MOVES as unknown[]).includes(m.m)) return null;
      if (m.target !== undefined && (typeof m.target !== 'string' || !PID.test(m.target))) return null;
      return { t: 'move', m: m.m as PokerMove, ...(typeof m.target === 'string' ? { target: m.target } : {}) };
    case 'start':
    case 'sit':
    case 'ping':
      return { t: m.t };
    default:
      return null;
  }
}

export const POKER_ID_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;
