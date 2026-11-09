import { meterObject } from './meter.ts';
import { DurableObject } from 'cloudflare:workers';
import { PollHub } from './fallback.ts';
import { labOnRequest, labRemembered } from './lab.ts';
import { RateLimiter } from './rate-limit.ts';
import type { Avatar } from '@swm/shared/protocol';
import {
  SEA_BOT_DELAY_MS,
  SEA_PROTOCOL_VERSION,
  SEA_RULES,
  botShot,
  checkFleet,
  fleetSunk,
  parseSeaMessage,
  randomFleet,
  shotResult,
  sunkShips,
  type SeaBotLevel,
  type SeaClientMessage,
  type SeaPhase,
  type SeaPlayer,
  type SeaServerMessage,
  type SeaSideView,
  type ShipPlace,
  type ShotResult,
} from '@swm/shared/games/sea';
import { GHOST_MS, closeAsGone, closeGhosts, nextGhostCheck, touch, wasGhost } from './ghost.ts';
import { FLOOD_CODE, floodGuard } from './limits.ts';
import { answerKeepalive, heardAt, startKeepalive } from './keepalive.ts';

const EMPTY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_SOCKETS = 40;
const MAX_PEOPLE = 60;
const BOT_KEY = 'bot:glowbeam';

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

interface Seat {
  key: string;
  bot?: SeaBotLevel;
  places: ShipPlace[];
  ready: boolean;
  wins: number;
}

interface Saved {
  seats: (Seat | null)[];
  phase: SeaPhase;
  /** Shots fired at seat i's sea. */
  shots: number[][];
  turn: number;
  /** Who shoots first in the next game (swaps on every rematch). */
  first: number;
  winner: number | null;
  last?: { by: number; cell: number; result: ShotResult };
  people: Record<string, Person>;
  emptySince: number | null;
}

const fresh = (): Saved => ({ seats: [null, null], phase: 'place', shots: [[], []], turn: 0, first: 0, winner: null, people: {}, emptySince: null });

/** The platform's secure random numbers for fleets and the bot (never `Math.random`, review 4 R4-7). */
function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]! / 0x1_0000_0000;
}

/**
 * 🚢 Sea Battle: one table = one object (its id comes from the room). Two seats; everyone else watches. Both fleets live
 * only here: each connection gets its own view (`view`), with the ships of its own seat and, for the other sea, only
 * the shots and the sunk ships. Glowbeam can take the second seat.
 */
