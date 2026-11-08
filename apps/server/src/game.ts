import { DurableObject } from 'cloudflare:workers';
import { PollHub } from './fallback.ts';
import { labServer } from './lab.ts';
import type { BoardState, Mark } from '@swm/shared/games/board';
import {
  GAME_MAX_PEOPLE,
  GAME_PROTOCOL_VERSION,
  GAME_RULES,
  parseGameMessage,
  type GameClientMessage,
  type GameKind,
  type GamePerson,
  type GameScore,
  type GameServerMessage,
} from '@swm/shared/games/protocol';
import type { Avatar } from '@swm/shared/protocol';
import { RateLimiter } from './rate-limit.ts';
import { botMove } from '@swm/shared/games/bot';
import { LAB_POSITIONS, isLabPosition, labPosition, type LabPositionKind } from '@swm/shared/games/lab-positions';
import type { BotLevel } from '@swm/shared/games/protocol';
import { closeGhosts, nextGhostCheck, touch, wasGhost } from './ghost.ts';

/** Oyun odası boş kaldıktan bu kadar sonra silinir. */
const EMPTY_TTL_MS = 24 * 60 * 60 * 1000;

interface Attachment {
  id: string;
  /** GHOST: when the last message came, and whether the alarm closed it as a dead connection (`ghost.ts`). */
  seen?: number;
  ghost?: boolean;
  /** hello gelene kadar yok. */
  name: string | null;
  avatar?: Avatar;
  /** Kalıcı tarayıcı kimliği (koltuk buna bağlı; sayfa yenilense de oyuncu koltuğunda kalır). İstemcilere gitmez. */
  key?: string;
}

/** Koltuk: kimin (kalıcı anahtar), adı ve avatarı. Sahibi çıkınca koltuk ona ayrılı kalır, izleyiciler oturabilir. */
interface Seat {
  key: string;
  name: string;
  avatar?: Avatar;
  /** Glowbeam the bot sits here (🎲 Classics, owner's pick 6 A). */
  bot?: BotLevel;
}
/** Glowbeam's seat key (never a browser's). */
const BOT_KEY = 'bot:glowbeam';
/** Glowbeam thinks this long before its move (a move at once feels rude). */
const BOT_DELAY_MS = 700;
/** When Glowbeam starts thinking after its turn begins (the rest of `BOT_DELAY_MS` is waited after the think). */
const BOT_THINK_AT_MS = 150;

interface Saved {
  kind: GameKind;
  state: BoardState;
  seats: [Seat | null, Seat | null];
  score: GameScore;
  emptySince: number | null;
  /** A 🎲 Classics table: its board can change from the shelf while no game is in progress. */
  classics?: boolean;
  /** A move was made in this game (it is in progress until it ends). */
  started?: boolean;
  /** Classics (CL2): someone picked a board from the picker (until then the table shows the picker, no board). */
  chosen?: boolean;
}

/** Dice (backgammon) and the bot's coin flips come from the platform's crypto source, never from a client. */
const diceRandom = (): number => crypto.getRandomValues(new Uint32Array(1))[0]! / 2 ** 32;
const fresh = (kind: GameKind = 'xox'): Saved => ({ kind, state: GAME_RULES[kind].newGame(), seats: [null, null], score: { X: 0, O: 0, draw: 0 }, emptySince: null });

const MARKS: readonly [Mark, Mark] = ['X', 'O'];

/**
 * Oda içi XOX / Dört Taş (PlayWithMe): bir oyun = bir nesne (kimliğini izleme odası verir). Türü ilk gelen belirler. İlk iki kişi X ve O koltuklarına oturur, sonra gelenler
 * izler. Hamleleri sunucu doğrular (sıra, boş hücre). Koltuk kalıcı tarayıcı kimliğine bağlı: oyuncu sayfayı yenilerse
 * koltuğunda kalır; çıkıp gittiyse izleyicilerden biri yerine oturabilir. Durum depoya yazılır (nesne uyusa da kalır).
 */
