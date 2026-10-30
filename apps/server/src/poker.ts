import { DurableObject } from 'cloudflare:workers';
import {
  POKER_AWAY_TURN_MS,
  POKER_PROTOCOL_VERSION,
  POKER_SHOWDOWN_MS,
  POKER_TURN_MS,
  PokerEngine,
  blindsFor,
  newPokerData,
  parsePokerMessage,
  type PokerClientMessage,
  type PokerData,
  type PokerPlayer,
  type PokerServerMessage,
} from '@swm/shared/games/poker';
import type { Avatar } from '@swm/shared/protocol';
import { RateLimiter } from './rate-limit.ts';

const EMPTY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_SOCKETS = 40;

interface Attachment {
  id: string;
  name: string | null;
  /** Persistent browser id (the seat is tied to it; never sent to clients). */
  key?: string;
}

interface Person {
  pid: string;
  name: string;
  avatar?: Avatar;
}

interface Saved {
  table: PokerData;
  /** Everyone who said hello (seated or watching), by key. */
  people: Record<string, Person>;
  endsAt: number | null;
  emptySince: number | null;
}

const fresh = (): Saved => ({ table: newPokerData(), people: {}, endsAt: null, emptySince: null });

/**
 * Life poker (PlayWithMe): one table = one object (its id comes from the room). Up to six seats, everyone else
 * watches. The rules live in the shared `PokerEngine`; this object keeps the state in storage, deals the private
 * cards only to their owners, and runs the turn and showdown timers with the storage alarm.
 */
