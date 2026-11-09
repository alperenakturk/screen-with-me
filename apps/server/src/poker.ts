import { meterObject } from './meter.ts';
import { DurableObject } from 'cloudflare:workers';
import { PollHub } from './fallback.ts';
import {
  POKER_AWAY_TURN_MS,
  POKER_PROTOCOL_VERSION,
  POKER_QUICK_MS,
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
import { GHOST_MS, closeAsGone, closeGhosts, nextGhostCheck, touch, wasGhost } from './ghost.ts';
import { FLOOD_CODE, floodGuard } from './limits.ts';
import { answerKeepalive, heardAt, startKeepalive } from './keepalive.ts';
import { labOnRequest, labRemembered } from './lab.ts';

const EMPTY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_SOCKETS = 40;
/** People remembered by the table (names and ids of those who came by). */
const MAX_PEOPLE = 60;

interface Attachment {
  id: string;
  /** GHOST: when the last message came, and whether the alarm closed it as a dead connection (`ghost.ts`). */
  seen?: number;
  ghost?: boolean;
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
  /** A local lab server (`lab.ts`, Test Lab DL3b / GP4): only then does a `lab` message do anything. */
  private lab = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    meterObject(this, ctx, env, 'poker');
    startKeepalive(ctx);
    void ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<Saved>('poker');
      if (saved?.table) this.data = { ...fresh(), ...saved };
    });
  }

  private get engine(): PokerEngine {
    return new PokerEngine(this.data.table, secureRandom);
  }

  /** HTTP fallback connections (`fallback.ts`). */
  private readonly polls = new PollHub({
    admit: (socket) => this.admit(socket),
    message: (socket, raw) => this.webSocketMessage(socket, raw),
    closed: (socket, code) => this.webSocketClose(socket, code),
    schedule: () => this.scheduleAlarm(),
  });

  override async fetch(request: Request): Promise<Response> {
    this.lab = await labOnRequest(this.ctx.storage, this.env, request, this.lab);
    // Networks where the WebSocket never opens (phone hotspots): the same connection over plain HTTP requests.
    const polled = await this.polls.handle(request);
    if (polled) return polled;
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    await this.admit(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  /** A new connection (WebSocket or HTTP fallback). */
  private async admit(server: WebSocket): Promise<void> {
    if (this.sockets().length > MAX_SOCKETS) {
      this.sendTo(server, { t: 'error', code: 'full' });
      server.close(4001, 'full');
    } else {
      server.serializeAttachment({ id: crypto.randomUUID().slice(0, 8), name: null, seen: Date.now() } satisfies Attachment);
      if (this.data.emptySince !== null) {
        this.data.emptySince = null;
        await this.save();
      }
    }
  }

  /** QUOTA1a: the per-connection message ceiling (`limits.ts`). */
  private readonly flood = floodGuard(this.env, 'MSG_RATE');
  /** QUOTA1a: a socket's last message or the runtime's last free-keepalive answer, whichever is later. */
  private readonly heard = (ws: unknown, seen: number | undefined) => heardAt(this.ctx, ws, seen);

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    touch(ws);
    if (answerKeepalive(ws, raw)) return;
    // QUOTA1a: a connection that sends far more than any player would is closed (its leave runs once, here).
    if (!this.flood.allow(ws)) {
      closeAsGone(ws, FLOOD_CODE, 'flood', JSON.stringify({ t: 'error', code: 'rate' }));
      await this.left(ws);
      return;
    }
    const me = ws.deserializeAttachment() as Attachment;
    const message = typeof raw === 'string' ? parsePokerMessage(raw) : null;
    if (!message) return this.sendTo(ws, { t: 'error', code: 'bad' });
    // A turn or showdown pause whose time is up moves on now, whatever the alarm does: live alarms can run late right
    // after a deploy (the 0.9.95.2 deploy's first poker.mjs waited 12 s for hand 2; Draw / Quiz do the same since
    // 0.9.93.2). The page pings every 15 s, so a late alarm costs at most that.
    await this.advance(Date.now());
    if (message.t === 'ping') return this.sendTo(ws, { t: 'pong', now: Date.now() });
    if (!this.limit.allow(me.id)) return this.sendTo(ws, { t: 'error', code: 'rate' });
    // One hello per connection, as in the room (review 3, R3-8).
    if (message.t === 'hello') return me.name === null ? this.hello(ws, me, message) : this.sendTo(ws, { t: 'error', code: 'bad' });
    if (me.name === null || !me.key || !this.data.people[me.key]) return this.sendTo(ws, { t: 'error', code: 'bad' });
    await this.apply(ws, me.key, message);
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code === 1005 ? 1000 : code);
    } catch {
      // Already closed.
    }
    if (wasGhost(ws)) return;
    await this.left(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    if (wasGhost(ws)) return;
    await this.left(ws);
  }

  /** Moves the game on when its clock says so (from the alarm, or a message that found it overdue). */
  private async advance(now: number): Promise<boolean> {
    const d = this.data;
    if (d.endsAt === null || now < d.endsAt) return false;
    const engine = this.engine;
    if (d.table.phase === 'showdown') engine.nextHand();
    else if (engine.isBetting()) engine.timeout();
    await this.changed();
    return true;
  }

  override async alarm(): Promise<void> {
    const now = Date.now();
    await this.polls.sweepDue(now);
    // GHOST: sockets silent past `GHOST_MS` died without a close frame; they leave like a real close.
    for (const ws of closeGhosts(this.sockets(), Date.now(), GHOST_MS, this.heard)) await this.left(ws);
    const d = this.data;
    await this.advance(now);
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
    delete d.people[key];
    d.people[key] = person;
    this.trimPeople();
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

  /** Keeps `people` small: past `MAX_PEOPLE`, the longest-unseen people who hold no seat and are not connected go
   * (every new browser id used to add one for good; security review 2, L6). `hello` re-inserts a person last. */
  private trimPeople(): void {
    const d = this.data;
    const keys = Object.keys(d.people);
    let extra = keys.length - MAX_PEOPLE;
    for (const k of keys) {
      if (extra <= 0) break;
      if (d.table.seats.some((s) => s.key === k) || this.online(k)) continue;
      delete d.people[k];
      extra--;
    }
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
      case 'lab': {
        // Test Lab (GP4): the game ends now and the sender is the last heart (local lab server only, `lab.ts`).
        this.lab ||= await labRemembered(this.ctx.storage, this.env);
        if (!this.lab) return this.sendTo(ws, { t: 'error', code: 'lab_off' });
        if (t.phase === 'lobby' || t.phase === 'over') return;
        for (const seat of t.seats) seat.life = seat.key === key ? Math.max(1, seat.life) : 0;
        engine.startHand();
        await this.changed();
        return;
      }
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
        if (this.hostKey() !== key) return this.sendTo(ws, { t: 'error', code: 'not_host' });
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
    if (t.phase === 'showdown') {
      // Nothing to read (no hands shown) or the game is decided: move on quickly.
      const quick = !t.result || Object.keys(t.result.shown).length === 0 || t.seats.filter((s) => s.life > 0).length <= 1;
      return Date.now() + (quick ? POKER_QUICK_MS : POKER_SHOWDOWN_MS);
    }
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
    // BH8: HTTP fallback sessions that stop polling are closed in the alarm.
    const due = this.polls.nextDue();
    if (due !== null) times.push(due);
    const ghost = nextGhostCheck(this.sockets(), this.heard);
    if (ghost !== null) times.push(ghost);
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
    return [...this.ctx.getWebSockets(), ...this.polls.sockets()].filter((ws) => ws !== except && ws.readyState === WebSocket.OPEN && !wasGhost(ws));
  }

  private sendTo(ws: WebSocket, message: PokerServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Closed.
    }
  }
}

/**
 * Security R4-7: the deck is shuffled with the platform's secure random numbers, not `Math.random` (whose sequence can
 * be guessed from enough outputs). A float in [0, 1) from 32 random bits, the shape `shuffle` expects.
 */
function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]! / 0x1_0000_0000;
}