export class Game extends DurableObject<Env> {
  private data: Saved = fresh();
  /** A local lab server (`lab.ts`, Test Lab DL3b): only then does a `lab` message do anything. */
  private lab = false;
  private readonly limit = new RateLimiter(20, 8);
  private readonly reactLimit = new RateLimiter(6, 2);

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      // Eski kayıt (sürüm 1) `xox` alanında tutuyordu.
      const saved = await ctx.storage.get<Saved & { xox?: unknown }>('game');
      const kind = saved?.kind ?? 'xox';
      const state = saved?.state ?? saved?.xox;
      if (saved && GAME_RULES[kind]?.isState(state)) {
        this.data = { kind, state, seats: saved.seats, score: saved.score, emptySince: saved.emptySince, classics: saved.classics === true, started: saved.started === true, chosen: saved.chosen === true };
      }
    });
  }

  /** HTTP fallback connections (`fallback.ts`). */
  private readonly polls = new PollHub({
    admit: (socket) => this.admit(socket),
    message: (socket, raw) => this.webSocketMessage(socket, raw),
    closed: (socket, code) => this.webSocketClose(socket, code),
    schedule: () => this.scheduleAlarm(),
  });

  override async fetch(request: Request): Promise<Response> {
    this.lab ||= labServer(this.env, request);
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
    if (this.sockets().length > GAME_MAX_PEOPLE) {
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

  override async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    touch(ws);
    const me = ws.deserializeAttachment() as Attachment;
    const message = typeof raw === 'string' ? parseGameMessage(raw) : null;
    if (!message) return this.sendTo(ws, { t: 'error', code: 'bad' });
    if (message.t === 'ping') return this.sendTo(ws, { t: 'pong' });
    if (!this.limit.allow(me.id)) return this.sendTo(ws, { t: 'error', code: 'rate' });
    // One hello per connection, as in the room (review 3, R3-8).
    if (message.t === 'hello') return me.name === null ? this.hello(ws, me, message) : this.sendTo(ws, { t: 'error', code: 'bad' });
    if (me.name === null) return this.sendTo(ws, { t: 'error', code: 'bad' });
    await this.apply(ws, me as Attachment & { name: string }, message);
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    try {
      ws.close(code === 1005 ? 1000 : code);
    } catch {
      // Zaten kapanmış.
    }
    if (wasGhost(ws)) return;
    await this.left(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    if (wasGhost(ws)) return;
    await this.left(ws);
  }

  override async alarm(): Promise<void> {
    await this.polls.sweepDue();
    // GHOST: sockets silent past `GHOST_MS` died without a close frame; they leave like a real close.
    for (const ws of closeGhosts(this.sockets())) await this.left(ws);
    if (this.sockets().length === 0 && this.data.emptySince !== null && Date.now() - this.data.emptySince >= EMPTY_TTL_MS) {
      await this.ctx.storage.deleteAll();
      this.data = fresh();
    }
    await this.scheduleAlarm();
  }

  /** The empty game's deletion and (BH8) the HTTP fallback sessions that stop polling. */
  private async scheduleAlarm(): Promise<void> {
    const times: number[] = [];
    // A join clears `emptySince`; past its time while a connection is still here (one that never said hello), look again
    // in a minute instead of firing at once.
    if (this.data.emptySince !== null) times.push(Math.max(this.data.emptySince + EMPTY_TTL_MS, Date.now() + 60_000));
    const due = this.polls.nextDue();
    if (due !== null) times.push(due);
    const ghost = nextGhostCheck(this.sockets());
    if (ghost !== null) times.push(ghost);
    if (times.length) await this.ctx.storage.setAlarm(Math.min(...times));
  }

  private async hello(ws: WebSocket, me: Attachment, message: Extract<GameClientMessage, { t: 'hello' }>): Promise<void> {
    if (message.v !== GAME_PROTOCOL_VERSION) {
      this.sendTo(ws, { t: 'error', code: 'version' });
      ws.close(4000, 'version');
      return;
    }
    // A Classics table: whoever comes plays the board on the table (its shelf changes it); the first one marks it.
    const untouchedTable = this.data.seats.every((seat) => seat === null) && !this.data.started && !this.data.classics;
    if (message.classics && untouchedTable) this.data = { ...fresh(message.game), classics: true, emptySince: null };
    // Tür: hiç oynanmamış odayı ilk gelen belirler; başka türün sürdüğü koda gelen (adresi elle değiştirdiyse) giremez.
    if (message.game !== this.data.kind && !(message.classics && this.data.classics)) {
      const untouched = this.data.seats.every((seat) => seat === null) && this.data.state.board.every((c) => c === null);
      if (!untouched) {
        this.sendTo(ws, { t: 'error', code: 'kind' });
        ws.close(4002, 'kind');
        return;
      }
      this.data = { ...fresh(message.game), emptySince: null };
    }
    me.name = message.name;
    if (message.avatar) me.avatar = message.avatar;
    // Kalıcı kimlik yoksa bağlantıya özel anahtar: yenileyince koltuk ayrılı kalır, başkası oturabilir.
    me.key = message.cid ?? `conn:${me.id}`;
    ws.serializeAttachment(me);
    // Koltuğum varsa adım/avatarım güncellensin; yoksa boş koltuk varsa otur (ilk iki kişi oynar).
    const mine = this.seatOf(me.key);
    if (mine !== -1) {
      this.data.seats[mine] = { key: me.key, name: me.name, ...(me.avatar ? { avatar: me.avatar } : {}) };
    } else {
      const free = this.data.seats.findIndex((seat) => seat === null);
      if (free !== -1) this.data.seats[free] = { key: me.key, name: me.name, ...(me.avatar ? { avatar: me.avatar } : {}) };
    }
    await this.save();
    this.sendTo(ws, { t: 'welcome', you: me.id, game: this.data.kind });
    this.broadcastState();
    this.botTurn();
    // GHOST: the alarm also watches this connection for silence.
    await this.scheduleAlarm();
  }

  private async apply(ws: WebSocket, me: Attachment & { name: string }, message: GameClientMessage): Promise<void> {
    const seat = this.seatOf(me.key);
    switch (message.t) {
      case 'move': {
        if (seat === -1) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        // İki koltuk dolmadan oyun başlamaz (tek başına iki taraf oynanmasın).
        if (this.data.seats.some((s) => s === null)) return this.sendTo(ws, { t: 'error', code: 'not_your_turn' });
        const next = GAME_RULES[this.data.kind].play(this.data.state, MARKS[seat]!, message.cell, diceRandom);
        if (!next) return this.sendTo(ws, { t: 'error', code: 'not_your_turn' });
        this.data.state = next;
        this.data.started = true;
        if (next.winner) this.data.score[next.winner] += 1;
        break;
      }
      case 'rematch':
        if (seat === -1) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        if (this.data.state.winner === null) return;
        this.data.state = GAME_RULES[this.data.kind].rematch(this.data.state);
        this.data.started = false;
        break;
      case 'switch': {
        // Classics: another board from the picker, by a seated player (during a game only with `end`, below).
        if (!this.data.classics || seat === -1) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        // CL2: a running game changes only when the player says to end it (the page asks "End this game?" first).
        const running = !!this.data.started && this.data.state.winner === null;
        if (running && !message.end) return this.sendTo(ws, { t: 'error', code: 'in_progress' });
        if (running && message.game === this.data.kind) {
          // Ending it for the same board: a fresh game on it.
          this.data.state = GAME_RULES[message.game].newGame();
          this.data.started = false;
          this.data.chosen = true;
          break;
        }
        // Picking the board the table already has only marks it as chosen (CL2: the picker closes for everyone).
        if (message.game === this.data.kind) {
          if (this.data.chosen) return;
          this.data.chosen = true;
          break;
        }
        this.data.chosen = true;
        this.data.kind = message.game;
        this.data.state = GAME_RULES[message.game].newGame();
        this.data.score = { X: 0, O: 0, draw: 0 };
        this.data.started = false;
        break;
      }
      case 'bot': {
        // Glowbeam takes the other seat while it is free (or held by someone who left), or leaves it.
        if (seat === -1) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        const other = seat === 0 ? 1 : 0;
        const there = this.data.seats[other];
        if (message.level === 0) {
          if (!there?.bot) return;
          this.data.seats[other] = null;
        } else {
          if (there && !there.bot && this.online(there.key)) return this.sendTo(ws, { t: 'error', code: 'seat_taken' });
          this.data.seats[other] = { key: BOT_KEY, name: 'Glowbeam', bot: message.level };
          // A new opponent: a game half-way starts over.
          if (!there?.bot && this.data.started && this.data.state.winner === null) {
            this.data.state = GAME_RULES[this.data.kind].newGame(this.data.state.starter);
            this.data.started = false;
          }
        }
        break;
      }
      case 'sit': {
        if (seat !== -1) return;
        const current = this.data.seats[message.seat];
        // Dolu koltuğa ancak sahibi bağlı değilse oturulur.
        if (current && this.online(current.key)) return this.sendTo(ws, { t: 'error', code: 'seat_taken' });
        this.data.seats[message.seat] = { key: me.key!, name: me.name, ...(me.avatar ? { avatar: me.avatar } : {}) };
        // Yeni rakip: el yarıda kaldıysa baştan.
        if (current && current.key !== me.key && this.data.state.winner === null && this.data.started) {
          this.data.state = GAME_RULES[this.data.kind].newGame(this.data.state.starter);
          this.data.started = false;
        }
        break;
      }
      case 'lab': {
        // Test Lab (DL3b): a ready-made position, on a local lab server only (`lab.ts`); a player sets it.
        if (!this.lab) return this.sendTo(ws, { t: 'error', code: 'lab_off' });
        if (seat === -1) return this.sendTo(ws, { t: 'error', code: 'not_player' });
        const kind = (Object.keys(LAB_POSITIONS) as LabPositionKind[]).find((k) => isLabPosition(k, message.position));
        if (!kind || (kind !== this.data.kind && !this.data.classics)) return this.sendTo(ws, { t: 'error', code: 'kind' });
        const state = labPosition(kind, message.position);
        if (!state) return this.sendTo(ws, { t: 'error', code: 'bad' });
        this.data.kind = kind;
        this.data.state = state;
        this.data.started = true;
        this.data.chosen = true;
        break;
      }
      case 'stand':
        if (seat === -1) return;
        this.data.seats[seat] = null;
        break;
      case 'react':
        if (!this.reactLimit.allow(me.key ?? me.id)) return;
        this.broadcast({ t: 'react', from: this.person(me), emoji: message.emoji });
        return;
      default:
        return;
    }
    await this.save();
    this.broadcastState();
    this.botTurn();
  }

  private botTimer: ReturnType<typeof setTimeout> | null = null;
  /** Glowbeam is between its think and its answer (no second turn starts meanwhile). */
  private botBusy = false;
  /** When it is Glowbeam's turn, it plays after a short think (its move goes through the same rules). */
  private botTurn(): void {
    const d = this.data;
    const index = d.seats.findIndex((s) => s?.bot);
    if (index === -1 || d.state.winner !== null || d.state.turn !== MARKS[index] || d.seats.some((s) => s === null) || this.botTimer || this.botBusy) return;
    // GP3: Glowbeam thinks first (chess / dama may take up to `BOT_BUDGET_MS`) and answers once `BOT_DELAY_MS` has passed
    // since its turn began, so a deeper think never makes the table wait longer.
    const turnAt = Date.now();
    this.botTimer = setTimeout(() => {
      this.botTimer = null;
      void this.botPlays(index, turnAt);
    }, BOT_THINK_AT_MS);
  }
  private async botPlays(index: number, turnAt: number): Promise<void> {
    const d = this.data;
    const seat = d.seats[index];
    if (!seat?.bot || d.state.winner !== null || d.state.turn !== MARKS[index]) return;
    const before = d.state;
    const move = botMove(d.kind, d.state, seat.bot, diceRandom);
    const wait = turnAt + BOT_DELAY_MS - Date.now();
    if (wait > 0) {
      this.botBusy = true;
      await new Promise((done) => setTimeout(done, wait));
      this.botBusy = false;
    }
    // The table may have moved on meanwhile (a switch, a person taking the seat, the game ended).
    if (this.data.state !== before || !this.data.seats[index]?.bot) return this.botTurn();
    const next = move === null ? null : GAME_RULES[d.kind].play(d.state, MARKS[index]!, move, diceRandom);
    if (!next) return;
    d.state = next;
    d.started = true;
    if (next.winner) d.score[next.winner] += 1;
    await this.save();
    this.broadcastState();
    // A dama capture chain: Glowbeam goes on.
    this.botTurn();
  }

  private async left(ws: WebSocket): Promise<void> {
    this.broadcastState(ws);
    if (this.sockets(ws).length === 0) {
      this.data.emptySince = Date.now();
      await this.save();
      await this.scheduleAlarm();
    }
  }

  private seatOf(key: string | undefined): number {
    if (!key) return -1;
    return this.data.seats.findIndex((seat) => seat?.key === key);
  }

  private online(key: string, except?: WebSocket): boolean {
    return this.sockets(except).some((ws) => (ws.deserializeAttachment() as Attachment | null)?.key === key);
  }

  private person(me: Attachment & { name: string }): GamePerson {
    return { id: me.id, name: me.name, ...(me.avatar ? { avatar: me.avatar } : {}), online: true };
  }

  private broadcastState(except?: WebSocket): void {
    const joined = this.sockets(except)
      .map((ws) => ws.deserializeAttachment() as Attachment | null)
      .filter((a): a is Attachment & { name: string } => !!a?.name);
    const seats = this.data.seats.map((seat, index) => {
      if (!seat) return null;
      const conn = joined.find((a) => a.key === seat.key);
      if (seat.bot) return { id: `bot-${index}`, name: seat.name, online: true, bot: seat.bot };
      return { id: conn?.id ?? `seat-${index}`, name: seat.name, ...(seat.avatar ? { avatar: seat.avatar } : {}), online: !!conn };
    }) as [GamePerson | null, GamePerson | null];
    const seated = new Set(this.data.seats.map((s) => s?.key));
    // Aynı tarayıcının birden çok sekmesi tek izleyici sayılır.
    const watchers: GamePerson[] = [];
    const seen = new Set<string>();
    for (const a of joined) {
      if (seated.has(a.key) || seen.has(a.key!)) continue;
      seen.add(a.key!);
      watchers.push(this.person(a));
    }
    // A game that started on a board means that board was chosen (older clients never sent a pick).
    if (this.data.started) this.data.chosen = true;
    this.broadcast({ t: 'state', kind: this.data.kind, game: this.data.state, seats, watchers, score: this.data.score, ...(this.data.classics ? { classics: true, chosen: !!this.data.chosen } : {}), started: !!this.data.started }, except);
  }

  private async save(): Promise<void> {
    await this.ctx.storage.put('game', this.data);
  }

  private sockets(except?: WebSocket): WebSocket[] {
    return [...this.ctx.getWebSockets(), ...this.polls.sockets()].filter((ws) => ws !== except && ws.readyState === WebSocket.OPEN && !wasGhost(ws));
  }

  private sendTo(ws: WebSocket, message: GameServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Kapanmış.
    }
  }

  private broadcast(message: GameServerMessage, except?: WebSocket): void {
    const text = JSON.stringify(message);
    for (const ws of this.sockets(except)) {
      if (!(ws.deserializeAttachment() as Attachment | null)?.name) continue;
      try {
        ws.send(text);
      } catch {
        // Kapanmış.
      }
    }
  }
}
