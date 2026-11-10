import { hubOptions } from './fallback-gate.ts';
import { meterObject } from './meter.ts';
import { DurableObject } from 'cloudflare:workers';
import { PollHub } from './fallback.ts';
import { labOnRequest, labRemembered } from './lab.ts';
import { RateLimiter } from './rate-limit.ts';
import type { Avatar } from '@swm/shared/protocol';
import {
  DUEL_PROTOCOL_VERSION,
  boardDone,
  boardSolved,
  duelGuess,
  duelOutcome,
  parseDuelMessage,
  practiceWord,
  type DuelClientMessage,
  type DuelPhase,
  type DuelPlayer,
  type DuelServerMessage,
} from '@swm/shared/games/duel';
import { answerFor, dayNumber, decodeWords, score, type Lang } from '@swm/shared/games/five-frames';
import * as EN from '@swm/shared/games/words/en';
import * as TR from '@swm/shared/games/words/tr';
import { GHOST_MS, closeAsGone, closeGhosts, nextGhostCheck, touch, wasGhost } from './ghost.ts';
import { FLOOD_CODE, floodGuard } from './limits.ts';
import { answerKeepalive, heardAt, startKeepalive } from './keepalive.ts';

const EMPTY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_SOCKETS = 40;
const MAX_PEOPLE = 60;

/** The word lists, unpacked once per isolate when a duel first needs them. */
const lists = new Map<Lang, { allowed: Set<string>; answers: string[] }>();
function wordList(lang: Lang): { allowed: Set<string>; answers: string[] } {
  let list = lists.get(lang);
  if (!list) {
    const mod = lang === 'tr' ? TR : EN;
    list = decodeWords(mod.WORDS, mod.ANSWERS);
    lists.set(lang, list);
  }
  return list;
}

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
  ready: boolean;
  wins: number;
  guesses: string[];
}

interface Saved {
  seats: (Seat | null)[];
  phase: DuelPhase;
  lang: Lang;
  /** The word of this game (never sent before the game is over). */
  answer: string;
  /** The day of the day's word, or null for a practice word. */
  daily: number | null;
  /** The table already played the day's word (every next game is practice). */
  dailyDone: boolean;
  winner: number | null;
  draw: boolean;
  round: number;
  people: Record<string, Person>;
  emptySince: number | null;
}

const fresh = (): Saved => ({
  seats: [null, null], phase: 'wait', lang: 'en', answer: '', daily: null, dailyDone: false, winner: null, draw: false, round: 0, people: {}, emptySince: null,
});

/** The platform's secure random numbers for practice words (never `Math.random`, review 4 R4-7). */
function secureRandom(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]! / 0x1_0000_0000;
}

/**
 * ⚔️ Five Frames Duel: one table = one object (its id comes from the room). Two seats race on the same word; everyone
 * else watches. The answer and every guess live only here: each connection gets its own view (`view`), with its own
 * words and, for the other board, the marks only; the answer and all words once the game is over.
 */