export class Poker extends DurableObject<Env> {
  private data: Saved = fresh();
  private readonly limit = new RateLimiter(20, 8);

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<Saved>('poker');
      if (saved?.table) this.data = { ...fresh(), ...saved };
    });
  }

  private get engine(): PokerEngine {
    return new PokerEngine(this.data.table);
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    if (this.sockets().length > MAX_SOCKETS) {
      this.sendTo(server, { t: 'error', code: 'full' });
      server.close(4001, 'full');
    } else {
      server.serializeAttachment({ id: crypto.randomUUID().slice(0, 8), name: null } satisfies Attachment);
      if (this.data.emptySince !== null) {
        this.data.emptySince = null;
        await this.save();
      }
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    const me = ws.deserializeAttachment() as Attachment;
    const message = typeof raw === 'string' ? parsePokerMessage(raw) : null;
    if (!message) return this.sendTo(ws, { t: 'error', code: 'bad' });
    if (message.t === 'ping') return this.sendTo(ws, { t: 'pong', now: Date.now() });
    if (!this.limit.allow(me.id)) return this.sendTo(ws, { t: 'error', code: 'rate' });
    if (message.t === 'hello') return this.hello(ws, me, message);
    if (me.name === null || !me.key || !this.data.people[me.key]) return this.sendTo(ws, { t: 'error', code: 'bad' });
    await this.apply(ws, me.key, message);
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code === 1005 ? 1000 : code);
    } catch {
      // Already closed.
    }
    await this.left(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.left(ws);
  }

  override async alarm(): Promise<void> {
    const now = Date.now();
    const d = this.data;
    if (d.endsAt !== null && now >= d.endsAt) {
      const engine = this.engine;
      if (d.table.phase === 'showdown') engine.nextHand();
      else if (engine.isBetting()) engine.timeout();
      await this.changed();
    }
    if (this.sockets().length === 0 && d.emptySince !== null && now - d.emptySince >= EMPTY_TTL_MS) {
      await this.ctx.storage.deleteAll();
      this.data = fresh();
      return;
    }
    await this.scheduleAlarm();
  }

  private async hello(ws: WebSocket, me: Attachment, message: Extract<PokerClientMessage, { t: 'hello' }>): Promise<void> {
    if (message.v !== POKER_PROTOCOL_VERSION) {
      this.sendTo(ws, { t: 'error', code: 'version' });
      ws.close(4000, 'version');
      return;
    }
    const key = message.cid ?? `conn:${me.id}`;
    const d = this.data;
    const person = d.people[key] ?? { pid: crypto.randomUUID().slice(0, 8), name: message.name };
    person.name = message.name;
    if (message.avatar) person.avatar = message.avatar;
    d.people[key] = person;
    // A seat in the lobby (or between games) if one is free.
    const seat = d.table.seats.find((s) => s.key === key);
    if (seat) {
      seat.name = person.name;
      if (person.avatar) seat.avatar = person.avatar;
    } else if (d.table.phase === 'lobby' || d.table.phase === 'over') this.sit(key);
    me.name = message.name;
    me.key = key;
    ws.serializeAttachment(me);
    await this.save();
    this.sendTo(ws, { t: 'welcome', you: person.pid, now: Date.now() });
    this.sendCards(key);
    this.broadcastState();
    await this.scheduleAlarm();
  }

  /** Seats `key` in the lobby; a full table frees the seat of someone who is not connected. */
  private sit(key: string): boolean {
    const t = this.data.table;
    if (t.phase !== 'lobby' && t.phase !== 'over') return false;
    const person = this.data.people[key]!;
    const engine = this.engine;
    if (engine.addSeat({ key, pid: person.pid, name: person.name, ...(person.avatar ? { avatar: person.avatar } : {}) })) return true;
    const gone = t.seats.findIndex((s) => !this.online(s.key));
    if (gone < 0) return false;
    t.seats.splice(gone, 1);
    return engine.addSeat({ key, pid: person.pid, name: person.name, ...(person.avatar ? { avatar: person.avatar } : {}) });
  }

  /** The host: the first seated player still connected. */
  private hostKey(except?: WebSocket): string | null {
    return this.data.table.seats.find((s) => this.online(s.key, except))?.key ?? null;
  }

  private async apply(ws: WebSocket, key: string, message: PokerClientMessage): Promise<void> {
    const t = this.data.table;
    const engine = this.engine;
    switch (message.t) {
      case 'settings':
        if (t.phase !== 'lobby' && t.phase !== 'over') return;
        if (this.hostKey() !== key) return this.sendTo(ws, { t: 'error', code: 'not_host' });
        t.jokers = message.jokers;
        await this.changed();
        return;
      case 'sit':
        if (!this.sit(key)) return this.sendTo(ws, { t: 'error', code: 'full' });
        await this.changed();
        return;
      case 'start': {
        if (t.phase !== 'lobby' && t.phase !== 'over') return;
        // Seats of people who left are freed before dealing.
        t.seats = t.seats.filter((s) => this.online(s.key));
        if (t.seats.length < 2) {
          await this.changed();
          return this.sendTo(ws, { t: 'error', code: 'too_few' });
        }
        engine.startGame();
        await this.changed();
        return;
      }
      case 'act': {
        const result = engine.act(key, message.a === 'raise' ? { a: 'raise', to: message.to } : { a: message.a });
        if (!result.ok) return this.sendTo(ws, { t: 'error', code: result.why });
        await this.changed();
        return;
      }
      case 'move': {
        const result = engine.move(key, message.m, message.target);
        if (!result.ok) return this.sendTo(ws, { t: 'error', code: result.why });
        if (result.peek && message.target) this.sendTo(ws, { t: 'peek', target: message.target, card: result.peek.card });
        await this.changed();
        return;
      }
      default:
        return;
    }
  }

  /** After every change: timers, storage, everyone's view, and the private cards when a hand was dealt. */
  private async changed(): Promise<void> {
    const t = this.data.table;
    const handBefore = this.dealtHand;
    this.data.endsAt = this.deadline();
    await this.save();
    if (t.hand !== handBefore && t.phase === 'preflop') for (const s of t.seats) this.sendCards(s.key);
    this.dealtHand = t.hand;
    this.broadcastState();
    await this.scheduleAlarm();
  }

  /** The hand whose cards were last sent (in memory: after waking up, cards go again on hello anyway). */
  private dealtHand = -1;

  /** When the current turn or the showdown pause ends. */
  private deadline(): number | null {
    const t = this.data.table;
    if (t.phase === 'showdown') return Date.now() + POKER_SHOWDOWN_MS;
    const seat = t.seats[t.toAct];
    if (!seat || !this.engine.isBetting()) return null;
    return Date.now() + (this.online(seat.key) ? POKER_TURN_MS : POKER_AWAY_TURN_MS);
  }

  private sendCards(key: string): void {
    const t = this.data.table;
    const seat = t.seats.find((s) => s.key === key);
    if (!seat || !seat.cards.length || t.phase === 'lobby' || t.phase === 'over') return;
    for (const ws of this.sockets()) {
      if ((ws.deserializeAttachment() as Attachment | null)?.key === key) this.sendTo(ws, { t: 'cards', hand: t.hand, cards: seat.cards });
    }
  }

  private async left(ws: WebSocket): Promise<void> {
    const d = this.data;
    if (this.sockets(ws).length === 0) {
      d.emptySince = Date.now();
      // Nobody here: the game goes back to the lobby (life and cards are not kept for an empty table).
      d.table = { ...newPokerData(d.table.jokers), seats: d.table.seats.map((s) => ({ ...s, cards: [], bet: 0, paid: 0, life: 100, out: false })) };
      d.endsAt = null;
      await this.save();
      await this.scheduleAlarm();
      return;
    }
    // The player to act left: their turn gets the short timer.
    const t = d.table;
    const seat = t.seats[t.toAct];
    const key = (ws.deserializeAttachment() as Attachment | null)?.key;
    if (seat && seat.key === key && !this.online(key, ws)) {
      d.endsAt = Math.min(d.endsAt ?? Infinity, Date.now() + POKER_AWAY_TURN_MS);
      await this.save();
      await this.scheduleAlarm();
    }
    this.broadcastState(ws);
  }

  private async scheduleAlarm(): Promise<void> {
    const d = this.data;
    const times: number[] = [];
    if (d.endsAt !== null) times.push(d.endsAt);
    if (d.emptySince !== null) times.push(d.emptySince + EMPTY_TTL_MS);
    if (times.length) await this.ctx.storage.setAlarm(Math.min(...times));
    else await this.ctx.storage.deleteAlarm();
  }

  private online(key: string, except?: WebSocket): boolean {
    return this.sockets(except).some((ws) => (ws.deserializeAttachment() as Attachment | null)?.key === key);
  }

  private state(except?: WebSocket): PokerServerMessage {
    const d = this.data;
    const t = d.table;
    const engine = this.engine;
    const result = t.phase === 'showdown' ? t.result : null;
    const players: PokerPlayer[] = t.seats.map((s) => {
      const shown = result?.shown[s.key];
      return {
        id: s.pid,
        name: s.name,
        ...(s.avatar ? { avatar: s.avatar } : {}),
        life: s.life,
        bet: s.bet,
        folded: s.folded,
        dq: s.dq,
        allIn: s.allIn,
        shield: s.shield,
        out: s.out,
        online: this.online(s.key, except),
        used: (Object.keys(s.used) as (keyof typeof s.used)[]).filter((m) => s.used[m]),
        dealt: s.cards.length > 0,
        ...(shown ? { cards: shown.cards, best: shown.best, hand: shown.hand } : {}),
        ...(result?.won[s.key] ? { won: result.won[s.key] } : {}),
        ...(result?.shielded[s.key] ? { shielded: result.shielded[s.key] } : {}),
      };
    });
    const seated = new Set(t.seats.map((s) => s.key));
    const watchers = Object.entries(d.people)
      .filter(([k]) => !seated.has(k) && this.online(k, except))
      .map(([, p]) => ({ id: p.pid, name: p.name, ...(p.avatar ? { avatar: p.avatar } : {}) }));
    const pot = t.seats.reduce((sum, s) => sum + s.paid, 0);
    const options = engine.options();
    const host = this.hostKey(except);
    const winner = engine.winner();
    return {
      t: 'state',
      phase: t.phase,
      players,
      watchers,
      board: t.board,
      pot,
      currentBet: t.currentBet,
      toAct: t.seats[t.toAct]?.pid ?? null,
      dealer: t.seats[t.dealer]?.pid ?? null,
      ...(options ? { options } : {}),
      blinds: blindsFor(Math.max(1, t.hand)),
      hand: t.hand,
      jokers: t.jokers,
      endsAt: d.endsAt,
      host: host ? (d.people[host]?.pid ?? null) : null,
      last: t.last,
      ...(winner ? { winner: winner.pid } : {}),
    };
  }

  private broadcastState(except?: WebSocket): void {
    const text = JSON.stringify(this.state(except));
    for (const ws of this.sockets(except)) {
      if (!(ws.deserializeAttachment() as Attachment | null)?.name) continue;
      try {
        ws.send(text);
      } catch {
        // Closed.
      }
    }
  }

  private async save(): Promise<void> {
    await this.ctx.storage.put('poker', this.data);
  }

  private sockets(except?: WebSocket): WebSocket[] {
    return this.ctx.getWebSockets().filter((ws) => ws !== except && ws.readyState === WebSocket.OPEN);
  }

  private sendTo(ws: WebSocket, message: PokerServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Closed.
    }
  }
}