export class Sea extends DurableObject<Env> {
  private data: Saved = fresh();
  private readonly limit = new RateLimiter(20, 8);
  /** A local lab server (`lab.ts`): only then does a `lab` message do anything. */
  private lab = false;
  private botTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    meterObject(this, ctx, env, 'sea');
    startKeepalive(ctx);
    void ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<Saved>('sea');
      if (saved?.seats) this.data = { ...fresh(), ...saved };
    });
  }

  private readonly polls = new PollHub({
    admit: (socket) => this.admit(socket),
    message: (socket, raw) => this.webSocketMessage(socket, raw),
    closed: (socket, code) => this.webSocketClose(socket, code),
    schedule: () => this.scheduleAlarm(),
  });

  override async fetch(request: Request): Promise<Response> {
    this.lab = await labOnRequest(this.ctx.storage, this.env, request, this.lab);
    const polled = await this.polls.handle(request);
    if (polled) return polled;
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Expected WebSocket', { status: 426 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    await this.admit(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  private async admit(server: WebSocket): Promise<void> {
    if (this.sockets().length > MAX_SOCKETS) {
      this.sendTo(server, { t: 'error', code: 'full' });
      server.close(4001, 'full');
      return;
    }
    server.serializeAttachment({ id: crypto.randomUUID().slice(0, 8), name: null, seen: Date.now() } satisfies Attachment);
    if (this.data.emptySince !== null) {
      this.data.emptySince = null;
      await this.save();
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
    const message = typeof raw === 'string' ? parseSeaMessage(raw) : null;
    if (!message) return this.sendTo(ws, { t: 'error', code: 'bad' });
    if (message.t === 'ping') return this.sendTo(ws, { t: 'pong', now: Date.now() });
    if (!this.limit.allow(me.id)) return this.sendTo(ws, { t: 'error', code: 'rate' });
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

  override async alarm(): Promise<void> {
    const now = Date.now();
    await this.polls.sweepDue(now);
    // GHOST: sockets silent past `GHOST_MS` died without a close frame; they leave like a real close.
    for (const ws of closeGhosts(this.sockets(), Date.now(), GHOST_MS, this.heard)) await this.left(ws);
    if (this.sockets().length === 0 && this.data.emptySince !== null && now - this.data.emptySince >= EMPTY_TTL_MS) {
      await this.ctx.storage.deleteAll();
      this.data = fresh();
      return;
    }
    await this.scheduleAlarm();
  }

  private async hello(ws: WebSocket, me: Attachment, message: Extract<SeaClientMessage, { t: 'hello' }>): Promise<void> {
    if (message.v !== SEA_PROTOCOL_VERSION) {
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
    // The first two people sit; a reload keeps the seat (tied to the browser id).
    if (!d.seats.some((s) => s?.key === key)) {
      const free = d.seats.findIndex((s) => s === null);
      if (free >= 0) d.seats[free] = this.newSeat(key);
    }
    me.name = message.name;
    me.key = key;
    ws.serializeAttachment(me);
    await this.save();
    this.sendTo(ws, { t: 'welcome', you: person.pid, now: Date.now() });
    this.broadcast();
    await this.scheduleAlarm();
  }

  private newSeat(key: string, bot?: SeaBotLevel): Seat {
    return { key, places: randomFleet(SEA_RULES, secureRandom), ready: !!bot, wins: 0, ...(bot ? { bot } : {}) };
  }

  private trimPeople(): void {
    const d = this.data;
    const keys = Object.keys(d.people);
    let extra = keys.length - MAX_PEOPLE;
    for (const k of keys) {
      if (extra <= 0) break;
      if (d.seats.some((s) => s?.key === k) || this.online(k)) continue;
      delete d.people[k];
      extra--;
    }
  }

  private seatOf(key: string): number {
    return this.data.seats.findIndex((s) => s?.key === key);
  }

  private ships(seat: number): number[][] {
    const s = this.data.seats[seat];
    return (s && checkFleet(SEA_RULES, s.places)) ?? [];
  }

  /** A fresh game on the same seats: new fleets for Glowbeam, nobody ready, the other player shoots first. */
  private newGame(swap: boolean): void {
    const d = this.data;
    if (swap) d.first = 1 - d.first;
    d.phase = 'place';
    d.shots = [[], []];
    d.winner = null;
    delete d.last;
    d.turn = d.first;
    for (const s of d.seats) {
      if (!s) continue;
      s.places = randomFleet(SEA_RULES, secureRandom);
      s.ready = !!s.bot;
    }
  }

  private async apply(ws: WebSocket, key: string, message: SeaClientMessage): Promise<void> {
    const d = this.data;
    const seat = this.seatOf(key);
    switch (message.t) {
      case 'place': {
        if (seat < 0) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        if (d.phase !== 'place' || d.seats[seat]!.ready) return this.sendTo(ws, { t: 'error', code: 'in_progress' });
        if (!checkFleet(SEA_RULES, message.ships)) return this.sendTo(ws, { t: 'error', code: 'bad_fleet' });
        d.seats[seat]!.places = message.ships;
        break;
      }
      case 'shuffle': {
        if (seat < 0) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        if (d.phase !== 'place' || d.seats[seat]!.ready) return this.sendTo(ws, { t: 'error', code: 'in_progress' });
        d.seats[seat]!.places = randomFleet(SEA_RULES, secureRandom);
        break;
      }
      case 'ready': {
        if (seat < 0) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        if (d.phase !== 'place') return;
        d.seats[seat]!.ready = message.on;
        if (d.seats.every((s) => s?.ready)) {
          d.phase = 'play';
          d.turn = d.first;
        }
        break;
      }
      case 'shot': {
        if (seat < 0) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        if (d.phase !== 'play' || d.turn !== seat) return this.sendTo(ws, { t: 'error', code: 'not_your_turn' });
        if (!this.fire(seat, message.cell)) return this.sendTo(ws, { t: 'error', code: 'shot_twice' });
        break;
      }
      case 'bot': {
        // Glowbeam takes (or leaves) the other seat; only a seated player asks, and never over a person who is here.
        if (seat < 0) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        const other = 1 - seat;
        const there = d.seats[other];
        if (message.level === 0) {
          if (!there?.bot) return;
          d.seats[other] = null;
          this.newGame(false);
          break;
        }
        if (there && !there.bot && this.online(there.key)) return this.sendTo(ws, { t: 'error', code: 'seat_taken' });
        if (there?.bot) there.bot = message.level;
        else {
          d.seats[other] = this.newSeat(BOT_KEY, message.level);
          this.newGame(false);
        }
        break;
      }
      case 'sit': {
        if (seat >= 0) return;
        // A free seat, or the seat of someone who left (their fleet stays with the seat).
        // Glowbeam's seat too: a person takes it and a new game starts.
        let free = d.seats.findIndex((s) => s === null || (!s.bot && !this.online(s.key)));
        if (free < 0) free = d.seats.findIndex((s) => s?.bot);
        if (free < 0) return this.sendTo(ws, { t: 'error', code: 'full' });
        const old = d.seats[free];
        if (old && !old.bot) d.seats[free] = { ...old, key };
        else {
          d.seats[free] = this.newSeat(key);
          if (old?.bot) this.newGame(false);
        }
        break;
      }
      case 'rematch': {
        if (seat < 0) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        if (d.phase !== 'over') return;
        this.newGame(true);
        break;
      }
      case 'lab': {
        this.lab ||= await labRemembered(this.ctx.storage, this.env);
        if (!this.lab) return this.sendTo(ws, { t: 'error', code: 'lab_off' });
        if (seat < 0) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        if (message.op === 'reveal') return this.sendTo(ws, { t: 'reveal', seat: 1 - seat, ships: this.ships(1 - seat) });
        // One ship left on each side: everything else already sunk.
        if (!d.seats.every((s) => s)) return this.sendTo(ws, { t: 'error', code: 'too_few' });
        for (const s of d.seats) s!.ready = true;
        d.phase = 'play';
        d.winner = null;
        delete d.last;
        d.turn = seat;
        d.shots = [0, 1].map((i) => this.ships(i).slice(0, -1).flat());
        break;
      }
      default:
        return;
    }
    await this.changed();
  }

  /** One shot by `seat`; false if that cell was shot before. */
  private fire(seat: number, cell: number): boolean {
    const d = this.data;
    const target = 1 - seat;
    const shots = d.shots[target]!;
    if (shots.includes(cell)) return false;
    const ships = this.ships(target);
    const result = shotResult(ships, shots, cell);
    shots.push(cell);
    d.last = { by: seat, cell, result };
    if (fleetSunk(ships, shots)) {
      d.phase = 'over';
      d.winner = seat;
      d.seats[seat]!.wins++;
    } else if (result === 'miss' || !SEA_RULES.again) d.turn = target;
    return true;
  }

  private async changed(): Promise<void> {
    await this.save();
    this.broadcast();
    this.botTurn();
  }

  private botTurn(): void {
    const d = this.data;
    const seat = d.seats.findIndex((s) => s?.bot);
    if (seat < 0 || d.phase !== 'play' || d.turn !== seat || this.botTimer) return;
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      void this.botPlays(seat);
    }, SEA_BOT_DELAY_MS);
  }

  private async botPlays(seat: number): Promise<void> {
    const d = this.data;
    const bot = d.seats[seat];
    if (!bot?.bot || d.phase !== 'play' || d.turn !== seat) return;
    const target = 1 - seat;
    const ships = this.ships(target);
    const shots = d.shots[target]!;
    const view = { shots: shots.map((c) => [c, ships.some((s) => s.includes(c)) ? 1 : 0] as const), sunk: sunkShips(ships, shots).map((i) => ships[i]!) };
    this.fire(seat, botShot(SEA_RULES, view, bot.bot, secureRandom));
    await this.changed();
  }

  private async left(ws: WebSocket): Promise<void> {
    if (this.sockets(ws).length === 0) {
      this.data.emptySince = Date.now();
      await this.save();
      await this.scheduleAlarm();
      return;
    }
    this.broadcast(ws);
  }

  private async scheduleAlarm(): Promise<void> {
    const times: number[] = [];
    if (this.data.emptySince !== null) times.push(this.data.emptySince + EMPTY_TTL_MS);
    const due = this.polls.nextDue();
    if (due !== null) times.push(due);
    const ghost = nextGhostCheck(this.sockets(), this.heard);
    if (ghost !== null) times.push(ghost);
    if (times.length) await this.ctx.storage.setAlarm(Math.min(...times));
    else await this.ctx.storage.deleteAlarm();
  }

  private online(key: string, except?: WebSocket): boolean {
    if (key === BOT_KEY) return true;
    return this.sockets(except).some((ws) => (ws.deserializeAttachment() as Attachment | null)?.key === key);
  }

  /** What one connection may see: its own ships, the other sea's shots and sunk ships; everything once the game is over. */
  private view(key: string | undefined, except?: WebSocket): SeaServerMessage {
    const d = this.data;
    const mine = key ? this.seatOf(key) : -1;
    const fleets = [0, 1].map((i) => this.ships(i));
    const players: (SeaPlayer | null)[] = d.seats.map((s, i) => {
      if (!s) return null;
      const person = d.people[s.key];
      return {
        id: s.bot ? `bot-${i}` : (person?.pid ?? `gone-${i}`),
        name: s.bot ? 'Glowbeam' : (person?.name ?? '?'),
        ...(person?.avatar && !s.bot ? { avatar: person.avatar } : {}),
        online: this.online(s.key, except),
        ...(s.bot ? { bot: s.bot } : {}),
        ready: s.ready,
        left: fleets[i]!.length - sunkShips(fleets[i]!, d.shots[i]!).length,
        wins: s.wins,
      };
    });
    const seas: SeaSideView[] = [0, 1].map((i) => {
      const ships = fleets[i]!;
      const shots = d.shots[i]!;
      const side: SeaSideView = {
        shots: shots.map((c) => [c, ships.some((s) => s.includes(c)) ? 1 : 0] as const),
        sunk: sunkShips(ships, shots).map((n) => ships[n]!),
      };
      if (i === mine || d.phase === 'over') side.ships = ships;
      return side;
    });
    const seated = new Set(d.seats.map((s) => s?.key));
    const watchers = Object.entries(d.people)
      .filter(([k]) => !seated.has(k) && this.online(k, except))
      .map(([, p]) => ({ id: p.pid, name: p.name, ...(p.avatar ? { avatar: p.avatar } : {}) }));
    return {
      t: 'state',
      phase: d.phase,
      players,
      seas,
      turn: d.turn,
      winner: d.winner,
      seat: mine,
      ...(mine >= 0 && d.phase === 'place' ? { places: d.seats[mine]!.places } : {}),
      watchers,
      ...(d.last ? { last: d.last } : {}),
      rules: { size: SEA_RULES.size, fleet: [...SEA_RULES.fleet], again: SEA_RULES.again, touch: SEA_RULES.touch },
    };
  }

  private broadcast(except?: WebSocket): void {
    for (const ws of this.sockets(except)) {
      const me = ws.deserializeAttachment() as Attachment | null;
      if (!me?.name) continue;
      this.sendTo(ws, this.view(me.key, except));
    }
  }

  private async save(): Promise<void> {
    await this.ctx.storage.put('sea', this.data);
  }

  private sockets(except?: WebSocket): WebSocket[] {
    return [...this.ctx.getWebSockets(), ...this.polls.sockets()].filter((ws) => ws !== except && ws.readyState === WebSocket.OPEN && !wasGhost(ws));
  }

  private sendTo(ws: WebSocket, message: SeaServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Closed.
    }
  }
}