export class Duel extends DurableObject<Env> {
  private data: Saved = fresh();
  private readonly limit = new RateLimiter(20, 8);
  /** A local lab server (`lab.ts`): only then does a `lab` message do anything. */
  private lab = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    meterObject(this, ctx, env, 'duel');
    startKeepalive(ctx);
    void ctx.blockConcurrencyWhile(async () => {
      const saved = await ctx.storage.get<Saved>('duel');
      if (saved?.seats) this.data = { ...fresh(), ...saved };
    });
  }

  private readonly polls = new PollHub({
    admit: (socket) => this.admit(socket),
    message: (socket, raw) => this.webSocketMessage(socket, raw),
    closed: (socket, code) => this.webSocketClose(socket, code),
    schedule: () => this.scheduleAlarm(),
  }, hubOptions(this.env));

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
    const message = typeof raw === 'string' ? parseDuelMessage(raw) : null;
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

  private async hello(ws: WebSocket, me: Attachment, message: Extract<DuelClientMessage, { t: 'hello' }>): Promise<void> {
    if (message.v !== DUEL_PROTOCOL_VERSION) {
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
    // The first two people sit; a reload keeps the seat and the board (tied to the browser id).
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

  private newSeat(key: string): Seat {
    return { key, ready: false, wins: 0, guesses: [] };
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

  /** Both seated players are ready: new boards and the word (the table's first game the day's word, then practice). */
  private start(): void {
    const d = this.data;
    const list = wordList(d.lang);
    const day = dayNumber();
    const todays = answerFor(day, list.answers, d.lang);
    if (d.dailyDone) {
      d.answer = practiceWord(list.answers, todays, secureRandom);
      d.daily = null;
    } else {
      d.answer = todays;
      d.daily = day;
      d.dailyDone = true;
    }
    d.phase = 'play';
    d.winner = null;
    d.draw = false;
    d.round++;
    for (const s of d.seats) {
      if (!s) continue;
      s.guesses = [];
      s.ready = false;
    }
  }

  private async apply(ws: WebSocket, key: string, message: DuelClientMessage): Promise<void> {
    const d = this.data;
    const seat = this.seatOf(key);
    switch (message.t) {
      case 'lang': {
        if (seat < 0) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        if (d.phase === 'play') return this.sendTo(ws, { t: 'error', code: 'in_progress' });
        if (d.lang === message.lang) return;
        d.lang = message.lang;
        // A new language: both say ready again.
        for (const s of d.seats) if (s) s.ready = false;
        break;
      }
      case 'ready': {
        if (seat < 0) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        if (d.phase === 'play') return;
        d.seats[seat]!.ready = message.on;
        if (d.seats.every((s) => s?.ready)) this.start();
        break;
      }
      case 'rematch': {
        // "Play again" = ready for the next game (a practice word).
        if (seat < 0) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        if (d.phase !== 'over') return;
        d.seats[seat]!.ready = true;
        if (d.seats.every((s) => s?.ready)) this.start();
        break;
      }
      case 'guess': {
        if (seat < 0) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        // A guess that arrives after the other one won (or a draw) doesn't count: the server decides who was first.
        if (d.phase !== 'play') return this.sendTo(ws, { t: 'error', code: 'over' });
        const board = d.seats[seat]!;
        const error = duelGuess(board, message.word, d.answer, d.lang, (w) => wordList(d.lang).allowed.has(w));
        if (error) return this.sendTo(ws, { t: 'error', code: error });
        const outcome = duelOutcome(d.seats.map((s) => ({ guesses: s?.guesses ?? [] })), d.answer, seat);
        if (outcome !== null) {
          d.phase = 'over';
          if (outcome === 'draw') d.draw = true;
          else {
            d.winner = outcome;
            d.seats[outcome]!.wins++;
          }
        }
        break;
      }
      case 'sit': {
        if (seat >= 0) return;
        // Only between games: a free seat, or the seat of someone who left (a new board, no wins).
        if (d.phase === 'play') return this.sendTo(ws, { t: 'error', code: 'in_progress' });
        const free = d.seats.findIndex((s) => s === null || !this.online(s.key));
        if (free < 0) return this.sendTo(ws, { t: 'error', code: 'full' });
        d.seats[free] = this.newSeat(key);
        for (const s of d.seats) if (s) s.ready = false;
        break;
      }
      case 'lab': {
        this.lab ||= await labRemembered(this.ctx.storage, this.env);
        if (!this.lab) return this.sendTo(ws, { t: 'error', code: 'lab_off' });
        if (seat < 0) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        if (d.phase !== 'play') return this.sendTo(ws, { t: 'error', code: 'not_playing' });
        return this.sendTo(ws, { t: 'reveal', answer: d.answer });
      }
      default:
        return;
    }
    await this.save();
    this.broadcast();
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
    return this.sockets(except).some((ws) => (ws.deserializeAttachment() as Attachment | null)?.key === key);
  }

  /** What one connection may see: its own words, the other board's marks; the answer and every word once it is over. */
  private view(key: string | undefined, except?: WebSocket): DuelServerMessage {
    const d = this.data;
    const mine = key ? this.seatOf(key) : -1;
    const over = d.phase === 'over';
    const players: (DuelPlayer | null)[] = d.seats.map((s, i) => {
      if (!s) return null;
      const person = d.people[s.key];
      const board = { guesses: s.guesses };
      return {
        id: person?.pid ?? `gone-${i}`,
        name: person?.name ?? '?',
        ...(person?.avatar ? { avatar: person.avatar } : {}),
        online: this.online(s.key, except),
        ready: s.ready,
        wins: s.wins,
        // Marks only while the game goes on (no letters); an empty board between games.
        marks: d.answer ? s.guesses.map((w) => score(w, d.answer)) : [],
        ...(i === mine || over ? { words: [...s.guesses] } : {}),
        solved: !!d.answer && boardSolved(board, d.answer),
        out: !!d.answer && boardDone(board, d.answer) && !boardSolved(board, d.answer),
      };
    });
    const seated = new Set(d.seats.map((s) => s?.key));
    const watchers = Object.entries(d.people)
      .filter(([k]) => !seated.has(k) && this.online(k, except))
      .map(([, p]) => ({ id: p.pid, name: p.name, ...(p.avatar ? { avatar: p.avatar } : {}) }));
    return {
      t: 'state',
      phase: d.phase,
      lang: d.lang,
      daily: d.daily,
      players,
      seat: mine,
      winner: d.winner,
      draw: d.draw,
      ...(over ? { answer: d.answer } : {}),
      round: d.round,
      watchers,
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
    await this.ctx.storage.put('duel', this.data);
  }

  private sockets(except?: WebSocket): WebSocket[] {
    return [...this.ctx.getWebSockets(), ...this.polls.sockets()].filter((ws) => ws !== except && ws.readyState === WebSocket.OPEN && !wasGhost(ws));
  }

  private sendTo(ws: WebSocket, message: DuelServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Closed.
    }
  }
}
